/* ============================================
   Dashboard page
   ============================================ */

(function () {
  const Page = {
    render(container) {
      const data = computeStats();
      const recent = data.recentInvoices.slice(0, 6);

      container.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-wallet"></i></div>
            <div class="stat-label">إجمالي المبيعات (مدفوعة)</div>
            <div class="stat-value">${Utils.formatMoney(data.paidTotal)}</div>
            <div class="stat-sub"><span class="up"><i class="fas fa-arrow-up"></i></span> آخر 30 يوم</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-file-invoice"></i></div>
            <div class="stat-label">عدد الفواتير</div>
            <div class="stat-value">${data.totalInvoices}</div>
            <div class="stat-sub">${data.paidInvoices} مدفوعة · ${data.pendingInvoices} معلقة · ${data.draftInvoices} مسودة</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon amber"><i class="fas fa-clock"></i></div>
            <div class="stat-label">فواتير مستحقة (معلقة)</div>
            <div class="stat-value">${data.overdueTotal > 0 ? Utils.formatMoney(data.overdueTotal) : '0'}</div>
            <div class="stat-sub ${data.pendingInvoices ? 'text-warning' : ''}">${data.pendingInvoices} فاتورة بانتظار السداد</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon cyan"><i class="fas fa-users"></i></div>
            <div class="stat-label">العملاء</div>
            <div class="stat-value">${data.totalClients}</div>
            <div class="stat-sub">عملاء نشطون</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-box"></i></div>
            <div class="stat-label">المنتجات</div>
            <div class="stat-value">${data.totalProducts}</div>
            <div class="stat-sub">${data.lowStock} منتج منخفض المخزون</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-coins"></i></div>
            <div class="stat-label">المصروفات (هذا الشهر)</div>
            <div class="stat-value">${Utils.formatMoney(data.monthExpenses)}</div>
            <div class="stat-sub">إجمالي المصروفات الشهرية</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-file-invoice" style="color:var(--primary)"></i> أحدث الفواتير</h3>
              <a href="#/invoices" class="btn btn-sm btn-secondary">عرض الكل <i class="fas fa-arrow-left"></i></a>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  ${recent.length ? recent.map((inv) => {
                    const st = Utils.invoiceStatus(inv);
                    const client = Store.getClients().find((c) => c.id === inv.clientId);
                    return `
                      <tr>
                        <td><span class="font-bold">${Utils.escapeHtml(inv.number)}</span></td>
                        <td>${Utils.escapeHtml(client ? client.name : '—')}</td>
                        <td>${Utils.formatDateShort(inv.date)}</td>
                        <td><span class="amount">${Utils.formatMoney(inv.total)}</span></td>
                        <td><span class="badge ${st.cls}">${st.label}</span></td>
                      </tr>`;
                  }).join('') : `
                    <tr><td colspan="5" class="text-center text-muted">لا توجد فواتير بعد</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-dollar-sign" style="color:var(--success)"></i> آخر 6 أشهر</h3>
              <a href="#/reports" class="btn btn-sm btn-secondary">تقرير مفصل <i class="fas fa-arrow-left"></i></a>
            </div>
            <div class="card-body">
              <div class="chart-bar" id="dashChart"></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="card-header">
            <h3><i class="fas fa-bell" style="color:var(--warning)"></i> تنبيهات</h3>
          </div>
          <div class="card-body" style="padding:8px 20px">
            ${renderAlerts(data)}
          </div>
        </div>
      `;

      setTimeout(() => renderBarChart(data.monthly), 30);
    },
  };

  function computeStats() {
    const invoices = Store.getInvoices();
    const clients = Store.getClients();
    const products = Store.getProducts();
    const expenses = Store.getExpenses();

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const paidTotal = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.total || 0), 0);

    const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
    const pendingInvoices = invoices.filter((i) => {
      const st = Utils.invoiceStatus(i);
      return st.key === 'pending' || st.key === 'overdue';
    }).length;
    const draftInvoices = invoices.filter((i) => i.status === 'draft').length;

    const overdueTotal = invoices
      .filter((i) => ['overdue', 'pending'].includes(i.status))
      .reduce((s, i) => s + (Number(i.total || 0) - Number(i.paidAmount || 0)), 0);

    const lowStock = products.filter((p) => Number(p.quantity) < 10).length;

    const monthExpenses = expenses
      .filter((e) => {
        const d = new Date(e.date + 'T00:00:00');
        return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const monthly = Utils.lastMonths(6).map((m) => {
      const total = invoices
        .filter((i) => {
          const d = new Date(i.date + 'T00:00:00');
          return !isNaN(d) && d.getMonth() === m.month && d.getFullYear() === m.year && i.status === 'paid';
        })
        .reduce((s, i) => s + Number(i.total || 0), 0);
      return {
        label: m.month === now.getMonth() && m.year === now.getFullYear() ? 'الشهر الحالي' : m.label,
        total: Math.round(total),
      };
    });

    const recent = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

    return {
      paidTotal, totalInvoices: invoices.length,
      paidInvoices, pendingInvoices, draftInvoices,
      overdueTotal, totalClients: clients.length,
      totalProducts: products.length, lowStock,
      monthExpenses, monthly, recentInvoices: recent,
    };
  }

  function renderBarChart(monthly) {
    const el = document.getElementById('dashChart');
    if (!el) return;
    const max = Math.max(...monthly.map((m) => m.total), 1);
    el.innerHTML = monthly
      .map((m) => {
        const h = Math.max((m.total / max) * 180, 6);
        return `
          <div class="bar-col">
            <div class="bar-value">${Utils.formatMoney(m.total)}</div>
            <div class="bar" style="height:${h}px" title="${m.label}: ${Utils.formatMoney(m.total)}"></div>
            <div class="bar-label">${m.label}</div>
          </div>`;
      })
      .join('');
  }

  function renderAlerts(data) {
    const alerts = [];
    const products = Store.getProducts();
    const lowStock = products.filter((p) => Number(p.quantity) <= 5);
    lowStock.forEach((p) =>
      alerts.push({
        icon: 'fa-box-open', color: 'var(--warning)',
        text: `مخزون ${Utils.escapeHtml(p.name)} منخفض: <b>${p.quantity}</b> وحدة متبقية`,
        href: '#/products',
      })
    );

    const overdue = Store.getInvoices().filter((i) => Utils.invoiceStatus(i).key === 'overdue');
    overdue.forEach((inv) => {
      const client = Store.getClients().find((c) => c.id === inv.clientId);
      alerts.push({
        icon: 'fa-clock', color: 'var(--danger)',
        text: `فاتورة <b>${Utils.escapeHtml(inv.number)}</b> متأخرة عن السداد — <b>${Utils.escapeHtml(client ? client.name : '—')}</b> بمبلغ ${Utils.formatMoney((Number(inv.total)||0) - (Number(inv.paidAmount)||0))}`,
        href: '#/invoices',
      });
    });

    if (!alerts.length) {
      return `<p class="text-center text-muted" style="padding:20px 0"><i class="fas fa-check-circle" style="color:var(--success)"></i> لا توجد تنبيهات، كل شيء على ما يرام</p>`;
    }

    return alerts
      .slice(0, 8)
      .map(
        (a) => `
        <div class="flex items-center justify-between gap-3" style="padding:11px 0;border-bottom:1px solid var(--border)">
          <div class="flex items-center gap-3">
            <i class="fas ${a.icon}" style="color:${a.color};width:20px"></i>
            <span style="font-size:0.92rem">${a.text}</span>
          </div>
          <a href="${a.href}" class="btn-icon"><i class="fas fa-chevron-left"></i></a>
        </div>`
      )
      .join('');
  }

  window.Pages.dashboard = Page;
})();