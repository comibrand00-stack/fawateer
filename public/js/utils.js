/* ============================================
   Utility helpers
   ============================================ */

const Utils = (() => {
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function formatMoney(value) {
    const s = Store.getSettings();
    const n = Number(value) || 0;
    return (
      n.toLocaleString('ar-SA-u-nu-latn', {
        minimumFractionDigits: n % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2,
      }) + ' ' + s.currency
    );
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('ar-EG-u-nu-latn', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  function daysBetween(a, b) {
    const da = new Date(a + 'T00:00:00').getTime();
    const db = new Date(b + 'T00:00:00').getTime();
    return Math.round((db - da) / 86400000);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slug(str) {
    const map = {
      'ا': 'a', 'أ': 'a', 'إ': 'a', 'آ': 'a',
      'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
      'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
      'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
      'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'و': 'w', 'ي': 'y',
    };
    const lat = String(str).split('').map((c) => map[c] || c).join('');
    return lat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function initials(name) {
    return String(name || '؟')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('');
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Invoice status helpers
  function invoiceStatus(inv) {
    if (inv.status === 'draft') return { key: 'draft', label: 'مسودة', cls: 'badge-gray' };
    if (inv.status === 'paid') return { key: 'paid', label: 'مدفوعة', cls: 'badge-success' };
    if (inv.status === 'overdue') return { key: 'overdue', label: 'متأخرة', cls: 'badge-danger' };
    return { key: 'pending', label: 'قيد الانتظار', cls: 'badge-warning' };
  }

  function recomputeInvoice(items, discount, taxRate) {
    const lines = items.map((it) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 0,
      unit: it.unit || '',
    }));
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const disc = Math.max(0, Number(discount) || 0);
    const taxable = subtotal - disc;
    const tax = taxable * ((Number(taxRate) || 0) / 100);
    const total = taxable + tax;
    return {
      items: lines,
      subtotal: +subtotal.toFixed(2),
      discount: +disc.toFixed(2),
      taxRate: Number(taxRate) || 0,
      tax: +tax.toFixed(2),
      total: +total.toFixed(2),
    };
  }

  function downloadFile(content, fileName, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportToCSV(filename, headers, rows) {
    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    downloadFile('\ufeff' + csv, filename, 'text/csv;charset=utf-8');
  }

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  function monthLabel(year, month0) {
    return monthNames[month0] + ' ' + year;
  }

  // Last N months list [{year, month, label}] newest first
  function lastMonths(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getFullYear(), d.getMonth()) });
    }
    return out;
  }

  function toBinaryString(str) {
    return unescape(encodeURIComponent(String(str || '')));
  }

  // Total sold qty for a product name (excludes draft invoices)
  function soldQty(name) {
    const invoices = Store.getInvoices();
    let sold = 0;
    invoices.forEach((inv) => {
      if (inv.status === 'draft') return;
      (inv.items || []).forEach((it) => {
        if (it.name === name) sold += Number(it.quantity || 0);
      });
    });
    return sold;
  }

  // Available stock = on-hand quantity minus sold quantity
  function productAvailable(p) {
    const total = Number(p.quantity || 0);
    const sold = soldQty(p.name);
    return { total, sold, available: Math.max(0, total - sold) };
  }

  // FATOORA/ZATCA compliant QR payload (TLV + base64)
  function fatoraQRText({ seller, vat, date, total }) {
    function tlv(tag, value) {
      const bytes = toBinaryString(value);
      const len = bytes.length;
      let out = String.fromCharCode(tag, len) + bytes;
      return out;
    }
    const iso = (date ? String(date) : todayISO()) + 'T00:00:00Z';
    const totalStr = (Number(total) || 0).toFixed(2);
    const raw = tlv(1, seller || '') + tlv(2, vat || '') + tlv(3, iso) + tlv(4, totalStr);
    return btoa(raw);
  }

  // Render QR with automatic capacity scaling (never overflows on long/Arabic data)
  function renderQR(container, text, opts = {}) {
    if (!container || typeof QRCode === 'undefined') return false;
    const width = opts.width || 100;
    const dark = opts.dark || '#111827';
    for (let t = 4; t <= 30; t++) {
      try {
        container.innerHTML = '';
        new QRCode(container, {
          text: String(text),
          width,
          height: width,
          colorDark: dark,
          colorLight: 'transparent',
          correctLevel: QRCode.CorrectLevel.H,
          typeNumber: t,
        });
        return true;
      } catch (_) { /* try bigger type */ }
    }
    container.innerHTML = '';
    return false;
  }

  return {
    uid, todayISO, formatMoney, formatDate, formatDateShort, daysBetween,
    escapeHtml, slug, initials, debounce, invoiceStatus, recomputeInvoice,
    downloadFile, exportToCSV, monthLabel, lastMonths,
    fatoraQRText, renderQR, soldQty, productAvailable,
  };
})();