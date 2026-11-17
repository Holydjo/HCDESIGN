// Drives a real headless Chrome over the DevTools protocol and runs the remake checks.
// Usage: node tools/check.mjs http://localhost:4174/ report
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] || 'http://localhost:4174/';
const OUT = process.argv[3] || 'report';
const PORT = 9334;
const profile = mkdtempSync(join(tmpdir(), 'hcdesign-check-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--lang=en-CA', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value).join(' '));
  if (msg.method === 'Network.loadingFailed') errors.push('network: ' + msg.params.errorText);
  if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) errors.push(`http ${msg.params.response.status}: ${msg.params.response.url}`);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.result.data, 'base64'));
};
const wheel = (deltaY) => send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 400, deltaX: 0, deltaY });
const key = async (k, code) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code });
};
const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
const click = async (selector) => {
  const p = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
};

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');

async function load(width, height, query = '') {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await send('Page.navigate', { url: URL_ + '?t=' + Date.now() + query });
  await sleep(500);
}
const state = () => evaluate(`({
  count: document.querySelector('#count').textContent,
  bg: getComputedStyle(document.querySelector('.stage')).backgroundColor,
  active: [...document.querySelectorAll('.slide')].findIndex((s) => s.classList.contains('is-active')),
})`);

const R = {};

// ---------- 1. Loader ----------
await load(1280, 800, '&lang=en');
R.loader = await evaluate(`(() => { const l = document.querySelector('.loader'); return {
  shownAtStart: document.body.classList.contains('is-loading') && getComputedStyle(l).opacity === '1',
  hasRing: !!l.querySelector('.loader__ring'), hasLine: !!l.querySelector('.loader__bar'),
  pctAtStart: +l.querySelector('.loader__num').textContent }; })()`);
await shot('01-loader.png');
await sleep(4200);
Object.assign(R.loader, await evaluate(`(() => { const l = document.querySelector('.loader'); return {
  pctAtEnd: +l.querySelector('.loader__num').textContent,
  goneAfter: !document.body.classList.contains('is-loading') && getComputedStyle(l).visibility === 'hidden' }; })()`));

// ---------- 2. Home stage ----------
R.stage = await evaluate(`(() => {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
  const rect = (s) => q(s).getBoundingClientRect();
  const t = rect('.title'), c = rect('.card');
  return {
    brand: q('.logo').textContent.trim(), docTitle: document.title,
    noNameOfReference: !/liron|moran/i.test(document.documentElement.outerHTML),
    titleLines: qa('.title__line').map((l) => l.textContent.trim()),
    titleRevealed: qa('.title__line > span').every((el) => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) < 1),
    titleIsSerif: /didot|bodoni|playfair|times|georgia|serif/i.test(getComputedStyle(q('.title')).fontFamily),
    titleFits: t.left >= 0 && t.right <= innerWidth,
    titleWidthShare: +(t.width / innerWidth).toFixed(2),
    slides: qa('.slide').length,
    slideNames: qa('.slide').map((s) => s.getAttribute('aria-label')),
    cardRevealed: getComputedStyle(q('.card')).clipPath === 'inset(0px)',
    cardCentred: Math.abs(c.left + c.width / 2 - innerWidth / 2) < 2 && Math.abs(c.top + c.height / 2 - innerHeight / 2) < 2,
    cardPortrait: c.height > c.width,
    cardOverlapsTitle: c.left > t.left && c.right < t.right && c.top < t.top + 20 && c.bottom > t.bottom - 20,
    bothTitleLinesShowBesideCard: qa('.title__line > span').every((l) => { const r = document.createRange(); r.selectNodeContents(l); const b = r.getBoundingClientRect(); return b.left < c.left - 12 && b.right > c.right + 12; }),
    cardAboveTitle: document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('.card') !== null,
    counter: q('.stage__count').textContent.replace(/\\s+/g, ' ').trim(),
    scrollLabel: q('.stage__scroll').textContent.trim(),
    tagline: q('.foot__tag').textContent.trim(), viewAll: q('.foot__all').textContent.trim(), year: q('.foot__year').textContent.trim(),
    headerItems: { logo: !!q('.header .logo'), gallery: !!q('.header__link'), menuButton: !!q('.menu-btn'), langSwitch: qa('.lang__btn').length },
    singleScreen: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth,
  };
})()`);
await shot('02-home.png');

