// 터치라인 커리어 — 추가 기능: 시즌 목표, 뉴스 피드, 커리어 마일스톤
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, pick } = C;
const X = C.extras = {};

// ---------- 뉴스 ----------
C.news = function (S, text, kind, big) {
  S.news = S.news || [];
  const item = { y: S.w.year, d: S.ss ? S.ss.lastDay : null, t: text, k: kind || 'info', big: !!big, id: (S.newsId = (S.newsId || 0) + 1) };
  S.news.unshift(item);
  if (S.news.length > 80) S.news.length = 80;
  (S.newsQ = S.newsQ || []).push(item);
  return item;
};

// ---------- 마일스톤 (1군 공식 경기·국가대표 기준) ----------
const MS = {
  apps: [1, 50, 100, 200, 300, 400, 500, 600, 700, 800],
  goals: [1, 10, 50, 100, 150, 200, 250, 300, 400, 500],
  assists: [1, 50, 100, 150, 200],
  caps: [1, 25, 50, 100, 150],
  ntGoals: [1, 10, 25, 50, 75, 100],
  cs: [1, 50, 100, 200, 300]
};
const MSLABEL = { apps: n => n === 1 ? '프로 데뷔' : `통산 ${n}경기 출전`, goals: n => n === 1 ? '프로 데뷔골' : `통산 ${n}골`, assists: n => n === 1 ? '프로 첫 도움' : `통산 ${n}도움`, caps: n => n === 1 ? 'A매치 데뷔' : `A매치 ${n}경기`, ntGoals: n => n === 1 ? 'A매치 데뷔골' : `A매치 ${n}골`, cs: n => n === 1 ? '첫 클린시트' : `통산 클린시트 ${n}회` };
X.onMatch = function (S, rec) {
  if (C.ach) C.ach.fire(S, 'match', rec);
  if (!rec.played) return;
  if (!S.cnt) { const c = { apps: 0, goals: 0, assists: 0, caps: 0, ntGoals: 0, cs: 0 }; for (const h of S.hist || []) { c.apps += h.total.apps; c.goals += h.total.goals; c.assists += h.total.assists; c.cs += S.p.pos === 'GK' ? h.total.cs : 0; if (h.nt) { c.caps += h.nt.apps; c.ntGoals += h.nt.goals; } } S.cnt = c; }
  const cnt = S.cnt;
  const st = rec.st, add = {};
  if (rec.comp === 'nt') { add.caps = 1; add.ntGoals = st.goals; }
  else if (rec.comp !== 'youth' && rec.comp !== 'ntY') { add.apps = 1; add.goals = st.goals; add.assists = st.assists; if (S.p.pos === 'GK') add.cs = st.cs; }
  for (const k in add) {
    const before = cnt[k]; cnt[k] += add[k] || 0;
    for (const m of MS[k]) if (before < m && cnt[k] >= m) {
      const t = MSLABEL[k](m);
      (S.miles = S.miles || []).push({ k, n: m, t, y: S.w.year, age: S.p.age, opp: rec.oppName, d: rec.d });
      C.news(S, `${S.p.name}, ${rec.oppName}전에서 ${t}`, 'mile', m >= 100 || m === 1);
    }
  }
  // 경기 화제
  if (st.goals >= 3) C.news(S, `${S.p.name} 해트트릭! ${rec.compName} ${rec.oppName}전 ${rec.gf}-${rec.ga}`, 'hat', true);
  else if (rec.motm && rec.stage === '결승') C.news(S, `${rec.compName} 결승 최우수 선수 ${S.p.name}`, 'final', true);
  if (rec.injury && rec.injury.days >= 30) C.news(S, `${S.p.name} ${rec.injury.kind}로 약 ${Math.round(rec.injury.days / 7)}주 이탈`, 'inj', true);
  if (rec.st.red) C.news(S, `${S.p.name}, ${rec.oppName}전 퇴장`, 'card');
};

