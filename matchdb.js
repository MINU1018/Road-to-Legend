// Road to Legend — 경기 기록 엔진: AI 경기의 출전 명단·득점·도움·카드·평점을 경기 단위로 만들고 시즌 기록을 그 합으로 낸다
// 원칙: 선수 시즌 기록(골·도움·출전·평점)과 득점 순위는 반드시 경기 기록을 더한 값과 같다.
(function (G) {
'use strict';
const C = G.TC;
const { R, N, clamp, poisson } = C;
const MD = C.MD = {};

// ---------- 시즌 저장소 ----------
// P: 선수 사전 (인덱스 → 선수 id). 경기 기록은 인덱스로 선수를 가리킨다.
// id 형식: 숫자 = FC27 선수, '이름#xxx' = 생성 선수, '~구단~이름' = 명단 없는 하부 구단의 가상 선수, 'ME' = 내 선수
MD.newStore = (label, y) => ({ v: 1, label, y, P: [], L: {}, CUP: {}, CONT: {}, INTL: {} });
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const b62 = n => { let s = ''; do { s = B62[n % 62] + s; n = Math.floor(n / 62); } while (n > 0); return s; };
const u62 = s => { let n = 0; for (const ch of s) n = n * 62 + B62.indexOf(ch); return n; };
MD.b62 = b62; MD.u62 = u62;
const pix = (st, id) => { if (!(st._pm instanceof Map)) { st._pm = new Map(); st.P.forEach((x, i) => st._pm.set(x, i)); Object.defineProperty(st, '_pm', { enumerable: false, writable: true, value: st._pm }); } let i = st._pm.get(id); if (i == null) { i = st.P.length; st.P.push(id); st._pm.set(id, i); } return i; };
MD.nameOf = (id, S) => {
  id = String(id);
  if (id === 'ME') return S && S.p ? S.p.name : '나';
  if (id[0] === '~') return id.slice(id.lastIndexOf('~') + 1);
  if (/^\d+$/.test(id)) { const p = G.FC27 && G.FC27.P[+id]; return p ? p[1] : id; }
  return id.split('#')[0];
};

// ---------- 명단 ----------
const GRP = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', LWB: 'D', RWB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LM: 'A', RM: 'A', LW: 'A', RW: 'A', ST: 'A' };
const NEED = { G: 1, D: 4, M: 3, A: 3 };
// 득점·도움·카드 가중치 (역할별)
const GW = { ST: 1, W: .5, AM: .42, CM: .17, DM: .07, FB: .06, CB: .1, GK: 0 };
const AW = { ST: .42, W: .7, AM: .8, CM: .45, DM: .2, FB: .34, CB: .07, GK: .006 };
// 골키퍼는 득점 가중치 0 (예전에는 0이 '없음'으로 처리돼 기본값 .05가 붙던 버그가 있었다)
const gw = pos => { const r = C.ROLE[pos]; return r in GW ? GW[r] : .05; };
const aw = pos => { const r = C.ROLE[pos]; return r in AW ? AW[r] : .1; };
// 평점 포지션 보정: 공격수만 평점이 높게 나오지 않도록 (수비·미드필더는 골 대신 수비 기여)
const ROLEB = { GK: .06, CB: .12, FB: .1, DM: .16, CM: .11, AM: .03, W: -.02, ST: -.07 };
const CW = { CB: 1.4, DM: 1.5, FB: 1.2, CM: 1.1, AM: .8, W: .75, ST: .85, GK: .3 };
// side: { key, sq: [{ id, n, pos, ovr }] }
MD.clubSide = (w, cid, y) => {
  const c = w.clubs[cid]; if (!c) return { key: cid, sq: [] };
  const sq = C.squadOf(w, c, y).map(x => ({ id: x.id ? String(x.id) : '~' + cid + '~' + x.n, n: x.n, pos: x.pos, ovr: x.ovr, age: x.age, yb: x.yb || 0 }));
  // 부상자는 명단에서 뺀다 (남은 인원이 너무 적으면 그대로)
  if (!c.lite && c.sq && c.sq.some(e => e[14])) { const inj = new Set(c.sq.filter(e => e[14]).map(e => String(e[0]))), ok = sq.filter(x => !inj.has(x.id)); if (ok.length >= 13) return { key: cid, sq: ok }; }
  return { key: cid, sq };
};
// 콜업 후보: 2군 구단 선수(부상 제외, OVR 순) → 아카데미 유망주 (구단마다 해마다 6명, 저장)
MD.callUps = (w, cid, d) => {
  const c = w.clubs[cid]; if (!c || c.lite || c.parent) return [];
  if (!w._bt || w._bt.n !== Object.keys(w.clubs).length) { const m = {}; for (const id in w.clubs) { const x = w.clubs[id]; if (x.parent) (m[x.parent] = m[x.parent] || []).push(id); } w._bt = { n: Object.keys(w.clubs).length, m }; }
  const out = [];
  for (const bid of w._bt.m[cid] || []) { const b = w.clubs[bid]; if (!b || !b.sq) continue; for (const e of b.sq) if (!e[14] && !e[7]) out.push({ id: String(e[0]), n: C.pName(w, e), pos: e[1], ovr: e[2], age: e[3], yb: 0 }); }
  out.sort((a, b) => b.ovr - a.ovr);
  if (!c.acad || c.acad.y !== w.year) { const r = C.seeded('acad|' + cid + '|' + w.year), POS = ['GK', 'CB', 'CM', 'ST', 'RB', 'LW']; const nat = c.nat; c.acad = { y: w.year, p: POS.map((pos, i) => [C.genName(nat), pos, Math.round(clamp((c.str || 60) - 16 + (r() - .5) * 8, 40, 80)), 17 + Math.floor(r() * 2)]) }; }
  for (const [n, pos, ovr, age] of c.acad.p) out.push({ id: '~' + cid + '~' + n, n, pos, ovr, age, yb: 0 });
  return out;
};
MD.natSide = (w, nat, pools, y) => {
  const pl = pools && pools[nat];
  let sq = pl ? pl.all.slice().sort((a, b) => b[2] - a[2]).slice(0, 26).map(e => ({ id: String(e[0]), n: C.pName(w, e), pos: e[1], ovr: e[2] })) : [];
  if (sq.length < 16) { // 명단 데이터가 적은 나라: 그 나라 이름의 가상 선수로 채움 (시드 고정, 실력은 FIFA 랭킹 기준)
    const rk = C.rankOf ? C.rankOf(w, nat) : null, st = rk ? clamp(Math.round(80 - Math.log(rk.rank) * 5.2), 50, 76) : 58;
    const fake = C.squadOf(w, { id: 'NT_' + nat, nat, str: st, lite: true }, y).map(x => ({ id: '~NT_' + nat + '~' + x.n, n: x.n, pos: x.pos, ovr: Math.round(x.ovr), age: x.age, fake: 1 }));
    sq = sq.concat(fake.slice(0, 18 - sq.length));
  }
  return { key: nat, sq };
};
// ---------- 흐름 (v43, 숨은 값) ----------
// 선수: w.mo[id] = [e(최근 활약 − 기대, 지수 평균), m(능력치 보정)] — 기대 이상 활약이 이어지면 서서히 오르고, 부진이 이어지면 서서히 내려간다
// 구단: c.moE(최근 승점 − 기대 승점), c.mo(전력 보정). 기대치는 전력 차이로 정하므로 강팀의 무패보다 약팀의 무패가 더 크게 오른다
const MOCAP = 4.2, CMOCAP = 2.4;
MD.moOf = (w, id) => { const v = w && w.mo && w.mo[id]; return v ? v[1] : 0; };
MD.moStep = (v, perf, f, cap, sc) => { // v = [e, m] (바뀐 값을 돌려준다). 목표치 = cap·tanh(e/sc): 처음엔 빠르게, 높아질수록 더디게 (비선형)
  const e = v[0] + (perf - v[0]) * .22 * f, T = cap * Math.tanh(e / (sc || .42));
  return [Math.round(e * 1000) / 1000, Math.round((v[1] + (T - v[1]) * .22 * f) * 100) / 100];
};
// 감독이 시즌 동안 선수를 보는 시각 (구단·선수·시즌마다 고정, 평균 0 · 표준편차 약 0.9)
const PREF = new Map();
MD.prefOf = (cid, id, y) => { const k = cid + '|' + id + '|' + y; let v = PREF.get(k); if (v == null) { const r = C.seeded('pf|' + k), u = r() || 1e-9, z = r(); v = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * z) * .9; if (PREF.size > 60000) PREF.clear(); PREF.set(k, v); } return v; };
// 구단의 최근 주전 명단 (리그·대륙 대회 기준): w.lxi[구단] = 'id,id,…'
// 'id,…|id,…' = 직전 · 그 전 경기 선발. 값: 직전 선발 1, 그 전에만 선발 .6 (한 경기 쉬어도 주전은 주전)
MD.prevXI = (w, cid) => { const s = w && w.lxi && w.lxi[cid]; if (!s) return null; if (!MD._pxc || MD._pxc.w !== w) MD._pxc = { w, m: new Map() }; let c = MD._pxc.m.get(cid);
  if (!c || c.s !== s) { const [a, b] = s.split('|'), m = new Map(); if (b) for (const id of b.split(',')) m.set(id, .6); for (const id of a.split(',')) m.set(id, 1); c = { s, m }; MD._pxc.m.set(cid, c); } return c.m; };
// 2팀 포아송 결과 확률 → [기대 승점(홈), 기대 승점(원정), 기대 결과(−1~1, 홈 기준)]
function expPts(la, lb) {
  const pa = [], pb = []; let fa = 1, fb = 1;
  for (let k = 0; k <= 9; k++) { if (k) { fa *= k; } pa.push(Math.exp(-la) * Math.pow(la, k) / fa); pb.push(Math.exp(-lb) * Math.pow(lb, k) / fa); }
  let w = 0, d = 0; for (let i = 0; i <= 9; i++) for (let j = 0; j <= 9; j++) { const q = pa[i] * pb[j]; if (i > j) w += q; else if (i === j) d += q; }
  const l = Math.max(0, 1 - w - d); return [w * 3 + d, l * 3 + d, w - l];
}
MD.expPts = expPts;
// 기대치 = 흐름을 절반만 넣은 전력 (흐름이 저절로 계속 커지거나 끝없이 가라앉지 않도록)
const baseStr = (w, id) => { const c = w.clubs[id]; return c ? (c.str || 60) + (c.fm || 0) + (c.injd || 0) + (c.tac || 0) + (c.mo || 0) * .5 : 60; };
function flowAfter(cx, kind, sides, P, ev, ga, gb) {
  const w = cx.w; if (!w || !w.clubs) return;
  const ka = sides[0].key, kb = sides[1].key, A = w.clubs[ka], B = w.clubs[kb];
  const lam = C.lambdas ? C.lambdas(baseStr(w, ka), baseStr(w, kb), kind === 'cont' && cx.neutral ? 0 : 1) : [1.4, 1.2];
  const [ea, eb, er] = expPts(lam[0], lam[1]);
  // 구단 흐름
  const pts = [ga > gb ? 3 : ga === gb ? 1 : 0, gb > ga ? 3 : ga === gb ? 1 : 0], ex = [ea, eb];
  [A, B].forEach((c, s) => { if (!c || c.lite || !c.sq) return; const e = (c.moE || 0) + ((pts[s] - ex[s]) - (c.moE || 0)) * .15; c.moE = Math.round(e * 1000) / 1000; const T = CMOCAP * Math.tanh(e / .7); c.mo = Math.round(((c.mo || 0) + (T - (c.mo || 0)) * .25) * 100) / 100; });
  // 선수 흐름: 기대(기본 능력치 기준) 대비 골·도움·결과·실점·카드·그날 컨디션
  const MO = w.mo = w.mo || {};
  for (let s = 0; s < 2; s++) {
    const c = w.clubs[sides[s].key]; if (!c || c.lite) continue;
    const lamT = lam[s], lamO = lam[1 - s], eRes = s === 0 ? er : -er, res = goals(s, ga, gb);
    const st = P[s].filter(x => x.id !== 'ME' && (x.off - x.on) > 0), top = Math.max(60, ...st.map(x => x.ovr0 || x.ovr));
    const wg = st.map(x => gw(x.pos) * Math.exp(((x.ovr0 || x.ovr) - top) * .1)), wa = st.map(x => aw(x.pos) * Math.exp(((x.ovr0 || x.ovr) - top) * .08));
    // 팀 기대 득점을 뛴 시간 × 득점 가중치로 나눈다 (모두 더하면 팀 기대 득점)
    const fr = st.map(x => Math.min(90, x.off - x.on) / 90);
    const sg = wg.reduce((a, b, i) => a + b * fr[i], 0) || 1, sa = wa.reduce((a, b, i) => a + b * fr[i], 0) || 1;
    st.forEach((x, i) => {
      if (String(x.id)[0] === '~') return;
      const mm = Math.min(90, x.off - x.on); if (mm < 15) return;
      const f = mm / 90, role = C.ROLE[x.pos];
      const gE = lamT * f * wg[i] / sg, aE = lamT * .7 * f * wa[i] / sa;
      const cc = { GK: .13, CB: .085, FB: .07, DM: .04, CM: .02 }[role] || 0, cs = { GK: .45, CB: .32, FB: .26, DM: .16, CM: .06 }[role] || 0;
      const perf = (x.g - gE) * .55 + (x.a - aE) * .35 + (res - eRes) * .22 - ((x.cn || 0) - lamO * f) * cc + (mm >= 60 ? (x.cs ? 1 : 0) - Math.exp(-lamO) : 0) * cs - x.y * .15 - x.r * 1.2 + (x.nz || 0);
      MO[x.id] = MD.moStep(MO[x.id] || [0, 0], perf, f, MOCAP);
    });
  }
}
const goals = (s, ga, gb) => { const a = s === 0 ? ga : gb, b = s === 0 ? gb : ga; return a > b ? 1 : a < b ? -1 : 0; };
// 시즌이 바뀌면 흐름은 대부분 사라진다
MD.flowReset = w => {
  if (w.mo) { const o = {}; for (const id in w.mo) { const v = w.mo[id], m = v[1] * .25; if (Math.abs(m) >= .3) o[id] = [Math.round(v[0] * .2 * 1000) / 1000, Math.round(m * 100) / 100]; } w.mo = o; }
  for (const id in w.clubs) { const c = w.clubs[id]; if (c.mo || c.moE) { c.mo = Math.round((c.mo || 0) * .3 * 100) / 100; c.moE = 0; } }
  w.lxi = {};
};

// 선발·교체
// 구단마다 시즌 주전 명단이 있다: 직전 리그·대륙 대회 선발은 그대로 가려는 경향(관성), 감독의 고정된 선호, 선수 흐름이 섞인다
// 리그는 거의 고정(피로·부상·부진이면 바뀐다), 대륙 대회는 정예, 국내 컵은 실험적으로 돌린다
// yb: 유망주·임대 복귀 선수에게 주는 출전 기회 가산 (컵 경기에서는 더 크게, 로테이션도 더 많이)
// cx: { ban: Set(출전 정지 선수), fat: id → 피로 감점 } — 연전이면 주전을 쉬게 한다 (로테이션)
function lineup(sq, excludeId, cup, cx, form) {
  // 포메이션 자리(슬롯)에 맞춰 배치 (tactics.js). 선수 객체를 복사해 sp(자리)·sl(슬롯 번호)를 붙인다
  const src = sq.filter(x => x.id !== excludeId);
  const imp = cx && cx.imp != null ? cx.imp : (cup ? .45 : .7);
  const L = C.pickLineup(src, { form, ban: cx && cx.ban, fat: cx && cx.fat, imp, nb: cx && cx.nb || 9, gkRot: cup && imp < .8 && R() < .72, kind: cx && cx.kind, prev: cx && cx.prev, mo: cx && cx.mo, pref: cx && cx.pref });
  const xi = L.xi.map(s => Object.assign({}, s.x, { sp: s.slot, sl: s.i }));
  // 벤치가 규정 인원보다 모자라면 2군·유스에서 콜업
  const nb = cx && cx.nb || 9;
  if (L.bench.length < nb && cx && cx.call) { const have = new Set(xi.map(x => x.id).concat(L.bench.map(x => x.id))); const ex = cx.call().filter(x => !have.has(x.id));
    const needGK = !L.bench.some(x => x.pos === 'GK'); if (needGK) { const g = ex.find(x => x.pos === 'GK'); if (g) { L.bench.unshift(g); ex.splice(ex.indexOf(g), 1); } }
    for (const x of ex) { if (L.bench.length >= nb) break; if (x.pos === 'GK' && L.bench.filter(b => b.pos === 'GK').length >= (nb >= 12 ? 2 : 1)) continue; L.bench.push(x); } }
  return { xi, bench: L.bench, form: L.form };
}
// ---------- 징계·피로 (관전 모드 AI 선수) ----------
// MD.ctx = { w, d, kind: 'lg' | 'cup' | 'cont' } — 달력이 경기 전에 채운다
// w.susp[pid] = { dom: 국내(리그·컵) 남은 경기, lg: 리그만, cont: 대륙 대회 }
// 퇴장: 경고 누적 퇴장 1경기, 직접 퇴장 1~3경기 (그 대회 범위). 리그 경고 5·10·15장마다 리그 1·2·3경기
MD.ctx = null;
const BANK = { lg: ['dom', 'lg'], cup: ['dom'], cont: ['cont'], intl: [], am: [] };
// 교체 명단 인원 (대회 규정): EPL·분데스리가·리그 1 9명, 라리가 12명, 세리에 A 15명, UEFA 대회 12명, 월드컵·대륙 대회 본선 15명, A매치 12명, 하부 리그 7명
const BENCH = { ENG: 9, ESP: 12, ITA: 15, GER: 9, FRA: 9, BRA: 12, POR: 9, NED: 9 };
MD.benchN = (w, kind, key) => {
  if (kind === 'intl') return 15; if (kind === 'am') return 12;
  const c = w && w.clubs[key]; if (!c) return 12;
  if (kind === 'cont') return 12;
  const L = c.lg && w.lg[c.lg], nat = L ? L.nation : c.nat, tier = L ? L.tier || 1 : 1;
  if (nat === 'ITA') return tier === 1 ? 15 : tier === 2 ? 12 : 9;
  if (nat === 'ESP') return tier <= 2 ? 12 : 9;
  if (tier >= 3) return nat === 'ENG' ? 9 : 7;
  return BENCH[nat] || 9;
};
function discCx(cx, sd, kind) {
  const w = cx.w, SU = w.susp || {}, LP = w.lastPl || {}, d = cx.d || 0, ban = new Set();
  for (const x of sd.sq) { const b = SU[x.id]; if (b && BANK[kind].some(k => b[k] > 0)) ban.add(x.id); }
  // 출전 정지 소화
  for (const id of ban) { const b = SU[id]; for (const k of BANK[kind]) if (b[k] > 0) { b[k]--; break; } if (!b.dom && !b.lg && !b.cont) delete SU[id]; }
  // EPL 25인 명단에서 빠진 선수는 리그 경기에 못 나온다
  if (kind === 'lg' && C.mkt) { const U = C.mkt.unreg(w, sd.key); if (U) for (const id of U) ban.add(id); }
  const fat = x => { const l = LP[x.id]; if (l == null) return 0; const gap = d - l, gk = (GRP[x.pos] || 'M') === 'G'; const v = gap <= 2 ? 6 : gap === 3 ? 3.2 : gap === 4 ? 1 : 0; return gk ? v * .35 : v; };
  return { ban, fat };
}
function discAfter(cx, kind, sides, P, ev) {
  const w = cx.w, SU = w.susp = w.susp || {}, LP = w.lastPl = w.lastPl || {}, YC = w.ycnt = w.ycnt || {};
  for (let s = 0; s < 2; s++) for (const p of P[s]) {
    if (p.id === 'ME' || !w.clubs[sides[s].key]) continue;
    if (p.off - p.on >= 55) LP[p.id] = cx.d;
    const sec = ev.some(e => e[3] === p.id && e[0] === '2'), red = ev.some(e => e[3] === p.id && e[0] === 'r');
    const scope = kind === 'cont' ? 'cont' : 'dom';
    if (sec || red) { const b = SU[p.id] = SU[p.id] || {}; b[scope] = (b[scope] || 0) + (red ? (R() < .62 ? 1 : R() < .7 ? 2 : 3) : 1); }
    else if (kind === 'lg' && p.y) { const n0 = YC[p.id] || 0, n1 = n0 + p.y; YC[p.id] = n1; for (const t of [5, 10, 15]) if (n0 < t && n1 >= t) { const b = SU[p.id] = SU[p.id] || {}; b.lg = (b.lg || 0) + t / 5; } }
  }
}
MD.discAfter = discAfter;
// ---------- 구단 기록 (게임 진행 중 쌓이는 것만) ----------
// w.crec[구단] = { bw/bl: 최다 점수 차 승·패, st: 연속 기록(현재·최고), fg: 최단 시간 득점, yA/oA/yG/oG: 최연소·최고령 출전·득점, att: 최다 관중, ps: 연속 경기 득점/공격포인트 }
// 기록 하나 = [값, 선수 id, 이름, 날짜, 상대, 부가] 처럼 짧은 배열
const D2K = () => C.dayOf(2000, 1, 1);
function ageAt(id, x, d) { const F = G.FC27; if (/^\d+$/.test(id) && F && F.P[+id]) return (d - D2K() - F.P[+id][9]) / 365.25; return x && x.age != null ? x.age + .5 : null; }
function streak(R, k, hit, d) { const c = R.st[k] || (R.st[k] = [0, 0, 0, 0, 0]); // [현재, 현재 시작일, 최고, 최고 시작일, 최고 끝일]
  if (hit) { if (!c[0]) c[1] = d; c[0]++; if (c[0] > c[2]) { c[2] = c[0]; c[3] = c[1]; c[4] = d; } } else c[0] = 0; }
function recAfter(cx, kind, sides, P, ev, ga, gb, nmOf0) {
  const nmOf = id => 0; // 이름은 화면에서 id로 찾는다 (생성 선수 id = '이름#…') — 저장 용량
  const r2 = a => Math.round(a * 100) / 100;
  const w = cx.w, d = cx.d, CR = w.crec = w.crec || {}, PST = w.pstk = w.pstk || {};
  const sc = [ga, gb];
  for (let s = 0; s < 2; s++) {
    const id = sides[s].key, c = w.clubs[id]; if (!c || c.lite) continue;
    const R = CR[id] || (CR[id] = { st: {} }), opp = sides[1 - s].key, gf = sc[s], gc = sc[1 - s], res = gf > gc ? 'W' : gf < gc ? 'L' : 'D', lg = kind === 'lg', home = s === 0;
    const mg = gf - gc;
    if (mg > 0 && (!R.bw || mg > R.bw[0] || (mg === R.bw[0] && gf > R.bw[1]))) R.bw = [mg, gf, gc, opp, d, kind];
    if (mg < 0 && (!R.bl || -mg > R.bl[0] || (-mg === R.bl[0] && gc > R.bl[2]))) R.bl = [-mg, gf, gc, opp, d, kind];
    for (const [k, on] of [['aW', res === 'W'], ['aU', res !== 'L'], ['aL', res === 'L'], ['aN', res !== 'W']]) streak(R, k, on, d);
    if (lg) for (const [k, on] of [['lW', res === 'W'], ['lU', res !== 'L'], ['lL', res === 'L'], ['lN', res !== 'W']]) streak(R, k, on, d);
    if (home) { streak(R, 'hU', res !== 'L', d); if (C.attend) { const n = C.attend(w, id, opp, C.MD.attKey(id, opp, ga, gb, ev.filter(e => 'gpo'.includes(e[0])).map(e => e[1])), false); if (!R.att || n > R.att[0]) R.att = [n, opp, d]; } }
    // 감독 성적
    const M = C.mgrOf ? C.mgrOf(w, id, d) : null; if (M) { M.g++; if (res === 'W') M.w++; else if (res === 'D') M.dr++; else M.l++; M.fm = ((M.fm || '') + res).slice(-6); }
    // 선수 기록
    const goals = ev.filter(e => e[2] === s && (e[0] === 'g' || e[0] === 'p')), fst = goals.slice().sort((a, b) => a[1] - b[1])[0];
    if (fst && fst[3] !== 'ME' && (!R.fg || fst[1] < R.fg[0])) R.fg = [fst[1], fst[3], nmOf(fst[3]), d, opp];
    for (const p of P[s]) {
      if (p.id === 'ME' || (p.off - p.on) <= 0) continue;
      const a = ageAt(p.id, (sides[s].sq || []).find(x => x.id === p.id), d);
      if (a != null && a > 14) { if (!R.yA || a < R.yA[0]) R.yA = [r2(a), p.id, nmOf(p.id), d, opp]; if (!R.oA || a > R.oA[0]) R.oA = [r2(a), p.id, nmOf(p.id), d, opp];
        if (p.g) { if (!R.yG || a < R.yG[0]) R.yG = [r2(a), p.id, nmOf(p.id), d, opp]; if (!R.oG || a > R.oG[0]) R.oG = [r2(a), p.id, nmOf(p.id), d, opp]; } }
      // 연속 경기 득점 / 공격포인트 (이 구단 소속 경기)
      const k = PST[p.id] && PST[p.id][2] === id ? PST[p.id] : (PST[p.id] = [0, 0, id]);
      k[0] = p.g ? k[0] + 1 : 0; k[1] = p.g || p.a ? k[1] + 1 : 0;
      if (k[0] >= 3 && (!R.sG || k[0] > R.sG[0])) R.sG = [k[0], p.id, nmOf(p.id), d];
      if (k[1] >= 4 && (!R.sA || k[1] > R.sA[0])) R.sA = [k[1], p.id, nmOf(p.id), d];
      if (!k[0] && !k[1]) delete PST[p.id];
    }
  }
}
// 관중 수 씨앗: 홈·원정·점수·골 시간 (경기 화면과 기록이 같은 값을 내도록 날짜 대신 경기 내용으로)
MD.attKey = (h, a, ga, gb, mins) => `${h}|${a}|${ga}-${gb}|${mins.slice().sort((x, y) => x - y).join('.')}`;

// ---------- 경기 한 개 ----------
// u: 내 선수가 뛴 경기면 { side: 0|1, rec } (rec = 실제 경기 기록)
MD.play = function (st, A, B, ga, gb, u, opt) {
  const sides = [A, B], goals = [ga, gb], out = [], cup = !!(opt && opt.cup);
  const P = [[], []]; // 출전 선수: { id, pos, ovr, on, off, start, g, a, y, r, ri }
  const CX = MD.ctx && MD.ctx.w && !(opt && opt.nat) ? MD.ctx : null, kind = CX ? (cup ? 'cup' : CX.kind || 'lg') : null;
  MD.ctx = null; // 한 경기에만 쓴다 (다음 경기가 지난 대회 정보를 물려받지 않게)
  const st9 = 2 + Math.floor(R() * 6); // 이 경기의 후반 추가시간
  // 포메이션: 구단은 감독 성향, 국가대표는 기본 4-3-3/4-2-3-1
  const formOf = sd => { const w = CX ? CX.w : C._w; if (opt && opt.nat) return C.seeded('nf|' + sd.key)() < .5 ? '4-3-3' : '4-2-3-1'; const M = w && C.mgrOf ? C.mgrOf(w, sd.key) : null; if (M) { C.mgrStyle(M, (w.clubs[sd.key] || {}).nat); return C.formFor(w, sd.key, M, sd.sq); } return '4-2-3-1'; };
  const QT = C._qm && C._qm[0] === ga && C._qm[1] === gb ? C._qm.tl : null; C._qm = null; // 결과와 함께 정해진 골 시간·퇴장 (world.js quickMatch)
  const W0 = CX ? CX.w : null, flowOn = !!(W0 && W0.clubs && (kind === 'lg' || kind === 'cup' || kind === 'cont'));
  const Ls = sides.map(sd => { const cx = CX ? discCx(CX, sd, kind) : { ban: null, fat: null }; cx.imp = CX && CX.imp != null ? (Array.isArray(CX.imp) ? CX.imp[sides.indexOf(sd)] : CX.imp) : null; cx.nb = MD.benchN(CX ? CX.w : C._w, kind, sd.key); if (CX && CX.w) cx.call = () => MD.callUps(CX.w, sd.key, CX.d);
    if (flowOn && W0.clubs[sd.key]) { cx.kind = kind; cx.prev = MD.prevXI(W0, sd.key); cx.mo = id => MD.moOf(W0, id); const yy = W0.year; cx.pref = id => MD.prefOf(sd.key, id, yy); }
    return lineup(sd.sq, null, cup, cx, formOf(sd)); });
  const avg = Ls.map(L => L.xi.length ? L.xi.reduce((a, x) => a + x.ovr, 0) / L.xi.length : 60);
  for (let s = 0; s < 2; s++) {
    const me = u && u.side === s && u.rec && u.rec.played ? u.rec : null;
    const L = Ls[s];
    let xi = L.xi.slice(), bench = L.bench.slice();
    L.bnF = bench;
    // 유망주 기회: 약한 상대와의 컵 경기는 선발 1~2명, 크게 이기는 경기·컵 경기는 막판 교체로 경험을 쌓게 한다
    let cameo = [];
    if (!me && !(opt && opt.nat)) {
      const yp = sides[s].sq.filter(x => (x.yb || 0) > 0 && GRP[x.pos] !== 'G').sort((a, b) => (b.yb + b.ovr * .15) - (a.yb + a.ovr * .15));
      if (yp.length) {
        const adv = goals[s] - goals[1 - s], diff = avg[s] - avg[1 - s];
        if (cup && diff >= 3) {
          let k = diff >= 7 ? 2 : 1;
          for (const y of yp) {
            if (k <= 0) break; if (xi.includes(y) || y.ovr < avg[s] - 20) continue;
            const g = GRP[y.pos] || 'M'; let bi = -1;
            xi.forEach((x, i) => { if ((GRP[x.pos] || 'M') === g && (bi < 0 || x.ovr < xi[bi].ovr)) bi = i; });
            if (bi < 0) continue;
            bench = [xi[bi]].concat(bench.filter(b => b !== y)); xi[bi] = y; k--;
          }
        }
        const pc = adv >= 3 ? .9 : adv >= 2 ? .7 : cup ? .5 : adv >= 1 ? .25 : adv === 0 ? .14 : .22; // 지고 있을 때도 분위기 반전용으로 유망주를 넣어 본다
        if (pc && R() < pc) {
          // 유망주 여럿이면 돌아가며 (기대치 높은 선수가 조금 더 자주)
          const cand = yp.filter(y => !xi.includes(y) && y.ovr >= avg[s] - 24).slice(0, 6), n = adv >= 3 && R() < .5 ? 2 : 1;
          for (let k = 0; k < n && cand.length; k++) { let t = 0; for (const y of cand) t += y.yb + 1; let r = R() * t, j = 0; for (; j < cand.length - 1; j++) { r -= cand[j].yb + 1; if (r <= 0) break; } cameo.push(cand.splice(j, 1)[0]); }
        }
        if (cameo.length) { bench = bench.filter(b => !cameo.includes(b)); // 명단 인원은 그대로: 유망주가 들어간 만큼 벤치 끝자리를 뺀다
          while (bench.length + cameo.length > L.bench.length) { let k = -1; for (let j = bench.length - 1; j >= 0; j--) if (GRP[bench[j].pos] !== 'G') { k = j; break; } if (k < 0) break; bench.splice(k, 1); } }
        L.bnF = bench.concat(cameo);
      }
    }
    if (me) { // 내 선수를 명단에 넣는다: 선발이면 같은 포지션 선수 하나를 빼고, 교체면 교체 1명 자리를 쓴다
      const myPos = me.pos || u.pos || 'CM';
      const meObj = { id: 'ME', pos: myPos, ovr: u.ovr || 70 };
      if (me.start) { let k = xi.findIndex(x => x.sp === myPos); if (k < 0) k = xi.findIndex(x => GRP[x.sp || x.pos] === GRP[myPos]); if (k < 0) k = xi.length - 1; meObj.sp = xi[k].sp; meObj.sl = xi[k].sl; xi.splice(k, 1, meObj); }
      else { bench.unshift(meObj); L.bnF = [meObj].concat(L.bnF); }
    } else if (u && u.side === s && u.rec && u.rec.bench && !(opt && opt.nat)) { // 교체 명단에만 든 경기 (출전 없음)
      const meObj = { id: 'ME', pos: u.pos || 'CM', ovr: u.ovr || 70 };
      let bn = (L.bnF || bench).filter(b => b.id !== 'ME');
      if (bn.length >= L.bench.length) { let k = -1; for (let j = bn.length - 1; j >= 0; j--) if (GRP[bn[j].pos] !== 'G') { k = j; break; } if (k >= 0) bn.splice(k, 1); }
      L.bnF = [meObj].concat(bn); bench = bench.filter(b => L.bnF.includes(b));
    }
    // 경기에서의 포지션 = 포메이션 자리 (득점 확률·통계도 그 자리 기준). 본래 포지션은 bp
    // 흐름(숨은 값)은 그날 실제로 낼 수 있는 실력에 더해진다 (ovr0 = 흐름을 뺀 값)
    const moA = id => flowOn ? MD.moOf(W0, id) : 0;
    for (const x of xi) { const o0 = x.id === 'ME' ? x.ovr : Math.round(C.posEff ? C.posEff(x, x.sp || x.pos) : x.ovr); P[s].push({ id: x.id, pos: x.sp || x.pos, bp: x.pos, sl: x.sl, ovr: x.id === 'ME' ? o0 : Math.round(o0 + moA(x.id)), ovr0: o0, on: 0, off: 90, start: 1, g: 0, a: 0, y: 0, r: 0 }); }
    Ls[s].xiP = P[s].slice();
    // 교체: 특별한 일이 없으면 5명을 거의 다 쓴다. 경기 중 교체 타이밍은 3번(+하프타임)이라 두세 명씩 묶어서 들어간다
    // 교체 인원 (유럽 4대 리그 실측: 5명 54.9% · 4명 25.1% · 3명 13.0% · 2명 6.4% · 1명 0.6%)
    // 점수 차가 크면 체력 안배로 더 쓰고, 접전·벤치가 얇으면 덜 쓴다
    let pw = [.008, .076, .133, .253, .53]; // 1~5명 (보정 뒤 실측 분포에 맞춘 시작값)
    { const mg = Math.abs(ga - gb), xa = xi.reduce((a, x) => a + (x.ovr || 0), 0) / Math.max(1, xi.length), bt = bench.filter(x => GRP[x.pos] !== 'G').map(x => x.ovr || 0).sort((a, b) => b - a).slice(0, 5), ba = bt.length ? bt.reduce((a, b) => a + b, 0) / bt.length : 0;
      const mv = (f, t, v) => { const k = Math.min(pw[f], v); pw[f] -= k; pw[t] += k; };
      if (mg >= 3) { mv(2, 4, .06); mv(1, 4, .03); mv(3, 4, .05); } else if (mg <= 1) { mv(4, 3, .05); mv(4, 2, .03); }
      if (bt.length >= 5 && ba >= xa - 5) { mv(2, 4, .03); mv(3, 4, .03); } else if (bt.length < 5 || ba < xa - 13) { mv(4, 3, .05); mv(4, 2, .04); } }
    let rq = R() * pw.reduce((a, b) => a + b, 0), want = 1; for (; want < 5; want++) { rq -= pw[want - 1]; if (rq <= 0) break; }
    // 골키퍼 교체는 부상(가끔)일 때만: 벤치 키퍼가 주전 키퍼 자리로
    const gkB = bench.find(x => GRP[x.pos] === 'G'), gkX = P[s].find(x => GRP[x.pos] === 'G' && x.id !== 'ME');
    if (gkB && gkX && R() < .012) { const m0 = Math.round(clamp(N(52, 22), 8, 88)); gkX.off = m0; gkX.inj = 1; P[s].push({ id: gkB.id, pos: gkX.pos, bp: gkB.pos, sl: gkX.sl, ovr: gkB.ovr, on: m0, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 }); }
    const fb = bench.filter(x => (GRP[x.pos] !== 'G' || x.id === 'ME') && !P[s].some(p => p.id === x.id)); // 필드 교체 후보 (내 선수는 포지션 무관)
    const used0 = P[s].filter(x => !x.start).length;
    const nSub = Math.min(fb.length, 5 - cameo.length - used0, me && !me.start ? Math.max(1, want - cameo.length) : Math.max(0, want - cameo.length - used0));
    const subs = (me && !me.start ? [fb[0]].concat(fb.slice(1).sort(() => R() - .5)).slice(0, nSub) : fb.slice().sort(() => R() - .5).slice(0, Math.max(0, nSub))).concat(cameo);
    // 교체 묶음(웨이브): 첫 교체 55~70분(가끔 하프타임), 다음은 70~80분, 마지막은 막판. 유망주 카메오는 마지막 묶음
    const PAT = { 1: [[1]], 2: [[1, 1], [2]], 3: [[1, 1, 1], [2, 1], [1, 2]], 4: [[2, 1, 1], [1, 2, 1], [2, 2], [1, 1, 2]], 5: [[2, 2, 1], [1, 2, 2], [2, 1, 2], [3, 1, 1], [2, 3], [1, 1, 3]] };
    const subMin = [];
    { const k = subs.filter(x => x.id !== 'ME').length;
      if (k) { const pats = PAT[Math.min(5, k)], pat = pats[(R() * pats.length) | 0];
        let t = R() < .09 ? 46 : Math.round(clamp(N(61, 7), 50, 74));
        const inj = R() < .07 ? Math.round(clamp(N(30, 9), 8, 44)) : 0; // 부상 교체 (전반)
        let first = true;
        for (let wv = 0; wv < pat.length; wv++) {
          for (let q = 0; q < pat[wv]; q++) subMin.push(first && inj ? inj : t), first = false;
          t = Math.round(clamp(t + N(wv === 0 ? 13 : 8, 4), t + 3, 89));
        }
        while (subMin.length < k) subMin.push(Math.round(clamp(N(84, 4), 75, 90)));
        subMin.sort((a, b) => a - b); } }
    let si = 0;
    for (const sb of subs) {
      const gkIn = GRP[sb.pos] === 'G', outs = P[s].filter(x => x.start && x.off === 90 && (gkIn ? GRP[x.pos] === 'G' : GRP[x.pos] !== 'G') && x.id !== 'ME');
      if (!outs.length) break;
      let minute;
      if (sb.id === 'ME') minute = clamp(me.on != null && me.on > 0 ? me.on : 90 - (me.min || 15), 1, 89);
      else minute = subMin[Math.min(si++, subMin.length - 1)] || 70;
      if (cameo.includes(sb) && minute < 70) minute = Math.round(clamp(N(80, 5), 70, 89));
      // 같은 포지션끼리 교체. 후반 늦게는 지친 공격수·미드필더부터
      const same = outs.filter(x => GRP[x.pos] === GRP[sb.pos]);
      const o = same.length ? same[(R() * same.length) | 0] : outs[Math.floor(R() * outs.length)];
      o.off = minute;
      { const o0 = sb.id === 'ME' ? sb.ovr : Math.round(C.posEff ? C.posEff(sb, o.pos) : sb.ovr); P[s].push({ id: sb.id, pos: o.pos, bp: sb.pos, sl: o.sl, ovr: sb.id === 'ME' ? o0 : Math.round(o0 + moA(sb.id)), ovr0: o0, on: minute, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 }); }
    }
    if (me && !me.start && me.st && me.st.red) { const mp = P[s].find(x => x.id === 'ME'); if (mp) mp.off = Math.min(90, mp.on + (me.min || 1)); }
    if (me && me.start && me.min < 90 && me.st && me.st.red) { const mp = P[s].find(x => x.id === 'ME'); mp.off = me.min; } // 퇴장: 교체 없이 10명
    else if (me && me.start && me.min < 90) { const mp = P[s].find(x => x.id === 'ME'); mp.off = me.min; const gkMe = GRP[mp.pos] === 'G', b2 = bench.filter(b => !P[s].some(x => x.id === b.id) && (GRP[b.pos] === 'G') === gkMe)[0]; if (b2) P[s].push({ id: b2.id, pos: mp.pos, bp: b2.pos, sl: mp.sl, ovr: b2.ovr, on: me.min, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 }); }
  }
  const onAt = (s, m) => P[s].filter(x => x.on <= m && (x.off >= m || x.off >= 90) && !x.rOut);
  const ev = [];
  // 결과와 함께 정해진 퇴장: 그 시간에 뛰던 선수가 나가고 교체 없이 10명 (이후 골·도움·통계에서 빠진다)
  if (QT) for (const [rs, rm] of QT.reds) {
    const cand = P[rs].filter(x => x.id !== 'ME' && x.on < rm && x.off >= 90 && C.ROLE[x.pos] !== 'GK');
    const c = pickW(cand, x => CW[C.ROLE[x.pos]] || 1); if (!c) continue;
    const sub = P[rs].find(x => !x.start && x.sl === c.sl && x.on > rm); if (sub) { const alt = P[rs].find(x => x !== c && x.start && x.off >= 90 && GRP[x.pos] === GRP[sub.pos] && x.id !== 'ME'); if (alt) { alt.off = sub.on; } else { P[rs].splice(P[rs].indexOf(sub), 1); } }
    const sec = R() < .45; c.y = sec ? 1 : c.y; c.r = 1; c.off = rm; c.redM = rm; if (sec) ev.push(['y', Math.max(c.on + 1, rm - 5 - Math.floor(R() * 30)), rs, c.id, null]); ev.push([sec ? '2' : 'r', rm, rs, c.id, null]);
  }
  for (let s = 0; s < 2; s++) {
    const n = goals[s];
    const meP = P[s].find(x => x.id === 'ME');
    const me = meP && u && u.rec;
    const myG = me ? (me.st.goals || 0) : 0, myA = me ? (me.st.assists || 0) : 0;
    // 후반 추가시간(90+1 ~ 90+7)에 나는 골도 있다: m > 90 이면 '90+(m-90)'
    const mins = QT && QT.mins[s] && QT.mins[s].length === n ? QT.mins[s].slice() : []; if (!mins.length) for (let i = 0; i < n; i++) mins.push(R() < .055 ? 90 + 1 + Math.floor(R() * st9) : 1 + Math.floor(R() * 90));
    mins.sort((a, b) => a - b);
    // 내 골·도움은 내가 뛴 시간 안의 골에 배정
    const inMe = m => meP && m >= meP.on && m <= meP.off;
    const idx = mins.map((m, i) => i);
    const mineG = new Set(), mineA = new Set();
    let need = Math.min(myG, n);
    for (const i of idx.filter(i => inMe(mins[i]))) { if (need <= 0) break; mineG.add(i); need--; }
    for (let i = 0; i < n && need > 0; i++) if (!mineG.has(i)) { mins[i] = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); mineG.add(i); need--; }
    let needA = Math.min(myA, n - mineG.size);
    for (let i = 0; i < n && needA > 0; i++) if (!mineG.has(i) && inMe(mins[i])) { mineA.add(i); needA--; }
    for (let i = 0; i < n && needA > 0; i++) if (!mineG.has(i) && !mineA.has(i)) { mins[i] = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); mineA.add(i); needA--; }
    for (let i = 0; i < n; i++) {
      const m = Math.max(1, Math.min(97, mins[i]));
      if (mineG.has(i)) { meP.g++; const asst = R() < .7 ? pickW(onAt(s, m).filter(x => x !== meP), x => aw(x.pos)) : null; if (asst) asst.a++; ev.push(['g', m, s, 'ME', asst ? asst.id : null]); continue; }
      const on = onAt(s, m).filter(x => x.id !== 'ME' || !me);
      const og = !mineA.has(i) && R() < .025;
      if (og) { const d = pickW(onAt(1 - s, m).filter(x => ['CB', 'FB', 'GK', 'DM'].includes(C.ROLE[x.pos])), () => 1); if (d) { ev.push(['o', m, s, d.id, null]); continue; } }
      const pen = !mineA.has(i) && R() < .09;
      const top = Math.max(...on.map(x => x.ovr), 60);
      const scorer = pen ? on.filter(x => C.ROLE[x.pos] !== 'GK').sort((a, b) => (gw(b.pos) * 10 + b.ovr) - (gw(a.pos) * 10 + a.ovr))[0] : pickW(on.filter(x => C.ROLE[x.pos] !== 'GK'), x => gw(x.pos) * Math.exp((x.ovr - top) * .1));
      if (!scorer) continue;
      scorer.g++;
      let asst = null;
      if (mineA.has(i)) asst = meP;
      else if (!pen && R() < .7) asst = pickW(onAt(s, m).filter(x => x !== scorer && x.id !== 'ME'), x => aw(x.pos) * Math.exp((x.ovr - top) * .08));
      if (asst) asst.a++;
      ev.push([pen ? 'p' : 'g', m, s, scorer.id, asst ? asst.id : null]);
    }
    // 카드
    const meCard = me ? [me.st.yellow || 0, me.st.red || 0] : [0, 0];
    const dby = C.derbyOf && C.derbyOf(A.key, B.key);
    let ny = poisson(dby ? 2.3 : 1.75), nr = !QT && R() < (dby ? .085 : .055) ? 1 : 0; // QT: 퇴장은 결과와 함께 이미 정해졌다
    if (meCard[0]) { const m = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); meP.y = 1; ev.push(['y', m, s, 'ME', null]); }
    if (meCard[1]) { const m = Math.max(meP.on + 1, meP.off); meP.r = 1; ev.push(['r', m, s, 'ME', null]); }
    for (let k = 0; k < ny; k++) { const m = R() < .07 ? 91 + Math.floor(R() * st9) : 5 + Math.floor(R() * 86); const c = pickW(onAt(s, m).filter(x => x.id !== 'ME' && !x.r), x => CW[C.ROLE[x.pos]] || 1); if (!c) continue; if (c.y) { if (!QT && R() < .5) { c.r = 1; c.rOut = 1; c.off = Math.max(m, lastEv(ev, s, c.id)); ev.push(['2', c.off, s, c.id, null]); } } else { c.y = 1; ev.push(['y', m, s, c.id, null]); } }
    if (nr) { const m = 15 + Math.floor(R() * 75); const c = pickW(onAt(s, m).filter(x => x.id !== 'ME' && !x.r), x => CW[C.ROLE[x.pos]] || 1); if (c) { c.r = 1; c.rOut = 1; c.off = Math.max(m, lastEv(ev, s, c.id)); ev.push(['r', c.off, s, c.id, null]); } }
  }
  ev.sort((a, b) => a[1] - b[1]);
  // 평점 (경기 결과·골·도움·실점·카드 반영). 내 선수는 실제 경기 평점 사용
  // 평점 기준은 이 경기에 나온 두 팀 선발 평균 OVR (리그 수준에 맞춘 상대 평가: 하부 리그도 평균 평점이 1부와 비슷)
  const xiAll = P[0].concat(P[1]).filter(x => x.start && x.id !== 'ME');
  const ref = xiAll.length ? xiAll.reduce((a, x) => a + x.ovr, 0) / xiAll.length : 70;
  for (let s = 0; s < 2; s++) {
    const res = goals[s] > goals[1 - s] ? 1 : goals[s] < goals[1 - s] ? -1 : 0, conc = goals[1 - s];
    for (const x of P[s]) {
      const mm = x.off - x.on;
      // 뛰는 동안 내준 실점만 (교체로 들어오기 전 실점은 그 선수 책임이 아니다)
      const cn = ev.filter(e => e[2] === 1 - s && 'gpo'.includes(e[0]) && e[1] >= x.on && e[1] <= (x.off >= 90 ? 120 : x.off)).length;
      x.cn = cn;
      x.cs = cn === 0 && conc === 0 && mm >= 60 ? 1 : 0;
      if (x.id === 'ME') { x.rt = +(u.rec.rating || 6.5).toFixed(1); continue; }
      const role = C.ROLE[x.pos], f = clamp(mm / 90, 0, 1);
      const csB = x.cs ? ({ GK: .45, CB: .32, FB: .26, DM: .16, CM: .06 }[role] || 0) : 0;
      const concP = cn * ({ GK: .13, CB: .085, FB: .07, DM: .04, CM: .02 }[role] || 0);
      const nz = N(0, .3); x.nz = nz;
      // 평점 기준은 흐름을 뺀 실력(ovr0): 흐름은 골·도움 같은 결과로만 평점에 드러난다
      let r = 6.6 + (ROLEB[role] || 0) + ((x.ovr0 != null ? x.ovr0 : x.ovr) - ref) * .033 + res * .22 * (x.start ? 1 : Math.max(.35, f)) + x.g * .55 + x.a * .35 + csB - concP - x.y * .15 - x.r * 1.2 + nz;
      // 짧게 뛴 교체 선수: 실수(카드)가 없으면 6점대 초중반에 모인다
      if (!x.start) { r = 6.5 + (r - 6.5) * (.45 + .25 * f); if (!x.y && !x.r && !cn) r = Math.max(r, 6.1); }
      x.rt = Math.round(clamp(r, 4.5, 10) * 10) / 10;
    }
  }
  // 경기 최우수 선수(MOM): 평점 최고 → 공격 포인트 → 이긴 팀 → 선발 순 (화면에서도 같은 규칙으로 다시 고른다)
  { const res = goals[0] > goals[1] ? 0 : goals[1] > goals[0] ? 1 : -1, cands = [];
    for (let s = 0; s < 2; s++) P[s].forEach((x, i) => cands.push({ x, id: x.id, rt: x.rt, ga: x.g + x.a, win: res === s, start: x.start, s, i }));
    const m = MD.momPick(cands); if (m) m.x.mom = 1; }
  // 압축 저장: 선수 = 사전 번호(62진수), 평점 = 한 글자(4.5~10.0을 0.1 단위), 교체 투입 '+분', 교체 아웃 '-분'
  const enc = id => b62(pix(st, id));
  const evS = ev.map(e => `${e[0]}${e[1]}.${e[2]}.${enc(e[3])}${e[4] != null ? '.' + enc(e[4]) : ''}`).join('|');
  // 실제 선수가 한 명도 없는 하부 구단끼리의 경기는 출전 명단을 남기지 않는다 (득점·카드만)
  const real = sd => sd.sq.some(x => x.id[0] !== '~') || (u && u.rec);
  // 라인업 기록: 맨 앞 '~포메이션번호', 선수마다 끝에 '@슬롯' (포메이션 자리)
  const lnS = real(A) || real(B) ? P.map((list, s) => (Ls[s].form && C.FORMK ? ['~' + C.FORMK.indexOf(Ls[s].form)] : []).concat(list.map(x => enc(x.id) + B62[Math.round(clamp(x.rt, 4.5, 10) * 10) - 45] + (x.start ? (x.off < 90 ? '-' + x.off : '') : '+' + x.on + (x.off < 90 ? '-' + x.off : '')) + (x.sl != null ? '@' + x.sl.toString(36) : ''))).concat((Ls[s].bnF || []).filter(b => !list.some(x => x.id === b.id)).map(b => '!' + enc(b.id))).join(',')).join('/') : ''; // '!선수' = 교체 명단에 있었지만 안 뛴 선수
  if (flowOn) try {
    flowAfter(CX, kind, sides, P, ev, ga, gb);
    // 주전 명단 기억 (리그·대륙 대회만: 컵 로테이션은 주전 구상을 바꾸지 않는다)
    if (kind === 'lg' || kind === 'cont') { const LX = W0.lxi = W0.lxi || {}; for (let s = 0; s < 2; s++) { const k = sides[s].key; if (!W0.clubs[k] || W0.clubs[k].lite) continue; LX[k] = P[s].filter(x => x.start && x.id !== 'ME').map(x => x.id).join(',') + (LX[k] ? '|' + LX[k].split('|')[0] : ''); } }
  } catch (e) { console.error('flow', e); }
  if (CX) try { discAfter(CX, kind, sides, P, ev); recAfter(CX, kind, sides, P, ev, ga, gb, id => { for (const sd of sides) { const x = sd.sq.find(z => z.id === id); if (x) return x.n; } return id; }); if (C.pkHook) C.pkHook(CX, kind, sides, ev, ga, gb); if (C.lrecHook) C.lrecHook(CX, sides, P, ev, ga, gb); if (C.crMatch && CX.w && CX.ck) C.crMatch(CX.w, sides[0].key, sides[1].key, ga, gb, CX.ck); } catch (e) { console.error('rec', e); }
  return { ev: evS, ln: lnS, P };
};
MD.momPick = cands => { let b = null; for (const c of cands) { if (!b || c.rt > b.rt || (c.rt === b.rt && (c.ga > b.ga || (c.ga === b.ga && ((c.win && !b.win) || (c.win === b.win && c.start > b.start)))))) b = c; } return b; };
// 해석된 경기(decode 결과)에서 MOM 찾기
MD.momOf = (d, ga, gb) => {
  if (!d || !d.ln || d.ln.length !== 2) return null;
  const res = ga > gb ? 0 : gb > ga ? 1 : -1, cands = [];
  const gaOf = id => d.ev.filter(e => (e.p === id && (e.k === 'g' || e.k === 'p')) || e.a === id).length;
  d.ln.forEach((list, s) => list.forEach((x, i) => cands.push({ id: x.id, rt: x.rt, ga: gaOf(x.id), win: res === s, start: x.start ? 1 : 0, s, i })));
  const m = MD.momPick(cands); return m ? m.id : null;
};
function lastEv(ev, s, id) { let m = 0; for (const e of ev) if (e[2] === s && (e[3] === id || e[4] === id)) m = Math.max(m, e[1]); return m; }
function pickW(list, wf) { let t = 0; const ws = list.map(x => { const v = Math.max(0, wf(x) || 0); t += v; return v; }); if (t <= 0) return list[0] || null; let r = R() * t; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }

