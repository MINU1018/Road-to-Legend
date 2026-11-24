// 터치라인 커리어 — FotMob식 페이지: 프로필, 능력치, 시즌 기록, 이적·가치, 리그 순위, 트로피
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, svg, flag, crest, trophy, rt1, rt2, ovrb, esc } = U;
const natCrest = (c, s) => U.natCrest(c, s);
U.pages = {};
const S = () => U.S();
const st = U.st;

// ---------- 포지션별 기준치 (시즌 단위 평균·표준편차, 시뮬레이션으로 추정) ----------
const NORMS = {};
const REP = { ST: 'ST', W: 'LW', AM: 'CAM', CM: 'CM', DM: 'CDM', FB: 'LB', CB: 'CB', GK: 'GK' };
const PCT = { passPct: ['passOk', 'passAtt'], longPct: ['longOk', 'longAtt'], dribPct: ['dribOk', 'dribAtt'], duelPct: ['duelW', 'duelA'], aerPct: ['aerW', 'aerA'], savePct: ['saves', 'sotFaced'] };
function norms(role) {
  if (NORMS[role]) return NORMS[role];
  const pos = REP[role], seasons = [];
  for (let s = 0; s < 36; s++) {
    const p = C.newPlayer({ pos, name: 'n', nat: 'ENG', num: 1, foot: 'R', height: 182, year: 2026 });
    const lv = C.rnd(64, 82);
    for (let i = 0; i < 25; i++) { for (const k of C.AK) p.a[k] = Math.max(10, Math.min(99, p.a[k] + (lv - C.ovrOf(p)) * .9)); }
    const t = C.blankStats();
    const sT = C.rnd(68, 82), sO = C.rnd(68, 82);
    for (let m = 0; m < 26; m++) { const [lt, lo] = C.lambdas(sT, sO, m % 2 ? 1 : -1); C.addStats(t, C.playerMatch(p, { lamT: lt, lamO: lo, minutes: 90, start: true, sT, sO }).st); }
    seasons.push(per90(t));
  }
  const out = {};
  for (const k of Object.keys(seasons[0])) { const v = seasons.map(x => x[k]); const m = v.reduce((a, b) => a + b, 0) / v.length; const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length) || m * .3 || 1; out[k] = [m, Math.max(sd, m * .12, .01)]; }
  NORMS[role] = out;
  return out;
}
function per90(t) {
  const f = t.min / 90 || 1, o = {};
  for (const k of C.STATKEYS) o[k] = t[k] / f;
  for (const k in PCT) { const [a, b] = PCT[k]; o[k] = t[b] ? t[a] / t[b] * 100 : 0; }
  return o;
}
const PHI = z => 1 / (1 + Math.exp(-1.7 * z));
const INV = new Set(['disp', 'fouls', 'dribPast', 'concOn', 'xgaOn', 'yellow', 'red']);
function pctl(role, k, t) { const n = norms(role)[k]; if (!n) return .5; const v = per90(t)[k]; let z = (v - n[0]) / n[1]; if (INV.has(k)) z = -z; return Math.max(.02, Math.min(.99, PHI(z))); }

// ---------- 시즌 데이터 ----------
function liveRec() {
  const s = S(), ss = s.ss; if (!ss) return null;
  const c = s.w.clubs[ss.club], lg = C.leagueOf(s, ss.club);
  const club = ss.matches.filter(m => !['nt', 'ntY', 'youth'].includes(m.comp));
  const youthM = ss.matches.filter(m => m.comp === 'youth');
  const agg = C.compAgg(club);
  const total = C.totalAgg(club);
  const youth = C.totalAgg(youthM);
  return { live: true, label: ss.label, age: s.p.age, club: ss.club, clubName: c.name, short: c.short, c1: c.c1, c2: c.c2, lgName: lg ? lg.name : '', status: s.car.status, total, agg, youth, youthLabel: youthM.length ? youthM[0].compName.replace(' 리그', '') : '', youthRating: C.avgRating(youth), nt: C.totalAgg(ss.matches.filter(m => ['nt', 'ntY'].includes(m.comp))), ntA: C.totalAgg(ss.matches.filter(m => m.comp === 'nt')), ntY: C.totalAgg(ss.matches.filter(m => m.comp === 'ntY')), ntLvl: ss.nt ? ss.nt.lvl : null, pos: s.p.pos, rating: C.avgRating(total), trophies: [], awards: [],
    log: ss.matches.map(m => ({ ...C.logExtra(m), y: m.comp === 'youth' ? 1 : 0, d: m.d, c: m.comp, cn: m.compName, s: m.stage, o: m.oppName, h: m.home, gf: m.gf, ga: m.ga, p: m.played ? 1 : 0, st: m.start ? 1 : 0, mi: m.min || 0, r: m.rating || 0, g: m.played ? m.st.goals : 0, a: m.played ? m.st.assists : 0, mo: m.motm ? 1 : 0, w: m.why || '', pen: m.pens || '', yc: m.played ? m.st.yellow : 0, rc: m.played ? m.st.red : 0 })),
    shots: club.filter(m => m.played && m.shots).flatMap(m => m.shots), pos: s.p.pos };
}
function seasons() { const s = S(); const list = s.hist.map((r, i) => ({ r, i })); const lv = liveRec(); if (lv) list.push({ r: lv, i: 'live' }); return list; }
function selRec() {
  const list = seasons(); if (!list.length) return null;
  if (st.viewIdx == null || st.viewIdx === 'live') return list[list.length - 1];
  return list.find(x => x.i === st.viewIdx) || list[list.length - 1];
}
function seasonSelect(onch) {
  const list = seasons(), cur = selRec();
  const sel = h('select', { class: 'sel', id: 'seasonSel', onchange: e => { st.viewIdx = e.target.value === 'live' ? 'live' : +e.target.value; onch(); } }, ...list.slice().reverse().map(x => h('option', { value: x.i, selected: cur && x.i === cur.i ? true : null }, `${x.r.label} · ${x.r.clubName}${x.r.live ? ' (진행 중)' : ''}`)));
  return sel;
}
const COMPNAME = { league: '리그', cup: '국내 컵', lcup: '리그컵', cont: '대륙 대회', youth: '유스 리그', nt: 'A매치', ntY: '연령별 대표' };

