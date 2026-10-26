// Road to Legend — 내 경기 기록 탐색: 조건 필터(대회·시즌·상대·결과·골 유형 등)와 묶어 비교하기
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h } = U;
const st = U.st;
const fold = t => (U.fold ? U.fold(t) : String(t || '').toLowerCase());

function allMatches(s) {
  const out = [];
  for (const r of s.hist) for (const m of (r.log || [])) out.push(Object.assign({ season: r.label, age: r.age, club: r.clubName, clubId: r.club }, m));
  if (s.ss) { const c = s.w.clubs[s.ss.club]; for (const m of s.ss.matches) out.push(Object.assign({ season: s.ss.label, age: s.p.age, club: c ? c.name : '', clubId: s.ss.club, live: 1 }, C.logExtra(m), { y: m.comp === 'youth' ? 1 : 0, d: m.d, c: m.comp, cn: m.compName, s: m.stage, o: m.oppName, h: m.home, gf: m.gf, ga: m.ga, p: m.played ? 1 : 0, st: m.start ? 1 : 0, mi: m.min || 0, r: m.rating || 0, g: m.played ? m.st.goals : 0, a: m.played ? m.st.assists : 0, mo: m.motm ? 1 : 0, w: m.why || '', pen: m.pens || '', yc: m.played ? m.st.yellow : 0, rc: m.played ? m.st.red : 0 })); }
  return out;
}
const RES = m => m.gf > m.ga || m.pen === 'W' ? 'W' : m.gf < m.ga || m.pen === 'L' ? 'L' : 'D';
const CONDS = [
  ['', '조건 없음', () => true], ['g1', '득점한 경기', m => m.g >= 1], ['g2', '멀티골', m => m.g >= 2], ['g3', '해트트릭 이상', m => m.g >= 3],
  ['a1', '도움 기록', m => m.a >= 1], ['ga', '공격포인트', m => m.g + m.a >= 1], ['fk', '프리킥 골', m => m.fk >= 1], ['pk', '페널티킥 골', m => m.pk >= 1],
  ['hd', '헤더 골', m => m.hd >= 1], ['ob', '중거리 골', m => m.ob >= 1], ['mo', '경기 최우수(POTM)', m => m.mo], ['r8', '평점 8.0 이상', m => m.r >= 8],
  ['r6', '평점 6.0 미만', m => m.r && m.r < 6], ['rc', '퇴장', m => m.rc], ['yc', '경고', m => m.yc], ['fin', '결승전', m => m.s === '결승'], ['sub', '교체 출전', m => m.p && !m.st], ['full', '풀타임', m => m.mi >= 90]
];
const GROUPS = [['', '묶지 않음'], ['o', '상대팀'], ['cn', '대회'], ['season', '시즌'], ['club', '소속팀'], ['ha', '홈/원정'], ['age', '나이']];
const COMPS = [['', '전체 대회'], ['pro', '1군 전체 (유스·대표 제외)'], ['league', '리그'], ['cup', '국내 컵'], ['lcup', '리그컵'], ['cont', '대륙 대회'], ['nt', 'A매치'], ['ntY', '연령별 대표'], ['youth', '유스']];

function sum(ms) {
  const t = { n: ms.length, W: 0, D: 0, L: 0, g: 0, a: 0, fk: 0, pk: 0, hd: 0, ob: 0, mo: 0, mi: 0, rs: 0, rn: 0, yc: 0, rc: 0, sh: 0 };
  for (const m of ms) { t[RES(m)]++; t.g += m.g || 0; t.a += m.a || 0; t.fk += m.fk || 0; t.pk += m.pk || 0; t.hd += m.hd || 0; t.ob += m.ob || 0; t.mo += m.mo ? 1 : 0; t.mi += m.mi || 0; if (m.r) { t.rs += m.r; t.rn++; } t.yc += m.yc || 0; t.rc += m.rc || 0; t.sh += m.sh || 0; }
  t.r = t.rn ? t.rs / t.rn : 0; return t;
}
function sel(v, opts, on) { const e = h('select', { onchange: ev => on(ev.target.value) }, ...opts.map(([k, l]) => { const o = h('option', { value: k }, l); if (String(k) === String(v)) o.selected = true; return o; })); return e; }

