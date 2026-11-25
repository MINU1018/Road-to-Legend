// 회귀 검사: 세계를 N시즌 돌리며 OVR 분포·교체 분포·임대 상태·2군·컵 참가를 확인한다
// 사용: node tools/verify.js [시즌 수=2]
const { C, GM } = require('./load.js');
(async () => {
  const N = +(process.argv[2] || 2), S = GM.newWorld(), w = S.w, t0 = Date.now();
  const dist = () => { const o = []; for (const id in w.clubs) for (const e of w.clubs[id].sq || []) o.push(e[2]); for (const e of w.fa || []) o.push(e[2]); o.sort((a, b) => b - a); return { n90: o.filter(x => x >= 90).length, n86: o.filter(x => x >= 86).length, n80: o.filter(x => x >= 80).length, k10: o[9], k100: o[99] }; };
  console.log('시작', JSON.stringify(dist()), '실제 임대', w.loanN || 0);
  let bad = 0;
  for (let y = 0; y < N; y++) {
    await GM.worldRun(S, C.day(2027 + y, 5, 1));
    const st = C.liveStore(S), L = st.L.ENG1, sc = {};
    if (L) for (let i = 0; i < (L.l || []).length; i++) { const d = C.MD.leagueMatch(st, L, i); if (!d.ln) continue; for (const side of d.ln) { const k = side.filter(x => !x.start).length; sc[k] = (sc[k] || 0) + 1; }
      // 경기 세부 통계 정합성: 골 = 골 슈팅, 선방 = 상대 유효 슈팅 − 골
      const r = C.MD.leagueRows(w, L)[i], M = C.MS.gen({ a: r.a, b: r.b, ga: r.ga, gb: r.gb, d, key: 'v' + i, nc: 1 });
      for (let s = 0; s < 2; s++) { const g = d.ev.filter(e => e.s === s && (e.k === 'g' || e.k === 'p')).length; if (M.shots.filter(x => x.s === s && x.res === '골').length !== g) bad++; const T = C.MS.team(M, s, 2), O = C.MS.team(M, 1 - s, 2), og = d.ev.filter(e => e.s === 1 - s && (e.k === 'g' || e.k === 'p')).length; if (T.sav !== O.sot - og) bad++; } }
    await GM.worldRun(S, C.day(2027 + y, 9, 5));
    let self = 0; for (const id in w.clubs) for (const e of w.clubs[id].sq || []) if (e[7] && e[7] === id) self++;
    const bInCup = Object.values(w.cal.cup).some(c => c.rounds.some(r => r.ent.some(id => w.clubs[id] && w.clubs[id].parent)));
    console.log(`${2026 + y}/${String(27 + y).slice(-2)}`, '교체 인원 분포', JSON.stringify(sc), '자기 구단 임대', self, '2군 컵 참가', bInCup, JSON.stringify(dist()), ((Date.now() - t0) / 1000).toFixed(0) + 's');
    if (self || bInCup) bad++;
  }
  console.log(bad ? `문제 ${bad}건` : '이상 없음'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
