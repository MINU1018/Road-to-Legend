// 터치라인 커리어 — 세계 기록: 모든 리그 순위·득점/도움 순위, 각국 컵, 대륙 대회, 국제 대회(월드컵 등) 시뮬과 보관
(function (G) {
'use strict';
const C = G.TC;
const { R, N, rint, clamp, pick, wpick, shuffle } = C;
const WD = G.FMWORLD;

// ---------- 이름 (명단이 없는 구단용, 시드 고정) ----------
function liteName(c, i, y) {
  const r = C.seeded(c.id + '|nm|' + i + '|' + Math.floor((y + i) / 4));
  const nat = r() < .82 ? c.nat : pick(['BRA', 'ARG', 'FRA', 'ESP', 'NGA', 'SEN', 'COL', 'POR', 'SRB', 'JPN']);
  const lang = (C.NAT[nat] && WD.NAMES[C.NAT[nat][1]]) ? C.NAT[nat][1] : 'en';
  const [fs, ls] = WD.NAMES[lang];
  return fs[Math.floor(r() * fs.length)] + ' ' + ls[Math.floor(r() * ls.length)];
}
const LITEPOS = ['ST', 'ST', 'LW', 'RW', 'CAM', 'CM', 'CM', 'CDM', 'LB', 'RB', 'CB', 'CB', 'GK', 'ST', 'CM', 'RW'];
function squadOf(w, c, y) {
  if (!c.lite && c.sq && c.sq.length) return c.sq.map(e => ({ id: String(e[0]), n: C.pName(w, e), pos: e[1], ovr: e[2], age: e[3], nat: e[5] }));
  const used = new Set();
  return LITEPOS.map((pos, i) => {
    const r = C.seeded(c.id + '|o|' + i + '|' + y);
    let n = liteName(c, i, y), k = 0; while (used.has(n) && k < 6) n = liteName(c, i + 40 + k++ * 17, y); used.add(n);
    const age = 19 + Math.floor(C.seeded(c.id + '|a|' + i + '|' + Math.floor((y + i) / 4))() * 14) + ((y + i) % 4);
    return { n, pos, ovr: c.str + (i < 12 ? 2 : -5) + (r() - .5) * 8, age, nat: c.nat };
  });
}
C.squadOf = squadOf;
// 구단 번호 (선수 기록 용량 절약)
function cix(w, id) { w.cix = w.cix || []; if (!w._cm) { w._cm = {}; w.cix.forEach((x, i) => w._cm[x] = i); Object.defineProperty(w, '_cm', { enumerable: false, value: w._cm, writable: true }); } let i = w._cm[id]; if (i == null) { i = w.cix.length; w.cix.push(id); w._cm[id] = i; } return i; }
C.cix = cix;
C.cidOf = (w, v) => typeof v === 'number' ? (w.cix || [])[v] : v;
// 선수 시즌 기록 풀기: [시즌-2000, 구단, 경기, 골, 도움, 평점×100, OVR, 나이]
C.psHist = P => !P ? [] : Array.isArray(P.h) ? P.h : String(P.h || '').split(';').filter(Boolean).map(x => x.split(',').map((v, i) => i === 1 && isNaN(+v) ? v : +v));
const GW = { ST: 1, W: .5, AM: .42, CM: .17, DM: .07, FB: .06, CB: .09, GK: 0 };
const AW = { ST: .42, W: .7, AM: .8, CM: .45, DM: .2, FB: .34, CB: .07, GK: .01 };
function distribute(n, ws) {
  const out = ws.map(() => 0), tot = ws.reduce((a, x) => a + x, 0);
  if (!tot) return out;
  for (let k = 0; k < n; k++) { let r = R() * tot; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) { out[i]++; break; } } }
  return out;
}
// 리그 하나의 득점·도움 순위 생성
function leagueLeaders(S, lgId, rows, me) {
  const w = S.w, y = S.ss.year, sc = [], as = [], best = [];
  for (const r of rows) {
    const c = w.clubs[r.id]; if (!c) continue;
    const sq = squadOf(w, c, y).filter(x => x.pos !== 'GK').sort((a, b) => b.ovr - a.ovr).slice(0, 16);
    const top = sq.length ? sq[0].ovr : 70;
    let gf = r.gf, ga = Math.round(r.gf * .72);
    if (me && me.club === r.id) { gf = Math.max(0, gf - me.g); ga = Math.max(0, ga - me.a); }
    // 시즌 폼: 같은 OVR이라도 해마다 잘 풀리는 시즌·안 풀리는 시즌이 있다 (이적 시장 판단에 쓰임)
    const fm = {};
    if (!c.lite && c.sq) for (const e of c.sq) { const f = clamp(N(0, 1), -2.5, 2.5); e[9] = Math.round(f * 100) / 100; fm[String(e[0])] = f; }
    const play = sq.map((x, i) => Math.exp((x.ovr - top) * .1) * (i < 11 ? 1 : .45));
    const g = distribute(gf, sq.map((x, i) => (GW[C.ROLE[x.pos]] || .1) * play[i] * Math.exp((fm[x.id] || 0) * .28) * (1 + N(0, .25) ** 2)));
    const a = distribute(ga, sq.map((x, i) => (AW[C.ROLE[x.pos]] || .1) * play[i] * Math.exp((fm[x.id] || 0) * .22) * (1 + N(0, .25) ** 2)));
    sq.forEach((x, i) => { if (g[i]) sc.push([x.n, r.id, g[i], a[i], 0, x.id || '']); if (a[i]) as.push([x.n, r.id, a[i], g[i], 0, x.id || '']); });
    // 리그 평점 순위용: 주전급 선수 평점 추정 (사용자 평점 모델과 같은 기준)
    { const ppg0 = r.p ? r.pts / r.p : 1.4;
      sq.forEach((x, i) => { if (i >= 11) return; const apps = Math.round(r.p * C.rnd(.72, .97)); if (me && me.club === r.id && x.n === me.name) return;
        const rt = clamp(6.62 + (x.ovr - 72) * .035 + (ppg0 - 1.4) * .18 + ((g[i] * .6 + a[i] * .4) / Math.max(1, apps)) * .7 + (fm[x.id] || 0) * .1 + N(0, .12), 5.9, 8.4);
        best.push([x.n, r.id, +rt.toFixed(2), x.pos, x.id || '', x.age || 0, apps]); }); }
    // 선수 시즌 기록 보관: 한 번 기록되기 시작한 선수는 이후 매 시즌 계속 기록 (부진·벤치 시즌 포함)
    if (!c.lite && c.sq) {
      const ppg = r.p ? r.pts / r.p : 1.4;
      const ga = {}; sq.forEach((x, i) => { ga[x.id] = [g[i], a[i]]; });
      const ord = c.sq.slice().sort((p1, p2) => p2[2] - p1[2]);
      const rk = {}; const cnt = {};
      for (const e of ord) { const gk = e[1] === 'GK'; const k = gk ? 'g' : 'o'; cnt[k] = (cnt[k] || 0) + 1; rk[e[0]] = gk ? (cnt.g === 1 ? 0 : 20) : cnt.o - 1; }
      w.ps = w.ps || {};
      for (const e of c.sq) {
        const id = String(e[0]), o = e[2], age = e[3], tracked = !!w.ps[id];
        const [gg, aa] = ga[id] || [0, 0];
        const tierL = (w.lg[lgId] || {}).tier || 1;
        if (o < 50 && !tracked) continue; // 명단이 있는 구단의 선수는 모두 기록
        void tierL; // 기량이 크게 떨어진 선수는 더 기록하지 않음
        const nm = C.pName(w, e);
        if (me && me.club === r.id && nm === me.name) continue;
        const i = rk[e[0]];
        const share = i <= 10 ? C.rnd(.7, .97) : i <= 15 ? C.rnd(.25, .6) : i <= 19 ? C.rnd(.05, .3) : C.rnd(0, .12);
        const apps = Math.round(r.p * share);
        const rt = apps ? clamp(6.62 + (o - 72) * .035 + (ppg - 1.4) * .18 + (gg * .6 + aa * .4) / apps * .7 + (fm[id] || 0) * .1 + N(0, .12) - (i > 15 ? .15 : 0), 5.8, 8.4) : 0;
        C.psDirty = true;
        const Pp = w.ps[id] = w.ps[id] || { n: nm, nat: e[5], pos: e[1], h: '' };
        if (Array.isArray(Pp.h)) Pp.h = Pp.h.map(x => x.join(',')).join(';') + (Pp.h.length ? ';' : '');
        Pp.pos = e[1]; Pp.h += [y - 2000, cix(w, r.id), apps, apps ? gg : 0, apps ? aa : 0, Math.round(rt * 100), o, age].concat(e[7] ? [1] : []).join(',') + ';';
      }
    }
  }
  if (me && rows.some(r => r.id === me.club)) { sc.push([me.name, me.club, me.g, me.a, 1]); as.push([me.name, me.club, me.a, me.g, 1]); }
  const by = (x, z) => z[2] - x[2] || z[3] - x[3] || R() - .5;
  return { sc: sc.sort(by).slice(0, 15), as: as.sort(by).slice(0, 15), best: best.sort((x, z) => z[2] - x[2]).slice(0, 25) };
}

