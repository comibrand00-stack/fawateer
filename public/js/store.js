/* ============================================
   Data Layer (localStorage)
   ============================================ */

window.Pages = window.Pages || {};

const Store = (() => {
  const KEYS = {
    clients: 'inv_clients',
    products: 'inv_products',
    invoices: 'inv_invoices',
    expenses: 'inv_expenses',
    receipts: 'inv_receipts',
    settings: 'inv_settings',
    theme: 'inv_theme',
    seeded: 'inv_seeded_v1',
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Store read error', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Store write error', key, e);
    }
  }

  const defaultSettings = () => ({
    companyName: 'شركتي',
    tagline: 'نظام إدارة الفواتير',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    currency: 'ر.س',
    currencyCode: 'SAR',
    taxRate: 15,
    invoicePrefix: 'INV-',
    autoNumber: true,
    footerNote: 'شكراً لتعاملكم معنا',
    username: '',
    password: '',
  });

  const api = {
    getClients: () => read(KEYS.clients, []),
    saveClients: (clients) => write(KEYS.clients, clients),

    getProducts: () => read(KEYS.products, []),
    saveProducts: (products) => write(KEYS.products, products),

    getInvoices: () => read(KEYS.invoices, []),
    saveInvoices: (invoices) => write(KEYS.invoices, invoices),

    getExpenses: () => read(KEYS.expenses, []),
    saveExpenses: (expenses) => write(KEYS.expenses, expenses),

    getReceipts: () => read(KEYS.receipts, []),
    saveReceipts: (receipts) => write(KEYS.receipts, receipts),

    getSettings: () => ({ ...defaultSettings(), ...read(KEYS.settings, {}) }),
    saveSettings: (settings) => write(KEYS.settings, settings),
    resetSettings: () => write(KEYS.settings, {}),

    getTheme: () => read(KEYS.theme, 'light'),
    setTheme: (theme) => write(KEYS.theme, theme),

    isSeeded: () => read(KEYS.seeded, false),
    markSeeded: () => write(KEYS.seeded, true),

    // Generate next invoice number
    nextInvoiceNumber: () => {
      const settings = api.getSettings();
      const invoices = api.getInvoices();
      let max = 0;
      invoices.forEach((inv) => {
        const n = parseInt(String(inv.number).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(n) && n > max) max = n;
      });
      const next = max + 1;
      const prefix = settings.invoicePrefix || 'INV-';
      return prefix + String(next).padStart(4, '0');
    },

    // Generate next receipt number
    nextReceiptNumber: () => {
      const receipts = api.getReceipts();
      let max = 0;
      receipts.forEach((r) => {
        const n = parseInt(String(r.number).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(n) && n > max) max = n;
      });
      return 'REC-' + String(max + 1).padStart(4, '0');
    },

    resetAll: () => {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    },
  };

  return api;
})();

/* ============================================
   Seed demo data (first run only)
   ============================================ */

