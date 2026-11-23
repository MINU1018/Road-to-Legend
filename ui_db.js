// Road to Legend — 선수·팀 데이터베이스: 검색, 선수 시즌별 기록, 구단 스쿼드·연도별 성적, 발롱도르 역대 순위
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, flag, crest } = U;
const S = () => U.S();
const st = U.st;
const db = () => (st.db = st.db || { view: 'home', q: '' });
// 화면 이동 기록: 선수·구단·국가대표 화면을 열 때 지금 화면(탭, 하위 화면, 필터, 스크롤, 열려 있던 팝업)을 쌓아 두고 '뒤로'로 그대로 되돌린다
const NAV = [];
const snap = () => { const d = db(); const ov = U._ov || (U._ovClosed && Date.now() - U._ovClosed.t < 1500 ? U._ovClosed.fn : null);
  return { tab: U.curTab(), view: d.view, id: d.id, q: d.q, wv: st.wv ? Object.assign({}, st.wv) : null, wsv: st.wsv ? Object.assign({}, st.wsv) : null, nv: st.nv ? Object.assign({}, st.nv) : null, y: scrollY, ov }; };
const go = (view, id) => { const d = db(); const cur = snap(); if (!(cur.tab === 'db' && d.view === view && d.id === id)) NAV.push(cur); if (NAV.length > 40) NAV.shift(); d.view = view; d.id = id; U._ovClosed = null; U.setTab('db'); };
const reopen = f => { const l = []; for (let x = f; x && l.length < 4; x = x.parent) l.unshift(x); l.forEach(x => x()); };
U.navBack = () => {
  const e = NAV.pop(), d = db();
  if (!e) { d.view = 'home'; d.id = null; U.setTab('db'); return; }
  d.view = e.view; d.id = e.id; if (e.q != null) d.q = e.q;
  if (e.wv) st.wv = e.wv; if (e.wsv) st.wsv = e.wsv; if (e.nv) st.nv = e.nv;
  U.setTabQuiet(e.tab); U._keepY = null; U.render(); scrollTo(0, e.y || 0);
  if (e.ov) setTimeout(() => reopen(e.ov), 30);
};
U.navDepth = () => NAV.length;
U.openPlayer = pid => go('player', String(pid));
U.openClub = id => go('club', id);
U.openNat = code => go('nat', code);
// 같은 화면 안에서 펼치기·필터·정렬: 스크롤 위치를 유지한 채 다시 그린다
const stay = () => U.stay();
const back = () => U.navBack();
const POSORD = { GK: 0, CB: 1, LB: 2, RB: 2, CDM: 3, CM: 4, CAM: 5, LM: 6, RM: 6, LW: 7, RW: 7, ST: 8 };
const seasonLbl = y => `${y}/${String(y + 1).slice(2)}`;

// 현재 소속 찾기
function locate(w, pid) {
  for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite || !c.sq) continue; for (const e of c.sq) if (String(e[0]) === pid) return { e, c }; }
  // 무소속 (자유계약) · 계약 확정 후 입단 날짜를 기다리는 선수
  for (const e of w.fa || []) if (String(e[0]) === pid) return { e, c: null, fa: 1 };
  const lm = w.cal && w.cal.limbo && w.cal.limbo[pid]; if (lm) { const q = (w.cal.tq || []).find(x => x[1] === pid); return { e: lm, c: null, fa: 2, to: q ? q[3] : null, d: q ? q[0] : null }; }
  return null;
}
U.stintPath = (w, P, c, e) => stintPath(w, P, c, e); U.locate = locate; U.playerSeasons = (w, P, live) => playerSeasons(w, P, live);
function nameLink(n, pid, cls) { return pid ? h('span', { class: 'lnk ' + (cls || ''), onclick: ev => { ev.stopPropagation(); U.openPlayer(pid); } }, n) : h('span', { class: cls || '' }, n); }
function clubLink(w, id, size = 18) { const c = w.clubs[id]; return h('span', { class: 'cc lnk', onclick: ev => { ev.stopPropagation(); if (c) U.openClub(id); } }, crest(c || null, size), h('span', null, c ? c.name : '해체된 구단')); }

