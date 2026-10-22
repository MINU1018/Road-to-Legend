// 터치라인 커리어 — 리그·대회 페이지: 모든 나라 리그 순위, 득점·도움 순위, 컵, 대륙 대회, 국제 대회(월드컵 대진)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, flag, crest } = U;
const natCrest = (c, s) => U.natCrest(c, s);
const S = () => U.S();
const st = U.st;
const wv = () => (st.wv = st.wv || { mode: 'league' });
const rerender = () => { const y = scrollY; U.setTab('table'); scrollTo(0, y); };

function sel(value, opts, on, wide) {
  const e = h('select', { class: 'wsel', style: wide ? { minWidth: '180px' } : null, onchange: ev => on(ev.target.value) }, ...opts.map(([v, l]) => { const o = h('option', { value: v }, l); if (String(v) === String(value)) o.selected = true; return o; }));
  return e;
}
function clubCell(w, id, size = 18, short) {
  const c = w.clubs[id];
  return h('span', { class: 'cc' }, crest(c || null, size), h('span', null, c ? (short && c.short ? c.short : c.name) : '해체된 구단'));
}
function natCell(code, size = 18) { return h('span', { class: 'cc' }, natCrest(code, size), h('span', null, C.natName(code))); }
const seasons = w => Object.keys(w.arch || {}).sort().reverse();
function userClubOf(s, label) { const r = s.hist.find(x => x.label === label); return r ? r.club : null; }

