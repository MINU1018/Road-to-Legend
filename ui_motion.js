// 터치라인 커리어 UI — 2D 움직임 엔진 (v46)
// 결과(골·도움·슈팅 위치)는 이미 기록에 있다. 이 파일은 "선수들이 어떻게 움직였는지"만 그럴듯하게 만든다
// · 선수 22명: 최고 속도·가속 한계가 있는 조향 이동 (순간이동 없음), 팀 대형·압박·대인 마크·침투 침투
// · 공: 패스 거리에 따라 속도가 정해지고 점점 느려진다. 크로스·로빙은 포물선, 슈팅은 빠르게
// · 장면(scene): 기록된 결과를 끝으로 하는 짧은 각본 — 빌드업 → 마지막 패스 → 슈팅 → 골/선방/빗나감/골대/막힘, 또는 퇴장 반칙
// · 평상시(ambient): 각본 없이 점유를 주고받는 흐름 (골은 나지 않는다) — 중계에서 빠르게 흘려 보여 준다
// 좌표: 가로 0~105, 세로 0~68. 팀마다 dir(+1이면 오른쪽 골문을 공격)
(function (G) {
'use strict';
const U = G.TCUI = G.TCUI || {};
const DT = 1 / 25, PL = 105, PW = 68, GY = 34, POST = 3.66;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hyp = Math.hypot;
function RNG(seed) { let s = (seed >>> 0) || 88172645; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; return r; }
const hash = str => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

// ---------- 대형 (자기 팀 기준: 자기 골문 x=0, 공격 방향 +x) ----------
const BASE = { GK: [4, 34], CB: [19, 34], LB: [23, 10], RB: [23, 58], LWB: [30, 8], RWB: [30, 60], CDM: [32, 34], DM: [32, 34], CM: [40, 34], LM: [46, 11], RM: [46, 57], CAM: [52, 34], AM: [52, 34], LW: [58, 11], RW: [58, 57], ST: [64, 34], CF: [62, 34], LF: [62, 26], RF: [62, 42], LS: [64, 28], RS: [64, 40] };
const SPREAD = { CB: 12, CDM: 13, DM: 13, CM: 17, CAM: 13, AM: 13, ST: 11, CF: 11 };
// 경기 기록의 포메이션(C.FORMS)과 자리 번호(sl)가 있으면 그 자리 그대로: x% 왼쪽→오른쪽, y% 우리 골문→상대 골문
function baseOf(list, fm) {
  const FS = fm && G.TC && G.TC.FORMS && G.TC.FORMS[fm];
  if (FS && list.every(p => p.sl != null && FS[p.sl])) { const out = new Map(); for (const p of list) { const [, fx, fy] = FS[p.sl]; out.set(p.id, [2 + fy * .7, 3 + fx / 100 * 62]); } return out; }
  const by = {}, out = new Map();
  for (const p of list) { const k = BASE[p.pos] ? p.pos : (p.role === 'GK' ? 'GK' : 'CM'); (by[k] = by[k] || []).push(p); }
  for (const k in by) { const L = by[k], b = BASE[k], sp = SPREAD[k] || 8; L.forEach((p, i) => { const off = L.length > 1 ? (i - (L.length - 1) / 2) * sp * (L.length > 2 ? .8 : 1) : 0; out.set(p.id, [b[0] + (L.length > 2 && k !== 'CB' && i === Math.floor(L.length / 2) ? -4 : 0), clamp(b[1] + off, 4, 64)]); }); }
  return out;
}
const isF = p => /ST|CF|LW|RW|LF|RF|LS|RS/.test(p.pos);
const isW = p => /LW|RW|LM|RM|LB|RB|LWB|RWB/.test(p.pos);
const isM = p => /CM|CDM|DM|CAM|AM|LM|RM/.test(p.pos);
const isD = p => /CB|LB|RB|LWB|RWB/.test(p.pos);
const VMAX = p => p.gk ? 6.4 : isF(p) || /LW|RW/.test(p.pos) ? 8.6 : /LB|RB|LWB|RWB/.test(p.pos) ? 8.3 : isM(p) ? 8.0 : 7.7;

// ---------- 상태 ----------
// teams: [{ ln:[{id,pos,role}], col }, …], dirs: [dir0, dir1]
function mkState(teams, dirs, seed) {
  const r = RNG(seed || 1);
  const S = { t: 0, r, dirs: dirs.slice(), P: [], ball: { x: 52.5, y: 34, z: .11, vx: 0, vy: 0, owner: null, fl: null }, poss: 0, mode: 'play', ev: [], lastOwner: null };
  teams.forEach((T, s) => {
    const L = (T.ln || []).slice(0, 11), B = baseOf(L, T.fm);
    for (const q of L) { const b = B.get(q.id) || [40, 34]; const p = { id: q.id, s, pos: q.pos || 'CM', gk: q.role === 'GK' || q.pos === 'GK', b, x: 0, y: 0, vx: 0, vy: 0, face: 0, tx: 0, ty: 0, urg: .5, stun: 0, rx: 0, ry: 0, rt: 0, down: 0 }; p.vmax = VMAX(p) * (.96 + r() * .08); S.P.push(p); }
  });
  return S;
}
const teamOf = (S, s) => S.P.filter(p => p.s === s);
// 팀 기준 좌표 ↔ 경기장 좌표 (같은 식이 양쪽으로 성립)
const tf = (S, s, x, y) => S.dirs[s] > 0 ? [x, y] : [PL - x, PW - y];
function place(S, bx, by, possSide) {
  // 지금 공 위치에 맞는 대형 위치로 바로 놓는다 (장면 시작·킥오프)
  S.ball.x = bx; S.ball.y = by; S.ball.z = .11; S.ball.fl = null; S.ball.owner = null; S.poss = possSide;
  for (const p of S.P) { const [x, y] = shapeTarget(S, p); p.x = x + (S.r() - .5) * 2; p.y = y + (S.r() - .5) * 2; p.vx = p.vy = 0; p.face = S.dirs[p.s] > 0 ? 0 : Math.PI; }
}
function kickoffPlace(S, side) {
  S.ball.x = 52.5; S.ball.y = 34; S.ball.z = .11; S.ball.fl = null; S.poss = side;
  for (const p of S.P) { const [x0, y0] = p.b; const x = p.gk ? 4 : Math.min(48, x0 * .72 + 2), y = 34 + (y0 - 34) * .9; const [wx, wy] = tf(S, p.s, x, y); p.x = wx; p.y = wy; p.vx = p.vy = 0; p.face = S.dirs[p.s] > 0 ? 0 : Math.PI; }
  const T = teamOf(S, side).filter(p => !p.gk).sort((a, b) => (isF(b) - isF(a)) || (b.b[0] - a.b[0]));
  if (T[0]) { const [wx, wy] = tf(S, side, 51.8, 34.6); T[0].x = wx; T[0].y = wy; S.ball.owner = T[0]; }
  if (T[1]) { const [wx, wy] = tf(S, side, 50.5, 30); T[1].x = wx; T[1].y = wy; }
}

// ---------- 목표 위치 ----------
function offLine(S, s) { // s팀 기준, 상대 최종 수비 라인(골키퍼 제외)
  let m = 0; for (const p of S.P) if (p.s !== s && !p.gk) { const [x] = tf(S, s, p.x, p.y); if (x > m) m = x; } return m || 70;
}
function shapeTarget(S, p) {
  const b = S.ball, [bx, by] = tf(S, p.s, b.x, b.y), inP = S.poss === p.s;
  let x, y;
  if (p.gk) {
    if (inP) { x = clamp(5 + Math.max(0, bx - 35) * .2, 3, 20); y = 34 + (by - 34) * .12; }
    else { const d = hyp(bx, by - 34) || 1, k = clamp(d * .11, 1.2, 6.5); x = Math.max(.8, bx / d * k); y = 34 + (by - 34) / d * k; }
  } else if (inP) {
    const sh = clamp((bx - 36) * .62, -8, 34) * (p.b[0] < 26 ? .85 : 1);
    x = p.b[0] + sh; y = 34 + (p.b[1] - 34) * 1.12 + (by - 34) * .2;
    const ol = offLine(S, p.s); if (isF(p) || /LW|RW|CAM|AM/.test(p.pos)) x = Math.min(x, Math.max(ol - .6, bx));
    x = clamp(x, 2, 101);
  } else {
    const sh = clamp((bx - 52) * .5, -13, 15);
    x = p.b[0] * .86 + sh; y = 34 + (p.b[1] - 34) * .72 + (by - 34) * .42;
    x = clamp(x, 3, 96);
  }
  x += p.rx; y += p.ry;
  return tf(S, p.s, x, clamp(y, 2, 66));
}
// 수비: 압박 · 커버 · 대인 마크
function defendTasks(S, out) {
  const b = S.ball, c = b.owner || null, ds = 1 - S.poss, D = teamOf(S, ds).filter(p => !p.gk && !p.down), A = teamOf(S, S.poss).filter(p => !p.gk);
  const ref = c || b, gx = S.dirs[ds] > 0 ? 0 : PL; // 수비 팀 골문 x
  const toGoal = (q, k) => { const vx = gx - q.x, vy = GY - q.y, d = hyp(vx, vy) || 1; return [q.x + vx / d * k, q.y + vy / d * k]; };
  const byD = D.slice().sort((a, b2) => hyp(a.x - ref.x, a.y - ref.y) - hyp(b2.x - ref.x, b2.y - ref.y));
  const used = new Set();
  if (byD[0]) { const [x, y] = toGoal(ref, 1.2); out.set(byD[0], [x, y, 1]); used.add(byD[0]); }
  if (byD[1] && hyp(byD[1].x - ref.x, byD[1].y - ref.y) < 18) { const [x, y] = toGoal(ref, 6); out.set(byD[1], [x, y, .8]); used.add(byD[1]); }
  // 우리 진영 깊은 곳의 공격수는 가까운 수비가 붙는다
  const danger = A.filter(q => q !== c && Math.abs(q.x - gx) < 34).sort((a, b2) => Math.abs(a.x - gx) - Math.abs(b2.x - gx));
  for (const q of danger) { let best = null, bd = 1e9; for (const d of D) { if (used.has(d)) continue; const dd = hyp(d.x - q.x, d.y - q.y); if (dd < bd) { bd = dd; best = d; } } if (!best || bd > 22) continue; used.add(best); const [x, y] = toGoal(q, 1.6); out.set(best, [x, y, .9]); }
}
// ---------- 이동 ----------
function steer(p, tx, ty, urg) {
  if (p.stun > 0) { p.stun -= DT; p.vx *= .86; p.vy *= .86; p.x += p.vx * DT; p.y += p.vy * DT; return; }
  const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy);
  const want = d < .25 ? 0 : Math.min(p.vmax * urg, d * 1.5);
  const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
  let ax = (ux * want - p.vx) / DT, ay = (uy * want - p.vy) / DT;
  const sp = hyp(p.vx, p.vy), dec = want < sp, A = dec ? 7.5 : 4.6 + (1 - Math.min(1, sp / 6)) * 1.4, am = hyp(ax, ay);
  if (am > A) { ax = ax / am * A; ay = ay / am * A; }
  p.vx += ax * DT; p.vy += ay * DT; p.x = clamp(p.x + p.vx * DT, -1, PL + 1); p.y = clamp(p.y + p.vy * DT, -1, PW + 1);
}
function faceTo(p, ang) { let d = ang - p.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; p.face += d * .25; }
// ---------- 공 ----------
// 패스·크로스·슈팅: 출발점·도착점·걸리는 시간·높이를 정해 두고 따라간다 (지상 패스는 점점 느려지는 곡선)
function flightTime(d, kind) {
  if (kind === 'shot') return d / 27 + .05;
  if (kind === 'head') return d / 15 + .05;
  if (kind === 'cross' || kind === 'long') return d / 19 + .25;
  if (kind === 'clear') return d / 20 + .2;
  return d / clamp(8 + d * .5, 10, 22) + .05;
}
function kick(S, to, kind, extra) {
  const b = S.ball, x0 = b.x, y0 = b.y, d = hyp(to[0] - x0, to[1] - y0);
  const T = flightTime(d, kind);
  const h = kind === 'cross' ? clamp(d * .17, 3, 7) : kind === 'long' ? clamp(d * .14, 3, 9) : kind === 'clear' ? clamp(d * .2, 4, 12) : kind === 'shot' ? (extra && extra.z != null ? extra.z : .6) : kind === 'head' ? 1.2 : 0;
  b.fl = Object.assign({ x0, y0, z0: b.z, x1: to[0], y1: to[1], T, u: 0, kind, h, curve: 0 }, extra || {});
  if (b.owner) { S.lastOwner = b.owner; b.owner.kickT = S.t; } b.owner = null;
  return T;
}
function stepBall(S) {
  const b = S.ball;
  if (b.owner) {
    const o = b.owner, drib = hyp(o.vx, o.vy) > 2.5, off = drib ? .7 + .35 * Math.sin(S.t * 9) : .45;
    b.x = o.x + Math.cos(o.face) * off; b.y = o.y + Math.sin(o.face) * off; b.z = .11; b.vx = o.vx; b.vy = o.vy; return;
  }
  const f = b.fl;
  if (f) {
    f.u += DT / f.T; const u = Math.min(1, f.u);
    const e = f.kind === 'pass' || f.kind === 'roll' ? 1 - Math.pow(1 - u, 1.7) : f.kind === 'shot' || f.kind === 'head' ? u : u;
    const px = b.x, py = b.y;
    b.x = f.x0 + (f.x1 - f.x0) * e; b.y = f.y0 + (f.y1 - f.y0) * e + (f.curve || 0) * Math.sin(Math.PI * u) * 2.2;
    b.z = f.kind === 'pass' || f.kind === 'roll' ? .11 : Math.max(.11, f.z0 * (1 - u) + (f.z1 != null ? f.z1 : .11) * u + f.h * 4 * u * (1 - u));
    b.vx = (b.x - px) / DT; b.vy = (b.y - py) / DT;
    if (f.u >= 1) { const fin = f; b.fl = null; if (fin.kind === 'pass' || fin.kind === 'roll') { b.roll = { vx: b.vx * .5, vy: b.vy * .5 }; } if (fin.onEnd) fin.onEnd(S, fin); }
    return;
  }
  if (b.roll) { b.x += b.roll.vx * DT; b.y += b.roll.vy * DT; b.roll.vx *= .93; b.roll.vy *= .93; if (hyp(b.roll.vx, b.roll.vy) < .3) b.roll = null; }
  b.z = Math.max(.11, b.z - 4 * DT);
}
// 공을 잡는다: 흐르는 공 가까이 간 선수 (지상 패스 도착 직전이면 받을 선수)
function control(S, allow) {
  const b = S.ball; if (b.owner || (b.fl && b.fl.kind !== 'pass' && b.fl.kind !== 'roll') || b.z > 1.4) return;
  if (b.fl && b.fl.u < .75 && !(allow && allow.intercept)) return;
  let best = null, bd = 1.2;
  for (const p of S.P) { if (p.down || p.stun > 0 || (p.kickT && S.t - p.kickT < .35) || (S.only != null && p.s !== S.only)) continue; const d = hyp(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = p; } }
  if (!best) return;
  if (b.fl && b.fl.to && best !== b.fl.to && !(allow && allow.intercept)) return;
  b.fl = null; b.roll = null; b.owner = best; best.recvT = S.t;
  if (best.s !== S.poss) { S.poss = best.s; S.ev.push({ t: S.t, k: 'turn', s: best.s }); }
}

// ---------- 한 걸음 ----------
// ctl(S): 각본·평상시 판단. 반환된 tasks(Map 선수 → [x, y, 급함])가 대형 목표보다 우선
function step(S, ctl) {
  const tasks = new Map();
  if (S.mode === 'play') defendTasks(S, tasks);
  if (ctl) ctl(S, tasks);
  const b = S.ball;
  for (const p of S.P) {
    // 대형 안에서 조금씩 자리를 바꾼다 (같은 자리에 멈춰 있지 않게)
    if (S.t >= p.rt) { p.rt = S.t + 1.8 + S.r() * 2.5; p.rx = (S.r() - .5) * (p.gk ? 1 : 5); p.ry = (S.r() - .5) * (p.gk ? 1.5 : 6); }
    if (p.down > 0) { p.down -= DT; p.x = clamp(p.x + p.vx * DT, -1, PL + 1); p.y = clamp(p.y + p.vy * DT, -1, PW + 1); p.vx *= .88; p.vy *= .88; continue; }
    let tg = tasks.get(p), tx, ty, urg;
    if (tg) { [tx, ty, urg] = tg; }
    else if (b.owner === p) { tx = p.x; ty = p.y; urg = .2; }
    else { [tx, ty] = shapeTarget(S, p); const d = hyp(tx - p.x, ty - p.y); urg = S.mode === 'cele' ? .3 : d > 9 ? .85 : d > 4 ? .6 : .42; }
    steer(p, tx, ty, urg);
    const sp = hyp(p.vx, p.vy);
    if (b.owner === p && sp > .5) faceTo(p, Math.atan2(p.vy, p.vx)); else if (sp > 2.2) faceTo(p, Math.atan2(p.vy, p.vx)); else faceTo(p, Math.atan2(b.y - p.y, b.x - p.x));
  }
  stepBall(S);
  if (S.mode === 'play') control(S, S.ctlOpt);
  S.t += DT;
}

// ---------- 녹화 ----------
const FR = 22 * 3 + 4;
function rec(S, buf, lab) {
  const a = new Float32Array(FR); let o = 0;
  for (let i = 0; i < 22; i++) { const p = S.P[i]; if (!p) { a[o++] = -99; a[o++] = 0; a[o++] = 0; continue; } a[o++] = p.x; a[o++] = p.y; a[o++] = p.face + (p.down > 0 ? 100 : 0); }
  a[o++] = S.ball.x; a[o++] = S.ball.y; a[o++] = S.ball.z; a[o++] = S.ball.owner ? S.P.indexOf(S.ball.owner) : -1;
  buf.push(a); if (lab) buf.lab = lab;
}

// ---------- 평상시 흐름 (골 없음) ----------
// 공을 가진 선수가 0.5~1.6초마다 판단: 앞쪽 빈 동료에게 패스 / 드리블 / 횡패스. 박스 근처에선 슈팅 대신 돌린다
function ambientCtl(S, tasks) {
  const b = S.ball, c = b.owner;
  if (S.amb == null) S.amb = { next: S.t + .6, drib: null, inFinal: 0 };
  const A = S.amb;
  if (b.fl && b.fl.to && !b.owner) tasks.set(b.fl.to, [b.fl.x1, b.fl.y1, 1]);
  // 흐르는 공은 가까운 두 명이 쫓는다
  if (!c && !b.fl) { const L = S.P.filter(p => !p.down).sort((p, q) => hyp(p.x - b.x, p.y - b.y) - hyp(q.x - b.x, q.y - b.y)); for (const p of L.slice(0, 2)) tasks.set(p, [b.x, b.y, 1]); }
  if (!c) return;
  // 압박에 걸리면 빼앗긴다 (상대가 1m 안에 붙어 있는 시간에 비례)
  const opp = S.P.filter(p => p.s !== c.s && !p.down), near = opp.reduce((m, p) => Math.min(m, hyp(p.x - c.x, p.y - c.y)), 99);
  if (near < 1.1 && S.t - (c.recvT || 0) > .35 && S.r() < DT * (c.gk ? 0 : .9)) { const tk = opp.find(p => hyp(p.x - c.x, p.y - c.y) < 1.15); if (tk) { c.stun = .5; b.owner = tk; tk.recvT = S.t; S.poss = tk.s; S.ev.push({ t: S.t, k: 'turn', s: tk.s }); return; } }
  const [cx] = tf(S, c.s, c.x, c.y);
  if (cx > 78) A.inFinal += DT; else A.inFinal = Math.max(0, A.inFinal - DT);
  if (A.drib && S.t < A.drib.until) { tasks.set(c, [A.drib.x, A.drib.y, .75]); return; }
  if (S.t < A.next) { tasks.set(c, [c.x + Math.cos(c.face) * 1.5, c.y + Math.sin(c.face) * 1.5, .25]); return; }
  A.next = S.t + .55 + S.r() * 1.1; A.drib = null;
  const mates = S.P.filter(p => p.s === c.s && p !== c && !p.down);
  // 공격 3분의 1에서 오래 머물면 상대 골키퍼가 잡은 것처럼 소유가 넘어간다 (슈팅·골 없이)
  if (A.inFinal > 4 + S.r() * 4) { const gk = S.P.find(p => p.s !== c.s && p.gk); if (gk) { A.inFinal = 0; kick(S, [gk.x, gk.y], 'roll', { to: gk }); return; } }
  const score = q => { const [qx, qy] = tf(S, c.s, q.x, q.y), d = hyp(q.x - c.x, q.y - c.y); if (d < 6 || d > 38) return 0; const free = S.P.filter(o => o.s !== c.s).reduce((m, o) => Math.min(m, hyp(o.x - q.x, o.y - q.y)), 99); let v = Math.min(1, free / 7) * (1 + clamp((qx - cx) / 25, -.6, 1)) * (qx > 86 ? .3 : 1); if (q.gk) v *= .25; return v * (.6 + S.r() * .8); };
  const cand = mates.map(q => [q, score(q)]).filter(x => x[1] > .05).sort((a, b2) => b2[1] - a[1]);
  const space = near > 5 && cx < 80;
  if (space && S.r() < .32) { const [ox, oy] = tf(S, c.s, Math.min(84, cx + 7 + S.r() * 8), clamp(tf(S, c.s, c.x, c.y)[1] + (S.r() - .5) * 8, 4, 64)); A.drib = { x: ox, y: oy, until: S.t + 1 + S.r() * .8 }; tasks.set(c, [ox, oy, .75]); return; }
  if (!cand.length) { A.next = S.t + .3; return; }
  const q = cand[Math.random() < .7 ? 0 : Math.min(cand.length - 1, 1)][0];
  const T = flightTime(hyp(q.x - c.x, q.y - c.y), 'pass');
  const aim = [clamp(q.x + q.vx * T * .8, 1, PL - 1), clamp(q.y + q.vy * T * .8, 1, PW - 1)], d = hyp(aim[0] - c.x, aim[1] - c.y);
  const kind = d > 30 && S.r() < .5 ? 'long' : 'pass';
  kick(S, aim, kind, { to: q, onEnd: kind === 'long' ? (S2) => { S2.ball.roll = null; } : null });
  tasks.set(q, [aim[0], aim[1], 1]);
}
// 가로챔: 지상 패스 길목에 상대가 있으면 잡을 수 있다
function ambientStep(S) { S.ctlOpt = { intercept: true }; step(S, ambientCtl); }

// 받을 선수가 제시간에 닿을 수 있는 지점으로 줄인다
function reach(q, aim, T) { const dx = aim[0] - q.x, dy = aim[1] - q.y, d = hyp(dx, dy), m = q.vmax * .85 * Math.max(.2, T - .15); return d <= m ? aim : [q.x + dx / d * m, q.y + dy / d * m]; }
// ---------- 장면 (각본) ----------
// o: { atk, scorer, ast, kind: 'goal'|'save'|'miss'|'post'|'block'|'red', sit, type, dx, dy, k('p' PK·'o' 자책), pk(푸스카스 종류), foul }
// 빌드업은 미리 정한 사슬이 아니라 그 순간의 위치로 고른다: 7~28m 패스, 받고 나서 0.6~1.4초 뒤 다음 판단, 전진·빈 공간 우선
function scene(S, o) {
  const r = S.r, atk = o.atk, dfs = 1 - atk;
  const A = teamOf(S, atk), D = teamOf(S, dfs);
  const W = (x, y) => tf(S, atk, x, y), F = q => tf(S, atk, q.x, q.y); // 공격 팀 기준 좌표
  const outfield = A.filter(p => !p.gk);
  const byId = id => A.find(p => p.id === id);
  let scorer = byId(o.scorer) || outfield.filter(isF)[0] || outfield[outfield.length - 1];
  let ast = o.ast ? byId(o.ast) : null; if (ast === scorer) ast = null;
  const pk = o.pk || null;
  const pen = o.sit === '페널티킥' || o.k === 'p', head = o.type === '헤더';
  const volley = pk === 'volley' || pk === 'bike' || pk === 'heel' || pk === 'scorp';
  const longS = pk === 'curl' || pk === 'rocket' || pk === 'chip' || pk === 'half';
  const dx = pen ? 11 : clamp(o.dx != null ? o.dx : 8 + r() * 10, 3, 60), dyv = pen ? 0 : clamp(o.dy != null ? o.dy : (r() - .5) * 16, -25, 25);
  const P = W(PL - dx, 34 + dyv);
  const gy = o.kind === 'post' ? 34 + (r() < .5 ? 1 : -1) * POST : o.kind === 'miss' ? 34 + (r() < .5 ? 1 : -1) * (POST + .6 + r() * 3) : 34 + clamp(dyv * .1 + (r() < .5 ? -1 : 1) * (.8 + r() * 2.4), -3.3, 3.3);
  const GL = W(o.kind === 'miss' ? PL + 2.5 : PL + .1, gy);
  const shotZ = pk === 'chip' ? 3.2 : pk === 'half' ? 6 : o.kind === 'miss' && r() < .5 ? 2.9 : head ? .9 : .25 + r() * 1.2;
  const sit = pen ? 'pen' : o.kind === 'red' ? 'red' : pk === 'fk' || (o.sit === '세트피스' && dx > 17) ? 'fk' : o.sit === '코너킥' ? 'corner' : o.sit === '세트피스' ? 'setp' : pk === 'solo' ? 'solo' : o.sit === '역습' ? 'counter' : 'open';
  const counter = sit === 'counter';
  const frames = []; frames.meta = { scorer: scorer && scorer.id, ast: ast && ast.id, P, sit, kind: o.kind, labels: [] };
  const lab = t => frames.meta.labels.push([frames.length, t]);
  const near = (L, q) => L.slice().sort((p1, p2) => hyp(p1.x - q.x, p1.y - q.y) - hyp(p2.x - q.x, p2.y - q.y));
  const oppDist = q => D.reduce((m, p) => Math.min(m, hyp(p.x - q.x, p.y - q.y)), 99);
  const takeBall = w0 => { const b = S.ball; if (b.owner) b.owner.stun = .5; b.owner = w0; b.fl = null; b.roll = null; S.poss = atk; w0.recvT = S.t; return w0; };
  const setPiece = (bx, by, taker, layout) => { S.mode = 'dead'; S.ball.x = bx; S.ball.y = by; S.ball.z = .11; S.ball.fl = null; S.ball.owner = null; S.poss = atk; layout(); S.ball.owner = taker; taker.x = bx - S.dirs[atk] * .6; taker.y = by; taker.vx = taker.vy = 0; taker.recvT = S.t; };
  // ---- 시작 배치 ----
  let phase = 'build', passes = 0, minPass = counter ? 1 + Math.floor(r() * 2) : sit === 'red' ? 2 : 2 + Math.floor(r() * 3), last = null, scorerGo = false, endT = 0, t0 = S.t, sub = null;
  if (sit === 'pen') {
    setPiece(...W(PL - 11, 34), scorer, () => { for (const p of S.P) { if (p === scorer) continue; if (p.gk && p.s === dfs) { const [x, y] = W(PL - .3, 34); p.x = x; p.y = y; continue; } if (p.gk) continue; const [tx] = F(p); if (tx > 86) { const [x, y] = W(84 - r() * 4, 20 + r() * 28); p.x = x; p.y = y; } } });
    { const [x, y] = W(PL - 14.5, 34 + (r() - .5)); scorer.x = x; scorer.y = y; }
    phase = 'pen'; sub = { t: S.t + 1.6 };
  } else if (sit === 'corner' || sit === 'setp') {
    const top = dyv < 0, cr = ast || near(outfield.filter(p => p !== scorer && (isW(p) || isM(p))), { x: P[0], y: P[1] })[0] || outfield.find(p => p !== scorer);
    const sp = sit === 'corner' ? W(PL - .4, top ? .4 : PW - .4) : W(clamp(PL - dx - 24, 50, 82), clamp(34 + dyv + (dyv >= 0 ? 14 : -14), 6, 62));
    setPiece(sp[0], sp[1], cr, () => cornerLayout(S, atk, scorer, P, top, r));
    ast = cr; phase = 'wait'; sub = { t: S.t + 2.4, next: 'final' };
  } else if (sit === 'fk') {
    setPiece(P[0], P[1], scorer, () => fkLayout(S, atk, P, r));
    phase = 'wait'; sub = { t: S.t + 2.4, next: 'shoot' };
  } else {
    // 열린 플레이: 수비 진영·미드필드에서 시작
    const sx = counter ? 30 + r() * 12 : sit === 'solo' ? clamp(PL - dx - 28 - r() * 10, 30, 60) : 18 + r() * 14, sy = 34 + (r() - .5) * 34;
    place(S, ...W(sx, sy), atk);
    if (counter) for (const p of D) { if (p.gk) continue; const [x, y] = F(p); const q = W(Math.max(8, x - 14), y); p.x = q[0]; p.y = q[1]; }
    const st0 = counter ? near(outfield.filter(p => (isM(p) || isD(p)) && p !== scorer && p !== ast), { x: W(sx, sy)[0], y: W(sx, sy)[1] })[0] : near(outfield.filter(p => p !== scorer && p !== ast && (isD(p) || /CDM|DM/.test(p.pos))), { x: W(sx, sy)[0], y: W(sx, sy)[1] })[0];
    const c0 = st0 || outfield.find(p => p !== scorer) || scorer;
    const q0 = W(sx, sy); c0.x = q0[0] - S.dirs[atk] * .6; c0.y = q0[1]; takeBall(c0); c0.recvT = S.t - .3;
    if (counter) { const loser = near(D.filter(p => !p.gk), c0)[0]; if (loser) { loser.x = c0.x + S.dirs[atk] * 1.5; loser.y = c0.y + .8; loser.stun = .6; } }
  }
  S.mode = S.mode === 'dead' ? 'dead' : 'play';
  frames.meta.cut = ['pen', 'corner', 'fk', 'setp'].includes(sit);
  // 도움 위치·침투 위치 (공격 팀 기준)
  const [Px, Py] = tf(S, atk, P[0], P[1]);
  const wide = head || volley;
  const astSpot = wide ? [clamp(Px - 6 - r() * 8, 74, 96), Py >= 34 ? 60 + r() * 5 : 3 + r() * 5] : [clamp(Px - 10 - r() * 10, 55, 88), clamp(Py + (r() - .5) * 26, 6, 62)];
  const preSpot = [clamp(Px - 9, 50, 92), clamp(Py + (Py < 34 ? -4 : 4), 6, 62)];
  // 빌드업 판단: 받을 선수 고르기
  function pickRecv(c) {
    const [cx] = F(c), ready = passes >= minPass - 1;
    const L = [];
    for (const q of outfield) {
      if (q === c) continue;
      if (q === scorer && (ast || !ready) && sit !== 'solo') continue; // 득점자는 마지막에
      if (q === ast && !ready) continue;
      const d = hyp(q.x - c.x, q.y - c.y); const longOK = d <= 45 && (isW(q) || isF(q)) && r() < .12;
      if (d < 7 || (d > 28 && !longOK)) continue;
      const [qx] = F(q), prog = qx - cx, free = oppDist(q);
      let v = (free > 3 ? 1 : free > 1.8 ? .45 : .12) * (1 + clamp(prog / 18, -.7, 1.1));
      if (q === last) v *= .3;
      if (ready) v *= 1 + clamp((60 - hyp(q.x - P[0], q.y - P[1])) / 40, 0, 1.2);
      if (ready && (q === ast || (!ast && q === scorer))) v *= 2.5;
      if (qx > Px + 4) v *= .5;
      L.push([q, v * (.7 + r() * .6), d]);
    }
    L.sort((x1, x2) => x2[1] - x1[1]);
    return L[0] || null;
  }
  const holdFor = c => (counter ? .35 + r() * .35 : .65 + r() * .75) + (c.gk ? .6 : 0);
  function doPass(c, q, kind) {
    const T = flightTime(hyp(q.x - c.x, q.y - c.y), 'pass');
    const [qx, qy] = tf(S, atk, q.x + q.vx * T * .7, q.y + q.vy * T * .7);
    const aim = reach(q, W(clamp(qx + .8 + r() * 1.6, 3, Px + 2), clamp(qy, 3, 65)), T);
    const d = hyp(aim[0] - c.x, aim[1] - c.y), k = kind || (d > 30 ? 'long' : 'pass');
    kick(S, aim, k, { to: q, onEnd: (S3, f) => { if (f.kind !== 'pass' && hyp(q.x - S3.ball.x, q.y - S3.ball.y) < 2.2) { S3.ball.owner = q; S3.ball.roll = null; q.recvT = S3.t; } } });
    last = c; passes++;
  }
  const ctl = (S2, tasks) => {
    const b = S2.ball, c = b.owner;
    for (const p of D) if (p.gk && p.dive && S2.t >= p.dive.at) { const d0 = p.dive; p.dive = null; p.vx = clamp((d0.to[0] - p.x) / .45, -7, 7); p.vy = clamp((d0.to[1] - p.y) / .45, -7, 7); p.down = .9; }
    if (phase === 'cele') { if (S2.celeCtl) S2.celeCtl(S2, tasks); return; }
    if (b.fl && b.fl.to && !b.owner) tasks.set(b.fl.to, [b.fl.x1, b.fl.y1, 1]);
    if (phase === 'end' || phase === 'shotFly') return;
    // 득점자·도움 선수의 움직임
    if (phase !== 'pen' && sit !== 'fk' && scorer && c !== scorer) {
      const [bx] = tf(S2, atk, b.x, b.y);
      if (scorerGo) tasks.set(scorer, [P[0], P[1], 1]);
      else if (bx > 40 || sit === 'solo') { const q = W(preSpot[0], preSpot[1]); tasks.set(scorer, [q[0], q[1], .7]); }
    }
    if (ast && c !== ast && phase === 'build' && passes >= minPass - 2) { const [bx] = tf(S2, atk, b.x, b.y); if (bx > 35) { let q = W(astSpot[0], astSpot[1]); if (passes >= minPass && hyp(q[0] - b.x, q[1] - b.y) > 24) q = [b.x + (q[0] - b.x) * .5, b.y + (q[1] - b.y) * .5]; tasks.set(ast, [q[0], q[1], .8]); } }
    if (phase === 'pen') { if (!sub.run) tasks.set(scorer, [scorer.x, scorer.y, .2]);
      if (!sub.run && S2.t >= sub.t) { sub.run = S2.t; b.owner = null; }
      if (sub.run) { const q = W(PL - 11.6, 34); tasks.set(scorer, [q[0], q[1], .55]); if (S2.t - sub.run > 1.05) { b.owner = scorer; phase = 'shoot'; sub = { t: S2.t }; } }
      return;
    }
    // 흐르는 공: 가까운 공격수가 잡으러 간다
    if (!c && !b.fl) { const ch = phase === 'shoot' || phase === 'solo' ? scorer : near(outfield, b)[0]; if (ch) tasks.set(ch, [b.x, b.y, 1]); return; }
    if (!c) return;
    if (c.s !== atk) { const w0 = near(outfield, c)[0]; tasks.set(w0, [c.x, c.y, 1]); if (hyp(w0.x - c.x, w0.y - c.y) < 1.3) takeBall(w0); return; }
    const held = S2.t - (c.recvT != null ? c.recvT : S2.t);
    if (phase === 'wait') { tasks.set(c, [c.x, c.y, .2]); if (S2.t >= sub.t) { S2.mode = 'play'; phase = sub.next; sub = null; } return; }
    if (phase === 'build') {
      if (S2.t - t0 > 12) passes = Math.max(passes, minPass); // 너무 길어지면 마무리 쪽으로 (패스 거리 제한은 그대로)
      if (S2.t - t0 > 24 && held > .5) { const fin0 = ast || scorer; if (c === fin0) { phase = ast ? 'final' : 'solo'; return; } const L = outfield.filter(q => q !== c && hyp(q.x - c.x, q.y - c.y) <= 30 && hyp(q.x - c.x, q.y - c.y) >= 6).sort((q1, q2) => hyp(q1.x - fin0.x, q1.y - fin0.y) - hyp(q2.x - fin0.x, q2.y - fin0.y)); if (L[0]) { doPass(c, L[0]); return; } }
      const [cx] = F(c);
      if (sit === 'red' && passes >= minPass) { phase = 'foul'; sub = { t: S2.t, to: W(Math.min(cx + 14, 96), clamp(F(c)[1] + (r() - .5) * 10, 5, 63)) }; return; }
      if (c === ast && passes >= minPass - 1) { phase = 'final'; return; }
      if (c === scorer && (!ast || sit === 'solo') && passes >= minPass - 1) { phase = 'solo'; return; }
      if (held < holdFor(c)) { tasks.set(c, [c.x + S2.dirs[atk] * 1.5, c.y, .35]); return; }
      // 가까이 마무리 선수가 있고 패스를 충분히 돌렸으면 그쪽으로
      const fin = ast || scorer;
      if (passes >= minPass && hyp(fin.x - c.x, fin.y - c.y) <= 28 && hyp(fin.x - c.x, fin.y - c.y) >= 5) { doPass(c, fin); return; }
      // 앞에 공간이 있으면 몰고 간다
      const ahead = D.filter(p => !p.gk).some(p => { const [px, py] = F(p), [qx, qy] = F(c); return px > qx && px - qx < 9 && Math.abs(py - qy) < 5; });
      if (!ahead && cx < 78 && r() < .35 && !c.drib) { c.drib = { to: W(Math.min(cx + 6 + r() * 8, Px - 4), clamp(F(c)[1] + (r() - .5) * 8, 4, 64)), until: S2.t + 1.6 }; }
      if (c.drib) { if (S2.t < c.drib.until && hyp(c.x - c.drib.to[0], c.y - c.drib.to[1]) > 1) { tasks.set(c, [c.drib.to[0], c.drib.to[1], .72]); return; } c.drib = null; c.recvT = S2.t - holdFor(c) + .25; return; }
      const pk2 = pickRecv(c);
      if (pk2) doPass(c, pk2[0]); else { c.recvT = S2.t - holdFor(c) + .3; tasks.set(c, [c.x + S2.dirs[atk] * 1, c.y, .4]); }
      return;
    }
    if (phase === 'foul') {
      tasks.set(c, [sub.to[0], sub.to[1], .8]);
      const fd = D.find(p => p.id === o.foul) || near(D.filter(p => !p.gk), c)[0];
      if (fd) { tasks.set(fd, [c.x, c.y, 1]); if (hyp(fd.x - c.x, fd.y - c.y) < .9 || S2.t - sub.t > 3.5) { c.down = 2.6; fd.vx *= .3; fd.vy *= .3; b.owner = null; b.roll = { vx: c.vx * .6, vy: c.vy * .6 }; phase = 'end'; endT = S2.t + 2.6; lab('red'); S2.mode = 'dead'; } }
      return;
    }
    if (phase === 'final') {
      // 헤더·발리: 측면 깊은 곳까지 몰고 가서 크로스
      const spot = W(astSpot[0], astSpot[1]);
      if (wide && sit === 'open' || wide && sit === 'counter' || wide && sit === 'solo') { if (hyp(c.x - spot[0], c.y - spot[1]) > 3 && !(sub && sub.carry > 4)) { sub = sub || { carry: 0 }; sub.carry += DT; tasks.set(c, [spot[0], spot[1], .82]); return; } }
      if (held < (counter ? .3 : .5)) { tasks.set(c, [c.x + S2.dirs[atk] * 1, c.y, .3]); return; }
      const dB = hyp(P[0] - c.x, P[1] - c.y);
      if (dB > 30 && !wide && sit !== 'corner' && sit !== 'setp') { tasks.set(c, [P[0], P[1], .75]); return; } // 너무 멀면 조금 더 몰고 간다
      const kind = wide || sit === 'corner' || sit === 'setp' || dB > 25 ? 'cross' : 'pass', T = flightTime(dB, kind);
      scorerGo = true;
      const eta = hyp(scorer.x - P[0], scorer.y - P[1]) / (scorer.vmax * .92) + .1;
      sub = sub || {}; sub.w = (sub.w || 0) + DT;
      tasks.set(c, [c.x + S2.dirs[atk] * .6, c.y, .25]);
      if (eta > T + .15 && sub.w < 3) return;
      const aim = reach(scorer, P, T);
      kick(S2, aim, kind, { to: scorer, onEnd: (S3) => { if (hyp(scorer.x - S3.ball.x, scorer.y - S3.ball.y) < 2.2) { S3.ball.owner = scorer; S3.ball.roll = null; scorer.recvT = S3.t; } if (kind === 'cross') S3.ball.z = 1.4; } });
      passes++; phase = 'shoot'; sub = { first: kind === 'cross' || head || volley || r() < .25 }; return;
    }
    if (phase === 'solo') {
      // 혼자 몰고 들어가 슈팅 지점까지 (빈 쪽으로 조금씩 꺾는다)
      scorerGo = false; sub = sub || { zz: 0 };
      const dP = hyp(c.x - P[0], c.y - P[1]);
      if (dP < 1.2) { phase = 'shoot'; sub = { first: false }; c.recvT = S2.t - .3; return; }
      sub.zz += DT; const wob = Math.sin(sub.zz * 2.2) * Math.min(4, dP * .25);
      const [qx, qy] = tf(S2, atk, P[0], P[1]), tgt = W(qx, qy + wob);
      tasks.set(c, [tgt[0], tgt[1], pk === 'solo' ? .9 : .75]); return;
    }
    if (phase === 'shoot') {
      if (c !== scorer) { if (c.s === atk) { doPass(c, scorer); phase = 'shoot'; } return; }
      const wait = sub && sub.first ? 0 : sit === 'pen' || sit === 'fk' ? .1 : longS ? .5 + r() * .3 : .4 + r() * .35;
      if (!sub) sub = {}; if (sub.at == null) sub.at = S2.t + wait;
      if (S2.t < sub.at) { tasks.set(c, [c.x + S2.dirs[atk] * .8, c.y, .35]); return; }
      lab('shot');
      const gk = D.find(p => p.gk);
      const curve = sit === 'fk' ? (dyv > 0 ? -1 : 1) * .8 : pk === 'curl' ? (dyv > 0 ? -1 : 1) * .9 : dx > 18 ? (dyv > 0 ? -1 : 1) * .4 : 0;
      const z1 = o.kind === 'miss' && shotZ > 2.5 ? 3.2 : pk === 'chip' || pk === 'half' ? 1.8 : Math.min(2.2, shotZ * (.6 + r() * .8));
      const T = kick(S2, GL, head ? 'head' : 'shot', { z: shotZ, z1, curve, onEnd: shotEnd });
      if (pk === 'chip' || pk === 'half') { b.fl.T *= pk === 'half' ? 1.9 : 1.6; if (gk) { const q = W(PL - 6, 34); gk.x = gk.x * .7 + q[0] * .3; } }
      if (gk) { const reach0 = o.kind === 'save' ? GL : [GL[0], 34 + (GL[1] - 34) * (o.kind === 'goal' ? .45 : .2)]; gk.dive = { at: S2.t + b.fl.T * (o.kind === 'save' ? .35 : .55), to: reach0 }; }
      if (o.kind === 'block') { const bl = near(D.filter(p => !p.gk), { x: P[0], y: P[1] })[0]; if (bl) { const bp = [P[0] + (GL[0] - P[0]) * .2, P[1] + (GL[1] - P[1]) * .2]; bl.vx = clamp((bp[0] - bl.x) / .35, -7, 7); bl.vy = clamp((bp[1] - bl.y) / .35, -7, 7); bl.down = .8; b.fl.T *= .2; b.fl.x1 = bp[0]; b.fl.y1 = bp[1]; b.fl.onEnd = (S3) => { kick(S3, W(clamp(PL - dx + 4 - r() * 10, 60, 100), clamp(34 + (r() - .5) * 40, 3, 65)), 'clear'); phase = 'end'; endT = S3.t + 2.2; }; } }
      phase = 'shotFly';
      void T;
    }
  };
  function shotEnd(S3) {
    const b = S3.ball;
    if (o.kind === 'goal') { b.roll = { vx: S3.dirs[atk] * 3, vy: 0 }; b.z = Math.min(b.z, 2); S3.mode = 'cele'; phase = 'cele'; endT = S3.t + 3.6; lab('goal'); celebrate(S3, atk, scorer); return; }
    if (o.kind === 'save') { const gk = D.find(p => p.gk); if (gk && hyp(gk.x - b.x, gk.y - b.y) < 1.8 && r() < .5) { b.owner = gk; S3.poss = dfs; } else kick(S3, W(PL - 3 - r() * 5, b.y < 34 ? 2 + r() * 8 : 60 - r() * 8), 'clear'); phase = 'end'; endT = S3.t + 2.4; return; }
    if (o.kind === 'post') { kick(S3, W(PL - 6 - r() * 8, 34 + (r() - .5) * 18), 'pass'); phase = 'end'; endT = S3.t + 2.4; return; }
    b.roll = { vx: S3.dirs[atk] * 4, vy: 0 }; phase = 'end'; endT = S3.t + 2; S3.mode = 'dead';
  }
  rec(S, frames);
  S.only = atk; // 장면 동안 공은 공격 팀만 잡는다 (기록에 없는 가로채기 없음)
  let guard = 0;
  while (guard++ < 1600) {
    S.ctlOpt = null;
    step(S, ctl);
    rec(S, frames);
    if ((phase === 'end' || phase === 'cele') && S.t >= endT) break;
    if (S.t - t0 > 40) break;
  }
  S.only = null;
  return frames;
}
function cornerLayout(S, atk, scorer, P, top, r) {
  const W = (x, y) => tf(S, atk, x, y), A = teamOf(S, atk), D = teamOf(S, 1 - atk);
  const box = [[94, 30], [92, 38], [96, 41], [90, 26], [98, 34], [88, 44]];
  let i = 0;
  for (const p of A) { if (p.gk) { const [x, y] = W(40, 34); p.x = x; p.y = y; continue; } if (p === scorer) { const q = W(clamp(tf(S, atk, P[0], P[1])[0] - 5, 84, 99), clamp(tf(S, atk, P[0], P[1])[1] + (r() - .5) * 6, 26, 42)); p.x = q[0]; p.y = q[1]; continue; } if (isD(p) && /LB|RB|LWB|RWB/.test(p.pos)) { const q = W(55 + r() * 6, 34 + (r() - .5) * 30); p.x = q[0]; p.y = q[1]; continue; } const b = box[i++ % box.length]; const q = W(b[0] - 2 + r() * 4, b[1] + (r() - .5) * 4); p.x = q[0]; p.y = q[1]; }
  i = 0; const zone = [[101, 30], [101, 38], [99, 34], [97, 28], [97, 40], [94, 34], [92, 30], [92, 40], [86, 34], [80, 22]];
  for (const p of D) { if (p.gk) { const [x, y] = W(PL - .6, 34 + (top ? -1.5 : 1.5)); p.x = x; p.y = y; continue; } const z = zone[i++ % zone.length]; const q = W(z[0], z[1] + (r() - .5) * 2); p.x = q[0]; p.y = q[1]; }
  for (const p of S.P) { p.vx = p.vy = 0; }
}
function fkLayout(S, atk, P, r) {
  const W = (x, y) => tf(S, atk, x, y), A = teamOf(S, atk), D = teamOf(S, 1 - atk), [px, py] = tf(S, atk, P[0], P[1]);
  const ang = Math.atan2(34 - py, PL - px), wx = px + Math.cos(ang) * 9.15, wy = py + Math.sin(ang) * 9.15;
  let i = 0;
  for (const p of D) { if (p.gk) { const [x, y] = W(PL - .6, 34 + clamp((py - 34) * -.08, -2, 2)); p.x = x; p.y = y; continue; } if (i < 4) { const q = W(wx - Math.sin(ang) * (i - 1.5) * .75, wy + Math.cos(ang) * (i - 1.5) * .75); p.x = q[0]; p.y = q[1]; i++; continue; } const q = W(94 - r() * 8, 22 + r() * 24); p.x = q[0]; p.y = q[1]; i++; }
  for (const p of A) { if (p.gk) { const [x, y] = W(30, 34); p.x = x; p.y = y; continue; } const [x] = tf(S, atk, p.x, p.y); if (x > px - 3) { const q = W(Math.min(97, px + 8 + r() * 10), 20 + r() * 28); p.x = q[0]; p.y = q[1]; } }
  for (const p of S.P) { p.vx = p.vy = 0; }
}
function celebrate(S, atk, scorer) {
  const W = (x, y) => tf(S, atk, x, y), [sx, sy] = tf(S, atk, scorer.x, scorer.y), cy = sy < 34 ? 3 : 65;
  const flag = W(100, cy);
  S.celeCtl = (S2, tasks) => {
    tasks.set(scorer, [flag[0], flag[1], .9]);
    teamOf(S2, atk).filter(p => p !== scorer && !p.gk).slice(0, 5).forEach((p, j) => tasks.set(p, [scorer.x - S2.dirs[atk] * (1.2 + j * .9), scorer.y + (j % 2 ? 1 : -1) * (.8 + j * .4), .9]));
    teamOf(S2, 1 - atk).forEach(p => { if (!p.gk) tasks.set(p, [p.x - S2.dirs[atk] * .5, p.y, .18]); });
  };
}

// ---------- 그리기 (캔버스) ----------
function drawPitch(x, W, H, P, sc) {
  x.fillStyle = '#123220'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) { const a = P(i * 7.5, 0), b = P((i + 1) * 7.5, PW); x.fillStyle = i % 2 ? '#2f7a3d' : '#2b7238'; x.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]) + .6, Math.abs(b[1] - a[1])); }
  x.strokeStyle = 'rgba(240,245,240,.75)'; x.lineWidth = Math.max(1, sc * .14);
  const line = pts => { x.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.stroke(); };
  line([[0, 0], [PL, 0], [PL, PW], [0, PW], [0, 0]]); line([[52.5, 0], [52.5, PW]]);
  const c0 = P(52.5, 34); x.beginPath(); x.arc(c0[0], c0[1], 9.15 * sc, 0, 7); x.stroke();
  for (const s of [0, 1]) {
    const X = v => s ? PL - v : v;
    line([[X(0), 13.84], [X(16.5), 13.84], [X(16.5), 54.16], [X(0), 54.16]]); line([[X(0), 24.84], [X(5.5), 24.84], [X(5.5), 43.16], [X(0), 43.16]]);
    const ps = P(X(11), 34); x.fillStyle = 'rgba(240,245,240,.8)'; x.beginPath(); x.arc(ps[0], ps[1], Math.max(1.2, sc * .2), 0, 7); x.fill();
    x.beginPath(); const a0 = Math.acos(5.5 / 9.15); for (let k = 0; k <= 16; k++) { const t = -a0 + 2 * a0 * k / 16; const q = P(X(11) + (s ? -1 : 1) * Math.cos(t) * 9.15, 34 + Math.sin(t) * 9.15); k ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); } x.stroke();
    x.save(); x.strokeStyle = '#fff'; x.lineWidth = Math.max(2, sc * .3); line([[X(0), 34 - POST], [X(-1.6), 34 - POST], [X(-1.6), 34 + POST], [X(0), 34 + POST]]); x.restore();
  }
}
// F: 프레임(Float32Array) · info(i) → { col, ring, gk, label, me } · opt: { flash }
function draw(cv, F, info, opt) {
  const x = cv.getContext('2d'), r = cv.getBoundingClientRect(), dpr = Math.min(2, G.devicePixelRatio || 1);
  const W = Math.max(10, Math.round(r.width * dpr)), H = Math.max(10, Math.round(r.height * dpr));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const sc = Math.min(W / (PL + 6), H / (PW + 6)), ox = (W - PL * sc) / 2, oy = (H - PW * sc) / 2;
  const P = (px, py) => [ox + px * sc, oy + py * sc];
  drawPitch(x, W, H, P, sc);
  if (!F) return;
  const R = Math.max(4, sc * 1.25), own = F[22 * 3 + 3];
  const lbl = [];
  for (let i = 0; i < 22; i++) {
    const px = F[i * 3]; if (px < -50) continue;
    const inf = info(i); if (!inf) continue;
    let fa = F[i * 3 + 2]; const down = fa > 50; if (down) fa -= 100;
    const [sx, sy] = P(px, F[i * 3 + 1]);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(sx + R * .2, sy + R * .3, R, R * .75, 0, 0, 7); x.fill();
    x.fillStyle = inf.gk ? inf.gkc : inf.col; x.beginPath(); if (down) x.ellipse(sx, sy, R * 1.25, R * .7, fa, 0, 7); else x.arc(sx, sy, R, 0, 7); x.fill();
    x.lineWidth = Math.max(1, R * .2); x.strokeStyle = inf.ring || 'rgba(0,0,0,.55)'; x.stroke();
    if (!down) { x.fillStyle = inf.ring || 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(sx + Math.cos(fa) * R * .7, sy + Math.sin(fa) * R * .7, R * .24, 0, 7); x.fill(); }
    if (inf.me) { x.lineWidth = Math.max(1.5, R * .28); x.strokeStyle = '#f2c14e'; x.beginPath(); x.arc(sx, sy, R + R * .5, 0, 7); x.stroke(); }
    if (inf.label && (own === i || inf.always)) lbl.push([sx, sy + R * 2.3, inf.label, inf.me]);
  }
  const bx = F[66], by = F[67], bz = F[68], [qx, qy] = P(bx, by), z = Math.max(0, bz - .11);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(qx + z * sc * .25, qy + z * sc * .12, R * .5, R * .32, 0, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.strokeStyle = '#111'; x.lineWidth = Math.max(1, R * .12); x.beginPath(); x.arc(qx, qy - z * sc * .55, R * (.48 + Math.min(.4, z * .05)), 0, 7); x.fill(); x.stroke();
  x.font = `600 ${Math.max(10, Math.round(R * 1.15))}px system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const [lx, ly, t, me] of lbl) { x.lineWidth = Math.max(2, R * .4); x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(t, lx, ly); x.fillStyle = me ? '#f2c14e' : '#fff'; x.fillText(t, lx, ly); }
  if (opt && opt.flash) { x.save(); x.globalAlpha = opt.flash.a; x.font = `900 ${Math.round(sc * 9)}px system-ui, sans-serif`; x.lineWidth = sc * 1.2; x.strokeStyle = opt.flash.col || '#000'; x.strokeText(opt.flash.t, W / 2, H / 2); x.fillStyle = '#fff'; x.fillText(opt.flash.t, W / 2, H / 2); x.restore(); }
}
// 두 프레임 사이를 보간 (각도는 짧은 쪽으로)
function lerpF(a, b, u, out) {
  out = out || new Float32Array(FR);
  for (let i = 0; i < FR; i++) out[i] = a[i] + (b[i] - a[i]) * u;
  for (let i = 0; i < 22; i++) { let fa = a[i * 3 + 2], fb = b[i * 3 + 2]; const da = fa > 50, db = fb > 50; if (da) fa -= 100; if (db) fb -= 100; let d = fb - fa; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; out[i * 3 + 2] = fa + d * u + ((u < .5 ? da : db) ? 100 : 0); if (a[i * 3] < -50 || b[i * 3] < -50) out[i * 3] = -99; }
  out[69] = u < .5 ? a[69] : b[69];
  return out;
}
function snap(S) { const buf = []; rec(S, buf); return buf[0]; }
U.MOT = { DT, FR, mkState, place, kickoffPlace, ambientStep, scene, draw, lerpF, snap, hash, RNG, step,
  // 장면이 끝난 뒤(골 세리머니 포함) 걸음을 이어 갈 때 쓰는 제어
  stepCele: S => step(S, (S2, tasks) => S2.celeCtl && S2.celeCtl(S2, tasks)) };
})(window);