// ---------- 검색 ----------
// 악센트·특수 문자(é, ñ, ø, ß, ł ...)를 영문 기본 글자로 바꿔 비교
const FOLD = { 'ø': 'o', 'Ø': 'o', 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe', 'đ': 'd', 'Đ': 'd', 'ł': 'l', 'Ł': 'l', 'ı': 'i', 'þ': 'th', 'ð': 'd', 'ħ': 'h' };
const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[øØßæÆœŒđĐłŁıþðħ]/g, ch => FOLD[ch] || ch).toLowerCase().replace(/[-'’.]/g, ' ').replace(/\s+/g, ' ').trim();
U.fold = fold;
U.dbSearch = (w, q) => search(w, q);
function search(w, q) {
  q = fold(q); if (q.length < 2) return { players: [], clubs: [] };
  const players = [], seen = new Set();
  for (const id in w.clubs) {
    const c = w.clubs[id]; if (c.lite || !c.sq) continue;
    for (const e of c.sq) { const n = C.pName(w, e); if (fold(n).includes(q)) { const pid = String(e[0]); seen.add(pid); players.push({ pid, n, pos: e[1], ovr: e[2], age: e[3], nat: e[5], club: id }); if (players.length >= 60) break; } }
    if (players.length >= 60) break;
  }
  for (const e of w.fa || []) { const n = C.pName(w, e), pid = String(e[0]); if (seen.has(pid) || !fold(n).includes(q)) continue; seen.add(pid); players.push({ pid, n, pos: e[1], ovr: e[2], age: e[3], nat: e[5], club: null, fa: 1 }); }
  for (const pid in (w.ps || {})) { if (seen.has(pid)) continue; const P = w.ps[pid]; if (fold(P.n).includes(q)) { players.push({ pid, n: P.n, pos: P.pos, nat: P.nat, retired: true }); if (players.length >= 80) break; } }
  const clubs = Object.values(w.clubs).filter(c => c.lg && (fold(c.name).includes(q) || fold(c.en).includes(q) || fold(c.id.replace(/^[A-Z]+_/, '')).includes(q) || fold(c.short) === q)).sort((a, b) => b.str - a.str).slice(0, 20);
  players.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  // 국가대표팀: 한글 국가명·영문명·코드
  const EN = (C.logos && C.logos.NAT_EN) || {};
  const nats = Object.keys(C.NAT).filter(code => fold(C.natName(code)).includes(q) || fold((EN[code] || '').replace(/\|/g, ' ')).includes(q) || code.toLowerCase() === q).slice(0, 12);
  // 리그·대회
  const comps = [], FL = {}; for (const l of (G.FC27 && G.FC27.leagues) || []) FL[l.id] = l.fc || '';
  const AL = { 'epl': 'ENG1', 'pl': 'ENG1', 'laliga': 'ESP1', 'la liga': 'ESP1', 'serie a': 'ITA1', 'bundesliga': 'GER1', 'ligue 1': 'FRA1', 'k리그': 'KOR1', 'k league': 'KOR1', 'j리그': 'JPN1', 'mls': 'USA1' };
  for (const id in w.lg) { const l = w.lg[id]; const hit = fold(l.name).includes(q) || fold(FL[id] || '').includes(q) || AL[q] === id || (fold(C.natName(l.nation)) === q && l.tier <= 2); if (hit) comps.push({ k: 'lg', id, n: l.name, sub: `${C.natName(l.nation)} ${l.tier}부 리그`, nat: l.nation, t: l.tier }); }
  for (const nat in C.CUPNAME || {}) if (fold(C.CUPNAME[nat]).includes(q) || fold(C.natName(nat)) === q) comps.push({ k: 'cup', nat, n: C.CUPNAME[nat], sub: `${C.natName(nat)} 국내 컵`, t: 5 });
  for (const nat in C.LCUPNAME || {}) if (fold(C.LCUPNAME[nat]).includes(q)) comps.push({ k: 'cup', nat, n: C.LCUPNAME[nat], sub: `${C.natName(nat)} 리그컵`, t: 6 });
  const CEN = { UCL: 'champions league ucl 챔스', UEL: 'europa league uel 유로파', UECL: 'conference league uecl 컨퍼런스' };
  for (const k in C.COMPS || {}) { const x = C.COMPS[k]; if (fold(x.name).includes(q) || fold(x.short || '').includes(q) || fold(CEN[k] || '').includes(q) || k.toLowerCase() === q) comps.push({ k: 'cont', id: k, n: x.name, sub: '대륙 대회', t: 3 }); }
  const IEN = { WC: 'world cup 월드컵 fifa', EURO: 'euro 유로 european championship', COPA: 'copa america 코파', ASIA: 'asian cup 아시안컵', AFCON: 'afcon africa 네이션스컵', GOLD: 'gold cup 골드컵', UNL: 'nations league 네이션스리그 unl', AM: 'a매치 friendly 친선' };
  for (const k of ['WC', 'EURO', 'COPA', 'ASIA', 'AFCON', 'GOLD', 'UNL', 'AM']) { const n = k === 'UNL' ? 'UEFA 네이션스리그' : k === 'AM' ? 'A매치 (친선)' : C.TDEF[k].name; if (fold(n).includes(q) || fold(IEN[k]).includes(q)) comps.push({ k: 'intl', id: k, n, sub: k === 'WC' ? `국제 대회 · 다음 대회 ${C.nextWorldCup(w.cal ? C.ymd(w.cal.d)[0] : w.year)}년` : '국제 대회', t: k === 'WC' ? 0 : 4 }); }
  comps.sort((a, b) => a.t - b.t);
  return { players: players.slice(0, 40), clubs, nats, comps: comps.slice(0, 16) };
}

function homeView(s, root) {
  const w = s.w, d = db();
  const inp = h('input', { type: 'search', placeholder: '선수·구단·국가대표팀 이름 (2글자 이상)', value: d.q || '', style: { width: '100%' }, oninput: e => { d.q = e.target.value; clearTimeout(d.t); d.t = setTimeout(() => draw(), 180); } });
  const res = h('div', { style: { display: 'grid', gap: '12px' } });
  const draw = () => {
    res.replaceChildren();
    const r = search(w, d.q || '');
    if ((d.q || '').trim().length < 2) return;
    if (!r.players.length && !r.clubs.length && !r.nats.length && !(r.comps || []).length) { res.append(h('div', { class: 'empty' }, '검색 결과가 없습니다.')); return; }
    if ((r.comps || []).length) res.append(h('div', { class: 'sec' }, h('h3', null, `리그·대회 ${r.comps.length}`), h('div', { class: 'in dbgrid' }, ...r.comps.map(x => h('div', { class: 'dbitem', onclick: () => U.openComp(x) }, x.nat ? flag(x.nat, 22) : U.trophy ? U.trophy(x.k === 'intl' ? 'nt' : x.k === 'cont' ? 'cont' : 'cup', 22, '#f2c14e') : null, h('div', null, h('b', null, x.n), h('div', { class: 'mute', style: { fontSize: '12px' } }, x.sub)))))));
    if (r.nats.length) res.append(h('div', { class: 'sec' }, h('h3', null, `국가대표팀 ${r.nats.length}`), h('div', { class: 'in dbgrid' }, ...r.nats.map(code => h('div', { class: 'dbitem', onclick: () => U.openNat(code) }, U.natCrest(code, 26), h('div', null, h('b', null, `${C.natName(code)} 대표팀`), h('div', { class: 'mute', style: { fontSize: '12px' } }, `${C.confOf(code)}`)))))));
    if (r.clubs.length) res.append(h('div', { class: 'sec' }, h('h3', null, `구단 ${r.clubs.length}`), h('div', { class: 'in dbgrid' }, ...r.clubs.map(c => h('div', { class: 'dbitem', onclick: () => U.openClub(c.id) }, crest(c, 26), h('div', null, h('b', null, c.name), h('div', { class: 'mute', style: { fontSize: '12px' } }, `${(w.lg[c.lg] || {}).name || ''} · 전력 ${c.str.toFixed(1)}`)))))));
    if (r.players.length) res.append(h('div', { class: 'sec' }, h('h3', null, `선수 ${r.players.length}`), h('div', { class: 'in dbgrid' }, ...r.players.map(x => h('div', { class: 'dbitem', onclick: () => U.openPlayer(x.pid) }, flag(x.nat, 22), h('div', null, h('b', null, x.n), h('div', { class: 'mute', style: { fontSize: '12px' } }, x.retired ? `${x.pos} · ${(w.ps[x.pid] || {}).ret ? (w.ps[x.pid].ret + '년 은퇴') : '무소속'}` : [`${x.pos} · ${x.age}세 · OVR ${x.ovr} · `, x.fa ? '무소속' : h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' } }, crest(w.clubs[x.club] || null, 14), w.clubs[x.club].name)])))))));
  };
  root.append(U.pageHead('선수·팀', '선수·구단·국가대표팀을 찾아 기록을 봅니다. 위쪽 검색창에서도 바로 찾을 수 있습니다.'));
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in' }, inp)), res);
  draw();
  setTimeout(() => { try { inp.focus(); } catch (e) { } }, 30);
  // 팔로우 중
  if (U.follow) { const f = U.follow(s), it = [];
    for (const id of f.club) if (w.clubs[id]) it.push(h('div', { class: 'dbitem', onclick: () => U.openClub(id) }, crest(w.clubs[id], 24), h('div', null, h('b', null, w.clubs[id].name), h('div', { class: 'mute', style: { fontSize: '12px' } }, (w.lg[w.clubs[id].lg] || {}).name || ''))));
    for (const pid of f.pl) it.push(h('div', { class: 'dbitem', onclick: () => U.openPlayer(pid) }, h('span', { class: 'tpos' }, ((w.ps || {})[pid] || {}).pos || '선수'), h('div', null, h('b', null, C.MD.nameOf(pid)))));
    for (const n of f.nat) it.push(h('div', { class: 'dbitem', onclick: () => U.openNat(n) }, U.natCrest(n, 24), h('div', null, h('b', null, `${C.natName(n)} 대표팀`))));
    if (it.length) root.append(h('div', { class: 'sec' }, h('h3', null, '팔로우 중'), h('div', { class: 'in dbgrid' }, ...it))); }
  // 내 리그 구단 바로가기
  const lg = C.leagueOf(s);
  if (lg) root.append(h('div', { class: 'sec' }, h('h3', null, `${lg.name} 구단`), h('div', { class: 'in dbgrid' }, ...lg.clubs.map(id => w.clubs[id]).sort((a, b) => b.str - a.str).map(c => h('div', { class: 'dbitem', onclick: () => U.openClub(c.id) }, crest(c, 24), h('div', null, h('b', null, c.name), h('div', { class: 'mute', style: { fontSize: '12px' } }, `전력 ${c.str.toFixed(1)}`)))))));
}

// ---------- 선수 ----------
// ---------- 선수 시즌 기록 (전 대회) ----------
// 리그 기록 h + 대회별 기록 c를 시즌 단위로 묶는다
function compInfo(w, key, label, club) {
  if (key === 'L') { const A = w.arch && w.arch[label]; if (A) for (const lid in A.lg) if ((A.lg[lid].t || []).some(r => r[0] === club)) return { name: A.lg[lid].n, cat: 'league', lid }; return { name: '리그', cat: 'league' }; }
  const [k, v] = key.split(':');
  if (k === 'cup') return { name: C.CUPNAME[v] || '국내 컵', cat: 'cup' };
  if (k === 'lcup') return { name: C.LCUPNAME[v] || '리그컵', cat: 'cup' };
  if (k === 'cont') return { name: C.COMPS[v] ? C.COMPS[v].name : v, cat: 'cont' };
  if (k === 'nt') return { name: (C.TDEF[v] ? C.TDEF[v].name : v), cat: 'nt' };
  return { name: key, cat: 'league' };
}
// 시즌 이름: 캘린더 리그(K리그·MLS 등) 구단은 '2027', 유럽식은 '2026/27'
function clubSeasonLbl(w, cid, y) { const c = w.clubs[cid], L = c && c.lg && w.lg[c.lg], nat = L ? L.nation : c ? c.nat : ''; return C.calType && C.calType(nat) === 'cy' ? String(y + 2000) : seasonLbl(y + 2000); }
function playerSeasons(w, P, live) {
  if (!P && !live) return [];
  const by = {};
  const get = (y, wl) => by[y] || (by[y] = { y, label: wl, wl, items: [] });
  for (const x of C.psHist(P)) { const y = x[0] < 1000 ? x[0] : x[0] - 2000, wl = seasonLbl(y + 2000), cid = C.cidOf(w, x[1]); const sn = get(y, wl);
    if (x[7] !== '' && x[7] != null) { sn.age = x[7]; sn.ovr = x[6]; }
    sn.label = clubSeasonLbl(w, cid, y);
    const ci = compInfo(w, 'L', wl, cid); sn.items.push({ key: 'L', cat: 'league', name: ci.name, lid: ci.lid, club: cid, apps: x[2], g: x[3], a: x[4], rt: x[5] / 100, loan: !!x[8], min: x[9] === '' || x[9] == null ? null : +x[9], cs: x[10] || 0, mom: x[11] || 0 }); }
  for (const t of String((P && P.c) || '').split(';').filter(Boolean)) { const [y0, key, apps, g, a, rt, min, cs, mom] = t.split('|'); const y = +y0, wl = seasonLbl(y + 2000), sn = get(y, wl);
    const nt = key.startsWith('nt:');
    const club = nt ? null : (sn.items.find(it => it.cat === 'league') || {}).club || null; const ci = compInfo(w, key, wl, club);
    sn.items.push({ key, cat: ci.cat, name: ci.name, club, apps: +apps, g: +g, a: +a, rt: +rt / 100, min: min == null || min === '' ? null : +min, cs: +cs || 0, mom: +mom || 0, nat: nt ? P.nat : null }); }
  const out = Object.values(by).sort((a, b) => a.y - b.y);
  // 진행 중인 대회 (세계 달력)
  if (live && live.length) {
    const sn = { y: 9999, label: '', wl: 'live', items: [], live: 1 };
    for (const x of live) { const a = x.a, club = C.cidOf(w, a[0]); const nt = x.key.startsWith('nt:');
      const ci = x.key === 'league' ? { name: (w.lg[x.lg] || {}).name || '리그', cat: 'league' } : compInfo(w, x.key, 'live', club);
      if (x.key === 'league') sn.label = x.label;
      sn.items.push({ key: x.key === 'league' ? 'L' : x.key, cat: ci.cat, name: ci.name, club: nt ? null : club, apps: a[1], g: a[4], a: a[5], rt: a[8] / 10 / Math.max(1, a[1]), min: a[3], cs: a[9], mom: a[10] || 0, nat: nt ? (P ? P.nat : null) : null, live: 1 }); }
    if (!sn.label) sn.label = (live[0] || {}).label || '';
    sn.label = (sn.label ? sn.label + ' ' : '') + '진행 중';
    out.push(sn);
  }
  return out;
}
// 한 선수의 한 대회 경기 목록 (경기 기록 보관 시즌만)
function compMatches(s, pid, label, it) {
  const w = s.w;
  let st;
  if (label === 'live') st = U.liveSt();
  else { if (!(w.mxKeys || []).includes(label)) { U.toast ? U.toast('이 시즌은 경기별 기록이 없습니다 (이전 버전에서 지워진 시즌).') : null; return; }
    st = U.withMx(label, () => compMatches(s, pid, label, it)); if (!st) return; }
  const list = [];
  const scan = (rows, title, nat, get) => { for (const r of rows) { const g = get(r); if (!g) continue; const d = g.d; if (!d.ln) continue; const side = d.ln[0].some(x => x.id === pid) ? 0 : d.ln[1].some(x => x.id === pid) ? 1 : -1; if (side < 0) continue; const me = d.ln[side].find(x => x.id === pid);
    list.push({ title: g.title, a: g.a, b: g.b, ga: g.ga, gb: g.gb, pw: g.pw, sa: g.sa, sb: g.sb, ctx: g.ctx, nat, d, side, me, g: d.ev.filter(e => e.p === pid && 'gp'.includes(e.k)).length, as: d.ev.filter(e => e.a === pid).length, y: d.ev.some(e => e.p === pid && e.k === 'y'), red: d.ev.some(e => e.p === pid && 'r2'.includes(e.k)), key: g.key }); } };
  const cid = x => typeof x === 'number' ? w.cix[x] : x;
  if (it.cat === 'league') { for (const lid in st.L) { const L = st.L[lid]; if (!L.l) continue; scan(C.MD.leagueRows(w, L).filter(r => r.a === it.club || r.b === it.club), it.name, false, r => ({ title: `${it.name} ${r.r + 1}라운드`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: C.MD.leagueMatch(st, L, r.i), key: lid + '|' + label + '|' + r.i, sa: U.ppgStr(w, lid, label)(r.a), sb: U.ppgStr(w, lid, label)(r.b), ctx: { st, lg: lid, L, i: r.i, date: r.d } })); } }
  else {
    const [k, v] = it.key.split(':');
    const rows = k === 'cont' ? st.CONT[v] : k === 'nt' ? st.INTL[v] : st.CUP[v + ':' + k];
    scan(rows || [], it.name, k === 'nt', r => ({ title: `${it.name} · ${r[0]}`, a: cid(r[1]), b: cid(r[2]), ga: r[3], gb: r[4], pw: r[7] != null ? cid(r[7]) : null, d: C.MD.decode(st, r), key: it.name + '|' + label + '|' + r[1] + '|' + r[2] + '|' + r[0], ctx: { st, grp: k === 'cont' ? 'CONT' : k === 'nt' ? 'INTL' : 'CUP', key: k === 'cont' || k === 'nt' ? v : v + ':' + k, stage: r[0], date: r[8] } }));
  }
  const nm = (id, nat) => nat ? C.natName(id) : ((w.clubs[id] || {}).name || '');
  const tg = list.reduce((a, x) => a + x.g, 0), ta = list.reduce((a, x) => a + x.as, 0), tr = list.reduce((a, x) => a + x.me.rt, 0);
  U.overlay(close => [h('div', { class: 'head' }, h('h2', null, `${it.name} · ${label === 'live' ? '진행 중' : label}`), h('span', { class: 'mute' }, `${MDname(pid, s)} · ${list.length}경기 ${tg}골 ${ta}도움 · 평균 평점 ${list.length ? (tr / list.length).toFixed(2) : '-'} (시즌 기록과 같은 값)`)),
    h('div', { class: 'body' }, h('div', { class: 'tscroll' }, h('table', { class: 'ltable lc mxl', style: { minWidth: '600px' } }, h('thead', null, h('tr', null, ...['경기', '상대', '결과', '출전', '골', '도움', '카드', '평점'].map(x => h('th', null, x)))),
      h('tbody', null, ...list.map(x => { const opp = x.side ? x.a : x.b, f = x.side ? x.gb : x.ga, ag = x.side ? x.ga : x.gb, res = f > ag ? 'W' : f < ag ? 'L' : (x.pw ? (x.pw === (x.side ? x.b : x.a) ? 'W' : 'L') : 'D');
        return h('tr', { class: 'click', onclick: () => { close(); setTimeout(() => U.showMatch({ title: `${x.title} (${label === 'live' ? '진행 중' : label})`, a: x.a, b: x.b, ga: x.ga, gb: x.gb, pw: x.pw, d: x.d, nat: x.nat, key: x.key, sa: x.sa, sb: x.sb, ctx: x.ctx }), 200); } },
          h('td', { class: 'mute', style: { fontSize: '12px' } }, x.title.replace(it.name, '').replace(/^ · /, '').trim()), h('td', null, nm(opp, x.nat), h('span', { class: 'mute', style: { fontSize: '11px' } }, x.nat ? '' : x.side ? ' (원정)' : ' (홈)')), h('td', null, h('span', { class: 'res ' + res, style: { padding: '1px 6px', borderRadius: '5px' } }, `${f}-${ag}${x.pw ? ' PK' : ''}`)),
          h('td', null, x.me.start ? (x.me.off < 90 ? `선발 ${x.me.off}'` : "선발 90'") : `교체 ${90 - x.me.on}'`), h('td', null, x.g || ''), h('td', null, x.as || ''), h('td', null, x.red ? '퇴장' : x.y ? '경고' : ''), h('td', null, U.rt1(x.me.rt))); })))),
      h('div', { style: { textAlign: 'right', marginTop: '10px' } }, h('button', { class: 'btn ghost', onclick: () => close() }, '닫기')))], { clickClose: true, reopen: () => compMatches(s, pid, label, it) });
}
const MDname = (pid, s) => C.MD.nameOf(pid, s);
function playerView(s, root, pid) {
  const w = s.w, loc = locate(w, pid), P = (w.ps || {})[pid];
  const e = loc && loc.e, c = loc && loc.c;
  const name = e ? C.pName(w, e) : P ? P.n : '알 수 없는 선수';
  const nat = e ? e[5] : P && P.nat, pos = e ? e[1] : P && P.pos;
  root.append(h('div', { class: 'sec ehead' }, h('div', { class: 'in dbhead' }, flag(nat, 36),
    h('div', null, h('h2', { style: { margin: 0 } }, name), h('div', { class: 'mute' }, [C.natName(nat), pos, e ? `${e[3]}세` : P && P.ret ? `${P.ret}년 은퇴` : '무소속', loc && loc.fa ? '' : e && e[6] != null ? `계약 ${Math.max(1, e[6])}년 남음` : '', e && e[7] && w.clubs[e[7]] ? `${w.clubs[e[7]].name}에서 임대 중` : '', e && e[14] && w.cal && e[14] > w.cal.d ? `🩹 부상 · ${C.fmtDateY(e[14])} 복귀 예정` : ''].filter(Boolean).join(' · '))),
    e ? h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, 'OVR'), h('b', null, e[2])) : null,
    c ? h('div', { class: 'dbclub' }, clubLink(w, c.id, 26), h('div', { class: 'mute', style: { fontSize: '12px' } }, (w.lg[c.lg] || {}).name || ''))
      : !(P && P.ret && !e) ? h('div', { class: 'dbclub' }, h('span', { class: 'fachip' }, '무소속'), h('div', { class: 'mute', style: { fontSize: '12px' } }, loc && loc.fa === 2 && loc.to && w.clubs[loc.to] ? `${w.clubs[loc.to].name} 입단 예정 (${C.fmtDate(loc.d)})` : loc && loc.fa ? `자유계약${e[19] ? ` · 직전 ${w.clubs[e[19]] ? w.clubs[e[19]].name : e[19]}` : ''}${e[18] && w.cal ? ` · ${Math.max(1, w.cal.d - e[18])}일째` : ''}` : '')) : null, U.followBtn ? U.followBtn('pl', pid) : null)));
  // FotMob식 2단: 왼쪽 정보·시즌 데이터, 오른쪽 선수 특성·경력·트로피
  const main = h('div', { class: 'pfm' }), side = h('div', { class: 'pfs' });
  root.append(h('div', { class: 'pf2' }, main, side));
  if (U.pfInfoCard && (e || P)) main.append(U.pfInfoCard(s, pid, e, c, P));
  if (U.pfValueChart) { const vc = U.pfValueChart(s, pid, e, c, P); if (vc) main.append(vc); }
  // 무소속: 이적료 없이 언제든 영입 가능
  if (e && loc && loc.fa === 1) { const val = C.aiFee(e[2], e[3], 'ENG', 0, .5); main.append(h('div', { class: 'wsum' }, ...[['소속', '무소속 (자유계약)'], ['이적료', '없음 · 언제든 계약 가능'], ['직전 구단', e[19] ? (w.clubs[e[19]] ? w.clubs[e[19]].name : e[19]) : '-'], ['무소속 기간', e[18] && w.cal ? `${Math.max(1, w.cal.d - e[18])}일` : '시즌 시작 전부터'], ['참고 가치', C.fmtEUR(Math.round(val / 1e5) * 1e5)]].map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2)))))); }
  // 계약·급여
  if (e && c && !c.lite) {
    const loan = e[7] && w.clubs[e[7]];
    const rl = C.squadRoles ? C.squadRoles(c).get(e) : null;
    const val = U.valueNow ? U.valueNow(s, pid, e, c) : C.aiFee(e[2], e[3], (w.lg[(loan || c).lg] || {}).nation || c.nat, Math.max(0, e[6]), .5);
    const cells = [['계약 남은 기간', loan ? `임대 (원소속 ${loan.name})` : `${Math.max(1, e[6])}년 · ${w.year + Math.max(1, e[6])}년 6월 만료`], [C.wageUnit(), e[8] ? C.fmtWage(e[8], true) : '-'], ['연봉 환산', e[8] ? C.fmtEUR(e[8] * 52) : '-'], ['팀 내 역할', rl != null ? ['주전', '로테이션', '백업'][rl] : '-'], ['추정 이적료', C.fmtEUR(Math.round(val / 1e5) * 1e5)]];
    main.append(h('div', { class: 'wsum' }, ...cells.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2))))));
  }
  const hist = C.psHist(P);
  const seasonOrder = {}; // 시즌별 구단 순서 (커리어 경로와 같은 기준)
  // 이적 경로: 구단이 바뀔 때마다 한 칸 (임대는 따로 표시)
  let path = [];
  {
    // 한 시즌에 두 구단(겨울 이적·임대)이면, 다음 시즌(또는 지금) 구단과 같은 쪽을 뒤에 둔다
    const ord = hist.slice(), ys = [...new Set(ord.map(x => x[0]))];
    for (let i = 0; i < ys.length; i++) { const y = ys[i], same = ord.filter(x => x[0] === y); if (same.length < 2) continue;
      const nx = ord.find(x => x[0] === ys[i + 1]), nc = nx ? C.cidOf(w, nx[1]) : c && c.id;
      same.sort((a, b) => (C.cidOf(w, a[1]) === nc) - (C.cidOf(w, b[1]) === nc));
      const at = ord.findIndex(x => x[0] === y); ord.splice(at, same.length, ...same); }
    for (const x of ord) { const y = x[0] < 1000 ? x[0] : x[0] - 2000; (seasonOrder[y] = seasonOrder[y] || []).push(C.cidOf(w, x[1])); }
    for (const x of ord) { const cid = C.cidOf(w, x[1]), L = path[path.length - 1]; if (L && L.cid === cid && !!L.loan === !!x[8]) L.y1 = x[0]; else path.push({ cid, y0: x[0], y1: x[0], loan: x[8] ? 1 : 0 }); }
    const yy = v => (v < 1000 ? v + 2000 : v);
    // 진행 중인 시즌에 뛴 구단 (아직 시즌 기록에 안 들어간 겨울 이동 등)
    const curY = w.year - 2000;
    { const lv = C.livePlayer ? C.livePlayer(s, pid) : null; for (const x of lv || []) { if (x.key !== 'league') continue; const cid = C.cidOf(w, x.a[0]), L = path[path.length - 1]; if (cid && (!L || L.cid !== cid)) path.push({ cid, y0: curY, y1: curY, loan: 0 }); else if (L && L.cid === cid) L.y1 = Math.max(L.y1, curY); } }
    // 지금 구단: 여름 이적시장(6~7월)에 옮겼으면 다음 시즌부터
    if (c && !c.lite) { const L = path[path.length - 1], ln = !!(e && e[7]); const [yy, mm] = w.cal ? C.ymd(w.cal.d) : [0, 0], y0 = yy === w.year + 1 && mm >= 6 ? curY + 1 : curY;
      if (!L || L.cid !== c.id || !!L.loan !== ln) path.push({ cid: c.id, y0, y1: null, loan: ln ? 1 : 0 }); else L.y1 = null; }
  }
  // 이동 기록(P.mv)이 있으면 그걸로 경력을 정확히 만든다: 날짜 순 이동 → 구단별 한 칸 (임대 복귀·임대 후 완전 이적 표시)
  if (P && P.c0) { const pm = stintPath(w, P, c, e); if (pm) path = pm; }
  // 시즌별 전체 기록 (리그 + 국내 컵 + 대륙 대회 + 국가대표 대회). 시즌을 누르면 대회별, 대회를 누르면 경기 목록
  const seasons = playerSeasons(w, P, C.livePlayer ? C.livePlayer(s, pid) : null);
  let blk = null;
  if (U.pfSeason && seasons.length) { try { blk = U.pfSeason(s, pid, e, c, P, seasons); main.append(...blk.main); side.append(...blk.side); } catch (err) { console.error(err); } }
  if (U.pfCareer && path.length) side.append(U.pfCareer(s, pid, P, path, seasons));
  if (U.pfTrophies) { const tr = U.pfTrophies(s, pid, P, seasons); if (tr) side.append(tr); }
  if (seasons.length) {
    const d = db(); d.pf = d.pf || 'all'; if (d.pid !== pid) { d.pid = pid; d.pc = ''; d.open = {}; }
    const clubsOf = [...new Set(seasons.flatMap(x => x.items.filter(it => it.club).map(it => it.club)))];
    // 국가대표 기록은 클럽 합계에 넣지 않고 '국가대표' 탭에서 따로 (구단 대신 국기)
    const CATS = [['all', '클럽 전체'], ['league', '리그'], ['cup', '국내 컵'], ['cont', '대륙 대회'], ['nt', '국가대표']];
    const nt = d.pf === 'nt';
    const pass = it => (nt ? it.cat === 'nt' : it.cat !== 'nt' && (d.pf === 'all' || it.cat === d.pf)) && (nt || !d.pc || it.club === d.pc);
    const tb = h('tbody');
    const tot = { apps: 0, g: 0, a: 0, rs: 0, min: 0, minOk: true };
    const mfmt = v2 => v2 == null ? '-' : v2.toLocaleString() + "'";
    // 한 시즌에 리그 구단이 둘 이상(겨울 이적·임대)이면 구단별로 줄을 나눈다. 뒤에 간 구단이 위 (최근 순)
    const segsOf = (sn, i) => {
      const lgs = nt ? [] : sn.items.filter(it => it.cat === 'league');
      if (lgs.length <= 1) return [{ key: sn.y, items: sn.items.filter(pass), single: 1 }];
      const so = seasonOrder[sn.y] || [], ix = cid => { const k = so.lastIndexOf(cid); return k < 0 ? 99 : k; };
      const ord = lgs.slice().sort((x, y) => ix(x.club) - ix(y.club));
      return ord.map((L, k) => ({ key: sn.y + '|' + L.club + '|' + k, club: L.club, tag: L.loan ? '임대' : k > 0 && ord[k - 1].loan && !L.loan && L.apps ? '임대 복귀' : null,
        items: sn.items.filter(it => (it.cat === 'league' ? it === L : it.club === L.club) && pass(it)) }));
    };
    const segRows = []; seasons.forEach((sn, i) => segsOf(sn, i).forEach(sg => segRows.push(Object.assign({ sn }, sg))));
    for (const sg of segRows.reverse()) {
      const sn = sg.sn, items = sg.items; if (!items.length) continue;
      const t = items.reduce((a, it) => (a.apps += it.apps, a.g += it.g, a.a += it.a, a.rs += it.rt * it.apps, a.min = it.min == null || a.min == null ? null : a.min + it.min, a), { apps: 0, g: 0, a: 0, rs: 0, min: 0 });
      tot.apps += t.apps; tot.g += t.g; tot.a += t.a; tot.rs += t.rs; if (t.min == null) tot.minOk = false; else tot.min += t.min;
      const open = d.open[sg.key];
      const lgIt = items.find(it => it.cat === 'league') || sn.items.find(it => it.cat === 'league');
      const who = nt ? [h('span', { class: 'cc' }, U.natCrest(P ? P.nat : '', 16), h('span', null, C.natName(P ? P.nat : '')))] : sg.single ? [...new Set(items.filter(it => it.club).map(it => it.club))].map(cid => clubLink(w, cid, 16)) : [clubLink(w, sg.club, 16)];
      const tag = nt ? null : sg.single ? (lgIt && lgIt.loan ? '임대' : null) : sg.tag;
      tb.append(h('tr', { class: 'click' + (open ? ' on' : '') + (sn.live ? ' live' : '') + (sg.single ? '' : ' segr'), onclick: () => { d.open[sg.key] = !open; stay(); } },
        h('td', null, h('span', { class: 'mute' }, open ? '▾ ' : '▸ '), nt ? (sn.live ? '진행 중' : sn.wl) : sn.label), h('td', null, ...who, tag ? h('span', { class: 'segtag' + (/임대/.test(tag) ? ' loan' : '') }, tag) : null),
        h('td', null, sn.age != null ? sn.age : ''), h('td', null, sn.ovr != null ? sn.ovr : ''), h('td', null, t.apps), h('td', { class: 'mute' }, mfmt(t.min)), h('td', null, h('b', null, t.g)), h('td', null, t.a), h('td', null, t.apps ? U.rt2(t.rs / t.apps) : '-')));
      if (open) for (const it of items) tb.append(h('tr', { class: 'sub click', title: '눌러서 경기 목록', onclick: () => compMatches(s, pid, it.live ? 'live' : sn.wl, it) },
        h('td'), h('td', { colspan: 3 }, h('span', { class: 'cpt cp-' + ({ league: 'l', cup: 'c', cont: 'e', nt: 'n' })[it.cat] }, ({ league: '리그', cup: '컵', cont: '대륙', nt: '국가대표' })[it.cat]), ' ', it.name, it.club && it.cat !== 'league' ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ` · ${(w.clubs[it.club] || {}).name || ''}`) : null),
        h('td', null, it.apps), h('td', { class: 'mute' }, mfmt(it.min)), h('td', null, it.g), h('td', null, it.a), h('td', null, it.apps ? U.rt2(it.rt) : '-')));
    }
    if (!tb.childNodes.length) tb.append(h('tr', null, h('td', { colspan: 9, class: 'mute', style: { textAlign: 'center', padding: '14px' } }, nt ? '국가대표 대회(월드컵·대륙 대회 본선) 출전 기록이 없습니다.' : '기록이 없습니다.')));
    main.append(h('div', { class: 'sec' }, h('h3', null, nt ? '국가대표 기록' : '시즌별 기록', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, nt ? ' 월드컵·대륙 대회 본선 경기 (친선전·예선 제외)' : ' 클럽 경기만 (국가대표는 별도 탭) · 시즌을 누르면 대회별 · 대회를 누르면 경기 목록')),
      h('div', { class: 'in pfilt' }, h('div', { class: 'seg' }, ...CATS.map(([k, l]) => h('button', { class: d.pf === k ? 'on' : '', onclick: () => { d.pf = k; stay(); } }, l))),
        !nt && clubsOf.length > 1 ? h('select', { class: 'wsel', onchange: ev => { d.pc = ev.target.value; stay(); } }, h('option', { value: '' }, '전체 구단'), ...clubsOf.map(cid => { const o = h('option', { value: cid }, (w.clubs[cid] || {}).name || cid); if (cid === d.pc) o.selected = true; return o; })) : null),
      h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc ptable' }, h('thead', null, h('tr', null, ...['시즌', nt ? '대표팀' : '구단', '나이', 'OVR', '경기', '출전시간', '골', '도움', '평점'].map(x => h('th', null, x)))), tb,
        h('tfoot', null, h('tr', { class: 'me' }, h('td', null, '통산'), h('td'), h('td'), h('td'), h('td', null, tot.apps), h('td', { class: 'mute' }, tot.minOk ? mfmt(tot.min) : mfmt(tot.min) + '+'), h('td', null, tot.g), h('td', null, tot.a), h('td', null, tot.apps ? U.rt2(tot.rs / tot.apps) : '-'))))),
      h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 18px 14px' } }, '출전시간은 이번 버전부터 기록됩니다 (이전 시즌은 -). 진행 중 줄은 지금까지 치른 경기. 경기 목록·상세는 모든 시즌 보관됩니다.')));
  } else main.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '보관된 시즌 기록이 없습니다. 게임 시작(2026/27) 이후 시즌이 끝나야 기록이 쌓입니다.')));
  // 발롱도르 이력
  const bd = (w.bdHist || []).filter(b => !U.cerHidden(b.y)).map(b => { const i = b.top.findIndex(x => x[2] === pid); return i >= 0 ? [b.y, i + 1] : null; }).filter(Boolean);
  if (bd.length) side.append(h('div', { class: 'sec' }, h('h3', null, '발롱도르'), h('div', { class: 'in chg' }, ...bd.map(([y, r]) => h('span', { class: 'chip' + (r === 1 ? ' gold' : '') }, `${y}년 ${r}위`)))));
  // 골든보이 (10위 안)
  const gbh = (w.gbHist || []).filter(b => !U.cerHidden(b.y)).map(b => { const i = b.top.findIndex(x => x[2] === pid); return i >= 0 ? [b.y, i + 1] : null; }).filter(Boolean);
  if (gbh.length) side.append(h('div', { class: 'sec' }, h('h3', null, '골든보이 (21세 이하)'), h('div', { class: 'in chg' }, ...gbh.map(([y, r]) => h('span', { class: 'chip' + (r === 1 ? ' gold' : '') }, `${y}년 ${r}위`)))));
  // 득점왕
  const boots = [];
  for (const b of (w.gsHist || []).filter(b => !U.cerHidden(b.y))) { const i = b.top.findIndex(x => x[2] === pid); if (i === 0) boots.push(`${b.y}년 유러피언 골든슈 (${b.top[0][3]}골)`); }
  for (const lb of Object.keys(w.arch || {})) { const A = w.arch[lb]; for (const id in A.lg) { const L = A.lg[id]; if (L.sc && L.sc[0] && L.sc[0][5] === pid) boots.push(`${lb} ${L.n} 득점왕 (${L.sc[0][2]}골)`); } }
  if (boots.length) side.append(h('div', { class: 'sec' }, h('h3', null, '수상'), h('div', { class: 'in chg' }, ...boots.map(t => h('span', { class: 'chip gold' }, t)))));
  if (U.pfAbout) main.append(U.pfAbout(s, pid, e, c, P, blk));
  if (U.pfInjuries) { const inj = U.pfInjuries(s, pid, e, c, P); if (inj) side.append(inj); }
  // 모바일: 길게 늘이지 않고 탭으로 (개요 · 시즌 · 경력 · 부상). 데스크톱에서는 탭 막대를 숨기고 전부 보여 준다
  { const tabOf = el => { const t = (el.querySelector('h3') || {}).textContent || '';
      if (el.classList.contains('pfab') || el.querySelector('.pfinfo') || el.classList.contains('pfinfo') || el.querySelector('.pfvw') || /^선수 특성/.test(t) || /계약 남은 기간|추정 이적료/.test(el.textContent)) return 'ov';
      if (el.classList.contains('pfcar') || /^(트로피|발롱도르|골든보이|수상|시즌별 기록|국가대표 기록)/.test(t)) return 'car';
      if (/^부상 이력/.test(t)) return 'inj'; return 'st'; };
    const els = [...main.children, ...side.children]; for (const el of els) el.dataset.pt = tabOf(el);
    const d0 = db(); if (d0.ptPid !== pid) { d0.ptPid = pid; d0.pt = 'ov'; }
    const has = k => els.some(el => el.dataset.pt === k);
    const pf2 = main.parentElement; pf2.dataset.tab = d0.pt;
    const TB = [['ov', '개요'], ['st', '시즌'], ['car', '경력'], ['inj', '부상']].filter(([k]) => has(k));
    pf2.before(h('div', { class: 'pftabs' }, ...TB.map(([k, l]) => h('button', { class: d0.pt === k ? 'on' : '', onclick: ev => { d0.pt = k; pf2.dataset.tab = k; ev.currentTarget.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === ev.currentTarget)); scrollTo(0, Math.min(scrollY, pf2.offsetTop - 60)); } }, l)))); }
}