// 경기 단위 기록으로 리그 시즌 집계: 모든 숫자(골·도움·출전·평점·득점 순위)는 경기 기록의 합
function leagueFromMatches(S, lgId, rows, mlist) {
  const w = S.w, ss = S.ss, y = ss.year, st = ss.mx, MD = C.MD;
  const lg = w.lg[lgId], n = lg.clubs.length, per = Math.max(1, Math.floor(n / 2));
  const live = lg.clubs.some(id => w.clubs[id] && !w.clubs[id].lite && w.clubs[id].sq && w.clubs[id].sq.length) || lg.clubs.includes(ss.club);
  const sides = {}; const sideOf = id => sides[id] || (sides[id] = MD.clubSide(w, id, y));
  const agg = {}, out = [];
  mlist.forEach((m, i) => {
    const [a, b, ga, gb, ui] = m, r = Math.floor(i / per);
    void r;
    if (!live) { out.push([C.cix(w, a), C.cix(w, b), ga, gb]); return; }
    const rec = ui != null ? ss.matches[ui] : null;
    const u = rec ? { side: a === ss.club ? 0 : 1, rec, pos: S.p.pos, ovr: C.effOvr(S.p) } : null;
    const res = MD.play(st, sideOf(a), sideOf(b), ga, gb, u);
    MD.addAgg(agg, a, res.P[0]); MD.addAgg(agg, b, res.P[1]);
    out.push([C.cix(w, a), C.cix(w, b), ga, gb, res.ev, res.ln]);
  });
  if (st) st.L[lgId] = MD.packL(out, per, live);
  if (!live) return null;
  // 득점·도움 순위, 평점 순위 (내 선수 포함: id 'ME')
  const list = Object.values(agg);
  const nm = x => x.id === 'ME' ? S.p.name : MD.nameOf(x.id);
  const pidOf = x => x.id === 'ME' || x.id[0] === '~' ? '' : x.id;
  const by = (k1, k2) => (x, z) => z[k1] - x[k1] || z[k2] - x[k2] || x.apps - z.apps;
  const sc = list.filter(x => x.g > 0).sort(by('g', 'a')).slice(0, 15).map(x => x.id === 'ME' ? [nm(x), x.club, x.g, x.a, 1] : [nm(x), x.club, x.g, x.a, 0, pidOf(x)]);
  const as = list.filter(x => x.a > 0).sort(by('a', 'g')).slice(0, 15).map(x => x.id === 'ME' ? [nm(x), x.club, x.a, x.g, 1] : [nm(x), x.club, x.a, x.g, 0, pidOf(x)]);
  const rounds = Math.max(1, Math.round(mlist.length / per));
  const ageOf = {}; for (const id of lg.clubs) { const c = w.clubs[id]; if (c && c.sq) for (const e of c.sq) ageOf[String(e[0])] = e[3]; }
  const best = list.filter(x => x.id !== 'ME' && x.apps >= Math.max(5, rounds * .4)).map(x => [nm(x), x.club, +(x.rs / x.apps).toFixed(2), x.pos, pidOf(x), ageOf[x.id] || 0, x.apps]).sort((x, z) => z[2] - x[2]).slice(0, 25);
  // 내 팀 동료 시즌 기록 (팀 내 평점 순위에 쓰인다)
  if (lg.clubs.includes(ss.club)) ss.myAgg = list.filter(x => x.club === ss.club).map(x => ({ id: x.id, pos: x.pos, apps: x.apps, g: x.g, a: x.a, r: +(x.rs / x.apps).toFixed(2) }));
  // 선수 시즌 기록 보관 (명단이 있는 구단의 선수 전원, 출전이 없어도 0경기로 남긴다)
  w.ps = w.ps || {};
  for (const id of lg.clubs) {
    const c = w.clubs[id]; if (!c || c.lite || !c.sq) continue;
    for (const e of c.sq) {
      const pid = String(e[0]), o = e[2], tracked = !!w.ps[pid];
      const x = agg[pid];
      if (o < 50 && !tracked && !x) continue; // 경기에 나온 선수는 OVR과 관계없이 기록 (팀 득점 = 선수 득점 합)
      const apps = x ? x.apps : 0;
      C.psDirty = true;
      const Pp = w.ps[pid] = w.ps[pid] || { n: C.pName(w, e), nat: e[5], pos: e[1], h: '' };
      if (Array.isArray(Pp.h)) Pp.h = Pp.h.map(z => z.join(',')).join(';') + (Pp.h.length ? ';' : '');
      Pp.pos = e[1];
      Pp.h += [y - 2000, cix(w, id), apps, x ? x.g : 0, x ? x.a : 0, apps ? Math.round(x.rs / apps * 100) : 0, o, e[3]].concat(e[7] ? [1] : []).join(',') + ';';
    }
  }
  return { sc, as, best };
}
// 리그 데이터가 없는 실명 구단(대륙 대회만 나오는 구단): 같은 나라 가상 상대와 30경기를 치른 것으로 경기 기록을 만든다
function otherClubSeason(S, cid) {
  const w = S.w, ss = S.ss, y = ss.year, c = w.clubs[cid], MD = C.MD;
  const me = MD.clubSide(w, cid, y), agg = {}, out = [];
  const opps = Array.from({ length: 15 }, (_, k) => { const str = c.str - 3 + (k - 7) * .6; const o = { id: 'OPP_' + cid + '_' + k, nat: c.nat, str, lite: true }; return { str, side: { key: o.id, sq: C.squadOf(w, o, y).map(x => ({ id: '~' + o.id + '~' + x.n, n: x.n, pos: x.pos, ovr: x.ovr })) } }; });
  for (let k = 0; k < 30; k++) {
    const o = opps[k % 15], home = k < 15;
    const [ga, gb] = C.quickMatch(home ? c.str : o.str, home ? o.str : c.str, 1);
    const res = MD.play(ss.mx, home ? me : o.side, home ? o.side : me, ga, gb, null);
    MD.addAgg(agg, cid, res.P[home ? 0 : 1]);
    out.push([home ? cix(w, cid) : o.side.key, home ? o.side.key : cix(w, cid), ga, gb, res.ev, res.ln]);
  }
  ss.mx.L['_' + cid] = MD.packL(out, 1, true);
  w.ps = w.ps || {};
  for (const e of c.sq) {
    const pid = String(e[0]); const x = agg[pid]; if (e[2] < 50 && !w.ps[pid] && !x) continue;
    const apps = x ? x.apps : 0;
    C.psDirty = true;
    const Pp = w.ps[pid] = w.ps[pid] || { n: C.pName(w, e), nat: e[5], pos: e[1], h: '' };
    if (Array.isArray(Pp.h)) Pp.h = Pp.h.map(z => z.join(',')).join(';') + (Pp.h.length ? ';' : '');
    Pp.pos = e[1];
    Pp.h += [y - 2000, cix(w, cid), apps, x ? x.g : 0, x ? x.a : 0, apps ? Math.round(x.rs / apps * 100) : 0, e[2], e[3]].concat(e[7] ? [1] : []).join(',') + ';';
  }
}
// ---------- 각국 컵 ----------
const KOR = ['8강', '4강', '결승'];
const stageIdx = s => s === '우승' ? 3 : KOR.indexOf(s);
// 사용자가 뛴 컵이면 실제 결과와 맞춘다
function simCup(S, nat, kind, name) {
  const w = S.w, ss = S.ss, maxTier = kind === 'lcup' ? 4 : 3;
  const pool = Object.values(w.clubs).filter(c => c.lg && w.lg[c.lg] && w.lg[c.lg].nation === nat && w.lg[c.lg].tier <= maxTier);
  if (pool.length < 8) return null;
  const mine = ss.club && w.clubs[ss.club] && w.lg[w.clubs[ss.club].lg] && w.lg[w.clubs[ss.club].lg].nation === nat && ss.alive && (kind === 'cup' ? ss.cupName : ss.lcupName);
  const um = {}; if (mine) for (const m of ss.matches) if (m.comp === kind && KOR.includes(m.stage)) um[m.stage] = m;
  const out = mine ? (kind === 'cup' ? (ss.CWon ? '우승' : ss.COut || '') : (ss.LCWon ? '우승' : ss.LCOut || '')) : '';
  const uIn = mine && um['8강'];
  const fixed = new Set();
  const slots = new Array(8).fill(null);
  if (uIn) {
    slots[0] = ss.club; slots[1] = um['8강'].opp; fixed.add(ss.club); fixed.add(um['8강'].opp);
    if (um['4강']) { slots[2] = um['4강'].opp; fixed.add(um['4강'].opp); }
    if (um['결승']) { slots[4] = um['결승'].opp; fixed.add(um['결승'].opp); }
  }
  const rest = pool.filter(c => !fixed.has(c.id) && c.id !== ss.club);
  for (let i = 0; i < 8; i++) if (!slots[i]) { const c = wpick(rest, x => Math.exp((x.str - 70) * .13)); slots[i] = c.id; rest.splice(rest.indexOf(c), 1); }
  // 사용자가 없는 대진이면 섞는다
  const order = uIn ? slots : shuffle(slots);
  const rounds = []; let cur = order;
  for (let ri = 0; ri < 3; ri++) {
    const ms = [], next = [];
    for (let i = 0; i < cur.length; i += 2) {
      const a = cur[i], b = cur[i + 1];
      let ga, gb, pw = 0, win;
      const u = uIn && (a === ss.club || b === ss.club) ? um[KOR[ri]] : null;
      if (u) {
        ga = a === ss.club ? u.gf : u.ga; gb = a === ss.club ? u.ga : u.gf;
        const uw = u.koWin != null ? u.koWin : (u.gf > u.ga || u.pens === 'W');
        win = uw ? ss.club : (a === ss.club ? b : a);
        if (ga === gb) pw = win;
      } else {
        const sa = w.clubs[a].str, sb = w.clubs[b].str;
        [ga, gb] = C.quickMatch(sa, sb, 0);
        // 사용자가 상대할 팀은 반드시 올라와야 한다
        const must = uIn ? (ri === 0 ? [slots[2], slots[4]] : ri === 1 ? [slots[4]] : []) : [];
        if (must.includes(a) || must.includes(b)) { const m = must.includes(a) ? a : b; win = m; if ((m === a && ga < gb) || (m === b && gb < ga)) [ga, gb] = [gb, ga]; }
        else win = C.koWinner(sa, sb, ga, gb) === 0 ? a : b;
        if (ga === gb) pw = win;
      }
      ms.push([a, b, ga, gb, pw]); next.push(win);
    }
    rounds.push({ n: KOR[ri], m: ms }); cur = next;
  }
  const fin = rounds[2].m[0];
  const winner = cur[0], runner = fin[0] === winner ? fin[1] : fin[0];
  // 경기 기록 (득점자·카드·라인업)
  if (C.MD && ss.mx) {
    const out = [];
    rounds.forEach((rd, ri) => rd.m.forEach(([a, b, ga, gb, pw]) => {
      const u = uIn && (a === ss.club || b === ss.club) ? um[KOR[ri]] : null;
      const res = C.MD.play(ss.mx, C.MD.clubSide(w, a, ss.year), C.MD.clubSide(w, b, ss.year), ga, gb, u ? { side: a === ss.club ? 0 : 1, rec: u, pos: S.p.pos, ovr: C.effOvr(S.p) } : null);
      out.push([KOR[ri], cix(w, a), cix(w, b), ga, gb, res.ev, res.ln, pw ? cix(w, pw) : null]);
    }));
    ss.mx.CUP[nat + ':' + kind] = out;
  }
  // 사용자가 8강 전에 탈락했다면 8강 이전 성적은 기록에 남지 않는다
  void out; void stageIdx;
  return { n: name, k: kind, r: rounds, w: winner, ru: runner };
}

