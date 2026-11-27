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
const WATCHL = [['all', '모든 경기'], ['mine', '출전 경기'], ['big', '주요 경기'], ['none', '끔']]; // 출전 경기 = 교체 명단에 든 경기 (벤치 미출전 포함)
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
const DOTS = { S: ['선발', 'S'], B: ['교체 출전', 'B'], U: ['벤치 (미출전)', 'U'], X: ['명단 제외', 'X'], I: ['부상', 'I'] };
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
    h('div', { class: 'wcmgr' }, h('span', { class: 'lbl' }, '감독'), M ? h('span', null, h('b', { class: 'lnk', onclick: () => U.openMgr && U.openMgr(M.n) }, M.n), M.ct || ((s.w.mgr || {})[s.car.club] || {}).ct ? h('span', { class: 'mute' }, ' (대행)') : null, ' · ', WC().mgrText(M.v)) : h('span', { class: 'mute' }, '-'), s.wc.sel.length ? selDots(s.wc.sel) : null));
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
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '관계'), h('button', { class: 'btn ghost sm', onclick: () => { U.st.wcpt = 'rel'; U.setTab('profile'); } }, '자세히')),
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
// 유스 리그 순위 + 내 유스 기록
function youthPanel(s) {
  const ss = s.ss; if (!ss || !ss.ylg) return null;
  const L = ss.ylg, w = s.w, rows = C.ylgTable(L), ym = ss.matches.filter(m => m.comp === 'youth' && m.played), t = C.totalAgg(ym);
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, L.name), h('span', { class: 'mute', style: { fontSize: '12px' } }, `${Math.min(L.r, L.sched.length)}/${L.sched.length}라운드`)),
    h('div', { class: 'wcmsum' }, ...[['출전', ym.length], ['골', t.goals], ['도움', t.assists], ['평균 평점', t.rated ? C.avgRating(t).toFixed(2) : '-'], ['팀 순위', (rows.findIndex(r => r.id === ss.club) + 1) + '위'], ['승점', (L.tab[ss.club] || {}).pts || 0]].map(([l, x]) => h('div', null, h('span', { class: 'lbl' }, l), h('b', null, x)))),
    h('div', { style: { padding: '0 16px 14px' } }, h('table', { class: 'ltable lc mini' }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득실', '승점'].map(x => h('th', null, x)))),
      h('tbody', null, ...rows.map((r, i) => h('tr', { class: r.id === ss.club ? 'me' : '' }, h('td', null, i + 1), h('td', null, h('span', { class: 'cc lnk', onclick: () => U.openClub(r.id) }, crest(w.clubs[r.id] || null, 14), `${(w.clubs[r.id] || {}).name || r.id} ${L.u}`)), h('td', null, r.p), h('td', null, r.w), h('td', null, r.d), h('td', null, r.l), h('td', null, r.gf - r.ga > 0 ? '+' + (r.gf - r.ga) : r.gf - r.ga), h('td', null, h('b', null, r.pts))))))));
}
// 이적·승강으로 내 구단·리그가 바뀌면 팔로우 맨 앞으로 (리그 순위·그날 경기·뉴스가 내 리그부터)
function followSync(s, sv) {
  const w = s.w, my = s.car.club, lg = my && w.clubs[my] ? w.clubs[my].lg : null, key = my + '|' + lg;
  const H = s.wc || s; if (H.folK === key) return;
  const f = U.follow(s);
  if (my) f.club = [my].concat(f.club.filter(x => x !== my));
  if (lg) f.lg = [lg].concat(f.lg.filter(x => x !== lg));
  if (s.p.nat && !f.nat.includes(s.p.nat)) f.nat.unshift(s.p.nat);
  H.folK = key; sv.lg = lg || sv.lg;
}
U.followSync = followSync;
U.wcHub = function () {
  const s = S(), w = s.w, today = w.cal ? w.cal.d : 0;
  const sv = U.st.wcv = U.st.wcv || {};
  followSync(s, sv);
  const hub = h('div', { class: 'wrap hub wchub' });
  const txp = (s.phase === 'h1' || s.phase === 'h2') && w.cal && U.txPanel && C.txWindowAt(w.cal.d) ? h('div', { class: 'panel', style: { overflow: 'hidden' } }, U.txPanel(s, { my: s.ss.club, compact: true, sel: U.st.txSel, onSel: d => { U.st.txSel = d; U.stay(); } })) : null;
  const cerb = w.cal && U.cerBanner ? U.cerBanner(s, true) : null;
  const left = h('div', { style: { display: 'grid', gap: '16px', minWidth: 0 } }, wcCard(), cerb, U.actionPanel(), relMini(), U.wcStoryMini ? U.wcStoryMini(s) : null, setPanel(), U.wcLifeMini ? U.wcLifeMini(s) : s.car.status !== 'youth' || (s.p.money || 0) > 0 ? supPanel(s) : null, U.followManager ? h('div', { class: 'prof' }, U.followManager(s)) : null);
  const right = h('div', { style: { display: 'grid', gap: '16px', minWidth: 0, alignContent: 'start' } });
  left.dataset.dz = 'wcL'; right.dataset.dz = 'wcR'; // 홈 상자 순서 바꾸기 (ui_boxes.js)
  { const mp = myPanel(); if (mp) right.append(mp); }
  { const yp = s.car.status === 'youth' || (s.ss && s.ss.ylg && s.ss.matches.some(m => m.comp === 'youth' && m.played)) ? youthPanel(s) : null; if (yp) right.append(yp); }
  const hero = (s.phase === 'h1' || s.phase === 'h2') && w.cal && U.tourHero ? U.tourHero(s) : null;
  if (hero) right.append(h('div', { class: 'panel', style: { overflow: 'hidden', padding: '12px' } }, hero));
  if (w.cal && U.dayMatchesSec && !(U.isBusy && U.isBusy())) { try { right.append(h('div', { class: 'prof wcworld' }, U.dayMatchesSec(s, sv, today, true))); } catch (e) { console.error(e); } }
  const two = h('div', { class: 'wc2' });
  if (w.cal && U.leagueMini) { try { const lm = U.leagueMini(s, sv); if (lm) two.append(h('div', { class: 'prof' }, lm)); } catch (e) { console.error(e); } }
  if (U.newsMini) { const nm = U.newsMini(s, 6); if (nm) two.append(h('div', { class: 'prof' }, nm)); }
  if (two.childNodes.length) right.append(two);
  if (txp) right.append(txp);
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
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '이름'), h('b', { class: 'lnk', onclick: () => U.openMgr && U.openMgr(M.n) }, M.n)),
      Mx && Mx.build ? h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '스타일'), h('span', null, `${Mx.f || ''} · ${Mx.build} · ${Mx.def || ''}`)) : null,
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '나를 보는 눈'), h('b', null, WC().mgrText(M.v))),
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '궁합'), h('span', null, fitT)),
      h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, '함께한 기간'), h('span', null, `${fmtD(M.d0)}부터`)),
      n5 ? h('div', { class: 'kvrow' }, h('span', { class: 'mute' }, `최근 ${n5}경기`), h('span', null, `선발 ${started}회`)) : null,
      s.wc.sel.length ? selDots(s.wc.sel) : null) : h('div', { class: 'in empty' }, '소속 구단이 없습니다.')),
    h('div', { class: 'sec' }, h('h3', null, '팬 · 대표팀'), h('div', { class: 'in', style: { display: 'grid', gap: '8px' } },
      ...Object.entries(R0.fans).sort((a, b) => (b[0] === s.car.club) - (a[0] === s.car.club)).slice(0, 6).map(([id, v]) => h('div', { class: 'kvrow' }, h('span', { class: 'cc' }, crest(w.clubs[id], 16), (w.clubs[id] || {}).name || id), h('span', null, WC().fanText(v)))),
      h('div', { class: 'kvrow' }, h('span', { class: 'cc' }, flag(s.p.nat, 16), `${C.natName(s.p.nat)} 대표팀`, C.ntMgrOf && C.ntMgrOf(w, s.p.nat) ? h('span', null, ' · ', h('span', { class: 'lnk', onclick: () => U.openMgr && U.openMgr(C.ntMgrOf(w, s.p.nat).n) }, C.ntMgrOf(w, s.p.nat).n)) : null), h('span', null, WC().ntText(R0.nt || 0)))))));
  const ml = R0.mates.filter(m => !m.gone);
  root.append(h('div', { class: 'sec' }, h('h3', null, '동료'), ml.length ? h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...ml.map(m => h('div', { class: 'wcmate' }, h('span', { class: 'chip', style: { fontSize: '10px' } }, WC().MATEK[m.k]), h('span', { class: 'lnk', onclick: () => U.openPlayer && U.openPlayer(m.id) }, m.n), h('span', { class: 'mute' }, m.pos || ''), h('span', { class: 'mute cc' }, crest(w.clubs[m.c], 14), (w.clubs[m.c] || {}).short || ''), h('span', null, WC().mateText(m.k, m.v))))) : h('div', { class: 'in empty' }, '아직 가까운 동료가 없습니다.')));
  root.append(h('div', { class: 'sec' }, h('h3', null, '성격'), h('div', { class: 'in', style: { display: 'grid', gap: '6px' } }, ...s.wc.per.map(k => h('div', { class: 'kvrow' }, h('b', null, WC().PER[k][0], WC().PER[k][2] ? '' : h('span', { class: 'chip gold', style: { marginLeft: '6px', fontSize: '10px' } }, '생긴 성격')), h('span', { class: 'mute', style: { fontSize: '12.5px', textAlign: 'right' } }, WC().PER[k][1]))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '최근 일'), s.wc.log.length ? h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...s.wc.log.slice(0, 20).map(x => h('div', { class: 'kvrow' }, h('span', { class: x.s > 0 ? 'up' : x.s < 0 ? 'dn' : '' }, x.t), h('span', { class: 'mute', style: { fontSize: '11px', whiteSpace: 'nowrap' } }, fmtD(x.d))))) : h('div', { class: 'in empty' }, '아직 기록이 없습니다.')));
  return root;
};

