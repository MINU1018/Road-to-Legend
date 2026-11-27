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
    row('급여 단위', '계약·선수 정보·이적 기록에 표시되는 급여 (통화 설정을 따름)', seg('wage', cfg.wageMode, [['day', '일급'], ['week', '주급'], ['month', '월급'], ['year', '연봉']], v => { cfg.wageMode = v; saveCfg(); upd(); })),
    row('환율', '기본값은 대략적인 값입니다. 원하는 값으로 바꿀 수 있습니다.', h('div', { style: { display: 'grid', gap: '6px' } }, rateIn('KRW', '원'), rateIn('USD', '$'), rateIn('GBP', '£'), rateIn('JPY', '¥'))),
    row('예시', '시장 가치 4,500만 유로 · 주급 8만 5천 유로', sample)));
  // 게임 밸런스
  root.append(card('게임 밸런스', '새 시즌부터 적용됩니다.',
    row('난이도', '커리어를 시작할 때 정하며, 진행 중인 커리어에서는 바꿀 수 없습니다', h('b', null, (() => { const S0 = U.S(); return S0 && S0.diff ? ((C.DIFF[S0.diff] || {}).name || '보통') + ' (현재 커리어)' : '새 커리어 화면에서 선택'; })())),
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
  if (U.cloud) root.append(cloudCard());
  if (U.boxesReset) { const bs = U.boxesState();
    root.append(card('화면 상자', '상자 머리의 ▾로 접고 펴며, 홈 화면에서는 ⋮⋮ 손잡이를 끌어 순서를 바꿉니다. 이 브라우저에 기억합니다.', h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
      h('button', { class: 'btn ghost sm', onclick: () => { U.boxesReset('fold'); toast('접은 상자를 모두 펼쳤습니다.'); } }, `접은 상자 모두 펼치기 (${bs.folds})`),
      h('button', { class: 'btn ghost sm', onclick: () => { U.boxesReset('ord'); toast('홈 화면 상자 순서를 처음대로 되돌렸습니다.'); } }, '홈 상자 순서 되돌리기')))); }
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
  const confirmBox = h('div');
  const ask = (msg, fn) => { confirmBox.innerHTML = ''; confirmBox.append(h('div', { class: 'result', style: { borderLeft: '3px solid var(--bad)' } }, h('b', null, msg), h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { class: 'btn sm', style: { background: 'var(--bad)', color: '#fff' }, onclick: async () => { confirmBox.innerHTML = ''; await fn(); } }, '확인'), h('button', { class: 'btn ghost sm', onclick: () => { confirmBox.innerHTML = ''; } }, '취소')))); };
  const fin = saveInput(o => ask(`${o.p.name} (${o.p.age}세 · ${(o.hist || []).length}시즌) 커리어를 불러옵니다. 지금 커리어는 덮어씁니다.`, async () => { await U.loadSave(o); toast('커리어를 불러왔습니다.'); }));
  return card('저장 관리', '커리어는 단계가 바뀔 때마다 이 브라우저에 자동 저장됩니다. 다른 기기·브라우저로 옮기려면 저장 파일로 내보낸 뒤 불러오세요.',
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } },
      h('button', { class: 'btn sm', disabled: S ? null : true, onclick: () => U.exportSave() }, '저장 파일 내보내기 (.json)'),
      h('button', { class: 'btn ghost sm', onclick: () => fin.click() }, '저장 파일 불러오기')),
    fin, confirmBox,
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
      h('button', { class: 'btn ghost sm', disabled: S ? null : true, onclick: () => ask('진행 중인 커리어를 삭제합니다. 되돌릴 수 없습니다.', async () => { await U.clearSave(); toast('커리어를 삭제했습니다.'); }) }, '커리어 삭제'),
      h('button', { class: 'btn ghost sm', onclick: () => ask('명예의 전당 기록을 모두 지웁니다.', async () => { U.hof = []; await U.kvSet('hof', '[]'); toast('명예의 전당을 비웠습니다.'); }) }, '명예의 전당 비우기')));
}
// ---------- 클라우드 저장 (Supabase) ----------
const fmtAt = t => { if (!t) return '-'; const d = new Date(t); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const fmtSz = b => b > 1e6 ? (b / 1e6).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1e3)) + 'KB';
U.cloudSlotsBox = function (onDone) {
  const CL = U.cloud, S = U.S(), box = h('div', { class: 'cslots' }, h('div', { class: 'mute' }, '목록을 불러오는 중…'));
  const names = { slot1: '슬롯 1', slot2: '슬롯 2', slot3: '슬롯 3', auto: '자동 저장 (시즌 끝)' };
  const draw = L => {
    box.replaceChildren(...[...CL.SLOTS, CL.AUTO].map(k => {
      const m = L[k];
      return h('div', { class: 'cslot' },
        h('div', { class: 'cslt' }, h('b', null, names[k]), m ? h('span', null, `${m.name}${m.age ? ` · ${m.age}세` : ''}${m.club ? ` · ${m.club}` : ''} · ${m.season}`) : h('span', { class: 'mute' }, '비어 있음'), m ? h('small', { class: 'mute' }, `${fmtAt(m.at)} · ${fmtSz(m.size || 0)}`) : null),
        h('div', { class: 'csltb' },
          k !== CL.AUTO ? h('button', { class: 'btn sm', disabled: S ? null : true, onclick: async e => { if (m && !confirm(`${names[k]}에 덮어씁니다.`)) return; e.target.disabled = true; e.target.textContent = '저장 중…'; try { await CL.save(U.S(), k); toast('클라우드에 저장했습니다.'); draw(await CL.slots()); } catch (er) { toast(er.message); e.target.disabled = false; e.target.textContent = '여기에 저장'; } } }, '여기에 저장') : null,
          m ? h('button', { class: 'btn ghost sm', onclick: async e => { if (U.S() && U.S().phase !== 'retired' && !confirm('진행 중인 커리어를 덮어씁니다.')) return; e.target.disabled = true; e.target.textContent = '받는 중…'; try { const o = await CL.load(k); await U.loadSave(o); toast('클라우드 저장을 불러왔습니다.'); if (onDone) onDone(); } catch (er) { toast(er.message); e.target.disabled = false; e.target.textContent = '불러오기'; } } }, '불러오기') : null,
          m ? h('button', { class: 'btn ghost sm', onclick: async () => { if (!confirm(`${names[k]}를 지웁니다.`)) return; try { await CL.remove(k); draw(await CL.slots()); } catch (er) { toast(er.message); } } }, '삭제') : null));
    }));
  };
  CL.slots().then(draw).catch(e => box.replaceChildren(h('div', { class: 'result' }, h('b', null, '목록을 불러오지 못했습니다'), h('span', { class: 'mute' }, e.message))));
  return box;
};
function cloudCard() {
  const CL = U.cloud, wrap = h('div');
  const paint = async () => {
    await CL.init();
    const parts = [];
    if (CL.err) parts.push(h('div', { class: 'result' }, h('b', null, '로그인 오류'), h('span', { class: 'mute' }, CL.err)));
    if (!CL.on()) {
      const u = h('input', { type: 'url', placeholder: 'https://xxxx.supabase.co', value: '' }), k = h('input', { type: 'text', placeholder: '공개 키 (publishable / anon)', value: '' });
      parts.push(h('p', { class: 'mute' }, '이 주소에서는 Supabase 설정을 찾지 못했습니다. Vercel 배포 주소에서는 자동으로 연결됩니다. 여기서 쓰려면 Supabase 프로젝트 URL과 공개 키를 넣으세요 (비밀 키는 넣지 마세요).'),
        h('div', { class: 'cform' }, u, k, h('button', { class: 'btn sm', onclick: async () => { if (/secret|service_role/i.test(k.value)) { toast('비밀 키는 넣으면 안 됩니다. 공개 키를 넣으세요.'); return; } await CL.setManual(u.value, k.value); paint(); } }, '연결')));
    } else if (!CL.logged()) {
      const em = h('input', { type: 'email', placeholder: '이메일 주소', autocomplete: 'email' }), msg = h('div', { class: 'mute' }), pv = await CL.providers();
      parts.push(h('p', { class: 'mute' }, '로그인하면 커리어를 클라우드 슬롯 3개(+시즌 끝 자동 저장)에 올려 다른 기기에서 이어 할 수 있습니다.'),
        h('div', { class: 'cform' }, em, h('button', { class: 'btn sm', onclick: async e => { if (!/@/.test(em.value)) { toast('이메일 주소를 확인해 주세요.'); return; } e.target.disabled = true; try { await CL.sendLink(em.value.trim()); msg.textContent = `${em.value}로 로그인 링크를 보냈습니다. 메일의 링크를 이 브라우저에서 열면 로그인됩니다.`; } catch (er) { msg.textContent = '보내지 못했습니다: ' + er.message; } e.target.disabled = false; } }, '로그인 링크 보내기'), pv.google ? h('button', { class: 'btn ghost sm', onclick: () => CL.google() }, '구글로 로그인') : null, pv.github ? h('button', { class: 'btn ghost sm', onclick: () => CL.github() }, 'GitHub로 로그인') : null), msg);
    } else {
      parts.push(h('div', { class: 'srow' }, h('div', null, h('div', { style: { fontWeight: 600 } }, CL.sess.email || '로그인됨'), h('div', { class: 'mute', style: { fontSize: '12px' } }, CL.cfg.src === 'vercel' ? 'Vercel 연동 설정' : '직접 넣은 설정')), h('button', { class: 'btn ghost sm', onclick: () => { CL.logout(); paint(); } }, '로그아웃')),
        row('시즌이 끝날 때 자동 저장', "시즌 결산마다 '자동 저장' 슬롯에 덮어씁니다", toggle('cloudAuto', CL.autoOn(), v => CL.setAuto(v))),
        U.cloudSlotsBox());
    }
    if (CL.on() && CL.cfg.src === 'manual') parts.push(h('div', { style: { marginTop: '6px' } }, h('button', { class: 'btn ghost sm', onclick: async () => { await CL.setManual('', ''); paint(); } }, '직접 넣은 설정 지우기')));
    wrap.replaceChildren(...parts);
  };
  paint();
  return card('클라우드 저장', 'Supabase에 저장합니다. 저장 내용은 저장 파일 내보내기와 같고(압축), 로그인한 본인만 볼 수 있습니다.', wrap);
}
function saveInput(onOk) {
  return h('input', { type: 'file', accept: '.json,.txt,application/json', style: { display: 'none' }, onchange: async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const o = G.TCG.parse((await f.text()).trim());
    if (!o || !o.w || !o.p) { toast('저장 파일 형식이 맞지 않습니다.'); return; }
    onOk(o);
  } });
}
// 처음 화면에서 바로 불러오기
U.pickSaveFile = function () {
  const inp = saveInput(async o => {
    const cur = U.S();
    if (cur && cur.phase !== 'retired') {
      const ok = await U.overlay(close => [h('div', { class: 'head' }, h('h2', null, '저장 파일 불러오기'), h('span', { class: 'mute' }, `${o.p.name} (${o.p.age}세 · ${(o.hist || []).length}시즌)`)), h('div', { class: 'body' }, h('p', { class: 'mute' }, '진행 중인 커리어를 덮어씁니다.'), h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } }, h('button', { class: 'btn ghost', onclick: () => close(false) }, '취소'), h('button', { class: 'btn gold', onclick: () => close(true) }, '불러오기')))]);
      if (!ok) return;
    }
    await U.loadSave(o); toast('커리어를 불러왔습니다.');
  });
  document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
};
// 저장 파일 다운로드: claude.ai 안에서는 downloads 기능, 그 밖(Vercel 등)에서는 브라우저 다운로드
U.exportSave = async function (obj) {
  const S = obj || U.S(); if (!S) return;
  const t = G.TCG.serialize(S, true) || G.TCG.serialize(Object.assign({}, S, { phase: S.mode === 'world' ? 'world' : 'window' }), true);
  const safe = (S.p.name || 'player').replace(/[^\w가-힣-]+/g, '_').slice(0, 24);
  const fn = S.mode === 'world' ? `RoadToLegend_관전모드_${S.w.year}.json` : `RoadToLegend_${safe}_${S.p.age}세_${S.w.year}.json`;
  try {
    const dl = G.claude && G.claude.use ? await Promise.race([G.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 2500))]) : null;
    if (dl) { try { await dl.save({ filename: fn, data: t }); toast('저장 파일을 내보냈습니다.'); } catch (e) { if (e && e.code !== 'declined') toast('파일 저장을 할 수 없는 환경입니다.'); } return; }
  } catch (e) { /* 아래 방식으로 */ }
  try {
    const url = URL.createObjectURL(new Blob([t], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = fn; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast('저장 파일을 내려받았습니다.');
  } catch (e) { toast('파일 저장을 할 수 없는 환경입니다.'); }
};
})(window);
