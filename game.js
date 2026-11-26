// 터치라인 커리어 — 진행 컨트롤러: 새 게임, 이적시장, 시즌 단계, 시즌 종료 처리, 저장
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, N, pick, wpick, shuffle } = C;
const GM = G.TCG = {};

const evCount = () => { const f = C.cfg.events; return f === 'off' ? 0 : f === 'low' ? (R() < .5 ? 1 : 0) : f === 'high' ? (R() < .5 ? 3 : 2) : (R() < .55 ? 2 : 1); };
// 데이터셋: 'fc27' (기본) / 'tm' (FC27 + Transfermarkt 게임 이전 기록). 'tm'은 data_tm.js가 먼저 불러와져 있어야 한다
const dsBegin = ds => { const tm = ds === 'tm' && C.TM && G.TMD; if (C.TM) C.TM.apply(!!tm); return tm ? 'tm' : 'fc27'; };
// 커리어 새 게임도 관전 모드와 같은 세계 준비 (감독·대표팀 감독·랭킹·레전드). v40 전에는 불러오기 때만 채워져 새 커리어 첫 진행에서 멈췄다
const seedWorld = (w, ds) => { if (C.mgrSeed && !(w.mgrV >= 2)) C.mgrSeed(w); if (C.ntmSeed && !w.ntm) C.ntmSeed(w); if (C.rankInit && !w.rank) C.rankInit(w, true); if (C.crInit && !w.cr) C.crInit(w, true); if (C.legSeed && ds !== 'tm' && !w.legPre) C.legSeed(w); };
GM.seedWorld = seedWorld;
const dsEnd = (S, ds) => { if (S.mode !== 'world') seedWorld(S.w, ds === 'tm' ? 'tm' : 'fc27'); if (ds === 'tm') { S.ds = 'tm'; C.TM.seed(S.w); if (C.legAll) C.legAll(S.w); } return S; };
GM.dsBegin = dsBegin;
GM.newGame = function (opt) {
  C.psDirty = true; C.psGen = (C.psGen || 0) + 1;
  const dk = C.diffKey(opt.difficulty || 'normal'); C.curDiff = dk;
  const ds = dsBegin(opt.ds);
  const w = C.buildWorld();
  const p = C.newPlayer(Object.assign({ year: w.year }, opt, { difficulty: dk }));
  const S = { v: 1, diff: dk, w, p, car: { club: null, status: 'youth', contract: 0, wage: 0, trust: 50, years: 0, focus: 'balance', intensity: 'normal' }, hist: [], flags: {}, phase: 'academy', vh: [], trophies: [], awards: [], evLog: [], created: Date.now() };
  S.academies = academyOptions(S);
  C.calInit(S);
  return dsEnd(S, ds);
};
// ---------- 실존 선수로 시작 ----------
const realRef = () => C.dayOf(C.START_YEAR, 8, 1);
GM.realList = function () {
  const F = G.FC27, ok = new Set();
  for (const l of F.leagues) for (const id of l.clubs) ok.add(id);
  for (const [id] of F.other) ok.delete(id);
  const ref = realRef(), out = [];
  F.P.forEach((p, i) => { const c = F.clubs[p[4]]; if (!c || !ok.has(c[0])) return; out.push({ i, n: p[1], pos: C.POSMAP[p[2]] || 'CM', age: Math.floor((ref - p[9]) / 365.25), o: p[11], nat: p[5], club: c[1], cid: c[0] }); });
  return out.sort((a, b) => b.o - a.o);
};
const FCMAP = { pace: 'sprint', positioning: 'attPos', freeKick: 'fkAcc', marking: 'defAware', gkPositioning: 'gkPos' };
GM.newGameReal = function (idx, diff, dsk) {
  const F = G.FC27, P = F.P[idx]; if (!P) return null;
  C.psDirty = true; C.psGen = (C.psGen || 0) + 1;
  const dk = C.diffKey(diff || 'normal'); C.curDiff = dk;
  const ds = dsBegin(dsk);
  const w = C.buildWorld();
  const fc = F.clubs[P[4]]; const c = fc && w.clubs[fc[0]];
  if (!c || c.lite || !c.lg || !w.lg[c.lg]) return null;
  const pos = C.POSMAP[P[2]] || 'CM', o = P[11];
  const age = clamp(Math.floor((realRef() - P[9]) / 365.25), 15, 42);
  // FC27 능력치 → 게임 능력치 (침착성·GK 스피드는 FC27 데이터에 없어 비슷한 능력치로 채움)
  const raw = [...P[13]].map(ch => ch.charCodeAt(0) - 32), a = {};
  F.stats.forEach((k, j) => { const key = FCMAP[k] || k; if (C.AK.includes(key)) a[key] = raw[j]; });
  if (a.composure == null) a.composure = Math.round(((a.reactions || 60) + (a.ballControl || 60)) / 2 + (age >= 27 ? 4 : 0));
  if (a.gkSpeed == null) a.gkSpeed = pos === 'GK' ? Math.round(((a.accel || 40) + (a.sprint || 40)) / 2) : 10;
  for (const k of C.AK) if (a[k] == null) a[k] = 40;
  // 게임의 포지션 OVR 공식이 FC27 OVR과 같도록 핵심 능력치를 조금 맞춘다
  const d = o - C.posOvr(a, pos); for (const k in C.POSW[pos]) a[k] = clamp(a[k] + d, 5, 99);
  const p = C.newPlayer({ name: P[1], nat: P[5], num: 9, foot: P[6] === 'L' ? 'L' : 'R', pos, height: pos === 'GK' ? 190 : 181, style: 0, year: w.year, difficulty: dk });
  p.a = a; p.age = age; p.born = w.year - age;
  p.weak = clamp(+P[7] || 3, 1, 5); p.skill = clamp(+P[8] || 2, 1, 5);
  const h = p.hid;
  h.cap = Math.max(o + .5, C.sampleCap(dk, o + .5));
  h.pot = clamp(h.cap - rnd(0, 3), o, h.cap); h.startOvr = o; h.real = idx;
  if (age >= 24) h.peak = clamp(Math.max(h.peak, age - 1), 24, 33);
  p.rep = clamp(Math.round((o - 55) * 2.4), 5, 95);
  // AI 명단에서 본인은 빠진다
  c.sq = c.sq.filter(e => e[0] !== idx); c.str = C.xiStrength(c.sq);
  const youth = age < 18 && o < c.str - 12;
  const wage = youth ? 400 : C.wageFor(c, o, w.lg[c.lg].nation);
  p.money = youth ? 0 : Math.round(wage * 20);
  const S = { v: 1, diff: dk, w, p, car: { club: c.id, status: youth ? 'youth' : 'first', contract: w.year + (youth ? 2 : rint(1, 4)), wage, trust: 55, years: 1, focus: 'balance', intensity: 'normal', joined: w.year - 1 },
    hist: [], flags: { real: idx }, phase: 'training', vh: [], trophies: [], awards: [], evLog: [], created: Date.now(), clubsJoined: [{ club: c.id, y: w.year, type: youth ? 'youth' : 'pro' }] };
  C.calInit(S);
  pushValue(S);
  return dsEnd(S, ds);
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
    C.news(S, type === 'loan' ? `${S.p.name}, ${C.jo(c.name, '으로', '로')} 임대 이적` : o.fee ? `${S.p.name}, 이적료 ${C.fmtEUR(o.fee)}에 ${c.name} 입단` : `${S.p.name}, 자유 계약으로 ${c.name} 입단`, 'transfer', true);
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
// 날짜 단위 진행: toDay(포함)까지, 단 이번 반기(전반기 끝 = 겨울/여름 휴식기, 후반기 끝 = 시즌 종료)를 넘지 않는다
GM.simTo = async function (S, toDay, hooks, onDay, stop) {
  const ss = S.ss, end = C.halfEnd(S);
  const target = Math.min(toDay, end - 1);
  await C.simUntil(S, target + 1, hooks, onDay, stop);
  if (S.w.cal.d >= end - 1) GM.halfDone(S);
};
GM.simHalf = async function (S, hooks) { return GM.simTo(S, C.halfEnd(S) - 1, hooks); };
GM.halfDone = function (S) {
  const ss = S.ss;
  if (ss.half === 1) {
    ss.half = 2; C.updateRole(S);
    if (C.cfg.moments !== 'off') ss.momentsLeft += Math.max(1, Math.round(C.ROLE && ss.role === 'reserve' ? 0 : 1)) + (ss.role === 'key' ? 1 : 0);
    S.pend = C.drawEvents(S, 'mid', evCount());
    // 시즌 중 이적시장 (임대 요청 또는 벤치 신세의 젊은 선수)
    S.winterOffers = null;
    if (S.car.status !== 'youth' && (S.flags.loanReq || (['backup', 'reserve'].includes(ss.role) && S.p.age <= 23 && R() < .5) || (S.flags.transferReq && R() < .5))) { S.lastRole = ss.role; S.winterOffers = C.genOffers(S, 'winter').slice(0, 3); }
    S.phase = 'mid';
  } else {
    S.phase = 'endSeason';
  }
};
GM.toMidEvents = function (S) { S.phase = S.pend && S.pend.length ? 'midEvents' : (S.winterOffers && S.winterOffers.length ? 'winter' : 'h2'); };
// 시즌 중 이적: 새 구단으로 옮겨 남은 시즌을 뛴다 (새 구단 리그는 이미 세계 달력에서 진행 중). 컵·대륙 대회는 등록 불가
GM.winterMove = function (S, i) {
  if (i == null || i < 0) { S.phase = 'h2'; return; }
  const o = S.winterOffers[i], w = S.w, car = S.car, ss = S.ss;
  const prevClub = ss.club;
  if (o.type === 'loan') { car.parent = car.status === 'loan' ? car.parent : car.club; car.status = 'loan'; car.loanUntil = w.year; }
  else { car.parent = null; car.status = 'first'; car.contract = w.year + o.years - 1; car.wage = o.wage; S.feeLog = (S.feeLog || []).concat({ y: w.year, from: car.club, to: o.club, fee: o.fee }); }
  C.materialize(w, w.clubs[o.club]);
  car.club = o.club; car.years = 0; car.trust = { key: 62, starter: 56, rotation: 50, backup: 45, reserve: 42 }[o.role] || 50;
  S.clubsJoined.push({ club: o.club, y: w.year, type: o.type, fee: o.fee || 0, winter: true });
  const lg = C.leagueOf(S);
  ss.club = o.club; ss.lgId = lg ? lg.id : null; ss.tables = {}; if (lg && w.cal.lg[lg.id]) ss.tables[lg.id] = w.cal.lg[lg.id].tb;
  ss.alive = {}; ss.noCont = true; ss.noCup = true; ss.lgDone = null;
  ss.winter = { from: prevClub, to: o.club, type: o.type };
  C.updateRole(S);
  S.phase = 'h2';
};

// ---------- 시즌 종료 ----------
GM.endSeason = function (S) {
  const ss = S.ss, p = S.p, w = S.w, car = S.car;
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
  const bdOk = ss.ballon && !(S.w.cer && !S.w.cer.rev && S.w.cer.y === ss.ballon.y);
  if (bdOk && ss.ballon.rank && ss.ballon.rank <= 10) C.news(S, `발롱도르 순위 ${ss.ballon.rank}위`, 'award', ss.ballon.rank <= 3);
  // 성장
  const o0 = C.ovrOf(p), effBefore = C.effOvr(p);
  const g = C.seasonGrowth(p, { minShare: Math.max(ss.minShare, yShare * .55), rating: ss.total.rated >= 5 ? rating : ss.youthTot.rated >= 5 ? yRating - .25 : 6.6, focus: car.focus, intensity: car.intensity, clubLv: w.clubs[ss.club].str });
  // 일시 보정 감소
  p.mods = p.mods.filter(m => --m.seasons > 0);
  ss.growth = { before: g.before, after: { ...p.a }, o0, o1: C.ovrOf(p) };
  // 지난 시즌 활약 → 다음 시즌 자신감(컨디션 보정)·감독 신뢰. 기준은 팀 내 위치 대비 기대 평점
  ss.carry = null;
  if (ss.total.rated >= 8 && ss.status !== 'youth') {
    // 기준: 최근 두 시즌 평균 평점 (기록이 없으면 OVR로 추정한 평점)
    const prev = S.hist.filter(x => x.status !== 'youth' && x.total && x.total.rated >= 8 && x.rating).slice(-2).map(x => x.rating);
    const expR = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 6.62 + (o0 - 72) * .035 + .15, d = rating - expR;
    const lv = d >= .55 ? 2 : d >= .25 ? 1 : d <= -.55 ? -2 : d <= -.25 ? -1 : 0;
    if (lv) { p.mods.push({ ovr: lv, seasons: 1, why: lv > 0 ? '지난 시즌 활약 · 자신감' : '지난 시즌 부진 · 자신감 하락' }); C.news(S, lv > 0 ? `지난 시즌 활약으로 자신감 상승 (다음 시즌 컨디션 +${lv})` : `지난 시즌 부진으로 자신감 하락 (다음 시즌 컨디션 ${lv})`, 'info'); }
    car.trust = clamp(car.trust + clamp(d * 12, -8, 8), 0, 100);
    ss.carry = { lv, d: Math.round(d * 100) / 100, exp: Math.round(expR * 100) / 100 };
  }
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
    rating, minShare: ss.minShare, trophies: ss.trophies, trophyMiss: ss.trophyMiss || [], awards: ss.awards, ballon: ss.ballon && !(S.w.cer && !S.w.cer.rev && S.w.cer.y === ss.ballon.y) ? ss.ballon.rank : null, ballonTop: ss.ballon && !(S.w.cer && !S.w.cer.rev && S.w.cer.y === ss.ballon.y) ? ss.ballon.top.slice(0, 5).map(x => [x.n, x.club, !!x.me]) : [],
    tourn: ss.tourn ? { name: ss.tourn.name, stage: ss.tourn.stage, won: ss.tourn.won } : null,
    moments: ss.moments, injuries: ss.injuries || [], winter: ss.winter ? { from: w.clubs[ss.winter.from].name, to: w.clubs[ss.winter.to].name, type: ss.winter.type } : null,
    log: ss.matches.map(m => ({ ...C.logExtra(m), y: m.comp === 'youth' ? 1 : 0, d: m.d, c: m.comp, cn: m.compName, s: m.stage, o: m.oppName, h: m.home, gf: m.gf, ga: m.ga, p: m.played ? 1 : 0, st: m.start ? 1 : 0, mi: m.min || 0, r: m.rating || 0, g: m.played ? m.st.goals : 0, a: m.played ? m.st.assists : 0, mo: m.motm ? 1 : 0, w: m.why || '', pen: m.pens || '', ko: m.koWin, mm: m.moment ? m.moment.ok : undefined, yc: m.played ? m.st.yellow : 0, rc: m.played ? m.st.red : 0 })),
    shots: ss.matches.filter(m => m.played && m.shots && !['nt', 'ntY', 'youth'].includes(m.comp)).flatMap(m => m.shots).slice(0, 260),
    table: lg && ss.final[lg.id] ? ss.final[lg.id].map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) : null,
    cupOut: ss.CWon ? '우승' : ss.COut || '', lcupOut: ss.LCWon ? '우승' : ss.LCOut || '', contOut: ss.contWon ? '우승' : ss.contOut || '', contName: ss.cont ? C.COMPS[ss.cont].name : '', cupName: ss.cupName, lcupName: ss.lcupName,
    focus: car.focus, intensity: car.intensity, role: ss.role, money: p.money, perfBonus: ss.perfBonus || 0, income: ss.income,
    carry: ss.carry, ntA: C.totalAgg(ss.matches.filter(m => m.comp === 'nt')), ntY: C.totalAgg(ss.matches.filter(m => m.comp === 'ntY')),
    goal: ss.goalRes ? { label: ss.goalRes.goal.label, d: ss.goalRes.goal.d, ok: ss.goalRes.ok, v: ss.goalRes.v } : null
  };
  S.hist.push(rec);
  S.trophies.push(...ss.trophies); S.awards.push(...ss.awards.map(a => Object.assign({ y: ss.label }, a)));
  S.lastRole = ss.role;
  // 다음 시즌 준비
  car.years++;
  // 나이는 세계 연도(8월 1일 기준)마다 한 살 (시즌 길이가 달라도 1년에 한 번)
  if (S.ageY !== w.year) { p.age++; S.ageY = w.year; }
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
GM.freeYear = async function (S, onDay) {
  // 무소속 시즌: 개인 훈련만 (세계는 1년 진행)
  const p = S.p;
  await C.calRun(S, S.w.cal.d + 365, null, onDay);
  S.freeYears = (S.freeYears || 0) + 1;
  if (C.ach) C.ach.fire(S, 'free');
  const g = C.seasonGrowth(p, { minShare: 0, rating: 6.5, focus: S.car.focus, intensity: 'normal', clubLv: 55 });
  p.mods = p.mods.filter(m => --m.seasons > 0);
  S.hist.push({ y: S.w.year, label: `${S.w.year}/${String(S.w.year + 1).slice(2)}`, age: p.age, club: null, clubName: '무소속', short: 'FA', c1: '#555', c2: '#999', status: 'free', pos: p.pos, ovr0: g.o0, ovr1: C.ovrOf(p), total: C.blankStats(), agg: {}, nt: C.blankStats(), rating: 0, minShare: 0, trophies: [], awards: [], log: [], shots: [], moments: [], injuries: [] });
  if (S.ageY !== S.w.year) { p.age++; S.ageY = S.w.year; }
  pushValue(S);
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
  if (S.phase === 'endSeason') return null;
  const o = Object.assign({}, S); delete o.lastSeason; delete o.newsQ;
  if (o.ss) { o.ss = Object.assign({}, o.ss); delete o.ss.tables; } // 순위표는 세계 달력에 있는 것을 불러올 때 다시 연결
  if (!['preEvents', 'midEvents', 'goal'].includes(S.phase)) delete o.pend;
  if (S.phase !== 'winter') delete o.winterOffers;
  if (o.phase === 'review') o.phase = 'reviewDone';
  // 세계 달력의 진행 중 경기 기록은 따로 저장 ('calh')
  if (o.w && o.w.cal && !full) { o.w = Object.assign({}, o.w); o.w.cal = Object.assign({}, o.w.cal); delete o.w.cal.h; }
  // 시즌 보관 기록(w.arch)은 시즌별 키('ar:<시즌>')로 따로, 피로 기록(w.lastPl)은 저장하지 않는다
  if (o.w && !full && (o.w.arch || o.w.lastPl)) { o.w = Object.assign({}, o.w); delete o.w.arch; delete o.w.lastPl; }
  // 선수 기록(용량이 큰 부분)은 따로 저장한다: full=true면 포함 (파일 내보내기용)
  if (o.w && ((o.w.ps && !full) || o.w.mxPending || o.w.mxDrop || o.w.txPending || o.w.txDrop)) { o.w = Object.assign({}, o.w); if (!full) delete o.w.ps; delete o.w.mxPending; delete o.w.mxDrop; delete o.w.txPending; delete o.w.txDrop; delete o.w._tx; } // 경기 상세 기록도 따로 (시즌별 'mx:시즌')
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
GM.newWorld = function (startLg, dsk) {
  C.psDirty = true; C.psGen = (C.psGen || 0) + 1;
  const ds = dsBegin(dsk);
  const w = C.buildWorld();
  const S = { v: 1, mode: 'world', w, p: { name: '', nat: 'ENG', pos: 'ST', age: 0, a: {}, mods: [], hid: { inj: 1, lon: 1, pot: 0, peak: 27 }, traits: [], money: 0, rep: 0, morale: 60, weak: 1, skill: 1, num: 0 },
    car: { club: null, status: 'none', trust: 50 }, hist: [], flags: {}, phase: 'world', vh: [], trophies: [], awards: [], evLog: [], ws: [], created: Date.now() };
  C.calInit(S);
  if (C.mgrSeed) C.mgrSeed(w);
  if (C.ntmSeed) C.ntmSeed(w); // 대표팀 감독 (v39)
  if (C.rankInit) C.rankInit(w, true);
  if (C.crInit) C.crInit(w, true);
  if (C.legSeed && ds !== 'tm') C.legSeed(w);
  S.startLg = startLg || null;
  return dsEnd(S, ds);
};
// 관전 모드 시작일: 고른 리그의 개막 직전까지 조용히 진행 (유럽식 리그는 바로, 캘린더 리그는 다음 해 개막 전까지)
GM.worldStartDay = function (S, lgId) {
  const w = S.w, LS = lgId && w.cal.lg[lgId];
  if (!LS) return w.cal.d;
  let d = LS.dates[LS.ri] != null && LS.ri === 0 ? LS.dates[0] - 1 : null;
  if (d == null) { const nat = w.lg[lgId].nation, rg = C.seasonRange(nat, C.ymd(w.cal.d)[0] + 1); d = rg.start - 1; }
  return Math.max(w.cal.d, d);
};
// 관전: toDay(포함)까지 진행
GM.worldRun = async function (S, toDay, onDay, stop) { await C.calRun(S, toDay, null, onDay, stop); };
// 한 해(다음 8월 1일 마감)까지
GM.simWorldSeason = async function (S) {
  await C.calRun(S, C.day(S.w.year + 1, 8, 1));
  return (S.ws || [])[S.ws.length - 1];
};
})(typeof window !== 'undefined' ? window : globalThis);