// ---------- 프로필 ----------
U.pages.profile = function () {
  const s = S(), p = s.p;
  const root = h('div', { class: 'wrap prof screen' });
  const sr = selRec();
  if (!sr) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '첫 시즌을 시작하면 기록이 쌓입니다.'))); return root; }
  let r = sr.r;
  // 유스만 뛴 시즌은 유스 기록으로 보여 준다
  if (!r.total.min && r.youth && r.youth.min) r = Object.assign({}, r, { total: r.youth, rating: r.youthRating, agg: {}, lgName: `${r.youthLabel || 'U18'} 유스 리그` });
  const role = C.ROLE[r.pos || p.pos];
  const c1 = r.c1 || '#333', fg = U.lum(c1) > .62 ? '#111' : '#fff';
  // 헤더
  const initials = p.name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const c = s.w.clubs[s.car.club];
  root.append(h('div', { class: 'phead' },
    h('div', { class: 'band', style: { background: c1, color: fg } }, h('div', { class: 'avatar', style: { background: r.c2 || '#222', color: U.lum(r.c2 || '#222') > .62 ? '#111' : '#fff' } }, initials),
      h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { style: { fontSize: '24px', fontWeight: 700, lineHeight: 1.2 } }, p.name), h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', opacity: .9 } }, crest({ id: r.club, c1: r.c1, c2: r.c2, short: r.short }, 20), r.clubName)),
      h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontSize: '11px', opacity: .8, fontWeight: 700, letterSpacing: '.08em' } }, 'OVR'), h('div', { class: 'num', style: { fontSize: '36px', fontWeight: 800, lineHeight: 1 } }, C.ovrOf(p)))),
    profileInfo()));
  const top = h('div', { class: 'selrow' }, h('span', { class: 'lbl' }, '시즌'), seasonSelect(() => U.render()));
  root.append(top);
  // 선수 특성 + 가치
  root.append(h('div', { class: 'two' }, traitsSec(r, role), valueSec()));
  root.append(summarySec(r));
  root.append(matchLogSec(r));
  root.append(h('div', { class: 'two' }, heatSec(r), shotSec(r)));
  root.append(statsSec(r, role));
  root.append(h('div', { class: 'two' }, careerSec(), trophySec()));
  root.append(aboutSec(r));
  return root;
};
function profileInfo() {
  const s = S(), p = s.p;
  const alts = C.POS.filter(x => x !== p.pos && C.ovrOf(p, x) >= C.ovrOf(p) - 2 && x !== 'GK');
  const mp = h('div', { class: 'minipitch' }, svg('<svg viewBox="0 0 68 80" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="var(--line)" stroke-width=".6"><rect x="14" y="0" width="40" height="13"/><line x1="0" y1="62" x2="68" y2="62"/><circle cx="34" cy="62" r="8"/></svg>'));
  const place = (pos, alt) => { const [x, y] = U.POSXY[pos]; mp.append(h('span', { class: 'mk' + (alt ? ' alt' : ''), style: { left: x + '%', top: (y * .82 + 4) + '%' } }, pos)); };
  alts.slice(0, 3).forEach(x => place(x, true)); place(p.pos, false);
  const val = S().value || 0;
  const contract = s.car.status === 'free' ? '-' : s.car.status === 'youth' ? '유스 계약' : s.car.status === 'loan' ? `${s.w.year + 1}. 6. 30. (임대)` : `${s.car.contract + 1}. 6. 30.`;
  const cell = (v, k) => h('div', { class: 'cell' }, h('b', null, v), h('span', null, k));
  return h('div', { class: 'pinfo' },
    cell(p.height + 'cm', '키'), cell(String(p.num), '셔츠'),
    cell(`${p.age}세`, `${p.born}년생`), cell(p.foot === 'R' ? '오른발' : '왼발', `주로 사용하는 발 · 약발 ${'★'.repeat(p.weak)}`),
    h('div', { class: 'cell' }, h('b', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, flag(p.nat, 18), C.natName(p.nat)), h('span', null, '국가')), cell(C.fmtEUR(val), '이적 가치'),
    cell(contract, '계약 종료'), cell('★'.repeat(p.skill) + '☆'.repeat(5 - p.skill), '개인기'),
    h('div', { class: 'pos' }, h('b', null, '포지션'), h('div', null, h('div', { style: { color: 'var(--gold)', fontWeight: 600 } }, '기본'), h('div', { class: 'mute' }, C.POSKO[p.pos])), alts.length ? h('div', null, h('div', { class: 'mute', style: { fontSize: '12px' } }, '기타'), h('div', { style: { fontSize: '13px' } }, alts.map(x => C.POSKO[x]).join(', '))) : null, mp));
}
function traitsSec(r, role) {
  const t = r.total;
  const sec = h('div', { class: 'sec' }, h('h3', null, '선수 특성'), h('div', { class: 'sub' }, `같은 포지션 선수들과 비교한 ${r.label} 통계`));
  if (!t.min) { sec.append(h('div', { class: 'empty' }, '출전 기록이 없습니다.')); return sec; }
  const keys = role === 'GK' ? [['saves', '선방'], ['gPrev', '실점 방지'], ['claims', '공중볼 처리'], ['longOk', '롱패스'], ['passPct', '패스 정확도'], ['cs', '클린시트']] : [['touches', '터치'], ['chances', '기회 창출'], ['aerPct', '공중 볼 경합 성공'], ['defAct', '수비적 행동'], ['goals', '득점'], ['shots', '슛 시도']];
  const vals = keys.map(([k]) => Math.round(pctl(role, k, t) * 100));
  const W = 300, H = 230, cx = 150, cy = 118, R = 78;
  const pt = (i, f) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  const ring = f => keys.map((_, i) => pt(i, f).join(',')).join(' ');
  const poly = vals.map((v, i) => pt(i, Math.max(.06, v / 100)).join(',')).join(' ');
  const lab = keys.map(([, l], i) => { const [x, y] = pt(i, 1.32); const anchor = Math.abs(x - cx) < 5 ? 'middle' : x > cx ? 'start' : 'end'; return `<text x="${x}" y="${y + 4}" text-anchor="${anchor}" font-size="11" fill="var(--mute)">${l} <tspan font-weight="700" fill="var(--fg)">${vals[i]}%</tspan></text>`; }).join('');
  sec.append(h('div', { class: 'in' }, svg(`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;overflow:visible"><polygon points="${ring(1)}" fill="var(--panel2)" stroke="var(--line)"/><polygon points="${ring(.66)}" fill="none" stroke="var(--line)"/><polygon points="${ring(.33)}" fill="none" stroke="var(--line)"/><polygon points="${poly}" fill="rgba(242,193,78,.55)" stroke="#f2c14e" stroke-width="1.5"><animate attributeName="opacity" from="0" to="1" dur=".6s"/></polygon>${lab}</svg>`)));
  return sec;
}
function valueSec() {
  const s = S(), vh = s.vh;
  const sec = h('div', { class: 'sec' }, h('h3', null, '이적 가치: ', h('span', { class: 'num', style: { fontSize: '20px' } }, C.fmtEUR(s.value || 0))));
  const mx = Math.max(...vh.map(v => v.v));
  const best = vh.find(v => v.v === mx);
  sec.append(h('div', { class: 'sub' }, `최고: ${C.fmtEUR(mx)} (${best.y}년, ${best.age}세)`));
  sec.append(h('div', { class: 'in' }, valueChart(vh, 300, 170)));
  return sec;
}
function valueChart(vh, W, H) {
  if (vh.length < 2) return h('div', { class: 'empty' }, '시즌이 끝나면 가치 변화가 그려집니다.');
  const pad = { l: 46, r: 12, t: 26, b: 22 };
  const mx = Math.max(...vh.map(v => v.v)) * 1.12 || 1;
  const x = i => pad.l + i * (W - pad.l - pad.r) / (vh.length - 1), y = v => pad.t + (1 - v / mx) * (H - pad.t - pad.b);
  const pts = vh.map((v, i) => `${x(i)},${y(v.v)}`).join(' ');
  const ticks = [0, .5, 1].map(f => mx / 1.12 * f);
  let g = ticks.map(t => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-dasharray="3 3"/><text x="${pad.l - 6}" y="${y(t) + 4}" font-size="10" text-anchor="end" fill="var(--mute)">${C.fmtEUR(t)}</text>`).join('');
  const step = Math.ceil(vh.length / 6);
  g += vh.map((v, i) => i % step === 0 || i === vh.length - 1 ? `<text x="${x(i)}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--mute)">${v.y}</text>` : '').join('');
  // 구단이 바뀐 지점에 엠블럼
  let marks = '';
  vh.forEach((v, i) => { if (i === 0 || vh[i - 1].club !== v.club) { const c = S().w.clubs[v.club]; if (c) marks += `<g transform="translate(${x(i) - 8},${y(v.v) - 24})">${crest(c, 16).outerHTML}</g>`; } });
  return svg(`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto"><defs><linearGradient id="vg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f2c14e" stop-opacity=".35"/><stop offset="1" stop-color="#f2c14e" stop-opacity="0"/></linearGradient></defs>${g}<polygon points="${pad.l},${y(0)} ${pts} ${x(vh.length - 1)},${y(0)}" fill="url(#vg)"/><polyline points="${pts}" fill="none" stroke="#f2c14e" stroke-width="2" stroke-linejoin="round"/><circle cx="${x(vh.length - 1)}" cy="${y(vh[vh.length - 1].v)}" r="4" fill="#f2c14e"/>${marks}</svg>`);
}
U.valueChart = valueChart;
function summarySec(r) {
  const comps = Object.keys(r.agg || {});
  const sec = h('div', { class: 'sec' });
  const hasY = r.youth && r.youth.apps;
  let sel = st.compSel && (st.compSel === 'all' || comps.includes(st.compSel) || (st.compSel === 'youthT' && hasY)) ? st.compSel : (comps.includes('league') ? 'league' : hasY && !r.total.apps ? 'youthT' : 'all');
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    const t = sel === 'all' ? r.total : sel === 'nt' ? (r.ntA || r.nt) : sel === 'ntY' ? r.ntY : sel === 'youthT' ? r.youth : r.agg[sel].st;
    const rr = C.avgRating(t);
    body.append(h('div', { class: 'sgrid' }, ...U.pcols(r.pos || S().p.pos).slice(0, 3).map(([l, f]) => [l, f(t)]).concat([['경기', t.apps]]).map(([k, v]) => h('div', null, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)))),
      h('div', { class: 'sgrid', style: { borderTop: '1px solid var(--line)' } }, h('div', null, h('div', { class: 'v' }, t.min.toLocaleString()), h('div', { class: 'k' }, '출전 시간')), h('div', null, h('div', { class: 'v' }, rr ? rt2(rr) : '-'), h('div', { class: 'k' }, '평점')), h('div', null, h('div', { class: 'v' }, h('span', { style: { color: '#f2c14e' } }, '▮ '), t.yellow), h('div', { class: 'k' }, '경고')), h('div', null, h('div', { class: 'v' }, h('span', { style: { color: '#e5484d' } }, '▮ '), t.red), h('div', { class: 'k' }, '퇴장'))));
  };
  const opts = [['all', '1군 모든 대회']].concat(comps.map(k => [k, r.agg[k].name || COMPNAME[k]]));
  if (hasY) opts.push(['youthT', `${r.youthLabel || 'U18'} 유스 리그`]);
  if (r.ntA || r.ntY) { if (r.ntA && r.ntA.apps) opts.push(['nt', 'A대표팀']); if (r.ntY && r.ntY.apps) opts.push(['ntY', `${r.ntLvl && r.ntLvl !== 'A' ? r.ntLvl : '연령별'} 대표팀`]); }
  else if (r.nt && r.nt.apps) opts.push(['nt', r.ntLvl && r.ntLvl !== 'A' ? `${r.ntLvl} 대표팀` : 'A대표팀']);
  const s2 = h('select', { class: 'sel', id: 'compSel', onchange: e => { sel = st.compSel = e.target.value; draw(); } }, ...opts.map(([k, l]) => h('option', { value: k, selected: k === sel ? true : null }, l)));
  sec.append(h('h3', null, h('span', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, crest({ id: r.club, c1: r.c1, c2: r.c2, short: r.short }, 20), `${r.lgName || r.clubName} ${r.label}`), s2), h('div', { class: 'in' }, body));
  draw();
  return sec;
}
function matchLogSec(r) {
  const log = (r.log || []).slice().sort((a, b) => b.d - a.d);
  const sec = h('div', { class: 'sec' }, h('h3', null, '경기 통계', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, `${log.filter(m => m.p).length}경기 출전 / 일정 ${log.length}경기`)));
  if (!log.length) { sec.append(h('div', { class: 'empty' }, '경기가 없습니다.')); return sec; }
  let page = 0; const per = 10;
  // 경기별 열: 골키퍼 실점·선방, 수비수 골·차단, 그 외 골·도움 (예전 기록은 값이 없을 수 있음)
  const pk = U.PK(r.pos || S().p.pos), dash = v => v == null ? '·' : v;
  const mcols = pk === 'GK' ? [['실점', m => dash(m.ca)], ['선방', m => dash(m.sv)]] : pk === 'DF' || pk === 'DM' ? [['골', m => m.g], ['차단', m => dash(m.tk)]] : [['골', m => m.g], ['도움', m => m.a]];
  const tb = h('tbody'); const nav = h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '10px 18px 16px' } });
  const draw = () => {
    tb.innerHTML = '';
    log.slice(page * per, page * per + per).forEach(m => {
      const res = m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : (m.pen === 'W' ? 'W' : m.pen === 'L' ? 'L' : 'D');
      tb.append(h('tr', null, h('td', { class: 'mute' }, C.fmtDate(m.d)), h('td', { class: 'o' }, h('div', null, h('b', { style: { fontWeight: 600 } }, m.o)), h('div', { class: 'dim', style: { fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, U.compTag(m.c, m.cn, m.s), `${m.cn}${m.h === true ? ' · 홈' : m.h === false ? ' · 원정' : ''}`)),
        h('td', null, h('span', { class: 'res ' + res, style: { display: 'inline-block', minWidth: '56px', textAlign: 'center', borderRadius: '6px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' } }, `${({ W: '승', L: '패', D: '무' })[res]} ${m.gf}-${m.ga}`), m.pen ? h('span', { class: 'dim', style: { fontSize: '11px' } }, ' PK') : null),
        h('td', { class: 'num', style: { textAlign: 'right' } }, m.p ? `${m.mi}'` : h('span', { class: 'dim', style: { fontFamily: 'var(--font-body)', fontSize: '11px' } }, m.w || '-')),
        ...mcols.map(([, f]) => h('td', { class: 'num', style: { textAlign: 'right' } }, m.p ? f(m) : '')),
        h('td', { style: { textAlign: 'right' } }, m.yc ? h('span', { style: { color: '#f2c14e' } }, '▮') : null, m.rc ? h('span', { style: { color: '#e5484d' } }, '▮') : null),
        h('td', { style: { textAlign: 'right' } }, m.p && m.r ? rt1(m.r) : '', m.mo ? h('span', { title: '경기 최우수 선수', style: { color: 'var(--gold)', marginLeft: '4px' } }, '★') : null)));
    });
    nav.innerHTML = '';
    nav.append(h('button', { class: 'btn ghost sm', disabled: page <= 0 ? true : null, onclick: () => { page--; draw(); } }, '‹ 이전'), h('span', { class: 'mute' }, `${page + 1} / ${Math.ceil(log.length / per)}`), h('button', { class: 'btn ghost sm', disabled: (page + 1) * per >= log.length ? true : null, onclick: () => { page++; draw(); } }, '다음 ›'));
  };
  draw();
  sec.append(h('div', { class: 'tscroll', style: { padding: '8px 12px 0' } }, h('table', { class: 'mlog' }, h('thead', null, h('tr', { class: 'lbl' }, h('td'), h('td'), h('td'), h('td', { style: { textAlign: 'right' } }, '분'), ...mcols.map(([l]) => h('td', { style: { textAlign: 'right' } }, l)), h('td'), h('td', { style: { textAlign: 'right' } }, '평점'))), tb)), nav);
  return sec;
}
// 히트맵
const HEAT = { GK: [[6, 50, 5, 14]], CB: [[24, 50, 12, 22], [38, 45, 10, 18]], LB: [[40, 14, 16, 10], [68, 10, 14, 8]], RB: [[40, 86, 16, 10], [68, 90, 14, 8]], CDM: [[42, 50, 14, 20], [55, 45, 10, 18]], CM: [[52, 50, 18, 24], [66, 40, 10, 14]], CAM: [[68, 50, 14, 22], [80, 40, 8, 14]], LM: [[60, 14, 20, 10], [80, 18, 10, 10]], RM: [[60, 86, 20, 10], [80, 82, 10, 10]], LW: [[76, 16, 14, 12], [86, 34, 8, 10]], RW: [[76, 84, 14, 12], [86, 66, 8, 10]], ST: [[84, 50, 10, 16], [70, 46, 10, 18], [92, 50, 4, 8]] };
function heatSec(r) {
  const sec = h('div', { class: 'sec' }, h('h3', null, '히트맵'), h('div', { class: 'sub' }, `터치: ${r.total.touches || 0}`));
  const cv = h('canvas', { width: 420, height: 272, style: { width: '100%', height: 'auto', borderRadius: '8px', background: 'var(--panel2)', display: 'block' } });
  sec.append(h('div', { class: 'in' }, cv));
  requestAnimationFrame(() => drawHeat(cv, r));
  return sec;
}
function drawHeat(cv, r) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const pos = r.pos || S().p.pos;
  const seed = (r.label || '').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  let sd = seed; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  const nrm = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const grid = new Float32Array(W * H);
  const n = Math.min(900, Math.max(80, r.total.touches || 0));
  for (let i = 0; i < n; i++) {
    const a = HEAT[pos][Math.floor(rnd() * HEAT[pos].length)];
    const x = Math.max(1, Math.min(99, a[0] + nrm() * a[2])), y = Math.max(1, Math.min(99, a[1] + nrm() * a[3]));
    const px = x / 100 * W, py = y / 100 * H, rad = 20;
    for (let dy = -rad; dy <= rad; dy += 2) for (let dx = -rad; dx <= rad; dx += 2) { const X = Math.round(px + dx), Y = Math.round(py + dy); if (X < 0 || Y < 0 || X >= W || Y >= H) continue; grid[Y * W + X] += Math.exp(-(dx * dx + dy * dy) / (2 * 81)); }
  }
  let mx = 0; for (let i = 0; i < grid.length; i++) if (grid[i] > mx) mx = grid[i];
  const img = ctx.createImageData(W, H);
  for (let Y = 0; Y < H; Y += 2) for (let X = 0; X < W; X += 2) {
    const v = grid[Y * W + X] / mx; if (v < .08) continue;
    const col = v > .75 ? [229, 72, 77] : v > .5 ? [240, 160, 46] : v > .3 ? [242, 223, 78] : [79, 211, 120];
    const al = Math.min(220, 70 + v * 200);
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) { const o = ((Y + yy) * W + X + xx) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = al; }
  }
  ctx.clearRect(0, 0, W, H);
  ctx.putImageData(img, 0, 0);
  ctx.filter = 'none';
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 2, W - 4, H - 4); ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 36, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(2, H / 2 - 80, 66, 160); ctx.strokeRect(W - 68, H / 2 - 80, 66, 160);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 13px sans-serif'; ctx.fillText('공격 방향 ›', W / 2 + 8, 18);
}
// 슛 맵
function shotSec(r) {
  const shots = r.shots || [];
  const t = r.total;
  const sec = h('div', { class: 'sec' }, h('h3', null, '시즌 슛 맵'), h('div', { class: 'sub' }, `유효: ${t.shots ? Math.round(t.sot / t.shots * 100) : 0}%`));
  const filters = [['all', '전체'], ['goal', `득점 ${shots.filter(x => x.g).length}`], ['R', `오른발 ${shots.filter(x => x.t === 'R').length}`], ['L', `왼발 ${shots.filter(x => x.t === 'L').length}`], ['H', `헤더 ${shots.filter(x => x.t === 'H').length}`], ['in', `박스 내 ${shots.filter(x => x.y <= 16.5 && x.x > 20 && x.x < 80).length}`], ['out', `박스 밖 ${shots.filter(x => !(x.y <= 16.5 && x.x > 20 && x.x < 80)).length}`], ['P', `페널티 ${shots.filter(x => x.t === 'P').length}`]];
  let f = 'all';
  const holder = h('div');
  const chips = h('div', { class: 'fchips' });
  const draw = () => {
    const list = shots.filter(x => f === 'all' || (f === 'goal' ? x.g : f === 'in' ? (x.y <= 16.5 && x.x > 20 && x.x < 80) : f === 'out' ? !(x.y <= 16.5 && x.x > 20 && x.x < 80) : x.t === f));
    const W = 340, H = 220, sx = W / 100, sy = 5.2;
    let s = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="10" fill="var(--panel2)" stroke="var(--line)"/><rect x="${20.5 * sx}" y="2" width="${59 * sx}" height="${16.5 * sy}" fill="none" stroke="var(--line)" stroke-width="2"/><rect x="${36.5 * sx}" y="2" width="${27 * sx}" height="${5.5 * sy}" fill="none" stroke="var(--line)" stroke-width="2"/><path d="M${40 * sx} ${16.5 * sy + 2} A ${9.15 * sy} ${9.15 * sy} 0 0 0 ${60 * sx} ${16.5 * sy + 2}" fill="none" stroke="var(--line)" stroke-width="2"/><rect x="${44.6 * sx}" y="0" width="${10.8 * sx}" height="5" fill="var(--mute)"/>`;
    for (const x of list) { const cx = x.x * sx, cy = 2 + x.y * sy, rad = 4 + x.xg * 14; s += x.g ? `<g><circle cx="${cx}" cy="${cy}" r="${rad}" fill="#f2c14e" fill-opacity=".85" stroke="#0b0d11"/><circle cx="${cx}" cy="${cy}" r="2.4" fill="#0b0d11"/></g>` : `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${x.on ? 'rgba(242,193,78,.25)' : 'none'}" stroke="#f2c14e" stroke-width="1.4" stroke-opacity=".8"/>`; }
    holder.innerHTML = ''; holder.append(svg(`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${s}</svg>`));
    chips.innerHTML = ''; filters.forEach(([k, l]) => chips.append(h('button', { class: f === k ? 'on' : '', onclick: () => { f = k; draw(); } }, l)));
  };
  draw();
  sec.append(h('div', { class: 'in', style: { display: 'grid', gap: '10px' } }, holder, h('div', { class: 'sgrid' }, h('div', null, h('div', { class: 'v' }, t.shots), h('div', { class: 'k' }, '슛')), h('div', null, h('div', { class: 'v' }, t.goals), h('div', { class: 'k' }, '득점')), h('div', null, h('div', { class: 'v' }, t.xg.toFixed(2)), h('div', { class: 'k' }, 'xG')), h('div', null, h('div', { class: 'v' }, t.xgot.toFixed(2)), h('div', { class: 'k' }, 'xGOT'))), chips));
  return sec;
}
// 시즌 성적 막대
const STATSEC = [
  ['슈팅', [['goals', '득점'], ['xg', '예상 골 (xG)', 2], ['xgot', 'xG 유효 슈팅 (xGOT)', 2], ['npxg', 'PK 제외한 xG', 2], ['shots', '슛'], ['sot', '유효 슈팅'], ['headShots', '헤딩 슈팅']]],
  ['패스', [['assists', '어시스트'], ['xa', '예상 어시스트 (xA)', 2], ['passOk', '성공한 패스'], ['passPct', '성공한 패스 %', 1, '%'], ['longOk', '정확한 긴 패스'], ['longPct', '정확한 긴 패스 %', 1, '%'], ['thru', '라인을 뚫는 패스'], ['chances', '기회 창출'], ['bigCh', '큰 기회 만듦']]],
  ['점유율', [['dribOk', '드리블 성공'], ['dribPct', '드리블 성공 %', 1, '%'], ['duelW', '볼 경합 성공'], ['duelPct', '볼 경합 성공 %', 1, '%'], ['aerW', '공중 볼 경합 성공'], ['aerPct', '공중 볼 경합 성공 %', 1, '%'], ['touches', '터치'], ['boxTouch', '상대편 박스 내에서의 터치'], ['disp', '볼 뺏김'], ['foulsWon', '획득한 파울']]],
  ['수비', [['defAct', '수비적 행동'], ['tackles', '태클'], ['ints', '가로채기'], ['blocks', '막힌 슛'], ['fouls', '반칙'], ['recov', '볼 회수'], ['ftRec', '공격 지역 볼 탈취'], ['dribPast', '드리블 허용'], ['clear', '걷어내기'], ['cs', '클린 시트'], ['concOn', '출전 시 실점'], ['xgaOn', '출전 중 xG 실점', 2]]],
  ['골키핑', [['saves', '선방'], ['savePct', '선방률', 1, '%'], ['sotFaced', '유효 슈팅 허용'], ['gPrev', '실점 방지', 2], ['claims', '공중볼 처리']], 'GK'],
  ['반칙', [['yellow', '경고'], ['red', '퇴장']]]
];
function statsSec(r, role) {
  const t = r.total;
  const sec = h('div', { class: 'sec' });
  let mode = 'tot';
  const body = h('div', { class: 'bars' });
  const seg = h('div', { class: 'seg', style: { width: '180px' } });
  const draw = () => {
    body.innerHTML = ''; seg.innerHTML = '';
    [['tot', '합계'], ['p90', '90분당']].forEach(([k, l]) => seg.append(h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; draw(); } }, l)));
    if (!t.min) { body.append(h('div', { class: 'empty' }, '출전 기록이 없습니다.')); return; }
    const p9 = per90(t);
    body.append(h('div', { style: { display: 'flex', justifyContent: 'flex-end' }, class: 'lbl' }, '순위 (같은 포지션 대비)'));
    // 포지션에 따라 중요한 항목부터: 골키퍼는 골키핑, 수비수는 수비가 맨 위 (골키퍼는 슈팅 생략)
    const order = role === 'GK' ? ['골키핑', '수비', '패스', '점유율', '반칙'] : ['CB', 'FB', 'DM'].includes(role) ? ['수비', '패스', '점유율', '슈팅', '반칙'] : ['슈팅', '패스', '점유율', '수비', '반칙'];
    for (const [title, rows, only] of order.map(t => STATSEC.find(x => x[0] === t)).filter(Boolean)) {
      if (only && only !== role) continue;
      if (title === '골키핑' && role !== 'GK') continue;
      body.append(h('h4', null, title));
      for (const [k, l, dp, unit] of rows) {
        const isPct = !!PCT[k];
        const raw = isPct ? p9[k] : mode === 'p90' ? p9[k] : t[k];
        const v = isPct ? raw.toFixed(1) + '%' : (mode === 'p90' || dp) ? (+raw).toFixed(dp || 2) : Math.round(raw).toLocaleString();
        const pc = pctl(role, k, t);
        const col = pc >= .67 ? 'var(--good)' : pc >= .34 ? 'var(--warn)' : 'var(--bad)';
        const bar = h('i', { style: { width: '0%', background: col } });
        body.append(h('div', { class: 'brow' }, h('span', null, l), h('span', { class: 'v' }, v), h('div', { class: 'b' }, bar)));
        requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = Math.round(pc * 100) + '%'; }));
      }
    }
  };
  draw();
  sec.append(h('h3', null, h('span', null, '시즌 성적', h('div', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, `출전 시간: ${t.min.toLocaleString()}`)), seg), h('div', { class: 'in' }, body));
  return sec;
}
function careerSec() {
  const s = S();
  const spells = [];
  for (const r of s.hist) { if (!r.club) continue; const last = spells[spells.length - 1]; if (last && last.club === r.club && last.status === (r.status === 'loan' ? 'loan' : 'x')) { last.apps += r.total.apps; last.goals += r.total.goals; last.cs += r.total.cs || 0; last.to = r.y + 1; } else spells.push({ club: r.club, name: r.clubName, c: r, status: r.status === 'loan' ? 'loan' : 'x', youth: r.status === 'youth' || r.status === 'youth+', apps: r.total.apps, goals: r.total.goals, cs: r.total.cs || 0, from: r.y, to: r.y + 1 }); }
  const gk = s.p.pos === 'GK', second = x => gk ? (x.cs || 0) : x.goals;
  const sec = h('div', { class: 'sec' }, h('h3', null, '경력'));
  const list = h('div', { class: 'in', style: { display: 'grid', gap: '2px' } });
  if (!spells.length) list.append(h('div', { class: 'empty' }, '아직 기록이 없습니다.'));
  spells.slice().reverse().forEach(sp => list.append(h('div', { style: { display: 'grid', gridTemplateColumns: '28px 1fr 44px 44px', gap: '10px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' } }, crest({ id: sp.club, c1: sp.c.c1, c2: sp.c.c2, short: sp.c.short }, 24), h('div', null, h('div', { style: { fontWeight: 600, fontSize: '13px' } }, sp.name + (sp.status === 'loan' ? ' (임대)' : sp.youth ? ' (유스)' : '')), h('div', { class: 'mute', style: { fontSize: '11px' } }, `${sp.from}년 7월 - ${sp.to}년 6월`)), h('span', { class: 'num', style: { textAlign: 'right' } }, sp.apps), h('span', { class: 'num', style: { textAlign: 'right' } }, second(sp)))));
  // FC27+TFMKT 실존 선수: 게임 이전 실제 경력 (Transfermarkt, 2025/26은 구단만)
  const real = s.ds === 'tm' && C.TM && C.TM.on() && s.flags && s.flags.real != null ? String(s.flags.real) : null;
  if (real) { const pp = C.TM.prePath(s.w, real), R = C.TM.rec(real);
    if (pp === undefined) { U.tmWait(['TMH', C.TM.shardOf(C.TM.keyOf(real))]); list.append(h('div', { class: 'mute', style: { fontSize: '12px', marginTop: '10px' } }, '게임 이전 경력을 불러오는 중…')); }
    else if (pp && pp.length) {
      const sl = y => `${y + 2000}/${String(y + 2001).slice(2)}`, w = s.w;
      list.append(h('div', { class: 'lbl', style: { marginTop: '10px' } }, '게임 이전 경력 (실제 기록)'));
      pp.slice().reverse().forEach(x => { const y1 = x.y1 == null ? 25 : x.y1, A = R.car.filter(r => r.t === x.cid && r.y - 2000 >= x.y0 && r.y - 2000 <= y1), c = w.clubs[x.cid], par = !c && C.TM.teamParent(x.cid);
        list.append(h('div', { style: { display: 'grid', gridTemplateColumns: '28px 1fr 44px 44px', gap: '10px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' } }, crest(c || (par && w.clubs[par]) || null, 24),
          h('div', null, h('div', { style: { fontWeight: 600, fontSize: '13px' } }, C.TM.teamName(w, x.cid) + (x.loan ? ' (임대)' : '')), h('div', { class: 'mute', style: { fontSize: '11px' } }, x.y0 === y1 ? sl(x.y0) : `${sl(x.y0)} – ${sl(y1)}`)),
          h('span', { class: 'num', style: { textAlign: 'right' } }, A.reduce((t, r) => t + r.ap, 0)), h('span', { class: 'num', style: { textAlign: 'right' } }, A.reduce((t, r) => t + r.g, 0)))); });
      const cp = C.TM.caps(real); if (cp) list.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '6px 0' } }, `게임 이전 A매치 ${cp[0]}경기 ${cp[1]}골`));
      const tr = C.TM.preTrophies(w, real) || []; if (tr.length) list.append(h('div', { class: 'mute', style: { fontSize: '12px', padding: '2px 0 6px' } }, '게임 이전 우승: ' + tr.map(t => `${t.name} ${t.y}/${String(t.y + 1).slice(2)}`).join(' · ')));
    } }
  const nt = U.ntTotals('A'), ntY = U.ntTotals('Y');
  list.append(h('div', { class: 'lbl', style: { marginTop: '10px' } }, '국가대표 팀'), h('div', { style: { display: 'grid', gridTemplateColumns: '28px 1fr 44px 44px', gap: '10px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' } }, natCrest(s.p.nat, 22), h('div', { style: { fontWeight: 600, fontSize: '13px' } }, C.natName(s.p.nat) + ' A대표팀'), h('span', { class: 'num', style: { textAlign: 'right' } }, nt.apps), h('span', { class: 'num', style: { textAlign: 'right' } }, second(nt))),
    ntY.apps ? h('div', { style: { display: 'grid', gridTemplateColumns: '28px 1fr 44px 44px', gap: '10px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' } }, natCrest(s.p.nat, 22), h('div', { style: { fontWeight: 600, fontSize: '13px' } }, C.natName(s.p.nat) + ' 연령별 대표팀'), h('span', { class: 'num', style: { textAlign: 'right' } }, ntY.apps), h('span', { class: 'num', style: { textAlign: 'right' } }, second(ntY))) : null);
  sec.append(list);
  return sec;
}
function trophySec() {
  const s = S();
  const sec = h('div', { class: 'sec' }, h('h3', null, '트로피'));
  const by = {};
  for (const t of s.trophies) { const k = t.club + '|' + t.t; by[k] = by[k] || { club: t.club, t: t.t, k: t.k, ys: [] }; by[k].ys.push(t.y); }
  const list = h('div', { class: 'in', style: { display: 'grid', gap: '8px' } });
  const vals = Object.values(by);
  if (!vals.length) list.append(h('div', { class: 'empty' }, '아직 우승 기록이 없습니다.'));
  vals.forEach(v => list.append(h('div', { style: { display: 'grid', gridTemplateColumns: '30px 26px 1fr', gap: '8px', alignItems: 'center' } }, h('b', { class: 'num', style: { fontSize: '18px' } }, v.ys.length), trophy(v.k, 22), h('div', null, h('div', { style: { fontWeight: 600, fontSize: '13px' } }, v.t), h('div', { class: 'mute', style: { fontSize: '11px' } }, `${v.club} · ${v.ys.join(', ')}`)))));
  sec.append(list);
  return sec;
}
function aboutSec(r) {
  const s = S(), p = s.p, t = r.total;
  const c = s.w.clubs[s.car.club];
  const tx = `${C.jo(p.name, '은', '는')} ${p.age}세 ${C.POSKO[p.pos]}${c ? `로 ${c.name} 소속입니다` : '이며 현재 무소속입니다'}. ${s.p.born}년생 ${C.natName(p.nat)} 국적이며 ${p.foot === 'R' ? '오른발' : '왼발'}을 주로 씁니다. ${r.label} 시즌 ${r.lgName || '모든 대회'}에서 ${t.apps}경기 ${t.goals}골 ${t.assists}도움${t.rated ? `, 평균 평점 ${C.avgRating(t).toFixed(2)}` : ''}을 기록했습니다.`;
  return h('div', { class: 'sec' }, h('h3', { style: { justifyContent: 'center' } }, 'About'), h('div', { class: 'in', style: { fontSize: '13px' } }, tx));
}

