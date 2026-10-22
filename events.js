// 터치라인 커리어 — 이벤트(확률 선택지), 결정적 순간, 이적 제안, 시상
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, N, poisson, pick, wpick, shuffle, bern } = C;

// ================= 효과 적용 =================
// eff: { ovr, attrs:{k:v}, form, trust, morale, rep, money, pot, inj, susp, lon, inj, weak, skill, pos, flag, text }
const GROUPKEYS = g => C.AK.filter(k => C.AGROUP[k] === g);
function applyEffect(S, eff) {
  const p = S.p, out = [];
  if (!eff) return out;
  if (eff.ovr) { const o0 = C.ovrOf(p); C.applyOvrDelta(p, eff.ovr, eff.focus ? C.FOCUS[eff.focus][2] : null); out.push(['OVR', C.ovrOf(p) - o0]); }
  if (eff.attrs) for (const k in eff.attrs) { const v0 = p.a[k]; C.bump(p, k, eff.attrs[k]); out.push([C.ALABEL[k], Math.round(p.a[k]) - Math.round(v0)]); }
  if (eff.group) for (const g in eff.group) for (const k of GROUPKEYS(g)) C.bump(p, k, eff.group[g] * rnd(.6, 1.3));
  if (eff.form) { p.mods.push({ ovr: eff.form, seasons: eff.formSeasons || 1, why: eff.formWhy || (eff.form > 0 ? '상승세' : '기량 저하') }); out.push([eff.form > 0 ? '컨디션' : '기량 저하', eff.form]); }
  if (eff.trust) { S.car.trust = clamp(S.car.trust + eff.trust, 0, 100); out.push(['감독 신뢰', eff.trust]); }
  if (eff.morale) { p.morale = clamp(p.morale + eff.morale, 0, 100); }
  if (eff.rep) { p.rep = clamp(p.rep + eff.rep, 0, 100); out.push(['명성', eff.rep]); }
  if (eff.money) { p.money += eff.money; out.push(['재산', eff.money]); }
  if (eff.pot) p.hid.pot = clamp(p.hid.pot + eff.pot, 40, 99);
  if (eff.lon) p.hid.lon = clamp(p.hid.lon * eff.lon, .35, 2.2);
  if (eff.injp) p.hid.inj = clamp(p.hid.inj * eff.injp, .4, 2.5);
  if (eff.inj && S.ss) { S.ss.inj = Math.max(S.ss.inj, eff.inj); out.push(['부상', eff.inj + '일']); }
  if (eff.susp && S.ss) { S.ss.susp += eff.susp; out.push(['출전 정지', eff.susp + '경기']); }
  if (eff.weak) { p.weak = clamp(p.weak + eff.weak, 1, 5); out.push(['약발', '★' + p.weak]); }
  if (eff.skill) { p.skill = clamp(p.skill + eff.skill, 1, 5); out.push(['개인기', '★' + p.skill]); }
  if (eff.pos) { p.prevPos = p.pos; p.pos = eff.pos; out.push(['포지션', eff.pos]); }
  if (eff.flag) S.flags[eff.flag] = (S.flags[eff.flag] || 0) + 1;
  if (eff.loanReq) S.flags.loanReq = 1;
  if (eff.transferReq) S.flags.transferReq = 1;
  if (S.ss) C.updateRole(S);
  return out;
}
C.applyEffect = applyEffect;

// 결과 선택 (확률)
function rollOutcome(opt) { const r = R(); let a = 0; for (const o of opt.out) { a += o.p; if (r < a) return o; } return opt.out[opt.out.length - 1]; }
C.rollOutcome = rollOutcome;

// ================= 이벤트 목록 =================
// when: 'pre' | 'mid' | 'end'  ·  cond(S) · w(S) 가중치 · build(S) → { title, desc, img(아이콘 키), opts:[{label, desc, out:[{p, chip, good, eff, text}]}] }
const first = S => S.car.status !== 'youth' && S.car.status !== 'free';
const role = S => S.ss ? S.ss.role : 'starter';
const ageIn = (S, a, b) => S.p.age >= a && S.p.age <= b;
const isGK = S => S.p.pos === 'GK';
const avgR = S => { const ms = S.ss ? S.ss.matches.filter(m => m.played && m.rating) : []; return ms.length ? ms.reduce((a, m) => a + m.rating, 0) / ms.length : 6.8; };
const eurK = v => C.fmtEUR(v);
const posFocus = S => isGK(S) ? 'keeper' : ['CB', 'CDM'].includes(S.p.pos) ? 'defense' : S.p.pos === 'ST' ? 'shooting' : ['CM', 'CAM'].includes(S.p.pos) ? 'passing' : 'dribble';

