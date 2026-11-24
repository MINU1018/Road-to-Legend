// Road to Legend — 대회 기록 화면 (리그·컵·대륙 대회·국가대표 대회의 '기록' 하위 탭). 게임 시작 이후 기록
// 리그: 최다 우승 · 시즌 기록(최다 승점·득점, 최소 실점, 무패 우승, 최대 승점 차 우승) · 역대 통산 순위 · 개인 통산/단일 시즌 · 경기 기록
// 컵: 최다 우승 · 최다 결승 진출 · 결승 최다 점수 차 · 개인 · 경기 기록
// 대륙 대회: 최다 우승(구단·국가) · 개인 · 경기 기록   국가대표 대회: 최다 우승 국가 · 개인 · 경기 기록
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest } = U;
const cname = (w, id, nat) => nat ? C.natName(id) : ((w.clubs[id] || {}).name || id);
const cl = (w, id, nat, size = 16) => nat ? h('span', { class: 'cc' }, U.natCrest(id, size), h('span', null, C.natName(id))) : h('span', { class: 'cc lnk', onclick: ev => { ev.stopPropagation(); if (w.clubs[id]) U.openClub(id); } }, crest(w.clubs[id] || null, size), h('span', null, cname(w, id)));
const pn = (s, id) => id === 'ME' ? (s.p && s.p.name) || '나' : (C.MD.nameOf && C.MD.nameOf(id)) || id;
const pl = (s, id) => h('span', { class: id !== 'ME' ? 'lnk' : '', onclick: ev => { ev.stopPropagation(); if (id !== 'ME') U.openPlayer(id); } }, pn(s, id));
const card = (title, rows, note) => h('div', { class: 'sec crec' }, h('h3', null, title, note ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' ' + note) : null),
  h('div', { class: 'in crg' }, ...rows.filter(Boolean).map(([k, v, sub, fn]) => h('div', { class: 'crr' + (fn ? ' click' : ''), onclick: fn ? ev => { if (ev.target.closest('.lnk')) return; fn(); } : null }, h('span', { class: 'mute' }, k), h('b', null, v, fn ? h('span', { class: 'crgo' }, ' ›') : null), sub ? h('small', { class: 'mute' }, sub) : null))));
const list = (title, items, fmt, note) => h('div', { class: 'sec crec' }, h('h3', null, title, note ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' ' + note) : null),
  items.length ? h('div', { class: 'in lrl' }, ...items.map((x, i) => h('div', { class: 'lrr' }, h('span', { class: 'lrk' }, String(i + 1)), ...fmt(x)))) : h('div', { class: 'in mute' }, '기록 없음'));
