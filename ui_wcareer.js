// 터치라인 커리어 UI — 월드 커리어 (v40): 시작 화면 · 홈 · 관계 · 라이브 중계 · 진행 중 대화
(function (G) {
'use strict';
const C = G.TC, GM = G.TCG, U = G.TCUI;
const { h, esc, flag, crest, toast, overlay, sleep } = U;
const S = () => U.S();
const WC = () => C.WC;
const F = () => G.FC27;
const fmtD = d => C.fmtDateY(d);

// ================= 시작 화면 =================
const PAUSEL = [['often', '자주'], ['normal', '보통'], ['rare', '드물게'], ['off', '끔']];
const WATCHL = [['all', '모든 경기'], ['big', '주요 경기'], ['none', '끔']];
U.PAUSEL = PAUSEL; U.WATCHL = WATCHL;
function seg(list, cur, on) {
  const box = h('div', { class: 'seg' });
  for (const [k, l] of list) box.append(h('button', { class: cur === k ? 'on' : '', onclick: e => { on(k); box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, l));
  return box;
}
U.wcSeg = seg;
let realIdx = null;
U.viewWCNew = function () {
  const d = U.wcDraft || (U.wcDraft = { mode: 'new', name: '', num: 9, foot: 'R', nat: 'KOR', pos: 'ST', height: 180, style: 0, age: 16, club: null, lg: 'ENG1', cq: '', nq: '', per: [], diff: 'normal', ds: C.cfg.dataset || 'fc27', pause: 'normal', watch: 'big', rq: '', rpos: '', pick: null });
  const w = h('div', { class: 'screen' });
  w.append(U.topbar(false));
  const box = h('div', { class: 'panel wcnew' });
  box.append(h('div', { class: 'ph' }, h('h2', { style: { fontSize: '22px' } }, '월드 커리어'), h('span', { class: 'mute' }, '관전 모드의 세계에 내 선수 한 명을 넣습니다. 훈련·상점은 없고, 이적·감독과의 대화·동료와의 관계가 커리어를 바꿉니다.')));
  box.append(h('div', { class: 'wcmode' }, seg([['new', '새 선수 만들기'], ['real', '실존 선수로 시작']], d.mode, k => { d.mode = k; if (k === 'real' && d.pick == null) d.club = null; U.stay(); })));
  box.append(d.mode === 'real' ? realSec(d) : newSec(d));
  if (d.mode === 'new') box.append(ageSec(d));
  box.append(clubSec(d), perSec(d), runSec(d), U.diffPicker(d), U.dsPicker(d));
  box.append(h('div', { class: 'cfoot' }, h('button', { class: 'btn ghost', onclick: () => U.go('home') }, '뒤로'), h('button', { class: 'btn', onclick: () => start(d) }, '월드 커리어 시작')));
  w.append(h('div', { class: 'wrap create' }, box));
  return w;
};
async function start(d) {
  if (d.mode === 'new' && !d.name.trim()) { toast('이름을 입력하세요.'); return; }
  if (d.mode === 'real' && d.pick == null) { toast('선수를 고르세요.'); return; }
  if (!d.club) { toast('시작할 구단을 고르세요.'); return; }
  if (d.per.length < 2) { toast('성격을 두 가지 고르세요.'); return; }
  if (!(await U.dsPrep(d.ds))) return;
  const t = toast('세계를 만드는 중…', 30000);
  await sleep(30);
  let nS = null;
  try {
    nS = WC().create(d.mode === 'real' ? { real: d.pick, club: d.club, per: d.per, diff: d.diff, ds: d.ds, pause: d.pause, watch: d.watch }
      : { name: d.name.trim(), num: d.num, foot: d.foot, nat: d.nat, pos: d.pos, height: d.height, style: d.style, age: d.age, club: d.club, per: d.per, diff: d.diff, ds: d.ds, pause: d.pause, watch: d.watch });
  } catch (e) { console.error(e); }
  if (t && t.remove) t.remove();
  if (!nS) { toast('이 조건으로는 시작할 수 없습니다.'); return; }
  const old = S(); if (old) await U.purgeMx(old);
  U.setS(nS); U.save(); U.dsAfter(nS);
  U.go('game', 'career');
  const c = nS.w.clubs[nS.car.club];
  setTimeout(() => toast(`${nS.p.name} · ${c.name} · ${nS.p.age}세 (${WC().stageOf(nS.p.age, nS.car.status)})`, 2600), 250);
}
function newSec(d) {
  const jwrap = h('div', { class: 'jersey' }, U.jersey(d));
  const upd = () => { jwrap.replaceChildren(U.jersey(d)); };
  const s1 = h('section', null, h('h3', null, '신상'), jwrap,
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' } }, h('label', { class: 'lbl' }, '이름 (등록명)'), h('label', { class: 'lbl' }, '등번호'),
      h('input', { value: d.name, maxlength: 18, placeholder: '예: 손 / KIM', oninput: e => { d.name = e.target.value; upd(); } }),
      h('input', { type: 'number', min: 1, max: 99, value: d.num, style: { width: '80px' }, oninput: e => { d.num = Math.max(1, Math.min(99, +e.target.value || 1)); upd(); } })),
    h('div', { class: 'lbl', style: { textAlign: 'center' } }, '주발'), seg([['L', '왼발'], ['R', '오른발']], d.foot, k => { d.foot = k; }),
    (() => { const lab = h('b', { class: 'num' }, d.height + 'cm'); return h('div', { style: { display: 'grid', gap: '4px' } }, h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, '키'), lab), h('input', { type: 'range', min: 162, max: 200, value: d.height, style: { padding: 0 }, oninput: e => { d.height = +e.target.value; lab.textContent = d.height + 'cm'; } })); })());
  const list = h('div', { class: 'natlist' });
  const fill = () => { list.replaceChildren(); const q = d.nq.trim(); U.NATCHOICES().filter(c => !q || C.natName(c).includes(q) || c.toLowerCase().includes(q.toLowerCase())).forEach(c => list.append(h('button', { class: d.nat === c ? 'on' : '', onclick: () => { d.nat = c; fill(); } }, flag(c), h('span', null, C.natName(c)), d.nat === c ? h('span', { style: { marginLeft: 'auto' } }, '✓') : null))); };
  fill();
  const s2 = h('section', null, h('h3', null, '국적'), h('input', { placeholder: '국가 검색', value: d.nq, oninput: e => { d.nq = e.target.value; fill(); } }), list);
  const pitch = h('div', { class: 'pitchpick' }), styles = h('div', { class: 'styles' });
  const drawPos = () => {
    pitch.replaceChildren(U.svg('<svg viewBox="0 0 68 90" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".5"><rect x="14" y="0" width="40" height="14"/><rect x="25" y="0" width="18" height="5"/><line x1="0" y1="45" x2="68" y2="45"/><circle cx="34" cy="45" r="8"/><rect x="14" y="76" width="40" height="14"/><rect x="25" y="85" width="18" height="5"/></svg>'));
    for (const p of C.POS) { const [x, y] = U.POSXY[p]; pitch.append(h('button', { class: 'pb' + (d.pos === p ? ' on' : ''), style: { left: x + '%', top: y + '%' }, onclick: () => { d.pos = p; d.style = 0; drawPos(); } }, p)); }
    styles.replaceChildren(...C.STYLES[C.styleKey(d.pos)].map((s, i) => h('button', { class: d.style === i ? 'on' : '', onclick: () => { d.style = i; drawPos(); } }, h('b', null, s[0]), h('span', null, s[1]))));
  };
  drawPos();
  const s3 = h('section', null, h('h3', null, '포지션'), pitch, h('div', { class: 'lbl' }, '플레이 성향'), styles, h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, d.pos === 'GK' ? '골키퍼는 다이빙·핸들링·킥력·반사신경·스피드·위치 선정 6개 대분류가 움직입니다.' : '필드 선수는 스피드·슈팅·패스·드리블·수비·피지컬 6개 대분류가 움직입니다.'));
  return h('div', { class: 'cgrid' }, s1, s2, s3);
}
function realSec(d) {
  if (!realIdx) { realIdx = GM.realList(); const fold = t => (U.fold ? U.fold(t) : String(t).toLowerCase()); for (const x of realIdx) x.f = fold(x.n + ' ' + x.club); }
  const list = h('div', { class: 'reallist' }), info = h('div', { class: 'realpick' });
  const fold = t => (U.fold ? U.fold(t) : String(t).toLowerCase());
  const fill = () => {
    list.replaceChildren(); const q = fold(d.rq.trim());
    const rows = realIdx.filter(x => (!d.rpos || x.pos === d.rpos) && (!q || x.f.includes(q))).slice(0, 80);
    if (!rows.length) list.append(h('div', { class: 'empty' }, '조건에 맞는 선수가 없습니다.'));
    for (const x of rows) list.append(h('button', { class: d.pick === x.i ? 'on' : '', onclick: () => { d.pick = x.i; d.club = x.cid; d.lg = lgOfClub(x.cid) || d.lg; U.stay(); } }, flag(x.nat, 18), h('span', { class: 'n' }, x.n), h('span', { class: 'chip', style: { fontSize: '10px' } }, x.pos), h('span', { class: 'mute' }, `${x.age}세`), h('span', { class: 'mute cl' }, x.club), U.ovrb(x.o)));
  };
  const x = realIdx.find(y => y.i === d.pick);
  info.append(x ? h('div', null, h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, flag(x.nat, 28), h('div', null, h('h3', { style: { margin: 0 } }, x.n), h('div', { class: 'mute' }, `${C.natName(x.nat)} · ${C.POSKO[x.pos] || x.pos} · ${x.age}세 · ${x.club}`)), h('div', { style: { marginLeft: 'auto' } }, U.ovrb(x.o))),
    h('p', { class: 'mute', style: { fontSize: '12px', margin: '8px 0 0' } }, `나이는 실제 생년월일 기준 (${WC().stageInfo(x.age)[0]}). 아래에서 다른 구단을 고르면 그 구단에서 시작합니다.`)) : h('div', { class: 'mute' }, '왼쪽 목록에서 선수를 고르세요.'));
  fill();
  const posSel = h('select', { onchange: e => { d.rpos = e.target.value; fill(); } }, h('option', { value: '' }, '전체 포지션'), ...C.POS.map(p => { const o = h('option', { value: p }, `${p} · ${C.POSKO[p]}`); if (d.rpos === p) o.selected = true; return o; }));
  const qIn = h('input', { type: 'search', placeholder: '선수 이름 또는 구단 (영문)', value: d.rq, oninput: e => { d.rq = e.target.value; clearTimeout(d.t); d.t = setTimeout(fill, 150); } });
  return h('div', { class: 'realgrid' }, h('section', null, h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,170px)', gap: '8px' } }, qIn, posSel), list), h('section', null, info));
}
function ageSec(d) {
  const lab = h('b', { class: 'num', style: { fontSize: '22px' } }, d.age + '세');
  const info = h('div', { class: 'wcstage' });
  const draw = () => { const [n, t] = WC().stageInfo(d.age); lab.textContent = d.age + '세'; info.replaceChildren(h('span', { class: 'chip gold' }, n), h('span', { class: 'mute', style: { fontSize: '12.5px' } }, t)); };
  draw();
  const marks = h('div', { class: 'wcmarks' }, ...[[14, '아카데미'], [16, 'U18'], [18, 'U21'], [21, '프로']].map(([a, l]) => h('span', { style: { left: ((a - 14) / 20 * 100) + '%' } }, l)));
  return h('section', { class: 'wcsec' }, h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } }, h('h3', { style: { margin: 0 } }, '시작 나이'), lab),
    h('input', { type: 'range', min: 14, max: 34, value: d.age, style: { padding: 0 }, oninput: e => { d.age = +e.target.value; draw(); } }), marks, info,
    h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '17세 이상으로 시작하면 16세부터 그 나이까지의 성장을 다른 선수들과 같은 방식으로 미리 겪은 상태가 됩니다 (매번 다르게 나옵니다).'));
}
function lgOfClub(id) { const L = F().leagues.find(l => l.clubs.includes(id)); return L ? L.id : null; }
function clubSec(d) {
  const FC = F(), cmap = U._wcCmap || (U._wcCmap = Object.fromEntries(FC.clubs.map(c => [c[0], c])));
  const lgs = FC.leagues.slice().sort((a, b) => (a.tier - b.tier) || 0);
  const sel = h('select', { onchange: e => { d.lg = e.target.value; d.cq = ''; U.stay(); } }, ...FC.leagues.map(l => { const o = h('option', { value: l.id }, `${C.natName(l.nation)} · ${l.name}`); if (l.id === d.lg) o.selected = true; return o; }));
  const grid = h('div', { class: 'wcclubs' });
  const q = d.cq.trim().toLowerCase();
  const ids = q ? FC.clubs.filter(c => FC.leagues.some(l => l.clubs.includes(c[0])) && (String(c[1]).toLowerCase().includes(q) || String(c[6] || '').toLowerCase().includes(q))).map(c => c[0]).slice(0, 40) : ((FC.leagues.find(l => l.id === d.lg) || {}).clubs || []);
  for (const id of ids) { const c = cmap[id]; if (!c) continue; const co = { id, name: c[1], short: c[2], c1: c[3], c2: c[4] };
    grid.append(h('button', { class: d.club === id ? 'on' : '', onclick: () => { d.club = id; U.stay(); } }, crest(co, 26), h('span', null, c[1]))); }
  const cur = d.club && cmap[d.club];
  return h('section', { class: 'wcsec' }, h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' } }, h('h3', { style: { margin: 0 } }, '시작 구단'), cur ? h('span', { class: 'chip good' }, `선택: ${cur[1]}`) : h('span', { class: 'mute', style: { fontSize: '12px' } }, '아무 구단이나 고를 수 있습니다')),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,220px)', gap: '8px' } }, sel, h('input', { type: 'search', placeholder: '구단 검색', value: d.cq, onchange: e => { d.cq = e.target.value; U.stay(); }, onkeydown: e => { if (e.key === 'Enter') { d.cq = e.target.value; U.stay(); } } })),
    grid, h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '팀 수준보다 많이 처지면 유스·2군이나 벤치에서 시작합니다. 강팀일수록 1군까지 가는 길이 좁습니다.'));
}
function perSec(d) {
  const box = h('div', { class: 'wcper' });
  const draw = () => { box.replaceChildren(...Object.entries(WC().PER).filter(([, v]) => v[2]).map(([k, [n, t]]) => h('button', { class: d.per.includes(k) ? 'on' : '', onclick: () => { if (d.per.includes(k)) d.per = d.per.filter(x => x !== k); else if (d.per.length < 2) d.per.push(k); else { d.per.shift(); d.per.push(k); } draw(); } }, h('b', null, n), h('span', null, t)))); };
  draw();
  return h('section', { class: 'wcsec' }, h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' } }, h('h3', { style: { margin: 0 } }, '성격 (두 가지)'), h('span', { class: 'mute', style: { fontSize: '12px' } }, '대화·선택·커리어 흐름에 따라 새 성격이 붙거나 옅어집니다')), box);
}
function runSec(d) {
  return h('section', { class: 'wcsec' }, h('h3', { style: { margin: 0 } }, '진행 방식'),
    h('div', { class: 'wcrun' }, h('span', { class: 'lbl' }, '자동 정지 (대화·사건)'), seg(PAUSEL, d.pause, k => { d.pause = k; }), h('span', { class: 'lbl' }, '경기 중계'), seg(WATCHL, d.watch, k => { d.watch = k; })),
    h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '경기 중 내 선수에게 직접 지시하는 기능은 없습니다. 중계는 시계·이벤트·실시간 통계·내 평점을 보여 주며, 진행 중에도 언제든 바꿀 수 있습니다.'));
}

