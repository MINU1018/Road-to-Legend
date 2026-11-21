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
const pix = (st, id) => { if (!(st._pm instanceof Map)) { st._pm = new Map(); st.P.forEach((x, i) => st._pm.set(x, i)); Object.defineProperty(st, '_pm', { enumerable: false, writable: true, value: st._pm }); } let i = st._pm.get(id); if (i == null) { i = st.P.length; st.P.push(id); st._pm.set(id, i); } return i; };
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
const AW = { ST: .42, W: .7, AM: .8, CM: .45, DM: .2, FB: .34, CB: .07, GK: .006 };
// 골키퍼는 득점 가중치 0 (예전에는 0이 '없음'으로 처리돼 기본값 .05가 붙던 버그가 있었다)
const gw = pos => { const r = C.ROLE[pos]; return r in GW ? GW[r] : .05; };
const aw = pos => { const r = C.ROLE[pos]; return r in AW ? AW[r] : .1; };
// 평점 포지션 보정: 공격수만 평점이 높게 나오지 않도록 (수비·미드필더는 골 대신 수비 기여)
const ROLEB = { GK: .06, CB: .12, FB: .1, DM: .16, CM: .11, AM: .03, W: -.02, ST: -.07 };
const CW = { CB: 1.4, DM: 1.5, FB: 1.2, CM: 1.1, AM: .8, W: .75, ST: .85, GK: .3 };
// side: { key, sq: [{ id, n, pos, ovr }] }
MD.clubSide = (w, cid, y) => {
  const c = w.clubs[cid]; if (!c) return { key: cid, sq: [] };
  const sq = C.squadOf(w, c, y).map(x => ({ id: x.id ? String(x.id) : '~' + cid + '~' + x.n, n: x.n, pos: x.pos, ovr: x.ovr, yb: x.yb || 0 }));
  // 부상자는 명단에서 뺀다 (남은 인원이 너무 적으면 그대로)
  if (!c.lite && c.sq && c.sq.some(e => e[14])) { const inj = new Set(c.sq.filter(e => e[14]).map(e => String(e[0]))), ok = sq.filter(x => !inj.has(x.id)); if (ok.length >= 13) return { key: cid, sq: ok }; }
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
// yb: 유망주·임대 복귀 선수에게 주는 출전 기회 가산 (컵 경기에서는 더 크게, 로테이션도 더 많이)
// cx: { ban: Set(출전 정지 선수), fat: id → 피로 감점 } — 연전이면 주전을 쉬게 한다 (로테이션)
function lineup(sq, excludeId, cup, cx) {
  let src = sq.filter(x => x.id !== excludeId);
  if (cx && cx.ban && cx.ban.size) { const ok = src.filter(x => !cx.ban.has(x.id)); if (ok.length >= 13) src = ok; }
  const pool = src.map(x => ({ x, s: x.ovr + N(0, cup ? 3.6 : 2.2) + (x.yb || 0) * (cup ? 1.8 : 1) - (cx && cx.fat ? cx.fat(x) : 0) }));
  pool.sort((a, b) => b.s - a.s);
  const xi = [], used = new Set(), cnt = { G: 0, D: 0, M: 0, A: 0 };
  for (const g of ['G', 'D', 'M', 'A']) for (const o of pool) { if (cnt[g] >= NEED[g]) break; if (!used.has(o) && (GRP[o.x.pos] || 'M') === g) { xi.push(o.x); used.add(o); cnt[g]++; } }
  for (const o of pool) { if (xi.length >= 11) break; if (!used.has(o) && (GRP[o.x.pos] !== 'G' || !cnt.G)) { xi.push(o.x); used.add(o); if (GRP[o.x.pos] === 'G') cnt.G++; } }
  const bench = pool.filter(o => !used.has(o) && GRP[o.x.pos] !== 'G').slice(0, 7).map(o => o.x);
  return { xi, bench };
}

// ---------- 징계·피로 (관전 모드 AI 선수) ----------
// MD.ctx = { w, d, kind: 'lg' | 'cup' | 'cont' } — 달력이 경기 전에 채운다
// w.susp[pid] = { dom: 국내(리그·컵) 남은 경기, lg: 리그만, cont: 대륙 대회 }
// 퇴장: 경고 누적 퇴장 1경기, 직접 퇴장 1~3경기 (그 대회 범위). 리그 경고 5·10·15장마다 리그 1·2·3경기
MD.ctx = null;
const BANK = { lg: ['dom', 'lg'], cup: ['dom'], cont: ['cont'] };
function discCx(cx, sd, kind) {
  const w = cx.w, SU = w.susp || {}, LP = w.lastPl || {}, d = cx.d || 0, ban = new Set();
  for (const x of sd.sq) { const b = SU[x.id]; if (b && BANK[kind].some(k => b[k] > 0)) ban.add(x.id); }
  // 출전 정지 소화
  for (const id of ban) { const b = SU[id]; for (const k of BANK[kind]) if (b[k] > 0) { b[k]--; break; } if (!b.dom && !b.lg && !b.cont) delete SU[id]; }
  const fat = x => { const l = LP[x.id]; if (l == null) return 0; const gap = d - l, gk = (GRP[x.pos] || 'M') === 'G'; const v = gap <= 2 ? 6 : gap === 3 ? 3.2 : gap === 4 ? 1 : 0; return gk ? v * .35 : v; };
  return { ban, fat };
}
function discAfter(cx, kind, sides, P, ev) {
  const w = cx.w, SU = w.susp = w.susp || {}, LP = w.lastPl = w.lastPl || {}, YC = w.ycnt = w.ycnt || {};
  for (let s = 0; s < 2; s++) for (const p of P[s]) {
    if (p.id === 'ME' || !w.clubs[sides[s].key]) continue;
    if (p.off - p.on >= 55) LP[p.id] = cx.d;
    const sec = ev.some(e => e[3] === p.id && e[0] === '2'), red = ev.some(e => e[3] === p.id && e[0] === 'r');
    const scope = kind === 'cont' ? 'cont' : 'dom';
    if (sec || red) { const b = SU[p.id] = SU[p.id] || {}; b[scope] = (b[scope] || 0) + (red ? (R() < .62 ? 1 : R() < .7 ? 2 : 3) : 1); }
    else if (kind === 'lg' && p.y) { const n0 = YC[p.id] || 0, n1 = n0 + p.y; YC[p.id] = n1; for (const t of [5, 10, 15]) if (n0 < t && n1 >= t) { const b = SU[p.id] = SU[p.id] || {}; b.lg = (b.lg || 0) + t / 5; } }
  }
}
MD.discAfter = discAfter;
// ---------- 경기 한 개 ----------
// u: 내 선수가 뛴 경기면 { side: 0|1, rec } (rec = 실제 경기 기록)
MD.play = function (st, A, B, ga, gb, u, opt) {
  const sides = [A, B], goals = [ga, gb], out = [], cup = !!(opt && opt.cup);
  const P = [[], []]; // 출전 선수: { id, pos, ovr, on, off, start, g, a, y, r, ri }
  const CX = MD.ctx && MD.ctx.w && !(opt && opt.nat) ? MD.ctx : null, kind = CX ? (cup ? 'cup' : CX.kind || 'lg') : null;
  const st9 = 2 + Math.floor(R() * 6); // 이 경기의 후반 추가시간
  const Ls = sides.map(sd => lineup(sd.sq, null, cup, CX ? discCx(CX, sd, kind) : null));
  const avg = Ls.map(L => L.xi.length ? L.xi.reduce((a, x) => a + x.ovr, 0) / L.xi.length : 60);
  for (let s = 0; s < 2; s++) {
    const me = u && u.side === s && u.rec && u.rec.played ? u.rec : null;
    const L = Ls[s];
    let xi = L.xi.slice(), bench = L.bench.slice();
    // 유망주 기회: 약한 상대와의 컵 경기는 선발 1~2명, 크게 이기는 경기·컵 경기는 막판 교체로 경험을 쌓게 한다
    let cameo = [];
    if (!me && !(opt && opt.nat)) {
      const yp = sides[s].sq.filter(x => (x.yb || 0) > 0 && GRP[x.pos] !== 'G').sort((a, b) => (b.yb + b.ovr * .15) - (a.yb + a.ovr * .15));
      if (yp.length) {
        const adv = goals[s] - goals[1 - s], diff = avg[s] - avg[1 - s];
        if (cup && diff >= 3) {
          let k = diff >= 7 ? 2 : 1;
          for (const y of yp) {
            if (k <= 0) break; if (xi.includes(y) || y.ovr < avg[s] - 20) continue;
            const g = GRP[y.pos] || 'M'; let bi = -1;
            xi.forEach((x, i) => { if ((GRP[x.pos] || 'M') === g && (bi < 0 || x.ovr < xi[bi].ovr)) bi = i; });
            if (bi < 0) continue;
            bench = [xi[bi]].concat(bench.filter(b => b !== y)); xi[bi] = y; k--;
          }
        }
        const pc = adv >= 3 ? .9 : adv >= 2 ? .7 : cup ? .5 : adv >= 1 ? .25 : adv === 0 ? .14 : .22; // 지고 있을 때도 분위기 반전용으로 유망주를 넣어 본다
        if (pc && R() < pc) {
          // 유망주 여럿이면 돌아가며 (기대치 높은 선수가 조금 더 자주)
          const cand = yp.filter(y => !xi.includes(y) && y.ovr >= avg[s] - 24).slice(0, 6), n = adv >= 3 && R() < .5 ? 2 : 1;
          for (let k = 0; k < n && cand.length; k++) { let t = 0; for (const y of cand) t += y.yb + 1; let r = R() * t, j = 0; for (; j < cand.length - 1; j++) { r -= cand[j].yb + 1; if (r <= 0) break; } cameo.push(cand.splice(j, 1)[0]); }
        }
        if (cameo.length) bench = bench.filter(b => !cameo.includes(b));
      }
    }
    if (me) { // 내 선수를 명단에 넣는다: 선발이면 같은 포지션 선수 하나를 빼고, 교체면 교체 1명 자리를 쓴다
      const myPos = me.pos || u.pos || 'CM';
      const meObj = { id: 'ME', pos: myPos, ovr: u.ovr || 70 };
      if (me.start) { let k = xi.findIndex(x => GRP[x.pos] === GRP[myPos]); if (k < 0) k = xi.length - 1; xi.splice(k, 1, meObj); }
      else bench.unshift(meObj);
    }
    for (const x of xi) P[s].push({ id: x.id, pos: x.pos, ovr: x.ovr, on: 0, off: 90, start: 1, g: 0, a: 0, y: 0, r: 0 });
    // 교체: 특별한 일이 없으면 5명을 거의 다 쓴다. 경기 중 교체 타이밍은 3번(+하프타임)이라 두세 명씩 묶어서 들어간다
    const rq = R(), want = rq < .58 ? 5 : rq < .82 ? 4 : rq < .95 ? 3 : 2;
    const nSub = Math.min(bench.length, 5 - cameo.length, me && !me.start ? Math.max(1, want - cameo.length) : Math.max(0, want - cameo.length));
    const subs = (me && !me.start ? [bench[0]].concat(bench.slice(1).sort(() => R() - .5)).slice(0, nSub) : bench.slice().sort(() => R() - .5).slice(0, Math.max(0, nSub))).concat(cameo);
    // 교체 묶음(웨이브): 첫 교체 55~70분(가끔 하프타임), 다음은 70~80분, 마지막은 막판. 유망주 카메오는 마지막 묶음
    const PAT = { 1: [[1]], 2: [[1, 1], [2]], 3: [[1, 1, 1], [2, 1], [1, 2]], 4: [[2, 1, 1], [1, 2, 1], [2, 2], [1, 1, 2]], 5: [[2, 2, 1], [1, 2, 2], [2, 1, 2], [3, 1, 1], [2, 3], [1, 1, 3]] };
    const subMin = [];
    { const k = subs.filter(x => x.id !== 'ME').length;
      if (k) { const pats = PAT[Math.min(5, k)], pat = pats[(R() * pats.length) | 0];
        let t = R() < .09 ? 46 : Math.round(clamp(N(61, 7), 50, 74));
        const inj = R() < .07 ? Math.round(clamp(N(30, 9), 8, 44)) : 0; // 부상 교체 (전반)
        let first = true;
        for (let wv = 0; wv < pat.length; wv++) {
          for (let q = 0; q < pat[wv]; q++) subMin.push(first && inj ? inj : t), first = false;
          t = Math.round(clamp(t + N(wv === 0 ? 13 : 8, 4), t + 3, 89));
        }
        while (subMin.length < k) subMin.push(Math.round(clamp(N(84, 4), 75, 90)));
        subMin.sort((a, b) => a - b); } }
    let si = 0;
    for (const sb of subs) {
      const outs = P[s].filter(x => x.start && x.off === 90 && GRP[x.pos] !== 'G' && x.id !== 'ME');
      if (!outs.length) break;
      let minute;
      if (sb.id === 'ME') minute = clamp(90 - (me.min || 15), 1, 89);
      else minute = subMin[Math.min(si++, subMin.length - 1)] || 70;
      if (cameo.includes(sb) && minute < 70) minute = Math.round(clamp(N(80, 5), 70, 89));
      // 같은 포지션끼리 교체. 후반 늦게는 지친 공격수·미드필더부터
      const same = outs.filter(x => GRP[x.pos] === GRP[sb.pos]);
      const o = same.length ? same[(R() * same.length) | 0] : outs[Math.floor(R() * outs.length)];
      o.off = minute;
      P[s].push({ id: sb.id, pos: sb.pos, ovr: sb.ovr, on: minute, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 });
    }
    if (me && me.start && me.min < 90) { const mp = P[s].find(x => x.id === 'ME'); mp.off = me.min; const b2 = bench.filter(b => !P[s].some(x => x.id === b.id))[0]; if (b2) P[s].push({ id: b2.id, pos: b2.pos, ovr: b2.ovr, on: me.min, off: 90, start: 0, g: 0, a: 0, y: 0, r: 0 }); }
  }
  const onAt = (s, m) => P[s].filter(x => x.on <= m && (x.off >= m || x.off >= 90) && !x.rOut);
  const ev = [];
  for (let s = 0; s < 2; s++) {
    const n = goals[s];
    const meP = P[s].find(x => x.id === 'ME');
    const me = meP && u && u.rec;
    const myG = me ? (me.st.goals || 0) : 0, myA = me ? (me.st.assists || 0) : 0;
    // 후반 추가시간(90+1 ~ 90+7)에 나는 골도 있다: m > 90 이면 '90+(m-90)'
    const mins = []; for (let i = 0; i < n; i++) mins.push(R() < .055 ? 90 + 1 + Math.floor(R() * st9) : 1 + Math.floor(R() * 90));
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
      const m = Math.max(1, Math.min(97, mins[i]));
      if (mineG.has(i)) { meP.g++; const asst = R() < .7 ? pickW(onAt(s, m).filter(x => x !== meP), x => aw(x.pos)) : null; if (asst) asst.a++; ev.push(['g', m, s, 'ME', asst ? asst.id : null]); continue; }
      const on = onAt(s, m).filter(x => x.id !== 'ME' || !me);
      const og = !mineA.has(i) && R() < .025;
      if (og) { const d = pickW(onAt(1 - s, m).filter(x => ['CB', 'FB', 'GK', 'DM'].includes(C.ROLE[x.pos])), () => 1); if (d) { ev.push(['o', m, s, d.id, null]); continue; } }
      const pen = !mineA.has(i) && R() < .09;
      const top = Math.max(...on.map(x => x.ovr), 60);
      const scorer = pen ? on.filter(x => C.ROLE[x.pos] !== 'GK').sort((a, b) => (gw(b.pos) * 10 + b.ovr) - (gw(a.pos) * 10 + a.ovr))[0] : pickW(on.filter(x => C.ROLE[x.pos] !== 'GK'), x => gw(x.pos) * Math.exp((x.ovr - top) * .1));
      if (!scorer) continue;
      scorer.g++;
      let asst = null;
      if (mineA.has(i)) asst = meP;
      else if (!pen && R() < .7) asst = pickW(onAt(s, m).filter(x => x !== scorer && x.id !== 'ME'), x => aw(x.pos) * Math.exp((x.ovr - top) * .08));
      if (asst) asst.a++;
      ev.push([pen ? 'p' : 'g', m, s, scorer.id, asst ? asst.id : null]);
    }
    // 카드
    const meCard = me ? [me.st.yellow || 0, me.st.red || 0] : [0, 0];
    const dby = C.derbyOf && C.derbyOf(A.key, B.key);
    let ny = poisson(dby ? 2.3 : 1.75), nr = R() < (dby ? .085 : .055) ? 1 : 0;
    if (meCard[0]) { const m = meP.on + Math.floor(R() * Math.max(1, meP.off - meP.on)); meP.y = 1; ev.push(['y', m, s, 'ME', null]); }
    if (meCard[1]) { const m = Math.max(meP.on + 1, meP.off); meP.r = 1; ev.push(['r', m, s, 'ME', null]); }
    for (let k = 0; k < ny; k++) { const m = R() < .07 ? 91 + Math.floor(R() * st9) : 5 + Math.floor(R() * 86); const c = pickW(onAt(s, m).filter(x => x.id !== 'ME' && !x.r), x => CW[C.ROLE[x.pos]] || 1); if (!c) continue; if (c.y) { if (R() < .5) { c.r = 1; c.rOut = 1; c.off = Math.max(m, lastEv(ev, s, c.id)); ev.push(['2', c.off, s, c.id, null]); } } else { c.y = 1; ev.push(['y', m, s, c.id, null]); } }
    if (nr) { const m = 15 + Math.floor(R() * 75); const c = pickW(onAt(s, m).filter(x => x.id !== 'ME' && !x.r), x => CW[C.ROLE[x.pos]] || 1); if (c) { c.r = 1; c.rOut = 1; c.off = Math.max(m, lastEv(ev, s, c.id)); ev.push(['r', c.off, s, c.id, null]); } }
  }
  ev.sort((a, b) => a[1] - b[1]);
  // 평점 (경기 결과·골·도움·실점·카드 반영). 내 선수는 실제 경기 평점 사용
  // 평점 기준은 이 경기에 나온 두 팀 선발 평균 OVR (리그 수준에 맞춘 상대 평가: 하부 리그도 평균 평점이 1부와 비슷)
  const xiAll = P[0].concat(P[1]).filter(x => x.start && x.id !== 'ME');
  const ref = xiAll.length ? xiAll.reduce((a, x) => a + x.ovr, 0) / xiAll.length : 70;
  for (let s = 0; s < 2; s++) {
    const res = goals[s] > goals[1 - s] ? 1 : goals[s] < goals[1 - s] ? -1 : 0, conc = goals[1 - s];
    for (const x of P[s]) {
      const mm = x.off - x.on;
      x.cs = conc === 0 && mm >= 60 ? 1 : 0;
      if (x.id === 'ME') { x.rt = +(u.rec.rating || 6.5).toFixed(1); continue; }
      const role = C.ROLE[x.pos];
      const csB = conc === 0 && mm >= 60 ? ({ GK: .45, CB: .32, FB: .26, DM: .16, CM: .06 }[role] || 0) : 0;
      const concP = conc * ({ GK: .13, CB: .085, FB: .07, DM: .04, CM: .02 }[role] || 0);
      let r = 6.6 + (ROLEB[role] || 0) + (x.ovr - ref) * .033 + res * .22 + x.g * .55 + x.a * .35 + csB - concP - x.y * .15 - x.r * 1.2 + N(0, .3);
      if (!x.start) r = 6.6 + (r - 6.6) * .6;
      x.rt = Math.round(clamp(r, 4.5, 10) * 10) / 10;
    }
  }
  // 경기 최우수 선수(MOM): 평점 최고 → 공격 포인트 → 이긴 팀 → 선발 순 (화면에서도 같은 규칙으로 다시 고른다)
  { const res = goals[0] > goals[1] ? 0 : goals[1] > goals[0] ? 1 : -1, cands = [];
    for (let s = 0; s < 2; s++) P[s].forEach((x, i) => cands.push({ x, id: x.id, rt: x.rt, ga: x.g + x.a, win: res === s, start: x.start, s, i }));
    const m = MD.momPick(cands); if (m) m.x.mom = 1; }
  // 압축 저장: 선수 = 사전 번호(62진수), 평점 = 한 글자(4.5~10.0을 0.1 단위), 교체 투입 '+분', 교체 아웃 '-분'
  const enc = id => b62(pix(st, id));
  const evS = ev.map(e => `${e[0]}${e[1]}.${e[2]}.${enc(e[3])}${e[4] != null ? '.' + enc(e[4]) : ''}`).join('|');
  // 실제 선수가 한 명도 없는 하부 구단끼리의 경기는 출전 명단을 남기지 않는다 (득점·카드만)
  const real = sd => sd.sq.some(x => x.id[0] !== '~') || (u && u.rec);
  const lnS = real(A) || real(B) ? P.map(list => list.map(x => enc(x.id) + B62[Math.round(clamp(x.rt, 4.5, 10) * 10) - 45] + (x.start ? (x.off < 90 ? '-' + x.off : '') : '+' + x.on + (x.off < 90 ? '-' + x.off : ''))).join(',')).join('/') : '';
  if (CX) try { discAfter(CX, kind, sides, P, ev); } catch (e) { }
  return { ev: evS, ln: lnS, P };
};
MD.momPick = cands => { let b = null; for (const c of cands) { if (!b || c.rt > b.rt || (c.rt === b.rt && (c.ga > b.ga || (c.ga === b.ga && ((c.win && !b.win) || (c.win === b.win && c.start > b.start)))))) b = c; } return b; };
// 해석된 경기(decode 결과)에서 MOM 찾기
MD.momOf = (d, ga, gb) => {
  if (!d || !d.ln || d.ln.length !== 2) return null;
  const res = ga > gb ? 0 : gb > ga ? 1 : -1, cands = [];
  const gaOf = id => d.ev.filter(e => (e.p === id && (e.k === 'g' || e.k === 'p')) || e.a === id).length;
  d.ln.forEach((list, s) => list.forEach((x, i) => cands.push({ id: x.id, rt: x.rt, ga: gaOf(x.id), win: res === s, start: x.start ? 1 : 0, s, i })));
  const m = MD.momPick(cands); return m ? m.id : null;
};
function lastEv(ev, s, id) { let m = 0; for (const e of ev) if (e[2] === s && (e[3] === id || e[4] === id)) m = Math.max(m, e[1]); return m; }
function pickW(list, wf) { let t = 0; const ws = list.map(x => { const v = Math.max(0, wf(x) || 0); t += v; return v; }); if (t <= 0) return list[0] || null; let r = R() * t; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }

