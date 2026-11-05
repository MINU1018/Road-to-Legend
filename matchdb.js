// Road to Legend — 경기 기록 엔진: AI 경기의 출전 명단·득점·도움·카드·평점을 경기 단위로 만들고 시즌 기록을 그 합으로 낸다
// 원칙: 선수 시즌 기록(골·도움·출전·평점)과 득점 순위는 반드시 경기 기록을 더한 값과 같다.
(function (G) {
'use strict';
const C = G.TC;
const { R, N, clamp, poisson } = C;
const MD = C.MD = {};

// ---------- 시즌 저장소 ----------
// P: 선수 사전 (인덱스 → 선수 id). 경기 기록은 인덱스로 선수를 가리킨다.
// id 형식: 숫자 = FC27 선수, '이름#xxx' = 생성 선수, '~구단~이름' = 명단 없는 하부 구단의 가상 선수, 'ME' = 내 선수
MD.newStore = (label, y) => ({ v: 1, label, y, P: [], L: {}, CUP: {}, CONT: {}, INTL: {} });
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const b62 = n => { let s = ''; do { s = B62[n % 62] + s; n = Math.floor(n / 62); } while (n > 0); return s; };
const u62 = s => { let n = 0; for (const ch of s) n = n * 62 + B62.indexOf(ch); return n; };
MD.b62 = b62; MD.u62 = u62;
const pix = (st, id) => { st._pm = st._pm || new Map(); let i = st._pm.get(id); if (i == null) { i = st.P.length; st.P.push(id); st._pm.set(id, i); } return i; };
MD.nameOf = (id, S) => {
  id = String(id);
  if (id === 'ME') return S && S.p ? S.p.name : '나';
  if (id[0] === '~') return id.slice(id.lastIndexOf('~') + 1);
  if (/^\d+$/.test(id)) { const p = G.FC27 && G.FC27.P[+id]; return p ? p[1] : id; }
  return id.split('#')[0];
};

// ---------- 명단 ----------
const GRP = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LM: 'A', RM: 'A', LW: 'A', RW: 'A', ST: 'A' };
const NEED = { G: 1, D: 4, M: 3, A: 3 };
// 득점·도움·카드 가중치 (역할별)
const GW = { ST: 1, W: .5, AM: .42, CM: .17, DM: .07, FB: .06, CB: .1, GK: 0 };
const AW = { ST: .42, W: .7, AM: .8, CM: .45, DM: .2, FB: .34, CB: .07, GK: .02 };
const CW = { CB: 1.4, DM: 1.5, FB: 1.2, CM: 1.1, AM: .8, W: .75, ST: .85, GK: .3 };
// side: { key, sq: [{ id, n, pos, ovr }] }
MD.clubSide = (w, cid, y) => {
  const c = w.clubs[cid]; if (!c) return { key: cid, sq: [] };
  const sq = C.squadOf(w, c, y).map(x => ({ id: x.id ? String(x.id) : '~' + cid + '~' + x.n, n: x.n, pos: x.pos, ovr: x.ovr }));
  return { key: cid, sq };
};
MD.natSide = (w, nat, pools, y) => {
  const pl = pools && pools[nat];
  let sq = pl ? pl.all.slice().sort((a, b) => b[2] - a[2]).slice(0, 26).map(e => ({ id: String(e[0]), n: C.pName(w, e), pos: e[1], ovr: e[2] })) : [];
  if (sq.length < 16) { // 명단 데이터가 적은 나라: 가상 선수로 채움 (시드 고정)
    const fake = C.squadOf(w, { id: 'NT_' + nat, nat, str: 66, lite: true }, y).map(x => ({ id: '~NT_' + nat + '~' + x.n, n: x.n, pos: x.pos, ovr: x.ovr }));
    sq = sq.concat(fake.slice(0, 18 - sq.length));
  }
  return { key: nat, sq };
};
// 선발·교체 (조금씩 로테이션)
function lineup(sq, excludeId) {
  const pool = sq.filter(x => x.id !== excludeId).map(x => ({ x, s: x.ovr + N(0, 2.2) }));
  pool.sort((a, b) => b.s - a.s);
  const xi = [], used = new Set(), cnt = { G: 0, D: 0, M: 0, A: 0 };
  for (const g of ['G', 'D', 'M', 'A']) for (const o of pool) { if (cnt[g] >= NEED[g]) break; if (!used.has(o) && (GRP[o.x.pos] || 'M') === g) { xi.push(o.x); used.add(o); cnt[g]++; } }
  for (const o of pool) { if (xi.length >= 11) break; if (!used.has(o) && (GRP[o.x.pos] !== 'G' || !cnt.G)) { xi.push(o.x); used.add(o); if (GRP[o.x.pos] === 'G') cnt.G++; } }
  const bench = pool.filter(o => !used.has(o) && GRP[o.x.pos] !== 'G').slice(0, 7).map(o => o.x);
  return { xi, bench };
}

// ---------- 경기 한 개 ----------
// u: 내 선수가 뛴 경기면 { side: 0|1, rec } (rec = 실제 경기 기록)
MD.play = function (st, A, B, ga, gb, u) {
  const sides = [A, B], goals = [ga, gb], out = [];
  const P = [[], []]; // 출전 선수: { id, pos, ovr, on, off, start, g, a, y, r, ri }
  for (let s = 0; s < 2; s++) {
    const me = u && u.side === s && u.rec && u.rec.played ? u.rec : null;
    const L = lineup(sides[s].sq, null);
    let xi = L.xi.slice(), bench = L.bench.slice();
    if (me) { // 내 선수를 명단에 넣는다: 선발이면 같은 포지션 선수 하나를 빼고, 교체면 교체 1명 자리를 쓴다
      const myPos = me.pos || u.pos || 'CM';
      const meObj = { id: 'ME', pos: myPos, ovr: u.ovr || 70 };
      if (me.start) { let k = xi.findIndex(x => GRP[x.pos] === GRP[myPos]); if (k < 0) k = xi.length - 1; xi.splice(k, 1, meObj); }
      else bench.unshift(meObj);
    }
    for (const x of xi) P[s].push({ id: x.id, pos: x.pos, ovr: x.ovr, on: 0, off: 90, start: 1, g: 0, a: 0, y: 0, r: 0 });
    // 교체: 보통 3~5명
    const nSub = Math.min(bench.length, me && !me.start ? Math.max(1, Math.round(N(3.3, .8))) : Math.round(N(3.3, .8)));
    const subs = me && !me.start ? [bench[0]].concat(bench.slice(1).sort(() => R() - .5)).slice(0, nSub) : bench.slice().sort(() => R() - .5).slice(0, nSub);
    for (const sb of subs) {
      const outs = P[s].filter(x => x.start && x.off === 90 && GRP[x.pos] !== 'G' && x.id !== 'ME');
      if (!outs.length) break;
      let minute;
      if (sb.id === 'ME') minute = clamp(90 - (me.min || 15), 1, 89);
      else minute = Math.round(clamp(N(68, 11), 46, 88));
      const o = outs.find(x => GRP[x.pos] === GRP[sb.pos]) || outs[Math.floor(R() * outs.length)];
      o.off = minute;
      P[s].push({ id: sb.id, pos: sb.pos, ovr: sb.ovr, on: minute, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 });
    }
    if (me && me.start && me.min < 90) { const mp = P[s].find(x => x.id === 'ME'); mp.off = me.min; const b2 = bench.filter(b => !P[s].some(x => x.id === b.id))[0]; if (b2) P[s].push({ id: b2.id, pos: b2.pos, ovr: b2.ovr, on: me.min, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 }); }
  }
  const onAt = (s, m) => P[s].filter(x => x.on <= m && x.off >= m && !x.rOut);
  const ev = [];
  for (let s = 0; s < 2; s++) {
    const n = goals[s];
    const meP = P[s].find(x => x.id === 'ME');
    const me = meP && u && u.rec;
    const myG = me ? (me.st.goals || 0) : 0, myA = me ? (me.st.assists || 0) : 0;
    const mins = []; for (let i = 0; i < n; i++) mins.push(1 + Math.floor(R() * 90));
    mins.sort((a, b) => a - b);
    // 내 골·도움은 내가 뛴 시간 안의 골에 배정
    const inMe = m => meP && m >= meP.on && m <= meP.off;
    const idx = mins.map((m, i) => i);
    const mineG = new Set(), mineA = new Set();
    let need = Math.min(myG, n);
    for (const i of idx.filter(i => inMe(mins[i]))) { if (need <= 0) break; mineG.add(i); need--; }
    for (let i = 0; i < n && need > 0; i++) if (!mineG.has(i)) { mins[i] = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); mineG.add(i); need--; }
    let needA = Math.min(myA, n - mineG.size);
    for (let i = 0; i < n && needA > 0; i++) if (!mineG.has(i) && inMe(mins[i])) { mineA.add(i); needA--; }
    for (let i = 0; i < n && needA > 0; i++) if (!mineG.has(i) && !mineA.has(i)) { mins[i] = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); mineA.add(i); needA--; }
    for (let i = 0; i < n; i++) {
      const m = Math.max(1, Math.min(90, mins[i]));
      if (mineG.has(i)) { meP.g++; const asst = R() < .7 ? pickW(onAt(s, m).filter(x => x !== meP), x => AW[C.ROLE[x.pos]] || .1) : null; if (asst) asst.a++; ev.push(['g', m, s, 'ME', asst ? asst.id : null]); continue; }
      const on = onAt(s, m).filter(x => x.id !== 'ME' || !me);
      const og = !mineA.has(i) && R() < .025;
      if (og) { const d = pickW(onAt(1 - s, m).filter(x => ['CB', 'FB', 'GK', 'DM'].includes(C.ROLE[x.pos])), () => 1); if (d) { ev.push(['o', m, s, d.id, null]); continue; } }
      const pen = !mineA.has(i) && R() < .09;
      const top = Math.max(...on.map(x => x.ovr), 60);
      const scorer = pen ? on.filter(x => C.ROLE[x.pos] !== 'GK').sort((a, b) => (GW[C.ROLE[b.pos]] * 10 + b.ovr) - (GW[C.ROLE[a.pos]] * 10 + a.ovr))[0] : pickW(on, x => (GW[C.ROLE[x.pos]] || .05) * Math.exp((x.ovr - top) * .1));
      if (!scorer) continue;
      scorer.g++;
      let asst = null;
      if (mineA.has(i)) asst = meP;
      else if (!pen && R() < .7) asst = pickW(onAt(s, m).filter(x => x !== scorer && x.id !== 'ME'), x => (AW[C.ROLE[x.pos]] || .1) * Math.exp((x.ovr - top) * .08));
      if (asst) asst.a++;
      ev.push([pen ? 'p' : 'g', m, s, scorer.id, asst ? asst.id : null]);
    }
    // 카드
    const meCard = me ? [me.st.yellow || 0, me.st.red || 0] : [0, 0];
    let ny = poisson(1.75), nr = R() < .055 ? 1 : 0;
    if (meCard[0]) { const m = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); meP.y = 1; ev.push(['y', m, s, 'ME', null]); }
    if (meCard[1]) { const m = Math.max(meP.on + 1, meP.off); meP.r = 1; ev.push(['r', m, s, 'ME', null]); }
    for (let k = 0; k < ny; k++) { const m = 5 + Math.floor(R() * 86); const c = pickW(onAt(s, m).filter(x => x.id !== 'ME' && !x.r), x => CW[C.ROLE[x.pos]] || 1); if (!c) continue; if (c.y) { if (R() < .5) { c.r = 1; c.rOut = 1; c.off = Math.max(m, lastEv(ev, s, c.id)); ev.push(['2', c.off, s, c.id, null]); } } else { c.y = 1; ev.push(['y', m, s, c.id, null]); } }
    if (nr) { const m = 15 + Math.floor(R() * 75); const c = pickW(onAt(s, m).filter(x => x.id !== 'ME' && !x.r), x => CW[C.ROLE[x.pos]] || 1); if (c) { c.r = 1; c.rOut = 1; c.off = Math.max(m, lastEv(ev, s, c.id)); ev.push(['r', c.off, s, c.id, null]); } }
  }
  ev.sort((a, b) => a[1] - b[1]);
  // 평점 (경기 결과·골·도움·실점·카드 반영). 내 선수는 실제 경기 평점 사용
  for (let s = 0; s < 2; s++) {
    const res = goals[s] > goals[1 - s] ? 1 : goals[s] < goals[1 - s] ? -1 : 0, conc = goals[1 - s];
    for (const x of P[s]) {
      if (x.id === 'ME') { x.rt = +(u.rec.rating || 6.5).toFixed(1); continue; }
      const role = C.ROLE[x.pos], def = ['GK', 'CB', 'FB'].includes(role);
      const mm = x.off - x.on;
      let r = 6.62 + (x.ovr - 72) * .035 + res * .25 + x.g * .75 + x.a * .45 + (def && conc === 0 && mm >= 60 ? .3 : 0) - (def || role === 'DM' ? conc * .09 : 0) - x.y * .15 - x.r * 1.2 + N(0, .32);
      if (!x.start) r = 6.6 + (r - 6.6) * .6;
      x.rt = Math.round(clamp(r, 4.5, 10) * 10) / 10;
    }
  }
  // 압축 저장: 선수 = 사전 번호(62진수), 평점 = 한 글자(4.5~10.0을 0.1 단위), 교체 투입 '+분', 교체 아웃 '-분'
  const enc = id => b62(pix(st, id));
  const evS = ev.map(e => `${e[0]}${e[1]}.${e[2]}.${enc(e[3])}${e[4] != null ? '.' + enc(e[4]) : ''}`).join('|');
  // 실제 선수가 한 명도 없는 하부 구단끼리의 경기는 출전 명단을 남기지 않는다 (득점·카드만)
  const real = sd => sd.sq.some(x => x.id[0] !== '~') || (u && u.rec);
  const lnS = real(A) || real(B) ? P.map(list => list.map(x => enc(x.id) + B62[Math.round(clamp(x.rt, 4.5, 10) * 10) - 45] + (x.start ? (x.off < 90 ? '-' + x.off : '') : '+' + x.on)).join(',')).join('/') : '';
  return { ev: evS, ln: lnS, P };
};
function lastEv(ev, s, id) { let m = 0; for (const e of ev) if (e[2] === s && (e[3] === id || e[4] === id)) m = Math.max(m, e[1]); return m; }
function pickW(list, wf) { let t = 0; const ws = list.map(x => { const v = Math.max(0, wf(x) || 0); t += v; return v; }); if (t <= 0) return list[0] || null; let r = R() * t; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }

