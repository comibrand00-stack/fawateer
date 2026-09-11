/* ============================================
   Invoices page: list, create, edit, view, print
   ============================================ */

(function () {
  let searchTerm = '';
  let statusFilter = '';
  let sortBy = 'created-desc';

  const Page = {
    render(container) {
      let invoices = Store.getInvoices();
      const clients = Store.getClients();

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        invoices = invoices.filter((inv) => {
          const client = clients.find((c) => c.id === inv.clientId);
          return (
            inv.number.toLowerCase().includes(q) ||
            (client && client.name.toLowerCase().includes(q)) ||
            (client && client.phone.includes(q))
          );
        });
      }
      if (statusFilter) {
        invoices = invoices.filter((inv) => {
          if (statusFilter === 'pending_only') return ['pending', 'overdue'].includes(inv.status);
          return inv.status === statusFilter;
        });
      }
      invoices = sortInvoices(invoices);

      container.innerHTML = `
        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <div class="search-bar">
              <i class="fas fa-search"></i>
              <input type="text" id="invSearch" placeholder="بحث برقم الفاتورة، العميل..." value="${Utils.escapeHtml(searchTerm)}">
            </div>
            <select class="select-control" id="invStatusFilter">
              <option value="">كل الحالات</option>
              <option value="paid" ${statusFilter === 'paid' ? 'selected' : ''}>مدفوعة</option>
              <option value="pending_only" ${statusFilter === 'pending_only' ? 'selected' : ''}>معلقة / متأخرة</option>
              <option value="draft" ${statusFilter === 'draft' ? 'selected' : ''}>مسودة</option>
            </select>
            <select class="select-control" id="invSort">
              <option value="created-desc" ${sortBy === 'created-desc' ? 'selected' : ''}>الأحدث أولاً</option>
              <option value="created-asc" ${sortBy === 'created-asc' ? 'selected' : ''}>الأقدم أولاً</option>
              <option value="total-desc" ${sortBy === 'total-desc' ? 'selected' : ''}>الأعلى مبلغاً</option>
              <option value="total-asc" ${sortBy === 'total-asc' ? 'selected' : ''}>الأقل مبلغاً</option>
            </select>
          </div>
          <div class="toolbar-left">
            <button class="btn btn-primary" onclick="Pages.invoices.newInvoice()"><i class="fas fa-plus"></i> فاتورة جديدة</button>
            <button class="btn btn-secondary" onclick="Pages.invoices.exportCSV()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
          </div>
        </div>

        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>الفاتورة</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${invoices.length ? invoices.map(invoiceRow).join('') : `
                  <tr>
                    <td colspan="7">
                      <div class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <h3>لا توجد فواتير</h3>
                        <p>${searchTerm || statusFilter ? 'لا توجد نتائج مطابقة للبحث' : 'ابدأ بإنشاء فاتورة جديدة الآن'}</p>
                        ${!searchTerm && !statusFilter ? '<button class="btn btn-primary" onclick="Pages.invoices.newInvoice()"><i class="fas fa-plus"></i> إنشاء أول فاتورة</button>' : ''}
                      </div>
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const s = document.getElementById('invSearch');
      const st = document.getElementById('invStatusFilter');
      const so = document.getElementById('invSort');
      if (s) s.addEventListener('input', Utils.debounce((e) => { searchTerm = e.target.value; Page.render(container); }, 200));
      if (st) st.addEventListener('change', (e) => { statusFilter = e.target.value; Page.render(container); });
      if (so) so.addEventListener('change', (e) => { sortBy = e.target.value; Page.render(container); });
    },

    newInvoice() {
      openInvoiceModal(null);
    },

    editInvoice(id) {
      openInvoiceModal(id);
    },

    viewInvoice(id) {
      const inv = Store.getInvoices().find((i) => i.id === id);
      if (inv) openViewModal(inv);
    },

    printInvoice(id) {
      const inv = Store.getInvoices().find((i) => i.id === id);
      if (inv) printInvoiceDoc(inv);
    },

    exportPDF(id) {
      PDFExport.generatePDF(id);
    },

    deleteInvoice(id) {
      const inv = Store.getInvoices().find((i) => i.id === id);
      App.confirmDialog({
        title: 'حذف الفاتورة',
        message: `سيتم حذف الفاتورة <b>${Utils.escapeHtml(inv ? inv.number : '')}</b> نهائياً. هل أنت متأكد؟`,
        onConfirm: () => {
          Store.saveInvoices(Store.getInvoices().filter((i) => i.id !== id));
          App.toast('تم حذف الفاتورة', 'success');
          App.refreshBadges();
          Page.render(document.getElementById('content'));
        },
      });
    },

    exportCSV() {
      const invoices = Store.getInvoices();
      const clients = Store.getClients();
      Utils.exportToCSV(
        'invoices.csv',
        ['رقم الفاتورة', 'العميل', 'التاريخ', 'الإجمالي', 'الضريبة', 'الحالة'],
        invoices.map((inv) => {
          const c = clients.find((cl) => cl.id === inv.clientId);
          return [inv.number, c ? c.name : '', inv.date, inv.total, inv.tax, Utils.invoiceStatus(inv).label];
        })
      );
      App.toast('تم تصدير الفواتير كـ CSV', 'success');
    },

    updateSummary() {
      const rows = document.querySelectorAll('#itemsBody tr');
      let subtotal = 0;
      rows.forEach((row) => {
        const qty = Number(row.querySelector('.item-qty').value) || 0;
        const price = Number(row.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
        const lt = row.querySelector('.item-line-total');
        if (lt) lt.textContent = Utils.formatMoney(qty * price);
      });
      const discount = Number(document.getElementById('fDiscount').value) || 0;
      const taxRate = Number(document.getElementById('fTaxRate').value) || 0;
      const taxable = Math.max(0, subtotal - discount);
      const tax = taxable * (taxRate / 100);
      document.getElementById('sumSubtotal').textContent = Utils.formatMoney(subtotal);
      document.getElementById('sumTax').textContent = Utils.formatMoney(tax);
      document.getElementById('sumTotal').textContent = Utils.formatMoney(taxable + tax);
    },

    removeItemRow(btn) {
      const rows = document.querySelectorAll('#itemsBody tr');
      if (rows.length <= 1) {
        const first = rows[0];
        const qty = first.querySelector('.item-qty');
        const price = first.querySelector('.item-price');
        const prod = first.querySelector('.item-product');
        if (prod) prod.value = '';
        if (qty) qty.value = 1;
        if (price) price.value = '';
        App.toast('يجب وجود صنف واحد على الأقل', 'info');
        this.updateSummary();
        return;
      }
      const tr = btn.closest('tr');
      if (tr) tr.remove();
      bindItemRows();
      this.updateSummary();
    },
  };

  window.Pages.invoices = Page;

  function sortInvoices(list) {
    const sorted = [...list];
    switch (sortBy) {
      case 'created-asc': sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'total-desc': sorted.sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0)); break;
      case 'total-asc': sorted.sort((a, b) => (Number(a.total) || 0) - (Number(b.total) || 0)); break;
      default: sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }

  function invoiceRow(inv) {
    const st = Utils.invoiceStatus(inv);
    const clients = Store.getClients();
    const client = clients.find((c) => c.id === inv.clientId);
    const initials = Utils.initials(client ? client.name : '؟');

    const colors = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#9333ea', '#dc2626'];
    let color = '#0891b2';
    if (client) {
      const idx = client.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % colors.length;
      color = colors[idx];
    }

    return `
      <tr>
        <td>
          <div class="cell-flex">
            <div class="client-avatar" style="background:linear-gradient(135deg,${color},${color}aa)">${Utils.escapeHtml(initials)}</div>
            <div class="cell-info">
              <div class="cell-title">${Utils.escapeHtml(inv.number)}</div>
              <div class="cell-sub">${inv.items ? inv.items.reduce((s, it) => s + Number(it.quantity || 0), 0) : 0} منتج</div>
            </div>
          </div>
        </td>
        <td>${Utils.escapeHtml(client ? client.name : '—')}</td>
        <td>${Utils.formatDateShort(inv.date)}</td>
        <td><span class="amount">${Utils.formatMoney(inv.total)}</span></td>
        <td class="${Number(inv.paidAmount) >= Number(inv.total) ? 'text-success' : 'text-muted'}"><span class="amount">${Utils.formatMoney(inv.paidAmount || 0)}</span></td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
        <td>
          <div class="td-actions">
            <button class="btn-icon success" title="عرض" onclick="Pages.invoices.viewInvoice('${inv.id}')"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" title="تعديل" onclick="Pages.invoices.editInvoice('${inv.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-icon" title="طباعة" onclick="Pages.invoices.printInvoice('${inv.id}')"><i class="fas fa-print"></i></button>
            <button class="btn-icon info" title="تحميل PDF" onclick="Pages.invoices.exportPDF('${inv.id}')"><i class="fas fa-file-pdf"></i></button>
            <button class="btn-icon danger" title="حذف" onclick="Pages.invoices.deleteInvoice('${inv.id}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function openInvoiceModal(id) {
    const invoices = Store.getInvoices();
    const inv = id ? invoices.find((i) => i.id === id) : null;
    const settings = Store.getSettings();

    const itemsHtml = inv
      ? inv.items.map((it, i) => itemEditorRow(it, i)).join('')
      : itemEditorRow({ id: Utils.uid('it'), name: '', price: '', quantity: 1 }, 0);

    App.openModal({
      title: inv ? `تعديل الفاتورة ${inv.number}` : 'فاتورة جديدة',
      size: 'modal-xl',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>رقم الفاتورة</label>
            <input type="text" class="form-control" id="fNumber" value="${Utils.escapeHtml(inv ? inv.number : Store.nextInvoiceNumber())}" ${inv ? 'readonly' : ''}>
          </div>
          <div class="form-group">
            <label>العميل <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="fClientName" list="clientSuggestions" placeholder="اكتب اسم العميل..."
              value="${Utils.escapeHtml(inv ? (Store.getClients().find((c) => c.id === inv.clientId) || {}).name || '' : '')}" autocomplete="off">
            <input type="hidden" id="fClientId" value="${inv ? Utils.escapeHtml(inv.clientId) : ''}">
            <datalist id="clientSuggestions">${clientDatalist()}</datalist>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>الرقم الضريبي للعميل</label>
            <input type="text" class="form-control" id="fClientTax" dir="ltr" style="text-align:left" placeholder="مثال: 310123456700003"
              value="${Utils.escapeHtml(inv ? (Store.getClients().find((c) => c.id === inv.clientId) || {}).taxNumber || '' : '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>تاريخ الإصدار</label>
            <input type="date" class="form-control" id="fDate" value="${inv ? inv.date : Utils.todayISO()}">
          </div>
          <div class="form-group">
            <label>الحالة</label>
            <select class="form-control" id="fStatus">
              <option value="pending" ${inv && inv.status === 'pending' ? 'selected' : ''}>معلقة</option>
              <option value="paid" ${inv && inv.status === 'paid' ? 'selected' : ''}>مدفوعة</option>
              <option value="draft" ${inv && inv.status === 'draft' ? 'selected' : ''}>مسودة</option>
            </select>
          </div>
        </div>

        <label style="font-size:0.85rem;font-weight:600;color:var(--text-muted);margin-bottom:7px;display:block">أصناف الفاتورة</label>
        <datalist id="productSuggestions">${productDatalist()}</datalist>
        <div class="table-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th class="item-name">المنتج</th>
                <th style="width:90px">الوحدة</th>
                <th style="width:100px">الكمية</th>
                <th style="width:130px">السعر</th>
                <th style="width:130px">الإجمالي</th>
                <th style="width:44px"></th>
              </tr>
            </thead>
            <tbody id="itemsBody">${itemsHtml}</tbody>
          </table>
        </div>
        <button class="btn btn-ghost btn-sm mt-2" id="addItemBtn"><i class="fas fa-plus"></i> إضافة صنف</button>

        <div class="summary-box">
          <div class="srow"><span>المجموع الفرعي</span><span class="amount" id="sumSubtotal">0</span></div>
          <div class="form-row" style="gap:8px;margin-top:6px">
            <div class="form-group" style="margin-bottom:0">
              <label>خصم (${Utils.escapeHtml(settings.currency)})</label>
              <input type="number" class="form-control" id="fDiscount" min="0" step="0.01" value="${inv ? inv.discount || 0 : 0}" oninput="Pages.invoices.updateSummary()">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>نسبة الضريبة %</label>
              <input type="number" class="form-control" id="fTaxRate" min="0" max="100" step="0.1" value="${inv ? inv.taxRate || 0 : settings.taxRate}" oninput="Pages.invoices.updateSummary()">
            </div>
          </div>
          <div class="srow"><span>قيمة الضريبة</span><span class="amount" id="sumTax">0</span></div>
          <div class="srow total"><span>الإجمالي</span><span class="amount" id="sumTotal">0</span></div>
        </div>

        <div class="form-group mt-3">
          <label>ملاحظات</label>
          <textarea class="form-control" id="fNotes" placeholder="ملاحظات تظهر على الفاتورة...">${Utils.escapeHtml(inv ? inv.notes || '' : '')}</textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnSaveInvoice"><i class="fas fa-save"></i> ${inv ? 'حفظ التعديلات' : 'حفظ الفاتورة'}</button>
        <button class="btn btn-primary" id="btnSavePrintInvoice"><i class="fas fa-print"></i> حفظ وطباعة</button>
      `,
    });

    bindItemRows();

    const clientNameInput = document.getElementById('fClientName');
    if (clientNameInput) {
      clientNameInput.addEventListener('input', () => {
        const clients = Store.getClients();
        const hit = clients.find((c) => c.name.toLowerCase() === clientNameInput.value.trim().toLowerCase());
        const idInput = document.getElementById('fClientId');
        const taxInput = document.getElementById('fClientTax');
        if (idInput) idInput.value = hit ? hit.id : '';
        if (taxInput) taxInput.value = hit ? (hit.taxNumber || '') : taxInput.value;
      });
    }

    document.getElementById('addItemBtn').addEventListener('click', () => {
      const tbody = document.getElementById('itemsBody');
      tbody.insertAdjacentHTML('beforeend', itemEditorRow({ id: Utils.uid('it'), name: '', price: '', quantity: 1 }, tbody.children.length));
      bindItemRows();
      const lastSelect = tbody.querySelector('tr:last-child .item-product');
      if (lastSelect) lastSelect.focus();
      Page.updateSummary();
    });

    Page.updateSummary();

    function saveInvoice(shouldPrint) {
      const clientName = document.getElementById('fClientName').value.trim();
      if (!clientName) {
        App.toast('يرجى إدخال اسم العميل', 'warning');
        return;
      }

      const clients = Store.getClients();
      let clientId = document.getElementById('fClientId').value;
      const clientTax = document.getElementById('fClientTax') ? document.getElementById('fClientTax').value.trim() : '';
      const matched = clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
      if (matched) {
        clientId = matched.id;
        if (clientTax && matched.taxNumber !== clientTax) {
          matched.taxNumber = clientTax;
          Store.saveClients(clients);
        }
      } else if (!clientId || !clients.some((c) => c.id === clientId && c.name === clientName)) {
        const neu = { id: Utils.uid('c'), name: clientName, phone: '', email: '', address: '', taxNumber: clientTax, createdAt: Utils.todayISO() };
        clients.push(neu);
        Store.saveClients(clients);
        clientId = neu.id;
      }

      const rows = buildItemsFromRows();
      if (!rows.length || rows.some((r) => !r.name || Number(r.quantity) <= 0)) {
        App.toast('يرجى إضافة صنف واحد على الأقل باسم وكمية صحيحة', 'warning');
        return;
      }

      const products = Store.getProducts();
      let productsChanged = false;
      rows.forEach((r) => {
        if (!r.name) return;
        const existing = products.find((p) => p.name.toLowerCase() === r.name.toLowerCase());
        if (!existing) {
          products.push({
            id: Utils.uid('p'),
            name: r.name,
            sku: '',
            unit: r.unit || '',
            price: Number(r.price) || 0,
            cost: 0,
            quantity: Number(r.quantity) || 0,
            description: '',
            createdAt: Utils.todayISO(),
          });
          productsChanged = true;
        }
      });
      if (productsChanged) Store.saveProducts(products);

      const computed = Utils.recomputeInvoice(rows, document.getElementById('fDiscount').value, document.getElementById('fTaxRate').value);
      const date = document.getElementById('fDate').value || Utils.todayISO();
      const status = document.getElementById('fStatus').value;

      const data = {
        id: inv ? inv.id : Utils.uid('inv'),
        number: inv ? inv.number : (document.getElementById('fNumber').value.trim() || Store.nextInvoiceNumber()),
        clientId,
        date,
        status,
        items: computed.items,
        subtotal: computed.subtotal,
        discount: computed.discount,
        taxRate: computed.taxRate,
        tax: computed.tax,
        total: computed.total,
        paidAmount: status === 'paid' ? computed.total : inv && inv.paidAmount ? inv.paidAmount : 0,
        notes: document.getElementById('fNotes').value,
        createdAt: inv ? inv.createdAt : date,
      };

      if (inv) {
        const idx = invoices.findIndex((i) => i.id === inv.id);
        invoices[idx] = data;
      } else {
        invoices.push(data);
      }

      Store.saveInvoices(invoices);
      App.closeModal();
      App.toast(inv ? 'تم تحديث الفاتورة' : 'تم إنشاء الفاتورة بنجاح', 'success');
      App.refreshBadges();
      Page.render(document.getElementById('content'));

      if (shouldPrint) printInvoiceDoc(data);
    }

    document.getElementById('btnSaveInvoice').addEventListener('click', () => saveInvoice(false));
    document.getElementById('btnSavePrintInvoice').addEventListener('click', () => saveInvoice(true));
  }

  function clientDatalist() {
    const clients = Store.getClients().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return clients
      .map((c) => `<option value="${Utils.escapeHtml(c.name)}" data-id="${Utils.escapeHtml(c.id)}"></option>`)
      .join('');
  }

  function productDatalist() {
    const products = Store.getProducts().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return products
      .map((p) => `<option value="${Utils.escapeHtml(p.name)}"></option>`)
      .join('');
  }

  function itemEditorRow(item, index) {
    return `
      <tr>
        <td>
          <input type="text" class="form-control item-product" list="productSuggestions" value="${Utils.escapeHtml(item.name || '')}" placeholder="اسم المنتج">
        </td>
        <td>
          <input type="text" class="form-control item-unit" value="${Utils.escapeHtml(item.unit || '')}" placeholder="الوحدة">
        </td>
        <td><input type="number" class="form-control item-qty" min="1" value="${item.quantity || 1}" oninput="Pages.invoices.updateSummary()"></td>
        <td><input type="number" class="form-control price-input item-price" min="0" step="0.01" value="${item.price === undefined || item.price === '' ? '' : item.price}" oninput="Pages.invoices.updateSummary()"></td>
        <td><span class="amount item-line-total">0</span></td>
        <td><button class="btn-icon danger" title="حذف" onclick="Pages.invoices.removeItemRow(this)"><i class="fas fa-trash-alt"></i></button></td>
      </tr>`;
  }

  function buildItemsFromRows() {
    const rows = document.querySelectorAll('#itemsBody tr');
    const items = [];
    rows.forEach((row) => {
      const productEl = row.querySelector('.item-product');
      const name = productEl ? productEl.value.trim() : '';
      if (!name) return;
      const qty = Number(row.querySelector('.item-qty').value) || 0;
      const price = Number(row.querySelector('.item-price').value) || 0;
      const unit = row.querySelector('.item-unit') ? row.querySelector('.item-unit').value.trim() : '';
      items.push({ id: Utils.uid('it'), name, quantity: qty, price, unit });
    });
    return items;
  }

  function bindItemRows() {
    document.querySelectorAll('#itemsBody tr').forEach((row, idx) => {
      row.dataset.idx = idx;
      const prod = row.querySelector('.item-product');
      if (prod && !prod.dataset.bind) {
        prod.dataset.bind = '1';
        prod.addEventListener('input', () => {
          const products = Store.getProducts();
          const hit = products.find((p) => p.name.toLowerCase() === prod.value.trim().toLowerCase());
          if (hit) {
            const priceInput = row.querySelector('.item-price');
            if (priceInput) priceInput.value = hit.price;
            const unitInput = row.querySelector('.item-unit');
            if (unitInput) unitInput.value = hit.unit || '';
          }
        });
      }

      const inputs = ['item-product', 'item-unit', 'item-qty', 'item-price']
        .map((c) => row.querySelector('.' + c))
        .filter(Boolean);

      inputs.forEach((el) => {
        if (el.dataset.nav) return;
        el.dataset.nav = '1';
        el.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const idx = inputs.indexOf(el);
          const next = inputs[idx + 1];
          if (next) {
            next.focus();
            next.select && next.select();
          } else {
            const addBtn = document.getElementById('addItemBtn');
            if (addBtn) addBtn.click();
          }
        });
      });
    });
  }

  function openViewModal(inv) {
    const settings = Store.getSettings();
    const client = Store.getClients().find((c) => c.id === inv.clientId);
    const st = Utils.invoiceStatus(inv);
    const due = (Number(inv.total) || 0) - (Number(inv.paidAmount) || 0);

    App.openModal({
      title: '',
      body: `
        <div class="invoice-doc">
          <div class="inv-head">
            <div style="display:flex;gap:14px;align-items:center">
              <div class="inv-logo"><i class="fas fa-building"></i></div>
              <div>
                <h1>${Utils.escapeHtml(settings.companyName)}</h1>
                <div class="inv-title">${Utils.escapeHtml(settings.tagline || '')}</div>
              </div>
            </div>
            <div style="text-align:left">
              <div style="font-size:1.3rem;font-weight:800;color:#111827">فاتورة</div>
              <div style="color:#6b7280;font-size:0.85rem">${Utils.escapeHtml(inv.number)}</div>
            </div>
          </div>

          <div class="inv-meta">
            <div>
              <div class="label">من</div>
              <div class="value">${Utils.escapeHtml(settings.companyName)}</div>
              ${settings.phone ? `<div class="value" style="font-weight:400">الهاتف: ${Utils.escapeHtml(settings.phone)}</div>` : ''}
              ${settings.address ? `<div class="value" style="font-weight:400">${Utils.escapeHtml(settings.address)}</div>` : ''}
              ${settings.taxNumber ? `<div class="value" style="font-weight:400">الرقم الضريبي: ${Utils.escapeHtml(settings.taxNumber)}</div>` : ''}
            </div>
            <div>
              <div class="label">إلى</div>
              <div class="value">${Utils.escapeHtml(client ? client.name : 'عميل')}</div>
              ${client && client.phone ? `<div class="value" style="font-weight:400">الهاتف: ${Utils.escapeHtml(client.phone)}</div>` : ''}
              ${client && client.email ? `<div class="value" style="font-weight:400">${Utils.escapeHtml(client.email)}</div>` : ''}
              ${client && client.address ? `<div class="value" style="font-weight:400">${Utils.escapeHtml(client.address)}</div>` : ''}
              ${client && client.taxNumber ? `<div class="value" style="font-weight:400">الرقم الضريبي: ${Utils.escapeHtml(client.taxNumber)}</div>` : ''}
            </div>
          </div>

          <div class="inv-meta" style="background:var(--gray-50);border-radius:10px;padding:14px 18px">
            <div>
              <div class="label">تاريخ الإصدار</div>
              <div class="value">${Utils.formatDate(inv.date)}</div>
            </div>
            <div>
              <div class="label">الحالة</div>
              <div class="value"><span class="badge ${st.cls}">${st.label}</span></div>
              <div class="label mt-2">المتبقي</div>
              <div class="value">${Utils.formatMoney(due)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>#</th><th>المنتج</th><th>الوحدة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              ${inv.items.map((it, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${Utils.escapeHtml(it.name)}</td>
                  <td>${Utils.escapeHtml(it.unit || '—')}</td>
                  <td>${it.quantity}</td>
                  <td>${Utils.formatMoney(it.price)}</td>
                  <td><b>${Utils.formatMoney((Number(it.price) || 0) * (Number(it.quantity) || 0))}</b></td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr><td colspan="5" style="text-align:left">المجموع الفرعي</td><td>${Utils.formatMoney(inv.subtotal)}</td></tr>
              ${inv.discount > 0 ? `<tr><td colspan="5" style="text-align:left;color:#6b7280">الخصم</td><td style="color:#6b7280">-${Utils.formatMoney(inv.discount)}</td></tr>` : ''}
              <tr><td colspan="5" style="text-align:left;color:#6b7280">الضريبة (${inv.taxRate}%)</td><td style="color:#6b7280">${Utils.formatMoney(inv.tax)}</td></tr>
            </tfoot>
          </table>

          <div class="inv-total">
            <div class="row"><span>المجموع الفرعي</span><span>${Utils.formatMoney(inv.subtotal)}</span></div>
            ${inv.discount > 0 ? `<div class="row"><span>الخصم</span><span>-${Utils.formatMoney(inv.discount)}</span></div>` : ''}
            <div class="row"><span>الضريبة</span><span>${Utils.formatMoney(inv.tax)}</span></div>
            <div class="row total"><span>الإجمالي</span><span>${Utils.formatMoney(inv.total)}</span></div>
          </div>

          ${inv.notes ? `
            <div class="inv-notes">
              <div class="label">ملاحظات</div>
              <div>${Utils.escapeHtml(inv.notes)}</div>
            </div>` : ''}

          <div class="inv-footer">${Utils.escapeHtml(settings.footerNote || '')}</div>
          <div style="text-align:center;margin-top:20px;padding-top:15px;border-top:1px solid var(--border)">
            <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:6px">رمز الاستجابة السريعة</div>
            <div id="qrContainer"></div>
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إغلاق</button>
        ${inv.status !== 'paid' && inv.status !== 'draft' ? `<button class="btn btn-success" onclick="Pages.receipts.newReceipt('${inv.id}')"><i class="fas fa-receipt"></i> استلام دفعة</button>` : ''}
        <button class="btn btn-primary" onclick="Pages.invoices.printInvoice('${inv.id}')"><i class="fas fa-print"></i> طباعة</button>
        <button class="btn btn-primary" style="background:#dc2626" onclick="Pages.invoices.exportPDF('${inv.id}')"><i class="fas fa-file-pdf"></i> تحميل PDF</button>
      `,
    });

    setTimeout(() => {
      const box = document.getElementById('qrContainer');
      if (box) {
        Utils.renderQR(box, Utils.fatoraQRText({
          seller: settings.companyName,
          vat: settings.taxNumber,
          date: inv.date,
          total: inv.total,
        }), {
          width: 100,
          dark: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e5e7eb' : '#111827',
        });
      }
    }, 120);
  }

  function printInvoiceDoc(inv) {
    const settings = Store.getSettings();
    const client = Store.getClients().find((c) => c.id === inv.clientId);

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { App.toast('يرجى السماح بفتح النوافذ المنبثقة', 'warning'); return; }
    const qrText = Utils.fatoraQRText({
      seller: settings.companyName,
      vat: settings.taxNumber,
      date: inv.date,
      total: inv.total,
    });
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ${Utils.escapeHtml(inv.number)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        @page{size:A4;margin:8mm}
        body{font-family:'Tajawal',Arial,sans-serif;color:#1e293b;direction:rtl;line-height:1.4;background:#fff}
        .page{padding:0;max-width:794px;margin:0 auto}
        .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;border-bottom:2px solid #4f46e5;padding-bottom:8px}
        .company{display:flex;gap:10px;align-items:center}
        .logo{width:34px;height:34px;border-radius:8px;background:#eef2ff;display:flex;align-items:center;justify-content:center;color:#4f46e5;font-size:.95rem}
        .company h1{font-size:.95rem;font-weight:800}.company .sub{color:#4f46e5;font-weight:700;font-size:.72rem}
        .invoice-tag{text-align:left}.invoice-tag .label{font-size:1.05rem;font-weight:800}.invoice-tag .num{color:#6b7280;font-size:.75rem}
        .info-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;font-size:.78rem}
        .info-block{background:#f8fafc;border:1px solid #eef2f7;border-radius:7px;padding:7px 10px}
        .info-block .lab{color:#6b7280;font-size:.65rem;font-weight:700;margin-bottom:1px}
        .info-block .val{font-weight:600;font-size:.78rem}.info-block .val.sm{font-weight:400;font-size:.72rem;color:#475569}
        table{width:100%;border-collapse:collapse;margin-bottom:8px}
        th{background:#f1f5f9;color:#64748b;font-size:.7rem;font-weight:700;padding:6px 8px;text-align:right;border-bottom:1.5px solid #e2e8f0}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:.78rem}
        tbody tr:nth-child(even){background:#fafbfc}
        tfoot td{font-weight:700;padding:5px 8px;font-size:.78rem}
        .summary-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px}
        .totals{margin-right:auto;width:220px;background:#eef2ff;border-radius:8px;padding:8px 14px;border-right:3px solid #4f46e5}
        .totals .r{display:flex;justify-content:space-between;gap:16px;padding:2px 0;color:#374151;font-size:.76rem}
        .totals .r.total{font-size:.9rem;font-weight:800;color:#4f46e5;border-top:1px solid #c7d2fe;margin-top:3px;padding-top:5px}
        .qr-box{text-align:center}.qr-box .lab{color:#94a3b8;font-size:.62rem;margin-bottom:2px}
        .notes{background:#f8fafc;border-radius:6px;padding:6px 10px;font-size:.72rem;color:#374151;margin-top:8px}
        .notes .lab{font-weight:700;color:#6b7280;margin-bottom:1px}
        .footer{margin-top:12px;padding-top:6px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:.68rem}
        @media print{body{background:#fff}.page{box-shadow:none;padding:0}}
      </style></head><body><div class="page">
      <div class="head"><div class="company"><div class="logo"><i class="fas fa-building"></i></div><div><h1>${Utils.escapeHtml(settings.companyName)}</h1><div class="sub">${Utils.escapeHtml(settings.tagline || '')}</div></div></div><div class="invoice-tag"><div class="label">فاتورة</div><div class="num">${Utils.escapeHtml(inv.number)}</div></div></div></div>
      <div class="info-row">
        <div class="info-block"><div class="lab">من</div><div class="val">${Utils.escapeHtml(settings.companyName)}</div>${settings.phone ? `<div class="val sm">هاتف: ${Utils.escapeHtml(settings.phone)}</div>` : ''}${settings.taxNumber ? `<div class="val sm">ضريبي: ${Utils.escapeHtml(settings.taxNumber)}</div>` : ''}</div>
        <div class="info-block"><div class="lab">إلى</div><div class="val">${Utils.escapeHtml(client ? client.name : 'عميل')}</div>${client && client.phone ? `<div class="val sm">هاتف: ${Utils.escapeHtml(client.phone)}</div>` : ''}${client && client.taxNumber ? `<div class="val sm">ضريبي: ${Utils.escapeHtml(client.taxNumber)}</div>` : ''}</div>
        <div class="info-block"><div class="lab">تفاصيل</div><div class="val sm">تاريخ: ${Utils.formatDate(inv.date)}</div>${inv.notes ? `<div class="val sm" style="margin-top:2px">ملاحظات: ${Utils.escapeHtml(inv.notes).slice(0, 50)}</div>` : ''}</div>
      </div>
      <table><thead><tr><th>#</th><th>المنتج</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${inv.items.map((it, i) => `<tr><td>${i+1}</td><td style="font-weight:500">${Utils.escapeHtml(it.name)}</td><td>${Utils.escapeHtml(it.unit || '—')}</td><td>${it.quantity}</td><td>${Utils.formatMoney(it.price)}</td><td style="font-weight:600">${Utils.formatMoney((Number(it.price)||0)*(Number(it.quantity)||0))}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:left">المجموع الفرعي</td><td>${Utils.formatMoney(inv.subtotal)}</td></tr>${inv.discount > 0 ? `<tr><td colspan="5" style="text-align:left;color:#6b7280">الخصم</td><td style="color:#6b7280">-${Utils.formatMoney(inv.discount)}</td></tr>` : ''}<tr><td colspan="5" style="text-align:left;color:#6b7280">الضريبة (${inv.taxRate}%)</td><td style="color:#6b7280">${Utils.formatMoney(inv.tax)}</td></tr></tfoot></table>
      <div class="summary-row"><div class="qr-box"><div class="lab">رمز الاستجابة السريعة</div><div id="qrPrint"></div></div>
      <div class="totals"><div class="r"><span>المجموع الفرعي</span><span>${Utils.formatMoney(inv.subtotal)}</span></div>${inv.discount > 0 ? `<div class="r"><span>الخصم</span><span>-${Utils.formatMoney(inv.discount)}</span></div>` : ''}<div class="r"><span>الضريبة</span><span>${Utils.formatMoney(inv.tax)}</span></div><div class="r total"><span>الإجمالي</span><span>${Utils.formatMoney(inv.total)}</span></div></div></div>
      ${inv.notes ? `<div class="notes"><div class="lab">ملاحظات</div>${Utils.escapeHtml(inv.notes)}</div>` : ''}
      <div class="footer">${Utils.escapeHtml(settings.footerNote || '')}</div>
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      <script>window.onload=function(){var t=${JSON.stringify(qrText)},box=document.getElementById('qrPrint');for(var n=4;n<=30;n++){try{box.innerHTML='';new QRCode(box,{text:t,width:65,height:65,colorDark:'#1e293b',colorLight:'transparent',correctLevel:QRCode.CorrectLevel.H,typeNumber:n});break;}catch(e){}}setTimeout(function(){window.print();},500);};<\/script>
      </body></html>`);
    win.document.close();
  }
})();
