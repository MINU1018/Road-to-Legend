// Road to Legend — 은퇴 후 일대기와 커리어 수준 평가
(function (G) {
'use strict';
const C = G.TC;
const B = C.bio = {};

// 최고 OVR → 같은 게임에서 나온 선수들 중 상위 몇 %인지 (배치 시뮬 분포 기준 근사)
const PCT = [[55, 98], [60, 90], [65, 74], [68, 62], [71, 50], [74, 36], [76, 25], [79, 11], [82, 5], [85, 2], [88, .7], [91, .2], [95, .05]];
function topPct(peak) {
  if (peak <= PCT[0][0]) return 99;
  for (let i = 1; i < PCT.length; i++) if (peak <= PCT[i][0]) { const [x0, y0] = PCT[i - 1], [x1, y1] = PCT[i]; return y0 + (y1 - y0) * (peak - x0) / (x1 - x0); }
  return .03;
}
const TIERS = [
  [92, 'S+', '축구사의 한 페이지', '세대를 넘어 이름이 불릴 선수'],
  [84, 'S', '레전드', '한 시대를 대표한 선수'],
  [74, 'A', '월드클래스', '세계 최고 무대에서 통한 선수'],
  [62, 'B+', '빅리그 주전', '정상급 리그에서 꾸준히 뛴 선수'],
  [50, 'B', '1부 리그의 기둥', '팬들이 기억하는 프로'],
  [38, 'C', '성실한 프로', '오랜 시간 그라운드를 지킨 선수'],
  [26, 'D', '하부 리그의 영웅', '작은 경기장의 큰 이름'],
  [0, 'E', '닿지 못한 꿈', '그래도 끝까지 공을 찼다']
];
B.score = function (S) {
  const sum = G.TCG.summary(S);
  const ntA = S.hist.reduce((a, h) => a + (h.nt && h.ntLvl === 'A' ? h.nt.apps : 0), 0);
  const bigTrophies = S.trophies.filter(t => ['cont', 'nt'].includes(t.k)).length;
  let sc = Math.max(0, (sum.peak - 55) * 1.55) + Math.min(14, sum.tp * 1.1) + Math.min(9, sum.aw * .7) + sum.bd * 6 + bigTrophies * 2 + Math.min(8, sum.total.goals / 45) + Math.min(5, ntA / 20);
  sc = Math.max(0, Math.min(100, Math.round(sc)));
  const tier = TIERS.find(t => sc >= t[0]);
  return { score: sc, grade: tier[1], title: tier[2], line: tier[3], top: topPct(sum.peak), sum, ntA };
};

const josa = (w, a, b) => { const c = (w || '').charCodeAt((w || '').length - 1); if (c < 0xac00 || c > 0xd7a3) return w + a; return w + ((c - 0xac00) % 28 ? a : b); };
const eun = w => josa(w, '은', '는'), iga = w => josa(w, '이', '가'), eul = w => josa(w, '을', '를'), wa = w => josa(w, '과', '와'), ro = w => { const c = (w || '').charCodeAt(w.length - 1); const j = (c - 0xac00) % 28; return w + (c >= 0xac00 && c <= 0xd7a3 && j && j !== 8 ? '으로' : '로'); };
const pick = a => a[Math.floor(Math.random() * a.length)];

B.write = function (S) {
  const w = S.w, p = S.p, H = S.hist.filter(h => h.club);
  const sc = B.score(S), sum = sc.sum;
  const cn = id => (w.clubs[id] || {}).name || '';
  const name = p.name;
  const ch = [];
  // 1. 시작
  const acad = S.clubsJoined && S.clubsJoined[0] ? cn(S.clubsJoined[0].club) : (H[0] ? H[0].clubName : '');
  const startY = S.hist[0] ? S.hist[0].y : w.year;
  const debut = H.find(h => h.total && h.total.apps > 0);
  const firstGoal = H.find(h => h.total && h.total.goals > 0);
  const s1 = [`${startY}년 여름, 열여섯 살 ${eun(name)} ${acad} 유스팀의 문을 두드렸다.`];
  if (debut) s1.push(debut.age <= 17 ? `${debut.age}세에 1군 데뷔전을 치르며 일찍부터 이름을 알렸다.` : debut.age <= 19 ? `${debut.age}세, ${debut.clubName}에서 마침내 프로 데뷔전을 치렀다.` : `프로 데뷔는 ${debut.age}세. 남들보다 늦은 출발이었다.`);
  else s1.push('하지만 끝내 1군 무대를 밟지는 못했다.');
  if (firstGoal) s1.push(`첫 프로 골은 ${firstGoal.age}세, ${firstGoal.clubName} 유니폼을 입고서였다.`);
  ch.push(['시작', s1.join(' ')]);
  // 2. 갈림길
  const xs = (S.evLog || []).filter(e => e.cross);
  if (xs.length) {
    const pickX = xs.length > 2 ? [xs[0], xs[Math.floor(xs.length / 2)], xs[xs.length - 1]] : xs;
    const s2 = pickX.map(e => `${e.age}세, '${e.title}' 앞에서 그는 '${e.choice}' ${pick(['쪽을 택했다.', '길을 골랐다.', '쪽으로 걸음을 옮겼다.'])}`);
    const goodN = xs.filter(e => e.good > 0).length;
    s2.push(goodN >= xs.length * .6 ? '돌이켜 보면 대부분의 선택이 옳았다.' : goodN <= xs.length * .3 ? '모든 선택이 뜻대로 풀리지는 않았다.' : '어떤 선택은 빛났고, 어떤 선택은 대가를 치렀다.');
    ch.push(['갈림길', s2.join(' ')]);
  }
  // 3. 전성기
  const pro = H.filter(h => h.status !== 'youth' && h.total && h.total.apps >= 10);
  if (pro.length) {
    const best = pro.slice().sort((a, b) => (b.total.goals * 1.2 + b.total.assists + (b.rating || 0) * 6) - (a.total.goals * 1.2 + a.total.assists + (a.rating || 0) * 6))[0];
    const peakH = H.slice().sort((a, b) => b.ovr1 - a.ovr1)[0];
    const s3 = [`가장 빛난 시즌은 ${best.label}. ${best.clubName}에서 ${best.total.apps}경기 ${best.total.goals}골 ${best.total.assists}도움(평균 평점 ${(best.rating || 0).toFixed(2)})을 남겼다.`];
    s3.push(`${peakH.age}세에 기량은 정점(OVR ${sum.peak})에 올랐다.`);
    const fee = (S.feeLog || []).slice().sort((a, b) => b.fee - a.fee)[0];
    if (fee && fee.fee >= 5e6) s3.push(`${ro(cn(fee.to))} 향할 때 붙은 이적료는 ${C.fmtEUR(fee.fee)}.`);
    ch.push(['전성기', s3.join(' ')]);
  }
  // 4. 영광
  const tro = S.trophies, aw = S.awards;
  const s4 = [];
  if (tro.length) {
    const byT = {}; tro.forEach(t => byT[t.t] = (byT[t.t] || 0) + 1);
    const top = Object.entries(byT).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => n > 1 ? `${t} ${n}회` : t);
    s4.push(`들어 올린 트로피는 모두 ${tro.length}개. ${top.join(', ')}.`);
  } else s4.push('우승 트로피와는 끝내 인연이 닿지 않았다. 그래도 경기장을 떠날 때마다 박수를 받았다.');
  const bd = aw.filter(a => a.k === 'ballon').length;
  if (bd) s4.push(bd > 1 ? `발롱도르를 ${bd}번 품에 안았다.` : '그리고 발롱도르. 세계가 그의 이름을 불렀다.');
  else if (aw.length) s4.push(`개인상도 ${aw.length}개를 받았다.`);
  ch.push(['영광', s4.join(' ')]);
  // 5. 국가대표
  const ntG = S.hist.reduce((a, h) => a + (h.nt && h.ntLvl === 'A' ? h.nt.goals : 0), 0);
  const tourn = S.hist.filter(h => h.tourn).map(h => h.tourn);
  const s5 = [];
  if (sc.ntA) {
    s5.push(`${C.natName(p.nat)} 대표팀 유니폼을 입고 A매치 ${sc.ntA}경기 ${ntG}골.`);
    const won = tourn.filter(t => t.won);
    if (won.length) s5.push(`${won.map(t => t.name).join(', ')} 우승의 주역이었다.`);
    else if (tourn.length) { const bestT = tourn.find(t => /준우승|4강/.test(t.stage)); if (bestT) s5.push(`${bestT.name}에서는 ${bestT.stage}까지 올랐다.`); }
    if (sc.ntA >= 100) s5.push('센추리 클럽에 이름을 올렸다.');
  } else s5.push('국가대표의 부름은 끝내 오지 않았다.');
  ch.push(['국가대표', s5.join(' ')]);
  // 6. 황혼과 은퇴
  const last = H[H.length - 1];
  const clubs = [...new Set(H.filter(h => h.status !== 'youth').map(h => h.clubName))];
  const s6 = [];
  if (last) s6.push(`마지막 시즌은 ${last.age}세, ${last.clubName}.`);
  s6.push(clubs.length <= 1 ? `커리어 내내 한 클럽만을 위해 뛰었다.` : clubs.length >= 7 ? `${clubs.length}개 구단을 떠돌며 가는 곳마다 흔적을 남겼다.` : `${clubs.slice(0, 5).join(' → ')}${clubs.length > 5 ? ' → …' : ''}. 그가 걸어온 길이다.`);
  s6.push(`${p.age}세에 축구화를 벗었다. 통산 ${sum.total.apps}경기 ${sum.total.goals}골 ${sum.total.assists}도움.`);
  ch.push(['마지막 장', s6.join(' ')]);
  // 에필로그
  const ep = {
    'S+': ['사람들은 오랫동안 그와 비교하며 새로운 재능을 평가할 것이다.', '그의 등번호는 이제 누구도 쉽게 달 수 없다.'],
    S: ['그가 뛰던 시절을 기억하는 팬들은 지금도 그 시절을 이야기한다.', '경기장 한편에 그의 이름이 남았다.'],
    A: ['최고의 무대에서 최고들과 겨뤘고, 밀리지 않았다.', '그 시절 그를 상대한 수비수들은 아직도 고개를 젓는다.'],
    'B+': ['화려하진 않아도 감독들이 가장 먼저 찾던 이름이었다.', '꾸준함이 곧 재능이었다.'],
    B: ['작은 구단의 팬들에게 그는 영웅이었다.', '그를 기억하는 사람들은 그를 좋은 선수였다고 말한다.'],
    C: ['수많은 경기, 수많은 버스 이동. 그래도 그는 그라운드를 사랑했다.', '스타는 아니었지만, 진짜 프로였다.'],
    D: ['조명은 밝지 않았지만 관중석의 함성만은 진짜였다.', '하부 리그의 진흙탕에서도 그는 웃으며 뛰었다.'],
    E: ['꿈에는 닿지 못했지만, 꿈을 꾼 시간만은 진짜였다.', '모두가 주인공이 될 수는 없다. 그래도 그의 이야기는 여기 남았다.']
  }[sc.grade];
  return { chapters: ch, epilogue: pick(ep), score: sc };
};
})(typeof window !== 'undefined' ? window : globalThis);
