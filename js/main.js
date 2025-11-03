// INITIALE AUTO RENT – Main JS
(function(){
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));

  // Language/i18n
  const langSelect = $('#lang');
  const getLang = () => { try { return localStorage.getItem('lang') || document.documentElement.dataset.lang || 'en'; } catch(e){ return 'en'; } };
  const setLang = (l) => { try { localStorage.setItem('lang', l); } catch(e){}; document.documentElement.lang = l; document.documentElement.dir = (l==='ar'?'rtl':'ltr'); };
  const applyTranslations = (dict) => {
    $$('[data-i18n]').forEach(node => {
      const key = node.getAttribute('data-i18n');
      if(dict[key]) node.textContent = dict[key];
    });
  };
  const loadLang = async (l) => {
    try {
      const res = await fetch(`i18n/${l}.json`, {cache:'no-store'});
      if(!res.ok) throw new Error('lang fetch');
      const dict = await res.json();
      applyTranslations(dict);
    } catch(e){ /* ignore, default EN text */ }
  };
  const initLang = () => {
    const l = getLang();
    if(langSelect){ langSelect.value = l; langSelect.addEventListener('change', ()=>{ const v=langSelect.value; setLang(v); loadLang(v); }); }
    setLang(l); loadLang(l);
  };

  // Mobile nav toggle + basic focus trap
  const initNav = () => {
    const toggle = $('.nav-toggle');
    const nav = $('[data-nav]');
    if(!toggle || !nav) return;
    let open = false; let lastFocus = null;
    const focusables = () => $$('a, button, select, input, [tabindex]:not([tabindex="-1"])', nav).filter(el=>!el.hasAttribute('disabled'));
    const setState = (state) => {
      open = state; toggle.setAttribute('aria-expanded', String(open)); nav.setAttribute('aria-hidden', String(!open));
      nav.classList.toggle('open', open);
      if(open){ lastFocus = document.activeElement; (focusables()[0]||nav).focus(); document.body.style.overflow='hidden'; }
      else { document.body.style.overflow='auto'; if(lastFocus) lastFocus.focus(); }
    };
    setState(false);
    toggle.addEventListener('click', ()=> setState(!open));
    document.addEventListener('keydown', (e)=>{
      if(!open) return;
      if(e.key==='Escape'){ setState(false); }
      if(e.key==='Tab'){
        const f = focusables(); if(!f.length) return;
        const i = f.indexOf(document.activeElement);
        if(e.shiftKey && (i<=0 || document.activeElement===nav)){ e.preventDefault(); f[f.length-1].focus(); }
        else if(!e.shiftKey && (i===f.length-1)){ e.preventDefault(); f[0].focus(); }
      }
    });
  };

  // Gallery lightbox (ESC closes, focus trap)
  const initLightbox = () => {
    const lb = $('.lightbox'); if(!lb) return;
    const img = $('img', lb); const closeBtn = $('.lightbox-close', lb);
    let active = false; let lastFocus = null;
    const open = (src, alt='') => { img.src = src; img.alt = alt; lb.hidden = false; active = true; lastFocus = document.activeElement; closeBtn.focus(); document.body.style.overflow='hidden'; };
    const close = () => { active = false; lb.hidden = true; img.src=''; img.alt=''; document.body.style.overflow='auto'; if(lastFocus) lastFocus.focus(); };
    document.addEventListener('click',(e)=>{
      const a = e.target.closest('a.lightbox-trigger, .card-media');
      if(a && a.getAttribute('href')){ const image = a.getAttribute('href'); const alt = $('img', a)?.alt || ''; if(image){ e.preventDefault(); open(image, alt);} }
      if(active && (e.target===lb)) close();
    });
    closeBtn?.addEventListener('click', close);
    document.addEventListener('keydown',(e)=>{ if(active && e.key==='Escape') close(); });
  };

  // Dynamic gallery population from /img/manifest.json
  const initDynamicGallery = async () => {
    const grids = $$('.gallery .grid');
    if(!grids.length) return;
    try {
      const res = await fetch('img/manifest.json', {cache: 'no-store'});
      if(!res.ok) return;
      const data = await res.json();
      let list = (data.images || data || []);
      list = list
        .map(it => typeof it === 'string' ? { src: it } : it)
        .filter(it => it && typeof it.src === 'string')
        // photos only for gallery (avoid SVG placeholders)
        .filter(it => /\.(jpe?g|png|webp|avif)$/i.test(it.src));
      const seen = new Set();
      list = list.filter(({src}) => { if(src.includes('og-default')) return false; if(seen.has(src)) return false; seen.add(src); return true; });
      const extRank = (s) => (/\.(jpe?g|png|webp|avif)$/i.test(s) ? 0 : 1);
      const numPart = (s) => { const b = s.split('/').pop(); const m = b.match(/(\d+)/g); return m ? parseInt(m[m.length-1],10) : Number.MAX_SAFE_INTEGER; };
      const namePart = (s) => s.split('/').pop().toLowerCase();
      list.sort((a,b)=>{ const ea=extRank(a.src), eb=extRank(b.src); if(ea!==eb) return ea-eb; const na=numPart(a.src), nb=numPart(b.src); if(na!==nb) return na-nb; return namePart(a.src) < namePart(b.src) ? -1 : 1; });
      if(!list.length) return;
      const makeAlt = (p) => { const name = p.split('/').pop().replace(/\.[^.]+$/, ''); return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c=>c.toUpperCase()); };
      const addImage = (grid, src) => {
        const a = document.createElement('a'); a.href = src; a.className = 'lightbox-trigger pending';
        const img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.alt = makeAlt(src);
        img.addEventListener('load', () => { if(img.naturalWidth < 32 || img.naturalHeight < 32) { a.remove(); return; } img.width = img.naturalWidth; img.height = img.naturalHeight; a.classList.remove('pending'); }, {once:true});
        img.addEventListener('error', () => { a.remove(); }, {once:true});
        img.src = src; a.appendChild(img); grid.appendChild(a);
      };
      grids.forEach(grid => { grid.innerHTML=''; list.forEach(it => addImage(grid, it.src)); });
    } catch(e){ /* ignore if manifest missing */ }
  };

  // Hero parallax (very light) for no-preference
  const initHeroParallax = () => {
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const car = $('.hero-car'); if(!car) return;
    let ticking=false; const onScroll=()=>{ if(ticking) return; ticking=true; requestAnimationFrame(()=>{ const y=window.scrollY||0; const dx=Math.min(30, y/20); car.style.transform=`translateX(${dx}%)`; ticking=false; }); };
    window.addEventListener('scroll', onScroll, {passive:true});
  };

  // Init
  document.addEventListener('DOMContentLoaded', ()=>{
    initLang();
    initNav();
    initLightbox();
    initDynamicGallery();
    initHeroParallax();
    if(typeof initSpeedometer === 'function') initSpeedometer();
    if(typeof initHeroSlider === 'function') initHeroSlider();
    initImageFallbacks();
    // Year in footer (if present on this page handled inline on index)
    const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();
  });
})();

