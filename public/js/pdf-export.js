/* ============================================
   PDF export with QR code (FATOORA compliant)
   ============================================ */

const PDFExport = (() => {
  const QR_DATA = {
    sellerName: '',
    vatNumber: '',
    timestamp: '',
    total: '',
  };

  function buildInvoiceHTML(inv) {
    const settings = Store.getSettings();
    const client = Store.getClients().find((c) => c.id === inv.clientId);
    const st = Utils.invoiceStatus(inv);

    return `
      <div style="direction:rtl;font-family:'Tajawal',Arial,sans-serif;width:794px;padding:40px;background:#fff;color:#111827;line-height:1.6">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #2563eb;padding-bottom:20px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#2563eb">${Utils.escapeHtml(settings.companyName)}</h1>
            ${settings.tagline ? `<div style="color:#6b7280;font-size:13px;margin-top:4px">${Utils.escapeHtml(settings.tagline)}</div>` : ''}
          </div>
          <div style="text-align:left">
            <h2 style="margin:0;font-size:20px;color:#111827">فاتورة</h2>
            <div style="color:#6b7280;font-size:14px">${Utils.escapeHtml(inv.number)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:25px">
          <div>
            <div style="font-weight:700;color:#374151;margin-bottom:6px">من</div>
            <div style="font-weight:600">${Utils.escapeHtml(settings.companyName)}</div>
            ${settings.phone ? `<div style="color:#6b7280;font-size:13px">الهاتف: ${Utils.escapeHtml(settings.phone)}</div>` : ''}
            ${settings.address ? `<div style="color:#6b7280;font-size:13px">${Utils.escapeHtml(settings.address)}</div>` : ''}
            ${settings.taxNumber ? `<div style="color:#6b7280;font-size:13px">الرقم الضريبي: ${Utils.escapeHtml(settings.taxNumber)}</div>` : ''}
          </div>
          <div style="text-align:left">
            <div style="font-weight:700;color:#374151;margin-bottom:6px">إلى</div>
            <div style="font-weight:600">${Utils.escapeHtml(client ? client.name : 'عميل')}</div>
            ${client && client.phone ? `<div style="color:#6b7280;font-size:13px">الهاتف: ${Utils.escapeHtml(client.phone)}</div>` : ''}
            ${client && client.email ? `<div style="color:#6b7280;font-size:13px">${Utils.escapeHtml(client.email)}</div>` : ''}
            ${client && client.address ? `<div style="color:#6b7280;font-size:13px">${Utils.escapeHtml(client.address)}</div>` : ''}
            ${client && client.taxNumber ? `<div style="color:#6b7280;font-size:13px">الرقم الضريبي: ${Utils.escapeHtml(client.taxNumber)}</div>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:20px;margin-bottom:25px">
          <div style="flex:1;background:#f9fafb;padding:12px 16px;border-radius:8px">
            <div style="color:#6b7280;font-size:12px;margin-bottom:2px">تاريخ الإصدار</div>
            <div style="font-weight:600">${Utils.formatDate(inv.date)}</div>
          </div>
          <div style="flex:1;background:#f9fafb;padding:12px 16px;border-radius:8px">
            <div style="color:#6b7280;font-size:12px;margin-bottom:2px">الحالة</div>
            <div style="font-weight:600">${st.label}</div>
          </div>
          ${inv.notes ? `<div style="flex:2;background:#f9fafb;padding:12px 16px;border-radius:8px">
            <div style="color:#6b7280;font-size:12px;margin-bottom:2px">ملاحظات</div>
            <div style="font-size:13px">${Utils.escapeHtml(inv.notes)}</div>
          </div>` : ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#2563eb;color:#fff">
              <th style="padding:10px 12px;text-align:right;font-weight:600">#</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600">المنتج</th>
              <th style="padding:10px 12px;text-align:right;font-weight:600">الوحدة</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600">الكمية</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600">سعر الوحدة</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map((it, i) => `
              <tr style="border-bottom:1px solid #e5e7eb;${i % 2 === 0 ? 'background:#f9fafb' : ''}">
                <td style="padding:10px 12px">${i + 1}</td>
                <td style="padding:10px 12px;font-weight:500">${Utils.escapeHtml(it.name)}</td>
                <td style="padding:10px 12px;color:#6b7280">${Utils.escapeHtml(it.unit || '—')}</td>
                <td style="padding:10px 12px;text-align:center">${it.quantity}</td>
                <td style="padding:10px 12px;text-align:left">${Utils.formatMoney(it.price)}</td>
                <td style="padding:10px 12px;text-align:left;font-weight:600">${Utils.formatMoney((Number(it.price) || 0) * (Number(it.quantity) || 0))}</td>
              </tr>`).join('')}
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div id="qrCodeBox" style="text-align:center">
            <div style="color:#6b7280;font-size:11px;margin-bottom:4px">رمز الاستجابة السريعة</div>
          </div>
          <div style="min-width:280px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;color:#374151"><span>المجموع الفرعي</span><span>${Utils.formatMoney(inv.subtotal)}</span></div>
            ${inv.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280"><span>الخصم</span><span>-${Utils.formatMoney(inv.discount)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280"><span>الضريبة (${inv.taxRate}%)</span><span>${Utils.formatMoney(inv.tax)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid #2563eb;margin-top:6px;font-size:18px;font-weight:700;color:#2563eb"><span>الإجمالي</span><span>${Utils.formatMoney(inv.total)}</span></div>
          </div>
        </div>

        ${settings.footerNote ? `<div style="margin-top:30px;padding-top:15px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center">${Utils.escapeHtml(settings.footerNote)}</div>` : ''}
      </div>`;
  }

  function buildHiddenContainer(html) {
    let el = document.getElementById('pdfRenderArea');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pdfRenderArea';
      el.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#fff';
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.style.width = '794px';
    el.style.left = '-9999px';
    return el;
  }

  async function generateQRDataURL(inv) {
    const settings = Store.getSettings();
    const qrText = Utils.fatoraQRText({
      seller: settings.companyName,
      vat: settings.taxNumber,
      date: inv.date,
      total: inv.total,
    });

    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(qrContainer);

    const ok = Utils.renderQR(qrContainer, qrText, {
      width: 150,
      dark: '#111827',
    });

    if (ok) {
      await new Promise((r) => setTimeout(r, 200));
      const canvas = qrContainer.querySelector('canvas');
      if (canvas) return canvas.toDataURL('image/png');
      const img = qrContainer.querySelector('img');
      if (img) return img.src;
    }
    return null;
  }

  async function generatePDF(invId) {
    const inv = Store.getInvoices().find((i) => i.id === invId);
    if (!inv) return App.toast('الفاتورة غير موجودة', 'error');

    App.toast('جاري إنشاء ملف PDF...', 'info', 2000);

    const html = buildInvoiceHTML(inv);
    const container = buildHiddenContainer(html);

    await new Promise((r) => setTimeout(r, 100));

    const qrDataURL = await generateQRDataURL(inv);
    const qrBox = container.querySelector('#qrCodeBox');
    if (qrBox && qrDataURL) {
      const img = document.createElement('img');
      img.src = qrDataURL;
      img.style.cssText = 'width:120px;height:120px;display:block;margin:0 auto';
      qrBox.appendChild(img);
    }

    await new Promise((r) => setTimeout(r, 100));

    try {
      const canvas = await html2canvas(container.firstElementChild, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const { jsPDF } = window.jspdf;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdfW = 210;
      const pdfH = Math.max((imgH * pdfW) / imgW, 297);
      const pageH = Math.ceil(pdfH / 297) * 297;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pageH] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH);

      const fileName = `${inv.number || 'invoice'}.pdf`;
      pdf.save(fileName);
      App.toast('تم تحميل ملف PDF بنجاح', 'success');
    } catch (err) {
      App.toast('حدث خطأ أثناء إنشاء PDF', 'error');
      console.error('PDF error:', err);
    }
  }

  return { generatePDF };
})();