// ---------- 시즌 집계 ----------
MD.addAgg = (agg, side, list) => {
  for (const x of list) {
    const k = x.id;
    const a = agg[k] || (agg[k] = { id: k, club: side, pos: x.pos, ovr: x.ovr, apps: 0, starts: 0, min: 0, g: 0, a: 0, y: 0, r: 0, rs: 0, cs: 0 });
    a.club = side; a.apps++; if (x.start) a.starts++; a.min += Math.max(0, x.off - x.on); a.g += x.g; a.a += x.a; a.y += x.y; a.r += x.r; a.rs += x.rt; a.cs = (a.cs || 0) + (x.cs || 0);
  }
};

// 리그 경기 묶음 압축: s = "홈.원정.홈골.원정골;" (구단 번호 62진수, 가상 구단은 그대로), e·l = 경기별 이벤트·명단
MD.packL = (rows, per, live) => {
  const k = x => typeof x === 'number' ? b62(x) : String(x);
  const o = { p: per, s: rows.map(r => `${k(r[0])}.${k(r[1])}.${r[2]}.${r[3]}`).join(';') };
  if (live) { o.e = rows.map(r => r[4] || ''); o.l = rows.map(r => r[5] || ''); }
  return o;
};
// 리그 경기 목록 풀기: [{ i, r(라운드), a, b(구단 id), ga, gb, det(상세 있음) }]
MD.leagueRows = (w, L) => {
  if (!L || !L.s) return [];
  const cid = t => /^[0-9A-Za-z]+$/.test(t) && !t.startsWith('OPP') ? (w.cix || [])[u62(t)] : t;
  return L.s.split(';').map((t, i) => { const [a, b, ga, gb] = t.split('.'); return { i, r: L.r ? L.r[i] : Math.floor(i / (L.p || 1)), d: L.d ? L.d[i] : null, a: cid(a), b: cid(b), ga: +ga, gb: +gb, det: !!((L.l && L.l[i]) || (L.e && L.e[i]) || L.e) }; });
};
MD.leagueMatch = (st, L, i) => MD.decode(st, [0, 0, 0, 0, 0, L.e ? L.e[i] : '', L.l ? L.l[i] : '']);
// ---------- 해석 (화면용) ----------
MD.decode = (st, m) => {
  // m: [라운드/단계, a, b, ga, gb, ev, ln, ...]
  const id = s => st.P[u62(s)];
  const ev = !m[5] ? [] : m[5].split('|').map(t => { const k = t[0], [mn, sd, p1, p2] = t.slice(1).split('.'); return { k, m: +mn, s: +sd, p: id(p1), a: p2 != null ? id(p2) : null }; });
  const fm = [null, null], bn = [[], []];
  const ln = !m[6] ? null : m[6].split('/').map((side, si) => side ? side.split(',').map(t => {
    if (t[0] === '~') { fm[si] = (C.FORMK || [])[+t.slice(1)] || null; return null; }
    if (t[0] === '!') { const pid = id(t.slice(1)); if (pid) bn[si].push(pid); return null; }
    const mt = /^([0-9A-Za-z]+)([0-9A-Za-z])([+-]\d+)?(-\d+)?(@[0-9a-z])?$/.exec(t); if (!mt) return null;
    const sub = mt[3] && mt[3][0] === '+', v = mt[3] ? +mt[3].slice(1) : 0;
    const o = { id: id(mt[1]), start: !sub, on: sub ? v : 0, off: sub ? (mt[4] ? +mt[4].slice(1) : 90) : (mt[3] ? v : 90), rt: (B62.indexOf(mt[2]) + 45) / 10 };
    if (mt[5]) { o.sl = parseInt(mt[5].slice(1), 36); if (fm[si] && C.FORMS[fm[si]][o.sl]) o.sp = C.FORMS[fm[si]][o.sl][0]; }
    return o;
  }).filter(Boolean) : []);
  return { ev, ln, fm, bn };
};
// 경기 통계 (점유율·슈팅): 저장하지 않고 경기 키로 항상 같은 값이 나오게 만든다
MD.teamStats = (key, sa, sb, ga, gb) => {
  const r = C.seeded('ts|' + key);
  const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pos = clamp(Math.round(50 + (sa - sb) * 1.1 + g() * 5), 28, 72);
  const sh = (gg, s, d) => Math.max(gg, Math.round(10 + (s - 72) * .35 + d * 1.5 + g() * 3 + gg * 1.2));
  const shA = sh(ga, sa, (pos - 50) / 10), shB = sh(gb, sb, (50 - pos) / 10);
  const on = (s, gg) => clamp(Math.round(gg + (s - gg) * (.3 + r() * .12)), gg, s);
  return { pos: [pos, 100 - pos], sh: [shA, shB], sot: [on(shA, ga), on(shB, gb)] };
};
})(typeof window !== 'undefined' ? window : globalThis);
