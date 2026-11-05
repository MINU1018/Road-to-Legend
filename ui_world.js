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
  return h('span', { class: 'cc' + (c && U.openClub ? ' lnk' : ''), onclick: c && U.openClub ? ev => { ev.stopPropagation(); U.openClub(id); } : null }, crest(c || null, size), h('span', null, c ? (short && c.short ? c.short : c.name) : '해체된 구단'));
}
const clubName = (w, id) => (w.clubs[id] || {}).name || '';
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
    h('tbody', null, ...list.map((x, i) => h('tr', { class: x[4] ? 'me' : '' }, h('td', null, i + 1), h('td', null, h('div', { style: { display: 'grid', gap: '1px' } }, h('b', { class: x[5] ? 'lnk' : '', style: { fontWeight: x[4] ? 800 : 600 }, onclick: x[5] ? () => U.openPlayer(x[5]) : x[4] ? () => U.setTab('profile') : null }, x[0] + (x[4] ? ' (나)' : '')), h('span', { class: 'mute', style: { fontSize: '11px' } }, clubCell(w, x[1], 14)))), h('td', null, h('b', null, x[2]), h('span', { class: 'mute', style: { fontSize: '11px', marginLeft: '4px' } }, kind === 'g' ? `${x[3]}도움` : `${x[3]}골`))))));
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
  const label = v.season === 'live' ? s.ss.label : v.season;
  const title = h('h3', null, h('span', { class: 'cc' }, flag(lg.nation, 18), `${lg.name} · ${v.season === 'live' ? s.ss.label + ' 진행 중' : v.season}`));
  // 하위 탭: 순위 / 경기 결과 / 개인 기록 / 역대 우승
  const SUBS = [['table', '순위'], ['fx', '경기 결과'], ['rec', '개인 기록'], ['hist', '역대 우승']];
  if (!SUBS.some(x => x[0] === v.lsub)) v.lsub = 'table';
  root.append(h('div', { class: 'seg lsub' }, ...SUBS.map(([k, l]) => h('button', { class: v.lsub === k ? 'on' : '', onclick: () => { v.lsub = k; rerender(); } }, l))));
  if (v.lsub === 'table') {
    if (data && data.slim) root.append(h('div', { class: 'sec' }, title, h('div', { class: 'sub' }, '오래된 시즌이라 요약만 보관합니다.'), h('div', { class: 'in' }, leagueTable(s, lg, rows, myId))));
    else root.append(h('div', { class: 'sec' }, title, h('div', { class: 'in' }, leagueTable(s, lg, rows, myId))));
    if (rows.length > 3 && !(data && data.slim)) {
      const most = rows.slice().sort((a, b) => b[5] - a[5])[0], least = rows.slice().sort((a, b) => a[6] - b[6])[0];
      const chips = [['1위', clubCell(w, rows[0][0], 16)], ['최다 득점', h('span', null, clubCell(w, most[0], 16), ` ${most[5]}골`)], ['최소 실점', h('span', null, clubCell(w, least[0], 16), ` ${least[6]}실점`)]];
      if (data && data.sc && data.sc[0]) chips.push(['득점왕', h('span', null, h('b', null, data.sc[0][0]), ` ${data.sc[0][2]}골`)]);
      if (data && data.as && data.as[0]) chips.push(['도움왕', h('span', null, h('b', null, data.as[0][0]), ` ${data.as[0][2]}도움`)]);
      root.append(h('div', { class: 'wsum' }, ...chips.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, v2)))));
    }
  } else if (v.lsub === 'fx') fixturesSec(s, root, lg, label, v.season === 'live');
  else if (v.lsub === 'rec') {
    if (data && (data.sc || data.as)) {
      root.append(h('div', { class: 'wgrid2' },
        h('div', { class: 'sec' }, h('h3', null, '득점 순위'), h('div', { class: 'in' }, leaders(s, data.sc, 'g'))),
        h('div', { class: 'sec' }, h('h3', null, '도움 순위'), h('div', { class: 'in' }, leaders(s, data.as, 'a')))));
      if (data.best && data.best.length) root.append(h('div', { class: 'sec' }, h('h3', null, '평점 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 리그 경기 40% 이상 출전')), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['#', '선수', '포지션', '경기', '평균 평점'].map(x => h('th', null, x)))),
        h('tbody', null, ...data.best.slice(0, 15).map((x, i) => h('tr', null, h('td', null, i + 1), h('td', null, h('div', { style: { display: 'grid', gap: '1px' } }, h('b', { class: x[4] ? 'lnk' : '', onclick: x[4] ? () => U.openPlayer(x[4]) : null }, x[0]), h('span', { class: 'mute', style: { fontSize: '11px' } }, clubCell(w, x[1], 14)))), h('td', null, h('span', { class: 'tpos' }, x[3])), h('td', null, x[6] || ''), h('td', null, U.rt2(x[2])))))))));
      root.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 4px' } }, data.md ? '모든 숫자는 이 리그 경기 기록(득점자·도움·출전 명단)을 더한 값입니다. 경기 결과 탭에서 경기별로 확인할 수 있습니다.' : '하부 리그(명단 없는 구단)는 팀 득점을 바탕으로 한 추정 기록입니다.'));
    } else root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, v.season === 'live' ? '득점·도움 순위는 시즌이 끝나면 경기 기록으로 집계됩니다.' : '기록 없음')));
  } else {
    const lh = (w.hist.lg[v.lg] || []).slice(-20).reverse();
    const top = lb => { const a = w.arch[lb] && w.arch[lb].lg[v.lg]; return a && a.sc && a.sc[0] ? `${a.sc[0][0]} ${a.sc[0][2]}골` : ''; };
    root.append(h('div', { class: 'sec' }, h('h3', null, '역대 우승'), lh.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, h('th', null, '시즌'), h('th', null, '우승'), h('th', null, '득점왕'))), h('tbody', null, ...lh.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)), h('td', { class: 'mute' }, top(x.y))))))) : h('div', { class: 'empty' }, '아직 없습니다.')));
  }
}
// ---------- 경기 결과 (라운드별·팀별) ----------
function fixturesSec(s, root, lg, label, live) {
  const w = s.w, v = wv();
  let rows = [], st = null, L = null;
  if (live) {
    const t = s.ss.tables[lg.id], per = Math.max(1, Math.floor(lg.clubs.length / 2));
    rows = ((t && t._m) || []).map((m, i) => ({ i, r: Math.floor(i / per), a: m[0], b: m[1], ga: m[2], gb: m[3], ui: m[4], det: false }));
  } else {
    if (!(w.mxKeys || []).includes(label)) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기별 기록은 최근 3시즌만 보관합니다. (이 기능이 추가되기 전 시즌은 기록이 없습니다)'))); return; }
    st = U.withMx(label, () => rerender());
    if (!st) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록을 불러오는 중…'))); return; }
    L = st.L[lg.id]; rows = C.MD.leagueRows(w, L);
  }
  if (!rows.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록이 없습니다.'))); return; }
  const nR = Math.max(...rows.map(r => r.r)) + 1;
  const key = lg.id + '|' + label;
  if (v.fxKey !== key) { v.fxKey = key; v.fxR = live ? nR - 1 : 0; v.fxT = ''; }
  const myClub = live ? s.ss.club : userClubOf(s, label);
  const teams = lg.clubs.slice().sort((a, b) => ((w.clubs[a] || {}).name || '').localeCompare((w.clubs[b] || {}).name || '', 'ko'));
  const bar = h('div', { class: 'wfilter' },
    h('div', { class: 'seg', style: { flex: '0 0 auto' } }, h('button', { class: !v.fxT ? 'on' : '', onclick: () => { v.fxT = ''; rerender(); } }, '라운드별'), h('button', { class: v.fxT ? 'on' : '', onclick: () => { v.fxT = v.fxT || myClub || lg.clubs[0]; rerender(); } }, '팀별')),
    !v.fxT ? h('div', { class: 'rnav' }, h('button', { class: 'btn ghost sm', disabled: v.fxR <= 0 ? true : null, onclick: () => { v.fxR--; rerender(); } }, '‹'), sel(v.fxR, Array.from({ length: nR }, (_, i) => [i, `${i + 1}라운드`]), x => { v.fxR = +x; rerender(); }), h('button', { class: 'btn ghost sm', disabled: v.fxR >= nR - 1 ? true : null, onclick: () => { v.fxR++; rerender(); } }, '›'))
      : sel(v.fxT, teams.map(id => [id, (w.clubs[id] || {}).name || id]), x => { v.fxT = x; rerender(); }, true));
  root.append(bar);
  const list = v.fxT ? rows.filter(r => r.a === v.fxT || r.b === v.fxT) : rows.filter(r => r.r === v.fxR);
  const open = r => {
    if (live || !r.det) {
      const rec = r.ui != null ? s.ss.matches[r.ui] : null;
      U.overlay(close => [h('div', { class: 'head' }, h('h2', null, `${(w.clubs[r.a] || {}).name} ${r.ga} - ${r.gb} ${(w.clubs[r.b] || {}).name}`), h('span', { class: 'mute' }, `${lg.name} ${r.r + 1}라운드`)),
        h('div', { class: 'body' }, h('p', { class: 'mute' }, live ? '진행 중인 시즌입니다. 득점자·카드·출전 명단은 시즌이 끝날 때 경기별로 기록되어 여기서 볼 수 있습니다.' : '이 경기는 상세 기록이 없습니다.'), rec && rec.played ? h('p', null, `내 기록: ${rec.min}분 · ${rec.st.goals}골 ${rec.st.assists}도움 · 평점 ${(rec.rating || 0).toFixed(1)}`) : null, h('div', { style: { textAlign: 'right' } }, h('button', { class: 'btn', onclick: () => close() }, '닫기')))], { clickClose: true });
      return;
    }
    U.showMatch({ title: `${lg.name} ${label} · ${r.r + 1}라운드`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: C.MD.leagueMatch(st, L, r.i), key: key + '|' + r.i });
  };
  root.append(h('div', { class: 'sec' }, h('h3', null, v.fxT ? `${(w.clubs[v.fxT] || {}).name} 경기 (${list.length})` : `${v.fxR + 1}라운드`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, live ? ' 진행 중 · 결과만' : ' 경기를 누르면 상세 기록')),
    h('div', { class: 'in fxlist' }, ...list.map(r => fxRow(w, r.a, r.b, r.ga, r.gb, v.fxT ? `${r.r + 1}R` : '', v.fxT ? resOf(r, v.fxT) : '', r.a === myClub || r.b === myClub, () => open(r))))));
}
// 경기 한 줄 (구단 이름은 링크가 아니라 줄 전체가 경기 상세 버튼)
function teamTag(w, id, nat, right) { const c = nat ? null : w.clubs[id]; return h('span', { class: 'cc' }, ...(right ? [] : [nat ? U.natCrest(id, 18) : crest(c || null, 18)]), h('span', null, nat ? C.natName(id) : c ? c.name : '해체된 구단'), ...(right ? [nat ? U.natCrest(id, 18) : crest(c || null, 18)] : [])); }
function fxRow(w, a, b, ga, gb, tag, res, mine, onclick, nat) {
  return h('button', { class: 'fx' + (mine ? ' me' : ''), onclick },
    h('span', { class: 'mute fr' }, tag || ''),
    h('span', { class: 'fh' }, teamTag(w, a, nat, true)), h('b', { class: 'fs' }, `${ga} - ${gb}`), h('span', { class: 'fa' }, teamTag(w, b, nat, false)),
    h('span', { class: res ? 'res ' + res : '' }, res ? ({ W: '승', D: '무', L: '패' })[res] : ''));
}
const resOf = (r, id) => { const f = r.a === id ? r.ga : r.gb, a = r.a === id ? r.gb : r.ga; return f > a ? 'W' : f < a ? 'L' : 'D'; };

