// 터치라인 커리어 — 진행 컨트롤러: 새 게임, 이적시장, 시즌 단계, 시즌 종료 처리, 저장
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, N, pick, wpick, shuffle } = C;
const GM = G.TCG = {};

const evCount = () => { const f = C.cfg.events; return f === 'off' ? 0 : f === 'low' ? (R() < .5 ? 1 : 0) : f === 'high' ? (R() < .5 ? 3 : 2) : (R() < .55 ? 2 : 1); };
GM.newGame = function (opt) {
  C.psDirty = true;
  const w = C.buildWorld();
  const p = C.newPlayer(Object.assign({ year: w.year }, opt));
  const S = { v: 1, w, p, car: { club: null, status: 'youth', contract: 0, wage: 0, trust: 50, years: 0, focus: 'balance', intensity: 'normal' }, hist: [], flags: {}, phase: 'academy', vh: [], trophies: [], awards: [], evLog: [], created: Date.now() };
  S.academies = academyOptions(S);
  return S;
};
function academyOptions(S) {
  const w = S.w, nat = S.p.nat;
  let pool = Object.values(w.clubs).filter(c => c.lg && w.lg[c.lg].nation === nat && w.lg[c.lg].tier <= 2);
  if (pool.length < 6) pool = pool.concat(Object.values(w.clubs).filter(c => c.lg && ['ENG', 'ESP', 'GER', 'FRA', 'ITA', 'POR', 'NED', 'BEL'].includes(w.lg[c.lg].nation) && w.lg[c.lg].tier <= 2));
  pool = shuffle(pool);
  pool.sort((a, b) => b.str - a.str);
  const top = pool.slice(0, Math.max(3, Math.floor(pool.length * .15))), mid = pool.slice(Math.floor(pool.length * .2), Math.floor(pool.length * .65)), low = pool.slice(Math.floor(pool.length * .65));
  const ch = [pick(top), pick(mid), pick(mid), pick(low)].filter(Boolean);
  return [...new Set(ch.map(c => c.id))];
}
GM.academyOptions = academyOptions;
GM.chooseAcademy = function (S, id) {
  C.materialize(S.w, S.w.clubs[id]);
  S.car = Object.assign(S.car, { club: id, status: 'youth', contract: S.w.year + 2, wage: 400, trust: 50, years: 0, joined: S.w.year });
  S.clubsJoined = [{ club: id, y: S.w.year, type: 'youth' }];
  S.phase = 'training';
  pushValue(S);
};