// ---------- 리그 ----------
function leagueAvg(w, lg) { return lg.clubs.reduce((a, c) => a + (w.clubs[c] ? w.clubs[c].str : 60), 0) / Math.max(1, lg.clubs.length); }
function nationList(s) {
  const w = s.w, by = {};
  for (const id in w.lg) { const l = w.lg[id]; const a = l.tier === 1 ? leagueAvg(w, l) : 0; by[l.nation] = Math.max(by[l.nation] || 0, a); }
  const me = C.leagueOf(s) ? C.leagueOf(s).nation : s.p.nat;
  return Object.keys(by).sort((a, b) => (b === me) - (a === me) || by[b] - by[a]);
}
function leagueTable(s, lg, rows, myId) {
  const w = s.w;
  const nUCL = { ENG: 4, ESP: 4, ITA: 4, GER: 4, FRA: 3, POR: 2, NED: 2 }[lg.nation] || 1;
  const tiers = Object.values(w.lg).filter(l => l.nation === lg.nation).length;
  const tb = h('tbody', null, ...rows.map((r, i) => {
    const z = lg.tier === 1 && i < nUCL ? '#2f8cf0' : lg.tier === 1 && i < nUCL + 2 ? '#f08c2e' : tiers > 1 && lg.tier < tiers && i >= rows.length - 3 ? '#e5484d' : lg.tier > 1 && i < 3 ? '#2fbf71' : 'transparent';
    return h('tr', { class: r[0] === myId ? 'me' : '' }, h('td', null, h('span', { class: 'zone', style: { background: z } }), i + 1), h('td', null, clubCell(w, r[0])), h('td', null, r[1]), h('td', null, r[2]), h('td', null, r[3]), h('td', null, r[4]), h('td', null, `${r[5]}:${r[6]}`), h('td', null, (r[5] - r[6] > 0 ? '+' : '') + (r[5] - r[6])), h('td', null, h('b', null, r[7])));
  }));
  return h('div', { class: 'tscroll' }, h('table', { class: 'ltable', style: { minWidth: '520px' } }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득실', '차', '승점'].map(x => h('th', null, x)))), tb));
}
function leaders(s, list, kind) {
  const w = s.w;
  if (!list || !list.length) return h('div', { class: 'empty', style: { padding: '14px 0' } }, '기록 없음');
  return h('table', { class: 'ltable' }, h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, '선수'), h('th', null, kind === 'g' ? '골' : '도움'))),
    h('tbody', null, ...list.map((x, i) => h('tr', { class: x[4] ? 'me' : '' }, h('td', null, i + 1), h('td', null, h('div', { style: { display: 'grid', gap: '1px' } }, h('b', { style: { fontWeight: x[4] ? 800 : 600 } }, x[0] + (x[4] ? ' (나)' : '')), h('span', { class: 'mute', style: { fontSize: '11px' } }, clubCell(w, x[1], 14)))), h('td', null, h('b', null, x[2]), h('span', { class: 'mute', style: { fontSize: '11px', marginLeft: '4px' } }, kind === 'g' ? `${x[3]}도움` : `${x[3]}골`))))));
}
function leagueView(s, root) {
  const w = s.w, v = wv();
  const nats = nationList(s);
  const myLg = C.leagueOf(s);
  if (!v.nat || !nats.includes(v.nat)) v.nat = myLg ? myLg.nation : nats[0];
  const lgs = Object.values(w.lg).filter(l => l.nation === v.nat).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  if (!v.lg || !lgs.some(l => l.id === v.lg)) v.lg = (myLg && myLg.nation === v.nat ? myLg.id : lgs[0] && lgs[0].id);
  const lg = w.lg[v.lg];
  const live = s.ss && s.ss.tables && s.ss.tables[v.lg];
  const ss_ = seasons(w).filter(lb => w.arch[lb].lg[v.lg]);
  const opts = (live ? [['live', `${s.ss.label} (진행 중)`]] : []).concat(ss_.map(lb => [lb, lb]));
  if (!v.season || !opts.some(o => o[0] === v.season)) v.season = opts.length ? opts[0][0] : null;
  root.append(h('div', { class: 'wfilter' },
    sel(v.nat, nats.map(n => [n, C.natName(n)]), x => { v.nat = x; v.lg = null; v.season = null; rerender(); }),
    sel(v.lg, lgs.map(l => [l.id, `${l.tier}부 · ${l.name}`]), x => { v.lg = x; v.season = null; rerender(); }, true),
    opts.length ? sel(v.season, opts, x => { v.season = x; rerender(); }) : null));
  if (!lg) return;
  if (!v.season) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, `${lg.name} 기록은 첫 시즌이 끝난 뒤 쌓입니다.`))); return; }
  let rows, data = null, myId;
  if (v.season === 'live') { rows = C.sortTable(s.ss.tables[v.lg]).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]); myId = s.ss.club; }
  else { data = w.arch[v.season].lg[v.lg]; rows = data.t; myId = userClubOf(s, v.season); }
  const title = h('h3', null, h('span', { class: 'cc' }, flag(lg.nation, 18), `${lg.name} · ${v.season === 'live' ? s.ss.label + ' 진행 중' : v.season}`));
  if (data && data.slim) {
    root.append(h('div', { class: 'sec' }, title, h('div', { class: 'sub' }, '오래된 시즌이라 요약만 보관합니다.'), h('div', { class: 'in' }, leagueTable(s, lg, rows, myId))));
  } else root.append(h('div', { class: 'sec' }, title, h('div', { class: 'in' }, leagueTable(s, lg, rows, myId))));
  // 시즌 요약
  if (rows.length > 3 && !(data && data.slim)) {
    const most = rows.slice().sort((a, b) => b[5] - a[5])[0], least = rows.slice().sort((a, b) => a[6] - b[6])[0];
    const chips = [['우승', clubCell(w, rows[0][0], 16)], ['최다 득점', h('span', null, clubCell(w, most[0], 16), ` ${most[5]}골`)], ['최소 실점', h('span', null, clubCell(w, least[0], 16), ` ${least[6]}실점`)]];
    if (data && data.sc && data.sc[0]) chips.push(['득점왕', h('span', null, h('b', null, data.sc[0][0]), ` ${data.sc[0][2]}골`)]);
    if (data && data.as && data.as[0]) chips.push(['도움왕', h('span', null, h('b', null, data.as[0][0]), ` ${data.as[0][2]}도움`)]);
    root.append(h('div', { class: 'wsum' }, ...chips.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, v2)))));
  }
  if (data && (data.sc || data.as)) root.append(h('div', { class: 'wgrid2' },
    h('div', { class: 'sec' }, h('h3', null, '득점 순위'), h('div', { class: 'in' }, leaders(s, data.sc, 'g'))),
    h('div', { class: 'sec' }, h('h3', null, '도움 순위'), h('div', { class: 'in' }, leaders(s, data.as, 'a')))));
  else if (v.season === 'live') root.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 4px' } }, '득점·도움 순위는 시즌이 끝나면 집계됩니다.'));
  // 역대 우승
  const lh = (w.hist.lg[v.lg] || []).slice(-15).reverse();
  if (lh.length) {
    const top = lb => { const a = w.arch[lb] && w.arch[lb].lg[v.lg]; return a && a.sc && a.sc[0] ? `${a.sc[0][0]} ${a.sc[0][2]}골` : ''; };
    root.append(h('div', { class: 'sec' }, h('h3', null, '역대 우승'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, h('th', null, '시즌'), h('th', null, '우승'), h('th', null, '득점왕'))), h('tbody', null, ...lh.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)), h('td', { class: 'mute' }, top(x.y)))))))));
  }
}

