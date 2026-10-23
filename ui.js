// Road to Legend — UI 기본: 유틸, 이펙트, 아이콘, 홈·생성·아카데미, 허브(커리어 탭)·진행 패널
(function (G) {
'use strict';
const C = G.TC, GM = G.TCG;
const U = G.TCUI = {};
const $ = (s, r = document) => r.querySelector(s);
function h(tag, a, ...kids) {
  const el = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k]; if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'html') el.innerHTML = v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const svg = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
U.h = h; U.svg = svg; U.$ = $;
const sleep = ms => new Promise(r => setTimeout(r, ms));
U.sleep = sleep;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
U.esc = esc;

// ---------- 상태 ----------
let S = null, scr = 'home', tab = 'career', busy = false;
U.S = () => S;
const st = { speed: 'auto', viewIdx: null };
const SPEEDS = [['step', '단계별'], ['auto', '자동'], ['fast', '빠르게'], ['instant', '즉시']];
const normSpeed = v => ({ 1: 'auto', 2: 'fast', 3: 'instant' })[v] || (SPEEDS.some(x => x[0] === v) ? v : 'auto');
U.SPEEDS = SPEEDS; U.normSpeed = normSpeed;
U.st = st;

// ---------- 저장 (IndexedDB, 실패 시 localStorage) ----------
const DBN = 'touchline-career', STN = 'kv';
function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(STN); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function kvSet(k, v) { try { const d = await idb(); await new Promise((res, rej) => { const tx = d.transaction(STN, 'readwrite'); tx.objectStore(STN).put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); return true; } catch (e) { try { localStorage.setItem(k, v); return true; } catch (e2) { return false; } } }
async function kvGet(k) { try { const d = await idb(); return await new Promise((res, rej) => { const r = d.transaction(STN, 'readonly').objectStore(STN).get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); } catch (e) { try { return localStorage.getItem(k); } catch (e2) { return null; } } }
async function kvDel(k) { try { const d = await idb(); await new Promise(res => { const tx = d.transaction(STN, 'readwrite'); tx.objectStore(STN).delete(k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { } try { localStorage.removeItem(k); } catch (e) { } }
U.kvSet = kvSet; U.kvGet = kvGet;
const wageTxt = v => C.fmtWage(v);
U.wageTxt = wageTxt;
let saveT = null, hasSave = false, prevScr = 'home';
U.save = function () { if (!S || S.viewOnly) return; clearTimeout(saveT); saveT = setTimeout(async () => { const t = GM.serialize(S); if (!t) return; const ok = await kvSet('save', t); hasSave = ok; }, 300); };

// ---------- 이펙트 ----------
function countUp(el, a, b, dur = 900, fmt = v => Math.round(v)) {
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(a + (b - a) * e); if (k < 1) requestAnimationFrame(step); };
  if (C.cfg.anim === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(b); return; }
  requestAnimationFrame(step);
}
U.countUp = countUp;
function toast(msg) { const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2200); }
U.toast = toast;
let confParts = [], confRun = false;
function confetti(n = 160, colors) {
  if (!C.cfg.confetti) return;
  const cv = $('#confetti'); if (!cv) return; const ctx = cv.getContext('2d');
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = colors || ['#f2c14e', '#ffffff', '#2fbf71', '#2f8cf0', '#e5484d', '#ffd98a'];
  for (let i = 0; i < n; i++) confParts.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .38, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, r: Math.random() * 6 + 3, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - .5) * .3, life: 0 });
  if (confRun) return; confRun = true;
  const step = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    confParts = confParts.filter(p => p.life < 200 && p.y < innerHeight + 40);
    for (const p of confParts) { p.life++; p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    if (confParts.length) requestAnimationFrame(step); else { confRun = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  requestAnimationFrame(step);
}
U.confetti = confetti;
function overlay(content, opts = {}) {
  return new Promise(res => {
    const ov = h('div', { class: 'ov', role: 'dialog' });
    const close = v => { ov.style.animation = 'fadeIn .2s reverse both'; setTimeout(() => ov.remove(), 180); res(v); };
    const box = h('div', { class: 'ovbox' }, typeof content === 'function' ? content(close) : content);
    ov.append(box); document.body.append(ov);
    if (opts.clickClose) ov.addEventListener('click', e => { if (e.target === ov) close(); });
  });
}
U.overlay = overlay;

// ---------- 아이콘 ----------
const FLAGS = {
  ARG: 'h:#74acdf,#fff,#74acdf', FRA: 'v:#0b3a9e,#fff,#ed2939', GER: 'h:#111,#dd0000,#ffce00', ESP: 'h:#aa151b,#f1bf00,#f1bf00,#aa151b', ITA: 'v:#009246,#fff,#ce2b37', POR: 'v:#006600,#ff0000,#ff0000', NED: 'h:#ae1c28,#fff,#21468b', BEL: 'v:#111,#fdda24,#ef3340', CRO: 'h:#ff0000,#fff,#171796', SRB: 'h:#c6363c,#0c4076,#fff', POL: 'h:#fff,#dc143c', UKR: 'h:#0057b7,#ffd700', AUT: 'h:#ed2939,#fff,#ed2939', GRE: 'h:#0d5eaf,#fff,#0d5eaf,#fff,#0d5eaf', CZE: 'h:#fff,#d7141a', USA: 'h:#b22234,#fff,#b22234,#fff,#3c3b6e', MEX: 'v:#006847,#fff,#ce1126', COL: 'h:#fcd116,#fcd116,#003893,#ce1126', URU: 'h:#fff,#0038a8,#fff,#0038a8,#fff', CHI: 'h:#fff,#d52b1e', ECU: 'h:#ffdd00,#ffdd00,#034ea2,#ed1c24', PAR: 'h:#d52b1e,#fff,#0038a8', PER: 'v:#d91023,#fff,#d91023', VEN: 'h:#ffcc00,#00247d,#cf142b', BOL: 'h:#d52b1e,#f9e300,#007934', NGA: 'v:#008751,#fff,#008751', GHA: 'h:#ce1126,#fcd116,#006b3f', CIV: 'v:#f77f00,#fff,#009e60', SEN: 'v:#00853f,#fdef42,#e31b23', CMR: 'v:#007a5e,#ce1126,#fcd116', MLI: 'v:#14b53a,#fcd116,#ce1126', GUI: 'v:#ce1126,#fcd116,#009460', MAR: 'h:#c1272d', ALG: 'v:#006233,#fff', TUN: 'h:#e70013', EGY: 'h:#ce1126,#fff,#111', KSA: 'h:#006c35', QAT: 'v:#fff,#8a1538,#8a1538', IRN: 'h:#239f40,#fff,#da0000', AUS: 'h:#012169', CAN: 'v:#d52b1e,#fff,#d52b1e', IRL: 'v:#169b62,#fff,#ff883e', WAL: 'h:#fff,#00b140', NIR: 'h:#fff', RUS: 'h:#fff,#0039a6,#d52b1e', HUN: 'h:#ce2939,#fff,#477050', ROU: 'v:#002b7f,#fcd116,#ce1126', BUL: 'h:#fff,#00966e,#d62612', ALB: 'h:#e41e20', BIH: 'h:#002395', SVN: 'h:#fff,#005da4,#ed1c24', SVK: 'h:#fff,#0b4ea2,#ee1c25', MNE: 'h:#c40308', MKD: 'h:#d20000', KOS: 'h:#244aa5', JAM: 'h:#009b3a,#fed100,#009b3a', CHN: 'h:#de2910', UZB: 'h:#0099b5,#fff,#1eb53a', COD: 'h:#007fff', ZAM: 'h:#198a00', BFA: 'h:#ef2b2d,#009e49', GAM: 'h:#ce1126,#0c1c8c,#3a7728', CPV: 'h:#003893', ANG: 'h:#cc092f,#111', NZL: 'h:#012169', ISR: 'h:#fff,#0038b8,#fff', GEO: 'h:#fff', TUR: 'h:#e30a17', SCO: 'h:#005eb8', ARM: 'h:#d90012,#0033a0,#f2a800', LUX: 'h:#ed2939,#fff,#00a1de', LTU: 'h:#fdb913,#006a44,#c1272d', LVA: 'h:#9e3039,#fff,#9e3039', EST: 'h:#0072ce,#111,#fff', CRC: 'h:#002b7f,#fff,#ce1126,#fff,#002b7f', HON: 'h:#0073cf,#fff,#0073cf', PAN: 'h:#fff,#d21034', KEN: 'h:#111,#bb0000,#006600', GAB: 'h:#009e60,#fcd116,#3a75c4', BEN: 'v:#008751,#fcd116', TOG: 'h:#006a4e,#ffce00,#006a4e', MAD: 'v:#fff,#fc3d32', HAI: 'h:#00209f,#d21034', SUR: 'h:#377e3f,#fff,#b40a2d,#fff,#377e3f', CUW: 'h:#002b7f', CYP: 'h:#fff', ISL: 'h:#02529c', FIN: 'h:#fff', SUI: 'h:#d52b1e', DEN: 'h:#c8102e', NOR: 'h:#ba0c2f', SWE: 'h:#006aa7', ENG: 'h:#fff', KOR: 'h:#fff', JPN: 'h:#fff', BRA: 'h:#009c3b'
};
const FSPECIAL = {
  ENG: '<rect width="26" height="18" fill="#fff"/><rect x="11" width="4" height="18" fill="#ce1124"/><rect y="7" width="26" height="4" fill="#ce1124"/>',
  KOR: '<rect width="26" height="18" fill="#fff"/><circle cx="13" cy="9" r="4.2" fill="#cd2e3a"/><path d="M8.8 9a4.2 4.2 0 0 0 8.4 0 2.1 2.1 0 0 0-4.2 0 2.1 2.1 0 0 1-4.2 0z" fill="#0047a0"/>',
  JPN: '<rect width="26" height="18" fill="#fff"/><circle cx="13" cy="9" r="4.6" fill="#bc002d"/>',
  BRA: '<rect width="26" height="18" fill="#009c3b"/><path d="M13 2 24 9 13 16 2 9z" fill="#ffdf00"/><circle cx="13" cy="9" r="3.6" fill="#002776"/>',
  SUI: '<rect width="26" height="18" fill="#d52b1e"/><rect x="11.5" y="4" width="3" height="10" fill="#fff"/><rect x="8" y="7.5" width="10" height="3" fill="#fff"/>',
  DEN: '<rect width="26" height="18" fill="#c8102e"/><rect x="8" width="3" height="18" fill="#fff"/><rect y="7.5" width="26" height="3" fill="#fff"/>',
  NOR: '<rect width="26" height="18" fill="#ba0c2f"/><rect x="7" width="5" height="18" fill="#fff"/><rect y="6.5" width="26" height="5" fill="#fff"/><rect x="8.25" width="2.5" height="18" fill="#00205b"/><rect y="7.75" width="26" height="2.5" fill="#00205b"/>',
  SWE: '<rect width="26" height="18" fill="#006aa7"/><rect x="8" width="3" height="18" fill="#fecc00"/><rect y="7.5" width="26" height="3" fill="#fecc00"/>',
  FIN: '<rect width="26" height="18" fill="#fff"/><rect x="8" width="3.5" height="18" fill="#002f6c"/><rect y="7.2" width="26" height="3.5" fill="#002f6c"/>',
  ISL: '<rect width="26" height="18" fill="#02529c"/><rect x="7" width="5" height="18" fill="#fff"/><rect y="6.5" width="26" height="5" fill="#fff"/><rect x="8.25" width="2.5" height="18" fill="#dc1e35"/><rect y="7.75" width="26" height="2.5" fill="#dc1e35"/>',
  SCO: '<rect width="26" height="18" fill="#005eb8"/><path d="M0 0 26 18M26 0 0 18" stroke="#fff" stroke-width="3"/>',
  TUR: '<rect width="26" height="18" fill="#e30a17"/><circle cx="10" cy="9" r="4.5" fill="#fff"/><circle cx="11.2" cy="9" r="3.6" fill="#e30a17"/><circle cx="15.4" cy="9" r="1.4" fill="#fff"/>',
  GEO: '<rect width="26" height="18" fill="#fff"/><rect x="11.5" width="3" height="18" fill="#e8112d"/><rect y="7.5" width="26" height="3" fill="#e8112d"/>',
  CYP: '<rect width="26" height="18" fill="#fff"/><path d="M8 7h10l-2 4h-6z" fill="#d57800"/>',
  NIR: '<rect width="26" height="18" fill="#fff"/><rect x="11" width="4" height="18" fill="#c8102e"/><rect y="7" width="26" height="4" fill="#c8102e"/>'
};
function flag(code, w = 26) {
  const hgt = Math.round(w * 18 / 26);
  const fp = G.TC_FLAGS && G.TC_FLAGS[code];
  if (fp) return h('img', { class: 'flag', src: fp, alt: '', width: w, height: hgt, style: { width: w + 'px', height: hgt + 'px', objectFit: 'cover' } });
  if (FSPECIAL[code]) return svg(`<svg class="flag" viewBox="0 0 26 18" width="${w}" height="${hgt}" style="width:${w}px;height:${hgt}px">${FSPECIAL[code]}</svg>`);
  const f = FLAGS[code] || 'h:#4a5160,#6b7383';
  const [t, cs] = f.split(':'); const cols = cs.split(',');
  const n = cols.length;
  const parts = cols.map((c, i) => t === 'h' ? `<rect y="${18 * i / n}" width="26" height="${18 / n + .2}" fill="${c}"/>` : `<rect x="${26 * i / n}" width="${26 / n + .2}" height="18" fill="${c}"/>`).join('');
  return svg(`<svg class="flag" viewBox="0 0 26 18" width="${w}" height="${hgt}" style="width:${w}px;height:${hgt}px">${parts}</svg>`);
}
U.flag = flag;
function lum(hex) { if (!hex || typeof hex !== 'string') return .5; const c = hex.replace('#', ''); const v = c.length === 3 ? c.split('').map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); return (v[0] * .299 + v[1] * .587 + v[2] * .114) / 255; }
U.lum = lum;
function crest(c, size = 32) {
  const lg = c && C.logos && C.logos.club(c.id || c.club);
  if (lg) return svg(`<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 40 44" aria-hidden="true"><image href="${lg}" x="0" y="2" width="40" height="40" preserveAspectRatio="xMidYMid meet"/></svg>`);
  if (!c) return svg(`<svg width="${size}" height="${size}" viewBox="0 0 40 44"><path d="M20 2 37 8v14c0 11-8 17-17 20C11 39 3 33 3 22V8z" fill="#333a46"/><text x="20" y="27" font-size="11" text-anchor="middle" fill="#9aa3b2" font-family="Barlow Condensed" font-weight="700">FA</text></svg>`);
  const c1 = c.c1 || '#444', c2 = c.c2 || '#ddd';
  const tc = lum(c1) > .62 ? '#111' : '#fff';
  const s = (c.short || '').slice(0, 4);
  const id = 'cg' + Math.random().toString(36).slice(2, 8);
  return svg(`<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 40 44" aria-hidden="true"><defs><clipPath id="${id}"><path d="M20 2 37 8v14c0 11-8 17-17 20C11 39 3 33 3 22V8z"/></clipPath></defs><g clip-path="url(#${id})"><rect width="40" height="44" fill="${c1}"/><rect y="31" width="40" height="13" fill="${c2}"/><rect y="29" width="40" height="2" fill="${lum(c1) > .5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.35)'}"/></g><path d="M20 2 37 8v14c0 11-8 17-17 20C11 39 3 33 3 22V8z" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/><text x="20" y="${s.length > 3 ? 23 : 24}" font-size="${s.length > 3 ? 10 : 12}" text-anchor="middle" fill="${tc}" font-family="Barlow Condensed, sans-serif" font-weight="800" letter-spacing=".5">${esc(s)}</text></svg>`);
}
U.crest = crest;
function natCrest(code, size = 22) {
  const lg = C.logos && C.logos.nat(code);
  if (lg) return svg(`<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><image href="${lg}" x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid meet"/></svg>`);
  return flag(code, size);
}
U.natCrest = natCrest;
U.clubCrest = (id, size) => crest(S && S.w.clubs[id], size);
function rt(r) { if (!r) return h('span', { class: 'rt r0' }, '-'); const c = r >= 8 ? 'r8' : r >= 7 ? 'r7' : r >= 6 ? 'r6' : 'r5'; return h('span', { class: 'rt ' + c }, r.toFixed(r >= 10 ? 0 : r % 1 === 0 && r === Math.round(r) && r.toString().length < 3 ? 1 : 2).replace(/0$/, '').replace(/\.$/, '.0')); }
function rt1(r) { if (!r) return h('span', { class: 'rt r0' }, '-'); const c = r >= 8 ? 'r8' : r >= 7 ? 'r7' : r >= 6 ? 'r6' : 'r5'; return h('span', { class: 'rt ' + c }, (+r).toFixed(1)); }
function rt2(r) { if (!r) return h('span', { class: 'rt r0' }, '-'); const c = r >= 8 ? 'r8' : r >= 7 ? 'r7' : r >= 6 ? 'r6' : 'r5'; return h('span', { class: 'rt ' + c }, (+r).toFixed(2)); }
U.rt1 = rt1; U.rt2 = rt2;
function ovrClass(o) { return o >= 85 ? 'o5' : o >= 75 ? 'o4' : o >= 65 ? 'o3' : o >= 55 ? 'o2' : 'o1'; }
U.ovrClass = ovrClass;
// 팀 색: 너무 어둡거나 너무 밝은 색은 다른 쪽 색을 쓰고, 그래도 안 되면 금색
function hexRGB(hx) { const c = (typeof hx === 'string' && hx ? hx : '#888888').replace('#', ''); const v = c.length === 3 ? c.split('').map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); return v.every(n => !isNaN(n)) ? v : [136, 136, 136]; }
function teamTint(c) {
  if (!c) return { a: '#3a4252', b: '#1a1e26', rgb: [58, 66, 82] };
  const ok = x => { if (!x || typeof x !== 'string') return false; const l = lum(x); return l > .1 && l < .85; };
  const a = ok(c.c1) ? c.c1 : ok(c.c2) ? c.c2 : '#b8862b';
  const b = a === c.c1 ? (ok(c.c2) ? c.c2 : a) : c.c1;
  return { a, b, rgb: hexRGB(a) };
}
U.teamTint = teamTint;
const rgba = (rgb, al) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${al})`;
U.rgba = rgba;
let atmoKey = null;
function setAtmo(c) {
  let L = document.getElementById('atmo');
  if (!L) { L = h('div', { id: 'atmo', 'aria-hidden': 'true' }); document.body.prepend(L); }
  const key = c ? c.id : 'none';
  if (key === atmoKey) return; atmoKey = key;
  const t = teamTint(c), t2 = hexRGB(t.b);
  const layer = h('div', { class: 'atmo-l', style: { background: c ? `radial-gradient(1100px 620px at 12% -8%, ${rgba(t.rgb, .26)}, transparent 62%), radial-gradient(900px 600px at 105% 10%, ${rgba(t2, .14)}, transparent 60%), linear-gradient(180deg, ${rgba(t.rgb, .07)}, transparent 480px)` : 'none' } });
  L.append(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('on')));
  setTimeout(() => { while (L.children.length > 1) L.firstChild.remove(); }, 1300);
}
U.setAtmo = setAtmo;
// 카드 오른쪽 위에 깔리는 은은한 팀 로고
function watermark(c, size = 132, cls) { if (!c) return null; return h('div', { class: 'wm ' + (cls || ''), 'aria-hidden': 'true' }, crest(c, size)); }
U.watermark = watermark;
// 팀 색 카드 스타일
function tintStyle(c, strength = .22) { const t = teamTint(c); return { background: `linear-gradient(115deg, ${rgba(t.rgb, strength)} 0%, ${rgba(t.rgb, strength * .35)} 45%, transparent 80%), var(--panel2)`, borderColor: rgba(t.rgb, .45) }; }
U.tintStyle = tintStyle;
const ovrb = o => h('span', { class: 'ovrb ' + ovrClass(o) }, o);
U.ovrb = ovrb;

// 트로피·상 아이콘
function trophy(kind, size = 28, col) {
  const g = col || '#f2c14e', d = '#a67719';
  const T = {
    league: `<path d="M10 4h20v4c0 9-4 15-10 17-6-2-10-8-10-17z" fill="${g}"/><path d="M10 7H5c0 6 3 9 7 10M30 7h5c0 6-3 9-7 10" stroke="${g}" stroke-width="2.4" fill="none"/><rect x="16" y="25" width="8" height="6" fill="${d}"/><rect x="11" y="31" width="18" height="5" rx="1.5" fill="${g}"/><circle cx="20" cy="12" r="3.2" fill="${d}"/>`,
    cup: `<path d="M12 5h16l-2 12c-1 5-4 7-6 7s-5-2-6-7z" fill="${g}"/><path d="M12 8H7c0 5 2 8 6 9M28 8h5c0 5-2 8-6 9" stroke="${g}" stroke-width="2.4" fill="none"/><path d="M18 24h4v6h-4z" fill="${d}"/><path d="M12 30h16l2 6H10z" fill="${g}"/>`,
    lcup: `<path d="M13 4h14v10c0 6-3 9-7 10-4-1-7-4-7-10z" fill="${g}"/><path d="M18 24h4v5h-4z" fill="${d}"/><rect x="13" y="29" width="14" height="7" rx="1" fill="${d}"/><rect x="13" y="29" width="14" height="2" fill="${g}"/>`,
    cont: `<path d="M14 4h12l-1 14c0 5-2 7-5 7s-5-2-5-7z" fill="${g}"/><path d="M14 7c-8-2-10 4-9 8 1 5 6 6 9 4M26 7c8-2 10 4 9 8-1 5-6 6-9 4" stroke="${g}" stroke-width="2.8" fill="none"/><path d="M18 25h4v5h-4z" fill="${d}"/><path d="M13 30h14l1 6H12z" fill="${g}"/>`,
    nt: `<circle cx="20" cy="11" r="7.5" fill="${g}"/><path d="M14 16c1 6 3 9 6 9s5-3 6-9" fill="${g}"/><path d="M15 25h10l1 5H14z" fill="${d}"/><rect x="12" y="30" width="16" height="6" rx="1.5" fill="${g}"/><path d="M15 8c3 1 6 5 5 8M24 6c-2 3-2 6 1 9" stroke="${d}" stroke-width="1.2" fill="none"/>`,
    ball: `<circle cx="20" cy="18" r="13" fill="${g}"/><path d="M20 11l5 3.6-1.9 6h-6.2L15 14.6z" fill="${d}"/><path d="M20 5v6M7.6 14.3l7.4.3M32.4 14.3 25 14.6M11 29l6-8M29 29l-6-8" stroke="${d}" stroke-width="1.4"/><rect x="13" y="33" width="14" height="4" rx="1" fill="${d}"/>`,
    boot: `<path d="M8 10h9v10c4 1 9 2 13 4 3 1 4 3 4 5v3H8z" fill="${g}"/><path d="M10 32v3M15 32v3M20 32v3M25 32v3M30 32v3" stroke="${d}" stroke-width="2"/><path d="M17 15h6M17 19h7" stroke="${d}" stroke-width="1.5"/>`,
    glove: `<path d="M12 36V20l-3-9c-.6-2 2-3 3-1l3 7V6c0-2 3-2 3 0v10V4c0-2 3-2 3 0v12V6c0-2 3-2 3 0v11l2-4c1-2 4-1 3 1l-3 10v12z" fill="${g}"/><rect x="12" y="31" width="14" height="5" fill="${d}"/>`,
    medal: `<path d="M13 3h5l3 10h-5zM27 3h-5l-3 10h5z" fill="${d}"/><circle cx="20" cy="24" r="10" fill="${g}"/><circle cx="20" cy="24" r="6.5" fill="none" stroke="${d}" stroke-width="1.6"/><path d="M20 19.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="${d}"/>`
  };
  const k = { league: 'league', cup: 'cup', lcup: 'lcup', cont: 'cont', nt: 'nt', ballon: 'ball', golden: 'ball', ball: 'ball', boot: 'boot', goldshoe: 'boot', glove: 'glove', yashin: 'glove' }[kind] || 'medal';
  return svg(`<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">${T[k]}</svg>`);
}
U.trophy = trophy;
const IC = {
  feud: 'M4 5h11v8H8l-4 3zM20 10h-3v5h-5v2l4 3 0-3h4z', pill: 'M7 17 17 7a4 4 0 0 1 6 6L13 23a4 4 0 0 1-6-6zM12 12l6 6', coach: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 22c1-5 4-7 8-7s7 2 8 7M17 3l3 3', mentor: 'M9 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM3 21c0-4 3-6 6-6s6 2 6 6M17 7a2.5 2.5 0 1 1 0 5M17 15c2.5 0 4 2 4 5',
  tactic: 'M3 4h18v16H3zM7 8l3 3M10 8l-3 3M15 14a2 2 0 1 0 0 .1M9 16c2-3 4-4 6-4', sun: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2', party: 'M4 20l5-14 9 9zM14 4l1-2M18 8l3-1M17 4l2-2', phone: 'M7 2h10v20H7zM11 18h2',
  boot: 'M4 6h7v8c4 1 7 2 9 4v3H4zM8 21v2M12 21v2M16 21v2', rain: 'M6 14a4 4 0 0 1 1-8 5 5 0 0 1 10 1 3.5 3.5 0 0 1 0 7zM8 18l-1 3M12 18l-1 3M16 18l-1 3', swap: 'M4 8h14l-3-3M20 16H6l3 3', band: 'M3 9h18v6H3zM10 10.5a2 2 0 1 0 0 3', brief: 'M3 8h18v12H3zM9 8V5h6v3M3 13h18', money: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM15 8.5c-1-1-5-1.5-5 1s5 1.5 5 4-4 2-5 1M12 6v12',
  whistle: 'M3 10h9l3-3h3v8a5 5 0 1 1-10 0', book: 'M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7v16M20 4v14h-7', leaf: 'M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8', ball: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z', screen: 'M3 4h18v12H3zM8 20h8M12 16v4M10 8l4 2-4 2z',
  shadow: 'M3 12c3-5 6-7 9-7s6 2 9 7c-3 5-6 7-9 7s-6-2-9-7zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM4 4l16 16', heart: 'M12 20S3 14 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14 12 20 12 20z', news: 'M4 4h13v16H6a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2M7 8h7M7 12h7M7 16h4', clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
  fire: 'M12 22c-4 0-7-3-7-7 0-5 5-7 5-12 3 2 5 5 5 8 1-1 2-2 2-4 2 2 2 5 2 8 0 4-3 7-7 7z', bench: 'M3 11h18M5 11v8M19 11v8M3 15h18M6 6h12v5', medic: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', glove: 'M7 22V12L5 6c0-1.5 2-2 2.5-.5L9 10V3.5c0-1.5 2.5-1.5 2.5 0V9 3c0-1.5 2.5-1.5 2.5 0v6-4c0-1.5 2.5-1.5 2.5 0v7l1-2c.7-1.3 2.6-.7 2.2.7L17 22z', mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3'
};
function icon(k, s = 26) { return svg(`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[k] || IC.ball}"/></svg>`); }
U.icon = icon;

