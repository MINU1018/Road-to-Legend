// 터치라인 커리어 — 리그·대회 페이지: 모든 나라 리그 순위, 득점·도움 순위, 컵, 대륙 대회, 국제 대회(월드컵 대진)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, flag, crest } = U;
const natCrest = (c, s) => U.natCrest(c, s);
const S = () => U.S();
const st = U.st;
const wv = () => (st.wv = st.wv || { mode: 'league' });
const rerender = () => U.stay();
// 대회 페이지로 바로 가기 (검색 결과 등): o = { k: 'lg'|'cup'|'cont'|'intl', id, nat }
U.openComp = function (o) {
  const v = wv();
  if (o.k === 'lg') { const l = S().w.lg[o.id]; v.mode = 'league'; v.nat = l ? l.nation : v.nat; v.lg = o.id; v.season = null; v.lsub = 'table'; }
  else if (o.k === 'cup') { v.mode = 'cup'; v.cnat = o.nat; v.cseason = null; }
  else if (o.k === 'cont') { v.mode = 'cont'; v.ck = o.id; v.ckseason = null; }
  else { v.mode = 'intl'; v.ik = o.id === 'UNL' || o.id === 'AM' ? null : o.id; v.iy = null; v.ifocus = o.id; }
  U.setTab('table');
};
// 국제 대회 일정 (앞으로 4년). 월드컵은 4년마다(2030·2034…), 유로·코파는 짝수 4년, 아시안컵·네이션스컵·골드컵은 홀수 해
function intlSchedule(s) {
  const w = s.w, y0 = w.cal ? C.ymd(w.cal.d)[0] : w.year, out = [];
  for (let y = y0; y <= y0 + 4; y++) for (const k of C.tournamentsOf(y)) out.push([y, k]);
  const when = k => k === 'ASIA' || k === 'AFCON' ? '1~2월' : '6~7월';
  return h('div', { class: 'sec' }, h('h3', null, '국제 대회 일정', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 대회 30일 전부터 이 화면에 대진이 열립니다 · 네이션스리그·친선 A매치는 A매치 기간(9·10·11·3·6월)')),
    h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...out.map(([y, k]) => h('div', { class: 'kvrow' + (k === 'WC' ? ' gold' : '') }, h('span', null, h('b', null, `${y}년`), ` ${C.TDEF[k].name}`), h('span', { class: 'mute' }, when(k))))));
}

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
// 'live' = 지금 진행 중인 대회들 (세계 달력). 끝난 대회는 연도별 보관 기록(w.arch)
const LIVE = 'live';
let _live = null;
function liveArch() {
  const s = S(), w = s.w; if (!w.cal) return { lg: {}, cup: {}, lcup: {}, cont: {} };
  const key = w.cal.d + '|' + (s.ss ? s.ss.matches.length : 0);
  if (_live && _live.w === w && _live.key === key) return _live.A;
  const A = { live: 1, lg: {}, cup: {}, lcup: {}, cont: {} };
  for (const id in w.cal.lg) { const L = C.liveLeague(s, id); if (L && (L.ri > 0 || true)) A.lg[id] = L; }
  for (const k in w.cal.cup) { const st = w.cal.cup[k]; (st.kind === 'cup' ? A.cup : A.lcup)[st.nat] = { n: st.n, k: st.kind, r: st.res.map(rd => ({ n: rd.n, m: rd.m.map(m => m.slice(0, 5)) })), w: null, ru: null, N: st.N, sl: st.label, live: 1, next: st.rounds[st.ri] ? [st.rounds[st.ri].n, st.dates[st.ri]] : null }; }
  for (const k in w.cal.cont) { const cs = w.cal.cont[k]; A.cont[cs.k] = { n: cs.name, w: cs.winner, sl: cs.label, live: 1, ph: cs.phaseN ? C.sortTable(cs.table).slice(0, 36).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) : null, r: (cs.ties || []).map((ts, i) => ({ n: (cs.rounds[i] || [])[2] || '', t: (ts || []).map(t => [t[0], t[1], t.win || null, t.sc ? t.sc[0] : null, t.sc ? t.sc[1] : null, t.pen ? 1 : 0]) })), next: cs.dates[cs.di] != null ? cs.dates[cs.di] : null }; }
  _live = { w, key, A, st: null };
  return A;
}
function liveSt() { liveArch(); if (!_live.st) _live.st = C.liveStore(S()); return _live.st; }
const archOf = (w, lb) => lb === LIVE ? liveArch() : (w.arch || {})[lb];
const seasons = w => (w.cal ? [LIVE] : []).concat(Object.keys(w.arch || {}).sort().reverse());
const seasonName = (lb, sl) => lb === LIVE ? `${sl || ''} 진행 중`.trim() : (sl && sl !== lb ? `${sl} (${lb})` : lb);
function userClubOf(s, label) { if (label === LIVE) return s.ss ? s.ss.club : null; const r = s.hist.find(x => x.label === label); return r ? r.club : null; }
U.liveArch = liveArch; U.liveSt = liveSt;
// 베스트 XI 경기장 그림 (4-3-3). xi: [[이름, 구단, 평점, 포지션, pid, 경기, 골, 도움]] (자리 순서: GK, LB, CB, CB, RB, CM×3, LW, ST, RW)
U.xiPitch = function (w, xi, o) {
  o = o || {};
  const card = (x, slot) => { if (!x) return h('div', { class: 'xic empty' }, slot); const c = w.clubs[x[1]];
    return h('div', { class: 'xic', onclick: x[4] ? () => U.openPlayer(x[4]) : null }, h('div', { class: 'xir' }, typeof x[2] === 'number' ? x[2].toFixed(2) : ''), U.crest ? U.crest(c || null, 22) : null, h('b', null, x[0].split(' ').slice(-1)[0]), h('span', { class: 'xis' }, `${slot}${o.stat !== false ? ` · ${x[6]}골 ${x[7]}도움` : ''}`)); };
  const S = C.XISLOTS || ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];
  const row = idx => h('div', { class: 'xirow' }, ...idx.map(i => card(xi[i], S[i])));
  return h('div', { class: 'xipitch' + (o.cls ? ' ' + o.cls : '') }, h('div', { class: 'xilines' }), row([8, 9, 10]), row([5, 6, 7]), row([1, 2, 3, 4]), row([0]));
};
// 예전 기록(베스트 XI 저장 전): 평점 순위로 대신 만든다
U.xiOf = data => { if (!data) return null; if (data.bx) return data.bx; if (!data.best || !C.pickXI) return null; const xi = C.pickXI(data.best.map(x => ({ pid: x[4] || x[0], n: x[0], club: x[1], pos: x[3], rt: x[2], apps: x[6] || 20, g: 0, a: 0 }))); return xi ? xi.map(x => [x.n, x.club, x.rt, x.pos, x.pid, x.apps, null, null]) : null; };
U.txView = (s, root) => txView(s, root);

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
  const ss_ = seasons(w).filter(lb => archOf(w, lb) && archOf(w, lb).lg[v.lg]);
  const opts = ss_.map(lb => [lb, seasonName(lb, archOf(w, lb).lg[v.lg].sl)]);
  if (!v.season || !opts.some(o => o[0] === v.season)) v.season = opts.length ? opts[0][0] : null;
  root.append(h('div', { class: 'wfilter' },
    sel(v.nat, nats.map(n => [n, C.natName(n)]), x => { v.nat = x; v.lg = null; v.season = null; rerender(); }),
    sel(v.lg, lgs.map(l => [l.id, `${l.tier}부 · ${l.name}`]), x => { v.lg = x; v.season = null; rerender(); }, true),
    opts.length ? sel(v.season, opts, x => { v.season = x; rerender(); }) : null));
  if (!lg) return;
  if (!v.season) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, `${lg.name} 기록은 첫 시즌이 끝난 뒤 쌓입니다.`))); return; }
  const data = archOf(w, v.season).lg[v.lg], rows = data.t, myId = userClubOf(s, v.season);
  const label = v.season, isLive = v.season === LIVE;
  const LS = isLive && w.cal.lg[v.lg];
  const title = h('h3', null, h('span', { class: 'cc' }, flag(lg.nation, 18), `${lg.name} · ${data.sl || label}${isLive ? ' 진행 중' : ''}`), U.followBtn ? U.followBtn('lg', lg.id, true) : null, isLive && LS ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${LS.ri}/${LS.dates.length}라운드 · ${C.fmtDateY(LS.dates[0])} ~ ${C.fmtDateY(LS.dates[LS.dates.length - 1])}`) : null);
  // 하위 탭: 순위 / 경기 결과 / 개인 기록 / 역대 우승
  const SUBS = [['table', '순위'], ['fx', '경기 결과'], ['team', '팀 통계'], ['rec', '개인 순위'], ['bxi', '베스트 XI'], ['pl', '선수 기록'], ['hist', '역대 우승']];
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
  } else if (v.lsub === 'fx') fixturesSec(s, root, lg, label, isLive);
  else if (v.lsub === 'team') teamStatsSec(s, root, lg, label, isLive, rows);
  else if (v.lsub === 'pl') playerStatsSec(s, root, lg, label, isLive, rows);
  else if (v.lsub === 'bxi') {
    const xi = U.xiOf(data);
    root.append(h('div', { class: 'sec' }, h('h3', null, `${lg.name} ${data.sl || label} 베스트 XI`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, isLive ? ' 지금까지 기록 기준 · 리그 경기 50% 이상 출전' : ' 시즌 평균 평점 + 공격 포인트 · 리그 경기 50% 이상 출전')),
      xi ? h('div', { class: 'in' }, U.xiPitch(w, xi, { stat: xi[0][6] != null })) : h('div', { class: 'empty' }, data.md ? '아직 출전 경기가 충분하지 않습니다.' : '하부 리그는 선수 기록이 없어 베스트 XI를 만들지 않습니다.')));
  }
  else if (v.lsub === 'rec') {
    if (data && (data.sc || data.as)) {
      root.append(h('div', { class: 'wgrid2' },
        h('div', { class: 'sec' }, h('h3', null, '득점 순위'), h('div', { class: 'in' }, leaders(s, data.sc, 'g'))),
        h('div', { class: 'sec' }, h('h3', null, '도움 순위'), h('div', { class: 'in' }, leaders(s, data.as, 'a')))));
      if (data.best && data.best.length) root.append(h('div', { class: 'sec' }, h('h3', null, '평점 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 리그 경기 40% 이상 출전')), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['#', '선수', '포지션', '경기', '평균 평점'].map(x => h('th', null, x)))),
        h('tbody', null, ...data.best.slice(0, 15).map((x, i) => h('tr', null, h('td', null, i + 1), h('td', null, h('div', { style: { display: 'grid', gap: '1px' } }, h('b', { class: x[4] ? 'lnk' : '', onclick: x[4] ? () => U.openPlayer(x[4]) : null }, x[0]), h('span', { class: 'mute', style: { fontSize: '11px' } }, clubCell(w, x[1], 14)))), h('td', null, h('span', { class: 'tpos' }, x[3])), h('td', null, x[6] || ''), h('td', null, U.rt2(x[2])))))))));
      root.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 4px' } }, data.md ? '모든 숫자는 이 리그 경기 기록(득점자·도움·출전 명단)을 더한 값입니다. 경기 결과 탭에서 경기별로 확인할 수 있습니다.' : '하부 리그(명단 없는 구단)는 팀 득점을 바탕으로 한 추정 기록입니다.'));
    } else root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, isLive ? '아직 기록이 없습니다.' : '기록 없음')));
  } else {
    const lh = (w.hist.lg[v.lg] || []).slice(-20).reverse();
    const top = y => { for (const lb in w.arch || {}) { const a = w.arch[lb].lg[v.lg]; if (a && (a.sl || lb) === y) return a.sc && a.sc[0] ? `${a.sc[0][0]} ${a.sc[0][2]}골` : ''; } return ''; };
    root.append(h('div', { class: 'sec' }, h('h3', null, '역대 우승'), lh.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, h('th', null, '시즌'), h('th', null, '우승'), h('th', null, '득점왕'))), h('tbody', null, ...lh.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)), h('td', { class: 'mute' }, top(x.y))))))) : h('div', { class: 'empty' }, '아직 없습니다.')));
  }
}
// ---------- 선수 기록: 이 리그 이 시즌에 뛴 모든 선수 (진행 중이면 지금까지) ----------
const PGRP = { GK: 'GK', CB: 'DF', LB: 'DF', RB: 'DF', LWB: 'DF', RWB: 'DF', CDM: 'MF', CM: 'MF', CAM: 'MF', LM: 'MF', RM: 'MF', LW: 'FW', RW: 'FW', ST: 'FW', CF: 'FW' };
function playerStatsSec(s, root, lg, label, live, table) {
  const w = s.w, v = wv(), list = [];
  const PM = {}; for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite || !c.sq) continue; for (const e of c.sq) PM[String(e[0])] = e[1]; }
  const posOf = pid => pid === 'ME' ? s.p.pos : PM[pid] || ((w.ps && w.ps[pid]) || {}).pos || '';
  if (live) {
    const LS = w.cal.lg[lg.id], hh = LS && w.cal.h[LS.k], agg = (hh && hh.agg) || {};
    for (const pid in agg) { if (pid[0] === '~') continue; const a = agg[pid]; list.push({ pid, club: C.cidOf(w, a[0]), apps: a[1], st: a[2], min: a[3], g: a[4], a: a[5], y: a[6], r: a[7], rt: a[1] ? a[8] / 10 / a[1] : 0, cs: a[9] }); }
  } else {
    const yOff = +String(label).slice(0, 4) - 2000, clubs = new Set((table || []).map(r => r[0]));
    const ck = lg.id + '|' + label;
    if (!v._psc || v._psc.k !== ck) {
      const out = [];
      for (const pid in w.ps || {}) { const P = w.ps[pid]; if (!P.h) continue; for (const x of C.psHist(P)) { const y = x[0] < 1000 ? x[0] : x[0] - 2000; if (y !== yOff) continue; const cid = C.cidOf(w, x[1]); if (!clubs.has(cid)) continue; out.push({ pid, club: cid, apps: +x[2], st: null, min: x[9] === '' || x[9] == null ? null : +x[9], g: +x[3], a: +x[4], y: null, r: null, rt: x[5] / 100, cs: +x[10] || 0 }); } }
      Object.defineProperty(v, '_psc', { value: { k: ck, out }, writable: true, configurable: true, enumerable: false });
    }
    list.push(...v._psc.out.filter(x => x.apps > 0));
  }
  if (!list.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, live ? '아직 기록이 없습니다.' : '이 시즌의 선수 기록이 없습니다.'))); return; }
  const teams = [...new Set(list.map(x => x.club))].filter(id => w.clubs[id]).sort((a, b) => w.clubs[a].name.localeCompare(w.clubs[b].name, 'ko'));
  if (v.psT && !teams.includes(v.psT)) v.psT = '';
  const K = v.psK || 'g', G = v.psG || '';
  const f = list.filter(x => (!v.psT || x.club === v.psT) && (!G || PGRP[posOf(x.pid)] === G) && x.apps >= (v.psM || 1));
  const val = { g: x => x.g, a: x => x.a, ga: x => x.g + x.a, apps: x => x.apps, min: x => x.min || 0, rt: x => x.apps >= Math.max(3, (live ? (w.cal.lg[lg.id] || {}).ri || 10 : 30) * .3) ? x.rt : -1, cs: x => x.cs, y: x => x.y || 0 };
  f.sort((x, z) => val[K](z) - val[K](x) || z.g - x.g || x.apps - z.apps);
  const th = (k, l) => h('th', { class: 'click' + (K === k ? ' on' : ''), onclick: () => { v.psK = k; rerender(); } }, l + (K === k ? ' ▾' : ''));
  root.append(h('div', { class: 'wfilter' },
    sel(v.psT || '', [['', '모든 팀']].concat(teams.map(id => [id, w.clubs[id].name])), x => { v.psT = x; rerender(); }, true),
    sel(G, [['', '모든 포지션'], ['FW', '공격수'], ['MF', '미드필더'], ['DF', '수비수'], ['GK', '골키퍼']], x => { v.psG = x; rerender(); }),
    sel(v.psM || 1, [[1, '1경기 이상'], [5, '5경기 이상'], [10, '10경기 이상'], [20, '20경기 이상']], x => { v.psM = +x; rerender(); })));
  root.append(h('div', { class: 'sec' }, h('h3', null, `선수 기록 ${f.length}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 이 리그 경기만 · 머리글을 누르면 정렬 · 평점은 ${live ? '' : ''}일정 경기 수 이상만 순위`)), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc pst', style: { minWidth: '760px' } },
    h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, '선수'), h('th', null, '팀'), h('th', null, '포지션'), th('apps', '경기'), th('min', '출전시간'), th('g', '골'), th('a', '도움'), th('ga', '공격P'), live ? th('y', '경고') : null, th('cs', '클린시트'), th('rt', '평점'))),
    h('tbody', null, ...f.slice(0, 150).map((x, i) => h('tr', { class: x.pid === 'ME' ? 'me' : '' }, h('td', null, i + 1),
      h('td', null, h('b', { class: 'lnk', onclick: () => x.pid === 'ME' ? U.setTab('profile') : U.openPlayer(x.pid) }, x.pid === 'ME' ? `${s.p.name} (나)` : C.MD.nameOf(x.pid))), h('td', null, clubCell(w, x.club, 14, true)), h('td', null, h('span', { class: 'tpos' }, posOf(x.pid))),
      h('td', null, x.st != null ? `${x.apps} (${x.st})` : x.apps), h('td', { class: 'mute' }, x.min != null ? `${x.min.toLocaleString()}'` : '-'), h('td', null, h('b', null, x.g)), h('td', null, x.a), h('td', null, x.g + x.a), live ? h('td', null, x.y ? `${x.y}${x.r ? ` · 퇴장 ${x.r}` : ''}` : (x.r ? `퇴장 ${x.r}` : '')) : null, h('td', null, x.cs || ''), h('td', null, U.rt2 ? U.rt2(x.rt) : x.rt.toFixed(2)))))))));
}
// ---------- 경기 결과 (라운드별·팀별) ----------
function fixturesSec(s, root, lg, label, live) {
  const w = s.w, v = wv();
  let rows = [], st = null, L = null, up = [];
  if (live) {
    const x = C.liveLeagueRows(s, lg.id); if (!x) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '진행 중인 시즌이 없습니다.'))); return; }
    st = liveSt(); L = x.L; rows = C.MD.leagueRows(w, L); up = x.up;
  } else {
    if (!(w.mxKeys || []).includes(label)) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이 시즌은 경기별 기록이 없습니다 (이전 버전에서 지워진 시즌). (이 기능이 추가되기 전 시즌은 기록이 없습니다)'))); return; }
    st = U.withMx(label, () => rerender());
    if (!st) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록을 불러오는 중…'))); return; }
    L = st.L[lg.id]; rows = C.MD.leagueRows(w, L);
  }
  // 아직 치르지 않은 라운드 (진행 중 시즌)
  const pend = []; for (const u of up) u.m.forEach(([a, b]) => pend.push({ r: u.r, d: u.d, a, b, pend: 1 }));
  const allR = rows.concat(pend);
  if (!allR.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록이 없습니다.'))); return; }
  const nR = Math.max(...allR.map(r => r.r)) + 1;
  const dateOfR = {}; for (const r of allR) if (r.d != null && dateOfR[r.r] == null) dateOfR[r.r] = r.d;
  const key = lg.id + '|' + label;
  if (v.fxKey !== key) { v.fxKey = key; v.fxR = live ? Math.max(0, (rows.length ? Math.max(...rows.map(r => r.r)) : 0)) : 0; v.fxT = ''; }
  const myClub = userClubOf(s, label);
  const teams = lg.clubs.slice().sort((a, b) => ((w.clubs[a] || {}).name || '').localeCompare((w.clubs[b] || {}).name || '', 'ko'));
  const rl = i => `${i + 1}라운드${dateOfR[i] != null ? ' · ' + C.fmtDate(dateOfR[i]) : ''}`;
  const bar = h('div', { class: 'wfilter' },
    h('div', { class: 'seg', style: { flex: '0 0 auto' } }, h('button', { class: !v.fxT ? 'on' : '', onclick: () => { v.fxT = ''; rerender(); } }, '라운드별'), h('button', { class: v.fxT ? 'on' : '', onclick: () => { v.fxT = v.fxT || myClub || lg.clubs[0]; rerender(); } }, '팀별')),
    !v.fxT ? h('div', { class: 'rnav' }, h('button', { class: 'btn ghost sm', disabled: v.fxR <= 0 ? true : null, onclick: () => { v.fxR--; rerender(); } }, '‹'), sel(v.fxR, Array.from({ length: nR }, (_, i) => [i, rl(i)]), x => { v.fxR = +x; rerender(); }), h('button', { class: 'btn ghost sm', disabled: v.fxR >= nR - 1 ? true : null, onclick: () => { v.fxR++; rerender(); } }, '›'))
      : sel(v.fxT, teams.map(id => [id, (w.clubs[id] || {}).name || id]), x => { v.fxT = x; rerender(); }, true));
  root.append(bar);
  const list = (v.fxT ? allR.filter(r => r.a === v.fxT || r.b === v.fxT) : allR.filter(r => r.r === v.fxR)).sort((a, b) => (a.d || 0) - (b.d || 0) || a.r - b.r);
  const sp = ppgStr(w, lg.id, label);
  const open = r => {
    if (r.pend) return;
    if (!r.det) { U.toast('이 경기는 상세 기록이 없습니다.'); return; }
    U.showMatch({ title: `${lg.name} ${(archOf(w, label).lg[lg.id] || {}).sl || label} · ${r.r + 1}라운드${r.d != null ? ' · ' + C.fmtDateY(r.d) : ''}`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: C.MD.leagueMatch(st, L, r.i), key: key + '|' + r.i, sa: sp(r.a), sb: sp(r.b), ctx: { st, lg: lg.id, L, i: r.i, date: r.d } });
  };
  const row = r => r.pend ? h('div', { class: 'fx pend' + (r.a === myClub || r.b === myClub ? ' me' : '') }, h('span', { class: 'mute fr' }, v.fxT ? `${r.r + 1}R` : ''), h('span', { class: 'fh' }, teamTag(w, r.a, false, true)), h('b', { class: 'fs mute' }, r.d != null ? C.fmtDate(r.d) : 'vs'), h('span', { class: 'fa' }, teamTag(w, r.b, false, false)), h('span', { class: 'mute', style: { fontSize: '11px' } }, '예정'))
    : fxRow(w, r.a, r.b, r.ga, r.gb, v.fxT ? `${r.r + 1}R` : '', v.fxT ? resOf(r, v.fxT) : '', r.a === myClub || r.b === myClub, () => open(r));
  root.append(h('div', { class: 'sec' }, h('h3', null, v.fxT ? `${(w.clubs[v.fxT] || {}).name} 경기 (${list.length})` : rl(v.fxR), h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 경기를 누르면 상세 기록')),
    h('div', { class: 'in fxlist' }, ...list.map(row))));
}
// 경기 한 줄 (구단 이름은 링크가 아니라 줄 전체가 경기 상세 버튼)
function teamTag(w, id, nat, right) { const c = nat ? null : w.clubs[id]; return h('span', { class: 'cc' }, ...(right ? [] : [nat ? U.natCrest(id, 18) : crest(c || null, 18)]), h('span', null, nat ? C.natName(id) : c ? c.name : '해체된 구단'), ...(right ? [nat ? U.natCrest(id, 18) : crest(c || null, 18)] : [])); }
function fxRow(w, a, b, ga, gb, tag, res, mine, onclick, nat) {
  return h('button', { class: 'fx' + (mine ? ' me' : ''), onclick },
    h('span', { class: 'mute fr' }, tag || ''),
    h('span', { class: 'fh' }, teamTag(w, a, nat, true)), h('b', { class: 'fs' }, `${ga} - ${gb}`), h('span', { class: 'fa' }, teamTag(w, b, nat, false)),
    h('span', { class: res ? 'res ' + res : '' }, res ? ({ W: '승', D: '무', L: '패' })[res] : ''));
}
// 경기 통계(점유율·슈팅) 계산용 팀 수준: 그 시즌 승점 페이스 (시즌이 지나도 값이 바뀌지 않도록)
function ppgStr(w, lid, label) {
  const A = archOf(w, label), L = A && A.lg[lid], m = {};
  if (L && L.t) for (const r of L.t) m[r[0]] = r[1] ? r[7] / r[1] : 1.4;
  return id => 60 + (m[id] != null ? m[id] : 1.4) * 8;
}
// ---------- 팀 통계·지표 ----------
const METRICS = [['pts', '승점', 0], ['gfpg', '경기당 득점', 2], ['gapg', '경기당 실점', 2, 1], ['cs', '클린시트', 0], ['fts', '무득점 경기', 0, 1], ['hpts', '홈 승점', 0], ['apts', '원정 승점', 0], ['btts', '양팀 득점 비율', '%'], ['o25', '2.5골 이상 비율', '%'], ['first', '선제골 경기', 0], ['firstW', '선제골 시 승률', '%'], ['comeback', '역전승', 0], ['late', '76분 이후 득점', 0], ['yc', '경고', 0, 1], ['rc', '퇴장', 0, 1], ['pos', '평균 점유율', '%'], ['shpg', '경기당 슈팅', 1]];
const BINS = ['1-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
function teamStatsSec(s, root, lg, label, live, tableRows) {
  const w = s.w, v = wv();
  let rows = [], st = null, L = null;
  if (live) { const x = C.liveLeagueRows(s, lg.id); if (x) { st = liveSt(); L = x.L; rows = C.MD.leagueRows(w, L); } }
  else {
    if ((w.mxKeys || []).includes(label)) { st = U.withMx(label, () => rerender()); if (!st) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록을 불러오는 중…'))); return; } L = st.L[lg.id]; rows = C.MD.leagueRows(w, L); }
  }
  if (!rows.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, live ? '아직 경기가 없습니다.' : '팀 통계는 경기 기록이 남아 있는 시즌만 볼 수 있습니다.'))); return; }
  const sp = ppgStr(w, lg.id, label), T = {};
  const t0 = id => T[id] || (T[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, hp: 0, hw: 0, hd: 0, hl: 0, hgf: 0, hga: 0, ap: 0, aw: 0, ad: 0, al: 0, agf: 0, aga: 0, cs: 0, fts: 0, btts: 0, o25: 0, first: 0, firstW: 0, comeback: 0, late: 0, yc: 0, rc: 0, posS: 0, sh: 0, binF: [0, 0, 0, 0, 0, 0], binA: [0, 0, 0, 0, 0, 0], det: 0 });
  for (const r of rows) {
    const A = t0(r.a), B = t0(r.b);
    for (const [X, f, a, home] of [[A, r.ga, r.gb, 1], [B, r.gb, r.ga, 0]]) {
      X.p++; X.gf += f; X.ga += a; const res = f > a ? 'w' : f < a ? 'l' : 'd'; X[res]++;
      const pre = home ? 'h' : 'a'; X[pre + 'p']++; X[pre + res]++; X[pre + 'gf'] += f; X[pre + 'ga'] += a;
      if (!a) X.cs++; if (!f) X.fts++; if (f && a) X.btts++; if (f + a > 2) X.o25++;
    }
    if (st && L && L.e) {
      const d = C.MD.leagueMatch(st, L, r.i), goals = d.ev.filter(e => 'gpo'.includes(e.k)).sort((x, y) => x.m - y.m);
      A.det++; B.det++;
      for (const e of goals) { const X = e.s ? B : A, Y = e.s ? A : B, bi = Math.min(5, Math.floor((e.m - 1) / 15)); X.binF[bi]++; Y.binA[bi]++; if (e.m > 75) X.late++; }
      for (const e of d.ev) { const X = e.s ? B : A; if (e.k === 'y') X.yc++; else if ('r2'.includes(e.k)) X.rc++; }
      if (goals.length) { const fs = goals[0].s ? B : A, other = fs === A ? B : A, fsF = fs === A ? r.ga : r.gb, fsA = fs === A ? r.gb : r.ga; fs.first++; if (fsF > fsA) fs.firstW++; if (fsF < fsA) other.comeback++; }
      const ts = C.MD.teamStats(lg.id + '|' + label + '|' + r.i, sp(r.a), sp(r.b), r.ga, r.gb);
      A.posS += ts.pos[0]; B.posS += ts.pos[1]; A.sh += ts.sh[0]; B.sh += ts.sh[1];
    }
  }
  const det = Object.values(T).some(x => x.det);
  const val = (x, k) => ({ pts: x.w * 3 + x.d, gfpg: x.gf / x.p, gapg: x.ga / x.p, hpts: x.hw * 3 + x.hd, apts: x.aw * 3 + x.ad, btts: x.btts / x.p * 100, o25: x.o25 / x.p * 100, firstW: x.first ? x.firstW / x.first * 100 : 0, pos: x.det ? x.posS / x.det : 0, shpg: x.det ? x.sh / x.det : 0 })[k] ?? x[k];
  const mets = METRICS.filter(m => det || !['first', 'firstW', 'comeback', 'late', 'yc', 'rc', 'pos', 'shpg'].includes(m[0]));
  if (!mets.some(m => m[0] === v.tsm)) v.tsm = 'gfpg';
  const M = mets.find(m => m[0] === v.tsm), fmt = (x) => M[2] === '%' ? Math.round(x) + '%' : (+x).toFixed(typeof M[2] === 'number' ? M[2] : 0);
  const list = Object.values(T).sort((a, b) => (M[3] ? 1 : -1) * (val(a, M[0]) - val(b, M[0])));
  const mx = Math.max(...list.map(x => Math.abs(val(x, M[0]))), .01);
  root.append(h('div', { class: 'sec' }, h('h3', null, '지표 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, live ? ' 진행 중 · 지금까지 경기 기록 합계' : ' 경기 기록 합계')),
    h('div', { class: 'in' }, h('div', { class: 'fchips' }, ...mets.map(([k, l]) => h('button', { class: v.tsm === k ? 'on' : '', onclick: () => { v.tsm = k; rerender(); } }, l))),
      h('div', { class: 'mbars' }, ...list.map((x, i) => h('div', { class: 'mbr' + (x.id === userClubOf(s, label) ? ' me' : '') }, h('span', { class: 'mute' }, i + 1), h('span', { class: 'cc' }, crest(w.clubs[x.id] || null, 16), h('span', null, (w.clubs[x.id] || {}).name || '')), h('div', { class: 'mbar r' }, h('i', { style: { width: (Math.abs(val(x, M[0])) / mx * 100) + '%' } })), h('b', null, fmt(val(x, M[0])))))))));
  // 홈/원정 표
  const order = (tableRows || []).map(r => r[0]).filter(id => T[id]);
  const ordered = order.length ? order.map(id => T[id]) : Object.values(T);
  root.append(h('div', { class: 'sec' }, h('h3', null, '홈 / 원정 성적'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '760px' } },
    h('thead', null, h('tr', null, ...['#', '팀', '홈 승무패', '홈 득실', '홈 승점', '원정 승무패', '원정 득실', '원정 승점', '클린시트', '무득점'].map(x => h('th', null, x)))),
    h('tbody', null, ...ordered.map((x, i) => h('tr', null, h('td', null, i + 1), h('td', null, clubCell(w, x.id, 16)), h('td', null, `${x.hw}-${x.hd}-${x.hl}`), h('td', null, `${x.hgf}:${x.hga}`), h('td', null, h('b', null, x.hw * 3 + x.hd)), h('td', null, `${x.aw}-${x.ad}-${x.al}`), h('td', null, `${x.agf}:${x.aga}`), h('td', null, h('b', null, x.aw * 3 + x.ad)), h('td', null, x.cs), h('td', null, x.fts))))))));
  // 득점 시간 분포
  if (det) {
    if (!v.tsT || !T[v.tsT]) v.tsT = userClubOf(s, label) || ordered[0].id; if (!T[v.tsT]) v.tsT = ordered[0].id;
    const X = T[v.tsT], mb = Math.max(1, ...X.binF, ...X.binA);
    root.append(h('div', { class: 'sec' }, h('h3', null, '득점·실점 시간대', sel(v.tsT, ordered.map(x => [x.id, (w.clubs[x.id] || {}).name || x.id]), x => { v.tsT = x; rerender(); }, true)),
      h('div', { class: 'in' }, h('div', { class: 'tbins' }, ...BINS.map((b, i) => h('div', null, h('div', { class: 'tb2' }, h('i', { class: 'f', style: { height: (X.binF[i] / mb * 100) + '%' }, title: `득점 ${X.binF[i]}` }), h('i', { class: 'a', style: { height: (X.binA[i] / mb * 100) + '%' }, title: `실점 ${X.binA[i]}` })), h('div', { class: 'mute' }, b + "'"), h('div', null, h('b', null, X.binF[i]), h('span', { class: 'mute' }, ` / ${X.binA[i]}`))))),
        h('div', { class: 'mute', style: { fontSize: '12px' } }, `득점(금색) / 실점(회색) · 합계 ${X.gf}득점 ${X.ga}실점 (자책골 포함)`))));
  }
}
const resOf = (r, id) => { const f = r.a === id ? r.ga : r.gb, a = r.a === id ? r.gb : r.ga; return f > a ? 'W' : f < a ? 'L' : 'D'; };