U.pages.mx = function () {
  const s = U.S();
  const f = st.mx = st.mx || { comp: 'pro', season: '', club: '', opp: '', res: '', played: '1', cond: '', group: '', sort: 'n' };
  const root = h('div', { class: 'wrap prof screen', style: { maxWidth: '1100px' } });
  const all = allMatches(s);
  const seasons = [...new Set(all.map(m => m.season))].reverse();
  const clubs = [...new Set(all.filter(m => !['nt', 'ntY'].includes(m.c)).map(m => m.club))];
  const re = () => U.setTab('mx');
  const oppIn = h('input', { type: 'search', placeholder: '상대팀 이름', value: f.opp, oninput: e => { f.opp = e.target.value; clearTimeout(f.t); f.t = setTimeout(draw, 200); } });
  root.append(h('div', { class: 'sec' }, h('h3', null, '경기 기록 탐색'), h('div', { class: 'sub' }, '조건으로 경기를 골라내고, 상대팀·대회·시즌별로 묶어 비교합니다. 골 유형(프리킥·페널티·헤더·중거리)은 이번 업데이트 이후 경기부터 기록됩니다.'),
    h('div', { class: 'in mxf' },
      sel(f.comp, COMPS, v => { f.comp = v; re(); }),
      sel(f.season, [['', '전체 시즌']].concat(seasons.map(x => [x, x])), v => { f.season = v; re(); }),
      sel(f.club, [['', '전체 소속팀']].concat(clubs.map(x => [x, x])), v => { f.club = v; re(); }),
      sel(f.res, [['', '전체 결과'], ['W', '승'], ['D', '무'], ['L', '패']], v => { f.res = v; re(); }),
      sel(f.played, [['1', '출전 경기만'], ['', '명단 포함 전체']], v => { f.played = v; re(); }),
      sel(f.cond, CONDS.map(c => [c[0], c[1]]), v => { f.cond = v; re(); }),
      oppIn,
      sel(f.group, GROUPS, v => { f.group = v; re(); }))));
  const out = h('div', { style: { display: 'grid', gap: '14px' } });
  root.append(out);
  function draw() {
    out.replaceChildren();
    const cond = (CONDS.find(c => c[0] === f.cond) || CONDS[0])[2], q = fold(f.opp);
    const ms = all.filter(m => (!f.comp || (f.comp === 'pro' ? !['youth', 'nt', 'ntY'].includes(m.c) : m.c === f.comp)) && (!f.season || m.season === f.season) && (!f.club || m.club === f.club) && (!f.res || RES(m) === f.res) && (!f.played || m.p) && (!q || fold(m.o).includes(q)) && (!f.cond || (m.p && cond(m))));
    const t = sum(ms.filter(m => m.p));
    out.append(h('div', { class: 'statline mxsum' }, ...[['경기', `${t.n}`], ['승·무·패', `${t.W}·${t.D}·${t.L}`], ['골', t.g], ['도움', t.a], ['평균 평점', t.r ? t.r.toFixed(2) : '-'], ['POTM', t.mo]].map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v', style: { fontSize: '22px' } }, v)))));
    out.append(h('div', { class: 'chg' }, ...[['프리킥 골', t.fk], ['페널티 골', t.pk], ['헤더 골', t.hd], ['중거리 골', t.ob], ['슈팅', t.sh], ['경기당 득점', t.n ? (t.g / t.n).toFixed(2) : '-'], ['90분당 공격포인트', t.mi ? ((t.g + t.a) / t.mi * 90).toFixed(2) : '-'], ['경고', t.yc], ['퇴장', t.rc]].map(([l, v]) => h('span', { class: 'chip' }, `${l} ${v}`))));
    // 묶어서 비교
    if (f.group) {
      const key = m => f.group === 'ha' ? (m.h === true ? '홈' : m.h === false ? '원정' : '중립') : f.group === 'age' ? `${m.age}세` : (m[f.group] || '-');
      const gm = {}; for (const m of ms.filter(m => m.p)) (gm[key(m)] = gm[key(m)] || []).push(m);
      let rows = Object.entries(gm).map(([k, l]) => [k, sum(l)]);
      const SK = { n: x => x.n, g: x => x.g, a: x => x.a, r: x => x.r, gpm: x => x.n ? x.g / x.n : 0, w: x => x.n ? x.W / x.n : 0 };
      rows.sort((a, b) => (SK[f.sort] || SK.n)(b[1]) - (SK[f.sort] || SK.n)(a[1]));
      const th = (k, l) => h('th', { class: 'lnk' + (f.sort === k ? ' on' : ''), onclick: () => { f.sort = k; draw(); } }, l);
      out.append(h('div', { class: 'sec' }, h('h3', null, `${(GROUPS.find(g => g[0] === f.group) || [])[1]}별 비교`, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, '열 제목을 누르면 정렬')), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '640px' } },
        h('thead', null, h('tr', null, h('th', null, '구분'), th('n', '경기'), th('w', '승률'), h('th', null, '승·무·패'), th('g', '골'), th('a', '도움'), th('gpm', '경기당 골'), th('r', '평균 평점'))),
        h('tbody', null, ...rows.slice(0, 120).map(([k, x]) => h('tr', null, h('td', null, h('b', null, k)), h('td', null, x.n), h('td', null, x.n ? Math.round(x.W / x.n * 100) + '%' : '-'), h('td', null, `${x.W}·${x.D}·${x.L}`), h('td', null, x.g), h('td', null, x.a), h('td', null, x.n ? (x.g / x.n).toFixed(2) : '-'), h('td', null, x.r ? U.rt2(+x.r.toFixed(2)) : '-'))))))));
    }
    // 경기 목록
    const list = ms.slice().reverse();
    out.append(h('div', { class: 'sec' }, h('h3', null, `경기 ${ms.length}개`, ms.length > 300 ? h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, '최근 300경기만 표시') : null), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc mxl', style: { minWidth: '760px' } },
      h('thead', null, h('tr', null, ...['날짜', '시즌', '대회', '상대', '결과', '출전', '골', '도움', '평점', '비고'].map(x => h('th', null, x)))),
      h('tbody', null, ...list.slice(0, 300).map(m => {
        const note = [m.fk ? `프리킥 ${m.fk}` : '', m.pk ? `PK ${m.pk}` : '', m.hd ? `헤더 ${m.hd}` : '', m.ob ? `중거리 ${m.ob}` : '', m.mo ? 'POTM' : '', m.rc ? '퇴장' : '', !m.p ? (m.w || '미출전') : ''].filter(Boolean).join(' · ');
        const res = RES(m);
        return h('tr', null, h('td', { class: 'mute' }, m.d ? C.fmtDateY(m.d) : ''), h('td', null, m.season), h('td', null, U.compTag ? U.compTag(m.c, m.cn, m.s) : m.cn), h('td', null, m.o, h('span', { class: 'mute', style: { fontSize: '11px' } }, m.h === true ? ' (홈)' : m.h === false ? ' (원정)' : '')),
          h('td', null, h('span', { class: 'res ' + res, style: { padding: '1px 6px', borderRadius: '5px' } }, `${m.gf}-${m.ga}${m.pen ? (m.pen === 'W' ? ' PK승' : ' PK패') : ''}`)), h('td', null, m.p ? `${m.mi}'` : '-'), h('td', null, m.g || ''), h('td', null, m.a || ''), h('td', null, m.r ? U.rt1(m.r) : ''), h('td', { class: 'mute', style: { fontSize: '12px' } }, note));
      }))))));
  }
  draw();
  return root;
};
})(window);
