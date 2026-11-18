// 터치라인 커리어 — 월드: FC27 구단·선수 DB로 리그 구성, 스쿼드 노화, 리그·컵·대륙 대회 시뮬
(function (G) {
'use strict';
const C = G.TC;
const { R, rnd, rint, clamp, N, poisson, pick, wpick, shuffle, bern } = C;
const F = G.FC27, WD = G.FMWORLD;

const POSMAP = { GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LB', RWB: 'RB', DM: 'CDM', CM: 'CM', AM: 'CAM', LM: 'LM', RM: 'RM', LW: 'LW', RW: 'RW', ST: 'ST' };
const START_YEAR = 2026;
const NAT = Object.assign({}, WD.NATIONS, F.nat || {});
const NATX = { BHR: '바레인', VIE: '베트남', KUW: '쿠웨이트', KGZ: '키르기스스탄', TJK: '타지키스탄', MAS: '말레이시아', PHI: '필리핀', SIN: '싱가포르', HKG: '홍콩', YEM: '예멘', TKM: '투르크메니스탄' };
const natName = c => (NAT[c] || [NATX[c] || c])[0];
C.natName = natName; C.NAT = NAT; C.START_YEAR = START_YEAR; C.POSMAP = POSMAP; C.dayOf = (y, m, d) => dayOf(y, m, d);

// 대륙 연맹
const UEFA = 'ENG SCO WAL NIR IRL ESP ITA GER AUT SUI FRA BEL NED POR TUR GRE CZE SVK DEN NOR SWE ISL FIN CRO SRB BIH SVN MNE MKD ALB KOS UKR POL HUN ROU BUL GEO LUX ARM LTU LVA EST CYP MLT MDA BLR RUS KAZ ISR FRO AND AZE LIE'.split(' ');
const CONMEBOL = 'ARG BRA URU COL ECU PAR CHI VEN PER BOL'.split(' ');
const CONCACAF = 'USA CAN MEX JAM CRC HON PAN GUA SLV TRI GRN HAI SUR CUW MSR GLP MTQ GUF DOM CUB BER PUR'.split(' ');
const AFC = 'JPN KOR AUS CHN KSA QAT IRN IRQ UZB UAE JOR PHI IDN AFG PRK PAK PLE HKG'.split(' ');
const AFC_X = ['OMA', 'BHR', 'THA', 'VIE', 'KUW', 'LBN', 'SYR', 'KGZ', 'TJK', 'MAS', 'IND', 'PHI', 'SIN', 'HKG', 'YEM', 'TKM', 'MYA', 'AFG', 'NEP', 'BAN', 'SRI', 'MDV', 'CAM', 'LAO', 'MNG', 'TPE', 'GUM', 'MAC', 'BRU', 'TLS', 'PAK', 'BHU'];
function confOf(n) { if (AFC_X.includes(n)) return 'AFC'; if (UEFA.includes(n)) return 'UEFA'; if (CONMEBOL.includes(n)) return 'CONMEBOL'; if (CONCACAF.includes(n)) return 'CONCACAF'; if (AFC.includes(n)) return 'AFC'; if (n === 'NZL') return 'OFC'; return 'CAF'; }
C.confOf = confOf;
const CONT_TOURN = { UEFA: ['유로', 0], CONMEBOL: ['코파 아메리카', 0], AFC: ['AFC 아시안컵', 1], CAF: ['아프리카 네이션스컵', 1], CONCACAF: ['골드컵', 1], OFC: ['OFC 네이션스컵', 0] };

// 국내 컵 이름
const CUPNAME = { ENG: 'FA컵', ESP: '코파 델 레이', ITA: '코파 이탈리아', GER: 'DFB 포칼', FRA: '쿠프 드 프랑스', POR: '타사 드 포르투갈', NED: 'KNVB 베이커', BEL: '벨기에 컵', SCO: '스코티시컵', TUR: '튀르키예 컵', AUT: 'ÖFB 컵', SUI: '스위스컵', DEN: '덴마크 컵', POL: '폴란드 컵', ROU: '루마니아 컵', SWE: '스벤스카 쿠펜', NOR: 'NM 쿠펜', IRL: 'FAI컵', SAU: '킹스컵', USA: 'US 오픈컵', ARG: '코파 아르헨티나', MEX: '코파 MX', KOR: '코리아컵', CHN: '중국 FA컵', AUS: '오스트레일리아컵', IND: '슈퍼컵' };
Object.assign(CUPNAME, { GRE: '그리스컵', JPN: '일왕배', BRA: '코파 두 브라질', CZE: '체코컵', HUN: '헝가리컵', UKR: '우크라이나컵', CHI: '코파 칠레', URU: '코파 AUF 우루과이', PER: '코파 비센테나리오', FIN: '수오멘 쿠피', ISL: '아이슬란드컵', LUX: '룩셈부르크컵', WAL: '웨일스컵', IDN: '피알라 인도네시아', VIE: '베트남 내셔널컵', BLR: '벨라루스컵', RUS: '러시아컵' });
const LCUPNAME = { ENG: 'EFL컵', SCO: '스코티시 리그컵', JPN: 'J리그컵' };
C.CUPNAME = CUPNAME; C.LCUPNAME = LCUPNAME;

// ---------- 월드 생성 ----------
function dayOf(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 864e5); }
function buildWorld() {
  const w = { year: START_YEAR, clubs: {}, lg: {}, hist: { lg: {}, cont: {}, cup: {}, nt: {} }, last: {}, gen: 0 };
  const refDay = dayOf(START_YEAR, 8, 1);
  for (const c of F.clubs) w.clubs[c[0]] = { id: c[0], name: c[1], short: c[2], c1: c[3], c2: c[4], nat: c[5], en: c[6], fc: c[7], lg: null, sq: [] };
  for (const l of F.leagues) { w.lg[l.id] = { id: l.id, name: l.name, nation: l.nation, tier: l.tier, clubs: l.clubs.slice() }; for (const id of l.clubs) w.clubs[id].lg = l.id; }
  for (const [id, ln] of F.other) { const c = w.clubs[id]; c.lg = null; c.other = ln; }
  F.P.forEach((p, i) => {
    const c = F.clubs[p[4]]; if (!c) return;
    const age = Math.floor((refDay - p[9]) / 365.25);
    const ovr = p[11];
    const pot = age <= 23 ? Math.round(ovr + Math.max(0, (24 - age)) * rnd(.6, 2.2)) : ovr;
    w.clubs[c[0]].sq.push([i, POSMAP[p[2]] || 'CM', ovr, age, pot, p[5]]);
  });
  for (const id in w.clubs) { const c = w.clubs[id]; c.str = xiStrength(c.sq); c.base = c.str; c.pres = c.str; }
  // 확장 데이터(로고 URL 목록으로 만든 하부·추가 리그). 구단은 선수 명단 없이 전력만 가진 경량 구단
  const X = G.TC_EXT;
  if (X) {
    for (const [id, name, short, c1, c2, nat, str] of X.clubs) w.clubs[id] = { id, name, short, c1, c2, nat, en: name, fc: Math.round(str), lg: null, sq: [], lite: true, str, base: str, pres: str };
    for (const l of X.leagues) {
      w.lg[l.id] = { id: l.id, name: l.name, nation: l.nation, tier: l.tier, clubs: l.clubs.slice(), ext: true };
      for (const id of l.clubs) { const c = w.clubs[id]; if (!c) continue; c.lg = l.id; if (c.other) c.other = null; }
    }
    for (const lid in w.lg) w.lg[lid].clubs = w.lg[lid].clubs.filter(id => w.clubs[id] && w.clubs[id].lg === lid);
  }
  // 하부 구단도 모두 실제(가상) 선수 명단을 갖는다
  for (const id in w.clubs) if (w.clubs[id].lite) materialize(w, w.clubs[id]);
  initFinance(w);
  // 지난 시즌 순위 대용: 전력순
  for (const id in w.lg) { const l = w.lg[id]; w.last[id] = l.clubs.slice().sort((a, b) => w.clubs[b].str - w.clubs[a].str); }
  return w;
}
C.buildWorld = buildWorld;
function pName(w, e) { return typeof e[0] === 'number' ? F.P[e[0]][1] : String(e[0]).split('#')[0]; }
// 생성 선수 고유 ID (동명이인 구분)
let UID = 0;
const uid = n => n + '#' + (Date.now() % 1e6).toString(36) + (++UID).toString(36);
C.pName = pName;

// 베스트 11 전력 (4-3-3): GK1, CB2, 풀백2, 미드3, 공격3
const XI = [['GK', ['GK'], 1], ['CB', ['CB'], 2], ['FB', ['LB', 'RB'], 2], ['MID', ['CDM', 'CM', 'CAM'], 3], ['ATT', ['LW', 'RW', 'LM', 'RM', 'ST'], 3]];
function xiStrength(sq, extra) {
  const list = extra ? sq.concat([extra]) : sq;
  let s = 0, n = 0;
  for (const [, ps, k] of XI) {
    const c = list.filter(e => ps.includes(e[1])).map(e => e[2]).sort((a, b) => b - a);
    for (let i = 0; i < k; i++) { s += c[i] != null ? c[i] : (c.length ? c[c.length - 1] - 6 : 50); n++; }
  }
  return s / n;
}
C.xiStrength = xiStrength;

// ---------- 경량 구단 ----------
function seeded(seed) { let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
// 경량 구단의 같은 포지션 경쟁자 능력치 (명단을 저장하지 않고 구단·연도로 매번 같은 값을 만든다)
function liteRivals(c, slot, year) {
  const r = seeded(c.id + '|' + slot + '|' + year), n = (C.SLOTN[slot] || 1) + 2, out = [];
  for (let i = 0; i < n; i++) out.push(Math.round(c.str + 2 - i * 2.6 + (r() - .5) * 5));
  return out.sort((a, b) => b - a);
}
C.liteRivals = liteRivals;
// 내가 입단하는 경량 구단은 실제 명단을 만든다 (이후 일반 구단처럼 나이 들고 보강됨)
function materialize(w, c) {
  if (!c || !c.lite) return;
  const comp = ['GK', 'GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'LB', 'RB', 'RB', 'CDM', 'CDM', 'CM', 'CM', 'CM', 'CAM', 'CAM', 'LW', 'LM', 'RW', 'RM', 'ST', 'ST', 'ST'];
  const starters = { GK: 1, CB: 2, LB: 1, RB: 1, CDM: 1, CM: 2, CAM: 1, LW: 1, RW: 1, ST: 1 }, used = {};
  c.sq = comp.map(pos => {
    used[pos] = (used[pos] || 0) + 1;
    const st = used[pos] <= (starters[pos] || 0);
    const age = st ? rint(21, 32) : rint(17, 34);
    const o = clamp(Math.round(N(st ? c.str + .5 : c.str - 5, st ? 2.5 : 3.5)), 35, 92);
    const nat = genNat(c.nat);
    return [uid(genName(nat)), pos, o, age, age < 24 ? o + rint(0, 6) : o, nat, ctFor(age), 0, 0, 0, Math.round(N(0, 1.5) * 10) / 10, 20];
  });
  c.lite = false; c.str = xiStrength(c.sq);
  if (w && w.lg) { c.rev = clubRev(w, c); if (c.cash == null) c.cash = Math.round(c.rev * .25); for (const e of c.sq) ensureE(e, c); }
}
C.materialize = materialize;

// ---------- 이름 생성 ----------
const LANGS = Object.keys(WD.NAMES);
function genName(nat) {
  const lang = (NAT[nat] && WD.NAMES[NAT[nat][1]]) ? NAT[nat][1] : 'en';
  const [fs, ls] = WD.NAMES[lang];
  return pick(fs) + ' ' + pick(ls);
}
const FOREIGN = WD.FOREIGN.default.split(',').map(s => { const [c, k] = s.split(':'); return [c, +k]; });
function genNat(clubNat) { if (R() < .62) return clubNat; return wpick(FOREIGN, f => f[1])[0]; }
C.genName = genName; C.seeded = seeded;

// ---------- 시즌 경과 (AI 스쿼드) ----------
// 명단 항목: [id, 포지션, OVR, 나이, 잠재력, 국적, 계약 잔여 연수, 임대 원소속 구단, 주급(유로), 지난 시즌 폼(-2.5~2.5), 수명 성향(년), 지난 시즌 리그 출전]
const MINPOS = { GK: 3, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2, LW: 1, RW: 1, LM: 1, RM: 1, ST: 3 };
const GRP = { GK: 'GK', CB: 'D', LB: 'D', RB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LW: 'A', RW: 'A', LM: 'A', RM: 'A', ST: 'A' };
const GSTART = { GK: 1, D: 4, M: 3, A: 3 };
const ctFor = (age) => age <= 21 ? rint(3, 5) : age <= 26 ? rint(2, 5) : age <= 29 ? rint(2, 4) : age <= 31 ? rint(1, 3) : age <= 33 ? rint(1, 2) : 1;
C.ctFor = ctFor;
// ---------- 구단 재정 ----------
// 수입(시즌): 리그 중계권 바닥값 + 구단 규모(명성). 주급 총액은 수입의 약 절반
const TV1 = { ENG: 150e6, ESP: 60e6, GER: 60e6, ITA: 50e6, FRA: 35e6, SAU: 30e6, BRA: 20e6, TUR: 15e6, USA: 15e6, POR: 10e6, NED: 10e6, MEX: 10e6, JPN: 8e6, BEL: 6e6, ARG: 6e6, KOR: 5e6, SCO: 5e6, CHN: 6e6, QAT: 8e6, UAE: 8e6 };
const LGM = { ENG: 1.35, ESP: 1.05, ITA: 1, GER: 1, FRA: .92, POR: .75, NED: .75, BEL: .62, TUR: .6, SAU: .9, USA: .55, BRA: .7, ARG: .55, MEX: .5, SCO: .5, KOR: .3, CHN: .35, AUS: .3, IND: .2, IRL: .2, JPN: .45 };
function clubRev(w, c) {
  const L = c.lg && w.lg[c.lg], n = L ? L.nation : c.nat, t = L ? L.tier : 3, t1 = TV1[n] || 3e6;
  const floor = t === 1 ? t1 : t === 2 ? (n === 'ENG' ? 12e6 : t1 * .12) : t === 3 ? (n === 'ENG' ? 2.5e6 : t1 * .03) : t === 4 ? (n === 'ENG' ? 1.2e6 : t1 * .012) : 3e5 / (t - 3);
  return Math.round(floor + 4e5 * Math.exp((c.pres - 55) * .225) * (LGM[n] || .45));
}
C.clubRev = clubRev;
// 주급: 구단 지급 규모 × 팀 내 위상 × 나이
function aiWage(c, o, age) {
  const scale = (c.rev || 2e6) * .5 / 52 / 25;
  const rel = Math.exp(clamp(o - (c.str || o), -15, 12) * .15);
  const af = age <= 18 ? .25 : age <= 20 ? .5 : age <= 22 ? .8 : age >= 33 ? .85 : 1;
  return Math.max(150, Math.min(6.5e5, Math.round(scale * rel * af / 50) * 50));
}
C.aiWage = aiWage; C.squadRoles = c => roles(c);
function ensureE(e, c) {
  if (e[6] == null) e[6] = ctFor(e[3]); if (e[7] == null) e[7] = 0;
  if (!e[8] && c) e[8] = Math.round(aiWage(c, e[2], e[3]) * rnd(.8, 1.2) / 50) * 50;
  if (e[9] == null) e[9] = 0; if (e[10] == null) e[10] = Math.round(N(0, 1.5) * 10) / 10; if (e[11] == null) e[11] = 20;
  return e;
}
C.ensureE = ensureE;
function initFinance(w) {
  for (const id in w.clubs) { const c = w.clubs[id]; c.rev = clubRev(w, c); if (c.cash == null) c.cash = Math.round(c.rev * .25); if (c.sq) for (const e of c.sq) ensureE(e, c); }
}
C.initFinance = initFinance;
// 팀 내 역할: 0 주전, 1 로테이션, 2 벤치/잉여
function roles(c) {
  const g = {}; for (const e of c.sq) (g[GRP[e[1]] || 'M'] = g[GRP[e[1]] || 'M'] || []).push(e);
  const out = new Map();
  for (const k in g) { const l = g[k].sort((a, b) => b[2] - a[2]), n = GSTART[k] || 2; l.forEach((e, i) => out.set(e, i < n ? 0 : i < Math.ceil(n * 1.9) ? 1 : 2)); }
  return out;
}
// ---------- 나이 듦·은퇴 ----------
// 은퇴 나이는 선수마다 다르다 (수명 성향 e[10], 기량, 출전 시간). 기량 하락도 완만하게
function ageSquad(c) {
  const out = [];
  for (const e of c.sq) {
    ensureE(e, c);
    const age = e[3] + 1; let o = e[2], pot = e[4];
    const lg = e[10] || 0;
    // 성장: 지난 시즌 출전 비율과 평점이 클수록 빠르다. 잠재력도 고정이 아니라 활약하면 오르고, 못 뛰거나 부진하면 내려간다
    const apps = e[11] == null ? 20 : e[11], rt = e[12] ? e[12] / 100 : 6.6;
    const play = clamp(apps / 28, 0, 1.15), perf = apps >= 6 ? clamp(rt - 6.65, -.8, 1) : 0;
    if (age <= 23) {
      pot += perf * 2 * play + N(0, .9) - (play < .2 && age >= 19 ? rnd(.5, 2) : 0);
      if (pot > o) o += (pot - o) * rnd(.12, .3) * (.45 + .75 * play) + perf * 2.2 * play + N(.2, 1);
      else o += N(0, 1) + perf * play;
      pot = clamp(Math.round(pot), o, 97);
    } else if (pot > o) pot = Math.max(o, Math.round(pot - rnd(0, 1.8)));
    if (age <= 23) { /* 위에서 처리 */ }
    else if (age <= 28) o += N(0, 1.1) + perf * play * .6;
    else if (age <= 30) o += N(-.5, 1.1);
    else o -= Math.max(0, (age - 30 - lg * .5)) * rnd(.25, .75) + rnd(0, .7);
    o = clamp(Math.round(o), 35, 95);
    // 은퇴 확률: 개인별 은퇴 나이 근처에서 서서히 오른다. 아직 팀에서 주전으로 뛰는 선수는 잘 은퇴하지 않고,
    // 기량이 떨어져 출전이 줄거나 팀 수준보다 처지면 그때 은퇴한다 (갑작스러운 은퇴 방지)
    const retAge = 35.5 + lg + clamp((o - 74) * .1, -2, 2.5);
    let pr = age < 32 ? 0 : 1 / (1 + Math.exp(-(age - retAge) * .9));
    const rel = o - (c.str || o);
    pr *= apps >= 25 && rel >= -2 ? .3 : apps >= 15 ? .7 : apps < 6 ? 1.6 : 1;
    if (rel < -8) pr *= 1.4;
    if (age >= 39) pr = Math.max(pr, .25);
    if (age >= 41) pr = Math.max(pr, .85);
    if (age >= 30 && o < 48) pr = Math.max(pr, .2);
    pr = Math.min(pr, .97);
    if (R() < pr) { e[2] = o; e[3] = age; if (C._ps && C._ps[e[0]]) C._ps[e[0]].ret = C._year + 1; if (C._w) txLog(C._w, e, c, null, 'ret', 0); continue; }
    e[2] = o; e[3] = age; e[4] = Math.max(pot, o); e[6] -= 1;
    out.push(e);
  }
  c.sq = out;
}
// 이적 기록: [선수 id, 보낸 구단, 받은 구단, 종류, 이적료(만 유로), OVR, 나이, 새 주급(유로), 계약 연수]
// 종류: buy 이적 · free 자유계약 · loan 임대 · lret 임대 복귀 · rel 방출 · ret 은퇴 · yth 유스 승격 · new 외부 영입 · ext 재계약
// 이적 기록 한 줄: [선수, 보낸 구단, 받은 구단, 종류, 이적료(만 유로), OVR, 나이, 새 주급, 계약 연수(, 재계약 전 주급)]
function txLog(w, e, from, to, kind, fee, oldWage) { if (!w._tx) return; const r = [String(e[0]), from ? from.id : '', to ? to.id : '', kind, fee ? Math.round(fee / 1e4) : 0, e[2], e[3], e[8] || 0, e[6] || 0]; if (oldWage != null) r.push(oldWage); w._tx.push(r); }
C.txLog = txLog;
const natOf = (w, c) => c && c.lg && w.lg[c.lg] ? w.lg[c.lg].nation : (c ? c.nat : '');
// 이적료 (무작위성 없는 기준값): 가치 × 남은 계약
const feeOf = (w, e, from) => C.aiFee(e[2], e[3], natOf(w, from), Math.max(0, e[6]));
// ---------- 세계 이적 시장 ----------
// 1) 임대 복귀 2) 재정 갱신 3) 선수별 결정: 연장·재계약(주급 인상/삭감)·판매(계약 1년 남은 스타 포함)·임대·방출
// 4) 큰 선수부터 행선지: 예산(이적료)·주급 감당 가능한 구단만, 상위 구단 선호
const RETIRE_LG = { SAU: 2.6, USA: 1.8, TUR: 1.5, QAT: 2.2, UAE: 1.8, JPN: 1.1, AUS: 1.2 };
function worldTransfers(w, winter) {
  const clubs = Object.values(w.clubs).filter(c => c.sq && c.lg);
  const byStr = clubs.slice().sort((a, b) => a.str - b.str), strs = byStr.map(c => c.str);
  const lower = x => { let lo = 0, hi = strs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (strs[m] < x) lo = m + 1; else hi = m; } return lo; };
  const stat = { free: 0, sale: 0, loan: 0, ret: 0, renew: 0, ext: 0, rel: 0 };
  w.bigTx = []; w._moved = new Set();
  const big = (e, from, to, kind, fee) => { if (e[2] >= 79) w.bigTx.push([pName(w, e), String(e[0]), from.id, to.id, kind, e[2], e[3], fee || 0]); };
  const topS = strs[strs.length - 1] || 85;
  const lvl = o => o > topS - 3 ? topS - 3 + (o - topS + 3) * .25 : o;
  // 1) 임대 복귀 (여름 이적시장만. 겨울 임대는 시즌 끝까지)
  if (!winter) for (const c of clubs) for (const e of c.sq.slice()) {
    ensureE(e, c);
    e[13] = 0;
    if (e[7]) { const p = w.clubs[e[7]]; e[7] = 0; if (p && p.sq && p !== c) { c.sq.splice(c.sq.indexOf(e), 1); p.sq.push(e); txLog(w, e, c, p, 'lret', 0);
      // 임대에서 잘하고 온 선수: 이번 시즌은 원소속팀에서 기회를 받는다 (임대 뺑뺑이 방지)
      if ((e[11] || 0) >= 16 && (e[12] || 0) >= 680 && e[2] >= p.str - 9) e[13] = 1; } }
  }
  // 2) 재정: 이번 시즌 수입과 이적 예산 (지난 예산 일부 이월)
  for (const c of clubs) { if (!winter || c.rev == null) { c.rev = clubRev(w, c); c.cash = Math.max(0, Math.round((c.cash || 0) * .55 + c.rev * .16)); } c.wb = c.sq.reduce((a, e) => a + (e[8] || 0), 0); }
  const wageRoom = (d, wk) => d.wb + wk <= d.rev * .62 / 52;
  // 3) 선수별 결정
  const market = [];
  for (const c of clubs) {
    const rl = roles(c);
    for (const e of c.sq) {
      const o = e[2], age = e[3], f = e[9] || 0, rr = rl.get(e), gap = o - c.str, ct = e[6];
      const prospect = age <= 21 && e[4] >= o + 5;
      // 구단이 원하는 정도
      let want = rr === 0 ? .95 : rr === 1 ? .72 : .3;
      want += f * .08; if (age >= 31) want -= .15; if (age >= 33) want -= .25; if (prospect) want += .3;
      // 선수의 이적 욕구: 팀보다 크게 성장했거나 출전 기회가 없을 때
      const top = c.str >= topS - 2;
      const ambition = !top && gap >= 3 && age <= 30 ? clamp(.25 + (gap - 3) * .1 + Math.max(0, f) * .08, .2, .85) : rr === 2 && age >= 22 && age <= 30 ? .45 : .05;
      const wantsOut = R() < ambition;
      let kind = null;
      if (winter) {
        // 겨울: 계약 만료 처리는 없고, 뛰지 못하는 유망주 임대·불만 선수 판매·보강만 소규모로
        if (wantsOut && (gap >= 3 || rr === 2) && R() < .3) kind = 'sale';
        else if (!e[13] && age <= 21 && rr === 2 && (e[11] == null || e[11] < 8) && R() < .22) kind = 'loan';
        else if (f < -1.4 && age >= 24 && R() < .06) kind = 'sale';
        if (kind) market.push([e, c, kind]);
        continue;
      }
      const renew = (mult) => { const nw = Math.round(aiWage(c, o, age) * mult / 50) * 50, ow = e[8] || 0; c.wb += nw - ow; e[8] = nw; e[6] = ctFor(age); txLog(w, e, c, c, 'ext', 0, ow); };
      if (ct <= 0) {
        // 계약 만료: 재계약(에이스는 인상, 애매한 선수는 삭감) 또는 자유계약. 전성기 핵심 선수는 거의 다 붙잡는다
        const core = age <= 31 && (o >= 78 || (rr === 0 && gap >= 0));
        if (core ? R() < (wantsOut ? .8 : .97) : (!wantsOut && R() < want)) { renew(rr === 0 && gap >= 1 ? rnd(1.1, 1.35) : rr === 2 || age >= 31 ? rnd(.6, .9) : rnd(.92, 1.1)); stat.renew++; }
        else kind = 'free';
      } else if (ct === 1) {
        // 계약 1년 남음: 지키려면 지금 연장, 안 되면 몸값 있을 때 판다 (월드클래스를 공짜로 놓치지 않도록)
        if (!wantsOut && R() < want) { renew(rr === 0 ? rnd(1.05, 1.3) : rnd(.85, 1.05)); stat.ext++; }
        else if (o >= 68 || wantsOut) kind = 'sale';
        else if (rr === 2 && age >= 23 && R() < .3) kind = 'sale';
      } else {
        if (wantsOut && (gap >= 3 || rr === 2)) kind = 'sale';
        else if (rr === 0 && ct === 2 && age <= 29 && gap >= -1 && R() < .3) { renew(rnd(1.05, 1.25)); stat.ext++; }
        else if (e[13]) { /* 임대 복귀 기대주는 남겨서 쓴다 */ }
        else if (age <= 21 && rr >= 1 && R() < (o >= c.str - 4 ? .12 : age <= 19 ? .3 : .45)) kind = 'loan';
        else if (age === 22 && rr === 2 && o < c.str - 4 && R() < .35) kind = 'loan';
        else if (f < -1.2 && age >= 23 && R() < .25) kind = 'sale';
        else if (age >= 31 && gap < 0 && R() < .1) kind = 'sale';
        else if (R() < .02) kind = 'sale';
      }
      if (kind) market.push([e, c, kind]);
    }
  }
  for (const [e, c] of market) { const i = c.sq.indexOf(e); if (i >= 0) { c.sq.splice(i, 1); c.wb -= e[8] || 0; } }
  const need = (d, pos) => { let n = 0, g = GRP[pos] || 'M'; for (const x of d.sq) if ((GRP[x[1]] || 'M') === g) n++; const want = { GK: 3, D: 8, M: 7, A: 7 }[g]; return n < want ? 2.2 : n < want + 2 ? 1 : .35; };
  // 나라별 1부 리그 수준 (상위 6개 구단 평균): 전성기 스타는 더 약한 리그로 잘 가지 않는다
  const natLv = {}; { const by = {}; for (const c of clubs) { const L = w.lg[c.lg]; if (L && L.tier === 1) (by[L.nation] = by[L.nation] || []).push(c.str); } for (const n in by) { const a = by[n].sort((x, y) => y - x).slice(0, 6); natLv[n] = a.reduce((x, y) => x + y, 0) / a.length; } }
  const lvOf = c => natLv[natOf(w, c)] || 65;
  const pickClub = (lo, hi, e, from, kind, fee, wk) => {
    const i0 = lower(lo), i1 = Math.max(i0 + 1, lower(hi + .001));
    // 후보 구단이 많으면(하부 리그) 무작위 48곳만 살펴본다 (속도)
    let range = byStr.slice(i0, i1);
    if (range.length > 48) { const pickd = []; for (let k = 0; k < 48; k++) pickd.push(range[(R() * range.length) | 0]); range = [...new Set(pickd)]; }
    const cand = range.filter(c => c !== from && c.sq.length < 31 && (!fee || c.cash >= fee) && (kind === 'loan' || wageRoom(c, wk(c))));
    if (!cand.length) return null;
    const nat = e[5], age = e[3], o = e[2];
    return wpick(cand, c => Math.exp((c.str - lo) * (kind === 'loan' ? .05 : .22)) * (c.str >= topS - .6 ? .4 : c.str >= topS - 1.6 ? .7 : 1) * (c.nat === nat ? 2 : 1) * (from && c.nat === from.nat ? 1.5 : 1) * need(c, e[1]) * (c.sq.length < 25 ? 1.4 : c.sq.length > 28 ? .5 : 1)
      * (age >= 30 && o >= 72 ? (RETIRE_LG[c.nat] || 1) : 1) * (kind === 'loan' && from && c.nat === from.nat ? 1.6 : 1)
      * (kind !== 'loan' && o >= 76 && age <= 30 && from ? Math.exp(clamp(lvOf(c) - lvOf(from), -12, 4) * .25) : 1));
  };
  market.sort((a, b) => b[0][2] - a[0][2]);
  for (const [e, c, kind] of market) {
    const o = e[2], age = e[3], f = e[9] || 0, gap = o - c.str;
    let lo, hi; const L = lvl(o);
    if (kind === 'loan') { lo = L - 4; hi = L + 1; }
    else if (gap >= 3) { lo = Math.max(c.str + 1, L - 3); hi = L + 4; }
    else if (kind === 'free' && o >= 78 && age <= 32) { lo = L - 3; hi = L + 3; }
    else if (f < -.9 || age >= 31) { lo = L - 8; hi = L + 1; }
    else { lo = L - 4; hi = L + 3; }
    const fee = kind === 'sale' ? Math.round(feeOf(w, e, c)) : kind === 'loan' && o >= 70 ? Math.round(C.aiFee(o, age, natOf(w, c), 3) * .06) : 0;
    const wk = d => Math.round(aiWage(d, o, age) * (kind === 'free' ? rnd(1.05, 1.25) : kind === 'sale' ? rnd(1, 1.2) : 1) / 50) * 50;
    let d = pickClub(lo, hi, e, c, kind, fee, wk);
    if (!d && kind === 'sale') d = pickClub(L - 7, L + 2, e, c, kind, fee * .8, wk);
    if (!d && kind === 'free') d = pickClub(L - 10, L + 2, e, c, kind, 0, wk) || (age < 33 || o >= 65 ? pickClub(L - 25, L, e, c, kind, 0, wk) : null);
    if (!d) {
      if (kind === 'free') { stat.rel++; if (C._ps && C._ps[e[0]]) C._ps[e[0]].ret = C._year + 1; txLog(w, e, c, null, age >= 30 ? 'ret' : 'rel', 0); }
      else {
        c.sq.push(e); c.wb += e[8] || 0;
        // 팔려고 했지만 살 구단이 없으면: 계약이 1년 남은 쓸 만한 선수는 연장해서 공짜로 잃지 않게 한다
        if (kind === 'sale' && e[6] <= 1 && (o >= 74 || o >= c.str - 3) && R() < .85) { const ow = e[8] || 0, nw = Math.round(aiWage(c, o, age) * rnd(.9, 1.15) / 50) * 50; c.wb += nw - ow; e[8] = nw; e[6] = ctFor(age); txLog(w, e, c, c, 'ext', 0, ow); stat.ext++; }
      }
      continue;
    }
    const paid = kind === 'sale' && d.cash < fee ? Math.round(fee * .8) : fee;
    big(e, c, d, kind, paid); w._moved.add(e);
    if (kind === 'loan') { e[7] = c.id; stat.loan++; d.cash -= paid; c.cash += paid; txLog(w, e, c, d, 'loan', paid); }
    else { d.cash -= paid; c.cash += paid; e[6] = ctFor(age); e[8] = wk(d); d.wb += e[8]; txLog(w, e, c, d, kind === 'sale' ? 'buy' : 'free', paid); stat[kind]++; }
    d.sq.push(e);
  }
  w.lastTx = stat.free + stat.sale + stat.loan; w.txStat = stat;
}
C.worldTransfers = worldTransfers;
// 비어 있는 자리: 유스 승격 → 하위 구단 선수 영입(예산 안에서) → 그래도 없으면 기록 밖 무대의 무명 선수
function refillSquad(c, w, pool, winter) {
  const cnt = {}; for (const e of c.sq) cnt[e[1]] = (cnt[e[1]] || 0) + 1;
  const add = (e, kind, from) => { e[8] = aiWage(c, e[2], e[3]); c.sq.push(e); c.wb = (c.wb || 0) + e[8]; txLog(w, e, from || null, c, kind, 0); };
  const youth = (pos) => {
    const nat = genNat(c.nat), age = rint(16, 18);
    const o = clamp(Math.round(N(c.pres - 17, 4)), 35, 80);
    const pot = clamp(Math.round(N(c.pres - 1, 6.5)), o + 3, 95);
    add([uid(genName(nat)), pos, o, age, pot, nat, rint(2, 4), 0, 0, 0, Math.round(N(0, 1.5) * 10) / 10, 0], 'yth');
  };
  const poach = (pos, lv) => {
    const L = pool[pos]; if (!L) return false;
    const cand = [];
    for (let k = 0; k < 40; k++) { const x = L[(R() * L.length) | 0]; if (!x || x.c === c || x.c.str >= c.str - .5 || !x.c.sq.includes(x.e) || x.e[7] || (w._moved && w._moved.has(x.e))) continue; if (Math.abs(x.e[2] - lv) <= 3 && x.e[3] <= 31) cand.push(x); }
    if (!cand.length) return false;
    const x = cand.sort((a, b) => b.e[2] - a.e[2])[0];
    const fee = Math.round(feeOf(w, x.e, x.c));
    if ((c.cash || 0) < fee) return false;
    if (x.e[2] >= 79 && w.bigTx) w.bigTx.push([pName(w, x.e), String(x.e[0]), x.c.id, c.id, 'sale', x.e[2], x.e[3], fee]);
    c.cash -= fee; x.c.cash = (x.c.cash || 0) + fee;
    x.c.sq.splice(x.c.sq.indexOf(x.e), 1); x.c.wb = (x.c.wb || 0) - (x.e[8] || 0);
    x.e[6] = ctFor(x.e[3]); x.e[8] = Math.round(aiWage(c, x.e[2], x.e[3]) * rnd(1, 1.2) / 50) * 50; c.sq.push(x.e); c.wb = (c.wb || 0) + x.e[8];
    txLog(w, x.e, x.c, c, 'buy', fee);
    x.c = c; w.lastTx++; if (w._moved) w._moved.add(x.e);
    return true;
  };
  const journeyman = (pos) => {
    const nat = genNat(c.nat), age = rint(19, 26);
    const o = clamp(Math.round(N(Math.min(c.pres - 7, 66), 3)), 35, 68);
    add([uid(genName(nat)), pos, o, age, o + rint(0, 4), nat, rint(1, 2), 0, 0, 0, Math.round(N(0, 1.5) * 10) / 10, 0], 'new');
  };
  const nY = winter ? 0 : R() < .55 ? 1 : 2; const ypos = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'CM', 'CB'];
  for (let i = 0; i < nY; i++) { const p = pick(ypos); youth(p); cnt[p] = (cnt[p] || 0) + 1; }
  for (const pos in MINPOS) while ((cnt[pos] || 0) < MINPOS[pos]) {
    if (!poach(pos, c.pres - 3)) { if (R() < .35) youth(pos); else journeyman(pos); }
    cnt[pos] = (cnt[pos] || 0) + 1;
  }
  for (let t = 0; t < (winter ? 1 : 4); t++) {
    const s = xiStrength(c.sq); if (s >= c.pres - .8) break;
    const posList = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST'];
    poach(pick(posList), Math.min(c.pres + 2, 90));
  }
  // 정원 초과: 약한 선수는 비슷한 수준 구단으로 자유 이적, 없으면 방출
  while (c.sq.length > 31) {
    let mi = 0; c.sq.forEach((e, i) => { if (e[2] - (e[3] < 21 ? 6 : 0) < c.sq[mi][2] - (c.sq[mi][3] < 21 ? 6 : 0)) mi = i; });
    const e = c.sq.splice(mi, 1)[0]; c.wb -= e[8] || 0;
    const L = pool._byStr; let d = null;
    if (L) { for (let k = 0; k < 30 && !d; k++) { const x = L[(R() * L.length) | 0]; if (x !== c && x.sq.length < 28 && Math.abs(x.str - e[2]) < 4) d = x; } }
    if (d) { e[6] = ctFor(e[3]); e[7] = 0; e[8] = aiWage(d, e[2], e[3]); txLog(w, e, c, d, 'free', 0); d.sq.push(e); d.wb = (d.wb || 0) + e[8]; }
    else { if (C._ps && C._ps[e[0]]) C._ps[e[0]].ret = C._year + 1; txLog(w, e, c, null, 'rel', 0); }
  }
}
function playerPool(w) {
  const pool = {};
  for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite || !c.sq) continue; for (const e of c.sq) (pool[e[1]] = pool[e[1]] || []).push({ e, c }); }
  pool._byStr = Object.values(w.clubs).filter(c => c.sq && c.lg);
  return pool;
}
// 세월이 지나도 세계 수준이 부풀지 않도록 상위권 분포를 처음 수준에 맞춘다
function topAvgs(w) {
  const o = []; for (const id in w.clubs) { const c = w.clubs[id]; if (!c.lite) for (const e of c.sq) o.push(e[2]); }
  o.sort((a, b) => b - a);
  const avg = (a, b) => { const sl = o.slice(a, b); return sl.reduce((x, y) => x + y, 0) / Math.max(1, sl.length); };
  return { t100: avg(0, 100), t1000: avg(100, 1000), t5000: avg(1000, 5000) };
}
function normalizeWorld(w) {
  const cur = topAvgs(w);
  if (!w.norm) { w.norm = { t100: Math.min(cur.t100, 86.8), t1000: Math.min(cur.t1000, 79.8), t5000: Math.min(cur.t5000, 73.5) }; }
  const d100 = cur.t100 - w.norm.t100, d1000 = cur.t1000 - w.norm.t1000, d5000 = cur.t5000 - w.norm.t5000;
  // 반대로 세계 수준이 처음보다 떨어지면 20대 선수들이 조금씩 더 성장한다
  if (d1000 < -.25 || d5000 < -.25 || d100 < -.4) {
    for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite) continue;
      for (const e of c.sq) { if (e[3] < 19 || e[3] > 29) continue; const o = e[2];
        const d = o >= 84 ? d100 : o >= 76 ? d1000 : o >= 66 ? d5000 : 0;
        if (d < -.25 && R() < Math.min(.9, -d * .9)) { e[2] = Math.min(94, o + 1); if (e[4] < e[2]) e[4] = e[2]; } } }
  }
  if (d100 <= .1 && d1000 <= .1 && d5000 <= .1) return;
  for (const id in w.clubs) {
    const c = w.clubs[id]; if (c.lite) continue;
    for (const e of c.sq) {
      const o = e[2];
      const cut = o >= 84 ? Math.max(d100, d1000) : o >= 76 ? Math.max(0, d1000) * (.4 + (o - 76) / 13) : o >= 68 ? Math.max(0, d5000) * .8 : 0;
      if (cut > 0) { const nv = o - cut; e[2] = clamp(Math.round(nv + (R() < (nv % 1) ? 0 : 0)), 40, 94); if (e[4] > e[2]) e[4] = Math.max(e[2], Math.round(e[4] - cut)); }
    }
  }
}
C.topAvgs = topAvgs;
function advanceWorld(w, results) {
  C._ps = w.ps || null; C._year = w.year; C._w = w; w._tx = [];
  for (const id in w.clubs) {
    const c = w.clubs[id];
    // 명성: 기본값 쪽으로 회귀 + 성적 반영
    let d = (c.base - c.pres) * .1 + N(0, .45) + ((results && results[id]) || 0);
    c.pres = clamp(c.pres + d, 30, 90);
    if (c.lite) materialize(w, c);
    ageSquad(c);
  }
  worldTransfers(w);
  { const pool = playerPool(w); for (const c of shuffle(Object.values(w.clubs).filter(c => !c.lite && c.sq))) refillSquad(c, w, pool); }
  normalizeWorld(w); w._moved = null;
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.lite) c.str = xiStrength(c.sq); }
  // 이번 여름 이적 기록은 다음 시즌 이름으로 보관 (예: 2026/27 시즌이 끝난 뒤 = 2027/28 여름 이적시장)
  const lbl = `${w.year + 1}/${String(w.year + 2).slice(2)}`;
  w.txPending = w.txPending || {}; w.txPending[lbl] = w._tx; w.txKeys = (w.txKeys || []).filter(x => x !== lbl).concat(lbl);
  while (w.txKeys.length > 30) (w.txDrop = w.txDrop || []).push(w.txKeys.shift());
  w._tx = null; C._w = null;
  w.year++;
}
C.advanceWorld = advanceWorld;
// ---------- 이적시장 (달력 진행용) ----------
// 여름: 명성 갱신·나이 듦·은퇴·계약 만료 → 이적·임대·재계약 → 빈자리 채우기. 겨울: 소규모 보강·임대
// 거래마다 날짜를 붙인다 (여름 6/15~9/1, 겨울 1/1~1/31, 마감일 직전에 몰림). 실제 이동은 그 날짜에 달력이 반영한다
function marketWindow(w, kind, d0, d1, resAdj) {
  C._ps = w.ps || null; C._year = w.year; C._w = w; w._tx = [];
  if (kind === 'summer') {
    for (const id in w.clubs) {
      const c = w.clubs[id];
      const d = (c.base - c.pres) * .1 + N(0, .45) + ((resAdj && resAdj[id]) || 0);
      c.pres = clamp(c.pres + d, 30, 90);
      if (c.lite) materialize(w, c);
      ageSquad(c);
    }
  }
  worldTransfers(w, kind === 'winter');
  { const pool = playerPool(w);
    for (const c of shuffle(Object.values(w.clubs).filter(c => !c.lite && c.sq))) {
      if (kind === 'winter') { const cnt = {}; for (const e of c.sq) cnt[e[1]] = (cnt[e[1]] || 0) + 1; if (!Object.keys(MINPOS).some(p => (cnt[p] || 0) < MINPOS[p])) continue; }
      refillSquad(c, w, pool, kind === 'winter');
    } }
  if (kind === 'summer') normalizeWorld(w);
  w._moved = null;
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.lite) c.str = xiStrength(c.sq); }
  // 날짜 붙이기 (선수별로 순서 유지)
  const rows = w._tx, span = d1 - d0, last = {};
  const dateOf = k => {
    if (k === 'lret' || k === 'rel' || k === 'ret' || k === 'yth') return d0;
    if (k === 'ext') return d0 + Math.floor(R() * Math.min(span, 50));
    if (R() < (kind === 'winter' ? .22 : .12)) return d1 - Math.floor(R() * 3); // 마감 직전
    const u = kind === 'winter' ? R() : Math.min(R(), R()) * .35 + R() * .65; // 여름은 7월에 조금 더 몰림
    return d0 + Math.floor(u * span);
  };
  for (const r of rows) { let d = dateOf(r[3]); const p = last[r[0]]; if (p != null && d < p) d = p; last[r[0]] = d; while (r.length < 10) r.push(null); r[10] = d; }
  w._tx = null; C._w = null;
  return rows;
}
C.marketWindow = marketWindow; C.MINPOS = MINPOS;