// ---------- 이적시장 ----------
GM.openWindow = function (S) {
  const st = C.clubStance(S);
  S.stance = st;
  S.offers = C.genOffers(S, 'summer');
  S.phase = 'window';
};
// 선택: {kind:'stay'|'renew'|'promote'|'youth'|'offer'|'free'|'retire', i}
GM.decideWindow = function (S, d) {
  const w = S.w, car = S.car, p = S.p, st = S.stance || {};
  const move = (clubId, type, o) => {
    const prev = car.club;
    const c = w.clubs[clubId];
    C.materialize(w, c);
    if (type === 'loan') { car.parent = car.status === 'loan' ? car.parent : prev; car.status = 'loan'; car.loanUntil = w.year; }
    else { car.parent = null; car.status = 'first'; car.contract = w.year + o.years - 1; car.wage = o.wage; if (o.fee) { S.feeLog = (S.feeLog || []).concat({ y: w.year, from: prev, to: clubId, fee: o.fee }); } }
    car.club = clubId; car.years = 0; car.joined = w.year;
    car.trust = { key: 62, starter: 56, rotation: 50, backup: 45, reserve: 42 }[o.role] || 50;
    S.clubsJoined.push({ club: clubId, y: w.year, type, fee: o.fee || 0 });
    C.news(S, type === 'loan' ? `${S.p.name}, ${c.name}(으)로 임대 이적` : o.fee ? `${S.p.name}, 이적료 ${C.fmtEUR(o.fee)}에 ${c.name} 입단` : `${S.p.name}, 자유 계약으로 ${c.name} 입단`, 'transfer', true);
  };
  if (d.kind === 'retire') { GM.retire(S); return; }
  if (d.kind === 'offer') {
    const o = S.offers[d.i]; move(o.club, o.type, o);
  } else if (d.kind === 'renew') { if (car.status === 'loan' && car.parent) { car.club = car.parent; car.parent = null; car.years = 1; } car.contract = w.year + st.years - 1; car.wage = st.wage; car.status = 'first'; }
  else if (d.kind === 'extend') { car.contract = w.year + st.extend.years; car.wage = st.extend.wage; car.trust = clamp(car.trust + 5, 0, 100); }
  else if (d.kind === 'promote') { car.status = 'first'; car.contract = w.year + 2; car.wage = C.wageFor(w.clubs[car.club], C.ovrOf(p), w.lg[w.clubs[car.club].lg].nation); car.trust = Math.max(car.trust, 50); S.clubsJoined.push({ club: car.club, y: w.year, type: 'pro' }); }
  else if (d.kind === 'back') { C.materialize(w, w.clubs[car.parent]); car.club = car.parent; car.parent = null; car.status = 'first'; car.trust = 50; car.years = 1; }
  else if (d.kind === 'free') { car.status = 'free'; car.parent = null; car.wage = 0; }
  else if (d.kind === 'youth' || d.kind === 'stay') { /* 그대로 */ }
  S.phase = car.status === 'free' ? 'freeYear' : 'training';
};
// 협상: 성공 시 조건 상향, 실패 시 철회 위험
GM.negotiate = function (S, i) {
  const o = S.offers[i]; if (o.neg) return o;
  o.neg = true; const r = R();
  if (r < .5) { o.wage = Math.round(o.wage * rnd(1.15, 1.4) / 100) * 100; if (o.role === 'rotation' && R() < .4) o.role = 'starter'; o.negRes = 'up'; }
  else if (r < .8) o.negRes = 'same';
  else { o.withdrawn = true; o.negRes = 'gone'; }
  return o;
};

