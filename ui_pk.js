// Road to Legend — 푸스카스상 화면 (시상·역사 > 푸스카스상)과 2D 골 재현
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest } = U;
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at || {}) e.setAttribute(k, at[k]); return e; };
const teamCol = (w, id, alt) => { const c = w.clubs[id] || {}; let col = c.c1; if (!col || U.lum(col) < .16 || U.lum(col) > .92) col = c.c2 && U.lum(c.c2) >= .16 && U.lum(c.c2) <= .92 ? c.c2 : alt; return col; };
const KIND = { lg: '리그', cup: '컵', cont: '대륙 대회' };

// ---------- 2D 재현 ----------
// 하프 코트(미터 → 화면 10배). 위쪽이 상대 골문
const SC = 10, X = x => 340 + x * SC, Y = y => 40 + y * SC;
function pitchSvg() {
  const s = el('svg', { viewBox: '0 0 680 600', class: 'pksvg' });
  s.innerHTML = `<rect x="0" y="0" width="680" height="600" fill="#0f3d2b"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="0" y="${40 + i * 92}" width="680" height="46" fill="#124733"/>`).join('')}
  <g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2">
  <rect x="${X(-34)}" y="${Y(0)}" width="680" height="${52.5 * SC}"/>
  <rect x="${X(-20.16)}" y="${Y(0)}" width="${40.32 * SC}" height="${16.5 * SC}"/>
  <rect x="${X(-9.16)}" y="${Y(0)}" width="${18.32 * SC}" height="${5.5 * SC}"/>
  <path d="M ${X(-7.3)} ${Y(16.5)} A ${9.15 * SC} ${9.15 * SC} 0 0 0 ${X(7.3)} ${Y(16.5)}"/>
  <circle cx="${X(0)}" cy="${Y(52.5)}" r="${9.15 * SC}"/></g>
  <circle cx="${X(0)}" cy="${Y(11)}" r="3" fill="rgba(255,255,255,.7)"/>
  <rect x="${X(-3.66)}" y="${Y(0) - 22}" width="${7.32 * SC}" height="22" fill="rgba(255,255,255,.08)" stroke="#fff" stroke-width="3"/>`;
  return s;
}
function replay(s, x, opts) {
  const w = s.w, g = C.pkGeo(x), home = teamCol(w, x[3], '#f2c14e'); let away = teamCol(w, x[4], '#5fa8ff');
  if (away === home) away = '#e9ecf1';
  const svg = pitchSvg();
  const trail = el('polyline', { fill: 'none', stroke: 'rgba(255,255,255,.75)', 'stroke-width': 2, 'stroke-dasharray': '5 5', points: '' }); svg.append(trail);
  const dot = (col, r, lbl, stroke) => { const gg = el('g'); gg.append(el('circle', { r, fill: col, stroke: stroke || 'rgba(255,255,255,.9)', 'stroke-width': 2 })); if (lbl) { const t = el('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: U.lum(col) > .6 ? '#111' : '#fff' }); t.textContent = lbl; gg.append(t); } svg.append(gg); return gg; };
  const defs = g.defs.map(() => dot(away, 11)), mates = g.mates.map(() => dot(home, 11)), keeper = dot('#f2e14e', 11, 'GK', '#222'), me = dot(home, 14, '★');
  const shadow = el('ellipse', { rx: 5, ry: 3, fill: 'rgba(0,0,0,.45)' }), ball = el('circle', { r: 5, fill: '#fff', stroke: '#111', 'stroke-width': 1.5 }); svg.append(shadow, ball);
  const cap = h('div', { class: 'pkcap mute' }, '');
  const put = (n, p) => { if (p) n.setAttribute('transform', `translate(${X(p[1])},${Y(p[2])})`); };
  let raf = 0, t0 = 0; const DUR = 4600;
  const frame = ts => {
    if (!t0) t0 = ts; const t = Math.min(1, (ts - t0) / DUR);
    g.defs.forEach((tr, i) => put(defs[i], C.pkAt(tr, t))); g.mates.forEach((tr, i) => put(mates[i], C.pkAt(tr, t)));
    put(keeper, C.pkAt(g.gk, t)); put(me, C.pkAt(g.me, t));
    const b = C.pkAt(g.ball, t); if (b) { shadow.setAttribute('cx', X(b[1])); shadow.setAttribute('cy', Y(b[2])); ball.setAttribute('cx', X(b[1])); ball.setAttribute('cy', Y(b[2]) - b[3] * 7); ball.setAttribute('r', 5 + b[3] * .5); }
    if (t >= g.shotT) { const pts = g.ball.filter(p => p[0] >= g.shotT && p[0] <= t).map(p => `${X(p[1])},${Y(p[2]) - p[3] * 7}`); trail.setAttribute('points', pts.join(' ')); } else trail.setAttribute('points', '');
    cap.textContent = t < g.shotT ? '' : t < g.t1 ? `${g.name}!` : `골! ${U.fmtMin(x[6])} ${C.pkName(s, x)}`;
    if (t < 1) raf = requestAnimationFrame(frame);
  };
  const play = () => { cancelAnimationFrame(raf); t0 = 0; raf = requestAnimationFrame(frame); };
  play();
  return { node: h('div', { class: 'pkstage' }, svg, cap), play, stop: () => cancelAnimationFrame(raf) };
}
U.pkReplay = function (s, x) {
  const w = s.w, T = C.PKT[x[7]];
  U.overlay(close => {
    const R = replay(s, x);
    const opp = w.clubs[x[4]] || {}, mine = w.clubs[x[3]] || {};
    return h('div', null,
      h('div', { class: 'head', style: { gridTemplateColumns: '1fr auto', alignItems: 'center' } }, h('div', null, h('b', { style: { fontSize: '16px' } }, `${C.pkName(s, x)} · ${T.n}`), h('div', { class: 'mute', style: { fontSize: '12px' } }, `${mine.name || ''} vs ${opp.name || ''} · ${x[12] || KIND[x[8]] || ''} · ${C.fmtDateY(x[5])} · ${U.fmtMin(x[6])} · 약 ${Math.round(x[9])}m`)),
        h('button', { class: 'btn ghost sm', onclick: () => { R.stop(); close(); } }, '닫기')),
      h('div', { class: 'body' }, R.node, h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
        h('button', { class: 'btn sm', onclick: () => R.play() }, '다시 보기'),
        U.openRecMatch ? h('button', { class: 'btn ghost sm', onclick: () => U.openRecMatch(s, x[3], x[5], x[4]) }, '경기 기록') : null),
        h('div', { class: 'mute', style: { fontSize: '11.5px', textAlign: 'center' } }, '기록(종류·거리·시간)을 바탕으로 만든 간단한 재현입니다. ★ 득점자 · 노란색 골키퍼')));
  }, { clickClose: true, cls: 'pkov' });
};

// ---------- 목록 ----------
function row(s, x, rank) {
  const w = s.w, c = w.clubs[x[3]], o = w.clubs[x[4]], T = C.PKT[x[7]], pid = x[1] !== 'ME' && x[1][0] !== '~' ? x[1] : null;
  return h('div', { class: 'pkrow click', onclick: ev => { if (ev.target.closest('.lnk')) return; U.pkReplay(s, x); } },
    h('span', { class: 'pkrk' + (rank === 1 ? ' gold' : '') }, rank ? String(rank) : '·'),
    h('div', null, h('div', null, pid ? h('span', { class: 'lnk', onclick: () => U.openPlayer(pid) }, C.pkName(s, x)) : h('b', null, C.pkName(s, x)), ' ', h('span', { class: 'mute', style: { fontSize: '12px' } }, `${T.n} · 약 ${Math.round(x[9])}m`)),
      h('div', { class: 'mute', style: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' } }, crest(c || null, 14), (c || {}).name || '', ` vs ${(o || {}).name || ''} · ${x[12] || KIND[x[8]] || ''} · ${C.fmtDateY(x[5])} ${U.fmtMin(x[6])}`)),
    h('span', { class: 'pkplay' }, '▶ 재현'));
}
U.pkView = function (s) {
  const w = s.w, sv = U.st.pkv = U.st.pkv || {}, box = h('div');
  const H = w.pkHist || [], cur = w.pusk && w.pusk.c && w.pusk.c.length ? w.pusk : null;
  const opts = [];
  if (cur) opts.push(['cur', `${cur.y + 1}년 후보 경쟁 (집계 중)`]);
  for (const x of H.slice().reverse()) opts.push([String(x.y), `${x.y}년${U.cerHidden(x.y) ? ' (시상식 전)' : ''}`]);
  if (!opts.length) { box.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '시즌이 진행되면 아름다운 골이 후보로 쌓입니다. 한 해는 8월 1일에 마감, 수상자는 시상식에서 발표합니다.'))); return box; }
  if (!sv.y || !opts.some(o => o[0] === sv.y)) sv.y = opts[0][0];
  box.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { sv.y = e.target.value; U.stay(); } }, ...opts.map(([k, l]) => { const o = h('option', { value: k }, l); if (k === sv.y) o.selected = true; return o; }))));
  if (sv.y === 'cur') {
    const L = cur.c.slice().sort((a, b) => b[0] - a[0]).slice(0, 15);
    box.append(h('div', { class: 'sec' }, h('h3', null, '올해의 골 후보', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${C.wLabel(cur.y)} 시즌 · 8월 1일 마감 뒤 최종 후보 10골 선정`)), h('div', { class: 'in pklist' }, ...L.map(x => row(s, x, 0)))));
  } else {
    const b = H.find(x => String(x.y) === sv.y), hid = U.cerHidden(b.y);
    const L = hid ? b.top.slice().sort((a, z) => a[5] - z[5]) : b.top;
    box.append(h('div', { class: 'sec' }, h('h3', null, `${b.y} 푸스카스상`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, hid ? ` 최종 후보 ${L.length}골 · 수상자는 ${C.fmtDateY(w.cer.d)} 시상식에서 발표` : ` ${C.wLabel(b.y - 1)} 시즌 · 상위 ${L.length}골`)),
      h('div', { class: 'in pklist' }, ...L.map((x, i) => row(s, x, hid ? 0 : i + 1)))));
  }
  // 역대 수상
  const won = H.filter(x => !U.cerHidden(x.y) && x.top[0]).reverse();
  if (won.length) box.append(h('div', { class: 'sec' }, h('h3', null, '역대 수상'), h('div', { class: 'in pklist' }, ...won.map(x => h('div', { class: 'pkrow click', onclick: () => U.pkReplay(s, x.top[0]) }, h('span', { class: 'pkrk' }, String(x.y)), h('div', null, h('b', null, C.pkName(s, x.top[0])), h('span', { class: 'mute', style: { fontSize: '12px' } }, ` ${C.PKT[x.top[0][7]].n} · ${(w.clubs[x.top[0][3]] || {}).name || ''}`)), h('span', { class: 'pkplay' }, '▶'))))));
  return box;
};
})(typeof window !== 'undefined' ? window : globalThis);