// ---------- 경기 모델 ----------
const BASEG = 1.36, KSTR = .105, HOME = .11;
function lambdas(sA, sB, home) { const d = KSTR * (sA - sB); const h = home === 1 ? HOME : home === -1 ? -HOME : 0; return [BASEG * Math.exp(d / 2 + h), BASEG * Math.exp(-d / 2 - h)]; }
C.lambdas = lambdas;
function quickMatch(sA, sB, home) { const [a, b] = lambdas(sA, sB, home); return [poisson(a), poisson(b)]; }
function koWinner(sA, sB, ga, gb) { if (ga !== gb) return ga > gb ? 0 : 1; return R() < 1 / (1 + Math.exp(-(sA - sB) * .05)) ? 0 : 1; }
C.quickMatch = quickMatch; C.koWinner = koWinner;

// 리그 일정 (더블 라운드 로빈, 홈/원정)
function roundRobin(ids) {
  const t = ids.slice(); if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const ms = [];
    for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a && b) ms.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(ms); t.splice(1, 0, t.pop());
  }
  const second = rounds.map(ms => ms.map(([a, b]) => [b, a]));
  return shuffle(rounds).concat(shuffle(second));
}
C.roundRobin = roundRobin;
// 리그별 경기 방식: 팀 수와 실제 제도에 맞춘 라운드 수, 스플릿 라운드
const LGFMT = {
  KOR1: { legs: 3, split: [6, 1], note: '33라운드 + 파이널 라운드 5경기' }, SCO1: { legs: 3, split: [6, 1], note: '33라운드 + 스플릿 5경기' }, SUI1: { legs: 3, split: [6, 1], note: '33라운드 + 스플릿 5경기' },
  AUT1: { legs: 2, split: [6, 2], note: '22라운드 + 상·하위 스플릿 10경기' }, DEN1: { legs: 2, split: [6, 2], note: '22라운드 + 상·하위 스플릿 10경기' }, ISL1: { legs: 2, split: [6, 1], note: '22라운드 + 스플릿 5경기' },
  BEL1: { legs: 2, split: [6, 2, 1], note: '정규 30라운드 + 챔피언십 플레이오프 10경기' }, ROU1: { legs: 2, split: [6, 2, 1], note: '정규 30라운드 + 플레이오프 10경기' },
  AUS1: { legs: 3, cap: 26, note: '26라운드' }, ARG1: { legs: 1, note: '단일 리그전' }, USA1: { legs: 1, cap: 34, note: '정규시즌 (승강 없음)' }, USA2: { legs: 1, note: '정규시즌' }
};
function lgFormat(lg) {
  const f = LGFMT[lg.nation + lg.tier]; if (f) return f;
  const n = lg.clubs.length;
  return { legs: n >= 26 ? 1 : n <= 10 ? 4 : n <= 12 ? 3 : 2 };
}
C.lgFormat = lgFormat;
function leagueRounds(lg) {
  const f = lgFormat(lg), d = roundRobin(lg.clubs), half = d.length / 2;
  let r = f.legs === 1 ? d.slice(0, half) : f.legs === 2 ? d : f.legs === 3 ? d.concat(shuffle(d.slice(0, half))) : d.concat(roundRobin(lg.clubs));
  if (f.cap) r = r.slice(0, f.cap);
  return r;
}
C.leagueRounds = leagueRounds;
// 스플릿: 정규 라운드 순위로 상·하위 그룹을 나눠 그룹 안에서 다시 맞붙는다
function splitRounds(order, f) {
  const top = order.slice(0, f.split[0]), bot = order.slice(f.split[0]);
  const gr = (g, legs) => { if (g.length < 2) return []; const d = roundRobin(g); return legs === 1 ? d.slice(0, d.length / 2) : d; };
  const a = gr(top, f.split[1]), b = gr(bot, f.split[2] || f.split[1]), n = Math.max(a.length, b.length), out = [];
  for (let i = 0; i < n; i++) out.push((a[i] || []).concat(b[i] || []));
  return out;
}
C.splitRounds = splitRounds;
C.splitCount = (lg) => { const f = lgFormat(lg); if (!f.split) return 0; const rr = (g, legs) => { const r = g % 2 ? g : g - 1; return legs === 1 ? r : r * 2; }; return Math.max(rr(f.split[0], f.split[1]), rr(lg.clubs.length - f.split[0], f.split[2] || f.split[1])); };
// 사용자 리그가 아닌 리그를 한 번에 시뮬
function simLeague(w, lg) {
  const t = newTable(lg.clubs), f = lgFormat(lg);
  for (const ms of leagueRounds(lg)) for (const [a, b] of ms) { const [x, y] = quickMatch(w.clubs[a].str, w.clubs[b].str, 1); addResult(t, a, b, x, y); }
  if (f.split) for (const ms of splitRounds(sortTable(t).map(r => r.id), f)) for (const [a, b] of ms) { const [x, y] = quickMatch(w.clubs[a].str, w.clubs[b].str, 1); addResult(t, a, b, x, y); }
  return t;
}
C.simLeague = simLeague;
function newTable(ids) { const t = {}; for (const id of ids) t[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; return t; }
// 순위표에 결과 반영 + 경기 목록(_m)에 기록. ui = 내 선수가 뛴 경기면 시즌 경기 기록의 번호
function addResult(t, a, b, ga, gb, ui) {
  const A = t[a], B = t[b]; if (!A || !B) return;
  (t._m = t._m || []).push(ui != null ? [a, b, ga, gb, ui] : [a, b, ga, gb]);
  A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
  if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (ga < gb) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
}
function sortTable(t) { return Object.values(t).filter(r => r && r.id).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || R() - .5); }
Object.assign(C, { newTable, addResult, sortTable });