// ---------- 경력 경로 (이동 기록 기반) ----------
// 날짜 → 시즌 시작 연도(2000 기준 오프셋)와 겨울 여부
const seasonOfD = d => { const [y, m] = C.ymd(d); return { y: (m >= 6 ? y : y - 1) - 2000, wi: m <= 3 || m === 12 }; };
function stintPath(w, P, c, e) {
  const mv = String(P.mv || '').split(';').filter(Boolean).map(x => { const [d, k, f, t] = x.split(','); return { d: +d, k, f, t }; }).sort((a, b) => a.d - b.d);
  const H = C.psHist(P), y00 = H.length ? Math.min(...H.map(x => x[0] < 1000 ? x[0] : x[0] - 2000)) : w.year - 2000;
  const out = []; let cur = P.c0[0] ? { cid: P.c0[0], loan: P.c0[1] ? 1 : 0, y0: y00, w0: false, tag: null } : null; if (cur) out.push(cur);
  // 여름 이적시장(6~8월)에 끝나면 그 전 시즌까지, 겨울이면 그 시즌 겨울까지
  const close = d => { if (!cur) return; const so = seasonOfD(d), m = C.ymd(d)[1]; cur.y1 = m >= 6 && m <= 8 ? so.y - 1 : so.y; cur.w1 = so.wi; if (cur.y1 < cur.y0) cur.y1 = cur.y0; };
  for (const m of mv) {
    if (m.k === 'ret') { close(m.d); cur.ret = 1; cur = null; continue; }
    if (m.k === 'rel') { close(m.d); cur = null; continue; }
    if (cur && m.t === cur.cid) { if (m.k === 'buy' && cur.loan) { cur.loan = 0; cur.tag = '임대 → 완전 이적'; } continue; }
    close(m.d);
    const so = seasonOfD(m.d);
    cur = { cid: m.t, loan: m.k === 'loan' ? 1 : 0, y0: so.y, w0: so.wi, tag: m.k === 'lret' ? '임대 복귀' : m.k === 'bu' ? '1군 승격' : m.k === 'bt' ? '2군' : null };
    if (cur.cid) out.push(cur); else cur = null;
  }
  if (cur) { cur.y1 = null; cur.w1 = false; }
  // 지금 소속과 다르면(예전 저장 등) 믿지 않는다
  const last = out[out.length - 1];
  if (c && !c.lite && (!last || last.cid !== c.id || last.y1 != null)) return null;
  for (const x of out) { if (x.y1 === undefined) x.y1 = x.y0; x.mv = 1; }
  // 임대 복귀는 돌아와서 그 구단에서 실제로 뛰었을 때만 한 칸으로 남긴다 (복귀하자마자 다른 팀으로 갔으면 뺀다)
  const appsIn = x => H.reduce((t, r) => { const y = r[0] < 1000 ? r[0] : r[0] - 2000; return t + (C.cidOf(w, r[1]) === x.cid && y >= x.y0 && y <= x.y1 ? (+r[2] || 0) : 0); }, 0);
  const res = out.filter(x => !(x.tag === '임대 복귀' && x.y1 != null && !appsIn(x)));
  return res.length ? res : null;
}
// ---------- 구단: 이적 기록 ----------
const TXK = { bt: ['2군으로 이동', '1군에서 이동'], bu: ['1군 승격', '2군에서 승격'], buy: ['이적', '영입'], free: ['자유계약', '자유계약 영입'], loan: ['임대 보냄', '임대 영입'], lret: ['임대 종료', '임대 복귀'], rel: ['방출', ''], ret: ['은퇴', ''], yth: ['', '유스 승격'], new: ['', '외부 영입'], ext: ['재계약', '재계약'] };
const txLabels = w => [...new Set((w.txKeys || []).concat(Object.keys(w.arch || {})))].sort().reverse();
// 한 시즌 이적시장에서 이 구단의 영입·방출 (내 선수 이적 포함)
function clubWindow(s, id, label) {
  const w = s.w, T = U.withTx(label, () => stay());
  const inn = [], out = [];
  const ext = [];
  const today = w.cal ? w.cal.d : 1e9;
  if (T) for (const r of T) { if (r[10] != null && r[10] > today) continue; if (r[3] === 'ext') { if (r[1] === id) ext.push(r); continue; } if (r[2] === id) inn.push(r); else if (r[1] === id) out.push(r); }
  // 내 선수의 이적 (게임 진행 기록)
  const cj = s.clubsJoined || [], y0 = +label.slice(0, 4);
  cj.forEach((x, i) => { if (x.y !== y0 || !i) return; const prev = cj[i - 1]; const row = ['ME', prev.club || '', x.club, x.type === 'loan' ? 'loan' : x.fee ? 'buy' : 'free', Math.round((x.fee || 0) / 1e4), null, null]; if (x.club === id) inn.push(row); else if (prev.club === id) out.push(row); });
  return { T, inn, out, ext, ready: !!T || !(w.txKeys || []).includes(label), trim: T && T.trim };
}
function txTable(s, rows, side) {
  const w = s.w;
  if (!rows.length) return h('div', { class: 'empty', style: { padding: '10px 0' } }, '없음');
  rows = rows.slice().sort((a, b) => b[4] - a[4] || (b[5] || 0) - (a[5] || 0));
  const cto = r => r[3] === 'loan' ? '1년 임대' : r[8] && side && !['lret'].includes(r[3]) ? `${r[8]}년` : '';
  return h('table', { class: 'ltable lc', style: { minWidth: '640px' } }, h('thead', null, h('tr', null, ...['선수', '나이', 'OVR', side ? '보낸 구단' : '간 구단', '형태', '이적료', side ? '계약' : '', side ? C.wageUnit() : ''].map(x => h('th', null, x)))),
    h('tbody', null, ...rows.map(r => { const other = side ? r[1] : r[2];
      return h('tr', { class: r[0] === 'ME' ? 'me' : '' }, h('td', null, r[0] === 'ME' ? h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${s.p.name} (나)`) : nameLink(C.MD.nameOf(r[0]), r[0])), h('td', null, r[6] != null ? r[6] : ''), h('td', null, r[5] != null ? r[5] : ''),
        h('td', null, other && w.clubs[other] ? clubLink(w, other, 16) : h('span', { class: 'mute' }, r[3] === 'yth' ? '유스' : r[3] === 'new' ? '외부 (기록 밖 구단)' : r[3] === 'ret' ? '은퇴' : '무소속')),
        h('td', null, h('span', { class: 'chip ' + (r[3] === 'buy' ? 'gold' : r[3] === 'loan' || r[3] === 'lret' ? 'blue' : '') }, (TXK[r[3]] || [r[3], r[3]])[side ? 1 : 0] || r[3])), h('td', null, r[4] ? h('b', null, C.fmtEUR(r[4] * 1e4)) : h('span', { class: 'mute' }, '-')),
        h('td', { class: 'mute', style: { fontSize: '12px' } }, side ? cto(r) : ''), h('td', null, side && r[7] ? C.fmtWage(r[7], true) : '')); })));
}
function extTable(s, rows) {
  if (!rows.length) return h('div', { class: 'empty', style: { padding: '10px 0' } }, '없음');
  rows = rows.slice().sort((a, b) => (b[5] || 0) - (a[5] || 0));
  return h('table', { class: 'ltable lc', style: { minWidth: '560px' } }, h('thead', null, h('tr', null, ...['선수', '나이', 'OVR', '새 계약', `이전 ${C.wageUnit()}`, `새 ${C.wageUnit()}`, '변화'].map(x => h('th', null, x)))),
    h('tbody', null, ...rows.map(r => { const ow = r[9], nw = r[7], ch = ow ? Math.round((nw - ow) / ow * 100) : null;
      return h('tr', null, h('td', null, nameLink(C.MD.nameOf(r[0]), r[0])), h('td', null, r[6]), h('td', null, r[5]), h('td', null, `${r[8]}년`), h('td', { class: 'mute' }, ow != null ? C.fmtWage(ow, true) : '-'), h('td', null, h('b', null, C.fmtWage(nw, true))),
        h('td', { style: { color: ch == null ? null : ch > 0 ? 'var(--good, #2fbf71)' : ch < 0 ? 'var(--bad, #e5484d)' : null, fontWeight: 700 } }, ch == null ? '' : (ch > 0 ? '+' : '') + ch + '%')); })));
}
// 한 시즌 이적시장 합계: 지출·수입(이적료와 임대료), 영입·방출 수
function windowTotals(inn, out) {
  const t = { spent: 0, got: 0, loanPaid: 0, loanGot: 0, nIn: inn.length, nOut: out.length, nBuy: 0, nFree: 0, nLoanIn: 0, nLoanOut: 0, nSold: 0 };
  for (const r of inn) { t.spent += r[4]; if (r[3] === 'loan') { t.loanPaid += r[4]; t.nLoanIn++; } else if (r[3] === 'buy') t.nBuy++; else if (r[3] === 'free') t.nFree++; }
  for (const r of out) { t.got += r[4]; if (r[3] === 'loan') { t.loanGot += r[4]; t.nLoanOut++; } else if (r[3] === 'buy') t.nSold++; }
  return t;
}
function windowSec(s, id, label) {
  const { inn, out, ext, ready, trim } = clubWindow(s, id, label);
  if (!ready) return h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이적 기록을 불러오는 중…'));
  if (!(s.w.txKeys || []).includes(label) && !inn.length && !out.length) return h('div', { class: 'sec' }, h('div', { class: 'empty' }, `${label} 이적시장 기록이 없습니다. (이 기능이 추가된 뒤 이적시장부터 기록됩니다)`));
  const t = windowTotals(inn, out), E = v => C.fmtEUR(v * 1e4);
  const chips = [['총 지출', E(t.spent) + (t.loanPaid ? ` (임대료 ${E(t.loanPaid)})` : '')], ['총 수입', E(t.got) + (t.loanGot ? ` (임대료 ${E(t.loanGot)})` : '')], ['순지출', E(t.spent - t.got)], ['영입', `${t.nIn}명 · 이적 ${t.nBuy} · 자유 ${t.nFree} · 임대 ${t.nLoanIn}`], ['방출', `${t.nOut}명 · 이적 ${t.nSold} · 임대 ${t.nLoanOut}`], ['재계약', `${ext.length}명`]];
  return h('div', { class: 'sec' }, h('h3', null, `${C.txName(label)} 이적시장`), trim ? h('div', { class: 'sub' }, '오래된 시즌이라 이적료가 있었던 이동과 OVR 75 이상 선수만 보관합니다. (지출·수입 합계는 그대로)') : null,
    h('div', { class: 'wsum' }, ...chips.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2))))),
    h('div', { class: 'in' }, h('div', { class: 'lbl' }, `들어온 선수 ${inn.length}`), h('div', { class: 'tscroll' }, txTable(s, inn, 1)), h('div', { class: 'lbl', style: { marginTop: '14px' } }, `나간 선수 ${out.length}`), h('div', { class: 'tscroll' }, txTable(s, out, 0)),
      h('div', { class: 'lbl', style: { marginTop: '14px' } }, `재계약 ${ext.length}`), h('div', { class: 'tscroll' }, extTable(s, ext))));
}
U.windowTotals = windowTotals;
function clubTx(s, root, id) {
  const w = s.w, d = db(), labels = (w.txKeys || []).slice().reverse();
  if (!labels.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 이적시장 기록이 없습니다. 첫 이적시장(1월 겨울, 6~8월 여름)부터 기록됩니다.'))); return; }
  if (!d.ctx || !labels.includes(d.ctx)) d.ctx = labels[0];
  // 시즌별 요약 (불러온 시즌만 숫자 표시)
  root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { d.ctx = e.target.value; stay(); } }, ...labels.map(l => { const o = h('option', { value: l }, `${C.txName(l)} 이적시장`); if (l === d.ctx) o.selected = true; return o; }))));
  root.append(windowSec(s, id, d.ctx));
}
// ---------- 구단: 시즌별 기록 ----------
// ---------- 시즌 기록 색인 ----------
const csCache = new Map(); let psIdx = null;
function psIndex(w) {
  const gen = C.psGen || 0; if (psIdx && psIdx.w === w && psIdx.gen === gen) return psIdx.by;
  const by = {};
  for (const pid in (w.ps || {})) { const h0 = w.ps[pid].h; if (!h0) continue;
    for (const row of (Array.isArray(h0) ? h0.map(r => r.join(',')) : String(h0).split(';'))) { if (!row) continue; const a = row.indexOf(','), b = row.indexOf(',', a + 1); if (a < 0) continue;
      let y = +row.slice(0, a); if (y >= 1000) y -= 2000; const cid = C.cidOf(w, isNaN(+row.slice(a + 1, b)) ? row.slice(a + 1, b) : +row.slice(a + 1, b));
      const Y = by[y] || (by[y] = {}); (Y[cid] || (Y[cid] = [])).push(pid); } }
  psIdx = { w, gen, by }; return by;
}
// 한 시즌 한 구단 선수 기록 (전 대회 합계) — 시즌 기록·구단 기록 화면이 함께 쓴다 (캐시)
function clubSeasonRows(w, id, label) {
  const yOff = +String(label).slice(0, 4) - 2000, ck = `${label}|${id}|${C.psGen || 0}`;
  let rows = csCache.get(ck);
  if (rows) return rows;
  rows = []; const pids = ((psIndex(w)[yOff] || {})[id]) || [];
  for (const pid of pids) {
    const P = w.ps[pid]; if (!P || !P.h) continue;
    const sn = playerSeasons(w, P).find(x => x.y === yOff); if (!sn) continue;
    const its = sn.items.filter(it => it.club === id || (it.cat !== 'league' && it.cat !== 'nt' && sn.items.some(z => z.cat === 'league' && z.club === id)));
    const lgI = its.find(it => it.cat === 'league'); if (!lgI) continue;
    const t = its.reduce((a, it) => (a.apps += it.apps, a.g += it.g, a.a += it.a, a.rs += it.rt * it.apps, a.mom += it.mom || 0, a), { apps: 0, g: 0, a: 0, rs: 0, mom: 0 });
    rows.push({ pid, n: P.n, pos: P.pos, age: sn.age, apps: t.apps, g: t.g, a: t.a, rt: t.apps ? t.rs / t.apps : 0, lgApps: lgI.apps, lgG: lgI.g, loan: lgI.loan, mom: t.mom });
  }
  if (csCache.size > 80) csCache.clear(); csCache.set(ck, rows); return rows;
}
// ---------- 구단 기록 (게임 시작 이후) ----------
function clubRecords(s, root, id) {
  const w = s.w, c = w.clubs[id], R = (w.crec || {})[id] || { st: {} }, labels = Object.keys(w.arch || {}).sort();
  const pn = (n, pid) => n || ((w.ps || {})[pid] || {}).n || (G.FC27 && /^\d+$/.test(pid) && G.FC27.P[+pid] ? G.FC27.P[+pid][1] : String(pid).split('#')[0].split('~').pop());
  const cn = cid => (w.clubs[cid] || {}).name || cid, dt = d => d != null ? C.fmtDateY(d) : '', link = (n, pid) => nameLink(pn(n, pid), pid);
  const sl = lb => lb;
  const card = (title, rows, note) => h('div', { class: 'sec crec' }, h('h3', null, title, note ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' ' + note) : null),
    h('div', { class: 'in crg' }, ...rows.filter(Boolean).map(([k, v, sub]) => h('div', { class: 'crr' }, h('span', { class: 'mute' }, k), h('b', null, v), sub ? h('small', { class: 'mute' }, sub) : null))));
  const none = '기록 없음';
  // --- 선수 기록: 시즌별 행 모으기
  const per = labels.map(lb => ({ lb, rows: clubSeasonRows(w, id, lb) }));
  let bG = null, bA = null; const tot = new Map();
  for (const { lb, rows } of per) for (const r of rows) {
    if (!bG || r.g > bG.r.g) bG = { lb, r }; if (!bA || r.a > bA.r.a) bA = { lb, r };
    const t = tot.get(r.pid) || { n: r.n, pid: r.pid, apps: 0, g: 0, a: 0, ss: 0, tr: 0, cap: 0 }; t.apps += r.apps; t.g += r.g; t.a += r.a; t.ss++; tot.set(r.pid, t);
  }
  // 우승 트로피 (이 구단 소속으로 뛴 시즌에 구단이 들어 올린 트로피)
  const trOf = lb => { const A = w.arch[lb]; let n = 0; if (!A) return 0; for (const lid in A.lg) { const L = A.lg[lid]; if (L.t && L.t[0] && L.t[0][0] === id && (w.lg[lid] || {}).tier === 1) n++; } for (const g of [A.cup, A.lcup, A.cont]) for (const k in g || {}) if (g[k] && g[k].w === id) n++; return n; };
  // 주장: 그 시즌 리그 15경기 이상 뛴 22세 이상 선수 중 이 구단에서 가장 오래 뛴 선수 (같으면 출전이 많은 선수)
  const seen = new Map();
  for (const { lb, rows } of per) { const T = trOf(lb);
    for (const r of rows) { if (T && r.apps) tot.get(r.pid).tr += T; }
    const cand = rows.filter(r => r.lgApps >= 15 && (r.age || 0) >= 22 && !r.loan).sort((a, b) => ((seen.get(b.pid) || 0) - (seen.get(a.pid) || 0)) || b.apps - a.apps);
    if (cand[0]) tot.get(cand[0].pid).cap++;
    for (const r of rows) seen.set(r.pid, (seen.get(r.pid) || 0) + 1);
  }
  const T = [...tot.values()], top = k => T.slice().sort((a, b) => b[k] - a[k])[0];
  const tA = top('apps'), tG = top('g'), tT = top('tr'), tC = top('cap');
  const age = a => `${Math.floor(a)}세 ${Math.floor((a % 1) * 365.25)}일`;
  const stR = (k, unit) => { const x = R.st[k]; return x && x[2] ? [`${x[2]}${unit}`, `${dt(x[3])} ~ ${dt(x[4])}${x[0] === x[2] ? ' · 진행 중' : ''}`] : [none, '']; };
  const pRec = (x, f) => x ? [h('span', null, link(x[2], x[1])), f(x)] : [none, ''];
  root.append(h('div', { class: 'mute', style: { fontSize: '12.5px', margin: '0 2px 10px' } }, `게임 시작(2026/27) 이후 기록 · ${labels.length}시즌 보관 · 경기 기록은 매 경기 갱신`));
  const grid = h('div', { class: 'crwrap' });
  grid.append(card('개인 기록', [
    ['단일 시즌 최다 득점', bG && bG.r.g ? h('span', null, link(bG.r.n, bG.r.pid), ` ${bG.r.g}골`) : none, bG && bG.r.g ? `${bG.lb} · ${bG.r.apps}경기` : ''],
    ['단일 시즌 최다 도움', bA && bA.r.a ? h('span', null, link(bA.r.n, bA.r.pid), ` ${bA.r.a}도움`) : none, bA && bA.r.a ? `${bA.lb} · ${bA.r.apps}경기` : ''],
    ['통산 최다 득점', tG && tG.g ? h('span', null, link(tG.n, tG.pid), ` ${tG.g}골`) : none, tG ? `${tG.apps}경기 · ${tG.ss}시즌` : ''],
    ['통산 최다 출전', tA && tA.apps ? h('span', null, link(tA.n, tA.pid), ` ${tA.apps}경기`) : none, tA ? `${tA.ss}시즌` : ''],
    ['연속 경기 득점', ...(R.sG ? [h('span', null, link(R.sG[2], R.sG[1]), ` ${R.sG[0]}경기`), `${dt(R.sG[3])}까지`] : [none, ''])],
    ['연속 경기 공격포인트', ...(R.sA ? [h('span', null, link(R.sA[2], R.sA[1]), ` ${R.sA[0]}경기`), `${dt(R.sA[3])}까지`] : [none, ''])],
    ['최단 시간 득점', ...(R.fg ? [h('span', null, link(R.fg[2], R.fg[1]), ` ${U.fmtMin(R.fg[0])}`), `${dt(R.fg[3])} · ${cn(R.fg[4])}전`] : [none, ''])],
    ['최다 우승 선수', tT && tT.tr ? h('span', null, link(tT.n, tT.pid), ` ${tT.tr}회`) : none, tT && tT.tr ? `${tT.ss}시즌` : ''],
    ['최연소 출전', ...pRec(R.yA, x => `${age(x[0])} · ${dt(x[3])}`)], ['최고령 출전', ...pRec(R.oA, x => `${age(x[0])} · ${dt(x[3])}`)],
    ['최연소 득점', ...pRec(R.yG, x => `${age(x[0])} · ${dt(x[3])}`)], ['최고령 득점', ...pRec(R.oG, x => `${age(x[0])} · ${dt(x[3])}`)],
    ['최장수 주장', tC && tC.cap ? h('span', null, link(tC.n, tC.pid), ` ${tC.cap}시즌`) : none, '주장: 그 시즌 이 구단 최장기 주전'],
  ]));
  // --- 팀 기록
  let sP = null, sW = null, sL = null, sF = null, sA = null;
  for (const lb of labels) { const A = w.arch[lb]; for (const lid in A.lg) { const L = A.lg[lid], r = (L.t || []).find(x => x[0] === id); if (!r) continue; const o = { lb, n: L.n || (w.lg[lid] || {}).name, r };
    if (!sP || r[7] > sP.r[7]) sP = o; if (!sW || r[2] > sW.r[2]) sW = o; if (!sL || r[4] < sL.r[4]) sL = o; if (!sF || r[5] > sF.r[5]) sF = o; if (!sA || r[6] < sA.r[6]) sA = o; } }
  const lgS = (o, f) => o ? [f(o.r), `${o.lb} ${o.n} · ${o.r[2]}승 ${o.r[3]}무 ${o.r[4]}패`] : [none, ''];
  const mt = x => x ? [`${x[1]}-${x[2]}`, `${cn(x[3])}전 · ${dt(x[4])}${x[5] === 'cont' ? ' · 대륙 대회' : x[5] === 'cup' ? ' · 컵' : ''}`] : [none, ''];
  grid.append(card('팀 기록', [
    ['최다 점수 차 승리', ...mt(R.bw)], ['최다 점수 차 패배', ...mt(R.bl)],
    ['리그 최다 연승', ...stR('lW', '연승')], ['전 대회 최다 연승', ...stR('aW', '연승')],
    ['리그 최다 무패', ...stR('lU', '경기')], ['전 대회 최다 무패', ...stR('aU', '경기')],
    ['리그 최다 연패', ...stR('lL', '연패')], ['전 대회 최다 연패', ...stR('aL', '연패')],
    ['리그 최장 무승', ...stR('lN', '경기')], ['홈 최다 무패', ...stR('hU', '경기')],
    ['한 시즌 최다 승점', ...lgS(sP, r => `${r[7]}점`)], ['한 시즌 최다 승', ...lgS(sW, r => `${r[2]}승`)], ['한 시즌 최소 패', ...lgS(sL, r => `${r[4]}패`)],
    ['한 시즌 최다 득점', ...lgS(sF, r => `${r[5]}골`)], ['한 시즌 최소 실점', ...lgS(sA, r => `${r[6]}실점`)],
    ['최다 관중', ...(R.att ? [`${R.att[0].toLocaleString()}명`, `${cn(R.att[1])}전 · ${dt(R.att[2])}`] : [none, ''])],
  ], '연속 기록은 전 대회/리그 따로'));
  // --- 이적·감독
  const fee = x => C.fmtEUR(x[0] * 1e4);
  const txL = (L, lbl) => L && L.length ? h('div', { class: 'crtx' }, h('div', { class: 'lbl' }, lbl), ...L.map((x, i) => h('div', { class: 'crr2' }, h('span', { class: 'mute' }, i + 1), h('span', null, link(x[2], x[1])), h('b', null, fee(x)), h('small', { class: 'mute' }, `${lbl === '최고 이적료 영입' ? cn(x[4]) + '에서' : C.jo(cn(x[4]), '으로', '로')} · ${dt(x[3])}`)))) : h('div', { class: 'crtx' }, h('div', { class: 'lbl' }, lbl), h('div', { class: 'mute' }, none));
  const MG = ((w.mgrH || {})[id] || []).slice(), cur = (w.mgr || {})[id], now = w.cal ? w.cal.d : 0;
  if (cur) MG.push(Object.assign({}, cur, { d1: null }));
  const len = m => (m.d1 != null ? m.d1 : now) - m.d0;
  const mLong = MG.slice().sort((a, b) => len(b) - len(a))[0], mG = MG.slice().sort((a, b) => b.g - a.g)[0], mW = MG.filter(m => m.g >= 30).sort((a, b) => b.w / b.g - a.w / a.g)[0];
  const ym = d => { const y = Math.floor(d / 365.25), mm = Math.floor((d % 365.25) / 30.44); return y ? `${y}년 ${mm}개월` : `${mm}개월`; };
  const mrow = (m, v) => m ? [h('span', null, `${m.n} `, flag(m.nat, 12)), v(m) + ` · ${dt(m.d0)} ~ ${m.d1 != null ? dt(m.d1) : '지금'}`] : [none, ''];
  grid.append(h('div', { class: 'sec crec' }, h('h3', null, '이적·감독'), h('div', { class: 'in' }, txL(R.buy, '최고 이적료 영입'), txL(R.sell, '최고 이적료 판매'),
    h('div', { class: 'crg', style: { marginTop: '10px' } }, ...[['최장수 감독', ...mrow(mLong, m => ym(len(m)))], ['최다 경기 지휘', ...mrow(mG, m => `${m.g}경기`)], ['최고 승률 (30경기 이상)', ...mrow(mW, m => `${(m.w / m.g * 100).toFixed(1)}% (${m.w}승 ${m.dr}무 ${m.l}패)`)],
      cur ? ['현재 감독', h('span', null, `${cur.n} `, flag(cur.nat, 12)), `${dt(cur.d0)}부터 · ${cur.g}경기 ${cur.w}승 ${cur.dr}무 ${cur.l}패`] : null].filter(Boolean).map(([k, v, sub]) => h('div', { class: 'crr' }, h('span', { class: 'mute' }, k), h('b', null, v), sub ? h('small', { class: 'mute' }, sub) : null))))));
  root.append(grid);
}
function clubSeason(s, root, id) {
  const w = s.w, d = db(), labels = Object.keys(w.arch || {}).sort().reverse();
  if (!labels.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '첫 시즌이 끝나면 기록이 쌓입니다.'))); return; }
  if (!d.cs || !labels.includes(d.cs)) d.cs = labels[0];
  const A = w.arch[d.cs], y = +d.cs.slice(0, 4), yOff = y - 2000;
  // 성적
  const res = [];
  for (const lid in A.lg) { const L = A.lg[lid], i = (L.t || []).findIndex(r => r[0] === id); if (i >= 0) { const r = L.t[i]; res.push([L.n, `${i + 1}위 / ${L.slim ? '-' : L.t.length}`, `${r[2]}승 ${r[3]}무 ${r[4]}패 · 승점 ${r[7]} · ${r[5]}득 ${r[6]}실`, i === 0]); } }
  for (const grp of [A.cup, A.lcup]) for (const n in grp || {}) { const cup = grp[n]; const inR = (cup.r || []).filter(rd => rd.m.some(m => m[0] === id || m[1] === id)); if (!inR.length) continue; res.push([cup.n, cup.w === id ? '우승' : cup.ru === id ? '준우승' : `${inR[inR.length - 1].n} 탈락`, '', cup.w === id]); }
  for (const k in A.cont || {}) { const K = A.cont[k]; const inR = (K.r || []).filter(rd => rd.t.some(t => t[0] === id || t[1] === id)); const inPh = (K.ph || []).findIndex(r => r[0] === id); if (!inR.length && inPh < 0) continue; res.push([K.n, K.w === id ? '우승' : inR.length ? `${inR[inR.length - 1].n}${K.w === id ? '' : ' 탈락'}` : `리그 페이즈 ${inPh + 1}위`, '', K.w === id]); }
  root.append(h('div', { class: 'sec' }, h('h3', null, `${d.cs} 성적`), res.length ? h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...res.map(([n, v, sub, gold]) => h('div', { class: 'csrow' }, h('b', null, n), h('span', { style: { color: gold ? 'var(--gold)' : null, fontWeight: 700 } }, v), h('span', { class: 'mute', style: { fontSize: '12px' } }, sub)))) : h('div', { class: 'empty' }, '기록 없음')));
  // 선수 기록 (이 시즌 이 구단에서 뛴 선수 전원, 전 대회 합계)
  // 전체 선수 기록(15만 명)을 매번 훑지 않도록: 시즌·구단 → 선수 색인을 한 번 만들고, 결과 행도 기억해 둔다 (정렬은 행만 다시 정렬)
  let rows = clubSeasonRows(w, id, d.cs);
  rows = rows.slice();
  const me = (s.hist || []).find(r => r.label === d.cs && r.club === id);
  if (me) rows.push({ pid: 'ME', n: s.p.name + ' (나)', pos: me.pos, age: me.age, apps: me.total.apps, g: me.total.goals, a: me.total.assists, rt: me.rating || 0, lgApps: (me.agg && me.agg.league ? me.agg.league.st.apps : 0) });
  if (!d.csSort) d.csSort = 'apps';
  rows.sort((a, b) => (b[d.csSort] || 0) - (a[d.csSort] || 0));
  const th = (k, l) => h('th', { class: 'lnk' + (d.csSort === k ? ' on' : ''), onclick: () => { d.csSort = k; stay(); } }, l);
  const tg = rows.reduce((a, r) => a + r.g, 0);
  root.append(h('div', { class: 'sec' }, h('h3', null, `선수 기록 ${rows.length}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 전 대회 합계 · 팀 득점 중 선수 득점 ${tg} (자책골 제외) · 열 제목을 누르면 정렬`)),
    rows.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, h('th', null, '선수'), h('th', null, '포지션'), h('th', null, '나이'), th('apps', '경기'), th('lgApps', '리그'), th('g', '골'), th('a', '도움'), th('mom', '★ MOM'), th('rt', '평점'))),
      h('tbody', null, ...rows.map(r => h('tr', { class: r.pid === 'ME' ? 'me' : '' }, h('td', null, r.pid === 'ME' ? h('span', { class: 'lnk', onclick: () => U.setTab('records') }, r.n) : nameLink(r.n, r.pid, r.loan ? 'loanin' : ''), r.loan ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ' (임대)') : null), h('td', null, h('span', { class: 'tpos' }, r.pos)), h('td', null, r.age != null ? r.age : ''), h('td', null, r.apps), h('td', null, r.lgApps), h('td', null, h('b', null, r.g)), h('td', null, r.a), h('td', null, r.mom ? h('span', { class: 'momn' }, '★ ' + r.mom) : h('span', { class: 'mute' }, '-')), h('td', null, r.rt ? U.rt2(r.rt) : '-')))))) : h('div', { class: 'empty' }, '선수 기록이 없습니다 (명단 없는 하부 구단).')));
  // 그 시즌 이적시장 (시즌 시작 전 여름)
  root.append(windowSec(s, id, d.cs));
}
// ---------- 구단 ----------
// ---------- 구단: 개요 · 일정·결과 · 스쿼드 · 시즌 기록 · 이적 · 역사 ----------
// 구단 경기 목록. src: 'live'(진행 중) 또는 보관 시즌 이름. 리그·국내 컵·대륙 대회 전부, 앞으로 치를 경기 포함
function clubSeasonsOpt(s, id) {
  const w = s.w, c = w.clubs[id], out = [];
  if (w.cal) { const LS = c && w.cal.lg[c.lg]; out.push({ k: 'live', n: `${LS ? LS.label : C.wLabel(w.year)} 진행 중` }); }
  for (const lb of (w.mxKeys || []).slice().reverse()) out.push({ k: lb, n: lb });
  return out;
}
function cupName(w, key) { const [nat, kind] = String(key).split(':'); return kind === 'lcup' ? ((C.LCUPNAME || {})[nat] || `${C.natName(nat)} 리그컵`) : ((C.CUPNAME || {})[nat] || `${C.natName(nat)} 국내 컵`); }
function clubFx(s, id, src) {
  const w = s.w, cix = C.cix(w, id), items = [];
  const st = src === 'live' ? U.liveSt() : (U.mxCached(src) || U.withMx(src, () => U.stay()));
  if (!st) return null;
  const push = (o) => { o.home = o.a === id; o.opp = o.home ? o.b : o.a; if (!o.pend) { o.gf = o.home ? o.ga : o.gb; o.gag = o.home ? o.gb : o.ga; o.res = o.gf > o.gag ? 'W' : o.gf < o.gag ? 'L' : o.pw ? (o.pw === id ? 'W' : 'L') : 'D'; } items.push(o); };
  for (const lid in st.L || {}) {
    const L = st.L[lid]; if (!L || !L.s) continue;
    const rows = C.MD.leagueRows(w, L); if (!rows.some(r => r.a === id || r.b === id)) continue;
    const lgName = (w.lg[lid] || {}).name || '리그', sl = L.sl || src;
    for (const r of rows) if (r.a === id || r.b === id) push({ k: 'L', comp: lgName, lid, stage: `${r.r + 1}라운드`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: r.d, open: () => U.showMatch({ title: `${lgName} ${sl} · ${r.r + 1}라운드${r.d != null ? ' · ' + C.fmtDateY(r.d) : ''}`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: C.MD.leagueMatch(st, L, r.i), key: lid + '|' + src + '|' + r.i, ctx: { st, lg: lid, L, i: r.i, date: r.d } }) });
    if (src === 'live') { const LS = w.cal.lg[lid]; if (LS && !LS.done) for (let i = LS.ri; i < LS.dates.length; i++) for (const [a, b] of LS.R[i] || []) { const A = C.cidOf(w, a), B = C.cidOf(w, b); if (A === id || B === id) push({ k: 'L', comp: lgName, lid, stage: `${i + 1}라운드`, a: A, b: B, d: LS.dates[i], pend: 1 }); } }
  }
  const rowsOf = (grp, kind) => { for (const key in grp || {}) for (const r of grp[key] || []) { if (r[1] !== cix && r[2] !== cix) continue; const A = C.cidOf(w, r[1]), B = C.cidOf(w, r[2]); const nm = kind === 'C' ? cupName(w, key) : (C.COMPS[key] ? C.COMPS[key].name : key);
    push({ k: kind, comp: nm, ck: key, stage: r[0], a: A, b: B, ga: r[3], gb: r[4], pw: r[7] != null ? C.cidOf(w, r[7]) : null, d: r[8], open: () => U.showMatch({ title: `${nm} · ${r[0]} · ${C.fmtDateY(r[8])}`, a: A, b: B, ga: r[3], gb: r[4], pw: r[7] != null ? C.cidOf(w, r[7]) : null, d: C.MD.decode(st, r), key: kind + key + src + r[1] + r[2] + r[0], ctx: { st, grp: kind === 'C' ? 'CUP' : 'CONT', key, stage: r[0], date: r[8] } }) }); } };
  rowsOf(st.CUP, 'C'); rowsOf(st.CONT, 'E');
  if (src === 'live') for (const k in w.cal.cont) { const cs = w.cal.cont[k]; if (!cs.teams.includes(id)) continue;
    for (let i = cs.di; i < cs.dates.length; i++) { if (i < cs.phaseN) { for (const [a, b] of cs.md[i] || []) if (a === id || b === id) push({ k: 'E', comp: cs.name, ck: cs.k, stage: `리그 페이즈 ${i + 1}차전`, a, b, d: cs.dates[i], pend: 1 }); }
      else { const [ri, leg] = cs.kmap[i - cs.phaseN], rd = cs.rounds[ri], ties = cs.ties && cs.ties[ri]; if (ties) for (const t of ties) if (!t.win && (t[0] === id || t[1] === id)) push({ k: 'E', comp: cs.name, ck: cs.k, stage: rd[2] + (rd[1] ? (leg ? ' 2차전' : ' 1차전') : ''), a: leg ? t[1] : t[0], b: leg ? t[0] : t[1], d: cs.dates[i], pend: 1 }); } } }
  items.sort((a, b) => (a.d || 0) - (b.d || 0));
  return items;
}
function wdl(list) { const t = { n: 0, W: 0, D: 0, L: 0, gf: 0, ga: 0, cs: 0 }; for (const x of list) { if (x.pend) continue; t.n++; t[x.res]++; t.gf += x.gf; t.ga += x.gag; if (x.gag === 0) t.cs++; } return t; }
function wdlBar(t, label) {
  const pc = k => t.n ? Math.round(t[k] / t.n * 100) : 0;
  return h('div', { class: 'wdl' }, h('div', { class: 'wdlh' }, h('b', null, label), h('span', { class: 'mute' }, `${t.n}경기 ${t.W}승 ${t.D}무 ${t.L}패 · ${t.gf}득 ${t.ga}실${t.n ? ` · 승률 ${pc('W')}%` : ''}`)),
    h('div', { class: 'wdlb' }, t.n ? [h('i', { class: 'W', style: { width: pc('W') + '%' } }), h('i', { class: 'D', style: { width: pc('D') + '%' } }), h('i', { class: 'L', style: { width: (100 - pc('W') - pc('D')) + '%' } })] : h('i', { class: 'E', style: { width: '100%' } })));
}
const RESK = { W: '승', D: '무', L: '패' };
function fxItem(s, x, id) {
  const w = s.w, oc = w.clubs[x.opp];
  return h('div', { class: 'cfx' + (x.pend ? ' pend' : ' click'), onclick: x.pend || !x.open ? null : x.open },
    h('span', { class: 'mute cfd' }, x.d != null ? C.fmtDate(x.d) : ''), h('span', { class: 'cfc mute' }, x.comp, h('small', null, ` ${x.stage}`)),
    h('span', { class: 'cfo' }, h('span', { class: 'ha' }, x.home ? 'H' : 'A'), crest(oc || null, 16), h('span', null, oc ? oc.name : '-')),
    h('b', { class: 'cfs' }, x.pend ? 'vs' : `${x.gf} - ${x.gag}${x.pw ? ' PK' : ''}`), x.pend ? h('span') : h('span', { class: 'res ' + x.res }, RESK[x.res]));
}
function clubFixtures(s, root, id, d) {
  const w = s.w, opts = clubSeasonsOpt(s, id);
  if (!opts.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '경기 기록이 없습니다.'))); return; }
  if (!d.cfs || !opts.some(o => o.k === d.cfs)) d.cfs = opts[0].k;
  const items = clubFx(s, id, d.cfs);
  const flt = d.cff || 'all';
  root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { d.cfs = e.target.value; stay(); } }, ...opts.map(o => { const op = h('option', { value: o.k }, o.n); if (o.k === d.cfs) op.selected = true; return op; }))));
  if (!items) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '기록을 불러오는 중…'))); return; }
  if (!items.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, d.cfs === 'live' ? '이 시즌 경기 일정이 아직 없습니다.' : '이 시즌의 경기 기록이 없습니다.'))); return; }
  const comps = [...new Set(items.map(x => x.comp))];
  const played = items.filter(x => !x.pend);
  // 성적 요약: 전체 · 홈 · 원정 · 대회별
  const sum = h('div', { class: 'sec' }, h('h3', null, '승·무·패'), h('div', { class: 'in', style: { display: 'grid', gap: '10px' } },
    wdlBar(wdl(played), '전체'), h('div', { class: 'two0' }, wdlBar(wdl(played.filter(x => x.home)), '홈'), wdlBar(wdl(played.filter(x => !x.home)), '원정')),
    ...comps.map(cn => wdlBar(wdl(played.filter(x => x.comp === cn)), cn))));
  const last5 = played.slice(-5);
  if (last5.length) sum.append(h('div', { class: 'in', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, h('span', { class: 'lbl' }, '최근 5경기'), ...last5.map(x => h('span', { class: 'res ' + x.res, title: `${C.fmtDate(x.d)} ${x.home ? '홈' : '원정'} ${(w.clubs[x.opp] || {}).name || ''} ${x.gf}-${x.gag}` }, RESK[x.res]))));
  root.append(sum);
  const list = items.filter(x => flt === 'all' || (flt === 'pend' ? x.pend : flt === 'done' ? !x.pend : x.comp === flt));
  root.append(h('div', { class: 'sec' }, h('h3', null, `경기 일정·결과 ${items.length}경기`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 치름 ${played.length} · 남음 ${items.length - played.length} · 결과를 누르면 경기 상세`)),
    h('div', { class: 'in chg' }, ...[['all', '전체'], ['done', '결과'], ['pend', '남은 일정']].concat(comps.map(c => [c, c])).map(([k, l]) => h('button', { class: 'chip' + (flt === k ? ' gold' : ''), style: { cursor: 'pointer', border: 0 }, onclick: () => { d.cff = k; stay(); } }, l))),
    h('div', { class: 'in', style: { display: 'grid', gap: '2px' } }, ...list.map(x => fxItem(s, x, id)))));
}
// 진행 중 시즌의 선수 기록 (이 구단 소속으로 뛴 경기)
function clubLiveRecords(s, root, id) {
  const w = s.w, cix = C.cix(w, id), m = {};
  const add = (agg, cat) => { for (const pid in agg || {}) { const a = agg[pid]; if (a[0] !== cix) continue; const r = m[pid] = m[pid] || { pid, apps: 0, g: 0, a: 0, rs: 0, min: 0, lg: 0, mom: 0 }; r.apps += a[1]; r.g += a[4]; r.a += a[5]; r.rs += a[8] / 10; r.min += a[3]; r.mom += a[10] || 0; if (cat === 'L') r.lg += a[1]; } };
  for (const lid in w.cal.lg) add((w.cal.h[w.cal.lg[lid].k] || {}).agg, 'L');
  for (const k in w.cal.cup) add((w.cal.h[k] || {}).agg, 'C');
  for (const k in w.cal.cont) add((w.cal.h[k] || {}).agg, 'E');
  const PM = {}; const c = w.clubs[id]; if (c && c.sq) for (const e of c.sq) PM[String(e[0])] = e;
  const rows = Object.values(m).filter(r => r.apps > 0).map(r => Object.assign(r, { rt: r.apps ? r.rs / r.apps : 0, n: r.pid === 'ME' ? s.p.name + ' (나)' : C.MD.nameOf(r.pid), pos: r.pid === 'ME' ? s.p.pos : PM[r.pid] ? PM[r.pid][1] : ((w.ps[r.pid] || {}).pos || ''), age: r.pid === 'ME' ? s.p.age : PM[r.pid] ? PM[r.pid][3] : null }));
  return rows;
}
function clubSeasonTab(s, root, id, d) {
  const w = s.w, labels = Object.keys(w.arch || {}).sort().reverse();
  const opts = (w.cal ? ['live'] : []).concat(labels);
  if (!d.cs || !opts.includes(d.cs)) d.cs = opts[0];
  if (!d.cs) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '기록이 없습니다.'))); return; }
  root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { d.cs = e.target.value; stay(); } }, ...opts.map(l => { const o = h('option', { value: l }, l === 'live' ? '진행 중인 시즌' : l); if (l === d.cs) o.selected = true; return o; }))));
  if (d.cs !== 'live') { clubSeason(s, root, id); return; }
  // 진행 중: 대회별 현재 성적
  const A = U.liveArch(), res = [];
  for (const lid in A.lg) { const L = A.lg[lid], i = (L.t || []).findIndex(r => r[0] === id); if (i >= 0) { const r = L.t[i]; res.push([L.n || (w.lg[lid] || {}).name, `${i + 1}위 / ${L.t.length}`, `${r[2]}승 ${r[3]}무 ${r[4]}패 · 승점 ${r[7]} · ${r[5]}득 ${r[6]}실`, i === 0]); } }
  for (const grp of [A.cup, A.lcup]) for (const n in grp || {}) { const cup = grp[n]; const inR = (cup.r || []).filter(rd => rd.m.some(m => m[0] === id || m[1] === id)); if (!inR.length) continue; const lastR = inR[inR.length - 1], lm = lastR.m.find(m => m[0] === id || m[1] === id); const alive = lm && ((lm[2] > lm[3] && lm[0] === id) || (lm[3] > lm[2] && lm[1] === id) || lm[4] === id); res.push([cup.n, alive ? `${lastR.n} 통과${cup.next ? ` · 다음 ${cup.next[0]}` : ''}` : `${lastR.n} 탈락`, '', false]); }
  for (const k in A.cont || {}) { const K = A.cont[k]; const inPh = (K.ph || []).findIndex(r => r[0] === id); const inR = (K.r || []).filter(rd => rd.t.some(t => t[0] === id || t[1] === id)); if (!inR.length && inPh < 0) continue; res.push([K.n, inR.length ? inR[inR.length - 1].n : `리그 페이즈 ${inPh + 1}위`, inPh >= 0 ? `${K.ph[inPh][2]}승 ${K.ph[inPh][3]}무 ${K.ph[inPh][4]}패 · 승점 ${K.ph[inPh][7]}` : '', K.w === id]); }
  root.append(h('div', { class: 'sec' }, h('h3', null, '이번 시즌 성적 (진행 중)'), res.length ? h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...res.map(([n, v2, sub, gold]) => h('div', { class: 'csrow' }, h('b', null, n), h('span', { style: { color: gold ? 'var(--gold)' : null, fontWeight: 700 } }, v2), h('span', { class: 'mute', style: { fontSize: '12px' } }, sub)))) : h('div', { class: 'in empty' }, '아직 치른 경기가 없습니다.')));
  const rows = clubLiveRecords(s, root, id);
  if (!d.csSort) d.csSort = 'apps';
  rows.sort((a, b) => (b[d.csSort] || 0) - (a[d.csSort] || 0));
  const th = (k, l) => h('th', { class: 'lnk' + (d.csSort === k ? ' on' : ''), onclick: () => { d.csSort = k; stay(); } }, l);
  root.append(h('div', { class: 'sec' }, h('h3', null, `선수 기록 ${rows.length}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 이 구단 소속으로 뛴 리그·컵·대륙 대회 경기 (국가대표 제외) · 열 제목을 누르면 정렬')),
    rows.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, h('th', null, '선수'), h('th', null, '포지션'), h('th', null, '나이'), th('apps', '경기'), th('lg', '리그'), th('min', '출전시간'), th('g', '골'), th('a', '도움'), th('mom', '★ MOM'), th('rt', '평점'))),
      h('tbody', null, ...rows.map(r => h('tr', { class: r.pid === 'ME' ? 'me' : '' }, h('td', null, r.pid === 'ME' ? h('span', { class: 'lnk', onclick: () => U.setTab('records') }, r.n) : nameLink(r.n, r.pid)), h('td', null, h('span', { class: 'tpos' }, r.pos)), h('td', null, r.age != null ? r.age : ''), h('td', null, r.apps), h('td', null, r.lg), h('td', { class: 'mute' }, `${r.min.toLocaleString()}'`), h('td', null, h('b', null, r.g)), h('td', null, r.a), h('td', null, r.mom ? h('span', { class: 'momn' }, '★ ' + r.mom) : h('span', { class: 'mute' }, '-')), h('td', null, r.rt ? r.rt.toFixed(2) : '-')))))) : h('div', { class: 'in empty' }, '아직 기록이 없습니다.')));
}
function clubOverview(s, root, id) {
  const w = s.w, c = w.clubs[id], lg = w.lg[c.lg];
  const items = w.cal ? clubFx(s, id, 'live') || [] : [];
  const played = items.filter(x => !x.pend), next = items.filter(x => x.pend).slice(0, 4);
  const A = w.cal ? U.liveArch() : null, L = A && A.lg[c.lg], pos = L ? L.t.findIndex(r => r[0] === id) : -1;
  const tiles = [['리그', lg ? lg.name : '-'], ['순위', pos >= 0 ? `${pos + 1}위` : '-'], ['전력', c.str.toFixed(1)]];
  if (pos >= 0) { const r = L.t[pos]; tiles.push(['승점', `${r[7]} (${r[1]}경기)`]); }
  const two = h('div', { class: 'cols2' });
  const left = h('div', { class: 'sec' }, h('h3', null, '이번 시즌'), h('div', { class: 'in wsum' }, ...tiles.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('b', null, v2)))),
    played.length ? h('div', { class: 'in' }, wdlBar(wdl(played), '전 대회')) : null,
    played.length ? h('div', { class: 'in', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, h('span', { class: 'lbl' }, '최근 5경기'), ...played.slice(-5).map(x => h('span', { class: 'res ' + x.res, title: `${C.fmtDate(x.d)} ${(w.clubs[x.opp] || {}).name || ''} ${x.gf}-${x.gag}` }, RESK[x.res]))) : null);
  two.append(left);
  const right = h('div', { class: 'sec' }, h('h3', null, '최근 결과 · 다음 경기', h('button', { class: 'btn ghost sm', style: { marginLeft: '8px' }, onclick: () => { db().ct = 'fx'; stay(); } }, '전체 일정')),
    h('div', { class: 'in', style: { display: 'grid', gap: '2px' } }, ...played.slice(-4).map(x => fxItem(s, x, id)), ...next.map(x => fxItem(s, x, id)), !played.length && !next.length ? h('div', { class: 'mute' }, '일정이 없습니다.') : null));
  two.append(right);
  root.append(two);
  // 팀 득점 순위 (진행 중)
  if (w.cal) { const rows = clubLiveRecords(s, root, id).sort((a, b) => b.g - a.g || b.a - a.a).slice(0, 5).filter(r => r.g || r.a);
    if (rows.length) root.append(h('div', { class: 'sec' }, h('h3', null, '팀 득점 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 이번 시즌 전 대회')), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...rows.map((r, i) => h('div', { class: 'kvrow' }, h('span', null, h('span', { class: 'mute' }, `${i + 1}  `), r.pid === 'ME' ? r.n : nameLink(r.n, r.pid), h('span', { class: 'mute', style: { fontSize: '11px' } }, ` ${r.pos}`)), h('span', null, h('b', null, `${r.g}골`), h('span', { class: 'mute' }, ` ${r.a}도움 · ${r.apps}경기`))))))); }
}
function clubSquad(s, root, id, d) {
  const w = s.w, c = w.clubs[id];
  // 스쿼드
  const sq = C.squadOf(w, c, s.w.year).slice().sort((a, b) => (POSORD[a.pos] - POSORD[b.pos]) || b.ovr - a.ovr);
  const meHere = s.car && s.car.club === id;
  // 이 구단이 임대 보낸 선수: 다른 구단 명단에 있고 원소속(e[7])이 이 구단
  const outs = []; if (!c.lite) for (const cid in w.clubs) { if (cid === id) continue; const x = w.clubs[cid]; if (x.sq) for (const e of x.sq) if (e[7] === id) outs.push([e, x]); }
  outs.sort((a, b) => (POSORD[a[0][1]] - POSORD[b[0][1]]) || b[0][2] - a[0][2]);
  const ent = {}; if (!c.lite && c.sq) for (const e of c.sq) ent[String(e[0])] = e;
  const rl = !c.lite && c.sq && C.squadRoles ? C.squadRoles(c) : null;
  const RL = ['주전', '로테이션', '백업'];
  const ctTxt = e => e[7] && w.clubs[e[7]] ? (e[7] === id ? '임대 예정' : '임대') : e[6] != null ? `${Math.max(1, e[6])}년 (${w.year + Math.max(1, e[6])}.6)` : '';
  const unit = C.wageUnit();
  const bill = !c.lite && c.sq ? c.sq.reduce((a, e) => a + (e[7] ? 0 : (e[8] || 0)), 0) + (meHere && s.car.wage ? s.car.wage : 0) : 0;
  if (!d.sqs) d.sqs = 'pos';
  const sortF = { pos: (a, b) => (POSORD[a.pos] - POSORD[b.pos]) || b.ovr - a.ovr, ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age, ct: (a, b) => ((ent[a.id] || [])[6] || 0) - ((ent[b.id] || [])[6] || 0), wage: (a, b) => ((ent[b.id] || [])[8] || 0) - ((ent[a.id] || [])[8] || 0) }[d.sqs];
  sq.sort(sortF);
  // 1군과 유스(U19) 분리: 19세 이하이면서 1군 주전·로테이션이 아닌 선수는 유스로 (2군 구단은 나누지 않는다)
  const isY = x => { if (c.parent || c.lite) return false; const e = ent[x.id]; return x.age != null && x.age <= 19 && !(e && rl && rl.has(e) && rl.get(e) <= 1) && !(e && e[7] && e[7] !== id); };
  const sqY = sq.filter(isY), sqA = sq.filter(x => !isY(x));
  const rowF = x => { const e = ent[x.id], lin = e && e[7] && e[7] !== id && w.clubs[e[7]], lout = e && e[7] === id; return h('tr', null, h('td', null, h('span', { class: 'tpos' }, x.pos)), h('td', null, nameLink(x.n, x.id, lin ? 'loanin' : lout ? 'loanout' : ''), e && e[14] && e[14] > (w.cal ? w.cal.d : 0) ? h('span', { class: 'injb', title: `부상 · ${C.fmtDateY(e[14])} 복귀 예정` }, `부상 ~${C.fmtDate ? C.fmtDate(e[14]) : ''}`) : null, (w.susp || {})[x.id] ? h('span', { class: 'injb sus', title: '출전 정지 (남은 경기)' }, `출전 정지 ${Object.values(w.susp[x.id]).reduce((a, b) => Math.max(a, b), 0)}경기`) : null, e && e[7] && w.clubs[e[7]] ? h('span', { class: 'mute', style: { fontSize: '11px' } }, e[7] === id ? ' (임대 이적 예정)' : ` (${w.clubs[e[7]].name}에서 임대)`) : null), h('td', null, x.age != null ? U.ageNow(w, x.id, x.age) : ''), h('td', null, x.nat ? flag(x.nat, 18) : ''), h('td', null, Math.round(x.ovr)),
          h('td', { class: 'mute', style: { fontSize: '12px' } }, e && rl && rl.has(e) ? RL[rl.get(e)] : ''), h('td', { class: 'mute', style: { fontSize: '12px' } }, e ? ctTxt(e) : ''), h('td', null, e && e[8] ? C.fmtWage(e[8], true) : '')); };
  const th = (k, l) => k ? h('th', { class: 'lnk' + (d.sqs === k ? ' on' : ''), onclick: () => { d.sqs = k; stay(); } }, l) : h('th', null, l);
  root.append(h('div', { class: 'sec' }, h('h3', null, sqY.length ? `1군 ${sqA.length + (meHere ? 1 : 0)}명 · 유스 ${sqY.length}명` : `스쿼드 ${sq.length + (meHere ? 1 : 0)}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, c.lite ? ' 하부 리그 구단은 대략적인 명단입니다' : ` ${unit} 총액 ${C.fmtWage(bill)} · 열 제목을 누르면 정렬`)),
    h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '640px' } }, h('thead', null, h('tr', null, th('pos', '포지션'), th(null, '이름'), th('age', '나이'), th(null, '국적'), th('ovr', 'OVR'), th(null, '역할'), th('ct', '계약'), th('wage', unit))),
      h('tbody', null, ...(meHere ? [h('tr', { class: 'me' }, h('td', null, s.p.pos), h('td', null, h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${s.p.name} (나)`)), h('td', null, s.p.age), h('td', null, flag(s.p.nat, 18)), h('td', null, C.ovrOf(s.p)), h('td'), h('td', { class: 'mute', style: { fontSize: '12px' } }, s.car.status === 'loan' ? '임대' : s.car.contract ? `${s.car.contract + 1}.6` : ''), h('td', null, s.car.wage ? C.fmtWage(s.car.wage, true) : ''))] : []),
        ...sqA.map(rowF),
        ...(sqY.length ? [h('tr', { class: 'grp' }, h('td', { colspan: 8 }, `유스 (U19) ${sqY.length}명`, h('span', { class: 'mute', style: { fontWeight: 400 } }, ' 1군 명단 밖에서 뛰는 아카데미 선수')))].concat(sqY.map(rowF)) : []),
        // 임대 보낸 선수 (원소속팀: 빨간 이름 · 임대 중 표시)
        ...(outs.length ? [h('tr', { class: 'grp' }, h('td', { colspan: 8 }, `임대 보낸 선수 ${outs.length}명`))].concat(outs.map(([e, lc]) => h('tr', null, h('td', null, h('span', { class: 'tpos' }, e[1])), h('td', null, nameLink(C.pName(w, e), String(e[0]), 'loanout'), h('span', { class: 'loantag' }, '임대 중 → ', h('span', { class: 'lnk', onclick: ev => { ev.stopPropagation(); U.openClub(lc.id); } }, lc.name))),
          h('td', null, e[3]), h('td', null, flag(e[5], 18)), h('td', null, e[2]), h('td', { class: 'mute', style: { fontSize: '12px' } }, e[3] <= 21 ? '유망주 임대' : '임대'), h('td', { class: 'mute', style: { fontSize: '12px' } }, '시즌 끝나면 복귀'), h('td', null, e[8] ? C.fmtWage(e[8], true) : '')))) : []))))));
  if (!c.lite) root.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 4px' } }, h('span', { class: 'loanin' }, '파란 이름'), ' = 다른 구단에서 임대 온 선수 · ', h('span', { class: 'loanout' }, '빨간 이름'), ' = 이 구단 소속으로 임대 간 선수'));
  // 재정
  if (!c.lite && c.rev) {
    const fin = [['연 수입 (추정)', C.fmtEUR(c.rev)], ['보유 자금', C.fmtEUR(c.cash || 0)], ['연간 급여 총액', C.fmtEUR(bill * 52)], ['수입 대비 급여', Math.round(bill * 52 / c.rev * 100) + '%'], ['급여 상한 (수입의 62%)', C.fmtEUR(c.rev * .62)]];
    root.append(h('div', { class: 'sec' }, h('h3', null, '재정', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 이적료는 보유 자금 안에서, 급여는 상한 안에서만 쓸 수 있습니다')), h('div', { class: 'wsum' }, ...fin.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2)))))));
  }
}
function clubHistory(s, root, id) {
  const w = s.w, n0 = root.children.length;
  // 연도별 성적
  const rows = [];
  for (const lb of Object.keys(w.arch || {}).sort().reverse()) {
    const A = w.arch[lb];
    for (const lid in A.lg) { const L = A.lg[lid], i = L.t.findIndex(r => r[0] === id); if (i >= 0) { const r = L.t[i]; const top = (L.sc || []).find(x => x[1] === id); rows.push([lb, L.n, i + 1, L.t.length, r[7], r[5], r[6], top]); break; } }
  }
  if (rows.length) root.append(h('div', { class: 'sec' }, h('h3', null, '연도별 리그 성적'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['시즌', '리그', '순위', '승점', '득실', '팀 최다 득점'].map(x => h('th', null, x)))),
    h('tbody', null, ...rows.map(r => h('tr', null, h('td', null, r[0]), h('td', null, r[1]), h('td', null, h('b', { style: { color: r[2] === 1 ? 'var(--gold)' : null } }, `${r[2]}위`), h('span', { class: 'mute' }, ` /${r[3]}`)), h('td', null, r[4]), h('td', null, `${r[5]}:${r[6]}`), h('td', null, r[7] ? h('span', null, nameLink(r[7][0], r[7][5]), ` ${r[7][2]}골`) : ''))))))));
  // 우승 이력
  const tro = [];
  for (const k in w.hist.lg) for (const x of w.hist.lg[k]) if (x.c === id) tro.push([x.y, (w.lg[k] || {}).name || '리그']);
  for (const k in (w.hist.cup || {})) for (const x of w.hist.cup[k]) if (x.c === id) tro.push([x.y, C.CUPNAME[k] || '국내 컵']);
  for (const k in (w.hist.cont || {})) for (const x of w.hist.cont[k]) if (x.c === id) tro.push([x.y, C.COMPS[k] ? C.COMPS[k].name : k]);
  if (tro.length) root.append(h('div', { class: 'sec' }, h('h3', null, `우승 ${tro.length}회`), h('div', { class: 'in chg' }, ...tro.sort((a, b) => a[0] < b[0] ? 1 : -1).map(([y, t]) => h('span', { class: 'chip gold' }, `${y} ${t}`)))));
  if (root.children.length === n0) root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '첫 시즌이 끝나면 연도별 성적과 우승 기록이 쌓입니다.')));
}
function clubView(s, root, id) {
  const w = s.w, c = w.clubs[id];
  if (!c) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '구단 정보를 찾을 수 없습니다.'))); return; }
  const lg = w.lg[c.lg];
  root.append(h('div', { class: 'sec ehead', style: U.tintStyle ? U.tintStyle(c, .25) : null }, h('div', { class: 'in dbhead' }, crest(c, 56),
    h('div', null, h('h2', { style: { margin: 0 } }, c.name), h('div', { class: 'mute' }, [lg ? lg.name : '', C.natName(c.nat)].filter(Boolean).join(' · ')),
      c.parent && w.clubs[c.parent] ? h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '2px' } }, '2군 · 1군 ', clubLink(w, c.parent, 14), ' (1군과 같은 리그로 승격 불가 · 국내 컵 불참)') : null,
      c.bteam && w.clubs[c.bteam] ? h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '2px' } }, '2군 ', clubLink(w, c.bteam, 14), ` (${(w.lg[w.clubs[c.bteam].lg] || {}).name || ''})`) : null),
    h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, '전력'), h('b', null, c.str.toFixed(1))), U.followBtn ? U.followBtn('club', id) : null)));
  const d = db(); if (d.cid !== id) { d.cid = id; d.ct = 'ov'; d.cs = null; d.cfs = null; d.cff = 'all'; }
  if (d.ct === 'now') d.ct = 'sq'; if (d.ct === 'season' && !d.cs) d.cs = null;
  const TABS = [['ov', '개요'], ['fx', '일정·결과'], ['sq', '스쿼드'], ['season', '시즌 기록'], ['rec', '구단 기록'], ['tx', '이적'], ['hist', '역사']];
  root.append(h('div', { class: 'etabs' }, ...TABS.map(([k, l]) => h('button', { class: d.ct === k ? 'on' : '', onclick: () => { d.ct = k; stay(); } }, l))));
  if (d.ct === 'ov') clubOverview(s, root, id);
  else if (d.ct === 'fx') clubFixtures(s, root, id, d);
  else if (d.ct === 'sq') clubSquad(s, root, id, d);
  else if (d.ct === 'season') clubSeasonTab(s, root, id, d);
  else if (d.ct === 'rec') clubRecords(s, root, id);
  else if (d.ct === 'tx') clubTx(s, root, id);
  else clubHistory(s, root, id);
}

