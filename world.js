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
// 25~28세 선수의 OVR별 몸값 중앙값 (FC27). 몸값 → 그 몸값에 맞는 OVR
const VCURVE = [[60, .2e6], [62, .3e6], [64, .5e6], [66, .8e6], [68, 1.5e6], [70, 2.1e6], [72, 3.6e6], [74, 5.6e6], [76, 11.1e6], [78, 16.3e6], [80, 26.9e6], [82, 41.7e6], [84, 64.8e6], [86, 68.1e6], [88, 80.2e6], [90, 82.9e6]];
function valueOvr(v) {
  if (!v || v <= VCURVE[0][1]) return 58;
  for (let i = 1; i < VCURVE.length; i++) { const [o1, v1] = VCURVE[i], [o0, v0] = VCURVE[i - 1]; if (v <= v1) return o0 + (o1 - o0) * Math.log(v / v0) / Math.log(v1 / v0); }
  return Math.min(93, 90 + Math.log(v / 82.9e6) / Math.log(1.6)); // 곡선 위: 몸값이 1.6배 될 때마다 +1
}
C.valueOvr = valueOvr;
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
    // 숨은 잠재력 (FM처럼 선수마다 다르게): 나이 대비 여유분 + 개인 편차. 일부는 대형 유망주, 일부는 정체
    // 시장가치가 잠재력을 말해 준다: 어린 선수의 몸값을 25~28세 기준 몸값 곡선에 대 보면 '지금 몸값에 맞는 OVR'이 나오고, 남은 성장 기간만큼 더한다
    let pot = ovr;
    if (age <= 23) { const vo = valueOvr(p[12]); pot = Math.max(ovr + 1, vo + Math.max(0, 23 - age) * 1.35) + N(0, 2) + (age <= 20 && R() < .05 ? rint(3, 7) : 0); }
    else if (age <= 26) pot = ovr + Math.max(0, N(.6, 1.6));
    pot = Math.round(clamp(pot, ovr, 95));
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
  // 2군(B팀, data_yth.js): 1군과 같은 색, 소속 리그 평균 수준. 1군과 같은 리그로는 승격하지 않고 국내 컵에는 나가지 않는다
  for (const [id, name, short, par, lgId, en] of F.BTEAMS || []) { const p = w.clubs[par], L = w.lg[lgId]; if (!p || !L || w.clubs[id]) continue;
    const ss = L.clubs.map(x => w.clubs[x].str), avg = ss.length ? ss.reduce((a, b) => a + b, 0) / ss.length : 62, str = Math.round((avg - .8) * 10) / 10;
    w.clubs[id] = { id, name, short, c1: p.c1, c2: p.c2, nat: p.nat, en, fc: Math.round(str), lg: lgId, sq: [], lite: true, str, base: str, pres: str, parent: par, cty: p.cty };
    L.clubs.push(id); p.bteam = id; }
  // 하부 구단도 모두 실제(가상) 선수 명단을 갖는다
  for (const id in w.clubs) if (w.clubs[id].lite) materialize(w, w.clubs[id]);
  // 2군 명단은 어린 선수 위주 (17~22세, 잠재력 높게)
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.parent || !c.sq) continue; for (const e of c.sq) { e[3] = rint(17, 22); e[4] = Math.min(92, e[2] + rint(4, 15)); e[6] = rint(1, 3); } }
  initFinance(w);
  // 실제 무소속 선수 (data_fa.js): 2026/27 시즌 초 기준
  w.fa = [];
  const mkE = i => { const p = F.P[i], age = Math.floor((refDay - p[9]) / 365.25); return [i, POSMAP[p[2]] || 'CM', p[11], age, p[11], p[5]]; };
  if (F.FA) for (const i of F.FA) { const e = ensureE(mkE(i), null); e[6] = 0; e[8] = 0; e[18] = 0; e[19] = F.FA_LAST[i] || ''; w.fa.push(e); }
  const touched = new Set();
  if (F.FA_MOVE) for (const id in w.clubs) { const c = w.clubs[id]; if (!c.sq || c.lite) continue; for (let k = c.sq.length - 1; k >= 0; k--) { const e = c.sq[k]; if (typeof e[0] === 'number' && F.FA_MOVE[F.P[e[0]][1]]) { c.sq.splice(k, 1); c.wb = (c.wb || 0) - (e[8] || 0); e[6] = 0; e[7] = 0; e[8] = 0; e[18] = 0; e[19] = c.id; w.fa.push(e); touched.add(c); } } }
  if (F.EXTRA) for (const x of F.EXTRA) { const c = w.clubs[x.club]; if (c && c.sq) { if (c.parent) { const k = c.sq.findIndex(q => typeof q[0] !== 'number' && q[1] === (POSMAP[F.P[x.i][2]] || 'CM')); if (k >= 0) c.sq.splice(k, 1); } const e = ensureE(mkE(x.i), c); e[6] = x.ct || 1; if (e[3] <= 23) { const vo = valueOvr(F.P[x.i][12]); e[4] = Math.round(clamp(Math.max(e[2] + 1, vo + Math.max(0, 23 - e[3]) * 1.35) + N(0, 1.5), e[2], 95)); } c.sq.push(e); if (!c.lite) touched.add(c); } }
  // 실제 임대 선수 (data_loans.js): 원소속팀 표시, 원소속팀에 있으면 임대 구단으로
  if (F.LOANS) {
    const fold = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
    const idx = new Map(); for (const id in w.clubs) { const c = w.clubs[id]; for (const e of c.sq || []) if (typeof e[0] === 'number') { const k = fold(F.P[e[0]][1]); if (!idx.has(k)) idx.set(k, []); idx.get(k).push([e, c]); } }
    w.loanN = 0;
    for (const [nm, from, to] of F.LOANS) { const P = w.clubs[from], T = w.clubs[to], L = idx.get(fold(nm)); if (!P || !T || !L || !T.sq) continue;
      const at = L.find(x => x[1] === T) || L.find(x => x[1] === P); if (!at) continue; const [e, c] = at;
      if (c === P) { P.sq.splice(P.sq.indexOf(e), 1); T.sq.push(e); touched.add(P); touched.add(T); }
      e[7] = from; e[6] = Math.max(1, e[6] || 1); w.loanN++; }
  }
  for (const c of touched) c.str = xiStrength(c.sq);
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
// 1군 인원 (유스 유망주 제외): 영입 가능 여부 판단용
C.sqN = c => { if (!c || !c.sq) return 0; let n = 0; const st = c.str || 70; for (const e of c.sq) if (!(e[3] <= 19 && e[4] >= e[2] + 6 && e[2] < st - 8)) n++; return n; };

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
// 이름 풀: 기본 풀 + FC27 실제 선수 이름을 언어권별로 쪼갠 이름·성 (실제 선수와 같은 전체 이름은 만들지 않는다)
// ko·zh는 성이 앞 (FC27 표기와 같게). 같은 이름이 이미 쓰였으면 다시 뽑는다
const FAMFIRST = { ko: 1, zh: 1 };
let NPOOL = null; const USEDN = new Set();
function namePools() {
  if (NPOOL) return NPOOL;
  NPOOL = {}; const add = (lang, a, b) => { const P = NPOOL[lang] = NPOOL[lang] || [new Set(), new Set(), new Set()]; if (a) P[0].add(a); if (b) P[1].add(b); };
  for (const lang of LANGS) { const [fs, ls] = WD.NAMES[lang]; if (FAMFIRST[lang]) { for (const l of ls) add(lang, l, null); for (const f of fs) add(lang, null, f); } else { for (const f of fs) add(lang, f, null); for (const l of ls) add(lang, null, l); } }
  for (const p of F.P) {
    const nm = String(p[1]); USEDN.add(nm);
    const lang = (NAT[p[5]] && NAT[p[5]][1]) || null; if (!lang || !WD.NAMES[lang]) continue;
    const t = nm.split(' ').filter(Boolean); if (t.some(x => x.length < 2 || /[.\d]/.test(x))) continue;
    if (t.length === 1) { const P = NPOOL[lang] || (add(lang), NPOOL[lang]); P[2].add(t[0]); continue; }
    if (t.length > 3) continue;
    add(lang, t[0], t.slice(1).join(' ')); add('@' + p[5], t[0], t.slice(1).join(' '));
  }
  for (const k in NPOOL) { NPOOL[k] = NPOOL[k].map(x => [...x]); if (k[0] === '@' && (NPOOL[k][0].length < 40 || NPOOL[k][1].length < 40)) delete NPOOL[k]; }
  return NPOOL;
}
function genName(nat) {
  const lang = (NAT[nat] && WD.NAMES[NAT[nat][1]]) ? NAT[nat][1] : 'en';
  const NP = namePools(), [fs, ls, mono] = (NP['@' + nat] && R() < .85) ? NP['@' + nat] : NP[lang]; // 그 나라 선수 이름이 충분하면 그 나라 풀을 주로 쓴다
  let nm = '';
  for (let k = 0; k < 12; k++) {
    nm = (mono.length > 20 && (lang === 'br' || lang === 'pt') && R() < .1) ? pick(mono) : pick(fs) + ' ' + pick(ls);
    if (!USEDN.has(nm)) break;
  }
  USEDN.add(nm);
  return nm;
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
      // 어린 선수는 훈련만으로도 꾸준히 큰다 (출전은 가속 요인). 못 뛰는 잠재력 하락은 20세부터, 완만하게
      pot += perf * 2 * play + N(-.35, 1.1) - (play < .2 && age >= 20 ? rnd(0, 1.5) : 0) - (age >= 21 && pot - o >= 8 ? rnd(0, 1.2) : 0); // 잠재력은 보장이 아니다: 평범하게 보내면 조금씩 깎인다
      if (pot > o) o += (pot - o) * rnd(.15, .32) * (.62 + .6 * play) * (age <= 20 ? 1.1 : 1) + perf * 2.2 * play + N(.45, 1);
      else o += N(0, 1) + perf * play;
      pot = clamp(Math.round(pot), o, 97);
    } else if (pot > o) pot = Math.max(o, Math.round(pot - rnd(0, 1.8)));
    if (age <= 23) { /* 위에서 처리 */ }
    else if (age <= 28) o += N(0, 1.1) + perf * play * .6;
    else if (age <= 30) o += N(-.5, 1.1);
    else o -= Math.max(0, (age - 30 - lg * .5)) * rnd(.25, .75) + rnd(0, .7);
    // 지난 시즌 슬럼프였던 선수는 원래 수준으로 돌아오려는 힘이 있다
    if (age >= 24 && age <= 30 && pot > o) o += (pot - o) * rnd(.25, .6);
    // 변수: 해마다 같은 선수가 같은 길을 가지 않도록 (돌파·정체·슬럼프·반등·급격한 노쇠·큰 부상)
    const rr = R(); e[16] = 0;
    if (age >= 18 && age <= 25 && rr < (age <= 22 && pot >= o + 6 ? .09 : .055)) { o += rint(2, 5) + (age <= 21 && pot >= o + 8 ? rint(0, 3) : 0); pot += rint(1, 4); e[16] = 1; }                 // 돌파형 시즌 5.5%
    else if (age <= 23 && rr < .135) { o -= Math.max(0, o - e[2]) * .7; pot -= rint(2, 5); e[16] = 2; }          // 성장 정체 8%
    else if (age >= 24 && age <= 31 && rr < .155) { o -= rint(2, 4); e[16] = 3; }                                // 슬럼프 10% (잠재력은 남아 반등 가능)
    else if (age >= 24 && age <= 27 && rr < .185) { o += rint(2, 4); pot = Math.max(pot, o + 1); e[16] = 4; }    // 늦게 피는 선수 3%
    if (age >= 30 && !e[16] && R() < .1) { o -= rint(2, 4); e[16] = 5; }                                         // 급격한 노쇠 10%
    // 큰 부상(90일 이상)을 당한 시즌: 기량·잠재력 손실
    if (e[15]) { o -= rnd(1, age >= 28 ? 4.5 : 3); pot -= rnd(0, 3); e[15] = 0; }
    o = clamp(Math.round(o), 35, 95);
    // 뉴스용: 크게 오른 선수·크게 떨어진 스타
    if (C._w && (typeof e[0] === 'number' || String(e[0])[0] !== '~')) { const dd = o - e[2];
      if ((dd >= 4 && o >= 74 && age <= 25) || (dd <= -3 && e[2] >= 84 && age <= 32)) (C._w.devEv = C._w.devEv || []).push({ y: C._w.year, pid: String(e[0]), k: dd > 0 ? 'up' : 'down', d: dd, o0: e[2], o1: o, age }); }
    // 은퇴 확률: 개인별 은퇴 나이 근처에서 서서히 오른다. 아직 팀에서 주전으로 뛰는 선수는 잘 은퇴하지 않고,
    // 기량이 떨어져 출전이 줄거나 팀 수준보다 처지면 그때 은퇴한다 (갑작스러운 은퇴 방지)
    const retAge = 36 + lg + clamp((o - 74) * .1, -1.2, 2.5);
    let pr = age < 32 ? 0 : 1 / (1 + Math.exp(-(age - retAge) * .85));
    const rel = o - (c.str || o);
    pr *= apps >= 25 && rel >= -2 ? .3 : apps >= 15 ? .7 : apps < 6 ? 1.6 : 1;
    if (rel < -8) pr *= 1.4;
    if (o >= 83 && age <= 34) pr *= .25; // 아직 정상급인 선수는 30대 초반에 잘 은퇴하지 않는다
    if (age >= 39) pr = Math.max(pr, .25);
    if (age >= 41) pr = Math.max(pr, .85);
    if (age >= 30 && o < 48) pr = Math.max(pr, .2);
    pr = Math.min(pr, .97);
    if (R() < pr) { e[2] = o; e[3] = age; if (C._ps && C._ps[e[0]]) C._ps[e[0]].ret = C._year + 1; if (C._w) txLog(C._w, e, c, null, 'ret', 0); continue; }
    e[2] = o; e[3] = age; e[4] = Math.round(Math.max(pot, o)); e[6] -= 1;
    out.push(e);
  }
  c.sq = out;
}
// 이적 기록: [선수 id, 보낸 구단, 받은 구단, 종류, 이적료(만 유로), OVR, 나이, 새 주급(유로), 계약 연수]
// 종류: buy 이적 · free 자유계약 · loan 임대 · lret 임대 복귀 · rel 방출 · ret 은퇴 · yth 유스 승격 · new 외부 영입 · ext 재계약
// 이적 기록 한 줄: [선수, 보낸 구단, 받은 구단, 종류, 이적료(만 유로), OVR, 나이, 새 주급, 계약 연수(, 재계약 전 주급)]
// ---------- 무소속(자유계약) 선수 ----------
// 계약이 끝났는데 갈 곳을 못 찾은 쓸 만한 선수는 사라지지 않고 무소속으로 남는다 (w.fa).
// 이적시장이 아니어도 구단이 언제든 데려갈 수 있다 (calendar.js faTick). e[18] = 무소속이 된 날, e[19] = 직전 구단
const faOk = e => e[2] >= 62 && e[3] <= 37 && (typeof e[0] === 'number' || e[2] >= 67);
function faAdd(w, e, from) { w.fa = w.fa || []; if (w.fa.includes(e)) return; e[6] = 0; e[7] = 0; e[13] = 0; e[14] = 0; e[18] = w.cal ? w.cal.d : 0; e[19] = from ? from.id : (e[19] || ''); w.fa.push(e); }
C.faAdd = faAdd; C.faOk = faOk;
// 여름마다: 무소속 선수도 나이를 먹고, 오래 쉬거나 나이가 많으면 은퇴
function faAge(w) {
  if (!w.fa || !w.fa.length) return;
  const d = w.cal ? w.cal.d : 0, keep = [];
  for (const e of w.fa) {
    e[3]++; const age = e[3];
    e[2] = Math.max(40, Math.round(e[2] - (age >= 31 ? rnd(1, 3) : rnd(0, 1.5)))); e[4] = Math.max(e[2], e[4] || e[2]);
    const idle = d - (e[18] || d);
    if (age >= 38 || e[2] < 58 || (idle > 330 && R() < .6) || (age >= 35 && R() < .4)) { if (C._ps && C._ps[e[0]]) C._ps[e[0]].ret = C._year + 1; txLog(w, e, null, null, 'ret', 0); continue; }
    keep.push(e);
  }
  w.fa = keep;
}
function txLog(w, e, from, to, kind, fee, oldWage) { if (!w._tx) return; const r = [String(e[0]), from ? from.id : '', to ? to.id : '', kind, fee ? Math.round(fee / 1e4) : 0, e[2], e[3], e[8] || 0, e[6] || 0]; if (oldWage != null) r.push(oldWage); w._tx.push(r); }
C.txLog = txLog;
const natOf = (w, c) => c && c.lg && w.lg[c.lg] ? w.lg[c.lg].nation : (c ? c.nat : '');
// 이적료 (무작위성 없는 기준값): 가치 × 남은 계약
const feeOf = (w, e, from) => C.aiFee(e[2], e[3], natOf(w, from), Math.max(0, e[6]), undefined, e[11] ? { rt: (e[12] || 660) / 100, apps: e[11], of: 38 } : null);
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
  // 이적 시점 기록: e[21] = 이적한 창(시즌×2 + 겨울), e[22] = 떠나온 구단. 막 데려온 선수는 바로 되팔지 않고, 떠나온 구단으로 곧장 되돌아가지 않는다
  // 여름 이적시장(6월)은 아직 지난 시즌(w.year)이 끝나기 전이라 다음 시즌 몫으로 센다
  const stamp = winter ? w.year * 2 + 1 : (w.year + 1) * 2;
  w._lret = new Map();
  const MK = C.mkt; if (MK) MK.begin(w, winter);
  const lastRow = () => w._tx && w._tx[w._tx.length - 1];
  const tag = m => { const r = lastRow(); if (r && m) r[11] = m; };
  if (!winter) for (const c of clubs) for (const e of c.sq.slice()) {
    ensureE(e, c);
    e[13] = 0;
    if (e[7]) { const p = w.clubs[e[7]]; e[7] = 0; if (p && p.sq && p !== c) {
      // 완전 이적 옵션: 임대에서 크게 활약했고 임대 구단이 감당할 수 있으면 가끔 그대로 사들인다
      // 임대 계약 조항: e[27] = ['o' 옵션 | 'b' 의무, 금액(만 유로)]. 조항이 없으면 가끔 따로 협상
      const lo = e[27], good = (e[11] || 0) >= 22 && (e[12] || 0) >= 695, oblig = lo && lo[0] === 'b';
      const fee = lo ? lo[1] * 1e4 : Math.round(feeOf(w, e, p) * .85);
      if (!c.parent && c.lg && (oblig ? (c.cash || 0) >= fee * .3 : good && (c.cash || 0) >= fee && e[2] <= c.str + 4 && e[2] < p.str - 2 && R() < (lo ? .75 : .3))) {
        e[27] = 0; e[6] = ctFor(e[3]); e[21] = stamp; e[22] = p.id; w._moved.add(e);
        txLog(w, e, p, c, 'buy', fee); const mm = MK ? MK.deal(w, e, p, c, 'buy', fee, { stamp }) : ''; if (!MK) { c.cash -= fee; p.cash = (p.cash || 0) + fee; }
        tag([lo ? (oblig ? 'oy' : 'ox') : '', mm].filter(Boolean).join('|')); big(e, p, c, 'sale', fee); stat.sale++; continue;
      }
      e[27] = 0;
      w._lret.set(e, c.id);
      c.sq.splice(c.sq.indexOf(e), 1); p.sq.push(e); txLog(w, e, c, p, 'lret', 0);
      // 임대에서 잘하고 온 선수: 이번 시즌은 원소속팀에서 기회를 받는다 (임대 뺑뺑이 방지)
      if ((e[11] || 0) >= 16 && (e[12] || 0) >= 680 && e[2] >= p.str - 9) e[13] = 1; } }
  }
  // 2) 재정: 이번 시즌 수입과 이적 예산 (지난 예산 일부 이월)
  for (const c of clubs) { if (!winter || c.rev == null) { c.rev = clubRev(w, c); c.cash = Math.max(0, Math.round((c.cash || 0) * .55 + c.rev * .16)); } c.wb = c.sq.reduce((a, e) => a + (e[8] || 0), 0); }
  if (!winter && MK) for (const c of clubs) MK.payDues(w, c);
  // 바이백 행사: 원소속 구단이 정해 둔 금액으로 되사 온다 (선수가 그 구단 수준까지 컸을 때)
  if (!winter && MK) for (const c of clubs) for (const e of c.sq.slice()) {
    const bb = e[26]; if (!bb || e[7]) continue; if (stamp > bb[2]) { e[26] = 0; continue; }
    const o = w.clubs[bb[0]], fee = bb[1] * 1e4; if (!o || !o.sq || o === c || (o.cash || 0) < fee * .5 || e[2] < o.str - 4 || R() > .55) continue;
    c.sq.splice(c.sq.indexOf(e), 1); c.wb -= e[8] || 0; e[6] = ctFor(e[3]); e[8] = Math.round(aiWage(o, e[2], e[3]) / 50) * 50; o.sq.push(e); o.wb += e[8]; e[21] = stamp; e[22] = c.id; w._moved.add(e);
    txLog(w, e, c, o, 'buy', fee); tag(['bx', MK.deal(w, e, c, o, 'buy', fee, { stamp })].join('|')); big(e, c, o, 'sale', fee); stat.sale++;
  }
  const wageRoom = (d, wk) => d.wb + wk <= d.rev * .62 / 52;
  // 2) 1군·2군 사이 이동 (여름): 2군에서 1군 수준이 된 어린 선수는 승격, 1군에서 뛰지 못하는 어린 선수는 2군으로
  if (!winter) for (const b of clubs) { if (!b.parent) continue; const p = w.clubs[b.parent]; if (!p || !p.sq || p.lite) continue;
    for (const e of b.sq.slice()) { if (e[7] || e[3] > 23 || e[2] < p.str - 7) continue; b.sq.splice(b.sq.indexOf(e), 1); p.sq.push(e); txLog(w, e, b, p, 'bu', 0); w._moved.add(e); }
    const rl0 = roles(p);
    for (const e of p.sq.slice()) { if (b.sq.length >= 30) break; if (e[7] || e[3] < 17 || e[3] > 21 || e[2] >= p.str - 8 || rl0.get(e) !== 2 || R() > .65) continue; p.sq.splice(p.sq.indexOf(e), 1); b.sq.push(e); txLog(w, e, p, b, 'bt', 0); w._moved.add(e); }
    p.wb = p.sq.reduce((a, e) => a + (e[8] || 0), 0); b.wb = b.sq.reduce((a, e) => a + (e[8] || 0), 0);
  }
  // 3) 선수별 결정
  const market = [];
  const fresh = e => e[21] != null && stamp - e[21] <= 1;
  for (const c of clubs) {
    const rl = roles(c);
    for (const e of c.sq) {
      if (e[7] && e[7] !== c.id) continue; // 임대 온 선수는 원소속팀 소유: 임대 구단이 팔거나 다시 임대 보낼 수 없다
      const o = e[2], age = e[3], f = e[9] || 0, rr = rl.get(e), gap = o - c.str, ct = e[6];
      const prospect = age <= 21 && e[4] >= o + 5;
      // 구단이 원하는 정도
      let want = rr === 0 ? .95 : rr === 1 ? .72 : .3;
      want += f * .08; if (age >= 31) want -= .15; if (age >= 33) want -= .25; if (prospect) want += .3;
      // 선수의 이적 욕구: 팀보다 크게 성장했거나 출전 기회가 없을 때
      const top = c.str >= topS - 2;
      const ambition = !top && gap >= 3 && age <= 30 ? clamp(.25 + (gap - 3) * .1 + Math.max(0, f) * .08, .2, .85) : rr === 2 && age >= 22 && age <= 30 ? .45 : .05;
      const wantsOut = R() < (MK ? MK.ambition(e, ambition) : ambition);
      let kind = null;
      // 2군: 23세가 넘으면 내보낸다 (계약 만료면 자유계약, 아니면 판매)
      if (!winter && c.parent && age >= 23) { market.push([e, c, ct <= 0 ? 'free' : 'sale']); continue; }
      if (winter) {
        // 겨울: 계약 만료 처리는 없고, 뛰지 못하는 유망주 임대·불만 선수 판매·보강만 소규모로
        if (wantsOut && (gap >= 3 || rr === 2) && R() < .3) kind = 'sale';
        else if (!e[13] && age >= 18 && age <= 21 && rr === 2 && (e[11] == null || e[11] < 8) && R() < (prospect ? .38 : .22)) kind = 'loan';
        else if (f < -1.4 && age >= 24 && R() < .06) kind = 'sale';
        if (kind && fresh(e) && !(f < -1.6 && R() < .2)) kind = null;
        if (kind) market.push([e, c, kind, kind === 'sale' && wantsOut && o >= 78 ? { req: 1 } : null]);
        continue;
      }
      const renew = (mult) => { const nw = Math.round(aiWage(c, o, age) * mult / 50) * 50, ow = e[8] || 0; c.wb += nw - ow; e[8] = nw; e[6] = ctFor(age); txLog(w, e, c, c, 'ext', 0, ow); };
      if (ct <= 0) {
        // 계약 만료: 재계약(에이스는 인상, 애매한 선수는 삭감) 또는 자유계약. 전성기 핵심 선수는 거의 다 붙잡는다
        const core = age <= 31 && (o >= 78 || (rr === 0 && gap >= 0));
        const keepP = age <= 22 && e[4] >= o + 5 && o >= c.str - 22; // 키울 만한 유망주는 계약을 이어 간다
        if (core ? R() < (wantsOut ? .8 : .97) : keepP ? R() < .9 : (!wantsOut && R() < want)) { renew(rr === 0 && gap >= 1 ? rnd(1.1, 1.35) : rr === 2 || age >= 31 ? rnd(.6, .9) : rnd(.92, 1.1)); stat.renew++; }
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
        else if (prospect && age >= 18 && rr === 2 && (e[11] || 0) < 12 && o < c.str - 3 && R() < (age <= 18 ? .45 : .7)) kind = 'loan'; // 뛸 자리가 없는 유망주는 임대로 경기 경험
        else if (age >= 18 && age <= 21 && rr >= 1 && R() < (o >= c.str - 4 ? .12 : age <= 19 ? .3 : .45)) kind = 'loan';
        else if (age === 22 && rr === 2 && o < c.str - 4 && R() < .35) kind = 'loan';
        else if (f < -1.2 && age >= 23 && R() < .25) kind = 'sale';
        else if (age >= 31 && gap < 0 && R() < .1) kind = 'sale';
        else if (R() < .02) kind = 'sale';
      }
      if (kind && kind !== 'free' && fresh(e) && !(f < -1.4 && R() < .25)) kind = null; // 막 데려온 선수는 반 시즌 만에 내보내지 않는다 (아주 부진하면 예외)
      // 바이아웃: 팔 생각이 없어도, 선수가 원하고 더 큰 구단이 금액을 내면 떠난다
      let flag = null;
      if (MK && !kind && wantsOut && !c.parent && ct >= 1 && !fresh(e)) { const bo = MK.buyout(w, e, c); if (bo && gap >= 2 && R() < .4) { kind = 'sale'; flag = { bo: bo * 1e4 }; } }
      if (kind === 'sale' && wantsOut && o >= 78 && !flag) flag = { req: 1 };
      if (kind) market.push([e, c, kind, flag]);
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
    const back = e[22] != null && e[21] != null && stamp - e[21] <= 3 ? e[22] : null, lr = w._lret.get(e);
    const cand = range.filter(c => c !== from && c.id !== back && c.id !== lr && (!c.parent || e[3] <= 21) && C.sqN(c) < 31 && (!fee || c.cash >= fee * (fee >= 2e7 ? .55 : 1)) && (kind === 'loan' || wageRoom(c, wk(c))) && (!MK || MK.canJoin(w, e, from, c, kind)));
    if (!cand.length) return null;
    const nat = e[5], age = e[3], o = e[2];
    return wpick(cand, c => Math.exp((c.str - lo) * (kind === 'loan' ? .05 : .22)) * (c.str >= topS - .6 ? .4 : c.str >= topS - 1.6 ? .7 : 1) * (c.nat === nat ? 2 : 1) * (from && c.nat === from.nat ? 1.5 : 1) * need(c, e[1]) * (c.sq.length < 25 ? 1.4 : c.sq.length > 28 ? .5 : 1)
      * (age >= 30 && o >= 72 ? (RETIRE_LG[c.nat] || 1) : 1) * (kind === 'loan' && from && c.nat === from.nat ? 1.6 : 1)
      * (kind !== 'loan' && o >= 76 && age <= 30 && from ? Math.exp(clamp(lvOf(c) - lvOf(from), -12, 4) * .25) : 1) * (MK ? MK.weight(w, e, c) : 1));
  };
  market.sort((a, b) => b[0][2] - a[0][2]);
  for (const [e, c, kind, flag] of market) {
    const o = e[2], age = e[3], f = e[9] || 0, gap = o - c.str;
    let lo, hi; const L = lvl(o);
    if (kind === 'loan') { lo = L - 4; hi = L + 1; }
    else if (gap >= 3) { lo = Math.max(c.str + 1, L - 3); hi = L + 4; }
    else if (kind === 'free' && o >= 78 && age <= 32) { lo = L - 3; hi = L + 3; }
    else if (f < -.9 || age >= 31) { lo = L - 8; hi = L + 1; }
    else { lo = L - 4; hi = L + 3; }
    const fee = kind === 'sale' ? (flag && flag.bo ? flag.bo : Math.round(feeOf(w, e, c))) : kind === 'loan' && o >= 70 ? Math.round(C.aiFee(o, age, natOf(w, c), 3) * .06) : 0;
    if (flag && flag.bo) { lo = Math.max(lo, c.str + 1); hi = Math.max(hi, lo + 3); }
    const wk = d => Math.round(aiWage(d, o, age) * (kind === 'free' ? rnd(1.05, 1.25) : kind === 'sale' ? rnd(1, 1.2) : 1) / 50) * 50;
    let d = pickClub(lo, hi, e, c, kind, fee, wk);
    if (!d && kind === 'sale' && !(flag && flag.bo)) d = pickClub(L - 7, L + 2, e, c, kind, fee * .8, wk);
    if (!d && kind === 'loan') d = pickClub(L - 8, L + 3, e, c, kind, 0, wk);
    if (!d && kind === 'free') d = pickClub(L - 10, L + 2, e, c, kind, 0, wk) || (age < 33 || o >= 65 ? pickClub(L - 25, L, e, c, kind, 0, wk) : null);
    // 실력 있는 선수는 연봉을 깎아서라도 새 팀을 찾는다 (아직 뛸 수 있는데 갈 곳이 없어 은퇴하는 일 방지)
    let cut = 1;
    if (!d && kind === 'free' && o >= 68 && age <= 35) { const wk2 = x => Math.max(50, Math.round(wk(x) * .45 / 50) * 50); d = pickClub(L - 30, L + 2, e, c, kind, 0, wk2); if (d) cut = .45; }
    if (!d) {
      if (kind === 'free') { stat.rel++; if (faOk(e)) { txLog(w, e, c, null, 'rel', 0); faAdd(w, e, c); } else { if (C._ps && C._ps[e[0]]) C._ps[e[0]].ret = C._year + 1; txLog(w, e, c, null, age >= 30 ? 'ret' : 'rel', 0); } }
      else {
        c.sq.push(e); c.wb += e[8] || 0;
        // 팔려고 했지만 살 구단이 없으면: 계약이 1년 남은 쓸 만한 선수는 연장해서 공짜로 잃지 않게 한다
        if (kind === 'sale' && e[6] <= 1 && (o >= 74 || o >= c.str - 3) && R() < .85) { const ow = e[8] || 0, nw = Math.round(aiWage(c, o, age) * rnd(.9, 1.15) / 50) * 50; c.wb += nw - ow; e[8] = nw; e[6] = ctFor(age); txLog(w, e, c, c, 'ext', 0, ow); stat.ext++; }
      }
      continue;
    }
    const paid = kind === 'sale' && d.cash < fee && !(flag && flag.bo) && fee < 2e7 ? Math.round(fee * .8) : fee;
    big(e, c, d, kind, paid); w._moved.add(e);
    const pay = (k) => { if (MK) tag(MK.deal(w, e, c, d, k, paid, Object.assign({ stamp }, flag || {}))); else { d.cash -= paid; c.cash += paid; } };
    if (kind === 'loan') { e[7] = c.id; stat.loan++; txLog(w, e, c, d, 'loan', paid); pay('loan'); }
    else { e[6] = cut < 1 ? Math.min(2, ctFor(age)) : ctFor(age); e[8] = cut < 1 ? Math.max(50, Math.round(wk(d) * cut / 50) * 50) : wk(d); d.wb += e[8]; txLog(w, e, c, d, kind === 'sale' ? 'buy' : 'free', paid); pay(kind === 'sale' ? 'buy' : 'free'); stat[kind]++; e[21] = stamp; e[22] = c.id; }
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
    const par = c.parent && w.clubs[c.parent];
    const o = par ? clamp(Math.round(N(c.str - 5, 3)), 45, 75) : clamp(Math.round(N(c.pres - 17, 4)), 35, 80);
    const pot = clamp(Math.round(N(par ? par.pres - 4 : c.pres - 1, 6.5)), o + 3, 95);
    const ye = [uid(genName(nat)), pos, o, age, pot, nat, rint(2, 4), 0, 0, 0, Math.round(N(0, 1.5) * 10) / 10, 0]; ye[29] = c.lg && w.lg[c.lg] ? w.lg[c.lg].nation : c.nat; add(ye, 'yth');
  };
  const poach = (pos, lv) => {
    const L = pool[pos]; if (!L) return false;
    const cand = [];
    const stamp = winter ? w.year * 2 + 1 : (w.year + 1) * 2;
    for (let k = 0; k < 40; k++) { const x = L[(R() * L.length) | 0]; if (!x || x.c === c || x.c.str >= c.str - .5 || !x.c.sq.includes(x.e) || x.e[7] || (w._moved && w._moved.has(x.e)) || (C.mkt && !C.mkt.canJoin(w, x.e, x.c, c, 'buy'))) continue;
      if (x.e[21] != null && (stamp - x.e[21] <= 1 || (x.e[22] === c.id && stamp - x.e[21] <= 3))) continue; /* 막 이적한 선수·직전 구단으로 되돌아가는 경우 제외 */ if (Math.abs(x.e[2] - lv) <= 3 && x.e[3] <= 31) cand.push(x); }
    if (!cand.length) return false;
    const x = cand.sort((a, b) => b.e[2] - a.e[2])[0];
    const fee = Math.round(feeOf(w, x.e, x.c));
    if ((c.cash || 0) < fee * (fee >= 2e7 ? .55 : 1)) return false;
    if (x.e[2] >= 79 && w.bigTx) w.bigTx.push([pName(w, x.e), String(x.e[0]), x.c.id, c.id, 'sale', x.e[2], x.e[3], fee]);
    if (!C.mkt) { c.cash -= fee; x.c.cash = (x.c.cash || 0) + fee; }
    x.c.sq.splice(x.c.sq.indexOf(x.e), 1); x.c.wb = (x.c.wb || 0) - (x.e[8] || 0);
    x.e[6] = ctFor(x.e[3]); x.e[8] = Math.round(aiWage(c, x.e[2], x.e[3]) * rnd(1, 1.2) / 50) * 50; c.sq.push(x.e); c.wb = (c.wb || 0) + x.e[8];
    txLog(w, x.e, x.c, c, 'buy', fee); if (C.mkt && w._tx) { const m = C.mkt.deal(w, x.e, x.c, c, 'buy', fee, { stamp }); if (m) w._tx[w._tx.length - 1][11] = m; } x.e[21] = winter ? w.year * 2 + 1 : (w.year + 1) * 2; x.e[22] = x.c.id;
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
    if (c.parent) youth(pos); else if (!poach(pos, c.pres - 3)) { if (R() < .35) youth(pos); else journeyman(pos); }
    cnt[pos] = (cnt[pos] || 0) + 1;
  }
  for (let t = 0; t < (winter ? 1 : 4); t++) {
    const s = xiStrength(c.sq); if (s >= c.pres - .8) break;
    const posList = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST'];
    if (!c.parent) poach(pick(posList), Math.min(c.pres + 2, 90));
  }
  // 정원 초과: 약한 선수는 비슷한 수준 구단으로 자유 이적, 없으면 방출
  // 정원 초과: 키울 유망주는 남기고(넘치면 임대), 나이 들고 약한 선수부터 내보낸다
  const keepScore = e => (e[3] < 18 && e[4] >= e[2] + 8 ? 60 : 0) + e[2] + (e[3] <= 22 && e[4] >= e[2] + 5 ? 6 + Math.min(6, (e[4] - e[2]) * .4) : e[3] <= 21 ? 2 : 0) - (e[3] >= 32 ? 3 : 0) - (e[7] ? 4 : 0);
  // 1군 31명 + 키우는 어린 유망주(19세 이하)는 따로 최대 16명까지 (유스 팀)
  const cap = 31 + Math.min(16, c.sq.filter(e => e[3] <= 19 && e[4] >= e[2] + 6 && !e[7]).length);
  while (c.sq.length > cap) {
    let mi = 0; c.sq.forEach((e, i) => { if (keepScore(e) < keepScore(c.sq[mi])) mi = i; });
    const e = c.sq.splice(mi, 1)[0]; c.wb -= e[8] || 0;
    const L = pool._byStr; let d = null;
    // 임대 온 선수는 원소속팀으로 돌려보낸다
    if (e[7] && w.clubs[e[7]] && w.clubs[e[7]].sq) { const p = w.clubs[e[7]]; e[7] = 0; p.sq.push(e); txLog(w, e, c, p, 'lret', 0); continue; }
    const prospect = e[3] <= 22 && e[4] >= e[2] + 4;
    if (L) { for (let k = 0; k < 40 && !d; k++) { const x = L[(R() * L.length) | 0]; if (x !== c && C.sqN(x) < (prospect ? 29 : 28) && (prospect ? x.str >= e[2] - 3 && x.str <= e[2] + 5 && x.str < c.str : Math.abs(x.str - e[2]) < 4)) d = x; } }
    if (d && prospect) { e[7] = c.id; txLog(w, e, c, d, 'loan', 0); d.sq.push(e); }
    else if (d) { e[6] = ctFor(e[3]); e[7] = 0; e[8] = aiWage(d, e[2], e[3]); txLog(w, e, c, d, 'free', 0); d.sq.push(e); d.wb = (d.wb || 0) + e[8]; }
    else if (faOk(e)) { txLog(w, e, c, null, 'rel', 0); faAdd(w, e, c); }
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
// 최상위권 분포 유지: 세계 k번째 선수의 OVR이 시작 때(FC27) k번째 선수 OVR + 1을 넘지 않게 한다
// (FC27 기준 90 이상 11명, 86 이상 65명 수준이 해마다 크게 늘지 않도록)
let OVRREF = null;
function topCap(w) {
  if (!OVRREF) OVRREF = F.P.filter(p => p[4] >= 0).map(p => p[11]).sort((a, b) => b - a).slice(0, 400);
  const all = []; for (const id in w.clubs) { const c = w.clubs[id]; if (c.sq) for (const e of c.sq) if (e[2] >= 80) all.push(e); } for (const e of w.fa || []) if (e[2] >= 80) all.push(e);
  all.sort((a, b) => b[2] - a[2]);
  for (let i = 0; i < all.length && i < OVRREF.length; i++) { const lim = OVRREF[i] + 1, e = all[i]; if (e[2] > lim) { e[2] = lim; if (e[4] > lim + 1) e[4] = lim + 1; } }
}
C.topCap = topCap;
function normalizeWorld(w) { normalizeWorld0(w); topCap(w); }
function normalizeWorld0(w) {
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
    w.clubEv = (w.clubEv || []).filter(x => x.y >= w.year - 1); w.devEv = (w.devEv || []).filter(x => x.y >= w.year);
    for (const id in w.clubs) {
      const c = w.clubs[id];
      // 구단 규모도 고정이 아니다: 명성이 오래 오르거나 떨어지면 기본 규모도 따라 움직인다 (+ 해마다 작은 변동)
      if (!c.lite) c.base = clamp(c.base + (c.pres - c.base) * .08 + N(0, .45), 35, 92);
      // 드물게 큰 변화: 새 구단주(투자), 재정 위기(긴축)
      const L = c.lg && w.lg[c.lg];
      if (L && L.tier <= 2 && c.sq && c.sq.length && !c.lite) {
        const r = R();
        if (r < .008 && c.base < 84) { const up = rnd(4, 9); c.base = clamp(c.base + up, 35, 90); c.pres = clamp(c.pres + up * .5, 30, 90); c.cash = (c.cash || 0) + (c.rev || 2e6) * rnd(1.2, 2.6); w.clubEv.push({ y: w.year, id, k: 'takeover' }); }
        else if (r < .015 && c.base >= 68) { const dn = rnd(3, 6); c.base = clamp(c.base - dn, 35, 92); c.pres = clamp(c.pres - dn * .4, 30, 90); c.cash = Math.min(c.cash || 0, (c.rev || 2e6) * .05); w.clubEv.push({ y: w.year, id, k: 'crisis' }); }
      }
      const d = (c.base - c.pres) * .1 + N(0, .45) + ((resAdj && resAdj[id]) || 0);
      c.pres = clamp(c.pres + d, 30, 90);
      if (c.lite) materialize(w, c);
      ageSquad(c);
    }
    faAge(w);
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
    if (k === 'lret' || k === 'rel' || k === 'ret' || k === 'yth' || k === 'bt' || k === 'bu') return d0;
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
// 경기 당일 전력: 스쿼드 전력 + 시즌 폼(감독·분위기, 달마다 조금씩 변함) + 부상자 공백
C.mstr = (w, id) => { const c = typeof id === 'object' ? id : w.clubs[id]; return c ? (c.str || 60) + (c.fm || 0) + (c.injd || 0) + (c.tac || 0) : 60; };

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
// 승강 플레이오프 형식 (나라+위 리그 등급)
const POFMT = { ENG1: 'p4', ENG2: 'p4', ENG3: 'p4', ESP1: 'p4', ITA1: 'p4', GER1: 'rel', GER2: 'rel', FRA1: 'rel', NED1: 'p4' };
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
      // 2군은 1군과 같은 등급(또는 그 위)으로 올라갈 수 없다 → 다음 순위 팀이 대신 승격
      const okUp = id => { const c = w.clubs[id], p = c && c.parent && w.clubs[c.parent]; if (!p) return true; const pl = w.lg[p.lg]; return !pl || pl.nation !== n || pl.tier < tiers[i]; };
      const cand = []; for (const d of dns) tables[d.id].forEach((r, pos) => { if (okUp(r.id)) cand.push([r.id, d, pos, r.pts / Math.max(1, r.p)]); });
      cand.sort((a, b) => a[2] - b[2] || b[3] - a[3]);
      let pro = cand.slice(0, rel.length);
      // 플레이오프 (실제 방식): 'p4' = 마지막 승격 한 자리를 아래 리그 k~k+3위가 준결승(홈·원정)·결승(단판)으로
      //                         'rel' = 위 리그 (끝에서 k+1)위와 아래 리그 (k+1)위가 홈·원정 승강 플레이오프
      const po = POFMT[n + tiers[i]];
      if (po && ups.length === 1 && dns.length === 1 && cand.length >= k + 3) {
        const S2 = id => C.mstr(w, id), tie = (a, b, two) => { const [g1, g2] = C.quickMatch(S2(a), S2(b), 1); if (!two) { const wn = C.koWinner(S2(a), S2(b), g1, g2) === 0 ? a : b; return { a, b, s: [[g1, g2]], w: wn }; } const [h1, h2] = C.quickMatch(S2(b), S2(a), 1); const ta = g1 + h2, tb = g2 + h1; const wn = ta !== tb ? (ta > tb ? a : b) : (C.koWinner(S2(b), S2(a), h1, h2) === 0 ? b : a); return { a, b, s: [[g1, g2], [h1, h2]], w: wn }; };
        const rec = { n: ups[0].name, ln: dns[0].name, y: w.year, kind: po };
        if (po === 'p4') {
          const c4 = cand.slice(k - 1, k + 3).map(x => x[0]);
          const s1 = tie(c4[3], c4[0], true), s2 = tie(c4[2], c4[1], true), f = tie(s1.w, s2.w, false);
          pro = cand.slice(0, k - 1).concat([cand.find(x => x[0] === f.w)]);
          rec.sf = [s1, s2]; rec.f = f;
        } else if (po === 'rel' && tables[ups[0].id].length > k + 1) {
          const up16 = tables[ups[0].id][tables[ups[0].id].length - k - 1].id, lo3 = cand[k] && cand[k][0];
          if (lo3) { const t = tie(lo3, up16, true); rec.f = t; if (t.w === lo3) { rel.push([up16, ups[0]]); pro = cand.slice(0, k + 1); } }
        }
        (w.poHist = w.poHist || []).push(rec); if (w.poHist.length > 60) w.poHist.shift();
      }
      // 승격팀은 강등팀이 빠진 리그로, 강등팀은 승격팀이 빠진 리그로
      for (let j = 0; j < rel.length; j++) {
        const [rid, ul] = rel[j], [pid, dl] = pro[j] || [];
        if (!pid) break;
        ul.clubs = ul.clubs.filter(x => x !== rid).concat(pid); w.clubs[pid].lg = ul.id; moves[pid] = 1.4;
        dl.clubs = dl.clubs.filter(x => x !== pid).concat(rid); w.clubs[rid].lg = dl.id; moves[rid] = -2.2;
      }
    }
  }
  // 1군이 2군과 같은 등급 이하로 떨어지면 2군도 한 단계 내려간다 (아래 리그 1위와 자리 교환)
  for (const id in w.clubs) { const b = w.clubs[id]; if (!b.parent || !b.lg) continue; const p = w.clubs[b.parent], bl = w.lg[b.lg], pl = p && w.lg[p.lg]; if (!pl || !bl || pl.nation !== bl.nation || pl.tier < bl.tier) continue;
    const low = Object.values(w.lg).filter(l => l.nation === bl.nation && l.tier === bl.tier + 1); if (!low.length) continue;
    const L2 = low[0], sw = L2.clubs.map(x => w.clubs[x]).filter(c => c && !c.parent).sort((a, c) => c.str - a.str)[0]; if (!sw) continue;
    bl.clubs = bl.clubs.filter(x => x !== id).concat(sw.id); sw.lg = bl.id; L2.clubs = L2.clubs.filter(x => x !== sw.id).concat(id); b.lg = L2.id; moves[id] = (moves[id] || 0) - 1; moves[sw.id] = (moves[sw.id] || 0) + 1.4; }
  return moves;
}
C.applyPromotion = applyPromotion;
// ---------- 감독 ----------
// 구단마다 감독 한 명 (게임 시작 시점부터 기록). 경질·교체되면 w.mgrH[구단]에 재임 기록을 남긴다
const MGRNAT = ['ESP', 'ITA', 'GER', 'POR', 'ENG', 'FRA', 'NED', 'ARG', 'BRA'];
const pd = t => { const [y, m, d] = String(t).split('-').map(Number); return C.day(y, m, d); };
// 감독이 구단을 옮겨도 따라가는 값 (사람 자체의 정보)
const KEEP = ['n', 'nat', 'b', 'f', 'f2', 'build', 'def', 'q', 'r', 'rep', 'pc', 'lic', 'rh', 'tro'];
const carry = (src, dst) => { for (const k of KEEP) if (src[k] != null) dst[k] = Array.isArray(src[k]) ? src[k].slice() : src[k]; return dst; };
// 명성 단계 (FM식): 무명 · 지역적 · 국내적 · 대륙적 · 세계적
C.REPT = [[83, '세계적'], [65, '대륙적'], [45, '국내적'], [25, '지역적'], [0, '무명']];
C.mgrTier = rep => (C.REPT.find(t => rep >= t[0]) || C.REPT[4])[1];
C.PCN = { I: '국가대표 출신', P: '프로 선수 출신', S: '하부 리그 선수 출신', N: '선수 경력 거의 없음' };
const BIG5 = ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1'];
const lgPrest = (w, c) => { const L = c && c.lg && w.lg[c.lg]; if (!L) return .3; return BIG5.includes(c.lg) ? 1 : L.tier === 1 ? (C.confOf && C.confOf(L.nation) === 'UEFA' ? .65 : .5) : L.tier === 2 ? .4 : .25; };
// 구단이 원하는 감독 명성 (전력 기준): 최강팀 ≈ 85, 중위권 1부 ≈ 45~60, 하부 리그 ≈ 10~30
C.mgrWant = (w, c) => clamp(Math.round(18 + ((c && c.str || 60) - 60) * 2.4), 8, 92);
// 명성·실력·선수 경력·라이선스 채우기 (실제 감독은 data_mgr.js, 나머지는 이름 시드)
C.mgrFill = (w, M, c) => {
  if (!M) return M;
  if (M.rep == null) { const k = ((G.FC27 || {}).MGR_REP || {})[M.n];
    if (k) { M.rep = k[0]; M.pc = k[1]; M.r = 1; }
    else { const r = seeded('rep|' + M.n); M.rep = clamp(Math.round((c ? C.mgrWant(w, c) - 10 : 30) + (r() - .5) * 22), 3, 76); const u = r(); M.pc = u < .1 ? 'I' : u < .5 ? 'P' : u < .8 ? 'S' : 'N'; } }
  if (M.q == null) { const r = seeded('q|' + M.n); M.q = clamp(Math.round(((M.rep - 50) / 70 + (r() - .5) * .5) * 100) / 100, -.6, .7); }
  if (!M.lic) { const cf = C.confOf ? C.confOf(M.nat) : 'UEFA'; M.lic = `${cf} ${M.rep >= 38 || M.r ? 'Pro' : M.rep >= 20 ? 'A' : 'B'}`; }
  if (!M.rh) M.rh = [[w.year || 2026, M.rep]];
  return M;
};
const mkReal = (row, d0) => { const [n, nat, b, , f, build, def, q] = row; const M = { n, nat, b, d0, g: 0, w: 0, dr: 0, l: 0, r: 1 }; if (f) M.f = f; if (build) M.build = build; if (def) M.def = def; if (q != null) M.q = q; return M; };
const toPool = (w, M, id, d, dRep) => { const P = w.mgrFree = w.mgrFree || []; const fr = carry(M, { last: id, out: d }); if (dRep) fr.rep = clamp((fr.rep || 30) + dRep, 1, 99); P.push(fr); if (P.length > 120) { P.sort((a, b) => (b.rep || 0) - (a.rep || 0)); P.length = 110; } };
const mnews = (w, x) => { (w.mgrNews = w.mgrNews || []).push(x); if (w.mgrNews.length > 40) w.mgrNews.shift(); };
// 실제 감독 배치 (새 세계 / 예전 저장 파일은 한 번만 교체) + 무직 감독 시장 + 시즌 중 실제 교체 일정
C.mgrSeed = (w, force) => {
  const F = G.FC27 || {}; if (!F.MGR || (w.mgrV >= 2 && !force)) return;
  w.mgr = w.mgr || {}; w.mgrH = w.mgrH || {};
  for (const id in F.MGR) { const c = w.clubs[id]; if (!c || c.lite) continue; const row = F.MGR[id];
    w.mgr[id] = C.mgrFill(w, Object.assign(mkReal(row, Math.min(pd(row[3]), w.cal ? w.cal.d : pd(row[3]))), { src: 1 }), c); }
  const used = new Set(Object.values(w.mgr).map(M => M.n)), later = new Set((F.MGR_CHG || []).filter(x => x[3]).map(x => x[3][0]));
  w.mgrFree = (F.MGR_FREE || []).filter(r => !used.has(r[0]) && !later.has(r[0])).map(r => { const [n, nat, b, f, build, def, q] = r; return C.mgrFill(w, { n, nat, b, f, build, def, q, r: 1, out: w.cal ? w.cal.d - 60 : 0 }); });
  w.mgrV = 2; w.mgrCi = 0;
  if (w.cal) C.mgrDaily({ w }, w.cal.d, true);
};
// 실제 교체 일정: 그날 원래 감독(데이터에서 온 감독)이 아직 그 자리에 있으면 일어난다
C.mgrDaily = (S, d, quiet) => {
  const w = S.w, F = G.FC27 || {}, L = F.MGR_CHG; if (!L || w.mgrV < 2) return;
  while ((w.mgrCi || 0) < L.length && pd(L[w.mgrCi][1]) <= d) {
    const [id, dt, why, row] = L[w.mgrCi++], M = w.mgr && w.mgr[id], c = w.clubs[id];
    if (!c || !M || !M.src) continue;
    const busy = row && Object.keys(w.mgr).some(k => w.mgr[k].n === row[0]);
    const old = M.n, d1 = pd(dt);
    const H = (w.mgrH[id] = w.mgrH[id] || []); H.push(Object.assign({}, M, { d1, why, club: id }));
    toPool(w, M, id, d1, why === '경질' ? -3 : 0);
    delete w.mgr[id];
    let N;
    if (row && !busy) { const P = w.mgrFree; const k = P.findIndex(x => x.n === row[0]); const prev = k >= 0 ? P.splice(k, 1)[0] : null; N = w.mgr[id] = C.mgrFill(w, Object.assign(prev ? carry(prev, {}) : {}, mkReal(row, Math.max(d1, pd(row[3]))), { src: 1 }), c); }
    else N = hire(w, id, d1, 0, old);
    if (!quiet && C.wn) C.wn.push(S, { d, gl: 1, c: 'sack', imp: (c.str || 0) >= 78 ? 3 : 2, h: `${c.name}, ${old} 감독 ${why}… 후임 ${N.n}`, s: `${C.natName(N.nat)} 출신 ${N.n} 감독(${C.mgrTier(N.rep)} 명성)이 지휘봉을 잡는다.`, cl: [id], lg: c.lg });
  }
};
C.mgrOf = (w, id, d) => {
  const c = w.clubs[id]; if (!c || c.lite) return null; w.mgr = w.mgr || {};
  let M = w.mgr[id];
  if (!M) { const nat = R() < .7 ? c.nat : pick(MGRNAT); const r = seeded('mb|' + id + '|' + (d || 0)); M = w.mgr[id] = { n: genName(nat), nat, b: (w.year || 2026) - 36 - Math.floor(r() * 28), d0: d != null ? d : (w.cal ? w.cal.d : 0), g: 0, w: 0, dr: 0, l: 0 }; }
  if (M.rep == null) C.mgrFill(w, M, c);
  return M;
};
// 감독 고르기: 구단이 원하는 명성(want) 근처에서, 무직 감독 → (빅클럽이면) 다른 구단 감독 영입 → 새 얼굴 순
// 세계적 감독은 작은 구단을 맡지 않는다 (무직이 길어질수록 눈높이를 낮춘다)
const fitScore = (x, want, c, d) => { const idle = x.out != null && d != null ? Math.max(0, (d - x.out) / 365) : 0; const hi = want + 22 + idle * 10;
  if ((x.rep || 0) > hi) return null; if ((x.rep || 0) < want - (want >= 60 ? 10 : 22)) return null;
  return -Math.abs((x.rep || 0) - (want + 6)) + (x.q || 0) * 10 + (x.nat === c.nat ? 4 : 0) + N(0, 4); };