// ---------- 공통 계산 ----------
const club = id => S.w.clubs[id];
U.club = club;
function curMatches() { return S.ss ? S.ss.matches : []; }
U.curMatches = curMatches;
function careerTotals() { const t = C.blankStats(); for (const hh of S.hist) C.addStats(t, hh.total); if (S.ss) C.addStats(t, C.totalAgg(S.ss.matches.filter(m => !['nt', 'ntY', 'youth'].includes(m.comp)))); return t; }
function youthTotals() { const t = C.blankStats(); for (const hh of S.hist) if (hh.youth) C.addStats(t, hh.youth); if (S.ss) C.addStats(t, C.totalAgg(S.ss.matches.filter(m => m.comp === 'youth'))); return t; }
U.youthTotals = youthTotals;
U.careerTotals = careerTotals;
function ntTotals() { const t = C.blankStats(); for (const hh of S.hist) if (hh.nt) C.addStats(t, hh.nt); if (S.ss) C.addStats(t, C.totalAgg(S.ss.matches.filter(m => ['nt', 'ntY'].includes(m.comp)))); return t; }
U.ntTotals = ntTotals;
const POSXY = { GK: [50, 92], CB: [50, 78], LB: [16, 72], RB: [84, 72], CDM: [50, 63], CM: [50, 52], CAM: [50, 38], LM: [16, 46], RM: [84, 46], LW: [18, 22], RW: [82, 22], ST: [50, 12] };
U.POSXY = POSXY;

