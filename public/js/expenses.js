/* ============================================
   Expenses page
   ============================================ */

(function () {
  let searchTerm = '';
  let categoryFilter = '';
  let monthFilter = '';
  const CATEGORIES = ['إيجار', 'رواتب', 'مرافق', 'اتصالات', 'مستلزمات', 'صيانة', 'تسويق', 'أخرى'];

  const Page = {
    render(container) {
      const expenses = Store.getExpenses();
      const categories = [...new Set(expenses.map((e) => e.category).filter(Boolean))];

      let filtered = expenses;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter((e) =>
          (e.title + ' ' + (e.category || '') + ' ' + (e.notes || '')).toLowerCase().includes(q)
        );
      }
      if (categoryFilter) filtered = filtered.filter((e) => e.category === categoryFilter);
      if (monthFilter) filtered = filtered.filter((e) => e.date && e.date.startsWith(monthFilter));

      const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
      const grid = getMonthGrid(expenses);
      const sorted = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      container.innerHTML = `
        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <div class="search-bar">
              <i class="fas fa-search"></i>
              <input type="text" id="expenseSearch" placeholder="بحث في المصروفات..." value="${Utils.escapeHtml(searchTerm)}">
            </div>
            <select class="select-control" id="expenseCat">
              <option value="">كل الأقسام</option>
              ${categories.map((c) => `<option value="${Utils.escapeHtml(c)}" ${categoryFilter === c ? 'selected' : ''}>${Utils.escapeHtml(c)}</option>`).join('')}
            </select>
            <input type="month" class="select-control" id="expenseMonth" value="${monthFilter}">
          </div>
          <div class="toolbar-left">
            <button class="btn btn-primary" onclick="Pages.expenses.addExpense()"><i class="fas fa-plus"></i> مصروف جديد</button>
            <button class="btn btn-secondary" onclick="Pages.expenses.exportCSV()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
          </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px">
          <div class="stat-card"><div class="stat-label">إجمالي المصروفات (${monthFilter ? Utils.monthLabel(+monthFilter.slice(0, 4), +monthFilter.slice(5) - 1) : 'المعروضة'})</div><div class="stat-value" style="font-size:1.15rem">${Utils.formatMoney(total)}</div></div>
          <div class="stat-card"><div class="stat-label">عدد المصروفات</div><div class="stat-value">${filtered.length}</div></div>
          <div class="stat-card"><div class="stat-label">متوسط المصروف</div><div class="stat-value" style="font-size:1.15rem">${Utils.formatMoney(filtered.length ? total / filtered.length : 0)}</div></div>
        </div>

        ${renderMonthChart(grid)}

        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>القسم</th>
                  <th>التاريخ</th>
                  <th>المبلغ</th>
                  <th>ملاحظات</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${sorted.length ? sorted.map(expenseRow).join('') : `
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <i class="fas fa-coins"></i>
                        <h3>لا توجد مصروفات</h3>
                        <p>${Object.keys(expenseStore()).length ? 'لا توجد نتائج مطابقة' : 'سجل مصروفاتك لمعرفة أين تذهب أموالك'}</p>
                        ${!filterApplied() ? '<button class="btn btn-primary" onclick="Pages.expenses.addExpense()"><i class="fas fa-plus"></i> إضافة مصروف</button>' : ''}
                      </div>
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const s = document.getElementById('expenseSearch');
      const cat = document.getElementById('expenseCat');
      const mon = document.getElementById('expenseMonth');
      if (s) s.addEventListener('input', Utils.debounce((e) => { searchTerm = e.target.value; Page.render(container); }, 200));
      if (cat) cat.addEventListener('change', (e) => { categoryFilter = e.target.value; Page.render(container); });
      if (mon) mon.addEventListener('change', (e) => { monthFilter = e.target.value; Page.render(container); });
    },

    addExpense() {
      openExpenseModal();
    },

    editExpense(id) {
      openExpenseModal(id);
    },

    deleteExpense(id) {
      const e = Store.getExpenses().find((x) => x.id === id);
      App.confirmDialog({
        title: 'حذف المصروف',
        message: `سيتم حذف مصروف <b>${Utils.escapeHtml(e ? e.title : '')}</b> بمبلغ ${Utils.formatMoney(e ? e.amount : 0)}. متابعة؟`,
        onConfirm: () => {
          Store.saveExpenses(Store.getExpenses().filter((x) => x.id !== id));
          App.toast('تم حذف المصروف', 'success');
          Page.render(document.getElementById('content'));
        },
      });
    },

    exportCSV() {
      Utils.exportToCSV(
        'expenses.csv',
        ['البيان', 'القسم', 'التاريخ', 'المبلغ', 'ملاحظات'],
        Store.getExpenses().map((e) => [e.title, e.category, e.date, e.amount, e.notes])
      );
      App.toast('تم تصدير المصروفات كـ CSV', 'success');
    },
  };

  window.Pages.expenses = Page;

  function expenseStore() {
    try {
      return Store.getExpenses();
    } catch (e) {
      return [];
    }
  }

  function filterApplied() {
    return searchTerm || categoryFilter || monthFilter;
  }

  function expenseRow(expense) {
    return `
      <tr>
        <td><span class="font-bold">${Utils.escapeHtml(expense.title)}</span></td>
        <td><span class="badge badge-info">${Utils.escapeHtml(expense.category || 'أخرى')}</span></td>
        <td class="text-muted">${Utils.formatDateShort(expense.date)}</td>
        <td><span class="amount text-danger">${Utils.formatMoney(expense.amount)}</span></td>
        <td class="text-muted">${Utils.escapeHtml(expense.notes || '—')}</td>
        <td>
          <div class="td-actions">
            <button class="btn-icon" title="تعديل" onclick="Pages.expenses.editExpense('${expense.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-icon danger" title="حذف" onclick="Pages.expenses.deleteExpense('${expense.id}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function getMonthGrid(expenses) {
    const months = Utils.lastMonths(12);
    return months.map((m) => {
      const total = expenses
        .filter((e) => {
          if (!e.date) return false;
          const d = new Date(e.date + 'T00:00:00');
          return !isNaN(d) && d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return { ...m, total: Math.round(total) };
    });
  }

  function renderMonthChart(grid) {
    const max = Math.max(...grid.map((g) => g.total), 1);
    const now = new Date();
    const currentMonthLabel = Utils.monthLabel(now.getFullYear(), now.getMonth());
    return `
      <div class="card mb-4">
        <div class="card-header">
          <h3><i class="fas fa-chart-bar" style="color:var(--warning)"></i> المصروفات الشهرية (12 شهراً)</h3>
        </div>
        <div class="card-body">
          <div class="chart-bar" style="height:180px">
            ${grid.map((g) => {
              const h = Math.max((g.total / max) * 140, 6);
              return `
                <div class="bar-col">
                  ${g.total ? `<div class="bar-value" style="font-size:0.62rem">${Utils.formatMoney(g.total)}</div>` : ''}
                  <div class="bar" style="height:${h}px;background:linear-gradient(180deg,#f59e0b,#d97706)" title="${g.label}: ${Utils.formatMoney(g.total)}"></div>
                  <div class="bar-label">${g.label === currentMonthLabel ? 'الحالي' : g.label.length > 12 ? g.label : g.label}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }

  function openExpenseModal(id) {
    const expense = id ? Store.getExpenses().find((e) => e.id === id) : null;
    const categories = [...new Set([...CATEGORIES, ...Store.getExpenses().map((e) => e.category).filter(Boolean)])];
    const categoryOptions = categories.map((c) => `<option value="${Utils.escapeHtml(c)}"></option>`).join('');

    App.openModal({
      title: expense ? 'تعديل المصروف' : 'مصروف جديد',
      size: '',
      body: `
        <div class="form-group">
          <label>البيان <span class="text-danger">*</span></label>
          <input type="text" class="form-control" id="eTitle" value="${Utils.escapeHtml(expense ? expense.title : '')}" placeholder="مثال: فاتورة كهرباء">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>القسم</label>
            <input type="text" class="form-control" id="eCat" list="expenseCatSuggestions" placeholder="اكتب القسم..."
              value="${Utils.escapeHtml(expense ? expense.category || '' : '')}" autocomplete="off">
            <datalist id="expenseCatSuggestions">${categoryOptions}</datalist>
          </div>
          <div class="form-group">
            <label>التاريخ</label>
            <input type="date" class="form-control" id="eDate" value="${expense ? expense.date : Utils.todayISO()}">
          </div>
        </div>
        <div class="form-group">
          <label>المبلغ <span class="text-danger">*</span></label>
          <input type="number" class="form-control" id="eAmount" min="0" step="0.01" value="${expense ? expense.amount : ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <textarea class="form-control" id="eNotes" placeholder="ملاحظات إضافية (اختياري)">${Utils.escapeHtml(expense ? expense.notes || '' : '')}</textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnSaveExpense"><i class="fas fa-save"></i> ${expense ? 'حفظ التعديلات' : 'إضافة المصروف'}</button>
      `,
    });

    document.getElementById('btnSaveExpense').addEventListener('click', () => {
      const title = document.getElementById('eTitle').value.trim();
      const amount = Number(document.getElementById('eAmount').value);
      if (!title) {
        App.toast('يرجى إدخال بيان المصروف', 'warning');
        return;
      }
      if (!amount || amount <= 0) {
        App.toast('يرجى إدخال مبلغ صحيح', 'warning');
        return;
      }
      const data = {
        id: expense ? expense.id : Utils.uid('e'),
        title,
        amount,
        date: document.getElementById('eDate').value || Utils.todayISO(),
        category: document.getElementById('eCat').value || 'أخرى',
        notes: document.getElementById('eNotes').value.trim(),
      };

      const expenses = Store.getExpenses();
      if (expense) {
        const idx = expenses.findIndex((e) => e.id === id);
        expenses[idx] = data;
      } else {
        expenses.push(data);
      }
      Store.saveExpenses(expenses);
      App.closeModal();
      App.toast(expense ? 'تم تحديث المصروف' : 'تمت إضافة المصروف', 'success');
      Page.render(document.getElementById('content'));
    });
  }
})();