// ================= 홈 =================
const DOTS = { S: ['선발', 'S'], B: ['교체', 'B'], X: ['결장', 'X'], I: ['부상', 'I'] };
function selDots(sel) { return h('div', { class: 'wcdots' }, ...sel.slice(-10).map(x => h('i', { class: 'd' + x, title: DOTS[x][0] }, DOTS[x][1]))); }
function sixBars(p) {
  return h('div', { class: 'wcsix' }, ...WC().six(p).map(([k, l, v]) => h('div', null, h('span', { class: 'lbl' }, l), h('div', { class: 'bar' }, h('i', { style: { width: v + '%', background: U.barCol(v) } })), h('b', { class: 'num' }, v))));
}
function perChips(s) { return h('div', { class: 'chg' }, ...s.wc.per.map(k => h('span', { class: 'chip' + (WC().PER[k][2] ? '' : ' gold'), title: WC().PER[k][1] }, WC().PER[k][0]))); }
function wcCard() {
  const s = S(), p = s.p, c = s.w.clubs[s.car.club], o = C.ovrOf(p), e = C.effOvr(p), M = s.wc.rel.mgr;
  const stage = WC().stageOf(p.age, s.car.status), role = s.ss && s.ss.role;
  const card = h('div', { class: 'panel card wccard', style: c ? U.tintStyle(c, .35) : null }, c ? U.watermark(c, 150, 'wm-card') : null,
    h('div', { class: 'wcid' },
      h('div', { class: 'ovr ' + (o >= 85 ? 'g4' : o >= 75 ? 'g3' : o >= 65 ? 'g2' : 'g1'), id: 'ovrTile' }, h('div', { class: 'l' }, 'OVR'), h('div', { class: 'v', id: 'ovrVal' }, o), e !== o ? h('div', { class: 'l', style: { fontSize: '10px', color: e < o ? '#ffb0b2' : '#a8f0c6' } }, `컨디션 ${e > o ? '+' : ''}${e - o}`) : null),
      h('div', { style: { minWidth: 0 } },
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, flag(p.nat, 18), h('span', { class: 'chip', style: { background: '#7a1d3a', color: '#ffd5e0' } }, `#${p.num} ${p.pos}`), h('span', { class: 'chip blue' }, stage), role ? U.ROLECHIP(role) : null),
        h('div', { class: 'wcname' }, p.name), h('div', { class: 'mute', style: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' } }, c ? crest(c, 18) : null, c ? c.name : '무소속', ` · ${p.age}세 · ${C.fmtEUR(s.value || 0)}`))),
    sixBars(p),
    perChips(s),
    h('div', { class: 'wcmgr' }, h('span', { class: 'lbl' }, '감독'), M ? h('span', null, h('b', null, M.n), ' · ', WC().mgrText(M.v)) : h('span', { class: 'mute' }, '-'), s.wc.sel.length ? selDots(s.wc.sel) : null));
  return card;
}
U.wcCard = wcCard;
function relMini() {
  const s = S(), R0 = s.wc.rel, fans = R0.fans[s.car.club] || 0;
  const mates = R0.mates.filter(m => m.c === s.car.club && !m.gone).slice(0, 4);
  const rows = [
    ['팬', WC().fanText(fans)],
    s.ss && s.ss.nt ? ['대표팀', WC().ntText(R0.nt || 0)] : null
  ].filter(Boolean);
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '관계'), h('button', { class: 'btn ghost sm', onclick: () => U.setTab('rel') }, '자세히')),
    h('div', { style: { display: 'grid', gap: '6px', padding: '4px 16px 14px' } },
      ...rows.map(([k, v]) => h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, k), h('span', null, v))),
      ...mates.map(m => h('div', { class: 'kvrow' }, h('span', { class: 'lnk', onclick: () => U.openPlayer && U.openPlayer(m.id) }, m.n), h('span', null, h('span', { class: 'chip', style: { fontSize: '10px' } }, WC().MATEK[m.k]), ' ', WC().mateText(m.k, m.v)))),
      !mates.length ? h('div', { class: 'mute', style: { fontSize: '12px' } }, '아직 가까운 동료가 없습니다. 대화와 선택으로 관계가 생깁니다.') : null));
}
function setPanel() {
  const s = S(), W = s.wc;
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '진행 설정'), U.isBusy && U.isBusy() ? null : h('button', { class: 'btn ghost sm', onclick: () => U.confirmRetire() }, '은퇴')),
    h('div', { class: 'wcrun', style: { padding: '4px 16px 14px' } }, h('span', { class: 'lbl' }, '자동 정지'), seg(PAUSEL, W.pause, k => { W.pause = k; U.save(); }), h('span', { class: 'lbl' }, '경기 중계'), seg(WATCHL, W.watch, k => { W.watch = k; U.save(); })));
}
U.wcHub = function () {
  const s = S(), w = s.w, today = w.cal ? w.cal.d : 0;
  const sv = U.st.wcv = U.st.wcv || {};
  const hub = h('div', { class: 'wrap hub wchub' });
  const txp = (s.phase === 'h1' || s.phase === 'h2') && w.cal && U.txPanel && C.txWindowAt(w.cal.d) ? h('div', { class: 'panel', style: { overflow: 'hidden' } }, U.txPanel(s, { my: s.ss.club, compact: true, sel: U.st.txSel, onSel: d => { U.st.txSel = d; U.stay(); } })) : null;
  const cerb = w.cal && U.cerBanner ? U.cerBanner(s, true) : null;
  const left = h('div', { style: { display: 'grid', gap: '16px', minWidth: 0 } }, wcCard(), cerb, U.actionPanel(), relMini(), setPanel());
  const right = h('div', { style: { display: 'grid', gap: '16px', minWidth: 0, alignContent: 'start' } });
  const hero = (s.phase === 'h1' || s.phase === 'h2') && w.cal && U.tourHero ? U.tourHero(s) : null;
  if (hero) right.append(h('div', { class: 'panel', style: { overflow: 'hidden', padding: '12px' } }, hero));
  if (w.cal && U.dayMatchesSec && !(U.isBusy && U.isBusy())) { try { right.append(h('div', { class: 'prof wcworld' }, U.dayMatchesSec(s, sv, today, true))); } catch (e) { console.error(e); } }
  const two = h('div', { class: 'wc2' });
  if (w.cal && U.leagueMini) { try { const lm = U.leagueMini(s, sv); if (lm) two.append(h('div', { class: 'prof' }, lm)); } catch (e) { console.error(e); } }
  if (U.newsMini) { const nm = U.newsMini(s, 6); if (nm) two.append(h('div', { class: 'prof' }, nm)); }
  if (two.childNodes.length) right.append(two);
  if (txp) right.append(txp);
  right.append(U.careerTable());
  hub.append(left, right);
  return hub;
};

