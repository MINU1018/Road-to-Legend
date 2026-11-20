// Road to Legend — 조추첨 연출: 국내 컵(오픈 추첨 / 상·하위 리그 두 포트), UEFA 리그 페이즈(포트 추첨), 대륙 대회 토너먼트
// 결과는 엔진이 이미 정해 둔 대진(cups.js cupDraw, calendar.js potSchedule·contDraw)을 한 공씩 다시 보여 준다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest } = U;
const S = () => U.S();

// 하루치 추첨 목록 (달력·하루 경기 화면용)
C.calDayDraws = function (s, d) {
  const w = s.w, out = []; if (!w.cal) return out;
  for (const k in w.cal.cup) { const st = w.cal.cup[k]; for (const dr of st.draws || []) if (dr.d === d) out.push({ n: `${st.n} ${dr.n} 추첨`, k: 'C', key: st.k, ri: dr.ri, nat: st.nat, comp: st.nat + ':' + st.kind }); }
  for (const k in w.cal.cont) { const cs = w.cal.cont[k]; if (cs.drawD === d) out.push({ n: `${cs.name} 리그 페이즈 추첨`, k: 'E', key: cs.key, ri: -1, comp: cs.k }); for (const ri in cs.tdraw || {}) if (cs.tdraw[ri] === d) out.push({ n: `${cs.name} ${(cs.rounds[ri] || [])[2] || ''} 추첨`, k: 'E', key: cs.key, ri: +ri, comp: cs.k }); }
  return out;
};
U.isFollowDraw = function (x) { const F = U.fset ? U.fset() : null; if (!F) return true; return x.k === 'E' ? F.comp.has(x.comp) : F.cupNat.has(x.nat); };

const tn = (w, id) => (w.clubs[id] || {}).name || id;
const ts = (w, id) => (w.clubs[id] || {}).short || tn(w, id);

