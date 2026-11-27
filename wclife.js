// 터치라인 커리어 — 월드 커리어: 개인 생활·에이전트 (v45)
// 주급으로 쓰는 돈(생활 지출·투자), 스폰서 계약, 나를 지켜보는 구단(관심 구단)과 에이전트 문의
// 상태: S.wc.life = { opt:{k:1}, inv, spon:[{n,cat,inc,y1}], spOff:[...], int:[{c,lv,d,why}], ask:{c,d}, askY, last:{...} }
(function (G) {
'use strict';
const C = G.TC, GM = G.TCG;
const { R, rnd, rint, clamp, pick, wpick } = C;
const L = C.WCL = {};
const life = S => { const W = S.wc; if (!W) return null; return W.life = W.life || { opt: {}, inv: 0, spon: [], spOff: [], int: [], ask: null }; };
L.of = life;
const has = (S, k) => !!(S.wc && S.wc.per && S.wc.per.includes(k));
const agent = S => !!(S.wc && S.wc.sup && S.wc.sup.agent);
const year = S => S.w.year;

// ---------- 생활 지출 ----------
// 시즌마다 비용이 나간다 (계약할 때 한 시즌치, 시즌이 끝날 때마다 다음 시즌치). 효과는 확률로만 작용한다
const OPT = {
  trainer: ['개인 트레이너', '비시즌·휴식일 개인 훈련. 성장 폭이 조금 커지고 30대의 노쇠가 조금 늦어진다', 250000],
  mental: ['멘탈 코치', '슬럼프·성장 정체에 빠질 확률이 줄고, 기분이 쉽게 무너지지 않는다', 150000],
  charity: ['자선 재단 운영', '지역 사회 활동. 팬 여론과 명성이 서서히 오른다', 300000],
  lux: ['화려한 생활', '고급 차·파티·화보. 명성과 기분은 오르지만, 부진하면 팬과 감독의 시선이 차가워진다', 500000]
};
L.OPT = OPT;
L.optCost = (S, k) => { const base = OPT[k][2], w = S.car.wage || 0; return k === 'lux' ? Math.max(base, Math.round(w * 52 * .12)) : base; };
L.optSet = function (S, k, on) {
  const Lf = life(S); if (!!Lf.opt[k] === !!on) return { ok: 1 };
  if (on) { const cost = L.optCost(S, k); if ((S.p.money || 0) < cost) return { no: 1, why: '재산이 부족합니다.' }; S.p.money -= cost; Lf.opt[k] = 1; C.WC.note(S, `${OPT[k][0]} 시작`, 0); if (k === 'charity') C.news(S, `${S.p.name}, 자선 재단 설립`, 'info', false); }
  else { Lf.opt[k] = 0; C.WC.note(S, `${OPT[k][0]} 그만둠`, 0); }
  return { ok: 1 };
};
// ---------- 투자 ----------
// 재산 일부를 맡겨 두면 시즌이 끝날 때 수익(또는 손실)이 난다. 기대 수익 연 4% 안팎, 변동이 크다
L.invest = function (S, amt) {
  const Lf = life(S), p = S.p;
  if (amt > 0) { amt = Math.min(amt, Math.max(0, p.money || 0)); if (amt <= 0) return { no: 1, why: '재산이 부족합니다.' }; p.money -= amt; Lf.inv = (Lf.inv || 0) + amt; return { ok: 1, amt }; }
  const back = Math.min(-amt || Lf.inv, Lf.inv); Lf.inv -= back; p.money += back; return { ok: 1, amt: -back };
};
// ---------- 스폰서 ----------
const BRAND = [['스포츠웨어', ['Vantor', 'Kestrel Sport', 'Halvo', 'Strider', 'Nexa Athletic']], ['축구화', ['Talon Boots', 'Arcfield', 'Swiftsole']], ['시계', ['Nordline', 'Corvan & Co.', 'Meridian Watches']], ['음료', ['Aero Drinks', 'Glacier Water', 'Volta Energy']], ['자동차', ['Halden Motors', 'Ostra Auto']], ['통신', ['Lumio Mobile', 'Parallel Telecom']], ['게임', ['Pixelforge', 'Ninth Wave Games']]];
const sponValue = S => { const p = S.p, rep = p.rep || 0; return Math.round(Math.max(15000, (S.car.wage || 500) * 52 * .045 * Math.exp(rep * .02)) * (has(S, 'media') ? 1.25 : 1) * (S.wc.sup && S.wc.sup.pr ? 1.2 : 1) / 1000) * 1000; };
function sponsorTick(S) {
  const Lf = life(S), y = year(S);
  Lf.spon = Lf.spon.filter(x => x.y1 >= y);
  Lf.spOff = (Lf.spOff || []).filter(x => x.exp > S.w.cal.d);
  if (S.car.status !== 'first' || ((S.p.rep || 0) < 8 && (C.leagueOf(S) || {}).tier !== 1)) return;
  if (Lf.spon.length + Lf.spOff.length >= 3) return;
  const pch = clamp(.045 + (S.p.rep - 20) * .002 + (S.wc.sup && S.wc.sup.pr ? .03 : 0), .02, .16);
  if (R() > pch) return;
  const used = new Set(Lf.spon.map(x => x.cat).concat(Lf.spOff.map(x => x.cat)));
  const cats = BRAND.filter(b => !used.has(b[0])); if (!cats.length) return;
  const [cat, names] = pick(cats);
  const inc = Math.round(sponValue(S) * rnd(.6, 1.4) * (cat === '스포츠웨어' || cat === '축구화' ? 1.4 : 1) / 1000) * 1000;
  const yrs = rint(1, 3);
  Lf.spOff.push({ n: pick(names), cat, inc, yrs, exp: S.w.cal.d + 45, d: S.w.cal.d, img: R() < .5 ? 'safe' : 'bold' });
  C.WC.note(S, `${cat} 브랜드 스폰서 제안이 왔다`, 1);
}
L.sponAccept = function (S, i, yes) {
  const Lf = life(S), o = Lf.spOff[i]; if (!o) return;
  Lf.spOff.splice(i, 1);
  if (!yes) return;
  // 스폰서 기간은 시즌 단위: 올해 시즌부터 yrs 시즌
  Lf.spon.push({ n: o.n, cat: o.cat, inc: o.inc, y1: year(S) + o.yrs - 1, y0: year(S), img: o.img });
  S.p.rep = clamp((S.p.rep || 0) + (o.img === 'bold' ? 1.2 : .5), 0, 100);
  C.news(S, `${S.p.name}, ${o.n}(${o.cat})와 스폰서 계약`, 'info', false);
  C.WC.note(S, `${o.n} 스폰서 계약 (${o.yrs}시즌)`, 1);
};

// ---------- 관심 구단 ----------
// 매달 다시 계산: 지금 기량·평판·최근 활약을 보고 나보다 비슷하거나 위 수준 구단 몇 곳이 지켜본다
// lv 1 주시 · 2 관심 · 3 영입 검토. 에이전트가 없으면 이름은 2단계부터만 들린다
const LV = ['', '주시', '관심', '영입 검토'];
L.LV = LV;
// 리그 수준 가중치: 리그 평균 전력이 높을수록 (큰 리그 구단이 더 자주 지켜본다)
const LGW = {};
function lgW(w, id) { if (LGW[id] == null) { const cs = Object.values(w.clubs).filter(c => c.lg === id); const a = cs.length ? cs.reduce((t, c) => t + c.str, 0) / cs.length : 60; LGW[id] = Math.exp((a - 66) * .18) * (w.lg[id].tier === 1 ? 1 : .5); } return LGW[id]; }
function recentAvg(S) { const r = S.ss && S.ss.recent ? S.ss.recent.slice(-6) : []; return r.length >= 3 ? r.reduce((a, b) => a + b, 0) / r.length : null; }
function interestTick(S) {
  const Lf = life(S), w = S.w, me = S.car.club, cur = w.clubs[me];
  if (!cur || S.car.status === 'youth' || S.phase === 'retired') { Lf.int = []; return; }
  const pv = C.perceived ? [0, 1, 2, 3, 4].reduce(a => a + C.perceived(S), 0) / 5 : C.ovrOf(S.p), ra = recentAvg(S), form = ra == null ? 0 : clamp((ra - 6.85) * 1.6, -1.2, 1.6);
  const old = new Map((Lf.int || []).map(x => [x.c, x]));
  // 기존 관심은 활약에 따라 오르내린다
  const next = [];
  for (const x of Lf.int || []) {
    const c = w.clubs[x.c]; if (!c || !c.lg || x.c === me) continue;
    let s = x.s + form * .35 + rnd(-.35, .3) - (c.str > pv + 8 ? .25 : 0);
    if (S.p.age >= 31) s -= .15;
    if (s <= .2) continue;
    next.push(Object.assign({}, x, { s: Math.min(3.6, s) }));
  }
  // 새로 지켜보기 시작하는 구단
  const want = clamp(Math.round(1.5 + form * 1.6 + (S.p.rep || 0) / 30 + (agent(S) ? 1 : 0) - Math.max(0, S.p.age - 29) * .4), 0, 7);
  if (next.length < want) {
    const lo = pv - 3, hi = pv + 6.5;
    const cands = Object.values(w.clubs).filter(c => c.lg && c.id !== me && !old.has(c.id) && !next.some(x => x.c === c.id) && c.str >= lo && c.str <= hi && w.lg[c.lg] && w.lg[c.lg].tier <= 2);
    for (let i = next.length; i < want && cands.length; i++) {
      const c = wpick(cands, c => { let x = 1; const n = w.lg[c.lg].nation; if (n === S.p.nat) x *= 1.5; if (C.leagueOf(S) && n === C.leagueOf(S).nation) x *= 1.4; if (c.str > (cur.str || 0)) x *= 1.5; if (c.str < (cur.str || 0) - 5) x *= .5; x *= lgW(w, c.lg); if (C.rivalOf && C.rivalOf(me, c.id) >= 2) x *= .35; return x * Math.exp(C.N(0, .4)); });
      if (!c) break; cands.splice(cands.indexOf(c), 1);
      next.push({ c: c.id, s: rnd(.7, 1.5) + Math.max(0, form) * .4, d: S.w.cal.d, why: pick(form > .4 ? ['최근 활약', '경기력 상승', '스카우트 보고'] : ['스카우트 보고', '포지션 보강', '장기 관찰']) });
    }
  }
  next.sort((a, b) => b.s - a.s);
  Lf.int = next.slice(0, 8).map(x => Object.assign(x, { lv: x.s >= 2.6 ? 3 : x.s >= 1.6 ? 2 : 1 }));
  // 영입 검토로 오른 구단: 에이전트가 있으면 알려 준다
  for (const x of Lf.int) { const o = old.get(x.c); if (x.lv === 3 && (!o || o.lv < 3) && (agent(S) || R() < .4)) { const c = w.clubs[x.c]; C.WC.note(S, `${c.name}이(가) 영입을 검토 중이라는 소식`, 1); if (agent(S) && !(S.wc.q || []).some(q => q.id === 'agentCall')) S.wc.q.push({ id: 'agentCall', c: x.c }); } }
}
L.visible = S => { const Lf = life(S); return (Lf.int || []).filter(x => agent(S) || x.lv >= 2); };
L.hidden = S => { const Lf = life(S); return agent(S) ? 0 : (Lf.int || []).filter(x => x.lv < 2).length; };
// 문의 요청: 이적시장 한 번(반 시즌)에 한 구단. 다음 이적시장 때 제안으로 이어질 수 있다
L.canAsk = S => { const Lf = life(S); return S.car.status === 'first' && !Lf.ask && Lf.askK !== askKey(S); };
const askKey = S => { const [yy, mm] = C.ymd(S.w.cal.d); return mm >= 7 ? yy + 'b' : yy + 'a'; };
L.ask = function (S, cid) {
  const Lf = life(S); if (!L.canAsk(S)) return { no: 1, why: '이번 이적시장에는 이미 문의했습니다.' };
  const x = (Lf.int || []).find(y => y.c === cid); if (!x) return { no: 1, why: '관심 구단이 아닙니다.' };
  Lf.ask = { c: cid, d: S.w.cal.d, lv: x.lv }; Lf.askK = askKey(S);
  // 에이전트 없이 직접 움직이면 소문이 새기 쉽다
  if (R() < (agent(S) ? .15 : .45)) { C.WC.mgrV(S, -.05, '이적 문의 소식이 구단에 알려졌다'); C.WC.fansV(S, -.04); }
  C.WC.note(S, `${S.w.clubs[cid].name}에 이적 가능성을 문의했다`, 0);
  return { ok: 1 };
};
function offerFrom(S, c) {
  const w = S.w, p = S.p, ov = C.ovrOf(p), lg = w.lg[c.lg], car = S.car;
  const free = car.status === 'free' || (car.contract < w.year && car.status !== 'youth');
  const val = C.curValue ? C.curValue(S) : 1e6;
  return { type: 'transfer', club: c.id, fee: free ? 0 : Math.round(val * rnd(.9, 1.3) / 1e5) * 1e5, wage: C.wageFor(c, ov, lg.nation), years: C.contractYears ? C.contractYears(p.age) : 3, role: C.roleAt(S, c), free, ask: 1 };
}
// 이적시장이 열릴 때: 문의한 구단(성사 확률은 관심 단계·에이전트에 따라), 영입 검토 중인 구단이 제안을 보낸다
function windowOffers(S, list) {
  const Lf = life(S), w = S.w, out = [];
  const taken = c => list.some(o => o.club === c) || out.some(o => o.club === c);
  if (Lf.ask) {
    const a = Lf.ask, c = w.clubs[a.c], x = (Lf.int || []).find(y => y.c === a.c);
    const lvN = x ? x.lv : a.lv;
    const pch = clamp([0, .22, .45, .72][lvN] + (agent(S) ? .15 : 0) + (has(S, 'amb') ? .05 : 0), .1, .9);
    if (c && c.lg && !taken(c.id) && R() < pch) { const o = offerFrom(S, c); o.agent = agent(S) ? 1 : 0; out.push(o); Lf.lastAsk = { c: a.c, ok: 1, y: year(S) }; C.WC.note(S, `${c.name}이(가) 문의에 답해 제안을 보냈다`, 1); }
    else if (c) { Lf.lastAsk = { c: a.c, ok: 0, y: year(S) }; C.WC.note(S, `${c.name}은(는) 문의에 답하지 않았다`, -1); if (x) x.s -= .4; }
    Lf.ask = null;
  }
  for (const x of Lf.int || []) {
    if (x.lv < 3 || taken(x.c) || R() > (agent(S) ? .42 : .3)) continue;
    const c = w.clubs[x.c]; if (!c || !c.lg) continue;
    out.push(offerFrom(S, c));
  }
  return out;
}
L.windowOffers = windowOffers;

// ---------- 매달 ----------
L.month = function (S) {
  if (!S.wc || !S.p || !S.w.cal) return;
  const Lf = life(S), O = Lf.opt || {}, p = S.p, ra = recentAvg(S);
  try { interestTick(S); } catch (e) { console.error(e); }
  try { sponsorTick(S); } catch (e) { console.error(e); }
  if (O.charity) { C.WC.fansV(S, .012); p.rep = clamp((p.rep || 0) + .08, 0, 100); }
  if (O.lux) { p.rep = clamp((p.rep || 0) + .06, 0, 100); p.morale = clamp((p.morale || 60) + 1, 0, 100); if (ra != null && ra < 6.5) { C.WC.fansV(S, -.02); C.WC.mgrV(S, -.01); } }
  if (O.mental && p.morale < 48) p.morale = clamp(p.morale + 3, 0, 100);
};
// 성장 계산에 쓰는 보정 (wcareer.js growCore에서 읽는다)
L.growMod = S => { const O = (S.wc && S.wc.life && S.wc.life.opt) || {}; return { trainer: !!O.trainer, mental: !!O.mental }; };

// ---------- 시즌 끝 정산 ----------
function settle(S) {
  const Lf = life(S), p = S.p, y = year(S), out = { cost: 0, spon: 0, inv: 0, invR: 0, drop: [] };
  // 스폰서 수입 (이번 시즌까지 유효한 계약)
  for (const x of Lf.spon) if (x.y0 <= y && x.y1 >= y) out.spon += x.inc;
  p.money += out.spon;
  // 투자 수익
  if (Lf.inv > 0) { const r = clamp(C.N(.045, .11), -.3, .4); out.invR = r; out.inv = Math.round(Lf.inv * r); Lf.inv = Math.max(0, Lf.inv + out.inv); }
  // 다음 시즌 생활비
  for (const k in Lf.opt) if (Lf.opt[k]) { const c = L.optCost(S, k); if (p.money >= c) { p.money -= c; out.cost += c; } else { Lf.opt[k] = 0; out.drop.push(OPT[k][0]); C.WC.note(S, `재산이 모자라 ${OPT[k][0]}을(를) 그만뒀다`, -1); } }
  out.y = y; Lf.last = out;
  (Lf.hist = Lf.hist || []).push({ y, money: Math.round(p.money), spon: out.spon, cost: out.cost + (S.wc.supPaid || 0), inv: out.inv });
  if (Lf.hist.length > 30) Lf.hist.shift();
  return out;
}
L.settle = settle;

// ---------- 연결 ----------
const es0 = GM.endSeason;
GM.endSeason = function (S) { const r = es0(S); if (S.wc && r) { try { settle(S); } catch (e) { console.error(e); } } return r; };
const ow0 = GM.openWindow;
GM.openWindow = function (S) {
  ow0(S);
  if (!S.wc || S.car.status === 'youth') return;
  try { const x = windowOffers(S, S.offers || []); if (x.length) { S.offers = (S.offers || []).concat(x); C.WC.markOffers(S, S.offers, 'summer'); } } catch (e) { console.error(e); }
};
const hd0 = GM.halfDone;
GM.halfDone = function (S) {
  hd0(S);
  if (!S.wc || S.phase !== 'mid' || S.car.status !== 'first') return;
  try { const x = windowOffers(S, S.winterOffers || []); if (x.length) { S.winterOffers = (S.winterOffers || []).concat(x).slice(0, 5); C.WC.markOffers(S, S.winterOffers, 'winter'); } } catch (e) { console.error(e); }
};
// 이적하면 관심 목록에서 새 구단은 빠진다
const dw0 = GM.decideWindow;
GM.decideWindow = function (S, d) { const r = dw0(S, d); if (S.wc && S.wc.life) S.wc.life.int = (S.wc.life.int || []).filter(x => x.c !== S.car.club); return r; };

// ---------- 사건: 에이전트의 전화 ----------
function addEvents() {
  const WC = C.WC; if (!WC || !WC.WEV) return;
  const O = (p, chip, good, eff, text, wc) => ({ p, chip, good, eff: eff || {}, text, wc });
  WC.WEV.agentCall = { w: 0, build: (S, m, q) => {
    const c = S.w.clubs[q && q.c]; if (!c) return null; const lg = S.w.lg[c.lg] || {};
    return { title: '에이전트의 전화', desc: `${c.name}(${lg.name || ''})이(가) 당신 영입을 진지하게 검토하고 있다고 합니다. 어떻게 움직일까요?`, icon: 'phone', opts: [
      { label: '문의를 넣어 달라고 한다', desc: '다음 이적시장에서 제안을 받아 보자', out: [O(1, '에이전트가 움직이기 시작했다', 0, {}, '다음 이적시장 때 제안이 올 수 있습니다.', { lean: { amb: .4 }, ask: c.id })] },
      { label: '재계약 협상 카드로 쓴다', desc: '지금 구단에 관심 소식을 흘린다', out: [O(.5, '구단이 처우 개선을 약속했다', 1, { money: Math.round((S.car.wage || 1000) * 8) }, '주급 인상 대신 보너스가 나왔습니다.', { mgr: -.03, lean: { amb: .3 } }), O(1, '구단은 꿈쩍하지 않았다', -1, {}, null, { mgr: -.08, fans: -.03, lean: { amb: .3 } })] },
      { label: '지금은 집중하겠다', desc: '이적 이야기는 시즌 뒤에', out: [O(1, '에이전트가 알겠다고 했다', 0, {}, null, { lean: { loyal: .4, pro: .2 } })] }] };
  } };
}
L.addEvents = addEvents;
addEvents();
L.setAsk = function (S, cid) { const Lf = life(S); if (!Lf.ask) { Lf.ask = { c: cid, d: S.w.cal.d, lv: 3 }; Lf.askK = askKey(S); } };
})(typeof window !== 'undefined' ? window : globalThis);
