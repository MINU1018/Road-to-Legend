// Road to Legend — 조추첨 연출: 국내 컵(오픈 추첨 / 상·하위 리그 1·2포트), UEFA 리그 페이즈(1~4포트), UEFA 녹아웃(시드 추첨), 그 밖의 대륙 대회
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
    D = { kind: 'pairs', title: `${st.n} ${dr.n} 추첨`, date: dr.d, mode: dr.mode, pots: dr.pots, potN: dr.mode === 'two' ? ['1포트 · 상위 리그', '2포트 · 하위 리그'] : ['참가 팀'], seq: dr.seq || dr.pairs, pairs: dr.pairs, odd: dr.odd, tier,
      note: dr.mode === 'two' ? '1포트(상위 리그)와 2포트(하위 리그)에서 한 팀씩 뽑아 맞붙입니다. 하위 리그 팀이 홈 경기를 치릅니다.' : '한 팀씩 뽑아 먼저 뽑힌 팀이 홈 경기를 치릅니다.' + (/GER|ESP|FRA|POR|NED|BEL/.test(st.nat) ? ' 하위 리그 팀과 만나면 하위 리그 팀이 홈입니다.' : '') };
  } else {
    const cs = w.cal && w.cal.cont[ref.key];
    if (!cs) { U.toast('이 추첨 기록은 남아 있지 않습니다 (대회가 끝나면 지워집니다).'); return; }
    if (ref.ri < 0) {
      if (!cs.pots) { U.toast('이 대회는 포트 추첨 기록이 없습니다.'); return; }
      const opp = {}; for (const md of cs.md) for (const [a, b] of md) { (opp[a] = opp[a] || []).push([b, 1]); (opp[b] = opp[b] || []).push([a, 0]); }
      const r = C.seeded('draw|' + cs.key), order = [];
      cs.pots.forEach(p => { const q = p.slice(); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } order.push(...q); });
      D = { kind: 'phase', title: `${cs.name} 리그 페이즈 추첨`, date: cs.drawD, pots: cs.pots, opp, order, per: cs.pots.length === 4 ? 2 : 1,
        note: cs.pots.length === 4 ? '36개 팀을 1~4포트로 나눠 추첨합니다. 팀마다 포트별로 두 팀(홈 1경기·원정 1경기)씩 모두 8팀과 맞붙습니다. 같은 나라 팀과는 만나지 않고, 같은 나라 팀은 최대 두 팀까지만 만납니다.' : '36개 팀을 1~6포트로 나눠 추첨합니다. 팀마다 포트별로 한 팀씩 모두 6팀(홈 3경기·원정 3경기)과 맞붙습니다. 같은 나라 팀과는 만나지 않습니다.' };
    } else {
      const ties = cs.ties && cs.ties[ref.ri]; if (!ties) { U.toast('아직 추첨 전입니다.'); return; }
      const field = []; for (const t of ties) field.push(t[0], t[1]);
      const rn = (cs.rounds[ref.ri] || [])[2] || '';
      if (cs.bk && ref.ri <= 1) {
        const un = ties.map(t => t[0]), sd = ties.map(t => t[1]);
        D = { kind: 'pairs', title: `${cs.name} ${rn} 추첨`, date: (cs.tdraw || {})[ref.ri], mode: 'two', pots: [un, sd], potN: ref.ri === 0 ? ['비시드 · 리그 페이즈 17~24위', '시드 · 9~16위'] : ['플레이오프 승자', '시드 · 리그 페이즈 1~8위'], seq: ties.map(t => [t[0], t[1]]), pairs: ties.map(t => [t[0], t[1]]), odd: null, tier: () => 0,
          note: ref.ri === 0 ? '9~16위와 17~24위가 맞붙습니다. 정해진 순위 묶음끼리만 추첨하고(9·10위 ↔ 23·24위 등), 시드 팀이 2차전을 홈에서 치릅니다.' : '1~8위와 플레이오프 승자가 맞붙습니다. 이 추첨으로 8강·4강 대진표까지 정해지고, 상위 팀이 2차전을 홈에서 치릅니다.' };
      } else D = { kind: 'pairs', title: `${cs.name} ${rn} 추첨`, date: (cs.tdraw || {})[ref.ri], mode: 'open', pots: [field], potN: ['참가 팀'], seq: ties.map(t => [t[0], t[1]]), pairs: ties.map(t => [t[0], t[1]]), odd: null, tier: () => 0, note: '먼저 뽑힌 팀이 1차전을 홈에서 치릅니다.' };
    }
  }
  if (D.date != null && w.cal && D.date > w.cal.d) { U.toast(`${C.fmtDateY(D.date)}에 추첨합니다.`); return; }
  const F = U.fset ? U.fset() : { club: new Set() };
  const mine = id => F.club.has(id) || (s.ss && s.ss.club === id);
  U.overlay(close => {
    const head = h('div', { class: 'head drhead' }, h('div', { class: 'drkick' }, 'OFFICIAL DRAW' + (D.date != null ? ' · ' + C.fmtDateY(D.date) : '')), h('h2', null, D.title), h('div', { class: 'drnote' }, D.note),
      h('button', { class: 'btn ghost sm mclose', onclick: () => { stop(); close(); } }, '닫기'));
    const body = h('div', { class: 'body drbody' });
    let timer = null, k = 0, busy = false;
    const stop = () => { if (timer) clearInterval(timer); timer = null; autoB.textContent = '▶ 자동 진행'; };
    const nextB = h('button', { class: 'btn gold' }, '다음 추첨'), autoB = h('button', { class: 'btn' }, '▶ 자동 진행'), allB = h('button', { class: 'btn ghost' }, '결과 바로 보기');
    const bar = h('div', { class: 'drbar' }, h('i'));
    const ctl = h('div', { class: 'drctl' }, nextB, autoB, allB, h('span', { class: 'mute drprog' }));
    const chip = (id, cls) => h('span', { class: 'drb' + (cls ? ' ' + cls : '') + (mine(id) ? ' me' : ''), 'data-id': id, title: tn(w, id) }, crest(w.clubs[id] || null, 18), h('span', null, ts(w, id)), D.tier && D.tier(id) ? h('small', null, D.tier(id) + '부') : null);
    // 추첨 볼이 담긴 유리 볼(bowl): 남은 팀 수만큼 공 (최대 28개)
    const rr = C.seeded('bowl|' + D.title);
    const bowl = (n, lbl, i) => { const el = h('div', { class: 'drbowl', 'data-i': i }, h('div', { class: 'drglass' }), h('div', { class: 'drbl' }, lbl)); const box = el.firstChild;
      for (let q = 0; q < Math.min(28, n); q++) { const a = rr() * Math.PI * 2, rd = Math.sqrt(rr()) * 34; box.append(h('span', { class: 'drball', style: { left: (50 + Math.cos(a) * rd) + '%', top: (58 + Math.sin(a) * rd * .62) + '%', animationDelay: (-rr() * 2).toFixed(2) + 's' } })); }
      return el; };
    const shrink = i => { const g = body.querySelectorAll('.drbowl')[i]; if (!g) return; const b = g.querySelector('.drball:not(.gone)'); if (b) b.classList.add('gone'); return g; };
    // 공이 볼에서 무대로 날아오는 연출
    const fly = (fromEl, toEl, done) => {
      if (!fromEl || !toEl || timer && D.seq && D.seq.length > 24) { done(); return; }
      const fr = fromEl.getBoundingClientRect(), to = toEl.getBoundingClientRect();
      const ball = h('div', { class: 'drfly' }); document.body.append(ball);
      ball.style.left = (fr.left + fr.width / 2 - 14) + 'px'; ball.style.top = (fr.top + fr.height / 2 - 14) + 'px';
      requestAnimationFrame(() => { ball.style.transform = `translate(${to.left + to.width / 2 - fr.left - fr.width / 2}px, ${to.top + to.height / 2 - fr.top - fr.height / 2}px) scale(1.6)`; });
      setTimeout(() => { ball.classList.add('open'); setTimeout(() => { ball.remove(); done(); }, 160); }, 520);
    };
    const card = (id, sub) => h('div', { class: 'drcard flip' + (mine(id) ? ' me' : ''), style: { '--cc': (w.clubs[id] || {}).c1 || '#3a4252' } }, crest(w.clubs[id] || null, 52), h('b', null, tn(w, id)), sub ? h('small', null, sub) : null);
    if (D.kind === 'pairs') {
      const two = D.pots.length > 1;
      const bowls = h('div', { class: 'drbowls' + (two ? ' two' : '') }, ...D.pots.map((p, i) => bowl(p.length, D.potN[i] || `${i + 1}포트`, i)));
      const potEls = D.pots.map((p, i) => h('div', { class: 'drpot' }, h('div', { class: 'lbl' }, `${D.potN[i] || (i + 1) + '포트'} · ${p.length}팀`), h('div', { class: 'drballs' + (p.length > 40 ? ' sm' : '') }, ...p.map(id => chip(id)))));
      const stage = h('div', { class: 'drstage' }, h('div', { class: 'drslot', id: 'drA' }, h('span', { class: 'drq' }, '?')), h('div', { class: 'drvs' }, 'VS'), h('div', { class: 'drslot', id: 'drB' }, h('span', { class: 'drq' }, '?')));
      const list = h('div', { class: 'drlist' });
      body.append(h('div', { class: 'drarena' }, bowls, stage), bar, ctl, h('div', { class: 'msec' }, h('h4', null, '대진'), list), h('details', { class: 'drdet' }, h('summary', null, '포트 구성 보기'), h('div', { class: 'drpots' + (two ? ' two' : '') }, ...potEls)));
      const total = D.seq.length * 2;
      const out = id => { const el = body.querySelector(`.drpot [data-id="${CSS.escape(String(id))}"]`); if (el) el.classList.add('out'); };
      const potIdx = id => two ? Math.max(0, D.pots.findIndex(p => p.includes(id))) : 0;
      const slot = (sl, id) => { const el = stage.querySelector(sl); el.replaceChildren(card(id, D.tier && D.tier(id) ? `${D.tier(id)}부 리그` : C.natName((w.clubs[id] || {}).nat))); };
      const addPair = i => { const [home, away] = D.pairs[i], sw = D.seq[i][0] !== home;
        list.prepend(h('div', { class: 'drfx pop' + (mine(home) || mine(away) ? ' me' : '') }, h('span', { class: 'mute' }, `${i + 1}`), h('span', { class: 'r' }, tn(w, home), ' ', crest(w.clubs[home] || null, 18)), h('b', null, 'vs'), h('span', null, crest(w.clubs[away] || null, 18), ' ', tn(w, away)), sw ? h('small', { class: 'mute' }, '하위 리그 홈') : h('small'))); };
      const prog = () => { const n = Math.min(D.seq.length, Math.floor(k / 2)); ctl.querySelector('.drprog').textContent = `${n} / ${D.seq.length}경기`; bar.firstChild.style.width = (k / total * 100) + '%'; if (k >= total) { nextB.disabled = true; autoB.disabled = true; allB.disabled = true; if (D.odd && !list.querySelector('.drodd')) list.append(h('div', { class: 'drfx drodd' }, h('span', null, ''), h('span', { class: 'r' }, tn(w, D.odd)), h('b', null, '·'), h('span', { class: 'mute' }, '부전승'), h('small'))); } };
      const step = () => {
        if (k >= total || busy) { if (k >= total) stop(); return; }
        const i = Math.floor(k / 2), j = k % 2, id = D.seq[i][j];
        busy = true; k++;
        const g = shrink(potIdx(id)), target = stage.querySelector(j ? '#drB' : '#drA');
        if (!j) stage.querySelector('#drB').replaceChildren(h('span', { class: 'drq' }, '?'));
        fly(g, target, () => { out(id); slot(j ? '#drB' : '#drA', id); if (j) addPair(i); busy = false; prog(); });
      };
      nextB.onclick = () => { stop(); step(); };
      autoB.onclick = () => { if (timer) { stop(); return; } autoB.textContent = '⏸ 멈춤'; step(); timer = setInterval(step, D.seq.length > 24 ? 320 : 950); };
      allB.onclick = () => { stop(); const was = k; while (k < total) { const i = Math.floor(k / 2), j = k % 2; out(D.seq[i][j]); shrink(potIdx(D.seq[i][j])); if (j) addPair(i); k++; } busy = false; if (was < total) { const l = D.seq[D.seq.length - 1]; slot('#drA', l[0]); slot('#drB', l[1]); } prog(); };
      prog();
    } else {
      // 리그 페이즈: 포트마다 한 팀씩 공을 뽑으면 컴퓨터가 상대(포트별 홈·원정)를 정한다
      const potOf = id => D.pots.findIndex(p => p.includes(id));
      const potEls = D.pots.map((p, i) => h('div', { class: 'drpot' }, h('div', { class: 'lbl' }, `${i + 1}포트`), h('div', { class: 'drballs' }, ...p.map(id => chip(id)))));
      const bowls = h('div', { class: 'drbowls n' + D.pots.length }, ...D.pots.map((p, i) => bowl(p.length, `${i + 1}포트`, i)));
      const stage = h('div', { class: 'drph' });
      const done = h('div', { class: 'drdone' });
      body.append(bowls, stage, bar, ctl, h('div', { class: 'msec' }, h('h4', null, '추첨 결과 (팀을 누르면 상대 다시 보기)'), done), h('details', { class: 'drdet' }, h('summary', null, '포트 구성 보기'), h('div', { class: 'drpots four' + (D.pots.length > 4 ? ' six' : '') }, ...potEls)));
      const oppGrid = (id, anim) => {
        const L = D.opp[id] || [];
        const cells = D.pots.map((p, pi) => { const os = L.filter(([o]) => p.includes(o)); const hm = os.filter(x => x[1]), aw = os.filter(x => !x[1]);
          return h('div', { class: 'drprow' }, h('span', { class: 'lbl' }, `${pi + 1}포트`), ...(D.per === 2 ? [hm[0], aw[0]] : [os[0]]).map((x, q) => x ? h('div', { class: 'dropp' + (anim ? ' flip' : '') + (mine(x[0]) ? ' me' : ''), style: anim ? { animationDelay: (pi * (D.per) + q) * 140 + 'ms' } : null }, h('small', { class: 'mute' }, x[1] ? '홈' : '원정'), crest(w.clubs[x[0]] || null, 18), h('span', null, tn(w, x[0]))) : h('div', { class: 'dropp mute' }, '-'))); });
        return h('div', { class: 'drpgrid' }, ...cells);
      };
      const show = (id, anim) => { stage.replaceChildren(h('div', { class: 'drphead' }, card(id, `${potOf(id) + 1}포트 · ${C.natName((w.clubs[id] || {}).nat)}`)), oppGrid(id, anim)); };
      const total = D.order.length;
      const prog = () => { ctl.querySelector('.drprog').textContent = `${k} / ${total}팀`; bar.firstChild.style.width = (k / total * 100) + '%'; if (k >= total) { nextB.disabled = true; autoB.disabled = true; allB.disabled = true; } };
      const step = () => {
        if (k >= total || busy) { if (k >= total) stop(); return; }
        const id = D.order[k]; k++; busy = true;
        const g = shrink(potOf(id));
        fly(g, stage, () => { const el = body.querySelector(`.drpot [data-id="${CSS.escape(String(id))}"]`); if (el) el.classList.add('out');
          show(id, true); done.append(h('button', { class: 'drb sm' + (mine(id) ? ' me' : ''), onclick: () => { stop(); show(id, false); } }, crest(w.clubs[id] || null, 16), h('span', null, ts(w, id)))); busy = false; prog(); });
      };
      nextB.onclick = () => { stop(); step(); };
      autoB.onclick = () => { if (timer) { stop(); return; } autoB.textContent = '⏸ 멈춤'; step(); timer = setInterval(step, 1900); };
      allB.onclick = () => { stop(); while (k < total) { const id = D.order[k]; const el = body.querySelector(`.drpot [data-id="${CSS.escape(String(id))}"]`); if (el) el.classList.add('out'); shrink(potOf(id)); done.append(h('button', { class: 'drb sm' + (mine(id) ? ' me' : ''), onclick: () => show(id, false) }, crest(w.clubs[id] || null, 16), h('span', null, ts(w, id)))); k++; } busy = false; const f = D.order.find(mine) || D.order[0]; show(f, false); prog(); };
      stage.append(h('div', { class: 'drwait' }, '‘다음 추첨’을 누르면 1포트부터 한 팀씩 뽑습니다.'));
      prog();
    }
    return [head, body];
  }, { clickClose: true, cls: 'drov' });
};
})(typeof window !== 'undefined' ? window : globalThis);
