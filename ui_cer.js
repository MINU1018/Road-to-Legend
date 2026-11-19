// Road to Legend — 시상식: 발롱도르(30인)·골든보이·유러피언 골든슈. 시상식 날까지 순위는 비공개(후보만),
// 시상식에 참여하면 아래 순위부터 한 명씩 공개하고 마지막에 수상자를 발표한다
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, crest, flag } = U;
const S = () => U.S();
const DOW = '일월화수목금토';
const dstr = d => `${C.fmtDateY(d)} (${DOW[C.toDate(d).getUTCDay()]})`;

// 이 해 시상 결과가 아직 비공개인가
U.cerHidden = y => { const w = S() && S().w; return !!(w && w.cer && !w.cer.rev && w.cer.y === y); };
const histOf = (w, k, y) => ((k === 'bd' ? w.bdHist : k === 'gb' ? w.gbHist : k === 'xi' ? w.wxiHist : w.gsHist) || []).find(x => x.y === y);
U.cerHistOf = histOf;

// 홈·커리어 화면 배너: 시상식 날(또는 아직 안 본 지난 시상식), 그 전에는 후보 발표 안내
U.cerBanner = function (s, compact) {
  const w = s.w, c = w.cer; if (!c || !w.cal) return null;
  const today = w.cal.d, b0 = histOf(w, 'bd', c.y);
  if (today === c.d || (today > c.d && !c.seen && today <= c.d + 14)) {
    return h('div', { class: 'cerban' + (today === c.d ? ' live' : '') },
      h('div', { class: 'cbt' }, h('div', { class: 'kk' }, today === c.d && !c.rev ? 'TONIGHT · BALLON D\'OR' : 'BALLON D\'OR'), h('div', { class: 'tt' }, c.rev && b0 ? `${c.y} 발롱도르 · ${b0.top[0][0]}` : `${c.y} 발롱도르 시상식`), h('div', { class: 'ss' }, !c.rev ? (today === c.d ? '오늘 밤, 발롱도르·골든보이·유러피언 골든슈 주인공이 발표됩니다.' : '시상식이 열렸습니다. 지금 결과를 확인하세요.') : '시상식이 끝났습니다. 다시 볼 수 있습니다.')),
      h('div', { class: 'cbb' }, U.trophy('ballon', compact ? 46 : 64, '#f2c14e'), h('button', { class: 'btn gold', onclick: () => U.ceremony(s) }, today === c.d && !c.rev ? '시상식 참여' : c.rev ? '다시 보기' : '결과 공개')));
  }
  if (today < c.d && !compact) return h('div', { class: 'cerban pre' }, h('div', { class: 'cbt' }, h('div', { class: 'kk' }, 'BALLON D\'OR'), h('div', { class: 'tt' }, `${c.y} 발롱도르 후보 30인 발표`), h('div', { class: 'ss' }, `시상식 ${dstr(c.d)} · D-${c.d - today}`)), h('div', { class: 'cbb' }, h('button', { class: 'btn ghost sm', onclick: () => { U.st.wsv = Object.assign(U.st.wsv || {}, { hs: 'bd' }); U.setTab('hist'); } }, '후보 보기')));
  return null;
};
// 후보 명단 (순위 없이 이름순)
U.cerNominees = function (s, y) {
  const w = s.w, b = histOf(w, 'bd', y); if (!b) return null;
  const l = b.top.slice().sort((a, z) => a[0].localeCompare(z[0]));
  return h('div', { class: 'nomgrid' }, ...l.map(x => h('div', { class: 'nom' + (x[3] ? ' me' : '') }, x[10] ? flag(x[10], 16) : null, h('span', { class: x[2] ? 'lnk' : '', onclick: x[2] ? () => U.openPlayer(x[2]) : null }, x[0] + (x[3] ? ' (나)' : '')), h('span', { class: 'mute cc' }, crest(w.clubs[x[1]] || null, 14), (w.clubs[x[1]] || {}).short || ''))));
};

