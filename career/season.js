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
const ymdOf = n => { const t = toDate(n); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
C.ymd = ymdOf; C.nextDow = nextDow;

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
  const TR = {}; for (const t of (p.traits || [])) TR[t] = 1;
  // --- 슈팅 ---
  const qa = (A('attPos') + A('finishing')) / 2, qa2 = qa > 84 ? 84 + (qa - 84) * .45 : qa; // 최상위 구간은 효과 체감
  const attQ = role === 'GK' ? 0 : Math.exp((qa2 - 72) * .028);
  const share = sh[0] * attQ;
  const myXGexp = Math.pow(o.lamT, .8) * Math.pow(1.36, .2) * share * f; // 강팀 소속이어도 개인 몫은 완만하게 증가
  // 강팀일수록 슈팅 수보다 슈팅 질이 오른다 (슈팅당 xG 상승)
  const xgK = clamp(Math.sqrt(o.lamT / 1.36), .78, 1.3);
  let nSh = poisson(myXGexp / (sh[1] * xgK));
  let goals = 0;
  const kq = 1 - (o.sO - 70) * .006;
  for (let i = 0; i < nSh; i++) {
    const r = R();
    const type = r < sh[3] * (A('heading') / 70) * (TR.header ? 1.35 : 1) ? 'head' : r < sh[3] * (A('heading') / 70) + sh[4] * (A('longShots') / 70) ? 'out' : 'in';
    let xg = clamp((type === 'head' ? rnd(.03, .2) : type === 'out' ? rnd(.02, .08) : clamp(.04 + Math.exp(N(-2.35, .85)), .03, .78)) * xgK, .02, .85);
    const qual = type === 'head' ? A('heading') : type === 'out' ? (A('longShots') * .7 + A('shotPower') * .3) : (A('finishing') * .8 + A('composure') * .2);
    const conv = clamp(.76 + (Math.min(qual, 88) - 65) * .013 + Math.max(0, qual - 88) * .004, .45, 1.12) * kq * (type === 'in' && TR.finisher ? 1.1 : type === 'head' && TR.header ? 1.15 : type === 'out' && TR.rocket ? 1.3 : 1);
    const goal = R() < xg * conv;
    const onT = goal || R() < clamp(.24 + (qual - 60) * .006, .15, .55);
    const sp = shotSpot(type, xg);
    shots.push({ x: sp[0], y: sp[1], xg: +xg.toFixed(2), g: goal ? 1 : 0, t: type === 'head' ? 'H' : (p.foot === 'L' ? (R() < .75 ? 'L' : 'R') : (R() < .78 ? 'R' : 'L')), on: onT ? 1 : 0, ob: type === 'out' ? 1 : 0 });
    st.shots++; st.xg += xg; st.npxg += xg; if (type === 'head') st.headShots++;
    if (onT) { st.sot++; st.xgot += goal ? xg * rnd(1.1, 1.9) : xg * rnd(.5, 1.1); }
    if (goal) goals++;
  }
  // 페널티
  if (o.penTaker && R() < .11 * f) {
    st.penTaken++; st.shots++; st.xg += .79; st.sot++;
    const pc = clamp(.55 + (A('penalties') - 55) * .009 + (A('composure') - 60) * .002 + (TR.spot ? .07 : 0), .55, .97);
    const g = R() < pc; if (g) { goals++; st.penGoals++; st.xgot += .95; } else st.xgot += .5;
    shots.push({ x: 50, y: 11, xg: .79, g: g ? 1 : 0, t: 'P', on: 1 });
  }
  // 직접 프리킥
  if ((o.fkTaker || TR.deadball) && R() < .09 * f * (TR.deadball ? 1.5 : 1)) {
    st.shots++; const xg = rnd(.04, .09); st.xg += xg; st.npxg += xg;
    const g = R() < xg * clamp(.6 + (A('fkAcc') + A('curve') - 120) * .02, .5, 2.6) * (TR.deadball ? 1.4 : 1);
    const on = g || R() < .35; if (on) st.sot++; if (g) { goals++; st.xgot += .5; }
    shots.push({ x: rnd(30, 70), y: rnd(19, 27), xg: +xg.toFixed(2), g: g ? 1 : 0, t: 'F', on: on ? 1 : 0 });
  }
  st.goals = goals;
  // --- 팀 득점 (본인 외) ---
  const others = poisson(Math.max(.04, o.lamT - myXGexp));
  // --- 도움 ---
  const cre = role === 'W' || role === 'FB' ? (A('crossing') * .45 + A('dribbling') * .25 + A('vision') * .3) : (A('vision') * .5 + A('shortPass') * .35 + A('ballControl') * .15);
  const aq = Math.exp((cre - 70) * .016);
  const ash = sh[2] * aq * (TR.maestro ? 1.15 : 1);
  let assists = 0; const othersOn = binom(others, f);
  for (let i = 0; i < othersOn; i++) if (R() < ash * 1.08) assists++;
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
  const duelP = clamp(.42 + (A('strength') - 62) * .004 + (A('balance') - 62) * .002 + (['CB', 'FB', 'DM', 'CM'].includes(role) ? (A('standTackle') - 60) * .004 : (A('dribbling') - 60) * .003) + (C.hasTrait && C.hasTrait(p, 'wall') ? .06 : 0), .25, .8);
  st.duelW = st.dribOk + binom(st.duelA - st.dribAtt, duelP);
  st.aerA = poisson(rt[6] * f * (1 + (p.height - 180) * .02));
  st.aerW = binom(st.aerA, clamp(.28 + (A('heading') - 60) * .006 + (A('jumping') - 60) * .005 + (A('strength') - 60) * .003 + (p.height - 180) * .009, .1, .88));
  st.boxTouch = poisson(rt[7] * f * (A('attPos') / 70) * (.7 + poss * .6));
  st.disp = poisson(rt[8] * f * clamp(1.25 - (A('ballControl') - 60) / 90, .4, 1.6));
  st.foulsWon = poisson(rt[9] * f * (A('dribbling') / 70));
  // --- 수비 ---
  const dq = (A('defAware') + A('standTackle') + A('interceptions')) / 3;
  const defF = (1.35 - poss) * clamp(dq / 65, .5, 1.5);
  st.tackles = poisson(rt[10] * f * defF * (TR.engine ? 1.3 : 1) * (TR.wall ? 1.15 : 1));
  st.ints = poisson(rt[11] * f * defF * (A('interceptions') / 70) * (TR.engine ? 1.25 : 1) * (TR.wall ? 1.15 : 1));
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
  const me = C.effOvr(p) + (S.car.trust - 50) * .06 + (S.car.formAdj || 0) + (S.car.bias || 0) + (S.wc ? clamp(S.wc.rb || 0, -3, 3) : 0); // 월드 커리어: 감독과의 관계가 작은 치우침으로
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

// 내 시즌 = 내 리그 달력 기준 한 시즌 (유럽식: 8월 2일 ~ 다음 8월 1일, 캘린더식: 1월 2일 ~ 다음 1월 1일).
// 세계 달력(calendar.js)이 모든 경기를 날짜대로 치르고, 내 구단 경기·국가대표·유스 경기만 내가 직접 뛴다
function seasonWindow(nat, today) {
  const cy = C.calType(nat) === 'cy', [ty] = ymdOf(today);
  let end = cy ? day(ty + 1, 1, 2) : (today < day(ty, 8, 2) ? day(ty, 8, 2) : day(ty + 1, 8, 2));
  if (end - today < 25) end = cy ? day(ty + 2, 1, 2) : end + (day(ty + 1, 8, 2) - day(ty, 8, 2));
  // 시즌 중간 휴식기·이적시장: 유럽식은 1월 1일, 캘린더식은 7월 1일
  const cands = [ty, ty + 1, ty + 2].map(y => cy ? day(y, 7, 1) : day(y, 1, 1));
  const split = cands.find(x => x > today + 20 && x < end - 20) || null;
  return { start: today, end, split, cy };
}
C.seasonWindow = seasonWindow;
function setupSeason(S) {
  const w = S.w, p = S.p, car = S.car;
  if (!w.cal) C.calInit(S);
  const club = clubOf(S), lg = leagueOf(S);
  const nat = lg ? lg.nation : club.nat;
  const win = seasonWindow(nat, w.cal.d + 1);
  const LS = lg ? w.cal.lg[lg.id] : null;
  const label = LS && LS.start < win.end ? LS.label : C.wLabel(w.year);
  const ss = { year: w.year, label, club: club.id, status: car.status, start: win.start, end: win.end, split: win.split, cy: win.cy, on: true, half: win.split ? 1 : 2, matches: [], tables: {}, alive: {}, cont: null, inj: 0, susp: 0, yellows: 0, events: [], moments: [], momentsLeft: 0, trustStart: car.trust, ufx: [], ui: 0, lgId: lg ? lg.id : null, nat };
  S.ss = ss;
  car.bias = N(0, 1.8); // 이번 시즌 감독이 나를 얼마나 선호하는지
  car.formAdj = clamp((p.morale - 60) / 25, -1.2, 1.2); // 사기가 시즌 초반 폼을 정한다
  if (LS) { ss.tables[lg.id] = LS.tb; ss.lgFmt = C.lgFormat(lg); }
  // 유스 리그 (유스 선수, 또는 출전이 적은 21세 이하 1군 선수의 U21·B팀 경기)
  const sr0 = car.status !== 'youth' ? squadRole(S, club.id) : null;
  ss.reserve = !!(sr0 && p.age <= 21 && ['backup', 'reserve'].includes(sr0.role));
  if (car.status === 'youth' || ss.reserve) {
    const a = Math.max(win.start + 7, LS ? LS.start : win.start), b = Math.min(win.end - 10, LS ? LS.end : win.end - 30);
    for (let i = 0; i < 22 && b > a; i++) ss.ufx.push({ d: nextDow(a + Math.round(i * (b - a) / 22), 0), k: 'Y' });
  }
  // 국내 컵: 이번 시즌 안에 열리는 우리나라 컵 (전 라운드 대진, 리그 등급에 맞는 라운드부터)
  for (const k in w.cal.cup) {
    const st = w.cal.cup[k]; if (st.nat !== nat || st.dates[st.dates.length - 1] < win.start || st.dates[0] >= win.end) continue;
    const e = C.cupEntry(st, club.id); if (e < 0 && !st.alive.includes(club.id)) continue;
    const kk = st.kind === 'cup' ? 'C' : 'LC';
    ss.alive[kk] = true; ss[kk === 'C' ? 'cupName' : 'lcupName'] = st.n; ss[kk === 'C' ? 'cupKey' : 'lcupKey'] = k;
  }
  // 국가대표
  setupNational(S, ss);
  ss.ufx.sort((a, b) => a.d - b.d);
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
    ss.fteam = clamp(.36 * Math.exp(gap * .11), .035, .7);
    // 가끔 감독이 유스를 과감하게 기용하는 시즌 (깜짝 신성)
    if (ss.breakout == null) { ss.breakout = gap > -17 && R() < .22 && !(S.wc && S.p.age <= 15); if (ss.breakout) { S.p.mods.push({ ovr: 5, seasons: 1, why: '겁 없는 신예' }); if (C.news) C.news(S, `감독, "${S.p.name}은 이번 시즌 1군에서 기회를 받을 것"`, 'youth', true); } }
    if (ss.breakout) ss.fteam = clamp(ss.fteam * 2.6 + .12, 0, .8);
    if (S.wc && S.p.age <= 15) { ss.fteam = 0; ss.breakout = false; } // 월드 커리어 아카데미(14·15세): 1군 기회 없음
  } else { const sr = squadRole(S, S.car.club); ss.role = sr.role; ss.sr = sr; }
}
C.updateRole = updateRole;
function isPenTaker(S) { const a = S.p.a, r = roleOf(S.p); return a.penalties >= (['ST', 'AM', 'W'].includes(r) ? 68 : 80) && ['key', 'starter'].includes(S.ss.role); }
function isFkTaker(S) { const a = S.p.a; return (a.fkAcc + a.curve) / 2 >= 74 && ['key', 'starter'].includes(S.ss.role); }