// ---------- 컵 ----------
function bracket(nameOf, rounds, finalWinner, onMatch) {
  return h('div', { class: 'bracket' }, ...rounds.map(r => h('div', { class: 'bcol' }, h('div', { class: 'lbl' }, r.n), h('div', { class: 'bms' }, ...r.m.map(m => {
    const win = m[4] || (m[2] > m[3] ? m[0] : m[2] < m[3] ? m[1] : null);
    const row = (id, g, other) => h('div', { class: 'bt' + (win === id ? ' w' : '') }, nameOf(id), h('b', null, g), m[4] && m[4] === id ? h('small', null, 'PK') : null);
    return h('div', { class: 'bm' + (onMatch ? ' click' : ''), title: onMatch ? '경기 상세 보기' : null, onclick: onMatch ? () => onMatch(r, m) : null }, row(m[0], m[2]), row(m[1], m[3]));
  })))), finalWinner ? h('div', { class: 'bcol champ' }, h('div', { class: 'lbl' }, '우승'), h('div', { class: 'bms' }, h('div', { class: 'bm gold' }, h('div', { class: 'bt w' }, nameOf(finalWinner))))) : null);
}
// 시즌 경기 기록에서 한 경기 찾아 보여주기
const stOf = label => (S().w.mxKeys || []).includes(label) ? U.withMx(label, () => rerender()) : null;
const mxNote = label => (S().w.mxKeys || []).includes(label) ? (U.mxCached(label) ? '경기를 누르면 득점자·카드·출전 명단' : '경기 기록 불러오는 중…') : '경기별 상세 기록은 최근 3시즌만 보관합니다';
function showRow(st, row, title, nat) {
  const w = S().w, id = x => nat ? x : (typeof x === 'number' ? w.cix[x] : x);
  U.showMatch({ title, a: id(row[1]), b: id(row[2]), ga: row[3], gb: row[4], pw: row[7] != null ? id(row[7]) : null, d: C.MD.decode(st, row), nat, key: title + '|' + row[1] + '|' + row[2] });
}
function findRow(list, stage, a, b, nat) {
  const w = S().w, k = x => nat ? x : C.cix(w, x);
  return (list || []).find(r => (stage == null || String(r[0]).startsWith(stage)) && r[1] === k(a) && r[2] === k(b)) || null;
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
  const st = stOf(v.cseason);
  for (const cup of [A.cup[v.cnat], A.lcup[v.cnat]]) if (cup) {
    const list = st && st.CUP[v.cnat + ':' + cup.k];
    const on = list ? (r, m) => { const row = findRow(list, r.n, m[0], m[1]); if (row) showRow(st, row, `${cup.n} ${v.cseason} · ${r.n}`); } : null;
    root.append(h('div', { class: 'sec' }, h('h3', null, h('span', { class: 'cc' }, U.trophy ? U.trophy(cup.k === 'cup' ? 'cup' : 'lcup', 18, '#f2c14e') : null, `${cup.n} ${v.cseason}`), h('span', { class: 'chip gold' }, '우승 ', w.clubs[cup.w] ? w.clubs[cup.w].name : '')), h('div', { class: 'sub' }, mxNote(v.cseason) + ' · 8강부터 표시'), h('div', { class: 'in tscroll' }, bracket(nm, cup.r, cup.w, on))));
  }
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
  const st = stOf(v.ckseason), list = st && st.CONT[v.ck];
  // 토너먼트 한 판(1·2차전)을 누르면 두 경기를 차례로
  const openTie = (r, t) => {
    if (!list) return;
    const legs = list.filter(x => String(x[0]).startsWith(r.n) && [x[1], x[2]].sort().join() === [C.cix(w, t[0]), C.cix(w, t[1])].sort().join());
    if (!legs.length) return;
    if (legs.length === 1) { showRow(st, legs[0], `${K.n} ${v.ckseason} · ${legs[0][0]}`); return; }
    U.overlay(close => [h('div', { class: 'head' }, h('h2', null, `${K.n} ${r.n}`), h('span', { class: 'mute' }, `합계 ${clubName(w, t[0])} ${t[3]} - ${t[4]} ${clubName(w, t[1])}${t[5] ? ' · 승부차기' : ''}`)),
      h('div', { class: 'body', style: { display: 'grid', gap: '8px' } }, ...legs.map(x => fxRow(w, w.cix[x[1]], w.cix[x[2]], x[3], x[4], x[0].replace(r.n, '').trim() || r.n, '', false, () => { close(); setTimeout(() => showRow(st, x, `${K.n} ${v.ckseason} · ${x[0]}`), 200); })), h('div', { style: { textAlign: 'right' } }, h('button', { class: 'btn ghost', onclick: () => close() }, '닫기')))], { clickClose: true });
  };
  if (rounds.length) root.append(h('div', { class: 'sec' }, h('h3', null, '토너먼트'), h('div', { class: 'sub' }, mxNote(v.ckseason)), h('div', { class: 'in tscroll' }, h('div', { class: 'bracket' }, ...rounds.map(r => h('div', { class: 'bcol' }, h('div', { class: 'lbl' }, r.n), h('div', { class: 'bms' }, ...r.t.map(t => h('div', { class: 'bm' + (t[0] === myId || t[1] === myId ? ' me' : '') + (list ? ' click' : ''), onclick: list ? () => openTie(r, t) : null }, ...[t[0], t[1]].map((id, k) => h('div', { class: 'bt' + (t[2] === id ? ' w' : '') }, clubCell(w, id, 16), t[3] != null ? h('b', null, k ? t[4] : t[3]) : null, t[5] && t[2] === id ? h('small', null, 'PK') : null)))))))))));
  if (K.ph) root.append(h('div', { class: 'sec' }, h('h3', null, '리그 페이즈 순위'), h('div', { class: 'in' }, leagueTable(s, { nation: '', tier: 9 }, K.ph, myId))));
  // 리그 페이즈 경기 (팀별)
  if (list && K.ph) {
    const ph = list.filter(x => x[0] === '리그 페이즈');
    const teams = K.ph.map(r => r[0]);
    if (!v.phT || !teams.includes(v.phT)) v.phT = teams.includes(myId) ? myId : teams[0];
    const mine = ph.filter(x => w.cix[x[1]] === v.phT || w.cix[x[2]] === v.phT);
    root.append(h('div', { class: 'sec' }, h('h3', null, '리그 페이즈 경기', sel(v.phT, teams.map(id => [id, clubName(w, id)]), x => { v.phT = x; rerender(); }, true)),
      h('div', { class: 'in fxlist' }, ...mine.map(x => fxRow(w, w.cix[x[1]], w.cix[x[2]], x[3], x[4], '', resOf({ a: w.cix[x[1]], b: w.cix[x[2]], ga: x[3], gb: x[4] }, v.phT), false, () => showRow(st, x, `${K.n} ${v.ckseason} · 리그 페이즈`))))));
  }
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
  const ilabel = `${+v.iy - 1}/${String(v.iy).slice(2)}`, ist = stOf(ilabel), ilist = ist && ist.INTL[v.ik];
  const iopen = (stage, a, b) => { if (!ilist) return; const row = findRow(ilist, stage, a, b, true); if (row) showRow(ist, row, `${T.n} ${T.y} · ${row[0]}`, true); };
  root.append(h('div', { class: 'sec' }, h('h3', null, '토너먼트 대진'), h('div', { class: 'sub' }, mxNote(ilabel)), h('div', { class: 'in tscroll' }, bracket(nm, T.ko, T.w, ilist ? (r, m) => iopen(r.n, m[0], m[1]) : null))));
  if (T.g && T.g.length) {
    const grid = h('div', { class: 'ggrid' }, ...T.g.map(g => h('div', { class: 'gcard' + (g.rows.some(r => r[0] === me) ? ' mine' : '') },
      h('div', { class: 'lbl' }, `${g.n}조`),
      h('table', { class: 'ltable' }, h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, '팀'), h('th', null, '득실'), h('th', null, '승점'))),
        h('tbody', null, ...g.rows.map((r, i) => h('tr', { class: r[0] === me ? 'me' : '' }, h('td', null, i + 1), h('td', null, nm(r[0])), h('td', null, (r[5] - r[6] > 0 ? '+' : '') + (r[5] - r[6])), h('td', null, h('b', null, r[7])))))),
      h('details', null, h('summary', null, '경기 결과'), h('div', { class: 'gms' }, ...g.m.map(m => h('div', { class: ilist ? 'click' : '', onclick: ilist ? () => iopen('조별리그', m[0], m[1]) : null }, h('span', null, C.natName(m[0])), h('b', null, `${m[2]} - ${m[3]}`), h('span', null, C.natName(m[1])))))))));
    root.append(h('div', { class: 'sec' }, h('h3', null, '조별리그'), h('div', { class: 'in' }, grid)));
  }
  const hk = (w.hist.nt || {})[v.ik] || [];
  if (hk.length) root.append(h('div', { class: 'sec' }, h('h3', null, `${C.TDEF[v.ik].name} 역대 우승`), h('div', { class: 'in' }, h('table', { class: 'ltable lc' }, h('tbody', null, ...hk.slice().reverse().map(x => h('tr', null, h('td', null, x.y), h('td', null, nm(x.c)))))))));
}

U.fxRow = fxRow;
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
