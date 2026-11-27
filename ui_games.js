// 터치라인 커리어 — 결정적 순간 화면 (N지선다)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, svg, sleep } = U;
const GX = 50, GW = 300, GY = 64, GH = 104; // 골대 (viewBox 400×230)
const zxy = z => [GX + z.u * GW, GY + GH - z.v * GH];

// 서 있는 골키퍼 일러스트 (발끝 기준 0,0 / 키 약 86)
function keeperSVG(kit, kit2) {
  const skin = '#d7a27c', hair = '#2b1d14', glove = '#e9f36b', sock = kit2 || '#1b1e24', shorts = '#1b1e24';
  return `<g class="kp">
    <ellipse cx="0" cy="1" rx="22" ry="4" fill="rgba(0,0,0,.35)"/>
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M-8 -30 L-12 -16 L-11 -4" stroke="${skin}" stroke-width="7" fill="none"/>
      <path d="M8 -30 L12 -16 L11 -4" stroke="${skin}" stroke-width="7" fill="none"/>
      <path d="M-12 -15 L-11 -3" stroke="${sock}" stroke-width="7.5" fill="none"/>
      <path d="M12 -15 L11 -3" stroke="${sock}" stroke-width="7.5" fill="none"/>
      <path d="M-16 -1 Q-11 -5 -6 -1 Z" fill="#0d0f13" stroke="#0d0f13" stroke-width="3"/>
      <path d="M16 -1 Q11 -5 6 -1 Z" fill="#0d0f13" stroke="#0d0f13" stroke-width="3"/>
      <path d="M-13 -40 L13 -40 L14 -27 L3 -25 L0 -29 L-3 -25 L-14 -27 Z" fill="${shorts}"/>
      <path d="M-15 -68 Q0 -72 15 -68 L13 -39 L-13 -39 Z" fill="${kit}"/>
      <path d="M-15 -68 Q0 -72 15 -68 L13 -39 L-13 -39 Z" fill="url(#kpShade)"/>
      <path d="M-14 -66 L-25 -52 L-31 -42" stroke="${kit}" stroke-width="7.5" fill="none"/>
      <path d="M14 -66 L25 -52 L31 -42" stroke="${kit}" stroke-width="7.5" fill="none"/>
      <path d="M-6 -69 Q0 -65 6 -69" stroke="rgba(0,0,0,.35)" stroke-width="2" fill="none"/>
      <text x="0" y="-48" font-size="11" font-weight="800" text-anchor="middle" fill="rgba(255,255,255,.85)" font-family="Barlow Condensed, sans-serif">1</text>
    </g>
    <rect x="-3" y="-75" width="6" height="7" rx="2" fill="${skin}"/>
    <ellipse cx="0" cy="-81" rx="7.2" ry="8" fill="${skin}"/>
    <path d="M-7.4 -82 Q-7 -91 0 -90.5 Q7 -91 7.4 -82 Q4 -86 0 -85.5 Q-4 -86 -7.4 -82 Z" fill="${hair}"/>
    <ellipse cx="-34" cy="-39" rx="6.5" ry="7.5" fill="${glove}" stroke="#7b8a1e" stroke-width="1"/>
    <ellipse cx="34" cy="-39" rx="6.5" ry="7.5" fill="${glove}" stroke="#7b8a1e" stroke-width="1"/>
  </g>`;
}
function goalScene(mc) {
  let net = '';
  for (let x = GX; x <= GX + GW; x += 12) net += `<line x1="${x}" y1="${GY}" x2="${x}" y2="${GY + GH}"/>`;
  for (let y = GY; y <= GY + GH; y += 11.5) net += `<line x1="${GX}" y1="${y}" x2="${GX + GW}" y2="${y}"/>`;
  const kc = mc.kc || '#e5484d';
  const marks = mc.opts.map((z, i) => { const [x, y] = zxy(z); return `<g class="zm" data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="15" fill="rgba(242,193,78,.16)" stroke="#f2c14e" stroke-width="1.6" stroke-dasharray="4 3"/><text x="${x}" y="${y + 5}" font-size="15" font-weight="800" text-anchor="middle" fill="#f2c14e" font-family="Barlow Condensed, sans-serif">${i + 1}</text></g>`; }).join('');
  return svg(`<svg class="goalsvg" viewBox="0 0 400 230" role="img" aria-label="골문">
    <defs><linearGradient id="kpShade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c1724"/><stop offset="1" stop-color="#12283a"/></linearGradient>
    <radialGradient id="flood" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="230" fill="url(#sky)"/><rect width="400" height="230" fill="url(#flood)"/>
    <rect x="0" y="${GY + GH}" width="400" height="${230 - GY - GH}" fill="#174f33"/>
    <path d="M0 ${GY + GH + 18} H400 M0 ${GY + GH + 40} H400" stroke="#1b5b3b" stroke-width="10"/>
    <g stroke="rgba(255,255,255,.2)" stroke-width=".8" class="net">${net}</g>
    <rect x="${GX - 4}" y="${GY - 4}" width="${GW + 8}" height="4" fill="#f4f6f8"/><rect x="${GX - 4}" y="${GY - 4}" width="4" height="${GH + 4}" fill="#f4f6f8"/><rect x="${GX + GW}" y="${GY - 4}" width="4" height="${GH + 4}" fill="#f4f6f8"/>
    <line x1="0" y1="${GY + GH}" x2="400" y2="${GY + GH}" stroke="#f4f6f8" stroke-width="1.5"/>
    <g class="marks">${marks}</g>
    <g class="fx"></g>
    <circle class="ball" cx="200" cy="216" r="7" fill="#fff" stroke="#111" stroke-width="1.2" style="transition:transform .55s cubic-bezier(.25,.6,.3,1);transform-box:fill-box;transform-origin:center"/>
  </svg>`);
}
// 필드 장면 (공격 방향: 위)
const BASE = { cross: [[268, 70, 'me', '나'], [150, 52, 'tm'], [178, 40, 'tm'], [205, 92, 'tm'], [140, 34, 'op'], [165, 50, 'op'], [190, 40, 'op']], through: [[150, 150, 'me', '나'], [150, 78, 'tm'], [42, 92, 'tm'], [262, 118, 'tm'], [130, 84, 'op'], [172, 84, 'op'], [110, 96, 'op'], [195, 98, 'op']], header: [[150, 66, 'me', '나'], [282, 4, 'tm', 'CK'], [132, 40, 'op'], [172, 36, 'op'], [150, 26, 'op']], dribble: [[150, 124, 'me', '나'], [150, 98, 'op', '수비'], [120, 56, 'tm'], [190, 60, 'op']], tackle: [[150, 92, 'op', '상대'], [150, 120, 'me', '나'], [110, 70, 'op'], [190, 72, 'tm']], block: [[150, 94, 'op', '상대'], [150, 114, 'me', '나'], [118, 70, 'tm']], gk1v1: [[150, 120, 'op', '상대'], [150, 10, 'me', '나']] };
function fieldScene(mc) {
  const col = { me: '#f2c14e', tm: '#e9eef5', op: mc.kc || '#e5484d' };
  let s = `<rect x="0" y="0" width="300" height="190" fill="#11402c"/><path d="M0 0H300M60 0v60h180V0M110 0v20h80V0M100 60a50 50 0 0 0 100 0" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/><rect x="128" y="0" width="44" height="4" fill="#fff"/>`;
  for (const [x, y, k, l] of BASE[mc.type] || []) s += `<g><circle cx="${x}" cy="${y}" r="7" fill="${col[k]}" stroke="#0b0d11" stroke-width="1.5"/>${l ? `<text x="${x}" y="${y - 11}" font-size="9" fill="#cfd6df" text-anchor="middle">${l}</text>` : ''}</g>`;
  if (['cross', 'header', 'through', 'dribble'].includes(mc.type)) s += `<circle cx="150" cy="8" r="6" fill="#2f8cf0" stroke="#0b0d11"/>`;
  mc.opts.forEach((o, i) => { s += `<g class="zm" data-i="${i}" style="cursor:pointer"><circle cx="${o.x}" cy="${o.y}" r="11" fill="rgba(242,193,78,.16)" stroke="#f2c14e" stroke-width="1.4" stroke-dasharray="3 3"/><text x="${o.x}" y="${o.y + 4}" font-size="11" font-weight="700" fill="#f2c14e" text-anchor="middle" font-family="Barlow Condensed, sans-serif">${i + 1}</text></g>`; });
  return svg(`<svg class="mini" viewBox="0 0 300 190" aria-hidden="true">${s}<g class="fx"></g></svg>`);
}

