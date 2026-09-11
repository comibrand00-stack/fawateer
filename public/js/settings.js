/* ============================================
   Settings page: company info, invoice defaults, data
   ============================================ */

(function () {
  const Page = {
    render(container) {
      const s = Store.getSettings();

      container.innerHTML = `
        <div class="tabs">
          <button class="tab active" id="tabCompany" data-stab="company">بيانات الشركة</button>
          <button class="tab" id="tabInvoice" data-stab="invoice">إعدادات الفواتير</button>
          <button class="tab" id="tabData" data-stab="data">البيانات والنسخ الاحتياطي</button>
        </div>

        <div id="settingsBody">
          ${renderCompany(s)}
        </div>
      `;

      const tabs = ['company', 'invoice', 'data'];
      tabs.forEach((t) => {
        document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).addEventListener('click', () => {
          tabs.forEach((x) => {
            document.getElementById('tab' + x.charAt(0).toUpperCase() + x.slice(1)).classList.remove('active');
          });
          document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.add('active');
          document.getElementById('settingsBody').innerHTML =
            t === 'company' ? renderCompany(s) : t === 'invoice' ? renderInvoiceSettings(s) : renderDataTab(s);
          Page.bind();
        });
      });
      Page.bind();
    },
  };

  window.Pages.settings = Page;

  function renderCompany(s) {
    return `
      <div class="card" style="max-width:760px">
        <div class="card-header"><h3><i class="fas fa-building" style="color:var(--primary)"></i> بيانات الشركة</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>اسم الشركة / النشاط</label>
              <input type="text" class="form-control" id="setName" value="${Utils.escapeHtml(s.companyName)}">
            </div>
            <div class="form-group">
              <label>شعار النصي (شعار مختصر)</label>
              <input type="text" class="form-control" id="setTagline" value="${Utils.escapeHtml(s.tagline || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>رقم الهاتف</label>
              <input type="text" class="form-control" id="setPhone" value="${Utils.escapeHtml(s.phone || '')}">
            </div>
            <div class="form-group">
              <label>البريد الإلكتروني</label>
              <input type="email" class="form-control" id="setEmail" value="${Utils.escapeHtml(s.email || '')}">
            </div>
          </div>
          <div class="form-group">
            <label>العنوان</label>
            <input type="text" class="form-control" id="setAddress" value="${Utils.escapeHtml(s.address || '')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>الرقم الضريبي</label>
              <input type="text" class="form-control" id="setTax" value="${Utils.escapeHtml(s.taxNumber || '')}">
            </div>
            <div class="form-group">
              <label>العملة</label>
              <select class="form-control" id="setCurrency">
                ${currencyOptions(s.currency)}
              </select>
            </div>
          </div>
          <div class="flex justify-between items-center mt-4" style="gap:12px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btnSaveCompany"><i class="fas fa-save"></i> حفظ البيانات</button>
            <button class="btn btn-secondary" id="btnResetCompany"><i class="fas fa-rotate-right"></i> استعادة الافتراضي</button>
          </div>
        </div>
      </div>

      <div class="card" style="max-width:760px">
        <div class="card-header"><h3><i class="fas fa-lock" style="color:var(--warning)"></i> إعدادات الدخول</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>اسم المستخدم</label>
              <input type="text" class="form-control" id="setUser" value="${Utils.escapeHtml(s.username || '')}" placeholder="مثال: admin" autocomplete="off">
            </div>
            <div class="form-group">
              <label>كلمة المرور</label>
              <input type="password" class="form-control" id="setPass" value="${Utils.escapeHtml(s.password || '')}" placeholder="••••••••" autocomplete="new-password">
            </div>
          </div>
          <small class="text-muted">يُطلب الاسم وكلمة المرور عند فتح البرنامج. لتعطيل الحماية اترك الحقلين فارغين واحفظ.</small>
          <div class="mt-4">
            <button class="btn btn-primary" id="btnSavePass"><i class="fas fa-save"></i> حفظ بيانات الدخول</button>
          </div>
        </div>
      </div>`;
  }

  function renderInvoiceSettings(s) {
    return `
      <div class="card" style="max-width:760px">
        <div class="card-header"><h3><i class="fas fa-file-invoice" style="color:var(--primary)"></i> إعدادات الفواتير</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>بادئة رقم الفاتورة</label>
              <input type="text" class="form-control" id="setPrefix" value="${Utils.escapeHtml(s.invoicePrefix || 'INV-')}">
            </div>
            <div class="form-group">
              <label>نسبة الضريبة الافتراضية (%)</label>
              <input type="number" class="form-control" id="setTaxRate" min="0" max="100" step="0.1" value="${s.taxRate || 0}">
            </div>
          </div>
          <div class="form-group">
            <label>ملاحظة أسفل الفاتورة</label>
            <input type="text" class="form-control" id="setFooter" value="${Utils.escapeHtml(s.footerNote || '')}">
          </div>
          <div class="mt-4">
            <button class="btn btn-primary" id="btnSaveInvoiceSettings"><i class="fas fa-save"></i> حفظ الإعدادات</button>
          </div>
        </div>
      </div>`;
  }

  function renderDataTab(s) {
    const invoices = Store.getInvoices();
    const clients = Store.getClients();
    const products = Store.getProducts();
    const expenses = Store.getExpenses();

    return `
      <div class="card" style="max-width:760px">
        <div class="card-header"><h3><i class="fas fa-database" style="color:var(--info)"></i> إدارة البيانات</h3></div>
        <div class="card-body">
          <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
            <div class="stat-card"><div class="stat-label">الفواتير</div><div class="stat-value">${invoices.length}</div></div>
            <div class="stat-card"><div class="stat-label">العملاء</div><div class="stat-value">${clients.length}</div></div>
            <div class="stat-card"><div class="stat-label">المنتجات</div><div class="stat-value">${products.length}</div></div>
            <div class="stat-card"><div class="stat-label">المصروفات</div><div class="stat-value">${expenses.length}</div></div>
          </div>

          <h3 class="mb-3" style="font-size:0.95rem;font-weight:700">النسخ الاحتياطي</h3>
          <div class="flex gap-3 mb-4" style="flex-wrap:wrap">
            <button class="btn btn-primary" id="btnBackup"><i class="fas fa-download"></i> تنزيل نسخة احتياطية (JSON)</button>
            <label class="btn btn-secondary cursor-pointer" style="cursor:pointer">
              <i class="fas fa-upload"></i> استيراد نسخة
              <input type="file" id="btnRestore" accept="application/json,.json" style="display:none">
            </label>
          </div>

          <div style="background:var(--danger-light);border-radius:10px;padding:14px 18px;margin-top:10px">
            <h3 style="font-size:0.95rem;font-weight:700;color:var(--danger);margin-bottom:6px"><i class="fas fa-triangle-exclamation"></i> منطقة الخطر</h3>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">حذف جميع البيانات بشكل نهائي. هذه العملية لا يمكن التراجع عنها.</p>
            <button class="btn btn-danger btn-sm" id="btnWipe"><i class="fas fa-trash-alt"></i> حذف جميع البيانات</button>
          </div>
        </div>
      </div>`;
  }

  function currencyOptions(selected) {
    const list = [
      ['ر.س', 'الريال السعودي'],
      ['د.إ', 'الدرهم الإماراتي'],
      ['ج.م', 'الجنيه المصري'],
      ['د.ك', 'الدينار الكويتي'],
      ['ر.ق', 'الريال القطري'],
      ['د.ب', 'الدينار البحريني'],
      ['ر.ع', 'الريال العماني'],
      ['د.ا', 'الدينار الأردني'],
      ['ل.س', 'الليرة السورية'],
      ['د.ع', 'الدينار العراقي'],
      ['$', 'دولار أمريكي'],
      ['€', 'يورو'],
      ['£', 'جنيه إسترليني'],
      ['₺', 'ليرة تركية'],
    ];
    return list
      .map(([sym, name]) => `<option value="${sym}" ${selected === sym ? 'selected' : ''}>${name} (${sym})</option>`)
      .join('');
  }

  Page.bind = function () {
    setTimeout(() => {
      const saveCompany = document.getElementById('btnSaveCompany');
      if (saveCompany) saveCompany.addEventListener('click', saveCompanySettings);
      const resetCompany = document.getElementById('btnResetCompany');
      if (resetCompany) resetCompany.addEventListener('click', () => {
        Store.resetSettings();
        App.toast('تم استعادة الإعدادات الافتراضية', 'success');
        Page.render(document.getElementById('content'));
      });
      const saveInv = document.getElementById('btnSaveInvoiceSettings');
      if (saveInv) saveInv.addEventListener('click', saveInvoiceSettings);
      const btnBackup = document.getElementById('btnBackup');
      if (btnBackup) btnBackup.addEventListener('click', backup);
      const btnRestore = document.getElementById('btnRestore');
      if (btnRestore) btnRestore.addEventListener('change', restore);
      const btnWipe = document.getElementById('btnWipe');
      if (btnWipe) btnWipe.addEventListener('click', wipeData);
      const savePass = document.getElementById('btnSavePass');
      if (savePass) savePass.addEventListener('click', savePassword);
    }, 50);
  };

  function saveCompanySettings() {
    const s = Store.getSettings();
    s.companyName = document.getElementById('setName').value.trim() || 'شركتي';
    s.tagline = document.getElementById('setTagline').value.trim();
    s.phone = document.getElementById('setPhone').value.trim();
    s.email = document.getElementById('setEmail').value.trim();
    s.address = document.getElementById('setAddress').value.trim();
    s.taxNumber = document.getElementById('setTax').value.trim();
    s.currency = document.getElementById('setCurrency').value;
    Store.saveSettings(s);
    App.toast('تم حفظ بيانات الشركة', 'success');
  }

  function saveInvoiceSettings() {
    const s = Store.getSettings();
    s.invoicePrefix = document.getElementById('setPrefix').value.trim() || 'INV-';
    s.taxRate = Number(document.getElementById('setTaxRate').value) || 0;
    s.footerNote = document.getElementById('setFooter').value.trim();
    Store.saveSettings(s);
    App.toast('تم حفظ إعدادات الفواتير', 'success');
  }

  function savePassword() {
    const s = Store.getSettings();
    s.username = document.getElementById('setUser').value.trim();
    s.password = document.getElementById('setPass').value.trim();
    Store.saveSettings(s);
    App.toast((s.username && s.password) ? 'تم حفظ بيانات الدخول' : 'تم تعطيل حماية الدخول', 'success');
  }

  function backup() {
    const data = {
      exportedAt: new Date().toISOString(),
      settings: Store.getSettings(),
      clients: Store.getClients(),
      products: Store.getProducts(),
      invoices: Store.getInvoices(),
      expenses: Store.getExpenses(),
    };
    Utils.downloadFile(
      JSON.stringify(data, null, 2),
      'invoices-backup-' + Utils.todayISO() + '.json',
      'application/json'
    );
    App.toast('تم إنشاء النسخة الاحتياطية', 'success');
  }

  function restore(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.clients)) throw new Error('تنسيق غير صحيح');
        Store.saveClients(data.clients || []);
        Store.saveProducts(data.products || []);
        Store.saveInvoices(data.invoices || []);
        Store.saveExpenses(data.expenses || []);
        if (data.settings) Store.saveSettings(data.settings);
        App.toast('تم استيراد البيانات بنجاح', 'success');
        App.refreshBadges();
        App.navigate('dashboard');
      } catch (err) {
        App.toast('فشل استيراد الملف: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function wipeData() {
    App.confirmDialog({
      title: 'حذف جميع البيانات',
      message: 'سيتم حذف <b>جميع</b> الفواتير والعملاء والمنتجات والمصروفات نهائياً. هل أنت متأكد تماماً؟',
      onConfirm: () => {
        Store.resetAll();
        seedDemoData();
        App.toast('تم حذف جميع البيانات', 'info');
        App.refreshBadges();
        App.navigate('dashboard');
      },
    });
  }
})();