// ---------- 라우터 ----------
function render() {
  const app = $('#app'); app.innerHTML = '';
  if (scr === 'home') app.append(viewHome());
  else if (scr === 'create') app.append(viewCreate());
  else if (scr === 'academy') app.append(viewAcademy());
  else if (scr === 'settings') { app.append(topbar(!!S && S.car && S.car.club)); app.append(U.viewSettings()); }
  else if (scr === 'ach') { app.append(topbar(false)); app.append(U.pages.ach(true)); }
  else app.append(viewGame());
  if (scr !== 'game' && scr !== 'settings') setAtmo(null);
  if (U.flushAch) U.flushAch();
}
U.render = render;
U.go = (s, t) => { if (s === 'settings' && scr !== 'settings') prevScr = scr; scr = s; if (t) tab = t; render(); scrollTo(0, 0); };
U.back = () => U.go(prevScr === 'settings' ? 'home' : prevScr);
U.loadSave = async o => { delete o.viewOnly; repairSave(o); S = o; await kvSet('save', JSON.stringify(o)); hasSave = true; U.go('game', 'career'); };
U.clearSave = async () => { S = null; await kvDel('save'); hasSave = false; U.go('home'); };
U.setTab = t => { tab = t; render(); scrollTo(0, 0); };

// 예전 저장 파일 보정: 팀 색이 비어 있는 구단에 색을 채운다
function repairSave(o) {
  const ext = {}; for (const c of ((G.TC_EXT && G.TC_EXT.clubs) || [])) ext[c[0]] = c;
  for (const id in o.w.clubs) { const c = o.w.clubs[id]; const e = ext[id]; if (!c.c1) c.c1 = (e && e[3]) || '#3a4252'; if (!c.c2) c.c2 = (e && e[4]) || '#e9eef5'; }
  for (const r of o.hist || []) { if (!r.c1) r.c1 = (o.w.clubs[r.club] || {}).c1 || '#3a4252'; if (!r.c2) r.c2 = (o.w.clubs[r.club] || {}).c2 || '#e9eef5'; }
}
U.boot = async function () {
  await U.loadSettings();
  if (C.logos && C.logos.probe) C.logos.probe(() => render());
  const t = await kvGet('save');
  if (t) { const o = GM.parse(t); if (o && o.w && o.p) { S = o; hasSave = true; repairSave(S); } }
  U.hof = GM.parse(await kvGet('hof') || '[]') || [];
  // 이전 버전에서 은퇴한 현재 커리어는 상세 기록 보관을 채워 둔다
  if (S && S.phase === 'retired' && U.hof[0] && !U.hof[0].id && U.hof[0].name === S.p.name) { const id = 'c' + Date.now(); await archiveCareer(id); U.hof[0].id = id; await kvSet('hof', JSON.stringify(U.hof)); }
  if (U.loadAch) await U.loadAch();
  render();
};
U.saveHof = async function (entry) { U.hof = [entry].concat(U.hof || []).slice(0, 30); await kvSet('hof', JSON.stringify(U.hof)); };

// ---------- 홈 ----------
function viewHome() {
  const w = h('div', { class: 'screen' });
  w.append(topbar(false));
  const cont = S && S.phase !== 'retired';
  const achN = U.achCount ? U.achCount() : null;
  const hero = h('div', { class: 'wrap home2' },
    h('div', { class: 'title' },
      h('div', { class: 'tl1' }, 'ROAD TO'), h('div', { class: 'tl2' }, 'LEGEND')),
    cont ? homeCard() : null,
    h('div', { class: 'hacts' },
      cont ? h('button', { class: 'btn gold big', onclick: () => U.go('game', 'career') }, `이어하기 · ${esc(S.p.name)} (${S.p.age}세)`) : null,
      h('button', { class: cont ? 'btn ghost big' : 'btn gold big', onclick: () => newCareer() }, '새 커리어'),
      h('button', { class: 'btn ghost', onclick: () => U.pickSaveFile && U.pickSaveFile() }, '저장 파일 불러오기'),
      h('button', { class: 'btn ghost', onclick: () => U.go('ach') }, '도전과제', achN ? h('span', { class: 'mute', style: { marginLeft: '6px' } }, achN) : null)),
    hofBlock());
  w.append(hero);
  return w;
}
function homeCard() {
  const box = h('div', { class: 'panel', style: { padding: '18px', display: 'grid', gap: '14px' } });
  const o = C.ovrOf(S.p), c = club(S.car.club);
  box.append(h('div', { class: 'idrow' }, h('div', { class: 'ovr ' + gradeCls(o) }, h('div', { class: 'l' }, 'OVR'), h('div', { class: 'v' }, o)),
      h('div', { class: 'idbox' }, h('div', { class: 'name' }, flag(S.p.nat), esc(S.p.name)), h('div', { class: 'mute', style: { display: 'flex', gap: '8px', alignItems: 'center' } }, c ? crest(c, 22) : crest(null, 22), c ? c.name : '무소속', ' · ', S.p.pos, ' · ', `${S.p.age}세`), h('div', { class: 'num', style: { fontSize: '20px' } }, C.fmtEUR(S.value || 0)))),
    h('div', { class: 'kv' }, ...kvTotals()));
  return box;
}
// 은퇴한 커리어 보관: 기록 열람·내보내기에 필요한 부분만 남긴다
function slimCareer(o) {
  const c = JSON.parse(GM.serialize(o) || GM.serialize(Object.assign({}, o, { phase: 'retired' })));
  if (c.w) { delete c.w.arch; delete c.w.intl; for (const id in c.w.clubs) { const k = c.w.clubs[id]; delete k.sq; } }
  c.phase = 'retired';
  return c;
}
async function archiveCareer(id) { try { await kvSet('car:' + id, JSON.stringify(slimCareer(S))); } catch (e) { console.error('archive', e); } }
async function loadArchive(id) { const t = await kvGet('car:' + id); return t ? GM.parse(t) : null; }
U.openArchive = async function (id) {
  const o = await loadArchive(id); if (!o) { toast('이 선수의 상세 기록은 보관되어 있지 않습니다.'); return; }
  repairSave(o); o.viewOnly = true; S = o; st.viewIdx = null; U.go('game', 'records');
};
U.exportArchive = async function (id) { const o = await loadArchive(id); if (!o) { toast('이 선수의 상세 기록은 보관되어 있지 않습니다.'); return; } U.exportSave(o); };
U.closeArchive = async function () { const t = await kvGet('save'); const o = t ? GM.parse(t) : null; S = o && o.w && o.p ? o : null; if (S) repairSave(S); U.go('home'); };
function hofBlock() {
  const list = U.hof || [];
  if (!list.length) return null;
  return h('div', { class: 'panel' }, h('div', { class: 'ph' }, h('h3', null, '명예의 전당'), h('span', { class: 'mute' }, `은퇴한 선수 ${list.length}명`)),
    h('div', { class: 'tscroll' }, h('table', { class: 'mlog hof', style: { minWidth: '640px' } }, h('tbody', null, ...list.map(e => h('tr', { class: e.id ? 'click' : '', title: e.id ? '눌러서 기록 열람' : '상세 기록 없음 (이전 버전)', onclick: ev => { if (e.id && !ev.target.closest('button')) U.openArchive(e.id); } },
      h('td', null, flag(e.nat, 20)), h('td', { class: 'o' }, h('b', null, e.name), ' ', h('span', { class: 'mute' }, `${e.pos} · ${e.retireAge}세 은퇴 · ${e.lastClub}`)),
      h('td', null, e.letter ? h('span', { class: 'chip gold', style: { marginRight: '4px' } }, e.letter) : null, h('span', { class: 'chip gold' }, e.grade)), h('td', null, '최고 ', ovrb(e.peak)), h('td', { class: 'num' }, `${e.apps}경기 ${e.goals}골 ${e.assists}도움`), h('td', { class: 'num' }, `우승 ${e.tp}`), h('td', { class: 'num' }, e.bd ? `발롱도르 ${e.bd}회` : ''), h('td', null, e.id ? h('button', { class: 'btn ghost sm', onclick: () => U.exportArchive(e.id) }, '내보내기') : null)))))));
}
function newCareer() { draft = { name: '', num: 9, foot: 'R', nat: 'KOR', pos: 'ST', height: 180, style: 0, q: '' }; U.go('create'); }
// 상단 탭: 마우스 드래그·휠로 가로 스크롤, 양끝 페이드, 선택 탭 자동 노출
let tabScroll = 0, tabDrag = null, tabDragInit = false;
function dragTabs(nav) {
  const wrap = h('div', { class: 'tabs-wrap' }, nav);
  const edge = () => { wrap.classList.toggle('fl', nav.scrollLeft > 4); wrap.classList.toggle('fr', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4); tabScroll = nav.scrollLeft; };
  nav.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; tabDrag = { nav, x: e.clientX, sl: nav.scrollLeft, moved: false }; });
  nav.addEventListener('click', e => { if (nav.dataset.moved) { e.stopPropagation(); e.preventDefault(); delete nav.dataset.moved; } }, true);
  if (!tabDragInit) {
    tabDragInit = true;
    window.addEventListener('pointermove', e => { const d = tabDrag; if (!d) return; const dx = e.clientX - d.x; if (!d.moved && Math.abs(dx) > 5) { d.moved = true; d.nav.classList.add('dragging'); } if (d.moved) d.nav.scrollLeft = d.sl - dx; });
    window.addEventListener('pointerup', () => { const d = tabDrag; if (!d) return; tabDrag = null; if (d.moved) { d.nav.dataset.moved = '1'; setTimeout(() => { d.nav.classList.remove('dragging'); delete d.nav.dataset.moved; }, 30); } });
  }
  nav.addEventListener('wheel', e => { if (nav.scrollWidth <= nav.clientWidth) return; const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return; e.preventDefault(); nav.scrollLeft += d; }, { passive: false });
  nav.addEventListener('scroll', edge, { passive: true });
  requestAnimationFrame(() => { nav.scrollLeft = tabScroll; const on = nav.querySelector('.on'); if (on) { const l = on.offsetLeft, r = l + on.offsetWidth; if (l < nav.scrollLeft) nav.scrollLeft = l - 16; else if (r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = r - nav.clientWidth + 16; } edge(); });
  return wrap;
}
function topbar(inGame) {
  const tabs = [['career', '커리어'], ['profile', '선수 프로필'], ['attrs', '능력치'], ['records', '시즌 기록'], ['value', '이적·가치'], ['table', '리그·대회'], ['db', '선수·팀'], ['trophies', '트로피'], ['shop', '상점'], ['ach', '도전과제']];
  const needs = S && ['window', 'training', 'preEvents', 'midEvents', 'mid', 'winter', 'h1', 'h2', 'review', 'reviewDone', 'freeYear'].includes(S.phase);
  return h('div', { class: 'top' }, h('div', { class: 'wrap' },
    h('button', { class: 'brand', onclick: () => { if (!busy) U.go('home'); }, title: '처음 화면' }, h('span', { class: 'mk' }, 'R'), h('span', { class: 't' }, 'Road to Legend')),
    inGame ? dragTabs(h('nav', { class: 'tabs' }, ...tabs.map(([k, l]) => h('button', { class: tab === k ? 'on' : '', 'data-tab': k, onclick: () => { if (!busy || st.simming) U.setTab(k); } }, l, k === 'career' && needs && tab !== 'career' ? h('span', { class: 'dot' }) : null)))) : h('div', { style: { flex: 1 } }),
    inGame && S ? h('div', { class: 'topinfo' }, h('span', { class: 'hide-s' }, '시즌 ', h('b', null, seasonLabel())), h('span', { class: 'hide-s' }, '재산 ', h('b', null, C.fmtEUR(Math.max(0, S.p.money))))) : null,
    h('button', { class: 'gear', title: '설정', 'aria-label': '설정', onclick: () => { if (!busy) U.go('settings'); } }, svg('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'))));
}
const seasonLabel = () => `${S.w.year}/${String(S.w.year + 1).slice(2)}`;
U.seasonLabel = seasonLabel;
function gradeCls(o) { return o >= 85 ? 'g4' : o >= 75 ? 'g3' : o >= 65 ? 'g2' : 'g1'; }