// ---------- 시상식 연출 ----------
U.ceremony = function (s) {
  const w = s.w, c = w.cer; if (!c) return;
  const b = histOf(w, 'bd', c.y), g = histOf(w, 'gb', c.y), gs = histOf(w, 'gs', c.y), wx = histOf(w, 'xi', c.y);
  if (!b) return;
  let timers = [], phase = 0;
  const clear = () => { for (const t of timers) clearTimeout(t); timers = []; };
  const at = (ms, f) => timers.push(setTimeout(f, ms));
  const root = h('div', { class: 'cerov', role: 'dialog' });
  const stage = h('div', { class: 'cerst' });
  const foot = h('div', { class: 'cerft' });
  root.append(h('div', { class: 'cerbg' }), stage, foot);
  const close = () => { clear(); root.classList.add('out'); setTimeout(() => root.remove(), 260); if (!c.rev) C.cerReveal(s); c.seen = 1; U.save && U.save(); U.render(); };
  const btn = (l, f, cls) => h('button', { class: 'btn ' + (cls || 'ghost'), onclick: f }, l);
  const club = id => { const x = w.clubs[id]; return h('span', { class: 'cc' }, crest(x || null, 18), h('span', null, x ? x.name : '')); };
  const row = (rank, name, nat, cid, sub, me, cls) => h('div', { class: 'crow ' + (cls || '') + (me ? ' me' : '') },
    h('span', { class: 'crk' }, rank), h('span', { class: 'crn' }, nat ? flag(nat, 18) : null, h('b', null, name + (me ? ' (나)' : ''))), h('span', { class: 'crc' }, club(cid)), h('span', { class: 'crs mute' }, sub || ''));
  // 한 부문: 아래 순위부터 공개 (리스트는 아래에서 위로 쌓인다)
  function category(title, kicker, items, speed, onDone) {
    clear(); stage.replaceChildren(); foot.replaceChildren();
    const list = h('div', { class: 'clist' });
    stage.append(h('div', { class: 'chead' }, h('div', { class: 'kk' }, kicker), h('h2', null, title)), list);
    let i = items.length - 1, done = false;
    const finish = () => { if (done) return; done = true; clear(); list.replaceChildren(...items.slice().reverse().map((x, k) => x.el(k === items.length - 1))); foot.replaceChildren(btn('다음 ▸', onDone, 'gold')); };
    foot.append(btn('건너뛰기', finish));
    const step = () => {
      if (i < 0) { done = true; foot.replaceChildren(btn('다음 ▸', onDone, 'gold')); return; }
      const x = items[i], win = i === 0;
      if (win) {
        // 1위: 잠깐 뜸을 들인 뒤 공개
        const hold = h('div', { class: 'crow hold' }, h('span', { class: 'crk' }, 1), h('span', { class: 'crn' }, h('b', null, '…')), h('span'), h('span'));
        list.append(hold);
        at(1400, () => { hold.replaceWith(x.el(true)); if (U.confetti) U.confetti(90, ['#f2c14e', '#ffffff', '#ffe29a']); i--; at(600, step); });
        return;
      }
      list.append(x.el(false)); i--;
      at(speed(i + 1), step);
    };
    at(400, step);
  }
  const gsItems = (gs ? gs.top : []).map((x, k) => ({ el: win => row(k + 1, x[0], null, x[1], `${x[3]}골 · ${x[4]}점 · ${(w.lg[x[5]] || {}).name || ''}`, x[6], win ? 'win' : '') }));
  const gbItems = (g ? g.top : []).map((x, k) => ({ el: win => row(k + 1, x[0], x[15], x[1], `${x[6]}세 · OVR ${x[4]} · ${x[8]}경기 ${x[9]}골 ${x[10]}도움${x[11] ? ` · 평점 ${(+x[11]).toFixed(2)}` : ''}`, x[3], win ? 'win' : '') }));
  // 월드 베스트 XI: 골키퍼부터 공격수까지 한 명씩 경기장에 놓인다
  function worldXI() {
    clear(); stage.replaceChildren(); foot.replaceChildren();
    const xi = wx.xi, shown = xi.map(() => null);
    const pitch = () => U.xiPitch(w, shown.map((x, k) => x), { cls: 'cer' });
    let box = pitch(); stage.append(h('div', { class: 'chead' }, h('div', { class: 'kk' }, `WORLD XI ${c.y}`), h('h2', null, '월드 베스트 XI')), box);
    const order = [0, 4, 3, 2, 1, 7, 6, 5, 10, 8, 9]; let k = 0, done = false; // GK → 수비 → 미드 → 공격 (가운데 공격수 마지막)
    const redraw = () => { const nb = pitch(); box.replaceWith(nb); box = nb; };
    const finish = () => { if (done) return; done = true; clear(); xi.forEach((x, i) => shown[i] = x); redraw(); foot.replaceChildren(btn('다음 ▸', ballon, 'gold')); };
    foot.append(btn('건너뛰기', finish));
    const step = () => { if (k >= order.length) { done = true; if (U.confetti) U.confetti(80, ['#f2c14e', '#ffffff', '#7fd1ff']); foot.replaceChildren(btn('다음 ▸', ballon, 'gold')); return; }
      const i = order[k++]; shown[i] = xi[i]; redraw(); const el = box.querySelectorAll('.xic')[[8, 9, 10, 5, 6, 7, 1, 2, 3, 4, 0].indexOf(i)]; if (el) el.classList.add('pop'); at(k >= 9 ? 900 : 520, step); };
    at(500, step);
  }
  // 발롱도르: 30~11위 빠르게, 10~4위 천천히, 3·2위는 뜸, 1위는 따로 발표
  function ballon() {
    clear(); stage.replaceChildren(); foot.replaceChildren();
    const list = h('div', { class: 'clist bd' });
    const top3 = h('div', { class: 'ctop3' });
    stage.append(h('div', { class: 'chead' }, h('div', { class: 'kk' }, `BALLON D'OR ${c.y}`), h('h2', null, '발롱도르 30인')), top3, list);
    const T = b.top, n = T.length;
    const sub = x => `${x[5] || ''}${x[8] != null ? ` · ${x[8]}경기 ${x[6]}골 ${x[7]}도움` : ''}${x[9] ? ` · 평점 ${(+x[9]).toFixed(2)}` : ''}`;
    const slots = [2, 1, 0].map(k => h('div', { class: 'cslot r' + (k + 1) }, h('div', { class: 'crk' }, `${k + 1}위`), h('div', { class: 'csn' }, '?')));
    const slotOf = k => slots[2 - k];
    top3.append(slotOf(1), slotOf(0), slotOf(2)); // 2위 · 1위 · 3위 (시상대 모양)
    let i = n - 1, done = false;
    const fill = k => { const x = T[k], el = slotOf(k); el.classList.add('open'); el.replaceChildren(h('div', { class: 'crk' }, `${k + 1}위`), x[10] ? flag(x[10], 22) : null, h('div', { class: 'csn' }, x[0] + (x[3] ? ' (나)' : '')), h('div', { class: 'mute csc' }, club(x[1])), h('div', { class: 'mute', style: { fontSize: '11px' } }, sub(x))); };
    const finish = () => { if (done) return; done = true; clear(); list.replaceChildren(...T.slice(3).reverse().map((x, k) => row(n - k, x[0], x[10], x[1], sub(x), x[3]))); fill(2); fill(1); fill(0); slotOf(0).classList.add('champ'); foot.replaceChildren(btn('수상자 보기 ▸', winner, 'gold')); };
    foot.append(btn('건너뛰기', finish));
    const step = () => {
      if (i >= 3) { const x = T[i]; list.append(row(i + 1, x[0], x[10], x[1], sub(x), x[3], i < 10 ? 'slow' : '')); i--; at(i >= 10 ? 230 : 950, step); return; }
      if (i >= 1) { // 3위, 2위: 이름이 빠르게 바뀌다 멈춘다
        const k = i, el = slotOf(k); el.classList.add('spin'); const cand = T.slice(0, 3);
        let t = 0; const spin = () => { if (t > 14) { el.classList.remove('spin'); fill(k); i--; at(1100, step); return; } const z = cand[t % cand.length]; const nm = el.querySelector('.csn'); if (nm) nm.textContent = z[0]; t++; at(70 + t * 12, spin); };
        spin(); return;
      }
      // 1위
      const el = slotOf(0); el.classList.add('pulse'); stage.classList.add('cdim');
      foot.replaceChildren(h('div', { class: 'drum' }, `그리고 ${c.y} 발롱도르의 주인공은…`));
      at(2600, () => { stage.classList.remove('cdim'); el.classList.remove('pulse'); fill(0); el.classList.add('champ'); done = true; if (U.confetti) U.confetti(220, ['#f2c14e', '#ffffff', '#ffe29a', '#c9a227']); foot.replaceChildren(btn('수상자 보기 ▸', winner, 'gold')); at(2600, winner); });
    };
    at(500, step);
  }
  function winner() {
    clear(); const x = b.top[0]; stage.replaceChildren(); foot.replaceChildren();
    stage.append(h('div', { class: 'cwin' }, h('div', { class: 'kk' }, `BALLON D'OR ${c.y}`), h('div', { class: 'ctro' }, U.trophy('ballon', 150, '#f2c14e')), h('h1', null, x[0] + (x[3] ? ' (나)' : '')),
      h('div', { class: 'cwc' }, x[10] ? flag(x[10], 22) : null, club(x[1]), x[5] ? h('span', { class: 'chip' }, x[5]) : null),
      x[8] != null ? h('div', { class: 'cws' }, ...[['경기', x[8]], ['골', x[6]], ['도움', x[7]], ['평점', x[9] ? (+x[9]).toFixed(2) : '-']].map(([k, v]) => h('div', null, h('div', { class: 'lbl' }, k), h('b', null, v)))) : null,
      h('div', { class: 'mute', style: { marginTop: '8px' } }, `2위 ${b.top[1] ? b.top[1][0] : '-'} · 3위 ${b.top[2] ? b.top[2][0] : '-'}`)));
    if (U.confetti) U.confetti(240, ['#f2c14e', '#ffffff', '#ffe29a']);
    foot.append(btn('전체 순위 보기', () => { close(); U.st.wsv = Object.assign(U.st.wsv || {}, { hs: 'bd' }); U.setTab('hist'); }), btn('닫기', close, 'gold'));
  }
  function intro() {
    stage.replaceChildren(h('div', { class: 'cintro' }, h('div', { class: 'kk' }, `${c.y} · ${dstr(c.d)}`), h('h1', { class: 'shine' }, "Ballon d'Or"), h('div', { class: 'ss' }, `${C.wLabel(c.y - 1)} 시즌 최고의 선수를 가립니다`),
      h('div', { class: 'cprog' }, ...['유러피언 골든슈', '골든보이'].concat(wx ? ['월드 베스트 XI'] : [], ['발롱도르']).map((t, k) => h('span', null, `${k + 1}. ${t}`)))));
    foot.replaceChildren(btn('닫기', close), btn('시상식 시작 ▸', gsPhase, 'gold'));
  }
  const gsPhase = () => gsItems.length ? category('유러피언 골든슈', 'EUROPEAN GOLDEN SHOE · 리그 골 × 계수', gsItems, () => 380, gbPhase) : gbPhase();
  const gbPhase = () => gbItems.length ? category('골든보이', 'GOLDEN BOY · 21세 이하 · 유럽 1부 리그 · 역대 수상자 제외', gbItems, k => k <= 3 ? 1100 : 480, xiPhase) : xiPhase();
  const xiPhase = () => wx && wx.xi ? worldXI() : ballon();
  document.body.append(root);
  intro();
};
})(window);