// ---------- 국가대표팀 ----------
const TROUND = ['조별리그', '32강', '16강', '8강', '4강', '결승'];
// A매치 (네이션스리그·친선전): 진행 중인 해의 결과와 남은 일정
function natAM(s, root, nat) {
  const w = s.w; if (!w.cal || !w.cal.am) return;
  const AM = w.cal.am, rows = [];
  for (const c of ['UNL', 'AM']) { const hh = w.cal.h['A:' + c + ':' + AM.wy]; (hh && hh.rows || []).forEach((r, ri) => { if (r[1] === nat || r[2] === nat) rows.push({ k: 'A', comp: c, name: C.TDEF[c].name, stage: r[0], a: r[1], b: r[2], ga: r[3], gb: r[4], pw: r[7], nat: 1, ref: { mk: 'A', sk: c, ri, d: r[8], a: r[1], b: r[2], wy: AM.wy }, d: r[8] }); }); }
  const up = AM.fx.filter(f => !f.done && (f.a === nat || f.b === nat)).map(f => ({ k: 'A', comp: f.c, name: C.TDEF[f.c].name, stage: f.stage, a: f.a, b: f.b, nat: 1, pend: 1, d: f.d }));
  const all = rows.concat(up).sort((a, b) => a.d - b.d);
  if (!all.length) return;
  root.append(h('div', { class: 'sec' }, h('h3', null, `A매치 ${C.wLabel(AM.wy)}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 네이션스리그·친선전 · 결과를 누르면 상세')), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...all.map(x => h('div', { class: 'amrow' }, h('span', { class: 'mute' }, C.fmtDate(x.d)), h('span', { class: 'mute', style: { fontSize: '11px' } }, x.comp === 'UNL' ? `UNL · ${x.stage.replace(/^리그 /, '')}` : '친선전'), U.matchLine(s, x, true))))));
}
function natView(s, root, nat) {
  const w = s.w, pools = C.nationPools(w), pool = pools[nat];
  const str = pool && pool.all.length >= 8 ? C.nationStrength(pool) : null;
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in dbhead' }, U.natCrest(nat, 56), h('div', null, h('h2', { style: { margin: 0 } }, `${C.natName(nat)} 대표팀`), h('div', { class: 'mute' }, `${C.confOf(nat)}${str ? ` · 전력 ${str.toFixed(1)}` : ''}`)), U.followBtn ? U.followBtn('nat', nat) : null)));
  natAM(s, root, nat);
  // 현재 주요 선수 (월드 데이터의 같은 국적 선수, OVR 순)
  const top = pool ? pool.all.slice().sort((a, b) => b[2] - a[2]).slice(0, 26) : [];
  const where = new Map(); for (const id in w.clubs) { const c = w.clubs[id]; if (!c.lite && c.sq) for (const e of c.sq) if (e[5] === nat) where.set(e, c); }
  const meIn = s.p && s.mode !== 'world' && s.p.nat === nat;
  if (top.length || meIn) root.append(h('div', { class: 'sec' }, h('h3', null, '주요 선수 (OVR 상위)', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 실제 소집 명단과 다를 수 있음')), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['포지션', '이름', '나이', '소속', 'OVR'].map(x => h('th', null, x)))),
    h('tbody', null, ...(meIn ? [h('tr', { class: 'me' }, h('td', null, h('span', { class: 'tpos' }, s.p.pos)), h('td', null, h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${s.p.name} (나)`)), h('td', null, s.p.age), h('td', null, s.car && s.car.club ? clubLink(w, s.car.club, 16) : '무소속'), h('td', null, C.ovrOf(s.p)))] : []),
      ...top.map(e => { const c = where.get(e); return h('tr', null, h('td', null, h('span', { class: 'tpos' }, e[1])), h('td', null, nameLink(C.pName(w, e), String(e[0]))), h('td', null, e[3]), h('td', null, c ? clubLink(w, c.id, 16) : ''), h('td', null, e[2])); }))))));
  // 국제 대회 성적
  const res = [];
  for (const y of Object.keys(w.intl || {}).sort().reverse()) for (const T of w.intl[y]) {
    let stage = null;
    if (T.w === nat) stage = '우승'; else if (T.ru === nat) stage = '준우승';
    else { for (let i = (T.ko || []).length - 1; i >= 0; i--) if (T.ko[i].m.some(m => m[0] === nat || m[1] === nat)) { stage = T.ko[i].n; break; } if (!stage && (T.g || []).some(g => (g.rows || []).some(r => r[0] === nat))) stage = '조별리그'; }
    if (stage) res.push([y, T.n, stage, T.k]);
  }
  root.append(h('div', { class: 'sec' }, h('h3', null, '국제 대회 성적'), res.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['연도', '대회', '성적'].map(x => h('th', null, x)))),
    h('tbody', null, ...res.map(r => h('tr', { class: 'click', onclick: () => { U.st.wv = Object.assign(U.st.wv || {}, { mode: 'intl', iy: String(r[0]), ik: r[3] }); U.setTab('table'); } }, h('td', null, r[0]), h('td', null, r[1]), h('td', null, h('b', { style: { color: r[2] === '우승' ? 'var(--gold)' : null } }, r[2]))))))) : h('div', { class: 'empty' }, '아직 참가한 국제 대회가 없습니다.')));
  // 최근 국제 대회 경기 (상세 기록 보관 시즌)
  const rows = [];
  for (const lb of (w.mxKeys || []).slice().reverse()) {
    const st = U.mxCached(lb); if (!st) { U.withMx(lb, () => stay()); continue; }
    for (const k in st.INTL) for (const m of st.INTL[k]) if (m[1] === nat || m[2] === nat) rows.push([st, m, C.TDEF[k] ? C.TDEF[k].name : k, +lb.slice(0, 4) + 1]);
  }
  if (rows.length) root.append(h('div', { class: 'sec' }, h('h3', null, '최근 국제 대회 경기', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 누르면 상세 기록')), h('div', { class: 'in fxlist' }, ...rows.map(([st, m, tn, y]) => { const f = m[1] === nat ? m[3] : m[4], a = m[1] === nat ? m[4] : m[3]; return U.fxRow(w, m[1], m[2], m[3], m[4], `${y}`, f > a ? 'W' : f < a ? 'L' : 'D', false, () => U.showMatch({ title: `${tn} ${y} · ${m[0]}`, a: m[1], b: m[2], ga: m[3], gb: m[4], pw: m[7] || null, d: C.MD.decode(st, m), nat: true, key: tn + y + m[1] + m[2] + m[0] }), true); }))));
}

U.pages.db = function () {
  const s = S(), d = db();
  const root = h('div', { class: 'wrap prof screen' });
  if (d.view !== 'home') root.append(h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn ghost sm', onclick: back }, '← 뒤로'), h('button', { class: 'btn ghost sm', onclick: () => { NAV.push(snap()); d.view = 'home'; d.id = null; U.setTab('db'); } }, '검색')));
  try {
    if (d.view === 'player') playerView(s, root, d.id);
    else if (d.view === 'club') clubView(s, root, d.id);
    else if (d.view === 'nat') natView(s, root, d.id);
    else homeView(s, root);
  } catch (e) { console.error(e); root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '정보를 불러오지 못했습니다.'))); }
  return root;
};
})(window);
