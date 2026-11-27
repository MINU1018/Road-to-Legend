// 클라우드 저장 (v44) — Supabase Auth(이메일 로그인 링크 · GitHub) + Storage('saves' 버킷)
// 설정 값(프로젝트 URL · 공개 키)은 Vercel 배포에서는 /api/config(서버 환경 변수)에서, 그 밖에서는 설정 화면에 직접 넣은 값(이 브라우저에 저장)에서 읽는다
// 저장 파일 = '저장 파일 내보내기'와 같은 내용(gzip 압축). 경로: saves/<사용자 id>/<슬롯>.json.gz + <슬롯>.meta.json(선수·시즌 요약)
// 비밀 키(service role / secret)는 쓰지 않는다. 각 사용자는 자기 폴더만 읽고 쓸 수 있게 Storage 정책을 건다 (README '클라우드 저장' 참고)
(function (G) {
const U = G.TCUI = G.TCUI || {};
const LSK = 'rtl-cloud', BUCKET = 'saves', SLOTS = ['slot1', 'slot2', 'slot3'], AUTO = 'auto';
const CL = U.cloud = { cfg: null, sess: null, ready: false, err: null, list: null };
const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
const st = () => ls.get(LSK) || {};
const put = o => ls.set(LSK, Object.assign(st(), o));
// ---------- 설정 ----------
CL.init = async function () {
  if (CL.ready) return CL;
  const s = st();
  let cfg = s.url && s.key ? { url: s.url, key: s.key, src: 'manual' } : null;
  if (!cfg && /^https?:/.test(location.protocol)) {
    try { const r = await Promise.race([fetch('/api/config', { cache: 'no-store' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]); if (r.ok) { const j = await r.json(); if (j && j.url && j.key) cfg = { url: j.url.replace(/\/+$/, ''), key: j.key, src: 'vercel' }; } } catch (e) { /* 설정 없음 */ }
  }
  CL.cfg = cfg; CL.sess = s.sess || null;
  // 로그인 링크·GitHub 로그인에서 돌아온 경우: 주소의 #access_token=… 을 세션으로
  if (location.hash && /access_token=/.test(location.hash)) {
    const q = new URLSearchParams(location.hash.slice(1));
    CL.sess = { at: q.get('access_token'), rt: q.get('refresh_token'), exp: Date.now() / 1000 + (+q.get('expires_in') || 3600) };
    history.replaceState(null, '', location.pathname + location.search);
    await CL.who(); put({ sess: CL.sess }); CL.justIn = true;
  } else if (location.hash && /error_description=/.test(location.hash)) {
    const q = new URLSearchParams(location.hash.slice(1)); CL.err = q.get('error_description'); history.replaceState(null, '', location.pathname + location.search);
  }
  CL.ready = true; return CL;
};
CL.setManual = (url, key) => { put({ url: (url || '').trim().replace(/\/+$/, ''), key: (key || '').trim() }); CL.ready = false; return CL.init(); };
CL.on = () => !!CL.cfg;
CL.logged = () => !!(CL.sess && CL.sess.at);
const H = (auth, extra) => Object.assign({ apikey: CL.cfg.key }, auth && CL.sess ? { Authorization: 'Bearer ' + CL.sess.at } : { Authorization: 'Bearer ' + CL.cfg.key }, extra || {});
async function fresh() {
  if (!CL.logged()) throw new Error('로그인이 필요합니다.');
  if (CL.sess.exp && CL.sess.exp - Date.now() / 1000 > 60) return;
  const r = await fetch(CL.cfg.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: H(false, { 'Content-Type': 'application/json' }), body: JSON.stringify({ refresh_token: CL.sess.rt }) });
  if (!r.ok) { CL.logout(); throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.'); }
  const j = await r.json(); CL.sess = Object.assign(CL.sess, { at: j.access_token, rt: j.refresh_token, exp: Date.now() / 1000 + (j.expires_in || 3600) }); put({ sess: CL.sess });
}
CL.who = async function () {
  try { const r = await fetch(CL.cfg.url + '/auth/v1/user', { headers: H(true) }); if (!r.ok) return null; const j = await r.json(); CL.sess.uid = j.id; CL.sess.email = j.email || (j.user_metadata && (j.user_metadata.user_name || j.user_metadata.email)) || ''; return j; } catch (e) { return null; }
};
// ---------- 로그인 ----------
const back = () => location.origin + location.pathname;
CL.sendLink = async function (email) {
  const r = await fetch(CL.cfg.url + '/auth/v1/otp?redirect_to=' + encodeURIComponent(back()), { method: 'POST', headers: H(false, { 'Content-Type': 'application/json' }), body: JSON.stringify({ email, create_user: true }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.msg || j.error_description || j.message || ('오류 ' + r.status)); }
  return true;
};
CL.github = () => { location.href = CL.cfg.url + '/auth/v1/authorize?provider=github&redirect_to=' + encodeURIComponent(back()); };
CL.logout = function () { if (CL.sess && CL.cfg) fetch(CL.cfg.url + '/auth/v1/logout', { method: 'POST', headers: H(true) }).catch(() => {}); CL.sess = null; CL.list = null; put({ sess: null }); };
// ---------- 압축 ----------
async function gz(text) { if (!G.CompressionStream) return new Blob([text], { type: 'application/json' }); const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip')); return new Blob([await new Response(s).arrayBuffer()], { type: 'application/gzip' }); }
async function gunz(blob, isGz) { if (!isGz) return await blob.text(); const s = blob.stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(s).text(); }
// ---------- 저장소 ----------
const pathOf = slot => `${CL.sess.uid}/${slot}`;
async function up(path, body, type) {
  const r = await fetch(`${CL.cfg.url}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: H(true, { 'Content-Type': type, 'x-upsert': 'true', 'cache-control': 'no-cache' }), body });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || j.error || ('업로드 오류 ' + r.status) + (r.status === 404 || /bucket/i.test(j.message || '') ? ' — Supabase에 saves 버킷이 없습니다' : '')); }
}
CL.metaOf = S => ({ name: S.mode === 'world' ? '관전 모드' : (S.p && S.p.name) || '-', age: S.p ? S.p.age : null, mode: S.wc ? 'wc' : S.mode === 'world' ? 'world' : 'career', club: S.car && S.w && S.w.clubs[S.car.club] ? S.w.clubs[S.car.club].name : '', season: S.w ? C.wLabel(S.w.year) : '', date: S.w && S.w.cal ? S.w.cal.d : null, at: Date.now(), ver: G.TC && G.TC.VERSION || '' });
const C = G.TC;
CL.save = async function (S, slot) {
  await fresh(); if (!CL.sess.uid) await CL.who();
  const t = G.TCG.serialize(S, true) || G.TCG.serialize(Object.assign({}, S, { phase: S.mode === 'world' ? 'world' : 'window' }), true);
  const b = await gz(t), meta = Object.assign(CL.metaOf(S), { size: b.size, raw: t.length, gz: b.type === 'application/gzip' ? 1 : 0 });
  await up(pathOf(slot) + '.json' + (meta.gz ? '.gz' : ''), b, b.type);
  await up(pathOf(slot) + '.meta.json', new Blob([JSON.stringify(meta)], { type: 'application/json' }), 'application/json');
  CL.list = null; return meta;
};
CL.slots = async function () {
  await fresh(); if (!CL.sess.uid) await CL.who();
  const r = await fetch(`${CL.cfg.url}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: H(true, { 'Content-Type': 'application/json' }), body: JSON.stringify({ prefix: CL.sess.uid + '/', limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || ('목록 오류 ' + r.status)); }
  const files = await r.json(), out = {};
  for (const f of files) { const m = f.name.match(/^([\w-]+)\.meta\.json$/); if (!m) continue;
    try { const g = await fetch(`${CL.cfg.url}/storage/v1/object/authenticated/${BUCKET}/${CL.sess.uid}/${f.name}`, { headers: H(true), cache: 'no-store' }); if (g.ok) out[m[1]] = await g.json(); } catch (e) { } }
  CL.list = out; return out;
};
CL.load = async function (slot) {
  await fresh(); const meta = (CL.list || {})[slot] || {};
  const r = await fetch(`${CL.cfg.url}/storage/v1/object/authenticated/${BUCKET}/${pathOf(slot)}.json${meta.gz === 0 ? '' : '.gz'}`, { headers: H(true), cache: 'no-store' });
  if (!r.ok) throw new Error('불러오기 오류 ' + r.status);
  const o = G.TCG.parse((await gunz(await r.blob(), meta.gz !== 0)).trim());
  if (!o || !o.w) throw new Error('저장 파일 형식이 맞지 않습니다.');
  return o;
};
CL.remove = async function (slot) {
  await fresh();
  const r = await fetch(`${CL.cfg.url}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: H(true, { 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: [pathOf(slot) + '.json.gz', pathOf(slot) + '.json', pathOf(slot) + '.meta.json'] }) });
  if (!r.ok) throw new Error('삭제 오류 ' + r.status); CL.list = null;
};
// 시즌이 끝날 때 자동 백업 (설정에서 켬): 'auto' 슬롯
CL.autoOn = () => !!st().auto;
CL.setAuto = v => put({ auto: !!v });
CL.autoKick = function (S) {
  if (!CL.autoOn() || !CL.on() || !CL.logged() || !S || S.viewOnly) return;
  const key = (S.w && S.w.year) + '|' + ((S.hist || []).length);
  if (st().lastAuto === key) return; put({ lastAuto: key });
  CL.save(S, AUTO).then(() => U.toast && U.toast('클라우드에 자동 저장했습니다.')).catch(e => { console.error(e); U.toast && U.toast('클라우드 자동 저장 실패: ' + e.message); });
};
CL.SLOTS = SLOTS; CL.AUTO = AUTO;
})(window);
