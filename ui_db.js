// Road to Legend — 선수·팀 데이터베이스: 검색, 선수 시즌별 기록, 구단 스쿼드·연도별 성적, 발롱도르 역대 순위
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, flag, crest } = U;
const S = () => U.S();
const st = U.st;
const db = () => (st.db = st.db || { view: 'home', q: '' });
const go = (view, id) => { const d = db(); if (d.view !== 'home' || view !== 'home') (d.stack = d.stack || []).push([d.view, d.id]); d.view = view; d.id = id; U.setTab('db'); };
U.openPlayer = pid => go('player', String(pid));
U.openClub = id => go('club', id);
const back = () => { const d = db(); const prev = (d.stack || []).pop(); if (prev) { d.view = prev[0]; d.id = prev[1]; } else { d.view = 'home'; d.id = null; } U.setTab('db'); };
const POSORD = { GK: 0, CB: 1, LB: 2, RB: 2, CDM: 3, CM: 4, CAM: 5, LM: 6, RM: 6, LW: 7, RW: 7, ST: 8 };
const seasonLbl = y => `${y}/${String(y + 1).slice(2)}`;

// 현재 소속 찾기
function locate(w, pid) {
  for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite || !c.sq) continue; for (const e of c.sq) if (String(e[0]) === pid) return { e, c }; }
  return null;
}
function nameLink(n, pid, cls) { return pid ? h('span', { class: 'lnk ' + (cls || ''), onclick: ev => { ev.stopPropagation(); U.openPlayer(pid); } }, n) : h('span', { class: cls || '' }, n); }
function clubLink(w, id, size = 18) { const c = w.clubs[id]; return h('span', { class: 'cc lnk', onclick: ev => { ev.stopPropagation(); if (c) U.openClub(id); } }, crest(c || null, size), h('span', null, c ? c.name : '해체된 구단')); }

