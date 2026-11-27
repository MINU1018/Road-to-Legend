// 터치라인 커리어 UI — 월드 커리어 '스토리' 탭과 홈 요약 (v45): 라이벌 · 국가대표 · 미디어·팬 반응
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest, flag } = U;
const ST = () => C.WCS;
const sec = (title, sub, ...body) => h('div', { class: 'sec' }, h('h3', null, title, sub ? h('small', { class: 'mute', style: { fontWeight: 400, marginLeft: '8px', fontSize: '12px' } }, sub) : null), h('div', { class: 'in' }, ...body));
const fd = d => C.fmtDate ? C.fmtDate(d) : C.fmtDateY(d);
function feedRow(x) {
  return h('div', { class: 'wsfd ' + (x.k === 'fan' ? 'fan' : 'med') + (x.s > 0 ? ' pos' : x.s < 0 ? ' neg' : '') + (x.big ? ' big' : '') },
    h('span', { class: 'wsfk' }, x.k === 'fan' ? '팬' : '언론'),
    h('div', null, h('div', { class: 'wsft' }, x.t), h('small', { class: 'mute' }, `${x.src} · ${fd(x.d)}`)));
}
U.wcFeedRow = feedRow;
function rivalSec(s) {
  const R0 = s.wc.rv, w = s.w;
  if (!R0) return sec('라이벌', null, h('div', { class: 'empty' }, s.car.status === 'first' ? '1군 경기를 뛰기 시작하면 언론이 비교할 상대가 생깁니다.' : '1군에 올라가면 비교 대상이 생깁니다.'));
  const n = ST().rvNow(s) || {}, c = n.c, L = n.live, me = s.ss ? ST().meLg(s) : {}, H2 = R0.h2h;
  const cmp = (lab, a, b, base) => { const b0 = base || 0, A = Math.max(0, (+a || 0) - b0), B = Math.max(0, (+b || 0) - b0), mx = Math.max(A, B) || 1; a = a == null ? null : a; const A0 = +a || 0, B0 = +b || 0; return h('div', { class: 'wsrv' }, h('b', { class: A0 >= B0 && A0 ? 'up' : '' }, a == null ? '-' : a), h('div', { class: 'wsbar' }, h('i', { style: { width: (A / mx * 100) + '%' } })), h('span', { class: 'mute' }, lab), h('div', { class: 'wsbar r' }, h('i', { style: { width: (B / mx * 100) + '%' } })), h('b', { class: B0 > A0 ? 'up' : '' }, b == null ? '-' : b)); };
  const head = h('div', { class: 'wsrvh' },
    h('div', null, flag(s.p.nat, 20), h('b', null, s.p.name), h('small', { class: 'mute' }, `${s.p.pos} · ${s.p.age}세 · OVR ${C.ovrOf(s.p)}`)),
    h('span', { class: 'wsvs' }, 'VS'),
    h('div', { class: 'r' }, flag(R0.nat, 20), h('b', { class: c ? 'lnk' : '', onclick: () => { if (U.openPlayer) U.openPlayer(R0.id); } }, R0.n), h('small', { class: 'mute' }, c ? `${R0.pos} · ${n.age}세 · OVR ${n.ovr} · ${c.name}` : '은퇴·행방 불명')));
  const body = [head];
  if (L && s.ss) body.push(h('div', { class: 'wsrvs' }, h('div', { class: 'lbl mute', style: { fontSize: '11.5px', margin: '6px 0 2px' } }, '이번 시즌 리그'),
    cmp('경기', me.apps, L.apps), cmp('골', me.g, L.g), cmp('도움', me.a, L.a), cmp('평점', me.r, L.r, 5)));
  body.push(h('div', { class: 'wsh2h' }, h('span', { class: 'mute' }, '맞대결 (소속팀 경기)'), h('b', null, `${H2.w}승 ${H2.d}무 ${H2.l}패`)));
  if (H2.L.length) body.push(h('div', { class: 'wsh2l' }, ...H2.L.slice(0, 5).map(x => h('div', null, h('span', { class: 'mute' }, fd(x.d)), h('span', { class: 'chip ' + (x.gf > x.ga ? 'good' : x.gf < x.ga ? 'bad' : '') }, `${x.gf}-${x.ga}`), h('span', null, (w.clubs[x.c] || {}).name || ''), h('span', { class: 'mute' }, x.r ? `평점 ${x.r.toFixed(1)}${x.g ? ` · ${x.g}골` : ''}` : '미출전')))));
  if (R0.hist.length) body.push(h('div', { class: 'tscroll' }, h('table', { class: 'ltable lc' }, h('thead', null, h('tr', null, ...['시즌', '나 (경기·골·도움·평점)', R0.n].map(t => h('th', null, t)))),
    h('tbody', null, ...R0.hist.slice().reverse().map(x => h('tr', null, h('td', null, x.y), h('td', null, `${x.me.apps} · ${x.me.g} · ${x.me.a} · ${x.me.r ?? '-'}`), h('td', null, x.rv ? `${x.rv.apps} · ${x.rv.g} · ${x.rv.a} · ${x.rv.r ?? '-'}` : '-')))))));
  if ((s.wc.rvOld || []).length) body.push(h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '6px' } }, '지난 라이벌: ' + s.wc.rvOld.map(x => `${x.n} (${x.y0}~${x.y1}, ${x.h2h.w}승 ${x.h2h.d}무 ${x.h2h.l}패)`).join(' · ')));
  return sec('라이벌', `${R0.y0}년부터`, ...body);
}
function ntSec(s) {
  const N0 = s.wc.ntS || { tours: [], snub: [] }, cnt = s.cnt || {}, rel = s.wc.rel.nt || 0;
  const kv = (k, v) => h('div', { class: 'wclkv' }, h('span', { class: 'mute' }, k), h('b', null, v));
  const items = [];
  if (N0.debut) items.push(['A매치 데뷔', `${fd(N0.debut.d)} · ${N0.debut.opp}전 (${N0.debut.age}세)`]);
  if (N0.fg) items.push(['데뷔골', `${fd(N0.fg.d)} · ${N0.fg.opp}전`]);
  for (const t of N0.tours) items.push([t.n + ` (${t.y})`, `명단 포함${t.num ? ` · 등번호 ${t.num}` : ''} · ${t.apps}경기 ${t.g}골${t.last ? ` · 마지막 ${t.last}` : ''}`]);
  for (const t of N0.snub) items.push([t.n + ` (${t.y})`, '명단 제외']);
  return sec(`${C.natName(s.p.nat)} 대표팀`, s.ss && s.ss.nt ? `${s.ss.nt.lvl === 'A' ? 'A대표' : s.ss.nt.lvl} · ${C.WC.ntText(rel)}` : '소집 대상 아님',
    h('div', { class: 'wclkvs' }, kv('A매치', `${cnt.caps || 0}경기`), kv('A매치 골', `${cnt.ntGoals || 0}골`), kv('메이저 대회', `${N0.tours.length}회`)),
    items.length ? h('div', { class: 'wsnt' }, ...items.map(([k, v]) => h('div', null, h('b', null, k), h('span', { class: 'mute' }, v)))) : h('div', { class: 'empty', style: { marginTop: '8px' } }, '아직 대표팀 기록이 없습니다.'));
}
U.wcStoryTab = function (s) {
  if (!C.WCS || !s.wc) return [h('div', { class: 'empty' }, '월드 커리어에서만 쓸 수 있습니다.')];
  const F = s.wc.feed || [], f = U.st.wsF = U.st.wsF || 'all';
  const list = F.filter(x => f === 'all' || (f === 'fan' ? x.k === 'fan' : x.k !== 'fan'));
  const seg = U.wcSeg ? U.wcSeg([['all', '전체'], ['med', '언론'], ['fan', '팬']], f, k => { U.st.wsF = k; U.stay(); }) : null;
  const feedS = sec('미디어·팬 반응', `${F.length}건`, seg, list.length ? h('div', { class: 'wsfds' }, ...list.slice(0, 40).map(feedRow)) : h('div', { class: 'empty' }, '경기를 뛰면 기사와 팬 반응이 쌓입니다.'));
  return [h('div', { class: 'wclg' }, h('div', { class: 'wclcol' }, rivalSec(s), ntSec(s)), h('div', { class: 'wclcol' }, feedS))];
};
U.wcStoryMini = function (s) {
  if (!C.WCS || !s.wc) return null;
  const F = (s.wc.feed || []).slice(0, 4), R0 = s.wc.rv, n = R0 ? ST().rvNow(s) : null;
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '미디어·팬 반응'), h('button', { class: 'btn ghost sm', onclick: () => { U.st.wcpt = 'story'; U.setTab('profile'); } }, '스토리')),
    h('div', { style: { display: 'grid', gap: '2px', padding: '0 16px 12px' } },
      R0 ? h('div', { class: 'wsrvmini' }, h('span', { class: 'mute' }, '라이벌'), h('b', null, R0.n), h('small', { class: 'mute' }, n && n.c ? `${n.c.name}${n.live && n.live.apps ? ` · ${n.live.g}골 ${n.live.a}도움` : ''}` : ''), h('small', { class: 'mute' }, `맞대결 ${R0.h2h.w}승 ${R0.h2h.d}무 ${R0.h2h.l}패`)) : null,
      F.length ? h('div', { class: 'wsfds sm' }, ...F.map(feedRow)) : h('div', { class: 'mute', style: { fontSize: '12.5px', padding: '6px 0' } }, '아직 기사가 없습니다.')));
};
})(window);