// ---------- 훈련 ----------
GM.setTraining = function (S, focus, intensity) {
  S.car.focus = focus; S.car.intensity = intensity;
  C.setupSeason(S);
  S.pend = C.drawEvents(S, 'pre', S.p.age === 16 && !S.hist.length ? 1 : evCount());
  S.ss.goalOpts = C.extras.makeGoals(S);
  S.phase = 'goal';
};
GM.pickGoal = function (S, i) {
  S.ss.goal = i == null || i < 0 ? null : S.ss.goalOpts[i];
  S.phase = S.pend.length ? 'preEvents' : 'h1';
};
GM.resolve = function (S, idx) {
  const b = S.pend.shift();
  const log = C.resolveEvent(S, b, idx);
  if (!S.pend.length) S.phase = S.phase === 'preEvents' ? 'h1' : S.phase === 'midEvents' ? (S.winterOffers && S.winterOffers.length ? 'winter' : 'h2') : S.phase;
  return log;
};
// 전반기/후반기 시뮬
GM.simHalf = async function (S, hooks) {
  const ss = S.ss;
  await C.simUntil(S, C.halfEnd(S), hooks);
  if (ss.half === 1) {
    ss.half = 2; C.updateRole(S);
    if (C.cfg.moments !== 'off') ss.momentsLeft += Math.max(1, Math.round(C.ROLE && ss.role === 'reserve' ? 0 : 1)) + (ss.role === 'key' ? 1 : 0);
    S.pend = C.drawEvents(S, 'mid', evCount());
    // 겨울 이적시장 (임대 요청 또는 벤치 신세의 젊은 선수)
    S.winterOffers = null;
    if (S.car.status !== 'youth' && (S.flags.loanReq || (['backup', 'reserve'].includes(ss.role) && S.p.age <= 23 && R() < .5) || (S.flags.transferReq && R() < .5))) { S.lastRole = ss.role; S.winterOffers = C.genOffers(S, 'winter').slice(0, 3); }
    S.phase = 'mid';
  } else {
    S.phase = 'endSeason';
  }
};
GM.toMidEvents = function (S) { S.phase = S.pend && S.pend.length ? 'midEvents' : (S.winterOffers && S.winterOffers.length ? 'winter' : 'h2'); };
// 겨울 이적: 새 팀 일정으로 교체
GM.winterMove = function (S, i) {
  if (i == null || i < 0) { S.phase = 'h2'; return; }
  const o = S.winterOffers[i], w = S.w, car = S.car, ss = S.ss;
  const prevMatches = ss.matches, prevClub = ss.club, oldCont = ss.allCont, oldTables = ss.tables;
  if (o.type === 'loan') { car.parent = car.status === 'loan' ? car.parent : car.club; car.status = 'loan'; car.loanUntil = w.year; }
  else { car.parent = null; car.status = 'first'; car.contract = w.year + o.years - 1; car.wage = o.wage; S.feeLog = (S.feeLog || []).concat({ y: w.year, from: car.club, to: o.club, fee: o.fee }); }
  C.materialize(w, w.clubs[o.club]);
  car.club = o.club; car.years = 0; car.trust = { key: 62, starter: 56, rotation: 50, backup: 45, reserve: 42 }[o.role] || 50;
  S.clubsJoined.push({ club: o.club, y: w.year, type: o.type, fee: o.fee || 0, winter: true });
  const keep = { inj: ss.inj, susp: ss.susp, moments: ss.moments, momentsLeft: ss.momentsLeft, events: ss.events, injuries: ss.injuries, recent: ss.recent };
  C.setupSeason(S);
  const ns = S.ss;
  // 기존 대륙 대회 상태는 유지 (새 팀 대륙 대회는 등록 불가로 처리)
  ns.allCont = oldCont; ns.cont = null;
  ns.fx = ns.fx.filter(f => f.k !== 'E');
  // 새 리그 전반기 결과는 빠르게 시뮬
  const lg = C.leagueOf(S);
  for (const f of ns.fx) if (f.d < ns.split && f.k === 'L') { for (const [a, b] of (ns.rounds[f.r] || [])) { const [x, y] = C.quickMatch(w.clubs[a].str, w.clubs[b].str, 1); C.addResult(ns.tables[lg.id], a, b, x, y); } }
  // 이전 리그 테이블은 남은 경기를 빠르게 시뮬하도록 보관
  ns.oldTables = oldTables; ns.oldClub = prevClub;
  ns.fx = ns.fx.filter(f => f.d >= ns.split && !(f.k === 'C' || f.k === 'LC'));
  ns.alive = {};
  ns.i = 0; ns.half = 2; ns.matches = prevMatches; Object.assign(ns, keep); ns.winter = { from: prevClub, to: o.club, type: o.type };
  C.updateRole(S);
  S.phase = 'h2';
};