// ---------- 생성 ----------
let draft = null;
function jersey(d) {
  const nm = esc((d.name || 'PLAYER').toUpperCase().slice(0, 12));
  return svg(`<svg viewBox="0 0 240 230" width="240" height="230" style="max-width:100%"><defs><linearGradient id="jg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="1" stop-color="#d9dde3"/></linearGradient></defs><path d="M78 10c8 10 26 14 42 14s34-4 42-14l52 22 22 52-34 16-10-20v138H58V80L48 100 14 84l22-52z" fill="url(#jg)"/><path d="M78 10c8 10 26 14 42 14s34-4 42-14l6 3c-7 13-26 19-48 19s-41-6-48-19z" fill="#2b2f36"/><path d="M14 84l34 16 4-8-34-16zM226 84l-34 16-4-8 34-16z" fill="#2b2f36"/><text x="120" y="74" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="${nm.length > 9 ? 18 : 22}" fill="#23272e" letter-spacing="1">${nm}</text><text x="120" y="158" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="84" fill="#23272e">${d.num}</text></svg>`);
}
const NATCHOICES = () => {
  const codes = Object.keys(C.NAT).filter(c => G.FMWORLD.NAMES[(C.NAT[c] || [])[1]]);
  const pri = ['KOR', 'JPN', 'ENG', 'ESP', 'GER', 'FRA', 'ITA', 'POR', 'NED', 'BEL', 'BRA', 'ARG', 'URU', 'COL', 'USA', 'MEX', 'CRO', 'SRB', 'NOR', 'DEN', 'SWE', 'POL', 'TUR', 'MAR', 'SEN', 'NGA', 'GHA', 'CIV', 'CMR', 'EGY', 'AUS', 'CHN', 'SCO', 'WAL', 'IRL', 'SUI', 'AUT', 'UKR', 'GRE', 'CZE'];
  return pri.concat(codes.filter(c => !pri.includes(c)).sort((a, b) => C.natName(a).localeCompare(C.natName(b), 'ko')));
};
function viewCreate() {
  const d = draft || (draft = { name: '', num: 9, foot: 'R', nat: 'KOR', pos: 'ST', height: 180, style: 0, q: '' });
  const w = h('div', { class: 'screen' });
  w.append(topbar(false));
  const box = h('div', { class: 'panel' });
  const jwrap = h('div', { class: 'jersey' }, jersey(d));
  const upd = () => { jwrap.innerHTML = ''; jwrap.append(jersey(d)); };
  const nameIn = h('input', { id: 'pname', value: d.name, maxlength: 18, placeholder: '예: 손 / KIM', oninput: e => { d.name = e.target.value; upd(); } });
  const numIn = h('input', { id: 'pnum', type: 'number', min: 1, max: 99, value: d.num, style: { width: '80px' }, oninput: e => { d.num = Math.max(1, Math.min(99, +e.target.value || 1)); upd(); } });
  const footSeg = h('div', { class: 'seg' }, ...[['L', '왼발'], ['R', '오른발']].map(([k, l]) => h('button', { class: d.foot === k ? 'on' : '', onclick: e => { d.foot = k; footSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, l)));
  const hLab = h('b', { class: 'num', style: { fontSize: '18px' } }, d.height + 'cm');
  const hIn = h('input', { id: 'pheight', type: 'range', min: 162, max: 200, value: d.height, style: { padding: 0 }, oninput: e => { d.height = +e.target.value; hLab.textContent = d.height + 'cm'; } });
  const s1 = h('section', null, h('h3', null, '신상'), jwrap,
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' } }, h('label', { class: 'lbl', for: 'pname' }, '이름 (등록명)'), h('label', { class: 'lbl', for: 'pnum' }, '등번호'), nameIn, numIn),
    h('div', { class: 'lbl', style: { textAlign: 'center' } }, '주발'), footSeg,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('label', { class: 'lbl', for: 'pheight' }, '키'), hLab), hIn,
    h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '키가 크면 헤더·점프·힘이 오르고, 작으면 민첩성·밸런스·가속력이 오릅니다.'));
  // 국적
  const list = h('div', { class: 'natlist' });
  const fill = () => {
    list.innerHTML = ''; const q = d.q.trim();
    NATCHOICES().filter(c => !q || C.natName(c).includes(q) || c.toLowerCase().includes(q.toLowerCase())).forEach(c => list.append(h('button', { class: d.nat === c ? 'on' : '', onclick: () => { d.nat = c; fill(); } }, flag(c), h('span', null, C.natName(c)), d.nat === c ? h('span', { style: { marginLeft: 'auto' } }, '✓') : null)));
  };
  fill();
  const s2 = h('section', null, h('h3', null, '국적'), h('input', { id: 'nq', placeholder: '국가 검색', value: d.q, oninput: e => { d.q = e.target.value; fill(); } }), list,
    h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '국적에 따라 유스 아카데미 후보와 국가대표 경쟁 상대가 달라집니다.'));
  // 포지션
  const pitch = h('div', { class: 'pitchpick' });
  const styles = h('div', { class: 'styles' });
  const drawPos = () => {
    pitch.innerHTML = '';
    pitch.append(svg('<svg viewBox="0 0 68 90" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".5"><rect x="14" y="0" width="40" height="14"/><rect x="25" y="0" width="18" height="5"/><line x1="0" y1="45" x2="68" y2="45"/><circle cx="34" cy="45" r="8"/><rect x="14" y="76" width="40" height="14"/><rect x="25" y="85" width="18" height="5"/></svg>'));
    for (const p of C.POS) { const [x, y] = POSXY[p]; pitch.append(h('button', { class: 'pb' + (d.pos === p ? ' on' : ''), style: { left: x + '%', top: y + '%' }, onclick: () => { d.pos = p; d.style = 0; drawPos(); } }, p)); }
    styles.innerHTML = '';
    C.STYLES[C.styleKey(d.pos)].forEach((s, i) => styles.append(h('button', { class: d.style === i ? 'on' : '', onclick: () => { d.style = i; drawPos(); } }, h('b', null, s[0]), h('span', null, s[1]))));
  };
  drawPos();
  const s3 = h('section', null, h('h3', null, '포지션'), pitch, h('div', { class: 'lbl' }, '플레이 성향'), styles);
  box.append(h('div', { class: 'ph' }, h('h2', { style: { fontSize: '22px' } }, '선수 만들기'), h('span', { class: 'mute' }, '시작 능력치는 무작위, 성장은 당신의 선택과 활약에 달려 있습니다')), h('div', { class: 'cgrid' }, s1, s2, s3),
    h('div', { class: 'cfoot' }, h('button', { class: 'btn ghost', onclick: () => U.go('home') }, '뒤로'), h('button', { class: 'btn', onclick: () => {
      if (!d.name.trim()) { toast('이름을 입력하세요.'); nameIn.focus(); return; }
      S = GM.newGame({ name: d.name.trim(), num: d.num, foot: d.foot, nat: d.nat, pos: d.pos, height: d.height, style: d.style });
      U.go('academy');
    } }, '선수 확정')));
  w.append(h('div', { class: 'wrap create' }, box));
  return w;
}

// ---------- 아카데미 ----------
function viewAcademy() {
  const w = h('div', { class: 'screen' }); w.append(topbar(false));
  const o = C.ovrOf(S.p);
  const box = h('div', { class: 'wrap', style: { paddingBlock: '28px 40px', display: 'grid', gap: '18px' } },
    h('div', null, h('div', { class: 'lbl' }, `${S.w.year}년 여름 · 16세`), h('h2', { style: { fontSize: '28px', marginTop: '4px' } }, '어느 유스 아카데미로 갈까요?'), h('p', { class: 'mute', style: { maxWidth: '62ch' } }, `스카우트 네 곳이 ${esc(S.p.name)}에게 입단을 제안했습니다. 빅클럽은 시설이 좋지만 1군까지 가는 길이 좁고, 작은 구단은 데뷔가 빠릅니다. 현재 능력치 ${o}.`)),
    h('div', { class: 'acad' }, ...S.academies.map(id => {
      const c = club(id), lg = S.w.lg[c.lg];
      const fac = Math.round(Math.max(1, Math.min(5, (c.str - 60) / 5.5)));
      const slot = C.SLOT[S.p.pos];
      const riv = c.sq.filter(e => C.SLOT[e[1]] === slot).sort((a, b) => b[2] - a[2])[0];
      return h('button', { onclick: () => { GM.chooseAcademy(S, id); U.save(); U.go('game', 'career'); setTimeout(() => toast(`${c.name} U18 입단`), 250); } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, crest(c, 46), h('div', null, h('b', { style: { fontSize: '17px' } }, c.name), h('div', { class: 'mute', style: { fontSize: '12px' } }, lg.name))),
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', { class: 'mute' }, '1군 전력'), h('b', { class: 'num', style: { fontSize: '18px' } }, c.str.toFixed(1))),
        h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', { class: 'mute' }, '유스 시설'), h('span', { class: 'stars' }, '★'.repeat(fac) + '☆'.repeat(5 - fac))),
        riv ? h('div', { class: 'mute', style: { fontSize: '12px' } }, `같은 포지션 1군 주전: ${C.pName(S.w, riv)} (${riv[2]})`) : null);
    })));
  w.append(box);
  return w;
}

