/* Drone Zone — Blog & FAQ pages */
(function(){
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  /* ---------- theme (shared with the shop) ---------- */
  const themeBtn = $('#themeToggle');
  if(themeBtn) themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try{ localStorage.setItem('shop.theme', next); }catch(e){}
  });

  /* ---------- helpers ---------- */
  const base = window.location.pathname.replace(/\/[^/]*$/, '');
  const img = p => (p && p.startsWith('/')) ? base + p : (p || '');
  const slug = s => String(s || '').toLowerCase().normalize('NFKD')
    .replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-') || 'post';
  const fmtDate = d => {
    if(!d) return '';
    const t = new Date(d + (String(d).length === 10 ? 'T12:00:00' : ''));
    return isNaN(t) ? esc(d) : t.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
  };
  const textToHtml = t => esc(t).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  // rich text from the admin panel: keep formatting, drop scripts and inline handlers
  function cleanHtml(html){
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    tpl.content.querySelectorAll('script,style,iframe,object,embed,form').forEach(n => n.remove());
    tpl.content.querySelectorAll('*').forEach(n => {
      [...n.attributes].forEach(a => {
        const v = a.value.trim().toLowerCase();
        if(a.name.startsWith('on') || ((a.name === 'href' || a.name === 'src') && v.startsWith('javascript:'))) n.removeAttribute(a.name);
      });
      if(n.tagName === 'A' && /^https?:/i.test(n.getAttribute('href') || '') && !/dronezonelb\.com/i.test(n.getAttribute('href'))){ n.setAttribute('target','_blank'); n.setAttribute('rel','noopener'); }
      if(n.tagName === 'IMG'){ const s = n.getAttribute('src'); if(s) n.setAttribute('src', img(s)); n.setAttribute('loading','lazy'); }
    });
    return tpl.innerHTML;
  }
  const looksHtml = s => /<\/?(p|h\d|ul|ol|li|strong|em|a|br|img|blockquote)\b/i.test(String(s || ''));
  const richOrText = s => looksHtml(s) ? cleanHtml(s) : textToHtml(s);
  async function getJSON(url){
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error(r.status);
    return r.json();
  }

  /* ---------- WhatsApp link from the shop settings ---------- */
  async function setupWhatsApp(){
    const links = document.querySelectorAll('[data-wa]');
    try{
      const d = await getJSON('products.json');
      const name = d.settings && d.settings.storeName;
      if(name) document.querySelectorAll('.brand-name').forEach(el => el.textContent = name);
      const digits = String((d.settings && d.settings.whatsapp) || '').replace(/\D/g,'');
      if(!digits) return;
      links.forEach(a => {
        const msg = a.getAttribute('data-wa');
        a.href = `https://wa.me/${digits}` + (msg ? `?text=${encodeURIComponent(msg)}` : '');
        a.hidden = false;
      });
    }catch(e){}
  }

  /* ---------- BLOG ---------- */
  async function blog(){
    const list = $('#postList'), view = $('#postView'), intro = $('#blogIntro');
    let posts = [];
    try{
      const d = await getJSON('blog.json');
      posts = (Array.isArray(d.posts) ? d.posts : [])
        .filter(p => p && p.title && p.published !== false)
        .map(p => Object.assign({}, p, { slug: slug(p.title) }))
        .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
    }catch(e){}

    function renderList(){
      view.hidden = true; list.hidden = false; intro.hidden = false;
      document.title = 'Blog — Drone Zone';
      if(!posts.length){
        list.innerHTML = `<div class="empty-state"><strong>No posts yet</strong>Guides and news will show up here soon.</div>`;
        return;
      }
      list.innerHTML = posts.map((p, i) => `
        <a class="post-card${i === 0 ? ' featured' : ''}" href="#${esc(p.slug)}">
          <div class="post-media">${p.cover
            ? `<img src="${esc(img(p.cover))}" alt="" loading="lazy">`
            : `<span class="post-ph" aria-hidden="true"><img src="images/uploads/logo-144.webp" alt=""></span>`}</div>
          <div class="post-body">
            ${p.date ? `<time datetime="${esc(p.date)}">${fmtDate(p.date)}</time>` : ''}
            <h2>${esc(p.title)}</h2>
            ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
            <span class="read-more">Read post <span aria-hidden="true">→</span></span>
          </div>
        </a>`).join('');
    }
    function renderPost(p){
      list.hidden = true; intro.hidden = true; view.hidden = false;
      document.title = `${p.title} — Drone Zone`;
      view.innerHTML = `
        <a class="back-link" href="#">← All posts</a>
        <header class="article-head">
          ${p.date ? `<time datetime="${esc(p.date)}">${fmtDate(p.date)}</time>` : ''}
          <h1>${esc(p.title)}</h1>
          ${p.summary ? `<p class="lede">${esc(p.summary)}</p>` : ''}
        </header>
        ${p.cover ? `<img class="article-cover" src="${esc(img(p.cover))}" alt="">` : ''}
        <div class="prose">${richOrText(p.body)}</div>
        <div class="article-foot">
          <a class="back-link" href="#">← All posts</a>
          <a class="btn-shop" href="./">Shop accessories</a>
        </div>`;
      window.scrollTo(0, 0);
    }
    function route(){
      const h = decodeURIComponent(location.hash.slice(1));
      const p = h && posts.find(x => x.slug === h);
      p ? renderPost(p) : renderList();
    }
    window.addEventListener('hashchange', route);
    route();
  }

  /* ---------- FAQ ---------- */
  async function faq(){
    const box = $('#faqList'), search = $('#faqSearch'), none = $('#faqNone');
    let items = [];
    try{
      const d = await getJSON('faq.json');
      items = (Array.isArray(d.questions) ? d.questions : []).filter(q => q && q.question);
    }catch(e){}
    if(!items.length){
      box.innerHTML = `<div class="empty-state"><strong>No questions yet</strong>Check back soon, or message us on WhatsApp.</div>`;
      if(search) search.closest('.faq-tools').hidden = true;
      return;
    }
    // group by topic, keeping the order topics first appear in
    const groups = [];
    items.forEach(q => {
      const t = (q.topic || 'General').trim();
      let g = groups.find(x => x.topic === t);
      if(!g){ g = { topic:t, items:[] }; groups.push(g); }
      g.items.push(q);
    });
    box.innerHTML = groups.map(g => `
      <section class="faq-group">
        ${groups.length > 1 ? `<h2>${esc(g.topic)}</h2>` : ''}
        ${g.items.map(q => `
          <details class="faq-item">
            <summary><span>${esc(q.question)}</span><span class="faq-icon" aria-hidden="true"></span></summary>
            <div class="faq-answer prose">${richOrText(q.answer)}</div>
          </details>`).join('')}
      </section>`).join('');

    if(search) search.addEventListener('input', () => {
      const term = search.value.trim().toLowerCase();
      let shown = 0;
      box.querySelectorAll('.faq-item').forEach(el => {
        const hit = !term || el.textContent.toLowerCase().includes(term);
        el.hidden = !hit; if(hit) shown++;
        if(term && hit) el.open = true;
        if(!term) el.open = false;
      });
      box.querySelectorAll('.faq-group').forEach(g => {
        g.hidden = !g.querySelector('.faq-item:not([hidden])');
      });
      none.hidden = shown > 0;
    });
  }

  setupWhatsApp();
  if(document.body.dataset.page === 'blog') blog();
  if(document.body.dataset.page === 'faq') faq();
})();
