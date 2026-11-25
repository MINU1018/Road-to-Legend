// Road to Legend — 실제 감독 (유럽 5대 리그). F.MGR = 2026/27 시즌 시작 시점, F.MGR_CHG = 2026-11-24까지 시즌 중 교체
// 출처: 각 리그 2026/27 시즌 감독 목록(premierleague.com·리그 공식·Wikipedia 2026–27 시즌 문서) + 시즌 중 교체(footballtransfers.com, 2026-11-17 기준)
// 구단 ID: [이름, 국적, 출생 연도, 부임일, 주 포메이션?, 공격 방식?, 수비 방식?, 지도력 보정?]
// 포메이션·방식을 비워 둔 감독은 이름 시드로 정해진다 (tactics.js C.mgrStyle)
(function (G) {
const F = G.FC27 = G.FC27 || {};
F.MGR = {
  // 프리미어리그
  ENG_ARS: ['Mikel Arteta', 'ESP', 1982, '2019-12-22', '4-3-3', '점유율', '전방 압박', .55],
  ENG_AVL: ['Unai Emery', 'ESP', 1971, '2022-11-05', '4-2-3-1', '중앙 침투', '중간 블록', .45],
  ENG_BOU: ['Marco Rose', 'GER', 1976, '2026-07-01', '4-2-3-1', '직선적', '전방 압박'],
  ENG_BRE: ['Keith Andrews', 'IRL', 1980, '2025-06-27', '4-3-3', '직선적', '중간 블록'],
  ENG_BHA: ['Fabian Hürzeler', 'GER', 1993, '2024-06-15', '4-2-3-1', '점유율', '전방 압박'],
  ENG_CHE: ['Xabi Alonso', 'ESP', 1981, '2026-07-01', '3-4-2-1', '점유율', '전방 압박', .5],
  ENG_COV: ['Frank Lampard', 'ENG', 1978, '2024-11-28', '4-2-3-1', '직선적', '중간 블록'],
  ENG_CRY: ['Pierre Sage', 'FRA', 1979, '2026-06-20', '4-3-3', '역습', '전방 압박'],
  ENG_EVE: ['David Moyes', 'SCO', 1963, '2025-01-11', '4-2-3-1', '측면 공략', '중간 블록'],
  ENG_FUL: ['Álvaro Arbeloa', 'ESP', 1983, '2026-07-06', '4-3-3', '점유율', '중간 블록'],
  ENG_HUL: ['Sergej Jakirović', 'CRO', 1976, '2025-06-10', '4-2-3-1', '역습', '중간 블록'],
  ENG_IPS: ["Gary O'Neil", 'ENG', 1983, '2026-06-15', '4-2-3-1', '직선적', '중간 블록'],
  ENG_LEE: ['Daniel Farke', 'GER', 1976, '2023-07-04', '4-2-3-1', '점유율', '중간 블록'],
  ENG_LIV: ['Andoni Iraola', 'ESP', 1982, '2026-07-01', '4-2-3-1', '직선적', '전방 압박', .35],
  ENG_MUN: ['Michael Carrick', 'ENG', 1981, '2026-01-13', '4-2-3-1', '점유율', '중간 블록'],
  ENG_MCI: ['Enzo Maresca', 'ITA', 1980, '2026-06-23', '4-2-3-1', '점유율', '전방 압박', .4],
  ENG_NEW: ['Matthias Jaissle', 'GER', 1988, '2026-07-15', '4-4-2', '직선적', '전방 압박'],
  ENG_NFO: ['Oliver Glasner', 'AUT', 1974, '2026-07-01', '3-4-2-1', '역습', '전방 압박', .35],
  ENG_SUN: ['Régis Le Bris', 'FRA', 1975, '2024-06-22', '4-3-3', '점유율', '중간 블록'],
  ENG_TOT: ['Roberto De Zerbi', 'ITA', 1979, '2026-06-01', '4-2-3-1', '점유율', '전방 압박', .35],
  // 라리가
  ESP_ALA: ['Quique Sánchez Flores', 'ESP', 1965, '2026-06-01', '4-4-2', '역습', '낮은 블록'],
  ESP_ATH: ['Edin Terzić', 'GER', 1982, '2026-07-01', '4-2-3-1', '직선적', '전방 압박'],
  ESP_ATM: ['Diego Simeone', 'ARG', 1970, '2011-12-23', '4-4-2', '역습', '낮은 블록', .45],
  ESP_BAR: ['Hansi Flick', 'GER', 1965, '2024-05-29', '4-2-3-1', '직선적', '전방 압박', .5],
  ESP_CEL: ['Claudio Giráldez', 'ESP', 1988, '2024-03-25', '3-4-3', '점유율', '전방 압박'],
  ESP_DEP: ['Antonio Hidalgo', 'ESP', 1979, '2025-06-01', '4-2-3-1', '점유율', '중간 블록'],
  ESP_ELC: ['Martín Anselmi', 'ARG', 1985, '2026-06-13', '3-4-3', '점유율', '전방 압박'],
  ESP_ESP: ['Manolo González', 'ESP', 1979, '2024-01-29', '4-4-2', '역습', '낮은 블록'],
  ESP_GET: ['José Bordalás', 'ESP', 1964, '2021-10-04', '4-4-2', '직선적', '낮은 블록'],
  ESP_LEV: ['Luís Castro', 'POR', 1961, '2026-01-01', '4-3-3', '점유율', '중간 블록'],
  ESP_MAG: ['Juan Francisco Funes', 'ESP', 1979, '2025-06-01', '4-4-2', '역습', '중간 블록'],
  ESP_OSA: ['Luis Miguel Ramis', 'ESP', 1970, '2026-06-10', '4-4-2', '역습', '중간 블록'],
  ESP_RAC: ['José Alberto López', 'ESP', 1981, '2022-11-01', '4-2-3-1', '점유율', '중간 블록'],
  ESP_RAY: ['Beñat San José', 'ESP', 1979, '2026-06-18', '4-4-2', '측면 공략', '전방 압박'],
  ESP_BET: ['Manuel Pellegrini', 'CHI', 1953, '2020-07-09', '4-2-3-1', '점유율', '중간 블록', .3],
  ESP_RMA: ['José Mourinho', 'POR', 1963, '2026-06-13', '4-2-3-1', '역습', '중간 블록', .3],
  ESP_RSO: ['Pellegrino Matarazzo', 'USA', 1977, '2025-12-20', '4-3-3', '직선적', '전방 압박'],
  ESP_SEV: ['Luis García Plaza', 'ESP', 1972, '2026-06-01', '4-4-2', '측면 공략', '중간 블록'],
  ESP_VAL: ['Carlos Corberán', 'ESP', 1983, '2024-12-24', '3-4-2-1', '직선적', '전방 압박'],
  ESP_VIL: ['Iñigo Pérez', 'ESP', 1988, '2026-06-01', '4-4-2', '직선적', '전방 압박'],
  // 세리에 A
  ITA_ATA: ['Maurizio Sarri', 'ITA', 1959, '2026-06-15', '4-3-3', '점유율', '중간 블록', .35],
  ITA_BOL: ['Domenico Tedesco', 'GER', 1985, '2026-06-02', '3-4-2-1', '역습', '중간 블록'],
  ITA_CAG: ['Fabio Pisacane', 'ITA', 1986, '2025-06-01', '3-5-2', '역습', '낮은 블록'],
  ITA_COM: ['Cesc Fàbregas', 'ESP', 1987, '2024-07-01', '4-2-3-1', '점유율', '전방 압박', .35],
  ITA_FIO: ['Fabio Grosso', 'ITA', 1977, '2026-06-08', '4-3-3', '점유율', '중간 블록'],
  ITA_FRO: ['Massimiliano Alvini', 'ITA', 1970, '2025-06-01', '3-4-3', '직선적', '전방 압박'],
  ITA_GEN: ['Daniele De Rossi', 'ITA', 1983, '2025-11-15', '4-3-3', '점유율', '중간 블록'],
  ITA_INT: ['Cristian Chivu', 'ROU', 1980, '2025-06-09', '3-5-2', '측면 공략', '중간 블록', .4],
  ITA_JUV: ['Luciano Spalletti', 'ITA', 1959, '2025-10-30', '3-4-2-1', '점유율', '전방 압박', .4],
  ITA_LAZ: ['Gennaro Gattuso', 'ITA', 1978, '2026-06-23', '4-3-3', '직선적', '전방 압박'],
  ITA_LEC: ['Eusebio Di Francesco', 'ITA', 1969, '2025-06-01', '4-3-3', '측면 공략', '중간 블록'],
  ITA_MIL: ['Rúben Amorim', 'POR', 1985, '2026-06-16', '3-4-2-1', '점유율', '중간 블록', .2],
  ITA_MZA: ['Ivan Jurić', 'CRO', 1975, '2026-06-29', '3-4-2-1', '직선적', '전방 압박'],
  ITA_NAP: ['Massimiliano Allegri', 'ITA', 1967, '2026-07-03', '3-5-2', '역습', '낮은 블록', .35],
  ITA_PAR: ['Carlos Cuesta', 'ESP', 1995, '2025-06-20', '4-3-3', '점유율', '전방 압박'],
  ITA_ROM: ['Gian Piero Gasperini', 'ITA', 1958, '2025-06-13', '3-4-2-1', '직선적', '전방 압박', .45],
  ITA_SAS: ['Alberto Aquilani', 'ITA', 1984, '2026-06-12', '4-3-3', '점유율', '중간 블록'],
  ITA_TOR: ['Ignazio Abate', 'ITA', 1986, '2026-06-12', '3-4-2-1', '측면 공략', '중간 블록'],
  ITA_UDI: ['Kosta Runjaić', 'GER', 1971, '2024-07-01', '3-5-2', '역습', '중간 블록'],
  ITA_VEN: ['Giovanni Stroppa', 'ITA', 1968, '2025-06-01', '3-5-2', '직선적', '중간 블록'],
  // 분데스리가
  GER_FCA: ['Manuel Baum', 'GER', 1979, '2026-01-01', '3-4-2-1', '역습', '중간 블록'],
  GER_FCU: ['Mauro Lustrinelli', 'SUI', 1975, '2026-07-01', '3-5-2', '역습', '중간 블록'],
  GER_SVW: ['Daniel Thioune', 'GER', 1974, '2026-02-01', '4-2-3-1', '직선적', '중간 블록'],
  GER_BVB: ['Niko Kovač', 'CRO', 1971, '2025-02-02', '3-4-2-1', '직선적', '중간 블록', .25],
  GER_SGE: ['Adi Hütter', 'AUT', 1970, '2026-07-01', '3-4-2-1', '역습', '전방 압박'],
  GER_SCF: ['Julian Schuster', 'GER', 1985, '2024-07-01', '4-2-3-1', '측면 공략', '중간 블록'],
  GER_HSV: ['Merlin Polzin', 'GER', 1990, '2024-11-25', '4-3-3', '점유율', '전방 압박'],
  GER_TSG: ['Christian Ilzer', 'AUT', 1977, '2024-11-11', '3-4-2-1', '직선적', '전방 압박'],
  GER_KOE: ['René Wagner', 'GER', 1987, '2026-03-01', '4-2-3-1', '직선적', '전방 압박'],
  GER_B04: ['Carles Martínez Novell', 'ESP', 1983, '2026-07-01', '3-4-3', '점유율', '전방 압박'],
  GER_RBL: ['Martín Demichelis', 'ARG', 1980, '2026-07-01', '4-2-3-1', '직선적', '전방 압박'],
  GER_M05: ['Urs Fischer', 'SUI', 1966, '2025-12-01', '3-5-2', '역습', '낮은 블록'],
  GER_BMG: ['Eugen Polanski', 'GER', 1986, '2025-09-15', '4-2-3-1', '직선적', '중간 블록'],
  GER_FCB: ['Vincent Kompany', 'BEL', 1986, '2024-05-29', '4-2-3-1', '점유율', '전방 압박', .45],
  GER_SCP: ['Ralf Kettemann', 'GER', 1986, '2025-06-01', '4-2-3-1', '직선적', '중간 블록'],
  GER_S04: ['Miron Muslić', 'AUT', 1982, '2025-06-01', '3-4-2-1', '직선적', '전방 압박'],
  GER_SVE: ['Vincent Wagner', 'GER', 1986, '2025-06-01', '4-4-2', '점유율', '전방 압박'],
  GER_VFB: ['Sebastian Hoeneß', 'GER', 1982, '2023-04-03', '4-2-3-1', '점유율', '전방 압박', .35],
  // 리그 1
  FRA_ANG: ['Stéphane Gilli', 'FRA', 1980, '2026-06-09', '4-4-2', '역습', '낮은 블록'],
  FRA_AUX: ['Will Still', 'BEL', 1992, '2026-06-12', '4-4-2', '직선적', '전방 압박'],
  FRA_BRS: ['Julien Lachuer', 'FRA', 1975, '2026-06-27', '4-3-3', '측면 공략', '중간 블록'],
  FRA_LMF: ['Patrick Videira', 'FRA', 1975, '2023-06-01', '4-3-3', '점유율', '중간 블록'],
  FRA_RCL: ['Dino Toppmöller', 'GER', 1980, '2026-06-16', '4-2-3-1', '직선적', '전방 압박'],
  FRA_LIL: ['Davide Ancelotti', 'ITA', 1989, '2026-06-01', '4-2-3-1', '점유율', '중간 블록'],
  FRA_FCL: ['Alexandre Dujeux', 'FRA', 1977, '2026-06-09', '3-4-3', '직선적', '중간 블록'],
  FRA_OL: ['Paulo Fonseca', 'POR', 1973, '2025-01-31', '4-2-3-1', '점유율', '중간 블록'],
  FRA_OM: ['Bruno Genesio', 'FRA', 1966, '2026-07-01', '4-2-3-1', '측면 공략', '중간 블록'],
  FRA_ASM: ['Filipe Luís', 'BRA', 1985, '2026-07-06', '4-2-3-1', '점유율', '전방 압박'],
  FRA_NIC: ['Olivier Pantaloni', 'FRA', 1966, '2026-06-17', '4-4-2', '역습', '중간 블록'],
  FRA_PFC: ['Liam Rosenior', 'ENG', 1984, '2026-07-07', '4-3-3', '점유율', '중간 블록'],
  FRA_PSG: ['Luis Enrique', 'ESP', 1970, '2023-07-05', '4-3-3', '점유율', '전방 압박', .6],
  FRA_REN: ['Franck Haise', 'FRA', 1971, '2026-01-01', '3-4-2-1', '측면 공략', '중간 블록'],
  FRA_RCS: ['Hugo Oliveira', 'POR', 1979, '2026-07-12', '4-3-3', '점유율', '중간 블록'],
  FRA_TFC: ['Jens Berthel Askou', 'DEN', 1982, '2026-05-21', '3-4-3', '직선적', '전방 압박'],
  FRA_TRO: ['Stéphane Dumont', 'FRA', 1982, '2025-06-01', '4-3-3', '역습', '중간 블록'],
  FRA_HAC: ['Didier Digard', 'FRA', 1986, '2024-06-01', '4-3-3', '역습', '중간 블록']
};
// 시즌 중 실제 교체 (그 날짜에 원래 감독이 아직 있으면 그대로 일어난다): [구단, 날짜, 사유, 새 감독]
// 리옹(퐁세카 → 비센스)은 날짜가 알려지지 않아 10월 중순으로 둔다. 르아브르(디가르 이탈, 10/31)는 후임 미상이라 넣지 않았다
F.MGR_CHG = [
  ['ITA_FIO', '2026-09-06', '경질', ['Paolo Vanoli', 'ITA', 1972, '2026-09-07', '3-5-2', '역습', '중간 블록']],
  ['ESP_VAL', '2026-09-13', '경질', ['Javier Aguirre', 'MEX', 1958, '2026-09-23', '4-4-2', '역습', '낮은 블록']],
  ['GER_BMG', '2026-09-13', '경질', ['Alexander Blessin', 'GER', 1973, '2026-09-15', '4-4-2', '직선적', '전방 압박']],
  ['FRA_RCL', '2026-09-15', '경질', ['Yannick Cahuzac', 'FRA', 1985, '2026-09-15', '4-3-3', '역습', '중간 블록']],
  ['ITA_BOL', '2026-09-16', '경질', ['Raffaele Palladino', 'ITA', 1984, '2026-09-16', '3-4-2-1', '직선적', '전방 압박']],
  ['ITA_PAR', '2026-09-28', '경질', ['Alberto Gilardino', 'ITA', 1982, '2026-09-29', '3-5-2', '역습', '중간 블록']],
  ['ESP_OSA', '2026-10-12', '경질', ['Jagoba Arrasate', 'ESP', 1978, '2026-10-12', '4-4-2', '직선적', '전방 압박']],
  ['ITA_VEN', '2026-10-13', '경질', ['Davide Nicola', 'ITA', 1973, '2026-10-14', '3-5-2', '직선적', '중간 블록']],
  ['FRA_OL', '2026-10-19', '사임', ['Carlos Vicens', 'ESP', 1983, '2026-10-20', '4-3-3', '점유율', '전방 압박']],
  ['ESP_ESP', '2026-10-27', '경질', ['Eder Sarabia', 'ESP', 1981, '2026-10-28', '4-3-3', '점유율', '전방 압박']],
  ['ITA_UDI', '2026-11-02', '경질', ['Paolo Zanetti', 'ITA', 1982, '2026-11-03', '3-5-2', '역습', '중간 블록']],
  ['ITA_SAS', '2026-11-09', '경질', ["Roberto D'Aversa", 'ITA', 1975, '2026-11-10', '4-3-3', '역습', '중간 블록']],
  ['FRA_RCL', '2026-11-10', '경질', ['Didier Digard', 'FRA', 1986, '2026-11-10', '3-4-2-1', '직선적', '전방 압박']],
  ['ENG_CRY', '2026-11-12', '경질', ['Thomas Frank', 'DEN', 1973, '2026-11-14', '3-5-2', '직선적', '중간 블록', .3]],
  ['ENG_MUN', '2026-11-12', '경질', ['Mauricio Pochettino', 'ARG', 1972, '2026-11-14', '4-2-3-1', '중앙 침투', '전방 압박', .35]],
  ['FRA_RCS', '2026-11-18', '경질', ['Vítor Matos', 'POR', 1987, '2026-11-18', '4-2-3-1', '점유율', '전방 압박']],
];
F.MGR_CHG.push(['FRA_HAC', '2026-10-31', '사임', null]);
F.MGR_CHG.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
// 감독 시장: 현재 팀이 없는 실제 감독 (경질·공석 때 빅리그 구단이 먼저 찾는다)
F.MGR_FREE = [
  ['Pep Guardiola', 'ESP', 1971, '4-3-3', '점유율', '전방 압박', .65], ['Antonio Conte', 'ITA', 1969, '3-5-2', '역습', '중간 블록', .45],
  ['Xavi Hernández', 'ESP', 1980, '4-3-3', '점유율', '전방 압박', .3], ['Erik ten Hag', 'NED', 1970, '4-2-3-1', '점유율', '전방 압박', .2],
  ['Ange Postecoglou', 'AUS', 1965, '4-3-3', '점유율', '전방 압박', .15], 
  ['Thiago Motta', 'ITA', 1982, '4-2-3-1', '점유율', '전방 압박', .15], ['Igor Tudor', 'CRO', 1978, '3-4-2-1', '직선적', '전방 압박', .15], ['Stefano Pioli', 'ITA', 1965, '4-2-3-1', '직선적', '중간 블록', .2],
  ['Nuri Şahin', 'TUR', 1988, '4-2-3-1', '점유율', '중간 블록', 0], 
  
  
  
  
  ['Eddie Howe', 'ENG', 1977, '4-3-3', '직선적', '전방 압박', .3], ['Ernesto Valverde', 'ESP', 1964, '4-4-2', '역습', '중간 블록', .25], ['Marcelino', 'ESP', 1965, '4-4-2', '역습', '중간 블록', .2],
  ['Vincenzo Italiano', 'ITA', 1977, '4-2-3-1', '직선적', '전방 압박', .2], ['Sean Dyche', 'ENG', 1971, '4-4-2', '직선적', '낮은 블록', .05]
];
})(typeof window !== 'undefined' ? window : globalThis);
// 명성(0~100)과 선수 시절 경력: I = 국가대표, P = 프로 선수, S = 하부·세미프로, N = 선수 경력 거의 없음
// 명성 단계: 무명 <25 · 지역적 25~44 · 국내적 45~64 · 대륙적 65~82 · 세계적 83+
(function (G) {
const F = G.FC27;
F.MGR_REP = {
  'Pep Guardiola': [98, 'I'], 'José Mourinho': [91, 'S'], 'Luis Enrique': [91, 'I'], 'Diego Simeone': [89, 'I'], 'Antonio Conte': [89, 'I'],
  'Massimiliano Allegri': [86, 'P'], 'Xabi Alonso': [86, 'I'], 'Hansi Flick': [87, 'P'], 'Mikel Arteta': [84, 'P'], 'Unai Emery': [84, 'P'],
  'Mauricio Pochettino': [83, 'I'], 'Luciano Spalletti': [84, 'P'], 'Gian Piero Gasperini': [80, 'P'], 'Maurizio Sarri': [78, 'N'], 'Vincent Kompany': [78, 'I'],
  'Roberto De Zerbi': [77, 'P'], 'Erik ten Hag': [76, 'P'], 'Rúben Amorim': [76, 'I'], 'Enzo Maresca': [76, 'P'], 'Xavi Hernández': [77, 'I'],
  'Manuel Pellegrini': [77, 'P'], 'Cristian Chivu': [72, 'I'], 'Niko Kovač': [73, 'I'], 'Andoni Iraola': [72, 'I'], 'Oliver Glasner': [72, 'P'],
  'Thomas Frank': [70, 'N'], 'Ange Postecoglou': [70, 'I'], 'Stefano Pioli': [73, 'P'], 'Thiago Motta': [68, 'I'], 'Igor Tudor': [66, 'I'],
  'Eddie Howe': [72, 'P'], 'Ernesto Valverde': [74, 'I'], 'Marcelino': [68, 'P'], 'Sean Dyche': [62, 'P'], 'Vincenzo Italiano': [66, 'P'],
  'Javier Aguirre': [70, 'I'], 'Gennaro Gattuso': [68, 'I'], 'Cesc Fàbregas': [70, 'I'], 'David Moyes': [70, 'P'], 'Frank Lampard': [66, 'I'],
  'Sebastian Hoeneß': [68, 'P'], 'Marco Rose': [66, 'P'], 'Adi Hütter': [64, 'I'], 'Edin Terzić': [66, 'N'], 'Paulo Fonseca': [67, 'P'],
  'Carlos Corberán': [55, 'S'], 'Daniel Farke': [58, 'S'], 'Fabian Hürzeler': [60, 'S'], 'Daniele De Rossi': [64, 'I'], 'Domenico Tedesco': [64, 'N'],
  'Nuri Şahin': [58, 'I'], 'Ivan Jurić': [58, 'I'], 'Raffaele Palladino': [56, 'P'], 'Paolo Vanoli': [54, 'P'], 'Davide Nicola': [54, 'P'],
  'Michael Carrick': [58, 'I'], 'Bruno Genesio': [60, 'P'], 'Franck Haise': [58, 'S'], 'Will Still': [56, 'N'], 'Quique Sánchez Flores': [64, 'I'],
  'José Bordalás': [58, 'S'], 'Claudio Giráldez': [50, 'N'], 'Jagoba Arrasate': [55, 'S'], 'Luis García Plaza': [55, 'S'], 'Martín Demichelis': [60, 'I'],
  'Filipe Luís': [64, 'I'], 'Liam Rosenior': [52, 'I'], 'Davide Ancelotti': [52, 'N'], 'Didier Digard': [46, 'P'], 'Carlos Vicens': [42, 'N'],
  'Vítor Matos': [40, 'N'], 'Matthias Jaissle': [58, 'P'], 'Keith Andrews': [48, 'I'], 'Álvaro Arbeloa': [54, 'I'], "Gary O'Neil": [52, 'P'],
  'Régis Le Bris': [50, 'S'], 'Sergej Jakirović': [50, 'P'], 'Pierre Sage': [50, 'N'], 'Eder Sarabia': [46, 'S'], 'Pellegrino Matarazzo': [52, 'S'],
  'Iñigo Pérez': [48, 'P'], 'Luís Castro': [56, 'S'], 'Beñat San José': [44, 'S'], 'Antonio Hidalgo': [44, 'P'], 'José Alberto López': [42, 'S'],
  'Juan Francisco Funes': [40, 'S'], 'Martín Anselmi': [50, 'N'], 'Alberto Gilardino': [56, 'I'], 'Fabio Grosso': [56, 'I'], 'Alberto Aquilani': [48, 'I'],
  'Roberto D\'Aversa': [50, 'P'], 'Ignazio Abate': [46, 'I'], 'Paolo Zanetti': [46, 'P'], 'Kosta Runjaić': [52, 'S'], 'Giovanni Stroppa': [44, 'P'],
  'Fabio Pisacane': [42, 'P'], 'Massimiliano Alvini': [40, 'S'], 'Eusebio Di Francesco': [56, 'I'], 'Carlos Cuesta': [42, 'N'], 'Julian Schuster': [52, 'P'],
  'Christian Ilzer': [52, 'S'], 'Merlin Polzin': [42, 'N'], 'Manuel Baum': [48, 'N'], 'Mauro Lustrinelli': [44, 'I'], 'Daniel Thioune': [48, 'S'],
  'Urs Fischer': [58, 'P'], 'Alexander Blessin': [48, 'P'], 'Eugen Polanski': [44, 'I'], 'Ralf Kettemann': [38, 'S'], 'Miron Muslić': [44, 'S'],
  'Vincent Wagner': [38, 'S'], 'René Wagner': [36, 'S'], 'Carles Martínez Novell': [42, 'N'], 'Dino Toppmöller': [56, 'P'], 'Hugo Oliveira': [40, 'S'],
  'Stéphane Gilli': [40, 'S'], 'Julien Lachuer': [36, 'N'], 'Patrick Videira': [40, 'S'], 'Alexandre Dujeux': [42, 'S'], 'Olivier Pantaloni': [46, 'P'],
  'Jens Berthel Askou': [40, 'P'], 'Stéphane Dumont': [40, 'P'], 'Yannick Cahuzac': [34, 'P'], 'Luis Miguel Ramis': [46, 'P'], 'Manolo González': [46, 'S']
};
})(typeof window !== 'undefined' ? window : globalThis);