// 승강 규칙: 국가별 상·하위 리그
function tiersOf(w, nation) { return Object.values(w.lg).filter(l => l.nation === nation).sort((a, b) => a.tier - b.tier); }
// 승강이 없는 리그와 국가별 강등 팀 수
const NOREL = new Set(['USA', 'AUS', 'IND', 'MEX']);
const RELN = { KOR1: 1, SCO1: 1, AUT1: 1, SUI1: 1, DEN1: 2, FRA1: 2, NED1: 2, POR1: 2, BEL1: 2, TUR1: 4, ARG1: 2, BRA1: 4, JPN1: 3, KSA1: 3, CHN1: 2, GRE1: 2, ITA1: 3, ESP1: 3, ENG1: 3, ENG2: 3, ENG3: 4, BRA2: 4, JPN2: 2, KOR2: 1 };
C.NOREL = NOREL;
function applyPromotion(w, tables) {
  const nations = [...new Set(Object.values(w.lg).map(l => l.nation))];
  const moves = {};
  for (const n of nations) {
    const byT = {};
    for (const l of Object.values(w.lg)) if (l.nation === n) (byT[l.tier] = byT[l.tier] || []).push(l);
    const tiers = Object.keys(byT).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < tiers.length - 1; i++) {
      const ups = byT[tiers[i]], dns = byT[tiers[i + 1]];
      if (ups.some(l => !tables[l.id]) || dns.some(l => !tables[l.id])) continue;
      if (NOREL.has(n) && tiers[i] === 1) continue;
      const kk = RELN[n + tiers[i]];
      const k = kk != null ? kk : n === 'GER' && tiers[i] <= 2 ? 2 : ups.length > 1 ? 2 : ups[0].clubs.length <= 12 ? 1 : 3;
      if (!k) continue;
      // 위 티어 각 리그에서 하위 k팀 강등, 아래 티어 전체에서 같은 수만큼 승격(각 조 1위부터)
      const rel = []; for (const u of ups) rel.push(...tables[u.id].slice(-k).map(r => [r.id, u]));
      const cand = []; for (const d of dns) tables[d.id].forEach((r, pos) => cand.push([r.id, d, pos, r.pts / Math.max(1, r.p)]));
      cand.sort((a, b) => a[2] - b[2] || b[3] - a[3]);
      const pro = cand.slice(0, rel.length);
      // 승격팀은 강등팀이 빠진 리그로, 강등팀은 승격팀이 빠진 리그로
      for (let j = 0; j < rel.length; j++) {
        const [rid, ul] = rel[j], [pid, dl] = pro[j] || [];
        if (!pid) break;
        ul.clubs = ul.clubs.filter(x => x !== rid).concat(pid); w.clubs[pid].lg = ul.id; moves[pid] = 1.4;
        dl.clubs = dl.clubs.filter(x => x !== pid).concat(rid); w.clubs[rid].lg = dl.id; moves[rid] = -2.2;
      }
    }
  }
  return moves;
}
C.applyPromotion = applyPromotion;

