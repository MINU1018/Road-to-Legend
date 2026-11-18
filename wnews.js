// Road to Legend — 세계 뉴스: 경기(해트트릭·난타전·대승·이변·빅매치·결승), 순위(감독 경질·무패 행진·조기 우승),
// 기록(리그 최다골·최다 승점·무패 우승·세계 기록), 이적(오피셜·루머), 인터뷰, 가십, 시상을 날짜별로 쌓는다
(function (G) {
'use strict';
const C = G.TC;
const { R, pick, rint } = C;
const NEWSLG = new Set(['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BEL', 'TUR', 'SCO', 'BRA', 'ARG', 'USA', 'KOR', 'JPN', 'KSA', 'MEX']);
const BIG5 = ['ENG', 'ESP', 'ITA', 'GER', 'FRA'];
const MAX = 700;
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
function push(S, n) {
  const w = S.w, L = w.news || (w.news = []);
  if (n.d == null) n.d = w.cal ? w.cal.d : 0;
  n.id = (w.newsSeq = (w.newsSeq || 0) + 1);
  L.push(n);
  if (L.length > MAX + 40) L.splice(0, L.length - MAX);
}
const cn = (w, id) => (w.clubs[id] || {}).name || '';
const pn = pid => C.MD.nameOf(pid);
const real = pid => pid && pid !== 'ME' && pid[0] !== '~';
const NOTE = new Map();
function lgNote(w, id) { let v = NOTE.get(id); if (v == null) { const lg = w.lg[id]; v = !!(lg && lg.tier === 1 && NEWSLG.has(lg.nation)); NOTE.set(id, v); } return v; }
const strOf = (w, x, id, side) => x.nat ? (side ? x.sb : x.sa) || 60 : (w.clubs[id] || {}).str || 60;

// ---------- 인터뷰·가십 문장 ----------
const Q = {
  hat: ['팀 동료들이 다 만들어 준 골입니다. 공은 집에 가져가야죠.', '세 번째 골이 들어가는 순간 소름이 돋았어요.', '오늘 같은 날은 자주 오지 않습니다. 즐기겠습니다.', '해트트릭보다 승점 3점이 더 기쁩니다.'],
  win: ['계획대로 됐습니다. 하지만 아직 갈 길이 멉니다.', '전반부터 우리가 원하는 축구를 했어요.', '팬들의 응원이 큰 힘이 됐습니다.', '이런 경기를 이겨야 우승할 수 있습니다.', '모두가 한 발씩 더 뛰었습니다.'],
  loss: ['변명의 여지가 없습니다. 팬들에게 미안합니다.', '오늘 같은 경기력으로는 아무것도 얻을 수 없어요.', '빨리 잊고 다음 경기를 준비하겠습니다.', '우리 스스로를 돌아봐야 할 때입니다.'],
  draw: ['이길 수 있었던 경기라 아쉽습니다.', '승점 1점도 소중합니다.', '마지막 패스 하나가 부족했어요.'],
  upset: ['아무도 우리를 믿지 않았지만 우리는 서로를 믿었습니다.', '오늘 밤은 우리 도시 전체의 밤입니다.', '이게 축구죠. 공은 둥급니다.'],
  final: ['꿈꿔왔던 순간입니다. 평생 잊지 못할 밤이에요.', '이 트로피는 우리를 믿어 준 모든 사람의 것입니다.', '말로 표현할 수가 없네요. 그냥 행복합니다.'],
  rout: ['골이 계속 들어가니 멈출 이유가 없었죠.', '상대를 존중합니다. 우리는 그냥 우리 축구를 했을 뿐입니다.']
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
  push(S, { c: 'interview', imp: x.k === 'I' || x.fin ? 2 : 1, h: `[인터뷰] ${pn(pid)} "${pick(Q[kind])}"`, s: `${compName(w, x)} ${x.stage || ''} · ${tn(w, x, x.a)} ${x.ga}-${x.gb} ${tn(w, x, x.b)}`, p: [pid], cl: x.nat ? [] : [team], n: x.nat ? [team] : [], lg: x.k === 'L' ? x.comp : null, comp: x.k !== 'L' ? x.comp : null, ref: x.ref });
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
  for (let s = 0; s < 2; s++) for (const p of x.P[s] || []) if (p.g >= 3 && real(p.id)) {
    const t = s ? x.b : x.a;
    push(S, Object.assign({}, base, { c: 'hat', imp: topComp ? 2 : 1, h: `${pn(p.id)}, ${tn(w, x, s ? x.a : x.b)}전 ${p.g >= 5 ? `${p.g}골 폭발` : p.g === 4 ? '포트트릭' : '해트트릭'}`, s: `${sub} · ${sc}`, p: [p.id] })); n++;
    if (R() < .4) interview(S, x, p.id, s, 'hat');
    if (x.k === 'E' && x.comp === 'UCL' && p.g >= 4) push(S, Object.assign({}, base, { c: 'record', imp: 2, h: `${pn(p.id)}, 챔피언스리그 한 경기 ${p.g}골`, s: sub, p: [p.id] }));
    void t;
  }
  // 기록적인 대승
  if (lgN && BIG5.includes(lgN)) { const m = meta(w), rc = m.rec.lgM[lgN]; if (rc && mg >= rc[0] && W) { push(S, Object.assign({ c: 'record', imp: 3, h: `역대 최다 점수 차! ${tn(w, x, W)} ${Math.max(x.ga, x.gb)}-${Math.min(x.ga, x.gb)} ${tn(w, x, Lz)}`, s: `${(w.lg[x.comp] || {}).name} 최다 점수 차 기록 (종전 ${rc[0]}골 차 · ${rc[1]}, ${rc[2]})` }, base)); m.rec.lgM[lgN] = [mg, sc, x.ref && x.ref.sl || '']; n++; } }
  if (n < 2 && mg >= 5 && W) { push(S, Object.assign({ c: 'rout', imp: mg >= 7 || topComp ? 2 : 1, h: `${tn(w, x, W)}, ${tn(w, x, Lz)}에 ${Math.max(x.ga, x.gb)}-${Math.min(x.ga, x.gb)} ${mg >= 7 ? '기록적인 대승' : '대승'}`, s: sub }, base)); n++; if (R() < .25) { const b = best(x.P[wside]); if (b) interview(S, x, b.id, wside, 'rout'); } }
  if (n < 2 && (tot >= 7 || (tot >= 6 && mg <= 1))) { push(S, Object.assign({ c: 'thriller', imp: topComp ? 2 : 1, h: `${sc}, ${tot}골 난타전`, s: sub }, base)); n++; }
  // 이변
  if (n < 2 && W && (x.k !== 'C' || mg >= 1)) { const sw = wside ? sb : sa, sl = wside ? sa : sb; if (sl - sw >= (x.k === 'L' ? 10 : 8)) { push(S, Object.assign({ c: 'upset', imp: topComp || x.k === 'E' ? 2 : 1, h: `이변! ${tn(w, x, W)}, ${tn(w, x, Lz)} 꺾었다`, s: `${sub} · ${sc}` }, base)); n++; if (R() < .45) { const b = best(x.P[wside]); if (b) interview(S, x, b.id, wside, 'upset'); } } }
  // 빅매치 결과
  big = sa >= (x.nat ? 78 : 80) && sb >= (x.nat ? 78 : 80);
  if (!n && big && (topComp || x.k === 'E')) {
    const b = best((x.P[0] || []).concat(x.P[1] || []));
    push(S, Object.assign({ c: 'result', imp: x.k === 'E' && /결승|4강|준결승/.test(x.stage || '') ? 2 : 1, h: `빅매치: ${sc}`, s: `${sub}${b ? ` · 최고 평점 ${pn(b.id)} ${b.rt.toFixed(1)}` : ''}`, p: b ? [b.id] : [] }, base));
    if (R() < .3 && wside >= 0) { const bw = best(x.P[wside]), bl = best(x.P[1 - wside]); if (R() < .6 && bw) interview(S, x, bw.id, wside, 'win'); else if (bl) interview(S, x, bl.id, 1 - wside, 'loss'); }
    else if (R() < .2 && wside < 0 && b) interview(S, x, b.id, (x.P[0] || []).includes(b) ? 0 : 1, 'draw');
  }
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
      push(S, { d, c: 'sack', imp: ex < 3 && BIG5.includes(lg.nation) ? 3 : 2, h: `${cn(w, id)}, 감독 경질… ${lg.name} ${pos + 1}위 부진`, s: `${ri}라운드까지 ${r.w}승 ${r.d}무 ${r.l}패 (승점 ${r.pts}). 구단은 "새로운 동력이 필요하다"고 밝혔다.`, cl: [id], lg: LS.id });
      m.q.push({ d: d + rint(2, 6), n: { c: 'sack', imp: 1, h: `${cn(w, id)}, 새 감독 선임 발표`, s: `시즌 도중 지휘봉을 잡은 새 감독은 "목표는 반등"이라고 말했다.`, cl: [id], lg: LS.id } });
    }
  }
  // 무패 행진
  if ([10, 15, 20, 25, 30].includes(ri)) for (const r of rows.slice(0, 4)) if (r.l === 0 && r.p >= ri - 1) {
    const k = r.id + ':' + LS.label + ':' + ri; if (m.unb[k]) continue; m.unb[k] = 1;
    push(S, { d, c: 'record', imp: ri >= 20 ? 3 : 2, h: `${cn(w, r.id)}, ${lg.name} ${r.p}경기 무패 행진`, s: `${r.w}승 ${r.d}무 · 승점 ${r.pts}${rows[0].id === r.id ? ' · 선두' : ''}`, cl: [r.id], lg: LS.id });
  }
  // 조기 우승 확정
  const left = n - ri;
  if (left > 0 && rows[1] && rows[0].pts - rows[1].pts > left * 3 && !m.cl[LS.k]) {
    m.cl[LS.k] = 1;
    push(S, { d, c: 'champ', imp: 3, h: `${cn(w, rows[0].id)}, ${lg.name} 조기 우승 확정`, s: `${left}경기를 남기고 2위 ${cn(w, rows[1].id)}와 승점 ${rows[0].pts - rows[1].pts}점 차`, cl: [rows[0].id], lg: LS.id });
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
  // 강등
  const tiers = Object.values(w.lg).filter(l => l.nation === lg.nation).length;
  if (tiers > 1 && rows.length >= 10) { const rel = rows.slice(-3).map(x => x.id); push(S, { d, c: 'result', imp: 1, h: `${rel.map(id => cn(w, id)).join(', ')} 강등`, s: `${lg.name} ${LS.label} 최종 순위 하위 3팀`, cl: rel, lg: LS.id }); }
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
  const t = bd.top[0]; if (t) push(S, { c: 'award', imp: 3, h: `${t.n}, ${w.year + 1} 발롱도르 수상`, s: `2위 ${bd.top[1] ? bd.top[1].n : ''} · 3위 ${bd.top[2] ? bd.top[2].n : ''}`, p: t.pid ? [t.pid] : [], cl: [t.cid] });
  const g = bd.gb && bd.gb[0]; if (g) push(S, { c: 'award', imp: 2, h: `${g.n}, ${w.year + 1} 골든보이 수상`, s: `${g.age}세 · ${(w.clubs[g.cid] || {}).name || ''}`, p: g.pid ? [g.pid] : [], cl: [g.cid] });
  const mx = bd.maxG, m = meta(w);
  if (mx && mx.g > m.rec.all[0]) { push(S, { c: 'record', imp: 3, h: `세계 기록! ${mx.n}, 공식전 한 시즌 ${mx.g}골`, s: `종전 ${m.rec.all[0]}골 (${m.rec.all[1]}, ${m.rec.all[2]}) · 클럽 공식전 기준`, p: mx.pid ? [mx.pid] : [], cl: [mx.cid] }); m.rec.all = [mx.g, mx.n, C.wLabel(w.year)]; }
}
// ---------- 이적시장 ----------
function windowOpen(S, rows) {
  const w = S.w, m = meta(w);
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
  // 스타 목록 (한 달에 한 번)
  if (!STARS || d - STARD > 30 || STARS.w !== w) {
    STARD = d; const l = [];
    for (const id in w.clubs) { const c = w.clubs[id]; if (!c.sq || c.lite) continue; for (const e of c.sq) if (e[2] >= 83) l.push([String(e[0]), id, e[2], e[6]]); }
    STARS = { w, l };
  }
  // 가십
  if (STARS.l.length && R() < .4) { const [pid, cid] = pick(STARS.l); push(S, { d, c: 'gossip', imp: 1, h: pick(GOSSIP)(pn(pid)), s: cn(w, cid), p: [pid], cl: [cid] }); }
  // 이적시장 밖의 소문: 계약 만료가 다가오는 스타
  if (STARS.l.length && !C.txWindowAt(d) && R() < .12) {
    const l = STARS.l.filter(x => (x[3] || 9) <= 1); if (l.length) { const [pid, cid] = pick(l); const bigs = Object.values(w.clubs).filter(c => c.str >= 82 && c.id !== cid); const to = bigs.length ? pick(bigs) : null;
      push(S, { d, c: 'rumor', imp: 1, h: `[루머] ${pn(pid)}, 재계약 협상 난항${to ? `… ${to.name} 관심` : ''}`, s: `${cn(w, cid)}와의 계약이 1년 남았다는 보도.`, p: [pid], cl: [cid].concat(to ? [to.id] : []) }); }
  }
}
C.wn = { match, round, lgEnd, cupEnd, contEnd, intlEnd, yearEnd, windowOpen, day, push, REC0, meta };
})(typeof window !== 'undefined' ? window : globalThis);
