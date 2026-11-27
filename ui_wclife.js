// 터치라인 커리어 UI — 월드 커리어 프로필의 '에이전트·생활' 탭 (v45)
// 재산·수입 / 관심 구단·문의 / 스폰서 / 생활 지출 / 투자 / 지원 스태프
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest, flag, toast } = U;
const L = () => C.WCL;
const eur = v => C.fmtEUR(Math.max(0, Math.round(v || 0)));
const sec = (title, sub, ...body) => h('div', { class: 'sec' }, h('h3', null, title, sub ? h('small', { class: 'mute', style: { fontWeight: 400, marginLeft: '8px', fontSize: '12px' } }, sub) : null), h('div', { class: 'in' }, ...body));
const redo = () => { U.save(); U.stay(); };

function moneySec(s) {
  const Lf = L().of(s), p = s.p, w = s.car.wage || 0, y = s.w.year;
  const spon = (Lf.spon || []).filter(x => x.y0 <= y && x.y1 >= y).reduce((a, x) => a + x.inc, 0);
  const supC = Object.keys(s.wc.sup || {}).filter(k => s.wc.sup[k]).reduce((a, k) => a + C.WC.supCost(s, k), 0);
  const optC = Object.keys(Lf.opt || {}).filter(k => Lf.opt[k]).reduce((a, k) => a + L().optCost(s, k), 0);
  const kv = (k, v, cls) => h('div', { class: 'wclkv' + (cls ? ' ' + cls : '') }, h('span', { class: 'mute' }, k), h('b', null, v));
  const last = Lf.last && Lf.last.y === y - 1 ? Lf.last : null;
  return sec('재산·수입', null,
    h('div', { class: 'wclkvs' }, kv('현재 재산', eur(p.money), 'big'), kv('투자 중', eur(Lf.inv)), kv('주급', w ? U.wageTxt(w) : '-'), kv('연봉 (52주)', eur(w * 52)), kv('스폰서 수입 /시즌', eur(spon)), kv('지출 /시즌', eur(supC + optC), supC + optC > w * 52 + spon ? 'bad' : '')),
    last ? h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '8px' } }, `지난 시즌 정산 — 스폰서 +${eur(last.spon)} · 생활 지출 −${eur(last.cost)}${last.inv ? ` · 투자 ${last.inv >= 0 ? '+' : '−'}${eur(Math.abs(last.inv))} (${(last.invR * 100).toFixed(1)}%)` : ''}${last.drop.length ? ` · 중단: ${last.drop.join(', ')}` : ''}`) : null,
    h('div', { class: 'mute', style: { fontSize: '11.5px', marginTop: '6px' } }, '주급·스폰서 수입은 시즌이 끝날 때 한꺼번에 들어오고, 지출은 그때 다음 시즌치가 나갑니다.'));
}

function intSec(s) {
  const Lf = L().of(s), w = s.w, ag = !!(s.wc.sup && s.wc.sup.agent), vis = L().visible(s), hid = L().hidden(s), can = L().canAsk(s);
  const ask = Lf.ask ? w.clubs[Lf.ask.c] : null, la = Lf.lastAsk && Lf.lastAsk.y >= w.year - 1 ? Lf.lastAsk : null;
  const rows = vis.map(x => {
    const c = w.clubs[x.c]; if (!c) return null; const lg = w.lg[c.lg] || {};
    return h('div', { class: 'wclint' }, h('span', { class: 'cc lnk', onclick: () => U.openClub(c.id) }, crest(c, 24)),
      h('div', null, h('b', { class: 'lnk', onclick: () => U.openClub(c.id) }, c.name), h('small', { class: 'mute' }, [lg.name, ag ? x.why : null].filter(Boolean).join(' · '))),
      h('span', { class: 'chip ' + (x.lv === 3 ? 'good' : x.lv === 2 ? 'blue' : '') }, L().LV[x.lv]),
      h('button', { class: 'btn sm ghost', disabled: !can, onclick: () => { const r = L().ask(s, c.id); if (r.no) toast(r.why); else toast(`${c.name}에 문의했습니다. 다음 이적시장에서 답이 옵니다.`, 2600); redo(); } }, '문의'));
  }).filter(Boolean);
  return sec('나를 지켜보는 구단', ag ? '에이전트 보고' : '언론·소문으로 들리는 것만',
    rows.length ? h('div', { class: 'wclints' }, ...rows) : h('div', { class: 'empty' }, s.car.status === 'first' ? '아직 눈에 띄는 관심은 없습니다.' : '1군에서 뛰기 시작하면 관심이 생깁니다.'),
    hid ? h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '6px' } }, `이 밖에 ${hid}곳이 조용히 지켜보는 중이라는 말이 있습니다. 에이전트가 있으면 이름까지 알 수 있습니다.`) : null,
    ask ? h('div', { class: 'wclnote' }, '문의 중: ', crest(ask, 18), ' ', h('b', null, ask.name), h('span', { class: 'mute' }, ' — 다음 이적시장 때 답이 옵니다')) : la ? h('div', { class: 'wclnote' }, `지난 문의: ${(w.clubs[la.c] || {}).name || ''} — ${la.ok ? '제안이 왔다' : '답이 없었다'}`) : null,
    h('div', { class: 'mute', style: { fontSize: '11.5px', marginTop: '6px' } }, `관심 단계: 주시 → 관심 → 영입 검토. 매달 활약·평판에 따라 바뀝니다. 문의는 이적시장마다 한 곳만 할 수 있고, ${ag ? '에이전트가 조용히 처리해 성사율이 높습니다' : '직접 움직이면 소문이 새어 감독·팬 시선이 나빠질 수 있습니다'}. 영입 검토 단계 구단은 문의하지 않아도 제안을 보내기도 합니다.`));
}

