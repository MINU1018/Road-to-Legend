// Road to Legend — 달력 그리드(날짜를 눌러 그날까지 진행)와 이적시장 타임라인(빅 사이닝·루머·지출 순위·진행 중 속보)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest } = U;
const DOW = '일월화수목금토';
const eur = v => C.fmtEUR(v * 1e4);
const KIND = { buy: '이적', free: '자유계약', loan: '임대' };
const DEALK = new Set(['buy', 'free', 'loan']);

// ---------- 달력 ----------
// o: { S, y, m, days(C.calMonth), today, maxD, sel, cell(o)->[노드], tip(o)->[문자열], pick(d), nav(delta), mark(o)->클래스, legend: [[클래스, 이름]] }
function calGrid(o) {
  const { y, m, days, today } = o;
  const first = C.toDate(days[0].d).getUTCDay();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(h('span', { class: 'cd blank' }));
  for (const x of days) {
    const d = x.d, past = d < today, isT = d === today;
    const can = o.pick && (o.canPick ? o.canPick(d) : true);
    const cls = ['cd', past ? 'past' : '', isT ? 'today' : '', x.tw ? 'tw tw-' + x.tw : '', x.iw ? 'iw' : '', x.it ? 'it' : '', x.dl ? 'dl' : '', can ? 'pick' : '', o.sel === d ? 'sel' : '', o.mark ? o.mark(x) : ''].filter(Boolean).join(' ');
    const tip = [`${C.fmtDateY(d)} (${DOW[C.toDate(d).getUTCDay()]})`].concat(o.tip ? o.tip(x) : []);
    if (can && d > today) tip.push(`▶ 누르면 이날까지 진행 (${d - today}일)`);
    cells.push(h(can ? 'button' : 'span', { class: cls, title: tip.join('\n'), onclick: can ? () => o.pick(d) : null },
      h('span', { class: 'cdn' }, C.ymd(d)[2], x.dl ? h('b', { class: 'dlx' }, '마감') : x.tw0 ? h('b', { class: 'twx' }, '개장') : null),
      ...(o.cell ? o.cell(x) : [])));
  }
  const nav = (dl, lbl) => h('button', { class: 'btn ghost sm', onclick: () => o.nav(dl) }, lbl);
  const [ty, tm] = C.ymd(today);
  return h('div', { class: 'cal' },
    h('div', { class: 'calhd' }, nav(-1, '◂'), h('b', null, `${y}년 ${m}월`), nav(1, '▸'), (ty !== y || tm !== m) ? h('button', { class: 'btn ghost sm', onclick: () => o.nav(0) }, '오늘') : null, o.head || null),
    h('div', { class: 'calw' }, ...[...DOW].map((c, i) => h('span', { class: i === 0 ? 'sun' : i === 6 ? 'sat' : '' }, c))),
    h('div', { class: 'calg' }, ...cells),
    h('div', { class: 'callg' }, ...(o.legend || []).map(([c, t]) => h('span', null, h('i', { class: 'sw ' + c }), t)), o.hint ? h('span', { class: 'mute' }, o.hint) : null));
}
U.calGrid = calGrid;
// 공통 툴팁 줄
U.calTip = function (S, x) {
  const w = S.w, t = [];
  if (x.it) t.push('🏆 ' + x.it);
  for (const e of x.E) t.push(`${C.COMPS[e[0]] ? C.COMPS[e[0]].short : e[0]} ${e[2]}`);
  for (const [id, r, n, pred] of x.L) t.push(`${w.lg[id].name} ${r}/${n}라운드${pred ? ' (예정)' : ''}`);
  for (const c of x.C.slice(0, 3)) t.push(c);
  if (x.iw) t.push(x.iw);
  if (x.tw) t.push(`${x.tw === 'summer' ? '여름' : '겨울'} 이적시장${x.dl ? ' 마감일' : x.tw0 ? ' 개장' : ''}`);
  return t;
};
// 이적 기록을 날짜별로 묶어 둔다 (같은 배열이면 다시 만들지 않는다)
const BYDAY = new WeakMap();
function byDay(rows) {
  let m = BYDAY.get(rows); if (m) return m;
  m = new Map();
  for (const r of rows) { if (!DEALK.has(r[3]) || r[10] == null) continue; const a = m.get(r[10]); if (a) a.push(r); else m.set(r[10], [r]); }
  for (const a of m.values()) a.sort((x, z) => z[4] - x[4] || z[5] - x[5]);
  BYDAY.set(rows, m); return m;
}
U.txByDay = byDay;
// 그날 성사된 큰 거래 수 (달력 표시용, 지난 날만)
U.calBig = function (S, x) {
  if (!x.twl || x.d > S.w.cal.d) return null;
  const T = U.txCached(x.twl); if (!T) return null;
  const a = byDay(T).get(x.d) || [];
  const big = a.filter(r => r[4] >= 1000 || r[5] >= 80);
  return big.length ? big : null;
};

