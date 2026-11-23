// Road to Legend — 푸스카스상 (한 해 가장 아름다운 골)
// 경기마다 골 가운데 일부가 '특별한 골'(중거리 감아차기·프리킥·발리·단독 돌파·오버헤드킥 등)이 된다.
// 후보는 w.pusk = { y, c: [후보...] } 에 모이고, 8월 1일 마감 때 상위 10골이 w.pkHist에 남는다 (발표는 시상식 날).
// 후보 한 개 = [점수, 선수 id, 이름, 구단, 상대, 날짜, 분, 종류 번호, 대회 종류, 거리(m), 좌우(m), 득점 구단 홈 여부, 대회 이름]
// 2D 재현(공·선수 움직임)은 저장하지 않고 후보 값으로 매번 같은 모양을 다시 만든다 (C.pkGeo)
(function (G) {
const C = G.TC, { R, clamp, N } = C;

const TYPES = [
  { k: 'curl', n: '중거리 감아차기', w: 30, b: 58, st: [13, 4], dist: [22, 31] },
  { k: 'rocket', n: '중거리 강슛', w: 22, b: 55, st: [3, 4], dist: [23, 34] },
  { k: 'fk', n: '직접 프리킥', w: 15, b: 56, st: [12, 13], dist: [20, 30] },
  { k: 'volley', n: '논스톱 발리', w: 14, b: 60, st: [6, 18], dist: [11, 22] },
  { k: 'solo', n: '단독 드리블 돌파', w: 9, b: 66, st: [14, 16], dist: [8, 15] },
  { k: 'chip', n: '키퍼 키를 넘긴 로빙슛', w: 8, b: 55, st: [15, 13], dist: [16, 36] },
  { k: 'bike', n: '오버헤드킥', w: 3, b: 76, st: [16, 6], dist: [8, 13] },
  { k: 'heel', n: '백힐 슛', w: 3, b: 63, st: [15, 16], dist: [5, 10] },
  { k: 'half', n: '하프라인 부근 초장거리 슛', w: .7, b: 80, st: [3, 10], dist: [46, 58] },
  { k: 'scorp', n: '스콜피온 킥', w: .8, b: 84, st: [16, 6], dist: [7, 11] }
];
C.PKT = TYPES;
const statOf = (id, i) => { const F = G.FC27; if (!/^\d+$/.test(String(id)) || !F || !F.P[+id]) return 65; const s = F.P[+id][13] || '', c = typeof s === 'string' ? s.charCodeAt(i) : s[i]; return c ? (typeof s === 'string' ? c - 32 : c) : 65; };

// 후보 고르기: 1부 리그·컵·대륙 대회의 골(페널티·자책 제외)
function hook(cx, kind, sides, ev, ga, gb) {
  const w = cx.w, d = cx.d; if (!w || d == null) return;
  const tier = id => { const c = w.clubs[id]; return c && c.lg && w.lg[c.lg] ? w.lg[c.lg].tier || 9 : 9; };
  for (const e of ev) {
    if (e[0] !== 'g') continue;
    const s = e[2], id = sides[s].key, opp = sides[1 - s].key, c = w.clubs[id]; if (!c) continue;
    if (kind === 'lg' && tier(id) > 1) continue;
    const pid = String(e[3]), x = (sides[s].sq || []).find(z => z.id === pid), ovr = x ? x.ovr : 74;
    if (pid !== 'ME' && pid[0] === '~') continue; // 이름 없는 하부 선수
    const sk = (statOf(pid, 13) + statOf(pid, 4) + statOf(pid, 14) + statOf(pid, 12)) / 4;
    if (R() > .018 + clamp((sk - 70) * .0009, -.01, .014) + clamp((ovr - 75) * .0006, -.006, .008)) continue;
    // 종류: 선수 능력치 쪽으로 기운다
    const ws = TYPES.map(t => t.w * Math.pow(clamp((statOf(pid, t.st[0]) + statOf(pid, t.st[1])) / 150, .5, 1.3), 3));
    let u = R() * ws.reduce((a, b) => a + b, 0), ti = 0; for (; ti < ws.length - 1; ti++) { u -= ws[ti]; if (u <= 0) break; }
    const T = TYPES[ti], dist = Math.round((T.dist[0] + R() * (T.dist[1] - T.dist[0])) * 10) / 10;
    const dy = Math.round(clamp(N(0, T.k === 'fk' || T.k === 'curl' ? 9 : 6), -18, 18) * 10) / 10;
    const lgN = kind === 'lg' ? (w.lg[c.lg] || {}).name : '';
    // 점수: 종류 + 거리 + 선수 + 무대 + 흔들림 (무대: 대륙 대회·컵 결승·더비·빅리그)
    const big = kind === 'cont' ? 4 : kind === 'cup' ? 1.5 : ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1'].includes(c.lg) ? 3 : 0;
    const sc = Math.round((T.b + (dist - T.dist[0]) / Math.max(1, T.dist[1] - T.dist[0]) * 8 + (ovr - 75) * .25 + big + (C.derbyOf && C.derbyOf(id, opp) ? 2.5 : 0) + N(0, 6)) * 10) / 10;
    const P = w.pusk = w.pusk && w.pusk.y === w.year ? w.pusk : { y: w.year, c: [] };
    const nm = pid === 'ME' ? 'ME' : (x && x.n) || pid;
    P.c.push([sc, pid, nm, id, opp, d, e[1], ti, kind, dist, dy, s === 0 ? 1 : 0, lgN || '']);
    if (P.c.length > 120) { P.c.sort((a, b) => b[0] - a[0]); P.c.length = 90; }
  }
}
C.pkHook = hook;
// 마감 (8월 1일 rollover): 상위 10골 → w.pkHist. 최종 순위는 팬 투표처럼 점수에 약간의 흔들림
C.pkClose = function (S) {
  const w = S.w, P = w.pusk; if (!P || !P.c.length) { w.pusk = { y: w.year + 1, c: [] }; return; }
  const top = P.c.map(x => [x[0] + N(0, 2.5), x]).sort((a, b) => b[0] - a[0]).slice(0, 10).map(z => z[1]);
  (w.pkHist = w.pkHist || []).push({ y: w.year + 1, top });
  if (w.pkHist.length > 60) w.pkHist.shift();
  w.pusk = { y: w.year + 1, c: [] };
};
C.pkName = (S, x) => x[1] === 'ME' ? (S.p ? S.p.name : '나') : (C.MD.nameOf ? C.MD.nameOf(x[1]) : null) || x[2] || x[1];
// 이 경기 골이 후보면 경기 화면 슈팅 위치를 그 골에 맞춘다: [{ s, p, m, dx, dy, k }]
C.pkSpec = (w, d, a, b) => {
  if (d == null) return null; const out = [];
  const scan = L => { for (const x of L || []) if (x[5] === d && ((x[3] === a && x[4] === b) || (x[3] === b && x[4] === a))) out.push({ s: x[3] === a ? 0 : 1, p: x[1], m: x[6], dx: x[9], dy: x[10], k: TYPES[x[7]].k }); };
  scan(w.pusk && w.pusk.c); for (const H of w.pkHist || []) scan(H.top);
  return out.length ? out : null;
};

// ---------- 2D 재현 ----------
// 좌표: 미터. x = 좌우(-34~34), y = 상대 골라인에서 거리(0 = 골라인, 위로 공격). 시간 0~1
// 반환: { ball: [[t,x,y,h]], me: [[t,x,y]], mates: [[[t,x,y]]], defs: [[[t,x,y]]], gk: [[t,x,y]], end: {x, h} }
C.pkGeo = function (x) {
  const r = C.seeded('pk|' + x[5] + '|' + x[1] + '|' + x[6]), T = TYPES[x[7]], k = T.k, dist = x[9];
  const rr = (a, b) => a + r() * (b - a);
  const sx = clamp(x[10], -20, 20), sy = Math.sqrt(Math.max(1, dist * dist - sx * sx));
  const tx = (r() < .5 ? -1 : 1) * rr(1.6, 3.4), th = k === 'chip' || k === 'half' ? rr(.4, 1.6) : k === 'rocket' ? rr(.6, 2.2) : rr(1.4, 2.35); // 골문 안 도착 지점 (골문 7.32 × 2.44)
  const shotT = k === 'solo' ? .68 : k === 'fk' ? .3 : k === 'volley' || k === 'bike' || k === 'heel' || k === 'scorp' ? .5 : .42;
  const me = [], ball = [], defs = [], mates = [], gk = [];
  // 슈팅 전: 종류마다 다른 준비 동작
  let start;
  if (k === 'solo') {
    // 단독 돌파: 40~55m 뒤에서 출발, 수비 3~5명을 지그재그로 제친다
    const n = 3 + Math.floor(r() * 3), y0 = rr(40, 56), x0 = clamp(sx + rr(-14, 14), -26, 26);
    const pts = [[0, x0, y0]]; for (let i = 1; i <= n; i++) { const f = i / (n + 1); pts.push([f * shotT, x0 + (sx - x0) * f + (i % 2 ? 1 : -1) * rr(2.5, 5), y0 + (sy - y0) * f]); }
    pts.push([shotT, sx, sy]); start = pts;
    for (let i = 1; i <= n; i++) { const p = pts[i]; defs.push([[0, p[1] + rr(-2, 2), p[2] - rr(2, 4)], [p[0], p[1] + (i % 2 ? -1.5 : 1.5), p[2] - .6], [Math.min(1, p[0] + .2), p[1] + (i % 2 ? -3 : 3), p[2] + 1.5], [1, p[1] + (i % 2 ? -3.5 : 3.5), p[2] + 2.5]]); }
  } else if (k === 'fk') {
    start = [[0, sx + rr(-1, 1), sy + 3.2], [shotT * .6, sx + rr(-.5, .5), sy + 1.2], [shotT, sx, sy]];
    // 수비벽 9.15m
    const wl = Math.hypot(sx, sy), ux = -sx / wl, uy = -sy / wl, wx = sx + ux * 9.15, wy = sy + uy * 9.15, n = dist < 25 ? 5 : 4;
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * .62, px = wx - uy * o, py = wy + ux * o; defs.push([[0, px, py], [shotT, px, py], [shotT + .08, px, py], [1, px + rr(-.6, .6), py - 1]]); }
  } else if (k === 'volley' || k === 'bike' || k === 'heel' || k === 'scorp') {
    // 측면 크로스 → 공중에서 바로 마무리
    const cxs = (sx >= 0 ? -1 : 1) * rr(22, 30), cy = rr(6, 20);
    mates.push([[0, cxs, cy + 6], [shotT * .35, cxs, cy], [1, cxs + (cxs > 0 ? -3 : 3), cy - 2]]);
    start = [[0, sx + rr(-3, 3), sy + rr(5, 9)], [shotT, sx, sy]];
    ball.push([0, cxs + (cxs > 0 ? -1 : 1), cy + 6, 0], [shotT * .35, cxs, cy, 0]);
    defs.push([[0, sx + rr(-2, 2), sy - rr(1, 3)], [shotT, sx + rr(-1.4, 1.4), sy - .8], [1, sx + rr(-2, 2), sy - .5]]);
    if (r() < .7) defs.push([[0, sx + rr(2, 5), sy + rr(-2, 2)], [shotT, sx + rr(1, 2.5), sy + .3], [1, sx + rr(1, 3), sy]]);
  } else {
    // 중거리·칩·초장거리: 공을 받아 한두 번 치고 나와 때린다
    const y0 = sy + rr(4, 10), x0 = sx + rr(-6, 6);
    mates.push([[0, x0 + rr(-12, 12), y0 + rr(8, 16)], [shotT * .25, x0 + rr(-12, 12), y0 + rr(8, 14)], [1, x0 + rr(-10, 10), y0 + rr(4, 10)]]);
    start = [[0, x0, y0], [shotT * .55, (x0 + sx) / 2, (y0 + sy) / 2], [shotT, sx, sy]];
    const n = k === 'half' ? 1 : 2; for (let i = 0; i < n; i++) { const px = sx + rr(-6, 6), py = sy - rr(3, 8); defs.push([[0, px + rr(-2, 2), py - 3], [shotT, px, py], [1, px + rr(-1, 1), py - 1]]); }
  }
  // 공: 슈팅 순간까지는 선수 발밑, 이후 골문으로
  if (!ball.length) for (const p of start) ball.push([p[0], p[1] + .4, p[2] - .4, 0]);
  else ball.push([shotT, sx, sy, k === 'bike' || k === 'scorp' ? 1.9 : 1]);
  for (const p of start) me.push(p);
  me.push([1, sx + rr(-1.2, 1.2), sy - rr(1, 3)]);
  // 슛 궤적 (곡선: 감아차기는 옆으로 휘고, 칩·초장거리는 높이 솟는다)
  const bend = k === 'curl' || k === 'fk' ? (tx > sx ? -1 : 1) * rr(2.5, 5) : k === 'rocket' ? rr(-.6, .6) : rr(-1.2, 1.2);
  const apex = k === 'chip' ? rr(5, 7.5) : k === 'half' ? rr(10, 16) : k === 'fk' ? rr(2.8, 3.6) : k === 'curl' ? rr(2.4, 3.6) : 1.6;
  const shotLen = k === 'half' ? .34 : k === 'chip' ? .3 : .22, t1 = Math.min(.97, shotT + shotLen);
  for (let i = 1; i <= 12; i++) { const f = i / 12, bx = sx + (tx - sx) * f + bend * Math.sin(Math.PI * f), by = sy * (1 - f), bh = (k === 'bike' || k === 'scorp' ? 1.9 : 1) * (1 - f) + th * f + (apex - Math.max(th, 1)) * Math.sin(Math.PI * f) * (k === 'rocket' ? .3 : 1);
    ball.push([shotT + (t1 - shotT) * f, bx, by, Math.max(0, bh)]); }
  ball.push([1, tx * .9, -1.2, Math.max(.2, th - .8)]); // 그물 출렁
  // 골키퍼: 칩·초장거리는 골문을 비우고 나와 있다
  const gy0 = k === 'chip' ? rr(7, 11) : k === 'half' ? rr(13, 20) : rr(1, 2.2), gx0 = sx * .08;
  gk.push([0, gx0, gy0], [shotT, gx0 + (sx > 0 ? .3 : -.3), gy0], [t1 - .05, gx0 + (tx - gx0) * .55, Math.max(.4, gy0 * .8)], [1, gx0 + (tx - gx0) * .6, Math.max(.4, gy0 * .7)]);
  return { ball, me, mates, defs, gk, end: { x: tx, h: th }, shotT, t1, name: T.n };
};
// 시간 t 의 위치 (선형 보간)
C.pkAt = (track, t) => { if (!track.length) return null; if (t <= track[0][0]) return track[0]; for (let i = 1; i < track.length; i++) if (t <= track[i][0]) { const a = track[i - 1], b = track[i], f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return a.map((v, j) => j === 0 ? t : v + (b[j] - v) * f); } return track[track.length - 1]; };
})(typeof window !== 'undefined' ? window : globalThis);
