// 터치라인 커리어 — 결정적 순간 미니게임 (슈팅 조준, 선택형, 페널티 선방)
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, svg, sleep } = U;
const GX = 50, GW = 300, GY = 70, GH = 100; // 골대 좌표 (viewBox 400×230)
const toXY = (u, v) => [GX + u * GW, GY + GH - v * GH];

function goalSVG(opts = {}) {
  let net = '';
  for (let x = GX; x <= GX + GW; x += 15) net += `<line x1="${x}" y1="${GY}" x2="${x}" y2="${GY + GH}"/>`;
  for (let y = GY; y <= GY + GH; y += 12.5) net += `<line x1="${GX}" y1="${y}" x2="${GX + GW}" y2="${y}"/>`;
  let wall = '';
  if (opts.wall) for (let i = 0; i < 4; i++) { const x = 140 + i * 24; wall += `<g transform="translate(${x},0)"><rect x="-9" y="${GY + 40}" width="18" height="60" rx="7" fill="#22344a" stroke="#0b0d11" stroke-width="1.5"/><circle cx="0" cy="${GY + 32}" r="8" fill="#e2b892"/></g>`; }
  const zones = opts.zones ? [0, 1, 2, 3, 4, 5].map(z => { const col = z % 3, row = Math.floor(z / 3); return `<rect class="zone" data-z="${z}" x="${GX + col * GW / 3 + 2}" y="${GY + row * GH / 2 + 2}" width="${GW / 3 - 4}" height="${GH / 2 - 4}" rx="6" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4" style="cursor:pointer"/>`; }).join('') : '';
  return svg(`<svg class="goalsvg" viewBox="0 0 400 230" role="img" aria-label="골대">
    <defs><radialGradient id="spot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="${GY + GH}" width="400" height="60" fill="#13492f"/>
    <path d="M0 ${GY + GH + 20} H400 M0 ${GY + GH + 42} H400" stroke="#195b3c" stroke-width="10"/>
    <g stroke="rgba(255,255,255,.22)" stroke-width=".8">${net}</g>
    <rect x="${GX - 4}" y="${GY - 4}" width="${GW + 8}" height="4" fill="#f4f6f8"/><rect x="${GX - 4}" y="${GY - 4}" width="4" height="${GH + 4}" fill="#f4f6f8"/><rect x="${GX + GW}" y="${GY - 4}" width="4" height="${GH + 4}" fill="#f4f6f8"/>
    <line x1="0" y1="${GY + GH}" x2="400" y2="${GY + GH}" stroke="#f4f6f8" stroke-width="1.5"/>
    ${zones}
    <g id="kp" style="transition:transform .45s cubic-bezier(.2,.7,.3,1);transform:translate(200px,${GY + GH}px)"><g id="kpb"><rect x="-13" y="-58" width="26" height="40" rx="9" fill="${opts.kc || '#f2c14e'}"/><rect x="-11" y="-20" width="9" height="20" rx="4" fill="#1b1e24"/><rect x="2" y="-20" width="9" height="20" rx="4" fill="#1b1e24"/><circle cx="0" cy="-68" r="9" fill="#d9a77f"/><rect x="-27" y="-56" width="14" height="8" rx="4" fill="${opts.kc || '#f2c14e'}"/><rect x="13" y="-56" width="14" height="8" rx="4" fill="${opts.kc || '#f2c14e'}"/><circle cx="-29" cy="-52" r="5" fill="#fff"/><circle cx="29" cy="-52" r="5" fill="#fff"/></g></g>
    ${wall}
    <ellipse id="ret" cx="-100" cy="-100" rx="10" ry="10" fill="url(#spot)" stroke="#f2c14e" stroke-width="1.2" stroke-dasharray="3 3" pointer-events="none"/>
    <circle id="ball" cx="200" cy="215" r="7" fill="#fff" stroke="#111" stroke-width="1.2" style="transition:transform .5s cubic-bezier(.25,.6,.3,1);transform-box:fill-box;transform-origin:center;transform:translate(0px,0px)"/>
  </svg>`);
}

