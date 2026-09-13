/* =========================================================
   STORAGE KEYS
   ========================================================= */
const LS = {
  cart:  'shop.cart.v1',
  draft: 'shop.admin.draft.v1',
  theme: 'shop.theme'
};

/* =========================================================
   FALLBACK DATA
   ========================================================= */
const DEFAULT_SETTINGS = {
  storeName: 'Drone Zone',
  tagline: 'Browse our stock and order in seconds.',
  whatsapp: '+96176199961',
  currency: '$',
  adminPass: 'admin123',
  footerNote: 'Orders are confirmed on WhatsApp. No payment is taken on this website.'
};

const SEED_PRODUCTS = [];

/* =========================================================
   STATE
   ========================================================= */
let settings       = Object.assign({}, DEFAULT_SETTINGS);
let products       = [];
let cart           = load(LS.cart, {});
let activeCategory = 'all';
let currentImage   = '';
let currentImages  = [];
let draftActive    = false;

/* Lightbox state */
let lbImages = [];
let lbIndex  = 0;
let lbName   = '';

/* =========================================================
   STORAGE HELPERS
   ========================================================= */
function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw === null) return JSON.parse(JSON.stringify(fallback));
    return JSON.parse(raw);
  }catch(e){ return JSON.parse(JSON.stringify(fallback)); }
}
function save(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e){ toast('Storage is full — try smaller images.'); return false; }
}

/* =========================================================
   THEME
   ========================================================= */
