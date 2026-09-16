/* =========================================================
   STORAGE KEYS
   ========================================================= */
const LS = {
  cart:  'shop.cart.v1',
  theme: 'shop.theme'
};

/* =========================================================
   FALLBACK DATA
   ========================================================= */
const DEFAULT_SETTINGS = {
  storeName: 'Drone Zone',
  tagline: 'Browse our stock and order in seconds.',
  whatsapp: '96176199961',
  currency: '$',
  footerNote: 'Orders are confirmed on WhatsApp. No payment is taken on this website.',
  categoryOrder: []
};

const SEED_PRODUCTS = [];

/* Common colour names → actual hex values */
const NAMED_COLORS = {
  black:'#1a1a1a', white:'#f5f5f5', red:'#d64545', blue:'#3a6fb0',
  green:'#3a9d6a', yellow:'#e0b429', orange:'#e08a3a', purple:'#8b5cf6',
  pink:'#e879a8', brown:'#8b5a3c', grey:'#8b8b9e', gray:'#8b8b9e',
  silver:'#c0c0c0', gold:'#d4af37', navy:'#1f3a68', teal:'#128c7e',
  cyan:'#29b6d8', magenta:'#d638a8', beige:'#e8ddc4', cream:'#f5efdc',
  maroon:'#7a1e1e', olive:'#6b7a1e', lime:'#a4d63a', coral:'#e87a5a',
  mint:'#8ee6b8', lavender:'#b0a4e8', turquoise:'#3ac8c4', violet:'#7a3ad6',
  indigo:'#4b3aa8', peach:'#f0b088', tan:'#c8a878', rose:'#e87a9a'
};

/* =========================================================
   STATE
   ========================================================= */
let settings       = Object.assign({}, DEFAULT_SETTINGS);
let products       = [];
let cart           = load(LS.cart, {});
let activeCategory = 'all';
let selectedColors = {};

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
  catch(e){ toast('Storage is full.'); return false; }
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
function basePathNow(){ return window.location.pathname.replace(/\/[^/]*$/, ''); }
function addBase(path, basePath){ return (path && path.startsWith('/')) ? basePath + path : path; }
function normalizeImages(p, basePath){
  const cover = addBase(p.image, basePath);
  const extras = Array.isArray(p.images)
    ? p.images.map(i => addBase(i, basePath)).filter(Boolean)
    : [];
  return Object.assign({}, p, { image: cover || '', images: extras });
}
function allImages(p){
  const list = [];
  if(p.image && !list.includes(p.image)) list.push(p.image);
  if(Array.isArray(p.images)) p.images.forEach(i => { if(i && !list.includes(i)) list.push(i); });
  return list;
}

/* =========================================================
   COLOUR HELPERS
   ========================================================= */
function normalizeColorList(colors){
  if(!Array.isArray(colors)) return [];
  return colors.map(c => {
    if(typeof c === 'string') return { name: c, hex: '' };
    if(c && typeof c === 'object' && c.name) return { name: String(c.name), hex: c.hex || '' };
    return null;
  }).filter(Boolean);
}
function colorSwatchStyle(c){
  if(c.hex) return `background:${c.hex}`;
  const name = String(c.name || '').toLowerCase().trim();
  if(NAMED_COLORS[name]) return `background:${NAMED_COLORS[name]}`;
  for(const word of name.split(/\s+/)){
    if(NAMED_COLORS[word]) return `background:${NAMED_COLORS[word]}`;
  }
  let h = 0;
  const s = c.name || '?';
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) % 360;
  return `background:hsl(${h} 55% 55%)`;
}
function findColor(p, name){
  return normalizeColorList(p.colors).find(c => c.name === name) || null;
}

/* =========================================================
   CART KEY HELPERS
   ========================================================= */
function cartKey(id, color){ return color ? id + '::' + color : id; }
function parseCartKey(key){
  const i = key.indexOf('::');
  return i === -1 ? { id: key, color: '' } : { id: key.slice(0, i), color: key.slice(i + 2) };
}

/* =========================================================
   PHONE / WHATSAPP HELPERS
   ========================================================= */
function whatsappDigits(){
  return String(settings.whatsapp || '').replace(/[^\d]/g, '');
}
function formatPhoneDisplay(digits){
  if(!digits) return '';
  if(digits.startsWith('961') && digits.length === 11){
    return `+961 ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8)}`;
  }
  return '+' + digits;
}
function whatsappUrl(message){
  const digits = whatsappDigits();
  if(!digits) return '';
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
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
  const hydrate = (p) => {
    const n = normalizeImages(p, basePath);
    n.colors = normalizeColorList(p.colors);
    return n;
  };

  if(remote){
    settings = Object.assign({}, DEFAULT_SETTINGS, remote.settings || {});
    if(!Array.isArray(settings.categoryOrder)) settings.categoryOrder = [];
    products = Array.isArray(remote.products) ? remote.products.map(hydrate) : [];
  }else{
    settings = Object.assign({}, DEFAULT_SETTINGS);
    products = SEED_PRODUCTS.map(hydrate);
  }
}

