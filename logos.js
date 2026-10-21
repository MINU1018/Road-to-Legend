// 터치라인 커리어 — 로고 팩: 사용자가 올린 PNG/ZIP을 구단·국가대표와 이름으로 매칭해 브라우저에 저장
(function (G) {
'use strict';
const C = G.TC;
const L = C.logos = { map: {}, n: 0 };

// 국가 코드 → 영어 이름 (football-logos.cc 파일명과 맞추기 위함, | 로 별칭)
const NAT_EN = {
  AFG: 'afghanistan', ALB: 'albania', ALG: 'algeria', AND: 'andorra', ANG: 'angola', ARG: 'argentina', ARM: 'armenia', ATG: 'antigua and barbuda', AUS: 'australia', AUT: 'austria', AZE: 'azerbaijan', BAN: 'bangladesh', BDI: 'burundi', BEL: 'belgium', BEN: 'benin', BER: 'bermuda', BFA: 'burkina faso', BIH: 'bosnia and herzegovina|bosnia herzegovina|bosnia', BLR: 'belarus', BOL: 'bolivia', BRA: 'brazil', BRB: 'barbados', BUL: 'bulgaria', CAN: 'canada', CGO: 'congo|republic of congo|congo brazzaville', CHA: 'chad', CHI: 'chile', CHN: 'china|china pr', CIV: 'ivory coast|cote divoire|cote d ivoire', CMR: 'cameroon', COD: 'dr congo|congo dr|democratic republic of congo', COL: 'colombia', COM: 'comoros', CPV: 'cape verde|cabo verde', CRC: 'costa rica', CRO: 'croatia', CTA: 'central african republic', CUB: 'cuba', CUW: 'curacao', CYP: 'cyprus', CZE: 'czech republic|czechia', DEN: 'denmark', DOM: 'dominican republic', ECU: 'ecuador', EGY: 'egypt', ENG: 'england', EQG: 'equatorial guinea', ERI: 'eritrea', ESP: 'spain', EST: 'estonia', FIN: 'finland', FRA: 'france', FRO: 'faroe islands', GAB: 'gabon', GAM: 'gambia', GEO: 'georgia', GER: 'germany', GHA: 'ghana', GIB: 'gibraltar', GLP: 'guadeloupe', GNB: 'guinea bissau', GRE: 'greece', GRN: 'grenada', GUA: 'guatemala', GUF: 'french guiana', GUI: 'guinea', GUY: 'guyana', HAI: 'haiti', HKG: 'hong kong', HON: 'honduras', HUN: 'hungary', IDN: 'indonesia', IND: 'india', IRL: 'ireland|republic of ireland', IRN: 'iran', IRQ: 'iraq', ISL: 'iceland', ISR: 'israel', ITA: 'italy', JAM: 'jamaica', JOR: 'jordan', JPN: 'japan', KAZ: 'kazakhstan', KEN: 'kenya', KOR: 'south korea|korea republic|korea', KOS: 'kosovo', KSA: 'saudi arabia', LBN: 'lebanon', LBR: 'liberia', LBY: 'libya', LCA: 'saint lucia', LIE: 'liechtenstein', LTU: 'lithuania', LUX: 'luxembourg', LVA: 'latvia', MAD: 'madagascar', MAR: 'morocco', MDA: 'moldova', MEX: 'mexico', MKD: 'north macedonia|macedonia', MLI: 'mali', MLT: 'malta', MNE: 'montenegro', MOZ: 'mozambique', MRI: 'mauritius', MSR: 'montserrat', MTN: 'mauritania', MTQ: 'martinique', MWI: 'malawi', NAM: 'namibia', NCL: 'new caledonia', NED: 'netherlands|holland|dutch', NGA: 'nigeria', NIG: 'niger', NIR: 'northern ireland', NOR: 'norway', NZL: 'new zealand', OMA: 'oman', PAK: 'pakistan', PAN: 'panama', PAR: 'paraguay', PER: 'peru', PHI: 'philippines', PLE: 'palestine', POL: 'poland', POR: 'portugal|portuguese', PRK: 'north korea|korea dpr', PUR: 'puerto rico', QAT: 'qatar', ROU: 'romania', RSA: 'south africa', RUS: 'russia', RWA: 'rwanda', SCO: 'scotland', SDN: 'sudan', SEN: 'senegal', SKN: 'saint kitts and nevis', SLE: 'sierra leone', SLV: 'el salvador', SOM: 'somalia', SRB: 'serbia', SRI: 'sri lanka', STP: 'sao tome and principe', SUI: 'switzerland', SUR: 'suriname', SVK: 'slovakia', SVN: 'slovenia', SWE: 'sweden', SYR: 'syria', TAN: 'tanzania', THA: 'thailand', TOG: 'togo', TPE: 'chinese taipei|taiwan', TRI: 'trinidad and tobago', TUN: 'tunisia', TUR: 'turkey|turkiye', UAE: 'united arab emirates|uae', UGA: 'uganda', UKR: 'ukraine', URU: 'uruguay', USA: 'united states|usa|usmnt', UZB: 'uzbekistan', VAN: 'vanuatu', VEN: 'venezuela', WAL: 'wales', YEM: 'yemen', ZAM: 'zambia', ZIM: 'zimbabwe'
};
L.NAT_EN = NAT_EN;
// 구단 ID 접두어 → 폴더(국가) 이름
const CLUBCOUNTRY = { ENG: 'england', ESP: 'spain', ITA: 'italy', GER: 'germany', FRA: 'france', POR: 'portugal|portuguese', NED: 'netherlands', BEL: 'belgium', SCO: 'scotland', TUR: 'turkey|turkiye', AUT: 'austria', SUI: 'switzerland', DEN: 'denmark', POL: 'poland', ROU: 'romania', SWE: 'sweden', NOR: 'norway', IRL: 'ireland', KSA: 'saudi arabia', USA: 'usa|united states|canada', ARG: 'argentina', MEX: 'mexico', KOR: 'south korea|korea', CHN: 'china', AUS: 'australia|new zealand', IND: 'india', GRE: 'greece', CZE: 'czech republic|czechia', UKR: 'ukraine', CRO: 'croatia', CYP: 'cyprus', THA: 'thailand', HUN: 'hungary', COL: 'colombia', UAE: 'united arab emirates|uae', FIN: 'finland', BRA: 'brazil', AZE: 'azerbaijan', BUL: 'bulgaria', BOL: 'bolivia', ECU: 'ecuador', PAR: 'paraguay', CHI: 'chile', PER: 'peru', VEN: 'venezuela', URU: 'uruguay' };
// 이름만으로 안 맞는 구단의 별칭 (FC 표기 → 실제 이름)
const ALIAS = {
  ENG_MUN: 'manchester united', ENG_NEW: 'newcastle united', ENG_NFO: 'nottingham forest', ENG_TOT: 'tottenham hotspur|tottenham', ENG_WOL: 'wolverhampton wanderers|wolverhampton', ENG_WBA: 'west bromwich albion', ENG_WHU: 'west ham united', ENG_BHA: 'brighton hove albion|brighton', ENG_SHU: 'sheffield united', ENG_SHW: 'sheffield wednesday', ENG_CHA: 'charlton athletic', ENG_MKD: 'milton keynes dons|mk dons', ENG_QPR: 'queens park rangers', ENG_IPS: 'ipswich town', ENG_NOR: 'norwich city', ENG_PNE: 'preston north end', ENG_BOL: 'bolton wanderers', ENG_CAM: 'cambridge united', ENG_DON: 'doncaster rovers', ENG_HUD: 'huddersfield town', ENG_PET: 'peterborough united', ENG_STE: 'stevenage', ENG_STO: 'stockport county', ENG_WYC: 'wycombe wanderers', ENG_ACC: 'accrington stanley', ENG_COL: 'colchester united', ENG_NTC: 'northampton town', ENG_ROT: 'rotherham united', ENG_SHR: 'shrewsbury town', ENG_BOU: 'bournemouth|afc bournemouth', ENG_LEI: 'leicester city',
  ESP_ATH: 'athletic bilbao|athletic club', ESP_ATM: 'atletico madrid|atletico de madrid', ESP_CEL: 'celta vigo|celta', ESP_ALA: 'alaves|deportivo alaves', ESP_RAC: 'racing santander|racing', ESP_DEP: 'deportivo la coruna|deportivo', ESP_ESP: 'espanyol', ESP_BET: 'real betis|betis', ESP_OSA: 'osasuna', ESP_BAR: 'barcelona|fc barcelona', ESP_OVI: 'real oviedo|oviedo', ESP_SPG: 'sporting gijon|real sporting', ESP_VLL: 'real valladolid|valladolid', ESP_MLL: 'mallorca|rcd mallorca',
  ESP_RSB: 'real sociedad', ESP_CEB: 'celta', GER_TSG2: 'hoffenheim', GER_VFB2: 'stuttgart', ITA_SUD: 'sudtirol|suditrol', ARG_PLA: 'platense|platanense', BEL_OHL: 'oud heverlee leuven|oh leuven', TUR_AMD: 'amed|amedspor', ARG_AAE: 'estudiantes de rio cuarto', ECU_BSC: 'barcelona guayaquil',
  ITA_LAZ: 'lazio|ss lazio', ITA_ATA: 'atalanta', ITA_INT: 'inter|inter milan|internazionale', ITA_MIL: 'ac milan|milan', ITA_ROM: 'roma|as roma', ITA_NAP: 'napoli|ssc napoli', ITA_VER: 'hellas verona|verona', ITA_VIC: 'vicenza', ITA_JST: 'juve stabia',
  GER_KOE: 'koln|fc koln|cologne', GER_M05: 'mainz|mainz 05', GER_FCB: 'bayern munchen|bayern munich|bayern', GER_S04: 'schalke|schalke 04', GER_SGE: 'eintracht frankfurt|frankfurt', GER_HSV: 'hamburger sv|hamburg', GER_B04: 'bayer leverkusen|leverkusen', GER_BMG: 'borussia monchengladbach|monchengladbach|gladbach', GER_RBL: 'rb leipzig', GER_SCF: 'freiburg', GER_SVW: 'werder bremen', GER_TSG: 'hoffenheim', GER_FCU: 'union berlin', GER_VFB: 'stuttgart|vfb stuttgart', GER_FCN: 'nurnberg|nuremberg', GER_DSC: 'arminia bielefeld', GER_SGF: 'greuther furth|furth', GER_F95: 'fortuna dusseldorf|dusseldorf', GER_AAC: 'alemannia aachen', GER_WAL: 'waldhof mannheim', GER_FCS: 'saarbrucken',
  FRA_OL: 'lyon|olympique lyonnais', FRA_OM: 'marseille|olympique de marseille', FRA_PSG: 'paris saint germain|psg', FRA_LIL: 'lille', FRA_HAC: 'le havre', FRA_BRS: 'brest|stade brestois', FRA_REN: 'rennes|stade rennais', FRA_RCS: 'strasbourg', FRA_ASM: 'monaco|as monaco', FRA_NIC: 'nice|ogc nice', FRA_ASSE: 'saint etienne', FRA_GUI: 'guingamp', FRA_REI: 'reims|stade de reims', FRA_DIJ: 'dijon', FRA_TRO: 'troyes',
  POR_SLB: 'benfica', POR_SCP: 'sporting|sporting cp|sporting lisbon', POR_FCP: 'porto|fc porto', POR_SCB: 'braga|sc braga', POR_VSC: 'vitoria guimaraes|vitoria sc', POR_MAR: 'maritimo',
  NED_AZ: 'az alkmaar|az', NED_PSV: 'psv eindhoven|psv', NED_NEC: 'nec nijmegen|nec', NED_HEE: 'heerenveen', NED_GAE: 'go ahead eagles',
  BEL_USG: 'union saint gilloise|union sg', BEL_STV: 'sint truiden|stvv', BEL_CHA: 'charleroi', BEL_STL: 'standard liege', BEL_ANT: 'royal antwerp|antwerp', BEL_GNT: 'gent|kaa gent', BEL_GNK: 'genk|krc genk',
  SCO_HEA: 'heart of midlothian|hearts', SCO_SJ: 'st johnstone', SCO_SM: 'st mirren',
  USA_NYR: 'new york red bulls|red bulls', USA_SJ: 'san jose earthquakes', USA_SEA: 'seattle sounders', USA_SKC: 'sporting kansas city', USA_NE: 'new england revolution', USA_PHI: 'philadelphia union', USA_VAN: 'vancouver whitecaps', USA_LAFC: 'los angeles fc|lafc', USA_MIA: 'inter miami', USA_STL: 'st louis city',
  KOR_ULS: 'ulsan hd|ulsan hyundai|ulsan', KOR_JEO: 'jeonbuk hyundai motors|jeonbuk', KOR_POH: 'pohang steelers|pohang',
  AUS_MV: 'melbourne victory', AUS_WSW: 'western sydney wanderers', AUS_WP: 'wellington phoenix', AUS_CCM: 'central coast mariners',
  ARG_ARJ: 'argentinos juniors', ARG_NOB: 'newells old boys', ARG_VEL: 'velez sarsfield', ARG_GLP: 'gimnasia la plata', ARG_DYJ: 'defensa y justicia', ARG_IRV: 'independiente rivadavia', ARG_RIE: 'deportivo riestra',
  MEX_ASL: 'atletico san luis', MEX_LEO: 'leon|club leon', MEX_JUA: 'juarez|fc juarez', MEX_QRO: 'queretaro', MEX_GDL: 'guadalajara|chivas', MEX_TIG: 'tigres|tigres uanl', MEX_PUM: 'pumas unam|pumas', MEX_AME: 'club america|america',
  GRE_OLY: 'olympiacos', GRE_PAOK: 'paok', CZE_PLZ: 'viktoria plzen', BUL_LUD: 'ludogorets', AZE_QAR: 'qarabag', COL_NAC: 'atletico nacional', COL_MED: 'independiente medellin', COL_STF: 'independiente santa fe', ECU_IDV: 'independiente del valle', ECU_LDU: 'ldu quito', CHI_UC: 'universidad catolica', URU_NAC: 'nacional montevideo|nacional', URU_PEN: 'penarol'
};
// 이름이 흔한 단어뿐이거나 파일명에 오타가 있는 구단: 파일 이름을 직접 지정 (폴더 국가가 맞아야 함)
const EXACT = { ESP_ATH: 'athletic-club', ESP_RAC: 'racing', ESP_SPG: 'sporting-gijon', ARG_ARJ: 'argeninos-juniors', ARG_IND: 'independiente', ARG_RAC: 'racing-club', ARG_UNI: 'union', ARG_PLA: 'club-atletico-platanense', ARG_AAE: 'estudiantes-de-rio-cuarto', ARG_EST: 'estudiantes-de-la-plata', ARG_GLP: 'gimnasia-lp', ARG_GME: 'gimnasia-y-esgrima', ARG_HUR: 'ca-huracan', ARG_INS: 'instituto-cordoba', POR_NAC: 'nacional-da-madeira', POR_SCP: 'sporting-cp', ROU_DIN: 'dinamo-bucuresti', ROU_RAP: 'rapid-bucuresti', ROU_UCL: 'u-cluj', ROU_UCR: 'u-craiova', ROU_CFR: 'cfr-cluj', FRA_LAV: 'stade-lavallois', BEL_OHL: 'oud-heverlee-leuven', BEL_USG: 'union-saint-gilloise', ITA_SUD: 'suditrol', TUR_AMD: 'amed', GER_FCU: 'union-berlin', USA_PHI: 'philadelphia-union', USA_SKC: 'sporting-kansas-city', USA_COL: 'colorado-rapids' };
L.EXACT = EXACT;
const STOP = new Set(['fc', 'afc', 'cf', 'sc', 'ac', 'as', 'club', 'de', 'del', 'la', 'le', 'the', 'cd', 'ud', 'sd', 'rcd', 'rc', 'sv', 'vfl', 'vfb', 'tsv', 'tsg', 'fk', 'sk', 'if', 'bk', 'ss', 'ssc', 'us', 'cp', 'sl', 'kv', 'krc', 'kaa', 'calcio', 'football', 'futbol', 'fussball', 'logo', 'png', 'svg', 'national', 'team', 'nt', 'association', 'federation', 'fa', 'footballclub', 'and', 'y', 'da', 'do', 'di', 'png', 'r', 'cfc', 'white', 'monochrome', 'black', 'text', 'no']);
function norm(str) {
  return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/ı/g, 'i').replace(/['’`.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
const ABBR = { utd: 'united', ath: 'athletic', wed: 'wednesday', man: 'manchester', nottm: 'nottingham', melb: 'melbourne', well: 'wellington', ind: 'independiente', dep: 'deportivo', jrs: 'juniors', univ: 'universitatea', uni: 'universidad', atl: 'atletico', sp: 'sporting', st: 'saint', indep: 'independiente', mgladbach: 'monchengladbach' };
function toks(str) { return norm(str).split(' ').map(t => ABBR[t] || t).join(' ').split(' ').filter(t => t && !STOP.has(t)); }
const GENERIC = new Set(['city', 'united', 'athletic', 'athletico', 'atletico', 'real', 'sporting', 'sport', 'inter', 'dynamo', 'dinamo', 'deportivo', 'olympique', 'rapid', 'union', 'saint', 'racing', 'nacional', 'academica', 'independiente', 'universidad', 'universitatea', 'america', 'santos', 'juventud', 'juventude', 'county', 'town', 'rovers', 'wanderers', 'albion', 'fortuna', 'borussia', 'eintracht', 'hertha', 'victoria', 'viktoria', 'royal', 'stade', 'red', 'bull', 'bulls', 'young', 'boys', 'new', 'north', 'south', 'west', 'east', 'old', 'central', 'cf', 'esporte', 'clube', 'spor', 'kulubu', 'sk', 'fc', 'women']);
function score(a, b) {
  if (!a.length || !b.length) return 0;
  const hitT = (x, y) => y.some(u => u === x || (x.length >= 5 && u.length >= 5 && (u.startsWith(x) || x.startsWith(u))));
  const ha = a.filter(t => hitT(t, b)), hb = b.filter(t => hitT(t, a));
  const ca = ha.length / a.length, cb = hb.length / b.length;
  if (ca < 1 && cb < 1) return 0; // 한쪽 이름이 다른 쪽에 완전히 들어가야 한다
  if (!ha.some(t => !GENERIC.has(t))) return 0; // 흔한 단어만 겹치면 같은 구단으로 보지 않음
  return (ca + cb) / 2 + (a.join('') === b.join('') ? .5 : 0);
}
// 파일 경로 → {base 토큰, 폴더 문자열}
function fileInfo(path) {
  const parts = path.replace(/\\/g, '/').split('/');
  let base = parts.pop().replace(/\.(png|svg|webp|jpe?g)$/i, '').replace(/\.football-logos\.cc$/i, '').replace(/\.[0-9a-f]{6,10}$/i, '').replace(/--.*$/, '');
  const dir = norm(parts.join(' ').replace(/football-logos\.cc/g, ''));
  return { base, t: toks(base), dir, natTeam: /national-team|federation|association|world-cup|nations-league/i.test(path) };
}
// 후보 목록 만들기: 구단 + 국가
function targets(w) {
  const out = [];
  for (const id in w.clubs) {
    const c = w.clubs[id];
    const names = [c.en, c.name].concat((ALIAS[id] || '').split('|').filter(Boolean));
    out.push({ key: id, names: names.map(toks).filter(x => x.length), country: CLUBCOUNTRY[id.split('_')[0]] || '', club: true });
  }
  for (const code in NAT_EN) out.push({ key: 'NAT_' + code, names: NAT_EN[code].split('|').map(toks), country: '', club: false });
  return out;
}
L.match = function (w, files) {
  const tg = targets(w), pairs = [];
  const infos = files.map(f => Object.assign(fileInfo(f.path), { f }));
  const ALLC = Object.values(CLUBCOUNTRY).join('|').split('|').concat(['brazil', 'russia', 'english']);
  const UEFAC = /\b(ucl|champions league|europa|conference|nations league)\b/;
  for (const fi of infos) {
    const dirCountries = ALLC.filter(c => (' ' + fi.dir + ' ').includes(' ' + c + ' ') || fi.dir.startsWith(c + ' '));
    for (const t of tg) {
      if (t.club && fi.natTeam) continue; // 국가대표 파일은 구단에 쓰지 않음
      if (!t.club && !fi.natTeam && /national|federation/.test(fi.base) === false && fi.dir) continue;
      const pre = t.key.split('_')[0];
      if (t.club && dirCountries.length) { const mine = (t.country || '').split('|').concat(pre === 'ENG' ? ['english'] : []); if (!dirCountries.some(c => mine.includes(c))) continue; }
      if (t.club && UEFAC.test(fi.dir) && C.confOf && C.confOf(pre === 'KSA' ? 'KSA' : pre) !== 'UEFA') continue;
      let best = 0;
      for (const nm of t.names) best = Math.max(best, score(nm, fi.t));
      if (best < .5) continue;
      if (t.country && t.country.split('|').some(c => fi.dir.includes(c))) best += .25;
      if (!t.club && fi.natTeam) best += .3;
      pairs.push([best, t.key, fi]);
    }
  }
  for (const key in EXACT) {
    const pre = key.split('_')[0], cc = (CLUBCOUNTRY[pre] || '').split('|');
    const fi = infos.find(f => f.base.toLowerCase() === EXACT[key] && cc.some(c => c && f.dir.includes(c))) || infos.find(f => f.base.toLowerCase() === EXACT[key] && !/brazil|russia/.test(f.dir));
    if (fi) pairs.push([10, key, fi]);
  }
  const NOMATCH = new Set(['AUT_SCA']);
  for (let i = pairs.length - 1; i >= 0; i--) if (NOMATCH.has(pairs[i][1])) pairs.splice(i, 1);
  pairs.sort((a, b) => b[0] - a[0]);
  const used = new Set(), got = {};
  for (const [s, key, fi] of pairs) { if (got[key] || used.has(fi.f.path)) continue; got[key] = fi.f; used.add(fi.f.path); }
  return { got, unmatched: infos.filter(fi => !used.has(fi.f.path)).map(fi => fi.f.path) };
};
// 이미지 → 작은 PNG data URL
L.shrink = async function (blob, size = 96) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const k = Math.min(size / img.width, size / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return cv.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
};
// 내장 로고 팩(logos_pack.js) 위에 사용자가 올린 로고(L.map)를 덮어쓴다
L.pack = G.TC_LOGOPACK || {};
L.urls = (G.TC_EXT && G.TC_EXT.logo) || {};
L.urlOK = false; // 외부 로고 서버를 불러올 수 있는 환경(예: Vercel 배포본)인지 시작할 때 한 번 확인
L.probe = function (cb) {
  const any = L.urls.ENG_ARS || Object.values(L.urls)[0]; if (!any || typeof Image === 'undefined') return;
  const img = new Image(); let done = false;
  const fin = ok => { if (done) return; done = true; L.urlOK = ok; if (ok && cb) cb(); };
  img.onload = () => fin(true); img.onerror = () => fin(false); setTimeout(() => fin(false), 5000);
  img.src = any;
};
L.get = key => L.map[key] || L.pack[key] || (L.urlOK && L.urls[key]) || null;
L.club = id => L.get(id);
L.nat = code => L.get('NAT_' + code);
L.packCount = () => Object.keys(L.pack).length;
})(typeof window !== 'undefined' ? window : globalThis);
