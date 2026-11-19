// Road to Legend — 관전 모드: 경기일 단위로 진행하거나 달력에서 날짜를 눌러 그날까지 진행하며 오늘 경기·순위·일정·이적시장을 본다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, GM = G.TCG;
const { h, crest, flag } = U;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let running = false, stopReq = false, runLbl = '';
const BIGLG = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BRA', 'ARG', 'KOR', 'JPN', 'USA', 'KSA', 'TUR', 'BEL', 'SCO'];
const DOW = '일월화수목금토';
const dstr = d => `${C.fmtDateY(d)} (${DOW[C.toDate(d).getUTCDay()]})`;

function clubChip(w, id, size = 18) { const c = w.clubs[id]; if (!c) return h('span', { class: 'mute' }, '-'); return h('span', { class: 'cc lnk', onclick: () => U.openClub(id) }, crest(c, size), h('span', null, c.name)); }
function pLink(n, pid) { return pid ? h('span', { class: 'lnk', onclick: () => U.openPlayer(pid) }, n) : h('span', null, n); }
const v = () => (U.st.wsv = U.st.wsv || { lg: null, day: null });

// 진행: toDay(포함)까지. 화면 위쪽 진행 막대만 갱신하고 끝나면 다시 그린다
async function runTo(toDay, label) {
  if (running) return; running = true; stopReq = false;
  const s = U.S(), w = s.w, d0 = w.cal.d;
  if (w.cer && !w.cer.seen && w.cer.d > d0 && w.cer.d < toDay) { toDay = w.cer.d; label = '발롱도르 시상식'; }
  const span = Math.max(1, toDay - d0);
  runLbl = label; U.render();
  const bar = document.querySelector('#wsProg i'), txt = document.querySelector('#wsTxt');
  // 열흘 넘게 진행하면 화면 가운데 진행 창
  const mo = span > 10 && U.progModal ? U.progModal(label, d0, toDay, () => { stopReq = true; }) : null;
  let last = 0;
  try {
    await GM.worldRun(s, toDay, async d => {
      U.txTick(s, d, mo ? mo.tick : document.querySelector('#wsTick'));
      const t = Date.now();
      if (t - last > 80) { last = t; if (bar) bar.style.width = Math.min(100, (d - d0) / span * 100) + '%'; if (txt) txt.textContent = `${label} · ${C.fmtDateY(d)} 진행 중…`; if (mo) mo.upd(d); await sleep(0); }
    }, () => stopReq);
  } catch (e) { console.error(e); U.toast('시뮬레이션 중 오류가 났습니다.'); }
  if (mo) mo.close();
  running = false; v().day = null; v().calM = null;
  await U.saveNow(); U.render();
}
// 다음 경기일: 팔로우한 리그·대회·구단·선수·대표팀 경기가 있는 다음 날 (없으면 경기가 있는 다음 날)
function nextMatchDay(s) {
  const w = s.w, t = w.cal.d;
  const cer = w.cer && !w.cer.seen && w.cer.d > t ? w.cer.d : 1e9; // 시상식 날에는 멈춘다
  const r = nextMD0(s, t); return Math.min(r, cer);
}
function nextMD0(s, t) {
  const w = s.w;
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
    if (teams.length) out.push(h('span', { class: 'cfm' }, ...teams.slice(0, 3).map(([id, nat, mm]) => nat ? U.natCrest(id, 12) : crest(w.clubs[id], 12)), teams.length === 1 && !teams[0][2].pend ? h('span', { class: 'sc' }, `${teams[0][2].ga}-${teams[0][2].gb}`) : null));
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
    pick: d => { if (d > today && s.mode === 'world') runTo(d, `${C.fmtDate(d)}까지`); else { sv.day = d; U.stay(); } },
    nav: dl => { if (!dl) { const [a, b] = C.ymd(today); sv.calM = [a, b]; } else { let mm = m + dl, yy = y; if (mm > 12) { mm = 1; yy++; } if (mm < 1) { mm = 12; yy--; } sv.calM = [yy, mm]; } U.stay(); },
    jump: (yy, mm) => { sv.calM = [yy, mm]; U.stay(); }, minY: 2026, maxY: C.ymd(today)[0] + 3,
    mark: x => (x.it && /월드컵/.test(x.it) ? 'wc' : '') + (x.E.some(e => e[0] === 'UCL') ? ' ucln' : ''),
    legend: [['today', '오늘'], ['cer', '시상식'], ['tw', '이적시장'], ['iw', 'A매치 기간'], ['it', '국제 대회'], ['dl', '이적 마감일'], ['', '● 팔로우한 리그 경기 (○ 예정) · 엠블럼 = 팔로우한 팀']],
    hint: s.mode === 'world' ? '앞날을 누르면 그날까지 진행, 지난날을 누르면 그날 경기' : '날짜를 누르면 그날 경기 (진행은 커리어 홈에서)' });
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

