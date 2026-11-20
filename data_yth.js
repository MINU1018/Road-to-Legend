// 빅클럽 유스·유망주 (FC27 데이터베이스에 없는 선수만 추가). 2025/26 시즌까지 보도된 소속·출생 연도 기준
// 명단 출처: 각 구단 U21·U18(아카데미) 위키백과 명단 (2025/26, 2026년 3월 기준), 구단 발표. 출생 연도가 없는 선수는 소속 연령대로 추정
// 능력치(OVR)·잠재력은 나이·소속 팀 내 위치·평가를 바탕으로 맞춘 추정치. 세부 능력치는 같은 포지션·비슷한 수준 FC27 선수를 바탕으로 만든다
// 행: 이름|포지션|구단|국적|출생 연-월|OVR|잠재력|주발
(function (G) {
const F = G.FC27; if (!F) return;
const TXT = `
Bendito Mantato|LB|ENG_MUN|ENG|2007-09|60|79|L
Godwill Kukonki|CB|ENG_MUN|ENG|2008-01|58|81|R
Sekou Koné|CM|ENG_MUN|MLI|2005-12|62|80|R
JJ Gabriel|ST|ENG_MUN|ENG|2010-05|54|88|R
Jim Thwaites|CM|ENG_MUN|ENG|2007-03|59|76|R
Habeeb Ogunneye|CB|ENG_MUN|ENG|2007-01|59|76|R
Elyh Harrison|GK|ENG_MUN|ENG|2005-02|61|74|R
Gabriele Biancheri|ST|ENG_MUN|ITA|2005-03|61|74|R
Ethan Williams|RW|ENG_MUN|ENG|2006-02|60|75|L
Jack Moorhouse|CM|ENG_MUN|ENG|2006-03|61|76|R
James Nolan|CB|ENG_MUN|IRL|2006-02|60|74|L
Amir Ibragimov|AM|ENG_MUN|ENG|2008-03|58|80|R
Daniel Armer|LB|ENG_MUN|ENG|2007-01|58|73|L
Jaydan Kamason|RB|ENG_MUN|ENG|2006-08|59|74|R
Max Dowman|AM|ENG_ARS|ENG|2009-12|62|90|L
Andre Harriman-Annous|RW|ENG_ARS|ENG|2007-04|59|79|L
Brayden Clarke|ST|ENG_ARS|WAL|2007-01|58|76|R
Ismeal Kabia|LW|ENG_ARS|ENG|2006-09|60|76|R
Josh Nichols|RB|ENG_ARS|ENG|2006-02|61|76|R
Jack Porter|GK|ENG_ARS|ENG|2008-05|57|80|R
Marli Salmon|CB|ENG_ARS|ENG|2008-05|57|80|R
Ife Ibrahim|LW|ENG_ARS|ENG|2008-03|56|78|R
Michal Rosiak|CB|ENG_ARS|POL|2008-01|56|77|L
Khari Ranson|LB|ENG_ARS|ENG|2006-03|59|73|L
Alexei Rojas|LW|ENG_ARS|COL|2005-09|61|72|L
Shumaira Mheuka|ST|ENG_CHE|ENG|2008-10|60|81|R
Reggie Walsh|CM|ENG_CHE|ENG|2008-04|59|83|R
Jesse Derry|LW|ENG_CHE|ENG|2007-07|59|79|R
Kiano Dyer|CM|ENG_CHE|ENG|2006-12|61|76|R
Leo Castledine|AM|ENG_CHE|ENG|2005-10|62|74|L
Harrison Murray-Campbell|CM|ENG_CHE|ENG|2006-06|60|75|R
Genesis Antwi|RW|ENG_CHE|ENG|2007-01|58|75|L
Ishé Samuels-Smith|LB|ENG_CHE|ENG|2006-06|61|75|L
Frankie Runham|ST|ENG_CHE|ENG|2007-09|57|74|R
Ryan Kavuma-McQueen|RW|ENG_CHE|ENG|2008-02|56|77|R
Landon Emenalo|CM|ENG_CHE|USA|2007-01|57|76|R
Divine Mukasa|AM|ENG_MCI|ENG|2007-08|61|80|L
Stephen Mfuni|CB|ENG_MCI|ENG|2008-02|57|80|R
Ryan McAidoo|LW|ENG_MCI|ENG|2008-02|57|83|R
Kaden Braithwaite|RW|ENG_MCI|ENG|2007-03|58|77|L
Justin Oboavwoduo|ST|ENG_MCI|ENG|2006-02|60|75|R
Reigan Heskey|LW|ENG_MCI|ENG|2007-12|58|76|R
Jaden Heskey|ST|ENG_MCI|ENG|2005-06|61|73|R
Christian McFarlane|LB|ENG_MCI|ENG|2007-01|60|79|L
Jacob Wright|CM|ENG_MCI|ENG|2005-10|61|73|R
Max Alleyne|CB|ENG_MCI|ENG|2005-07|63|76|R
Kieran Morrison|RW|ENG_LIV|NIR|2006-04|60|76|L
Amara Nallo|CB|ENG_LIV|ENG|2006-11|61|77|R
Wellity Lucky|CB|ENG_LIV|ENG|2006-02|60|75|R
Keyrol Figueroa|ST|ENG_LIV|HON|2006-03|60|75|R
Tommy Pilling|CM|ENG_LIV|ENG|2007-03|58|76|R
Isaac Mabaya|RB|ENG_LIV|ENG|2004-09|61|71|R
Armin Pécsi|GK|ENG_LIV|HUN|2005-02|62|76|R
Jun'ai Byfield|CM|ENG_TOT|ENG|2007-01|58|76|R
Malachi Hardy|CB|ENG_TOT|ENG|2007-02|57|75|L
Callum Olusesi|CM|ENG_TOT|ENG|2006-03|60|74|R
Luca Williams-Barnett|AM|ENG_TOT|ENG|2005-06|61|73|R
Damola Ajayi|LW|ENG_TOT|ENG|2006-06|59|74|R
Rio Kyerematen|AM|ENG_TOT|ENG|2006-02|59|73|R
Sean Neave|ST|ENG_NEW|ENG|2007-04|59|77|R
Park Seung-soo|LW|ENG_NEW|KOR|2007-03|58|75|R
Harry Howell|AM|ENG_BHA|ENG|2008-05|58|79|L
Toni Fernández|LW|ESP_BAR|ESP|2008-01|60|83|R
Dro Fernández|CM|ESP_BAR|ESP|2008-01|62|84|R
Jofre Torrents|LB|ESP_BAR|ESP|2007-02|60|77|L
Guille Fernández|CM|ESP_BAR|ESP|2008-05|59|80|R
Andrés Cuenca|CB|ESP_BAR|ESP|2007-01|60|78|L
Diego Kochen|GK|ESP_BAR|USA|2006-03|60|77|R
Ibrahim Diarra|RW|ESP_BAR|MLI|2009-01|57|83|L
Shane Kluivert|LW|ESP_BAR|NED|2007-10|58|75|R
Hamza Abdelkarim|ST|ESP_BAR|EGY|2007-12|59|76|R
Xavi Espart|RB|ESP_BAR|ESP|2007-01|58|76|R
Juan Hernández|RW|ESP_BAR|ESP|2006-04|60|75|L
Álvaro Cortés|CB|ESP_BAR|ESP|2004-03|62|72|R
Mamadou Mbacke|CB|ESP_BAR|SEN|2006-03|61|74|R
Eder Aller|GK|ESP_BAR|ESP|2007-01|57|76|R
Pau Prim|CM|ESP_BAR|ESP|2006-04|60|74|R
Daniel Yáñez|RW|ESP_RMA|ESP|2007-03|60|78|L
Thiago Pitarch|CM|ESP_RMA|ESP|2007-06|60|78|R
Manuel Ángel|CM|ESP_RMA|ESP|2005-04|62|73|R
Diego Aguado|CB|ESP_RMA|ESP|2007-05|60|78|L
Joan Martínez|CB|ESP_RMA|ESP|2007-05|61|80|R
Jorge Cestero|CM|ESP_RMA|ESP|2006-03|61|76|R
Pol Fortuny|RW|ESP_RMA|ESP|2006-01|60|74|R
Fran González|GK|ESP_RMA|ESP|2005-06|62|76|R
Selton Sánchez|AM|ESP_ATH|ESP|2007-11|60|80|R
Lennart Karl|AM|GER_FCB|GER|2008-02|62|85|L
Wisdom Mike|LW|GER_FCB|GER|2007-02|59|79|R
Cassiano Kiala|CB|GER_FCB|GER|2007-04|59|77|R
David Santos Daiber|RW|GER_FCB|GER|2008-01|57|77|R
Erblin Osmani|AM|GER_FCB|GER|2007-05|58|75|R
Felipe Chávez|CM|GER_FCB|PER|2007-06|59|77|R
Vincent Manuba|DM|GER_FCB|GER|2005-04|61|72|R
Samuele Inácio|AM|GER_BVB|ITA|2008-01|59|81|L
Filippo Mané|CB|GER_BVB|ITA|2005-05|62|74|R
Almugera Kabar|LB|GER_BVB|GER|2006-06|61|76|L
Danylo Krevsun|ST|GER_BVB|UKR|2006-10|60|74|R
Noham Kamara|LB|FRA_PSG|FRA|2007-01|61|78|L
Lorenzo Anghelè|ST|ITA_JUV|ITA|2006-01|61|73|R
Javier Gil Puche|RB|ITA_JUV|ESP|2006-02|61|74|R
Mattia Mosconi|AM|ITA_INT|ITA|2007-01|58|76|R
Thomas Berenbruch|CM|ITA_INT|ITA|2005-04|62|73|R
Giacomo De Pieri|RW|ITA_INT|ITA|2006-04|61|74|L
Mattia Liberali|AM|ITA_MIL|ITA|2007-03|59|78|R
Kevin Zeroli|CM|ITA_MIL|ITA|2005-01|62|74|R
Lorenzo Torriani|GK|ITA_MIL|ITA|2005-02|62|76|R
Anísio Cabral|ST|POR_SLB|POR|2008-04|59|80|R
Diogo Prioste|AM|POR_SLB|POR|2004-04|63|73|L
Daniel Banjaqui|RB|POR_SLB|POR|2007-01|59|77|R
José Neto|LB|POR_SLB|POR|2007-03|58|76|L
Luighi|ST|XBRA_PALMEIRAS|BRA|2006-01|65|78|R
Wallace Yan|ST|XBRA_FLAMENGO|BRA|2005-01|64|75|R
Gabriel Mec|AM|XBRA_GREMIO|BRA|2008-02|60|82|L
Ian Subiabre|RW|ARG_RIV|ARG|2007-01|65|80|L
Agustín Ruberto|ST|ARG_RIV|ARG|2006-01|64|76|R
Cameron Byrne-Hughes|GK|ENG_MUN|ENG|2007-04|61|75|R
Fred Heath|GK|ENG_MUN|ENG|2007-03|58|72|L
Albert Mills|RB|ENG_MUN|ENG|2008-08|53|66|L
Dante Plunkett|LB|ENG_MUN|ENG|2007-08|57|68|L
James Overy|CB|ENG_MUN|ENG|2007-06|61|78|R
Samuel Lusale|ST|ENG_MUN|ENG|2007-06|61|70|R
Zachary Watson|GK|ENG_MUN|ENG|2008-11|57|74|R
Rafe McCormack|CB|ENG_MUN|ENG|2008-08|53|71|L
Jacob Watson|CB|ENG_MUN|ENG|2009-10|53|77|R
Jayden Ngwashi|LB|ENG_MUN|ENG|2008-01|58|75|R
Yuel Helafu|CB|ENG_MUN|ENG|2008-09|54|73|R
Jay McEvoy|DM|ENG_MUN|ENG|2008-07|57|76|R
Jariyah Shah|CM|ENG_MUN|ENG|2009-12|51|69|R
Louie Kynaston-Bradbury|ST|ENG_MUN|ENG|2008-11|56|73|R
Neithan Barbosa|ST|ENG_MUN|ENG|2008-12|53|66|R
Noah Ajayi|ST|ENG_MUN|ENG|2008-06|58|69|R
Nathaniel-Junior Brown|LW|ENG_MUN|ENG|2008-03|58|84|L
Harley Emsden-James|CB|ENG_MUN|ENG|2009-12|54|66|R
Doula Nkoto Abdoulaye|RW|ENG_MUN|ENG|2010-03|54|75|L
Kai Rooney|ST|ENG_MUN|ENG|2009-12|54|68|R
Charlie Hardy|GK|ENG_MUN|ENG|2009-11|51|66|L
Harrison Dudziak|DM|ENG_ARS|ENG|2006-10|61|82|R
Seb Ferdinand|ST|ENG_ARS|ENG|2006-06|60|67|L
Cam'ron Ismail|CB|ENG_ARS|ENG|2006-10|60|75|R
Remy Mitchell|GK|ENG_ARS|ENG|2006-06|61|73|R
Jaden Dixon|RB|ENG_ARS|ENG|2006-02|61|69|R
Marcell Washington|CB|ENG_ARS|ENG|2006-07|61|77|R
Archie Stevens|LW|ENG_ARS|ENG|2006-09|60|74|R
Demiane Agustien|CM|ENG_ARS|NED|2006-12|59|67|R
Evan Mooney|CM|ENG_ARS|ENG|2006-08|59|68|L
Louie Copley|CM|ENG_ARS|ENG|2006-01|64|77|R
Lucas Nygaard|GK|ENG_ARS|DEN|2006-11|58|73|R
Will Sweet|LB|ENG_ARS|ENG|2006-03|63|73|R
Sam Chapman|CB|ENG_ARS|ENG|2008-11|54|66|R
Theo Julienne|CM|ENG_ARS|ENG|2008-10|57|71|R
Alex Marciniak|CM|ENG_ARS|ENG|2008-05|60|74|R
Josh Ogunnaike|CB|ENG_ARS|ENG|2008-03|59|74|R
Ceadach O'Neill|RW|ENG_ARS|ENG|2008-03|60|80|R
Samuel Onyekachukwu|CB|ENG_ARS|ENG|2008-01|58|73|R
Louis Zečević-John|LW|ENG_ARS|ENG|2008-09|57|70|L
Brando Bailey-Joseph|ST|ENG_ARS|ENG|2009-03|57|73|R
Marley Frohock|LW|ENG_ARS|ENG|2009-04|57|69|L
Callan Hamill|CB|ENG_ARS|ENG|2009-06|55|71|L
Maalik Hashi|CM|ENG_ARS|ENG|2009-09|51|66|R
Josiah King|CB|ENG_ARS|ENG|2009-04|57|71|R
Teshaun Murisa|AM|ENG_ARS|ENG|2009-12|54|66|R
Bowen Phillips|CM|ENG_ARS|ENG|2009-06|54|66|R
Abraham Owusu-Gyasi|RB|ENG_ARS|ENG|2009-09|51|66|R
Saurap Sampang|AM|ENG_ARS|ENG|2009-01|57|71|L
Patrick Stachow|RB|ENG_ARS|ENG|2009-06|55|66|R
Joshua Tahou|CB|ENG_ARS|ENG|2009-07|54|66|R
Jack Talbot|GK|ENG_ARS|ENG|2009-05|53|69|R
Remi Łupiński|GK|ENG_ARS|ENG|2009-07|54|77|R
Samuel Rak-Sakyi|DM|ENG_CHE|ENG|2005-05|61|71|R
Jimi Tauriainen|AM|ENG_CHE|FIN|2004-12|61|66|R
Richard Olise|RB|ENG_CHE|ENG|2005-12|61|68|R
Harrison McMahon|CM|ENG_CHE|ENG|2006-02|64|72|R
Max Merrick|GK|ENG_CHE|ENG|2006-06|64|74|R
Kian Best|LB|ENG_CHE|ENG|2006-11|59|76|L
Leo Cardoso|DM|ENG_CHE|BRA|2006-06|60|77|L
Sol Gordon|CM|ENG_CHE|ENG|2008-09|57|78|R
Ollie Harrison|CM|ENG_CHE|ENG|2006-05|64|72|R
Kaiden Wilson|CB|ENG_CHE|ENG|2006-12|61|68|R
Justin Osagie|RB|ENG_CHE|ENG|2006-02|62|71|R
Olutayo Subuloye|RB|ENG_CHE|ENG|2008-08|55|76|R
Shaun Wade|RW|ENG_CHE|ENG|2006-09|61|75|R
Hudson Sands|GK|ENG_CHE|ENG|2008-01|59|71|R
Mathis Eboue|AM|ENG_CHE|ENG|2008-12|57|77|R
Chizaram Ezenwata|ST|ENG_CHE|ENG|2008-05|56|68|R
Lewi Richards|DM|ENG_CHE|ENG|2008-10|55|66|R
Freddy Bernal|GK|ENG_CHE|ENG|2008-10|56|70|R
Kobe Barbour|ST|ENG_CHE|ENG|2008-09|55|66|L
Jack Austin|GK|ENG_CHE|ENG|2009-12|50|69|L
Calvin Diakite|RB|ENG_CHE|ENG|2009-08|51|66|R
Charlie Holland|CM|ENG_CHE|ENG|2009-12|51|66|R
Jeremiah Berkeley-Agyepong|LW|ENG_CHE|ENG|2009-08|51|73|L
Isago Silva|CB|ENG_CHE|ENG|2009-04|55|76|R
Toby Bell|GK|ENG_CHE|ENG|2009-10|51|77|R
Ibrahim Rabbaj|CM|ENG_CHE|ENG|2009-06|54|67|R
Dante Waite|CB|ENG_CHE|ENG|2009-09|52|66|R
Yisa Alao|RB|ENG_CHE|ENG|2009-01|56|69|R
Riley Ebho|CB|ENG_CHE|ENG|2009-09|50|66|L
Jacob Hall|CB|ENG_CHE|ENG|2009-07|57|74|R
Christopher Atherton|ST|ENG_CHE|ENG|2009-09|51|68|L
Jashayde Greenwood|ST|ENG_CHE|ENG|2009-09|51|67|R
Brooklyn Nfonkeu|ST|ENG_MCI|ENG|2006-02|60|72|R
Isaac Smith|CB|ENG_MCI|ENG|2006-03|60|73|L
Ezra Carrington|RB|ENG_MCI|ENG|2006-04|60|66|R
Harrison Parker|RB|ENG_MCI|ENG|2006-10|62|70|R
Charlie Gray|CM|ENG_MCI|ENG|2006-12|60|76|R
Femi Fapetu|CM|ENG_MCI|ENG|2006-08|62|73|R
Ashton Muir|ST|ENG_MCI|ENG|2006-08|60|84|R
Isaiah Dada-Mascoll|AM|ENG_MCI|ENG|2006-10|59|78|R
Mahamadou Sangaré|LW|ENG_MCI|MLI|2006-02|62|67|L
Luke Mbete|CB|ENG_MCI|ENG|2003-08|62|80|R
Spike Brits|GK|ENG_MCI|ENG|2006-08|59|77|R
Jack Wint|GK|ENG_MCI|ENG|2006-06|62|75|R
Matthew Henderson-Hall|LB|ENG_MCI|ENG|2006-04|60|73|L
Kian Noble|CB|ENG_MCI|ENG|2006-01|63|69|R
Matthew Warhurst|ST|ENG_MCI|ENG|2006-12|58|72|R
Rhys Thomas|RB|ENG_MCI|ENG|2006-08|59|73|R
Max Hudson|GK|ENG_MCI|ENG|2008-07|60|69|R
Floyd Samba|AM|ENG_MCI|ENG|2008-01|58|79|R
Dante Headley|CB|ENG_MCI|ENG|2008-01|59|70|R
Christian Dunbar-McDonald|ST|ENG_MCI|ENG|2008-03|60|77|R
Tyrone Samba|LW|ENG_MCI|ENG|2009-08|54|66|R
Finley Grigg|GK|ENG_MCI|ENG|2009-02|53|68|R
Ben Vickery|GK|ENG_MCI|ENG|2009-05|53|74|L
Marlow Barrett|CB|ENG_MCI|ENG|2009-04|55|75|L
Charlie Courtman|LB|ENG_MCI|ENG|2009-06|55|66|R
Leke Drake|CB|ENG_MCI|ENG|2009-05|53|66|R
Yohann Obin|LB|ENG_MCI|ENG|2009-06|57|68|L
Oliver Tevenan|RB|ENG_MCI|ENG|2009-04|57|72|R
Freddie Lawrie|RB|ENG_MCI|ENG|2009-05|56|70|R
Archie Thornton|CB|ENG_MCI|ENG|2009-04|57|70|L
Jake Wain|CB|ENG_MCI|ENG|2009-11|50|66|L
Finley Gorman|CM|ENG_MCI|ENG|2009-06|56|75|L
Charlie Holt|AM|ENG_MCI|ENG|2009-03|54|71|L
Milo Martin|DM|ENG_MCI|ENG|2009-09|52|66|L
Harrison Miles|DM|ENG_MCI|ENG|2009-08|53|66|L
Xavier Parker|DM|ENG_MCI|ENG|2009-12|53|73|L
Dexter Oliver|CM|ENG_MCI|ENG|2009-05|53|66|R
Sam Wadsworth|DM|ENG_MCI|ENG|2009-07|53|66|R
Teddie Lamb|ST|ENG_MCI|ENG|2009-03|55|76|R
Kylan Midwood|ST|ENG_MCI|ENG|2009-06|54|66|R
Timeo Whisker|ST|ENG_MCI|ENG|2009-01|54|74|L
Caelan Cadamarteri|LW|ENG_MCI|ENG|2009-09|53|66|L
Carter Pinnington|LB|ENG_LIV|ENG|2006-05|62|73|L
Oliver O'Connor|CM|ENG_LIV|ENG|2006-12|61|74|R
Terence Miles|CB|ENG_LIV|ENG|2006-06|62|70|L
Kyle Kelly|CM|ENG_LIV|ENG|2006-07|63|70|L
Joe Bradshaw|DM|ENG_LIV|ENG|2006-08|60|73|R
Owen Beck|RB|ENG_LIV|WAL|2002-06|63|67|L
Kornel Miściur|GK|ENG_LIV|POL|2006-01|61|73|L
Will Wright|RW|ENG_LIV|ENG|2006-10|60|68|R
Bailey Hall|GK|ENG_LIV|ENG|2006-01|61|74|R
Kareem Ahmed|ST|ENG_LIV|ENG|2006-10|58|68|R
Josh Sonni-Lambie|ST|ENG_LIV|ENG|2006-08|59|75|R
James Balagizi|CM|ENG_LIV|ENG|2003-01|63|68|L
Oakley Cannonier|RW|ENG_LIV|ENG|2004-06|63|72|R
Lucas Pitt|CB|ENG_LIV|ENG|2006-12|60|71|R
DJ Esdaille|RB|ENG_LIV|ENG|2006-02|63|70|L
Emmanuel Airoboma|CB|ENG_LIV|ENG|2006-05|61|78|R
Ben Trueman|CM|ENG_LIV|ENG|2006-05|60|80|R
Michael Laffey|CM|ENG_LIV|ENG|2006-09|60|70|R
Afolami Onanuga|CM|ENG_LIV|ENG|2006-04|64|70|L
DJ Bernard|GK|ENG_LIV|ENG|2008-08|55|68|R
Jacob Poytress|GK|ENG_LIV|ENG|2008-09|56|82|R
Matty Wright|GK|ENG_LIV|ENG|2009-08|53|69|R
Noah Adekoya|RB|ENG_LIV|ENG|2009-11|52|68|R
Prince Cissé|CB|ENG_LIV|ENG|2009-07|56|77|L
Lucas Clarke|CB|ENG_LIV|ENG|2009-06|54|67|R
Lenix Conde|CB|ENG_LIV|ENG|2009-01|55|69|R
Clae Ewing|CB|ENG_LIV|ENG|2009-02|55|72|L
Harry Moran|CB|ENG_LIV|ENG|2009-07|55|68|L
Harvey Owen|CB|ENG_LIV|ENG|2008-04|56|67|R
Cian Powney Wain|RB|ENG_LIV|ENG|2009-07|55|79|R
Mor Talla Ndiaye|RB|ENG_LIV|ENG|2009-09|52|66|L
Cam Williams|RB|ENG_LIV|ENG|2009-01|55|66|R
Alvin Ayman|AM|ENG_LIV|ENG|2009-03|55|71|R
Ryan Cowley|CM|ENG_LIV|ENG|2009-07|53|66|R
Ellis Hickman|DM|ENG_LIV|ENG|2009-10|51|70|R
La'more Lee Forrester|DM|ENG_LIV|ENG|2009-01|54|66|R
Haydn Murray-Holme|CM|ENG_LIV|ENG|2009-06|54|67|R
Joe Upton|CM|ENG_LIV|ENG|2009-12|54|70|R
AJ Yeguo|CM|ENG_LIV|ENG|2009-01|56|73|R
Finn Inglethorpe|RW|ENG_LIV|ENG|2009-11|50|66|R
Ciaran Thompson|CB|ENG_NEW|ENG|2004-12|61|80|R
Miodrag Pivaš|LB|ENG_NEW|SRB|2005-05|63|66|L
Darren Palmer|CM|ENG_NEW|ENG|2005-04|64|70|L
Alfie Harrison|CM|ENG_NEW|ENG|2005-06|60|70|R
Johnny Emerson|CM|ENG_NEW|IRL|2005-04|60|67|R
James Taylor|GK|ENG_NEW|ENG|2006-01|60|66|R
Scott Bailey|CM|ENG_NEW|ENG|2006-09|61|71|R
Dylan Charlton|RB|ENG_NEW|ENG|2006-03|63|69|R
Anthony Munda|CM|ENG_NEW|ENG|2006-06|60|71|L
Fraser Harper|AM|ENG_NEW|ENG|2006-11|58|66|L
Adam Harrison|GK|ENG_NEW|ENG|2006-05|62|75|L
Thomas Bryant|CB|ENG_NEW|ENG|2006-03|59|72|L
Aidan Harris|GK|ENG_NEW|ENG|2006-12|59|72|L
Baran Yıldız|AM|ENG_NEW|ENG|2007-04|58|67|R
Logan Watts|CB|ENG_NEW|ENG|2007-08|59|84|R
Kyle Fitzgerald|LW|ENG_NEW|ENG|2007-06|61|76|R
Leo Shahar|RB|ENG_NEW|ENG|2007-04|60|73|R
Joe Brayson|ST|ENG_NEW|ENG|2007-12|59|76|R
Luke Craggs|CB|ENG_NEW|ENG|2007-06|60|70|R
Vakhtang Salia|RW|ENG_NEW|GEO|2007-02|59|72|R
Max Thompson|GK|ENG_NEW|ENG|2004-12|62|72|R
Charlie McArthur|LB|ENG_NEW|ENG|2005-11|60|70|R
Travis Hernes|CM|ENG_NEW|NOR|2005-03|60|72|R
Antonio Cordero|AM|ENG_NEW|ESP|2006-09|57|69|R
Trevan Sanusi|ST|ENG_NEW|ENG|2007-09|57|74|R
Guy Bloomer|RB|ENG_NEW|ENG|2007-02|59|72|R
Alex O'Donovan|CM|ENG_NEW|ENG|2007-12|55|71|L
Kayden Lucas|ST|ENG_NEW|ENG|2007-12|55|69|R
Ezra Tika-Lemba|CM|ENG_NEW|ENG|2007-05|59|66|L
Mo Waddani|DM|ENG_NEW|ENG|2007-11|59|75|R
Jude Cogdon|CM|ENG_NEW|ENG|2007-02|57|67|R
Henry Johnson|LB|ENG_NEW|ENG|2008-05|56|72|L
Jake Durrant|CB|ENG_NEW|ENG|2008-07|57|67|R
Rory Finneran|CM|ENG_NEW|ENG|2008-02|55|75|R
Matty Taylor|CM|ENG_NEW|ENG|2008-02|55|71|R
Kacey Wooster|RW|ENG_NEW|ENG|2008-07|58|72|L
Aaron Epia|RB|ENG_NEW|ENG|2008-09|55|66|R
Will Anderson|GK|ENG_NEW|ENG|2008-06|57|67|L
Matheos Ferreira|CM|ENG_NEW|ENG|2008-07|55|76|R
Tyler Jones|GK|ENG_NEW|ENG|2008-10|55|73|R
Zépiqueno Redmond|ST|ENG_AVL|NED|2006-03|63|74|R
Sam Proctor|GK|ENG_AVL|ENG|2006-09|60|74|R
George Hemmings|DM|ENG_AVL|ENG|2006-05|60|66|L
Yeimar Mosquera|CB|ENG_AVL|COL|2006-08|60|79|R
Ronnie Hollingshead|GK|ENG_AVL|ENG|2006-09|60|67|R
Omar Khedr|RW|ENG_AVL|ENG|2006-08|57|68|R
James Wright|GK|ENG_AVL|ENG|2006-03|60|72|R
Sam Lewis|GK|ENG_AVL|ENG|2006-04|62|73|R
Mason Cotcher|LW|ENG_AVL|ENG|2006-02|61|68|L
Trai-Varn Mulley|AM|ENG_AVL|ENG|2006-04|63|75|R
Cole Brannigan|LW|ENG_AVL|ENG|2006-08|57|73|L
TJ Carroll|RB|ENG_AVL|ENG|2006-05|62|74|R
Ashton McWilliams|LB|ENG_AVL|ENG|2006-09|57|76|L
Calum Moreland|CB|ENG_AVL|ENG|2006-01|59|74|R
Luka Lynch|LW|ENG_AVL|ENG|2006-11|59|72|R
Mohamed Koné|DM|ENG_AVL|CIV|2006-11|60|74|R
Kerr Smith|LB|ENG_AVL|ENG|2006-06|60|66|R
Louie Barry|LW|ENG_AVL|ENG|2003-09|65|74|L
Triston Rowe|LB|ENG_AVL|ENG|2006-04|63|76|L
Kadan Young|AM|ENG_AVL|ENG|2006-01|60|68|R
Aidan Borland|CM|ENG_AVL|ENG|2006-12|60|69|L
Travis Patterson|CB|ENG_AVL|ENG|2006-11|61|74|R
Rory Wilson|ST|ENG_AVL|SCO|2006-05|63|75|R
Yasin Özcan|CB|ENG_AVL|TUR|2006-01|62|67|R
Ben Broggio|CM|ENG_AVL|ENG|2006-05|63|79|R
Charlie Pavey|CM|ENG_AVL|ENG|2006-12|61|68|L
Max Lott|CM|ENG_AVL|ENG|2006-06|59|68|R
I-lani Edwards|CM|ENG_AVL|ENG|2006-02|59|66|R
Josh Feeney|CB|ENG_AVL|ENG|2005-02|63|82|R
Thierry Katsukunya|CB|ENG_AVL|GER|2005-04|62|74|L
Tommi O'Reilly|DM|ENG_AVL|ENG|2003-12|64|67|R
Ewan Simpson|CM|ENG_AVL|SCO|2006-03|59|75|R
Lino Sousa|CB|ENG_AVL|ENG|2005-08|63|69|L
Sil Swinkels|LB|ENG_AVL|NED|2003-08|62|70|L
Kane Taylor|CM|ENG_AVL|ENG|2006-01|61|75|R
Junior Wilson|CB|ENG_AVL|ENG|2008-10|54|74|R
Markie Meade|ST|ENG_AVL|ENG|2008-03|57|66|R
Leon Routh|RB|ENG_AVL|ENG|2008-06|58|77|L
Owen Asemota|GK|ENG_AVL|ENG|2008-10|52|66|R
Fletcher Boyd|AM|ENG_AVL|ENG|2008-03|58|67|R
Cole Ramsey|DM|ENG_AVL|ENG|2008-02|56|74|R
Lennon Melhuish|CM|ENG_AVL|ENG|2008-06|57|67|R
Rodrigo Fortes|CB|ENG_AVL|ENG|2008-03|58|74|R
Farid Addey|RB|ENG_AVL|ENG|2008-01|59|75|R
Clay Atkins|RB|ENG_AVL|ENG|2008-10|56|72|L
Oliver Bindley|AM|ENG_AVL|ENG|2008-09|56|66|L
Jack McGrath|CM|ENG_AVL|ENG|2008-07|57|83|L
Rio Hammond|ST|ENG_AVL|ENG|2008-03|58|78|R
Theo Houston|GK|ENG_AVL|ENG|2008-07|59|72|R
Jahmi Kellyman|ST|ENG_AVL|ENG|2009-03|55|66|R
Elijah Briscoe|RW|ENG_AVL|ENG|2009-02|52|66|R
Woody Burgess|AM|ENG_AVL|ENG|2009-06|56|75|L
Jacob Green|CB|ENG_AVL|ENG|2009-01|53|68|R
Vinnie Hayward|ST|ENG_AVL|ENG|2009-01|55|75|R
Alfie Lynskey|AM|ENG_AVL|ENG|2009-04|55|77|R
Max Jenner|CM|ENG_AVL|ENG|2009-09|53|69|L
Harry Pinnell|RB|ENG_AVL|ENG|2009-07|55|71|L
Tay'veon Smithen|ST|ENG_AVL|ENG|2009-04|56|72|R
Keiber Lamadrid|CM|ENG_WHU|VEN|2006-09|58|69|R
Reece Byrne|GK|ENG_WHU|ENG|2006-02|59|71|L
Dimitri Colau|CB|ENG_WHU|FRA|2005-10|60|74|R
Luizão|CB|ENG_WHU|BRA|2005-05|61|69|R
Regan Clayton|CB|ENG_WHU|ENG|2006-08|61|76|R
Daniel Rigge|AM|ENG_WHU|ENG|2006-08|58|71|R
Josh Landers|ST|ENG_WHU|ENG|2006-05|61|70|R
Finlay Herrick|GK|ENG_WHU|ENG|2006-04|60|75|L
Callum Marshall|ST|ENG_WHU|NIR|2004-02|64|73|R
Josh Briggs|CB|ENG_WHU|ENG|2006-01|60|66|R
Luis Brown|RB|ENG_WHU|ENG|2006-05|62|69|R
Daniel Cummings|LW|ENG_WHU|ENG|2006-09|58|73|L
Tom Wooster|GK|ENG_WHU|ENG|2006-10|58|72|R
Mohamadou Kanté|CM|ENG_WHU|FRA|2006-07|59|71|L
Airidas Golambeckis|LB|ENG_WHU|LTU|2005-10|62|73|L
Tyron Akpata|AM|ENG_WHU|ENG|2006-01|60|82|R
Ezra Mayers|LB|ENG_WHU|ENG|2006-08|57|66|L
Joshua Ajala|ST|ENG_WHU|ENG|2006-04|62|83|R
Riley Hargan|ST|ENG_WHU|ENG|2006-07|59|70|R
Preston Fearon|CM|ENG_WHU|ENG|2006-03|60|75|R
Emeka Adeile|CB|ENG_WHU|ENG|2006-04|62|71|R
Elisha Sowunmi|ST|ENG_WHU|ENG|2006-10|57|77|R
Gabriel Caliste|AM|ENG_WHU|ENG|2006-02|60|72|R
Tommy Goodger|GK|ENG_WHU|ENG|2008-10|53|70|R
Tomas Jonyla|CB|ENG_WHU|LTU|2008-08|56|66|L
Jethro Medine|CB|ENG_WHU|ENG|2008-05|59|72|R
Rayan Oyebade|LB|ENG_WHU|ENG|2008-02|57|69|R
Lanre Awesu|GK|ENG_WHU|ENG|2008-10|56|71|R
Finley Hooper|GK|ENG_WHU|ENG|2008-09|54|71|R
Lewis Beckford|CM|ENG_WHU|ENG|2008-06|56|74|R
Andre Dike|RW|ENG_WHU|ENG|2008-02|58|77|R
Jonathan Unwin|DM|ENG_WHU|ENG|2008-05|59|85|L
Joe Scanlon|CM|ENG_WHU|ENG|2008-02|58|71|L
Martin Peychev|CM|ENG_WHU|BUL|2008-06|56|70|R
Jephthah Medine|ST|ENG_WHU|ENG|2008-11|52|66|R
Joel Kerr|AM|ENG_WHU|ENG|2008-08|52|69|R
Callum Leacock|ST|ENG_WHU|ENG|2008-08|53|66|R
Vinnie Perkins|CB|ENG_WHU|ENG|2009-09|52|69|R
Harry Montague|CB|ENG_WHU|ENG|2009-12|49|66|R
Aaron Kamara|AM|ENG_WHU|ENG|2009-07|56|68|R
David Chigwada|ST|ENG_WHU|ENG|2009-04|52|66|R
Majid Balogun|ST|ENG_WHU|ENG|2009-05|54|72|R
Chinaza Nwosu|DM|ENG_WHU|ENG|2009-10|50|73|L
Reggie Morris-Agyemang|CM|ENG_WHU|ENG|2009-02|52|66|R
Tyrone Omotoye|DM|ENG_WHU|ENG|2009-04|53|73|L
Chukwumeka Obi|ST|ENG_WHU|ENG|2009-09|50|68|R
Connor Brooks|CM|ENG_WHU|ENG|2009-05|55|71|R
Luca Gunter|CM|ENG_TOT|ENG|2006-07|59|66|R
Tynan Thompson|CM|ENG_TOT|ENG|2005-04|63|70|R
Léo Paul Bouyer|GK|ITA_MIL|FRA|2006-04|64|74|R
Pietro Faccioli|GK|ITA_MIL|ITA|2006-09|58|66|L
Matteo Pittarella|GK|ITA_MIL|ITA|2006-06|63|77|R
Mattia Cappelletti|CB|ITA_MIL|ITA|2006-06|61|73|R
El Hadji Malick Cissé|CB|ITA_MIL|SEN|2006-02|60|75|R
Federico Colombo|CB|ITA_MIL|ITA|2006-01|60|76|L
Berkay Karaca|LB|ITA_MIL|TUR|2006-05|64|70|L
Matteo Pagliei|CB|ITA_MIL|ITA|2006-09|61|72|L
Nirash Raffaello Perera|CB|ITA_MIL|ITA|2006-12|61|69|R
Mattia Piermarini|CB|ITA_MIL|ITA|2006-10|60|82|R
Damir Zukić|CB|ITA_MIL|SVN|2006-02|64|74|R
Andrea Di Siena|CM|ITA_MIL|ITA|2006-03|63|68|R
Yahya Idrissi-Regragui|CM|ITA_MIL|MAR|2006-01|64|77|L
Tommaso Mancioppi|CM|ITA_MIL|ITA|2006-03|60|70|L
Fabio Pandolfi|CM|ITA_MIL|ITA|2006-01|63|83|L
Filippo Leonardo Plazzotta|AM|ITA_MIL|ITA|2006-08|58|74|R
Emanuele Sala|DM|ITA_MIL|ITA|2006-01|60|73|R
Silvano Vos|CM|ITA_MIL|NED|2005-02|62|80|R
Levis Prince Asanji|ST|ITA_MIL|GER|2006-11|58|68|R
Cheveyo Balentien|ST|ITA_MIL|NED|2006-09|60|70|R
Alessandro Bonomi|ST|ITA_MIL|ITA|2006-01|62|75|R
Emanuele Borsani|ST|ITA_MIL|ITA|2006-02|64|80|R
Alex Castiello|LW|ITA_MIL|ITA|2006-01|63|68|L
Aurelien Guernier|ST|ITA_MIL|ENG|2006-06|62|71|R
Luca Menon|ST|ITA_MIL|ITA|2006-09|59|71|L
Lorenzo Ossola|ST|ITA_MIL|ITA|2006-05|60|82|R
Paolo Raimondi|GK|ITA_INT|ITA|2005-03|61|69|R
Alessandro Calligaris|GK|ITA_INT|ITA|2005-02|64|83|R
Tommaso Avitabile|RB|ITA_INT|ITA|2006-05|61|66|R
Matteo Cocchi|LB|ITA_INT|ITA|2007-08|57|74|L
Christos Alexiou|CB|ITA_INT|GRE|2005-11|63|77|R
Yvan Maye|CB|ITA_INT|FRA|2006-08|58|66|R
Francesco Stante|CB|ITA_INT|ITA|2005-06|61|70|R
Gabriele Re Cecconi|CB|ITA_INT|ITA|2006-10|62|78|R
Antonio David|LB|ITA_INT|ROU|2004-05|66|73|L
Gabriele Garonetti|CB|ITA_INT|ITA|2006-07|60|76|R
Simone Cinquegrano|RB|ITA_INT|ITA|2004-04|64|67|R
Igor Amerighi|RB|ITA_INT|ITA|2005-01|62|73|R
Leon Jakirović|CB|ITA_INT|CRO|2008-06|57|68|R
Mattia Zanchetta|DM|ITA_INT|ITA|2006-04|64|80|R
Luka Topalović|AM|ITA_INT|SVN|2006-05|63|74|R
Issiaka Kamate|CM|ITA_INT|FRA|2004-12|63|71|R
Leonardo Bovo|DM|ITA_INT|ITA|2005-07|63|74|R
Matteo Venturini|CM|ITA_INT|ITA|2006-11|60|75|R
Dilan Zárate|CM|ITA_INT|ESP|2007-10|58|68|R
Iwo Kaczmarski|DM|ITA_INT|POL|2004-01|63|77|L
Matteo Spinaccè|ST|ITA_INT|ITA|2006-09|60|67|R
Richi Agbonifo|RW|ITA_INT|ITA|2006-11|59|73|R
Aymen Zouin|LW|ITA_INT|MAR|2006-01|60|75|L
Jan Żuberek|ST|ITA_INT|POL|2004-05|63|66|L
Jamal Iddrissou|ST|ITA_INT|ITA|2007-04|60|74|R
Matteo Lavelli|ST|ITA_INT|ITA|2006-08|62|77|R
Diogo Ferreira|GK|POR_SLB|POR|2006-10|59|67|R
Arnas Voitinovičius|GK|POR_SLB|LTU|2006-11|62|80|L
Francisco Neto|RW|POR_SLB|POR|2006-03|62|81|R
João Fonseca|RB|POR_SLB|POR|2006-01|62|78|R
Leandro Martins|CB|POR_SLB|POR|2006-01|63|69|R
Nuno Félix|CM|POR_SLB|POR|2006-06|61|77|R
Gonçalo Oliveira|CB|POR_SLB|POR|2006-08|60|74|R
Rodrigo Rêgo|RW|POR_SLB|POR|2006-08|58|73|R
João Veloso|CM|POR_SLB|POR|2006-01|64|77|L
Michée Ndembi|CB|POR_SLB|FRA|2006-04|62|74|R
Olívio Tomé|RW|POR_SLB|POR|2006-08|60|71|R
Gonçalo Moreira|DM|POR_SLB|POR|2006-01|64|70|R
Kevin Pinto|RB|POR_SLB|POR|2006-08|61|71|R
Mauro Furtado|LB|POR_SLB|POR|2006-03|60|82|L
João Rego|CM|POR_SLB|POR|2006-11|59|83|L
Martim Ferreira|CM|POR_SLB|POR|2006-06|62|74|R
Tiago Freitas|CM|POR_SLB|POR|2006-02|61|77|R
Tiago Parente|RB|POR_SLB|POR|2006-02|60|73|R
Francisco Silva|ST|POR_SLB|POR|2006-08|59|72|R
Alexander Sandahl|GK|POR_SLB|SWE|2006-02|63|68|L
Rui Silva|CB|POR_SLB|POR|2006-10|61|79|R
Tomás Moreira|AM|POR_SLB|POR|2006-11|62|76|R
Jelani Trevisan|ST|POR_SLB|SUI|2006-03|60|67|R
Ricardo Ribeiro|GK|POR_SLB|POR|2006-02|61|72|R
Eduardo Fernandes|ST|POR_SLB|POR|2006-02|62|74|L
Jannis Bärtl|GK|GER_FCB|GER|2006-10|60|70|R
Hannes Heilmair|GK|GER_FCB|GER|2006-09|59|67|R
Leon Klanac|GK|GER_FCB|CRO|2006-06|60|69|L
David Heindl|CB|GER_FCB|GER|2006-05|63|75|R
Roko Mijatović|LB|GER_FCB|CRO|2006-06|64|80|L
Deniz Ofli|LB|GER_FCB|GER|2006-09|59|83|L
Ljubo Puljić|LB|GER_FCB|CRO|2006-09|61|72|L
Maximilian Schuhbauer|CB|GER_FCB|GER|2006-07|64|78|L
Julien Yanda|CB|GER_FCB|GER|2006-02|63|84|R
Guido Della Rovere|DM|GER_FCB|ITA|2006-01|64|69|R
Robert Deziel Jr.|AM|GER_FCB|USA|2006-03|63|69|R
Louis Richter|DM|GER_FCB|GER|2006-03|64|71|R
Kurt Rüger|CM|GER_FCB|GER|2006-06|63|76|R
Mudaser Sadat|AM|GER_FCB|GER|2006-08|62|70|R
Bara Sapoko Ndiaye|CM|GER_FCB|SEN|2006-05|61|82|L
Younes Aitamer|ST|GER_FCB|GER|2006-06|64|70|R
Tim Binder|ST|GER_FCB|GER|2006-01|64|76|L
Maycon Cardozo|ST|GER_FCB|BRA|2006-10|59|74|R
Bajung Darboe|ST|GER_FCB|GAM|2006-01|62|69|R
Artur Degraf|ST|GER_FCB|GER|2006-07|60|68|L
Anton Heinz|LW|GER_FCB|GER|2006-07|64|71|L
Michael Scott|ST|GER_FCB|GER|2006-12|58|75|R
Omari Benjamin|RW|ENG_EVE|ENG|2006-11|58|75|R
Kingsford Boakye|RW|ENG_EVE|ENG|2006-04|62|74|R
Justin Clarke|ST|ENG_EVE|ENG|2006-05|59|71|R
Braiden Graham|RW|ENG_EVE|ENG|2006-12|57|76|R
Luca Davis|LB|ENG_EVE|ENG|2006-11|58|72|L
Reece Welch|RB|ENG_EVE|ENG|2006-05|61|74|L
Bradley Moonan|CB|ENG_EVE|ENG|2006-05|63|69|R
Odin Samuels-Smith|RB|ENG_EVE|ENG|2006-05|61|73|R
Joshua van Schoor|LB|ENG_EVE|NED|2006-04|62|69|R
Harvey Foster|CM|ENG_EVE|ENG|2006-02|63|72|R
Francis Gomez|CM|ENG_EVE|ENG|2006-01|61|70|R
Coby Ebere|ST|ENG_EVE|ENG|2006-02|60|66|R
Francis Okoronkwo|ST|ENG_EVE|ENG|2006-02|63|75|R
Aled Thomas|CB|ENG_EVE|WAL|2006-07|59|72|R
Jacob Beaumont-Clark|LW|ENG_EVE|ENG|2006-07|60|69|R
Callum Bates|CM|ENG_EVE|ENG|2006-09|61|74|R
Sean Keogh|CB|ENG_BHA|IRL|2006-12|60|69|R
Noël Atom|LB|ENG_BHA|GER|2006-01|62|67|L
Ben Barclay|CB|ENG_BHA|ENG|2006-12|57|76|R
Josh Robertson|CM|ENG_BHA|ENG|2006-11|57|67|R
Zane Albarus|CM|ENG_BHA|ENG|2006-07|61|69|R
Harry Mills|CB|ENG_BHA|ENG|2006-02|60|71|R
Yussif Moro Owusu|CM|ENG_BHA|GHA|2006-02|63|71|R
Nehemiah Oriola|CM|ENG_BHA|ENG|2006-09|59|70|R
Joe Belmont|ST|ENG_BHA|ENG|2006-02|63|68|R
Aidan West|ST|ENG_BHA|ENG|2006-01|59|72|R
Steven Hall|GK|ENG_BHA|AUS|2006-04|60|81|L
Lorenz Ferdinand|GK|ENG_BHA|GER|2006-10|60|79|R
Sebastian Jensen|GK|ENG_BHA|DEN|2006-05|63|75|R
Michael Dike|GK|ENG_BHA|ENG|2006-12|57|77|R
Callum Mackley|CB|ENG_BHA|ENG|2006-12|57|71|R
Jacob Vickers|CB|ENG_BHA|ENG|2006-07|62|79|R
Shane Nti|CM|ENG_BHA|ENG|2006-10|59|78|R
Matthew Hayden|RB|ENG_BHA|ENG|2006-06|61|74|L
Kofi Shaw|CM|ENG_BHA|ENG|2006-09|60|71|L
Tyler Silsby|RW|ENG_BHA|ENG|2006-06|61|69|R
Darius Lane|DM|ENG_BHA|ENG|2008-11|53|67|L
Tate Ferdinand|CB|ENG_BHA|ENG|2008-05|58|73|R
Adam Brett|ST|ENG_BHA|ENG|2008-10|56|73|R
Jesse Middleton|DM|ENG_BHA|ENG|2008-12|55|72|R
Henry Kasvosve|CM|ENG_BHA|ENG|2008-09|55|70|R
Isaiah Alakiu|LB|ENG_BHA|ENG|2008-06|57|66|R
Billy-Ray Cullinane|LB|ENG_BHA|ENG|2008-07|58|70|L
Younes Ibrahim|CM|ENG_BHA|ENG|2009-07|54|66|L
Theo Outen|LB|ENG_BHA|ENG|2009-06|56|72|L
Sebastian Ademola|RB|ENG_BHA|ENG|2009-04|54|71|R
Finley Taylor|GK|ENG_BHA|ENG|2009-09|51|77|R
Liam Crutchett|RB|ENG_BHA|ENG|2009-02|53|66|R
Jacob Parsons|LW|ENG_BHA|ENG|2009-06|53|67|R
Zachary Brennan|DM|ENG_BHA|ENG|2009-02|56|67|R
Cristiano Anah|CB|ENG_BHA|ENG|2009-10|50|66|R
Tobi Akapo|RB|ENG_BHA|ENG|2009-08|53|66|L
Raffaele Oppong|DM|ENG_BHA|ENG|2009-06|52|66|R
Fraser Widdop|CM|ENG_BHA|ENG|2009-06|53|66|R
Harry Lee|GK|ENG_CRY|ENG|2006-04|59|66|R
Dylan Reid|AM|ENG_CRY|ENG|2006-04|62|73|R
Adler Nascimento|LW|ENG_CRY|POR|2006-01|62|74|L
Mofe Jemide|LB|ENG_CRY|ENG|2006-04|62|77|R
Joseph Gibbard|CM|ENG_CRY|ENG|2006-11|59|67|R
Jackson Izquierdo|GK|ENG_CRY|USA|2006-03|59|72|R
Sebastian Williams|CM|ENG_CRY|ENG|2006-08|57|76|R
George King|CB|ENG_CRY|ENG|2006-10|61|72|R
Rylan Brownlie|RW|ENG_CRY|ENG|2006-05|59|67|R
Tyler Whyte|RB|ENG_CRY|ENG|2006-11|61|71|R
Zach Marsh|ST|ENG_CRY|ENG|2006-01|59|76|R
Asher Agbinone|ST|ENG_CRY|ENG|2006-01|61|74|R
Kai-Reece Adams-Collman|AM|ENG_CRY|ENG|2006-01|60|73|R
Matteo Dashi|AM|ENG_CRY|ALB|2006-10|58|66|R
Dean Benamar|CB|ENG_CRY|ENG|2006-09|61|76|R
Benjamin Casey|RW|ENG_CRY|ENG|2006-09|60|84|R
Joél Drakes-Thomas|ST|ENG_CRY|ENG|2006-06|61|75|R
Craig Farquhar|LB|ENG_CRY|ENG|2006-03|62|69|L
David Obou|RW|ENG_CRY|ENG|2006-07|61|74|R
Jemiah Umolu|ST|ENG_CRY|ENG|2006-09|60|79|L
Sean Somade|CB|ENG_CRY|ENG|2008-11|54|79|R
Euan Danaher|CM|ENG_CRY|ENG|2008-03|55|71|R
Jacob Fasida|CB|ENG_CRY|ENG|2008-11|54|66|R
David Angibeaud|CM|ENG_CRY|ENG|2008-10|54|67|R
Joshua Muwana|CB|ENG_CRY|ENG|2008-05|58|71|R
Stuart Oduro|CM|ENG_CRY|ENG|2008-11|53|66|R
Jasper Judd|LB|ENG_CRY|ENG|2009-02|53|66|L
Jack Mason|GK|ENG_CRY|ENG|2009-12|49|66|R
Chuks Okoli|DM|ENG_CRY|ENG|2009-06|54|69|L
Donte Martin|CM|ENG_CRY|ENG|2009-07|53|70|R
Jayden McDonald|LW|ENG_CRY|ENG|2009-12|51|66|R
Ajean-Ray Greaves|AM|ENG_CRY|ENG|2009-06|55|66|L
Daniel Owoade|DM|ENG_CRY|ENG|2009-02|52|69|R
Remi Ahazie-Shittu|LW|ENG_CRY|ENG|2009-04|55|66|L
Makai Bernard-Ferguson|RW|ENG_CRY|ENG|2009-01|52|69|R
Kairo Smith-Phillips|RW|ENG_CRY|ENG|2009-12|50|67|R
Yilmaz Aktas|GK|GER_BVB|GER|2006-06|64|79|R
Ismael Mansaray|CB|GER_BVB|GER|2006-12|62|76|L
Mario Pejazic|CB|GER_BVB|CRO|2006-04|62|69|R
Babis Drakas|LW|GER_BVB|GRE|2006-05|60|77|L
Felix Paschke|AM|GER_BVB|GER|2006-01|60|72|L
Bennedikt Wüstenhagen|RW|GER_BVB|GER|2006-04|63|69|L
Arne Wessels|ST|GER_BVB|GER|2006-11|58|66|L
Mussa Kaba|CM|GER_BVB|GER|2006-10|60|67|R
Pharell Kegni|ST|GER_BVB|GER|2006-05|64|78|R
Ousmane Diallo|RW|GER_BVB|GER|2006-10|62|74|R
Kevin Mutove|ST|GER_BVB|GER|2006-04|61|74|R
Elias Benkara|RB|GER_BVB|GER|2006-08|61|68|R
Nick Cherny|CM|GER_BVB|GER|2006-06|63|70|L
Mathis Albert|LW|GER_BVB|GER|2006-01|64|75|L
Tony Reitz|CM|GER_BVB|GER|2006-12|60|70|R
Jonas Feddersen|CB|GER_BVB|GER|2006-06|62|76|R
Prince Aning|CB|GER_BVB|GER|2006-04|62|75|R
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
// 2군(B팀)이 있는 구단의 유스는 2군으로: 카스티야·바르사 아틀레틱·벤피카 B·인테르 U23
const REMAP = { ESP_RMA: 'ESP_RMC', ESP_BAR: 'ESP_BAB', POR_SLB: 'POR_SLBB', ITA_INT: 'ITA_INTU' };
const ALL = TXT.trim().split('\n').map(l => l.split('|')), CURN = ALL.findIndex(r => r[0] === 'Agustín Ruberto') + 1;
// 구단당 상한: 1군 구단 18명, 2군 26명 (직접 고른 유망주 먼저, 나머지는 잠재력 순)
const byClub = {}; ALL.forEach((r, ix) => { const cl = REMAP[r[2]] || r[2]; (byClub[cl] = byClub[cl] || []).push([ix, r]); });
const pick = [];
for (const cl in byClub) { const L = byClub[cl].sort((a, b) => (a[0] < CURN ? 0 : 1) - (b[0] < CURN ? 0 : 1) || (a[0] < CURN ? a[0] - b[0] : +b[1][6] - +a[1][6])); const cap = /_(RMC|BAB|SLBB|INTU)$/.test(cl) ? 26 : 18; let n = 0; for (const [ix, r] of L) { if (n >= cap) break; pick.push([ix, r, cl]); n++; } }
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
