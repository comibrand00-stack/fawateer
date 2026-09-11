/* ============================================
   Products / Inventory page
   ============================================ */

(function () {
  let searchTerm = '';
  let sortBy = 'name';

  const Page = {
    render(container) {
      const products = Store.getProducts();

      const filtered = searchTerm
        ? products.filter((p) =>
            (p.name + ' ' + (p.sku || '') + ' ' + (p.description || '')).toLowerCase().includes(searchTerm.toLowerCase())
          )
        : products;

      const sorted = sortProducts(filtered);
      const stockValue = products.reduce((s, p) => s + Utils.productAvailable(p).available * Number(p.price || 0), 0);

      container.innerHTML = `
        <div class="toolbar mb-4">
          <div class="toolbar-right">
            <div class="search-bar">
              <i class="fas fa-search"></i>
              <input type="text" id="productSearch" placeholder="بحث بالاسم أو رمز الصنف..." value="${Utils.escapeHtml(searchTerm)}">
            </div>
            <select class="select-control" id="productSort">
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>الاسم (أ - ي)</option>
              <option value="name-desc" ${sortBy === 'name-desc' ? 'selected' : ''}>الاسم (ي - أ)</option>
              <option value="stock-asc" ${sortBy === 'stock-asc' ? 'selected' : ''}>الكمية (الأقل أولاً)</option>
              <option value="stock-desc" ${sortBy === 'stock-desc' ? 'selected' : ''}>الكمية (الأعلى أولاً)</option>
              <option value="price-desc" ${sortBy === 'price-desc' ? 'selected' : ''}>السعر (الأعلى)</option>
              <option value="price-asc" ${sortBy === 'price-asc' ? 'selected' : ''}>السعر (الأقل)</option>
              <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>الأحدث</option>
              <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>الأقدم</option>
            </select>
          </div>
          <div class="toolbar-left">
            <button class="btn btn-primary" onclick="Pages.products.addProduct()"><i class="fas fa-plus"></i> منتج جديد</button>
            <button class="btn btn-secondary" onclick="Pages.products.exportCSV()"><i class="fas fa-file-csv"></i> تصدير CSV</button>
          </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px">
          <div class="stat-card"><div class="stat-label">إجمالي المنتجات</div><div class="stat-value">${products.length}</div></div>
          <div class="stat-card"><div class="stat-label">إجمالي قيمة المخزون</div><div class="stat-value" style="font-size:1.1rem">${Utils.formatMoney(stockValue)}</div></div>
          <div class="stat-card"><div class="stat-label">منخفض المخزون</div><div class="stat-value text-warning">${products.filter((p) => Utils.productAvailable(p).available <= 5).length}</div></div>
          <div class="stat-card"><div class="stat-label">وحدات في المخزون</div><div class="stat-value">${products.reduce((s, p) => s + Utils.productAvailable(p).available, 0)}</div></div>
        </div>

        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>رمز الصنف</th>
                  <th>الوحدة</th>
                  <th>سعر البيع</th>
                  <th>التكلفة</th>
                  <th>الربح الهامشي</th>
                  <th>الكمية</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${sorted.length ? sorted.map(productRow).join('') : `
                  <tr>
                    <td colspan="9">
                      <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>لا توجد منتجات</h3>
                        <p>${searchTerm ? 'لا توجد نتائج مطابقة' : 'أضف منتجاتك للمخزون'}</p>
                        ${!searchTerm ? '<button class="btn btn-primary" onclick="Pages.products.addProduct()"><i class="fas fa-plus"></i> إضافة منتج</button>' : ''}
                      </div>
                    </td>
                  </tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;

      const s = document.getElementById('productSearch');
      if (s) s.addEventListener('input', Utils.debounce((e) => { searchTerm = e.target.value; Page.render(container); }, 200));
      const sortSel = document.getElementById('productSort');
      if (sortSel) sortSel.addEventListener('change', (e) => { sortBy = e.target.value; Page.render(container); });
    },

    addProduct() {
      openProductModal();
    },

    editProduct(id) {
      openProductModal(id);
    },

    deleteProduct(id) {
      const p = Store.getProducts().find((x) => x.id === id);
      App.confirmDialog({
        title: 'حذف المنتج',
        message: `هل أنت متأكد من حذف المنتج <b>${Utils.escapeHtml(p ? p.name : '')}</b>؟`,
        onConfirm: () => {
          Store.saveProducts(Store.getProducts().filter((x) => x.id !== id));
          App.toast('تم حذف المنتج', 'success');
          Page.render(document.getElementById('content'));
        },
      });
    },

    exportCSV() {
      Utils.exportToCSV(
        'products.csv',
        ['الاسم', 'رمز الصنف', 'سعر البيع', 'التكلفة', 'الكمية', 'قيمة المخزون'],
        Store.getProducts().map((p) => [
          p.name, p.sku, p.price, p.cost, Utils.productAvailable(p).available, (Number(Utils.productAvailable(p).available) || 0) * (Number(p.price) || 0),
        ])
      );
      App.toast('تم تصدير المنتجات كـ CSV', 'success');
    },
  };

  window.Pages.products = Page;

  function sortProducts(list) {
    const arr = [...list];
    switch (sortBy) {
      case 'name-desc':
        return arr.sort((a, b) => b.name.localeCompare(a.name, 'ar'));
      case 'stock-asc':
        return arr.sort((a, b) => Utils.productAvailable(a).available - Utils.productAvailable(b).available);
      case 'stock-desc':
        return arr.sort((a, b) => Utils.productAvailable(b).available - Utils.productAvailable(a).available);
      case 'price-desc':
        return arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      case 'price-asc':
        return arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      case 'newest':
        return arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      case 'oldest':
        return arr.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
      case 'name':
      default:
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }
  }

  function productRow(product) {
    const colors = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#9333ea', '#dc2626'];
    const idx = product.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % colors.length;
    const qty = Utils.productAvailable(product).available;
    const lowStock = qty <= 5;
    const outStock = qty <= 0;
    const price = Number(product.price || 0);
    const cost = Number(product.cost || 0);
    const margin = price - cost;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;

    return `
      <tr>
        <td>
          <div class="cell-flex">
            <div class="product-thumb" style="background:linear-gradient(135deg,${colors[idx]},${colors[idx]}aa)">${Utils.escapeHtml(product.name.charAt(0))}</div>
            <div class="cell-info">
              <div class="cell-title">${Utils.escapeHtml(product.name)}</div>
              ${product.description ? `<div class="cell-sub">${Utils.escapeHtml(product.description)}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="text-muted">${Utils.escapeHtml(product.sku || '—')}</td>
        <td><span class="badge badge-gray">${Utils.escapeHtml(product.unit || '—')}</span></td>
        <td><span class="amount">${Utils.formatMoney(price)}</span></td>
        <td class="text-muted">${Utils.formatMoney(cost)}</td>
        <td>
          <span class="amount ${margin >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatMoney(margin)}</span>
          <div class="cell-sub">${marginPct.toFixed(1)}%</div>
        </td>
        <td>
          <span class="font-bold">${qty}</span>
        </td>
        <td>
          ${outStock
            ? '<span class="badge badge-danger">نفذت الكمية</span>'
            : lowStock
            ? '<span class="badge badge-warning">مخزون منخفض</span>'
            : '<span class="badge badge-success">متوفر</span>'}
        </td>
        <td>
          <div class="td-actions">
            <button class="btn-icon" title="تعديل" onclick="Pages.products.editProduct('${product.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-icon danger" title="حذف" onclick="Pages.products.deleteProduct('${product.id}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function openProductModal(id) {
    const product = id ? Store.getProducts().find((p) => p.id === id) : null;

    App.openModal({
      title: product ? 'تعديل المنتج' : 'منتج جديد',
      size: 'modal-lg',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label>اسم المنتج <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="pName" value="${Utils.escapeHtml(product ? product.name : '')}" placeholder="مثال: شاشة 27 بوصة">
          </div>
          <div class="form-group">
            <label>رمز الصنف (SKU)</label>
            <input type="text" class="form-control" id="pSku" value="${Utils.escapeHtml(product ? product.sku : '')}" placeholder="SKU-001">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>الوحدة</label>
            <input type="text" class="form-control" id="pUnit" value="${Utils.escapeHtml(product ? product.unit : '')}" placeholder="مثال: قطعة، كجم، علبة">
          </div>
          <div class="form-group">
            <label>سعر البيع <span class="text-danger">*</span></label>
            <input type="number" class="form-control" id="pPrice" min="0" step="0.01" value="${product ? product.price : ''}" placeholder="0.00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>التكلفة</label>
            <input type="number" class="form-control" id="pCost" min="0" step="0.01" value="${product ? product.cost : ''}" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>الكمية في المخزون</label>
            <input type="number" class="form-control" id="pQty" min="0" value="${product ? product.quantity : 0}">
          </div>
        </div>
        <div class="form-group">
          <label>وصف المنتج</label>
          <textarea class="form-control" id="pDesc" placeholder="وصف مختصر (اختياري)">${Utils.escapeHtml(product ? product.description || '' : '')}</textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="App.closeModal()">إلغاء</button>
        <button class="btn btn-primary" id="btnSaveProduct"><i class="fas fa-save"></i> ${product ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>
      `,
    });

    document.getElementById('btnSaveProduct').addEventListener('click', () => {
      const name = document.getElementById('pName').value.trim();
      if (!name) {
        App.toast('يرجى إدخال اسم المنتج', 'warning');
        return;
      }
      const data = {
        id: product ? product.id : Utils.uid('p'),
        name,
        sku: document.getElementById('pSku').value.trim(),
        unit: document.getElementById('pUnit').value,
        price: Number(document.getElementById('pPrice').value) || 0,
        cost: Number(document.getElementById('pCost').value) || 0,
        quantity: Number(document.getElementById('pQty').value) || 0,
        description: document.getElementById('pDesc').value.trim(),
        createdAt: product ? product.createdAt : Utils.todayISO(),
      };

      const products = Store.getProducts();
      if (product) {
        const idx = products.findIndex((p) => p.id === id);
        products[idx] = data;
      } else {
        products.push(data);
      }
      Store.saveProducts(products);
      App.closeModal();
      App.toast(product ? 'تم تحديث المنتج' : 'تمت إضافة المنتج بنجاح', 'success');
      Page.render(document.getElementById('content'));
    });
  }
})();