// ---------- 진행 막대 (어느 화면에서든 아래에 뜬다) ----------
U.wsRunBar = () => running ? h('div', { class: 'runbar' },
  h('div', { class: 'rbi' }, h('span', { id: 'wsTxt' }, `${runLbl} · 진행 중…`), h('button', { class: 'btn ghost sm', onclick: e => { stopReq = true; e.currentTarget.disabled = true; e.currentTarget.textContent = '멈추는 중…'; } }, '멈춤')),
  h('div', { class: 'prog', id: 'wsProg' }, h('i')), h('div', { class: 'txtick', id: 'wsTick', style: { display: 'none' } })) : null;
U.worldNext = () => { const s = U.S(); if (!s || s.mode !== 'world' || !s.wStart || running) return; runTo(nextMatchDay(s), '다음 경기일'); };
U.worldRunning = () => running;

// ---------- 하루 경기 ----------
function dayMatchesSec(s, sv, today, home) {
  const w = s.w;
  let day = sv.day != null ? sv.day : today;
  const fut = day > today;
  let list = fut ? C.calDayFixtures(s, day) : C.calDayMatches(s, day);
  if (sv.day == null && !list.some(x => U.isFollowMatch(x, s))) { for (let k = 1; k <= 14; k++) { const l2 = C.calDayMatches(s, today - k); if (l2.some(x => U.isFollowMatch(x, s))) { list = l2; day = today - k; break; } } }
  const major = x => x.k !== 'L' || (w.lg[x.comp] && w.lg[x.comp].tier === 1 && BIGLG.includes(w.lg[x.comp].nation));
  const mode = sv.mm || 'fol';
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
  return h('div', { class: 'sec' }, h('h3', null, `${dstr(day)} ${fut ? '경기 일정' : '경기'}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 팔로우 ${nF} · 전체 ${nAll}경기${fut ? ' · 예정' : ''}`)),
    h('div', { class: 'in', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
      h('button', { class: 'btn ghost sm', onclick: () => { sv.day = day - 1; U.stay(); } }, '◂ 전날'), h('button', { class: 'btn ghost sm', onclick: () => { sv.day = day + 1; U.stay(); } }, '다음날 ▸'),
      day !== today ? h('button', { class: 'btn ghost sm', onclick: () => { sv.day = today; U.stay(); } }, '오늘') : null,
      home ? h('button', { class: 'btn ghost sm', onclick: () => U.setTab('sched') }, '달력') : null,
      h('div', { class: 'seg', style: { marginLeft: 'auto' } }, segB('fol', '팔로우'), segB('major', '주요'), segB('all', '전체'))),
    order.length ? h('div', { class: 'in calgrid' }, ...order.slice(0, mode === 'all' ? 80 : 40).map(g => h('div', { class: 'wsitem' + (g.fol ? ' fol' : ''), style: { display: 'block' } }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, h('span', { class: 'cc' }, gflag(g), gname(g))),
      ...(g.fol || mode !== 'all' ? g.ms : g.ms.slice(0, 20)).map(x => U.matchLine(s, x))))) : h('div', { class: 'in empty' }, nAll ? (mode === 'fol' ? '팔로우한 경기가 없는 날입니다. [주요]·[전체]로 다른 경기를 볼 수 있습니다.' : '해당하는 경기가 없습니다.') : fut ? '이날은 정해진 경기가 없습니다.' : '이날은 경기가 없습니다.'));
}
U.dayMatchesSec = dayMatchesSec;
function upcomingSec(s, today) {
  const up = C.calUpcoming(s, today + 1, 75).filter(e => e.k !== 'lg' || BIGLG.slice(0, 12).includes(e.nat)).slice(0, 10);
  { const c = s.w.cer; if (c && !c.rev && c.d >= today + 1 && c.d <= today + 75) { up.push({ d: c.d, t: `🏆 ${c.y} 발롱도르 시상식`, cer: 1 }); up.sort((x, y) => x.d - y.d); while (up.length > 10) { let j = up.length - 1; if (up[j].cer) j--; up.splice(j, 1); } } }
  if (!up.length) return null;
  return h('div', { class: 'sec' }, h('h3', null, '다가오는 일정'), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...up.map(e => h('div', { class: 'uprow' + (e.cer ? ' upcer' : ''), style: { gridTemplateColumns: '110px 1fr auto' } }, h('span', { class: 'mute' }, C.fmtDateY(e.d)), h('span', null, e.t), h('span', { class: 'mute', style: { fontSize: '12px' } }, e.d - today === 0 ? '오늘' : `${e.d - today}일 뒤`)))));
}
// 이번 주 (어제 ~ 5일 뒤): 팔로우한 경기 수와 팀
function weekStrip(s, sv, today) {
  const w = s.w, F = U.fset(), cells = [];
  for (let d = today - 1; d <= today + 5; d++) {
    const l = (d <= today ? C.calDayMatches(s, d) : C.calDayFixtures(s, d)).filter(m => U.isFollowMatch(m, s));
    const teams = []; for (const m of l) for (const id of [m.a, m.b]) if (id && (m.nat ? F.nat.has(id) : F.club.has(id)) && !teams.some(t => t[0] === id)) teams.push([id, m.nat]);
    const comps = [...new Set(l.map(m => m.k === 'L' ? (w.lg[m.comp] || {}).name : U.COMPSH(m.comp)))].filter(Boolean);
    const sel = (sv.day != null ? sv.day : today) === d, isCer = w.cer && w.cer.d === d;
    cells.push(h('button', { class: 'wk' + (isCer ? ' cer' : '') + (d === today ? ' today' : '') + (d < today ? ' past' : '') + (sel ? ' sel' : '') + (l.length ? ' has' : ''), title: d > today ? `누르면 ${C.fmtDate(d)}까지 진행` : '그날 경기 보기',
      onclick: () => { if (d > today && !running) runTo(d, `${C.fmtDate(d)}까지`); else { sv.day = d; U.stay(); } } },
      h('span', { class: 'wd' }, `${DOW[C.toDate(d).getUTCDay()]} ${C.ymd(d)[2]}`),
      h('span', { class: 'wt' }, ...teams.slice(0, 3).map(([id, nat]) => nat ? U.natCrest(id, 16) : crest(w.clubs[id], 16))),
      isCer ? h('span', { class: 'wcer' }, '🏆 발롱도르') : null,
      h('span', { class: 'wc' }, l.length ? `${l.length}경기` : isCer ? '' : '-'), comps.length ? h('span', { class: 'wl mute' }, comps.slice(0, 2).join(' · ')) : null));
  }
  return h('div', { class: 'week' }, ...cells);
}
// 팔로우한 리그 순위 (요약)
function leagueMini(s, sv) {
  const w = s.w, f = U.follow(s);
  const lgs = f.lg.map(id => w.lg[id]).filter(Boolean).concat(Object.values(w.lg).filter(l => l.tier === 1 && BIGLG.includes(l.nation) && !f.lg.includes(l.id)).sort((a, b) => BIGLG.indexOf(a.nation) - BIGLG.indexOf(b.nation))).slice(0, 8);
  if (!sv.lg || !lgs.some(l => l.id === sv.lg)) sv.lg = lgs[0] && lgs[0].id;
  if (!sv.lg) return null;
  const L = C.liveLeague(s, sv.lg), LS = w.cal.lg[sv.lg];
  return h('div', { class: 'sec' }, h('h3', null, '리그 순위', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, LS ? ` ${LS.ri}/${LS.dates.length}라운드` : '')),
    h('div', { class: 'in' }, h('select', { class: 'wsel', style: { width: '100%' }, onchange: e => { sv.lg = e.target.value; U.stay(); } }, ...lgs.map(l => { const o = h('option', { value: l.id }, `${f.lg.includes(l.id) ? '★ ' : ''}${l.name}`); if (l.id === sv.lg) o.selected = true; return o; }))),
    L ? h('div', { class: 'in' }, h('table', { class: 'ltable lc mini' }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '득실', '승점'].map(x => h('th', null, x)))),
      h('tbody', null, ...L.t.slice(0, 8).map((r, i) => h('tr', { class: U.isFollow('club', r[0]) ? 'me' : '' }, h('td', null, i + 1), h('td', null, clubChip(w, r[0], 14)), h('td', null, r[1]), h('td', null, r[5] - r[6] > 0 ? '+' + (r[5] - r[6]) : r[5] - r[6]), h('td', null, h('b', null, r[7]))))))) : h('div', { class: 'in mute' }, '아직 개막 전입니다.'),
    h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => { U.st.wv = Object.assign(U.st.wv || {}, { mode: 'league', nat: w.lg[sv.lg].nation, lg: sv.lg, season: 'live' }); U.setTab('table'); } }, '전체 순위·기록')));
}
// 지난 시즌 한 줄 요약
function lastSeasonCard(s) {
  const w = s.w, r = (s.ws || [])[(s.ws || []).length - 1]; if (!r) return null;
  const items = [];
  const hid = U.cerHidden(r.y + 1);
  if (r.bd[0]) items.push(['발롱도르', hid ? h('span', { class: 'mute' }, `시상식 ${C.fmtDate(w.cer.d)}`) : pLink(r.bd[0][0], r.bd[0][2])]);
  if (r.cont.UCL) items.push(['UCL', clubChip(w, r.cont.UCL, 14)]);
  const e = Object.keys(r.champs).find(id => w.lg[id] && w.lg[id].nation === 'ENG' && w.lg[id].tier === 1); if (e) items.push(['EPL', clubChip(w, r.champs[e], 14)]);
  if (r.gb && r.gb[0] && !hid) items.push(['골든보이', pLink(r.gb[0][0], r.gb[0][2])]);
  return h('div', { class: 'sec' }, h('h3', null, `${r.label} 시즌 결과`), h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...items.map(([k, v2]) => h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, k), v2))), h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => U.setTab('hist') }, '시상·역사 전체')));
}

