// 터치라인 커리어 — 월드 커리어: 이야기 (v45)
// 라이벌 선수 · 라커룸 사건 · 미디어·팬 반응 피드 · 국가대표 서사
// 상태: S.wc.rv (라이벌), S.wc.feed (피드), S.wc.ntS (대표팀 기록)
(function (G) {
'use strict';
const C = G.TC, GM = G.TCG;
const { R, rnd, rint, clamp, pick, wpick } = C;
const WC = C.WC; if (!WC) return;
const ST = C.WCS = {};
const has = (S, k) => !!(S.wc && S.wc.per && S.wc.per.includes(k));
const O = (p, chip, good, eff, text, wc) => ({ p, chip, good, eff: eff || {}, text, wc });
const pr = (base, x) => clamp(base + x, .08, .92);
const myClub = S => S.w.clubs[S.car.club];
const sq = S => { const c = myClub(S); return c && c.sq ? c.sq.filter(e => e[0] !== 'ME') : []; };
const nm = (S, e) => C.pName(S.w, e);
const nationOf = (w, c) => c && c.lg && w.lg[c.lg] ? w.lg[c.lg].nation : null;
const GRP = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', CDM: 'M', CM: 'M', CAM: 'M', LW: 'A', RW: 'A', LM: 'A', RM: 'A', ST: 'A' };

// ================= 미디어·팬 반응 피드 =================
const MEDIA = ['현지 일간지', '축구 전문지', '스포츠 채널', '통계 매체', '해외 매체'];
const FANS = ['팬 커뮤니티', 'SNS', '서포터즈', '팬 게시판'];
function feed(S, k, txt, s, src, big) {
  const F = S.wc.feed = S.wc.feed || [];
  if (F.slice(0, 8).some(x => x.t === txt)) return; // 같은 문장이 연달아 쌓이지 않게
  F.unshift({ d: S.w.cal ? S.w.cal.d : 0, k, t: txt, s: s || 0, src: src || pick(k === 'fan' ? FANS : MEDIA), big: big ? 1 : 0 });
  if (F.length > 60) F.length = 60;
}
ST.feed = feed;
const josa = (w, a, b) => (C.jo ? C.jo(w, a, b) : w + a).slice(String(w).length); // 조사만
function matchFeed(S, m) {
  const p = S.p, nt = m.comp === 'nt', cn = nt ? C.natName(p.nat) : (myClub(S) || {}).name || '', r = m.rating, st = m.st || {};
  const win = m.gf > m.ga, loss = m.gf < m.ga, g = st.goals || 0, a = st.assists || 0, big = WC.isBig(S, m);
  const fanV = nt ? (S.wc.rel.nt || 0) : (S.wc.rel.fans[S.car.club] || 0);
  const vs = `${m.oppName}전`;
  // 헤드라인 (활약·결과에 따라)
  if (m.played && r != null) {
    let t = null, s = 0;
    if (g >= 3) { t = pick([`${p.name} 해트트릭! ${cn}, ${vs} ${m.gf}-${m.ga}`, `${vs}을 지배한 ${p.name}, 혼자 ${g}골`]); s = 1; }
    else if (g === 2) { t = pick([`${p.name} 멀티골, ${cn} ${win ? '승리 견인' : '고군분투'}`, `${vs} ${p.name} 두 골`]); s = 1; }
    else if (m.motm || r >= 8.2) { t = pick([`${vs} 최고의 선수는 ${p.name}`, `평점 ${r.toFixed(1)}, ${p.name}의 날`, `${p.name}, ${vs}에서 존재감 증명`]); s = 1; }
    else if (g === 1 && big) { t = pick([`${p.name}, 큰 경기에서 한 방`, `${vs} ${p.name} 결정적인 골`]); s = 1; }
    else if (r <= 5.8) { t = pick([`${p.name}, ${vs} 최악의 하루`, `${vs} 부진… ${p.name}에게 쏟아진 혹평`, `평점 ${r.toFixed(1)}, ${p.name} 고개 숙였다`]); s = -1; }
    else if (big && loss && r < 6.4) { t = `${vs} 패배, ${p.name}도 침묵`; s = -1; }
    else if (a >= 2) { t = `${p.name} 도움 ${a}개, ${vs} 조력자`; s = 1; }
    if (t) feed(S, 'media', t, s, null, s > 0 && (g >= 2 || big));
    // 팬 반응
    let f = null, fs = 0;
    if (r >= 7.6) { f = pick(fanV > .35 ? ['역시 우리 에이스', '이 선수 없었으면 어쩔 뻔', '오늘도 클래스 증명', '응원가 더 크게!'] : ['오늘 좀 하네?', '이 정도면 주전 자격 충분', '앞으로도 이렇게만']); fs = 1; }
    else if (r <= 6.1) { f = pick(fanV < -.2 ? ['또 이러네… 벤치로 보내라', '주급이 아깝다', '이제 인내심의 한계'] : ['오늘은 컨디션이 안 좋았나 봄', '다음 경기엔 보여 주겠지', '한 경기로 판단하긴 이르다']); fs = fanV < -.2 ? -1 : 0; }
    else if (g > 0) { f = pick(['골 넣어 줘서 고맙다', '세리머니 멋졌다', '득점 감각 살아 있네']); fs = 1; }
    if (f && R() < .8) feed(S, 'fan', `"${f}"`, fs);
  } else if (!nt && big && !m.played && m.why === '명단 제외' && fanV > .15 && R() < .35) {
    feed(S, 'fan', `"${p.name} 왜 명단에도 없어? 감독 설명 좀"`, 0);
  }
}

// ================= 라이벌 선수 =================
// 같은 포지션 그룹 · 비슷한 나이 · 비슷한 기량 · 다른 구단 선수 한 명. 시즌마다 비교하고 맞대결을 기록한다
const LGW = {};
function lgW(w, id) { if (LGW[id] == null) { const cs = Object.values(w.clubs).filter(c => c.lg === id); const a = cs.length ? cs.reduce((t, c) => t + c.str, 0) / cs.length : 60; LGW[id] = Math.exp((a - 68) * .2); } return LGW[id]; }
function pickRival(S, why) {
  const w = S.w, p = S.p, me = C.ovrOf(p), myC = myClub(S), myN = nationOf(w, myC), cand = [];
  for (const id in w.clubs) {
    const c = w.clubs[id]; if (!c.sq || !c.lg || id === S.car.club) continue;
    const lg = w.lg[c.lg]; if (!lg || lg.tier > Math.max(1, (w.lg[myC && myC.lg] || {}).tier || 1)) continue;
    const lw = lgW(w, c.lg);
    for (const e of c.sq) {
      if (e[0] === 'ME' || GRP[e[1]] !== GRP[p.pos] || Math.abs(e[3] - p.age) > 2 || Math.abs(e[2] - me) > 4) continue;
      if (S.wc.rv && String(S.wc.rv.id) === String(e[0])) continue;
      let x = lw; if (c.lg === (myC && myC.lg)) x *= 8; else if (lg.nation === myN) x *= 1.8; if (e[5] === p.nat) x *= 2.2; if (e[1] === p.pos) x *= 1.5;
      x *= Math.exp(-Math.abs(e[2] - me) * .25 - Math.abs(e[3] - p.age) * .3);
      cand.push([e, c, x]);
    }
  }
  const k = wpick(cand, z => z[2]); if (!k) return null;
  const [e, c] = k, old = S.wc.rv;
  S.wc.rv = { id: String(e[0]), n: nm(S, e), nat: e[5], pos: e[1], y0: w.year, c0: c.id, h2h: { w: 0, d: 0, l: 0, L: [] }, hist: [], prev: old ? (old.prevN || []).concat(old.n).slice(-4) : [] };
  S.wc.rv.prevN = S.wc.rv.prev;
  C.news(S, `${why === 'new' ? '새 라이벌' : '라이벌'} — 언론이 ${p.name}${josa(p.name, '과', '와')} ${S.wc.rv.n}(${c.name})을 비교하기 시작했다`, 'info', false);
  feed(S, 'media', `${p.name} vs ${S.wc.rv.n}: 같은 세대, 다른 길`, 0);
  return S.wc.rv;
}
ST.pickRival = pickRival;
function rvNow(S) {
  const R0 = S.wc.rv; if (!R0) return null;
  const f = C.findE ? C.findE(S.w, R0.id) : null;
  const e = f && f[0], c = f && f[1];
  return { e, c, ovr: e ? e[2] : null, age: e ? e[3] : null, live: C.liveLgStats ? C.liveLgStats(S.w, R0.id) : null };
}
ST.rvNow = rvNow;
// 이번 시즌 내 리그 기록 (라이벌과 같은 기준)
ST.meLg = function (S) { const L = (S.ss && S.ss.matches || []).filter(m => m.comp === 'league' && m.played), rs = L.filter(m => m.rating && (m.min || 0) >= 10); return { apps: L.length, g: L.reduce((t, m) => t + ((m.st && m.st.goals) || 0), 0), a: L.reduce((t, m) => t + ((m.st && m.st.assists) || 0), 0), r: rs.length ? +(rs.reduce((t, m) => t + m.rating, 0) / rs.length).toFixed(2) : null }; };
function rvSeason(S, yOff) {
  const P = S.w.ps && S.w.ps[S.wc.rv.id]; if (!P || !P.h) return null;
  const rows = String(P.h).split(';').filter(Boolean).map(x => x.split(',')).filter(x => +x[0] === yOff);
  if (!rows.length) return null;
  const o = { apps: 0, g: 0, a: 0, rs: 0 }; for (const x of rows) { o.apps += +x[2] || 0; o.g += +x[3] || 0; o.a += +x[4] || 0; o.rs += (+x[5] || 0) * (+x[2] || 0); }
  o.r = o.apps ? +(o.rs / 100 / o.apps).toFixed(2) : null; return o;
}
function rvEndSeason(S, rec) {
  const R0 = S.wc.rv; if (!R0 || !rec) return;
  const now = rvNow(S), yOff = (rec.y != null ? rec.y : S.w.year) - 2000;
  const rv = rvSeason(S, yOff) || (now && now.live) || null;
  const lgL = (rec.log || []).filter(x => x.c === 'league' && x.p), rs = lgL.filter(x => x.r && x.mi >= 10);
  const me = { apps: lgL.length, g: lgL.reduce((t, x) => t + (x.g || 0), 0), a: lgL.reduce((t, x) => t + (x.a || 0), 0), r: rs.length ? +(rs.reduce((t, x) => t + x.r, 0) / rs.length).toFixed(2) : null };
  R0.hist.push({ y: rec.label, me, rv: rv ? { apps: rv.apps, g: rv.g, a: rv.a, r: rv.r } : null, rc: now && now.c ? now.c.id : null, ro: now ? now.ovr : null, mo: rec.ovr1 });
  if (R0.hist.length > 20) R0.hist.shift();
  if (rv && me.apps >= 10) {
    const ms = me.g * 1 + me.a * .6 + (me.r || 6.6) * 3, rs = rv.g + rv.a * .6 + (rv.r || 6.6) * 3, ahead = ms >= rs;
    C.news(S, `라이벌 결산: ${S.p.name} ${me.g}골 ${me.a}도움 · ${R0.n} ${rv.g}골 ${rv.a}도움`, 'info', false);
    feed(S, 'media', ahead ? `이번 시즌 승자는 ${S.p.name}, ${R0.n}보다 한발 앞섰다` : `${R0.n}, 이번 시즌은 ${S.p.name}보다 앞섰다`, ahead ? 1 : -1);
    if (!ahead) WC.lean(S, 'comp', .25);
  }
  // 라이벌이 사라졌거나 기량 차가 너무 벌어지면 새 라이벌
  const gap = now && now.ovr != null ? Math.abs(now.ovr - C.ovrOf(S.p)) : 99;
  if (!now || !now.e || gap > 10) { S.wc.rvOld = (S.wc.rvOld || []).concat({ n: R0.n, y0: R0.y0, y1: S.w.year, h2h: R0.h2h }).slice(-5); S.wc.rv = null; }
}
function rvMatch(S, m) {
  const R0 = S.wc.rv; if (!R0 || m.comp === 'nt' || m.comp === 'ntY' || m.comp === 'youth') return;
  const now = rvNow(S); if (!now || !now.c || now.c.id !== m.opp) return;
  const res = m.gf > m.ga ? 'w' : m.gf < m.ga ? 'l' : 'd';
  R0.h2h[res]++; R0.h2h.L.unshift({ d: m.d, gf: m.gf, ga: m.ga, r: m.played ? m.rating : null, g: m.st ? m.st.goals || 0 : 0, comp: m.compName, c: m.opp }); if (R0.h2h.L.length > 12) R0.h2h.L.length = 12;
  if (m.played) feed(S, 'media', res === 'w' ? `${S.p.name}, 라이벌 ${R0.n}${josa(R0.n, '과', '와')}의 맞대결 승리` : res === 'l' ? `맞대결은 ${R0.n} 쪽 승리, ${S.p.name} 아쉬움` : `${S.p.name}–${R0.n} 맞대결, 승부 가리지 못했다`, res === 'w' ? 1 : res === 'l' ? -1 : 0, null, true);
}

// ================= 국가대표 서사 =================
function ntS(S) { return S.wc.ntS = S.wc.ntS || { debut: null, fg: null, tours: [], snub: [] }; }
const MAJOR = /월드컵|유로|코파|아시안컵|네이션스컵|골드컵|올림픽/;
function ntMatch(S, m) {
  if (m.comp !== 'nt') return;
  const N0 = ntS(S), cnt = S.cnt || {};
  if (m.played && !N0.debut) {
    N0.debut = { d: m.d, opp: m.oppName, comp: m.compName, age: S.p.age };
    feed(S, 'media', `${S.p.name}, ${C.natName(S.p.nat)} 대표팀 데뷔 (${m.oppName}전)`, 1, null, true);
    feed(S, 'fan', `"드디어 국가대표! 앞으로가 기대된다"`, 1, 'SNS');
    S.wc.q.push({ id: 'ntDebut', force: 1 });
  }
  if (m.played && m.st && m.st.goals && !N0.fg) {
    N0.fg = { d: m.d, opp: m.oppName, comp: m.compName };
    C.news(S, `${S.p.name}, A매치 데뷔골 (${m.oppName}전)`, 'mile', true);
    feed(S, 'media', `A매치 데뷔골! ${S.p.name}, ${m.oppName} 골망을 흔들다`, 1, null, true);
  }
  if (MAJOR.test(m.compName || '') && m.played) {
    const t = N0.tours.find(x => x.n === m.compName && Math.abs(x.y - S.w.year) <= 1); if (t) { t.apps++; t.g += (m.st && m.st.goals) || 0; t.last = m.stage; }
  }
}
// 대회 개막 열흘 전: 최종 명단 발표
function ntTourCheck(S) {
  const w = S.w, d = w.cal ? w.cal.d : 0, N0 = ntS(S), ss = S.ss; if (!w.cal || !w.cal.intl || !ss) return;
  for (const k in w.cal.intl) {
    const T = w.cal.intl[k]; if (!T.dates || !T.dates.length || T.done) continue;
    const dd = T.dates[0] - d; if (dd < 0 || dd > 12) continue;
    if (N0.tours.some(x => x.k === T.key) || N0.snub.some(x => x.k === T.key)) continue;
    const inT = (T.g || []).some(g => (g.t || []).includes(S.p.nat)); if (!inT) continue;
    if (ss.nt && ss.nt.lvl === 'A') {
      N0.tours.push({ k: T.key, n: T.n, y: +String(T.key).split(':').pop() || w.year, apps: 0, g: 0, num: null });
      C.news(S, `${C.natName(S.p.nat)} ${T.n} 최종 명단 발표 — ${S.p.name} 포함`, 'mile', true);
      feed(S, 'media', `${T.n} 최종 명단: ${S.p.name} 승선`, 1, null, true);
      S.wc.q.push({ id: 'ntTour', force: 1, k: T.key, n: T.n });
    } else if ((S.cnt && S.cnt.caps) >= 3) {
      N0.snub.push({ k: T.key, n: T.n, y: +String(T.key).split(':').pop() || w.year });
      C.news(S, `${C.natName(S.p.nat)} ${T.n} 명단 발표 — ${S.p.name} 제외`, 'info', true);
      feed(S, 'media', `${S.p.name}, ${T.n} 명단 탈락`, -1, null, true);
      feed(S, 'fan', pick(['"이건 이해가 안 된다"', '"요즘 폼이면 할 말 없지"', '"다음 대회엔 꼭 돌아오길"']), 0, 'SNS');
      S.wc.q.push({ id: 'ntSnub', force: 1, n: T.n });
    }
  }
}

// ================= 사건 (라커룸 · 라이벌 · 대표팀) =================
const WEV = WC.WEV;
const mates = S => (S.wc.rel.mates || []).filter(m => m.c === S.car.club && !m.gone);
const mateAvg = S => { const L = mates(S); return L.length ? L.reduce((a, m) => a + m.v, 0) / L.length : 0; };
const mvv = S => (S.wc.rel.mgr || {}).v || 0;
const lastWins = S => { const L = (S.ss && S.ss.matches || []).filter(m => m.comp === 'league' && m.d != null).slice(-3); return L.length === 3 && L.every(m => m.gf > m.ga); };
// 주장 선거
WEV.capVote = { w: S => S.car.status === 'first' && S.p.age >= 24 && S.car.years >= 2 && S.ss && ['key', 'starter'].includes(S.ss.role) && S.wc.capY !== S.w.year && !S.wc.capT ? (has(S, 'leader') ? 1.5 : .6) : 0, build: S => ({ title: '주장 선거', desc: `${(myClub(S) || {}).name} 선수단이 새 주장을 뽑습니다. 몇몇 동료가 당신에게 출마를 권합니다.`, icon: 'band', opts: [
  { label: '출마한다', desc: '라커룸을 이끌겠다', out: [O(pr(.42, mateAvg(S) * .5 + mvv(S) * .25 + (has(S, 'leader') ? .15 : 0)), '주장으로 뽑혔다', 1, { rep: 3, morale: 6 }, '이제 완장은 당신의 것입니다.', { mgr: .1, mates: .05, cap: 1, capT: 1, lean: { leader: 1 } }), O(1, '베테랑에게 밀렸다', -1, { morale: -4 }, null, { lean: { leader: .3 } })] },
  { label: '베테랑을 지지한다', desc: '아직은 때가 아니다', out: [O(1, '선배들이 고마워했다', 1, {}, null, { mates: .06, lean: { humble: .5 } })] }] }) };
// 외국인 동료 적응
WEV.foreignMate = { w: S => { const n = nationOf(S.w, myClub(S)); return S.car.status === 'first' && sq(S).some(e => e[5] !== n && e[5] !== S.p.nat && e[3] <= 24) ? .7 : 0; }, build: S => { const n = nationOf(S.w, myClub(S)); const e = pick(sq(S).filter(x => x[5] !== n && x[5] !== S.p.nat && x[3] <= 24)); const nn = nm(S, e); return { title: `겉도는 ${nn}`, desc: `${C.natName(e[5])} 출신 ${nn}(${e[3]}세)이 말이 통하지 않아 훈련장에서 혼자 지냅니다.`, icon: 'party', e, opts: [
  { label: '먼저 다가간다', desc: '식사도 같이, 통역도 대신', out: [O(.8, `${nn}과 가까워졌다`, 1, { morale: 3 }, null, { mate: { k: 'friend', v: .4 }, mgr: .04, lean: { leader: .4, mentor: .2 } }), O(1, '쑥스러워하며 피했다', 0, {}, null, { mate: { k: 'friend', v: .1 } })] },
  { label: '시간이 해결해 준다', desc: '내 일에 집중', out: [O(1, '별일 없이 지나갔다', 0, {}, null, { lean: { quiet: .2 } })] }] }; } };
// 동료 불화
WEV.mateFight = { w: S => S.car.status === 'first' && sq(S).length >= 12 ? .7 : 0, build: S => { const L = sq(S).slice().sort(() => R() - .5); const a = L[0], b = L[1], na = nm(S, a), nb = nm(S, b); return { title: '훈련장 몸싸움', desc: `${na}${josa(na, '과', '와')} ${nb} 사이에 거친 태클 하나로 말다툼이 붙었습니다. 다들 당신을 쳐다봅니다.`, icon: 'feud', e: a, opts: [
  { label: '둘 사이를 중재한다', desc: '분위기를 수습한다', out: [O(pr(.55, mateAvg(S) * .4 + (has(S, 'leader') ? .15 : 0)), '라커룸이 진정됐다', 1, {}, null, { mates: .05, mgr: .06, lean: { leader: .6 } }), O(1, '불똥이 튀었다', -1, { morale: -3 }, null, { mates: -.03, lean: { leader: .2 } })] },
  { label: `${na} 편을 든다`, desc: '친한 쪽을 감싼다', out: [O(1, `${na}${josa(na, '은', '는')} 고마워했지만 분위기는 어색해졌다`, 0, {}, null, { mate: { k: 'friend', v: .3 }, mates: -.04, lean: { hot: .3 } })] },
  { label: '모른 척한다', desc: '코치들이 알아서 하겠지', out: [O(1, '코치가 말렸다', 0, {}, null, { lean: { quiet: .3 } })] }] }; } };
// 친구의 이적 고민
WEV.friendMove = { w: S => mates(S).some(m => m.k === 'friend' && m.v > .25) ? .6 : 0, build: S => { const m = pick(mates(S).filter(x => x.k === 'friend' && x.v > .25)); const e = sq(S).find(x => String(x[0]) === String(m.id)); if (!e) return null; return { title: `${m.n}의 고민`, desc: `친한 동료 ${m.n}이(가) 다른 구단 제안을 받았다며 조언을 구합니다.`, icon: 'swap', e, opts: [
  { label: '남으라고 한다', desc: '"같이 이 팀에서 뭔가 이루자"', out: [O(1, `${m.n}이(가) 마음을 굳혔다`, 1, {}, null, { mate: { k: 'friend', v: .15 }, fans: .02, lean: { loyal: .4 } })] },
  { label: '떠나라고 응원한다', desc: '"너한테 좋은 기회야"', out: [O(1, `${m.n}이(가) 고마워했다`, 0, {}, null, { mate: { k: 'friend', v: .2 }, lean: { amb: .2, humble: .2 } })] }] }; } };
// 훈련 내기
WEV.trainBet = { w: S => S.car.status === 'first' && S.p.pos !== 'GK' ? .6 : 0, build: S => { const fk = (S.p.a.fkAcc || 60) + (S.p.a.curve || 60); return { title: '훈련 뒤 프리킥 내기', desc: '훈련이 끝나고 동료들이 프리킥 내기를 하자고 합니다. 진 사람이 커피를 삽니다.', icon: 'party', opts: [
  { label: '진지하게 붙는다', desc: '지는 건 싫다', out: [O(pr(.45, (fk - 130) / 120), '내기에서 이겼다', 1, { morale: 4 }, null, { mates: .03, lean: { comp: .4 } }), O(1, '커피를 샀다', 0, { money: -300 }, null, { mates: .04 })] },
  { label: '웃으면서 즐긴다', desc: '분위기 메이커', out: [O(1, '다들 즐거워했다', 1, {}, null, { mates: .05, lean: { humble: .2 } })] },
  { label: '먼저 들어간다', desc: '회복이 우선', out: [O(1, '코치진은 좋아했다', 0, {}, null, { mgr: .02, mates: -.02, lean: { pro: .4 } })] }] }; } };
// 연승 회식
WEV.teamDinner = { w: S => S.car.status === 'first' && lastWins(S) ? 1.4 : 0, build: S => { const cost = Math.max(2000, Math.round((S.car.wage || 2000) * 1.5)); return { title: '연승 기념 회식', desc: '3연승을 하자 선수단이 회식을 잡았습니다. 누가 계산할지 눈치 싸움이 벌어집니다.', icon: 'party', opts: [
  { label: '내가 쏜다', desc: `${C.fmtEUR(cost)} 정도`, out: [O(1, '라커룸 분위기 최고', 1, { money: -cost, morale: 5 }, null, { mates: .08, lean: { leader: .5 } })] },
  { label: '참석만 한다', desc: '즐기기만', out: [O(1, '좋은 시간이었다', 1, { morale: 3 }, null, { mates: .03 })] },
  { label: '빠진다', desc: '집에서 쉰다', out: [O(1, '조금 서운해하는 눈치', 0, {}, null, { mates: -.03, lean: { quiet: .4 } })] }] }; } };
// 베테랑의 마지막 시즌
WEV.vetFarewell = { w: S => S.car.status === 'first' && sq(S).some(e => e[3] >= 34) && !(S.wc.vetY === S.w.year) ? .7 : 0, build: S => { const e = sq(S).filter(x => x[3] >= 34).sort((a, b) => b[3] - a[3])[0]; const n = nm(S, e); S.wc.vetY = S.w.year; return { title: `${n}의 마지막 시즌`, desc: `${e[3]}세 베테랑 ${n}이(가) 이번 시즌을 끝으로 은퇴하겠다고 선수단에 알렸습니다.`, icon: 'mentor', e, opts: [
  { label: '송별 영상을 준비한다', desc: '선수단을 모은다', out: [O(1, `${n}이(가) 눈물을 보였다`, 1, {}, null, { mates: .06, fans: .03, mate: { k: 'mentor', v: .25 }, lean: { leader: .4, loyal: .2 } })] },
  { label: '마지막으로 조언을 구한다', desc: '오래 뛰는 비결', out: [O(.7, '많은 것을 배웠다', 1, { pot: 1 }, null, { mate: { k: 'mentor', v: .35 }, lean: { pro: .4 } }), O(1, '"그냥 즐겨라"는 짧은 답', 0, {}, null, { mate: { k: 'mentor', v: .15 } })] }] }; } };
// 라이벌과의 맞대결 예고
const rvFix = S => { const R0 = S.wc.rv; if (!R0 || !C.userFixtures) return null; const n = rvNow(S); if (!n || !n.c) return null; return C.userFixtures(S).find(f => !f.done && f.opp === n.c.id && f.d > S.w.cal.d && f.d <= S.w.cal.d + 8) || null; };
WEV.rvDuel = { w: S => S.car.status === 'first' && rvFix(S) ? 2.2 : 0, build: S => { const R0 = S.wc.rv, n = rvNow(S); return { title: `${R0.n}${josa(R0.n, '과', '와')}의 맞대결`, desc: `다음 상대 ${n.c.name}에는 라이벌 ${R0.n}이(가) 있습니다. 언론이 두 사람의 대결로 경기를 소개합니다.${R0.h2h.w + R0.h2h.d + R0.h2h.l ? ` (지금까지 ${R0.h2h.w}승 ${R0.h2h.d}무 ${R0.h2h.l}패)` : ''}`, icon: 'fire', opts: [
  { label: '도발에 응수한다', desc: '"누가 위인지 보여 주겠다"', out: [O(1, '팬들이 열광했다', 1, { rep: 1 }, null, { fans: .1, lean: { hot: .4, comp: .4 } })] },
  { label: '존중을 표한다', desc: '"좋은 선수다. 경기로 말하겠다"', out: [O(1, '성숙한 태도라는 평', 1, {}, null, { fans: .03, mgr: .04, lean: { humble: .4, pro: .2 } })] },
  { label: '상대 영상을 파고든다', desc: '준비로 이긴다', out: [O(1, '코치진이 준비를 칭찬했다', 1, {}, null, { mgr: .06, rb: .5, lean: { pro: .5 } })] }] }; } };
// 언론의 비교
WEV.rvMedia = { w: S => { const R0 = S.wc.rv; if (!R0 || S.car.status !== 'first' || !S.ss) return 0; const n = rvNow(S); return n && n.live && n.live.apps >= 6 ? .9 : 0; }, build: S => { const R0 = S.wc.rv, n = rvNow(S), L = n.live, me = ST.meLg(S); const mg = me.g + me.a * .6, rg = L.g + L.a * .6, behind = rg > mg + 1.5; return { title: '라이벌 비교 기사', desc: `${R0.n}(${n.c.name})${behind ? '이(가) 이번 시즌 앞서가고 있다는' : '보다 당신이 낫다는'} 비교 기사가 났습니다. ${R0.n}: ${L.g}골 ${L.a}도움 / 당신: ${me.g}골 ${me.a}도움.`, icon: 'phone', opts: behind ? [
  { label: '"시즌은 길다"', desc: '담담하게', out: [O(1, '침착한 반응', 0, {}, null, { lean: { pro: .3, quiet: .2 } })] },
  { label: '자극제로 삼는다', desc: '훈련 강도를 올린다', out: [O(.6, '훈련장에서 눈빛이 달라졌다', 1, { form: 1, formWhy: '라이벌 자극' }, null, { mgr: .04, lean: { comp: .6 } }), O(1, '무리하다 컨디션이 떨어졌다', -1, { form: -1, formWhy: '과훈련' }, null, { lean: { comp: .3 } })] }] : [
  { label: '여유를 보인다', desc: '"비교는 언론의 몫"', out: [O(1, '대인배라는 평', 1, {}, null, { fans: .03, lean: { humble: .3 } })] },
  { label: '한마디 보탠다', desc: '"숫자가 말해 준다"', out: [O(.6, '팬들이 환호했다', 1, { rep: 1 }, null, { fans: .06, lean: { media: .4 } }), O(1, '건방지다는 반응', -1, {}, null, { fans: -.03, lean: { hot: .3 } })] }] }; } };
// 대표팀: 데뷔 소감 / 최종 명단 / 명단 탈락
WEV.ntDebut = { w: 0, build: S => ({ title: '대표팀 데뷔전을 마치고', desc: `${C.natName(S.p.nat)} 유니폼을 입고 처음 경기를 뛰었습니다. 믹스트존에서 기자들이 소감을 묻습니다.`, icon: 'flag', opts: [
  { label: '"가족에게 이 영광을"', desc: '감사를 전한다', out: [O(1, '훈훈한 인터뷰', 1, { morale: 5 }, null, { nt: .05, lean: { humble: .3 } })] },
  { label: '"이제 시작일 뿐"', desc: '다음을 말한다', out: [O(1, '야망 있는 신예라는 평', 1, { rep: 1 }, null, { nt: .06, lean: { amb: .3 } })] }] }) };
WEV.ntTour = { w: 0, build: (S, m, q) => { const t = ntS(S).tours.find(x => x.k === (q && q.k)); const gk = S.p.pos === 'GK'; return { title: `${(q && q.n) || '메이저 대회'} 최종 명단`, desc: `${C.natName(S.p.nat)} 대표팀 최종 명단에 이름을 올렸습니다. 대회를 앞두고 등번호와 각오를 정할 시간입니다.`, icon: 'flag', opts: [
  { label: gk ? '1번을 달고 싶다고 말한다' : '10번을 달고 싶다고 말한다', desc: '상징적인 번호', out: [O(pr(.3, (S.wc.rel.nt || 0) * .5 + (S.p.rep - 50) * .006), '등번호를 받았다', 1, { rep: 2 }, null, { nt: .04, ntNum: gk ? 1 : 10, tk: q && q.k, lean: { amb: .4 } }), O(1, '선배가 이미 달고 있다', 0, {}, null, { nt: -.02, lean: { amb: .2 } })] },
  { label: '"어떤 역할이든 하겠다"', desc: '팀이 먼저', out: [O(1, '감독이 믿음을 보였다', 1, {}, null, { nt: .1, lean: { humble: .4 } })] },
  { label: '"주전으로 뛰겠다"', desc: '각오를 밝힌다', out: [O(.55, '자신감이 화제가 됐다', 1, { rep: 1 }, null, { nt: .05, lean: { amb: .4 } }), O(1, '부담을 자초했다는 평', -1, {}, null, { nt: -.04, lean: { hot: .2 } })] }] }; } };
WEV.ntSnub = { w: 0, build: (S, m, q) => ({ title: '명단 탈락', desc: `${(q && q.n) || '대회'} 최종 명단에서 빠졌습니다. 기자들이 반응을 기다립니다.`, icon: 'rain', opts: [
  { label: '아쉬움을 솔직히 말한다', desc: '"납득하기 어렵다"', out: [O(.4, '팬 여론이 내 편이 됐다', 0, {}, null, { nt: -.08, fans: .05, lean: { hot: .4 } }), O(1, '감독과 각을 세웠다는 기사', -1, {}, null, { nt: -.18, lean: { hot: .5 } })] },
  { label: '대표팀을 응원한다', desc: 'SNS에 짧게', out: [O(1, '성숙한 태도라는 평', 1, {}, null, { nt: .08, lean: { humble: .4 } })] },
  { label: '소속팀에서 증명한다', desc: '말없이 훈련', out: [O(1, '독기를 품었다', 0, { morale: -3 }, null, { nt: .03, lean: { comp: .4, pro: .3 } })] }] }) };
// 결과에 붙는 효과 (wcareer applyWC가 모르는 키)
ST.applyX = function (S, b, x) {
  if (!x) return;
  if (x.capT) S.wc.capT = S.w.year;
  if (x.ntNum && x.tk) { const t = ntS(S).tours.find(z => z.k === x.tk); if (t) t.num = x.ntNum; }
};

// ================= 연결 =================
const om0 = WC.onMatch;
WC.onMatch = function (S, m) {
  const r = om0(S, m);
  if (!S.wc || !S.ss) return r;
  try {
    if (!S.wc.rv && S.car.status === 'first' && m.comp !== 'youth') pickRival(S);
    rvMatch(S, m); ntMatch(S, m); ntTourCheck(S);
    if (m.comp !== 'youth' && m.comp !== 'ntY' && (m.played || WC.isBig(S, m))) matchFeed(S, m);
    // 대기열에 들어온 이야기 사건이 있으면 이번 경기 뒤에 바로 보여 준다
    if (!r.ev && S.wc.q.length && ['ntDebut', 'ntTour', 'ntSnub'].includes(S.wc.q[0].id)) { const q = S.wc.q.shift(); const b = WEV[q.id] && WEV[q.id].build(S, m, q); if (b) { b.id = 'wc_' + q.id; b.wc = 1; r.ev = WC.qualEvent ? WC.qualEvent(b) : b; } }
  } catch (e) { console.error(e); }
  return r;
};
const es0 = GM.endSeason;
GM.endSeason = function (S) { const r = es0(S); if (S.wc && r) { try { rvEndSeason(S, r); } catch (e) { console.error(e); } } return r; };
// 이적: 피드에 남긴다
const dw0 = GM.decideWindow;
GM.decideWindow = function (S, d) { const before = S.car.club; const r = dw0(S, d); if (S.wc && S.car.club && S.car.club !== before) { const c = myClub(S); if (c) { feed(S, 'media', `${S.p.name}, ${c.name} 입단 확정`, 0, null, true); feed(S, 'fan', pick(['"환영합니다!"', '"이 영입 기대된다"', '"이적료 값을 할지 지켜보자"']), 0, c.name + ' 팬'); } } return r; };
})(typeof window !== 'undefined' ? window : globalThis);
