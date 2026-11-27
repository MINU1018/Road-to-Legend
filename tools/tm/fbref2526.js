// 2025/26 유럽 5대 리그 선수 리그 기록 (FBref 표준 기록, 시즌 종료 뒤 스냅샷) → data_s2526.js
// 원본: tools/tm/src/fbref_2526.csv (Kaggle 'Football Players Stats (2025-2026)' by Hubert Sidorowicz, FBref 기반 — GitHub krutz01/Football-player-analytics-hub 사본)
// 실행: node tools/tm/fbref2526.js
// 대응: 선수 = 이름(악센트·기호 제거) + 출생 연도 (+ 국적), 구단 = 같은 나라 FC27 구단 이름 유사도 + 수동 표
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'tools', 'load.js')); // 게임과 같은 순서로 데이터 로드 (무소속·추가 선수 포함 → 선수 번호 = 게임 pid)
const F = (globalThis.window || globalThis).FC27 || globalThis.FC27;
const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/ı/g, 'i').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// CSV
const csvRows = s => { const out = []; let row = [], cur = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } if (cur || row.length) { row.push(cur); out.push(row); } return out; };
const raw = csvRows(fs.readFileSync(path.join(__dirname, 'src', 'fbref_2526.csv'), 'utf8')), H = raw[0];
const rows = raw.slice(1).filter(r => r.length === H.length).map(r => Object.fromEntries(H.map((k, i) => [k, r[i]])));
const COMP = { 'eng Premier League': 'ENG', 'es La Liga': 'ESP', 'it Serie A': 'ITA', 'de Bundesliga': 'GER', 'fr Ligue 1': 'FRA' };
const LGN = { ENG: '프리미어리그', ESP: '라리가', ITA: '세리에 A', GER: '분데스리가', FRA: '리그 1' };
// 구단
const MAN = { 'Manchester Utd': 'Manchester United', 'Wolves': 'Wolverhampton Wanderers', 'Gladbach': 'Borussia Mönchengladbach', 'Köln': '1. FC Köln', 'Inter': 'Inter', 'Milan': 'AC Milan', 'Betis': 'Real Betis', 'Celta Vigo': 'RC Celta', 'Atlético Madrid': 'Atlético de Madrid', 'Bayern Munich': 'FC Bayern München', 'Dortmund': 'Borussia Dortmund', 'Leverkusen': 'Bayer 04 Leverkusen', 'Paris Saint-Germain': 'Paris Saint-Germain', 'Hamburger SV': 'Hamburger SV', 'St Pauli': 'FC St. Pauli', 'Mainz 05': '1. FSV Mainz 05', 'Union Berlin': '1. FC Union Berlin', 'Werder Bremen': 'SV Werder Bremen', 'Hoffenheim': 'TSG Hoffenheim', 'Heidenheim': '1. FC Heidenheim 1846', 'Freiburg': 'SC Freiburg', 'Augsburg': 'FC Augsburg', 'Wolfsburg': 'VfL Wolfsburg', 'Stuttgart': 'VfB Stuttgart', 'Eintracht Frankfurt': 'Eintracht Frankfurt', 'RB Leipzig': 'RB Leipzig', 'Hellas Verona': 'Hellas Verona', 'Oviedo': 'Real Oviedo', 'Lyon': 'Olympique Lyonnais', 'Marseille': 'Olympique de Marseille', 'Brest': 'Stade Brestois 29', 'Rennes': 'Stade Rennais FC', 'Lens': 'RC Lens', 'Lille': 'LOSC Lille', 'Nice': 'OGC Nice', 'Monaco': 'AS Monaco', 'Nantes': 'FC Nantes', 'Lorient': 'FC Lorient', 'Metz': 'FC Metz', 'Auxerre': 'AJ Auxerre', 'Angers': 'Angers SCO', 'Le Havre': 'Le Havre AC', 'Toulouse': 'Toulouse FC', 'Strasbourg': 'RC Strasbourg Alsace', 'Paris FC': 'Paris FC' };
const clubsByNat = {}; for (const c of F.clubs) (clubsByNat[c[5]] = clubsByNat[c[5]] || []).push(c);
const sim = (a, b) => { a = norm(a); b = norm(b); if (a === b) return 1; const A = new Set(a.split(' ').filter(x => x.length > 2 && !['fc', 'cf', 'afc', 'club', 'de', 'sv', 'ssc', 'ac', 'as', 'us', 'rc'].includes(x))), B = new Set(b.split(' ').filter(x => x.length > 2 && !['fc', 'cf', 'afc', 'club', 'de', 'sv', 'ssc', 'ac', 'as', 'us', 'rc'].includes(x))); let k = 0; for (const x of A) if (B.has(x) || [...B].some(y => y.startsWith(x) || x.startsWith(y))) k++; return A.size ? k / Math.max(A.size, B.size) : 0; };
const FIXC = { 'FRA|Marseille': 'FRA_OM', 'FRA|Lyon': 'FRA_OL', 'ITA|Inter': 'ITA_INT', 'ITA|Atalanta': 'ITA_ATA', 'FRA|Paris Saint-Germain': 'FRA_PSG', 'ITA|Lazio': 'ITA_LAZ', 'ENG|Tottenham Hotspur': 'ENG_TOT', 'ITA|Milan': 'ITA_MIL', 'FRA|Le Havre': 'FRA_HAC', 'FRA|Strasbourg': 'FRA_RCS', 'ENG|Newcastle United': 'ENG_NEW' };
const clubMap = Object.assign({}, FIXC), clubMiss = [];
for (const r of rows) { const nat = COMP[r.Comp], key = nat + '|' + r.Squad; if (key in clubMap) continue;
  const want = MAN[r.Squad] || r.Squad; let best = null, bs = 0;
  for (const c of clubsByNat[nat] || []) { const s = Math.max(sim(want, c[6]), sim(r.Squad, c[6])); if (s > bs) { bs = s; best = c; } }
  if (best && bs >= .5) clubMap[key] = best[0]; else { clubMap[key] = null; clubMiss.push(key + ' → ' + (best ? best[6] + ' ' + bs.toFixed(2) : '-')); } }
