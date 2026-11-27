// 상자 접기·펴기 + 홈 화면 상자 순서 바꾸기 (v45)
// · 화면 안의 모든 상자(.panel 머리 · .sec 제목)에 접기 버튼(▾)을 붙인다. 접은 상태는 이 브라우저에 기억 (화면 + 제목 기준)
// · 홈 화면의 상자는 손잡이(⋮⋮)를 끌어 왼쪽·오른쪽 칸 어디로든 옮긴다 (마우스·터치, v48). 배치도 기억, 설정에서 되돌린다
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
// 같은 화면의 상자 묶음(왼쪽·오른쪽 칸 등)은 한 무리(data-dz 앞 두 글자)로 보고, 칸을 넘어 어디로든 옮길 수 있다
const groupOf = z => String(z).slice(0, 2);
const zonesOf = (app, g) => [...app.querySelectorAll('[data-dz]')].filter(z => groupOf(z.dataset.dz) === g);
// 열쇠는 제목(첫 굵은 글자)만, 날짜·요일·숫자는 뺀다 → 날이 바뀌어도 같은 상자
const stable = t => norm(t).replace(/(^|\s)[월화수목금토일](?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
const itemKey = el => { const hd = el.querySelector('.ph, h3, h2'); let k = ''; if (hd) { const b = hd.querySelector(':scope > b, :scope > strong, :scope > h2, :scope > h3'); k = stable(b ? b.textContent : titleOf(hd)); } return k || (el.className || 'box').split(' ')[0]; };
// 무리 안에서 같은 이름이 겹치면 #2, #3 … 을 붙여 구분
function keyAll(zones) {
  const seen = {};
  for (const z of zones) for (const k of z.children) { if (k.nodeType !== 1 || k.classList.contains('dragph')) continue; const b = itemKey(k); seen[b] = (seen[b] || 0) + 1; k.dataset.bk = seen[b] > 1 ? b + '#' + seen[b] : b; }
}
function applyGroup(zones) {
  keyAll(zones);
  const where = new Map(); // 열쇠 → [칸, 순번]
  for (const z of zones) (ST.ord[z.dataset.dz] || []).forEach((k, i) => where.set(k, [z, i]));
  if (!where.size) return;
  const items = []; for (const z of zones) for (const k of z.children) if (k.nodeType === 1) items.push([k, z, items.length]);
  for (const z of zones) {
    const mine = items.filter(([el, home]) => { const w = where.get(el.dataset.bk); return w ? w[0] === z : home === z; });
    mine.sort((a1, a2) => { const w1 = where.get(a1[0].dataset.bk), w2 = where.get(a2[0].dataset.bk); return (w1 ? w1[1] : 900 + a1[2]) - (w2 ? w2[1] : 900 + a2[2]); });
    const cur = [...z.children].filter(x => x.nodeType === 1);
    if (mine.length !== cur.length || mine.some((x, i) => x[0] !== cur[i])) mine.forEach(([el]) => z.append(el));
  }
}
function addGrip(zone, item) {
  if (item.querySelector(':scope .gripb')) return;
  const hd = item.matches('.panel, .sec') ? headOf(item) : item.querySelector('.ph, .sec > h3');
  const g = h0('button', 'gripb', GRIP, '끌어서 옮기기');
  if (hd) hd.prepend(g); else { item.classList.add('gripabs'); item.append(g); }
  g.addEventListener('pointerdown', e => startDrag(e, item));
}
let drag = null;
// 손가락·마우스 아래 칸: 칸 안이면 그 칸, 아니면 가장 가까운 칸
function zoneAt(zones, x, y) {
  let best = null, bd = 1e9;
  for (const z of zones) { const r = z.getBoundingClientRect(); const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0; const d = dx * 3 + dy; if (d < bd) { bd = d; best = z; } }
  return best;
}
function startDrag(e, item) {
  e.preventDefault(); e.stopPropagation();
  const app = document.getElementById('app'), zone0 = item.parentElement, g = groupOf(zone0.dataset.dz), zones = zonesOf(app, g);
  const r = item.getBoundingClientRect();
  drag = { item, x0: e.clientX, y0: e.clientY, top0: r.top, left0: r.left, ph: document.createElement('div') };
  drag.ph.className = 'dragph'; drag.ph.style.height = Math.min(r.height, 160) + 'px';
  item.classList.add('dragging'); item.style.width = Math.min(r.width, 520) + 'px'; item.style.left = r.left + 'px'; item.style.top = r.top + 'px';
  zone0.insertBefore(drag.ph, item); document.body.append(item);
  zones.forEach(z => z.classList.add('dzon'));
  const mv = ev => {
    if (!drag) return;
    item.style.top = (drag.top0 + ev.clientY - drag.y0) + 'px'; item.style.left = (drag.left0 + ev.clientX - drag.x0) + 'px';
    const z = zoneAt(zones, ev.clientX, ev.clientY); if (!z) return;
    const sib = [...z.children].filter(x => x !== drag.ph && x.nodeType === 1);
    let before = null; for (const s of sib) { const b = s.getBoundingClientRect(); if (ev.clientY < b.top + b.height / 2) { before = s; break; } }
    if (before) z.insertBefore(drag.ph, before); else z.append(drag.ph);
    if (ev.clientY < 70) scrollBy(0, -12); else if (ev.clientY > innerHeight - 70) scrollBy(0, 12);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (!drag) return; const { ph } = drag; ph.parentElement.insertBefore(item, ph); ph.remove();
    item.classList.remove('dragging'); item.style.width = item.style.left = item.style.top = '';
    zones.forEach(z => z.classList.remove('dzon'));
    for (const z of zones) ST.ord[z.dataset.dz] = [...z.children].filter(x => x.nodeType === 1).map(x => x.dataset.bk || itemKey(x));
    save(); drag = null;
  };
  addEventListener('pointermove', mv, { passive: true }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
// ---------- 화면이 바뀔 때마다 ----------
let busy = false;
function enhance() {
  busy = true;
  try {
    const app = document.getElementById('app'); if (!app) return;
    const groups = {}; for (const z of app.querySelectorAll('[data-dz]')) (groups[groupOf(z.dataset.dz)] = groups[groupOf(z.dataset.dz)] || []).push(z);
    for (const g in groups) { applyGroup(groups[g]); for (const zone of groups[g]) for (const it of zone.children) if (it.nodeType === 1) addGrip(zone, it); }
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
