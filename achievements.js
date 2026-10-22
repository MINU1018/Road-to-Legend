// Road to Legend — 도전과제 (스팀식). 엔진은 달성 여부만 판정하고, 화면 쪽이 알림·전체 기록을 맡는다
(function (G) {
'use strict';
const C = G.TC;
const A = C.ach = {};
// tier: b 브론즈 · s 실버 · g 골드 · p 플래티넘 / hidden: 달성 전 내용 숨김
const L = [
  // 시작
  ['debut', 'b', '꿈의 시작', '프로 1군 경기에 처음 출전'],
  ['firstgoal', 'b', '첫 골의 기억', '프로 1군 경기에서 첫 골'],
  ['debut16', 's', '조숙한 천재', '16세에 1군 데뷔'],
  ['teen5', 's', '10대의 반란', '18세 이하 시즌에 1군 5골 이상'],
  ['wonderkid', 'g', '원더키드', '19세 이하 시즌에 1군 15골 또는 평균 평점 7.3 (20경기 이상)'],
  ['ntdebut', 'b', '국가의 부름', 'A매치 첫 출전'],
  // 득점
  ['hat', 's', '해트트릭', '한 경기 3골'],
  ['poker', 'g', '포트트릭', '한 경기 4골'],
  ['five', 'p', '원맨쇼', '한 경기 5골', 1],
  ['sub_hat', 'g', '슈퍼 조커', '교체로 들어가 해트트릭', 1],
  ['s20', 's', '20골 시즌', '프로 한 시즌 20골'],
  ['s30', 'g', '30골 시즌', '프로 한 시즌 30골'],
  ['s50', 'p', '괴물', '프로 한 시즌 50골'],
  ['a20', 'g', '어시스트 머신', '프로 한 시즌 20도움'],
  ['c100', 's', '100골 클럽', '프로 통산 100골'],
  ['c300', 'g', '300골의 사나이', '프로 통산 300골'],
  ['c500', 'p', '골의 신', '프로 통산 500골'],
  ['finalgoal', 'g', '결승전의 사나이', '컵·대륙 대회 결승에서 득점'],
  ['wcgoal', 'g', '월드컵의 골', 'FIFA 월드컵 본선에서 득점'],
  ['cb10', 'g', '골 넣는 수비수', '센터백으로 한 시즌 10골'],
  ['gkgoal', 'p', '골 넣는 골키퍼', '골키퍼로 득점', 1],
  // 평점
  ['r9', 's', '9점대', '한 경기 평점 9.0 이상'],
  ['r10', 'g', '만점 활약', '한 경기 평점 10'],
  ['rlow', 'b', '오늘은 없던 걸로', '한 경기 평점 4.9 이하', 1],
  ['motm10', 's', '경기 최우수 단골', '한 시즌 POTM 10회'],
  // 트로피
  ['league', 's', '첫 리그 우승', '리그 우승'],
  ['cup', 'b', '컵을 들어 올리다', '국내 컵 대회 우승'],
  ['ucl', 'g', '빅 이어', 'UEFA 챔피언스리그 우승'],
  ['treble', 'p', '트레블', '한 시즌에 리그·국내 컵·챔피언스리그 우승'],
  ['wc', 'p', '월드 챔피언', 'FIFA 월드컵 우승'],
  ['conttour', 'g', '대륙 정복', '유로·코파·아시안컵 등 대륙 대회 우승'],
  ['boot', 's', '득점왕', '리그 득점왕'],
  ['bootchamp', 'g', '득점왕 겸 챔피언', '같은 시즌 리그 우승과 득점왕'],
  ['ballon', 'p', '발롱도르', '발롱도르 수상'],
  ['ballon3', 'p', '왕조', '발롱도르 3회 수상', 1],
  ['tro10', 'g', '트로피 수집가', '팀 트로피 10개'],
  ['golden', 's', '골든보이', '골든보이 수상'],
  // 커리어 경로
  ['oneclub', 'g', '원클럽맨', '한 구단에서만 프로 12시즌 이상 뛰고 은퇴'],
  ['journey', 's', '저니맨', '프로로 8개 이상 구단에서 뛰기'],
  ['loans', 'b', '임대 전문가', '임대 4회'],
  ['fee100', 'g', '천문학적 이적', '이적료 1억 유로 이상으로 이적'],
  ['free', 'b', '자유의 몸', '무소속으로 한 시즌 보내기', 1],
  ['promo', 's', '승격의 기쁨', '소속 팀 승격'],
  ['releg', 'b', '강등의 눈물', '소속 팀 강등'],
  ['yoyo', 's', '엘리베이터 인생', '승격 2회, 강등 2회 이상'],
  ['lowking', 's', '하부 리그의 왕', '3부 이하 리그에서 시즌 20골'],
  ['abroad', 'b', '해외 진출', '다른 나라 리그에서 뛰기'],
  ['globe', 'g', '세계 여행자', '3개 대륙의 리그에서 뛰기'],
  ['home', 's', '귀향', '27세 이후 유스 시절 구단으로 복귀', 1],
  ['century', 'g', '센추리 클럽', 'A매치 100경기'],
  ['nonat', 'b', '국가대표와는 인연이 없었다', '최고 OVR 78 이상인데 A매치 없이 은퇴', 1],
  ['winter', 'b', '겨울 이적시장', '겨울에 팀 옮기기'],
  ['struggle', 's', '고군분투', '팀이 강등된 시즌에 15골'],
  // 성장·나이
  ['o80', 's', '정상급', 'OVR 80 달성'],
  ['o85', 'g', '월드클래스', 'OVR 85 달성'],
  ['o90', 'p', '살아있는 전설', 'OVR 90 달성'],
  ['late', 'g', '대기만성', '30세 이후 개인 최고 OVR 갱신'],
  ['a38', 's', '노장은 죽지 않는다', '38세 시즌에 1군 출전'],
  ['a40', 'g', '불혹의 현역', '40세 시즌에 1군 출전'],
  ['early', 'b', '이른 작별', '30세 이전에 은퇴', 1],
  ['never70', 'b', '평범함의 미학', 'OVR 70을 넘지 못하고 은퇴', 1],
  ['cross', 's', '모든 갈림길', '중요 분기점 8개를 모두 겪기'],
  // 웃긴 것들
  ['drought', 'b', '골대 알레르기', '스트라이커로 한 시즌 25경기 이상 뛰고 무득점', 1],
  ['drought40', 'g', '골 넣는 법을 잊었다', '스트라이커로 1군 40경기 연속 무득점', 1],
  ['red7', 's', '레드카드 수집가', '통산 퇴장 7회', 1],
  ['yel12', 'b', '심판의 단골', '한 시즌 경고 12장'],
  ['bench30', 'b', '벤치 지킴이', '한 시즌 30경기 이상 명단에만 있고 미출전', 1],
  ['glass', 'b', '유리몸', '한 시즌 부상으로 100일 이상 결장'],
  ['iron', 's', '철강왕', '한 시즌 50경기 이상 출전'],
  ['nerve5', 's', '강심장', '결정적 순간 5연속 성공'],
  ['choke5', 'b', '새가슴', '결정적 순간 5연속 실패', 1],
  ['penfail3', 'b', '11미터의 공포', '페널티킥 결정적 순간 통산 3회 실패', 1],
  ['badluck', 'b', '불운의 아이콘', '한 시즌 이벤트에서 나쁜 결과 3번', 1],
  // 재산·상점
  ['shop1', 'b', '첫 쇼핑', '상점에서 처음 구매'],
  ['spender', 's', '큰손', '상점에서 누적 1,000만 유로 사용'],
  ['rich', 'g', '재벌', '재산 7,000만 유로 달성'],
  ['scandal', 'b', '과속 딱지', '슈퍼카 구설수에 오르기', 1],
  ['house', 'b', '내 집 마련', '바닷가 저택 구입'],
  // 메타
  ['ach20', 's', '도전 정신', '도전과제 20개 달성'],
  ['ach50', 'g', '완벽주의자', '도전과제 50개 달성']
];
A.LIST = L.map(([id, tier, name, desc, hidden]) => ({ id, tier, name, desc, hidden: !!hidden }));
A.byId = Object.fromEntries(A.LIST.map(a => [a.id, a]));
A.TIERS = { b: ['브론즈', '#c98a54'], s: ['실버', '#c7d0db'], g: ['골드', '#f2c14e'], p: ['플래티넘', '#8fe3ff'] };
// 전역(모든 커리어) 달성 기록: UI가 불러와 채워 둔다
A.global = {};
function unlock(S, id) {
  if (!A.byId[id]) return;
  S.ach = S.ach || {};
  if (S.ach[id]) return;
  S.ach[id] = { y: S.w.year, age: S.p.age };
  (S.achQ = S.achQ || []).push(id);
  const n = Object.keys(S.ach).length;
  if (n >= 20) unlock(S, 'ach20');
  if (n >= 50) unlock(S, 'ach50');
}
A.unlock = unlock;
const proComp = m => !['youth', 'nt', 'ntY'].includes(m.comp);
const isST = S => S.p.pos === 'ST';
function stats(S) { return (S.stats = S.stats || {}); }

function onMatch(S, m) {
  const st = stats(S);
  if (!m.played) return;
  const g = m.st.goals || 0;
  if (proComp(m)) {
    unlock(S, 'debut');
    if (S.p.age <= 16) unlock(S, 'debut16');
    if (g) unlock(S, 'firstgoal');
    // 스트라이커 무득점 연속
    if (isST(S)) { st.drought = g ? 0 : (st.drought || 0) + 1; if (st.drought >= 40) unlock(S, 'drought40'); }
  }
  if (m.comp === 'nt') unlock(S, 'ntdebut');
  if (g >= 3) unlock(S, 'hat');
  if (g >= 4) unlock(S, 'poker');
  if (g >= 5) unlock(S, 'five');
  if (g >= 3 && !m.start) unlock(S, 'sub_hat');
  if (g && m.stage === '결승') unlock(S, 'finalgoal');
  if (g && m.comp === 'nt' && /월드컵/.test(m.compName || '')) unlock(S, 'wcgoal');
  if (g && S.p.pos === 'GK') unlock(S, 'gkgoal');
  if (m.rating >= 9) unlock(S, 'r9');
  if (m.rating >= 9.95) unlock(S, 'r10');
  if (m.rating && m.rating <= 4.9 && m.min >= 30) unlock(S, 'rlow');
  if (m.st.red) { st.reds = (st.reds || 0) + 1; if (st.reds >= 7) unlock(S, 'red7'); }
  if (S.p.age >= 38 && proComp(m)) unlock(S, 'a38');
  if (S.p.age >= 40 && proComp(m)) unlock(S, 'a40');
}
function onMoment(S, x) {
  const st = stats(S);
  if (x.ok) { st.mOk = (st.mOk || 0) + 1; st.mBad = 0; } else { st.mBad = (st.mBad || 0) + 1; st.mOk = 0; }
  if (st.mOk >= 5) unlock(S, 'nerve5');
  if (st.mBad >= 5) unlock(S, 'choke5');
  if (x.type === 'penalty' && !x.ok) { st.penFail = (st.penFail || 0) + 1; if (st.penFail >= 3) unlock(S, 'penfail3'); }
}
function leagueNation(S, r) { const lg = S.w.lg[r.lgId]; return lg ? lg.nation : null; }
function onSeason(S, r) {
  const st = stats(S), t = r.total, p = S.p;
  const age = r.age;
  if (age <= 18 && t.goals >= 5) unlock(S, 'teen5');
  if (age <= 19 && t.apps >= 20 && (t.goals >= 15 || r.rating >= 7.3)) unlock(S, 'wonderkid');
  if (t.goals >= 20) unlock(S, 's20');
  if (t.goals >= 30) unlock(S, 's30');
  if (t.goals >= 50) unlock(S, 's50');
  if (t.assists >= 20) unlock(S, 'a20');
  if ((t.motm || 0) >= 10) unlock(S, 'motm10');
  if (r.pos === 'CB' && t.goals >= 10) unlock(S, 'cb10');
  if (r.pos === 'ST' && t.apps >= 25 && !t.goals) unlock(S, 'drought');
  if ((t.yellow || 0) >= 12) unlock(S, 'yel12');
  if (t.apps >= 50) unlock(S, 'iron');
  const benched = (r.log || []).filter(m => !m.y && !m.p && m.w && /벤치|명단|미출전/.test(m.w)).length;
  if (benched >= 30) unlock(S, 'bench30');
  const injD = (r.injuries || []).reduce((a, x) => a + (x.days || 0), 0);
  if (injD >= 100) unlock(S, 'glass');
  // 통산
  let goals = 0; for (const h of S.hist) goals += h.total ? h.total.goals : 0;
  if (goals >= 100) unlock(S, 'c100'); if (goals >= 300) unlock(S, 'c300'); if (goals >= 500) unlock(S, 'c500');
  let nt = 0; for (const h of S.hist) nt += h.nt && h.ntLvl === 'A' ? h.nt.apps : 0;
  if (nt >= 100) unlock(S, 'century');
  // 트로피
  const tk = (r.trophies || []).map(x => x.k);
  if (tk.includes('league')) unlock(S, 'league');
  if (tk.includes('cup')) unlock(S, 'cup');
  const ucl = (r.trophies || []).some(x => x.k === 'cont' && /챔피언스리그/.test(x.t) && /UEFA/.test(x.t));
  if (ucl) unlock(S, 'ucl');
  if (ucl && tk.includes('league') && tk.includes('cup')) unlock(S, 'treble');
  if (r.tourn && r.tourn.won) unlock(S, /월드컵/.test(r.tourn.name) ? 'wc' : 'conttour');
  const ak = (r.awards || []).map(a => a.k);
  if (ak.includes('boot')) unlock(S, 'boot');
  if (ak.includes('boot') && tk.includes('league')) unlock(S, 'bootchamp');
  if (ak.includes('golden')) unlock(S, 'golden');
  const bd = S.awards.filter(a => a.k === 'ballon').length;
  if (bd >= 1) unlock(S, 'ballon'); if (bd >= 3) unlock(S, 'ballon3');
  if (S.trophies.length >= 10) unlock(S, 'tro10');
  // 승강
  const lg = S.w.lg[r.lgId];
  const pr = S.lastSeason && S.lastSeason.promo ? S.lastSeason.promo[r.club] : 0;
  if (pr > 0) { st.promo = (st.promo || 0) + 1; unlock(S, 'promo'); }
  if (pr < 0) { st.releg = (st.releg || 0) + 1; unlock(S, 'releg'); if (t.goals >= 15) unlock(S, 'struggle'); }
  if ((st.promo || 0) >= 2 && (st.releg || 0) >= 2) unlock(S, 'yoyo');
  if (lg && lg.tier >= 3 && t.goals >= 20) unlock(S, 'lowking');
  // 해외·대륙
  const nat = leagueNation(S, r);
  if (nat && r.status !== 'youth') {
    if (nat !== p.nat && !(['ENG', 'SCO', 'WAL', 'NIR'].includes(nat) && ['ENG', 'SCO', 'WAL', 'NIR'].includes(p.nat))) unlock(S, 'abroad');
    st.confs = st.confs || {}; st.confs[C.confOf(nat)] = 1; if (Object.keys(st.confs).length >= 3) unlock(S, 'globe');
  }
  // 성장
  const o = r.ovr1;
  if (o >= 80) unlock(S, 'o80'); if (o >= 85) unlock(S, 'o85'); if (o >= 90) unlock(S, 'o90');
  const prevPeak = Math.max(0, ...S.hist.slice(0, -1).map(h => Math.max(h.ovr0, h.ovr1)));
  if (age >= 30 && o > prevPeak && S.hist.length > 5) unlock(S, 'late');
  // 이적 경로
  const pro = new Set(S.hist.filter(h => h.club && h.status !== 'youth').map(h => h.club));
  if (pro.size >= 8) unlock(S, 'journey');
  if ((S.clubsJoined || []).filter(j => j.type === 'loan').length >= 4) unlock(S, 'loans');
  if ((S.feeLog || []).some(f => f.fee >= 1e8)) unlock(S, 'fee100');
  if (r.winter) unlock(S, 'winter');
  if (age >= 27 && S.clubsJoined && S.clubsJoined[0] && r.club === S.clubsJoined[0].club && pro.size >= 2) unlock(S, 'home');
  // 이벤트 불운
  if ((st.badY === S.w.year ? st.bad : 0) >= 3) unlock(S, 'badluck');
  if (p.money >= 7e7) unlock(S, 'rich');
  const cd = S.flags.crossDone ? Object.keys(S.flags.crossDone).length : 0;
  if (cd >= 8) unlock(S, 'cross');
}
function onRetire(S) {
  const sum = C.summaryLite ? C.summaryLite(S) : null;
  const peak = Math.max(0, ...S.hist.map(h => Math.max(h.ovr0, h.ovr1)));
  if (S.p.age < 30) unlock(S, 'early');
  if (peak < 70) unlock(S, 'never70');
  let nt = 0; for (const h of S.hist) nt += h.nt && h.ntLvl === 'A' ? h.nt.apps : 0;
  if (peak >= 78 && !nt) unlock(S, 'nonat');
  const pro = S.hist.filter(h => h.club && h.status !== 'youth');
  const clubs = new Set(pro.filter(h => h.status !== 'loan').map(h => h.club));
  if (pro.length >= 12 && clubs.size === 1 && !pro.some(h => h.status === 'loan')) unlock(S, 'oneclub');
  void sum;
}
A.fire = function (S, kind, x) {
  try {
    if (kind === 'match') onMatch(S, x);
    else if (kind === 'moment') onMoment(S, x);
    else if (kind === 'season') onSeason(S, x);
    else if (kind === 'retire') onRetire(S);
    else if (kind === 'free') unlock(S, 'free');
    else if (kind === 'event') { const st = stats(S); if (x && x.good < 0) { if (st.badY !== S.w.year) { st.badY = S.w.year; st.bad = 0; } st.bad++; if (st.bad >= 3) unlock(S, 'badluck'); } }
    else if (kind === 'shop') {
      unlock(S, 'shop1');
      if (stats(S).spent >= 1e7) unlock(S, 'spender');
      if (x.id === 'house') unlock(S, 'house');
      if (x.id === 'car' && x.scandal) unlock(S, 'scandal');
    }
  } catch (e) { console.error('ach', e); }
};
})(typeof window !== 'undefined' ? window : globalThis);
