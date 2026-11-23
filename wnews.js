// Road to Legend — 세계 뉴스: 경기(해트트릭·난타전·대승·이변·빅매치·결승), 순위(감독 경질·무패 행진·조기 우승),
// 기록(리그 최다골·최다 승점·무패 우승·세계 기록), 이적(오피셜·루머), 인터뷰, 가십, 시상을 날짜별로 쌓는다
(function (G) {
'use strict';
const C = G.TC;
const { R, pick, rint } = C;
const NEWSLG = new Set(['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BEL', 'TUR', 'SCO', 'BRA', 'ARG', 'USA', 'KOR', 'JPN', 'KSA', 'MEX']);
const BIG5 = ['ENG', 'ESP', 'ITA', 'GER', 'FRA'];
const MAX = 1500;
// 실제 기록 (게임 속 기록이 이를 넘으면 신기록)
const REC0 = {
  lgG: { ENG: [36, 'Erling Haaland', '2022/23'], ESP: [50, 'Lionel Messi', '2011/12'], ITA: [36, 'Ciro Immobile', '2019/20'], GER: [41, 'Robert Lewandowski', '2020/21'], FRA: [44, 'Josip Skoblar', '1970/71'] },
  lgP: { ENG: [100, 'Manchester City', '2017/18'], ESP: [100, 'Real Madrid', '2011/12'], ITA: [102, 'Juventus', '2013/14'], GER: [91, 'Bayern München', '2012/13'], FRA: [96, 'Paris Saint-Germain', '2015/16'] },
  lgM: { ENG: [9, 'Manchester United 9-0 Ipswich Town', '1994/95'], ESP: [10, 'Athletic Club 12-1 Barcelona', '1930/31'], ITA: [9, 'Inter 9-0 Fiorentina 외', '1960/61'], GER: [11, 'Mönchengladbach 12-0 Dortmund', '1977/78'], FRA: [9, 'PSG 9-0 Guingamp 외', '2018/19'] },
  ucl: [17, 'Cristiano Ronaldo', '2013/14'],
  wc: [13, 'Just Fontaine', '1958'],
  all: [73, 'Lionel Messi', '2011/12']
};
const meta = w => { const m = w.nmeta || (w.nmeta = { sack: {}, rum: {}, unb: {}, cl: {}, rw: {}, q: [], tq: [] }); if (!m.rec) m.rec = JSON.parse(JSON.stringify(REC0)); return m; };
// 하루에 같은 종류 기사가 너무 많이 쌓이지 않도록 (중요 기사 imp 3은 예외)
const CAP = { result: 3, interview: 2, gossip: 1, rumor: 4, hat: 3, rout: 2, thriller: 2, upset: 3, transfer: 6, injury: 3, streak: 3, stat: 6 };
let DAYC = { d: -1, w: null, n: {} };
function push(S, n) {
  const w = S.w, L = w.news || (w.news = []);
  if (n.d == null) n.d = w.cal ? w.cal.d : 0;
  if (DAYC.d !== n.d || DAYC.w !== w) DAYC = { d: n.d, w, n: {} };
  const cap = CAP[n.c];
  if (cap && (n.imp || 1) < 3 && (DAYC.n[n.c] || 0) >= cap) return;
  // 같은 주제(dk)는 일정 기간 한 번만
  if (n.dk) { const m = meta(w); m.dk = m.dk || {}; const last = m.dk[n.dk]; if (last != null && n.d - last < (n.dkd || 21)) return; m.dk[n.dk] = n.d; delete n.dkd; }
  DAYC.n[n.c] = (DAYC.n[n.c] || 0) + 1;
  n.id = (w.newsSeq = (w.newsSeq || 0) + 1);
  L.push(n);
  if (L.length > MAX + 40) L.splice(0, L.length - MAX);
}
// 같은 문장이 연달아 나오지 않게 고른다 (최근에 쓴 것 제외)
const RECENT = {};
function pv(key, arr) { const r = RECENT[key] || (RECENT[key] = []); const pool = arr.map((x, i) => i).filter(i => !r.includes(i)); const i = (pool.length ? pool : arr.map((x, j) => j))[Math.floor(R() * (pool.length || arr.length))]; r.push(i); while (r.length > Math.min(arr.length - 1, Math.ceil(arr.length * .6))) r.shift(); return arr[i]; }
const cn = (w, id) => (w.clubs[id] || {}).name || '';
// 조사: 마지막 글자 받침에 따라 (한글이 아니면 앞의 것)
const jo = (t, a, b) => { const ch = String(t).trim().slice(-1), c = ch.charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) return t + ((c - 0xAC00) % 28 ? b : a); return t + a; };
const pn = pid => C.MD.nameOf(pid);
const real = pid => pid && pid !== 'ME' && pid[0] !== '~';
const NOTE = new Map();
function lgNote(w, id) { let v = NOTE.get(id); if (v == null) { const lg = w.lg[id]; v = !!(lg && lg.tier === 1 && NEWSLG.has(lg.nation)); NOTE.set(id, v); } return v; }
const strOf = (w, x, id, side) => x.nat ? (side ? x.sb : x.sa) || 60 : (w.clubs[id] || {}).str || 60;

// ---------- 인터뷰·가십 문장 ----------
const Q = {
  hat: ['팀 동료들이 다 만들어 준 골입니다. 공은 집에 가져가야죠.', '세 번째 골이 들어가는 순간 소름이 돋았어요.', '오늘 같은 날은 자주 오지 않습니다. 즐기겠습니다.', '해트트릭보다 승점 3점이 더 기쁩니다.', '솔직히 두 번째 골 뒤에는 욕심이 났어요.', '부모님이 경기장에 오신 날이라 더 특별합니다.', '감독님이 믿어 주셔서 계속 슈팅할 수 있었어요.', '골키퍼에게 미안하네요. 오늘은 제 날이었습니다.'],
  win: ['계획대로 됐습니다. 하지만 아직 갈 길이 멉니다.', '전반부터 우리가 원하는 축구를 했어요.', '팬들의 응원이 큰 힘이 됐습니다.', '이런 경기를 이겨야 우승할 수 있습니다.', '모두가 한 발씩 더 뛰었습니다.', '상대가 강했지만 우리가 더 간절했어요.', '수비가 정말 단단했습니다. 오늘 승리는 수비진 몫이에요.', '라커룸 분위기가 최고입니다. 이 흐름을 이어가겠습니다.', '아직 아무것도 이룬 게 없습니다. 다음 경기가 더 중요해요.'],
  loss: ['변명의 여지가 없습니다. 팬들에게 미안합니다.', '오늘 같은 경기력으로는 아무것도 얻을 수 없어요.', '빨리 잊고 다음 경기를 준비하겠습니다.', '우리 스스로를 돌아봐야 할 때입니다.', '실점 장면들이 너무 쉬웠습니다. 훈련장에서 고쳐야죠.', '결과는 아프지만 시즌은 길어요.', '상대가 더 잘했습니다. 인정합니다.'],
  draw: ['이길 수 있었던 경기라 아쉽습니다.', '승점 1점도 소중합니다.', '마지막 패스 하나가 부족했어요.', '원정에서 지지 않은 건 나쁘지 않습니다.', '두 팀 모두 이기고 싶었던 경기였어요.'],
  upset: ['아무도 우리를 믿지 않았지만 우리는 서로를 믿었습니다.', '오늘 밤은 우리 도시 전체의 밤입니다.', '이게 축구죠. 공은 둥급니다.', '경기 전 라커룸에서 "왜 안 돼?"라고 서로 말했어요.', '강팀을 이기려면 90분 내내 완벽해야 합니다. 오늘 우리가 그랬어요.'],
  final: ['꿈꿔왔던 순간입니다. 평생 잊지 못할 밤이에요.', '이 트로피는 우리를 믿어 준 모든 사람의 것입니다.', '말로 표현할 수가 없네요. 그냥 행복합니다.'],
  rout: ['골이 계속 들어가니 멈출 이유가 없었죠.', '상대를 존중합니다. 우리는 그냥 우리 축구를 했을 뿐입니다.', '전반에 일찍 골이 나와서 경기가 쉬워졌어요.', '오늘은 모든 슈팅이 들어가는 날이었습니다.'],
  streak: ['연승은 신경 쓰지 않습니다. 다음 경기만 봅니다.', '선수들이 서로를 믿고 있어요. 그게 비결입니다.', '이 흐름이 언젠가 끊기겠지만 오늘은 아닙니다.'],
  slump: ['지금은 결과로 말할 수밖에 없습니다.', '모두가 책임감을 느끼고 있어요.', '팬들께 죄송합니다. 반드시 반등하겠습니다.'],
  inj: ['빨리 돌아오겠습니다. 동료들을 믿어요.', '힘든 시간이지만 더 강해져서 돌아오겠습니다.', '응원해 주신 모든 분께 감사드립니다.']
};
const GOSSIP = [
  p => `${p}, 휴식일에 동료들과 볼링장 나들이 포착`, p => `${p}의 새 헤어스타일, SNS에서 화제`, p => `${p}, 개인 유튜브 채널 개설… 하루 만에 구독자 100만`,
  p => `${p}, 훈련장에 새 슈퍼카 몰고 등장`, p => `${p}, 어린이 병원 깜짝 방문`, p => `${p}, 새 축구화 스폰서 계약 체결`,
  p => `${p} 사인회에 팬 수천 명 몰려`, p => `${p}, 다큐멘터리 촬영 중… 구단 일상 공개 예정`, p => `${p}, 훈련 중 동료와 신경전… 구단 "별일 아니다"`,
  p => `${p}, 자선 경기 출전 약속`, p => `${p}, 휴가지에서 유소년 팀 훈련 참관`, p => `${p}, 게임 대회 출전해 결승 진출`,
  p => `${p}, 경기 전 루틴 공개 "양말은 꼭 왼쪽부터"`, p => `${p}, 고향 팀에 훈련장 기증`, p => `${p}, 요리 실력 공개… 동료들 "셰프급"`
];
function interview(S, x, pid, side, kind) {
  const w = S.w, team = side ? x.b : x.a;
  push(S, { c: 'interview', imp: x.k === 'I' || x.fin ? 2 : 1, h: `[인터뷰] ${pn(pid)} "${pv('q' + kind, Q[kind])}"`, s: `${compName(w, x)} ${x.stage || ''} · ${tn(w, x, x.a)} ${x.ga}-${x.gb} ${tn(w, x, x.b)}`, p: [pid], cl: x.nat ? [] : [team], n: x.nat ? [team] : [], lg: x.k === 'L' ? x.comp : null, comp: x.k !== 'L' ? x.comp : null, ref: x.ref });
}
const tn = (w, x, id) => x.nat ? C.natName(id) : cn(w, id);
const compName = (w, x) => x.k === 'L' ? (w.lg[x.comp] || {}).name || '' : x.name || '';

// ---------- 경기 ----------
function match(S, x) {
  const w = S.w;
  let note = false, big = 0;
  if (x.k === 'L') note = lgNote(w, x.comp);
  else if (x.k === 'E') note = true;
  else if (x.k === 'I') note = true;
  else if (x.k === 'A') note = x.comp === 'UNL' || (x.sa || 0) >= 74 || (x.sb || 0) >= 74;
  else if (x.k === 'C') { const t1 = id => { const c = w.clubs[id], l = c && w.lg[c.lg]; return l && l.tier === 1; }; note = BIG5.includes(String(x.comp).split(':')[0]) && (t1(x.a) || t1(x.b)); }
  if (!note) return;
  const sa = strOf(w, x, x.a, 0), sb = strOf(w, x, x.b, 1);
  const lgN = x.k === 'L' ? (w.lg[x.comp] || {}).nation : null;
  const topComp = (x.k === 'L' && BIG5.includes(lgN)) || (x.k === 'E' && x.comp === 'UCL') || x.k === 'I' || (x.k === 'A' && x.comp === 'UNL');
  const tot = x.ga + x.gb, mg = Math.abs(x.ga - x.gb), wside = x.ga > x.gb ? 0 : x.gb > x.ga ? 1 : (x.pw ? (x.pw === x.a ? 0 : 1) : -1);
  const W = wside === 0 ? x.a : wside === 1 ? x.b : null, Lz = wside === 0 ? x.b : wside === 1 ? x.a : null;
  const base = { lg: x.k === 'L' ? x.comp : null, comp: x.k !== 'L' ? x.comp : null, ref: x.ref, cl: x.nat ? [] : [x.a, x.b], n: x.nat ? [x.a, x.b] : [] };
  const sub = `${compName(w, x)} ${x.stage || ''}`.trim();
  const sc = `${tn(w, x, x.a)} ${x.ga}-${x.gb} ${tn(w, x, x.b)}${x.pw ? ` (승부차기 ${tn(w, x, x.pw)} 승)` : ''}`;
  let n = 0;
  // 결승
  if (x.fin && W) { push(S, Object.assign({ c: 'champ', imp: 3, h: `${tn(w, x, W)}, ${compName(w, x)} 우승!`, s: `결승 ${sc}` }, base)); n++; const b = best(x.P[wside]); if (b) interview(S, x, b.id, wside, 'final'); }
  // 해트트릭
  for (let s = 0; s < 2; s++) for (const p of x.P[s] || []) if (p.g >= 3 && real(p.id) && (topComp || x.k === 'E' || p.g >= 4 || R() < .4)) {
    const t = s ? x.b : x.a;
    push(S, Object.assign({}, base, { c: 'hat', imp: topComp ? 2 : 1, h: hatH(pn(p.id), tn(w, x, s ? x.a : x.b), p.g), s: `${sub} · ${sc}`, p: [p.id] })); n++;
    if (R() < .4) interview(S, x, p.id, s, 'hat');
    if (x.k === 'E' && x.comp === 'UCL' && p.g >= 4) push(S, Object.assign({}, base, { c: 'record', imp: 2, h: `${pn(p.id)}, 챔피언스리그 한 경기 ${p.g}골`, s: sub, p: [p.id] }));
    void t;
  }
  // 기록적인 대승
  if (lgN && BIG5.includes(lgN)) { const m = meta(w), rc = m.rec.lgM[lgN]; if (rc && mg >= rc[0] && W) { push(S, Object.assign({ c: 'record', imp: 3, h: `역대 최다 점수 차! ${tn(w, x, W)} ${Math.max(x.ga, x.gb)}-${Math.min(x.ga, x.gb)} ${tn(w, x, Lz)}`, s: `${(w.lg[x.comp] || {}).name} 최다 점수 차 기록 (종전 ${rc[0]}골 차 · ${rc[1]}, ${rc[2]})` }, base)); m.rec.lgM[lgN] = [mg, sc, x.ref && x.ref.sl || '']; n++; } }
  if (n < 2 && mg >= 5 && W) { push(S, Object.assign({ c: 'rout', imp: mg >= 7 || topComp ? 2 : 1, h: pv('rout', ROUTH)(tn(w, x, W), tn(w, x, Lz), `${Math.max(x.ga, x.gb)}-${Math.min(x.ga, x.gb)}`, mg), s: sub }, base)); n++; if (R() < .25) { const b = best(x.P[wside]); if (b) interview(S, x, b.id, wside, 'rout'); } }
  if (n < 2 && (tot >= 7 || (tot >= 6 && mg <= 1))) { push(S, Object.assign({ c: 'thriller', imp: topComp ? 2 : 1, h: pv('thr', THRH)(sc, tot), s: sub }, base)); n++; }
  // 이변
  if (n < 2 && W && (x.k !== 'C' || mg >= 1)) { const sw = wside ? sb : sa, sl = wside ? sa : sb; if (sl - sw >= (x.k === 'L' ? 10 : 8)) { push(S, Object.assign({ c: 'upset', imp: topComp || x.k === 'E' ? 2 : 1, h: pv('ups', UPSH)(tn(w, x, W), tn(w, x, Lz)), s: `${sub} · ${sc}` }, base)); n++; if (R() < .45) { const b = best(x.P[wside]); if (b) interview(S, x, b.id, wside, 'upset'); } } }
  // 빅매치 결과
  big = sa >= (x.nat ? 78 : 80) && sb >= (x.nat ? 78 : 80);
  if (!n && big && (topComp || x.k === 'E')) {
    const b = best((x.P[0] || []).concat(x.P[1] || []));
    push(S, Object.assign({ c: 'result', imp: x.k === 'E' && /결승|4강|준결승/.test(x.stage || '') ? 2 : 1, h: bigH(w, x, sc, wside, b), s: `${sub}${b ? ` · 최고 평점 ${pn(b.id)} ${b.rt.toFixed(1)}` : ''}`, p: b ? [b.id] : [] }, base));
    if (R() < .3 && wside >= 0) { const bw = best(x.P[wside]), bl = best(x.P[1 - wside]); if (R() < .6 && bw) interview(S, x, bw.id, wside, 'win'); else if (bl) interview(S, x, bl.id, 1 - wside, 'loss'); }
    else if (R() < .2 && wside < 0 && b) interview(S, x, b.id, (x.P[0] || []).includes(b) ? 0 : 1, 'draw');
  }
}
// 제목 문형 (같은 문형이 반복되지 않게 돌려 쓴다)
const hatH = (p, opp, g) => g >= 5 ? `${p}, ${opp}전 ${g}골 폭발` : g === 4 ? pv('h4', [x => `${x}, ${opp}전 포트트릭`, x => `${x} 혼자 4골… ${opp} 무너뜨려`, x => `4골 원맨쇼! ${x}`])(p) : pv('h3', [x => `${x}, ${opp}전 해트트릭`, x => `${x} 해트트릭… ${opp} 격파 앞장`, x => `${opp} 상대로 세 번 웃은 ${x}`, x => `해트트릭 ${x}, 경기 지배`, x => `${x}의 날, ${opp}전 3골`])(p);
const ROUTH = [(a, b, s, m) => `${a}, ${b}에 ${s} ${m >= 7 ? '기록적인 대승' : '대승'}`, (a, b, s) => `${a} 골 폭풍… ${b} ${s} 대파`, (a, b, s) => `${b} 굴욕, ${a}에 ${s} 완패`, (a, b, s) => `${s}! ${a}, ${b} 상대로 화력 시위`, (a, b, s) => `${a}의 일방적인 경기, ${b}에 ${s}`];
const THRH = [(sc, t) => `${sc}, ${t}골 난타전`, (sc, t) => `${t}골이 터진 밤… ${sc}`, (sc, t) => `롤러코스터 경기! ${sc}`, (sc) => `끝까지 알 수 없었다, ${sc}`, (sc, t) => `${sc} · 수비는 없었다, ${t}골 공방`];
const UPSH = [(a, b) => `이변! ${a}, ${b} 꺾었다`, (a, b) => `${a}의 반란… ${b} 잡았다`, (a, b) => `${b}, ${a}에 일격 당해`, (a, b) => `대이변, ${jo(a, '가', '이')} ${jo(b, '를', '을')} 무너뜨렸다`, (a, b) => `아무도 예상 못 한 결과… ${a} 승리, ${b} 충격패`];
function bigH(w, x, sc, ws, b) {
  if (ws < 0) return pv('bigd', [() => `빅매치 무승부: ${sc}`, () => `팽팽했던 빅매치, ${sc}`, () => `승자 없는 혈투, ${sc}`])();
  const W = ws ? x.b : x.a, Lz = ws ? x.a : x.b, s2 = `${Math.max(x.ga, x.gb)}-${Math.min(x.ga, x.gb)}`;
  return pv('bigw', [() => `빅매치: ${sc}`, () => `${tn(w, x, W)}, ${jo(tn(w, x, Lz), '와', '과')}의 빅매치 ${s2} 승리`, () => `${tn(w, x, Lz)} 잡은 ${tn(w, x, W)} (${s2})`, () => b ? `${pn(b.id)} 빛난 빅매치, ${sc}` : `빅매치: ${sc}`, () => `${tn(w, x, W)} 웃고 ${tn(w, x, Lz)} 울었다, ${s2}`])();
}
function best(list) { let b = null; for (const p of list || []) if (real(p.id) && p.min !== 0 && (!b || p.rt > b.rt)) b = p; return b; }

// ---------- 라운드가 끝날 때 (리그 순위) ----------
function round(S, LS, d, h) {
  const w = S.w; if (!lgNote(w, LS.id)) return;
  const lg = w.lg[LS.id], m = meta(w), ri = LS.ri, n = LS.dates.length;
  const rows = C.sortTable(LS.tb);
  if (!rows.length) return;
  // 감독 경질: 강팀이 기대보다 크게 처진 경우
  if (ri >= 8 && ri <= n - 4) {
    const byStr = lg.clubs.slice().sort((a, b) => ((w.clubs[b] || {}).str || 0) - ((w.clubs[a] || {}).str || 0));
    for (let ex = 0; ex < Math.min(6, byStr.length); ex++) {
      const id = byStr[ex], pos = rows.findIndex(r => r.id === id); if (pos < 0) continue;
      if (pos - ex < 6 || pos < 7 || m.sack[id] === LS.label || R() > .16) continue;
      m.sack[id] = LS.label;
      const r = rows[pos];
      const oldM = C.mgrOf ? (C.mgrOf(w, id, d) || {}).n : '', newM = C.mgrChange ? (C.mgrChange(w, id, d, '경질') || {}).n : '';
      push(S, { d, c: 'sack', imp: ex < 3 && BIG5.includes(lg.nation) ? 3 : 2, h: `${cn(w, id)}, ${oldM ? oldM + ' ' : ''}감독 경질… ${lg.name} ${pos + 1}위 부진`, s: `${ri}라운드까지 ${r.w}승 ${r.d}무 ${r.l}패 (승점 ${r.pts}). 구단은 "새로운 동력이 필요하다"고 밝혔다.`, cl: [id], lg: LS.id });
      m.q.push({ d: d + rint(2, 6), n: { c: 'sack', imp: 1, h: `${cn(w, id)}, ${newM ? newM + ' ' : '새 '}감독 선임 발표`, s: `시즌 도중 지휘봉을 잡은 새 감독은 "목표는 반등"이라고 말했다.`, cl: [id], lg: LS.id } });
    }
  }
  // 무패 행진
  if ([10, 15, 20, 25, 30].includes(ri)) for (const r of rows.slice(0, 4)) if (r.l === 0 && r.p >= ri - 1) {
    const k = r.id + ':' + LS.label + ':' + ri; if (m.unb[k]) continue; m.unb[k] = 1;
    push(S, { d, c: 'record', imp: ri >= 20 ? 3 : 2, h: `${cn(w, r.id)}, ${lg.name} ${r.p}경기 무패 행진`, s: `${r.w}승 ${r.d}무 · 승점 ${r.pts}${rows[0].id === r.id ? ' · 선두' : ''}`, cl: [r.id], lg: LS.id });
  }
  // 연승·연패 (이번 라운드 결과로 갱신)
  if (h && h.s && h.d) {
    const sk = LS.k + ':' + LS.label; m.stk = m.stk || {}; if (!m.stk[sk]) { for (const k in m.stk) if (k.startsWith(LS.k + ':')) delete m.stk[k]; m.stk[sk] = {}; }
    const T = m.stk[sk], pos = {}; rows.forEach((r, i) => pos[r.id] = i);
    const byStr = lg.clubs.slice().sort((a, b) => ((w.clubs[b] || {}).str || 0) - ((w.clubs[a] || {}).str || 0)), top6 = new Set(byStr.slice(0, 6));
    for (let i = h.d.length - 1; i >= 0 && h.d[i] >= d; i--) {
      if (h.d[i] !== d) continue;
      const [a0, b0, ga, gb] = h.s[i].split('.'), a = C.cidOf(w, C.MD.u62(a0)), b = C.cidOf(w, C.MD.u62(b0));
      for (const [id, gf, gaa, opp] of [[a, +ga, +gb, b], [b, +gb, +ga, a]]) {
        const t = T[id] || (T[id] = [0, 0, 0]); // 연승, 연패, 무승
        if (gf > gaa) { t[0]++; t[1] = 0; t[2] = 0; } else if (gf < gaa) { t[0] = 0; t[1]++; t[2]++; } else { t[0] = 0; t[1] = 0; t[2]++; }
        if ([6, 8, 10, 12, 15, 18].includes(t[0]) || t[0] > 18) push(S, { d, c: 'streak', imp: t[0] >= 10 ? 3 : 2, h: pv('ws', [() => `${cn(w, id)}, ${lg.name} ${t[0]}연승 질주`, () => `거침없는 ${cn(w, id)}, 어느새 ${t[0]}연승`, () => `${cn(w, id)} ${t[0]}연승… ${cn(w, opp)}도 막지 못했다`])(), s: `${ri}라운드 · ${pos[id] + 1}위 · ${gf}-${gaa} 승`, cl: [id], lg: LS.id, dk: 'ws:' + id + ':' + LS.label + ':' + t[0], dkd: 400 });
        if (top6.has(id) && (t[1] === 4 || t[1] === 6)) push(S, { d, c: 'streak', imp: 2, h: pv('ls', [() => `${cn(w, id)}, ${t[1]}연패 수렁`, () => `위기의 ${cn(w, id)}… ${t[1]}경기 연속 패배`, () => `${cn(w, id)} 충격의 ${t[1]}연패, ${pos[id] + 1}위까지 추락`])(), s: `${lg.name} ${ri}라운드 · ${cn(w, opp)}전 ${gf}-${gaa}`, cl: [id], lg: LS.id });
        else if (top6.has(id) && t[2] === 7) push(S, { d, c: 'streak', imp: 1, h: `${cn(w, id)}, 7경기째 승리 없음`, s: `${lg.name} ${pos[id] + 1}위`, cl: [id], lg: LS.id });
      }
    }
  }
  // 득점 돌파 (빅5: 20·30·40골)
  if (BIG5.includes(lg.nation) && h && h.agg) for (const pid in h.agg) { const g = h.agg[pid][4]; if (g < 20 || !real(pid)) continue; const th = g >= 40 ? 40 : g >= 30 ? 30 : 20;
    push(S, { d, c: 'stat', imp: th >= 30 ? 2 : 1, h: pv('gm', [() => `${pn(pid)}, 시즌 ${th}골 고지`, () => `${pn(pid)} ${lg.name} ${th}골 돌파`, () => `멈추지 않는 ${pn(pid)}, 벌써 ${g}골`])(), s: `${ri}라운드까지 ${h.agg[pid][1]}경기 ${g}골 ${h.agg[pid][5]}도움`, p: [pid], cl: [C.cidOf(w, h.agg[pid][0])], lg: LS.id, dk: 'gm:' + pid + ':' + LS.label + ':' + th, dkd: 400 }); }
  // 조기 우승 확정
  const left = n - ri;
  if (left > 0 && rows[1] && rows[0].pts - rows[1].pts > left * 3 && !m.cl[LS.k]) {
    m.cl[LS.k] = 1;
    push(S, { d, c: 'champ', imp: 3, h: `${cn(w, rows[0].id)}, ${lg.name} 조기 우승 확정`, s: `${left}경기를 남기고 2위 ${jo(cn(w, rows[1].id), '와', '과')} 승점 ${rows[0].pts - rows[1].pts}점 차`, cl: [rows[0].id], lg: LS.id });
  }
  // 득점 신기록 (빅5)
  if (BIG5.includes(lg.nation) && h && h.agg) {
    const rc = m.rec.lgG[lg.nation]; let bp = null, bg = 0;
    for (const pid in h.agg) { const g = h.agg[pid][4]; if (g > bg) { bg = g; bp = pid; } }
    const k = LS.k + ':' + LS.label;
    if (rc && bp && real(bp) && bg > rc[0] && m.rw[k] !== bp) {
      m.rw[k] = bp;
      push(S, { d, c: 'record', imp: 3, h: `${pn(bp)}, ${lg.name} 한 시즌 최다골 신기록 (${bg}골)`, s: `종전 기록 ${rc[0]}골 (${rc[1]}, ${rc[2]}) · ${n - ri}경기 남음`, p: [bp], cl: [C.cidOf(w, h.agg[bp][0])], lg: LS.id });
    }
  }
}
// ---------- 시즌·대회 마감 ----------
function lgEnd(S, LS, rows, agg) {
  const w = S.w; if (!lgNote(w, LS.id) || !rows.length) return;
  const lg = w.lg[LS.id], m = meta(w), r = rows[0], d = w.cal.d;
  if (!m.cl[LS.k]) push(S, { d, c: 'champ', imp: 3, h: `${cn(w, r.id)}, ${lg.name} ${LS.label} 우승`, s: `${r.w}승 ${r.d}무 ${r.l}패 · 승점 ${r.pts} · 2위 ${rows[1] ? cn(w, rows[1].id) : ''}`, cl: [r.id], lg: LS.id });
  delete m.cl[LS.k];
  if (r.l === 0) push(S, { d, c: 'record', imp: 3, h: `무패 우승! ${cn(w, r.id)}, ${lg.name} ${r.p}경기 무패`, s: `${r.w}승 ${r.d}무 · 승점 ${r.pts}`, cl: [r.id], lg: LS.id });
  if (BIG5.includes(lg.nation)) {
    const rp = m.rec.lgP[lg.nation];
    if (rp && r.pts > rp[0]) { push(S, { d, c: 'record', imp: 3, h: `${cn(w, r.id)}, ${lg.name} 최다 승점 신기록 (${r.pts}점)`, s: `종전 ${rp[0]}점 (${rp[1]}, ${rp[2]})`, cl: [r.id], lg: LS.id }); m.rec.lgP[lg.nation] = [r.pts, cn(w, r.id), LS.label]; }
    let bp = null, bg = 0; for (const pid in agg) { const g = agg[pid][4]; if (g > bg) { bg = g; bp = pid; } }
    const rg = m.rec.lgG[lg.nation]; if (rg && bp && real(bp) && bg > rg[0]) m.rec.lgG[lg.nation] = [bg, pn(bp), LS.label];
  }
  // 득점왕
  let top = null; for (const pid in agg) if (real(pid) && (!top || agg[pid][4] > agg[top][4])) top = pid;
  if (top && agg[top][4] > 0) push(S, { d, c: 'award', imp: 1, h: `${pn(top)}, ${lg.name} 득점왕 (${agg[top][4]}골)`, s: `${cn(w, C.cidOf(w, agg[top][0]))} · ${agg[top][1]}경기 ${agg[top][5]}도움`, p: [top], lg: LS.id });
  seasonStats(S, LS, lg, rows, agg, top);
  // 강등
  const tiers = Object.values(w.lg).filter(l => l.nation === lg.nation).length;
  if (tiers > 1 && rows.length >= 10) { const rel = rows.slice(-3).map(x => x.id); push(S, { d, c: 'result', imp: 1, h: `${rel.map(id => cn(w, id)).join(', ')} 강등`, s: `${lg.name} ${LS.label} 최종 순위 하위 3팀`, cl: rel, lg: LS.id }); }
}
// 시즌 세부 기록: 도움왕, 득점·도움 석권, 최다 득점·최소 실점 팀, 클린시트, 평점 1위, 우승 경쟁, 연속 우승, 기록 경신
// 기록 경신은 실제 리그 기록(알려진 것만)과 비교하고, 실제 기록이 없는 항목은 게임 시작 이후 기록과 비교한다
const RECX = {
  W: { ENG: [32, 'Manchester City 외', '2017/18'], ESP: [32, 'Real Madrid 외', '2011/12'], ITA: [33, 'Juventus', '2013/14'], GER: [29, 'Bayern München', '2012/13'], FRA: [30, 'Paris Saint-Germain', '2015/16'] },
  GF: { ENG: [106, 'Manchester City', '2017/18'], ESP: [121, 'Real Madrid', '2011/12'], GER: [101, 'Bayern München', '1971/72'] },
  GA: { ENG: [15, 'Chelsea', '2004/05'], GER: [17, 'Bayern München', '2015/16'] },
  A: { ENG: [20, 'Thierry Henry 외', '2002/03'], ESP: [21, 'Lionel Messi', '2019/20'], GER: [21, 'Thomas Müller', '2019/20'] }
};
function seasonStats(S, LS, lg, rows, agg, topG) {
  const w = S.w, m = meta(w), d = w.cal.d, big = BIG5.includes(lg.nation), r0 = rows[0], r1 = rows[1];
  const base = { d, lg: LS.id, c: 'stat', imp: 1 };
  const P = pid => (w.ps || {})[pid];
  // 도움왕
  let ta = null; for (const pid in agg) if (real(pid) && (!ta || agg[pid][5] > agg[ta][5] || (agg[pid][5] === agg[ta][5] && agg[pid][4] > agg[ta][4]))) ta = pid;
  if (ta && agg[ta][5] > 0) {
    if (ta === topG) push(S, Object.assign({}, base, { c: 'award', imp: 2, h: `${pn(ta)}, ${lg.name} 득점왕·도움왕 석권`, s: `${agg[ta][4]}골 ${agg[ta][5]}도움 · ${cn(w, C.cidOf(w, agg[ta][0]))}`, p: [ta] }));
    else push(S, Object.assign({}, base, { c: 'award', h: `${pn(ta)}, ${lg.name} 도움왕 (${agg[ta][5]}도움)`, s: `${cn(w, C.cidOf(w, agg[ta][0]))} · ${agg[ta][1]}경기 ${agg[ta][4]}골`, p: [ta] }));
  }
  if (!big && !['POR', 'NED'].includes(lg.nation)) return;
  // 공격 포인트 40+ / 20골-20도움
  for (const pid in agg) { const g = agg[pid][4], a = agg[pid][5]; if (real(pid) && g >= 20 && a >= 15) push(S, Object.assign({}, base, { h: `${pn(pid)}, 시즌 ${g}골 ${a}도움… '${g >= 20 && a >= 20 ? '20-20' : '20-15'} 클럽'`, s: `${lg.name} ${LS.label} · 공격 포인트 ${g + a}`, p: [pid] })); }
  // 시즌 베스트 XI (빅5)
  if (big && C.calLeaders) { const bx = (C.calLeaders(S, LS, agg) || {}).bx; if (bx) push(S, Object.assign({}, base, { c: 'award', imp: 2, h: `${lg.name} ${LS.label} 시즌 베스트 XI`, s: bx.map(x => `${x[3]} ${x[0]}`).join(' · '), p: bx.map(x => x[4]).filter(Boolean), lgx: LS.id })); }
  // 최다 득점·최소 실점 팀
  const gfT = rows.slice().sort((a, b) => b.gf - a.gf)[0], gaT = rows.slice().sort((a, b) => a.ga - b.ga)[0];
  if (gfT) push(S, Object.assign({}, base, { h: `${lg.name} 최다 득점 팀은 ${cn(w, gfT.id)} (${gfT.gf}골)`, s: `경기당 ${(gfT.gf / Math.max(1, gfT.p)).toFixed(2)}골 · 최종 ${rows.indexOf(gfT) + 1}위`, cl: [gfT.id] }));
  if (gaT) push(S, Object.assign({}, base, { h: `${lg.name} 최소 실점 팀은 ${cn(w, gaT.id)} (${gaT.ga}실점)`, s: `${gaT.p}경기 · 최종 ${rows.indexOf(gaT) + 1}위`, cl: [gaT.id] }));
  // 클린시트 1위 골키퍼, 평점 1위 (15경기 이상)
  let gk = null, rt = null;
  for (const pid in agg) { if (!real(pid)) continue; const x = agg[pid], pp = P(pid); if (pp && pp.pos === 'GK' && (!gk || x[9] > agg[gk][9])) gk = pid; if (x[1] >= 15 && (!rt || x[8] / x[1] > agg[rt][8] / agg[rt][1])) rt = pid; }
  if (gk && agg[gk][9] >= 8) push(S, Object.assign({}, base, { h: `${pn(gk)}, ${lg.name} 클린시트 1위 (${agg[gk][9]}회)`, s: `${cn(w, C.cidOf(w, agg[gk][0]))} · ${agg[gk][1]}경기`, p: [gk] }));
  if (rt) push(S, Object.assign({}, base, { h: `${pn(rt)}, ${lg.name} 시즌 평점 1위 (${(agg[rt][8] / agg[rt][1] / 10).toFixed(2)})`, s: `${cn(w, C.cidOf(w, agg[rt][0]))} · ${agg[rt][1]}경기 ${agg[rt][4]}골 ${agg[rt][5]}도움`, p: [rt] }));
  // 우승 경쟁·연속 우승
  if (r0 && r1) {
    const gap = r0.pts - r1.pts;
    if (gap === 0) push(S, Object.assign({}, base, { c: 'record', imp: 3, h: `골득실로 갈린 우승! ${cn(w, r0.id)}, ${jo(cn(w, r1.id), '와', '과')} 승점 같았다`, s: `승점 ${r0.pts} · 골득실 ${r0.gf - r0.ga} 대 ${r1.gf - r1.ga}`, cl: [r0.id, r1.id] }));
    else if (gap <= 2) push(S, Object.assign({}, base, { c: 'record', imp: 2, h: `${cn(w, r0.id)}, 승점 ${gap}점 차로 ${lg.name} 우승`, s: `2위 ${cn(w, r1.id)} (승점 ${r1.pts})`, cl: [r0.id, r1.id] }));
    else if (gap >= 15) push(S, Object.assign({}, base, { h: `${cn(w, r0.id)}, 2위와 승점 ${gap}점 차 독주 우승`, s: `${lg.name} ${LS.label}`, cl: [r0.id] }));
  }
  const H = w.hist.lg[LS.id] || []; let k = 0; for (let i = H.length - 1; i >= 0 && H[i].c === r0.id; i--) k++;
  if (k >= 2) push(S, Object.assign({}, base, { c: 'record', imp: k >= 4 ? 3 : 2, h: `${cn(w, r0.id)}, ${lg.name} ${k}연패 달성`, s: `${H.slice(-k).map(x => x.y).join(' · ')}`, cl: [r0.id] }));
  else if (H.length >= 3 && !H.slice(0, -1).some(x => x.c === r0.id)) push(S, Object.assign({}, base, { c: 'record', imp: 2, h: `${cn(w, r0.id)}, 게임 시작 이후 첫 ${lg.name} 우승`, s: `${H.length - 1}시즌 동안 한 번도 정상에 서지 못했던 팀`, cl: [r0.id] }));
  else if (H.length >= 3) { let gapY = 0; for (let i = H.length - 2; i >= 0 && H[i].c !== r0.id; i--) gapY++; if (gapY >= 3) push(S, Object.assign({}, base, { c: 'record', imp: 2, h: `${cn(w, r0.id)}, ${gapY + 1}시즌 만의 ${lg.name} 우승`, s: LS.label, cl: [r0.id] })); }
  // 기록 경신 (빅5)
  if (!big) return;
  m.rx = m.rx || {}; const RX = m.rx[lg.nation] = m.rx[lg.nation] || {};
  const chk = (key, v, who, lowBetter, h0, unit, pid) => {
    const real0 = RECX[key] && RECX[key][lg.nation], g0 = RX[key];
    const better = (a, b) => lowBetter ? a < b : a > b;
    if (real0 && better(v, real0[0]) && (!g0 || better(v, g0[0]))) push(S, Object.assign({}, base, { c: 'record', imp: 3, h: `${who}, ${lg.name} ${h0} 신기록 (${v}${unit})`, s: `종전 실제 기록 ${real0[0]}${unit} (${real0[1]}, ${real0[2]})${g0 && !better(real0[0], g0[0]) ? '' : ''}`, cl: pid ? [] : [], p: pid ? [pid] : [] }));
    else if (!real0 && g0 && better(v, g0[0])) push(S, Object.assign({}, base, { c: 'record', imp: 2, h: `${who}, ${lg.name} ${h0} 기록 경신 (${v}${unit})`, s: `게임 시작 이후 최고 · 종전 ${g0[0]}${unit} (${g0[1]}, ${g0[2]})`, p: pid ? [pid] : [] }));
    if (!g0 || better(v, g0[0])) RX[key] = [v, who, LS.label];
  };
  chk('W', r0.w, cn(w, r0.id), false, '한 시즌 최다승', '승');
  if (gfT) chk('GF', gfT.gf, cn(w, gfT.id), false, '한 시즌 팀 최다 득점', '골');
  if (gaT) chk('GA', gaT.ga, cn(w, gaT.id), true, '한 시즌 최소 실점', '실점');
  if (ta) chk('A', agg[ta][5], pn(ta), false, '한 시즌 최다 도움', '도움', ta);
}
function cupEnd(S, st, sum) {
  const w = S.w; if (!sum || !['POR', 'NED', 'KOR', 'JPN', 'BRA', 'USA'].includes(st.nat)) return; // 빅5 컵 결승은 경기 기사로
  push(S, { c: 'champ', imp: 2, h: `${cn(w, sum.w)}, ${st.n} 우승`, s: `결승 상대 ${cn(w, sum.ru)}`, cl: [sum.w, sum.ru], comp: st.nat + ':' + st.kind });
}
function contEnd(S, cs, h) {
  const w = S.w; if (!cs.winner) return;
  const fr = (h.rows || []).filter(r => /결승/.test(r[0]) && !/준결승/.test(r[0])).pop();
  push(S, { c: 'champ', imp: cs.k === 'UCL' ? 3 : 2, h: `${cn(w, cs.winner)}, ${cs.name} 우승!`, s: fr ? `결승 ${cn(w, C.cidOf(w, fr[1]))} ${fr[3]}-${fr[4]} ${cn(w, C.cidOf(w, fr[2]))}` : cs.label, cl: [cs.winner], comp: cs.k, ref: fr ? { mk: 'E', sk: cs.k, ri: h.rows.indexOf(fr), d: fr[8], a: fr[1], b: fr[2] } : null });
  // 득점왕 (UCL 기록)
  let top = null; for (const pid in h.agg || {}) if (real(pid) && (!top || h.agg[pid][4] > h.agg[top][4])) top = pid;
  if (top) {
    const g = h.agg[top][4]; push(S, { c: 'award', imp: cs.k === 'UCL' ? 2 : 1, h: `${pn(top)}, ${cs.name} 득점왕 (${g}골)`, s: cs.label, p: [top], comp: cs.k });
    const m = meta(w); if (cs.k === 'UCL' && g > m.rec.ucl[0]) { push(S, { c: 'record', imp: 3, h: `${pn(top)}, 챔피언스리그 한 시즌 최다골 신기록 (${g}골)`, s: `종전 ${m.rec.ucl[0]}골 (${m.rec.ucl[1]}, ${m.rec.ucl[2]})`, p: [top], comp: 'UCL' }); m.rec.ucl = [g, pn(top), cs.label]; }
  }
}
function intlEnd(S, T, h) {
  const w = S.w;
  let top = null; for (const pid in h.agg || {}) if (real(pid) && (!top || h.agg[pid][4] > h.agg[top][4])) top = pid;
  if (top) { const g = h.agg[top][4]; push(S, { c: 'award', imp: 2, h: `${pn(top)}, ${T.n} 득점왕 (${g}골)`, s: `${T.y}`, p: [top], comp: T.k });
    const m = meta(w); if (T.k === 'WC' && g > m.rec.wc[0]) { push(S, { c: 'record', imp: 3, h: `세계 기록! ${pn(top)}, 월드컵 한 대회 최다골 (${g}골)`, s: `종전 ${m.rec.wc[0]}골 (${m.rec.wc[1]}, ${m.rec.wc[2]})`, p: [top], comp: 'WC' }); m.rec.wc = [g, pn(top), String(T.y)]; } }
}
// 연간 마감: 발롱도르·골든보이, 공식전 한 시즌 최다골 (세계 기록)
function yearEnd(S, bd) {
  const w = S.w; if (!bd) return;
  // 순위는 시상식 날 공개. 지금은 후보 명단만
  push(S, { gl: 1, c: 'award', imp: 2, h: `${w.year + 1} 발롱도르 후보 30인 발표`, s: `시상식 ${C.fmtDateY(C.cerDay(w.year + 1))} · ${bd.top.slice(0, 30).map(x => x.n).sort(() => R() - .5).slice(0, 5).join(', ')} 등` });
  const mx = bd.maxG, m = meta(w);
  if (mx && mx.g > m.rec.all[0]) { push(S, { c: 'record', imp: 3, h: `세계 기록! ${mx.n}, 공식전 한 시즌 ${mx.g}골`, s: `종전 ${m.rec.all[0]}골 (${m.rec.all[1]}, ${m.rec.all[2]}) · 클럽 공식전 기준`, p: mx.pid ? [mx.pid] : [], cl: [mx.cid] }); m.rec.all = [mx.g, mx.n, C.wLabel(w.year)]; }
}
// 시상식 날: 발롱도르·골든보이·골든슈 결과
function ceremony(S, c) {
  const w = S.w, b = (w.bdHist || []).find(x => x.y === c.y), g = (w.gbHist || []).find(x => x.y === c.y), gs = (w.gsHist || []).find(x => x.y === c.y), d = c.d;
  if (gs && gs.top[0]) { const x = gs.top[0]; push(S, { d, gl: 1, c: 'award', imp: 2, h: `${x[0]}, 유러피언 골든슈 수상`, s: `${x[3]}골 · ${x[4]}점 · ${(w.lg[x[5]] || {}).name || ''}`, p: x[2] ? [x[2]] : [], cl: [x[1]] }); }
  if (g && g.top[0]) { const x = g.top[0]; push(S, { d, gl: 1, c: 'award', imp: 2, h: `${x[0]}, ${c.y} 골든보이 수상`, s: `${x[6]}세 · ${(w.clubs[x[1]] || {}).name || ''}`, p: x[2] ? [x[2]] : [], cl: [x[1]] }); }
  const xi = (w.wxiHist || []).find(x => x.y === c.y);
  if (xi && xi.xi) push(S, { d, gl: 1, c: 'award', imp: 2, h: `${c.y} 월드 베스트 XI 발표`, s: xi.xi.map(x => `${x[3]} ${x[0]}`).join(' · '), p: xi.xi.map(x => x[4]).filter(Boolean) });
  if (b && b.top[0]) { const x = b.top[0]; push(S, { d, gl: 1, c: 'award', imp: 3, h: `${x[0]}, ${c.y} 발롱도르 수상!`, s: `2위 ${b.top[1] ? b.top[1][0] : ''} · 3위 ${b.top[2] ? b.top[2][0] : ''}`, p: x[2] ? [x[2]] : [], cl: [x[1]] });
    if (x[2] && R() < .8) push(S, { d, c: 'interview', imp: 2, h: `[인터뷰] ${x[0]} "${pick(['어릴 때부터 꿈꿔 온 트로피입니다. 동료들 덕분이에요.', '이 상은 우리 팀 모두의 것입니다.', '가족에게 이 트로피를 바칩니다. 내년에도 여기 서고 싶어요.'])}"`, s: `${c.y} 발롱도르 시상식`, p: [x[2]], cl: [x[1]] }); }
}
// ---------- 이적시장 ----------
function windowOpen(S, rows) {
  const w = S.w, m = meta(w);
  // 은퇴: 이름 있는 선수는 기사로
  const rets = rows.filter(r => r[3] === 'ret');
  if (rets.length) { const d0 = Math.min(...rets.map(r => r[10] != null ? r[10] : 1e9)); m.rq = { d: d0, n: rets.length, l: rets.filter(r => r[5] >= 74 || (r[5] >= 70 && r[6] >= 36)).sort((a, b) => b[5] - a[5]).slice(0, 10).map(r => [r[0], r[1], r[5], r[6]]) }; }
  m.tq = rows.filter(r => (r[3] === 'buy' || r[3] === 'loan' || r[3] === 'free') && (r[4] >= 3000 || r[5] >= 83) && r[10] != null).map(r => [r[10], r[0], r[1], r[2], r[3], r[4], r[5], r[6]]).sort((a, b) => a[0] - b[0]);
}
// ---------- 하루 ----------
let STARS = null, STARD = -99;
function day(S, d) {
  const w = S.w, m = meta(w);
  // 예약된 후속 기사
  if (m.q.length) { const now = m.q.filter(x => x.d <= d); if (now.length) { m.q = m.q.filter(x => x.d > d); for (const x of now) push(S, Object.assign({ d }, x.n)); } }
  // 오피셜·루머
  if (m.tq.length) {
    const today = m.tq.filter(t => t[0] === d).sort((a, b) => b[5] - a[5]).slice(0, 5);
    for (const t of today) {
      const [, pid, from, to, kind, fee, ovr, age] = t;
      push(S, { d, c: 'transfer', imp: fee >= 8000 ? 3 : fee >= 4000 || ovr >= 86 ? 2 : 1, h: `[오피셜] ${pn(pid)}, ${cn(w, to)} ${kind === 'loan' ? '임대' : '이적'}${fee ? ` (${C.fmtEUR(fee * 1e4)})` : kind === 'free' ? ' (자유계약)' : ''}`, s: `${cn(w, from) || '자유계약'} → ${cn(w, to)} · ${age}세 OVR ${ovr}`, p: [pid], cl: [from, to].filter(Boolean) });
    }
    const soon = m.tq.filter(t => t[0] > d + 2 && t[0] <= d + 7 && !m.rum[t[1]] && t[5] >= 4000).sort((a, b) => b[5] - a[5]).slice(0, R() < .5 ? 1 : 2);
    for (const t of soon) {
      m.rum[t[1]] = 1; const [dd, pid, from, to, kind, fee, ovr] = t;
      const lv = dd - d <= 4 ? ['합의 임박', '현지 매체에 따르면 개인 합의를 마치고 메디컬 테스트만 남았다.'] : ['협상 진행 중', '양 구단이 이적료를 두고 협상 중이라는 보도가 나왔다.'];
      push(S, { d, c: 'rumor', imp: fee >= 7000 ? 2 : 1, h: `[루머] ${cn(w, to)}, ${pn(pid)} 영입 ${lv[0]}`, s: `${cn(w, from) || '자유계약'} 소속 · OVR ${ovr} · 예상 이적료 ${C.fmtEUR(Math.round(fee / 500) * 500 * 1e4)} 안팎. ${lv[1]}`, p: [pid], cl: [from, to].filter(Boolean) });
    }
    m.tq = m.tq.filter(t => t[0] >= d);
  }
  // 은퇴 발표
  if (m.rq && m.rq.d <= d) {
    const q = m.rq; m.rq = null;
    q.l.forEach(([pid, from, ovr, age], i) => push(S, { d, c: 'retire', imp: ovr >= 82 ? 3 : i < 3 ? 2 : 1, h: `${pn(pid)}, ${age}세에 현역 은퇴 발표`, s: `${cn(w, from) || '무소속'}${ovr ? ` · 마지막 시즌 OVR ${ovr}` : ''}`, p: [pid], cl: from ? [from] : [] }));
    push(S, { d, c: 'retire', imp: 1, h: `이번 여름 ${q.n.toLocaleString()}명 은퇴`, s: q.l.length ? `주요 은퇴 선수: ${q.l.slice(0, 5).map(x => pn(x[0])).join(', ')}` : '' });
  }
  // 스타 목록 (한 달에 한 번)
  if (!STARS || d - STARD > 30 || STARS.w !== w) {
    STARD = d; const l = [];
    for (const id in w.clubs) { const c = w.clubs[id]; if (!c.sq || c.lite) continue; for (const e of c.sq) if (e[2] >= 83) l.push([String(e[0]), id, e[2], e[6]]); }
    STARS = { w, l };
  }
  // 가십
  if (STARS.l.length && R() < .4) { const [pid, cid] = pick(STARS.l); push(S, { d, c: 'gossip', imp: 1, h: pv('gos', GOSSIP)(pn(pid)), dk: 'gos:' + pid, dkd: 60, s: cn(w, cid), p: [pid], cl: [cid] }); }
  // 이적시장 밖의 소문: 계약 만료가 다가오는 스타
  if (STARS.l.length && !C.txWindowAt(d) && R() < .12) {
    const l = STARS.l.filter(x => (x[3] || 9) <= 1); if (l.length) { const [pid, cid] = pick(l); const bigs = Object.values(w.clubs).filter(c => c.str >= 82 && c.id !== cid); const to = bigs.length ? pick(bigs) : null;
      push(S, { d, c: 'rumor', imp: 1, h: `[루머] ${pn(pid)}, 재계약 협상 난항${to ? `… ${to.name} 관심` : ''}`, s: `${jo(cn(w, cid), '와', '과')}의 계약이 1년 남았다는 보도.`, p: [pid], cl: [cid].concat(to ? [to.id] : []) }); }
  }
}
// 스타 부상·복귀 (calendar.js injTick에서 부른다)
function injury(S, e, c, days, d) {
  const w = S.w, pid = String(e[0]); if (!real(pid) || e[2] < 82) return;
  const wk = Math.round(days / 7);
  push(S, { d, c: 'injury', imp: e[2] >= 87 || days >= 90 ? 3 : 2, h: days >= 90 ? pv('ij3', [() => `[부상] ${pn(pid)}, 장기 부상… 시즌 아웃 우려`, () => `${c.name} 비상, ${pn(pid)} 큰 부상으로 장기 이탈`, () => `${pn(pid)} 쓰러졌다… 최소 ${Math.round(days / 30)}개월 결장`])() : pv('ij2', [() => `[부상] ${pn(pid)}, 약 ${wk}주 결장`, () => `${c.name}, ${pn(pid)} 부상 이탈 (${wk}주)`, () => `${pn(pid)} 부상… ${c.name} 전력 공백`])(), s: `${c.name} · OVR ${e[2]} · 복귀 예정 ${C.fmtDateY(d + days)}`, p: [pid], cl: [c.id], dk: 'inj:' + pid, dkd: 20 });
  if (days >= 90 && R() < .5) m0(w).q.push({ d: d + rint(1, 3), n: { c: 'interview', imp: 1, h: `[인터뷰] ${pn(pid)} "${pv('qinj', Q.inj)}"`, s: `${c.name} · 재활 시작`, p: [pid], cl: [c.id] } });
}
const m0 = w => meta(w);
function injBack(S, e, c, d, days) { const pid = String(e[0]); if (!real(pid) || e[2] < 84 || days < 60) return; push(S, { d, c: 'injury', imp: 1, h: `${pn(pid)}, ${Math.round(days / 7)}주 만에 부상 복귀`, s: c.name, p: [pid], cl: [c.id] }); }
// 여름 이적시장이 열릴 때: 구단 인수·재정 위기, 지난 시즌 급성장·급락한 선수
function summerStories(S) {
  const w = S.w, d = w.cal.d, m = meta(w);
  for (const ev of (w.clubEv || []).filter(x => x.y === w.year && !x.posted)) { ev.posted = 1; const c = w.clubs[ev.id]; if (!c) continue;
    const L = w.lg[c.lg]; if (!L || !NEWSLG.has(L.nation) || L.tier > (BIG5.includes(L.nation) ? 2 : 1)) continue; // 주요 리그만
    const imp3 = BIG5.includes(L.nation) && L.tier === 1;
    if (ev.k === 'takeover') push(S, { d, c: 'club', imp: imp3 ? 3 : 2, h: pv('tk', [() => `${c.name}, 새 구단주 인수 완료… 대규모 투자 예고`, () => `거대 자본 등장! ${c.name} 인수 확정`, () => `${c.name} 새 시대 개막, 투자 컨소시엄이 구단 인수`])(), s: `이번 여름 이적시장에서 공격적인 영입이 예상된다.`, cl: [c.id], dk: 'tk:' + c.id, dkd: 300 });
    else push(S, { d, c: 'club', imp: 2, h: pv('cr', [() => `${c.name}, 재정 위기… 긴축 운영 불가피`, () => `${c.name} 부채 문제 수면 위로, 주축 선수 매각설`, () => `위기의 ${c.name}, 이적 예산 사실상 0`])(), s: `구단은 "재정 건전성 회복이 최우선"이라고 밝혔다.`, cl: [c.id], dk: 'cr:' + c.id, dkd: 300 }); }
  const dv = (w.devEv || []).filter(x => x.y === w.year && !x.posted); if (!dv.length) return;
  dv.forEach(x => x.posted = 1);
  const up = dv.filter(x => x.k === 'up').sort((a, b) => b.d - a.d).slice(0, 5), dn = dv.filter(x => x.k === 'down').sort((a, b) => a.d - b.d).slice(0, 4);
  if (up.length) push(S, { d, c: 'stat', imp: 2, h: `[분석] 지난 시즌 급성장한 선수 ${up.length}명`, s: up.map(x => `${pn(x.pid)} (${x.age}세, ${x.o0}→${x.o1})`).join(' · '), p: up.map(x => x.pid) });
  if (dn.length) push(S, { d, c: 'stat', imp: 2, h: `[분석] 주춤한 스타들… 지난 시즌 기량 하락`, s: dn.map(x => `${pn(x.pid)} (${x.o0}→${x.o1})`).join(' · '), p: dn.map(x => x.pid) });
  void m;
}
// 무소속 선수 영입 (시즌 중에도)
function faSign(S, e, c, idle, d) {
  const w = S.w, pid = String(e[0]); if (e[2] < 72 || !real(pid)) return;
  const L = w.lg[c.lg] || {};
  push(S, { d, c: 'transfer', imp: e[2] >= 78 ? 3 : 2, h: pv('fas', [() => `[오피셜] 무소속 ${pn(pid)}, ${c.name} 입단`, () => `${c.name}, 자유계약 ${pn(pid)} 영입`, () => `${Math.max(1, Math.round(idle / 7))}주 만에 새 팀 찾은 ${pn(pid)}… 행선지는 ${c.name}`])(), s: `${L.name || ''} · 이적료 없음 · ${e[6]}년 계약 · OVR ${e[2]} · ${e[3]}세`, p: [pid], cl: [c.id], lg: c.lg });
}
C.wn = { faSign, match, round, lgEnd, cupEnd, contEnd, intlEnd, yearEnd, windowOpen, day, ceremony, push, REC0, meta, injury, injBack, summerStories };
})(typeof window !== 'undefined' ? window : globalThis);