// ---------- 대회 기록 (컵·대륙·국제 대회 공통): 경기 기록을 더해서 개인·팀 순위 ----------
const _csCache = {};
function compAgg(st, rows, nat, ck) {
  if (ck && _csCache[ck] && _csCache[ck].rows === rows && _csCache[ck].n === rows.length) return _csCache[ck].v;
  const w = S().w, tid = x => nat ? x : (typeof x === 'number' ? w.cix[x] : x);
  const P = {}, T = {};
  const p0 = (id, team) => P[id] || (P[id] = { id, team, apps: 0, st: 0, g: 0, pk: 0, a: 0, y: 0, r: 0, rs: 0 });
  const t0 = id => T[id] || (T[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, cs: 0, pw: 0, yc: 0, rc: 0 });
  for (const row of rows) {
    const a = tid(row[1]), b = tid(row[2]), ga = row[3], gb = row[4];
    for (const [id, f, x] of [[a, ga, gb], [b, gb, ga]]) { const t = t0(id); t.p++; t.gf += f; t.ga += x; if (f > x) t.w++; else if (f < x) t.l++; else t.d++; if (!x) t.cs++; }
    if (row[7] != null) { const t = T[tid(row[7])]; if (t) t.pw++; }
    const d = C.MD.decode(st, row), teams = [a, b];
    if (d.ln) d.ln.forEach((side, k) => side.forEach(x => { if (!x.id || x.id[0] === '~') return; const q = p0(x.id, teams[k]); q.team = teams[k]; q.apps++; if (x.start) q.st++; q.rs += x.rt; }));
    for (const e of d.ev) {
      const team = teams[e.s];
      if (e.k === 'y' || e.k === 'r' || e.k === '2') { const t = T[team]; if (e.k === 'y') t.yc++; else t.rc++; }
      if (!e.p || e.p[0] === '~') continue;
      if (e.k === 'g' || e.k === 'p') { const q = p0(e.p, team); q.g++; if (e.k === 'p') q.pk++; if (e.a && e.a[0] !== '~') p0(e.a, team).a++; }
      else if (e.k === 'y') p0(e.p, team).y++;
      else if (e.k === 'r' || e.k === '2') p0(e.p, team).r++;
    }
  }
  const v = { P: Object.values(P), T: Object.values(T), n: rows.length };
  if (ck) _csCache[ck] = { rows, v, n: rows.length };
  return v;
}
function compRecSec(s, root, label, rowsOf, nat, ck, note) {
  const w = s.w, v = wv();
  if (label !== LIVE && !(w.mxKeys || []).includes(label)) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '개인 기록·팀 통계는 경기 기록이 남아 있는 시즌만 볼 수 있습니다. (선수별 대회 기록은 선수 정보에서 계속 볼 수 있습니다)'))); return; }
  const st = stOf(label);
  if (!st) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록을 불러오는 중…'))); return; }
  const rows = rowsOf(st);
  if (!rows || !rows.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이 대회의 경기 기록이 없습니다.'))); return; }
  const A = compAgg(st, rows, nat, ck);
  const pn = id => id === 'ME' ? s.p.name + ' (나)' : C.MD.nameOf(id, s);
  const team = id => nat ? h('span', { class: 'cc' }, natCrest(id, 14), h('span', null, C.natName(id))) : clubCell(w, id, 14);
  const pcell = q => h('div', { style: { display: 'grid', gap: '1px' } }, h('b', { class: q.id === 'ME' ? '' : 'lnk', onclick: q.id === 'ME' ? () => U.setTab('profile') : () => U.openPlayer(q.id) }, pn(q.id)), h('span', { class: 'mute', style: { fontSize: '11px' } }, team(q.team)));
  const KS = [['g', '득점'], ['a', '도움'], ['ga', '공격포인트'], ['rt', '평점'], ['apps', '출전'], ['card', '경고·퇴장']];
  if (!KS.some(k => k[0] === v.crk)) v.crk = 'g';
  const maxApps = Math.max(1, ...A.P.map(q => q.apps));
  const minApps = Math.max(1, Math.ceil(maxApps * .5));
  const val = (q, k) => k === 'ga' ? q.g + q.a : k === 'rt' ? (q.apps ? q.rs / q.apps : 0) : k === 'card' ? q.y + q.r * 3 : q[k];
  let list = A.P.filter(q => v.crk === 'rt' ? q.apps >= minApps : val(q, v.crk) > 0);
  list.sort((x, y) => val(y, v.crk) - val(x, v.crk) || (v.crk === 'g' ? y.a - x.a || x.apps - y.apps : v.crk === 'a' ? y.g - x.g : y.apps - x.apps));
  const tg = A.P.reduce((a, q) => a + q.g, 0), og = A.T.reduce((a, t) => a + t.gf, 0) - tg;
  root.append(h('div', { class: 'sec' }, h('h3', null, '개인 기록', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${A.n}경기 · 선수 득점 ${tg} + 자책골 ${og} = 총 ${tg + og}골`)),
    h('div', { class: 'in' }, h('div', { class: 'fchips' }, ...KS.map(([k, l]) => h('button', { class: v.crk === k ? 'on' : '', onclick: () => { v.crk = k; rerender(); } }, l))),
      list.length ? h('div', { class: 'tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['#', '선수', '경기', '선발', '골', 'PK', '도움', '경고', '퇴장', '평점'].map(x => h('th', null, x)))),
        h('tbody', null, ...list.slice(0, 30).map((q, i) => h('tr', { class: q.id === 'ME' ? 'me' : '' }, h('td', null, i + 1), h('td', null, pcell(q)), h('td', null, q.apps), h('td', null, q.st), h('td', null, v.crk === 'g' ? h('b', null, q.g) : q.g), h('td', null, q.pk || ''), h('td', null, v.crk === 'a' ? h('b', null, q.a) : q.a), h('td', null, q.y || ''), h('td', null, q.r || ''), h('td', null, q.apps ? (v.crk === 'rt' ? h('b', null, U.rt2(q.rs / q.apps)) : U.rt2(q.rs / q.apps)) : '-')))))) : h('div', { class: 'empty' }, '기록 없음'),
      h('div', { class: 'mute', style: { fontSize: '11px', marginTop: '6px' } }, (v.crk === 'rt' ? `평점 순위는 ${minApps}경기 이상 출전 선수. ` : '') + (note || '모든 숫자는 이 대회 경기 기록(득점자·도움·카드·출전 명단)을 더한 값입니다.')))));
  // 팀 통계
  const TK = [['gf', '득점'], ['ga', '실점'], ['gpg', '경기당 득점'], ['cs', '클린시트'], ['w', '승리'], ['yc', '경고']];
  if (!TK.some(k => k[0] === v.ctk)) v.ctk = 'gf';
  const tv = (t, k) => k === 'gpg' ? t.gf / t.p : t[k];
  const tl = A.T.slice().sort((x, y) => (v.ctk === 'ga' ? tv(x, 'ga') - tv(y, 'ga') : tv(y, v.ctk) - tv(x, v.ctk)) || y.p - x.p);
  root.append(h('div', { class: 'sec' }, h('h3', null, '팀 통계', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${A.T.length}팀 · 열을 고르면 정렬 (승부차기 경기는 무승부로 계산)`)),
    h('div', { class: 'in' }, h('div', { class: 'fchips' }, ...TK.map(([k, l]) => h('button', { class: v.ctk === k ? 'on' : '', onclick: () => { v.ctk = k; rerender(); } }, l))),
      h('div', { class: 'tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '620px' } }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득점', '실점', '경기당 득점', '클린시트', '승부차기 승', '경고', '퇴장'].map(x => h('th', null, x)))),
        h('tbody', null, ...tl.slice(0, 64).map((t, i) => h('tr', null, h('td', null, i + 1), h('td', null, team(t.id)), h('td', null, t.p), h('td', null, t.w), h('td', null, t.d), h('td', null, t.l), h('td', null, h('b', null, t.gf)), h('td', null, t.ga), h('td', null, (t.gf / t.p).toFixed(2)), h('td', null, t.cs), h('td', null, t.pw || ''), h('td', null, t.yc), h('td', null, t.rc || '')))))),
      tl.length > 64 ? h('div', { class: 'mute', style: { fontSize: '11px' } }, `상위 64팀 표시 (전체 ${tl.length}팀)`) : null)));
}
function subTabs(key, list) {
  const v = wv(); if (!list.some(x => x[0] === v[key])) v[key] = list[0][0];
  return h('div', { class: 'seg lsub' }, ...list.map(([k, l]) => h('button', { class: v[key] === k ? 'on' : '', onclick: () => { v[key] = k; rerender(); } }, l)));
}