// 각 선택지는 이득과 대가가 함께 있다. 안전한 선택지는 작지만 확실한 다른 종류의 이득을 준다
const O = (p, chip, good, eff, text) => ({ p, chip, good, eff, text });
const abroad = S => { const lg = S.ss ? C.leagueOf(S) : null; return lg && lg.nation !== S.p.nat; };
const wk = S => Math.max(3000, S.car.wage || 3000);
const EVENTS = [
  { id: 'feud', when: ['mid', 'pre'], cond: first, w: 1.1, build: S => ({ title: '라커룸 불화', desc: '주전 경쟁 과정에서 동료와 언성이 높아졌습니다. 기사까지 나기 시작했습니다.', icon: 'feud', opts: [
    { label: '침묵한다', desc: '조용히 넘어간다', out: [O(1, '신뢰 +3 · 사기 −4', 0, { trust: 3, morale: -4 })] },
    { label: '실력으로 보여준다', desc: '훈련장에서 증명한다', out: [O(.55, '+1 OVR · 신뢰 +8', 1, { ovr: 1, trust: 8 }, '훈련장에서 압도적인 모습을 보여 줬습니다.'), O(.45, '기량 저하 (1시즌 −2)', -1, { form: -2, formWhy: '불화 여파' }, '무리하다 경기력까지 흔들렸습니다.')] },
    { label: '감독에게 중재 요청', desc: '공식적으로 정리한다', out: [O(.7, '신뢰 +5 · 사기 +6', 1, { trust: 5, morale: 6 }), O(.3, '동료들의 눈총 · 사기 −8', -1, { morale: -8, trust: -3 })] },
    { label: '공개적으로 반박', desc: 'SNS에 입장을 낸다', out: [O(.35, '신뢰 +10 · 명성 +3', 1, { trust: 10, rep: 3 }, '팬들이 당신 편에 섰습니다.'), O(.65, '신뢰 −15 · 벌금', -1, { trust: -15, money: -wk(S) * 2 }, '구단이 벌금을 부과했습니다.')] }] }) },
  { id: 'supp', when: ['pre', 'mid'], cond: S => S.p.age >= 18, w: .55, build: S => ({ title: '수상한 보충제', desc: '팀 닥터가 출처가 불분명한 보충제를 권합니다. 회복 속도가 확실히 빨라진다고 합니다.', icon: 'pill', opts: [
    { label: '복용한다', desc: '위험을 감수한다', out: [O(.7, '+2 OVR', 1, { ovr: 2, focus: 'physical' }), O(.3, '도핑 적발 · 10경기 정지 · 명성 −10', -1, { susp: 10, rep: -10, trust: -10 }, '도핑 검사에서 양성 반응이 나왔습니다.')] },
    { label: '거절하고 구단에 알린다', desc: '원칙대로 간다', out: [O(.8, '명성 +2 · 신뢰 +3', 1, { rep: 2, trust: 3 }), O(.2, '팀 닥터와 갈등 · 사기 −5', 0, { morale: -5 })] }] }) },
  { id: 'trainer', when: ['pre'], cond: S => S.p.money > 20000, w: 1, build: S => { const cost = clamp(Math.round(wk(S) * 52 * .08 / 1000) * 1000, 15000, 400000); const f = posFocus(S); return { title: '개인 트레이너 영입', desc: `유명 개인 트레이너가 비시즌 1대1 훈련을 제안했습니다. 비용은 ${eurK(cost)}입니다.`, icon: 'coach', opts: [
    { label: '계약한다', desc: `${eurK(cost)} 지출`, out: [O(.75, `+${S.p.age < 28 ? 2 : 1} OVR`, 1, { ovr: S.p.age < 28 ? 2 : 1, focus: f, money: -cost }), O(.25, '방식이 안 맞음 · 돈만 씀', -1, { money: -cost, morale: -4 })] },
    { label: '팀 훈련에 집중', desc: '동료들과 함께', out: [O(1, '신뢰 +4 · 사기 +4', 1, { trust: 4, morale: 4 })] }] }; } },
  { id: 'mentor', when: ['pre', 'mid'], cond: S => S.p.age <= 22, w: 1, build: S => ({ title: '베테랑의 조언', desc: '팀의 베테랑이 따로 불러 경기 운영 노하우를 알려 주겠다고 합니다.', icon: 'mentor', opts: [
    { label: '매일 따라다닌다', desc: '경험을 흡수한다', out: [O(.7, '침착성·반응 속도 상승', 1, { attrs: { composure: rint(2, 4), reactions: rint(1, 2), attPos: rint(0, 2) } }), O(.3, '스타일 충돌 · 사기 −6', -1, { morale: -6 })] },
    { label: '내 루틴을 지킨다', desc: '정중히 사양', out: [O(1, '컨디션 +1 (1시즌)', 1, { form: 1, formWhy: '자기 루틴' })] }] }) },
  { id: 'poschange', when: ['pre'], cond: S => first(S) && S.p.age <= 29 && S.p.pos !== 'GK' && (role(S) === 'backup' || role(S) === 'rotation' || R() < .25), w: 1.1, build: S => {
    const alt = { ST: ['LW', 'RW', 'CAM'], LW: ['ST', 'LM', 'CAM'], RW: ['ST', 'RM', 'CAM'], LM: ['LW', 'LB', 'CM'], RM: ['RW', 'RB', 'CM'], CAM: ['CM', 'ST', 'RW'], CM: ['CDM', 'CAM'], CDM: ['CB', 'CM'], CB: ['CDM', 'RB'], LB: ['LM', 'CB'], RB: ['RM', 'CB'] }[S.p.pos];
    const np = alt.map(ps => [ps, C.ovrOf(S.p, ps)]).sort((a, b) => b[1] - a[1])[0];
    return { title: '포지션 변경 제안', desc: `감독이 당신을 ${C.POSKO[np[0]]}(${np[0]})로 쓰고 싶어 합니다. 그 자리 능력치는 ${np[1]}입니다 (현재 ${S.p.pos} ${C.ovrOf(S.p)}).`, icon: 'tactic', opts: [
      { label: `${np[0]}로 전향`, desc: '새 포지션에서 경쟁한다', out: [O(.7, `${np[0]} 전향 · 신뢰 +10`, 1, { pos: np[0], trust: 10, ovr: 1 }), O(.3, `${np[0]} 전향 · 적응기 (1시즌 −2)`, -1, { pos: np[0], trust: 5, form: -2, formWhy: '포지션 적응' })] },
      { label: '원래 포지션 고수', desc: '지금 자리에서 경쟁', out: [O(1, '신뢰 −6 · 사기 +5', 0, { trust: -6, morale: 5 })] }] };
  } },
  { id: 'holiday', when: ['pre'], cond: S => S.p.age >= 17, w: 1.1, build: S => ({ title: '비시즌 휴가', desc: '3주간의 휴가가 주어졌습니다. 어떻게 보낼까요?', icon: 'sun', opts: [
    { label: '푹 쉰다', desc: '몸과 마음을 회복', out: [O(1, '부상 위험 감소 · 사기 +10', 1, { morale: 10, injp: .92 })] },
    { label: '개인 훈련', desc: '남들이 쉴 때 뛴다', out: [O(.55, '+1 OVR', 1, { ovr: 1 }), O(.3, '과훈련 부상 (25일)', -1, { inj: 25 }), O(.15, '효과 없이 지침 · 사기 −6', -1, { morale: -6 })] },
    { label: '고지대 전지훈련', desc: `비용 ${eurK(20000)}`, out: [O(.7, '스태미너 +3 · 가속 +1', 1, { attrs: { stamina: 3, accel: 1 }, money: -20000 }), O(.3, '고산병 · 돈만 씀', -1, { money: -20000, morale: -4 })] }] }) },
  { id: 'party', when: ['mid'], cond: S => S.p.age >= 18, w: .8, build: S => ({ title: '파티 초대', desc: '경기 이틀 전, 유명 인플루언서가 주최하는 파티에 초대받았습니다.', icon: 'party', opts: [
    { label: '참석한다', desc: '잠깐만 있다 온다', out: [O(.65, '사기 +12 · 명성 +1', 1, { morale: 12, rep: 1 }), O(.35, '스캔들 · 신뢰 −15', -1, { trust: -15, rep: -4, form: -2, formWhy: '스캔들 여파' }, '새벽 사진이 기사로 났습니다.')] },
    { label: '거절한다', desc: '경기에 집중', out: [O(1, '신뢰 +3 · 사기 −4', 0, { trust: 3, morale: -4 })] }] }) },
  { id: 'sns', when: ['mid'], cond: S => S.p.rep >= 10, w: .7, build: S => ({ title: 'SNS 논란', desc: '예전에 올린 게시물이 다시 퍼지며 논란이 커지고 있습니다.', icon: 'phone', opts: [
    { label: '공식 사과', desc: '빠르게 진화', out: [O(.85, '명성 −2', 0, { rep: -2 }), O(.15, '진정성 논란 · 명성 −6', -1, { rep: -6 })] },
    { label: '무시한다', desc: '시간이 해결', out: [O(.5, '조용히 지나감', 1, {}), O(.5, '명성 −8 · 사기 −10', -1, { rep: -8, morale: -10 })] },
    { label: '법적 대응', desc: `변호사 비용 ${eurK(40000)}`, out: [O(.6, '명예 회복 · 명성 +3', 1, { rep: 3, money: -40000 }), O(.4, '역풍 · 명성 −6', -1, { rep: -6, money: -40000 })] }] }) },
  { id: 'weakfoot', when: ['pre', 'mid'], cond: S => S.p.weak < 5 && !isGK(S), w: .9, build: S => ({ title: '약발 훈련', desc: `${S.p.foot === 'R' ? '왼발' : '오른발'} 사용이 약점으로 지적받고 있습니다.`, icon: 'boot', opts: [
    { label: '매일 따로 연습', desc: '반복 또 반복', out: [O(.4, '약발 ★+1', 1, { weak: 1 }, '이제 반대발로도 자신 있게 찹니다.'), O(.45, '아직 효과 없음', 0, {}), O(.15, '발목 통증 (12일)', -1, { inj: 12 })] },
    { label: '주발을 더 날카롭게', desc: '강점에 집중', out: [O(1, '결정력·짧은 패스·커브 +1', 1, { attrs: { finishing: 1, shortPass: 1, curve: 1 } })] }] }) },
  { id: 'skillmv', when: ['pre'], cond: S => S.p.skill < 5 && ['W', 'AM', 'ST'].includes(C.ROLE[S.p.pos]), w: .7, build: S => ({ title: '개인기 연마', desc: '스트리트 풋볼 출신 코치가 화려한 개인기를 가르쳐 주겠다고 합니다.', icon: 'boot', opts: [
    { label: '배운다', desc: '고난도 기술 습득', out: [O(.45, '개인기 ★+1 · 드리블 +2', 1, { skill: 1, attrs: { dribbling: 2, agility: 1 } }), O(.4, '드리블 +1', 0, { attrs: { dribbling: 1 } }), O(.15, '발목 부상 (18일)', -1, { inj: 18 })] },
    { label: '실용적인 플레이', desc: '간결함이 무기', out: [O(1, '침착성 +2 · 신뢰 +2', 1, { attrs: { composure: 2 }, trust: 2 })] }] }) },
  { id: 'slump', when: ['mid'], cond: S => S.ss && avgR(S) < 6.65 && S.ss.matches.filter(m => m.played).length >= 6, w: 3, build: S => ({ title: '슬럼프', desc: `최근 평균 평점 ${avgR(S).toFixed(2)}. 경기장에서 자신감이 사라졌습니다.`, icon: 'rain', opts: [
    { label: '멘탈 코치 상담', desc: `비용 ${eurK(15000)}`, out: [O(.75, '컨디션 +2 (1시즌)', 1, { form: 2, formWhy: '멘탈 회복', money: -15000 }), O(.25, '효과 미미', 0, { money: -15000 })] },
    { label: '그냥 버틴다', desc: '시간이 약', out: [O(.45, '자연 회복 · 침착성 +1', 1, { attrs: { composure: 1 } }), O(.55, '기량 저하 (1시즌 −2)', -1, { form: -2, formWhy: '슬럼프' })] },
    { label: '감독에게 휴식 요청', desc: '몇 경기 쉰다', out: [O(1, '신뢰 −5 · 사기 +10', 0, { trust: -5, morale: 10 })] }] }) },
  { id: 'rival', when: ['pre'], cond: S => first(S) && ['starter', 'key', 'rotation'].includes(role(S)), w: 1, build: S => { const c = C.clubOf(S); const nm = C.genName(pick(['BRA', 'FRA', 'ESP', 'ARG', 'NED', 'POR'])); const o = clamp(Math.round(C.effOvr(S.p) + rnd(-1, 3)), 50, 93); return { title: '경쟁자 영입', desc: `${c.name}이(가) 같은 포지션의 ${nm}(OVR ${o})을(를) 영입했습니다.`, icon: 'swap', rival: [nm, o], opts: [
    { label: '정면 승부', desc: '주전 자리를 지킨다', out: [O(.55, '+1 OVR · 신뢰 +10', 1, { ovr: 1, trust: 10 }), O(.45, '신뢰 −10', -1, { trust: -10 })] },
    { label: '이적 요청', desc: '다음 이적시장에서 떠난다', out: [O(1, '이적 제안 증가 · 신뢰 −12', 0, { transferReq: 1, trust: -12 })] },
    ...(S.p.age <= 23 ? [{ label: '임대 요청', desc: '겨울에 임대를 떠난다', out: [O(1, '겨울 임대 제안', 0, { loanReq: 1 })] }] : [])] }; }, post: (S, b) => { const c = C.clubOf(S); c.sq.push([b.rival[0], S.p.pos, b.rival[1], rint(22, 28), b.rival[1], 'BRA']); } },
  { id: 'captain', when: ['pre'], cond: S => first(S) && S.p.age >= 24 && ['key', 'starter'].includes(role(S)) && S.car.trust >= 62 && S.car.years >= 2 && !S.flags.captain, w: 1.3, build: S => ({ title: '주장 완장', desc: '감독이 당신에게 주장을 맡기고 싶어 합니다.', icon: 'band', opts: [
    { label: '수락한다', desc: '팀의 얼굴이 된다', out: [O(.8, '침착성 +3 · 명성 +5 · 신뢰 +8', 1, { attrs: { composure: 3 }, rep: 5, trust: 8, flag: 'captain' }), O(.2, '부담감 (1시즌 −1)', -1, { form: -1, formWhy: '주장 부담', flag: 'captain' })] },
    { label: '사양한다', desc: '플레이에만 집중', out: [O(1, '컨디션 +1 (1시즌)', 1, { form: 1, formWhy: '부담 없는 플레이' })] }] }) },
  { id: 'agent', when: ['pre'], cond: S => S.p.age >= 19 && S.p.rep >= 8 && !S.flags.superAgent, w: .7, build: S => ({ title: '슈퍼 에이전트', desc: '빅클럽 이적을 여럿 성사시킨 에이전트가 계약을 제안했습니다. 수수료가 비싸고 구단과 마찰이 잦은 사람입니다.', icon: 'brief', opts: [
    { label: '계약한다', desc: '수입의 10% 수수료', out: [O(1, '이적 제안 증가 · 신뢰 −4', 1, { flag: 'superAgent', rep: 2, trust: -4 })] },
    { label: '기존 에이전트 유지', desc: '의리를 지킨다', out: [O(1, '신뢰 +4 · 사기 +3', 0, { trust: 4, morale: 3 })] }] }) },
  { id: 'raise', when: ['mid'], cond: S => first(S) && S.car.contract - S.ss.year >= 1 && avgR(S) >= 7.1, w: 1.3, build: S => ({ title: '연봉 재협상', desc: `좋은 활약(평균 평점 ${avgR(S).toFixed(2)})을 이어가는 중입니다. 연봉 인상을 요구할까요?`, icon: 'money', opts: [
    { label: '인상 요구', desc: '내 가치를 인정받는다', out: [O(.55, '급여 +40% · 계약 1년 연장', 1, { flag: 'raise' }), O(.45, '신뢰 −8', -1, { trust: -8 })] },
    { label: '지금은 축구에 집중', desc: '구단과 좋은 관계', out: [O(1, '신뢰 +5', 1, { trust: 5 })] }] }), post2: S => { if (S.flags.raise) { S.flags.raise = 0; S.car.wage = Math.round(S.car.wage * 1.4); S.car.contract += 1; } } },
  { id: 'callup', when: ['pre'], cond: S => S.car.status === 'youth' && S.p.age >= 16, w: 2.3, build: S => ({ title: '1군 훈련 합류', desc: '1군 감독이 훈련에 불렀습니다. 짧은 테스트지만 눈도장을 찍을 기회입니다.', icon: 'whistle', opts: [
    { label: '과감하게 플레이', desc: '내 장점을 보여 준다', out: [O(.55, '1군 데뷔 기회 증가 · 신뢰 +15', 1, { trust: 15, attrs: { composure: 2 } }), O(.45, '긴장한 실수 · 신뢰 −5', -1, { trust: -5, morale: -6 })] },
    { label: '실수 없이 안정적으로', desc: '무난하게', out: [O(1, '신뢰 +5', 1, { trust: 5 })] }] }) },
  { id: 'school', when: ['pre'], cond: S => ageIn(S, 16, 17), w: 1.4, build: S => ({ title: '학업과 축구', desc: '학교 성적이 떨어지고 있습니다. 부모님은 걱정이 많습니다.', icon: 'book', opts: [
    { label: '학업 병행', desc: '균형 잡힌 생활', out: [O(1, '침착성 +2 · 시야 +1 · 사기 +8', 1, { attrs: { composure: 2, vision: 1 }, morale: 8 })] },
    { label: '축구에 올인', desc: '모든 시간을 훈련에', out: [O(.65, '+2 OVR', 1, { ovr: 2 }), O(.35, '번아웃 (1시즌 −2)', -1, { form: -2, formWhy: '번아웃' })] }] }) },
  { id: 'diet', when: ['pre'], cond: S => S.p.age >= 20, w: .8, build: S => ({ title: '전담 영양사', desc: `식단과 수면을 관리해 줄 영양사를 고용할 수 있습니다. 연간 ${eurK(25000)}입니다.`, icon: 'leaf', opts: [
    { label: '고용한다', desc: '선수 생명 연장', out: [O(1, '스태미너 +2 · 노쇠화 지연', 1, { attrs: { stamina: 2 }, lon: .92, money: -25000 })] },
    { label: '혼자 공부해서 관리', desc: '돈을 아낀다', out: [O(.55, '스태미너 +1 · 노쇠화 소폭 지연', 1, { attrs: { stamina: 1 }, lon: .97 }), O(.45, '식단 실패 · 사기 −4', -1, { morale: -4 })] }] }) },
  { id: 'yoga', when: ['pre', 'mid'], cond: S => S.p.age >= 22, w: .7, build: S => ({ title: '비시즌 몸 만들기', desc: '동료들은 요가파와 웨이트파로 나뉘었습니다.', icon: 'leaf', opts: [
    { label: '요가·필라테스', desc: '유연성과 균형', out: [O(.85, '밸런스·민첩성 +2 · 부상 위험 감소', 1, { attrs: { balance: 2, agility: 2 }, injp: .92, lon: .97 }), O(.15, '효과 미미', 0, {})] },
    { label: '웨이트 트레이닝', desc: '힘을 키운다', out: [O(.8, '힘 +4 · 민첩성 −2', 0, { attrs: { strength: 4, agility: -2, accel: -1 } }), O(.2, '허리 부상 (20일)', -1, { inj: 20 })] }] }) },
  { id: 'fk', when: ['pre', 'mid'], cond: S => !isGK(S) && ['ST', 'W', 'AM', 'CM', 'FB'].includes(C.ROLE[S.p.pos]), w: .8, build: S => ({ title: '세트피스 연습', desc: '팀 훈련 후 혼자 남아 프리킥을 연습할 수 있습니다.', icon: 'ball', opts: [
    { label: '매일 100개씩', desc: '전담 키커가 목표', out: [O(.6, '프리킥 +3 · 커브 +1', 1, { attrs: { fkAcc: 3, curve: 1, penalties: 1 } }), O(.25, '프리킥 +1', 0, { attrs: { fkAcc: 1 } }), O(.15, '허벅지 피로 (10일)', -1, { inj: 10 })] },
    { label: '회복에 집중', desc: '무리하지 않는다', out: [O(1, '부상 위험 감소 · 사기 +4', 1, { injp: .94, morale: 4 })] }] }) },
  { id: 'video', when: ['mid'], cond: S => S.p.age >= 19, w: .8, build: S => ({ title: '영상 분석', desc: '분석관이 당신의 경기 장면만 모은 영상을 준비했습니다. 보기 불편한 실수도 많습니다.', icon: 'screen', opts: [
    { label: '밤새 분석한다', desc: '실수를 고친다', out: [O(.75, '반응 속도·위치 선정 상승', 1, { attrs: { reactions: 2, attPos: isGK(S) ? 0 : 2, defAware: 1, gkPos: isGK(S) ? 2 : 0 } }), O(.25, '자신감 하락 · 사기 −8', -1, { morale: -8 })] },
    { label: '좋은 장면만 본다', desc: '자신감 유지', out: [O(1, '사기 +8', 1, { morale: 8 })] }] }) },
  { id: 'bet', when: ['mid'], cond: S => S.p.age >= 19, w: .25, build: S => ({ title: '수상한 제안', desc: '모르는 사람이 경기 중 카드 하나만 받아 달라며 큰돈을 제안했습니다.', icon: 'shadow', opts: [
    { label: '즉시 구단에 신고', desc: '원칙대로', out: [O(1, '명성 +4 · 신뢰 +5', 1, { rep: 4, trust: 5 })] },
    { label: '증거를 모아 경찰에 넘긴다', desc: '조직을 잡는다', out: [O(.6, '언론의 영웅 · 명성 +9', 1, { rep: 9, trust: 4 }), O(.4, '협박에 시달림 · 사기 −14', -1, { morale: -14, form: -1, formWhy: '불안' })] }] }) },
  { id: 'charity', when: ['mid', 'pre'], cond: S => S.p.rep >= 6, w: .6, build: S => ({ title: '자선 행사', desc: '지역 아동 축구교실에서 재능 기부를 요청했습니다.', icon: 'heart', opts: [
    { label: '참여한다', desc: '휴일을 반납', out: [O(1, '명성 +3 · 사기 +6', 1, { rep: 3, morale: 6 })] },
    { label: '정중히 거절하고 쉰다', desc: '회복이 우선', out: [O(1, '부상 위험 소폭 감소', 0, { injp: .95 })] }] }) },
  { id: 'rumor', when: ['mid'], cond: S => first(S) && avgR(S) >= 7.05, w: 1.1, build: S => ({ title: '빅클럽 이적설', desc: '여러 빅클럽이 당신을 지켜보고 있다는 기사가 나왔습니다.', icon: 'news', opts: [
    { label: '현재 팀에 충성 발언', desc: '팬들의 지지', out: [O(1, '신뢰 +6 · 명성 +1', 1, { trust: 6, rep: 1 })] },
    { label: '"미래는 모른다"', desc: '여지를 남긴다', out: [O(1, '이적 제안 증가 · 신뢰 −8', 0, { transferReq: 1, trust: -8, rep: 2 })] }] }) },
  { id: 'veteran', when: ['pre'], cond: S => S.p.age >= 32, w: 1.5, build: S => ({ title: '노장의 선택', desc: '몸이 예전 같지 않다는 걸 느낍니다. 관리 방식을 바꿀 때입니다.', icon: 'clock', opts: [
    { label: '최첨단 회복 프로그램', desc: `비용 ${eurK(120000)}`, out: [O(.7, '노쇠화 크게 지연', 1, { lon: .8, money: -120000, attrs: { stamina: 2 } }), O(.3, '노쇠화 소폭 지연', 0, { lon: .94, money: -120000 })] },
    { label: '경험으로 버틴다', desc: '머리로 하는 축구', out: [O(1, '시야·침착성 +2', 1, { attrs: { vision: 2, composure: 2 } })] },
    { label: '한 번 더 불태운다', desc: '고강도 훈련 감행', out: [O(.3, '회춘 +3 OVR', 1, { ovr: 3, lon: .92 }), O(.7, '부상 (40일) · 노쇠화 가속', -1, { inj: 40, lon: 1.12 })] }] }) },
  { id: 'family', when: ['pre'], cond: S => ageIn(S, 24, 33) && !S.flags.married, w: .5, build: S => ({ title: '인생의 동반자', desc: '오래 만난 연인과 결혼을 결심했습니다.', icon: 'heart', opts: [
    { label: '시즌 전에 식을 올린다', desc: '새 출발', out: [O(1, '컨디션 +1 (1시즌) · 사기 +12', 1, { form: 1, formWhy: '신혼', morale: 12, flag: 'married', money: -50000 })] },
    { label: '시즌 끝나고', desc: '축구 먼저', out: [O(1, '신뢰 +3 · 사기 +4', 0, { trust: 3, morale: 4, flag: 'married' })] }] }) },
  { id: 'derby', when: ['mid'], cond: first, w: .9, build: S => ({ title: '더비 앞 도발', desc: '라이벌 팀 선수가 인터뷰에서 당신을 조롱했습니다.', icon: 'fire', opts: [
    { label: '무시한다', desc: '경기로 답한다', out: [O(1, '침착성 +1 · 신뢰 +2', 1, { attrs: { composure: 1 }, trust: 2 })] },
    { label: '맞받아친다', desc: '불에 기름을 붓는다', out: [O(.5, '동기부여 컨디션 +2 · 명성 +2', 1, { form: 2, formWhy: '더비 동기부여', rep: 2 }), O(.5, '흥분해 퇴장 · 2경기 정지', -1, { susp: 2, trust: -6 })] }] }) },
  { id: 'sacked', when: ['mid'], cond: first, w: .5, build: S => ({ title: '감독 경질', desc: '성적 부진으로 감독이 경질됐습니다. 새 감독이 부임합니다.', icon: 'whistle', opts: [
    { label: '첫 훈련부터 어필', desc: '새 감독 눈에 들기', out: [O(.6, '신뢰 +20', 1, { trust: 20 }), O(.4, '오버페이스 · 신뢰 −12', -1, { trust: -12 })] },
    { label: '조용히 적응', desc: '평소처럼', out: [O(1, '신뢰 +5', 0, { trust: 5 })] }] }), pre2: S => { S.car.trust = 50; } },
  { id: 'bench', when: ['mid'], cond: S => first(S) && ['backup', 'reserve'].includes(role(S)), w: 2.6, build: S => ({ title: '출전 시간 불만', desc: '벤치에 앉아 있는 시간이 길어지고 있습니다.', icon: 'bench', opts: [
    { label: '감독 면담', desc: '기회를 달라고 요구', out: [O(.45, '신뢰 +18', 1, { trust: 18 }), O(.55, '신뢰 −10', -1, { trust: -10 })] },
    { label: '묵묵히 훈련', desc: '언젠가 기회는 온다', out: [O(.65, '+1 OVR', 1, { ovr: 1 }), O(.35, '의욕 저하 · 사기 −10', -1, { morale: -10 })] },
    ...(S.p.age <= 25 ? [{ label: '임대 요청', desc: '겨울 이적시장에서 임대', out: [O(1, '겨울 임대 제안', 0, { loanReq: 1 })] }] : [])] }) },
  { id: 'injrush', when: ['mid'], cond: S => S.ss && S.ss.inj >= 20, w: 6, build: S => ({ title: '부상 복귀 시점', desc: `${S.ss.inj}일 정도 더 쉬어야 한다는 진단입니다. 팀은 당신이 빨리 돌아오길 원합니다.`, icon: 'medic', opts: [
    { label: '조기 복귀', desc: '진통제를 맞고 뛴다', out: [O(.6, '복귀 기간 절반 · 신뢰 +6', 1, { trust: 6 }), O(.4, '재발 · 기간 2배 · 잠재력 하락', -1, { pot: -2 })] },
    { label: '완전히 회복', desc: '서두르지 않는다', out: [O(1, '재발 위험 없음 · 신뢰 −3', 0, { trust: -3 })] },
    ...(S.p.money > 80000 ? [{ label: '해외 최신 치료', desc: `비용 ${eurK(80000)}`, out: [O(.55, '회복 기간 1/3', 1, { money: -80000 }), O(.45, '효과 없음', -1, { money: -80000 })] }] : [])] }), post3: (S, b, oi, out) => { const lab = out.chip; if (lab.startsWith('복귀 기간 절반')) S.ss.inj = Math.round(S.ss.inj / 2); else if (lab.startsWith('재발')) S.ss.inj *= 2; else if (lab.startsWith('회복 기간 1/3')) S.ss.inj = Math.round(S.ss.inj / 3); } },
  { id: 'gkdrill', when: ['pre'], cond: isGK, w: 1.2, build: S => ({ title: '골키퍼 코치의 특별 훈련', desc: '골키퍼 코치가 지옥 훈련을 제안합니다.', icon: 'glove', opts: [
    { label: '반사신경 집중', desc: '근거리 슈팅 막기', out: [O(.7, '반사신경 +3 · 다이빙 +1', 1, { attrs: { gkReflexes: 3, gkDiving: 1 } }), O(.3, '손가락 부상 (14일)', -1, { inj: 14 })] },
    { label: '빌드업 집중', desc: '발 기술', out: [O(.8, '킥력 +3 · 짧은 패스 +2', 1, { attrs: { gkKicking: 3, shortPass: 2 } }), O(.2, '효과 미미', 0, {})] },
    { label: '컨디션 관리', desc: '무리하지 않는다', out: [O(1, '위치 선정 +1 · 부상 위험 감소', 1, { attrs: { gkPos: 1 }, injp: .94 })] }] }) },
  { id: 'interview', when: ['mid'], cond: S => S.p.rep >= 4, w: .7, build: S => ({ title: '방송 인터뷰', desc: '인기 축구 프로그램에서 당신의 목표를 묻습니다.', icon: 'mic', opts: [
    { label: '"팀 우승이 먼저"', desc: '겸손하게', out: [O(1, '신뢰 +3', 1, { trust: 3 })] },
    { label: '"발롱도르를 원한다"', desc: '야망을 드러낸다', out: [O(.55, '명성 +5 · 동기부여', 1, { rep: 5, form: 1, formWhy: '야망' }), O(.45, '조롱거리 · 사기 −10', -1, { rep: -2, morale: -10 })] }] }) },
  { id: 'heat', when: ['pre'], cond: S => S.p.age >= 23 && S.p.age <= 31, w: .45, build: S => ({ title: '비밀 특훈 캠프', desc: '은퇴한 레전드가 운영하는 비공개 캠프 초대장이 왔습니다. 강도가 상상을 초월한다고 합니다.', icon: 'fire', opts: [
    { label: '참가한다', desc: '한계를 시험', out: [O(.25, '대폭 성장 +3 OVR', 1, { ovr: 3, pot: 1 }, '완전히 다른 선수가 되어 돌아왔습니다.'), O(.45, '+1 OVR', 1, { ovr: 1 }), O(.3, '큰 부상 (70일)', -1, { inj: 70 })] },
    { label: '거절하고 가족과 휴가', desc: '무리하지 않는다', out: [O(1, '사기 +10', 1, { morale: 10 })] }] }) },
  // ----- 새 이벤트 -----
  { id: 'sponsor', when: ['pre'], cond: S => S.p.rep >= 12, w: .8, build: S => { const big = Math.round(wk(S) * 30 / 1000) * 1000, small = Math.round(big * .45 / 1000) * 1000; return { title: '축구화 스폰서 제안', desc: '글로벌 브랜드와 지역 수제화 브랜드가 동시에 연락해 왔습니다.', icon: 'boot', opts: [
    { label: '글로벌 브랜드', desc: `계약금 ${eurK(big)}`, out: [O(.75, `수입 +${eurK(big)} · 명성 +3`, 1, { money: big, rep: 3 }), O(.25, `수입 +${eurK(big)} · 축구화가 안 맞음 (1시즌 −1)`, 0, { money: big, form: -1, formWhy: '새 축구화 적응' })] },
    { label: '지역 브랜드', desc: `계약금 ${eurK(small)}`, out: [O(1, `수입 +${eurK(small)} · 사기 +6 · 팬 호감`, 1, { money: small, morale: 6, rep: 1 })] },
    { label: '지금 쓰는 축구화 유지', desc: '감각이 중요하다', out: [O(1, '침착성 +1 · 컨디션 +1 (1시즌)', 0, { attrs: { composure: 1 }, form: 1, formWhy: '익숙한 장비' })] }] }; } },
  { id: 'language', when: ['pre', 'mid'], cond: S => abroad(S) && S.car.years <= 1 && !S.flags['lang_' + S.car.club], w: 2, build: S => ({ title: '언어 장벽', desc: '새 리그에서 감독 지시를 제대로 알아듣지 못하는 일이 잦습니다.', icon: 'book', opts: [
    { label: '개인 과외', desc: `비용 ${eurK(12000)}`, out: [O(.75, '신뢰 +8 · 사기 +6', 1, { trust: 8, morale: 6, money: -12000 }), O(.25, '진도가 더딤', 0, { money: -12000, trust: 2 })] },
    { label: '동료 통역에 의존', desc: '돈은 안 든다', out: [O(1, '신뢰 −3 · 사기 −3', 0, { trust: -3, morale: -3 })] },
    { label: '같은 국적 동료와만 지낸다', desc: '마음은 편하다', out: [O(1, '사기 +8 · 신뢰 −6', 0, { morale: 8, trust: -6 })] }] }), post2: S => { S.flags['lang_' + S.car.club] = 1; } },
  { id: 'homesick', when: ['mid'], cond: S => abroad(S) && S.p.age <= 26, w: .8, build: S => ({ title: '향수병', desc: '해외 생활이 길어지며 집이 그리워졌습니다. 경기력에도 영향이 오기 시작했습니다.', icon: 'heart', opts: [
    { label: '가족을 초청한다', desc: `비용 ${eurK(30000)}`, out: [O(1, '사기 +12', 1, { morale: 12, money: -30000 })] },
    { label: '이겨낸다', desc: '프로답게', out: [O(.6, '침착성 +2', 1, { attrs: { composure: 2 } }), O(.4, '기량 저하 (1시즌 −2)', -1, { form: -2, formWhy: '향수병' })] },
    { label: '고국 리그 이적을 알아본다', desc: '에이전트에게 연락', out: [O(1, '이적 제안 증가 · 신뢰 −8', 0, { transferReq: 1, trust: -8, morale: 6 })] }] }) },
  { id: 'pain', when: ['mid'], cond: S => first(S) && S.ss && S.ss.inj === 0, w: .9, build: S => ({ title: '경미한 통증', desc: '중요한 경기를 앞두고 햄스트링이 당깁니다. 의료진은 판단을 당신에게 맡겼습니다.', icon: 'medic', opts: [
    { label: '참고 뛴다', desc: '팀이 나를 필요로 한다', out: [O(.65, '신뢰 +7', 1, { trust: 7 }), O(.35, '부상 악화 (35일)', -1, { inj: 35 })] },
    { label: '한 경기 쉰다', desc: '길게 본다', out: [O(1, '짧은 휴식 (8일) · 부상 위험 감소', 0, { inj: 8, injp: .95 })] }] }) },
  { id: 'newrole', when: ['pre'], cond: S => first(S) && !isGK(S), w: .8, build: S => ({ title: '새로운 전술 역할', desc: '감독이 이번 시즌 새 전술에서 당신에게 낯선 역할을 맡기려 합니다.', icon: 'tactic', opts: [
    { label: '새 역할을 배운다', desc: '전술 이해도를 넓힌다', out: [O(.65, '시야 +2 · 위치 선정 +2 · 신뢰 +5', 1, { attrs: { vision: 2, attPos: 2, defAware: 1 }, trust: 5 }), O(.35, '혼란 (1시즌 −1)', -1, { form: -1, formWhy: '전술 적응' })] },
    { label: '익숙한 역할을 요청', desc: '내 장점을 살린다', out: [O(1, '컨디션 +1 · 신뢰 −4', 0, { form: 1, formWhy: '익숙한 역할', trust: -4 })] }] }) },
  { id: 'bulk', when: ['pre'], cond: S => S.p.age >= 18 && S.p.age <= 30 && !isGK(S), w: .8, build: S => ({ title: '체형 조절', desc: '피지컬 코치가 이번 비시즌 몸의 방향을 정하자고 합니다.', icon: 'coach', opts: [
    { label: '벌크업', desc: '몸싸움에 강하게', out: [O(1, '힘 +4 · 점프 +1 · 가속 −2', 0, { attrs: { strength: 4, jumping: 1, accel: -2, agility: -1 } })] },
    { label: '린업', desc: '가볍고 빠르게', out: [O(1, '가속 +2 · 민첩성 +2 · 힘 −3', 0, { attrs: { accel: 2, agility: 2, strength: -3 } })] },
    { label: '지금 몸 유지', desc: '밸런스 유지', out: [O(1, '스태미너 +1 · 부상 위험 소폭 감소', 0, { attrs: { stamina: 1 }, injp: .96 })] }] }) },
  { id: 'mentee', when: ['pre'], cond: S => first(S) && S.p.age >= 28, w: .7, build: S => ({ title: '유망주 멘토 요청', desc: '구단이 1군에 올라온 유망주를 맡아 달라고 부탁합니다.', icon: 'mentor', opts: [
    { label: '맡는다', desc: '시간을 들여 가르친다', out: [O(1, '신뢰 +6 · 명성 +2 · 시야 +1', 1, { trust: 6, rep: 2, attrs: { vision: 1 } })] },
    { label: '내 경기력이 먼저', desc: '정중히 거절', out: [O(1, '컨디션 +1 (1시즌) · 신뢰 −3', 0, { form: 1, formWhy: '자기 관리', trust: -3 })] }] }) },
  { id: 'fanclash', when: ['mid'], cond: S => first(S) && S.p.rep >= 5, w: .6, build: S => ({ title: '팬과의 충돌', desc: '경기 후 일부 팬들이 당신에게 거친 야유를 퍼부었습니다.', icon: 'fire', opts: [
    { label: '먼저 손을 내민다', desc: '사인과 대화', out: [O(1, '명성 +2 · 사기 −2', 1, { rep: 2, morale: -2 })] },
    { label: '골 세리머니로 응수', desc: '다음 경기에서 보여 준다', out: [O(.4, '명성 +4 · 사기 +8', 1, { rep: 4, morale: 8 }), O(.6, '도발 징계 2경기 · 명성 −4', -1, { susp: 2, rep: -4 })] },
    { label: '무시한다', desc: '반응하지 않는다', out: [O(.5, '조용히 지나감', 1, {}), O(.5, '명성 −4', -1, { rep: -4 })] }] }) },
  { id: 'bonus', when: ['pre'], cond: S => first(S) && !['nt'].includes('x'), w: .8, build: S => ({ title: '계약 조건 선택', desc: '구단이 이번 시즌 급여 구조를 고르라고 합니다.', icon: 'money', opts: [
    { label: '고정급 인상', desc: '안정적인 수입', out: [O(1, '급여 +8%', 1, { flag: 'fixedRaise' })] },
    { label: '성과급 조항', desc: '공격포인트·출전마다 보너스', out: [O(1, '시즌 끝에 성과에 따라 보너스', 0, { flag: 'perfBonus' })] }] }), post2: S => { if (S.flags.fixedRaise) { S.flags.fixedRaise = 0; S.car.wage = Math.round(S.car.wage * 1.08); } } },
  { id: 'invest', when: ['pre'], cond: S => S.p.money > 200000, w: .6, build: S => { const amt = Math.round(S.p.money * .3 / 1000) * 1000; return { title: '투자 제안', desc: `지인이 스포츠 브랜드 사업에 ${eurK(amt)}을 투자하라고 권합니다.`, icon: 'money', opts: [
    { label: '투자한다', desc: '고위험 고수익', out: [O(.45, `수익 +${eurK(Math.round(amt * .7))}`, 1, { money: Math.round(amt * .7) }), O(.35, `손실 −${eurK(Math.round(amt * .4))}`, -1, { money: -Math.round(amt * .4) }), O(.2, `사기 피해 −${eurK(amt)} · 사기 −10`, -1, { money: -amt, morale: -10 })] },
    { label: '은행에 맡긴다', desc: '안전하게', out: [O(1, `이자 +${eurK(Math.round(amt * .04))}`, 1, { money: Math.round(amt * .04) })] }] }; } },
  { id: 'growth', when: ['pre'], cond: S => ageIn(S, 16, 18) && !S.flags.grew, w: 1.4, build: S => ({ title: '성장기', desc: '최근 키가 부쩍 컸습니다. 몸의 균형이 흔들리고 있습니다.', icon: 'clock', opts: [
    { label: '근력 위주로 적응', desc: '커진 몸을 무기로', out: [O(1, '힘 +3 · 점프 +2 · 민첩성 −2', 0, { attrs: { strength: 3, jumping: 2, agility: -2, balance: -1 }, flag: 'grew' })] },
    { label: '협응력 훈련 병행', desc: `비용 ${eurK(8000)}`, out: [O(.7, '밸런스 +2 · 민첩성 +1 · 힘 +1', 1, { attrs: { balance: 2, agility: 1, strength: 1 }, money: -8000, flag: 'grew' }), O(.3, '성장통 (15일)', -1, { inj: 15, money: -8000, flag: 'grew' })] }] }), post3: S => { S.p.height += rint(2, 5); } },
  { id: 'tour', when: ['pre'], cond: first, w: .8, build: S => ({ title: '프리시즌 해외 투어', desc: '구단이 아시아·미국 투어를 떠납니다. 일정이 빡빡합니다.', icon: 'sun', opts: [
    { label: '전 경기 출전 자청', desc: '감독에게 어필', out: [O(.6, '신뢰 +8', 1, { trust: 8 }), O(.4, '피로 누적 부상 (14일)', -1, { inj: 14 })] },
    { label: '컨디션 관리', desc: '시즌 개막에 맞춘다', out: [O(1, '컨디션 +1 (1시즌)', 0, { form: 1, formWhy: '컨디션 관리' })] },
    { label: '마케팅 행사 적극 참여', desc: '팬과 스폰서', out: [O(1, '명성 +3 · 수입 소폭', 0, { rep: 3, money: Math.round(wk(S) * 2) })] }] }) },
  { id: 'number', when: ['pre'], cond: S => first(S) && S.p.num !== 10 && S.p.rep >= 15 && !S.flags.num10, w: .5, build: S => ({ title: '등번호 제안', desc: '구단이 상징적인 10번을 달아 달라고 합니다.', icon: 'band', opts: [
    { label: '10번을 단다', desc: '팀의 상징이 된다', out: [O(.7, '명성 +3 · 사기 +6', 1, { rep: 3, morale: 6, flag: 'num10' }), O(.3, '부담감 (1시즌 −1)', -1, { form: -1, formWhy: '10번의 무게', flag: 'num10' })] },
    { label: '지금 번호 유지', desc: '나만의 번호', out: [O(1, '침착성 +1', 0, { attrs: { composure: 1 } })] }] }), post2: S => { if (S.flags.num10 === 1 && S.p.num !== 10 && R() < 2) { S.p.num = 10; S.flags.num10 = 2; } } },
  { id: 'critique', when: ['mid'], cond: S => first(S) && avgR(S) < 6.95, w: .9, build: S => ({ title: '코치의 혹평', desc: '코치가 동료들 앞에서 당신의 플레이를 강하게 지적했습니다.', icon: 'whistle', opts: [
    { label: '받아들이고 고친다', desc: '자존심보다 성장', out: [O(.6, '+1 OVR', 1, { ovr: 1, focus: posFocus(S) }), O(.4, '사기 −6', -1, { morale: -6 })] },
    { label: '정면으로 반박', desc: '내 방식이 옳다', out: [O(1, '사기 +4 · 신뢰 −6', 0, { morale: 4, trust: -6 })] }] }) },
  { id: 'double', when: ['pre'], cond: S => S.p.age <= 30, w: .8, build: S => ({ title: '하루 2회 훈련', desc: '감독이 프리시즌 동안 오전·오후 2회 훈련에 참여하라고 권합니다.', icon: 'coach', opts: [
    { label: '참가한다', desc: '양으로 승부', out: [O(.55, '+1 OVR · 신뢰 +4', 1, { ovr: 1, trust: 4 }), O(.25, '효과 미미', 0, {}), O(.2, '과부하 부상 (15일)', -1, { inj: 15 })] },
    { label: '오후는 회복에 쓴다', desc: '질로 승부', out: [O(1, '노쇠화 소폭 지연 · 신뢰 −3', 0, { lon: .97, trust: -3 })] }] }) },
  { id: 'teammateinj', when: ['mid'], cond: S => first(S) && ['rotation', 'backup'].includes(role(S)), w: 1.4, build: S => ({ title: '주전 경쟁자 부상', desc: '같은 포지션 주전이 장기 부상을 당했습니다. 기회가 왔습니다.', icon: 'medic', opts: [
    { label: '기회를 잡는다', desc: '훈련에서 전력을 다한다', out: [O(.6, '신뢰 +14', 1, { trust: 14 }), O(.4, '긴장 (1시즌 −1)', -1, { form: -1, formWhy: '부담감', trust: 4 })] },
    { label: '동료를 챙긴다', desc: '병문안과 응원', out: [O(1, '사기 +6 · 신뢰 +5', 0, { morale: 6, trust: 5 })] }] }) },
  { id: 'redcard', when: ['mid'], cond: first, w: .5, build: S => ({ title: '억울한 퇴장', desc: '오심으로 퇴장을 당했습니다. 3경기 출전 정지가 내려졌습니다.', icon: 'whistle', opts: [
    { label: '항소한다', desc: '판정을 바로잡는다', out: [O(.5, '징계 철회', 1, {}), O(.5, '항소 기각 · 1경기 추가', -1, { susp: 4 })] },
    { label: '징계를 받아들인다', desc: '논란을 키우지 않는다', out: [O(1, '3경기 정지 · 신뢰 +3', 0, { susp: 3, trust: 3 })] }] }) },
  { id: 'poach', when: ['mid'], cond: S => S.car.status === 'youth' && S.p.age >= 17, w: 1.2, build: S => ({ title: '다른 구단의 접촉', desc: '다른 구단 스카우트가 유스 계약이 끝나면 데려가고 싶다고 귀띔했습니다.', icon: 'brief', opts: [
    { label: '관심을 보인다', desc: '선택지를 넓힌다', out: [O(1, '이적 제안 증가 · 신뢰 −10', 0, { transferReq: 1, trust: -10 })] },
    { label: '구단에 충성', desc: '여기서 성공한다', out: [O(1, '신뢰 +8', 1, { trust: 8 })] }] }) },
  { id: 'stream', when: ['mid'], cond: S => S.p.age >= 18 && S.p.age <= 32, w: .5, build: S => ({ title: '개인 방송 제안', desc: '플랫폼에서 개인 방송을 해 보자는 제안이 왔습니다.', icon: 'screen', opts: [
    { label: '시작한다', desc: '팬과 소통', out: [O(.7, `명성 +4 · 수입 +${eurK(20000)}`, 1, { rep: 4, money: 20000 }), O(.3, '말실수 · 명성 −4 · 신뢰 −5', -1, { rep: -4, trust: -5 })] },
    { label: '축구에 집중', desc: '사생활 보호', out: [O(1, '침착성 +1 · 사기 +3', 0, { attrs: { composure: 1 }, morale: 3 })] }] }) }
];

