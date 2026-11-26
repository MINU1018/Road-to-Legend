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
// 경기 상세 기록 (시즌별로 따로 저장, 모든 시즌)
const mxCache = {};
async function flushMx(o) {
  const w = o && o.w; if (!w) return;
  // 진행 중인 해의 기록은 계속 채워지므로 바뀌었을 때만 쓰고 메모리에 남겨 둔다
  const curLb = w.cal ? C.wLabel(w.year) : null;
  if (w.mxPending) for (const lb of Object.keys(w.mxPending)) { const st = w.mxPending[lb]; mxCache[lb] = st; if (lb === curLb && !st._dirty) continue; try { const d = st._dirty; delete st._dirty; await kvSet('mx:' + lb, JSON.stringify(st)); if (lb === curLb) { /* keep */ } else delete w.mxPending[lb]; void d; } catch (e) { console.error('mx save', e); } }
  if (w.mxDrop) { for (const lb of w.mxDrop) { delete mxCache[lb]; await kvDel('mx:' + lb); } w.mxDrop = []; }
  // 시즌 중 추가된 이적 기록(무소속 영입 등)을 해당 이적시장 기록에 합친다
  if (w.txAdd) for (const lb of Object.keys(w.txAdd)) {
    const add = w.txAdd[lb]; delete w.txAdd[lb]; if (!add || !add.length) continue;
    let base = (w.txPending && w.txPending[lb]) || txCache[lb];
    if (!base) { try { const t = await kvGet('tx:' + lb); base = t ? GM.parse(t) : []; } catch (e) { base = []; } if (base && !Array.isArray(base)) base = base.r || []; }
    base.push(...add); w.txPending = w.txPending || {}; w.txPending[lb] = base; if (!(w.txKeys || []).includes(lb)) (w.txKeys = w.txKeys || []).push(lb);
  }
  // 이적 기록 (시즌 이적시장별)
  if (w.txPending) for (const lb of Object.keys(w.txPending)) { txCache[lb] = w.txPending[lb]; try { await kvSet('tx:' + lb, JSON.stringify(w.txPending[lb])); } catch (e) { console.error('tx save', e); } delete w.txPending[lb]; }
  if (w.txDrop) { for (const lb of w.txDrop) { delete txCache[lb]; await kvDel('tx:' + lb); } w.txDrop = []; }
  // 10시즌 지난 이적 기록은 이적료가 있었던 이동과 OVR 75 이상 선수만 남긴다 (용량)
  const old = []; // 이적 기록도 모든 시즌 보관
  for (const lb of old.slice(0, 2)) { try { const t = await kvGet('tx:' + lb); const v = t ? GM.parse(t) : null; if (Array.isArray(v)) { const r = v.filter(x => x[4] > 0 || x[5] >= 75); await kvSet('tx:' + lb, JSON.stringify({ trim: 1, r })); delete txCache[lb]; } (w.txTrim = w.txTrim || {})[lb] = 1; } catch (e) { console.error('tx trim', e); } }
}
const txCache = {};
// 아직 저장 전인 시즌 중 이적(무소속 영입)을 붙여서 돌려준다
const withAdd = (label, v) => { const a = S && S.w && S.w.txAdd && S.w.txAdd[label]; return a && a.length ? (v || []).concat(a) : v; };
U.getTx = async function (label) {
  if (!S || !S.w || !(S.w.txKeys || []).includes(label)) return null;
  if (S.w.txPending && S.w.txPending[label]) return withAdd(label, S.w.txPending[label]);
  if (txCache[label]) return withAdd(label, txCache[label]);
  const t = await kvGet('tx:' + label); if (!t) return withAdd(label, null);
  let v = GM.parse(t); if (v && !Array.isArray(v) && v.r) { const a = v.r; a.trim = 1; v = a; } if (v) txCache[label] = v; return withAdd(label, v);
};
U.txCached = label => { const v = (S && S.w && S.w.txPending && S.w.txPending[label]) || txCache[label] || null; return v ? withAdd(label, v) : null; };
U.withTx = function (label, onReady) { const v = U.txCached(label); if (v) return v; U._txL = U._txL || {}; if (!U._txL[label]) { U._txL[label] = 1; U.getTx(label).then(x => { delete U._txL[label]; if (x && onReady) onReady(); }); } return null; };
async function purgeMx(o) { const keys = (o && o.w && o.w.mxKeys) || []; for (const lb of keys) { delete mxCache[lb]; await kvDel('mx:' + lb); } for (const lb of (o && o.w && o.w.txKeys) || []) { delete txCache[lb]; await kvDel('tx:' + lb); } await kvDel('calh');
  const ck = await kvGet('chk'); if (ck) for (const k of ck.split('|')) await kvDel('ch:' + k); await kvDel('chk'); chKeys = null; chCache.clear();
  const ak = await kvGet('ark'); if (ak) for (const k of ak.split('|')) await kvDel('ar:' + k); await kvDel('ark'); }
U.getMx = async function (label) {
  if (!S || !S.w || !(S.w.mxKeys || []).includes(label)) return null;
  if (S.w.mxPending && S.w.mxPending[label]) return S.w.mxPending[label];
  if (mxCache[label]) return mxCache[label];
  const t = await kvGet('mx:' + label); if (!t) return null;
  const st = GM.parse(t); if (st) { if (st.gp && S.w.cal) Object.defineProperty(st, 'P', { value: C.calDict(S.w).P, enumerable: false, writable: true, configurable: true }); mxCache[label] = st; } return st;
};
U.mxCached = label => (S && S.w && S.w.mxPending && S.w.mxPending[label]) || mxCache[label] || null;
// 세계 달력의 진행 중 경기 기록(무거운 부분)은 'calh'에 따로
// 진행 중 경기 기록: 대회별 키('ch:<대회>')로 나눠 바뀐 대회만 쓴다 (매일 전체 12MB를 쓰던 것을 수백 KB로)
let chKeys = null; const chCache = new Map();
// 대회마다 문자열로 만들어 지난번 저장과 비교하고, 달라진 대회만 쓴다 (어느 코드가 바꿨는지 따로 추적하지 않아도 안전)
async function flushCal(o, all) { const w = o && o.w; if (!w || !w.cal || !w.cal.h) return;
  if (all) chCache.clear();
  const snap = [];
  for (const k in w.cal.h) { const t = JSON.stringify(w.cal.h[k]); if (chCache.get(k) !== t) snap.push([k, t]); }
  const gone = [...chCache.keys()].filter(k => !(k in w.cal.h));
  if (!snap.length && !gone.length && !all) return;
  w.cal.dirty = 0; if (C._hd) C._hd.clear();
  try { for (const [k, t] of snap) { await kvSet('ch:' + k, t); chCache.set(k, t); }
    for (const k of gone) { await kvDel('ch:' + k); chCache.delete(k); }
    const ks = Object.keys(w.cal.h).join('|'); if (ks !== chKeys) { chKeys = ks; await kvSet('chk', ks); }
    await kvDel('calh'); } catch (e) { console.error('calh save', e); } }
// 시즌 보관 기록: 시즌별 키('ar:<시즌>'), 바뀐 시즌만
async function flushArch(o, all) { const w = o && o.w; if (!w || !w.arch) return; const ad = C._ad || new Set();
  if (all) for (const k in w.arch) ad.add(k);
  if (!ad.size) return;
  const keys = [...ad]; ad.clear(); const snap = keys.filter(k => w.arch[k]).map(k => [k, JSON.stringify(w.arch[k])]);
  try { for (const [k, t] of snap) await kvSet('ar:' + k, t); await kvSet('ark', Object.keys(w.arch).join('|')); } catch (e) { for (const k of keys) ad.add(k); console.error('arch save', e); } }
// 저장에서 따로 떼어 둔 부분 다시 붙이기 (진행 중 경기 기록 · 선수 기록 · 시즌 보관 기록)
async function loadSide(S) {
  if (S.w.cal && !S.w.cal.h) { const ks = await kvGet('chk'); if (ks != null) { S.w.cal.h = {}; chKeys = ks; chCache.clear(); for (const k of ks.split('|').filter(Boolean)) { const t = await kvGet('ch:' + k); if (t) { S.w.cal.h[k] = GM.parse(t) || {}; chCache.set(k, t); } } } else { const ht = await kvGet('calh'); S.w.cal.h = ht ? (GM.parse(ht) || {}) : {}; if (C._hd) for (const k in S.w.cal.h) C._hd.add(k); } }
  if (!S.w.ps) { const pt = await kvGet('ps'); S.w.ps = pt ? (GM.parse(pt) || {}) : {}; }
  if (S.w.arch && C._ad && (await kvGet('ark')) == null) for (const k in S.w.arch) C._ad.add(k); // 예전 저장(보관 기록이 저장 안에 있던 형식): 다음 저장 때 시즌별로 옮긴다
  if (!S.w.arch) { const ks = await kvGet('ark'); if (ks != null) { S.w.arch = {}; for (const k of ks.split('|').filter(Boolean)) { const t = await kvGet('ar:' + k); if (t) S.w.arch[k] = GM.parse(t); } } }
}
U.save = function () { if (!S || S.viewOnly) return; clearTimeout(saveT); saveT = setTimeout(async () => { await flushMx(S); const t = GM.serialize(S); if (!t) return; await flushCal(S); await flushArch(S); const ok = await kvSet('save', t); hasSave = ok; if (C.psDirty) { C.psDirty = false; await kvSet('ps', JSON.stringify(S.w.ps || {})); } }, 300); };
U.saveNow = async function () { if (!S || S.viewOnly) return; clearTimeout(saveT); await flushMx(S); const t = GM.serialize(S); if (!t) return; await flushCal(S); await flushArch(S); hasSave = await kvSet('save', t); if (C.psDirty) { C.psDirty = false; await kvSet('ps', JSON.stringify(S.w.ps || {})); } };

