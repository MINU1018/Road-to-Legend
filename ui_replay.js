// 터치라인 커리어 UI — 골 장면 다시보기 (v45)
// 위에서 내려다본 2D 경기장에 22명을 점으로 놓고, 기록된 슈팅(위치·상황·종류·도움)으로 빌드업 → 슈팅 → 골을 재구성한다
// 기록에 없는 움직임(패스 경로·주변 선수 위치)은 그 경기 키로 고정된 난수로 만든다 (같은 골은 늘 같은 장면)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h } = U;
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a || {}) e.setAttribute(k, a[k]); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const shortN = n => { const t = String(n || '').split(' '); return t.length > 1 && t[t.length - 1].length > 2 ? t[t.length - 1] : String(n || ''); };

// ---------- 포메이션 자리 (오른쪽으로 공격하는 팀 기준, 105×68) ----------
const BASE = { GK: [4, 34], CB: [21, 34], LB: [25, 9], RB: [25, 59], LWB: [32, 8], RWB: [32, 60], CDM: [35, 34], DM: [35, 34], CM: [44, 34], LM: [50, 10], RM: [50, 58], CAM: [56, 34], AM: [56, 34], LW: [63, 11], RW: [63, 57], ST: [70, 34], CF: [68, 34], LF: [68, 24], RF: [68, 44], LS: [70, 27], RS: [70, 41] };
const SPREAD = { CB: 13, CDM: 14, DM: 14, CM: 18, CAM: 14, AM: 14, ST: 12, CF: 12 };
function baseSlots(list) {
  const by = {};
  for (const p of list) { const k = BASE[p.pos] ? p.pos : (p.role === 'GK' ? 'GK' : 'CM'); (by[k] = by[k] || []).push(p); }
  const out = new Map();
  for (const k in by) {
    const L = by[k], b = BASE[k], sp = SPREAD[k] || 8;
    L.forEach((p, i) => { const off = L.length > 1 ? (i - (L.length - 1) / 2) * sp * (L.length > 2 ? .8 : 1) : 0; out.set(p.id, [b[0] + (L.length > 2 && i === Math.floor(L.length / 2) && k !== 'CB' ? 4 : 0), clamp(b[1] + off, 3, 65)]); });
  }
  return out;
}
const isF = p => /ST|CF|LW|RW|LF|RF|LS|RS/.test(p.pos);
const isW = p => /LW|RW|LM|RM|LB|RB|LWB|RWB/.test(p.pos);
const isM = p => /CM|CDM|DM|CAM|AM|LM|RM/.test(p.pos);
const isD = p => /CB|LB|RB|LWB|RWB/.test(p.pos);

