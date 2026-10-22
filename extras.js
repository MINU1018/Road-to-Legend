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
const EXP_APPS = { key: 34, starter: 30, rotation: 20, backup: 10, reserve: 4, youth: 18 };
const GA_RATE = { ST: .5, W: .42, AM: .42, CM: .22, DM: .1, FB: .14, CB: .08, GK: 0 };
X.makeGoals = function (S) {
  const ss = S.ss, role = C.ROLE[S.p.pos], youth = S.car.status === 'youth';
  const E = EXP_APPS[youth ? 'youth' : ss.role] || 20;
  const lvl = clamp((C.effOvr(S.p) - S.w.clubs[ss.club].str) / 10, -.6, .6); // 팀 내 수준
  const comp = youth ? 'youth' : 'league';
  const compName = youth ? '유스 리그' : '리그';
  const list = [];
  const diffs = [['easy', '쉬움', .7], ['normal', '보통', 1], ['hard', '어려움', 1.4]];
  const kinds = [];
  if (GA_RATE[role] >= .2) kinds.push('ga');
  if (role === 'GK') kinds.push('cs');
  kinds.push('apps', 'rating');
  for (const [d, dl, m] of diffs) {
    const k = kinds[(diffs.findIndex(x => x[0] === d) + rint(0, 9)) % kinds.length];
    let target, label;
    if (k === 'ga') { target = Math.max(2, Math.round(E * GA_RATE[role] * (1 + lvl) * m)); label = `${compName} 공격포인트 ${target}개 (골+도움)`; }
    else if (k === 'cs') { target = Math.max(2, Math.round(E * .3 * (1 + lvl) * m)); label = `${compName} 클린시트 ${target}회`; }
    else if (k === 'apps') { target = Math.max(3, Math.min(youth ? 22 : 38, Math.round(E * (.8 + (m - 1) * .5)))); label = `${compName} ${target}경기 출전`; }
    else { target = +(6.62 + (m - 1) * .45 + lvl * .25).toFixed(2); label = `시즌 평균 평점 ${target.toFixed(2)} 이상 (10경기 이상)`; }
    list.push({ d, dl, k, target, comp, label });
  }
  return list;
};
const REWARD = { easy: { trust: 3, money: 4, morale: 4 }, normal: { trust: 6, money: 8, morale: 6, rep: 2 }, hard: { trust: 10, money: 15, morale: 10, rep: 5, ovr: 1 } };
const PENALTY = { easy: { trust: -6, morale: -6 }, normal: { trust: -4, morale: -4 }, hard: { morale: -3 } };
X.rewardText = d => { const r = REWARD[d]; return [`신뢰 +${r.trust}`, `보너스 주급 ${r.money}배`, r.rep ? `명성 +${r.rep}` : '', r.ovr ? '+1 OVR' : ''].filter(Boolean).join(' · '); };
X.penaltyText = d => { const r = PENALTY[d]; return [r.trust ? `신뢰 ${r.trust}` : '', `사기 ${r.morale}`].filter(Boolean).join(' · '); };
X.progress = function (S, g, matches) {
  const ms = (matches || (S.ss ? S.ss.matches : [])).filter(m => m.played && (g.comp === 'youth' ? m.comp === 'youth' : g.k === 'rating' ? !['nt', 'ntY', 'youth'].includes(m.comp) : m.comp === 'league'));
  const t = C.totalAgg(ms);
  if (g.k === 'ga') return { v: t.goals + t.assists, done: t.goals + t.assists >= g.target };
  if (g.k === 'cs') return { v: t.cs, done: t.cs >= g.target };
  if (g.k === 'apps') return { v: t.apps, done: t.apps >= g.target };
  const r = C.avgRating(t); return { v: r, done: t.rated >= 10 && r >= g.target };
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