// 대륙 대회 구성
// 국가대표 일정
function setupNational(S, ss) {
  const p = S.p;
  const pools = C.nationPools(S.w); ss.pools = pools;
  const pool = pools[p.nat];
  const g = C.NTG[p.pos];
  const me = C.effOvr(p) + (S.wc && S.wc.rel ? clamp((S.wc.rel.nt || 0) * 2, -2, 2) : 0); // 월드 커리어: 대표팀 감독과의 관계
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
  if (ss.nt.lvl === 'A') return; // A대표: 세계 달력의 A매치(네이션스리그·친선전)로 치른다
  // A매치 기간 (9·10·11·3·6월)에 두 경기씩: 이번 시즌 기간 안의 날짜만
  const wins = [[9, 5], [9, 9], [10, 10], [10, 14], [11, 14], [11, 18], [3, 26], [3, 30], [6, 6], [6, 10]];
  const [y0] = ymdOf(ss.start);
  for (const yy of [y0, y0 + 1]) wins.forEach(([m, d], i) => { const dd = day(yy, m, d); if (dd >= ss.start && dd < ss.end) ss.ufx.push({ d: dd, k: 'N', r: i }); });
}

// ---------- 시즌 진행 ----------
// hooks.moment(ctx) → Promise<{goal?, saved?, ok}>  (없으면 자동 처리)
// untilDay 전날까지 세계 달력을 진행 (내 경기는 달력 안에서 치른다)
async function simUntil(S, untilDay, hooks, onDay, stop) {
  S.ss.on = true;
  await C.calRun(S, untilDay - 1, hooks, onDay, stop);
}
C.simUntil = simUntil;
const halfEnd = S => S.ss.half === 1 && S.ss.split ? S.ss.split : S.ss.end;
C.halfEnd = halfEnd;
// 이번 시즌 내 일정 (화면용·남은 경기 계산용): 리그·컵·대륙 대회·국가대표·유스
function userFixtures(S) {
  const ss = S.ss, w = S.w; if (!ss || !w.cal) return [];
  const me = ss.club, mi = C.cix(w, me), out = [];
  const inWin = d => d >= ss.start && d < ss.end;
  const LS = ss.lgId && w.cal.lg[ss.lgId];
  if (LS) LS.dates.forEach((d, i) => { if (!inWin(d)) return; const m = (LS.R[i] || []).find(x => x[0] === mi || x[1] === mi); if (m || i >= LS.nreg) out.push({ d, k: 'L', done: i < LS.ri, opp: m ? C.cidOf(w, m[0] === mi ? m[1] : m[0]) : null, home: m ? m[0] === mi : null }); });
  for (const k of [ss.cupKey, ss.lcupKey]) { const st = k && w.cal.cup[k]; if (!st) continue; const kk = st.kind === 'cup' ? 'C' : 'LC'; const e = C.cupEntry(st, me); st.dates.forEach((d, i) => { if (!inWin(d) || i < Math.max(0, e)) return; if (i >= st.ri && !ss.alive[kk]) return; out.push({ d, k: kk, done: i < st.ri, stage: st.rounds[i].n }); }); }
  for (const k in w.cal.cont) { const cs = w.cal.cont[k]; if (!cs.teams.includes(me) || ss.noCont) continue; cs.dates.forEach((d, i) => { if (!inWin(d)) return; if (i < cs.phaseN) { if ((cs.md[i] || []).some(p => p[0] === me || p[1] === me)) out.push({ d, k: 'E', done: i < cs.di, comp: cs.k }); } else if (!cs.userOut) out.push({ d, k: 'E', done: i < cs.di, comp: cs.k }); }); }
  for (const f of ss.ufx) { if (f.k === 'N' && ss.nt && ss.nt.lvl === 'A' && w.cal.am) continue; out.push({ d: f.d, k: f.k, done: ss.ufx.indexOf(f) < ss.ui }); }
  const nat = S.p && S.p.nat;
  if (ss.nt && ss.nt.lvl === 'A' && w.cal.am) for (const f of w.cal.am.fx) if ((f.a === nat || f.b === nat) && inWin(f.d)) out.push({ d: f.d, k: 'N', done: !!f.done, opp: f.a === nat ? f.b : f.a, home: f.n ? null : f.a === nat, stage: f.stage, nat: 1, comp: f.c });
  return out.sort((a, b) => a.d - b.d);
}
C.userFixtures = userFixtures;