function hire(w, id, d, depth, exclude) {
  const c = w.clubs[id], want = C.mgrWant(w, c), P = w.mgrFree = w.mgrFree || [];
  let best = null, bs = -1e9;
  for (const x of P) { if (x.n === exclude || x.last === id || (d != null && x.out != null && d - x.out < 14)) continue; const sc = fitScore(x, want, c, d); if (sc != null && sc > bs) { bs = sc; best = x; } }
  if (best) { P.splice(P.indexOf(best), 1); return (w.mgr[id] = C.mgrFill(w, carry(best, { d0: d != null ? d : (w.cal ? w.cal.d : 0), g: 0, w: 0, dr: 0, l: 0 }), c)); }
  // 빅클럽: 더 작은 구단에서 잘하는 감독을 데려온다
  if (want >= 52 && depth < 2) {
    let pb = null, ps = -1e9;
    const cf = C.confOf ? C.confOf(c.nat) : '';
    for (const k in w.mgr) { const M = w.mgr[k], oc = w.clubs[k]; if (!oc || k === id || M.n === exclude || oc.parent) continue; if (C.mgrWant(w, oc) > want - 8 || (d != null && d - (M.d0 || 0) < 120)) continue;
      if (C.confOf && C.confOf(oc.nat) !== cf) continue; // 같은 대륙 안에서만
      if ((M.rep || 0) < want - 8) continue; const sc = (M.rep || 0) + (M.q || 0) * 10 + (M.lastDelta || 0) * 20 + N(0, 3); if (sc > ps) { ps = sc; pb = k; } }
    if (pb && R() < .8) {
      const M = w.mgr[pb], oc = w.clubs[pb];
      (w.mgrH[pb] = w.mgrH[pb] || []).push(Object.assign({}, M, { d1: d, why: `${c.name} 부임`, club: pb }));
      delete w.mgr[pb];
      const N2 = w.mgr[id] = C.mgrFill(w, carry(M, { d0: d != null ? d : 0, g: 0, w: 0, dr: 0, l: 0, via: pb }), c);
      const rep2 = hire(w, pb, d, depth + 1, M.n);
      mnews(w, { d, k: 'rep', club: pb, n: rep2 && rep2.n, old: M.n, to: id });
      return N2;
    }
  }
  // 새 얼굴: 구단 수준보다 조금 낮은 명성의 지도자
  const nat = R() < .7 ? c.nat : pick(MGRNAT), r = seeded('mb|' + id + '|' + (d || 0));
  const M = { n: genName(nat), nat, b: (w.year || 2026) - 34 - Math.floor(r() * 24), d0: d != null ? d : (w.cal ? w.cal.d : 0), g: 0, w: 0, dr: 0, l: 0 };
  M.rep = clamp(Math.round(want - 12 + (r() - .5) * 14), 3, 72);
  return (w.mgr[id] = C.mgrFill(w, M, c));
}
// 감독 교체: 떠난 감독은 시장(w.mgrFree)으로, 새 감독은 hire()로
C.mgrChange = (w, id, d, why) => {
  const M = C.mgrOf(w, id, d); if (!M) return null;
  const H = (w.mgrH = w.mgrH || {})[id] = (w.mgrH[id] || []); H.push(Object.assign({}, M, { d1: d, why: why || '', club: id })); if (H.length > 25) H.shift();
  delete w.mgr[id];
  const pct = M.g ? (M.w * 3 + M.dr) / (M.g * 3) : 0;
  if (M.r || (M.rep || 0) >= 30 || (M.g >= 20 && pct > .45)) toPool(w, M, id, d, why === '경질' ? -3 : 0);
  return hire(w, id, d, 0, M.n);
};
// 리그 종료: 기대 순위(전력 순)보다 잘하면 명성·실력이 오르고, 못하면 내려간다. 우승·강등은 크게
C.mgrLeagueEnd = (w, lid, rows) => {
  const lg = w.lg[lid]; if (!lg || !w.mgr) return; const n = rows.length; if (n < 4) return;
  const exp = rows.map(r => r.id).sort((a, b) => ((w.clubs[b] || {}).str || 0) - ((w.clubs[a] || {}).str || 0));
  rows.forEach((r, pos) => {
    const M = w.mgr[r.id], c = w.clubs[r.id]; if (!M || !c) return; C.mgrFill(w, M, c);
    const ex = exp.indexOf(r.id), delta = (ex - pos) / n, lp = lgPrest(w, c);
    let g = delta * 12 * lp;
    if (pos === 0) g += lg.tier === 1 ? 2 + 6 * lp : 3;
    if (lg.tier === 1 && pos >= n - 3) g -= 4 * lp;
    if (lg.tier > 1 && pos <= 1) g += 2;
    if (g > 0) g *= Math.min(1, (100 - M.rep) / 35);
    M.rep = clamp(Math.round((M.rep + g) * 10) / 10, 1, 99);
    M.q = clamp(Math.round(((M.q || 0) + clamp(delta * .07, -.04, .04) - (M.b && (w.year - M.b) > 66 ? .02 : 0)) * 100) / 100, -.7, .75);
    M.lastDelta = Math.round(delta * 100) / 100;
    if (pos === 0) M.tro = (M.tro || 0) + 1;
    const rh = M.rh || (M.rh = []), y = w.year; if (rh.length && rh[rh.length - 1][0] === y) rh[rh.length - 1][1] = M.rep; else rh.push([y, M.rep]); if (rh.length > 40) rh.shift();
  });
};
// 컵·대륙 대회 우승
C.mgrTrophy = (w, id, kind, k) => {
  const M = w.mgr && w.mgr[id], c = w.clubs[id]; if (!M || !c) return; C.mgrFill(w, M, c);
  const g = kind === 'cont' ? (C.COMPS[k] && C.COMPS[k].tier === 1 ? (k === 'UCL' ? 9 : 5) : 3) : 2.5 * lgPrest(w, c);
  M.rep = clamp(Math.round((M.rep + g * Math.min(1, (100 - M.rep) / 30)) * 10) / 10, 1, 99); M.tro = (M.tro || 0) + 1;
};
// 해마다 (8월 1일): 무직 감독 명성 하락·은퇴, 성적 부진·눈높이 차이로 여름 교체, 오래 쉰 명장 재취업
C.mgrYear = (S, d) => {
  const w = S.w, P = w.mgrFree = w.mgrFree || [], out = [];
  for (const x of P.slice()) { C.mgrFill(w, x); const idle = x.out != null ? (d - x.out) / 365 : 0, age = x.b ? w.year - x.b : 55;
    if (idle > 1) x.rep = clamp((x.rep || 30) - 2, 1, 99);
    if (age >= 75 || idle > 4.5 || (age >= 69 && R() < .3)) { P.splice(P.indexOf(x), 1); if ((x.rep || 0) >= 72) out.push(['retire', x]); } }
  const moves = [];
  for (const id of Object.keys(w.mgr || {})) {
    const M = w.mgr[id], c = w.clubs[id]; if (!c || !c.lg || c.parent) continue; C.mgrFill(w, M, c);
    const want = C.mgrWant(w, c), ten = (d - (M.d0 || d)) / 365;
    let p = .03; if ((M.rep || 0) < want - 25) p += .2; if ((M.lastDelta || 0) < -.22) p += .25; if ((M.lastDelta || 0) > .1) p *= .3; if (M.r && ten >= 4 && (M.rep || 0) >= want) p *= .3;
    if (R() < p) moves.push(id);
  }
  // 오래 쉰 명장(명성 75+, 반년 이상): 부진한 큰 구단이 데려간다
  for (const x of P.filter(x => (x.rep || 0) >= 75 && x.out != null && d - x.out > 180).sort((a, b) => b.rep - a.rep)) {
    const ids = Object.keys(w.mgr).filter(k => { const c = w.clubs[k], M = w.mgr[k]; if (!c || !c.lg || moves.includes(k)) return false; const want = C.mgrWant(w, c); return want >= x.rep - 22 && want <= x.rep + 10 && (M.rep || 0) < x.rep - 10 && (M.lastDelta || 0) < .05; });
    if (ids.length && R() < .6) { const k = ids.sort((a, b) => (w.clubs[b].str || 0) - (w.clubs[a].str || 0))[0]; moves.push(k); x._pref = k; }
  }
  const res = [];
  for (const id of moves) { const c = w.clubs[id], old = w.mgr[id]; if (!old) continue;
    const pref = P.find(x => x._pref === id);
    const H = (w.mgrH[id] = w.mgrH[id] || []); H.push(Object.assign({}, old, { d1: d, why: (old.lastDelta || 0) < -.22 ? '성적 부진' : '계약 만료', club: id }));
    delete w.mgr[id]; if ((old.rep || 0) >= 30 || old.r) toPool(w, old, id, d, 0);
    let N; if (pref) { P.splice(P.indexOf(pref), 1); delete pref._pref; N = w.mgr[id] = C.mgrFill(w, carry(pref, { d0: d, g: 0, w: 0, dr: 0, l: 0 }), c); } else N = hire(w, id, d, 0, old.n);
    res.push([id, old, N]); }
  for (const x of P) delete x._pref;
  return { res, out };
};
// 감독 한 명의 경력 (이름 기준): 지난 재임 + 현재 + 시장
C.mgrCareer = (w, name) => {
  const st = []; for (const id in (w.mgrH || {})) for (const m of w.mgrH[id]) if (m.n === name) st.push(Object.assign({ club: id }, m));
  let cur = null; for (const id in (w.mgr || {})) if (w.mgr[id].n === name) { cur = Object.assign({ club: id }, w.mgr[id]); st.push(cur); }
  const free = (w.mgrFree || []).find(x => x.n === name) || null;
  st.sort((a, b) => (a.d0 || 0) - (b.d0 || 0));
  const base = cur || free || st[st.length - 1] || null; if (base) C.mgrFill(w, base, cur ? w.clubs[cur.club] : null);
  return { st, cur, free, base };
};
// 감독 이름 목록 (검색용)
C.mgrAll = w => { const m = new Map(); for (const id in (w.mgrH || {})) for (const x of w.mgrH[id]) m.set(x.n, { n: x.n, nat: x.nat }); for (const x of w.mgrFree || []) m.set(x.n, { n: x.n, nat: x.nat }); for (const id in (w.mgr || {})) m.set(w.mgr[id].n, { n: w.mgr[id].n, nat: w.mgr[id].nat, club: id }); return [...m.values()]; };

