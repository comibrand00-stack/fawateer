/* ============================================
   Main App: routing, modals, toasts, theme
   ============================================ */

window.Pages = window.Pages || {};

const App = (() => {
  const routes = {
    dashboard: { title: 'لوحة التحكم', icon: 'th-large', page: 'dashboard' },
    invoices: { title: 'الفواتير', icon: 'file-invoice', page: 'invoices' },
    receipts: { title: 'إيصالات الدفع', icon: 'receipt', page: 'receipts' },
    clients: { title: 'العملاء', icon: 'users', page: 'clients' },
    products: { title: 'المنتجات', icon: 'box-open', page: 'products' },
    expenses: { title: 'المصروفات', icon: 'coins', page: 'expenses' },
    reports: { title: 'التقارير', icon: 'chart-line', page: 'reports' },
    tax: { title: 'حاسبة الضرائب', icon: 'calculator', page: 'tax' },
    settings: { title: 'الإعدادات', icon: 'cog', page: 'settings' },
  };

  let currentRoute = 'dashboard';

  function init() {
    seedDemoData();
    applyTheme();
    bindShell();
    checkLogin();

    const route = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    navigate(route in routes ? route : 'dashboard');
  }

  function bindShell() {
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    document.getElementById('menuBtn').addEventListener('click', openSidebar);
    document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
    document.getElementById('loginBtn').addEventListener('click', login);
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    if (loginUser) loginUser.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    if (loginPass) loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    document.getElementById('btnNewInvoice').addEventListener('click', () => {
      navigate('invoices');
      setTimeout(() => {
        const t = Pages.invoices;
        if (t && typeof t.newInvoice === 'function') t.newInvoice();
      }, 60);
    });

    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
      if (route in routes) navigate(route);
    });
  }

  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
  }

  function navigate(route) {
    currentRoute = route;
    const def = routes[route];
    document.getElementById('topbarTitle').textContent = def.title;

    document.querySelectorAll('.nav-item[data-route]').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    closeSidebar();

    const content = document.getElementById('content');
    const page = window.Pages[def.page];
    if (page && typeof page.render === 'function') {
      content.innerHTML = '<div class="text-center mt-4"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary)"></i></div>';
      page.render(content);
    } else {
      content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>الصفحة غير متاحة</h3></div>';
    }
  }

  /* ---------- Theme ---------- */
  function applyTheme() {
    const theme = Store.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeLabel').textContent = theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي';
    const icon = document.getElementById('toggleTheme').querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  function toggleTheme() {
    const next = Store.getTheme() === 'dark' ? 'light' : 'dark';
    Store.setTheme(next);
    applyTheme();
  }

  /* ---------- Login / logout ---------- */
  function loginEnabled() {
    const s = Store.getSettings();
    return !!((s.username || '').trim() && (s.password || '').trim());
  }

  function checkLogin() {
    if (!loginEnabled()) return;
    if (sessionStorage.getItem('inv_session') === '1') return;
    showLogin();
  }

  function showLogin() {
    const ov = document.getElementById('loginOverlay');
    if (!ov) return;
    const expected = (Store.getSettings().username || '').trim();
    let last = '';
    try { last = localStorage.getItem('inv_lastuser') || ''; } catch (e) { last = ''; }
    const remembered = !!(expected && last && last === expected);
    const unameEl = document.getElementById('loginUser');
    const unameLabel = document.getElementById('loginUserName');
    if (remembered) {
      unameEl.style.display = 'none';
      unameLabel.style.display = 'block';
      unameLabel.textContent = 'المستخدم: ' + last;
    } else {
      unameEl.style.display = '';
      unameLabel.style.display = 'none';
      unameEl.value = '';
    }
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').textContent = '';
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const inp = remembered ? document.getElementById('loginPass') : document.getElementById('loginUser');
      if (inp) inp.focus();
    }, 100);
  }

  function hideLogin() {
    const ov = document.getElementById('loginOverlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  }

  function setLoginError(msg) {
    const el = document.getElementById('loginError');
    if (el) el.textContent = msg;
  }

  function login() {
    const s = Store.getSettings();
    const expectedUser = (s.username || '').trim();
    const expectedPass = (s.password || '').trim();
    const lbl = document.getElementById('loginUserName');
    const rememberedUser = lbl && lbl.style.display !== 'none'
      ? (function () { try { return localStorage.getItem('inv_lastuser') || ''; } catch (e) { return ''; } })()
      : '';
    const enteredUser = rememberedUser || document.getElementById('loginUser').value.trim();
    const enteredPass = document.getElementById('loginPass').value;
    if (!expectedUser || !expectedPass) {
      setLoginError('لم يتم إعداد الدخول بعد');
      return;
    }
    if (enteredUser === expectedUser && enteredPass === expectedPass) {
      try { localStorage.setItem('inv_lastuser', enteredUser); } catch (e) {}
      sessionStorage.setItem('inv_session', '1');
      hideLogin();
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
      document.getElementById('loginPass').value = '';
    }
  }

  function logout() {
    sessionStorage.removeItem('inv_session');
    App.toast('تم تسجيل الخروج', 'info');
    showLogin();
  }

  /* ---------- Modal system ---------- */
  function openModal({ title = '', body = '', footer = '', size = '' }) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    modal.className = 'modal' + (size ? ' ' + size : '');
    modal.innerHTML = `
      ${title ? `<div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close" onclick="App.closeModal()"><i class="fas fa-times"></i></button>
      </div>` : ''}
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', function onOverlay(e) {
      if (e.target === overlay) App.closeModal();
    });

    const firstInput = modal.querySelector('input:not([type=hidden]), textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---------- Toast ---------- */
  function toast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
    };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 350);
    }, duration);
  }

  /* ---------- Confirm dialog ---------- */
  function confirmDialog({ title = 'تأكيد الحذف', message = 'هل أنت متأكد أنك تريد حذف هذا العنصر؟', onConfirm }) {
    openModal({
      title,
      size: 'modal-sm',
      body: `<p style="color:var(--text-muted)">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-danger" id="btnConfirmDelete"><i class="fas fa-trash-alt"></i> حذف</button>
      `,
    });
    document.getElementById('btnConfirmDelete').addEventListener('click', () => {
      closeModal();
      onConfirm && onConfirm();
    });
  }

  function refreshBadges() {
    const invoices = Store.getInvoices();
    const pending = invoices.filter((i) => {
      const s = Utils.invoiceStatus(i);
      return s.key === 'pending' || s.key === 'overdue';
    }).length;
    const badge = document.getElementById('navBadgeInvoices');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? '' : 'none';
    }
  }

  /* ---------- Populate select options ---------- */
  function populateClientsSelect(selectEl, selectedId) {
    selectEl.innerHTML = '<option value="">— اختر العميل —</option>';
    Store.getClients()
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        selectEl.appendChild(opt);
      });
    if (selectedId) selectEl.value = selectedId;
  }

  function lastInvoiceNumber() {
    const invoices = Store.getInvoices();
    if (!invoices.length) return (Store.getSettings().invoicePrefix || 'INV-') + '0001';
    const last = invoices[invoices.length - 1];
    return last.number;
  }

  return {
    init,
    navigate,
    openModal,
    closeModal,
    toast,
    confirmDialog,
    refreshBadges,
    populateClientsSelect,
    lastInvoiceNumber,
    getRoute: () => currentRoute,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());