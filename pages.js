/* Static, indexable copies of blog posts (SEO). Add new posts here when their static page is created. */
const STATIC_POSTS = {
 "how-to-choose-your-first-drone-a-step-by-step-guide": "/blog/how-to-choose-your-first-drone-a-step-by-step-guide.html",
 "every-dji-drone-explained-a-complete-guide-to-choosing-your-perfect-model": "/blog/every-dji-drone-explained-a-complete-guide-to-choosing-your-perfect-model.html",
 "what-to-do-before-you-fly-a-pre-flight-checklist-for-drone-pilots": "/blog/what-to-do-before-you-fly-a-pre-flight-checklist-for-drone-pilots.html",
 "must-have-accessories-for-your-dji-mini-drone": "/blog/must-have-accessories-for-your-dji-mini-drone.html",
 "drone-laws-in-lebanon-2026-permits-rules-and-no-fly-areas": "/blog/drone-laws-in-lebanon.html",
 "dji-neo-2-vs-dji-flip-which-should-you-buy": "/blog/dji-neo-2-vs-dji-flip.html",
 "best-beginner-drone-to-buy-in-lebanon-2026": "/blog/best-beginner-drone-to-buy-in-lebanon.html",
 "dji-mini-4-pro-vs-mini-5-pro-which-mini-drone-should-you-buy": "/blog/dji-mini-4-pro-vs-mini-5-pro.html",
 "dji-avata-2-vs-avata-360-which-fpv-drone-is-right-for-you": "/blog/dji-avata-2-vs-avata-360.html",
 "dji-lito-x1-vs-mini-4-pro-best-beginner-camera-drone": "/blog/dji-lito-x1-vs-mini-4-pro.html",
 "best-drone-for-wedding-and-event-filming-in-lebanon": "/blog/best-drone-for-weddings-and-events-in-lebanon.html",
 "buying-a-used-dji-drone-in-lebanon-what-to-check": "/blog/buying-a-used-dji-drone-in-lebanon.html"
};
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
  const SITE = 'https://dronezonelb.com/';
  const abs = p => new URL(img(p), SITE).href;
  function setMeta(attr, key, val){ let m = document.head.querySelector('meta['+attr+'="'+key+'"]'); if(!m){ m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); } m.setAttribute('content', val); }
  function setCanonical(url){ let l = document.head.querySelector('link[rel="canonical"]'); if(!l){ l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); } l.href = url; }
  function setLd(id, obj){ let el = document.getElementById(id); if(!el){ el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); } el.textContent = JSON.stringify(obj); }
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
        .map(p => Object.assign({}, p, { slug: slug(p.title) }));
      posts = posts.filter(p => p.pinned).concat(posts.filter(p => !p.pinned));
    }catch(e){}

    function renderList(){
      view.hidden = true; list.hidden = false; intro.hidden = false;
      setCanonical(SITE + 'blog.html');
      document.title = 'Blog — Drone Zone';
      if(!posts.length){
        list.innerHTML = `<div class="empty-state"><strong>No posts yet</strong>Guides and news will show up here soon.</div>`;
        return;
      }
      list.innerHTML = posts.map((p, i) => `
        <a class="post-card${i === 0 ? ' featured' : ''}" href="${STATIC_POSTS[p.slug] || ('/blog.html?post=' + esc(p.slug))}">
          <div class="post-media">${p.cover
            ? `<img src="${esc(img(p.cover))}" alt="" loading="lazy">`
            : `<span class="post-ph" aria-hidden="true"><img src="images/uploads/logo-144.webp" alt=""></span>`}</div>
          <div class="post-body">
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
        <a class="back-link" href="blog.html">← All posts</a>
        <header class="article-head">
          <h1>${esc(p.title)}</h1>
          ${p.summary ? `<p class="lede">${esc(p.summary)}</p>` : ''}
        </header>
        ${p.cover ? `<img class="article-cover" src="${esc(img(p.cover))}" alt="">` : ''}
        <div class="prose">${richOrText(p.body)}</div>
        <div class="article-foot">
          <a class="back-link" href="blog.html">← All posts</a>
          <a class="btn-shop" href="./">Shop accessories</a>
        </div>`;
      const url = STATIC_POSTS[p.slug] ? SITE + STATIC_POSTS[p.slug].slice(1) : SITE + 'blog.html?post=' + encodeURIComponent(p.slug);
      const desc = String(p.summary || '').slice(0, 160);
      setCanonical(url);
      setMeta('property', 'og:title', p.title); setMeta('property', 'og:url', url); setMeta('property', 'og:type', 'article');
      if(desc){ setMeta('name', 'description', desc); setMeta('property', 'og:description', desc); }
      if(p.cover) setMeta('property', 'og:image', abs(p.cover));
      setLd('ld-article', { '@context':'https://schema.org', '@type':'BlogPosting', headline:p.title, description:desc, mainEntityOfPage:url, image:p.cover ? [abs(p.cover)] : undefined, author:{ '@type':'Organization', name:'Drone Zone', url:SITE }, publisher:{ '@type':'Organization', name:'Drone Zone', logo:{ '@type':'ImageObject', url:SITE + 'images/uploads/logo-144.webp' } } });
      window.scrollTo(0, 0);
    }
    function route(){
      const q = new URLSearchParams(location.search).get('post');
      const h = q || decodeURIComponent(location.hash.slice(1));
      const p = h && posts.find(x => x.slug === h);
      if(p && STATIC_POSTS[p.slug]){ location.replace(STATIC_POSTS[p.slug]); return; }
      if(p && !q){ try{ history.replaceState(null, '', '?post=' + encodeURIComponent(p.slug)); }catch(e){} }
      p ? renderPost(p) : renderList();
    }
    window.addEventListener('hashchange', route);
    window.addEventListener('popstate', route);
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

    setLd('ld-faq', { '@context':'https://schema.org', '@type':'FAQPage', mainEntity: items.map(q => ({ '@type':'Question', name:q.question, acceptedAnswer:{ '@type':'Answer', text:String(q.answer).replace(/<[^>]+>/g, '') } })) });
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
/* ---------- Arabic language toggle (blog, FAQ, articles) ---------- */
(function(){
  'use strict';
  var KEY = 'shop.lang';
  var D = {"What is the DJI Lito X1?":"ما هي DJI Lito X1؟","The DJI Lito X1 is a newer DJI drone under 249 g, with a 1/1.3-inch camera, 4K/60fps HDR video, obstacle sensing with forward LiDAR, 42 GB of built-in storage and up to 36 minutes of flight.":"DJI Lito X1 طائرة جديدة من DJI وزنها أقل من 249 غ، بكاميرا 1/1.3 إنش، وفيديو 4K/60fps بتقنية HDR، واستشعار للعوائق مع LiDAR أمامي، وذاكرة مدمجة 42 GB، ووقت طيران يصل إلى 36 دقيقة.","Which drone do you recommend?":"أي طائرة تنصحني بها؟","It depends on your budget and what you want to film. The DJI Neo is great for selfies and first flights, the Mini series is the best all-round choice for travel and photos, the Lito X1 and Mini 5 Pro suit people who want better obstacle sensing and camera, and the Avata series is for FPV. Message us on WhatsApp and we will help you pick.":"يعتمد ذلك على ميزانيتك وما تريد تصويره. DJI Neo ممتازة للسيلفي وأول تجربة طيران، وسلسلة Mini هي الخيار الأشمل للسفر والصور، وLito X1 وMini 5 Pro تناسبان من يريد استشعاراً أفضل للعوائق وكاميرا أقوى، أما سلسلة Avata فهي لطيران FPV. راسلنا على واتساب وسنساعدك في الاختيار.","Lito X1 or Mini 4 Pro: which should I buy?":"Lito X1 أم Mini 4 Pro: أيهما أشتري؟","Both are under 249 g and easy to fly. The Lito X1 is newer, with forward LiDAR, 4K/100fps slow motion and built-in storage. The Mini 4 Pro is a proven model with full obstacle sensing and is often easier to find at a good price, including used.":"كلتاهما أقل من 249 غ وسهلتا الطيران. Lito X1 أحدث، مع LiDAR أمامي وتصوير بطيء 4K/100fps وذاكرة مدمجة. أما Mini 4 Pro فموديل مجرَّب باستشعار كامل للعوائق، وغالباً ما يكون من الأسهل إيجادها بسعر جيد، بما في ذلك المستعملة.","Do you have the DJI Lito X1 in stock?":"هل لديكم DJI Lito X1 متوفرة؟","Yes. We sell the DJI Lito X1 Fly More Combo brand new and sealed, and also with the DJI RC 2 screen remote. Check the Drones category or message us on WhatsApp for current stock.":"نعم. نبيع DJI Lito X1 Fly More Combo جديدة ومختومة، وكذلك مع جهاز التحكم DJI RC 2 المزوّد بشاشة. تفقّد فئة الطائرات أو راسلنا على واتساب لمعرفة المخزون الحالي.","Do you sell drones as well as accessories?":"هل تبيعون الطائرات أيضاً إلى جانب الإكسسوارات؟","Yes. New and used DJI drones are listed in the Drones category of the shop. Stock changes often, so message us if you are looking for a specific model.":"نعم. طائرات DJI الجديدة والمستعملة معروضة في فئة الطائرات في المتجر. المخزون يتغيّر باستمرار، فراسلنا إذا كنت تبحث عن موديل معيّن.","Are your used drones tested?":"هل الطائرات المستعملة مفحوصة؟","Yes. Every used drone is checked before it is sold, and you can test it with us before you pay. Battery cycle counts are listed on the product when we have them.":"نعم. نفحص كل طائرة مستعملة قبل بيعها، ويمكنك تجربتها عندنا قبل الدفع. نذكر عدد دورات البطاريات في صفحة المنتج عندما تتوفر لدينا.","Do drones come with a warranty?":"هل تأتي الطائرات مع كفالة؟","Our used drones come with a short shop warranty, and new sealed drones come with the standard DJI warranty. We confirm the warranty for your drone on WhatsApp.":"تأتي طائراتنا المستعملة مع كفالة قصيرة من المتجر، وتأتي الطائرات الجديدة المختومة مع كفالة DJI القياسية. نؤكد لك تفاصيل الكفالة لطائرتك عبر واتساب.","Which drone is best for beginners?":"ما هي أفضل طائرة للمبتدئين؟","A DJI Neo or a DJI Mini is a great start: light, simple and forgiving. If you want obstacle sensing to help avoid crashes, look at the Mini 4 Pro, Mini 5 Pro or Lito X1. Our blog has a full guide to every DJI model.":"DJI Neo أو DJI Mini بداية ممتازة: خفيفة وبسيطة ومتسامحة مع الأخطاء. إذا أردت استشعاراً للعوائق يساعدك على تجنّب الاصطدام، فانظر إلى Mini 4 Pro أو Mini 5 Pro أو Lito X1. في مدونتنا دليل كامل لكل موديلات DJI.","What is a Fly More Combo?":"ما هو Fly More Combo؟","It is DJI's bundle that adds extra batteries, a charging hub, spare propellers and a carry bag to the drone. It is usually the best value if you plan to fly often, because one battery only gives around 20 to 35 minutes of flight.":"هو طقم من DJI يضيف إلى الطائرة بطاريات إضافية وقاعدة شحن ومراوح احتياطية وحقيبة حمل. وهو عادةً الخيار الأوفر إذا كنت تنوي الطيران كثيراً، لأن البطارية الواحدة تعطي فقط حوالي 20 إلى 35 دقيقة طيران.","What does \"under 250 g\" mean?":"ماذا يعني \"أقل من 250 غ\"؟","Drones that weigh less than 250 grams, such as the DJI Mini and Neo series, are the lightest category. In many countries they face fewer rules. Heavier batteries, such as Plus batteries, can push a drone over 250 g.":"الطائرات التي تزن أقل من 250 غراماً، مثل سلسلتي DJI Mini وNeo، هي الفئة الأخف وزناً. وفي كثير من الدول تخضع لقواعد أقل. البطاريات الأثقل، مثل بطاريات Plus، قد ترفع وزن الطائرة فوق 250 غ.","Do you buy or trade in used drones?":"هل تشترون الطائرات المستعملة أو تقبلونها مقابل استبدال؟","Message us on WhatsApp with your drone model, its condition and photos, and we will let you know if we can buy it or take it in trade.":"راسلنا على واتساب مع موديل طائرتك وحالتها وصورها، وسنخبرك إن كنا نستطيع شراءها أو قبولها مقابل استبدال.","How much does a good beginner drone cost?":"كم تكلّف طائرة جيدة للمبتدئين؟","A small camera drone like the DJI Neo or an older DJI Mini starts at a few hundred dollars. Newer Mini models with better cameras and obstacle sensing cost more. Used drones in good condition are a great way to start for less.":"تبدأ طائرات الكاميرا الصغيرة مثل DJI Neo أو موديلات DJI Mini الأقدم من بضع مئات الدولارات. موديلات Mini الأحدث بكاميرات أفضل واستشعار للعوائق أغلى ثمناً. والطائرات المستعملة بحالة جيدة طريقة رائعة للبدء بتكلفة أقل.","What do I need to get started?":"ماذا أحتاج لأبدأ؟","The drone, its remote, at least one battery, a charger, a microSD card and the DJI Fly app on your phone. Extra batteries, spare propellers and a case make flying much easier.":"الطائرة وجهاز التحكم وبطارية واحدة على الأقل وشاحن وبطاقة microSD وتطبيق DJI Fly على هاتفك. البطاريات الإضافية والمراوح الاحتياطية والعلبة تجعل الطيران أسهل بكثير.","Can a drone follow me by itself?":"هل يمكن للطائرة أن تتبعني تلقائياً؟","Many DJI drones can, using ActiveTrack. It is available on the Neo, Mini 3 Pro, Mini 4 Pro, Mini 5 Pro, Lito X1 and Air series, but not on the basic Mini 2 or Mini 3. Drones with all-round sensing track more safely.":"كثير من طائرات DJI تستطيع ذلك بفضل ميزة ActiveTrack. وهي متوفرة في Neo وMini 3 Pro وMini 4 Pro وMini 5 Pro وLito X1 وسلسلة Air، لكنها غير متوفرة في Mini 2 أو Mini 3 العادية. الطائرات ذات الاستشعار من كل الجهات تتبعك بأمان أكبر.","Will the drone avoid hitting things?":"هل تتجنّب الطائرة الاصطدام بالأشياء؟","Only drones with obstacle sensors can. Models like the Mini 4 Pro, Mini 5 Pro, Lito X1 and Air 3 have all-round sensing. Cheaper models have no sensors, and even the best can miss thin wires, so always fly carefully.":"فقط الطائرات المزوّدة بحسّاسات للعوائق تستطيع ذلك. موديلات مثل Mini 4 Pro وMini 5 Pro وLito X1 وAir 3 تتمتع باستشعار من كل الجهات. الموديلات الأرخص بلا حسّاسات، وحتى أفضلها قد لا ترى الأسلاك الرفيعة، لذلك طِر دائماً بحذر.","How good is the camera?":"ما مدى جودة الكاميرا؟","Most DJI drones shoot 4K video. Higher-end models like the Mini 4 Pro, Mini 5 Pro, Lito X1 and Air 3 add HDR, slow motion and 10-bit D-Log M for professional colour grading.":"معظم طائرات DJI تصوّر فيديو 4K. والموديلات الأعلى مثل Mini 4 Pro وMini 5 Pro وLito X1 وAir 3 تضيف HDR والتصوير البطيء وتقنية 10-bit D-Log M لتعديل الألوان باحترافية.","What is the difference between a camera drone and an FPV drone?":"ما الفرق بين طائرة التصوير وطائرة FPV؟","A camera drone like the Mini flies smoothly and is made for photos and video. An FPV drone like the Avata or Neo with goggles lets you see from the drone in real time, for an immersive, fast flying experience.":"طائرة التصوير مثل Mini تطير بسلاسة وهي مصممة للصور والفيديو. أما طائرة FPV مثل Avata أو Neo مع النظارات، فتتيح لك الرؤية من منظور الطائرة مباشرةً، لتجربة طيران سريعة وغامرة.","Can I buy DJI Care for a used drone?":"هل يمكنني شراء DJI Care لطائرة مستعملة؟","DJI Care Refresh can usually only be bought within a short time after the drone is first activated, so most used drones cannot get it. Ask us on WhatsApp and we will check for your drone.":"عادةً لا يمكن شراء DJI Care Refresh إلا خلال فترة قصيرة بعد أول تفعيل للطائرة، لذلك معظم الطائرات المستعملة لا يمكنها الحصول عليه. اسألنا على واتساب وسنتحقق من طائرتك.","What should I do before my first flight?":"ماذا أفعل قبل أول طيران؟","Update the drone, remote and batteries in the DJI Fly app, calibrate the compass if asked, and fly in an open area with a good GPS signal. Set a safe return-to-home height and start in Normal mode, not Sport.":"حدّث الطائرة وجهاز التحكم والبطاريات من تطبيق DJI Fly، وعايِر البوصلة إذا طُلب منك ذلك، وطِر في مكان مفتوح بإشارة GPS جيدة. اضبط ارتفاعاً آمناً للعودة إلى نقطة الإقلاع وابدأ بالوضع العادي (Normal) لا الرياضي (Sport).","What do propeller guards do?":"ما فائدة واقيات المراوح؟","Propeller guards protect the propellers and the people around them, which is very useful indoors or while learning. They add a little weight, so expect slightly shorter flights and more drift in wind.":"تحمي واقيات المراوح المراوحَ والأشخاصَ من حولها، وهي مفيدة جداً داخل المنازل أو أثناء التعلّم. تضيف وزناً بسيطاً، لذا توقّع وقت طيران أقصر قليلاً وانجرافاً أكبر مع الرياح.","How far can a drone fly?":"إلى أي مسافة تطير الطائرة؟","In real use, much less than the numbers on the box. In a city, with buildings, Wi-Fi and phone towers around, most drones keep a solid signal for about 1 to 3 km. In open countryside or over the sea you can often reach 4 to 8 km. Hills, trees and walls between you and the drone cut the signal fast. Newer drones generally hold the signal better in busy areas than older models. Battery is usually the real limit: remember you need enough charge to fly back, so most flights stay within 1 to 2 km.":"في الاستخدام الفعلي، أقل بكثير من الأرقام المكتوبة على العلبة. في المدينة، مع المباني وشبكات Wi-Fi وأبراج الهاتف، تحافظ معظم الطائرات على إشارة قوية لمسافة 1 إلى 3 كم تقريباً. في الريف المفتوح أو فوق البحر يمكنك غالباً الوصول إلى 4 إلى 8 كم. التلال والأشجار والجدران بينك وبين الطائرة تُضعف الإشارة بسرعة. الطائرات الأحدث تحافظ عموماً على الإشارة أفضل من الموديلات الأقدم في المناطق المزدحمة. والبطارية هي الحدّ الحقيقي عادةً: تذكّر أنك تحتاج شحناً كافياً للعودة، لذلك تبقى معظم الرحلات ضمن 1 إلى 2 كم.","How high can a drone fly?":"إلى أي ارتفاع تطير الطائرة؟","It depends on the model. The DJI Neo is limited to 120 m above the take-off point. Drones like the DJI Lito X1, Mini and Air series can be set to fly up to 500 m in the DJI Fly app. For safety, most pilots stay below 120 m, which is the limit used in most countries.":"يعتمد ذلك على الموديل. DJI Neo محدودة بـ 120 م فوق نقطة الإقلاع. أما طائرات مثل DJI Lito X1 وسلسلتي Mini وAir فيمكن ضبطها للطيران حتى 500 م من تطبيق DJI Fly. ولأسباب تتعلق بالسلامة، يبقى معظم الطيارين تحت 120 م، وهو الحدّ المعتمد في معظم الدول.","How long does a battery last in the air?":"كم تدوم البطارية في الجو؟","Most DJI drones fly 20 to 45 minutes per battery, depending on the model. Wind, cold weather and fast flying shorten it. Plan to land with around 20 to 30 percent battery left.":"تطير معظم طائرات DJI من 20 إلى 45 دقيقة لكل بطارية، حسب الموديل. الرياح والطقس البارد والطيران السريع تقلّل هذه المدة. خطّط للهبوط مع بقاء حوالي 20 إلى 30 بالمئة من البطارية.","What happens if the drone loses signal?":"ماذا يحدث إذا فقدت الطائرة الإشارة؟","DJI drones have Return to Home. If the signal is lost or the battery gets low, the drone flies back and lands where it took off. Set a return height above nearby trees and buildings before you fly.":"طائرات DJI مزوّدة بميزة العودة إلى نقطة الإقلاع (Return to Home). إذا انقطعت الإشارة أو انخفضت البطارية، تعود الطائرة وتهبط في مكان إقلاعها. اضبط ارتفاع العودة فوق الأشجار والمباني القريبة قبل الطيران.","Can I fly in wind or rain?":"هل يمكنني الطيران في الرياح أو المطر؟","Light wind is fine, but small drones drift and drain the battery faster in strong wind. Avoid flying in rain or fog, because most drones are not waterproof.":"الرياح الخفيفة لا مشكلة فيها، لكن الطائرات الصغيرة تنجرف وتستهلك البطارية أسرع في الرياح القوية. تجنّب الطيران في المطر أو الضباب، لأن معظم الطائرات غير مقاومة للماء.","Can I fly at night?":"هل يمكنني الطيران ليلاً؟","Yes, the drone can fly at night, but obstacle sensing works poorly in the dark and it is harder to keep the drone in sight. Fly only in open areas you already know.":"نعم، يمكن للطائرة الطيران ليلاً، لكن استشعار العوائق يعمل بشكل ضعيف في الظلام ويصعب إبقاء الطائرة في مجال رؤيتك. طِر فقط في أماكن مفتوحة تعرفها مسبقاً.","Do I need my phone or internet to fly?":"هل أحتاج هاتفي أو الإنترنت للطيران؟","Drones with a screen remote like the DJI RC or RC 2 do not need a phone. With the standard remote, you connect your phone and use the DJI Fly app. Internet is only needed for maps, updates and activating a new drone.":"الطائرات التي تأتي مع جهاز تحكم بشاشة مثل DJI RC أو RC 2 لا تحتاج هاتفاً. أما مع جهاز التحكم العادي، فتوصل هاتفك وتستخدم تطبيق DJI Fly. الإنترنت مطلوب فقط للخرائط والتحديثات وتفعيل الطائرة الجديدة.","How fast can a drone fly?":"ما سرعة الطائرة؟","Most DJI Mini drones reach about 55 km/h in Sport mode, and bigger models are faster. Use Normal mode while learning, because Sport mode turns off obstacle sensing.":"تصل معظم طائرات DJI Mini إلى حوالي 55 كم/س في الوضع الرياضي (Sport)، والموديلات الأكبر أسرع. استخدم الوضع العادي أثناء التعلّم، لأن الوضع الرياضي يوقف استشعار العوائق.","Do I need a memory card?":"هل أحتاج بطاقة ذاكرة؟","Most DJI drones need a microSD card. Use a fast card (V30 or U3) of at least 64 GB. The DJI Lito X1 also has 42 GB built in, so you can fly even without a card.":"معظم طائرات DJI تحتاج بطاقة microSD. استخدم بطاقة سريعة (V30 أو U3) بسعة 64 GB على الأقل. كما أن DJI Lito X1 فيها ذاكرة مدمجة 42 GB، فيمكنك الطيران حتى بدون بطاقة.","Is it hard to learn to fly?":"هل تعلّم الطيران صعب؟","No. DJI drones hover in place by themselves with GPS, so the basics take minutes. Practise take-off, landing and simple turns in an open field before trying longer flights.":"لا. طائرات DJI تثبت في مكانها في الجو تلقائياً بفضل GPS، لذا تتعلّم الأساسيات في دقائق. تدرّب على الإقلاع والهبوط والالتفافات البسيطة في أرض مفتوحة قبل تجربة رحلات أطول.","What if I crash my drone?":"ماذا لو تحطّمت طائرتي؟","Bring it to us. Broken propellers, arms and many other parts can be replaced, and we will tell you on WhatsApp what can be fixed.":"أحضرها إلينا. يمكن استبدال المراوح والأذرع المكسورة وكثير من القطع الأخرى، وسنخبرك عبر واتساب بما يمكن إصلاحه.","Can I fly over the sea?":"هل يمكنني الطيران فوق البحر؟","Yes, but take extra care. Over water the drone can drift, the downward sensors can get confused, and a drone that falls into salt water is usually lost. Keep good battery left and stay close.":"نعم، لكن بحذر إضافي. فوق الماء قد تنجرف الطائرة، وقد تتشوّش الحسّاسات السفلية، والطائرة التي تسقط في الماء المالح تضيع عادةً. احتفظ بشحن كافٍ في البطارية وابقَ قريباً.","Is a drone loud?":"هل الطائرة مزعجة الصوت؟","Small drones like the Mini sound like a loud buzz up close, but are hard to hear once they are high in the air. Bigger drones are louder.":"الطائرات الصغيرة مثل Mini يُسمع لها طنين عالٍ عن قرب، لكن يصعب سماعها عندما ترتفع في الجو. الطائرات الأكبر أعلى صوتاً.","Can a child fly a drone?":"هل يمكن لطفل أن يطيّر طائرة؟","Older children can learn with an adult nearby. Start with a small, light drone in Normal mode and propeller guards, in an open area away from people.":"يمكن للأطفال الأكبر سناً التعلّم بوجود شخص بالغ بقربهم. ابدأ بطائرة صغيرة وخفيفة في الوضع العادي ومع واقيات المراوح، في مكان مفتوح بعيداً عن الناس.","How many cycles is a good drone battery?":"كم دورة شحن تعتبر جيدة لبطارية الطائرة؟","DJI batteries stay healthy for a few hundred charge cycles if they are looked after. A battery with fewer than 50 cycles is still in very good condition. Check the battery health in the DJI Fly app.":"تبقى بطاريات DJI بحالة جيدة لبضع مئات من دورات الشحن إذا اعتنيت بها. البطارية التي لديها أقل من 50 دورة لا تزال بحالة ممتازة. تحقّق من صحة البطارية في تطبيق DJI Fly.","How should I store drone batteries?":"كيف أخزّن بطاريات الطائرة؟","Store batteries at about 50 to 60 percent charge, in a cool and dry place. Avoid leaving them fully charged or empty for weeks, and never charge a battery that is swollen or damaged.":"خزّن البطاريات بشحن يتراوح بين 50 و60 بالمئة تقريباً، في مكان بارد وجاف. تجنّب تركها مشحونة بالكامل أو فارغة لأسابيع، ولا تشحن أبداً بطارية منتفخة أو متضررة.","How often should I change propellers?":"كم مرة يجب أن أغيّر المراوح؟","Replace a propeller as soon as it is chipped, cracked or bent, even slightly. Damaged propellers cause vibration and can fail in flight. Spare propellers are cheap, so keep a set in your bag.":"استبدل المروحة فور أن تتشقّق أو تنكسر حافتها أو تنحني، ولو بشكل بسيط. المراوح المتضررة تسبب اهتزازاً وقد تفشل أثناء الطيران. المراوح الاحتياطية رخيصة، فاحتفظ بطقم في حقيبتك.","How long does it take to charge a battery?":"كم يستغرق شحن البطارية؟","Most DJI batteries charge in about 1 to 1.5 hours. A charging hub charges several batteries one after another, so you can leave them all plugged in.":"تُشحن معظم بطاريات DJI في حوالي ساعة إلى ساعة ونصف. تشحن قاعدة الشحن عدة بطاريات واحدة تلو الأخرى، فيمكنك تركها كلها موصولة.","Do I need to update the drone?":"هل أحتاج إلى تحديث الطائرة؟","Yes. Update the drone, remote and batteries in the DJI Fly app when asked. Updates fix bugs and improve flying, so do them at home before a flight, not in the field.":"نعم. حدّث الطائرة وجهاز التحكم والبطاريات من تطبيق DJI Fly عندما يُطلب منك ذلك. التحديثات تصلح الأخطاء وتحسّن الطيران، فقم بها في المنزل قبل الرحلة، لا في الميدان.","How to Choose Your First Drone: A Step-by-Step Guide":"كيف تختار أول درون لك: دليل خطوة بخطوة","FPV or cinematic, beginner or experienced: a step-by-step guide to picking the right first drone, from speed and camera to safety and controllers.":"FPV أم تصوير سينمائي، مبتدئ أم صاحب خبرة: دليل خطوة بخطوة لاختيار أول درون مناسب لك، من السرعة والكاميرا إلى السلامة وأجهزة التحكم.","DJI Mini 4 Pro vs Mini 5 Pro: Which Mini Drone Should You Buy?":"DJI Mini 4 Pro أم Mini 5 Pro: أي طائرة Mini تشتري؟","The Mini 5 Pro adds a 1-inch sensor and a rotating gimbal. Is it worth the upgrade over the Mini 4 Pro? Camera, safety, size and value compared.":"تضيف Mini 5 Pro مستشعراً بحجم 1 إنش وجيمبل دوّاراً. فهل تستحق الترقية من Mini 4 Pro؟ مقارنة في الكاميرا والسلامة والحجم والقيمة.","DJI Avata 2 vs Avata 360: Which FPV Drone Is Right for You?":"DJI Avata 2 أم Avata 360: أي طائرة FPV تناسبك؟","Classic FPV flying or 8K 360° capture? We compare the DJI Avata 2 and Avata 360 on camera, flight time, ease of use and who each one suits.":"طيران FPV كلاسيكي أم تصوير 360° بدقة 8K؟ نقارن بين DJI Avata 2 وAvata 360 في الكاميرا ووقت الطيران وسهولة الاستخدام ولمن تناسب كل واحدة.","DJI Lito X1 vs Mini 4 Pro: Best Beginner Camera Drone?":"DJI Lito X1 أم Mini 4 Pro: أفضل طائرة تصوير للمبتدئين؟","DJI’s new beginner Lito X1 against the popular Mini 4 Pro: camera, safety sensors, flight time and which one a first-time pilot should choose.":"طائرة DJI الجديدة للمبتدئين Lito X1 في مواجهة Mini 4 Pro الشهيرة: الكاميرا وحسّاسات السلامة ووقت الطيران وأيهما يجب أن يختار الطيار المبتدئ.","Best Drone for Wedding and Event Filming in Lebanon":"أفضل درون لتصوير الأعراس والمناسبات في لبنان","Planning to film weddings, parties or events with a drone in Lebanon? The best DJI drones for the job, the permit you need and tips for great shots.":"تخطط لتصوير الأعراس والحفلات أو المناسبات بالدرون في لبنان؟ أفضل طائرات DJI لهذه المهمة، والتصريح الذي تحتاجه، ونصائح للحصول على لقطات رائعة.","Buying a Used DJI Drone in Lebanon: What to Check":"شراء درون DJI مستعمل في لبنان: ماذا تفحص","A used DJI drone can save you a lot of money. Here is exactly what to check before you buy: battery health, gimbal, motors, activation and more.":"الدرون المستعمل من DJI قد يوفّر عليك الكثير من المال. إليك بالضبط ما يجب فحصه قبل الشراء: صحة البطارية والجيمبل والمحركات والتفعيل وغيرها.","Drone Laws in Lebanon (2026): Permits, Rules and No-Fly Areas":"قوانين الدرون في لبنان (2026): التصاريح والقواعد والمناطق المحظورة","Do you need a permit to fly a drone in Lebanon? Who issues it, what documents you need, the 2026 restrictions and where you should never fly.":"هل تحتاج تصريحاً لتطيير درون في لبنان؟ من يصدره، والمستندات المطلوبة، وقيود 2026، والأماكن التي يجب ألّا تطير فيها أبداً.","DJI Neo 2 vs DJI Flip: Which Should You Buy?":"DJI Neo 2 أم DJI Flip: أيهما تشتري؟","Two palm-launch DJI drones for selfies and vlogs. We compare camera, flight time, safety, size and price in Lebanon to help you choose.":"طائرتان من DJI تقلعان من راحة اليد للسيلفي والفلوغ. نقارن الكاميرا ووقت الطيران والسلامة والحجم والسعر في لبنان لمساعدتك على الاختيار.","Best Beginner Drone to Buy in Lebanon (2026)":"أفضل درون للمبتدئين للشراء في لبنان (2026)","The best first DJI drones you can buy in Lebanon right now, from budget to premium, with what each one is good at.":"أفضل طائرات DJI الأولى التي يمكنك شراؤها في لبنان الآن، من الاقتصادية إلى الفاخرة، مع ما تتميّز به كل واحدة.","Must-Have Accessories for Your DJI Mini Drone":"إكسسوارات لا غنى عنها لطائرة DJI Mini","Propeller guards, cases, landing gear, sunhoods and more: the accessories that protect your DJI Mini and make every flight easier.":"واقيات المراوح والعلب وأرجل الهبوط ومظلات الشمس وغيرها: الإكسسوارات التي تحمي طائرة DJI Mini وتجعل كل رحلة أسهل.","Every DJI Drone Explained: A Complete Guide to Choosing Your Perfect Model":"شرح كل طائرات DJI: دليل كامل لاختيار الموديل المثالي لك","From the palm-sized Neo to the flagship Mavic 4 Pro: key specs, who each DJI drone suits, and the downsides to know before you buy.":"من Neo بحجم راحة اليد إلى Mavic 4 Pro الرائدة: أهم المواصفات، ولمن تناسب كل طائرة من DJI، والعيوب التي يجب معرفتها قبل الشراء.","What to Do Before You Fly: A Pre-Flight Checklist for Drone Pilots":"ماذا تفعل قبل أن تطير: قائمة فحص قبل الطيران لطياري الدرون","Batteries, propellers, firmware, weather, GPS and the law: a simple pre-flight checklist to keep your drone safe and every flight smooth.":"البطاريات والمراوح والتحديثات والطقس وGPS والقانون: قائمة فحص بسيطة قبل الطيران لإبقاء طائرتك آمنة وكل رحلة سلسة.","Shop":"المتجر","Blog":"المدونة","FAQ":"الأسئلة","Toggle dark mode":"الوضع الداكن","Drone Zone blog":"مدونة درون زون","Guides, tips and news":"أدلة ونصائح وأخبار","Setup help, flying tips and what's new in the shop.":"مساعدة في الإعداد ونصائح للطيران وجديد المتجر.","Read post":"اقرأ المقال","← All posts":"← كل المقالات","Shop accessories":"تسوّق الإكسسوارات","No posts yet":"لا توجد مقالات بعد","Help":"المساعدة","Frequently asked questions":"الأسئلة الشائعة","Everything a new drone pilot asks: drones, flying and batteries.":"كل ما يسأله طيار الدرون الجديد: الطائرات والطيران والبطاريات.","Search questions…":"ابحث في الأسئلة…","No questions match your search.":"لا توجد أسئلة تطابق بحثك.","Still have a question?":"لديك سؤال آخر؟","Message us on WhatsApp and we'll get back to you.":"راسلنا على واتساب وسنرد عليك.","Message us":"راسلنا","Message us on WhatsApp":"راسلنا على واتساب","Drones":"الطائرات","Flying":"الطيران","Batteries & care":"البطاريات والعناية","Shop DJI drones and accessories in Lebanon":"تسوّق طائرات DJI وإكسسواراتها في لبنان","Drone Zone delivers DJI drones and accessories across Lebanon, with orders confirmed on WhatsApp. Browse":"يوصل درون زون طائرات DJI وإكسسواراتها إلى كل لبنان، ويتم تأكيد الطلبات عبر واتساب. تصفّح","all DJI drones for sale":"كل طائرات DJI المعروضة للبيع","or pick your model:":"أو اختر موديلك:","Ask us on WhatsApp":"اسألنا على واتساب","DJI Remotes & Goggles":"أجهزة تحكم ونظارات DJI","Search questions":"ابحث في الأسئلة","Site":"الموقع"};
  var tpl = document.getElementById('ar-article');
  var page = document.body.dataset.page;
  if(!tpl && page !== 'blog' && page !== 'faq') return;

  var origText = new WeakMap(), lastSet = new WeakMap(), origAttr = new WeakMap();
  var ATTRS = ['placeholder','aria-label','title'];
  var lang = 'en', queued = false, obs = null, saved = null, arBox = null;
  function norm(s){ return String(s).replace(/\s+/g, ' ').trim(); }
  function tr(s){ var k = norm(s); return k && Object.prototype.hasOwnProperty.call(D, k) ? D[k] : null; }

  function toAr(root){
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while((n = w.nextNode())){
      var p = n.parentElement;
      if(!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || p.closest('[data-notr]')) continue;
      var cur = n.nodeValue;
      if(origText.has(n) && lastSet.get(n) === cur) continue;
      var t = tr(cur);
      if(t != null){
        origText.set(n, cur); lastSet.set(n, t); n.nodeValue = t;
        var blk = p.closest('.faq-item,.post-body,.page-hero,.m4-sec,.faq-cta');
        if(blk) blk.setAttribute('dir', 'rtl');
      }
    }
    Array.prototype.forEach.call(root.querySelectorAll('[placeholder],[aria-label],[title]'), function(el){
      if(el.closest('[data-notr]')) return;
      var st = origAttr.get(el) || {};
      ATTRS.forEach(function(a){
        if(!el.hasAttribute(a)) return;
        var cur = el.getAttribute(a);
        if(st[a] && st[a].set === cur) return;
        var t = tr(cur);
        if(t != null){ st[a] = { orig:cur, set:t }; el.setAttribute(a, t); }
      });
      origAttr.set(el, st);
    });
  }
  function toEn(root){
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while((n = w.nextNode())){ if(origText.has(n)){ n.nodeValue = origText.get(n); origText.delete(n); lastSet.delete(n); } }
    Array.prototype.forEach.call(root.querySelectorAll('[placeholder],[aria-label],[title]'), function(el){
      var st = origAttr.get(el); if(!st) return;
      ATTRS.forEach(function(a){ if(st[a]) el.setAttribute(a, st[a].orig); });
      origAttr.delete(el);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[dir="rtl"]'), function(el){ if(el !== arBox) el.removeAttribute('dir'); });
  }

  /* swap the whole article body for its hand-written Arabic version */
  function swapArticle(toArabic){
    if(!tpl) return;
    var art = document.querySelector('article.m4-art'); if(!art) return;
    var sec = art.querySelector('.m4-sec');
    if(toArabic && !arBox){
      saved = document.createDocumentFragment();
      while(art.firstChild && art.firstChild !== sec) saved.appendChild(art.firstChild);
      arBox = document.createElement('div');
      arBox.className = 'ar-article'; arBox.setAttribute('dir', 'rtl'); arBox.setAttribute('lang', 'ar');
      arBox.appendChild(tpl.content.cloneNode(true));
      art.insertBefore(arBox, sec);
    }else if(!toArabic && arBox){
      art.insertBefore(saved, arBox); arBox.remove(); arBox = null; saved = null;
    }
  }

  function run(){ queued = false; if(lang !== 'ar') return; if(obs) obs.disconnect(); toAr(document.body); if(obs) watch(); }
  function schedule(){ if(queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(run); }
  function watch(){ obs.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATTRS }); }

  function setLang(l){
    lang = l;
    try{ localStorage.setItem(KEY, l); }catch(e){}
    document.documentElement.setAttribute('lang', l);
    var b = document.getElementById('langToggle');
    if(b){
      b.textContent = l === 'ar' ? 'EN' : 'عربي';
      b.setAttribute('aria-label', l === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
      b.setAttribute('title', b.getAttribute('aria-label'));
    }
    if(!obs) obs = new MutationObserver(schedule);
    if(l === 'ar'){ swapArticle(true); run(); watch(); }
    else { obs.disconnect(); toEn(document.body); swapArticle(false); }
  }

  var theme = document.getElementById('themeToggle');
  var btn = document.getElementById('langToggle');
  if(!btn && theme){
    btn = document.createElement('button');
    btn.id = 'langToggle'; btn.type = 'button'; btn.className = 'lang-toggle';
    btn.setAttribute('data-notr', ''); btn.textContent = 'عربي';
    btn.setAttribute('aria-label', 'التبديل إلى العربية'); btn.setAttribute('title', 'التبديل إلى العربية');
    theme.parentNode.insertBefore(btn, theme);
  }
  if(btn) btn.addEventListener('click', function(){ setLang(lang === 'ar' ? 'en' : 'ar'); });
  var pref = null; try{ pref = localStorage.getItem(KEY); }catch(e){}
  if(pref === 'ar') setLang('ar');
})();
