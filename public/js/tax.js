/* ============================================
   Tax page: Quarterly VAT calculator
   ============================================ */

(function () {
  const QUARTERS = ['الربع الأول (يناير – مارس)', 'الربع الثاني (أبريل – يونيو)', 'الربع الثالث (يوليو – سبتمبر)', 'الربع الرابع (أكتوبر – ديسمبر)'];

  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;

  const Page = {
    render(container) {
      const settings = Store.getSettings();
      const rate = Number(settings.taxRate) || 0;
      const range = quarterRange(year, quarter);
      const invoices = quarterInvoices(range);
      const expenses = quarterExpenses(range);

      const outVat = invoices.reduce((s, i) => s + Number(i.tax || 0), 0);
      const salesExcl = invoices.reduce((s, i) => s + Number(i.subtotal || 0), 0) - invoices.reduce((s, i) => s + Number(i.discount || 0), 0);
      const inVat = expenses.reduce((s, e) => s + inputVat(e.amount, rate), 0);
      const expensesExcl = expenses.reduce((s, e) => s + (Number(e.amount || 0) - inputVat(e.amount, rate)), 0);
      const net = outVat - inVat;

      const years = availableYears();

      container.innerHTML = `
        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <button class="btn btn-secondary" onclick="Pages.tax.shiftQuarter(-1)"><i class="fas fa-chevron-right"></i></button>
            <select class="select-control" id="taxQuarter" style="min-width:210px">
              ${QUARTERS.map((q, i) => `<option value="${i + 1}" ${quarter === i + 1 ? 'selected' : ''}>${q}</option>`).join('')}
            </select>
            <select class="select-control" id="taxYear">
              ${years.map((y) => `<option value="${y}" ${year === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
            <button class="btn btn-secondary" onclick="Pages.tax.shiftQuarter(1)"><i class="fas fa-chevron-left"></i></button>
          </div>
          <div class="toolbar-left">
            <button class="btn btn-secondary" onclick="Pages.tax.exportCurrent()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header">
            <h3><i class="fas fa-calculator" style="color:var(--primary)"></i> ${QUARTERS[quarter - 1]} ${year}</h3>
            <span class="text-muted" style="font-size:0.85rem">${Utils.formatDate(range.start)} — ${Utils.formatDate(range.end)}</span>
          </div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">ضريبة المبيعات (Output VAT)</div>
                <div class="stat-value" style="font-size:1.25rem">${Utils.formatMoney(outVat)}</div>
                <div class="stat-sub">${invoices.length} فاتورة غير مسودة</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">ضريبة المشتريات (Input VAT)</div>
                <div class="stat-value" style="font-size:1.25rem">${Utils.formatMoney(inVat)}</div>
                <div class="stat-sub">${expenses.length} مصروف</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">صافي الضريبة المستحقة</div>
                <div class="stat-value" style="font-size:1.4rem;color:${net >= 0 ? 'var(--danger)' : 'var(--success)'}">${Utils.formatMoney(net)}</div>
                <div class="stat-sub">${net >= 0 ? 'مستحقة للحكومة' : 'رصيد دائن لك'} (${rate}%)</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">المبيعات الخاضعة (بدون ضريبة)</div>
                <div class="stat-value" style="font-size:1.1rem">${Utils.formatMoney(salesExcl)}</div>
                <div class="stat-sub">المصروفات قبل الضريبة: ${Utils.formatMoney(expensesExcl)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h3><i class="fas fa-file-invoice" style="color:var(--primary)"></i> فواتير الربع (ضريبة محصلة)</h3></div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>بدون الضريبة</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  ${invoices.sort((a, b) => a.date.localeCompare(b.date)).map((inv) => {
                    const c = Store.getClients().find((x) => x.id === inv.clientId);
                    const excl = Number(inv.subtotal || 0) - Number(inv.discount || 0);
                    return `<tr>
                      <td>${Utils.escapeHtml(inv.number)}</td>
                      <td class="text-muted">${Utils.formatDateShort(inv.date)}</td>
                      <td>${Utils.escapeHtml(c ? c.name : '—')}</td>
                      <td class="text-muted">${Utils.formatMoney(excl)}</td>
                      <td><span class="amount">${Utils.formatMoney(inv.tax)}</span></td>
                      <td>${Utils.formatMoney(inv.total)}</td>
                    </tr>`;
                  }).join('')}
                  ${!invoices.length ? '<tr><td colspan="6" class="text-center text-muted" style="padding:18px">لا توجد فواتير في هذا الربع</td></tr>' : ''}
                </tbody>
                ${invoices.length ? `<tfoot><tr><td colspan="4" style="text-align:left">الإجمالي</td><td><span class="amount">${Utils.formatMoney(outVat)}</span></td><td>${Utils.formatMoney(invoices.reduce((s, i) => s + Number(i.total || 0), 0))}</td></tr></tfoot>` : ''}
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3><i class="fas fa-coins" style="color:var(--warning)"></i> مصروفات الربع (ضريبة مدخلات)</h3></div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>البيان</th><th>القسم</th><th>التاريخ</th><th>المبلغ</th><th>ضريبة المدخلات</th></tr></thead>
                <tbody>
                  ${expenses.sort((a, b) => a.date.localeCompare(b.date)).map((e) => `
                    <tr>
                      <td>${Utils.escapeHtml(e.title)}</td>
                      <td class="text-muted">${Utils.escapeHtml(e.category || 'أخرى')}</td>
                      <td class="text-muted">${Utils.formatDateShort(e.date)}</td>
                      <td>${Utils.formatMoney(e.amount)}</td>
                      <td><span class="amount">${Utils.formatMoney(inputVat(e.amount, rate))}</span></td>
                    </tr>`).join('')}
                  ${!expenses.length ? '<tr><td colspan="5" class="text-center text-muted" style="padding:18px">لا توجد مصروفات في هذا الربع</td></tr>' : ''}
                </tbody>
                ${expenses.length ? `<tfoot><tr><td colspan="3" style="text-align:left">الإجمالي</td><td>${Utils.formatMoney(expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}</td><td><span class="amount">${Utils.formatMoney(inVat)}</span></td></tr></tfoot>` : ''}
              </table>
            </div>
          </div>
        </div>

        <div class="card mt-4">
          <div class="card-header"><h3><i class="fas fa-circle-info" style="color:var(--info)"></i> طريقة الحساب</h3></div>
          <div class="card-body" style="font-size:0.88rem;color:var(--text-muted)">
            <p class="mb-2">• ضريبة المبيعات = مجموع الضريبة على كل الفواتير غير المسودة بتاريخ داخل الربع.</p>
            <p class="mb-2">• ضريبة المدخلات = مجموع ${rate}% من كل المصروفات داخل الربع بافتراض أن المبلغ شامل الضريبة (${rate} ÷ ${100 + rate}).</p>
            <p class="mb-2">• صافي الضريبة المستحقة = ضريبة المبيعات − ضريبة المدخلات.</p>
            <p>• يمكنك تغيير الربع والسنة من الأعلى، ومعدل الضريبة من الإعدادات.</p>
          </div>
        </div>
      `;

      const q = document.getElementById('taxQuarter');
      const y = document.getElementById('taxYear');
      if (q) q.addEventListener('change', (e) => { quarter = Number(e.target.value); Page.render(container); });
      if (y) y.addEventListener('change', (e) => { year = Number(e.target.value); Page.render(container); });
    },

    shiftQuarter(dir) {
      let q = quarter + dir;
      let y = year;
      while (q < 1) { q += 4; y -= 1; }
      while (q > 4) { q -= 4; y += 1; }
      quarter = q;
      year = y;
      Page.render(document.getElementById('content'));
    },

    exportCurrent() {
      const settings = Store.getSettings();
      const rate = Number(settings.taxRate) || 0;
      const range = quarterRange(year, quarter);
      const invoices = quarterInvoices(range);
      const expenses = quarterExpenses(range);
      const outVat = invoices.reduce((s, i) => s + Number(i.tax || 0), 0);
      const inVat = expenses.reduce((s, e) => s + inputVat(e.amount, rate), 0);

      const summary = [
        ['فترة الحساب', `${QUARTERS[quarter - 1]} ${year}`],
        ['الفترة من', range.start],
        ['الفترة إلى', range.end],
        ['معدل الضريبة', rate + '%'],
        ['ضريبة المبيعات (Output)', outVat.toFixed(2)],
        ['ضريبة المشتريات (Input)', inVat.toFixed(2)],
        ['صافي الضريبة المستحقة', (outVat - inVat).toFixed(2)],
        [''],
      ];
      const salesRows = invoices.map((inv) => {
        const c = Store.getClients().find((x) => x.id === inv.clientId);
        const excl = Number(inv.subtotal || 0) - Number(inv.discount || 0);
        return [inv.number, c ? c.name : '', inv.date, excl.toFixed(2), Number(inv.tax || 0).toFixed(2), Number(inv.total || 0).toFixed(2)];
      });
      const expenseRows = expenses.map((e) => [e.title, e.category || 'أخرى', e.date, Number(e.amount || 0).toFixed(2), inputVat(e.amount, rate).toFixed(2)]);
      const blank = [''];

      Utils.exportToCSV('tax_quarterly.csv',
        ['البيان', 'القيمة', '', 'رقم الفاتورة / البيان', 'العميل / القسم', 'التاريخ', 'بدون الضريبة', 'الضريبة', 'الإجمالي'],
        [
          ...summary.map((r) => [r[0], r[1], '', '', '', '', '', '', '']),
          ...blank,
          ...salesRows.map((r) => ['', '', '', r[0], r[1], r[2], r[3], r[4], r[5]]),
          ...blank,
          ...expenseRows.map((r) => ['', '', '', r[0], r[1], r[2], r[3], r[4], '']),
        ]);
      App.toast('تم تصدير الحساب الربعي بنجاح', 'success');
    },
  };

  window.Pages.tax = Page;

  /* ============================================ */

  function quarterRange(y, q) {
    const startMonth0 = (q - 1) * 3;
    const endMonth0 = startMonth0 + 2;
    const start = y + '-' + String(startMonth0 + 1).padStart(2, '0') + '-01';
    const lastDay = new Date(y, endMonth0 + 1, 0).getDate();
    const end = y + '-' + String(endMonth0 + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
    return { start, end };
  }

  function quarterInvoices(range) {
    return Store.getInvoices().filter((i) => i.status !== 'draft' && i.date && i.date >= range.start && i.date <= range.end);
  }

  function quarterExpenses(range) {
    return Store.getExpenses().filter((e) => e.date && e.date >= range.start && e.date <= range.end);
  }

  function inputVat(amount, rate) {
    return Number(amount || 0) * rate / (100 + rate);
  }

  function availableYears() {
    const yr = new Set();
    Store.getInvoices().forEach((i) => { if (i.date) yr.add(Number(i.date.slice(0, 4))); });
    Store.getExpenses().forEach((e) => { if (e.date) yr.add(Number(e.date.slice(0, 4))); });
    yr.add(now.getFullYear());
    return [...yr].sort((a, b) => b - a);
  }
})();