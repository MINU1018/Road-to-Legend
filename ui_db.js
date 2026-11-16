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
U.openNat = code => go('nat', code);
// 같은 화면 안에서 펼치기·필터·정렬: 스크롤 위치를 유지한 채 다시 그린다
const stay = () => U.stay();
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
  // 국가대표팀: 한글 국가명·영문명·코드
  const EN = (C.logos && C.logos.NAT_EN) || {};
  const nats = Object.keys(C.NAT).filter(code => fold(C.natName(code)).includes(q) || fold((EN[code] || '').replace(/\|/g, ' ')).includes(q) || code.toLowerCase() === q).slice(0, 12);
  return { players: players.slice(0, 40), clubs, nats };
}

function homeView(s, root) {
  const w = s.w, d = db();
  const inp = h('input', { type: 'search', placeholder: '선수·구단·국가대표팀 이름 (2글자 이상)', value: d.q || '', style: { width: '100%' }, oninput: e => { d.q = e.target.value; clearTimeout(d.t); d.t = setTimeout(() => draw(), 180); } });
  const res = h('div', { style: { display: 'grid', gap: '12px' } });
  const draw = () => {
    res.replaceChildren();
    const r = search(w, d.q || '');
    if ((d.q || '').trim().length < 2) return;
    if (!r.players.length && !r.clubs.length && !r.nats.length) { res.append(h('div', { class: 'empty' }, '검색 결과가 없습니다.')); return; }
    if (r.nats.length) res.append(h('div', { class: 'sec' }, h('h3', null, `국가대표팀 ${r.nats.length}`), h('div', { class: 'in dbgrid' }, ...r.nats.map(code => h('div', { class: 'dbitem', onclick: () => U.openNat(code) }, U.natCrest(code, 26), h('div', null, h('b', null, `${C.natName(code)} 대표팀`), h('div', { class: 'mute', style: { fontSize: '12px' } }, `${C.confOf(code)}`)))))));
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
function playerSeasons(w, P) {
  if (!P) return [];
  const by = {};
  for (const x of C.psHist(P)) { const y = x[0] < 1000 ? x[0] : x[0] - 2000, label = seasonLbl(y + 2000), cid = C.cidOf(w, x[1]); const sn = by[y] || (by[y] = { y, label, items: [], age: x[7], ovr: x[6] });
    const ci = compInfo(w, 'L', label, cid); sn.items.push({ key: 'L', cat: 'league', name: ci.name, lid: ci.lid, club: cid, apps: x[2], g: x[3], a: x[4], rt: x[5] / 100, loan: !!x[8] }); }
  for (const t of String(P.c || '').split(';').filter(Boolean)) { const [y0, key, apps, g, a, rt] = t.split('|'); const y = +y0, label = seasonLbl(y + 2000), sn = by[y] || (by[y] = { y, label, items: [] });
    const club = key.startsWith('nt:') ? null : (sn.items.find(it => it.cat === 'league') || {}).club || null; const ci = compInfo(w, key, label, club);
    sn.items.push({ key, cat: ci.cat, name: ci.name, club, apps: +apps, g: +g, a: +a, rt: +rt / 100 }); }
  return Object.values(by).sort((a, b) => a.y - b.y);
}
// 한 선수의 한 대회 경기 목록 (경기 기록 보관 시즌만)
function compMatches(s, pid, label, it) {
  const w = s.w;
  if (!(w.mxKeys || []).includes(label)) { U.toast ? U.toast('경기별 기록은 최근 3시즌만 보관합니다.') : null; return; }
  const st = U.withMx(label, () => compMatches(s, pid, label, it)); if (!st) return;
  const list = [];
  const scan = (rows, title, nat, get) => { for (const r of rows) { const g = get(r); if (!g) continue; const d = g.d; if (!d.ln) continue; const side = d.ln[0].some(x => x.id === pid) ? 0 : d.ln[1].some(x => x.id === pid) ? 1 : -1; if (side < 0) continue; const me = d.ln[side].find(x => x.id === pid);
    list.push({ title: g.title, a: g.a, b: g.b, ga: g.ga, gb: g.gb, pw: g.pw, sa: g.sa, sb: g.sb, nat, d, side, me, g: d.ev.filter(e => e.p === pid && 'gp'.includes(e.k)).length, as: d.ev.filter(e => e.a === pid).length, y: d.ev.some(e => e.p === pid && e.k === 'y'), red: d.ev.some(e => e.p === pid && 'r2'.includes(e.k)), key: g.key }); } };
  const cid = x => typeof x === 'number' ? w.cix[x] : x;
  if (it.cat === 'league') { for (const lid in st.L) { const L = st.L[lid]; if (!L.l) continue; scan(C.MD.leagueRows(w, L).filter(r => r.a === it.club || r.b === it.club), it.name, false, r => ({ title: `${it.name} ${r.r + 1}라운드`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: C.MD.leagueMatch(st, L, r.i), key: lid + '|' + label + '|' + r.i, sa: U.ppgStr(w, lid, label)(r.a), sb: U.ppgStr(w, lid, label)(r.b) })); } }
  else {
    const [k, v] = it.key.split(':');
    const rows = k === 'cont' ? st.CONT[v] : k === 'nt' ? st.INTL[v] : st.CUP[v + ':' + k];
    scan(rows || [], it.name, k === 'nt', r => ({ title: `${it.name} · ${r[0]}`, a: cid(r[1]), b: cid(r[2]), ga: r[3], gb: r[4], pw: r[7] != null ? cid(r[7]) : null, d: C.MD.decode(st, r), key: it.name + '|' + label + '|' + r[1] + '|' + r[2] + '|' + r[0] }));
  }
  const nm = (id, nat) => nat ? C.natName(id) : ((w.clubs[id] || {}).name || '');
  const tg = list.reduce((a, x) => a + x.g, 0), ta = list.reduce((a, x) => a + x.as, 0), tr = list.reduce((a, x) => a + x.me.rt, 0);
  U.overlay(close => [h('div', { class: 'head' }, h('h2', null, `${it.name} · ${label}`), h('span', { class: 'mute' }, `${MDname(pid, s)} · ${list.length}경기 ${tg}골 ${ta}도움 · 평균 평점 ${list.length ? (tr / list.length).toFixed(2) : '-'} (시즌 기록과 같은 값)`)),
    h('div', { class: 'body' }, h('div', { class: 'tscroll' }, h('table', { class: 'ltable lc mxl', style: { minWidth: '600px' } }, h('thead', null, h('tr', null, ...['경기', '상대', '결과', '출전', '골', '도움', '카드', '평점'].map(x => h('th', null, x)))),
      h('tbody', null, ...list.map(x => { const opp = x.side ? x.a : x.b, f = x.side ? x.gb : x.ga, ag = x.side ? x.ga : x.gb, res = f > ag ? 'W' : f < ag ? 'L' : (x.pw ? (x.pw === (x.side ? x.b : x.a) ? 'W' : 'L') : 'D');
        return h('tr', { class: 'click', onclick: () => { close(); setTimeout(() => U.showMatch({ title: `${x.title} (${label})`, a: x.a, b: x.b, ga: x.ga, gb: x.gb, pw: x.pw, d: x.d, nat: x.nat, key: x.key, sa: x.sa, sb: x.sb }), 200); } },
          h('td', { class: 'mute', style: { fontSize: '12px' } }, x.title.replace(it.name, '').replace(/^ · /, '').trim()), h('td', null, nm(opp, x.nat), h('span', { class: 'mute', style: { fontSize: '11px' } }, x.nat ? '' : x.side ? ' (원정)' : ' (홈)')), h('td', null, h('span', { class: 'res ' + res, style: { padding: '1px 6px', borderRadius: '5px' } }, `${f}-${ag}${x.pw ? ' PK' : ''}`)),
          h('td', null, x.me.start ? (x.me.off < 90 ? `선발 ${x.me.off}'` : "선발 90'") : `교체 ${90 - x.me.on}'`), h('td', null, x.g || ''), h('td', null, x.as || ''), h('td', null, x.red ? '퇴장' : x.y ? '경고' : ''), h('td', null, U.rt1(x.me.rt))); })))),
      h('div', { style: { textAlign: 'right', marginTop: '10px' } }, h('button', { class: 'btn ghost', onclick: () => close() }, '닫기')))], { clickClose: true });
}
const MDname = (pid, s) => C.MD.nameOf(pid, s);
function playerView(s, root, pid) {
  const w = s.w, loc = locate(w, pid), P = (w.ps || {})[pid];
  const e = loc && loc.e, c = loc && loc.c;
  const name = e ? C.pName(w, e) : P ? P.n : '알 수 없는 선수';
  const nat = e ? e[5] : P && P.nat, pos = e ? e[1] : P && P.pos;
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in dbhead' }, flag(nat, 36),
    h('div', null, h('h2', { style: { margin: 0 } }, name), h('div', { class: 'mute' }, [C.natName(nat), pos, e ? `${e[3]}세` : P && P.ret ? `${P.ret}년 은퇴` : '기록 밖 (하부 리그 등)', e && e[6] != null ? `계약 ${Math.max(1, e[6])}년 남음` : '', e && e[7] && w.clubs[e[7]] ? `${w.clubs[e[7]].name}에서 임대 중` : ''].filter(Boolean).join(' · '))),
    e ? h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, 'OVR'), h('b', null, e[2])) : null,
    c ? h('div', { class: 'dbclub' }, clubLink(w, c.id, 26), h('div', { class: 'mute', style: { fontSize: '12px' } }, (w.lg[c.lg] || {}).name || '')) : null)));
  // 계약·급여
  if (e && c && !c.lite) {
    const loan = e[7] && w.clubs[e[7]];
    const rl = C.squadRoles ? C.squadRoles(c).get(e) : null;
    const val = C.aiFee(e[2], e[3], (w.lg[(loan || c).lg] || {}).nation || c.nat, Math.max(0, e[6]));
    const cells = [['계약 남은 기간', loan ? `임대 (원소속 ${loan.name})` : `${Math.max(1, e[6])}년 · ${w.year + Math.max(1, e[6])}년 6월 만료`], [C.wageUnit(), e[8] ? C.fmtWage(e[8], true) : '-'], ['연봉 환산', e[8] ? C.fmtEUR(e[8] * 52) : '-'], ['팀 내 역할', rl != null ? ['주전', '로테이션', '백업'][rl] : '-'], ['추정 이적료', C.fmtEUR(Math.round(val / 1e5) * 1e5)]];
    root.append(h('div', { class: 'wsum' }, ...cells.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2))))));
  }
  const hist = C.psHist(P);
  // 이적 경로: 구단이 바뀔 때마다 한 칸 (임대는 따로 표시)
  if (hist.length) {
    const path = []; for (const x of hist) { const cid = C.cidOf(w, x[1]), L = path[path.length - 1]; if (L && L.cid === cid && !!L.loan === !!x[8]) L.y1 = x[0]; else path.push({ cid, y0: x[0], y1: x[0], loan: x[8] ? 1 : 0 }); }
    const yy = v => (v < 1000 ? v + 2000 : v);
    if (c && !c.lite) { const L = path[path.length - 1], ln = !!(e && e[7]); if (!L || L.cid !== c.id || !!L.loan !== ln) path.push({ cid: c.id, y0: w.year - 2000, y1: null, loan: ln ? 1 : 0 }); else L.y1 = null; }
    root.append(h('div', { class: 'sec' }, h('h3', null, '커리어 경로', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 구단 ${new Set(path.filter(x => !x.loan).map(x => x.cid)).size}곳 · 임대 ${path.filter(x => x.loan).length}회`)),
      h('div', { class: 'in cpath' }, ...path.map(x => h('div', { class: 'cpstep' + (x.loan ? ' loan' : '') }, clubLink(w, x.cid, 18), h('span', { class: 'mute' }, `${yy(x.y0)}–${x.y1 == null ? '현재' : String(yy(x.y1) + 1).slice(2)}${x.loan ? ' · 임대' : ''}`))))));
  }
  // 시즌별 전체 기록 (리그 + 국내 컵 + 대륙 대회 + 국가대표 대회). 시즌을 누르면 대회별, 대회를 누르면 경기 목록
  const seasons = playerSeasons(w, P);
  if (seasons.length) {
    const d = db(); d.pf = d.pf || 'all'; if (d.pid !== pid) { d.pid = pid; d.pc = ''; d.open = {}; }
    const clubsOf = [...new Set(seasons.flatMap(x => x.items.filter(it => it.club).map(it => it.club)))];
    const CATS = [['all', '전체'], ['league', '리그'], ['cup', '국내 컵'], ['cont', '대륙 대회'], ['nt', '국가대표']];
    const pass = it => (d.pf === 'all' || it.cat === d.pf) && (!d.pc || it.club === d.pc || (it.cat === 'nt' && !d.pc));
    const tb = h('tbody');
    const tot = { apps: 0, g: 0, a: 0, rs: 0 };
    for (const sn of seasons.slice().reverse()) {
      const items = sn.items.filter(pass); if (!items.length) continue;
      const t = items.reduce((a, it) => (a.apps += it.apps, a.g += it.g, a.a += it.a, a.rs += it.rt * it.apps, a), { apps: 0, g: 0, a: 0, rs: 0 });
      tot.apps += t.apps; tot.g += t.g; tot.a += t.a; tot.rs += t.rs;
      const open = d.open[sn.y];
      const lgIt = sn.items.find(it => it.cat === 'league');
      tb.append(h('tr', { class: 'click' + (open ? ' on' : ''), onclick: () => { d.open[sn.y] = !open; stay(); } },
        h('td', null, h('span', { class: 'mute' }, open ? '▾ ' : '▸ '), sn.label), h('td', null, ...[...new Set(sn.items.filter(it => it.club).map(it => it.club))].map(cid => clubLink(w, cid, 16)), lgIt && lgIt.loan ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ' (임대)') : null),
        h('td', null, sn.age != null ? sn.age : ''), h('td', null, sn.ovr != null ? sn.ovr : ''), h('td', null, t.apps), h('td', null, h('b', null, t.g)), h('td', null, t.a), h('td', null, t.apps ? U.rt2(t.rs / t.apps) : '-')));
      if (open) for (const it of items) tb.append(h('tr', { class: 'sub click', title: '눌러서 경기 목록', onclick: () => compMatches(s, pid, sn.label, it) },
        h('td'), h('td', { colspan: 3 }, h('span', { class: 'cpt cp-' + ({ league: 'l', cup: 'c', cont: 'e', nt: 'n' })[it.cat] }, ({ league: '리그', cup: '컵', cont: '대륙', nt: '국가대표' })[it.cat]), ' ', it.name, it.club && it.cat !== 'league' ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ` · ${(w.clubs[it.club] || {}).name || ''}`) : null),
        h('td', null, it.apps), h('td', null, it.g), h('td', null, it.a), h('td', null, it.apps ? U.rt2(it.rt) : '-')));
    }
    root.append(h('div', { class: 'sec' }, h('h3', null, '시즌별 기록', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 시즌을 누르면 대회별 · 대회를 누르면 경기 목록')),
      h('div', { class: 'in pfilt' }, h('div', { class: 'seg' }, ...CATS.map(([k, l]) => h('button', { class: d.pf === k ? 'on' : '', onclick: () => { d.pf = k; stay(); } }, l))),
        clubsOf.length > 1 ? h('select', { class: 'wsel', onchange: ev => { d.pc = ev.target.value; stay(); } }, h('option', { value: '' }, '전체 구단'), ...clubsOf.map(cid => { const o = h('option', { value: cid }, (w.clubs[cid] || {}).name || cid); if (cid === d.pc) o.selected = true; return o; })) : null),
      h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc ptable' }, h('thead', null, h('tr', null, ...['시즌', '구단', '나이', 'OVR', '경기', '골', '도움', '평점'].map(x => h('th', null, x)))), tb,
        h('tfoot', null, h('tr', { class: 'me' }, h('td', null, '통산'), h('td'), h('td'), h('td'), h('td', null, tot.apps), h('td', null, tot.g), h('td', null, tot.a), h('td', null, tot.apps ? U.rt2(tot.rs / tot.apps) : '-'))))),
      h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 18px 14px' } }, '국내 컵은 구단이 참가한 첫 라운드부터 기록됩니다 (이번 버전 이전 시즌은 8강부터). 경기 목록·상세는 최근 3시즌만 보관합니다.')));
  } else root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '보관된 시즌 기록이 없습니다. 게임 시작(2026/27) 이후 시즌이 끝나야 기록이 쌓입니다.')));
  // 발롱도르 이력
  const bd = (w.bdHist || []).map(b => { const i = b.top.findIndex(x => x[2] === pid); return i >= 0 ? [b.y, i + 1] : null; }).filter(Boolean);
  if (bd.length) root.append(h('div', { class: 'sec' }, h('h3', null, '발롱도르'), h('div', { class: 'in chg' }, ...bd.map(([y, r]) => h('span', { class: 'chip' + (r === 1 ? ' gold' : '') }, `${y}년 ${r}위`)))));
  // 득점왕
  const boots = [];
  for (const lb of Object.keys(w.arch || {})) { const A = w.arch[lb]; for (const id in A.lg) { const L = A.lg[id]; if (L.sc && L.sc[0] && L.sc[0][5] === pid) boots.push(`${lb} ${L.n} 득점왕 (${L.sc[0][2]}골)`); } }
  if (boots.length) root.append(h('div', { class: 'sec' }, h('h3', null, '수상'), h('div', { class: 'in chg' }, ...boots.map(t => h('span', { class: 'chip gold' }, t)))));
}

// ---------- 구단: 이적 기록 ----------
const TXK = { buy: ['이적', '영입'], free: ['자유계약', '자유계약 영입'], loan: ['임대 보냄', '임대 영입'], lret: ['임대 종료', '임대 복귀'], rel: ['방출', ''], ret: ['은퇴', ''], yth: ['', '유스 승격'], new: ['', '외부 영입'], ext: ['재계약', '재계약'] };
const txLabels = w => [...new Set((w.txKeys || []).concat(Object.keys(w.arch || {})))].sort().reverse();
// 한 시즌 이적시장에서 이 구단의 영입·방출 (내 선수 이적 포함)
function clubWindow(s, id, label) {
  const w = s.w, T = U.withTx(label, () => stay());
  const inn = [], out = [];
  const ext = [];
  if (T) for (const r of T) { if (r[3] === 'ext') { if (r[1] === id) ext.push(r); continue; } if (r[2] === id) inn.push(r); else if (r[1] === id) out.push(r); }
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
  return h('div', { class: 'sec' }, h('h3', null, `${label} 여름 이적시장`), trim ? h('div', { class: 'sub' }, '오래된 시즌이라 이적료가 있었던 이동과 OVR 75 이상 선수만 보관합니다. (지출·수입 합계는 그대로)') : null,
    h('div', { class: 'wsum' }, ...chips.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2))))),
    h('div', { class: 'in' }, h('div', { class: 'lbl' }, `들어온 선수 ${inn.length}`), h('div', { class: 'tscroll' }, txTable(s, inn, 1)), h('div', { class: 'lbl', style: { marginTop: '14px' } }, `나간 선수 ${out.length}`), h('div', { class: 'tscroll' }, txTable(s, out, 0)),
      h('div', { class: 'lbl', style: { marginTop: '14px' } }, `재계약 ${ext.length}`), h('div', { class: 'tscroll' }, extTable(s, ext))));
}
U.windowTotals = windowTotals;
function clubTx(s, root, id) {
  const w = s.w, d = db(), labels = (w.txKeys || []).slice().reverse();
  if (!labels.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 이적시장 기록이 없습니다. 첫 시즌이 끝난 뒤 여름 이적시장부터 기록됩니다.'))); return; }
  if (!d.ctx || !labels.includes(d.ctx)) d.ctx = labels[0];
  // 시즌별 요약 (불러온 시즌만 숫자 표시)
  root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { d.ctx = e.target.value; stay(); } }, ...labels.map(l => { const o = h('option', { value: l }, `${l} 여름 이적시장`); if (l === d.ctx) o.selected = true; return o; }))));
  root.append(windowSec(s, id, d.ctx));
}
// ---------- 구단: 시즌별 기록 ----------
function clubSeason(s, root, id) {
  const w = s.w, d = db(), labels = Object.keys(w.arch || {}).sort().reverse();
  if (!labels.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '첫 시즌이 끝나면 기록이 쌓입니다.'))); return; }
  if (!d.cs || !labels.includes(d.cs)) d.cs = labels[0];
  root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { d.cs = e.target.value; stay(); } }, ...labels.map(l => { const o = h('option', { value: l }, l); if (l === d.cs) o.selected = true; return o; }))));
  const A = w.arch[d.cs], y = +d.cs.slice(0, 4), yOff = y - 2000;
  // 성적
  const res = [];
  for (const lid in A.lg) { const L = A.lg[lid], i = (L.t || []).findIndex(r => r[0] === id); if (i >= 0) { const r = L.t[i]; res.push([L.n, `${i + 1}위 / ${L.slim ? '-' : L.t.length}`, `${r[2]}승 ${r[3]}무 ${r[4]}패 · 승점 ${r[7]} · ${r[5]}득 ${r[6]}실`, i === 0]); } }
  for (const grp of [A.cup, A.lcup]) for (const n in grp || {}) { const cup = grp[n]; const inR = (cup.r || []).filter(rd => rd.m.some(m => m[0] === id || m[1] === id)); if (!inR.length) continue; res.push([cup.n, cup.w === id ? '우승' : cup.ru === id ? '준우승' : `${inR[inR.length - 1].n} 탈락`, '', cup.w === id]); }
  for (const k in A.cont || {}) { const K = A.cont[k]; const inR = (K.r || []).filter(rd => rd.t.some(t => t[0] === id || t[1] === id)); const inPh = (K.ph || []).findIndex(r => r[0] === id); if (!inR.length && inPh < 0) continue; res.push([K.n, K.w === id ? '우승' : inR.length ? `${inR[inR.length - 1].n}${K.w === id ? '' : ' 탈락'}` : `리그 페이즈 ${inPh + 1}위`, '', K.w === id]); }
  root.append(h('div', { class: 'sec' }, h('h3', null, `${d.cs} 성적`), res.length ? h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...res.map(([n, v, sub, gold]) => h('div', { class: 'csrow' }, h('b', null, n), h('span', { style: { color: gold ? 'var(--gold)' : null, fontWeight: 700 } }, v), h('span', { class: 'mute', style: { fontSize: '12px' } }, sub)))) : h('div', { class: 'empty' }, '기록 없음')));
  // 선수 기록 (이 시즌 이 구단에서 뛴 선수 전원, 전 대회 합계)
  const rows = [];
  for (const pid in (w.ps || {})) {
    const P = w.ps[pid]; if (!P.h || P.h.indexOf(yOff + ',') < 0) continue;
    const sn = playerSeasons(w, P).find(x => x.y === yOff); if (!sn) continue;
    const its = sn.items.filter(it => it.club === id || (it.cat !== 'league' && it.cat !== 'nt' && sn.items.some(z => z.cat === 'league' && z.club === id)));
    const lgI = its.find(it => it.cat === 'league'); if (!lgI) continue;
    const t = its.reduce((a, it) => (a.apps += it.apps, a.g += it.g, a.a += it.a, a.rs += it.rt * it.apps, a), { apps: 0, g: 0, a: 0, rs: 0 });
    rows.push({ pid, n: P.n, pos: P.pos, age: sn.age, apps: t.apps, g: t.g, a: t.a, rt: t.apps ? t.rs / t.apps : 0, lgApps: lgI.apps, loan: lgI.loan });
  }
  const me = (s.hist || []).find(r => r.label === d.cs && r.club === id);
  if (me) rows.push({ pid: 'ME', n: s.p.name + ' (나)', pos: me.pos, age: me.age, apps: me.total.apps, g: me.total.goals, a: me.total.assists, rt: me.rating || 0, lgApps: (me.agg && me.agg.league ? me.agg.league.st.apps : 0) });
  if (!d.csSort) d.csSort = 'apps';
  rows.sort((a, b) => (b[d.csSort] || 0) - (a[d.csSort] || 0));
  const th = (k, l) => h('th', { class: 'lnk' + (d.csSort === k ? ' on' : ''), onclick: () => { d.csSort = k; stay(); } }, l);
  const tg = rows.reduce((a, r) => a + r.g, 0);
  root.append(h('div', { class: 'sec' }, h('h3', null, `선수 기록 ${rows.length}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 전 대회 합계 · 팀 득점 중 선수 득점 ${tg} (자책골 제외) · 열 제목을 누르면 정렬`)),
    rows.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, h('th', null, '선수'), h('th', null, '포지션'), h('th', null, '나이'), th('apps', '경기'), th('lgApps', '리그'), th('g', '골'), th('a', '도움'), th('rt', '평점'))),
      h('tbody', null, ...rows.map(r => h('tr', { class: r.pid === 'ME' ? 'me' : '' }, h('td', null, r.pid === 'ME' ? h('span', { class: 'lnk', onclick: () => U.setTab('records') }, r.n) : nameLink(r.n, r.pid), r.loan ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ' (임대)') : null), h('td', null, h('span', { class: 'tpos' }, r.pos)), h('td', null, r.age != null ? r.age : ''), h('td', null, r.apps), h('td', null, r.lgApps), h('td', null, h('b', null, r.g)), h('td', null, r.a), h('td', null, r.rt ? U.rt2(r.rt) : '-')))))) : h('div', { class: 'empty' }, '선수 기록이 없습니다 (명단 없는 하부 구단).')));
  // 그 시즌 이적시장 (시즌 시작 전 여름)
  root.append(windowSec(s, id, d.cs));
}
// ---------- 구단 ----------
function clubView(s, root, id) {
  const w = s.w, c = w.clubs[id];
  if (!c) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '구단 정보를 찾을 수 없습니다.'))); return; }
  const lg = w.lg[c.lg];
  root.append(h('div', { class: 'sec', style: U.tintStyle ? U.tintStyle(c, .25) : null }, h('div', { class: 'in dbhead' }, crest(c, 56),
    h('div', null, h('h2', { style: { margin: 0 } }, c.name), h('div', { class: 'mute' }, [lg ? lg.name : '', C.natName(c.nat)].filter(Boolean).join(' · '))),
    h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, '전력'), h('b', null, c.str.toFixed(1))))));
  const d = db(); if (d.cid !== id) { d.cid = id; d.ct = 'now'; d.cs = null; }
  root.append(h('div', { class: 'seg lsub' }, ...[['now', '현재 스쿼드'], ['season', '시즌별 기록'], ['tx', '이적시장']].map(([k, l]) => h('button', { class: d.ct === k ? 'on' : '', onclick: () => { d.ct = k; stay(); } }, l))));
  if (d.ct === 'season') { clubSeason(s, root, id); return; }
  if (d.ct === 'tx') { clubTx(s, root, id); return; }
  // 스쿼드
  const sq = C.squadOf(w, c, s.w.year).slice().sort((a, b) => (POSORD[a.pos] - POSORD[b.pos]) || b.ovr - a.ovr);
  const meHere = s.car && s.car.club === id;
  const ent = {}; if (!c.lite && c.sq) for (const e of c.sq) ent[String(e[0])] = e;
  const rl = !c.lite && c.sq && C.squadRoles ? C.squadRoles(c) : null;
  const RL = ['주전', '로테이션', '백업'];
  const ctTxt = e => e[7] && w.clubs[e[7]] ? '임대' : e[6] != null ? `${Math.max(1, e[6])}년 (${w.year + Math.max(1, e[6])}.6)` : '';
  const unit = C.wageUnit();
  const bill = !c.lite && c.sq ? c.sq.reduce((a, e) => a + (e[7] ? 0 : (e[8] || 0)), 0) + (meHere && s.car.wage ? s.car.wage : 0) : 0;
  if (!d.sqs) d.sqs = 'pos';
  const sortF = { pos: (a, b) => (POSORD[a.pos] - POSORD[b.pos]) || b.ovr - a.ovr, ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age, ct: (a, b) => ((ent[a.id] || [])[6] || 0) - ((ent[b.id] || [])[6] || 0), wage: (a, b) => ((ent[b.id] || [])[8] || 0) - ((ent[a.id] || [])[8] || 0) }[d.sqs];
  sq.sort(sortF);
  const th = (k, l) => k ? h('th', { class: 'lnk' + (d.sqs === k ? ' on' : ''), onclick: () => { d.sqs = k; stay(); } }, l) : h('th', null, l);
  root.append(h('div', { class: 'sec' }, h('h3', null, `스쿼드 ${sq.length + (meHere ? 1 : 0)}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, c.lite ? ' 하부 리그 구단은 대략적인 명단입니다' : ` ${unit} 총액 ${C.fmtWage(bill)} · 열 제목을 누르면 정렬`)),
    h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '640px' } }, h('thead', null, h('tr', null, th('pos', '포지션'), th(null, '이름'), th('age', '나이'), th(null, '국적'), th('ovr', 'OVR'), th(null, '역할'), th('ct', '계약'), th('wage', unit))),
      h('tbody', null, ...(meHere ? [h('tr', { class: 'me' }, h('td', null, s.p.pos), h('td', null, h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${s.p.name} (나)`)), h('td', null, s.p.age), h('td', null, flag(s.p.nat, 18)), h('td', null, C.ovrOf(s.p)), h('td'), h('td', { class: 'mute', style: { fontSize: '12px' } }, s.car.status === 'loan' ? '임대' : s.car.contract ? `${s.car.contract + 1}.6` : ''), h('td', null, s.car.wage ? C.fmtWage(s.car.wage, true) : ''))] : []),
        ...sq.map(x => { const e = ent[x.id]; return h('tr', null, h('td', null, h('span', { class: 'tpos' }, x.pos)), h('td', null, nameLink(x.n, x.id), e && e[7] && w.clubs[e[7]] ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ` (${w.clubs[e[7]].name}에서 임대)`) : null), h('td', null, x.age != null ? x.age : ''), h('td', null, x.nat ? flag(x.nat, 18) : ''), h('td', null, Math.round(x.ovr)),
          h('td', { class: 'mute', style: { fontSize: '12px' } }, e && rl && rl.has(e) ? RL[rl.get(e)] : ''), h('td', { class: 'mute', style: { fontSize: '12px' } }, e ? ctTxt(e) : ''), h('td', null, e && e[8] ? C.fmtWage(e[8], true) : '')); }))))));
  // 재정
  if (!c.lite && c.rev) {
    const fin = [['연 수입 (추정)', C.fmtEUR(c.rev)], ['보유 자금', C.fmtEUR(c.cash || 0)], ['연간 급여 총액', C.fmtEUR(bill * 52)], ['수입 대비 급여', Math.round(bill * 52 / c.rev * 100) + '%'], ['급여 상한 (수입의 62%)', C.fmtEUR(c.rev * .62)]];
    root.append(h('div', { class: 'sec' }, h('h3', null, '재정', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 이적료는 보유 자금 안에서, 급여는 상한 안에서만 쓸 수 있습니다')), h('div', { class: 'wsum' }, ...fin.map(([k, v2]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', null, h('b', null, v2)))))));
  }
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

// ---------- 국가대표팀 ----------
const TROUND = ['조별리그', '32강', '16강', '8강', '4강', '결승'];
function natView(s, root, nat) {
  const w = s.w, pools = C.nationPools(w), pool = pools[nat];
  const str = pool && pool.all.length >= 8 ? C.nationStrength(pool) : null;
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in dbhead' }, U.natCrest(nat, 56), h('div', null, h('h2', { style: { margin: 0 } }, `${C.natName(nat)} 대표팀`), h('div', { class: 'mute' }, `${C.confOf(nat)}${str ? ` · 전력 ${str.toFixed(1)}` : ''}`)))));
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
  if (d.view !== 'home') root.append(h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn ghost sm', onclick: back }, '← 뒤로'), h('button', { class: 'btn ghost sm', onclick: () => { d.stack = []; d.view = 'home'; d.id = null; U.setTab('db'); } }, '검색')));
  try {
    if (d.view === 'player') playerView(s, root, d.id);
    else if (d.view === 'club') clubView(s, root, d.id);
    else if (d.view === 'nat') natView(s, root, d.id);
    else homeView(s, root);
  } catch (e) { console.error(e); root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '정보를 불러오지 못했습니다.'))); }
  return root;
};
})(window);
