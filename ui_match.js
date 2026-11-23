// Road to Legend — 경기 상세 팝업: 득점·도움·카드 타임라인, 경기 통계, 양 팀 출전 명단과 평점
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, MD = C.MD;
const { h, crest } = U;
const S = () => U.S();

const KIND = { g: '골', p: '페널티킥 골', o: '자책골', y: '경고', r: '퇴장', 2: '경고 누적 퇴장' };
const ICON = { g: '⚽', p: '⚽', o: '⚽', y: '▮', r: '▮', 2: '▮' };
const nameOf = id => MD.nameOf(id, S());
// 도움 아이콘: 축구화
const NS = 'http://www.w3.org/2000/svg';
U.bootIcon = (size = 14) => { const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('width', size); sv.setAttribute('height', size); sv.setAttribute('class', 'boot'); sv.setAttribute('aria-label', '도움');
  sv.innerHTML = '<path fill="currentColor" d="M2.5 5.2c0-.7.6-1.2 1.2-1.2h4.1c.4 0 .8.2 1 .6l1.3 2.6c.3.6.9.9 1.6.9h1.6l6 2.4c1.9.8 3.2 2.6 3.2 4.7v1.4c0 .5-.4.9-.9.9H3.4c-.5 0-.9-.4-.9-.9z"/><path fill="none" style="stroke:var(--bg,#111)" stroke-width="1.1" stroke-linecap="round" d="M10.6 9.6l1.5-1.1m.3 2.3l1.6-1.1m.4 2.3l1.6-1.1"/><path fill="currentColor" d="M4.2 18h2.2v2.2H4.2zm5 0h2.2v2.2H9.2zm5 0h2.2v2.2h-2.2zm4.6 0H21v2.2h-2.2z"/>';
  return sv; };
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
// ===================== 경기 상세 팝업 (FotMob 스타일 탭) =====================
// 승부차기 재현: 이긴 쪽(win)이 이기도록, 시드 난수로 키커 순서·성공 여부를 정한다
const SOORD = { ST: 0, W: 1, AM: 2, CM: 3, FB: 4, DM: 5, CB: 6, GK: 9 };
function shootout(M, win, key) {
  if (!M || !M.PL) return null;
  const tk = s => M.PL[s].filter(p => p.off >= 90 && !(p.st && p.st.r)).sort((a, b) => (SOORD[a.role] - SOORD[b.role]) || ((b.A && b.A.fin || 60) - (a.A && a.A.fin || 60)));
  const T = [tk(0), tk(1)]; if (T[0].length < 5 || T[1].length < 5) return null;
  const r = C.seeded('so|' + key + '|' + (M.key || ''));
  for (let tr = 0; tr < 80; tr++) {
    const sc = [0, 0], k = []; let n = [0, 0], over = false;
    for (let i = 0; i < 30 && !over; i++) for (const s of [0, 1]) {
      const p = T[s][n[s]++ % T[s].length], ok = r() < .74 + ((p.A && p.A.fin || 65) - 65) * .003;
      if (ok) sc[s]++; k.push({ s, id: p.id, ok });
      const rd = Math.ceil(k.length / 2), left = [5 - n[0], 5 - n[1]].map(x => Math.max(0, x));
      if (rd <= 5) { if (sc[0] + left[0] < sc[1] || sc[1] + left[1] < sc[0]) { over = true; break; } }
      else if (k.length % 2 === 0 && sc[0] !== sc[1]) { over = true; break; }
    }
    const w0 = sc[0] > sc[1] ? 0 : 1;
    if (over && w0 === win) return { sc, k };
  }
  return null;
}
// o: { title, a, b, ga, gb, pw, d: {ev, ln}, nat, key, sa, sb, ctx }
// ctx (있으면 순위·현황 탭): { st, lg, L, i, date } (리그) 또는 { st, grp: 'CUP'|'CONT'|'INTL', key, stage, date } (컵·대회)
const FCPOS = { DM: 'CDM', AM: 'CAM', LWB: 'LB', RWB: 'RB' };
let PMAP = null, PMAPk = '';
function posMap(w) {
  const k = (w.cal ? w.cal.d : 0) + '|' + w.year;
  if (PMAP && PMAPk === k) return PMAP;
  PMAP = new Map(); for (const id in w.clubs) { const c = w.clubs[id]; if (c.sq) for (const e of c.sq) PMAP.set(String(e[0]), e[1]); }
  for (const e of w.fa || []) PMAP.set(String(e[0]), e[1]);
  PMAPk = k; return PMAP;
}
function posLookup(s) {
  const w = s.w, pm = posMap(w), F = G.FC27;
  return id => {
    id = String(id);
    if (id === 'ME') return s.p && s.p.pos;
    const v = pm.get(id) || (w.ps && w.ps[id] && w.ps[id].pos); if (v) return v;
    if (/^\d+$/.test(id) && F && F.P[+id]) { const p = F.P[+id][2]; return FCPOS[p] || p; }
    return null;
  };
}
U.posLookup = (s) => posLookup(s);
const LAT = pos => !pos ? 1 : pos[0] === 'L' ? 0 : pos[0] === 'R' ? 2 : 1;
const ROLE = pos => (C.ROLE && C.ROLE[pos]) || 'CM';
// 포메이션: 선발 11명 → 줄(수비·미드·공격형 미드·최전방)과 표기 (예: 4-2-3-1)
function formation(list) {
  const xi = list.filter(p => p.start);
  const gk = xi.filter(p => p.role === 'GK'), out = xi.filter(p => p.role !== 'GK');
  const hasAM = out.some(p => p.role === 'AM');
  const rows = [[], [], [], []];
  for (const p of out) {
    const r = p.role;
    if (r === 'CB' || r === 'FB') rows[0].push(p);
    else if (r === 'DM' || r === 'CM') rows[1].push(p);
    else if (r === 'AM' || (hasAM && r === 'W')) rows[2].push(p);
    else rows[3].push(p);
  }
  const R = rows.filter(x => x.length).map(x => x.sort((a, b) => LAT(a.pos) - LAT(b.pos) || a.ix - b.ix));
  return { gk: gk[0] || null, rows: R, label: R.map(x => x.length).join('-') };
}
function teamColor(w, id, nat, side) {
  if (nat) return side ? '#5fa8ff' : '#f2c14e';
  const c = w.clubs[id]; let col = c && c.c1;
  if (!col || U.lum(col) < .16 || U.lum(col) > .92) col = c && c.c2 && U.lum(c.c2) >= .16 && U.lum(c.c2) <= .92 ? c.c2 : (side ? '#5fa8ff' : '#f2c14e');
  return col;
}
function colDist(a, b) { const v = x => [0, 2, 4].map(i => parseInt(x.replace('#', '').padEnd(6, '0').slice(i, i + 2), 16)); try { const A = v(a), B = v(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); } catch (e) { return 999; } }
const f1 = x => (Math.round(x * 10) / 10).toFixed(1), f2 = x => (Math.round(x * 100) / 100).toFixed(2);
const pctS = (a, n) => n ? `${a}/${n} (${Math.round(a / n * 100)}%)` : '0/0 (0%)';
const shortName = n => { const t = String(n).split(' '); return t.length > 1 && t[t.length - 1].length > 2 ? t[t.length - 1] : n; };

