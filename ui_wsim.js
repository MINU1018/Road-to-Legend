// Road to Legend — 관전 모드: 경기일 단위로 진행하거나 달력에서 날짜를 눌러 그날까지 진행하며 오늘 경기·순위·일정·이적시장을 본다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, GM = G.TCG;
const { h, crest, flag } = U;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let running = false, stopReq = false;
const BIGLG = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BRA', 'ARG', 'KOR', 'JPN', 'USA', 'KSA', 'TUR', 'BEL', 'SCO'];
const DOW = '일월화수목금토';
const dstr = d => `${C.fmtDateY(d)} (${DOW[C.toDate(d).getUTCDay()]})`;

function clubChip(w, id, size = 18) { const c = w.clubs[id]; if (!c) return h('span', { class: 'mute' }, '-'); return h('span', { class: 'cc lnk', onclick: () => U.openClub(id) }, crest(c, size), h('span', null, c.name)); }
function pLink(n, pid) { return pid ? h('span', { class: 'lnk', onclick: () => U.openPlayer(pid) }, n) : h('span', null, n); }
const v = () => (U.st.wsv = U.st.wsv || { lg: null, day: null });

// 진행: toDay(포함)까지. 화면 위쪽 진행 막대만 갱신하고 끝나면 다시 그린다
async function runTo(toDay, label) {
  if (running) return; running = true; stopReq = false;
  const s = U.S(), w = s.w, d0 = w.cal.d, span = Math.max(1, toDay - d0);
  U.render();
  const bar = document.querySelector('#wsProg i'), txt = document.querySelector('#wsTxt');
  let last = 0;
  try {
    await GM.worldRun(s, toDay, async d => {
      U.txTick(s, d, document.querySelector('#wsTick'));
      const t = Date.now();
      if (t - last > 80) { last = t; if (bar) bar.style.width = Math.min(100, (d - d0) / span * 100) + '%'; if (txt) txt.textContent = `${label} · ${C.fmtDateY(d)} 진행 중…`; await sleep(0); }
    }, () => stopReq);
  } catch (e) { console.error(e); U.toast('시뮬레이션 중 오류가 났습니다.'); }
  running = false; v().day = null; v().calM = null;
  await U.saveNow(); U.render();
}
// 다음 경기일: 팔로우한 리그·대회·구단·선수·대표팀 경기가 있는 다음 날 (없으면 경기가 있는 다음 날)
function nextMatchDay(s) {
  const w = s.w, t = w.cal.d;
  for (let d = t + 1; d <= t + 120; d++) { if (!w.cal.ix[d]) continue; if (C.calDayFixtures(s, d).some(x => U.isFollowMatch(x, s))) return d; }
  for (let d = t + 1; d <= t + 200; d++) if (w.cal.ix[d] && w.cal.ix[d].length) return d;
  return t + 1;
}
// 한 달 동안 팔로우한 경기 (지난날은 결과, 앞날은 대진)
function monthFollow(s, days, today) {
  const out = {};
  for (const x of days) { const l = (x.d <= today ? C.calDayMatches(s, x.d) : C.calDayFixtures(s, x.d)).filter(m => U.isFollowMatch(m, s)); if (l.length) out[x.d] = l; }
  return out;
}
function worldCal(s, sv, today) {
  const w = s.w;
  if (!sv.calM || sv.calT !== today) { const [y, m] = C.ymd(sv.day != null && sv.calT === today ? sv.day : today); sv.calM = [y, m]; sv.calT = today; }
  const [y, m] = sv.calM;
  const days = C.calMonth(s, y, m, nat => BIGLG.includes(nat));
  const F = U.fset(), MF = monthFollow(s, days, today);
  const cell = x => {
    const out = [], l = MF[x.d] || [];
    // 팔로우한 구단·대표팀 (엠블럼), 팔로우한 리그 (점)
    const teams = []; for (const mm of l) for (const id of [mm.a, mm.b]) if (id && (mm.nat ? F.nat.has(id) : F.club.has(id)) && !teams.some(t => t[0] === id)) teams.push([id, mm.nat, mm]);
    if (teams.length) out.push(h('span', { class: 'fx' }, ...teams.slice(0, 3).map(([id, nat, mm]) => nat ? U.natCrest(id, 12) : crest(w.clubs[id], 12)), teams.length === 1 && !teams[0][2].pend ? h('span', { class: 'sc' }, `${teams[0][2].ga}-${teams[0][2].gb}`) : null));
    const lgs = [...new Set(l.filter(mm => mm.k === 'L' && F.lg.has(mm.comp)).map(mm => mm.comp))];
    if (lgs.length) out.push(h('span', { class: 'dots' }, ...lgs.slice(0, 6).map(id => h('i', { class: x.d > today ? 'p' : '', title: w.lg[id].name }))));
    const e = l.find(mm => mm.k === 'E');
    if (e) out.push(h('span', { class: 'mk e' }, U.COMPSH(e.comp)));
    const it = l.find(mm => mm.k === 'I'), am = l.find(mm => mm.k === 'A');
    if (it) out.push(h('span', { class: 'mk i' }, U.COMPSH(it.comp)));
    else if (am) out.push(h('span', { class: 'mk i' }, am.comp === 'UNL' ? 'UNL' : 'A매치'));
    else if (x.it && !l.length) out.push(h('span', { class: 'mk i dim' }, x.it.replace(/^FIFA |^UEFA |^AFC |^CAF |^CONCACAF /, '').split(' ')[0]));
    if (!l.length && x.L.length) out.push(h('span', { class: 'dots' }, h('i', { class: 'o', title: '팔로우하지 않은 리그 경기' })));
    const bg = U.calBig(s, x); if (bg) out.push(h('span', { class: 'mk tx' }, `이적 ${bg.length}`));
    return out;
  };
  const tip = x => { const t = U.calTip(s, x); for (const mm of (MF[x.d] || []).slice(0, 8)) t.unshift(mm.tbd ? `★ ${mm.name} ${mm.stage} (추첨 예정)` : `★ ${mm.nat ? C.natName(mm.a) : (w.clubs[mm.a] || {}).name} ${mm.pend ? 'vs' : `${mm.ga}-${mm.gb}`} ${mm.nat ? C.natName(mm.b) : (w.clubs[mm.b] || {}).name}`); const bg = U.calBig(s, x); if (bg) t.push('빅딜: ' + bg.slice(0, 3).map(r => `${C.MD.nameOf(r[0])} → ${(w.clubs[r[2]] || {}).name || ''}${r[4] ? ' ' + C.fmtEUR(r[4] * 1e4) : ''}`).join(', ')); if (x.d <= today) t.push('누르면 이날 경기 보기'); return t; };
  return U.calGrid({ y, m, days, today, sel: sv.day, cell, tip,
    canPick: () => !running,
    pick: d => { if (d > today) runTo(d, `${C.fmtDate(d)}까지`); else { sv.day = d; U.stay(); } },
    nav: dl => { if (!dl) { const [a, b] = C.ymd(today); sv.calM = [a, b]; } else { let mm = m + dl, yy = y; if (mm > 12) { mm = 1; yy++; } if (mm < 1) { mm = 12; yy--; } sv.calM = [yy, mm]; } U.stay(); },
    mark: x => (x.it && /월드컵/.test(x.it) ? 'wc' : '') + (x.E.some(e => e[0] === 'UCL') ? ' ucln' : ''),
    legend: [['today', '오늘'], ['tw', '이적시장'], ['iw', 'A매치 기간'], ['it', '국제 대회'], ['dl', '이적 마감일'], ['', '● 팔로우한 리그 경기 (○ 예정) · 엠블럼 = 팔로우한 팀']],
    hint: '앞날을 누르면 그날까지 진행, 지난날을 누르면 그날 경기' });
}