// ================= 관계 페이지 =================
U.pages.rel = function () {
  const s = S(); if (!s.wc) return h('div', { class: 'empty' }, '월드 커리어에서만 쓰는 화면입니다.');
  const R0 = s.wc.rel, w = s.w, M = R0.mgr, Mx = M && w.mgr ? w.mgr[M.c] : null;
  const root = h('div', { class: 'wrap prof screen' });
  root.append(U.pageHead('관계', '숫자 대신 말로만 보여 줍니다. 같은 관계여도 결과는 확률로 갈립니다.'));
  const fitT = M ? (M.fit > .3 ? '내 스타일과 잘 맞는 편' : M.fit < -.3 ? '내 스타일과 잘 맞지 않는 편' : '스타일 궁합은 보통') : '';
  const started = s.wc.sel.slice(-5).filter(x => x === 'S').length, n5 = Math.min(5, s.wc.sel.length);
  root.append(h('div', { class: 'two' },
    h('div', { class: 'sec' }, h('h3', null, '감독'), M ? h('div', { class: 'in', style: { display: 'grid', gap: '8px' } },
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '이름'), h('b', null, M.n)),
      Mx && Mx.build ? h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '스타일'), h('span', null, `${Mx.f || ''} · ${Mx.build} · ${Mx.def || ''}`)) : null,
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '나를 보는 눈'), h('b', null, WC().mgrText(M.v))),
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '궁합'), h('span', null, fitT)),
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '함께한 기간'), h('span', null, `${fmtD(M.d0)}부터`)),
      n5 ? h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, `최근 ${n5}경기`), h('span', null, `선발 ${started}회`)) : null,
      s.wc.sel.length ? selDots(s.wc.sel) : null) : h('div', { class: 'in empty' }, '소속 구단이 없습니다.')),
    h('div', { class: 'sec' }, h('h3', null, '팬 · 대표팀'), h('div', { class: 'in', style: { display: 'grid', gap: '8px' } },
      ...Object.entries(R0.fans).sort((a, b) => (b[0] === s.car.club) - (a[0] === s.car.club)).slice(0, 6).map(([id, v]) => h('div', { class: 'kvrow' }, h('span', { class: 'cc' }, crest(w.clubs[id], 16), (w.clubs[id] || {}).name || id), h('span', null, WC().fanText(v)))),
      h('div', { class: 'kvrow' }, h('span', { class: 'cc' }, flag(s.p.nat, 16), `${C.natName(s.p.nat)} 대표팀${C.ntMgrOf ? ' · ' + ((C.ntMgrOf(w, s.p.nat) || {}).n || '') : ''}`), h('span', null, WC().ntText(R0.nt || 0)))))));
  const ml = R0.mates.filter(m => !m.gone);
  root.append(h('div', { class: 'sec' }, h('h3', null, '동료'), ml.length ? h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...ml.map(m => h('div', { class: 'wcmate' }, h('span', { class: 'chip', style: { fontSize: '10px' } }, WC().MATEK[m.k]), h('span', { class: 'lnk', onclick: () => U.openPlayer && U.openPlayer(m.id) }, m.n), h('span', { class: 'mute' }, m.pos || ''), h('span', { class: 'mute cc' }, crest(w.clubs[m.c], 14), (w.clubs[m.c] || {}).short || ''), h('span', null, WC().mateText(m.k, m.v))))) : h('div', { class: 'in empty' }, '아직 가까운 동료가 없습니다.')));
  root.append(h('div', { class: 'sec' }, h('h3', null, '성격'), h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...s.wc.per.map(k => h('div', { class: 'kvrow' }, h('b', null, WC().PER[k][0], WC().PER[k][2] ? '' : h('span', { class: 'chip gold', style: { marginLeft: '6px', fontSize: '10px' } }, '생긴 성격')), h('span', { class: 'mute', style: { fontSize: '12.5px', textAlign: 'right' } }, WC().PER[k][1]))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '최근 일'), s.wc.log.length ? h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...s.wc.log.slice(0, 20).map(x => h('div', { class: 'kvrow' }, h('span', { class: x.s > 0 ? 'up' : x.s < 0 ? 'dn' : '' }, x.t), h('span', { class: 'mute', style: { fontSize: '11px', whiteSpace: 'nowrap' } }, fmtD(x.d))))) : h('div', { class: 'in empty' }, '아직 기록이 없습니다.')));
  return root;
};

