// Road to Legend — 국가대표 랭킹 (FIFA/코카콜라 남자 랭킹 'SUM' 방식)
// 시작 점수: 2026-10-07 FIFA 발표 점수 (data_rank.js). 경기마다 P = P이전 + I × (W − We)
//   We = 1 / (10^(−dr/600) + 1), dr = 두 팀 점수 차 (홈 이점 없음)
//   W: 승 1 · 무 0.5 · 패 0 · 승부차기 승 0.75 · 승부차기 패 0.5
//   I(중요도): 친선 10 · 네이션스리그 리그 단계 15 · 네이션스리그 토너먼트 25 · 대륙 대회 본선 8강 전 35 · 8강부터 40 · 월드컵 본선 8강 전 50 · 8강부터 60
//   본선 토너먼트(녹아웃)에서 진 팀은 점수를 잃지 않는다 (FIFA 규정)
// 발표: 국제 경기가 있었던 달은 다음 달 첫 수요일 무렵에 순위를 매겨 기록한다 (w.rank.pub)
(function (G) {
const C = G.TC;
C.rankInit = (w, force) => {
  if (w.rank && !force) return w.rank;
  const F = G.FC27 || {}, p = {};
  for (const t of String(F.FIFA_PTS || '').split(' ')) { const [c, v] = t.split(':'); if (c) p[c] = +v; }
  // 목록에 없는 나라: 국가 전력으로 어림
  try { const pools = C.nationPools(w); for (const n in pools) if (p[n] == null) p[n] = Math.round((900 + (C.nationStrength(pools[n]) - 55) * 32) * 100) / 100; } catch (e) { /* 무시 */ }
  const list = Object.entries(p).sort((a, b) => b[1] - a[1]);
  w.rank = { p, pub: [{ d: w.cal ? w.cal.d : 0, src: 'FIFA ' + (F.FIFA_DATE || ''), r: list.map(x => x[0]), v: list.map(x => Math.round(x[1] * 100) / 100) }], n: 0, top: [[w.cal ? w.cal.d : 0, list[0] && list[0][0]]] };
  return w.rank;
};
const IMP = { AM: 10, UNL: 15, UNLKO: 25, CONT: 35, CONTQ: 40, WC: 50, WCQ: 60 };
C.rankImp = (comp, stage) => {
  const late = /8강|준결승|결승|3·4위/.test(stage || '');
  if (comp === 'AM') return IMP.AM;
  if (comp === 'UNL') return /강|결승|3·4위|플레이오프/.test(stage || '') ? IMP.UNLKO : IMP.UNL;
  if (comp === 'WC') return late ? IMP.WCQ : IMP.WC;
  return late ? IMP.CONTQ : IMP.CONT;
};
// 경기 반영. pw = 승부차기 승자(코드), ko = 본선 토너먼트 경기
C.rankMatch = (w, a, b, ga, gb, I, pw, ko) => {
  const R = C.rankInit(w), P = R.p; if (P[a] == null || P[b] == null) return;
  const dr = P[a] - P[b], We = 1 / (Math.pow(10, -dr / 600) + 1);
  let Wa = ga > gb ? 1 : ga < gb ? 0 : .5;
  if (ga === gb && pw) Wa = pw === a ? .75 : .5;
  const Wb = ga === gb && pw ? (pw === b ? .75 : .5) : 1 - Wa;
  let da = I * (Wa - We), db = I * (Wb - (1 - We));
  if (ko) { if (da < 0) da = 0; if (db < 0) db = 0; }
  P[a] = Math.round((P[a] + da) * 100) / 100; P[b] = Math.round((P[b] + db) * 100) / 100; R.n++;
  R.dirty = 1;
};
// 발표: 경기가 있었으면 매달 첫 주에 순위 기록 (최근 40회만, 1위 기록은 계속)
C.rankDaily = (S, d) => {
  const w = S.w, R = w.rank; if (!R || !R.dirty) return;
  const [y, m, dd] = C.ymd(d); if (dd !== 7) return;
  R.dirty = 0;
  const prev = R.pub[R.pub.length - 1], list = Object.entries(R.p).sort((a, b) => b[1] - a[1]);
  R.pub.push({ d, r: list.map(x => x[0]), v: list.map(x => x[1]) }); if (R.pub.length > 40) R.pub.splice(1, 1);
  const lead = list[0][0];
  if (!R.top.length || R.top[R.top.length - 1][1] !== lead) R.top.push([d, lead]);
  if (C.wn) { const was = prev ? prev.r.indexOf(lead) + 1 : 0, up = list.slice(0, 50).map(([c], i) => [c, (prev ? prev.r.indexOf(c) : i) - i]).sort((a, b) => b[1] - a[1])[0];
    C.wn.push(S, { d, gl: 1, c: 'record', imp: was !== 1 ? 2 : 1, h: `FIFA 랭킹 발표: ${C.natName(lead)} ${was === 1 ? '1위 유지' : '1위 등극'}`, s: `${list.slice(0, 5).map(([c, v], i) => `${i + 1}. ${C.natName(c)} ${v.toFixed(2)}`).join(' · ')}${up && up[1] > 0 ? ` · 50위 안 최고 상승 ${C.natName(up[0])} (+${up[1]})` : ''}` }); }
};
C.rankOf = (w, code) => { const R = w.rank; if (!R) return null; const pub = R.pub[R.pub.length - 1], i = pub.r.indexOf(code); return i >= 0 ? { rank: i + 1, pts: pub.v[i], live: R.p[code] } : null; };
})(typeof window !== 'undefined' ? window : globalThis);
