// Road to Legend — 포메이션·AI 감독 전술·선발 배치
// 포메이션은 실제로 쓰이는 형태만. 선수는 '자기 베스트 포지션'이 아니라 포메이션의 자리(슬롯)에 배치되고, 라인업에도 그 자리로 나온다
// 자리 적합도: FC27 포지션 비트(가능 포지션) + 비슷한 자리 표. 안 맞는 자리에 쓰면 그만큼 실력이 덜 나온다
(function (G) {
const C = G.TC, { R, clamp, N } = C;

// ---------- 포메이션 ----------
// 슬롯: [자리, x(0 왼쪽~100 오른쪽), y(0 우리 골문~100 상대 골문)]
const FORMS = {
  '4-3-3': [['GK', 50, 4], ['LB', 12, 24], ['CB', 37, 18], ['CB', 63, 18], ['RB', 88, 24], ['CDM', 50, 38], ['CM', 30, 50], ['CM', 70, 50], ['LW', 15, 76], ['ST', 50, 84], ['RW', 85, 76]],
  '4-2-3-1': [['GK', 50, 4], ['LB', 12, 24], ['CB', 37, 18], ['CB', 63, 18], ['RB', 88, 24], ['CDM', 37, 40], ['CDM', 63, 40], ['LW', 16, 66], ['CAM', 50, 64], ['RW', 84, 66], ['ST', 50, 84]],
  '4-4-2': [['GK', 50, 4], ['LB', 12, 24], ['CB', 37, 18], ['CB', 63, 18], ['RB', 88, 24], ['LM', 14, 52], ['CM', 38, 46], ['CM', 62, 46], ['RM', 86, 52], ['ST', 38, 82], ['ST', 62, 82]],
  '4-1-4-1': [['GK', 50, 4], ['LB', 12, 24], ['CB', 37, 18], ['CB', 63, 18], ['RB', 88, 24], ['CDM', 50, 36], ['LM', 14, 56], ['CM', 37, 52], ['CM', 63, 52], ['RM', 86, 56], ['ST', 50, 84]],
  '4-3-1-2': [['GK', 50, 4], ['LB', 12, 24], ['CB', 37, 18], ['CB', 63, 18], ['RB', 88, 24], ['CDM', 50, 38], ['CM', 28, 48], ['CM', 72, 48], ['CAM', 50, 64], ['ST', 38, 84], ['ST', 62, 84]],
  '4-4-1-1': [['GK', 50, 4], ['LB', 12, 24], ['CB', 37, 18], ['CB', 63, 18], ['RB', 88, 24], ['LM', 14, 50], ['CM', 38, 44], ['CM', 62, 44], ['RM', 86, 50], ['CAM', 50, 68], ['ST', 50, 85]],
  '3-4-3': [['GK', 50, 4], ['CB', 25, 20], ['CB', 50, 17], ['CB', 75, 20], ['LWB', 10, 46], ['CM', 38, 44], ['CM', 62, 44], ['RWB', 90, 46], ['LW', 20, 76], ['ST', 50, 84], ['RW', 80, 76]],
  '3-4-2-1': [['GK', 50, 4], ['CB', 25, 20], ['CB', 50, 17], ['CB', 75, 20], ['LWB', 10, 46], ['CM', 38, 42], ['CM', 62, 42], ['RWB', 90, 46], ['CAM', 34, 68], ['CAM', 66, 68], ['ST', 50, 85]],
  '3-5-2': [['GK', 50, 4], ['CB', 25, 20], ['CB', 50, 17], ['CB', 75, 20], ['LWB', 10, 48], ['CDM', 50, 38], ['CM', 32, 52], ['CM', 68, 52], ['RWB', 90, 48], ['ST', 38, 82], ['ST', 62, 82]],
  '5-3-2': [['GK', 50, 4], ['LWB', 8, 30], ['CB', 28, 18], ['CB', 50, 16], ['CB', 72, 18], ['RWB', 92, 30], ['CM', 28, 48], ['CDM', 50, 42], ['CM', 72, 48], ['ST', 38, 80], ['ST', 62, 80]],
  '5-4-1': [['GK', 50, 4], ['LWB', 8, 28], ['CB', 28, 18], ['CB', 50, 16], ['CB', 72, 18], ['RWB', 92, 28], ['LM', 16, 52], ['CM', 38, 46], ['CM', 62, 46], ['RM', 84, 52], ['ST', 50, 80]]
};
const FK = Object.keys(FORMS);
C.FORMS = FORMS; C.FORMK = FK;
// 나라별 유행 (가중치)
const TREND = {
  ENG: { '4-2-3-1': 5, '4-3-3': 5, '4-4-2': 2, '3-4-2-1': 2, '4-1-4-1': 1, '3-4-3': 1 },
  ESP: { '4-3-3': 6, '4-2-3-1': 4, '4-4-2': 3, '4-1-4-1': 1 },
  ITA: { '3-5-2': 4, '3-4-2-1': 4, '4-3-3': 3, '4-2-3-1': 2, '3-4-3': 2, '4-3-1-2': 2 },
  GER: { '4-2-3-1': 5, '3-4-3': 2, '4-3-3': 3, '3-4-2-1': 2, '4-4-2': 2 },
  FRA: { '4-3-3': 5, '4-2-3-1': 4, '4-4-2': 2, '3-4-2-1': 1 },
  NED: { '4-3-3': 7, '4-2-3-1': 3 },
  POR: { '4-3-3': 3, '4-2-3-1': 4, '3-4-3': 2, '4-4-2': 2 },
  BRA: { '4-2-3-1': 4, '4-3-3': 3, '4-4-2': 3 }, ARG: { '4-4-2': 3, '4-3-3': 3, '4-2-3-1': 3, '3-5-2': 1 },
  _: { '4-2-3-1': 4, '4-3-3': 4, '4-4-2': 4, '4-1-4-1': 2, '3-5-2': 1, '5-3-2': 1, '5-4-1': 1, '4-4-1-1': 1 }
};
// ---------- 자리 적합도 ----------
// 같은 자리 1, 가능 포지션(FC27 비트) .97, 비슷한 자리는 아래 표, 나머지는 크게 떨어진다
const NEAR = {
  GK: {}, CB: { CDM: .86, LB: .84, RB: .84, LWB: .78, RWB: .78 }, LB: { LWB: .97, RB: .9, CB: .85, LM: .86, RWB: .85 }, RB: { RWB: .97, LB: .9, CB: .85, RM: .86, LWB: .85 },
  LWB: { LB: .96, LM: .92, RWB: .9, LW: .84 }, RWB: { RB: .96, RM: .92, LWB: .9, RW: .84 },
  CDM: { CM: .94, CB: .87, CAM: .8 }, CM: { CDM: .93, CAM: .92, LM: .85, RM: .85 }, CAM: { CM: .92, LW: .87, RW: .87, ST: .86, LM: .84, RM: .84 },
  LM: { LW: .95, LWB: .88, CM: .86, RM: .9, CAM: .84 }, RM: { RW: .95, RWB: .88, CM: .86, LM: .9, CAM: .84 },
  LW: { LM: .95, RW: .91, CAM: .88, ST: .86 }, RW: { RM: .95, LW: .91, CAM: .88, ST: .86 }, ST: { CAM: .86, LW: .86, RW: .86 }
};
const FAMK = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const ALT = { DM: 'CDM', AM: 'CAM', CF: 'ST' };
const norm = p => ALT[p] || p;
// 선수 x: { id, pos, ovr } — 가능 포지션 목록 (FC27이면 비트에서)
function posSet(x) {
  if (x._ps) return x._ps;
  const F = G.FC27, s = new Set([norm(x.pos)]);
  if (/^\d+$/.test(x.id) && F && F.P[+x.id]) { const b = F.P[+x.id][3]; FAMK.forEach((k, i) => { if ((b >> i) & 1) s.add(k); }); }
  else { const p = norm(x.pos); if (p === 'LW' || p === 'RW') s.add(p === 'LW' ? 'LM' : 'RM'); if (p === 'LB' || p === 'RB') s.add(p === 'LB' ? 'LWB' : 'RWB'); }
  Object.defineProperty(x, '_ps', { value: s, enumerable: false }); return s;
}
const fit = (x, slot) => { const p = norm(x.pos); if (p === slot) return 1; if (slot === 'GK' || p === 'GK') return .3; if (posSet(x).has(slot)) return .97; return (NEAR[p] && NEAR[p][slot]) || .72; };
C.posFit = fit;
// 그 자리에서 낼 수 있는 실력 (적합도가 낮을수록 OVR이 깎인다)
const eff = (x, slot) => { const f = fit(x, slot); return x.ovr - (1 - f) * 30 - Math.max(0, .84 - f) * 70; }; // 비슷한 자리는 조금, 전혀 다른 자리(예: 공격수 → 센터백)는 크게 깎인다
C.posEff = eff;

// ---------- 선발 배치 ----------
// sq: [{ id, pos, ovr, yb }], opt: { form, noise, fat(x), ban: Set, imp(0~1), rest } → { form, xi: [{x, slot, i}], bench }
// 중요한 경기(imp 높음)는 베스트 11, 덜 중요하면 로테이션(주전 휴식·유망주 기용)이 늘어난다
const SLOTORD = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'ST', 'CM', 'CAM', 'LW', 'RW', 'LM', 'RM'];
C.pickLineup = function (sq, opt) {
  opt = opt || {};
  const form = FORMS[opt.form] ? opt.form : '4-2-3-1', S = FORMS[form];
  let src = sq.slice(); if (opt.ban && opt.ban.size) { const ok = src.filter(x => !opt.ban.has(x.id)); if (ok.length >= 13) src = ok; }
  const imp = opt.imp == null ? .7 : opt.imp, rot = 1 - imp;
  // 개인 점수: OVR + 흔들림(로테이션 성향) - 피로 + 유망주 기회. 덜 중요한 경기는 상위 몇 명을 쉬게 한다
  const top = src.filter(x => norm(x.pos) !== 'GK').sort((a, b) => b.ovr - a.ovr).slice(0, 6).map(x => x.id);
  // 골키퍼는 흔들림 없이 주전 고정 (피로 영향도 작다). 컵 대회 로테이션(gkRot)이면 세컨드 키퍼가 나온다
  const gks = src.filter(x => norm(x.pos) === 'GK').sort((a, b) => b.ovr - a.ovr), gk2 = opt.gkRot && gks[1] && gks[1].ovr >= gks[0].ovr - 14 ? gks[1].id : null;
  // v43: 대회별 선발 성향. lg = 시즌 주전 위주(작은 흔들림 + 직전 선발 관성), cont = 정예, cup = 실험·로테이션. kind 없음(과거 시즌 생성 등) = 예전 방식
  const K = opt.kind, prev = opt.prev, moF = opt.mo, prefF = opt.pref;
  // v44: 대회 종류가 아니라 그 경기의 중요도(구단 상황·단계·상대·더비로 정한 imp)로 정한다 — 같은 컵이라도 구단에 따라 정예일 수도, 로테이션일 수도
  const sd = K ? .3 + rot * rot * 3.6 : 1.2 + rot * 3.2;
  const inc = K ? 2 * clamp(imp * 1.35 - .25, 0, 1) * (K === 'cup' ? .7 : 1) : 0; // 직전 리그·대륙 선발 관성
  const restP = K ? rot * rot * .7 : rot * rot * .7;
  const extra = x => (K ? (prefF ? prefF(x.id) : 0) + (moF ? moF(x.id) * .75 : 0) + (prev ? (prev.get(x.id) || 0) * inc : 0) : 0);
  const base = new Map(src.map(x => [x.id, norm(x.pos) === 'GK' ? (x.id === gk2 ? 30 : 0) - (opt.fat ? opt.fat(x) * .3 : 0) + (K && prev ? (prev.get(x.id) || 0) * 2.5 : 0) : (opt.noise == null ? N(0, sd) : opt.noise) + extra(x) - (opt.fat ? opt.fat(x) * (.6 + rot * .9) : 0) + (x.yb || 0) * rot * 2.2 - (top.includes(x.id) && R() < restP ? 7 : 0)]));
  const used = new Set(), xi = new Array(S.length);
  const order = S.map((s, i) => i).sort((a, b) => SLOTORD.indexOf(S[a][0]) - SLOTORD.indexOf(S[b][0]));
  for (const i of order) {
    const slot = S[i][0]; let best = null, bs = -1e9;
    for (const x of src) { if (used.has(x.id)) continue; const v = eff(x, slot) + base.get(x.id); if (v > bs) { bs = v; best = x; } }
    if (best) { used.add(best.id); xi[i] = { x: best, slot, i }; }
  }
  // 맞바꾸기로 다듬기: 두 선수 자리를 바꿔 합이 나아지면 바꾼다
  for (let it = 0; it < 2; it++) for (let a = 1; a < xi.length; a++) for (let b = a + 1; b < xi.length; b++) {
    const A = xi[a], B = xi[b]; if (!A || !B) continue;
    if (eff(A.x, B.slot) + eff(B.x, A.slot) > eff(A.x, A.slot) + eff(B.x, B.slot) + .5) { const t = A.x; A.x = B.x; B.x = t; }
  }
  const bench = src.filter(x => !used.has(x.id)).sort((a, b) => (b.ovr + base.get(b.id)) - (a.ovr + base.get(a.id)));
  // 교체 명단 (nb명, 대회 규정): 골키퍼(9명 이하 1 · 12명 2 · 15명 3) + 수비·미드·공격 최소 2명씩 + 나머지는 좋은 선수 순
  const nb = opt.nb || 9, ngk = nb >= 15 ? 3 : nb >= 12 ? 2 : 1, out = [];
  for (const x of bench) if (norm(x.pos) === 'GK' && out.length < ngk) out.push(x);
  const of = bench.filter(x => norm(x.pos) !== 'GK'), grp = x => { const p = norm(x.pos); return p === 'CB' || /B$/.test(p) ? 'D' : /^(CDM|CM|CAM)$/.test(p) ? 'M' : 'A'; };
  for (const g of ['D', 'M', 'A']) { let k = 0; for (const x of of) if (k < 2 && grp(x) === g && !out.includes(x) && out.length < nb) { out.push(x); k++; } }
  for (const x of of) { if (out.length >= nb) break; if (!out.includes(x)) out.push(x); }
  const gkOut = out.filter(x => norm(x.pos) === 'GK'), ofOut = out.filter(x => norm(x.pos) !== 'GK').sort((a, b) => (b.ovr + base.get(b.id)) - (a.ovr + base.get(a.id)));
  return { form, xi: xi.filter(Boolean), bench: gkOut.concat(ofOut) };
};
C.lineupFit = L => L.xi.reduce((t, s) => t + fit(s.x, s.slot), 0) / Math.max(1, L.xi.length);

// ---------- AI 감독 전술 ----------
// 감독 성향(이름으로 고정): 주 포메이션·보조 포메이션, 압박·수비 라인·템포·폭, 공격 방식·수비 방식, 로테이션·유망주 기용
const BUILD = ['점유율', '역습', '직선적', '측면 공략', '중앙 침투'], DEF = ['전방 압박', '중간 블록', '낮은 블록'];
C.mgrStyle = function (M, nat) {
  if (M.press != null && M.f2) return M;
  // 실제 감독은 데이터의 포메이션·공격·수비 방식을 쓰고, 나머지 값만 이름 시드로 채운다
  const r = C.seeded('mgr|' + M.n), T = TREND[M.nat] || TREND[nat] || TREND._;
  const wp = (o) => { const ks = Object.keys(o), tot = ks.reduce((a, k) => a + o[k], 0); let u = r() * tot; for (const k of ks) { u -= o[k]; if (u <= 0) return k; } return ks[0]; };
  const f = wp(T); if (!M.f) M.f = f; let f2 = wp(T), k = 0; while (f2 === M.f && k++ < 8) f2 = wp(TREND._); if (!M.f2) M.f2 = f2;
  const DP = { '전방 압박': [70, 95], '중간 블록': [42, 68], '낮은 블록': [22, 42] };
  const pr = Math.round(25 + r() * 70), ln = r(), tp = Math.round(30 + r() * 65), wd = Math.round(25 + r() * 70), bi = Math.floor(r() * BUILD.length), di = Math.floor(r() * 3), ro = r(), yp = r(), q = r();
  M.press = M.def && DP[M.def] ? Math.round(DP[M.def][0] + (DP[M.def][1] - DP[M.def][0]) * (pr - 25) / 70) : pr;
  M.line = Math.round(clamp(M.press + (ln - .5) * 40, 10, 95));
  M.tempo = M.build === '점유율' ? Math.round(30 + tp * .45) : M.build === '역습' || M.build === '직선적' ? Math.round(60 + (tp - 30) * .5) : tp;
  M.width = M.build === '측면 공략' ? Math.max(70, wd) : M.build === '중앙 침투' ? Math.min(45, wd) : wd;
  if (!M.build) M.build = BUILD[bi]; if (!M.def) M.def = M.press > 68 ? DEF[0] : M.press < 40 ? DEF[2] : DEF[di];
  M.rot = Math.round(ro * 100) / 100; M.yp = Math.round(yp * 100) / 100;
  if (M.q == null) M.q = Math.round((q - .5) * 120) / 100; // 지도력 -0.6 ~ +0.6 (전력 보정)
  return M;
};
C.BUILD = BUILD; C.DEFS = DEF;
// 포지션별 선호 유형 (이름으로 고정) — 표시용
const PREF = { GK: ['스위퍼 키퍼', '전통형 골키퍼'], CB: ['빌드업형 센터백', '스토퍼', '커버형 센터백'], FB: ['공격형 풀백', '인버티드 풀백', '수비형 풀백'],
  DM: ['앵커', '딥 라잉 플레이메이커', '볼 위닝 미드필더'], CM: ['박스 투 박스', '플레이메이커', '메짤라'], W: ['인버티드 윙어', '정통 윙어', '인사이드 포워드'], ST: ['타깃형 스트라이커', '침투형 스트라이커', '가짜 9번', '압박형 스트라이커'] };
C.PREFK = [['GK', '골키퍼'], ['CB', '센터백'], ['FB', '풀백·윙백'], ['DM', '수비형 미드'], ['CM', '중앙 미드'], ['W', '측면 공격'], ['ST', '최전방']];
C.mgrPref = M => { if (M.pf) return M.pf; const r = C.seeded('mpf|' + M.n), o = {}; for (const k in PREF) o[k] = PREF[k][Math.floor(r() * PREF[k].length)];
  if (M.build === '점유율') { o.GK = '스위퍼 키퍼'; o.CB = '빌드업형 센터백'; } if (M.def === '전방 압박' && r() < .6) o.ST = '압박형 스트라이커'; if (M.build === '측면 공략' && r() < .6) o.W = '정통 윙어';
  Object.defineProperty(M, 'pf', { value: o, enumerable: false, configurable: true }); return o; };
C.mgrPlan = M => ({ att: { '점유율': '짧은 패스로 점유하며 상대를 끌어낸 뒤 공간 침투', '역습': '내려앉아 공을 뺏은 뒤 빠른 전환으로 뒷공간 공략', '직선적': '전방으로 빠르게 연결하고 세컨드볼 경합', '측면 공략': '측면으로 벌려 크로스·컷백으로 마무리', '중앙 침투': '하프스페이스와 중앙 연계로 박스 안 침투' }[M.build],
  def: { '전방 압박': '상대 진영부터 강하게 압박해 높은 위치에서 회수', '중간 블록': '중원에서 간격을 좁혀 패스 길을 차단', '낮은 블록': '박스 앞에 두 줄을 세우고 역습 기회를 노림' }[M.def] });
// 구단 감독의 이번 경기 포메이션: 주 포메이션, 가끔(또는 선수 구성이 안 맞으면) 보조
C.formFor = (w, id, M, sq) => {
  if (!M) return '4-2-3-1';
  if (!sq || R() < .82) return M.f;
  const a = C.lineupFit(C.pickLineup(sq, { form: M.f, noise: 0 })), b = C.lineupFit(C.pickLineup(sq, { form: M.f2, noise: 0 }));
  return b > a + .02 ? M.f2 : M.f;
};
// 팀 베스트 11 (감독 주 포메이션, 흔들림 없이)
C.bestXI = (w, id) => {
  const c = w.clubs[id]; if (!c) return null;
  const M = C.mgrOf ? C.mgrOf(w, id) : null; if (M) C.mgrStyle(M, c.nat);
  const sq = C.MD.clubSide(w, id, w.year).sq;
  return C.pickLineup(sq, { form: M ? M.f : '4-2-3-1', noise: 0, imp: 1 });
};
// 전력 보정(약하게): 베스트 11이 포메이션에 얼마나 맞는지 + 감독 지도력. 매주 다시 계산
C.tacAdj = (w, id) => {
  const c = w.clubs[id]; if (!c || c.lite || !C.mgrOf) return 0;
  const M = C.mgrStyle(C.mgrOf(w, id), c.nat), L = C.pickLineup(C.MD.clubSide(w, id, w.year).sq, { form: M.f, noise: 0, imp: 1 });
  return clamp((C.lineupFit(L) - .97) * 12, -1.2, .3) + (M.q || 0);
};
})(typeof window !== 'undefined' ? window : globalThis);