// ---------- 게임 화면 ----------
function viewGame() {
  const w = h('div', { class: 'screen' }); w.append(topbar(true));
  if (S && S.viewOnly) w.append(h('div', { class: 'wrap' }, h('div', { class: 'archbar' }, h('span', null, h('b', null, `${S.p.name}`), ` · 보관된 은퇴 선수 기록을 보는 중입니다 (읽기 전용)`), h('span', { style: { display: 'flex', gap: '6px' } }, h('button', { class: 'btn ghost sm', onclick: () => U.exportSave(S) }, '내보내기'), h('button', { class: 'btn sm', onclick: () => U.closeArchive() }, '나가기')))));
  setAtmo(S && S.car && S.car.club ? club(S.car.club) : null);
  if (tab === 'career') w.append(viewHub());
  else w.append(U.pages[tab] ? U.pages[tab]() : h('div', { class: 'empty' }, '준비 중'));
  return w;
}
function kvTotals() {
  const t = careerTotals();
  return [['출전', t.apps, 'apps'], ['득점', t.goals, 'goals'], ['도움', t.assists, 'ast']].map(([k, v]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', { class: 'v' }, v)));
}
function playerCard() {
  const p = S.p, o = C.ovrOf(p), c = club(S.car.club);
  const e = C.effOvr(p);
  const stat = S.car.status === 'youth' ? 'U18·U21' : S.car.status === 'loan' ? '임대' : S.car.status === 'free' ? '무소속' : '';
  const card = h('div', { class: 'panel card' },
    h('div', { class: 'idrow' },
      h('div', { class: 'ovr ' + gradeCls(o), id: 'ovrTile' }, h('div', { class: 'l' }, 'OVR'), h('div', { class: 'v', id: 'ovrVal' }, o), e !== o ? h('div', { class: 'l', style: { fontSize: '10px', color: e < o ? '#ffb0b2' : '#a8f0c6' } }, `컨디션 ${e > o ? '+' : ''}${e - o}`) : null),
      h('div', { class: 'idbox', style: c ? tintStyle(c, .5) : null }, watermark(c, 150, 'wm-card'), h('div', { class: 'stripe', style: { background: teamTint(c).a } }),
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, flag(p.nat, 20), h('span', { class: 'chip' }, p.nat), h('span', { class: 'chip', style: { background: '#7a1d3a', color: '#ffd5e0' } }, `#${p.num} ${p.pos}`), stat ? h('span', { class: 'chip blue' }, stat) : null),
        h('div', { class: 'name' }, c ? crest(c, 26) : crest(null, 26), h('span', null, c ? c.name : '무소속')),
        h('div', { class: 'meta' }, h('div', null, h('div', { class: 'lbl' }, '선수'), h('b', null, p.name)), h('div', { style: { textAlign: 'right' } }, h('div', { class: 'lbl' }, '나이 · 가치'), h('span', { class: 'num', style: { fontSize: '22px', fontWeight: 700 } }, `${p.age} · `, h('span', { id: 'valV' }, C.fmtEUR(S.value || 0))))))),
    h('div', { class: 'kv' }, ...kvTotals()),
    trophyShelf());
  return card;
}
function trophyShelf() {
  const sh = h('div', { class: 'shelf' });
  const items = S.trophies.map(t => [t.k, t.t + ' · ' + t.y]).concat(S.awards.filter(a => ['ballon', 'golden', 'goldshoe', 'yashin', 'boot', 'mvp'].includes(a.k)).map(a => [a.k, a.t + ' · ' + a.y]));
  if (!items.length) sh.append(h('span', { class: 'dim', style: { fontSize: '12px' } }, '아직 트로피가 없습니다'));
  items.slice(-24).forEach(([k, t], i) => { const el = h('span', { class: 'tr', title: t, style: { animationDelay: i * 40 + 'ms' } }, trophy(k, 26, ['mvp', 'boot', 'goldshoe', 'ballon', 'golden', 'yashin'].includes(k) ? '#e9eef5' : null)); sh.append(el); });
  return sh;
}
// 유스 기록이 있으면 U18·U21 행을 따로, 1군 기록이 있거나 유스가 아니면 1군 행을 따로 그린다
const isYouthOnly = r => r.status === 'youth' && !(r.total && r.total.apps);
function seniorStats(r) { return r.youth ? r.total : r.total; }
function rowCells(a, badgeBg, clubCell, ovr, t, rating, onclick, cls, delay) {
  const rgb = hexRGB(badgeBg);
  return h('tr', { class: 'row ' + (cls || ''), style: { animationDelay: (delay || 0) + 'ms', '--rowtint': rgba(rgb, .2) }, onclick },
    h('td', null, a != null ? h('span', { class: 'agebadge', style: { background: badgeBg } }, a) : null),
    h('td', { style: { minWidth: '150px' } }, clubCell),
    h('td', null, ovr != null ? ovrb(ovr) : null),
    h('td', { class: 'num', style: { textAlign: 'right' } }, t ? t.apps : ''),
    h('td', { class: 'num', style: { textAlign: 'right' } }, t ? t.goals : ''),
    h('td', { class: 'num', style: { textAlign: 'right' } }, t ? t.assists : ''),
    h('td', { style: { textAlign: 'right' } }, rating ? rt2(rating) : ''));
}
const tag = (t, cls, title) => h('span', { class: 'chip ' + (cls || ''), style: { fontSize: '10px', padding: '1px 6px' }, title }, t);
function careerTable() {
  const wrap = h('div', { class: 'panel', style: { padding: '12px 14px' } });
  const tb = h('tbody');
  const maxAge = Math.max(40, S.p.age + 1);
  const byAge = {};
  S.hist.forEach((r, i) => { byAge[r.age] = byAge[r.age] || []; byAge[r.age].push([r, i]); });
  for (let a = 16; a <= maxAge; a++) {
    const rows = byAge[a];
    if (rows) for (const [r, i] of rows) {
      const go = () => { st.viewIdx = i; U.setTab('profile'); };
      const bg = r.c1 && lum(r.c1) < .8 ? r.c1 : '#3a4252';
      const youthApps = r.youth && r.youth.apps;
      const showSenior = !isYouthOnly(r) || !youthApps;
      // 구버전 기록(유스·1군 합산)은 그대로 한 줄
      if (youthApps) {
        tb.append(rowCells(a, bg, h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, crest({ id: r.club, c1: r.c1, c2: r.c2, short: r.short }, 18), h('span', { style: { fontWeight: 600 } }, r.clubName), tag(r.youthLabel || 'U18')), showSenior ? null : r.ovr1, r.youth, r.youthRating, go, 'youthrow', Math.min(i, 12) * 25));
      }
      if (showSenior) {
        const tags = [];
        if (r.status === 'loan') tags.push(tag('임대', 'blue'));
        if (r.status === 'youth' && !r.youth) tags.push(tag('U18'));
        if (r.status === 'youth' && r.youth) tags.push(tag('1군 데뷔', 'good'));
        if (r.winter) tags.push(tag('겨울 이동', '', `겨울 이적: ${r.winter.from} → ${r.winter.to}`));
        const tro = (r.trophies || []).map(t => h('span', { title: t.t, style: { display: 'inline-flex' } }, trophy(t.k, 16)));
        const aw = (r.awards || []).filter(x => ['ballon', 'golden', 'goldshoe', 'boot', 'mvp'].includes(x.k)).map(x => h('span', { title: x.t, style: { display: 'inline-flex' } }, trophy(x.k, 16, '#e9eef5')));
        tb.append(rowCells(youthApps ? null : a, bg, h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, r.club ? crest({ id: r.club, c1: r.c1, c2: r.c2, short: r.short }, 18) : crest(null, 18), h('b', { style: { fontWeight: 600 } }, r.clubName), ...tags, ...tro, ...aw), r.ovr1, r.total, r.rating, go, '', Math.min(i, 12) * 25));
      }
    }
    else if (a === S.p.age && S.phase !== 'retired') {
      const c = club(S.car.club);
      const sen = S.ss ? C.totalAgg(S.ss.matches.filter(m => !['nt', 'ntY', 'youth'].includes(m.comp))) : null;
      const yo = S.ss ? C.totalAgg(S.ss.matches.filter(m => m.comp === 'youth')) : null;
      const label = S.ss ? (S.car.status === 'youth' ? `${c.name} 유스 · 시즌 진행 중` : `${c.name} · 시즌 진행 중`) : '커리어 결정 중…';
      if (yo && yo.apps) tb.append(rowCells(a, '#555', h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, crest(c, 18), h('span', { class: 'mute' }, c.name), tag(S.p.age <= 17 && S.car.status === 'youth' ? 'U18' : 'U21')), null, yo, yo.rated ? C.avgRating(yo) : 0, null, 'cur'));
      tb.append(rowCells(yo && yo.apps ? null : a, '#555', h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, c ? crest(c, 18) : crest(null, 18), h('span', { class: 'mute' }, label)), C.ovrOf(S.p), sen && (sen.apps || S.car.status !== 'youth') ? sen : null, sen && sen.rated ? C.avgRating(sen) : 0, null, 'cur'));
    } else if (a > S.p.age || (S.phase === 'retired' && !rows)) tb.append(h('tr', { class: 'empty' }, h('td', { class: 'num' }, a), h('td', { colspan: 6 }, '')));
  }
  const nt = ntTotals(), ct = careerTotals(), yt = youthTotals();
  const foot = (icon, name, t) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 8px 2px' } }, icon, h('b', null, name), h('span', { style: { marginLeft: 'auto' }, class: 'num mute' }, `${t.apps}경기 · ${t.goals}골 · ${t.assists}도움`));
  wrap.append(h('div', { class: 'tscroll' }, h('table', { class: 'ctable' }, h('thead', null, h('tr', null, ...['나이', '클럽', 'OVR', '경기', '득점', '도움', '평점'].map((x, i) => h('th', { style: i >= 3 ? { textAlign: 'right' } : null }, x)))), tb)),
    h('div', { style: { borderTop: '1px solid var(--line)', marginTop: '6px', display: 'grid' } },
      foot(h('span', { class: 'chip', style: { fontSize: '10px' } }, '1군'), '프로 통산', ct),
      yt.apps ? foot(h('span', { class: 'chip', style: { fontSize: '10px' } }, '유스'), 'U18·U21 통산', yt) : null,
      foot(natCrest(S.p.nat, 22), C.natName(S.p.nat) + ' 대표팀', nt)));
  return wrap;
}
function viewHub() {
  const hub = h('div', { class: 'wrap hub' });
  const left = h('div', { style: { display: 'grid', gap: '16px', minWidth: 0 } }, playerCard(), actionPanel(), newsPanel());
  hub.append(left, careerTable());
  return hub;
}

