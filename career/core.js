// 터치라인 커리어 — 코어: 난수, 능력치, 포지션 OVR, 성장·노화, 시장 가치
(function (G) {
'use strict';
const C = G.TC = G.TC || {};

// ---------- 난수 ----------
const R = () => Math.random();
const rnd = (a, b) => a + (b - a) * R();
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
function gauss() { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const N = (m, s) => m + s * gauss();
function poisson(l) { if (!(l > 0)) return 0; if (l > 30) return Math.max(0, Math.round(N(l, Math.sqrt(l)))); const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= R(); } while (p > L); return k - 1; }
const pick = a => a[Math.floor(R() * a.length)];
function wpick(items, wf) { let t = 0; const ws = items.map(i => { const w = Math.max(0, wf(i) || 0); t += w; return w; }); if (t <= 0) return null; let r = R() * t; for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const bern = p => R() < p;
Object.assign(C, { R, rnd, rint, clamp, gauss, N, poisson, pick, wpick, shuffle, bern });

// ---------- 능력치 ----------
const ATTRS = [
  ['accel', '가속력', 'PAC'], ['sprint', '스프린트 속도', 'PAC'],
  ['attPos', '공격 위치 선정', 'SHO'], ['finishing', '골 결정력', 'SHO'], ['shotPower', '슛 파워', 'SHO'], ['longShots', '중거리 슛', 'SHO'], ['volleys', '발리 슛', 'SHO'], ['penalties', '페널티 킥', 'SHO'],
  ['vision', '시야', 'PAS'], ['crossing', '크로스', 'PAS'], ['fkAcc', '프리킥 정확도', 'PAS'], ['shortPass', '짧은 패스', 'PAS'], ['longPass', '긴 패스', 'PAS'], ['curve', '커브', 'PAS'],
  ['agility', '민첩성', 'DRI'], ['balance', '밸런스', 'DRI'], ['reactions', '반응 속도', 'DRI'], ['ballControl', '볼 컨트롤', 'DRI'], ['dribbling', '드리블', 'DRI'], ['composure', '침착성', 'DRI'],
  ['interceptions', '가로채기', 'DEF'], ['heading', '헤더 정확도', 'DEF'], ['defAware', '수비 이해도', 'DEF'], ['standTackle', '스탠딩 태클', 'DEF'], ['slideTackle', '슬라이딩 태클', 'DEF'],
  ['jumping', '점프력', 'PHY'], ['stamina', '스태미너', 'PHY'], ['strength', '힘', 'PHY'], ['aggression', '적극성', 'PHY'],
  ['gkDiving', '다이빙', 'GK'], ['gkHandling', '핸들링', 'GK'], ['gkKicking', '킥력', 'GK'], ['gkReflexes', '반사신경', 'GK'], ['gkSpeed', '스피드', 'GK'], ['gkPos', '위치 선정', 'GK']
];
const AK = ATTRS.map(a => a[0]);
const ALABEL = Object.fromEntries(ATTRS.map(a => [a[0], a[1]]));
const AGROUP = Object.fromEntries(ATTRS.map(a => [a[0], a[2]]));
const GROUPS = [['PAC', '스피드'], ['SHO', '슈팅'], ['PAS', '패스'], ['DRI', '드리블'], ['DEF', '수비'], ['PHY', '피지컬']];
const GKGROUPS = [['DIV', '다이빙', 'gkDiving'], ['HAN', '핸들링', 'gkHandling'], ['KIC', '킥력', 'gkKicking'], ['REF', '반사신경', 'gkReflexes'], ['SPD', '스피드', 'gkSpeed'], ['POS', '위치 선정', 'gkPos']];
const FACE = {
  PAC: { accel: .45, sprint: .55 },
  SHO: { finishing: .45, shotPower: .20, longShots: .20, attPos: .05, penalties: .05, volleys: .05 },
  PAS: { vision: .20, crossing: .20, fkAcc: .05, shortPass: .35, longPass: .15, curve: .05 },
  DRI: { agility: .10, balance: .05, reactions: .05, ballControl: .35, dribbling: .40, composure: .05 },
  DEF: { interceptions: .20, heading: .10, defAware: .30, standTackle: .30, slideTackle: .10 },
  PHY: { jumping: .05, stamina: .25, strength: .50, aggression: .20 }
};
// 노화 범주: 1=신체, 2=기술, 3=정신
const ACAT = { accel: 1, sprint: 1, agility: 1, balance: 1, stamina: 1, jumping: 1, gkSpeed: 1, strength: 1.5, reactions: 2.5, vision: 3, composure: 3, attPos: 3, defAware: 3, fkAcc: 3, penalties: 3, gkPos: 3, aggression: 3 };

// ---------- 포지션 ----------
const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const POSKO = { GK: '골키퍼', CB: '센터백', LB: '왼쪽 풀백', RB: '오른쪽 풀백', CDM: '수비형 미드필더', CM: '중앙 미드필더', CAM: '공격형 미드필더', LM: '왼쪽 미드필더', RM: '오른쪽 미드필더', LW: '왼쪽 윙어', RW: '오른쪽 윙어', ST: '스트라이커' };
// 역할 분류 (기록·평점 계산용)
const ROLE = { GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', CDM: 'DM', DM: 'DM', CM: 'CM', CAM: 'AM', AM: 'AM', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST' };
// 스쿼드 경쟁 그룹 (같은 자리를 두고 다투는 포지션)
const SLOT = { GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', CDM: 'DM', CM: 'CM', CAM: 'AM', LM: 'LW', LW: 'LW', RM: 'RW', RW: 'RW', ST: 'ST' };
const SLOTN = { GK: 1, CB: 2, LB: 1, RB: 1, DM: 1, CM: 2, AM: 1, LW: 1, RW: 1, ST: 1 };
const SLOTALT = { GK: [], CB: ['DM'], LB: ['LW'], RB: ['RW'], DM: ['CM', 'CB'], CM: ['DM', 'AM'], AM: ['CM', 'ST'], LW: ['RW', 'AM'], RW: ['LW', 'AM'], ST: ['AM'] };
const W = {
  ST: { finishing: .18, attPos: .13, heading: .10, shotPower: .10, reactions: .08, dribbling: .07, ballControl: .10, volleys: .02, longShots: .03, accel: .04, sprint: .05, strength: .05, shortPass: .05 },
  W: { crossing: .09, finishing: .10, shortPass: .09, dribbling: .16, ballControl: .14, longShots: .04, attPos: .09, accel: .07, sprint: .06, agility: .03, reactions: .07, vision: .06 },
  M: { crossing: .10, shortPass: .11, dribbling: .15, ballControl: .13, accel: .07, sprint: .06, vision: .07, reactions: .07, stamina: .05, longShots: .05, attPos: .08, agility: .03, finishing: .03 },
  CAM: { shortPass: .16, vision: .14, ballControl: .15, dribbling: .13, attPos: .09, finishing: .07, longShots: .05, reactions: .07, agility: .03, accel: .04, longPass: .04, composure: .03 },
  CM: { shortPass: .17, longPass: .13, vision: .13, ballControl: .14, dribbling: .07, reactions: .08, interceptions: .05, standTackle: .05, attPos: .06, longShots: .04, stamina: .06, composure: .02 },
  CDM: { shortPass: .14, longPass: .10, interceptions: .14, defAware: .14, standTackle: .12, slideTackle: .05, ballControl: .10, reactions: .07, vision: .04, stamina: .06, strength: .04 },
  FB: { sprint: .07, accel: .05, crossing: .09, standTackle: .11, slideTackle: .14, interceptions: .12, defAware: .08, heading: .04, ballControl: .07, shortPass: .07, reactions: .08, stamina: .08 },
  CB: { defAware: .17, standTackle: .17, slideTackle: .13, interceptions: .13, heading: .10, strength: .10, aggression: .03, reactions: .05, shortPass: .05, ballControl: .04, jumping: .03 },
  GK: { gkDiving: .21, gkHandling: .21, gkKicking: .05, gkReflexes: .21, gkPos: .21, reactions: .11 }
};
const POSW = { ST: W.ST, LW: W.W, RW: W.W, LM: W.M, RM: W.M, CAM: W.CAM, CM: W.CM, CDM: W.CDM, LB: W.FB, RB: W.FB, CB: W.CB, GK: W.GK };
function posOvr(a, pos) { const w = POSW[pos]; let s = 0; for (const k in w) s += w[k] * a[k]; return s; }
function faceStats(a) { const o = {}; for (const g in FACE) { let s = 0; for (const k in FACE[g]) s += FACE[g][k] * a[k]; o[g] = Math.round(s); } return o; }
Object.assign(C, { ATTRS, AK, ALABEL, AGROUP, GROUPS, GKGROUPS, FACE, POS, POSKO, ROLE, SLOT, SLOTN, SLOTALT, POSW, posOvr, faceStats });

// ---------- 플레이 성향 (생성 시 선택) ----------
const STYLES = {
  ST: [['포처', '박스 안 마무리에 특화', { finishing: 6, attPos: 6, composure: 3, longPass: -4, strength: -3 }], ['타깃맨', '공중볼과 몸싸움으로 버팀', { heading: 7, strength: 7, jumping: 5, accel: -5, agility: -5 }], ['스피드형', '수비 뒷공간 침투', { accel: 7, sprint: 7, agility: 3, strength: -5, heading: -4 }], ['연계형', '내려와서 공을 받아 줌', { shortPass: 6, vision: 6, ballControl: 3, heading: -3, attPos: -2 }]],
  W: [['드리블러', '1대1 돌파', { dribbling: 6, agility: 6, balance: 3, crossing: -3, strength: -4 }], ['인사이드 포워드', '안으로 파고들어 슈팅', { finishing: 5, curve: 5, longShots: 4, crossing: -4 }], ['크로서', '측면에서 올려 주는 패스', { crossing: 8, curve: 4, longPass: 3, finishing: -4, dribbling: -2 }], ['스피드형', '직선 속도로 승부', { accel: 7, sprint: 7, ballControl: -3, vision: -3 }]],
  AM: [['플레이메이커', '찬스를 만드는 패스', { vision: 7, shortPass: 5, curve: 3, strength: -4, standTackle: -3 }], ['섀도 스트라이커', '2선에서 침투해 득점', { attPos: 6, finishing: 6, vision: -4 }], ['테크니션', '좁은 공간 탈압박', { ballControl: 6, dribbling: 5, agility: 4, strength: -5 }]],
  CM: [['박스 투 박스', '공수 모두 많이 뛴다', { stamina: 8, standTackle: 4, attPos: 3, vision: -3, curve: -3 }], ['딥라잉 플레이메이커', '뒤에서 경기를 조율', { longPass: 7, vision: 6, shortPass: 3, accel: -4, sprint: -4 }], ['공격형', '득점에 가담', { longShots: 6, finishing: 5, attPos: 4, defAware: -5, interceptions: -3 }]],
  DM: [['홀딩', '수비 앞에서 끊는 역할', { interceptions: 7, defAware: 6, standTackle: 4, dribbling: -4, finishing: -4 }], ['레지스타', '후방에서 빌드업', { longPass: 7, shortPass: 5, vision: 4, standTackle: -4, strength: -3 }], ['파이터', '거친 몸싸움', { aggression: 8, strength: 6, slideTackle: 4, composure: -4, vision: -4 }]],
  FB: [['공격형 풀백', '오버래핑과 크로스', { crossing: 7, stamina: 5, sprint: 3, defAware: -4, heading: -3 }], ['수비형 풀백', '1대1 수비에 강함', { standTackle: 6, defAware: 6, slideTackle: 3, crossing: -5, dribbling: -3 }], ['인버티드 풀백', '중앙으로 좁혀 빌드업', { shortPass: 6, vision: 5, ballControl: 3, crossing: -4, sprint: -3 }]],
  CB: [['스토퍼', '앞으로 나가서 끊는다', { standTackle: 6, aggression: 6, strength: 4, longPass: -4, composure: -3 }], ['볼 플레잉', '후방 빌드업', { shortPass: 7, longPass: 6, composure: 4, heading: -3, aggression: -4 }], ['공중볼 장악', '헤더와 점프', { heading: 7, jumping: 7, strength: 4, accel: -5, agility: -5 }]],
  GK: [['스위퍼 키퍼', '나와서 공간 정리', { gkSpeed: 7, gkKicking: 6, gkPos: 2, gkHandling: -4 }], ['라인 키퍼', '반사신경과 다이빙', { gkReflexes: 6, gkDiving: 6, gkSpeed: -5, gkKicking: -3 }], ['안정형', '실수 없는 캐칭', { gkHandling: 7, gkPos: 6, gkDiving: -3, gkSpeed: -3 }]]
};
const styleKey = pos => ({ GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', CDM: 'DM', CM: 'CM', CAM: 'AM', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST' }[pos]);
C.STYLES = STYLES; C.styleKey = styleKey;

// 포지션별 능력치 그룹 오프셋 (기준 레벨 대비)
const GOFF = {
  ST: { PAC: -2, SHO: 2, PAS: -9, DRI: -3, DEF: -30, PHY: -3, GK: -46 },
  W: { PAC: 4, SHO: -5, PAS: -3, DRI: 2, DEF: -28, PHY: -11, GK: -46 },
  AM: { PAC: -4, SHO: -4, PAS: 1, DRI: 2, DEF: -24, PHY: -13, GK: -46 },
  CM: { PAC: -6, SHO: -9, PAS: 1, DRI: -2, DEF: -10, PHY: -4, GK: -46 },
  DM: { PAC: -8, SHO: -17, PAS: -3, DRI: -7, DEF: 1, PHY: 0, GK: -46 },
  FB: { PAC: 2, SHO: -21, PAS: -6, DRI: -6, DEF: -2, PHY: -5, GK: -46 },
  CB: { PAC: -9, SHO: -27, PAS: -14, DRI: -15, DEF: 2, PHY: 3, GK: -46 },
  GK: { PAC: -30, SHO: -40, PAS: -24, DRI: -28, DEF: -36, PHY: -20, GK: 0 }
};

// ---------- FC27 포지션 프로필 ----------
// 같은 포지션·같은 종합 능력치의 실제 선수들 평균 → 성장할 때 이 모양을 향해 간다
function profileAt(pos, ovr) {
  const P = (G.TC_PROF || {})[pos]; if (!P) return null;
  let i = 0; while (i < P.length - 2 && ovr > P[i + 1][0]) i++;
  const a = P[i], b = P[i + 1], t = (ovr - a[0]) / (b[0] - a[0]);
  const o = {}; AK.forEach((k, j) => { o[k] = clamp(a[j + 1] + (b[j + 1] - a[j + 1]) * t, 5, 99); });
  return o;
}
C.profileAt = profileAt;

// ---------- 선수 생성 ----------
function newPlayer(opt) {
  const pos = opt.pos, sk = styleKey(pos);
  const T = N(0, 1);
  const p = {
    name: opt.name, nat: opt.nat, num: opt.num, foot: opt.foot, pos, height: opt.height, style: opt.style || 0,
    age: 16, born: opt.year - 16,
    weak: clamp(Math.round(N(2.6, .8)), 1, 4), skill: clamp(Math.round(N(['W', 'AM'].includes(sk) ? 3 : 2.3, .7)), 1, 4),
    hid: {
      pot: 0, // 고정 잠재력 없음: 시작 후 성과·분기점 선택으로 계속 바뀌는 성장 한계
      grow: clamp(N(1, .06), .85, 1.15), peak: clamp(Math.round(N(27.6, 1.5)), 24, 31),
      lon: clamp(Math.exp(N(0, .3)), .45, 1.9), inj: clamp(Math.exp(N(0, .33)), .5, 2.2), T
    },
    a: {}, mods: [], morale: 60, rep: 5, money: 0
  };
  // 능력치 분포: 기준 레벨 + 그룹 오프셋 + 핵심 능력치 가중 + 키·성향 + 개인차
  const w = POSW[pos], mw = Math.max(...Object.values(w));
  const apt = {};
  const hs = (opt.height - 180);
  const st = (STYLES[sk][opt.style] || STYLES[sk][0])[2];
  for (const k of AK) {
    let o = GOFF[sk][AGROUP[k]] + (w[k] ? 6 * w[k] / mw : 0) + N(0, 4.5);
    if (['heading', 'jumping', 'strength'].includes(k)) o += hs * .38;
    if (['agility', 'balance', 'accel'].includes(k)) o -= hs * .32;
    if (k === 'gkDiving' && pos === 'GK') o += (opt.height - 188) * .3;
    if (st[k]) o += st[k];
    if (k === 'composure' || k === 'reactions') o -= 4; // 어린 선수는 멘탈이 덜 여묾
    apt[k] = o;
  }
  // 실제 FC27 선수 분포와 섞는다 (포지션별 강·약점 모양)
  const pf = profileAt(pos, 58);
  if (pf) { const pm = AK.reduce((x, k) => x + (w[k] ? pf[k] * w[k] : 0), 0) / AK.reduce((x, k) => x + (w[k] || 0), 0); for (const k of AK) apt[k] = apt[k] * .45 + (pf[k] - pm) * .55; }
  const target = clamp(Math.round(50 + 4.2 * T + N(0, 2.5)), 42, 65);
  let lv = target;
  for (let i = 0; i < 30; i++) { for (const k of AK) p.a[k] = clamp(lv + apt[k], 8, 99); const o = posOvr(p.a, pos); lv += (target - o) * .9; if (Math.abs(target - o) < .05) break; }
  // 재능 한계는 난이도 분포에서 한 번 정해진다. 성장 한계(pot)는 그 아래에서 활약에 따라 오르내린다
  const dk = C.diffKey(opt.difficulty || C.curDiff);
  p.hid.cap = Math.max(target + 6, sampleCap(dk, null, T * .55 + N(0, .835)));
  p.hid.pot = clamp(p.hid.cap - rnd(1, 5), target + 4, p.hid.cap);
  p.hid.startOvr = target; p.hid.dyn = 2; p.hid.diff = dk;
  if (pos === 'GK') p.hid.peak = clamp(Math.round(N(29.5, 1.5)), 26, 33);
  return p;
}
C.newPlayer = newPlayer;
const ovrOf = (p, pos) => Math.round(posOvr(p.a, pos || p.pos));
const modSum = p => (p.mods || []).reduce((s, m) => s + (m.ovr || 0), 0);
const effOvr = p => ovrOf(p) + modSum(p);
Object.assign(C, { ovrOf, effOvr, modSum });

// OVR을 d만큼 바꾸도록 능력치 분배 (focus: 추가로 키울 능력치 가중치)
function applyOvrDelta(p, d, focus, posOverride) {
  if (!d) return;
  const pos = posOverride || p.pos, w = POSW[pos];
  const mix = {}; let sw = 0;
  for (const k of AK) {
    let m = (w[k] ? 1 : .25) + (focus && focus[k] ? focus[k] : 0);
    if (AGROUP[k] === 'GK' && pos !== 'GK') m = .02;
    if (pos === 'GK' && AGROUP[k] !== 'GK' && k !== 'reactions') m = .15;
    mix[k] = m;
  }
  // 뒤처진 능력치 따라잡기: 같은 수준 실제 선수(FC27) 평균보다 낮을수록 더 오르고, 높을수록 덜 오른다
  const tgt = d > 0 ? profileAt(pos, ovrOf(p, pos) + d) : null;
  if (tgt) for (const k of AK) { if (mix[k] < .05) continue; const gap = tgt[k] - p.a[k]; mix[k] *= clamp(1 + gap / 9, .3, 3.2); if (!w[k] && gap > 6) mix[k] += Math.min(1.2, gap / 25); }
  else { let ws = 0, wn = 0; for (const k of AK) if (w[k]) { ws += p.a[k] * w[k]; wn += w[k]; } const avg = wn ? ws / wn : 60; for (const k of AK) { if (mix[k] < .1) continue; const lag = clamp((avg - p.a[k]) / 14, 0, 1.4); mix[k] *= 1 + lag * (w[k] ? .9 : .5); } }
  for (const k of AK) sw += (w[k] || 0) * mix[k];
  const hr = d > 0 ? headroom(p, pos) : 1;
  for (const k of AK) {
    let inc = d * mix[k] / sw * N(1, .25);
    if (inc > 0) inc *= clamp((99 - p.a[k]) / 22, .04, 1) * hr;
    p.a[k] = clamp(p.a[k] + inc, 5, 99);
  }
}
C.applyOvrDelta = applyOvrDelta;
// 재능 한계에 가까울수록 오르는 폭이 줄어든다 (한계를 넘으면 거의 오르지 않음)
function headroom(p, pos) {
  const cap = p.hid && p.hid.cap; if (!cap) return 1;
  const o = posOvr(p.a, pos || p.pos);
  return clamp((cap + 1 - o) / 2.2, .05, 1);
}
C.headroom = headroom;
// 개별 능력치 변화
function bump(p, k, v) { if (v > 0) { v *= clamp((99 - p.a[k]) / 22, .04, 1); if (POSW[p.pos] && POSW[p.pos][k]) v *= headroom(p); } p.a[k] = clamp(p.a[k] + v, 5, 99); }
C.bump = bump;

// ---------- 시즌 성장·노화 ----------
const FOCUS = {
  balance: ['균형 훈련', '포지션 핵심 능력치를 고르게 올린다', {}],
  shooting: ['슈팅 특훈', '결정력·슛 파워·중거리', { finishing: 1.2, shotPower: 1, longShots: 1, volleys: .8, attPos: .6 }],
  passing: ['패스·플레이메이킹', '시야·짧은 패스·긴 패스', { vision: 1.2, shortPass: 1.2, longPass: 1, crossing: .7, curve: .5 }],
  dribble: ['드리블·볼 키핑', '드리블·볼 컨트롤·민첩성', { dribbling: 1.2, ballControl: 1.2, agility: .8, balance: .7, composure: .5 }],
  defense: ['수비 전술', '수비 이해도·태클·가로채기', { defAware: 1.2, standTackle: 1.1, slideTackle: .9, interceptions: 1.1, heading: .5 }],
  physical: ['피지컬 강화', '힘·스태미너·점프', { strength: 1.3, stamina: 1.1, jumping: .9, aggression: .5 }],
  speed: ['스피드 트레이닝', '가속력·스프린트', { accel: 1.4, sprint: 1.4, agility: .6 }],
  setpiece: ['세트피스 전담', '프리킥·페널티·커브', { fkAcc: 1.5, penalties: 1.3, curve: 1.2, crossing: .5 }],
  mental: ['영상 분석·멘탈', '침착성·반응 속도·위치 선정', { composure: 1.3, reactions: 1.2, attPos: .7, defAware: .7, vision: .5 }],
  keeper: ['골키퍼 특훈', '다이빙·반사신경·핸들링', { gkDiving: 1.1, gkReflexes: 1.2, gkHandling: 1.1, gkPos: 1, gkKicking: .5 }],
  care: ['몸 관리', '성장 폭은 줄지만 노쇠화와 부상을 늦춘다', {}],
  weak: ['약점 보완', '포지션에 필요한데 낮은 능력치를 집중적으로 끌어올린다', null],
  strong: ['강점 극대화', '이미 좋은 능력치를 더 날카롭게 만든다', null],
  tech: ['기술 특훈', '슈팅·패스·드리블 중 포지션에 맞는 기술', null],
  athletic: ['피지컬·스피드', '가속·스프린트·힘·스태미너·점프', { accel: 1.1, sprint: 1.1, strength: 1, stamina: 1, jumping: .8, agility: .6 }]
};
const FOCUS_MENU = { field: ['balance', 'weak', 'strong', 'tech', 'athletic', 'care'], gk: ['balance', 'weak', 'keeper', 'athletic', 'care'] };
C.FOCUS_MENU = FOCUS_MENU;
// 동적 훈련 대상 계산
function focusMap(p, key) {
  const f = FOCUS[key]; if (!f) return {};
  if (f[2]) return f[2];
  const w = POSW[p.pos], ks = AK.filter(k => w[k] && (p.pos === 'GK' || AGROUP[k] !== 'GK'));
  if (key === 'weak') { const sorted = ks.slice().sort((a, b) => p.a[a] - p.a[b]).slice(0, 5); const o = {}; sorted.forEach((k, i) => o[k] = 1.6 - i * .15); return o; }
  if (key === 'strong') { const sorted = ks.slice().sort((a, b) => (p.a[b] * (1 + w[b] * .05)) - (p.a[a] * (1 + w[a] * .05))).slice(0, 4); const o = {}; sorted.forEach(k => o[k] = 1.15); return o; }
  if (key === 'tech') { const T = ['finishing', 'shotPower', 'longShots', 'volleys', 'shortPass', 'longPass', 'vision', 'crossing', 'curve', 'dribbling', 'ballControl']; const o = {}; T.filter(k => w[k]).forEach(k => o[k] = .7 + w[k] * .15); if (!Object.keys(o).length) T.forEach(k => o[k] = .6); return o; }
  return {};
}
C.focusMap = focusMap;
const INTENSITY = { light: ['가볍게', .82, .7], normal: ['보통', 1, 1], hard: ['고강도', 1.2, 1.45] }; // [이름, 성장 배율, 부상 배율]
C.FOCUS = FOCUS; C.INTENSITY = INTENSITY;

// 나이별 한 시즌 최대 성장폭 (OVR). 잠재력과의 격차가 12 이상이면 전부, 작으면 비례해서 줄어듦
function ageFactor(age, peak, gk) {
  const a = age - (peak - 27.5) * .6 + (gk ? 2 : 0); // 골키퍼는 늦게 여문다
  return a <= 18 ? 5.8 : a <= 20 ? 4.8 : a <= 22 ? 3.5 : a <= 24 ? 2.3 : a <= 26 ? 1.3 : a <= 28 ? .55 : .15;
}
// ctx: { minShare, rating, focus, intensity, clubLv }
function seasonGrowth(p, ctx) {
  const before = { ...p.a }, o0 = ovrOf(p);
  const h = p.hid, age = p.age;
  const gap = h.pot - o0;
  const gk = p.pos === 'GK';
  const af = ageFactor(age, h.peak, gk);
  const play = clamp(.55 + .55 * clamp(ctx.minShare * 1.35, 0, 1) + ((ctx.rating || 6.6) - 6.8) * .22, .4, 1.15);
  const it = INTENSITY[ctx.intensity || 'normal'];
  const fac = .93 + clamp((ctx.clubLv || 65) - 60, -10, 28) / 240;
  const care = ctx.focus === 'care';
  const luck = Math.exp(N(0, C.diff().luck)); // 시즌별 운: 정체기도, 폭풍 성장도 있다
  let g = gap > 0 ? af * clamp(gap / 9, .15, 1) * h.grow * play * it[1] * fac * (care ? .75 : 1) * luck : gap * .1;
  g += N(0, .6);
  if (age <= 23 && R() < .035 * h.grow) g += rnd(1.5, 3.5); // 깜짝 성장
  if (age <= 24 && R() < .06) g -= rnd(1, 2.5); // 성장 정체
  if (o0 + g > h.pot + 1.5) g = Math.max(0, h.pot + 1.5 - o0) + N(0, .4);
  if (g > 0) g *= C.diff().g;
  g = Math.min(g, af * 1.25 + .8); // 한 시즌 성장 상한 (16~18세 약 +7)
  const foc = focusMap(p, ctx.focus);
  applyOvrDelta(p, g, foc);
  // 집중 훈련 보너스 (나이 들수록 효과 감소)
  if (Object.keys(foc).length) {
    const fb = (age <= 23 ? .6 : age <= 29 ? .4 : .25) * it[1] * play;
    for (const k in foc) bump(p, k, foc[k] * fb * rnd(.4, 1.2));
  }
  // 노쇠화: 관리(이벤트·상점·몸 관리)로 늦출 수는 있어도 멈출 수는 없다
  const dAge = h.peak + 3;
  {
    const lonE = clamp(h.lon, .7, 2.4);
    let dl = age >= dAge - 1 ? (age - dAge + 1.6) * .72 * lonE * rnd(.55, 1.45) : 0;
    if (care) dl *= .85;
    if (ctx.intensity === 'light') dl *= .95;
    const fa = gk ? 33 : 32; // 이 나이부터는 관리와 상관없이 매년 떨어진다
    if (age >= fa) dl = Math.max(dl, (age - fa + 1) * .75 * rnd(.75, 1.3));
    if (gk) dl *= .9;
    if (dl > 0) for (const k of AK) {
      const c = ACAT[k] || 2;
      const amt = c === 1 ? dl * 1.55 : c === 1.5 ? dl * 1.1 : c === 2.5 ? dl * .75 : c === 3 ? -dl * .12 : dl * .55;
      bump(p, k, -amt * rnd(.6, 1.4));
    }
  }
  // 실제 선수 평균보다 크게 뒤처진 능력치는 훈련·경기 경험으로 조금씩 따라온다 (예: 공격수의 헤더)
  { const tg = profileAt(p.pos, ovrOf(p)); if (tg) { const yf = age <= 23 ? 1 : age <= 28 ? .7 : .35; for (const k of AK) { if (AGROUP[k] === 'GK' && p.pos !== 'GK') continue; const gap = tg[k] - p.a[k]; if (gap > 8) bump(p, k, Math.min(3.2, gap * .09) * yf * rnd(.6, 1.3)); } } }
  // 정신 능력치는 경험으로 소폭 상승
  if (age <= 30) { bump(p, 'composure', rnd(.2, 1.2) * clamp(ctx.minShare * 1.5, .3, 1.2)); bump(p, 'reactions', rnd(0, .7)); }
  // GK가 아닌 선수의 GK 능력치는 고정에 가깝게
  if (p.pos !== 'GK') for (const k of ['gkDiving', 'gkHandling', 'gkKicking', 'gkReflexes', 'gkSpeed', 'gkPos']) p.a[k] = before[k];
  // 성장 한계는 고정이 아니다: 출전·평점·운에 따라 매 시즌 움직인다 (분기점 선택은 이벤트로 별도 반영)
  let drift = 0;
  if (ctx.minShare != null) {
    const youthBoost = age <= 21 ? 1.25 : age <= 25 ? 1 : .55;
    // 기대 평점(자기 능력치·팀 수준 기준) 대비 활약으로 판단 → 잘나가는 선수도 계속 폭주하지 않고, 부진한 선수도 회복 여지가 있다
    const expR = 6.72 + clamp(o0 - (ctx.clubLv || 70), -15, 15) * .03; // 팀 내 위치 대비 기대 평점
    drift = (clamp(((ctx.rating || 6.6) - expR) * 2.4, -1.8, 2.2) + clamp((ctx.minShare - .4) * 1.6, -.7, 1)) * youthBoost + N(0, 1.1) - .3;
    if (!h.cap && h.pot - o0 > 14) drift -= (h.pot - o0 - 14) * .25; // (예전 저장) 성장 한계가 지나치게 앞서가지 않도록

    if (ctx.intensity === 'hard') drift += .35; if (ctx.intensity === 'light') drift -= .25;
    const cap = h.cap || 99;
    h.pot = clamp(h.pot + drift, Math.min(cap, Math.max(ovrOf(p) - 1, cap - 12)), cap + 1);
  }
  return { before, o0, o1: ovrOf(p), drift };
}
C.seasonGrowth = seasonGrowth;

// ---------- 시장 가치 ----------
const VT = [[40, .01], [50, .05], [55, .12], [60, .35], [65, 1.0], [70, 3], [75, 9], [80, 25], [83, 45], [85, 65], [88, 105], [90, 145], [92, 185], [95, 230]];
function interp(t, x) { if (x <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 * Math.pow(y1 / y0, (x - x0) / (x1 - x0)); } return t[t.length - 1][1]; }
const LGMULT = { ENG: 1.35, ESP: 1.05, ITA: 1.0, GER: 1.0, FRA: .92, POR: .75, NED: .75, BEL: .62, TUR: .6, SAU: .65, USA: .5, BRA: .7, ARG: .55, MEX: .45, SCO: .5, KOR: .3, CHN: .3, AUS: .3, IND: .2, IRL: .2 };
function marketValue(p, ctx) {
  const o = ovrOf(p) + modSum(p) * .5;
  let v = interp(VT, o) * 1e6;
  const a = p.age;
  v *= ageF(a);
  if (a <= 23) { const pe = (ctx && ctx.potEst) || o; v *= 1 + clamp(pe - o, 0, 25) * .045; }
  if (ctx) {
    v *= LGMULT[ctx.nation] || .55;
    if (ctx.rating) v *= clamp(1 + (ctx.rating - 6.9) * .45, .65, 1.6);
    if (ctx.minShare != null) v *= clamp(.75 + ctx.minShare * .4, .75, 1.15);
    if (ctx.contractYrs != null && ctx.contractYrs <= 1 && a >= 22) v *= .8;
  }
  return Math.max(10000, Math.round(v / 10000) * 10000);
}
C.marketValue = marketValue;
// AI 선수 이적료 (유로): 같은 가치 곡선 × 나이 × 리그 × 남은 계약 × 협상 운
// 나이 계수: 20대 중반까지 거의 유지, 28세부터 완만하게, 31세 이후 빠르게 (소수 나이도 받는다)
const AGEF = [[16, 1.3], [18, 1.4], [20, 1.5], [22, 1.45], [24, 1.33], [25, 1.27], [26, 1.2], [27, 1.13], [28, 1.05], [29, .97], [30, .87], [31, .76], [32, .64], [33, .52], [34, .41], [35, .31], [37, .2], [40, .12]];
const ageF = a => { if (a <= AGEF[0][0]) return AGEF[0][1]; for (let i = 1; i < AGEF.length; i++) if (a <= AGEF[i][0]) { const [x0, y0] = AGEF[i - 1], [x1, y1] = AGEF[i]; return y0 + (y1 - y0) * (a - x0) / (x1 - x0); } return AGEF[AGEF.length - 1][1]; };
C.ageF = ageF;
// 활약 계수: 평점·출전 비중 (활약하는 30대는 값이 잘 안 떨어진다). perf = { rt: 평균 평점, apps: 경기 수, of: 시즌 경기 수 기준 }
const perfF = (perf, age) => { if (!perf || !perf.rt || !perf.apps) return 1; const sh = clamp(perf.apps / (perf.of || 30), 0, 1.1), w = clamp(perf.apps / 8, 0, 1); return 1 + w * (clamp((perf.rt - 6.85) * .42, -.22, .4) * (age >= 28 ? 1.15 : 1) + (sh - .5) * .16); };
C.perfF = perfF;
// 조사: 받침 여부로 고른다 (한글이 아닌 이름은 받침 없는 쪽). C.jo('메시', '은', '는') → '메시는'
C.jo = (t, withB, noB) => { const ch = String(t).trim().slice(-1), c = ch.charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) { const b = (c - 0xAC00) % 28; if (withB === '으로') return t + (b && b !== 8 ? '으로' : '로'); return t + (b ? withB : noB); } return t + (withB === '으로' ? '로' : noB); };
C.aiFee = (ovr, age, nation, ct, noise, perf) => {
  let v = interp(VT, ovr) * 1e6;
  v *= ageF(age) * perfF(perf, age);
  v *= LGMULT[nation] || .55;
  v *= ct >= 3 ? 1.1 : ct === 2 ? 1 : ct === 1 ? .85 : .62;
  v *= .82 + (noise != null ? noise : R()) * .36;
  v = v > 1.2e8 ? 1.2e8 + (v - 1.2e8) * .45 : v; // 초고액은 완만하게 (역대 최고 수준 약 2억 유로)
  return Math.max(10000, Math.round(v / 10000) * 10000);
};
// ---------- 설정 ----------
const CFG_DEFAULT = {
  currency: 'KRW', rates: { KRW: 1500, USD: 1.08, GBP: .85, JPY: 162 }, wageMode: 'week',
  difficulty: 'normal', moments: 'normal', events: 'normal', injuries: 'normal', showOdds: true,
  anim: 'full', confetti: true, ceremonies: true, simSpeed: 'auto', autoSave: true,
  dataset: 'fc27' // 새 게임 데이터셋: fc27 / tm (FC27 + Transfermarkt 게임 이전 기록)
};
C.CFG_DEFAULT = CFG_DEFAULT;
C.cfg = JSON.parse(JSON.stringify(CFG_DEFAULT));
C.setCfg = o => { C.cfg = Object.assign(JSON.parse(JSON.stringify(CFG_DEFAULT)), o || {}); C.cfg.rates = Object.assign({}, CFG_DEFAULT.rates, (o && o.rates) || {}); };
// 난이도: 커리어마다 시작할 때 정한다. cap = 재능 한계(최고 도달 가능 OVR)의 분포 [OVR, 그 이상일 확률]
// 현실 = FC27 실제 프로 선수 분포(25~30세 OVR 80+ 4.1%, 85+ 0.8%, 90+ 0.1%)에 맞춤
const DIFF = {
  easy: { name: '쉬움', g: 1.1, inj: .7, off: 1.25, luck: .36, cap: [[62, 1], [70, .95], [75, .82], [80, .6], [85, .45], [88, .36], [90, .3], [93, .2], [95, .1], [97, 0]] },
  normal: { name: '보통', g: 1, inj: 1, off: 1, luck: .42, cap: [[60, 1], [70, .88], [75, .66], [80, .38], [85, .2], [88, .13], [90, .09], [93, .035], [96, 0]] },
  hard: { name: '어려움', g: .93, inj: 1.2, off: .85, luck: .48, cap: [[58, 1], [65, .9], [70, .72], [75, .46], [80, .2], [85, .085], [88, .045], [90, .028], [93, .01], [96, 0]] },
  real: { name: '현실', g: .88, inj: 1.3, off: .72, luck: .52, cap: [[55, 1], [60, .9], [65, .72], [70, .48], [75, .22], [80, .07], [85, .018], [88, .008], [90, .004], [93, .001], [96, 0]] }
};
C.DIFF = DIFF;
// 예전 설정값 호환: 예전 '현실'(기본값)은 지금의 '보통', 예전 '하드코어'는 지금의 '현실'
C.diffKey = k => ({ easy: 'easy', normal: 'normal', hard: 'hard', real: 'real', hardcore: 'real' })[k] || 'normal';
C.curDiff = 'normal';
C.diff = () => DIFF[C.curDiff] || DIFF.normal;
// 재능 한계 뽑기. minO를 주면 그 이상인 경우만 (실존 선수로 시작할 때)
function capSurv(t, x) { if (x <= t[0][0]) return 1; for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return 0; }
const Phi = z => { const t = 1 / (1 + .2316419 * Math.abs(z)), d = .3989423 * Math.exp(-z * z / 2); const q = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; };
// z: 재능 점수(표준정규). 시작 능력치가 높은 선수일수록 한계도 높게 나오도록 상관을 준다
function sampleCap(key, minO, z) {
  const t = (DIFF[key] || DIFF.normal).cap;
  const top = minO != null ? capSurv(t, minO) : 1;
  const u = (z != null ? 1 - Phi(z) : R()) * top;
  for (let i = 1; i < t.length; i++) { const [x0, y0] = t[i - 1], [x1, y1] = t[i]; if (u >= y1) return Math.round((x0 + (x1 - x0) * (y0 - u) / Math.max(1e-9, y0 - y1)) * 10) / 10; }
  return t[t.length - 1][0];
}
C.capSurv = capSurv; C.sampleCap = sampleCap;
const CUR = { KRW: '₩', EUR: '€', USD: '$', GBP: '£', JPY: '¥' };
C.CUR = CUR;
// 내부 금액은 모두 EUR. 표시할 때만 설정 통화로 바꾼다
function fmtEUR(v) {
  const cur = C.cfg.currency || 'EUR';
  const neg = v < 0; v = Math.abs(v);
  let out;
  if (cur === 'KRW') {
    const w = v * (C.cfg.rates.KRW || 1500);
    if (w >= 1e12) out = (w / 1e12).toFixed(w >= 1e13 ? 0 : 1).replace(/\.0$/, '') + '조원';
    else if (w >= 1e8) out = (w >= 1e10 ? Math.round(w / 1e8).toLocaleString() : (w / 1e8).toFixed(1).replace(/\.0$/, '')) + '억원';
    else if (w >= 1e4) out = Math.round(w / 1e4).toLocaleString() + '만원';
    else out = Math.round(w).toLocaleString() + '원';
  } else if (cur === 'JPY') {
    const y = v * (C.cfg.rates.JPY || 162);
    out = y >= 1e8 ? '¥' + (y / 1e8).toFixed(1).replace(/\.0$/, '') + '억' : y >= 1e4 ? '¥' + Math.round(y / 1e4).toLocaleString() + '만' : '¥' + Math.round(y).toLocaleString();
  } else {
    const x = cur === 'EUR' ? v : v * (C.cfg.rates[cur] || 1), sym = CUR[cur] || '€';
    out = x >= 1e8 ? sym + (x / 1e6).toFixed(0) + 'M' : x >= 1e6 ? sym + (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? sym + Math.round(x / 1e3) + 'K' : sym + Math.round(x);
  }
  return (neg ? '−' : '') + out;
}
const fmtKR = fmtEUR;
// 주급 표시 (설정에 따라 주급·월급·연봉)
// 급여: 내부 값은 주급(유로). 설정 단위(일급·주급·월급·연봉)와 통화로 표시
C.wageIn = (v, m) => { m = m || C.cfg.wageMode; return m === 'year' ? v * 52 : m === 'month' ? v * 52 / 12 : m === 'day' ? v / 7 : v; };
C.wageUnit = m => ({ year: '연봉', month: '월급', day: '일급', week: '주급' })[m || C.cfg.wageMode] || '주급';
C.fmtWage = (v, short) => { const m = C.cfg.wageMode; return fmtEUR(C.wageIn(v, m)) + (short ? '' : ({ year: ' /년', month: ' /월', day: ' /일', week: ' /주' })[m] || ' /주'); };
C.fmtEUR = fmtEUR; C.fmtKR = fmtKR;

// 스카우트 잠재력 평가 (나이 들수록 정확해짐)
function potEstimate(p) {
  const o = ovrOf(p), err = clamp(10 - (p.age - 16) * 1.4, 1.5, 10);
  if (!p.hid.potSeed) p.hid.potSeed = N(0, 1);
  const est = Math.max(o, Math.round(p.hid.pot + p.hid.potSeed * err * .6));
  return { lo: Math.max(o, Math.round(est - err)), hi: Math.min(99, Math.round(est + err)), est };
}
C.potEstimate = potEstimate;
})(typeof window !== 'undefined' ? window : globalThis);