function seedDemoData() {
  if (Store.isSeeded()) return;

  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const clients = [
    { id: 'c1', name: 'شركة الأفق للتجارة', phone: '0501234567', email: 'info@horizon.com', address: 'الرياض - حي الملقا', taxNumber: '310123456700003', createdAt: daysAgo(90) },
    { id: 'c2', name: 'مؤسسة النور', phone: '0559876543', email: 'contact@alnoor.com', address: 'جدة - حي الروضة', taxNumber: '', createdAt: daysAgo(70) },
    { id: 'c3', name: 'متجر الهدى', phone: '0512345678', email: '', address: 'الدمام - حي الشاطئ', taxNumber: '', createdAt: daysAgo(55) },
    { id: 'c4', name: 'شركة البناء الحديث', phone: '0547896321', email: 'build@modern.com', address: 'الرياض - طريق الملك فهد', taxNumber: '310987654300001', createdAt: daysAgo(30) },
    { id: 'c5', name: 'محلات النسيم', phone: '0509876543', email: '', address: 'الخبر - حي العليا', taxNumber: '', createdAt: daysAgo(12) },
  ];

  const products = [
    { id: 'p1', name: 'جهاز لابتوب Pro', sku: 'LAP-1001', price: 3500, cost: 2900, quantity: 12, unit: 'قطعة', createdAt: daysAgo(90) },
    { id: 'p2', name: 'ماوس لاسلكي', sku: 'MOU-2002', price: 90, cost: 55, quantity: 50, unit: 'قطعة', createdAt: daysAgo(90) },
    { id: 'p3', name: 'لوحة مفاتيح', sku: 'KEY-2003', price: 140, cost: 85, quantity: 30, unit: 'قطعة', createdAt: daysAgo(80) },
    { id: 'p4', name: 'شاشة 27 بوصة', sku: 'MON-3004', price: 1100, cost: 850, quantity: 10, unit: 'قطعة', createdAt: daysAgo(75) },
    { id: 'p5', name: 'طابعة ليزر', sku: 'PRI-4005', price: 950, cost: 700, quantity: 8, unit: 'قطعة', createdAt: daysAgo(60) },
    { id: 'p6', name: 'كابل HDMI', sku: 'CAB-5006', price: 45, cost: 20, quantity: 100, unit: 'قطعة', createdAt: daysAgo(45) },
    { id: 'p7', name: 'سماعة رأس', sku: 'HDP-6007', price: 220, cost: 150, quantity: 25, unit: 'قطعة', createdAt: daysAgo(30) },
    { id: 'p8', name: 'كاميرا مراقبة', sku: 'CAM-7008', price: 480, cost: 350, quantity: 5, unit: 'قطعة', createdAt: daysAgo(15) },
  ];

  const mkInvoice = (id, clientId, date, status, items, discount = 0) => {
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const discountAmt = discount; // flat
    const tax = (subtotal - discountAmt) * 0.15;
    const total = subtotal - discountAmt + tax;
    return {
      id,
      number: id,
      clientId,
      date,
      status: status || 'paid',
      items: items.map((it, i) => ({ id: it.id, name: it.name, price: it.price, quantity: it.qty, unit: (products.find((p) => p.id === it.id) || {}).unit || '' })),
      subtotal: +subtotal.toFixed(2),
      discount: +discountAmt.toFixed(2),
      taxRate: 15,
      tax: +tax.toFixed(2),
      total: +total.toFixed(2),
      paidAmount: status === 'paid' ? +total.toFixed(2) : 0,
      notes: '',
      createdAt: date,
    };
  };

  const invoices = [
    mkInvoice('INV-0001', 'c1', daysAgo(85), 'paid', [
      { id: 'p1', name: 'جهاز لابتوب Pro', price: 3500, qty: 2 },
      { id: 'p2', name: 'ماوس لاسلكي', price: 90, qty: 5 },
    ], 100),
    mkInvoice('INV-0002', 'c2', daysAgo(68), 'paid', [
      { id: 'p4', name: 'شاشة 27 بوصة', price: 1100, qty: 3 },
      { id: 'p6', name: 'كابل HDMI', price: 45, qty: 10 },
    ]),
    mkInvoice('INV-0003', 'c3', daysAgo(52), 'paid', [
      { id: 'p5', name: 'طابعة ليزر', price: 950, qty: 1 },
      { id: 'p3', name: 'لوحة مفاتيح', price: 140, qty: 4 },
      { id: 'p2', name: 'ماوس لاسلكي', price: 90, qty: 3 },
    ], 50),
    mkInvoice('INV-0004', 'c4', daysAgo(35), 'paid', [
      { id: 'p4', name: 'شاشة 27 بوصة', price: 1100, qty: 6 },
      { id: 'p8', name: 'كاميرا مراقبة', price: 480, qty: 4 },
      { id: 'p6', name: 'كابل HDMI', price: 45, qty: 20 },
    ], 200),
    mkInvoice('INV-0005', 'c1', daysAgo(22), 'paid', [
      { id: 'p7', name: 'سماعة رأس', price: 220, qty: 8 },
      { id: 'p2', name: 'ماوس لاسلكي', price: 90, qty: 10 },
    ]),
    mkInvoice('INV-0006', 'c5', daysAgo(10), 'pending', [
      { id: 'p1', name: 'جهاز لابتوب Pro', price: 3500, qty: 1 },
      { id: 'p7', name: 'سماعة رأس', price: 220, qty: 2 },
      { id: 'p6', name: 'كابل HDMI', price: 45, qty: 15 },
    ], 80),
    mkInvoice('INV-0007', 'c2', daysAgo(4), 'pending', [
      { id: 'p5', name: 'طابعة ليزر', price: 950, qty: 2 },
      { id: 'p3', name: 'لوحة مفاتيح', price: 140, qty: 5 },
    ]),
    mkInvoice('INV-0008', 'c4', daysAgo(1), 'draft', [
      { id: 'p8', name: 'كاميرا مراقبة', price: 480, qty: 2 },
      { id: 'p6', name: 'كابل HDMI', price: 45, qty: 8 },
    ], 30),
  ];

  const expenses = [
    { id: 'e1', title: 'إيجار المكتب', amount: 3500, date: daysAgo(60), category: 'إيجار', notes: 'إيجار شهر يوليو' },
    { id: 'e2', title: 'رواتب الموظفين', amount: 9000, date: daysAgo(58), category: 'رواتب', notes: '' },
    { id: 'e3', title: 'فاتورة كهرباء', amount: 620, date: daysAgo(25), category: 'مرافق', notes: '' },
    { id: 'e4', title: 'خدمات إنترنت', amount: 350, date: daysAgo(20), category: 'اتصالات', notes: '' },
    { id: 'e5', title: 'مستلزمات مكتبية', amount: 180, date: daysAgo(8), category: 'مستلزمات', notes: 'أوراق وأقلام' },
    { id: 'e6', title: 'صيانة مكيفات', amount: 400, date: daysAgo(3), category: 'صيانة', notes: '' },
  ];

  const receipts = [
    { id: 'r1', number: 'REC-0001', invoiceId: 'INV-0001', clientId: 'c1', amount: invoices.find((i) => i.id === 'INV-0001').total, date: daysAgo(85), method: 'نقداً', notes: 'دفعة كاملة', createdAt: daysAgo(85) },
    { id: 'r2', number: 'REC-0002', invoiceId: 'INV-0002', clientId: 'c2', amount: invoices.find((i) => i.id === 'INV-0002').total, date: daysAgo(68), method: 'تحويل بنكي', notes: '', createdAt: daysAgo(68) },
    { id: 'r3', number: 'REC-0003', invoiceId: 'INV-0003', clientId: 'c3', amount: invoices.find((i) => i.id === 'INV-0003').total, date: daysAgo(52), method: 'نقداً', notes: '', createdAt: daysAgo(52) },
    { id: 'r4', number: 'REC-0004', invoiceId: 'INV-0004', clientId: 'c4', amount: invoices.find((i) => i.id === 'INV-0004').total, date: daysAgo(35), method: 'شيك', notes: 'شيك آجل', createdAt: daysAgo(35) },
    { id: 'r5', number: 'REC-0005', invoiceId: 'INV-0005', clientId: 'c1', amount: invoices.find((i) => i.id === 'INV-0005').total, date: daysAgo(22), method: 'تحويل بنكي', notes: '', createdAt: daysAgo(22) },
    { id: 'r6', number: 'REC-0006', invoiceId: 'INV-0007', clientId: 'c2', amount: 1500, date: daysAgo(4), method: 'نقداً', notes: 'دفعة مقدمة', createdAt: daysAgo(4) },
  ];
  const inv7 = invoices.find((i) => i.id === 'INV-0007');
  if (inv7) inv7.paidAmount = 1500;

  Store.saveClients(clients);
  Store.saveProducts(products);
  Store.saveInvoices(invoices);
  Store.saveExpenses(expenses);
  Store.saveReceipts(receipts);
  Store.markSeeded();
}