// ---------- 시즌 목표 ----------
// 시즌 목표: 포지션별 지표 + 지난 시즌 기록·이번 시즌 예상 출전으로 기대값을 잡고,
// 달성 확률(쉬움 ≈70%, 보통 ≈50%, 어려움 ≈25%)이 되도록 목표치를 정한다
const SHARE = { key: .88, starter: .78, rotation: .5, backup: .26, reserve: .1 };
const RATE = { // 경기당 기본 기대치
  goals: { ST: .42, W: .28, AM: .26, CM: .09, DM: .04, FB: .03, CB: .05, GK: 0 },
  assists: { ST: .12, W: .2, AM: .22, CM: .14, DM: .07, FB: .12, CB: .03, GK: 0 },
  def: { ST: .6, W: 1, AM: 1.2, CM: 3, DM: 4.4, FB: 3.4, CB: 4, GK: 0 },
  saves: { GK: 2.8 }, cs: { GK: .3, CB: .3, FB: .28, DM: .28 }
};
const KINDS = { ST: ['goals', 'ga', 'apps', 'rating'], W: ['ga', 'goals', 'assists', 'apps', 'rating'], AM: ['ga', 'assists', 'goals', 'apps', 'rating'], CM: ['ga', 'assists', 'def', 'apps', 'rating'], DM: ['def', 'cs', 'apps', 'rating'], CB: ['def', 'cs', 'apps', 'rating'], FB: ['assists', 'def', 'cs', 'apps', 'rating'], GK: ['cs', 'saves', 'apps', 'rating'] };
const KLABEL = { goals: '득점', ga: '공격포인트 (골+도움)', assists: '도움', def: '태클+가로채기', cs: '클린시트', saves: '선방', apps: '출전' };
const statOf = (t, k) => k === 'ga' ? t.goals + t.assists : k === 'def' ? t.tackles + t.ints : k === 'goals' ? t.goals : k === 'assists' ? t.assists : k === 'cs' ? t.cs : k === 'saves' ? t.saves : k === 'apps' ? t.apps : 0;
X.makeGoals = function (S) {
  const ss = S.ss, role = C.ROLE[S.p.pos], youth = S.car.status === 'youth';
  const lg = C.leagueOf(S);
  const L = youth ? 22 : lg ? (C.leagueRounds ? ss.rounds.length + (C.splitCount ? C.splitCount(lg) : 0) : 34) : 30;
  const comp = youth ? 'youth' : 'league', compName = youth ? '유스 리그' : '리그';
  let E = youth ? L * .8 : L * (SHARE[ss.role] || .5);
  const lvl = clamp((C.effOvr(S.p) - S.w.clubs[ss.club].str) / 10, -.6, .6);
  // 지난 시즌 같은 단계(유스/1군) 리그 기록
  const last = S.hist[S.hist.length - 1];
  let prev = null;
  if (last) { const t = youth ? last.youth : (last.agg && last.agg.league ? last.agg.league.st : null); if (t && t.apps >= 8 && (youth ? true : last.status !== 'youth')) prev = t; }
  if (prev && !youth) E = E * .6 + Math.min(L, prev.apps) * .4;
  E = clamp(E, 3, L);
  const rate = k => {
    let d = k === 'ga' ? (RATE.goals[role] + RATE.assists[role]) : (RATE[k] && RATE[k][role]) || 0;
    d *= k === 'cs' || k === 'saves' ? 1 : 1 + lvl * .8;
    if (prev && prev.apps >= 8) { const pr = statOf(prev, k) / prev.apps; d = d * .45 + pr * .55; }
    return d;
  };
  const Z = { easy: -.9, normal: -.1, hard: .7 };
  const make = (k, d, force) => {
    const dl = { easy: '쉬움', normal: '보통', hard: '어려움' }[d];
    if (k === 'apps') { const target = force != null ? force : clamp(Math.round(E + Z[d] * Math.max(2.5, E * .22)), 3, L); return { d, dl, k, target, comp, label: `${compName} ${target}경기 출전` }; }
    if (k === 'rating') {
      const minApps = Math.max(5, Math.round(E * .4));
      let base = prev && prev.rated >= 8 ? C.avgRating(prev) * .6 + (6.65 + lvl * .35) * .4 : 6.65 + lvl * .35;
      const target = force != null ? force : +(base + Z[d] * .17 + (d === 'easy' ? -.05 : 0)).toFixed(2);
      return { d, dl, k, target, comp, minApps, label: `${compName} 평균 평점 ${target.toFixed(2)} 이상 (${minApps}경기 이상 출전)` };
    }
    const mu = E * rate(k), sd = Math.max(1, Math.sqrt(mu) * 1.25);
    const target = force != null ? force : Math.max(1, Math.round(mu + Z[d] * sd));
    return { d, dl, k, target, comp, label: `${compName} ${KLABEL[k]} ${target}${k === 'cs' || k === 'saves' ? '회' : k === 'def' ? '회' : k === 'goals' ? '골' : k === 'assists' ? '개' : '개'}` };
  };
  let kinds = (KINDS[role] || ['apps', 'rating']).slice();
  if (E < 14) kinds = kinds.filter(k => k !== 'rating');
  kinds = kinds.filter(k => k === 'apps' || k === 'rating' || E * rate(k) >= 2.5); // 기대값이 너무 작은 지표는 운에 좌우되므로 제외
  if (kinds.length < 2) kinds = ['apps'].concat(E >= 10 ? ['rating'] : []);
  if (role === 'GK' || ['CB', 'DM', 'FB'].includes(role)) { if (E < 12) kinds = kinds.filter(k => k !== 'cs'); }
  const pickK = C.shuffle(kinds);
  const list = ['easy', 'normal', 'hard'].map((d, i) => make(pickK[i % pickK.length], d));
  // 목표치가 거꾸로 되는 일 방지: 같은 지표면 단계별로 반드시 높아진다
  for (let i = 1; i < 3; i++) { const a = list[i - 1], b = list[i]; if (a.k === b.k && b.target <= a.target) list[i] = make(b.k, b.d, a.k === 'rating' ? +(a.target + .08).toFixed(2) : a.target + 1); }
  return list;
};
const REWARD = { easy: { trust: 3, money: 4, morale: 4 }, normal: { trust: 6, money: 8, morale: 6, rep: 2 }, hard: { trust: 10, money: 15, morale: 10, rep: 5, ovr: 1 } };
const PENALTY = { easy: { trust: -6, morale: -6 }, normal: { trust: -4, morale: -4 }, hard: { morale: -3 } };
X.rewardText = d => { const r = REWARD[d]; return [`신뢰 +${r.trust}`, `보너스 주급 ${r.money}배`, r.rep ? `명성 +${r.rep}` : '', r.ovr ? '+1 OVR' : ''].filter(Boolean).join(' · '); };
X.penaltyText = d => { const r = PENALTY[d]; return [r.trust ? `신뢰 ${r.trust}` : '', `사기 ${r.morale}`].filter(Boolean).join(' · '); };
X.progress = function (S, g, matches) {
  const ms = (matches || (S.ss ? S.ss.matches : [])).filter(m => m.played && (g.comp === 'youth' ? m.comp === 'youth' : m.comp === 'league'));
  const t = C.totalAgg(ms);
  if (g.k === 'rating') { const r = C.avgRating(t); return { v: r, done: t.rated >= (g.minApps || 10) && r >= g.target }; }
  const v = statOf(t, g.k); return { v, done: v >= g.target };
};
X.settle = function (S) {
  const ss = S.ss, g = ss.goal; if (!g) return null;
  const pr = X.progress(S, g);
  const eff = Object.assign({}, pr.done ? REWARD[g.d] : PENALTY[g.d]);
  if (eff.money) eff.money = eff.money * Math.max(1500, S.car.wage || 1500);
  C.applyEffect(S, eff);
  const res = { ok: pr.done, v: pr.v, goal: g };
  C.news(S, pr.done ? `시즌 목표 달성: ${g.label}` : `시즌 목표 실패: ${g.label}`, pr.done ? 'goal' : 'goalx', pr.done && g.d === 'hard');
  return res;
};
})(typeof window !== 'undefined' ? window : globalThis);