C.EVENTS = EVENTS;
// ---------- 이벤트 선택지 랜덤화 + 기대값 밸런스 ----------
// 효과를 하나의 점수로 환산 (주급 8주치 ≈ 1점, OVR 1 ≈ 5점)
function effValue(S, e) {
  if (!e) return 0;
  const wk = Math.max(3000, S.car.wage || 3000);
  let v = 0;
  v += (e.ovr || 0) * 5 + (e.form || 0) * 2.2 * (e.formSeasons || 1) + (e.trust || 0) * .3 + (e.morale || 0) * .12 + (e.rep || 0) * .35;
  v += (e.money || 0) / (wk * 8) + (e.pot || 0) * 3 - (e.inj || 0) * .09 - (e.susp || 0) * .7 + (e.weak || 0) * 3 + (e.skill || 0) * 2.5;
  if (e.lon) v += (1 - e.lon) * 25; if (e.injp) v += (1 - e.injp) * 15;
  if (e.attrs) for (const k in e.attrs) v += e.attrs[k] * .6;
  if (e.flag === 'superAgent') v += 4; else if (e.flag === 'raise') v += 6; else if (e.flag) v += 1.5;
  return v;
}
C.effValue = effValue;
const optEV = (S, o) => o.out.reduce((a, x) => a + x.p * effValue(S, x.eff), 0);
// 수치 흔들기: 이득은 f배, 손해는 g배
function scaleEff(e, f, g, wk) {
  if (!e) return e;
  const n = Object.assign({}, e);
  const sc = (v, int) => { const k = v >= 0 ? f : g; let x = v * k; if (int) { x = Math.round(x); if (x === 0 && v !== 0) x = Math.sign(v); } return x; };
  for (const key of ['trust', 'morale', 'rep', 'pot', 'form']) if (n[key]) n[key] = sc(n[key], true);
  if (n.ovr) { let x = Math.round(sc(n.ovr) * 2) / 2; if (x === 0) x = Math.sign(n.ovr) * .5; n.ovr = x; }
  if (n.money) n.money = Math.round(sc(n.money) / 1000) * 1000 || Math.sign(n.money) * 1000;
  if (n.inj) n.inj = Math.max(3, Math.round(n.inj * g));
  if (n.susp) n.susp = Math.max(1, Math.round(n.susp * g));
  if (n.lon) n.lon = 1 - (1 - n.lon) * (n.lon < 1 ? f : g);
  if (n.injp) n.injp = 1 - (1 - n.injp) * (n.injp < 1 ? f : g);
  if (n.attrs) { const a = {}; for (const k in n.attrs) a[k] = sc(n.attrs[k], true); n.attrs = a; }
  return n;
}
// 효과를 사람이 읽는 문구로
function effText(S, e) {
  if (!e) return '';
  const parts = [], sg = v => (v > 0 ? '+' : '−') + Math.abs(v);
  if (e.pos) parts.push(`${e.pos} 전향`);
  if (e.ovr) parts.push(`${sg(e.ovr)} OVR`);
  if (e.attrs) { const ks = Object.keys(e.attrs).filter(k => e.attrs[k]); if (ks.length) parts.push(ks.slice(0, 3).map(k => `${C.ALABEL[k]} ${sg(e.attrs[k])}`).join(' · ')); }
  if (e.form) parts.push(e.form > 0 ? `컨디션 +${e.form} (${e.formSeasons || 1}시즌)` : `기량 저하 (${e.formSeasons || 1}시즌 −${-e.form})`);
  if (e.weak) parts.push(`약발 ★${sg(e.weak)}`);
  if (e.skill) parts.push(`개인기 ★${sg(e.skill)}`);
  if (e.trust) parts.push(`신뢰 ${sg(e.trust)}`);
  if (e.rep) parts.push(`명성 ${sg(e.rep)}`);
  if (e.morale) parts.push(`사기 ${sg(e.morale)}`);
  if (e.pot) parts.push(`잠재력 ${sg(e.pot)}`);
  if (e.lon) parts.push(e.lon < 1 ? '노쇠화 지연' : '노쇠화 가속');
  if (e.injp) parts.push(e.injp < 1 ? '부상 위험 감소' : '부상 위험 증가');
  if (e.inj) parts.push(`부상 ${e.inj}일`);
  if (e.susp) parts.push(`${e.susp}경기 정지`);
  if (e.money) parts.push(e.money > 0 ? `수입 ${C.fmtEUR(e.money)}` : `지출 ${C.fmtEUR(-e.money)}`);
  if (e.transferReq) parts.push('이적 제안 증가');
  if (e.loanReq) parts.push('겨울 임대 제안');
  return parts.join(' · ');
}
C.effText = effText;
// 원래 문구에서 숫자 없는 설명 부분만 남긴다 (예: '도핑 적발 · 10경기 정지' → '도핑 적발')
const descPart = chip => (chip || '').split(' · ').filter(x => !/[0-9+−\-★]/.test(x) && !/^(사기|신뢰|명성|노쇠화|부상 위험|컨디션)/.test(x)).join(' · ');
const GENERIC = [
  { label: '가족과 상의한다', desc: '서두르지 않는다', out: [{ p: 1, eff: { morale: 7 } }] },
  { label: '에이전트에게 맡긴다', desc: '전문가의 판단', out: [{ p: .6, eff: { trust: 4, rep: 1 } }, { p: .4, eff: { trust: -4, money: -15000 } }] },
  { label: '동료들 의견을 따른다', desc: '라커룸 분위기 우선', out: [{ p: .55, eff: { trust: 5, morale: 4 } }, { p: .45, eff: { morale: -5 } }] },
  { label: '하루 더 생각해 본다', desc: '결정을 미룬다', out: [{ p: .5, eff: { morale: 4 } }, { p: .5, eff: { trust: -3 } }] },
  { label: '코칭스태프에 맡긴다', desc: '구단의 판단을 따른다', out: [{ p: 1, eff: { trust: 4 } }] }
];
const NOBAL = new Set(['injrush']);
function addBonus(out, need) {
  const e = out.eff = Object.assign({}, out.eff || {});
  const keys = [['morale', .12, 20], ['trust', .3, 12], ['rep', .35, 6]].filter(k => !(e[k[0]] < 0));
  for (const [k, w, cap] of keys.sort(() => R() - .5)) { if (need <= .1) break; const add = Math.min(cap, Math.max(1, Math.round(need / w))); e[k] = (e[k] || 0) + add; need -= add * w; }
}
function balanceEvent(S, b) {
  if (NOBAL.has(b.id)) return b;
  const wk = Math.max(3000, S.car.wage || 3000);
  // 공통 선택지 추가 (40%)
  if (R() < .4 && b.opts.length < 4) { const g = pick(GENERIC); b.opts.push(JSON.parse(JSON.stringify(g))); b.opts[b.opts.length - 1].generic = true; }
  // 1) 흔들기
  for (const o of b.opts) {
    if (o.out.length > 1) {
      const d = (R() - .5) * .24; o.out[0].p = clamp(o.out[0].p + d, .1, .9);
      const rest = o.out.slice(1), rs = rest.reduce((a, x) => a + x.p, 0) || 1, left = 1 - o.out[0].p;
      rest.forEach(x => x.p = x.p / rs * left);
    }
    const f = .7 + R() * .65, g = .75 + R() * .55;
    o.out.forEach(x => { x.eff = scaleEff(x.eff, f, g, wk); });
  }
  // 2) 기대값 맞추기: 선택지마다 목표값 = 평균 + 무작위 흔들림. 성공/실패가 있으면 확률로, 결과가 하나면 크기로 맞춘다
  const ev0 = b.opts.map(o => optEV(S, o)), m = ev0.reduce((a, x) => a + x, 0) / ev0.length;
  // 각 선택지가 끌어올릴 수 있는 최대 기대값 → 모두가 닿을 수 있는 높이를 기준으로 삼는다
  const maxAch = b.opts.map((o, i) => {
    const vals = o.out.map(x => effValue(S, x.eff)), hi = Math.max(...vals);
    if (o.out.length > 1 && hi - Math.min(...vals) > .3) { const rest = vals.filter((v, j) => j !== vals.indexOf(hi)); return .88 * hi + .12 * (rest.reduce((a, x) => a + x, 0) / rest.length); }
    return ev0[i] > 0 ? ev0[i] * 1.8 : ev0[i];
  });
  const reach = maxAch.filter(x => x > Math.max(m, .3) * .35).sort((a, b) => a - b);
  const base = Math.max(.3, reach.length ? Math.min(Math.max(m, reach[0] * .75), reach[0] * .9) : m);
  const spread = Math.max(.5, Math.abs(base) * .3);
  b.opts.forEach(o => {
    const target = base + N(0, spread);
    const vals = o.out.map(x => effValue(S, x.eff));
    const hi = vals.indexOf(Math.max(...vals)), lo = vals.indexOf(Math.min(...vals));
    if (o.out.length > 1 && vals[hi] - vals[lo] > .3) {
      // 비관 분포 D0(최고 결과 8%, 중간 결과 절반이 최악으로) ↔ 낙관 분포 D1(최고 결과 85%) 사이에서 목표 기대값을 맞춘다
      const n = o.out.length, p0 = o.out.map(x => x.p);
      const D0 = p0.map((p, j) => j === hi ? .08 : j === lo ? 0 : p * .5);
      D0[lo] = 1 - D0.reduce((a, x) => a + x, 0);
      const os = p0.reduce((a, p, j) => a + (j === hi ? 0 : p), 0) || 1;
      const D1 = p0.map((p, j) => j === hi ? .85 : p / os * .15);
      const e0 = D0.reduce((a, p, j) => a + p * vals[j], 0), e1 = D1.reduce((a, p, j) => a + p * vals[j], 0);
      const t = clamp((target - e0) / ((e1 - e0) || 1), 0, 1);
      o.out.forEach((x, j) => { x.p = D0[j] + (D1[j] - D0[j]) * t; });
      void n;
      // 낙관 분포로도 모자라면 손해는 줄이고 이득은 키운다
      let gap = target - optEV(S, o);
      if (gap > .3) {
        const L = o.out[lo]; if (vals[lo] < 0) { const g = clamp(1 - gap / (-vals[lo] * L.p), .25, 1); L.eff = scaleEff(L.eff, 1, g, wk); }
        gap = target - optEV(S, o);
        const H = o.out[hi]; if (gap > .3 && vals[hi] > .2) { const f = clamp(1 + gap / (vals[hi] * H.p), 1, 2.5); H.eff = scaleEff(H.eff, f, 1, wk); }
        gap = target - optEV(S, o);
        if (gap > .3) addBonus(H, gap / (H.p || 1));
      }
    } else {
      const ev = optEV(S, o);
      if (ev > .2 && target > .2) { const k = clamp(target / ev, .5, 1.8); o.out.forEach(x => { x.eff = scaleEff(x.eff, k, 1, wk); }); }
      // 낮은 선택지는 사기·신뢰·명성 보너스를 붙여 끌어올린다
      let ev1 = optEV(S, o);
      if (ev1 < target - .3) {
        addBonus(o.out[0], (target - ev1) / (o.out[0].p || 1));
      }
      // 정수 반올림 탓에 여전히 높으면 '효과 미미' 결과를 섞어 확실한 이득을 없앤다
      const ev2 = optEV(S, o);
      if (o.out.length === 1 && ev2 > .3 && ev2 > target + .35) {
        const ps = clamp(Math.max(target, .1) / ev2, .4, .85);
        o.out[0].p = ps; o.out.push({ p: 1 - ps, eff: {}, chip: pick(['기대만큼 효과가 없었다', '별 차이 없음', '흐지부지 끝남']), good: 0 });
      }
    }
  });
  // 3) 확률은 5% 단위로, 문구 다시 쓰기
  for (const o of b.opts) {
    let tot = 0; o.out.forEach((x, j) => { x.p = j === o.out.length - 1 ? +(1 - tot).toFixed(2) : Math.max(.05, Math.round(x.p * 20) / 20); tot += x.p; });
    o.out.forEach(x => {
      const t = effText(S, x.eff), dsc = descPart(x.chip);
      x.chip = [dsc, t].filter(Boolean).join(' · ') || '변화 없음';
      const v = effValue(S, x.eff); x.good = v > .6 ? 1 : v < -.6 ? -1 : 0;
    });
    o.ev = +optEV(S, o).toFixed(1);
  }
  return b;
}
C.balanceEvent = balanceEvent;
function drawEvents(S, when, n) {
  const pool = EVENTS.filter(e => e.when.includes(when) && !(S.recentEv || []).includes(e.id) && (!e.cond || e.cond(S)));
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const e = wpick(pool, x => x.w); pool.splice(pool.indexOf(e), 1);
    const b = e.build(S); b.id = e.id; b.ev = e; balanceEvent(S, b); out.push(b);
  }
  S.recentEv = (S.recentEv || []).concat(out.map(e => e.id)).slice(-8);
  return out;
}
C.drawEvents = drawEvents;
function resolveEvent(S, b, oi) {
  const opt = b.opts[oi];
  const e = b.ev || EVENTS.find(x => x.id === b.id);
  if (e && e.pre2) e.pre2(S);
  const o = rollOutcome(opt);
  const ch = applyEffect(S, o.eff);
  if (e && e.post && oi === 0) e.post(S, b);
  if (e && e.post2) e.post2(S);
  if (e && e.post3) e.post3(S, b, oi, o);
  const log = { title: b.title, choice: opt.label, chip: o.chip, good: o.good, text: o.text || '', changes: ch, d: S.ss ? S.ss.lastDay : null };
  (S.evLog = S.evLog || []).push(Object.assign({ y: S.w.year, age: S.p.age }, log));
  return log;
}
C.resolveEvent = resolveEvent;

