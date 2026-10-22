// 터치라인 커리어 — 결정적 순간 (N지선다)
// 찬스마다 목표 성공률을 정하고, 선택지 수 = 1 / 성공률 (2~6개). 정답은 무작위 1개.
// 능력치가 높을수록, 찬스가 좋을수록 선택지가 줄어든다.
(function (G) {
'use strict';
const C = G.TC;
const { R, rint, clamp, N, pick, shuffle } = C;

// 골문 6구역 (u: 0~1 가로, v: 0~1 세로, 0=바닥)
const ZONES = [
  { k: 'TL', label: '왼쪽 위', u: .14, v: .76 }, { k: 'TC', label: '가운데 위', u: .5, v: .8 }, { k: 'TR', label: '오른쪽 위', u: .86, v: .76 },
  { k: 'BL', label: '왼쪽 아래', u: .13, v: .2 }, { k: 'BC', label: '가운데 아래', u: .5, v: .2 }, { k: 'BR', label: '오른쪽 아래', u: .87, v: .2 }
];
C.ZONES = ZONES;
// 장면별 선택지 후보 (그림 좌표 x,y는 300×190 장면 기준)
const POOLS = {
  cross: [['니어포스트 낮은 크로스', 178, 30], ['페널티 스폿 띄우기', 150, 46], ['파포스트 감아 올리기', 108, 30], ['컷백', 205, 80], ['골 에어리어 앞 강한 땅볼', 160, 18], ['박스 밖 세컨드볼', 150, 92]],
  through: [['침투하는 스트라이커', 150, 48], ['반대편 윙어 대각선', 40, 62], ['오버래핑 풀백', 268, 86], ['2선 침투 미드필더', 118, 70], ['수비 뒷공간 로빙', 182, 30], ['원투 패스', 150, 110]],
  header: [['니어포스트로 끊는다', 124, 20], ['페널티 스폿에서 내려찍는다', 150, 44], ['파포스트로 돌아 들어간다', 190, 24], ['골문 앞 경합', 150, 16], ['뒤로 떨어뜨린다', 140, 66], ['다이빙 헤더', 168, 34]],
  dribble: [['안쪽으로 접기', 116, 100], ['바깥으로 치고 달리기', 204, 98], ['헛다리 후 돌파', 150, 72], ['원투 패스', 92, 120], ['몸으로 버티며 전진', 150, 96], ['백힐로 방향 전환', 182, 118]],
  tackle: [['스탠딩 태클', 128, 104], ['슬라이딩 태클', 172, 104], ['지연 수비', 150, 142], ['패스 길목 차단', 108, 82], ['몸싸움으로 밀어내기', 192, 84], ['커버 동료와 협력 수비', 150, 160]],
  block: [['왼쪽 각', 110, 60], ['가운데', 150, 58], ['오른쪽 각', 190, 60], ['먼 포스트 쪽', 96, 44], ['가까운 포스트 쪽', 204, 44], ['발밑 차단', 150, 80]],
  gk1v1: [['앞으로 뛰쳐나간다', 150, 64], ['끝까지 버틴다', 150, 30], ['왼쪽으로 각 좁히기', 122, 40], ['오른쪽으로 각 좁히기', 178, 40], ['미리 몸을 던진다', 150, 48], ['칩샷 대비 뒤로', 150, 18]]
};
C.MPOOLS = POOLS;
const TITLES = {
  oneone: ['골키퍼와 1대1', '수비 뒷공간을 완벽하게 뚫었습니다. 어디로 찰까요?', 'shot'],
  penalty: ['페널티킥', '페널티킥을 얻어냈습니다. 키커는 당신입니다.', 'shot'],
  volley: ['발리 기회', '크로스가 떨어집니다. 논스톱으로 때립니다.', 'shot'],
  longshot: ['중거리 슈팅', '박스 앞에 공간이 열렸습니다. 과감하게 때립니다.', 'shot'],
  freekick: ['직접 프리킥', '아크 정면 23m 프리킥. 벽 너머로 감아 찹니다.', 'shot'],
  cutin: ['컷인 슈팅', '측면에서 안으로 파고들었습니다. 반대편 포스트가 보입니다.', 'shot'],
  header: ['코너킥 헤더', '코너킥이 올라옵니다. 어디로 뛰어들까요?', 'pick'],
  cross: ['크로스 타이밍', '측면을 돌파했습니다. 어디로 올릴까요?', 'pick'],
  through: ['킬 패스', '상대 라인이 높습니다. 누구에게 찔러 줄까요?', 'pick'],
  dribble: ['1대1 돌파', '수비수가 정면에 섰습니다. 어떻게 제칠까요?', 'pick'],
  tackle: ['결정적 수비', '상대 공격수가 박스 쪽으로 돌진합니다. 어떻게 막을까요?', 'pick'],
  block: ['슈팅 각 막기', '상대가 박스 모서리에서 슈팅 자세를 잡았습니다. 어디를 막을까요?', 'pick'],
  pensave: ['페널티킥 선방', '상대에게 페널티킥이 주어졌습니다. 어디로 뜰까요?', 'goal'],
  gk1v1: ['1대1 위기', '상대 공격수가 혼자 달려옵니다. 어떻게 막을까요?', 'pick']
};
const MTYPES = { ST: ['oneone', 'penalty', 'header', 'oneone', 'volley'], W: ['cross', 'cutin', 'dribble', 'oneone'], AM: ['through', 'longshot', 'freekick', 'oneone'], CM: ['through', 'longshot', 'freekick', 'tackle'], DM: ['tackle', 'block', 'through', 'longshot'], FB: ['cross', 'tackle', 'block'], CB: ['block', 'tackle', 'header'], GK: ['pensave', 'gk1v1', 'pensave'] };

// 찬스별 목표 성공률: 기본값 + 능력치 보정 − 상대 수준 보정
function targetP(type, A, p, oppStr) {
  const opp = (oppStr - 70) * .004;
  const s = (x, base, k) => base + (x - 65) * k - opp;
  switch (type) {
    case 'penalty': return { skill: A('penalties') * .75 + A('composure') * .25, p: s(A('penalties') * .75 + A('composure') * .25, .56, .008) };
    case 'oneone': return { skill: A('finishing') * .7 + A('composure') * .3, p: s(A('finishing') * .7 + A('composure') * .3, .4, .008) };
    case 'volley': return { skill: A('volleys') * .8 + A('composure') * .2, p: s(A('volleys') * .8 + A('composure') * .2, .24, .006) };
    case 'longshot': return { skill: A('longShots') * .7 + A('shotPower') * .3, p: s(A('longShots') * .7 + A('shotPower') * .3, .2, .006) };
    case 'freekick': return { skill: A('fkAcc') * .7 + A('curve') * .3, p: s(A('fkAcc') * .7 + A('curve') * .3, .19, .007) };
    case 'cutin': return { skill: A('finishing') * .4 + A('curve') * .4 + A('longShots') * .2, p: s(A('finishing') * .4 + A('curve') * .4 + A('longShots') * .2, .27, .007) };
    case 'header': { const x = A('heading') * .6 + A('jumping') * .2 + A('attPos') * .2 + (p.height - 182) * .4; return { skill: x, p: s(x, .32, .007) }; }
    case 'cross': { const x = A('crossing') * .7 + A('curve') * .3; return { skill: x, p: s(x, .3, .007) }; }
    case 'through': { const x = A('vision') * .6 + A('shortPass') * .4; return { skill: x, p: s(x, .3, .007) }; }
    case 'dribble': { const x = A('dribbling') * .5 + A('agility') * .25 + A('ballControl') * .25 + (p.skill - 3) * 3; return { skill: x, p: s(x, .36, .008) }; }
    case 'tackle': { const x = A('standTackle') * .4 + A('slideTackle') * .2 + A('defAware') * .4; return { skill: x, p: s(x, .46, .008) }; }
    case 'block': { const x = A('defAware') * .5 + A('interceptions') * .3 + A('reactions') * .2; return { skill: x, p: s(x, .38, .008) }; }
    case 'gk1v1': { const x = A('gkReflexes') * .4 + A('gkPos') * .3 + A('gkSpeed') * .3; return { skill: x, p: s(x, .4, .008) }; }
    case 'pensave': { const x = A('gkDiving') * .5 + A('gkReflexes') * .5; return { skill: x, p: s(x, .24, .006) }; }
  }
  return { skill: 60, p: .3 };
}
function makeMoment(S, rec, o) {
  const p = S.p, r = C.ROLE[p.pos];
  const types = MTYPES[r].slice();
  if (S.ss.penTaker && r !== 'GK') types.push('penalty', 'penalty');
  if (S.ss.fkTaker && r !== 'GK') types.push('freekick');
  const type = pick(types);
  const minute = rint(68, 90);
  const A = k => p.a[k] + C.modSum(p) * .9;
  const T = TITLES[type];
  const tp = targetP(type, A, p, o.oppStr);
  const pT = clamp(tp.p + N(0, .03), .15, .62);
  const n = clamp(Math.round(1 / pT) - (S.flags && S.flags.analystY === S.w.year ? 1 : 0), 2, 6);
  const ctx = { type, minute, title: T[0], desc: T[1], ui: T[2], score: [rec.gf, rec.ga], opp: o.oppName, comp: o.compName, stage: o.stage, oppStr: o.oppStr, d: o.d, skill: Math.round(tp.skill), n, sub: `후반 ${minute}분 · ${rec.gf}-${rec.ga} · ${o.oppName}전` };
  ctx.assist = type === 'cross' || type === 'through';
  ctx.defend = ['tackle', 'block', 'gk1v1', 'pensave'].includes(type);
  ctx.wall = type === 'freekick';
  if (ctx.ui !== 'pick') {
    // 골문 6구역 중 n개를 고른다
    ctx.opts = shuffle(ZONES.slice()).slice(0, n).sort((a, b) => ZONES.indexOf(a) - ZONES.indexOf(b)).map(z => Object.assign({}, z));
  } else {
    ctx.opts = shuffle(POOLS[type].slice()).slice(0, n).map(([label, x, y]) => ({ label, x, y }));
  }
  ctx.answer = rint(0, n - 1);
  const oc = S.w.clubs[o.opp]; ctx.kc = oc && oc.c1 && U_ok(oc.c1) ? oc.c1 : oc && oc.c2 && U_ok(oc.c2) ? oc.c2 : '#e5484d';
  return ctx;
}
C.makeMoment = makeMoment;
function U_ok(hx) { if (typeof hx !== 'string') return false; const c = hx.replace('#', ''); if (c.length < 6) return true; const v = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); const l = (v[0] * .299 + v[1] * .587 + v[2] * .114) / 255; return l > .12 && l < .85; }
// 선택 판정: 정답이면 성공, 아니면 실패(결과 묘사는 찬스 종류에 맞게)
function resolveChoice(mc, i) {
  const ok = i === mc.answer;
  const r = { choice: i, answer: mc.answer, ok };
  const t = mc.type;
  if (mc.ui === 'shot') {
    r.kind = ok ? 'goal' : (mc.wall && R() < .35 ? 'wall' : R() < .55 ? 'save' : R() < .3 ? 'post' : 'miss');
    r.text = ok ? '골망을 흔들었습니다!' : { save: '골키퍼가 방향을 읽었습니다.', wall: '벽에 맞고 나왔습니다.', post: '골대를 맞고 나왔습니다!', miss: '골문을 벗어났습니다.' }[r.kind];
  } else if (t === 'pensave') {
    r.kind = ok ? 'save' : 'goal';
    r.text = ok ? '페널티킥 선방!' : '방향이 엇갈렸습니다.';
  } else if (t === 'tackle' || t === 'block') {
    if (ok) r.text = t === 'tackle' ? '깔끔하게 공을 빼앗았습니다!' : '몸을 던져 슈팅을 막아냈습니다!';
    else { r.conceded = R() < (t === 'tackle' ? .5 : .45); r.card = t === 'tackle' && mc.opts[i] && /슬라이딩|몸싸움/.test(mc.opts[i].label) && R() < .4; r.text = r.conceded ? '상대의 슈팅이 골망을 흔들었습니다.' : '뚫렸지만 슈팅이 빗나갔습니다.'; if (!r.conceded) r.ok = null; }
  } else if (t === 'gk1v1') { r.conceded = !ok; r.text = ok ? '슈퍼 세이브!' : '상대가 침착하게 마무리했습니다.'; }
  else if (mc.assist) r.text = ok ? '완벽한 패스! 동료가 마무리했습니다.' : '패스가 수비에 걸렸습니다.';
  else if (t === 'header') r.text = ok ? '헤더 골!' : '헤더가 빗나갔습니다.';
  else if (t === 'dribble') { r.goal = ok && R() < .5; r.text = ok ? (r.goal ? '돌파 후 직접 마무리!' : '돌파 후 내준 공을 동료가 넣었습니다!') : '수비에 막혔습니다.'; }
  return r;
}
C.resolveChoice = resolveChoice;
C.autoMoment = (S, mc) => resolveChoice(mc, rint(0, mc.n - 1));

// 경기 기록 반영
const XG = { penalty: .79, oneone: .38, volley: .14, longshot: .05, freekick: .06, cutin: .09 };
function applyMoment(S, rec, mc, res) {
  const st = rec.st, t = mc.type;
  if (mc.ui === 'shot') {
    const xg = XG[t]; st.shots++; st.xg += xg; if (t !== 'penalty') st.npxg += xg; else st.penTaken++;
    if (res.kind === 'goal' || res.kind === 'save') { st.sot++; st.xgot += res.kind === 'goal' ? Math.max(xg, .5) : xg * .7; }
    if (res.ok) { st.goals++; rec.gf++; if (t === 'penalty') st.penGoals++; S.car.trust = clamp(S.car.trust + 3, 0, 100); if (t === 'longshot' || t === 'freekick' || t === 'volley') S.ss.wonder = (S.ss.wonder || 0) + 1; }
    (rec.shots = rec.shots || []).push({ x: t === 'longshot' || t === 'freekick' ? 30 + R() * 40 : t === 'penalty' ? 50 : 38 + R() * 24, y: { penalty: 11, oneone: 7 + R() * 5, volley: 8 + R() * 6, longshot: 20 + R() * 8, freekick: 20 + R() * 5, cutin: 14 + R() * 5 }[t], xg, g: res.ok ? 1 : 0, t: t === 'penalty' ? 'P' : t === 'freekick' ? 'F' : (S.p.foot === 'L' ? 'L' : 'R'), on: res.kind === 'goal' || res.kind === 'save' ? 1 : 0, big: 1 });
  } else if (t === 'pensave' || t === 'gk1v1') {
    const x = t === 'pensave' ? .79 : .45; st.sotFaced++; st.xgotFaced += x;
    if (res.ok) { st.saves++; st.gPrev += x; S.car.trust = clamp(S.car.trust + 3, 0, 100); } else { rec.ga++; st.concOn++; st.cs = 0; st.gPrev -= 1 - x; }
  } else if (t === 'tackle' || t === 'block') {
    if (res.ok) { if (t === 'tackle') st.tackles++; else st.blocks++; st.defAct++; S.car.trust = clamp(S.car.trust + 2, 0, 100); }
    else { st.dribPast++; if (res.conceded) { rec.ga++; st.concOn++; st.cs = 0; } if (res.card) st.yellow = 1; }
  } else if (mc.assist || t === 'dribble') {
    st.chances++; if (t === 'dribble') st.dribAtt++;
    if (res.ok) { rec.gf++; if (res.goal) { st.goals++; st.shots++; st.sot++; st.xg += .3; st.xgot += .5; } else { st.assists++; st.xa += .35; st.bigCh++; } if (t === 'dribble') st.dribOk++; S.car.trust = clamp(S.car.trust + 3, 0, 100); }
  } else if (t === 'header') {
    st.shots++; st.headShots++; st.xg += .18; st.npxg += .18; st.aerA++;
    if (res.ok) { st.goals++; st.sot++; st.xgot += .6; rec.gf++; st.aerW++; S.car.trust = clamp(S.car.trust + 3, 0, 100); }
    (rec.shots = rec.shots || []).push({ x: 42 + R() * 16, y: 5 + R() * 5, xg: .18, g: res.ok ? 1 : 0, t: 'H', on: res.ok ? 1 : 0, big: 1 });
  }
  rec.moment = { type: t, title: mc.title, ok: res.ok, n: mc.n };
}
C.applyMoment = applyMoment;
})(typeof window !== 'undefined' ? window : globalThis);