U.playMoment = function (mc) {
  return new Promise(resolve => {
    const ov = h('div', { class: 'ov' });
    const box = h('div', { class: 'ovbox' });
    ov.append(box); document.body.append(ov);
    const head = h('div', { class: 'head' }, h('div', { class: 'lbl', style: { color: 'var(--gold)' } }, '결정적 순간 · ' + mc.comp + (mc.stage ? ' ' + mc.stage : '')), h('h2', null, mc.title), h('span', { class: 'mute' }, mc.sub));
    const body = h('div', { class: 'body' });
    box.append(head, body);
    body.append(h('p', { style: { margin: 0 } }, mc.desc));
    const finish = (res) => {
      const btn = h('button', { class: 'btn', onclick: () => { ov.style.animation = 'fadeIn .2s reverse both'; setTimeout(() => ov.remove(), 180); resolve(res); } }, '경기 계속');
      body.append(btn); btn.focus();
    };
    const banner = (ok, txt, sub) => {
      body.append(h('div', { class: 'banner ' + (ok ? 'ok' : 'no') }, txt), sub ? h('p', { class: 'mute', style: { textAlign: 'center', margin: 0 } }, sub) : null);
      if (ok) U.confetti(ok === 2 ? 60 : 140);
    };
    if (mc.ui === 'shot') shotGame(mc, body, banner, finish);
    else if (mc.type === 'pensave') penSaveGame(mc, body, banner, finish);
    else pickGame(mc, body, banner, finish);
  });
};

