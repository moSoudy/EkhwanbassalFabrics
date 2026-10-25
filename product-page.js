'use strict';

const params = new URLSearchParams(window.location.search);
const productId = params.get('product');
let chosenColorIndex = Math.max(0, Number.parseInt(params.get('color') || '0', 10) || 0);
let product = null;
let currentImage = '';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function showError(message) {
  $('detail-status').hidden = false;
  $('detail-status').classList.add('error');
  $('detail-status').textContent = message;
  $('detail-product').hidden = true;
}

function setColor(index, updateAddress = true) {
  if (!product || !product.colors[index]) return;
  chosenColorIndex = index;
  const color = product.colors[chosenColorIndex];
  currentImage = color.images[0];
  $('detail-main-image').src = currentImage;
  $('detail-main-image').alt = `${product.name} - اللون ${color.name}`;
  $('detail-thumbnails').innerHTML = color.images.map((src, imageIndex) => `
    <button type="button" class="detail-thumbnail ${imageIndex === 0 ? 'active' : ''}"
      data-image-index="${imageIndex}" aria-label="الصورة ${imageIndex + 1}">
      <img src="${esc(src)}" alt="${esc(color.name)} - الصورة ${imageIndex + 1}" loading="lazy">
    </button>
  `).join('');
  $('detail-colors').innerHTML = product.colors.map((item, colorIndex) => `
    <button type="button" class="detail-color ${colorIndex === chosenColorIndex ? 'active' : ''}"
      data-color-index="${colorIndex}" aria-pressed="${colorIndex === chosenColorIndex}">${esc(item.name)}</button>
  `).join('');
  if (updateAddress) {
    const url = new URL(window.location.href);
    url.searchParams.set('product', product.id);
    url.searchParams.set('color', String(chosenColorIndex));
    window.history.replaceState({ product: product.id, color: chosenColorIndex }, '', url);
  }
}

async function init() {
  if (!productId) {
    showError('لم يتم تحديد المنتج. ارجع إلى الكتالوج واختر لونًا لفتح صفحة التفاصيل.');
    return;
  }
  try {
    const response = await fetch('data/products.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    product = (data.products || []).find(item => item.id === productId);
    if (!product) throw new Error('المنتج غير موجود في ملف البيانات.');
    chosenColorIndex = Math.min(chosenColorIndex, product.colors.length - 1);
    $('detail-status').hidden = true;
    $('detail-product').hidden = false;
    document.title = `${product.name} | ${product.model_label || product.model} | إخوان بصل`;
    $('detail-name').textContent = product.name;
    $('detail-model').textContent = `${product.model_label || product.model} · العلامة التجارية: ${product.brand}`;
    $('detail-width').textContent = `عرض ${product.width_cm} سم`;
    $('detail-description').textContent = product.description;
    $('detail-tech').innerHTML = `
      <p><strong>النوع:</strong> ${esc(product.type)}</p>
      <p><strong>الخامة:</strong> ${esc(product.material)}</p>
      <p><strong>التصميم:</strong> ${esc(product.design)}</p>
      <p><strong>المصنع:</strong> ${esc(product.brand)}</p>`;
    setColor(chosenColorIndex, false);
  } catch (error) {
    console.error('Product page loading failed:', error);
    showError('تعذر تحميل تفاصيل المنتج. تأكد من تشغيل الموقع عبر خادم محلي أو الاستضافة، ومن وجود data/products.json وصحة رابط المنتج.');
  }
}

$('detail-product').addEventListener('click', event => {
  const thumbnail = event.target.closest('[data-image-index]');
  if (thumbnail) {
    const index = Number(thumbnail.dataset.imageIndex);
    const color = product?.colors[chosenColorIndex];
    if (!color || !color.images[index]) return;
    currentImage = color.images[index];
    $('detail-main-image').src = currentImage;
    $('detail-thumbnails').querySelectorAll('.detail-thumbnail').forEach((button, i) => button.classList.toggle('active', i === index));
    return;
  }
  const colorButton = event.target.closest('[data-color-index]');
  if (colorButton) setColor(Number(colorButton.dataset.colorIndex));
});

$('detail-main-image').addEventListener('click', () => {
  if (!currentImage) return;
  $('detail-large-image').src = currentImage;
  if (typeof $('detail-image-dialog').showModal === 'function') $('detail-image-dialog').showModal();
  else window.open(currentImage, '_blank', 'noopener,noreferrer');
});
$('detail-image-close').addEventListener('click', () => $('detail-image-dialog').close());
$('detail-image-dialog').addEventListener('click', event => { if (event.target === $('detail-image-dialog')) $('detail-image-dialog').close(); });
$('detail-whatsapp').addEventListener('click', () => $('detail-manager-dialog').showModal());
$('detail-manager-close').addEventListener('click', () => $('detail-manager-dialog').close());
$('detail-manager-dialog').addEventListener('click', event => { if (event.target === $('detail-manager-dialog')) $('detail-manager-dialog').close(); });

document.querySelectorAll('#detail-manager-dialog [data-manager]').forEach(button => {
  button.addEventListener('click', () => {
    if (!product) return;
    const manager = (product.whatsapp_managers || []).find(item => item.id === button.dataset.manager);
    if (!manager || !manager.phone) {
      alert('بيانات واتساب لهذا المدير غير متاحة. لم يتم استخدام رقم بديل.');
      return;
    }
    const color = product.colors[chosenColorIndex];
    const exactProductName = product.whatsapp_product_name || product.name;
    const message = `مرحبًا، أريد معرفة سعر ${exactProductName} – المقاس: عرض ${product.width_cm} سم – اللون: ${color.name}.`;
    const url = `https://wa.me/${manager.phone}?text=${encodeURIComponent(message)}`;
    $('detail-manager-dialog').close();
    window.open(url, '_blank', 'noopener,noreferrer');
  });
});

init();