function initTheme(){
  if(!document.documentElement.getAttribute('data-theme')){
    const saved = localStorage.getItem(LS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
  }
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try{ localStorage.setItem(LS.theme, next); }catch(e){}
}

/* =========================================================
   IMAGE PATH HELPERS
   ========================================================= */
function basePathNow(){
  return window.location.pathname.replace(/\/[^/]*$/, '');
}
function addBase(path, basePath){
  return (path && path.startsWith('/')) ? basePath + path : path;
}
function stripBase(path, basePath){
  return (path && basePath && path.startsWith(basePath)) ? path.slice(basePath.length) : path;
}
function normalizeImages(p, basePath){
  const cover = addBase(p.image, basePath);
  const extras = Array.isArray(p.images)
    ? p.images.map(i => addBase(i, basePath)).filter(Boolean)
    : [];
  return Object.assign({}, p, { image: cover || '', images: extras });
}
function portableImages(p, basePath){
  const cover = stripBase(p.image, basePath);
  const extras = Array.isArray(p.images)
    ? p.images.map(i => stripBase(i, basePath)).filter(Boolean)
    : [];
  return Object.assign({}, p, { image: cover || '', images: extras });
}
function allImages(p){
  const list = [];
  if(p.image && !list.includes(p.image)) list.push(p.image);
  if(Array.isArray(p.images)){
    p.images.forEach(i => { if(i && !list.includes(i)) list.push(i); });
  }
  return list;
}

/* =========================================================
   DATA LOADING
   ========================================================= */
async function loadStoreData(){
  let remote = null;
  try{
    const res = await fetch('products.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    remote = await res.json();
  }catch(err){
    console.warn('Could not load products.json — using fallback data.', err);
  }

  const basePath = basePathNow();

  if(remote){
    settings = Object.assign({}, DEFAULT_SETTINGS, remote.settings || {});
    products = Array.isArray(remote.products) ? remote.products : [];
    products = products.map(p => normalizeImages(p, basePath));
  }else{
    settings = Object.assign({}, DEFAULT_SETTINGS, load('shop.settings.v1', {}));
    products = load('shop.products.v1', SEED_PRODUCTS);
    products = products.map(p => normalizeImages(p, basePath));
  }

  const draft = load(LS.draft, null);
  if(draft && Array.isArray(draft.products)){
    products = draft.products.map(p => normalizeImages(p, basePath));
    if(draft.settings) settings = Object.assign({}, DEFAULT_SETTINGS, draft.settings);
    draftActive = true;
  }
}

/* =========================================================
   HELPERS
   ========================================================= */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function money(n){
  const v = Number(n) || 0;
  return settings.currency + v.toFixed(2);
}
function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function placeholderStyle(name){
  let h = 0;
  const s = String(name || '?');
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) % 360;
  return `background:linear-gradient(135deg,hsl(${h} 45% 90%),hsl(${(h+45)%360} 45% 80%));`;
}
function mediaHtml(p){
  const imgs = allImages(p);
  if(imgs.length){
    return `<img src="${escapeHtml(imgs[0])}" alt="${escapeHtml(p.name)}" loading="lazy">`;
  }
  const initial = (String(p.name||'?').trim()[0] || '?').toUpperCase();
  return `<div class="ph" style="${placeholderStyle(p.name)}">${escapeHtml(initial)}</div>`;
}
let toastTimer;
function toast(msg){
  const el = $('#toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2400);
}

/* =========================================================
   LIGHTBOX
   ========================================================= */
function openLightbox(product){
  const imgs = allImages(product);
  if(!imgs.length) return;
  lbImages = imgs;
  lbIndex  = 0;
  lbName   = product.name;
  renderLightbox();
  $('#lightbox').classList.add('show');
  document.body.classList.add('locked');
}
function closeLightbox(){
  $('#lightbox').classList.remove('show');
  if(!$('#drawer').classList.contains('open')){
    document.body.classList.remove('locked');
  }
}
function renderLightbox(){
  const stage = $('#lbStage');
  if(!stage) return;
  const img = lbImages[lbIndex];
  stage.innerHTML = `<img src="${escapeHtml(img)}" alt="${escapeHtml(lbName)}">`;
  const multi = lbImages.length > 1;
  $('#lbCounter').textContent = multi ? `${lbIndex + 1} / ${lbImages.length}` : '';
  $('#lbPrev').style.display = multi ? '' : 'none';
  $('#lbNext').style.display = multi ? '' : 'none';
}
function lbStep(delta){
  if(!lbImages.length) return;
  lbIndex = (lbIndex + delta + lbImages.length) % lbImages.length;
  renderLightbox();
}

/* =========================================================
   RENDER — CHROME
   ========================================================= */
function renderChrome(){
  $('#brandName').textContent   = settings.storeName;
  $('#heroTitle').textContent   = settings.storeName;
  $('#heroTagline').textContent = settings.tagline || '';
  $('#footerNote').textContent  = settings.footerNote || '';
  document.title = settings.storeName + ' — Shop';

  let banner = $('#draftBanner');
  if(draftActive){
    if(!banner){
      banner = document.createElement('div');
      banner.id = 'draftBanner';
      banner.style.cssText =
        'background:#fff7e0;border-bottom:1px solid #f0e0a8;color:#7a5c00;' +
        'font-size:13px;padding:8px 16px;text-align:center;font-weight:600;';
      document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.textContent = 'You are viewing an unpublished local draft. ' +
                         'Publish via Admin → Export products.json.';
  }else if(banner){
    banner.remove();
  }
}

/* =========================================================
   RENDER — FILTERS
   ========================================================= */
function renderFilters(){
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const el = $('#filters');
  if(!cats.length){ el.innerHTML = ''; return; }
  el.innerHTML =
    `<button class="chip ${activeCategory==='all'?'active':''}" data-cat="all">All</button>` +
    cats.map(c =>
      `<button class="chip ${activeCategory===c?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join('');
  const catList = $('#catList');
  if(catList) catList.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
}

/* =========================================================
   RENDER — PRODUCT GRID
   ========================================================= */
function renderProducts(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const list = products.filter(p => {
    const hay = (p.name + ' ' + (p.desc||'') + ' ' + (p.category||'')).toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchC = activeCategory === 'all' || p.category === activeCategory;
    return matchQ && matchC;
  });

  const grid = $('#grid');
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">
      <strong>Nothing here yet</strong>
      ${products.length ? 'Try a different search or category.' : 'Add products in the Admin panel and export products.json.'}
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const soldOut = p.stock !== '' && p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0;
    const imgs = allImages(p);
    const multi = imgs.length > 1;

    const actionBtn = soldOut
      ? `<button class="btn small sold-out" disabled>Sold out</button>`
      : `<button class="btn primary small add-btn" data-add="${p.id}" aria-label="Add to cart" title="Add to cart">
           <svg class="icon-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="9" cy="21" r="1"></circle>
             <circle cx="20" cy="21" r="1"></circle>
             <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
           </svg>
           <span class="add-text">Add to cart</span>
         </button>`;

    return `
      <article class="card">
        <div class="card-media" ${imgs.length ? `data-open="${p.id}"` : ''}>
          ${mediaHtml(p)}
          ${soldOut ? '<span class="badge-out">Sold out</span>' : ''}
          ${multi ? `<span class="badge-count">${imgs.length} photos</span>` : ''}
        </div>
        <div class="card-body">
          ${p.category ? `<span class="chip-cat">${escapeHtml(p.category)}</span>` : ''}
          <h3>${escapeHtml(p.name)}</h3>
          ${p.desc ? `<p class="desc">${escapeHtml(p.desc)}</p>` : '<p class="desc"></p>'}
          <div class="card-foot">
            <span class="price">${money(p.price)}</span>
            ${actionBtn}
          </div>
        </div>
      </article>`;
  }).join('');
}

/* =========================================================
   CART
   ========================================================= */
function cartEntries(){
  return Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find(p => p.id === id), qty }))
    .filter(x => x.product);
}
function cartCount(){
  return cartEntries().reduce((n, x) => n + x.qty, 0);
}
function cartTotal(){
  return cartEntries().reduce((n, x) => n + x.product.price * x.qty, 0);
}
function addToCart(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const inCart = cart[id] || 0;
  const max = (p.stock === '' || p.stock === null || p.stock === undefined)
    ? Infinity : Number(p.stock);
  if(inCart + 1 > max){ toast('No more stock available'); return; }
  cart[id] = inCart + 1;
  save(LS.cart, cart);
  renderCart();
  toast(p.name + ' added to cart');
}
function setQty(id, qty){
  const p = products.find(x => x.id === id);
  if(!p) return;
  const max = (p.stock === '' || p.stock === null || p.stock === undefined)
    ? Infinity : Number(p.stock);
  qty = Math.max(0, Math.min(qty, max));
  if(qty === 0) delete cart[id];
  else cart[id] = qty;
  save(LS.cart, cart);
  renderCart();
}
function renderCart(){
  Object.keys(cart).forEach(id => {
    if(!products.find(p => p.id === id)) delete cart[id];
  });
  save(LS.cart, cart);

  const entries = cartEntries();
  const body = $('#cartItems');

  if(!entries.length){
    body.innerHTML = `<div class="cart-empty"><div class="big">🛒</div>Your cart is empty.<br>Add something you like!</div>`;
  }else{
    body.innerHTML = entries.map(({product:p, qty}) => `
      <div class="cart-item">
        <div class="ci-media">${mediaHtml(p)}</div>
        <div class="ci-info">
          <div class="ci-name">${escapeHtml(p.name)}</div>
          <div class="ci-price">${money(p.price)} each</div>
          <div class="qty">
            <button data-dec="${p.id}" aria-label="Decrease">−</button>
            <span>${qty}</span>
            <button data-inc="${p.id}" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="ci-right">
          <strong>${money(p.price * qty)}</strong>
          <button class="ci-remove" data-del="${p.id}">Remove</button>
        </div>
      </div>`).join('');
  }

  $('#cartTotal').textContent = money(cartTotal());
  $('#cartCount').textContent = cartCount();
  $('#orderBtn').disabled = entries.length === 0;
}

/* =========================================================
   WHATSAPP ORDER
   ========================================================= */
function buildOrderMessage(){
  const entries = cartEntries();
  const lines = [];
  lines.push(`*New order — ${settings.storeName}*`);
  lines.push('');
  let total = 0;
  entries.forEach(({product:p, qty}, i) => {
    const sub = p.price * qty;
    total += sub;
    lines.push(`${i+1}. ${p.name}`);
    lines.push(`    ${qty} × ${money(p.price)} = ${money(sub)}`);
  });
  lines.push('');
  lines.push(`*Total: ${money(total)}*`);

  const name = $('#custName').value.trim();
  const note = $('#custNote').value.trim();
  if(name){ lines.push(''); lines.push(`Name: ${name}`); }
  if(note){ lines.push(`Note: ${note}`); }
  return lines.join('\n');
}
function orderOnWhatsApp(){
  const entries = cartEntries();
  if(!entries.length){ toast('Your cart is empty'); return; }

  const digits = String(settings.whatsapp || '').replace(/[^\d]/g, '');
  if(!digits){
    toast('Set your WhatsApp number in products.json');
    return;
  }
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(buildOrderMessage())}`;
  window.open(url, '_blank');
}

/* =========================================================
   DRAWER
   ========================================================= */
function openCart(){
  $('#drawer').classList.add('open');
  $('#overlay').classList.add('show');
  document.body.classList.add('locked');
}
function closeCart(){
  $('#drawer').classList.remove('open');
  $('#overlay').classList.remove('show');
  if(!$('#lightbox').classList.contains('show')){
    document.body.classList.remove('locked');
  }
}

/* =========================================================
   ADMIN PANEL
   ========================================================= */
function openAdmin(){
  const pass = prompt('Enter admin password:');
  if(pass === null) return;
  if(pass !== settings.adminPass){ toast('Wrong password'); return; }
  $('#adminModal').classList.add('show');
  document.body.classList.add('locked');
  renderAdminList();
  fillSettingsForm();
}
function closeAdmin(){
  $('#adminModal').classList.remove('show');
  document.body.classList.remove('locked');
}

function saveDraft(){
  const basePath = basePathNow();
  const portable = products.map(p => portableImages(p, basePath));
  const ok = save(LS.draft, { settings, products: portable });
  if(ok){
    draftActive = true;
    renderChrome();
  }
}
function discardDraft(){
  localStorage.removeItem(LS.draft);
  draftActive = false;
  toast('Draft discarded — reloading…');
  setTimeout(() => location.reload(), 400);
}

function renderAdminList(){
  $('#adminCount').textContent = products.length;
  const list = $('#adminList');
  if(!products.length){
    list.innerHTML = `<div class="empty-state"><strong>No products yet</strong>Use the form above to add your first item.</div>`;
    return;
  }
  list.innerHTML = products.map(p => {
    const count = allImages(p).length;
    return `
    <div class="admin-row">
      <div class="thumb">${mediaHtml(p)}</div>
      <div class="meta">
        <b>${escapeHtml(p.name)}</b>
        <small>${money(p.price)}${p.category ? ' · ' + escapeHtml(p.category) : ''}${
          (p.stock === '' || p.stock === null || p.stock === undefined)
            ? ' · unlimited'
            : ' · ' + p.stock + ' in stock'
        }${count > 1 ? ' · ' + count + ' photos' : ''}</small>
      </div>
      <div class="acts">
        <button class="btn ghost small" data-edit="${p.id}">Edit</button>
        <button class="btn danger small" data-remove="${p.id}">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function clearProductForm(){
  $('#pId').value = '';
  $('#pName').value = '';
  $('#pPrice').value = '';
  $('#pCategory').value = '';
  $('#pStock').value = '';
  $('#pDesc').value = '';
  $('#pImageFile').value = '';
  $('#pImageUrl').value = '';
  currentImage = '';
  currentImages = [];
  renderPreview();
  renderExtraPreview();
  $('#pSaveBtn').textContent = 'Add product';
}
function renderPreview(){
  $('#pPreview').innerHTML = currentImage
    ? `<img src="${escapeHtml(currentImage)}" alt="preview"><span style="font-size:13px;color:var(--muted)">Cover ready</span>`
    : `<span style="font-size:13px;color:var(--muted)">No cover image selected — a coloured placeholder will be used.</span>`;
}
function renderExtraPreview(){
  const el = $('#pExtraPreview');
  if(!el) return;
  if(!currentImages.length){
    el.innerHTML = `<span style="font-size:13px;color:var(--muted)">No extra images yet.</span>`;
    return;
  }
  el.innerHTML = currentImages.map((src, i) =>
    `<div class="extra-thumb">
      <img src="${escapeHtml(src)}" alt="extra ${i+1}">
      <button type="button" class="extra-remove" data-remove-extra="${i}" aria-label="Remove">✕</button>
    </div>`
  ).join('');
}

function fillSettingsForm(){
  $('#sStoreName').value  = settings.storeName || '';
  $('#sCurrency').value   = settings.currency || '$';
  $('#sWhatsapp').value   = settings.whatsapp || '';
  $('#sTagline').value    = settings.tagline || '';
  $('#sFooterNote').value = settings.footerNote || '';
  $('#sAdminPass').value  = settings.adminPass || '';
}

function fileToDataUrl(file, maxSize = 900, quality = 0.82){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(1, maxSize / Math.max(width, height));
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('bad image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('read error'));
    reader.readAsDataURL(file);
  });
}

function exportProductsJson(){
  const basePath = basePathNow();
  const portable = products.map(p => portableImages(p, basePath));

  const payload = {
    settings: {
      storeName:  settings.storeName,
      tagline:    settings.tagline,
      whatsapp:   settings.whatsapp,
      currency:   settings.currency,
      footerNote: settings.footerNote,
      adminPass:  settings.adminPass
    },
    products: portable
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('products.json downloaded — commit it to your repo');
}
function importProductsJson(file){
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result);
      if(data.settings) settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
      const basePath = basePathNow();
      products = (Array.isArray(data.products) ? data.products : []).map(p =>
        normalizeImages(p, basePath)
      );
      saveDraft();
      renderChrome();
      renderFilters();
      renderProducts();
      renderAdminList();
      fillSettingsForm();
      toast('Imported into local draft');
    }catch(err){
      toast('That file could not be parsed');
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   EVENT WIRING
   ========================================================= */
function bindEvents(){

  /* theme */
  const themeToggle = $('#themeToggle');
  if(themeToggle) themeToggle.addEventListener('click', toggleTheme);

  /* search + filters */
  $('#searchInput').addEventListener('input', renderProducts);
  $('#filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if(!btn) return;
    activeCategory = btn.dataset.cat;
    renderFilters();
    renderProducts();
  });

  /* add to cart + open lightbox from grid */
  $('#grid').addEventListener('click', e => {
    const addBtn = e.target.closest('[data-add]');
    if(addBtn){ addToCart(addBtn.dataset.add); return; }

    const openBtn = e.target.closest('[data-open]');
    if(openBtn){
      const p = products.find(x => x.id === openBtn.dataset.open);
      if(p) openLightbox(p);
    }
  });

  /* lightbox controls */
  const lbClose = $('#lbClose');
  if(lbClose) lbClose.addEventListener('click', closeLightbox);
  const lbPrev = $('#lbPrev');
  if(lbPrev) lbPrev.addEventListener('click', () => lbStep(-1));
  const lbNext = $('#lbNext');
  if(lbNext) lbNext.addEventListener('click', () => lbStep(1));
  const lightbox = $('#lightbox');
  if(lightbox){
    lightbox.addEventListener('click', e => {
      if(e.target === lightbox) closeLightbox();
    });
  }

  /* cart drawer */
  $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#overlay').addEventListener('click', closeCart);

  /* cart item controls */
  $('#cartItems').addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const del = e.target.closest('[data-del]');
    if(inc) setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1);
    if(dec) setQty(dec.dataset.dec, (cart[dec.dataset.dec] || 0) - 1);
    if(del) setQty(del.dataset.del, 0);
  });

  /* order */
  $('#orderBtn').addEventListener('click', orderOnWhatsApp);

  /* admin open/close */
  const adminBtn = $('#adminOpenBtn');
  if(adminBtn) adminBtn.addEventListener('click', openAdmin);

  const closeAdminBtn = $('#closeAdmin');
  if(closeAdminBtn) closeAdminBtn.addEventListener('click', closeAdmin);

  const adminModal = $('#adminModal');
  if(adminModal){
    adminModal.addEventListener('click', e => {
      if(e.target === adminModal) closeAdmin();
    });
  }

  /* global keyboard */
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      if($('#lightbox').classList.contains('show')){ closeLightbox(); return; }
      closeCart();
      if($('#adminModal').classList.contains('show')) closeAdmin();
    }
    if($('#lightbox').classList.contains('show')){
      if(e.key === 'ArrowLeft')  lbStep(-1);
      if(e.key === 'ArrowRight') lbStep(1);
    }
  });

  /* admin tabs */
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.toggle('active', t === tab));
      const isProducts = tab.dataset.tab === 'products';
      $('#tab-products').classList.toggle('hidden', !isProducts);
      $('#tab-settings').classList.toggle('hidden', isProducts);
    });
  });

  /* product image inputs */
  $('#pImageFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if(!file) return;
    try{
      currentImage = await fileToDataUrl(file);
      $('#pImageUrl').value = '';
      renderPreview();
    }catch(err){
      toast('Could not read that image');
    }
  });
  $('#pImageUrl').addEventListener('input', e => {
    const v = e.target.value.trim();
    if(v){ currentImage = v; $('#pImageFile').value = ''; renderPreview(); }
  });

  /* extra image file input */
  const extraFileInput = $('#pExtraFiles');
  if(extraFileInput){
    extraFileInput.addEventListener('change', async e => {
      const files = Array.from(e.target.files || []);
      if(!files.length) return;
      for(const f of files){
        try{
          const url = await fileToDataUrl(f);
          currentImages.push(url);
        }catch(err){ /* skip bad file */ }
      }
      e.target.value = '';
      renderExtraPreview();
    });
  }
  const extraUrlInput = $('#pExtraUrl');
  if(extraUrlInput){
    extraUrlInput.addEventListener('keydown', e => {
      if(e.key !== 'Enter') return;
      e.preventDefault();
      const v = e.target.value.trim();
      if(!v) return;
      currentImages.push(v);
      e.target.value = '';
      renderExtraPreview();
    });
  }
  const extraPreview = $('#pExtraPreview');
  if(extraPreview){
    extraPreview.addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-extra]');
      if(!btn) return;
      currentImages.splice(Number(btn.dataset.removeExtra), 1);
      renderExtraPreview();
    });
  }

  /* product form submit */
  $('#productForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = $('#pId').value;
    const stockRaw = $('#pStock').value.trim();

    const data = {
      name:     $('#pName').value.trim(),
      price:    parseFloat($('#pPrice').value) || 0,
      category: $('#pCategory').value.trim(),
      stock:    stockRaw === '' ? '' : Math.max(0, parseInt(stockRaw, 10) || 0),
      desc:     $('#pDesc').value.trim(),
      image:    currentImage,
      images:   currentImages.slice()
    };
    if(!data.name){ toast('Please enter a product name'); return; }

    if(id){
      const idx = products.findIndex(p => p.id === id);
      if(idx > -1) products[idx] = Object.assign({}, products[idx], data);
      toast('Product updated');
    }else{
      products.unshift(Object.assign({ id: uid() }, data));
      toast('Product added');
    }

    saveDraft();
    clearProductForm();
    renderFilters();
    renderProducts();
    renderAdminList();
  });

  $('#pClearBtn').addEventListener('click', clearProductForm);

  /* admin list actions */
  $('#adminList').addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-remove]');

    if(editBtn){
      const p = products.find(x => x.id === editBtn.dataset.edit);
      if(!p) return;
      $('#pId').value       = p.id;
      $('#pName').value     = p.name;
      $('#pPrice').value    = p.price;
      $('#pCategory').value = p.category || '';
      $('#pStock').value    = (p.stock === '' || p.stock === null || p.stock === undefined)
        ? '' : p.stock;
      $('#pDesc').value     = p.desc || '';
      $('#pImageUrl').value = (p.image && !p.image.startsWith('data:')) ? p.image : '';
      currentImage = p.image || '';
      currentImages = Array.isArray(p.images) ? p.images.slice() : [];
      renderPreview();
      renderExtraPreview();
      $('#pSaveBtn').textContent = 'Save changes';
      $('#tab-products').scrollIntoView({ behavior:'smooth', block:'start' });
      $('#pName').focus();
    }

    if(delBtn){
      const p = products.find(x => x.id === delBtn.dataset.remove);
      if(!p) return;
      if(!confirm(`Delete "${p.name}"?`)) return;
      products = products.filter(x => x.id !== p.id);
      delete cart[p.id];
      save(LS.cart, cart);
      saveDraft();
      renderFilters();
      renderProducts();
      renderAdminList();
      renderCart();
      toast('Product deleted');
    }
  });

  /* settings form submit */
  $('#settingsForm').addEventListener('submit', e => {
    e.preventDefault();
    settings.storeName  = $('#sStoreName').value.trim() || 'Drone Zone';
    settings.currency   = $('#sCurrency').value.trim() || '$';
    settings.whatsapp   = $('#sWhatsapp').value.replace(/[^\d]/g, '');
    settings.tagline    = $('#sTagline').value.trim();
    settings.footerNote = $('#sFooterNote').value.trim();
    settings.adminPass  = $('#sAdminPass').value || 'admin123';

    saveDraft();
    renderChrome();
    renderProducts();
    renderCart();
    toast('Settings saved to draft');
  });

  /* export / import / discard buttons */
  const actionsRow = document.querySelector('#tab-settings .form-actions');
  if(actionsRow){
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'btn ghost';
    exportBtn.textContent = 'Export products.json';
    exportBtn.addEventListener('click', exportProductsJson);

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = 'application/json,.json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if(f) importProductsJson(f);
      importInput.value = '';
    });

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'btn ghost';
    importBtn.textContent = 'Import products.json';
    importBtn.addEventListener('click', () => importInput.click());

    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'btn danger';
    discardBtn.textContent = 'Discard local draft';
    discardBtn.addEventListener('click', () => {
      if(confirm('Discard all unpublished edits on this browser?')) discardDraft();
    });

    actionsRow.appendChild(exportBtn);
    actionsRow.appendChild(importBtn);
    actionsRow.appendChild(discardBtn);
    actionsRow.appendChild(importInput);
  }
}

/* =========================================================
   INIT
   ========================================================= */
async function init(){
  initTheme();
  await loadStoreData();
  renderChrome();
  renderFilters();
  renderProducts();
  renderCart();
  renderPreview();
  renderExtraPreview();
  bindEvents();

  if(new URLSearchParams(location.search).has('admin')){
    openAdmin();
  }
}
init();