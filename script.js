'use strict';

const PRODUCTS_URL = 'data/products.json';
const BRANCHES_URL = 'data/branches.json';
const grid = document.getElementById('product-grid');
const statusBox = document.getElementById('catalog-status');
const branchList = document.getElementById('branch-list');
const searchInput = document.getElementById('search-input');
const imageDialog = document.getElementById('image-dialog');
const managerDialog = document.getElementById('manager-dialog');
const dialogImage = document.getElementById('dialog-image');
const dialogTitle = document.getElementById('dialog-title');
const dialogSubtitle = document.getElementById('dialog-subtitle');
const dialogDots = document.getElementById('dialog-dots');

let products = [];
let branches = [];
let selectedBranch = '';
let searchTerm = '';
let activeGallery = [];
let activeImageIndex = 0;
let activeProduct = null;
let activeColor = null;

document.getElementById('current-year').textContent = new Date().getFullYear();

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function productPageUrl(productId, colorIndex) {
  const url = new URL('product.html', window.location.href);
  url.searchParams.set('product', productId);
  url.searchParams.set('color', String(colorIndex));
  return url.href;
}

function imageHTML(path, alt, cls) {
  return `<img class="${cls}" src="${esc(path)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.classList.add('image-load-error');this.alt='تعذر تحميل الصورة';">`;
}

function renderBranches() {
  branchList.innerHTML = branches.map(branch => `
    <button type="button" class="filter-chip ${branch.id === selectedBranch ? 'active' : ''}"
      data-branch="${esc(branch.id)}" aria-pressed="${branch.id === selectedBranch}">${esc(branch.name)}</button>
  `).join('');
}

function visibleProducts() {
  const branch = branches.find(item => item.id === selectedBranch);
  const allowedIds = branch?.products || [];
  const query = searchTerm.toLocaleLowerCase('ar');
  return products.filter(product => {
    const inBranch = !selectedBranch || product.branch === selectedBranch || allowedIds.includes(product.id);
    const searchable = [product.model, product.name, product.display_name, product.brand,
      product.description, ...(product.colors || []).map(color => color.name)].join(' ').toLocaleLowerCase('ar');
    return inBranch && searchable.includes(query);
  });
}

function renderProducts() {
  const list = visibleProducts();
  if (!list.length) {
    grid.innerHTML = '';
    statusBox.hidden = false;
    statusBox.classList.remove('error');
    statusBox.textContent = 'لا توجد منتجات مطابقة ضمن هذه المجموعة.';
    return;
  }

  statusBox.hidden = true;
  statusBox.classList.remove('error');
  grid.innerHTML = list.map(product => `
    <article class="product-card" data-product-card="${esc(product.id)}">
      <div class="product-head">
        <div><h3>${esc(product.name)}</h3><p class="model-label">${esc(product.model_label || product.model)} <span>· ${esc(product.brand)}</span></p></div>
        <span class="width-badge">عرض ${Number(product.width_cm)} سم</span>
      </div>
      <p class="product-description">${esc(product.description)}</p>
      <div class="technical-details">
        <p><strong>النوع:</strong> ${esc(product.type)}</p>
        <p><strong>الخامة:</strong> ${esc(product.material)}</p>
        <p><strong>التصميم:</strong> ${esc(product.design)}</p>
      </div>
      <a class="main-image-link" href="${esc(productPageUrl(product.id, 0))}" aria-label="عرض تفاصيل ${esc(product.display_name || product.model)}">
        ${imageHTML(product.main_image, product.name + ' - الصورة الرئيسية', 'main-product-image')}
      </a>
      <p class="product-description"><strong>اختر اللون لعرض تفاصيله وصوره:</strong></p>
      <div class="color-list">
        ${(product.colors || []).map((color, index) => `
          <div class="color-item ${index === 0 ? 'selected' : ''}" data-color="${index}">
            <a class="color-link" href="${esc(productPageUrl(product.id, index))}" aria-label="عرض موديل ${esc(product.model_label || product.model)} بلون ${esc(color.name)}">
              ${imageHTML(color.images[0], product.name + ' - ' + color.name, 'color-preview')}
              <span class="color-name">${esc(color.name)}</span>
            </a>
            <div class="color-meta"><button class="photo-button" type="button" data-gallery-product="${esc(product.id)}" data-gallery-color="${index}">عرض الصور (${color.images.length})</button></div>
          </div>
        `).join('')}
      </div>
      <span class="availability">${esc(product.availability || 'متوفر')} ✓</span>
      <div class="product-actions"><button type="button" class="whatsapp-button" data-whatsapp-product="${esc(product.id)}">💬 اسأل عن السعر على واتساب</button></div>
    </article>
  `).join('');
}

function openGallery(productId, colorIndex) {
  const product = products.find(item => item.id === productId);
  const color = product?.colors?.[colorIndex];
  if (!product || !color || !Array.isArray(color.images) || !color.images.length) return;
  activeGallery = color.images;
  activeImageIndex = 0;
  dialogTitle.textContent = `${product.model_label || product.model} — ${color.name}`;
  dialogSubtitle.textContent = `عرض الخامة: ${product.width_cm} سم`;
  updateGallery();
  if (typeof imageDialog.showModal === 'function') imageDialog.showModal();
  else window.open(activeGallery[0], '_blank', 'noopener,noreferrer');
}

