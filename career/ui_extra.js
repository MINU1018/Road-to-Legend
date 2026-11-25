// Road to Legend — 상점, 도전과제, 은퇴 일대기 화면
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, toast, confetti } = U;
const S = () => U.S();
const st = U.st;

// ---------- 상점 ----------
// 휴식기(전반기 종료·시즌 종료)에 커리어 화면 안에서 바로 쓰는 투자 패널
U.shopPanel = function (when) {
  const s = S(), SH = C.shop;
  if (!s || !SH || s.viewOnly) return null;
  const stt = SH.state(s);
  const box = h('div', { class: 'invest' });
  const redraw = () => { const n = U.shopPanel(when); if (n) box.replaceWith(n); };
  const after = r => { if (!r) return; if (r.ok === false && !r.price) { toast(r.msg); return; } toast((r.ok ? '' : '실패 · ') + r.msg); if (r.ok) confetti(24); U.save(); redraw(); const mv = document.querySelectorAll('.topinfo b')[1]; if (mv) mv.textContent = C.fmtEUR(Math.max(0, s.p.money)); };
  const open = st.investOpen !== false;
  box.append(h('div', { class: 'invhead', onclick: () => { st.investOpen = !open; redraw(); } },
    h('div', null, h('b', null, `${when} 투자`), h('span', { class: 'mute', style: { fontSize: '12px', marginLeft: '8px' } }, `보유 ${C.fmtEUR(Math.max(0, s.p.money))}`)),
    h('span', { class: 'mute' }, open ? '접기 ▲' : '펼치기 ▼')));
  if (!open) return box;
  // 1:1 개인 코치 — 능력치 3개
  const coach = SH.COACH, w = C.POSW[s.p.pos];
  const keys = C.AK.filter(k => s.p.pos === 'GK' || C.AGROUP[k] !== 'GK').sort((a, b) => ((w[b] ? 1 : 0) - (w[a] ? 1 : 0)) || s.p.a[a] - s.p.a[b]);
  st.coachKs = (st.coachKs || []).filter(k => keys.includes(k));
  if (!st.coachKs.length) st.coachKs = keys.slice(0, 3);
  const used = (stt.bought.coach || 0) >= coach.limit;
  const toggle = k => { const i = st.coachKs.indexOf(k); if (i >= 0) st.coachKs.splice(i, 1); else { if (st.coachKs.length >= 3) st.coachKs.shift(); st.coachKs.push(k); } redraw(); };
  const price = SH.coachPrice(s, st.coachKs), err = SH.check(s, coach, st.coachKs);
  box.append(h('div', { class: 'invcoach' },
    h('div', { class: 'lbl' }, '1:1 개인 코치 · 능력치 3개 선택 (테두리 = 포지션 핵심)'),
    h('div', { class: 'attrpick sm' }, ...keys.map(k => { const v = Math.round(s.p.a[k]); return h('button', { class: (st.coachKs.includes(k) ? 'on ' : '') + (w[k] ? 'key' : ''), disabled: used ? true : null, onclick: () => toggle(k) }, h('span', null, C.ALABEL[k]), h('b', { style: { color: U.barCol ? U.barCol(v) : null } }, v)); })),
    h('button', { class: 'btn gold sm', disabled: err ? true : null, onclick: () => after(SH.buy(s, 'coach', st.coachKs.slice())) }, used ? '이번 휴식기에 이미 지도받음' : err ? `${err} · ${C.fmtEUR(price)}` : `${st.coachKs.map(k => C.ALABEL[k]).join('·')} 지도 · ${C.fmtEUR(price)}`)));
  // 이번 휴식기 제안 상품 (3개 + 가끔 특성)
  const items = SH.stockItems(s);
  box.append(h('div', { class: 'invitems' }, ...items.map(it => {
    const e = SH.check(s, it), pr = SH.priceOf(s, it);
    return h('div', { class: 'item' + (it.trait ? ' trait' : '') + (e && e !== '재산 부족' ? ' dim' : '') }, h('b', null, it.trait ? '★ ' + it.name.replace('특성 마스터 클래스: ', '특성: ') : it.name), h('span', { class: 'mute' }, it.desc),
      h('button', { class: 'btn sm' + (e ? ' ghost' : ''), disabled: e ? true : null, onclick: () => after(SH.buy(s, it.id)) }, e ? (e === '재산 부족' ? `재산 부족 · ${C.fmtEUR(pr)}` : e) : C.fmtEUR(pr)));
  })));
  const tr = s.p.traits || [];
  if (tr.length) box.append(h('div', { class: 'chg' }, ...tr.map(t => h('span', { class: 'chip gold', title: SH.TRAITS[t][1] }, '★ ' + SH.TRAITS[t][0]))));
  return box;
};