// 시작 화면: 어느 리그 개막에 맞춰 시작할지
function startScreen(s, root) {
  const w = s.w;
  const opts = [];
  for (const nat of ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'KOR', 'JPN', 'USA', 'BRA', 'ARG', 'KSA', 'POR', 'NED']) {
    const lg = Object.values(w.lg).find(l => l.nation === nat && l.tier === 1); if (!lg) continue;
    const d = GM.worldStartDay(s, lg.id);
    opts.push({ lg, d });
  }
  root.append(h('div', { class: 'sec' }, h('h3', null, '어느 리그 개막에 맞춰 시작할까요?'),
    h('div', { class: 'sub' }, `지금은 ${dstr(w.cal.d)}입니다. 유럽식 리그(8월 개막)는 곧 시작하고, K리그·MLS·브라질처럼 한 해 단위 리그는 다음 개막(2~3월)까지 세계를 먼저 진행합니다. 모든 리그는 각자의 실제 일정대로 돌아갑니다.`),
    h('div', { class: 'in wsgrid' }, h('button', { class: 'wsitem', onclick: () => { s.wStart = 1; if (!s.wStartLg) { const e = Object.values(w.lg).find(l => l.nation === 'ENG' && l.tier === 1); s.wStartLg = e && e.id; } U.follow(s); U.save(); U.render(); } }, h('div', { class: 'lbl' }, '바로 시작'), h('b', null, dstr(w.cal.d + 1))),
      ...opts.map(o => h('button', { class: 'wsitem', onclick: async () => { s.wStart = 1; s.wStartLg = o.lg.id; U.follow(s); if (o.d > w.cal.d) await runTo(o.d, `${o.lg.name} 개막 전까지`); else { U.save(); U.render(); } } }, h('div', { class: 'lbl' }, h('span', { class: 'cc' }, flag(o.lg.nation, 16), o.lg.name)), h('b', null, `${C.fmtDateY(o.d + 1)} 개막`))))));
}

