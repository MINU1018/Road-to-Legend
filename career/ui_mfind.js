// Road to Legend — 경기 탐색 (v39): 보관된 모든 경기(리그·국내 컵·대륙 대회·국제 대회·A매치)를 조건으로 찾는다
// 조건: 시즌 · 대회 종류/이름 · 팀 A · 팀 B(맞대결) · 선수(출전·득점) · 날짜 범위 · 팀 A 기준 결과·홈/원정 · 이벤트(해트트릭·퇴장·승부차기·대승·다득점) · 정렬
// 경기 기록은 시즌별 저장소(C.MD 형식)에 있다: 진행 중 시즌은 U.liveSt(), 지난 시즌은 U.withMx(시즌)로 불러온다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, flag, crest } = U;
const S = () => U.S();
const fold = t => (U.fold ? U.fold(t) : String(t || '').toLowerCase());
const CAT = { league: '리그', cup: '국내 컵', cont: '대륙 대회', intl: '국가대표' };
const st0 = () => U.st.mf || (U.st.mf = { season: 'live', cat: '', comp: '', a: '', b: '', p: '', pid: null, d0: '', d1: '', res: '', ha: '', ev: '', sort: 'new', lim: 60 });
const dayOf = v => { if (!v) return null; const [y, m, d] = v.split('-').map(Number); return C.dayOf(y, m, d); };
// 팀 이름 조건 → 키 집합 (구단 ID · 나라 코드)
function teamKeys(w, q) {
  q = fold(q); if (q.length < 2) return null; const out = new Set();
  for (const id in w.clubs) { const c = w.clubs[id]; if (fold(c.name).includes(q) || fold(c.en).includes(q) || fold(c.short) === q) out.add(id); }
  const EN = (C.logos && C.logos.NAT_EN) || {};
  for (const code of Object.keys(C.NAT || {})) if (fold(C.natName(code)).includes(q) || fold((EN[code] || '').replace(/\|/g, ' ')).includes(q) || code.toLowerCase() === q) out.add(code);
  return out;
}
// 한 시즌 저장소의 경기 행 (가벼운 정보만, 상세는 get()으로)
function rowsOf(w, st, sl) {
  const out = [], cid = x => typeof x === 'number' ? (w.cix || [])[x] : x;
  for (const lid in st.L || {}) { const L = st.L[lid], lg = w.lg[lid]; if (!L || !L.s) continue;
    const nm = lg ? lg.name : lid, nat = lg ? lg.nation : '';
    for (const r of C.MD.leagueRows(w, L)) out.push({ sl, cat: 'league', ck: lid, cn: nm, nn: nat, stage: `${r.r + 1}라운드`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, pw: null, date: r.d, nat: false,
      get: () => ({ d: C.MD.leagueMatch(st, L, r.i), key: lid + '|' + sl + '|' + r.i, ctx: { st, lg: lid, L, i: r.i, date: r.d } }) }); }
  for (const k in st.CUP || {}) { const [nat, kind] = k.split(':'), nm = (kind === 'lcup' ? C.LCUPNAME[nat] : C.CUPNAME[nat]) || '국내 컵';
    for (const r of st.CUP[k] || []) out.push({ sl, cat: 'cup', ck: k, cn: nm, nn: nat, stage: r[0], a: cid(r[1]), b: cid(r[2]), ga: r[3], gb: r[4], pw: r[7] != null ? cid(r[7]) : null, date: r[8], nat: false,
      get: () => ({ d: C.MD.decode(st, r), key: nm + '|' + sl + '|' + r[1] + '|' + r[2] + '|' + r[0], ctx: { st, grp: 'CUP', key: k, stage: r[0], date: r[8] } }) }); }
  for (const k in st.CONT || {}) { const nm = C.COMPS && C.COMPS[k] ? C.COMPS[k].name : k;
    for (const r of st.CONT[k] || []) out.push({ sl, cat: 'cont', ck: k, cn: nm, nn: '', stage: r[0], a: cid(r[1]), b: cid(r[2]), ga: r[3], gb: r[4], pw: r[7] != null ? cid(r[7]) : null, date: r[8], nat: false,
      get: () => ({ d: C.MD.decode(st, r), key: nm + '|' + sl + '|' + r[1] + '|' + r[2] + '|' + r[0], ctx: { st, grp: 'CONT', key: k, stage: r[0], date: r[8] } }) }); }
  for (const k in st.INTL || {}) { const nm = k === 'UNL' ? 'UEFA 네이션스리그' : k === 'AM' ? 'A매치' : C.TDEF && C.TDEF[k] ? C.TDEF[k].name : k;
    for (const r of st.INTL[k] || []) out.push({ sl, cat: 'intl', ck: k, cn: nm, nn: '', stage: r[0], a: r[1], b: r[2], ga: r[3], gb: r[4], pw: r[7] || null, date: r[8], nat: true,
      get: () => ({ d: C.MD.decode(st, r), key: nm + '|' + sl + '|' + r[1] + '|' + r[2] + '|' + r[0], ctx: { st, grp: 'INTL', key: k, stage: r[0], date: r[8] } }) }); }
  return out;
}
const tn = (w, id, nat) => nat ? C.natName(id) : (w.clubs[id] || {}).name || id || '';
// 시즌 목록: 진행 중 + 지난 시즌 (경기 기록이 보관된 시즌)
const seasonsOf = w => (w.cal ? ['live'] : []).concat((w.mxKeys || []).filter(k => k !== C.wLabel(w.year) || !w.cal).slice().sort().reverse());
U.pages.mfind = function () {
  const s = S(), w = s.w, v = st0();
  const root = h('div', { class: 'wrap screen' });
  root.append(U.pageHead('경기 탐색', '보관된 모든 경기를 시즌·대회·팀·선수·날짜·결과로 찾습니다. 경기를 누르면 상세 기록.'));
  const stay = () => { U._keepY = window.scrollY; U.stay ? U.stay() : U.setTab('mfind'); };
  const set = (k, val) => { if (v[k] === val) return; v[k] = val; v.lim = 60; if (k === 'p') { v.pid = null; v.pn = ''; } stay(); };
  // 글자 칸은 Enter나 칸을 벗어날 때 적용 (입력 중 다시 그리면 커서가 사라진다)
  const inp = (k, ph, type) => h('input', { type: type || 'search', placeholder: ph, value: v[k] || '', onchange: e => set(k, e.target.value), onkeydown: e => { if (e.key === 'Enter') set(k, e.target.value); }, style: { width: '100%' } });
  const sel = (k, opts) => { const e = h('select', { class: 'wsel', onchange: ev => set(k, ev.target.value) }, ...opts.map(([val, l]) => { const o = h('option', { value: val }, l); if (String(v[k]) === String(val)) o.selected = true; return o; })); return e; };
  const SL = seasonsOf(w);
  const lbl = t => h('div', { class: 'lbl', style: { fontSize: '11px', marginBottom: '3px' } }, t);
  const cell = (t, el) => h('div', null, lbl(t), el);
  // 선수: 이름으로 찾아 한 명을 고른다 (동명이인은 소속·나이로 구분)
  let pickBox = null;
  if ((v.p || '').trim().length >= 2 && !v.pid && U.dbSearch) { const r = U.dbSearch(w, v.p).players.slice(0, 10);
    pickBox = h('div', { class: 'chg', style: { marginTop: '6px' } }, ...(r.length ? r.map(x => h('button', { class: 'chip', onclick: () => { v.pid = x.pid; v.pn = x.n; stay(); } }, `${x.n} · ${x.pos || ''}${x.club && w.clubs[x.club] ? ' · ' + w.clubs[x.club].name : x.retired ? ' · 은퇴' : ''}`)) : [h('span', { class: 'mute', style: { fontSize: '12px' } }, '맞는 선수가 없습니다.')])); }
  const pSel = v.pid ? h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' } }, h('span', { class: 'chip gold' }, v.pn || C.MD.nameOf(v.pid, s)), h('button', { class: 'btn ghost sm', onclick: () => { v.pid = null; v.pn = ''; stay(); } }, '선수 해제')) : null;
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in mfgrid' },
    cell('시즌', sel('season', [['all', '모든 시즌'], ...SL.map(k => [k, k === 'live' ? `${C.wLabel(w.year)} (진행 중)` : k])])),
    cell('대회 종류', sel('cat', [['', '전체'], ['league', '리그'], ['cup', '국내 컵'], ['cont', '대륙 대회'], ['intl', '국가대표 (국제 대회·A매치)']])),
    cell('대회 이름', inp('comp', '예: 프리미어리그 · 챔피언스리그 · 월드컵')),
    cell('팀 A', inp('a', '구단·대표팀 이름')),
    cell('팀 B (맞대결)', inp('b', '상대 이름 (비우면 모든 상대)')),
    cell('선수 (출전 경기)', h('div', null, inp('p', '선수 이름'), pSel, pickBox)),
    cell('날짜 시작', inp('d0', '', 'date')), cell('날짜 끝', inp('d1', '', 'date')),
    cell('결과 (팀 A 기준)', sel('res', [['', '전체'], ['W', '승'], ['D', '무'], ['L', '패']])),
    cell('홈/원정 (팀 A 기준)', sel('ha', [['', '전체'], ['h', '홈'], ['a', '원정']])),
    cell('이벤트', sel('ev', [['', '전체'], ['hat', '해트트릭'], ['red', '퇴장'], ['pen', '승부차기'], ['big', '3골 차 이상'], ['g5', '합계 5골 이상'], ['g0', '0-0']])),
    cell('정렬', sel('sort', [['new', '최신 순'], ['old', '오래된 순'], ['goals', '골 많은 순'], ['diff', '점수 차 큰 순']])),
    h('div', { style: { alignSelf: 'end' } }, h('button', { class: 'btn ghost', onclick: () => { U.st.mf = null; stay(); } }, '조건 초기화')))));
  // 모으기
  const list = h('div', { class: 'sec' }); root.append(list);
  const want = v.season === 'all' ? SL : [v.season];
  let rows = [], waiting = 0;
  // 진행 중 시즌 = 진행 중인 대회(U.liveSt) + 이번 시즌에 이미 끝난 대회(보관 중인 이번 시즌 저장소). 겹치는 경기는 한 번만
  const seen = new Set(), push = list => { for (const r of list) { const k = `${r.cat}|${r.ck}|${r.a}|${r.b}|${r.ga}|${r.gb}|${r.date}|${r.stage}`; if (seen.has(k)) continue; seen.add(k); rows.push(r); } };
  for (const sl of want) {
    if (sl === 'live') { const L = U.liveSt ? U.liveSt() : null; if (L) push(rowsOf(w, L, 'live')); const cur = U.mxCached(C.wLabel(w.year)); if (cur) push(rowsOf(w, cur, 'live')); continue; }
    const st = U.withMx(sl, () => stay()); if (!st) { waiting++; continue; } push(rowsOf(w, st, sl)); }
  const A = teamKeys(w, v.a), B = teamKeys(w, v.b), cq = fold(v.comp), d0 = dayOf(v.d0), d1 = dayOf(v.d1);
  const sideA = r => A ? (A.has(r.a) ? 0 : A.has(r.b) ? 1 : -1) : 0;
  // 가벼운 조건 먼저
  rows = rows.filter(r => {
    if (v.cat && r.cat !== v.cat) return false;
    if (cq && !fold(r.cn).includes(cq)) return false;
    if (A && !A.has(r.a) && !A.has(r.b)) return false;
    if (B) { const sa = sideA(r), opp = sa === 1 ? r.a : r.b; if (A ? !B.has(opp) : (!B.has(r.a) && !B.has(r.b))) return false; }
    if (d0 != null && (r.date == null || r.date < d0)) return false;
    if (d1 != null && (r.date == null || r.date > d1)) return false;
    const sa = sideA(r);
    if (v.ha && A) { if (v.ha === 'h' ? sa !== 0 : sa !== 1) return false; }
    if (v.res && A) { const f = sa ? r.gb : r.ga, ag = sa ? r.ga : r.gb, me = sa ? r.b : r.a, res = f > ag ? 'W' : f < ag ? 'L' : r.pw ? (r.pw === me ? 'W' : 'L') : 'D'; if (res !== v.res) return false; }
    if (v.ev === 'pen' && !r.pw) return false;
    if (v.ev === 'big' && Math.abs(r.ga - r.gb) < 3) return false;
    if (v.ev === 'g5' && r.ga + r.gb < 5) return false;
    if (v.ev === 'g0' && (r.ga || r.gb)) return false;
    return true;
  });
  // 선수: 그 선수가 뛴 팀(소속 이력·대표팀)의 경기만 상세를 풀어 확인
  let capped = false;
  const needDet = v.pid || v.ev === 'hat' || v.ev === 'red';
  if (needDet) {
    let teams = null;
    if (v.pid) { teams = new Set(); const P = (w.ps || {})[v.pid], loc = U.locate ? U.locate(w, v.pid) : null; if (loc && loc.c) teams.add(loc.c.id); if (loc && loc.e) teams.add(loc.e[5]);
      if (P) { if (P.nat) teams.add(P.nat); for (const row of String(P.h || '').split(';')) { if (!row) continue; const x = row.split(',')[1]; const id = C.cidOf(w, /^\d+$/.test(x) ? +x : x); if (id) teams.add(id); }
        for (const m of String(P.mv || '').split(';')) { if (!m) continue; const f = m.split(','); for (const x of [f[2], f[3]]) if (x) teams.add(C.cidOf(w, /^\d+$/.test(x) ? +x : x)); } }
      if (s.mode !== 'world' && v.pid === 'ME' && s.p) teams.add(s.p.nat); }
    const pre = teams ? rows.filter(r => teams.has(r.a) || teams.has(r.b)) : rows;
    const out = []; let n = 0;
    for (const r of pre) { if (++n > 6000) { capped = true; break; } const g = r.get(); r._g = g; const d = g.d;
      if (v.pid) { const inLn = d.ln && d.ln.some(side => side.some(x => x.id === v.pid)), inEv = d.ev.some(e => e.p === v.pid || e.a === v.pid); if (!inLn && !inEv) continue; r.me = d.ln ? (d.ln[0].some(x => x.id === v.pid) ? 0 : d.ln[1].some(x => x.id === v.pid) ? 1 : null) : null; r.pg = d.ev.filter(e => e.p === v.pid && 'gp'.includes(e.k)).length; r.pa = d.ev.filter(e => e.a === v.pid).length; }
      if (v.ev === 'hat') { const c = {}; for (const e of d.ev) if ('gp'.includes(e.k) && e.p) c[e.p] = (c[e.p] || 0) + 1; const hp = Object.keys(c).filter(p => c[p] >= 3); if (!hp.length) continue; r.hat = hp; }
      if (v.ev === 'red' && !d.ev.some(e => e.k === 'r' || e.k === '2')) continue;
      out.push(r); }
    rows = out;
  }
  const srt = { new: (a, b) => (b.date || 0) - (a.date || 0) || (b.sl > a.sl ? 1 : -1), old: (a, b) => (a.date || 0) - (b.date || 0), goals: (a, b) => (b.ga + b.gb) - (a.ga + a.gb) || (b.date || 0) - (a.date || 0), diff: (a, b) => Math.abs(b.ga - b.gb) - Math.abs(a.ga - a.gb) || (b.date || 0) - (a.date || 0) }[v.sort] || null;
  if (srt) rows.sort(srt);
  // 요약
  const head = [`${rows.length.toLocaleString()}경기`];
  if (A && rows.length) { let W = 0, D = 0, L = 0, gf = 0, ga = 0; for (const r of rows) { const sa = sideA(r), f = sa ? r.gb : r.ga, ag = sa ? r.ga : r.gb, me = sa ? r.b : r.a; gf += f; ga += ag; if (f > ag || (f === ag && r.pw && r.pw === me)) W++; else if (f < ag || (f === ag && r.pw)) L++; else D++; }
    head.push(`팀 A 기준 ${W}승 ${D}무 ${L}패 · ${gf}득점 ${ga}실점`); }
  if (v.pid && rows.length) head.push(`${v.pn || ''} ${rows.reduce((t, r) => t + (r.pg || 0), 0)}골 ${rows.reduce((t, r) => t + (r.pa || 0), 0)}도움`);
  const note = [];
  if (waiting) note.push(`지난 시즌 ${waiting}개를 불러오는 중…`);
  if (capped) note.push('조건이 넓어 상세 확인은 6,000경기까지만 했습니다. 팀·시즌을 좁혀 보세요.');
  if (v.pid) note.push('선수 조건: 출전 명단(교체 포함)이나 득점·도움 기록이 있는 경기. 하부 리그 일부는 명단이 보관되지 않아 득점 경기만 잡힙니다.');
  if ((v.a || '').trim().length >= 2 && !A.size) note.push(`팀 A "${v.a}"에 맞는 팀이 없습니다.`);
  list.append(h('h3', null, head.join(' · '))); if (note.length) list.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '0 18px 6px' } }, note.join(' ')));
  if (!rows.length) { list.append(h('div', { class: 'empty' }, '조건에 맞는 경기가 없습니다.')); return root; }
  const shown = rows.slice(0, v.lim);
  list.append(h('div', { class: 'in fxlist' }, ...shown.map(r => {
    const sa = A ? sideA(r) : r.me != null ? r.me : -1, f = sa === 1 ? r.gb : r.ga, ag = sa === 1 ? r.ga : r.gb, me = sa === 1 ? r.b : r.a;
    const res = sa < 0 ? null : f > ag ? 'W' : f < ag ? 'L' : r.pw ? (r.pw === me ? 'W' : 'L') : 'D';
    const tag = h('span', null, h('span', null, r.date != null ? C.fmtDateY(r.date) : r.sl), h('br'), h('small', null, `${r.cn} · ${r.stage}`));
    const extra = [r.pw ? `승부차기 ${tn(w, r.pw, r.nat)} 승` : '', r.hat ? '해트트릭 ' + r.hat.map(p => C.MD.nameOf(p, s)).join(', ') : '', v.pid && (r.pg || r.pa) ? `${r.pg ? r.pg + '골' : ''}${r.pa ? ' ' + r.pa + '도움' : ''}` : ''].filter(Boolean).join(' · ');
    const open = () => { const g = r._g || r.get(); U.showMatch({ title: `${r.cn} ${r.stage} (${r.sl === 'live' ? C.wLabel(w.year) : r.sl})`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, pw: r.pw, d: g.d, nat: r.nat, key: g.key, ctx: g.ctx, sa: r.cat === 'league' && U.ppgStr ? U.ppgStr(w, r.ck, r.sl)(r.a) : undefined, sb: r.cat === 'league' && U.ppgStr ? U.ppgStr(w, r.ck, r.sl)(r.b) : undefined }); };
    const row = h('div', { class: 'mfrow' }, U.fxRow(w, r.a, r.b, r.ga, r.gb, tag, res, false, open, r.nat)); if (extra) row.append(h('div', { class: 'mute', style: { fontSize: '11px', padding: '0 12px 4px' } }, extra)); return row;
  })));
  if (rows.length > v.lim) list.append(h('div', { class: 'in', style: { textAlign: 'center' } }, h('button', { class: 'btn ghost', onclick: () => { v.lim += 100; stay(); } }, `더 보기 (${(rows.length - v.lim).toLocaleString()}경기 남음)`)));
  return root;
};
})(typeof window !== 'undefined' ? window : globalThis);
