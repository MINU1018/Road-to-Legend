// Road to Legend — 선수 프로필 (FotMob 스타일): 기본 정보·포지션, 이적 가치 그래프, 시즌 요약, 경기 통계, 시즌 히트맵·슈팅 맵,
// 시즌 성적(합계/90분당, 같은 리그·같은 포지션 순위), 선수 특성 레이더, 경력, 트로피, 소개
// 세부 지표는 경기 상세(matchstats.js)와 같은 값을 경기마다 더한 것 — 경기 팝업에서 본 숫자와 그대로 맞는다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, MD = C.MD;
const { h, crest } = U;
const S = () => U.S();
const flag = (c, w) => U.flag(c, w);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1), f2 = x => (Math.round(x * 100) / 100).toFixed(2);
const PST = () => (U.st.pf = U.st.pf || {});
const POSKO = { GK: '골키퍼', CB: '중앙 수비수', LB: '왼쪽 수비수', RB: '오른쪽 수비수', LWB: '왼쪽 윙백', RWB: '오른쪽 윙백', DM: '수비형 미드필더', CDM: '수비형 미드필더', CM: '중앙 미드필더', AM: '공격형 미드필더', CAM: '공격형 미드필더', LM: '왼쪽 미드필더', RM: '오른쪽 미드필더', LW: '왼쪽 윙어', RW: '오른쪽 윙어', ST: '스트라이커' };
const PXY = { GK: [50, 92], CB: [50, 79], LB: [16, 74], RB: [84, 74], LWB: [13, 61], RWB: [87, 61], DM: [50, 63], CDM: [50, 63], CM: [50, 50], AM: [50, 36], CAM: [50, 36], LM: [15, 46], RM: [85, 46], LW: [19, 26], RW: [81, 26], ST: [50, 15] };
const PSH = { GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LWB', RWB: 'RWB', DM: 'DM', CDM: 'DM', CM: 'CM', AM: 'AM', CAM: 'AM', LM: 'LM', RM: 'RM', LW: 'LW', RW: 'RW', ST: 'ST' };
const FAMK = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const fcRow = pid => { const F = G.FC27; return /^\d+$/.test(String(pid)) && F && F.P[+pid] ? F.P[+pid] : null; };
const D2000 = () => C.dayOf(2000, 1, 1);
const grpOf = role => role === 'GK' ? 'GK' : role === 'CB' || role === 'FB' ? 'DEF' : role === 'ST' || role === 'W' ? 'ATT' : 'MID';
const GRPN = { GK: '골키퍼', DEF: '수비수', MID: '미드필더', ATT: '공격수' };

// ---------- 기본 정보 카드 ----------
U.pfInfoCard = function (s, pid, e, c, P) {
  const w = s.w, F = fcRow(pid);
  const nat = e ? e[5] : P && P.nat, pos = e ? e[1] : P && P.pos;
  const cells = [];
  if (e) cells.push([`${e[3]}세`, F ? (() => { const d = C.toDate(D2000() + F[9]); return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`; })() : '나이']);
  if (F) cells.push([F[6] === 'L' ? '왼발' : '오른발', `주로 사용하는 발 · 약발 ${'★'.repeat(F[7] || 1)}`]);
  if (nat) cells.push([h('span', { class: 'pfnat' }, flag(nat, 18), ' ', C.natName(nat)), '국가']);
  if (e) { const loan = e[7] && w.clubs[e[7]], L = c && w.lg[(loan || c).lg]; const val = C.aiFee(e[2], e[3], (L || {}).nation || (c || {}).nat || 'ENG', Math.max(0, e[6]), .5); cells.push([C.fmtEUR(val), '이적 가치']); }
  if (e && c) cells.push([e[7] && w.clubs[e[7]] ? '임대 중' : `${w.year + Math.max(1, e[6])}. 6. 30.`, e[7] && w.clubs[e[7]] ? `원소속 ${w.clubs[e[7]].name}` : '계약 종료']);
  if (e) cells.push([String(e[2]), `OVR · 잠재력 ${Math.max(e[4] || e[2], e[2])}`]);
  // 포지션: FC27 대표 포지션 + 소화 가능한 포지션
  const main = F ? F[2] : pos ? (pos === 'CDM' ? 'DM' : pos === 'CAM' ? 'AM' : pos) : null;
  const others = F ? FAMK.filter((k, i) => (F[3] >> i) & 1 && k !== main) : [];
  const pitch = h('div', { class: 'pfpitch' }, U.svg('<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".8"><rect x="1" y="1" width="98" height="98" rx="3"/><line x1="1" y1="50" x2="99" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="25" y="1" width="50" height="14"/><rect x="25" y="85" width="50" height="14"/></svg>'),
    ...[main].concat(others).filter(Boolean).map((k, i) => { const xy = PXY[k] || [50, 50]; return h('span', { class: 'pfpm' + (i ? ' alt' : ''), style: { left: xy[0] + '%', top: xy[1] + '%' } }, PSH[k] || k); }));
  return h('div', { class: 'sec pfinfo' }, h('div', { class: 'pfig' }, ...cells.map(([v, l]) => h('div', null, h('b', null, v), h('small', { class: 'mute' }, l)))),
    h('div', { class: 'pfpos' }, h('div', null, h('div', { class: 'lbl' }, '포지션'), main ? h('div', null, h('small', { class: 'mute' }, '기본'), h('b', null, POSKO[main] || main)) : null, others.length ? h('div', null, h('small', { class: 'mute' }, '기타'), h('div', null, others.map(k => POSKO[k] || k).join(' · '))) : null), pitch));
};

// ---------- 이적 가치 그래프 ----------
U.pfValueChart = function (s, pid, e, c, P) {
  const w = s.w, F = fcRow(pid), hist = C.psHist(P);
  const natOfClub = cid => { const k = w.clubs[cid]; return k ? ((w.lg[k.lg] || {}).nation || k.nat) : 'ENG'; };
  const pts = [];
  if (F && e) { const age0 = Math.floor((C.dayOf(2026, 8, 1) - D2000() - F[9]) / 365.25); const c0 = hist.length ? C.cidOf(w, hist[0][1]) : c && c.id; pts.push({ x: 2026.6, v: C.aiFee(F[11], age0, natOfClub(c0), 3, .5), cid: c0 }); }
  for (const x of hist) { if (x[6] === '' || x[6] == null || x[7] === '' || x[7] == null) continue; const y = x[0] < 1000 ? x[0] + 2000 : x[0], cid = C.cidOf(w, x[1]); pts.push({ x: y + 1.4, v: C.aiFee(+x[6], +x[7], natOfClub(cid), 3, .5), cid }); }
  if (e) { const [yy, mm] = w.cal ? C.ymd(w.cal.d) : [w.year + 1, 1]; const cid = e[7] && w.clubs[e[7]] ? c.id : c ? c.id : null; pts.push({ x: yy + (mm - 1) / 12, v: C.aiFee(e[2], e[3], cid ? natOfClub(cid) : 'ENG', Math.max(1, e[6] || 1), .5), cid, now: 1 }); }
  // 같은 시점 정리
  pts.sort((a, b) => a.x - b.x); for (let i = pts.length - 1; i > 0; i--) if (pts[i].x - pts[i - 1].x < .15) pts.splice(pts[i].now ? i - 1 : i, 1);
  if (pts.length < 2) return null;
  const sm = typeof innerWidth !== 'undefined' && innerWidth < 600, W = sm ? 360 : 620, H = sm ? 190 : 200, pl = 52, pr = 14, pt = 18, pb = 26;
  const x0 = Math.floor(pts[0].x), x1 = Math.ceil(pts[pts.length - 1].x + .01), vmax = Math.max(...pts.map(p => p.v)) * 1.12 || 1;
  const X = x => pl + (x - x0) / Math.max(.5, x1 - x0) * (W - pl - pr), Y = v => pt + (1 - v / vmax) * (H - pt - pb);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = line + ` L${X(pts[pts.length - 1].x).toFixed(1)},${H - pb} L${X(pts[0].x).toFixed(1)},${H - pb} Z`;
  const ticks = []; for (let k = 0; k <= 4; k++) ticks.push(vmax / 1.12 * k / 4);
  const yrs = []; for (let y = x0; y <= x1; y++) yrs.push(y);
  const mx = pts.reduce((a, p) => p.v > a.v ? p : a, pts[0]);
  const NSs = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NSs, 'svg'); sv.setAttribute('viewBox', `0 0 ${W} ${H}`); sv.setAttribute('class', 'pfvc');
  sv.innerHTML = `<defs><linearGradient id="pfvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fa8ff" stop-opacity=".35"/><stop offset="1" stop-color="#5fa8ff" stop-opacity="0"/></linearGradient></defs>`
    + ticks.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.08)" stroke-dasharray="3 4"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#8b94a3">${v ? C.fmtEUR(v).replace('€', '') : '0'}</text>`).join('')
    + yrs.map(y => `<text x="${X(y + .5)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8b94a3">${y}</text>`).filter((_, i) => X(yrs[i] + .5) < W - pr).join('')
    + `<path d="${area}" fill="url(#pfvg)"/><path d="${line}" fill="none" stroke="#5fa8ff" stroke-width="2.2" stroke-linejoin="round"/>`;
  const wrap = h('div', { class: 'pfvw' }, sv);
  // 구단이 바뀐 지점에 엠블럼
  let last = null;
  pts.forEach((p, i) => { if (p.cid && p.cid !== last) { const el = h('span', { class: 'pfvm', style: { left: (X(p.x) / W * 100) + '%', top: (Y(p.v) / H * 100) + '%' }, title: (w.clubs[p.cid] || {}).name || '' }, crest(w.clubs[p.cid] || null, 18)); wrap.append(el); } last = p.cid; });
  const now = pts[pts.length - 1];
  return h('div', { class: 'sec' }, h('div', { class: 'pfvh' }, h('b', null, `이적 가치: ${C.fmtEUR(now.v)}`), h('span', { class: 'mute' }, ` 최고: ${C.fmtEUR(mx.v)} (${Math.floor(mx.x)})`)), wrap,
    h('div', { class: 'mute', style: { fontSize: '11px' } }, '시즌이 끝날 때의 능력치·나이·소속 리그와 지금 계약으로 계산한 추정 시장 가치입니다.'));
};

// ---------- 시즌 경기 목록 (경기 기록 저장소에서) ----------
function pMatches(s, pid, label, clubs, nat) {
  const w = s.w, K = pid + '|' + label + (label === 'live' ? '|' + (w.cal ? w.cal.d : 0) : '');
  U._pm = U._pm || new Map(); if (U._pm.has(K)) return U._pm.get(K);
  const st = label === 'live' ? U.liveSt() : (U.mxCached(label) || U.withMx(label, () => U.stay()));
  if (!st) return null;
  const out = [], cs = new Set(clubs.filter(Boolean));
  const push = (o, d) => { if (!d || !d.ln) return; const side = d.ln[0].some(x => x.id === pid) ? 0 : d.ln[1].some(x => x.id === pid) ? 1 : -1; if (side < 0) return; o.side = side; o.me = d.ln[side].find(x => x.id === pid); o.d = d; out.push(o); };
  for (const lid in st.L || {}) { const L = st.L[lid]; if (!L || !L.s) continue; const lgN = (w.lg[lid] || {}).name || '리그';
    for (const r of MD.leagueRows(w, L)) { if (!cs.has(r.a) && !cs.has(r.b)) continue; const d = MD.leagueMatch(st, L, r.i);
      push({ ck: 'L', lid, comp: lgN, stage: `${r.r + 1}라운드`, dt: r.d, a: r.a, b: r.b, ga: r.ga, gb: r.gb, pw: null, title: `${lgN} ${L.sl || label} · ${r.r + 1}라운드${r.d != null ? ' · ' + C.fmtDateY(r.d) : ''}`, ctx: { st, lg: lid, L, i: r.i, date: r.d } }, d); } }
  const grpName = (grp, k) => grp === 'CUP' ? (() => { const [n2, kd] = String(k).split(':'); return kd === 'lcup' ? ((C.LCUPNAME || {})[n2] || `${C.natName(n2)} 리그컵`) : ((C.CUPNAME || {})[n2] || `${C.natName(n2)} 컵`); })() : ((C.COMPS && C.COMPS[k] && C.COMPS[k].name) || (C.TDEF && C.TDEF[k] && C.TDEF[k].name) || k);
  for (const grp of ['CUP', 'CONT', 'INTL']) for (const k in st[grp] || {}) for (const r of st[grp][k] || []) {
    const A = grp === 'INTL' ? r[1] : C.cidOf(w, r[1]), B = grp === 'INTL' ? r[2] : C.cidOf(w, r[2]);
    if (grp === 'INTL' ? (A !== nat && B !== nat) : (!cs.has(A) && !cs.has(B))) continue;
    if (!r[6]) continue;
    const ck = grp === 'CUP' ? (String(k).split(':')[1] === 'lcup' ? 'lcup:' : 'cup:') + String(k).split(':')[0] : grp === 'CONT' ? 'cont:' + k : 'nt:' + k;
    const nm = grpName(grp, k), pw = r[7] != null ? (grp === 'INTL' ? r[7] : C.cidOf(w, r[7])) : null;
    push({ ck, comp: nm, stage: r[0], dt: r[8], a: A, b: B, ga: r[3], gb: r[4], pw, nat: grp === 'INTL', title: `${nm} · ${r[0]}${r[8] != null ? ' · ' + C.fmtDateY(r[8]) : ''}`, ctx: { st, grp, key: k, stage: r[0], date: r[8] } }, MD.decode(st, r));
  }
  out.sort((x, y) => (y.dt || 0) - (x.dt || 0));
  U._pm.set(K, out); if (U._pm.size > 30) U._pm.delete(U._pm.keys().next().value);
  return out;
}
const openM = m => U.showMatch({ title: m.title, a: m.a, b: m.b, ga: m.ga, gb: m.gb, pw: m.pw, d: m.d, nat: m.nat, key: m.title + '|' + m.a + '|' + m.b, ctx: m.ctx });

// 한 경기에서 이 선수의 세부 기록
function msOf(s, m) { const posOf = U.posLookup ? U.posLookup(s) : null; return C.MS.gen({ a: m.a, b: m.b, ga: m.ga, gb: m.gb, d: m.d, key: m.title, posOf: posOf ? id => posOf(id) : null, nc: 1 }); }
// 경기 묶음 집계 (선수 한 명)
const SUMK = ['g', 'a', 'sh', 'sot', 'shOff', 'shBlk', 'shIn', 'kp', 'bigC', 'blk', 'sav', 'dive', 'savIn', 'faced', 'conc', 'concNO', 'y', 'r', 'xg', 'npxg', 'xgot', 'xa', 'xgotF', 'pass', 'passA', 'touch', 'boxT', 'lng', 'lngA', 'crs', 'crsA', 'fin3', 'lineBr', 'tkl', 'int', 'clr', 'rec', 'gdW', 'gdL', 'adW', 'adL', 'drb', 'drbF', 'foul', 'fouled', 'disp', 'offs', 'past', 'km', 'walk', 'jog', 'run', 'spr', 'sprN', 'def', 'claim', 'punch', 'sweep'];
function aggOf(s, pid, list) {
  const A = { min: 0, apps: 0, starts: 0, top: 0, hdr: 0, cs: 0, concOn: 0, xgaOn: 0, rts: 0, shots: [], heat: [], roles: {} };
  for (const k of SUMK) A[k] = 0;
  for (const m of list) {
    const M = msOf(s, m), p = M.P.get(pid); if (!p) continue;
    A.apps++; if (p.start) A.starts++; A.min += p.min; A.rts += p.rt; A.roles[p.role] = (A.roles[p.role] || 0) + p.min;
    for (const k of SUMK) A[k] += p.st[k] || 0;
    A.top = Math.max(A.top, p.st.top || 0);
    for (const x of M.shots) if (x.p === pid) { A.shots.push(Object.assign({ mt: m }, x)); if (x.type === '헤더') A.hdr++; }
    // 뛰는 동안 실점·상대 xG
    const conc = m.d.ev.filter(e => e.s !== p.s && 'gpo'.includes(e.k) && e.m >= p.on && e.m <= p.off).length;
    A.concOn += conc; if (!conc && p.min >= 60) A.cs++;
    A.xgaOn += M.shots.filter(x => x.s !== p.s && x.m >= p.on && x.m <= p.off).reduce((t, x) => t + x.xg, 0);
    if (A.heat.length < 2400) A.heat.push(...U.heatPts(p, M));
  }
  A.role = Object.keys(A.roles).sort((a, b) => A.roles[b] - A.roles[a])[0] || 'CM';
  return A;
}
// 지표 정의: [구역, 이름, 값(합계 A), 90분당 환산 여부, 낮을수록 좋음, 형식]
const pc = (a, b) => b ? a / b * 100 : 0;
const MET = [
  ['슈팅', '득점', A => A.g, 1], ['슈팅', '예상 골 (xG)', A => A.xg, 1, 0, 2], ['슈팅', 'xG 유효 슈팅 (xGOT)', A => A.xgot, 1, 0, 2], ['슈팅', 'PK 제외한 xG', A => A.npxg, 1, 0, 2], ['슈팅', '슛', A => A.sh, 1], ['슈팅', '유효 슈팅', A => A.sot, 1], ['슈팅', '헤딩 슈팅', A => A.hdr, 1],
  ['신체 능력', '최고 속도', A => A.top, 0, 0, 'kmh'], ['신체 능력', '이동 거리', A => A.km, 1, 0, 'km'], ['신체 능력', '달리기', A => A.run, 1, 0, 'km'], ['신체 능력', '스프린트', A => A.spr, 1, 0, 'km'], ['신체 능력', '스프린트 수', A => A.sprN, 1],
  ['패스', '어시스트', A => A.a, 1], ['패스', '예상 어시스트 (xA)', A => A.xa, 1, 0, 2], ['패스', '성공한 패스', A => A.passA, 1], ['패스', '성공한 패스 %', A => pc(A.passA, A.pass), 0, 0, '%'], ['패스', '정확한 긴 패스', A => A.lngA, 1], ['패스', '정확한 긴 패스 %', A => pc(A.lngA, A.lng), 0, 0, '%'], ['패스', '라인을 뚫는 패스', A => A.lineBr, 1], ['패스', '기회 창출', A => A.kp, 1], ['패스', '큰 기회 만듦', A => A.bigC, 1], ['패스', '성공한 크로스', A => A.crsA, 1], ['패스', '성공한 크로스 %', A => pc(A.crsA, A.crs), 0, 0, '%'],
  ['점유율', '드리블 성공', A => A.drb, 1], ['점유율', '드리블 성공 %', A => pc(A.drb, A.drb + A.drbF), 0, 0, '%'], ['점유율', '볼 경합 성공', A => A.gdW + A.adW, 1], ['점유율', '볼 경합 성공 %', A => pc(A.gdW + A.adW, A.gdW + A.gdL + A.adW + A.adL), 0, 0, '%'], ['점유율', '공중 볼 경합 성공', A => A.adW, 1], ['점유율', '공중 볼 경합 성공 %', A => pc(A.adW, A.adW + A.adL), 0, 0, '%'], ['점유율', '터치', A => A.touch, 1], ['점유율', '상대편 박스 내에서의 터치', A => A.boxT, 1], ['점유율', '볼 뺏김', A => A.disp, 1, 1], ['점유율', '획득한 파울', A => A.fouled, 1],
  ['수비', '수비적 행동', A => A.def, 1], ['수비', '태클', A => A.tkl, 1], ['수비', '가로채기', A => A.int, 1], ['수비', '막힌 슛', A => A.blk, 1], ['수비', '반칙', A => A.foul, 1, 1], ['수비', '볼 회수', A => A.rec, 1], ['수비', '드리블 돌파 허용', A => A.past, 1, 1], ['수비', '걷어내기', A => A.clr, 1], ['수비', '클린 시트', A => A.cs, 0], ['수비', '출전 시 실점', A => A.concOn, 1, 1], ['수비', '출전 중 xG 실점', A => A.xgaOn, 1, 1, 2],
  ['반칙', '경고', A => A.y, 0, 1], ['반칙', '퇴장', A => A.r, 0, 1]
];
const MET_GK = [['골키핑', '선방', A => A.sav, 1], ['골키핑', '선방률', A => pc(A.sav, A.faced), 0, 0, '%'], ['골키핑', '실점', A => A.conc, 1, 1], ['골키핑', '득점 차단', A => A.xgotF - A.concNO, 1, 0, 2], ['골키핑', '다이빙 세이브', A => A.dive, 1], ['골키핑', '박스 내 세이브', A => A.savIn, 1], ['골키핑', '공중에서 잡기', A => A.claim, 1], ['골키핑', '클린 시트', A => A.cs, 0], ['패스', '정확한 긴 패스', A => A.lngA, 1], ['패스', '정확한 긴 패스 %', A => pc(A.lngA, A.lng), 0, 0, '%'], ['패스', '성공한 패스 %', A => pc(A.passA, A.pass), 0, 0, '%'], ['수비', '볼 회수', A => A.rec, 1], ['반칙', '경고', A => A.y, 0, 1]];
const val = (mt, A, p90) => { const v = mt[2](A); return p90 && mt[3] && A.min ? v * 90 / A.min : v; };
const fmtV = (mt, v) => mt[5] === 2 ? f2(v) : mt[5] === '%' ? f1(v) + '%' : mt[5] === 'km' ? f1(v) + 'km' : mt[5] === 'kmh' ? f1(v) + 'km/h' : (Math.abs(v - Math.round(v)) > 1e-6 ? f2(v) : String(Math.round(v)));
// 같은 대회(같은 시즌) 모든 선수의 집계: 순위 계산용
function peerPool(s, label, comp, st) {
  const w = s.w, K = label + '|' + comp + (label === 'live' ? '|' + (w.cal ? w.cal.d : 0) : '');
  U._peer = U._peer || new Map(); if (U._peer.has(K)) return U._peer.get(K);
  const posOf = U.posLookup ? U.posLookup(s) : null, by = new Map();
  const addM = (a, b, ga, gb, d, title) => {
    if (!d || !d.ln) return; const M = C.MS.gen({ a, b, ga, gb, d, key: title, posOf: posOf ? id => posOf(id) : null, nc: 1 });
    for (const p of M.P.values()) { if (p.id === 'ME' || String(p.id)[0] === '~') continue; let A = by.get(p.id); if (!A) { A = { min: 0, apps: 0, top: 0, hdr: 0, cs: 0, concOn: 0, xgaOn: 0, roles: {} }; for (const k of SUMK) A[k] = 0; by.set(p.id, A); }
      A.apps++; A.min += p.min; A.roles[p.role] = (A.roles[p.role] || 0) + p.min; for (const k of SUMK) A[k] += p.st[k] || 0; A.top = Math.max(A.top, p.st.top || 0);
      for (const x of M.shots) if (x.p === p.id && x.type === '헤더') A.hdr++;
      const conc = d.ev.filter(e => e.s !== p.s && 'gpo'.includes(e.k) && e.m >= p.on && e.m <= p.off).length; A.concOn += conc; if (!conc && p.min >= 60) A.cs++;
      A.xgaOn += M.shots.filter(x => x.s !== p.s && x.m >= p.on && x.m <= p.off).reduce((t, x) => t + x.xg, 0); }
  };
  if (comp.startsWith('L:')) { const lid = comp.slice(2), L = st.L[lid]; if (L) for (const r of MD.leagueRows(w, L)) addM(r.a, r.b, r.ga, r.gb, MD.leagueMatch(st, L, r.i), 'x'); }
  else { const [kind, k] = comp.split(':'); const grp = kind === 'cont' ? 'CONT' : kind === 'nt' ? 'INTL' : 'CUP', key = grp === 'CUP' ? `${k}:${kind}` : k; for (const r of (st[grp] || {})[key] || []) if (r[6]) addM(grp === 'INTL' ? r[1] : C.cidOf(w, r[1]), grp === 'INTL' ? r[2] : C.cidOf(w, r[2]), r[3], r[4], MD.decode(st, r), 'x'); }
  for (const A of by.values()) A.role = Object.keys(A.roles).sort((a, b) => A.roles[b] - A.roles[a])[0] || 'CM';
  U._peer.set(K, by); if (U._peer.size > 6) U._peer.delete(U._peer.keys().next().value);
  return by;
}
function pctl(pool, mt, A, p90, grp, pid) {
  if (!pool) return null;
  const maxMin = Math.max(...[...pool.values()].map(x => x.min)), need = Math.max(180, maxMin * .25);
  const vs = []; for (const [id, B] of pool) { if (id === pid || B.min < need || grpOf(B.role) !== grp) continue; vs.push(val(mt, B, p90 || mt[3])); }
  if (vs.length < 5) return null;
  const me = val(mt, A, p90 || mt[3]); let lo = 0, eq = 0; for (const v of vs) { if (v < me - 1e-9) lo++; else if (Math.abs(v - me) <= 1e-9) eq++; }
  let p = (lo + eq / 2) / vs.length; if (mt[4]) p = 1 - p; return p;
}

// ---------- 시즌 데이터 블록 ----------
U.pfSeason = function (s, pid, e, c, P, seasons) {
  const w = s.w, v = PST(); if (v.pid !== pid) { v.pid = pid; v.sl = null; v.comp = 'all'; v.pg = 0; v.p90 = 0; v.shf = null; v.shot = null; v.team = 'all'; }
  const nat = e ? e[5] : P && P.nat;
  const usable = seasons.filter(sn => sn.live || (w.mxKeys || []).includes(sn.wl)).slice().reverse();
  if (!usable.length) return { main: [], side: [] };
  const sn = usable.find(x => (x.live ? 'live' : x.wl) === v.sl) || usable[0]; const label = sn.live ? 'live' : sn.wl; v.sl = label;
  const clubs = [...new Set(sn.items.map(it => it.club).filter(Boolean).concat(sn.live && c ? [c.id] : []))];
  const all = pMatches(s, pid, label, clubs, nat);
  const comps = []; for (const it of sn.items) { const k = it.key === 'L' ? 'L:' + (it.lid || (it.club && w.clubs[it.club] && w.clubs[it.club].lg) || '') : it.key; if (!comps.some(x => x[0] === k)) comps.push([k, it.name, it]); }
  if (all) for (const m of all) { const k = m.ck === 'L' ? 'L:' + m.lid : m.ck; if (!comps.some(x => x[0] === k)) comps.push([k, m.comp, null]); }
  if (!comps.some(x => x[0] === v.comp) && v.comp !== 'all') v.comp = 'all';
  const keyOfM = m => m.ck === 'L' ? 'L:' + m.lid : m.ck;
  const list = all ? all.filter(m => v.comp === 'all' || keyOfM(m) === v.comp) : null;
  const sel = (cur, opts, on) => { const el = h('select', { class: 'wsel', onchange: ev => on(ev.target.value) }, ...opts.map(([k, l]) => { const o = h('option', { value: k }, l); if (k === cur) o.selected = true; return o; })); return el; };
  const head = h('div', { class: 'pfsh' }, sel(label, usable.map(x => [x.live ? 'live' : x.wl, x.live ? x.label : x.label || x.wl]), x => { v.sl = x; v.comp = 'all'; v.pg = 0; v.shot = null; U.stay(); }),
    sel(v.comp, [['all', '모든 대회']].concat(comps.map(x => [x[0], x[1]])), x => { v.comp = x; v.pg = 0; v.shot = null; U.stay(); }));
  const main = [], side = [];
  if (!list) { main.push(h('div', { class: 'sec' }, head, h('div', { class: 'empty' }, '경기 기록 불러오는 중…'))); return { main, side }; }
  const A = aggOf(s, pid, list);
  // 요약 카드
  const yc = list.reduce((t, m) => t + m.d.ev.filter(x => x.p === pid && x.k === 'y').length, 0), rc = list.reduce((t, m) => t + m.d.ev.filter(x => x.p === pid && (x.k === 'r' || x.k === '2')).length, 0);
  const compName = v.comp === 'all' ? '모든 대회' : (comps.find(x => x[0] === v.comp) || [0, ''])[1];
  main.push(h('div', { class: 'sec pfsum' }, head, h('div', { class: 'pfsumt' }, h('b', null, `${compName} ${sn.live ? sn.label.replace(' 진행 중', '') : sn.label || sn.wl}`), sn.live ? h('span', { class: 'chip good' }, '진행 중') : null),
    h('div', { class: 'pfsg' }, ...[[A.g, '득점'], [A.a, '어시스트'], [A.starts, '선발'], [A.apps, '경기'], [A.min.toLocaleString(), '출전 시간'], [A.apps ? U.rt2(A.rts / A.apps) : '-', '평점'], [h('span', null, h('i', { class: 'cdy' }), ' ' + yc), '경고'], [h('span', null, h('i', { class: 'cdr' }), ' ' + rc), '퇴장']].map(([x, l]) => h('div', null, h('b', null, x), h('small', { class: 'mute' }, l))))));
  // 경기 통계 표
  const teamOpts = [['all', '모든 팀']].concat([...new Set(list.map(m => m.nat ? 'nat' : m.side ? m.b : m.a))].map(id => [id, id === 'nat' ? C.natName(nat) + ' 대표팀' : (w.clubs[id] || {}).name || id]));
  if (!teamOpts.some(x => x[0] === v.team)) v.team = 'all';
  const tl = list.filter(m => v.team === 'all' || (v.team === 'nat' ? m.nat : (m.side ? m.b : m.a) === v.team));
  const per = 10, pages = Math.max(1, Math.ceil(tl.length / per)); v.pg = Math.min(v.pg, pages - 1);
  const rowsM = tl.slice(v.pg * per, v.pg * per + per).map(m => {
    const opp = m.side ? m.a : m.b, gf = m.side ? m.gb : m.ga, ga = m.side ? m.ga : m.gb, res = gf > ga ? 'W' : gf < ga ? 'L' : m.pw ? (m.pw === (m.side ? m.b : m.a) ? 'W' : 'L') : 'D';
    const me = m.me, mn = me.start ? (me.off - me.on) : (me.off - me.on), ev = m.d.ev;
    const g = ev.filter(x => x.p === pid && (x.k === 'g' || x.k === 'p')).length, as = ev.filter(x => x.a === pid).length, y = ev.filter(x => x.p === pid && x.k === 'y').length, r = ev.filter(x => x.p === pid && (x.k === 'r' || x.k === '2')).length;
    const ps = (() => { const M = msOf(s, m), p = M.P.get(pid); return p ? (me.start ? PSH[p.pos] || p.pos : '교체') : ''; })();
    return h('tr', { class: 'click', onclick: () => openM(m) }, h('td', { class: 'mute' }, m.dt != null ? (() => { const [, mm, dd] = C.ymd(m.dt); return `${mm}월 ${dd}일`; })() : ''),
      h('td', { class: 'l' }, h('span', { class: 'pfop' }, m.nat ? U.natCrest(opp, 16) : crest(w.clubs[opp] || null, 16), h('span', null, m.nat ? C.natName(opp) : (w.clubs[opp] || {}).name || opp)), h('small', { class: 'mute pfcomp' }, m.comp)),
      h('td', null, h('span', { class: 'res ' + res, style: { padding: '1px 6px', borderRadius: '5px', whiteSpace: 'nowrap' } }, `${gf} - ${ga}${m.pw ? ' PK' : ''}`)), h('td', null, mn + "'"), h('td', { class: 'mute' }, ps), h('td', null, g || 0), h('td', null, as || 0), h('td', null, y || 0), h('td', null, r || 0), h('td', null, U.rt1(me.rt)));
  });
  main.push(h('div', { class: 'sec' }, h('div', { class: 'pfmh' }, h('h3', null, '경기 통계'), sel(v.team, teamOpts, x => { v.team = x; v.pg = 0; U.stay(); })),
    tl.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable pfmt' }, h('thead', null, h('tr', null, ...['날짜', '상대', '결과', '출전', '포지션', '골', '도움', '경고', '퇴장', '평점'].map((x, i) => h('th', { class: i === 1 ? 'l' : '' }, x)))), h('tbody', null, ...rowsM))) : h('div', { class: 'empty' }, '출전한 경기가 없습니다.'),
    pages > 1 ? h('div', { class: 'pfpg' }, h('button', { class: 'btn ghost sm', disabled: v.pg <= 0 ? true : null, onclick: () => { v.pg--; U.stay(); } }, '‹ 이전'), h('span', { class: 'mute' }, `${v.pg + 1} / ${pages}`), h('button', { class: 'btn ghost sm', disabled: v.pg >= pages - 1 ? true : null, onclick: () => { v.pg++; U.stay(); } }, '다음 ›')) : null));
  if (!A.apps) return { main, side };
  // 히트맵 + 슈팅 맵
  const hm = U.heatBox(A.heat);
  const SH = A.shots;
  const FL = [['goal', '득점', x => x.res === '골'], ['open', '일반 플레이', x => x.sit === '일반 플레이' || x.sit === '역습'], ['corner', '코너킥', x => x.sit === '코너킥'], ['set', '세트 피스', x => x.sit === '세트피스'], ['pen', '페널티킥', x => x.sit === '페널티킥'], ['head', '헤더', x => x.type === '헤더'], ['left', '왼발', x => x.type === '왼발'], ['right', '오른발', x => x.type === '오른발'], ['in', '박스 내 슛', x => x.inBox], ['out', '박스 밖 슛', x => !x.inBox]];
  const fdef = FL.find(f => f[0] === v.shf); const shown = fdef ? SH.filter(fdef[2]) : SH;
  const cur = v.shot != null && shown[v.shot] ? shown[v.shot] : shown.find(x => x.res === '골') || shown[0] || null;
  const NSs = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NSs, 'svg'); sv.setAttribute('viewBox', '-1 -1 70 46'); sv.setAttribute('class', 'pfshm');
  const Ls = 'stroke="rgba(255,255,255,.25)" stroke-width=".35" fill="none"';
  sv.innerHTML = `<rect x="0" y="0" width="68" height="44" ${Ls}/><rect x="13.84" y="0" width="40.32" height="16.5" ${Ls}/><rect x="24.84" y="0" width="18.32" height="5.5" ${Ls}/><rect x="30.34" y="-1" width="7.32" height="1" ${Ls}/><circle cx="34" cy="11" r=".4" fill="rgba(255,255,255,.3)"/><path d="M26.7 16.5 A9.15 9.15 0 0 0 41.3 16.5" ${Ls}/>`;
  shown.forEach((x, i) => { const cE = document.createElementNS(NSs, 'circle'); const gl = x.res === '골', on = x.res === '선방'; cE.setAttribute('cx', 34 + x.dy); cE.setAttribute('cy', Math.min(43, x.dx)); cE.setAttribute('r', 1 + Math.sqrt(x.xg) * 2.6); cE.setAttribute('fill', gl ? '#2fbf71' : on ? 'rgba(95,168,255,.45)' : 'transparent'); cE.setAttribute('stroke', gl ? '#fff' : x === cur ? '#fff' : '#5fa8ff'); cE.setAttribute('stroke-width', x === cur ? '.7' : '.35'); cE.setAttribute('class', 'shd'); cE.addEventListener('click', () => { v.shot = i; U.stay(); }); sv.append(cE); });
  const det = cur ? (() => { const mt = cur.mt, opp = mt.side ? mt.a : mt.b, gf = mt.side ? mt.gb : mt.ga, ga = mt.side ? mt.ga : mt.gb, dt = mt.dt != null ? (() => { const [, mm, dd] = C.ymd(mt.dt); return `${mm}월 ${dd}일`; })() : '';
    return h('div', { class: 'shdet' }, h('div', { class: 'shh' }, h('span', { class: 'mm' }, `${cur.m}'`), mt.nat ? U.natCrest(opp, 16) : crest(w.clubs[opp] || null, 16), h('span', null, `${mt.nat ? C.natName(opp) : (w.clubs[opp] || {}).name || opp}전 ${gf}-${ga}`), h('small', { class: 'mute' }, `${dt} · ${mt.comp}`)),
      h('div', { class: 'shg' }, ...[['슛 유형', cur.type], ['상황', cur.sit], ['결과', cur.res === '선방' ? '유효 슈팅' : cur.res], ['xG', f2(cur.xg)], ['xGOT', cur.xgot != null && (cur.res === '골' || cur.res === '선방') ? f2(cur.xgot) : '-']].map(([k, x]) => h('div', null, h('small', { class: 'mute' }, k), h('b', null, x))))); })() : null;
  const xgS = shown.reduce((t, x) => t + x.xg, 0);
  main.push(h('div', { class: 'sec' }, h('div', { class: 'pfmh' }, h('h3', null, `${compName} 히트맵${SH.length ? ' · 슈팅 맵' : ''}`)),
    h('div', { class: 'pfhs' + (SH.length ? '' : ' one') }, h('div', null, h('div', { class: 'lbl' }, `히트맵 · 터치 ${A.touch}`), hm),
      !SH.length ? null : h('div', null, h('div', { class: 'lbl' }, `시즌 슛 맵 · 유효 ${SH.length ? Math.round(SH.filter(x => x.res === '골' || x.res === '선방').length / SH.length * 100) : 0}%`), h('div', { class: 'pfshw' }, sv),
        h('div', { class: 'pfshs' }, h('div', null, h('b', null, shown.length), h('small', { class: 'mute' }, '슛')), h('div', null, h('b', null, shown.filter(x => x.res === '골').length), h('small', { class: 'mute' }, '득점')), h('div', null, h('b', null, f2(xgS)), h('small', { class: 'mute' }, 'xG'))))),
    SH.length ? h('div', { class: 'lbl', style: { marginTop: '8px' } }, '필터') : null, h('div', { class: 'pfchips' }, ...FL.map(([k, l, f]) => { const n = SH.filter(f).length; return n ? h('button', { class: 'chip' + (v.shf === k ? ' gold' : ''), onclick: () => { v.shf = v.shf === k ? null : k; v.shot = null; U.stay(); } }, `${l} ${n}`) : null; })),
    det, cur ? h('button', { class: 'btn ghost sm', style: { marginTop: '6px' }, onclick: () => openM(cur.mt) }, '이 경기 상세 보기') : null));
  // 시즌 성적 (순위)
  const grp = grpOf(A.role);
  const lgComp = v.comp !== 'all' ? v.comp : (comps.find(x => x[0].startsWith('L:')) || [null])[0];
  const st = label === 'live' ? U.liveSt() : U.mxCached(label);
  const pool = lgComp && st ? peerPool(s, label, lgComp, st) : null;
  const mets = grp === 'GK' ? MET_GK : MET;
  const secs = []; for (const mt of mets) { let sec = secs.find(x => x.n === mt[0]); if (!sec) secs.push(sec = { n: mt[0], rows: [] }); sec.rows.push(mt); }
  const bar = p => p == null ? h('span', { class: 'pfbar' }) : h('span', { class: 'pfbar' }, h('i', { style: { width: Math.max(3, p * 100) + '%', background: p >= .66 ? 'var(--good)' : p >= .33 ? 'var(--warn)' : 'var(--bad)' } }));
  const lgN = lgComp ? (comps.find(x => x[0] === lgComp) || [0, ''])[1] : '';
  main.push(h('div', { class: 'sec' }, h('div', { class: 'pfmh' }, h('div', null, h('h3', { style: { margin: 0 } }, '시즌 성적'), h('small', { class: 'mute' }, `출전 시간: ${A.min.toLocaleString()}`)),
    h('div', { class: 'seg', style: { width: '170px' } }, h('button', { class: !v.p90 ? 'on' : '', onclick: () => { v.p90 = 0; U.stay(); } }, '합계'), h('button', { class: v.p90 ? 'on' : '', onclick: () => { v.p90 = 1; U.stay(); } }, '90분당'))),
    ...secs.map(sc => h('div', { class: 'pfss' }, h('div', { class: 'pfssh' }, h('b', null, sc.n), sc === secs[0] ? h('small', { class: 'mute' }, pool ? `순위: ${lgN} ${GRPN[grp]} 기준` : '순위') : null),
      ...sc.rows.map(mt => { const vv = val(mt, A, v.p90); return h('div', { class: 'pfsr' }, h('span', null, mt[1]), h('b', null, fmtV(mt, vv)), bar(pctl(pool, mt, A, v.p90, grp, pid))); }))),
    h('div', { class: 'mute', style: { fontSize: '11px' } }, '막대는 같은 대회·같은 포지션 그룹(출전 시간 25% 이상) 선수 중 순위입니다. 초록 상위 1/3 · 주황 중간 · 빨강 하위 1/3. 낮을수록 좋은 지표(볼 뺏김·반칙·실점 등)는 거꾸로 계산합니다.')));
  // 선수 특성 레이더 (오른쪽)
  const AX = grp === 'GK' ? [['선방', MET_GK[0]], ['선방률', MET_GK[1]], ['득점 차단', MET_GK[3]], ['공중에서 잡기', MET_GK[6]], ['긴 패스', MET_GK[8]], ['볼 회수', MET_GK[11]]]
    : [['터치', MET.find(m => m[1] === '터치')], ['기회 창출', MET.find(m => m[1] === '기회 창출')], ['공중 볼 경합 성공', MET.find(m => m[1] === '공중 볼 경합 성공')], ['수비적 행동', MET.find(m => m[1] === '수비적 행동')], ['득점', MET.find(m => m[1] === '득점')], ['슛 시도', MET.find(m => m[1] === '슛')]];
  if (pool) {
    const ps = AX.map(([l, mt]) => [l, pctl(pool, mt, A, 1, grp, pid)]);
    if (ps.every(x => x[1] != null)) {
      const R = 70, cx = 110, cy = 92, ang = i => -Math.PI / 2 + i * Math.PI * 2 / 6, pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
      const poly = r => [0, 1, 2, 3, 4, 5].map(i => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
      const shape = ps.map((x, i) => pt(i, Math.max(.06, x[1]) * R).map(n => n.toFixed(1)).join(',')).join(' ');
      const sv2 = U.svg(`<svg viewBox="-46 0 312 190" class="pfrad"><polygon points="${poly(R)}" fill="none" stroke="rgba(255,255,255,.14)"/><polygon points="${poly(R * .66)}" fill="none" stroke="rgba(255,255,255,.08)"/><polygon points="${poly(R * .33)}" fill="none" stroke="rgba(255,255,255,.08)"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="rgba(255,255,255,.08)"/>`).join('')}<polygon points="${shape}" fill="rgba(95,168,255,.45)" stroke="#5fa8ff" stroke-width="1.5"/>${ps.map((x, i) => { const [tx, ty] = pt(i, R + 16); return `<text x="${tx}" y="${ty}" text-anchor="${Math.abs(tx - cx) < 5 ? 'middle' : tx > cx ? 'start' : 'end'}" font-size="8.5" fill="#c9d1dc">${x[0]} <tspan font-weight="700" fill="#fff">${Math.round(x[1] * 100)}%</tspan></text>`; }).join('')}</svg>`);
      side.push(h('div', { class: 'sec' }, h('h3', null, '선수 특성'), h('div', { class: 'mute', style: { fontSize: '11.5px', padding: '0 18px' } }, `같은 대회 ${GRPN[grp]}와 비교한 90분당 순위 (${lgN})`), h('div', { class: 'in' }, sv2)));
    }
  }
  return { main, side, A, sn, compName };
};

// ---------- 경력 (오른쪽) ----------
U.pfCareer = function (s, pid, P, path, seasons) {
  const w = s.w, v = PST(); v.ct = v.ct || 'club';
  const yy = x => (x < 1000 ? x + 2000 : x);
  const tot = (cid, y0, y1) => { let a = 0, g = 0; for (const sn of seasons) { const y = sn.live ? w.year - 2000 : sn.y; if (y < y0 || (y1 != null && y > y1)) continue; for (const it of sn.items) if (it.club === cid && it.cat !== 'nt') { a += it.apps; g += it.g; } } return [a, g]; };
  const sl = y => `${yy(y)}/${String(yy(y) + 1).slice(2)}`;
  const rows = path.map((x, i) => {
    const pv = path[i - 1], nx = path[i + 1], pp = path[i - 2];
    const ws = pv && pv.y1 === x.y0, we = nx && x.y1 != null && nx.y0 === x.y1;
    const a0 = sl(x.y0) + (ws ? ' 겨울' : ''), a1 = x.y1 == null ? '지금' : sl(x.y1) + (we ? ' 겨울' : '');
    const back = pv && pv.loan && !x.loan ? (pp && pp.cid === x.cid ? '임대 복귀' : '복귀 후 이적') : null;
    const tag = x.loan ? (ws ? '겨울 임대' : '임대') : ws ? (back || '겨울 이적') : back;
    const [a, g] = tot(x.cid, x.y0, x.y1);
    return h('div', { class: 'pfcr' + (x.loan ? ' loan' : '') }, crest(w.clubs[x.cid] || null, 22), h('div', null, h('b', { class: 'lnk', onclick: () => U.openClub(x.cid) }, (w.clubs[x.cid] || {}).name || x.cid), tag ? h('span', { class: 'segtag' + (/임대/.test(tag) ? ' loan' : '') }, tag) : null, h('small', { class: 'mute' }, a0 === a1 ? a0 : `${a0} – ${a1}`)), h('span', null, a), h('span', null, g)); }).reverse();
  // 국가대표
  const ntA = seasons.reduce((t, sn) => t + sn.items.filter(it => it.cat === 'nt').reduce((q, it) => q + it.apps, 0), 0), ntG = seasons.reduce((t, sn) => t + sn.items.filter(it => it.cat === 'nt').reduce((q, it) => q + it.g, 0), 0);
  const nat = P && P.nat;
  const sRows = seasons.slice().reverse().filter(sn => sn.items.some(it => it.cat !== 'nt')).map(sn => { const cl = [...new Set(sn.items.filter(it => it.club && it.cat !== 'nt').map(it => it.club))]; const a = sn.items.filter(it => it.cat !== 'nt').reduce((t, it) => t + it.apps, 0), g = sn.items.filter(it => it.cat !== 'nt').reduce((t, it) => t + it.g, 0);
    return h('div', { class: 'pfcr' }, h('span', { class: 'pfcrs' }, ...cl.map(id => crest(w.clubs[id] || null, 18))), h('div', null, h('b', null, cl.map(id => (w.clubs[id] || {}).short || '').join(' → ')), h('small', { class: 'mute' }, sn.label || sn.wl)), h('span', null, a), h('span', null, g)); });
  return h('div', { class: 'sec pfcar' }, h('h3', null, '경력'), h('div', { class: 'in' }, h('div', { class: 'mtabs pft' }, h('button', { class: v.ct === 'club' ? 'on' : '', onclick: () => { v.ct = 'club'; U.stay(); } }, '클럽'), h('button', { class: v.ct === 'season' ? 'on' : '', onclick: () => { v.ct = 'season'; U.stay(); } }, '시즌')),
    h('div', { class: 'pfcrh mute' }, h('span', null, v.ct === 'club' ? '1군 경력' : '시즌별 (클럽 경기)'), h('span', null, '경기'), h('span', null, '득점')),
    ...(v.ct === 'club' ? rows : sRows),
    v.ct === 'club' && nat && ntA ? [h('div', { class: 'pfcrh mute' }, h('span', null, '국가대표 팀'), h('span'), h('span')), h('div', { class: 'pfcr' }, U.natCrest(nat, 22), h('div', null, h('b', { class: 'lnk', onclick: () => U.openNat(nat) }, C.natName(nat)), h('small', { class: 'mute' }, '국제 대회 본선·A매치')), h('span', null, ntA), h('span', null, ntG))] : null));
};

// ---------- 트로피 (오른쪽) ----------
U.pfTrophies = function (s, pid, P, seasons) {
  const w = s.w, by = new Map(), add = (key, crestEl, title, sub, name, sl) => { let g = by.get(key); if (!g) by.set(key, g = { crestEl, title, sub, list: new Map() }); const t = g.list.get(name) || { n: name, ys: [] }; t.ys.push(sl); g.list.set(name, t); };
  for (const sn of seasons) { if (sn.live) continue; const A = w.arch && w.arch[sn.wl]; if (!A) continue;
    for (const it of sn.items) { if (!it.apps) continue;
      if (it.cat === 'league' && it.lid && A.lg[it.lid] && A.lg[it.lid].t && A.lg[it.lid].t[0] && A.lg[it.lid].t[0][0] === it.club) add(it.club, crest(w.clubs[it.club] || null, 22), (w.clubs[it.club] || {}).name, C.natName((w.lg[it.lid] || {}).nation), A.lg[it.lid].n, A.lg[it.lid].sl || sn.wl);
      if (it.cat === 'cup') { const [kd, n2] = it.key.split(':'); const X = (kd === 'lcup' ? A.lcup : A.cup)[n2]; if (X && X.w === it.club) add(it.club, crest(w.clubs[it.club] || null, 22), (w.clubs[it.club] || {}).name, C.natName(n2), X.n, X.sl || sn.wl); }
      if (it.cat === 'cont') { const k = it.key.split(':')[1], X = A.cont[k]; if (X && X.w === it.club) add(it.club, crest(w.clubs[it.club] || null, 22), (w.clubs[it.club] || {}).name, '', X.n, X.sl || sn.wl); }
      if (it.cat === 'nt' && P && P.nat) { const k = it.key.split(':')[1], H = (w.hist.nt || {})[k] || [], yv = sn.y + 2000, hit = H.find(x => x.c === P.nat && Math.abs(parseInt(x.y, 10) - yv) <= 1); if (hit) add('nat', U.natCrest(P.nat, 22), C.natName(P.nat), '국가대표', (C.TDEF && C.TDEF[k] && C.TDEF[k].name) || it.name, String(hit.y)); }
    } }
  if (!by.size) return null;
  return h('div', { class: 'sec' }, h('h3', null, '트로피'), h('div', { class: 'in pftr' }, ...[...by.values()].map(g => h('div', { class: 'pftg' }, h('div', { class: 'pftgh' }, g.crestEl, h('div', null, h('b', null, g.title), g.sub ? h('small', { class: 'mute' }, g.sub) : null)),
    ...[...g.list.values()].map(t => h('div', { class: 'pftr1' }, h('b', null, [...new Set(t.ys)].length), U.trophy ? U.trophy('cup', 14, '#f2c14e') : '🏆', h('span', null, t.n), h('small', { class: 'mute' }, `(${[...new Set(t.ys)].join(', ')})`)))))));
};

// ---------- 소개 ----------
U.pfAbout = function (s, pid, e, c, P, blk) {
  const w = s.w, F = fcRow(pid), name = e ? C.pName(w, e) : P ? P.n : '';
  const pos = e ? e[1] : P && P.pos, nat = e ? e[5] : P && P.nat;
  const lines = [];
  lines.push(`${name}은(는) ${e ? e[3] + '세의 ' : ''}${C.natName(nat)} 국적 ${POSKO[pos] || pos || '선수'}${c ? `로, ${c.name}에서 뛰고 있다` : P && P.ret ? `였고 ${P.ret}년에 은퇴했다` : '이며 현재 무소속이다'}.${F ? ` 주로 ${F[6] === 'L' ? '왼발' : '오른발'}을 쓴다.` : ''}`);
  if (blk && blk.A && blk.A.apps) { const A = blk.A; lines.push(`${blk.sn.live ? '이번' : blk.sn.label} 시즌 ${blk.compName}에서 ${A.apps}경기 ${A.min.toLocaleString()}분 동안 ${A.g}골 ${A.a}도움, 평균 평점 ${(A.rts / A.apps).toFixed(2)}${A.y ? `, 경고 ${A.y}회` : ''}를 기록했다.`); }
  return h('div', { class: 'sec pfab' }, h('h3', null, '소개'), h('div', { class: 'in' }, ...lines.map(t => h('p', null, t))));
};
})(typeof window !== 'undefined' ? window : globalThis);