U.pages.wsim = function () {
  const s = U.S(), w = s.w;
  const root = h('div', { class: 'wrap prof screen' });
  if (!w.cal) C.calInit(s);
  const today = w.cal.d;
  const inWin = w.cal.win && today >= w.cal.win.d0 && today <= w.cal.win.d1;
  const nmd = s.wStart ? nextMatchDay(s) : null;
  root.append(h('div', { class: 'sec wshead' }, h('div', { class: 'in' },
    h('div', null, h('div', { class: 'lbl' }, `관전 모드 · ${C.wLabel(w.year)} 시즌 (8월 1일 기준)`), h('h2', { style: { margin: '2px 0 0' } }, dstr(today)),
      h('div', { class: 'chg', style: { marginTop: '6px' } }, inWin ? h('span', { class: 'chip good' }, `${w.cal.win.kind === 'summer' ? '여름' : '겨울'} 이적시장 ~ ${C.fmtDate(w.cal.win.d1)}`) : null, C.intlBlocked(today) ? h('span', { class: 'chip blue' }, 'A매치 기간') : null, h('span', { class: 'mute', style: { fontSize: '12px' } }, `지금까지 ${(s.ws || []).length}시즌 마감`))),
    s.wStart && !running ? h('div', { class: 'nextbtn' }, h('button', { class: 'btn', onclick: () => runTo(nmd, '다음 경기일') }, `다음 경기일 ▸  ${dstr(nmd)}`)) : null,
    s.wStart && !running ? worldCal(s, v(), today) : null,
    running ? h('div', { style: { display: 'grid', gap: '6px' } }, h('div', { class: 'prog', id: 'wsProg' }, h('i')), h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } }, h('span', { class: 'mute', id: 'wsTxt', style: { fontSize: '13px' } }, '진행 중…'), h('button', { class: 'btn ghost sm', onclick: e => { stopReq = true; e.currentTarget.disabled = true; e.currentTarget.textContent = '멈추는 중…'; } }, '멈춤')), h('div', { class: 'txtick', id: 'wsTick', style: { display: 'none' } })) : null)));
  if (!s.wStart) { startScreen(s, root); return root; }
  // 하루 경기 (기본: 마지막으로 진행한 날)
  const sv = v();
  let day = sv.day != null ? sv.day : today;
  // 큰 대회 기간 (월드컵·유로·챔스 나이트)
  { const hero = U.tourHero(s); if (hero) root.append(hero); }
  // 이적시장 타임라인 (기간 중에는 맨 위)
  const tpan = U.txPanel(s, { sel: sv.txSel, onSel: d => { sv.txSel = d; U.stay(); } });
  if (tpan && C.txWindowAt(today)) root.append(tpan);
  const fut = day > today;
  let list = fut ? C.calDayFixtures(s, day) : C.calDayMatches(s, day);
  if (sv.day == null && !list.some(x => U.isFollowMatch(x, s))) { for (let k = 1; k <= 14; k++) { const l2 = C.calDayMatches(s, today - k); if (l2.some(x => U.isFollowMatch(x, s))) { list = l2; day = today - k; break; } } }
  const major = x => x.k !== 'L' || (w.lg[x.comp] && w.lg[x.comp].tier === 1 && BIGLG.includes(w.lg[x.comp].nation));
  const mode = sv.mm || 'fol'; // fol: 팔로우, major: 주요, all: 전체
  const groups = {};
  for (const x of list) {
    const fol = U.isFollowMatch(x, s);
    if (mode === 'fol' && !fol) continue; if (mode === 'major' && !fol && !major(x)) continue;
    const key = x.k === 'L' ? x.comp : x.k + ':' + x.comp + ':' + (x.k === 'E' || x.k === 'C' ? x.stage : ''); (groups[key] = groups[key] || { x, ms: [], fol: false }).ms.push(x); if (fol) groups[key].fol = true;
  }
  const gname = g => g.x.k === 'L' ? `${w.lg[g.x.comp].name} · ${g.x.stage || ''}` : `${g.x.name}${g.x.k === 'I' || g.x.k === 'A' ? '' : ' · ' + g.x.stage}`;
  const gflag = g => g.x.k === 'L' ? flag(w.lg[g.x.comp].nation, 16) : g.x.k === 'C' ? flag(g.x.comp.split(':')[0], 16) : null;
  const rank = g => (g.fol ? 0 : 100) + (g.x.k === 'I' ? 0 : g.x.k === 'E' ? (g.x.comp === 'UCL' ? 1 : 2) : g.x.k === 'A' ? 3 : g.x.k === 'L' ? 10 + Math.max(0, BIGLG.indexOf(w.lg[g.x.comp].nation)) : 40);
  const order = Object.values(groups).sort((a, b) => rank(a) - rank(b));
  const nAll = list.length, nF = list.filter(x => U.isFollowMatch(x, s)).length;
  const segB = (k, l) => h('button', { class: mode === k ? 'on' : '', onclick: () => { sv.mm = k; U.stay(); } }, l);
  root.append(h('div', { class: 'sec' }, h('h3', null, `${dstr(day)} ${fut ? '경기 일정' : '경기'}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 팔로우 ${nF} · 전체 ${nAll}경기${fut ? ' · 예정' : ''}`)),
    h('div', { class: 'in', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
      h('button', { class: 'btn ghost sm', onclick: () => { sv.day = day - 1; U.stay(); } }, '◂ 전날'), h('button', { class: 'btn ghost sm', onclick: () => { sv.day = day + 1; U.stay(); } }, '다음날 ▸'),
      day !== today ? h('button', { class: 'btn ghost sm', onclick: () => { sv.day = today; U.stay(); } }, '오늘') : null,
      h('div', { class: 'seg', style: { marginLeft: 'auto' } }, segB('fol', '팔로우'), segB('major', '주요'), segB('all', '전체'))),
    order.length ? h('div', { class: 'in calgrid' }, ...order.slice(0, mode === 'all' ? 80 : 40).map(g => h('div', { class: 'wsitem' + (g.fol ? ' fol' : ''), style: { display: 'block' } }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, h('span', { class: 'cc' }, gflag(g), gname(g))),
      ...(g.fol || mode !== 'all' ? g.ms : g.ms.slice(0, 20)).map(x => U.matchLine(s, x))))) : h('div', { class: 'in empty' }, nAll ? (mode === 'fol' ? '팔로우한 경기가 없는 날입니다. [주요]·[전체]로 다른 경기를 볼 수 있습니다.' : '해당하는 경기가 없습니다.') : fut ? '이날은 정해진 경기가 없습니다.' : '이날은 경기가 없습니다.')));
  // 리그 순위 (진행 중)
  const lgs = Object.values(w.lg).filter(l => l.tier === 1 && BIGLG.includes(l.nation)).sort((a, b) => BIGLG.indexOf(a.nation) - BIGLG.indexOf(b.nation));
  if (!sv.lg || !w.lg[sv.lg]) sv.lg = lgs[0] && lgs[0].id;
  const L = sv.lg && C.liveLeague(s, sv.lg);
  const LS = sv.lg && w.cal.lg[sv.lg];
  root.append(h('div', { class: 'sec' }, h('h3', null, '리그 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, LS ? ` ${LS.label} · ${LS.ri}/${LS.dates.length}라운드${LS.ri === 0 ? ` · ${C.fmtDateY(LS.dates[0])} 개막` : ''}` : '')),
    h('div', { class: 'in', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, ...lgs.map(l => h('button', { class: 'chip' + (l.id === sv.lg ? ' gold' : ''), style: { cursor: 'pointer', border: 0 }, onclick: () => { sv.lg = l.id; U.stay(); } }, l.name))),
    L ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득실', '승점'].map(x => h('th', null, x)))),
      h('tbody', null, ...L.t.slice(0, 10).map((r, i) => h('tr', null, h('td', null, i + 1), h('td', null, clubChip(w, r[0], 16)), h('td', null, r[1]), h('td', null, r[2]), h('td', null, r[3]), h('td', null, r[4]), h('td', null, `${r[5]}:${r[6]}`), h('td', null, h('b', null, r[7]))))))) : h('div', { class: 'in empty' }, '이 리그는 지금 시즌 사이 휴식기입니다.'),
    L && L.sc && L.sc.length ? h('div', { class: 'in mute', style: { fontSize: '12px' } }, '득점 선두: ', ...L.sc.slice(0, 3).map((x, i) => h('span', null, i ? ' · ' : '', pLink(x[0], x[5]), ` ${x[2]}골`))) : null,
    h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => { U.st.wv = Object.assign(U.st.wv || {}, { mode: 'league', nat: w.lg[sv.lg].nation, lg: sv.lg, season: 'live' }); U.setTab('table'); } }, '전체 순위·기록 보기'))));
  // 다가오는 일정
  const up = C.calUpcoming(s, today + 1, 75).filter(e => e.k !== 'lg' || BIGLG.slice(0, 12).includes(e.nat)).slice(0, 10);
  if (up.length) root.append(h('div', { class: 'sec' }, h('h3', null, '다가오는 일정'), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...up.map(e => h('div', { class: 'uprow', style: { gridTemplateColumns: '110px 1fr auto' } }, h('span', { class: 'mute' }, C.fmtDateY(e.d)), h('span', null, e.nat ? flag(e.nat, 14) : null, ' ', e.t, e.d2 ? h('span', { class: 'mute' }, ` (~${C.fmtDate(e.d2)})`) : null), h('span', { class: 'mute', style: { fontSize: '11px' } }, e.d <= today ? '진행 중' : `${e.d - today}일 뒤`))))));
  if (tpan && !C.txWindowAt(today)) root.append(tpan);
  { const nm = U.newsMini(s); if (nm) root.append(nm); }
  root.append(U.followManager(s));
  const ws = s.ws || [];
  if (!ws.length) return root;
  const r = ws[ws.length - 1];
  // 지난 시즌 요약
  const tl = Object.keys(r.champs).map(id => w.lg[id]).filter(Boolean).filter(l => BIGLG.includes(l.nation)).sort((a, b) => BIGLG.indexOf(a.nation) - BIGLG.indexOf(b.nation));
  root.append(h('div', { class: 'sec' }, h('h3', null, `${r.label} 시즌 결과`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' (8월~7월에 끝난 대회)')), h('div', { class: 'in wsgrid' },
    ...Object.entries(r.cont).filter(([k, x]) => x).map(([k, x]) => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, C.COMPS[k] ? C.COMPS[k].name : k), clubChip(w, x, 22))),
    ...(r.intl || []).map(t => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, `${t[1]} ${t[4] || ''}`), h('span', { class: 'cc' }, U.natCrest(t[2], 20), h('span', null, C.natName(t[2]))))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, `발롱도르 ${r.y + 1}`), h('div', { class: 'in bdlist' }, ...r.bd.slice(0, 10).map((x, i) => h('div', null, h('span', { class: 'mute' }, i + 1), h('span', null, pLink(x[0], x[2]), x[4] ? h('span', { class: 'mute', style: { fontSize: '11px' } }, ` ${x[4]}`) : null), h('span', { class: 'mute', style: { fontSize: '11px' } }, (w.clubs[x[1]] || {}).name || ''))))));
  if (r.gb && r.gb.length) root.append(h('div', { class: 'sec' }, h('h3', null, `골든보이 ${r.y + 1}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 21세 이하 · 포텐셜과 지난 1년 성적')), h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...r.gb.map((x, i) => h('div', { class: 'gbrow' }, h('span', { class: i ? 'mute' : '', style: i ? null : { color: 'var(--gold)', fontWeight: 800 } }, i + 1),
    h('span', { style: { minWidth: 0 } }, pLink(x[0], x[2]), h('span', { class: 'mute', style: { fontSize: '11px' } }, ` ${x[4]} · ${x[5]}세 · ${(w.clubs[x[1]] || {}).name || ''}`), h('div', { class: 'mute', style: { fontSize: '11px' } }, `클럽 ${x[7]}경기 ${x[8]}골 ${x[9]}도움 · 평점 ${x[10] ? x[10].toFixed(2) : '-'}${x[12] ? ` · 국제 대회 ${x[12]}경기 ${x[13]}골 ${x[14]}도움` : ''}`)),
    h('span', { class: 'mute', style: { fontSize: '12px', textAlign: 'right' } }, `OVR ${x[3]}`, h('br'), `POT ${x[6]}`))))));
  if (r.gs && r.gs.length) root.append(h('div', { class: 'sec' }, h('h3', null, `유러피언 골든슈 ${r.label}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 리그 골 × 계수 (빅5 2.0 · 그 밖 1.5)')), h('div', { class: 'in bdlist' }, ...r.gs.map((x, i) => h('div', null, h('span', { class: 'mute' }, i + 1), h('span', null, pLink(x[0], x[2]), h('span', { class: 'mute', style: { fontSize: '11px' } }, ` ${x[3]}골 · ${x[4]}점`)), h('span', { class: 'mute', style: { fontSize: '11px' } }, (w.lg[x[5]] || {}).name || ''))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '주요 리그 우승·득점왕'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '560px' } },
    h('thead', null, h('tr', null, ...['리그', '시즌', '우승', '득점왕'].map(x => h('th', null, x)))),
    h('tbody', null, ...tl.map(l => { const b = r.boots[l.id]; const A = w.arch[r.label] && w.arch[r.label].lg[l.id]; return h('tr', null, h('td', null, h('span', { class: 'cc' }, flag(l.nation, 18), h('span', { class: 'lnk', onclick: () => { U.st.wv = Object.assign(U.st.wv || {}, { mode: 'league', nat: l.nation, lg: l.id, season: r.label }); U.setTab('table'); } }, l.name))), h('td', { class: 'mute' }, A ? A.sl || r.label : r.label), h('td', null, clubChip(w, r.champs[l.id])), h('td', null, b ? h('span', null, pLink(b[0], b[3]), h('span', { class: 'mute' }, ` ${b[2]}골`)) : '-')); }))))));
  // 역대 기록
  root.append(h('div', { class: 'sec' }, h('h3', null, '시즌별 역대 기록'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '1000px' } },
    h('thead', null, h('tr', null, ...['시즌', 'EPL', '라리가', '세리에 A', '분데스리가', 'UCL', '발롱도르', '골든보이'].map(x => h('th', null, x)))),
    h('tbody', null, ...ws.slice().reverse().map(x => {
      const lgOf = nat => Object.keys(x.champs).find(id => w.lg[id] && w.lg[id].nation === nat && w.lg[id].tier === 1);
      const cell = nat => { const id = lgOf(nat); return h('td', null, id ? clubChip(w, x.champs[id], 16) : '-'); };
      return h('tr', null, h('td', null, x.label), cell('ENG'), cell('ESP'), cell('ITA'), cell('GER'), h('td', null, x.cont.UCL ? clubChip(w, x.cont.UCL, 16) : '-'), h('td', null, x.bd[0] ? pLink(x.bd[0][0], x.bd[0][2]) : '-'), h('td', null, x.gb && x.gb[0] ? pLink(x.gb[0][0], x.gb[0][2]) : '-'));
    }))))));
  return root;
};
})(window);
