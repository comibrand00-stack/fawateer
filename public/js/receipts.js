/* ============================================
   Receipts page: payment receipts (إيصالات الدفع)
   A receipt records a payment and is deducted
   from the linked invoice automatically.
   ============================================ */

(function () {
  let searchTerm = '';
  const METHODS = ['نقداً', 'تحويل بنكي', 'شيك', 'بطاقة', 'آخر'];

  const Page = {
    render(container) {
      const receipts = Store.getReceipts();
      const clients = Store.getClients();
      const invoices = Store.getInvoices();
      const now = new Date();
      const monthKey = now.toISOString().slice(0, 7);

      let list = receipts;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        list = list.filter((r) => {
          const inv = invoices.find((i) => i.id === r.invoiceId);
          const c = clients.find((x) => x.id === r.clientId);
          return (r.number + ' ' + (inv ? inv.number : '') + ' ' + (c ? c.name : '') + ' ' + (r.notes || '') + ' ' + (r.method || '')).toLowerCase().includes(q);
        });
      }
      list = [...list].sort((a, b) => b.date.localeCompare(a.date));

      const monthReceipts = receipts.filter((r) => r.date && r.date.startsWith(monthKey));
      const monthTotal = monthReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
      const totalAll = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
      const pending = invoices.filter((i) => i.status !== 'draft' && (Number(i.paidAmount || 0) < Number(i.total || 0))).length;

      container.innerHTML = `
        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <div class="search-bar">
              <i class="fas fa-search"></i>
              <input type="text" id="receiptSearch" placeholder="بحث في الإيصالات..." value="${Utils.escapeHtml(searchTerm)}">
            </div>
          </div>
          <div class="toolbar-left">
            <button class="btn btn-secondary" onclick="Pages.receipts.exportCSV()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
            <button class="btn btn-primary" onclick="Pages.receipts.newReceipt()"><i class="fas fa-plus"></i> إيصال جديد</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">إيصالات هذا الشهر</div><div class="stat-value">${monthReceipts.length}</div><div class="stat-sub">${Utils.formatMoney(monthTotal)}</div></div>
          <div class="stat-card"><div class="stat-label">إجمالي المحصّل</div><div class="stat-value" style="font-size:1.25rem">${Utils.formatMoney(totalAll)}</div><div class="stat-sub">${receipts.length} إيصال</div></div>
          <div class="stat-card"><div class="stat-label">فواتير المتبقي عليها</div><div class="stat-value" style="color:var(--warning)">${pending}</div><div class="stat-sub">لم تُسدد بالكامل</div></div>
        </div>

        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>رقم الإيصال</th><th>التاريخ</th><th>العميل</th><th>الفاتورة</th><th>الطريقة</th><th>المبلغ</th><th>ملاحظات</th><th></th></tr></thead>
              <tbody>
                ${list.map((r) => {
                  const c = clients.find((x) => x.id === r.clientId);
                  const inv = invoices.find((i) => i.id === r.invoiceId);
                  return `<tr>
                    <td><div class="cell-flex">
                      <div class="client-avatar" style="background:linear-gradient(135deg,#059669,#059669aa)"><i class="fas fa-receipt" style="font-size:0.8rem"></i></div>
                      <div class="cell-info">
                        <div class="cell-title">${Utils.escapeHtml(r.number)}</div>
                        <div class="cell-sub">${Utils.escapeHtml(r.method || '—')}</div>
                      </div>
                    </div></td>
                    <td>${Utils.formatDateShort(r.date)}</td>
                    <td>${Utils.escapeHtml(c ? c.name : '—')}</td>
                    <td class="text-muted">${Utils.escapeHtml(inv ? inv.number : '—')}</td>
                    <td><span class="badge badge-info">${Utils.escapeHtml(r.method || '—')}</span></td>
                    <td><span class="amount">${Utils.formatMoney(r.amount)}</span></td>
                    <td class="text-muted" style="max-width:180px">${Utils.escapeHtml(r.notes || '')}</td>
                    <td>
                      <div class="td-actions">
                        <button class="btn-icon" title="تعديل" onclick="Pages.receipts.editReceipt('${r.id}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon" title="طباعة" onclick="Pages.receipts.printReceipt('${r.id}')"><i class="fas fa-print"></i></button>
                        <button class="btn-icon danger" title="حذف" onclick="Pages.receipts.deleteReceipt('${r.id}')"><i class="fas fa-trash-alt"></i></button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
                ${!list.length ? '<tr><td colspan="8" class="text-center text-muted" style="padding:22px">لا توجد إيصالات</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const s = document.getElementById('receiptSearch');
      if (s) s.addEventListener('input', Utils.debounce((e) => { searchTerm = e.target.value; Page.render(container); }, 250));
    },

    newReceipt(invoiceId) {
      openReceiptModal(invoiceId);
    },

    editReceipt(id) {
      const receipt = Store.getReceipts().find((r) => r.id === id);
      if (receipt) openReceiptModal(null, id);
    },

    deleteReceipt(id) {
      const receipt = Store.getReceipts().find((r) => r.id === id);
      App.confirmDialog({
        title: 'حذف الإيصال',
        message: `سيتم حذف إيصال <b>${Utils.escapeHtml(receipt ? receipt.number : '')}</b> وإرجاع مبلغه إلى الفاتورة. هل أنت متأكد؟`,
        onConfirm: () => {
          if (!receipt) return;
          const invoices = Store.getInvoices();
          const inv = invoices.find((i) => i.id === receipt.invoiceId);
          if (inv) {
            inv.paidAmount = Math.max(0, (Number(inv.paidAmount || 0) - Number(receipt.amount || 0)));
            inv.status = Number(inv.paidAmount) >= Number(inv.total) ? 'paid' : 'pending';
          }
          Store.saveInvoices(invoices);
          Store.saveReceipts(Store.getReceipts().filter((r) => r.id !== id));
          App.toast('تم حذف الإيصال وإرجاع المبلغ للفاتورة', 'success');
          App.refreshBadges();
          Page.render(document.getElementById('content'));
        },
      });
    },

    printReceipt(id) {
      const receipt = Store.getReceipts().find((r) => r.id === id);
      if (receipt) printReceiptDoc(receipt);
    },

    exportCSV() {
      const clients = Store.getClients();
      const invoices = Store.getInvoices();
      Utils.exportToCSV('receipts.csv',
        ['رقم الإيصال', 'التاريخ', 'العميل', 'الفاتورة', 'الطريقة', 'المبلغ', 'ملاحظات'],
        Store.getReceipts().map((r) => {
          const c = clients.find((x) => x.id === r.clientId);
          const inv = invoices.find((i) => i.id === r.invoiceId);
          return [r.number, r.date, c ? c.name : '', inv ? inv.number : '', r.method, r.amount, r.notes];
        }));
      App.toast('تم تصدير الإيصالات كـ CSV', 'success');
    },
  };

  window.Pages.receipts = Page;

  /* ============================================ */

  function invoiceDue(inv) {
    return Math.max(0, (Number(inv.total) || 0) - (Number(inv.paidAmount) || 0));
  }

  function openReceiptModal(invoiceId, receiptId) {
    const editing = !!receiptId;
    const oldReceipt = editing ? Store.getReceipts().find((r) => r.id === receiptId) : null;
    const invoices = Store.getInvoices()
      .filter((i) => i.status !== 'draft' && (invoiceDue(i) > 0 || (editing && i.id === oldReceipt.invoiceId)))
      .sort((a, b) => b.date.localeCompare(a.date));
    const clients = Store.getClients();
    const selected = (editing && oldReceipt)
      ? invoices.find((i) => i.id === oldReceipt.invoiceId) || null
      : (invoiceId ? invoices.find((i) => i.id === invoiceId) || null : invoices[0] || null);

    function capacity(inv) {
      const due = invoiceDue(inv);
      if (editing && oldReceipt && inv.id === oldReceipt.invoiceId) return due + Number(oldReceipt.amount || 0);
      return due;
    }

    App.openModal({
      title: editing ? 'تعديل الإيصال' : 'إيصال استلام دفعة',
      size: 'modal-lg',
      body: `
        <div class="form-group">
          <label>الفاتورة <span class="text-danger">*</span></label>
          <select class="form-control" id="rInvoice">
            ${invoices.length ? invoices.map((i) => {
              const c = clients.find((x) => x.id === i.clientId);
              return `<option value="${i.id}" ${selected && selected.id === i.id ? 'selected' : ''}>${Utils.escapeHtml(i.number)} — ${Utils.escapeHtml(c ? c.name : 'عميل')} (المتبقي ${Utils.formatMoney(invoiceDue(i))})</option>`;
            }).join('') : '<option value="">لا توجد فواتير متبقٍ عليها</option>'}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>العميل</label>
            <input type="text" class="form-control" id="rClientName" value="${selected ? Utils.escapeHtml((clients.find((c) => c.id === selected.clientId) || {}).name || '') : ''}" readonly>
          </div>
          <div class="form-group">
            <label>المتبقي على الفاتورة</label>
            <input type="text" class="form-control" id="rDue" value="${selected ? Utils.formatMoney(capacity(selected)) : ''}" readonly>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>المبلغ <span class="text-danger">*</span></label>
            <input type="number" class="form-control" id="rAmount" min="0.01" step="0.01" value="${oldReceipt ? oldReceipt.amount : (selected ? capacity(selected) : '')}" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>التاريخ</label>
            <input type="date" class="form-control" id="rDate" value="${oldReceipt ? oldReceipt.date : Utils.todayISO()}">
          </div>
        </div>
        <div class="form-group">
          <label>طريقة الدفع</label>
          <select class="form-control" id="rMethod">
            ${METHODS.map((m) => `<option value="${m}" ${oldReceipt && oldReceipt.method === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" class="form-control" id="rNotes" value="${oldReceipt ? Utils.escapeHtml(oldReceipt.notes || '') : ''}" placeholder="ملاحظات (اختياري)">
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-success" id="btnSaveReceipt"><i class="fas fa-receipt"></i> ${editing ? 'حفظ التعديلات' : 'حفظ الإيصال'}</button>
      `,
    });

    const sel = document.getElementById('rInvoice');
    if (sel) {
      sel.addEventListener('change', (e) => {
        const inv = Store.getInvoices().find((i) => i.id === e.target.value);
        const c = clients.find((x) => x.id === (inv || {}).clientId);
        document.getElementById('rClientName').value = c ? c.name : '';
        document.getElementById('rDue').value = inv ? Utils.formatMoney(capacity(inv)) : '';
        document.getElementById('rAmount').value = inv ? capacity(inv) : '';
      });
    }

    document.getElementById('btnSaveReceipt').addEventListener('click', () => {
      const invId = document.getElementById('rInvoice').value;
      const inv = Store.getInvoices().find((i) => i.id === invId);
      if (!inv) { App.toast('يرجى اختيار فاتورة', 'warning'); return; }
      const amount = Number(document.getElementById('rAmount').value);
      const cap = capacity(inv);
      if (!amount || amount <= 0) { App.toast('يرجى إدخال مبلغ صحيح', 'warning'); return; }
      if (amount > cap) { App.toast('المبلغ أكبر من المتبقي على الفاتورة', 'warning'); return; }
      const date = document.getElementById('rDate').value || Utils.todayISO();
      const method = document.getElementById('rMethod').value;
      const notes = document.getElementById('rNotes').value.trim();

      const invoices = Store.getInvoices();
      const receipts = Store.getReceipts();

      if (editing) {
        const oldInv = invoices.find((i) => i.id === oldReceipt.invoiceId);
        if (oldInv) {
          oldInv.paidAmount = Math.max(0, (Number(oldInv.paidAmount || 0) - Number(oldReceipt.amount || 0)));
          oldInv.status = Number(oldInv.paidAmount) >= Number(oldInv.total) ? 'paid' : 'pending';
        }
      }

      const target = invoices.find((i) => i.id === invId);
      target.paidAmount = Math.min(Number(target.total || 0), (Number(target.paidAmount || 0) + amount));
      if (Number(target.paidAmount) >= Number(target.total)) target.status = 'paid';
      Store.saveInvoices(invoices);

      if (editing) {
        const idx = receipts.findIndex((r) => r.id === receiptId);
        receipts[idx] = { ...oldReceipt, invoiceId: invId, clientId: target.clientId, amount: +amount.toFixed(2), date, method, notes };
        Store.saveReceipts(receipts);
      } else {
        Store.saveReceipts([...receipts, { id: Utils.uid('r'), number: Store.nextReceiptNumber(), invoiceId: invId, clientId: target.clientId, amount: +amount.toFixed(2), date, method, notes, createdAt: new Date().toISOString() }]);
      }

      App.closeModal();
      App.toast(editing ? 'تم تعديل الإيصال وتحديث الفاتورة' : `تم استلام دفعة ${Utils.formatMoney(amount)} وخصمها من ${target.number}`, 'success');
      App.refreshBadges();
      Page.render(document.getElementById('content'));
    });
  }

  function printReceiptDoc(receipt) {
    const settings = Store.getSettings();
    const client = Store.getClients().find((c) => c.id === receipt.clientId);
    const inv = Store.getInvoices().find((i) => i.id === receipt.invoiceId);

    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) { App.toast('يرجى السماح بفتح النوافذ المنبثقة', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إيصال سداد ${Utils.escapeHtml(receipt.number)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        @page{size:A5 landscape;margin:6mm}
        body{font-family:'Tajawal',Arial,sans-serif;color:#1e293b;direction:rtl;line-height:1.4;background:#fff;padding:10px}
        .page{max-width:620px;margin:0 auto;height:calc(100vh - 20px)}
        .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #059669;padding-bottom:6px;margin-bottom:10px}
        .company{display:flex;gap:8px;align-items:center}
        .logo{width:34px;height:34px;border-radius:8px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;color:#059669;font-size:1rem}
        h1{font-size:1.1rem;font-weight:800}
        .title-box{text-align:center;border:2px solid #059669;border-radius:10px;padding:5px 18px;color:#059669;font-size:1rem;font-weight:800}
        .meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;background:#f9fafb;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:0.85rem}
        .meta .lbl{color:#6b7280;font-size:0.72rem}
        .amount-box{text-align:center;border:2px dashed #059669;border-radius:10px;padding:10px;margin-bottom:10px}
        .amount-box .lbl{color:#059669;font-size:0.8rem;font-weight:700}
        .amount-box .val{font-size:1.6rem;font-weight:800;color:#065f46}
        .detail{width:100%;border-collapse:collapse;margin-bottom:8px}
        .detail td{padding:4px 6px;border-bottom:1px solid #e5e7eb;font-size:0.82rem}
        .detail td.lbl{color:#6b7280;width:40%}
        .footer{color:#4b5563;font-size:0.78rem;text-align:center;border-top:1px solid #d1d5db;padding-top:6px;margin-top:6px}
        .sign{display:flex;justify-content:space-between;margin-top:auto;padding-top:6px}
        .sign .col{text-align:center;font-size:0.8rem;color:#4b5563}
        .sign .col .line{border-top:1px solid #9ca3af;width:130px;margin:0 auto 4px;padding-top:4px}
      </style></head><body>
      <div class="page">
        <div class="head">
          <div class="company">
            <div class="logo"><i class="fas fa-receipt"></i></div>
            <div>
              <h1>${Utils.escapeHtml(settings.companyName)}</h1>
              <div style="color:#6b7280;font-size:0.72rem">${Utils.escapeHtml(settings.tagline || '')}</div>
            </div>
          </div>
          <div class="title-box"><i class="fas fa-check-circle"></i> إيصال سداد</div>
        </div>

        <div class="meta">
          <div><div class="lbl">رقم الإيصال</div><b>${Utils.escapeHtml(receipt.number)}</b></div>
          <div><div class="lbl">التاريخ</div><b>${Utils.formatDate(receipt.date)}</b></div>
          <div><div class="lbl">مرجع الفاتورة</div><b>${Utils.escapeHtml(inv ? inv.number : '—')}</b></div>
          <div><div class="lbl">طريقة الدفع</div><b>${Utils.escapeHtml(receipt.method || '—')}</b></div>
        </div>

        <div class="amount-box">
          <div class="lbl">المبلغ المستلم</div>
          <div class="val">${Utils.formatMoney(receipt.amount)}</div>
        </div>

        <table class="detail">
          <tr><td class="lbl">المستلم من</td><td><b>${Utils.escapeHtml(client ? client.name : '—')}</b></td></tr>
          ${client && client.phone ? `<tr><td class="lbl">الهاتف</td><td>${Utils.escapeHtml(client.phone)}</td></tr>` : ''}
          ${client && client.taxNumber ? `<tr><td class="lbl">الرقم الضريبي للعميل</td><td>${Utils.escapeHtml(client.taxNumber)}</td></tr>` : ''}
          ${receipt.notes ? `<tr><td class="lbl">ملاحظات</td><td>${Utils.escapeHtml(receipt.notes)}</td></tr>` : ''}
        </table>

        <div class="sign">
          <div class="col"><div class="line">المستلم (المندوب)</div></div>
          <div class="col"><div class="line">المدير المختار</div></div>
        </div>

        <div class="footer">${Utils.escapeHtml(settings.footerNote || '')}</div>
      </div>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
    win.focus();
  }
})();