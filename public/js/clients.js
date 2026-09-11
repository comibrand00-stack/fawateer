/* ============================================
   Clients page
   ============================================ */

(function () {
  let searchTerm = '';

  const Page = {
    render(container) {
      const clients = Store.getClients();
      const invoices = Store.getInvoices();

      const filtered = searchTerm
        ? clients.filter((c) =>
            (c.name + ' ' + (c.phone || '') + ' ' + (c.email || '') + ' ' + (c.address || '')).toLowerCase().includes(searchTerm.toLowerCase())
          )
        : clients;

      const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      container.innerHTML = `
        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <div class="search-bar">
              <i class="fas fa-search"></i>
              <input type="text" id="clientSearch" placeholder="بحث بالاسم، الهاتف، البريد..." value="${Utils.escapeHtml(searchTerm)}">
            </div>
          </div>
          <div class="toolbar-left">
            <button class="btn btn-primary" onclick="Pages.clients.addClient()"><i class="fas fa-user-plus"></i> عميل جديد</button>
            <button class="btn btn-secondary" onclick="Pages.clients.exportCSV()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
          </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px">
          <div class="stat-card"><div class="stat-label">إجمالي العملاء</div><div class="stat-value">${clients.length}</div></div>
          <div class="stat-card"><div class="stat-label">عملاء لديهم فواتير</div><div class="stat-value">${invoiceClientCount(invoices)}</div></div>
          <div class="stat-card"><div class="stat-label">إجمالي مبيعات العملاء</div><div class="stat-value" style="font-size:1.1rem">${Utils.formatMoney(totalInvoiceValue(invoices))}</div></div>
        </div>

        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>البريد الإلكتروني</th>
                  <th>العنوان</th>
                  <th>الرقم الضريبي</th>
                  <th>إجمالي المشتريات</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${sorted.length ? sorted.map((c) => clientRow(c, invoices)).join('') : `
                  <tr>
                    <td colspan="7">
                      <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>لا يوجد عملاء</h3>
                        <p>${searchTerm ? 'لا توجد نتائج مطابقة' : 'أضف عملاءك للبدء بإنشاء فواتير'}</p>
                        ${!searchTerm ? '<button class="btn btn-primary" onclick="Pages.clients.addClient()"><i class="fas fa-user-plus"></i> إضافة عميل</button>' : ''}
                      </div>
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const s = document.getElementById('clientSearch');
      if (s) s.addEventListener('input', Utils.debounce((e) => { searchTerm = e.target.value; Page.render(container); }, 200));
    },

    addClient() {
      openClientModal();
    },

    editClient(id) {
      openClientModal(id);
    },

    deleteClient(id) {
      const c = Store.getClients().find((x) => x.id === id);
      const hasInv = Store.getInvoices().some((inv) => inv.clientId === id);
      App.confirmDialog({
        title: 'حذف العميل',
        message: hasInv
          ? `العميل <b>${Utils.escapeHtml(c ? c.name : '')}</b> لديه فواتير مرتبطة. سيتم حذف العميل فقط وتبقى الفواتير. متابعة الحذف؟`
          : `هل أنت متأكد من حذف العميل <b>${Utils.escapeHtml(c ? c.name : '')}</b>؟`,
        onConfirm: () => {
          Store.saveClients(Store.getClients().filter((x) => x.id !== id));
          App.toast('تم حذف العميل', 'success');
          Page.render(document.getElementById('content'));
        },
      });
    },

    viewClient(id) {
      const client = Store.getClients().find((c) => c.id === id);
      if (!client) return;
      const invoices = Store.getInvoices().filter((inv) => inv.clientId === id);
      const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0);
      const pending = invoices
        .filter((i) => ['pending', 'overdue'].includes(i.status))
        .reduce((s, i) => s + (Number(i.total || 0) - Number(i.paidAmount || 0)), 0);

      App.openModal({
        title: 'ملف العميل',
        size: 'modal-lg',
        body: `
          <div class="flex items-center gap-4 mb-4">
            <div class="client-avatar" style="width:64px;height:64px;font-size:1.4rem">${Utils.escapeHtml(Utils.initials(client.name))}</div>
            <div>
              <div style="font-size:1.2rem;font-weight:800">${Utils.escapeHtml(client.name)}</div>
              <div class="text-muted" style="font-size:0.85rem">${Utils.escapeHtml(client.address || 'لا يوجد عنوان')}</div>
            </div>
          </div>
          <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
            <div class="stat-card"><div class="stat-label">عدد الفواتير</div><div class="stat-value">${invoices.length}</div></div>
            <div class="stat-card"><div class="stat-label">مدفوع</div><div class="stat-value text-success" style="font-size:1.1rem">${Utils.formatMoney(paid)}</div></div>
            <div class="stat-card"><div class="stat-label">مستحق</div><div class="stat-value text-danger" style="font-size:1.1rem">${Utils.formatMoney(pending)}</div></div>
          </div>
          <h3 class="mb-2" style="font-size:0.95rem;font-weight:700">فواتير العميل</h3>
          ${invoices.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>الرقم</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
                <tbody>
                  ${invoices.map((inv) => {
                    const st = Utils.invoiceStatus(inv);
                    return `<tr>
                      <td>${Utils.escapeHtml(inv.number)}</td>
                      <td>${Utils.formatDateShort(inv.date)}</td>
                      <td>${Utils.formatMoney(inv.total)}</td>
                      <td><span class="badge ${st.cls}">${st.label}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : '<p class="text-muted text-center" style="padding:14px">لا توجد فواتير لهذا العميل</p>'}
        `,
        footer: `
          <button class="btn btn-secondary" onclick="App.closeModal()">إغلاق</button>
          <button class="btn btn-primary" id="btnCreateInvForClient"><i class="fas fa-file-invoice"></i> إنشاء فاتورة</button>
        `,
      });

      const createBtn = document.getElementById('btnCreateInvForClient');
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          App.closeModal();
          Pages.invoices.newInvoice();
          const tries = 8;
          let attempts = 0;
          const tryPrefill = () => {
            const nameInput = document.getElementById('fClientName');
            const idInput = document.getElementById('fClientId');
            const taxInput = document.getElementById('fClientTax');
            if (nameInput && idInput) {
              nameInput.value = client.name;
              idInput.value = client.id;
              if (taxInput) taxInput.value = client.taxNumber || '';
              App.toast('تم تحديد العميل في الفاتورة', 'info');
            } else if (attempts++ < tries) {
              setTimeout(tryPrefill, 150);
            }
          };
          tryPrefill();
        });
      }
    },

    prefillClient(id) {
      const client = Store.getClients().find((c) => c.id === id) || { id, name: '' };
      const nameInput = document.getElementById('fClientName');
      const idInput = document.getElementById('fClientId');
      const taxInput = document.getElementById('fClientTax');
      if (nameInput && idInput) {
        nameInput.value = client.name || id;
        idInput.value = client.id;
        if (taxInput) taxInput.value = client.taxNumber || '';
        App.toast('تم تحديد العميل في الفاتورة', 'info');
      } else {
        setTimeout(() => this.prefillClient(id), 200);
      }
    },

    exportCSV() {
      const invoices = Store.getInvoices();
      Utils.exportToCSV(
        'clients.csv',
        ['الاسم', 'الهاتف', 'البريد', 'العنوان', 'الرقم الضريبي', 'إجمالي المشتريات'],
        Store.getClients().map((c) => {
          const t = invoices.filter((i) => i.clientId === c.id).reduce((s, i) => s + Number(i.total || 0), 0);
          return [c.name, c.phone, c.email, c.address, c.taxNumber, t];
        })
      );
      App.toast('تم تصدير العملاء كـ CSV', 'success');
    },
  };

  window.Pages.clients = Page;

  function invoiceClientCount(invoices) {
    return new Set(invoices.map((i) => i.clientId)).size;
  }

  function totalInvoiceValue(invoices) {
    return invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  }

  function clientRow(client, invoices) {
    const invs = invoices.filter((i) => i.clientId === client.id);
    const total = invs.reduce((s, i) => s + Number(i.total || 0), 0);
    const colors = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#9333ea', '#dc2626'];
    const idx = client.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % colors.length;

    return `
      <tr>
        <td>
          <div class="cell-flex">
            <div class="client-avatar" style="background:linear-gradient(135deg,${colors[idx]},${colors[idx]}aa)">${Utils.escapeHtml(Utils.initials(client.name))}</div>
            <div class="cell-info">
              <div class="cell-title">${Utils.escapeHtml(client.name)}</div>
              <div class="cell-sub">${invs.length} فاتورة</div>
            </div>
          </div>
        </td>
        <td class="text-muted">${Utils.escapeHtml(client.phone || '—')}</td>
        <td class="text-muted">${Utils.escapeHtml(client.email || '—')}</td>
        <td class="text-muted">${Utils.escapeHtml(client.address || '—')}</td>
        <td class="text-muted">${Utils.escapeHtml(client.taxNumber || '—')}</td>
        <td><span class="amount">${Utils.formatMoney(total)}</span></td>
        <td>
          <div class="td-actions">
            <button class="btn-icon success" title="ملف العميل" onclick="Pages.clients.viewClient('${client.id}')"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" title="تعديل" onclick="Pages.clients.editClient('${client.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-icon danger" title="حذف" onclick="Pages.clients.deleteClient('${client.id}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function openClientModal(id) {
    const client = id ? Store.getClients().find((c) => c.id === id) : null;

    App.openModal({
      title: client ? 'تعديل بيانات العميل' : 'عميل جديد',
      size: 'modal-lg',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>اسم العميل <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="cName" value="${Utils.escapeHtml(client ? client.name : '')}" placeholder="مثال: شركة الأفق">
          </div>
          <div class="form-group">
            <label>رقم الهاتف</label>
            <input type="tel" class="form-control" id="cPhone" value="${Utils.escapeHtml(client ? client.phone : '')}" placeholder="05xxxxxxxx">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>البريد الإلكتروني</label>
            <input type="email" class="form-control" id="cEmail" value="${Utils.escapeHtml(client ? client.email : '')}" placeholder="name@example.com">
          </div>
          <div class="form-group">
            <label>الرقم الضريبي</label>
            <input type="text" class="form-control" id="cTax" value="${Utils.escapeHtml(client ? client.taxNumber : '')}" placeholder="(اختياري)">
          </div>
        </div>
        <div class="form-group">
          <label>العنوان</label>
          <input type="text" class="form-control" id="cAddress" value="${Utils.escapeHtml(client ? client.address : '')}" placeholder="المدينة، الحي، الشارع">
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnSaveClient"><i class="fas fa-save"></i> ${client ? 'حفظ التعديلات' : 'إضافة العميل'}</button>
      `,
    });

    document.getElementById('btnSaveClient').addEventListener('click', () => {
      const name = document.getElementById('cName').value.trim();
      if (!name) {
        App.toast('يرجى إدخال اسم العميل', 'warning');
        return;
      }
      const data = {
        id: client ? client.id : Utils.uid('c'),
        name,
        phone: document.getElementById('cPhone').value.trim(),
        email: document.getElementById('cEmail').value.trim(),
        taxNumber: document.getElementById('cTax').value.trim(),
        address: document.getElementById('cAddress').value.trim(),
        createdAt: client ? client.createdAt : Utils.todayISO(),
      };

      const clients = Store.getClients();
      if (client) {
        const idx = clients.findIndex((c) => c.id === id);
        clients[idx] = data;
      } else {
        clients.push(data);
      }
      Store.saveClients(clients);
      App.closeModal();
      App.toast(client ? 'تم تحديث بيانات العميل' : 'تمت إضافة العميل بنجاح', 'success');
      Page.render(document.getElementById('content'));
    });
  }
})();