// ---------- 능력치 ----------
U.pages.attrs = function () {
  const s = S(), p = s.p;
  const root = h('div', { class: 'wrap prof screen' });
  const o = C.ovrOf(p), e = C.effOvr(p);
  const isGK = p.pos === 'GK';
  const face = isGK ? C.GKGROUPS.map(([k, l, a]) => [k, l, Math.round(p.a[a])]) : C.GROUPS.map(([k, l]) => [k, l, C.faceStats(p.a)[k]]);
  root.append(h('div', { class: 'sec' }, h('h3', null, h('span', null, `${p.name} · ${C.POSKO[p.pos]}`), h('span', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, 'OVR'), ovrb(o))),
    h('div', { class: 'sub' }, `${C.STYLES[C.styleKey(p.pos)][p.style] ? C.STYLES[C.styleKey(p.pos)][p.style][0] + ' · ' : ''}약발 ${'★'.repeat(p.weak)} · 개인기 ${'★'.repeat(p.skill)} · 키 ${p.height}cm${(p.traits || []).length && C.shop ? ' · 특성: ' + p.traits.map(t => C.shop.TRAITS[t][0]).join(', ') : ''}`),
    h('div', { class: 'in' }, h('div', { class: 'face' }, ...face.map(([k, l, v]) => h('div', null, h('div', { class: 'lbl' }, k), h('div', { class: 'v', style: { color: U.barCol(v) } }, v), h('div', { class: 'mute', style: { fontSize: '11px' } }, l)))))));
  const mods = p.mods || [];
  root.append(h('div', { class: 'two' },
    h('div', { class: 'sec' }, h('h3', null, '상태'), h('div', { class: 'in', style: { display: 'grid', gap: '8px' } },
      row('현재 경기력 (컨디션 반영)', String(e)), row('감독 신뢰', s.car.status === 'free' ? '-' : String(Math.round(s.car.trust))), row('명성', String(Math.round(p.rep))),
      ...(mods.length ? mods.map(m => row(m.why, `${m.ovr > 0 ? '+' : ''}${m.ovr} · ${m.seasons}시즌 남음`)) : [row('일시적 효과', '없음')]))),
    h('div', { class: 'sec' }, h('h3', null, '포지션별 능력치'), h('div', { class: 'in' }, posMap(p)))));
  // 그룹별 세부
  const grid = h('div', { class: 'attrgrid' });
  const groups = (isGK ? [['GK', '골키핑']] : []).concat(C.GROUPS);
  for (const [g, l] of groups) {
    const keys = C.AK.filter(k => C.AGROUP[k] === g);
    const box = h('div', { class: 'grow' }, h('div', { class: 'g' }, h('div', { class: 'lbl' }, l), ...keys.map(k => { const v = Math.round(p.a[k]); const bar = h('i', { style: { width: '0%', background: U.barCol(v) } }); requestAnimationFrame(() => requestAnimationFrame(() => bar.style.width = v + '%')); return h('div', { class: 'arow' }, h('span', null, C.ALABEL[k]), h('span', { class: 'v' }, v), h('span'), h('div', { class: 'bar' }, bar)); })));
    grid.append(box);
  }
  root.append(h('div', { class: 'sec' }, h('h3', null, '세부 능력치'), h('div', { class: 'sub' }, 'FC 시리즈 기준 35개 항목'), h('div', { class: 'in' }, grid)));
  // OVR 추이
  root.append(h('div', { class: 'sec' }, h('h3', null, 'OVR 추이'), h('div', { class: 'in' }, ovrChart())));
  return root;
};
function row(k, v) { return h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '8px' } }, h('span', { class: 'mute' }, k), h('b', null, v)); }
function posMap(p) {
  const pm = h('div', { class: 'posmap' });
  const best = Math.max(...C.POS.map(x => C.ovrOf(p, x)));
  for (const x of C.POS) { const [px, py] = U.POSXY[x]; const v = C.ovrOf(p, x); const col = x === p.pos ? '#f2c14e' : v >= C.ovrOf(p) - 2 ? '#7ee2a8' : v >= C.ovrOf(p) - 8 ? '#e9eef5' : '#7b8494'; pm.append(h('div', { class: 'pm', style: { left: px + '%', top: py + '%', color: col } }, h('b', null, v), h('span', null, x))); }
  return pm;
}
function ovrChart() {
  const s = S();
  const pts = s.hist.map(r => [r.age, r.ovr1]); pts.unshift([16, s.hist.length ? s.hist[0].ovr0 : C.ovrOf(s.p)]);
  if (pts.length < 2) return h('div', { class: 'empty' }, '시즌이 끝나면 그려집니다.');
  const W = 640, H = 200, pad = { l: 34, r: 12, t: 12, b: 24 };
  const mn = Math.min(...pts.map(p => p[1])) - 4, mx = Math.max(...pts.map(p => p[1])) + 4;
  const ages = pts.map(p => p[0]), a0 = 16, a1 = Math.max(...ages, 24);
  const x = a => pad.l + (a - a0) / (a1 - a0) * (W - pad.l - pad.r), y = v => pad.t + (1 - (v - mn) / (mx - mn)) * (H - pad.t - pad.b);
  let g = '';
  for (let v = Math.ceil(mn / 10) * 10; v <= mx; v += 10) g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 3"/><text x="${pad.l - 6}" y="${y(v) + 4}" font-size="11" fill="var(--mute)" text-anchor="end">${v}</text>`;
  for (let a = a0; a <= a1; a += 2) g += `<text x="${x(a)}" y="${H - 6}" font-size="11" fill="var(--mute)" text-anchor="middle">${a}세</text>`;
  const line = pts.map(p => `${x(p[0])},${y(p[1])}`).join(' ');
  const pk = pts.reduce((a, b) => b[1] > a[1] ? b : a);
  return svg(`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${g}<polyline points="${line}" fill="none" stroke="#f2c14e" stroke-width="2.4" stroke-linejoin="round"/>${pts.map(p => `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3" fill="#f2c14e"/>`).join('')}<text x="${x(pk[0])}" y="${y(pk[1]) - 9}" font-size="11" fill="var(--fg)" text-anchor="middle" font-weight="700">최고 ${pk[1]}</text></svg>`);
}

// ---------- 시즌 기록 ----------
U.pages.records = function () {
  const s = S();
  const root = h('div', { class: 'wrap prof screen', style: { maxWidth: '1100px' } });
  const sec = h('div', { class: 'sec' }, h('h3', null, '시즌별 기록'), h('div', { class: 'sub' }, '행을 누르면 대회별 기록이 펼쳐집니다'));
  const tb = h('tbody');
  const list = seasons().slice().reverse();
  const cols = U.pcols(s.p.pos), NC = 6 + cols.length;
  const cells = t => cols.map(([, f]) => h('td', { class: 'num' }, t ? f(t) : ''));
  if (!list.length) tb.append(h('tr', null, h('td', { colspan: NC, class: 'empty' }, '아직 기록이 없습니다.')));
  list.forEach(({ r, i }) => {
    if (r.youth && r.youth.apps) {
      const y = r.youth;
      tb.append(h('tr', null, h('td', { class: 'num' }, r.label), h('td', null, h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, crest({ id: r.club, c1: r.c1, c2: r.c2, short: r.short }, 18), r.clubName, h('span', { class: 'chip blue' }, r.youthLabel || 'U18'))), h('td', null, r.age + '세'), h('td'), h('td', { class: 'num' }, y.apps), ...cells(y), h('td', null, y.rated ? rt2(C.avgRating(y)) : '-'), h('td')));
      if (!r.total.apps && r.status === 'youth') return;
    }
    const t = r.total;
    // 대표팀: A대표팀과 연령별 대표팀을 따로 (예전 기록은 시즌의 대표팀 단계로 구분)
    const ntRows = r.ntA || r.ntY ? [r.ntA && r.ntA.apps ? ['nt', { name: 'A대표팀 (A매치)', st: r.ntA }] : null, r.ntY && r.ntY.apps ? ['ntY', { name: `${r.ntLvl && r.ntLvl !== 'A' ? r.ntLvl : '연령별'} 대표팀`, st: r.ntY }] : null].filter(Boolean)
      : r.nt && r.nt.apps ? [['nt', { name: r.ntLvl && r.ntLvl !== 'A' ? `${r.ntLvl} 대표팀 (연령별)` : 'A대표팀 (A매치)', st: r.nt }]] : [];
    const sub = h('tr', { hidden: true }, h('td', { colspan: NC, style: { background: 'var(--panel2)' } }, h('table', { class: 'ltable' }, h('tbody', null, ...Object.entries(r.agg || {}).concat(ntRows).map(([k, v]) => h('tr', null, h('td', null, ''), h('td', null, v.name || COMPNAME[k]), h('td', null, v.st.apps + '경기'), ...cols.map(([l, f]) => h('td', null, `${l} ${f(v.st)}`)), h('td', null, v.st.rated ? rt2(C.avgRating(v.st)) : '-')))))));
    tb.append(h('tr', { style: { cursor: 'pointer' }, onclick: () => { sub.hidden = !sub.hidden; } },
      h('td', { class: 'num' }, r.label), h('td', null, h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, r.club ? crest({ id: r.club, c1: r.c1, c2: r.c2, short: r.short }, 18) : crest(null, 18), r.clubName, r.status === 'loan' ? h('span', { class: 'chip blue' }, '임대') : null)),
      h('td', null, r.age + '세'), h('td', null, ovrb(r.ovr1 || C.ovrOf(s.p))), h('td', { class: 'num' }, t.apps), ...cells(t), h('td', null, t.rated ? rt2(C.avgRating(t)) : '-'),
      h('td', null, ...(r.trophies || []).map(x => h('span', { title: x.t }, trophy(x.k, 16))), ...(r.awards || []).slice(0, 4).map(x => h('span', { title: x.t }, trophy(x.k, 16, '#e9eef5'))))), sub);
  });
  const ct = U.careerTotals();
  sec.append(h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: (560 + cols.length * 70) + 'px' } }, h('thead', null, h('tr', null, ...['시즌', '클럽', '나이', 'OVR', '경기'].concat(cols.map(c => c[0]), ['평점', '']).map(x => h('th', { style: { textAlign: 'left' } }, x)))), tb, h('tfoot', null, h('tr', null, h('td', null, h('b', null, '프로 통산')), h('td'), h('td'), h('td'), h('td', { class: 'num' }, h('b', null, ct.apps)), ...cols.map(([, f]) => h('td', { class: 'num' }, h('b', null, f(ct)))), h('td', null, ct.rated ? rt2(C.avgRating(ct)) : '-'), h('td'))))));
  root.append(sec);
  root.append(clubTotalsSec());
  root.append(allTotalsSec());
  // 마일스톤
  const mil = (s.miles || []).slice().reverse();
  root.append(h('div', { class: 'sec' }, h('h3', null, '커리어 마일스톤'), h('div', { class: 'in', style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } }, ...(mil.length ? mil.map(m => h('div', { class: 'chip ' + (m.n >= 100 ? 'gold' : m.n === 1 ? 'blue' : ''), style: { padding: '6px 10px' }, title: `${m.opp}전` }, h('b', null, m.t), h('span', { class: 'dim' }, ` · ${m.y} (${m.age}세)`))) : [h('div', { class: 'empty' }, '아직 없습니다.')]))));
  // 시즌 목표 이력
  const gl = s.hist.filter(r => r.goal);
  if (gl.length) root.append(h('div', { class: 'sec' }, h('h3', null, '시즌 목표 이력', h('span', { class: 'num' }, `${gl.filter(r => r.goal.ok).length}/${gl.length}`)), h('div', { class: 'in', style: { display: 'grid', gap: '4px' } }, ...gl.slice().reverse().map(r => h('div', { style: { display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: '10px', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: '13px' } }, h('span', { class: 'mute' }, r.label), h('span', null, r.goal.label), h('span', { class: 'chip ' + (r.goal.ok ? 'good' : 'bad') }, r.goal.ok ? '달성' : '실패'))))));
  // 뉴스 전체
  const nw = s.news || [];
  if (nw.length) root.append(h('div', { class: 'sec' }, h('h3', null, '뉴스 기록'), h('div', { class: 'in', style: { display: 'grid', gap: '2px', maxHeight: '420px', overflowY: 'auto' } }, ...nw.map(n => h('div', { style: { display: 'grid', gridTemplateColumns: '84px 1fr', gap: '10px', padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: '13px' } }, h('span', { class: 'mute' }, n.d ? C.fmtDateY(n.d) : n.y), h('span', null, n.t))))));
  // 선택 기록
  const ev = (s.evLog || []).slice().reverse();
  const es = h('div', { class: 'sec' }, h('h3', null, '커리어 분기점'), h('div', { class: 'sub' }, '지금까지 내린 선택과 결과'));
  const el = h('div', { class: 'in', style: { display: 'grid', gap: '6px' } });
  if (!ev.length) el.append(h('div', { class: 'empty' }, '아직 없습니다.'));
  ev.forEach(e => el.append(h('div', { style: { display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: '10px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '13px' } }, h('span', { class: 'mute' }, `${e.y} · ${e.age}세`), h('span', null, h('b', null, e.title), ' — ', e.choice), h('span', { class: 'chip ' + (e.good > 0 ? 'good' : e.good < 0 ? 'bad' : '') }, e.chip))));
  es.append(el);
  root.append(es);
  return root;
};

// 클럽별 기록: 1군과 유스를 따로
function clubGroups() {
  const s = S(), map = new Map();
  const add = (key, info, t, rt, label) => {
    if (!t || !t.apps) return;
    const g = map.get(key) || Object.assign({ st: C.blankStats(), seasons: new Set(), trophies: 0, label }, info);
    C.addStats(g.st, t); g.seasons.add(label); map.set(key, g);
  };
  const recs = s.hist.slice(); const lv = liveRec(); if (lv) recs.push(lv);
  for (const r of recs) {
    if (!r.club) continue;
    const info = { club: r.club, name: r.clubName, c1: r.c1, c2: r.c2, short: r.short };
    add(r.club + (r.status === 'loan' ? '|loan' : ''), Object.assign({}, info, { kind: r.status === 'loan' ? '임대' : '1군' }), r.total, r.rating, r.label);
    if (r.youth) add(r.club + '|youth', Object.assign({}, info, { kind: '유스' }), r.youth, r.youthRating, r.label);
    const g = map.get(r.club + (r.status === 'loan' ? '|loan' : ''));
    if (g) g.trophies += (r.trophies || []).length;
  }
  return [...map.entries()].map(([k, v]) => Object.assign(v, { key: k }));
}
function clubTotalsSec() {
  const list = clubGroups(), cols = U.pcols(S().p.pos);
  const sec = h('div', { class: 'sec' }, h('h3', null, '클럽별 기록'), h('div', { class: 'sub' }, '1군·임대·유스를 구분해 합산합니다. 행을 누르면 아래 통산 기록이 그 클럽 기준으로 바뀝니다'));
  if (!list.length) { sec.append(h('div', { class: 'empty' }, '아직 기록이 없습니다.')); return sec; }
  const tb = h('tbody', null, ...list.map(g => h('tr', { style: { cursor: 'pointer' }, onclick: () => { st.totScope = g.key; U.render(); setTimeout(() => { const el = document.getElementById('allTotals'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); } },
    h('td', null, h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, crest({ id: g.club, c1: g.c1, c2: g.c2, short: g.short }, 20), h('b', { style: { fontWeight: 600 } }, g.name), h('span', { class: 'chip ' + (g.kind === '유스' ? 'blue' : g.kind === '임대' ? 'blue' : '') , style: { fontSize: '10px', padding: '1px 6px' } }, g.kind))),
    h('td', null, g.seasons.size), h('td', null, g.st.apps), ...cols.map(([, f]) => h('td', null, f(g.st))), h('td', null, g.st.min.toLocaleString()), h('td', null, g.st.rated ? rt2(C.avgRating(g.st)) : '-'), h('td', null, g.trophies || ''))));
  sec.append(h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: (520 + cols.length * 70) + 'px' } }, h('thead', null, h('tr', null, ...['클럽', '시즌', '경기'].concat(cols.map(c => c[0]), ['출전 시간', '평점', '우승']).map(x => h('th', null, x)))), tb)));
  return sec;
}
const TOTROWS = [
  ['출전', [['apps', '경기'], ['starts', '선발'], ['min', '출전 시간'], ['wins', '승'], ['draws', '무'], ['losses', '패'], ['motm', '경기 최우수 선수'], ['rating', '평균 평점']]],
  ['슈팅', [['goals', '득점'], ['penGoals', 'PK 득점'], ['penTaken', 'PK 시도'], ['xg', '예상 골 (xG)', 2], ['xgot', 'xG 유효 슈팅 (xGOT)', 2], ['npxg', 'PK 제외한 xG', 2], ['shots', '슛'], ['sot', '유효 슈팅'], ['headShots', '헤딩 슈팅'], ['conv', '득점 전환율', 1, '%']]],
  ['패스', [['assists', '어시스트'], ['xa', '예상 어시스트 (xA)', 2], ['passOk', '성공한 패스'], ['passAtt', '패스 시도'], ['passPct', '성공한 패스 %', 1, '%'], ['longOk', '정확한 긴 패스'], ['longPct', '정확한 긴 패스 %', 1, '%'], ['thru', '라인을 뚫는 패스'], ['chances', '기회 창출'], ['bigCh', '큰 기회 만듦']]],
  ['점유율', [['dribOk', '드리블 성공'], ['dribAtt', '드리블 시도'], ['dribPct', '드리블 성공 %', 1, '%'], ['duelW', '볼 경합 성공'], ['duelPct', '볼 경합 성공 %', 1, '%'], ['aerW', '공중 볼 경합 성공'], ['aerPct', '공중 볼 경합 성공 %', 1, '%'], ['touches', '터치'], ['boxTouch', '상대편 박스 내 터치'], ['disp', '볼 뺏김'], ['foulsWon', '획득한 파울']]],
  ['수비', [['defAct', '수비적 행동'], ['tackles', '태클'], ['ints', '가로채기'], ['blocks', '막힌 슛'], ['clear', '걷어내기'], ['recov', '볼 회수'], ['ftRec', '공격 지역 볼 탈취'], ['dribPast', '드리블 허용'], ['cs', '클린 시트'], ['concOn', '출전 시 실점'], ['xgaOn', '출전 중 xG 실점', 2]]],
  ['골키핑', [['saves', '선방'], ['savePct', '선방률', 1, '%'], ['sotFaced', '유효 슈팅 허용'], ['gPrev', '실점 방지', 2], ['claims', '공중볼 처리']], 'GK'],
  ['반칙·카드', [['fouls', '반칙'], ['yellow', '경고'], ['red', '퇴장']]]
];
function totVal(t, k) {
  if (k === 'rating') return C.avgRating(t);
  if (k === 'conv') return t.shots ? t.goals / t.shots * 100 : 0;
  if (PCT[k]) { const [a, b] = PCT[k]; return t[b] ? t[a] / t[b] * 100 : 0; }
  return t[k];
}
function allTotalsSec() {
  const s = S(), groups = clubGroups();
  const scopes = [['pro', '프로 통산 (1군·임대)'], ['youth', '유스 통산 (U18·U21)'], ['nt', 'A대표팀 통산'], ['ntY', '연령별 대표팀 통산'], ['all', '클럽 전체 (1군·임대·유스)']].concat(groups.map(g => [g.key, `${g.name} · ${g.kind}`]));
  let scope = st.totScope && scopes.some(x => x[0] === st.totScope) ? st.totScope : 'pro';
  let mode = 'tot';
  const sec = h('div', { class: 'sec', id: 'allTotals' });
  const body = h('div', { class: 'in' });
  const seg = h('div', { class: 'seg', style: { width: '180px' } });
  const pick = () => {
    if (scope === 'pro') return U.careerTotals();
    if (scope === 'youth') return U.youthTotals();
    if (scope === 'nt') return U.ntTotals('A');
    if (scope === 'ntY') return U.ntTotals('Y');
    if (scope === 'all') { const t = C.blankStats(); C.addStats(t, U.careerTotals()); C.addStats(t, U.youthTotals()); return t; }
    const g = groups.find(x => x.key === scope); return g ? g.st : C.blankStats();
  };
  const draw = () => {
    body.innerHTML = ''; seg.innerHTML = '';
    [['tot', '합계'], ['p90', '90분당']].forEach(([k, l]) => seg.append(h('button', { class: mode === k ? 'on' : '', onclick: () => { mode = k; draw(); } }, l)));
    const t = pick();
    if (!t.apps) { body.append(h('div', { class: 'empty' }, '이 범위의 기록이 없습니다.')); return; }
    const f = t.min / 90 || 1;
    const grid = h('div', { class: 'attrgrid' });
    for (const [title, rows, only] of TOTROWS) {
      if (only === 'GK' && s.p.pos !== 'GK' && !t.saves) continue;
      if (title === '슈팅' && s.p.pos === 'GK' && !t.shots) continue;
      const box = h('div', { class: 'g', style: { background: 'var(--panel2)', borderRadius: '12px', padding: '12px', display: 'grid', gap: '2px', alignContent: 'start' } }, h('div', { class: 'lbl', style: { marginBottom: '4px' } }, title));
      for (const [k, l, dp, unit] of rows) {
        let v = totVal(t, k);
        const rate = unit === '%' || k === 'rating' || ['apps', 'starts', 'min', 'wins', 'draws', 'losses'].includes(k);
        if (mode === 'p90' && !rate) v = v / f;
        const txt = k === 'rating' ? (v ? v.toFixed(2) : '-') : unit === '%' ? v.toFixed(1) + '%' : (mode === 'p90' && !rate) ? v.toFixed(2) : dp ? (+v).toFixed(dp) : Math.round(v).toLocaleString();
        box.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '5px 0', borderTop: '1px solid var(--line)', fontSize: '13px' } }, h('span', { class: 'mute' }, l), h('b', { class: 'num', style: { fontSize: '16px' } }, txt)));
      }
      grid.append(box);
    }
    body.append(grid);
  };
  const sel = h('select', { class: 'sel', id: 'totScope', onchange: e => { scope = st.totScope = e.target.value; draw(); } }, ...scopes.map(([k, l]) => h('option', { value: k, selected: k === scope ? true : null }, l)));
  sec.append(h('h3', null, '통산 기록', seg), h('div', { class: 'in', style: { paddingBottom: 0 } }, sel), body);
  draw();
  return sec;
}

