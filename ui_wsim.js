// Road to Legend — 관전 모드: 시즌 시뮬레이션 진행과 시즌별 요약
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, GM = G.TCG;
const { h, crest, flag } = U;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let running = false;
const BIGLG = ['ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BRA', 'ARG', 'KOR', 'JPN', 'USA', 'KSA', 'TUR', 'BEL', 'SCO'];

function clubChip(w, id, size = 18) { const c = w.clubs[id]; if (!c) return h('span', { class: 'mute' }, '-'); return h('span', { class: 'cc lnk', onclick: () => U.openClub(id) }, crest(c, size), h('span', null, c.name)); }
function pLink(n, pid) { return pid ? h('span', { class: 'lnk', onclick: () => U.openPlayer(pid) }, n) : h('span', null, n); }

async function run(n, bar) {
  if (running) return; running = true;
  const s = U.S();
  for (let i = 0; i < n; i++) {
    if (bar) bar.textContent = `${s.w.year}/${String(s.w.year + 1).slice(2)} 시즌 시뮬레이션 중… (${i + 1}/${n})`;
    await sleep(40);
    try { GM.simWorldSeason(s); } catch (e) { console.error(e); U.toast('시뮬레이션 중 오류가 났습니다.'); break; }
  }
  running = false; U.save(); U.setTab('wsim');
}

U.pages.wsim = function () {
  const s = U.S(), w = s.w;
  const root = h('div', { class: 'wrap prof screen' });
  const bar = h('div', { class: 'mute', style: { fontSize: '13px' } }, running ? '시뮬레이션 중…' : '');
  root.append(h('div', { class: 'sec wshead' }, h('div', { class: 'in' },
    h('div', null, h('div', { class: 'lbl' }, '관전 모드'), h('h2', { style: { margin: '2px 0 0' } }, `${w.year}/${String(w.year + 1).slice(2)} 시즌 대기 중`), h('div', { class: 'mute', style: { fontSize: '13px' } }, `지금까지 ${(s.ws || []).length}시즌 진행 · 모든 리그·컵·대륙 대회·국제 대회·이적·은퇴가 매 시즌 시뮬레이션됩니다`)),
    h('div', { class: 'wsbtns' },
      h('button', { class: 'btn gold', disabled: running ? true : null, onclick: () => run(1, bar) }, '다음 시즌 시뮬'),
      h('button', { class: 'btn ghost', disabled: running ? true : null, onclick: () => run(5, bar) }, '5시즌 연속'),
      h('button', { class: 'btn ghost', disabled: running ? true : null, onclick: () => run(10, bar) }, '10시즌 연속')), bar)));
  const ws = s.ws || [];
  if (!ws.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 진행한 시즌이 없습니다. [다음 시즌 시뮬]을 누르세요.'))); return root; }
  const r = ws[ws.length - 1];
  // 지난 시즌 요약
  const lgs = Object.keys(r.champs).map(id => w.lg[id]).filter(Boolean).sort((a, b) => (BIGLG.indexOf(a.nation) + 99) % 99 - (BIGLG.indexOf(b.nation) + 99) % 99 || a.name.localeCompare(b.name));
  const top = lgs.filter(l => BIGLG.includes(l.nation)).sort((a, b) => BIGLG.indexOf(a.nation) - BIGLG.indexOf(b.nation));
  root.append(h('div', { class: 'sec' }, h('h3', null, `${r.label} 시즌 결과`), h('div', { class: 'in wsgrid' },
    ...Object.entries(r.cont).filter(([k, v]) => v).map(([k, v]) => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, C.COMPS[k] ? C.COMPS[k].name : k), clubChip(w, v, 22))),
    ...(r.intl || []).map(t => h('div', { class: 'wsitem gold' }, h('div', { class: 'lbl' }, `${t[1]} ${r.y + 1}`), h('span', { class: 'cc' }, U.natCrest(t[2], 20), h('span', null, C.natName(t[2]))))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '발롱도르'), h('div', { class: 'in bdlist' }, ...r.bd.slice(0, 10).map((x, i) => h('div', null, h('span', { class: 'mute' }, i + 1), pLink(x[0], x[2]), h('span', { class: 'mute', style: { fontSize: '11px' } }, (w.clubs[x[1]] || {}).name || ''))))));
  root.append(h('div', { class: 'sec' }, h('h3', null, '주요 리그 우승·득점왕'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '560px' } },
    h('thead', null, h('tr', null, ...['리그', '우승', '득점왕'].map(x => h('th', null, x)))),
    h('tbody', null, ...top.map(l => { const b = r.boots[l.id]; return h('tr', null, h('td', null, h('span', { class: 'cc' }, flag(l.nation, 18), h('span', { class: 'lnk', onclick: () => { U.st.wv = Object.assign(U.st.wv || {}, { mode: 'league', nat: l.nation, lg: l.id, season: r.label }); U.setTab('table'); } }, l.name))), h('td', null, clubChip(w, r.champs[l.id])), h('td', null, b ? h('span', null, pLink(b[0], b[3]), h('span', { class: 'mute' }, ` ${b[2]}골`)) : '-')); }))))));
  // 역대 기록
  root.append(h('div', { class: 'sec' }, h('h3', null, '시즌별 역대 기록'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '900px' } },
    h('thead', null, h('tr', null, ...['시즌', 'EPL', '라리가', '세리에 A', '분데스리가', 'UCL', '발롱도르'].map(x => h('th', null, x)))),
    h('tbody', null, ...ws.slice().reverse().map(x => {
      const lgOf = nat => Object.keys(x.champs).find(id => w.lg[id] && w.lg[id].nation === nat && w.lg[id].tier === 1);
      const cell = nat => { const id = lgOf(nat); return h('td', null, id ? clubChip(w, x.champs[id], 16) : '-'); };
      return h('tr', null, h('td', null, x.label), cell('ENG'), cell('ESP'), cell('ITA'), cell('GER'), h('td', null, x.cont.UCL ? clubChip(w, x.cont.UCL, 16) : '-'), h('td', null, x.bd[0] ? pLink(x.bd[0][0], x.bd[0][2]) : '-'));
    }))))));
  return root;
};
})(window);