// ---------- 홈 (관전) ----------
U.pages.wsim = function () {
  const s = U.S(), w = s.w;
  if (!w.cal) C.calInit(s);
  const today = w.cal.d, sv = v();
  const root = h('div', { class: 'wrap prof screen' });
  if (!s.wStart) { root.append(U.pageHead('관전 모드', '세계 축구를 날짜 단위로 진행하며 지켜봅니다.')); startScreen(s, root); return root; }
  const inWin = w.cal.win && today >= w.cal.win.d0 && today <= w.cal.win.d1;
  const nmd = nextMatchDay(s);
  root.append(U.pageHead(dstr(today), `관전 모드 · ${C.wLabel(w.year)} 시즌`,
    inWin ? h('span', { class: 'chip good' }, `${w.cal.win.kind === 'summer' ? '여름' : '겨울'} 이적시장 ~ ${C.fmtDate(w.cal.win.d1)}`) : null,
    C.intlBlocked(today) ? h('span', { class: 'chip blue' }, 'A매치 기간') : null,
    running ? null : h('button', { class: 'btn', onclick: () => runTo(nmd, '다음 경기일') }, `다음 경기일 ▸ ${C.fmtDate(nmd)}`)));
  const main = h('div', { class: 'dmain' }), aside = h('div', { class: 'daside' });
  { const cb = U.cerBanner(s); if (cb) main.append(cb); }
  main.append(h('div', { class: 'sec' }, h('h3', null, '이번 주', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 팔로우한 경기 · 앞날을 누르면 그날까지 진행')), h('div', { class: 'in' }, weekStrip(s, sv, today))));
  const hero = U.tourHero(s); if (hero) main.append(hero);
  main.append(dayMatchesSec(s, sv, today, true));
  const tp = U.txPanel(s, { compact: true, sel: sv.txSel, onSel: d => { sv.txSel = d; U.stay(); } }); if (tp) aside.append(tp);
  const nm = U.newsMini(s, 6); if (nm) aside.append(nm);
  const lm = leagueMini(s, sv); if (lm) aside.append(lm);
  const lc = lastSeasonCard(s); if (lc) aside.append(lc);
  aside.append(U.followManager(s));
  root.append(h('div', { class: 'dash' }, main, aside));
  return root;
};

// ---------- 일정 ----------
U.pages.sched = function () {
  const s = U.S(), w = s.w;
  if (!w.cal) C.calInit(s);
  const today = w.cal.d, sv = v();
  const root = h('div', { class: 'wrap prof screen' });
  root.append(U.pageHead('일정', s.mode === 'world' ? '앞날을 누르면 그날까지 진행합니다. 표시는 팔로우한 리그·대회·팀 기준' : '세계 일정을 봅니다. 내 경기 진행은 커리어 홈에서', s.mode === 'world' && s.wStart && !running ? h('button', { class: 'btn', onclick: () => runTo(nextMatchDay(s), '다음 경기일') }, `다음 경기일 ▸ ${C.fmtDate(nextMatchDay(s))}`) : null));
  if (s.mode === 'world' && !s.wStart) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '홈에서 시작할 리그를 먼저 고르세요.'))); return root; }
  root.append(h('div', { class: 'dash' }, h('div', { class: 'dmain' }, h('div', { class: 'sec' }, h('div', { class: 'in' }, worldCal(s, sv, today))), dayMatchesSec(s, sv, today, false)),
    h('div', { class: 'daside' }, upcomingSec(s, today), U.followManager(s))));
  return root;
};

