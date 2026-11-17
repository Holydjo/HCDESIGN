(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Language (English / Canadian French) ---------- */
  const I18N = {
    en: {
      docTitle: 'HCDESIGN — Commercial interiors · Canada',
      loading: 'Loading…', loaderCap: 'Commercial interiors · Canada by HCDESIGN',
      logoAria: 'HCDESIGN — home', langAria: 'Language', menuAria: 'Toggle menu', navAria: 'Main', toneAria: 'Toggle menu colour',
      gallery: 'Gallery', scroll: 'Scroll', title1: 'Crafted', title2: 'Interiors',
      tagline: 'Commercial interiors · Canada', viewAll: 'View all projects', view: 'View',
      navHome: 'Home', navProjects: 'Projects', navAbout: 'About', navContact: 'Contact',
      blurb: 'Calm, considered workplaces with a warm northern character, shaped around the people who use them.',
      footIndex: 'Project index', footTouch: 'Get in touch', back: '← Back',
      aboutKicker: 'Studio profile', aboutHead: 'Warm, modern workplaces with a northern point of view.',
      aboutP1: 'HCDESIGN is a commercial interior design studio working across Canada. We plan and design offices, studios and shared spaces that feel calm on a Monday and still look right in ten years.',
      aboutP2: 'Every project starts with how a team really works. From there we draw the plan, choose honest materials, and stay on site until the last light is hung.',
      servicesHead: 'What we do', svc1: 'Workplace strategy', svc2: 'Interior architecture', svc3: 'Furniture & lighting', svc4: 'Site supervision',
      contactKicker: 'Get in touch', contactHead: 'Tell us about your space.',
      contactNote: 'Projects across Canada · Service in English and French',
    },
    fr: {
      docTitle: 'HCDESIGN — Intérieurs commerciaux · Canada',
      loading: 'Chargement…', loaderCap: 'Intérieurs commerciaux · Canada par HCDESIGN',
      logoAria: 'HCDESIGN — accueil', langAria: 'Langue', menuAria: 'Ouvrir ou fermer le menu', navAria: 'Principal', toneAria: 'Changer la couleur du menu',
      gallery: 'Galerie', scroll: 'Défiler', title1: 'Intérieurs', title2: 'Soignés',
      tagline: 'Intérieurs commerciaux · Canada', viewAll: 'Voir tous les projets', view: 'Voir',
      navHome: 'Accueil', navProjects: 'Projets', navAbout: 'À propos', navContact: 'Contact',
      blurb: 'Des milieux de travail calmes et réfléchis, au caractère nordique et chaleureux, pensés pour les gens qui les habitent.',
      footIndex: 'Index des projets', footTouch: 'Nous joindre', back: '← Retour',
      aboutKicker: 'Profil du studio', aboutHead: 'Des milieux de travail chaleureux et modernes, au regard nordique.',
      aboutP1: 'HCDESIGN est un studio de design d’intérieurs commerciaux actif partout au Canada. Nous planifions et concevons des bureaux, des ateliers et des espaces partagés, apaisants le lundi matin et encore justes dans dix ans.',
      aboutP2: 'Chaque projet part de la façon dont une équipe travaille vraiment. Nous dessinons ensuite le plan, choisissons des matériaux honnêtes et restons sur le chantier jusqu’à la pose du dernier luminaire.',
      servicesHead: 'Nos services', svc1: 'Stratégie d’aménagement', svc2: 'Architecture intérieure', svc3: 'Mobilier et éclairage', svc4: 'Surveillance de chantier',
      contactKicker: 'Nous joindre', contactHead: 'Parlez-nous de votre espace.',
      contactNote: 'Projets partout au Canada · Service en français et en anglais',
    },
  };
  const store = { get: () => { try { return localStorage.getItem('hc-lang'); } catch { return null; } }, set: (v) => { try { localStorage.setItem('hc-lang', v); } catch {} } };
  function setLang(lang) {
    const t = I18N[lang] || I18N.en;
    document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
    document.title = t.docTitle;
    $$('[data-i18n]').forEach((el) => { el.textContent = t[el.dataset.i18n]; });
    $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t[el.dataset.i18nAria]));
    $$('.lang__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  const param = new URLSearchParams(location.search).get('lang');
  const initial = ['en', 'fr'].includes(param) ? param : store.get() || ((navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  setLang(initial);
  $$('.lang__btn').forEach((b) => b.addEventListener('click', () => { setLang(b.dataset.lang); store.set(b.dataset.lang); }));

  /* ---------- Loader ---------- */
  const num = $('.loader__num'), bar = $('.loader__bar');
  const ready = () => { body.classList.remove('is-loading'); body.classList.add('is-ready'); };
  if (reduce) { num.textContent = '100'; bar.style.transform = 'none'; ready(); }
  else {
    const t0 = Date.now(), D = 1800;
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / D), e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(e * 100);
      bar.style.transform = `scaleX(${e})`;
      if (p === 1) { clearInterval(timer); setTimeout(ready, 300); }
    }, 30);
  }

  const cursor = $('.cursor');

  /* ---------- Slides ---------- */
  const card = $('.card'), slides = $$('.slide'), count = $('#count');
  $('#total').textContent = slides.length;
  let index = 0, locked = false;
  const atHome = () => body.dataset.view === 'home' && !menu.classList.contains('is-open') && !body.classList.contains('is-loading');
  function go(dir) {
    if (locked || !atHome()) return;
    const next = (index + dir + slides.length) % slides.length;
    locked = true;
    card.dataset.dir = dir > 0 ? 'next' : 'prev';
    slides.forEach((s) => s.classList.remove('is-prev'));
    void card.offsetWidth; // let the incoming slide take its starting position
    slides[index].classList.replace('is-active', 'is-prev');
    slides[next].classList.add('is-active');
    slides.forEach((s, n) => { s.tabIndex = n === next ? 0 : -1; s.setAttribute('aria-hidden', String(n !== next)); });
    index = next;
    count.textContent = index + 1;
    document.documentElement.style.setProperty('--bg', slides[index].dataset.bg);
    setTimeout(() => { locked = false; }, reduce ? 50 : 1100);
  }
  addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) >= 8) go(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeMenu();
    if (e.target.closest('button')) return;
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) go(1);
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) go(-1);
  });
  let touchY = null;
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY; touchY = null;
    if (Math.abs(dy) > 40) go(dy > 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- Menu ---------- */
  const menu = $('#menu'), menuBtn = $('.menu-btn'), menuNum = $('.menu__num'), menuLinks = $$('.menu__list a');
  function openMenu() {
    menu.classList.add('is-open'); menu.inert = false; menuBtn.setAttribute('aria-expanded', 'true');
    cursor.classList.remove('is-big');
    markCurrent();
  }
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open'); menu.inert = true; menuBtn.setAttribute('aria-expanded', 'false');
  }
  function markCurrent() {
    menuLinks.forEach((a) => {
      const on = a.getAttribute('href') === '#' + body.dataset.view;
      a.toggleAttribute('aria-current', on); if (on) { a.setAttribute('aria-current', 'page'); menuNum.textContent = a.dataset.n; }
    });
  }
  menuBtn.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
  menuLinks.forEach((a) => {
    const show = () => { menuNum.textContent = a.dataset.n; };
    a.addEventListener('mouseenter', show); a.addEventListener('focus', show);
  });
  $('.menu__list').addEventListener('mouseleave', markCurrent);
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  $('.logo').addEventListener('click', closeMenu);
  const tone = $('.menu__tone');
  tone.addEventListener('click', () => {
    const warm = menu.dataset.tone !== 'warm';
    if (warm) menu.dataset.tone = 'warm'; else delete menu.dataset.tone;
    tone.setAttribute('aria-pressed', String(warm));
  });

  /* ---------- Sheets (projects, about, contact) ---------- */
  const sheets = $$('.sheet'), stage = $('.stage');
  function route() {
    const id = location.hash.slice(1);
    const open = sheets.find((s) => s.id === id);
    sheets.forEach((s) => { s.hidden = s !== open; });
    body.dataset.view = open ? id : 'home';
    stage.inert = Boolean(open);
    closeMenu(); markCurrent();
    cursor.classList.remove('is-big');
    if (open) { open.scrollTop = 0; $('h2', open).focus({ preventScroll: true }); }
  }
  addEventListener('hashchange', route);
  route();

  /* ---------- Cursor ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('mousemove', (e) => {
      cursor.classList.add('is-on');
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      cursor.classList.toggle('is-big', Boolean(e.target.closest && e.target.closest('.slide')) && atHome());
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  }
})();