function sponSec(s) {
  const Lf = L().of(s), y = s.w.year;
  const act = (Lf.spon || []).filter(x => x.y1 >= y);
  const off = Lf.spOff || [];
  return sec('스폰서', `명성 ${Math.round(s.p.rep || 0)}`,
    off.length ? h('div', { class: 'wclints' }, ...off.map((o, i) => h('div', { class: 'wclint off' }, h('span', { class: 'wclbrand' }, o.n.slice(0, 1)), h('div', null, h('b', null, o.n), h('small', { class: 'mute' }, `${o.cat} · ${o.yrs}시즌 · ${o.img === 'bold' ? '화려한 캠페인 (명성 크게)' : '무난한 광고'} · ${C.fmtDate ? C.fmtDate(o.exp) : ''}까지 답`)), h('b', { style: { whiteSpace: 'nowrap' } }, `${eur(o.inc)} /시즌`),
      h('div', { style: { display: 'flex', gap: '6px' } }, h('button', { class: 'btn sm', onclick: () => { L().sponAccept(s, i, true); toast(`${o.n}와 계약했습니다.`); redo(); } }, '계약'), h('button', { class: 'btn sm ghost', onclick: () => { L().sponAccept(s, i, false); redo(); } }, '거절'))))) : null,
    act.length ? h('div', { class: 'wclints' }, ...act.map(x => h('div', { class: 'wclint' }, h('span', { class: 'wclbrand on' }, x.n.slice(0, 1)), h('div', null, h('b', null, x.n), h('small', { class: 'mute' }, `${x.cat} · ${x.y1 + 1}년 시즌 종료까지`)), h('b', { style: { whiteSpace: 'nowrap' } }, `${eur(x.inc)} /시즌`), h('span', { class: 'chip good' }, '계약 중')))) : null,
    !off.length && !act.length ? h('div', { class: 'empty' }, (s.p.rep || 0) < 22 ? '명성이 더 쌓이면 브랜드에서 연락이 옵니다.' : '아직 들어온 제안이 없습니다. 홍보팀이 있으면 연락이 더 자주 옵니다.') : null,
    h('div', { class: 'mute', style: { fontSize: '11.5px', marginTop: '6px' } }, '같은 분야 브랜드는 한 곳만 계약할 수 있고, 동시에 세 곳까지입니다. 제안은 45일 안에 답하지 않으면 사라집니다.'));
}

