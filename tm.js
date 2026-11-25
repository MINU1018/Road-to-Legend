// Road to Legend — FC27+TFMKT 데이터셋: 게임 이전(2026/27 이전) 실제 경력·이적·부상·시장가치·구단 역사
// 원칙: FC27 = 현재(명단·능력치·계약), Transfermarkt = 과거(2024/25까지). 2025/26은 구단만(기록 '-'), 그 사이 이동은 추정 날짜
// 데이터: data_tm.js(G.TMD, 새 게임·불러오기에 필요) / data_tmh.js(G.TMH 팀 색인·구단 시즌) / data_tmp0~7.js(선수 기록 조각)
// 화면은 C.TM.rec(pid)가 undefined(아직 조각을 못 불러옴)면 C.TM.need(...)로 불러온 뒤 다시 그린다
(function (G) {
'use strict';
const C = G.TC;
const T = C.TM = {};
const NSH = 8;
const N36 = s => s === '' || s == null ? 0 : parseInt(s, 36);
// ---------- 불러오기 ----------
// 화면(브라우저)은 T.loader = (파일 이름) => Promise 를 넣어 준다. Node(검증)에서는 require
const wait = {};
C.tmLoaded = k => { const L = wait[k]; if (L) { delete wait[k]; for (const f of L) f(); } T._memo = null; };
const FILES = { TMD: 'data_tm.js', TMH: 'data_tmh.js' }; for (let i = 0; i < NSH; i++) FILES['p' + i] = `data_tmp${i}.js`;
const have = k => k === 'TMD' ? !!G.TMD : k === 'TMH' ? !!(G.TMH && G.TMH.T) : !!(G.TMH && G.TMH.got && G.TMH.got[+k.slice(1)]);
const loading = {};
T.has = have;
T.load = function (k) {
  if (have(k)) return Promise.resolve();
  if (loading[k]) return loading[k];
  return loading[k] = new Promise((res, rej) => {
    (wait[k] = wait[k] || []).push(res);
    try {
      if (T.loader) T.loader(FILES[k]).catch(e => { delete loading[k]; rej(e); });
      else if (typeof require === 'function') { require(require('path').join(process.env.SRC || require('path').join(__dirname, '.'), FILES[k])); if (have(k)) C.tmLoaded(k); }
    } catch (e) { delete loading[k]; rej(e); }
  });
};
// 필요한 조각들 (k: 'TMD' | 'TMH' | 'p3' ...)
T.need = (...ks) => Promise.all(ks.map(k => T.load(k)));
T.shardOf = key => 'p' + ((+String(key).replace(/\D/g, '') || 0) % NSH);
// 바탕에서 차례로 전부 (각 조각 사이 쉬면서)
T.prefetch = async function (gap) {
  const order = ['TMD', 'TMH']; for (let i = 0; i < NSH; i++) order.push('p' + i);
  for (const k of order) { if (have(k)) continue; try { await T.load(k); } catch (e) { return; } await new Promise(r => setTimeout(r, gap || 400)); }
};
// ---------- 데이터셋 적용: FC27 생년월일을 Transfermarkt 기준으로 (원래 값은 보관해 FC27 저장을 불러오면 되돌린다) ----------
let ORIG = null, ON = false, PIDX = null;
const F = () => G.FC27;
function pidIndex() { if (PIDX) return PIDX; PIDX = new Map(); F().P.forEach((p, i) => PIDX.set(String(p[0]), i)); return PIDX; }
T.pidOf = fcid => { const i = pidIndex().get(String(fcid)); return i == null ? null : String(i); };
T.keyOf = pid => { const s = String(pid); if (s.startsWith('tm')) return s; if (!/^\d+$/.test(s)) return null; const p = F().P[+s]; return p ? String(p[0]) : null; };
T.apply = function (on) {
  on = !!(on && G.TMD); if (on === ON) return;
  const P = F().P;
  if (on) { ORIG = ORIG || new Map(); for (const k in G.TMD.dob) { const i = pidIndex().get(k); if (i == null) continue; if (!ORIG.has(i)) ORIG.set(i, P[i][9]); P[i][9] = G.TMD.dob[k]; } }
  else if (ORIG) for (const [i, v] of ORIG) P[i][9] = v;
  ON = on; T._memo = null;
};
T.on = () => ON;
T.isTM = w => !!(w && w.ds === 'tm');
// 저장에 넣지 않는 계산 값 (불러올 때 다시 만든다)
const hide = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: false, writable: true, configurable: true });
// ---------- 새 세계에 심기 ----------
// 시장가치 보정 w.vf[선수] = 배율×100: Transfermarkt 최신 가치 / 게임 공식 가치 (0.4~2.5배를 0.8제곱으로 눌러 튀지 않게). 해마다 1 쪽으로 줄어든다
const natOfClub = (w, c) => { const L = c && c.lg && w.lg[c.lg]; return L ? L.nation : c ? c.nat : 'ENG'; };
T.seed = function (w) {
  w.ds = 'tm'; const D = G.TMD; if (!D) return;
  w.vf = {};
  for (const id in w.clubs) { const c = w.clubs[id]; if (!c.sq) continue; for (const e of c.sq) { if (typeof e[0] !== 'number') continue; const k = T.keyOf(e[0]), v = k && D.val[k]; if (!v) continue;
    const base = C.aiFee(e[2], e[3], natOfClub(w, w.clubs[e[7]] || c), Math.max(1, e[6] || 2), .5, null); if (!base) continue;
    let f = Math.max(.4, Math.min(2.5, v * 1e4 / base)); f = Math.pow(f, .8); if (Math.abs(f - 1) >= .06) w.vf[e[0]] = Math.round(f * 100); } }
  T.legSeed(w);
};
C.vfOf = (w, pid) => { const v = w && w.vf && w.vf[pid]; return v ? v / 100 : 1; };
T.vfYear = w => { if (!w.vf) return; for (const k in w.vf) { const f = 1 + (w.vf[k] / 100 - 1) * .65; if (Math.abs(f - 1) < .05) delete w.vf[k]; else w.vf[k] = Math.round(f * 100); } };
// 구단 레전드의 게임 이전 기록 (실제): w.legPre[구단][선수] = [첫 시즌, 출전, 골, 도움, 우승 점수, 시즌 가중, 시즌 수, 마지막 시즌, 원클럽]
T.legSeed = function (w) {
  const L = G.TMD && G.TMD.leg; if (!L) return null;
  const pre = {};
  for (const cid in L) { if (!w.clubs[cid]) continue; for (const k in L[cid]) { const pid = k.startsWith('tm') ? k : T.pidOf(k); if (pid == null) continue; (pre[cid] = pre[cid] || {})[pid] = L[cid][k]; } }
  hide(w, 'legPre', pre); return pre;
};
// 레전드 명단에만 나오는 은퇴 선수 (게임에 없는 선수) 'tm'+id → [이름, 국적, 포지션, 생일(일), 마지막 시즌]
T.legP = pid => (G.TMD && G.TMD.legp && G.TMD.legp[pid]) || null;
T.name = pid => { const x = T.legP(String(pid)); return x ? x[0] : null; };
// ---------- 팀 ----------
// 팀 키: 게임 구단 ID / 'y'+id 게임 구단의 유스·2군 팀 / 't'+id 게임에 없는 팀
T.teamName = (w, k) => { if (!k) return ''; const c = w && w.clubs[k]; if (c) return c.name; const N = G.TMH && G.TMH.N && G.TMH.N[k]; if (Array.isArray(N)) return N[0]; return N || ''; };
T.teamParent = k => { const N = G.TMH && G.TMH.N && G.TMH.N[k]; return Array.isArray(N) ? N[1] : null; };
T.isYouth = k => !!k && k[0] === 'y';
// 연령별 유스 팀 (U19·Primavera 등): 시즌표에 보이지만 통산에는 넣지 않는다. 그 밖의 'y' 팀(B팀·II 등)은 2군
const YRX = /\bU ?-?(1[4-9]|2[0-3])\b|Youth|Primavera|Juvenil|Juniors?\b|Academy|Jugend|Sub-?\d{2}|Reserves?\b|Under ?\d{2}/i;
T.isYouthTeam = k => T.isYouth(k) && YRX.test(T.teamName(null, k));
// ---------- 선수 기록 ----------
// undefined = 아직 조각을 못 불러옴, null = 기록 없음
T.rec = function (pid) {
  if (!ON) return null;
  const key = T.keyOf(pid); if (!key) return null;
  const H = G.TMH; if (!H || !H.T || !have(T.shardOf(key))) return undefined;
  const memo = T._memo || (T._memo = new Map()); if (memo.has(key)) return memo.get(key);
  const raw = H.p[key], D = G.TMD || {};
  const mv = (D.mv && D.mv[key]) || [];
  if (!raw && !mv.length) { memo.set(key, null); return null; }
  const [c = '', t = '', j = '', v = ''] = String(raw || '').split('|'), tk = x => x === '' || x == null ? '' : H.T[N36(x)];
  const out = {
    car: c ? c.split(' ').map(r => { const f = r.split('.'); return { y: N36(f[0]) + 2000, k: f[1], t: tk(f[2]), ap: +f[3], g: +f[4], a: +f[5] }; }) : [],
    tx: t ? t.split(' ').map(r => { const f = r.split('.'); return { d: N36(f[0]), f: tk(f[1]), t: tk(f[2]), k: f[3] || 't', fee: N36(f[4] || '') }; }) : [],
    inj: j ? j.split(' ').map(r => { const f = r.split('.'); return { d: N36(f[0]), n: N36(f[1]), t: N36(f[2]) }; }) : [],
    val: v ? v.split(' ').map(r => { const f = r.split('.'); const m = N36(f[0]); return { t: 2000 + m / 12, v: N36(f[1]) * 1e4 }; }) : []
  };
  // 2025/26 이후 추정 이동 (겨울: 유명 이적만, 나머지는 여름 임의 날짜)
  for (const [d, k, f, to] of mv) out.tx.push({ d, f, t: to, k: { buy: 't', free: 'f', loan: 'l', lret: 'r' }[k] || 't', fee: 0, est: 1 });
  out.tx.sort((a, b) => a.d - b.d);
  memo.set(key, out); return out;
};
// 날짜 d에 소속된 팀 (이동 기록 기준)
T.clubAt = (R, d) => { if (!R || !R.tx.length) return ''; let cur = R.tx[0].f; for (const m of R.tx) { if (m.d > d) break; cur = m.t; } return cur; };
const D = (y, m, d) => C.dayOf(y, m, d);
const seasonOfD = d => { const [y, m] = C.ymd(d); return { y: (m >= 6 ? y : y - 1) - 2000, wi: m <= 3 || m === 12 }; };
// 게임 이전 경력 칸: [{cid, y0, y1, loan, tag, w0, w1, pre}] (유스·2군 팀은 뺀다 — 시즌별 기록에는 남는다)
T.prePath = function (w, pid) {
  const R = T.rec(pid); if (!R) return R;
  const out = []; let cur = null;
  // 16세 전에 거친 동네·학교 팀은 경력 칸에서 뺀다
  const k = String(pid), bd = k.startsWith('tm') ? (T.legP(k) || [])[3] : (G.FC27.P[+k] || [])[9], kid = d => bd != null && d < bd + 16 * 365.25;
  const close = d => { if (!cur) return; const so = seasonOfD(d), m = C.ymd(d)[1]; cur.y1 = m >= 6 && m <= 8 ? so.y - 1 : so.y; cur.w1 = so.wi; if (cur.y1 < cur.y0) cur.y1 = cur.y0; };
  for (const m of R.tx) {
    if (!m.t || T.isYouth(m.t) || (kid(m.d) && !(w && w.clubs[m.t]))) { if (cur && m.f === cur.cid) { close(m.d); cur = null; } continue; }
    if (cur && m.t === cur.cid) { if (m.k === 't' && cur.loan) { cur.loan = 0; cur.tag = '임대 → 완전 이적'; } continue; }
    close(m.d); const so = seasonOfD(m.d);
    cur = { cid: m.t, loan: m.k === 'l' ? 1 : 0, y0: so.y, w0: so.wi, tag: m.k === 'r' ? '임대 복귀' : null, pre: 1, mv: 1 };
    out.push(cur);
  }
  // 시작 시점(2026-08-01)에 있는 칸은 열어 둔다
  if (cur) { cur.y1 = null; cur.w1 = false; }
  // 경기 기록이 없는 임대 복귀 칸(복귀하자마자 다른 팀)은 뺀다
  const appsIn = x => R.car.reduce((t, r) => t + (r.t === x.cid && r.y - 2000 >= x.y0 && (x.y1 == null || r.y - 2000 <= x.y1) ? r.ap : 0), 0);
  return out.filter((x, i) => !(x.tag === '임대 복귀' && x.y1 != null && i < out.length - 1 && !appsIn(x)));
};
// 게임 이전 시즌별 기록 → 프로필 시즌 목록 형식 [{y, label, wl, items, pre}]
// 2024/25까지는 Transfermarkt 기록(평점 없음), 2025/26은 구단만 ('-')
T.preSeasons = function (w, pid, lblOf) {
  const R = T.rec(pid); if (!R) return R;
  const by = new Map(), get = (y, k, club) => { const key = y; let sn = by.get(key); if (!sn) by.set(key, sn = { y: y - 2000, label: lblOf(club, y - 2000, k), wl: C.wLabel(y), items: [], pre: 1 }); return sn; };
  for (const r of R.car) { if (r.y >= 2025) continue; const sn = get(r.y, r.k, r.t);
    const yt = T.isYouthTeam(r.t);
    sn.items.push({ key: 'T', cat: 'all', name: yt ? '유스 (통산 제외)' : T.isYouth(r.t) ? '2군' : '공식전 전체', club: r.t, apps: r.ap, g: r.g, a: r.a, rt: null, min: null, cs: 0, mom: 0, pre: 1, youth: yt ? 1 : 0 }); }
  // 2025/26: 시즌 초(9월)와 겨울 뒤(3월) 소속
  const c1 = T.clubAt(R, D(2025, 9, 1)), c2 = T.clubAt(R, D(2026, 3, 1));
  for (const cl of [...new Set([c1, c2])]) if (cl) { const sn = get(2025, null, cl); sn.items.push({ key: 'T', cat: 'all', name: '공식전 전체', club: cl, apps: null, g: null, a: null, rt: null, min: null, cs: 0, mom: 0, pre: 1, nd: 1, youth: T.isYouthTeam(cl) ? 1 : 0 }); }
  return [...by.values()].sort((a, b) => a.y - b.y);
};
// 게임 이전 부상 [{d, n, t, cid}]
T.preInj = function (pid) { const R = T.rec(pid); if (!R) return R; return R.inj.map(x => ({ d: x.d, n: x.n, t: x.t, cid: T.clubAt(R, x.d), pre: 1 })); };
// 게임 이전 시장가치 [{t(연 소수), v, cid}]
T.preVal = function (pid) { const R = T.rec(pid); if (!R) return R; return R.val.filter(x => x.t < 2026.58).map(x => { const y = Math.floor(x.t), m = Math.round((x.t - y) * 12) + 1; return { t: x.t, v: x.v, cid: T.clubAt(R, D(y, m, 15)) }; }); };
T.caps = pid => { const k = T.keyOf(pid); return (k && G.TMD && G.TMD.caps && G.TMD.caps[k]) || null; };
// ---------- 구단 ----------
// 게임 이전 시즌 [{y, comp, lv, rk, p, w, d, l, gf, ga, pts, mgr}] (오래된 순)
T.clubSeasons = function (cid) {
  const H = G.TMH; if (!H || !H.cs) return undefined;
  const s = H.cs[cid]; if (!s) return [];
  return s.split(' ').map(r => { const f = r.split('.').map(N36); return { y: f[0] + 2000, comp: H.cm[f[1]] || '', lv: f[2], rk: f[3], p: f[4], w: f[5], d: f[6], l: f[7], gf: f[8], ga: f[9], pts: f[10], mgr: f[11] >= 0 ? H.mg[f[11]] : '' }; });
};
// 대회 이름 → 게임 리그 (지금 그 리그 구단들이 뛰던 대회)
T.compLg = name => (G.TMD && G.TMD.cmap && G.TMD.cmap[name]) || null;
// 게임 이전 리그 우승 [[시즌 시작 해, 구단]]
T.honours = lid => (G.TMD && G.TMD.hon && G.TMD.hon[lid]) || [];
T.s26 = () => (G.TMD && G.TMD.s26) || null;
// 2025/26 시즌 이 구단: {lid, pos, row, champ, cup, cont}
T.club26 = function (w, cid) {
  const S6 = T.s26(); if (!S6) return null; const out = { cups: [], cont: [] };
  for (const lid in S6.T) { const i = S6.T[lid].findIndex(r => r[0] === cid); if (i >= 0) { out.lid = lid; out.pos = i + 1; out.row = S6.T[lid][i]; out.n = S6.T[lid].length; break; } }
  for (const lid in S6.CH) { const [ch, up] = S6.CH[lid]; if (ch === cid) { out.lid = out.lid || lid; out.champ = 1; } if ((up || []).includes(cid)) { out.lid = out.lid || lid; out.up = 1; } }
  if (out.lid && S6.LGW[out.lid] === cid) out.champ = 1; else if (out.lid && out.pos === 1 && !S6.LGW[out.lid]) out.champ = 1;
  for (const n in S6.CUP) { const [a, b] = S6.CUP[n]; if (a === cid) out.cups.push([n, 'cup']); if (b === cid) out.cups.push([n, 'lcup']); }
  for (const k in S6.CONT) { const [a, b] = S6.CONT[k]; if (a === cid) out.cont.push([k, 1]); else if (b === cid) out.cont.push([k, 2]); }
  return out;
};
// 선수의 게임 이전 우승 [{y(시즌 시작 해), kind, name, cid}] — 그 시즌 그 구단에서 뛴 리그 우승 (1부) + 2025/26 국내 컵·대륙 대회
T.preTrophies = function (w, pid) {
  const R = T.rec(pid); if (!R) return R; const out = [], seen = new Set();
  const H = G.TMH;
  const put = (y, kind, name, cid) => { const k = kind + name + y; if (seen.has(k)) return; seen.add(k); out.push({ y, kind, name, cid }); };
  for (const r of R.car) { if (!r.ap || !w.clubs[r.t] || r.y >= 2025) continue; const cs = T.clubSeasons(r.t); if (!cs) continue; const s = cs.find(x => x.y === r.y && x.rk === 1 && x.lv === 1); if (s) { const lid = T.compLg(s.comp); put(r.y, 'lg', (lid && w.lg[lid] && w.lg[lid].name) || s.comp, r.t); } }
  const c1 = T.clubAt(R, D(2025, 9, 1)), c2 = T.clubAt(R, D(2026, 3, 1));
  for (const cid of new Set([c1, c2])) { if (!cid || !w.clubs[cid]) continue; const x = T.club26(w, cid); if (!x) continue;
    if (x.champ && x.lid && w.lg[x.lid] && w.lg[x.lid].tier === 1) put(2025, 'lg', w.lg[x.lid].name, cid);
    for (const [n, k] of x.cups) put(2025, 'cup', (k === 'lcup' ? C.LCUPNAME[n] : C.CUPNAME[n]) || '국내 컵', cid);
    for (const [k, r] of x.cont) if (r === 1) put(2025, 'cont', (C.COMPS && C.COMPS[k] ? C.COMPS[k].name : { LIB: '코파 리베르타도레스', SUD: '코파 수다메리카나' }[k] || k), cid); }
  return out;
};
// 게임 이전 개인 수상 (이름으로)
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
T.preAwards = function (w, pid) {
  const S6 = T.s26(); if (!S6) return []; const out = [];
  const nm = fold((w.ps && w.ps[pid] && w.ps[pid].n) || (G.FC27.P[+pid] || [])[1] || ''); if (!nm) return out;
  for (const [t, n] of S6.AWARDS) if (fold(n) === nm) out.push(t);
  for (const lid in S6.SCORERS) { const [n, , g] = S6.SCORERS[lid]; if (fold(n) === nm) out.push(`2025/26 ${(w.lg[lid] || {}).name || lid} 득점왕 (${g}골)`); }
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