// ---------- 시즌 집계 ----------
MD.addAgg = (agg, side, list) => {
  for (const x of list) {
    const k = x.id;
    const a = agg[k] || (agg[k] = { id: k, club: side, pos: x.pos, ovr: x.ovr, apps: 0, starts: 0, min: 0, g: 0, a: 0, y: 0, r: 0, rs: 0 });
    a.apps++; if (x.start) a.starts++; a.min += Math.max(0, x.off - x.on); a.g += x.g; a.a += x.a; a.y += x.y; a.r += x.r; a.rs += x.rt;
  }
};

// 리그 경기 묶음 압축: s = "홈.원정.홈골.원정골;" (구단 번호 62진수, 가상 구단은 그대로), e·l = 경기별 이벤트·명단
MD.packL = (rows, per, live) => {
  const k = x => typeof x === 'number' ? b62(x) : String(x);
  const o = { p: per, s: rows.map(r => `${k(r[0])}.${k(r[1])}.${r[2]}.${r[3]}`).join(';') };
  if (live) { o.e = rows.map(r => r[4] || ''); o.l = rows.map(r => r[5] || ''); }
  return o;
};
// 리그 경기 목록 풀기: [{ i, r(라운드), a, b(구단 id), ga, gb, det(상세 있음) }]
MD.leagueRows = (w, L) => {
  if (!L || !L.s) return [];
  const cid = t => /^[0-9A-Za-z]+$/.test(t) && !t.startsWith('OPP') ? (w.cix || [])[u62(t)] : t;
  return L.s.split(';').map((t, i) => { const [a, b, ga, gb] = t.split('.'); return { i, r: Math.floor(i / (L.p || 1)), a: cid(a), b: cid(b), ga: +ga, gb: +gb, det: !!((L.l && L.l[i]) || (L.e && L.e[i]) || L.e) }; });
};
MD.leagueMatch = (st, L, i) => MD.decode(st, [0, 0, 0, 0, 0, L.e ? L.e[i] : '', L.l ? L.l[i] : '']);
// ---------- 해석 (화면용) ----------
MD.decode = (st, m) => {
  // m: [라운드/단계, a, b, ga, gb, ev, ln, ...]
  const id = s => st.P[u62(s)];
  const ev = !m[5] ? [] : m[5].split('|').map(t => { const k = t[0], [mn, sd, p1, p2] = t.slice(1).split('.'); return { k, m: +mn, s: +sd, p: id(p1), a: p2 != null ? id(p2) : null }; });
  const ln = !m[6] ? null : m[6].split('/').map(side => side ? side.split(',').map(t => {
    const mt = /^([0-9A-Za-z]+)([0-9A-Za-z])([+-]\d+)?$/.exec(t); if (!mt) return null;
    const sub = mt[3] && mt[3][0] === '+', v = mt[3] ? +mt[3].slice(1) : 0;
    return { id: id(mt[1]), start: !sub, on: sub ? v : 0, off: sub ? 90 : (mt[3] ? v : 90), rt: (B62.indexOf(mt[2]) + 45) / 10 };
  }).filter(Boolean) : []);
  return { ev, ln };
};
// 경기 통계 (점유율·슈팅): 저장하지 않고 경기 키로 항상 같은 값이 나오게 만든다
MD.teamStats = (key, sa, sb, ga, gb) => {
  const r = C.seeded('ts|' + key);
  const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pos = clamp(Math.round(50 + (sa - sb) * 1.1 + g() * 5), 28, 72);
  const sh = (gg, s, d) => Math.max(gg, Math.round(10 + (s - 72) * .35 + d * 1.5 + g() * 3 + gg * 1.2));
  const shA = sh(ga, sa, (pos - 50) / 10), shB = sh(gb, sb, (50 - pos) / 10);
  const on = (s, gg) => clamp(Math.round(gg + (s - gg) * (.3 + r() * .12)), gg, s);
  return { pos: [pos, 100 - pos], sh: [shA, shB], sot: [on(shA, ga), on(shB, gb)] };
};
})(typeof window !== 'undefined' ? window : globalThis);
