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
  const pool = Object.values(w.clubs).filter(c => c.lg && w.lg[c.lg] && w.lg[c.lg].nation === nat && tierOf(c) <= maxTier);
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
  return { nat, kind, n: name, rounds, alive: [], ri: 0, res: [], N, ex: excluded, cur: null };
}
// 이 구단이 들어오는 라운드 (없으면 -1)
function cupEntry(st, id) { return st.rounds.findIndex(r => r.ent.includes(id)); }
// 이번 라운드 추첨 (무작위 대진, 먼저 뽑힌 구단이 홈)
function cupDraw(st) {
  if (st.cur) return st.cur;
  const rd = st.rounds[st.ri]; if (!rd) return null;
  const field = shuffle(st.alive.concat(rd.ent));
  const pairs = [];
  for (let i = 0; i + 1 < field.length; i += 2) pairs.push([field[i], field[i + 1]]);
  st.cur = { pairs, odd: field.length % 2 ? field[field.length - 1] : null };
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