function updateGallery() {
  dialogImage.onerror = () => {
    dialogImage.onerror = null;
    dialogImage.alt = 'تعذر العثور على الصورة؛ راجع اسم الملف داخل مجلد images.';
  };
  dialogImage.src = activeGallery[activeImageIndex];
  dialogImage.alt = `${dialogTitle.textContent} — الصورة ${activeImageIndex + 1}`;
  dialogDots.innerHTML = activeGallery.map((_, index) => `
    <button type="button" class="dialog-dot ${index === activeImageIndex ? 'active' : ''}"
      data-dot="${index}" aria-label="عرض الصورة ${index + 1}" aria-current="${index === activeImageIndex ? 'true' : 'false'}"></button>
  `).join('');
}

function moveGallery(step) {
  if (!activeGallery.length) return;
  activeImageIndex = (activeImageIndex + step + activeGallery.length) % activeGallery.length;
  updateGallery();
}

function openWhatsAppManager(productId) {
  activeProduct = products.find(item => item.id === productId);
  if (!activeProduct) return;
  const selectedLink = grid.querySelector(`[data-product-card="${CSS.escape(productId)}"] .color-item.selected`);
  activeColor = activeProduct.colors[0];
  if (selectedLink) {
    const cardColorIndex = Number(selectedLink.dataset.color);
    if (activeProduct.colors[cardColorIndex]) activeColor = activeProduct.colors[cardColorIndex];
  }
  if (typeof managerDialog.showModal === 'function') managerDialog.showModal();
  else alert('يرجى فتح الموقع في متصفح حديث لاختيار مدير المبيعات.');
}

function contactManager(managerId) {
  if (!activeProduct || !activeColor) return;
  const manager = (activeProduct.whatsapp_managers || []).find(item => item.id === managerId);
  if (!manager || !manager.phone) {
    alert('بيانات واتساب لهذا المدير غير متاحة. لم يتم استخدام رقم بديل.');
    return;
  }
  const exactProductName = activeProduct.whatsapp_product_name || activeProduct.name;
  const message = `مرحبًا، أريد معرفة سعر ${exactProductName} – المقاس: عرض ${activeProduct.width_cm} سم – اللون: ${activeColor.name}.`;
  const url = `https://wa.me/${manager.phone}?text=${encodeURIComponent(message)}`;
  if (managerDialog.open) managerDialog.close();
  window.open(url, '_blank', 'noopener,noreferrer');
}

branchList.addEventListener('click', event => {
  const button = event.target.closest('[data-branch]');
  if (!button) return;
  selectedBranch = button.dataset.branch;
  renderBranches();
  renderProducts();
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

searchInput.addEventListener('input', event => {
  searchTerm = event.target.value.trim();
  renderProducts();
});

grid.addEventListener('click', event => {
  const galleryButton = event.target.closest('[data-gallery-product]');
  if (galleryButton) {
    event.preventDefault();
    event.stopPropagation();
    openGallery(galleryButton.dataset.galleryProduct, Number(galleryButton.dataset.galleryColor));
    return;
  }
  const contactButton = event.target.closest('[data-whatsapp-product]');
  if (contactButton) openWhatsAppManager(contactButton.dataset.whatsappProduct);
});

document.getElementById('dialog-close').addEventListener('click', () => imageDialog.close());
document.getElementById('prev-image').addEventListener('click', () => moveGallery(-1));
document.getElementById('next-image').addEventListener('click', () => moveGallery(1));
dialogDots.addEventListener('click', event => {
  const button = event.target.closest('[data-dot]');
  if (!button) return;
  activeImageIndex = Number(button.dataset.dot);
  updateGallery();
});
imageDialog.addEventListener('click', event => { if (event.target === imageDialog) imageDialog.close(); });
document.getElementById('manager-close').addEventListener('click', () => managerDialog.close());
managerDialog.querySelectorAll('[data-manager]').forEach(button => {
  button.addEventListener('click', () => contactManager(button.dataset.manager));
});
managerDialog.addEventListener('click', event => { if (event.target === managerDialog) managerDialog.close(); });
document.addEventListener('keydown', event => {
  if (!imageDialog.open) return;
  if (event.key === 'ArrowLeft') moveGallery(1);
  if (event.key === 'ArrowRight') moveGallery(-1);
});

async function loadData() {
  try {
    const [productsResponse, branchesResponse] = await Promise.all([
      fetch(PRODUCTS_URL, { cache: 'no-store' }),
      fetch(BRANCHES_URL, { cache: 'no-store' })
    ]);
    if (!productsResponse.ok) throw new Error(`تعذر تحميل products.json (${productsResponse.status})`);
    if (!branchesResponse.ok) throw new Error(`تعذر تحميل branches.json (${branchesResponse.status})`);
    const [productsData, branchesData] = await Promise.all([productsResponse.json(), branchesResponse.json()]);
    products = Array.isArray(productsData.products) ? productsData.products : [];
    branches = Array.isArray(branchesData.branches) ? branchesData.branches : [];
    selectedBranch = branches[0]?.id || '';
    if (!products.length) throw new Error('لا توجد منتجات في ملف البيانات.');
    renderBranches();
    renderProducts();
  } catch (error) {
    statusBox.hidden = false;
    statusBox.classList.add('error');
    statusBox.textContent = 'تعذر تحميل بيانات المنتجات. شغّل المشروع من خادم محلي داخل Acode أو انشره على GitHub Pages/Vercel؛ فتح index.html مباشرة عبر file:// قد يمنع fetch من قراءة ملفات JSON.';
    console.error('Catalog loading failed:', error);
  }
}

loadData();