// ---------- 시즌 집계 ----------
MD.addAgg = (agg, side, list) => {
  for (const x of list) {
    const k = x.id;
    const a = agg[k] || (agg[k] = { id: k, club: side, pos: x.pos, ovr: x.ovr, apps: 0, starts: 0, min: 0, g: 0, a: 0, y: 0, r: 0, rs: 0, cs: 0 });
    a.club = side; a.apps++; if (x.start) a.starts++; a.min += Math.max(0, x.off - x.on); a.g += x.g; a.a += x.a; a.y += x.y; a.r += x.r; a.rs += x.rt; a.cs = (a.cs || 0) + (x.cs || 0);
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
  return L.s.split(';').map((t, i) => { const [a, b, ga, gb] = t.split('.'); return { i, r: L.r ? L.r[i] : Math.floor(i / (L.p || 1)), d: L.d ? L.d[i] : null, a: cid(a), b: cid(b), ga: +ga, gb: +gb, det: !!((L.l && L.l[i]) || (L.e && L.e[i]) || L.e) }; });
};
MD.leagueMatch = (st, L, i) => MD.decode(st, [0, 0, 0, 0, 0, L.e ? L.e[i] : '', L.l ? L.l[i] : '']);
// ---------- 해석 (화면용) ----------
MD.decode = (st, m) => {
  // m: [라운드/단계, a, b, ga, gb, ev, ln, ...]
  const id = s => st.P[u62(s)];
  const ev = !m[5] ? [] : m[5].split('|').map(t => { const k = t[0], [mn, sd, p1, p2] = t.slice(1).split('.'); return { k, m: +mn, s: +sd, p: id(p1), a: p2 != null ? id(p2) : null }; });
  const ln = !m[6] ? null : m[6].split('/').map(side => side ? side.split(',').map(t => {
    const mt = /^([0-9A-Za-z]+)([0-9A-Za-z])([+-]\d+)?(-\d+)?$/.exec(t); if (!mt) return null;
    const sub = mt[3] && mt[3][0] === '+', v = mt[3] ? +mt[3].slice(1) : 0;
    return { id: id(mt[1]), start: !sub, on: sub ? v : 0, off: sub ? (mt[4] ? +mt[4].slice(1) : 90) : (mt[3] ? v : 90), rt: (B62.indexOf(mt[2]) + 45) / 10 };
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