// ---------- 시상·역사 ----------
// 순위표 (발롱도르 30인, 골든보이·골든슈 10위까지): 순위·선수·구단·포지션·기록
function awardTable(s, k, b) {
  const w = s.w;
  const me = x => k !== 'gs' && x[3];
  const cols = k === 'bd' ? ['#', '선수', '구단', '포지션', 'OVR', '경기', '골', '도움', '평점'] : k === 'gb' ? ['#', '선수', '구단', '나이', 'OVR', 'POT', '경기', '골', '도움', '평점'] : ['#', '선수', '구단', '리그', '골', '점수'];
  const cells = (x, i) => k === 'bd' ? [x[4] || '', x[8] != null ? x[8] : '-', x[6] != null ? x[6] : '-', x[7] != null ? x[7] : '-', x[9] ? (+x[9]).toFixed(2) : '-']
    : k === 'gb' ? [x[6], x[4], x[7], x[8], x[9], x[10], x[11] ? (+x[11]).toFixed(2) : '-'] : [(w.lg[x[5]] || {}).name || '', x[3], x[4]];
  return h('div', { class: 'tscroll' }, h('table', { class: 'ltable lc awt' }, h('thead', null, h('tr', null, ...cols.map(c => h('th', null, c)))),
    h('tbody', null, ...b.top.map((x, i) => h('tr', { class: (i < 3 ? 'p' + (i + 1) : '') + (me(x) ? ' me' : '') }, h('td', null, h('b', null, i + 1)),
      h('td', null, k !== 'gs' && x[10] && k === 'bd' ? flag(x[10], 14) : k === 'gb' && x[15] ? flag(x[15], 14) : null, ' ', me(x) ? h('span', { class: 'lnk', onclick: () => U.setTab('profile') }, `${x[0]} (나)`) : pLink(x[0], x[2])),
      h('td', null, clubChip(w, x[1], 14)), k === 'bd' ? h('td', null, h('span', { class: 'tpos' }, x[5] || '')) : null,
      ...cells(x, i).map(v => h('td', null, v)))))));
}
U.pages.hist = function () {
  const s = U.S(), w = s.w, sv = v();
  const root = h('div', { class: 'wrap prof screen' });
  root.append(U.pageHead('시상·역사', '발롱도르 30인 · 골든보이 · 유러피언 골든슈 · 시즌별 우승 (한 해는 8월 1일에 마감, 시상식은 9월 넷째 주 월요일)'));
  { const cb = U.cerBanner(s); if (cb) root.append(cb); }
  const ws = s.ws || [];
  if (!ws.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '첫 해(8월 1일)가 지나면 시상과 우승 기록이 쌓입니다.'))); return root; }
  const SUB = [['bd', '발롱도르'], ['gb', '골든보이'], ['gs', '골든슈'], ['xi', '월드 베스트 XI'], ['season', '시즌별 우승'], ['champ', '역대 우승']];
  if (!sv.hs || !SUB.some(x => x[0] === sv.hs)) sv.hs = 'bd';
  root.append(h('div', { class: 'etabs' }, ...SUB.map(([k, l]) => h('button', { class: sv.hs === k ? 'on' : '', onclick: () => { sv.hs = k; U.stay(); } }, l))));
  if (sv.hs === 'xi') {
    const src = w.wxiHist || [];
    if (!src.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '이번 업데이트 이후 시상식부터 기록됩니다.'))); return root; }
    const ys = src.map(b => b.y).reverse(); if (!sv.hy || !ys.includes(sv.hy)) sv.hy = ys[0];
    root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { sv.hy = +e.target.value; U.stay(); } }, ...ys.map(y => { const o = h('option', { value: y }, `${y}년${U.cerHidden(y) ? ' (시상식 전)' : ''}`); if (y === sv.hy) o.selected = true; return o; }))));
    const b = src.find(x => x.y === sv.hy);
    root.append(h('div', { class: 'sec' }, h('h3', null, `${sv.hy} 월드 베스트 XI`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${C.wLabel(sv.hy - 1)} 시즌 · 4-3-3 · 평점·공격 포인트·기량·팀 성과`)),
      h('div', { class: 'in' }, U.cerHidden(sv.hy) ? h('div', { class: 'mute' }, `${dstr(w.cer.d)} 시상식에서 발표됩니다.`) : U.xiPitch(w, b.xi))));
    // 최다 선정
    const cnt = {}; for (const x of src) { if (U.cerHidden(x.y)) continue; for (const p of x.xi) { const k = p[4] || p[0]; (cnt[k] = cnt[k] || { n: p[0], pid: p[4], c: 0 }).c++; } }
    const most = Object.values(cnt).sort((a, z) => z.c - a.c).slice(0, 15);
    if (most.length) root.append(h('div', { class: 'sec' }, h('h3', null, '최다 선정'), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...most.map(x => h('div', { class: 'kvrow' }, pLink(x.n, x.pid), h('b', { style: { color: 'var(--gold)' } }, `${x.c}회`))))));
    return root;
  }
  if (sv.hs === 'bd' || sv.hs === 'gb' || sv.hs === 'gs') {
    const src = (sv.hs === 'bd' ? w.bdHist : sv.hs === 'gb' ? w.gbHist : w.gsHist) || [];
    const nm = { bd: '발롱도르', gb: '골든보이', gs: '유러피언 골든슈' }[sv.hs];
    if (!src.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '기록이 없습니다.'))); return root; }
    const ys = src.map(b => b.y).reverse();
    if (!sv.hy || !ys.includes(sv.hy)) sv.hy = ys[0];
    root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { sv.hy = +e.target.value; U.stay(); } }, ...ys.map(y => { const o = h('option', { value: y }, `${y}년${U.cerHidden(y) ? ' (시상식 전)' : ''}`); if (y === sv.hy) o.selected = true; return o; }))));
    const b = src.find(x => x.y === sv.hy);
    if (U.cerHidden(sv.hy)) {
      root.append(h('div', { class: 'sec' }, h('h3', null, sv.hs === 'bd' ? `${sv.hy} 발롱도르 후보 30인` : `${sv.hy} ${nm}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` 순위는 ${dstr(w.cer.d)} 시상식에서 공개`)),
        h('div', { class: 'in' }, sv.hs === 'bd' ? U.cerNominees(s, sv.hy) : h('div', { class: 'mute' }, '시상식에서 발표됩니다.'))));
    } else {
      root.append(h('div', { class: 'sec' }, h('h3', null, `${sv.hy} ${nm}`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, sv.hs === 'bd' ? ` ${C.wLabel(sv.hy - 1)} 시즌 · 30위까지` : sv.hs === 'gb' ? ' 21세 이하 · 10위까지' : ' 리그 골 × 계수 (빅5 2.0 · 그 밖 1.5) · 10위까지'),
        w.cer && w.cer.y === sv.hy ? h('button', { class: 'btn ghost sm', style: { marginLeft: '8px' }, onclick: () => U.ceremony(s) }, '시상식 다시 보기') : null),
        h('div', { class: 'in' }, awardTable(s, sv.hs, b))));
    }
    // 최다 수상
    const cnt = {}; for (const x of src) { if (U.cerHidden(x.y)) continue; const t = x.top[0]; if (!t) continue; const k = t[2] || t[0]; (cnt[k] = cnt[k] || { n: t[0], pid: t[2], c: 0, ys: [] }).c++; cnt[k].ys.push(x.y); }
    const most = Object.values(cnt).sort((a, z) => z.c - a.c);
    if (most.length) root.append(h('div', { class: 'sec' }, h('h3', null, `역대 ${nm} 수상자`), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...most.map(x => h('div', { class: 'kvrow' }, pLink(x.n, x.pid), h('span', null, h('b', { style: { color: 'var(--gold)' } }, `${x.c}회`), h('span', { class: 'mute' }, ` ${x.ys.join(', ')}`)))))));
  } else if (sv.hs === 'season') {
    if (!sv.hsy || !ws.some(x => x.label === sv.hsy)) sv.hsy = ws[ws.length - 1].label;
    const r = ws.find(x => x.label === sv.hsy);
    root.append(h('div', { class: 'wfilter' }, h('select', { class: 'wsel', onchange: e => { sv.hsy = e.target.value; U.stay(); } }, ...ws.slice().reverse().map(x => { const o = h('option', { value: x.label }, x.label); if (x.label === sv.hsy) o.selected = true; return o; }))));
    root.append(h('div', { class: 'sec' }, h('h3', null, `${r.label} 우승`), h('div', { class: 'in wsgrid' },
      ...Object.entries(r.cont).filter(([, x]) => x).map(([k, x]) => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, C.COMPS[k] ? C.COMPS[k].name : k), clubChip(w, x, 22))),
      ...(r.intl || []).map(t => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, `${t[1]} ${t[4] || ''}`), h('span', { class: 'cc' }, U.natCrest(t[2], 20), h('span', null, C.natName(t[2]))))),
      ...((w.unlHist || []).filter(x => x.y === r.label).map(x => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, 'UEFA 네이션스리그'), h('span', { class: 'cc' }, U.natCrest(x.w, 20), h('span', null, C.natName(x.w)))))),
      ...(!U.cerHidden(r.y + 1) && r.bd[0] ? [h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, `발롱도르 ${r.y + 1}`), pLink(r.bd[0][0], r.bd[0][2]))] : []))));
    const tl = Object.keys(r.champs).map(id => w.lg[id]).filter(Boolean).filter(l => BIGLG.includes(l.nation)).sort((a, b) => BIGLG.indexOf(a.nation) - BIGLG.indexOf(b.nation));
    root.append(h('div', { class: 'sec' }, h('h3', null, '주요 리그 우승·득점왕'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '560px' } },
      h('thead', null, h('tr', null, ...['리그', '우승', '득점왕'].map(x => h('th', null, x)))),
      h('tbody', null, ...tl.map(l => { const b = r.boots[l.id]; return h('tr', null, h('td', null, h('span', { class: 'cc lnk', onclick: () => { U.st.wv = Object.assign(U.st.wv || {}, { mode: 'league', nat: l.nation, lg: l.id, season: r.label }); U.setTab('table'); } }, flag(l.nation, 18), h('span', null, l.name))), h('td', null, clubChip(w, r.champs[l.id], 16)), h('td', null, b ? h('span', null, pLink(b[0], b[3]), h('span', { class: 'mute' }, ` ${b[2]}골 · ${(w.clubs[b[1]] || {}).short || ''}`)) : '-')); }))))));
  } else {
    root.append(h('div', { class: 'sec' }, h('h3', null, '시즌별 역대 우승'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '1000px' } },
      h('thead', null, h('tr', null, ...['시즌', 'EPL', '라리가', '세리에 A', '분데스리가', '리그 1', 'UCL', '발롱도르', '골든보이'].map(x => h('th', null, x)))),
      h('tbody', null, ...ws.slice().reverse().map(x => {
        const lgOf = nat => Object.keys(x.champs).find(id => w.lg[id] && w.lg[id].nation === nat && w.lg[id].tier === 1);
        const cell = nat => { const id = lgOf(nat); return h('td', null, id ? clubChip(w, x.champs[id], 16) : '-'); };
        const hid = U.cerHidden(x.y + 1);
        return h('tr', null, h('td', null, h('span', { class: 'lnk', onclick: () => { sv.hs = 'season'; sv.hsy = x.label; U.stay(); } }, x.label)), cell('ENG'), cell('ESP'), cell('ITA'), cell('GER'), cell('FRA'), h('td', null, x.cont.UCL ? clubChip(w, x.cont.UCL, 16) : '-'), h('td', null, hid ? h('span', { class: 'mute' }, '시상식 전') : x.bd[0] ? pLink(x.bd[0][0], x.bd[0][2]) : '-'), h('td', null, hid ? '' : x.gb && x.gb[0] ? pLink(x.gb[0][0], x.gb[0][2]) : '-'));
      }))))));
  }
  return root;
};