// ---------- 국제 대회 ----------
const TDEF = {
  WC: { name: 'FIFA 월드컵', size: 48, quota: { UEFA: 16, CAF: 9, AFC: 8, CONMEBOL: 6, CONCACAF: 6, OFC: 1 }, extra: 2 },
  EURO: { name: 'UEFA 유로', size: 24, conf: 'UEFA' },
  COPA: { name: '코파 아메리카', size: 16, conf: 'CONMEBOL', guest: 'CONCACAF' },
  ASIA: { name: 'AFC 아시안컵', size: 24, conf: 'AFC' },
  AFCON: { name: '아프리카 네이션스컵', size: 24, conf: 'CAF' },
  GOLD: { name: 'CONCACAF 골드컵', size: 16, conf: 'CONCACAF' }
};
C.TDEF = TDEF;
function tournamentsOf(y) {
  const l = [];
  if ((y - 2026) % 4 === 0 && y > 2026) l.push('WC');
  if (y % 4 === 0) l.push('EURO', 'COPA');
  if (y % 4 === 3) l.push('ASIA', 'AFCON', 'GOLD');
  return l;
}
C.tournamentsOf = tournamentsOf;
C.nextWorldCup = y => { let x = y; while (!((x - 2026) % 4 === 0 && x > 2026)) x++; return x; };
const SIZES = [48, 32, 24, 16, 12, 8];
function koSize(n) { return n >= 48 ? 32 : n >= 24 ? 16 : n >= 12 ? 8 : 4; }
function seedOrder(K) { let o = [1]; while (o.length < K) { const L = o.length * 2 + 1; o = o.flatMap(s => [s, L - s]); } return o; }
const KONAME = { 32: '32강', 16: '16강', 8: '8강', 4: '4강', 2: '결승' };

