// Road to Legend — 상점: 시즌마다 바뀌는 진열, 3개 능력치 개인 코치, 플레이 특성
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, pick, shuffle } = C;
const SH = C.shop = {};

// 가격 기준: 연간 수입 (최소값 보장) — 벌이가 늘수록 비싸지는 프리미엄 서비스
const annual = S => Math.max(30000, (S.car.wage || 600) * 52);
const round = v => v >= 1e6 ? Math.round(v / 1e5) * 1e5 : Math.round(v / 1000) * 1000;
const bumpL = (S, ks, lo, hi) => { const out = []; for (const k of ks) { const v0 = S.p.a[k]; C.bump(S.p, k, rnd(lo, hi) * (S.p.age <= 28 ? 1 : .6)); out.push(`${C.ALABEL[k]} +${Math.round(S.p.a[k]) - Math.round(v0)}`); } return out.join(' · '); };

// ---------- 플레이 특성 ----------
// 경기 계산에 직접 반영된다 (season.js·moments.js에서 C.hasTrait로 확인)
SH.TRAITS = {
  finisher: ['침착한 마무리', '박스 안 슈팅 결정력 +10%'],
  header: ['공중전의 왕', '헤더 슈팅 빈도·결정력 상승'],
  rocket: ['중거리 대포', '박스 밖 슈팅 결정력 +30%'],
  maestro: ['플레이메이커', '도움 확률 +15%'],
  deadball: ['데드볼 스페셜리스트', '프리킥 기회·결정력 상승'],
  bigGame: ['빅매치 체질', '중요한 경기 평점 상승, 결정적 순간 성공 확률 +5%p'],
  spot: ['PK 스페셜리스트', '페널티킥 성공률 +7%p'],
  iron: ['강철 체력', '부상 확률 −25%'],
  engine: ['지치지 않는 엔진', '수비 기여(태클·가로채기) 증가, 평점 소폭 상승'],
  wall: ['통곡의 벽', '수비 경합·태클 성공 증가']
};
C.hasTrait = (p, t) => !!(p && p.traits && p.traits.includes(t));