// ---------- 대륙 대회 참가팀 ----------
const UCL_SLOTS = { ENG: 4, ESP: 4, ITA: 4, GER: 4, FRA: 3, POR: 2, NED: 2, BEL: 1, TUR: 1, SCO: 1, AUT: 1, SUI: 1, DEN: 1, POL: 1, ROU: 1, SWE: 1, NOR: 1 };
const UEL_SLOTS = { ENG: 2, ESP: 2, ITA: 2, GER: 2, FRA: 2, POR: 2, NED: 2, BEL: 2, TUR: 2, SCO: 1, AUT: 1, SUI: 1, DEN: 1, POL: 1, ROU: 1, SWE: 1, NOR: 1, IRL: 1 };
const UECL_SLOTS = { ENG: 1, ESP: 1, ITA: 1, GER: 1, FRA: 1, POR: 1, NED: 1, BEL: 1, TUR: 1, SCO: 2, AUT: 2, SUI: 2, DEN: 2, POL: 2, ROU: 2, SWE: 2, NOR: 2, IRL: 2 };
const COMPS = {
  UCL: { name: 'UEFA 챔피언스리그', short: 'UCL', tier: 1, conf: 'UEFA', phase: 8, ko: 16, playoff: true },
  UEL: { name: 'UEFA 유로파리그', short: 'UEL', tier: 2, conf: 'UEFA', phase: 8, ko: 16, playoff: true },
  UECL: { name: 'UEFA 컨퍼런스리그', short: 'UECL', tier: 3, conf: 'UEFA', phase: 6, ko: 16, playoff: true },
  LIB: { name: '코파 리베르타도레스', short: 'LIB', tier: 1, conf: 'CONMEBOL', phase: 6, ko: 16 },
  SUD: { name: '코파 수다메리카나', short: 'SUD', tier: 2, conf: 'CONMEBOL', phase: 6, ko: 8 },
  ACL: { name: 'AFC 챔피언스리그 엘리트', short: 'ACLE', tier: 1, conf: 'AFC', phase: 6, ko: 8 },
  CCC: { name: 'CONCACAF 챔피언스컵', short: 'CCC', tier: 1, conf: 'CONCACAF', phase: 0, ko: 16 }
};
C.COMPS = COMPS;
function contParticipants(w) {
  const P = { UCL: [], UEL: [], UECL: [], LIB: [], SUD: [], ACL: [], CCC: [] };
  const top = (lid, a, b) => (w.last[lid] || []).slice(a, b);
  const tier1 = n => Object.values(w.lg).find(l => l.nation === n && l.tier === 1);
  const used = new Set();
  const add = (comp, ids) => { for (const id of ids) if (id && !used.has(id) && w.clubs[id]) { P[comp].push(id); used.add(id); } };
  const take = (comp, slots, startOf) => { for (const n in slots) { const l = tier1(n); if (!l) continue; const s = startOf(n); add(comp, top(l.id, s, s + slots[n])); } };
  take('UCL', UCL_SLOTS, () => 0);
  take('UEL', UEL_SLOTS, n => UCL_SLOTS[n] || 0);
  take('UECL', UECL_SLOTS, n => (UCL_SLOTS[n] || 0) + (UEL_SLOTS[n] || 0));
  // 나머지 UEFA 1부 리그(러시아 제외): 리그 수준 순으로 우승팀 → UCL, 2위 → UEL, 3위 → UECL
  const avg = l => l.clubs.reduce((a, id) => a + w.clubs[id].str, 0) / Math.max(1, l.clubs.length);
  const rest = Object.values(w.lg).filter(l => l.tier === 1 && confOf(l.nation) === 'UEFA' && l.nation !== 'RUS' && !(l.nation in UCL_SLOTS) && !(l.nation in UEL_SLOTS)).sort((a, b) => avg(b) - avg(a));
  const room = (comps, id) => { for (const c of comps) if (P[c].length < 36) { add(c, [id]); return; } };
  for (const l of rest) { const t = top(l.id, 0, 3); room(['UCL', 'UEL', 'UECL'], t[0]); room(['UEL', 'UECL'], t[1]); room(['UECL'], t[2]); }
  P.UCL = P.UCL.slice(0, 36); P.UEL = P.UEL.slice(0, 36); P.UECL = P.UECL.slice(0, 36);
  // 리그가 없는 구단(크로아티아·키프로스 등)
  const others = Object.values(w.clubs).filter(c => !c.lg && c.other && !/CONMEBOL|Liga do Brasil|Liga Colombia|Thailand|Emirates/.test(c.other)).sort((a, b) => b.str - a.str).map(c => c.id);
  const fillTo = (comp, n, pool) => { for (const id of pool) { if (P[comp].length >= n) break; add(comp, [id]); } };
  fillTo('UCL', 36, others); fillTo('UEL', 36, others); fillTo('UECL', 36, others);
  // 그래도 모자라면 UEFA 1부 리그 다음 순위 팀
  const lgsU = Object.values(w.lg).filter(l => l.tier === 1 && confOf(l.nation) === 'UEFA' && l.nation !== 'RUS');
  for (const comp of ['UCL', 'UEL', 'UECL']) { let g = 0; while (P[comp].length < 36 && g++ < 600) { const l = pick(lgsU); add(comp, [(w.last[l.id] || []).find(id => !used.has(id))]); } }
  // 남미
  const sa = [['ARG', 6, 6], ['BRA', 7, 6], ['CHI', 3, 3], ['URU', 3, 3], ['PER', 3, 3]];
  for (const [n, a, b2] of sa) { const l = tier1(n); if (l) { add('LIB', top(l.id, 0, a)); add('SUD', top(l.id, a, a + b2)); } }
  add('LIB', Object.values(w.clubs).filter(c => !c.lg && (c.other === 'CONMEBOL Libertadores' || c.other === 'Liga Colombia')).map(c => c.id));
  add('SUD', Object.values(w.clubs).filter(c => !c.lg && c.other === 'CONMEBOL Sudamericana').map(c => c.id));
  P.LIB = P.LIB.slice(0, 32); P.SUD = P.SUD.slice(0, 32);
  // 아시아
  for (const [n, k] of [['JPN', 3], ['KSA', 3], ['KOR', 3], ['CHN', 2], ['AUS', 2], ['IDN', 1], ['VIE', 1], ['IND', 1]]) { const l = tier1(n); if (l) add('ACL', top(l.id, 0, k)); }
  add('ACL', Object.values(w.clubs).filter(c => !c.lg && (c.other === 'Thailand League' || c.other === 'United Emirates League')).map(c => c.id));
  for (const n of ['USA', 'MEX']) { const l = tier1(n); if (l) add('CCC', top(l.id, 0, 8)); }
  return P;
}
C.contParticipants = contParticipants;

