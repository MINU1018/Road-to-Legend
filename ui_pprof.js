// Road to Legend — 선수 프로필 (FotMob 스타일): 기본 정보·포지션, 이적 가치 그래프, 시즌 요약, 경기 통계, 시즌 히트맵·슈팅 맵,
// 시즌 성적(합계/90분당, 같은 리그·같은 포지션 순위), 선수 특성 레이더, 경력, 트로피, 소개
// 세부 지표는 경기 상세(matchstats.js)와 같은 값을 경기마다 더한 것 — 경기 팝업에서 본 숫자와 그대로 맞는다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI, MD = C.MD;
const { h, crest } = U;
const S = () => U.S();
const flag = (c, w) => U.flag(c, w);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1), f2 = x => (Math.round(x * 100) / 100).toFixed(2);
const PST = () => (U.st.pf = U.st.pf || {});
const POSKO = { GK: '골키퍼', CB: '중앙 수비수', LB: '왼쪽 수비수', RB: '오른쪽 수비수', LWB: '왼쪽 윙백', RWB: '오른쪽 윙백', DM: '수비형 미드필더', CDM: '수비형 미드필더', CM: '중앙 미드필더', AM: '공격형 미드필더', CAM: '공격형 미드필더', LM: '왼쪽 미드필더', RM: '오른쪽 미드필더', LW: '왼쪽 윙어', RW: '오른쪽 윙어', ST: '스트라이커' };
const PXY = { GK: [50, 92], CB: [50, 76], LB: [18, 76], RB: [82, 76], LWB: [18, 60], RWB: [82, 60], DM: [50, 60], CDM: [50, 60], CM: [50, 43], AM: [50, 26], CAM: [50, 26], LM: [18, 43], RM: [82, 43], LW: [18, 26], RW: [82, 26], ST: [50, 10] }; // 포지션 그리드: ST / LW AM RW / LM CM RM / LWB DM RWB / LB CB RB / GK
const PSH = { GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LWB', RWB: 'RWB', DM: 'DM', CDM: 'DM', CM: 'CM', AM: 'AM', CAM: 'AM', LM: 'LM', RM: 'RM', LW: 'LW', RW: 'RW', ST: 'ST' };
const FAMK = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const fcRow = pid => { const F = G.FC27; return /^\d+$/.test(String(pid)) && F && F.P[+pid] ? F.P[+pid] : null; };
const D2000 = () => C.dayOf(2000, 1, 1);
const grpOf = role => role === 'GK' ? 'GK' : role === 'CB' || role === 'FB' ? 'DEF' : role === 'ST' || role === 'W' ? 'ATT' : 'MID';
const GRPN = { GK: '골키퍼', DEF: '수비수', MID: '미드필더', ATT: '공격수' };

// ---------- 기본 정보 카드 ----------
U.pfInfoCard = function (s, pid, e, c, P) {
  const w = s.w, F = fcRow(pid);
  const nat = e ? e[5] : P && P.nat, pos = e ? e[1] : P && P.pos;
  const cells = [];
  if (e) cells.push([`${U.ageNow(w, pid, e[3])}세`, F ? (() => { const d = C.toDate(D2000() + F[9]); return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`; })() : '나이']);
  if (F) cells.push([F[6] === 'L' ? '왼발' : '오른발', `주로 사용하는 발 · 약발 ${'★'.repeat(F[7] || 1)}`]);
  if (nat) cells.push([h('span', { class: 'pfnat' }, flag(nat, 18), ' ', C.natName(nat)), '국가']);
  if (e) { const val = U.valueNow(s, pid, e, c); cells.push([C.fmtEUR(val), '이적 가치']); }
  if (e && c) cells.push([e[7] && w.clubs[e[7]] ? '임대 중' : `${w.year + Math.max(1, e[6])}. 6. 30.`, e[7] && w.clubs[e[7]] ? `원소속 ${w.clubs[e[7]].name}` : '계약 종료']);
  if (e) cells.push([String(e[2]), 'OVR']);
  // 포지션: FC27 대표 포지션 + 소화 가능한 포지션
  const main = F ? F[2] : pos ? (pos === 'CDM' ? 'DM' : pos === 'CAM' ? 'AM' : pos) : null;
  const others = F ? FAMK.filter((k, i) => (F[3] >> i) & 1 && k !== main) : [];
  const pitch = h('div', { class: 'pfpitch' }, U.svg('<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".8"><rect x="1" y="1" width="98" height="98" rx="3"/><line x1="1" y1="50" x2="99" y2="50"/><circle cx="50" cy="50" r="10"/><rect x="25" y="1" width="50" height="14"/><rect x="25" y="85" width="50" height="14"/></svg>'),
    ...[main].concat(others).filter(Boolean).map((k, i) => { const xy = PXY[k] || [50, 50]; return h('span', { class: 'pfpm' + (i ? ' alt' : ''), style: { left: xy[0] + '%', top: xy[1] + '%' } }, PSH[k] || k); }));
  if (e && c && C.mkt) { const bo = e[24] || (C.mkt && w.lg[c.lg] && w.lg[c.lg].nation === 'ESP' ? C.mkt.buyout(w, e, c) : 0); if (bo) cells.push([C.fmtEUR(bo * 1e4), '바이아웃 조항']); }
  const tags = [];
  if (e && C.mkt) {
    if (e[25] && w.clubs[e[25][0]]) tags.push(`셀온 ${e[25][1]}% (${w.clubs[e[25][0]].name})`);
    if (e[26] && w.clubs[e[26][0]]) tags.push(`바이백 ${C.fmtEUR(e[26][1] * 1e4)} (${w.clubs[e[26][0]].name})`);
    if (e[27] && e[7]) tags.push(`완전 이적 ${e[27][0] === 'b' ? '의무' : '옵션'} ${C.fmtEUR(e[27][1] * 1e4)}`);
    if (c && c.lg === 'ENG1') { const r = C.mkt.reg(w, c); if (e[3] <= 21) tags.push('EPL 명단: 21세 이하 (등록 불필요)'); else if (r && r.out.has(String(e[0]))) tags.push('EPL 25인 명단 제외 (리그 출전 불가)'); else tags.push(C.mkt.homegrown(e, 'ENG') ? 'EPL 홈그로운' : 'EPL 비홈그로운'); }
    if (e[31]) tags.push('출전 시간 불만');
    for (const t of C.mkt.traits(e)) tags.push('성격: ' + t);
  }
  if (C.legOf) for (const [cid, t] of C.legOf(w, pid)) if (w.clubs[cid]) tags.unshift(`${w.clubs[cid].name} ${C.LEGT[t]}`);
  { const M = C.mgrByPid && C.mgrByPid(w, pid); if (M) tags.unshift(M.pending ? `지도자 수업 중 (${M.pending}년 데뷔 예정)` : h('span', { class: 'chip lnk', onclick: () => U.openMgr(M.n) }, `지도자: ${M.club && w.clubs[M.club] ? w.clubs[M.club].name + ' 감독' : '무직 감독'} ›`)); }
  return h('div', { class: 'sec pfinfo' }, h('div', { class: 'pfig' }, ...cells.map(([v, l]) => h('div', null, h('b', null, v), h('small', { class: 'mute' }, l)))), tags.length ? h('div', { class: 'pftags' }, ...tags.map(t => typeof t !== 'string' ? t : h('span', { class: 'chip' + (/불만|제외/.test(t) ? ' red' : /레전드|아이콘|컬트/.test(t) ? ' gold' : '') }, t))) : null,
    h('div', { class: 'pfpos' }, h('div', null, h('div', { class: 'lbl' }, '포지션'), main ? h('div', null, h('small', { class: 'mute' }, '기본'), h('b', null, POSKO[main] || main)) : null, others.length ? h('div', null, h('small', { class: 'mute' }, '기타'), h('div', null, others.map(k => POSKO[k] || k).join(' · '))) : null), pitch));
};

// ---------- 이적 가치 ----------
// 이번 시즌 활약(평점·출전)을 반영한 현재 가치. 실제 서비스처럼 한 달에 한 번 갱신되는 값으로 본다 (매월 1일까지의 기록)
const livePerf = (s, pid) => { let apps = 0, rs = 0; for (const x of C.livePlayer ? C.livePlayer(s, String(pid)) : []) { if (String(x.key).startsWith('nt:')) continue; apps += x.a[1]; rs += x.a[8]; } return apps ? { rt: rs / 10 / apps, apps, of: 38 } : null; };
const natOfClubW = (w, cid) => { const k = w.clubs[cid]; return k ? ((w.lg[k.lg] || {}).nation || k.nat) : 'ENG'; };
U.valueNow = function (s, pid, e, c) {
  const w = s.w; if (!e) return 0; const loan = e[7] && w.clubs[e[7]];
  const lp = livePerf(s, pid), prev = e[11] ? { rt: (e[12] || 660) / 100, apps: e[11], of: 38 } : null;
  // 시즌 초반에는 지난 시즌 활약 비중이 크고, 경기가 쌓일수록 이번 시즌 활약으로 옮겨 간다
  const perf = lp && prev ? { rt: (lp.rt * lp.apps + prev.rt * Math.max(0, 12 - lp.apps)) / (lp.apps + Math.max(0, 12 - lp.apps)), apps: Math.max(lp.apps * 38 / Math.max(1, monthsIn(w) * 4), prev.apps * .6), of: 38 } : lp || prev;
  return C.aiFee(e[2], e[3] + monthsIn(w) / 12, natOfClubW(w, (loan || c || {}).id), Math.max(0, e[6]), .5, perf) * (C.vfOf ? C.vfOf(w, pid) : 1);
};
// 시즌 시작(8월)부터 지난 달 수
function monthsIn(w) { if (!w.cal) return 0; const [y, m] = C.ymd(w.cal.d); return Math.max(0, Math.min(10, (y - w.year) * 12 + m - 8)); }
// 구단 색 (어두운 배경에서 보이게 밝기 보정)
function clubCol(c) {
  if (!c) return '#5fa8ff';
  const L = U.lum || (() => .5), cand = [c.c1, c.c2].filter(x => typeof x === 'string' && /^#?[0-9a-f]{3,6}$/i.test(x.replace('#', '')));
  let col = cand.find(x => L(x) > .28 && L(x) < .93) || cand[0] || '#5fa8ff';
  if (L(col) <= .28) { const hx = col.replace('#', ''), v = (hx.length === 3 ? hx.split('').map(x => x + x) : hx.match(/../g)).map(x => parseInt(x, 16)); col = '#' + v.map(x => Math.round(x + (255 - x) * .45).toString(16).padStart(2, '0')).join(''); }
  if (L(col) >= .93) col = '#cfd6e0';
  return col.startsWith('#') ? col : '#' + col;
}
// ---------- 이적 가치 그래프 (월 단위) ----------
// 시즌 기록(시즌 끝 OVR·나이·평점·출전)을 바탕으로 매달 1일 값을 계산한다: 능력치는 시즌 동안 서서히, 활약은 경기가 쌓일수록 반영
// 구간마다 소속 구단 색으로 칠하고, 그래프를 누르거나 마우스를 올리면 그 달의 값이 보인다
U.pfValueChart = function (s, pid, e, c, P) {
  const w = s.w, F = fcRow(pid), hist = C.psHist(P);
  const seed = C.seeded ? (k => C.seeded('vh|' + pid + '|' + k)()) : (() => .5);
  const birth = F ? D2000() + F[9] : null;
  const ageAt = (t, fb) => birth != null ? (C.dayOf(Math.floor(t), 1, 1) + (t % 1) * 365.25 - birth) / 365.25 : fb;
  const rows = {}; for (const x of hist) { if (x[6] === '' || x[6] == null) continue; const y = x[0] < 1000 ? x[0] + 2000 : x[0]; (rows[y] = rows[y] || []).push(x); }
  const yrs = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const pts = []; let preV = null;
  // P.vpts: 이미 계산한 가치 점들 (월드 커리어 내 선수 등)
  if (P && P.vpts) pts.push(...P.vpts);
  else {
  const vf = C.vfOf ? C.vfOf(w, pid) : 1; // FC27+TFMKT 시장가치 보정
  const push = (t, ovr, age, cid, perf, ct) => { const n = .975 + seed(Math.round(t * 12)) * .05; pts.push({ x: t, v: Math.max(10000, Math.round(C.aiFee(ovr, age, natOfClubW(w, cid), ct, .5, perf) * vf * n / 10000) * 10000), cid }); };
  let o0 = F ? F[11] : null, a0 = null;
  const y0 = yrs.length ? yrs[0] : w.year;
  if (o0 == null && yrs.length) o0 = rows[yrs[0]][0][6];
  // 그 시점 소속 구단: 이동 기록(P.mv)이 있으면 날짜 기준으로 정확히
  const tOf = d => { const [yy, mm, dd] = C.ymd(d); return yy + (mm - 1) / 12 + (dd - 1) / 365; };
  const MV = P && P.c0 ? String(P.mv || '').split(';').filter(Boolean).map(x => { const [d, k, f, t] = x.split(','); return { t: tOf(+d), to: t, k }; }).sort((a, b) => a.t - b.t) : null;
  const clubAt = (t, fb) => { if (!MV) return fb; let cid = P.c0[0]; for (const m of MV) { if (m.t > t + 1e-6) break; if (m.to) cid = m.to; } return C.cidOf(w, cid) || cid || fb; };
  for (const y of yrs) {
    const R = rows[y], o1 = +R[R.length - 1][6], ageEnd = +R[R.length - 1][7];
    const apps = R.reduce((t, x) => t + (+x[2] || 0), 0), rs = R.reduce((t, x) => t + (+x[5] || 0) * (+x[2] || 0), 0), rt = apps ? rs / apps / 100 : 0;
    for (let k = 0; k <= 10; k++) {
      const t = y + (7 + k) / 12, f = k / 10, cid = clubAt(t, C.cidOf(w, (R.length > 1 && k >= 5 ? R[R.length - 1] : R[0])[1]));
      const ovr = (o0 != null ? o0 : o1) + (o1 - (o0 != null ? o0 : o1)) * f;
      push(t, ovr, ageAt(t, ageEnd - 1 + f), cid, apps ? { rt, apps: apps * f, of: 38 } : null, 3);
    }
    o0 = o1; a0 = ageEnd;
  }
  // 마지막 기록 다음 달부터 이번 달까지 (시즌이 끝난 여름이면 시즌 기록과 겹치지 않게)
  if (e) {
    const [cy, cm] = w.cal ? C.ymd(w.cal.d) : [w.year, 8], nowT = cy + (cm - 1) / 12;
    const lastT = pts.length ? pts[pts.length - 1].x : nowT - 1 / 12, lp = livePerf(s, pid), inSeason = !rows[w.year];
    const sT = w.year + 7 / 12, n = Math.max(1, Math.round((nowT - lastT) * 12));
    for (let k = 1; k <= n; k++) {
      const t = lastT + k / 12; if (t > nowT + 1e-6) break;
      const f = inSeason && nowT > sT ? Math.max(0, Math.min(1, (t - sT) / (nowT - sT))) : 0;
      const perf = inSeason && lp && t >= sT ? { rt: lp.rt, apps: lp.apps * f, of: 38 } : (e[11] ? { rt: (e[12] || 660) / 100, apps: e[11], of: 38 } : null);
      push(t, e[2], ageAt(t, e[3]), clubAt(t, c ? c.id : null), perf, Math.max(0, e[6]));
    }
    if (pts.length) { const L = pts[pts.length - 1]; L.v = U.valueNow(s, pid, e, c); L.now = 1; if (c) L.cid = c.id; }
  }
  // FC27+TFMKT: 게임 시작(2026년 8월) 이전은 실제 시장가치
  preV = s.ds === 'tm' && C.TM ? C.TM.preVal(pid) : null;
  if (preV && preV.length) { for (let i = pts.length - 1; i >= 0; i--) if (pts[i].x < 2026.55) pts.splice(i, 1); for (const p of preV) pts.push({ x: p.t, v: p.v, cid: p.cid, pre: 1 }); }
  }
  // 안전장치: 시간 순으로, 같은 달은 하나만
  pts.sort((p, q) => p.x - q.x); for (let i = pts.length - 1; i > 0; i--) if (Math.abs(pts[i].x - pts[i - 1].x) < 1 / 24) pts.splice(i - 1, 1);
  if (pts.length < 2) return null;
  const sm = typeof innerWidth !== 'undefined' && innerWidth < 600, W = sm ? 360 : 620, H = sm ? 200 : 210, pl = 52, pr = 14, pt = 18, pb = 26;
  const x0 = pts[0].x, x1 = Math.max(pts[pts.length - 1].x, x0 + .5), vmax = Math.max(...pts.map(p => p.v)) * 1.12 || 1;
  const X = x => pl + (x - x0) / (x1 - x0) * (W - pl - pr), Y = v => pt + (1 - v / vmax) * (H - pt - pb);
  const ticks = []; for (let k = 0; k <= 4; k++) ticks.push(vmax / 1.12 * k / 4);
  const yl = []; for (let y = Math.ceil(x0); y <= x1; y++) yl.push(y);
  const step = Math.max(1, Math.ceil(yl.length / (sm ? 5 : 9)));
  // 구단 구간
  const segs = []; for (const p of pts) { const L = segs[segs.length - 1]; if (L && L.cid === p.cid) L.p.push(p); else segs.push({ cid: p.cid, p: [p] }); }
  const NSs = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NSs, 'svg'); sv.setAttribute('viewBox', `0 0 ${W} ${H}`); sv.setAttribute('class', 'pfvc');
  let defs = '', body = '';
  segs.forEach((g, i) => {
    const col = clubCol(w.clubs[g.cid]), id = 'pfg' + String(pid).replace(/\W/g, '') + i;
    const P2 = (segs[i + 1] ? g.p.concat([segs[i + 1].p[0]]) : g.p);
    const line = P2.map((p, j) => `${j ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".32"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
    body += `<path d="${line} L${X(P2[P2.length - 1].x).toFixed(1)},${H - pb} L${X(P2[0].x).toFixed(1)},${H - pb} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  sv.innerHTML = `<defs>${defs}</defs>`
    + ticks.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.08)" stroke-dasharray="3 4"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#8b94a3">${v ? C.fmtEUR(v).replace('€', '') : '0'}</text>`).join('')
    + yl.filter((_, i) => i % step === 0).map(y => `<line x1="${X(y)}" x2="${X(y)}" y1="${pt}" y2="${H - pb}" stroke="rgba(255,255,255,.05)"/><text x="${X(y)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8b94a3">${y}</text>`).join('')
    + body + `<line class="pfvx" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="rgba(255,255,255,.35)" stroke-dasharray="2 3" style="display:none"/><circle class="pfvd" r="4.5" fill="#fff" stroke="#0b0f14" stroke-width="2" style="display:none"/>`;
  const tip = h('div', { class: 'pfvtip' });
  const wrap = h('div', { class: 'pfvw' }, sv, tip);
  // 이적한 지점에 엠블럼
  segs.forEach(g => { const p = g.p[0]; if (!g.cid) return; wrap.append(h('span', { class: 'pfvm', style: { left: (X(p.x) / W * 100) + '%', top: (Y(p.v) / H * 100) + '%' }, title: (w.clubs[g.cid] || {}).name || '' }, crest(w.clubs[g.cid] || null, 18))); });
  // 호버·터치: 가장 가까운 달
  const vx = sv.querySelector('.pfvx'), vd = sv.querySelector('.pfvd');
  const show = ev => {
    const r = sv.getBoundingClientRect(), cx = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width * W;
    let best = pts[0]; for (const p of pts) if (Math.abs(X(p.x) - cx) < Math.abs(X(best.x) - cx)) best = p;
    const bx = X(best.x), by = Y(best.v); vx.setAttribute('x1', bx); vx.setAttribute('x2', bx); vx.style.display = ''; vd.setAttribute('cx', bx); vd.setAttribute('cy', by); vd.style.display = '';
    const yy = Math.floor(best.x + 1e-6), mm = Math.round((best.x - yy) * 12) + 1, club = w.clubs[best.cid];
    vd.setAttribute('fill', clubCol(club));
    tip.replaceChildren(h('b', null, C.fmtEUR(best.v)), h('span', null, `${yy}. ${mm}.${best.now ? ' (현재)' : best.pre ? ' (실제)' : ''}`), club ? h('span', { class: 'pfvtc' }, crest(club, 14), club.name) : best.cid && C.TM ? h('span', { class: 'pfvtc' }, C.TM.teamName(w, best.cid)) : null);
    tip.style.display = 'grid'; const lx = bx / W * 100; tip.style.left = lx + '%'; tip.style.transform = `translate(${lx > 70 ? '-100%' : lx < 25 ? '0' : '-50%'}, 0)`; tip.style.top = Math.max(0, by / H * 100 - 34) + '%';
  };
  const hide = () => { vx.style.display = 'none'; vd.style.display = 'none'; tip.style.display = 'none'; };
  wrap.addEventListener('pointermove', show); wrap.addEventListener('pointerdown', show); wrap.addEventListener('pointerleave', hide);
  wrap.addEventListener('touchmove', ev => { show(ev); }, { passive: true });
  const now = pts[pts.length - 1], mx = pts.reduce((a, p) => p.v > a.v ? p : a, pts[0]);
  const mxY = Math.floor(mx.x + 1e-6), mxM = Math.round((mx.x - mxY) * 12) + 1;
  return h('div', { class: 'sec' }, h('div', { class: 'pfvh' }, h('b', null, `이적 가치: ${C.fmtEUR(now.v)}`), h('span', { class: 'mute' }, ` 최고: ${C.fmtEUR(mx.v)} (${mxY}. ${mxM}.)`)), wrap,
    h('div', { class: 'mute', style: { fontSize: '11px' } }, preV && preV.length ? '2026년 여름까지는 실제 시장가치, 그 뒤는 매달 1일 기준 추정 가치 (능력치·나이·출전과 평점·소속 리그·계약 반영) · 색은 그 시기 소속 구단' : '매달 1일 기준 추정 시장 가치 · 능력치·나이·출전과 평점·소속 리그·계약을 반영 · 색은 그 시기 소속 구단'));
};

// ---------- 시즌 경기 목록 (경기 기록 저장소에서) ----------
function pMatches(s, pid, label, clubs, nat) {
  const w = s.w, K = pid + '|' + label + (label === 'live' ? '|' + (w.cal ? w.cal.d : 0) : '');
  U._pm = U._pm || new Map(); if (U._pm.has(K)) return U._pm.get(K);
  const st = label === 'live' ? U.liveSt() : (U.mxCached(label) || U.withMx(label, () => U.stay()));
  if (!st) return null;
  const out = [], cs = new Set(clubs.filter(Boolean));
  const push = (o, d) => { if (!d || !d.ln) return; const side = d.ln[0].some(x => x.id === pid) ? 0 : d.ln[1].some(x => x.id === pid) ? 1 : -1; if (side < 0) return; o.side = side; o.me = d.ln[side].find(x => x.id === pid); o.d = d; out.push(o); };
  for (const lid in st.L || {}) { const L = st.L[lid]; if (!L || !L.s) continue; const lgN = (w.lg[lid] || {}).name || '리그';
    for (const r of MD.leagueRows(w, L)) { if (!cs.has(r.a) && !cs.has(r.b)) continue; const d = MD.leagueMatch(st, L, r.i);
      push({ ck: 'L', lid, comp: lgN, stage: `${r.r + 1}라운드`, dt: r.d, a: r.a, b: r.b, ga: r.ga, gb: r.gb, pw: null, title: `${lgN} ${L.sl || label} · ${r.r + 1}라운드${r.d != null ? ' · ' + C.fmtDateY(r.d) : ''}`, ctx: { st, lg: lid, L, i: r.i, date: r.d } }, d); } }
  const grpName = (grp, k) => grp === 'CUP' ? (() => { const [n2, kd] = String(k).split(':'); return kd === 'lcup' ? ((C.LCUPNAME || {})[n2] || `${C.natName(n2)} 리그컵`) : ((C.CUPNAME || {})[n2] || `${C.natName(n2)} 컵`); })() : ((C.COMPS && C.COMPS[k] && C.COMPS[k].name) || (C.TDEF && C.TDEF[k] && C.TDEF[k].name) || k);
  for (const grp of ['CUP', 'CONT', 'INTL']) for (const k in st[grp] || {}) for (const r of st[grp][k] || []) {
    const A = grp === 'INTL' ? r[1] : C.cidOf(w, r[1]), B = grp === 'INTL' ? r[2] : C.cidOf(w, r[2]);
    if (grp === 'INTL' ? (A !== nat && B !== nat) : (!cs.has(A) && !cs.has(B))) continue;
    if (!r[6]) continue;
    const ck = grp === 'CUP' ? (String(k).split(':')[1] === 'lcup' ? 'lcup:' : 'cup:') + String(k).split(':')[0] : grp === 'CONT' ? 'cont:' + k : 'nt:' + k;
    const nm = grpName(grp, k), pw = r[7] != null ? (grp === 'INTL' ? r[7] : C.cidOf(w, r[7])) : null;
    push({ ck, comp: nm, stage: r[0], dt: r[8], a: A, b: B, ga: r[3], gb: r[4], pw, nat: grp === 'INTL', title: `${nm} · ${r[0]}${r[8] != null ? ' · ' + C.fmtDateY(r[8]) : ''}`, ctx: { st, grp, key: k, stage: r[0], date: r[8] } }, MD.decode(st, r));
  }
  out.sort((x, y) => (y.dt || 0) - (x.dt || 0));
  U._pm.set(K, out); if (U._pm.size > 30) U._pm.delete(U._pm.keys().next().value);
  return out;
}
const openM = m => U.showMatch({ title: m.title, a: m.a, b: m.b, ga: m.ga, gb: m.gb, pw: m.pw, d: m.d, nat: m.nat, key: m.title + '|' + m.a + '|' + m.b, ctx: m.ctx });

// 한 경기에서 이 선수의 세부 기록
function msOf(s, m) { const posOf = U.posLookup ? U.posLookup(s) : null; return C.MS.gen({ a: m.a, b: m.b, ga: m.ga, gb: m.gb, d: m.d, key: m.title, posOf: posOf ? id => posOf(id) : null, nc: 1 }); }
// 경기 묶음 집계 (선수 한 명)
const SUMK = ['g', 'a', 'sh', 'sot', 'shOff', 'shBlk', 'shIn', 'kp', 'bigC', 'blk', 'sav', 'dive', 'savIn', 'faced', 'conc', 'concNO', 'y', 'r', 'xg', 'npxg', 'xgot', 'xa', 'xgotF', 'pass', 'passA', 'touch', 'boxT', 'lng', 'lngA', 'crs', 'crsA', 'fin3', 'lineBr', 'tkl', 'int', 'clr', 'rec', 'gdW', 'gdL', 'adW', 'adL', 'drb', 'drbF', 'foul', 'fouled', 'disp', 'offs', 'past', 'km', 'walk', 'jog', 'run', 'spr', 'sprN', 'def', 'claim', 'punch', 'sweep'];
function aggOf(s, pid, list) {
  const A = { min: 0, apps: 0, starts: 0, top: 0, hdr: 0, cs: 0, concOn: 0, xgaOn: 0, rts: 0, shots: [], heat: [], roles: {} };
  for (const k of SUMK) A[k] = 0;
  for (const m of list) {
    const M = msOf(s, m), p = M.P.get(pid); if (!p) continue;
    A.apps++; if (p.start) A.starts++; A.min += p.min; A.rts += p.rt; A.roles[p.role] = (A.roles[p.role] || 0) + p.min;
    for (const k of SUMK) A[k] += p.st[k] || 0;
    A.top = Math.max(A.top, p.st.top || 0);
    for (const x of M.shots) if (x.p === pid) { A.shots.push(Object.assign({ mt: m }, x)); if (x.type === '헤더') A.hdr++; }
    // 뛰는 동안 실점·상대 xG
    const conc = m.d.ev.filter(e => e.s !== p.s && 'gpo'.includes(e.k) && e.m >= p.on && (e.m <= p.off || p.off >= 90)).length;
    A.concOn += conc; if (!conc && p.min >= 60) A.cs++;
    A.xgaOn += M.shots.filter(x => x.s !== p.s && x.m >= p.on && (x.m <= p.off || p.off >= 90)).reduce((t, x) => t + x.xg, 0);
    if (A.heat.length < 9000) for (const q of U.heatPts(p, M)) A.heat.push(q);
  }
  A.role = Object.keys(A.roles).sort((a, b) => A.roles[b] - A.roles[a])[0] || 'CM';
  return A;
}
// 지표 정의: [구역, 이름, 값(합계 A), 90분당 환산 여부, 낮을수록 좋음, 형식]
const pc = (a, b) => b ? a / b * 100 : 0;
const MET = [
  ['슈팅', '득점', A => A.g, 1], ['슈팅', '예상 골 (xG)', A => A.xg, 1, 0, 2], ['슈팅', 'xG 유효 슈팅 (xGOT)', A => A.xgot, 1, 0, 2], ['슈팅', 'PK 제외한 xG', A => A.npxg, 1, 0, 2], ['슈팅', '슛', A => A.sh, 1], ['슈팅', '유효 슈팅', A => A.sot, 1], ['슈팅', '헤딩 슈팅', A => A.hdr, 1],
  ['신체 능력', '최고 속도', A => A.top, 0, 0, 'kmh'], ['신체 능력', '이동 거리', A => A.km, 1, 0, 'km'], ['신체 능력', '달리기', A => A.run, 1, 0, 'km'], ['신체 능력', '스프린트', A => A.spr, 1, 0, 'km'], ['신체 능력', '스프린트 수', A => A.sprN, 1],
  ['패스', '어시스트', A => A.a, 1], ['패스', '예상 어시스트 (xA)', A => A.xa, 1, 0, 2], ['패스', '성공한 패스', A => A.passA, 1], ['패스', '성공한 패스 %', A => pc(A.passA, A.pass), 0, 0, '%'], ['패스', '정확한 긴 패스', A => A.lngA, 1], ['패스', '정확한 긴 패스 %', A => pc(A.lngA, A.lng), 0, 0, '%'], ['패스', '라인을 뚫는 패스', A => A.lineBr, 1], ['패스', '기회 창출', A => A.kp, 1], ['패스', '큰 기회 만듦', A => A.bigC, 1], ['패스', '성공한 크로스', A => A.crsA, 1], ['패스', '성공한 크로스 %', A => pc(A.crsA, A.crs), 0, 0, '%'],
  ['점유율', '드리블 성공', A => A.drb, 1], ['점유율', '드리블 성공 %', A => pc(A.drb, A.drb + A.drbF), 0, 0, '%'], ['점유율', '볼 경합 성공', A => A.gdW + A.adW, 1], ['점유율', '볼 경합 성공 %', A => pc(A.gdW + A.adW, A.gdW + A.gdL + A.adW + A.adL), 0, 0, '%'], ['점유율', '공중 볼 경합 성공', A => A.adW, 1], ['점유율', '공중 볼 경합 성공 %', A => pc(A.adW, A.adW + A.adL), 0, 0, '%'], ['점유율', '터치', A => A.touch, 1], ['점유율', '상대편 박스 내에서의 터치', A => A.boxT, 1], ['점유율', '볼 뺏김', A => A.disp, 1, 1], ['점유율', '획득한 파울', A => A.fouled, 1],
  ['수비', '수비적 행동', A => A.def, 1], ['수비', '태클', A => A.tkl, 1], ['수비', '가로채기', A => A.int, 1], ['수비', '막힌 슛', A => A.blk, 1], ['수비', '반칙', A => A.foul, 1, 1], ['수비', '볼 회수', A => A.rec, 1], ['수비', '드리블 돌파 허용', A => A.past, 1, 1], ['수비', '걷어내기', A => A.clr, 1], ['수비', '클린 시트', A => A.cs, 0], ['수비', '출전 시 실점', A => A.concOn, 1, 1], ['수비', '출전 중 xG 실점', A => A.xgaOn, 1, 1, 2],
  ['반칙', '경고', A => A.y, 0, 1], ['반칙', '퇴장', A => A.r, 0, 1]
];
const MET_GK = [['골키핑', '선방', A => A.sav, 1], ['골키핑', '선방률', A => pc(A.sav, A.faced), 0, 0, '%'], ['골키핑', '실점', A => A.conc, 1, 1], ['골키핑', '득점 차단', A => A.xgotF - A.concNO, 1, 0, 2], ['골키핑', '다이빙 세이브', A => A.dive, 1], ['골키핑', '박스 내 세이브', A => A.savIn, 1], ['골키핑', '공중에서 잡기', A => A.claim, 1], ['골키핑', '클린 시트', A => A.cs, 0], ['패스', '정확한 긴 패스', A => A.lngA, 1], ['패스', '정확한 긴 패스 %', A => pc(A.lngA, A.lng), 0, 0, '%'], ['패스', '성공한 패스 %', A => pc(A.passA, A.pass), 0, 0, '%'], ['수비', '볼 회수', A => A.rec, 1], ['반칙', '경고', A => A.y, 0, 1]];
const val = (mt, A, p90) => { const v = mt[2](A); return p90 && mt[3] && A.min ? v * 90 / A.min : v; };
const fmtV = (mt, v) => mt[5] === 2 ? f2(v) : mt[5] === '%' ? f1(v) + '%' : mt[5] === 'km' ? f1(v) + 'km' : mt[5] === 'kmh' ? f1(v) + 'km/h' : (Math.abs(v - Math.round(v)) > 1e-6 ? f2(v) : String(Math.round(v)));
// 같은 대회(같은 시즌) 모든 선수의 집계: 순위 계산용
function peerPool(s, label, comp, st) {
  const w = s.w, K = label + '|' + comp + (label === 'live' ? '|' + (w.cal ? w.cal.d : 0) : '');
  U._peer = U._peer || new Map(); if (U._peer.has(K)) return U._peer.get(K);
  const posOf = U.posLookup ? U.posLookup(s) : null, by = new Map();
  const addM = (a, b, ga, gb, d, title) => {
    if (!d || !d.ln) return; const M = C.MS.gen({ a, b, ga, gb, d, key: title, posOf: posOf ? id => posOf(id) : null, nc: 1 });
    for (const p of M.P.values()) { if (p.id === 'ME' || String(p.id)[0] === '~') continue; let A = by.get(p.id); if (!A) { A = { min: 0, apps: 0, top: 0, hdr: 0, cs: 0, concOn: 0, xgaOn: 0, roles: {} }; for (const k of SUMK) A[k] = 0; by.set(p.id, A); }
      A.apps++; A.min += p.min; A.roles[p.role] = (A.roles[p.role] || 0) + p.min; for (const k of SUMK) A[k] += p.st[k] || 0; A.top = Math.max(A.top, p.st.top || 0);
      for (const x of M.shots) if (x.p === p.id && x.type === '헤더') A.hdr++;
      const conc = d.ev.filter(e => e.s !== p.s && 'gpo'.includes(e.k) && e.m >= p.on && (e.m <= p.off || p.off >= 90)).length; A.concOn += conc; if (!conc && p.min >= 60) A.cs++;
      A.xgaOn += M.shots.filter(x => x.s !== p.s && x.m >= p.on && (x.m <= p.off || p.off >= 90)).reduce((t, x) => t + x.xg, 0); }
  };
  if (comp.startsWith('L:')) { const lid = comp.slice(2), L = st.L[lid]; if (L) for (const r of MD.leagueRows(w, L)) addM(r.a, r.b, r.ga, r.gb, MD.leagueMatch(st, L, r.i), 'x'); }
  else { const [kind, k] = comp.split(':'); const grp = kind === 'cont' ? 'CONT' : kind === 'nt' ? 'INTL' : 'CUP', key = grp === 'CUP' ? `${k}:${kind}` : k; for (const r of (st[grp] || {})[key] || []) if (r[6]) addM(grp === 'INTL' ? r[1] : C.cidOf(w, r[1]), grp === 'INTL' ? r[2] : C.cidOf(w, r[2]), r[3], r[4], MD.decode(st, r), 'x'); }
  for (const A of by.values()) A.role = Object.keys(A.roles).sort((a, b) => A.roles[b] - A.roles[a])[0] || 'CM';
  U._peer.set(K, by); if (U._peer.size > 6) U._peer.delete(U._peer.keys().next().value);
  return by;
}
function pctl(pool, mt, A, p90, grp, pid) {
  if (!pool) return null;
  const maxMin = Math.max(...[...pool.values()].map(x => x.min)), need = Math.max(180, maxMin * .25);
  const vs = []; for (const [id, B] of pool) { if (id === pid || B.min < need || grpOf(B.role) !== grp) continue; vs.push(val(mt, B, p90 || mt[3])); }
  if (vs.length < 5) return null;
  const me = val(mt, A, p90 || mt[3]); let lo = 0, eq = 0; for (const v of vs) { if (v < me - 1e-9) lo++; else if (Math.abs(v - me) <= 1e-9) eq++; }
  let p = (lo + eq / 2) / vs.length; if (mt[4]) p = 1 - p; return p;
}

// ---------- 시즌 데이터 블록 ----------
U.pfSeason = function (s, pid, e, c, P, seasons) {
  const w = s.w, v = PST(); if (v.pid !== pid) { v.pid = pid; v.sl = null; v.comp = 'all'; v.pg = 0; v.p90 = 0; v.shf = {}; v.shot = null; v.team = 'all'; }
  const nat = e ? e[5] : P && P.nat;
  const usable = seasons.filter(sn => sn.live || (w.mxKeys || []).includes(sn.wl)).slice().reverse();
  if (!usable.length) return { main: [], side: [] };
  const sn = usable.find(x => (x.live ? 'live' : x.wl) === v.sl) || usable[0]; const label = sn.live ? 'live' : sn.wl; v.sl = label;
  const clubs = [...new Set(sn.items.map(it => it.club).filter(Boolean).concat(sn.live && c ? [c.id] : []))];
  const all = pMatches(s, pid, label, clubs, nat);
  const comps = []; for (const it of sn.items) { const k = it.key === 'L' ? 'L:' + (it.lid || (it.club && w.clubs[it.club] && w.clubs[it.club].lg) || '') : it.key; if (!comps.some(x => x[0] === k)) comps.push([k, it.name, it]); }
  if (all) for (const m of all) { const k = m.ck === 'L' ? 'L:' + m.lid : m.ck; if (!comps.some(x => x[0] === k)) comps.push([k, m.comp, null]); }
  if (!comps.some(x => x[0] === v.comp) && v.comp !== 'all') v.comp = 'all';
  const keyOfM = m => m.ck === 'L' ? 'L:' + m.lid : m.ck;
  const list = all ? all.filter(m => v.comp === 'all' || keyOfM(m) === v.comp) : null;
  const sel = (cur, opts, on) => { const el = h('select', { class: 'wsel', onchange: ev => on(ev.target.value) }, ...opts.map(([k, l]) => { const o = h('option', { value: k }, l); if (k === cur) o.selected = true; return o; })); return el; };
  const head = h('div', { class: 'pfsh' }, sel(label, usable.map(x => [x.live ? 'live' : x.wl, x.live ? x.label : x.label || x.wl]), x => { v.sl = x; v.comp = 'all'; v.pg = 0; v.shot = null; U.stay(); }),
    sel(v.comp, [['all', '모든 대회']].concat(comps.map(x => [x[0], x[1]])), x => { v.comp = x; v.pg = 0; v.shot = null; U.stay(); }));
  const main = [], side = [];
  if (!list) { main.push(h('div', { class: 'sec' }, head, h('div', { class: 'empty' }, '경기 기록 불러오는 중…'))); return { main, side }; }
  const A = aggOf(s, pid, list);
  // 요약 카드
  const yc = list.reduce((t, m) => t + m.d.ev.filter(x => x.p === pid && x.k === 'y').length, 0), rc = list.reduce((t, m) => t + m.d.ev.filter(x => x.p === pid && (x.k === 'r' || x.k === '2')).length, 0);
  const compName = v.comp === 'all' ? '모든 대회' : (comps.find(x => x[0] === v.comp) || [0, ''])[1];
  main.push(h('div', { class: 'sec pfsum' }, head, h('div', { class: 'pfsumt' }, h('b', null, `${compName} ${sn.live ? sn.label.replace(' 진행 중', '') : sn.label || sn.wl}`), sn.live ? h('span', { class: 'chip good' }, '진행 중') : null),
    h('div', { class: 'pfsg' }, ...[[A.g, '득점'], [A.a, '어시스트'], [A.starts, '선발'], [A.apps, '경기'], [A.min.toLocaleString(), '출전 시간'], [A.apps ? U.rt2(A.rts / A.apps) : '-', '평점'], [h('span', null, h('i', { class: 'cdy' }), ' ' + yc), '경고'], [h('span', null, h('i', { class: 'cdr' }), ' ' + rc), '퇴장']].map(([x, l]) => h('div', null, h('b', null, x), h('small', { class: 'mute' }, l))))));
  // 경기 통계 표
  const teamOpts = [['all', '모든 팀']].concat([...new Set(list.map(m => m.nat ? 'nat' : m.side ? m.b : m.a))].map(id => [id, id === 'nat' ? C.natName(nat) + ' 대표팀' : (w.clubs[id] || {}).name || id]));
  if (!teamOpts.some(x => x[0] === v.team)) v.team = 'all';
  const tl = list.filter(m => v.team === 'all' || (v.team === 'nat' ? m.nat : (m.side ? m.b : m.a) === v.team));
  const per = 10, pages = Math.max(1, Math.ceil(tl.length / per)); v.pg = Math.min(v.pg, pages - 1);
  const rowsM = tl.slice(v.pg * per, v.pg * per + per).map(m => {
    const opp = m.side ? m.a : m.b, gf = m.side ? m.gb : m.ga, ga = m.side ? m.ga : m.gb, res = gf > ga ? 'W' : gf < ga ? 'L' : m.pw ? (m.pw === (m.side ? m.b : m.a) ? 'W' : 'L') : 'D';
    const me = m.me, mn = me.start ? (me.off - me.on) : (me.off - me.on), ev = m.d.ev;
    const g = ev.filter(x => x.p === pid && (x.k === 'g' || x.k === 'p')).length, as = ev.filter(x => x.a === pid).length, y = ev.filter(x => x.p === pid && x.k === 'y').length, r = ev.filter(x => x.p === pid && (x.k === 'r' || x.k === '2')).length;
    const ps = (() => { const M = msOf(s, m), p = M.P.get(pid); return p ? (me.start ? PSH[p.pos] || p.pos : '교체') : ''; })();
    return h('tr', { class: 'click', onclick: () => openM(m) }, h('td', { class: 'mute' }, m.dt != null ? (() => { const [, mm, dd] = C.ymd(m.dt); return `${mm}월 ${dd}일`; })() : ''),
      h('td', { class: 'l' }, h('span', { class: 'pfop' }, m.nat ? U.natCrest(opp, 16) : crest(w.clubs[opp] || null, 16), h('span', null, m.nat ? C.natName(opp) : (w.clubs[opp] || {}).name || opp)), h('small', { class: 'mute pfcomp' }, m.comp)),
      h('td', null, h('span', { class: 'res ' + res, style: { padding: '1px 6px', borderRadius: '5px', whiteSpace: 'nowrap' } }, `${gf} - ${ga}${m.pw ? ' PK' : ''}`)), h('td', null, mn + "'"), h('td', { class: 'mute' }, ps), h('td', null, g || 0), h('td', null, as || 0), h('td', null, y || 0), h('td', null, r || 0), h('td', null, U.rt1(me.rt)));
  });
  main.push(h('div', { class: 'sec' }, h('div', { class: 'pfmh' }, h('h3', null, '경기 통계'), sel(v.team, teamOpts, x => { v.team = x; v.pg = 0; U.stay(); })),
    tl.length ? h('div', { class: 'in tscroll' }, h('table', { class: 'ltable pfmt' }, h('thead', null, h('tr', null, ...['날짜', '상대', '결과', '출전', '포지션', '골', '도움', '경고', '퇴장', '평점'].map((x, i) => h('th', { class: i === 1 ? 'l' : '' }, x)))), h('tbody', null, ...rowsM))) : h('div', { class: 'empty' }, '출전한 경기가 없습니다.'),
    pages > 1 ? h('div', { class: 'pfpg' }, h('button', { class: 'btn ghost sm', disabled: v.pg <= 0 ? true : null, onclick: () => { v.pg--; U.stay(); } }, '‹ 이전'), h('span', { class: 'mute' }, `${v.pg + 1} / ${pages}`), h('button', { class: 'btn ghost sm', disabled: v.pg >= pages - 1 ? true : null, onclick: () => { v.pg++; U.stay(); } }, '다음 ›')) : null));
  if (!A.apps) return { main, side };
  // 히트맵 + 슈팅 맵
  const hm = U.heatBox(A.heat);
  const SH = A.shots;
  const FL = [['goal', '득점', x => x.res === '골'], ['open', '일반 플레이', x => x.sit === '일반 플레이' || x.sit === '역습'], ['corner', '코너킥', x => x.sit === '코너킥'], ['set', '세트 피스', x => x.sit === '세트피스'], ['pen', '페널티킥', x => x.sit === '페널티킥'], ['head', '헤더', x => x.type === '헤더'], ['left', '왼발', x => x.type === '왼발'], ['right', '오른발', x => x.type === '오른발'], ['in', '박스 내 슛', x => x.inBox], ['out', '박스 밖 슛', x => !x.inBox]];
  // 필터는 묶음(결과·상황·슛 유형·위치)마다 하나씩 고르고, 묶음끼리는 함께 적용 (예: 득점 + 오른발 + 박스 밖)
  const FG = { goal: 'res', open: 'sit', corner: 'sit', set: 'sit', pen: 'sit', head: 'body', left: 'body', right: 'body', in: 'zone', out: 'zone' };
  if (!v.shf || typeof v.shf !== 'object') v.shf = {};
  const fOf = k => FL.find(f => f[0] === k)[2];
  const applyF = (list, skipG) => list.filter(x => Object.entries(v.shf).every(([g, k]) => g === skipG || !k || fOf(k)(x)));
  const shown = applyF(SH);
  const cur = v.shot != null && shown[v.shot] ? shown[v.shot] : shown.find(x => x.res === '골') || shown[0] || null;
  const NSs = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NSs, 'svg'); sv.setAttribute('viewBox', '-1 -1 70 46'); sv.setAttribute('class', 'pfshm');
  const Ls = 'stroke="rgba(255,255,255,.25)" stroke-width=".35" fill="none"';
  sv.innerHTML = `<rect x="0" y="0" width="68" height="44" ${Ls}/><rect x="13.84" y="0" width="40.32" height="16.5" ${Ls}/><rect x="24.84" y="0" width="18.32" height="5.5" ${Ls}/><rect x="30.34" y="-1" width="7.32" height="1" ${Ls}/><circle cx="34" cy="11" r=".4" fill="rgba(255,255,255,.3)"/><path d="M26.7 16.5 A9.15 9.15 0 0 0 41.3 16.5" ${Ls}/>`;
  shown.forEach((x, i) => { const cE = document.createElementNS(NSs, 'circle'); const gl = x.res === '골', on = x.res === '선방'; cE.setAttribute('cx', 34 + x.dy); cE.setAttribute('cy', Math.min(43, x.dx)); cE.setAttribute('r', 1 + Math.sqrt(x.xg) * 2.6); cE.setAttribute('fill', gl ? '#2fbf71' : on ? 'rgba(95,168,255,.45)' : 'transparent'); cE.setAttribute('stroke', gl ? '#fff' : x === cur ? '#fff' : '#5fa8ff'); cE.setAttribute('stroke-width', x === cur ? '.7' : '.35'); cE.setAttribute('class', 'shd'); cE.addEventListener('click', () => { v.shot = i; U.stay(); }); sv.append(cE); });
  const det = cur ? (() => { const mt = cur.mt, opp = mt.side ? mt.a : mt.b, gf = mt.side ? mt.gb : mt.ga, ga = mt.side ? mt.ga : mt.gb, dt = mt.dt != null ? (() => { const [, mm, dd] = C.ymd(mt.dt); return `${mm}월 ${dd}일`; })() : '';
    return h('div', { class: 'shdet' }, h('div', { class: 'shh' }, h('span', { class: 'mm' }, U.fmtMin(cur.m)), mt.nat ? U.natCrest(opp, 16) : crest(w.clubs[opp] || null, 16), h('span', null, `${mt.nat ? C.natName(opp) : (w.clubs[opp] || {}).name || opp}전 ${gf}-${ga}`), h('small', { class: 'mute' }, `${dt} · ${mt.comp}`)),
      h('div', { class: 'shg' }, ...[['슛 유형', cur.type], ['상황', cur.sit], ['결과', cur.res === '선방' ? '유효 슈팅' : cur.res], ['xG', f2(cur.xg)], ['xGOT', cur.xgot != null && (cur.res === '골' || cur.res === '선방') ? f2(cur.xgot) : '-']].map(([k, x]) => h('div', null, h('small', { class: 'mute' }, k), h('b', null, x))))); })() : null;
  const xgS = shown.reduce((t, x) => t + x.xg, 0);
  main.push(h('div', { class: 'sec' }, h('div', { class: 'pfmh' }, h('h3', null, `${compName} 히트맵${SH.length ? ' · 슈팅 맵' : ''}`)),
    h('div', { class: 'pfhs' + (SH.length ? '' : ' one') }, h('div', null, h('div', { class: 'lbl' }, `히트맵 · 터치 ${A.touch}`), hm),
      !SH.length ? null : h('div', null, h('div', { class: 'lbl' }, `시즌 슛 맵 · 유효 ${SH.length ? Math.round(SH.filter(x => x.res === '골' || x.res === '선방').length / SH.length * 100) : 0}%`), h('div', { class: 'pfshw' }, sv),
        h('div', { class: 'pfshs' }, h('div', null, h('b', null, shown.length), h('small', { class: 'mute' }, '슛')), h('div', null, h('b', null, shown.filter(x => x.res === '골').length), h('small', { class: 'mute' }, '득점')), h('div', null, h('b', null, f2(xgS)), h('small', { class: 'mute' }, 'xG'))))),
    SH.length ? h('div', { class: 'lbl', style: { marginTop: '8px' } }, '필터') : null, h('div', { class: 'pfchips' }, ...FL.map(([k, l, f], i) => { const g = FG[k], on = v.shf[g] === k, n = applyF(SH, g).filter(f).length; const sep = i && FG[FL[i - 1][0]] !== g ? h('span', { class: 'pfcsep' }) : null; return [sep, n || on ? h('button', { class: 'chip' + (on ? ' gold' : ''), onclick: () => { v.shf = Object.assign({}, v.shf, { [g]: on ? null : k }); v.shot = null; U.stay(); } }, `${l} ${n}`) : null]; }).flat(), Object.values(v.shf).some(Boolean) ? h('button', { class: 'chip', onclick: () => { v.shf = {}; v.shot = null; U.stay(); } }, '필터 해제') : null),
    det, cur ? h('button', { class: 'btn ghost sm', style: { marginTop: '6px' }, onclick: () => openM(cur.mt) }, '이 경기 상세 보기') : null));
  // 시즌 성적 (순위)
  const grp = grpOf(A.role);
  const lgComp = v.comp !== 'all' ? v.comp : (comps.find(x => x[0].startsWith('L:')) || [null])[0];
  const st = label === 'live' ? U.liveSt() : U.mxCached(label);
  const pool = lgComp && st ? peerPool(s, label, lgComp, st) : null;
  const mets = grp === 'GK' ? MET_GK : MET;
  const secs = []; for (const mt of mets) { let sec = secs.find(x => x.n === mt[0]); if (!sec) secs.push(sec = { n: mt[0], rows: [] }); sec.rows.push(mt); }
  const bar = p => p == null ? h('span', { class: 'pfbar' }) : h('span', { class: 'pfbar' }, h('i', { style: { width: Math.max(3, p * 100) + '%', background: p >= .66 ? 'var(--good)' : p >= .33 ? 'var(--warn)' : 'var(--bad)' } }));
  const lgN = lgComp ? (comps.find(x => x[0] === lgComp) || [0, ''])[1] : '';
  main.push(h('div', { class: 'sec' }, h('div', { class: 'pfmh' }, h('div', null, h('h3', { style: { margin: 0 } }, '시즌 성적'), h('small', { class: 'mute' }, `출전 시간: ${A.min.toLocaleString()}`)),
    h('div', { class: 'seg', style: { width: '170px' } }, h('button', { class: !v.p90 ? 'on' : '', onclick: () => { v.p90 = 0; U.stay(); } }, '합계'), h('button', { class: v.p90 ? 'on' : '', onclick: () => { v.p90 = 1; U.stay(); } }, '90분당'))),
    ...secs.map(sc => h('div', { class: 'pfss' }, h('div', { class: 'pfssh' }, h('b', null, sc.n), sc === secs[0] ? h('small', { class: 'mute' }, pool ? `순위: ${lgN} ${GRPN[grp]} 기준` : '순위') : null),
      ...sc.rows.map(mt => { const vv = val(mt, A, v.p90); return h('div', { class: 'pfsr' }, h('span', null, mt[1]), h('b', null, fmtV(mt, vv)), bar(pctl(pool, mt, A, v.p90, grp, pid))); }))),
    h('div', { class: 'mute', style: { fontSize: '11px' } }, '막대는 같은 대회·같은 포지션 그룹(출전 시간 25% 이상) 선수 중 순위입니다. 초록 상위 1/3 · 주황 중간 · 빨강 하위 1/3. 낮을수록 좋은 지표(볼 뺏김·반칙·실점 등)는 거꾸로 계산합니다.')));
  // 선수 특성 레이더 (오른쪽)
  const AX = grp === 'GK' ? [['선방', MET_GK[0]], ['선방률', MET_GK[1]], ['득점 차단', MET_GK[3]], ['공중에서 잡기', MET_GK[6]], ['긴 패스', MET_GK[8]], ['볼 회수', MET_GK[11]]]
    : [['터치', MET.find(m => m[1] === '터치')], ['기회 창출', MET.find(m => m[1] === '기회 창출')], ['공중 볼 경합 성공', MET.find(m => m[1] === '공중 볼 경합 성공')], ['수비적 행동', MET.find(m => m[1] === '수비적 행동')], ['득점', MET.find(m => m[1] === '득점')], ['슛 시도', MET.find(m => m[1] === '슛')]];
  if (pool) {
    const ps = AX.map(([l, mt]) => [l, pctl(pool, mt, A, 1, grp, pid)]);
    if (ps.every(x => x[1] != null)) {
      const R = 70, cx = 110, cy = 92, ang = i => -Math.PI / 2 + i * Math.PI * 2 / 6, pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
      const poly = r => [0, 1, 2, 3, 4, 5].map(i => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
      const shape = ps.map((x, i) => pt(i, Math.max(.06, x[1]) * R).map(n => n.toFixed(1)).join(',')).join(' ');
      const sv2 = U.svg(`<svg viewBox="-46 0 312 190" class="pfrad"><polygon points="${poly(R)}" fill="none" stroke="rgba(255,255,255,.14)"/><polygon points="${poly(R * .66)}" fill="none" stroke="rgba(255,255,255,.08)"/><polygon points="${poly(R * .33)}" fill="none" stroke="rgba(255,255,255,.08)"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="rgba(255,255,255,.08)"/>`).join('')}<polygon points="${shape}" fill="rgba(95,168,255,.45)" stroke="#5fa8ff" stroke-width="1.5"/>${ps.map((x, i) => { const [tx, ty] = pt(i, R + 16); return `<text x="${tx}" y="${ty}" text-anchor="${Math.abs(tx - cx) < 5 ? 'middle' : tx > cx ? 'start' : 'end'}" font-size="8.5" fill="#c9d1dc">${x[0]} <tspan font-weight="700" fill="#fff">${Math.round(x[1] * 100)}%</tspan></text>`; }).join('')}</svg>`);
      side.push(h('div', { class: 'sec' }, h('h3', null, '선수 특성'), h('div', { class: 'mute', style: { fontSize: '11.5px', padding: '0 18px' } }, `같은 대회 ${GRPN[grp]}와 비교한 90분당 순위 (${lgN})`), h('div', { class: 'in' }, sv2)));
    }
  }
  return { main, side, A, sn, compName };
};

// ---------- 경력 (오른쪽) ----------
U.pfCareer = function (s, pid, P, path, seasons) {
  const w = s.w, v = PST(); v.ct = v.ct || 'club';
  const yy = x => (x < 1000 ? x + 2000 : x);
  const tot = (cid, y0, y1, yth) => { let a = 0, g = 0; for (const sn of seasons) { const y = sn.live ? w.year - 2000 : sn.y; if (y < y0 || (y1 != null && y > y1)) continue; for (const it of sn.items) if (it.club === cid && it.cat !== 'nt' && (yth == null || !!it.youth === !!yth)) { a += it.apps || 0; g += it.g || 0; } } return [a, g]; }; // 유스 경기는 유스 경력에만
  const tnm = cid => (C.TM ? C.TM.teamName(w, cid) : (w.clubs[cid] || {}).name) || cid, tcr = (cid, sz) => crest(w.clubs[cid] || (C.TM && C.TM.teamParent(cid) ? w.clubs[C.TM.teamParent(cid)] : null) || null, sz);
  const sl = y => `${yy(y)}/${String(yy(y) + 1).slice(2)}`;
  // 유스 경력(x.youth)은 1군 경력과 따로 (v42)
  const yPath = path.filter(x => x.youth); path = path.filter(x => !x.youth);
  const yRows = yPath.slice().reverse().map(x => [x, tot(x.cid, x.y0, x.y1, x.b2 ? null : 1)]).filter(([x, [a]]) => a > 0 || x.ylab === '유스' || x.y1 == null).map(([x, [a, g]]) => { return h('div', { class: 'pfcr' }, tcr(x.cid, 22), h('div', null, h('b', { class: w.clubs[x.cid] ? 'lnk' : '', onclick: () => { if (w.clubs[x.cid]) U.openClub(x.cid); } }, tnm(x.cid)), x.ylab ? h('span', { class: 'segtag' }, x.ylab) : null, h('small', { class: 'mute' }, `${sl(x.y0)} – ${x.y1 == null ? '지금' : sl(x.y1)}`)), h('span', null, a), h('span', null, g)); });
  const rows = path.map((x, i) => {
    const pv = path[i - 1], nx = path[i + 1], pp = path[i - 2];
    // 겨울 이동은 배지 없이 기간 글자에만 'nn/nn 겨울'. 배지는 임대·임대 복귀·임대 후 완전 이적만
    const ws = x.mv ? x.w0 : pv && pv.y1 === x.y0, we = x.mv ? x.w1 : nx && x.y1 != null && nx.y0 === x.y1;
    const a0 = sl(x.y0) + (ws ? ' 겨울' : ''), a1 = x.y1 == null ? '지금' : sl(x.y1) + (we ? ' 겨울' : '');
    const tag = x.mv ? (x.tag || (x.loan ? '임대' : null)) : x.loan ? '임대' : pv && pv.loan && !x.loan && pp && pp.cid === x.cid ? '임대 복귀' : null;
    const [a, g] = tot(x.cid, x.y0, x.y1, 0);
    return h('div', { class: 'pfcr' + (x.loan ? ' loan' : '') }, tcr(x.cid, 22), h('div', null, h('b', { class: w.clubs[x.cid] ? 'lnk' : '', onclick: () => { if (w.clubs[x.cid]) U.openClub(x.cid); } }, tnm(x.cid)), tag ? h('span', { class: 'segtag' + (/임대/.test(tag) ? ' loan' : '') }, tag) : null, h('small', { class: 'mute' }, a0 === a1 ? a0 : `${a0} – ${a1}`)), h('span', null, a), h('span', null, g)); }).reverse();
  // 국가대표
  const ntA = seasons.reduce((t, sn) => t + sn.items.filter(it => it.cat === 'nt').reduce((q, it) => q + it.apps, 0), 0), ntG = seasons.reduce((t, sn) => t + sn.items.filter(it => it.cat === 'nt').reduce((q, it) => q + it.g, 0), 0);
  const nat = (P && P.nat) || (C.TM && C.TM.legP(pid) || [])[1];
  const caps = s.ds === 'tm' && C.TM ? C.TM.caps(pid) : null; // 게임 이전 A매치 (Transfermarkt)
  // 시즌별: 한 시즌에 두 구단이면 구단마다 한 줄 (나중 구단이 위)
  const pIdx = (cid, y) => { for (let i = path.length - 1; i >= 0; i--) { const x = path[i]; if (x.cid === cid && x.y0 <= y && (x.y1 == null || x.y1 >= y)) return i; } return -1; };
  const sRows = [];
  for (const sn of seasons.slice().reverse()) {
    const its = sn.items.filter(it => it.club && it.cat !== 'nt'); if (!its.length) continue;
    const y = sn.live ? w.year - 2000 : sn.y, by = new Map();
    for (const it of its) { const key = it.youth ? it.club + '|Y' : it.club; const k = by.get(key) || { a: 0, g: 0, as: 0, rs: 0, ra: 0, loan: 0, cid: it.club, yth: it.youth ? (it.ylab || '유스') : '' }; k.a += it.apps || 0; k.g += it.g || 0; k.as += it.a || 0; if (it.rt != null && it.apps) { k.rs += it.rt * it.apps; k.ra += it.apps; } if (it.nd) k.nd = 1; if (it.loan) k.loan = 1; by.set(key, k); }
    const cl = [...by.keys()].sort((p, q) => (by.get(p).yth ? 1 : 0) - (by.get(q).yth ? 1 : 0) || pIdx(by.get(q).cid, y) - pIdx(by.get(p).cid, y));
    for (const key of cl) { const k = by.get(key), id = k.cid, pi = pIdx(id, y), ln = k.loan || (pi >= 0 && path[pi].loan);
      const dz = v => k.nd && !k.a ? '-' : v;
      sRows.push(h('div', { class: 'pfcr s4' + (ln ? ' loan' : '') }, tcr(id, 20), h('div', null, h('b', { class: w.clubs[id] ? 'lnk' : '', onclick: () => { if (w.clubs[id]) U.openClub(id); } }, tnm(id)), ln ? h('span', { class: 'segtag loan' }, '임대') : null, k.yth ? h('span', { class: 'segtag' }, k.yth) : null, h('small', { class: 'mute' }, sn.live ? sn.label : sn.pre ? sn.label : sn.wl)), h('span', null, dz(k.a)), h('span', null, dz(k.g)), h('span', null, dz(k.as)), h('span', null, k.ra ? U.rt2(k.rs / k.ra) : '-'))); }
  }
  // 시즌별 차트용: 클럽 경기 합계 (오래된 순)
  const chL = []; for (const sn of seasons) { const its = sn.items.filter(it => it.club && it.cat !== 'nt' && !it.nd && !it.youth); if (!its.length) continue; const y = sn.live ? w.year - 2000 : sn.y; const a = its.reduce((q, it) => q + (it.apps || 0), 0), rated = its.filter(it => it.rt != null), ra = rated.reduce((q, it) => q + it.apps, 0), rs = rated.reduce((q, it) => q + it.rt * it.apps, 0);
    chL.push({ y, lb: sl(y), apps: a, g: its.reduce((q, it) => q + (it.g || 0), 0), a: its.reduce((q, it) => q + (it.a || 0), 0), rt: ra ? (rs > 100 * ra ? rs / ra / 100 : rs / ra) : null }); }
  chL.sort((p, q) => p.y - q.y);
  const chart = v.ct !== 'club' && U.chPlayerSeasons ? U.chPlayerSeasons(chL) : null;
  return h('div', { class: 'sec pfcar' }, h('h3', null, '경력'), h('div', { class: 'in' }, h('div', { class: 'mtabs pft' }, h('button', { class: v.ct === 'club' ? 'on' : '', onclick: () => { v.ct = 'club'; U.stay(); } }, '클럽'), h('button', { class: v.ct === 'season' ? 'on' : '', onclick: () => { v.ct = 'season'; U.stay(); } }, '시즌')),
    chart,
    v.ct === 'club' ? h('div', { class: 'pfcrh mute' }, h('span', null, '1군 경력'), h('span', null, '경기'), h('span', null, '득점')) : h('div', { class: 'pfcrh s4 mute' }, h('span', null, '시즌별 (클럽 경기)'), h('span', null, '경기'), h('span', null, '골'), h('span', null, '도움'), h('span', null, '평점')),
    ...(v.ct === 'club' ? rows : sRows),
    v.ct === 'club' && yRows.length ? [h('div', { class: 'pfcrh mute' }, h('span', null, yPath.some(x => x.b2) ? '유스·2군 경력' : '유스 경력'), h('span', null, '경기'), h('span', null, '득점')), ...yRows] : null,
    v.ct === 'club' && nat && (ntA || caps) ? [h('div', { class: 'pfcrh mute' }, h('span', null, '국가대표 팀'), h('span'), h('span')), h('div', { class: 'pfcr' }, U.natCrest(nat, 22), h('div', null, h('b', { class: 'lnk', onclick: () => U.openNat(nat) }, C.natName(nat)), h('small', { class: 'mute' }, caps ? `게임 이전 A매치 ${caps[0]}경기 ${caps[1]}골 포함 · 이후 국제 대회 본선` : '국제 대회 본선·A매치')), h('span', null, ntA + (caps ? caps[0] : 0)), h('span', null, ntG + (caps ? caps[1] : 0)))] : null));
};


// ---------- 부상 이력 ----------
U.pfInjuries = function (s, pid, e, c, P) {
  const w = s.w, L = String((P && P.inj) || '').split(';').filter(Boolean).map(x => { const [d, n, t, cid] = x.split(','); return { d: +d, n: +n, t: (C.INJT || [])[+t] || '부상', cid }; });
  // FC27+TFMKT: 게임 이전 부상 (2026년 6월까지)
  const pre = s.ds === 'tm' && C.TM ? C.TM.preInj(pid) : null; if (pre) for (const x of pre) L.push({ d: x.d, n: x.n, t: (C.INJT || [])[x.t] || '부상', cid: x.cid, pre: 1 });
  L.sort((a, b) => b.d - a.d);
  const now = w.cal ? w.cal.d : 0;
  if (!L.length) return h('div', { class: 'sec' }, h('h3', null, '부상 이력'), h('div', { class: 'empty' }, pre ? '기록된 부상이 없습니다.' : '게임 시작 이후 부상 기록이 없습니다.'));
  const tot = L.reduce((a, x) => a + x.n, 0);
  return h('div', { class: 'sec' }, h('h3', null, '부상 이력', h('span', { class: 'mute', style: { fontSize: '12px', fontWeight: 400 } }, ` ${L.length}회 · 결장 ${tot}일`)),
    h('div', { class: 'in pfinj' }, ...L.map(x => { const cur = x.d + x.n > now; return h('div', { class: 'pfij' + (cur ? ' cur' : '') },
      h('div', { class: 'pfijt' }, h('b', null, x.t), cur ? h('span', { class: 'injb' }, '치료 중') : null), h('span', { class: 'pfijd' }, `${x.n}일`),
      h('small', { class: 'mute' }, crest(w.clubs[x.cid] || null, 13), ` ${(C.TM ? C.TM.teamName(w, x.cid) : (w.clubs[x.cid] || {}).name) || ''} · ${C.fmtDateY(x.d)} ~ ${C.fmtDateY(x.d + x.n)}`)); })))
};
// ---------- 트로피 (오른쪽) ----------
U.pfTrophies = function (s, pid, P, seasons) {
  const w = s.w, by = new Map(), add = (key, crestEl, title, sub, name, sl) => { let g = by.get(key); if (!g) by.set(key, g = { crestEl, title, sub, list: new Map() }); const t = g.list.get(name) || { n: name, ys: [] }; t.ys.push(sl); g.list.set(name, t); };
  for (const sn of seasons) { if (sn.live) continue; const A = w.arch && w.arch[sn.wl]; if (!A) continue;
    for (const it of sn.items) { if (!it.apps) continue;
      if (it.cat === 'league' && it.lid && A.lg[it.lid] && A.lg[it.lid].t && A.lg[it.lid].t[0] && A.lg[it.lid].t[0][0] === it.club && it.apps >= C.lgMinApps(A.lg[it.lid].t[0][1])) add(it.club, crest(w.clubs[it.club] || null, 22), (w.clubs[it.club] || {}).name, C.natName((w.lg[it.lid] || {}).nation), A.lg[it.lid].n, A.lg[it.lid].sl || sn.wl);
      if (it.cat === 'cup') { const [kd, n2] = it.key.split(':'); const X = (kd === 'lcup' ? A.lcup : A.cup)[n2]; if (X && X.w === it.club) add(it.club, crest(w.clubs[it.club] || null, 22), (w.clubs[it.club] || {}).name, C.natName(n2), X.n, X.sl || sn.wl); }
      if (it.cat === 'cont') { const k = it.key.split(':')[1], X = A.cont[k]; if (X && X.w === it.club) add(it.club, crest(w.clubs[it.club] || null, 22), (w.clubs[it.club] || {}).name, '', X.n, X.sl || sn.wl); }
      if (it.cat === 'nt' && P && P.nat) { const k = it.key.split(':')[1], H = (w.hist.nt || {})[k] || [], yv = sn.y + 2000, hit = H.find(x => x.c === P.nat && Math.abs(parseInt(x.y, 10) - yv) <= 1); if (hit) add('nat', U.natCrest(P.nat, 22), C.natName(P.nat), '국가대표', (C.TDEF && C.TDEF[k] && C.TDEF[k].name) || it.name, String(hit.y)); }
    } }
  // FC27+TFMKT: 게임 이전 우승 (1부 리그 우승 2024/25까지 + 2025/26 리그·국내 컵·대륙 대회)
  const pre = s.ds === 'tm' && C.TM ? C.TM.preTrophies(w, pid) : null;
  if (pre) for (const t of pre) { const k = w.clubs[t.cid] || {}, nat = (w.lg[k.lg] || {}).nation || k.nat; add(t.cid, crest(w.clubs[t.cid] || null, 22), k.name, C.natName(nat), t.name, C.calType && C.calType(nat) === 'cy' ? String(t.y) : C.wLabel(t.y)); }
  if (!by.size) return null;
  return h('div', { class: 'sec' }, h('h3', null, '트로피'), h('div', { class: 'in pftr' }, ...[...by.values()].map(g => h('div', { class: 'pftg' }, h('div', { class: 'pftgh' }, g.crestEl, h('div', null, h('b', null, g.title), g.sub ? h('small', { class: 'mute' }, g.sub) : null)),
    ...[...g.list.values()].map(t => h('div', { class: 'pftr1' + ([...new Set(t.ys)].length > 3 ? ' lng' : '') }, h('b', null, [...new Set(t.ys)].length), U.trophy ? U.trophy('cup', 14, '#f2c14e') : '🏆', h('span', null, t.n), h('small', { class: 'mute' }, `(${[...new Set(t.ys)].join(', ')})`)))))));
};

// ---------- 소개 ----------
// 플레이 스타일: FC27 세부 능력치에서 포지션 대비 두드러진 장점 2~3개
const STY = [['pace', 0, '폭발적인 스피드'], ['drib', 14, '드리블 돌파'], ['fin', 2, '골 결정력'], ['longSh', 4, '중거리 슛'], ['vision', 8, '넓은 시야'], ['shortPass', 11, '정확한 패스'], ['cross', 9, '날카로운 크로스'], ['head', 23, '공중볼 장악력'], ['stand', 22, '태클'], ['intc', 20, '가로채기'], ['str', 26, '몸싸움'], ['stam', 25, '지치지 않는 활동량'], ['ctrl', 15, '볼 컨트롤'], ['fk', 6, '프리킥'], ['gkRef', 32, '반사 신경'], ['gkDiv', 28, '다이빙 선방']];
const STYPOS = { GK: ['gkRef', 'gkDiv'], CB: ['stand', 'intc', 'head', 'str', 'pace'], FB: ['pace', 'cross', 'stam', 'stand', 'drib'], DM: ['intc', 'stand', 'shortPass', 'stam', 'str'], CM: ['shortPass', 'vision', 'stam', 'longSh', 'ctrl'], AM: ['vision', 'drib', 'shortPass', 'longSh', 'fk', 'ctrl'], W: ['pace', 'drib', 'cross', 'fin', 'ctrl'], ST: ['fin', 'head', 'pace', 'str', 'ctrl', 'longSh'] };
const ROLEK = p => ({ GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', DM: 'DM', CDM: 'DM', CM: 'CM', AM: 'AM', CAM: 'AM', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST' }[p] || 'CM');
function styleOf(F, pos) {
  if (!F || !F[13]) return [];
  const st = F[13], v = i => (st.charCodeAt(i) || 92) - 32, keys = STYPOS[ROLEK(pos)] || [];
  return STY.filter(x => keys.includes(x[0])).map(x => [x[2], v(x[1])]).filter(x => x[1] >= 78).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
}
const joinK = a => a.length <= 1 ? (a[0] || '') : C.jo(a.slice(0, -1).join(', '), '과', '와') + ' ' + a[a.length - 1];
// ---------- 소개 (서술형) ----------
U.pfAbout = function (s, pid, e, c, P, blk) {
  const w = s.w, F = fcRow(pid), name = e ? C.pName(w, e) : P ? P.n : '';
  const pos = e ? e[1] : P && P.pos, nat = e ? e[5] : P && P.nat, age = e ? (U.ageNow ? U.ageNow(w, pid, e[3]) : e[3]) : null;
  const seasons = U.playerSeasons ? U.playerSeasons(w, P, C.livePlayer ? C.livePlayer(s, String(pid)) : null) : [];
  const club = (id) => (w.clubs[id] || {}).name || '';
  const paras = [];
  // 1) 누구인가 · 스타일
  const sty = styleOf(F, pos), foot = F ? (F[7] >= 4 ? '양발을 고루 쓰는' : F[6] === 'L' ? '왼발잡이' : '오른발잡이') : '';
  // 이름이 한글이 아니면 조사가 어색해지므로 주어를 빼고 쓴다 (이름은 위 머리글에 있다)
  const ko = /[가-힣]$/.test(String(name).trim());
  let p1 = `${ko ? C.jo(name, '은', '는') + ' ' : ''}${age ? age + '세 ' : ''}${C.natName(nat)} 출신 ${POSKO[pos] || pos || '선수'}${c ? `로, 지금 ${c.name}에서 뛰고 있다` : P && P.ret ? `였고 ${P.ret}년에 축구화를 벗었다` : '이고 지금은 소속팀이 없다'}.`;
  if (sty.length) p1 += ` ${foot ? foot + ' ' : ''}${ROLEK(pos) === 'GK' ? '골키퍼' : '선수'}로 ${C.jo(joinK(sty), '이', '가')} 가장 큰 무기다.`;
  else if (foot) p1 += ` ${foot}다.`;
  paras.push(p1);
  // 2) 경력 이야기: 거쳐 간 구단, 큰 이적, 커리어 최고 시즌
  const path = P && P.c0 && U.stintPath ? U.stintPath(w, P, c, e) || [] : [];
  const clubsU = [...new Set(path.filter(x => !x.loan).map(x => x.cid))];
  const mv = String((P && P.mv) || '').split(';').filter(Boolean).map(x => { const [d, k, f, t, fee] = x.split(','); return { d: +d, k, f, t, fee: +fee || 0 }; });
  const bigM = mv.filter(m => m.k === 'buy' && m.fee > 0).sort((a, b) => b.fee - a.fee)[0];
  const loans = mv.filter(m => m.k === 'loan').length;
  let tot = { a: 0, g: 0, as: 0 }; for (const sn of seasons) for (const it of sn.items) if (it.cat !== 'nt') { tot.a += it.apps || 0; tot.g += it.g || 0; tot.as += it.a || 0; }
  const lgS = seasons.filter(sn => !sn.live).map(sn => ({ sn, it: sn.items.find(it => it.cat === 'league' && it.apps >= 12) })).filter(x => x.it);
  const best = lgS.slice().sort((p, q) => (ROLEK(pos) === 'GK' || ROLEK(pos) === 'CB' ? (q.it.rt - p.it.rt) : (q.it.g + q.it.a * .6 + (q.it.rt - 6.8) * 6) - (p.it.g + p.it.a * .6 + (p.it.rt - 6.8) * 6)))[0];
  const p2 = [];
  if (clubsU.length >= 2) p2.push(`${clubsU.length}개 구단을 거쳤고${loans ? ` 임대도 ${loans}번 다녀왔다` : ''}.`.replace('거쳤고.', '거쳤다.'));
  else if (clubsU.length === 1 && path.length && seasons.filter(sn => !sn.live).length >= 4) p2.push(`${club(clubsU[0])}에서만 뛰어 온 원클럽맨이다.`);
  if (bigM) { const [yy, mm] = C.ymd(bigM.d); p2.push(`가장 큰 이적은 ${yy}년 ${mm}월 ${club(bigM.f) || '이전 구단'}에서 ${C.jo(club(bigM.t), '으로', '로')} 옮길 때로, 이적료는 ${C.jo(C.fmtEUR(bigM.fee * 1e4), '이었다', '였다')}.`); }
  if (best) { const it = best.it, bl = `${best.sn.wl}${club(it.club) ? ' ' + club(it.club) + ' 시절' : ''}`; p2.push(ROLEK(pos) === 'GK' ? `커리어 최고 시즌은 ${bl}로, 리그 ${it.apps}경기에서 평균 평점 ${it.rt.toFixed(2)}${it.cs ? `, 클린시트 ${it.cs}회` : ''}를 기록했다.` : `커리어 최고 시즌은 ${bl}로, 리그 ${it.apps}경기 ${it.g}골 ${it.a}도움(평균 평점 ${it.rt.toFixed(2)})을 남겼다.`); }
  if (tot.a >= 30) p2.push(`게임 기록 기준 클럽 통산 ${tot.a}경기 ${tot.g}골 ${tot.as}도움.`);
  if (p2.length) paras.push(p2.join(' '));
  // 3) 수상·우승
  const ev = C.hofEval && P ? (() => { try { return C.hofEval(s, String(pid), P); } catch (er) { return null; } })() : null;
  const p3 = [];
  const pre = C.HOFPRE && C.HOFPRE[String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim()];
  if (pre && pre[4]) p3.push(`${pre[4]}로 이름을 알렸다.`);
  if (ev) {
    const aw = ev.aw, tr = ev.tr, cnt = k => tr.filter(t => t.kind === k).length;
    if (aw.bd.length) p3.push(`발롱도르를 ${aw.bd.length}번(${aw.bd.join(', ')}) 받았다.`); else if (aw.bd3.length) p3.push(`발롱도르 투표에서 ${aw.bd3.length}번 3위 안에 들었다.`);
    if (aw.gs.length) p3.push(`유러피언 골든슈 ${aw.gs.length}회.`); if (aw.gb.length) p3.push(`골든보이 수상자다.`); if (aw.xi) p3.push(`월드 베스트 XI에 ${aw.xi}번 뽑혔다.`);
    const tl = [['ucl', '챔피언스리그'], ['wc', '월드컵'], ['lg', '리그'], ['cont', '대륙 대회'], ['nt', '대륙 국가대항전'], ['cup', '국내 컵']].filter(([k]) => cnt(k)).map(([k, l]) => `${l} ${cnt(k)}회`);
    if (tl.length) p3.push(`우승 경력은 ${tl.join(', ')}.`);
  }
  if (P && P.ret && (w.hof || []).some(x => x.pid === String(pid))) p3.push('명예의 전당에 헌액됐다.');
  if (p3.length) paras.push(p3.join(' '));
  // 4) 이번 시즌 · 대표팀
  const p4 = [];
  if (blk && blk.A && blk.A.apps) { const A = blk.A, rt = A.rts / A.apps; p4.push(`${blk.sn.live ? '이번' : blk.sn.label} 시즌 ${blk.compName}에서는 ${A.apps}경기 ${A.g}골 ${A.a}도움, 평균 평점 ${rt.toFixed(2)}${rt >= 7.3 ? '로 팀에서 손꼽히는 활약을 하고 있다' : rt >= 6.9 ? '로 제 몫을 하고 있다' : rt < 6.5 ? '로 기대에 못 미치고 있다' : '를 기록 중이다'}.`); }
  const nt = seasons.reduce((t, sn) => { for (const it of sn.items) if (it.cat === 'nt') { t[0] += it.apps; t[1] += it.g; } return t; }, [0, 0]);
  if (nt[0]) p4.push(`${C.natName(nat)} 대표팀에서는 국제 대회 본선 ${nt[0]}경기 ${nt[1]}골을 기록했다.`);
  if (p4.length) paras.push(p4.join(' '));
  return h('div', { class: 'sec pfab' }, h('h3', null, '소개'), h('div', { class: 'in' }, ...paras.map(t => h('p', null, t))));
};
})(typeof window !== 'undefined' ? window : globalThis);