// ---------- 컵 ----------
function bracket(nameOf, rounds, finalWinner) {
  return h('div', { class: 'bracket' }, ...rounds.map(r => h('div', { class: 'bcol' }, h('div', { class: 'lbl' }, r.n), h('div', { class: 'bms' }, ...r.m.map(m => {
    const win = m[4] || (m[2] > m[3] ? m[0] : m[2] < m[3] ? m[1] : null);
    const row = (id, g, other) => h('div', { class: 'bt' + (win === id ? ' w' : '') }, nameOf(id), h('b', null, g), m[4] && m[4] === id ? h('small', null, 'PK') : null);
    return h('div', { class: 'bm' }, row(m[0], m[2]), row(m[1], m[3]));
  })))), finalWinner ? h('div', { class: 'bcol champ' }, h('div', { class: 'lbl' }, '우승'), h('div', { class: 'bms' }, h('div', { class: 'bm gold' }, h('div', { class: 'bt w' }, nameOf(finalWinner))))) : null);
}
function cupView(s, root) {
  const w = s.w, v = wv();
  const nats = nationList(s).filter(n => C.CUPNAME[n] || C.LCUPNAME[n]);
  if (!v.cnat || !nats.includes(v.cnat)) v.cnat = nats.includes(wv().nat) ? wv().nat : nats[0];
  const ss_ = seasons(w).filter(lb => w.arch[lb].cup[v.cnat] || w.arch[lb].lcup[v.cnat]);
  if (!v.cseason || !ss_.includes(v.cseason)) v.cseason = ss_[0];
  root.append(h('div', { class: 'wfilter' }, sel(v.cnat, nats.map(n => [n, C.natName(n)]), x => { v.cnat = x; v.cseason = null; rerender(); }), ss_.length ? sel(v.cseason, ss_.map(x => [x, x]), x => { v.cseason = x; rerender(); }) : null));
  if (!v.cseason) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '컵 대회 기록은 첫 시즌이 끝난 뒤 쌓입니다.'))); return; }
  const A = w.arch[v.cseason];
  const nm = id => clubCell(w, id, 16);
  for (const cup of [A.cup[v.cnat], A.lcup[v.cnat]]) if (cup) root.append(h('div', { class: 'sec' }, h('h3', null, h('span', { class: 'cc' }, U.trophy ? U.trophy(cup.k === 'cup' ? 'cup' : 'lcup', 18, '#f2c14e') : null, `${cup.n} ${v.cseason}`), h('span', { class: 'chip gold' }, '우승 ', w.clubs[cup.w] ? w.clubs[cup.w].name : '')), h('div', { class: 'in tscroll' }, bracket(nm, cup.r, cup.w))));
  const hist = (w.hist.cup[v.cnat] || []).slice(-12).reverse();
  if (hist.length) root.append(h('div', { class: 'sec' }, h('h3', null, `${C.CUPNAME[v.cnat] || ''} 역대 우승`), h('div', { class: 'in' }, h('table', { class: 'ltable lc' }, h('tbody', null, ...hist.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)))))))));
}

