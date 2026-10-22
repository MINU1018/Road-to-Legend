// 터치라인 커리어 — 시즌: 일정, 출전, 경기별 세부 기록·평점, 대회 진행, 시즌 종료 처리
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, N, poisson, pick, wpick, shuffle, bern } = C;

// ---------- 날짜 ----------
const D0 = Date.UTC(2000, 0, 1);
const day = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - D0) / 864e5);
const toDate = n => new Date(D0 + n * 864e5);
C.day = day;
const fmtDate = n => { const d = toDate(n); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
const fmtDateY = n => { const d = toDate(n); return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`; };
Object.assign(C, { day, toDate, fmtDate, fmtDateY });
const nextDow = (n, dow) => { while (toDate(n).getUTCDay() !== dow) n++; return n; };

// ---------- 경기 기록 항목 ----------
const STATKEYS = ['apps', 'starts', 'min', 'goals', 'xg', 'xgot', 'npxg', 'shots', 'sot', 'headShots', 'penGoals', 'penTaken', 'assists', 'xa', 'passOk', 'passAtt', 'longOk', 'longAtt', 'thru', 'chances', 'bigCh', 'dribOk', 'dribAtt', 'duelW', 'duelA', 'aerW', 'aerA', 'touches', 'boxTouch', 'disp', 'foulsWon', 'defAct', 'tackles', 'ints', 'blocks', 'fouls', 'recov', 'ftRec', 'dribPast', 'clear', 'cs', 'concOn', 'xgaOn', 'yellow', 'red', 'saves', 'sotFaced', 'xgotFaced', 'gPrev', 'claims', 'ratingSum', 'rated', 'motm', 'wins', 'draws', 'losses'];
C.STATKEYS = STATKEYS;
const blankStats = () => Object.fromEntries(STATKEYS.map(k => [k, 0]));
function addStats(a, b) { for (const k of STATKEYS) a[k] += b[k] || 0; return a; }
C.blankStats = blankStats; C.addStats = addStats;

// 역할별 90분당 기준치
// pass, passAcc, long, thru, drib, duel, aer, box, disp, foulsWon, tck, int, clr, blk, rec, ftr, dribPast, fouls, yel
const RT = {
  ST: [22, 70, 1.0, .35, 2.0, 7, 5.5, 6.5, 1.9, 1.4, .45, .2, .7, .1, 2.5, .9, .3, 1.1, .12],
  W: [30, 77, 1.1, .5, 4.2, 9, 1.4, 4.0, 2.1, 1.5, .9, .4, .4, .2, 3.5, .8, .6, .8, .1],
  AM: [42, 80, 2.0, .9, 2.6, 8, 1.4, 2.6, 1.6, 1.6, 1.1, .5, .4, .2, 4.4, .9, .7, 1.0, .12],
  CM: [56, 85, 4.5, .8, 1.3, 7, 2.0, 1.1, .9, 1.1, 1.8, 1.0, 1.0, .3, 6.0, .7, .9, 1.1, .17],
  DM: [58, 87, 5.0, .5, .7, 8, 2.8, .4, .6, 1.0, 2.4, 1.6, 2.0, .4, 7.0, .6, .9, 1.3, .22],
  FB: [48, 81, 3.5, .35, 1.2, 8, 2.0, 1.0, .7, .9, 2.0, 1.2, 2.6, .4, 5.5, .5, 1.1, 1.0, .16],
  CB: [60, 88, 5.5, .25, .2, 5, 5.0, .4, .2, .5, 1.4, 1.4, 5.5, .8, 5.0, .2, .6, .9, .15],
  GK: [30, 76, 8, 0, 0, .3, .3, 0, .05, .1, 0, .1, .6, 0, 7.5, 0, 0, .05, .02]
};
// 팀 기대 득점 중 본인 슈팅 비중, 슈팅 1개당 평균 xG, 도움 비중, 헤더 비율, 박스 밖 비율
const SH = { ST: [.25, .14, .13, .24, .12], W: [.14, .10, .135, .08, .3], AM: [.085, .09, .135, .07, .42], CM: [.06, .07, .095, .1, .5], DM: [.028, .06, .05, .15, .55], FB: [.026, .06, .1, .12, .35], CB: [.04, .11, .02, .62, .08], GK: [0, .1, 0, 0, 0] };
const DEFW = { GK: 1, CB: .55, FB: .32, DM: .32, CM: .14, AM: 0, W: 0, ST: 0 };

function roleOf(p) { return C.ROLE[p.pos]; }
function q(a, k) { return a[k] || 50; }

// 한 경기 개인 기록 생성
// o: { lamT, lamO, minutes, start, sT, sO, penTaker, fkTaker, comp }
function playerMatch(p, o) {
  const a = p.a, role = roleOf(p), rt = RT[role], sh = SH[role];
  const st = blankStats(), f = o.minutes / 90;
  const mod = C.modSum(p) * .9 + (o.adj || 0); // 컨디션/일시 보정 (능력치 단위), 유스 리그는 리그 수준 보정
  const A = k => q(a, k) + mod;
  st.apps = 1; st.starts = o.start ? 1 : 0; st.min = o.minutes;
  const poss = clamp(.5 + (o.sT - o.sO) * .012, .3, .72);
  const shots = [];
  // --- 슈팅 ---
  const attQ = role === 'GK' ? 0 : Math.exp(((A('attPos') + A('finishing')) / 2 - 72) * .021);
  const share = sh[0] * attQ;
  const myXGexp = o.lamT * share * f;
  let nSh = poisson(myXGexp / sh[1]);
  let goals = 0;
  const kq = 1 - (o.sO - 70) * .006;
  for (let i = 0; i < nSh; i++) {
    const r = R();
    const type = r < sh[3] * (A('heading') / 70) ? 'head' : r < sh[3] * (A('heading') / 70) + sh[4] * (A('longShots') / 70) ? 'out' : 'in';
    let xg = type === 'head' ? rnd(.03, .2) : type === 'out' ? rnd(.02, .08) : clamp(.04 + Math.exp(N(-2.35, .85)), .03, .78);
    const qual = type === 'head' ? A('heading') : type === 'out' ? (A('longShots') * .7 + A('shotPower') * .3) : (A('finishing') * .8 + A('composure') * .2);
    const conv = clamp(.48 + (qual - 60) * .013, .4, 1.05) * kq;
    const goal = R() < xg * conv;
    const onT = goal || R() < clamp(.24 + (qual - 60) * .006, .15, .55);
    const sp = shotSpot(type, xg);
    shots.push({ x: sp[0], y: sp[1], xg: +xg.toFixed(2), g: goal ? 1 : 0, t: type === 'head' ? 'H' : (p.foot === 'L' ? (R() < .75 ? 'L' : 'R') : (R() < .78 ? 'R' : 'L')), on: onT ? 1 : 0 });
    st.shots++; st.xg += xg; st.npxg += xg; if (type === 'head') st.headShots++;
    if (onT) { st.sot++; st.xgot += goal ? xg * rnd(1.1, 1.9) : xg * rnd(.5, 1.1); }
    if (goal) goals++;
  }
  // 페널티
  if (o.penTaker && R() < .11 * f) {
    st.penTaken++; st.shots++; st.xg += .79; st.sot++;
    const pc = clamp(.55 + (A('penalties') - 55) * .009 + (A('composure') - 60) * .002, .55, .93);
    const g = R() < pc; if (g) { goals++; st.penGoals++; st.xgot += .95; } else st.xgot += .5;
    shots.push({ x: 50, y: 11, xg: .79, g: g ? 1 : 0, t: 'P', on: 1 });
  }
  // 직접 프리킥
  if (o.fkTaker && R() < .09 * f) {
    st.shots++; const xg = rnd(.04, .09); st.xg += xg; st.npxg += xg;
    const g = R() < xg * clamp(.6 + (A('fkAcc') + A('curve') - 120) * .02, .5, 2.6);
    const on = g || R() < .35; if (on) st.sot++; if (g) { goals++; st.xgot += .5; }
    shots.push({ x: rnd(30, 70), y: rnd(19, 27), xg: +xg.toFixed(2), g: g ? 1 : 0, t: 'F', on: on ? 1 : 0 });
  }
  st.goals = goals;
  // --- 팀 득점 (본인 외) ---
  const others = poisson(Math.max(.04, o.lamT - myXGexp));
  // --- 도움 ---
  const cre = role === 'W' || role === 'FB' ? (A('crossing') * .45 + A('dribbling') * .25 + A('vision') * .3) : (A('vision') * .5 + A('shortPass') * .35 + A('ballControl') * .15);
  const aq = Math.exp((cre - 70) * .016);
  const ash = sh[2] * aq;
  let assists = 0; const othersOn = binom(others, f);
  for (let i = 0; i < othersOn; i++) if (R() < ash * .95) assists++;
  st.assists = assists;
  st.xa = o.lamT * f * ash * N(1, .3) * .9 + assists * .12; if (st.xa < 0) st.xa = 0;
  st.chances = Math.max(assists, poisson(st.xa / .1));
  st.bigCh = Math.min(st.chances, poisson(st.chances * .2 + assists * .4));
  // --- 패스 ---
  const posF = role === 'GK' ? 1 : (.6 + poss * .8);
  st.passAtt = poisson(rt[0] * f * posF * (role === 'GK' ? 1 : (.85 + (A('shortPass') - 65) / 200)));
  const pAcc = role === 'GK' ? clamp(rt[1] + (A('gkKicking') - 60) * .35 + N(0, 6), 45, 96) : clamp(rt[1] + ((A('shortPass') + A('vision') + A('composure')) / 3 - 72) * .38 + (poss - .5) * 14 + N(0, 4.5), 50, 97);
  st.passOk = Math.round(st.passAtt * pAcc / 100);
  st.longAtt = poisson(rt[2] * f * (role === 'GK' ? 1 : (A('longPass') / 70)));
  st.longOk = binom(st.longAtt, clamp(.38 + ((role === 'GK' ? A('gkKicking') : A('longPass')) - 60) * .012, .25, .88));
  st.thru = poisson(rt[3] * f * Math.pow(A('vision') / 70, 2.2));
  // --- 드리블·경합 ---
  st.dribAtt = poisson(rt[4] * f * Math.pow(A('dribbling') / 70, 2) * (1 + (p.skill - 3) * .12));
  st.dribOk = binom(st.dribAtt, clamp(.32 + ((A('dribbling') + A('agility') + A('balance')) / 3 - 62) * .011, .2, .82));
  st.duelA = poisson(rt[5] * f) + st.dribAtt;
  const duelP = clamp(.42 + (A('strength') - 62) * .004 + (A('balance') - 62) * .002 + (['CB', 'FB', 'DM', 'CM'].includes(role) ? (A('standTackle') - 60) * .004 : (A('dribbling') - 60) * .003), .25, .75);
  st.duelW = st.dribOk + binom(st.duelA - st.dribAtt, duelP);
  st.aerA = poisson(rt[6] * f * (1 + (p.height - 180) * .02));
  st.aerW = binom(st.aerA, clamp(.28 + (A('heading') - 60) * .006 + (A('jumping') - 60) * .005 + (A('strength') - 60) * .003 + (p.height - 180) * .009, .1, .88));
  st.boxTouch = poisson(rt[7] * f * (A('attPos') / 70) * (.7 + poss * .6));
  st.disp = poisson(rt[8] * f * clamp(1.25 - (A('ballControl') - 60) / 90, .4, 1.6));
  st.foulsWon = poisson(rt[9] * f * (A('dribbling') / 70));
  // --- 수비 ---
  const dq = (A('defAware') + A('standTackle') + A('interceptions')) / 3;
  const defF = (1.35 - poss) * clamp(dq / 65, .5, 1.5);
  st.tackles = poisson(rt[10] * f * defF);
  st.ints = poisson(rt[11] * f * defF * (A('interceptions') / 70));
  st.clear = poisson(rt[12] * f * (1.3 - poss) * (role === 'GK' ? 1 : (A('heading') + A('defAware')) / 140));
  st.blocks = poisson(rt[13] * f * (1.3 - poss));
  st.recov = poisson(rt[14] * f * (.7 + A('reactions') / 200));
  st.ftRec = poisson(rt[15] * f * (A('aggression') / 70) * (A('stamina') / 70));
  st.dribPast = poisson(rt[16] * f * clamp(1.4 - (dq - 55) / 70, .4, 1.5));
  st.fouls = poisson(rt[17] * f * (A('aggression') / 65));
  st.defAct = st.tackles + st.ints + st.clear + st.blocks;
  if (R() < rt[18] * f * Math.pow(A('aggression') / 65, 1.3)) st.yellow = 1;
  if (R() < .004 * f * (A('aggression') / 70)) st.red = 1;
  st.touches = Math.round(st.passAtt * 1.18 + st.dribAtt + st.shots + st.recov * .6 + st.duelA * .3 + st.boxTouch * .4 + N(4, 2) * f);
  // --- 실점 ---
  let defMod = 1;
  if (role === 'GK') defMod = Math.exp(-((A('gkDiving') + A('gkReflexes') + A('gkPos') + A('gkHandling')) / 4 - 72) * .014);
  else defMod = 1 - (dq - 70) * .006 * DEFW[role] * f;
  const lamO = o.lamO * clamp(defMod, .6, 1.4);
  const oppG = poisson(lamO);
  const concOn = binom(oppG, f);
  st.concOn = concOn; st.xgaOn = o.lamO * f * N(1, .2);
  if (o.minutes >= 60 && concOn === 0) st.cs = 1;
  if (role === 'GK') {
    st.sotFaced = Math.max(concOn, poisson(o.lamO * 2.9 * f));
    st.saves = st.sotFaced - concOn;
    st.xgotFaced = o.lamO * f * N(1.05, .25); if (st.xgotFaced < .05) st.xgotFaced = .05;
    st.gPrev = st.xgotFaced - concOn;
    st.claims = poisson(1.3 * f * (A('gkPos') / 70));
  }
  return { st, gf: goals + others, ga: oppG, shots };
}
function binom(n, p) { let k = 0; for (let i = 0; i < n; i++) if (R() < p) k++; return k; }
function shotSpot(type, xg) {
  // x: 0~100(가로), y: 골라인에서의 거리(m)
  if (type === 'head') return [rnd(38, 62), rnd(4, 12)];
  if (type === 'out') return [rnd(18, 82), rnd(18, 31)];
  const dist = clamp(22 - xg * 26 + N(0, 2.5), 4, 17);
  return [clamp(N(50, 9 + dist), 22, 78), dist];
}
C.playerMatch = playerMatch;

// 평점 (FotMob 스타일)
function matchRating(p, st, res) {
  const role = roleOf(p), f = st.min / 90;
  if (st.min < 10) return 0;
  const att = ['ST', 'W', 'AM'].includes(role);
  let r = 6.05 + .25 * f;
  r += st.goals * (att ? .82 : 1.05) + st.assists * .6 + st.chances * .09 + st.bigCh * .12;
  r += st.sot * .06 - (st.shots - st.sot) * .025 - (st.penTaken - st.penGoals) * .45;
  r += st.dribOk * .07 - (st.dribAtt - st.dribOk) * .025;
  r += st.aerW * .045 + st.duelW * .025 - (st.duelA - st.duelW) * .018;
  r += st.tackles * .065 + st.ints * .07 + st.clear * .03 + st.blocks * .08 + st.recov * .014 + st.ftRec * .04;
  r -= st.disp * .05 + st.dribPast * .07 + st.fouls * .03 + st.yellow * .2 + st.red * 1.3;
  if (st.passAtt > 5) r += ((st.passOk / st.passAtt * 100) - RT[role][1]) * .012 * f;
  r += st.passOk * .004 + st.thru * .05 + st.longOk * .015;
  r += res > 0 ? .28 * f : res < 0 ? -.28 * f : 0;
  if (['CB', 'FB', 'DM', 'GK'].includes(role)) { if (st.cs) r += role === 'GK' ? .55 : .35; r -= st.concOn * (role === 'GK' ? .2 : .12); }
  if (role === 'GK') r += st.saves * .17 + st.gPrev * .35 + st.claims * .04;
  r += N(0, .2);
  return +clamp(r, 3.2, 10).toFixed(1);
}
C.matchRating = matchRating;

// ---------- 스쿼드 내 역할 ----------
const ROLELABEL = { key: '핵심 선수', starter: '주전', rotation: '로테이션', backup: '백업', reserve: '스쿼드 외', youth: '유스' };
C.ROLELABEL = ROLELABEL;
function squadRole(S, clubId) {
  const p = S.p, c = S.w.clubs[clubId], slot = C.SLOT[p.pos];
  const me = C.effOvr(p) + (S.car.trust - 50) * .06 + (S.car.formAdj || 0) + (S.car.bias || 0);
  const riv = c.lite ? C.liteRivals(c, slot, S.w.year) : c.sq.filter(e => C.SLOT[e[1]] === slot).map(e => e[2]).sort((a, b) => b - a);
  const rank = riv.filter(v => v > me + .5).length;
  const n = C.SLOTN[slot];
  let role = rank < n ? (me >= c.str + 3 ? 'key' : 'starter') : rank === n ? 'rotation' : rank === n + 1 ? 'backup' : 'reserve';
  // 선수층이 얇아도 팀 수준에 한참 못 미치면 주전이 될 수 없다
  const RK = ['reserve', 'backup', 'rotation', 'starter', 'key'], gap = me - c.str;
  const cap = gap < -12 ? 0 : gap < -8 ? 1 : gap < -5 ? 2 : 4;
  if (RK.indexOf(role) > cap) role = RK[cap];
  return { role, rank, n, rivals: riv.slice(0, n + 2), me };
}
C.squadRole = squadRole;
const STARTP = { key: .94, starter: .86, rotation: .46, backup: .16, reserve: .04 };
const SUBP = { key: .8, starter: .65, rotation: .6, backup: .42, reserve: .14 };

// ---------- 시즌 준비 ----------
function clubOf(S) { return S.w.clubs[S.car.club]; }
C.clubOf = clubOf;
function leagueOf(S, id) { const c = S.w.clubs[id || S.car.club]; return c && c.lg ? S.w.lg[c.lg] : null; }
C.leagueOf = leagueOf;

function setupSeason(S) {
  const w = S.w, y = w.year, p = S.p, car = S.car;
  const club = clubOf(S), lg = leagueOf(S);
  const ss = { year: y, label: `${y}/${String(y + 1).slice(2)}`, club: club.id, status: car.status, fx: [], i: 0, half: 1, matches: [], tables: {}, alive: {}, cont: null, inj: 0, susp: 0, yellows: 0, events: [], moments: [], momentsLeft: 0, trustStart: car.trust };
  S.ss = ss;
  car.bias = N(0, 1.8); // 이번 시즌 감독이 나를 얼마나 선호하는지
  car.formAdj = clamp((p.morale - 60) / 25, -1.2, 1.2); // 사기가 시즌 초반 폼을 정한다
  const start = day(y, 8, 9), end = day(y + 1, 5, 24);
  // 리그
  if (lg) {
    const rounds = C.roundRobin(lg.clubs);
    ss.rounds = rounds; ss.tables[lg.id] = C.newTable(lg.clubs);
    rounds.forEach((ms, r) => {
      const d = nextDow(start + Math.round(r * (end - start) / rounds.length), 6);
      const m = ms.find(x => x[0] === club.id || x[1] === club.id);
      ss.fx.push({ d, k: 'L', r, opp: m ? (m[0] === club.id ? m[1] : m[0]) : null, home: m ? m[0] === club.id : false });
    });
  }
  // 유스 리그 (유스 선수, 또는 출전이 적은 21세 이하 1군 선수의 U21·B팀 경기)
  const sr0 = car.status !== 'youth' ? squadRole(S, club.id) : null;
  ss.reserve = !!(sr0 && p.age <= 21 && ['backup', 'reserve'].includes(sr0.role));
  if (car.status === 'youth' || ss.reserve) {
    for (let i = 0; i < 22; i++) ss.fx.push({ d: nextDow(start + 7 + Math.round(i * (end - start - 20) / 22), 0), k: 'Y' });
  }
  // 국내 컵
  const nat = lg ? lg.nation : club.nat;
  if (C.CUPNAME[nat]) {
    const dates = [day(y, 9, 17), day(y, 10, 29), day(y + 1, 1, 10), day(y + 1, 2, 7), day(y + 1, 3, 7), day(y + 1, 4, 18), day(y + 1, 5, 23)];
    const names = ['1라운드', '2라운드', '3라운드', '4라운드', '8강', '4강', '결승'];
    const entry = lg ? Math.min(2, lg.tier - 1 >= 0 ? 3 - Math.min(lg.tier, 3) : 0) : 0;
    ss.cupRounds = dates.slice(entry).map((d, i) => ({ d: nextDow(d, 3), name: names[entry + i] }));
    ss.cupRounds.forEach((r, i) => ss.fx.push({ d: r.d, k: 'C', r: i }));
    ss.alive.C = true; ss.cupName = C.CUPNAME[nat];
  }
  if (C.LCUPNAME[nat] && lg && lg.tier <= 4) {
    const dates = [day(y, 8, 13), day(y, 8, 27), day(y, 9, 24), day(y, 10, 29), day(y, 12, 17), day(y + 1, 1, 14), day(y + 1, 3, 15)];
    const names = ['1라운드', '2라운드', '3라운드', '16강', '8강', '4강', '결승'];
    const entry = lg.tier === 1 ? 2 : lg.tier === 2 ? 1 : 0;
    ss.lcupRounds = dates.slice(entry).map((d, i) => ({ d: nextDow(d, 2), name: names[entry + i] }));
    ss.lcupRounds.forEach((r, i) => ss.fx.push({ d: r.d, k: 'LC', r: i }));
    ss.alive.LC = true; ss.lcupName = C.LCUPNAME[nat];
  }
  // 대륙 대회
  const parts = C.contParticipants(w);
  ss.allCont = {};
  for (const k in parts) {
    const cs = setupCont(w, k, parts[k], y);
    ss.allCont[k] = cs;
    if (parts[k].includes(club.id)) { ss.cont = k; cs.dates.forEach((d, i) => ss.fx.push({ d, k: 'E', r: i })); }
  }
  // 국가대표
  setupNational(S, ss);
  ss.fx.sort((a, b) => a.d - b.d || (a.k === 'L' ? -1 : 1));
  ss.split = day(y + 1, 1, 1);
  // 출전 확률 계산용 역할
  updateRole(S);
  ss.penTaker = isPenTaker(S); ss.fkTaker = isFkTaker(S);
  ss.momentsLeft = momentQuota(S);
  return ss;
}
C.setupSeason = setupSeason;
function momentQuota(S) { const r = S.ss.role; const m = { off: 0, low: .5, normal: 1, high: 1.8 }[C.cfg.moments]; const base = S.car.status === 'youth' ? 1 : ({ key: 2, starter: 2, rotation: 1, backup: 1, reserve: 0 })[r] || 1; return m === 0 ? 0 : Math.max(m >= 1 ? base : 0, Math.round(base * (m == null ? 1 : m))); }
function updateRole(S) {
  const ss = S.ss;
  if (S.car.status === 'youth') {
    const sr = squadRole(S, S.car.club);
    ss.role = 'youth'; ss.sr = sr;
    // 1군 데뷔 확률: 1군 언저리 수준(팀 전력 −10)과의 차이로 결정
    const gap = sr.me - (S.w.clubs[S.car.club].str - 10);
    ss.fteam = clamp(.25 * Math.exp(gap * .15), .01, .6);
  } else { const sr = squadRole(S, S.car.club); ss.role = sr.role; ss.sr = sr; }
}
C.updateRole = updateRole;
function isPenTaker(S) { const a = S.p.a, r = roleOf(S.p); return a.penalties >= (['ST', 'AM', 'W'].includes(r) ? 68 : 80) && ['key', 'starter'].includes(S.ss.role); }
function isFkTaker(S) { const a = S.p.a; return (a.fkAcc + a.curve) / 2 >= 74 && ['key', 'starter'].includes(S.ss.role); }

// 대륙 대회 구성
function setupCont(w, k, teams, y) {
  const def = C.COMPS[k];
  const cs = { k, name: def.name, teams: teams.slice(), opp: {}, table: C.newTable(teams), done: false, ko: [], winner: null, userOut: false };
  const pd = [day(y, 9, 17), day(y, 10, 1), day(y, 10, 22), day(y, 11, 5), day(y, 11, 26), day(y, 12, 10), day(y + 1, 1, 21), day(y + 1, 1, 28)].slice(0, def.phase);
  // 리그 페이즈 대진
  if (def.phase) {
    for (const t of teams) cs.opp[t] = cs.opp[t] || [];
    const order = shuffle(teams.slice());
    for (const t of order) {
      let guard = 0;
      while (cs.opp[t].length < def.phase && guard++ < 200) {
        const o = pick(teams);
        if (o === t || cs.opp[t].some(x => x[0] === o) || cs.opp[o].length >= def.phase) continue;
        if (w.clubs[o].nat === w.clubs[t].nat && guard < 120) continue;
        const h = R() < .5; cs.opp[t].push([o, h]); cs.opp[o].push([t, !h]);
      }
    }
  }
  const kd = [[day(y + 1, 2, 17), day(y + 1, 2, 24), '플레이오프'], [day(y + 1, 3, 10), day(y + 1, 3, 17), '16강'], [day(y + 1, 4, 7), day(y + 1, 4, 14), '8강'], [day(y + 1, 4, 28), day(y + 1, 5, 5), '4강'], [day(y + 1, 5, 30), null, '결승']];
  const nKO = Math.log2(def.ko);
  const rounds = (def.playoff ? [kd[0]] : []).concat(kd.slice(1).slice(4 - nKO));
  cs.rounds = rounds;
  cs.dates = pd.slice();
  for (const r of rounds) { cs.dates.push(r[0]); if (r[1]) cs.dates.push(r[1]); }
  cs.phaseN = pd.length;
  return cs;
}

// 국가대표 일정
function setupNational(S, ss) {
  const y = ss.year, p = S.p;
  const pools = C.nationPools(S.w); ss.pools = pools;
  const pool = pools[p.nat];
  const g = C.NTG[p.pos];
  const me = C.effOvr(p);
  const arr = pool ? pool[g] : [];
  const rank = arr.filter(v => v > me).length;
  const [squadN, startN] = C.NTSLOTS[g];
  ss.ntStr = C.nationStrength(pool);
  ss.ntRank = rank;
  const age = p.age;
  if (rank < squadN && me >= 58) ss.nt = { lvl: 'A', start: rank < startN ? .85 : rank < startN + 2 ? .45 : .18 };
  else if (age <= 20 && me >= ss.ntStr - 20) ss.nt = { lvl: age <= 17 ? 'U17' : 'U20', start: me >= ss.ntStr - 14 ? .85 : .5 };
  else if (age <= 22 && me >= ss.ntStr - 15) ss.nt = { lvl: 'U21', start: .7 };
  else ss.nt = null;
  if (!ss.nt) return;
  const wins = [[9, 5], [9, 9], [10, 10], [10, 14], [11, 14], [11, 18], [3, 26], [3, 30], [6, 6], [6, 10]];
  wins.forEach(([m, d], i) => ss.fx.push({ d: day(m >= 8 ? y : y + 1, m, d), k: 'N', r: i }));
}

// ---------- 시즌 진행 ----------
// hooks.moment(ctx) → Promise<{goal?, saved?, ok}>  (없으면 자동 처리)
async function simUntil(S, untilDay, hooks) {
  const ss = S.ss;
  while (ss.i < ss.fx.length && ss.fx[ss.i].d < untilDay) {
    const fx = ss.fx[ss.i++];
    if (ss.inj > 0) ss.inj = Math.max(0, ss.inj - (fx.d - (ss.lastDay || fx.d)));
    ss.lastDay = fx.d;
    if (fx.k === 'L') await doLeague(S, fx, hooks);
    else if (fx.k === 'Y') await doYouth(S, fx, hooks);
    else if (fx.k === 'C') await doCup(S, fx, hooks, 'C');
    else if (fx.k === 'LC') await doCup(S, fx, hooks, 'LC');
    else if (fx.k === 'E') await doCont(S, fx, hooks);
    else if (fx.k === 'N') await doNational(S, fx, hooks);
  }
}
C.simUntil = simUntil;
const halfEnd = S => S.ss.half === 1 ? S.ss.split : day(S.ss.year + 1, 7, 1);
C.halfEnd = halfEnd;

function teamStr(S, clubId, withMe) {
  const c = S.w.clubs[clubId];
  if (!withMe) return c.str;
  return C.xiStrength(c.sq, ['me', S.p.pos, C.effOvr(S.p), S.p.age]);
}
// 이번 시즌 1군 출전 현황 (유스·대표팀 제외)
function proForm(ss) {
  const ms = ss.matches.filter(m => !['youth', 'nt', 'ntY'].includes(m.comp));
  const pl = ms.filter(m => m.played), rated = pl.filter(m => m.rating);
  const last = ms.slice(-5).filter(m => m.played).length;
  const ym = ss.matches.filter(m => m.comp === 'youth' && m.played && m.rating);
  ss.yth = { n: ym.length, avg: ym.length ? ym.reduce((a, m) => a + m.rating, 0) / ym.length : 0 };
  return { apps: pl.length, avg: rated.length ? rated.reduce((a, m) => a + m.rating, 0) / rated.length : 0, recent: last };
}
C.proForm = proForm;
function selection(S, kind, imp) {
  const ss = S.ss;
  if (ss.inj > 0 || ss.susp > 0) { if (ss.susp > 0 && kind !== 'N') ss.susp--; return null; }
  let ps, pb;
  const pro = proForm(ss);
  if (ss.role === 'youth') {
    if (kind === 'Y') {
      // 1군에 자리 잡으면 유스 리그는 뛰지 않는다
      if (pro.apps >= 12 || pro.recent >= 3) return null;
      if (pro.apps >= 6) { ps = .2; pb = .1; } else { ps = .88; pb = .8; }
    } else {
      // 유스에서 잘하면 1군 기회가 늘고, 1군에서 잘하면 더 늘어난다
      const yb = ss.yth.n >= 4 ? clamp((ss.yth.avg - 6.85) * 1.5, -.6, 1.6) : 0;
      const pb2 = pro.apps >= 2 ? clamp((pro.avg - 6.6) * 1.2, -.5, 1.2) : 0;
      const f = clamp(ss.fteam * (1 + yb + pb2) + (pro.apps >= 4 ? .1 : 0), 0, .9) * (kind === 'C' || kind === 'LC' ? 1.6 : 1);
      ps = f * .3; pb = f * .6;
    }
  } else {
    ps = STARTP[ss.role]; pb = SUBP[ss.role];
    if (kind === 'C' || kind === 'LC') { if (ss.role === 'key' || ss.role === 'starter') ps *= imp >= 2 ? 1 : .62; else ps = Math.min(.85, ps + .45); }
    if (kind === 'Y') { if (!ss.reserve || pro.apps >= 10 || pro.recent >= 3) return null; ps = ['backup', 'reserve'].includes(ss.role) ? (pro.apps >= 5 ? .35 : .8) : .1; pb = .3; }
  }
  const form = clamp((S.car.formAdj || 0) * .03, -.12, .12);
  if (R() < clamp(ps + form, 0, .97)) { const full = R() < (S.p.a.stamina > 75 ? .72 : .58); return { start: true, minutes: full ? 90 : rint(58, 88) }; }
  if (R() < pb) return { start: false, minutes: rint(4, 34) };
  return null;
}

// 경기 하나 처리 (본인 팀)
async function userMatch(S, o, hooks) {
  // o: { d, kind, compKey, compName, opp, oppName, oppStr, home, imp(중요도 0~3), stage, ko, natTeam }
  const ss = S.ss, p = S.p;
  const sel = selection(S, o.kind, o.imp || 0);
  const myStr = o.myStr != null ? o.myStr : teamStr(S, ss.club, !!(sel && sel.start));
  const home = o.home === null ? 0 : o.home ? 1 : -1;
  let [lamT, lamO] = C.lambdas(myStr, o.oppStr, home);
  let rec = { d: o.d, comp: o.compKey, compName: o.compName, stage: o.stage || '', opp: o.opp, oppName: o.oppName, home: o.home, gf: 0, ga: 0, played: false };
  if (sel) {
    const r = playerMatch(p, { adj: o.adj || 0, lamT, lamO, minutes: sel.minutes, start: sel.start, sT: myStr, sO: o.oppStr, penTaker: ss.penTaker && sel.start, fkTaker: ss.fkTaker && sel.start, comp: o.kind });
    rec.gf = r.gf; rec.ga = r.ga; rec.st = r.st; rec.shots = r.shots; rec.played = true; rec.start = sel.start; rec.min = sel.minutes;
    // 결정적 순간
    if (hooks && ss.momentsLeft > 0 && sel.minutes >= 25) {
      const remaining = ss.fx.length - ss.i + 1;
      const chance = clamp(ss.momentsLeft / Math.max(4, remaining * .55) * (1 + (o.imp || 0) * .9), 0, .95);
      if (o.stage === '결승' || R() < chance) {
        ss.momentsLeft--;
        const mc = C.makeMoment(S, rec, o);
        if (mc) {
          const res = hooks.moment ? await hooks.moment(mc) : C.autoMoment(S, mc);
          C.applyMoment(S, rec, mc, res);
          ss.moments.push({ d: o.d, type: mc.type, title: mc.title, ok: res.ok, opp: o.oppName, comp: o.compName, text: res.text || '' });
        }
      }
    }
    const res = rec.gf > rec.ga ? 1 : rec.gf < rec.ga ? -1 : 0;
    rec.rating = matchRating(p, rec.st, res);
    if (rec.st.min >= 10) { rec.st.ratingSum = rec.rating; rec.st.rated = 1; }
    if (res > 0) rec.st.wins = 1; else if (res < 0) rec.st.losses = 1; else rec.st.draws = 1;
    if (rec.rating >= 8.3 || (rec.rating >= 7.9 && res > 0 && rec.st.goals + rec.st.assists >= 2)) { rec.st.motm = 1; rec.motm = true; }
    // 신뢰도·폼
    S.car.trust = clamp(S.car.trust + (rec.rating - 6.85) * 1.6 * (sel.start ? 1 : .5), 0, 100);
    ss.recent = (ss.recent || []).concat(rec.rating).slice(-6);
    S.car.formAdj = clamp(((ss.recent.reduce((a, b) => a + b, 0) / ss.recent.length) - 6.85) * 2.4, -3, 3);
    // 카드·부상
    if (rec.st.red) { ss.susp += rint(1, 3); }
    if (rec.st.yellow && o.kind === 'L') { ss.yellows++; if (ss.yellows % 5 === 0) ss.susp += 1; }
    injuryRoll(S, rec, sel.minutes);
  } else {
    const [a, b] = C.quickMatch(myStr, o.oppStr, home); rec.gf = a; rec.ga = b;
    rec.why = ss.inj > 0 ? '부상' : ss.susp > 0 ? '징계' : '미출전';
  }
  ss.matches.push(rec);
  if (C.extras) C.extras.onMatch(S, rec);
  if (hooks && hooks.match) await hooks.match(rec);
  return rec;
}
function injuryRoll(S, rec, minutes) {
  const p = S.p, ss = S.ss;
  const it = C.INTENSITY[S.car.intensity || 'normal'][2] * (S.car.focus === 'care' ? .75 : 1);
  const pr = .0068 * p.hid.inj * C.diff().inj * ({ low: .6, normal: 1, high: 1.4 }[C.cfg.injuries] || 1) * it * (p.age > 30 ? 1 + (p.age - 30) * .09 : 1) * (minutes / 90);
  if (R() < pr) {
    const t = R();
    const days = t < .55 ? rint(6, 14) : t < .85 ? rint(15, 35) : t < .96 ? rint(36, 90) : rint(120, 260);
    const kinds = days < 15 ? ['발목 염좌', '타박상', '근육 피로', '허벅지 경미한 부상'] : days < 36 ? ['햄스트링 부상', '종아리 근육 부상', '사타구니 부상', '발목 인대 부상'] : days < 91 ? ['허벅지 근육 파열', '중족골 골절', '무릎 내측 인대 부상'] : ['전방십자인대 파열', '아킬레스건 파열', '정강이뼈 골절'];
    ss.inj = days; rec.injury = { days, kind: pick(kinds) };
    ss.injuries = (ss.injuries || []).concat({ d: rec.d, days, kind: rec.injury.kind });
    if (days >= 90) { // 장기 부상: 신체 능력 저하
      for (const k of ['accel', 'sprint', 'agility']) C.bump(p, k, -rnd(1, 3.5));
      p.hid.pot -= rint(0, 2);
    }
  }
}
C.userMatch = userMatch;

async function doLeague(S, fx, hooks) {
  const ss = S.ss, lg = leagueOf(S, ss.club);
  const tb = ss.tables[lg.id];
  // 같은 라운드의 다른 경기
  for (const [a, b] of ss.rounds[fx.r]) {
    if (a === ss.club || b === ss.club) continue;
    const [ga, gb] = C.quickMatch(S.w.clubs[a].str, S.w.clubs[b].str, 1); C.addResult(tb, a, b, ga, gb);
  }
  if (!fx.opp) return;
  const oc = S.w.clubs[fx.opp];
  const sorted = C.sortTable(tb), myPos = sorted.findIndex(r => r.id === ss.club), opPos = sorted.findIndex(r => r.id === fx.opp);
  const imp = (fx.r > ss.rounds.length * .75 ? 1 : 0) + (opPos < 4 && myPos < 6 ? 1 : 0) + (oc.str > S.w.clubs[ss.club].str + 3 ? 1 : 0);
  const rec = await userMatch(S, { d: fx.d, kind: 'L', compKey: 'league', compName: lg.name, opp: fx.opp, oppName: oc.name, oppStr: oc.str, home: fx.home, imp }, hooks);
  if (fx.home) C.addResult(tb, ss.club, fx.opp, rec.gf, rec.ga); else C.addResult(tb, fx.opp, ss.club, rec.ga, rec.gf);
}
async function doYouth(S, fx, hooks) {
  const u21 = !(S.ss.status === 'youth' && S.p.age <= 17);
  const ss = S.ss, lv = 47 + (S.w.clubs[ss.club].str - 70) * .5 + (u21 ? 5 : 0);
  const oppName = pick(['U18', 'U21']) === 'U18' ? ['U18 리그'] : ['U21 리그'];
  const oppStr = N(lv, 3), myStr = lv + 2 + (C.effOvr(S.p) - lv) * .12;
  const opp = pick(Object.values(S.w.clubs).filter(c => c.nat === S.w.clubs[ss.club].nat && c.id !== ss.club)) || S.w.clubs[ss.club];
  await userMatch(S, { d: fx.d, kind: 'Y', compKey: 'youth', compName: S.ss.status === 'youth' && S.p.age <= 17 ? 'U18 리그' : 'U21 리그', opp: opp.id, oppName: opp.name + (S.ss.status === 'youth' && S.p.age <= 17 ? ' U18' : ' U21'), oppStr, myStr, adj: clamp(69 - lv, 0, 24), home: R() < .5, imp: 0 }, hooks);
}
async function doCup(S, fx, hooks, k) {
  const ss = S.ss, w = S.w;
  if (!ss.alive[k]) return;
  const rounds = k === 'C' ? ss.cupRounds : ss.lcupRounds, rd = rounds[fx.r];
  const nat = w.clubs[ss.club].nat;
  const final = fx.r === rounds.length - 1;
  const left = rounds.length - fx.r;
  const pool = Object.values(w.clubs).filter(c => c.lg && w.lg[c.lg].nation === nat && c.id !== ss.club && (left > 3 ? true : w.lg[c.lg].tier <= (left > 2 ? 3 : 2)));
  const opp = wpick(pool, c => Math.exp((c.str - 70) * (left <= 3 ? .18 : .05)));
  const name = k === 'C' ? ss.cupName : ss.lcupName;
  const rec = await userMatch(S, { d: fx.d, kind: k, compKey: k === 'C' ? 'cup' : 'lcup', compName: name, stage: rd.name, opp: opp.id, oppName: opp.name, oppStr: opp.str, home: final ? null : R() < .5, imp: final ? 3 : left <= 3 ? 2 : 0 }, hooks);
  let win = rec.gf > rec.ga;
  if (rec.gf === rec.ga) { win = C.koWinner(w.clubs[ss.club].str, opp.str, 0, 0) === 0; rec.pens = win ? 'W' : 'L'; }
  rec.koWin = win;
  if (!win) { ss.alive[k] = false; ss[k + 'Out'] = rd.name; }
  else if (final) { ss[k + 'Won'] = true; ss.alive[k] = false; }
}
async function doCont(S, fx, hooks) {
  const ss = S.ss, w = S.w, cs = ss.allCont[ss.cont];
  if (cs.userOut && cs.done) return;
  const def = C.COMPS[ss.cont];
  if (fx.r < cs.phaseN) {
    if (cs.userOut) return;
    const [oid, h] = cs.opp[ss.club][fx.r] || [];
    if (!oid) { if (fx.r === cs.phaseN - 1) finishPhase(S, cs); return; }
    const oc = w.clubs[oid];
    const rec = await userMatch(S, { d: fx.d, kind: 'E', compKey: 'cont', compName: cs.name, stage: '리그 페이즈', opp: oid, oppName: oc.name, oppStr: oc.str, home: h, imp: oc.str > w.clubs[ss.club].str + 2 ? 2 : 1 }, hooks);
    if (h) C.addResult(cs.table, ss.club, oid, rec.gf, rec.ga); else C.addResult(cs.table, oid, ss.club, rec.ga, rec.gf);
    if (fx.r === cs.phaseN - 1) finishPhase(S, cs);
    return;
  }
  // 녹아웃
  let j = fx.r - cs.phaseN, ri = 0;
  for (; ri < cs.rounds.length; ri++) { const n = cs.rounds[ri][1] ? 2 : 1; if (j < n) break; j -= n; }
  const rd = cs.rounds[ri]; if (!rd) return;
  if (!cs.phaseDone && def.phase === 0 && ri === 0) { cs.ko = [cs.teams.slice()]; cs.phaseDone = true; }
  if (!cs.phaseDone) finishPhase(S, cs);
  if (j === 0) drawKO(S, cs, ri);
  const tie = cs.ties[ri] && cs.ties[ri].find(t => t[0] === ss.club || t[1] === ss.club);
  if (!tie) { if (j === 0 || !rd[1]) resolveOthers(S, cs, ri); return; }
  const oid = tie[0] === ss.club ? tie[1] : tie[0], oc = w.clubs[oid];
  const final = !rd[1];
  const rec = await userMatch(S, { d: fx.d, kind: 'E', compKey: 'cont', compName: cs.name, stage: rd[2] + (final ? '' : j === 0 ? ' 1차전' : ' 2차전'), opp: oid, oppName: oc.name, oppStr: oc.str, home: final ? null : (j === 0) === (tie[0] === ss.club), imp: final ? 3 : 2 }, hooks);
  tie.agg = tie.agg || [0, 0]; tie.agg[0] += rec.gf; tie.agg[1] += rec.ga;
  if (final || j === 1) {
    let win = tie.agg[0] > tie.agg[1];
    if (tie.agg[0] === tie.agg[1]) { win = C.koWinner(w.clubs[ss.club].str, oc.str, 0, 0) === 0; rec.pens = win ? 'W' : 'L'; }
    rec.koWin = win; if (!final) rec.agg = tie.agg.slice();
    tie.win = win ? ss.club : oid;
    if (!win) { cs.userOut = true; ss.contOut = rd[2]; }
    if (final) { cs.winner = tie.win; cs.done = true; if (win) ss.contWon = true; }
    resolveOthers(S, cs, ri);
  }
}
function finishPhase(S, cs) {
  // 사용자 경기 외 리그 페이즈 결과
  const w = S.w, uid = S.ss.club;
  for (const t of cs.teams) for (const [o, h] of cs.opp[t] || []) {
    if (!h || t === uid || o === uid) continue;
    const [a, b] = C.quickMatch(w.clubs[t].str, w.clubs[o].str, 1); C.addResult(cs.table, t, o, a, b);
  }
  const sorted = C.sortTable(cs.table).map(r => r.id);
  cs.phaseRank = sorted;
  const def = C.COMPS[cs.k];
  if (def.playoff) { cs.direct = sorted.slice(0, 8); cs.po = sorted.slice(8, 24); }
  else cs.direct = sorted.slice(0, def.ko);
  cs.phaseDone = true;
  if (!sorted.slice(0, def.playoff ? 24 : def.ko).includes(uid)) { cs.userOut = true; S.ss.contOut = '리그 페이즈'; }
}
function drawKO(S, cs, ri) {
  cs.ties = cs.ties || [];
  if (cs.ties[ri]) return;
  const def = C.COMPS[cs.k];
  let pool;
  if (ri === 0 && def.playoff) pool = cs.po.slice();
  else if (ri === (def.playoff ? 1 : 0)) pool = (cs.direct || []).concat(def.playoff && cs.ties[0] ? cs.ties[0].map(t => t.win) : []);
  else pool = cs.ties[ri - 1].map(t => t.win);
  if (def.phase === 0 && ri === 0) pool = cs.teams.slice(0, 16);
  pool = shuffle(pool.filter(Boolean));
  cs.ties[ri] = []; for (let i = 0; i + 1 < pool.length; i += 2) cs.ties[ri].push([pool[i], pool[i + 1]]);
}
function resolveOthers(S, cs, ri) {
  const w = S.w;
  for (const t of cs.ties[ri] || []) {
    if (t.win) continue;
    if (t[0] === S.ss.club || t[1] === S.ss.club) continue;
    const s0 = w.clubs[t[0]].str, s1 = w.clubs[t[1]].str;
    const single = !cs.rounds[ri][1];
    let a = 0, b = 0;
    if (single) { [a, b] = C.quickMatch(s0, s1, 0); } else { const m1 = C.quickMatch(s0, s1, 1), m2 = C.quickMatch(s1, s0, 1); a = m1[0] + m2[1]; b = m1[1] + m2[0]; }
    t.win = C.koWinner(s0, s1, a, b) === 0 ? t[0] : t[1];
  }
  if (ri === cs.rounds.length - 1) { cs.done = true; cs.winner = cs.ties[ri][0] && cs.ties[ri][0].win; }
}
// 사용자가 떨어진 뒤 남은 대륙 대회 결과
function finishContAll(S) {
  const ss = S.ss;
  for (const k in ss.allCont) {
    const cs = ss.allCont[k];
    if (cs.done) continue;
    if (!cs.phaseDone) { if (C.COMPS[k].phase) finishPhase({ w: S.w, ss: { club: k === ss.cont ? ss.club : '__' } }, cs); else cs.phaseDone = true; }
    for (let ri = 0; ri < cs.rounds.length; ri++) { drawKO(S, cs, ri); const save = ss.club; if (k !== ss.cont) ss.club = '__'; resolveOthers(S, cs, ri); ss.club = save; }
  }
}
// 국가대표 경기
async function doNational(S, fx, hooks) {
  const ss = S.ss, p = S.p;
  if (!ss.nt) return;
  const conf = C.confOf(p.nat);
  const opps = Object.keys(ss.pools).filter(n => n !== p.nat && C.confOf(n) === conf && ss.pools[n].all.length >= 8);
  const opp = opps.length ? pick(opps) : pick(Object.keys(ss.pools).filter(n => n !== p.nat));
  const youth = ss.nt.lvl !== 'A';
  const myS = youth ? ss.ntStr - 14 : ss.ntStr, oS = (youth ? -14 : 0) + C.nationStrength(ss.pools[opp]) + N(0, 1.5);
  const label = youth ? `${C.natName(p.nat)} ${ss.nt.lvl}` : C.natName(p.nat);
  const save = ss.role; ss.role = '__nt';
  const sel0 = { start: R() < ss.nt.start, minutes: 0 };
  ss.role = save;
  // 국가대표는 별도 출전 판정
  const inj = ss.inj > 0;
  const rec = { d: fx.d, comp: youth ? 'ntY' : 'nt', compName: youth ? `${ss.nt.lvl} 대표팀` : 'A매치', stage: fx.r >= 8 ? '친선전' : (fx.r % 2 ? '예선' : '네이션스리그'), opp, oppName: C.natName(opp) + (youth ? ` ${ss.nt.lvl}` : ''), home: R() < .5, natTeam: label, gf: 0, ga: 0, played: false };
  const [lamT, lamO] = C.lambdas(myS, oS, rec.home ? 1 : -1);
  if (!inj && (sel0.start || R() < .55)) {
    const minutes = sel0.start ? (R() < .65 ? 90 : rint(60, 88)) : rint(10, 35);
    const r = playerMatch(p, { lamT, lamO, minutes, start: sel0.start, sT: myS, sO: oS, penTaker: ss.penTaker && sel0.start });
    Object.assign(rec, { gf: r.gf, ga: r.ga, st: r.st, shots: r.shots, played: true, start: sel0.start, min: minutes });
    const res = rec.gf > rec.ga ? 1 : rec.gf < rec.ga ? -1 : 0;
    rec.rating = matchRating(p, rec.st, res); rec.st.ratingSum = rec.rating; rec.st.rated = rec.st.min >= 10 ? 1 : 0;
    if (res > 0) rec.st.wins = 1; else if (res < 0) rec.st.losses = 1; else rec.st.draws = 1;
  } else { const [a, b] = C.quickMatch(myS, oS, rec.home ? 1 : -1); rec.gf = a; rec.ga = b; rec.why = inj ? '부상' : '미출전'; }
  ss.matches.push(rec);
  if (C.extras) C.extras.onMatch(S, rec);
  if (hooks && hooks.match) await hooks.match(rec);
}
// 여름 국제 대회 (시즌 종료 후)
function summerTournament(S) {
  const ss = S.ss, p = S.p, y = ss.year + 1;
  if (!ss.nt || ss.nt.lvl !== 'A') return null;
  const conf = C.confOf(p.nat);
  let name = null, big = false;
  if ((y - 2026) % 4 === 0 && y > 2026) { name = 'FIFA 월드컵'; big = true; }
  else { const ct = C.CONT_TOURN && C.CONT_TOURN[conf]; const t = { UEFA: ['UEFA 유로', 0], CONMEBOL: ['코파 아메리카', 0], AFC: ['AFC 아시안컵', 1], CAF: ['아프리카 네이션스컵', 1], CONCACAF: ['골드컵', 1] }[conf]; if (t && (y % 2 === t[1])) { if (t[1] === 0 && (y - 2028) % 4 === 0) name = t[0]; else if (t[1] === 1) name = t[0]; } }
  if (!name) return null;
  // 본선 진출 여부
  const field = Object.keys(ss.pools).filter(n => ss.pools[n].all.length >= 8 && (big || C.confOf(n) === conf)).map(n => [n, C.nationStrength(ss.pools[n])]).sort((a, b) => b[1] - a[1]);
  const size = big ? 48 : conf === 'UEFA' ? 24 : 16;
  const myRank = field.findIndex(f => f[0] === p.nat);
  if (myRank < 0) return null;
  const qualP = myRank < size * .6 ? .97 : myRank < size ? .75 : myRank < size * 1.4 ? .3 : .05;
  const T = { name, y, matches: [], stage: '예선 탈락', won: false };
  if (R() > qualP) return T;
  const stages = big ? ['조별리그', '조별리그', '조별리그', '32강', '16강', '8강', '4강', '결승'] : size === 24 ? ['조별리그', '조별리그', '조별리그', '16강', '8강', '4강', '결승'] : ['조별리그', '조별리그', '조별리그', '8강', '4강', '결승'];
  const top = field.slice(0, size);
  let groupPts = 0, d0 = day(y, 6, 12);
  for (let i = 0; i < stages.length; i++) {
    const st = stages[i], ko = st !== '조별리그';
    if (ko && i === 3 && groupPts < (big ? 3 : 4) && !(groupPts >= 3 && R() < .5)) { T.stage = '조별리그 탈락'; return T; }
    const opp = ko ? wpick(top.filter(f => f[0] !== p.nat), f => Math.exp((f[1] - 75) * (i >= stages.length - 3 ? .25 : .08))) : pick(top.filter(f => f[0] !== p.nat));
    const fakeFx = { d: d0 + i * 4, k: 'N', r: 99 };
    const before = ss.matches.length;
    const nt0 = ss.nt; ss.nt = { lvl: 'A', start: nt0.start };
    // 대회 경기
    const myS = ss.ntStr, oS = opp[1] + N(0, 1);
    const [lamT, lamO] = C.lambdas(myS, oS, 0);
    const rec = { d: fakeFx.d, comp: 'nt', compName: name, stage: st, opp: opp[0], oppName: C.natName(opp[0]), home: null, natTeam: C.natName(p.nat), gf: 0, ga: 0, played: false };
    if (R() < nt0.start + .2) {
      const minutes = R() < .7 ? 90 : rint(60, 88);
      const r = playerMatch(p, { lamT, lamO, minutes, start: true, sT: myS, sO: oS, penTaker: ss.penTaker });
      Object.assign(rec, { gf: r.gf, ga: r.ga, st: r.st, shots: r.shots, played: true, start: true, min: minutes });
      const res = rec.gf > rec.ga ? 1 : rec.gf < rec.ga ? -1 : 0;
      rec.rating = matchRating(p, rec.st, res); rec.st.ratingSum = rec.rating; rec.st.rated = 1;
      if (res > 0) rec.st.wins = 1; else if (res < 0) rec.st.losses = 1; else rec.st.draws = 1;
    } else { const [a, b] = C.quickMatch(myS, oS, 0); rec.gf = a; rec.ga = b; rec.why = '미출전'; }
    ss.matches.push(rec); T.matches.push(rec);
    if (C.extras) C.extras.onMatch(S, rec);
    if (!ko) { groupPts += rec.gf > rec.ga ? 3 : rec.gf === rec.ga ? 1 : 0; continue; }
    let win = rec.gf > rec.ga; if (rec.gf === rec.ga) { win = R() < 1 / (1 + Math.exp(-(myS - oS) * .06)); rec.pens = win ? 'W' : 'L'; }
    rec.koWin = win;
    if (!win) { T.stage = st; return T; }
    if (st === '결승') { T.stage = '우승'; T.won = true; return T; }
  }
  return T;
}
C.summerTournament = summerTournament;

// ---------- 시즌 종료 ----------
function compAgg(ms) {
  const by = {};
  for (const m of ms) {
    if (!m.played) continue;
    const k = m.comp; by[k] = by[k] || { st: blankStats(), name: m.compName };
    addStats(by[k].st, m.st);
  }
  return by;
}
C.compAgg = compAgg;
function totalAgg(ms, filter) { const t = blankStats(); for (const m of ms) if (m.played && (!filter || filter(m))) addStats(t, m.st); return t; }
C.totalAgg = totalAgg;
const avgRating = st => st.rated ? +(st.ratingSum / st.rated).toFixed(2) : 0;
C.avgRating = avgRating;

function finishSeason(S) {
  const ss = S.ss, w = S.w, p = S.p;
  // 다른 리그 전부 시뮬
  const tables = {};
  for (const id in w.lg) {
    const lg = w.lg[id];
    if (ss.tables[id]) { tables[id] = C.sortTable(ss.tables[id]); continue; }
    const t = C.newTable(lg.clubs);
    const ids = lg.clubs;
    for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) if (i !== j) { const [a, b] = C.quickMatch(w.clubs[ids[i]].str, w.clubs[ids[j]].str, 1); C.addResult(t, ids[i], ids[j], a, b); }
    tables[id] = C.sortTable(t);
  }
  ss.final = tables;
  finishContAll(S);
  // 여름 국제 대회
  w.hist.nt = w.hist.nt || {}; w.hist.cup = w.hist.cup || {};
  ss.tourn = C.simIntl ? C.simIntl(S) : summerTournament(S);
  try { if (C.archiveSeason) C.archiveSeason(S, tables); } catch (e) { console.error('archive', e); }
  // 기록
  const lg = leagueOf(S, ss.club);
  ss.lgId = lg ? lg.id : null;
  const myLgPos = lg ? tables[lg.id].findIndex(r => r.id === ss.club) + 1 : 0;
  ss.lgPos = myLgPos; ss.lgN = lg ? lg.clubs.length : 0;
  const trophies = [];
  const cname = w.clubs[ss.club].name;
  if (lg && myLgPos === 1) trophies.push({ t: lg.name, k: 'league', club: cname, y: ss.label });
  if (ss.CWon) trophies.push({ t: ss.cupName, k: 'cup', club: cname, y: ss.label });
  if (ss.LCWon) trophies.push({ t: ss.lcupName, k: 'lcup', club: cname, y: ss.label });
  if (ss.contWon) trophies.push({ t: ss.allCont[ss.cont].name, k: 'cont', club: cname, y: ss.label });
  if (ss.tourn && ss.tourn.won) trophies.push({ t: ss.tourn.name, k: 'nt', club: C.natName(p.nat), y: String(ss.year + 1) });
  ss.trophies = trophies;
  // 역사 기록
  for (const id in tables) { (w.hist.lg[id] = w.hist.lg[id] || []).push({ y: ss.label, c: tables[id][0].id }); }
  for (const k in ss.allCont) { const cs = ss.allCont[k]; if (cs.winner) (w.hist.cont[k] = w.hist.cont[k] || []).push({ y: ss.label, c: cs.winner }); }
  // 지난 시즌 순위 저장 (대륙 대회 진출용)
  for (const id in tables) w.last[id] = tables[id].map(r => r.id);
  // 명성 변화
  const resAdj = {};
  for (const id in tables) { const t = tables[id]; if (w.lg[id].tier === 1) { resAdj[t[0].id] = (resAdj[t[0].id] || 0) + .6; } }
  for (const k in ss.allCont) { const cs = ss.allCont[k]; if (cs.winner) resAdj[cs.winner] = (resAdj[cs.winner] || 0) + (C.COMPS[k].tier === 1 ? 1 : .4); }
  ss.promo = C.applyPromotion(w, tables);
  for (const id in ss.promo) resAdj[id] = (resAdj[id] || 0) + ss.promo[id];
  ss.resAdj = resAdj;
  return ss;
}
C.finishSeason = finishSeason;
})(typeof window !== 'undefined' ? window : globalThis);