// 선수
const D0 = Date.UTC(2000, 0, 1) / 864e5, yearOf = d => new Date((D0 + d) * 864e5).getUTCFullYear();
const idx = new Map(), idxL = new Map();
F.P.forEach((p, i) => { const y = yearOf(p[9]), n = norm(p[1]); const k = n + '|' + y; (idx.get(k) || idx.set(k, []).get(k)).push(i); const ln = n.split(' ').slice(-1)[0] + '|' + y; (idxL.get(ln) || idxL.set(ln, []).get(ln)).push(i); });
const out = {}; let ok = 0, miss = 0, amb = 0; const missL = [];
for (const r of rows) {
  const y = +r.Born, n = norm(r.Player), nat3 = (r.Nation || '').split(' ').pop();
  let c = idx.get(n + '|' + y) || [];
  if (!c.length) { // 성만 같고 출생 연도·국적이 같은 선수가 하나면
    const L = (idxL.get(n.split(' ').slice(-1)[0] + '|' + y) || []).filter(i => F.P[i][5] === nat3); if (L.length === 1) c = L; }
  if (!c.length) { // 이름 일부 포함 (예: 'Vinicius Junior' ↔ 'Vinicius Jr')
    const tok = n.split(' ').filter(x => x.length > 2); const L = []; for (const [k, v] of idx) { if (!k.endsWith('|' + y)) continue; const nm = k.split('|')[0]; if (tok.length && tok.every(t => nm.includes(t.slice(0, 5)))) for (const i of v) if (F.P[i][5] === nat3) L.push(i); } if (L.length === 1) c = L; }
  if (!c.length) { // 성 + 출생 연도가 유일하고 이름 토큰이 하나 이상 겹치면 (국적 표기가 다른 경우: 'Ange-Yoan Bonny' ↔ 'Yoan Bonny')
    const L = idxL.get(n.split(' ').slice(-1)[0] + '|' + y) || []; if (L.length === 1) { const t1 = new Set(n.split(' ')), t2 = norm(F.P[L[0]][1]).split(' '); if (t2.filter(x => t1.has(x)).length >= Math.min(2, t2.length)) c = L; } }
  if (c.length > 1) { const L = c.filter(i => F.P[i][5] === nat3); if (L.length === 1) c = L; else { amb++; continue; } }
  if (!c.length) { miss++; if (+r.MP >= 10) missL.push(`${r.Player} (${r.Squad}, ${y}, ${nat3}) ${r.MP}경기`); continue; }
  const pid = c[0], cid = clubMap[COMP[r.Comp] + '|' + r.Squad]; if (!cid) continue;
  ok++;
  (out[pid] = out[pid] || []).push([cid, COMP[r.Comp], +r.MP || 0, +r.Starts || 0, +String(r.Min).replace(/,/g, '') || 0, +r.Gls || 0, +r.Ast || 0, +r.PK || 0, +r.CrdY || 0, +r.CrdR || 0]);
}
// 압축: pid → '구단.나라.경기.선발.분.골.도움.PK.경고.퇴장|…'
const enc = {}; for (const k in out) enc[k] = out[k].map(x => x.join('.')).join('|');
const js = `// 자동 생성: tools/tm/fbref2526.js — 2025/26 유럽 5대 리그 선수 리그 기록 (FBref, 시즌 종료 뒤). FC27+TFMKT 프로필의 2025/26 시즌 줄에 쓴다\n// 값: '구단ID.나라.경기.선발.출전분.골.도움.PK골.경고.퇴장' (한 시즌 두 구단이면 |로 이어짐)\n(function(G){G.S2526={lg:${JSON.stringify(LGN)},p:${JSON.stringify(enc)}};})(typeof window!=='undefined'?window:globalThis);\n`;
fs.writeFileSync(path.join(ROOT, 'data_s2526.js'), js);
console.log('rows', rows.length, 'matched', ok, 'missing', miss, 'ambiguous', amb, 'players', Object.keys(out).length, 'bytes', js.length);
console.log('club miss', clubMiss); console.log(Object.entries(clubMap).map(([k, v]) => k + '=' + v).join('  '));
console.log('missing (10+ 경기) sample', missL.length, missL.slice(0, 40).join('\n'));
