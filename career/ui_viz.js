// Road to Legend — 공용 차트 (SVG, 의존성 없음)
// 원칙: 선 2px · 점 r4 + 바탕색 테두리 · 막대 최대 24px, 끝 4px 둥글게 · 격자 1px 실선(흐리게) · 축 하나 · 호버 시 세로선 + 툴팁
// 색: 정체성(구단·국가)은 그 구단 색(바탕과 대비가 부족하면 기본 파랑), 여러 계열은 고정 순서 팔레트(어두운 화면용)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, { h } = U;
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a, kids) => { const e = document.createElementNS(NS, t); for (const k in a || {}) if (a[k] != null) e.setAttribute(k, a[k]); for (const c of kids || []) if (c) e.append(c); return e; };
const tx = (x, y, s, a) => { const e = el('text', Object.assign({ x, y, fill: 'var(--mute)', 'font-size': 12 }, a || {})); e.textContent = s; return e; };
// 어두운 화면용 범주 팔레트 (고정 순서, 돌려 쓰지 않음)
const PAL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'];
const lum = hex => U.lum ? U.lum(hex) : .5;
// 구단 색: 어두운 바탕(#0d1117 근처)에서 보일 만큼 밝은 색만
const idColor = (c, k) => { for (const x of [c && c.c1, c && c.c2]) if (x && /^#/.test(x) && lum(x) > .24) return x; return PAL[k || 0]; };
const niceTicks = (lo, hi, n) => { const span = Math.max(1e-9, hi - lo), raw = span / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= raw) || raw; const out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(Math.round(v * 1e6) / 1e6); return out; };

// 꺾은선. o = { x: [라벨], series: [{ name, color, v: [수|null], dim }], invert, yMin, yMax, ticks, fmt, tip(i) → 문자열 배열, h, bands: [{ y0, y1, label }], area, endLabel }
function lineAt(o, W) {
  W = W || o.W || 640; const H = o.h || 210, L = 34, Rr = o.endLabel ? 96 : 14, T = 12, B = 24, n = o.x.length;
  const vals = o.series.flatMap(s => s.v.filter(v => v != null));
  if (!n || !vals.length) return null;
  let lo = o.yMin != null ? o.yMin : Math.min(...vals), hi = o.yMax != null ? o.yMax : Math.max(...vals); if (lo === hi) { lo -= 1; hi += 1; }
  const X = i => L + (n <= 1 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (n - 1)), Y = v => o.invert ? T + (v - lo) / (hi - lo) * (H - T - B) : H - B - (v - lo) / (hi - lo) * (H - T - B);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'vz', role: 'img', 'aria-label': o.label || '' });
  for (const b of o.bands || []) svg.append(el('rect', { x: L, y: Math.min(Y(b.y0), Y(b.y1)), width: W - L - Rr, height: Math.abs(Y(b.y1) - Y(b.y0)), fill: b.fill || 'rgba(255,255,255,.035)' }), b.label ? tx(W - Rr - 4, Math.min(Y(b.y0), Y(b.y1)) + 12, b.label, { 'text-anchor': 'end', 'font-size': 10 }) : null);
  const ticks = o.ticks || niceTicks(lo, hi, 4);
  for (const t of ticks) { svg.append(el('line', { x1: L, x2: W - Rr, y1: Y(t), y2: Y(t), stroke: 'var(--line)', 'stroke-width': 1 })); svg.append(tx(L - 6, Y(t) + 4, o.fmt ? o.fmt(t) : String(t), { 'text-anchor': 'end' })); }
  const every = Math.max(1, Math.ceil(n / (o.xMax || 10)));
  o.x.forEach((lb, i) => { if (i % every === 0 || i === n - 1) svg.append(tx(X(i), H - 6, lb, { 'text-anchor': 'middle' })); });
  const order = o.series.map((s, k) => [s, k]).sort((a, b) => (a[0].dim ? 0 : 1) - (b[0].dim ? 0 : 1)), ends = [];
  for (const [s] of order) {
    const col = s.dim ? 'rgba(255,255,255,.16)' : s.color || PAL[0];
    let d = '', open = false; s.v.forEach((v, i) => { if (v == null) { open = false; return; } d += (open ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); open = true; });
    if (o.area && !s.dim) { const idx = s.v.map((v, i) => v != null ? i : -1).filter(i => i >= 0); if (idx.length > 1) svg.append(el('path', { d: d + `L${X(idx[idx.length - 1])} ${H - B}L${X(idx[0])} ${H - B}Z`, fill: col, opacity: .1 })); }
    svg.append(el('path', { d, fill: 'none', stroke: col, 'stroke-width': s.dim ? 1.5 : 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (!s.dim) { const li = s.v.map((v, i) => v != null ? i : -1).filter(i => i >= 0).pop(); if (li != null && li >= 0) { svg.append(el('circle', { cx: X(li), cy: Y(s.v[li]), r: 4, fill: col, stroke: 'var(--panel)', 'stroke-width': 2 })); if (o.endLabel) ends.push({ x: X(li) + 8, y: Y(s.v[li]) + 4, t: o.endLabel(s, s.v[li]), c: col }); } }
  }
  // 끝 라벨 겹침 풀기: 위에서부터 최소 14px 간격 (짧은 연결선)
  ends.sort((a, b) => a.y - b.y); for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
  for (const e of ends) { svg.append(tx(e.x + 6, e.y, e.t, { fill: 'var(--text, #e9ecf1)', 'font-size': 12, 'font-weight': 700 })); svg.append(el('line', { x1: e.x - 3, x2: e.x + 3, y1: e.y - 4, y2: e.y - 4, stroke: e.c, 'stroke-width': 2 })); }
  return hover(svg, W, H, L, Rr, T, B, n, X, i => o.tip ? o.tip(i) : null, i => o.series.filter(s => !s.dim && s.v[i] != null).map(s => [X(i), Y(s.v[i]), s.color || PAL[0]]));
}
// 세로 막대 (음수는 아래로). o = { x: [라벨], series: [{ name, color, v }], h, tip(i), fmt }
function colsAt(o, W) {
  W = W || o.W || 640; const H = o.h || 200, L = 34, Rr = 10, T = 12, B = 24, n = o.x.length, S = o.series.length;
  if (!n) return null;
  const vals = o.series.flatMap(s => s.v), hi = Math.max(0, ...vals), lo = Math.min(0, ...vals);
  const span = (hi - lo) || 1, Y = v => T + (hi - v) / span * (H - T - B), band = (W - L - Rr) / n, bw = Math.min(24, (band * .72) / S), gap = 2;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'vz', role: 'img', 'aria-label': o.label || '' });
  for (const t of niceTicks(lo, hi, 4)) { svg.append(el('line', { x1: L, x2: W - Rr, y1: Y(t), y2: Y(t), stroke: t === 0 ? 'rgba(255,255,255,.28)' : 'var(--line)', 'stroke-width': 1 })); svg.append(tx(L - 6, Y(t) + 4, o.fmt ? o.fmt(t) : String(t), { 'text-anchor': 'end' })); }
  const every = Math.max(1, Math.ceil(n / (o.xMax || 12)));
  const X = i => L + band * i + band / 2;
  o.x.forEach((lb, i) => { if (i % every === 0 || i === n - 1) svg.append(tx(X(i), H - 6, lb, { 'text-anchor': 'middle' })); });
  o.series.forEach((s, k) => s.v.forEach((v, i) => { if (!v) return; const x0 = X(i) - (S * bw + (S - 1) * gap) / 2 + k * (bw + gap), y0 = Y(Math.max(0, v)), hh = Math.max(1, Math.abs(Y(v) - Y(0))), r = Math.min(4, hh, bw / 2);
    // 끝만 둥글게 (기준선 쪽은 각지게)
    const up = v > 0, top = up ? y0 : Y(0) + hh, base = up ? y0 + hh : Y(0);
    const d = up ? `M${x0} ${base}V${top + r}Q${x0} ${top} ${x0 + r} ${top}H${x0 + bw - r}Q${x0 + bw} ${top} ${x0 + bw} ${top + r}V${base}Z` : `M${x0} ${base}V${top - r}Q${x0} ${top} ${x0 + r} ${top}H${x0 + bw - r}Q${x0 + bw} ${top} ${x0 + bw} ${top - r}V${base}Z`;
    svg.append(el('path', { d, fill: s.color || PAL[k] })); }));
  return hover(svg, W, H, L, Rr, T, B, n, X, i => o.tip ? o.tip(i) : null, () => [], band);
}
// 실제 너비에 맞춰 다시 그린다 (글자 크기가 화면 크기와 상관없이 12px로 유지)
function fit(draw, o) {
  const box = h('div', { class: 'vzbox' }); let cur = 0;
  const paint = W => { const node = draw(o, W); cur = W; box.replaceChildren(...(node ? [node] : [])); };
  paint(o.W || 640);
  const sync = () => { const W = Math.round(box.clientWidth); if (W > 120 && Math.abs(W - cur) > 8) paint(Math.max(260, W)); };
  requestAnimationFrame(() => requestAnimationFrame(sync));
  if (G.ResizeObserver) { const ro = new ResizeObserver(() => { if (!box.isConnected) { ro.disconnect(); return; } sync(); }); setTimeout(() => ro.observe(box), 0); }
  return box;
}
const line = o => fit(lineAt, o), cols = o => fit(colsAt, o);
// 호버 레이어: 세로선 + 점 + 툴팁 (터치도)
function hover(svg, W, H, L, Rr, T, B, n, X, tip, dots, band) {
  const wrap = h('div', { class: 'vzw' }), tt = h('div', { class: 'vztt' }), vl = el('line', { y1: T, y2: H - B, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1, visibility: 'hidden' }), dg = el('g');
  svg.append(vl, dg);
  const hit = el('rect', { x: L, y: 0, width: W - L - Rr, height: H, fill: 'transparent' }); svg.append(hit);
  const at = ev => { const r = svg.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev, x = (p.clientX - r.left) / r.width * W; let i = 0, bd = 1e9; for (let k = 0; k < n; k++) { const dd = Math.abs(X(k) - x); if (dd < bd) { bd = dd; i = k; } } return { i, r }; };
  const show = ev => { const { i, r } = at(ev), lines = tip(i); if (!lines) return hide(); vl.setAttribute('x1', X(i)); vl.setAttribute('x2', X(i)); vl.setAttribute('visibility', band ? 'hidden' : 'visible');
    dg.replaceChildren(...dots(i).map(([x, y, c]) => el('circle', { cx: x, cy: y, r: 5, fill: c, stroke: 'var(--panel)', 'stroke-width': 2 })));
    tt.replaceChildren(...[].concat(lines).map((t, k) => h('div', { class: k ? '' : 'b' }, t))); tt.style.display = 'block';
    const px = X(i) / W * r.width, left = px > r.width * .6 ? px - tt.offsetWidth - 10 : px + 10; tt.style.left = Math.max(0, left) + 'px'; tt.style.top = '4px'; };
  const hide = () => { tt.style.display = 'none'; vl.setAttribute('visibility', 'hidden'); dg.replaceChildren(); };
  hit.addEventListener('mousemove', show); hit.addEventListener('touchstart', show, { passive: true }); hit.addEventListener('touchmove', show, { passive: true }); hit.addEventListener('mouseleave', hide);
  wrap.append(svg, tt); return wrap;
}
// 숫자 타일 줄. items = [{ k, v, sub, tone }]
function tiles(items) { return h('div', { class: 'vzt' }, ...items.filter(Boolean).map(x => h('div', { class: 'vzti' + (x.tone ? ' ' + x.tone : '') }, h('div', { class: 'lbl' }, x.k), h('b', null, x.v), x.sub ? h('small', { class: 'mute' }, x.sub) : null))); }
// 최근 경기 폼 (W/D/L). 글자 + 색 (색만으로 구분하지 않음)
function form(list) { return h('span', { class: 'vzf' }, ...list.map(r => h('span', { class: 'fm ' + r.r, title: r.t || '' }, r.r === 'W' ? '승' : r.r === 'D' ? '무' : '패'))); }
const legend = items => h('div', { class: 'vzl' }, ...items.map(([n, c]) => h('span', null, h('i', { style: { background: c } }), n)));
U.viz = { line, cols, tiles, form, legend, idColor, PAL };

