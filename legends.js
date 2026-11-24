// Road to Legend — 구단 레전드
// '이 구단 팬들이 누구를 레전드로 대하나'. 같은 기록이라도 구단마다 무게가 다르다:
//   하부·소규모 구단은 6~7년 꾸준히 뛴 선수, 승격·우승을 이끈 주역(2~3년)도 레전드로 기억하고,
//   빅클럽은 우승이 흔하고 스타가 많아 훨씬 오래, 훨씬 많이 해내야 한다.
// 점수 = 시즌(15경기 이상 1, 5~14경기 0.4) + 출전/100 + 골/40 + 도움/80 + 평점 보정 + 우승·승격(주전으로 뛴 시즌, 작은 구단일수록 무게 큼) + 원클럽맨
// 문턱 = 5 + 구단 위상(세계 구단 랭킹 종합 지수) × 0.1  (작은 구단 ≈ 6~7, 중견 ≈ 10, 빅클럽 ≈ 13~14)
// 빅클럽일수록 '오래 있었다'보다 '얼마나 잘했나'(기량·우승)가 중요: 시즌 가중치는 낮추고 기량(OVR) 보너스를 준다
// 등급: 컬트 히어로(문턱의 72% + 특별한 공헌) · 레전드(문턱 이상) · 아이콘(문턱의 1.7배)
(function (G) {
'use strict';
const C = G.TC, { clamp } = C;
const TIER = ['', '컬트 히어로', '레전드', '아이콘'];
C.LEGT = TIER;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// 시작 시점 현역의 게임 이전 기록 (이름으로 그 구단 스쿼드에서 찾는다)
C.legSeed = function (w) {
  const A = (G.FC27 && G.FC27.LEG_ACT) || {}; w.legPre = {};
  for (const cid in A) { const c = w.clubs[cid]; if (!c || !c.sq) continue;
    for (const [nm, y0, apps, g, tp] of A[cid]) { const k = norm(nm); const e = c.sq.find(x => norm(C.pName ? C.pName(w, x) : x[0]).includes(k)); if (!e) continue;
      (w.legPre[cid] = w.legPre[cid] || {})[String(e[0])] = [y0, apps, g, tp, e[2]]; } }
  return w.legPre;
};
const yOfLabel = y => { const m = /^(\d{4})/.exec(String(y)); return m ? +m[1] - 2000 : null; };
// 구단 우승·승격 (게임 속): cid → [[yOff, 종류]]
function trophyMap(w) {
  const T = {}, add = (id, y, k) => { if (!id || y == null) return; (T[id] = T[id] || []).push([y, k]); }, H = w.hist || {};
  for (const lid in H.lg || {}) { const L = w.lg[lid], k = !L || L.tier === 1 ? 'lg' : 'lg2'; for (const x of H.lg[lid]) add(x.c, yOfLabel(x.y), k); }
  for (const n in H.cup || {}) for (const x of H.cup[n]) add(x.c, yOfLabel(x.y), 'cup');
  for (const k in H.cont || {}) { const t = C.COMPS && C.COMPS[k] ? C.COMPS[k].tier : 2; for (const x of H.cont[k]) add(x.c, yOfLabel(x.y), t === 1 ? 'c1' : 'c2'); }
  for (const id in w.promoH || {}) for (const y of w.promoH[id]) add(id, y, 'up');
  return T;
}
const TV = { lg: 2.5, lg2: 1.2, cup: 1, c1: 4, c2: 2, up: 2.2 };
const TN = { lg: '리그 우승', lg2: '리그 우승', cup: '컵 우승', c1: '대륙 대회 우승', c2: '대륙 대회 우승', up: '승격' };
// 구단 위상 (0~100)
C.legStature = (w, cid) => {
  const R = w.cr, p = R && R.pub && R.pub[R.pub.length - 1]; if (p) { const i = p.r.indexOf(cid); if (i >= 0) return p.v[i]; }
  if (C.mkt && C.mkt.statOf && w.clubs[cid]) return C.mkt.statOf(w, w.clubs[cid]).s;
  return 25;
};
C.legThreshold = s => clamp(5 + s * .1, 5.5, 15);
// 선수 기록 색인: cid → pid → 집계 (세션 안에서 해마다 한 번만 다시 만든다)
let IDX = null;
function index(w) {
  const ps = w.ps || C._ps || {}, key = w.year + '|' + (C.psGen || 0);
  if (IDX && IDX.key === key && IDX.w === w) return IDX.m;
  const m = new Map();
  for (const pid in ps) { const P = ps[pid], hs = P && P.h; if (!hs || typeof hs !== 'string') continue;
    const rows = hs.split(';'); const clubs = new Set();
    for (const row of rows) { if (!row) continue; const f = row.split(','); const cid = C.cidOf(w, isNaN(+f[1]) ? f[1] : +f[1]); if (!cid) continue; clubs.add(cid);
      if (f[8] === '1') continue; // 임대로 뛴 시즌은 그 구단 레전드 계산에서 뺀다
      let M = m.get(cid); if (!M) m.set(cid, M = new Map()); let A = M.get(pid); if (!A) M.set(pid, A = { pid, ys: new Map(), yst: new Map(), apps: 0, g: 0, a: 0, rtS: 0, rtN: 0 });
      const y = +f[0], ap = +f[2] || 0; A.ys.set(y, (A.ys.get(y) || 0) + ap); { const q = A.yst.get(y) || [0, 0, 0]; q[0] += +f[3] || 0; q[1] += +f[4] || 0; if (ap) q[2] = (+f[5] || 0) / 100; A.yst.set(y, q); } A.apps += ap; A.g += +f[3] || 0; A.a += +f[4] || 0; if (ap >= 5 && +f[6]) { A.oS = (A.oS || 0) + +f[6]; A.oN = (A.oN || 0) + 1; } if (ap && +f[5]) { A.rtS += (+f[5] / 100) * ap; A.rtN += ap; } }
    if (clubs.size === 1) { const [cid] = clubs; const A = m.get(cid) && m.get(cid).get(pid); if (A) A.one = 1; } }
  IDX = { key, w, m }; return m;
}
// 우승이 흔한 구단일수록 우승 한 번의 무게가 작다 (역대 리그 우승 비율 + 게임 속 우승 비율)
function oftenOf(w, cid, TR) {
  const d = ((G.FC27 || {}).CRANK || {})[cid], hist = d ? d[1] / 100 : 0;
  const yrs = Math.max(1, (w.year || 2026) - 2026 + 1), game = (TR[cid] || []).filter(x => x[1] === 'lg').length / yrs;
  const rate = hist * .5 + game * .5;
  return 1 / (1 + rate * 3);
}
function scoreClub(w, cid, M, TR, s) {
  const often = oftenOf(w, cid, TR);
  const fac = clamp(1 + (60 - s) / 40, .5, 2.2), sw = clamp(1.2 - s / 200, .7, 1.15), T = C.legThreshold(s), pre = (w.legPre || {})[cid] || {}, out = [];
  const tr = TR[cid] || [];
  const ids = new Set([...(M ? M.keys() : []), ...Object.keys(pre)]);
  for (const pid of ids) {
    const A = (M && M.get(pid)) || { pid, ys: new Map(), yst: new Map(), apps: 0, g: 0, a: 0, rtS: 0, rtN: 0 }, P = pre[pid];
    let sea = 0, nSea = 0; for (const [, ap] of A.ys) { if (ap >= 15) { sea += 1; nSea++; } else if (ap >= 5) { sea += .4; nSea++; } }
    let sc = sea * sw + A.apps / 100 + A.g / 40 + A.a / 80;
    // 기량 보너스: 그 구단에서 뛴 시즌들의 평균 OVR (스타였나)
    const q = A.oN ? A.oS / A.oN : P && P[4] ? P[4] : 0; if (q) sc += clamp((q - 78) / 4, 0, 2.5) * (s >= 55 ? 1 : .5);
    const rt = A.rtN ? A.rtS / A.rtN : 0; if (A.rtN >= 50) sc += clamp((rt - 7) * 4, -1, 3);
    const won = []; let tp = 0, key = 0;
    for (const [y, k] of tr) { const ap = A.ys.get(y) || 0; if (ap < 10) continue;
      // 주역(그 시즌 거의 전 경기 + 평점·공격 포인트)이면 전부, 그냥 뛴 정도면 일부만. 하부 리그 우승 + 승격은 한 번으로
      const st = A.yst.get(y) || [0, 0, 0], main = ap >= 25 && (st[2] >= 7.05 || st[0] >= 10 || st[1] >= 8);
      const dup = k === 'lg2' && tr.some(z => z[0] === y && z[1] === 'up') ? .3 : 1;
      tp += TV[k] * fac * dup * (k === 'up' || k === 'lg2' ? 1 : often) * (main ? 1 : .35); won.push([y, k]); if (main) key++; }
    sc += tp;
    let y0 = null;
    if (P) { const yrs = Math.max(0, 2026 - P[0]); sc += yrs * sw + P[1] / 100 + P[2] / 40 + P[3] * fac * .5; y0 = P[0]; }
    const one = !!A.one && !P && nSea >= 6; if (one) sc += 1.5;
    if (sc < T * .6) continue;
    const special = key > 0 || nSea >= 5 || (A.rtN >= 40 && rt >= 7.3) || P;
    const tot = nSea + (P ? Math.max(0, 2026 - P[0]) : 0);
    // 시즌 수 하한: 레전드는 주역으로 우승·승격을 이끌었다면 2시즌, 아니면 4시즌 / 아이콘은 6시즌
    let tier = sc >= T * 1.7 ? 3 : sc >= T ? 2 : sc >= T * .72 && special ? 1 : 0;
    if (tier === 3 && tot < 6) tier = 2;
    if (tier === 2 && tot < (key ? 2 : 4)) tier = special ? 1 : 0;
    if (tier === 1 && tot < 2) tier = 0;
    if (!tier) continue;
    const ys = [...A.ys.keys()].sort((a, b) => a - b);
    out.push({ pid, sc: Math.round(sc * 10) / 10, tier, apps: A.apps + (P ? P[1] : 0), g: A.g + (P ? P[2] : 0), a: A.a, rt, won, y0: y0 != null ? y0 : ys.length ? 2000 + ys[0] : null, y1: ys.length ? 2000 + ys[ys.length - 1] : null, nSea: nSea + (P ? Math.max(0, 2026 - P[0]) : 0), one, pre: !!P });
  }
  out.sort((a, b) => b.sc - a.sc);
  return { T, s, fac, often, list: out };
}
// 레전드를 따지는 구단: 실제로 리그가 돌아가는 구단 + 리그 밖 주요 구단 (배경용 소규모 구단 제외)
const legClub = (w, cid) => { const c = w.clubs[cid]; if (!c || c.parent) return false; if (c.lg && !/^X/.test(c.lg) && cid[0] !== 'X') return true; return !!(w.cr && w.cr.e && w.cr.e[cid] != null); };
C.legClub = legClub;
C.legCalc = function (w, cid) {
  if (!legClub(w, cid)) return { T: 0, s: 0, list: [] };
  const M = index(w).get(cid), TR = trophyMap(w);
  return scoreClub(w, cid, M, TR, C.legStature(w, cid));
};
// 해마다(시즌 교체) 전 구단 갱신 → w.leg[cid] = [[pid, 등급]], 새 레전드는 소식
C.legAll = function (S) {
  const w = S.w || S, m = index(w), TR = trophyMap(w), old = w.leg || {}, L = {}, fresh = [];
  const ids = new Set([...m.keys(), ...Object.keys(w.legPre || {})]);
  for (const cid of ids) { if (!legClub(w, cid)) continue; const r = scoreClub(w, cid, m.get(cid), TR, C.legStature(w, cid)); if (!r.list.length) continue;
    L[cid] = r.list.slice(0, 30).map(x => [x.pid, x.tier]);
    if (w.leg) for (const x of r.list) { const o = (old[cid] || []).find(z => z[0] === x.pid); if (x.tier >= 2 && (!o || o[1] < x.tier)) fresh.push([cid, x, r.s]); } }
  w.leg = L;
  if (S.w && C.wn && fresh.length) {
    fresh.sort((a, b) => b[2] - a[2] || b[1].sc - a[1].sc);
    for (const [cid, x] of fresh.slice(0, 6)) { const c = w.clubs[cid], P = (w.ps || {})[x.pid]; if (!c || !P) continue;
      try { C.wn.push(S, { d: w.cal ? w.cal.d : 0, c: 'record', imp: x.tier === 3 || (c.str || 0) >= 78 ? 2 : 1, h: `${c.name} ${TIER[x.tier]} 반열: ${P.n}`, s: `${x.nSea}시즌 ${x.apps}경기 ${x.g}골${x.won.length ? ` · 우승·승격 ${x.won.length}회` : ''}${x.one ? ' · 원클럽맨' : ''}` }); } catch (e) {} }
  }
  return L;
};
// 이 선수가 레전드로 대접받는 구단들 [[cid, 등급]]
C.legOf = (w, pid) => { const out = []; for (const cid in w.leg || {}) for (const [p, t] of w.leg[cid]) if (p === String(pid)) out.push([cid, t]); return out.sort((a, b) => b[1] - a[1]); };
})(typeof window !== 'undefined' ? window : globalThis);