// ---------- 이적·가치 ----------
U.pages.value = function () {
  const s = S();
  const root = h('div', { class: 'wrap prof screen' });
  root.append(h('div', { class: 'sec' }, h('h3', null, '시장 가치 추이', h('span', { class: 'num', style: { fontSize: '22px' } }, C.fmtEUR(s.value || 0))), h('div', { class: 'in' }, valueChart(s.vh, 640, 260))));
  const tl = h('div', { class: 'in', style: { display: 'grid', gap: '4px' } });
  (s.clubsJoined || []).slice().reverse().forEach(j => { const c = s.w.clubs[j.club]; tl.append(h('div', { style: { display: 'grid', gridTemplateColumns: '60px 30px 1fr auto', gap: '10px', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' } }, h('span', { class: 'mute' }, j.winter ? `${j.y + 1}.1` : `${j.y}.7`), crest(c, 22), h('div', null, h('b', null, c ? c.name : ''), h('span', { class: 'mute', style: { fontSize: '12px' } }, ' · ' + ({ youth: '유스 입단', pro: '프로 계약', loan: '임대', transfer: '이적' }[j.type] || j.type))), h('span', { class: 'num' }, j.fee ? C.fmtEUR(j.fee) : j.type === 'transfer' ? '자유 이적' : '-'))); });
  root.append(h('div', { class: 'sec' }, h('h3', null, '이적 기록'), tl));
  const fees = (s.feeLog || []).reduce((a, f) => a + f.fee, 0);
  root.append(h('div', { class: 'sec' }, h('h3', null, '수입'), h('div', { class: 'in', style: { display: 'grid', gap: '8px' } }, row('현재 급여', s.car.wage ? C.fmtWage(s.car.wage) : '-'), row('누적 재산', C.fmtEUR(Math.max(0, s.p.money))), row('나에게 쓰인 이적료 합계', C.fmtEUR(fees)))));
  return root;
};

// ---------- 리그 순위 ----------
U.pages.table = function () {
  const s = S();
  const root = h('div', { class: 'wrap prof screen' });
  let rows = null, lg = null, label = '', myId = null;
  if (s.ss && C.leagueOf(s)) { lg = C.leagueOf(s); rows = C.sortTable(s.ss.tables[lg.id]).map(r => [r.id, r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts]); label = s.ss.label + ' (진행 중)'; myId = s.ss.club; }
  else { const last = [...s.hist].reverse().find(r => r.table); if (last) { rows = last.table; lg = s.w.lg[last.lgId] || { name: last.lgName, nation: '' }; label = last.label; myId = last.club; } }
  if (!rows) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '리그 기록이 아직 없습니다.'))); return root; }
  const nUCL = { ENG: 4, ESP: 4, ITA: 4, GER: 4, FRA: 3, POR: 2, NED: 2 }[lg.nation] || 1;
  const tiers = Object.values(s.w.lg).filter(l => l.nation === lg.nation).length;
  const tb = h('tbody', null, ...rows.map((r, i) => { const c = s.w.clubs[r[0]]; const z = lg.tier === 1 && i < nUCL ? '#2f8cf0' : lg.tier === 1 && i < nUCL + 2 ? '#f08c2e' : tiers > 1 && lg.tier < tiers && i >= rows.length - 3 ? '#e5484d' : lg.tier > 1 && i < 3 ? '#2fbf71' : 'transparent'; return h('tr', { class: r[0] === myId ? 'me' : '' }, h('td', null, h('span', { class: 'zone', style: { background: z } }), i + 1), h('td', null, h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, crest(c, 18), c.name)), h('td', null, r[1]), h('td', null, r[2]), h('td', null, r[3]), h('td', null, r[4]), h('td', null, `${r[5]}:${r[6]}`), h('td', null, (r[5] - r[6] > 0 ? '+' : '') + (r[5] - r[6])), h('td', null, h('b', null, r[7]))); }));
  root.append(h('div', { class: 'sec' }, h('h3', null, `${lg.name} ${label}`), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable', style: { minWidth: '520px' } }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득실', '차', '승점'].map(x => h('th', null, x)))), tb))));
  // 대륙 대회 우승팀 역사
  const hist = s.w.hist.cont || {};
  const keys = Object.keys(hist).filter(k => hist[k].length);
  if (keys.length) root.append(h('div', { class: 'sec' }, h('h3', null, '대륙 대회 우승팀'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable' }, h('tbody', null, ...keys.flatMap(k => hist[k].slice(-6).reverse().map(x => h('tr', null, h('td', null, x.y), h('td', null, h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, crest(s.w.clubs[x.c], 18), s.w.clubs[x.c].name)), h('td', { class: 'mute' }, C.COMPS[k].name)))))))));
  const lh = (s.w.hist.lg[lg.id] || []).slice(-8).reverse();
  if (lh.length) root.append(h('div', { class: 'sec' }, h('h3', null, `${lg.name} 역대 우승`), h('div', { class: 'in' }, h('table', { class: 'ltable' }, h('tbody', null, ...lh.map(x => h('tr', null, h('td', null, x.y), h('td', null, h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, crest(s.w.clubs[x.c], 18), s.w.clubs[x.c].name)))))))));
  return root;
};

// ---------- 트로피 ----------
U.pages.trophies = function () {
  const s = S();
  const root = h('div', { class: 'wrap prof screen' });
  const by = {};
  for (const t of s.trophies) { by[t.t] = by[t.t] || { k: t.k, n: 0, ys: [] }; by[t.t].n++; by[t.t].ys.push(t.y); }
  const cab = h('div', { class: 'cab' });
  Object.entries(by).forEach(([t, v], i) => cab.append(h('div', { class: 'it', style: { animationDelay: i * 50 + 'ms' } }, trophy(v.k, 54), h('div', { class: 'c' }, '× ' + v.n), h('div', { style: { fontSize: '12px', fontWeight: 600 } }, t), h('div', { class: 'mute', style: { fontSize: '11px' } }, v.ys.join(', ')))));
  if (!s.trophies.length) cab.append(h('div', { class: 'empty' }, '아직 들어 올린 트로피가 없습니다.'));
  root.append(h('div', { class: 'sec' }, h('h3', null, '팀 트로피', h('span', { class: 'num' }, s.trophies.length)), h('div', { class: 'in' }, cab)));
  const ab = {};
  for (const a of s.awards) { ab[a.t] = ab[a.t] || { k: a.k, n: 0, ys: [] }; ab[a.t].n++; ab[a.t].ys.push(a.y); }
  const cab2 = h('div', { class: 'cab' });
  Object.entries(ab).forEach(([t, v], i) => cab2.append(h('div', { class: 'it', style: { animationDelay: i * 50 + 'ms' } }, trophy(v.k, 48, ['ballon', 'golden'].includes(v.k) ? '#f2c14e' : '#e9eef5'), h('div', { class: 'c' }, '× ' + v.n), h('div', { style: { fontSize: '12px', fontWeight: 600 } }, t), h('div', { class: 'mute', style: { fontSize: '11px' } }, v.ys.join(', ')))));
  if (!s.awards.length) cab2.append(h('div', { class: 'empty' }, '아직 개인상이 없습니다.'));
  root.append(h('div', { class: 'sec' }, h('h3', null, '개인상', h('span', { class: 'num' }, s.awards.length)), h('div', { class: 'in' }, cab2)));
  // 발롱도르
  const bd = s.hist.filter(r => r.ballonTop && r.ballonTop.length);
  if (bd.length) {
    const last = bd[bd.length - 1];
    root.append(h('div', { class: 'sec' }, h('h3', null, `발롱도르 ${last.label}`), h('div', { class: 'sub' }, last.ballon ? `내 순위: ${last.ballon}위` : '30위 밖'), h('div', { class: 'in' }, h('table', { class: 'ltable' }, h('tbody', null, ...last.ballonTop.map((x, i) => h('tr', { class: x[2] ? 'me' : '' }, h('td', null, i + 1), h('td', null, x[0]), h('td', { class: 'mute' }, x[1]))))))),
      h('div', { class: 'sec' }, h('h3', null, '발롱도르 순위 기록'), h('div', { class: 'in', style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, ...s.hist.map(r => h('span', { class: 'chip ' + (r.ballon === 1 ? 'gold' : r.ballon ? '' : 'dim') }, `${r.label} ${r.ballon ? r.ballon + '위' : '-'}`)))));
  }
  return root;
};
})(window);