// ---------- 국가대표 풀 ----------
const NTG = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'ATT', RM: 'ATT', LW: 'ATT', RW: 'ATT', ST: 'ATT' };
const NTSLOTS = { GK: [3, 1], DEF: [9, 4], MID: [8, 3], ATT: [7, 3] };
C.NTG = NTG; C.NTSLOTS = NTSLOTS;
function nationPools(w) {
  const pools = {};
  for (const id in w.clubs) for (const e of w.clubs[id].sq) { const n = e[5]; (pools[n] = pools[n] || { GK: [], DEF: [], MID: [], ATT: [], all: [] }); pools[n][NTG[e[1]]].push(e[2]); pools[n].all.push(e); }
  for (const n in pools) for (const g of ['GK', 'DEF', 'MID', 'ATT']) pools[n][g].sort((a, b) => b - a);
  return pools;
}
function nationStrength(pool) {
  if (!pool) return 55;
  const take = (arr, k) => { let s = 0; for (let i = 0; i < k; i++) s += arr[i] != null ? arr[i] : 52 - i; return s; };
  return (take(pool.GK, 1) + take(pool.DEF, 4) + take(pool.MID, 3) + take(pool.ATT, 3)) / 11;
}
C.nationPools = nationPools; C.nationStrength = nationStrength;
})(typeof window !== 'undefined' ? window : globalThis);