// ---------- 장면 만들기 ----------
// g: { s(득점 팀 0/1), m, p(득점자 id), a(도움 id), sh:{dx,dy,sit,type}, k('g'|'p'|'o') }
function build(g, lnAtk, lnDef, rnd) {
  const A = lnAtk.slice(0, 11), D = lnDef.slice(0, 11);
  const bA = baseSlots(A), bD0 = baseSlots(D), bD = new Map();
  for (const [id, [x, y]] of bD0) bD.set(id, [105 - x, 68 - y]);
  const sh = g.sh || {}, pen = g.k === 'p' || sh.sit === '페널티킥', own = g.k === 'o';
  const dx = pen ? 11 : clamp(sh.dx != null ? sh.dx : 8 + rnd() * 10, 3, 34), dy = pen ? 0 : clamp(sh.dy != null ? sh.dy : (rnd() - .5) * 16, -26, 26);
  const P = [105 - dx, 34 + dy];
  const GY = 34 + clamp(dy * .12 + (rnd() < .5 ? -1 : 1) * (1.2 + rnd() * 2.2), -3.4, 3.4), GL = [105.6, GY];
  const find = id => A.find(p => p.id === id);
  const scorer = find(g.p) || A.filter(isF)[0] || A[A.length - 1];
  let ast = g.a ? find(g.a) : null; if (ast && ast === scorer) ast = null;
  const pickP = (f, not) => { const L = A.filter(p => p.role !== 'GK' && f(p) && !not.includes(p)); return L.length ? L[Math.floor(rnd() * L.length)] : A.filter(p => p.role !== 'GK' && !not.includes(p))[0]; };
  const head = sh.type === '헤더';
  const F = []; // 장면 단계: { ball:[x,y], car: 선수 | null, dur, kind, z(공 높이) }
  const sit = pen ? 'pen' : own ? 'own' : sh.sit === '코너킥' ? 'corner' : sh.sit === '세트피스' ? (dx > 16.5 ? 'fk' : 'setp') : sh.sit === '역습' ? 'counter' : 'open';
  if (sit === 'pen') {
    F.push({ ball: [94, 34], car: scorer, dur: 1.3, kind: 'set', hold: 1 });
    F.push({ ball: GL, car: null, dur: .45, kind: 'shot' });
  } else if (sit === 'corner') {
    const top = dy < 0, cr = ast || pickP(isW, [scorer]);
    F.push({ ball: [104.6, top ? .6 : 67.4], car: cr, dur: 1.1, kind: 'set', hold: 1 });
    F.push({ ball: P, car: scorer, dur: 1.15, kind: 'cross', z: 1 });
    F.push({ ball: GL, car: null, dur: .4, kind: 'shot' });
  } else if (sit === 'fk') {
    F.push({ ball: P, car: scorer, dur: 1.4, kind: 'set', hold: 1, wall: 1 });
    F.push({ ball: GL, car: null, dur: .75, kind: 'shot', curve: dy > 0 ? -1 : 1 });
  } else if (sit === 'setp') {
    const tk = ast || pickP(p => isM(p) || isW(p), [scorer]);
    F.push({ ball: [clamp(P[0] - 22, 55, 85), clamp(P[1] + (dy >= 0 ? 14 : -14), 6, 62)], car: tk, dur: 1.2, kind: 'set', hold: 1 });
    F.push({ ball: P, car: scorer, dur: 1.05, kind: 'cross', z: 1 });
    F.push({ ball: GL, car: null, dur: .4, kind: 'shot' });
  } else {
    // 빌드업: 뒤에서부터 앞으로, 마지막은 도움 → 득점
    const chain = [];
    const counter = sit === 'counter';
    const n = counter ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
    const roles = counter ? [p => isM(p) || isD(p), p => isF(p) || isW(p)] : [p => isD(p), p => isM(p), p => isM(p) || isW(p), p => isW(p) || isF(p) || isM(p)];
    for (let i = 0; i < n; i++) { const prev = chain[chain.length - 1]; const p = pickP(roles[Math.min(i, roles.length - 1)], [scorer, ast, prev].filter(Boolean)); if (p) chain.push(p); }
    if (ast) chain.push(ast);
    let x = counter ? 30 + rnd() * 12 : 22 + rnd() * 10, y = 34 + (rnd() - .5) * 30;
    chain.forEach((p, i) => {
      const last = i === chain.length - 1;
      if (i === 0) { F.push({ ball: [x, y], car: p, dur: .9, kind: 'start' }); }
      else {
        // 패스를 받을 지점: 앞으로 나아가며 그 선수 자리 쪽으로
        const bp = bA.get(p.id) || [60, 34];
        const prog = (i / chain.length);
        x = clamp(lerp(x, P[0] - (last ? 14 : 0), counter ? .55 : .42) + rnd() * 6, x + 6, 96);
        y = clamp(lerp(y, bp[1], .65) + (rnd() - .5) * 8, 4, 64);
        if (last && head) { x = clamp(P[0] - 6 - rnd() * 8, 74, 97); y = dy >= 0 ? 60 + rnd() * 5 : 3 + rnd() * 5; }
        F.push({ ball: [x, y], car: p, dur: counter ? .8 : .95 + prog * .2, kind: 'pass', z: counter && i === 1 ? .6 : 0 });
      }
      // 공을 몰고 전진 (가끔)
      if ((rnd() < (counter ? .7 : .35)) && !last) { x = clamp(x + 6 + rnd() * 10, x, 90); y = clamp(y + (rnd() - .5) * 10, 4, 64); F.push({ ball: [x, y], car: p, dur: .9, kind: 'drib' }); }
      if (last && !head && rnd() < .4) { x = clamp(x + 4 + rnd() * 6, x, 95); F.push({ ball: [x, y], car: p, dur: .7, kind: 'drib' }); }
    });
    if (!chain.length) F.push({ ball: [P[0] - 10, P[1]], car: scorer, dur: .9, kind: 'start' });
    // 혼자 해결한 골: 득점자가 몰고 들어간다
    if (!ast && chain.length) { F.push({ ball: [clamp(P[0] - 9, 50, 98), clamp(P[1] + (rnd() - .5) * 10, 4, 64)], car: scorer, dur: 1, kind: 'pass' }); F.push({ ball: P, car: scorer, dur: 1, kind: 'drib' }); }
    else F.push({ ball: P, car: scorer, dur: head ? 1.1 : .85, kind: head ? 'cross' : 'pass', z: head ? 1 : 0 });
    F.push({ ball: GL, car: null, dur: dx > 18 ? .65 : .42, kind: 'shot', curve: dx > 18 ? (dy > 0 ? -1 : 1) * .6 : 0 });
  }
  F.push({ ball: [GL[0] + .8, GL[1]], car: null, dur: .25, kind: 'net' });
  F.push({ ball: [GL[0] + .8, GL[1]], car: null, dur: 1.6, kind: 'cele' });
  // 단계마다 22명 위치 계산
  const gkA = A.find(p => p.role === 'GK'), gkD = D.find(p => p.role === 'GK');
  const K = F.map((f, i) => {
    const [bx, by] = f.ball, pos = new Map();
    const sA = clamp((bx - 40) * .55, -10, 30), sD = clamp((bx - 58) * .36, -10, 14);
    for (const p of A) { const b = bA.get(p.id) || [50, 34]; if (p === gkA) { pos.set(p.id, [clamp(4 + Math.max(0, bx - 45) * .28, 3, 22), 34 + (by - 34) * .15]); continue; } pos.set(p.id, [clamp(b[0] + sA, 2, 100), clamp(b[1] + (by - 34) * .22, 2, 66)]); }
    for (const p of D) { const b = bD.get(p.id) || [55, 34]; if (p === gkD) { pos.set(p.id, [clamp(103.5 - Math.max(0, 70 - bx) * .1, 90, 104), clamp(34 + (by - 34) * .18, 30.5, 37.5)]); continue; } let x = clamp(b[0] + sD, 30, 102.5), y = b[1] + (by - 34) * .32; y = lerp(y, 34, .12); pos.set(p.id, [x, clamp(y, 2, 66)]); }
    // 가장 가까운 수비 둘은 공 쪽으로
    const near = D.filter(p => p !== gkD).map(p => [p, Math.hypot(pos.get(p.id)[0] - bx, pos.get(p.id)[1] - by)]).sort((a, b) => a[1] - b[1]).slice(0, 2);
    near.forEach(([p], j) => { const q = pos.get(p.id); pos.set(p.id, [lerp(q[0], bx + 2.2, j ? .35 : .62), lerp(q[1], by + (j ? 3 : 1), j ? .35 : .62)]); });
    // 박스 안 공격수: 득점 지점 근처로 침투
    if (f.kind === 'cross' || (i >= F.length - 4 && f.kind !== 'cele')) { pos.set(scorer.id, i === F.findIndex(z => z.kind === 'shot') - 1 ? P.slice() : [lerp(pos.get(scorer.id)[0], P[0], .55), lerp(pos.get(scorer.id)[1], P[1], .55)]); }
    if (f.car) pos.set(f.car.id, [bx - 1.1, by + .4]);
    if (f.kind === 'shot' || f.kind === 'net') { pos.set(scorer.id, P.slice()); if (gkD) pos.set(gkD.id, [103.8, lerp(34, GL[1], f.kind === 'net' ? .9 : .55)]); }
    if (f.kind === 'cele') { const cy = P[1] < 34 ? 5 : 63; pos.set(scorer.id, [99, cy]); const mates = A.filter(p => p !== scorer && p !== gkA).slice(0, 4); mates.forEach((p, j) => pos.set(p.id, [96 - j * 2.2, cy + (cy < 34 ? 3 + j * 1.5 : -3 - j * 1.5)])); }
    if (sit === 'pen') { for (const p of A.concat(D)) { if (p === scorer || p === gkD) continue; const q = pos.get(p.id); if (q[0] > 86) pos.set(p.id, [85 - Math.abs(q[1] - 34) * .05, q[1]]); } if (gkD) pos.set(gkD.id, f.kind === 'set' ? [104.6, 34] : [104.3, lerp(34, GL[1], .8)]); }
    if (f.wall) { const ang = Math.atan2(34 - by, 105 - bx), wx = bx + Math.cos(ang) * 9.15, wy = by + Math.sin(ang) * 9.15; D.filter(p => p !== gkD).slice(0, 4).forEach((p, j) => pos.set(p.id, [wx - Math.sin(ang) * (j - 1.5) * 1.1, wy + Math.cos(ang) * (j - 1.5) * 1.1])); }
    return pos;
  });
  return { F, K, A, D, scorer, ast, P, sit };
}