// ---------- 컵 ----------
function bracket(nameOf, rounds, finalWinner, onMatch) {
  return h('div', { class: 'bracket' }, ...rounds.map(r => h('div', { class: 'bcol' }, h('div', { class: 'lbl' }, r.n), h('div', { class: 'bms' }, ...r.m.map(m => {
    const win = m[4] || (m[2] > m[3] ? m[0] : m[2] < m[3] ? m[1] : null);
    const row = (id, g, other) => h('div', { class: 'bt' + (win === id ? ' w' : '') }, nameOf(id), h('b', null, g), m[4] && m[4] === id ? h('small', null, 'PK') : null);
    return h('div', { class: 'bm' + (onMatch ? ' click' : ''), title: onMatch ? '경기 상세 보기' : null, onclick: onMatch ? () => onMatch(r, m) : null }, row(m[0], m[2]), row(m[1], m[3]));
  })))), finalWinner ? h('div', { class: 'bcol champ' }, h('div', { class: 'lbl' }, '우승'), h('div', { class: 'bms' }, h('div', { class: 'bm gold' }, h('div', { class: 'bt w' }, nameOf(finalWinner))))) : null);
}
// 시즌 경기 기록에서 한 경기 찾아 보여주기
const stOf = label => label === LIVE ? liveSt() : (S().w.mxKeys || []).includes(label) ? U.withMx(label, () => rerender()) : null;
const mxNote = label => label === LIVE ? '진행 중 · 경기를 누르면 득점자·카드·출전 명단' : (S().w.mxKeys || []).includes(label) ? (U.mxCached(label) ? '경기를 누르면 득점자·카드·출전 명단' : '경기 기록 불러오는 중…') : '이 시즌은 경기별 상세 기록이 없습니다';
function showRow(st, row, title, nat, grp, gk) {
  const w = S().w, id = x => nat ? x : (typeof x === 'number' ? w.cix[x] : x);
  U.showMatch({ title, a: id(row[1]), b: id(row[2]), ga: row[3], gb: row[4], pw: row[7] != null ? id(row[7]) : null, d: C.MD.decode(st, row), nat, key: title + '|' + row[1] + '|' + row[2], ctx: grp ? { st, grp, key: gk, stage: row[0], date: row[8] } : null });
}
function findRow(list, stage, a, b, nat) {
  const w = S().w, k = x => nat ? x : C.cix(w, x);
  return (list || []).find(r => (stage == null || String(r[0]).startsWith(stage)) && r[1] === k(a) && r[2] === k(b)) || null;
}
function cupView(s, root) {
  const w = s.w, v = wv();
  const nats = nationList(s).filter(n => C.CUPNAME[n] || C.LCUPNAME[n]);
  if (!v.cnat || !nats.includes(v.cnat)) v.cnat = nats.includes(wv().nat) ? wv().nat : nats[0];
  const ss_ = seasons(w).filter(lb => archOf(w, lb) && (archOf(w, lb).cup[v.cnat] || archOf(w, lb).lcup[v.cnat]));
  if (!v.cseason || !ss_.includes(v.cseason)) v.cseason = ss_[0];
  root.append(h('div', { class: 'wfilter' }, sel(v.cnat, nats.map(n => [n, C.natName(n)]), x => { v.cnat = x; v.cseason = null; rerender(); }), ss_.length ? sel(v.cseason, ss_.map(x => { const a = archOf(w, x), c = a.cup[v.cnat] || a.lcup[v.cnat]; return [x, seasonName(x, c && c.sl)]; }), x => { v.cseason = x; rerender(); }) : null));
  if (!v.cseason) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '컵 대회 기록은 첫 시즌이 끝난 뒤 쌓입니다.'))); return; }
  const A = archOf(w, v.cseason);
  const nm = id => clubCell(w, id, 16);
  const st = stOf(v.cseason), myId = userClubOf(s, v.cseason);
  const cups = [A.cup[v.cnat], A.lcup[v.cnat]].filter(Boolean);
  if (!cups.some(c => c.k === v.ckind)) v.ckind = cups[0].k;
  if (cups.length > 1) root.append(h('div', { class: 'seg lsub' }, ...cups.map(c => h('button', { class: v.ckind === c.k ? 'on' : '', onclick: () => { v.ckind = c.k; rerender(); } }, c.n))));
  const cup = cups.find(c => c.k === v.ckind);
  root.append(subTabs('csub', [['br', '대진'], ['fx', '라운드별 결과'], ['rec', '개인 기록·팀 통계']]));
  const list = st && st.CUP[v.cnat + ':' + cup.k];
  const on = list ? (r, m) => { const row = findRow(list, r.n, m[0], m[1]); if (row) showRow(st, row, `${cup.n} ${v.cseason} · ${r.n}`, false, 'CUP', v.cnat + ':' + cup.k); } : null;
  const head = h('h3', null, h('span', { class: 'cc' }, U.trophy ? U.trophy(cup.k === 'cup' ? 'cup' : 'lcup', 18, '#f2c14e') : null, `${cup.n} ${cup.sl || v.cseason}`), cup.live ? h('span', { class: 'chip good' }, cup.next ? `진행 중 · 다음 ${cup.next[0]} ${C.fmtDateY(cup.next[1])}` : '진행 중') : h('span', { class: 'chip gold' }, '우승 ', w.clubs[cup.w] ? w.clubs[cup.w].name : ''));
  const meta = `${cup.N ? cup.N + '팀 참가 · ' : ''}${cup.r.length}라운드 (${cup.r.map(r => r.n).join(' → ')})`;
  if (cup.live && w.cal) { const lst = Object.values(w.cal.cup).find(x => x.nat === v.cnat && x.kind === cup.k); const drs = lst ? (lst.draws || []).filter(dr => dr.d == null || dr.d <= w.cal.d).slice().reverse() : [];
    if (drs.length) root.append(h('div', { class: 'drday' }, h('span', { class: 'lbl' }, '🎱 조추첨'), ...drs.slice(0, 6).map((dr, i) => h('button', { class: 'btn sm' + (i ? ' ghost' : ' gold'), onclick: () => U.openDraw({ k: 'C', key: lst.k, ri: dr.ri }) }, `${dr.n} 추첨`)))); }
  if (v.csub === 'br' && !cup.r.length) root.append(h('div', { class: 'sec' }, head, h('div', { class: 'empty' }, '아직 치른 라운드가 없습니다.')));
  else if (v.csub === 'br') {
    const br = cup.r.slice(-5);
    root.append(h('div', { class: 'sec' }, head, h('div', { class: 'sub' }, `${meta} · ${mxNote(v.cseason)} · 대진표는 ${br[0].n}부터 (앞 라운드는 '라운드별 결과')`), h('div', { class: 'in tscroll' }, bracket(nm, br, cup.w, on))));
    // 내 구단의 컵 여정
    if (myId && cup.r.some(r => r.m.some(m => m[0] === myId || m[1] === myId))) {
      const ms = []; cup.r.forEach(r => r.m.forEach(m => { if (m[0] === myId || m[1] === myId) ms.push([r, m]); }));
      root.append(h('div', { class: 'sec' }, h('h3', null, '내 구단 경기'), h('div', { class: 'in fxlist' }, ...ms.map(([r, m]) => fxRow(w, m[0], m[1], m[2], m[3], r.n, resOf({ a: m[0], b: m[1], ga: m[2], gb: m[3] }, myId) === 'D' ? (m[4] === myId ? 'W' : 'L') : resOf({ a: m[0], b: m[1], ga: m[2], gb: m[3] }, myId), true, on ? () => on(r, m) : null)))));
    }
  } else if (v.csub === 'fx') {
    const key = v.cnat + cup.k + v.cseason; if (v.cfxK !== key) { v.cfxK = key; v.cfxR = Math.max(0, cup.r.length - 1); v.cfxT = ''; }
    if (v.cfxR >= cup.r.length) v.cfxR = cup.r.length - 1;
    const teams = [...new Set(cup.r.flatMap(r => r.m.flatMap(m => [m[0], m[1]])))].sort((a, b) => clubName(w, a).localeCompare(clubName(w, b), 'ko'));
    root.append(h('div', { class: 'wfilter' },
      h('div', { class: 'seg', style: { flex: '0 0 auto' } }, h('button', { class: !v.cfxT ? 'on' : '', onclick: () => { v.cfxT = ''; rerender(); } }, '라운드별'), h('button', { class: v.cfxT ? 'on' : '', onclick: () => { v.cfxT = v.cfxT || (teams.includes(myId) ? myId : cup.w); rerender(); } }, '팀별')),
      !v.cfxT ? sel(v.cfxR, cup.r.map((r, i) => [i, `${r.n} (${r.m.length}경기)`]), x => { v.cfxR = +x; rerender(); }) : sel(v.cfxT, teams.map(id => [id, clubName(w, id)]), x => { v.cfxT = x; rerender(); }, true)));
    const items = []; cup.r.forEach((r, ri) => r.m.forEach(m => { if (v.cfxT ? (m[0] === v.cfxT || m[1] === v.cfxT) : ri === v.cfxR) items.push([r, m]); }));
    const tag = (r, m) => v.cfxT ? r.n : (m[4] ? 'PK' : '');
    root.append(h('div', { class: 'sec' }, h('h3', null, v.cfxT ? `${clubName(w, v.cfxT)} (${items.length}경기)` : `${cup.r[v.cfxR].n} · ${items.length}경기`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' ' + mxNote(v.cseason))),
      h('div', { class: 'in fxlist' }, ...items.map(([r, m]) => fxRow(w, m[0], m[1], m[2], m[3], tag(r, m) + (v.cfxT && m[4] ? ' PK' : ''), v.cfxT ? (m[2] === m[3] ? (m[4] === v.cfxT ? 'W' : 'L') : resOf({ a: m[0], b: m[1], ga: m[2], gb: m[3] }, v.cfxT)) : '', m[0] === myId || m[1] === myId, on ? () => on(r, m) : null)))));
  } else compRecSec(s, root, v.cseason, x => x.CUP[v.cnat + ':' + cup.k], false, 'cup|' + v.cseason + '|' + v.cnat + cup.k);
  const hist = (w.hist.cup[v.cnat] || []).slice(-12).reverse();
  if (hist.length) root.append(h('div', { class: 'sec' }, h('h3', null, `${C.CUPNAME[v.cnat] || ''} 역대 우승`), h('div', { class: 'in' }, h('table', { class: 'ltable lc' }, h('tbody', null, ...hist.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)))))))));
}

