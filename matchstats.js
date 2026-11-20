// Road to Legend — 경기 세부 통계 엔진 (FotMob 스타일)
// 저장하지 않는다: 경기 키로 시드를 고정해 언제 열어도 같은 값이 나온다.
// 원칙: 이미 기록된 사실(골·도움·카드·교체 시간·평점)은 그대로 두고, 그 사실과 어긋나지 않게 나머지를 만든다.
//  - 골 이벤트 = 결과가 '골'인 슈팅 (득점자·시간 동일), 도움 = 그 슈팅의 키 패스
//  - 팀 합계 = 선수 합계, 유효 슈팅 ≥ 골, 골키퍼 선방 = 상대 유효 슈팅 − 실점, 차단 = 상대의 막힌 슛
//  - 전반/후반은 이벤트 시간으로 나누고, 나머지 누적 기록은 시간 비율로 나눈다
(function (G) {
'use strict';
const C = G.TC;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ROLEOF = pos => (C.ROLE && C.ROLE[pos]) || 'CM';
const ATK = new Set(['ST', 'W', 'AM']);
// FC27 능력치 (stats 순서)
const SI = { pace: 0, accel: 1, fin: 2, shotPow: 3, longSh: 4, posi: 5, vision: 8, cross: 9, longPass: 10, shortPass: 11, drib: 14, ctrl: 15, agil: 16, react: 18, mark: 19, intc: 20, slide: 21, stand: 22, head: 23, jump: 24, stam: 25, str: 26, aggr: 27, gkDiv: 28, gkHand: 29, gkKick: 30, gkRef: 31, gkPos: 32 };
const DEF_ATTR = { GK: [48, 62], CB: [64, 70], FB: [77, 76], DM: [66, 78], CM: [70, 78], AM: [76, 72], W: [83, 74], ST: [79, 72] }; // [속도, 체력]
function attrOf(id, role) {
  const F = G.FC27; let a = null;
  if (/^\d+$/.test(String(id)) && F && F.P[+id]) {
    const p = F.P[+id], s = p[13] || '';
    const v = k => { const c = s.charCodeAt(SI[k]); return c ? c - 32 : 60; };
    a = { pace: v('pace'), accel: v('accel'), stam: v('stam'), fin: v('fin'), head: v('head'), cross: v('cross'), pass: (v('shortPass') + v('vision')) / 2, longPass: v('longPass'), drib: v('drib'), tack: (v('stand') + v('slide')) / 2, intc: v('intc'), str: v('str'), jump: v('jump'), aggr: v('aggr'), gk: (v('gkDiv') + v('gkRef') + v('gkPos')) / 3, foot: p[6] === 'L' ? 'L' : 'R', weak: p[7] || 3 };
  } else {
    const r = C.seeded('pa|' + id), d = DEF_ATTR[role] || [70, 72], n = () => (r() + r() + r() - 1.5) * 8;
    a = { pace: clamp(d[0] + n(), 40, 95), accel: clamp(d[0] + n(), 40, 95), stam: clamp(d[1] + n(), 45, 95), fin: 60 + n(), head: 60 + n(), cross: 60 + n(), pass: 65 + n(), longPass: 62 + n(), drib: 62 + n(), tack: 60 + n(), intc: 60 + n(), str: 66 + n(), jump: 66 + n(), aggr: 62 + n(), gk: role === 'GK' ? 70 + n() : 15, foot: r() < .22 ? 'L' : 'R', weak: 2 + ((r() * 3) | 0) };
  }
  return a;
}
C.MS = C.MS || {};
const cache = new Map();
// o: { key, sa, sb, ga, gb, d: {ev, ln}, posOf(id, side, idx, start) }
// 경기 고유 키: 어디서 열든(리그 화면·뉴스·선수 기록·상대 전적) 같은 경기는 같은 통계가 나오도록 경기 내용으로 만든다
C.MS.keyOf = o => { const d = o.d || {}; const ev = (d.ev || []).map(e => e.k + e.m + '.' + e.s + '.' + e.p).join(','); const ln = d.ln ? d.ln.map(l => l.slice(0, 4).map(x => x.id).join('.')).join('/') : ''; return `${o.a}|${o.b}|${o.ga}-${o.gb}|${ev}|${ln}`; };
// 팀 전력: 선발 선수의 FC27 기본 능력치 평균 (시간이 지나도 바뀌지 않는 값)
C.MS.strOf = (d, s) => { const F = G.FC27, xs = ((d.ln && d.ln[s]) || []).filter(x => x.start).map(x => /^\d+$/.test(String(x.id)) && F && F.P[+x.id] ? F.P[+x.id][11] : 64); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 66; };
C.MS.gen = function (o) {
  if (o.d && o.d.ln && o.d.ln.length === 2 && o.d.ln[0].length) o = Object.assign({}, o, { key: C.MS.keyOf(o), sa: C.MS.strOf(o.d, 0), sb: C.MS.strOf(o.d, 1) });
  const ck = o.key + '|' + o.ga + '|' + o.gb;
  if (cache.has(ck)) return cache.get(ck);
  const res = build(o);
  if (o.nc) return res;
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  cache.set(ck, res);
  return res;
};
// 기본 배치 (선발 순서: GK, 수비 4, 미드 3, 공격 3) — 포지션 정보가 없을 때
const ORDER_POS = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW'];
function build(o) {
  const r = C.seeded('ms|' + o.key);
  const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const U = (a, b) => a + (b - a) * r();
  const poi = l => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  const pick = (list, wf) => { let t = 0; const ws = list.map(x => { const v = Math.max(0, wf(x)); t += v; return v; }); if (!list.length) return null; if (t <= 0) return list[(r() * list.length) | 0]; let q = r() * t; for (let i = 0; i < list.length; i++) { q -= ws[i]; if (q <= 0) return list[i]; } return list[list.length - 1]; };
  const multi = (n, ws) => { const out = ws.map(() => 0), t = ws.reduce((a, x) => a + x, 0); if (!t || n <= 0) return out; for (let k = 0; k < n; k++) { let q = r() * t; for (let i = 0; i < ws.length; i++) { q -= ws[i]; if (q <= 0) { out[i]++; break; } } } return out; };
  const d = o.d || { ev: [], ln: null }, sa = o.sa || 72, sb = o.sb || 72, S = [sa, sb], GL = [o.ga, o.gb];
  const ts = C.MD.teamStats(o.key, sa, sb, o.ga, o.gb);
  // ---- 선수 ----
  const PL = [[], []];
  if (d.ln && d.ln.length === 2) d.ln.forEach((list, s) => {
    let si = 0;
    list.forEach(x => {
      const idx = x.start ? si++ : -1;
      let pos = (o.posOf && o.posOf(x.id, s, idx, x.start)) || (x.start ? ORDER_POS[Math.min(idx, 10)] : 'CM');
      const role = ROLEOF(pos);
      const on = x.on || 0, off = x.off == null ? 90 : x.off, min = Math.max(1, off - on);
      PL[s].push({ id: x.id, s, pos, role, on, off, min, start: !!x.start, rt: x.rt || 6.6, A: attrOf(x.id, role), st: {} });
    });
  });
  const has = PL[0].length && PL[1].length;
  const onAt = (s, m) => PL[s].filter(p => p.on <= m && p.off >= m);
  const gkAt = (s, m) => onAt(s, m).find(p => p.role === 'GK') || PL[s].find(p => p.role === 'GK') || null;
  const perf = p => Math.exp((p.rt - 6.6) * .45);
  const half = m => m <= 45 ? 0 : 1;
  // ---- 점유율 (전·후반) ----
  const p1 = clamp(Math.round(ts.pos[0] + g() * 4), 22, 78), p2 = clamp(2 * ts.pos[0] - p1, 22, 78);
  const POS = [[p1, 100 - p1], [p2, 100 - p2]];
  // ---- 슈팅 ----
  const shots = [];
  const SW = { ST: 1, W: .62, AM: .58, CM: .3, DM: .14, FB: .13, CB: .2, GK: 0 };
  const AWT = { AM: 1, W: .9, CM: .62, FB: .5, ST: .42, DM: .3, CB: .12, GK: .02 };
  const taker = [0, 1].map(s => { const c = PL[s].filter(p => p.start && p.role !== 'GK'); return c.sort((a, b) => (b.A.cross + (b.role === 'AM' || b.role === 'W' ? 8 : 0)) - (a.A.cross + (a.role === 'AM' || a.role === 'W' ? 8 : 0)))[0] || null; });
  const lnXg = (med, sd, lo, hi) => clamp(Math.exp(Math.log(med) + g() * sd), lo, hi);
  function mkShot(s, m, p, kind, assist) {
    // kind: 'goal' | 'pen' | 'saved' | 'off' | 'block'
    const role = p ? p.role : 'ST', A = p ? p.A : attrOf('x', 'ST');
    const sh = { s, m, p: p ? p.id : null, res: kind === 'goal' || kind === 'pen' ? '골' : kind === 'saved' ? '선방' : kind === 'block' ? '막힘' : '빗나감' };
    if (kind === 'pen') { sh.sit = '페널티킥'; sh.type = A.foot === 'L' ? '왼발' : '오른발'; sh.inBox = 1; sh.xg = .79; sh.xgot = U(.78, .97); sh.dx = 11; sh.dy = 0; sh.big = 1; return sh; }
    const goal = kind === 'goal';
    const setP = r() < ({ CB: .62, DM: .32, FB: .26, ST: .22 }[role] || .18);
    sh.sit = setP ? (r() < .62 ? '코너킥' : '세트피스') : r() < .14 ? '역습' : '일반 플레이';
    const hdrP = setP ? ({ CB: .7, ST: .4, DM: .36 }[role] || .24) : ({ ST: .14, CB: .45, FB: .08 }[role] || .06);
    const head = r() < hdrP * (A.head > 75 ? 1.2 : 1);
    sh.type = head ? '헤더' : (r() < .8 - (A.weak - 3) * .04 ? (A.foot === 'L' ? '왼발' : '오른발') : (A.foot === 'L' ? '오른발' : '왼발'));
    const inP = head ? 1 : ({ ST: .8, W: .58, AM: .48, CM: .42, DM: .3, FB: .45, CB: .86 }[role] || .5) + (goal ? .25 : 0);
    sh.inBox = r() < inP ? 1 : 0;
    let xg;
    const one = () => sh.inBox ? (head ? lnXg(.075, .75, .02, .55) : lnXg(.095, .95, .02, .82)) : lnXg(.032, .5, .01, .11);
    xg = one(); if (goal) { for (let t = 0; t < 40; t++) { const c = one(); if (r() < c / (sh.inBox ? .62 : .12)) { xg = c; break; } xg = Math.max(xg, c * .9); } } // 골이 된 슈팅은 좋은 기회였을 가능성이 크다 (P(xG|골) ∝ xG)
    if (sh.sit === '역습' && sh.inBox) xg = Math.min(.85, xg * 1.25);
    sh.xg = Math.round(xg * 100) / 100 || .01; sh.big = sh.xg >= .3 ? 1 : 0;
    if (goal) sh.xgot = clamp(sh.xg + (1 - sh.xg) * U(.15, .8), .12, .98);
    else if (kind === 'saved') sh.xgot = clamp(sh.xg * U(.35, 1.7), .01, .7);
    if (kind === 'off' && r() < .08) sh.res = '골대';
    // 위치 (골문에서 거리 dx m, 중앙에서 좌우 dy m)
    const dist = sh.inBox ? clamp(17 - 15.5 * Math.sqrt(sh.xg / .8) + g() * 1.2, 3, 16.4) : clamp(U(17.5, 30), 17, 34);
    const side = (p && (p.pos[0] === 'L' ? -1 : p.pos[0] === 'R' ? 1 : 0)) || 0;
    const maxY = sh.inBox ? Math.min(19, 5 + dist * .9) : 26;
    sh.dy = Math.round(clamp(g() * maxY * .38 + side * U(0, maxY * .5), -maxY, maxY) * 10) / 10; sh.dx = Math.round(dist * 10) / 10;
    sh.as = assist !== undefined ? assist : null;
    return sh;
  }
  if (has) for (let s = 0; s < 2; s++) {
    const evG = d.ev.filter(e => e.s === s && (e.k === 'g' || e.k === 'p'));
    const nG = evG.length;
    let sh = Math.max(ts.sh[s], nG + 2), sot = clamp(Math.round(nG + Math.max(0, ts.sot[s] - nG) * .78), nG, sh);
    // 퇴장 등으로 사람이 적을 때 조금 줄인다
    const nonG = sh - nG, saved = sot - nG, rest = nonG - saved, blk = Math.round(rest * U(.28, .45)), off = rest - blk;
    for (const e of evG) { const p = PL[s].find(x => x.id === e.p) || null; const asP = e.a ? PL[s].find(x => x.id === e.a) : null; shots.push(mkShot(s, e.m, p, e.k === 'p' ? 'pen' : 'goal', asP ? asP.id : null)); }
    const kinds = [].concat(Array(saved).fill('saved'), Array(off).fill('off'), Array(blk).fill('block'));
    for (const k of kinds) {
      const m = clamp(Math.round(r() < .53 ? U(46, 91.5) : U(1, 46.5)), 1, 90);
      const on = onAt(s, m).filter(x => x.role !== 'GK');
      const p = pick(on, x => SW[x.role] * perf(x) * (.5 + x.A.fin / 140));
      const shot = mkShot(s, m, p, k, undefined);
      shots.push(shot);
    }
  }
  // 키 패스 (도움 포함): 골의 도움은 기록 그대로, 나머지 슈팅은 70% 정도 키 패스가 있다
  for (const sh of shots) {
    if (sh.as !== null && sh.as !== undefined) continue;
    if (sh.sit === '페널티킥') { sh.as = null; continue; }
    if (sh.res === '골') { sh.as = null; continue; } // 기록상 도움 없는 골
    const pr = sh.sit === '코너킥' ? .92 : sh.sit === '세트피스' ? .55 : .7;
    if (r() >= pr) { sh.as = null; continue; }
    const on = onAt(sh.s, sh.m).filter(x => x.id !== sh.p && x.role !== 'GK');
    const tk = taker[sh.s];
    const a = sh.sit === '코너킥' && tk && on.includes(tk) && r() < .8 ? tk : pick(on, x => AWT[x.role] * perf(x) * (.6 + x.A.pass / 160));
    sh.as = a ? a.id : null;
  }
  // 막힌 슛: 막은 수비수 / 유효 슈팅: 상대 골키퍼
  for (const sh of shots) {
    if (sh.res === '막힘') { const b = pick(onAt(1 - sh.s, sh.m).filter(x => x.role !== 'GK'), x => ({ CB: 1, FB: .6, DM: .55, CM: .3 }[x.role] || .12)); sh.by = b ? b.id : null; }
    if (sh.res === '선방' || sh.res === '골') { const k = gkAt(1 - sh.s, sh.m); sh.gk = k ? k.id : null; if (sh.res === '선방') sh.dive = sh.xgot > .16 && r() < .7 ? 1 : 0; }
  }
  shots.sort((a, b) => a.m - b.m || a.s - b.s);
  // ---- 선수 기록 ----
  const P = new Map(); for (const s of [0, 1]) for (const p of PL[s]) P.set(p.id, p);
  const st = p => p.st;
  const addTo = (id, k, v = 1) => { const p = P.get(id); if (p) p.st[k] = (p.st[k] || 0) + v; };
  for (const sh of shots) {
    if (sh.p) { addTo(sh.p, 'sh'); addTo(sh.p, 'xg', sh.xg); if (sh.sit !== '페널티킥') addTo(sh.p, 'npxg', sh.xg); if (sh.res === '골' || sh.res === '선방') { addTo(sh.p, 'sot'); addTo(sh.p, 'xgot', sh.xgot); } if (sh.res === '빗나감' || sh.res === '골대') addTo(sh.p, 'shOff'); if (sh.res === '골대') addTo(sh.p, 'post'); if (sh.res === '막힘') addTo(sh.p, 'shBlk'); if (sh.inBox) addTo(sh.p, 'shIn'); if (sh.big && sh.res !== '골') addTo(sh.p, 'bigMiss'); }
    if (sh.as) { addTo(sh.as, 'kp'); addTo(sh.as, 'xa', sh.xg); if (sh.big) addTo(sh.as, 'bigC'); }
    if (sh.by) addTo(sh.by, 'blk');
    if (sh.gk) { addTo(sh.gk, 'faced'); addTo(sh.gk, 'xgotF', sh.xgot); if (sh.res === '선방') { addTo(sh.gk, 'sav'); if (sh.dive) addTo(sh.gk, 'dive'); if (sh.inBox) addTo(sh.gk, 'savIn'); } }
  }
  // 실점 (자책골 포함, 골키퍼가 뛰던 시간)
  for (const e of d.ev) if ('gpo'.includes(e.k)) { const k = gkAt(1 - e.s, e.m); if (k) { addTo(k.id, 'conc'); if (e.k !== 'o') addTo(k.id, 'concNO'); } }
  for (const e of d.ev) { if (e.k === 'g' || e.k === 'p') addTo(e.p, 'g'); if (e.a) addTo(e.a, 'a'); if (e.k === 'y') addTo(e.p, 'y'); if (e.k === 'r' || e.k === '2') addTo(e.p, 'r'); }
  // 팀 수준 목표치 → 선수에게 분배 (합계 보존)
  const tot = [{}, {}];
  const role = p => p.role;
  const W = {
    touch: { GK: 38, CB: 72, FB: 70, DM: 78, CM: 72, AM: 60, W: 52, ST: 36 },
    pass: { GK: 40, CB: 60, FB: 50, DM: 64, CM: 58, AM: 42, W: 32, ST: 20 },
    lng: { GK: 10, CB: 5, FB: 2.5, DM: 3.5, CM: 2.6, AM: 1.2, W: .6, ST: .4 },
    crs: { GK: 0, CB: .1, FB: 3, DM: .4, CM: 1, AM: 1.6, W: 3.4, ST: .5 },
    fin3: { GK: .3, CB: 3.5, FB: 4, DM: 6, CM: 6.5, AM: 5, W: 3, ST: 1.4 },
    lineBr: { GK: .4, CB: 4, FB: 2.5, DM: 4.5, CM: 4, AM: 3, W: 2, ST: 1.6 },
    tkl: { GK: 0, CB: 1.6, FB: 2.1, DM: 2.6, CM: 1.9, AM: 1.1, W: 1, ST: .5 },
    int: { GK: .1, CB: 1.8, FB: 1.4, DM: 1.9, CM: 1.1, AM: .5, W: .45, ST: .25 },
    clr: { GK: .6, CB: 5, FB: 2.2, DM: 1.4, CM: .6, AM: .2, W: .25, ST: .5 },
    rec: { GK: 4, CB: 5, FB: 5, DM: 6.5, CM: 5.5, AM: 3.5, W: 3.2, ST: 2.2 },
    gdW: { GK: .1, CB: 3, FB: 3.4, DM: 4.2, CM: 3.8, AM: 3.4, W: 4, ST: 3 },
    adW: { GK: .5, CB: 3.4, FB: 1, DM: 1.5, CM: 1, AM: .5, W: .5, ST: 2.6 },
    drb: { GK: 0, CB: .2, FB: 1, DM: .6, CM: 1, AM: 2.2, W: 3, ST: 1.6 },
    foul: { GK: .05, CB: 1.2, FB: 1, DM: 1.6, CM: 1.1, AM: .8, W: .7, ST: 1 },
    fouled: { GK: .1, CB: .5, FB: .8, DM: 1, CM: 1.1, AM: 1.5, W: 1.6, ST: 1.4 },
    disp: { GK: 0, CB: .2, FB: .7, DM: .7, CM: 1, AM: 1.6, W: 2.2, ST: 2 },
    offs: { GK: 0, CB: .05, FB: .1, DM: .05, CM: .15, AM: .4, W: .8, ST: 2 },
    thr: { GK: 0, CB: .3, FB: 6, DM: .4, CM: .4, AM: .2, W: 1, ST: .1 },
    past: { GK: 0, CB: 1, FB: 1.4, DM: 1, CM: .8, AM: .4, W: .5, ST: .2 }
  };
  const share = (s, key, n, extra) => { const L = PL[s]; const ws = L.map(p => (W[key][role(p)] || .5) * p.min / 90 * (extra ? extra(p) : 1)); const out = multi(Math.max(0, Math.round(n)), ws); L.forEach((p, i) => p.st[key] = (p.st[key] || 0) + out[i]); };
  if (has) {
    const totP = 830 + (sa + sb - 144) * 5 + g() * 60;
    for (let s = 0; s < 2; s++) {
      const o2 = 1 - s, pos = (POS[0][s] + POS[1][s]) / 2, str = S[s], dS = S[s] - S[o2];
      const T = tot[s];
      T.pass = Math.round(totP * pos / 100 * (1 + g() * .03));
      T.acc = clamp(.785 + (str - 72) * .0065 + (pos - 50) * .0018 + g() * .018, .58, .93);
      share(s, 'pass', T.pass, p => .7 + p.A.pass / 230);
      share(s, 'touch', T.pass * 1.22 + 70 + g() * 12);
      share(s, 'lng', T.pass * U(.075, .12));
      share(s, 'crs', U(8, 20) * Math.sqrt(pos / 50) + g() * 2, p => .6 + p.A.cross / 160);
      share(s, 'fin3', T.pass * U(.1, .14) * (pos / 50));
      share(s, 'lineBr', U(14, 26) * (.7 + (str - 60) / 80));
      share(s, 'tkl', U(12, 21) * (1 + (50 - pos) * .01), p => .6 + p.A.tack / 170);
      share(s, 'int', U(5, 13) * (1 + (50 - pos) * .012), p => .6 + p.A.intc / 170);
      const oppSh = shots.filter(x => x.s === o2).length;
      share(s, 'clr', 8 + (50 - pos) * .35 + oppSh * .75 + g() * 3);
      share(s, 'rec', U(38, 55) * (1 + (50 - pos) * .006));
      share(s, 'offs', Math.max(0, poi(1.6 + dS * .03)));
      share(s, 'thr', U(13, 24));
      share(s, 'foul', U(8, 15) * (1 + (50 - pos) * .01), p => .6 + p.A.aggr / 160);
      share(s, 'disp', U(6, 13));
    }
    // 볼 경합: 한 번의 경합엔 승자 하나 (양 팀 합 = 전체)
    const gTot = Math.round(U(82, 112)), aTot = Math.round(U(26, 50));
    const gW0 = Math.round(gTot * clamp(.5 + (sa - sb) * .006 + g() * .05, .3, .7)), aW0 = Math.round(aTot * clamp(.5 + (sa - sb) * .004 + g() * .08, .25, .75));
    const GW = [gW0, gTot - gW0], AWn = [aW0, aTot - aW0];
    for (let s = 0; s < 2; s++) {
      share(s, 'gdW', GW[s], p => .6 + p.A.str / 200 + p.A.drib / 300);
      share(s, 'adW', AWn[s], p => .3 + (p.A.head + p.A.jump) / 160);
      // 진 경합 = 상대가 이긴 경합 (같은 수만큼 이 팀 선수들에게)
      const Lg = PL[s], wsg = Lg.map(p => (W.gdW[p.role] || .5) * p.min / 90), wsa = Lg.map(p => (W.adW[p.role] || .5) * p.min / 90);
      const lg = multi(GW[1 - s], wsg), la = multi(AWn[1 - s], wsa);
      Lg.forEach((p, i) => { p.st.gdL = lg[i]; p.st.adL = la[i]; });
    }
    for (let s = 0; s < 2; s++) {
      const att = Math.round(U(11, 22)), suc = Math.round(att * clamp(.48 + (S[s] - S[1 - s]) * .008 + g() * .06, .25, .75));
      tot[s].drbA = att; share(s, 'drb', suc, p => .5 + p.A.drib / 120);
      const Lg = PL[s], wa = Lg.map(p => (W.drb[p.role] || .3) * p.min / 90 * (.5 + p.A.drib / 120)); const ex = multi(att - suc, wa); Lg.forEach((p, i) => p.st.drbF = ex[i]);
      tot[s].drbW = suc;
    }
    // 당한 파울 = 상대 반칙, 돌파 허용 = 상대 드리블 성공
    for (let s = 0; s < 2; s++) { const of = PL[1 - s].reduce((a, p) => a + (p.st.foul || 0), 0); share(s, 'fouled', of); share(s, 'past', tot[1 - s].drbW); }
    // 패스 성공·긴 패스·크로스 성공 (선수별 정확도)
    const ACC = { GK: -.13, CB: .05, FB: -.01, DM: .045, CM: .03, AM: -.03, W: -.07, ST: -.11 };
    for (let s = 0; s < 2; s++) for (const p of PL[s]) {
      if (p.st.pass < p.st.lng) p.st.pass = p.st.lng;
      const a = clamp(tot[s].acc + (ACC[p.role] || 0) + (p.rt - 6.6) * .025 + (p.A.pass - 72) * .002 + g() * .03, .4, .98);
      p.st.passA = Math.min(p.st.pass, Math.round(p.st.pass * a));
      p.st.lngA = Math.min(p.st.lng, Math.round(p.st.lng * clamp(.48 + (p.A.longPass - 70) * .006 + g() * .1, .1, .9)));
      p.st.crsA = Math.min(p.st.crs, Math.round(p.st.crs * clamp(.26 + (p.A.cross - 70) * .005 + g() * .1, 0, .7)));
      // 박스 안 터치: 슈팅 수 + 역할
      p.st.boxT = Math.min(p.st.touch, (p.st.shIn || 0) + Math.max(0, Math.round(({ ST: 3.2, W: 2.2, AM: 1.8, CM: .8, DM: .3, FB: .8, CB: .7, GK: 0 }[p.role] || .5) * p.min / 90 * (POS[0][s] + POS[1][s]) / 100 * 2 + g() * .9)));
      // 골키퍼 전용
      if (p.role === 'GK') {
        const oppCr = PL[1 - s].reduce((a, q) => a + (q.st.crs || 0), 0);
        p.st.claim = Math.max(0, Math.round(oppCr * U(.05, .14) + g() * .6)); p.st.punch = r() < .35 ? 1 + (r() < .2 ? 1 : 0) : 0; p.st.sweep = r() < .3 ? 1 : 0; p.st.gkThr = Math.max(0, Math.round(U(1, 7)));
      }
      // 신체 능력
      const BASE = { GK: 5.4, CB: 10.1, FB: 10.9, DM: 11.3, CM: 11.6, AM: 11.1, W: 10.7, ST: 10.1 };
      const km = (BASE[p.role] || 10.5) * (1 + (p.A.stam - 72) * .0042) * (p.min / 90) * (p.start ? 1 : 1.07) * (1 + g() * .045);
      const sprS = clamp(({ GK: .006, CB: .028, FB: .046, DM: .03, CM: .034, AM: .038, W: .048, ST: .043 }[p.role] || .035) * (1 + (p.A.pace - 75) * .012) * (1 + g() * .15), .003, .09);
      const walkS = clamp((p.role === 'GK' ? .52 : .25) + g() * .025, .15, .6), runS = clamp((p.role === 'GK' ? .08 : .25) + (p.A.stam - 72) * .001 + g() * .02, .05, .35);
      p.st.km = km; p.st.walk = km * walkS; p.st.run = km * runS; p.st.spr = km * sprS; p.st.jog = Math.max(0, km - p.st.walk - p.st.run - p.st.spr);
      p.st.sprN = Math.max(0, Math.round(p.st.spr * 1000 / U(17, 25)));
      p.st.top = Math.round(clamp(24.6 + (p.role === 'GK' ? -1.8 : 0) + p.A.pace * .083 + (p.A.accel - 75) * .01 + g() * .55 - (p.min < 25 ? .6 : 0), 22, 36.5) * 10) / 10;
    }
  }
  // 선수 파생: 수비적 행동, 볼 경합 합
  for (const p of P.values()) {
    const t = p.st;
    for (const k of ['g', 'a', 'sh', 'sot', 'shOff', 'shBlk', 'post', 'shIn', 'kp', 'bigC', 'bigMiss', 'blk', 'sav', 'dive', 'savIn', 'faced', 'conc', 'concNO', 'y', 'r']) t[k] = t[k] || 0;
    for (const k of ['xg', 'npxg', 'xgot', 'xa', 'xgotF']) t[k] = t[k] || 0;
    t.def = (t.tkl || 0) + (t.int || 0) + (t.blk || 0) + (t.clr || 0);
    t.duelW = (t.gdW || 0) + (t.adW || 0);
    t.gd = (t.gdW || 0) + (t.gdL || 0); t.ad = (t.adW || 0) + (t.adL || 0);
    t.drbT = (t.drb || 0) + (t.drbF || 0);
    t.prev = t.xgotF ? t.xgotF - t.concNO : 0;
    t.min = p.min;
  }
  // ---- 팀 합계 (전반/후반) ----
  // 시간 비율로 나누는 누적 기록: 전반 비율 f (팀·항목별로 조금씩 다름)
  const TEAMK = ['pass', 'passA', 'touch', 'boxT', 'lng', 'lngA', 'crs', 'crsA', 'tkl', 'int', 'clr', 'gdW', 'adW', 'drb', 'foul', 'offs', 'thr', 'km', 'walk', 'run', 'spr', 'sprN'];
  const H = [[{}, {}], [{}, {}]]; // H[half][side]
  for (let s = 0; s < 2; s++) {
    const sum = k => PL[s].reduce((a, p) => a + (k === 'run' ? (p.st.run || 0) + (p.st.jog || 0) : (p.st[k] || 0)), 0);
    for (const k of TEAMK) {
      const v = sum(k);
      // 선수 출전 시간에서 전반 비율
      const m1 = PL[s].reduce((a, p) => a + Math.max(0, Math.min(45, p.off) - Math.min(45, p.on)), 0), mt = PL[s].reduce((a, p) => a + p.min, 0) || 1;
      let f = clamp(m1 / mt + g() * .035 + (['km', 'walk', 'run', 'spr', 'sprN'].includes(k) ? .012 : 0), .3, .7);
      const isF = ['km', 'walk', 'run', 'spr'].includes(k);
      const a = isF ? v * f : Math.round(v * f);
      H[0][s][k] = a; H[1][s][k] = isF ? v - a : v - a;
    }
    // 정확한 패스 진영: 상대 진영 비율은 점유율·전력과 함께 오른다
    for (let hh = 0; hh < 2; hh++) { const pa = H[hh][s].passA, oppSh = clamp(.38 + (POS[hh][s] - 50) * .007 + (S[s] - 72) * .004 + g() * .03, .2, .62); H[hh][s].passOpp = Math.round(pa * oppSh); H[hh][s].passOwn = pa - H[hh][s].passOpp; H[hh][s].pos = POS[hh][s]; }
    // 코너킥: 슈팅·점유율과 함께
    const corn = Math.max(0, Math.round(shots.filter(x => x.s === s).length * .3 + (POS[0][s] - 50) * .05 + g() * 1.6 + .5));
    const cf = Math.round(corn * clamp(.5 + g() * .12, .2, .8)); H[0][s].corn = cf; H[1][s].corn = corn - cf;
    // 공격 구역 (좌·중앙·우)
    const lft = clamp(Math.round(36 + g() * 5), 22, 50), ctr = clamp(Math.round(26 + g() * 4), 16, 36); tot[s].zone = [lft, ctr, 100 - lft - ctr];
  }
  // 이벤트에서 나오는 값 (반별)
  for (let hh = 0; hh < 2; hh++) for (let s = 0; s < 2; s++) {
    const T = H[hh][s], SH = shots.filter(x => x.s === s && half(x.m) === hh);
    T.sh = SH.length; T.sot = SH.filter(x => x.res === '골' || x.res === '선방').length; T.shOff = SH.filter(x => x.res === '빗나감' || x.res === '골대').length; T.shBlk = SH.filter(x => x.res === '막힘').length; T.post = SH.filter(x => x.res === '골대').length;
    T.shIn = SH.filter(x => x.inBox).length; T.shOut = T.sh - T.shIn; T.bigC = SH.filter(x => x.big).length; T.bigMiss = SH.filter(x => x.big && x.res !== '골').length;
    T.xg = SH.reduce((a, x) => a + x.xg, 0); T.xgOpen = SH.filter(x => x.sit === '일반 플레이' || x.sit === '역습').reduce((a, x) => a + x.xg, 0); T.xgSet = SH.filter(x => x.sit === '코너킥' || x.sit === '세트피스').reduce((a, x) => a + x.xg, 0);
    T.npxg = SH.filter(x => x.sit !== '페널티킥').reduce((a, x) => a + x.xg, 0); T.xgot = SH.filter(x => x.xgot != null && (x.res === '골' || x.res === '선방')).reduce((a, x) => a + x.xgot, 0);
    const OSH = shots.filter(x => x.s === 1 - s && half(x.m) === hh);
    T.blk = OSH.filter(x => x.res === '막힘').length; T.sav = OSH.filter(x => x.res === '선방').length;
    const evH = d.ev.filter(e => e.s === s && half(e.m) === hh);
    T.y = evH.filter(e => e.k === 'y').length; T.r = evH.filter(e => e.k === 'r' || e.k === '2').length;
    T.goals = evH.filter(e => 'gpo'.includes(e.k)).length;
  }
  // 골 취소 (VAR·오프사이드 등): 기록에는 없고 타임라인에만 나온다
  const vars = [];
  if (has) { const rv = C.seeded('var|' + o.key);
    for (let s = 0; s < 2; s++) if (rv() < .07 + shots.filter(x => x.s === s).length * .006) { const m = 3 + Math.floor(rv() * 87), on = onAt(s, m).filter(x => x.role !== 'GK'); if (!on.length) continue; let t = 0; for (const x of on) t += SW[x.role] + .05; let q = rv() * t, p = on[0]; for (const x of on) { q -= SW[x.role] + .05; if (q <= 0) { p = x; break; } } const z = rv(); vars.push({ m, s, p: p.id, why: z < .62 ? '오프사이드' : z < .8 ? '핸드볼' : '공격자 반칙' }); } }
  return { PL, P, shots, H, tot, POS, has: !!has, vars, key: o.key };
};
// 반 선택: 0 = 전반, 1 = 후반, 2 = 모두
C.MS.team = function (ms, s, hf) {
  if (hf === 0 || hf === 1) return ms.H[hf][s];
  const a = ms.H[0][s], b = ms.H[1][s], o = {};
  for (const k in a) o[k] = typeof a[k] === 'number' ? a[k] + (b[k] || 0) : a[k];
  o.pos = Math.round((a.pos + b.pos) / 2);
  return o;
};
})(typeof window !== 'undefined' ? window : globalThis);