// ---------- 상품 목록 ----------
// core: 항상 진열 / 나머지는 시즌마다 무작위로 일부만 들어온다
const POOL = [
  { id: 'weak', name: '약발 특훈 캠프', cat: '훈련', desc: '약발 ★+1 (성공률 65%).', limit: 1, price: S => round(annual(S) * .35 * S.p.weak), can: S => S.p.weak < 5, run: S => R() < .65 ? (S.p.weak++, [true, `약발 ★${S.p.weak}`]) : [false, '이번엔 감을 잡지 못했다'] },
  { id: 'skill', name: '프리스타일 코치', cat: '훈련', desc: '개인기 ★+1 (성공률 60%).', limit: 1, price: S => round(annual(S) * .32 * S.p.skill), can: S => S.p.skill < 5, run: S => R() < .6 ? (S.p.skill++, [true, `개인기 ★${S.p.skill}`]) : [false, '화려한 기술은 아직 몸에 붙지 않았다'] },
  { id: 'analyst', name: '전담 영상 분석관', cat: '경기', desc: '이번 시즌 결정적 순간의 선택지가 1개 줄어든다 (최소 2개).', limit: 1, price: S => round(annual(S) * .2), run: S => { S.flags.analystY = S.w.year; return [true, '이번 시즌 결정적 순간이 쉬워진다']; } },
  { id: 'chef', name: '전담 셰프·영양사', cat: '몸 관리', desc: '이번 시즌 컨디션 +2.', limit: 1, price: S => round(annual(S) * .16), run: S => { S.p.mods.push({ ovr: 2, seasons: 1, why: '전담 셰프' }); return [true, '컨디션 +2 (1시즌)']; } },
  { id: 'cryo', name: '크라이오·회복 장비', cat: '몸 관리', desc: '부상 위험 영구 감소. 커리어 3회까지.', limit: 1, career: 3, price: S => round(annual(S) * .3), run: S => { S.p.hid.inj = clamp(S.p.hid.inj * .88, .4, 2.5); if (S.ss && S.ss.inj > 0) S.ss.inj = Math.ceil(S.ss.inj * .6); return [true, '부상 위험 감소']; } },
  { id: 'science', name: '스포츠 과학 패키지', cat: '몸 관리', desc: '노쇠화를 늦춘다. 서른 이후 효과가 크다. 커리어 4회까지.', limit: 1, career: 4, price: S => round(annual(S) * (S.p.age >= 30 ? .45 : .3)), run: S => { S.p.hid.lon = clamp(S.p.hid.lon * (S.p.age >= 30 ? .88 : .94), .35, 2.2); return [true, '노쇠화 지연']; } },
  { id: 'mental', name: '스포츠 심리 상담', cat: '몸 관리', desc: '사기 +15, 침착성 +2.', limit: 2, price: S => round(annual(S) * .08), run: S => { S.p.morale = clamp(S.p.morale + 15, 0, 100); C.bump(S.p, 'composure', 2); return [true, '사기 +15 · 침착성 +2']; } },
  { id: 'altitude', name: '고지대 전지훈련', cat: '훈련', desc: '스태미너·가속력·스프린트 상승.', limit: 1, price: S => round(annual(S) * .22), run: S => [true, bumpL(S, ['stamina', 'accel', 'sprint'], 1, 2.4)] },
  { id: 'aerial', name: '헤딩 머신 훈련', cat: '훈련', desc: '헤더 정확도·점프력 상승.', limit: 1, price: S => round(annual(S) * .18), run: S => [true, bumpL(S, ['heading', 'jumping'], 1.5, 3.2)] },
  { id: 'defcamp', name: '수비 전술 캠프', cat: '훈련', desc: '수비 이해도·가로채기·스탠딩 태클 상승.', limit: 1, price: S => round(annual(S) * .2), run: S => [true, bumpL(S, ['defAware', 'interceptions', 'standTackle'], 1.4, 3)] },
  { id: 'shootcamp', name: '슈팅 아카데미', cat: '훈련', desc: '골 결정력·슛 파워·발리 슛 상승.', limit: 1, price: S => round(annual(S) * .22), run: S => [true, bumpL(S, ['finishing', 'shotPower', 'volleys'], 1.2, 2.8)] },
  { id: 'passcamp', name: '패스 마스터 클래스', cat: '훈련', desc: '시야·짧은 패스·긴 패스 상승.', limit: 1, price: S => round(annual(S) * .2), run: S => [true, bumpL(S, ['vision', 'shortPass', 'longPass'], 1.2, 2.8)] },
  { id: 'yoga', name: '요가·필라테스', cat: '몸 관리', desc: '민첩성·밸런스 상승, 부상 위험 소폭 감소.', limit: 1, price: S => round(annual(S) * .12), run: S => { S.p.hid.inj = clamp(S.p.hid.inj * .95, .4, 2.5); return [true, bumpL(S, ['agility', 'balance'], 1.2, 2.6)]; } },
  { id: 'gym', name: '근력 강화 프로그램', cat: '몸 관리', desc: '힘·적극성 상승.', limit: 1, price: S => round(annual(S) * .14), run: S => [true, bumpL(S, ['strength', 'aggression'], 1.4, 3)] },
  { id: 'mentor', name: '은퇴한 레전드 멘토링', cat: '경기', desc: '반응 속도·침착성·공격 위치 선정 상승.', limit: 1, price: S => round(annual(S) * .3), run: S => [true, bumpL(S, ['reactions', 'composure', S.p.pos === 'GK' ? 'gkPos' : ['CB', 'CDM'].includes(S.p.pos) ? 'defAware' : 'attPos'], 1.2, 2.6)] },
  { id: 'tactic', name: '감독과 전술 과외', cat: '경기', desc: '감독 신뢰 +10.', limit: 1, price: S => round(annual(S) * .1), can: S => S.car.status !== 'free', run: S => { S.car.trust = clamp(S.car.trust + 10, 0, 100); return [true, '감독 신뢰 +10']; } },
  { id: 'media', name: '미디어 트레이닝', cat: '생활', desc: '명성 +4, 사기 +5.', limit: 1, price: S => round(annual(S) * .1), run: S => { S.p.rep = clamp(S.p.rep + 4, 0, 100); S.p.morale = clamp(S.p.morale + 5, 0, 100); return [true, '명성 +4 · 사기 +5']; } },
  { id: 'sleep', name: '수면 클리닉', cat: '몸 관리', desc: '이번 시즌 컨디션 +1, 부상 위험 감소.', limit: 1, price: S => round(annual(S) * .1), run: S => { S.p.mods.push({ ovr: 1, seasons: 1, why: '수면 관리' }); S.p.hid.inj = clamp(S.p.hid.inj * .96, .4, 2.5); return [true, '컨디션 +1 · 부상 위험 감소']; } },
  { id: 'gkcoach', name: '골키퍼 전담 코치', cat: '훈련', desc: '다이빙·반사신경·핸들링 상승.', limit: 1, can: S => S.p.pos === 'GK', price: S => round(annual(S) * .22), run: S => [true, bumpL(S, ['gkDiving', 'gkReflexes', 'gkHandling'], 1.2, 2.8)] },
  { id: 'car', name: '한정판 슈퍼카', cat: '생활', desc: '사기 +12, 명성 +2. 가끔 구설수에 오른다.', limit: 1, price: S => round(annual(S) * .5), run: S => { S.p.morale = clamp(S.p.morale + 12, 0, 100); S.p.rep = clamp(S.p.rep + 2, 0, 100); if (R() < .2) { S.car.trust = clamp(S.car.trust - 6, 0, 100); return [true, '사기 +12 · 과속 구설수로 감독 신뢰 −6']; } return [true, '사기 +12 · 명성 +2']; } },
  { id: 'house', name: '바닷가 저택', cat: '생활', desc: '사기 +20. 커리어 1회.', limit: 1, career: 1, price: S => round(annual(S) * 2.2), run: S => { S.p.morale = clamp(S.p.morale + 20, 0, 100); S.flags.house = 1; return [true, '사기 +20']; } },
  { id: 'charity', name: '자선 재단 설립', cat: '생활', desc: '명성 +8. 커리어 1회.', limit: 1, career: 1, price: S => round(annual(S) * 1.2), run: S => { S.p.rep = clamp(S.p.rep + 8, 0, 100); S.flags.charity = 1; return [true, '명성 +8']; } },
  { id: 'hometown', name: '친정 구단 후원', cat: '생활', desc: '유스 시절 구단에 훈련장을 지어 준다. 명성 +4, 사기 +8. 커리어 1회.', limit: 1, career: 1, price: S => round(annual(S) * .8), run: S => { S.p.rep = clamp(S.p.rep + 4, 0, 100); S.p.morale = clamp(S.p.morale + 8, 0, 100); return [true, '명성 +4 · 사기 +8']; } }
];
// 특성 마스터 클래스 (한정 상품)
function traitItem(t) {
  const [nm, ds] = SH.TRAITS[t];
  return { id: 'trait_' + t, trait: t, name: `특성 마스터 클래스: ${nm}`, cat: '한정 · 플레이 특성', desc: `${ds}. 성공률 70%. 실패해도 다음에 다시 시도 가능.`, limit: 1, price: S => round(annual(S) * .9), can: S => !C.hasTrait(S.p, t), run: S => { if (R() < .7) { (S.p.traits = S.p.traits || []).push(t); return [true, `플레이 특성 획득: ${nm}`]; } return [false, '감은 잡았지만 아직 몸에 배지 않았다']; } };
}
SH.COACH = { id: 'coach', name: '1:1 개인 코치', cat: '훈련', limit: 2 };
// 시즌 진열 만들기
function makeStock(S) {
  const pool = POOL.filter(it => !it.can || it.can(S));
  const ids = shuffle(pool.map(i => i.id)).slice(0, rint(6, 8));
  const stock = { ids, sale: {}, trait: null };
  const s1 = pick(ids); stock.sale[s1] = .7; // 시즌 특가 1개
  const owned = (S.p.traits || []);
  const cand = Object.keys(SH.TRAITS).filter(t => !owned.includes(t));
  if (cand.length && R() < .55) stock.trait = pick(cand);
  return stock;
}
function state(S) {
  const y = S.w.year;
  if (!S.shop || S.shop.y !== y) S.shop = { y, bought: {}, career: (S.shop && S.shop.career) || {} };
  if (!S.shop.stock) S.shop.stock = makeStock(S);
  S.stats = S.stats || {}; S.stats.spent = S.stats.spent || 0;
  return S.shop;
}
SH.state = state;
SH.item = id => id && id.startsWith('trait_') ? traitItem(id.slice(6)) : POOL.find(i => i.id === id);
SH.stockItems = S => { const st = state(S); const l = st.stock.ids.map(SH.item).filter(Boolean); if (st.stock.trait) l.push(traitItem(st.stock.trait)); return l; };
// 개인 코치: 능력치 최대 3개를 한 번에. 많이 고를수록 개당 효과는 조금 줄고 가격은 묶음 할인
function coachGain(S, k, n) {
  const a = S.p.age, v = S.p.a[k];
  const base = a <= 21 ? rnd(2.6, 4) : a <= 25 ? rnd(2, 3.2) : a <= 29 ? rnd(1.4, 2.4) : rnd(.8, 1.6);
  return base * clamp((97 - v) / 25, .25, 1.1) * (n >= 3 ? .85 : n === 2 ? .92 : 1);
}
SH.coachPrice = (S, ks) => { ks = [].concat(ks).filter(Boolean); const one = k => annual(S) * .14 * (1 + Math.max(0, S.p.a[k] - 55) / 22); const sum = ks.reduce((a, k) => a + one(k), 0); return round(sum * (ks.length >= 3 ? .8 : ks.length === 2 ? .9 : 1)); };
SH.priceOf = (S, it, k) => { if (it.id === 'coach') return SH.coachPrice(S, k); const p = it.price(S), sale = state(S).stock.sale[it.id]; return sale ? round(p * sale) : p; };
SH.check = (S, it, k) => {
  const st = state(S);
  if (it.id === 'coach' && !(k && [].concat(k).length)) return '능력치를 고르세요';
  if ((st.bought[it.id] || 0) >= it.limit) return '이번 시즌 구매 한도';
  if (it.career && (st.career[it.id] || 0) >= it.career) return '커리어 구매 한도';
  if (it.can && !it.can(S)) return it.trait ? '보유 중' : '해당 없음';
  if (S.p.money < SH.priceOf(S, it, k)) return '재산 부족';
  return null;
};
SH.buy = function (S, id, k) {
  const it = id === 'coach' ? SH.COACH : SH.item(id); if (!it) return null;
  const err = SH.check(S, it, k); if (err) return { ok: false, msg: err };
  const price = SH.priceOf(S, it, k), st = state(S);
  S.p.money -= price; S.stats.spent += price;
  st.bought[id] = (st.bought[id] || 0) + 1; st.career[id] = (st.career[id] || 0) + 1;
  let res;
  if (id === 'coach') { const ks = [].concat(k).slice(0, 3); res = [true, ks.map(x => { const v0 = S.p.a[x]; C.bump(S.p, x, coachGain(S, x, ks.length)); return `${C.ALABEL[x]} ${Math.round(v0)}→${Math.round(S.p.a[x])}`; }).join(' · ')]; }
  else { res = it.run(S); if (it.trait && res[0] && st.stock) st.stock.trait = null; }
  if (S.ss) C.updateRole(S);
  if (C.ach) C.ach.fire(S, 'shop', { id, price, scandal: /구설수/.test(res[1] || ''), trait: it.trait && res[0] });
  return { ok: res[0], msg: res[1], price };
};
// 예전 저장 호환 (쓰이지 않음)
SH.ITEMS = POOL;
})(typeof window !== 'undefined' ? window : globalThis);