// ---------- 도전과제 ----------
U.loadAch = async function () {
  try { C.ach.global = JSON.parse(await U.kvGet('ach') || '{}') || {}; } catch (e) { C.ach.global = {}; }
  // 진행 중 커리어에 있던 기록도 합친다
  const s = S(); if (s && s.ach) for (const id in s.ach) if (!C.ach.global[id]) C.ach.global[id] = { t: Date.now(), who: s.p.name, age: s.ach[id].age };
};
U.achCount = () => C.ach ? `${Object.keys(C.ach.global || {}).filter(id => C.ach.byId[id]).length}/${C.ach.LIST.length}` : '';
let achBox = null;
function achToast(a) {
  if (!achBox) { achBox = h('div', { class: 'achbox' }); document.body.append(achBox); }
  const t = C.ach.TIERS[a.tier];
  const el = h('div', { class: 'achtoast', style: { '--tc': t[1] } }, medal(a.tier, 40), h('div', null, h('div', { class: 'lbl' }, `도전과제 달성 · ${t[0]}`), h('b', null, a.name), h('span', { class: 'mute' }, a.desc)));
  achBox.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 4200);
  if (a.tier === 'g' || a.tier === 'p') confetti(60);
}
U.flushAch = function () {
  const s = S(); if (!s || !s.achQ || !s.achQ.length || !C.ach) return;
  const q = s.achQ.splice(0); let changed = false;
  q.forEach((id, i) => {
    const a = C.ach.byId[id]; if (!a) return;
    const isNew = !C.ach.global[id];
    if (isNew) { C.ach.global[id] = { t: Date.now(), who: s.p.name, age: (s.ach[id] || {}).age }; changed = true; }
    setTimeout(() => achToast(a), i * 900);
  });
  if (changed) U.kvSet('ach', JSON.stringify(C.ach.global));
};
setInterval(() => { try { U.flushAch(); } catch (e) { /* 무시 */ } }, 700);
function medal(tier, size = 44) {
  const c = C.ach.TIERS[tier][1];
  return U.svg(`<svg width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true"><path d="M14 2h6l3 10-6 3zM30 2h-6l-3 10 6 3z" fill="${c}" opacity=".55"/><circle cx="22" cy="27" r="14" fill="${c}"/><circle cx="22" cy="27" r="10.5" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/><path d="m22 20 2.1 4.4 4.8.6-3.5 3.3.9 4.7-4.3-2.3-4.3 2.3.9-4.7-3.5-3.3 4.8-.6z" fill="rgba(0,0,0,.32)"/></svg>`);
}
U.pages.ach = function (standalone) {
  const s = S();
  const root = h('div', { class: 'wrap prof screen' });
  const L = C.ach.LIST, glob = C.ach.global || {}, mine = (s && s.ach) || {};
  const got = L.filter(a => glob[a.id]).length;
  const tc = t => L.filter(a => a.tier === t && glob[a.id]).length + '/' + L.filter(a => a.tier === t).length;
  if (standalone) root.append(h('div', null, h('button', { class: 'btn ghost sm', onclick: () => U.go('home') }, '← 처음 화면')));
  root.append(h('div', { class: 'sec' }, h('div', { class: 'in achhead' },
    h('div', null, h('div', { class: 'lbl' }, '도전과제'), h('div', { class: 'num', style: { fontSize: '34px', fontWeight: 800 } }, `${got} / ${L.length}`)),
    h('div', { class: 'achbar' }, h('i', { style: { width: (got / L.length * 100) + '%' } })),
    h('div', { class: 'chg' }, ...['p', 'g', 's', 'b'].map(t => h('span', { class: 'chip', style: { color: C.ach.TIERS[t][1] } }, `${C.ach.TIERS[t][0]} ${tc(t)}`)), s && s.ach ? h('span', { class: 'chip gold' }, `이번 커리어 ${Object.keys(mine).length}개`) : null))));
  const f = st.achF || 'all';
  root.append(h('div', { class: 'seg', style: { maxWidth: '360px' } }, ...[['all', '전체'], ['got', '달성'], ['todo', '미달성']].map(([k, l]) => h('button', { class: f === k ? 'on' : '', onclick: () => { st.achF = k; standalone ? U.render() : U.setTab('ach'); } }, l))));
  const order = { p: 0, g: 1, s: 2, b: 3 };
  const list = L.filter(a => f === 'all' || (f === 'got' ? glob[a.id] : !glob[a.id])).sort((a, b) => (!!glob[b.id] - !!glob[a.id]) || order[a.tier] - order[b.tier]);
  root.append(h('div', { class: 'achgrid' }, ...list.map(a => {
    const g = glob[a.id], hide = a.hidden && !g;
    return h('div', { class: 'ach' + (g ? ' got' : '') + (mine[a.id] ? ' mine' : ''), style: { '--tc': C.ach.TIERS[a.tier][1] } },
      h('div', { class: 'md' }, medal(a.tier, 40)),
      h('div', null, h('b', null, hide ? '숨겨진 도전과제' : a.name), h('div', { class: 'mute', style: { fontSize: '12px' } }, hide ? '달성하면 공개됩니다' : a.desc),
        g ? h('div', { class: 'when' }, `${g.who || ''}${g.age ? ` · ${g.age}세` : ''} 달성`) : null));
  })));
  return root;
};

