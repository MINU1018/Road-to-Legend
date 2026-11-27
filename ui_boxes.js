// 상자 접기·펴기 + 홈 화면 상자 순서 바꾸기 (v45)
// · 화면 안의 모든 상자(.panel 머리 · .sec 제목)에 접기 버튼(▾)을 붙인다. 접은 상태는 이 브라우저에 기억 (화면 + 제목 기준)
// · 홈 화면의 상자 묶음([data-dz])은 손잡이(⋮⋮)를 끌어 순서를 바꾼다 (마우스·터치). 순서도 기억, 설정에서 되돌린다
(function (G) {
const U = G.TCUI = G.TCUI || {};
const KEY = 'rtl-boxes';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
let ST = load(); ST.fold = ST.fold || {}; ST.ord = ST.ord || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { } };
const norm = t => String(t || '').replace(/[0-9]+/g, '').replace(/[.,:/()·'%+\-–▾▸]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28);
const tabNow = () => { const a = document.querySelector('.side:not(.drawer) .sitem.on'); return a ? a.dataset.tab : (document.querySelector('.mainc') ? 'game' : 'home'); };
const svgEl = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const GRIP = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g></svg>';
// 상자의 머리(제목 줄)
function headOf(box) {
  if (box.matches('.panel')) return box.querySelector(':scope > .ph');
  if (box.matches('.sec')) return box.querySelector(':scope > h3');
  return null;
}
const titleOf = hd => { const c = hd.cloneNode(true); c.querySelectorAll('button, .foldb, .gripb, select, input, .seg').forEach(x => x.remove()); return norm(c.textContent); };
// ---------- 접기 ----------
function addFold(box) {
  const hd = headOf(box); if (!hd || hd.dataset.fx) return;
  const t = titleOf(hd); if (!t) return;
  hd.dataset.fx = '1';
  const fk = tabNow() + '|' + t; box.dataset.fk = fk;
  const btn = h0('button', 'foldb', CHEV, ST.fold[fk] ? '펼치기' : '접기');
  btn.addEventListener('click', e => { e.stopPropagation(); const on = !box.classList.contains('folded'); box.classList.toggle('folded', on); btn.setAttribute('aria-label', on ? '펼치기' : '접기'); btn.title = on ? '펼치기' : '접기'; if (on) ST.fold[fk] = 1; else delete ST.fold[fk]; save(); });
  hd.append(btn);
  if (ST.fold[fk]) box.classList.add('folded');
}
function h0(tag, cls, svg, label) { const b = document.createElement(tag); b.className = cls; b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.append(svgEl(svg)); return b; }
// ---------- 끌어서 순서 바꾸기 ----------
const itemKey = el => { if (el.dataset.bk) return el.dataset.bk; const hd = el.querySelector('.ph, h3, h2'); const k = hd ? titleOf(hd) : ''; return k || (el.className || 'box').split(' ')[0]; };
function applyOrder(zone) {
  const z = zone.dataset.dz, ord = ST.ord[z]; const kids = [...zone.children].filter(x => x.nodeType === 1);
  kids.forEach(k => { k.dataset.bk = itemKey(k); });
  if (!ord || !ord.length) return;
  const pos = new Map(ord.map((k, i) => [k, i]));
  const sorted = kids.slice().sort((a, b) => (pos.has(a.dataset.bk) ? pos.get(a.dataset.bk) : 900 + kids.indexOf(a)) - (pos.has(b.dataset.bk) ? pos.get(b.dataset.bk) : 900 + kids.indexOf(b)));
  if (sorted.some((x, i) => x !== kids[i])) sorted.forEach(x => zone.append(x));
}
function addGrip(zone, item) {
  if (item.querySelector(':scope .gripb')) return;
  const hd = item.matches('.panel, .sec') ? headOf(item) : item.querySelector('.ph, .sec > h3');
  const g = h0('button', 'gripb', GRIP, '끌어서 순서 바꾸기');
  if (hd) hd.prepend(g); else { item.classList.add('gripabs'); item.append(g); }
  g.addEventListener('pointerdown', e => startDrag(e, zone, item, g));
}
let drag = null;
function startDrag(e, zone, item, g) {
  e.preventDefault(); e.stopPropagation();
  const r = item.getBoundingClientRect();
  drag = { zone, item, y0: e.clientY, top0: r.top, ph: document.createElement('div') };
  drag.ph.className = 'dragph'; drag.ph.style.height = r.height + 'px';
  item.classList.add('dragging'); item.style.width = r.width + 'px'; item.style.left = r.left + 'px'; item.style.top = r.top + 'px';
  zone.insertBefore(drag.ph, item); document.body.append(item);
  const mv = ev => {
    if (!drag) return; const dy = ev.clientY - drag.y0; item.style.top = (drag.top0 + dy) + 'px';
    const sib = [...zone.children].filter(x => x !== drag.ph);
    let before = null; for (const s of sib) { const b = s.getBoundingClientRect(); if (ev.clientY < b.top + b.height / 2) { before = s; break; } }
    if (before) zone.insertBefore(drag.ph, before); else zone.append(drag.ph);
    // 화면 끝에 가까우면 스크롤
    if (ev.clientY < 70) scrollBy(0, -12); else if (ev.clientY > innerHeight - 70) scrollBy(0, 12);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (!drag) return; const { ph } = drag; zone.insertBefore(item, ph); ph.remove();
    item.classList.remove('dragging'); item.style.width = item.style.left = item.style.top = '';
    ST.ord[zone.dataset.dz] = [...zone.children].map(x => x.dataset.bk || itemKey(x)); save(); drag = null;
  };
  addEventListener('pointermove', mv, { passive: true }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
// ---------- 화면이 바뀔 때마다 ----------
let busy = false;
function enhance() {
  busy = true;
  try {
    const app = document.getElementById('app'); if (!app) return;
    for (const zone of app.querySelectorAll('[data-dz]')) { applyOrder(zone); for (const it of zone.children) if (it.nodeType === 1) addGrip(zone, it); }
    for (const box of app.querySelectorAll('.mainc .panel, .mainc .sec, .hub .panel, .hub .sec')) addFold(box);
  } catch (e) { console.error('boxes', e); }
  busy = false;
}
let pend = 0;
const mo = new MutationObserver(() => { if (busy || drag || pend) return; pend = requestAnimationFrame(() => { pend = 0; enhance(); }); });
const boot = () => { const app = document.getElementById('app'); if (!app) return setTimeout(boot, 200); mo.observe(app, { childList: true, subtree: true }); enhance(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
// 설정: 접은 상자 모두 펼치기 · 홈 순서 되돌리기
U.boxesReset = what => { if (what !== 'ord') ST.fold = {}; if (what !== 'fold') ST.ord = {}; save(); document.querySelectorAll('.folded').forEach(x => x.classList.remove('folded')); };
U.boxesState = () => ({ folds: Object.keys(ST.fold).length, ords: Object.keys(ST.ord).length });
})(window);