U.openDraw = function (ref) {
  const s = S(), w = s.w;
  let D = null;
  if (ref.k === 'C') {
    const st = w.cal && w.cal.cup[ref.key];
    const dr = st && ((st.draws || []).find(x => x.ri === ref.ri) || (st.cur && st.cur.ri === ref.ri ? st.cur : null));
    if (!dr) { U.toast('이 추첨 기록은 남아 있지 않습니다 (대회가 끝나면 지워집니다).'); return; }
    const tier = id => (st.tr || {})[id] || 0;
    D = { kind: 'pairs', title: `${st.n} ${dr.n} 추첨`, date: dr.d, mode: dr.mode, pots: dr.pots, potN: dr.mode === 'two' ? ['포트 1 · 상위 리그', '포트 2 · 하위 리그'] : ['추첨 항아리'], seq: dr.seq || dr.pairs, pairs: dr.pairs, odd: dr.odd, tier,
      note: dr.mode === 'two' ? '상위 리그 포트에서 한 팀, 하위 리그 포트에서 한 팀. 리그 등급이 낮은 팀이 홈 경기를 치릅니다.' : '공을 하나씩 뽑아 먼저 뽑힌 팀이 홈' + (/GER|ESP|FRA|POR|NED|BEL/.test(st.nat) ? ' (리그 등급이 낮은 팀이 있으면 그 팀이 홈)' : '') + '.' };
  } else {
    const cs = w.cal && w.cal.cont[ref.key];
    if (!cs) { U.toast('이 추첨 기록은 남아 있지 않습니다 (대회가 끝나면 지워집니다).'); return; }
    if (ref.ri < 0) {
      if (!cs.pots) { U.toast('이 대회는 포트 추첨 기록이 없습니다.'); return; }
      const opp = {}; for (const md of cs.md) for (const [a, b] of md) { (opp[a] = opp[a] || []).push([b, 1]); (opp[b] = opp[b] || []).push([a, 0]); }
      const r = C.seeded('draw|' + cs.key), order = [];
      cs.pots.forEach(p => { const q = p.slice(); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } order.push(...q); });
      D = { kind: 'phase', title: `${cs.name} 리그 페이즈 추첨`, date: cs.drawD, pots: cs.pots, opp, order, per: cs.pots.length === 4 ? 2 : 1,
        note: cs.pots.length === 4 ? '36팀을 전력순 4포트로 나눕니다. 각 팀은 포트마다 2팀(홈 1경기·원정 1경기)씩 모두 8팀과 만납니다. 같은 나라 팀끼리는 만나지 않고, 한 나라 팀은 최대 2팀까지만 상대합니다.' : '36팀을 6포트로 나눕니다. 각 팀은 포트마다 1팀씩 6팀과 만나고(홈 3·원정 3), 같은 나라 팀끼리는 만나지 않습니다.' };
    } else {
      const ties = cs.ties && cs.ties[ref.ri]; if (!ties) { U.toast('아직 추첨 전입니다.'); return; }
      const field = []; for (const t of ties) field.push(t[0], t[1]);
      D = { kind: 'pairs', title: `${cs.name} ${(cs.rounds[ref.ri] || [])[2] || ''} 추첨`, date: (cs.tdraw || {})[ref.ri], mode: 'open', pots: [field], potN: ['추첨 항아리'], seq: ties.map(t => [t[0], t[1]]), pairs: ties.map(t => [t[0], t[1]]), odd: null, tier: () => 0, note: '먼저 뽑힌 팀이 1차전 홈 경기를 치릅니다.' };
    }
  }
  if (D.date != null && w.cal && D.date > w.cal.d) { U.toast(`${C.fmtDateY(D.date)}에 추첨합니다.`); return; }
  const F = U.fset ? U.fset() : { club: new Set() };
  const mine = id => F.club.has(id) || (s.ss && s.ss.club === id);
  U.overlay(close => {
    const head = h('div', { class: 'head drhead' }, h('div', { class: 'lbl' }, '조추첨' + (D.date != null ? ' · ' + C.fmtDateY(D.date) : '')), h('h2', null, D.title), h('div', { class: 'mute', style: { fontSize: '12.5px' } }, D.note),
      h('button', { class: 'btn ghost sm mclose', onclick: () => { stop(); close(); } }, '닫기'));
    const body = h('div', { class: 'body drbody' });
    let timer = null, k = 0;
    const stop = () => { if (timer) clearInterval(timer); timer = null; autoB.textContent = '▶ 자동 추첨'; };
    const nextB = h('button', { class: 'btn gold' }, '다음 추첨'), autoB = h('button', { class: 'btn' }, '▶ 자동 추첨'), allB = h('button', { class: 'btn ghost' }, '결과 바로 보기');
    const ctl = h('div', { class: 'drctl' }, nextB, autoB, allB, h('span', { class: 'mute drprog' }));
    const chip = (id, cls) => h('span', { class: 'drb' + (cls ? ' ' + cls : '') + (mine(id) ? ' me' : ''), 'data-id': id, title: tn(w, id) }, crest(w.clubs[id] || null, 18), h('span', null, ts(w, id)), D.tier && D.tier(id) ? h('small', null, D.tier(id) + '부') : null);
    if (D.kind === 'pairs') {
      const potEls = D.pots.map((p, i) => h('div', { class: 'drpot' }, h('div', { class: 'lbl' }, `${D.potN[i] || '포트 ' + (i + 1)} · ${p.length}팀`), h('div', { class: 'drballs' + (p.length > 40 ? ' sm' : '') }, ...p.map(id => chip(id)))));
      const stage = h('div', { class: 'drstage' }, h('div', { class: 'drslot', id: 'drA' }, h('span', { class: 'mute' }, '첫 번째 공')), h('div', { class: 'drvs' }, 'vs'), h('div', { class: 'drslot', id: 'drB' }, h('span', { class: 'mute' }, '두 번째 공')));
      const list = h('div', { class: 'drlist' });
      body.append(h('div', { class: 'drpots' + (D.pots.length > 1 ? ' two' : '') }, ...potEls), stage, ctl, h('div', { class: 'msec' }, h('h4', null, '대진'), list));
      const total = D.seq.length * 2;
      const out = id => { const el = body.querySelector(`.drpot [data-id="${CSS.escape(String(id))}"]`); if (el) el.classList.add('out'); };
      const slot = (sl, id) => { const el = stage.querySelector(sl); el.replaceChildren(h('div', { class: 'drbig pop' + (mine(id) ? ' me' : '') }, crest(w.clubs[id] || null, 44), h('b', null, tn(w, id)), D.tier && D.tier(id) ? h('small', { class: 'mute' }, `${D.tier(id)}부 리그`) : null)); };
      const addPair = i => { const [home, away] = D.pairs[i], sw = D.seq[i][0] !== home;
        list.prepend(h('div', { class: 'drfx pop' + (mine(home) || mine(away) ? ' me' : '') }, h('span', { class: 'mute' }, `${i + 1}`), h('span', { class: 'r' }, crest(w.clubs[home] || null, 16), ' ', tn(w, home)), h('b', null, 'vs'), h('span', null, crest(w.clubs[away] || null, 16), ' ', tn(w, away)), sw ? h('small', { class: 'mute' }, '하위 리그 홈') : null)); };
      const prog = () => { ctl.querySelector('.drprog').textContent = `${Math.min(D.seq.length, Math.floor(k / 2))} / ${D.seq.length}경기`; if (k >= total) { nextB.disabled = true; autoB.disabled = true; allB.disabled = true; if (D.odd && !list.querySelector('.drodd')) list.append(h('div', { class: 'drfx drodd' }, h('span', null), h('span', { class: 'r' }, tn(w, D.odd)), h('b', null, '부전승'), h('span', null))); } };
      const step = () => {
        if (k >= total) { stop(); return; }
        const i = Math.floor(k / 2), j = k % 2, id = D.seq[i][j];
        out(id); slot(j ? '#drB' : '#drA', id);
        if (j) addPair(i); else stage.querySelector('#drB').replaceChildren(h('span', { class: 'mute' }, '두 번째 공'));
        k++; prog();
      };
      nextB.onclick = () => { stop(); step(); };
      autoB.onclick = () => { if (timer) { stop(); return; } autoB.textContent = '⏸ 멈춤'; timer = setInterval(step, D.seq.length > 32 ? 260 : 700); };
      allB.onclick = () => { stop(); const was = k; while (k < total) { const i = Math.floor(k / 2), j = k % 2; out(D.seq[i][j]); if (j) addPair(i); k++; } if (was < total) { const l = D.seq[D.seq.length - 1]; slot('#drA', l[0]); slot('#drB', l[1]); } prog(); };
      prog();
    } else {
      // 리그 페이즈: 포트마다 한 팀씩 공을 뽑으면 컴퓨터가 상대 8팀(포트마다 홈·원정)을 정한다
      const potOf = id => D.pots.findIndex(p => p.includes(id));
      const potEls = D.pots.map((p, i) => h('div', { class: 'drpot' }, h('div', { class: 'lbl' }, `포트 ${i + 1}`), h('div', { class: 'drballs' }, ...p.map(id => chip(id)))));
      const stage = h('div', { class: 'drph' });
      const done = h('div', { class: 'drdone' });
      body.append(h('div', { class: 'drpots four' + (D.pots.length > 4 ? ' six' : '') }, ...potEls), stage, ctl, h('div', { class: 'msec' }, h('h4', null, '추첨 결과 (팀을 누르면 상대 다시 보기)'), done));
      const oppGrid = (id, anim) => {
        const L = D.opp[id] || [];
        const cells = D.pots.map((p, pi) => { const os = L.filter(([o]) => p.includes(o)); const hm = os.filter(x => x[1]), aw = os.filter(x => !x[1]);
          return h('div', { class: 'drprow' }, h('span', { class: 'lbl' }, `포트 ${pi + 1}`), ...(D.per === 2 ? [hm[0], aw[0]] : [os[0]]).map((x, q) => x ? h('div', { class: 'drop' + (anim ? ' pop' : '') + (mine(x[0]) ? ' me' : ''), style: anim ? { animationDelay: (pi * (D.per) + q) * 110 + 'ms' } : null }, h('small', { class: 'mute' }, x[1] ? '홈' : '원정'), crest(w.clubs[x[0]] || null, 18), h('span', null, tn(w, x[0]))) : h('div', { class: 'drop' }, '-'))); });
        return h('div', { class: 'drpgrid' }, ...cells);
      };
      const show = (id, anim) => { stage.replaceChildren(h('div', { class: 'drbig pop' + (mine(id) ? ' me' : '') }, crest(w.clubs[id] || null, 48), h('b', null, tn(w, id)), h('small', { class: 'mute' }, `포트 ${potOf(id) + 1} · ${C.natName((w.clubs[id] || {}).nat)}`)), oppGrid(id, anim)); };
      const total = D.order.length;
      const prog = () => { ctl.querySelector('.drprog').textContent = `${k} / ${total}팀`; if (k >= total) { nextB.disabled = true; autoB.disabled = true; allB.disabled = true; } };
      const step = () => {
        if (k >= total) { stop(); return; }
        const id = D.order[k]; const el = body.querySelector(`.drpot [data-id="${CSS.escape(String(id))}"]`); if (el) el.classList.add('out');
        show(id, true);
        done.append(h('button', { class: 'drb sm' + (mine(id) ? ' me' : ''), onclick: () => { stop(); show(id, false); } }, crest(w.clubs[id] || null, 16), h('span', null, ts(w, id))));
        k++; prog();
      };
      nextB.onclick = () => { stop(); step(); };
      autoB.onclick = () => { if (timer) { stop(); return; } autoB.textContent = '⏸ 멈춤'; timer = setInterval(step, 1500); };
      allB.onclick = () => { stop(); while (k < total) step(); const f = D.order.find(mine) || D.order[0]; show(f, false); prog(); };
      stage.append(h('div', { class: 'mute', style: { textAlign: 'center', padding: '18px 0' } }, '‘다음 추첨’을 누르면 1포트부터 한 팀씩 뽑습니다.'));
      prog();
    }
    return [head, body];
  }, { clickClose: true });
};
})(typeof window !== 'undefined' ? window : globalThis);