// ---------- 3. Slides ----------
const s0 = await state();
await wheel(120); await sleep(1500); const s1 = await state();
await shot('03-slide-2.png');
await wheel(120); await sleep(1500); const s2 = await state();
await shot('04-slide-3.png');
await wheel(120); await sleep(1500); const s3 = await state();
await wheel(-120); await sleep(1500); const s4 = await state();
await key('ArrowDown', 40); await sleep(1500); const s5 = await state();
await key('ArrowUp', 38); await sleep(1500); const s6 = await state();
R.slides = {
  sequence: [s0, s1, s2, s3, s4, s5, s6].map((s) => s.count).join(' '),
  wheelAdvances: s0.count === '1' && s1.count === '2' && s2.count === '3',
  loopsForward: s3.count === '1' && s3.active === 0,
  loopsBackward: s4.count === '3' && s4.active === 2,
  keyboard: s5.count === '1' && s6.count === '3',
  threeBackgrounds: new Set([s0.bg, s1.bg, s2.bg]).size === 3,
  backgrounds: [s0.bg, s1.bg, s2.bg],
  onlyActiveFocusable: await evaluate(`[...document.querySelectorAll('.slide')].filter((s) => s.tabIndex === 0).length === 1`),
};
await key('ArrowDown', 40); await sleep(1500); // back to slide 1

// ---------- 4. Cursor ----------
await move(200, 200); await sleep(500);
const small = await evaluate(`(() => { const c = document.querySelector('.cursor'); const r = c.getBoundingClientRect(); return { on: c.classList.contains('is-on'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) }; })()`);
await move(640, 400); await sleep(700);
const big = await evaluate(`(() => { const c = document.querySelector('.cursor'); return { big: c.classList.contains('is-big'), w: Math.round(c.getBoundingClientRect().width), label: c.textContent.trim() }; })()`);
R.cursor = { follows: small.on && small.x === 200 && small.y === 200, growsOverImage: big.big && big.w > small.w * 3, label: big.label };

// ---------- 5. Menu ----------
await click('.menu-btn'); await sleep(1400);
R.menu = await evaluate(`(() => {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
  const m = q('.menu'), r = m.getBoundingClientRect();
  return {
    expanded: q('.menu-btn').getAttribute('aria-expanded') === 'true',
    coversScreen: getComputedStyle(m).clipPath === 'inset(0px)' && r.width === innerWidth && r.height === innerHeight,
    black: getComputedStyle(m).backgroundColor,
    links: qa('.menu__list a').map((a) => a.textContent.replace('→', '').trim()),
    linksRisen: qa('.menu__list a').every((a) => Math.abs(new DOMMatrix(getComputedStyle(a).transform).m42) < 1),
    linksAreLarge: parseFloat(getComputedStyle(q('.menu__list a')).fontSize) >= 70,
    currentMarked: q('.menu__list a[aria-current]')?.getAttribute('href'),
    number: q('.menu__num').textContent, blurb: q('.menu__blurb').textContent.length > 40,
    cursorResets: !q('.cursor').classList.contains('is-big'),
    headerOnTop: document.elementFromPoint(q('.menu-btn').getBoundingClientRect().x + 19, q('.menu-btn').getBoundingClientRect().y + 19).closest('.menu-btn') !== null,
  };
})()`);
await shot('05-menu.png');
const third = await evaluate(`(() => { const r = document.querySelectorAll('.menu__list a')[2].getBoundingClientRect(); return { x: r.x + 60, y: r.y + r.height / 2 }; })()`);
await move(third.x, third.y); await sleep(700);
R.menu.numberFollowsHover = await evaluate(`document.querySelector('.menu__num').textContent`) === '03';
R.menu.arrowOnHover = await evaluate(`document.querySelectorAll('.menu__arrow')[2].getBoundingClientRect().width > 10`);
await wheel(120); await sleep(300);
R.menu.wheelIgnoredWhileOpen = (await state()).count === '1';
await click('.menu__tone'); await sleep(800);
R.menu.toneToggle = await evaluate(`getComputedStyle(document.querySelector('.menu')).backgroundColor`) !== R.menu.black;
await click('.menu__tone'); await sleep(800);
await key('Escape', 27); await sleep(1200);
R.menu.closesOnEscape = await evaluate(`document.querySelector('.menu-btn').getAttribute('aria-expanded') === 'false' && getComputedStyle(document.querySelector('.menu')).visibility === 'hidden' && document.querySelector('.menu').inert`);

