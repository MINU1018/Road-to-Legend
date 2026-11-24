// Road to Legend — 대회 기록 (리그·컵·대륙 대회·국가대표 대회, 게임 시작 이후)
// 경기마다 w.lrec[대회 키]를 갱신한다. 대회 키: 'L:리그ID', 'C:국가:cup|lcup', 'K:대륙대회', 'I:국제대회', 'A:UNL|AM'
//   n 경기 수, g 골 수, bw 최다 점수 차 [차, 홈골, 원정골, 홈, 원정, 날짜, 시즌] 상위 3, hs 최다 골 경기 상위 3, fg 최단 시간 골 [분, 선수, 날짜, 홈, 원정]
//   pl[선수] = [출전, 골, 도움, 해트트릭] 통산 (대회당 상위 몇 백 명만 유지), cs = { sl, m: {선수: [출전, 골, 도움]} } 진행 중 시즌
//   sG / sA 단일 시즌 최다 골·도움 [수, 선수, 시즌] 상위 5
// 팀 기록(최다 우승·승점·득점 등)은 저장하지 않고 화면에서 w.hist·w.arch로 계산한다
(function (G) {
const C = G.TC;
const PLK = 100; // 대회당 통산 기록 선수 수 (출전·골·도움 상위)
const BIGN = new Set('ENG ESP ITA GER FRA POR NED BEL TUR SCO BRA ARG USA MEX JPN KOR KSA AUS'.split(' '));
const top = (L, x, n, cmp) => { L.push(x); L.sort(cmp); if (L.length > n) L.length = n; };
const byMargin = (a, b) => b[0] - a[0] || (b[1] + b[2]) - (a[1] + a[2]) || a[5] - b[5];
const byNum = (a, b) => b[0] - a[0];
function roll(R, sl) {
  const cs = R.cs; if (!cs || cs.sl === sl) return;
  const ent = Object.entries(cs.m);
  for (const [pid, v] of ent.sort((a, b) => b[1][1] - a[1][1]).slice(0, 5)) if (v[1] > 0) top(R.sG, [v[1], pid, cs.sl], 5, byNum);
  for (const [pid, v] of ent.sort((a, b) => b[1][2] - a[1][2]).slice(0, 5)) if (v[2] > 0) top(R.sA, [v[2], pid, cs.sl], 5, byNum);
  R.cs = { sl, m: {} };
  prune(R);
}
// 통산 기록 가지치기: 출전·골·도움 상위만 남긴다
function prune(R) {
  const pl = Object.entries(R.pl);
  if (pl.length > PLK * 1.7) { const keep = new Set(); for (const i of [0, 1, 2]) pl.slice().sort((a, b) => b[1][i] - a[1][i]).slice(0, PLK).forEach(x => keep.add(x[0])); for (const [k] of pl) if (!keep.has(k)) delete R.pl[k]; }
  const cs = Object.entries(R.cs.m); if (cs.length > 120) { const k2 = new Set(); for (const i of [1, 2]) cs.slice().sort((a, b) => b[1][i] - a[1][i]).slice(0, 50).forEach(x => k2.add(x[0])); for (const [k] of cs) if (!k2.has(k)) delete R.cs.m[k]; }
}
C.lrecHook = function (cx, sides, P, ev, ga, gb) {
  const w = cx.w, ck = cx.ck; if (!w || !ck) return;
  const L = w.lrec = w.lrec || {};
  const R = L[ck] = L[ck] || { n: 0, g: 0, bw: [], hs: [], fg: null, pl: {}, cs: { sl: cx.sl, m: {} }, sG: [], sA: [] };
  if (R.cs.sl !== cx.sl) roll(R, cx.sl);
  const a = sides[0].key, b = sides[1].key, d = cx.d;
  R.n++; R.g += ga + gb;
  if (ga !== gb) top(R.bw, [Math.abs(ga - gb), ga, gb, a, b, d, cx.sl], 3, byMargin);
  if (ga + gb >= 5) top(R.hs, [ga + gb, ga, gb, a, b, d, cx.sl], 3, (x, y) => y[0] - x[0] || x[5] - y[5]);
  for (const e of ev) if ((e[0] === 'g' || e[0] === 'p') && (!R.fg || e[1] < R.fg[0]) && String(e[3])[0] !== '~') R.fg = [e[1], String(e[3]), d, a, b];
  // 선수 통산 기록: 주요 나라 1부 리그·국내 컵, 대륙 대회, 국가대표 대회만 (저장 크기)
  const nat = ck[0] === 'L' ? ((w.lg[ck.slice(2)] || {}).nation) : ck[0] === 'C' ? ck.split(':')[1] : null;
  if ((ck[0] === 'L' && (cx.tier > 1 || !BIGN.has(nat))) || (ck[0] === 'C' && !BIGN.has(nat))) return;
  if (R.n % 8 === 0) prune(R);
  for (let s = 0; s < 2; s++) for (const p of P[s]) {
    const id = String(p.id); if (id[0] === '~') continue;
    const v = R.pl[id] || (R.pl[id] = [0, 0, 0, 0]); v[0]++; v[1] += p.g || 0; v[2] += p.a || 0; if ((p.g || 0) >= 3) v[3]++;
    if (p.g || p.a) { const c = R.cs.m[id] || (R.cs.m[id] = [0, 0, 0]); c[0]++; c[1] += p.g || 0; c[2] += p.a || 0; }
  }
};
// 화면용: 진행 중 시즌까지 넣은 단일 시즌 기록
C.lrecSeason = (R, k) => { const L = (k === 'a' ? R.sA : R.sG).slice(); if (R.cs) for (const [pid, v] of Object.entries(R.cs.m)) { const n = k === 'a' ? v[2] : v[1]; if (n > 0) L.push([n, pid, R.cs.sl, 1]); } return L.sort(byNum).slice(0, 5); };
})(typeof window !== 'undefined' ? window : globalThis);