// ================= 결정적 순간 =================
const MTYPES = {
  ST: ['oneone', 'penalty', 'header', 'oneone', 'volley'],
  W: ['cross', 'cutin', 'dribble', 'oneone'],
  AM: ['through', 'longshot', 'freekick', 'oneone'],
  CM: ['through', 'longshot', 'freekick', 'tackle'],
  DM: ['tackle', 'block', 'through', 'longshot'],
  FB: ['cross', 'tackle', 'block'],
  CB: ['block', 'tackle', 'header'],
  GK: ['pensave', 'gk1v1', 'pensave']
};
function makeMoment(S, rec, o) {
  const p = S.p, r = C.ROLE[p.pos];
  let types = MTYPES[r].slice();
  if (S.ss.penTaker && r !== 'GK') types.push('penalty', 'penalty');
  if (S.ss.fkTaker && r !== 'GK') types.push('freekick');
  const type = pick(types);
  const minute = rint(68, 90);
  const ctx = { type, minute, score: [rec.gf, rec.ga], opp: o.oppName, comp: o.compName, stage: o.stage, oppStr: o.oppStr, d: o.d };
  const A = k => p.a[k] + C.modSum(p) * .9;
  const kq = clamp((o.oppStr - 55) / 35, 0, 1); // 상대 골키퍼/수비 수준
  ctx.gk = Math.round(clamp(58 + kq * 32 + N(0, 3), 50, 92));
  const sc = `${rec.gf}-${rec.ga}`;
  const T = {
    oneone: ['골키퍼와 1대1', '수비 뒷공간을 완벽하게 뚫었습니다. 골문 어디로 찰까요?', 'shot'],
    penalty: ['페널티킥', '페널티킥을 얻어냈습니다. 키커는 당신입니다.', 'shot'],
    volley: ['발리 기회', '크로스가 떨어집니다. 논스톱으로 때립니다. 어디로?', 'shot'],
    longshot: ['중거리 슈팅', '박스 앞에 공간이 열렸습니다. 과감하게 때립니다.', 'shot'],
    freekick: ['직접 프리킥', '아크 정면 23m 프리킥. 벽 너머로 감아 찹니다.', 'shot'],
    cutin: ['컷인 슈팅', '측면에서 안으로 파고들었습니다. 반대편 포스트가 보입니다.', 'shot'],
    header: ['코너킥 헤더', '코너킥이 올라옵니다. 어느 지점으로 뛰어들까요?', 'pick'],
    cross: ['크로스 타이밍', '측면을 돌파했습니다. 어디로 올릴까요?', 'pick'],
    through: ['킬 패스', '상대 라인이 높습니다. 누구에게 찔러줄까요?', 'pick'],
    dribble: ['1대1 돌파', '수비수가 정면에 섰습니다. 어떻게 제칠까요?', 'pick'],
    tackle: ['결정적 수비', '상대 공격수가 박스 쪽으로 돌진합니다. 어떻게 막을까요?', 'pick'],
    block: ['슈팅 각 막기', '상대가 박스 모서리에서 슈팅 자세를 잡았습니다. 어느 쪽을 막을까요?', 'pick'],
    pensave: ['페널티킥 선방', '상대에게 페널티킥이 주어졌습니다. 어디로 뜰까요?', 'goal'],
    gk1v1: ['1대1 위기', '상대 공격수가 혼자 달려옵니다.', 'pick']
  }[type];
  ctx.title = T[0]; ctx.desc = T[1]; ctx.ui = T[2];
  ctx.sub = `후반 ${minute}분 · ${sc} · ${o.oppName}전`;
  // 슈팅형: 정확도(실행 오차)
  if (ctx.ui === 'shot') {
    const skill = { oneone: A('finishing') * .7 + A('composure') * .3, penalty: A('penalties') * .75 + A('composure') * .25, volley: A('volleys') * .8 + A('composure') * .2, longshot: A('longShots') * .7 + A('shotPower') * .3, freekick: A('fkAcc') * .7 + A('curve') * .3, cutin: A('finishing') * .4 + A('curve') * .4 + A('longShots') * .2 }[type];
    ctx.skill = Math.round(skill);
    ctx.sigma = clamp((100 - skill) / 100 * ({ penalty: .26, oneone: .34, volley: .48, longshot: .52, freekick: .5, cutin: .42 }[type]), .03, .4);
    ctx.reach = { penalty: .2, oneone: .3, volley: .26, longshot: .2, freekick: .2, cutin: .22 }[type] + kq * .07;
    ctx.power = type === 'penalty' ? A('shotPower') : A('shotPower');
    ctx.wall = type === 'freekick';
  }
  // ----- 선택형 장면: 각 선택지 = 내 능력으로 해낼 확률(exec) × 그 순간의 수비 밀집도 → 성공 시 기대 보상(reward)
  // 화면에는 능력 적합도(대략)와 보상 크기만 보이고, 밀집도는 그림의 수비수 배치로 읽어야 한다
  const E = (x, base, k) => clamp(base + (x - 62) * k, .12, .9);
  const mk = (label, desc, exec, reward, extra) => Object.assign({ label, desc, exec, reward }, extra || {});
  if (type === 'header') ctx.opts = [
    mk('니어포스트로 끊는다', '먼저 닿아 방향만 바꾼다', E(A('heading') * .5 + A('accel') * .5, .5, .008), .45),
    mk('페널티 스폿에서 내려찍는다', '정면에서 힘으로 경합', E(A('heading') * .6 + A('strength') * .4 + (p.height - 182) * .4, .42, .008), .58),
    mk('파포스트로 돌아 들어간다', '수비 시야 밖에서 노린다', E(A('jumping') * .5 + A('attPos') * .5 + (p.height - 182) * .3, .32, .007), .5)];
  if (type === 'cross') { const cq = A('crossing'); ctx.opts = [
    mk('니어포스트 낮은 크로스', '빠르고 낮게 깔아 준다', E(cq, .55, .007), .38),
    mk('페널티 스폿 띄우기', '공격수 머리를 노린다', E(cq, .45, .008), .5),
    mk('파포스트로 감아 올리기', '수비 뒤 빈 공간으로', E(cq * .6 + A('curve') * .4, .36, .009), .62),
    mk('컷백', '뒤로 빼서 쇄도하는 동료에게', E(A('vision') * .5 + A('shortPass') * .5, .62, .006), .3)]; ctx.assist = true; }
  if (type === 'through') { ctx.opts = [
    mk('침투하는 스트라이커', '수비 사이로 찔러 준다', E(A('vision') * .6 + A('shortPass') * .4, .4, .009), .5),
    mk('반대편 윙어', '대각선 롱패스로 전환', E(A('longPass'), .5, .008), .41),
    mk('오버래핑 풀백', '측면으로 열어 준다', E(A('shortPass'), .6, .005), .33)]; ctx.assist = true; }
  if (type === 'dribble') ctx.opts = [
    mk('안쪽으로 접어 슈팅', '반대발로 감아 찬다', E(A('dribbling') * .5 + A('agility') * .5 + (p.weak - 3) * 4, .44, .008), .32, { own: true }),
    mk('바깥으로 치고 달리기', '속도로 제치고 크로스', E(A('sprint') * .6 + A('accel') * .4, .48, .008), .3),
    mk('개인기로 벗겨 낸다', '헛다리로 공간을 만든다', E(A('dribbling') + (p.skill - 3) * 6, .38, .009), .45, { own: true })];
  // 상대 공격수 성향 (수비·골키퍼 장면의 단서)
  const ATT = [['빠른 드리블러', '방향 전환이 잦다'], ['힘이 좋은 타깃형', '몸으로 버틴다'], ['침착한 피니셔', '서두르지 않는다'], ['슈팅이 강한 선수', '먼 거리에서도 때린다']];
  if (type === 'tackle') { const at = rint(0, 3); ctx.att = ATT[at]; const m = [[-.14, .02, .12], [.06, -.12, .02], [.04, .08, -.16], [.08, .04, -.06]][at]; ctx.opts = [
    mk('스탠딩 태클', '정확하게 공만 빼낸다', clamp(E(A('standTackle'), .5, .009) + m[0], .1, .92), 0, { risk: '실점 위험 보통', fail: .4 }),
    mk('슬라이딩 태클', '몸을 던진다', clamp(E(A('slideTackle'), .58, .008) + m[1], .1, .92), 0, { risk: '실패하면 PK·경고 위험', fail: .55, card: .45 }),
    mk('지연 수비', '동료가 올 때까지 버틴다', clamp(E(A('defAware'), .44, .01) + m[2], .1, .92), 0, { risk: '실패해도 슈팅만 허용', fail: .25 })]; }
  if (type === 'block') { ctx.foot = R() < .7 ? 'R' : 'L'; ctx.opts = [['왼쪽 각', '먼 포스트 쪽'], ['가운데', '몸으로 정면 차단'], ['오른쪽 각', '가까운 포스트 쪽']]; ctx.read = clamp(.15 + (A('defAware') - 60) * .006 + (A('interceptions') - 60) * .004, .05, .45); }
  if (type === 'gk1v1') { const at = rint(0, 3); ctx.att = ATT[at]; const m = [[.1, -.06, -.12], [.06, .02, .02], [-.14, .1, -.02], [.12, -.14, .04]][at]; ctx.opts = [
    mk('앞으로 뛰쳐나간다', '각도를 좁힌다', clamp(E(A('gkSpeed') * .6 + A('gkPos') * .4, .46, .008) + m[0], .1, .9), 0, { risk: '칩샷에 약함' }),
    mk('끝까지 버틴다', '슈팅 순간 반응', clamp(E(A('gkReflexes'), .42, .009) + m[1], .1, .9), 0, { risk: '강슛에 약함' }),
    mk('미리 몸을 던진다', '다이빙으로 블록', clamp(E(A('gkDiving'), .4, .009) + m[2], .1, .9), 0, { risk: '드리블에 약함' })]; }
  // 수비 밀집도: 그림에 수비수 수(0~2)로 표시. 0명이면 크게 유리, 2명이면 크게 불리
  if (['header', 'cross', 'through', 'dribble'].includes(type)) {
    const n = ctx.opts.length; const pres = shuffle([0, 1, 1, 2, 2, 1].slice(0, n));
    ctx.opts.forEach((o, i) => { o.def = pres[i]; o.p = clamp(o.exec * [1.4, 1, .5][o.def], .05, .95); });
  } else if (ctx.opts && type !== 'block') ctx.opts.forEach(o => { o.p = o.exec; });
  const tag = (v, hi, lo) => v >= hi ? '높음' : v >= lo ? '보통' : '낮음';
  if (ctx.opts && type !== 'block') ctx.opts.forEach(o => { o.fit = o.exec >= .6 ? '자신 있음' : o.exec >= .42 ? '보통' : '어려움'; if (o.reward) o.rewardTag = (ctx.assist ? '득점 기대 ' : '골 기대 ') + tag(o.reward, .5, .35); });
  if (type === 'pensave') { ctx.dive = clamp((A('gkDiving') + A('gkReflexes')) / 2, 30, 99); }
  return ctx;
}
function pickOpts(arr) { return arr.map(a => ({ label: a[0], desc: a[1], p: +a[2].toFixed(2), note: a[3] || '' })); }
C.makeMoment = makeMoment;