// ---------- 6. Inner views reached from the menu ----------
R.views = {};
for (const view of ['projects', 'about', 'contact']) {
  await click('.menu-btn'); await sleep(1300);
  await click(`.menu__list a[href="#${view}"]`); await sleep(1300);
  R.views[view] = await evaluate(`(() => { const s = document.getElementById(${JSON.stringify(view)}); const r = s.getBoundingClientRect(); return {
    shown: !s.hidden && r.width === innerWidth && document.body.dataset.view === ${JSON.stringify(view)},
    menuClosed: document.querySelector('.menu-btn').getAttribute('aria-expanded') === 'false',
    heading: s.querySelector('h2').textContent.trim(),
    focusOnHeading: document.activeElement === s.querySelector('h2'),
    items: s.querySelectorAll('.plist li, .sheet__tags li').length,
  }; })()`);
  if (view === 'projects') await shot('06-projects.png');
}
await click('#contact .sheet__back'); await sleep(900);
R.views.backHome = await evaluate(`document.body.dataset.view === 'home' && [...document.querySelectorAll('.sheet')].every((s) => s.hidden)`);
R.views.linksResolve = await evaluate(`[...document.querySelectorAll('a[href^="#"]')].every((a) => document.getElementById(a.getAttribute('href').slice(1)))`);
R.views.noExternalLinks = await evaluate(`[...document.querySelectorAll('a[href]')].every((a) => /^(#|mailto:)/.test(a.getAttribute('href')))`);

// ---------- 7. French ----------
await click('.lang__btn[data-lang="fr"]'); await sleep(500);
R.french = await evaluate(`(() => {
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
  const t = q('.title').getBoundingClientRect();
  return {
    htmlLang: document.documentElement.lang, docTitle: document.title,
    titleLines: qa('.title__line').map((l) => l.textContent.trim()),
    titleFits: t.left >= 0 && t.right <= innerWidth,
    tagline: q('.foot__tag').textContent.trim(), viewAll: q('.foot__all').textContent.trim(),
    menu: qa('.menu__list a').map((a) => a.textContent.replace('→', '').trim()),
    pressed: q('.lang__btn[data-lang="fr"]').getAttribute('aria-pressed') === 'true',
    ariaTranslated: q('.menu-btn').getAttribute('aria-label'),
    nothingLeftUntranslated: qa('[data-i18n]').every((el) => el.textContent.trim().length > 0 && el.textContent !== 'undefined'),
    remembered: localStorage.getItem('hc-lang'),
  };
})()`);
await shot('07-french.png');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() }); await sleep(3500);
R.french.keptAfterReload = await evaluate(`document.documentElement.lang === 'fr-CA' && document.querySelector('.title').textContent.includes('Soignés')`);
await click('.lang__btn[data-lang="en"]'); await sleep(300);
R.french.switchesBack = await evaluate(`document.documentElement.lang === 'en-CA' && document.querySelector('.foot__all').textContent === 'View all projects'`);
R.french.keysMatch = await evaluate(`(async () => { const src = await (await fetch('main.js')).text(); const grab = (l) => { const m = src.match(new RegExp(l + ': \\\\{([\\\\s\\\\S]*?)\\\\n    \\\\},')); return [...m[1].matchAll(/(\\w+): '/g)].map((x) => x[1]).sort().join(); }; const used = [...new Set([...document.querySelectorAll('[data-i18n]')].map((e) => e.dataset.i18n).concat([...document.querySelectorAll('[data-i18n-aria]')].map((e) => e.dataset.i18nAria)))]; return grab('en') === grab('fr') && used.every((k) => grab('fr').split(',').includes(k)); })()`);

// ---------- 8. Canada ----------
R.canada = await evaluate(`(() => { const text = document.body.textContent; return {
  taglineNamesCanada: /Canada/.test(document.querySelector('.foot__tag').textContent),
  projectPlaces: [...document.querySelectorAll('.plist__meta')].map((m) => m.textContent.split(' · ')[0]),
  allProjectsInCanada: [...document.querySelectorAll('.plist__meta')].every((m) => /, (QC|ON|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU) /.test(m.textContent)),
  canadianSpelling: /colour/i.test(document.querySelector('.menu__tone').getAttribute('aria-label')),
  noSingapore: !/singapore/i.test(text),
}; })()`);