let curPools = null;
function simTournament(S, key, strengths, user) {
  const def = TDEF[key], ss = S.ss, y = ss.year + 1;
  // 참가국 선발
  const conf = n => C.confOf(n);
  const rank = (list) => list.map(n => [n, strengths[n] + N(0, 2.2)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  let field = [];
  const all = Object.keys(strengths);
  if (key === 'WC') {
    for (const cf in def.quota) field.push(...rank(all.filter(n => conf(n) === cf)).slice(0, def.quota[cf]));
    const left = rank(all.filter(n => !field.includes(n)));
    field.push(...left.slice(0, 48 - field.length));
  } else {
    const home = rank(all.filter(n => conf(n) === def.conf));
    field = home.slice(0, def.size);
    if (def.guest) field.push(...rank(all.filter(n => conf(n) === def.guest)).slice(0, def.size - field.length));
  }
  const size = SIZES.find(s => s <= field.length);
  if (!size) return null;
  field = field.slice(0, size);
  // 조 편성 (포트)
  const ng = size / 4, sorted = field.slice().sort((a, b) => strengths[b] - strengths[a]);
  const groups = Array.from({ length: ng }, (_, i) => ({ n: String.fromCharCode(65 + i), t: [], m: [] }));
  for (let pot = 0; pot < 4; pot++) { const p = shuffle(sorted.slice(pot * ng, pot * ng + ng)); p.forEach((n, i) => groups[i].t.push(n)); }
  const T = { k: key, n: def.name, y, g: groups, ko: [], w: null, ru: null, host: null, teams: field.length };
  const res = { userIn: field.includes(user.nat), stage: null, won: false };
  const d0 = C.day(y, 6, 12);
  // 경기 하나
  const mxOut = ss.mx ? (ss.mx.INTL[key] = []) : null;
  const rec1 = (stageName, m, urec) => {
    if (!mxOut || !C.MD) return;
    const res = C.MD.play(ss.mx, C.MD.natSide(S.w, m[0], curPools, ss.year), C.MD.natSide(S.w, m[1], curPools, ss.year), m[2], m[3], urec ? { side: m[0] === user.nat ? 0 : 1, rec: urec, pos: S.p.pos, ovr: C.effOvr(S.p) } : null);
    mxOut.push([stageName, m[0], m[1], m[2], m[3], res.ev, res.ln, m[4] || null]);
  };
  const play = (a, b, ko, stageName, dd) => {
    const amp = x => 72 + (x - 72) * 1.45, sa = amp(strengths[a]) + N(0, 1), sb = amp(strengths[b]) + N(0, 1);
    if (user.on && (a === user.nat || b === user.nat)) {
      const me = a === user.nat, opp = me ? b : a;
      const rec = user.play(opp, me ? sb : sa, def.name, stageName, dd);
      const gf = rec.gf, ga = rec.ga; let pw = 0;
      let win = null;
      if (ko) { if (gf === ga) { win = R() < 1 / (1 + Math.exp(-(strengths[user.nat] - strengths[opp]) * .06)); rec.pens = win ? 'W' : 'L'; pw = win ? user.nat : opp; } else win = gf > ga; rec.koWin = win; }
      const m = me ? [a, b, gf, ga, pw] : [a, b, ga, gf, pw];
      rec1(stageName, m, rec);
      return { m, win: ko ? (win ? user.nat : opp) : null };
    }
    const [ga, gb] = C.quickMatch(sa, sb, 0);
    let win = null, pw = 0;
    if (ko) { win = C.koWinner(sa, sb, ga, gb) === 0 ? a : b; if (ga === gb) pw = win; }
    rec1(stageName, [a, b, ga, gb, pw], null);
    return { m: [a, b, ga, gb, pw], win };
  };
  // 조별 리그
  for (const g of groups) {
    const tb = C.newTable(g.t);
    const pairs = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
    pairs.forEach(([i, j], k) => { const r = play(g.t[i], g.t[j], false, '조별리그', d0 + Math.floor(k / 2) * 5); g.m.push(r.m); C.addResult(tb, r.m[0], r.m[1], r.m[2], r.m[3]); });
    g.rows = C.sortTable(tb).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]);
    delete g.t;
  }
  // 토너먼트 진출
  const K = koSize(size), firsts = [], seconds = [], thirds = [];
  const key3 = r => r[7] * 1000 + (r[5] - r[6]) * 10 + r[5];
  groups.forEach(g => { firsts.push(g.rows[0]); seconds.push(g.rows[1]); thirds.push(g.rows[2]); });
  const q = [...firsts.sort((a, b) => key3(b) - key3(a)), ...seconds.sort((a, b) => key3(b) - key3(a)), ...thirds.sort((a, b) => key3(b) - key3(a))].slice(0, K).map(r => r[0]);
  if (res.userIn && !q.includes(user.nat)) res.stage = '조별리그 탈락';
  const order = seedOrder(K).map(s => q[s - 1]);
  let cur = order, n = K, dk = d0 + 18;
  while (n >= 2) {
    const name = KONAME[n], ms = [], next = [];
    for (let i = 0; i < cur.length; i += 2) { const r = play(cur[i], cur[i + 1], true, name, dk); ms.push(r.m); next.push(r.win); if (res.userIn && !res.stage && (cur[i] === user.nat || cur[i + 1] === user.nat) && r.win !== user.nat) res.stage = n === 2 ? '준우승' : name; }
    T.ko.push({ n: name, m: ms });
    cur = next; n /= 2; dk += 4;
  }
  T.w = cur[0];
  const f = T.ko[T.ko.length - 1].m[0]; T.ru = f[0] === T.w ? f[1] : f[0];
  if (res.userIn && T.w === user.nat) { res.stage = '우승'; res.won = true; }
  return { T, res };
}
const NTBASE = { IRN: 74, QAT: 69, UZB: 70, IRQ: 67, UAE: 66, OMA: 64, JOR: 67, BHR: 62, CHN: 65, THA: 63, VIE: 62, PLE: 61, KUW: 59, LBN: 59, SYR: 63, KGZ: 59, TJK: 60, PRK: 60, MAS: 59, IND: 59, IDN: 63, KSA: 70, AUS: 72, JPN: 76, KOR: 74,
  HON: 66, CRC: 68, PAN: 69, SLV: 63, GUA: 63, TRI: 61, HAI: 62, JAM: 67, CUW: 63, SUR: 62, CAN: 72, MEX: 75, USA: 76, NZL: 64,
  EGY: 72, RSA: 69, TUN: 70, ZAM: 64, UGA: 63, BEN: 63, GAB: 65, EQG: 64, MOZ: 61, TAN: 61, NAM: 60, COD: 70, SUD: 59, LBY: 62, KEN: 61 };
