// Road to Legend — 이적시장 세부 규칙
// · 계약 조항: 바이아웃(라리가 의무), 셀온(재판매 수익 %), 바이백(되사기), 임대 완전 이적 옵션·의무
// · 분할 지급·에이전트 수수료 (구단 재정에 반영)
// · 선수 성격: 충성심·야망·고향 선호·다혈질 (id로 고정) → 이적 요청·출전 시간 불만·행선지 선택
// · 등록 규정: EPL 25인 명단(21세 초과 최대 17명 비홈그로운, 홈그로운 8명), 세리에 A 비EU 해외 영입 한도(한 시즌 2명), 영국 취업 허가(GBE 점수)
// 선수 배열 e 추가 칸: [24] 바이아웃(만 유로 단위), [25] 셀온 [구단, %], [26] 바이백 [구단, 금액(만), 만료 창], [27] 임대 옵션 ['o'|'b', 금액(만)], [29] 육성 국가, [31] 불만(1)
// 구단: c.dues = [[받을 구단, 해마다 낼 금액(€), 남은 해]] (분할금 미지급분), c.recv = 받을 분할금 (표시용), c.agent = 이번 시즌 에이전트 수수료 합계
(function (G) {
const C = G.TC, { R, clamp, N } = C;
const MK = C.mkt = {};

// ---------- 선수 성격 ----------
const PCACHE = new Map();
MK.persona = e => {
  const id = String(e[0]); let p = PCACHE.get(id); if (p) return p;
  const r = C.seeded('pers|' + id);
  p = { loy: r(), amb: r(), home: r(), temp: r() };
  // v37: 출전 시간 우선(pt) · 돈(money) · 명문·브랜드 선호(brand) — 앞의 값은 그대로 두고 뒤에 덧붙인다
  p.pt = r(); p.money = r(); p.brand = r();
  if (PCACHE.size > 60000) PCACHE.clear(); PCACHE.set(id, p); return p;
};
MK.traits = e => { const p = MK.persona(e), t = []; if (p.loy > .86) t.push('원클럽맨 기질'); else if (p.loy > .72) t.push('충성심 높음'); if (p.amb > .8) t.push('야망형'); if (p.home > .84) t.push('고향 선호'); if (p.temp > .86) t.push('다혈질'); if (p.loy < .14 && p.amb > .5) t.push('이적에 열린 편'); if (p.pt > .8) t.push('출전 시간 중시'); if (p.money > .86) t.push('돈을 따름'); if (p.brand > .84) t.push('명문 구단 선호'); return t; };

// ---------- 국적·홈그로운 ----------
const EU = new Set('AUT BEL BUL CRO CYP CZE DEN EST FIN FRA GER GRE HUN IRL ITA LVA LTU LUX MLT NED POL POR ROU SVK SVN ESP SWE'.split(' '));
const UK = new Set(['ENG', 'WAL', 'SCO', 'NIR']);
MK.isEU = nat => EU.has(nat);
const natOf = (w, c) => c && c.lg && w.lg[c.lg] ? w.lg[c.lg].nation : (c ? c.nat : '');
// 홈그로운: 잉글랜드·웨일스 구단에서 21세 전 3년 이상 육성 — 영국 국적이거나 잉글랜드 구단 유스 출신(e[29])으로 근사
MK.homegrown = (e, nat) => (nat === 'ENG' ? UK.has(e[5]) || e[29] === 'ENG' : e[29] === nat || e[5] === nat);

// ---------- 영국 취업 허가 (GBE 점수) ----------
// 대표팀 출전(국가 수준·대표팀 내 위치) + 소속 리그 수준 × 출전 비율 + 기량. 15점 이상이면 통과, 10점 이상이면 ESC(창마다 2명) 가능
const BAND = { ESP1: 1, ENG1: 1, GER1: 1, ITA1: 1, FRA1: 1, POR1: 2, NED1: 2, BEL1: 2, BRA1: 2, ARG1: 2, TUR1: 3, MEX1: 3, USA1: 3, SCO1: 3, AUT1: 3, SUI1: 3, DEN1: 3, ESP2: 3, GER2: 3, ITA2: 3, FRA2: 3, ENG2: 3, KSA1: 4, SAU1: 4, POL1: 4, NOR1: 4, SWE1: 4, ROU1: 4, KOR1: 4, JPN1: 4, CHN1: 5, AUS1: 5, IND1: 5, IRL1: 5 };
const BANDP = [0, 12, 10, 7, 5, 3, 1];
MK.gbe = (w, e, from) => {
  if (UK.has(e[5]) || e[5] === 'IRL') return { pts: 99, ok: true, why: '영국·아일랜드 국적' };
  const W = MK._win || {}, nr = W.nrank && W.nrank[String(e[0])], ns = W.nstr && W.nstr[e[5]];
  let intl = 0; if (nr != null && nr < 23) { const tier = ns == null ? 6 : ns >= 80 ? 12 : ns >= 77 ? 10 : ns >= 74 ? 8 : ns >= 70 ? 6 : 3; intl = Math.round(tier * (nr < 11 ? 1 : .6)); }
  const lg = from && from.lg, band = BAND[lg] || (lg && w.lg[lg] && w.lg[lg].tier === 1 ? 5 : 6), share = clamp((e[11] || 0) / 28, 0, 1);
  const club = Math.round(BANDP[band] * (.35 + share * .65)), q = e[2] >= 82 ? 6 : e[2] >= 78 ? 4 : e[2] >= 74 ? 2 : 0;
  const pts = intl + club + q;
  return { pts, ok: pts >= 15, esc: pts >= 10 && e[3] <= 23, intl, club, q };
};

// ---------- 창 시작 ----------
MK.begin = (w, winter) => {
  const W = MK._win = { winter, nonEU: {}, esc: {}, nrank: {}, nstr: {} };
  W.stat = MK.stature(w);
  if (!winter || !w.mkq) w.mkq = { y: w.year, ne: {} }; // 세리에 A 비EU: 시즌(여름+겨울) 단위
  try { const pools = C.nationPools(w); for (const n in pools) { W.nstr[n] = C.nationStrength(pools[n]); pools[n].all.slice().sort((a, b) => b[2] - a[2]).slice(0, 26).forEach((e, i) => { W.nrank[String(e[0])] = i; }); } } catch (e) { /* 국가 풀 실패는 무시 */ }
};
// 이 구단이 이 선수를 데려올 수 있나 (등록 규정)
MK.canJoin = (w, e, from, to, kind) => {
  const tn = natOf(w, to), fn = natOf(w, from);
  if (tn === 'ENG' && to.lg && w.lg[to.lg] && w.lg[to.lg].tier <= 4 && fn !== 'ENG') { const g = MK.gbe(w, e, from); if (!g.ok) { if (!(g.esc && to.lg === 'ENG1' && (MK._win.esc[to.id] || 0) < 2)) return false; } }
  if (to.lg === 'ITA1' && fn !== 'ITA' && !EU.has(e[5]) && kind !== 'loan-ret') { if ((w.mkq.ne[to.id] || 0) >= 2) return false; }
  return true;
};
// 행선지 가중치 보정: 고향 선호·EPL 비홈그로운 정원
MK.weight = (w, e, to) => {
  const p = MK.persona(e); let x = 1;
  if (to.nat === e[5] && p.home > .6) x *= 1 + (p.home - .6) * (e[3] >= 28 ? 6 : 2.5);
  if (to.lg === 'ENG1' && e[3] > 21 && !MK.homegrown(e, 'ENG')) { const n = to.sq.filter(z => z[3] > 21 && !MK.homegrown(z, 'ENG')).length; if (n >= 17) x *= .25; }
  return x;
};
// ---------- 행선지 매력 (v37) ----------
// 현실에서 선수가 구단을 고르는 기준: ① 구단 위상(성적 + 이름값·역사·팬 — 지금 부진해도 맨유·유벤투스는 끌림이 있다)
// ② 출전 시간(가서 주전인가) ③ 돈 ④ 고향. 잘하는 선수일수록 위상을, 벤치에 머물던 선수일수록 출전 시간을 본다.
// MK.stature(w): 세계 구단 랭킹 종합 지수 → 구단 위상 / 이름값(역사·팬)
MK.stature = w => {
  const out = new Map(); let rows = null; try { rows = C.crCalc ? C.crCalc(w) : null; } catch (e) { rows = null; }
  if (rows) for (const x of rows) out.set(x.id, { s: x.s, brand: (x.he + x.fa) / 2 });
  return out;
};
const statOf = (w, c) => { const W = MK._win, m = W && W.stat, x = m && m.get(c.id); if (x) return x; const L = c.lg && w.lg[c.lg], t = L ? L.tier || 1 : 4; return { s: clamp(((c.str || 60) - 55) * 1.25 - (t - 1) * 4, 0, 60), brand: clamp(((c.pres || c.str || 60) - 60) * .8, 0, 30) }; };
MK.statOf = statOf;
// 그 구단에 가면 어떤 역할인가: 0 주전 · 1 로테이션 · 2 벤치 (같은 포지션 그룹 안 OVR 순위)
const GRPK = { GK: 'GK', CB: 'D', LB: 'D', RB: 'D', LWB: 'D', RWB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LW: 'A', RW: 'A', LM: 'A', RM: 'A', ST: 'A', CF: 'A' };
const GST = { GK: 1, D: 4, M: 3, A: 3 };
MK.roleAt = (e, to) => {
  const g = GRPK[e[1]] || 'M', n = GST[g]; let better = 0;
  for (const z of to.sq || []) if (z !== e && (GRPK[z[1]] || 'M') === g && z[2] > e[2]) better++;
  return better < n ? 0 : better < Math.ceil(n * 1.9) ? 1 : 2;
};
MK.appeal = (w, e, from, to, kind) => {
  const p = MK.persona(e), o = e[2], age = e[3];
  if (kind === 'loan') { const ro = MK.roleAt(e, to); return ro === 0 ? 1.8 : ro === 1 ? 1 : .35; } // 임대는 뛰는 게 목적
  const S1 = statOf(w, to), S0 = from ? statOf(w, from) : { s: 20, brand: 5 };
  let x = 1;
  // ① 위상: 기량이 높고 야망이 클수록 위상 차이에 민감 (전성기 스타가 자기보다 한참 아래 구단으로 가지 않음)
  const q = clamp((o - 70) / 14, 0, 1.2), ds = S1.s - S0.s;
  x *= Math.exp(ds * (.012 + q * (.03 + p.amb * .035)) * (age >= 32 ? .4 : 1));
  // 이름값 끌림: 역사·팬이 큰 구단 (명문 선호 성향일수록)
  x *= 1 + (S1.brand / 100) * (.35 + p.brand * 1.3) * (o >= 74 ? 1 : .4);
  // ② 출전 시간
  const ro = MK.roleAt(e, to), wantPlay = .35 + p.pt * .9 + (age >= 23 && age <= 30 ? .2 : 0) - (o >= 84 && S1.s >= 70 ? .25 : 0);
  x *= ro === 0 ? 1 + wantPlay * .9 : ro === 1 ? 1 : Math.max(.08, 1 - wantPlay * .95);
  // ③ 돈: 부자 리그(중동·미국 등)는 돈을 따르는 성향일수록, 나이가 많을수록
  const n = to.lg && w.lg[to.lg] ? w.lg[to.lg].nation : to.nat;
  if (RICHN[n]) x *= age >= 29 || p.money > .8 ? 1 + RICHN[n] * (p.money * 1.4 + (age >= 31 ? .6 : 0)) : Math.max(.2, 1 - (1 - p.money) * .7 * (o >= 80 ? 1 : .4));
  return x;
};
const RICHN = { SAU: 1.4, QAT: 1.1, UAE: 1, USA: .55, CHN: .5, TUR: .25 };
// 빅클럽 문턱: 위상 높은 구단은 '적어도 로테이션' 수준만 산다 (애매한 선수가 빅클럽 가는 일 방지). 유망주는 예외
MK.bigGate = (w, e, to, kind) => {
  if (kind === 'loan' || to.parent) return true;
  const S1 = statOf(w, to); if (S1.s < 62 && (to.str || 0) < 82) return true;
  const o = e[2], age = e[3];
  if (age <= 21 && e[4] >= (to.str || 80) - 1) return true;
  return o >= (to.str || 80) - (S1.s >= 75 ? 3 : 4.5) && MK.roleAt(e, to) <= 1;
};
// 월드클래스 문턱: 전성기 스타(82+, 31세 이하)는 위상이 한참 낮은 구단으로 가지 않는다 (돈을 좇는 성향·부자 리그 예외)
MK.starGate = (w, e, from, to, kind) => {
  if (kind === 'loan') return true;
  const o = e[2], age = e[3]; if (o < 82 || age > 31) return true;
  const S1 = statOf(w, to), S0 = from ? statOf(w, from) : { s: 50 }, p = MK.persona(e);
  const n = to.lg && w.lg[to.lg] ? w.lg[to.lg].nation : to.nat;
  if (RICHN[n] >= 1 && (p.money > .75 || age >= 29)) return true;
  const floor = Math.min(S0.s - 12, 40 + (o - 82) * 4);
  return S1.s >= floor;
};
// 이적 욕구 보정 (성격·불만)
MK.ambition = (e, base) => { const p = MK.persona(e); let a = base * (.45 + p.amb * 1.1); if (p.loy > .86) a *= .25; else if (p.loy > .72) a *= .6; if (e[31]) a = Math.max(a, .55); return clamp(a, 0, .95); };

// ---------- 바이아웃 ----------
// 라리가는 모든 계약에 의무. 포르투갈은 흔하고, 다른 리그는 드물다 (만 유로 단위로 저장)
MK.buyout = (w, e, c) => {
  const n = natOf(w, c); if (e[24] != null && e[24] !== 0) return e[24];
  const p = n === 'ESP' ? 1 : n === 'POR' ? .55 : .04; if (R() > p) { e[24] = 0; return 0; }
  const v = C.aiFee(e[2], e[3], n, Math.max(1, e[6] || 2)) * (C.vfOf ? C.vfOf(w, e[0]) : 1), big = c.str >= 82;
  const mult = big && e[2] >= 82 ? 6 + R() * 8 : big ? 3 + R() * 3 : 1.6 + R() * 2.2;
  e[24] = Math.max(100, Math.round(v * mult / 1e4 / 100) * 100); return e[24];
};
MK.resetBuyout = (w, e, c) => { e[24] = 0; MK.buyout(w, e, c); };

// ---------- 거래 체결 ----------
// 이적료 처리(분할·에이전트)와 조항 붙이기. 반환: 기록용 메타 문자열 (예: 'i3:40|ag:120|so:15|bb')
MK.deal = (w, e, from, to, kind, fee, opt) => {
  const meta = [], T = MK._win || {};
  to.agent = to.agent || 0;
  if (kind === 'buy' || kind === 'sale') {
    // 셀온: 이 선수에 다른 구단의 셀온 조항이 있으면 이적료 일부를 넘긴다
    if (e[25] && fee > 0 && from) { const [sid, pct] = e[25], sc = w.clubs[sid]; if (sc && sid !== to.id) { const amt = Math.round(fee * pct / 100); from.cash -= amt; sc.cash = (sc.cash || 0) + amt; meta.push('sp:' + sid + ':' + pct); } }
    e[25] = 0; e[26] = 0;
    // 분할 지급: 2천만 유로 이상은 대개 2~4년 분할
    let up = fee;
    if (fee >= 2e7 && (R() < .7 || (to.cash || 0) < fee * 1.1)) { const n = 2 + Math.floor(R() * 3), f0 = .3 + R() * .2; up = Math.round(fee * f0); const per = Math.round((fee - up) / (n - 1));
      (to.dues = to.dues || []).push([from ? from.id : '', per, n - 1]); if (from) (from.recv = from.recv || []).push([to.id, per, n - 1]); meta.push('i' + n + ':' + Math.round(f0 * 100)); }
    to.cash -= up; if (from) from.cash = (from.cash || 0) + up;
    // 에이전트 수수료 5~10% (이적료가 작으면 최소 연봉 몇 주치)
    const ag = Math.round(Math.max(fee * (.05 + R() * .05), (e[8] || 0) * 6)); to.cash -= ag; to.agent += ag; if (ag >= 1e5) meta.push('ag:' + Math.round(ag / 1e4));
    // 새 조항: 어린 선수를 파는 구단은 셀온, 빅클럽이 유스를 내보낼 땐 바이백
    if (from && from.sq && e[3] <= 23 && R() < .45) { const pct = [10, 15, 20, 25][Math.floor(R() * 4)]; e[25] = [from.id, pct]; meta.push('so:' + pct); }
    if (from && from.sq && from.str >= 80 && e[3] <= 22 && e[2] < from.str - 2 && R() < .4) { const bb = Math.round(fee * (1.6 + R() * 1.4) / 1e4); e[26] = [from.id, Math.max(200, bb), (opt && opt.stamp || 0) + 4 + Math.floor(R() * 3) * 2]; meta.push('bb:' + e[26][1]); }
    if (opt && opt.bo) meta.push('bo');
    if (opt && opt.req) meta.push('rq');
  } else if (kind === 'free') {
    // 자유계약: 이적료 없음, 대신 계약금·에이전트 수수료
    const ag = Math.round((e[8] || 0) * 52 * (.3 + R() * .5)); to.cash -= ag; to.agent += ag; if (ag >= 1e5) meta.push('ag:' + Math.round(ag / 1e4));
    e[25] = 0; e[26] = 0;
  } else if (kind === 'loan') {
    to.cash -= fee; if (from) from.cash = (from.cash || 0) + fee;
    if (e[2] >= 66 && R() < .45) { const ob = R() < .3, v = Math.round(C.aiFee(e[2], e[3], natOf(w, from), Math.max(1, e[6] || 2)) * (.8 + R() * .5) / 1e4); e[27] = [ob ? 'b' : 'o', Math.max(30, v)]; meta.push((ob ? 'ob:' : 'op:') + e[27][1]); }
    else e[27] = 0;
  }
  // 등록 한도 집계
  if (to.lg === 'ITA1' && from && natOf(w, from) !== 'ITA' && !EU.has(e[5]) && kind !== 'lret') { w.mkq.ne[to.id] = (w.mkq.ne[to.id] || 0) + 1; meta.push('ne'); }
  if (natOf(w, to) === 'ENG' && to.lg && w.lg[to.lg] && w.lg[to.lg].tier <= 4 && from && natOf(w, from) !== 'ENG' && !UK.has(e[5]) && e[5] !== 'IRL') { const g = MK.gbe(w, e, from); if (!g.ok) { T.esc[to.id] = (T.esc[to.id] || 0) + 1; meta.push('esc'); } else meta.push('gbe:' + g.pts); }
  if (e[3] <= 18 && to.sq) e[29] = natOf(w, to);
  if (kind !== 'loan') { e[24] = 0; e[31] = 0; MK.buyout(w, e, to); }
  return meta.join('|');
};
// 여름 재정: 분할금 납부 (재정이 바닥나도 의무라서 빚처럼 남는다)
MK.payDues = (w, c) => {
  if (c.dues && c.dues.length) { for (const d of c.dues) { c.cash -= d[1]; const s = w.clubs[d[0]]; if (s) s.cash = (s.cash || 0) + d[1]; d[2]--; } c.dues = c.dues.filter(d => d[2] > 0); }
  if (c.recv && c.recv.length) { for (const d of c.recv) d[2]--; c.recv = c.recv.filter(d => d[2] > 0); }
  c.agent0 = c.agent || 0; c.agent = 0;
};

// ---------- EPL 25인 명단 ----------
// 시즌 시작 해 1월 1일 기준 21세 이하는 명단 밖에서도 뛸 수 있다. 나머지 최대 25명, 비홈그로운 최대 17명. 빠진 선수는 리그 출전 불가
const RCACHE = new Map();
MK.reg = (w, c) => {
  if (!c || c.lg !== 'ENG1' || !c.sq) return null;
  const key = c.sq.length + '|' + c.sq.reduce((a, e) => a + e[2] + e[3], 0) + '|' + (w.cal ? (w.cal.win ? w.cal.win.lbl : '') : '') + '|' + w.year;
  const hit = RCACHE.get(c.id); if (hit && hit.key === key) return hit;
  const sen = c.sq.filter(e => e[3] > 21).sort((a, b) => b[2] - a[2]), inn = new Set(), out = [];
  let nh = 0;
  for (const e of sen) { const hg = MK.homegrown(e, 'ENG'); if (inn.size >= 25) { out.push(e); continue; } if (!hg && nh >= 17) { out.push(e); continue; } inn.add(e); if (!hg) nh++; }
  const hg = [...inn].filter(e => MK.homegrown(e, 'ENG')).length;
  const r = { key, n: inn.size, nh, hg, u21: c.sq.length - sen.length, out: new Set(out.map(e => String(e[0]))) };
  RCACHE.set(c.id, r); return r;
};
MK.unreg = (w, id) => { const r = MK.reg(w, w.clubs[id]); return r ? r.out : null; };

// ---------- 기록 표시 ----------
MK.metaText = (m, w) => {
  if (!m) return []; const out = [];
  for (const t of String(m).split('|')) {
    const [k, a, b] = t.split(':');
    if (k[0] === 'i' && /^i\d$/.test(k)) out.push(`${k.slice(1)}년 분할 (선지급 ${a}%)`);
    else if (k === 'ag') out.push(`에이전트 수수료 ${C.fmtEUR(+a * 1e4)}`);
    else if (k === 'so') out.push(`셀온 ${a}%`);
    else if (k === 'sp') out.push(`셀온 ${b}% 지급 → ${(w.clubs[a] || {}).name || a}`);
    else if (k === 'bb') out.push(`바이백 ${C.fmtEUR(+a * 1e4)}`);
    else if (k === 'bo') out.push('바이아웃 발동');
    else if (k === 'rq') out.push('선수 이적 요청');
    else if (k === 'op') out.push(`완전 이적 옵션 ${C.fmtEUR(+a * 1e4)}`);
    else if (k === 'ob') out.push(`완전 이적 의무 ${C.fmtEUR(+a * 1e4)}`);
    else if (k === 'ox') out.push('완전 이적 옵션 행사');
    else if (k === 'oy') out.push('완전 이적 의무 조항');
    else if (k === 'bx') out.push('바이백 행사');
    else if (k === 'ne') out.push('비EU 쿼터');
    else if (k === 'esc') out.push('취업 허가 ESC');
    else if (k === 'gbe') out.push(`취업 허가 ${a}점`);
    else if (k === 'ws') out.push(`임대 구단 주급 ${a}% 부담`);
    else if (k === 'vt') out.push('출전 시간 확보용 임대');
    else if (k === 'pt') out.push('출전 시간을 찾아 이적');
    else if (k === 'br') out.push('구단 이름값에 끌린 이적');
  }
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
