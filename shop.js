// Road to Legend — 상점: 쌓인 재산으로 능력치·몸 관리·생활에 투자
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, pick } = C;
const SH = C.shop = {};

// 가격 기준: 연간 수입 (최소값 보장) — 벌이가 늘수록 비싸지는 프리미엄 서비스
const annual = S => Math.max(30000, (S.car.wage || 600) * 52);
const round = v => v >= 1e6 ? Math.round(v / 1e5) * 1e5 : Math.round(v / 1000) * 1000;
function state(S) {
  const y = S.w.year;
  if (!S.shop || S.shop.y !== y) S.shop = { y, bought: {}, career: (S.shop && S.shop.career) || {} };
  S.stats = S.stats || {}; S.stats.spent = S.stats.spent || 0;
  return S.shop;
}
SH.state = state;
// 개인 코치: 원하는 능력치 하나를 올린다
function coachGain(S, k) {
  const a = S.p.age, v = S.p.a[k];
  const base = a <= 21 ? rnd(2.6, 4) : a <= 25 ? rnd(2, 3.2) : a <= 29 ? rnd(1.4, 2.4) : rnd(.8, 1.6);
  return base * clamp((97 - v) / 25, .25, 1.1);
}
SH.coachPrice = (S, k) => round(annual(S) * .14 * (1 + Math.max(0, S.p.a[k] - 55) / 22));
SH.ITEMS = [
  { id: 'coach', name: '1:1 개인 코치', cat: '훈련', desc: '능력치 하나를 골라 집중 지도. 어릴수록, 낮은 능력치일수록 많이 오른다.', limit: 3, pick: true },
  { id: 'weak', name: '약발 특훈 캠프', cat: '훈련', desc: '약발 ★+1 (성공률 65%). 시즌당 1회.', limit: 1, price: S => round(annual(S) * .35 * S.p.weak), can: S => S.p.weak < 5, run: S => R() < .65 ? (S.p.weak++, [true, `약발 ★${S.p.weak}`]) : [false, '이번엔 감을 잡지 못했다'] },
  { id: 'skill', name: '프리스타일 코치', cat: '훈련', desc: '개인기 ★+1 (성공률 60%). 시즌당 1회.', limit: 1, price: S => round(annual(S) * .32 * S.p.skill), can: S => S.p.skill < 5, run: S => R() < .6 ? (S.p.skill++, [true, `개인기 ★${S.p.skill}`]) : [false, '화려한 기술은 아직 몸에 붙지 않았다'] },
  { id: 'analyst', name: '전담 영상 분석관', cat: '경기', desc: '이번 시즌 결정적 순간의 선택지가 1개 줄어든다 (최소 2개).', limit: 1, price: S => round(annual(S) * .2), run: S => { S.flags.analystY = S.w.year; return [true, '이번 시즌 결정적 순간이 쉬워진다']; } },
  { id: 'chef', name: '전담 셰프·영양사', cat: '몸 관리', desc: '이번 시즌 컨디션 +2.', limit: 1, price: S => round(annual(S) * .16), run: S => { S.p.mods.push({ ovr: 2, seasons: 1, why: '전담 셰프' }); return [true, '컨디션 +2 (1시즌)']; } },
  { id: 'cryo', name: '크라이오·회복 장비', cat: '몸 관리', desc: '부상 위험 영구 감소. 커리어 3회까지.', limit: 1, career: 3, price: S => round(annual(S) * .3), run: S => { S.p.hid.inj = clamp(S.p.hid.inj * .88, .4, 2.5); if (S.ss && S.ss.inj > 0) S.ss.inj = Math.ceil(S.ss.inj * .6); return [true, '부상 위험 감소']; } },
  { id: 'science', name: '스포츠 과학 패키지', cat: '몸 관리', desc: '노쇠화를 늦춘다. 서른 이후 효과가 크다. 커리어 4회까지.', limit: 1, career: 4, price: S => round(annual(S) * (S.p.age >= 30 ? .45 : .3)), run: S => { S.p.hid.lon = clamp(S.p.hid.lon * (S.p.age >= 30 ? .88 : .94), .35, 2.2); return [true, '노쇠화 지연']; } },
  { id: 'mental', name: '스포츠 심리 상담', cat: '몸 관리', desc: '사기 +15, 침착성 +2.', limit: 2, price: S => round(annual(S) * .08), run: S => { S.p.morale = clamp(S.p.morale + 15, 0, 100); C.bump(S.p, 'composure', 2); return [true, '사기 +15 · 침착성 +2']; } },
  { id: 'altitude', name: '고지대 전지훈련', cat: '훈련', desc: '스태미너·가속력·스프린트 상승. 시즌당 1회.', limit: 1, price: S => round(annual(S) * .22), run: S => { for (const k of ['stamina', 'accel', 'sprint']) C.bump(S.p, k, rnd(1, 2.4) * (S.p.age <= 28 ? 1 : .6)); return [true, '스태미너·스피드 상승']; } },
  { id: 'car', name: '한정판 슈퍼카', cat: '생활', desc: '사기 +12, 명성 +2. 가끔 구설수에 오른다.', limit: 1, price: S => round(annual(S) * .5), run: S => { S.p.morale = clamp(S.p.morale + 12, 0, 100); S.p.rep = clamp(S.p.rep + 2, 0, 100); if (R() < .2) { S.car.trust = clamp(S.car.trust - 6, 0, 100); return [true, '사기 +12 · 과속 구설수로 감독 신뢰 −6']; } return [true, '사기 +12 · 명성 +2']; } },
  { id: 'house', name: '바닷가 저택', cat: '생활', desc: '사기 +20. 가족이 행복해진다. 커리어 1회.', limit: 1, career: 1, price: S => round(annual(S) * 2.2), run: S => { S.p.morale = clamp(S.p.morale + 20, 0, 100); S.flags.house = 1; return [true, '사기 +20']; } },
  { id: 'charity', name: '자선 재단 설립', cat: '생활', desc: '명성 +8. 커리어 1회.', limit: 1, career: 1, price: S => round(annual(S) * 1.2), run: S => { S.p.rep = clamp(S.p.rep + 8, 0, 100); S.flags.charity = 1; return [true, '명성 +8']; } },
  { id: 'hometown', name: '친정 구단 후원', cat: '생활', desc: '유스 시절 구단에 훈련장을 지어 준다. 명성 +4, 사기 +8.', limit: 1, career: 1, price: S => round(annual(S) * .8), run: S => { S.p.rep = clamp(S.p.rep + 4, 0, 100); S.p.morale = clamp(S.p.morale + 8, 0, 100); return [true, '명성 +4 · 사기 +8']; } }
];
SH.item = id => SH.ITEMS.find(i => i.id === id);
SH.priceOf = (S, it, k) => it.id === 'coach' ? SH.coachPrice(S, k) : it.price(S);
SH.check = (S, it, k) => {
  const st = state(S);
  if ((st.bought[it.id] || 0) >= it.limit) return '이번 시즌 구매 한도';
  if (it.career && (st.career[it.id] || 0) >= it.career) return '커리어 구매 한도';
  if (it.can && !it.can(S)) return '최대치';
  if (S.p.money < SH.priceOf(S, it, k)) return '재산 부족';
  return null;
};
SH.buy = function (S, id, k) {
  const it = SH.item(id); if (!it) return null;
  const err = SH.check(S, it, k); if (err) return { ok: false, msg: err };
  const price = SH.priceOf(S, it, k), st = state(S);
  S.p.money -= price; S.stats.spent += price;
  st.bought[id] = (st.bought[id] || 0) + 1; st.career[id] = (st.career[id] || 0) + 1;
  let res;
  if (id === 'coach') { const v0 = S.p.a[k]; C.bump(S.p, k, coachGain(S, k)); res = [true, `${C.ALABEL[k]} ${Math.round(v0)} → ${Math.round(S.p.a[k])}`]; }
  else res = it.run(S);
  if (S.ss) C.updateRole(S);
  if (C.ach) C.ach.fire(S, 'shop', { id, price, scandal: /구설수/.test(res[1] || '') });
  return { ok: res[0], msg: res[1], price };
};
})(typeof window !== 'undefined' ? window : globalThis);