// 여름 국제 대회 전체 (사용자 국가 경기는 실제 경기로)
function simIntl(S) {
  const ss = S.ss, p = S.p, w = S.w, y = ss.year + 1;
  const keys = tournamentsOf(y);
  if (!keys.length) return null;
  const pools = ss.pools || C.nationPools(w);
  curPools = pools;
  const strengths = {};
  for (const n in pools) if (pools[n].all.length >= 8) strengths[n] = C.nationStrength(pools[n]);
  // 명단 데이터가 적은 국가는 기본 전력으로 보완
  for (const n in NTBASE) { const ps = pools[n] ? C.nationStrength(pools[n]) : 0; strengths[n] = Math.max(strengths[n] || 0, NTBASE[n] + N(0, .8), ps); }
  if (ss.ntStr && strengths[p.nat] != null) strengths[p.nat] = ss.ntStr;
  const called = !!(ss.nt && ss.nt.lvl === 'A');
  const nt0 = ss.nt;
  const user = {
    nat: p.nat, on: called,
    play(opp, oS, tname, stage, d) {
      const myS = ss.ntStr;
      const [lamT, lamO] = C.lambdas(myS, oS, 0);
      const rec = { d, comp: 'nt', compName: tname, stage, opp, oppName: C.natName(opp), home: null, natTeam: C.natName(p.nat), gf: 0, ga: 0, played: false };
      if (ss.inj <= 0 && R() < (nt0 ? nt0.start : .5) + .2) {
        const minutes = R() < .7 ? 90 : rint(60, 88);
        const r = C.playerMatch(p, { lamT, lamO, minutes, start: true, sT: myS, sO: oS, penTaker: ss.penTaker });
        Object.assign(rec, { gf: r.gf, ga: r.ga, st: r.st, shots: r.shots, played: true, start: true, min: minutes });
        const res = rec.gf > rec.ga ? 1 : rec.gf < rec.ga ? -1 : 0;
        rec.rating = C.matchRating(p, rec.st, res); rec.st.ratingSum = rec.rating; rec.st.rated = 1;
        if (res > 0) rec.st.wins = 1; else if (res < 0) rec.st.losses = 1; else rec.st.draws = 1;
      } else { const [a, b] = C.quickMatch(myS, oS, 0); rec.gf = a; rec.ga = b; rec.why = ss.inj > 0 ? '부상' : '벤치'; }
      ss.matches.push(rec); mine.push(rec);
      if (C.extras) C.extras.onMatch(S, rec);
      return rec;
    }
  };
  const mine = [];
  w.intl = w.intl || {};
  const list = [];
  let userT = null;
  for (const k of keys) {
    const r = simTournament(S, k, strengths, user);
    if (!r) continue;
    list.push(r.T);
    if (r.T.w) (w.hist.nt[k] = w.hist.nt[k] || []).push({ y, c: r.T.w });
    if (C.news && r.T.w && (k === 'WC' || TDEF[k].conf === C.confOf(p.nat))) C.news(S, `${y} ${r.T.n}: ${C.natName(r.T.w)} 우승 (결승 상대 ${C.natName(r.T.ru)})`, 'intl', k === 'WC');
    const mineConf = k === 'WC' || TDEF[k].conf === C.confOf(p.nat) || (TDEF[k].guest && TDEF[k].guest === C.confOf(p.nat));
    if (called && mineConf && (k === 'WC' || !userT)) {
      if (r.res.userIn) userT = { name: r.T.n, y, k, stage: r.res.stage || '조별리그 탈락', won: r.res.won, matches: mine.slice() };
      else if (k === 'WC' || TDEF[k].conf === C.confOf(p.nat)) userT = { name: r.T.n, y, k, stage: '본선 진출 실패', won: false, matches: [] };
    }
    mine.length = 0;
  }
  w.intl[y] = list;
  // 오래된 대회는 결승 결과만 남긴다
  for (const yy in w.intl) if (+yy < y - 12) w.intl[yy] = w.intl[yy].map(t => ({ k: t.k, n: t.n, y: t.y, w: t.w, ru: t.ru, ko: t.ko.slice(-1), g: [], slim: 1 }));
  return userT;
}
C.simIntl = simIntl;

