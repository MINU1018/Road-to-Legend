// Road to Legend — 세계 구단 랭킹 (종합 지수)
// 현실의 구단 순위는 목적마다 기준이 다르다: Opta 파워랭킹·ClubElo(경기 결과 기반 Elo), UEFA 계수(최근 5시즌 대륙 대회 성적),
// Deloitte Money League(매출), Brand Finance·Forbes(브랜드·가치), 역대 우승(헤리티지). 여기서는 이 다섯 가지를 섞은 '종합 지수'로 순위를 낸다.
//   경기력 40% — 모든 경기 결과로 오르내리는 Elo (시작값 = Opta 파워 지수 + 전력)
//   대륙 성적 12% — 최근 5시즌 대륙 대회 승점(승 2·무 1, 우승 보너스), 연맹별 보정
//   헤리티지 20% — 역대 우승(리그·대륙·컵)을 리그 수준과 시대 보정으로 환산한 뒤 제곱근 (몇십 년 전 우승의 무게를 줄임) + 게임 속 우승
//   팬·브랜드 16% — 시작값(팔로워·관중 규모 근사), 우승·승격·강등과 성적으로 서서히 변함
//   재정 12% — 구단 매출 (로그 척도)
(function (G) {
'use strict';
const C = G.TC, { clamp } = C;
const DATA = () => (G.FC27 && G.FC27.CRANK) || {};
// 리그 수준(헤리티지 환산)·연맹 보정
const LF = { ENG: 1, ESP: 1, ITA: 1, GER: 1, FRA: .85, POR: .7, NED: .7, BRA: .7, ARG: .7, BEL: .45, TUR: .45, SCO: .4, RUS: .45, MEX: .45, URU: .45, KSA: .4, JPN: .4, USA: .35, KOR: .35, CHI: .35, GRE: .35, AUT: .35, SUI: .35, DEN: .35, NOR: .3, SWE: .3, POL: .3, ROU: .3, CHN: .3, UKR: .35, CZE: .3, AUS: .25, IND: .2, IRL: .2 };
const CF = { UEFA: 1, CONMEBOL: .75, CONCACAF: .4, AFC: .4, CAF: .4, OFC: .2 };
const lfOf = n => LF[n] != null ? LF[n] : .25;
const confOf = c => (C.confOf && C.confOf(c.nat)) || 'UEFA';
const tierOf = (w, c) => { const L = c.lg && w.lg[c.lg]; return L ? L.tier || 1 : 9; };
const strElo = c => 1500 + ((c.str || 60) - 70) * 28;
const W = { p: .40, co: .12, he: .20, fa: .16, fi: .12 };
C.CRW = W;
// 랭킹 대상: 실제 리그가 돌아가는 구단 전부 + 리그 밖(X) 구단 중 전력 70 이상 또는 시작값이 있는 구단
function member(w, c) { if (!c || c.parent) return false; if (c.id[0] !== 'X') return !!c.lg; return (c.str || 0) >= 70 || !!DATA()[c.id]; }
C.crInit = function (w, force) {
  if (w.cr && !force) return w.cr;
  const D = DATA(), R = w.cr = { v: 1, e: {}, h: {}, f: {}, co: {}, pub: [], ser: {}, top: [] };
  for (const id in w.clubs) {
    const c = w.clubs[id]; if (!member(w, c)) continue;
    const d = D[id], n = c.nat, lf = lfOf(n), cf = CF[confOf(c)] || .3, t = tierOf(w, c);
    const se = strElo(c);
    R.e[id] = Math.round(d && d[0] ? se * .5 + (2000 - (100 - d[0]) * 25) * .5 : se);
    // 헤리티지 원점수 (시대 보정 적용)
    R.h[id] = d ? Math.round((d[1] * 3 * lf + d[2] * 12 * cf + d[3] * lf + d[4] * 4 * cf) * (d[7] != null ? d[7] : 1) * 10) / 10 : Math.round(Math.max(0, ((c.pres || c.str || 60) - 72) * .45 * lf) * 10) / 10;
    // 팬·브랜드
    R.f[id] = d ? d[5] : Math.round(clamp(((c.pres || c.str || 60) - 58) * .9 * (lf * .6 + .4) + (t === 1 ? 5 : t === 2 ? 2 : 0), 2, 35));
    // 최근 5시즌 대륙 성적 (시작값은 5시즌에 고르게)
    const co0 = d ? d[6] : (t === 1 && c.id[0] !== 'X' ? Math.max(0, ((c.str || 60) - 76) * 2.2) : 0);
    R.co[id] = [0, 1, 2, 3, 4].map(() => Math.round(co0 / 5 * 10) / 10);
  }
  R.d = w.cal ? w.cal.d : 0;
  C.crPublish(w, R.d, true);
  return R;
};
// ---------- 경기 결과 → Elo ----------
C.crMatch = function (w, a, b, ga, gb, ck, neutral) {
  const R = w.cr; if (!R) return; const ea = R.e[a], eb = R.e[b]; if (ea == null || eb == null) return;
  const k0 = ck ? ({ L: 20, C: 16, K: 28, A: 5 }[ck[0]] || 12) : 12;
  const dr = ea - eb + (neutral ? 0 : 55), E = 1 / (1 + Math.pow(10, -dr / 400)), S = ga > gb ? 1 : ga < gb ? 0 : .5, gd = Math.abs(ga - gb);
  const Gm = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8, dv = k0 * Gm * (S - E);
  R.e[a] = Math.round((ea + dv) * 10) / 10; R.e[b] = Math.round((eb - dv) * 10) / 10;
  // 대륙 대회 승점
  if (ck && ck[0] === 'K') { const k = ck.slice(2), tf = C.COMPS && C.COMPS[k] ? ({ 1: 1, 2: .7, 3: .45 }[C.COMPS[k].tier] || .5) : .5;
    const add = (id, p) => { const q = R.co[id]; if (q) q[4] = Math.round((q[4] + p * tf) * 10) / 10; };
    add(a, S === 1 ? 2 : S === .5 ? 1 : 0); add(b, S === 0 ? 2 : S === .5 ? 1 : 0); }
};
// 우승 → 대륙 보너스 + 팬
C.crTrophy = function (w, id, kind, k) {
  const R = w.cr; if (!R || R.e[id] == null) return;
  if (kind === 'cont') { const t = C.COMPS && C.COMPS[k] ? C.COMPS[k].tier : 2; R.co[id][4] += t === 1 ? 8 : 4; R.f[id] = clamp(R.f[id] + (t === 1 ? 2.5 : 1), 0, 100); }
  else if (kind === 'lg') R.f[id] = clamp(R.f[id] + 1.2, 0, 100);
  else R.f[id] = clamp(R.f[id] + .5, 0, 100);
};
// 시즌 교체: 5시즌 창 이동, Elo 일부 전력 회귀, 팬 변화(승격·강등·평균 회귀)
C.crSeason = function (w) {
  const R = w.cr; if (!R) return;
  for (const id in R.e) {
    const c = w.clubs[id]; if (!c) { delete R.e[id]; continue; }
    R.e[id] = Math.round((R.e[id] * .85 + strElo(c) * .15) * 10) / 10;
    const q = R.co[id]; q.shift(); q.push(0);
    const t = tierOf(w, c), pt = R.tl && R.tl[id];
    if (pt != null && t < pt) R.f[id] = clamp(R.f[id] + 1.5, 0, 100);
    if (pt != null && t > pt) R.f[id] = clamp(R.f[id] - 1.8, 0, 100);
    (R.tl = R.tl || {})[id] = t;
  }
};
// ---------- 지수 계산 ----------
function heritageOf(w, R, id) {
  let h = R.h[id] || 0; const c = w.clubs[id], lf = lfOf(c.nat), cf = CF[confOf(c)] || .3;
  // 게임 속 우승 (전부 반영)
  const H = w.hist || {};
  for (const k in H.lg || {}) { const L = w.lg[k]; const tw = L ? ({ 1: 3, 2: .8, 3: .3, 4: .15 }[L.tier] || .1) : 0; for (const x of H.lg[k]) if (x.c === id) h += tw * lf; }
  for (const k in H.cup || {}) for (const x of H.cup[k]) if (x.c === id) h += lf;
  for (const k in H.cont || {}) { const t = C.COMPS && C.COMPS[k] ? C.COMPS[k].tier : 2; for (const x of H.cont[k]) if (x.c === id) h += (t === 1 ? 12 : t === 2 ? 4 : 2.5) * cf; }
  return h;
}
C.crCalc = function (w) {
  const R = w.cr || C.crInit(w); const rows = [];
  let hMax = 1, coMax = 1;
  const tmp = [];
  for (const id in R.e) { const c = w.clubs[id]; if (!c) continue; const he = heritageOf(w, R, id), cf = CF[confOf(c)] || .3, co = R.co[id].reduce((a, x) => a + x, 0) * cf; tmp.push([id, c, he, co]); if (he > hMax) hMax = he; if (co > coMax) coMax = co; }
  for (const [id, c, he, co] of tmp) {
    const p = clamp((R.e[id] - 1000) / 10, 0, 100), H = 100 * Math.sqrt(he / hMax), CO = 100 * Math.sqrt(co / coMax), F = clamp(R.f[id], 0, 100);
    const fi = clamp(100 * Math.log(Math.max(1, (c.rev || 2e6) / 2e6)) / Math.log(400), 0, 100);
    const s = W.p * p + W.co * CO + W.he * H + W.fa * F + W.fi * fi;
    rows.push({ id, s: Math.round(s * 100) / 100, p, co: CO, he: H, fa: F, fi, elo: R.e[id] });
  }
  rows.sort((a, b) => b.s - a.s);
  return rows;
};
// 매달 1일 발표 (순위 기록은 상위 200위만 남김)
C.crPublish = function (w, d, quiet, S) {
  const R = w.cr; if (!R) return null;
  const rows = C.crCalc(w), prev = R.pub[R.pub.length - 1];
  const pub = { d, r: rows.slice(0, 400).map(x => x.id), v: rows.slice(0, 400).map(x => Math.round(x.s * 10) / 10) };
  R.pub.push(pub); if (R.pub.length > 2) R.pub.splice(0, R.pub.length - 2);
  pub.r.slice(0, 200).forEach((id, i) => { const S = R.ser[id] = R.ser[id] || []; S.push([d, i + 1]); if (S.length > 90) S.splice(0, S.length - 90); });
  if (!R.top.length || R.top[R.top.length - 1][1] !== pub.r[0]) R.top.push([d, pub.r[0]]);
  if (!quiet && S && prev && prev.r[0] !== pub.r[0] && C.wn) try { const nm = id => (w.clubs[id] || {}).name || id;
    C.wn.push(S, { d, gl: 1, c: 'record', imp: 2, h: `세계 구단 랭킹: ${nm(pub.r[0])} 1위 등극`, s: pub.r.slice(0, 5).map((id, i) => `${i + 1}. ${nm(id)} ${pub.v[i].toFixed(1)}`).join(' · ') }); } catch (e) {}
  return pub;
};
C.crDaily = function (S, d) {
  const w = S.w; if (!w.cr) C.crInit(w);
  const [, , dd] = C.ymd(d); if (dd !== 1) return;
  const last = w.cr.pub[w.cr.pub.length - 1]; if (last && last.d === d) return;
  C.crPublish(w, d, false, S);
};
C.crRankOf = function (w, id) { const R = w.cr; if (!R) return null; const p = R.pub[R.pub.length - 1]; if (!p) return null; const i = p.r.indexOf(id); return i < 0 ? null : i + 1; };
})(typeof window !== 'undefined' ? window : globalThis);