// 히트맵 점 (경기·선수마다 고정). 좌표는 공격 방향 → 기준 [0~1, 0~1]
U.heatPts = function (p, M) {
      const r = C.seeded('hm|' + (M.key || '') + '|' + p.id), g = () => { const u = r() || 1e-9, q = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * q); };
      const lat = LAT(p.pos), ly = lat === 0 ? .2 : lat === 2 ? .8 : .5;
      const BASE = { GK: [.07, .5, .04, .1], CB: [.27, ly === .5 ? .5 : ly, .1, .12], FB: [.47, lat === 0 ? .1 : .9, .19, .08], DM: [.4, .5, .13, .17], CM: [.52, lat === 1 ? .5 : ly, .16, .17], AM: [.66, .5, .13, .19], W: [.7, lat === 0 ? .12 : .88, .15, .1], ST: [.78, .5, .1, .14] };
      const b = BASE[p.role] || BASE.CM, pos = M.H ? (C.MS.team(M, p.s, 2).pos - 50) / 100 : 0;
      const pts = []; const n = Math.max(3, p.st.touch || 10);
      for (let i = 0; i < n; i++) { const fx = clamp(b[0] + pos * .2 + g() * b[2] * (1 + (r() < .15 ? 1 : 0)), .01, .99), fy = clamp(b[1] + g() * b[3] * (1 + (r() < .15 ? .8 : 0)), .02, .98); pts.push([fx, fy]); }
  return pts;
};
U.heatBox = function (pts, dir) {
      const cw = 105 * 3, ch = 68 * 3, cv = h('canvas', { class: 'hmap', width: cw, height: ch });
      const NSs = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NSs, 'svg'); sv.setAttribute('viewBox', '0 0 105 68'); sv.setAttribute('class', 'hlines');
      const L = 'stroke="rgba(255,255,255,.45)" stroke-width=".4" fill="none"';
      sv.innerHTML = `<rect x=".3" y=".3" width="104.4" height="67.4" ${L}/><line x1="52.5" y1="0" x2="52.5" y2="68" ${L}/><circle cx="52.5" cy="34" r="9.15" ${L}/><rect x="0" y="13.84" width="16.5" height="40.32" ${L}/><rect x="88.5" y="13.84" width="16.5" height="40.32" ${L}/><rect x="0" y="24.84" width="5.5" height="18.32" ${L}/><rect x="99.5" y="24.84" width="5.5" height="18.32" ${L}/>`;
      requestAnimationFrame(() => {
        const cx = cv.getContext('2d'); if (!cx) return;
        const gw = 70, gh = 46, grid = new Float32Array(gw * gh), sig = 3.2;
        for (const [fx, fy] of pts) { const X = fx * gw, Y = fy * gh; for (let yy = Math.max(0, Math.floor(Y - 3 * sig)); yy < Math.min(gh, Y + 3 * sig); yy++) for (let xx = Math.max(0, Math.floor(X - 3 * sig)); xx < Math.min(gw, X + 3 * sig); xx++) { const dd = ((xx - X) ** 2 + (yy - Y) ** 2) / (2 * sig * sig); grid[yy * gw + xx] += Math.exp(-dd); } }
        let mx = 0; for (const q of grid) mx = Math.max(mx, q);
        const img = cx.createImageData(gw, gh);
        const ramp = t => t < .5 ? [40 + 200 * t * 2, 190, 60] : [240, 190 - 150 * (t - .5) * 2, 50];
        for (let i = 0; i < grid.length; i++) { const t = mx ? grid[i] / mx : 0; const [R_, G_, B_] = ramp(t); img.data[i * 4] = R_; img.data[i * 4 + 1] = G_; img.data[i * 4 + 2] = B_; img.data[i * 4 + 3] = t < .06 ? 0 : Math.min(235, 60 + t * 200); }
        const tmp = document.createElement('canvas'); tmp.width = gw; tmp.height = gh; tmp.getContext('2d').putImageData(img, 0, 0);
        cx.imageSmoothingEnabled = true; cx.filter = 'blur(6px)'; cx.drawImage(tmp, 0, 0, cw, ch); cx.filter = 'none';
      });
  return h('div', { class: 'hwrap' }, cv, sv, h('div', { class: 'hdir mute' }, dir || '공격 방향 →'));
};
U.showMatch = function (o) {
  const s = S(), w = s.w, d = o.d || { ev: [], ln: null };
  const v = o._v || (o._v = { tab: 'facts', hf: 2, pt: 'main', side: 2, sort: null, pl: null, shot: null });
  const strOf = (id, x) => x != null ? x : o.nat ? 72 : (w.clubs[id] && w.clubs[id].str) || 66;
  const sa = strOf(o.a, o.sa), sb = strOf(o.b, o.sb);
  const key = o.key || `${o.a}|${o.b}|${o.title}`;
  const hasLn = d.ln && d.ln.length === 2 && d.ln[0].length && d.ln[1].length;
  const posOf = posLookup(s);
  let ms = null;
  const mdate = o.ctx && (o.ctx.date != null ? o.ctx.date : o.ctx.d);
  const getMs = () => ms || (ms = C.MS.gen({ key, sa, sb, ga: o.ga, gb: o.gb, d, posOf: id => posOf(id), spec: !o.nat && C.pkSpec ? C.pkSpec(w, mdate, o.a, o.b) : null }));
  const mom = MD.momOf(d, o.ga, o.gb);
  let col = [teamColor(w, o.a, o.nat, 0), teamColor(w, o.b, o.nat, 1)];
  if (colDist(col[0], col[1]) < 90) col[1] = colDist(col[0], '#5fa8ff') > 90 ? '#5fa8ff' : '#e9ecf1';
  const tname = sd => { const id = sd ? o.b : o.a; return o.nat ? C.natName(id) : ((w.clubs[id] || {}).short || (w.clubs[id] || {}).name || ''); };
  U.overlay(close => {
    const head = h('div', { class: 'head mhead' },
      h('div', { class: 'lbl' }, o.title || ''),
      h('div', { class: 'mscore' }, h('div', { class: 'mt' }, teamHead(w, o.a, o.nat, 34, close)), h('div', { class: 'ms' }, `${o.ga} - ${o.gb}`, o.pw ? h('div', { class: 'mute', style: { fontSize: '12px' } }, `승부차기 ${o.nat ? C.natName(o.pw) : (w.clubs[o.pw] || {}).name || ''} 승`) : null, !o.nat && C.derbyOf && C.derbyOf(o.a, o.b) ? h('div', { class: 'mderby' }, C.derbyOf(o.a, o.b)) : null, !o.nat && C.attend && w.clubs[o.a] ? h('div', { class: 'mute', style: { fontSize: '11.5px' } }, `관중 ${C.attend(w, o.a, o.b, C.MD.attKey(o.a, o.b, o.ga, o.gb, ((o.d && o.d.ev) || []).filter(e => 'gpo'.includes(e.k)).map(e => e.m)), /결승/.test(o.title || '')).toLocaleString()}명`) : null), h('div', { class: 'mt r' }, teamHead(w, o.b, o.nat, 34, close))),
      h('button', { class: 'btn ghost sm mclose', onclick: () => close() }, '닫기'));
    const ctx = o.ctx || null;
    const stLbl = !ctx ? null : ctx.lg ? '순위' : ctx.grp === 'CONT' && /리그 페이즈/.test(ctx.stage || '') ? '순위' : ctx.grp === 'INTL' && /조별/.test(ctx.stage || '') ? '조 순위' : '대진·현황';
    const TABS = [['facts', '경기'], hasLn ? ['lineup', '라인업'] : null, hasLn ? ['stats', '통계'] : null, stLbl ? ['table', stLbl] : null, ['h2h', '상대 전적']].filter(Boolean);
    if (!TABS.some(t => t[0] === v.tab)) v.tab = 'facts';
    const tabs = h('div', { class: 'mtabs' });
    const body = h('div', { class: 'body mbody' });
    let lastView = null;
    const render = () => {
      // 같은 탭 안에서 정렬·필터만 바뀌면 스크롤 위치를 유지하고, 탭·선수 화면이 바뀔 때만 맨 위로
      const box0 = body.closest('.ovbox'), sc = box0 && box0.parentElement, y0 = sc ? sc.scrollTop : 0, view = v.tab + '|' + (v.pl || '');
      if (body.childElementCount) body.style.minHeight = body.offsetHeight + 'px';
      tabs.replaceChildren(...TABS.map(([k, l]) => h('button', { class: v.tab === k && !v.pl ? 'on' : '', onclick: () => { v.tab = k; v.pl = null; render(); } }, l)));
      body.replaceChildren();
      try {
        if (v.pl) playerSheet(body);
        else if (v.tab === 'facts') facts(body);
        else if (v.tab === 'lineup') lineupTab(body);
        else if (v.tab === 'stats') statsTab(body);
        else if (v.tab === 'table') tableTab(body);
        else if (v.tab === 'h2h') h2hTab(body);
      } catch (e) { console.error(e); body.append(h('div', { class: 'mute' }, '이 화면을 그리는 중 문제가 생겼습니다.')); }
      if (sc) sc.scrollTop = view === lastView ? y0 : 0;
      lastView = view; requestAnimationFrame(() => { body.style.minHeight = ''; });
    };
    const openPl = id => { v.pl = id; render(); };
    // 행 클릭 (이름은 선수 정보로, 나머지 칸은 경기 기록으로)
    const rowClick = id => e => { if (e.target.closest('.lnk,.meName')) return; openPl(id); };
    const evOf = id => d.ev.filter(e => e.p === id || e.a === id);
    const icons = id => h('span', { class: 'mic' }, ...evOf(id).map(e => { const ast = e.a === id && e.p !== id; return h('span', { class: 'mi k' + (ast ? 'a' : e.k), title: ast ? '도움' : KIND[e.k] }, ast ? U.bootIcon(14) : ICON[e.k]); }));

    // ---------- 경기 ----------
    function facts(B) {
      if (mom) B.append(h('div', { class: 'mommain' }, h('span', { class: 'momst' }, '★'), h('span', { class: 'lbl' }, 'MOM'), pname(mom, close)));
      const goalsBy = side => d.ev.filter(e => e.s === side && 'gpo'.includes(e.k));
      B.append(h('div', { class: 'mgoals' }, ...[0, 1].map(side => h('div', { class: side ? 'r' : '' }, ...goalsBy(side).map(e => h('div', null, pname(e.p, close), ' ' + U.fmtMin(e.m), e.k === 'p' ? ' (PK)' : e.k === 'o' ? ' (자책)' : ''))))));
      if (hasLn) {
        const M = getMs(), A = C.MS.team(M, 0, 2), Bt = C.MS.team(M, 1, 2);
        B.append(h('div', { class: 'msec' }, h('h4', null, '주요 통계'), possBar(A.pos), cmpRow('예상 골 (xG)', A.xg, Bt.xg, 2), cmpRow('전체 슛', A.sh, Bt.sh), cmpRow('유효 슈팅', A.sot, Bt.sot), cmpRow('큰 기회', A.bigC, Bt.bigC), cmpRow('정확한 패스', A.passA, Bt.passA, 0, `${A.passA} (${Math.round(A.passA / Math.max(1, A.pass) * 100)}%)`, `${Bt.passA} (${Math.round(Bt.passA / Math.max(1, Bt.pass) * 100)}%)`),
          h('button', { class: 'btn ghost sm', style: { justifySelf: 'center', marginTop: '6px' }, onclick: () => { v.tab = 'stats'; render(); } }, '전체 통계 보기')));
      }
      // 타임라인: 골·골 취소(VAR)·경고·퇴장 (교체는 라인업 탭)
      const tl = d.ev.map(e => ({ m: e.m, s: e.s, e }));
      if (hasLn) for (const x of getMs().vars || []) tl.push({ m: x.m, s: x.s, vr: x });
      tl.sort((a, b) => a.m - b.m);
      if (tl.length) {
        const ht = tl.findIndex(x => x.m > 45);
        const rows = tl.map(x => x.vr ? h('div', { class: 'mev var ' + (x.s ? 'r' : 'l') }, h('span', { class: 'mm' }, U.fmtMin(x.m)), h('span', { class: 'mi kv' }, '⚽'),
          h('span', null, pname(x.vr.p, close), h('span', { class: 'mute' }, ` · 골 취소 (VAR · ${x.vr.why})`)))
          : h('div', { class: 'mev ' + (x.s ? 'r' : 'l') }, h('span', { class: 'mm' }, U.fmtMin(x.m)), h('span', { class: 'mi k' + x.e.k }, ICON[x.e.k]),
            h('span', null, pname(x.e.p, close), h('span', { class: 'mute' }, ` · ${KIND[x.e.k]}`), x.e.a ? h('span', { class: 'mute evast' }, ' · ', U.bootIcon(14), ' ', pname(x.e.a, close)) : null)));
        if (ht > 0) rows.splice(ht, 0, h('div', { class: 'mht' }, '하프타임'));
        B.append(h('div', { class: 'msec' }, h('h4', null, '경기 이벤트'), h('div', { class: 'mtl' }, ...rows)));
      } else B.append(h('div', { class: 'mute', style: { fontSize: '13px' } }, '득점·카드 없음'));
      // 승부차기: 연장 끝까지 뛴 선수 중 공격수부터 차례로 (경기 기록으로 늘 같은 결과)
      if (o.pw && hasLn) { const so = shootout(getMs(), o.pw === o.a ? 0 : 1, o.key || ''); if (so) B.append(h('div', { class: 'msec' }, h('h4', null, `승부차기 ${so.sc[0]} - ${so.sc[1]}`),
        h('div', { class: 'mso' }, ...[0, 1].map(sd => h('div', { class: 'msor' + (sd ? ' r' : '') }, h('div', { class: 'lbl' }, tname(sd)), h('div', { class: 'msok' }, ...so.k.filter(x => x.s === sd).map(x => h('span', { class: 'msob ' + (x.ok ? 'ok' : 'no'), title: (x.ok ? '성공 · ' : '실축 · ') + nameOf(x.id) }, x.ok ? '●' : '✕'))),
          h('div', { class: 'msol mute' }, so.k.filter(x => x.s === sd).map(x => shortName(nameOf(x.id)) + (x.ok ? '' : ' (실축)')).join(' · '))))))); }
      if (hasLn) {
        const colL = (list, side) => h('div', { class: 'mlu' }, h('div', { class: 'lbl' }, tname(side)),
          ...['선발', '교체'].map((t, k) => { const rows = list.filter(x => k ? !x.start : x.start); return rows.length ? h('div', null, h('div', { class: 'mute', style: { fontSize: '11px', margin: '6px 0 2px' } }, t),
            ...rows.map(x => h('div', { class: 'mlr click' + (x.id === mom ? ' ismom' : ''), title: '눌러서 이 선수의 경기 기록', onclick: rowClick(x.id) }, h('span', { class: 'mln' }, pname(x.id, close), x.id === mom ? h('span', { class: 'momb', title: '경기 최우수 선수' }, '★') : null), h('span', { class: 'mute' }, x.start ? (x.off < 90 ? ` ↓${x.off}'` : '') : ` ↑${x.on}'`),
              icons(x.id), U.rt1 ? U.rt1(x.rt) : x.rt.toFixed(1)))) : null; }));
        B.append(h('div', { class: 'msec' }, h('h4', null, '출전 명단 · 평점 ', h('span', { class: 'mute', style: { fontWeight: 400 } }, '(선수 칸을 누르면 경기 세부 기록)')), h('div', { class: 'mlus' }, colL(d.ln[0], 0), colL(d.ln[1], 1))));
      } else B.append(h('div', { class: 'mute', style: { fontSize: '12px' } }, '하부 리그 구단끼리의 경기라 출전 명단은 기록하지 않습니다. (득점·카드는 기록)'));
    }
    // 비교 줄: 큰 쪽 강조 (팀 색)
    function cmpRow(label, a, b, dec, ta, tb, lowGood) {
      const fa = ta != null ? ta : dec ? (+a).toFixed(dec) : Math.round(a), fb = tb != null ? tb : dec ? (+b).toFixed(dec) : Math.round(b);
      const ra = Math.round(a * 100), rb = Math.round(b * 100), win = ra === rb ? -1 : (ra > rb) !== !!lowGood ? 0 : 1;
      return h('div', { class: 'mcmp' }, h('span', { class: 'pv' + (win === 0 ? ' on' : ''), style: win === 0 ? { background: col[0], color: U.lum(col[0]) > .6 ? '#111' : '#fff' } : null }, fa), h('span', { class: 'cl' }, label), h('span', { class: 'pv r' + (win === 1 ? ' on' : ''), style: win === 1 ? { background: col[1], color: U.lum(col[1]) > .6 ? '#111' : '#fff' } : null }, fb));
    }
    function possBar(p0) {
      return h('div', { class: 'mposs' }, h('div', { class: 'lbl', style: { textAlign: 'center' } }, '공 점유율'), h('div', { class: 'mpb' }, h('i', { style: { width: p0 + '%', background: col[0], color: U.lum(col[0]) > .6 ? '#111' : '#fff' } }, p0 + '%'), h('i', { style: { width: (100 - p0) + '%', background: col[1], color: U.lum(col[1]) > .6 ? '#111' : '#fff' } }, (100 - p0) + '%')));
    }
    // ---------- 라인업 ----------
    function lineupTab(B) {
      const M = getMs();
      const card = (p, x, y, sd) => {
        const ev = evOf(p.id), sub = d.ln[sd].find(q => !q.start && q.on === p.off && p.off < 90);
        return h('div', { class: 'lpp' + (p.id === mom ? ' mom' : ''), style: { left: x + '%', top: y + '%' }, onclick: e => { if (e.target.closest('.lnk')) return; openPl(p.id); } },
          h('div', { class: 'lpc', style: { background: col[sd], color: U.lum(col[sd]) > .6 ? '#111' : '#fff' } }, p.pos || ''),
          h('span', { class: 'lpr' }, U.rt1(p.rt)), p.id === mom ? h('span', { class: 'lpm' }, '★') : null,
          ev.length ? h('span', { class: 'lpe' }, ...ev.map(e => { const ast = e.a === p.id && e.p !== p.id; return h('span', { class: 'mi k' + (ast ? 'a' : e.k) }, ast ? U.bootIcon(11) : ICON[e.k]); })) : null,
          p.off < 90 && !p.st.r ? h('span', { class: 'lps' }, '↓' + U.fmtMin(p.off)) : null,
          h('div', { class: 'lpn' }, shortName(nameOf(p.id))));
      };
      const pitch = h('div', { class: 'lpitch' }, h('div', { class: 'lpl half' }), h('div', { class: 'lpl circ' }), h('div', { class: 'lpl box t' }), h('div', { class: 'lpl box b' }), h('div', { class: 'lpl six t' }), h('div', { class: 'lpl six b' }));
      const labels = [];
      for (const sd of [0, 1]) {
        const list = M.PL[sd].map((p, i) => Object.assign(p, { ix: i }));
        const place = (p, x, y) => pitch.append(card(p, sd ? x : 100 - x, sd ? 100 - y : y, sd));
        const fk = d.fm && d.fm[sd], FS = fk && C.FORMS && C.FORMS[fk], xi = list.filter(p => p.start);
        if (FS && xi.length && xi.every(p => p.sl != null && FS[p.sl])) {
          // 기록된 포메이션의 자리 좌표 그대로
          labels.push(fk);
          for (const p of xi) { const [, fx, fy] = FS[p.sl]; place(p, 6 + fx * .88, 5.5 + (fy - 4) / 81 * 38.5); }
        } else {
          const F = formation(list); labels.push(F.label);
          const nR = F.rows.length, y0 = 5.5, y1 = 44;
          const Y = k => y0 + (y1 - y0) * (k + 1) / (nR + .35);
          if (F.gk) place(F.gk, 50, y0);
          F.rows.forEach((row, k) => row.forEach((p, i) => place(p, 100 * (i + 1) / (row.length + 1), Y(k))));
        }
      }
      B.append(h('div', { class: 'lphd' }, h('span', null, crestOf(0), h('b', null, tname(0)), h('span', { class: 'mute' }, ' ' + labels[0])), h('span', null, h('span', { class: 'mute' }, labels[1] + ' '), h('b', null, tname(1)), crestOf(1))));
      B.append(pitch);
      // 교체 명단
      const bench = sd => h('div', { class: 'mlu' }, h('div', { class: 'lbl' }, tname(sd) + ' 교체 투입'), ...M.PL[sd].filter(p => !p.start).map(p => {
        const outP = M.PL[sd].find(q => q.off === p.on && q.id !== p.id);
        return h('div', { class: 'mlr click', onclick: rowClick(p.id) }, h('span', { class: 'mln' }, pname(p.id, close)), h('span', { class: 'mute' }, `↑${p.on}'` + (outP ? ` (${shortName(nameOf(outP.id))} ↓)` : '')), icons(p.id), U.rt1(p.rt));
      }), M.PL[sd].some(p => !p.start) ? null : h('div', { class: 'mute', style: { fontSize: '12px' } }, '교체 없음'));
      B.append(h('div', { class: 'mlus' }, bench(0), bench(1)));
      B.append(h('div', { class: 'mute', style: { fontSize: '11px' } }, '포메이션과 자리는 감독이 그 경기에 짠 배치입니다. 원래 포지션이 아닌 자리에 서면 그만큼 기량이 덜 나옵니다. 선수를 누르면 경기 세부 기록.'));
    }
    function crestOf(sd) { const id = sd ? o.b : o.a; return o.nat ? U.natCrest(id, 18) : crest(w.clubs[id] || null, 18); }
    // ---------- 통계 ----------
    function statsTab(B) {
      const M = getMs(), hf = v.hf;
      const T = [C.MS.team(M, 0, hf), C.MS.team(M, 1, hf)], [A, Bt] = T;
      B.append(h('div', { class: 'seg', style: { maxWidth: '320px', justifySelf: 'center', width: '100%' } }, ...[[2, '모두'], [0, '전반'], [1, '후반']].map(([k, l]) => h('button', { class: hf === k ? 'on' : '', onclick: () => { v.hf = k; v.shot = null; render(); } }, l))));
      B.append(shotMap(M, hf));
      const pc = (a, n) => `${a} (${Math.round(a / Math.max(1, n) * 100)}%)`;
      const sec = (t, ...rows) => h('div', { class: 'msec mst' }, h('h4', null, t), ...rows);
      const gT = A.gdW + Bt.gdW, aT = A.adW + Bt.adW;
      B.append(sec('주요 통계', possBar(A.pos), cmpRow('예상 골 (xG)', A.xg, Bt.xg, 2), cmpRow('전체 슛', A.sh, Bt.sh), cmpRow('유효 슈팅', A.sot, Bt.sot), cmpRow('상대편 박스 내에서의 터치', A.boxT, Bt.boxT), cmpRow('큰 기회', A.bigC, Bt.bigC), cmpRow('큰 기회 놓침', A.bigMiss, Bt.bigMiss), cmpRow('정확한 패스', A.passA, Bt.passA, 0, pc(A.passA, A.pass), pc(Bt.passA, Bt.pass)), cmpRow('경고', A.y, Bt.y), cmpRow('코너킥', A.corn, Bt.corn)));
      B.append(sec('신체 능력', cmpRow('이동 거리', A.km, Bt.km, 1, f1(A.km) + 'km', f1(Bt.km) + 'km'), cmpRow('걷기', A.walk, Bt.walk, 1, f1(A.walk) + 'km', f1(Bt.walk) + 'km'), cmpRow('달리기', A.run, Bt.run, 1, f1(A.run) + 'km', f1(Bt.run) + 'km'), cmpRow('스프린트', A.spr, Bt.spr, 1, f1(A.spr) + 'km', f1(Bt.spr) + 'km'), cmpRow('스프린트 수', A.sprN, Bt.sprN)));
      B.append(sec('예상 골 (xG)', cmpRow('예상 골 (xG)', A.xg, Bt.xg, 2), cmpRow('xG 오픈 플레이', A.xgOpen, Bt.xgOpen, 2), cmpRow('xG 세트 플레이', A.xgSet, Bt.xgSet, 2), cmpRow('PK 제외 xG', A.npxg, Bt.npxg, 2), cmpRow('xG 유효 슈팅 (xGOT)', A.xgot, Bt.xgot, 2),
        h('details', { class: 'mxgq' }, h('summary', null, '예상 골(xG)은 무슨 뜻인가요?'), h('div', { class: 'mute' }, '슈팅 위치·각도·슈팅 종류(발/헤더)·상황(일반 플레이/세트피스/역습/페널티킥)으로 그 슈팅이 골이 될 확률을 0~1로 나타낸 값입니다. xGOT는 골문으로 향한 슈팅이 실제로 날아간 위치까지 반영한 값이라, 골키퍼가 막기 어려운 슈팅일수록 높습니다.'))));
      B.append(sec('슛', cmpRow('전체 슛', A.sh, Bt.sh), cmpRow('빗나간 슈팅', A.shOff, Bt.shOff), cmpRow('유효 슈팅', A.sot, Bt.sot), cmpRow('막힌 슛', A.shBlk, Bt.shBlk), cmpRow('골대에 맞은 슛', A.post, Bt.post), cmpRow('박스 내 슛', A.shIn, Bt.shIn), cmpRow('박스 밖 슛', A.shOut, Bt.shOut)));
      const drA = M.tot[0].drbA ? Math.round(M.tot[0].drbA * (hf === 2 ? 1 : (A.drb / Math.max(1, C.MS.team(M, 0, 2).drb)))) : 0, drB = M.tot[1].drbA ? Math.round(M.tot[1].drbA * (hf === 2 ? 1 : (Bt.drb / Math.max(1, C.MS.team(M, 1, 2).drb)))) : 0;
      B.append(sec('볼 경합', cmpRow('볼 경합 성공', A.gdW + A.adW, Bt.gdW + Bt.adW), cmpRow('지상 볼 경합 성공', A.gdW, Bt.gdW, 0, pc(A.gdW, gT), pc(Bt.gdW, gT)), cmpRow('공중 볼 경합 성공', A.adW, Bt.adW, 0, pc(A.adW, aT), pc(Bt.adW, aT)), cmpRow('드리블 성공', A.drb, Bt.drb, 0, pc(A.drb, Math.max(A.drb, drA)), pc(Bt.drb, Math.max(Bt.drb, drB)))));
      B.append(sec('반칙', cmpRow('경고', A.y, Bt.y), cmpRow('퇴장', A.r, Bt.r), cmpRow('반칙', A.foul, Bt.foul)));
      B.append(sec('패스', cmpRow('패스', A.pass, Bt.pass), cmpRow('정확한 패스', A.passA, Bt.passA, 0, pc(A.passA, A.pass), pc(Bt.passA, Bt.pass)), cmpRow('내 팀 진영', A.passOwn, Bt.passOwn), cmpRow('상대 팀 진영', A.passOpp, Bt.passOpp), cmpRow('정확한 긴 패스', A.lngA, Bt.lngA, 0, pc(A.lngA, A.lng), pc(Bt.lngA, Bt.lng)), cmpRow('정확한 크로스', A.crsA, Bt.crsA, 0, pc(A.crsA, A.crs), pc(Bt.crsA, Bt.crs)), cmpRow('던지기', A.thr, Bt.thr), cmpRow('상대편 박스 내에서의 터치', A.boxT, Bt.boxT), cmpRow('오프사이드', A.offs, Bt.offs)));
      B.append(sec('수비', cmpRow('태클', A.tkl, Bt.tkl), cmpRow('가로채기', A.int, Bt.int), cmpRow('차단', A.blk, Bt.blk), cmpRow('걷어내기', A.clr, Bt.clr), cmpRow('골키퍼 선방', A.sav, Bt.sav)));
      const zone = sd => h('div', { class: 'mzone' + (sd ? ' r' : '') }, ...M.tot[sd].zone.map((z, i) => h('div', { class: 'mz', style: { '--a': Math.min(.85, z / 60) } }, h('b', null, z + '%'), h('small', null, ['왼쪽', '중앙', '오른쪽'][i]))));
      B.append(sec('공격 구역', h('div', { class: 'mzones' }, h('div', null, h('div', { class: 'lbl' }, tname(0)), zone(0)), h('div', null, h('div', { class: 'lbl' }, tname(1)), zone(1))), h('div', { class: 'mute', style: { fontSize: '11px' } }, '공격 방향 기준, 각 측면을 통해 진행한 공격 비율')));
      B.append(playerTable(M));
      B.append(h('div', { class: 'mute', style: { fontSize: '11px' } }, '골·도움·카드·교체·평점은 실제 경기 기록이고, 나머지 세부 지표는 그 기록과 두 팀 전력·선수 능력치에 맞춰 계산한 값입니다. (다시 열어도 같은 값)'));
    }
    // 슈팅 맵: 홈은 오른쪽 골문, 원정은 왼쪽 골문으로 공격
    function shotMap(M, hf) {
      const SH = M.shots.filter(x => hf === 2 || (hf === 0 ? x.m <= 45 : x.m > 45));
      const NSs = 'http://www.w3.org/2000/svg';
      const sv = document.createElementNS(NSs, 'svg'); sv.setAttribute('viewBox', '-2 -2 109 72'); sv.setAttribute('class', 'shmap');
      const L = 'stroke="rgba(255,255,255,.28)" stroke-width=".35" fill="none"';
      sv.innerHTML = `<rect x="0" y="0" width="105" height="68" ${L}/><line x1="52.5" y1="0" x2="52.5" y2="68" ${L}/><circle cx="52.5" cy="34" r="9.15" ${L}/><rect x="0" y="13.84" width="16.5" height="40.32" ${L}/><rect x="88.5" y="13.84" width="16.5" height="40.32" ${L}/><rect x="0" y="24.84" width="5.5" height="18.32" ${L}/><rect x="99.5" y="24.84" width="5.5" height="18.32" ${L}/><rect x="-1.6" y="30.34" width="1.6" height="7.32" ${L}/><rect x="105" y="30.34" width="1.6" height="7.32" ${L}/>`;
      const cur = v.shot != null && SH.includes(M.shots[v.shot]) ? M.shots[v.shot] : SH.find(x => x.res === '골') || SH[0] || null;
      for (const x of SH) {
        const cx = x.s === 0 ? 105 - x.dx : x.dx, cy = 34 + (x.s === 0 ? x.dy : -x.dy);
        const rr = 1.1 + Math.sqrt(x.xg) * 3.2, goal = x.res === '골', ont = x.res === '선방';
        const c = document.createElementNS(NSs, 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', rr);
        c.setAttribute('fill', goal ? col[x.s] : ont ? col[x.s] + '55' : 'transparent'); c.setAttribute('stroke', goal ? '#fff' : col[x.s]); c.setAttribute('stroke-width', x === cur ? '.9' : '.45');
        c.setAttribute('class', 'shd' + (x === cur ? ' on' : ''));
        c.addEventListener('click', () => { v.shot = M.shots.indexOf(x); render(); });
        sv.append(c);
      }
      const det = cur ? h('div', { class: 'shdet' },
        h('div', { class: 'shh' }, h('span', { class: 'mm' }, U.fmtMin(cur.m)), h('span', { class: 'shc', style: { background: col[cur.s] } }), pname(cur.p, close), cur.as ? h('span', { class: 'mute', style: { fontSize: '12px' } }, ' · 키 패스 ', pname(cur.as, close)) : null),
        h('div', { class: 'shg' }, ...[['슛 유형', cur.type], ['상황', cur.pk ? (C.PKT.find(t => t.k === cur.pk) || {}).n || cur.sit : cur.sit], ['결과', cur.res === '선방' ? '유효 슈팅 (선방)' : cur.res === '막힘' ? '막힘' : cur.res], ['xG', f2(cur.xg)], ['xGOT', cur.xgot != null && (cur.res === '골' || cur.res === '선방') ? f2(cur.xgot) : '-']].map(([k, val]) => h('div', null, h('small', { class: 'mute' }, k), h('b', null, val)))))
        : h('div', { class: 'mute', style: { fontSize: '12px', textAlign: 'center' } }, '이 구간에는 슈팅이 없습니다');
      const leg = h('div', { class: 'shleg mute' }, h('span', null, h('i', { class: 'lg g' }), '골'), h('span', null, h('i', { class: 'lg o' }), '유효 슈팅'), h('span', null, h('i', { class: 'lg x' }), '빗나감·막힘'), h('span', null, '원 크기 = xG'));
      const cnt = sd => { const a = SH.filter(x => x.s === sd); return `${a.length}슈팅 · xG ${f2(a.reduce((t, x) => t + x.xg, 0))}`; };
      return h('div', { class: 'msec' }, h('h4', null, '슈팅 맵'), h('div', { class: 'shtop' }, h('span', null, h('b', null, tname(1)), ' ', h('span', { class: 'mute' }, cnt(1))), h('span', null, h('span', { class: 'mute' }, cnt(0)), ' ', h('b', null, tname(0)))), h('div', { class: 'shwrap' }, sv), leg, det);
    }
    // 선수 통계 표
    function playerTable(M) {
      const n = id => nameOf(id);
      const C1 = (l, f, sv) => [l, f, sv || f];
      const DEFS = {
        main: [C1('평점', p => U.rt1(p.rt), p => p.rt), C1('출전 시간', p => p.min + "'", p => p.min), C1('득점', p => p.st.g), C1('어시스트', p => p.st.a), C1('xG', p => f2(p.st.xg), p => p.st.xg), C1('xA', p => f2(p.st.xa), p => p.st.xa), C1('xG+xA', p => f2(p.st.xg + p.st.xa), p => p.st.xg + p.st.xa), C1('수비적 행동', p => p.st.def)],
        att: [C1('슈팅', p => p.st.sh), C1('유효 슈팅', p => p.st.sot), C1('xG', p => f2(p.st.xg), p => p.st.xg), C1('xGOT', p => f2(p.st.xgot), p => p.st.xgot), C1('박스 내 터치', p => p.st.boxT), C1('드리블 성공', p => `${p.st.drb}/${p.st.drbT}`, p => p.st.drb), C1('볼 뺏김', p => p.st.disp), C1('오프사이드', p => p.st.offs)],
        pass: [C1('정확한 패스', p => pctS(p.st.passA, p.st.pass), p => p.st.passA), C1('기회 창출', p => p.st.kp), C1('큰 기회 만듦', p => p.st.bigC), C1('xA', p => f2(p.st.xa), p => p.st.xa), C1('공격 지역 패스', p => p.st.fin3), C1('정확한 긴 패스', p => `${p.st.lngA}/${p.st.lng}`, p => p.st.lngA), C1('정확한 크로스', p => `${p.st.crsA}/${p.st.crs}`, p => p.st.crsA), C1('터치', p => p.st.touch)],
        def: [C1('수비적 행동', p => p.st.def), C1('태클', p => p.st.tkl), C1('가로채기', p => p.st.int), C1('차단', p => p.st.blk), C1('걷어내기', p => p.st.clr), C1('볼 회수', p => p.st.rec), C1('드리블 돌파 허용', p => p.st.past)],
        duel: [C1('볼 경합 성공', p => p.st.duelW), C1('지상 볼 경합', p => pctS(p.st.gdW, p.st.gd), p => p.st.gdW), C1('공중 볼 경합', p => pctS(p.st.adW, p.st.ad), p => p.st.adW), C1('당한 파울', p => p.st.fouled), C1('반칙', p => p.st.foul)],
        phys: [C1('이동 거리', p => f1(p.st.km) + 'km', p => p.st.km), C1('최고 속도', p => f1(p.st.top) + 'km/h', p => p.st.top), C1('걷기', p => f1(p.st.walk) + 'km', p => p.st.walk), C1('조깅', p => f1(p.st.jog) + 'km', p => p.st.jog), C1('달리기', p => f1(p.st.run) + 'km', p => p.st.run), C1('스프린트', p => Math.round(p.st.spr * 1000) + 'm', p => p.st.spr), C1('스프린트 수', p => p.st.sprN)],
        gk: [C1('선방', p => p.st.sav), C1('실점', p => p.st.conc), C1('상대 xGOT', p => f2(p.st.xgotF), p => p.st.xgotF), C1('득점 차단', p => (p.st.prev >= 0 ? '+' : '') + f2(p.st.prev), p => p.st.prev), C1('다이빙 세이브', p => p.st.dive), C1('박스 내 세이브', p => p.st.savIn), C1('공중에서 잡기', p => p.st.claim || 0), C1('펀칭', p => p.st.punch || 0), C1('스위퍼 처리', p => p.st.sweep || 0), C1('던지기', p => p.st.gkThr || 0)]
      };
      const TB = [['main', '주요 통계'], ['att', '공격'], ['pass', '패스'], ['def', '수비'], ['duel', '볼 경합'], ['phys', '신체 능력'], ['gk', '골키핑']];
      const cols = DEFS[v.pt] || DEFS.main;
      let list = M.PL[0].concat(M.PL[1]).filter(p => v.side === 2 || p.s === v.side);
      if (v.pt === 'gk') list = list.filter(p => p.role === 'GK');
      if (v.sort != null && cols[v.sort]) { const f = cols[v.sort][2]; list = list.slice().sort((a, b) => (+f(b) || 0) - (+f(a) || 0)); }
      else list = list.slice().sort((a, b) => b.rt - a.rt);
      const tbl = h('table', { class: 'ltable mpt' }, h('thead', null, h('tr', null, h('th', { class: 'l' }, '선수'), ...cols.map((c, i) => h('th', { class: 'click' + (v.sort === i ? ' on' : ''), onclick: () => { v.sort = v.sort === i ? null : i; render(); } }, c[0])))),
        h('tbody', null, ...list.map(p => h('tr', { class: 'click', onclick: rowClick(p.id) }, h('td', { class: 'l' }, h('span', { class: 'shc', style: { background: col[p.s] } }), pname(p.id, close), h('small', { class: 'mute' }, ' ' + (p.pos || '')), p.id === mom ? h('span', { class: 'momb' }, '★') : null), ...cols.map(c => h('td', null, c[1](p)))))));
      return h('div', { class: 'msec' }, h('h4', null, '선수 통계'),
        h('div', { class: 'mpts' }, ...TB.map(([k, l]) => h('button', { class: v.pt === k ? 'on' : '', onclick: () => { v.pt = k; v.sort = null; render(); } }, l))),
        h('div', { class: 'seg', style: { maxWidth: '300px', margin: '6px 0' } }, ...[[2, '양 팀'], [0, tname(0)], [1, tname(1)]].map(([k, l]) => h('button', { class: v.side === k ? 'on' : '', onclick: () => { v.side = k; render(); } }, l))),
        h('div', { class: 'tscroll' }, tbl), h('div', { class: 'mute', style: { fontSize: '11px' } }, '열 제목을 누르면 정렬 · 선수 칸을 누르면 경기 세부 기록'));
    }
    // ---------- 선수 경기 기록 ----------
    function playerSheet(B) {
      const M = getMs(), all = M.PL[0].filter(p => p.start).concat(M.PL[0].filter(p => !p.start), M.PL[1].filter(p => p.start), M.PL[1].filter(p => !p.start));
      const p = all.find(x => x.id === v.pl); if (!p) { v.pl = null; return facts(B); }
      const k = all.indexOf(p), t = p.st, gk = p.role === 'GK', atk = ATKR.has(p.role);
      const nav = h('div', { class: 'psnav' }, h('button', { class: 'btn ghost sm', onclick: () => { v.pl = null; render(); } }, '← 경기'),
        h('div', { class: 'psarr' }, h('button', { class: 'btn ghost sm', disabled: k <= 0 ? true : null, onclick: () => { v.pl = all[k - 1].id; render(); } }, '‹'), h('span', { class: 'mute' }, `${k + 1} / ${all.length}`), h('button', { class: 'btn ghost sm', disabled: k >= all.length - 1 ? true : null, onclick: () => { v.pl = all[k + 1].id; render(); } }, '›')));
      const info = playerInfo(p.id);
      B.append(nav, h('div', { class: 'pshead' }, h('div', { class: 'pst' }, h('div', { class: 'psn' }, pname(p.id, close), p.id === mom ? h('span', { class: 'momb', title: '경기 최우수 선수' }, ' ★ MOM') : null),
        h('div', { class: 'mute', style: { fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } }, crestOf(p.s), tname(p.s), ' · ', p.pos || '', info.nat ? [' · ', U.flag(info.nat, 16), ' ', C.natName(info.nat)] : null, info.age ? ` · ${info.age}세` : '')),
        h('div', { class: 'psr' }, h('span', { class: 'rt big ' + (p.rt >= 8 ? 'r8' : p.rt >= 7 ? 'r7' : p.rt >= 6 ? 'r6' : 'r5') }, (+p.rt).toFixed(1)), h('small', { class: 'mute' }, '평점'))));
      // 하이라이트
      const hl = highlights(M, p); if (hl.length) B.append(h('div', { class: 'pshl' }, h('b', null, '하이라이트'), ...hl.map(x => h('div', null, '· ' + x))));
      // 히트맵
      B.append(h('div', { class: 'msec' }, h('h4', null, '히트맵 ', h('span', { class: 'mute', style: { fontWeight: 400 } }, `· 터치 ${t.touch}`)), heatmap(p, M)));
      // 이벤트 타임라인
      const tl = [];
      if (!p.start) tl.push([p.on, '↑ 교체 투입']);
      if (gk) for (const x of M.shots.filter(z => z.gk === p.id)) tl.push([x.m, x.res === '골' ? '실점' : '선방', x.res === '골']);
      else for (const x of M.shots.filter(z => z.p === p.id)) tl.push([x.m, x.res === '골' ? '골' : x.res === '선방' ? '유효 슈팅' : x.res === '막힘' ? '막힌 슛' : x.res === '골대' ? '골대' : '빗나감', x.res === '골']);
      for (const e of d.ev) { if (e.a === p.id && e.p !== p.id) tl.push([e.m, '도움', true]); if (e.p === p.id && 'yr2'.includes(e.k)) tl.push([e.m, KIND[e.k]]); if (e.p === p.id && e.k === 'o') tl.push([e.m, '자책골']); }
      if (p.start && p.off < 90 && !t.r) tl.push([p.off, '↓ 교체 아웃']);
      tl.sort((a, b) => a[0] - b[0]);
      const rows = (pairs) => h('div', { class: 'pskv' }, ...pairs.filter(Boolean).map(([l, val]) => h('div', null, h('span', null, l), h('b', null, val))));
      const keyS = gk ? [['출전 시간', p.min + "'"], ['예상 어시스트 (xA)', f2(t.xa)], ['선방', t.sav], ['실점 수', t.conc], ['상대 xGOT', f2(t.xgotF)], ['득점 차단', (t.prev >= 0 ? '+' : '') + f2(t.prev)]]
        : atk ? [['출전 시간', p.min + "'"], ['득점', t.g], ['어시스트', t.a], ['예상 골 (xG)', f2(t.xg)], ['유효 슈팅 기대 득점 (xGOT)', f2(t.xgot)], ['예상 어시스트 (xA)', f2(t.xa)], ['xG + xA', f2(t.xg + t.xa)], ['최고 속도', f1(t.top) + 'km/h'], ['이동 거리', f1(t.km) + 'km'], ['정확한 패스', pctS(t.passA, t.pass)], ['기회 창출', t.kp], ['큰 기회 만듦', t.bigC], ['유효 슈팅', t.sot], ['빗나간 슈팅', t.shOff], ['막힌 슛', t.shBlk], ['슈팅 정확도', pctS(t.sot, t.sh - t.shBlk)]]
          : [['출전 시간', p.min + "'"], ['득점', t.g], ['어시스트', t.a], t.sh ? ['예상 골 (xG)', f2(t.xg)] : null, ['예상 어시스트 (xA)', f2(t.xa)], ['xG + xA', f2(t.xg + t.xa)], ['최고 속도', f1(t.top) + 'km/h'], ['이동 거리', f1(t.km) + 'km'], ['정확한 패스', pctS(t.passA, t.pass)], ['기회 창출', t.kp], ['수비적 행동', t.def]];
      B.append(h('div', { class: 'msec' }, h('h4', null, '주요 통계'), rows(keyS),
        tl.length ? h('div', { class: 'pstl' }, ...tl.map(([m, l, hi]) => h('span', { class: 'chip' + (hi ? ' hi' : '') }, h('b', null, m + "'"), ' ' + l))) : null));
      if (gk) B.append(h('div', { class: 'msec' }, h('h4', null, '골키핑'), rows([['정확한 패스', pctS(t.passA, t.pass)], ['정확한 긴 패스', pctS(t.lngA, t.lng)], ['다이빙 세이브', t.dive], ['박스 내 세이브', t.savIn], ['키퍼가 스위퍼로 처리', t.sweep || 0], ['펀칭', t.punch || 0], ['던지기', t.gkThr || 0], ['공중에서 잡기', t.claim || 0], ['볼 회수', t.rec], ['걷어내기', t.clr], ['터치', t.touch]])));
      else {
        B.append(h('div', { class: 'msec' }, h('h4', null, '공격'), rows([['터치', t.touch], ['상대편 박스 내에서의 터치', t.boxT], ['공격 지역 패스', t.fin3], ['라인을 뚫는 패스', t.lineBr], ['정확한 긴 패스', pctS(t.lngA, t.lng)], ['정확한 크로스', pctS(t.crsA, t.crs)], ['드리블 성공', pctS(t.drb, t.drbT)], ['볼 뺏김', t.disp], ['오프사이드', t.offs], ['PK 제외 xG', f2(t.npxg)]])));
        B.append(h('div', { class: 'msec' }, h('h4', null, '수비'), rows([['수비적 행동', t.def], ['태클', t.tkl], ['차단', t.blk], ['걷어내기', t.clr], ['가로채기', t.int], ['볼 회수', t.rec], ['드리블 돌파 허용', t.past]])));
      }
      B.append(h('div', { class: 'msec' }, h('h4', null, '볼 경합'), rows([['지상 볼 경합 성공', pctS(t.gdW, t.gd)], ['공중 볼 경합 성공', pctS(t.adW, t.ad)], ['당한 파울', t.fouled], ['반칙', t.foul]])));
      const pc = x => t.km ? Math.round(x / t.km * 100) : 0;
      B.append(h('div', { class: 'msec' }, h('h4', null, '신체 능력'), rows([['최고 속도', f1(t.top) + 'km/h'], ['이동 거리', f1(t.km) + 'km'], ['걷기', `${f1(t.walk)}km (${pc(t.walk)}%)`], ['조깅', `${f1(t.jog)}km (${pc(t.jog)}%)`], ['달리기', `${f1(t.run)}km (${pc(t.run)}%)`], ['스프린트', `${Math.round(t.spr * 1000)}m (${pc(t.spr)}%)`], ['스프린트 수', t.sprN]])));
    }
    function playerInfo(id) {
      const F = G.FC27; let nat = null, age = null;
      if (w.ps && w.ps[id]) nat = w.ps[id].nat;
      for (const cid of [o.a, o.b]) { const c = w.clubs[cid]; if (c && c.sq) { const x = c.sq.find(q => String(q[0]) === id); if (x) { nat = nat || x[5]; age = x[3]; } } }
      if (/^\d+$/.test(id) && F && F.P[+id]) { nat = nat || F.P[+id][5]; if (age == null) { const bd = F.P[+id][9], md = (ctx && ctx.date) || (w.cal && w.cal.d) || 0; if (bd != null && md) age = Math.floor((md - (C.dayOf ? C.dayOf(2000, 1, 1) : 0) - bd) / 365.25); } }
      if (o.nat && !nat) nat = null;
      return { nat, age: age > 14 && age < 46 ? age : null };
    }
    function highlights(M, p) {
      const all = M.PL[0].concat(M.PL[1]), out = [];
      const top = (f, min, txt) => { const val = f(p); if (val == null || val < min) return; if (all.every(q => q === p || f(q) < val)) out.push(txt(val)); };
      top(q => q.st.km, 9, x => `경기에서 가장 긴 이동 거리(${f1(x)}km)를 기록했다`);
      top(q => q.st.top, 30, x => `경기 최고 속도(${f1(x)}km/h)를 찍었다`);
      top(q => q.st.kp, 2, x => `양 팀 최다 기회 창출(${x}회)`);
      top(q => q.st.def, 6, x => `양 팀 최다 수비적 행동(${x}회)`);
      top(q => q.st.duelW, 7, x => `볼 경합 최다 승리(${x}회)`);
      top(q => q.st.passA, 40, x => `경기 최다 정확한 패스(${x}회)`);
      top(q => q.st.touch, 60, x => `경기 최다 터치(${x}회)`);
      top(q => q.st.xg, .5, x => `경기 최고 xG(${f2(x)})`);
      top(q => q.st.sav, 3, x => `선방 ${x}회로 경기 최다`);
      top(q => q.st.sprN, 25, x => `경기 최다 스프린트(${x}회)`);
      if (p.st.prev >= .8) out.push(`기대 실점보다 ${f2(p.st.prev)}골을 더 막아냈다`);
      return out.slice(0, 3);
    }
    // 히트맵: 터치 위치 (공격 방향 →)
    function heatmap(p, M) { return U.heatBox(U.heatPts(p, M)); }
    // ---------- 순위·현황 ----------
    function tableTab(B) {
      const c = ctx;
      if (c.lg) return leagueTable(B, c);
      const st = c.st, rows = (st && st[c.grp] && st[c.grp][c.key]) || [];
      const idOf = x => c.grp === 'INTL' ? x : C.cidOf(w, x), nm = id => c.grp === 'INTL' ? C.natName(id) : ((w.clubs[id] || {}).name || '-');
      const isPhase = c.grp === 'CONT' && /리그 페이즈/.test(c.stage || ''), isGroup = c.grp === 'INTL' && /조별/.test(c.stage || '');
      if (isPhase || isGroup) {
        const ph = rows.filter(r => r[0] === c.stage && (c.date == null || r[8] == null || r[8] <= c.date));
        let teams = null;
        if (isGroup) { // 같은 조: 서로 경기한 팀끼리 묶기
          const par = {}, f = x => par[x] === x ? x : (par[x] = f(par[x])); for (const r of rows.filter(r => r[0] === c.stage)) { const A = idOf(r[1]), Bb = idOf(r[2]); par[A] = par[A] || A; par[Bb] = par[Bb] || Bb; par[f(A)] = f(Bb); }
          const me = o.a; if (par[me]) { const root = f(me); teams = Object.keys(par).filter(x => f(x) === root); }
        }
        const tb = {}; const add = (id, gf, ga) => { const t = tb[id] || (tb[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }); t.p++; t.gf += gf; t.ga += ga; if (gf > ga) { t.w++; t.pts += 3; } else if (gf === ga) { t.d++; t.pts++; } else t.l++; };
        for (const r of ph) { const A = idOf(r[1]), Bb = idOf(r[2]); if (teams && !teams.includes(A)) continue; add(A, r[3], r[4]); add(Bb, r[4], r[3]); }
        const T = Object.values(tb).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
        B.append(h('div', { class: 'msec' }, h('h4', null, `${isPhase ? '리그 페이즈' : '조별리그'} 순위 · 이 경기 직후`), stTable(T, nm, isPhase ? [[8, 'q'], [24, 'p']] : [[2, 'q']]),
          isPhase ? h('div', { class: 'mute', style: { fontSize: '11px' } }, '1~8위 16강 직행 · 9~24위 플레이오프') : null));
        return;
      }
      // 토너먼트: 같은 라운드 대진 + 두 팀이 거쳐 온 길
      const same = rows.filter(r => r[0] === c.stage);
      const line = r => { const A = idOf(r[1]), Bb = idOf(r[2]), pw = r[7] != null ? idOf(r[7]) : null, hi = [o.a, o.b].includes(A) && [o.a, o.b].includes(Bb);
        return h('div', { class: 'kor' + (hi ? ' hi' : '') + (r[5] || r[6] ? ' click' : ''), onclick: r[5] || r[6] ? () => { const dd = MD.decode(st, r); U.showMatch({ title: `${o.title.split(' · ')[0]} · ${r[0]}`, a: A, b: Bb, ga: r[3], gb: r[4], pw, d: dd, nat: o.nat, key: (o.key || '') + '|' + r[1] + '|' + r[2] + '|' + r[0], ctx: Object.assign({}, c, { stage: r[0], date: r[8] }) }); } : null },
          h('span', { class: 'r' + (r[3] > r[4] || pw === A ? ' w' : '') }, nm(A)), h('b', null, `${r[3]} - ${r[4]}`, pw ? h('small', { class: 'mute' }, ' PK') : null), h('span', { class: r[4] > r[3] || pw === Bb ? 'w' : '' }, nm(Bb))); };
      B.append(h('div', { class: 'msec' }, h('h4', null, `${c.stage} 대진`), h('div', { class: 'kos' }, ...same.map(line))));
      const stages = []; for (const r of rows) if (!stages.includes(r[0])) stages.push(r[0]);
      const path = id => rows.filter(r => idOf(r[1]) === id || idOf(r[2]) === id);
      B.append(h('div', { class: 'mlus' }, ...[o.a, o.b].map((id, sd) => h('div', { class: 'msec' }, h('h4', null, `${nm(id)} 이번 대회 경기`), h('div', { class: 'kos' }, ...path(id).map(r => h('div', null, h('div', { class: 'mute', style: { fontSize: '11px' } }, r[0]), line(r))))))));
      const later = stages.slice(stages.indexOf(c.stage) + 1);
      if (later.length) B.append(h('div', { class: 'msec' }, h('h4', null, '이후 라운드'), ...later.map(sg => h('div', null, h('div', { class: 'lbl' }, sg), h('div', { class: 'kos' }, ...rows.filter(r => r[0] === sg).map(line))))));
    }
    function stTable(T, nm, zones) {
      const zc = i => { for (const [n, k] of zones || []) if (i < n) return k; return ''; };
      return h('div', { class: 'tscroll' }, h('table', { class: 'ltable mstt' }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득실', '승점'].map((x, i) => h('th', { class: i === 1 ? 'l' : '' }, x)))),
        h('tbody', null, ...T.map((t, i) => h('tr', { class: ([o.a, o.b].includes(t.id) ? 'hi ' : '') + zc(i) }, h('td', null, i + 1), h('td', { class: 'l' }, o.nat ? U.natCrest(t.id, 16) : crest(w.clubs[t.id] || null, 16), ' ', nm(t.id)), h('td', null, t.p), h('td', null, t.w), h('td', null, t.d), h('td', null, t.l), h('td', null, (t.gf - t.ga > 0 ? '+' : '') + (t.gf - t.ga)), h('td', null, h('b', null, t.pts)))))));
    }
    function leagueTable(B, c) {
      const rows = MD.leagueRows(w, c.L); if (!rows.length) { B.append(h('div', { class: 'mute' }, '순위 기록이 없습니다.')); return; }
      const me = rows.find(r => r.i === c.i) || null;
      v.lt = v.lt || 'at';
      const upto = v.lt === 'at' && me ? rows.filter(r => me.d != null && r.d != null ? r.d < me.d || (r.d === me.d && r.r <= me.r) : r.r <= me.r) : rows;
      const tb = {}; const add = (id, gf, ga) => { const t = tb[id] || (tb[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, f: [] }); t.p++; t.gf += gf; t.ga += ga; t.f.push(gf > ga ? 'W' : gf < ga ? 'L' : 'D'); if (gf > ga) { t.w++; t.pts += 3; } else if (gf === ga) { t.d++; t.pts++; } else t.l++; };
      for (const id of (w.lg[c.lg] || { clubs: [] }).clubs) tb[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, f: [] };
      for (const r of upto.slice().sort((a, b) => (a.d || 0) - (b.d || 0) || a.r - b.r)) { add(r.a, r.ga, r.gb); add(r.b, r.gb, r.ga); }
      const T = Object.values(tb).filter(t => t.p || v.lt === 'at').sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || String(x.id).localeCompare(String(y.id)));
      const L = w.lg[c.lg] || {}, n = T.length;
      const zones = L.tier === 1 ? [[4, 'q'], [n - 3, ''], [n, 'rel']] : [[2, 'q'], [n - 3, ''], [n, 'rel']];
      B.append(h('div', { class: 'seg', style: { maxWidth: '320px' } }, h('button', { class: v.lt === 'at' ? 'on' : '', onclick: () => { v.lt = 'at'; render(); } }, '이 경기 직후'), h('button', { class: v.lt === 'all' ? 'on' : '', onclick: () => { v.lt = 'all'; render(); } }, '최신 순위')));
      const tblEl = h('div', { class: 'tscroll' }, h('table', { class: 'ltable mstt' }, h('thead', null, h('tr', null, ...['#', '팀', '경기', '승', '무', '패', '득실', '승점', '최근'].map((x, i) => h('th', { class: i === 1 ? 'l' : '' }, x)))),
        h('tbody', null, ...T.map((t, i) => h('tr', { class: ([o.a, o.b].includes(t.id) ? 'hi ' : '') + (i < zones[0][0] ? 'q' : i >= n - 3 && L.tier !== undefined && n > 10 ? 'rel' : '') }, h('td', null, i + 1), h('td', { class: 'l' }, crest(w.clubs[t.id] || null, 16), ' ', (w.clubs[t.id] || {}).name || t.id), h('td', null, t.p), h('td', null, t.w), h('td', null, t.d), h('td', null, t.l), h('td', null, (t.gf - t.ga > 0 ? '+' : '') + (t.gf - t.ga)), h('td', null, h('b', null, t.pts)),
          h('td', null, h('span', { class: 'frm' }, ...t.f.slice(-5).map(x => h('i', { class: x }, x === 'W' ? '승' : x === 'L' ? '패' : '무')))))))));
      B.append(h('div', { class: 'msec' }, h('h4', null, `${L.name || '리그'} 순위${v.lt === 'at' && me ? ` · ${me.r + 1}라운드 경기 직후` : ''}`), tblEl));
    }
    // ---------- 상대 전적 ----------
    function h2hTab(B) {
      const pk = [o.a, o.b].sort().join('|') + (o.nat ? '|n' : '');
      const cached = U._h2h && U._h2h[pk];
      if (!cached) {
        B.append(h('div', { class: 'mute' }, '지난 시즌 경기 기록을 찾는 중…'));
        if (!U._h2hRun || U._h2hRun !== pk) { U._h2hRun = pk; h2hScan(o.a, o.b, o.nat).then(list => { (U._h2h = U._h2h || {})[pk] = list; U._h2hRun = null; if (v.tab === 'h2h' && body.isConnected) render(); }); }
        return;
      }
      const list = cached;
      let wa = 0, dr = 0, wb = 0, gfa = 0, gfb = 0;
      for (const m of list) { const ha = m.a === o.a, ga = ha ? m.ga : m.gb, gb = ha ? m.gb : m.ga; gfa += ga; gfb += gb; if (ga > gb || (ga === gb && m.pw === o.a)) wa++; else if (gb > ga || (ga === gb && m.pw === o.b)) wb++; else dr++; }
      B.append(h('div', { class: 'h2hs' }, h('div', null, crestOf(0), h('b', { style: { color: col[0] } }, wa), h('small', null, tname(0) + ' 승')), h('div', null, h('b', null, dr), h('small', null, '무승부')), h('div', null, crestOf(1), h('b', { style: { color: col[1] } }, wb), h('small', null, tname(1) + ' 승'))));
      if (!list.length) { B.append(h('div', { class: 'mute', style: { fontSize: '13px' } }, '기록에 남은 두 팀의 맞대결은 이 경기뿐입니다.')); return; }
      B.append(h('div', { class: 'mute', style: { fontSize: '12px', textAlign: 'center' } }, `${list.length}경기 · 득점 ${gfa} : ${gfb}`));
      B.append(h('div', { class: 'msec' }, h('h4', null, '맞대결 기록'), h('div', { class: 'kos' }, ...list.map(m => h('div', { class: 'kor h2' + (m.open ? ' click' : '') + (m.self ? ' hi' : ''), onclick: m.open && !m.self ? () => m.open() : null },
        h('small', { class: 'mute' }, `${m.dt != null ? C.fmtDateY(m.dt) : m.lb} · ${m.comp}`), h('span', { class: 'r' }, m.nat ? C.natName(m.a) : (w.clubs[m.a] || {}).short || (w.clubs[m.a] || {}).name || m.a), h('b', null, `${m.ga} - ${m.gb}`, m.pw ? h('small', { class: 'mute' }, ' PK') : null), h('span', null, m.nat ? C.natName(m.b) : (w.clubs[m.b] || {}).short || (w.clubs[m.b] || {}).name || m.b))))));
    }
    async function h2hScan(A, Bb, nat) {
      const out = [];
      const labels = ['live'].concat((w.mxKeys || []).slice().reverse()).slice(0, 16);
      for (const lb of labels) {
        let st = null;
        try { st = lb === 'live' ? U.liveSt() : (U.mxCached(lb) || await U.getMx(lb)); } catch (e) { st = null; }
        if (!st) continue;
        const both = (x, y) => (x === A && y === Bb) || (x === Bb && y === A);
        if (!nat) for (const lid in st.L || {}) { const L = st.L[lid]; if (!L || !L.s) continue; const lgN = (w.lg[lid] || {}).name || '리그';
          for (const r of MD.leagueRows(w, L)) if (both(r.a, r.b)) out.push({ lb, comp: lgN + ` ${r.r + 1}R`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, dt: r.d, self: lb === 'live' || false ? sameM(r.a, r.b, r.ga, r.gb, r.d) : false, open: r.det ? () => U.showMatch({ title: `${lgN} ${L.sl || lb} · ${r.r + 1}라운드${r.d != null ? ' · ' + C.fmtDateY(r.d) : ''}`, a: r.a, b: r.b, ga: r.ga, gb: r.gb, d: MD.leagueMatch(st, L, r.i), key: lid + '|' + lb + '|' + r.i, ctx: { st, lg: lid, L, i: r.i, date: r.d } }) : null }); }
        for (const grp of nat ? ['INTL'] : ['CUP', 'CONT']) for (const k in st[grp] || {}) for (const r of st[grp][k] || []) {
          const x = nat ? r[1] : C.cidOf(w, r[1]), y = nat ? r[2] : C.cidOf(w, r[2]); if (!both(x, y)) continue;
          const comp = grp === 'CONT' ? ((C.COMPS && C.COMPS[k] && C.COMPS[k].name) || k) : grp === 'INTL' ? ((C.COMPS && C.COMPS[k] && C.COMPS[k].name) || k) : (() => { const [n2, kd] = String(k).split(':'); return kd === 'lcup' ? ((C.LCUPNAME || {})[n2] || `${C.natName(n2)} 리그컵`) : ((C.CUPNAME || {})[n2] || `${C.natName(n2)} 컵`); })();
          const pw = r[7] != null ? (nat ? r[7] : C.cidOf(w, r[7])) : null;
          out.push({ lb, comp: comp + ' ' + r[0], a: x, b: y, ga: r[3], gb: r[4], pw, dt: r[8], nat, self: sameM(x, y, r[3], r[4], r[8]), open: r[5] || r[6] ? () => U.showMatch({ title: `${comp} · ${r[0]}${r[8] != null ? ' · ' + C.fmtDateY(r[8]) : ''}`, a: x, b: y, ga: r[3], gb: r[4], pw, d: MD.decode(st, r), nat, key: grp + k + lb + r[1] + r[2] + r[0], ctx: { st, grp, key: k, stage: r[0], date: r[8] } }) : null });
        }
      }
      const seen = new Set();
      return out.filter(m => { const k2 = [m.a, m.b, m.ga, m.gb, m.dt, m.comp].join('|'); if (seen.has(k2)) return false; seen.add(k2); return true; }).sort((x, y) => (y.dt || 0) - (x.dt || 0));
    }
    function sameM(a, b, ga, gb, dt) { return a === o.a && b === o.b && ga === o.ga && gb === o.gb && (!ctx || ctx.date == null || dt === ctx.date); }
    const wrap = h('div', null, tabs, body);
    render();
    return [head, wrap];
  }, { clickClose: true, reopen: o._re || (o._re = () => U.showMatch(o)) });
};
const ATKR = new Set(['ST', 'W', 'AM']);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// 시즌 경기 기록 불러오기 (화면이 먼저 그려지고, 다 불러오면 다시 그린다)
U.withMx = function (label, onReady) {
  const st = U.mxCached(label);
  if (st) return st;
  if (!U._mxLoading) U._mxLoading = {};
  if (!U._mxLoading[label]) { U._mxLoading[label] = 1; U.getMx(label).then(x => { delete U._mxLoading[label]; if (x && onReady) onReady(); }); }
  return null;
};
})(typeof window !== 'undefined' ? window : globalThis);