// ---------- 시즌 보관 ----------
function archiveSeason(S, tables) {
  const w = S.w, ss = S.ss, p = S.p;
  w.arch = w.arch || {};
  const A = { y: ss.year, lg: {}, cup: {}, lcup: {}, cont: {} };
  const lgM = ss.matches.filter(m => m.comp === 'league' && m.played);
  const me = { name: p.name, club: ss.club, g: lgM.reduce((a, m) => a + m.st.goals, 0), a: lgM.reduce((a, m) => a + m.st.assists, 0) };
  const myLg = C.leagueOf(S, ss.club);
  for (const id in tables) {
    const lg = w.lg[id], rows = tables[id];
    const L = { t: rows.map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) };
    const ml = ss.lgM && ss.lgM[id];
    const fm = C.MD && ml && ml.length ? leagueFromMatches(S, id, rows, ml) : null;
    Object.assign(L, fm || leagueLeaders(S, id, rows, myLg && myLg.id === id ? me : null));
    if (fm) L.md = 1; // 경기 기록 기반
    L.n = lg.name;
    A.lg[id] = L;
  }
  // 리그 시뮬 밖의 실명 구단(대륙 대회만 나오는 구단 등)도 선수 시즌 기록은 남긴다
  { const inT = new Set(); for (const id in tables) for (const r of tables[id]) inT.add(r.id);
    for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite || !c.sq || !c.sq.length || inT.has(id)) continue;
      if (C.MD && ss.mx) { otherClubSeason(S, id); continue; }
      const pg = 30, gf = Math.round(pg * 1.45 * Math.exp((c.str - 70) * .025) * C.rnd(.85, 1.15)), pts = Math.round(pg * clamp(1.5 + (c.str - 70) * .04 + N(0, .2), .8, 2.5));
      leagueLeaders(S, null, [{ id, p: pg, gf, ga: 0, pts }], null); } }
  // 각국 컵
  const nats = new Set(Object.values(w.lg).map(l => l.nation));
  for (const nat of nats) {
    if (C.CUPNAME[nat]) { const r = simCup(S, nat, 'cup', C.CUPNAME[nat]); if (r) { A.cup[nat] = r; (w.hist.cup[nat] = w.hist.cup[nat] || []).push({ y: ss.label, c: r.w }); } }
    if (C.LCUPNAME[nat]) { const r = simCup(S, nat, 'lcup', C.LCUPNAME[nat]); if (r) A.lcup[nat] = r; }
  }
  // 대륙 대회
  for (const k in ss.allCont) {
    const cs = ss.allCont[k];
    A.cont[k] = { n: cs.name, w: cs.winner, ph: cs.table ? C.sortTable(cs.table).slice(0, 36).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) : null, r: (cs.ties || []).map((ts, i) => ({ n: (cs.rounds[i] || [])[2] || '', t: (ts || []).map(t => [t[0], t[1], t.win || null, t.sc ? t.sc[0] : null, t.sc ? t.sc[1] : null, t.pen ? 1 : 0]) })) };
  }
  // 대륙 대회 경기 기록: 리그 페이즈 + 토너먼트(1·2차전)
  if (C.MD && ss.mx) {
    const y = ss.year, side = id => C.MD.clubSide(w, id, y), U0 = rec => rec ? { rec, pos: p.pos, ovr: C.effOvr(p) } : null;
    for (const k in ss.allCont) {
      const cs = ss.allCont[k], out = [];
      for (const m of (cs.table && cs.table._m) || []) {
        const [a, b, ga, gb, ui] = m, rec = ui != null ? ss.matches[ui] : null;
        const u = U0(rec); if (u) u.side = a === ss.club ? 0 : 1;
        const res = C.MD.play(ss.mx, side(a), side(b), ga, gb, u);
        out.push(['리그 페이즈', cix(w, a), cix(w, b), ga, gb, res.ev, res.ln]);
      }
      (cs.ties || []).forEach((ts, ri) => (ts || []).forEach(t => {
        const nm = (cs.rounds[ri] || [])[2] || '', two = !!(cs.rounds[ri] || [])[1];
        const legs = [];
        if (t.ui && t.ui.length) t.ui.forEach((ix, j) => { const rec = ss.matches[ix]; if (!rec) return; const h = two ? (j === 0 ? t[0] : t[1]) : t[0], a2 = h === t[0] ? t[1] : t[0]; const hg = h === ss.club ? rec.gf : rec.ga, ag = h === ss.club ? rec.ga : rec.gf; legs.push([h, a2, hg, ag, rec, j]); });
        else if (t.l) t.l.forEach((l, j) => { const h = j === 0 ? t[0] : t[1], a2 = h === t[0] ? t[1] : t[0]; legs.push([h, a2, l[0], l[1], null, j]); });
        for (const [h, a2, hg, ag, rec, j] of legs) {
          const u = U0(rec); if (u) u.side = h === ss.club ? 0 : 1;
          const res = C.MD.play(ss.mx, side(h), side(a2), hg, ag, u);
          const last = j === legs.length - 1;
          out.push([nm + (two ? (j === 0 ? ' 1차전' : ' 2차전') : ''), cix(w, h), cix(w, a2), hg, ag, res.ev, res.ln, last && t.pen && t.win ? cix(w, t.win) : null]);
        }
      }));
      ss.mx.CONT[k] = out;
    }
    // 선수별 컵·대륙·국가대표 대회 기록 (리그 기록 h와 별도로 c에 보관): "시즌|대회|경기|골|도움|평점×100;"
    { const ag = {}, yOff = ss.year - 2000;
      const add = (key, row) => { const d = C.MD.decode(ss.mx, row); if (!d.ln) return;
        for (const side of d.ln) for (const x of side) { if (x.id === 'ME' || x.id[0] === '~') continue; const k = x.id + '|' + key; const a = ag[k] || (ag[k] = [0, 0, 0, 0]); a[0]++; a[3] += x.rt; }
        for (const e of d.ev) { if ('gp'.includes(e.k) && e.p !== 'ME' && e.p[0] !== '~') { const a = ag[e.p + '|' + key]; if (a) a[1]++; } if (e.a && e.a !== 'ME' && e.a[0] !== '~') { const a = ag[e.a + '|' + key]; if (a) a[2]++; } } };
      for (const k in ss.mx.CUP) { const [nat, kind] = k.split(':'); for (const r of ss.mx.CUP[k]) add(kind + ':' + nat, r); }
      for (const k in ss.mx.CONT) for (const r of ss.mx.CONT[k]) add('cont:' + k, r);
      for (const k in ss.mx.INTL) for (const r of ss.mx.INTL[k]) add('nt:' + k, r);
      for (const k in ag) { const i = k.indexOf('|'), pid = k.slice(0, i), key = k.slice(i + 1), P = w.ps && w.ps[pid]; if (!P) continue; const a = ag[k];
        P.c = (P.c || '') + `${yOff}|${key}|${a[0]}|${a[1]}|${a[2]}|${Math.round(a[3] / a[0] * 100)};`; C.psDirty = true; } }
    delete ss.mx._pm;
    w.mxPending = w.mxPending || {}; w.mxPending[ss.label] = ss.mx;
    w.mxKeys = (w.mxKeys || []).filter(x => x !== ss.label).concat(ss.label);
    // 경기 상세 기록은 최근 3시즌만 보관 (시즌당 약 4~6MB)
    while (w.mxKeys.length > 3) { const old = w.mxKeys.shift(); if (w.mxPending[old]) delete w.mxPending[old]; (w.mxDrop = w.mxDrop || []).push(old); }
    ss.mx = null;
  }
  w.arch[ss.label] = A;
  // 용량 관리: 3시즌 지난 기록은 1부 리그만 전체 순위, 나머지는 우승팀만
  const labels = Object.keys(w.arch).sort();
  labels.slice(0, -3).forEach(lb => {
    const a = w.arch[lb]; if (a.slim) return;
    for (const id in a.lg) {
      const lg = w.lg[id], L = a.lg[id];
      const avg = lg ? lg.clubs.reduce((x, c) => x + (w.clubs[c] ? w.clubs[c].str : 60), 0) / Math.max(1, lg.clubs.length) : 0;
      const major = lg && lg.tier === 1 && (avg >= 66 || lg.nation === p.nat);
      delete L.best;
      if (major) { L.sc = (L.sc || []).slice(0, 10); L.as = (L.as || []).slice(0, 10); }
      else a.lg[id] = { n: L.n, t: L.t.slice(0, lg && lg.tier === 1 ? 4 : 1), sc: (L.sc || []).slice(0, lg && lg.tier === 1 ? 3 : 1), as: (L.as || []).slice(0, lg && lg.tier === 1 ? 3 : 0), slim: 1 };
    }
    for (const k in a.cont) a.cont[k].ph = null;
    for (const grp of [a.cup, a.lcup]) for (const n in grp) grp[n].r = grp[n].r.slice(-1);
    a.slim = 1;
  });
  return A;
}
C.archiveSeason = archiveSeason;
})(typeof window !== 'undefined' ? window : globalThis);