// ---------- 대륙 대회 ----------
function contView(s, root) {
  const w = s.w, v = wv();
  const keys = Object.keys(C.COMPS);
  if (!v.ck) { const mine = s.ss && s.ss.cont; v.ck = mine || 'UCL'; }
  const ss_ = seasons(w).filter(lb => w.arch[lb].cont[v.ck]);
  if (!v.ckseason || !ss_.includes(v.ckseason)) v.ckseason = ss_[0];
  root.append(h('div', { class: 'wfilter' }, sel(v.ck, keys.map(k => [k, C.COMPS[k].name]), x => { v.ck = x; v.ckseason = null; rerender(); }, true), ss_.length ? sel(v.ckseason, ss_.map(x => [x, x]), x => { v.ckseason = x; rerender(); }) : null));
  if (!v.ckseason) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '대회 기록은 첫 시즌이 끝난 뒤 쌓입니다.'))); return; }
  const K = w.arch[v.ckseason].cont[v.ck];
  const myId = userClubOf(s, v.ckseason);
  if (K.w) root.append(h('div', { class: 'wchamp', style: U.tintStyle ? U.tintStyle(w.clubs[K.w], .3) : null }, crest(w.clubs[K.w], 52), h('div', null, h('div', { class: 'lbl' }, `${K.n} ${v.ckseason} 우승`), h('h2', null, w.clubs[K.w] ? w.clubs[K.w].name : ''))));
  const rounds = (K.r || []).filter(r => r.t.length);
  if (rounds.length) root.append(h('div', { class: 'sec' }, h('h3', null, '토너먼트'), h('div', { class: 'in tscroll' }, h('div', { class: 'bracket' }, ...rounds.map(r => h('div', { class: 'bcol' }, h('div', { class: 'lbl' }, r.n), h('div', { class: 'bms' }, ...r.t.map(t => h('div', { class: 'bm' + (t[0] === myId || t[1] === myId ? ' me' : '') }, ...[t[0], t[1]].map(id => h('div', { class: 'bt' + (t[2] === id ? ' w' : '') }, clubCell(w, id, 16))))))))))));
  if (K.ph) root.append(h('div', { class: 'sec' }, h('h3', null, '리그 페이즈 순위'), h('div', { class: 'in' }, leagueTable(s, { nation: '', tier: 9 }, K.ph, myId))));
  const hist = (w.hist.cont[v.ck] || []).slice(-12).reverse();
  if (hist.length) root.append(h('div', { class: 'sec' }, h('h3', null, '역대 우승'), h('div', { class: 'in' }, h('table', { class: 'ltable lc' }, h('tbody', null, ...hist.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)))))))));
}

