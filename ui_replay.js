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
  const M = U.MOT, n = frames.length, labs = ((frames.meta && frames.meta.labels) || []).slice();
  let t0 = null, raf = 0, stop = false, buf = null, prevT = 0, el = 0, li = 0;
  function frame(ts) {
    if (stop) return;
    if (t0 == null) { t0 = ts; prevT = ts; }
    el += (ts - prevT) / 1000 * (o.speed ? o.speed() : 1); prevT = ts;
    const fi = el / M.DT, i = Math.min(n - 2, Math.floor(fi)), u = Math.min(1, fi - i);
    buf = M.lerpF(frames[Math.max(0, i)], frames[Math.min(n - 1, i + 1)], u, buf);
    while (li < labs.length && fi >= labs[li][0]) { if (o.onLabel) o.onLabel(labs[li][1]); li++; }
    M.draw(cv, buf, info, null);
    if (o.onT) o.onT(Math.min(1, fi / (n - 1)));
    if (fi >= n - 1) { if (o.done) o.done(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stop = true; cancelAnimationFrame(raf); };
}
// 경기장 위 점수판: 팀 이름 · 점수 · 시간만
function scoreboard(names, cols) {
  const sA = h('b'), sB = h('b'), mn = h('span', { class: 'sbm' });
  const el0 = h('div', { class: 'sbd' }, h('i', { style: { background: cols[0] } }), h('span', null, names[0]), sA, h('em', null, '-'), sB, h('span', null, names[1]), h('i', { style: { background: cols[1] } }), mn);
  return { el: el0, set(a, b, m) { sA.textContent = a; sB.textContent = b; if (m != null) mn.textContent = m; } };
}
U.scoreboard = scoreboard;
U.playFrames = playFrames;
// 기록 → 장면 인자
function sceneArgs(g, atk) {
  const sh = g.sh || {};
  const kind = g.res ? ({ '골': 'goal', '선방': 'save', '빗나감': 'miss', '골대': 'post', '막힘': 'block' }[g.res] || 'miss') : 'goal';
  return { atk, scorer: g.k === 'o' ? null : g.p, ast: g.k === 'o' ? null : g.a, kind, sit: g.k === 'p' ? '페널티킥' : sh.sit, type: sh.type, dx: sh.dx, dy: sh.dy, k: g.k };
}
U.sceneArgs = sceneArgs;
function infoFor(S, teams, keyIds, nameOf) {
  return i => { const p = S.P[i]; if (!p) return null; const T = teams[p.s]; return { col: T.col, gkc: '#1d1d1d', ring: p.gk ? T.col : null, gk: p.gk, me: p.id === 'ME', label: p.id === 'ME' ? shortN(nameOf(p.id)) : null, always: p.id === 'ME' }; };
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
    const cv = h('canvas', { class: 'rpcv' }), SB = scoreboard(opt.teams.map(t => t.name), opt.teams.map(t => t.col)), stage = h('div', { class: 'rpstage' }, cv, SB.el), cap = h('div', { class: 'rpcap' }), bar = h('i'), prog = h('div', { class: 'rpbar' }, bar);
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
      const before = [0, 1].map(sd => goals.slice(0, gi).filter(x => x.s === sd).length); SB.set(before[0], before[1], `${g.m}'`);
      stopF = playFrames(cv, frames, info, { speed: () => spd, onLabel: l => { if (l === 'goal') { before[g.s]++; SB.set(before[0], before[1]); } }, onT: x => { bar.style.width = clamp(x, 0, 1) * 100 + '%'; }, done: () => { if (auto && gi < goals.length - 1) setTimeout(() => { if (!stopF) return; gi++; run(); }, 900); } });
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
// 평소에는 숨어 있고(중계는 원래대로 흐름), 하이라이트 순간에만 나타나 그 장면을 실제 속도로 재생한다
// o: { teams:[{col, name, fm, ln:[{id,pos,role,sl,on,off}]}], nameOf, key }
(function (G) {
const U = G.TCUI, h = U.h;
U.liveField = function (o) {
  const M = U.MOT; if (!M) return null;
  const cv = h('canvas', { class: 'lfcv' }), SB = U.scoreboard(o.teams.map(t => t.name), o.teams.map(t => t.col));
  const wrap = h('div', { class: 'lfwrap' }, cv, SB.el);
  const box = h('div', { class: 'lfbox' }, wrap);
  const onAt = (sd, m) => (o.teams[sd].ln || []).filter(p => (p.on || 0) <= m && (p.off == null || p.off > m || (p.off >= 90 && m >= 90))).sort((a, b) => (b.role === 'GK') - (a.role === 'GK')).slice(0, 11);
  let busy = false, stopF = null, finF = null, hideT = null;
  const info = S => i => { const p = S.P[i]; if (!p) return null; const T = o.teams[p.s]; return { col: T.col, gkc: '#1d1d1d', ring: p.gk ? T.col : null, gk: p.gk, me: p.id === 'ME', label: p.id === 'ME' ? (U.shortName ? U.shortName(o.nameOf(p.id)) : '') : null, always: p.id === 'ME' }; };
  return {
    el: box,
    busy: () => busy,
    // ev: { m, atk, args, score:[a,b] } → 나타나서 재생, 끝나면 잠시 뒤 사라짐
    scene(ev) {
      return new Promise(res => {
        const m = ev.m, half = m > 45 ? 2 : 1;
        const teams = [0, 1].map(sd => ({ col: o.teams[sd].col, fm: o.teams[sd].fm, ln: onAt(sd, m) }));
        if (!teams[0].ln.length || !teams[1].ln.length) return res();
        let frames, S;
        try { S = M.mkState(teams, half === 1 ? [1, -1] : [-1, 1], M.hash((o.key || '') + '|' + m + '|' + ev.atk)); frames = M.scene(S, Object.assign({}, ev.args, { atk: ev.atk })); } catch (e) { console.error(e); return res(); }
        if (!frames || frames.length < 2) return res();
        busy = true; clearTimeout(hideT);
        const sc = ev.score.slice(); SB.set(sc[0], sc[1], ev.clock || (U.fmtMin ? U.fmtMin(m) : m + "'"));
        box.classList.add('on');
        const fin = () => { if (!busy) return; busy = false; stopF = null; finF = null; hideT = setTimeout(() => box.classList.remove('on'), 900); res(); };
        finF = fin;
        stopF = U.playFrames(cv, frames, info(S), { onLabel: l => { if (l === 'goal') { sc[ev.atk]++; SB.set(sc[0], sc[1]); } }, done: () => setTimeout(fin, 700) });
      });
    },
    skip() { if (busy) { if (stopF) stopF(); if (finF) finF(); } },
    destroy() { if (stopF) stopF(); clearTimeout(hideT); busy = false; }
  };
};
})(window);
