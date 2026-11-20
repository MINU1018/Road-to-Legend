// Road to Legend — 팔로우(리그·대회·구단·선수·국가대표), 경기 상세 열기, 뉴스 탭, 큰 대회 기간 연출(월드컵·챔스 나이트)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest, flag } = U;
const S = () => U.S();
const DOW = '일월화수목금토';
const dstr = d => `${C.fmtDateY(d)} (${DOW[C.toDate(d).getUTCDay()]})`;
const BIGLG = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BRA', 'ARG', 'KOR', 'JPN', 'USA', 'KSA', 'TUR', 'BEL', 'SCO'];
const COMPN = k => (C.COMPS[k] ? C.COMPS[k].name : C.TDEF[k] ? C.TDEF[k].name : k);
const COMPSH = k => (C.COMPS[k] ? C.COMPS[k].short : { WC: '월드컵', EURO: '유로', COPA: '코파', ASIA: '아시안컵', AFCON: '네이션스컵', GOLD: '골드컵', UNL: '네이션스리그', AM: 'A매치' }[k] || k);

// ---------- 팔로우 ----------
// 기본: 리그 1개(시작 리그 또는 내 리그) + UCL + 네이션스리그 + 월드컵 + 유로. 커리어는 내 구단·내 나라도
U.follow = function (s) {
  s = s || S(); const w = s.w;
  const f = s.follow || (s.follow = { lg: [], comp: ['UCL', 'UNL', 'WC', 'EURO'], club: [], pl: [], nat: [] });
  if (!f.init) {
    f.init = 1;
    let lg = s.wStartLg || (s.ss && s.ss.lgId) || (s.car && s.car.club && w.clubs[s.car.club] && w.clubs[s.car.club].lg);
    if (!lg) { const e = Object.values(w.lg).find(l => l.nation === 'ENG' && l.tier === 1); lg = e && e.id; }
    if (lg && !f.lg.includes(lg)) f.lg.push(lg);
    if (s.mode !== 'world' && s.p) { if (!f.nat.includes(s.p.nat)) f.nat.push(s.p.nat); if (s.car && s.car.club && !f.club.includes(s.car.club)) f.club.push(s.car.club); }
  }
  return f;
};
const KEYS = { lg: 'lg', comp: 'comp', club: 'club', pl: 'pl', nat: 'nat' };
U.isFollow = (kind, id) => U.follow()[KEYS[kind]].includes(id);
U.toggleFollow = (kind, id) => { const f = U.follow(), a = f[KEYS[kind]], i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); FS = null; U.save && U.save(); };
U.followBtn = function (kind, id, small) {
  const on = U.isFollow(kind, id);
  return h('button', { class: 'btn sm fbtn' + (on ? ' on' : ' ghost'), title: on ? '팔로우 해제' : '팔로우하면 경기·뉴스·달력에 먼저 나옵니다', onclick: ev => { ev.stopPropagation(); U.toggleFollow(kind, id); U.stay(); } }, on ? '★ 팔로잉' : (small ? '☆' : '☆ 팔로우'));
};
// 팔로우 집합 (선수는 지금 소속 구단·국적까지)
let FS = null;
function fset(s) {
  const w = s.w, f = U.follow(s), key = (w.cal ? w.cal.d : 0) + '|' + JSON.stringify(f);
  if (FS && FS.key === key && FS.w === w) return FS;
  const club = new Set(f.club), nat = new Set(f.nat), pcl = {};
  if (f.pl.length) { const want = new Set(f.pl); for (const id in w.clubs) { const c = w.clubs[id]; if (c.lite || !c.sq) continue; for (const e of c.sq) { const pid = String(e[0]); if (want.has(pid)) { pcl[pid] = id; club.add(id); nat.add(e[5]); } } } }
  const cupNat = new Set(f.lg.map(id => w.lg[id]).filter(l => l && l.tier === 1).map(l => l.nation));
  FS = { key, w, lg: new Set(f.lg), comp: new Set(f.comp), club, nat, pl: new Set(f.pl), pcl, cupNat, f };
  return FS;
}
U.fset = () => fset(S());
U.isFollowMatch = function (x, s) {
  s = s || S(); const F = fset(s);
  if (x.nat) return F.nat.has(x.a) || F.nat.has(x.b) || F.comp.has(x.comp);
  const cl = F.club.has(x.a) || F.club.has(x.b);
  if (x.k === 'L') return cl || F.lg.has(x.comp);
  if (x.k === 'E') return cl || F.comp.has(x.comp);
  if (x.k === 'C') return cl || F.cupNat.has(String(x.comp).split(':')[0]);
  return cl;
};
U.isFollowNews = function (n, s) {
  s = s || S(); const F = fset(s), w = s.w;
  if (n.gl) return true;
  if (n.lg && F.lg.has(n.lg)) return true;
  if (n.comp && (F.comp.has(n.comp) || F.cupNat.has(String(n.comp).split(':')[0]))) return true;
  for (const id of n.cl || []) { if (F.club.has(id)) return true; const c = w.clubs[id]; if (c && F.lg.has(c.lg)) return true; }
  for (const p of n.p || []) if (F.pl.has(p)) return true;
  for (const x of n.n || []) if (F.nat.has(x)) return true;
  return false;
};
// 팔로우 관리 (칩 목록 + 빠른 추가)
U.followManager = function (s) {
  const w = s.w, f = U.follow(s), v = (U.st.fm = U.st.fm || {});
  const chip = (kind, id, label, node) => h('span', { class: 'chip fchip' }, node || null, label, h('button', { class: 'x', title: '팔로우 해제', onclick: () => { U.toggleFollow(kind, id); U.stay(); } }, '×'));
  const items = [
    ...f.lg.map(id => w.lg[id] ? chip('lg', id, w.lg[id].name, flag(w.lg[id].nation, 14)) : null),
    ...f.comp.map(k => chip('comp', k, COMPN(k))),
    ...f.club.map(id => w.clubs[id] ? chip('club', id, w.clubs[id].name, crest(w.clubs[id], 14)) : null),
    ...f.pl.map(pid => chip('pl', pid, C.MD.nameOf(pid))),
    ...f.nat.map(n => chip('nat', n, `${C.natName(n)} 대표팀`, U.natCrest(n, 14)))].filter(Boolean);
  const sec = h('div', { class: 'sec' }, h('h3', null, '팔로우'), h('div', { class: 'in mute', style: { fontSize: '12px', paddingTop: 0 } }, '경기·달력·뉴스에 팔로우한 것을 먼저 보여줍니다. 구단·선수·대표팀 화면의 ☆ 버튼으로도 추가'),
    h('div', { class: 'in chg' }, ...(items.length ? items : [h('span', { class: 'mute' }, '팔로우한 것이 없습니다')]), h('button', { class: 'btn ghost sm', onclick: () => { v.open = !v.open; U.stay(); } }, v.open ? '닫기' : '+ 추가')));
  if (v.open) {
    const lgs = Object.values(w.lg).filter(l => l.tier === 1 && BIGLG.includes(l.nation)).sort((a, b) => BIGLG.indexOf(a.nation) - BIGLG.indexOf(b.nation));
    const tg = (kind, id, label) => h('button', { class: 'chip' + (U.isFollow(kind, id) ? ' gold' : ''), style: { cursor: 'pointer', border: 0 }, onclick: () => { U.toggleFollow(kind, id); U.stay(); } }, label);
    const nats = Object.keys(C.nationPools(w)).filter(n => (C.nationPools(w)[n].all || []).length >= 8).sort((a, b) => C.natName(a).localeCompare(C.natName(b), 'ko'));
    const ns = h('select', { class: 'wsel', onchange: ev => { const n = ev.target.value; if (n && !U.isFollow('nat', n)) { U.toggleFollow('nat', n); U.stay(); } } }, h('option', { value: '' }, '국가대표 추가…'), ...nats.map(n => h('option', { value: n }, C.natName(n))));
    sec.append(h('div', { class: 'in', style: { display: 'grid', gap: '8px' } },
      h('div', null, h('div', { class: 'lbl' }, '리그'), h('div', { class: 'chg' }, ...lgs.map(l => tg('lg', l.id, l.name)))),
      h('div', null, h('div', { class: 'lbl' }, '대륙 대회'), h('div', { class: 'chg' }, ...['UCL', 'UEL', 'UECL', 'LIB', 'SUD', 'ACL', 'CCC'].map(k => tg('comp', k, COMPN(k))))),
      h('div', null, h('div', { class: 'lbl' }, '국가대표'), h('div', { class: 'chg' }, ...['WC', 'EURO', 'COPA', 'ASIA', 'AFCON', 'GOLD', 'UNL', 'AM'].map(k => tg('comp', k, k === 'AM' ? 'A매치 친선전 전체' : COMPN(k))), ns))));
  }
  return sec;
};