// ---------- 국제 대회 ----------
function intlView(s, root) {
  const w = s.w, v = wv();
  const years = Object.keys(w.intl || {}).filter(y => w.intl[y].length).sort().reverse();
  const curY = s.ss ? s.ss.year + 1 : s.w.year + 1;
  const nextWC = C.nextWorldCup(curY);
  const up = C.tournamentsOf(curY).map(k => C.TDEF[k].name);
  root.append(h('div', { class: 'mute', style: { fontSize: '13px', padding: '0 2px' } }, up.length ? `올여름(${curY}) 대회: ${up.join(' · ')}` : `다음 월드컵: ${nextWC}년 여름`, up.includes('FIFA 월드컵') ? '' : ` · 다음 월드컵 ${nextWC}년`));
  if (!years.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 열린 국제 대회가 없습니다. 시즌이 끝난 여름에 열립니다.'))); return; }
  if (!v.iy || !years.includes(String(v.iy))) v.iy = years[0];
  const list = w.intl[v.iy];
  if (!v.ik || !list.some(t => t.k === v.ik)) v.ik = (list.find(t => t.k === 'WC') || list[0]).k;
  root.append(h('div', { class: 'wfilter' }, sel(v.iy, years.map(y => [y, `${y}년`]), x => { v.iy = x; v.ik = null; rerender(); }),
    h('div', { class: 'seg', style: { flex: '1 1 260px' } }, ...list.map(t => h('button', { class: v.ik === t.k ? 'on' : '', onclick: () => { v.ik = t.k; rerender(); } }, t.n)))));
  const T = list.find(t => t.k === v.ik);
  const me = s.p.nat;
  const nm = c => h('span', { class: 'cc' + (c === me ? ' mine' : '') }, natCrest(c, 16), h('span', null, C.natName(c)));
  root.append(h('div', { class: 'wchamp' }, natCrest(T.w, 56), h('div', null, h('div', { class: 'lbl' }, `${T.n} ${T.y} 우승`), h('h2', null, C.natName(T.w)), h('div', { class: 'mute', style: { fontSize: '13px' } }, `준우승 ${C.natName(T.ru)}` + (T.teams ? ` · ${T.teams}개국 참가` : '')))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '토너먼트 대진'), h('div', { class: 'in tscroll' }, bracket(nm, T.ko, T.w))));
  if (T.g && T.g.length) {
    const grid = h('div', { class: 'ggrid' }, ...T.g.map(g => h('div', { class: 'gcard' + (g.rows.some(r => r[0] === me) ? ' mine' : '') },
      h('div', { class: 'lbl' }, `${g.n}조`),
      h('table', { class: 'ltable' }, h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, '팀'), h('th', null, '득실'), h('th', null, '승점'))),
        h('tbody', null, ...g.rows.map((r, i) => h('tr', { class: r[0] === me ? 'me' : '' }, h('td', null, i + 1), h('td', null, nm(r[0])), h('td', null, (r[5] - r[6] > 0 ? '+' : '') + (r[5] - r[6])), h('td', null, h('b', null, r[7])))))),
      h('details', null, h('summary', null, '경기 결과'), h('div', { class: 'gms' }, ...g.m.map(m => h('div', null, h('span', null, C.natName(m[0])), h('b', null, `${m[2]} - ${m[3]}`), h('span', null, C.natName(m[1])))))))));
    root.append(h('div', { class: 'sec' }, h('h3', null, '조별리그'), h('div', { class: 'in' }, grid)));
  }
  const hk = (w.hist.nt || {})[v.ik] || [];
  if (hk.length) root.append(h('div', { class: 'sec' }, h('h3', null, `${C.TDEF[v.ik].name} 역대 우승`), h('div', { class: 'in' }, h('table', { class: 'ltable lc' }, h('tbody', null, ...hk.slice().reverse().map(x => h('tr', null, h('td', null, x.y), h('td', null, nm(x.c)))))))));
}

U.pages.table = function () {
  const s = S(), v = wv();
  const root = h('div', { class: 'wrap prof screen' });
  const modes = [['league', '리그'], ['cup', '국내 컵'], ['cont', '대륙 대회'], ['intl', '국제 대회']];
  root.append(h('div', { class: 'seg wmodes' }, ...modes.map(([k, l]) => h('button', { class: v.mode === k ? 'on' : '', onclick: () => { v.mode = k; rerender(); } }, l))));
  try {
    ({ league: leagueView, cup: cupView, cont: contView, intl: intlView })[v.mode](s, root);
  } catch (e) { console.error(e); root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '기록을 불러오지 못했습니다.'))); }
  return root;
};
})(typeof window !== 'undefined' ? window : globalThis);