// ---------- 이펙트 ----------
function countUp(el, a, b, dur = 900, fmt = v => Math.round(v)) {
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(a + (b - a) * e); if (k < 1) requestAnimationFrame(step); };
  if (C.cfg.anim === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(b); return; }
  requestAnimationFrame(step);
}
U.countUp = countUp;
function toast(msg, ms) { const t = h('div', { class: 'toast' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms || 2200); return t; }
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
    // 다시 열 수 있는 팝업(경기 상세 등): 이 팝업에서 다른 화면으로 가면 '뒤로'가 팝업까지 되살린다
    if (opts.reopen) { if (!opts.reopen.parent && U._ovClosed && U._ovClosed.fn !== opts.reopen && Date.now() - U._ovClosed.t < 700) opts.reopen.parent = U._ovClosed.fn; U._ov = opts.reopen; }
    const close = v => { if (opts.reopen && U._ov === opts.reopen) { U._ov = null; U._ovClosed = { fn: opts.reopen, t: Date.now() }; } ov.style.animation = 'fadeIn .2s reverse both'; setTimeout(() => ov.remove(), 180); res(v); };
    const box = h('div', { class: 'ovbox' + (opts.cls ? ' ' + opts.cls : '') }, typeof content === 'function' ? content(close) : content);
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
// 2군·U23·유스 팀은 자체 로고가 없으면 1군 로고를 쓴다 (c.parent, 없으면 이름으로 1군을 찾는다: '… B', '… II', '… U23', '용 …', '… 카스티야')
let PMAP = null;
function parentOf(c) {
  if (!c) return null; if (c.parent) return c.parent;
  const w = S && S.w; if (!w) return null;
  if (!PMAP || PMAP.w !== w) { PMAP = { w, m: {} }; const byName = new Map(); for (const id in w.clubs) byName.set(w.clubs[id].nat + '|' + w.clubs[id].name, id);
    for (const id in w.clubs) { const x = w.clubs[id]; if (x.parent || id === 'NED_WII') continue; const m = /^(.+?) (B|II|U2[0-9]|U1[0-9]|카스티야|아틀레틱)$/.exec(x.name) || /^용 (.+)$/.exec(x.name); if (!m) continue; const p = byName.get(x.nat + '|' + m[1]); if (p && p !== id) PMAP.m[id] = p; } }
  return PMAP.m[c.id] || null;
}
function crest(c, size = 32) {
  let lg = c && C.logos && C.logos.club(c.id || c.club);
  if (!lg && c && C.logos) { const p = parentOf(c); if (p) lg = C.logos.club(p); }
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
// ---------- 포지션별 기록 지표 ----------
// GK: 실점·클린시트·선방 / 수비: 골·도움 + 태클·가로채기·걷어내기 / 미드필더: 기회 창출·패스 / 공격: 슈팅·xG
const pctOf = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
U.PK = pos => { const r = C.ROLE[pos]; return r === 'GK' ? 'GK' : r === 'CB' || r === 'FB' ? 'DF' : r === 'DM' ? 'DM' : r === 'CM' || r === 'AM' ? 'MF' : 'AT'; };
const PC = {
  g: ['골', t => t.goals || 0], a: ['도움', t => t.assists || 0],
  ca: ['실점', t => t.concOn || 0], cs: ['클린시트', t => t.cs || 0], sv: ['선방', t => t.saves || 0], svp: ['선방률', t => pctOf(t.saves || 0, t.sotFaced || 0)],
  tk: ['태클', t => t.tackles || 0], it: ['가로채기', t => t.ints || 0], cl: ['걷어내기', t => t.clear || 0], bl: ['슛 차단', t => t.blocks || 0], dfa: ['차단', t => (t.tackles || 0) + (t.ints || 0)],
  ch: ['기회 창출', t => t.chances || 0], pp: ['패스 성공률', t => pctOf(t.passOk || 0, t.passAtt || 0)], sh: ['슈팅', t => t.shots || 0], xg: ['xG', t => (t.xg || 0).toFixed(1)], dr: ['드리블 성공', t => t.dribOk || 0]
};
const PSET = {
  full: { GK: ['ca', 'cs', 'sv', 'svp'], DF: ['g', 'a', 'tk', 'it', 'cl', 'cs'], DM: ['g', 'a', 'tk', 'it', 'pp'], MF: ['g', 'a', 'ch', 'pp'], AT: ['g', 'a', 'sh', 'xg'] },
  short: { GK: ['ca', 'cs', 'svp'], DF: ['g', 'a', 'dfa'], DM: ['g', 'a', 'dfa'], MF: ['g', 'a'], AT: ['g', 'a'] }
};
// 기록 열 목록: [제목, 값 함수]
U.pcols = (pos, mode) => (PSET[mode || 'full'][U.PK(pos)] || PSET.full.AT).map(k => PC[k]);
// "12경기 · 3골 · 1도움" 같은 한 줄 요약
U.pline = (pos, t) => [`${t.apps || 0}경기`].concat(U.pcols(pos, 'short').map(([l, f]) => `${l} ${f(t)}`)).join(' · ');
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
// 경기 시간 표시: 91분 이상은 후반 추가시간 (90+3')
// 나이: 생년월일이 있는 실제 선수는 오늘 날짜 기준, 없으면 시즌 나이
U.ageNow = (w, id, fb) => { const F = G.FC27, k = /^\d+$/.test(String(id)) && F && F.P[+id]; if (!k || !w || !w.cal) return fb; const a = Math.floor((w.cal.d - C.dayOf(2000, 1, 1) - k[9]) / 365.25); return a > 10 && a < 50 ? a : fb; };
U.fmtMin = m => m > 90 ? `90+${m - 90}'` : `${m}'`;
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
// 국가대표 기록: kind 'A' = A대표팀, 'Y' = 연령별(U17·U20·U23 등), 없으면 합계
function ntTotals(kind) {
  const t = C.blankStats();
  for (const hh of S.hist) {
    if (hh.ntA || hh.ntY) { if (kind !== 'Y' && hh.ntA) C.addStats(t, hh.ntA); if (kind !== 'A' && hh.ntY) C.addStats(t, hh.ntY); }
    else if (hh.nt) { const isA = !hh.ntLvl || hh.ntLvl === 'A'; if (!kind || (kind === 'A') === isA) C.addStats(t, hh.nt); }
  }
  if (S.ss) C.addStats(t, C.totalAgg(S.ss.matches.filter(m => kind === 'A' ? m.comp === 'nt' : kind === 'Y' ? m.comp === 'ntY' : ['nt', 'ntY'].includes(m.comp))));
  return t;
}
U.ntTotals = ntTotals;
const POSXY = { GK: [50, 92], CB: [50, 76], LB: [18, 76], RB: [82, 76], LWB: [18, 60], RWB: [82, 60], DM: [50, 60], CDM: [50, 60], CM: [50, 43], AM: [50, 26], CAM: [50, 26], LM: [18, 43], RM: [82, 43], LW: [18, 26], RW: [82, 26], ST: [50, 10] }; // 포지션 그리드: ST / LW AM RW / LM CM RM / LWB DM RWB / LB CB RB / GK
U.POSXY = POSXY;

// ---------- 라우터 ----------
function render() {
  // 새 화면을 먼저 다 만든 뒤 한 번에 교체한다 (비운 채로 그리면 높이가 0이 되며 깜빡이고 스크롤이 맨 위로 튄다)
  const app = $('#app'), frag = document.createDocumentFragment();
  // 진행 중인 게임 화면은 그 게임의 데이터셋 생년월일로 (실존 선수 고르기 화면에서 바꿨을 수 있다)
  if (C.TM && S && S.w && scr !== 'real' && scr !== 'create' && (S.ds !== 'tm' || C.TM.has('TMD'))) C.TM.apply(S.ds === 'tm');
  if (scr === 'home') frag.append(viewHome());
  else if (scr === 'create') frag.append(viewCreate());
  else if (scr === 'academy') frag.append(viewAcademy());
  else if (scr === 'real') frag.append(viewReal());
  else if (scr === 'wcnew' && U.viewWCNew) frag.append(U.viewWCNew());
  else if (scr === 'settings') { const inG = !!(S && (S.mode === 'world' || (S.car && S.car.club))); frag.append(topbar(inG)); frag.append(inG ? h('div', { class: 'shell' }, sideNav(false), h('main', { class: 'mainc' }, U.viewSettings())) : U.viewSettings()); if (inG && st.navOpen) frag.append(h('div', { class: 'drawerbg', onclick: () => { st.navOpen = false; render(); } }), sideNav(true)); }
  else if (scr === 'ach') { frag.append(topbar(false)); frag.append(U.pages.ach(true)); }
  else frag.append(viewGame());
  // 비동기 기록 로딩으로 잠시 페이지가 짧아져도, 곧 이어지는 다시 그리기에서 원래 위치로 돌아간다
  const kp = U._keepY && Date.now() - U._keepY.t < 2500 ? U._keepY.y : 0, y = Math.max(scrollY, kp);
  const mh = app.offsetHeight; app.style.minHeight = mh + 'px';
  app.replaceChildren(frag);
  if (Math.abs(scrollY - y) > 1) scrollTo(0, y);
  U._keepY = Math.abs(scrollY - y) > 1 ? { y, t: Date.now() } : (kp && scrollY >= kp - 1 ? null : U._keepY);
  requestAnimationFrame(() => { app.style.minHeight = ''; });
  if (scr !== 'game' && scr !== 'settings') setAtmo(null);
  if (U.flushAch) U.flushAch();
}
U.render = render;
// 같은 화면 안에서 다시 그리기 (펼치기·필터·정렬·탭): 스크롤 유지 + 등장 애니메이션 없이
U.stay = function () {
  const y = scrollY; render();
  const app = $('#app'); app.querySelectorAll('.screen').forEach(e => e.classList.add('still'));
  if (Math.abs(scrollY - y) > 1) scrollTo(0, y);
};
U.go = (s, t) => { if (s === 'settings' && scr !== 'settings') prevScr = scr; scr = s; if (t) tab = t; U._keepY = null; render(); scrollTo(0, 0); };
U.back = () => U.go(prevScr === 'settings' ? 'home' : prevScr);
U.loadSave = async o => { delete o.viewOnly; await purgeMx(S); if (o.w) { o.w.mxKeys = []; o.w.txKeys = []; } if (o.ds === 'tm' && !(await U.dsPrep('tm'))) return; if (C.TM) C.TM.apply(o.ds === 'tm'); repairSave(o); U.dsAfter(o); S = o; S.w.ps = S.w.ps || {}; if (S.w.cal) S.w.cal.dirty = 1; chKeys = null; await flushCal(S, true); await flushArch(S, true); await kvSet('save', GM.serialize(S) || JSON.stringify(o)); await kvSet('ps', JSON.stringify(S.w.ps)); hasSave = true; U.go('game', S.mode === 'world' ? 'wsim' : 'career'); };
U.clearSave = async () => { await purgeMx(S); S = null; await kvDel('save'); await kvDel('ps'); hasSave = false; U.go('home'); };
U.setTab = t => { tab = t; U._keepY = null; render(); scrollTo(0, 0); };
U.curTab = () => tab;
U.setTabQuiet = t => { tab = t; };

// 예전 저장 파일 보정: 팀 색이 비어 있는 구단에 색을 채운다
function repairSave(o) {
  if (o.w && C.mgrSeed && !(o.w.mgrV >= 2)) C.mgrSeed(o.w); // 실제 감독 (v35)
  if (o.w && C.mgrFill) { for (const x of o.w.mgrFree || []) C.mgrFill(o.w, x); for (const id in o.w.mgr || {}) C.mgrFill(o.w, o.w.mgr[id], o.w.clubs[id]); } // 명성·실력 (v36)
  if (o.w && C.rankInit && !o.w.rank) C.rankInit(o.w); // 국가대표 랭킹 (v35)
  if (o.w && C.crInit && !o.w.cr) C.crInit(o.w); // 세계 구단 랭킹 (v37)
  if (o.w && C.legSeed && !o.w.legPre) { C.legSeed(o.w); if (C.legAll && o.ds !== 'tm') C.legAll(o.w); } // 구단 레전드 (v37) · TFMKT는 실제 기록을 불러올 때마다 다시 만든다 (저장 안 함)
  // 난이도는 커리어별. 예전 저장은 당시 설정값을 새 난이도로 옮기고, 재능 한계가 없으면 성장 한계 기준으로 만든다
  if (!o.diff) o.diff = C.diffKey(C.cfg.difficulty);
  C.curDiff = o.diff;
  if (o.p && o.p.hid && !o.p.hid.cap && o.mode !== 'world') { const ov = C.ovrOf(o.p); o.p.hid.cap = Math.min(97, Math.max(o.p.hid.pot || ov, ov) + 2); }
  const ext = {}; for (const c of ((G.TC_EXT && G.TC_EXT.clubs) || [])) ext[c[0]] = c;
  for (const id in o.w.clubs) { const c = o.w.clubs[id]; const e = ext[id]; if (!c.c1) c.c1 = (e && e[3]) || '#3a4252'; if (!c.c2) c.c2 = (e && e[4]) || '#e9eef5'; }
  for (const r of o.hist || []) { if (!r.c1) r.c1 = (o.w.clubs[r.club] || {}).c1 || '#3a4252'; if (!r.c2) r.c2 = (o.w.clubs[r.club] || {}).c2 || '#e9eef5'; }
  // 이전 버전 저장: 모든 구단에 실제 명단·계약·주급·재정을 채운다
  if (o.w && o.w.clubs) { let need = false; for (const id in o.w.clubs) { const c = o.w.clubs[id]; if (c.lite && C.materialize) C.materialize(o.w, c); if (c.rev == null) need = true; } if (need && C.initFinance) C.initFinance(o.w); }
  // 세계 달력 연결: 이전 버전 저장은 지금 시점(그해 7월 31일)부터 달력을 새로 만든다
  if (o.w && !o.w.cal && C.calInit) { C.calInit(o); o.w.cal.dirty = 1; C.psDirty = true; if (o.mode === 'world') o.wStart = 1; }
  if (o.mode === 'world' && (o.ws || []).length) o.wStart = 1;
  if (o.w && o.w.cal && !o.w.cal.h) o.w.cal.h = {};
  if (o.ss && o.w && o.w.cal) { o.ss.tables = {}; const LS = o.ss.lgId && o.w.cal.lg[o.ss.lgId]; if (LS) o.ss.tables[o.ss.lgId] = LS.tb; }
}
U.startWorld = async function () {
  const d = { ds: C.cfg.dataset || 'fc27' }, busy = S && S.phase !== 'retired';
  const ok = await overlay(close => [h('div', { class: 'head' }, h('h2', null, '관전 모드 시작'), h('span', { class: 'mute' }, busy ? '진행 중인 저장을 덮어씁니다.' : '내 선수 없이 세계 축구만 진행합니다.')), h('div', { class: 'body' }, dsPicker(d), busy ? h('p', { class: 'mute' }, '먼저 설정에서 저장 파일로 내보내 두면 나중에 다시 불러올 수 있습니다.') : null, h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onclick: () => close(false) }, '취소'), h('button', { class: 'btn gold', onclick: () => close(true) }, '시작')))]);
  if (!ok) return;
  if (!(await U.dsPrep(d.ds))) return;
  await purgeMx(S); S = GM.newWorld(null, d.ds); hasSave = true; U.save(); U.go('game', 'wsim'); U.dsAfter(S);
};
// ---------- 데이터셋 (FC27 / FC27+TFMKT) ----------
// TFMKT 자료는 큰 파일이라 필요할 때 불러온다: 핵심(data_tm.js)은 새 게임·불러오기 전에, 경력 상세는 바탕에서 차례로
if (C.TM) C.TM.loader = file => new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = file; sc.async = true; sc.onload = () => res(); sc.onerror = () => rej(new Error(file)); document.head.append(sc); });
U.dsPrep = async function (ds) {
  if (ds !== 'tm' || !C.TM) return true;
  if (C.TM.has('TMD')) return true;
  const t = toast('Transfermarkt 데이터를 불러오는 중…', 60000);
  try { await C.TM.need('TMD'); } catch (e) { toast('데이터를 불러오지 못했습니다. 연결을 확인하세요.'); return false; } finally { if (t && t.remove) t.remove(); }
  return true;
};
// 시작 뒤 바탕에서 경력 상세를 미리 받아 둔다 (화면이 필요하면 그 조각을 먼저)
U.dsAfter = s => { if (C.TM) C.TM.apply(!!(s && s.ds === 'tm')); if (s && s.ds === 'tm' && C.TM) setTimeout(() => C.TM.prefetch(600), 1500); };
// 화면이 아직 없는 조각을 기다릴 때: 불러온 뒤 같은 화면이면 다시 그린다
U.tmWait = function (keys) { if (!C.TM) return; const k = [...new Set(keys)].join(','); U._tmw = U._tmw || new Set(); if (U._tmw.has(k)) return; U._tmw.add(k); C.TM.need(...keys).then(() => { U._tmw.delete(k); U.stay(); }).catch(() => U._tmw.delete(k)); };
const DSINFO = { fc27: ['FC27 ver.', 'FC27 데이터만 · 기록은 게임 시작(2026/27)부터'], tm: ['FC27+TFMKT ver.', '현재 명단·능력치는 FC27, 게임 이전 경력·이적·부상·시장가치·구단 역사는 Transfermarkt (2024/25까지, 2025/26은 구단만) · 추가 데이터 약 4MB'] };
function dsPicker(d) {
  const box = h('div', { class: 'diffpick dspick' });
  const draw = () => { box.innerHTML = ''; for (const k of ['fc27', 'tm']) { const [n, ds] = DSINFO[k]; box.append(h('button', { class: d.ds === k ? 'on' : '', onclick: () => { d.ds = k; C.cfg.dataset = k; U.kvSet && U.kvSet('cfg', JSON.stringify(C.cfg)); draw(); if (d.onch) d.onch(k); } }, h('b', null, n), h('span', { class: 'm' }, ds))); } };
  draw();
  return h('div', { class: 'diffsec' }, h('h3', { style: { margin: '0 0 6px' } }, '데이터셋'), box);
}
U.dsPicker = dsPicker;
U.boot = async function () {
  await U.loadSettings();
  if (C.logos && C.logos.probe) C.logos.probe(() => render());
  const t = await kvGet('save');
  if (t) { const o = GM.parse(t); if (o && o.w && o.p) { S = o; hasSave = true; await loadSide(S); if (o.ds === 'tm') await U.dsPrep('tm'); if (C.TM) C.TM.apply(o.ds === 'tm'); repairSave(S); U.dsAfter(S); } }
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
    cont && S.mode !== 'world' ? homeCard() : null,
    h('div', { class: 'hacts' },
      cont ? h('button', { class: 'btn gold big', onclick: () => U.go('game', S.mode === 'world' ? 'wsim' : 'career') }, S.mode === 'world' ? `관전 모드 이어하기 · ${S.w.year}/${String(S.w.year + 1).slice(2)} 시즌` : `이어하기 · ${esc(S.p.name)} (${S.p.age}세)${S.wc ? ' · 월드 커리어' : ''}`) : null,
      h('button', { class: cont ? 'btn ghost big' : 'btn gold big', onclick: () => newCareer() }, '새 커리어'),
      h('button', { class: 'btn ghost', onclick: () => { rdraft = { q: '', pos: '', diff: 'normal', pick: null }; U.go('real'); } }, '실존 선수로 시작'),
      U.viewWCNew ? h('button', { class: 'btn ghost wcbtn', title: '관전 모드의 세계에 내 선수를 넣어 커리어를 지켜보는 모드 · 훈련·상점 없음', onclick: () => { U.wcDraft = null; U.go('wcnew'); } }, '월드 커리어', h('span', { class: 'chip gold', style: { marginLeft: '6px', fontSize: '10px' } }, 'NEW')) : null,
      h('button', { class: 'btn ghost', onclick: () => U.pickSaveFile && U.pickSaveFile() }, '저장 파일 불러오기'),
      h('button', { class: 'btn ghost', title: '내 선수 없이 세계 축구만 시즌마다 시뮬레이션', onclick: () => U.startWorld && U.startWorld() }, '관전 모드 (시뮬레이션만)'),
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
U.closeArchive = async function () { const t = await kvGet('save'); const o = t ? GM.parse(t) : null; S = o && o.w && o.p ? o : null; if (S) { await loadSide(S); repairSave(S); } U.go('home'); };
function hofBlock() {
  const list = U.hof || [];
  if (!list.length) return null;
  return h('div', { class: 'panel' }, h('div', { class: 'ph' }, h('h3', null, '명예의 전당'), h('span', { class: 'mute' }, `은퇴한 선수 ${list.length}명`)),
    h('div', { class: 'tscroll' }, h('table', { class: 'mlog hof', style: { minWidth: '640px' } }, h('tbody', null, ...list.map(e => h('tr', { class: e.id ? 'click' : '', title: e.id ? '눌러서 기록 열람' : '상세 기록 없음 (이전 버전)', onclick: ev => { if (e.id && !ev.target.closest('button')) U.openArchive(e.id); } },
      h('td', null, flag(e.nat, 20)), h('td', { class: 'o' }, h('b', null, e.name), ' ', h('span', { class: 'mute' }, `${e.pos} · ${e.retireAge}세 은퇴 · ${e.lastClub}`)),
      h('td', null, e.letter ? h('span', { class: 'chip gold', style: { marginRight: '4px' } }, e.letter) : null, h('span', { class: 'chip gold' }, e.grade)), h('td', null, '최고 ', ovrb(e.peak)), h('td', { class: 'num' }, `${e.apps}경기 ${e.goals}골 ${e.assists}도움`), h('td', { class: 'num' }, `우승 ${e.tp}`), h('td', { class: 'num' }, e.bd ? `발롱도르 ${e.bd}회` : ''), h('td', null, e.id ? h('button', { class: 'btn ghost sm', onclick: () => U.exportArchive(e.id) }, '내보내기') : null)))))));
}
function newCareer() { draft = { name: '', num: 9, foot: 'R', nat: 'KOR', pos: 'ST', height: 180, style: 0, q: '', diff: 'normal', ds: C.cfg.dataset || 'fc27' }; U.go('create'); }
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
// ---------- 앱 틀: 위쪽 막대(날짜·검색·진행) + 왼쪽 메뉴(무리별) ----------
const ICO = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0', bars: 'M5 20V10m7 10V4m7 16v-7',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', play: 'M8 5v14l11-7z', coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v10m-3-7h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15',
  cup: 'M8 21h8m-4-4v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3m12-5h3v2a3 3 0 0 1-3 3', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  plus: 'M12 5v14M5 12h14', news: 'M4 5h13v14H6a2 2 0 0 1-2-2zm13 3h3v9a2 2 0 0 1-2 2M8 9h5m-5 4h5', cal: 'M4 6h16v14H4zM4 10h16M9 3v5m6-5v5',
  swap: 'M7 7h12l-3-3m3 13H5l3 3', award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm-3.5 4L7 22l5-2 5 2-1.5-3', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3l-4.5-4.5', menu: 'M4 7h16M4 12h16M4 17h16'
};
const ico = (k, sz = 18) => svg(`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICO[k]}"/></svg>`);
function navGroups() {
  if (S && S.mode === 'world') return [
    ['관전', [['wsim', '홈', 'home'], ['sched', '일정', 'cal'], ['news', '뉴스', 'news']]],
    ['세계 축구', [['table', '대회', 'cup'], ['rank', '파워랭킹', 'bars'], ['txm', '이적시장', 'swap'], ['hist', '시상·역사', 'award'], ['mfind', '경기 탐색', 'play'], ['db', '선수·팀', 'search']]]];
  return [
    S && S.wc ? ['내 커리어', [['career', '홈', 'home'], ['profile', '내 선수', 'user'], ['mx', '내 경기', 'play']]] :
    ['내 커리어', [['career', '홈', 'home'], ['profile', '선수 프로필', 'user'], ['attrs', '능력치', 'bars'], ['records', '시즌 기록', 'list'], ['mx', '내 경기', 'play'], ['value', '이적·가치', 'coin'], ['trophies', '트로피', 'cup'], ['ach', '도전과제', 'star'], ['inj', '부상', 'plus']]],
    ['세계 축구', [['news', '뉴스', 'news'], ['sched', '일정', 'cal'], ['table', '대회', 'cup'], ['rank', '파워랭킹', 'bars'], ['txm', '이적시장', 'swap'], ['hist', '시상·역사', 'award'], ['mfind', '경기 탐색', 'play'], ['db', '선수·팀', 'search']]]];
}
U.navGroups = navGroups;
const TABNAME = () => { const m = {}; for (const [, l] of navGroups()) for (const [k, n] of l) m[k] = n; return m; };
function needsAction() { return S && ['window', 'training', 'preEvents', 'midEvents', 'mid', 'winter', 'review', 'reviewDone', 'freeYear'].includes(S.phase); }
function sideNav(drawer) {
  const groups = navGroups(), need = S && S.mode !== 'world' && needsAction();
  return h('nav', { class: 'side' + (drawer ? ' drawer' : '') },
    ...groups.map(([g, items]) => h('div', { class: 'sgrp' }, h('div', { class: 'sgl' }, g),
      ...items.map(([k, l, ic]) => h('button', { class: 'sitem' + (tab === k ? ' on' : ''), 'data-tab': k, onclick: () => { if (busy && !st.simming) return; st.navOpen = false; scr = 'game'; U.setTab(k); } }, ico(ic), h('span', null, l), k === 'career' && need && tab !== 'career' ? h('span', { class: 'dot' }) : null)))),
    S && S.mode !== 'world' && S.p ? h('div', { class: 'sfoot' }, h('div', null, h('span', { class: 'lbl' }, '시즌'), h('b', null, seasonLabel())), h('div', null, h('span', { class: 'lbl' }, '재산'), h('b', null, C.fmtEUR(Math.max(0, S.p.money))))) : null);
}
// 위쪽 검색: 선수·구단·국가대표 바로 열기
function topSearch() {
  const box = h('div', { class: 'tsrch' });
  const list = h('div', { class: 'tsl' });
  const inp = h('input', { type: 'search', placeholder: '선수·구단·감독 검색', 'aria-label': '검색',
    oninput: e => { clearTimeout(box._t); box._t = setTimeout(() => draw(e.target.value), 150); },
    onkeydown: e => { if (e.key === 'Enter') { const d = (st.db = st.db || { view: 'home', q: '' }); d.q = inp.value; d.view = 'home'; d.id = null; U.setTab('db'); } if (e.key === 'Escape') { inp.value = ''; list.replaceChildren(); } },
    onblur: () => setTimeout(() => list.replaceChildren(), 200) });
  const draw = q => {
    list.replaceChildren();
    if (!U.dbSearch || !S || (q || '').trim().length < 2) return;
    const r = U.dbSearch(S.w, q), w = S.w, out = [], fq = U.fold(q);
    // 이름이 검색어와 같거나 단어가 검색어로 시작하면 앞으로
    const sc = n => { const f = U.fold(n); return f === fq ? 0 : f.split(' ').some(x => x.startsWith(fq)) ? 1 : 2; };
    const all = [].concat((r.comps || []).slice(0, 5).map(x => ({ s: Math.min(sc(x.n), x.t === 0 ? 0 : 2), t: -1, v: 10 - x.t, el: () => h('button', { class: 'tsi', onmousedown: () => U.openComp(x) }, x.nat ? flag(x.nat, 18) : trophy(x.k === 'intl' ? 'nt' : x.k === 'cont' ? 'cont' : 'cup', 18, '#f2c14e'), h('span', null, x.n), h('span', { class: 'mute' }, x.sub)) })), r.nats.slice(0, 4).map(n => ({ s: sc(C.natName(n)), t: 0, el: () => h('button', { class: 'tsi', onmousedown: () => U.openNat(n) }, U.natCrest(n, 18), h('span', null, `${C.natName(n)} 대표팀`), h('span', { class: 'mute' }, '국가대표')) })),
      (r.mgrs || []).slice(0, 5).map(x => ({ s: sc(x.n), t: 1.5, v: x.rep, el: () => h('button', { class: 'tsi', onmousedown: () => U.openMgr(x.n) }, flag(x.nat, 18), h('span', null, x.n), h('span', { class: 'mute' }, `감독 · ${x.club && w.clubs[x.club] ? w.clubs[x.club].name : '무직'}`)) })),
      r.clubs.slice(0, 8).map(c => ({ s: sc(c.name), t: 1, v: c.str, el: () => h('button', { class: 'tsi', onmousedown: () => U.openClub(c.id) }, crest(c, 18), h('span', null, c.name), h('span', { class: 'mute' }, (w.lg[c.lg] || {}).name || '')) })),
      r.players.slice(0, 20).map(x => ({ s: sc(x.n), t: 2, v: x.ovr || 0, el: () => h('button', { class: 'tsi', onmousedown: () => U.openPlayer(x.pid) }, flag(x.nat, 18), h('span', null, x.n), h('span', { class: 'mute tscl' }, x.retired ? ((w.ps[x.pid] || {}).ret ? '은퇴' : '무소속') : [`${x.pos} · ${x.ovr} · `, x.fa ? '무소속' : [crest(w.clubs[x.club] || null, 15), ' ', (w.clubs[x.club] || {}).name || '']])) })));
    all.sort((a, b) => a.s - b.s || a.t - b.t || (b.v || 0) - (a.v || 0));
    for (const x of all.slice(0, 10)) out.push(x.el());
    if (!out.length) out.push(h('div', { class: 'tsi mute' }, '결과 없음'));
    out.push(h('button', { class: 'tsi more', onmousedown: () => { const d = (st.db = st.db || { view: 'home', q: '' }); d.q = q; d.view = 'home'; d.id = null; U.setTab('db'); } }, '전체 결과 보기 ↵'));
    list.append(...out);
  };
  box.append(h('span', { class: 'tsic' }, ico('search', 16)), inp, list);
  return box;
}
function topbar(inGame) {
  const world = S && S.mode === 'world', w = S && S.w;
  const today = w && w.cal ? w.cal.d : null;
  let cont = null;
  if (inGame && S) {
    if (world && S.wStart && U.worldNext) cont = h('button', { class: 'btn sm contb', onclick: () => { if (!busy) U.worldNext(); } }, '다음 경기일 ▸');
    else if (!world && tab !== 'career') cont = h('button', { class: 'btn sm contb' + (needsAction() ? ' need' : ''), onclick: () => { if (!busy || st.simming) U.setTab('career'); } }, needsAction() ? '할 일 있음 ▸' : '커리어 홈 ▸');
  }
  return h('div', { class: 'top' }, h('div', { class: 'wrap topw' },
    inGame ? h('button', { class: 'gear burger', 'aria-label': '메뉴', onclick: () => { st.navOpen = !st.navOpen; render(); } }, ico('menu', 20)) : null,
    h('button', { class: 'brand', onclick: () => { if (!busy) U.go('home'); }, title: '처음 화면' }, h('span', { class: 'mk' }, 'R'), h('span', { class: 't' }, 'Road to Legend')),
    inGame ? h('span', { class: 'tpage' }, TABNAME()[tab] || '') : null,
    h('div', { style: { flex: 1 } }),
    inGame && today != null ? h('span', { class: 'tdate' }, `${C.fmtDateY(today)} (${'일월화수목금토'[C.toDate(today).getUTCDay()]})`) : null,
    inGame ? topSearch() : null,
    cont,
    h('button', { class: 'gear', title: '설정', 'aria-label': '설정', onclick: () => { if (!busy) U.go('settings'); } }, svg('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'))));
}
// 모든 최상위 화면의 머리: 제목 · 설명 · 오른쪽 동작
U.pageHead = (title, sub, ...right) => h('div', { class: 'pghead' }, h('div', null, h('h1', null, title), sub ? h('div', { class: 'mute' }, sub) : null), right.length ? h('div', { class: 'pha' }, ...right) : null);
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
// 난이도 선택 (새 커리어·실존 선수 공통). 확률은 꾸준히 출전하며 성장했을 때의 측정치
const DIFFINFO = {
  easy: ['쉬움', 'OVR 80 도달 약 55% · 85 약 32% · 90 약 10%', '성장 빠름 · 부상 적음 · 구단 관심 많음'],
  normal: ['보통', 'OVR 80 도달 약 32% · 85 약 12% · 90 약 2%', '기본 균형'],
  hard: ['어려움', 'OVR 80 도달 약 18% · 85 약 4% · 90 약 0.3%', '성장 느림 · 부상 잦음 · 구단 관심 적음'],
  real: ['현실', 'OVR 80 도달 약 7% · 85 약 1.5% · 90 약 0.1%', 'FC27 실제 프로 선수 분포 기준 (25~30세 80+ 4%, 85+ 0.8%)']
};
U.DIFFINFO = DIFFINFO;
function diffPicker(d) {
  const box = h('div', { class: 'diffpick' });
  const draw = () => { box.innerHTML = ''; for (const k of ['easy', 'normal', 'hard', 'real']) { const [n, pr, ds] = DIFFINFO[k]; box.append(h('button', { class: d.diff === k ? 'on' : '', onclick: () => { d.diff = k; draw(); } }, h('b', null, n), h('span', { class: 'pr' }, pr), h('span', { class: 'mute' }, ds))); } };
  draw();
  return h('div', { class: 'diffsec' }, h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' } }, h('h3', { style: { margin: 0 } }, '난이도'), h('span', { class: 'mute', style: { fontSize: '12px' } }, '재능 한계는 숨겨져 있고, 고른 난이도의 분포에서 정해집니다. 확률은 꾸준히 출전했을 때 기준이며 진행 중에는 바꿀 수 없습니다.')), box);
}
function viewCreate() {
  const d = draft || (draft = { name: '', num: 9, foot: 'R', nat: 'KOR', pos: 'ST', height: 180, style: 0, q: '', diff: 'normal' });
  if (!d.diff) d.diff = 'normal'; if (!d.ds) d.ds = C.cfg.dataset || 'fc27';
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
  box.append(h('div', { class: 'ph' }, h('h2', { style: { fontSize: '22px' } }, '선수 만들기'), h('span', { class: 'mute' }, '시작 능력치는 무작위, 성장은 당신의 선택과 활약에 달려 있습니다')), h('div', { class: 'cgrid' }, s1, s2, s3), diffPicker(d), dsPicker(d),
    h('div', { class: 'cfoot' }, h('button', { class: 'btn ghost', onclick: () => U.go('home') }, '뒤로'), h('button', { class: 'btn', onclick: async () => {
      if (!d.name.trim()) { toast('이름을 입력하세요.'); nameIn.focus(); return; }
      if (!(await U.dsPrep(d.ds))) return;
      purgeMx(S); S = GM.newGame({ name: d.name.trim(), num: d.num, foot: d.foot, nat: d.nat, pos: d.pos, height: d.height, style: d.style, difficulty: d.diff, ds: d.ds });
      U.dsAfter(S); U.go('academy');
    } }, '선수 확정')));
  w.append(h('div', { class: 'wrap create' }, box));
  return w;
}

// ---------- 실존 선수로 시작 ----------
let rdraft = null, rIndex = null;
function viewReal() {
  const d = rdraft || (rdraft = { q: '', pos: '', diff: 'normal', pick: null });
  if (!d.ds) d.ds = C.cfg.dataset || 'fc27';
  // 나이는 데이터셋의 생년월일 기준 (TFMKT는 Transfermarkt 생년월일)
  d.onch = async k => { if (!(await U.dsPrep(k))) return; if (C.TM) C.TM.apply(k === 'tm'); rIndex = null; U.stay(); };
  if (C.TM && (d.ds !== 'tm' || C.TM.has('TMD')) && C.TM.on() !== (d.ds === 'tm')) { C.TM.apply(d.ds === 'tm'); rIndex = null; }
  else if (d.ds === 'tm' && C.TM && !C.TM.has('TMD')) U.dsPrep('tm').then(ok => { if (ok) { C.TM.apply(true); rIndex = null; U.stay(); } });
  const w = h('div', { class: 'screen' }); w.append(topbar(false));
  const fold = t => (U.fold ? U.fold(t) : String(t).toLowerCase());
  if (!rIndex) { rIndex = GM.realList(); for (const x of rIndex) x.f = fold(x.n + ' ' + x.club); }
  const list = h('div', { class: 'reallist' });
  const info = h('div', { class: 'realpick' });
  const fill = () => {
    list.innerHTML = '';
    const q = fold(d.q.trim());
    const rows = rIndex.filter(x => (!d.pos || x.pos === d.pos) && (!q || x.f.includes(q))).slice(0, 80);
    if (!rows.length) list.append(h('div', { class: 'empty' }, '조건에 맞는 선수가 없습니다.'));
    for (const x of rows) list.append(h('button', { class: d.pick === x.i ? 'on' : '', onclick: () => { d.pick = x.i; fill(); drawInfo(); } },
      flag(x.nat, 18), h('span', { class: 'n' }, x.n), h('span', { class: 'chip', style: { fontSize: '10px' } }, x.pos), h('span', { class: 'mute' }, `${x.age}세`), h('span', { class: 'mute cl' }, x.club), ovrb(x.o)));
  };
  const drawInfo = () => {
    info.innerHTML = '';
    const x = rIndex.find(y => y.i === d.pick);
    if (!x) { info.append(h('div', { class: 'mute' }, '왼쪽 목록에서 선수를 고르세요. 그 선수의 실제 나이·능력치·소속 구단으로 2026/27 시즌을 시작합니다.')); return; }
    info.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, flag(x.nat, 28), h('div', null, h('h3', { style: { margin: 0 } }, x.n), h('div', { class: 'mute' }, `${C.natName(x.nat)} · ${C.POSKO[x.pos] || x.pos} · ${x.age}세 · ${x.club}`)), h('div', { style: { marginLeft: 'auto' } }, ovrb(x.o))),
      h('p', { class: 'mute', style: { fontSize: '12px', margin: '8px 0 0' } }, x.age <= 23 ? '어린 선수는 재능 한계가 현재 OVR보다 높게 정해지며, 얼마나 더 클지는 난이도와 활약에 달려 있습니다.' : x.age >= 31 ? '이미 전성기를 지난 나이입니다. 노쇠화를 얼마나 늦추느냐가 관건입니다.' : '전성기 나이입니다. 남은 성장 폭은 크지 않습니다.'));
  };
  fill(); drawInfo();
  const posSel = h('select', { onchange: e => { d.pos = e.target.value; fill(); } }, h('option', { value: '' }, '전체 포지션'), ...C.POS.map(p => { const o = h('option', { value: p }, `${p} · ${C.POSKO[p]}`); if (d.pos === p) o.selected = true; return o; }));
  const qIn = h('input', { type: 'search', placeholder: '선수 이름 또는 구단 (영문, 예: Son, Haaland, Yamal)', value: d.q, oninput: e => { d.q = e.target.value; clearTimeout(d.t); d.t = setTimeout(fill, 150); } });
  const box = h('div', { class: 'panel' },
    h('div', { class: 'ph' }, h('h2', { style: { fontSize: '22px' } }, '실존 선수로 시작'), h('span', { class: 'mute' }, 'FC27 데이터의 선수를 골라 그 나이·능력치·구단에서 커리어를 이어갑니다')),
    h('div', { class: 'realgrid' }, h('section', null, h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 170px)', gap: '8px' } }, qIn, posSel), list), h('section', null, info)),
    diffPicker(d), dsPicker(d),
    h('div', { class: 'cfoot' }, h('button', { class: 'btn ghost', onclick: () => U.go('home') }, '뒤로'), h('button', { class: 'btn', onclick: async () => {
      if (d.pick == null) { toast('선수를 고르세요.'); return; }
      if (!(await U.dsPrep(d.ds))) return;
      const nS = GM.newGameReal(d.pick, d.diff, d.ds); if (!nS) { toast('이 선수로는 시작할 수 없습니다.'); return; }
      purgeMx(S); S = nS; hasSave = true; U.save(); U.dsAfter(S); U.go('game', 'career'); setTimeout(() => toast(`${S.p.name} · ${club(S.car.club).name}에서 시작`), 250);
    } }, '이 선수로 시작')));
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
  if (S && S.mode === 'world' && !['wsim', 'sched', 'news', 'table', 'rank', 'txm', 'hist', 'mfind', 'db'].includes(tab)) tab = 'wsim';
  if (S && S.mode !== 'world' && tab === 'wsim') tab = 'career';
  const page = tab === 'career' ? viewHub() : U.pages[tab] ? U.pages[tab]() : h('div', { class: 'empty' }, '준비 중');
  w.append(h('div', { class: 'shell' }, sideNav(false), h('main', { class: 'mainc' }, page)));
  if (U.wsRunBar) { const rb = U.wsRunBar(); if (rb) w.append(rb); }
  if (st.navOpen) w.append(h('div', { class: 'drawerbg', onclick: () => { st.navOpen = false; render(); } }), sideNav(true));
  return w;
}
function kvTotals() {
  const t = careerTotals();
  return [['출전', t.apps]].concat(U.pcols(S.p.pos, 'short').slice(0, 2).map(([l, f]) => [l, f(t)])).map(([k, v]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', { class: 'v' }, v)));
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
    ...U.pcols(S.p.pos, 'short').map(([, f]) => h('td', { class: 'num', style: { textAlign: 'right' } }, t ? f(t) : '')),
    h('td', { style: { textAlign: 'right' } }, rating ? rt2(rating) : ''));
}
const tag = (t, cls, title) => h('span', { class: 'chip ' + (cls || ''), style: { fontSize: '10px', padding: '1px 6px' }, title }, t);
function careerTable() {
  const wrap = h('div', { class: 'panel', style: { padding: '12px 14px' } });
  const tb = h('tbody');
  const maxAge = Math.max(40, S.p.age + 1);
  const byAge = {};
  S.hist.forEach((r, i) => { byAge[r.age] = byAge[r.age] || []; byAge[r.age].push([r, i]); });
  const a0 = S.wc && S.wc.age0 != null ? Math.min(S.wc.age0, ...S.hist.map(r => r.age)) : 16;
  for (let a = a0; a <= maxAge; a++) {
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
    } else if (a > S.p.age || (S.phase === 'retired' && !rows)) tb.append(h('tr', { class: 'empty' }, h('td', { class: 'num' }, a), h('td', { colspan: 4 + U.pcols(S.p.pos, 'short').length }, '')));
  }
  const ntA = ntTotals('A'), ntY = ntTotals('Y'), ct = careerTotals(), yt = youthTotals();
  const foot = (icon, name, t) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 8px 2px' } }, icon, h('b', null, name), h('span', { style: { marginLeft: 'auto' }, class: 'num mute' }, U.pline(S.p.pos, t)));
  const heads = ['나이', '클럽', 'OVR', '경기'].concat(U.pcols(S.p.pos, 'short').map(x => x[0]), ['평점']);
  wrap.append(h('div', { class: 'tscroll' }, h('table', { class: 'ctable' }, h('thead', null, h('tr', null, ...heads.map((x, i) => h('th', { style: i >= 3 ? { textAlign: 'right' } : null }, x)))), tb)),
    h('div', { style: { borderTop: '1px solid var(--line)', marginTop: '6px', display: 'grid' } },
      foot(h('span', { class: 'chip', style: { fontSize: '10px' } }, '1군'), '프로 통산', ct),
      yt.apps ? foot(h('span', { class: 'chip', style: { fontSize: '10px' } }, '유스'), 'U18·U21 통산', yt) : null,
      foot(natCrest(S.p.nat, 22), C.natName(S.p.nat) + ' A대표팀', ntA),
      ntY.apps ? foot(h('span', { class: 'chip blue', style: { fontSize: '10px' } }, '연령별'), C.natName(S.p.nat) + ' 연령별 대표팀', ntY) : null));
  return wrap;
}
function viewHub() {
  if (S.wc && U.wcHub) return U.wcHub();
  if (U.followSync) U.followSync(S, st.wcv = st.wcv || {});
  const hub = h('div', { class: 'wrap hub' });
  const txp = (S.phase === 'h1' || S.phase === 'h2') && S.w.cal && U.txPanel && C.txWindowAt(S.w.cal.d) ? h('div', { class: 'panel', style: { overflow: 'hidden' } }, U.txPanel(S, { my: S.ss.club, compact: true, sel: st.txSel, onSel: d => { st.txSel = d; render(); } })) : null;
  const hero = (S.phase === 'h1' || S.phase === 'h2') && S.w.cal && U.tourHero ? U.tourHero(S) : null;
  const cerb = S.w.cal && U.cerBanner ? U.cerBanner(S, true) : null;
  const left = h('div', { style: { display: 'grid', gap: '16px', minWidth: 0 } }, playerCard(), cerb, actionPanel(), hero ? h('div', { class: 'panel', style: { overflow: 'hidden', padding: '12px' } }, hero) : null, txp, newsPanel(), U.followManager ? h('div', { class: 'prof' }, U.followManager(S)) : null);
  hub.append(left, careerTable());
  return hub;
}

// ---------- 진행 패널 ----------
function actionPanel() {
  const P = h('div', { class: 'panel', id: 'act' });
  const body = h('div', { class: 'pb act' });
  P.append(body);
  if (S.wc && C.WC) C.WC.tick(S);
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
  const y = S.w.year, today = S.w.cal ? S.w.cal.d : C.day(y, 8, 1), [ty, tm] = C.ymd(today);
  out.push(h('div', null, h('div', { class: 'lbl' }, `${ty}년 ${tm <= 2 ? '겨울' : '여름'} 이적시장 · ${C.fmtDateY(today)} · ${S.p.age}세`), h('h2', { style: { marginTop: '2px' } }, '커리어 결정')));
  const cur = club(S.car.club);
  const opts = [];
  if (cur) {
    const why = st0.why ? ` (사유: ${st0.why})` : '';
    if (st0.back && st0.expired) {
      const pc = club(st0.club);
      if (st0.renew) opts.push(stanceRow(pc, `${pc.name} 복귀 · 재계약 제안`, ['임대 종료와 함께 원소속팀 계약 만료', `${st0.years}년`, h('b', null, wageTxt(st0.wage)), '역할 ', ROLECHIP(st0.role)], 'renew', '재계약'));
      else opts.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, '임대 종료 · 원소속팀 계약 만료'), h('span', { class: 'mute' }, `${C.jo(pc.name, '이', '가')} 재계약을 제안하지 않았습니다${why}. 이제 자유 계약 선수입니다.`)));
    }
    else if (st0.back) opts.push(h('div', { class: 'offer' }, crest(club(st0.club), 40), h('div', null, h('div', { class: 'cn' }, `${club(st0.club).name} 복귀`), h('div', { class: 'terms' }, `임대 종료 · 계약 ${S.car.contract + 1}년 여름까지 · 예상 역할 `, ROLECHIP(st0.role))), h('div', { class: 'btns' }, h('button', { class: 'btn sm', onclick: () => decide({ kind: 'back' }) }, '복귀'))));
    else if (st0.promote) opts.push(stanceRow(cur, '1군 프로 계약 제안', ['3년 계약', '예상 역할 ', ROLECHIP(st0.role)], 'promote', '서명'), stanceRow(cur, 'U21에서 한 시즌 더', ['유스 계약 유지'], 'youth', '잔류', true));
    else if (st0.youthEnd) { if (st0.release) opts.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, `${cur.name}에서 방출 통보를 받았습니다.`), h('span', { class: 'mute' }, '다른 팀 제안을 받거나 무소속으로 남아야 합니다.'))); else opts.push(stanceRow(cur, '1군 백업 계약', ['2년 계약', '예상 역할 ', ROLECHIP(st0.role)], 'promote', '서명')); }
    else if (S.car.status === 'youth') opts.push(stanceRow(cur, '유스 잔류', ['1군 콜업을 노린다', '예상 역할 ', ROLECHIP('youth')], 'youth', '잔류'));
    else if (st0.expired) { if (st0.renew) opts.push(stanceRow(cur, '재계약 제안', [`${st0.years}년`, h('b', null, wageTxt(st0.wage)), '역할 ', ROLECHIP(st0.role)], 'renew', '재계약')); else opts.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, '계약 만료'), h('span', { class: 'mute' }, `${C.jo(cur.name, '이', '가')} 재계약을 제안하지 않았습니다${why}.`))); }
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
  // 월드 커리어: 내가 고른 구단에 직접 조건을 보낸다
  if (S.wc && U.wcDirect && S.car.status !== 'youth' || S.wc && U.wcDirect && st0.youthEnd) out.push(h('div', { class: 'reqbox' }, h('div', null, h('b', null, '구단에 직접 제안'), h('div', { class: 'mute', style: { fontSize: '12px' } }, `원하는 구단을 골라 역할·주급·계약 기간을 먼저 제시합니다 · 남은 횟수 ${C.WC.directLeft(S)}번`)),
    h('div', { class: 'reqbtns' }, h('button', { class: 'btn ghost sm', disabled: C.WC.directLeft(S) <= 0, onclick: () => U.wcDirect() }, '구단 고르기'))));
  const fin = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
  const mustLeave = !cur || st0.release || (st0.expired && !st0.renew);
  if (mustLeave && S.offers.some(o => o.type === 'loan')) S.offers = S.offers.filter(o => o.type !== 'loan');
  if (mustLeave) fin.append(h('button', { class: 'btn ghost sm', onclick: () => decide({ kind: 'free' }) }, '무소속으로 1년 개인 훈련'));
  if (S.wc && C.WC && C.WC.noClub(S) && (S.freeYears || 0) >= 1) { fin.innerHTML = ''; out.push(h('div', { class: 'result' }, h('b', { style: { color: '#ff9a9d' } }, '찾는 구단이 없습니다'), h('span', { class: 'mute' }, '한 해를 쉬었지만 연락해 오는 구단이 없습니다. 여기서 커리어를 마칩니다.'))); fin.append(h('button', { class: 'btn gold sm', onclick: () => { GM.retire(S, true); finishRetire(); } }, '은퇴')); }
  else if (S.p.age >= 30 || S.wc) fin.append(h('button', { class: 'btn ghost sm', onclick: () => confirmRetire() }, '은퇴 선언'));
  if (fin.childNodes.length) out.push(fin);
  return out;
}
function stanceRow(c, title, terms, kind, btn, ghost) {
  return h('div', { class: 'offer', style: tintStyle(c, .2) }, watermark(c), crest(c, 40), h('div', null, h('div', { class: 'cn' }, title), h('div', { class: 'terms' }, ...terms.map(t => typeof t === 'string' ? h('span', null, t) : t))), h('div', { class: 'btns' }, h('button', { class: 'btn sm' + (ghost ? ' ghost' : ''), onclick: () => decide({ kind }) }, btn)));
}
function offerRow(o, i) {
  const c = club(o.club), lg = S.w.lg[c.lg];
  const negBtn = S.wc && U.wcNeg ? (o.neg ? h('span', { class: 'chip' }, '협상 완료') : h('button', { class: 'btn ghost sm', onclick: () => U.wcNeg(i) }, '협상')) : o.neg ? h('span', { class: 'chip ' + (o.negRes === 'up' ? 'good' : '') }, o.negRes === 'up' ? '조건 개선' : '조건 동일') : h('button', { class: 'btn ghost sm', title: '50% 조건 개선 · 30% 동일 · 20% 제안 철회', onclick: () => { const r = GM.negotiate(S, i); toast(r.negRes === 'up' ? '연봉이 올랐습니다!' : r.negRes === 'gone' ? `${C.jo(c.name, '이', '가')} 제안을 철회했습니다.` : '조건은 그대로입니다.'); render(); } }, '협상');
  return h('div', { class: 'offer', style: Object.assign(tintStyle(c, .22), { animationDelay: i * 60 + 'ms' }) }, watermark(c), crest(c, 40),
    h('div', { style: { minWidth: 0 } }, h('div', { class: 'cn' }, c.name, ' ', o.type === 'loan' ? h('span', { class: 'chip blue' }, '임대') : o.free ? h('span', { class: 'chip good' }, '자유 계약') : null, o.cut ? h('span', { class: 'chip bad' }, `주급 ${o.cut}% 삭감`) : null, o.req ? h('span', { class: 'chip' }, o.req === 'direct' ? '직접 제안' : '역제의') : null, o.agent ? h('span', { class: 'chip' }, '에이전트') : null, S.wc && o.promise ? h('span', { class: 'chip', title: '협상에서 약속받은 역할' }, `약속: ${C.ROLELABEL[o.promise]}`) : null, S.wc && o.acc != null && !o.freeA ? h('span', { class: 'chip ' + (o.acc ? 'good' : 'bad'), title: o.acc ? '현 구단이 이적료 제안을 받아들였습니다. 거절하고 남으면 입지가 흔들릴 수 있습니다.' : '현 구단이 제안을 거절했습니다. 이적을 요청할 수는 있지만 막힐 수 있고, 관계가 상합니다.' }, o.acc ? (o.sell ? '구단 수락 · 정리 대상' : '구단 수락') : '구단 거절') : null, S.wc && o.rival >= 2 ? h('span', { class: 'chip bad', title: '라이벌 구단으로 가면 지금 팬들이 등을 돌립니다' }, '라이벌') : null),
      h('div', { class: 'terms' }, h('span', null, lg.name), h('span', null, '전력 ', h('b', null, c.str.toFixed(1))), h('span', null, '역할 ', ROLECHIP(o.role)), o.type !== 'loan' ? h('span', null, h('b', null, wageTxt(o.wage)), ` · ${o.years}년`) : h('span', null, '1시즌'), o.fee ? h('span', null, '이적료 ', h('b', null, C.fmtEUR(o.fee))) : null)),
    h('div', { class: 'btns' }, h('button', { class: 'btn sm' + (S.wc && o.acc === false ? ' ghost' : ''), onclick: () => decide({ kind: 'offer', i }) }, S.wc && o.acc === false ? '이적 요청' : '수락'), o.type !== 'loan' ? negBtn : null));
}
function decide(d) {
  const prev = S.car.club;
  const res = GM.decideWindow(S, d);
  if (res && res.blocked) { toast('구단이 이적을 막았습니다. 감독·팬과의 관계가 상했습니다.', 3200); U.save(); render(); return; }
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
  return [h('div', { class: 'lbl' }, `${C.fmtDateY(S.w.cal ? S.w.cal.d : 0)} · 무소속`), h('h2', null, '팀 없이 한 시즌'), h('p', { class: 'mute', style: { margin: 0 } }, '혼자 훈련하며 다음 여름 제안을 기다립니다. 경기에 나서지 못해 능력치가 떨어질 수 있습니다. 2년 연속 무소속이면 은퇴합니다.'),
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn', onclick: async e => { if (busy) return; busy = true; e.currentTarget.disabled = true; e.currentTarget.textContent = '1년 진행 중…'; try { await GM.freeYear(S); } catch (er) { console.error(er); } busy = false; afterNext(); } }, '1년 개인 훈련'), h('button', { class: 'btn ghost', onclick: () => confirmRetire() }, '은퇴'))];
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
    h('div', { class: 'mute', style: { fontSize: '12px', lineHeight: 1.5 } }, '훈련은 어떤 능력치를 얼마나 빨리 키울지를 정합니다. 최고로 도달할 수 있는 수준(재능 한계)은 훈련으로 바뀌지 않고, 한계에 가까울수록 오르는 폭이 줄어듭니다. 몸 관리·노쇠화 지연은 하락을 늦출 뿐이며, 32세(골키퍼 33세)부터는 매년 떨어집니다.'),
    h('button', { class: 'btn', onclick: () => { GM.setTraining(S, focus, inten); render(); } }, '시즌 시작'));
  return out;
}
function eventBlock() {
  const b = S.pend[0];
  const el = h('div', { class: 'ev' + (b.cross ? ' cross' : '') });
  const head = h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, h('div', { class: 'ico' }, icon(b.icon, 28)), h('div', null, h('div', { class: 'lbl' }, b.cross ? h('span', { class: 'chip gold' }, `중요 분기점 · ${S.p.age}세`) : S.phase === 'preEvents' ? '프리시즌' : '시즌 중반'), h('h2', null, b.title)));
  el.append(head, h('p', { class: 'mute', style: { margin: 0 } }, b.desc));
  const opts = h('div', { class: 'opts' });
  // 월드 커리어: 결과 미리보기·확률·색 없이 갈림길만 (선택하면 보이지 않는 확률로 갈린다)
  if (S.wc) { el.classList.add('wcneu'); b.opts.forEach((o, i) => opts.append(h('button', { class: 'opt', onclick: () => pickEvent(i, opts) }, watermark(club(S.car.club), 96, 'wm-opt'), h('div', { class: 't' }, o.label), h('div', { class: 'd' }, o.desc)))); el.append(opts); return el; }
  b.opts.forEach((o, i) => {
    const outs = h('div', { class: 'outs' }, ...o.out.map((x, j) => h('div', { class: 'out ' + (x.good > 0 ? 'good' : x.good < 0 ? 'bad' : ''), 'data-j': j }, h('span', null, x.chip), C.cfg.showOdds && !S.wc ? h('span', { class: 'p' }, Math.round(x.p * 100) + '%') : null)));
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
  if (S.wc) {
    [...optsEl.children].forEach((c, k) => { if (k !== i) c.style.opacity = '.35'; c.style.pointerEvents = 'none'; });
    optsEl.children[i].classList.add('picked');
    optsEl.parentNode.append(h('div', { class: 'result neu' }, h('b', null, log.chip), log.text ? h('span', { class: 'mute', style: { fontSize: '13px' } }, log.text) : null,
      log.six && log.six.length ? h('div', { class: 'chg' }, ...log.six.map(([k, v]) => h('span', { class: 'chip' }, `${k} ${v > 0 ? '+' : ''}${v}`))) : null,
      h('button', { class: 'btn sm', style: { justifySelf: 'start' }, onclick: () => { busy = false; render(); } }, '계속')));
    busy = false; return;
  }
  // 결과 룰렛 연출
  const btn = optsEl.children[i]; const chips = [...btn.querySelectorAll('.out')];
  [...optsEl.children].forEach((c, k) => { if (k !== i) c.style.opacity = '.35'; c.style.pointerEvents = 'none'; });
  const hitIdx = b.opts[i].out.findIndex(x => x.chip === log.chip);
  if (chips.length > 1) { for (let r = 0; r < 9; r++) { chips.forEach((c, k) => c.classList.toggle('hit', k === r % chips.length)); await sleep(70 + r * 18); } }
  chips.forEach((c, k) => { c.classList.toggle('hit', k === hitIdx); c.classList.toggle('miss', k !== hitIdx); });
  await sleep(450);
  const res = h('div', { class: 'result' }, h('b', null, log.chip), log.text ? h('span', { class: 'mute', style: { fontSize: '13px' } }, log.text) : null,
    S.wc && log.six && log.six.length ? h('div', { class: 'chg' }, ...log.six.map(([k, v]) => h('span', { class: 'chip ' + (v > 0 ? 'good' : 'bad') }, `${k} ${v > 0 ? '+' : ''}${v}`))) : null,
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
  const ss = S.ss, half = ss.half, w = S.w;
  // 경기 진행 중 다른 탭에 다녀와도 진행 화면을 그대로 이어서 보여 준다
  if (st.simming && st.simNodes) return st.simNodes;
  const out = [];
  const c = club(ss.club), lg = C.leagueOf(S);
  const today = w.cal.d, end = C.halfEnd(S);
  const hl = !ss.split ? '시즌' : half === 1 ? (ss.cy ? '전반기 (~6월)' : '전반기 (~12월)') : (ss.cy ? '후반기 (7월~)' : '후반기 (1월~)');
  const endTxt = !ss.split || half === 2 ? '시즌 끝' : ss.cy ? '여름 휴식기' : '겨울 휴식기';
  out.push(h('div', null, h('div', { class: 'lbl' }, `${ss.label} 시즌 · ${hl} · ${C.fmtDateY(ss.start)} ~ ${C.fmtDateY(ss.end - 1)}`), h('h2', { style: { marginTop: '2px' }, id: 'todayTxt' }, `${C.fmtDateY(today)} (${'일월화수목금토'[C.toDate(today).getUTCDay()]})`)));
  const sr = ss.sr;
  const inWin = w.cal.win && today >= w.cal.win.d0 && today <= w.cal.win.d1;
  out.push(h('div', { class: 'chg' }, ROLECHIP(ss.role), lg ? h('span', { class: 'chip' }, lg.name) : null, ss.cont ? h('span', { class: 'chip gold' }, C.COMPS[ss.cont].name) : null, ss.nt ? h('span', { class: 'chip blue' }, ss.nt.lvl === 'A' ? '국가대표 발탁' : `${ss.nt.lvl} 대표팀`) : null, ss.penTaker ? h('span', { class: 'chip' }, 'PK 전담') : null, inWin ? h('span', { class: 'chip good' }, w.cal.win.kind === 'summer' ? '여름 이적시장 진행 중' : '겨울 이적시장 진행 중') : null, ss.inj > 0 ? h('span', { class: 'chip bad' }, `부상 · ${ss.inj}일`) : null));
  if (sr && sr.rivals && S.car.status !== 'youth') out.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, `같은 자리 경쟁: 상위 ${sr.n}명이 주전. 나 ${Math.round(sr.me)} vs ${sr.rivals.map(v => Math.round(v)).join(' · ')}`));
  const gc = goalChip(); if (gc) out.push(gc);
  // 다음 일정
  const fx = C.userFixtures(S).filter(f => !f.done && f.d > today);
  const KN = { L: '리그', C: ss.cupName || '컵', LC: ss.lcupName || '리그컵', E: ss.cont ? C.COMPS[ss.cont].short : '대륙 대회', N: 'A매치', Y: '유스' };
  // 월드 커리어: 직전 경기(내 출전·평점·골 시간)를 진행 버튼 바로 위에
  if (S.wc && U.wcMyRow) { const last = ss.matches.filter(m => m.comp !== 'youth' || S.car.status === 'youth').slice(-3).reverse();
    if (last.length) out.push(h('div', { class: 'upnext' }, h('div', { class: 'lbl' }, '직전 경기'), h('div', { class: 'wcml', style: { padding: 0 } }, ...last.map(m => U.wcMyRow(m, U.wcOpenMine ? U.wcOpenMine(m) : null))))); }
  if (fx.length) out.push(h('div', { class: 'upnext' }, h('div', { class: 'lbl' }, `다음 경기 (남은 ${fx.length}경기)`), ...fx.slice(0, 4).map(f => h('div', { class: 'uprow' }, h('span', { class: 'mute' }, C.fmtDateY(f.d)), h('span', { class: 'chip' }, f.k === 'E' && f.comp ? C.COMPS[f.comp].short : KN[f.k] || f.k), h('span', null, f.nat ? `${C.natName(f.opp)} · ${f.stage || ''}` : f.opp ? (f.home ? '홈 · ' : '원정 · ') + ((w.clubs[f.opp] || {}).name || '') : f.stage || ''), h('span', { class: 'mute', style: { fontSize: '11px' } }, f.d - today === 1 ? '내일' : `${f.d - today}일 뒤`)))));
  const big = C.calUpcoming(S, today, 40).filter(e => e.k !== 'lg' || e.nat === ss.nat).slice(0, 4);
  if (big.length) out.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, '다가오는 일정: ', ...big.map(e => h('span', { class: 'chip', style: { marginRight: '4px' } }, e.d <= today && e.d2 ? `${e.t} 진행 중 (~${C.fmtDate(e.d2)})` : `${C.fmtDate(e.d)} ${e.t}`))));
  st.speed = normSpeed(st.speed);
  const spd = h('div', { class: 'seg', id: 'spdSeg' }, ...SPEEDS.map(([k, l]) => h('button', { class: st.speed === k ? 'on' : '', 'data-k': k, onclick: e => { st.speed = k; spd.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); if (st.stepWake && k !== 'step') st.stepWake(); } }, l)));
  out.push(h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', alignItems: 'center' } }, h('span', { class: 'lbl' }, '경기 연출'), spd));
  // 진행: 기본은 경기 단위, 달력에서 날짜를 누르면 그날까지
  const nf = fx.find(f => f.d <= end - 1);
  const nfTxt = nf ? `${C.fmtDate(nf.d)} (${'일월화수목금토'[C.toDate(nf.d).getUTCDay()]}) ${nf.nat ? `A매치 · ${C.natName(nf.opp)}` : nf.opp ? (nf.home ? '홈 · ' : '원정 · ') + ((w.clubs[nf.opp] || {}).name || '') : (KN[nf.k] || '')}` : '';
  out.push(h('div', { class: 'nextbtn', id: 'runBtn' },
    h('button', { class: 'btn', onclick: () => runTo(Math.min(nf ? nf.d : end - 1, end - 1)) }, nf ? `다음 경기 ▸  ${nfTxt}` : `${endTxt}까지 ▸`),
    nf ? h('button', { class: 'btn ghost sm', onclick: () => runTo(end - 1) }, `${endTxt}까지`) : null));
  // 월드 커리어: 진행 중 화면(내가 뛴 경기)을 버튼 바로 아래, 달력은 그 밑에
  if (S.wc) { out.push(h('div', { id: 'live', style: { display: 'grid', gap: '10px' } })); out.push(h('div', { id: 'calWrap' }, careerCal(today, end, fx))); return out; }
  out.push(h('div', { id: 'calWrap' }, careerCal(today, end, fx)));
  out.push(h('div', { id: 'live', style: { display: 'grid', gap: '10px' } }));
  return out;
}
function careerCal(today, end, fx) {
  const ss = S.ss, w = S.w;
  if (!st.calM) { const [y, m] = C.ymd(Math.max(today, ss.start || today)); st.calM = [y, m]; }
  const [y, m] = st.calM;
  const days = C.calMonth(S, y, m, nat => nat === ss.nat);
  const all = C.userFixtures(S), byD = {}; for (const f of all) (byD[f.d] = byD[f.d] || []).push(f);
  const res = {}; for (const mm of ss.matches) (res[mm.d] = res[mm.d] || []).push(mm);
  const SH = { L: '', C: '컵', LC: '리그컵', E: '', N: 'A매치', Y: '유스' };
  const cell = x => {
    const out = [], d = x.d, ms = res[d], fs = byD[d];
    if (ms) for (const mm of ms.slice(0, 2)) {
      const r = mm.gf > mm.ga ? 'W' : mm.gf < mm.ga ? 'L' : mm.pens === 'W' ? 'W' : mm.pens === 'L' ? 'L' : 'D';
      const oc = mm.comp === 'nt' || mm.comp === 'ntY' ? null : w.clubs[mm.opp];
      out.push(h('span', { class: 'cfm ' + r + (mm.played ? '' : ' nop') }, oc ? crest(oc, 12) : mm.comp === 'nt' || mm.comp === 'ntY' ? natCrest(mm.opp, 12) : null, h('span', { class: 'sc' }, `${mm.gf}-${mm.ga}`)));
    }
    else if (fs) for (const f of fs.slice(0, 2)) {
      const oc = !f.nat && f.opp && w.clubs[f.opp];
      out.push(h('span', { class: 'cfm' }, oc ? crest(oc, 12) : f.nat && f.opp ? natCrest(f.opp, 12) : null, h('span', null, oc ? (f.home ? 'H' : 'A') : f.nat ? (f.comp === 'UNL' ? 'UNL' : 'A') : SH[f.k] || '')));
    }
    const ek = (fs || []).find(f => f.k === 'E') || (ms || []).find(mm => mm.comp === 'cont');
    if (ek) out.push(h('span', { class: 'mk e' }, ss.cont ? C.COMPS[ss.cont].short : '대륙'));
    else if ((fs || []).some(f => f.k === 'C' || f.k === 'LC') || (ms || []).some(mm => mm.comp === 'cup' || mm.comp === 'lcup')) out.push(h('span', { class: 'mk c' }, '컵'));
    else if (x.it && !fs && !ms) out.push(h('span', { class: 'mk i' }, x.it.replace(/^FIFA |^UEFA /, '').split(' ')[0]));
    const bg = U.calBig(S, x); if (bg) out.push(h('span', { class: 'mk tx' }, `이적 ${bg.length}`));
    if (d === end - 1) out.push(h('span', { class: 'mk end' }, ss.split && ss.half === 1 ? '휴식기' : '시즌 끝'));
    return out;
  };
  const tip = x => {
    const t = [];
    for (const mm of res[x.d] || []) t.push(`내 경기: ${mm.compName || ''} ${mm.oppName} ${mm.gf}-${mm.ga}${mm.played ? (mm.rating ? ` · 평점 ${mm.rating.toFixed(1)}` : '') : ' · 결장'}`);
    if (!res[x.d]) for (const f of byD[x.d] || []) t.push(`내 경기: ${f.nat ? `A매치 vs ${C.natName(f.opp)}` : f.opp ? (f.home ? '홈 ' : '원정 ') + ((w.clubs[f.opp] || {}).name || '') : (SH[f.k] || f.k)}${f.stage ? ' · ' + f.stage : ''}`);
    const bg = U.calBig(S, x); if (bg) t.push('빅딜: ' + bg.slice(0, 3).map(r => `${C.MD.nameOf(r[0])} → ${(w.clubs[r[2]] || {}).name || ''}${r[4] ? ' ' + C.fmtEUR(r[4] * 1e4) : ''}`).join(', '));
    return t.concat(U.calTip(S, x).filter(l => !/라운드/.test(l)));
  };
  const sel = st.calSel != null && st.calSel <= today ? st.calSel : null;
  const grid = U.calGrid({ y, m, days, today, sel, cell, tip,
    canPick: d => d <= end - 1 && d >= ss.start,
    pick: d => { if (d > today) { st.calSel = null; runTo(Math.min(d, end - 1)); } else { st.calSel = d; render(); } },
    nav: dl => { if (!dl) { const [a, b] = C.ymd(today); st.calM = [a, b]; } else { let mm = m + dl, yy = y; if (mm > 12) { mm = 1; yy++; } if (mm < 1) { mm = 12; yy--; } st.calM = [yy, mm]; } render(); },
    jump: (yy, mm) => { st.calM = [yy, mm]; render(); }, minY: C.ymd(ss.start)[0], maxY: C.ymd(end - 1)[0], maxD: end - 1,
    mark: x => x.d === end - 1 ? 'send' : '',
    legend: [['today', '오늘'], ['cer', '시상식'], ['tw', '이적시장'], ['iw', 'A매치 기간'], ['it', '국제 대회'], ['dl', '이적 마감일']],
    hint: '날짜를 누르면 그날까지 진행' });
  const out = [grid];
  if (sel != null) {
    const ms = res[sel] || [];
    out.push(h('div', { class: 'upnext', style: { marginTop: '8px' } }, h('div', { class: 'lbl' }, `${C.fmtDateY(sel)} 기록`), ...(ms.length ? ms.map(mm => tickRow(mm)) : [h('div', { class: 'mute', style: { fontSize: '13px' } }, '이날은 내 경기가 없었습니다.')])));
  }
  return h('div', { style: { display: 'grid', gap: '6px' } }, ...out);
}
U.simBlock = simBlock;
// 대회별 색 구분
const COMPCLS = { league: 'l', cup: 'c', lcup: 'lc', cont: 'e', nt: 'n', ntY: 'ny', youth: 'y' };
const COMPLBL = { league: '리그', cup: '국내 컵', lcup: '리그컵', cont: '대륙', nt: 'A매치', ntY: '연령별', youth: '유스' };
// 대회 태그: 국가대표 경기는 'A매치'로 뭉뚱그리지 않고 대회명(월드컵·아시안컵 등)을 그대로 보여준다
function compTag(comp, name, stage) {
  const lbl = (comp === 'nt' || comp === 'ntY') && name && name !== 'A매치' ? name.replace(/^FIFA /, '') : (COMPLBL[comp] || '');
  return h('span', { class: 'cpt cp-' + (COMPCLS[comp] || 'l'), title: name || '' }, lbl + (stage ? ' · ' + stage : ''));
}
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
async function runTo(target) {
  if (busy) return;
  { const c = S.w.cer, d0 = S.w.cal.d; if (c && !c.seen && c.d > d0 && c.d < target) target = c.d; } // 발롱도르 시상식 날에는 멈춘다
  busy = true;
  const btn = $('#runBtn'); if (btn) btn.style.display = 'none';
  const cw = $('#calWrap'); if (cw) cw.style.display = 'none';
  const live = $('#live');
  st.simming = true; st.simNodes = [...live.parentNode.childNodes];
  let stopped = false;
  const stopBtn = h('button', { class: 'btn ghost sm', onclick: () => { stopped = true; stopBtn.disabled = true; stopBtn.textContent = '멈추는 중…'; } }, '멈춤');
  const prog = h('div', { class: 'prog' }, h('i'));
  const dayTxt = h('div', { class: 'mute', style: { fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } }, h('span', null, ''), stopBtn);
  const mkLine = (lbl) => h('div', null, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, lbl), h('div', { class: 'statline' }, ...[['경기', 'apps'], ['득점', 'goals'], ['도움', 'assists'], ['평점', 'r']].map(([l, k]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v', 'data-k': k }, '0')))));
  const pro = S.car.status === 'youth' ? null : mkLine('이번 시즌 1군 (프로)');
  const yth = mkLine(S.p.age <= 17 ? 'U18 유스 리그' : 'U21 유스 리그'); yth.style.display = 'none';
  const stage = h('div', { class: 'mstage' });
  const tick = h('div', { class: 'ticker' });
  const txTk = h('div', { class: 'txtick', style: { display: 'none' } });
  // 월드 커리어: 내가 뛴 경기는 따로 (출전 시간·평점이 바로 보이게), 팀 전체 결과는 그 아래
  const mineQ = [], mine = S.wc && U.wcMyRow ? h('div', { class: 'wcml live' }) : null, mineH = mine ? h('div', { class: 'lbl', style: { display: 'none' } }, '내가 뛴 경기') : null;
  live.append(dayTxt, prog, ...(pro ? [pro] : []), yth, txTk, stage, ...(mine ? [mineH, mine, h('div', { class: 'lbl' }, '팀 경기 결과 (미출전 포함)')] : []), tick);
  const ss = S.ss, w = S.w, d0 = w.cal.d, span = Math.max(1, target - d0);
  const total = C.userFixtures(S).filter(f => !f.done && f.d <= target).length;
  let n = 0;
  const fill = (el, list) => { const t = C.totalAgg(list); el.querySelector('[data-k=apps]').textContent = t.apps; el.querySelector('[data-k=goals]').textContent = t.goals; el.querySelector('[data-k=assists]').textContent = t.assists; el.querySelector('[data-k=r]').textContent = t.rated ? C.avgRating(t).toFixed(2) : '-'; };
  const upd = () => {
    const ym = ss.matches.filter(m => m.comp === 'youth');
    if (pro) fill(pro, ss.matches.filter(m => !['nt', 'ntY', 'youth'].includes(m.comp)));
    if (ym.length) { yth.style.display = ''; fill(yth, ym); }
  };
  upd();
  const waitStep = m => new Promise(resolve => {
    const done = () => { document.removeEventListener('keydown', kd); st.stepWake = null; resolve(); };
    const kd = e => { if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && !document.querySelector('.ov')) { e.preventDefault(); done(); } };
    st.stepWake = done;
    stage.replaceChildren(matchCard(m), h('div', { class: 'mc-btns' },
      h('button', { class: 'btn', onclick: done }, n >= total ? '계속' : '다음 경기 ▸'),
      h('button', { class: 'btn ghost sm', onclick: () => { st.speed = 'auto'; const sg = $('#spdSeg'); if (sg) sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === 'auto')); done(); } }, '남은 경기 자동 진행'),
      h('span', { class: 'mute', style: { fontSize: '12px' } }, `${n} / ${total}경기 · Enter 키로 다음`)));
    document.addEventListener('keydown', kd);
  });
  const hooks = {
    match: async m => {
      if (S.newsQ && S.newsQ.length) { const big = S.newsQ.filter(x => x.big && x.k !== 'transfer'); S.newsQ = []; for (const x of big) { toast(x.t); if (x.k === 'mile' || x.k === 'hat') confetti(50); } }
      n++; tick.prepend(tickRow(m)); upd();
      if (mine && m.played) mineQ.push(m); // 골·도움 시간은 경기 기록이 저장된 뒤(그날 진행 끝)에 붙인다
      // 월드 커리어: 관계 반영, 중계할 경기·대화 사건은 그날 진행이 끝난 뒤 (경기 기록이 저장된 다음) 보여 준다
      if (S.wc && U.wcAfterMatch) { U.wcAfterMatch(m); if (U.wcPending()) return; }
      const sp = normSpeed(st.speed);
      if (sp === 'step') await waitStep(m);
      else { if (stage.firstChild) stage.replaceChildren(); if (sp === 'auto') await sleep(160); else if (sp === 'fast') await sleep(35); }
    },
    moment: mc => U.playMoment(mc)
  };
  let lastPaint = 0; const t0run = Date.now();
  const onDay = async d => {
    prog.firstChild.style.width = Math.min(100, (d - d0) / span * 100) + '%';
    dayTxt.firstChild.textContent = `${C.fmtDateY(d)} 진행 중… (${C.fmtDateY(target)}까지 · ${U.etaTxt ? U.etaTxt(t0run, d - d0, span) : ''})`;
    if (U.txTick) U.txTick(S, d, txTk, ss.club);
    if (S.wc && U.wcOnDay) { await U.wcOnDay(d, () => { stopped = true; stopBtn.disabled = true; stopBtn.textContent = "멈추는 중…"; }); upd(); }
    while (mine && mineQ.length) { const m = mineQ.shift(); mineH.style.display = ''; mine.prepend(U.wcMyRow(m, U.wcOpenMine ? U.wcOpenMine(m) : null)); }
    const t = Date.now(); if (t - lastPaint > 60) { lastPaint = t; await sleep(0); }
  };
  try { await GM.simTo(S, target, hooks, onDay, () => stopped); } catch (e) { console.error(e); toast('시뮬레이션 중 오류가 났습니다.'); }
  busy = false; st.simming = false; st.simNodes = null; st.calM = null;
  if (S.newsQ && S.newsQ.length) { const big = S.newsQ.filter(x => x.big); S.newsQ = []; for (const x of big.slice(0, 3)) toast(x.t); }
  if (S.phase === 'endSeason') { await sleep(300); finishSeasonFlow(); }
  else { U.save(); render(); }
}
function teamRankBox(tr, when) {
  return h('div', { class: 'trank' }, h('div', null, h('div', { class: 'lbl' }, `${when} 팀 내 평점`), h('div', { class: 'num', style: { fontSize: '22px', fontWeight: 800 } }, `${tr.n}명 중 ${tr.rank}위`), h('div', { class: 'mute', style: { fontSize: '12px' } }, `내 평균 평점 ${tr.myR.toFixed(2)}`)),
    h('div', { class: 'tlist' }, ...tr.top.map((x, i) => h('div', { class: x.me ? 'me' : '' }, h('span', { class: 'mute' }, i + 1), h('span', { class: 'tpos' }, x.pos), h('span', { class: x.pid ? 'lnk' : '', title: x.pid ? '선수 정보 보기' : null, onclick: x.pid && U.openPlayer ? () => U.openPlayer(x.pid) : null }, x.me ? `${x.n} (나)` : x.n), rt2(x.r)))), tr.basis ? h('div', { class: 'mute', style: { fontSize: '11px', gridColumn: '1 / -1' } }, `기준: ${tr.basis}`) : null);
}
U.teamRankBox = teamRankBox;
function midBlock() {
  const ss = S.ss, out = [];
  const t = C.totalAgg(ss.matches.filter(m => !['nt', 'ntY'].includes(m.comp)));
  const lg = C.leagueOf(S); const tb = lg && ss.tables[lg.id] ? C.sortTable(ss.tables[lg.id]) : null; const pos = tb ? tb.findIndex(r => r.id === ss.club) + 1 : 0;
  out.push(h('div', null, h('div', { class: 'lbl' }, `${ss.label} · 전반기 종료 · ${C.fmtDateY(S.w.cal.d)}`), h('h2', { style: { marginTop: '2px' } }, ss.cy ? '여름 휴식기' : '겨울 휴식기')));
  out.push(h('div', { class: 'statline' }, ...[['경기', t.apps]].concat(U.pcols(S.p.pos, 'short').map(([l, f]) => [l, f(t)]), [['평점', t.rated ? C.avgRating(t).toFixed(2) : '-']]).map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v' }, v)))));
  out.push(h('div', { class: 'chg' }, lg ? h('span', { class: 'chip' }, `${lg.name} · ${pos}위`) : null, ROLECHIP(ss.role), S.car.status !== 'youth' ? (S.wc && C.WC ? h('span', { class: 'chip' }, `감독: ${C.WC.mgrText((S.wc.rel.mgr || {}).v || 0)}`) : h('span', { class: 'chip' }, `감독 신뢰 ${Math.round(S.car.trust)}`)) : null, ss.inj > 0 ? h('span', { class: 'chip bad' }, `부상 중 · ${ss.inj}일`) : null));
  { const gc = goalChip(); if (gc) out.push(gc); }
  { const tr = C.teamRank(S); if (tr) out.push(teamRankBox(tr, '전반기')); }
  if (U.shopPanel && !S.wc) { const sp = U.shopPanel('겨울 휴식기'); if (sp) out.push(sp); }
  if (ss.moments.length) out.push(h('div', { class: 'mute', style: { fontSize: '12px' } }, '결정적 순간: ', ...ss.moments.map(m => h('span', { class: 'chip ' + (m.ok ? 'good' : 'bad'), style: { marginRight: '4px' } }, m.title))));
  out.push(h('button', { class: 'btn', onclick: () => { GM.toMidEvents(S); render(); } }, '계속'));
  return out;
}
function winterBlock() {
  const out = [h('div', null, h('div', { class: 'lbl' }, `${C.fmtDateY(S.w.cal.d)} · 시즌 중 이적시장`), h('h2', { style: { marginTop: '2px' } }, S.ss && S.ss.cy ? '여름 이적 제안' : '겨울 이적 제안'))];
  out.push(h('p', { class: 'mute', style: { margin: 0 } }, '후반기를 다른 팀에서 보낼 수 있습니다. 새 팀에서는 컵·대륙 대회에 등록할 수 없습니다.'));
  S.winterOffers.forEach((o, i) => { if (o.withdrawn) return; const c = club(o.club), lg = S.w.lg[c.lg]; out.push(h('div', { class: 'offer', style: tintStyle(c, .22) }, watermark(c), crest(c, 40), h('div', null, h('div', { class: 'cn' }, c.name, ' ', o.type === 'loan' ? h('span', { class: 'chip blue' }, '임대') : null, S.wc && o.acc != null && !o.freeA && o.type !== 'loan' ? h('span', { class: 'chip ' + (o.acc ? 'good' : 'bad') }, o.acc ? '구단 수락' : '구단 거절') : null, S.wc && o.rival >= 2 ? h('span', { class: 'chip bad' }, '라이벌') : null), h('div', { class: 'terms' }, h('span', null, lg.name), h('span', null, '역할 ', ROLECHIP(o.role)), o.fee ? h('span', null, '이적료 ', h('b', null, C.fmtEUR(o.fee))) : null)), h('div', { class: 'btns' }, h('button', { class: 'btn sm' + (S.wc && o.acc === false ? ' ghost' : ''), onclick: () => { const r = GM.winterMove(S, i); if (r && r.blocked) { toast('구단이 이적을 막았습니다. 감독·팬과의 관계가 상했습니다.', 3200); render(); return; } render(); joinCeremony(c, o.type === 'loan' ? '겨울 임대 이적' : '겨울 이적'); } }, S.wc && o.acc === false ? '이적 요청' : '수락')))); });
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
  out.push(h('div', { class: 'statline' }, ...[['경기', r.total.apps]].concat(U.pcols(r.pos || S.p.pos, 'short').map(([l, f]) => [l, f(r.total)]), [['평점', r.rating ? r.rating.toFixed(2) : '-']]).map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v', 'data-cu': typeof v === 'number' ? v : '' }, anim.shown ? v : (typeof v === 'number' ? '0' : v))))));
  if (r.youth && r.youth.apps) out.push(h('div', { class: 'result', style: { padding: '10px 12px' } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' } }, h('span', null, h('span', { class: 'chip blue' }, r.youthLabel || 'U18'), ' 유스 리그'), h('span', { class: 'num' }, `${r.youth.apps}경기 ${r.youth.goals}골 ${r.youth.assists}도움 `, r.youthRating ? rt2(r.youthRating) : ''))));
  const res = [];
  if (r.lgName) res.push(h('span', { class: 'chip' + (r.lgPos === 1 ? ' gold' : '') }, `${r.lgName} ${r.lgPos}위/${r.lgN}`));
  if (r.cupName && r.cupOut) res.push(h('span', { class: 'chip' + (r.cupOut === '우승' ? ' gold' : '') }, `${r.cupName} ${r.cupOut === '우승' ? '우승' : r.cupOut + ' 탈락'}`));
  if (r.lcupName && r.lcupOut) res.push(h('span', { class: 'chip' + (r.lcupOut === '우승' ? ' gold' : '') }, `${r.lcupName} ${r.lcupOut === '우승' ? '우승' : r.lcupOut + ' 탈락'}`));
  if (r.contName) res.push(h('span', { class: 'chip' + (r.contOut === '우승' ? ' gold' : '') }, `${r.contName} ${r.contOut === '우승' ? '우승' : r.contOut ? r.contOut + ' 탈락' : ''}`));
  if (r.tourn) res.push(h('span', { class: 'chip' + (r.tourn.won ? ' gold' : ' blue') }, `${r.tourn.name} ${r.tourn.stage}`));
  if (ss && ss.promo && ss.promo[r.club]) res.push(h('span', { class: 'chip ' + (ss.promo[r.club] > 0 ? 'good' : 'bad') }, ss.promo[r.club] > 0 ? '승격!' : '강등'));
  if (r.ballon) res.push(h('span', { class: 'chip gold' }, `발롱도르 ${r.ballon}위`));
  for (const t of r.trophyMiss || []) res.push(h('span', { class: 'chip', title: '우승 경력은 대회마다 최소 출전이 있어야 붙습니다 (리그: 경기 수의 15%·최소 3경기, 그 밖의 대회: 1경기)' }, `팀 ${t.t} 우승 · 출전 ${t.have}/${t.need}경기로 경력 제외`));
  if (r.tourn && S.w.intl && S.w.intl[r.tourn.y]) res.push(h('button', { class: 'chip', style: { cursor: 'pointer' }, onclick: () => { st.wv = Object.assign(st.wv || {}, { mode: 'intl', iy: String(r.tourn.y), ik: r.tourn.k }); U.setTab('table'); } }, `${r.tourn.y} 국제 대회 대진 보기 ›`));
  out.push(h('div', { class: 'chg' }, ...res));
  if (r.awards.length) out.push(h('div', { class: 'chg' }, ...r.awards.map(a => h('span', { class: 'chip gold' }, trophy(a.k, 14, '#f2c14e'), a.t))));
  if (ss && !ss.tr) ss.tr = C.teamRank(S, ss);
  if (ss && ss.tr) out.push(teamRankBox(ss.tr, '시즌'));
  if (U.shopPanel && S.phase === 'review' && !S.wc) { const sp = U.shopPanel('여름 휴식기'); if (sp) out.push(sp); }
  if (r.goal) out.push(h('div', { class: 'goalbar' }, h('span', { class: 'lbl' }, '시즌 목표'), h('span', null, r.goal.label), h('b', { class: r.goal.ok ? 'up' : 'dn' }, r.goal.ok ? '달성' : '실패')));
  if (r.carry && r.carry.lv) out.push(h('div', { class: 'goalbar' }, h('span', { class: 'lbl' }, '다음 시즌'), h('span', null, r.carry.lv > 0 ? `평점 ${(r.carry.exp + r.carry.d).toFixed(2)} · 최근 평균(${r.carry.exp.toFixed(2)})보다 좋았다 · 자신감 상승` : `평점 ${(r.carry.exp + r.carry.d).toFixed(2)} · 최근 평균(${r.carry.exp.toFixed(2)})에 못 미쳤다 · 자신감 하락`), h('b', { class: r.carry.lv > 0 ? 'up' : 'dn' }, `컨디션 ${r.carry.lv > 0 ? '+' : ''}${r.carry.lv}`)));
  if (r.perfBonus) out.push(h('div', { class: 'mute', style: { fontSize: '13px' } }, `성과급 ${C.fmtEUR(r.perfBonus)} 지급`));
  // 성장
  const g = ss && ss.growth;
  if (g && S.wc && U.wcGrowBox) out.push(...U.wcGrowBox(g, anim));
  else if (g) {
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
// 월드 커리어 화면(ui_wcareer.js)에서 쓰는 조각
Object.assign(U, { topbar: x => topbar(x), setS: o => { S = o; hasSave = !!o; }, purgeMx: o => purgeMx(o), jersey, NATCHOICES, diffPicker, confirmRetire, finishRetire: () => finishRetire(), actionPanel: () => actionPanel(), playerCard: () => playerCard(), newsPanel: () => newsPanel(), careerTable: () => careerTable(), isBusy: () => busy });
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
  if (S.wc && !S.viewOnly && C.WC) out.push(h('div', { class: 'result' }, h('b', null, '같은 세계를 계속 지켜볼 수 있습니다'), h('span', { class: 'mute', style: { fontSize: '13px' } }, '은퇴한 뒤에도 이 세계의 리그·대회·이적시장은 계속 돌아갑니다. 관전 모드로 넘어가면 내 선수 없이 날짜 단위로 진행합니다.'), h('button', { class: 'btn', style: { justifySelf: 'start' }, onclick: () => { C.WC.toWorld(S); U.save(); U.go('game', 'wsim'); toast('관전 모드로 전환했습니다.'); } }, '관전 모드로 계속')));
  out.push(h('div', { style: { display: 'flex', gap: '8px' } }, S.viewOnly ? null : h('button', { class: 'btn gold', onclick: () => newCareer() }, '새 커리어'), h('button', { class: 'btn ghost', onclick: () => U.setTab('records') }, '전체 기록 보기')));
  return out;
}
})(window);