// Speedometer animation in hero (outside IIFE for simple hoisting)
function initSpeedometer(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const svg = document.getElementById('speedo'); if(!svg) return;
  const needle = svg.querySelector('.speedo-needle'); if(!needle) return;
  const label = svg.querySelector('.speedo-label');
  const map = (v,inMin,inMax,outMin,outMax)=> outMin + (v-inMin)*(outMax-outMin)/(inMax-inMin);
  let played = false; const target = +(svg.getAttribute('data-speed')||60);
  const run = ()=>{
    if(played) return; played = true;
    let cur = 0; const end = Math.max(0, Math.min(100, target));
    const startAngle = -100, endAngle = 80;
    const step = ()=>{
      cur += (end-cur)*0.08 + 0.4; // ease-out
      if(cur > end-0.2) cur = end;
      const deg = map(cur, 0, 100, startAngle, endAngle);
      needle.style.transform = `rotate(${deg}deg)`;
      if(label) label.textContent = Math.round(cur).toString();
      if(cur < end) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries, obs)=>{
    if(entries.some(e=>e.isIntersecting)) { run(); obs.disconnect(); }
  }, {threshold: 0.4});
  io.observe(svg);
}

// Hero image slider (uses manifest photos). Reduced-motion disables auto.
function initHeroSlider(){
  const el = document.getElementById('hero-slider'); if(!el) return;
  const slidesWrap = el.querySelector('.slides');
  const dotsWrap = el.querySelector('.dots') || (()=>{ const d=document.createElement('div'); d.className='dots'; el.appendChild(d); return d; })();
  const prevBtn = el.querySelector('.prev');
  const nextBtn = el.querySelector('.next');
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FALLBACKS = [
    'img/pexels-mikebirdy-112460.jpg',
    'img/pexels-pixabay-248747.jpg',
    'img/pexels-mikebirdy-170811.jpg'
  ];
  let list = [];
  let idx = 0; let timer = null;

  const setActive = (i) => {
    const slides = Array.from(slidesWrap.querySelectorAll('.slide'));
    const dots = Array.from(dotsWrap.querySelectorAll('.dot'));
    slides.forEach((sl, j)=> sl.classList.toggle('is-active', i===j));
    dots.forEach((dot, j)=> dot.classList.toggle('is-active', i===j));
  };
  const go = (i) => { idx = (i+list.length)%list.length; setActive(idx); };
  const next = () => go(idx+1);
  const prev = () => go(idx-1);
  const start = () => { if(prefersReduce) return; stop(); timer = setInterval(next, 4000); };
  const stop = () => { if(timer) { clearInterval(timer); timer=null; } };

  const build = (sources) => {
    slidesWrap.innerHTML = ''; dotsWrap.innerHTML = '';
    const rate = { economy:250, compact:320, suv:550, luxury:900 };
    const inferCategory = (s) => {
      s = s.toLowerCase(); if(/suv/.test(s)) return 'SUV'; if(/compact/.test(s)) return 'Compact'; if(/lux/.test(s)) return 'Luxury'; if(/econ|small/.test(s)) return 'Economy'; return 'Featured';
    };
    sources.slice(0,6).forEach(srcOrObj => {
      const item = typeof srcOrObj === 'string' ? {src: srcOrObj} : srcOrObj;
      const src = item.src;
      const cat = item.category || inferCategory(src);
      const p = item.price || (rate[cat.toLowerCase?.() ? cat.toLowerCase() : cat.toString().toLowerCase()] ? `MAD ${rate[cat.toString().toLowerCase()]}/day` : '');
      const slide = document.createElement('figure'); slide.className = 'slide';
      const img = new Image(); img.alt='Featured car photo'; img.loading='eager'; img.decoding='async'; img.src=src; slide.appendChild(img);
      const cap = document.createElement('figcaption'); cap.className='caption';
      const c1 = document.createElement('span'); c1.className='cap-category'; c1.textContent = cat;
      const c2 = document.createElement('span'); c2.className='cap-price'; if(p) c2.textContent = ` ${p}`;
      cap.appendChild(c1); cap.appendChild(c2); slide.appendChild(cap);
      slidesWrap.appendChild(slide);
      const dot = document.createElement('button'); dot.className='dot'; dot.type='button'; dot.setAttribute('aria-label', `Go to slide ${dotsWrap.children.length+1}`); dot.addEventListener('click', ()=>{ go(Array.from(dotsWrap.children).indexOf(dot)); start(); }); dotsWrap.appendChild(dot);
    });
    list = Array.from(slidesWrap.querySelectorAll('.slide'));
    setActive(0); start();
  };

  // Always source from manifest (generated from /img folder)
  fetch('img/manifest.json', {cache:'no-store'})
    .then(r=> r.ok? r.json(): Promise.reject())
    .then(data=>{
      let imgs = (data.images||data||[]).filter(s=> typeof s==='string' && /\.(jpe?g|png|webp|avif)$/i.test(s));
      if(!imgs.length) imgs = FALLBACKS; build(imgs);
    })
    .catch(()=> build(FALLBACKS));

  nextBtn.addEventListener('click', ()=>{ next(); start(); });
  prevBtn.addEventListener('click', ()=>{ prev(); start(); });
  el.addEventListener('mouseenter', stop);
  el.addEventListener('mouseleave', start);
  el.addEventListener('focusin', stop);
  el.addEventListener('focusout', start);
  document.addEventListener('keydown', (e)=>{ if(document.activeElement.closest('#hero-slider')){ if(e.key==='ArrowRight') { e.preventDefault(); next(); } if(e.key==='ArrowLeft'){ e.preventDefault(); prev(); } }});

  // Swipe gestures
  let x0=null,y0=null; const onStart=(e)=>{ const t=e.touches?e.touches[0]:e; x0=t.clientX; y0=t.clientY; }; const onMove=(e)=>{ if(x0===null) return; const t=e.touches?e.touches[0]:e; const dx=t.clientX-x0; const dy=t.clientY-y0; if(Math.abs(dx)>30 && Math.abs(dx)>Math.abs(dy)){ e.preventDefault(); if(dx>0) prev(); else next(); x0=y0=null; start(); } }; const onEnd=()=>{ x0=y0=null; };
  el.addEventListener('touchstart', onStart, {passive:true});
  el.addEventListener('touchmove', onMove, {passive:false});
  el.addEventListener('touchend', onEnd);
}

// Global image fallback to avoid empty/broken images anywhere
function initImageFallbacks(){
  const FALLBACK_SRC = 'img/placeholder.svg';
  document.querySelectorAll('img').forEach(img => {
    const onErr = () => {
      if(img.dataset.fallbackApplied) { img.closest('a, .card, figure')?.classList.add('img-hidden'); img.remove(); return; }
      img.dataset.fallbackApplied = '1';
      img.alt = img.alt || 'Image unavailable';
      img.src = FALLBACK_SRC;
    };
    img.addEventListener('error', onErr);
  });
}