function teamStr(S, clubId, withMe) {
  const c = S.w.clubs[clubId];
  const adj = (c.fm || 0) + (c.injd || 0); // 시즌 폼·부상 공백 (세계 달력과 같은 기준)
  if (!withMe) return c.str + adj;
  return C.xiStrength(c.sq.filter(e => !e[14]), ['me', S.p.pos, C.effOvr(S.p), S.p.age]) + (c.fm || 0);
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
      const f = clamp(ss.fteam * (1 + yb + pb2) + (pro.apps >= 4 ? .12 : 0) + (pro.apps >= 3 && pro.avg >= 7 ? .15 : 0), 0, .92) * (kind === 'C' || kind === 'LC' ? 1.6 : 1);
      ps = f * (ss.breakout ? .68 : .4); pb = f * .85;
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
    const r = playerMatch(p, { adj: o.adj || (ss.breakout && ss.role === 'youth' ? 4 : 0), lamT, lamO, minutes: sel.minutes, start: sel.start, sT: myStr, sO: o.oppStr, penTaker: ss.penTaker && sel.start, fkTaker: ss.fkTaker && sel.start, comp: o.kind });
    rec.gf = r.gf; rec.ga = r.ga; rec.st = r.st; rec.shots = r.shots; rec.played = true; rec.start = sel.start; rec.min = sel.minutes;
    // 결정적 순간
    // 결정적 순간: 유스·친선전·대승/대패 경기는 제외하고, 승부가 걸린 접전에서만
    const close = Math.abs(rec.gf - rec.ga) <= 1;
    const meaningful = o.kind !== 'Y' && o.stage !== '친선전' && close && ((o.imp || 0) >= 1 || o.ko || o.stage === '결승' || R() < .5);
    if (hooks && meaningful && ss.momentsLeft > 0 && sel.minutes >= 25) {
      const remaining = userFixtures(S).filter(f => !f.done && f.d >= o.d).length + 1;
      const chance = clamp(ss.momentsLeft / Math.max(3, remaining * .3) * (1 + (o.imp || 0) * .9), 0, .95);
      if (o.stage === '결승' || R() < chance) {
        ss.momentsLeft--;
        const mc = C.makeMoment(S, rec, o);
        if (mc) {
          const res = hooks.moment ? await hooks.moment(mc) : C.autoMoment(S, mc);
          C.applyMoment(S, rec, mc, res);
          ss.moments.push({ d: o.d, type: mc.type, title: mc.title, ok: res.ok, opp: o.oppName, comp: o.compName, text: res.text || '' });
          if (C.ach) C.ach.fire(S, 'moment', { ok: res.ok, type: mc.type });
        }
      }
    }
    const res = rec.gf > rec.ga ? 1 : rec.gf < rec.ga ? -1 : 0;
    rec.rating = matchRating(p, rec.st, res);
    if ((o.imp || 0) >= 2 && C.hasTrait && C.hasTrait(p, 'bigGame')) rec.rating = Math.min(10, +(rec.rating + .2).toFixed(1));
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
// 부상: 최근 부상 이력·복귀 직후·누적 출전 부담·나이에 따라 확률과 기간이 달라지고,
// 부상을 당할 때마다 일정 확률로 커리어 수명(노쇠화 속도)·부상 체질이 나빠진다
function injuryState(S, d) {
  const p = S.p, hist = p.injHist || [];
  const dayNow = d || (S.ss && S.ss.lastDay) || 0;
  const recent = hist.filter(x => dayNow - x.d < 365);
  const last = hist[hist.length - 1];
  const sinceBack = last ? dayNow - (last.d + last.days) : 999;
  const ms = S.ss ? S.ss.matches.filter(m => m.played && dayNow - m.d <= 14) : [];
  const load = ms.reduce((a, m) => a + (m.min || 0), 0);
  const fatigue = clamp((load - 270) / 180, 0, 1.5); // 2주에 270분 넘게 뛰면 피로 누적
  const mult = (1 + recent.length * .28 + recent.filter(x => x.days >= 36).length * .25) * (sinceBack < 21 ? 1.8 : sinceBack < 45 ? 1.3 : 1) * (1 + fatigue * .35);
  return { recent: recent.length, sinceBack, fatigue, mult, total: hist.length, days: hist.reduce((a, x) => a + x.days, 0) };
}
C.injuryState = injuryState;
function injuryRoll(S, rec, minutes) {
  const p = S.p, ss = S.ss;
  const it = C.INTENSITY[S.car.intensity || 'normal'][2] * (S.car.focus === 'care' ? .75 : 1);
  const stt = injuryState(S, rec.d);
  const pr = .0062 * stt.mult * (C.hasTrait && C.hasTrait(p, 'iron') ? .75 : 1) * p.hid.inj * C.diff().inj * ({ low: .6, normal: 1, high: 1.4 }[C.cfg.injuries] || 1) * it * (p.age > 30 ? 1 + (p.age - 30) * .09 : 1) * (minutes / 90);
  if (R() < pr) {
    const t = R();
    let days = t < .55 ? rint(6, 14) : t < .85 ? rint(15, 35) : t < .96 ? rint(36, 90) : rint(120, 260);
    // 복귀 직후 재발·나이·부상 체질이면 더 길어진다
    const reinj = stt.sinceBack < 30;
    days = Math.round(days * (reinj ? rnd(1.2, 1.6) : 1) * (p.age > 28 ? 1 + (p.age - 28) * .03 : 1) * clamp(p.hid.inj, .8, 1.6));
    const kinds = days < 15 ? ['발목 염좌', '타박상', '근육 피로', '허벅지 경미한 부상'] : days < 36 ? ['햄스트링 부상', '종아리 근육 부상', '사타구니 부상', '발목 인대 부상'] : days < 91 ? ['허벅지 근육 파열', '중족골 골절', '무릎 내측 인대 부상'] : ['전방십자인대 파열', '아킬레스건 파열', '정강이뼈 골절'];
    const kind = reinj && p.injHist && p.injHist.length ? p.injHist[p.injHist.length - 1].kind + ' 재발' : pick(kinds);
    ss.inj = days; rec.injury = { days, kind };
    ss.injuries = (ss.injuries || []).concat({ d: rec.d, days, kind });
    // 후유증: 확률적으로 커리어 수명 단축·부상 체질화
    const after = [];
    const sev = days >= 120 ? 3 : days >= 36 ? 2 : days >= 15 ? 1 : 0;
    const pAfter = [.04, .12, .4, .75][sev] * (reinj ? 1.6 : 1) * (stt.recent >= 2 ? 1.4 : 1);
    if (R() < pAfter) { const k = [1.02, 1.04, 1.07, 1.12][sev]; p.hid.lon = clamp(p.hid.lon * k, .35, 2.4); after.push('노쇠화 가속'); }
    if (R() < [.05, .1, .25, .45][sev] * (reinj ? 1.5 : 1)) { p.hid.inj = clamp(p.hid.inj * 1.08, .4, 2.6); after.push('부상 체질화'); }
    if (sev >= 2) { // 장기 부상: 신체 능력 저하
      for (const k of ['accel', 'sprint', 'agility']) C.bump(p, k, -rnd(.5, 2) * sev);
      p.hid.pot -= rint(0, sev);
      after.push('스피드 저하');
    }
    rec.injury.after = after;
    (p.injHist = p.injHist || []).push({ y: ss.year, d: rec.d, age: p.age, club: ss.club, comp: rec.compName, opp: rec.oppName, days, kind, reinj: reinj ? 1 : 0, after });
    if (after.length && C.news) C.news(S, `${p.name} 부상 후유증 우려: ${after.join(', ')}`, 'injury', sev >= 2);
  }
}
C.userMatch = userMatch;

async function doYouth(S, fx, hooks) {
  const u21 = !(S.ss.status === 'youth' && S.p.age <= 17);
  const ss = S.ss, lv = 47 + (S.w.clubs[ss.club].str - 70) * .5 + (u21 ? 5 : 0);
  const oppName = pick(['U18', 'U21']) === 'U18' ? ['U18 리그'] : ['U21 리그'];
  const oppStr = N(lv, 3), myStr = lv + 2 + (C.effOvr(S.p) - lv) * .12;
  const opp = pick(Object.values(S.w.clubs).filter(c => c.nat === S.w.clubs[ss.club].nat && c.id !== ss.club)) || S.w.clubs[ss.club];
  await userMatch(S, { d: fx.d, kind: 'Y', compKey: 'youth', compName: S.ss.status === 'youth' && S.p.age <= 17 ? 'U18 리그' : 'U21 리그', opp: opp.id, oppName: opp.name + (S.ss.status === 'youth' && S.p.age <= 17 ? ' U18' : ' U21'), oppStr, myStr, adj: clamp(69 - lv, 0, 24), home: R() < .5, imp: 0 }, hooks);
}
// 국가대표 경기
async function doNational(S, fx, hooks) {
  const ss = S.ss, p = S.p;
  if (!ss.nt) return;
  const conf = C.confOf(p.nat);
  const opps = Object.keys(ss.pools).filter(n => n !== p.nat && C.confOf(n) === conf && ss.pools[n].all.length >= 8);
  const opp = fx.opp || (opps.length ? pick(opps) : pick(Object.keys(ss.pools).filter(n => n !== p.nat)));
  const youth = ss.nt.lvl !== 'A';
  const myS = youth ? ss.ntStr - 14 : ss.ntStr, oS = (youth ? -14 : 0) + (fx.oppStr != null ? fx.oppStr : ss.pools[opp] ? C.nationStrength(ss.pools[opp]) : 60) + N(0, 1.5);
  const label = youth ? `${C.natName(p.nat)} ${ss.nt.lvl}` : C.natName(p.nat);
  const save = ss.role; ss.role = '__nt';
  const sel0 = { start: R() < ss.nt.start, minutes: 0 };
  ss.role = save;
  // 국가대표는 별도 출전 판정
  const inj = ss.inj > 0;
  const rec = { d: fx.d, comp: youth ? 'ntY' : 'nt', compName: fx.compName || (youth ? `${ss.nt.lvl} 대표팀` : 'A매치'), stage: fx.stage || (youth ? '친선전' : '친선전'), opp, oppName: C.natName(opp) + (youth ? ` ${ss.nt.lvl}` : ''), home: fx.home !== undefined ? fx.home : R() < .5, natTeam: label, gf: 0, ga: 0, played: false };
  const [lamT, lamO] = C.lambdas(myS, oS, rec.home ? 1 : rec.home === null ? 0 : -1);
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
  return rec;
}
C.doNational = doNational; C.doYouth = doYouth;

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
// 경기 로그용 세부 기록: 골 유형(프리킥·페널티·헤더·중거리), 슈팅, 상대 ID, 클럽
C.logExtra = m => {
  if (!m.played || !m.st) return { oi: m.opp, cl: m.club || null };
  const sh = m.shots || [], gl = sh.filter(x => x.g);
  return { oi: m.opp, fk: gl.filter(x => x.t === 'F').length, pk: gl.filter(x => x.t === 'P').length, hd: gl.filter(x => x.t === 'H').length, ob: gl.filter(x => x.ob).length, sh: m.st.shots, sot: m.st.sot, xg: +(m.st.xg || 0).toFixed(2), kp: m.st.chances, pa: m.st.passAtt ? Math.round(m.st.passOk / m.st.passAtt * 100) : 0, tk: m.st.tackles + m.st.ints, dr: m.st.dribOk, ca: m.st.concOn || 0, sv: m.st.saves || 0, cs: m.st.cs || 0, clr: m.st.clear || 0, bl: m.st.blocks || 0 };
};
const avgRating = st => st.rated ? +(st.ratingSum / st.rated).toFixed(2) : 0;
C.avgRating = avgRating;

function finishSeason(S) {
  const ss = S.ss, w = S.w, p = S.p;
  ss.on = false;
  // 내 리그 시즌 결과 (세계 달력이 시즌을 마감할 때 남긴 값)
  const lgD = ss.lgDone;
  const lg = lgD ? w.lg[lgD.id] : leagueOf(S, ss.club);
  ss.lgId = lgD ? lgD.id : lg ? lg.id : null;
  ss.lgPos = lgD ? lgD.pos : 0; ss.lgN = lgD ? lgD.n : 0;
  ss.final = {}; if (lgD) ss.final[lgD.id] = lgD.t.map(r => ({ id: r[0], p: r[1], w: r[2], d: r[3], l: r[4], gf: r[5], ga: r[6], pts: r[7] }));
  const trophies = [];
  const cname = ss.club && w.clubs[ss.club] ? w.clubs[ss.club].name : '';
  if (lgD && lgD.pos === 1) trophies.push({ t: w.lg[lgD.id].name, k: 'league', club: cname, y: lgD.label });
  if (ss.CWon) trophies.push({ t: ss.cupName, k: 'cup', club: cname, y: ss.label });
  if (ss.LCWon) trophies.push({ t: ss.lcupName, k: 'lcup', club: cname, y: ss.label });
  if (ss.contWon && ss.cont) trophies.push({ t: C.COMPS[ss.cont].name, k: 'cont', club: cname, y: ss.label });
  if (ss.tourn && ss.tourn.won) trophies.push({ t: ss.tourn.name, k: 'nt', club: C.natName(p.nat), y: String(ss.tourn.y) });
  ss.trophies = trophies;
  ss.promo = ss.promo ? { [ss.club]: ss.promo } : null;
  return ss;
}
C.finishSeason = finishSeason;
// 팀 내 평점 순위: 동료들의 시즌 평점은 능력치·팀 성적으로 추정 (시즌 동안 고정된 시드)
function teamRank(S, ssArg) {
  const ss = ssArg || S.ss, w = S.w, c = w.clubs[ss.club];
  if (!c || !c.sq || !c.sq.length) return null;
  // 시즌이 끝났으면 경기 기록으로 집계한 리그 평점 (선수 시즌 기록과 같은 값)
  if (ss.myAgg && ss.myAgg.length) {
    const me = ss.myAgg.find(x => x.id === 'ME');
    if (me && me.apps >= 3) {
      const all = ss.myAgg.filter(x => x.apps >= 3).map(x => x.id === 'ME' ? { n: S.p.name, pos: S.p.pos, r: x.r, apps: x.apps, me: true } : { n: C.MD.nameOf(x.id), pos: x.pos, r: x.r, apps: x.apps, pid: x.id[0] === '~' ? '' : x.id }).sort((a, b) => b.r - a.r);
      return { rank: all.findIndex(x => x.me) + 1, n: all.length, myR: me.r, top: all.slice(0, 5), final: 1, basis: '리그 경기 기록 (3경기 이상 출전)' };
    }
  }
  // 시즌 중: 세계 달력의 리그 경기 기록(지금까지)으로 집계
  const LS = S.w.cal && ss.lgId && S.w.cal.lg[ss.lgId], hh = LS && S.w.cal.h[LS.k];
  if (hh && hh.agg && !ssArg) {
    const list = [], posOf = {}; for (const e of (S.w.clubs[ss.club].sq || [])) posOf[String(e[0])] = e[1];
    for (const pid in hh.agg) { const a = hh.agg[pid]; if (C.cidOf(S.w, a[0]) !== ss.club || a[1] < 3) continue; const r = +(a[8] / 10 / a[1]).toFixed(2);
      list.push(pid === 'ME' ? { n: S.p.name, pos: S.p.pos, r, apps: a[1], me: true } : { n: C.MD.nameOf(pid), pos: posOf[pid] || (S.w.ps && S.w.ps[pid] && S.w.ps[pid].pos) || '', r, apps: a[1], pid: pid[0] === '~' ? '' : pid }); }
    const me = list.find(x => x.me);
    if (me) { list.sort((a, b) => b.r - a.r); return { rank: list.indexOf(me) + 1, n: list.length, myR: me.r, top: list.slice(0, 5), basis: '이번 시즌 리그 경기 기록 (3경기 이상 출전, 진행 중)' }; }
  }
  const ms = ss.matches.filter(m => !['youth', 'nt', 'ntY'].includes(m.comp));
  const mine = ms.filter(m => m.played && m.rating);
  if (mine.length < 3) return null;
  const myR = mine.reduce((a, m) => a + m.rating, 0) / mine.length;
  const lg = leagueOf(S, ss.club), tb = lg && ss.tables[lg.id] ? ss.tables[lg.id][ss.club] : null;
  const ppg = tb && tb.p ? tb.pts / tb.p : 1.4;
  const sorted = c.sq.slice().sort((a, b) => b[2] - a[2]), top = sorted.slice(0, 18);
  const avg = top.reduce((a, e) => a + e[2], 0) / top.length;
  const r0 = C.seeded(c.id + '|tr|' + ss.year);
  const list = top.map((e, i) => {
    const r = r0(), r2 = r0();
    const g = Math.sqrt(-2 * Math.log(r || 1e-9)) * Math.cos(2 * Math.PI * r2);
    const atk = ['ST', 'LW', 'RW', 'CAM'].includes(e[1]) ? .1 : ['CB', 'GK'].includes(e[1]) ? -.08 : 0;
    return { n: C.pName(w, e), pid: String(e[0]), pos: e[1], r: +(6.62 + (e[2] - 72) * .035 + (ppg - 1.4) * .18 + atk + g * .2 - (i >= 13 ? .15 : 0)).toFixed(2) };
  }).filter(x => x.pos !== 'GK' || true);
  const all = list.concat({ n: S.p.name, pos: S.p.pos, r: +myR.toFixed(2), me: true }).sort((a, b) => b.r - a.r);
  return { rank: all.findIndex(x => x.me) + 1, n: all.length, myR: +myR.toFixed(2), top: all.slice(0, 5), basis: '시즌 중 추정치 (시즌 종료 후 경기 기록으로 확정)' };
}
C.teamRank = teamRank;
})(typeof window !== 'undefined' ? window : globalThis);
