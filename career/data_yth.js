// 빅클럽 유스 (FC27 데이터베이스에 없는 선수만 추가) — 2026/27 시즌, 2026년 11월 기준으로 확인된 선수만
// 명단 출처: UEFA 유스리그 2026/27 구단별 등록 명단(uefa.com, 2026년 11월), 맨유 U18 2026 명단, 2026/27 임대 목록
// 나이는 등록 명단 기준(출생 연도 확정, 월은 추정). 포지션은 명단의 GK/DF/MF/FW를 세부 포지션으로 나눈 것
// 능력치(OVR)·잠재력은 나이·소속 팀 수준으로 맞춘 추정치. 세부 능력치는 같은 포지션·비슷한 수준 FC27 선수를 틀로 만든다
// 행: 이름|포지션|구단|국적|출생 연-월|OVR|잠재력|주발
(function (G) {
const F = G.FC27; if (!F) return;
const TXT = `
Charlie Hardy|GK|ENG_MUN|ENG|2009-11|51|66|L
Jake Ford|GK|ENG_MUN|ENG|2009-02|57|74|R
Cameron Byrne-Hughes|GK|ENG_MUN|WAL|2008-04|59|74|R
Yuel Helafu|CB|ENG_MUN|ENG|2008-09|54|73|R
Daniel Armer|LB|ENG_MUN|SCO|2007-01|58|73|L
Albert Mills|RB|ENG_MUN|ENG|2008-08|53|66|L
Jacob Watson|CB|ENG_MUN|ENG|2009-10|53|77|R
Godwill Kukonki|CB|ENG_MUN|ENG|2008-01|58|81|R
Jayden Ngwashi|LB|ENG_MUN|ENG|2008-01|58|75|R
Jack Fletcher|DM|ENG_MUN|ENG|2007-08|64|84|R
Tyler Fletcher|CM|ENG_MUN|ENG|2007-02|61|75|R
Cristian Orozco|AM|ENG_MUN|COL|2008-04|59|80|R
Bendito Mantato|LB|ENG_MUN|ENG|2008-09|58|78|L
Jaume Camacho|AM|ENG_MUN|ESP|2009-11|56|71|R
Jariyah Shah|CM|ENG_MUN|ENG|2008-12|53|70|R
Jay McEvoy|DM|ENG_MUN|NIR|2008-07|57|76|R
Rafe McCormack|CB|ENG_MUN|IRL|2009-08|51|70|L
Amir Ibragimov|AM|ENG_MUN|ENG|2008-03|58|80|R
Jim Thwaites|CM|ENG_MUN|ENG|2008-03|57|75|R
Tynan Thompson|ST|ENG_MUN|ENG|2008-04|60|82|R
David Eze|RW|ENG_MUN|ENG|2010-05|52|74|R
Noah Ajayi|ST|ENG_MUN|GER|2009-06|56|68|R
Nathaniel-Junior Brown|LW|ENG_MUN|ENG|2009-03|56|83|L
Kai Rooney|ST|ENG_MUN|ENG|2008-12|56|69|R
JJ Gabriel|ST|ENG_MUN|ENG|2010-05|54|88|R
Jack Porter|GK|ENG_ARS|ENG|2008-05|57|80|R
Charlie Phillips|GK|ENG_ARS|ENG|2010-06|51|69|L
Brayden Clarke|ST|ENG_ARS|WAL|2007-01|58|76|R
Joshua Ogunnaike|RB|ENG_ARS|ENG|2008-11|57|79|R
Elijah Upson|CB|ENG_ARS|ENG|2008-09|59|81|R
Teshaun Murisa|AM|ENG_ARS|ENG|2007-12|58|68|R
Abraham Owusu-Gyasi|RB|ENG_ARS|ENG|2009-09|51|66|R
Hakeem Abubakar|RB|ENG_ARS|ENG|2009-02|58|77|R
Elyon Mbala|CB|ENG_ARS|ENG|2010-02|54|69|R
Marli Salmon|CB|ENG_ARS|ENG|2009-05|55|79|R
Ife Ibrahim|LW|ENG_ARS|ENG|2008-03|56|78|R
Theo Julienne|CM|ENG_ARS|ENG|2008-10|57|71|R
Maalik Hashi|CM|ENG_ARS|ENG|2008-09|53|67|R
Axel Donczew|CM|ENG_ARS|WAL|2009-08|51|67|L
Emerson Nwaneri|AM|ENG_ARS|ENG|2010-10|52|72|R
Andre Harriman-Annous|RW|ENG_ARS|ENG|2008-04|57|78|L
Ceadach O'Neill|RW|ENG_ARS|NIR|2008-03|60|80|R
Igor Tyjon|ST|ENG_ARS|ENG|2008-09|57|75|R
Mylo Bernard|ST|ENG_ARS|ENG|2010-05|52|70|R
Freddy Bernal|GK|ENG_CHE|ENG|2008-10|56|70|R
Toby Bell|GK|ENG_CHE|ENG|2009-10|51|77|R
Alfie Osborne|RB|ENG_CHE|SCO|2008-01|58|70|L
Dante Waite|CB|ENG_CHE|ENG|2008-09|54|67|R
Calvin Diakite|RB|ENG_CHE|ENG|2009-08|51|66|R
Isaac Silva|CB|ENG_CHE|POR|2010-10|53|75|R
Gabriel Sambou|CB|ENG_CHE|POL|2010-02|54|71|R
Riley Ebho|CB|ENG_CHE|ENG|2009-09|50|66|L
Yisa Alao|RB|ENG_CHE|ENG|2009-01|56|69|R
Jacob Hall|CB|ENG_CHE|ENG|2009-07|57|74|R
Landon Emenalo|CM|ENG_CHE|ENG|2008-01|55|75|R
Jacob Dako|CM|ENG_CHE|ENG|2011-09|49|72|R
Reggie Watson|CM|ENG_CHE|ENG|2010-11|52|66|L
Isaac McGillvary|CM|ENG_CHE|ENG|2010-07|51|71|R
Heze Grimwade|AM|ENG_CHE|ENG|2010-09|54|78|R
Sol Gordon|CM|ENG_CHE|ENG|2008-09|57|78|R
Chizaram Ezenwata|ST|ENG_CHE|ENG|2008-05|56|68|R
Mathis Eboue|AM|ENG_CHE|BEL|2008-12|57|77|R
Jashayde Greenwood|ST|ENG_CHE|ENG|2009-09|51|67|R
Ibrahim Rabbaj|CM|ENG_CHE|ENG|2009-06|54|67|R
Andrew Pennie|LW|ENG_CHE|ENG|2010-02|53|72|L
Ben Vickery|GK|ENG_MCI|ENG|2009-05|53|74|L
Max-Edgar Chabot|GK|ENG_MCI|FRA|2008-03|61|73|R
Kian Noble|CB|ENG_MCI|ENG|2007-01|61|68|R
Kaden Braithwaite|RW|ENG_MCI|ENG|2008-03|56|76|L
Leke Drake|CB|ENG_MCI|ENG|2008-05|55|67|R
Freddie Lawrie|RB|ENG_MCI|ENG|2009-05|56|70|R
Dante Headley|CB|ENG_MCI|ENG|2008-01|59|70|R
Marlow Barrett|CB|ENG_MCI|ENG|2009-04|55|75|L
Harrison Miles|DM|ENG_MCI|ENG|2008-08|55|67|L
Finlay Gorman|AM|ENG_MCI|ENG|2008-02|59|81|L
Xavier Parker|DM|ENG_MCI|ENG|2009-12|53|73|L
Kylan Midwood|ST|ENG_MCI|ENG|2008-06|56|67|R
Dexter Oliver|CM|ENG_MCI|ENG|2009-05|53|66|R
Darren Motsi|DM|ENG_MCI|ENG|2010-11|54|74|L
Ryan McAidoo|LW|ENG_MCI|ENG|2008-02|57|83|R
Timeo Whisker|ST|ENG_MCI|ENG|2008-01|56|75|L
Teddie Lamb|ST|ENG_MCI|ENG|2009-03|55|76|R
Brooklyn Nfonkeu|ST|ENG_MCI|ENG|2007-02|58|71|R
Hayden Smith|GK|ENG_LIV|ENG|2008-01|59|74|R
Bailey Hall|GK|ENG_LIV|ENG|2007-01|59|73|R
Matthew Wright|GK|ENG_LIV|ENG|2008-04|59|71|R
Isaiah Garin|CB|ENG_LIV|FRA|2008-02|56|72|R
Oliver O'Connor|CB|ENG_LIV|ENG|2008-02|60|82|R
Joseph Bradshaw|CB|ENG_LIV|ENG|2008-03|58|76|R
Charlie Huth|LB|ENG_LIV|ENG|2009-11|57|73|L
Lenix Conde|CB|ENG_LIV|ENG|2008-01|57|70|R
Mor Talla Ndiaye|RB|ENG_LIV|SEN|2008-09|54|67|L
DJ Esdaille|CB|ENG_LIV|ENG|2008-11|60|82|R
Prince Cisse|CB|ENG_LIV|WAL|2008-07|58|78|L
Hadyn Murray-Holme|DM|ENG_LIV|ENG|2007-04|57|72|R
AJ Yeguo|CM|ENG_LIV|POL|2009-01|56|73|R
Joseph Upton|CM|ENG_LIV|ENG|2007-09|59|81|R
Luca Eden|AM|ENG_LIV|ENG|2011-02|50|73|R
Ryan Cowley|CM|ENG_LIV|ENG|2008-07|55|67|R
Erik Farkas|CM|ENG_LIV|HUN|2009-09|55|77|R
Alvin Ayman|AM|ENG_LIV|ENG|2007-05|62|75|L
Ellis Hickman|DM|ENG_LIV|ENG|2009-10|51|70|R
Finn Inglethorpe|RW|ENG_LIV|ENG|2008-11|52|67|R
Will Wright|ST|ENG_LIV|ENG|2008-01|59|78|R
Josh Sonni-Lambie|ST|ENG_LIV|ENG|2007-08|57|74|R
Jikiemi Olamilekan|LW|ENG_LIV|SCO|2010-01|54|77|L
Guille Ponce|GK|ESP_RMA|ESP|2009-03|55|72|R
Álvaro Rodríguez|GK|ESP_RMA|ESP|2008-09|57|73|R
Mario Rivas|CB|ESP_RMA|ESP|2006-04|62|74|L
Guille González|LB|ESP_RMA|ESP|2008-05|61|74|L
Mateo Garrido|CB|ESP_RMA|ESP|2009-06|57|76|R
Léo Lemaître|RB|ESP_RMA|FRA|2009-11|58|77|L
Luis Paulo|LB|ESP_RMA|ESP|2008-07|61|74|L
Cherif Fofana|CM|ESP_RMA|ESP|2009-06|58|80|L
Diego Villalba|AM|ESP_RMA|ESP|2007-10|58|70|R
Carlos Díez|AM|ESP_RMA|ESP|2007-10|60|82|R
Andrés Corcoba|DM|ESP_RMA|ESP|2008-10|59|80|R
Adrián Pérez|CM|ESP_RMA|ESP|2008-08|59|75|R
Bryan Bugarín Gonçalves|CM|ESP_RMA|ESP|2008-04|60|74|L
José Luis Espinosa|CM|ESP_RMA|ESP|2008-10|61|74|R
Álvaro Rivera|CM|ESP_RMA|ESP|2009-01|58|76|R
Daniel Yáñez|RW|ESP_RMA|ESP|2007-03|60|78|L
Enzo Alves|ST|ESP_RMA|ESP|2009-07|54|70|R
Alexis Ciria|RW|ESP_RMA|ESP|2008-05|57|69|R
Fran Santamaría|ST|ESP_RMA|ESP|2008-10|61|81|L
Sergio Castellón|RW|ESP_RMA|ESP|2008-05|58|76|R
David Poder-Stiube|GK|GER_FCB|GER|2010-10|52|75|L
Leonard Ruland|GK|GER_FCB|GER|2008-06|61|79|R
Cassiano Kiala|RB|GER_FCB|GER|2009-09|55|71|R
Kim Do-yeon|CB|GER_FCB|KOR|2008-03|61|76|R
Adam El Chaar|CB|GER_FCB|GER|2009-08|55|76|R
Richard Ajayi|CB|GER_FCB|GER|2010-01|50|64|L
Rayan Moumouni|RB|GER_FCB|GER|2008-10|57|75|R
Allen Lambe|LB|GER_FCB|GER|2008-05|60|73|L
Filip Pavić|CB|GER_FCB|CRO|2010-10|54|77|R
Roko Mijatović|AM|GER_FCB|CRO|2008-04|61|81|R
David Santos Daiber|RW|GER_FCB|GER|2007-01|59|78|R
Matouš Srb|CM|GER_FCB|CZE|2009-10|54|68|R
Matteo Marić|CM|GER_FCB|AUT|2010-05|50|70|R
Erblin Osmani|CM|GER_FCB|KOS|2009-10|54|72|R
Guido Della Rovere|DM|GER_FCB|ITA|2007-01|62|68|R
Bohdan Olychenko|CM|GER_FCB|UKR|2007-04|62|84|R
Wisdom Imade|ST|GER_FCB|GER|2009-05|56|79|R
Michael Matošević|LW|GER_FCB|AUT|2007-09|59|72|L
Bastian Assomo|ST|GER_FCB|GER|2010-11|54|70|R
Yil Gashi|ST|GER_FCB|GER|2008-07|60|78|R
Frank Egwuatu|RW|GER_FCB|GER|2009-08|58|79|R
Noah Codjo-Evora|ST|GER_FCB|FRA|2007-08|62|83|L
Max Bonfill|GK|ESP_BAR|ESP|2007-06|62|75|R
Gerard Sala|GK|ESP_BAR|ESP|2008-05|58|71|L
Nil Teixidor|CB|ESP_BAR|ESP|2008-09|61|80|R
Pau Berges|CB|ESP_BAR|ESP|2009-08|55|70|R
Baba|CB|ESP_BAR|GUI|2008-03|56|70|R
Pesquer|CB|ESP_BAR|ESP|2009-03|58|76|L
Raúl Expósito|CB|ESP_BAR|ESP|2009-01|56|79|L
Joan Inglés|RB|ESP_BAR|ESP|2008-01|57|72|R
Lorenzo Oertli|CB|ESP_BAR|FRA|2008-03|57|70|R
Pol Bernabeu|CB|ESP_BAR|ESP|2008-06|60|72|L
Nicolás Marcipar|CB|ESP_BAR|ARG|2008-01|60|80|R
Michal|CM|ESP_BAR|ESP|2009-09|58|71|R
Nil Vicens|CM|ESP_BAR|ESP|2008-02|58|80|R
Ebrima Tunkara|CM|ESP_BAR|ESP|2010-09|52|76|R
Samuel Borniquel|DM|ESP_BAR|ESP|2010-02|54|73|L
Gorka Buil|CM|ESP_BAR|ESP|2010-10|50|74|R
Xavier Mirangels|CM|ESP_BAR|ESP|2009-06|58|74|L
Pedro Rodríguez|CM|ESP_BAR|ESP|2008-10|61|81|R
Joni Hernández|RW|ESP_BAR|ESP|2008-01|59|72|R
Hamza Abdelkarim|ST|ESP_BAR|EGY|2007-12|59|76|R
Iu Martínez|ST|ESP_BAR|ESP|2009-04|54|68|R
Óscar Gistau|ST|ESP_BAR|ESP|2008-05|58|71|R
Nuhu Fofana|LW|ESP_BAR|ESP|2008-04|61|74|L
Ajay Tavares|ST|ESP_BAR|ENG|2010-06|51|73|R
Adrián Guerrero|ST|ESP_BAR|ESP|2008-01|60|79|R
Roberto Tomás|ST|ESP_BAR|ESP|2008-01|57|75|R
Wisdom Mike|LW|BEL_CLB|GER|2008-02|57|78|R
Spike Brits|GK|ENG_MCI|ENG|2006-08|59|77|R
Elyh Harrison|GK|ENG_MUN|ENG|2005-02|61|74|R
Rory Finneran|CM|ENG_NEW|ENG|2008-02|55|75|R
Damola Ajayi|LW|ENG_TOT|ENG|2006-06|59|74|R
Keyrol Figueroa|ST|ENG_LIV|HON|2006-03|60|75|R
`;
// FC27 가치 곡선의 역함수: 잠재력이 의도한 값이 되도록 추정 가치를 정한다 (world.js valueOvr와 같은 곡선)
const VC = [[60, .2e6], [62, .3e6], [64, .5e6], [66, .8e6], [68, 1.5e6], [70, 2.1e6], [72, 3.6e6], [74, 5.6e6], [76, 11.1e6], [78, 16.3e6], [80, 26.9e6], [82, 41.7e6], [84, 64.8e6], [86, 68.1e6], [88, 80.2e6], [90, 82.9e6]];
const inv = o => { if (o <= 60) return .15e6; for (let i = 1; i < VC.length; i++) if (o <= VC[i][0]) { const [o0, v0] = VC[i - 1], [o1, v1] = VC[i]; return v0 * Math.pow(v1 / v0, (o - o0) / (o1 - o0)); } return 83e6 * Math.pow(1.6, o - 90); };
const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]/g, '');
const have = new Set(F.P.map(p => fold(p[1]) + '|' + (2000 + Math.floor(p[9] / 365.25))));
const seen = k => { const [n, y] = k.split('|'); return have.has(k) || have.has(n + '|' + (+y - 1)) || have.has(n + '|' + (+y + 1)); };
const FAMK = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const START = Date.UTC(2026, 7, 1), D0 = Date.UTC(2000, 0, 1);
// 같은 포지션 FC27 선수 중 비슷한 OVR (60~70대 젊은 선수) 를 틀로 삼는다
const tpl = {}; for (const p of F.P) { if (p[11] < 60 || p[11] > 70 || !p[13]) continue; (tpl[p[2]] = tpl[p[2]] || []).push(p); }
F.EXTRA = F.EXTRA || []; F.YTH = [];
let k = 0;
const REMAP = {}; // U19 명단은 1군 구단 유스로 둔다 (2군 명단과 따로 관리)
const ALL = TXT.trim().split('\n').map(l => l.split('|')), CURN = ALL.length;
// 구단당 상한 30명 (명단 순서대로)
const byClub = {}; ALL.forEach((r, ix) => { const cl = REMAP[r[2]] || r[2]; (byClub[cl] = byClub[cl] || []).push([ix, r]); });
const pick = [];
for (const cl in byClub) { const L = byClub[cl].sort((a, b) => (a[0] < CURN ? 0 : 1) - (b[0] < CURN ? 0 : 1) || (a[0] < CURN ? a[0] - b[0] : +b[1][6] - +a[1][6])); const cap = 30; let n = 0; for (const [ix, r] of L) { if (n >= cap) break; pick.push([ix, r, cl]); n++; } }
pick.sort((a, b) => a[0] - b[0]);
for (const [, r, club] of pick) {
  const [name, pos, , nat, ym, o, pt, foot] = r; if (!name) continue; const yk = fold(name) + '|' + ym.slice(0, 4); if (seen(yk)) continue; have.add(yk);
  const ovr = +o, pot = +pt, [y, m] = ym.split('-').map(Number), bd = Math.round((Date.UTC(y, m - 1, 15) - D0) / 864e5);
  const age = Math.floor((START - Date.UTC(y, m - 1, 15)) / (365.25 * 864e5));
  const vOvr = pot - Math.max(0, 23 - age) * 1.35;
  const L = tpl[pos] || tpl.CM, t = L[(name.length * 7 + k * 13) % L.length], d = ovr - t[11];
  const stats = t[13].split('').map((ch, i) => { const v = ch.charCodeAt(0) - 32; const isGk = i >= 28; const nv = pos === 'GK' ? (isGk ? v + d : v) : (isGk ? v : v + d); return String.fromCharCode(Math.max(33, Math.min(126, Math.round(nv) + 32))); }).join('');
  const i = F.P.length;
  F.P.push([910000 + k, name, pos, 1 << Math.max(0, FAMK.indexOf(pos)), -1, nat, foot || 'R', 3, pos === 'GK' ? 1 : 3, bd, 0, ovr, Math.round(inv(vOvr)), stats]);
  F.EXTRA.push({ i, club, ct: 3 }); F.YTH.push(i); k++;
}
// 2군(B팀): [id, 이름, 약칭, 1군 구단, 리그] — 실제로 그 나라 3부 이내 리그에서 뛰는 2군
F.BTEAMS = [
  ['ESP_RMC', '레알 마드리드 카스티야', 'RMC', 'ESP_RMA', 'XESP3', 'Real Madrid Castilla'], ['ESP_ATB', '아틀레티코 마드릴레뇨', 'ATB', 'ESP_ATM', 'XESP3', 'Atlético Madrileño'],
  ['ESP_BAB', '바르셀로나 아틀레틱', 'BAB', 'ESP_BAR', 'XESP3B', 'Barcelona Atlètic'], ['ESP_VIB', '비야레알 B', 'VIB', 'ESP_VIL', 'XESP3B', 'Villarreal B'],
  ['POR_SLBB', '벤피카 B', 'SLB-B', 'POR_SLB', 'XPOR2', 'Benfica B'], ['POR_FCPB', 'FC 포르투 B', 'FCP-B', 'POR_FCP', 'XPOR2', 'FC Porto B'],
  ['NED_JAJA', '용 아약스', 'JAJ', 'NED_AJA', 'XNED2', 'Jong Ajax'], ['NED_JPSV', '용 PSV', 'JPSV', 'NED_PSV', 'XNED2', 'Jong PSV'], ['NED_JAZ', '용 AZ', 'JAZ', 'NED_AZ', 'XNED2', 'Jong AZ'], ['NED_JUTR', '용 위트레흐트', 'JUTR', 'NED_UTR', 'XNED2', 'Jong FC Utrecht'],
  ['BEL_NXT', '클럽 NXT', 'NXT', 'BEL_CLB', 'XBEL2', 'Club NXT'], ['BEL_RSCF', 'RSCA 퓨처스', 'RSCF', 'BEL_AND', 'XBEL2', 'RSCA Futures'], ['BEL_JGNK', '용 헹크', 'JGNK', 'BEL_GNK', 'XBEL2', 'Jong Genk'],
  ['ITA_ATAU', '아탈란타 U23', 'ATA23', 'ITA_ATA', 'XITA3C', 'Atalanta U23'], ['ITA_INTU', '인테르 U23', 'INT23', 'ITA_INT', 'XITA3C', 'Inter U23'],
  ['AUT_LIEF', 'FC 리퍼링', 'LIEF', 'AUT_RBS', 'XAUT2B', 'FC Liefering']
];
})(typeof window !== 'undefined' ? window : globalThis);
