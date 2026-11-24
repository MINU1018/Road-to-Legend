// Road to Legend — 화면별 차트 묶음 (ui_viz.js 위에서)
// 구단: 시즌 순위 흐름·경기별 득실, 연혁(해마다 최종 순위), 개요 요약 타일
// 리그: 전 구단 순위 흐름(한 팀 강조)   감독: 명성 추이   국가대표: FIFA 랭킹 추이   선수: 시즌별 골·도움·평점
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, { h } = U, V = () => U.viz;
const sec = (title, sub, ...kids) => h('div', { class: 'sec vzsec' }, h('h3', null, title, sub ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' ' + sub) : null), h('div', { class: 'in' }, ...kids.filter(Boolean)));
// 리그 구간(챔스권·승격권·강등권)
U.lgBands = (w, lg, n) => {
  const nUCL = { ENG: 4, ESP: 4, ITA: 4, GER: 4, FRA: 3, POR: 2, NED: 2 }[lg.nation] || 1, tiers = Object.values(w.lg).filter(l => l.nation === lg.nation).length, B = [];
  if (lg.tier === 1) B.push({ y0: .5, y1: nUCL + .5, label: '챔스권', fill: 'rgba(57,135,229,.10)' });
  if (lg.tier > 1) B.push({ y0: .5, y1: 3.5, label: '승격권', fill: 'rgba(12,163,12,.10)' });
  if (tiers > 1 && lg.tier < tiers) B.push({ y0: n - 2.5, y1: n + .5, label: '강등권', fill: 'rgba(230,103,103,.10)' });
  return B;
};
const posTicks = n => [1].concat([5, 10, 15, 20, 24].filter(t => t < n)).concat([n]);
// 리그 저장소 찾기: 진행 중(live) 또는 보관 시즌
function lgStore(src, cb) { const st = src === 'live' ? U.liveSt() : (U.mxCached(src) || U.withMx(src, cb)); return st || null; }