// ---------- 은퇴 일대기 ----------
U.bioBlock = function (s) {
  if (!C.bio) return null;
  s.bioCache = s.bioCache || C.bio.write(s);
  const b = s.bioCache, sc = b.score;
  const top = sc.top < 1 ? sc.top.toFixed(1) : Math.round(sc.top);
  const box = h('div', { class: 'bio' },
    h('div', { class: 'biohead' },
      h('div', { class: 'grade g' + sc.grade.replace('+', 'p') }, sc.grade),
      h('div', null, h('div', { class: 'lbl' }, '커리어 평가'), h('h2', null, sc.title), h('div', { class: 'mute' }, `${sc.line} · 커리어 점수 ${sc.score}/100 · 같은 게임 선수들 중 상위 ${top}%`))),
    h('div', { class: 'achbar' }, h('i', { style: { width: sc.score + '%' } })),
    h('div', { class: 'lbl', style: { marginTop: '6px' } }, `${s.p.name}의 이야기`),
    ...b.chapters.map(([t, txt], i) => h('div', { class: 'chap', style: { animationDelay: (i * .25) + 's' } }, h('div', { class: 'ct' }, t), h('p', null, txt))),
    h('p', { class: 'epi', style: { animationDelay: (b.chapters.length * .25 + .2) + 's' } }, b.epilogue));
  return box;
};
})(window);