function optSec(s) {
  const Lf = L().of(s), O = L().OPT;
  return sec('생활 지출', '시즌 단위 비용',
    ...Object.keys(O).map(k => h('div', { class: 'wcsup' }, h('div', null, h('b', null, O[k][0]), h('small', { class: 'mute' }, O[k][1])), h('span', { class: 'mute', style: { fontSize: '12px', whiteSpace: 'nowrap' } }, `${eur(L().optCost(s, k))} /시즌`),
      h('button', { class: 'btn sm' + (Lf.opt[k] ? '' : ' ghost'), onclick: () => { const r = L().optSet(s, k, !Lf.opt[k]); if (r.no) toast(r.why); redo(); } }, Lf.opt[k] ? '하는 중' : '시작'))),
    h('div', { class: 'mute', style: { fontSize: '11.5px' } }, '시작할 때 한 시즌 비용을 내고, 시즌이 끝날 때마다 다음 시즌 비용이 나갑니다. 효과는 숫자로 보이지 않고 확률로만 작용합니다.'));
}

function invSec(s) {
  const Lf = L().of(s), m = s.p.money || 0, H = (Lf.hist || []).filter(x => x.inv);
  const b = (amt, l) => h('button', { class: 'btn sm ghost', disabled: amt > 0 ? m < amt : !(Lf.inv > 0), onclick: () => { const r = L().invest(s, amt); if (r.no) toast(r.why); redo(); } }, l);
  return sec('투자', `맡긴 돈 ${eur(Lf.inv)}`,
    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, b(100000, '+10만'), b(1000000, '+100만'), b(Math.floor(m * .5 / 1000) * 1000, '재산 절반'), b(-(Lf.inv || 0), '전액 회수')),
    H.length ? h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '8px' } }, '지난 결과: ' + H.slice(-5).map(x => `${x.y}/${String(x.y + 1).slice(2)} ${x.inv >= 0 ? '+' : '−'}${eur(Math.abs(x.inv))}`).join(' · ')) : null,
    h('div', { class: 'mute', style: { fontSize: '11.5px', marginTop: '6px' } }, '시즌이 끝날 때 수익이 정해집니다. 평균은 연 4~5% 정도지만 해마다 변동이 커서 손실이 날 때도 있습니다. 언제든 회수할 수 있습니다.'));
}

U.wcAgentTab = function (s) {
  if (!C.WCL || !s.wc) return [h('div', { class: 'empty' }, '월드 커리어에서만 쓸 수 있습니다.')];
  const ag = !!(s.wc.sup && s.wc.sup.agent);
  const head = h('div', { class: 'sec wclhead' }, h('div', { class: 'in' }, h('div', { class: 'wclag' + (ag ? ' on' : '') }, h('b', null, ag ? '유명 에이전트와 계약 중' : '에이전트 없음'), h('span', { class: 'mute' }, ag ? '관심 구단을 모두 보고하고, 이적시장마다 제안을 더 끌어옵니다.' : '관심 구단 일부만 들립니다. 아래 지원 스태프에서 에이전트를 둘 수 있습니다.'))));
  const left = h('div', { class: 'wclcol' }, intSec(s), sponSec(s)), right = h('div', { class: 'wclcol' }, moneySec(s), optSec(s), invSec(s));
  if (U.wcSupPanel) right.append(U.wcSupPanel(s));
  return [head, h('div', { class: 'wclg' }, left, right)];
};
})(window);
// 홈 화면 요약 (에이전트·생활)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, { h } = U;
U.wcLifeMini = function (s) {
  const L = C.WCL; if (!L || !s.wc) return null;
  const Lf = L.of(s), vis = L.visible(s), off = (Lf.spOff || []).length, top = vis.filter(x => x.lv >= 2).slice(0, 2);
  const row = (k, v) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' } }, h('span', { class: 'mute' }, k), h('b', null, v));
  return h('div', { class: 'panel' }, h('div', { class: 'ph', style: { padding: '12px 16px' } }, h('b', null, '에이전트·생활'), h('button', { class: 'btn ghost sm', onclick: () => { U.st.wcpt = 'agent'; U.setTab('profile'); } }, '열기')),
    h('div', { style: { display: 'grid', gap: '6px', padding: '4px 16px 14px' } },
      row('재산', C.fmtEUR(Math.max(0, s.p.money || 0))),
      row('관심 구단', vis.length ? `${vis.length}곳${top.length ? ' · ' + top.map(x => (s.w.clubs[x.c] || {}).name).join(', ') : ''}` : '없음'),
      off ? h('div', { class: 'chip good', style: { justifySelf: 'start' } }, `스폰서 제안 ${off}건 — 답을 기다립니다`) : null,
      Lf.ask ? row('문의 중', (s.w.clubs[Lf.ask.c] || {}).name || '') : null));
};
})(window);
