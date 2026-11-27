// 터치라인 커리어 UI — 골 장면 다시보기 (v45) · 중계용 2D 경기장 (v46)
// 움직임은 ui_motion.js(속도·가속 한계가 있는 조향 이동, 공 물리). 결과(골·도움·슈팅 위치·상황)는 기록 그대로
// 기록에 없는 움직임(패스 경로·주변 선수 위치)은 그 경기 키로 고정된 난수로 만든다 (같은 골은 늘 같은 장면)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h } = U;
const NS = 'http://www.w3.org/2000/svg';
const el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a || {}) e.setAttribute(k, a[k]); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const shortN = n => { const t = String(n || '').split(' '); return t.length > 1 && t[t.length - 1].length > 2 ? t[t.length - 1] : String(n || ''); };
U.shortName = shortN;

// ---------- 장면 재생 (ui_motion.js 엔진) ----------
// frames를 실제 시간(×speed)으로 재생한다. 프레임 사이는 보간 → 부드럽게
function playFrames(cv, frames, info, o) {
  const M = U.MOT, n = frames.length, labs = (frames.meta && frames.meta.labels) || [];
  let t0 = null, raf = 0, stop = false, buf = null, prevT = 0, el = 0;
  const flashAt = (labs.find(l => l[1] === 'GOAL') || [])[0];
  function frame(ts) {
    if (stop) return;
    if (t0 == null) { t0 = ts; prevT = ts; }
    el += (ts - prevT) / 1000 * (o.speed ? o.speed() : 1); prevT = ts;
    const fi = el / M.DT, i = Math.min(n - 2, Math.floor(fi)), u = Math.min(1, fi - i);
    buf = M.lerpF(frames[Math.max(0, i)], frames[Math.min(n - 1, i + 1)], u, buf);
    let flash = null;
    if (flashAt != null && fi >= flashAt) flash = { t: 'GOAL', a: Math.min(1, (fi - flashAt) / 10), col: o.flashCol };
    else { const L = labs.filter(l => l[1] !== 'GOAL' && l[1] !== '슈팅' && fi >= l[0] && fi < l[0] + 40).pop(); if (L) flash = { t: L[1], a: Math.min(1, (fi - L[0]) / 6) * (1 - Math.max(0, (fi - L[0] - 28) / 12)), col: '#000' }; }
    M.draw(cv, buf, info, { flash });
    if (o.onT) o.onT(Math.min(1, fi / (n - 1)));
    if (fi >= n - 1) { if (o.done) o.done(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stop = true; cancelAnimationFrame(raf); };
}
U.playFrames = playFrames;
// 기록 → 장면 인자
function sceneArgs(g, atk) {
  const sh = g.sh || {};
  const kind = g.res ? ({ '골': 'goal', '선방': 'save', '빗나감': 'miss', '골대': 'post', '막힘': 'block' }[g.res] || 'miss') : 'goal';
  return { atk, scorer: g.k === 'o' ? null : g.p, ast: g.k === 'o' ? null : g.a, kind, sit: g.k === 'p' ? '페널티킥' : sh.sit, type: sh.type, dx: sh.dx, dy: sh.dy, k: g.k };
}
U.sceneArgs = sceneArgs;
function infoFor(S, teams, keyIds, nameOf) {
  return i => { const p = S.P[i]; if (!p) return null; const T = teams[p.s]; return { col: T.col, gkc: '#1d1d1d', ring: p.gk ? T.col : null, gk: p.gk, me: p.id === 'ME', label: shortN(nameOf(p.id)), always: p.id === 'ME' || keyIds.includes(p.id) }; };
}
U.motionInfo = infoFor;
// ---------- 화면 ----------
// goals: [{ s, m, p, a, k, sh }] · teams: [{ name, col, ln:[{id,pos,role,on,off}] }] · nameOf(id)
const rgb = c => { const m = String(c || '').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i); return m ? [1, 2, 3].map(i => parseInt(m[i], 16)) : null; };
const cdist = (a, b) => { const x = rgb(a), y = rgb(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) : 999; };
U.goalReplay = function (opt) {
  const goals = opt.goals || []; if (!goals.length) return;
  // 점으로만 보이므로 두 팀 색이 비슷하면 원정 팀을 흰색 계열로
  if (opt.teams && cdist(opt.teams[0].col, opt.teams[1].col) < 150) opt.teams[1].col = cdist(opt.teams[0].col, '#f4f4f4') > 150 ? '#f4f4f4' : '#ffb020';
  let gi = clamp(opt.start || 0, 0, goals.length - 1), spd = 1, stopF = null, auto = !!opt.auto;
  U.overlay(close => {
    const cv = h('canvas', { class: 'rpcv' }), stage = h('div', { class: 'rpstage' }, cv), cap = h('div', { class: 'rpcap' }), bar = h('i'), prog = h('div', { class: 'rpbar' }, bar);
    const cnt = h('span', { class: 'mute' });
    const run = () => {
      if (stopF) stopF();
      const g = goals[gi], atk = g.k === 'o' ? g.s : g.s, tA = opt.teams[atk], tD = opt.teams[1 - atk];
      const onAt = t => (t.ln || []).filter(p => (p.on || 0) <= g.m && (p.off == null || p.off >= g.m || p.off >= 90)).sort((a, b) => (b.role === 'GK') - (a.role === 'GK')).slice(0, 11);
      const teams = [0, 1].map(s => ({ col: opt.teams[s].col, ln: onAt(opt.teams[s]) }));
      if (!teams[0].ln.length || !teams[1].ln.length) return;
      const M = U.MOT, S0 = M.mkState(teams, atk === 0 ? [1, -1] : [-1, 1], M.hash('rp|' + (opt.key || '') + '|' + g.m + '|' + g.p));
      const frames = M.scene(S0, sceneArgs(g, atk));
      const kind = g.k === 'p' ? '페널티킥' : g.k === 'o' ? '자책골' : [g.sh && g.sh.type, g.sh && g.sh.sit].filter(Boolean).join(' · ');
      cap.replaceChildren(...[h('span', { class: 'rpmin', style: { background: tA.col } }, `${g.m}'`), h('b', null, g.k === 'o' ? opt.nameOf(g.p) + ' (자책)' : opt.nameOf(g.p)), g.a && g.k !== 'o' ? h('span', { class: 'mute' }, ` · 도움 ${opt.nameOf(g.a)}`) : null, h('span', { class: 'mute' }, ` · ${tA.name}${kind ? ' · ' + kind : ''}`), g.sh && g.sh.dx && g.k !== 'p' ? h('span', { class: 'mute' }, ` · ${Math.round(Math.hypot(g.sh.dx, g.sh.dy || 0))}m`) : null].filter(Boolean));
      cnt.textContent = goals.length > 1 ? `${gi + 1} / ${goals.length}` : '';
      const info = infoFor(S0, teams, [g.p, g.a].filter(Boolean), opt.nameOf);
      stopF = playFrames(cv, frames, info, { speed: () => spd, flashCol: tA.col, onT: x => { bar.style.width = clamp(x, 0, 1) * 100 + '%'; }, done: () => { if (auto && gi < goals.length - 1) setTimeout(() => { if (!stopF) return; gi++; run(); }, 900); } });
    };
    const spdB = h('button', { class: 'btn ghost sm', onclick: e => { spd = spd === 1 ? .5 : spd === .5 ? 2 : 1; e.currentTarget.textContent = `속도 ${spd}x`; } }, '속도 1x');
    const ctrl = h('div', { class: 'rpctl' },
      goals.length > 1 ? h('button', { class: 'btn ghost sm', onclick: () => { gi = (gi - 1 + goals.length) % goals.length; run(); } }, '◀ 이전') : null,
      h('button', { class: 'btn sm', onclick: () => run() }, '다시 보기'),
      goals.length > 1 ? h('button', { class: 'btn ghost sm', onclick: () => { gi = (gi + 1) % goals.length; run(); } }, '다음 ▶') : null,
      spdB, cnt);
    const legend = h('div', { class: 'rpleg' }, ...opt.teams.map(t => h('span', null, h('i', { style: { background: t.col } }), t.name)));
    close.x = () => { if (stopF) stopF(); stopF = null; close(); };
    setTimeout(run, 60);
    return [h('div', { class: 'head' }, h('div', { class: 'lbl' }, opt.title || '골 장면 다시보기'), h('h2', { style: { margin: '2px 0 0', fontSize: '18px' } }, opt.sub || '')),
      h('div', { class: 'body' }, legend, stage, prog, cap, ctrl, h('div', { class: 'mute', style: { fontSize: '11px' } }, '기록된 슈팅 위치·상황·도움을 바탕으로 재구성한 장면입니다. 주변 선수의 움직임은 실제와 다를 수 있습니다.'))];
  }, { cls: 'rpbox' });
};
// 경기 상세(U.showMatch)에서 쓰는 도우미: 기록 d와 경기 통계 ms로 골 목록·팀 정보를 만든다
U.replayData = function (d, ms, names, cols) {
  const goals = (d.ev || []).filter(e => 'gpo'.includes(e.k)).map(e => {
    const atk = e.k === 'o' ? 1 - e.s : e.s;
    const sh = ms && ms.shots ? ms.shots.find(x => x.s === e.s && x.m === e.m && x.p === e.p && x.res === '골') : null;
    return { s: e.k === 'o' ? e.s : e.s, m: e.m, p: e.p, a: e.a, k: e.k, sh: sh ? { dx: sh.dx, dy: sh.dy, sit: sh.sit, type: sh.type } : null, atk };
  }).sort((a, b) => a.m - b.m);
  const teams = [0, 1].map(s => ({ name: names[s], col: cols[s], ln: ms && ms.PL ? ms.PL[s].map(p => ({ id: p.id, pos: p.pos, role: p.role, on: p.on, off: p.off })) : [] }));
  return { goals, teams };
};
})(window);
// ================= 중계용 2D 경기장 (v46) =================
// 평소: 각본 없는 흐름을 실제의 약 2.5배 속도로 / 주요 장면(골·결정적 기회·퇴장): 기록대로 실제 속도로 재생
// o: { teams:[{col, name, ln:[{id,pos,role,on,off}]}], nameOf, key, home(홈 팀 side, 전반에 오른쪽 공격) }
(function (G) {
const U = G.TCUI, h = U.h;
U.liveField = function (o) {
  const M = U.MOT; if (!M) return null;
  const AMB = 2.5;
  const cv = h('canvas', { class: 'lfcv' }), cap = h('div', { class: 'lfcap' }), wrap = h('div', { class: 'lfwrap' }, cv, cap);
  const onAt = (s, m) => (o.teams[s].ln || []).filter(p => (p.on || 0) <= m && (p.off == null || p.off > m || (p.off >= 90 && m >= 90))).sort((a, b) => (b.role === 'GK') - (a.role === 'GK')).slice(0, 11);
  let half = 1, min = 0, S = null, mode = 'amb', raf = 0, last = 0, acc = 0, sceneStop = null, sceneDone = null, resetT = 0, resetSide = 0, dead = false;
  const dirsFor = hf => hf === 1 ? [1, -1] : [-1, 1];
  const teamsAt = m => [0, 1].map(s => ({ col: o.teams[s].col, ln: onAt(s, m) }));
  function build(m, kickSide) {
    S = M.mkState(teamsAt(m), dirsFor(half), M.hash((o.key || '') + '|' + half));
    M.kickoffPlace(S, kickSide);
  }
  // 교체·퇴장: 명단이 바뀌면 들어온 선수가 나간 선수 자리에서 이어 간다
  function sync(m) {
    if (!S) return;
    for (let s = 0; s < 2; s++) {
      const want = onAt(s, m), ids = new Set(want.map(p => String(p.id))), cur = S.P.filter(p => p.s === s);
      const gone = cur.filter(p => !ids.has(String(p.id))), have = new Set(cur.map(p => String(p.id))), add = want.filter(p => !have.has(String(p.id)));
      for (const q of add) { const g = gone.shift(); if (!g) break; g.id = q.id; g.pos = q.pos || g.pos; }
      for (const g of gone) { const i = S.P.indexOf(g); if (i >= 0) S.P.splice(i, 1); if (S.ball.owner === g) S.ball.owner = null; }
    }
  }
  const info = i => { const p = S && S.P[i]; if (!p) return null; const T = o.teams[p.s]; return { col: T.col, gkc: '#1d1d1d', ring: p.gk ? T.col : null, gk: p.gk, me: p.id === 'ME', label: U.shortName ? U.shortName(o.nameOf(p.id)) : o.nameOf(p.id), always: p.id === 'ME' }; };
  build(0, o.home != null ? o.home : 0);
  function loop(ts) {
    if (dead) return;
    const dt = last ? Math.min(.1, (ts - last) / 1000) : 0; last = ts;
    if (mode === 'amb' || mode === 'reset') {
      acc += dt * AMB;
      let n = 0;
      while (acc >= M.DT && n++ < 12) {
        acc -= M.DT;
        if (mode === 'reset') { M.step(S, (S2, tasks) => { for (const p of S2.P) { const T0 = p.tko; if (T0) tasks.set(p, [T0[0], T0[1], .55]); } }); resetT -= M.DT; if (resetT <= 0) { M.kickoffPlace(S, resetSide); S.mode = 'play'; mode = 'amb'; } }
        else M.ambientStep(S);
      }
      M.draw(cv, M.snap(S), info, null);
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  // 골 뒤: 각자 자기 진영 킥오프 자리로 걸어간다
  function toKickoff(side) {
    const T = M.mkState([0, 1].map(s => ({ col: '', ln: S.P.filter(p => p.s === s).map(p => ({ id: p.id, pos: p.pos, role: p.gk ? 'GK' : p.pos })) })), S.dirs, 1);
    M.kickoffPlace(T, side);
    for (const p of S.P) { const q = T.P.find(x => x.id === p.id && x.s === p.s); p.tko = q ? [q.x, q.y] : null; }
    S.ball.owner = null; S.ball.fl = null; S.ball.roll = null; S.ball.x = 52.5; S.ball.y = 34; S.mode = 'dead';
    resetSide = side; resetT = 3.2; mode = 'reset';
  }
  function afterScene(ev) {
    S.celeCtl = null; S.amb = null; S.live = false;
    for (const p of S.P) { p.down = 0; p.stun = 0; p.dive = null; }
    if (ev.kind === 'goal') { toKickoff(1 - ev.atk); return; }
    const b = S.ball;
    if (b.x < 0 || b.x > 105 || b.y < 0 || b.y > 68 || !b.owner) { // 골킥·스로인 대신: 가까운 골키퍼나 선수가 공을 잡고 다시 시작
      const ins = b.x < 0 || b.x > 105;
      const gs = ins ? (b.x > 52.5 ? (S.dirs[0] > 0 ? 1 : 0) : (S.dirs[0] > 0 ? 0 : 1)) : null;
      const who = ins ? S.P.find(p => p.s === gs && p.gk) : S.P.slice().sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (who) { b.fl = null; b.roll = null; b.owner = who; S.poss = who.s; b.x = who.x; b.y = who.y; }
    }
    S.mode = 'play'; mode = 'amb';
  }
  const api = {
    el: wrap,
    busy: () => mode === 'scene',
    setMin(m) {
      min = m;
      if (half === 1 && m > 45) { half = 2; cap.textContent = ''; build(46, o.home != null ? 1 - o.home : 1); }
      sync(m);
    },
    // ev: { m, kind, atk, args } → 장면을 실제 속도로 보여 주고 끝나면 resolve
    scene(ev) {
      return new Promise(res => {
        if (!S) return res();
        sync(ev.m);
        const keep = M.snap(S);
        S.live = true; S.amb = null;
        let frames;
        try { frames = M.scene(S, Object.assign({}, ev.args, { atk: ev.atk })); } catch (e) { console.error(e); S.live = false; return res(); }
        if (!frames || frames.length < 2) { afterScene(ev); return res(); }
        mode = 'scene';
        wrap.classList.add('slow');
        cap.textContent = ev.cap || '';
        if (frames.meta && frames.meta.cut) { wrap.classList.add('cut'); setTimeout(() => wrap.classList.remove('cut'), 350); }
        const fin = () => { if (mode !== 'scene') return; sceneStop = null; wrap.classList.remove('slow'); cap.textContent = ''; afterScene(ev); res(); };
        sceneDone = fin;
        // 공 쪽 팀 색으로 GOAL
        sceneStop = U.playFrames(cv, frames, info, { flashCol: o.teams[ev.atk].col, done: () => setTimeout(fin, 250) });
        void keep;
      });
    },
    skip() { if (mode === 'scene') { if (sceneStop) sceneStop(); if (sceneDone) sceneDone(); } },
    destroy() { dead = true; cancelAnimationFrame(raf); if (sceneStop) sceneStop(); }
  };
  return api;
};
})(window);