// ---------- 검색 ----------
// 악센트·특수 문자(é, ñ, ø, ß, ł ...)를 영문 기본 글자로 바꿔 비교
const FOLD = { 'ø': 'o', 'Ø': 'o', 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe', 'đ': 'd', 'Đ': 'd', 'ł': 'l', 'Ł': 'l', 'ı': 'i', 'þ': 'th', 'ð': 'd', 'ħ': 'h' };
const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[øØßæÆœŒđĐłŁıþðħ]/g, ch => FOLD[ch] || ch).toLowerCase().replace(/[-'’.]/g, ' ').replace(/\s+/g, ' ').trim();
U.fold = fold;
function search(w, q) {
  q = fold(q); if (q.length < 2) return { players: [], clubs: [] };
  const players = [], seen = new Set();
  for (const id in w.clubs) {
    const c = w.clubs[id]; if (c.lite || !c.sq) continue;
    for (const e of c.sq) { const n = C.pName(w, e); if (fold(n).includes(q)) { const pid = String(e[0]); seen.add(pid); players.push({ pid, n, pos: e[1], ovr: e[2], age: e[3], nat: e[5], club: id }); if (players.length >= 60) break; } }
    if (players.length >= 60) break;
  }
  for (const pid in (w.ps || {})) { if (seen.has(pid)) continue; const P = w.ps[pid]; if (fold(P.n).includes(q)) { players.push({ pid, n: P.n, pos: P.pos, nat: P.nat, retired: true }); if (players.length >= 80) break; } }
  const clubs = Object.values(w.clubs).filter(c => c.lg && (fold(c.name).includes(q) || fold(c.en).includes(q) || fold(c.id.replace(/^[A-Z]+_/, '')).includes(q) || fold(c.short) === q)).sort((a, b) => b.str - a.str).slice(0, 20);
  players.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  return { players: players.slice(0, 40), clubs };
}

function homeView(s, root) {
  const w = s.w, d = db();
  const inp = h('input', { type: 'search', placeholder: '선수 또는 구단 이름 (2글자 이상)', value: d.q || '', style: { width: '100%' }, oninput: e => { d.q = e.target.value; clearTimeout(d.t); d.t = setTimeout(() => draw(), 180); } });
  const res = h('div', { style: { display: 'grid', gap: '12px' } });
  const draw = () => {
    res.replaceChildren();
    const r = search(w, d.q || '');
    if ((d.q || '').trim().length < 2) return;
    if (!r.players.length && !r.clubs.length) { res.append(h('div', { class: 'empty' }, '검색 결과가 없습니다.')); return; }
    if (r.clubs.length) res.append(h('div', { class: 'sec' }, h('h3', null, `구단 ${r.clubs.length}`), h('div', { class: 'in dbgrid' }, ...r.clubs.map(c => h('div', { class: 'dbitem', onclick: () => U.openClub(c.id) }, crest(c, 26), h('div', null, h('b', null, c.name), h('div', { class: 'mute', style: { fontSize: '12px' } }, `${(w.lg[c.lg] || {}).name || ''} · 전력 ${c.str.toFixed(1)}`)))))));
    if (r.players.length) res.append(h('div', { class: 'sec' }, h('h3', null, `선수 ${r.players.length}`), h('div', { class: 'in dbgrid' }, ...r.players.map(x => h('div', { class: 'dbitem', onclick: () => U.openPlayer(x.pid) }, flag(x.nat, 22), h('div', null, h('b', null, x.n), h('div', { class: 'mute', style: { fontSize: '12px' } }, x.retired ? `${x.pos} · ${(w.ps[x.pid] || {}).ret ? (w.ps[x.pid].ret + '년 은퇴') : '기록 보관'}` : `${x.pos} · ${x.age}세 · OVR ${x.ovr} · ${w.clubs[x.club].name}`)))))));
  };
  root.append(h('div', { class: 'sec' }, h('h3', null, '선수·구단 검색'), h('div', { class: 'in' }, inp)), res);
  draw();
  setTimeout(() => { try { inp.focus(); } catch (e) { } }, 30);
  // 발롱도르 역대 순위
  const bh = (w.bdHist || []).slice().reverse();
  if (bh.length) root.append(h('div', { class: 'sec' }, h('h3', null, '발롱도르 역대 순위'), h('div', { class: 'in', style: { display: 'grid', gap: '10px' } }, ...bh.map(b => h('div', { class: 'bdrow' }, h('div', { class: 'lbl' }, `${b.y}년`),
    h('div', { class: 'bdlist' }, ...b.top.slice(0, 5).map((x, i) => h('div', { class: x[3] ? 'me' : '' }, h('span', { class: 'mute' }, i + 1), x[3] ? h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${x[0]} (나)`) : nameLink(x[0], x[2]), h('span', { class: 'mute', style: { fontSize: '11px' } }, (w.clubs[x[1]] || {}).name || '')))))))));
  // 내 리그 구단 바로가기
  const lg = C.leagueOf(s);
  if (lg) root.append(h('div', { class: 'sec' }, h('h3', null, `${lg.name} 구단`), h('div', { class: 'in dbgrid' }, ...lg.clubs.map(id => w.clubs[id]).sort((a, b) => b.str - a.str).map(c => h('div', { class: 'dbitem', onclick: () => U.openClub(c.id) }, crest(c, 24), h('div', null, h('b', null, c.name), h('div', { class: 'mute', style: { fontSize: '12px' } }, `전력 ${c.str.toFixed(1)}`)))))));
}

// ---------- 선수 ----------
function playerView(s, root, pid) {
  const w = s.w, loc = locate(w, pid), P = (w.ps || {})[pid];
  const e = loc && loc.e, c = loc && loc.c;
  const name = e ? C.pName(w, e) : P ? P.n : '알 수 없는 선수';
  const nat = e ? e[5] : P && P.nat, pos = e ? e[1] : P && P.pos;
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in dbhead' }, flag(nat, 36),
    h('div', null, h('h2', { style: { margin: 0 } }, name), h('div', { class: 'mute' }, [C.natName(nat), pos, e ? `${e[3]}세` : P && P.ret ? `${P.ret}년 은퇴` : '기록 밖 (하부 리그 등)'].filter(Boolean).join(' · '))),
    e ? h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, 'OVR'), h('b', null, e[2])) : null,
    c ? h('div', { class: 'dbclub' }, clubLink(w, c.id, 26), h('div', { class: 'mute', style: { fontSize: '12px' } }, (w.lg[c.lg] || {}).name || '')) : null)));
  const hist = C.psHist(P);
  if (hist.length) {
    const tot = hist.reduce((a, x) => (a.apps += x[2], a.g += x[3], a.a += x[4], a), { apps: 0, g: 0, a: 0 });
    root.append(h('div', { class: 'sec' }, h('h3', null, '시즌별 리그 기록'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['시즌', '구단', '나이', 'OVR', '경기', '골', '도움', '평점'].map(x => h('th', null, x)))),
      h('tbody', null, ...hist.slice().reverse().map(x => h('tr', null, h('td', null, seasonLbl(x[0] < 1000 ? x[0] + 2000 : x[0])), h('td', null, clubLink(w, C.cidOf(w, x[1]), 16)), h('td', null, x[7] != null ? x[7] : ''), h('td', null, x[6]), h('td', null, x[2]), h('td', null, h('b', null, x[3])), h('td', null, x[4]), h('td', null, U.rt2(x[5] / 100)))),
        h('tr', { class: 'me' }, h('td', null, '통산'), h('td'), h('td'), h('td'), h('td', null, tot.apps), h('td', null, tot.g), h('td', null, tot.a), h('td')))))));
  } else root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '보관된 시즌 기록이 없습니다. (OVR 73 이상이거나 리그 득점·도움 상위권에 든 시즌만 기록됩니다)')));
  // 발롱도르 이력
  const bd = (w.bdHist || []).map(b => { const i = b.top.findIndex(x => x[2] === pid); return i >= 0 ? [b.y, i + 1] : null; }).filter(Boolean);
  if (bd.length) root.append(h('div', { class: 'sec' }, h('h3', null, '발롱도르'), h('div', { class: 'in chg' }, ...bd.map(([y, r]) => h('span', { class: 'chip' + (r === 1 ? ' gold' : '') }, `${y}년 ${r}위`)))));
  // 득점왕
  const boots = [];
  for (const lb of Object.keys(w.arch || {})) { const A = w.arch[lb]; for (const id in A.lg) { const L = A.lg[id]; if (L.sc && L.sc[0] && L.sc[0][5] === pid) boots.push(`${lb} ${L.n} 득점왕 (${L.sc[0][2]}골)`); } }
  if (boots.length) root.append(h('div', { class: 'sec' }, h('h3', null, '수상'), h('div', { class: 'in chg' }, ...boots.map(t => h('span', { class: 'chip gold' }, t)))));
}

// ---------- 구단 ----------
function clubView(s, root, id) {
  const w = s.w, c = w.clubs[id];
  if (!c) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '구단 정보를 찾을 수 없습니다.'))); return; }
  const lg = w.lg[c.lg];
  root.append(h('div', { class: 'sec', style: U.tintStyle ? U.tintStyle(c, .25) : null }, h('div', { class: 'in dbhead' }, crest(c, 56),
    h('div', null, h('h2', { style: { margin: 0 } }, c.name), h('div', { class: 'mute' }, [lg ? lg.name : '', C.natName(c.nat)].filter(Boolean).join(' · '))),
    h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, '전력'), h('b', null, c.str.toFixed(1))))));
  // 스쿼드
  const sq = C.squadOf(w, c, s.w.year).slice().sort((a, b) => (POSORD[a.pos] - POSORD[b.pos]) || b.ovr - a.ovr);
  const meHere = s.car && s.car.club === id;
  root.append(h('div', { class: 'sec' }, h('h3', null, `스쿼드 ${sq.length + (meHere ? 1 : 0)}명`, c.lite ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, '하부 리그 구단은 대략적인 명단입니다') : null),
    h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['포지션', '이름', '나이', '국적', 'OVR'].map(x => h('th', null, x)))),
      h('tbody', null, ...(meHere ? [h('tr', { class: 'me' }, h('td', null, s.p.pos), h('td', null, h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${s.p.name} (나)`)), h('td', null, s.p.age), h('td', null, flag(s.p.nat, 18)), h('td', null, C.ovrOf(s.p)))] : []),
        ...sq.map(x => h('tr', null, h('td', null, h('span', { class: 'tpos' }, x.pos)), h('td', null, nameLink(x.n, x.id)), h('td', null, x.age != null ? x.age : ''), h('td', null, x.nat ? flag(x.nat, 18) : ''), h('td', null, Math.round(x.ovr)))))))));
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
}

U.pages.db = function () {
  const s = S(), d = db();
  const root = h('div', { class: 'wrap prof screen' });
  if (d.view !== 'home') root.append(h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn ghost sm', onclick: back }, '← 뒤로'), h('button', { class: 'btn ghost sm', onclick: () => { d.stack = []; d.view = 'home'; d.id = null; U.setTab('db'); } }, '검색')));
  try {
    if (d.view === 'player') playerView(s, root, d.id);
    else if (d.view === 'club') clubView(s, root, d.id);
    else homeView(s, root);
  } catch (e) { console.error(e); root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '정보를 불러오지 못했습니다.'))); }
  return root;
};
})(window);