// ---------- 경기 상세 열기 (진행 중 기록 → 보관 기록 순서로 찾는다) ----------
U.openMatchRef = function (ref, title) {
  const s = S(), w = s.w; if (!ref) return;
  const keyOf = lb => `${ref.mk}|${ref.sk || ref.lg}|${lb}|${ref.i != null ? ref.i : ref.ri}`;
  const showL = (st, L, i, lb) => {
    const rows = C.MD.leagueRows(w, L), r = rows.find(x => x.i === i); if (!r) return false;
    const sp = U.ppgStr ? U.ppgStr(w, ref.lg, lb) : () => null;
    U.showMatch({ title: title || `${(w.lg[ref.lg] || {}).name || ''} ${ref.sl || ''} · ${r.r + 1}라운드${r.d != null ? ' · ' + C.fmtDateY(r.d) : ''}`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: C.MD.leagueMatch(st, L, i), key: ref.lg + '|' + lb + '|' + i, sa: sp(r.a), sb: sp(r.b), ctx: { st, lg: ref.lg, L, i, date: r.d } });
    return true;
  };
  const nat = ref.mk === 'I' || ref.mk === 'A';
  const showRow = (st, row) => {
    const id = x => nat ? x : C.cidOf(w, x);
    const cn = ref.mk === 'C' ? (() => { const [n, k] = ref.sk.split(':'); return `${C.natName(n)} ${k === 'cup' ? '국내 컵' : '리그컵'}`; })() : COMPN(ref.sk);
    U.showMatch({ title: title || `${cn} · ${row[0]} · ${C.fmtDateY(row[8])}`, a: id(row[1]), b: id(row[2]), ga: row[3], gb: row[4], pw: row[7] != null ? id(row[7]) : null, d: C.MD.decode(st, row), nat, key: keyOf('') + '|' + row[1] + '|' + row[2], ctx: ref.mk === 'A' ? null : { st, grp: ref.mk === 'C' ? 'CUP' : ref.mk === 'E' ? 'CONT' : 'INTL', key: ref.sk, stage: row[0], date: row[8] } });
    return true;
  };
  const pickRow = rows => { if (!rows) return null; const r = rows[ref.ri]; if (r && r[8] === ref.d && r[1] === ref.a && r[2] === ref.b) return r; return rows.find(x => x[8] === ref.d && x[1] === ref.a && x[2] === ref.b) || null; };
  // 진행 중
  if (w.cal) {
    if (ref.mk === 'L') { const LS = w.cal.lg[ref.lg]; if (LS && LS.label === ref.sl && !LS.done) { const x = C.liveLeagueRows(s, ref.lg); if (x && showL(U.liveSt(), x.L, ref.i, 'live')) return; } }
    else {
      let rows = null;
      if (ref.mk === 'C') { for (const k in w.cal.cup) { const c = w.cal.cup[k]; if (c.nat + ':' + c.kind === ref.sk) rows = (w.cal.h[k] || {}).rows; } }
      else if (ref.mk === 'E') { for (const k in w.cal.cont) if (w.cal.cont[k].k === ref.sk) { const r = pickRow((w.cal.h[k] || {}).rows); if (r) { rows = [r]; break; } } }
      else if (ref.mk === 'I') { for (const k in w.cal.intl) if (w.cal.intl[k].k === ref.sk) rows = (w.cal.h[k] || {}).rows; }
      else if (ref.mk === 'A') { const wy = ref.wy != null ? ref.wy : w.cal.am ? w.cal.am.wy : w.year; rows = (w.cal.h['A:' + ref.sk + ':' + wy] || {}).rows; }
      const r = pickRow(rows); if (r) { showRow(U.liveSt(), r); return; }
      // 진행 중인 시즌 저장소 (끝난 대회·A매치 기간은 여기로 옮겨진다)
      if (ref.mk !== 'L') { const st = U.liveSt(), grp = ref.mk === 'C' ? st.CUP : ref.mk === 'E' ? st.CONT : st.INTL; const r2 = pickRow(grp && grp[ref.sk]); if (r2) { showRow(st, r2); return; } }
    }
  }
  // 보관 기록 (최근 시즌부터)
  const keys = (w.mxKeys || []).slice().reverse();
  for (const lb of keys) {
    const st = U.mxCached(lb) || U.withMx(lb, () => U.openMatchRef(ref, title));
    if (!st) return; // 불러오는 중: 다 불러오면 다시 시도
    if (ref.mk === 'L') { const L = st.L && st.L[ref.lg]; if (L && L.sl === ref.sl && L.e && L.e[ref.i] != null && showL(st, L, ref.i, lb)) return; continue; }
    const grp = ref.mk === 'C' ? st.CUP : ref.mk === 'E' ? st.CONT : st.INTL;
    const r = pickRow(grp && grp[ref.sk]); if (r) { showRow(st, r); return; }
  }
  U.toast('이 경기의 상세 기록을 찾을 수 없습니다.');
};
// 경기 한 줄: 홈 · 점수(또는 예정) · 원정. 줄을 누르면 경기 상세
U.matchLine = function (s, x, mine) {
  const w = s.w;
  const team = (id, right) => x.nat ? h('span', { class: 'cc' + (right ? '' : ' rj') }, U.natCrest(id, 16), h('span', null, C.natName(id))) : h('span', { class: 'cc' + (right ? '' : ' rj') }, crest(w.clubs[id] || null, 16), h('span', null, (w.clubs[id] || {}).name || ''));
  if (x.tbd) return h('div', { class: 'daym pend' }, h('span', { class: 'mute', style: { gridColumn: '1 / -1', textAlign: 'center', fontSize: '12px' } }, `${x.stage} · 대진 추첨 예정`));
  const fol = mine != null ? mine : U.isFollowMatch(x, s);
  return h('div', { class: 'daym' + (x.pend ? ' pend' : ' click') + (fol ? ' fol' : ''), title: x.pend ? '예정된 경기' : '눌러서 경기 상세', onclick: x.pend || !x.ref ? null : () => U.openMatchRef(x.ref, mTitle(s, x)) },
    team(x.a, false), h('span', { class: 'sc' }, x.pend ? 'vs' : `${x.ga} - ${x.gb}`, x.pw ? h('small', { class: 'mute' }, ' PK') : null), team(x.b, true));
};
function mTitle(s, x) { if (x.k === 'L') return null; const w = s.w; const cn = x.k === 'L' ? (w.lg[x.comp] || {}).name : x.name || COMPN(x.comp); return `${cn || ''} · ${x.stage || ''}${x.ref && x.ref.d != null ? ' · ' + C.fmtDateY(x.ref.d) : ''}`; }
U.mTitle = mTitle;
U.COMPN = COMPN; U.COMPSH = COMPSH;

