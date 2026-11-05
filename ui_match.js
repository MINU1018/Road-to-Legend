// Road to Legend — 경기 상세 팝업: 득점·도움·카드 타임라인, 경기 통계, 양 팀 출전 명단과 평점
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, MD = C.MD;
const { h, crest } = U;
const S = () => U.S();

const KIND = { g: '골', p: '페널티킥 골', o: '자책골', y: '경고', r: '퇴장', 2: '경고 누적 퇴장' };
const ICON = { g: '⚽', p: '⚽', o: '⚽', y: '▮', r: '▮', 2: '▮' };
const nameOf = id => MD.nameOf(id, S());
// 선수 이름 (실존·생성 선수는 눌러서 선수 정보로)
function pname(id, close, mine) {
  const n = nameOf(id) + (id === 'ME' ? ' (나)' : '');
  const linkable = id && id !== 'ME' && id[0] !== '~';
  return h('span', { class: (linkable ? 'lnk ' : '') + (id === 'ME' ? 'meName' : ''), onclick: linkable ? () => { close(); U.openPlayer(id); } : id === 'ME' ? () => { close(); U.setTab('profile'); } : null }, n);
}
function teamHead(w, id, nat, size, close) {
  if (nat) return h('span', { class: 'cc lnk', onclick: () => { close(); U.openNat(id); } }, U.natCrest(id, size), h('b', null, C.natName(id)));
  const c = w.clubs[id];
  return h('span', { class: 'cc' + (c ? ' lnk' : ''), onclick: c ? () => { close(); U.openClub(id); } : null }, crest(c || null, size), h('b', null, c ? c.name : String(id).startsWith('OPP') ? '가상 상대' : '해체된 구단'));
}
// o: { title, a, b, ga, gb, pw, d: {ev, ln}, nat, key }
U.showMatch = function (o) {
  const s = S(), w = s.w, d = o.d || { ev: [], ln: null };
  U.overlay(close => {
    const strA = o.nat ? 72 : ((w.clubs[o.a] || {}).str || 65), strB = o.nat ? 72 : ((w.clubs[o.b] || {}).str || 65);
    const ts = MD.teamStats(o.key || `${o.a}|${o.b}|${o.title}`, strA, strB, o.ga, o.gb);
    const head = h('div', { class: 'head mhead' },
      h('div', { class: 'lbl' }, o.title || ''),
      h('div', { class: 'mscore' }, h('div', { class: 'mt' }, teamHead(w, o.a, o.nat, 34, close)), h('div', { class: 'ms' }, `${o.ga} - ${o.gb}`, o.pw ? h('div', { class: 'mute', style: { fontSize: '12px' } }, `승부차기 ${o.nat ? C.natName(o.pw) : (w.clubs[o.pw] || {}).name || ''} 승`) : null), h('div', { class: 'mt r' }, teamHead(w, o.b, o.nat, 34, close))),
      h('button', { class: 'btn ghost sm mclose', onclick: () => close() }, '닫기'));
    const body = h('div', { class: 'body mbody' });
    // 득점자 요약 (양쪽)
    const goalsBy = side => d.ev.filter(e => e.s === side && 'gpo'.includes(e.k));
    body.append(h('div', { class: 'mgoals' }, ...[0, 1].map(side => h('div', { class: side ? 'r' : '' }, ...goalsBy(side).map(e => h('div', null, pname(e.p, close), ` ${e.m}'`, e.k === 'p' ? ' (PK)' : e.k === 'o' ? ' (자책)' : ''))))));
    // 타임라인
    if (d.ev.length) body.append(h('div', { class: 'msec' }, h('h4', null, '경기 이벤트'), h('div', { class: 'mtl' }, ...d.ev.map(e => h('div', { class: 'mev ' + (e.s ? 'r' : 'l') },
      h('span', { class: 'mm' }, `${e.m}'`), h('span', { class: 'mi k' + e.k }, ICON[e.k]),
      h('span', null, pname(e.p, close), h('span', { class: 'mute' }, ` · ${KIND[e.k]}`), e.a ? h('span', { class: 'mute' }, ' · 도움 ', pname(e.a, close)) : null))))));
    else body.append(h('div', { class: 'mute', style: { fontSize: '13px' } }, '득점·카드 없음'));
    // 통계
    const bar = (l, x, y, pct) => { const t = x + y || 1; return h('div', { class: 'mstat' }, h('b', null, pct ? x + '%' : x), h('div', { class: 'mbar' }, h('i', { style: { width: (x / t * 100) + '%' } })), h('span', null, l), h('div', { class: 'mbar r' }, h('i', { style: { width: (y / t * 100) + '%' } })), h('b', null, pct ? y + '%' : y)); };
    const cards = (side, k) => d.ev.filter(e => e.s === side && (k === 'y' ? e.k === 'y' : 'r2'.includes(e.k))).length;
    body.append(h('div', { class: 'msec' }, h('h4', null, '경기 통계'), bar('점유율', ts.pos[0], ts.pos[1], true), bar('슈팅', ts.sh[0], ts.sh[1]), bar('유효 슈팅', ts.sot[0], ts.sot[1]), bar('경고', cards(0, 'y'), cards(1, 'y')), bar('퇴장', cards(0, 'r'), cards(1, 'r')),
      h('div', { class: 'mute', style: { fontSize: '11px' } }, '점유율·슈팅은 경기 결과와 두 팀 전력으로 계산한 값입니다. 골·도움·카드·출전·평점은 선수 시즌 기록에 그대로 합산됩니다.')));
    // 출전 명단
    if (d.ln && d.ln.length === 2) {
      const evOf = id => d.ev.filter(e => e.p === id || e.a === id);
      const col = (list, side) => h('div', { class: 'mlu' }, h('div', { class: 'lbl' }, side ? '원정' : '홈'),
        ...['선발', '교체'].map((t, k) => { const rows = list.filter(x => k ? !x.start : x.start); return rows.length ? h('div', null, h('div', { class: 'mute', style: { fontSize: '11px', margin: '6px 0 2px' } }, t),
          ...rows.map(x => h('div', { class: 'mlr' }, pname(x.id, close), h('span', { class: 'mute' }, x.start ? (x.off < 90 ? ` ↓${x.off}'` : '') : ` ↑${x.on}'`),
            h('span', { class: 'mic' }, ...evOf(x.id).map(e => h('span', { class: 'mi k' + (e.a === x.id && e.p !== x.id ? 'a' : e.k), title: e.a === x.id && e.p !== x.id ? '도움' : KIND[e.k] }, e.a === x.id && e.p !== x.id ? 'A' : ICON[e.k]))),
            U.rt1 ? U.rt1(x.rt) : x.rt.toFixed(1)))) : null; }));
      body.append(h('div', { class: 'msec' }, h('h4', null, '출전 명단 · 평점'), h('div', { class: 'mlus' }, col(d.ln[0], 0), col(d.ln[1], 1))));
    } else body.append(h('div', { class: 'mute', style: { fontSize: '12px' } }, '하부 리그 구단끼리의 경기라 출전 명단은 기록하지 않습니다. (득점·카드는 기록)'));
    return [head, body];
  }, { clickClose: true });
};

// 시즌 경기 기록 불러오기 (화면이 먼저 그려지고, 다 불러오면 다시 그린다)
U.withMx = function (label, onReady) {
  const st = U.mxCached(label);
  if (st) return st;
  if (!U._mxLoading) U._mxLoading = {};
  if (!U._mxLoading[label]) { U._mxLoading[label] = 1; U.getMx(label).then(x => { delete U._mxLoading[label]; if (x && onReady) onReady(); }); }
  return null;
};
})(typeof window !== 'undefined' ? window : globalThis);