// ---------- 9. Other widths ----------
R.widths = [];
for (const [w, h, name] of [[768, 1024, 'tablet'], [375, 720, 'phone']]) {
  for (const lang of ['en', 'fr']) {
    await load(w, h, '&lang=' + lang); await sleep(3200);
    const res = await evaluate(`(() => { const q = (s) => document.querySelector(s); const t = q('.title').getBoundingClientRect(), c = q('.card').getBoundingClientRect(); const b = q('.menu-btn').getBoundingClientRect(); return {
      width: innerWidth, lang: document.documentElement.lang,
      noScroll: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
      titleFits: t.left >= 0 && t.right <= innerWidth,
      bothTitleLinesShowBesideCard: [...document.querySelectorAll('.title__line > span')].every((l) => { const r = document.createRange(); r.selectNodeContents(l); const b = r.getBoundingClientRect(); return b.left < c.left - 12 && b.right > c.right + 12; }),
      cardFits: c.left >= 0 && c.right <= innerWidth && c.top > 60 && c.bottom < innerHeight - 40,
      menuButtonReachable: b.right <= innerWidth && b.width >= 36,
      loaderGone: !document.body.classList.contains('is-loading'),
    }; })()`);
    await click('.menu-btn'); await sleep(1300);
    res.menuFits = await evaluate(`[...document.querySelectorAll('.menu__list a')].every((a) => { const r = a.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })`);
    if (lang === 'fr') await shot(`08-${name}-menu.png`);
    await key('Escape', 27); await sleep(1000);
    if (lang === 'fr') await shot(`08-${name}.png`);
    R.widths.push(res);
  }
}
// touch swipe on phone
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 500 }] });
await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 300 }] });
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await sleep(1500);
R.swipeAdvances = (await state()).count === '2';
await send('Emulation.setTouchEmulationEnabled', { enabled: false });

// ---------- 10. Reduced motion ----------
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await load(1280, 800, '&lang=en'); await sleep(700);
R.reducedMotion = await evaluate(`({
  loaderSkipped: !document.body.classList.contains('is-loading'),
  titleShown: [...document.querySelectorAll('.title__line > span')].every((el) => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) < 1),
})`);
await wheel(120); await sleep(400);
R.reducedMotion.slidesStillWork = (await state()).count === '2';

R.consoleErrors = errors;

// ---------- Verdict ----------
const failures = [];
(function walk(o, path) {
  for (const [k, v] of Object.entries(o)) {
    if (v === false) failures.push(path + k);
    else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path + k + '.');
    else if (Array.isArray(v)) v.forEach((x, i) => x && typeof x === 'object' && walk(x, `${path}${k}[${i}].`));
  }
})(R, '');
const expect = (ok, name) => { if (!ok) failures.push(name); };
expect(R.loader.pctAtStart < 100 && R.loader.pctAtEnd === 100, 'loader counter 0→100');
expect(R.stage.brand === 'HCDESIGN' && R.stage.docTitle.startsWith('HCDESIGN'), 'brand is HCDESIGN');
expect(R.stage.titleLines.length === 2 && R.stage.slides === 3 && R.stage.counter === '1 – 3', 'two title lines, three slides, counter');
expect(R.stage.headerItems.langSwitch === 2, 'language switch');
expect(R.menu.links.join() === 'Home,Projects,About,Contact' && R.menu.currentMarked === '#home' && R.menu.number === '01', 'menu content');
expect(R.views.projects.items === 6 && R.views.about.items === 4, 'inner view content');
expect(R.french.htmlLang === 'fr-CA' && R.french.menu.join() === 'Accueil,Projets,À propos,Contact' && R.french.remembered === 'fr', 'french content');
expect(R.consoleErrors.length === 0, 'no console or network errors');
R.failures = failures;
R.verdict = failures.length === 0 ? 'ALL CHECKS PASSED' : 'FAILED';

writeFileSync(join(OUT, 'result.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 2));
ws.close(); chrome.kill();
process.exit(failures.length ? 1 : 0);
