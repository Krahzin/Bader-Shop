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
  /* Recoloured copies ("...-grey", "...-orange") are hidden: only the first colour-named photo is shown */
  const names = (p.colors || []).map(c => c && c.name ? c.name : c);
  let seen = false;
  return list.filter(src => {
    if(!names.some(n => fileHasColor(src, n))) return true;
    if(seen) return false;
    return seen = true;
  });
}

/* Photo that matches a colour, picked from the file name
   (e.g. "...-grey.webp" for Grey). Falls back to the main photo. */
const COLOR_ALIASES = { grey:['grey','gray'], gray:['grey','gray'] };
function colorWords(name){ const n = String(name || '').toLowerCase().trim(); return COLOR_ALIASES[n] || [n]; }
function fileHasColor(src, name){
  const file = decodeURIComponent(String(src).split('/').pop()).toLowerCase();
  return colorWords(name).some(w => file.split(/[-_ .]/).includes(w));
}
function colorImage(p, colorName){
  const imgs = allImages(p);
  return imgs[0] || '';
}
function mainPhotoColor(p){
  const imgs = allImages(p);
  const c = (p.colors || []).find(c => imgs[0] && fileHasColor(imgs[0], c.name));
  return c ? c.name : '';
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
function mediaHtml(p, src){
  const imgs = allImages(p);
  if(imgs.length){
    return `<img src="${escapeHtml(src || imgs[0])}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async">`;
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
function openLightbox(product, startSrc){
  const imgs = allImages(product);
  if(!imgs.length) return;
  lbImages = imgs;
  lbIndex  = Math.max(0, imgs.indexOf(startSrc));
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
  ensureReviewUi();
  const fc = $('#footerContact');
  if(fc && !$('#policies')){
    const pol = document.createElement('p');
    pol.id = 'policies';
    pol.textContent = 'Shipping available across Lebanon. Returns: contact us on WhatsApp.';
    fc.after(pol);
  }
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
  // keep the SEO title from index.html
  renderContact();
}

/* =========================================================
   RENDER — FILTERS
   ========================================================= */
const DRONE_CAT = 'Drones';
let activeTab = 'drones', menuOpen = false;
function catGroup(c){
  if(/mini/i.test(c)) return 'DJI Mini';
  if(/neo/i.test(c)) return 'DJI Neo';
  if(/avata/i.test(c)) return 'DJI Avata';
  return 'More';
}
function catLabel(c){ return c.replace(/^DJI\s+/i,'').replace(/\s*\/\s*/g,' / '); }
/* MODEL LANDING PAGES: /?model=dji-mini-4-pro */
let activeModel = null;
/* Drones with their own page: clicking the drone card opens it */
const STATIC_MODEL_PAGES = { 'dji-mini-4-pro': 'dji-mini-4-pro-lebanon.html' };
const productPage = p => p.category === DRONE_CAT ? STATIC_MODEL_PAGES[slugify(p.name)] : '';
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const usd = n => '$' + (Number(n) || 0).toLocaleString('en-US');
function modelProducts(c){
  const k = catLabel(c).split('/')[0].trim().toLowerCase();
  return products.filter(p => p.category === c || (p.category === DRONE_CAT && p.name.toLowerCase().includes(k)))
    .sort((a, b) => isOut(a) - isOut(b) || (a.category !== DRONE_CAT) - (b.category !== DRONE_CAT));
}
function isOut(p){ return p.stock !== '' && p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0; }
function setMeta(sel, attr, val){ const el = document.querySelector(sel); if(el) el.setAttribute(attr, val); }
function applyModelSeo(){
  if(!activeModel) return;
  const name = activeModel.replace(/\s*\/\s*/g, ' / ');
  const list = modelProducts(activeModel);
  const drone = list.find(p => p.category === DRONE_CAT && slugify(p.name) === slugify(activeModel));
  const acc = list.filter(p => p.category !== DRONE_CAT).length;
  const url = STATIC_MODEL_PAGES[slugify(activeModel)] ? 'https://dronezonelb.com/' + STATIC_MODEL_PAGES[slugify(activeModel)] : 'https://dronezonelb.com/?model=' + slugify(activeModel);
  const title = drone ? `${name} Lebanon – ${usd(drone.price)} | Drone Zone` : `${name} Accessories Lebanon | Drone Zone`;
  const desc = `${name} in Lebanon${drone ? ' for ' + usd(drone.price) : ''}` + (acc ? ` plus ${acc} accessories: cases, stands, guards and more.` : '.') + ' Delivery across Lebanon, order on WhatsApp.';
  document.title = title;
  setMeta('meta[name=description]', 'content', desc);
  setMeta('link[rel=canonical]', 'href', url);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc);
  $('#heroTitle').textContent = `${name} in Lebanon`;
  $('#heroTagline').textContent = desc;
}
function renderFilters(){
  const el = $('#filters');
  const accCats = [...new Set(products.map(p => p.category).filter(c => c && c !== DRONE_CAT))]
    .sort((a,b) => (a==='Other') - (b==='Other') || a.localeCompare(b, undefined, {numeric:true}));
  const groups = ['DJI Mini','DJI Neo','DJI Avata','More']
    .map(g => [g, accCats.filter(c => catGroup(c) === g)]).filter(g => g[1].length);
  const sel = activeCategory === 'all' ? 'All drones' : catLabel(activeCategory);
  el.innerHTML =
    `<div class="tabs"><button class="tab ${activeTab==='drones'?'active':''}" data-tab="drones">Drones</button>` +
    `<button class="tab ${activeTab==='acc'?'active':''}" data-tab="acc">Accessories</button></div>` +
    (activeTab === 'acc' ? `<div class="model-pick"><button class="model-btn" data-menu="1" aria-expanded="${menuOpen}">` +
      `<span class="model-btn-lbl">Choose your drone</span><strong>${escapeHtml(sel)}</strong><span class="caret">▾</span></button>` +
      (menuOpen ? `<div class="model-menu"><div class="mm-col"><h4>Show</h4><button class="mm-it ${activeCategory==='all'?'active':''}" data-cat="all">All accessories</button></div>` +
        groups.map(([g, cs]) => `<div class="mm-col"><h4>${g}</h4>` +
          cs.map(c => `<button class="mm-it ${activeCategory===c?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(catLabel(c))}</button>`).join('') + `</div>`).join('') +
      `</div>` : '') + `</div>` : '');
}

/* =========================================================
   RENDER — PRODUCT GRID
   ========================================================= */
function renderProducts(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const list = (activeModel && !q) ? modelProducts(activeModel) : products
    .filter(p => {
      const hay = (p.name + ' ' + (p.desc||'') + ' ' + (p.category||'')).toLowerCase();
      const matchQ = !q || hay.includes(q);
      const inTab = activeTab === 'drones' ? p.category === DRONE_CAT : p.category !== DRONE_CAT;
      const matchC = q ? true : inTab && (activeTab === 'drones' || activeCategory === 'all' || p.category === activeCategory);
      return matchQ && matchC;
    })
    .sort((a, b) => isOut(a) - isOut(b) || categoryRank(a.category) - categoryRank(b.category));

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
      const selected = selectedColors[p.id] || mainPhotoColor(p) || colors[0].name;
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
      ? `<button class="btn small sold-out" disabled>Out of stock</button>`
      : `<button class="btn primary small add-btn" data-add="${p.id}" aria-label="Add to cart" title="Add to cart">
           <svg class="icon-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="9" cy="21" r="1"></circle>
             <circle cx="20" cy="21" r="1"></circle>
             <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
           </svg>
           <span class="add-text">Add to cart</span>
         </button>`;

    const page = productPage(p);
    return `
      <article class="card">
        <${page ? `a href="${page}"` : 'div'} class="card-media" ${!page && imgs.length ? `data-open="${p.id}"` : ''}>
          ${mediaHtml(p, selectedColors[p.id] ? colorImage(p, selectedColors[p.id]) : '')}
          ${soldOut ? '<span class="badge-out">Out of stock</span>' : ''}
          ${multi ? `<span class="badge-count">${imgs.length} photos</span>` : ''}
        </${page ? 'a' : 'div'}>
        <div class="card-body">
          ${p.category ? `<span class="chip-cat">${escapeHtml(p.category)}</span>` : ''}
          <h3>${page ? `<a href="${page}" class="card-link">${escapeHtml(p.name)}</a>` : escapeHtml(p.name)}</h3>
          ${reviewLineHtml(p)}
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
          <div class="ci-media">${mediaHtml(p, color ? colorImage(p, color) : '')}</div>
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
    const tab = e.target.closest('[data-tab]'), menu = e.target.closest('[data-menu]'), btn = e.target.closest('[data-cat]');
    if(tab){ activeTab = tab.dataset.tab; activeCategory = 'all'; menuOpen = false; }
    else if(menu){ menuOpen = !menuOpen; }
    else if(btn){ activeCategory = btn.dataset.cat; menuOpen = false; }
    else return;
    activeModel = null;
    e.stopPropagation();
    renderFilters();
    if(!menu) renderProducts();
  });
  document.addEventListener('click', e => {
    if(menuOpen && !e.target.closest('#filters')){ menuOpen = false; renderFilters(); }
  });

  $('#grid').addEventListener('click', e => {
    const dot = e.target.closest('.color-dot');
    if(dot){
      const pid = dot.closest('[data-product]').dataset.product;
      selectedColors[pid] = dot.dataset.color;
      const prod = products.find(x => x.id === pid);
      const cardImg = dot.closest('.card') && dot.closest('.card').querySelector('.card-media img');
      if(prod && cardImg){
        const src = colorImage(prod, dot.dataset.color);
        if(src && cardImg.getAttribute('src') !== src) cardImg.setAttribute('src', src);
      }
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
      const shown = openBtn.querySelector('img');
      if(p) openLightbox(p, shown ? shown.getAttribute('src') : '');
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
   REVIEWS — only approved reviews show on the site.
   New reviews arrive on WhatsApp. To approve one, add it here:
   '<product id>': [ { name:'Ali', rating:5, text:'Great quality', date:'2026-10-07' } ],
   ========================================================= */
const APPROVED_REVIEWS = {
};
const REVIEW_FORM_ENABLED = false; // turn on once the review queue is live
function reviewsFor(id){ return (APPROVED_REVIEWS[String(id)] || []).filter(r => r && r.name && Number(r.rating)); }
function avgRating(revs){ return revs.reduce((s, r) => s + Number(r.rating), 0) / revs.length; }
function starsText(n){ const r = Math.max(0, Math.min(5, Math.round(n))); return '★'.repeat(r) + '☆'.repeat(5 - r); }
function reviewLineHtml(p){
  const revs = reviewsFor(p.id);
  if(!revs.length && !REVIEW_FORM_ENABLED) return '';
  const sum = revs.length ? `<span class="rv-stars">${starsText(avgRating(revs))}</span> ${avgRating(revs).toFixed(1)} (${revs.length}) · <u>Reviews</u>` : '<u>Write a review</u>';
  return `<button type="button" class="rv-line" data-reviews="${escapeHtml(String(p.id))}">${sum}</button>`;
}
let rvRating = 5;
function paintStars(){ $$('#rvBox [data-star]').forEach(b => b.classList.toggle('on', Number(b.dataset.star) <= rvRating)); }
function closeReviews(){ const w = $('#rvWrap'); if(w) w.classList.remove('show'); }
function ensureReviewUi(){
  if($('#rvWrap')) return;
  const st = document.createElement('style');
  st.textContent = `.rv-line{background:none;border:0;padding:0;margin:2px 0 8px;font:inherit;font-size:12.5px;color:var(--muted);cursor:pointer;text-align:left}
.rv-stars{color:#e0a800;letter-spacing:1px}
.rv-wrap{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:1000;padding:16px}
.rv-wrap.show{display:flex}
.rv-box{position:relative;background:var(--surface);color:var(--text);border-radius:var(--radius);box-shadow:var(--shadow);width:100%;max-width:440px;max-height:90vh;overflow:auto;padding:20px}
.rv-box h3{margin:0 28px 12px 0;font-size:16px}
.rv-close{position:absolute;top:8px;right:10px;background:none;border:0;font-size:26px;line-height:1;color:var(--muted);cursor:pointer}
.rv-item{border-bottom:1px solid var(--line);padding:8px 0;font-size:14px}
.rv-item p{margin:4px 0 0}
.rv-form{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.rv-form input,.rv-form textarea{font:inherit;font-size:16px;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text)}
.rv-pick button{background:none;border:0;font-size:28px;color:var(--line);cursor:pointer;padding:0 2px}
.rv-pick button.on{color:#e0a800}
.rv-muted{color:var(--muted);font-size:12.5px;margin:0}
#policies{margin:8px 0 0;font-size:12.5px;color:var(--muted)}`;
  document.head.appendChild(st);
  const w = document.createElement('div');
  w.id = 'rvWrap'; w.className = 'rv-wrap';
  w.innerHTML = '<div class="rv-box" id="rvBox" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(w);
  w.addEventListener('click', e => {
    if(e.target === w || e.target.closest('.rv-close')){ closeReviews(); return; }
    const s = e.target.closest('[data-star]');
    if(s){ rvRating = Number(s.dataset.star); paintStars(); }
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeReviews(); });
}
function openReviews(id){
  const p = products.find(x => String(x.id) === String(id));
  if(!p) return;
  ensureReviewUi();
  const revs = reviewsFor(p.id);
  rvRating = 5;
  $('#rvBox').innerHTML = `
    <button type="button" class="rv-close" aria-label="Close">×</button>
    <h3>${escapeHtml(p.name)}</h3>
    ${revs.length ? revs.map(r => `<div class="rv-item"><span class="rv-stars">${starsText(r.rating)}</span> <strong>${escapeHtml(r.name)}</strong>${r.text ? `<p>${escapeHtml(r.text)}</p>` : ''}</div>`).join('') : '<p class="rv-muted">No reviews yet. Be the first!</p>'}
    ${REVIEW_FORM_ENABLED ? `<form class="rv-form">
      <strong>Write a review</strong>
      <div class="rv-pick">${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}" aria-label="${n} stars">★</button>`).join('')}</div>
      <input name="rvName" placeholder="Your name" maxlength="40" required>
      <textarea name="rvText" placeholder="Your review" maxlength="500" rows="3" required></textarea>
      <button class="btn primary" type="submit">Send review</button>
      <p class="rv-muted">Reviews are sent to us on WhatsApp and appear here after approval.</p>
    </form>` : ''}`;
  paintStars();
  const f = $('#rvBox .rv-form');
  if(f) f.addEventListener('submit', e => {
    e.preventDefault();
    const name = f.elements.rvName.value.trim(), text = f.elements.rvText.value.trim();
    if(!name || !text) return;
    const msg = `⭐ Review for: ${p.name} (ID ${p.id})\nRating: ${rvRating}/5\nName: ${name}\nReview: ${text}`;
    window.open(whatsappUrl(msg), '_blank', 'noopener');
    closeReviews();
    toast('Thanks! Your review will appear after approval.');
  });
  $('#rvWrap').classList.add('show');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-reviews]');
  if(b){ e.preventDefault(); e.stopPropagation(); openReviews(b.dataset.reviews); }
});

/* =========================================================
   INIT
   ========================================================= */
async function init(){
  initTheme();
  await loadStoreData();
  const mq = new URLSearchParams(location.search).get('model');
  if(mq) activeModel = [...new Set(products.map(p => p.category))].find(c => c && slugify(c) === slugify(mq)) || null;
  try{
    const SITE = 'https://dronezonelb.com/';
    const abs = u => u ? new URL(u, SITE).href : undefined;
    const items = (activeModel ? modelProducts(activeModel) : products).filter(p => p && p.name).map((p, i) => {
      const used = /\bused\b/i.test(p.name) || /\b(barely used|like new)\b|,\s*used\b/i.test(p.desc || '');
      const revs = reviewsFor(p.id);
      const prod = { '@type':'Product', name:p.name, sku:String(p.id || ''), category:p.category || undefined,
        brand:{ '@type':'Brand', name:/^\s*dji\b/i.test(p.name) ? 'DJI' : 'Drone Zone' },
        description:String(p.desc || p.name).replace(/<[^>]+>/g, '').slice(0, 500), image:allImages(p).map(abs),
        offers:{ '@type':'Offer', url:activeModel ? SITE + '?model=' + slugify(activeModel) : SITE, priceCurrency:'USD', price:Number(p.price) || 0,
          availability:(p.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'),
          itemCondition:used ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
          shippingDetails:{ '@type':'OfferShippingDetails', shippingDestination:{ '@type':'DefinedRegion', addressCountry:'LB' } },
          hasMerchantReturnPolicy:{ '@type':'MerchantReturnPolicy', merchantReturnLink:SITE + '#policies' },
          seller:{ '@type':'Organization', name:'Drone Zone' } } };
      if(revs.length){
        prod.aggregateRating = { '@type':'AggregateRating', ratingValue:avgRating(revs).toFixed(1), reviewCount:revs.length, bestRating:5 };
        prod.review = revs.map(r => ({ '@type':'Review', author:{ '@type':'Person', name:r.name }, reviewRating:{ '@type':'Rating', ratingValue:r.rating, bestRating:5 }, reviewBody:r.text || undefined, datePublished:r.date || undefined }));
      }
      return { '@type':'ListItem', position:i + 1, item:prod };
    });
    const ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ld-products';
    ld.textContent = JSON.stringify({ '@context':'https://schema.org', '@type':'ItemList', name:'Drone Zone products', itemListElement:items });
    document.head.appendChild(ld);
  }catch(e){}
  renderChrome();
  applyModelSeo();
  renderFilters();
  renderProducts();
  renderCart();
  bindEvents();
}
init();