// ================= 내 선수 (일반 선수 프로필과 같은 형식 + 커리어 탭) =================
// 일반 선수 화면(ui_db.playerView)과 같은 머리·2단 배치·카드를 쓰고, 경기 기록은 같은 경기 보관소('ME')에서 읽는다
const PSHK = { CDM: 'DM', CAM: 'AM' };
const PXY2 = { GK: [50, 92], CB: [50, 76], LB: [18, 76], RB: [82, 76], LWB: [18, 60], RWB: [82, 60], DM: [50, 60], CDM: [50, 60], CM: [50, 43], AM: [50, 26], CAM: [50, 26], LM: [18, 43], RM: [82, 43], LW: [18, 26], RW: [82, 26], ST: [50, 10] }; // 포지션 그리드: ST / LW AM RW / LM CM RM / LWB DM RWB / LB CB RB / GK
const CATOF = c => c === 'league' ? 'league' : c === 'cup' || c === 'lcup' ? 'cup' : c === 'cont' ? 'cont' : c === 'nt' || c === 'ntY' ? 'nt' : c === 'youth' ? 'youth' : 'league';
function itemsOf(s, list, club, lgId) {
  // list: { c 대회 종류, cn 대회 이름, p 출전, mi 분, r 평점, g, a }
  const by = new Map();
  for (const m of list) {
    const cat = CATOF(m.c); if (cat === 'nt' && m.c === 'ntY') continue;
    const key = cat === 'league' ? 'L' : cat === 'youth' ? 'Y:' + m.cn : cat === 'nt' ? 'nt:' + m.cn : m.c + ':' + m.cn;
    let it = by.get(key);
    if (!it) by.set(key, it = { key, cat: cat === 'youth' ? 'league' : cat, youth: cat === 'youth' ? 1 : 0, ylab: cat === 'youth' ? ((/U\d+/.exec(m.cn || '') || ['유스'])[0]) : '', name: m.cn, lid: cat === 'league' ? lgId : null, club: cat === 'nt' ? null : club, apps: 0, g: 0, a: 0, min: 0, rs: 0, rn: 0, nat: cat === 'nt' ? s.p.nat : null });
    if (!m.p) continue;
    it.apps++; it.g += m.g || 0; it.a += m.a || 0; it.min += m.mi || 0; if (m.r) { it.rs += m.r; it.rn++; }
  }
  return [...by.values()].map(it => Object.assign(it, { rt: it.rn ? it.rs / it.rn : null }));
}
const liveList = s => (s.ss ? s.ss.matches : []).map(m => ({ c: m.comp, cn: m.compName, p: m.played ? 1 : 0, mi: m.played ? (m.st.min || m.min || 0) : 0, r: m.rating || 0, g: m.played ? m.st.goals : 0, a: m.played ? m.st.assists : 0 }));
function meSeasons(s) {
  const w = s.w, out = [];
  for (const r of s.hist) { if (!r.club) continue; out.push({ y: r.y - 2000, label: r.label, wl: C.wLabel ? C.wLabel(r.y) : r.label, age: r.age, ovr: r.ovr1, status: r.status, club: r.club, items: itemsOf(s, (r.log || []).map(x => ({ c: x.c, cn: x.cn, p: x.p, mi: x.mi, r: x.r, g: x.g, a: x.a })), r.club, r.lgId) }); }
  if (s.ss && s.ss.on) { const lg = C.leagueOf(s); out.push({ y: w.year - 2000, label: `${s.ss.label} 진행 중`, wl: 'live', live: 1, age: s.p.age, ovr: C.ovrOf(s.p), status: s.ss.status || s.car.status, club: s.ss.club, items: itemsOf(s, liveList(s), s.ss.club, lg ? lg.id : null) }); }
  return out;
}
function mePath(s, sns) {
  // 시즌마다 유스(유스 신분이거나 유스 경기 출전)와 1군(1군 경기 출전이거나 1군 신분)을 따로 이어 붙인다
  const segs = [];
  const add = (cid, y, youth, loan, age) => { let L = null; for (let i = segs.length - 1; i >= 0; i--) if (segs[i].youth === youth) { L = segs[i]; break; }
    if (L && L.cid === cid && L.loan === loan && L.y1 >= y - 1) { L.y1 = y; L.ages.push(age); return; } segs.push({ cid, y0: y, y1: y, youth, loan, ages: [age] }); };
  for (const sn of sns) { if (!sn.club) continue;
    const yth = sn.status === 'youth' || sn.items.some(it => it.youth && it.apps > 0), sen = (sn.status && sn.status !== 'youth') || sn.items.some(it => !it.youth && it.cat !== 'nt' && it.apps > 0);
    if (yth) add(sn.club, sn.y, 1, 0, sn.age); if (sen) add(sn.club, sn.y, 0, sn.status === 'loan' ? 1 : 0, sn.age); }
  const live = sns.find(sn => sn.live);
  if (live && s.phase !== 'retired') for (const x of segs) if (x.y1 === live.y && x.cid === live.club && ((live.status === 'youth') === !!x.youth || !x.youth && live.status !== 'youth')) x.y1 = null;
  for (const x of segs) if (x.youth) { const mx = Math.max(...x.ages), mn = Math.min(...x.ages); x.ylab = mx <= 15 ? '아카데미' : mx <= 17 ? (mn <= 15 ? '아카데미·U18' : 'U18') : mn >= 18 ? 'U21' : 'U18·U21'; }
  return segs;
}
function infoCard(s) {
  const p = s.p, w = s.w, car = s.car, o = C.ovrOf(p), c = w.clubs[car.club];
  const cells = [[`${p.age}세`, `${p.born || w.year - p.age}년생`], [p.foot === 'L' ? '왼발' : '오른발', `주로 사용하는 발 · 약발 ${'★'.repeat(p.weak || 1)}`], [h('span', { class: 'pfnat' }, flag(p.nat, 18), ' ', C.natName(p.nat)), '국가'], [C.fmtEUR(s.value || 0), '이적 가치'],
    [car.status === 'free' ? '무소속' : car.status === 'loan' ? '임대 중' : car.status === 'youth' ? `${car.contract + 1}. 6. 30.` : `${car.contract + 1}. 6. 30.`, car.status === 'loan' && car.parent && w.clubs[car.parent] ? `원소속 ${w.clubs[car.parent].name}` : car.status === 'youth' ? '유스 계약 종료' : '계약 종료'],
    [String(o), 'OVR'], [car.wage ? U.wageTxt(car.wage) : '-', '주급'], [`${p.height}cm`, '키']];
  const main = PSHK[p.pos] || p.pos, others = C.POS.filter(x => x !== p.pos && C.ovrOf(p, x) >= o - 3).map(x => PSHK[x] || x).filter(x => x !== main);
  const pitch = h('div', { class: 'pfpitch' }, U.svg('<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".8"><rect x="1" y="1" width="98" height="98" rx="3"/><line x1="1" y1="50" x2="99" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="25" y="1" width="50" height="14"/><rect x="25" y="85" width="50" height="14"/></svg>'),
    ...[main].concat(others).map((k, i) => { const xy = PXY2[k] || [50, 50]; return h('span', { class: 'pfpm' + (i ? ' alt' : ''), style: { left: xy[0] + '%', top: xy[1] + '%' } }, k); }));
  const tags = [h('span', { class: 'chip' }, WC().stageOf(p.age, car.status))].concat(s.wc.per.map(k => h('span', { class: 'chip', title: WC().PER[k][1] }, `성격: ${WC().PER[k][0]}`)));
  if (s.ss && s.ss.role) tags.push(h('span', { class: 'chip' }, `팀 내 역할: ${C.ROLELABEL[s.ss.role] || s.ss.role}`));
  return h('div', { class: 'sec pfinfo' }, h('div', { class: 'pfig' }, ...cells.map(([v, l]) => h('div', null, h('b', null, v), h('small', { class: 'mute' }, l)))), h('div', { class: 'pftags' }, ...tags),
    h('div', { class: 'pfpos' }, h('div', null, h('div', { class: 'lbl' }, '포지션'), h('div', null, h('small', { class: 'mute' }, '기본'), h('b', null, C.POSKO[p.pos] || p.pos)), others.length ? h('div', null, h('small', { class: 'mute' }, '기타'), h('div', null, others.join(' · '))) : null), pitch));
}
function sixCard(s) {
  return h('div', { class: 'sec' }, h('h3', null, '능력치', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, s.p.pos === 'GK' ? ' 골키퍼 6개 대분류' : ' 6개 대분류')), h('div', { class: 'dbstats' }, ...WC().six(s.p).map(([k, l, v]) => h('div', { class: 'dbst' }, h('small', { class: 'mute' }, l), h('b', { style: { color: U.barCol(v) } }, v)))));
}
function seasonTable(s, seasons) {
  const w = s.w, v = U.st.wcpf = U.st.wcpf || { pf: 'all', open: {} };
  const CATS = [['all', '클럽 전체'], ['league', '리그'], ['cup', '국내 컵'], ['cont', '대륙 대회'], ['nt', '국가대표']], nt = v.pf === 'nt';
  // v45: 유스 기록은 시즌별 기록에서 뺀다 (경력 탭의 유스 경력 칸에만)
  const pass = it => !it.youth && (nt ? it.cat === 'nt' : it.cat !== 'nt' && (v.pf === 'all' || it.cat === v.pf));
  const mfmt = x => x == null ? '-' : x.toLocaleString() + "'";
  const tb = h('tbody'), tot = { apps: 0, g: 0, a: 0, rs: 0, ra: 0, min: 0 };
  for (const sn of seasons.slice().reverse()) {
    const items = sn.items.filter(pass); if (!items.length) continue;
    const t = items.reduce((a, it) => (a.apps += it.apps, a.g += it.g, a.a += it.a, a.min += it.min, it.rt != null && it.apps ? (a.rs += it.rt * it.apps, a.ra += it.apps) : 0, a), { apps: 0, g: 0, a: 0, rs: 0, ra: 0, min: 0 });
    const ty = items.filter(it => it.youth).reduce((a, it) => (a.apps += it.apps, a.g += it.g, a.a += it.a, a), { apps: 0, g: 0, a: 0 });
    tot.apps += t.apps - ty.apps; tot.g += t.g - ty.g; tot.a += t.a - ty.a; tot.rs += t.rs; tot.ra += t.ra; tot.min += t.min;
    const k = sn.wl + sn.y, open = v.open[k], club = items.find(it => it.club) && items.find(it => it.club).club;
    tb.append(h('tr', { class: 'click' + (open ? ' on' : '') + (sn.live ? ' live' : ''), onclick: () => { v.open[k] = !open; U.stay(); } },
      h('td', null, h('span', { class: 'mute' }, open ? '▾ ' : '▸ '), sn.label), h('td', null, nt ? h('span', { class: 'cc' }, U.natCrest(s.p.nat, 16), C.natName(s.p.nat)) : club ? h('span', { class: 'cc lnk', onclick: ev => { ev.stopPropagation(); U.openClub(club); } }, crest(w.clubs[club], 16), (w.clubs[club] || {}).name || '', sn.status === 'youth' ? h('span', { class: 'segtag' }, sn.age <= 15 ? '아카데미' : sn.age <= 17 ? 'U18' : 'U21') : null) : ''),
      h('td', null, sn.age), h('td', null, sn.ovr), h('td', null, t.apps), h('td', { class: 'mute' }, mfmt(t.min)), h('td', null, h('b', null, t.g)), h('td', null, t.a), h('td', null, t.ra ? U.rt2(t.rs / t.ra) : '-')));
    if (open) for (const it of items) tb.append(h('tr', { class: 'sub' }, h('td'), h('td', { colspan: 3 }, h('span', { class: 'cpt cp-' + ({ league: 'l', cup: 'c', cont: 'e', nt: 'n' })[it.cat] }, it.youth ? (it.ylab || '유스') : ({ league: '리그', cup: '컵', cont: '대륙', nt: '국가대표' })[it.cat]), ' ', it.name),
      h('td', null, it.apps), h('td', { class: 'mute' }, mfmt(it.min)), h('td', null, it.g), h('td', null, it.a), h('td', null, it.apps && it.rt != null ? U.rt2(it.rt) : '-')));
  }
  if (!tb.childNodes.length) tb.append(h('tr', null, h('td', { colspan: 9, class: 'mute', style: { textAlign: 'center', padding: '14px' } }, '기록이 없습니다.')));
  return h('div', { class: 'sec' }, h('h3', null, nt ? '국가대표 기록' : '시즌별 기록', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ' 시즌을 누르면 대회별 · 유스 경기는 통산에서 뺌')),
    h('div', { class: 'in pfilt' }, h('div', { class: 'seg' }, ...CATS.map(([k2, l]) => h('button', { class: v.pf === k2 ? 'on' : '', onclick: () => { v.pf = k2; U.stay(); } }, l)))),
    h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc ptable' }, h('thead', null, h('tr', null, ...['시즌', nt ? '대표팀' : '구단', '나이', 'OVR', '경기', '출전시간', '골', '도움', '평점'].map(x => h('th', null, x)))), tb,
      h('tfoot', null, h('tr', { class: 'me' }, h('td', null, '통산'), h('td'), h('td'), h('td'), h('td', null, tot.apps), h('td', { class: 'mute' }, mfmt(tot.min)), h('td', null, tot.g), h('td', null, tot.a), h('td', null, tot.ra ? U.rt2(tot.rs / tot.ra) : '-'))))));
}
function trophySec(s) {
  if (!s.trophies.length) return null;
  const w = s.w, byName = {}; for (const r of s.hist) if (r.clubName) byName[r.clubName] = r.club;
  const G2 = new Map();
  for (const t of s.trophies) { const key = t.k === 'nt' ? 'nat' : t.club; let g = G2.get(key); if (!g) G2.set(key, g = { el: t.k === 'nt' ? U.natCrest(s.p.nat, 22) : crest(w.clubs[byName[t.club]] || null, 22), title: t.k === 'nt' ? C.natName(s.p.nat) : t.club, list: new Map() }); const x = g.list.get(t.t) || { n: t.t, ys: [] }; x.ys.push(t.y); g.list.set(t.t, x); }
  return h('div', { class: 'sec' }, h('h3', null, '트로피'), h('div', { class: 'in pftr' }, ...[...G2.values()].map(g => h('div', { class: 'pftg' }, h('div', { class: 'pftgh' }, g.el, h('div', null, h('b', null, g.title))),
    ...[...g.list.values()].map(t => h('div', { class: 'pftr1' }, h('b', null, t.ys.length), U.trophy ? U.trophy('cup', 14, '#f2c14e') : '🏆', h('span', null, t.n), h('small', { class: 'mute' }, `(${t.ys.join(', ')})`)))))));
}
function awardSec(s) {
  const bd = s.hist.filter(r => r.ballon).map(r => [r.y, r.ballon]);
  const out = [];
  if (bd.length) out.push(h('div', { class: 'sec' }, h('h3', null, '발롱도르'), h('div', { class: 'in chg' }, ...bd.map(([y, r]) => h('span', { class: 'chip' + (r === 1 ? ' gold' : '') }, `${y + 1}년 ${r}위`)))));
  if (s.awards.length) out.push(h('div', { class: 'sec' }, h('h3', null, '수상'), h('div', { class: 'in chg' }, ...s.awards.map(a => h('span', { class: 'chip gold' }, `${a.y} ${a.t}${a.v ? ` (${a.v})` : ''}`)))));
  return out;
}
function injSec(s) {
  const w = s.w, L = [];
  for (const r of s.hist) for (const x of r.injuries || []) L.push(Object.assign({ club: r.club }, x));
  if (s.ss) for (const x of s.ss.injuries || []) L.push(Object.assign({ club: s.ss.club }, x));
  L.sort((a, b) => b.d - a.d);
  if (!L.length) return h('div', { class: 'sec' }, h('h3', null, '부상 이력'), h('div', { class: 'empty' }, '부상 기록이 없습니다.'));
  const now = w.cal ? w.cal.d : 0, tot = L.reduce((a, x) => a + (x.days || 0), 0);
  return h('div', { class: 'sec' }, h('h3', null, '부상 이력', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${L.length}회 · 결장 ${tot}일`)),
    h('div', { class: 'in pfinj' }, ...L.map(x => { const cur = x.d + x.days > now; return h('div', { class: 'pfij' + (cur ? ' cur' : '') }, h('div', { class: 'pfijt' }, h('b', null, x.kind || '부상'), cur ? h('span', { class: 'injb' }, '치료 중') : null), h('span', { class: 'pfijd' }, `${x.days}일`),
      h('small', { class: 'mute' }, crest(w.clubs[x.club] || null, 13), ` ${(w.clubs[x.club] || {}).name || ''} · ${fmtD(x.d)} ~ ${fmtD(x.d + x.days)}`)); })));
}
// 성장: 시즌별 OVR·대분류·가치
function growTab(s) {
  const H = s.wc.sixH || [], w = s.w;
  const cur = { label: '지금', age: s.p.age, ovr: C.ovrOf(s.p), six: WC().six(s.p).map(x => x[2]), v: s.value };
  const rows = H.concat([cur]);
  const heads = WC().six(s.p).map(x => x[1]);
  const pts = rows.map((r, i) => [i, r.ovr]), W = 640, Hh = 170, pad = 28;
  const mn = Math.min(...pts.map(x => x[1])) - 3, mx = Math.max(...pts.map(x => x[1])) + 3, X = i => pad + (pts.length > 1 ? i / (pts.length - 1) : .5) * (W - pad * 2), Y = v => 12 + (1 - (v - mn) / Math.max(1, mx - mn)) * (Hh - 36);
  const chart = pts.length > 1 ? U.svg(`<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto"><polyline fill="none" stroke="#f2c14e" stroke-width="2" points="${pts.map(([i, v]) => X(i) + ',' + Y(v)).join(' ')}"/>${pts.map(([i, v]) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#f2c14e" stroke="var(--panel)" stroke-width="2"/><text x="${X(i)}" y="${Y(v) - 9}" font-size="11" fill="var(--fg)" text-anchor="middle">${v}</text><text x="${X(i)}" y="${Hh - 6}" font-size="10.5" fill="var(--mute)" text-anchor="middle">${esc(String(rows[i].label))}</text>`).join('')}</svg>`) : h('div', { class: 'empty' }, '시즌이 끝나면 그려집니다.');
  return [h('div', { class: 'sec' }, h('h3', null, 'OVR 추이'), h('div', { class: 'in' }, chart)),
    h('div', { class: 'sec' }, h('h3', null, '시즌별 능력치'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc ptable' }, h('thead', null, h('tr', null, ...['시즌', '나이', 'OVR'].concat(heads, ['갈림길', '가치']).map(x => h('th', null, x)))),
      h('tbody', null, ...rows.slice().reverse().map((r, i, a) => { const pv = a[i + 1]; return h('tr', null, h('td', null, r.label), h('td', null, r.age), h('td', null, h('b', null, r.ovr)), ...r.six.map((v, j) => h('td', null, v, pv && pv.six[j] !== v ? h('small', { class: 'mute' }, ` ${v - pv.six[j] > 0 ? '+' : ''}${v - pv.six[j]}`) : null)), h('td', { class: 'mute' }, r.ev ? WC().GEV[r.ev][0] : ''), h('td', { class: 'mute' }, r.v != null ? C.fmtEUR(r.v) : '')); }))))),
    h('div', { class: 'sec' }, h('h3', null, '성장 방식'), h('div', { class: 'in mute', style: { fontSize: '13px', lineHeight: 1.6 } }, '6개 대분류만 오르내리고, 세부 능력치는 처음 정해진 개인 편차를 유지한 채 함께 움직입니다. 성장은 다른 선수들과 같은 방식으로 출전·활약·나이와 시즌마다의 갈림길에 따라 갈립니다.'))];
}
// 일지: 선택한 대화·사건, 관계 변화, 이적
function logTab(s) {
  const w = s.w, L = [];
  for (const e of s.evLog || []) L.push({ d: e.d, y: e.y, t: e.title, sub: `${e.choice} → ${e.chip}`, k: '대화' });
  for (const x of s.wc.log || []) L.push({ d: x.d, t: x.t, k: '관계' });
  for (const j of s.clubsJoined || []) L.push({ d: null, y: j.y, t: `${(w.clubs[j.club] || {}).name || j.club} ${j.type === 'youth' ? '유스 입단' : j.type === 'loan' ? '임대' : j.type === 'pro' ? '1군 계약' : '이적'}${j.fee ? ` · ${C.fmtEUR(j.fee)}` : ''}`, k: '이적' });
  L.sort((a, b) => (b.d || C.day(b.y, 8, 1)) - (a.d || C.day(a.y, 8, 1)));
  return [h('div', { class: 'sec' }, h('h3', null, '커리어 일지', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${L.length}개`)), L.length ? h('div', { class: 'in', style: { display: 'grid', gap: '2px' } }, ...L.slice(0, 200).map(x => h('div', { class: 'wclog' }, h('span', { class: 'mute' }, x.d ? fmtD(x.d) : `${x.y}년 여름`), h('span', { class: 'chip', style: { fontSize: '10px' } }, x.k), h('div', null, h('b', null, x.t), x.sub ? h('small', { class: 'mute' }, x.sub) : null)))) : h('div', { class: 'in empty' }, '아직 기록이 없습니다.'))];
}
function wcProfile() {
  const s = S(), w = s.w, p = s.p, c = w.clubs[s.car.club], v = U.st.wcpt = U.st.wcpt || 'pf';
  const root = h('div', { class: 'wrap prof screen wcprof' });
  root.append(h('div', { class: 'sec ehead' }, h('div', { class: 'in dbhead' }, flag(p.nat, 36),
    h('div', null, h('h2', { style: { margin: 0 } }, p.name), h('div', { class: 'mute' }, [C.natName(p.nat), p.pos, `${p.age}세`, s.car.status === 'free' ? '무소속' : s.phase === 'retired' ? '은퇴' : `계약 ${s.car.contract + 1}년 6월까지`].join(' · '))),
    h('div', { class: 'dbstat' }, h('div', { class: 'lbl' }, 'OVR'), h('b', null, C.ovrOf(p))),
    c ? h('div', { class: 'dbclub' }, h('span', { class: 'cc lnk', onclick: () => U.openClub(c.id) }, crest(c, 26), h('b', null, c.name)), h('div', { class: 'mute', style: { fontSize: '12px' } }, (w.lg[c.lg] || {}).name || '')) : h('div', { class: 'dbclub' }, h('span', { class: 'fachip' }, s.phase === 'retired' ? '은퇴' : '무소속')))));
  // v45: 다른 선수 프로필과 같은 구성 — 데스크톱은 2단(전부 보임), 모바일은 개요·시즌·경력·부상 탭. 커리어 전용 탭(관계·성장·에이전트·일지)만 더한다
  const TB = [['pf', '프로필'], ['story', '스토리'], ['agent', '에이전트·생활'], ['rel', '관계'], ['grow', '성장'], ['log', '커리어 일지']].filter(([k]) => (k !== 'agent' || U.wcAgentTab) && (k !== 'story' || U.wcStoryTab));
  const pm = U.st.wcpm = U.st.wcpm || 'ov';
  root.append(h('div', { class: 'mtabs wcptabs dsk' }, ...TB.map(([k, l]) => h('button', { class: v === k ? 'on' : '', onclick: () => { U.st.wcpt = k; U.stay(); } }, l))));
  const MT = [['ov', '개요'], ['st', '시즌'], ['car', '경력'], ['inj', '부상']].map(([k, l]) => [k, l, 'pf']).concat(TB.filter(([k]) => k !== 'pf').map(([k, l]) => [k, k === 'log' ? '일지' : k === 'agent' ? '에이전트' : l, k]));
  root.append(h('div', { class: 'pftabs pft7' }, ...MT.map(([k, l, view]) => h('button', { class: (view === 'pf' ? v === 'pf' && pm === k : v === view) ? 'on' : '', onclick: () => { U.st.wcpt = view; if (view === 'pf') U.st.wcpm = k; U.stay(); } }, l))));
  if (v === 'rel') { const r = U.pages.rel(); [...r.children].slice(1).forEach(x => root.append(x)); return root; }
  if (v === 'grow') { root.append(...growTab(s)); return root; }
  if (v === 'log') { root.append(...logTab(s)); return root; }
  if (v === 'agent' && U.wcAgentTab) { root.append(...U.wcAgentTab(s)); return root; }
  if (v === 'story' && U.wcStoryTab) { root.append(...U.wcStoryTab(s)); return root; }
  const main = h('div', { class: 'pfm' }), side = h('div', { class: 'pfs' }), pf2 = h('div', { class: 'pf2' }, main, side);
  pf2.dataset.tab = pm; root.append(pf2);
  const tag = (el, k) => { if (el) el.dataset.pt = k; return el; };
  const seasons = meSeasons(s), P = { n: p.name, nat: p.nat, pos: p.pos };
  main.append(tag(infoCard(s), 'ov'), tag(sixCard(s), 'ov'));
  // 이적 가치 그래프: 일반 선수와 같은 그림 (시즌마다 기록한 가치 + 지금)
  if (U.pfValueChart) { try { const now = w.cal ? C.ymd(w.cal.d) : [w.year, 8];
    const vp = (s.vh || []).map(x => ({ x: x.y + 7 / 12, v: Math.max(10000, x.v || 0), cid: x.club })).concat((s.vm || []).map(x => { const [yy, mm] = C.ymd(x.d); return { x: yy + (mm - 1) / 12, v: Math.max(10000, x.v || 0), cid: x.club }; })).sort((a, b) => a.x - b.x).filter((x, i, A) => !i || x.x - A[i - 1].x > .02).concat([{ x: now[0] + (now[1] - 1) / 12, v: Math.max(10000, s.value || 0), cid: s.car.club, now: 1 }]);
    const vc = U.pfValueChart(s, 'ME', null, c, Object.assign({ vpts: vp }, P)); if (vc) main.append(tag(vc, 'ov')); } catch (e) { console.error(e); } }
  if (U.pfSeason && seasons.length) { try { const blk = U.pfSeason(s, 'ME', null, c, P, seasons.filter(sn => sn.items.some(it => !it.youth)).map(sn => Object.assign({}, sn, { items: sn.items.filter(it => !it.youth) }))); main.append(...blk.main.map(x => tag(x, 'st'))); side.append(...blk.side.map(x => tag(x, 'st'))); } catch (e) { console.error(e); } }
  main.append(tag(seasonTable(s, seasons), 'car'));
  const path = mePath(s, seasons);
  if (U.pfCareer && path.length) { try { side.append(tag(U.pfCareer(s, 'ME', P, path, seasons), 'car')); } catch (e) { console.error(e); } }
  const tr = trophySec(s); if (tr) side.append(tag(tr, 'car'));
  side.append(...awardSec(s).map(x => tag(x, 'car')), tag(injSec(s), 'inj'));
  // 그 탭에 보일 게 없으면 (예: 부상 이력 없음) 안내
  for (const k of ['ov', 'st', 'car', 'inj']) if (![...main.children, ...side.children].some(el => el.dataset.pt === k)) main.append(tag(h('div', { class: 'sec' }, h('div', { class: 'empty' }, k === 'st' ? '이번 시즌 경기 기록이 아직 없습니다.' : k === 'inj' ? '부상 이력이 없습니다.' : '기록이 없습니다.')), k));
  return root;
}
U.wcProfile = wcProfile;
{ const pf0 = U.pages.profile; U.pages.profile = function () { const s = S(); return s && s.wc ? wcProfile() : pf0.apply(this, arguments); }; }

// ================= 내 경기 (출전 기록을 한눈에) =================
// 한 줄: 날짜 · 대회 · 상대(홈/원정) · 점수 · 출전(선발/교체 분) · 골·도움 · 평점
U.wcMyRow = function (m, onOpen) {
  const s = S(), w = s.w, res = m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : (m.pens === 'W' ? 'W' : m.pens === 'L' ? 'L' : 'D');
  const nt = m.comp === 'nt' || m.comp === 'ntY', oc = !nt ? w.clubs[m.opp] : null;
  const st = m.st || {}, mins = m.played ? (st.min || m.min || 0) : 0;
  const play = !m.played ? h('span', { class: 'wcmp no' }, m.why || '미출전') : h('span', { class: 'wcmp' + (m.start ? ' st' : ' sb') }, m.start ? `선발 ${mins}'` : `교체 ${mins}'`);
  const ev = m.evm || m.em || null, tms = k => ev ? ev.filter(x => k.includes(x[1])).map(x => (U.fmtMin ? U.fmtMin(x[0]) : x[0] + "'")) : [];
  const gl = st.goals || m.g || 0, as = st.assists || m.a || 0;
  const ga = m.played ? [gl ? `⚽ ${gl}골${tms('gp').length ? ' ' + tms('gp').join(' ') : ''}` : '', as ? `🅰 ${as}도움${tms('a').length ? ' ' + tms('a').join(' ') : ''}` : '', st.red ? `🟥 퇴장${tms('r').length ? ' ' + tms('r')[0] : ''}` : '', m.injury ? `부상 ${m.injury.days}일` : ''].filter(Boolean).join(' · ') : '';
  return h('div', { class: 'wcmr' + (m.played ? '' : ' np') + (onOpen ? ' click' : ''), onclick: onOpen || null },
    h('span', { class: 'mute d' }, C.fmtDate(m.d)), U.compTag ? U.compTag(m.comp, m.compName, m.stage) : h('span', null, m.compName),
    h('span', { class: 'o' }, nt ? U.natCrest(m.opp, 16) : crest(oc || null, 16), h('b', null, m.oppName), h('small', { class: 'mute' }, m.home == null ? ' 중립' : m.home ? ' 홈' : ' 원정')),
    h('span', { class: 'res ' + res }, `${m.gf}-${m.ga}${m.pens ? ' PK' : ''}`), play, h('span', { class: 'ga' }, ga), m.played && m.rating ? U.rt1(m.rating) : h('span', { class: 'rt r0' }, '–'));
};
const openMine = m => () => { const s = S(); const o = findMatch(s, m); if (o) U.showMatch(o); else toast('이 경기는 상세 기록이 없습니다 (유스·국가대표 일부).'); };
U.wcOpenMine = openMine;
function myPanel() {
  const s = S(); if (!s.ss) return null;
  const v = U.st.wcmine = U.st.wcmine || { all: false };
  const ms = s.ss.matches.slice().reverse(), shown = ms.filter(m => v.all || m.played || m.bench);
  const pro = ms.filter(m => m.played && !['youth'].includes(m.comp)), t = C.totalAgg(pro);
  const starts = pro.filter(m => m.start).length, bench = ms.filter(m => !m.played && m.bench).length, unused = ms.filter(m => !m.played && !m.bench && m.comp !== 'youth').length;
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '이번 시즌 내 경기'), h('div', { style: { display: 'flex', gap: '6px' } }, seg([[false, '명단 포함'], [true, '전체']], v.all, k => { v.all = k; U.stay(); }), h('button', { class: 'btn ghost sm', onclick: () => U.setTab('mx') }, '전체 기록'))),
    h('div', { class: 'wcmsum' }, ...[['출전', `${pro.length}`], ['선발', `${starts}`], ['벤치', `${bench}`], ['명단 제외', `${unused}`], ['골', t.goals], ['도움', t.assists], ['평균 평점', t.rated ? C.avgRating(t).toFixed(2) : '-']].map(([l, x]) => h('div', null, h('span', { class: 'lbl' }, l), h('b', null, x)))),
    shown.length ? h('div', { class: 'wcml' }, ...shown.slice(0, 12).map(m => U.wcMyRow(m, openMine(m)))) : h('div', { class: 'mute', style: { padding: '4px 16px 14px', fontSize: '13px' } }, ms.length ? '아직 출전한 경기가 없습니다.' : '아직 치른 경기가 없습니다.'),
    shown.length > 12 ? h('div', { class: 'mute', style: { padding: '0 16px 12px', fontSize: '12px' } }, `최근 12경기 · 전체 ${shown.length}경기는 '전체 기록'에서`) : null);
}
U.wcMyPanel = myPanel;

// ================= 이적 협상 · 직접 제안 · 지원 스태프 (v42) =================
const WPCT = [[.9, '90%'], [1, '100%'], [1.15, '115%'], [1.3, '130%'], [1.5, '150%'], [1.75, '175%']];
function askBox(s, base, init, onChange) {
  const a = Object.assign({ role: init.role, pct: 1, years: init.years }, init.a || {});
  const roleSeg = seg(WC().ROLES.map(r => [r, C.ROLELABEL[r]]), a.role, k => { a.role = k; onChange(a); });
  const wl = h('b', { class: 'num' }, U.wageTxt(Math.round(base * a.pct / 100) * 100));
  const wSeg = seg(WPCT.map(([k, l]) => [k, l]), a.pct, k => { a.pct = k; wl.textContent = U.wageTxt(Math.round(base * a.pct / 100) * 100); onChange(a); });
  const ySeg = seg([1, 2, 3, 4, 5].map(y => [y, y + '년']), a.years, k => { a.years = k; onChange(a); });
  return { a, el: h('div', { class: 'wcneg' }, h('span', { class: 'lbl' }, '역할'), roleSeg, h('span', { class: 'lbl' }, '주급'), h('div', { style: { display: 'grid', gap: '4px' } }, wSeg, h('div', { class: 'mute', style: { fontSize: '12px' } }, '요구액 ', wl, ` (구단 기준 대비)`)), h('span', { class: 'lbl' }, '계약 기간'), ySeg) };
}
const askOf = (a, base) => ({ role: a.role, wage: Math.round(base * a.pct / 100) * 100, years: a.years });
const termTxt = x => `${C.ROLELABEL[x.role]} · ${U.wageTxt(x.wage)} · ${x.years}년`;
const NEGNOTE = '주급을 낮게 받으면 합의는 쉽지만 구단은 그만큼 싼 자원으로 봅니다. 높게 받으면 출전 기대와 팬의 눈높이도 함께 올라갑니다. 약속받은 역할과 실제가 다르면 문제가 됩니다.';
U.wcNeg = function (i) {
  const s = S(), o = s.offers[i]; if (!o) return;
  const c = s.w.clubs[o.club], ng = WC().negInit(s, o), base = ng.w0;
  return overlay(close => {
    const res = h('div');
    const box = askBox(s, base, { role: o.role, years: o.years }, () => {});
    const send = () => {
      const r = WC().negAsk(s, o, askOf(box.a, base));
      if (r.ok) res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, '합의했습니다'), h('span', { class: 'mute' }, termTxt(o)), h('span', { class: 'mute', style: { fontSize: '12px' } }, '이적 제안 목록에서 수락하면 입단합니다.'), h('button', { class: 'btn sm', style: { justifySelf: 'start' }, onclick: () => { U.save(); close(); U.stay(); } }, '확인')));
      else if (r.gone) res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, '협상이 끝났습니다'), h('span', { class: 'mute' }, r.why), h('button', { class: 'btn sm', style: { justifySelf: 'start' }, onclick: () => { U.save(); close(); U.stay(); } }, '닫기')));
      else res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, '구단의 수정안'), h('span', { class: 'mute' }, r.why), h('div', null, termTxt(r.counter)),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn sm', onclick: () => { WC().negTake(s, o); U.save(); close(); U.stay(); toast('수정안으로 합의했습니다. 목록에서 수락하면 입단합니다.'); } }, '수정안 받아들이기'), h('button', { class: 'btn ghost sm', onclick: () => res.replaceChildren() }, '다시 제시하기'), h('button', { class: 'btn ghost sm', onclick: () => { U.save(); close(); U.stay(); } }, '그만두기'))));
    };
    return [h('div', { class: 'head' }, h('div', { class: 'lbl' }, '이적 협상'), h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, crest(c, 32), h('div', null, h('h2', { style: { margin: 0 } }, c.name), h('div', { class: 'mute', style: { fontSize: '12.5px' } }, `${(s.w.lg[c.lg] || {}).name || ''} · 구단 제시: ${termTxt({ role: ng.r0 === o.role ? o.role : o.role, wage: base, years: ng.y0 })}`)))),
      h('div', { class: 'body' }, box.el, h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, NEGNOTE), h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn', onclick: send }, '조건 제시'), h('button', { class: 'btn ghost', onclick: () => close() }, '닫기')), res)];
  }, { cls: 'wcev' });
};
function clubSource(w, q) {
  q = (U.fold ? U.fold(q) : q.toLowerCase()); if (q.length < 1) return [];
  const f = t => (U.fold ? U.fold(t) : String(t || '').toLowerCase());
  return Object.values(w.clubs).filter(c => c.lg && (f(c.name).includes(q) || f(c.en).includes(q))).map(c => ({ c, sc: (f(c.name).startsWith(q) || f(c.en).startsWith(q) ? 2 : 1) + c.str / 100 })).sort((a, b) => b.sc - a.sc).slice(0, 12)
    .map(({ c }) => ({ label: c.name, sub: `${(w.lg[c.lg] || {}).name || ''} · 전력 ${c.str.toFixed(1)}`, el: crest(c, 16), id: c.id }));
}
U.wcDirect = function () {
  const s = S(), w = s.w;
  return overlay(close => {
    const card = h('div'), res = h('div');
    let cid = null, box = null, base = 0;
    const pickC = id => {
      cid = id; const c = w.clubs[id]; C.materialize(w, c); base = WC().baseWage(s, c);
      const r0 = C.roleAt(s, c);
      box = askBox(s, base, { role: r0, years: s.p.age >= 31 ? 1 : 3 }, () => {});
      card.replaceChildren(h('div', { class: 'wcdc' }, crest(c, 36), h('div', null, h('b', null, c.name), h('div', { class: 'mute', style: { fontSize: '12.5px' } }, `${(w.lg[c.lg] || {}).name || ''} · 전력 ${c.str.toFixed(1)} · 내 예상 역할 ${C.ROLELABEL[r0]} · 이 구단 기준 주급 ${U.wageTxt(base)}`))), box.el,
        h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn', onclick: send }, '제안 보내기')));
      res.replaceChildren();
    };
    const send = () => {
      if (!cid) return;
      const r = WC().direct(s, cid, askOf(box.a, base)), c = w.clubs[cid];
      U.save();
      if (r.no) { res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, `${c.name}: 관심 없음`), h('span', { class: 'mute' }, r.why), h('span', { class: 'mute', style: { fontSize: '12px' } }, `남은 직접 제안 ${WC().directLeft(s)}번`))); return; }
      if (r.ok) res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, `${c.name}이(가) 조건을 받아들였습니다`), h('span', { class: 'mute' }, termTxt(r.o)), h('span', { class: 'mute', style: { fontSize: '12px' } }, r.o.acc === false ? '현 구단은 아직 이적료 제안을 거절한 상태입니다. 목록에서 이적 요청을 할 수 있습니다.' : '이적 제안 목록에서 수락하면 입단합니다.'), h('button', { class: 'btn sm', style: { justifySelf: 'start' }, onclick: () => { close(); U.stay(); } }, '확인')));
      else if (r.gone) res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, `${c.name}: 협상 결렬`), h('span', { class: 'mute' }, r.why)));
      else res.replaceChildren(h('div', { class: 'result neu' }, h('b', null, `${c.name}의 수정안`), h('span', { class: 'mute' }, r.why || ''), h('div', null, termTxt(r.counter)),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn sm', onclick: () => { WC().negTake(s, r.o); U.save(); close(); U.stay(); toast('수정안으로 합의했습니다. 목록에서 수락하면 입단합니다.'); } }, '수정안 받아들이기'), h('button', { class: 'btn ghost sm', onclick: () => { close(); U.stay(); } }, '목록에서 계속 협상'))));
    };
    const ac = U.acInput ? U.acInput({ placeholder: '구단 이름 (영문도 가능)', source: q => clubSource(w, q), onPick: x => pickC(x.id), onCommit: () => {} }) : h('div', { class: 'mute' }, '검색을 쓸 수 없습니다.');
    return [h('div', { class: 'head' }, h('div', { class: 'lbl' }, `구단에 직접 제안 · 남은 횟수 ${WC().directLeft(s)}번`), h('h2', null, '어느 구단에 가고 싶나요?')),
      h('div', { class: 'body' }, ac, card, h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, NEGNOTE + ' 직접 제안을 보내면 지금 구단도 그 사실을 알게 됩니다.'), res)];
  }, { cls: 'wcev' });
};
function supPanel(s) {
  const W = s.wc, SUP = WC().SUP, U0 = W.sup || {};
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '지원 스태프·생활'), h('span', { class: 'mute', style: { fontSize: '12px' } }, `재산 ${C.fmtEUR(Math.max(0, s.p.money || 0))} · 주급 ${s.car.wage ? U.wageTxt(s.car.wage) : '-'}`)),
    h('div', { style: { display: 'grid', gap: '6px', padding: '0 16px 14px' } },
      ...Object.keys(SUP).map(k => h('div', { class: 'wcsup' }, h('div', null, h('b', null, SUP[k][0]), h('small', { class: 'mute' }, SUP[k][1])), h('span', { class: 'mute', style: { fontSize: '12px', whiteSpace: 'nowrap' } }, `${C.fmtEUR(WC().supCost(s, k))} /시즌`),
        h('button', { class: 'btn sm' + (U0[k] ? '' : ' ghost'), onclick: () => { const r = WC().supSet(s, k, !U0[k]); if (r.no) toast(r.why); U.save(); U.stay(); } }, U0[k] ? '계약 중' : '계약'))),
      h('div', { class: 'mute', style: { fontSize: '11.5px' } }, '계약할 때 한 시즌 비용을 내고, 시즌이 끝날 때마다 다음 시즌 비용이 나갑니다. 재산이 모자라면 자동으로 끝납니다.')));
}
U.wcSupPanel = supPanel;

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
// 내가 뛴 경기의 골·도움·카드 시간 (경기 기록이 저장된 뒤 그 기록에서): m.evm = [[분, 'g'|'p'|'a'|'y'|'r'|'o']]
U.wcAnnot = function (m) {
  const s = S(); if (!m || !m.played || m.evm || m.comp === 'youth' || m.comp === 'ntY') return;
  const st = m.st || {}; if (!(st.goals || st.assists || st.yellow || st.red)) { m.evm = []; return; }
  const o = findMatch(s, m); if (!o || !o.d) return;
  m.evm = (o.d.ev || []).filter(e => e.p === 'ME' || e.a === 'ME').map(e => [e.m, e.p === 'ME' ? (e.k === '2' ? 'r' : e.k) : 'a']).filter(x => 'gpayro'.includes(x[1]));
};
U.wcOnDay = async function (d, stop) {
  if (S().ss) for (const m of S().ss.matches) if (m.d === d && m.played && !m.evm) { try { U.wcAnnot(m); } catch (e) { console.error(e); } }
  if (pend.watch) { const m = pend.watch; pend.watch = null; let r = null; try { r = await U.wcLive(m); } catch (e) { console.error(e); } if (r === 'stop') stop(); }
  while (pend.ev.length) { const b = pend.ev.shift(); let r = null; try { r = await U.wcEvent(b); } catch (e) { console.error(e); } if (r === 'stop') stop(); }
};
// 대화·사건 (진행이 잠시 멈춘다)
U.wcEvent = function (b) {
  const s = S();
  return overlay(close => {
    const body = h('div', { class: 'body' });
    const opts = h('div', { class: 'opts' });
    // 갈림길만 보여 준다: 결과·확률·색 없음 (선택하면 보이지 않는 확률로 갈린다)
    b.opts.forEach((o, i) => opts.append(h('button', { class: 'opt', onclick: () => choose(i) }, h('div', { class: 't' }, o.label), h('div', { class: 'd' }, o.desc || ''))));
    body.append(h('p', { class: 'mute', style: { margin: 0 } }, b.desc), opts);
    // X·Esc·뒤로: 고르기 전에는 안내만 (이 대화는 골라야 진행된다), 고른 뒤에는 '여기서 멈추기'와 같다
    let picked = false;
    close.x = () => { if (picked) close('stop'); else U.toast('선택지를 하나 골라야 진행됩니다.'); };
    const choose = i => {
      if (picked) return; picked = true;
      [...opts.children].forEach((c, k) => { c.style.pointerEvents = 'none'; if (k !== i) c.style.opacity = '.35'; else c.classList.add('picked'); });
      const log = C.resolveEvent(s, b, i);
      if (s.ss) C.updateRole(s);
      body.append(h('div', { class: 'result neu' }, h('b', null, log.chip), log.text ? h('span', { class: 'mute', style: { fontSize: '13px' } }, log.text) : null,
        log.six && log.six.length ? h('div', { class: 'chg' }, ...log.six.map(([k, v]) => h('span', { class: 'chip' }, `${k} ${v > 0 ? '+' : ''}${v}`))) : null,
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('button', { class: 'btn sm', onclick: () => close('go') }, '계속 진행'), h('button', { class: 'btn ghost sm', onclick: () => close('stop') }, '여기서 멈추기'))));
    };
    return [h('div', { class: 'head' }, h('div', { class: 'lbl' }, `${fmtD(s.w.cal.d)} · ${(s.w.clubs[s.car.club] || {}).name || ''}`), h('h2', null, b.title)), body];
  }, { cls: 'wcev' });
};

// ----- 라이브 중계 (FotMob식: 시계·이벤트·실시간 통계·내 평점) -----
function findAt(s, clubId, d, src, opp) {
  if (!U.clubFx) return null;
  const items = U.clubFx(s, clubId, src || 'live') || [];
  const it = items.filter(x => !x.pend && x.open && x.d === d && (!opp || x.a === opp || x.b === opp))[0];
  if (!it) return null;
  let o = null; const orig = U.showMatch; U.showMatch = x => { o = x; };
  try { it.open(); } catch (e) { console.error(e); } finally { U.showMatch = orig; }
  return o;
}
// 내 경기 기록(커리어 공통)에서 경기 상세 열기: 지난 시즌은 경기 보관소를 불러온 뒤
U.openMyMatch = function (clubId, d, wy) {
  const s = S(), live = wy == null || (s.w.cal && wy === s.w.year), src = live ? 'live' : C.wLabel(wy);
  const go = () => { const o = findAt(s, clubId, d, src); if (o) U.showMatch(o); else toast('이 경기는 상세 기록이 없습니다.'); };
  if (live || U.mxCached(src)) go(); else { toast('경기 기록을 불러오는 중…', 1500); U.withMx(src, go); }
};
// 대표팀 경기 (A매치·국제 대회): 그날 기록된 행에서 찾는다 (v46)
function findNt(s, m) {
  const w = s.w, nat = s.p.nat, cal = w.cal; if (!cal || !C.MD) return null;
  const st = U.liveSt ? U.liveSt() : null;
  const hit = (rows, title, key) => { const r = (rows || []).find(x => x[8] === m.d && (x[1] === nat || x[2] === nat) && (x[1] === m.opp || x[2] === m.opp)); if (!r) return null; return { title: `${title} · ${r[0]} · ${C.fmtDateY(r[8])}`, a: r[1], b: r[2], ga: r[3], gb: r[4], pw: r[7] || null, d: C.MD.decode(st, r), nat: true, key: key + '|' + r[1] + '|' + r[2] + '|' + r[0] }; };
  for (const k in cal.intl || {}) { const T = cal.intl[k]; const x = hit((cal.h[k] || {}).rows, `${T.n} ${T.y}`, 'I|' + T.k + '|' + T.y); if (x) return x; }
  for (const k in cal.h) if (k.startsWith('A:')) { const c = k.split(':')[1]; const x = hit(cal.h[k].rows, (C.TDEF && C.TDEF[c] && C.TDEF[c].name) || 'A매치', 'A|' + k); if (x) return x; }
  if (st && st.INTL) for (const k in st.INTL) { const x = hit(st.INTL[k], (C.TDEF && C.TDEF[k] && C.TDEF[k].name) || k, 'S|' + k); if (x) return x; }
  return null;
}
function findMatch(s, m) {
  if (m && m.comp === 'nt') { try { return findNt(s, m); } catch (e) { console.error(e); return null; } }
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
  const d = o.d, side = o.nat ? (o.a === s.p.nat ? 0 : 1) : o.a === s.ss.club ? 0 : 1;
  const nameOf = id => C.MD && C.MD.nameOf ? C.MD.nameOf(id, s) : String(id);
  const meIn = d.ln ? (d.ln[side] || []).find(x => x.id === 'ME') : null, meBench = !meIn && d.bn && (d.bn[side] || []).includes('ME');
  // 타임라인
  const T = [];
  for (const e of d.ev || []) {
    if ('gpo'.includes(e.k)) T.push({ m: e.m, s: e.s, k: 'goal', e, t: e.k === 'o' ? `자책골 · ${nameOf(e.p)}` : `${nameOf(e.p)}${e.k === 'p' ? ' (PK)' : ''}`, sub: e.a ? `도움 ${nameOf(e.a)}` : '', me: e.p === 'ME' || e.a === 'ME' });
    else if (e.k === 'y') T.push({ m: e.m, s: e.s, k: 'y', t: nameOf(e.p), sub: '경고', me: e.p === 'ME' });
    else if (e.k === 'r' || e.k === '2') T.push({ m: e.m, s: e.s, k: 'r', e, t: nameOf(e.p), sub: e.k === '2' ? '경고 누적 퇴장' : '퇴장', me: e.p === 'ME' });
  }
  if (d.ln) for (let sd = 0; sd < 2; sd++) for (const x of d.ln[sd] || []) if (!x.start && x.on > 0) T.push({ m: x.on, s: sd, k: 'sub', t: nameOf(x.id), sub: '교체 투입', me: x.id === 'ME' });
  const shots = ms && ms.shots ? ms.shots.slice().sort((a, b) => a.m - b.m) : [];
  for (const x of shots) if (x.res !== '골' && (x.big || x.p === 'ME' || x.res === '골대')) T.push({ m: x.m, s: x.s, k: 'chance', sh: x, t: x.p ? nameOf(x.p) : '', sub: x.res === '골대' ? '골대 강타' : x.big ? `결정적 기회 · ${x.res}` : `슈팅 · ${x.res}`, me: x.p === 'ME' });
  T.sort((a, b) => a.m - b.m || (a.k === 'goal') - (b.k === 'goal'));
  // 골 장면 다시보기 (v45)
  const tnm = sd => { if (o.nat) return C.natName(sd ? o.b : o.a); const c = w.clubs[sd ? o.b : o.a] || {}; return c.short || c.name || ''; };
  const rpl = e => { if (!U.goalReplay || !U.replayData || !ms) return; try { const R0 = U.replayData(d, ms, [tnm(0), tnm(1)], [U.teamColor(o.a, o.nat, 0), U.teamColor(o.b, o.nat, 1)]); const i = e ? R0.goals.findIndex(g => g.m === e.m && g.p === e.p && g.s === e.s) : 0; U.goalReplay({ goals: R0.goals, teams: R0.teams, start: Math.max(0, i), auto: !e, key: o.key || '', nameOf, title: o.title || '골 장면', sub: `${tnm(0)} ${o.ga} - ${o.gb} ${tnm(1)}` }); } catch (err) { console.error(err); } };
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
  // 내 활약 수치 (실시간): 골·도움·슈팅은 그 순간에, 나머지(패스·드리블·경합·수비)는 뛴 시간에 비례해 쌓인다
  const ST = m.played && m.st ? m.st : null, myShots = shots.filter(x => x.p === 'ME');
  const myLine = t => {
    if (!meIn || !ST || t < on0) return null;
    const fr = clamp01((Math.min(t, off0) - on0) / Math.max(1, off0 - on0)), q = k => Math.round((ST[k] || 0) * fr);
    const gl = T.filter(x => x.me && x.k === 'goal' && x.m <= t && x.t.startsWith(s.p.name)).length, as = T.filter(x => x.me && x.k === 'goal' && x.m <= t && !x.t.startsWith(s.p.name)).length;
    const shN = Math.max(myShots.filter(x => x.m <= t).length, gl), sotN = Math.max(myShots.filter(x => x.m <= t && (x.res === '골' || x.res === '선방')).length, gl);
    const pa = q('passAtt'), po = Math.min(pa, q('passOk')), gk = s.p.pos === 'GK';
    const items = [['출전', `${Math.max(0, Math.round(Math.min(t, off0) - on0))}'`], ['골', gl], ['도움', as], ['슈팅', `${shN}${sotN ? ` (${sotN})` : ''}`], ['패스', pa ? `${po}/${pa}` : '0'], ['키패스', q('chances')], ['드리블', `${q('dribOk')}/${q('dribAtt')}`], ['경합 승리', `${q('duelW')}/${q('duelA')}`], gk ? ['선방', q('saves')] : ['태클·차단', q('tackles') + q('ints')], ['터치', q('touches')]];
    return h('div', { class: 'lvmyst' }, ...items.map(([l, v]) => h('div', null, h('span', { class: 'lbl' }, l), h('b', null, String(v)))));
  };
  const cA = o.nat ? null : w.clubs[o.a], cB = o.nat ? null : w.clubs[o.b];
  const tmark = (sd, sz) => o.nat ? flag(sd ? o.b : o.a, sz) : crest(sd ? cB : cA, sz);
  const col = [U.teamColor ? U.teamColor(o.a, o.nat, 0) : '#4a8', U.teamColor ? U.teamColor(o.b, o.nat, 1) : '#a48'];
  { const rgb = x => { const c = String(x || '#888').replace('#', '').padEnd(6, '0'); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) || 0); }, dist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
    if (dist(col[0], col[1]) < 90) col[1] = dist(col[0], '#5fa8ff') > 90 ? '#5fa8ff' : '#e9ecf1'; }
  // 2D 하이라이트 (v46): 중계는 원래대로 흐르고, 하이라이트 순간에만 경기장이 나타나 실제 속도로 재생
  // 핵심 = 골·자책골·퇴장 / 주요 = 핵심 + 결정적 기회·선방·빗나감·골대·막힌 슈팅·내 슈팅
  const LF = ms && ms.PL && U.liveField ? U.liveField({ teams: [0, 1].map(sd => ({ col: col[sd], name: tnm(sd), fm: ms.fm && ms.fm[sd], ln: ms.PL[sd].map(p => ({ id: p.id, pos: p.pos, role: p.role, sl: p.sl, on: p.on, off: p.off })) })), nameOf, key: o.key || '' }) : null;
  const keyEv = [];
  if (LF) {
    for (const x of T) {
      if (x.k === 'goal' && x.e) { const e = x.e, sh = shots.find(z => z.s === e.s && z.m === e.m && z.p === e.p && z.res === '골'); keyEv.push({ m: x.m, lv: 1, atk: e.s, cap: { p: e.p, a: e.a, k: e.k }, args: U.sceneArgs({ m: e.m, p: e.p, a: e.a, k: e.k, sh: sh ? { dx: sh.dx, dy: sh.dy, sit: sh.sit, type: sh.type } : null }, e.s) }); }
      else if (x.k === 'r' && x.e) keyEv.push({ m: x.m, lv: 1, atk: 1 - x.e.s, cap: { p: x.e.p }, args: { kind: 'red', foul: x.e.p } });
    }
    const ch = shots.filter(z => z.res !== '골' && ['선방', '빗나감', '골대', '막힘'].includes(z.res) && (z.big || z.p === 'ME' || z.res === '골대' || (z.xg || 0) >= .15)).sort((a, b) => (b.p === 'ME') - (a.p === 'ME') || (b.xg || 0) - (a.xg || 0)).slice(0, 8);
    for (const z of ch) keyEv.push({ m: z.m, lv: 2, atk: z.s, res: { '선방': 'save', '빗나감': 'miss', '골대': 'post', '막힘': 'block' }[z.res] || 'miss', cap: { p: z.p }, args: U.sceneArgs({ m: z.m, p: z.p, a: z.as, k: 'g', res: z.res, sh: { dx: z.dx, dy: z.dy, sit: z.sit, type: z.type } }, z.s) });
    keyEv.sort((a, b) => a.m - b.m || a.lv - b.lv);
  }
  if (s.wc.hl == null) s.wc.hl = s.wc.slow === 0 ? 'off' : 'key';
  const HL = [['off', '끔'], ['key', '핵심'], ['all', '주요']];
  return overlay(close => {
    let t = 0, spd = s.wc.speed || 2, playing = true, done = false, timer = null;
    const shut = r => { clearTimeout(timer); if (LF) LF.destroy(); close(r); };
    close.x = () => shut('go'); // X·Esc·뒤로 = '나가기' (진행은 계속)
    const clock = h('div', { class: 'lvclock' }), sc = h('div', { class: 'lvscore' }), prog = h('div', { class: 'lvprog' }, h('i'));
    const feed = h('div', { class: 'lvfeed' }), stats = h('div', { class: 'lvstats' }), me = h('div', { class: 'lvme' });
    const head = h('div', { class: 'head lvhead' }, h('div', { class: 'lbl' }, o.title || ''),
      h('div', { class: 'lvrow' }, h('div', { class: 'lvt' }, tmark(0, 36), h('b', null, o.nat ? C.natName(o.a) : (cA || {}).name || '')), h('div', { class: 'lvmid' }, sc, clock), h('div', { class: 'lvt r' }, h('b', null, o.nat ? C.natName(o.b) : (cB || {}).name || ''), tmark(1, 36))), prog);
    const shown = new Set();
    const ICON = { goal: '⚽', y: '🟨', r: '🟥', sub: '↔', chance: '◎' };
    const paint = () => {
      const [a, b] = score(t);
      sc.textContent = `${a} - ${b}`;
      clock.textContent = done ? '경기 종료' : t <= 45 ? `${Math.floor(t)}'` : t < 46 ? '하프타임' : t <= 90 ? `${Math.floor(t)}'` : `90+${Math.floor(t - 90)}'`;
      prog.firstChild.style.width = Math.min(100, t / end * 100) + '%';
      T.forEach((x, i) => { if (x.m <= t && !shown.has(i)) { shown.add(i); feed.prepend(h('div', { class: 'lvev s' + x.s + (x.me ? ' me' : '') + ' k-' + x.k, style: { '--tc': col[x.s] } }, h('span', { class: 'mn' }, U.fmtMin ? U.fmtMin(x.m) : x.m + "'"), h('span', { class: 'ic' }, ICON[x.k] || '·'), h('span', { class: 'tx' }, h('b', null, x.t), x.sub ? h('small', null, x.sub) : null), h('span', { class: 'tm' }, tmark(x.s, 18), h('small', null, o.nat ? tnm(x.s) : ((x.s === 0 ? cA : cB) || {}).short || '')), x.k === 'goal' && ms && U.goalReplay ? h('button', { class: 'rpbtn', title: '골 장면 다시보기', onclick: () => { if (playing) { playing = false; clearTimeout(timer); ctl(); } rpl(x.e); } }, '▶') : null)); if (x.k === 'goal') { sc.classList.remove('flash'); void sc.offsetWidth; sc.classList.add('flash'); } } });
      const A = stat(t, 0), B = stat(t, 1);
      const row = (l, va, vb, fmt) => { const tot = (va + vb) || 1; return h('div', { class: 'lvst' }, h('span', { class: 'v' }, fmt ? fmt(va) : va), h('div', { class: 'lb' }, h('span', { class: 'lbl' }, l), h('div', { class: 'bars' }, h('i', { style: { width: (va / tot * 100) + '%', background: col[0] } }), h('i', { style: { width: (vb / tot * 100) + '%', background: col[1] } }))), h('span', { class: 'v' }, fmt ? fmt(vb) : vb)); };
      stats.replaceChildren(row('점유율', A.pos, B.pos, v => v + '%'), row('슈팅', A.sh, B.sh), row('유효 슈팅', A.sot, B.sot), row('기대 득점 (xG)', +A.xg.toFixed(2), +B.xg.toFixed(2), v => v.toFixed(2)), row('코너킥', A.corn, B.corn), row('파울', A.foul, B.foul));
      const r = rAt(t);
      const on = meIn && t >= on0 && t <= off0;
      // 상태: 벤치에 있는 동안은 투입 여부를 미리 알리지 않는다
      const stTxt = !meIn ? (meBench ? (done ? '벤치 · 출전하지 않음' : '벤치 대기') : (m.why || '명단 제외')) : t < on0 ? '벤치 대기' : on ? (meIn.start ? '선발 출전 중' : `${on0}분 교체 투입 · 출전 중`) : `${meIn.start ? '선발' : on0 + '분 투입'} · ${Math.min(off0, 90)}분까지`;
      me.replaceChildren(h('div', { class: 'lvmeh' }, ...[h('span', { class: 'lbl' }, '내 선수'), h('b', null, s.p.name), h('span', { class: 'mute' }, stTxt), r ? (U.rt1 ? U.rt1(Math.round(r * 10) / 10) : h('b', null, r.toFixed(1))) : null].filter(Boolean)), ...[myLine(t)].filter(Boolean));
    };
    const step = () => {
      if (!playing || done) return;
      if (LF && LF.busy()) { timer = setTimeout(step, 150); return; }
      const nt = Math.min(end, t + .5);
      // 다음 주요 장면: 시계를 그 직전에 세우고 실제 속도로 보여 준 뒤 이어 간다
      const kev = LF && s.wc.hl !== 'off' ? keyEv.find(x => !x.done && x.m > t && x.m <= nt && (x.lv === 1 || s.wc.hl === 'all')) : null;
      if (kev) { kev.done = 1; t = Math.max(t, kev.m - .3); paint(); kev.score = score(kev.m - .01); kev.clock = clock.textContent; const pr = LF.scene(kev); ctl(); pr.then(() => { if (done) return; t = kev.m; paint(); ctl(); if (playing) timer = setTimeout(step, 500 / spd); }); return; }
      t = nt;
      if (t >= end) { done = true; playing = false; }
      paint(); ctl();
      if (!done) timer = setTimeout(step, t > 45 && t < 46 ? 900 / spd : 260 / spd);
    };
    const ctlBox = h('div', { class: 'lvctl' });
    const ctl = () => {
      ctlBox.replaceChildren(...[
        done ? null : h('button', { class: 'btn ghost sm', onclick: () => { playing = !playing; if (playing) step(); ctl(); } }, playing ? '일시정지' : '재생'),
        done ? null : seg(SPD.map(([k, l]) => [k, l]), spd, k => { spd = k; s.wc.speed = k; }),
        LF && LF.busy() ? h('button', { class: 'btn sm', onclick: () => LF.skip() }, '장면 건너뛰기') : null,
        done ? null : h('button', { class: 'btn ghost sm', onclick: () => { clearTimeout(timer); if (LF) LF.skip(); t = end; done = true; playing = false; paint(); ctl(); } }, '결과로'),
        LF && !done ? h('span', { class: 'lvhl', title: '핵심: 골·자책골·퇴장 · 주요: 핵심 + 결정적 기회·선방·빗나감·골대·막힌 슈팅' }, h('span', { class: 'lbl' }, '하이라이트'), seg(HL, s.wc.hl, k => { s.wc.hl = k; })) : null,
        h('button', { class: 'btn ghost sm', onclick: () => U.showMatch(o) }, '경기 기록'),
        done && ms && U.goalReplay && T.some(x => x.k === 'goal') ? h('button', { class: 'btn ghost sm', onclick: () => rpl(null) }, '▶ 골 장면') : null,
        h('span', { style: { flex: 1 } }),
        h('button', { class: 'btn ghost sm', onclick: () => shut('stop') }, '진행 멈추기'),
        h('button', { class: 'btn sm lvgo', onclick: () => shut('go') }, done ? '계속' : '나가기')].filter(Boolean));
    };
    paint(); ctl();
    setTimeout(step, 400);
    return [head, h('div', { class: 'body lvbody' }, LF ? h('div', { class: 'lvpitch' }, LF.el) : null, me, h('div', { class: 'lvgrid' }, feed, stats), ctlBox)];
  }, { cls: 'wclive' });
};
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
})(window);
