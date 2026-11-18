// Road to Legend — 세계 달력: 리그마다 실제 일정(유럽식 8~5월, 캘린더식 2~11월)으로
// 모든 리그·컵·대륙 대회·국제 대회·이적시장을 날짜 단위로 진행한다. 커리어의 내 경기도 이 달력 안에서 치른다.
(function (G) {
'use strict';
const C = G.TC;
const { R, N, rnd, rint, clamp, pick, shuffle, wpick } = C;
const day = (y, m, d) => C.day(y, m, d);
const ymd = n => { const t = C.toDate(n); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const dowOf = n => C.toDate(n).getUTCDay();
const nextDow = (n, d) => { while (dowOf(n) !== d) n++; return n; };

// ---------- 나라별 리그 달력 ----------
// [종류, 개막 월, 일, 폐막 월, 일, (휴식기 시작 월, 일, 끝 월, 일)]  eu = 해를 넘기는 시즌(2026/27), cy = 한 해 시즌(2027)
const CALS = {
  ENG: ['eu', 8, 15, 5, 24], WAL: ['eu', 8, 8, 4, 26], SCO: ['eu', 8, 2, 5, 16], ESP: ['eu', 8, 15, 5, 24], ITA: ['eu', 8, 22, 5, 24],
  GER: ['eu', 8, 21, 5, 16, 12, 21, 1, 9], FRA: ['eu', 8, 14, 5, 16], POR: ['eu', 8, 8, 5, 17], NED: ['eu', 8, 7, 5, 17], BEL: ['eu', 8, 2, 5, 24],
  TUR: ['eu', 8, 7, 5, 24], AUT: ['eu', 8, 2, 5, 24, 12, 14, 2, 7], SUI: ['eu', 8, 2, 5, 24], DEN: ['eu', 8, 2, 5, 24, 12, 7, 2, 14], POL: ['eu', 8, 2, 5, 24],
  ROU: ['eu', 8, 2, 5, 24], GRE: ['eu', 8, 21, 5, 17], RUS: ['eu', 8, 2, 5, 24, 12, 8, 2, 28], UKR: ['eu', 8, 2, 5, 24, 12, 8, 2, 22], HUN: ['eu', 8, 2, 5, 24],
  CZE: ['eu', 8, 2, 5, 24], LUX: ['eu', 8, 8, 5, 24], KSA: ['eu', 8, 21, 5, 24], MEX: ['eu', 8, 2, 5, 17], IDN: ['eu', 8, 8, 5, 24],
  JPN: ['eu', 8, 7, 5, 30, 12, 13, 2, 14], AUS: ['eu', 10, 16, 5, 9], IND: ['eu', 9, 12, 4, 25], VIE: ['eu', 8, 15, 6, 14],
  KOR: ['cy', 3, 1, 11, 30], CHN: ['cy', 3, 6, 11, 8], USA: ['cy', 2, 21, 10, 18], BRA: ['cy', 1, 28, 12, 6], ARG: ['cy', 1, 24, 12, 13],
  SWE: ['cy', 4, 1, 11, 8], NOR: ['cy', 3, 28, 11, 29], FIN: ['cy', 4, 4, 10, 25], IRL: ['cy', 2, 13, 10, 31], ISL: ['cy', 4, 4, 10, 25],
  CHI: ['cy', 2, 13, 12, 6], URU: ['cy', 2, 6, 12, 6], PER: ['cy', 2, 6, 12, 6], BLR: ['cy', 3, 20, 11, 29]
};
const calOf = nat => CALS[nat] || ['eu', 8, 15, 5, 24];
C.CALS = CALS; C.calOf = calOf; C.calType = nat => calOf(nat)[0];
C.wLabel = y => `${y}/${String(y + 1).slice(2)}`;
// 이적시장 이름: '2027/28' = 2027년 여름(그 시즌 앞), '2026/27w' = 2027년 1월 겨울
C.txName = l => /w$/.test(l) ? `${+l.slice(0, 4) + 1}년 1월 (겨울)` : `${l.slice(0, 4)}년 여름`;
function seasonRange(nat, sy) {
  const c = calOf(nat);
  const start = day(sy, c[1], c[2]), end = c[0] === 'cy' ? day(sy, c[3], c[4]) : day(sy + 1, c[3], c[4]);
  return { start, end, label: c[0] === 'cy' ? String(sy) : C.wLabel(sy) };
}
C.seasonRange = seasonRange;
// A매치 기간 (리그 경기 없음)
const IW = [[3, 23, 3, 31, 'A매치 기간 (3월)'], [6, 1, 6, 9, 'A매치 기간 (6월)'], [9, 1, 9, 9, 'A매치 기간 (9월)'], [10, 6, 10, 14, 'A매치 기간 (10월)'], [11, 10, 11, 18, 'A매치 기간 (11월)']];
C.IW = IW;
const md = (m, d) => m * 100 + d;
function intlBlocked(n) { const [, m, d] = ymd(n), a = md(m, d); return IW.some(w => a >= md(w[0], w[1]) && a <= md(w[2], w[3])); }
function wcBlocked(n) { const [y, m, d] = ymd(n); return C.tournamentsOf(y).includes('WC') && md(m, d) >= 604 && md(m, d) <= 719; }
function inBreak(c, n) { if (c.length < 9) return false; const [, m, d] = ymd(n), a = md(m, d), s = md(c[5], c[6]), e = md(c[7], c[8]); return s <= e ? a >= s && a <= e : a >= s || a <= e; }
C.intlBlocked = intlBlocked;
// 리그 경기 날짜: 토요일을 고르게, 모자라면 수요일 추가 (A매치·휴식기·월드컵 기간 제외)
function leagueDates(nat, start, end, n) {
  const c = calOf(nat);
  const ok = d => !intlBlocked(d) && !inBreak(c, d) && !(c[0] === 'cy' && wcBlocked(d));
  const sats = [], mids = [], rest = [];
  for (let d = start; d <= end; d++) { if (!ok(d)) continue; const w = dowOf(d); if (w === 6) sats.push(d); else if (w === 3) mids.push(d); else if (w === 0) rest.push(d); }
  const spread = (arr, k) => { if (k <= 0) return []; if (k >= arr.length) return arr.slice(); const out = []; for (let i = 0; i < k; i++) out.push(arr[Math.round(i * (arr.length - 1) / Math.max(1, k - 1))]); return out; };
  let dates = sats.length >= n ? spread(sats, n) : sats.concat(spread(mids, n - sats.length));
  if (dates.length < n) dates = dates.concat(spread(rest, n - dates.length));
  let d = end + 1; while (dates.length < n) { dates.push(d); d += 3; }
  return [...new Set(dates)].sort((a, b) => a - b).slice(0, n);
}
// 컵 경기 날짜: 시즌 범위 안에서 고르게 (국내 컵 수요일, 리그컵 화요일)
function cupDates(nat, kind, sy, T) {
  const rg = seasonRange(nat, sy), len = rg.end - rg.start;
  const a = rg.start + 5, b = kind === 'lcup' ? rg.start + Math.round(len * .62) : rg.end - 4;
  const dw = kind === 'lcup' ? 2 : 3, c = calOf(nat);
  const cand = []; for (let d = a; d <= b; d++) if (dowOf(d) === dw && !intlBlocked(d) && !inBreak(c, d)) cand.push(d);
  const out = []; for (let i = 0; i < T; i++) out.push(cand[Math.round(i * (cand.length - 1) / Math.max(1, T - 1))] || b);
  for (let i = 1; i < out.length; i++) if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 7;
  return out;
}

// ---------- 상태 ----------
// w.cal = { d(오늘), lg{리그 id: 시즌}, cup{키: 컵}, cont{키: 대회}, intl{키: 대회}, ix{날짜: [키]}, tq[이적 대기], limbo{선수 id: 명단 항목}, resAdj{} }
// w.cal.h = 무거운 진행 데이터(경기 기록·선수 집계). 저장은 따로 ('calh')
const H = (w, k) => w.cal.h[k] || (w.cal.h[k] = {});
const dictOf = w => { const h = w.cal.h; if (!h.D) h.D = { P: [] }; return h.D; };
C.calDict = w => dictOf(w);
// 경기용 명단 캐시: 명단이 바뀔 때(이적·나이 듦)만 다시 만든다
let SIDES = {}, SIDESW = null, LOC = null;
const cx = (w, id) => C.cix(w, id);
const cid = (w, v) => C.cidOf(w, v);
function sideOf(w, id) { if (SIDESW !== w) { SIDES = {}; SIDESW = w; } return SIDES[id] || (SIDES[id] = C.MD.clubSide(w, id, w.year)); }
const sidesReset = ids => { if (!ids) { SIDES = {}; LOC = null; return; } for (const id of ids) delete SIDES[id]; LOC = null; };
C.calSidesReset = sidesReset;
// 선수 위치 지도 (선수 id → [명단 항목, 구단]). 명단이 바뀌면 다시 만든다
function locMap(w) {
  if (LOC && LOC.w === w) return LOC.m;
  const m = new Map(); for (const id in w.clubs) { const c = w.clubs[id]; if (c.sq) for (const e of c.sq) m.set(String(e[0]), [e, c]); }
  LOC = { w, m }; return m;
}
function idxAdd(w, d, k) { const a = w.cal.ix[d] || (w.cal.ix[d] = []); if (!a.includes(k)) a.push(k); }
function addAgg(agg, ci, list) {
  for (const x of list) {
    const a = agg[x.id] || (agg[x.id] = [ci, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    a[0] = ci; a[1]++; if (x.start) a[2]++; a[3] += Math.max(0, x.off - x.on); a[4] += x.g; a[5] += x.a; a[6] += x.y; a[7] += x.r; a[8] += Math.round(x.rt * 10); a[9] += x.cs || 0;
  }
}
C.calAggCols = ['club', 'apps', 'starts', 'min', 'g', 'a', 'y', 'r', 'rs10', 'cs'];
const curStore = w => {
  const lb = C.wLabel(w.year);
  w.mxPending = w.mxPending || {};
  let st = w.mxPending[lb];
  if (!st) { st = w.mxPending[lb] = C.MD.newStore(lb, w.year); st.gp = 1; w.mxKeys = (w.mxKeys || []).filter(x => x !== lb).concat(lb); }
  if (st.gp && st.P !== dictOf(w).P) Object.defineProperty(st, 'P', { value: dictOf(w).P, enumerable: false, writable: true, configurable: true });
  st._dirty = 1;
  return st;
};
const curArch = w => { w.arch = w.arch || {}; const lb = C.wLabel(w.year); return w.arch[lb] || (w.arch[lb] = { y: w.year, lg: {}, cup: {}, lcup: {}, cont: {} }); };
C.calStore = curStore; C.calArch = curArch;
const resAdd = (w, id, v) => { const r = w.cal.resAdj || (w.cal.resAdj = {}); r[id] = (r[id] || 0) + v; };
// 내 선수가 뛰는 중인가 (커리어 모드, 시즌 진행 단계)
function meClub(S) { const ss = S.ss; return S.mode !== 'world' && ss && ss.on && ss.club ? ss.club : null; }
function uArg(S, side, rec) { return rec && rec.played ? { side, rec, pos: S.p.pos, ovr: C.effOvr(S.p) } : null; }
// 선수별 대회 기록 (P.c): "시즌|대회|경기|골|도움|평점×100|출전 분|클린시트;"
function writeC(w, key, agg) {
  const yOff = w.year - 2000;
  for (const pid in agg) {
    if (pid === 'ME' || pid[0] === '~') continue;
    w.ps = w.ps || {};
    let P = w.ps[pid];
    if (!P) { const f = findE(w, pid); if (!f) continue; const e = f[0]; P = w.ps[pid] = { n: C.pName(w, e), nat: e[5], pos: e[1], h: '' }; }
    const a = agg[pid];
    P.c = (P.c || '') + `${yOff}|${key}|${a[1]}|${a[4]}|${a[5]}|${Math.round(a[8] / a[1] * 10)}|${a[3]}|${a[9]};`;
    C.psDirty = true;
  }
}

// ================= 리그 =================
function lgCreate(w, lg, sy) {
  const nat = lg.nation, rg = seasonRange(nat, sy);
  const rounds = C.leagueRounds(lg), nsplit = C.splitCount(lg);
  const dates = leagueDates(nat, rg.start, rg.end, rounds.length + nsplit);
  const LS = { k: 'L:' + lg.id, id: lg.id, nat, sy, label: rg.label, start: rg.start, end: rg.end, dates, R: rounds.map(ms => ms.map(([a, b]) => [cx(w, a), cx(w, b)])), nreg: rounds.length, nsplit, ri: 0, tb: C.newTable(lg.clubs), done: 0 };
  w.cal.lg[lg.id] = LS;
  w.cal.h[LS.k] = { s: [], e: [], l: [], d: [], r: [], agg: {} };
  dates.forEach(d => idxAdd(w, d, LS.k));
  return LS;
}
function addRes(t, a, b, ga, gb) {
  const A = t[a], B = t[b]; if (!A || !B) return;
  A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
  if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (ga < gb) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
}
async function lgRound(S, LS, d, hooks) {
  const w = S.w, lg = w.lg[LS.id], h = H(w, LS.k);
  if (!h.agg) Object.assign(h, { s: [], e: [], l: [], d: [], r: [], agg: {} });
  // 스플릿: 정규 라운드가 끝난 시점 순위로 대진
  if (LS.ri >= LS.nreg && LS.nsplit && !LS.splitDone) {
    LS.splitDone = 1;
    const sr = C.splitRounds(C.sortTable(LS.tb).map(r => r.id), C.lgFormat(lg));
    LS.R = LS.R.slice(0, LS.nreg).concat(sr.map(ms => ms.map(([a, b]) => [cx(w, a), cx(w, b)])));
  }
  const ms = LS.R[LS.ri] || [], me = meClub(S);
  const keepLn = (lg.tier || 1) <= 2 || (me && lg.clubs.includes(me));
  for (const [ai, bi] of ms) {
    const a = cid(w, ai), b = cid(w, bi);
    if (!w.clubs[a] || !w.clubs[b]) continue;
    let ga, gb, u = null;
    if (me && (a === me || b === me)) {
      const home = a === me, opp = home ? b : a, oc = w.clubs[opp];
      const sorted = C.sortTable(LS.tb), myPos = sorted.findIndex(r => r.id === me), opPos = sorted.findIndex(r => r.id === opp);
      const imp = (LS.ri > LS.dates.length * .75 ? 1 : 0) + (LS.ri >= LS.nreg && LS.nsplit ? 1 : 0) + (opPos < 4 && myPos < 6 ? 1 : 0) + (oc.str > w.clubs[me].str + 3 ? 1 : 0);
      const rec = await C.userMatch(S, { d, kind: 'L', compKey: 'league', compName: lg.name, opp, oppName: oc.name, oppStr: oc.str, home, imp }, hooks);
      ga = home ? rec.gf : rec.ga; gb = home ? rec.ga : rec.gf; u = uArg(S, home ? 0 : 1, rec);
    } else [ga, gb] = C.quickMatch(w.clubs[a].str, w.clubs[b].str, 1);
    addRes(LS.tb, a, b, ga, gb);
    const res = C.MD.play(dictOf(w), sideOf(w, a), sideOf(w, b), ga, gb, u);
    addAgg(h.agg, ai, res.P[0]); addAgg(h.agg, bi, res.P[1]);
    h.s.push(`${C.MD.b62(ai)}.${C.MD.b62(bi)}.${ga}.${gb}`); h.e.push(res.ev); h.l.push(keepLn ? res.ln : ''); h.d.push(d); h.r.push(LS.ri);
    if (C.wn) C.wn.match(S, { k: 'L', comp: LS.id, stage: `${LS.ri + 1}라운드`, a, b, ga, gb, P: res.P, d, ref: { mk: 'L', lg: LS.id, sl: LS.label, i: h.s.length - 1 } });
  }
  LS.ri++;
  w.cal.dirty = 1;
  if (C.wn) C.wn.round(S, LS, d, h);
  if (LS.ri >= LS.dates.length) lgFinalize(S, LS);
}
// 득점·도움·평점 순위 (진행 중에도 쓴다)
function lgLeaders(S, LS, agg) {
  const w = S.w, list = [];
  for (const pid in agg) { const a = agg[pid]; list.push({ id: pid, club: cid(w, a[0]), apps: a[1], min: a[3], g: a[4], a: a[5], rs: a[8] / 10 }); }
  const nm = x => x.id === 'ME' ? S.p.name : C.MD.nameOf(x.id);
  const pidOf = x => x.id === 'ME' || x.id[0] === '~' ? '' : x.id;
  const by = (k1, k2) => (x, z) => z[k1] - x[k1] || z[k2] - x[k2] || x.apps - z.apps;
  const sc = list.filter(x => x.g > 0).sort(by('g', 'a')).slice(0, 15).map(x => x.id === 'ME' ? [nm(x), x.club, x.g, x.a, 1] : [nm(x), x.club, x.g, x.a, 0, pidOf(x)]);
  const as = list.filter(x => x.a > 0).sort(by('a', 'g')).slice(0, 15).map(x => x.id === 'ME' ? [nm(x), x.club, x.a, x.g, 1] : [nm(x), x.club, x.a, x.g, 0, pidOf(x)]);
  const rounds = Math.max(1, LS.ri);
  const posOf = id => (w.ps && w.ps[id] && w.ps[id].pos) || '';
  const ageOf = {}; for (const id of (w.lg[LS.id] || { clubs: [] }).clubs) { const c = w.clubs[id]; if (c && c.sq) for (const e of c.sq) ageOf[String(e[0])] = e[3]; }
  const best = list.filter(x => x.id !== 'ME' && x.id[0] !== '~' && x.apps >= Math.max(3, rounds * .4)).map(x => [nm(x), x.club, +(x.rs / x.apps).toFixed(2), posOf(x.id), pidOf(x), ageOf[x.id] || 0, x.apps]).sort((x, z) => z[2] - x[2]).slice(0, 25);
  return { sc, as, best };
}
C.calLeaders = lgLeaders;
function lgFinalize(S, LS) {
  const w = S.w, lg = w.lg[LS.id], h = H(w, LS.k), agg = h.agg || {};
  const rows = C.sortTable(LS.tb);
  const st = curStore(w), A = curArch(w);
  const per = Math.max(1, Math.floor(lg.clubs.length / 2));
  st.L[LS.id] = { p: per, s: h.s.join(';'), e: h.e, l: h.l, d: h.d, r: h.r, sl: LS.label };
  A.lg[LS.id] = Object.assign({ t: rows.map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]), n: lg.name, sl: LS.label, md: 1, d0: LS.start, d1: LS.end }, lgLeaders(S, LS, agg));
  // 선수 시즌 기록: [시즌, 구단, 경기, 골, 도움, 평점×100, OVR, 나이, 임대, 출전 분, 클린시트]
  const yOff = w.year - 2000, me = meClub(S), written = new Set();
  w.ps = w.ps || {};
  for (const id of lg.clubs) {
    const c = w.clubs[id]; if (!c || !c.sq) continue;
    for (const e of c.sq) {
      const pid = String(e[0]), x = agg[pid];
      if (x && cid(w, x[0]) !== id) continue; // 시즌 도중 이 구단에 온 선수의 다른 구단 기록은 아래에서
      written.add(pid);
      const apps = x ? x[1] : 0;
      e[11] = apps; e[12] = apps ? Math.round(x[8] / apps * 10) : 0;
      if (!apps && ((lg.tier || 1) >= 3 || (e[2] < 50 && !w.ps[pid]))) continue;
      C.psDirty = true;
      const Pp = w.ps[pid] = w.ps[pid] || { n: C.pName(w, e), nat: e[5], pos: e[1], h: '' };
      if (Array.isArray(Pp.h)) Pp.h = Pp.h.map(z => z.join(',')).join(';') + (Pp.h.length ? ';' : '');
      Pp.pos = e[1];
      Pp.h += [yOff, cx(w, id), apps, x ? x[4] : 0, x ? x[5] : 0, apps ? Math.round(x[8] / apps * 10) : 0, e[2], e[3], e[7] ? 1 : 0, x ? x[3] : 0, x ? x[9] : 0].join(',') + ';';
    }
  }
  // 시즌 도중 구단을 옮긴 선수(이적·임대): 이 리그에서 마지막으로 뛴 구단 기준으로 기록
  for (const pid in agg) {
    if (written.has(pid) || pid === 'ME' || pid[0] === '~') continue;
    const x = agg[pid], f = findE(w, pid), e = f && f[0];
    if (!e && !w.ps[pid]) continue;
    const Pp = w.ps[pid] = w.ps[pid] || { n: C.pName(w, e), nat: e[5], pos: e[1], h: '' };
    if (Array.isArray(Pp.h)) Pp.h = Pp.h.map(z => z.join(',')).join(';') + (Pp.h.length ? ';' : '');
    Pp.h += [yOff, x[0], x[1], x[4], x[5], x[1] ? Math.round(x[8] / x[1] * 10) : 0, e ? e[2] : '', e ? e[3] : '', 0, x[3], x[9]].join(',') + ';';
    if (e && f[1].lg !== LS.id && (e[11] || 0) < x[1]) { e[11] = x[1]; e[12] = Math.round(x[8] / x[1] * 10); }
    C.psDirty = true;
  }
  (w.hist.lg[LS.id] = w.hist.lg[LS.id] || []).push({ y: LS.label, c: rows[0] && rows[0].id });
  if (C.wn) C.wn.lgEnd(S, LS, rows, agg);
  w.last[LS.id] = rows.map(r => r.id);
  if (lg.tier === 1 && rows[0]) resAdd(w, rows[0].id, .6);
  // 내 리그 시즌이 끝났다
  if (me && lg.clubs.includes(me) && S.ss) {
    const ss = S.ss;
    ss.lgDone = { id: LS.id, label: LS.label, wl: C.wLabel(w.year), pos: rows.findIndex(r => r.id === me) + 1, n: rows.length, t: rows.map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) };
    ss.myAgg = Object.keys(agg).filter(pid => cid(w, agg[pid][0]) === me).map(pid => { const a = agg[pid]; return { id: pid, pos: pid === 'ME' ? S.p.pos : (w.ps[pid] || {}).pos || '', apps: a[1], g: a[4], a: a[5], r: +(a[8] / 10 / a[1]).toFixed(2) }; });
    if (C.news) C.news(S, `${lg.name} ${LS.label} 시즌 종료: ${w.clubs[me].name} ${ss.lgDone.pos}위`, 'league', ss.lgDone.pos === 1);
  }
  LS.done = 1; LS.fin = rows.map(r => ({ id: r.id, p: r.p, pts: r.pts }));
  delete w.cal.h[LS.k]; w.cal.dirty = 1;
  // 그 나라 리그가 모두 끝나면 승강 → 다음 시즌 일정
  const lgs = Object.values(w.lg).filter(l => l.nation === LS.nat);
  if (lgs.every(l => w.cal.lg[l.id] && w.cal.lg[l.id].done && w.cal.lg[l.id].sy === LS.sy)) nationEnd(S, LS.nat, LS.sy);
}
function nationEnd(S, nat, sy) {
  const w = S.w, lgs = Object.values(w.lg).filter(l => l.nation === nat), tables = {};
  for (const l of lgs) tables[l.id] = w.cal.lg[l.id].fin;
  const moves = C.applyPromotion(w, tables);
  for (const id in moves) resAdd(w, id, moves[id]);
  if (S.ss && S.ss.on && moves[S.ss.club] != null) S.ss.promo = moves[S.ss.club] > 0 ? 1 : -1;
  for (const l of lgs) lgCreate(w, l, sy + 1);
  cupCreate(w, nat, 'cup', sy + 1); cupCreate(w, nat, 'lcup', sy + 1);
}

// ================= 국내 컵 =================
function cupCreate(w, nat, kind, sy) {
  const name = kind === 'cup' ? C.CUPNAME[nat] : C.LCUPNAME[nat]; if (!name) return null;
  const st = C.cupBuild(w, nat, kind, name); if (!st) return null;
  st.k = `C:${nat}:${kind}:${sy}`; st.sy = sy; st.label = seasonRange(nat, sy).label;
  st.dates = cupDates(nat, kind, sy, st.rounds.length);
  w.cal.cup[st.k] = st; w.cal.h[st.k] = { rows: [], agg: {} };
  st.dates.forEach(d => idxAdd(w, d, st.k));
  return st;
}
async function cupDay(S, st, d, hooks) {
  const w = S.w, h = H(w, st.k); if (!h.rows) Object.assign(h, { rows: [], agg: {} });
  while (st.ri < st.rounds.length && st.dates[st.ri] <= d) {
    const rd = st.rounds[st.ri], cur = C.cupDraw(st), ss = S.ss, me = ss && ss.noCup ? null : meClub(S);
    let u = null, urec = null;
    const pair = me ? cur.pairs.find(x => x[0] === me || x[1] === me) : null;
    const kk = st.kind === 'cup' ? 'C' : 'LC';
    if (pair) {
      const home = pair[0] === me, oid = home ? pair[1] : pair[0], opp = w.clubs[oid];
      const final = st.ri === st.rounds.length - 1, left = st.rounds.length - st.ri;
      urec = await C.userMatch(S, { d, kind: kk, compKey: st.kind, compName: st.n, stage: rd.n, opp: oid, oppName: opp.name, oppStr: opp.str, home: final ? null : home, imp: final ? 3 : left <= 3 ? 2 : opp.str > w.clubs[me].str + 3 ? 1 : 0 }, hooks);
      let win = urec.gf > urec.ga;
      if (urec.gf === urec.ga) { win = C.koWinner(w.clubs[me].str, opp.str, 0, 0) === 0; urec.pens = win ? 'W' : 'L'; }
      urec.koWin = win;
      u = { a: pair[0], b: pair[1], ga: home ? urec.gf : urec.ga, gb: home ? urec.ga : urec.gf, win: win ? me : oid };
      if (!win) { ss.alive[kk] = false; ss[kk + 'Out'] = rd.n; }
      else if (final) { ss[kk + 'Won'] = true; ss.alive[kk] = false; }
    } else if (me && st.alive.concat(rd.ent).includes(me) && cur.odd === me) { /* 부전승 */ }
    C.cupResolve(w, st, u);
    const res = st.res[st.res.length - 1];
    for (const m of res.m) {
      const [a, b, ga, gb, pw] = m, isU = u && a === u.a && b === u.b;
      const r = C.MD.play(dictOf(w), sideOf(w, a), sideOf(w, b), ga, gb, isU ? uArg(S, a === me ? 0 : 1, urec) : null, { cup: true });
      h.rows.push([rd.n, cx(w, a), cx(w, b), ga, gb, r.ev, r.ln, pw ? cx(w, pw) : null, d]);
      addAgg(h.agg, cx(w, a), r.P[0]); addAgg(h.agg, cx(w, b), r.P[1]);
      if (C.wn) C.wn.match(S, { k: 'C', comp: st.nat + ':' + st.kind, name: st.n, stage: rd.n, a, b, ga, gb, pw, P: r.P, d, fin: st.ri === st.rounds.length, ref: { mk: 'C', sk: st.nat + ':' + st.kind, ri: h.rows.length - 1, d, a: cx(w, a), b: cx(w, b) } });
    }
    w.cal.dirty = 1;
  }
  if (st.ri >= st.rounds.length) cupFinalize(S, st);
}
function cupFinalize(S, st) {
  const w = S.w, h = H(w, st.k), sum = C.cupSummary(st);
  if (sum) {
    sum.sl = st.label;
    const A = curArch(w), store = curStore(w);
    (st.kind === 'cup' ? A.cup : A.lcup)[st.nat] = sum;
    if (C.wn) C.wn.cupEnd(S, st, sum);
    store.CUP[st.nat + ':' + st.kind] = (h.rows || []).map(r => r.slice(0, 8).concat([r[8]]));
    if (st.kind === 'cup') (w.hist.cup[st.nat] = w.hist.cup[st.nat] || []).push({ y: st.label, c: sum.w });
    writeC(w, st.kind + ':' + st.nat, h.agg || {});
  }
  delete w.cal.cup[st.k]; delete w.cal.h[st.k]; w.cal.dirty = 1;
}

// ================= 대륙 대회 =================
// 일정: 리그 페이즈 날짜, 토너먼트 [1차전, 2차전(없으면 단판), 이름]. yo = 시작 연도 기준 몇 년 뒤
const CONTSCH = {
  UCL: { ph: [[9, 16, 0], [9, 30, 0], [10, 21, 0], [11, 4, 0], [11, 25, 0], [12, 9, 0], [1, 20, 1], [1, 27, 1]], kd: [[[2, 17, 1], [2, 24, 1], '플레이오프'], [[3, 10, 1], [3, 17, 1], '16강'], [[4, 7, 1], [4, 14, 1], '8강'], [[4, 28, 1], [5, 5, 1], '4강'], [[5, 30, 1], null, '결승']] },
  UEL: { ph: [[9, 25, 0], [10, 2, 0], [10, 23, 0], [11, 6, 0], [11, 27, 0], [12, 11, 0], [1, 22, 1], [1, 29, 1]], kd: [[[2, 19, 1], [2, 26, 1], '플레이오프'], [[3, 12, 1], [3, 19, 1], '16강'], [[4, 9, 1], [4, 16, 1], '8강'], [[4, 30, 1], [5, 7, 1], '4강'], [[5, 20, 1], null, '결승']] },
  UECL: { ph: [[10, 2, 0], [10, 23, 0], [11, 6, 0], [11, 27, 0], [12, 11, 0], [12, 18, 0]], kd: [[[2, 19, 1], [2, 26, 1], '플레이오프'], [[3, 12, 1], [3, 19, 1], '16강'], [[4, 9, 1], [4, 16, 1], '8강'], [[4, 30, 1], [5, 7, 1], '4강'], [[5, 27, 1], null, '결승']] },
  ACL: { ph: [[9, 16, 0], [9, 30, 0], [10, 21, 0], [11, 4, 0], [11, 25, 0], [12, 9, 0]], kd: [[[3, 3, 1], [3, 10, 1], '8강'], [[4, 21, 1], [4, 28, 1], '4강'], [[5, 9, 1], null, '결승']] },
  LIB: { ph: [[4, 1, 0], [4, 8, 0], [4, 22, 0], [5, 6, 0], [5, 13, 0], [5, 27, 0]], kd: [[[8, 12, 0], [8, 19, 0], '16강'], [[9, 16, 0], [9, 23, 0], '8강'], [[10, 21, 0], [10, 28, 0], '4강'], [[11, 28, 0], null, '결승']] },
  SUD: { ph: [[4, 2, 0], [4, 9, 0], [4, 23, 0], [5, 7, 0], [5, 14, 0], [5, 28, 0]], kd: [[[9, 17, 0], [9, 24, 0], '8강'], [[10, 22, 0], [10, 29, 0], '4강'], [[11, 21, 0], null, '결승']] },
  CCC: { ph: [], kd: [[[2, 17, 0], [2, 24, 0], '16강'], [[3, 10, 0], [3, 17, 0], '8강'], [[4, 7, 0], [4, 14, 0], '4강'], [[5, 30, 0], null, '결승']] }
};
const CONT_CY = new Set(['LIB', 'SUD', 'CCC']);
C.CONT_CY = CONT_CY;
function contCreate(w, k, sy, parts) {
  const def = C.COMPS[k], sch = CONTSCH[k], teams = (parts || C.contParticipants(w))[k] || [];
  if (teams.length < 8) return null;
  const dd = x => day(sy + x[2], x[0], x[1]);
  const cs = { k, key: `E:${k}:${sy}`, name: def.name, sy, label: CONT_CY.has(k) ? String(sy) : C.wLabel(sy), teams: teams.slice(), table: C.newTable(teams), done: false, winner: null, ties: [], userOut: false };
  // 리그 페이즈 대진: 같은 나라끼리는 되도록 피하고, 경기일마다 한 팀이 한 경기만 하도록 배정
  const nPh = Math.min(def.phase, sch.ph.length);
  cs.md = [];
  if (nPh) {
    const opp = {}; for (const t of teams) opp[t] = [];
    for (const t of shuffle(teams.slice())) {
      let guard = 0;
      while (opp[t].length < nPh && guard++ < 220) {
        const o = pick(teams);
        if (o === t || opp[t].includes(o) || opp[o].length >= nPh) continue;
        if (w.clubs[o].nat === w.clubs[t].nat && guard < 140) continue;
        opp[t].push(o); opp[o].push(t);
      }
    }
    const pairs = []; const seen = new Set();
    for (const t of teams) for (const o of opp[t]) { const key = t < o ? t + '|' + o : o + '|' + t; if (seen.has(key)) continue; seen.add(key); pairs.push(R() < .5 ? [t, o] : [o, t]); }
    for (let i = 0; i < nPh; i++) cs.md.push([]);
    const busy = Array.from({ length: nPh }, () => new Set());
    for (const p of shuffle(pairs)) {
      let i = busy.findIndex(b => !b.has(p[0]) && !b.has(p[1]));
      if (i < 0) i = busy.reduce((bi, b, j) => b.size < busy[bi].size ? j : bi, 0);
      busy[i].add(p[0]); busy[i].add(p[1]); cs.md[i].push(p);
    }
  }
  const nKO = Math.log2(def.ko);
  cs.rounds = (def.playoff ? sch.kd : sch.kd.filter(r => r[2] !== '플레이오프').slice(-nKO)).map(r => [dd(r[0]), r[1] ? dd(r[1]) : null, r[2]]);
  cs.dates = sch.ph.slice(0, nPh).map(dd); cs.phaseN = cs.dates.length;
  cs.kmap = [];
  cs.rounds.forEach((r, ri) => { cs.dates.push(r[0]); cs.kmap.push([ri, 0]); if (r[1]) { cs.dates.push(r[1]); cs.kmap.push([ri, 1]); } });
  cs.di = 0;
  w.cal.cont[cs.key] = cs; w.cal.h[cs.key] = { rows: [], agg: {} };
  cs.dates.forEach(d => idxAdd(w, d, cs.key));
  return cs;
}
async function contUser(S, cs, oid, home, stage, imp, d, hooks) {
  const w = S.w, oc = w.clubs[oid];
  return C.userMatch(S, { d, kind: 'E', compKey: 'cont', compName: cs.name, stage, opp: oid, oppName: oc.name, oppStr: oc.str, home, imp }, hooks);
}
function contRow(S, cs, h, stage, a, b, ga, gb, u, pw, d) {
  const w = S.w;
  const r = C.MD.play(dictOf(w), sideOf(w, a), sideOf(w, b), ga, gb, u);
  h.rows.push([stage, cx(w, a), cx(w, b), ga, gb, r.ev, r.ln, pw ? cx(w, pw) : null, d]);
  addAgg(h.agg, cx(w, a), r.P[0]); addAgg(h.agg, cx(w, b), r.P[1]);
  if (C.wn) C.wn.match(S, { k: 'E', comp: cs.k, name: cs.name, stage, a, b, ga, gb, pw, P: r.P, d, ref: { mk: 'E', sk: cs.k, ri: h.rows.length - 1, d, a: cx(w, a), b: cx(w, b) } });
}
function contPhaseEnd(S, cs) {
  const def = C.COMPS[cs.k], sorted = C.sortTable(cs.table).map(r => r.id);
  cs.phaseRank = sorted;
  if (def.playoff) { cs.direct = sorted.slice(0, 8); cs.po = sorted.slice(8, 24); }
  else cs.direct = sorted.slice(0, def.ko);
  cs.phaseDone = true;
  const me = meClub(S);
  if (me && cs.teams.includes(me) && !sorted.slice(0, def.playoff ? 24 : def.ko).includes(me)) { cs.userOut = true; S.ss.contOut = '리그 페이즈'; }
}
function contDraw(cs, ri) {
  if (cs.ties[ri]) return;
  const def = C.COMPS[cs.k];
  let pool;
  if (def.phase === 0 && ri === 0) pool = cs.teams.slice(0, def.ko);
  else if (ri === 0 && def.playoff) pool = cs.po.slice();
  else if (ri === (def.playoff ? 1 : 0)) pool = (cs.direct || []).concat(def.playoff && cs.ties[0] ? cs.ties[0].map(t => t.win) : []);
  else pool = cs.ties[ri - 1].map(t => t.win);
  pool = shuffle(pool.filter(Boolean));
  cs.ties[ri] = []; for (let i = 0; i + 1 < pool.length; i += 2) cs.ties[ri].push([pool[i], pool[i + 1]]);
}
async function contDay(S, cs, d, hooks) {
  const w = S.w, h = H(w, cs.key); if (!h.rows) Object.assign(h, { rows: [], agg: {} });
  const ss = S.ss, me = ss && ss.noCont ? null : meClub(S);
  while (cs.di < cs.dates.length && cs.dates[cs.di] <= d) {
    const i = cs.di++;
    if (i < cs.phaseN) {
      for (const [a, b] of cs.md[i] || []) {
        let ga, gb, u = null;
        if (me && (a === me || b === me) && !cs.userOut) {
          const home = a === me, oid = home ? b : a;
          const rec = await contUser(S, cs, oid, home, '리그 페이즈', w.clubs[oid].str > w.clubs[me].str + 2 ? 2 : 1, d, hooks);
          ga = home ? rec.gf : rec.ga; gb = home ? rec.ga : rec.gf; u = uArg(S, home ? 0 : 1, rec); ss.cont = cs.k;
        } else [ga, gb] = C.quickMatch(w.clubs[a].str, w.clubs[b].str, 1);
        addRes(cs.table, a, b, ga, gb);
        contRow(S, cs, h, '리그 페이즈', a, b, ga, gb, u, null, d);
      }
      if (i === cs.phaseN - 1) contPhaseEnd(S, cs);
      continue;
    }
    if (!cs.phaseDone) contPhaseEnd(S, cs);
    const [ri, leg] = cs.kmap[i - cs.phaseN], rd = cs.rounds[ri], two = !!rd[1], final = !two && ri === cs.rounds.length - 1;
    if (leg === 0) contDraw(cs, ri);
    for (const t of cs.ties[ri]) {
      if (t.win) continue;
      const hA = leg === 0 ? t[0] : t[1], aA = leg === 0 ? t[1] : t[0];
      const stage = rd[2] + (two ? (leg === 0 ? ' 1차전' : ' 2차전') : '');
      let hg, ag, u = null;
      if (me && (t[0] === me || t[1] === me)) {
        const oid = t[0] === me ? t[1] : t[0];
        const rec = await contUser(S, cs, oid, final ? null : hA === me, stage, final ? 3 : 2, d, hooks);
        hg = hA === me ? rec.gf : rec.ga; ag = hA === me ? rec.ga : rec.gf; u = uArg(S, hA === me ? 0 : 1, rec); ss.cont = cs.k;
        t.ui = (t.ui || []).concat(ss.matches.indexOf(rec)); t.urec = rec;
      } else [hg, ag] = C.quickMatch(w.clubs[hA].str, w.clubs[aA].str, final ? 0 : 1);
      t.l = (t.l || []).concat([[hg, ag]]);
      const done = !two || leg === 1;
      let pw = null;
      if (done) {
        const a0 = t.l.reduce((s, l, j) => s + (j === 0 ? l[0] : l[1]), 0), b0 = t.l.reduce((s, l, j) => s + (j === 0 ? l[1] : l[0]), 0);
        t.win = C.koWinner(w.clubs[t[0]].str, w.clubs[t[1]].str, a0, b0) === 0 ? t[0] : t[1];
        t.sc = [a0, b0]; if (a0 === b0) { t.pen = 1; pw = t.win; }
        if (me && (t[0] === me || t[1] === me)) {
          const rec = t.urec; if (rec) { rec.koWin = t.win === me; if (a0 === b0) rec.pens = t.win === me ? 'W' : 'L'; if (two) rec.agg = t[0] === me ? [a0, b0] : [b0, a0]; }
          if (t.win !== me) { cs.userOut = true; ss.contOut = rd[2]; } else if (final) ss.contWon = true;
        }
        delete t.urec;
      }
      contRow(S, cs, h, stage, hA, aA, hg, ag, u, pw, d);
    }
    if (final) { cs.done = true; cs.winner = cs.ties[ri][0] && cs.ties[ri][0].win; }
    w.cal.dirty = 1;
  }
  if (cs.di >= cs.dates.length && !cs.finalized) contFinalize(S, cs);
}
function contFinalize(S, cs) {
  const w = S.w, h = H(w, cs.key), A = curArch(w), store = curStore(w);
  cs.finalized = 1;
  A.cont[cs.k] = { n: cs.name, w: cs.winner, sl: cs.label, ph: cs.phaseN ? C.sortTable(cs.table).slice(0, 36).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) : null, r: (cs.ties || []).map((ts, i) => ({ n: (cs.rounds[i] || [])[2] || '', t: (ts || []).map(t => [t[0], t[1], t.win || null, t.sc ? t.sc[0] : null, t.sc ? t.sc[1] : null, t.pen ? 1 : 0]) })) };
  store.CONT[cs.k] = (h.rows || []).slice();
  if (C.wn) C.wn.contEnd(S, cs, h);
  if (cs.winner) { (w.hist.cont[cs.k] = w.hist.cont[cs.k] || []).push({ y: cs.label, c: cs.winner }); resAdd(w, cs.winner, C.COMPS[cs.k].tier === 1 ? 1 : .4); }
  writeC(w, 'cont:' + cs.k, h.agg || {});
  delete w.cal.cont[cs.key]; delete w.cal.h[cs.key]; w.cal.dirty = 1;
}

// ================= 국제 대회 =================
// 날짜: [시작 월, 일]. 조별리그 3경기일(4일 간격) → 토너먼트
const TDATES = { WC: [6, 11], EURO: [6, 12], COPA: [6, 14], ASIA: [1, 8], AFCON: [1, 13], GOLD: [6, 14] };
const KONAME = { 32: '32강', 16: '16강', 8: '8강', 4: '4강', 2: '결승' };
const SIZES = [48, 32, 24, 16, 12, 8];
const koSize = n => n >= 48 ? 32 : n >= 24 ? 16 : n >= 12 ? 8 : 4;
function seedOrder(K) { let o = [1]; while (o.length < K) { const L = o.length * 2 + 1; o = o.flatMap(s => [s, L - s]); } return o; }
function ntStrengths(S) {
  const w = S.w, pools = C.nationPools(w), st = {};
  for (const n in pools) if (pools[n].all.length >= 8) st[n] = C.nationStrength(pools[n]);
  for (const n in C.NTBASE) { const ps = pools[n] ? C.nationStrength(pools[n]) : 0; st[n] = Math.max(st[n] || 0, C.NTBASE[n] + N(0, .8), ps); }
  return { st, pools };
}
function intlCreate(S, key, y) {
  const w = S.w, def = C.TDEF[key]; if (!def) return null;
  const { st: strengths } = ntStrengths(S);
  const conf = n => C.confOf(n);
  const rank = list => list.map(n => [n, strengths[n] + N(0, 2.2)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const all = Object.keys(strengths);
  let field = [];
  if (key === 'WC') { for (const cf in def.quota) field.push(...rank(all.filter(n => conf(n) === cf)).slice(0, def.quota[cf])); field.push(...rank(all.filter(n => !field.includes(n))).slice(0, 48 - field.length)); }
  else { field = rank(all.filter(n => conf(n) === def.conf)).slice(0, def.size); if (def.guest) field.push(...rank(all.filter(n => conf(n) === def.guest)).slice(0, def.size - field.length)); }
  const size = SIZES.find(s => s <= field.length); if (!size) return null;
  field = field.slice(0, size);
  const ng = size / 4, sorted = field.slice().sort((a, b) => strengths[b] - strengths[a]);
  const groups = Array.from({ length: ng }, (_, i) => ({ n: String.fromCharCode(65 + i), t: [], m: [] }));
  for (let pot = 0; pot < 4; pot++) { const p = shuffle(sorted.slice(pot * ng, pot * ng + ng)); p.forEach((n, i) => groups[i].t.push(n)); }
  const d0 = day(y, TDATES[key][0], TDATES[key][1]);
  const PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const fx = [];
  groups.forEach((g, gi) => PAIRS.forEach(([i, j], k) => fx.push({ d: d0 + Math.floor(k / 2) * 4 + (gi % 3), g: gi, a: g.t[i], b: g.t[j] })));
  const K = koSize(size), kdays = []; let dk = d0 + 13;
  for (let n = K; n >= 2; n /= 2) { kdays.push(dk); dk += n >= 16 ? 4 : 5; }
  const T = { k: key, key: `I:${key}:${y}`, n: def.name, y, g: groups, fx, ko: [], K, kdays, str: strengths, size, w: null, ru: null, teams: size, mxl: null };
  T.dates = [...new Set(fx.map(f => f.d).concat(kdays))].sort((a, b) => a - b);
  w.cal.intl[T.key] = T; w.cal.h[T.key] = { rows: [], agg: {} };
  T.dates.forEach(d => idxAdd(w, d, T.key));
  return T;
}
// 내 나라 대표팀 경기 (월드컵·유로 등)
async function intlUser(S, T, opp, stage, d, hooks) {
  const ss = S.ss, p = S.p;
  const myS = ss.ntStr || T.str[p.nat], oS = T.str[opp];
  const [lamT, lamO] = C.lambdas(myS, oS, 0);
  const rec = { d, comp: 'nt', compName: T.n, stage, opp, oppName: C.natName(opp), home: null, natTeam: C.natName(p.nat), gf: 0, ga: 0, played: false };
  if (!(ss.inj > 0) && R() < ((ss.nt && ss.nt.start) || .5) + .2) {
    const minutes = R() < .7 ? 90 : rint(60, 88);
    const r = C.playerMatch(p, { lamT, lamO, minutes, start: true, sT: myS, sO: oS, penTaker: ss.penTaker });
    Object.assign(rec, { gf: r.gf, ga: r.ga, st: r.st, shots: r.shots, played: true, start: true, min: minutes });
    const res = rec.gf > rec.ga ? 1 : rec.gf < rec.ga ? -1 : 0;
    rec.rating = C.matchRating(p, rec.st, res); rec.st.ratingSum = rec.rating; rec.st.rated = 1;
    if (res > 0) rec.st.wins = 1; else if (res < 0) rec.st.losses = 1; else rec.st.draws = 1;
  } else { const [a, b] = C.quickMatch(myS, oS, 0); rec.gf = a; rec.ga = b; rec.why = ss.inj > 0 ? '부상' : '벤치'; }
  ss.matches.push(rec); (ss.tmatches = ss.tmatches || []).push(rec);
  if (C.extras) C.extras.onMatch(S, rec);
  if (hooks && hooks.match) await hooks.match(rec);
  return rec;
}
async function intlDay(S, T, d, hooks) {
  const w = S.w, h = H(w, T.key); if (!h.rows) Object.assign(h, { rows: [], agg: {} });
  const ss = S.ss, me = S.mode !== 'world' && ss && ss.on && ss.nt && ss.nt.lvl === 'A' ? S.p.nat : null;
  const amp = x => 72 + (x - 72) * 1.45;
  const pools = T._pools || (T._pools = C.nationPools(w));
  const playOne = async (a, b, ko, stage) => {
    const sa = amp(T.str[a]) + N(0, 1), sb = amp(T.str[b]) + N(0, 1);
    let ga, gb, pw = 0, win = null, urec = null;
    if (me && (a === me || b === me)) {
      const opp = a === me ? b : a;
      urec = await intlUser(S, T, opp, stage, d, hooks);
      ga = a === me ? urec.gf : urec.ga; gb = a === me ? urec.ga : urec.gf;
      if (ko) { if (ga === gb) { const won = R() < 1 / (1 + Math.exp(-(T.str[me] - T.str[opp]) * .06)); urec.pens = won ? 'W' : 'L'; win = won ? me : opp; pw = win; } else win = ga > gb ? a : b; urec.koWin = win === me; }
    } else {
      [ga, gb] = C.quickMatch(sa, sb, 0);
      if (ko) { win = C.koWinner(sa, sb, ga, gb) === 0 ? a : b; if (ga === gb) pw = win; }
    }
    const u = urec && urec.played ? { side: a === me ? 0 : 1, rec: urec, pos: S.p.pos, ovr: C.effOvr(S.p) } : null;
    const r = C.MD.play(dictOf(w), C.MD.natSide(w, a, pools, w.year), C.MD.natSide(w, b, pools, w.year), ga, gb, u);
    h.rows.push([stage, a, b, ga, gb, r.ev, r.ln, pw || null, d]);
    addAgg(h.agg, a, r.P[0]); addAgg(h.agg, b, r.P[1]);
    if (C.wn) C.wn.match(S, { k: 'I', comp: T.k, name: `${T.n} ${T.y}`, stage, a, b, ga, gb, pw, P: r.P, d, nat: 1, sa: T.str[a], sb: T.str[b], fin: stage === '결승', ref: { mk: 'I', sk: T.k, ri: h.rows.length - 1, d, a, b } });
    return { m: [a, b, ga, gb, pw], win };
  };
  // 조별리그
  for (const f of T.fx) if (!f.done && f.d <= d) {
    f.done = 1;
    const r = await playOne(f.a, f.b, false, '조별리그');
    T.g[f.g].m.push(r.m);
  }
  // 토너먼트
  const gDone = T.fx.every(f => f.done);
  if (gDone && !T.q) {
    for (const g of T.g) { const tb = C.newTable(g.t); for (const m of g.m) addRes(tb, m[0], m[1], m[2], m[3]); g.rows = C.sortTable(tb).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]); }
    const K = T.K, key3 = r => r[7] * 1000 + (r[5] - r[6]) * 10 + r[5];
    const f1 = T.g.map(g => g.rows[0]), f2 = T.g.map(g => g.rows[1]), f3 = T.g.map(g => g.rows[2]);
    const q = [...f1.sort((a, b) => key3(b) - key3(a)), ...f2.sort((a, b) => key3(b) - key3(a)), ...f3.sort((a, b) => key3(b) - key3(a))].slice(0, K).map(r => r[0]);
    T.q = seedOrder(K).map(s => q[s - 1]); T.cur = T.q.slice();
    if (me && T.g.some(g => g.t.includes(me)) && !q.includes(me)) T.uStage = '조별리그 탈락';
  }
  while (T.q && T.cur.length >= 2 && T.ko.length < T.kdays.length && T.kdays[T.ko.length] <= d) {
    const n = T.cur.length, name = KONAME[n], ms = [], next = [];
    for (let i = 0; i < T.cur.length; i += 2) {
      const r = await playOne(T.cur[i], T.cur[i + 1], true, name);
      ms.push(r.m); next.push(r.win);
      if (me && (T.cur[i] === me || T.cur[i + 1] === me) && r.win !== me && !T.uStage) T.uStage = n === 2 ? '준우승' : name;
    }
    T.ko.push({ n: name, m: ms }); T.cur = next;
  }
  w.cal.dirty = 1;
  if (T.q && T.cur.length === 1) intlFinalize(S, T);
}
function intlFinalize(S, T) {
  const w = S.w, h = H(w, T.key), p = S.p, ss = S.ss;
  T.w = T.cur[0]; const f = T.ko[T.ko.length - 1].m[0]; T.ru = f[0] === T.w ? f[1] : f[0];
  const store = curStore(w);
  store.INTL[T.k] = (h.rows || []).slice();
  T.mxl = C.wLabel(w.year);
  w.intl = w.intl || {};
  const out = { k: T.k, n: T.n, y: T.y, g: T.g.map(g => ({ n: g.n, m: g.m, rows: g.rows })), ko: T.ko, w: T.w, ru: T.ru, teams: T.teams, mxl: T.mxl };
  w.intl[T.y] = (w.intl[T.y] || []).filter(x => x.k !== T.k).concat(out);
  (w.hist.nt[T.k] = w.hist.nt[T.k] || []).push({ y: T.y, c: T.w });
  writeC(w, 'nt:' + T.k, h.agg || {});
  if (C.wn) C.wn.intlEnd(S, T, h);
  if (C.news && S.mode !== 'world' && (T.k === 'WC' || C.TDEF[T.k].conf === C.confOf(p.nat))) C.news(S, `${T.y} ${T.n}: ${C.natName(T.w)} 우승 (결승 상대 ${C.natName(T.ru)})`, 'intl', T.k === 'WC');
  // 내 대회 결과
  if (S.mode !== 'world' && ss && ss.on && (T.k === 'WC' || C.TDEF[T.k].conf === C.confOf(p.nat) || C.TDEF[T.k].guest === C.confOf(p.nat))) {
    const inField = T.g.some(g => g.t.includes(p.nat));
    if (ss.nt && ss.nt.lvl === 'A' && (T.k === 'WC' || !ss.tourn)) {
      const mine = (ss.tmatches || []).filter(m => m.compName === T.n);
      ss.tourn = inField ? { name: T.n, y: T.y, k: T.k, stage: T.w === p.nat ? '우승' : (T.uStage || '조별리그 탈락'), won: T.w === p.nat, matches: mine } : { name: T.n, y: T.y, k: T.k, stage: '본선 진출 실패', won: false, matches: [] };
    }
  }
  for (const yy in w.intl) if (+yy < T.y - 12) w.intl[yy] = w.intl[yy].map(t => ({ k: t.k, n: t.n, y: t.y, w: t.w, ru: t.ru, ko: t.ko.slice(-1), g: [], slim: 1 }));
  delete w.cal.intl[T.key]; delete w.cal.h[T.key]; w.cal.dirty = 1;
}

// ================= A매치: UEFA 네이션스리그 + 친선전 =================
// 세계 연도(8월~다음 해 7월)마다 9·10·11·3·6월 A매치 기간에 두 경기씩. 짝수 해에 시작하는 연도는 네이션스리그
// (리그 페이즈 9~11월, 8강 3월 홈·원정, 파이널스 6월), 그 밖의 나라와 날짜는 친선전
C.TDEF.UNL = { name: 'UEFA 네이션스리그', conf: 'UEFA', am: 1 };
C.TDEF.AM = { name: 'A매치 친선전', am: 1 };
const AMWIN = [[9, 4, 7], [10, 9, 12], [11, 13, 16], [3, 26, 29], [6, 5, 8]];
const amDates = wy => AMWIN.map(([m, a, b]) => { const yy = m >= 8 ? wy : wy + 1; return [day(yy, m, a), day(yy, m, b), m]; });
C.amDates = amDates;
const UPAIRS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]], [[1, 0], [3, 2]], [[2, 0], [3, 1]], [[3, 0], [2, 1]]];
const amH = (w, c, wy) => { const k = 'A:' + c + ':' + wy, h = H(w, k); if (!h.rows) Object.assign(h, { rows: [], agg: {} }); return h; };
// 친선전 짝짓기: 전력이 비슷한 나라끼리, 되도록 같은 대륙
function amPair(nats, st, avoid) {
  const L = shuffle(nats.slice()).map(n => [n, (st[n] || 55) + N(0, 4)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const out = [], used = new Set();
  for (let i = 0; i < L.length; i++) {
    const a = L[i]; if (used.has(a)) continue;
    let best = -1;
    for (let j = i + 1; j < Math.min(L.length, i + 10); j++) {
      const b = L[j]; if (used.has(b) || (avoid && avoid.has(a + '|' + b))) continue;
      if (best < 0) best = j;
      if (C.confOf(a) === C.confOf(b) && R() < .6) { best = j; break; }
    }
    if (best < 0) continue;
    const b = L[best]; used.add(a); used.add(b); out.push(R() < .5 ? [a, b] : [b, a]);
  }
  return out;
}
function amFriendlies(AM, nats, d1, d2) {
  const p1 = amPair(nats, AM.str), seen = new Set(p1.flatMap(([a, b]) => [a + '|' + b, b + '|' + a]));
  const p2 = amPair(nats, AM.str, seen);
  for (const [a, b] of p1) AM.fx.push({ d: d1, a, b, c: 'AM', stage: '친선전' });
  for (const [a, b] of p2) AM.fx.push({ d: d2, a, b, c: 'AM', stage: '친선전' });
}
function amSetup(S) {
  const w = S.w, wy = w.year, { st } = ntStrengths(S);
  const nats = Object.keys(st).sort((a, b) => st[b] - st[a]).slice(0, 140);
  const AM = w.cal.am = { wy, fx: [], str: {} };
  for (const n of nats) AM.str[n] = +st[n].toFixed(1);
  const dates = amDates(wy), today = w.cal.d;
  let U_ = null;
  if (wy % 2 === 0 && today < dates[0][0]) U_ = unlCreate(S, wy, nats, st);
  else if (w.cal.unl && w.cal.unl.y0 !== wy) w.cal.unl = null;
  const lvA = U_ ? new Set(U_.g.filter(g => g.lv === 'A').flatMap(g => g.t)) : new Set();
  const inUNL = U_ ? new Set(U_.g.flatMap(g => g.t)) : new Set();
  dates.forEach(([d1, d2, m], wi) => {
    if (d2 <= today) return;
    let free = nats;
    if (U_ && m >= 9) {
      U_.g.forEach((g, gi) => [wi * 2, wi * 2 + 1].forEach(md => { for (const [i, j] of UPAIRS[md]) AM.fx.push({ d: md === wi * 2 ? d1 : d2, a: g.t[i], b: g.t[j], c: 'UNL', stage: `리그 ${g.lv} ${g.n}조 ${md + 1}차전`, g: gi }); }));
      free = nats.filter(n => !inUNL.has(n));
    } else if (U_) free = nats.filter(n => !lvA.has(n)); // 3·6월: 리그 A는 8강·파이널스 대진이 정해진 뒤 따로
    amFriendlies(AM, free, d1, d2);
  });
  AM.fx.sort((a, b) => a.d - b.d);
  for (const f of AM.fx) idxAdd(w, f.d, 'A:' + wy);
  return AM;
}
function unlCreate(S, wy, nats, st) {
  const w = S.w, uefa = nats.filter(n => C.confOf(n) === 'UEFA');
  const g = []; let i = 0;
  for (const lv of ['A', 'B', 'C', 'D']) {
    const n = Math.min(16, Math.floor((uefa.length - i) / 4) * 4); if (n < 4) break;
    const t = uefa.slice(i, i + n); i += n;
    const ng = n / 4, gs = Array.from({ length: ng }, (_, k) => ({ lv, n: `${lv}${k + 1}`, t: [], m: [] }));
    for (let pot = 0; pot < 4; pot++) shuffle(t.slice(pot * ng, pot * ng + ng)).forEach((x, k) => gs[k].t.push(x));
    for (const x of gs) x.tb = C.newTable(x.t);
    g.push(...gs);
  }
  w.cal.unl = { y0: wy, label: C.wLabel(wy), g, qf: null, sf: null, f: null, third: null, w: null, ru: null };
  return w.cal.unl;
}
function unlAdvance(S, d) {
  const w = S.w, U_ = w.cal.unl, AM = w.cal.am; if (!U_ || !AM || U_.y0 !== AM.wy) return;
  const dates = amDates(AM.wy), add = f => { AM.fx.push(f); idxAdd(w, f.d, 'A:' + AM.wy); };
  const A = U_.g.filter(g => g.lv === 'A');
  const phaseDone = !AM.fx.some(f => f.c === 'UNL' && f.g != null && !f.done);
  if (phaseDone && !U_.qf && A.length === 4) {
    const rk = A.map(g => C.sortTable(g.tb).map(r => r.id));
    U_.rk = U_.g.map(g => C.sortTable(g.tb).map(r => r.id));
    const pairs = [[rk[0][0], rk[1][1]], [rk[1][0], rk[0][1]], [rk[2][0], rk[3][1]], [rk[3][0], rk[2][1]]];
    U_.qf = pairs.map(([a, b]) => ({ t: [a, b], l: [] }));
    const [d1, d2] = dates[3];
    U_.qf.forEach((q, qi) => { add({ d: d1, a: q.t[1], b: q.t[0], c: 'UNL', stage: '8강 1차전', qf: qi }); add({ d: d2, a: q.t[0], b: q.t[1], c: 'UNL', stage: '8강 2차전', qf: qi, leg2: 1 }); });
    const rest = A.flatMap(g => g.t).filter(n => !U_.qf.some(q => q.t.includes(n)));
    amFriendlies(AM, rest, d1, d2); for (const f of AM.fx) if (!f.done) idxAdd(w, f.d, 'A:' + AM.wy);
  }
  if (U_.qf && !U_.sf && U_.qf.every(q => q.win)) {
    const [d1, d2] = dates[4];
    U_.sf = [{ t: [U_.qf[0].win, U_.qf[2].win] }, { t: [U_.qf[1].win, U_.qf[3].win] }];
    U_.sf.forEach((q, qi) => add({ d: d1, a: q.t[0], b: q.t[1], c: 'UNL', stage: '준결승', sf: qi, ko: 1, n: 1 }));
    const rest = A.flatMap(g => g.t).filter(n => !U_.sf.some(q => q.t.includes(n)));
    amFriendlies(AM, rest, d1, d2); for (const f of AM.fx) if (!f.done) idxAdd(w, f.d, 'A:' + AM.wy);
  }
  if (U_.sf && !U_.f && U_.sf.every(q => q.win)) {
    const d2 = dates[4][1], lo = U_.sf.map(q => q.t[0] === q.win ? q.t[1] : q.t[0]);
    U_.f = { t: [U_.sf[0].win, U_.sf[1].win] }; U_.third = { t: lo };
    add({ d: d2, a: lo[0], b: lo[1], c: 'UNL', stage: '3·4위전', th: 1, ko: 1, n: 1 });
    add({ d: d2, a: U_.f.t[0], b: U_.f.t[1], c: 'UNL', stage: '결승', fin: 1, ko: 1, n: 1 });
  }
  AM.fx.sort((a, b) => a.d - b.d);
}
const ampS = x => 72 + (x - 72) * 1.45;
async function amDay(S, d, hooks) {
  const w = S.w, AM = w.cal.am; if (!AM) return;
  if (!AM._pools) Object.defineProperty(AM, '_pools', { value: C.nationPools(w), writable: true, configurable: true });
  const pools = AM._pools, ss = S.ss;
  const me = S.mode !== 'world' && ss && ss.on && ss.nt && ss.nt.lvl === 'A' ? S.p.nat : null;
  const U_ = w.cal.unl;
  for (const f of AM.fx) {
    if (f.done || f.d !== d) continue;
    f.done = 1;
    const h = amH(w, f.c, AM.wy);
    const sa = ampS(AM.str[f.a] || 55) + N(0, 1), sb = ampS(AM.str[f.b] || 55) + N(0, 1);
    let ga, gb, u = null, pw = null, urec = null;
    if (me && (f.a === me || f.b === me)) {
      const home = f.a === me, opp = home ? f.b : f.a;
      urec = await C.doNational(S, { d, k: 'N', opp, stage: f.stage, compName: f.c === 'UNL' ? 'UEFA 네이션스리그' : 'A매치', home: f.n ? null : home, oppStr: AM.str[opp] }, hooks);
      if (urec) { ga = home ? urec.gf : urec.ga; gb = home ? urec.ga : urec.gf; if (urec.played) u = { side: home ? 0 : 1, rec: urec, pos: S.p.pos, ovr: C.effOvr(S.p) }; }
    }
    if (ga == null) [ga, gb] = C.quickMatch(sa, sb, f.n ? 0 : 1);
    // 토너먼트 승자
    let win = null;
    if (f.ko) { win = ga > gb ? f.a : gb > ga ? f.b : (C.koWinner(sa, sb, ga, gb) === 0 ? f.a : f.b); if (ga === gb) pw = win; }
    if (f.leg2 && U_ && U_.qf) {
      const q = U_.qf[f.qf], l1 = AM.fx.find(x => x.qf === f.qf && !x.leg2);
      const aggA = ga + (l1 && l1.r ? l1.r[1] : 0), aggB = gb + (l1 && l1.r ? l1.r[0] : 0);
      win = aggA > aggB ? f.a : aggB > aggA ? f.b : (C.koWinner(sa, sb, 0, 0) === 0 ? f.a : f.b);
      if (aggA === aggB) pw = win;
      q.win = win; q.agg = [aggA, aggB];
    }
    if (urec && (f.ko || f.leg2)) { urec.koWin = win === me; if (pw) urec.pens = win === me ? 'W' : 'L'; }
    const r = C.MD.play(dictOf(w), C.MD.natSide(w, f.a, pools, w.year), C.MD.natSide(w, f.b, pools, w.year), ga, gb, u);
    h.rows.push([f.stage, f.a, f.b, ga, gb, r.ev, r.ln, pw || null, d]);
    addAgg(h.agg, f.a, r.P[0]); addAgg(h.agg, f.b, r.P[1]);
    f.r = [ga, gb];
    if (f.c === 'UNL' && U_) {
      if (f.g != null && U_.g[f.g]) { const g = U_.g[f.g]; addRes(g.tb, f.a, f.b, ga, gb); g.m.push([f.a, f.b, ga, gb]); }
      if (f.sf != null && U_.sf) U_.sf[f.sf].win = win;
      if (f.fin && U_.f) { U_.f.win = win; U_.w = win; U_.ru = win === f.a ? f.b : f.a; U_.fs = [ga, gb, pw]; (w.hist.nt.UNL = w.hist.nt.UNL || []).push({ y: U_.label, c: win }); }
      if (f.th && U_.third) U_.third.win = win;
    }
    if (C.wn) C.wn.match(S, { k: 'A', comp: f.c, name: C.TDEF[f.c].name, stage: f.stage, a: f.a, b: f.b, ga, gb, pw, P: r.P, d, nat: 1, sa: AM.str[f.a], sb: AM.str[f.b], ref: { mk: 'A', sk: f.c, ri: h.rows.length - 1, d, a: f.a, b: f.b, wy: AM.wy }, fin: f.fin });
  }
  unlAdvance(S, d);
  w.cal.dirty = 1;
}
// 세계 연도가 끝날 때: 경기 기록 보관, 선수 국가대표 기록
function amFinalize(S) {
  const w = S.w, AM = w.cal.am; if (!AM) return;
  const store = curStore(w);
  for (const c of ['AM', 'UNL']) {
    const k = 'A:' + c + ':' + AM.wy, h = w.cal.h[k]; if (!h) continue;
    store.INTL[c] = (store.INTL[c] || []).concat(h.rows || []);
    writeC(w, 'nt:' + c, h.agg || {});
    delete w.cal.h[k];
  }
  const U_ = w.cal.unl;
  if (U_ && U_.y0 === AM.wy) {
    (w.unlHist = w.unlHist || []).push({ y: U_.label, w: U_.w, ru: U_.ru, fs: U_.fs || null, sf: (U_.sf || []).map(q => q.t), g: U_.g.filter(g => g.lv === 'A').map(g => ({ n: g.n, t: C.sortTable(g.tb).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) })) });
    w.cal.unl = null;
  }
  for (const f of AM.fx) if (!f.done) { const a = w.cal.ix[f.d]; if (a) { const i = a.indexOf('A:' + AM.wy); if (i >= 0) a.splice(i, 1); } }
  w.cal.am = null; w.cal.dirty = 1;
}
C.amSetup = amSetup;
// ================= 이적시장 (날짜별 반영) =================
function findE(w, pid) {
  const f = locMap(w).get(pid);
  if (f && f[1].sq.includes(f[0])) return f;
  if (f) { LOC = null; const g = locMap(w).get(pid); return g || null; }
  return null;
}
// 거래는 이적시장이 열릴 때 모두 정하고, 날짜가 오기 전까지는 선수를 원래 자리에 둔다
function applyWindow(S, kind, d0, d1, opt) {
  const w = S.w;
  // opt.late: 게임 시작 때 이미 열려 있는 여름 이적시장 (나이·은퇴 처리 없이 남은 기간 거래만)
  const rows = C.marketWindow(w, opt && opt.late ? 'winter' : kind, d0, d1, kind === 'summer' && !(opt && opt.late) ? w.cal.resAdj : null);
  if (kind === 'summer') w.cal.resAdj = {};
  const lbl = opt && opt.lbl ? opt.lbl : kind === 'summer' ? C.wLabel(w.year + 1) : C.wLabel(w.year) + 'w';
  if (C.wn) C.wn.windowOpen(S, rows);
  w.txPending = w.txPending || {}; w.txPending[lbl] = rows; w.txKeys = (w.txKeys || []).filter(x => x !== lbl).concat(lbl);
  while (w.txKeys.length > 40) (w.txDrop = w.txDrop || []).push(w.txKeys.shift());
  // 선수 위치 지도 (거래 후)
  sidesReset();
  const where = locMap(w);
  const byP = {}; for (const r of rows) { if (!['buy', 'free', 'loan', 'new'].includes(r[3])) continue; (byP[r[0]] = byP[r[0]] || []).push(r); }
  const today = w.cal.d;
  for (const pid in byP) {
    const list = byP[pid], fut = list.filter(r => r[10] > today); if (!fut.length) continue;
    const loc = where.get(pid); if (!loc) continue;
    const [e, fin] = loc;
    // 지금 있어야 할 곳: 처리된 마지막 거래의 도착지, 없으면 첫 대기 거래의 출발지
    const past = list.filter(r => r[10] <= today);
    const holder = past.length ? past[past.length - 1][2] : fut[0][1];
    fin.sq.splice(fin.sq.indexOf(e), 1);
    const hc = holder && w.clubs[holder] && w.clubs[holder].sq ? w.clubs[holder] : null;
    if (hc && fut[0][3] !== 'free' && fut[0][3] !== 'new') hc.sq.push(e); else (w.cal.limbo = w.cal.limbo || {})[pid] = e;
    for (const r of fut) w.cal.tq.push([r[10], pid, r[1], r[2], r[3]]);
  }
  w.cal.tq.sort((a, b) => a[0] - b[0]);
  w.cal.win = { kind, d0, d1, lbl };
  sidesReset();
  for (const id in w.clubs) { const c = w.clubs[id]; if (c.sq) c.str = C.xiStrength(c.sq); }
}
function runQueue(S, d) {
  const w = S.w, q = w.cal.tq; let moved = false;
  let n = 0; while (n < q.length && q[n][0] <= d) n++;
  if (!n) return;
  const todo = q.splice(0, n), touched = new Set();
  for (const [, pid, from, to, kind] of todo) {
    touched.add(from); touched.add(to);
    let e = w.cal.limbo && w.cal.limbo[pid];
    if (e) delete w.cal.limbo[pid];
    else { const fc = w.clubs[from]; if (fc && fc.sq) { const i = fc.sq.findIndex(x => String(x[0]) === pid); if (i >= 0) e = fc.sq.splice(i, 1)[0]; } if (!e) { const f = findE(w, pid); if (f) { e = f[0]; f[1].sq.splice(f[1].sq.indexOf(e), 1); touched.add(f[1].id); } } }
    if (!e) continue;
    const tc = w.clubs[to];
    if (tc && tc.sq) tc.sq.push(e); else (w.cal.limbo = w.cal.limbo || {})[pid] = e;
    moved = true;
    if (S.mode !== 'world' && S.ss && S.ss.club && (to === S.ss.club || from === S.ss.club) && e[2] >= 74 && C.news) C.news(S, `${C.pName(w, e)} ${to === S.ss.club ? '영입' : '이적'} (${(w.clubs[from] || {}).name || '자유계약'} → ${(tc || {}).name || '-'})`, 'transfer', false);
  }
  if (moved) { const ids = [...touched].filter(id => id && w.clubs[id]); sidesReset(ids); for (const id of ids) { const c = w.clubs[id]; if (c.sq) c.str = C.xiStrength(c.sq); } }
}

// ================= 연간 일정 =================
// 8월 1일: 지난 1년 마감(발롱도르·요약·보관 정리) → 새 연도, 유럽식 대륙 대회 참가팀 확정
// 6월 15일: 여름 이적시장 (나이 듦·은퇴·계약 만료·이적), 1월 1일: 겨울 이적시장·그해 국제 대회·남미/북중미 대륙 대회
function noLeagueClubs(S) {
  const w = S.w, MD = C.MD, st = curStore(w), y = w.year;
  for (const id in w.clubs) {
    const c = w.clubs[id]; if (c.lg || !c.sq || !c.sq.length) continue;
    const me = MD.clubSide(w, id, y), agg = {}, out = [];
    const opps = Array.from({ length: 15 }, (_, k) => { const str = c.str - 3 + (k - 7) * .6; const o = { id: 'OPP_' + id + '_' + k, nat: c.nat, str, lite: true }; return { str, side: { key: o.id, sq: C.squadOf(w, o, y).map(x => ({ id: '~' + o.id + '~' + x.n, n: x.n, pos: x.pos, ovr: x.ovr })) } }; });
    for (let k = 0; k < 30; k++) {
      const o = opps[k % 15], home = k < 15;
      const [ga, gb] = C.quickMatch(home ? c.str : o.str, home ? o.str : c.str, 1);
      const res = MD.play(dictOf(w), home ? me : o.side, home ? o.side : me, ga, gb, null);
      addAgg(agg, cx(w, id), res.P[home ? 0 : 1]);
      out.push([home ? cx(w, id) : o.side.key, home ? o.side.key : cx(w, id), ga, gb, res.ev, res.ln]);
    }
    st.L['_' + id] = MD.packL(out, 1, true);
    const yOff = y - 2000; w.ps = w.ps || {};
    for (const e of c.sq) {
      const pid = String(e[0]), x = agg[pid]; if (e[2] < 50 && !w.ps[pid] && !x) continue;
      const apps = x ? x[1] : 0; e[11] = apps; e[12] = apps ? Math.round(x[8] / apps * 10) : 0;
      C.psDirty = true;
      const Pp = w.ps[pid] = w.ps[pid] || { n: C.pName(w, e), nat: e[5], pos: e[1], h: '' };
      if (Array.isArray(Pp.h)) Pp.h = Pp.h.map(z => z.join(',')).join(';') + (Pp.h.length ? ';' : '');
      Pp.pos = e[1];
      Pp.h += [yOff, cx(w, id), apps, x ? x[4] : 0, x ? x[5] : 0, apps ? Math.round(x[8] / apps * 10) : 0, e[2], e[3], e[7] ? 1 : 0, x ? x[3] : 0, x ? x[9] : 0].join(',') + ';';
    }
  }
}
function rollover(S) {
  const w = S.w, lb = C.wLabel(w.year);
  noLeagueClubs(S);
  // 발롱도르 (지난 1년: 리그·컵·대륙 대회·여름 국제 대회)
  let bd = null; try { bd = C.ballonDor(S); } catch (e) { console.error('ballon', e); }
  w.bdLast = bd ? { y: w.year + 1, top: bd.top.map(x => [x.n, x.cid, x.pid || '', x.me ? 1 : 0, x.ovr, x.pos || '']), rank: bd.rank, youngRank: bd.youngRank, gsRank: bd.gsRank } : null;
  if (S.ss && S.ss.on && bd) S.ss.ballon = bd;
  if (C.wn) try { C.wn.yearEnd(S, bd); } catch (e) { console.error(e); }
  // 관전 모드 시즌 요약
  const A = w.arch && w.arch[lb];
  if (A) {
    const tier1 = Object.values(w.lg).filter(l => l.tier === 1), champs = {}, boots = {};
    for (const l of tier1) { const L = A.lg[l.id]; if (!L) continue; champs[l.id] = L.t[0] && L.t[0][0]; if (L.sc && L.sc[0]) boots[l.id] = [L.sc[0][0], L.sc[0][1], L.sc[0][2], L.sc[0][5] || '']; }
    const cont = {}; for (const k in A.cont) cont[k] = A.cont[k].w || null;
    const txl = C.wLabel(w.year + 1);
    S.ws = (S.ws || []).concat({ y: w.year, label: lb, champs, cont, boots, bd: bd ? bd.top.slice(0, 10).map(x => [x.n, x.cid, x.pid || '', x.ovr, x.pos || '']) : [], gb: bd ? bd.gb.slice(0, 5).map(x => [x.n, x.cid, x.pid || '', x.ovr, x.pos || '', x.age, x.pot, x.apps, x.g, x.a, x.rt, x.me ? 1 : 0, x.napps || 0, x.ng || 0, x.na || 0]) : [], gs: bd ? bd.gs.slice(0, 5) : [], intl: Object.values(w.intl || {}).flat().filter(t => t.mxl === lb).map(t => [t.k, t.n, t.w, t.ru, t.y]), tx: w.lastTx || 0, txs: w.txStat || null, big: (w.bigTx || []).slice().sort((x, z) => z[5] - x[5]).slice(0, 20), txl });
  }
  // 오래된 보관 기록 줄이기
  const labels = Object.keys(w.arch || {}).sort();
  labels.slice(0, -3).forEach(l => {
    const a = w.arch[l]; if (a.slim) return;
    for (const id in a.lg) {
      const lg = w.lg[id], L = a.lg[id];
      const avg = lg ? lg.clubs.reduce((x, c) => x + (w.clubs[c] ? w.clubs[c].str : 60), 0) / Math.max(1, lg.clubs.length) : 0;
      const major = lg && lg.tier === 1 && (avg >= 66 || (S.p && lg.nation === S.p.nat));
      delete L.best;
      if (major) { L.sc = (L.sc || []).slice(0, 10); L.as = (L.as || []).slice(0, 10); }
      else a.lg[id] = { n: L.n, sl: L.sl, t: L.t.slice(0, lg && lg.tier === 1 ? 4 : 1), sc: (L.sc || []).slice(0, lg && lg.tier === 1 ? 3 : 1), as: (L.as || []).slice(0, lg && lg.tier === 1 ? 3 : 0), slim: 1 };
    }
    for (const k in a.cont) a.cont[k].ph = null;
    for (const grp of [a.cup, a.lcup]) for (const n in grp) grp[n].r = grp[n].r.slice(-3);
    a.slim = 1;
  });
  // 경기 상세 기록은 진행 중인 해 + 지난 3년
  const st = w.mxPending && w.mxPending[lb]; if (st) st._dirty = 1;
  amFinalize(S);
  w.year++; sidesReset();
  curStore(w); curArch(w);
  while ((w.mxKeys || []).length > 4) { const old = w.mxKeys.shift(); if (w.mxPending && w.mxPending[old]) delete w.mxPending[old]; (w.mxDrop = w.mxDrop || []).push(old); }
  // 유럽식 대륙 대회
  const parts = C.contParticipants(w);
  for (const k of Object.keys(C.COMPS)) if (!CONT_CY.has(k)) contCreate(w, k, w.year, parts);
  if (S.mode !== 'world' && S.p && S.ageY !== w.year) { /* 내 선수 나이는 시즌 종료 처리에서 */ }
}
function newYear(S, y) {
  const w = S.w;
  // 그해 국제 대회
  for (const k of C.tournamentsOf(y)) intlCreate(S, k, y);
  // 한 해 단위 대륙 대회 (남미·북중미)
  const parts = C.contParticipants(w);
  for (const k of CONT_CY) contCreate(w, k, y, parts);
}
function dayEvents(S, d) {
  const w = S.w, [y, m, dd] = ymd(d);
  if (m === 8 && dd === 1 && w.cal.started && w.year < y) rollover(S);
  if (w.cal.started && (!w.cal.am || w.cal.am.wy !== w.year)) amSetup(S);
  if (m === 1 && dd === 1) { newYear(S, y); applyWindow(S, 'winter', d, day(y, 1, 31)); }
  if (m === 6 && dd === 15) applyWindow(S, 'summer', d, day(y, 9, 1));
  if (w.cal.win && d > w.cal.win.d1) w.cal.win = null;
  runQueue(S, d);
  if (C.wn && w.cal.started) C.wn.day(S, d);
}

// ================= 하루 진행 =================
async function playDay(S, d, hooks) {
  const w = S.w;
  w.cal.d = d;
  // 내 선수 부상 회복 (하루씩)
  if (S.mode !== 'world' && S.ss && S.ss.on) { const ss = S.ss; if (ss.lastDay == null) ss.lastDay = d; if (ss.inj > 0) ss.inj = Math.max(0, ss.inj - (d - ss.lastDay)); ss.lastDay = d; }
  dayEvents(S, d);
  const keys = (w.cal.ix[d] || []).slice();
  for (const k of keys) {
    const t = k[0];
    if (t === 'L') { const LS = w.cal.lg[k.slice(2)]; if (!LS || LS.done || LS.k !== k) continue; while (!LS.done && LS.ri < LS.dates.length && LS.dates[LS.ri] <= d) await lgRound(S, LS, d, hooks); }
    else if (t === 'C') { const st = w.cal.cup[k]; if (st) await cupDay(S, st, d, hooks); }
    else if (t === 'E') { const cs = w.cal.cont[k]; if (cs) await contDay(S, cs, d, hooks); }
    else if (t === 'I') { const T = w.cal.intl[k]; if (T) await intlDay(S, T, d, hooks); }
    else if (t === 'A') { if (w.cal.am && k === 'A:' + w.cal.am.wy) await amDay(S, d, hooks); }
  }
  delete w.cal.ix[d];
  // 내 선수 일정 (국가대표 A매치·유스)
  if (S.mode !== 'world' && S.ss && S.ss.on && S.ss.ufx) {
    const ss = S.ss;
    while (ss.ui < ss.ufx.length && ss.ufx[ss.ui].d <= d) {
      const fx = ss.ufx[ss.ui++];
      if (fx.k === 'N') { if (!(ss.nt && ss.nt.lvl === 'A' && w.cal.am)) await C.doNational(S, fx, hooks); } else if (fx.k === 'Y') await C.doYouth(S, fx, hooks);
    }
  }
}
// 지정한 날(포함)까지 진행. onDay(d)로 진행 상황을 알린다. stop()이 참이면 멈춘다
C.calRun = async function (S, toDay, hooks, onDay, stop) {
  const w = S.w; if (!w.cal) C.calInit(S);
  while (w.cal.d < toDay) {
    if (stop && stop()) break;
    await playDay(S, w.cal.d + 1, hooks);
    if (onDay) await onDay(w.cal.d);
  }
};
C.calToday = w => w.cal ? w.cal.d : day(w.year, 8, 1);

// ================= 시작 =================
// 새 월드: 오늘 = 2026년 7월 31일. 유럽식 리그는 다가올 시즌, 캘린더 리그는 진행 중인 올해 시즌(지난 경기는 바로 치른다)
C.calInit = function (S, opt) {
  const w = S.w;
  const y = w.year, d0 = day(y, 7, 31);
  w.cal = { d: d0, lg: {}, cup: {}, cont: {}, intl: {}, ix: {}, tq: [], limbo: {}, resAdj: {}, h: {}, started: 0, win: null };
  dictOf(w);
  const nats = [...new Set(Object.values(w.lg).map(l => l.nation))];
  const pre = [];
  for (const nat of nats) {
    const cy = calOf(nat)[0] === 'cy', sy = cy ? y : y;
    for (const l of Object.values(w.lg).filter(l => l.nation === nat)) { const LS = lgCreate(w, l, sy); if (cy) pre.push(LS); }
    const c1 = cupCreate(w, nat, 'cup', sy), c2 = cupCreate(w, nat, 'lcup', sy);
    if (cy) { if (c1) pre.push(c1); if (c2) pre.push(c2); }
  }
  // 이미 지난 캘린더 리그 경기(올해 3~7월)와 컵 라운드는 바로 치른다
  const S0 = { w, mode: 'world', p: S.p, ss: null };
  w.cal.d = d0;
  const keys = Object.keys(w.cal.ix).map(Number).filter(d => d <= d0).sort((a, b) => a - b);
  for (const d of keys) {
    for (const k of w.cal.ix[d]) {
      // 사용자 경기가 없으면 아래 함수들은 await 없이 끝까지 실행된다 (동기 실행)
      if (k[0] === 'L') { const LS = w.cal.lg[k.slice(2)]; if (LS && !LS.done && LS.k === k) { let g = 0; while (!LS.done && LS.dates[LS.ri] <= d && g++ < 5) lgRound(S0, LS, d, null).catch(e => console.error(e)); } }
      else if (k[0] === 'C') { const st = w.cal.cup[k]; if (st) cupDay(S0, st, d, null).catch(e => console.error(e)); }
    }
    delete w.cal.ix[d];
  }
  // 유럽식 대륙 대회 (2026/27). 남미·북중미 대회와 올해 국제 대회는 다음 1월 1일에 만든다
  const parts = C.contParticipants(w);
  for (const k of Object.keys(C.COMPS)) if (!CONT_CY.has(k)) contCreate(w, k, y, parts);
  curStore(w); curArch(w);
  w.cal.started = 1;
  try { amSetup(S); } catch (e) { console.error('am', e); }
  // 이미 열려 있는 여름 이적시장: 8월 1일 ~ 9월 1일 남은 기간의 거래
  if (!(opt && opt.noLate)) { try { applyWindow(S, 'summer', d0 + 1, day(y, 9, 1), { late: 1, lbl: C.wLabel(y) }); } catch (e) { console.error('late window', e); } }
  return w.cal;
};

// ================= 진행 중 기록 (화면용) =================
// 진행 중인 리그 시즌을 보관 기록과 같은 모양으로
C.liveLeague = function (S, lgId) {
  const w = S.w, LS = w.cal && w.cal.lg[lgId]; if (!LS || LS.done) return null;
  const h = w.cal.h[LS.k] || {}, rows = C.sortTable(LS.tb);
  return Object.assign({ t: rows.map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]), n: w.lg[lgId].name, sl: LS.label, md: 1, live: 1, ri: LS.ri, nr: LS.dates.length, d0: LS.start, d1: LS.end }, lgLeaders(S, LS, h.agg || {}));
};
// 진행 중 리그 경기 묶음 (치른 경기 + 남은 일정)
C.liveLeagueRows = function (S, lgId) {
  const w = S.w, LS = w.cal && w.cal.lg[lgId]; if (!LS) return null;
  const h = w.cal.h[LS.k] || { s: [], e: [], l: [], d: [], r: [] };
  const per = Math.max(1, Math.floor((w.lg[lgId] || { clubs: [] }).clubs.length / 2));
  return { L: { p: per, s: (h.s || []).join(';'), e: h.e || [], l: h.l || [], d: h.d || [], r: h.r || [] }, LS, up: LS.R.slice(LS.ri).map((ms, i) => ({ r: LS.ri + i, d: LS.dates[LS.ri + i], m: ms.map(([a, b]) => [cid(w, a), cid(w, b)]) })) };
};
C.liveStore = function (S) {
  const w = S.w; if (!w.cal) return null;
  const st = { live: 1, label: 'live', L: {}, CUP: {}, CONT: {}, INTL: {} };
  Object.defineProperty(st, 'P', { value: dictOf(w).P, enumerable: false });
  for (const id in w.cal.lg) { const x = C.liveLeagueRows(S, id); if (x) st.L[id] = x.L; }
  for (const k in w.cal.cup) { const c = w.cal.cup[k], h = w.cal.h[k]; if (h && h.rows) st.CUP[c.nat + ':' + c.kind] = h.rows; }
  for (const k in w.cal.cont) { const c = w.cal.cont[k], h = w.cal.h[k]; if (h && h.rows) st.CONT[c.k] = h.rows; }
  for (const k in w.cal.intl) { const T = w.cal.intl[k], h = w.cal.h[k]; if (h && h.rows) st.INTL[T.k] = h.rows; }
  if (w.cal.am) for (const c of ['UNL', 'AM']) { const h = w.cal.h['A:' + c + ':' + w.cal.am.wy]; if (h && h.rows) st.INTL[c] = h.rows; }
  return st;
};
// 진행 중 선수 기록: 리그·컵·대륙·국제 대회별 집계 { key: [구단, 경기, 선발, 분, 골, 도움, 경고, 퇴장, 평점합×10, 클린시트] }
C.livePlayer = function (S, pid) {
  const w = S.w; if (!w.cal) return [];
  const out = [];
  for (const id in w.cal.lg) { const LS = w.cal.lg[id], h = w.cal.h[LS.k]; if (!LS.done && h && h.agg && h.agg[pid]) out.push({ key: 'league', lg: id, label: LS.label, a: h.agg[pid] }); }
  for (const k in w.cal.cup) { const c = w.cal.cup[k], h = w.cal.h[k]; if (h && h.agg && h.agg[pid]) out.push({ key: c.kind + ':' + c.nat, label: c.label, a: h.agg[pid] }); }
  for (const k in w.cal.cont) { const c = w.cal.cont[k], h = w.cal.h[k]; if (h && h.agg && h.agg[pid]) out.push({ key: 'cont:' + c.k, label: c.label, a: h.agg[pid] }); }
  for (const k in w.cal.intl) { const T = w.cal.intl[k], h = w.cal.h[k]; if (h && h.agg && h.agg[pid]) out.push({ key: 'nt:' + T.k, label: String(T.y), a: h.agg[pid] }); }
  if (w.cal.am) for (const c of ['UNL', 'AM']) { const h = w.cal.h['A:' + c + ':' + w.cal.am.wy]; if (h && h.agg && h.agg[pid]) out.push({ key: 'nt:' + c, label: C.wLabel(w.cal.am.wy), a: h.agg[pid] }); }
  return out;
};
// 다가오는 큰 일정 (화면용)
C.calUpcoming = function (S, from, days) {
  const w = S.w, out = [], to = from + days;
  // 이미 시작했지만 끝나지 않은 기간(A매치·이적시장·국제 대회)도 포함
  const [y0] = ymd(from);
  for (let y = y0; y <= y0 + 1; y++) {
    for (const iw of IW) { const a = day(y, iw[0], iw[1]), b = day(y, iw[2], iw[3]); if (b >= from && a <= to) out.push({ d: a, d2: b, t: iw[4], k: 'iw' }); }
    const s1 = day(y, 6, 15), s2 = day(y, 9, 1), w1 = day(y, 1, 1), w2 = day(y, 1, 31);
    if (s2 >= from && s1 <= to) out.push({ d: s1, d2: s2, t: '여름 이적시장', k: 'tw' });
    if (w2 >= from && w1 <= to) out.push({ d: w1, d2: w2, t: '겨울 이적시장', k: 'tw' });
    for (const k of C.tournamentsOf(y)) { const td = TDATES[k]; if (!td) continue; const a = day(y, td[0], td[1]); const b = a + (k === 'WC' ? 38 : 30); if (b >= from && a <= to) out.push({ d: a, d2: b, t: `${C.TDEF[k].name} ${y}`, k: 'it' }); }
  }
  for (const id in w.cal.lg) { const LS = w.cal.lg[id], lg = w.lg[id]; if (!lg || lg.tier !== 1) continue; if (LS.start >= from && LS.start <= to) out.push({ d: LS.dates[0], t: `${lg.name} 개막`, k: 'lg', nat: lg.nation }); if (!LS.done && LS.dates[LS.dates.length - 1] >= from && LS.dates[LS.dates.length - 1] <= to) out.push({ d: LS.dates[LS.dates.length - 1], t: `${lg.name} 최종 라운드`, k: 'lg', nat: lg.nation }); }
  for (const k in w.cal.cont) { const cs = w.cal.cont[k], f = cs.rounds[cs.rounds.length - 1]; if (f && f[0] >= from && f[0] <= to) out.push({ d: f[0], t: `${cs.name} 결승`, k: 'ct' }); }
  return out.sort((a, b) => a.d - b.d);
};
// 하루 경기 목록 (화면용): 그날 치른 리그·컵·대륙·국제 경기
C.calDayMatches = function (S, d) {
  const w = S.w, out = []; if (!w.cal) return out;
  for (const id in w.cal.lg) { const LS = w.cal.lg[id], h = w.cal.h[LS.k]; if (!h || !h.d) continue; for (let i = h.d.length - 1; i >= 0 && h.d[i] >= d; i--) if (h.d[i] === d) { const [a, b, ga, gb] = h.s[i].split('.'); out.push({ k: 'L', comp: id, a: C.cidOf(w, C.MD.u62(a)), b: C.cidOf(w, C.MD.u62(b)), ga: +ga, gb: +gb, ref: { mk: 'L', lg: id, sl: LS.label, i }, stage: `${(h.r[i] || 0) + 1}라운드` }); } }
  const rowsOf = (mk, sk, h, base) => { if (h && h.rows) h.rows.forEach((r, ri) => { if (r[8] === d) out.push(Object.assign({ stage: r[0], a: base.nat ? r[1] : C.cidOf(w, r[1]), b: base.nat ? r[2] : C.cidOf(w, r[2]), ga: r[3], gb: r[4], pw: r[7] != null ? (base.nat ? r[7] : C.cidOf(w, r[7])) : null, ref: { mk, sk, ri, d, a: r[1], b: r[2] } }, base)); }); };
  for (const k in w.cal.cup) { const c = w.cal.cup[k]; rowsOf('C', c.nat + ':' + c.kind, w.cal.h[k], { k: 'C', comp: c.nat + ':' + c.kind, name: c.n }); }
  for (const k in w.cal.cont) { const c = w.cal.cont[k]; rowsOf('E', c.k, w.cal.h[k], { k: 'E', comp: c.k, name: c.name }); }
  for (const k in w.cal.intl) { const T = w.cal.intl[k]; rowsOf('I', T.k, w.cal.h[k], { k: 'I', comp: T.k, name: T.n, nat: 1 }); }
  if (w.cal.am) for (const c of ['UNL', 'AM']) rowsOf('A', c, w.cal.h['A:' + c + ':' + w.cal.am.wy], { k: 'A', comp: c, name: C.TDEF[c].name, nat: 1, wy: w.cal.am.wy });
  return out;
};
// 앞으로 치를 경기 (그날 대진이 정해진 것만): 리그 라운드, 대륙 대회 리그 페이즈·2차전, 국제 대회 조별리그, A매치
C.calDayFixtures = function (S, d) {
  const w = S.w, out = []; if (!w.cal) return out;
  for (const id in w.cal.lg) { const LS = w.cal.lg[id]; if (LS.done) continue; for (let i = LS.ri; i < LS.dates.length; i++) { if (LS.dates[i] > d) break; if (LS.dates[i] !== d) continue; for (const [a, b] of LS.R[i] || []) out.push({ k: 'L', comp: id, a: C.cidOf(w, a), b: C.cidOf(w, b), pend: 1, stage: `${i + 1}라운드` }); } }
  for (const k in w.cal.cont) { const cs = w.cal.cont[k]; for (let i = cs.di; i < cs.dates.length; i++) { if (cs.dates[i] !== d) continue;
    if (i < cs.phaseN) { for (const [a, b] of cs.md[i] || []) out.push({ k: 'E', comp: cs.k, name: cs.name, stage: `리그 페이즈 ${i + 1}차전`, a, b, pend: 1 }); }
    else { const [ri, leg] = cs.kmap[i - cs.phaseN], rd = cs.rounds[ri]; const ties = cs.ties && cs.ties[ri];
      if (ties && ties.length) for (const t of ties) { if (t.win) continue; out.push({ k: 'E', comp: cs.k, name: cs.name, stage: rd[2] + (rd[1] ? (leg ? ' 2차전' : ' 1차전') : ''), a: leg ? t[1] : t[0], b: leg ? t[0] : t[1], pend: 1 }); }
      else out.push({ k: 'E', comp: cs.k, name: cs.name, stage: rd[2] + (rd[1] ? (leg ? ' 2차전' : ' 1차전') : ''), tbd: 1, pend: 1 }); } } }
  for (const k in w.cal.cup) { const st = w.cal.cup[k]; for (let i = st.ri; i < st.dates.length; i++) if (st.dates[i] === d) out.push({ k: 'C', comp: st.nat + ':' + st.kind, name: st.n, stage: st.rounds[i].n, tbd: 1, pend: 1 }); }
  for (const k in w.cal.intl) { const T = w.cal.intl[k]; let any = false; for (const f of T.fx) if (!f.done && f.d === d) { any = true; out.push({ k: 'I', comp: T.k, name: T.n, stage: `조별리그 ${T.g[f.g].n}조`, a: f.a, b: f.b, nat: 1, pend: 1 }); } if (!any && T.kdays.includes(d)) out.push({ k: 'I', comp: T.k, name: T.n, stage: '토너먼트', tbd: 1, pend: 1, nat: 1 }); }
  if (w.cal.am) for (const f of w.cal.am.fx) if (!f.done && f.d === d) out.push({ k: 'A', comp: f.c, name: C.TDEF[f.c].name, stage: f.stage, a: f.a, b: f.b, nat: 1, pend: 1 });
  return out;
};
// 이적시장 기간: 여름 6/15~9/1, 겨울 1/1~1/31. lbl은 이적 기록 이름
C.txWindowAt = function (d) {
  const [y] = ymd(d);
  const s1 = day(y, 6, 15), s2 = day(y, 9, 1), w1 = day(y, 1, 1), w2 = day(y, 1, 31);
  if (d >= s1 && d <= s2) return { kind: 'summer', d0: s1, d1: s2, lbl: C.wLabel(y) };
  if (d >= w1 && d <= w2) return { kind: 'winter', d0: w1, d1: w2, lbl: C.wLabel(y - 1) + 'w' };
  return null;
};
C.txNextWindow = function (d) {
  const [y] = ymd(d);
  const c = [[day(y, 1, 1), 'winter'], [day(y, 6, 15), 'summer'], [day(y + 1, 1, 1), 'winter']].find(x => x[0] > d);
  return c ? C.txWindowAt(c[0]) : null;
};
// 다음 시즌 리그 일정 예상 (아직 만들지 않은 시즌: 같은 규칙으로 날짜만 계산)
const PRED = new Map();
function predDates(w, lg, sy, n) {
  const k = lg.id + ':' + sy; if (PRED.has(k)) return PRED.get(k);
  const rg = seasonRange(lg.nation, sy);
  const v = leagueDates(lg.nation, rg.start, rg.end, n); PRED.set(k, v); return v;
}
// 달력 한 달치 표시 정보. majorNat(nat): 리그를 표시할 나라인지
C.calMonth = function (S, y, m, majorNat) {
  const w = S.w, d0 = day(y, m, 1), d1 = day(y, m + 1, 1) - 1, out = [];
  for (let d = d0; d <= d1; d++) out.push({ d, L: [], E: [], C: [], I: [], iw: null, tw: null, dl: 0, it: null });
  const at = d => d >= d0 && d <= d1 ? out[d - d0] : null;
  const isMaj = majorNat || (() => true);
  for (const id in w.cal.lg) { const LS = w.cal.lg[id], lg = w.lg[id]; if (!lg || lg.tier !== 1 || !isMaj(lg.nation)) continue;
    LS.dates.forEach((d, i) => { const o = at(d); if (o) o.L.push([id, i + 1, LS.dates.length]); });
    if (d1 > LS.dates[LS.dates.length - 1]) predDates(w, lg, LS.sy + 1, LS.dates.length).forEach((d, i, a) => { const o = at(d); if (o && !o.L.some(x => x[0] === id)) o.L.push([id, i + 1, a.length, 1]); }); }
  for (const k in w.cal.cup) { const st = w.cal.cup[k]; if (!isMaj(st.nat)) continue; st.dates.forEach((d, i) => { const o = at(d); if (o) o.C.push(`${st.n} ${st.rounds[i] ? st.rounds[i].n : ''}`); }); }
  for (const k in w.cal.cont) { const cs = w.cal.cont[k];
    cs.dates.forEach((d, i) => { const o = at(d); if (!o) return; let stg; if (i < cs.phaseN) stg = `리그 페이즈 ${i + 1}차전`; else { const [ri, leg] = cs.kmap[i - cs.phaseN]; const r = cs.rounds[ri]; stg = r[2] + (r[1] ? (leg ? ' 2차전' : ' 1차전') : ''); } o.E.push([cs.k, cs.name, stg]); }); }
  const made = new Set();
  for (const k in w.cal.intl) { const T = w.cal.intl[k]; made.add(T.k + T.y); for (const d of T.dates) { const o = at(d); if (o) o.I.push([T.k, T.n]); } const a = T.dates[0], b = T.dates[T.dates.length - 1]; for (let d = a; d <= b; d++) { const o = at(d); if (o) o.it = `${T.n} ${T.y}`; } }
  for (let yy = y - 1; yy <= y; yy++) for (const k of C.tournamentsOf(yy)) { if (made.has(k + yy) || !TDATES[k]) continue; const a = day(yy, TDATES[k][0], TDATES[k][1]), b = a + (k === 'WC' ? 38 : 28); for (let d = a; d <= b; d++) { const o = at(d); if (o) o.it = `${C.TDEF[k].name} ${yy}`; } }
  if (w.cal.am) for (const f of w.cal.am.fx) { const o = at(f.d); if (o) { o.A = (o.A || 0) + 1; if (f.c === 'UNL') o.UNL = 1; } }
  for (const o of out) { const [, mm, dd] = ymd(o.d), a = md(mm, dd); const iw = IW.find(x => a >= md(x[0], x[1]) && a <= md(x[2], x[3])); if (iw) o.iw = iw[4];
    const tw = C.txWindowAt(o.d); if (tw) { o.tw = tw.kind; o.twl = tw.lbl; if (o.d === tw.d1) o.dl = 1; if (o.d === tw.d0) o.tw0 = 1; } }
  return out;
};
Object.assign(C, { lgCreate, cupCreate, contCreate, intlCreate, applyWindow, seasonRange, leagueDates });
})(typeof window !== 'undefined' ? window : globalThis);