// ---------- 이적시장 ----------
// ---------- 세계 파워랭킹 (OVR) ----------
// 모든 구단 선수 + 무소속. 포지션·나라·리그·나이로 거른다. 분포는 시작(FC27) 기준과 비교
U.pages.rank = function () {
  const s = U.S(), w = s.w, sv = v();
  const root = h('div', { class: 'wrap prof screen' });
  root.append(U.pageHead('세계 파워랭킹', 'OVR 기준 · 전 세계 구단 선수와 무소속 선수 · 잠재력은 공개하지 않습니다'));
  const all = [];
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.sq) continue; for (const e of c.sq) if (e[2] >= 60) all.push([e, c]); }
  for (const e of w.fa || []) if (e[2] >= 60) all.push([e, null]);
  if (s.mode !== 'world' && s.p && s.car) all.push([['ME', s.p.pos, C.ovrOf(s.p), s.p.age, 0, s.p.nat], s.car.club ? w.clubs[s.car.club] : null]);
  all.sort((a, b) => b[0][2] - a[0][2] || a[0][3] - b[0][3]);
  // 분포
  const cnt = t => all.filter(x => x[0][2] >= t).length;
  const REF = { 90: 11, 88: 29, 86: 65, 84: 137, 80: 510 };
  root.append(h('div', { class: 'wsum' }, ...[90, 88, 86, 84, 80].map(t => h('div', null, h('div', { class: 'lbl' }, `OVR ${t} 이상`), h('div', null, h('b', null, `${cnt(t)}명`), h('span', { class: 'mute', style: { fontSize: '12px' } }, ` (FC27 DB ${REF[t]}명)`))))));
  // 필터
  const GRP = { GK: 'GK', CB: 'DF', LB: 'DF', RB: 'DF', CDM: 'MF', CM: 'MF', CAM: 'MF', LM: 'FW', RM: 'FW', LW: 'FW', RW: 'FW', ST: 'FW' };
  const f = sv.rk = sv.rk || { pos: 'all', nat: '', lg: '', age: 'all', n: 100 };
  const natOpts = [...new Set(all.map(x => x[0][5]))].filter(Boolean).sort((a, b) => C.natName(a).localeCompare(C.natName(b)));
  const BIG = ['ENG', 'ESP', 'ITA', 'GER', 'FRA'];
  const lgOpts = Object.values(w.lg).filter(l => l.tier === 1).sort((a, b) => (BIG.indexOf(a.nation) < 0) - (BIG.indexOf(b.nation) < 0) || BIG.indexOf(a.nation) - BIG.indexOf(b.nation) || a.name.localeCompare(b.name));
  const sel = (val, opts, on) => h('select', { class: 'wsel', onchange: e => { on(e.target.value); f.n = 100; U.stay(); } }, ...opts.map(([k, l]) => { const o = h('option', { value: k }, l); if (k === val) o.selected = true; return o; }));
  root.append(h('div', { class: 'wfilter' },
    sel(f.pos, [['all', '전체 포지션'], ['GK', '골키퍼'], ['DF', '수비수'], ['MF', '미드필더'], ['FW', '공격수']], x => f.pos = x),
    sel(f.lg, [['', '전체 리그'], ['big5', '빅5 리그'], ['fa', '무소속만']].concat(lgOpts.map(l => [l.id, `${C.natName(l.nation)} · ${l.name}`])), x => f.lg = x),
    sel(f.nat, [['', '전체 국적']].concat(natOpts.map(n => [n, C.natName(n)])), x => f.nat = x),
    sel(f.age, [['all', '전체 나이'], ['u21', '21세 이하'], ['u23', '23세 이하'], ['p24', '24~29세'], ['o30', '30세 이상']], x => f.age = x)));
  const ok = ([e, c]) => (f.pos === 'all' || GRP[e[1]] === f.pos) && (!f.nat || e[5] === f.nat)
    && (!f.lg || (f.lg === 'fa' ? !c : f.lg === 'big5' ? c && w.lg[c.lg] && w.lg[c.lg].tier === 1 && BIG.includes(w.lg[c.lg].nation) : c && c.lg === f.lg))
    && (f.age === 'all' || (f.age === 'u21' ? e[3] <= 21 : f.age === 'u23' ? e[3] <= 23 : f.age === 'p24' ? e[3] >= 24 && e[3] <= 29 : e[3] >= 30));
  const list = all.filter(ok), shown = list.slice(0, f.n);
  const rankOf = new Map(); all.forEach((x, i) => rankOf.set(x[0], i + 1));
  const tb = h('tbody');
  shown.forEach(([e, c], i) => { const pid = String(e[0]), me = pid === 'ME', inj = e[14] && w.cal && e[14] > w.cal.d;
    tb.append(h('tr', { class: (me ? 'me ' : '') + 'click', onclick: () => me ? U.setTab('profile') : U.openPlayer(pid) },
      h('td', null, h('b', null, i + 1)), h('td', { class: 'mute' }, f.pos === 'all' && !f.nat && !f.lg && f.age === 'all' ? '' : `세계 ${rankOf.get(e)}위`),
      h('td', { style: { textAlign: 'left' } }, h('span', { class: 'cc' }, flag(e[5], 16), h('b', null, me ? `${s.p.name} (나)` : C.pName(w, e)), inj ? h('span', { class: 'injb' }, '부상') : null)),
      h('td', null, h('span', { class: 'tpos' }, e[1])), h('td', null, e[3]),
      h('td', { style: { textAlign: 'left' } }, c ? h('span', { class: 'cc' }, U.crest(c, 16), h('span', null, c.name)) : h('span', { class: 'mute' }, '무소속')),
      h('td', { class: 'mute', style: { fontSize: '12px', textAlign: 'left' } }, c && w.lg[c.lg] ? w.lg[c.lg].name : ''),
      h('td', null, h('b', { class: 'ovrb' + (e[2] >= 90 ? ' o90' : e[2] >= 86 ? ' o86' : e[2] >= 80 ? ' o80' : '') }, e[2])))); });
  root.append(h('div', { class: 'sec' }, h('h3', null, `${list.length.toLocaleString()}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' OVR 60 이상 · 같은 OVR은 어린 순')),
    h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '700px' } }, h('thead', null, h('tr', null, ...['#', '', '선수', '포지션', '나이', '구단', '리그', 'OVR'].map(t => h('th', { style: ['선수', '구단', '리그'].includes(t) ? { textAlign: 'left' } : null }, t)))), tb)),
    list.length > shown.length ? h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => { f.n += 100; U.stay(); } }, `100명 더 보기 (${shown.length}/${list.length})`)) : null));
  return root;
};
U.pages.txm = function () {
  const s = U.S(), w = s.w, sv = v();
  const root = h('div', { class: 'wrap prof screen' });
  const win = w.cal && C.txWindowAt(w.cal.d);
  root.append(U.pageHead('이적시장', win ? `${win.kind === 'summer' ? '여름' : '겨울'} 이적시장 진행 중 · ${C.fmtDate(win.d1)} 마감` : '여름 6월 15일 ~ 9월 1일 · 겨울 1월 1일 ~ 1월 31일'));
  if (w.cal) { const tp = U.txPanel(s, { my: s.mode !== 'world' && s.ss ? s.ss.club : null, sel: sv.txSel, onSel: d => { sv.txSel = d; U.stay(); }, noLink: true }); if (tp) root.append(tp); }
  // 무소속 선수 (이적료 없이 언제든 영입 가능)
  { const fa = (w.fa || []).slice().sort((a, b) => b[2] - a[2]);
    if (fa.length) {
      const pos = sv.faPos || 'all', GRP = { GK: 'GK', CB: 'DF', LB: 'DF', RB: 'DF', CDM: 'MF', CM: 'MF', CAM: 'MF', LM: 'FW', RM: 'FW', LW: 'FW', RW: 'FW', ST: 'FW' };
      const list = fa.filter(e => pos === 'all' || GRP[e[1]] === pos).slice(0, sv.faN || 25);
      const tb = h('tbody');
      for (const e of list) { const pid = String(e[0]), lc = e[19] && w.clubs[e[19]];
        tb.append(h('tr', { class: 'click', onclick: () => U.openPlayer(pid) }, h('td', null, h('span', { class: 'tpos' }, e[1])), h('td', null, h('span', { class: 'cc' }, U.flag ? U.flag(e[5], 16) : null, h('b', null, C.pName(w, e)))), h('td', { class: 'mute' }, `${e[3]}세`), h('td', null, h('b', null, e[2])),
          h('td', { class: 'mute' }, lc ? lc.name : e[19] || '-'), h('td', { class: 'mute' }, e[18] && w.cal ? `${Math.max(1, w.cal.d - e[18])}일` : '시즌 전부터'))); }
      root.append(h('div', { class: 'sec' }, h('h3', null, `무소속 선수 ${fa.length}명`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 계약이 끝나 소속이 없는 선수 · 이적시장 기간이 아니어도 구단이 바로 영입할 수 있습니다')),
        h('div', { class: 'in' }, h('div', { class: 'seg', style: { marginBottom: '8px' } }, ...[['all', '전체'], ['GK', 'GK'], ['DF', '수비'], ['MF', '미드필더'], ['FW', '공격']].map(([k, l]) => h('button', { class: pos === k ? 'on' : '', onclick: () => { sv.faPos = k; U.stay(); } }, l))),
          h('table', { class: 'ptable' }, h('thead', null, h('tr', null, ...['포지션', '선수', '나이', 'OVR', '직전 구단', '무소속 기간'].map(t => h('th', null, t)))), tb),
          fa.filter(e => pos === 'all' || GRP[e[1]] === pos).length > list.length ? h('button', { class: 'btn ghost sm', style: { marginTop: '8px' }, onclick: () => { sv.faN = (sv.faN || 25) + 25; U.stay(); } }, '더 보기') : null)));
    } }
  if (U.txView) { try { U.txView(s, root); } catch (e) { console.error(e); } }
  return root;
};
})(window);