// ---------- 대륙 대회 ----------
function contView(s, root) {
  const w = s.w, v = wv();
  const keys = Object.keys(C.COMPS);
  if (!v.ck) { const mine = s.ss && s.ss.cont; v.ck = mine || 'UCL'; }
  const ss_ = seasons(w).filter(lb => archOf(w, lb) && archOf(w, lb).cont[v.ck]);
  if (!v.ckseason || !ss_.includes(v.ckseason)) v.ckseason = ss_[0];
  root.append(h('div', { class: 'wfilter' }, sel(v.ck, keys.map(k => [k, C.COMPS[k].name]), x => { v.ck = x; v.ckseason = null; rerender(); }, true), ss_.length ? sel(v.ckseason, ss_.map(x => [x, seasonName(x, archOf(w, x).cont[v.ck].sl)]), x => { v.ckseason = x; rerender(); }) : null, U.followBtn ? U.followBtn('comp', v.ck) : null));
  if (!v.ckseason) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이 대회는 아직 열리지 않았습니다. (유럽·아시아 대회는 8월, 남미·북중미 대회는 1월에 참가팀이 정해집니다)'))); return; }
  if (archOf(w, v.ckseason).cont[v.ck].live && !archOf(w, v.ckseason).cont[v.ck].w) { const nx = archOf(w, v.ckseason).cont[v.ck].next; root.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 4px' } }, `진행 중${nx != null ? ` · 다음 경기일 ${C.fmtDateY(nx)}` : ''}`)); }
  const K = archOf(w, v.ckseason).cont[v.ck];
  const myId = userClubOf(s, v.ckseason);
  if (K.live && w.cal) { const cs = Object.values(w.cal.cont).find(x => x.k === v.ck); if (cs) { const bs = []; if (cs.pots && cs.drawD <= w.cal.d) bs.push([-1, '리그 페이즈 추첨']); for (const ri in cs.tdraw || {}) if (cs.ties[ri]) bs.push([+ri, `${(cs.rounds[ri] || [])[2] || ''} 추첨`]);
    if (bs.length) root.append(h('div', { class: 'drday' }, h('span', { class: 'lbl' }, '🎱 조추첨'), ...bs.reverse().map(([ri, l], i) => h('button', { class: 'btn sm' + (i ? ' ghost' : ' gold'), onclick: () => U.openDraw({ k: 'E', key: cs.key, ri }) }, l)))); } }
  if (K.w) root.append(h('div', { class: 'wchamp', style: U.tintStyle ? U.tintStyle(w.clubs[K.w], .3) : null }, crest(w.clubs[K.w], 52), h('div', null, h('div', { class: 'lbl' }, `${K.n} ${v.ckseason} 우승`), h('h2', null, w.clubs[K.w] ? w.clubs[K.w].name : ''))));
  root.append(subTabs('ksub', [['br', '대진·순위'], ['rec', '개인 기록·팀 통계']]));
  if (v.ksub === 'rec') { compRecSec(s, root, v.ckseason, x => x.CONT[v.ck], false, 'cont|' + v.ckseason + '|' + v.ck, '모든 숫자는 이 대회 경기 기록(리그 페이즈·토너먼트 1·2차전)을 더한 값입니다.'); return; }
  const rounds = (K.r || []).filter(r => r.t.length);
  const st = stOf(v.ckseason), list = st && st.CONT[v.ck];
  // 토너먼트 한 판(1·2차전)을 누르면 두 경기를 차례로
  const openTie = (r, t) => {
    if (!list) return;
    const legs = list.filter(x => String(x[0]).startsWith(r.n) && [x[1], x[2]].sort().join() === [C.cix(w, t[0]), C.cix(w, t[1])].sort().join());
    if (!legs.length) return;
    if (legs.length === 1) { showRow(st, legs[0], `${K.n} ${v.ckseason} · ${legs[0][0]}`, false, 'CONT', v.ck); return; }
    U.overlay(close => [h('div', { class: 'head' }, h('h2', null, `${K.n} ${r.n}`), h('span', { class: 'mute' }, `합계 ${clubName(w, t[0])} ${t[3]} - ${t[4]} ${clubName(w, t[1])}${t[5] ? ' · 승부차기' : ''}`)),
      h('div', { class: 'body', style: { display: 'grid', gap: '8px' } }, ...legs.map(x => fxRow(w, w.cix[x[1]], w.cix[x[2]], x[3], x[4], x[0].replace(r.n, '').trim() || r.n, '', false, () => { close(); setTimeout(() => showRow(st, x, `${K.n} ${v.ckseason} · ${x[0]}`, false, 'CONT', v.ck), 200); })), h('div', { style: { textAlign: 'right' } }, h('button', { class: 'btn ghost', onclick: () => close() }, '닫기')))], { clickClose: true });
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
      h('div', { class: 'in fxlist' }, ...mine.map(x => fxRow(w, w.cix[x[1]], w.cix[x[2]], x[3], x[4], '', resOf({ a: w.cix[x[1]], b: w.cix[x[2]], ga: x[3], gb: x[4] }, v.phT), false, () => showRow(st, x, `${K.n} ${v.ckseason} · 리그 페이즈`, false, 'CONT', v.ck))))));
  }
  const hist = (w.hist.cont[v.ck] || []).slice(-12).reverse();
  if (hist.length) root.append(h('div', { class: 'sec' }, h('h3', null, '역대 우승'), h('div', { class: 'in' }, h('table', { class: 'ltable lc' }, h('tbody', null, ...hist.map(x => h('tr', null, h('td', null, x.y), h('td', null, clubCell(w, x.c)))))))));
}

