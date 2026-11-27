// Node에서 게임 엔진 불러오기 (화면 없이 시뮬레이션·검증용)
// 사용: const { C, GM } = require('./tools/load.js');  C = TC(엔진), GM = TCG(진행 컨트롤러)
// index.html의 <script> 순서 중 엔진 부분만 같은 순서로 읽는다 (UI 파일은 제외)
const path = require('path');
global.window = global;
const B = process.env.SRC || path.join(__dirname, '..') + path.sep;
['data_fc27.js', 'data_fa.js', 'data_s2526.js', 'data_yth.js', 'data_loans.js', 'data_mgr.js', 'data_rank.js', 'data_crank.js', 'data_legends.js', 'data_rivals.js', 'data_world.js', 'data_names.js', 'data_ext.js', 'profiles.js', 'core.js', 'world.js', 'market.js', 'cups.js', 'season.js', 'history.js', 'tactics.js', 'matchdb.js', 'puskas.js', 'lrec.js', 'rank.js', 'crank.js', 'legends.js', 'tm.js', 'matchstats.js', 'calendar.js', 'wnews.js', 'events.js', 'moments.js', 'game.js', 'shop.js', 'wcareer.js', 'achievements.js', 'bio.js', 'logos.js', 'extras.js']
  .forEach(f => { try { require(path.join(B, f)); } catch (e) { if (!/ENOENT|Cannot find/.test(e.message)) throw e; } });
TC.cfg.moments = 'off';
module.exports = { C: TC, GM: TCG };