// ---------- 리그 순위 흐름 (라운드마다 순위) ----------
// L = 리그 기록 저장소, 반환 { ids, rounds: [라운드 번호], pos: { 구단: [순위...] }, pts: { 구단: [승점...] } }
C.lgTrack = (w, L) => {
  const rows = C.MD.leagueRows(w, L).filter(r => r.a && r.b && !isNaN(r.ga)); if (!rows.length) return null;
  const T = {}, add = (id) => T[id] || (T[id] = { id, p: 0, pts: 0, gf: 0, ga: 0 });
  const rs = [...new Set(rows.map(r => r.r))].sort((a, b) => a - b), out = { ids: [], rounds: [], pos: {}, pts: {} };
  for (const r of rows) { add(r.a); add(r.b); }
  out.ids = Object.keys(T); for (const id of out.ids) { out.pos[id] = []; out.pts[id] = []; }
  for (const rd of rs) {
    for (const r of rows) if (r.r === rd) { const A = T[r.a], B2 = T[r.b]; A.p++; B2.p++; A.gf += r.ga; A.ga += r.gb; B2.gf += r.gb; B2.ga += r.ga; if (r.ga > r.gb) A.pts += 3; else if (r.ga < r.gb) B2.pts += 3; else { A.pts++; B2.pts++; } }
    const ord = Object.values(T).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || String(a.id).localeCompare(String(b.id)));
    ord.forEach((x, i) => { out.pos[x.id].push(i + 1); out.pts[x.id].push(x.pts); });
    out.rounds.push(rd + 1);
  }
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