// ---------- 이적시장 패널 ----------
const big = r => r[4] >= 1500 || r[5] >= 80;
function dealCard(w, r, me) {
  const tc = w.clubs[r[2]], fc = w.clubs[r[1]];
  const e = C.MD.nameOf(r[0]);
  return h('div', { class: 'dealc' + (r[4] >= 6000 ? ' mega' : '') + (me ? ' mine' : '') },
    h('div', { class: 'dc-st' }, r[4] >= 6000 ? 'HERE WE GO' : r[3] === 'loan' ? '임대 오피셜' : r[3] === 'free' ? '자유계약 오피셜' : '오피셜'),
    h('div', { class: 'dc-p' }, h('b', { class: 'lnk', onclick: () => U.openPlayer(r[0]) }, e), h('span', { class: 'mute' }, ` ${((w.ps && w.ps[r[0]]) || {}).pos || ''} · ${r[6]}세 · OVR ${r[5]}`)),
    h('div', { class: 'dc-m' }, h('span', { class: 'cc lnk', onclick: fc ? () => U.openClub(fc.id) : null }, crest(fc || null, 22), h('span', null, fc ? fc.name : '자유계약')), h('span', { class: 'dc-ar' }, '→'), h('span', { class: 'cc lnk', onclick: tc ? () => U.openClub(tc.id) : null }, crest(tc || null, 22), h('span', null, tc ? tc.name : '-'))),
    h('div', { class: 'dc-fee' }, r[4] ? eur(r[4]) : KIND[r[3]], r[4] && r[3] === 'loan' ? h('small', null, ' (임대료)') : null));
}
const range = f => { const v = f * 1e4, st = v >= 5e7 ? 1e7 : v >= 1e7 ? 5e6 : 1e6, lo = Math.floor(v / st) * st; return `${C.fmtEUR(lo)}~${C.fmtEUR(lo + st)}`; };
// opt: { my: 내 구단 id, sel, onSel(d), compact }
U.txPanel = function (S, opt = {}) {
  const w = S.w, today = w.cal.d;
  let win = C.txWindowAt(today);
  if (win && w.cal.win && w.cal.win.lbl === win.lbl) win = Object.assign({}, win, { d0: w.cal.win.d0 });
  if (!win) {
    if (opt.compact) return null;
    const nx = C.txNextWindow(today);
    return nx ? h('div', { class: 'sec' }, h('h3', null, '다음 이적시장'), h('div', { class: 'in mute' }, `${nx.kind === 'summer' ? '여름' : '겨울'} · ${C.fmtDateY(nx.d0)} 개장 (D-${nx.d0 - today}) ~ ${C.fmtDate(nx.d1)} 마감`)) : null;
  }
  const T = U.withTx(win.lbl, () => U.stay());
  if (!T && !(w.txKeys || []).includes(win.lbl)) return opt.compact ? null : h('div', { class: 'sec' }, h('h3', null, '이적시장'), h('div', { class: 'in mute' }, '이번 이적시장 기록이 없습니다.'));
  const kn = win.kind === 'summer' ? '여름' : '겨울';
  const left = win.d1 - today;
  const head = h('div', { class: 'txhd' + (left === 0 ? ' dday' : '') },
    h('div', null, h('div', { class: 'lbl' }, `${kn} 이적시장 · ${C.fmtDate(win.d0)} ~ ${C.fmtDate(win.d1)}`),
      h('div', { class: 'txcd' }, left === 0 ? '오늘 마감 — 데드라인 데이!' : `마감까지 D-${left}`)),
    h('div', { class: 'txbar' }, h('i', { style: { width: Math.min(100, (today - win.d0 + 1) / (win.d1 - win.d0 + 1) * 100) + '%' } })));
  if (!T) return h('div', { class: 'sec txp' }, head, h('div', { class: 'in mute' }, '이적 기록을 불러오는 중…'));
  const M = byDay(T);
  const done = []; for (const [d, a] of M) if (d <= today) done.push(...a);
  const spent = done.reduce((s, r) => s + (r[3] === 'buy' ? r[4] : 0), 0);
  const top = done.slice().sort((a, b) => b[4] - a[4])[0];
  const sel = opt.sel != null && opt.sel >= win.d0 && opt.sel <= today ? opt.sel : today;
  // 날짜별 막대 (지난 날: 거래 수, 앞날: 회색)
  const span = win.d1 - win.d0 + 1;
  let maxN = 1; for (let d = win.d0; d <= today; d++) maxN = Math.max(maxN, (M.get(d) || []).filter(r => r[5] >= 70 || r[4]).length);
  const bars = [];
  for (let d = win.d0; d <= win.d1; d++) {
    const a = d <= today ? (M.get(d) || []).filter(r => r[5] >= 70 || r[4]) : [];
    const hb = d <= today ? Math.max(6, a.length / maxN * 100) : 6;
    const bb = a.some(r => r[4] >= 4000);
    bars.push(h('button', { class: 'tb' + (d > today ? ' fut' : '') + (d === sel ? ' on' : '') + (d === win.d1 ? ' dl' : '') + (bb ? ' bb' : ''), title: `${C.fmtDate(d)}${d <= today ? ` · 주요 거래 ${a.length}건${a[0] && a[0][4] ? ` · 최고 ${C.MD.nameOf(a[0][0])} ${eur(a[0][4])}` : ''}` : ' · 예정'}`, disabled: d > today ? true : null, onclick: d <= today && opt.onSel ? () => opt.onSel(d) : null }, h('i', { style: { height: hb + '%' } })));
  }
  const tiles = h('div', { class: 'txtiles' },
    h('div', null, h('div', { class: 'lbl' }, '성사된 거래'), h('b', null, `${done.length}건`)),
    h('div', null, h('div', { class: 'lbl' }, '총 이적료'), h('b', null, eur(spent))),
    h('div', null, h('div', { class: 'lbl' }, '최고 이적료'), top && top[4] ? h('b', { class: 'lnk', onclick: () => U.openPlayer(top[0]) }, `${C.MD.nameOf(top[0])} ${eur(top[4])}`) : h('b', null, '-')));
  const dayDeals = (M.get(sel) || []);
  const bigs = dayDeals.filter(big).slice(0, opt.compact ? 2 : 4);
  const isMine = r => opt.my && (r[1] === opt.my || r[2] === opt.my);
  const sec = h('div', { class: 'sec txp' }, head,
    h('div', { class: 'in' }, h('div', { class: 'tbars', style: { gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` } }, ...bars),
      h('div', { class: 'tbl mute' }, h('span', null, C.fmtDate(win.d0)), h('span', null, '막대를 누르면 그날 거래'), h('span', { style: { color: 'var(--bad)' } }, `${C.fmtDate(win.d1)} 마감`))),
    h('div', { class: 'in' }, tiles),
    h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '6px' } }, sel === today ? '오늘의 빅 사이닝' : `${C.fmtDate(sel)} 빅 사이닝`),
      bigs.length ? h('div', { class: 'dealgrid' }, ...bigs.map(r => dealCard(w, r, isMine(r)))) : h('div', { class: 'mute', style: { fontSize: '13px' } }, dayDeals.length ? `큰 거래는 없고 ${dayDeals.length}건이 성사됐습니다.` : '이날 성사된 거래가 없습니다.')));
  if (!opt.compact) {
    const rest = dayDeals.filter(r => !bigs.includes(r) && (r[5] >= 68 || r[4])).slice(0, 10);
    if (rest.length) sec.append(h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, '그 밖의 거래'), h('div', { style: { display: 'grid', gap: '3px' } }, ...rest.map(r => h('div', { class: 'txrow' + (isMine(r) ? ' mine' : '') }, h('span', { class: 'lnk', onclick: () => U.openPlayer(r[0]) }, C.MD.nameOf(r[0])), h('span', { class: 'mute' }, r[5]), h('span', { class: 'cc' }, crest(w.clubs[r[1]] || null, 14), h('span', null, (w.clubs[r[1]] || {}).short || 'FA')), h('span', { class: 'mute' }, '→'), h('span', { class: 'cc' }, crest(w.clubs[r[2]] || null, 14), h('span', null, (w.clubs[r[2]] || {}).short || '-')), h('span', { class: 'fee' }, r[4] ? eur(r[4]) : KIND[r[3]]))))));
  }
  // 루머: 앞으로 7일 안에 성사될 큰 거래 (가까울수록 확실한 표현)
  if (sel === today) {
    const rum = [];
    for (let d = today + 1; d <= Math.min(win.d1, today + 7); d++) for (const r of M.get(d) || []) if (r[3] !== 'free' && (r[4] >= 2000 || r[5] >= 82 || isMine(r))) rum.push([d, r]);
    rum.sort((a, b) => b[1][4] - a[1][4]);
    if (rum.length) sec.append(h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, '이적 루머'), h('div', { style: { display: 'grid', gap: '4px' } }, ...rum.slice(0, opt.compact ? 3 : 6).map(([d, r]) => {
      const k = d - today, tag = k <= 2 ? ['합의 임박', 'hot'] : k <= 4 ? ['협상 진행 중', 'warm'] : ['관심', 'cool'];
      const tc = w.clubs[r[2]] || {}, fc = w.clubs[r[1]] || {};
      return h('div', { class: 'rum' + (isMine(r) ? ' mine' : '') }, h('span', { class: 'rt-' + tag[1] }, tag[0]), h('span', null, h('b', null, tc.name || '-'), r[3] === 'loan' ? ' 임대 영입 추진 — ' : ' 영입 추진 — ', h('span', { class: 'lnk', onclick: () => U.openPlayer(r[0]) }, C.MD.nameOf(r[0])), h('span', { class: 'mute' }, ` (${fc.name || '자유계약'}, OVR ${r[5]})`)), h('span', { class: 'mute' }, r[4] ? `예상 ${range(r[4])}` : ''));
    }))));
  }
  // 지출 순위
  if (!opt.compact) {
    const by = {}; for (const r of done) if (r[3] === 'buy' && r[2]) { const b = by[r[2]] = by[r[2]] || { s: 0, n: 0, out: 0 }; b.s += r[4]; b.n++; } for (const r of done) if (r[3] === 'buy' && by[r[1]]) by[r[1]].out += r[4];
    const rk = Object.entries(by).sort((a, b) => b[1].s - a[1].s).slice(0, 6);
    if (rk.length && rk[0][1].s) { const mx = rk[0][1].s;
      sec.append(h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '6px' } }, '지출 순위'), h('div', { style: { display: 'grid', gap: '5px' } }, ...rk.map(([id, b], i) => h('div', { class: 'spend' + (id === opt.my ? ' mine' : '') }, h('span', { class: 'mute' }, i + 1), h('span', { class: 'cc lnk', onclick: () => U.openClub(id) }, crest(w.clubs[id], 16), h('span', null, w.clubs[id].name)), h('span', { class: 'sb' }, h('i', { style: { width: b.s / mx * 100 + '%' } })), h('b', null, eur(b.s)), h('span', { class: 'mute', style: { fontSize: '11px' } }, `${b.n}명${b.out ? ` · 판매 ${eur(b.out)}` : ''}`)))))); }
  }
  if (opt.my) {
    const mine = done.filter(isMine).slice(0, 8);
    if (mine.length) sec.append(h('div', { class: 'in' }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, '우리 구단'), h('div', { style: { display: 'grid', gap: '3px' } }, ...mine.map(r => h('div', { class: 'txrow mine' }, h('span', { class: 'mute' }, C.fmtDate(r[10])), h('span', { class: 'lnk', onclick: () => U.openPlayer(r[0]) }, C.MD.nameOf(r[0])), h('span', { class: r[2] === opt.my ? 'good' : 'bad' }, r[2] === opt.my ? '영입' : '이적'), h('span', null, (w.clubs[r[2] === opt.my ? r[1] : r[2]] || {}).name || '자유계약'), h('span', { class: 'fee' }, r[4] ? eur(r[4]) : KIND[r[3]]))))));
  }
  if (!opt.noLink) sec.append(h('div', { class: 'in' }, h('button', { class: 'btn ghost sm', onclick: () => U.setTab('txm') }, '이적시장 자세히 · 전체 기록')));
  return sec;
};
// 진행 중 속보: d일에 성사된 큰 거래를 ticker 맨 위에 붙인다
U.txTick = function (S, d, el, my) {
  if (!el) return 0;
  const win = C.txWindowAt(d); if (!win) return 0;
  const T = U.txCached(win.lbl); if (!T) return 0;
  const a = (byDay(T).get(d) || []).filter(r => big(r) || (my && (r[1] === my || r[2] === my)));
  const w = S.w;
  for (const r of a.slice(0, 4).reverse()) {
    const mine = my && (r[1] === my || r[2] === my);
    el.prepend(h('div', { class: 'txt' + (r[4] >= 6000 ? ' mega' : '') + (mine ? ' mine' : '') }, h('span', { class: 'mute' }, C.fmtDate(d)), h('span', { class: 'tg' }, r[4] >= 6000 ? 'HERE WE GO' : d === win.d1 ? '마감 직전' : '오피셜'), h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, h('b', null, C.MD.nameOf(r[0])), ` ${(w.clubs[r[1]] || {}).name || '자유계약'} → ${(w.clubs[r[2]] || {}).name || '-'}`), h('span', { class: 'fee' }, r[4] ? eur(r[4]) : KIND[r[3]])));
  }
  while (el.childNodes.length > 40) el.lastChild.remove();
  if (a.length) el.style.display = '';
  return a.length;
};
})(window);