/* =========================================================
   HELPERS
   ========================================================= */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

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
   CATEGORY ORDER
   ========================================================= */
function orderedCategories(){
  const allCats = [...new Set(products.map(p => p.category).filter(Boolean))];
  const preferred = (Array.isArray(settings.categoryOrder) ? settings.categoryOrder : [])
    .map(c => String(c).trim())
    .filter(c => c && allCats.includes(c));
  const rest = allCats.filter(c => !preferred.includes(c)).sort();
  return [...preferred, ...rest];
}
function categoryRank(cat){
  const order = Array.isArray(settings.categoryOrder) ? settings.categoryOrder : [];
  const i = order.indexOf(cat);
  return i === -1 ? order.length : i;
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
  if(!$('#drawer').classList.contains('open')) document.body.classList.remove('locked');
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
   RENDER — FOOTER CONTACT + DRAWER HINT
   ========================================================= */
function renderContact(){
  const digits = whatsappDigits();
  const el = $('#footerContact');
  if(el){
    if(digits){
      const display = formatPhoneDisplay(digits);
      const url = whatsappUrl('Hi! I have a question about your stock.');
      el.innerHTML = `Questions? Message us on WhatsApp: <a href="${url}" target="_blank" rel="noopener">${display}</a>`;
    }else{
      el.textContent = '';
    }
  }
  const hint = $('#drawerHint');
  if(hint){
    if(digits){
      const url = whatsappUrl('Hi! I have a question about your stock.');
      hint.innerHTML = `No payment here — we confirm everything on WhatsApp.<br>Questions? <a href="${url}" target="_blank" rel="noopener">Message us</a>`;
    }else{
      hint.textContent = 'No payment here — we confirm everything on WhatsApp.';
    }
  }
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
  renderContact();
}

/* =========================================================
   RENDER — FILTERS
   ========================================================= */
function renderFilters(){
  const cats = orderedCategories();
  const el = $('#filters');
  if(!cats.length){ el.innerHTML = ''; return; }
  el.innerHTML =
    `<button class="chip ${activeCategory==='all'?'active':''}" data-cat="all">All</button>` +
    cats.map(c =>
      `<button class="chip ${activeCategory===c?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join('');
}

/* =========================================================
   RENDER — PRODUCT GRID
   ========================================================= */
function renderProducts(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const list = products
    .filter(p => {
      const hay = (p.name + ' ' + (p.desc||'') + ' ' + (p.category||'')).toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchC = activeCategory === 'all' || p.category === activeCategory;
      return matchQ && matchC;
    })
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));

  const grid = $('#grid');
  if(!list.length){
    grid.innerHTML = `<div class="empty-state">
      <strong>Nothing here yet</strong>
      ${products.length ? 'Try a different search or category.' : 'Add products through the CMS to see them here.'}
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const soldOut = p.stock !== '' && p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0;
    const imgs = allImages(p);
    const multi = imgs.length > 1;
    const colors = p.colors || [];

    let picker = '';
    if(colors.length > 1){
      const selected = selectedColors[p.id] || colors[0].name;
      selectedColors[p.id] = selected;
      picker = `
        <div class="color-picker" data-product="${p.id}">
          <span class="cp-label">Colour:</span>
          ${colors.map(c => {
            const active = c.name === selected;
            return `<button type="button" class="color-dot ${active?'active':''}"
                       data-color="${escapeHtml(c.name)}"
                       style="${colorSwatchStyle(c)}"
                       title="${escapeHtml(c.name)}"
                       aria-label="${escapeHtml(c.name)}"
                       aria-pressed="${active}"></button>`;
          }).join('')}
        </div>`;
    }

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
          ${picker}
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
    .map(([key, qty]) => {
      const { id, color } = parseCartKey(key);
      const product = products.find(p => p.id === id);
      if(!product) return null;
      return { key, product, color, qty };
    })
    .filter(Boolean);
}
function cartCount(){
  return cartEntries().reduce((n, x) => n + x.qty, 0);
}
function cartTotal(){
  return cartEntries().reduce((n, x) => n + x.product.price * x.qty, 0);
}
function stockLimit(p){
  return (p.stock === '' || p.stock === null || p.stock === undefined) ? Infinity : Number(p.stock);
}
function addToCart(id){
  const p = products.find(x => x.id === id);
  if(!p) return;

  const colors = p.colors || [];
  const color = colors.length ? (selectedColors[id] || colors[0].name) : '';
  const key = cartKey(id, color);

  const inCart = cart[key] || 0;
  if(inCart + 1 > stockLimit(p)){ toast('No more stock available'); return; }

  cart[key] = inCart + 1;
  save(LS.cart, cart);
  renderCart();
  toast(color ? `${p.name} (${color}) added` : `${p.name} added to cart`);
}
function setQty(key, qty){
  const parsed = parseCartKey(key);
  const p = products.find(x => x.id === parsed.id);
  if(!p) return;
  qty = Math.max(0, Math.min(qty, stockLimit(p)));
  if(qty === 0) delete cart[key];
  else cart[key] = qty;
  save(LS.cart, cart);
  renderCart();
}
function renderCart(){
  Object.keys(cart).forEach(key => {
    const { id } = parseCartKey(key);
    if(!products.find(p => p.id === id)) delete cart[key];
  });
  save(LS.cart, cart);

  const entries = cartEntries();
  const body = $('#cartItems');

  if(!entries.length){
    body.innerHTML = `<div class="cart-empty"><div class="big">🛒</div>Your cart is empty.<br>Add something you like!</div>`;
  }else{
    body.innerHTML = entries.map(({key, product:p, color, qty}) => {
      const colorMeta = color ? findColor(p, color) : null;
      const swatchStyle = colorMeta ? colorSwatchStyle(colorMeta) : '';
      return `
        <div class="cart-item">
          <div class="ci-media">${mediaHtml(p)}</div>
          <div class="ci-info">
            <div class="ci-name">${escapeHtml(p.name)}</div>
            ${color ? `<div class="ci-color"><span class="swatch" style="${swatchStyle}"></span>${escapeHtml(color)}</div>` : ''}
            <div class="ci-price">${money(p.price)} each</div>
            <div class="qty">
              <button data-dec="${escapeHtml(key)}" aria-label="Decrease">−</button>
              <span>${qty}</span>
              <button data-inc="${escapeHtml(key)}" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="ci-right">
            <strong>${money(p.price * qty)}</strong>
            <button class="ci-remove" data-del="${escapeHtml(key)}">Remove</button>
          </div>
        </div>`;
    }).join('');
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
  entries.forEach(({product:p, color, qty}, i) => {
    const sub = p.price * qty;
    total += sub;
    lines.push(`${i+1}. ${p.name}`);
    if(color) lines.push(`    Colour: ${color}`);
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

  const url = whatsappUrl(buildOrderMessage());
  if(!url){ toast('WhatsApp number is not configured'); return; }
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
  if(!$('#lightbox').classList.contains('show')) document.body.classList.remove('locked');
}

/* =========================================================
   EVENT WIRING
   ========================================================= */
function bindEvents(){

  const themeToggle = $('#themeToggle');
  if(themeToggle) themeToggle.addEventListener('click', toggleTheme);

  $('#searchInput').addEventListener('input', renderProducts);
  $('#filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if(!btn) return;
    activeCategory = btn.dataset.cat;
    renderFilters();
    renderProducts();
  });

  $('#grid').addEventListener('click', e => {
    const dot = e.target.closest('.color-dot');
    if(dot){
      const pid = dot.closest('[data-product]').dataset.product;
      selectedColors[pid] = dot.dataset.color;
      const picker = dot.closest('.color-picker');
      picker.querySelectorAll('.color-dot').forEach(d => {
        const on = d === dot;
        d.classList.toggle('active', on);
        d.setAttribute('aria-pressed', on);
      });
      return;
    }

    const addBtn = e.target.closest('[data-add]');
    if(addBtn){ addToCart(addBtn.dataset.add); return; }

    const openBtn = e.target.closest('[data-open]');
    if(openBtn){
      const p = products.find(x => x.id === openBtn.dataset.open);
      if(p) openLightbox(p);
    }
  });

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

  $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#overlay').addEventListener('click', closeCart);

  $('#cartItems').addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const del = e.target.closest('[data-del]');
    if(inc){
      const k = inc.dataset.inc;
      setQty(k, (cart[k] || 0) + 1);
    }
    if(dec){
      const k = dec.dataset.dec;
      setQty(k, (cart[k] || 0) - 1);
    }
    if(del) setQty(del.dataset.del, 0);
  });

  $('#orderBtn').addEventListener('click', orderOnWhatsApp);

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      if($('#lightbox').classList.contains('show')){ closeLightbox(); return; }
      closeCart();
    }
    if($('#lightbox').classList.contains('show')){
      if(e.key === 'ArrowLeft')  lbStep(-1);
      if(e.key === 'ArrowRight') lbStep(1);
    }
  });
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
  bindEvents();
}
init();