// ---------- 국제 대회 ----------
// UEFA 네이션스리그: 진행 중이면 리그별 조 순위·토너먼트, 끝난 대회는 역대 우승
function unlSec(s, root) {
  const w = s.w, U_ = w.cal && w.cal.unl, hist = (w.unlHist || []).slice().reverse();
  if (!U_ && !hist.length) return;
  const sec = h('div', { class: 'sec' }, h('h3', null, 'UEFA 네이션스리그', U_ ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${U_.label} 진행 중 · 리그 페이즈 9~11월, 8강 3월, 파이널스 6월`) : null));
  if (U_) {
    const v = wv(); const lvs = [...new Set(U_.g.map(g => g.lv))]; if (!v.unlLv || !lvs.includes(v.unlLv)) v.unlLv = 'A';
    sec.append(h('div', { class: 'in' }, h('div', { class: 'seg', style: { maxWidth: '320px' } }, ...lvs.map(l => h('button', { class: v.unlLv === l ? 'on' : '', onclick: () => { v.unlLv = l; rerender(); } }, `리그 ${l}`)))));
    sec.append(h('div', { class: 'in hgroups' }, ...U_.g.filter(g => g.lv === v.unlLv).map(g => h('div', { class: 'hgrp' }, h('div', { class: 'lbl' }, `${g.n}조`), ...C.sortTable(g.tb).map((r, i) => h('div', { class: 'hgr' + (i === 0 ? ' q' : '') }, h('span', { class: 'cc lnk', onclick: () => U.openNat(r.id) }, natCrest(r.id, 12), h('span', null, C.natName(r.id))), h('span', { class: 'mute' }, `${r.p}경기 ${r.gf}:${r.ga}`), h('b', null, r.pts)))))));
    const ko = [];
    if (U_.qf) ko.push(['8강', U_.qf.map(q => [q.t[0], q.t[1], q.agg ? `${q.agg[0]}-${q.agg[1]}` : 'vs', q.win])]);
    if (U_.sf) ko.push(['준결승', U_.sf.map(q => [q.t[0], q.t[1], q.win ? '' : 'vs', q.win])]);
    if (U_.f) ko.push(['결승', [[U_.f.t[0], U_.f.t[1], U_.fs ? `${U_.fs[0]}-${U_.fs[1]}${U_.fs[2] ? ' PK' : ''}` : 'vs', U_.f.win]]]);
    if (ko.length) sec.append(h('div', { class: 'in hko' }, ...ko.map(([n, ms]) => h('div', { class: 'hkr' }, h('div', { class: 'lbl' }, n), ...ms.map(m => h('div', { class: 'hkm' }, h('span', { class: m[3] === m[0] ? 'w' : '' }, natCrest(m[0], 14), C.natName(m[0])), h('b', null, m[2]), h('span', { class: m[3] === m[1] ? 'w' : '' }, natCrest(m[1], 14), C.natName(m[1]))))))));
  }
  if (hist.length) sec.append(h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, '역대 우승'), h('div', { style: { display: 'grid', gap: '3px' } }, ...hist.map(x => h('div', { class: 'uprow', style: { gridTemplateColumns: '80px 1fr auto' } }, h('span', { class: 'mute' }, x.y), h('span', { class: 'cc' }, natCrest(x.w, 14), h('b', null, C.natName(x.w))), h('span', { class: 'mute', style: { fontSize: '12px' } }, `결승 상대 ${C.natName(x.ru)}${x.fs ? ` · ${x.fs[0]}-${x.fs[1]}${x.fs[2] ? ' PK' : ''}` : ''}`))))));
  root.append(sec);
}
function intlView(s, root) {
  const w = s.w, v = wv();
  if (U.followBtn) root.append(h('div', { class: 'chg', style: { padding: '0 2px' } }, h('span', { class: 'mute', style: { fontSize: '12px' } }, '팔로우:'), ...['WC', 'EURO', 'COPA', 'ASIA', 'AFCON', 'GOLD', 'UNL', 'AM'].map(k => h('span', { class: 'cc' }, h('span', { style: { fontSize: '12px' } }, k === 'AM' ? 'A매치 친선전' : C.TDEF[k].name), U.followBtn('comp', k, true)))));
  unlSec(s, root);
  // 진행 중인 국제 대회 (세계 달력)
  const liveT = {};
  for (const k in (w.cal && w.cal.intl) || {}) { const T = w.cal.intl[k]; if (T.dates[0] > w.cal.d + 30) continue;
    const g = T.g.map(gr => { const tb = C.newTable(gr.t); for (const m of gr.m) C.addResult(tb, m[0], m[1], m[2], m[3]); return { n: gr.n, m: gr.m.slice(), rows: C.sortTable(tb).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]) }; });
    (liveT[T.y] = liveT[T.y] || []).push({ k: T.k, n: T.n, y: T.y, g, ko: T.ko, w: null, ru: null, teams: T.teams, live: 1, start: T.dates[0] }); }
  const years = [...new Set(Object.keys(w.intl || {}).filter(y => w.intl[y].length).concat(Object.keys(liveT)))].sort().reverse();
  const curY = C.ymd(w.cal ? w.cal.d : C.day(w.year, 8, 1))[0] + (w.cal && C.ymd(w.cal.d)[1] >= 8 ? 1 : 0);
  const nextWC = C.nextWorldCup(curY);
  const up = C.tournamentsOf(curY).map(k => C.TDEF[k].name);
  root.append(h('div', { class: 'mute', style: { fontSize: '13px', padding: '0 2px' } }, up.length ? `올여름(${curY}) 대회: ${up.join(' · ')}` : `다음 월드컵: ${nextWC}년 여름`, up.includes('FIFA 월드컵') ? '' : ` · 다음 월드컵 ${nextWC}년`));
  if (!years.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 열린 국제 대회가 없습니다. 아래 일정에 맞춰 열립니다. (다음 월드컵: ' + C.nextWorldCup(w.cal ? C.ymd(w.cal.d)[0] : w.year) + '년 6~7월)')), intlSchedule(s)); return; }
  if (!v.iy || !years.includes(String(v.iy))) v.iy = years[0];
  const list = ((w.intl || {})[v.iy] || []).concat(liveT[v.iy] || []);
  if (!v.ik || !list.some(t => t.k === v.ik)) v.ik = (list.find(t => t.k === 'WC') || list[0]).k;
  root.append(h('div', { class: 'wfilter' }, sel(v.iy, years.map(y => [y, `${y}년`]), x => { v.iy = x; v.ik = null; rerender(); }),
    h('div', { class: 'seg', style: { flex: '1 1 260px' } }, ...list.map(t => h('button', { class: v.ik === t.k ? 'on' : '', onclick: () => { v.ik = t.k; rerender(); } }, t.n)))));
  const T = list.find(t => t.k === v.ik);
  const me = s.p.nat;
  const nm = c => h('span', { class: 'cc' + (c === me ? ' mine' : '') }, natCrest(c, 16), h('span', null, C.natName(c)));
  if (T.live) root.append(h('div', { class: 'wchamp' }, h('div', null, h('div', { class: 'lbl' }, `${T.n} ${T.y}`), h('h2', null, T.start > w.cal.d ? `${C.fmtDateY(T.start)} 개막` : '진행 중'), h('div', { class: 'mute', style: { fontSize: '13px' } }, `${T.teams}개국 참가`))));
  else root.append(h('div', { class: 'wchamp' }, natCrest(T.w, 56), h('div', null, h('div', { class: 'lbl' }, `${T.n} ${T.y} 우승`), h('h2', null, C.natName(T.w)), h('div', { class: 'mute', style: { fontSize: '13px' } }, `준우승 ${C.natName(T.ru)}` + (T.teams ? ` · ${T.teams}개국 참가` : '')))));
  const ilabel = T.live ? LIVE : T.mxl || `${+v.iy - 1}/${String(v.iy).slice(2)}`;
  root.append(subTabs('isub', [['br', '대진·조별리그'], ['rec', '개인 기록·팀 통계']]));
  if (v.isub === 'rec') { compRecSec(s, root, ilabel, x => x.INTL[v.ik], true, 'intl|' + ilabel + '|' + v.ik, '모든 숫자는 이 대회 경기 기록(조별리그·토너먼트)을 더한 값입니다.'); return; }
  const ist = stOf(ilabel), ilist = ist && ist.INTL[v.ik];
  const iopen = (stage, a, b) => { if (!ilist) return; const row = findRow(ilist, stage, a, b, true); if (row) showRow(ist, row, `${T.n} ${T.y} · ${row[0]}`, true, 'INTL', v.ik); };
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
  root.append(intlSchedule(s));
}

// ---------- 이적시장 (전체) ----------
const TXN = { buy: '이적', free: '자유계약', loan: '임대', lret: '임대 복귀', ext: '재계약', rel: '방출', ret: '은퇴', yth: '유스 승격', new: '외부 영입' };
function txView(s, root) {
  const w = s.w, v = wv(), labels = (w.txKeys || []).slice().reverse();
  if (!labels.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '첫 이적시장(1월 겨울, 6~8월 여름)이 열리면 기록됩니다.'))); return; }
  if (!v.txl || !labels.includes(v.txl)) v.txl = labels[0];
  const nats = nationList(s);
  v.txn = v.txn == null ? (C.leagueOf(s) ? C.leagueOf(s).nation : '') : v.txn; v.txk = v.txk || 'buy';
  root.append(subTabs('txm', [['list', '이적 목록'], ['bal', '구단별 수지']]));
  const T = U.withTx(v.txl, () => rerender());
  const natOf = id => { const c = w.clubs[id]; return c && c.lg && w.lg[c.lg] ? w.lg[c.lg].nation : c ? c.nat : ''; };
  if (v.txm === 'bal') {
    if (!v.txn) v.txn = nats[0];
    const lgs = Object.values(w.lg).filter(l => l.nation === v.txn).sort((a, b) => a.tier - b.tier);
    if (!v.txlg || !lgs.some(l => l.id === v.txlg)) v.txlg = lgs[0] && lgs[0].id;
    root.append(h('div', { class: 'wfilter' }, sel(v.txl, labels.map(l => [l, C.txName(l)]), x => { v.txl = x; rerender(); }), sel(v.txn, nats.map(n => [n, C.natName(n)]), x => { v.txn = x; v.txlg = null; rerender(); }), sel(v.txlg, lgs.map(l => [l.id, `${l.tier}부 · ${l.name}`]), x => { v.txlg = x; rerender(); }, true)));
    if (!T) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이적 기록을 불러오는 중…'))); return; }
    const lg = w.lg[v.txlg]; if (!lg) return;
    const by = {}; for (const id of lg.clubs) by[id] = { id, inn: [], out: [], ext: 0 };
    const today = w.cal ? w.cal.d : 1e9;
    for (const r of T) { if (r[10] != null && r[10] > today) continue; if (r[3] === 'ext') { if (by[r[1]]) by[r[1]].ext++; continue; } if (by[r[2]]) by[r[2]].inn.push(r); if (by[r[1]]) by[r[1]].out.push(r); }
    const rows = Object.values(by).map(x => Object.assign(x, U.windowTotals(x.inn, x.out)));
    if (!v.txbs) v.txbs = 'spent';
    const sv = { spent: x => x.spent, got: x => x.got, net: x => x.spent - x.got, nIn: x => x.nIn, nOut: x => x.nOut }[v.txbs];
    rows.sort((a, b) => sv(b) - sv(a));
    const E = x => x ? C.fmtEUR(x * 1e4) : '-';
    const th = (k, l) => h('th', { class: k ? 'lnk' + (v.txbs === k ? ' on' : '') : '', onclick: k ? () => { v.txbs = k; rerender(); } : null }, l);
    const tot = rows.reduce((a, x) => (a.s += x.spent, a.g += x.got, a), { s: 0, g: 0 });
    root.append(h('div', { class: 'sec' }, h('h3', null, `${lg.name} · ${C.txName(v.txl)} 이적시장`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 리그 전체 지출 ${E(tot.s)} · 수입 ${E(tot.g)} · 구단을 누르면 상세`)),
      h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '760px' } }, h('thead', null, h('tr', null, th(null, '#'), th(null, '구단'), th('spent', '총 지출'), th('got', '총 수입'), th('net', '순지출'), th('nIn', '영입'), th(null, '임대 영입'), th('nOut', '방출'), th(null, '임대 보냄'), th(null, '재계약'))),
        h('tbody', null, ...rows.map((x, i) => h('tr', { class: 'click', onclick: () => { U.openClub(x.id); } }, h('td', null, i + 1), h('td', null, clubCell(w, x.id, 16)), h('td', null, h('b', null, E(x.spent))), h('td', null, E(x.got)), h('td', { style: { color: x.spent - x.got > 0 ? '#e5484d' : x.spent - x.got < 0 ? '#2fbf71' : null } }, (x.spent - x.got < 0 ? '+' : '') + E(Math.abs(x.spent - x.got))), h('td', null, x.nIn), h('td', null, x.nLoanIn || ''), h('td', null, x.nOut), h('td', null, x.nLoanOut || ''), h('td', null, x.ext || ''))))))));
    root.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 4px' } }, '지출·수입에는 이적료와 임대료가 모두 들어갑니다. 순지출이 빨간색이면 쓴 돈이 더 많고, 초록색이면 번 돈이 더 많습니다.'));
    return;
  }
  root.append(h('div', { class: 'wfilter' }, sel(v.txl, labels.map(l => [l, C.txName(l)]), x => { v.txl = x; rerender(); }),
    sel(v.txn, [['', '전체 나라']].concat(nats.map(n => [n, C.natName(n)])), x => { v.txn = x; rerender(); }),
    sel(v.txk, [['all', '전체 종류']].concat(Object.entries(TXN)), x => { v.txk = x; rerender(); })));
  if (!T) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이적 기록을 불러오는 중…'))); return; }
  const today = w.cal ? w.cal.d : 1e9, pendN = T.filter(r => r[10] != null && r[10] > today).length;
  const list = T.filter(r => (r[10] == null || r[10] <= today) && (v.txk === 'all' || r[3] === v.txk) && (!v.txn || natOf(r[1]) === v.txn || natOf(r[2]) === v.txn)).sort((a, b) => b[4] - a[4] || (b[5] || 0) - (a[5] || 0));
  const sum = list.reduce((a, r) => a + r[4], 0);
  const wch = r => r[3] === 'ext' && r[9] ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ` (${r[7] >= r[9] ? '+' : ''}${Math.round((r[7] - r[9]) / Math.max(1, r[9]) * 100)}%)`) : null;
  root.append(h('div', { class: 'sec' }, h('h3', null, `${C.txName(v.txl)} 이적시장`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${list.length}건 · 이적료 합계 ${C.fmtEUR(sum * 1e4)} · 상위 150건 표시${pendN ? ` · 앞으로 성사될 거래 ${pendN}건` : ''}`)), T.trim ? h('div', { class: 'sub' }, '오래된 시즌이라 이적료가 있었던 이동과 OVR 75 이상 선수만 보관합니다.') : null,
    h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '860px' } }, h('thead', null, h('tr', null, ...['날짜', '선수', '나이', 'OVR', '보낸 구단', '', '받은 구단', '형태', '이적료', '계약', C.wageUnit()].map(x => h('th', null, x)))),
      h('tbody', null, ...list.slice(0, 150).map(r => h('tr', null, h('td', { class: 'mute', style: { fontSize: '12px' } }, r[10] != null ? C.fmtDate(r[10]) : ''), h('td', null, h('span', { class: 'lnk', onclick: () => U.openPlayer(r[0]) }, C.MD.nameOf(r[0]))), h('td', null, r[6]), h('td', null, r[5]),
        h('td', null, r[1] ? clubCell(w, r[1], 16) : h('span', { class: 'mute' }, r[3] === 'yth' ? '유스' : '외부')), h('td', { class: 'mute' }, '→'), h('td', null, r[3] === 'ext' ? h('span', { class: 'mute' }, '잔류') : r[2] ? clubCell(w, r[2], 16) : h('span', { class: 'mute' }, r[3] === 'ret' ? '은퇴' : '무소속')),
        h('td', null, TXN[r[3]] || r[3]), h('td', null, r[4] ? h('b', null, C.fmtEUR(r[4] * 1e4)) : h('span', { class: 'mute' }, '-')),
        h('td', { class: 'mute', style: { fontSize: '12px' } }, r[3] === 'loan' ? '임대' : r[2] && r[8] && !['lret', 'ret', 'rel'].includes(r[3]) ? `${r[8]}년` : ''), h('td', null, r[2] && r[7] && !['ret', 'rel'].includes(r[3]) ? C.fmtWage(r[7], true) : '', wch(r)))))))));
}
U.fxRow = fxRow; U.ppgStr = ppgStr;
U.pages.table = function () {
  const s = S(), v = wv();
  const root = h('div', { class: 'wrap prof screen' });
  const modes = [['league', '리그'], ['cup', '국내 컵'], ['cont', '대륙 대회'], ['intl', '국제 대회']];
  if (!modes.some(m => m[0] === v.mode)) v.mode = 'league';
  root.append(U.pageHead('대회', '리그 순위·경기·기록, 국내 컵, 대륙 대회, 국제 대회(월드컵·유로·네이션스리그 등)'));
  root.append(h('div', { class: 'seg wmodes' }, ...modes.map(([k, l]) => h('button', { class: v.mode === k ? 'on' : '', onclick: () => { v.mode = k; rerender(); } }, l))));
  try {
    ({ league: leagueView, cup: cupView, cont: contView, intl: intlView })[v.mode](s, root);
  } catch (e) { console.error(e); root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '기록을 불러오지 못했습니다.'))); }
  return root;
};
})(typeof window !== 'undefined' ? window : globalThis);
