// Road to Legend — 상점, 도전과제, 은퇴 일대기 화면
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, toast, confetti } = U;
const S = () => U.S();
const st = U.st;

// ---------- 상점 ----------
U.pages.shop = function () {
  const s = S(), SH = C.shop;
  const root = h('div', { class: 'wrap prof screen' });
  if (!s || !SH) return root;
  const stt = SH.state(s);
  const money = h('div', { class: 'num', style: { fontSize: '30px', fontWeight: 700 } }, C.fmtEUR(Math.max(0, s.p.money)));
  root.append(h('div', { class: 'sec shophead' }, h('div', { class: 'in', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' } },
    h('div', null, h('div', { class: 'lbl' }, '보유 재산'), money),
    h('div', { class: 'mute', style: { fontSize: '12px', textAlign: 'right' } }, `${s.w.year}/${String(s.w.year + 1).slice(2)} 시즌 기준 · 시즌이 바뀌면 구매 한도가 초기화됩니다`, h('br'), `누적 지출 ${C.fmtEUR((s.stats && s.stats.spent) || 0)}`))));
  const after = (r, el) => { if (!r) return; if (r.ok === false && !r.price) { toast(r.msg); return; } toast((r.ok ? '' : '실패 · ') + r.msg); if (r.ok) confetti(30); U.save(); U.setTab('shop'); };
  // 1:1 개인 코치
  const coach = SH.item('coach');
  const w = C.POSW[s.p.pos];
  const keys = C.AK.filter(k => s.p.pos === 'GK' || C.AGROUP[k] !== 'GK').sort((a, b) => ((w[b] ? 1 : 0) - (w[a] ? 1 : 0)) || s.p.a[a] - s.p.a[b]);
  st.coachK = keys.includes(st.coachK) ? st.coachK : keys[0];
  const left = coach.limit - (stt.bought.coach || 0);
  const list = h('div', { class: 'attrpick' }, ...keys.map(k => {
    const v = Math.round(s.p.a[k]);
    return h('button', { class: (st.coachK === k ? 'on ' : '') + (w[k] ? 'key' : ''), onclick: () => { st.coachK = k; U.setTab('shop'); } },
      h('span', null, C.ALABEL[k]), h('b', { style: { color: U.barCol ? U.barCol(v) : null } }, v));
  }));
  const price = SH.coachPrice(s, st.coachK), err = SH.check(s, coach, st.coachK);
  root.append(h('div', { class: 'sec' }, h('h3', null, '1:1 개인 코치', h('span', { class: 'chip' }, `이번 시즌 ${Math.max(0, left)}회 남음`)),
    h('div', { class: 'sub' }, '올리고 싶은 능력치를 직접 고릅니다. 테두리가 있는 것은 포지션 핵심 능력치입니다. 어릴수록, 낮을수록 많이 오릅니다.'),
    h('div', { class: 'in', style: { display: 'grid', gap: '12px' } }, list,
      h('div', { class: 'buyrow' }, h('div', null, h('b', null, `${C.ALABEL[st.coachK]} 집중 지도`), h('div', { class: 'mute', style: { fontSize: '12px' } }, `현재 ${Math.round(s.p.a[st.coachK])}`)),
        h('button', { class: 'btn gold', disabled: err ? true : null, onclick: () => after(SH.buy(s, 'coach', st.coachK)) }, err ? `${err} · ${C.fmtEUR(price)}` : `${C.fmtEUR(price)} 결제`)))));
  // 나머지 상품
  const cats = {};
  for (const it of SH.ITEMS) if (it.id !== 'coach') (cats[it.cat] = cats[it.cat] || []).push(it);
  for (const cat in cats) {
    root.append(h('div', { class: 'sec' }, h('h3', null, cat), h('div', { class: 'in shopgrid' }, ...cats[cat].map(it => {
      const e = SH.check(s, it), pr = SH.priceOf(s, it);
      const used = stt.career[it.id] || 0;
      return h('div', { class: 'item' + (e && e !== '재산 부족' ? ' dim' : '') },
        h('b', null, it.name), h('span', { class: 'mute' }, it.desc),
        it.career ? h('span', { class: 'mute', style: { fontSize: '11px' } }, `커리어 ${used}/${it.career}회`) : null,
        h('button', { class: 'btn sm' + (e ? ' ghost' : ''), disabled: e ? true : null, onclick: () => after(SH.buy(s, it.id)) }, e ? `${e}` + (e === '재산 부족' ? ` · ${C.fmtEUR(pr)}` : '') : C.fmtEUR(pr)));
    }))));
  }
  return root;
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