const none = '기록 없음';
const openM = (s, x, nat) => nat ? null : () => U.openRecMatch && U.openRecMatch(s, x[3], x[5], x[4]);
function matchRows(s, R, nat) {
  const w = s.w;
  const mt = x => x ? [`${cname(w, x[3], nat)} ${x[1]}-${x[2]} ${cname(w, x[4], nat)}`, `${C.fmtDateY(x[5])} · ${x[6] || ''}`, openM(s, x, nat)] : [none, ''];
  return [['최다 점수 차', ...mt(R.bw[0])], ['최다 골 경기', ...mt(R.hs[0])],
    ['최단 시간 골', ...(R.fg ? [h('span', null, pl(s, R.fg[1]), ` ${U.fmtMin ? U.fmtMin(R.fg[0]) : R.fg[0] + "'"}`), `${cname(w, R.fg[3], nat)} vs ${cname(w, R.fg[4], nat)} · ${C.fmtDateY(R.fg[2])}`, nat ? null : () => U.openRecMatch(s, R.fg[3], R.fg[2], R.fg[4])] : [none, ''])],
    ['경기 수 · 골', `${R.n.toLocaleString()}경기 · ${R.g.toLocaleString()}골`, R.n ? `경기당 ${(R.g / R.n).toFixed(2)}골` : '']];
}
function playerSecs(s, root, R) {
  const P = Object.entries(R.pl || {});
  const tp = (i, n) => P.filter(x => x[1][i] > 0).sort((a, b) => b[1][i] - a[1][i] || a[1][0] - b[1][0]).slice(0, n);
  const g2 = h('div', { class: 'crwrap' });
  g2.append(list('통산 최다 골', tp(1, 10), ([id, v]) => [pl(s, id), h('b', null, `${v[1]}골`), h('small', { class: 'mute' }, `${v[0]}경기`)]));
  g2.append(list('통산 최다 출전', tp(0, 10), ([id, v]) => [pl(s, id), h('b', null, `${v[0]}경기`), h('small', { class: 'mute' }, `${v[1]}골 ${v[2]}도움`)]));
  g2.append(list('통산 최다 도움', tp(2, 10), ([id, v]) => [pl(s, id), h('b', null, `${v[2]}도움`), h('small', { class: 'mute' }, `${v[0]}경기`)]));
  g2.append(list('최다 해트트릭', tp(3, 5), ([id, v]) => [pl(s, id), h('b', null, `${v[3]}회`), h('small', { class: 'mute' }, `${v[1]}골`)]));
  g2.append(list('단일 시즌 최다 골', C.lrecSeason(R, 'g'), x => [pl(s, x[1]), h('b', null, `${x[0]}골`), h('small', { class: 'mute' }, x[2] + (x[3] ? ' · 진행 중' : ''))]));
  g2.append(list('단일 시즌 최다 도움', C.lrecSeason(R, 'a'), x => [pl(s, x[1]), h('b', null, `${x[0]}도움`), h('small', { class: 'mute' }, x[2] + (x[3] ? ' · 진행 중' : ''))]));
  root.append(g2);
}
function titles(hist) { const m = new Map(); for (const x of hist || []) { const t = m.get(x.c) || []; t.push(x.y); m.set(x.c, t); } return [...m.entries()].sort((a, b) => b[1].length - a[1].length || String(a[1][0]).localeCompare(String(b[1][0]))); }
const titleList = (w, T, nat, title) => list(title || '최다 우승', T.slice(0, 10), ([c, ys]) => [cl(w, c, nat), h('b', null, `${ys.length}회`), h('small', { class: 'mute' }, ys.slice().sort().reverse().join(' · '))]);