U.playMoment = function (mc) {
  return new Promise(resolve => {
    // 공통 팝업(X·Esc·뒤로): 고르기 전에는 안내만, 결과가 나온 뒤에는 '경기 계속'과 같다
    let closeF = null, last = null;
    const box = h('div');
    U.overlay(close => { closeF = close; close.x = () => { if (last) closeF(last); else U.toast(done ? '결과를 보여 주는 중입니다.' : '선택지를 하나 골라야 진행됩니다.'); }; return box; }).then(v => resolve(v));
    box.append(h('div', { class: 'head' }, h('div', { class: 'lbl', style: { color: 'var(--gold)' } }, '결정적 순간 · ' + mc.comp + (mc.stage ? ' ' + mc.stage : '')), h('h2', null, mc.title), h('span', { class: 'mute' }, mc.sub)));
    const body = h('div', { class: 'body' }); box.append(body);
    body.append(h('p', { style: { margin: 0 } }, mc.desc));
    body.append(h('div', { class: 'chg' }, h('span', { class: 'chip gold' }, `선택지 ${mc.n}개 · 정답 1개 (${Math.round(100 / mc.n)}%)`), h('span', { class: 'chip' }, `관련 능력치 ${mc.skill}`), h('span', { class: 'chip dim' }, '능력치가 높을수록 선택지가 줄어듭니다')));
    const isGoal = mc.ui !== 'pick';
    const sc = isGoal ? goalScene(mc) : fieldScene(mc);
    body.append(sc);
    const list = h('div', { class: 'zbtns', style: { gridTemplateColumns: `repeat(${Math.min(mc.n, 3)}, 1fr)` } });
    let done = false;
    const choose = async i => {
      if (done) return; done = true;
      document.removeEventListener('keydown', key);
      [...list.children].forEach((b, k) => { b.disabled = true; b.classList.toggle('on', k === i); });
      const res = C.resolveChoice(mc, i);
      const fx = sc.querySelector('.fx');
      const marks = sc.querySelectorAll('.zm');
      marks.forEach(m => { const k = +m.dataset.i; const c = m.querySelector('circle'); if (k === i) { c.setAttribute('fill', 'rgba(242,193,78,.5)'); } });
      await sleep(250);
      if (isGoal) {
        const target = mc.type === 'pensave' ? mc.opts[mc.answer] : mc.opts[i];
        const [x, y] = zxy(target);
        const ball = sc.querySelector('.ball');
        const off = res.kind === 'miss' ? [target.u < .5 ? -32 : 32, target.v > .5 ? -26 : 8] : res.kind === 'post' ? [target.u < .5 ? -10 : 10, 0] : [0, 0];
        ball.style.transform = `translate(${x - 200 + off[0]}px, ${y - 216 + off[1]}px) scale(.6)`;
        await sleep(560);
        const goalIn = mc.type === 'pensave' ? !res.ok : res.ok;
        if (goalIn) sc.querySelectorAll('.net line').forEach(l => l.setAttribute('stroke', 'rgba(242,193,78,.6)'));
        else if (res.kind === 'save' || (mc.type === 'pensave' && res.ok)) fx.innerHTML = `<g transform="translate(${x},${y})"><circle r="20" fill="rgba(233,243,107,.25)"/><ellipse rx="9" ry="10" fill="#e9f36b" stroke="#7b8a1e"/><path d="M-4 -6v-6M0 -7v-7M4 -6v-6" stroke="#e9f36b" stroke-width="3" stroke-linecap="round"/></g>`;
      } else {
        const o = mc.opts[i]; fx.innerHTML = `<line x1="150" y1="${(BASE[mc.type] || [[150, 120]])[0][1]}" x2="${o.x}" y2="${o.y}" stroke="#f2c14e" stroke-width="2" stroke-dasharray="5 4"/>`;
      }
      // 정답 공개
      marks.forEach(m => { const k = +m.dataset.i; const c = m.querySelector('circle'); if (k === mc.answer) { c.setAttribute('stroke', '#2fbf71'); c.setAttribute('stroke-dasharray', ''); c.setAttribute('stroke-width', '2.6'); } else if (k === i) c.setAttribute('stroke', '#e5484d'); });
      [...list.children].forEach((b, k) => { if (k === mc.answer) b.classList.add('ans'); else if (k === i) b.classList.add('wrong'); });
      await sleep(250);
      const okWord = mc.defend ? (mc.type === 'pensave' || mc.type === 'gk1v1' ? 'SAVE!' : 'BLOCK!') : mc.assist ? 'ASSIST!' : 'GOAL!';
      const failWord = mc.defend ? (res.ok === null ? '위기 모면' : '실점') : mc.ui === 'shot' ? ({ save: 'SAVED', wall: 'BLOCKED', post: '골대!', miss: 'MISS' }[res.kind] || 'MISS') : '실패';
      body.append(h('div', { class: 'banner ' + (res.ok ? 'ok' : 'no') }, res.ok ? okWord : failWord), h('p', { class: 'mute', style: { textAlign: 'center', margin: 0 } }, res.text + (res.ok ? '' : ` 정답은 ${mc.answer + 1}번이었습니다.`)));
      if (res.ok) U.confetti(130);
      last = res;
      const btn = h('button', { class: 'btn', onclick: () => closeF(res) }, '경기 계속');
      body.append(btn); btn.focus();
    };
    mc.opts.forEach((o, i) => list.append(h('button', { class: 'zbtn', onclick: () => choose(i) }, h('b', null, i + 1), h('span', null, o.label))));
    body.append(list);
    sc.querySelectorAll('.zm').forEach(m => m.addEventListener('click', () => choose(+m.dataset.i)));
    const key = e => { const k = +e.key; if (k >= 1 && k <= mc.n) choose(k - 1); };
    document.addEventListener('keydown', key);
  });
};
})(window);
