// Road to Legend — 국내 컵 전 라운드: 그 나라 모든 리그 구단이 참가하고, 하부 리그 구단은 앞 라운드부터, 상위 리그 구단은 뒤 라운드부터 들어온다
(function (G) {
'use strict';
const C = G.TC;
const { R, shuffle } = C;
// 라운드 날짜 (월, 일): 뒤에서부터 필요한 만큼 쓴다. 국내 컵은 수요일, 리그컵은 화요일
const DATES = {
  cup: [[8, 20], [9, 3], [9, 17], [10, 8], [10, 29], [11, 26], [1, 10], [2, 7], [3, 7], [4, 18], [5, 23]],
  lcup: [[8, 12], [8, 19], [8, 26], [9, 23], [10, 28], [12, 16], [1, 13], [2, 3], [3, 15]]
};
const MAXPRE = { cup: 5, lcup: 3 }; // 본선 전 라운드 수 상한
const MAINMAX = 64;
const mainName = n => n === 2 ? '결승' : n === 4 ? '4강' : `${n}강`;

// 대진 구조 만들기 (시즌 시작 때 한 번). 참가 순서는 리그 등급 → 전력 순
function cupBuild(w, nat, kind, name) {
  const maxTier = kind === 'lcup' ? 4 : 99;
  const tierOf = c => w.lg[c.lg].tier || 1;
  const pool = Object.values(w.clubs).filter(c => c.lg && !c.parent && w.lg[c.lg] && w.lg[c.lg].nation === nat && tierOf(c) <= maxTier); // 2군은 국내 컵에 나가지 않는다
  if (pool.length < 8) return null;
  pool.sort((a, b) => tierOf(a) - tierOf(b) || b.str - a.str);
  const ids = pool.map(c => c.id), N = ids.length;
  let M = 2; while (M * 2 <= N && M < MAINMAX) M *= 2;
  let direct = ids, rest = [];
  if (N > M) { const D = Math.max(M / 2, Math.min(M - 2, Math.round(M * .69))); direct = ids.slice(0, D); rest = ids.slice(D); }
  // 본선 전 라운드: 뒤에서부터. 각 라운드는 '앞 라운드 승자 + 새로 들어오는 구단'. 구단이 많은 나라는 앞 라운드일수록 판이 커진다
  const plan = half => {
    let need = M - direct.length, left = rest.slice(), excluded = 0;
    const back = [];
    while (left.length) {
      if (left.length <= 2 * need || back.length === MAXPRE[kind] - 1) {
        if (left.length > 2 * need) { excluded = left.length - 2 * need; left = left.slice(0, 2 * need); }
        const byes = 2 * need - left.length; // 이 라운드를 건너뛰는(부전승) 구단은 다음 라운드에 들어간다
        back.push({ ent: left.slice(byes), bye: left.slice(0, byes) });
        break;
      }
      const y = half ? Math.ceil(need / 2) : need;
      back.push({ ent: left.slice(0, y), bye: [] });
      left = left.slice(y); need = 2 * need - y;
    }
    return { back, excluded };
  };
  let pl = plan(false); if (pl.excluded) pl = plan(true);
  const back = pl.back, excluded = pl.excluded;
  const pre = back.reverse();
  const rounds = pre.map((r, i) => ({ n: `${i + 1}라운드`, ent: r.ent.slice() }));
  for (let i = 0; i < pre.length; i++) if (pre[i].bye.length) (i + 1 < pre.length ? rounds[i + 1].ent : direct).push(...pre[i].bye);
  for (let n = M, first = true; n >= 2; n /= 2, first = false) rounds.push({ n: mainName(n), ent: first ? direct.slice() : [] });
  const dts = DATES[kind].slice(-rounds.length);
  rounds.forEach((r, i) => { r.d = dts[i]; });
  const tr = {}; for (const c of pool) tr[c.id] = tierOf(c);
  return { nat, kind, n: name, rounds, alive: [], ri: 0, res: [], N, ex: excluded, cur: null, tr, draws: [] };
}
// 이 구단이 들어오는 라운드 (없으면 -1)
function cupEntry(st, id) { return st.rounds.findIndex(r => r.ent.includes(id)); }
// 이번 라운드 추첨
// 잉글랜드식 오픈 추첨: 한 포트에서 공을 뽑아 먼저 뽑힌 구단이 홈.
// 독일·스페인·프랑스 등: 상·하부 리그가 섞인 라운드는 두 포트(상위 리그 / 하위 리그)로 나눠 한 포트에서 하나씩, 하위 리그 구단이 홈
const TWOPOT = new Set(['GER', 'ESP', 'FRA', 'POR', 'NED', 'BEL', 'AUT', 'SUI', 'TUR', 'GRE', 'DEN', 'SWE', 'NOR', 'POL', 'CZE', 'CRO', 'SRB', 'UKR', 'RUS', 'ROU', 'HUN']);
// 코파 이탈리아: 추첨 없이 시드 대진표 (상위 시드가 하위 시드와, 상위 시드 홈). 스코틀랜드·잉글랜드·한국 등은 오픈 추첨
const SEEDED = new Set(['ITA']);
function cupDraw(st, d) {
  if (st.cur) return st.cur;
  const rd = st.rounds[st.ri]; if (!rd) return null;
  const tr = st.tr || {}, T = id => tr[id] || 9;
  const field = shuffle(st.alive.concat(rd.ent));
  const tiers = new Set(field.map(T));
  // 포트 분리는 1부 리그 구단이 처음 들어오는 라운드 (DFB 포칼 1라운드처럼). 그 뒤는 오픈 추첨 + 하위 리그 홈
  const two = TWOPOT.has(st.nat) && tiers.size >= 2 && rd.n !== '결승' && rd.ent.some(id => T(id) === 1);
  const pairs = [], seq = []; let odd = null, pots;
  if (SEEDED.has(st.nat) && st.kind === 'cup') {
    const sc = id => T(id) * 100 - ((w => w && w.clubs[id] ? w.clubs[id].str || 60 : 60)(C._w));
    const srt = field.slice().sort((a, b) => sc(a) - sc(b)), n2 = Math.floor(srt.length / 2);
    if (srt.length % 2) odd = srt.shift();
    for (let i = 0; i < Math.floor(srt.length / 2); i++) { const a = srt[i], b = srt[srt.length - 1 - i]; seq.push([a, b]); pairs.push([a, b]); }
    st.cur = { pairs, odd, mode: 'seed', pots: [srt.slice()], seq, ri: st.ri, n: rd.n, d: d != null ? d : null };
    return st.cur;
  }
  if (two) {
    const srt = field.slice().sort((a, b) => T(a) - T(b));
    const half = Math.floor(srt.length / 2);
    // 상위 포트: 리그 등급이 높은 절반 (경계 등급은 무작위), 하위 포트: 나머지
    const cut = T(srt[half - 1]);
    const upper = shuffle(srt.filter(x => T(x) < cut)), mid = shuffle(srt.filter(x => T(x) === cut)), lower = shuffle(srt.filter(x => T(x) > cut));
    const p1 = upper.concat(mid).slice(0, half), rest = upper.concat(mid).slice(half).concat(lower);
    const p2 = shuffle(rest).slice(0, half); if (rest.length > half) odd = rest.find(x => !p2.includes(x));
    pots = [p1.slice(), p2.slice()];
    const a1 = shuffle(p1.slice()), a2 = shuffle(p2.slice());
    for (let i = 0; i < half; i++) { const x = a1[i], y = a2[i]; seq.push([x, y]); pairs.push(T(y) > T(x) ? [y, x] : R() < .5 ? [x, y] : [y, x]); }
  } else {
    pots = [field.slice()];
    for (let i = 0; i + 1 < field.length; i += 2) { const x = field[i], y = field[i + 1]; seq.push([x, y]); pairs.push(TWOPOT.has(st.nat) && T(y) > T(x) ? [y, x] : [x, y]); }
    odd = field.length % 2 ? field[field.length - 1] : null;
  }
  st.cur = { pairs, odd, mode: two ? 'two' : 'open', pots, seq, ri: st.ri, n: rd.n, d: d != null ? d : null };
  if (st.draws) { st.draws.push(st.cur); if (st.draws.length > 12) st.draws.shift(); }
  return st.cur;
}
// 추첨된 라운드 결과 정하기. u: 사용자 경기 { a, b, ga, gb, win, ui }
function cupResolve(w, st, u) {
  const cur = cupDraw(st); if (!cur) return;
  const rd = st.rounds[st.ri], fin = st.ri === st.rounds.length - 1;
  const ms = [], next = [];
  for (const [a, b] of cur.pairs) {
    if (u && u.a === a && u.b === b) { ms.push([a, b, u.ga, u.gb, u.ga === u.gb ? u.win : 0, u.ui]); next.push(u.win); continue; }
    const sa = C.mstr ? C.mstr(w, a) : (w.clubs[a] || {}).str || 60, sb = C.mstr ? C.mstr(w, b) : (w.clubs[b] || {}).str || 60;
    const [ga, gb] = C.quickMatch(sa, sb, fin ? 0 : 1);
    const win = C.koWinner(sa, sb, ga, gb) === 0 ? a : b;
    ms.push([a, b, ga, gb, ga === gb ? win : 0]); next.push(win);
  }
  if (cur.odd) next.push(cur.odd);
  st.res.push({ n: rd.n, m: ms });
  st.alive = next; st.ri++; st.cur = null;
}
// 남은 라운드 모두
function cupFinish(w, st) { while (st.ri < st.rounds.length) cupResolve(w, st, null); }
// 보관용 요약 { n, k, r: [{ n, m: [[홈, 원정, 홈골, 원정골, 승부차기 승자]] }], w, ru, N }
function cupSummary(st) {
  const last = st.res[st.res.length - 1]; if (!last) return null;
  const f = last.m[0], win = st.alive[0], ru = f[0] === win ? f[1] : f[0];
  return { n: st.n, k: st.kind, r: st.res.map(rd => ({ n: rd.n, m: rd.m.map(m => m.slice(0, 5)) })), w: win, ru, N: st.N };
}
Object.assign(C, { cupBuild, cupEntry, cupDraw, cupResolve, cupFinish, cupSummary, CUPDATES: DATES });
})(typeof window !== 'undefined' ? window : globalThis);