// 슈팅 판정: aim {u,v} (0~1, 골대 안 좌표), keeper 선택은 내부 랜덤
function resolveShot(mc, aim) {
  const ex = { u: aim.u + N(0, mc.sigma), v: aim.v + N(0, mc.sigma * .85) };
  const r = { aim, ex, keeper: null, ok: false, kind: '' };
  if (mc.wall && ex.v < .42 && Math.abs(ex.u - .4) < .22 && R() < .7) { r.kind = 'wall'; r.text = '벽에 맞고 나왔습니다.'; return r; }
  if (ex.u < -.015 || ex.u > 1.015 || ex.v > 1.04 || ex.v < -.1) { r.kind = 'miss'; r.text = ex.v > 1 ? '크로스바 위로 넘어갔습니다.' : '골대 옆으로 벗어났습니다.'; return r; }
  if (ex.u < .015 || ex.u > .985 || ex.v > .975) { if (R() < .55) { r.kind = 'post'; r.text = '골대를 맞고 나왔습니다!'; return r; } }
  // 키퍼 위치: 페널티는 방향 추측, 그 외 중앙에서 반응
  let k;
  if (mc.type === 'penalty') { const side = R(); k = { u: side < .4 ? .2 : side < .8 ? .8 : .5, v: R() < .6 ? .25 : .65 }; }
  else k = { u: .5 + N(0, .12), v: .4 };
  r.keeper = k;
  const dist = Math.hypot((ex.u - k.u) * 1.0, (ex.v - k.v) * .62);
  const corner = (Math.min(ex.u, 1 - ex.u) < .14 ? 1 : 0) + (ex.v > .78 ? 1 : 0);
  const base = { penalty: .1, oneone: .32, volley: .45, longshot: .66, freekick: .66, cutin: .48 }[mc.type] || .3;
  let saveP = base + (dist < mc.reach ? .55 - dist / mc.reach * .4 : 0);
  saveP -= corner * .1; saveP += ((mc.gk || 70) - 70) * .007;
  saveP = clamp(saveP, .02, .92);
  if (R() < saveP) { r.kind = 'save'; r.text = '골키퍼 선방에 막혔습니다.'; return r; }
  r.ok = true; r.kind = 'goal'; r.text = 'Goal!'; return r;
}
C.resolveShot = resolveShot;
function resolvePick(mc, i) {
  const o = mc.opts[i]; const r = { choice: i, ok: false };
  if (mc.type === 'block') {
    const shooterPick = wpick([0, 1, 2], j => mc.foot === 'R' ? [.5, .15, .35][j] : [.35, .15, .5][j]);
    r.shooter = shooterPick;
    if (shooterPick === i || R() < mc.read) { r.ok = true; r.text = '몸을 던져 슈팅을 막아냈습니다!'; }
    else { r.ok = false; r.conceded = R() < .45; r.text = r.conceded ? '반대쪽으로 꺾어 찬 슈팅이 골망을 흔들었습니다.' : '슈팅이 빗나갔습니다. 가슴을 쓸어내렸습니다.'; if (!r.conceded) r.ok = null; }
    return r;
  }
  if (mc.type === 'tackle') {
    r.ok = R() < o.p;
    if (r.ok) r.text = '깔끔하게 공을 빼앗았습니다!';
    else { r.conceded = R() < o.fail; r.card = !!o.card && R() < o.card; r.text = r.conceded ? '제치고 들어간 상대가 득점했습니다.' : '제쳐졌지만 슈팅이 빗나갔습니다.'; if (!r.conceded) r.ok = null; }
  } else if (mc.type === 'gk1v1') { r.ok = R() < o.p; r.text = r.ok ? '슈퍼 세이브!' : '상대의 슈팅이 골망을 갈랐습니다.'; r.conceded = !r.ok; }
  else {
    const exec = R() < o.p, fin = exec && R() < o.reward;
    r.exec = exec; r.ok = fin;
    if (mc.type === 'header') r.text = !exec ? '수비수가 먼저 머리를 댔습니다.' : fin ? '헤더 골!' : '헤더가 골키퍼 정면으로 갔습니다.';
    else if (mc.assist) r.text = !exec ? '패스가 수비에 걸렸습니다.' : fin ? '동료가 마무리했습니다. 도움 기록!' : '완벽한 패스였지만 동료의 슈팅이 빗나갔습니다.';
    else if (mc.type === 'dribble') { r.goal = fin && !!o.own; r.text = !exec ? '수비에 막혔습니다.' : fin ? (r.goal ? '돌파 후 직접 마무리!' : '돌파 후 크로스, 동료의 골!') : '돌파는 성공했지만 마무리가 아쉬웠습니다.'; }
    if (exec && !fin) r.ok = null;
  }
  return r;
}
C.resolvePick = resolvePick;
function resolvePenSave(mc, zone) { // zone 0~5: 위/아래 × 왼/가운데/오른
  const sz = wpick([0, 1, 2, 3, 4, 5], j => [.12, .05, .12, .3, .12, .29][j]);
  const r = { zone, shot: sz };
  if (R() < .07) { r.ok = true; r.kind = 'miss'; r.text = '상대 키커가 실축했습니다!'; return r; }
  const sameCol = (zone % 3) === (sz % 3), sameRow = Math.floor(zone / 3) === Math.floor(sz / 3);
  let p = sameCol ? (sameRow ? .62 : .32) : 0;
  if (sz % 3 === 1 && zone % 3 === 1) p = .8;
  p += (mc.dive - 70) * .006;
  r.ok = R() < clamp(p, 0, .9); r.kind = r.ok ? 'save' : 'goal';
  r.text = r.ok ? '페널티킥 선방!' : '실점했습니다.';
  return r;
}
C.resolvePenSave = resolvePenSave;
function autoMoment(S, mc) {
  if (mc.ui === 'shot') return resolveShot(mc, { u: pick([.15, .85, .3, .7, .5]), v: rnd(.15, .8) });
  if (mc.type === 'pensave') return resolvePenSave(mc, rint(0, 5));
  return resolvePick(mc, rint(0, mc.opts.length - 1));
}
C.autoMoment = autoMoment;
function applyMoment(S, rec, mc, res) {
  const st = rec.st;
  if (mc.ui === 'shot') {
    st.shots++; const xg = { penalty: .79, oneone: .38, volley: .14, longshot: .05, freekick: .06, cutin: .09 }[mc.type];
    st.xg += xg; if (mc.type !== 'penalty') st.npxg += xg; else st.penTaken++;
    if (res.kind === 'goal' || res.kind === 'save') { st.sot++; st.xgot += res.kind === 'goal' ? Math.max(xg, .5) : xg * .7; }
    if (res.ok) { st.goals++; rec.gf++; if (mc.type === 'penalty') st.penGoals++; S.car.trust = clamp(S.car.trust + 3, 0, 100); }
    (rec.shots = rec.shots || []).push({ x: mc.type === 'longshot' || mc.type === 'freekick' ? rnd(30, 70) : mc.type === 'penalty' ? 50 : rnd(38, 62), y: { penalty: 11, oneone: rnd(7, 12), volley: rnd(8, 14), longshot: rnd(20, 28), freekick: rnd(20, 25), cutin: rnd(14, 19) }[mc.type], xg, g: res.ok ? 1 : 0, t: mc.type === 'penalty' ? 'P' : mc.type === 'freekick' ? 'F' : (S.p.foot === 'L' ? 'L' : 'R'), on: res.kind === 'goal' || res.kind === 'save' ? 1 : 0, big: 1 });
    if (res.ok && (mc.type === 'longshot' || mc.type === 'freekick' || mc.type === 'volley')) S.ss.wonder = (S.ss.wonder || 0) + 1;
  } else if (mc.type === 'pensave') {
    st.sotFaced++; st.xgotFaced += .79;
    if (res.ok) { st.saves++; st.gPrev += .79; } else { rec.ga++; st.concOn++; st.cs = 0; st.gPrev -= .21; }
  } else if (mc.type === 'gk1v1') {
    st.sotFaced++; st.xgotFaced += .45;
    if (res.ok) { st.saves++; st.gPrev += .45; } else { rec.ga++; st.concOn++; st.cs = 0; st.gPrev -= .55; }
  } else if (mc.type === 'tackle' || mc.type === 'block') {
    if (res.ok) { if (mc.type === 'tackle') st.tackles++; else st.blocks++; st.defAct++; S.car.trust = clamp(S.car.trust + 2, 0, 100); }
    else { st.dribPast++; if (res.conceded) { rec.ga++; st.concOn++; st.cs = 0; } if (res.card) st.yellow = 1; }
  } else if (mc.assist || mc.type === 'dribble') {
    st.chances++;
    if (res.ok) { rec.gf++; if (res.goal) { st.goals++; st.shots++; st.sot++; st.xg += .3; st.xgot += .5; } else { st.assists++; st.xa += .35; st.bigCh++; } st.dribOk += mc.type === 'dribble' ? 1 : 0; S.car.trust = clamp(S.car.trust + 3, 0, 100); }
    if (res.ok === null && res.exec) { if (mc.assist) st.bigCh++; else st.dribOk++; }
    if (mc.type === 'dribble') st.dribAtt++;
  } else if (mc.type === 'header') {
    st.shots++; st.headShots++; st.xg += .18; st.npxg += .18; st.aerA++;
    if (res.ok) { st.goals++; st.sot++; st.xgot += .6; rec.gf++; st.aerW++; } else if (R() < .5) { st.sot++; st.xgot += .15; }
    (rec.shots = rec.shots || []).push({ x: rnd(42, 58), y: rnd(5, 10), xg: .18, g: res.ok ? 1 : 0, t: 'H', on: res.ok ? 1 : 0, big: 1 });
  }
  rec.moment = { type: mc.type, title: mc.title, ok: res.ok };
}
C.applyMoment = applyMoment;