// 리그
U.leagueRecords = function (s, root, lid) {
  const w = s.w, lg = w.lg[lid], R = (w.lrec || {})['L:' + lid];
  const hist = (w.hist.lg || {})[lid] || [];
  const seasons = Object.keys(w.arch || {}).sort().map(lb => [lb, w.arch[lb].lg && w.arch[lb].lg[lid]]).filter(x => x[1] && x[1].t && x[1].t.length);
  if (!R && !seasons.length && !hist.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기를 치르면 이 리그의 기록이 쌓입니다. (게임 시작 이후 기록)'))); return; }
  const g = h('div', { class: 'crwrap' });
  g.append(titleList(w, titles(hist), false));
  // 시즌 기록 (끝난 시즌 순위표): [id, 경기, 승, 무, 패, 득, 실, 승점]
  const all = []; for (const [lb, L] of seasons) L.t.forEach((r, i) => all.push({ lb, r, i, n: L.t.length, gap: i === 0 && L.t[1] ? r[7] - L.t[1][7] : null }));
  const best = (f, cmp) => all.slice().sort(cmp)[0];
  const sr = x => x ? [h('span', null, cl(w, x.r[0], false)), `${x.lb} · ${x.i + 1}위 · ${x.r[2]}승 ${x.r[3]}무 ${x.r[4]}패`] : [none, ''];
  const champs = all.filter(x => x.i === 0);
  const unb = champs.filter(x => x.r[4] === 0);
  g.append(card('시즌 기록', all.length ? [
    ['최다 승점', ...(x => x ? [h('span', null, `${x.r[7]}점 · `, cl(w, x.r[0], false)), sr(x)[1]] : [none, ''])(best(0, (a, b) => b.r[7] - a.r[7]))],
    ['최다 득점', ...(x => x ? [h('span', null, `${x.r[5]}골 · `, cl(w, x.r[0], false)), sr(x)[1]] : [none, ''])(best(0, (a, b) => b.r[5] - a.r[5]))],
    ['최소 실점', ...(x => x ? [h('span', null, `${x.r[6]}실점 · `, cl(w, x.r[0], false)), sr(x)[1]] : [none, ''])(best(0, (a, b) => a.r[6] - b.r[6] || b.r[7] - a.r[7]))],
    ['최다 승리', ...(x => x ? [h('span', null, `${x.r[2]}승 · `, cl(w, x.r[0], false)), sr(x)[1]] : [none, ''])(best(0, (a, b) => b.r[2] - a.r[2]))],
    ['최대 승점 차 우승', ...(x => x ? [h('span', null, `${x.gap}점 차 · `, cl(w, x.r[0], false)), x.lb] : [none, ''])(champs.slice().sort((a, b) => b.gap - a.gap)[0])],
    ['최소 승점 우승', ...(x => x ? [h('span', null, `${x.r[7]}점 · `, cl(w, x.r[0], false)), x.lb] : [none, ''])(champs.slice().sort((a, b) => a.r[7] - b.r[7])[0])],
    ['무패 우승', unb.length ? h('span', null, ...unb.flatMap((x, k) => [k ? ', ' : '', cl(w, x.r[0], false), ` (${x.lb})`])) : '없음', ''],
    ['최다 실점 (한 시즌)', ...(x => x ? [h('span', null, `${x.r[6]}실점 · `, cl(w, x.r[0], false)), sr(x)[1]] : [none, ''])(best(0, (a, b) => b.r[6] - a.r[6]))]
  ] : [['끝난 시즌', '아직 없음', '첫 시즌이 끝나면 쌓입니다']]));
  if (R) g.append(card('경기 기록', matchRows(s, R, false)));
  root.append(g);
  // 역대 통산 순위
  if (seasons.length) {
    const T = new Map(); for (const [, L] of seasons) for (const r of L.t) { const x = T.get(r[0]) || { id: r[0], n: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, t: 0 }; x.n++; x.p += r[1]; x.w += r[2]; x.d += r[3]; x.l += r[4]; x.gf += r[5]; x.ga += r[6]; x.pts += r[7]; T.set(r[0], x); }
    for (const [c, ys] of titles(hist)) if (T.get(c)) T.get(c).t = ys.length;
    const rows = [...T.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)).slice(0, 25);
    root.append(h('div', { class: 'sec' }, h('h3', null, '역대 통산 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 끝난 ${seasons.length}시즌 합계`)), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' },
      h('thead', null, h('tr', null, ...['#', '구단', '시즌', '경기', '승', '무', '패', '득실', '승점', '우승'].map(x => h('th', null, x)))),
      h('tbody', null, ...rows.map((x, i) => h('tr', null, h('td', null, i + 1), h('td', null, cl(w, x.id, false)), h('td', null, x.n), h('td', null, x.p), h('td', null, x.w), h('td', null, x.d), h('td', null, x.l), h('td', null, `${x.gf}:${x.ga}`), h('td', null, h('b', null, x.pts)), h('td', null, x.t ? h('b', { style: { color: 'var(--gold)' } }, x.t) : '-'))))))));
  }
  if (R) playerSecs(s, root, R);
  root.append(h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 4px' } }, '게임 시작 이후 기록입니다. 개인 통산 기록은 1부 리그만 집계합니다.'));
};
// 컵
U.cupRecords = function (s, root, nat, kind) {
  const w = s.w, R = (w.lrec || {})['C:' + nat + ':' + kind];
  const finals = []; for (const lb of Object.keys(w.arch || {}).sort()) { const A = w.arch[lb], X = A[kind] && A[kind][nat]; if (!X || !X.r || !X.r.length) continue; const F = X.r[X.r.length - 1]; if (F.n === '결승' && F.m && F.m[0]) finals.push([lb, F.m[0]]); }
  const win = m => m[4] ? m[4] : m[2] > m[3] ? m[0] : m[1];
  const hist = kind === 'cup' ? ((w.hist.cup || {})[nat] || []) : finals.map(([lb, m]) => ({ y: lb, c: win(m) }));
  if (!R && !hist.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기를 치르면 이 대회의 기록이 쌓입니다. (게임 시작 이후 기록)'))); return; }
  const g = h('div', { class: 'crwrap' });
  g.append(titleList(w, titles(hist), false));
  const fc = new Map(); for (const [, m] of finals) for (const c of [m[0], m[1]]) fc.set(c, (fc.get(c) || 0) + 1);
  g.append(list('최다 결승 진출', [...fc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8), ([c, n]) => [cl(w, c, false), h('b', null, `${n}회`)]));
  const bf = finals.slice().sort((a, b) => Math.abs(b[1][2] - b[1][3]) - Math.abs(a[1][2] - a[1][3]))[0];
  g.append(card('결승 기록', [['결승 최다 점수 차', ...(bf ? [`${cname(w, bf[1][0])} ${bf[1][2]}-${bf[1][3]} ${cname(w, bf[1][1])}`, bf[0]] : [none, ''])],
    ['승부차기로 끝난 결승', `${finals.filter(x => x[1][4]).length}번`, `결승 ${finals.length}번 중`]]));
  if (R) g.append(card('경기 기록', matchRows(s, R, false)));
  root.append(g);
  if (R) playerSecs(s, root, R);
  root.append(h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 4px' } }, '게임 시작 이후 기록입니다.'));
};
// 대륙 대회
U.contRecords = function (s, root, k) {
  const w = s.w, R = (w.lrec || {})['K:' + k], hist = (w.hist.cont || {})[k] || [];
  if (!R && !hist.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기를 치르면 이 대회의 기록이 쌓입니다. (게임 시작 이후 기록)'))); return; }
  const g = h('div', { class: 'crwrap' }), T = titles(hist);
  g.append(titleList(w, T, false));
  const byNat = new Map(); for (const [c, ys] of T) { const n = (w.clubs[c] || {}).nat; if (n) byNat.set(n, (byNat.get(n) || 0) + ys.length); }
  g.append(list('국가별 우승', [...byNat.entries()].sort((a, b) => b[1] - a[1]), ([n, v]) => [h('span', { class: 'cc' }, U.flag(n, 14), h('span', null, C.natName(n))), h('b', null, `${v}회`)]));
  if (R) g.append(card('경기 기록', matchRows(s, R, false)));
  root.append(g);
  if (R) playerSecs(s, root, R);
  root.append(h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 4px' } }, '게임 시작 이후 기록입니다.'));
};
// 국가대표 대회
U.intlRecords = function (s, root, k) {
  const w = s.w, R = (w.lrec || {})['I:' + k], hist = (w.hist.nt || {})[k] || [];
  if (!R && !hist.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '대회가 열리면 기록이 쌓입니다. (게임 시작 이후 기록)'))); return; }
  const g = h('div', { class: 'crwrap' });
  g.append(titleList(w, titles(hist), true, '최다 우승 국가'));
  if (R) g.append(card('경기 기록', matchRows(s, R, true)));
  root.append(g);
  if (R) playerSecs(s, root, R);
  root.append(h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 4px' } }, '게임 시작 이후 기록입니다.'));
};
// 국가대표 랭킹 (FIFA 방식). 발표 순위 + 지금 점수(발표 뒤 경기 반영) + 순위 변동 + 1위 기록
U.natRankView = function (s, root) {
  const w = s.w, R = C.rankInit(w), pubs = R.pub, sv = U.st.nrk = U.st.nrk || { n: 50, conf: '' };
  const cur = pubs[pubs.length - 1], prev = pubs.length > 1 ? pubs[pubs.length - 2] : null;
  const CONF = [['', '전체'], ['UEFA', '유럽'], ['CONMEBOL', '남미'], ['CONCACAF', '북중미'], ['AFC', '아시아'], ['CAF', '아프리카'], ['OFC', '오세아니아']];
  root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { sv.conf = e.target.value; U.stay(); } }, ...CONF.map(([k, l]) => { const o = h('option', { value: k }, l); if (k === sv.conf) o.selected = true; return o; })),
    h('span', { class: 'mute', style: { fontSize: '12px' } }, `${C.fmtDateY(cur.d)} 발표${cur.src ? ` (${cur.src} 점수 그대로)` : ''} · 다음 발표 전 경기는 '현재 점수'에 반영`)));
  const rows = cur.r.map((c, i) => ({ c, i, v: cur.v[i], now: R.p[c], mv: prev ? prev.r.indexOf(c) - i : 0 })).filter(x => !sv.conf || C.confOf(x.c) === sv.conf);
  const tb = h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['순위', '변동', '국가', '점수', '현재 점수', '연맹'].map(x => h('th', null, x)))),
    h('tbody', null, ...rows.slice(0, sv.n).map(x => h('tr', { class: 'click', onclick: () => U.openNat(x.c) }, h('td', null, h('b', null, x.i + 1)), h('td', null, prev && prev.r.indexOf(x.c) >= 0 ? (x.mv > 0 ? h('span', { style: { color: 'var(--good)' } }, `▲${x.mv}`) : x.mv < 0 ? h('span', { style: { color: 'var(--bad)' } }, `▼${-x.mv}`) : h('span', { class: 'mute' }, '–')) : h('span', { class: 'mute' }, '–')),
      h('td', null, h('span', { class: 'cc' }, U.natCrest(x.c, 18), h('span', null, C.natName(x.c)))), h('td', null, x.v.toFixed(2)), h('td', { class: 'mute' }, x.now != null ? (x.now - x.v >= .005 ? `${x.now.toFixed(2)} (+${(x.now - x.v).toFixed(2)})` : x.v - x.now >= .005 ? `${x.now.toFixed(2)} (−${(x.v - x.now).toFixed(2)})` : '') : ''), h('td', { class: 'mute' }, C.confOf(x.c))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '국가대표 랭킹'), h('div', { class: 'in tscroll' }, tb), rows.length > sv.n ? h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => { sv.n += 50; U.stay(); } }, `더 보기 (${rows.length - sv.n}개국)`)) : null));
  if (R.top.length) root.append(h('div', { class: 'sec' }, h('h3', null, '1위 기록'), h('div', { class: 'in chg' }, ...R.top.slice().reverse().map(([d, c]) => h('span', { class: 'chip' }, `${C.fmtDateY(d)} ~ `, U.flag(c, 12), ' ' + C.natName(c))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '계산 방식'), h('div', { class: 'in mute', style: { fontSize: '12.5px', lineHeight: 1.6 } },
    'FIFA/코카콜라 남자 랭킹의 SUM 방식을 따릅니다. 경기마다 점수 = 이전 점수 + 중요도 × (결과 − 기대 결과). 기대 결과는 두 팀 점수 차로 정해지고(1 / (10^(−점수차/600) + 1)), 결과는 승 1 · 무 0.5 · 패 0, 승부차기는 이긴 팀 0.75 · 진 팀 0.5입니다. ',
    '중요도: 친선전 10 · 네이션스리그 리그 단계 15 · 네이션스리그 토너먼트 25 · 대륙 대회 본선 35 (8강부터 40) · 월드컵 본선 50 (8강부터 60). 본선 토너먼트에서 진 팀은 점수를 잃지 않습니다. 시작 점수는 2026년 10월 7일 FIFA 발표 점수입니다.')));
};