// ---------- 큰 대회 연출: 월드컵·유로 등 국제 대회 기간, 챔피언스리그 경기 주간 ----------
function activeIntl(s) {
  const w = s.w, d = w.cal.d; let best = null;
  const PRI = { WC: 0, EURO: 1, COPA: 2, ASIA: 3, AFCON: 4, GOLD: 5 };
  for (const k in w.cal.intl) { const T = w.cal.intl[k]; if (d >= T.dates[0] - 10 && d <= T.dates[T.dates.length - 1] + 1 && (!best || PRI[T.k] < PRI[best.k])) best = T; }
  return best;
}
function activeUCL(s) {
  const w = s.w, d = w.cal.d;
  for (const k in w.cal.cont) { const cs = w.cal.cont[k]; if (cs.k !== 'UCL') continue; if (cs.dates.some(x => x >= d - 1 && x <= d + 2)) return cs; }
  return null;
}
function topScorers(s, agg, nat, n = 5) {
  const w = s.w, l = [];
  for (const pid in agg || {}) { const a = agg[pid]; if (a[4] > 0) l.push([pid, a[4], a[5], a[1], a[0]]); }
  l.sort((x, z) => z[1] - x[1] || z[2] - x[2] || x[3] - z[3]);
  return l.slice(0, n).map(([pid, g, as, ap, t]) => h('div', { class: 'hsc' }, h('span', { class: 'lnk', onclick: () => pid !== 'ME' && pid[0] !== '~' ? U.openPlayer(pid) : U.setTab('profile') }, pid === 'ME' ? `${s.p.name} (나)` : C.MD.nameOf(pid)), h('span', { class: 'mute' }, nat ? C.natName(t) : (w.clubs[C.cidOf(w, t)] || {}).short || ''), h('b', null, `${g}골`), h('span', { class: 'mute' }, `${as}도움`)));
}
U.tourHero = function (s, compact) {
  const w = s.w; if (!w.cal) return null;
  const d = w.cal.d, out = [];
  const T = activeIntl(s);
  if (T) {
    const h_ = w.cal.h[T.key] || {}, gDone = T.fx.every(f => f.done), last = T.dates[T.dates.length - 1];
    const today = C.calDayMatches(s, d).filter(x => x.k === 'I' && x.comp === T.k);
    const nextD = T.dates.find(x => x > d);
    const phase = d < T.dates[0] ? `개막까지 D-${T.dates[0] - d}` : !gDone ? `조별리그 · ${T.fx.filter(f => f.done).length}/${T.fx.length}경기` : T.ko.length ? `${(T.ko[T.ko.length - 1] || {}).n || '토너먼트'} 진행` : '토너먼트';
    const fin = last - d;
    const hero = h('div', { class: 'thero wc' + (T.k === 'WC' ? '' : ' alt') },
      h('div', { class: 'hrow' }, h('div', null, h('div', { class: 'hk' }, T.k === 'WC' ? 'FIFA WORLD CUP' : T.n), h('div', { class: 'ht' }, `${T.n} ${T.y}`), h('div', { class: 'hs' }, `${phase}${fin > 0 && d >= T.dates[0] ? ` · 결승까지 D-${fin}` : fin === 0 ? ' · 오늘 결승!' : ''}`)),
        h('div', { class: 'hn' }, h('b', null, T.size), h('span', null, '개국'))));
    if (!compact) {
      if (today.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, '오늘 경기'), h('div', { class: 'hgrid' }, ...today.map(x => hcard(s, x)))));
      else if (nextD) { const nx = C.calDayFixtures(s, nextD).filter(x => x.k === 'I' && x.comp === T.k); if (nx.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, `다음 경기 · ${dstr(nextD)}`), h('div', { class: 'hgrid' }, ...nx.slice(0, 8).map(x => hcard(s, x))))); }
      if (!gDone || !T.ko.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, '조별 순위'), h('div', { class: 'hgroups' }, ...T.g.map(g => groupMini(s, T, g)))));
      if (T.ko.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, '토너먼트'), h('div', { class: 'hko' }, ...T.ko.map(r => h('div', { class: 'hkr' }, h('div', { class: 'lbl' }, r.n), ...r.m.map(m => h('div', { class: 'hkm' }, h('span', { class: m[4] === m[0] || (!m[4] && m[2] > m[3]) ? 'w' : '' }, U.natCrest(m[0], 14), C.natName(m[0])), h('b', null, `${m[2]}-${m[3]}${m[4] ? ' PK' : ''}`), h('span', { class: m[4] === m[1] || (!m[4] && m[3] > m[2]) ? 'w' : '' }, U.natCrest(m[1], 14), C.natName(m[1])))))))));
      const ts = topScorers(s, h_.agg, true);
      if (ts.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, '득점 레이스'), h('div', { class: 'hscs' }, ...ts)));
    }
    out.push(hero);
  }
  const cs = activeUCL(s);
  if (cs) {
    const h_ = w.cal.h[cs.key] || {}, md = cs.dates.find(x => x >= d - 1 && x <= d + 2), i = cs.dates.indexOf(md);
    const stage = i < 0 ? '' : i < cs.phaseN ? `리그 페이즈 ${i + 1}차전` : (() => { const [ri, leg] = cs.kmap[i - cs.phaseN]; const r = cs.rounds[ri]; return r[2] + (r[1] ? (leg ? ' 2차전' : ' 1차전') : ''); })();
    const rd = md != null && md <= d ? md : null, tonight = rd != null ? C.calDayMatches(s, rd).filter(x => x.k === 'E' && x.comp === 'UCL') : [];
    const hero = h('div', { class: 'thero ucl' }, h('div', { class: 'hrow' }, h('div', null, h('div', { class: 'hk' }, 'CHAMPIONS LEAGUE NIGHT'), h('div', { class: 'ht' }, `${cs.name} ${cs.label}`), h('div', { class: 'hs' }, tonight.length ? `${rd === d ? '오늘 밤' : '어젯밤'} · ${tonight[0].stage}` : md != null ? `${stage} · ${md === d ? '오늘' : md - d === 1 ? '내일' : `D-${md - d}`} (${dstr(md)})` : '')), h('div', { class: 'hn' }, h('b', null, '★'), h('span', null, cs.teams.length + '팀'))));
    if (!compact) {
      if (tonight.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, rd === d ? '오늘 밤 결과' : '어젯밤 결과'), h('div', { class: 'hgrid' }, ...tonight.map(x => hcard(s, x)))));
      else if (md != null) { const nx = C.calDayFixtures(s, md).filter(x => x.k === 'E' && x.comp === 'UCL'); if (nx.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, `${stage} 대진`), h('div', { class: 'hgrid' }, ...nx.map(x => hcard(s, x))))); }
      if (!cs.phaseDone && cs.phaseN) { const t = C.sortTable(cs.table);
        hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, '리그 페이즈 순위 (1~8위 16강 직행 · 9~24위 플레이오프)'), h('div', { class: 'hlt' }, ...t.slice(0, 12).map((r, k) => h('div', { class: 'hl' + (k < 8 ? ' q' : '') }, h('span', { class: 'mute' }, k + 1), h('span', { class: 'cc lnk', onclick: () => U.openClub(r.id) }, crest(w.clubs[r.id], 14), h('span', null, w.clubs[r.id].name)), h('span', { class: 'mute' }, `${r.p}경기`), h('b', null, r.pts)))))); }
      const ts = topScorers(s, h_.agg, false);
      if (ts.length) hero.append(h('div', { class: 'hsec' }, h('div', { class: 'lbl' }, '득점 레이스'), h('div', { class: 'hscs' }, ...ts)));
    }
    out.push(hero);
  }
  return out.length ? h('div', { style: { display: 'grid', gap: '12px' } }, ...out) : null;
};
function hcard(s, x) {
  const w = s.w;
  const t = (id) => x.nat ? h('div', { class: 'ht2' }, U.natCrest(id, 26), h('span', null, C.natName(id))) : h('div', { class: 'ht2' }, crest(w.clubs[id] || null, 26), h('span', null, (w.clubs[id] || {}).name || ''));
  if (x.tbd) return h('div', { class: 'hcard pend' }, h('span', { class: 'mute' }, `${x.stage} 추첨 예정`));
  return h('div', { class: 'hcard' + (x.pend ? ' pend' : ' click'), onclick: x.pend || !x.ref ? null : () => U.openMatchRef(x.ref, mTitle(s, x)) }, t(x.a), h('div', { class: 'hsc2' }, x.pend ? 'vs' : `${x.ga} : ${x.gb}`, x.pw ? h('small', null, 'PK') : null, h('div', { class: 'mute', style: { fontSize: '10px' } }, x.stage || '')), t(x.b));
}
function groupMini(s, T, g) {
  const tb = {}; for (const n of g.t) tb[n] = { id: n, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  for (const m of g.m) { const [a, b, ga, gb] = m, A = tb[a], B = tb[b]; if (!A || !B) continue; A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga; if (ga > gb) { A.w++; A.pts += 3; B.l++; } else if (gb > ga) { B.w++; B.pts += 3; A.l++; } else { A.d++; B.d++; A.pts++; B.pts++; } }
  const rows = C.sortTable(tb);
  return h('div', { class: 'hgrp' }, h('div', { class: 'lbl' }, `${g.n}조`), ...rows.map((r, i) => h('div', { class: 'hgr' + (i < 2 ? ' q' : '') }, h('span', { class: 'cc' }, U.natCrest(r.id, 12), h('span', null, C.natName(r.id))), h('span', { class: 'mute' }, r.p), h('b', null, r.pts))));
}

// ---------- 뉴스 탭 ----------
const CAT = { result: ['경기', 'c-res'], thriller: ['난타전', 'c-thr'], rout: ['대승', 'c-thr'], upset: ['이변', 'c-ups'], hat: ['해트트릭', 'c-hat'], record: ['기록', 'c-rec'], champ: ['우승', 'c-chp'], sack: ['감독', 'c-sack'], transfer: ['이적', 'c-tx'], rumor: ['루머', 'c-rum'], interview: ['인터뷰', 'c-int'], gossip: ['가십', 'c-gos'], award: ['시상', 'c-chp'], retire: ['은퇴', 'c-res'], stat: ['기록', 'c-rec'], streak: ['연승·연패', 'c-ups'], injury: ['부상', 'c-sack'], club: ['구단', 'c-tx'] , draw: ['추첨', 'c-rec']};
const FILT = [['all', '전체'], ['match', '경기', ['result', 'thriller', 'rout', 'upset', 'hat']], ['tx', '이적·은퇴', ['transfer', 'rumor', 'retire']], ['record', '기록·우승·추첨', ['record', 'champ', 'award', 'stat', 'streak', 'draw']], ['inj', '부상', ['injury']], ['talk', '인터뷰·가십', ['interview', 'gossip']], ['sack', '감독·구단', ['sack', 'club']]];
function newsItem(s, n, big) {
  const w = s.w, cat = CAT[n.c] || ['뉴스', ''];
  const lead = (n.cl || []).find(id => w.clubs[id]), ln = (n.n || [])[0];
  const open = () => { if (n.drw && U.openDraw) U.openDraw(n.drw); else if (n.ref) U.openMatchRef(n.ref); else if (n.p && n.p[0]) U.openPlayer(n.p[0]); else if (lead) U.openClub(lead); else if (ln) U.openNat(ln); };
  return h('div', { class: 'nitem' + (big ? ' big' : '') + (n.imp >= 3 ? ' hot' : ''), onclick: open },
    h('div', { class: 'nic' }, lead ? crest(w.clubs[lead], big ? 40 : 26) : ln ? U.natCrest(ln, big ? 40 : 26) : h('span', { class: 'ndot ' + cat[1] })),
    h('div', { style: { minWidth: 0 } }, h('div', { class: 'nmeta' }, h('span', { class: 'ncat ' + cat[1] }, cat[0]), h('span', { class: 'mute' }, C.fmtDate(n.d)), n.imp >= 3 ? h('span', { class: 'nhot' }, '주요') : null),
      h('div', { class: 'nh' }, n.h), n.s ? h('div', { class: 'ns mute' }, n.s) : null));
}
U.pages.news = function () {
  const s = S(), w = s.w, v = (U.st.nv = U.st.nv || { f: 'fol', c: 'all', n: 60 });
  const root = h('div', { class: 'wrap prof screen' });
  const all = (w.news || []).slice().reverse();
  const fol = v.f === 'fol';
  const cf = FILT.find(x => x[0] === v.c) || FILT[0];
  const list = all.filter(n => (!fol || U.isFollowNews(n, s)) && (!cf[2] || cf[2].includes(n.c)));
  root.append(U.pageHead('뉴스', '경기·이적·기록·인터뷰·가십 · 팔로우한 리그·대회·팀·선수 소식이 먼저'));
  root.append(h('div', { class: 'nfbar' },
    h('div', { class: 'seg', style: { maxWidth: '240px' } }, h('button', { class: fol ? 'on' : '', onclick: () => { v.f = 'fol'; v.n = 60; U.stay(); } }, '팔로우'), h('button', { class: !fol ? 'on' : '', onclick: () => { v.f = 'all'; v.n = 60; U.stay(); } }, '전체')),
    h('div', { class: 'chg' }, ...FILT.map(([k, l]) => h('button', { class: 'chip' + (v.c === k ? ' gold' : ''), style: { cursor: 'pointer', border: 0 }, onclick: () => { v.c = k; v.n = 60; U.stay(); } }, l)))));
  if (!all.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 뉴스가 없습니다. 날짜를 진행하면 경기·이적·기록 소식이 쌓입니다.'))); root.append(U.followManager(s)); return root; }
  // 헤드라인: 최근 7일 중 가장 큰 소식
  const today = w.cal ? w.cal.d : 0;
  const top = list.filter(n => n.d >= today - 7).sort((a, b) => b.imp - a.imp || b.id - a.id)[0];
  if (top && v.c === 'all') root.append(h('div', { class: 'sec' }, h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '6px' } }, '헤드라인'), newsItem(s, top, true))));
  if (!list.length) root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, fol ? '팔로우한 리그·구단·선수의 소식이 없습니다. [전체]를 누르거나 아래에서 팔로우를 추가하세요.' : '해당하는 소식이 없습니다.')));
  const shown = list.slice(0, v.n), groups = [];
  for (const n of shown) { const g = groups[groups.length - 1]; if (g && g.d === n.d) g.l.push(n); else groups.push({ d: n.d, l: [n] }); }
  for (const g of groups) root.append(h('div', { class: 'sec' }, h('h3', null, dstr(g.d), h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${g.l.length}건`)), h('div', { class: 'in nlist' }, ...g.l.map(n => newsItem(s, n)))));
  if (list.length > v.n) root.append(h('div', { style: { textAlign: 'center' } }, h('button', { class: 'btn ghost', onclick: () => { v.n += 60; U.stay(); } }, `더 보기 (${list.length - v.n}건 남음)`)));
  root.append(U.followManager(s));
  return root;
};
// 다른 화면에 넣는 짧은 뉴스 목록
U.newsMini = function (s, n = 6) {
  const w = s.w, all = (w.news || []).slice().reverse();
  let l = all.filter(x => U.isFollowNews(x, s)).slice(0, n); if (l.length < 3) l = all.slice(0, n);
  if (!l.length) return null;
  return h('div', { class: 'sec' }, h('h3', null, '최신 뉴스', h('button', { class: 'btn ghost sm', style: { marginLeft: '8px' }, onclick: () => U.setTab('news') }, '뉴스 전체')), h('div', { class: 'in nlist' }, ...l.map(x => newsItem(s, x))));
};
})(window);