// ---------- 더비·관중 ----------
const DERBY = [['ENG_MUN', 'ENG_MCI', '맨체스터 더비'], ['ENG_LIV', 'ENG_EVE', '머지사이드 더비'], ['ENG_ARS', 'ENG_TOT', '북런던 더비'], ['ENG_LIV', 'ENG_MUN', '노스웨스트 더비'], ['ENG_NEW', 'ENG_SUN', '타인위어 더비'],
  ['ESP_RMA', 'ESP_BAR', '엘 클라시코'], ['ESP_RMA', 'ESP_ATM', '마드리드 더비'], ['ESP_SEV', 'ESP_BET', '세비야 더비'], ['ESP_ATH', 'ESP_RSO', '바스크 더비'],
  ['ITA_INT', 'ITA_MIL', '밀라노 더비'], ['ITA_ROM', 'ITA_LAZ', '로마 더비'], ['ITA_JUV', 'ITA_TOR', '토리노 더비'], ['ITA_JUV', 'ITA_INT', '이탈리아 더비'], ['ITA_GEN', 'ITA_SAM', '제노바 더비'],
  ['GER_BVB', 'GER_S04', '레비어 더비'], ['GER_FCB', 'GER_BVB', '데어 클라시커'], ['GER_HSV', 'GER_SVW', '북부 더비'],
  ['FRA_PSG', 'FRA_OM', '르 클라시크'], ['FRA_ASM', 'FRA_NIC', '코트다쥐르 더비'], ['POR_SLB', 'POR_SCP', '리스본 더비'], ['POR_FCP', 'POR_SLB', '오 클라시쿠'],
  ['NED_AJA', 'NED_FEY', '더 클라시커'], ['SCO_CEL', 'SCO_RAN', '올드 펌 더비'], ['TUR_GS', 'TUR_FB', '인터콘티넨탈 더비'], ['ARG_BOC', 'ARG_RIV', '수페르클라시코']];
const DMAP = new Map(); for (const [a, b, n] of DERBY) { DMAP.set(a + '|' + b, n); DMAP.set(b + '|' + a, n); }
C.derbyOf = (a, b) => DMAP.get(a + '|' + b) || null;
// 관중 (추정): 홈 구단 규모(수입·전력)로 경기장 크기를 어림하고, 상대·대회 비중에 따라 채운다
C.attend = (w, home, away, key, big) => {
  const c = w.clubs[home]; if (!c) return 0;
  const rev = c.rev || 2e7, cap = Math.round(Math.max(2500, Math.min(81000, 3500 + Math.sqrt(rev / 1e6) * 5200)) / 100) * 100;
  const r = seeded('att|' + key)(), o = w.clubs[away], pull = o ? clamp(((o.str || 60) - (c.str || 60)) * .01, -.08, .1) : 0;
  const fill = C.derbyOf(home, away) || big ? .99 : clamp(.74 + (c.lg && w.lg[c.lg] && w.lg[c.lg].tier === 1 ? .14 : 0) + pull + r * .1, .35, .995);
  return Math.round(cap * fill / 10) * 10;
};


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