// ================= 이적 제안 =================
function wageFor(club, ovr, nation) {
  const lm = { SAU: 3.2, ENG: 1.25, CHN: 1.5, USA: 1.05, TUR: 1.1, KOR: .75, IND: .6, AUS: .7, IRL: .5, ARG: .6, MEX: .9, SCO: .7 }[nation] || 1;
  return Math.round(600 * Math.exp((club.str - 55) * .17 + (ovr - club.str) * .12) * lm / 100) * 100;
}
C.wageFor = wageFor;
function perceived(S) {
  const p = S.p, o = C.ovrOf(p), last = S.hist[S.hist.length - 1];
  const rating = last && last.total && last.total.rated >= 8 ? last.rating : last && last.youth && last.youth.rated >= 8 ? Math.min(7.1, last.youthRating - .3) : 6.75;
  const pe = C.potEstimate(p);
  let v = o + clamp((rating - 6.85) * 3.2, -3, 4) + (p.age <= 22 ? clamp(pe.est - o, 0, 20) * .18 : 0) + p.rep * .03 + N(0, 2.4);
  if (p.age >= 31) v -= (p.age - 30) * 1.1;
  return v;
}
function roleAt(S, club) {
  const me = C.ovrOf(S.p), slot = C.SLOT[S.p.pos];
  const riv = club.lite ? C.liteRivals(club, slot, S.w.year) : club.sq.filter(e => C.SLOT[e[1]] === slot).map(e => e[2]).sort((a, b) => b - a);
  const rank = riv.filter(v => v > me + .5).length, n = C.SLOTN[slot];
  return rank < n ? (me >= club.str + 3 ? 'key' : 'starter') : rank === n ? 'rotation' : rank === n + 1 ? 'backup' : 'reserve';
}
C.roleAt = roleAt;
function contractYears(age) { return age <= 20 ? rint(3, 5) : age <= 24 ? rint(3, 5) : age <= 28 ? rint(2, 4) : age <= 31 ? rint(1, 3) : age <= 33 ? rint(1, 2) : 1; }
function genOffers(S, win) {
  const w = S.w, p = S.p, car = S.car, age = p.age;
  const val = curValue(S);
  const pv = perceived(S);
  const last = S.hist[S.hist.length - 1];
  const rating = last && last.total && last.total.rated >= 8 ? last.rating : last && last.youth && last.youth.rated >= 8 ? Math.min(7.1, last.youthRating - .3) : 6.75;
  const pe = C.potEstimate(p);
  let lam = 2.1 + clamp((rating - 6.85) * 2.6, -1.4, 3) + (age <= 22 && pe.est >= C.ovrOf(p) + 6 ? 1.2 : 0) - Math.max(0, age - 29) * .38 + (S.flags.transferReq ? 1.5 : 0) + (S.flags.superAgent ? 1 : 0);
  lam *= C.diff().off;
  if (win === 'winter') lam *= .45;
  if (car.status === 'free') lam += 1;
  if (C.ovrOf(p) < 52 && age >= 21) lam *= .4;
  let n = clamp(poisson(Math.max(.2, lam)), 0, 8);
  if (age <= 18 && car.status === 'youth') n = Math.min(n, 3);
  const cands = Object.values(w.clubs).filter(c => c.lg && c.id !== car.club && !(car.parent && c.id === car.parent));
  const sig = 3.2;
  const target = pv + (age <= 23 ? 1.5 : 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = wpick(cands, c => {
      let x = Math.exp(-Math.pow(c.str - target, 2) / (2 * sig * sig));
      const ln = w.lg[c.lg].nation;
      if (ln === p.nat) x *= 1.7;
      if (C.leagueOf(S) && ln === C.leagueOf(S).nation) x *= 1.4;
      if (age >= 31 && ['SAU', 'USA', 'QAT', 'CHN'].includes(ln)) x *= 2.6;
      if (age >= 33 && w.lg[c.lg].tier >= 2) x *= 1.5;
      if (age <= 21 && c.str >= 80 && pe.est >= 84 && rating >= 7) x *= 1.5;
      if (c.str >= 82) x *= clamp((rating - 6.65) * 1.6, .15, 1.3); // 빅클럽은 실적을 본다
      x *= Math.exp(N(0, .5));
      if (['IND', 'AUS', 'CHN', 'IRL'].includes(ln) && age < 29) x *= .35;
      const tierC = w.lg[c.lg].tier;
      if (ln !== p.nat) { if (tierC >= 3) x *= .2; if (['ISL', 'LUX', 'WAL', 'VIE', 'IDN', 'BLR', 'FIN'].includes(ln)) x *= .25; }
      if (tierC >= 5) x *= .5;
      return x;
    });
    if (!c) break;
    cands.splice(cands.indexOf(c), 1);
    const nation = w.lg[c.lg].nation;
    const free = car.status === 'free' || (car.contract < w.year && car.status !== 'youth');
    const fee = free ? 0 : Math.round(val * rnd(.85, 1.35) / 1e5) * 1e5;
    const ovr = C.ovrOf(p);
    const yrs = contractYears(age);
    out.push({ type: 'transfer', club: c.id, fee, wage: wageFor(c, ovr, nation), years: yrs, role: roleAt(S, c), free });
  }
  // 임대 제안 (젊고 출전이 적을 때)
  const contractOK = car.status === 'youth' ? true : car.contract >= w.year;
  const st0 = S.stance || {};
  if (car.status !== 'free' && contractOK && !st0.expired && !st0.release && !st0.youthEnd && age <= 22 && (S.flags.loanReq || ['backup', 'reserve'].includes(S.lastRole) || car.status === 'youth' && age >= 18)) {
    const me = C.ovrOf(p);
    const lc = Object.values(w.clubs).filter(c => c.lg && c.id !== car.club && c.str < w.clubs[car.club].str - 2 && Math.abs(c.str - (me + 2)) < 5);
    shuffle(lc).slice(0, rint(1, 3)).forEach(c => out.push({ type: 'loan', club: c.id, fee: 0, wage: Math.round(car.wage), years: 1, role: roleAt(S, c) }));
  }
  S.flags.loanReq = 0; S.flags.transferReq = 0;
  return out;
}
C.genOffers = genOffers;
function curValue(S) {
  const last = S.hist[S.hist.length - 1];
  return C.marketValue(S.p, { nation: (C.leagueOf(S) || {}).nation || 'ENG', rating: last && last.total && last.total.rated >= 8 ? last.rating : null, minShare: last ? last.minShare : .5, potEst: C.potEstimate(S.p).est, contractYrs: S.car.contract - S.w.year + 1 });
}
C.curValue = curValue;
// 현 소속팀 입장
// 지난 시즌 활약도: 평점·출전 비중·구단/리그 개인상·우승
function perfScore(S) {
  const last = S.hist[S.hist.length - 1];
  if (!last || !last.total) return { score: 0, rating: 6.6, ms: 0, aw: 0 };
  const rating = last.total.rated >= 8 ? last.rating : 6.55;
  const ms = last.minShare || 0;
  const aw = (last.awards || []).filter(a => ['club', 'tots', 'mvp', 'boot', 'assist', 'young', 'glove', 'goldshoe', 'ballon'].includes(a.k)).length;
  const tr = (last.trophies || []).length;
  return { score: (rating - 6.6) * 2.2 + ms * 1.5 + aw * .8 + tr * .25, rating, ms, aw };
}
C.perfScore = perfScore;
// 구단의 재계약 판단 (활약이 좋으면 나이가 많아도 1년 계약은 거의 준다)
function renewDecision(S, c) {
  const p = S.p, w = S.w, r = roleAt(S, c), ovr = C.ovrOf(p);
  const pf = perfScore(S);
  const roleB = { key: 1.5, starter: 1, rotation: .3, backup: -.6, reserve: -1.5 }[r] || 0;
  const sc = pf.score + roleB - Math.max(0, p.age - 31) * .35 + (S.car.trust - 50) / 40 - Math.max(0, p.age - 35) * .4;
  const prob = clamp(1 / (1 + Math.exp(-(sc * 1.4 - .3))), .03, .98);
  const renew = R() < prob;
  let wage = Math.round(wageFor(c, ovr, w.lg[c.lg].nation) * (pf.score > 2 ? 1.12 : 1) * (p.age >= 33 ? .85 : 1));
  const years = p.age >= 34 ? 1 : p.age >= 31 ? rint(1, 2) : contractYears(p.age);
  return { renew, role: r, wage, years, prob, why: renew ? '' : (p.age >= 32 && pf.score < 1.5 ? '나이와 하락한 경기력' : pf.ms < .35 ? '출전 시간 부족' : pf.rating < 6.6 ? '부진한 평점' : '구단의 리빌딩 계획') };
}
C.renewDecision = renewDecision;
function clubStance(S) {
  const w = S.w, car = S.car, p = S.p, c = w.clubs[car.club];
  if (!c) return null;
  const r = roleAt(S, c), ovr = C.ovrOf(p);
  if (car.status === 'loan') {
    const par = w.clubs[car.parent];
    if (!par) return { expired: true, renew: false, role: r, why: '원소속팀 없음' };
    if (car.contract < w.year) { const d = renewDecision(S, par); return Object.assign({ back: true, expired: true, club: car.parent }, d); }
    return { back: true, role: roleAt(S, par), club: car.parent };
  }
  if (car.status === 'youth') {
    const lr = S.hist[S.hist.length - 1];
    const yGood = lr && lr.youth && lr.youth.apps >= 8 && lr.youthRating >= 7.15;
    const pApps = lr && lr.total ? lr.total.apps : 0;
    const ok = p.age >= 17 && (['key', 'starter', 'rotation'].includes(r) || ovr >= c.str - 13 || pApps >= 6 || (yGood && ovr >= c.str - 19) || (lr && lr.youthRating >= 7.6 && ovr >= c.str - 22));
    if (p.age >= 19 && !ok) return { release: ovr < c.str - 18, youthEnd: true, role: r };
    return { promote: ok, role: r };
  }
  if (car.contract < w.year) return Object.assign({ expired: true }, renewDecision(S, c));
  // 계약 마지막 해: 활약이 좋으면 연장 제안
  const st = { stay: true, role: r, block: r === 'key' && R() < .35, left: car.contract - w.year + 1 };
  if (car.contract === w.year) { const d = renewDecision(S, c); if (d.renew && R() < .8) st.extend = { wage: Math.max(d.wage, car.wage), years: d.years }; }
  return st;
}
C.clubStance = clubStance;