// 슈팅: ① 노릴 방향 선택 → ② 하단 타이밍 바. 능력치가 높을수록 바가 느리고 정확 구간이 넓다
const AIMS = [['왼쪽 구석', .13, .35], ['왼쪽 위', .16, .82], ['가운데', .5, .45], ['오른쪽 위', .84, .82], ['오른쪽 구석', .87, .35]];
function shotGame(mc, body, banner, finish) {
  const g = goalSVG({ wall: mc.wall, kc: '#e5484d' });
  const sk = mc.skill;
  const hz = Math.max(.55, Math.min(2.1, .55 + (100 - sk) / 100 * 2.6)); // 왕복 속도 (초당)
  const perfect = Math.max(.035, Math.min(.11, .02 + (sk - 40) * .0016)); // 정확 구간 반폭
  const good = perfect * 2.6;
  const info = h('div', { class: 'chg' }, h('span', { class: 'chip' }, `실행 능력 ${sk}`), h('span', { class: 'chip' }, `상대 골키퍼 ${mc.gk}`), h('span', { class: 'chip' }, `바 속도 ${hz < .9 ? '느림' : hz < 1.4 ? '보통' : '빠름'}`));
  body.append(info, g);
  const ret = g.querySelector('#ret'), ball = g.querySelector('#ball'), kp = g.querySelector('#kp'), kpb = g.querySelector('#kpb');
  const step = h('div', { style: { display: 'grid', gap: '10px' } });
  body.append(step);
  let aim = null;
  const showAim = a => { const [x, y] = toXY(a[1], a[2]); ret.setAttribute('cx', x); ret.setAttribute('cy', y); ret.setAttribute('rx', mc.sigma * GW * 1.4); ret.setAttribute('ry', mc.sigma * .85 * GH * 1.4); };
  // ① 방향
  const dirs = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' } }, ...AIMS.map(a => h('button', { class: 'btn ghost sm', style: { padding: '9px 4px', fontSize: '12px' }, onmouseenter: () => showAim(a), onfocus: () => showAim(a), onclick: () => { aim = a; showAim(a); startBar(); } }, a[0])));
  step.append(h('div', { class: 'lbl' }, '1. 노릴 곳'), dirs, h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '구석·위쪽은 막기 어렵지만 타이밍이 어긋나면 크게 빗나갑니다.'));
  // ② 타이밍 바
  function startBar() {
    step.innerHTML = '';
    const track = h('div', { style: { position: 'relative', height: '34px', borderRadius: '10px', background: 'linear-gradient(90deg, #5a1d22, #6e4a1a 30%, #2d5a3a 50%, #6e4a1a 70%, #5a1d22)', overflow: 'hidden', border: '1px solid var(--line)' } });
    const gz = h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: (50 - good * 100) + '%', width: good * 200 + '%', background: 'rgba(242,193,78,.35)' } });
    const pz = h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: (50 - perfect * 100) + '%', width: perfect * 200 + '%', background: 'rgba(47,191,113,.85)', boxShadow: '0 0 14px rgba(47,191,113,.7)' } });
    const mk = h('div', { style: { position: 'absolute', top: '-3px', bottom: '-3px', width: '4px', marginLeft: '-2px', background: '#fff', borderRadius: '2px', boxShadow: '0 0 10px #fff' } });
    track.append(gz, pz, mk);
    const btn = h('button', { class: 'btn gold', style: { width: '100%' } }, '슈팅! (스페이스)');
    step.append(h('div', { class: 'lbl' }, `2. 타이밍 — ${aim[0]}`), track, btn);
    let t0 = performance.now(), x = 0, raf = 0, stopped = false;
    const loop = t => { const ph = ((t - t0) / 1000 * hz) % 2; x = ph < 1 ? ph : 2 - ph; x = .5 - Math.cos(x * Math.PI) / 2; mk.style.left = (x * 100) + '%'; if (!stopped) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const key = e => { if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } };
    document.addEventListener('keydown', key);
    btn.focus();
    btn.addEventListener('click', stop);
    async function stop() {
      if (stopped) return; stopped = true; cancelAnimationFrame(raf); document.removeEventListener('keydown', key);
      btn.disabled = true;
      const off = Math.abs(x - .5);
      const grade = off <= perfect ? 'PERFECT' : off <= good ? 'GOOD' : off <= .3 ? 'OK' : 'BAD';
      const mult = grade === 'PERFECT' ? .3 : grade === 'GOOD' ? .7 : grade === 'OK' ? 1.25 : 2;
      const gcol = { PERFECT: '#2fbf71', GOOD: '#f2c14e', OK: '#f08c2e', BAD: '#e5484d' }[grade];
      step.append(h('div', { class: 'banner', style: { fontSize: '30px', color: gcol } }, { PERFECT: '완벽한 타이밍', GOOD: '좋은 타이밍', OK: '조금 어긋남', BAD: '타이밍 실패' }[grade]));
      const m2 = Object.assign({}, mc, { sigma: mc.sigma * mult });
      // 완벽하면 골키퍼가 반응하기 어렵다
      if (grade === 'PERFECT') m2.reach = mc.reach * .75; else if (grade === 'BAD') m2.reach = mc.reach * 1.15;
      const res = C.resolveShot(m2, { u: aim[1], v: aim[2] });
      res.timing = grade;
      const [bx, by] = toXY(res.ex.u, Math.max(-.05, res.ex.v));
      const k = res.keeper || { u: .5 + (Math.random() - .5) * .2, v: .3 };
      const [kx] = toXY(k.u, 0);
      const dir = k.u < .5 ? -1 : 1;
      await sleep(250);
      ball.style.transform = `translate(${bx - 200}px, ${by - 215}px) scale(.62)`;
      kp.style.transform = `translate(${kx}px, ${GY + GH + (k.v > .5 ? -32 : -8)}px)`;
      if (Math.abs(k.u - .5) > .12) kpb.setAttribute('transform', `rotate(${dir * 62})`);
      await sleep(650);
      if (res.kind === 'goal') { g.querySelectorAll('line').forEach(l => l.setAttribute('stroke', 'rgba(242,193,78,.55)')); banner(true, 'GOAL!', mc.type === 'penalty' ? '침착하게 성공시켰습니다.' : '골망을 흔들었습니다!'); }
      else if (res.kind === 'save') banner(false, 'SAVED', res.text);
      else if (res.kind === 'post') banner(false, '골대!', res.text);
      else if (res.kind === 'wall') banner(false, 'BLOCKED', res.text);
      else banner(false, 'MISS', res.text);
      finish(res);
    }
  }
}
function penSaveGame(mc, body, banner, finish) {
  const g = goalSVG({ zones: true, kc: '#2f8cf0' });
  body.append(h('div', { class: 'chg' }, h('span', { class: 'chip' }, `다이빙·반사신경 ${Math.round(mc.dive)}`), h('span', { class: 'chip dim' }, '키커들은 아래 구석을 가장 많이 노립니다')), g, h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '몸을 날릴 구역을 고르세요.'));
  const ball = g.querySelector('#ball'), kp = g.querySelector('#kp'), kpb = g.querySelector('#kpb');
  let done = false;
  g.querySelectorAll('.zone').forEach(z => z.addEventListener('click', async () => {
    if (done) return; done = true;
    const zone = +z.dataset.z; z.setAttribute('fill', 'rgba(47,140,240,.25)');
    const res = C.resolvePenSave(mc, zone);
    const zc = q => [GX + (q % 3 + .5) * GW / 3, GY + (Math.floor(q / 3) + .5) * GH / 2];
    const [kx] = zc(zone), [bx, by] = zc(res.shot);
    const dir = zone % 3 === 0 ? -1 : zone % 3 === 2 ? 1 : 0;
    await sleep(100);
    kp.style.transform = `translate(${kx}px, ${GY + GH + (zone < 3 ? -30 : -6)}px)`;
    if (dir) kpb.setAttribute('transform', `rotate(${dir * 65})`);
    ball.style.transform = res.kind === 'miss' ? `translate(${(Math.random() < .5 ? -1 : 1) * 190}px, -150px) scale(.6)` : `translate(${bx - 200 + (Math.random() - .5) * 30}px, ${by - 215}px) scale(.62)`;
    await sleep(620);
    if (res.ok) banner(true, res.kind === 'miss' ? '실축!' : 'SAVE!', res.text); else banner(false, 'GOAL', '방향이 엇갈렸습니다.');
    finish(res);
  }));
}
// 선택형 장면 그림 (공격 방향: 위). 각 선택지 목표 지점 주변에 수비수 수(def)만큼 붉은 점을 그린다
const TARGETS = {
  cross: [[178, 30], [150, 46], [108, 32], [212, 78]], through: [[150, 50], [40, 62], [268, 86]],
  header: [[126, 22], [150, 46], [190, 26]], dribble: [[116, 100], [204, 98], [150, 74]],
  tackle: [[128, 104], [172, 104], [150, 142]], block: [[110, 60], [150, 58], [190, 60]], gk1v1: [[150, 64], [150, 30], [122, 38]]
};
function sceneSVG(mc) {
  const P = (x, y, c, l) => `<g><circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="#0b0d11" stroke-width="1.5"/>${l ? `<text x="${x}" y="${y - 11}" font-size="9" fill="#cfd6df" text-anchor="middle" font-family="IBM Plex Sans KR, sans-serif">${l}</text>` : ''}</g>`;
  const me = '#f2c14e', tm = '#e9eef5', op = '#e5484d';
  let s = `<rect x="0" y="0" width="300" height="190" fill="#11402c"/><path d="M60 0v60h180V0M110 0v20h80V0M100 60a50 50 0 0 0 100 0" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/><rect x="128" y="0" width="44" height="4" fill="#fff"/>`;
  const T = TARGETS[mc.type] || [];
  // 공을 가진 선수·동료
  const base = { cross: [[268, 70, me, '나'], [150, 52, tm], [178, 40, tm], [205, 92, tm]], through: [[150, 150, me, '나'], [150, 78, tm], [42, 92, tm], [262, 118, tm]], header: [[150, 66, me, '나'], [282, 4, tm, 'CK']], dribble: [[150, 124, me, '나'], [150, 96, op, '수비']], tackle: [[150, 92, op, '상대'], [150, 118, me, '나']], block: [[150, 92, op, '상대'], [150, 112, me, '나']], gk1v1: [[150, 118, op, '상대'], [150, 14, me, '나']] }[mc.type] || [];
  base.forEach(b => s += P(b[0], b[1], b[2], b[3]));
  if (mc.type === 'header' || mc.type === 'cross') s += P(150, 10, '#2f8cf0');
  // 선택지 목표 + 그 주변 수비
  (mc.opts || []).forEach((o, i) => {
    const [x, y] = T[i] || [150, 60];
    const d = o.def || 0;
    for (let k = 0; k < d; k++) s += `<circle cx="${x + (k ? 13 : -13)}" cy="${y + (k ? -6 : 7)}" r="6.5" fill="${op}" stroke="#0b0d11" stroke-width="1.4"/>`;
    s += `<g class="o" data-i="${i}"><circle cx="${x}" cy="${y}" r="11" fill="rgba(242,193,78,.12)" stroke="#f2c14e" stroke-dasharray="3 3"/><text x="${x}" y="${y + 4}" font-size="11" font-weight="700" fill="#f2c14e" text-anchor="middle" font-family="Barlow Condensed, sans-serif">${i + 1}</text></g>`;
  });
  return svg(`<svg class="mini" viewBox="0 0 300 190" aria-hidden="true">${s}</svg>`);
}
function pickGame(mc, body, banner, finish) {
  const sc = sceneSVG(mc);
  body.append(sc);
  const hasDef = (mc.opts || []).some(o => o.def != null);
  if (hasDef) body.append(h('p', { class: 'mute', style: { margin: 0, fontSize: '12px' } }, '붉은 점은 그 지점을 막고 있는 수비수입니다. 수비가 적은 곳일수록 성공 가능성이 큽니다.'));
  if (mc.att) body.append(h('div', { class: 'chg' }, h('span', { class: 'chip' }, `상대: ${mc.att[0]}`), h('span', { class: 'chip dim' }, mc.att[1])));
  if (mc.type === 'block') body.append(h('div', { class: 'chg' }, h('span', { class: 'chip' }, `상대 ${mc.foot === 'R' ? '오른발' : '왼발'}잡이`), h('span', { class: 'chip dim' }, '주발 쪽으로 감아 차는 경우가 많습니다')));
  const list = h('div', { class: 'pick' });
  let done = false;
  mc.opts.forEach((o, i) => {
    const label = Array.isArray(o) ? o[0] : o.label, desc = Array.isArray(o) ? o[1] : o.desc;
    const tags = Array.isArray(o) ? [] : [o.fit ? h('span', { class: 'chip ' + (o.fit === '자신 있음' ? 'good' : o.fit === '어려움' ? 'bad' : '') }, `내 능력: ${o.fit}`) : null, o.rewardTag ? h('span', { class: 'chip gold' }, o.rewardTag) : null, o.risk ? h('span', { class: 'chip' }, o.risk) : null].filter(Boolean);
    const b = h('button', { style: { gridTemplateColumns: '1fr' }, onclick: async () => {
      if (done) return; done = true;
      [...list.children].forEach((x, k) => { x.style.opacity = k === i ? '1' : '.35'; x.style.pointerEvents = 'none'; });
      b.classList.add('hit');
      const res = C.resolvePick(mc, i);
      sc.querySelectorAll('.o').forEach(g => { if (+g.dataset.i === i) g.querySelector('circle').setAttribute('fill', 'rgba(242,193,78,.55)'); });
      if (mc.type === 'block' && res.shooter != null) sc.querySelectorAll('.o').forEach(g => { if (+g.dataset.i === res.shooter) g.querySelector('circle').setAttribute('stroke', '#e5484d'); });
      await sleep(550);
      const defend = ['tackle', 'block', 'gk1v1'].includes(mc.type);
      if (res.ok) banner(true, defend ? (mc.type === 'gk1v1' ? 'SAVE!' : 'BLOCK!') : (mc.assist ? 'ASSIST!' : 'GOAL!'), res.text);
      else if (res.ok === null) banner(false, defend ? '위기 모면' : '아쉽다', res.text);
      else banner(false, defend ? '실점' : '실패', res.text);
      finish(res);
    } }, h('b', null, `${i + 1}. ${label}`), h('span', null, desc), tags.length ? h('div', { class: 'chg', style: { marginTop: '4px' } }, ...tags) : null);
    list.append(b);
  });
  body.append(list);
}
})(window);