// ================= 시즌 결산: 능력치 변화 =================
U.wcGrowBox = function (g, anim) {
  const s = S(), lg = s.wc.lastGrow || {}, six1 = WC().six(s.p), six0 = lg.six0 || six1;
  const box = h('div', { class: 'wcgrow' });
  six1.forEach(([k, l, b], i) => { const a = six0[i] ? six0[i][2] : b, d = b - a;
    const v = h('b', { class: 'num' }, anim.shown ? b : a), bar = h('i', { style: { width: (anim.shown ? b : a) + '%', background: U.barCol(b) } });
    box.append(h('div', null, h('span', { class: 'lbl' }, l), h('div', { class: 'bar' }, bar), v, h('span', { class: 'd ' + (d > 0 ? 'up' : d < 0 ? 'dn' : 'dim') }, d ? (d > 0 ? '+' : '') + d : '')));
    if (!anim.shown) setTimeout(() => { U.countUp(v, a, b, 1200); bar.style.width = b + '%'; }, 500); });
  const ev = lg.ev && WC().GEV[lg.ev];
  return [h('div', { class: 'lbl' }, `능력치 변화 · OVR ${g.o0} → ${g.o1}`), ev ? h('div', { class: 'goalbar' }, h('span', { class: 'lbl' }, '이번 시즌'), h('span', null, `${ev[0]} — ${ev[1]}`), h('b', { class: lg.ev === 1 || lg.ev === 4 ? 'up' : 'dn' }, lg.ev === 1 || lg.ev === 4 ? '▲' : '▼')) : null, box].filter(Boolean);
};