// ---------- 세계 구단 랭킹 ----------
U.clubRankView = function (s, root) {
  const w = s.w; if (!w.cr && C.crInit) C.crInit(w);
  const R = w.cr, sv = U.st.crk = U.st.crk || { n: 50, conf: '', nat: '' };
  const rows = C.crCalc(w), prev = R.pub[R.pub.length - 1];
  const prevIdx = {}; if (prev) prev.r.forEach((id, i) => prevIdx[id] = i);
  const CONF = [['', '전체 연맹'], ['UEFA', '유럽'], ['CONMEBOL', '남미'], ['CONCACAF', '북중미'], ['AFC', '아시아']];
  const nats = [...new Set(rows.map(x => w.clubs[x.id].nat))].sort((a, b) => C.natName(a).localeCompare(C.natName(b)));
  const opt = (list, cur) => list.map(([k, l]) => { const o = h('option', { value: k }, l); if (k === cur) o.selected = true; return o; });
  root.append(h('div', { class: 'wfilter' },
    h('select', { class: 'wsel', onchange: e => { sv.conf = e.target.value; sv.nat = ''; U.stay(); } }, ...opt(CONF, sv.conf)),
    h('select', { class: 'wsel', onchange: e => { sv.nat = e.target.value; U.stay(); } }, ...opt([['', '전체 국가']].concat(nats.filter(n => !sv.conf || C.confOf(n) === sv.conf).map(n => [n, C.natName(n)])), sv.nat)),
    h('span', { class: 'mute', style: { fontSize: '12px' } }, prev ? `순위 변동은 ${C.fmtDateY(prev.d)} 발표 대비 · 점수는 현재 기준` : '')));
  const list = rows.map((x, i) => Object.assign({ i }, x)).filter(x => { const n = w.clubs[x.id].nat; return (!sv.conf || C.confOf(n) === sv.conf) && (!sv.nat || n === sv.nat); });
  const bar = v => h('span', { class: 'crb' }, h('i', { style: { width: Math.max(2, Math.round(v * .52)) + 'px' } }), h('b', null, Math.round(v)));
  const lgOf = c => { const L = c.lg && w.lg[c.lg]; return L ? L.name : C.natName(c.nat); };
  const tb = h('table', { class: 'ltable lc crt' }, h('thead', null, h('tr', null, ...['순위', '변동', '구단', '리그', '종합', '경기력', '대륙', '역사', '팬', '재정'].map(x => h('th', { class: x === '구단' ? 'l' : x === '리그' ? 'l lgc' : null }, x)))),
    h('tbody', null, ...list.slice(0, sv.n).map(x => { const c = w.clubs[x.id], pi = prevIdx[x.id], mv = pi == null ? null : pi - x.i;
      return h('tr', { class: 'click' + (sv.hl === x.id ? ' hl' : ''), onclick: () => U.openClub(x.id) },
        h('td', null, h('b', null, x.i + 1)),
        h('td', null, mv == null ? h('span', { class: 'mute' }, 'NEW') : mv > 0 ? h('span', { style: { color: 'var(--good)' } }, '▲' + mv) : mv < 0 ? h('span', { style: { color: 'var(--bad)' } }, '▼' + (-mv)) : h('span', { class: 'mute' }, '–')),
        h('td', { class: 'l' }, h('span', { class: 'cc' }, crest(c, 18), h('span', null, c.name))),
        h('td', { class: 'l mute lgc' }, h('span', { class: 'cc' }, U.flag ? U.flag(c.nat, 12) : '', ' ', lgOf(c))),
        h('td', null, h('b', null, x.s.toFixed(1))), h('td', null, bar(x.p)), h('td', null, bar(x.co)), h('td', null, bar(x.he)), h('td', null, bar(x.fa)), h('td', null, bar(x.fi))); })));
  root.append(h('div', { class: 'sec' }, h('h3', null, '세계 구단 랭킹'), h('div', { class: 'in tscroll' }, tb),
    list.length > sv.n ? h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => { sv.n += 50; U.stay(); } }, `더 보기 (${list.length - sv.n}개 남음)`)) : null));
  if (R.top.length) root.append(h('div', { class: 'sec' }, h('h3', null, '1위 기록'), h('div', { class: 'in chg' }, ...R.top.slice().reverse().slice(0, 12).map(([d, id]) => h('span', { class: 'chip' }, `${C.fmtDateY(d)} ~ `, crest(w.clubs[id], 14), ' ' + ((w.clubs[id] || {}).name || id))))));
  const Wt = C.CRW || {};
  root.append(h('div', { class: 'sec' }, h('h3', null, '계산 방식'), h('div', { class: 'in mute', style: { fontSize: '12.5px', lineHeight: 1.65 } },
    `현실의 구단 순위는 기준마다 다릅니다 — Opta 파워랭킹·ClubElo는 경기 결과, UEFA 계수는 최근 5시즌 대륙 대회 성적, Deloitte Money League는 매출, Brand Finance·Forbes는 브랜드 가치를 봅니다. 이 랭킹은 이들을 섞은 종합 지수입니다 (각 항목 0~100).`,
    h('br'), `· 경기력 ${Math.round(Wt.p * 100)}% — 모든 공식 경기 결과로 오르내리는 Elo (상대가 강할수록, 점수 차가 클수록 크게 변함). 시작값은 2026년 11월 Opta 파워 지수와 스쿼드 전력.`,
    h('br'), `· 대륙 성적 ${Math.round(Wt.co * 100)}% — 최근 5시즌 대륙 대회 승점(승 2 · 무 1, 우승 보너스). 유럽 1 · 남미 0.75 · 그 밖 0.4 보정.`,
    h('br'), `· 역사 ${Math.round(Wt.he * 100)}% — 역대 리그·대륙·국내 컵 우승을 리그 수준으로 환산하고, 우승 대부분이 오래전인 구단은 낮춰 반영. 제곱근을 씌워 우승이 아주 많은 구단과의 차이를 줄입니다. 게임 속 우승은 그대로 더해집니다.`,
    h('br'), `· 팬·브랜드 ${Math.round(Wt.fa * 100)}% — 팔로워·관중 규모 근사치에서 시작해 우승·승격으로 오르고 강등으로 내려갑니다.`,
    h('br'), `· 재정 ${Math.round(Wt.fi * 100)}% — 구단 매출 (로그 척도).`,
    h('br'), '발표는 매달 1일. 하부 리그 구단과 리그 밖 구단은 전력·리그 수준으로 근사합니다.')));
};
})(typeof window !== 'undefined' ? window : globalThis);
