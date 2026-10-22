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
C.natName = natName; C.NAT = NAT; C.START_YEAR = START_YEAR;

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
  // 지난 시즌 순위 대용: 전력순
  for (const id in w.lg) { const l = w.lg[id]; w.last[id] = l.clubs.slice().sort((a, b) => w.clubs[b].str - w.clubs[a].str); }
  return w;
}
C.buildWorld = buildWorld;
function pName(w, e) { return typeof e[0] === 'number' ? F.P[e[0]][1] : e[0]; }
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
    const age = st ? rint(21, 31) : rint(18, 33);
    const o = clamp(Math.round(N(st ? c.str + .5 : c.str - 5, st ? 2.5 : 3.5)), 38, 92);
    const nat = genNat(c.nat);
    return [genName(nat), pos, o, age, age < 24 ? o + rint(0, 6) : o, nat];
  });
  c.lite = false; c.str = xiStrength(c.sq);
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
const MINPOS = { GK: 3, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 2, LW: 1, RW: 1, LM: 1, RM: 1, ST: 3 };
function ageSquad(c) {
  const out = [];
  for (const e of c.sq) {
    const age = e[3] + 1; let o = e[2], pot = e[4];
    // 유망주가 모두 잠재력을 채우지는 못한다: 매년 잠재력이 조금씩 깎인다
    if (age >= 19 && pot > o) pot = Math.max(o, pot - rnd(0, 1.8));
    if (age <= 20) o += pot > o ? (pot - o) * rnd(.1, .38) + N(.3, 1.2) : N(0, 1.2);
    else if (age <= 23) o += pot > o ? (pot - o) * rnd(.1, .33) + N(0, 1.1) : N(0, 1.2);
    else if (age <= 28) o += N(0, 1.1);
    else if (age <= 30) o += N(-.6, 1.2);
    else o -= (age - 30) * rnd(.5, 1.4) + rnd(0, 1);
    o = clamp(Math.round(o), 40, 94);
    const retire = (age >= 33 && R() < (age - 32) * .2) || (age >= 30 && o < c.pres - 15 && R() < .35) || age >= 40;
    const leave = !retire && R() < .07; // 다른 팀으로 떠남 (단순화)
    if (!retire && !leave) out.push([e[0], e[1], o, age, Math.max(pot, o), e[5]]);
  }
  c.sq = out;
}
function refillSquad(c, w) {
  const cnt = {}; for (const e of c.sq) cnt[e[1]] = (cnt[e[1]] || 0) + 1;
  const sign = (pos, lv, young) => {
    const nat = genNat(c.nat);
    const age = young ? rint(17, 19) : rint(20, 30);
    const o = clamp(Math.round(young ? N(lv - 13, 3.5) : N(lv - 2.5, 3)), 42, 92);
    const pot = young ? clamp(Math.round(N(lv + 1, 5)), o + 2, 95) : o + (age < 24 ? rint(0, 5) : 0);
    c.sq.push([genName(nat), pos, o, age, pot, nat]);
  };
  for (const pos in MINPOS) while ((cnt[pos] || 0) < MINPOS[pos]) { sign(pos, c.pres, R() < .3); cnt[pos] = (cnt[pos] || 0) + 1; }
  // 전력이 목표보다 낮으면 보강
  for (let t = 0; t < 4; t++) {
    const s = xiStrength(c.sq); if (s >= c.pres - .8) break;
    const posList = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    const pos = pick(posList); sign(pos, Math.min(c.pres + 2, 87), false);
  }
  // 정원 초과 시 약한 선수 정리
  while (c.sq.length > 30) { let mi = 0; c.sq.forEach((e, i) => { if (e[2] - (e[3] < 21 ? 6 : 0) < c.sq[mi][2] - (c.sq[mi][3] < 21 ? 6 : 0)) mi = i; }); c.sq.splice(mi, 1); }
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
  for (const id in w.clubs) {
    const c = w.clubs[id];
    // 명성: 기본값 쪽으로 회귀 + 성적 반영
    let d = (c.base - c.pres) * .1 + N(0, .45) + ((results && results[id]) || 0);
    c.pres = clamp(c.pres + d, 38, 90);
    if (c.lite) { c.str = Math.round((c.pres + N(0, .6)) * 10) / 10; continue; }
    ageSquad(c); refillSquad(c, w);
  }
  normalizeWorld(w);
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.lite) c.str = xiStrength(c.sq); }
  w.year++;
}
C.advanceWorld = advanceWorld;

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
function addResult(t, a, b, ga, gb) {
  const A = t[a], B = t[b]; if (!A || !B) return;
  A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
  if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (ga < gb) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
}
function sortTable(t) { return Object.values(t).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || R() - .5); }
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
