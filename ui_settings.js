// 터치라인 커리어 — 설정 화면: 표시·난이도·진행·로고 팩·저장 관리
(function (G) {
'use strict';
const C = G.TC, U = G.TCUI;
const { h, svg, toast } = U;

U.applyCfg = function () {
  document.documentElement.classList.toggle('reduce', C.cfg.anim === 'reduced');
  U.st.speed = U.normSpeed(C.cfg.simSpeed);
};
async function saveCfg() { await U.kvSet('cfg', JSON.stringify(C.cfg)); U.applyCfg(); }
async function saveLogos() { await U.kvSet('logos', JSON.stringify(C.logos.map)); C.logos.n = Object.keys(C.logos.map).length; }
U.loadSettings = async function () {
  try { const t = await U.kvGet('cfg'); C.setCfg(t ? JSON.parse(t) : null); } catch (e) { C.setCfg(null); }
  try { const t = await U.kvGet('logos'); C.logos.map = t ? JSON.parse(t) : {}; C.logos.n = Object.keys(C.logos.map).length; } catch (e) { C.logos.map = {}; }
  U.applyCfg();
};

// ---------- 공통 컨트롤 ----------
function seg(id, value, opts, onch) {
  const el = h('div', { class: 'seg', role: 'radiogroup', id });
  opts.forEach(([k, l]) => el.append(h('button', { class: value === k ? 'on' : '', role: 'radio', 'aria-checked': value === k ? 'true' : 'false', onclick: e => { el.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false'); }); onch(k); } }, l)));
  return el;
}
function toggle(id, value, onch) {
  const b = h('button', { id, class: 'tgl' + (value ? ' on' : ''), role: 'switch', 'aria-checked': value ? 'true' : 'false', onclick: () => { value = !value; b.classList.toggle('on', value); b.setAttribute('aria-checked', value ? 'true' : 'false'); onch(value); } }, h('i'));
  return b;
}
function row(label, hint, ctrl) {
  return h('div', { class: 'srow' }, h('div', { style: { minWidth: 0 } }, h('div', { style: { fontWeight: 600 } }, label), hint ? h('div', { class: 'mute', style: { fontSize: '12px' } }, hint) : null), ctrl);
}
function card(title, sub, ...rows) { return h('div', { class: 'sec' }, h('h3', null, title), sub ? h('div', { class: 'sub' }, sub) : null, h('div', { class: 'in', style: { display: 'grid', gap: '2px' } }, ...rows)); }

U.viewSettings = function () {
  const cfg = C.cfg;
  const root = h('div', { class: 'wrap prof screen' });
  root.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' } }, h('h2', { style: { fontSize: '24px' } }, '설정'), h('button', { class: 'btn ghost sm', onclick: () => U.back() }, '← 돌아가기')));
  // 통화
  const sample = h('b', { class: 'num', style: { fontSize: '18px' } });
  const upd = () => { sample.textContent = `${C.fmtEUR(45e6)} · ${C.fmtWage(85000)}`; };
  const rateIn = (cur, lbl) => h('label', { style: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px' } }, `1€ =`, h('input', { id: 'rate' + cur, type: 'number', step: 'any', min: 0, value: cfg.rates[cur], style: { width: '100px' }, onchange: e => { const v = +e.target.value; if (v > 0) { cfg.rates[cur] = v; saveCfg(); upd(); } } }), lbl);
  upd();
  root.append(card('돈 표시', '게임 안의 금액은 유로 기준으로 계산하고, 표시할 때만 환율을 곱합니다.',
    row('통화', null, seg('cur', cfg.currency, [['KRW', '원'], ['EUR', '€'], ['USD', '$'], ['GBP', '£'], ['JPY', '¥']], v => { cfg.currency = v; saveCfg(); upd(); })),
    row('급여 단위', '이적 제안과 계약에 표시되는 급여', seg('wage', cfg.wageMode, [['week', '주급'], ['month', '월급'], ['year', '연봉']], v => { cfg.wageMode = v; saveCfg(); upd(); })),
    row('환율', '기본값은 대략적인 값입니다. 원하는 값으로 바꿀 수 있습니다.', h('div', { style: { display: 'grid', gap: '6px' } }, rateIn('KRW', '원'), rateIn('USD', '$'), rateIn('GBP', '£'), rateIn('JPY', '¥'))),
    row('예시', '시장 가치 4,500만 유로 · 주급 8만 5천 유로', sample)));
  // 게임 밸런스
  root.append(card('게임 밸런스', '새 시즌부터 적용됩니다.',
    row('난이도', '성장 속도·운의 폭·부상·이적 관심도에 영향을 줍니다', seg('diff', cfg.difficulty, [['easy', '쉬움'], ['real', '현실'], ['hard', '어려움'], ['hardcore', '하드코어']], v => { cfg.difficulty = v; saveCfg(); })),
    row('부상 빈도', null, seg('inj', cfg.injuries, [['low', '적게'], ['normal', '보통'], ['high', '많이']], v => { cfg.injuries = v; saveCfg(); })),
    row('시즌 이벤트 빈도', '프리시즌·겨울 휴식기마다 나오는 선택지 개수', seg('evf', cfg.events, [['off', '끄기'], ['low', '적게'], ['normal', '보통'], ['high', '많이']], v => { cfg.events = v; saveCfg(); })),
    row('결정적 순간 빈도', '경기 중 직접 차고 막는 장면', seg('mom', cfg.moments, [['off', '끄기'], ['low', '적게'], ['normal', '보통'], ['high', '많이']], v => { cfg.moments = v; saveCfg(); })),
    row('선택지 확률 표시', '이벤트 결과 옆에 확률(%)을 보여 줍니다', toggle('odds', cfg.showOdds, v => { cfg.showOdds = v; saveCfg(); }))));
  // 화면·연출
  root.append(card('화면·연출', null,
    row('기본 진행 속도', '단계별: 매 경기 결과 카드를 보고 다음으로 · 자동: 경기가 차례로 흘러감 · 즉시: 바로 결과', seg('spd', U.normSpeed(cfg.simSpeed), U.SPEEDS, v => { cfg.simSpeed = v; U.st.speed = v; saveCfg(); })),
    row('애니메이션', '줄이면 화면 전환·숫자 카운트 연출이 빨라집니다', seg('anim', cfg.anim, [['full', '전체'], ['reduced', '줄이기']], v => { cfg.anim = v; saveCfg(); })),
    row('꽃가루 효과', null, toggle('conf', cfg.confetti, v => { cfg.confetti = v; saveCfg(); })),
    row('우승·수상 연출', '끄면 시즌 결산 화면에 목록으로만 보입니다', toggle('cer', cfg.ceremonies, v => { cfg.ceremonies = v; saveCfg(); }))));
  root.append(logoCard());
  root.append(saveCard());
  root.append(h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost sm', onclick: async () => { C.setCfg(null); await saveCfg(); toast('설정을 기본값으로 되돌렸습니다.'); U.render(); } }, '설정 기본값으로')));
  return root;
};

// ---------- 로고 팩 ----------
let JSZipP = null;
function loadJSZip() {
  if (G.JSZip) return Promise.resolve(G.JSZip);
  if (!JSZipP) JSZipP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = () => res(G.JSZip); s.onerror = () => { JSZipP = null; rej(new Error('jszip')); }; document.head.append(s); });
  return JSZipP;
}
async function collectFiles(fileList, status) {
  const out = [];
  for (const f of fileList) {
    const path = f.webkitRelativePath || f.name;
    if (/\.zip$/i.test(f.name)) {
      status('ZIP 압축을 푸는 중…');
      const JSZip = await loadJSZip();
      const zip = await JSZip.loadAsync(f);
      const ents = Object.values(zip.files).filter(e => !e.dir && /\.(png|webp|jpe?g|svg)$/i.test(e.name));
      // 같은 로고의 여러 크기가 있으면 256 → 700 → 기타 순으로 하나만
      const pickSize = n => /256x256/.test(n) ? 3 : /700x700|512/.test(n) ? 2 : /64x64/.test(n) ? 0 : 1;
      const byBase = {};
      for (const e of ents) { const base = e.name.replace(/^.*\//, '').replace(/\.[0-9a-f]{6,10}(?=\.\w+$)/i, ''); const dir = e.name.replace(/\/[^/]*$/, '').replace(/\/?\d+x\d+$/, ''); const k = dir + '/' + base; if (!byBase[k] || pickSize(e.name) > pickSize(byBase[k].name)) byBase[k] = e; }
      for (const e of Object.values(byBase)) out.push({ path: e.name.replace(/\/\d+x\d+\//, '/'), get: async () => new Blob([await e.async('uint8array')], { type: /svg$/i.test(e.name) ? 'image/svg+xml' : 'image/png' }) });
    } else if (/\.(png|webp|jpe?g|svg)$/i.test(f.name)) out.push({ path, get: async () => f });
  }
  return out;
}
async function importLogos(fileList, statusEl) {
  const status = t => { statusEl.textContent = t; };
  try {
    const files = await collectFiles(fileList, status);
    if (!files.length) { status('이미지 파일을 찾지 못했습니다. PNG·SVG 또는 ZIP을 선택하세요.'); return; }
    const S = U.S(); const w = S ? S.w : C.buildWorld();
    const r = C.logos.match(w, files);
    const keys = Object.keys(r.got); let n = 0;
    for (const k of keys) { try { C.logos.map[k] = await C.logos.shrink(await r.got[k].get()); n++; if (n % 20 === 0) status(`변환 중… ${n}/${keys.length}`); } catch (e) { } }
    await saveLogos();
    const clubs = keys.filter(k => !k.startsWith('NAT_')).length, nats = keys.length - clubs;
    status(`구단 ${clubs}곳 · 국가대표 ${nats}곳 로고를 적용했습니다.${r.unmatched.length ? ` 매칭되지 않은 파일 ${r.unmatched.length}개.` : ''}`);
    toast(`로고 ${n}개 적용`);
    U.lastUnmatched = r.unmatched.slice(0, 60);
    U.render();
  } catch (e) { status(e.message === 'jszip' ? 'ZIP을 여는 도구를 불러오지 못했습니다. 압축을 풀고 PNG를 직접 선택하세요.' : '로고를 불러오지 못했습니다: ' + e.message); }
}
function logoCard() {
  const S = U.S(); const w = S ? S.w : null;
  const total = C.logos.n || 0;
  const nClub = Object.keys(C.logos.map).filter(k => !k.startsWith('NAT_')).length;
  const pk = Object.keys(C.logos.pack || {}), pkN = pk.filter(k => k.startsWith('NAT_')).length;
  const status = h('div', { class: 'mute', style: { fontSize: '13px' }, role: 'status' }, `내장 로고 팩: 구단 ${pk.length - pkN}곳 · 국가대표 ${pkN}곳` + (total ? ` · 직접 추가한 로고: 구단 ${nClub}곳 · 국가대표 ${total - nClub}곳 (내장보다 우선)` : ''));
  const fin = h('input', { id: 'logoFiles', type: 'file', multiple: true, accept: '.png,.svg,.webp,.jpg,.jpeg,.zip', style: { display: 'none' }, onchange: e => importLogos([...e.target.files], status) });
  const din = h('input', { id: 'logoDir', type: 'file', webkitdirectory: true, multiple: true, style: { display: 'none' }, onchange: e => importLogos([...e.target.files], status) });
  const drop = h('div', { class: 'drop', ondragover: e => { e.preventDefault(); drop.classList.add('on'); }, ondragleave: () => drop.classList.remove('on'), ondrop: e => { e.preventDefault(); drop.classList.remove('on'); importLogos([...e.dataTransfer.files], status); } },
    h('b', null, '로고 파일이나 ZIP을 여기에 끌어 놓으세요'),
    h('span', { class: 'mute', style: { fontSize: '12px' } }, '파일 이름(예: arsenal.png, south-korea-national-team.png)으로 구단과 국가대표를 자동으로 찾습니다'),
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } }, h('button', { class: 'btn sm', onclick: () => fin.click() }, '파일·ZIP 선택'), h('button', { class: 'btn ghost sm', onclick: () => din.click() }, '폴더 선택')), fin, din);
  // 개별 지정
  const q = h('input', { id: 'logoQ', placeholder: '구단·국가 검색 (예: 첼시, 대한민국)', style: { width: '100%' } });
  const list = h('div', { style: { display: 'grid', gap: '4px', maxHeight: '260px', overflowY: 'auto' } });
  const one = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  let target = null;
  one.addEventListener('change', async e => { const f = e.target.files[0]; if (!f || !target) return; C.logos.map[target] = await C.logos.shrink(f); await saveLogos(); toast('로고를 지정했습니다.'); draw(); one.value = ''; });
  const draw = () => {
    list.innerHTML = '';
    const t = q.value.trim(); if (!t) return;
    const items = [];
    if (w) for (const id in w.clubs) { const c = w.clubs[id]; if (c.name.includes(t) || c.en.toLowerCase().includes(t.toLowerCase())) items.push([id, c.name, U.crest(c, 22)]); }
    for (const code in C.logos.NAT_EN) { const nm = C.natName(code); if (nm.includes(t) || C.logos.NAT_EN[code].includes(t.toLowerCase())) items.push(['NAT_' + code, nm + ' 대표팀', U.natCrest(code, 22)]); }
    items.slice(0, 30).forEach(([k, nm, ic]) => list.append(h('div', { style: { display: 'grid', gridTemplateColumns: '28px 1fr auto auto', gap: '8px', alignItems: 'center', padding: '6px 4px', borderTop: '1px solid var(--line)' } }, ic, h('span', null, nm), h('button', { class: 'btn ghost sm', onclick: () => { target = k; one.click(); } }, '이미지 지정'), C.logos.map[k] ? h('button', { class: 'btn ghost sm', onclick: async () => { delete C.logos.map[k]; await saveLogos(); draw(); } }, '삭제') : h('span'))));
    if (!items.length) list.append(h('div', { class: 'mute', style: { padding: '8px' } }, '검색 결과가 없습니다.'));
  };
  q.addEventListener('input', draw);
  const un = U.lastUnmatched && U.lastUnmatched.length ? h('details', null, h('summary', { class: 'mute', style: { cursor: 'pointer', fontSize: '12px' } }, `매칭되지 않은 파일 ${U.lastUnmatched.length}개 보기`), h('div', { class: 'mute', style: { fontSize: '12px', wordBreak: 'break-all' } }, U.lastUnmatched.join(', '))) : null;
  return card('구단·국가대표 로고', null,
    h('div', { class: 'mute', style: { fontSize: '13px', display: 'grid', gap: '4px', marginBottom: '6px' } },
      h('span', null, '주요 리그 로고는 게임에 내장되어 있습니다. 로고가 없는 구단은 구단 색으로 그린 엠블럼이 보이고, 아래에서 직접 추가하면 이 브라우저에 저장됩니다.'),
      h('span', null, '1. football-logos.cc 또는 footylogos.com에서 리그·국가대표 로고를 PNG나 ZIP으로 내려받습니다.'),
      h('span', null, '2. 아래에 파일·ZIP·폴더를 통째로 넣습니다. 이름이 애매한 구단은 아래 검색으로 하나씩 지정할 수 있습니다.')),
    drop, status, un,
    h('div', { class: 'lbl', style: { marginTop: '10px' } }, '하나씩 지정'), q, list, one,
    total ? h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } }, h('button', { class: 'btn ghost sm', onclick: async () => { C.logos.map = {}; await saveLogos(); toast('로고를 모두 지웠습니다.'); U.render(); } }, '로고 모두 지우기')) : null);
}

// ---------- 저장 관리 ----------
function saveCard() {
  const S = U.S();
  const ta = h('textarea', { id: 'saveText', rows: 4, style: { width: '100%', fontFamily: 'monospace', fontSize: '11px', background: 'var(--panel2)', color: 'var(--fg)', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px', resize: 'vertical' }, placeholder: '내보낸 저장 데이터를 여기에 붙여 넣고 [불러오기]를 누르세요' });
  const fin = h('input', { type: 'file', accept: '.json,.txt', style: { display: 'none' }, onchange: async e => { const f = e.target.files[0]; if (f) { ta.value = await f.text(); toast('파일 내용을 넣었습니다. [불러오기]를 누르세요.'); } } });
  const confirmBox = h('div');
  const ask = (msg, fn) => { confirmBox.innerHTML = ''; confirmBox.append(h('div', { class: 'result', style: { borderLeft: '3px solid var(--bad)' } }, h('b', null, msg), h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn sm', style: { background: 'var(--bad)', color: '#fff' }, onclick: async () => { confirmBox.innerHTML = ''; await fn(); } }, '확인'), h('button', { class: 'btn ghost sm', onclick: () => { confirmBox.innerHTML = ''; } }, '취소')))); };
  return card('저장 관리', '커리어는 단계가 바뀔 때마다 이 브라우저에 자동 저장됩니다. 다른 기기로 옮기려면 내보내기를 쓰세요.',
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } },
      h('button', { class: 'btn sm', disabled: S ? null : true, onclick: () => { const t = G.TCG.serialize(S) || G.TCG.serialize(Object.assign({}, S, { phase: 'window' })); ta.value = t; ta.select(); try { navigator.clipboard.writeText(t).then(() => toast('저장 데이터를 복사했습니다.'), () => toast('텍스트를 선택했습니다. 복사하세요.')); } catch (e) { toast('텍스트를 선택했습니다. 복사하세요.'); } } }, '현재 커리어 내보내기'),
      h('button', { class: 'btn ghost sm', onclick: () => fin.click() }, '파일에서 읽기'),
      h('button', { class: 'btn ghost sm', onclick: () => { const o = G.TCG.parse(ta.value.trim()); if (!o || !o.w || !o.p) { toast('저장 데이터 형식이 맞지 않습니다.'); return; } ask(`${o.p.name} (${o.p.age}세) 커리어를 불러옵니다. 지금 커리어는 덮어씁니다.`, async () => { await U.loadSave(o); toast('커리어를 불러왔습니다.'); }); } }, '불러오기')),
    ta, fin, confirmBox,
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
      h('button', { class: 'btn ghost sm', disabled: S ? null : true, onclick: () => ask('진행 중인 커리어를 삭제합니다. 되돌릴 수 없습니다.', async () => { await U.clearSave(); toast('커리어를 삭제했습니다.'); }) }, '커리어 삭제'),
      h('button', { class: 'btn ghost sm', onclick: () => ask('명예의 전당 기록을 모두 지웁니다.', async () => { U.hof = []; await U.kvSet('hof', '[]'); toast('명예의 전당을 비웠습니다.'); }) }, '명예의 전당 비우기')));
}
})(window);
