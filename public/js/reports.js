/* ============================================
   Reports page: Sales, Receivables, Expenses, Statement
   ============================================ */

(function () {
  let tab = 'sales';
  let rangeDays = 30;

  const Page = {
    render(container) {
      container.innerHTML = `
        <div class="tabs">
          <button class="tab ${tab === 'sales' ? 'active' : ''}" data-tab="sales"><i class="fas fa-chart-line"></i> المبيعات</button>
          <button class="tab ${tab === 'receivables' ? 'active' : ''}" data-tab="receivables"><i class="fas fa-hand-holding-dollar"></i> المستحقات</button>
          <button class="tab ${tab === 'expenses' ? 'active' : ''}" data-tab="expenses"><i class="fas fa-coins"></i> المصروفات</button>
          <button class="tab ${tab === 'profit' ? 'active' : ''}" data-tab="profit"><i class="fas fa-scale-balanced"></i> الأرباح والخسائر</button>
        </div>

        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <label class="text-muted" style="font-size:0.9rem">الفترة:</label>
            <select class="select-control" id="rangeSelect">
              <option value="7" ${rangeDays === 7 ? 'selected' : ''}>آخر 7 أيام</option>
              <option value="30" ${rangeDays === 30 ? 'selected' : ''}>آخر 30 يوم</option>
              <option value="90" ${rangeDays === 90 ? 'selected' : ''}>آخر 90 يوم</option>
              <option value="365" ${rangeDays === 365 ? 'selected' : ''}>آخر 12 شهر</option>
            </select>
          </div>
          <div class="toolbar-left">
            <button class="btn btn-secondary" onclick="Pages.reports.exportCurrent()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
          </div>
        </div>

        <div id="reportBody">${renderReport(tab)}</div>
      `;

      container.querySelectorAll('.tab').forEach((t) => {
        t.addEventListener('click', () => {
          tab = t.dataset.tab;
          Page.render(container);
        });
      });
      const rs = document.getElementById('rangeSelect');
      if (rs) rs.addEventListener('change', (e) => { rangeDays = Number(e.target.value); Page.render(container); });
    },

    exportCurrent() {
      exportReport(tab);
    },
  };

  window.Pages.reports = Page;

  /* ============================================ */

  function filteredInvoices() {
    const from = new Date();
    from.setDate(from.getDate() - rangeDays);
    const fromISO = from.toISOString().split('T')[0];
    return Store.getInvoices()
      .filter((i) => i.date && i.date >= fromISO)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function renderReport(key) {
    switch (key) {
      case 'sales': return salesReport();
      case 'receivables': return receivablesReport();
      case 'expenses': return expensesReport();
      case 'profit': return profitReport();
      default: return '';
    }
  }

  function salesReport() {
    const invoices = filteredInvoices();
    const settings = Store.getSettings();

    const paid = invoices.filter((i) => i.status === 'paid');
    const pending = invoices.filter((i) => i.status !== 'draft' && i.status !== 'paid');
    const paidTotal = paid.reduce((s, i) => s + Number(i.total || 0), 0);
    const pendingTotal = pending.reduce((s, i) => s + (Number(i.total || 0) - Number(i.paidAmount || 0)), 0);
    const taxTotal = invoices.reduce((s, i) => s + Number(i.tax || 0), 0);
    const itemsSold = invoices.reduce((s, i) => s + (i.items ? i.items.reduce((x, it) => x + Number(it.quantity || 0), 0) : 0), 0);

    const months = Utils.lastMonths(6).map((m) => {
      const total = Store.getInvoices()
        .filter((i) => {
          const d = new Date(i.date + 'T00:00:00');
          return !isNaN(d) && d.getMonth() === m.month && d.getFullYear() === m.year && i.status === 'paid';
        })
        .reduce((s, i) => s + Number(i.total || 0), 0);
      return { ...m, total: Math.round(total) };
    });
    const max = Math.max(...months.map((m) => m.total), 1);

    const byClient = {};
    Store.getInvoices().forEach((inv) => {
      if (inv.status === 'draft') return;
      const c = Store.getClients().find((x) => x.id === inv.clientId);
      const key = c ? c.name : 'بدون عميل';
      byClient[key] = byClient[key] || { name: key, total: 0, count: 0 };
      byClient[key].total += Number(inv.total || 0);
      byClient[key].count++;
    });
    const topClients = Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 5);

    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">المبيعات المدفوعة</div><div class="stat-value">${Utils.formatMoney(paidTotal)}</div><div class="stat-sub">${paid.length} فاتورة</div></div>
        <div class="stat-card"><div class="stat-label">المبيعات غير المحصلة</div><div class="stat-value" style="color:var(--warning)">${Utils.formatMoney(pendingTotal)}</div><div class="stat-sub">${pending.length} فاتورة معلقة</div></div>
        <div class="stat-card"><div class="stat-label">إجمالي الضريبة</div><div class="stat-value" style="font-size:1.2rem">${Utils.formatMoney(taxTotal)}</div><div class="stat-sub">${settings.taxRate}%</div></div>
        <div class="stat-card"><div class="stat-label">عدد الأصناف المباعة</div><div class="stat-value">${itemsSold}</div></div>
      </div>

      <div class="card mb-4">
        <div class="card-header"><h3><i class="fas fa-chart-column" style="color:var(--primary)"></i> المبيعات الشهرية</h3></div>
        <div class="card-body">
          <div class="chart-bar">
            ${months.map((m) => `
              <div class="bar-col">
                <div class="bar-value">${m.total ? Utils.formatMoney(m.total) : ''}</div>
                <div class="bar" style="height:${Math.max((m.total / max) * 180, 6)}px" title="${m.label}: ${Utils.formatMoney(m.total)}"></div>
                <div class="bar-label">${m.label.length > 14 ? m.month === new Date().getMonth() && m.year === new Date().getFullYear() ? 'الحالي' : Utils.monthNames[m.month] : m.label}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-trophy" style="color:var(--warning)"></i> أفضل العملاء</h3></div>
          <div class="card-body" style="padding:10px 20px">
            ${topClients.length ? topClients.map((c, i) => `
              <div class="flex items-center justify-between gap-3" style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="flex items-center gap-3">
                  <span style="width:26px;height:26px;border-radius:8px;background:${i === 0 ? 'var(--warning-light)': i === 1 ? 'var(--gray-100)' : 'var(--gray-100)'};color:${i === 0 ? 'var(--warning)' : 'var(--text-muted)'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">${i + 1}</span>
                  <span style="font-weight:600;font-size:0.92rem">${Utils.escapeHtml(c.name)}</span>
                </div>
                <div class="text-left">
                  <div class="amount" style="font-size:0.92rem">${Utils.formatMoney(c.total)}</div>
                  <div class="cell-sub">${c.count} فاتورة</div>
                </div>
              </div>`).join('') : '<p class="text-muted text-center" style="padding:16px">لا توجد بيانات</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i class="fas fa-list" style="color:var(--info)"></i> أحدث الفواتير في الفترة</h3></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>الرقم</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
              <tbody>
                ${[...invoices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((inv) => {
                  const st = Utils.invoiceStatus(inv);
                  return `<tr>
                    <td>${Utils.escapeHtml(inv.number)}</td>
                    <td class="text-muted">${Utils.formatDateShort(inv.date)}</td>
                    <td><span class="amount">${Utils.formatMoney(inv.total)}</span></td>
                    <td><span class="badge ${st.cls}">${st.label}</span></td>
                  </tr>`;
                }).join('')}
                ${!invoices.length ? '<tr><td colspan="4" class="text-center text-muted" style="padding:18px">لا توجد فواتير في هذه الفترة</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function receivablesReport() {
    const clients = Store.getClients();
    const invoices = Store.getInvoices()
      .filter((i) => i.status !== 'draft')
      .sort((a, b) => a.clientId.localeCompare(b.clientId));

    const rows = [];
    clients.forEach((c) => {
      const cinv = invoices.filter((i) => i.clientId === c.id);
      if (!cinv.length) return;
      let total = 0;
      let paid = 0;
      cinv.forEach((inv) => {
        total += Number(inv.total || 0);
        paid += Number(inv.paidAmount || 0);
      });
      rows.push({ client: c, total, paid, outstanding: total - paid, count: cinv.length });
    });
    const totalOut = rows.reduce((s, r) => s + r.outstanding, 0);
    const totalInv = rows.reduce((s, r) => s + r.total, 0);

    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">إجمالي المستحقات</div><div class="stat-value" style="color:var(--warning)">${Utils.formatMoney(totalOut)}</div></div>
        <div class="stat-card"><div class="stat-label">إجمالي فواتير العملاء</div><div class="stat-value" style="font-size:1.2rem">${Utils.formatMoney(totalInv)}</div></div>
        <div class="stat-card"><div class="stat-label">نسبة التحصيل</div><div class="stat-value" style="font-size:1.2rem">${totalInv ? Math.round(((totalInv - totalOut) / totalInv) * 100) : 0}%</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-hand-holding-dollar" style="color:var(--warning)"></i> أرصدة العملاء (دفترة العملاء)</h3></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>العميل</th><th>عدد الفواتير</th><th>إجمالي الفواتير</th><th>المدفوع</th><th>المستحق</th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((r) => `
                <tr>
                  <td><div class="cell-flex">
                    <div class="client-avatar" style="width:34px;height:34px;font-size:0.85rem">${Utils.escapeHtml(Utils.initials(r.client.name))}</div>
                    <span class="font-bold">${Utils.escapeHtml(r.client.name)}</span>
                  </div></td>
                  <td class="text-muted">${r.count}</td>
                  <td><span class="amount">${Utils.formatMoney(r.total)}</span></td>
                  <td class="text-success"><span class="amount">${Utils.formatMoney(r.paid)}</span></td>
                  <td class="${r.outstanding > 0 ? 'text-danger' : 'text-muted'}"><span class="amount">${Utils.formatMoney(r.outstanding)}</span></td>
                </tr>`).join('') : `
                <tr><td colspan="5" class="text-center text-muted" style="padding:22px">لا توجد بيانات</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function expensesReport() {
    const expenses = filteredExpenses();
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byCat = {};
    expenses.forEach((e) => {
      const k = e.category || 'أخرى';
      byCat[k] = byCat[k] || { name: k, total: 0, count: 0 };
      byCat[k].total += Number(e.amount || 0);
      byCat[k].count++;
    });
    const cats = Object.values(byCat).sort((a, b) => b.total - a.total);
    const maxGiven = Math.max(...cats.map((c) => c.total), 1);

    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">إجمالي المصروفات</div><div class="stat-value">${Utils.formatMoney(total)}</div></div>
        <div class="stat-card"><div class="stat-label">عدد المصروفات</div><div class="stat-value">${expenses.length}</div></div>
        <div class="stat-card"><div class="stat-label">أعلى قسم</div><div class="stat-value" style="font-size:1.15rem">${cats.length ? Utils.escapeHtml(cats[0].name) : '—'}</div><div class="stat-sub">${cats.length ? Utils.formatMoney(cats[0].total) : ''}</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-pie" style="color:var(--warning)"></i> توزيع المصروفات حسب القسم</h3></div>
        <div class="card-body">
          ${cats.length ? cats.map((c) => `
            <div class="mb-3">
              <div class="flex justify-between items-center mb-1">
                <span style="font-weight:600;font-size:0.9rem">${Utils.escapeHtml(c.name)}</span>
                <span class="text-muted" style="font-size:0.85rem">${Utils.formatMoney(c.total)} (${c.count} عملية)</span>
              </div>
              <div style="height:10px;background:var(--gray-100);border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${Math.min((c.total / maxGiven) * 100, 100)}%;background:linear-gradient(90deg,#f59e0b,#d97706)"></div>
              </div>
            </div>`).join('') : '<p class="text-muted text-center" style="padding:16px">لا توجد مصروفات في هذه الفترة</p>'}
        </div>
      </div>`;
  }

  function profitReport() {
    const invoices = filteredInvoices();
    const revenue = invoices.filter((i) => i.status !== 'draft').reduce((s, i) => s + Number(i.total || 0), 0);
    const collected = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0);
    const expenses = filteredExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = collected - expenses;

    // COGS estimate using product cost
    let cogs = 0;
    invoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        const p = Store.getProducts().find((x) => x.id === it.id);
        if (p) cogs += Number(p.cost || 0) * Number(it.quantity || 0);
        else cogs += 0;
      });
    });
    const grossProfit = revenue - cogs;

    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">الإيرادات (الفترة)</div><div class="stat-value text-success">${Utils.formatMoney(revenue)}</div></div>
        <div class="stat-card"><div class="stat-label">المحصّل نقداً</div><div class="stat-value" style="font-size:1.2rem">${Utils.formatMoney(collected)}</div></div>
        <div class="stat-card"><div class="stat-label">المصروفات</div><div class="stat-value text-danger">${Utils.formatMoney(expenses)}</div></div>
        <div class="stat-card"><div class="stat-label">صافي الربح = المحصل - مصروفات</div><div class="stat-value" style="color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatMoney(netProfit)}</div><div class="stat-sub">هامش ${collected ? ((netProfit / collected) * 100).toFixed(1) : 0}%</div></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3><i class="fas fa-chart-simple" style="color:var(--primary)"></i> ملخص الأداء</h3></div>
          <div class="card-body">
            <div class="srow" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span class="text-muted">الإجمالي (مع الفواتير المعلقة)</span><span class="amount">${Utils.formatMoney(revenue)}</span></div>
            <div class="srow" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span class="text-muted">إجمالي المصروفات</span><span class="amount text-danger">${Utils.formatMoney(expenses)}</span></div>
            <div class="srow" style="display:flex;justify-content:space-between;padding:10px 0;font-size:1.1rem;font-weight:800"><span>صافي الربح</span><span style="color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatMoney(netProfit)}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3><i class="fas fa-gears" style="color:var(--info)"></i> معلومات (طريقة الحساب)</h3></div>
          <div class="card-body" style="font-size:0.88rem;color:var(--text-muted)">
            <p class="mb-2">• الإيرادات = مجموع الفواتير غير المسودة في الفترة المحددة.</p>
            <p class="mb-2">• المحصل = مجموع الفواتير المدفوعة في الفترة.</p>
            <p class="mb-2">• صافي الربح = المحصل نقداً - إجمالي المصروفات في نفس الفترة.</p>
            <p class="mb-2">• تكلفة المبيعات تُحسب من تكلفة المنتجات المرتبطة (عند توفرها).</p>
            <p>• يمكنك تغيير الفترة من القائمة أعلى الصفحة.</p>
          </div>
        </div>
      </div>`;
  }

  function filteredExpenses() {
    const from = new Date();
    from.setDate(from.getDate() - rangeDays);
    const fromISO = from.toISOString().split('T')[0];
    return Store.getExpenses().filter((e) => e.date && e.date >= fromISO);
  }

  function exportReport(key) {
    const settings = Store.getSettings();
    const from = new Date();
    from.setDate(from.getDate() - rangeDays);
    switch (key) {
      case 'sales': {
        const rows = filteredInvoices().map((inv) => {
          const c = Store.getClients().find((x) => x.id === inv.clientId);
          return [inv.number, c ? c.name : '', inv.date, inv.subtotal, inv.tax, inv.total, Utils.invoiceStatus(inv).label];
        });
        Utils.exportToCSV('sales_report.csv', ['رقم الفاتورة', 'العميل', 'التاريخ', 'المجموع الفرعي', 'الضريبة', 'الإجمالي', 'الحالة'], rows);
        break;
      }
      case 'receivables': {
        const clients = Store.getClients();
        const map = clients.map((c) => {
          const invs = Store.getInvoices().filter((i) => i.clientId === c.id && i.status !== 'draft');
          const t = invs.reduce((s, i) => s + Number(i.total || 0), 0);
          const p = invs.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
          return [c.name, invs.length, t, p, t - p];
        });
        Utils.exportToCSV('receivables_report.csv', ['العميل', 'عدد الفواتير', 'الإجمالي', 'المدفوع', 'المستحق'], map);
        break;
      }
      case 'expenses': {
        Utils.exportToCSV('expenses_report.csv', ['البيان', 'القسم', 'التاريخ', 'المبلغ', 'ملاحظات'],
          filteredExpenses().map((e) => [e.title, e.category, e.date, e.amount, e.notes]));
        break;
      }
      case 'profit': {
        const revenue = filteredInvoices().filter((i) => i.status !== 'draft').reduce((s, i) => s + Number(i.total || 0), 0);
        const expenses = filteredExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);
        Utils.exportToCSV('profit_report.csv', ['البند', 'القيمة'],
          [['الإيرادات', revenue], ['المصروفات', expenses], ['صافي الربح', revenue - expenses]]);
        break;
      }
    }
    App.toast('تم تصدير التقرير بنجاح', 'success');
  }
})();