// ---------- 그리기 ----------
function pitch(svg) {
  const g = el('g', { stroke: 'rgba(255,255,255,.55)', 'stroke-width': .35, fill: 'none' });
  for (let i = 0; i < 7; i++) svg.append(el('rect', { x: i * 15, y: 0, width: 15, height: 68, fill: i % 2 ? '#2f7a3d' : '#2b7238' }));
  g.append(el('rect', { x: 0, y: 0, width: 105, height: 68 }), el('line', { x1: 52.5, y1: 0, x2: 52.5, y2: 68 }), el('circle', { cx: 52.5, cy: 34, r: 9.15 }));
  for (const s of [0, 1]) {
    const X = v => s ? 105 - v : v;
    g.append(el('rect', { x: s ? 105 - 16.5 : 0, y: 13.84, width: 16.5, height: 40.32 }), el('rect', { x: s ? 105 - 5.5 : 0, y: 24.84, width: 5.5, height: 18.32 }), el('circle', { cx: X(11), cy: 34, r: .3, fill: 'rgba(255,255,255,.6)' }), el('rect', { x: s ? 105 : -1.6, y: 30.34, width: 1.6, height: 7.32, fill: 'rgba(255,255,255,.18)' }));
    g.append(el('path', { d: s ? 'M 88.5 26.7 A 9.15 9.15 0 0 0 88.5 41.3' : 'M 16.5 26.7 A 9.15 9.15 0 0 1 16.5 41.3' }));
  }
  svg.append(g);
}
function play(box, scene, o, done) {
  const { F, K, A, D, scorer, ast } = scene;
  const svg = el('svg', { viewBox: '-3 -3 111 74', class: 'rpsv' });
  pitch(svg);
  const dots = new Map(), labs = new Map();
  const mk = (p, col, gk) => { const g = el('g'); const c = el('circle', { r: 1.55, fill: gk ? '#1b1b1b' : col, stroke: gk ? col : 'rgba(0,0,0,.55)', 'stroke-width': gk ? .6 : .3 }); g.append(c); svg.append(g); dots.set(p.id, g); const t = el('text', { 'font-size': 2.3, fill: '#fff', 'text-anchor': 'middle', 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.7)', 'stroke-width': .5, opacity: 0 }); t.textContent = shortN(o.nameOf(p.id)); svg.append(t); labs.set(p.id, t); };
  D.forEach(p => mk(p, o.colD, p.role === 'GK')); A.forEach(p => mk(p, o.colA, p.role === 'GK'));
  const shadow = el('ellipse', { rx: .9, ry: .5, fill: 'rgba(0,0,0,.35)' }), ball = el('circle', { r: .85, fill: '#fff', stroke: '#111', 'stroke-width': .2 });
  svg.append(shadow, ball);
  const flash = el('text', { x: 52.5, y: 36, 'font-size': 9, 'font-weight': 900, fill: '#fff', 'text-anchor': 'middle', opacity: 0, 'paint-order': 'stroke', stroke: o.colA, 'stroke-width': 1.2 }); flash.textContent = 'GOAL'; svg.append(flash);
  box.replaceChildren(svg);
  let t0 = null, raf = 0, stop = false;
  const T = []; let acc = 0; for (const f of F) { T.push(acc); acc += f.dur; } const total = acc;
  const keyPos = (i, id) => (K[i] && K[i].get(id)) || (K[0].get(id));
  function frame(ts) {
    if (stop) return;
    if (t0 == null) t0 = ts;
    const tt = (ts - t0) / 1000 * (o.speed ? o.speed() : 1);
    let i = 0; while (i < F.length - 1 && tt >= T[i + 1]) i++;
    const f = F[i], loc = clamp((tt - T[i]) / f.dur, 0, 1), e = f.kind === 'shot' || f.kind === 'cross' || f.kind === 'pass' ? loc : ease(loc);
    const prev = i ? F[i - 1].ball : f.ball, cur = f.ball;
    let bx = f.hold && !i ? cur[0] : lerp(prev[0], cur[0], e), by = f.hold && !i ? cur[1] : lerp(prev[1], cur[1], e);
    if (f.curve) by += Math.sin(Math.PI * e) * f.curve * 2.2;
    const z = (f.z || 0) * Math.sin(Math.PI * e);
    ball.setAttribute('cx', bx); ball.setAttribute('cy', by - z * 2.4); ball.setAttribute('r', .85 + z * .5);
    shadow.setAttribute('cx', bx + z * .6); shadow.setAttribute('cy', by + .5);
    const pe = ease(loc);
    for (const p of A.concat(D)) {
      const a = keyPos(i ? i - 1 : 0, p.id), b = keyPos(i, p.id);
      let x = lerp(a[0], b[0], pe), y = lerp(a[1], b[1], pe);
      if (f.car === p && f.kind !== 'pass' && f.kind !== 'cross') { x = bx - 1.1; y = by + .4; }
      dots.get(p.id).setAttribute('transform', `translate(${x},${y})`);
      const L = labs.get(p.id); L.setAttribute('x', x); L.setAttribute('y', y + 3.6);
      const show = (f.car === p) || ((p === scorer || p === ast) && i >= F.length - 3);
      L.setAttribute('opacity', show ? 1 : 0);
    }
    flash.setAttribute('opacity', f.kind === 'cele' ? Math.min(1, loc * 3) : f.kind === 'net' ? loc : 0);
    if (o.onT) o.onT(tt / total);
    if (tt >= total) { done && done(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stop = true; cancelAnimationFrame(raf); };
}

// ---------- 화면 ----------
// goals: [{ s, m, p, a, k, sh }] · teams: [{ name, col, ln:[{id,pos,role,on,off}] }] · nameOf(id)
const rgb = c => { const m = String(c || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i); return m ? [1, 2, 3].map(i => parseInt(m[i], 16)) : null; };
const cdist = (a, b) => { const x = rgb(a), y = rgb(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) : 999; };
U.goalReplay = function (opt) {
  const goals = opt.goals || []; if (!goals.length) return;
  // 점으로만 보이므로 두 팀 색이 비슷하면 원정 팀을 흰색 계열로
  if (opt.teams && cdist(opt.teams[0].col, opt.teams[1].col) < 150) opt.teams[1].col = cdist(opt.teams[0].col, '#f4f4f4') > 150 ? '#f4f4f4' : '#ffb020';
  let gi = clamp(opt.start || 0, 0, goals.length - 1), spd = 1, stopF = null, auto = !!opt.auto;
  U.overlay(close => {
    const stage = h('div', { class: 'rpstage' }), cap = h('div', { class: 'rpcap' }), bar = h('i'), prog = h('div', { class: 'rpbar' }, bar);
    const cnt = h('span', { class: 'mute' });
    const run = () => {
      if (stopF) stopF();
      const g = goals[gi], tA = opt.teams[g.s], tD = opt.teams[1 - g.s];
      const onAt = t => (t.ln || []).filter(p => (p.on || 0) <= g.m && (p.off == null || p.off >= g.m || p.off >= 90)).sort((a, b) => (a.role === 'GK') - (b.role === 'GK'));
      const lA = onAt(tA), lD = onAt(tD);
      const seed = C.seeded ? C.seeded('rp|' + (opt.key || '') + '|' + g.m + '|' + g.p) : Math.random;
      // 자책골: 수비 팀 선수 이름으로 기록되므로 득점자는 공격 팀에서 고른다
      const sc = build(g.k === 'o' ? Object.assign({}, g, { p: null, a: null }) : g, lA.length ? lA : [{ id: 'x', pos: 'ST', role: 'ST' }], lD.length ? lD : [{ id: 'y', pos: 'GK', role: 'GK' }], seed);
      const kind = g.k === 'p' ? '페널티킥' : g.k === 'o' ? '자책골' : [g.sh && g.sh.type, g.sh && g.sh.sit].filter(Boolean).join(' · ');
      cap.replaceChildren(...[h('span', { class: 'rpmin', style: { background: tA.col } }, `${g.m}'`), h('b', null, g.k === 'o' ? opt.nameOf(g.p) + ' (자책)' : opt.nameOf(g.p)), g.a && g.k !== 'o' ? h('span', { class: 'mute' }, ` · 도움 ${opt.nameOf(g.a)}`) : null, h('span', { class: 'mute' }, ` · ${tA.name}${kind ? ' · ' + kind : ''}`), g.sh && g.sh.dx && g.k !== 'p' ? h('span', { class: 'mute' }, ` · ${Math.round(Math.hypot(g.sh.dx, g.sh.dy || 0))}m`) : null].filter(Boolean));
      cnt.textContent = goals.length > 1 ? `${gi + 1} / ${goals.length}` : '';
      stopF = play(stage, sc, { colA: tA.col, colD: tD.col, nameOf: opt.nameOf, speed: () => spd, onT: x => { bar.style.width = clamp(x, 0, 1) * 100 + '%'; } }, () => { if (auto && gi < goals.length - 1) setTimeout(() => { if (!stopF) return; gi++; run(); }, 700); });
    };
    const spdB = h('button', { class: 'btn ghost sm', onclick: e => { spd = spd === 1 ? .5 : spd === .5 ? 2 : 1; e.currentTarget.textContent = `속도 ${spd}x`; } }, '속도 1x');
    const ctrl = h('div', { class: 'rpctl' },
      goals.length > 1 ? h('button', { class: 'btn ghost sm', onclick: () => { gi = (gi - 1 + goals.length) % goals.length; run(); } }, '◀ 이전') : null,
      h('button', { class: 'btn sm', onclick: () => run() }, '다시 보기'),
      goals.length > 1 ? h('button', { class: 'btn ghost sm', onclick: () => { gi = (gi + 1) % goals.length; run(); } }, '다음 ▶') : null,
      spdB, cnt);
    const legend = h('div', { class: 'rpleg' }, ...opt.teams.map(t => h('span', null, h('i', { style: { background: t.col } }), t.name)));
    close.x = () => { if (stopF) stopF(); stopF = null; close(); };
    setTimeout(run, 60);
    return [h('div', { class: 'head' }, h('div', { class: 'lbl' }, opt.title || '골 장면 다시보기'), h('h2', { style: { margin: '2px 0 0', fontSize: '18px' } }, opt.sub || '')),
      h('div', { class: 'body' }, legend, stage, prog, cap, ctrl, h('div', { class: 'mute', style: { fontSize: '11px' } }, '기록된 슈팅 위치·상황·도움을 바탕으로 재구성한 장면입니다. 주변 선수의 움직임은 실제와 다를 수 있습니다.'))];
  }, { cls: 'rpbox' });
};
// 경기 상세(U.showMatch)에서 쓰는 도우미: 기록 d와 경기 통계 ms로 골 목록·팀 정보를 만든다
U.replayData = function (d, ms, names, cols) {
  const goals = (d.ev || []).filter(e => 'gpo'.includes(e.k)).map(e => {
    const atk = e.k === 'o' ? 1 - e.s : e.s;
    const sh = ms && ms.shots ? ms.shots.find(x => x.s === e.s && x.m === e.m && x.p === e.p && x.res === '골') : null;
    return { s: e.k === 'o' ? e.s : e.s, m: e.m, p: e.p, a: e.a, k: e.k, sh: sh ? { dx: sh.dx, dy: sh.dy, sit: sh.sit, type: sh.type } : null, atk };
  }).sort((a, b) => a.m - b.m);
  const teams = [0, 1].map(s => ({ name: names[s], col: cols[s], ln: ms && ms.PL ? ms.PL[s].map(p => ({ id: p.id, pos: p.pos, role: p.role, on: p.on, off: p.off })) : [] }));
  return { goals, teams };
};
})(window);
