// 터치라인 커리어 — 하이라이트 연출 (v49)
// 터치라인 경기 엔진(tl_engine.js)을 그대로 돌려 실제 움직임으로 장면을 만든다.
// 결과(득점자·도움·슈팅 위치·결과)는 기록 그대로: 엔진의 판단에 가중치를 얹어(득점자·도움 선수 쪽으로) 유도하고,
// 슈팅 결과만 기록대로 맞춘다. 공을 빼앗기거나 경기가 끊기면 그 시도는 버리고 다른 난수로 다시 (최대 수십 번, 한 번에 수십 ms)
// U.HLX.make(spec) → clip | null · U.HLX.play(host, clip, opt) → stop()
(function (G) {
'use strict';
const U = G.TCUI = G.TCUI || {};
const HL = 52.5, HW = 34, GW = 3.66;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hyp = Math.hypot;
const EN = () => G.FMEngine, D = () => G.FMDATA;
const PMAP = { CDM: 'DM', CAM: 'AM', CF: 'ST', LF: 'LW', RF: 'RW', LS: 'ST', RS: 'ST' };
const code = p => PMAP[p] || p || 'CM';
// 포메이션 자리 번호가 없을 때 포지션별 기본 자리 [깊이 0~1, 폭 -1~1]
const DEF = { GK: [.03, 0], CB: [.18, 0], LB: [.22, -.8], RB: [.22, .8], LWB: [.46, -.86], RWB: [.46, .86], DM: [.36, 0], CM: [.5, 0], AM: [.65, 0], LM: [.5, -.8], RM: [.5, .8], LW: [.76, -.72], RW: [.76, .72], ST: [.84, 0] };
const SPRD = { CB: .5, DM: .48, CM: .7, AM: .5, ST: .36 };
function hexDark(c) { const m = String(c || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i); if (!m) return '#111'; const v = [1, 2, 3].map(i => parseInt(m[i], 16)), l = (v[0] * .3 + v[1] * .59 + v[2] * .11) / 255; return l > .55 ? '#16202a' : '#f2f4f7'; }
const ink = c => hexDark(c) === '#16202a' ? '#101410' : '#ffffff';

// ---------- 팀 만들기 ----------
// src: { name, short, col, fm, ln:[{id,pos,role,sl}] }, nameOf(id), ovrOf(id)
function statsOf(id, nm, pos, ovr) {
  const F = G.FC27;
  if (F && /^\d+$/.test(String(id)) && F.P[+id] && F.stats) { const st = F.P[+id][13], K = F.stats, o = {}; if (typeof st === 'string') { for (let j = 0; j < K.length; j++) o[K[j]] = clamp(st.charCodeAt(j) - 32, 1, 99); return o; } }
  return D().genStats(String(nm || id), pos, ovr || 65);
}
function teamOf(side, src, nameOf, ovrOf) {
  const FS = G.TC && G.TC.FORMS && src.fm && G.TC.FORMS[src.fm];
  let ln = (src.ln || []).slice(0, 11);
  const useF = FS && ln.every(p => p.sl != null && FS[p.sl]);
  if (useF) ln.sort((a, b) => a.sl - b.sl); else ln.sort((a, b) => ((b.role === 'GK' || b.pos === 'GK') - (a.role === 'GK' || a.pos === 'GK')));
  const cnt = {}, idx = {};
  if (!useF) for (const p of ln) { const c = code(p.pos === 'GK' || p.role === 'GK' ? 'GK' : p.pos); cnt[c] = (cnt[c] || 0) + 1; }
  const slots = [], players = [], lineup = [];
  for (const p of ln) {
    let cd, dep, wid;
    if (useF) { const f = FS[p.sl]; cd = code(f[0]); dep = clamp(f[2] / 100, .03, .9); wid = clamp((f[1] - 50) / 50, -.92, .92); }
    else { cd = code(p.pos === 'GK' || p.role === 'GK' ? 'GK' : p.pos); const b = DEF[cd] || DEF.CM; const n = cnt[cd] || 1, i = idx[cd] = (idx[cd] || 0) + 1; dep = b[0]; wid = n > 1 ? clamp(b[1] + (i - 1 - (n - 1) / 2) * (SPRD[cd] || .4), -.9, .9) : b[1]; }
    if (!EN().FORMATIONS['4-3-3'].some(s => s[0] === cd) && !DEF[cd]) cd = 'CM';
    slots.push([cd, dep, wid, (EN().DEFAULT_ROLE || {})[cd] || 'cm']);
    const nm = nameOf(p.id) || String(p.id), ov = ovrOf(p.id) || 65;
    const d = { id: String(p.id), name: nm, pos: cd, ovr: ov, stats: statsOf(p.id, nm, cd, ov), fam: { _: 1, [cd]: 3 }, pt: [] };
    players.push(d); lineup.push(d.id);
  }
  while (slots.length < 11) { slots.push(['CM', .45, 0, 'cm']); lineup.push('__none' + slots.length); }
  const best = k => players.filter(d => d.pos !== 'GK').sort((a, b) => (b.stats[k] || 0) - (a.stats[k] || 0))[0] || players[0];
  const setup = { formation: '4-3-3', slots, lineup, bench: [], roles: slots.map(s => s[3]), instr: slots.map(() => EN().DEFAULT_INSTR()), tactics: EN().DEFAULT_TACTICS(), captain: lineup[0], takers: { pen: best('penalties').id, fk: best('freeKick').id, corner: best('crossing').id } };
  return { team: { id: 'T' + side, name: src.name || '', short: src.short || src.name || '', color1: src.col, color2: hexDark(src.col), players }, setup };
}

// ---------- 연출 ----------
// spec: { teams:[src,src], atk, kind, scorer, ast, sit, type, dx, dy, k, pk, foul, half(1|2), seed, nameOf, ovrOf }
function newMatch(spec, seed) {
  const E = EN();
  const teams = [0, 1].map(s => teamOf(s, spec.teams[s], spec.nameOf, spec.ovrOf));
  for (const t of teams) t.setup.tactics = Object.assign({}, t.setup.tactics);
  const M = E.createMatch({ seed, teams, aiSides: [], neutral: true });
  if (spec.half === 2) { M.teams[0].dir = -1; M.teams[1].dir = 1; }
  return M;
}
const findP = (T, id) => id == null ? null : T.players.find(p => p.d.id === String(id) && !p.off) || null;
const fwd = (T, x) => x * T.dir;
// 공 위치 기준으로 모두 제자리에 두기 (엔진의 위치 계산을 몇 번 돌려 바로 그 자리로)
function settle(M, n) { const X = EN()._d; for (let k = 0; k < (n || 3); k++) { X.computeTargets(M); for (const p of M.pidList) if (!p.off && p !== M.ball.owner) { p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0; } } for (const p of M.pidList) p.face = p.team.dir > 0 ? 0 : Math.PI; }
function give(M, p, x, y) { const b = M.ball; p.x = x; p.y = y; p.vx = p.vy = 0; b.owner = p; b.held = false; b.flight = null; b.x = x + p.team.dir * .55; b.y = y; b.z = .11; b.vx = b.vy = b.vz = 0; b.last = p; p.gainT = M.t - 1; p.decT = .5 + M.rng() * .5; p.face = p.team.dir > 0 ? 0 : Math.PI; }

function attempt(spec, seed) {
  const E = EN(), X = E._d;
  const M = newMatch(spec, seed), A = spec.atk, T = M.teams[A], O = M.teams[1 - A], r = M.rng;
  const scorer = findP(T, spec.scorer) || T.players.filter(p => p.code === 'ST' || p.code === 'LW' || p.code === 'RW')[0] || T.players[T.players.length - 1];
  let ast = findP(T, spec.ast); if (ast === scorer) ast = null;
  const want = spec.kind || 'goal', pk = spec.pk || null;
  const pen = spec.k === 'p' || spec.sit === '페널티킥', head = spec.type === '헤더' && !pk;
  const dx = pen ? 11 : clamp(spec.dx != null ? spec.dx : 10 + r() * 8, 3, 60), dy = clamp(spec.dy != null ? spec.dy : (r() - .5) * 14, -24, 24);
  const P = [T.dir * (HL - dx), dy * T.dir]; // 슈팅 지점 (경기장 좌표)
  const sit = pen ? 'pen' : want === 'red' ? 'red' : (pk === 'fk' || (spec.sit === '세트피스' && dx > 17)) ? 'fk' : spec.sit === '코너킥' ? 'corner' : spec.sit === '세트피스' ? 'setp' : spec.sit === '역습' ? 'counter' : pk === 'solo' ? 'solo' : 'open';
  const counter = sit === 'counter';
  const minPass = counter ? 1 : sit === 'red' ? 1 : sit === 'solo' ? 1 : 2 + Math.floor(r() * 2);
  const p0 = () => T.st.passes;
  let passes0 = 0, t0 = 0, live = false, shotAt = null, endAt = null, fail = null, fouled = false;
  const S = { M, scorer, ast, P, sit, aux: [], A };
  // ---- 시작 상황 ----
  M.phase = 'play'; M.restart = null; M.dirSafe = A;
  const outf = T.players.filter(p => p.code !== 'GK' && p !== scorer && p !== ast);
  const pick = f => { const L = outf.filter(f); return L.length ? L[Math.floor(r() * L.length)] : outf[0] || scorer; };
  if (sit === 'pen' || sit === 'corner' || sit === 'fk' || sit === 'setp') {
    let type = 'freekick', x = P[0], y = P[1];
    if (sit === 'pen') { type = 'penalty'; T.setup.takers.pen = scorer.d.id; x = T.dir * (HL - 11); y = 0; }
    else if (sit === 'corner') { type = 'corner'; const sg = dy >= 0 ? 1 : -1; x = T.dir * (HL - .4); y = sg * (HW - .4); const tk = ast || pick(p => /LW|RW|LM|RM|AM|CM/.test(p.code)); T.setup.takers.corner = tk.d.id; ast = tk; }
    else if (sit === 'fk') { T.setup.takers.fk = scorer.d.id; T.setup.tactics.fkDirect = 'shoot'; }
    else { const tk = ast || pick(p => /LW|RW|LM|RM|AM|CM/.test(p.code)); ast = tk; x = T.dir * clamp(HL - dx - 22, 18, 40); y = clamp(dy + (dy >= 0 ? 16 : -16), -30, 30) * T.dir; T.setup.takers.fk = tk.d.id; T.setup.tactics.fkWide = 'cross'; }
    M.ball.x = x; M.ball.y = y;
    // 위치를 잡을 시간: 공 근처에서 엔진의 재시작 배치 → 바로 그 자리로
    X.setRestart(M, type, T, x, y);
    for (const p of M.pidList) if (!p.off) { p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0; p.face = Math.atan2(M.ball.y - p.y, M.ball.x - p.x); }
    if (M.restart) M.restart.timer = sit === 'pen' ? 2.2 : 2.6;
  } else {
    // 열린 플레이: 시작할 선수와 공 위치
    let c0, bx, by;
    if (sit === 'solo') { c0 = scorer; bx = T.dir * clamp(HL - dx - 22 - r() * 10, -5, 30); by = clamp(dy * 1.3 + (r() - .5) * 10, -26, 26) * T.dir; }
    else if (counter) { c0 = pick(p => /DM|CM|CB/.test(p.code)); bx = T.dir * (-22 + r() * 14); by = (r() - .5) * 36; }
    else { c0 = pick(p => /CB|DM|LB|RB/.test(p.code)); bx = T.dir * (-30 + r() * 14); by = (r() - .5) * 38; }
    if (counter) {
      // 상대가 공격하다가 빼앗긴 상황: 상대는 높이 올라와 있고 우리는 내려앉아 있다
      const o0 = O.players.filter(p => p.code === 'AM' || p.code === 'CM' || p.code === 'ST')[0] || O.players[5];
      give(M, o0, bx - T.dir * 1.2, by); settle(M, 3);
      give(M, c0, bx, by); T.winT = M.t; T.winX = fwd(T, bx); o0.stun = .6;
    } else { give(M, c0, bx, by); settle(M, 3); give(M, c0, bx, by); }
  }
  passes0 = p0(); t0 = M.t;
  // ---- 엔진 판단에 가중치 ----
  const astSpot = head ? [T.dir * clamp(HL - dx - 8, HL - 24, HL - 4), (dy >= 0 ? 1 : -1) * T.dir * (HW - 4)] : null;
  M.dirAdj = (M2, p, opts, dGoal) => {
    if (p.team !== T) return;
    const n = p0() - passes0, el = M2.t - t0, ready = n >= minPass, isS = p === scorer, isA = p === ast, b = M2.ball;
    const dP = hyp(b.x - P[0], b.y - P[1]), urge = el > 12 ? 1.8 : 1;
    for (const o of opts) {
      if (o.k === 'shoot') { if (!isS || (!ready && sit !== 'solo') || (dP > 6.5 && dGoal > dx + 3.5)) o.u = -9; else o.u += 2; }
      else if (o.k === 'clear') o.u = -9;
      else if (o.k === 'pass') {
        const q = o.q;
        if (q === scorer) o.u += ast ? (isA ? (ready ? .05 : .004) : (ready ? -.002 : -.03)) : (ready ? .03 : -.02);
        else if (q === ast) o.u += ready ? .02 * urge : n >= minPass - 1 ? .008 : -.006;
        if (isS && ready && dP < 14) o.u -= .03; // 득점자는 마무리
        if (q.code === 'GK') o.u -= .03;
        o.u += Math.max(-.01, (fwd(T, o.cx) - fwd(T, b.x)) / 105) * .02 * urge;
        if (head && isA && q === scorer && o.kind !== 'cross') o.u -= .02;
        if (head && isA && q === scorer && o.kind === 'cross') o.u += .04;
      }
      else if (o.k === 'dribble') { if (isS && (ready || sit === 'solo') && dP > 2) o.u += .02; if (head && isA) o.u += .01; }
      else if (o.k === 'hold') o.u -= .006;
    }
  };
  // 득점자는 슈팅 지점 쪽으로, 도움 선수는 (헤더면) 측면 깊숙이 · 퇴장: 반칙할 선수가 공 가진 선수에게
  M.dirMove = M2 => {
    const b = M2.ball, own = b.owner;
    if (own && own.team === T && scorer !== own && !scorer.off) { const n = p0() - passes0, k = n >= minPass - 1 ? .75 : fwd(T, b.x) > -10 ? .45 : .2; scorer.tx = scorer.tx + (P[0] - scorer.tx) * k; scorer.ty = scorer.ty + (P[1] - scorer.ty) * k; if (k > .5) scorer.urg = 1; }
    if (astSpot && ast && own === ast) { ast.tx = astSpot[0]; ast.ty = astSpot[1]; ast.urg = 1; ast.dribbling = true; }
    if (sit === 'red' && !fouled && own && own.team === T && M2.t - t0 > 3.5) {
      const fd = findP(O, spec.foul) || O.players.filter(p => p.code !== 'GK' && !p.off).sort((a, c) => hyp(a.x - own.x, a.y - own.y) - hyp(c.x - own.x, c.y - own.y))[0];
      if (fd) { fd.tx = own.x; fd.ty = own.y; fd.urg = 1; if (hyp(fd.x - own.x, fd.y - own.y) < 1.4 || M2.t - t0 > 9) { fouled = true; M2.dirSafe = null; X.foul(M2, fd, own, true); if (!fd.off) X.card(M2, fd, 2); endAt = M2.t + 3.2; } }
    }
  };
  M.dirAerial = (M2, p) => p === scorer ? 30 : p.team === T ? 4 : 0;
  M.dirShot = (M2, p, Pm, res, gk, blockers, type, sampleShot) => {
    if (p.team !== T) return;
    const w = p === scorer ? want : 'miss';
    if (res.outcome !== w) {
      let ok = false;
      for (let i = 0; i < 400 && !ok; i++) { const x = sampleShot(M2, p, Pm, M2.xrng, gk, blockers); if (x.outcome === w) { Object.assign(res, x); ok = true; } }
      if (!ok) { const sg = r() < .5 ? -1 : 1; res.blocker = null; res.save = null;
        if (w === 'goal') { res.outcome = 'goal'; res.fy = sg * (GW - .7); res.fz = .4 + r(); }
        else if (w === 'save') { res.outcome = 'save'; res.fy = sg * (GW - 1.6); res.fz = .6; res.save = { caught: false, t: .3, depth: 1 }; }
        else if (w === 'post') { res.outcome = 'post'; res.fy = sg * GW; res.fz = .8; }
        else { res.outcome = 'miss'; res.fy = sg * (GW + 1.2 + r() * 2); res.fz = .6; } }
    }
    if (p === scorer) { shotAt = M2.t; S.shot = { t: M2.t, f: M2.rec.n, out: res.outcome }; }
  };
  M.dirPen = (M2, p) => { if (p !== scorer) return null; if (!shotAt) { shotAt = M2.t; S.shot = { t: M2.t, f: M2.rec.n, out: want === 'goal' ? 'goal' : want === 'save' ? 'save' : 'miss' }; } return want === 'goal' ? 'goal' : want === 'save' ? 'save' : 'miss'; };
  // ---- 돌리기 ----
  const maxT = sit === 'pen' ? 9 : sit === 'corner' || sit === 'setp' || sit === 'fk' ? 10 : 30;
  for (let k = 0; k < 600; k++) {
    E.step(M);
    if (M.tick % M.rec.every === 0) { const b = M.ball, f = b.flight; S.aux[M.rec.n - 1] = [b.owner ? b.owner.pid : -1, f && f.target ? f.target.pid : -1]; }
    if (M.phase === 'play') live = true;
    const b = M.ball, el = M.t - t0;
    if (!shotAt && !endAt) {
      if (b.owner && b.owner.team !== T && live) { fail = 'turnover'; break; }
      if (live && (M.phase === 'out' || M.phase === 'dead') && sit !== 'red') { fail = 'stop'; break; }
      if (el > maxT + 3) { fail = 'time'; break; }
    }
    if (shotAt && !endAt) { if (M.phase === 'goal') endAt = M.t + 3.4; else if (M.t - shotAt > 2.6 || M.phase === 'out') endAt = M.t + .8; }
    if (endAt && M.t >= endAt) break;
  }
  if (fail || (!shotAt && sit !== 'red') || (sit === 'red' && !fouled)) return { fail: fail || 'noshot' };
  // 기록과 맞는지: 골이면 실제로 들어갔는지, 도움 선수가 마지막 패스를 했는지
  const g = M.events.find(e => e.type === 'goal');
  if (want === 'goal' && !g) return { fail: 'nogoal' };
  if (want !== 'goal' && g) return { fail: 'extra-goal' };
  S.astOk = !ast || sit === 'corner' || sit === 'setp' ? true : (g ? M._astId === ast.d.id : true);
  S.events = M.events.filter(e => e.type === 'goal' || e.type === 'red' || e.type === 'save' || e.type === 'shot');
  S.n = M.rec.n; S.dur = S.n * DTF;
  return S;
}
const DTF = .2; // 녹화 간격 (엔진 0.1초 × 2)
// 여러 번 시도해 기록과 가장 잘 맞는 장면을 고른다 (도움까지 맞으면 바로)
function make(spec) {
  if (!EN() || !D()) return null;
  const base = (spec.seed >>> 0) || 1, t0 = (G.performance || Date).now();
  let best = null, tries = 0;
  for (let i = 0; i < 60; i++) {
    tries++;
    let S; try { S = attempt(spec, base + i * 7919); } catch (e) { console.error(e); return best; }
    if (S && !S.fail) { if (S.astOk) { S.tries = tries; return S; } if (!best) best = S; }
    if (((G.performance || Date).now() - t0) > 1800) break;
  }
  if (best) best.tries = tries;
  return best;
}

// ---------- 재생 ----------
function lerpFrame(a, b, t, out) {
  out.players.length = b.players.length; out.t = a.t + (b.t - a.t) * t; out.phase = b.phase; out.half = b.half;
  for (let i = 0; i < b.players.length; i++) {
    const p = a.players[i], q = b.players[i], o = out.players[i] || (out.players[i] = {});
    Object.assign(o, q);
    if (p && !p.hidden && !q.hidden && p.pid === q.pid && hyp(q.x - p.x, q.y - p.y) < 4) {
      o.x = p.x + (q.x - p.x) * t; o.y = p.y + (q.y - p.y) * t;
      let d = q.face - p.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; o.face = p.face + d * t;
    }
  }
  const jump = hyp(b.ball.x - a.ball.x, b.ball.y - a.ball.y) > 12;
  for (const k of ['x', 'y', 'z']) out.ball[k] = jump ? b.ball[k] : a.ball[k] + (b.ball[k] - a.ball[k]) * t;
  return out;
}
// 골키퍼 유니폼: 팀 색이 밝으면 어두운 색, 어두우면 밝은 색 (두 팀 골키퍼는 서로 다르게)
const GKC = [['#f2d14b', '#2b2f38'], ['#9be15d', '#5b2b6e']];
const shortN = n => { const t = String(n || '').split(' '); return t.length > 1 && t[t.length - 1].length > 2 ? t[t.length - 1] : String(n || ''); };
// opt: { speed(), onEvent(e, clipEvent), done(), meId }
function play(cv, S, opt) {
  const E = EN(), M = S.M, R = new G.Render2D(cv);
  const info = new Map();
  for (const p of M.pidList) { const T = M.teams[p.side], c1 = T.color1 || '#888', gk = p.code === 'GK'; info.set(p.pid, { pid: p.pid, num: p.num, short: shortN(p.name), gk, c1, c2: T.color2 || '#111', gkColor: gk ? GKC[p.side][hexDark(c1) === '#16202a' ? 1 : 0] : c1, textColor: gk ? ink(GKC[p.side][hexDark(c1) === '#16202a' ? 1 : 0]) : ink(c1) }); }
  const me = opt.meId != null ? (M.pidList.find(p => p.d.id === String(opt.meId)) || {}).pid : null;
  const fa = { players: [], ball: {} }, fb = { players: [], ball: {} }, fi = { players: [], ball: {} };
  let el = 0, prev = null, raf = 0, stop = false, sized = false;
  const shotF = S.shot ? S.shot.f : null;
  // 빌드업이 길면 슈팅 14초 전부터 (하이라이트처럼)
  const st0 = shotF != null ? Math.max(0, shotF - Math.round(14 / DTF)) : 0;
  const fire = new Set();
  function frame(ts) {
    if (stop) return;
    { const rc = cv.getBoundingClientRect(), d = Math.min(2, G.devicePixelRatio || 1); if (!sized || Math.abs(rc.width * d - cv.width) > 2 || Math.abs(rc.height * d - cv.height) > 2) { R.resize(); sized = true; } }
    if (prev == null) prev = ts;
    el += (ts - prev) / 1000 * (opt.speed ? opt.speed() : 1); prev = ts;
    const ph = st0 + el / DTF, i = Math.min(S.n - 2, Math.floor(ph)), u = clamp(ph - i, 0, 1);
    E.readFrame(M, i, fa); E.readFrame(M, i + 1, fb);
    const F = lerpFrame(fa, fb, u, fi);
    const ax = S.aux[i] || [-1, -1];
    R.draw(F, pid => info.get(pid), { names: 'carrier', carrier: ax[0] >= 0 ? ax[0] : null, recv: ax[1] >= 0 ? ax[1] : null, selected: me, cam2d: 'full' });
    // 결과가 나오는 순간에만 알림 (골·퇴장·슈팅 결과)
    for (const e of M.events) { if (fire.has(e) || e.frame > i || e.frame < st0) continue; if (e.type === 'goal' || e.type === 'red') { fire.add(e); if (opt.onEvent) opt.onEvent(e.type, e); } }
    if (shotF != null && !fire.has('shot') && S.shot.out !== 'goal' && i >= shotF + 4) { fire.add('shot'); if (opt.onEvent) opt.onEvent(S.shot.out, null); }
    if (opt.onT) opt.onT((ph - st0) / Math.max(1, S.n - 1 - st0));
    if (ph >= S.n - 1) { if (opt.done) opt.done(); return; }
    raf = requestAnimationFrame(frame);
  }
  const onR = () => { sized = false; };
  G.addEventListener && G.addEventListener('resize', onR);
  raf = requestAnimationFrame(frame);
  return () => { stop = true; cancelAnimationFrame(raf); G.removeEventListener && G.removeEventListener('resize', onR); };
}
U.HLX = { make, play, attempt, teamOf };
})(typeof window !== 'undefined' ? window : globalThis);