// 구단: 시즌 순위 흐름 + 경기별 득실
U.chClubSeason = (s, id, src, lid, mini) => {
  const w = s.w, c = w.clubs[id], lg = w.lg[lid]; if (!lg) return null;
  const st = lgStore(src, () => U.stay()); if (!st) return h('div', { class: 'mute', style: { padding: '12px' } }, '경기 기록을 불러오는 중…');
  const L = st.L && st.L[lid]; if (!L) return null;
  const T = C.lgTrack(w, L); if (!T || !T.pos[id]) return null;
  const n = T.ids.length, pos = T.pos[id], col = V().idColor(c, 0);
  const rows = C.MD.leagueRows(w, L).filter(r => r.a === id || r.b === id).sort((a, b) => a.r - b.r);
  const mine = rows.map(r => { const home = r.a === id, gf = home ? r.ga : r.gb, ga = home ? r.gb : r.ga; return { r: r.r + 1, opp: home ? r.b : r.a, home, gf, ga, res: gf > ga ? 'W' : gf < ga ? 'L' : 'D' }; });
  const wrap = h('div', { class: 'vzgrid' });
  if (mini) return h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, `리그 순위 흐름 · 지금 ${pos[pos.length - 1]}위`), V().line({ x: T.rounds.map(String), series: [{ name: c.name, color: col, v: pos }], invert: true, yMin: 1, yMax: n, ticks: posTicks(n), bands: U.lgBands(w, lg, n), h: 190, W: 480, tip: i => [`${T.rounds[i]}라운드 · ${pos[i]}위 · 승점 ${T.pts[id][i]}`] }));
  const ln = V().line({ x: T.rounds.map(String), series: [{ name: c.name, color: col, v: pos }], invert: true, yMin: 1, yMax: n, ticks: posTicks(n), bands: U.lgBands(w, lg, n), h: 240, W: 480, label: '라운드별 순위',
    tip: i => { const m = mine.find(x => x.r === T.rounds[i]); return [`${T.rounds[i]}라운드 · ${pos[i]}위 · 승점 ${T.pts[id][i]}`].concat(m ? [`${m.home ? '홈' : '원정'} ${(w.clubs[m.opp] || {}).name || ''} ${m.gf}-${m.ga} (${m.res === 'W' ? '승' : m.res === 'D' ? '무' : '패'})`] : []); } });
  wrap.append(sec(`${lg.name} 순위 흐름`, `${pos[pos.length - 1]}위 / ${n}`, ln));
  if (mine.length) wrap.append(sec('경기별 득점·실점', '위 = 득점 · 아래 = 실점', V().legend([['득점', V().PAL[0]], ['실점', V().PAL[1]]]),
    V().cols({ x: mine.map(m => String(m.r)), series: [{ name: '득점', color: V().PAL[0], v: mine.map(m => m.gf) }, { name: '실점', color: V().PAL[1], v: mine.map(m => -m.ga) }], h: 240, W: 480, fmt: v => String(Math.abs(v)),
      tip: i => { const m = mine[i]; return [`${m.r}라운드 ${m.home ? '홈' : '원정'} ${(w.clubs[m.opp] || {}).name || ''}`, `${m.gf}-${m.ga} ${m.res === 'W' ? '승' : m.res === 'D' ? '무' : '패'}`]; } })));
  return wrap;
};
// 구단 연혁: 해마다 최종 순위 (리그 피라미드 전체 순위로 그려서 승격·강등이 보이게)
U.chClubYears = (s, id) => {
  const w = s.w, c = w.clubs[id], pts = [];
  for (const lb of Object.keys(w.arch || {}).sort()) { const A = w.arch[lb]; for (const lid in A.lg) { const L = A.lg[lid], i = L.t.findIndex(r => r[0] === id); if (i < 0) continue; const lg = w.lg[lid] || {}, nat = lg.nation;
    const above = Object.values(w.lg).filter(l => l.nation === nat && (l.tier || 1) < (lg.tier || 1)).reduce((a, l) => a + l.clubs.length, 0);
    pts.push({ lb, lid, tier: lg.tier || 1, pos: i + 1, n: L.t.length, y: above + i + 1, name: L.n || lg.name, pts: L.t[i][7] }); break; } }
  if (pts.length < 2) return null; // 두 시즌부터
  const nat = (w.lg[pts[0].lid] || {}).nation, tiers = Object.values(w.lg).filter(l => l.nation === nat).sort((a, b) => (a.tier || 1) - (b.tier || 1));
  let acc = 0; const bands = []; const lo = Math.min(...pts.map(p => p.tier)), hi = Math.max(...pts.map(p => p.tier));
  for (const l of tiers) { const a = acc; acc += l.clubs.length; if ((l.tier || 1) >= lo && (l.tier || 1) <= hi) bands.push({ y0: a + .5, y1: acc + .5, label: l.name, fill: (l.tier || 1) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,0)' }); }
  const y0 = bands.length ? bands[0].y0 + .5 : 1, y1 = bands.length ? bands[bands.length - 1].y1 - .5 : 20;
  const ln = V().line({ x: pts.map(p => p.lb), series: [{ name: c.name, color: V().idColor(c, 0), v: pts.map(p => p.y) }], invert: true, yMin: y0, yMax: y1, ticks: [], bands, h: 190, xMax: 12, label: '해마다 최종 순위',
    tip: i => [`${pts[i].lb}`, `${pts[i].name} ${pts[i].pos}위 / ${pts[i].n} · 승점 ${pts[i].pts}`] });
  return sec('해마다 최종 순위', pts.length > 1 ? `${pts.length}시즌` : '첫 시즌', ln);
};
// 구단 개요: 요약 타일 + 최근 폼
U.chClubTiles = (s, id, played) => {
  const w = s.w, c = w.clubs[id], lg = w.lg[c.lg], LS = w.cal && w.cal.lg[c.lg]; if (!LS) return null;
  const T = C.sortTable(LS.tb), i = T.findIndex(r => r.id === id); if (i < 0) return null; const r = T[i];
  const st = U.liveSt(), L = st && st.L && st.L[c.lg], rows = L ? C.MD.leagueRows(w, L).filter(x => x.a === id || x.b === id).sort((a, b) => a.r - b.r) : [];
  // 최근 5경기: 전 대회 (왼쪽이 오래된 경기)
  const fm = (played || []).slice(-5).map(x => ({ r: x.res, t: `${C.fmtDate(x.d)} ${x.comp || ''} ${(w.clubs[x.opp] || {}).name || ''} ${x.gf}-${x.gag}` }));
  const strRank = lg.clubs.slice().sort((a, b) => ((w.clubs[b] || {}).str || 0) - ((w.clubs[a] || {}).str || 0)).indexOf(id) + 1;
  const M = C.mgrOf && C.mgrOf(w, id);
  return V().tiles([{ k: `${lg.name} 순위`, v: `${i + 1}위`, sub: `${T.length}팀 중 · 전력 ${strRank}위` }, { k: '승점', v: String(r.pts), sub: `${r.p}경기 ${r.w}승 ${r.d}무 ${r.l}패` }, { k: '득실', v: `${r.gf - r.ga >= 0 ? '+' : ''}${r.gf - r.ga}`, sub: `${r.gf}득점 ${r.ga}실점` },
    { k: '최근 5경기 (전 대회)', v: fm.length ? V().form(fm) : '-', sub: fm.length ? `${fm.filter(x => x.r === 'W').length}승 ${fm.filter(x => x.r === 'D').length}무 ${fm.filter(x => x.r === 'L').length}패` : '' },
    M ? { k: '감독', v: h('span', { class: 'lnk', onclick: () => U.openMgr(M.n) }, M.n.split(' ').slice(-1)[0]), sub: `${C.mgrTier(M.rep || 0)} 명성` } : null]);
};
// 리그: 전 구단 순위 흐름 (한 팀 강조 + 선두)
U.chLeagueBump = (s, root, lg, src) => {
  const w = s.w, sv = U.st.bump = U.st.bump || {};
  const st = lgStore(src || 'live', () => U.stay()); if (!st) { root.append(sec('순위 흐름', '', h('div', { class: 'mute' }, '불러오는 중…'))); return; }
  const L = st.L && st.L[lg.id], T = L && C.lgTrack(w, L); if (!T) { root.append(sec('순위 흐름', '', h('div', { class: 'mute' }, '아직 치른 경기가 없습니다.'))); return; }
  const n = T.ids.length, last = id => T.pos[id][T.pos[id].length - 1], ids = T.ids.slice().sort((a, b) => last(a) - last(b));
  if (!sv[lg.id] || !T.pos[sv[lg.id]]) sv[lg.id] = ids[0];
  const hi = sv[lg.id], lead = ids[0];
  const sel = h('select', { class: 'wsel', onchange: e => { sv[lg.id] = e.target.value; U.stay(); } }, ...ids.map(id => { const o = h('option', { value: id }, `${last(id)}. ${(w.clubs[id] || {}).name || id}`); if (id === hi) o.selected = true; return o; }));
  const series = ids.map(id => ({ name: (w.clubs[id] || {}).name, v: T.pos[id], dim: id !== hi && id !== lead, color: id === hi ? V().idColor(w.clubs[id], 0) : '#9aa4b2' }));
  const ln = V().line({ x: T.rounds.map(String), series, invert: true, yMin: 1, yMax: n, ticks: posTicks(n), bands: U.lgBands(w, lg, n), h: 300, endLabel: s2 => s2.name, label: '순위 흐름',
    tip: i => [`${T.rounds[i]}라운드`, `${(w.clubs[hi] || {}).name}: ${T.pos[hi][i]}위 · 승점 ${T.pts[hi][i]}`, hi !== lead ? `선두 ${(w.clubs[ids.find(id => T.pos[id][i] === 1)] || {}).name || ''} · 승점 ${Math.max(...T.ids.map(id => T.pts[id][i]))}` : ''].filter(Boolean) });
  // 승점 레이스 (상위 4팀 + 강조 팀)
  const top = ids.slice(0, 4).concat(ids.slice(0, 4).includes(hi) ? [] : [hi]);
  const race = V().line({ x: T.rounds.map(String), series: top.map((id, k) => ({ name: (w.clubs[id] || {}).name, color: V().PAL[k], v: T.pts[id] })), h: 220, endLabel: s2 => s2.name, label: '승점 레이스',
    tip: i => [`${T.rounds[i]}라운드`].concat(top.map(id => `${(w.clubs[id] || {}).name} ${T.pts[id][i]}점`)) });
  root.append(h('div', { class: 'wfilter' }, h('span', { class: 'mute', style: { fontSize: '12px' } }, '강조할 구단'), sel));
  root.append(sec('라운드별 순위', `회색 = 다른 구단 · 밝은 회색 = 선두`, ln));
  root.append(sec('승점 레이스', '상위 4팀' + (top.length > 4 ? ' + 강조 구단' : ''), V().legend(top.map((id, k) => [(w.clubs[id] || {}).name, V().PAL[k]])), race));
};
// 감독: 명성 추이 (단계 구간 표시)
U.chMgrRep = M => {
  const rh = (M.rh || []).slice(); if (rh.length < 2) return sec('명성 추이', '', h('div', { class: 'mute', style: { fontSize: '12.5px' } }, `지금 ${Math.round(M.rep || 0)} (${C.mgrTier(M.rep || 0)}) · 시즌이 끝날 때마다 성적·우승으로 오르내리며, 두 시즌부터 그래프로 보입니다.`));
  const bands = [[0, 25, '무명'], [25, 45, '지역적'], [45, 65, '국내적'], [65, 83, '대륙적'], [83, 100, '세계적']].map(([a, b, l], k) => ({ y0: a, y1: b, label: l, fill: k % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,0)' }));
  return sec('명성 추이', '시즌이 끝날 때마다 성적·우승으로 오르내림', V().line({ x: rh.map(x => `${String(x[0]).slice(2)}/${String(x[0] + 1).slice(2)}`), series: [{ name: M.n, color: V().PAL[0], v: rh.map(x => x[1]) }], yMin: 0, yMax: 100, ticks: [0, 25, 45, 65, 83, 100], bands, h: 190, area: true,
    tip: i => [`${rh[i][0]}/${String(rh[i][0] + 1).slice(2)} 시즌 뒤`, `명성 ${Math.round(rh[i][1])} · ${C.mgrTier(rh[i][1])}`] }));
};
// 국가대표: FIFA 랭킹 추이
U.chNatRank = (w, code) => {
  const R = w.rank; if (!R || !R.pub || R.pub.length < 2) return null;
  const P = R.pub.map(p => ({ d: p.d, i: p.r.indexOf(code), v: p.v[p.r.indexOf(code)] })).filter(x => x.i >= 0); if (P.length < 2) return null;
  const rk = P.map(x => x.i + 1), lo = Math.max(1, Math.min(...rk) - 3), hi2 = Math.max(...rk) + 3;
  return sec('FIFA 랭킹 추이', `발표 ${P.length}회`, V().line({ x: P.map(x => { const [y, m] = C.ymd(x.d); return `${String(y).slice(2)}.${m}`; }), series: [{ name: C.natName(code), color: V().PAL[0], v: rk }], invert: true, yMin: lo, yMax: hi2, h: 180,
    tip: i => [`${C.fmtDateY(P[i].d)} 발표`, `${rk[i]}위 · ${P[i].v.toFixed(2)}점`] }));
};
// 선수: 시즌별 골·도움 막대 + 평점 꺾은선 (축이 달라 차트를 나눈다)
U.chPlayerSeasons = list => {
  // list: [{ lb, g, a, apps, rt }] (오래된 순)
  if (!list || list.length < 2) return null;
  const x = list.map(r => r.lb.length > 5 ? r.lb.slice(2) : r.lb);
  const g = h('div', { class: 'vzgrid' });
  g.append(sec('시즌별 골·도움', '', V().legend([['골', V().PAL[0]], ['도움', V().PAL[2]]]), V().cols({ x, series: [{ name: '골', color: V().PAL[0], v: list.map(r => r.g) }, { name: '도움', color: V().PAL[2], v: list.map(r => r.a) }], h: 220, W: 480, tip: i => [list[i].lb, `${list[i].apps}경기 ${list[i].g}골 ${list[i].a}도움`] })));
  const rt = list.map(r => r.rt ? r.rt : null);
  if (rt.some(v => v != null)) g.append(sec('시즌 평균 평점', '', V().line({ x, series: [{ name: '평점', color: V().PAL[1], v: rt }], yMin: Math.max(5, Math.min(...rt.filter(v => v)) - .3), yMax: Math.min(10, Math.max(...rt.filter(v => v)) + .3), h: 220, W: 480, fmt: v => v.toFixed(1), tip: i => [list[i].lb, rt[i] != null ? `평점 ${rt[i].toFixed(2)} · ${list[i].apps}경기` : '기록 없음'] })));
  return g;
};
})(typeof window !== 'undefined' ? window : globalThis);