// ---------- 부상 기록 ----------
(function () {
  const C = window.TC, U = window.TCUI, { h } = U;
  U.pages.inj = function () {
    const s = U.S(), p = s.p, w = s.w;
    const root = h('div', { class: 'wrap prof screen' });
    let list = (p.injHist || []).slice();
    if (!list.length) for (const r of s.hist) for (const x of (r.injuries || [])) list.push({ y: r.y, d: x.d, age: r.age, club: r.club, days: x.days, kind: x.kind, after: [] });
    const st = C.injuryState ? C.injuryState(s) : { recent: 0, fatigue: 0, mult: 1 };
    const risk = p.hid.inj * st.mult;
    const riskL = risk < .85 ? ['낮음', 'good'] : risk < 1.2 ? ['보통', ''] : risk < 1.7 ? ['높음', 'bad'] : ['매우 높음', 'bad'];
    const lonL = p.hid.lon < .85 ? '느림' : p.hid.lon < 1.15 ? '보통' : p.hid.lon < 1.5 ? '빠름' : '매우 빠름';
    const cur = s.ss && s.ss.inj > 0 ? `부상 중 · ${s.ss.inj}일 남음` : '정상';
    const totalDays = list.reduce((a, x) => a + x.days, 0), longN = list.filter(x => x.days >= 36).length, reN = list.filter(x => x.reinj).length, afN = list.filter(x => x.after && x.after.length).length;
    const missed = s.hist.reduce((a, r) => a + (r.log || []).filter(m => m.w === '부상').length, 0) + (s.ss ? s.ss.matches.filter(m => m.why === '부상').length : 0);
    root.append(h('div', { class: 'sec' }, h('h3', null, '현재 몸 상태'), h('div', { class: 'in injstat' },
      ...[['상태', cur], ['부상 위험도', h('span', { class: 'chip ' + riskL[1] }, riskL[0])], ['최근 1년 부상', `${st.recent}회`], ['최근 2주 출전 부담', st.fatigue > .8 ? '높음' : st.fatigue > .2 ? '보통' : '낮음'], ['노쇠화 속도', lonL]].map(([k, v]) => h('div', null, h('div', { class: 'lbl' }, k), h('b', null, v)))),
      h('div', { class: 'sub', style: { paddingBottom: '14px' } }, '최근 부상이 많거나 복귀 직후, 출전 부담이 클수록 다시 다칠 확률이 오릅니다. 큰 부상일수록 후유증(노쇠화 가속·부상 체질화·스피드 저하)이 남을 확률이 높습니다.')));
    root.append(h('div', { class: 'statline' }, ...[['통산 부상', `${list.length}회`], ['결장 일수', `${totalDays}일`], ['결장 경기', `${missed}경기`], ['장기 부상', `${longN}회`]].map(([l, v]) => h('div', null, h('div', { class: 'lbl' }, l), h('div', { class: 'v', style: { fontSize: '22px' } }, v)))));
    if (reN || afN) root.append(h('div', { class: 'chg' }, reN ? h('span', { class: 'chip bad' }, `재발 ${reN}회`) : null, afN ? h('span', { class: 'chip bad' }, `후유증 ${afN}회`) : null));
    if (!list.length) { root.append(h('div', { class: 'sec' }, h('div', { class: 'empty' }, '아직 부상 기록이 없습니다.'))); return root; }
    root.append(h('div', { class: 'sec' }, h('h3', null, '부상 이력'), h('div', { class: 'in tscroll' }, h('table', { class: 'ltable lc', style: { minWidth: '620px' } },
      h('thead', null, h('tr', null, ...['날짜', '나이', '구단', '부상', '결장', '비고'].map(x => h('th', null, x)))),
      h('tbody', null, ...list.slice().reverse().map(x => h('tr', null, h('td', null, x.d ? C.fmtDateY(x.d) : (x.y || '')), h('td', null, x.age ? `${x.age}세` : ''), h('td', null, (w.clubs[x.club] || {}).name || ''), h('td', null, h('b', { style: { color: x.days >= 90 ? '#ff9a9d' : x.days >= 36 ? '#f2c14e' : null } }, x.kind)), h('td', null, `${x.days}일`), h('td', null, [x.reinj ? '재발' : '', ...(x.after || [])].filter(Boolean).join(' · ')))))))));
    return root;
  };
})();