// ================= 시상 =================
const BIG5 = ['ENG', 'ESP', 'ITA', 'GER', 'FRA'];
function computeAwards(S) {
  const ss = S.ss, p = S.p, w = S.w;
  const lg = C.leagueOf(S, ss.club);
  const L = ss.agg.league ? ss.agg.league.st : C.blankStats();
  const tot = ss.total;
  const lr = C.avgRating(L);
  const lgN = ss.lgN || 20, apps = L.apps;
  const big = lg && BIG5.includes(lg.nation) && lg.tier === 1;
  const awards = [];
  const role = C.ROLE[p.pos];
  if (lg && ss.status !== 'youth') {
    const leader = Math.round(N(big ? 24 : lg.tier === 1 ? 20 : 19, 3.5));
    if (L.goals >= Math.max(10, leader)) awards.push({ t: `${lg.name} 득점왕`, k: 'boot', v: `${L.goals}골` });
    const aLead = Math.round(N(big ? 12 : 11, 2.2));
    if (L.assists >= Math.max(7, aLead)) awards.push({ t: `${lg.name} 도움왕`, k: 'assist', v: `${L.assists}도움` });
    const full = apps >= (lgN - 1) * 2 * .6;
    if (full && lr >= N(big ? 7.42 : 7.32, .1) + (role === 'GK' ? .05 : 0)) awards.push({ t: `${lg.name} 올해의 선수`, k: 'mvp' });
    else if (full && p.age <= 22 && lr >= N(7.08, .12)) awards.push({ t: `${lg.name} 영플레이어`, k: 'young' });
    if (apps >= 20 && lr >= N(7.28, .08)) awards.push({ t: `${lg.name} 올해의 팀`, k: 'tots' });
    if (role === 'GK' && L.cs >= Math.max(12, Math.round(N(lgN * .75, 2)))) awards.push({ t: `${lg.name} 골든글러브`, k: 'glove', v: `클린시트 ${L.cs}` });
    if (C.avgRating(tot) >= N(7.05, .14) && tot.apps >= 25) awards.push({ t: `${w.clubs[ss.club].name} 올해의 선수`, k: 'club' });
    // 유러피언 골든슈
    if (C.confOf(lg.nation) === 'UEFA' && lg.tier === 1) { const pts = L.goals * (big ? 2 : 1.5); if (pts >= N(58, 5)) awards.push({ t: '유러피언 골든슈', k: 'goldshoe', v: `${L.goals}골` }); }
  }
  if (ss.wonder && R() < .2 * ss.wonder) awards.push({ t: 'FIFA 푸스카스상', k: 'puskas' });
  // 발롱도르 순위
  const bd = ballonDor(S);
  ss.ballon = bd;
  if (bd.rank === 1) awards.push({ t: '발롱도르', k: 'ballon' });
  if (bd.youngRank === 1) awards.push({ t: '골든보이', k: 'golden' });
  if (role === 'GK' && bd.rank && bd.rank <= 6 && R() < .55) awards.push({ t: '야신 트로피', k: 'yashin' });
  if (ss.tourn && ss.tourn.won && ss.tourn.matches.filter(m => m.played).length >= 4) { const tr = C.totalAgg(ss.tourn.matches); if (C.avgRating(tr) >= 7.3) awards.push({ t: `${ss.tourn.name} 골든볼`, k: 'ball' }); }
  ss.awards = awards;
  return awards;
}
C.computeAwards = computeAwards;
function trophyPts(list) { let s = 0; for (const t of list) s += t.k === 'cont' ? (t.t.includes('챔피언스') || t.t.includes('리베르타') ? 6 : 2) : t.k === 'nt' ? (t.t.includes('월드컵') ? 8 : 4) : t.k === 'league' ? 3 : 1; return s; }
function ballonDor(S) {
  const ss = S.ss, p = S.p, w = S.w;
  const tot = ss.total, r = C.avgRating(tot), role = C.ROLE[p.pos];
  const lg = C.leagueOf(S, ss.club);
  const lgF = lg ? (BIG5.includes(lg.nation) && lg.tier === 1 ? 1 : lg.tier === 1 && C.confOf(lg.nation) === 'UEFA' ? .8 : .55) : .5;
  const att = ['ST', 'W', 'AM'].includes(role);
  const ga = att ? tot.goals + tot.assists * .6 : role === 'GK' ? tot.cs * .8 : tot.goals * 1.5 + tot.assists + tot.cs * .3;
  const myScore = (C.effOvr(p) * .55 + (r - 6.8) * 6 + ga * .14 * lgF + trophyPts(ss.trophies) * 1.4 + (w.clubs[ss.club].str - 80) * .2) * (tot.apps >= 20 ? 1 : .6) * (ss.status === 'youth' ? .3 : 1);
  // AI 후보: 세계 상위 선수
  const cands = [];
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.lg) continue; for (const e of c.sq) if (e[2] >= 84) cands.push([e, c]); }
  const champs = new Set(Object.values(ss.final || {}).map(t => t[0] && t[0].id));
  const ucl = ss.allCont && ss.allCont.UCL && ss.allCont.UCL.winner;
  const list = cands.map(([e, c]) => {
    const rr = 6.75 + (e[2] - 80) * .05 + N(0, .15);
    const at = ['ST', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(e[1]);
    const g = at ? Math.max(0, (e[2] - 74) * 2.3 + N(0, 6)) : e[1] === 'GK' ? 10 : 5;
    const tp = (champs.has(c.id) && w.lg[c.lg].tier === 1 ? 3 : 0) + (ucl === c.id ? 6 : 0);
    return { n: C.pName(w, e), club: c.name, ovr: e[2], age: e[3], s: (e[2] * .55 + (rr - 6.8) * 6 + g * .14 + tp * 1.4 + (c.str - 80) * .2) * (e[1] === 'GK' || ['CB', 'CDM'].includes(e[1]) ? .93 : 1) + N(0, 1.2) };
  }).sort((a, b) => b.s - a.s).slice(0, 30);
  const me = { n: p.name, club: w.clubs[ss.club].name, ovr: C.ovrOf(p), age: p.age, s: myScore, me: true };
  const all = list.concat(me).sort((a, b) => b.s - a.s);
  const rank = all.indexOf(me) + 1;
  // 골든보이 (21세 이하)
  let youngRank = null;
  if (p.age <= 21) {
    const yl = [];
    for (const id in w.clubs) for (const e of w.clubs[id].sq) if (e[3] <= 21 && e[2] >= 74) yl.push({ s: e[2] * .55 + N(0, 1.3) + (e[2] - 74) * .2, n: C.pName(w, e) });
    yl.sort((a, b) => b.s - a.s);
    const mys = C.effOvr(p) * .55 + (r - 6.8) * 4 + ga * .1 + (C.effOvr(p) - 74) * .2 + (tot.apps >= 25 ? 1 : -2);
    youngRank = yl.filter(x => x.s > mys).length + 1;
  }
  return { rank: rank <= 30 ? rank : null, top: all.slice(0, 10), youngRank };
}
})(typeof window !== 'undefined' ? window : globalThis);