// ================= 진행 중: 중계·대화 =================
const pend = { watch: null, ev: [] };
U.wcAfterMatch = m => { const s = S(); if (!s || !s.wc) return; let r; try { r = WC().onMatch(s, m); } catch (e) { console.error(e); return; } if (r.watch) pend.watch = m; if (r.ev) pend.ev.push(r.ev); };
U.wcPending = () => !!(pend.watch || pend.ev.length);
U.wcOnDay = async function (d, stop) {
  if (pend.watch) { const m = pend.watch; pend.watch = null; let r = null; try { r = await U.wcLive(m); } catch (e) { console.error(e); } if (r === 'stop') stop(); }
  while (pend.ev.length) { const b = pend.ev.shift(); let r = null; try { r = await U.wcEvent(b); } catch (e) { console.error(e); } if (r === 'stop') stop(); }
};
// 대화·사건 (진행이 잠시 멈춘다)
U.wcEvent = function (b) {
  const s = S();
  return overlay(close => {
    const body = h('div', { class: 'body' });
    const opts = h('div', { class: 'opts' });
    b.opts.forEach((o, i) => opts.append(h('button', { class: 'opt', onclick: () => choose(i) }, h('div', { class: 't' }, o.label), h('div', { class: 'd' }, o.desc || ''), h('div', { class: 'outs' }, ...o.out.map(x => h('div', { class: 'out ' + (x.good > 0 ? 'good' : x.good < 0 ? 'bad' : '') }, h('span', null, x.chip)))))));
    body.append(h('p', { class: 'mute', style: { margin: 0 } }, b.desc), opts);
    const choose = i => {
      [...opts.children].forEach((c, k) => { c.style.pointerEvents = 'none'; if (k !== i) c.style.opacity = '.35'; });
      const log = C.resolveEvent(s, b, i);
      if (s.ss) C.updateRole(s);
      body.append(h('div', { class: 'result' }, h('b', null, log.chip), log.text ? h('span', { class: 'mute', style: { fontSize: '13px' } }, log.text) : null,
        log.six && log.six.length ? h('div', { class: 'chg' }, ...log.six.map(([k, v]) => h('span', { class: 'chip ' + (v > 0 ? 'good' : 'bad') }, `${k} ${v > 0 ? '+' : ''}${v}`))) : null,
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn sm', onclick: () => close('go') }, '계속 진행'), h('button', { class: 'btn ghost sm', onclick: () => close('stop') }, '여기서 멈추기'))));
      if (log.good > 0) U.confetti(30);
    };
    return [h('div', { class: 'head' }, h('div', { class: 'lbl' }, `${fmtD(s.w.cal.d)} · ${(s.w.clubs[s.car.club] || {}).name || ''}`), h('h2', null, b.title)), body];
  }, { cls: 'wcev' });
};

// ----- 라이브 중계 (FotMob식: 시계·이벤트·실시간 통계·내 평점) -----
function findMatch(s, m) {
  if (!U.clubFx || !s.ss) return null;
  const items = U.clubFx(s, s.ss.club, 'live') || [];
  const it = items.filter(x => !x.pend && x.open && x.d === m.d && (x.a === m.opp || x.b === m.opp))[0];
  if (!it) return null;
  let o = null; const orig = U.showMatch; U.showMatch = x => { o = x; };
  try { it.open(); } catch (e) { console.error(e); } finally { U.showMatch = orig; }
  return o;
}
const SPD = [[1, '×1'], [2, '×2'], [4, '×4'], [8, '×8']];
U.wcLive = async function (m) {
  const s = S(), w = s.w;
  const o = findMatch(s, m);
  if (!o || !o.d) return null;
  let ms = null; try { ms = U.matchMs(o); } catch (e) { console.error(e); }
  const d = o.d, side = o.a === s.ss.club ? 0 : 1;
  const nameOf = id => C.MD && C.MD.nameOf ? C.MD.nameOf(id, s) : String(id);
  const meIn = d.ln ? (d.ln[side] || []).find(x => x.id === 'ME') : null;
  // 타임라인
  const T = [];
  for (const e of d.ev || []) {
    if ('gpo'.includes(e.k)) T.push({ m: e.m, s: e.s, k: 'goal', t: e.k === 'o' ? `자책골 · ${nameOf(e.p)}` : `${nameOf(e.p)}${e.k === 'p' ? ' (PK)' : ''}`, sub: e.a ? `도움 ${nameOf(e.a)}` : '', me: e.p === 'ME' || e.a === 'ME' });
    else if (e.k === 'y') T.push({ m: e.m, s: e.s, k: 'y', t: nameOf(e.p), sub: '경고', me: e.p === 'ME' });
    else if (e.k === 'r' || e.k === '2') T.push({ m: e.m, s: e.s, k: 'r', t: nameOf(e.p), sub: e.k === '2' ? '경고 누적 퇴장' : '퇴장', me: e.p === 'ME' });
  }
  if (d.ln) for (let sd = 0; sd < 2; sd++) for (const x of d.ln[sd] || []) if (!x.start && x.on > 0) T.push({ m: x.on, s: sd, k: 'sub', t: nameOf(x.id), sub: '교체 투입', me: x.id === 'ME' });
  const shots = ms && ms.shots ? ms.shots.slice().sort((a, b) => a.m - b.m) : [];
  for (const x of shots) if (x.res !== '골' && (x.big || x.p === 'ME' || x.res === '골대')) T.push({ m: x.m, s: x.s, k: 'chance', t: x.p ? nameOf(x.p) : '', sub: x.res === '골대' ? '골대 강타' : x.big ? `결정적 기회 · ${x.res}` : `슈팅 · ${x.res}`, me: x.p === 'ME' });
  T.sort((a, b) => a.m - b.m || (a.k === 'goal') - (b.k === 'goal'));
  const end = Math.max(93, ...T.map(x => x.m + 1));
  // 내 평점: 골·도움은 그 순간에, 나머지는 뛴 시간만큼 고르게
  const myR = m.played && m.rating ? m.rating : meIn ? meIn.rt : null, on0 = meIn ? meIn.on || 0 : 0, off0 = meIn ? Math.min(meIn.off || 90, end) : 0;
  const bumps = T.filter(x => x.me && x.k === 'goal').map(x => [x.m, x.t.startsWith(s.p.name) ? .6 : .35]);
  const bsum = bumps.reduce((a, x) => a + x[1], 0);
  const rAt = t => { if (!myR || t < on0) return null; const fr = clamp01((Math.min(t, off0) - on0) / Math.max(1, off0 - on0)); return Math.max(3, Math.min(10, 6 + bumps.filter(x => x[0] <= t).reduce((a, x) => a + x[1], 0) + (myR - 6 - bsum) * fr)); };
  // 통계 (반 단위 기록을 시간에 맞춰 나눈다)
  const H = ms && ms.H, POS = ms && ms.POS;
  const stat = (t, sd) => {
    const sh = shots.filter(x => x.s === sd && x.m <= t);
    const half = t <= 45 ? 0 : 1, f1 = clamp01(t / 45), f2 = clamp01((t - 45) / 45);
    const part = k => !H ? 0 : Math.round((H[0][sd][k] || 0) * f1 + (t > 45 ? (H[1][sd][k] || 0) * f2 : 0));
    const pos = POS ? (t <= 45 ? POS[0][sd] : Math.round((POS[0][sd] * 45 + POS[1][sd] * (t - 45)) / t)) : 50;
    return { sh: sh.length, sot: sh.filter(x => x.res === '골' || x.res === '선방').length, xg: sh.reduce((a, x) => a + (x.xg || 0), 0), corn: part('corn'), foul: part('foul'), pos, half };
  };
  const score = t => { let a = 0, b = 0; for (const x of T) if (x.k === 'goal' && x.m <= t) { if (x.s === 0) a++; else b++; } return [a, b]; };
  const cA = w.clubs[o.a], cB = w.clubs[o.b];
  const col = [U.teamColor ? U.teamColor(o.a, null, 0) : '#4a8', U.teamColor ? U.teamColor(o.b, null, 1) : '#a48'];
  { const rgb = x => { const c = String(x || '#888').replace('#', '').padEnd(6, '0'); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) || 0); }, dist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
    if (dist(col[0], col[1]) < 90) col[1] = dist(col[0], '#5fa8ff') > 90 ? '#5fa8ff' : '#e9ecf1'; }
  return overlay(close => {
    let t = 0, spd = s.wc.speed || 2, playing = true, done = false, timer = null;
    const clock = h('div', { class: 'lvclock' }), sc = h('div', { class: 'lvscore' }), prog = h('div', { class: 'lvprog' }, h('i'));
    const feed = h('div', { class: 'lvfeed' }), stats = h('div', { class: 'lvstats' }), me = h('div', { class: 'lvme' });
    const head = h('div', { class: 'head lvhead' }, h('div', { class: 'lbl' }, o.title || ''),
      h('div', { class: 'lvrow' }, h('div', { class: 'lvt' }, crest(cA, 36), h('b', null, (cA || {}).name || '')), h('div', { class: 'lvmid' }, sc, clock), h('div', { class: 'lvt r' }, h('b', null, (cB || {}).name || ''), crest(cB, 36))), prog);
    const shown = new Set();
    const ICON = { goal: '⚽', y: '🟨', r: '🟥', sub: '↔', chance: '◎' };
    const paint = () => {
      const [a, b] = score(t);
      sc.textContent = `${a} - ${b}`;
      clock.textContent = done ? '경기 종료' : t <= 45 ? `${Math.floor(t)}'` : t < 46 ? '하프타임' : t <= 90 ? `${Math.floor(t)}'` : `90+${Math.floor(t - 90)}'`;
      prog.firstChild.style.width = Math.min(100, t / end * 100) + '%';
      T.forEach((x, i) => { if (x.m <= t && !shown.has(i)) { shown.add(i); feed.prepend(h('div', { class: 'lvev s' + x.s + (x.me ? ' me' : '') + ' k-' + x.k }, h('span', { class: 'mn' }, U.fmtMin ? U.fmtMin(x.m) : x.m + "'"), h('span', { class: 'ic' }, ICON[x.k] || '·'), h('span', { class: 'tx' }, h('b', null, x.t), x.sub ? h('small', null, x.sub) : null))); if (x.k === 'goal') { sc.classList.remove('flash'); void sc.offsetWidth; sc.classList.add('flash'); } } });
      const A = stat(t, 0), B = stat(t, 1);
      const row = (l, va, vb, fmt) => { const tot = (va + vb) || 1; return h('div', { class: 'lvst' }, h('span', { class: 'v' }, fmt ? fmt(va) : va), h('div', { class: 'lb' }, h('span', { class: 'lbl' }, l), h('div', { class: 'bars' }, h('i', { style: { width: (va / tot * 100) + '%', background: col[0] } }), h('i', { style: { width: (vb / tot * 100) + '%', background: col[1] } }))), h('span', { class: 'v' }, fmt ? fmt(vb) : vb)); };
      stats.replaceChildren(row('점유율', A.pos, B.pos, v => v + '%'), row('슈팅', A.sh, B.sh), row('유효 슈팅', A.sot, B.sot), row('기대 득점 (xG)', +A.xg.toFixed(2), +B.xg.toFixed(2), v => v.toFixed(2)), row('코너킥', A.corn, B.corn), row('파울', A.foul, B.foul));
      const r = rAt(t);
      const on = meIn && t >= on0 && t <= off0;
      me.replaceChildren(...[h('span', { class: 'lbl' }, '내 선수'), h('b', null, s.p.name), h('span', { class: 'mute' }, !meIn ? (m.why || '출전하지 않음') : t < on0 ? `벤치 · ${on0}분 투입 예정` : on ? '출전 중' : `${Math.min(off0, 90)}분까지 출전`), r ? (U.rt1 ? U.rt1(Math.round(r * 10) / 10) : h('b', null, r.toFixed(1))) : null].filter(Boolean));
    };
    const step = () => {
      if (!playing || done) return;
      t = Math.min(end, t + .5);
      if (t >= end) { done = true; playing = false; }
      paint(); ctl();
      if (!done) timer = setTimeout(step, t > 45 && t < 46 ? 900 / spd : 260 / spd);
    };
    const ctlBox = h('div', { class: 'lvctl' });
    const ctl = () => {
      ctlBox.replaceChildren(...[
        done ? null : h('button', { class: 'btn ghost sm', onclick: () => { playing = !playing; if (playing) step(); ctl(); } }, playing ? '일시정지' : '재생'),
        done ? null : seg(SPD.map(([k, l]) => [k, l]), spd, k => { spd = k; s.wc.speed = k; }),
        done ? null : h('button', { class: 'btn ghost sm', onclick: () => { clearTimeout(timer); t = end; done = true; playing = false; paint(); ctl(); } }, '결과로'),
        h('button', { class: 'btn ghost sm', onclick: () => U.showMatch(o) }, '경기 기록'),
        h('span', { style: { flex: 1 } }),
        h('button', { class: 'btn ghost sm', onclick: () => { clearTimeout(timer); close('stop'); } }, '진행 멈추기'),
        h('button', { class: 'btn sm lvgo', onclick: () => { clearTimeout(timer); close('go'); } }, done ? '계속' : '나가기')].filter(Boolean));
    };
    paint(); ctl();
    setTimeout(step, 400);
    return [head, h('div', { class: 'body lvbody' }, me, h('div', { class: 'lvgrid' }, feed, stats), ctlBox)];
  }, { cls: 'wclive' });
};
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
})(window);