// ---------- 시즌 종료 ----------
GM.endSeason = function (S) {
  const ss = S.ss, p = S.p, w = S.w, car = S.car;
  // 겨울 이적 시 이전 리그의 나머지 경기
  if (ss.oldTables) for (const id in ss.oldTables) if (!ss.tables[id]) {
    const lgO = w.lg[id]; const t = ss.oldTables[id];
    const done = Object.values(t).reduce((a, r) => a + r.p, 0) / 2, total = (C.leagueRounds(lgO).length + C.splitCount(lgO)) * Math.floor(lgO.clubs.length / 2);
    let k = 0; const ids = lgO.clubs;
    for (let i = 0; i < ids.length && k < total - done; i++) for (let j = 0; j < ids.length && k < total - done; j++) if (i !== j && R() < .55) { const [a, b] = C.quickMatch(w.clubs[ids[i]].str, w.clubs[ids[j]].str, 1); C.addResult(t, ids[i], ids[j], a, b); k++; }
    ss.tables[id] = t;
  }
  C.finishSeason(S);
  try { ss.tr = C.teamRank(S, ss); } catch (e) { ss.tr = null; }
  ss.goalRes = null;
  // 1군 기록과 유스(U18·U21) 기록을 분리
  const club = ss.matches.filter(m => !['nt', 'ntY', 'youth'].includes(m.comp));
  const youthM = ss.matches.filter(m => m.comp === 'youth');
  ss.agg = C.compAgg(club);
  ss.total = C.totalAgg(club);
  ss.youthTot = C.totalAgg(youthM);
  ss.youthLabel = youthM.length ? youthM[0].compName.replace(' 리그', '') : '';
  ss.ntAgg = C.totalAgg(ss.matches.filter(m => ['nt', 'ntY'].includes(m.comp)));
  const avail = club.length || 1;
  ss.minShare = clamp(ss.total.min / (avail * 90), 0, 1);
  const rating = C.avgRating(ss.total);
  const yRating = C.avgRating(ss.youthTot);
  const yShare = youthM.length ? clamp(ss.youthTot.min / (youthM.length * 90), 0, 1) : 0;
  C.computeAwards(S);
  ss.goalRes = C.extras.settle(S);
  for (const t of ss.trophies) C.news(S, `${t.club}, ${t.t} 우승`, 'trophy', true);
  for (const a of ss.awards) C.news(S, `${S.p.name}, ${a.t} 수상${a.v ? ` (${a.v})` : ''}`, 'award', true);
  if (ss.ballon && ss.ballon.rank && ss.ballon.rank <= 10) C.news(S, `발롱도르 순위 ${ss.ballon.rank}위`, 'award', ss.ballon.rank <= 3);
  // 성장
  const o0 = C.ovrOf(p), effBefore = C.effOvr(p);
  const g = C.seasonGrowth(p, { minShare: Math.max(ss.minShare, yShare * .55), rating: ss.total.rated >= 5 ? rating : ss.youthTot.rated >= 5 ? yRating - .25 : 6.6, focus: car.focus, intensity: car.intensity, clubLv: w.clubs[ss.club].str });
  // 일시 보정 감소
  p.mods = p.mods.filter(m => --m.seasons > 0);
  ss.growth = { before: g.before, after: { ...p.a }, o0, o1: C.ovrOf(p) };
  // 수입
  let income = Math.round(car.wage * 52 + (ss.trophies.length * car.wage * 4));
  ss.perfBonus = 0;
  if (S.flags.perfBonus) { ss.perfBonus = Math.round(((ss.total.goals + ss.total.assists) * 1.6 + ss.total.apps * .15 + (ss.total.cs || 0) * .5) * car.wage); income += ss.perfBonus; S.flags.perfBonus = 0; }
  if (S.flags.superAgent) income = Math.round(income * .9);
  p.money += income; ss.income = income;
  p.morale = clamp(p.morale + (60 - p.morale) * .3, 0, 100);
  p.rep = clamp(p.rep + (rating - 6.8) * 4 + ss.trophies.length * 2 + ss.awards.length * 3 + (ss.status === 'youth' ? 0 : 1), 0, 100);
  // 기록 저장
  const lg = ss.lgId ? w.lg[ss.lgId] : null;
  const rec = {
    y: ss.year, label: ss.label, age: p.age, club: ss.club, clubName: w.clubs[ss.club].name, short: w.clubs[ss.club].short, c1: w.clubs[ss.club].c1, c2: w.clubs[ss.club].c2,
    status: ss.status, pos: p.pos, ovr0: o0, ovr1: C.ovrOf(p), lgName: lg ? lg.name : '', lgId: lg ? lg.id : '', lgPos: ss.lgPos, lgN: ss.lgN,
    total: ss.total, youth: ss.youthTot, youthLabel: ss.youthLabel, youthRating: yRating, agg: Object.fromEntries(Object.entries(ss.agg).map(([k, v]) => [k, { name: v.name, st: v.st }])), nt: ss.ntAgg, ntLvl: ss.nt ? ss.nt.lvl : null,
    rating, minShare: ss.minShare, trophies: ss.trophies, awards: ss.awards, ballon: ss.ballon ? ss.ballon.rank : null, ballonTop: ss.ballon ? ss.ballon.top.slice(0, 5).map(x => [x.n, x.club, !!x.me]) : [],
    tourn: ss.tourn ? { name: ss.tourn.name, stage: ss.tourn.stage, won: ss.tourn.won } : null,
    moments: ss.moments, injuries: ss.injuries || [], winter: ss.winter ? { from: w.clubs[ss.winter.from].name, to: w.clubs[ss.winter.to].name, type: ss.winter.type } : null,
    log: ss.matches.map(m => ({ ...C.logExtra(m), y: m.comp === 'youth' ? 1 : 0, d: m.d, c: m.comp, cn: m.compName, s: m.stage, o: m.oppName, h: m.home, gf: m.gf, ga: m.ga, p: m.played ? 1 : 0, st: m.start ? 1 : 0, mi: m.min || 0, r: m.rating || 0, g: m.played ? m.st.goals : 0, a: m.played ? m.st.assists : 0, mo: m.motm ? 1 : 0, w: m.why || '', pen: m.pens || '', ko: m.koWin, mm: m.moment ? m.moment.ok : undefined, yc: m.played ? m.st.yellow : 0, rc: m.played ? m.st.red : 0 })),
    shots: ss.matches.filter(m => m.played && m.shots && !['nt', 'ntY', 'youth'].includes(m.comp)).flatMap(m => m.shots).slice(0, 260),
    table: lg && ss.final[lg.id] ? ss.final[lg.id].map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) : null,
    cupOut: ss.CWon ? '우승' : ss.COut || '', lcupOut: ss.LCWon ? '우승' : ss.LCOut || '', contOut: ss.contWon ? '우승' : ss.contOut || '', contName: ss.cont ? ss.allCont[ss.cont].name : '', cupName: ss.cupName, lcupName: ss.lcupName,
    focus: car.focus, intensity: car.intensity, role: ss.role, money: p.money, perfBonus: ss.perfBonus || 0, income: ss.income,
    goal: ss.goalRes ? { label: ss.goalRes.goal.label, d: ss.goalRes.goal.d, ok: ss.goalRes.ok, v: ss.goalRes.v } : null
  };
  S.hist.push(rec);
  S.trophies.push(...ss.trophies); S.awards.push(...ss.awards.map(a => Object.assign({ y: ss.label }, a)));
  S.lastRole = ss.role;
  // 다음 시즌 준비
  car.years++;
  C.advanceWorld(w, ss.resAdj);
  p.age++;
  pushValue(S);
  S.lastSeason = ss; // 리뷰 화면용
  if (C.ach) C.ach.fire(S, 'season', rec);
  S.ss = null;
  S.phase = 'review';
  return rec;
};
function pushValue(S) {
  const v = C.curValue(S);
  S.vh.push({ y: S.w.year, age: S.p.age, v, club: S.car.club });
  S.value = v;
}
GM.pushValue = pushValue;
// 리뷰 후 다음 시즌
// 재계약 요청 (이적시장마다 1회)
GM.askRenewal = function (S) {
  if (S.phase !== 'window' || S.renY === S.w.year || !['first'].includes(S.car.status)) return null;
  S.renY = S.w.year;
  const r = C.askRenewal(S);
  if (r.ok) { S.stance = Object.assign({}, S.stance, { extend: { wage: r.wage, years: r.years, asked: true } }); }
  else S.car.trust = Math.max(0, S.car.trust - 3);
  return r;
};
// 에이전트 역제의
GM.requestMove = function (S, mode) {
  if (S.phase !== 'window' || S.reqY === S.w.year) return null;
  S.reqY = S.w.year;
  const got = C.requestOffers(S, mode);
  S.offers = (S.offers || []).concat(got);
  return got;
};
GM.nextSeason = function (S) {
  const p = S.p, car = S.car;
  if (shouldForceRetire(S)) { GM.retire(S, true); return; }
  if (car.status === 'loan' && car.loanUntil < S.w.year) { /* 임대 복귀는 이적시장에서 선택 */ }
  GM.openWindow(S);
};
function shouldForceRetire(S) { const p = S.p; return p.age >= 44 || (p.age >= 33 && C.ovrOf(p) < 50) || (S.freeYears || 0) >= 2; }
GM.freeYear = function (S) {
  // 무소속 시즌: 개인 훈련만
  const p = S.p;
  S.freeYears = (S.freeYears || 0) + 1;
  if (C.ach) C.ach.fire(S, 'free');
  const g = C.seasonGrowth(p, { minShare: 0, rating: 6.5, focus: S.car.focus, intensity: 'normal', clubLv: 55 });
  p.mods = p.mods.filter(m => --m.seasons > 0);
  S.hist.push({ y: S.w.year, label: `${S.w.year}/${String(S.w.year + 1).slice(2)}`, age: p.age, club: null, clubName: '무소속', short: 'FA', c1: '#555', c2: '#999', status: 'free', pos: p.pos, ovr0: g.o0, ovr1: C.ovrOf(p), total: C.blankStats(), agg: {}, nt: C.blankStats(), rating: 0, minShare: 0, trophies: [], awards: [], log: [], shots: [], moments: [], injuries: [] });
  C.advanceWorld(S.w, {});
  p.age++; pushValue(S);
  S.lastSeason = null;
  GM.nextSeason(S);
};
GM.retire = function (S, forced) {
  C.news(S, `${S.p.name}, ${S.p.age}세로 현역 은퇴`, 'retire', true);
  S.phase = 'retired'; S.retired = { y: S.w.year, age: S.p.age, forced: !!forced };
  const sum = GM.summary(S);
  S.retired.grade = sum.grade;
  if (C.ach) C.ach.fire(S, 'retire');
};
GM.summary = function (S) {
  const t = C.blankStats(), nt = C.blankStats();
  for (const h of S.hist) { C.addStats(t, h.total); if (h.nt) C.addStats(nt, h.nt); }
  const peak = Math.max(...S.hist.map(h => Math.max(h.ovr0, h.ovr1)), C.ovrOf(S.p));
  const tp = S.trophies.length, aw = S.awards.length, bd = S.awards.filter(a => a.k === 'ballon').length;
  const maxV = Math.max(...S.vh.map(v => v.v));
  let grade;
  if (bd >= 2 || (peak >= 91 && tp >= 8)) grade = ['GOAT 후보', '역사에 남을 선수'];
  else if (bd >= 1 || peak >= 88) grade = ['레전드', '한 시대를 지배했다'];
  else if (peak >= 84) grade = ['월드클래스', '세계 정상급 선수'];
  else if (peak >= 79) grade = ['정상급 주전', '빅리그에서 통했다'];
  else if (peak >= 73) grade = ['베테랑 프로', '꾸준히 커리어를 쌓았다'];
  else if (peak >= 66) grade = ['저니맨', '여러 팀을 거친 생존자'];
  else grade = ['꿈을 이루지 못한 유망주', '그래도 공을 찼다'];
  return { total: t, nt, peak, tp, aw, bd, maxV, grade, seasons: S.hist.length, clubs: [...new Set(S.hist.filter(h => h.club).map(h => h.club))].length };
};

