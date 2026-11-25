// Road to Legend — 구단 라이벌 관계 (v39): [구단 A, 구단 B, 더비 이름('' = 이름 없음), 강도 3 숙적 · 2 주요 라이벌 · 1 지역·약한 라이벌]
// 이적: 강도가 높을수록 핵심 선수·유망주를 라이벌 구단에 팔지 않는다 (world.js C.rivalBlock). 경기: 강도 2 이상은 더비(관중·분위기)
(function (G) {
const F = G.FC27 = G.FC27 || {};
F.RIVALS = [
// 잉글랜드
['ENG_MUN', 'ENG_MCI', '맨체스터 더비', 3], ['ENG_LIV', 'ENG_EVE', '머지사이드 더비', 3], ['ENG_ARS', 'ENG_TOT', '북런던 더비', 3], ['ENG_LIV', 'ENG_MUN', '노스웨스트 더비', 3], ['ENG_NEW', 'ENG_SUN', '타인위어 더비', 3],
['ENG_AVL', 'ENG_BIR', '세컨드 시티 더비', 3], ['ENG_WOL', 'ENG_WBA', '블랙 컨트리 더비', 3], ['ENG_NFO', 'ENG_DER', '이스트미들랜즈 더비', 3], ['ENG_SOU', 'ENG_PMH', '사우스코스트 더비', 3], ['ENG_SHU', 'ENG_SHW', '스틸 시티 더비', 3],
['ENG_IPS', 'ENG_NOR', '이스트앵글리아 더비', 3], ['ENG_BRC', 'ENG_BRR', '브리스톨 더비', 3], ['ENG_CAR', 'ENG_SWA', '사우스웨일스 더비', 3], ['ENG_STK', 'ENG_PVA', '포터리스 더비', 3], ['ENG_BLB', 'ENG_BUR', '이스트랭커셔 더비', 3],
['ENG_WHU', 'ENG_MIL', '더 더비', 3], ['ENG_WAT', 'ENG_LUT', '', 3], ['ENG_BHA', 'ENG_CRY', 'M23 더비', 2], ['ENG_CHE', 'ENG_TOT', '', 2], ['ENG_CHE', 'ENG_ARS', '', 2], ['ENG_WHU', 'ENG_TOT', '', 2], ['ENG_LEE', 'ENG_MUN', '로즈 더비', 2],
['ENG_LEI', 'ENG_NFO', '', 2], ['ENG_LEI', 'ENG_COV', '', 2], ['ENG_PNE', 'ENG_BPL', '웨스트랭커셔 더비', 2], ['ENG_OXF', 'ENG_SWI', '', 2], ['ENG_LIN', 'ENG_GRI', '', 2], ['ENG_MKD', 'ENG_WIM', '', 2], ['ENG_NTC', 'ENG_NFO', '', 2], ['ENG_PLY', 'ENG_EXE', '데본 더비', 2],
['ENG_MID', 'ENG_NEW', '', 1], ['ENG_SUN', 'ENG_MID', '', 1], ['ENG_BOL', 'ENG_WIG', '', 1], ['ENG_HUD', 'ENG_LEE', '', 1], ['ENG_CHA', 'ENG_CRY', '', 1], ['ENG_QPR', 'ENG_CHE', '', 1], ['ENG_FUL', 'ENG_CHE', '', 1], ['ENG_BRE', 'ENG_FUL', '', 1], ['ENG_HUL', 'ENG_LEE', '', 1], ['ENG_REA', 'ENG_OXF', '', 1], ['ENG_BAR', 'ENG_SHW', '', 1], ['ENG_DON', 'ENG_ROT', '', 1], ['ENG_WRE', 'ENG_CHF', '', 1],
// 스페인
['ESP_RMA', 'ESP_BAR', '엘 클라시코', 3], ['ESP_RMA', 'ESP_ATM', '마드리드 더비', 3], ['ESP_SEV', 'ESP_BET', '세비야 더비', 3], ['ESP_BAR', 'ESP_ESP', '바르셀로나 더비', 3], ['ESP_DEP', 'ESP_CEL', '갈리시아 더비', 3], ['ESP_OVI', 'ESP_SPG', '아스투리아스 더비', 3], ['ESP_LPA', 'ESP_TEN', '카나리아 더비', 3],
['ESP_ATH', 'ESP_RSO', '바스크 더비', 2], ['ESP_VAL', 'ESP_LEV', '발렌시아 더비', 2], ['ESP_VAL', 'ESP_VIL', '', 2], ['ESP_MAG', 'ESP_GRA', '안달루시아 더비', 2], ['ESP_ATM', 'ESP_BAR', '', 1], ['ESP_ALA', 'ESP_ATH', '', 1], ['ESP_OSA', 'ESP_ATH', '', 1], ['ESP_RAY', 'ESP_GET', '', 1], ['ESP_EIB', 'ESP_ALA', '', 1], ['ESP_VLL', 'ESP_BUR', '', 1],
// 이탈리아
['ITA_INT', 'ITA_MIL', '밀라노 더비', 3], ['ITA_ROM', 'ITA_LAZ', '로마 더비', 3], ['ITA_JUV', 'ITA_TOR', '토리노 더비', 3], ['ITA_JUV', 'ITA_INT', '이탈리아 더비', 3], ['ITA_GEN', 'ITA_SAM', '제노바 더비', 3],
['ITA_NAP', 'ITA_ROM', '태양의 더비', 2], ['ITA_FIO', 'ITA_JUV', '', 2], ['ITA_JUV', 'ITA_MIL', '', 2], ['ITA_NAP', 'ITA_JUV', '', 2], ['ITA_BOL', 'ITA_FIO', '아펜니노 더비', 1], ['ITA_VER', 'ITA_VIC', '', 1], ['ITA_VEN', 'ITA_PAD', '', 1], ['ITA_PAL', 'ITA_CTZ', '', 1], ['ITA_ATA', 'ITA_INT', '', 1], ['ITA_PIS', 'ITA_EMP', '', 1],
// 독일
['GER_BVB', 'GER_S04', '레비어 더비', 3], ['GER_FCB', 'GER_BVB', '데어 클라시커', 3], ['GER_HSV', 'GER_SVW', '북부 더비', 3], ['GER_HSV', 'GER_STP', '함부르크 더비', 3], ['GER_KOE', 'GER_BMG', '라인 더비', 3], ['GER_VFB', 'GER_KSC', '바덴뷔르템베르크 더비', 3],
['GER_FCN', 'GER_SGF', '프랑켄 더비', 3], ['GER_BSC', 'GER_FCU', '베를린 더비', 3], ['GER_H96', 'GER_EBS', '니더작센 더비', 3], ['GER_KOE', 'GER_F95', '', 3], ['GER_SGE', 'GER_D98', '헤센 더비', 2], ['GER_FCB', 'GER_FCN', '바이에른 더비', 2],
['GER_S04', 'GER_BOC', '', 2], ['GER_BMG', 'GER_F95', '', 2], ['GER_B04', 'GER_KOE', '', 2], ['GER_WOB', 'GER_EBS', '', 2], ['GER_MSV', 'GER_RWE', '', 2], ['GER_FCB', 'GER_B04', '', 1], ['GER_FCB', 'GER_FCA', '', 1], ['GER_M05', 'GER_SGE', '', 1], ['GER_FCK', 'GER_SGE', '', 1], ['GER_BVB', 'GER_BOC', '', 1], ['GER_FCE', 'GER_SGD', '', 1], ['GER_SGD', 'GER_FCM', '', 1], ['GER_HRO', 'GER_STP', '', 2], ['GER_WAL', 'GER_FCK', '', 2], ['GER_FCS', 'GER_FCK', '', 2],
// 프랑스
['FRA_PSG', 'FRA_OM', '르 클라시크', 3], ['FRA_OL', 'FRA_ASSE', '론 더비', 3], ['FRA_ASM', 'FRA_NIC', '코트다쥐르 더비', 3], ['FRA_RCL', 'FRA_LIL', '북부 더비', 3], ['FRA_OM', 'FRA_OL', '', 2], ['FRA_FCN', 'FRA_REN', '브르타뉴 더비', 2], ['FRA_PSG', 'FRA_PFC', '파리 더비', 2],
['FRA_RCS', 'FRA_FCM', '', 2], ['FRA_REN', 'FRA_FCL', '', 1], ['FRA_BRS', 'FRA_FCL', '', 1], ['FRA_NIC', 'FRA_OM', '', 1], ['FRA_GUI', 'FRA_REN', '', 1], ['FRA_SOC', 'FRA_NAN', '', 1],
// 포르투갈·네덜란드·벨기에·스코틀랜드·튀르키예
['POR_SLB', 'POR_SCP', '리스본 더비', 3], ['POR_FCP', 'POR_SLB', '오 클라시쿠', 3], ['POR_SCB', 'POR_VSC', '미뉴 더비', 3], ['POR_FCP', 'POR_SCP', '', 2], ['POR_FCP', 'POR_SCB', '', 1],
['NED_AJA', 'NED_FEY', '더 클라시커', 3], ['NED_GRO', 'NED_HEE', '북부 더비', 3], ['NED_AJA', 'NED_PSV', '', 2], ['NED_FEY', 'NED_PSV', '', 2], ['NED_FEY', 'NED_SPA', '로테르담 더비', 2], ['NED_AJA', 'NED_AZ', '', 2], ['NED_UTR', 'NED_AJA', '', 2], ['NED_NEC', 'XNED_VITESSE', '겔더란트 더비', 2], ['NED_GAE', 'NED_PEC', '아이셀 더비', 2], ['NED_TWE', 'XNED_HERACLESALMELO', '', 2],
['BEL_AND', 'BEL_CLB', '', 2], ['BEL_AND', 'BEL_STL', '', 3], ['BEL_CLB', 'BEL_CER', '브뤼허 더비', 3], ['BEL_GNK', 'BEL_STV', '림뷔르흐 더비', 2], ['BEL_GNT', 'BEL_CLB', '', 1], ['BEL_ANT', 'BEL_CLB', '', 1],
['SCO_CEL', 'SCO_RAN', '올드 펌 더비', 3], ['SCO_HEA', 'SCO_HIB', '에든버러 더비', 3], ['SCO_DUN', 'SCO_DUU', '던디 더비', 3], ['SCO_ABE', 'SCO_RAN', '', 2], ['SCO_KIL', 'SCO_STM', '', 1],
['TUR_GS', 'TUR_FB', '인터콘티넨탈 더비', 3], ['TUR_FB', 'TUR_BJK', '', 3], ['TUR_GS', 'TUR_BJK', '', 3], ['TUR_TS', 'TUR_FB', '', 2], ['TUR_TS', 'TUR_GS', '', 1],
// 유럽 기타
['AUT_RAP', 'AUT_AUS', '빈 더비', 3], ['AUT_STU', 'AUT_GAK', '그라츠 더비', 3], ['AUT_RBS', 'AUT_RAP', '', 1], ['SUI_FCZ', 'SUI_GCZ', '취리히 더비', 3], ['SUI_BAS', 'SUI_FCZ', '', 2], ['SUI_YB', 'SUI_BAS', '', 2],
['DEN_FCK', 'DEN_BIF', '코펜하겐 더비', 3], ['DEN_AGF', 'DEN_FCM', '', 1], ['SWE_AIK', 'SWE_DIF', '스톡홀름 더비', 3], ['SWE_HAM', 'SWE_DIF', '스톡홀름 더비', 3], ['SWE_AIK', 'SWE_HAM', '스톡홀름 더비', 3], ['SWE_IFK', 'SWE_ORG', '예테보리 더비', 2], ['SWE_IFK', 'SWE_GAIS', '예테보리 더비', 2], ['SWE_GAIS', 'SWE_ORG', '예테보리 더비', 2], ['SWE_MFF', 'SWE_IFK', '', 1],
['NOR_RBK', 'NOR_MOL', '', 2], ['NOR_BRA', 'NOR_VIK', '', 2], ['NOR_LSK', 'NOR_VIF', '', 2], ['NOR_BOD', 'NOR_TIL', '북노르웨이 더비', 2], ['POL_WIS', 'POL_CRA', '크라쿠프 더비', 3], ['POL_LEG', 'POL_WID', '', 2], ['POL_LEG', 'POL_LPO', '', 2], ['POL_GOR', 'POL_PIA', '', 1],
['ROU_FCSB', 'ROU_DIN', '부쿠레슈티 더비', 3], ['ROU_FCSB', 'ROU_RAP', '', 3], ['ROU_DIN', 'ROU_RAP', '', 2], ['ROU_CFR', 'ROU_UCL', '클루지 더비', 3], ['IRL_SHA', 'IRL_BOH', '더블린 더비', 3], ['IRL_DER', 'IRL_SLI', '', 1],
['GRE_OLY', 'GRE_PAO', '영원한 적들의 더비', 3], ['GRE_PAOK', 'XGRE_ARISTHESSALONI', '테살로니키 더비', 3], ['GRE_AEK', 'GRE_PAO', '', 2], ['GRE_OLY', 'GRE_AEK', '', 2], ['GRE_PAOK', 'GRE_OLY', '', 2],
['UKR_DYN', 'UKR_SHA', '우크라이나 클라시코', 3], ['XRUS_SPARTAKMOSKVA', 'XRUS_CSKAMOSKVA', '', 3], ['XRUS_ZENIT', 'XRUS_SPARTAKMOSKVA', '', 2], ['XRUS_LOKOMOTIVMOSKV', 'XRUS_SPARTAKMOSKVA', '', 2], ['XRUS_DYNAMOMOSCOW', 'XRUS_SPARTAKMOSKVA', '', 1], ['XRUS_CSKAMOSKVA', 'XRUS_LOKOMOTIVMOSKV', '', 1],
['CZE_SLA', 'CZE_SPA', '프라하 더비', 3], ['CZE_PLZ', 'CZE_SPA', '', 1], ['XCZE_ZBROJOVKABRNO', 'XCZE_ARTISBRNO', '브르노 더비', 2],
// 남미
['ARG_BOC', 'ARG_RIV', '수페르클라시코', 3], ['ARG_RAC', 'ARG_IND', '아베야네다 더비', 3], ['ARG_ROS', 'ARG_NOB', '로사리오 더비', 3], ['ARG_EST', 'ARG_GLP', '라플라타 더비', 3], ['ARG_SLO', 'ARG_HUR', '', 3], ['ARG_TAL', 'ARG_BEL', '코르도바 더비', 3], ['ARG_BAN', 'ARG_LAN', '남부 더비', 2],
['ARG_BOC', 'ARG_SLO', '', 1], ['ARG_RIV', 'ARG_SLO', '', 1], ['ARG_IND', 'ARG_SLO', '', 1], ['ARG_VEL', 'ARG_ARJ', '', 1], ['ARG_PLA', 'ARG_TIG', '', 1],
['XBRA_FLAMENGO', 'XBRA_FLUMINENSE', '플라-플루', 3], ['XBRA_FLAMENGO', 'XBRA_VASCODAGAMA', '', 3], ['XBRA_CORINTHIANS', 'XBRA_PALMEIRAS', '파울리스타 더비', 3], ['XBRA_GREMIO', 'XBRA_INTERNACIONAL', '그레날', 3], ['XBRA_CRUZEIRO', 'XBRA_ATLETICOMINEIR', '미네이루 더비', 3], ['BRA_BAH', 'XBRA_VITORIA', '바바', 3], ['XBRA_ATHLETICOPARAN', 'XBRA_CORITIBA', '', 3],
['XBRA_SAOPAULO', 'XBRA_CORINTHIANS', '', 2], ['XBRA_PALMEIRAS', 'XBRA_SAOPAULO', '', 2], ['XBRA_SANTOS', 'XBRA_CORINTHIANS', '', 2], ['XBRA_FLAMENGO', 'BRA_BOT', '', 2], ['XBRA_FLUMINENSE', 'XBRA_VASCODAGAMA', '', 2], ['BRA_BOT', 'XBRA_FLUMINENSE', '', 2], ['BRA_BOT', 'XBRA_VASCODAGAMA', '', 2],
['URU_PEN', 'XURU_NACIONAL', '우루과이 클라시코', 3], ['XCHI_COLOCOLO', 'CHI_UCA', '', 2],
// 북중미
['MEX_AME', 'MEX_GDL', '엘 수페르 클라시코', 3], ['MEX_AME', 'MEX_PUM', '수도 클라시코', 3], ['MEX_TIG', 'MEX_MTY', '클라시코 레히오', 3], ['MEX_ATS', 'MEX_GDL', '클라시코 타파티오', 3], ['MEX_AME', 'MEX_CAZ', '', 2],
['USA_LAG', 'USA_LAFC', '엘 트래피코', 3], ['USA_NYR', 'USA_NYC', '허드슨 리버 더비', 3], ['USA_SEA', 'USA_POR', '캐스카디아 더비', 3], ['USA_POR', 'USA_VAN', '', 2], ['USA_SEA', 'USA_VAN', '', 2], ['USA_ORL', 'USA_MIA', '플로리다 더비', 2], ['USA_TOR', 'USA_MTL', '캐나디안 클라시코', 2],
['USA_CLB', 'USA_CIN', '헬 이즈 리얼 더비', 2], ['USA_HOU', 'USA_DAL', '텍사스 더비', 2], ['USA_LAG', 'USA_SJ', '캘리포니아 클라시코', 2], ['USA_COL', 'USA_RSL', '', 2], ['USA_ATL', 'USA_CLT', '', 1], ['USA_AUS', 'USA_DAL', '', 1], ['USA_DCU', 'USA_NYR', '', 1],
// 아시아·오세아니아
['KOR_JEO', 'KOR_ULS', '현대가 더비', 3], ['KOR_POH', 'KOR_ULS', '동해안 더비', 3], ['KOR_SEO', 'KOR_ANY', '연고지 더비', 3], ['KOR_JEO', 'KOR_SEO', '', 1],
['XJPN_GAMBAOSAKA', 'XJPN_CEREZOOSAKA', '오사카 더비', 3], ['XJPN_KAWASAKIFRONTA', 'XJPN_FCTOKYO', '타마가와 클라시코', 2], ['XJPN_KASHIMAANTLERS', 'XJPN_URAWAREDS', '', 2], ['XJPN_TOKYOVERDY', 'XJPN_FCTOKYO', '도쿄 더비', 2], ['XJPN_KASHIMAANTLERS', 'XJPN_KASHIWAREYSOL', '', 1],
['AUS_SYD', 'AUS_WSW', '시드니 더비', 3], ['AUS_MVC', 'AUS_MCY', '멜버른 더비', 3], ['AUS_ADE', 'AUS_MVC', '', 2], ['AUS_BRI', 'AUS_SYD', '', 1],
['KSA_HIL', 'KSA_NAS', '리야드 더비', 3], ['KSA_ITT', 'KSA_AHL', '제다 더비', 3], ['KSA_HIL', 'KSA_ITT', '', 2], ['KSA_NAS', 'KSA_SHB', '', 2], ['KSA_HIL', 'KSA_SHB', '', 2]
];
})(typeof window !== 'undefined' ? window : globalThis);
