// 터치라인 커리어 — 월드 커리어 모드 (v40)
// 관전 모드의 세계에 내 선수 한 명을 넣는다. 훈련·상점·결정적 순간(경기 중 개입)은 없고,
// 이적·감독과의 대화·동료와의 관계·성격이 커리어를 바꾼다. 능력치는 6개 대분류만 움직인다.
// 관계·신뢰는 숫자로 보여 주지 않고, 효과도 문턱값이 아니라 확률로만 작용한다.
(function (G) {
'use strict';
const C = G.TC, GM = G.TCG;
const { R, rnd, rint, clamp, N, pick, wpick } = C;
const WC = C.WC = {};

// ---------- 성격 ----------
// [이름, 설명, 시작 때 고를 수 있는가]
const PER = {
  amb: ['야망가', '더 큰 무대를 원한다. 빅클럽의 관심에 민감하고 벤치를 오래 참지 못한다.', 1],
  loyal: ['충성파', '한 팀에 오래 남고 싶어 한다. 팬들과 빨리 가까워지고, 이적 제안을 거절해도 뒷말이 적다.', 1],
  pro: ['프로페셔널', '몸 관리와 훈련 태도가 철저하다. 부상과 성장 정체가 줄어든다.', 1],
  comp: ['승부욕', '지는 걸 못 참는다. 경쟁자와 부딪히는 일이 잦지만, 그만큼 경쟁에서 이기는 경우도 많다.', 1],
  free: ['자유로운 영혼', '틀에 갇히길 싫어한다. 전술 지시와 충돌하기 쉽지만 기분을 빨리 회복한다.', 1],
  leader: ['리더형', '라커룸을 이끈다. 동료 관계가 좋아지고 주장 이야기가 일찍 나온다.', 1],
  media: ['미디어 친화', '카메라 앞이 편하다. 명성이 빨리 오르고 인터뷰 요청이 잦다.', 1],
  quiet: ['내성적', '말보다 행동. 언론에 덜 휘둘리지만 팬들과 가까워지는 데 시간이 걸린다.', 1],
  hot: ['다혈질', '감정이 그대로 드러난다. 감독·동료와 부딪히는 일이 잦다.', 0],
  humble: ['겸손', '공을 동료에게 돌린다. 라커룸에서 신망이 두텁다.', 0],
  mentor: ['멘토', '후배를 이끄는 데서 보람을 느낀다.', 0]
};
WC.PER = PER;
const has = (S, k) => !!(S.wc && S.wc.per.includes(k));
WC.has = has;

// ---------- 단계 (나이) ----------
WC.stageOf = (age, status) => status === 'free' ? '무소속' : age <= 15 ? '아카데미' : age <= 17 ? 'U18' : age <= 20 && status === 'youth' ? 'U21' : status === 'youth' ? 'U21' : '프로';
WC.stageInfo = age => age <= 15 ? ['아카데미', '14~15세 · 구단 유스 아카데미에서 시작합니다. 1군 기회는 없고 U18 형들과 섞여 뜁니다.']
  : age <= 17 ? ['U18', '16~17세 · U18 리그에서 뛰며 1군 콜업을 노립니다.']
  : age <= 20 ? ['U21', '18~20세 · 실력이 1군에 가까우면 1군 계약, 아니면 U21(2군)에서 시작합니다.']
  : ['프로', '21세 이상 · 1군 계약으로 시작합니다. 팀 수준보다 많이 처지면 벤치에서 출발합니다.'];

// ---------- 6개 대분류 능력치 ----------
// 세부 능력치는 대분류 값 + 고정된 개인 편차. 엔진(성장·사건)이 세부 능력치를 바꾸면 그 변화를 대분류로 모아 다시 나눈다
const GK6 = { DIV: ['gkDiving'], HAN: ['gkHandling'], KIC: ['gkKicking'], REF: ['gkReflexes', 'reactions'], SPD: ['gkSpeed'], POS: ['gkPos'] };
const GKL = { DIV: '다이빙', HAN: '핸들링', KIC: '킥력', REF: '반사신경', SPD: '스피드', POS: '위치 선정' };
function groupsOf(p) {
  if (p.pos === 'GK') return GK6;
  const g = {}; for (const [k] of C.GROUPS) g[k] = C.AK.filter(a => C.AGROUP[a] === k); return g;
}
const wOf = (p, g, k) => p.pos === 'GK' ? (k === 'reactions' ? 0 : 1) : (C.FACE[g][k] || 0);
function gmean(p, g, keys) { let s = 0, t = 0; for (const k of keys) { const w = wOf(p, g, k); s += w * p.a[k]; t += w; } return t ? s / t : 0; }
WC.initOff = function (p) {
  const G6 = groupsOf(p); p.wc6 = {}; p.wcOff = {};
  for (const g in G6) { const m = gmean(p, g, G6[g]); p.wc6[g] = m; for (const k of G6[g]) p.wcOff[k] = p.a[k] - m; }
  p.wcPos = p.pos === 'GK' ? 'GK' : 'F';
  p.wcA = Object.assign({}, p.a);
};
WC.norm = function (p) {
  if (!p || !p.a) return;
  if (!p.wc6 || p.wcPos !== (p.pos === 'GK' ? 'GK' : 'F')) { WC.initOff(p); return; }
  const G6 = groupsOf(p), A0 = p.wcA, inG = new Set();
  for (const g in G6) {
    const ks = G6[g]; ks.forEach(k => inG.add(k));
    const ds = ks.map(k => p.a[k] - A0[k]), nz = ds.filter(x => Math.abs(x) > .005);
    const dg = nz.length ? .5 * nz.reduce((a, b) => a + b, 0) / nz.length + .5 * ds.reduce((a, b) => a + b, 0) / ds.length : 0;
    p.wc6[g] = clamp(p.wc6[g] + dg, 5, 99);
    for (const k of ks) p.a[k] = clamp(p.wc6[g] + p.wcOff[k], 5, 99);
  }
  for (const k of C.AK) if (!inG.has(k)) p.a[k] = A0[k];
  p.wcA = Object.assign({}, p.a);
};
// 화면용: [[키, 이름, 값]]
WC.six = function (p) {
  if (!p.wc6) WC.initOff(p);
  if (p.pos === 'GK') return Object.keys(GK6).map(k => [k, GKL[k], Math.round(p.wc6[k])]);
  return C.GROUPS.map(([k, l]) => [k, l, Math.round(p.wc6[k])]);
};

// ---------- 성장 (AI 선수와 같은 방식) ----------
// 잠재력은 고정이 아니고, 출전·활약·운에 따라 오르내린다. 시즌마다 돌파·정체·슬럼프·늦게 피는 꽃·급격한 노쇠 같은 갈림길이 있다
const ACAT = { accel: 1, sprint: 1, agility: 1, balance: 1, stamina: 1, jumping: 1, gkSpeed: 1, strength: 1.5, reactions: 2.5, vision: 3, composure: 3, attPos: 3, defAware: 3, fkAcc: 3, penalties: 3, gkPos: 3, aggression: 3 };
const GEV = { 1: ['돌파형 시즌', '한 단계 올라섰다'], 2: ['성장 정체', '한 해 동안 제자리걸음'], 3: ['슬럼프', '기량이 일시적으로 떨어졌다 · 반등 여지 있음'], 4: ['늦게 피는 꽃', '뒤늦게 기량이 올라왔다'], 5: ['급격한 노쇠', '몸이 갑자기 무거워졌다'] };
WC.GEV = GEV;
function shiftOvr(p, d, wf) {
  const W = C.POSW[p.pos], v = {}; let s = 0;
  for (const k of C.AK) { v[k] = wf(k); s += (W[k] || 0) * v[k]; }
  if (s <= 0) return;
  const f = d / s;
  for (const k of C.AK) p.a[k] = clamp(p.a[k] + v[k] * f * rnd(.7, 1.3), 5, 99);
}
function growCore(S, ctx) {
  const p = S.p, h = p.hid, age = p.age + 1, gk = p.pos === 'GK';
  WC.norm(p);
  const before = Object.assign({}, p.a), o0 = C.posOvr(p.a, p.pos);
  let o = o0, pot = h.pot;
  const ga = age - (h.peak - 27.5) * .5 - (gk ? 2 : 0); // 전성기가 늦은 선수·골키퍼는 늦게 여문다
  const play = clamp((ctx.minShare || 0) * 1.3, 0, 1.15);
  const perf = clamp((ctx.rating || 6.65) - 6.65, -.8, 1) * (ctx.minShare > .05 ? 1 : 0);
  const lg = clamp((1 - (h.lon || 1)) * 3, -2, 2.5) + (S.wc.sup && S.wc.sup.med ? .6 : 0); // 선수 생명 성향 (년) · 의료팀이 있으면 조금 길게
  if (ga <= 23) {
    pot += perf * 2 * play + N(-.35, 1.1) - (play < .2 && ga >= 20 ? rnd(0, 1.5) : 0) - (ga >= 21 && pot - o >= 8 ? rnd(0, 1.2) : 0);
    if (pot > o) o += (pot - o) * rnd(.15, .32) * (.62 + .6 * play) * (ga <= 20 ? 1.1 : 1) + perf * 2.2 * play + N(.45, 1);
    else o += N(0, 1) + perf * play;
    pot = Math.max(pot, o);
  } else if (pot > o) pot = Math.max(o, pot - rnd(0, 1.8));
  if (ga > 23 && ga <= 28) o += N(0, 1.1) + perf * play * .6;
  else if (ga > 28 && ga <= 30) o += N(-.5, 1.1);
  else if (ga > 30) o -= Math.max(0, ga - 30 - lg * .5) * rnd(.25, .75) + rnd(0, .7);
  if (ga >= 24 && ga <= 30 && pot > o) o += (pot - o) * rnd(.25, .6);
  // 갈림길
  let ev = 0; const rr = R(), med = S.wc.sup && S.wc.sup.med, stg = (has(S, 'pro') ? .6 : 1) * (med ? .8 : 1);
  if (ga >= 18 && ga <= 25 && rr < (ga <= 22 && pot >= o + 6 ? .09 : .055)) { o += rint(2, 5) + (ga <= 21 && pot >= o + 8 ? rint(0, 3) : 0); pot += rint(1, 4); ev = 1; }
  else if (ga <= 23 && rr < .055 + .08 * stg) { o -= Math.max(0, o - o0) * .7; pot -= rint(2, 5); ev = 2; }
  else if (ga >= 24 && ga <= 31 && rr < .055 + .1 * stg) { o -= rint(2, 4); ev = 3; }
  else if (ga >= 24 && ga <= 27 && rr < .185) { o += rint(2, 4); pot = Math.max(pot, o + 1); ev = 4; }
  if (ga >= 30 && !ev && R() < .1 * (has(S, 'pro') ? .7 : 1)) { o -= rint(2, 4); ev = 5; }
  if (ctx.bigInj) { o -= rnd(1, age >= 28 ? 4.5 : 3); pot -= rnd(0, 3); }
  if (o > o0) o = o0 + (o - o0) * C.diff().g;
  // 재능 한계(난이도 분포에서 정해짐)는 넘기 어렵다
  if (h.cap) { o = Math.min(o, Math.max(o0, h.cap + 1.5)); pot = Math.min(pot, h.cap + 2); }
  h.pot = clamp(pot, Math.min(o, 40), 99);
  const d = o - o0;
  if (d > 0) {
    // 성향: 자유로운 영혼은 드리블, 승부욕은 피지컬 쪽으로 조금 더
    const foc = has(S, 'free') ? { dribbling: .6, ballControl: .5, agility: .4 } : has(S, 'comp') ? { strength: .4, aggression: .4, stamina: .3 } : null;
    C.applyOvrDelta(p, d, foc);
  } else if (d < 0) {
    if (ga >= 29) shiftOvr(p, d, k => { const c = ACAT[k] || 2; return C.AGROUP[k] === 'GK' && !gk ? 0 : c === 1 ? 1.55 : c === 1.5 ? 1.1 : c === 2.5 ? .75 : c === 3 ? -.12 : .55; });
    else shiftOvr(p, d, k => C.AGROUP[k] === 'GK' && !gk ? 0 : 1);
  }
  if (!gk) for (const k of ['gkDiving', 'gkHandling', 'gkKicking', 'gkReflexes', 'gkSpeed', 'gkPos']) p.a[k] = before[k];
  WC.norm(p);
  return { before, o0: Math.round(o0), o1: C.ovrOf(p), drift: 0, ev };
}
WC.grow = function (S, ctx) {
  const g = growCore(S, Object.assign({}, ctx, { bigInj: WC._bigInj }));
  S.wc.lastGrow = { ev: g.ev, y: S.w.year, d: g.o1 - g.o0, six0: null };
  if (g.ev) { const [t] = GEV[g.ev]; C.news(S, `${S.p.name}, ${t}`, g.ev === 1 || g.ev === 4 ? 'mile' : 'info', g.ev === 1); }
  return g;
};
// 엔진의 성장 함수를 월드 커리어 선수일 때만 바꿔 끼운다
const sg0 = C.seasonGrowth;
C.seasonGrowth = function (p, ctx) { const S = WC._S; if (S && S.wc && S.p === p) return WC.grow(S, ctx); return sg0(p, ctx); };
const es0 = GM.endSeason;
GM.endSeason = function (S) {
  if (!S.wc) return es0(S);
  const six0 = WC.six(S.p);
  const bigInj = S.ss && (S.ss.injuries || []).some(x => (x.days || 0) >= 90);
  WC._S = S; WC._bigInj = bigInj;
  try { const r = es0(S); if (S.wc.lastGrow) S.wc.lastGrow.six0 = six0; seasonRel(S, r);
    S.wc.supPaid = supRenew(S);
    (S.wc.sixH = S.wc.sixH || []).push({ label: r.label, y: r.y, age: r.age, ovr: r.ovr1, six: WC.six(S.p).map(x => x[2]), ev: S.wc.lastGrow ? S.wc.lastGrow.ev : 0, v: S.value }); return r; } finally { WC._S = null; }
};
const fy0 = GM.freeYear;
GM.freeYear = async function (S, onDay) { if (!S.wc) return fy0(S, onDay); WC._S = S; try { return await fy0(S, onDay); } finally { WC._S = null; } };

// ---------- 생성 ----------
// o: { real(FC27 인덱스) | name·num·foot·nat·pos·height·style, age, club, per[], diff, ds, pause, watch }
WC.create = function (o) {
  let S;
  if (o.real != null) { S = GM.newGameReal(o.real, o.diff, o.ds); if (!S) return null; }
  else S = GM.newGame({ name: o.name, num: o.num, foot: o.foot, nat: o.nat, pos: o.pos, height: o.height, style: o.style, difficulty: o.diff, ds: o.ds });
  const w = S.w, p = S.p;
  if (GM.seedWorld) GM.seedWorld(w, S.ds);
  S.wc = { v: 1, per: (o.per || []).filter(k => PER[k]).slice(0, 3), lean: {}, pause: o.pause || 'normal', watch: o.watch || 'big', speed: 2, rel: { mgr: null, mates: [], fans: {}, nt: 0 }, sel: [], q: [], log: [], born: o.real != null ? 'real' : 'new' };
  if (has(S, 'pro')) p.hid.inj = clamp(p.hid.inj * .85, .4, 2.5);
  // 나이: 16세 기준으로 만든 선수를 고른 나이까지 키우거나 (17세 이상), 어리게 되돌린다 (14·15세)
  if (o.real == null) {
    const A = clamp(Math.round(o.age || 16), 14, 34);
    WC.initOff(p);
    if (A < 16) { const d = -(16 - A) * rnd(4, 6); shiftOvr(p, d, k => C.AGROUP[k] === 'GK' && p.pos !== 'GK' ? 0 : (ACAT[k] === 1 || ACAT[k] === 1.5 ? 1.3 : 1)); WC.norm(p); }
    for (let a = 16; a < A; a++) {
      p.age = a;
      const share = a <= 17 ? rnd(.25, .7) : clamp(N(.5, .25), .05, 1);
      growCore(S, { minShare: share, rating: N(6.72, .25) });
    }
    p.age = A; p.born = w.year - A;
  } else WC.initOff(p);
  // 시작 구단
  const cid = o.club && w.clubs[o.club] && w.clubs[o.club].lg ? o.club : S.car.club;
  if (!cid || !w.clubs[cid]) return null;
  const c = w.clubs[cid];
  C.materialize(w, c);
  if (o.real != null && cid !== S.car.club) { /* 실존 선수: 원래 구단 명단에서는 이미 빠져 있다 */ }
  const age = p.age, ov = C.ovrOf(p), lg = w.lg[c.lg];
  const youth = age <= 17 || (age <= 20 && ov < c.str - 12);
  const role = C.roleAt(S, c);
  const wage = youth ? 400 : C.wageFor(c, ov, lg.nation);
  S.car = Object.assign(S.car, { club: cid, status: youth ? 'youth' : 'first', contract: w.year + (youth ? (age <= 15 ? 3 : 2) : C.ctFor ? Math.max(1, C.ctFor(age) - 1) : 2), wage, trust: youth ? 50 : ({ key: 60, starter: 55, rotation: 50, backup: 46, reserve: 43 }[role] || 50), years: o.real != null && cid === S.car.club ? 1 : 0, joined: w.year, focus: 'balance', intensity: 'normal', parent: null });
  if (!youth && !p.money) p.money = Math.round(wage * 20);
  S.clubsJoined = [{ club: cid, y: w.year, type: youth ? 'youth' : 'pro' }];
  S.phase = 'training';
  S.wc.stage0 = WC.stageOf(age, S.car.status); S.wc.age0 = age;
  GM.pushValue && GM.pushValue(S);
  if (S.vh && S.vh.length > 1) S.vh = S.vh.slice(-1);
  WC.mgrCheck(S, true);
  initMates(S, true);
  C.news(S, `${p.name}, ${c.name} ${youth ? (age <= 15 ? '아카데미' : age <= 17 ? 'U18' : 'U21') : '1군'} 합류 · ${age}세`, 'transfer', true);
  return S;
};

// ---------- 관계 ----------
// 값은 -1~1 사이 숨은 값. 화면에는 말로만 보여 주고, 효과는 확률·작은 보정으로만 준다
const rel = S => S.wc.rel;
function mgrV(S, dv, why) {
  const M = rel(S).mgr; if (!M || !dv) return;
  M.v = clamp(M.v + dv, -1, 1);
  // 감독 평가는 출전 역할 판단에 작은 치우침으로만 들어간다 (S.wc.rb). 실제 선발은 여전히 확률
  S.wc.rb = M.v * 2.2;
  S.car.trust = clamp(S.car.trust + dv * 14, 0, 100);
  if (why) WC.note(S, why, dv > 0 ? 1 : -1);
}
WC.mgrV = mgrV;
function fansV(S, dv, club) {
  const id = club || S.car.club; if (!id) return;
  const F = rel(S).fans; const mul = dv > 0 ? (has(S, 'loyal') ? 1.5 : has(S, 'quiet') ? .75 : 1) : (has(S, 'loyal') ? .8 : 1);
  F[id] = clamp((F[id] || 0) + dv * mul, -1, 1);
}
WC.fansV = fansV;
function ntV(S, dv) { rel(S).nt = clamp((rel(S).nt || 0) + dv, -1, 1); }
// 메모: 관계 변화 기록 (화면의 '최근 일' 목록)
WC.note = function (S, t, s) { const L = S.wc.log; L.unshift({ d: S.w.cal ? S.w.cal.d : 0, t, s: s || 0 }); if (L.length > 30) L.length = 30; };
// 감독 스타일과 내 강점의 궁합
const BUILDP = { '직선적': { PAC: .6, PHY: .4, SHO: .3 }, '측면 공략': { PAC: .4, PAS: .4, DRI: .3 }, '역습': { PAC: .7, SHO: .3, PHY: .2 }, '점유율': { PAS: .7, DRI: .5 }, '중앙 침투': { DRI: .5, PAS: .5, SHO: .3 } };
const DEFP = { '전방 압박': { PHY: .5, PAC: .3, DEF: .3 }, '낮은 블록': { DEF: .6, PHY: .3 }, '중간 블록': { DEF: .3, PAS: .2 } };
function styleFit(S, M) {
  const p = S.p; if (p.pos === 'GK') return clamp(N(0, .35) + (M.q || 0) * .2, -1, 1);
  const f = WC.six(p), m = f.reduce((a, x) => a + x[2], 0) / f.length, z = {}; for (const [k, , v] of f) z[k] = (v - m) / 10;
  const pref = {}; for (const src of [BUILDP[M.build] || {}, DEFP[M.def] || {}]) for (const k in src) pref[k] = (pref[k] || 0) + src[k];
  let s = 0; for (const k in pref) s += pref[k] * (z[k] || 0);
  const r = C.seeded ? C.seeded('fit|' + M.n + '|' + p.name)() : R();
  let fit = s * .8 + (r - .5) * .6;
  if (has(S, 'free') && M.def === '전방 압박') fit -= .15;
  if (has(S, 'pro')) fit += .08;
  return clamp(fit, -1, 1);
}
WC.styleFit = styleFit;
// 감독이 바뀌었는지 (같은 구단에서 경질·교체, 또는 내가 구단을 옮김)
WC.mgrCheck = function (S, init) {
  const cid = S.car.club, w = S.w; if (!cid || !w.clubs[cid] || !C.mgrOf) return null;
  let M = null; try { M = C.mgrOf(w, cid); } catch (e) { M = null; }
  if (!M || !M.n) return null;
  const R0 = rel(S).mgr;
  if (R0 && R0.n === M.n && R0.c === cid) return null;
  const fit = styleFit(S, M);
  const v = clamp(fit * .45 + N(0, .18) + (S.p.rep - 40) * .003, -.7, .7);
  rel(S).mgr = { n: M.n, c: cid, v, fit, d0: w.cal ? w.cal.d : 0, past: R0 && R0.c === cid ? R0.n : null };
  S.wc.rb = v * 2.2;
  if (!init && R0 && R0.c === cid) {
    // 같은 구단에 새 감독: 지난 감독과 쌓은 것은 대부분 사라진다
    S.car.trust = clamp(50 + v * 14 + (S.car.trust - 50) * .25, 0, 100);
    S.wc.q.push({ id: 'newMgr', force: 1 });
    WC.note(S, `새 감독 ${M.n} 부임 (전임 ${R0.n})`, 0);
  }
  return M;
};
// 동료 관계: 같은 자리 경쟁자·베테랑·또래
const GRPX = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LW: 'A', RW: 'A', LM: 'A', RM: 'A', ST: 'A' };
function squadOf(S) { const c = S.w.clubs[S.car.club]; return c && c.sq ? c.sq : []; }
function mateCands(S, kind) {
  const p = S.p, me = C.ovrOf(p), slot = C.SLOT[p.pos], sq = squadOf(S), have = new Set(rel(S).mates.filter(m => m.c === S.car.club).map(m => String(m.id)));
  const ok = e => !have.has(String(e[0])) && e[0] !== 'ME';
  if (kind === 'rival') return sq.filter(e => ok(e) && C.SLOT[e[1]] === slot && Math.abs(e[2] - me) <= 6).sort((a, b) => Math.abs(a[2] - me) - Math.abs(b[2] - me));
  if (kind === 'mentor') return sq.filter(e => ok(e) && e[3] >= 29 && e[3] - p.age >= 7 && (GRPX[e[1]] === GRPX[p.pos] || e[5] === p.nat)).sort((a, b) => b[2] - a[2]);
  if (kind === 'mentee') return sq.filter(e => ok(e) && e[3] <= 21 && p.age - e[3] >= 7 && (GRPX[e[1]] === GRPX[p.pos] || e[5] === p.nat)).sort((a, b) => b[4] - a[4]);
  return sq.filter(e => ok(e) && Math.abs(e[3] - p.age) <= 3).sort((a, b) => (b[5] === p.nat) - (a[5] === p.nat) || b[2] - a[2]);
}
WC.mateCands = mateCands;
function addMate(S, e, k, v) {
  const L = rel(S).mates, id = String(e[0]);
  let m = L.find(x => String(x.id) === id);
  if (!m) { m = { id, n: C.pName(S.w, e), k, v: 0, c: S.car.club, pos: e[1], y: S.w.year }; L.unshift(m); }
  m.k = k; m.v = clamp(m.v + v, -1, 1); m.c = S.car.club;
  if (L.length > 14) L.length = 14;
  return m;
}
WC.addMate = addMate;
function initMates(S, first) {
  // 새 구단: 같은 국적 동료가 있으면 먼저 말을 건다 (가끔)
  const sq = squadOf(S), p = S.p;
  const comp = sq.filter(e => e[5] === p.nat && e[0] !== 'ME');
  if (comp.length && R() < (first ? .8 : .6)) addMate(S, pick(comp), 'friend', rnd(.15, .35));
  else if (R() < .4) { const c = mateCands(S, 'peer'); if (c.length) addMate(S, c[0], 'friend', rnd(.05, .2)); }
}
WC.initMates = initMates;
const MATEK = { friend: '친구', rival: '경쟁자', mentor: '멘토', mentee: '후배', cold: '서먹함' };
WC.MATEK = MATEK;

// 관계를 말로 (숫자 없이). 같은 값이어도 문장이 조금씩 달라지도록 선수 이름으로 고정된 변주
const lv = v => v >= .55 ? 4 : v >= .2 ? 3 : v > -.2 ? 2 : v > -.55 ? 1 : 0;
WC.mgrText = v => ['관계가 냉랭하다', '불만이 쌓이고 있다', '아직 지켜보는 중이다', '좋게 평가한다', '전폭적으로 믿는다'][lv(v)];
WC.fanText = v => ['야유가 나온다', '시선이 차갑다', '평범하다', '응원가가 들린다', '우상으로 여긴다'][lv(v)];
WC.ntText = v => ['명단에서 멀어졌다', '눈 밖에 났다', '관찰 대상', '꾸준히 지켜본다', '핵심 자원으로 본다'][lv(v)];
WC.mateText = (k, v) => k === 'rival' ? (v > .2 ? '선의의 경쟁' : v < -.3 ? '날 선 경쟁' : '주전 경쟁') : k === 'mentor' ? (v > .3 ? '많이 배운다' : '조언을 해 준다') : k === 'mentee' ? (v > .3 ? '나를 따른다' : '가끔 조언한다') : k === 'cold' ? '사이가 틀어졌다' : v > .45 ? '절친' : v > .15 ? '친한 사이' : '말을 트는 사이';
WC.relLv = lv;

// ---------- 경기 뒤 ----------
// 매 경기: 관계가 조금씩 움직이고, 확률에 따라 대화·사건이 생긴다 (자동 정지 빈도 설정에 따라)
const PAUSE = { often: .13, normal: .07, rare: .035, off: 0 };
WC.PAUSE = PAUSE;
const isBig = (S, m) => {
  if (m.comp === 'nt' || m.comp === 'ntY') return m.compName !== 'A매치' && !/친선/.test(m.compName || '');
  if (/결승|준결승|8강|16강|플레이오프/.test(m.stage || '')) return true;
  if (m.comp === 'cont' || /챔피언스|유로파|컨퍼런스|리베르타|AFC/.test(m.compName || '')) return true;
  const my = S.ss && S.ss.club; if (my && m.opp && C.rivalOf && C.rivalOf(my, m.opp) >= 2) return true;
  return false;
};
WC.isBig = isBig;
WC.onMatch = function (S, m) {
  if (!S.wc || !S.ss) return { ev: null, watch: false };
  const W = S.wc, nt = m.comp === 'nt' || m.comp === 'ntY', youth = m.comp === 'youth';
  WC.mgrCheck(S);
  const r = m.played && m.rating ? m.rating : null;
  // 출전 기록 (1군 경기만): S 선발 · B 교체 · X 명단 제외/결장
  if (!nt && !youth) { W.sel.push(m.played ? (m.start ? 'S' : 'B') : (m.why === '부상' ? 'I' : 'X')); if (W.sel.length > 12) W.sel.shift(); }
  if (r) {
    const d = r - 6.8;
    if (nt) ntV(S, d * .035);
    else if (!youth) {
      mgrV(S, d * .012);
      fansV(S, d * .03 + (m.st && m.st.goals ? .02 * m.st.goals : 0) + (isBig(S, m) ? d * .02 : 0));
      if (has(S, 'media') || has(S, 'comp')) S.p.rep = clamp(S.p.rep + (has(S, 'media') ? .15 : 0) + (d > .8 ? .2 : 0), 0, 100);
    }
  }
  // 높은 주급: 부진하면 팬 시선이 더 빨리 차가워진다 / 홍보팀: 좋은 경기 뒤 명성이 조금 더
  if (r && !nt && !youth) { if (S.wc.star && r < 6.5) fansV(S, (r - 6.8) * .02); if (S.wc.sup && S.wc.sup.pr && r >= 7.3) S.p.rep = clamp(S.p.rep + .25, 0, 100); }
  // 약속받은 역할 확인 (리그 10경기 뒤 한 번)
  const P = S.wc.promise;
  if (P && !P.chk && P.club === S.car.club && !nt && !youth) { const lgm = S.ss.matches.filter(x => x.comp === 'league'); if (lgm.length >= 10) { P.chk = 1; const stt = lgm.slice(-10).filter(x => x.start).length; if (stt < (P.role === 'key' ? 7 : 5)) W.q.push({ id: 'promise', force: 1 }); else WC.note(S, '약속받은 역할대로 뛰고 있다', 1); } }
  // 관계는 시간이 지나면 조금씩 무뎌진다
  for (const x of rel(S).mates) x.v *= .995;
  // 사건
  let ev = null;
  if (W.q.length) { const q = W.q.shift(); ev = buildWC(S, q.id, m, q) || null; }
  if (!ev && !youth && PAUSE[W.pause] && R() < PAUSE[W.pause]) ev = drawLive(S, m);
  const watch = !youth && !nt && W.watch !== 'none' && (W.watch === 'all' ? m.played || R() < .35 : isBig(S, m) && (m.played || R() < .5));
  return { ev, watch };
};
// 시즌 끝: 관계가 정리되고, 성장·경험에 따라 성격이 덧붙는다
function seasonRel(S, rec) {
  const W = S.wc; if (!rec) return;
  // 오래 머문 구단 → 충성파, 주전으로 오래 → 리더형, 큰 성장 → 승부욕
  if (S.car.years >= 3) lean(S, 'loyal', .6);
  if (S.p.age >= 27 && ['key', 'starter'].includes(rec.role)) lean(S, 'leader', .5);
  if (W.lastGrow && W.lastGrow.ev === 1) lean(S, 'comp', .5);
  if (S.p.rep >= 60) lean(S, 'media', .3);
  if (S.p.age >= 30) lean(S, 'mentor', .4);
  traitCheck(S);
  // 친구가 팀을 떠났는지
  const ids = new Set(squadOf(S).map(e => String(e[0])));
  for (const x of rel(S).mates) if (x.c === S.car.club && !ids.has(String(x.id)) && !x.gone) { x.gone = 1; if (x.k === 'friend' && x.v > .2) WC.note(S, `${x.n}이(가) 팀을 떠났다`, -1); }
}
// 성격 기울기: 선택이 쌓이면 확률적으로 새 성격이 붙는다
function lean(S, k, v) { const L = S.wc.lean; L[k] = (L[k] || 0) + v; }
WC.lean = lean;
function traitCheck(S) {
  const W = S.wc, L = W.lean, got = [];
  for (const k in L) {
    if (!PER[k] || W.per.includes(k)) continue;
    const p = clamp((L[k] - 1.6) * .22, 0, .7);
    if (p > 0 && R() < p) { W.per.push(k); L[k] = 0; got.push(k); WC.note(S, `성격이 생겼다: ${PER[k][0]}`, 1); C.news(S, `${S.p.name}, 새로운 면모 — ${PER[k][0]}`, 'info', false); }
  }
  // 상반된 성격은 하나가 밀려난다
  const OPP = [['hot', 'humble'], ['quiet', 'media'], ['loyal', 'amb']];
  for (const [a, b] of OPP) if (W.per.includes(a) && W.per.includes(b)) { const drop = got.includes(a) ? b : a; W.per = W.per.filter(x => x !== drop); WC.note(S, `${PER[drop][0]} 성향이 옅어졌다`, 0); }
  return got;
}
WC.traitCheck = traitCheck;

// ---------- 사건 (월드 커리어 전용) ----------
// 형식은 기존 이벤트와 같다: { title, desc, icon, opts:[{label, desc, out:[O(p, chip, good, eff, text)]}] }
// out.wc: 관계 변화 { mgr, fans, nt, mate:{e,k,v}, lean:{k:v}, req, loan }
const O = (p, chip, good, eff, text, wc) => ({ p, chip, good, eff: eff || {}, text, wc });
const mgrName = S => (rel(S).mgr || {}).n || '감독';
const clubName = S => (S.w.clubs[S.car.club] || {}).name || '';
const recentStarts = S => S.wc.sel.slice(-5).filter(x => x === 'S').length;
const benched = S => { const s = S.wc.sel.slice(-4); return s.length >= 4 && s.filter(x => x === 'X' || x === 'B').length >= 3; };
const mv = S => (rel(S).mgr || {}).v || 0;
// 확률은 숨은 관계 값에서 나온다 (같은 선택도 상황에 따라 결과가 다르다)
const pr = (base, x) => clamp(base + x, .08, .92);
const WEV = {
  newMgr: { w: 0, build: S => { const M = rel(S).mgr || {}, Mx = (S.w.mgr || {})[S.car.club] || {}; return { title: `새 감독 ${M.n} 부임`, desc: `${clubName(S)}에 새 감독이 왔습니다${M.past ? ` (전임 ${M.past})` : ''}. ${Mx.build ? `${Mx.build} 축구에 ${Mx.def ? C.jo(Mx.def, '을', '를') : '자기 방식을'} 쓰는 감독입니다. ` : ''}첫 면담 자리에서 어떤 모습을 보일까요?`, icon: 'whistle', opts: [
    { label: '적극적으로 어필한다', desc: '내가 팀에 왜 필요한지 말한다', out: [O(pr(.5, M.fit * .35), '감독이 흥미를 보였다', 1, {}, '감독이 당신의 의욕을 마음에 들어 합니다.', { mgr: .18, lean: { amb: .4 } }), O(1, '부담스러워하는 눈치', -1, {}, '감독은 말보다 훈련장을 보겠다고 합니다.', { mgr: -.08 })] },
    { label: '훈련장에서 보여 준다', desc: '말없이 증명한다', out: [O(pr(.6, M.fit * .3), '묵묵한 태도가 눈에 띄었다', 1, {}, null, { mgr: .1, lean: { quiet: .3, pro: .3 } }), O(1, '아직 존재감이 없다', 0, {}, null, { mgr: 0 })] },
    { label: '미래를 고민한다고 털어놓는다', desc: '이적도 생각하고 있다고 솔직하게', out: [O(1, '감독이 이적을 막지 않겠다고 했다', 0, { transferReq: 1 }, '다음 이적시장에서 제안이 늘어날 수 있습니다.', { mgr: -.15, fans: -.05, lean: { amb: .5 } })] }] }; } },
  bench: { w: S => benched(S) && S.car.status !== 'youth' ? 3 : 0, build: S => ({ title: '감독실 문을 두드릴까', desc: `최근 경기에서 거의 기회를 받지 못했습니다. ${mgrName(S)} 감독과 이야기할 수 있습니다.`, icon: 'brief', opts: [
    { label: '출전 시간을 요구한다', desc: '분명하게 말한다', out: [O(pr(.42, mv(S) * .45 + (S.p.rep - 40) * .004), '다음 몇 경기 기회를 주겠다는 답', 1, {}, '감독이 기회를 약속했습니다. 증명할 차례입니다.', { mgr: .05, rb: 1.2, lean: { amb: .4 } }), O(1, '감독이 불쾌해했다', -1, {}, '"자리는 훈련장에서 따는 겁니다."', { mgr: -.16, lean: { hot: .5 } })] },
    { label: '훈련으로 증명한다', desc: '불평 없이 기다린다', out: [O(pr(.5, mv(S) * .3), '코치진이 태도를 칭찬했다', 1, {}, null, { mgr: .1, lean: { pro: .5, humble: .3 } }), O(1, '달라진 건 없다', 0, { morale: -5 }, null, { mgr: .02 })] },
    { label: '임대를 원한다고 말한다', desc: S.p.age <= 23 ? '뛸 수 있는 곳으로' : '출전 우선', out: [O(1, '구단이 임대처를 알아보기로 했다', 0, { loanReq: 1, transferReq: S.p.age > 23 ? 1 : 0 }, null, { mgr: -.04 })] }] }) },
  praise: { w: (S, m) => m && m.played && m.rating >= 7.9 ? 2.5 : 0, build: (S, m) => ({ title: '감독의 공개 칭찬', desc: `${m.oppName}전 활약 뒤 ${mgrName(S)} 감독이 기자회견에서 당신 이름을 먼저 꺼냈습니다.`, icon: 'star', opts: [
    { label: '동료들 덕분이라고 말한다', desc: '공을 돌린다', out: [O(1, '라커룸 분위기가 좋아졌다', 1, {}, null, { mgr: .05, mates: .08, lean: { humble: .6 } })] },
    { label: '자신감을 드러낸다', desc: '"더 할 수 있다"', out: [O(pr(.6, has(S, 'media') ? .15 : 0), '팬들이 환호했다', 1, { rep: 2 }, null, { fans: .08, lean: { media: .4, amb: .3 } }), O(1, '건방지다는 기사가 났다', -1, { rep: -1 }, null, { mates: -.06, lean: { hot: .3 } })] },
    { label: '조용히 넘어간다', desc: '인터뷰는 짧게', out: [O(1, '별일 없이 지나갔다', 0, {}, null, { lean: { quiet: .4 } })] }] }) },
  tactic: { w: S => S.car.status === 'first' && S.p.pos !== 'GK' ? 1 : 0, build: S => { const df = ['CB', 'CDM', 'LB', 'RB'].includes(S.p.pos); return { title: '감독의 새 지시', desc: df ? '감독이 공격 전개에 더 많이 가담하라고 요구합니다. 익숙하지 않은 역할입니다.' : '감독이 수비 가담과 압박을 더 많이 하라고 요구합니다. 공격에 쓸 힘이 줄어듭니다.', icon: 'tactic', opts: [
    { label: '지시를 따른다', desc: '새 역할에 맞춘다', out: [O(pr(.65, has(S, 'free') ? -.2 : 0), '감독이 만족했다', 1, { group: df ? { PAS: .8, DRI: .4 } : { DEF: .9, PHY: .5 } }, null, { mgr: .12, lean: { pro: .3 } }), O(1, '어색한 역할에 고전', -1, { form: -1, formWhy: '새 역할 적응' }, null, { mgr: .04 })] },
    { label: '내 스타일을 고집한다', desc: '잘하는 것을 한다', out: [O(pr(.35, mv(S) * .4), '결과로 감독을 설득했다', 1, {}, null, { mgr: .04, lean: { free: .6 } }), O(1, '감독과 냉랭해졌다', -1, {}, null, { mgr: -.18, lean: { free: .5, hot: .3 } })] }] }; } },
  dinner: { w: S => mateCands(S, 'peer').length ? 1 : 0, build: S => { const e = mateCands(S, 'peer')[0]; const n = C.pName(S.w, e); return { title: `${n}의 저녁 초대`, desc: `또래 동료 ${n}(${e[1]}, ${e[3]}세)이 저녁을 같이 먹자고 합니다.`, icon: 'party', e, opts: [
    { label: '간다', desc: '팀 밖에서도 가까워진다', out: [O(.85, `${n}과 가까워졌다`, 1, { morale: 5 }, null, { mate: { k: 'friend', v: .35 }, lean: { leader: .2 } }), O(1, '어색한 자리였다', 0, {}, null, { mate: { k: 'friend', v: .08 } })] },
    { label: '정중히 사양한다', desc: '쉬고 싶다', out: [O(1, '다음에 보자고 했다', 0, {}, null, { mate: { k: 'friend', v: .02 }, lean: { quiet: .3 } })] }] }; } },
  rivalry: { w: S => S.car.status === 'first' && mateCands(S, 'rival').length ? (has(S, 'comp') ? 1.6 : 1) : 0, build: S => { const e = mateCands(S, 'rival')[0]; const n = C.pName(S.w, e); return { title: `주전 경쟁: ${n}`, desc: `같은 자리의 ${n}(${e[3]}세)과 훈련장에서 신경전이 붙었습니다.`, icon: 'feud', e, opts: [
    { label: '정면으로 맞선다', desc: '훈련에서 밀리지 않는다', out: [O(pr(.5, has(S, 'comp') ? .12 : 0), '훈련장에서 우위를 보였다', 1, {}, null, { mgr: .1, rb: .8, mate: { k: 'rival', v: -.15 }, lean: { comp: .5 } }), O(1, '오히려 밀렸다', -1, {}, null, { mgr: -.06, rb: -.6, mate: { k: 'rival', v: -.1 } })] },
    { label: '먼저 손을 내민다', desc: '경쟁은 경기장에서만', out: [O(.7, '선의의 경쟁자가 됐다', 1, {}, null, { mate: { k: 'rival', v: .35 }, lean: { humble: .4, leader: .3 } }), O(1, '받아 주지 않았다', 0, {}, null, { mate: { k: 'rival', v: -.05 } })] },
    { label: '신경 쓰지 않는다', desc: '내 할 일만', out: [O(1, '아무 일도 없었다', 0, {}, null, { mate: { k: 'rival', v: 0 }, lean: { quiet: .3 } })] }] }; } },
  mentor: { w: S => S.p.age <= 23 && mateCands(S, 'mentor').length ? 1.2 : 0, build: S => { const e = mateCands(S, 'mentor')[0]; const n = C.pName(S.w, e); return { title: `베테랑 ${n}의 제안`, desc: `${e[3]}세 베테랑 ${n}이 훈련 뒤 따로 남아 보자고 합니다.`, icon: 'mentor', e, opts: [
    { label: '매일 남는다', desc: '경험을 흡수한다', out: [O(.75, `${n}에게 많이 배웠다`, 1, { pot: 1, group: { DRI: .5 } }, null, { mate: { k: 'mentor', v: .45 }, lean: { pro: .4 } }), O(1, '방식이 맞지 않았다', 0, {}, null, { mate: { k: 'mentor', v: .05 } })] },
    { label: '내 루틴을 지킨다', desc: '정중히 사양', out: [O(1, '아쉬워하는 눈치', 0, {}, null, { mate: { k: 'mentor', v: -.05 }, lean: { free: .3 } })] }] }; } },
  mentee: { w: S => S.p.age >= 28 && mateCands(S, 'mentee').length ? (has(S, 'leader') || has(S, 'mentor') ? 1.6 : .9) : 0, build: S => { const e = mateCands(S, 'mentee')[0]; const n = C.pName(S.w, e); return { title: `후배 ${n}의 부탁`, desc: `${e[3]}세 유망주 ${n}이 경기 운영을 가르쳐 달라고 합니다.`, icon: 'mentor', e, opts: [
    { label: '시간을 내 준다', desc: '아는 걸 나눈다', out: [O(1, `${n}이 당신을 따른다`, 1, {}, null, { mate: { k: 'mentee', v: .45 }, mgr: .05, lean: { mentor: .7, leader: .4 } })] },
    { label: '내 경기에 집중한다', desc: '나도 아직 경쟁 중이다', out: [O(1, '후배가 머쓱해했다', 0, {}, null, { mate: { k: 'mentee', v: -.05 } })] }] }; } },
  press: { w: (S, m) => !m || !m.played || (m.st && m.st.min < 20) ? 0 : isBig(S, m) ? (has(S, 'media') ? 2 : has(S, 'quiet') ? .4 : 1.2) : (has(S, 'media') ? .6 : .2), build: (S, m) => { const win = m && m.gf > m.ga, loss = m && m.gf < m.ga; return { title: '경기 뒤 인터뷰', desc: m ? `${m.oppName}전 ${m.gf}-${m.ga} ${win ? '승리' : loss ? '패배' : '무승부'} 뒤 믹스트존에서 기자들이 붙잡습니다.` : '기자들이 인터뷰를 요청합니다.', icon: 'phone', opts: [
    { label: '팀을 이야기한다', desc: '모범 답안', out: [O(1, '무난한 인터뷰', 0, {}, null, { mgr: .03, lean: { humble: .3 } })] },
    { label: loss ? '부진을 내 탓으로 돌린다' : '내 활약을 어필한다', desc: loss ? '책임을 진다' : '존재감을 드러낸다', out: loss ? [O(1, '팬들이 진정성을 높이 샀다', 1, {}, null, { fans: .08, lean: { leader: .4 } })] : [O(.6, '헤드라인을 장식했다', 1, { rep: 2 }, null, { fans: .04, lean: { media: .5 } }), O(1, '동료들이 눈살을 찌푸렸다', -1, {}, null, { mates: -.06, lean: { hot: .2 } })] },
    { label: loss ? '감독 선택을 비판한다' : '감독 전술에 의문을 던진다', desc: '하고 싶은 말을 한다', out: [O(.35, '팬들은 당신 편', 0, { rep: 1 }, null, { mgr: -.22, fans: .1, lean: { hot: .7 } }), O(1, '구단이 벌금을 매겼다', -1, { money: -Math.max(3000, (S.car.wage || 1000) * 2) }, null, { mgr: -.28, lean: { hot: .7 } })] }] }; } },
  fans: { w: S => { const v = rel(S).fans[S.car.club] || 0, r = S.ss && S.ss.recent ? S.ss.recent.slice(-4) : []; const a = r.length ? r.reduce((x, y) => x + y, 0) / r.length : 6.8; return S.car.status === 'first' && (a >= 7.3 || a <= 6.3 || Math.abs(v) > .5) ? 1.4 : 0; }, build: S => { const r = S.ss.recent.slice(-4), a = r.reduce((x, y) => x + y, 0) / r.length, good = a >= 6.8; return { title: good ? '팬들의 응원가' : '홈 팬들의 야유', desc: good ? '서포터즈가 당신 이름을 넣은 응원가를 만들었습니다.' : '최근 부진에 홈 팬들 일부가 야유를 보냈습니다.', icon: good ? 'star' : 'rain', opts: good ? [
    { label: '경기 뒤 서포터즈석으로 간다', desc: '감사 인사', out: [O(1, '팬들과 한층 가까워졌다', 1, { morale: 6 }, null, { fans: .15, lean: { loyal: .4 } })] },
    { label: 'SNS에 짧게 감사를 남긴다', desc: '조용히', out: [O(1, '팬들이 반겼다', 1, {}, null, { fans: .06 })] }] : [
    { label: '박수를 치며 받아들인다', desc: '더 잘하겠다는 뜻', out: [O(.7, '분위기가 누그러졌다', 1, {}, null, { fans: .1, lean: { humble: .4 } }), O(1, '야유가 이어졌다', -1, { morale: -6 }, null, { fans: -.02 })] },
    { label: '귀를 막는 세리머니', desc: '골을 넣고 보여 준다', out: [O(.4, '결과로 입을 막았다', 1, { rep: 1 }, null, { fans: .05, lean: { hot: .4 } }), O(1, '팬들과 척을 졌다', -1, {}, null, { fans: -.2, mgr: -.05, lean: { hot: .6 } })] },
    { label: '무시한다', desc: '신경 쓰지 않는다', out: [O(1, '시간이 해결할 것이다', 0, {}, null, { lean: { quiet: .3 } })] }] }; } },
  rumor: { w: S => { const r = S.ss && S.ss.recent ? S.ss.recent : []; const a = r.length >= 3 ? r.reduce((x, y) => x + y, 0) / r.length : 0; return S.car.status === 'first' && a >= 7.1 ? (has(S, 'amb') ? 2 : 1) : 0; }, build: S => { const my = S.w.clubs[S.car.club]; const big = Object.values(S.w.clubs).filter(c => c.lg && c.id !== S.car.club && c.str >= my.str + 3 && c.str <= my.str + 12); const c = big.length ? pick(big) : null; const nm = c ? c.name : '빅클럽'; return { title: `${nm} 이적설`, desc: `${nm}이(가) 당신을 지켜보고 있다는 보도가 나왔습니다. 기자들이 반응을 묻습니다.`, icon: 'swap', opts: [
    { label: '"여기서 행복하다"', desc: '소문을 일축한다', out: [O(1, '팬과 구단이 안도했다', 1, {}, null, { fans: .12, mgr: .06, lean: { loyal: .6 } })] },
    { label: '여지를 남긴다', desc: '"축구는 모르는 일"', out: [O(1, '제안이 들어올 가능성이 커졌다', 0, { transferReq: 1 }, null, { fans: -.1, mgr: -.06, lean: { amb: .6 } })] },
    { label: '에이전트에게 맡긴다', desc: '말을 아낀다', out: [O(1, '조용히 지나갔다', 0, {}, null, { lean: { quiet: .2 } })] }] }; } },
  captain: { w: S => S.car.status === 'first' && S.p.age >= 23 && ['key', 'starter'].includes(S.ss.role) && mv(S) > .1 && !S.wc.capY ? (has(S, 'leader') ? 1.4 : .5) : 0, build: S => ({ title: '주장 대행', desc: '주장이 부상으로 빠졌습니다. 감독이 당분간 완장을 맡아 달라고 합니다.', icon: 'band', opts: [
    { label: '맡는다', desc: '책임을 진다', out: [O(.75, '라커룸을 잘 이끌었다', 1, { rep: 2 }, null, { mgr: .12, mates: .06, lean: { leader: .8 }, cap: 1 }), O(1, '부담감에 흔들렸다', -1, { form: -1, formWhy: '주장 부담' }, null, { mgr: .03, lean: { leader: .3 }, cap: 1 })] },
    { label: '사양한다', desc: '내 경기에 집중', out: [O(1, '감독이 아쉬워했다', 0, {}, null, { mgr: -.04, lean: { quiet: .3 } })] }] }) },
  ntCall: { w: S => S.ss && S.ss.nt && S.ss.nt.lvl === 'A' && !S.wc.ntMet ? 2 : 0, build: S => { const M = C.ntMgrOf ? C.ntMgrOf(S.w, S.p.nat) : null; return { title: '대표팀 감독의 전화', desc: `${M ? M.n + ' ' : ''}대표팀 감독이 직접 연락했습니다. 다음 소집에 부를 생각이라고 합니다.`, icon: 'flag', opts: [
    { label: '어떤 역할이든 하겠다', desc: '헌신을 약속한다', out: [O(1, '감독이 좋아했다', 1, {}, null, { nt: .25, ntMet: 1, lean: { humble: .3 } })] },
    { label: '주전 자리를 원한다고 말한다', desc: '야망을 드러낸다', out: [O(.5, '자신감을 높이 샀다', 1, {}, null, { nt: .15, ntMet: 1, lean: { amb: .4 } }), O(1, '건방지다는 인상을 남겼다', -1, {}, null, { nt: -.12, ntMet: 1, lean: { hot: .3 } })] }] }; } },
  derby: { w: (S, m) => { const my = S.ss && S.ss.club; const fx = C.userFixtures ? C.userFixtures(S).filter(f => !f.done && f.d > S.w.cal.d && f.d <= S.w.cal.d + 10 && f.opp && C.rivalOf(my, f.opp) >= 2) : []; return fx.length && S.car.status === 'first' ? 2.2 : 0; }, build: S => { const my = S.ss.club; const f = C.userFixtures(S).find(f => !f.done && f.d > S.w.cal.d && f.opp && C.rivalOf(my, f.opp) >= 2); const oc = S.w.clubs[f.opp]; return { title: `${oc.name}전을 앞두고`, desc: `라이벌전이 다가옵니다. 상대 선수가 언론에서 도발했습니다.`, icon: 'fire', opts: [
    { label: '맞받아친다', desc: '"경기장에서 보자"', out: [O(1, '팬들이 열광했다', 1, {}, null, { fans: .12, lean: { hot: .4, comp: .3 } })] },
    { label: '경기로 대답한다', desc: '말을 아낀다', out: [O(1, '감독이 차분함을 칭찬했다', 1, {}, null, { mgr: .06, lean: { pro: .3 } })] }] }; } }
};
WC.WEV = WEV;
function buildWC(S, id, m, q) {
  const E = WEV[id]; if (!E) return null;
  let b; try { b = E.build(S, m, q); } catch (e) { console.error(e); return null; }
  if (!b) return null;
  b.id = 'wc_' + id; b.wc = 1; // 관계 변화는 C.resolveEvent 감싸개에서 적용 (저장 뒤에도 유지되도록 함수는 넣지 않는다)
  return b;
}
function drawLive(S, m) {
  const pool = Object.keys(WEV).filter(k => !(S.wc.recent || []).includes(k)).map(k => { let w = 0; try { w = typeof WEV[k].w === 'function' ? WEV[k].w(S, m) : WEV[k].w; } catch (e) { w = 0; } return [k, w]; }).filter(x => x[1] > 0);
  const k = wpick(pool, x => x[1]); if (!k) return null;
  S.wc.recent = (S.wc.recent || []).concat(k[0]).slice(-4);
  return buildWC(S, k[0], m);
}
WC.drawLive = drawLive;
function applyWC(S, b, x) {
  if (!x) return;
  if (x.mgr) mgrV(S, x.mgr * (x.mgr < 0 && has(S, 'hot') ? 1.2 : 1));
  if (x.rb) { S.wc.rb = (S.wc.rb || 0) + x.rb; if (S.ss) C.updateRole(S); }
  if (x.fans) fansV(S, x.fans);
  if (x.nt) ntV(S, x.nt);
  if (x.ntMet) S.wc.ntMet = 1;
  if (x.cap) S.wc.capY = S.w.year;
  if (x.mate && b.e) addMate(S, b.e, x.mate.k, x.mate.v);
  if (x.mates) for (const m of rel(S).mates) if (m.c === S.car.club) m.v = clamp(m.v + x.mates, -1, 1);
  if (x.lean) for (const k in x.lean) lean(S, k, x.lean[k]);
  traitCheck(S);
}
WC.applyWC = applyWC;

// ---------- 기존 사건에서 고를 것 ----------
// 훈련·상점·돈으로 능력치를 사는 사건, 가짜 경질 사건은 뺀다
const KEEP = ['feud', 'mentor', 'poschange', 'party', 'sns', 'slump', 'rival', 'captain', 'agent', 'raise', 'callup', 'bet', 'charity', 'rumor', 'veteran', 'family', 'derby', 'bench', 'injrush', 'interview', 'heat', 'sponsor', 'language', 'homesick', 'pain', 'newrole', 'mentee', 'fanclash', 'bonus', 'tour', 'number', 'critique', 'teammateinj', 'redcard', 'poach', 'stream', 'double'];
// 칩의 숫자를 말로 바꾼다 (감독 신뢰·사기·명성·성장세)
function qual(t) {
  if (!t) return t;
  return String(t)
    .replace(/(감독 )?신뢰 ?([+−-])\s?\d+/g, (_, a, s) => s === '+' ? '감독 평가 상승' : '감독 평가 하락')
    .replace(/사기 ?([+−-])\s?\d+/g, (_, s) => s === '+' ? '기분 좋아짐' : '기분 가라앉음')
    .replace(/명성 ?([+−-])\s?\d+/g, (_, s) => s === '+' ? '명성 상승' : '명성 하락')
    .replace(/성장세 ?([+−-])\s?\d+/g, (_, s) => s === '+' ? '성장 여지 커짐' : '성장 여지 줄어듦')
    .replace(/([+−-])(\d+) OVR/g, (_, s) => s === '+' ? '기량 상승' : '기량 하락')
    .replace(/\(1시즌 ([+−-])\d+\)/g, (_, s) => s === '+' ? '(한동안 상승세)' : '(한동안 부진)')
    .replace(/컨디션 ([+−-])\d+ ?(\(1시즌\))?/g, (_, s) => s === '+' ? '컨디션 상승' : '컨디션 저하');
}
WC.qual = qual;
function qualEvent(b) { for (const o of b.opts || []) for (const x of o.out || []) x.chip = qual(x.chip); return b; }
WC.qualEvent = qualEvent;
const de0 = C.drawEvents;
C.drawEvents = function (S, when, n) {
  if (!S.wc) return de0(S, when, n);
  // 기존 사건 중 고른 것 + 월드 커리어 사건
  let out = [];
  const E = C._EVENTS || [];
  const saveRecent = S.recentEv;
  if (when === 'pre' && C._drawCross) { const x = C._drawCross(S); if (x) { out.push(qualEvent(x)); n = Math.max(0, n - 1); } }
  const fam = S.wc.sup && S.wc.sup.family;
  const pool = E.filter(e => KEEP.includes(e.id) && e.when.includes(when) && !(S.recentEv || []).includes(e.id) && !(fam && ['homesick', 'language'].includes(e.id) && R() < .8) && (!e.cond || safe(() => e.cond(S))));
  const wpool = Object.keys(WEV).filter(k => !['newMgr', 'praise', 'press', 'ntCall', 'derby'].includes(k)).map(k => [k, safe(() => typeof WEV[k].w === 'function' ? WEV[k].w(S, null) : 0) || 0]).filter(x => x[1] > 0);
  for (let i = 0; i < n; i++) {
    if (wpool.length && R() < .55) { const k = wpick(wpool, x => x[1]); wpool.splice(wpool.indexOf(k), 1); const b = buildWC(S, k[0], null); if (b) { out.push(qualEvent(b)); continue; } }
    if (!pool.length) continue;
    const e = wpick(pool, x => x.w); pool.splice(pool.indexOf(e), 1);
    const b = e.build(S); b.id = e.id; b.ev = e; if (C._balanceEvent) C._balanceEvent(S, b); out.push(qualEvent(b));
  }
  S.recentEv = (saveRecent || []).concat(out.map(e => e.id)).slice(-8);
  return out;
};
const safe = f => { try { return f(); } catch (e) { return 0; } };
// 사건 해결: 능력치 변화는 대분류로 모으고, 관계 변화를 적용한다
const re0 = C.resolveEvent;
C.resolveEvent = function (S, b, oi) {
  if (!S.wc) return re0(S, b, oi);
  const six0 = WC.six(S.p), o0 = C.ovrOf(S.p);
  const log = re0(S, b, oi);
  WC.norm(S.p);
  const o = (b.opts[oi].out || []).find(x => x.chip === log.chip);
  if (o && b.wc) applyWC(S, b, o.wc);
  if (o && !b.wc) {
    // 기존 사건의 감독 신뢰는 감독과의 관계로 옮긴다
    const tr = o.eff && o.eff.trust; if (tr) mgrV(S, tr * .012);
    if (o.eff && o.eff.morale && o.eff.morale > 0 && has(S, 'free')) S.p.morale = clamp(S.p.morale + 3, 0, 100);
  }
  const six1 = WC.six(S.p);
  log.six = six1.map((x, i) => [x[1], x[2] - six0[i][2]]).filter(x => x[1]);
  log.dOvr = C.ovrOf(S.p) - o0;
  log.changes = (log.changes || []).filter(([k]) => !['감독 신뢰', '명성', '재산'].includes(k) && !C.ALABEL_SET.has(k) && k !== 'OVR');
  return log;
};
C.ALABEL_SET = new Set(Object.values(C.ALABEL));

// ---------- 진행 단계 자동 처리 ----------
// 훈련 계획·시즌 목표는 없다. 결정적 순간(경기 중 개입)도 없다
WC.tick = function (S) {
  if (!S || !S.wc) return;
  let g = 0;
  while (g++ < 4) {
    if (S.phase === 'academy') { S.phase = 'training'; continue; }
    if (S.phase === 'training') { GM.setTraining(S, 'balance', 'normal'); if (S.ss) S.ss.momentsLeft = 0; continue; }
    if (S.phase === 'goal') { GM.pickGoal(S, -1); continue; }
    break;
  }
  if (S.ss) S.ss.momentsLeft = 0;
  WC.mgrCheck(S);
};
const hd0 = GM.halfDone;
GM.halfDone = function (S) {
  hd0(S);
  if (!S.wc) return;
  if (S.ss) S.ss.momentsLeft = 0;
  // 시즌 중반: 활약이 좋으면 위쪽 구단이 이적료를 제시하기도 한다 (구단이 받아들일지는 따로)
  if (S.phase === 'mid' && !S.winterOffers && S.car.status === 'first') {
    const r = S.ss.recent || [], a = r.length ? r.reduce((x, y) => x + y, 0) / r.length : 6.7;
    if (R() < clamp(.08 + (a - 6.9) * .35 + (has(S, 'amb') ? .08 : 0), 0, .45)) { const o = C.genOffers(S, 'winter').filter(x => x.type !== 'loan').slice(0, 2); if (o.length) S.winterOffers = o; }
  }
  if (S.winterOffers) WC.markOffers(S, S.winterOffers, 'winter');
};

// ---------- 이적: 구단의 수락 여부 ----------
// 제안마다 현 구단이 받아들였는지(acc)가 붙는다. 구단이 받아들인 제안을 거절하면 감독 평가·입지가 흔들리고,
// 구단이 거절한 제안을 밀어붙이면 이적이 막힐 수도 있다 (그때도 관계가 상한다)
WC.markOffers = function (S, list, win) {
  const cur = S.w.clubs[S.car.club], st = S.stance || {};
  const role = (S.ss && S.ss.role) || S.lastRole || (cur ? C.roleAt(S, cur) : 'rotation');
  for (const o of list || []) {
    if (o.acc != null) continue;
    o.rival = cur && C.rivalOf ? C.rivalOf(cur.id, o.club) : 0;
    if (o.type === 'loan') { o.acc = true; continue; }
    if (o.free || S.car.status === 'free' || st.expired || st.release || !cur) { o.acc = true; o.freeA = 1; continue; }
    let b = { key: .18, starter: .42, rotation: .68, backup: .88, reserve: .95, youth: .55 }[role] || .6;
    b += clamp((o.fee / Math.max(1, S.value || o.fee) - 1) * .45, -.2, .3);
    if (st.left === 1) b += .2; // 계약 마지막 해: 지금 팔지 않으면 공짜로 떠난다
    if (o.rival >= 2) b *= .45;
    if (win === 'winter') b -= .1;
    o.acc = R() < clamp(b, .04, .97);
    o.sell = o.acc && ['backup', 'reserve'].includes(role); // 구단이 정리하고 싶어 한다
  }
  return list;
};
const ow0 = GM.openWindow;
GM.openWindow = function (S) { ow0(S); if (S.wc) { WC.markOffers(S, S.offers, 'summer'); WC.mgrCheck(S); if (S.wc.sup && S.wc.sup.agent && R() < .45 && S.car.status !== 'youth') { const x = C.requestOffers(S, R() < .5 ? 'up' : 'same'); x.forEach(o => { delete o.req; o.agent = 1; }); S.offers = S.offers.concat(x.filter(o => !S.offers.some(y => y.club === o.club))); WC.markOffers(S, S.offers, 'summer'); }
  if (has(S, 'amb') && R() < .3 && S.car.status === 'first') { const x = C.requestOffers(S, 'up'); if (x.length) { x.forEach(o => { delete o.req; }); S.offers = S.offers.concat(x); WC.markOffers(S, S.offers, 'summer'); } } } };
const rm0 = GM.requestMove;
GM.requestMove = function (S, mode) { const got = rm0(S, mode); if (S.wc && got) { WC.markOffers(S, got, 'summer'); mgrV(S, -.05); fansV(S, -.04); lean(S, 'amb', .3); } return got; };
// 이적 결정
function leaveClub(S, o) {
  const cur = S.car.club, F = rel(S).fans;
  if (o.rival >= 2) { fansV(S, -.95, cur); WC.note(S, `라이벌 구단 이적 — ${(S.w.clubs[cur] || {}).name} 팬들이 등을 돌렸다`, -1); C.news(S, `${(S.w.clubs[cur] || {}).name} 팬들, 라이벌 이적을 택한 ${S.p.name}에 분노`, 'transfer', true); lean(S, 'amb', .4); }
  else if ((F[cur] || 0) > .3) fansV(S, -.15, cur);
  // 새 구단 팬: 라이벌에서 왔으면 처음엔 의심
  if (o.rival >= 2) F[o.club] = clamp((F[o.club] || 0) - .2, -1, 1);
}
function stayPenalty(S, list) {
  const accs = (list || []).filter(o => o.acc && !o.freeA && !o.withdrawn && o.type !== 'loan');
  if (!accs.length) return;
  const sell = accs.some(o => o.sell), k = has(S, 'loyal') ? .5 : 1;
  mgrV(S, -(sell ? .22 : .1) * k, sell ? '구단이 정리하려던 차에 잔류 — 입지가 좁아졌다' : '구단이 받아들인 이적을 거절했다');
  if (sell) { S.wc.rb = (S.wc.rb || 0) - 1.2; S.wc.q.push({ id: 'bench', force: 1 }); }
  fansV(S, has(S, 'loyal') ? .12 : .04);
  lean(S, 'loyal', .5);
}
const dw0 = GM.decideWindow;
GM.decideWindow = function (S, d) {
  if (!S.wc) return dw0(S, d);
  const st = S.stance || {}, before = S.car.club;
  if (d.kind === 'offer') {
    const o = S.offers[d.i];
    if (o && !o.acc) {
      // 구단 반대를 무릅쓰고 이적 요청: 성사될 수도, 막힐 수도 있다
      const p = clamp(.48 + (has(S, 'amb') ? .08 : 0) - (((S.ss && S.ss.role) || S.lastRole) === 'key' ? .15 : 0) - (o.rival >= 2 ? .2 : 0), .1, .8);
      if (R() >= p) {
        o.withdrawn = true; o.blocked = true;
        mgrV(S, -.2, `${(S.w.clubs[o.club] || {}).name} 이적을 요청했지만 구단이 막았다`); fansV(S, -.12); lean(S, 'amb', .5); lean(S, 'hot', .2);
        return { blocked: true };
      }
      fansV(S, -.1);
    }
    if (o) leaveClub(S, o);
    const r = dw0(S, d);
    if (S.car.club !== before) { rel(S).mgr = null; WC.mgrCheck(S, true); initMates(S); S.wc.rb = (rel(S).mgr || {}).v * 2.2 || 0; S.wc.sel = []; joinTerms(S, o); }
    return r;
  }
  if (['stay', 'renew', 'extend', 'youth', 'promote', 'back'].includes(d.kind) && !st.expired && !st.release) stayPenalty(S, S.offers);
  const r = dw0(S, d);
  if (S.car.club !== before) { rel(S).mgr = null; WC.mgrCheck(S, true); initMates(S); S.wc.sel = []; }
  return r;
};
const wm0 = GM.winterMove;
GM.winterMove = function (S, i) {
  if (!S.wc) return wm0(S, i);
  if (i == null || i < 0) { stayPenalty(S, S.winterOffers); return wm0(S, i); }
  const o = S.winterOffers[i];
  if (o && !o.acc) {
    const p = clamp(.4 + (has(S, 'amb') ? .08 : 0) - (o.rival >= 2 ? .2 : 0), .1, .75);
    if (R() >= p) { o.withdrawn = true; o.blocked = true; mgrV(S, -.2, `${(S.w.clubs[o.club] || {}).name} 이적을 요청했지만 구단이 막았다`); fansV(S, -.12); return { blocked: true }; }
  }
  if (o) leaveClub(S, o);
  const before = S.car.club;
  const r = wm0(S, i);
  if (S.car.club !== before) { rel(S).mgr = null; WC.mgrCheck(S, true); initMates(S); S.wc.sel = []; }
  return r;
};

// ---------- 이적 협상 · 직접 제안 · 주급의 의미 (v42) ----------
// 협상: 역할·주급·계약 기간을 요구하면 구단이 받아들이거나, 수정안을 내거나, 협상을 접는다 (보이지 않는 확률)
// 주급은 구단이 나를 어떻게 보는지의 신호: 높게 받고 가면 기대(출전 보장·팬의 눈높이)가, 낮게 받고 가면 '싼 백업' 취급이 따라온다
const ROLES = ['reserve', 'backup', 'rotation', 'starter', 'key'];
WC.ROLES = ROLES;
const ri_ = r => Math.max(0, ROLES.indexOf(r));
const pvOf = S => C.ovrOf(S.p) + (S.p.rep - 45) * .04 + (S.p.age <= 22 ? clamp(C.potEstimate(S.p).est - C.ovrOf(S.p), 0, 15) * .15 : 0) - Math.max(0, S.p.age - 30) * 1.1;
WC.baseWage = (S, c) => C.wageFor(c, C.ovrOf(S.p), (S.w.lg[c.lg] || {}).nation || c.nat);
function negInit(S, o) {
  if (o.ng) return o.ng;
  const c = S.w.clubs[o.club], pv = pvOf(S);
  const head = clamp(.1 + (pv - c.str) * .025 + (S.p.rep - 50) * .003 + (S.wc.sup && S.wc.sup.agent ? .08 : 0) + N(0, .04), .02, .55);
  return (o.ng = { w0: o.wage, r0: C.roleAt(S, c), y0: o.years, max: Math.round(o.wage * (1 + head) / 100) * 100, n: 0 });
}
WC.negInit = negInit;
// ask: { role, wage, years } → { ok } | { counter:{role,wage,years}, why } | { gone, why }
WC.negAsk = function (S, o, ask) {
  const ng = negInit(S, o), rg = ri_(ask.role) - ri_(ng.r0), q = ask.wage / ng.max;
  const roleP = rg <= 0 ? 1 : rg === 1 ? clamp(.42 + (S.p.rep - 50) * .006, .15, .75) : .08;
  const wageP = q <= 1 ? 1 : clamp(1 - (q - 1) * 3.5, 0, 1);
  const yrsP = S.p.age >= 31 && ask.years >= 3 ? .35 : S.p.age >= 29 && ask.years >= 4 ? .6 : 1;
  ng.n++;
  if (R() < roleP * wageP * yrsP) { const up = ri_(ask.role) > ri_(o.role); Object.assign(o, { wage: ask.wage, role: up ? ask.role : o.role, years: ask.years, neg: true, negRes: 'deal', promise: up ? ask.role : o.promise || null }); return { ok: 1 }; }
  const why = [wageP < 1 ? '주급 요구가 구단이 생각한 선을 넘는다고 합니다' : '', roleP < 1 ? `${C.ROLELABEL[ask.role]} 자리는 약속하기 어렵다고 합니다` : '', yrsP < 1 ? '나이를 고려하면 계약 기간이 길다고 합니다' : ''].filter(Boolean).join(' · ') || '조건을 조금 더 생각해 보겠다고 합니다';
  const walk = [.1, .28, .55, .8][Math.min(3, ng.n - 1)] + (q > 1.4 ? .25 : 0) + (rg >= 2 ? .2 : 0);
  if (R() < walk) { o.withdrawn = true; o.negRes = 'gone'; o.neg = true; return { gone: 1, why: why + ' — 구단이 협상을 접었습니다.' }; }
  const cw = Math.round(Math.min(ask.wage, (Math.min(ask.wage, ng.max) + Math.max(ng.w0, o.wage)) / 2 + (ng.max - ng.w0) * R() * .3) / 100) * 100;
  const cr = rg <= 0 ? ask.role : rg === 1 && R() < .3 ? ask.role : ng.r0;
  o.cnt = { role: cr, wage: Math.max(cw, o.wage), years: yrsP < 1 ? Math.min(ask.years, S.p.age >= 31 ? 2 : 3) : ask.years };
  return { counter: o.cnt, why };
};
WC.negTake = function (S, o) { const x = o.cnt; if (!x) return; const up = ri_(x.role) > ri_(o.role); Object.assign(o, { wage: x.wage, role: up ? x.role : o.role, years: x.years, neg: true, negRes: 'deal', promise: up ? x.role : o.promise || null }); o.cnt = null; };
// 직접 제안: 내가 고른 구단에 먼저 조건을 보낸다 (이적시장마다 3번)
WC.directLeft = S => 3 - ((S.wc.dir || {})[S.w.year] || 0);
WC.direct = function (S, cid, ask) {
  const w = S.w, c = w.clubs[cid], cur = w.clubs[S.car.club];
  if (!c || !c.lg || cid === S.car.club) return { no: 1, why: '제안할 수 없는 구단입니다.' };
  if (WC.directLeft(S) <= 0) return { no: 1, why: '이번 이적시장에서는 더 이상 직접 제안을 보낼 수 없습니다.' };
  if ((S.offers || []).some(o => o.club === cid && !o.withdrawn)) return { no: 1, why: '이미 이 구단의 제안이 있습니다. 위 목록에서 협상하세요.' };
  S.wc.dir = S.wc.dir || {}; S.wc.dir[w.year] = (S.wc.dir[w.year] || 0) + 1;
  C.materialize(w, c);
  const pv = pvOf(S), d = pv - c.str, st = S.stance || {}, free = S.car.status === 'free' || st.expired || st.release;
  const r0 = C.roleAt(S, c);
  let p = d < -9 ? .02 : d < -5 ? .15 : d < -1 ? .42 : d < 6 ? .68 : .5;
  p += { key: .15, starter: .1, rotation: 0, backup: -.12, reserve: -.3 }[r0] || 0;
  if (S.p.age >= 32) p -= .15; if (S.wc.sup && S.wc.sup.agent) p += .1; if (has(S, 'media')) p += .03;
  const fee = free ? 0 : Math.round((S.value || 0) * rnd(.95, 1.25) / 1e5) * 1e5, budget = Math.exp((c.str - 60) / 5) * 1e6;
  let why = '';
  if (fee > budget * 1.25) { p *= .2; why = '이적료를 감당하기 어렵다고 합니다'; }
  if (cur && C.rivalOf && C.rivalOf(cur.id, cid) >= 2) p *= .7;
  mgrV(S, -.03); // 현 구단도 소식을 듣는다
  if (R() >= clamp(p, .01, .9)) return { no: 1, why: why || (d < -5 ? '지금 수준으로는 전력 구상에 없다고 합니다' : r0 === 'reserve' ? '그 자리에는 이미 선수가 많다고 합니다' : '지금은 영입 계획이 없다고 합니다') };
  const wage = Math.round(WC.baseWage(S, c) * rnd(.92, 1.08) / 100) * 100;
  const o = { type: 'transfer', club: cid, fee, wage, years: S.p.age >= 32 ? 1 : S.p.age >= 29 ? 2 : rint(2, 4), role: r0, free: !!free, req: 'direct' };
  S.offers = (S.offers || []).concat([o]); WC.markOffers(S, [o], 'summer');
  const r = ask ? WC.negAsk(S, o, ask) : { ok: 0 };
  return Object.assign({ o }, r);
};
// 입단할 때: 주급 수준과 약속받은 역할
function joinTerms(S, o) {
  const c = S.w.clubs[S.car.club]; if (!c || !o || o.type === 'loan') return;
  const q = o.wage / Math.max(1, WC.baseWage(S, c));
  S.wc.star = q >= 1.25 ? 1 : 0;
  if (q >= 1.25) { S.wc.rb = (S.wc.rb || 0) + .6; mgrV(S, .05); WC.note(S, '높은 주급으로 입단 — 기대가 크다', 0); }
  else if (q <= .75) { S.wc.rb = (S.wc.rb || 0) - .6; WC.note(S, '낮은 주급으로 입단 — 스쿼드 자원으로 보는 시선', 0); }
  S.wc.promise = o.promise ? { club: S.car.club, role: o.promise, y: S.w.year, chk: 0 } : null;
}
WC.joinTerms = joinTerms;
// 약속받은 역할과 실제 출전이 다르면 (리그 10경기쯤) 한 번 문제가 된다
WEV.promise = { w: 0, build: S => { const P = S.wc.promise; return { title: '약속과 다른 현실', desc: `입단할 때 ${C.ROLELABEL[P.role]} 역할을 약속받았지만, 최근 선발 기회가 많지 않습니다.`, icon: 'brief', opts: [
  { label: '감독에게 약속을 상기시킨다', desc: '단호하게', out: [O(pr(.45, mv(S) * .4), '다음 경기부터 기회를 주겠다는 답', 1, {}, null, { rb: 1.4, mgr: -.02 }), O(1, '"자리는 실력으로"라는 답', -1, {}, null, { mgr: -.18, lean: { hot: .4 } })] },
  { label: '구단 수뇌부에 이야기한다', desc: '감독을 건너뛴다', out: [O(.5, '구단이 감독과 이야기했다', 0, {}, null, { rb: 1, mgr: -.12 }), O(1, '감독이 불쾌해했다', -1, {}, null, { mgr: -.25 })] },
  { label: '참고 기다린다', desc: '증명할 기회를 노린다', out: [O(1, '말없이 기다리기로 했다', 0, {}, null, { mgr: .04, lean: { humble: .4, pro: .3 } })] }] }; } };
// ---------- 지원 스태프·생활 (주급으로 쓰는 돈) ----------
// 시즌마다 비용이 나간다. 효과는 숫자로 보이지 않고 확률로만 작용한다
const SUP = {
  med: ['개인 의료·컨디셔닝 팀', '부상 위험과 성장 정체가 줄고, 30대의 노쇠가 조금 늦춰진다', 400000],
  pr: ['홍보·미디어 팀', '명성이 빨리 쌓이고 인터뷰가 잘 풀리는 편', 200000],
  agent: ['유명 에이전트', '이적 제안이 늘고 협상 여지가 넓어진다 (주급 수입의 8% + 기본료)', 120000],
  family: ['가족·생활 지원', '해외에서 뛸 때 적응 문제가 줄고 기분이 안정된다', 150000]
};
WC.SUP = SUP;
WC.supCost = (S, k) => k === 'agent' ? SUP.agent[2] + Math.round((S.car.wage || 0) * 52 * .08) : SUP[k][2];
WC.supSet = function (S, k, on) {
  const U0 = S.wc.sup = S.wc.sup || {}; if (!!U0[k] === !!on) return { ok: 1 };
  if (on) { const cost = WC.supCost(S, k); if ((S.p.money || 0) < cost) return { no: 1, why: '재산이 부족합니다.' }; S.p.money -= cost; U0[k] = 1; if (k === 'med') S.p.hid.inj = clamp(S.p.hid.inj * .85, .3, 2.5); WC.note(S, `${SUP[k][0]} 계약`, 0); }
  else { U0[k] = 0; if (k === 'med') S.p.hid.inj = clamp(S.p.hid.inj / .85, .3, 2.5); WC.note(S, `${SUP[k][0]} 계약 종료`, 0); }
  return { ok: 1 };
};
function supRenew(S) {
  const U0 = S.wc.sup || {}; let tot = 0;
  for (const k in U0) if (U0[k]) { const cost = WC.supCost(S, k); if ((S.p.money || 0) >= cost) { S.p.money -= cost; tot += cost; } else WC.supSet(S, k, false); }
  return tot;
}
// ---------- 은퇴 · 관전 모드로 ----------
// 은퇴는 언제든 (시즌 도중이면 그때까지 기록으로 시즌을 마감한다). 받아 주는 구단이 없으면 강제 은퇴
WC.retireNow = function (S) {
  if (S.ss && S.ss.on && ['h1', 'h2', 'mid', 'midEvents', 'winter', 'preEvents'].includes(S.phase)) {
    S.pend = []; S.winterOffers = null;
    try { S.ss.end = S.w.cal.d + 1; S.phase = 'endSeason'; GM.endSeason(S); } catch (e) { console.error(e); S.ss = null; }
  }
  GM.retire(S, false);
};
// 무소속인데 제안이 하나도 없으면 은퇴 (한 해 개인 훈련은 한 번만)
WC.noClub = S => S.wc && S.phase === 'window' && (S.car.status === 'free' || (S.stance && (S.stance.release || (S.stance.expired && !S.stance.renew)))) && !(S.offers || []).some(o => !o.withdrawn);
WC.toWorld = function (S) {
  const w = S.w, last = S.hist[S.hist.length - 1];
  S.mode = 'world'; S.phase = 'world'; S.wStart = 1; S.ss = null;
  S.wcDone = { name: S.p.name, y: w.year, club: last ? last.club : null };
  S.wStartLg = (last && last.lgId) || (w.clubs[S.car.club] && w.clubs[S.car.club].lg) || null;
  S.car = { club: null, status: 'none', trust: 50 };
  if (!S.ws) S.ws = [];
  return S;
};
})(typeof window !== 'undefined' ? window : globalThis);