// ---------- 진행 패널 ----------
function actionPanel() {
  const P = h('div', { class: 'panel', id: 'act' });
  const body = h('div', { class: 'pb act' });
  P.append(body);
  const ph = S.phase;
  if (ph === 'training' && S.car.club && S.hist.length === 0 && !S.trainSeen) body.append(...introBlock());
  if (ph === 'window') body.append(...windowBlock());
  else if (ph === 'freeYear') body.append(...freeBlock());
  else if (ph === 'training') body.append(...trainingBlock());
  else if (ph === 'goal') body.append(...goalBlock());
  else if (ph === 'preEvents' || ph === 'midEvents') body.append(eventBlock());
  else if (ph === 'h1' || ph === 'h2') body.append(...simBlock());
  else if (ph === 'mid') body.append(...midBlock());
  else if (ph === 'winter') body.append(...winterBlock());
  else if (ph === 'endSeason') { setTimeout(finishSeasonFlow, 30); body.append(h('div', { class: 'mute' }, '시즌을 정리하는 중…')); }
  else if (ph === 'review') body.append(...reviewBlock());
  else if (ph === 'reviewDone') body.append(h('h2', null, `${S.hist.length ? S.hist[S.hist.length - 1].label : ''} 시즌 종료`), h('p', { class: 'mute', style: { margin: 0 } }, '다음 시즌 이적시장이 열립니다.'), h('button', { class: 'btn', onclick: () => { GM.nextSeason(S); afterNext(); } }, '이적시장 열기'));
  else if (ph === 'retired') body.append(...retiredBlock());
  return P;
}
function introBlock() {
  S.trainSeen = true;
  const c = club(S.car.club);
  return [h('div', { class: 'result' }, h('b', null, `${c.name} U18 입단`), h('span', { class: 'mute', style: { fontSize: '13px' } }, '유스 시절에는 U18·U21 리그에서 뛰고, 실력이 1군 경쟁 상대와 가까워지면 1군 데뷔 기회가 옵니다. 매 시즌 훈련 방향과 강도를 고르고, 시즌 중 사건마다 선택을 내리세요.'))];
}
function goalBlock() {
  const ss = S.ss, X = C.extras;
  const out = [h('div', null, h('div', { class: 'lbl' }, `${ss.label} 프리시즌`), h('h2', { style: { marginTop: '2px' } }, '이번 시즌 목표'))];
  out.push(h('p', { class: 'mute', style: { margin: 0, fontSize: '13px' } }, '감독과 합의할 개인 목표를 고르세요. 어려운 목표일수록 보상이 크고, 쉬운 목표일수록 실패했을 때 실망이 큽니다.'));
  const grid = h('div', { class: 'opts' });
  ss.goalOpts.forEach((g, i) => grid.append(h('button', { class: 'opt', onclick: () => { GM.pickGoal(S, i); toast('목표: ' + g.label); render(); } }, watermark(club(S.car.club), 96, 'wm-opt'),
    h('div', { class: 'chg' }, h('span', { class: 'chip ' + (g.d === 'hard' ? 'bad' : g.d === 'easy' ? 'good' : '') }, g.dl)),
    h('div', { class: 't' }, g.label),
    h('div', { class: 'outs' }, h('div', { class: 'out good' }, h('span', null, '달성: ' + X.rewardText(g.d))), h('div', { class: 'out bad' }, h('span', null, '실패: ' + X.penaltyText(g.d)))))));
  out.push(grid, h('button', { class: 'btn ghost sm', style: { justifySelf: 'start' }, onclick: () => { GM.pickGoal(S, -1); render(); } }, '목표 없이 시작'));
  return out;
}
function goalChip() {
  const ss = S.ss; if (!ss || !ss.goal) return null;
  const pr = C.extras.progress(S, ss.goal);
  const v = ss.goal.k === 'rating' ? (pr.v ? pr.v.toFixed(2) : '-') : pr.v;
  return h('div', { class: 'goalbar' }, h('span', { class: 'lbl' }, '시즌 목표'), h('span', { style: { minWidth: 0 } }, ss.goal.label), h('b', { class: 'num ' + (pr.done ? 'up' : '') }, `${v}${ss.goal.k === 'rating' ? '' : ' / ' + ss.goal.target}${pr.done ? ' ✓' : ''}`));
}
function newsPanel() {
  const list = (S.news || []).slice(0, 7);
  if (!list.length) return null;
  const IC = { transfer: 'swap', trophy: 'band', award: 'band', mile: 'ball', hat: 'fire', inj: 'medic', card: 'whistle', goal: 'band', goalx: 'rain', final: 'fire', retire: 'clock', info: 'news' };
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '뉴스'), h('button', { class: 'btn ghost sm', onclick: () => U.setTab('records') }, '전체 기록')),
    h('div', { style: { display: 'grid', padding: '4px 10px 10px' } }, ...list.map((n, i) => h('div', { class: 'newsrow', style: { animationDelay: i * 40 + 'ms' } }, h('span', { class: 'ni ' + n.k }, icon(IC[n.k] || 'news', 16)), h('span', { style: { minWidth: 0 } }, n.t), h('span', { class: 'dim', style: { fontSize: '11px', whiteSpace: 'nowrap' } }, n.d ? C.fmtDateY(n.d) : n.y)))));
}
const ROLECHIP = r => h('span', { class: 'chip ' + ({ key: 'gold', starter: 'good', rotation: '', backup: 'bad', reserve: 'bad', youth: 'blue' }[r] || '') }, C.ROLELABEL[r] || r);
U.ROLECHIP = ROLECHIP;
function windowBlock() {
  const st0 = S.stance || {}, out = [];
  const y = S.w.year;
  out.push(h('div', null, h('div', { class: 'lbl' }, `${y} 여름 이적시장 · ${S.p.age}세`), h('h2', { style: { marginTop: '2px' } }, '커리어 결정')));
  const cur = club(S.car.club);
  const opts = [];
  if (cur) {
    const why = st0.why ? ` (사유: ${st0.why})` : '';
    if (st0.back && st0.expired) {
      const pc = club(st0.club);
      if (st0.renew) opts.push(stanceRow(pc, `${pc.name} 복귀 · 재계약 제안`, ['임대 종료와 함께 원소속팀 계약 만료', `${st0.years}년`, h('b', null, wageTxt(st0.wage)), '역할 ', ROLECHIP(st0.role)], 'renew', '재계약'));
      else opts.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, '임대 종료 · 원소속팀 계약 만료'), h('span', { class: 'mute' }, `${pc.name}이(가) 재계약을 제안하지 않았습니다${why}. 이제 자유 계약 선수입니다.`)));
    }
    else if (st0.back) opts.push(h('div', { class: 'offer' }, crest(club(st0.club), 40), h('div', null, h('div', { class: 'cn' }, `${club(st0.club).name} 복귀`), h('div', { class: 'terms' }, `임대 종료 · 계약 ${S.car.contract + 1}년 여름까지 · 예상 역할 `, ROLECHIP(st0.role))), h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => decide({ kind: 'back' }) }, '복귀'))));
    else if (st0.promote) opts.push(stanceRow(cur, '1군 프로 계약 제안', ['3년 계약', '예상 역할 ', ROLECHIP(st0.role)], 'promote', '서명'), stanceRow(cur, 'U21에서 한 시즌 더', ['유스 계약 유지'], 'youth', '잔류', true));
    else if (st0.youthEnd) { if (st0.release) opts.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, `${cur.name}에서 방출 통보를 받았습니다.`), h('span', { class: 'mute' }, '다른 팀 제안을 받거나 무소속으로 남아야 합니다.'))); else opts.push(stanceRow(cur, '1군 백업 계약', ['2년 계약', '예상 역할 ', ROLECHIP(st0.role)], 'promote', '서명')); }
    else if (S.car.status === 'youth') opts.push(stanceRow(cur, '유스 잔류', ['1군 콜업을 노린다', '예상 역할 ', ROLECHIP('youth')], 'youth', '잔류'));
    else if (st0.expired) { if (st0.renew) opts.push(stanceRow(cur, '재계약 제안', [`${st0.years}년`, h('b', null, wageTxt(st0.wage)), '역할 ', ROLECHIP(st0.role)], 'renew', '재계약')); else opts.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, '계약 만료'), h('span', { class: 'mute' }, `${cur.name}이(가) 재계약을 제안하지 않았습니다${why}.`))); }
    else {
      if (st0.extend) opts.push(stanceRow(cur, st0.extend.asked ? '재계약 요청 수락' : st0.extend.proactive ? '구단의 선제 재계약 제안' : '계약 연장 제안', [st0.extend.proactive || st0.extend.asked ? `새 계약 ${st0.extend.years}년` : `계약 마지막 해 · ${st0.extend.years}년 연장`, h('b', null, wageTxt(st0.extend.wage)), S.car.wage ? h('span', { class: 'chip good' }, `주급 +${Math.round((st0.extend.wage / S.car.wage - 1) * 100)}%`) : '', '신뢰 +5'], 'extend', '서명'));
      else if (S.car.status === 'first' && S.renY !== S.w.year) opts.push(h('div', { class: 'reqbox' }, h('div', null, h('b', null, '구단에 재계약·연봉 인상 요청'), h('div', { class: 'mute', style: { fontSize: '12px' } }, '활약·역할·현재 주급에 따라 결과가 갈립니다. 거절되면 감독 신뢰가 조금 떨어집니다. 이적시장마다 1회.')), h('div', null, h('button', { class: 'btn ghost sm', onclick: () => { const r = GM.askRenewal(S); toast(r && r.ok ? '구단이 재계약 요청을 받아들였습니다.' : `거절: ${r ? r.why : ''}`); U.save(); render(); } }, '재계약 요청'))));
      else if (S.renY === S.w.year && !st0.extend) opts.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, '이번 이적시장의 재계약 요청은 거절되었습니다.'));
      opts.push(stanceRow(cur, st0.extend ? '연장 없이 잔류' : '잔류', [`계약 ${S.car.contract + 1}년 여름까지${st0.left === 1 ? ' (마지막 해)' : ''}`, h('b', null, wageTxt(S.car.wage)), '예상 역할 ', ROLECHIP(st0.role)], 'stay', '잔류', !!st0.extend));
    }
  }
  if (st0.block) out.push(h('div', { class: 'chip bad' }, '구단이 핵심 선수 이적을 꺼립니다. 이적 시 신뢰가 깎입니다.'));
  out.push(h('div', { style: { display: 'grid', gap: '8px' } }, ...opts));
  out.push(h('div', { class: 'lbl', style: { marginTop: '4px' } }, S.offers.length ? `받은 제안 ${S.offers.filter(o => !o.withdrawn).length}건` : '받은 제안 없음'));
  if (!S.offers.length) out.push(h('p', { class: 'mute', style: { margin: 0, fontSize: '13px' } }, S.p.age >= 33 ? '나이가 많아 관심을 보이는 팀이 줄었습니다.' : '이번 여름에는 관심을 보인 팀이 없습니다.'));
  S.offers.forEach((o, i) => { if (!o.withdrawn) out.push(offerRow(o, i)); });
  // 역제의
  if (S.car.status !== 'youth' || st0.youthEnd) {
    if (S.reqY !== S.w.year) {
      const req = mode => { const got = GM.requestMove(S, mode); toast(got && got.length ? `에이전트가 ${got.length}개 구단의 제안을 받아 왔습니다.` : '에이전트가 연락을 돌렸지만 응답한 구단이 없습니다.'); U.save(); render(); };
      out.push(h('div', { class: 'reqbox' }, h('div', null, h('b', null, '에이전트에게 이적 추진 요청'), h('div', { class: 'mute', style: { fontSize: '12px' } }, '이번 이적시장에 한 번만 쓸 수 있습니다.')),
        h('div', { class: 'reqbtns' },
          h('button', { class: 'btn ghost sm', onclick: () => req('up') }, '상위 구단 도전', h('small', null, '성공률 낮음')),
          h('button', { class: 'btn ghost sm', onclick: () => req('same') }, '비슷한 수준', h('small', null, '보통')),
          h('button', { class: 'btn ghost sm', onclick: () => req('down') }, '출전 우선', h('small', null, '하부·주급 삭감 수용')))));
    } else out.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, '이번 이적시장의 에이전트 요청은 이미 사용했습니다.'));
  }
  const fin = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
  const mustLeave = !cur || st0.release || (st0.expired && !st0.renew);
  if (mustLeave && S.offers.some(o => o.type === 'loan')) S.offers = S.offers.filter(o => o.type !== 'loan');
  if (mustLeave) fin.append(h('button', { class: 'btn ghost sm', onclick: () => decide({ kind: 'free' }) }, '무소속으로 1년 개인 훈련'));
  if (S.p.age >= 30) fin.append(h('button', { class: 'btn ghost sm', onclick: () => confirmRetire() }, '은퇴 선언'));
  if (fin.childNodes.length) out.push(fin);
  return out;
}
function stanceRow(c, title, terms, kind, btn, ghost) {
  return h('div', { class: 'offer', style: tintStyle(c, .2) }, watermark(c), crest(c, 40), h('div', null, h('div', { class: 'cn' }, title), h('div', { class: 'terms' }, ...terms.map(t => typeof t === 'string' ? h('span', null, t) : t))), h('div', { class: 'btns' }, h('button', { class: 'btn sm' + (ghost ? ' ghost' : ''), onclick: () => decide({ kind }) }, btn)));
}
function offerRow(o, i) {
  const c = club(o.club), lg = S.w.lg[c.lg];
  const negBtn = o.neg ? h('span', { class: 'chip ' + (o.negRes === 'up' ? 'good' : '') }, o.negRes === 'up' ? '조건 개선' : '조건 동일') : h('button', { class: 'btn ghost sm', title: '50% 조건 개선 · 30% 동일 · 20% 제안 철회', onclick: () => { const r = GM.negotiate(S, i); toast(r.negRes === 'up' ? '연봉이 올랐습니다!' : r.negRes === 'gone' ? `${c.name}이(가) 제안을 철회했습니다.` : '조건은 그대로입니다.'); render(); } }, '협상');
  return h('div', { class: 'offer', style: Object.assign(tintStyle(c, .22), { animationDelay: i * 60 + 'ms' }) }, watermark(c), crest(c, 40),
    h('div', { style: { minWidth: 0 } }, h('div', { class: 'cn' }, c.name, ' ', o.type === 'loan' ? h('span', { class: 'chip blue' }, '임대') : o.free ? h('span', { class: 'chip good' }, '자유 계약') : null, o.cut ? h('span', { class: 'chip bad' }, `주급 ${o.cut}% 삭감`) : null, o.req ? h('span', { class: 'chip' }, '역제의') : null),
      h('div', { class: 'terms' }, h('span', null, lg.name), h('span', null, '전력 ', h('b', null, c.str.toFixed(1))), h('span', null, '역할 ', ROLECHIP(o.role)), o.type !== 'loan' ? h('span', null, h('b', null, wageTxt(o.wage)), ` · ${o.years}년`) : h('span', null, '1시즌'), o.fee ? h('span', null, '이적료 ', h('b', null, C.fmtEUR(o.fee))) : null)),
    h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => decide({ kind: 'offer', i }) }, '수락'), o.type !== 'loan' ? negBtn : null));
}
function decide(d) {
  const prev = S.car.club;
  GM.decideWindow(S, d);
  if (S.phase === 'retired') { finishRetire(); return; }
  if (S.phase === 'freeYear') { U.save(); render(); return; }
  if (S.car.club !== prev) { U.save(); render(); scrollTo({ top: 0, behavior: 'smooth' }); joinCeremony(club(S.car.club), S.car.status === 'loan' ? '임대 이적' : (S.clubsJoined[S.clubsJoined.length - 1] || {}).fee ? `이적료 ${C.fmtEUR(S.clubsJoined[S.clubsJoined.length - 1].fee)}` : '입단'); return; }
  U.save(); render();
}
function joinCeremony(c, sub) {
  const t = teamTint(c), t2 = hexRGB(t.b);
  confetti(110, [t.a, t.b, '#ffffff']);
  const lg = c.lg ? S.w.lg[c.lg] : null;
  overlay(close => { setTimeout(() => close(), 3600); return [h('div', { class: 'join', style: { background: `radial-gradient(520px 360px at 50% 20%, ${rgba(t.rgb, .55)}, transparent 70%), linear-gradient(160deg, ${rgba(t.rgb, .35)}, ${rgba(t2, .18)} 60%, var(--panel))` }, onclick: () => close() },
    h('div', { class: 'big' }, crest(c, 132)), h('div', { class: 'lbl', style: { color: 'rgba(255,255,255,.75)' } }, sub), h('h2', null, c.name), h('p', null, lg ? lg.name : ''), h('span', { class: 'dim', style: { fontSize: '12px' } }, '눌러서 넘기기'))]; });
}
U.joinCeremony = joinCeremony;
function confirmRetire() {
  overlay(close => [h('div', { class: 'head' }, h('h2', null, '은퇴할까요?'), h('span', { class: 'mute' }, `${S.p.age}세 · 커리어가 여기서 끝납니다.`)), h('div', { class: 'body' }, h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onclick: () => close(false) }, '계속 뛴다'), h('button', { class: 'btn gold', onclick: () => close(true) }, '은퇴 선언')))]).then(ok => { if (ok) { GM.decideWindow(S, { kind: 'retire' }); finishRetire(); } });
}
function afterNext() { if (S.phase === 'retired') { finishRetire(); toast('더 이상 뛸 팀이 없어 은퇴했습니다.'); } else { U.save(); render(); } }
async function finishRetire() { const sum = GM.summary(S); const last = S.hist[S.hist.length - 1]; const id = 'c' + Date.now(); await archiveCareer(id); const bs = C.bio ? C.bio.score(S) : null; await U.saveHof({ id, letter: bs ? bs.grade : '', score: bs ? bs.score : null, name: S.p.name, nat: S.p.nat, pos: S.p.pos, peak: sum.peak, apps: sum.total.apps, goals: sum.total.goals, assists: sum.total.assists, caps: sum.nt.apps, tp: sum.tp, aw: sum.aw, bd: sum.bd, grade: sum.grade[0], retireAge: S.p.age, lastClub: last ? last.clubName : '' }); U.save(); render(); confetti(200); }
function freeBlock() {
  return [h('div', { class: 'lbl' }, `${S.w.year} 시즌 · 무소속`), h('h2', null, '팀 없이 한 시즌'), h('p', { class: 'mute', style: { margin: 0 } }, '혼자 훈련하며 다음 여름 제안을 기다립니다. 경기에 나서지 못해 능력치가 떨어질 수 있습니다. 2년 연속 무소속이면 은퇴합니다.'),
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn', onclick: () => { GM.freeYear(S); afterNext(); } }, '1년 개인 훈련'), h('button', { class: 'btn ghost', onclick: () => confirmRetire() }, '은퇴'))];
}
function trainingBlock() {
  const out = [];
  const ss = S.car;
  let focus = ss.focus || 'balance', inten = ss.intensity || 'normal';
  const keys = C.FOCUS_MENU[S.p.pos === 'GK' ? 'gk' : 'field'];
  if (!keys.includes(focus)) focus = 'balance';
  const tgt = k => { const m = C.focusMap(S.p, k); const ks = Object.keys(m); return ks.length && ['weak', 'strong'].includes(k) ? '대상: ' + ks.map(x => `${C.ALABEL[x]} ${Math.round(S.p.a[x])}`).join(' · ') : ''; };
  const grid = h('div', { class: 'focusgrid' });
  const draw = () => { grid.innerHTML = ''; keys.forEach(k => grid.append(h('button', { class: focus === k ? 'on' : '', onclick: () => { focus = k; draw(); } }, h('b', null, C.FOCUS[k][0]), h('span', null, C.FOCUS[k][1]), tgt(k) ? h('span', { class: 'tg' }, tgt(k)) : null))); };
  draw();
  const seg = h('div', { class: 'seg' }, ...Object.entries(C.INTENSITY).map(([k, v]) => h('button', { class: inten === k ? 'on' : '', onclick: e => { inten = k; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); note.textContent = INOTE[k]; } }, v[0])));
  const INOTE = { light: '성장 82% · 부상 위험 70% · 노쇠화 소폭 지연', normal: '성장 100% · 부상 위험 100%', hard: '성장 120% · 부상 위험 145%' };
  const note = h('div', { class: 'mute', style: { fontSize: '12px', textAlign: 'center' } }, INOTE[inten]);
  out.push(h('div', null, h('div', { class: 'lbl' }, `${seasonLabel()} 프리시즌`), h('h2', { style: { marginTop: '2px' } }, '이번 시즌 훈련 계획')),
    h('div', { class: 'chg' }, S.car.status !== 'youth' ? h('span', { class: 'chip' }, `감독 신뢰 ${Math.round(S.car.trust)}`) : null),
    grid, h('div', { class: 'lbl' }, '훈련 강도'), seg, note,
    h('button', { class: 'btn', onclick: () => { GM.setTraining(S, focus, inten); render(); } }, '시즌 시작'));
  return out;
}
function eventBlock() {
  const b = S.pend[0];
  const el = h('div', { class: 'ev' + (b.cross ? ' cross' : '') });
  const head = h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, h('div', { class: 'ico' }, icon(b.icon, 28)), h('div', null, h('div', { class: 'lbl' }, b.cross ? h('span', { class: 'chip gold' }, `중요 분기점 · ${S.p.age}세`) : S.phase === 'preEvents' ? '프리시즌' : '시즌 중반'), h('h2', null, b.title)));
  el.append(head, h('p', { class: 'mute', style: { margin: 0 } }, b.desc));
  const opts = h('div', { class: 'opts' });
  b.opts.forEach((o, i) => {
    const outs = h('div', { class: 'outs' }, ...o.out.map((x, j) => h('div', { class: 'out ' + (x.good > 0 ? 'good' : x.good < 0 ? 'bad' : ''), 'data-j': j }, h('span', null, x.chip), C.cfg.showOdds ? h('span', { class: 'p' }, Math.round(x.p * 100) + '%') : null)));
    opts.append(h('button', { class: 'opt', onclick: () => pickEvent(i, opts) }, watermark(club(S.car.club), 96, 'wm-opt'), h('div', { class: 't' }, o.label), h('div', { class: 'd' }, o.desc), outs));
  });
  el.append(opts);
  return el;
}
async function pickEvent(i, optsEl) {
  if (busy) return; busy = true;
  const b = S.pend[0];
  const o0 = C.ovrOf(S.p);
  const log = GM.resolve(S, i);
  // 결과 룰렛 연출
  const btn = optsEl.children[i]; const chips = [...btn.querySelectorAll('.out')];
  [...optsEl.children].forEach((c, k) => { if (k !== i) c.style.opacity = '.35'; c.style.pointerEvents = 'none'; });
  const hitIdx = b.opts[i].out.findIndex(x => x.chip === log.chip);
  if (chips.length > 1) { for (let r = 0; r < 9; r++) { chips.forEach((c, k) => c.classList.toggle('hit', k === r % chips.length)); await sleep(70 + r * 18); } }
  chips.forEach((c, k) => { c.classList.toggle('hit', k === hitIdx); c.classList.toggle('miss', k !== hitIdx); });
  await sleep(450);
  const res = h('div', { class: 'result' }, h('b', null, log.chip), log.text ? h('span', { class: 'mute', style: { fontSize: '13px' } }, log.text) : null,
    log.changes.length ? h('div', { class: 'chg' }, ...log.changes.map(([k, v]) => h('span', { class: 'chip ' + (typeof v === 'number' ? (v > 0 ? 'good' : v < 0 ? 'bad' : '') : '') }, `${k} ${typeof v === 'number' ? (v > 0 ? '+' : '') + (Math.abs(v) >= 1000 ? C.fmtEUR(v) : v) : v}`))) : null,
    h('button', { class: 'btn sm', style: { justifySelf: 'start' }, onclick: () => { busy = false; render(); } }, '계속'));
  btn.parentNode.parentNode.append(res);
  const o1 = C.ovrOf(S.p);
  if (o1 !== o0) { const v = $('#ovrVal'), t = $('#ovrTile'); if (v) countUp(v, o0, o1, 800); if (t && o1 > o0) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); } }
  if (log.good > 0) confetti(40);
  busy = false;
}
// ----- 시즌 진행 -----
function simBlock() {
  const ss = S.ss, half = ss.half;
  // 경기 진행 중 다른 탭에 다녀와도 진행 화면을 그대로 이어서 보여 준다
  if (st.simming && st.simNodes) return st.simNodes;
  const out = [];
  const c = club(ss.club), lg = C.leagueOf(S);
  out.push(h('div', null, h('div', { class: 'lbl' }, `${ss.label} · ${half === 1 ? '전반기 (8월–12월)' : '후반기 (1월–5월)'}`), h('h2', { style: { marginTop: '2px' } }, half === 1 ? '시즌 개막' : '후반기 시작')));
  const sr = ss.sr;
  out.push(h('div', { class: 'chg' }, ROLECHIP(ss.role), lg ? h('span', { class: 'chip' }, lg.name) : null, ss.cont ? h('span', { class: 'chip gold' }, C.COMPS[ss.cont].name) : null, ss.nt ? h('span', { class: 'chip blue' }, ss.nt.lvl === 'A' ? '국가대표 발탁' : `${ss.nt.lvl} 대표팀`) : null, ss.penTaker ? h('span', { class: 'chip' }, 'PK 전담') : null));
  if (sr && sr.rivals && S.car.status !== 'youth') out.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, `같은 자리 경쟁: 상위 ${sr.n}명이 주전. 나 ${Math.round(sr.me)} vs ${sr.rivals.map(v => Math.round(v)).join(' · ')}`));
  st.speed = normSpeed(st.speed);
  const spd = h('div', { class: 'seg', id: 'spdSeg' }, ...SPEEDS.map(([k, l]) => h('button', { class: st.speed === k ? 'on' : '', 'data-k': k, onclick: e => { st.speed = k; spd.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); if (st.stepWake && k !== 'step') st.stepWake(); } }, l)));
  const gc = goalChip(); if (gc) out.push(gc);
  out.push(h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', alignItems: 'center' } }, h('span', { class: 'lbl' }, '진행 속도'), spd));
  out.push(h('button', { class: 'btn', id: 'runBtn', onclick: () => runHalf() }, half === 1 ? '전반기 진행' : '후반기 진행'));
  out.push(h('div', { id: 'live', style: { display: 'grid', gap: '10px' } }));
  return out;
}
// 대회별 색 구분
const COMPCLS = { league: 'l', cup: 'c', lcup: 'lc', cont: 'e', nt: 'n', ntY: 'ny', youth: 'y' };
const COMPLBL = { league: '리그', cup: '국내 컵', lcup: '리그컵', cont: '대륙', nt: 'A매치', ntY: '연령별', youth: '유스' };
function compTag(comp, name, stage) { return h('span', { class: 'cpt cp-' + (COMPCLS[comp] || 'l'), title: name || '' }, (COMPLBL[comp] || '') + (stage ? ' · ' + stage : '')); }
U.compTag = compTag; U.COMPCLS = COMPCLS;
function tickRow(m) {
  const res = m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : 'D';
  const sc = `${m.gf}-${m.ga}` + (m.pens ? (m.pens === 'W' ? ' (PK승)' : ' (PK패)') : '');
  const info = m.played ? [m.st.goals ? `${m.st.goals}골` : '', m.st.assists ? `${m.st.assists}도움` : '', m.injury ? `부상 ${m.injury.days}일` : '', m.st.red ? '퇴장' : ''].filter(Boolean).join(' · ') : (m.why || '');
  return h('div', { class: 'tk tkc-' + (COMPCLS[m.comp] || 'l') }, h('span', { class: 'mute' }, C.fmtDate(m.d)), h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, compTag(m.comp, m.compName, m.stage), ' ', h('b', { style: { fontWeight: 600 } }, m.oppName), ' ', h('span', { class: 'dim' }, m.compName), info ? h('span', { style: { color: m.injury ? '#ff9a9d' : 'var(--gold)' } }, ' · ' + info) : null), h('span', { class: 'res ' + res }, sc), m.played && m.rating ? rt1(m.rating) : h('span', { class: 'rt r0' }, m.played ? '-' : '–'));
}
// 단계별 진행용 경기 카드
function matchCard(m) {
  const nt = m.comp === 'nt' || m.comp === 'ntY', youth = m.comp === 'youth';
  const me = nt ? { name: m.natTeam || C.natName(S.p.nat), crest: natCrest(S.p.nat, 44) } : { name: club(S.ss.club).name + (youth ? (S.p.age <= 17 ? ' U18' : ' U21') : ''), crest: crest(club(S.ss.club), 44) };
  const oc = !nt && S.w.clubs[m.opp];
  const op = { name: m.oppName, crest: nt ? natCrest(m.opp, 44) : crest(oc || null, 44) };
  const homeFirst = m.home !== false;
  const L = homeFirst ? me : op, Rr = homeFirst ? op : me, gl = homeFirst ? m.gf : m.ga, gr = homeFirst ? m.ga : m.gf;
  const res = m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : (m.pens === 'W' ? 'W' : m.pens === 'L' ? 'L' : 'D');
  const s = m.st || {};
  const items = m.played ? [
    ['출전', `${s.min || 0}분`], ['득점', s.goals || 0], ['도움', s.assists || 0],
    S.p.pos === 'GK' ? ['선방', s.saves || 0] : ['슈팅', `${s.shots || 0} (유효 ${s.sot || 0})`],
    ['패스', s.passAtt ? `${s.passOk}/${s.passAtt}` : '-'], S.p.pos === 'GK' ? ['실점', s.concOn || 0] : ['드리블', s.dribAtt ? `${s.dribOk}/${s.dribAtt}` : '-']] : [];
  const tint = oc ? tintStyle(oc, .14) : {};
  return h('div', { class: 'mcard ' + res, style: tint },
    oc ? watermark(oc) : null,
    h('div', { class: 'mc-h' }, h('span', { class: 'mute' }, C.fmtDate(m.d)), compTag(m.comp, m.compName, m.stage), h('span', { class: 'mute' }, m.compName), m.home == null ? h('span', { class: 'mute' }, '중립') : h('span', { class: 'mute' }, m.home ? '홈' : '원정')),
    h('div', { class: 'mc-sc' },
      h('div', { class: 'mc-t' }, L.crest, h('b', null, L.name)),
      h('div', { class: 'mc-n' }, h('span', null, gl), h('i', null, ':'), h('span', null, gr), m.pens ? h('small', null, m.pens === 'W' === homeFirst ? 'PK 승' : 'PK 패') : null),
      h('div', { class: 'mc-t' }, Rr.crest, h('b', null, Rr.name))),
    m.played ? h('div', { class: 'mc-me' },
      h('div', { class: 'mc-r' }, h('div', { class: 'lbl' }, '평점'), rt1(m.rating), s.motm ? h('span', { class: 'chip gold', style: { marginTop: '4px' } }, 'POTM') : null),
      h('div', { class: 'mc-st' }, ...items.map(([k, v]) => h('div', null, h('div', { class: 'lbl' }, k), h('b', null, v))))) :
      h('div', { class: 'mute', style: { textAlign: 'center', padding: '6px 0' } }, m.why || '출전하지 않음'),
    m.injury ? h('div', { class: 'chip bad', style: { justifySelf: 'center' } }, `부상 · ${m.injury.days}일 결장`) : null,
    s.red ? h('div', { class: 'chip bad', style: { justifySelf: 'center' } }, '퇴장') : null);
}
async function runHalf() {
  if (busy) return; busy = true;
  const btn = $('#runBtn'); if (btn) btn.style.display = 'none';
  const live = $('#live');
  st.simming = true; st.simNodes = [...live.parentNode.childNodes];
  const prog = h('div', { class: 'prog' }, h('i'));
  const mkLine = (lbl) => h('div', null, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, lbl), h('div', { class: 'statline' }, ...[['경기', 'apps'], ['득점', 'goals'], ['도움', 'assists'], ['평점', 'r']].map(([l, k]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v', 'data-k': k }, '0')))));
  const pro = S.car.status === 'youth' ? null : mkLine('1군 (프로)');
  const yth = mkLine(S.p.age <= 17 ? 'U18 유스 리그' : 'U21 유스 리그'); yth.style.display = 'none';
  const stage = h('div', { class: 'mstage' });
  const tick = h('div', { class: 'ticker' });
  live.append(prog, ...(pro ? [pro] : []), yth, stage, tick);
  const ss = S.ss, end = C.halfEnd(S);
  const total = ss.fx.filter(f => f.d < end).length - ss.i;
  let n = 0;
  const fill = (el, list) => { const t = C.totalAgg(list); el.querySelector('[data-k=apps]').textContent = t.apps; el.querySelector('[data-k=goals]').textContent = t.goals; el.querySelector('[data-k=assists]').textContent = t.assists; el.querySelector('[data-k=r]').textContent = t.rated ? C.avgRating(t).toFixed(2) : '-'; };
  const upd = () => {
    const ym = ss.matches.filter(m => m.comp === 'youth');
    if (pro) fill(pro, ss.matches.filter(m => !['nt', 'ntY', 'youth'].includes(m.comp)));
    if (ym.length) { yth.style.display = ''; fill(yth, ym); }
  };
  const waitStep = m => new Promise(resolve => {
    const done = () => { document.removeEventListener('keydown', kd); st.stepWake = null; resolve(); };
    const kd = e => { if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && !document.querySelector('.ov')) { e.preventDefault(); done(); } };
    st.stepWake = done;
    stage.replaceChildren(matchCard(m), h('div', { class: 'mc-btns' },
      h('button', { class: 'btn', onclick: done }, n >= total ? '결과 보기' : '다음 경기 ▸'),
      h('button', { class: 'btn ghost sm', onclick: () => { st.speed = 'auto'; const sg = $('#spdSeg'); if (sg) sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === 'auto')); done(); } }, '남은 경기 자동 진행'),
      h('span', { class: 'mute', style: { fontSize: '12px' } }, `${n} / ${total}경기 · Enter 키로 다음`)));
    document.addEventListener('keydown', kd);
  });
  const hooks = {
    match: async m => {
      if (S.newsQ && S.newsQ.length) { const big = S.newsQ.filter(x => x.big && x.k !== 'transfer'); S.newsQ = []; for (const x of big) { toast(x.t); if (x.k === 'mile' || x.k === 'hat') confetti(50); } }
      n++; prog.firstChild.style.width = Math.min(100, n / Math.max(1, total) * 100) + '%'; tick.prepend(tickRow(m)); upd();
      const sp = normSpeed(st.speed);
      if (sp === 'step') await waitStep(m);
      else { if (stage.firstChild) stage.replaceChildren(); if (sp === 'auto') await sleep(160); else if (sp === 'fast') await sleep(35); }
    },
    moment: mc => U.playMoment(mc)
  };
  try { await GM.simHalf(S, hooks); } catch (e) { console.error(e); toast('시뮬레이션 중 오류가 났습니다.'); }
  busy = false; st.simming = false; st.simNodes = null;
  if (S.phase === 'endSeason') { await sleep(300); finishSeasonFlow(); }
  else render();
}
function teamRankBox(tr, when) {
  return h('div', { class: 'trank' }, h('div', null, h('div', { class: 'lbl' }, `${when} 팀 내 평점`), h('div', { class: 'num', style: { fontSize: '22px', fontWeight: 800 } }, `${tr.n}명 중 ${tr.rank}위`), h('div', { class: 'mute', style: { fontSize: '12px' } }, `내 평균 평점 ${tr.myR.toFixed(2)}`)),
    h('div', { class: 'tlist' }, ...tr.top.map((x, i) => h('div', { class: x.me ? 'me' : '' }, h('span', { class: 'mute' }, i + 1), h('span', { class: 'tpos' }, x.pos), h('span', null, x.me ? `${x.n} (나)` : x.n), rt2(x.r)))));
}
U.teamRankBox = teamRankBox;
function midBlock() {
  const ss = S.ss, out = [];
  const t = C.totalAgg(ss.matches.filter(m => !['nt', 'ntY'].includes(m.comp)));
  const lg = C.leagueOf(S); const tb = lg ? C.sortTable(ss.tables[lg.id]) : null; const pos = tb ? tb.findIndex(r => r.id === ss.club) + 1 : 0;
  out.push(h('div', null, h('div', { class: 'lbl' }, `${ss.label} · 전반기 종료`), h('h2', { style: { marginTop: '2px' } }, '겨울 휴식기')));
  out.push(h('div', { class: 'statline' }, ...[['경기', t.apps], ['득점', t.goals], ['도움', t.assists], ['평점', t.rated ? C.avgRating(t).toFixed(2) : '-']].map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v' }, v)))));
  out.push(h('div', { class: 'chg' }, lg ? h('span', { class: 'chip' }, `${lg.name} · ${pos}위`) : null, ROLECHIP(ss.role), S.car.status !== 'youth' ? h('span', { class: 'chip' }, `감독 신뢰 ${Math.round(S.car.trust)}`) : null, ss.inj > 0 ? h('span', { class: 'chip bad' }, `부상 중 · ${ss.inj}일`) : null));
  { const gc = goalChip(); if (gc) out.push(gc); }
  { const tr = C.teamRank(S); if (tr) out.push(teamRankBox(tr, '전반기')); }
  if (ss.moments.length) out.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, '결정적 순간: ', ...ss.moments.map(m => h('span', { class: 'chip ' + (m.ok ? 'good' : 'bad'), style: { marginRight: '4px' } }, m.title))));
  out.push(h('button', { class: 'btn', onclick: () => { GM.toMidEvents(S); render(); } }, '계속'));
  return out;
}
function winterBlock() {
  const out = [h('div', null, h('div', { class: 'lbl' }, `${S.w.year + 1}년 1월 이적시장`), h('h2', { style: { marginTop: '2px' } }, '겨울 이적 제안'))];
  out.push(h('p', { class: 'mute', style: { margin: 0 } }, '후반기를 다른 팀에서 보낼 수 있습니다. 새 팀의 대륙 대회에는 등록할 수 없습니다.'));
  S.winterOffers.forEach((o, i) => { const c = club(o.club), lg = S.w.lg[c.lg]; out.push(h('div', { class: 'offer', style: tintStyle(c, .22) }, watermark(c), crest(c, 40), h('div', null, h('div', { class: 'cn' }, c.name, ' ', o.type === 'loan' ? h('span', { class: 'chip blue' }, '임대') : null), h('div', { class: 'terms' }, h('span', null, lg.name), h('span', null, '역할 ', ROLECHIP(o.role)), o.fee ? h('span', null, '이적료 ', h('b', null, C.fmtEUR(o.fee))) : null)), h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => { GM.winterMove(S, i); render(); joinCeremony(c, o.type === 'loan' ? '겨울 임대 이적' : '겨울 이적'); } }, '수락')))); });
  out.push(h('button', { class: 'btn ghost', onclick: () => { GM.winterMove(S, -1); render(); } }, '남는다'));
  return out;
}
async function finishSeasonFlow() {
  if (S.phase !== 'endSeason') return;
  const o0 = C.ovrOf(S.p), v0 = S.value || 0;
  GM.endSeason(S);
  S.reviewAnim = { o0, v0, shown: false };
  U.save();
  render();
}
function reviewBlock() {
  const r = S.hist[S.hist.length - 1], ss = S.lastSeason, out = [];
  const anim = S.reviewAnim || { shown: true };
  out.push(h('div', null, h('div', { class: 'lbl' }, `${r.label} 시즌 결산 · ${r.age}세`), h('h2', { style: { marginTop: '2px' } }, r.clubName)));
  out.push(h('div', { class: 'statline' }, ...[['경기', r.total.apps], ['득점', r.total.goals], ['도움', r.total.assists], ['평점', r.rating ? r.rating.toFixed(2) : '-']].map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v', 'data-cu': typeof v === 'number' ? v : '' }, anim.shown ? v : (typeof v === 'number' ? '0' : v))))));
  if (r.youth && r.youth.apps) out.push(h('div', { class: 'result', style: { padding: '10px 12px' } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' } }, h('span', null, h('span', { class: 'chip blue' }, r.youthLabel || 'U18'), ' 유스 리그'), h('span', { class: 'num' }, `${r.youth.apps}경기 ${r.youth.goals}골 ${r.youth.assists}도움 `, r.youthRating ? rt2(r.youthRating) : ''))));
  const res = [];
  if (r.lgName) res.push(h('span', { class: 'chip' + (r.lgPos === 1 ? ' gold' : '') }, `${r.lgName} ${r.lgPos}위/${r.lgN}`));
  if (r.cupName && r.cupOut) res.push(h('span', { class: 'chip' + (r.cupOut === '우승' ? ' gold' : '') }, `${r.cupName} ${r.cupOut === '우승' ? '우승' : r.cupOut + ' 탈락'}`));
  if (r.lcupName && r.lcupOut) res.push(h('span', { class: 'chip' + (r.lcupOut === '우승' ? ' gold' : '') }, `${r.lcupName} ${r.lcupOut === '우승' ? '우승' : r.lcupOut + ' 탈락'}`));
  if (r.contName) res.push(h('span', { class: 'chip' + (r.contOut === '우승' ? ' gold' : '') }, `${r.contName} ${r.contOut === '우승' ? '우승' : r.contOut ? r.contOut + ' 탈락' : ''}`));
  if (r.tourn) res.push(h('span', { class: 'chip' + (r.tourn.won ? ' gold' : ' blue') }, `${r.tourn.name} ${r.tourn.stage}`));
  if (ss && ss.promo && ss.promo[r.club]) res.push(h('span', { class: 'chip ' + (ss.promo[r.club] > 0 ? 'good' : 'bad') }, ss.promo[r.club] > 0 ? '승격!' : '강등'));
  if (r.ballon) res.push(h('span', { class: 'chip gold' }, `발롱도르 ${r.ballon}위`));
  if (r.tourn && S.w.intl && S.w.intl[r.tourn.y]) res.push(h('button', { class: 'chip', style: { cursor: 'pointer' }, onclick: () => { st.wv = Object.assign(st.wv || {}, { mode: 'intl', iy: String(r.tourn.y), ik: r.tourn.k }); U.setTab('table'); } }, `${r.tourn.y} 국제 대회 대진 보기 ›`));
  out.push(h('div', { class: 'chg' }, ...res));
  if (r.awards.length) out.push(h('div', { class: 'chg' }, ...r.awards.map(a => h('span', { class: 'chip gold' }, trophy(a.k, 14, '#f2c14e'), a.t))));
  if (ss && !ss.tr) ss.tr = C.teamRank(S, ss);
  if (ss && ss.tr) out.push(teamRankBox(ss.tr, '시즌'));
  if (r.goal) out.push(h('div', { class: 'goalbar' }, h('span', { class: 'lbl' }, '시즌 목표'), h('span', null, r.goal.label), h('b', { class: r.goal.ok ? 'up' : 'dn' }, r.goal.ok ? '달성' : '실패')));
  if (r.perfBonus) out.push(h('div', { class: 'mute', style: { fontSize: '13px' } }, `성과급 ${C.fmtEUR(r.perfBonus)} 지급`));
  // 성장
  const g = ss && ss.growth;
  if (g) {
    const box = h('div', { class: 'grow' });
    const groups = S.p.pos === 'GK' ? [['GK', '골키핑']] : C.GROUPS;
    for (const [gk, gl] of groups) {
      const keys = C.AK.filter(k => C.AGROUP[k] === gk);
      const col = h('div', { class: 'g' }, h('div', { class: 'lbl' }, gl));
      keys.forEach(k => {
        const a = Math.round(g.before[k]), b = Math.round(g.after[k]), d = b - a;
        const v = h('span', { class: 'v' }, anim.shown ? b : a);
        const bar = h('i', { style: { width: (anim.shown ? b : a) + '%', background: barCol(b) } });
        col.append(h('div', { class: 'arow' }, h('span', null, C.ALABEL[k]), v, h('span', { class: 'd ' + (d > 0 ? 'up' : d < 0 ? 'dn' : 'dim') }, d ? (d > 0 ? '+' : '') + d : ''), h('div', { class: 'bar' }, bar)));
        if (!anim.shown) setTimeout(() => { countUp(v, a, b, 1200); bar.style.width = b + '%'; }, 500);
      });
      box.append(col);
    }
    out.push(h('div', { class: 'lbl' }, `능력치 변화 · OVR ${g.o0} → ${g.o1}`), box);
  }
  const vv = h('b', { class: 'num', style: { fontSize: '20px' } }, C.fmtEUR(anim.shown ? S.value : anim.v0));
  out.push(h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('span', { class: 'mute' }, '시장 가치'), vv));
  out.push(h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn', onclick: () => { S.phase = 'reviewDone'; GM.nextSeason(S); afterNext(); } }, '다음 시즌'), h('button', { class: 'btn ghost', onclick: () => { st.viewIdx = S.hist.length - 1; U.setTab('profile'); } }, '시즌 상세 기록')));
  if (!anim.shown) {
    anim.shown = true;
    setTimeout(async () => {
      document.querySelectorAll('[data-cu]').forEach(el => { const v = +el.dataset.cu; if (el.dataset.cu !== '') countUp(el, 0, v, 900); });
      countUp(vv, anim.v0, S.value, 1400, x => C.fmtEUR(Math.round(x / 1e4) * 1e4));
      const t = $('#ovrTile'), ov = $('#ovrVal'); if (ov && g) { countUp(ov, g.o0, g.o1, 1300); if (g.o1 > g.o0 && t) { t.classList.add('flash'); } }
      await sleep(900);
      await ceremonies(r);
    }, 60);
  }
  return out;
}
const barCol = v => v >= 85 ? '#2f8cf0' : v >= 75 ? '#2fbf71' : v >= 60 ? '#f2c14e' : v >= 45 ? '#f08c2e' : '#e5484d';
U.barCol = barCol;
async function ceremonies(r) {
  if (!C.cfg.ceremonies) return;
  const items = r.trophies.map(t => ({ k: t.k, t: t.t, s: t.club + ' · ' + t.y, team: true })).concat(r.awards.map(a => ({ k: a.k, t: a.t, s: a.v || r.label })));
  for (const it of items) {
    confetti(it.team ? 220 : 120);
    await overlay(close => {
      setTimeout(() => close(), 3800);
      return [h('div', { class: 'ceremony', onclick: () => close() }, h('div', { class: 'big' }, trophy(it.k, 150, it.team ? null : (['ballon', 'golden'].includes(it.k) ? '#f2c14e' : '#e9eef5'))), h('div', { class: 'lbl' }, it.team ? '우승' : '수상'), h('h2', null, it.t), h('p', null, it.s), h('span', { class: 'dim', style: { fontSize: '12px' } }, '눌러서 넘기기'))];
    }, {});
  }
}
function retiredBlock() {
  const sum = GM.summary(S), out = [];
  out.push(h('div', null, h('div', { class: 'lbl' }, `${S.w.year}년 · ${S.p.age}세 은퇴`), h('h2', { style: { fontFamily: 'var(--font-display)', fontSize: '34px', textTransform: 'uppercase' } }, sum.grade[0])), h('p', { class: 'mute', style: { margin: 0 } }, sum.grade[1]));
  out.push(h('div', { class: 'statline' }, ...[['경기', sum.total.apps], ['득점', sum.total.goals], ['도움', sum.total.assists], ['최고 OVR', sum.peak]].map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v' }, v)))));
  out.push(h('div', { class: 'chg' }, h('span', { class: 'chip gold' }, `팀 트로피 ${sum.tp}`), h('span', { class: 'chip gold' }, `개인상 ${sum.aw}`), sum.bd ? h('span', { class: 'chip gold' }, `발롱도르 ${sum.bd}회`) : null, h('span', { class: 'chip' }, `A매치 ${sum.nt.apps}경기 ${sum.nt.goals}골`), h('span', { class: 'chip' }, `구단 ${sum.clubs}곳`), h('span', { class: 'chip' }, `최고 가치 ${C.fmtEUR(sum.maxV)}`)));
  if (U.bioBlock) out.push(U.bioBlock(S));
  out.push(h('div', { style: { display: 'flex', gap: '8px' } }, S.viewOnly ? null : h('button', { class: 'btn gold', onclick: () => newCareer() }, '새 커리어'), h('button', { class: 'btn ghost', onclick: () => U.setTab('records') }, '전체 기록 보기')));
  return out;
}
})(window);