// ---------- 저장 ----------
const KEY = 'tc.save.v1', HOF = 'tc.hof.v1';
// 시즌 도중(경기 진행 중)에는 저장하지 않고, 단계 사이에서만 직렬화
GM.serialize = function (S, full) {
  if (!['window', 'training', 'review', 'reviewDone', 'retired', 'academy', 'freeYear', 'world'].includes(S.phase)) return null;
  const o = Object.assign({}, S); delete o.ss; delete o.lastSeason; delete o.pend; delete o.winterOffers; delete o.newsQ;
  if (o.phase === 'review') o.phase = 'reviewDone';
  // 선수 기록(용량이 큰 부분)은 따로 저장한다: full=true면 포함 (파일 내보내기용)
  if (o.w && o.w.ps && !full) { o.w = Object.assign({}, o.w); delete o.w.ps; }
  return JSON.stringify(o);
};
GM.parse = function (t) { try { return JSON.parse(t); } catch (e) { return null; } };
GM.hof = function () { try { return JSON.parse(localStorage.getItem(HOF) || '[]'); } catch (e) { return []; } };
GM.saveHof = function (S, sum) {
  try {
    const list = GM.hof();
    const last = S.hist[S.hist.length - 1];
    list.unshift({ name: S.p.name, nat: S.p.nat, pos: S.p.pos, num: S.p.num, peak: sum.peak, apps: sum.total.apps, goals: sum.total.goals, assists: sum.total.assists, caps: sum.nt.apps, tp: sum.tp, aw: sum.aw, bd: sum.bd, grade: sum.grade[0], retireAge: S.p.age, lastClub: last ? last.clubName : '', maxV: sum.maxV, y: S.w.year, d: Date.now() });
    localStorage.setItem(HOF, JSON.stringify(list.slice(0, 30)));
  } catch (e) { }
};
// ---------- 관전(시뮬레이션) 모드: 내 선수 없이 세계만 진행 ----------
GM.newWorld = function () {
  C.psDirty = true;
  const w = C.buildWorld();
  return { v: 1, mode: 'world', w, p: { name: '', nat: 'ENG', pos: 'ST', age: 0, a: {}, mods: [], hid: { inj: 1, lon: 1, pot: 0, peak: 27 }, traits: [], money: 0, rep: 0, morale: 60, weak: 1, skill: 1, num: 0 },
    car: { club: null, status: 'none', trust: 50 }, hist: [], flags: {}, phase: 'world', vh: [], trophies: [], awards: [], evLog: [], ws: [], created: Date.now() };
};
GM.simWorldSeason = function (S) {
  const w = S.w, y = w.year;
  const ss = S.ss = { year: y, label: `${y}/${String(y + 1).slice(2)}`, club: null, status: 'none', fx: [], i: 0, matches: [], tables: {}, alive: {}, allCont: {}, cont: null, events: [], moments: [], injuries: [] };
  ss.pools = C.nationPools(w);
  const parts = C.contParticipants(w);
  for (const k in parts) ss.allCont[k] = C.setupCont(w, k, parts[k], y);
  C.finishSeason(S);
  const bd = C.ballonDor(S);
  // 시즌 요약
  const tier1 = Object.values(w.lg).filter(l => l.tier === 1);
  const champs = {}; for (const l of tier1) champs[l.id] = ss.final[l.id] && ss.final[l.id][0] ? ss.final[l.id][0].id : null;
  const cont = {}; for (const k in ss.allCont) cont[k] = ss.allCont[k].winner || null;
  const A = w.arch && w.arch[ss.label];
  const boots = {}; if (A) for (const l of tier1) { const L = A.lg[l.id]; if (L && L.sc && L.sc[0]) boots[l.id] = [L.sc[0][0], L.sc[0][1], L.sc[0][2], L.sc[0][5] || '']; }
  S.ws = (S.ws || []).concat({ y, label: ss.label, champs, cont, boots, bd: bd.top.slice(0, 10).map(x => [x.n, x.cid, x.pid || '', x.ovr]), intl: (w.intl && w.intl[y + 1] || []).map(t => [t.k, t.n, t.w, t.ru]), tx: 0 });
  C.advanceWorld(w, ss.resAdj);
  S.ws[S.ws.length - 1].tx = w.lastTx || 0;
  S.lastSeason = ss; S.ss = null;
  return S.ws[S.ws.length - 1];
};
})(typeof window !== 'undefined' ? window : globalThis);
