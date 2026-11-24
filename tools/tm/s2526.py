# 2025/26 (캘린더식 리그는 2025) 실제 결과 — rsssf.org 등에서 확인
T={}
def t(key,rows): T[key]=[r.split('|') for r in rows.strip().split('\n')]
t('ENG1','''Arsenal|38|26|7|5|71|27|85
Manchester City|38|23|9|6|77|35|78
Manchester United|38|20|11|7|69|50|71
Aston Villa|38|19|8|11|56|49|65
Liverpool|38|17|9|12|63|53|60
AFC Bournemouth|38|13|18|7|58|54|57
Sunderland|38|14|12|12|42|48|54
Brighton & Hove Albion|38|14|11|13|52|46|53
Brentford|38|14|11|13|55|52|53
Chelsea|38|14|10|14|58|52|52
Fulham|38|15|7|16|47|51|52
Newcastle United|38|14|7|17|53|55|49
Everton|38|13|10|15|47|50|49
Leeds United|38|11|14|13|49|56|47
Crystal Palace|38|11|12|15|41|51|45
Nottingham Forest|38|11|11|16|48|51|44
Tottenham Hotspur|38|10|11|17|48|57|41
West Ham United|38|10|9|19|46|65|39
Burnley|38|4|10|24|38|75|22
Wolverhampton Wanderers|38|3|11|24|27|68|20''')
t('ESP1','''FC Barcelona|38|31|1|6|95|36|94
Real Madrid|38|27|5|6|77|35|86
Villarreal CF|38|22|6|10|72|46|72
Atlético de Madrid|38|21|6|11|62|44|69
Real Betis|38|15|15|8|59|48|60
Celta|38|14|12|12|53|48|54
Getafe CF|38|15|6|17|32|38|51
Rayo Vallecano|38|12|14|12|41|44|50
Valencia CF|38|13|10|15|46|55|49
Real Sociedad|38|11|13|14|59|61|46
RCD Espanyol|38|12|10|16|43|55|46
Athletic Club|38|13|6|19|43|58|45
Sevilla FC|38|12|7|19|46|60|43
Deportivo Alavés|38|11|10|17|44|56|43
Elche CF|38|10|13|15|49|57|43
Levante UD|38|11|9|18|47|61|42
CA Osasuna|38|11|9|18|44|50|42
RCD Mallorca|38|11|9|18|47|57|42
Girona FC|38|9|14|15|39|55|41
Real Oviedo|38|6|11|21|26|60|29''')
t('ITA1','''Inter|38|27|6|5|89|35|87
Napoli|38|23|7|8|58|36|76
Roma|38|23|4|11|59|31|73
Como|38|20|11|7|65|29|71
Milan|38|20|10|8|53|35|70
Juventus|38|19|12|7|61|34|69
Atalanta|38|15|14|9|51|36|59
Bologna|38|16|8|14|49|46|56
Lazio|38|14|12|12|41|40|54
Udinese|38|14|8|16|45|48|50
Sassuolo|38|14|7|17|46|50|49
Torino|38|12|9|17|44|63|45
Parma|38|11|12|15|28|46|45
Cagliari|38|11|10|17|40|53|43
Fiorentina|38|9|15|14|41|50|42
Genoa|38|10|11|17|41|51|41
Lecce|38|10|8|20|28|50|38
Cremonese|38|8|10|20|32|57|34
Hellas Verona|38|3|12|23|25|61|21
Pisa|38|2|12|24|26|71|18''')
t('GER1','''Bayern München|34|28|5|1|122|36|89
Borussia Dortmund|34|22|7|5|70|34|73
RB Leipzig|34|20|5|9|66|47|65
VfB Stuttgart|34|18|8|8|71|49|62
TSG Hoffenheim|34|18|7|9|65|52|61
Bayer 04 Leverkusen|34|17|8|9|68|47|59
SC Freiburg|34|13|8|13|51|57|47
Eintracht Frankfurt|34|11|11|12|61|65|44
FC Augsburg|34|12|7|15|45|61|43
Mainz 05|34|10|10|14|44|53|40
Union Berlin|34|10|9|15|44|58|39
Borussia Mönchengladbach|34|9|11|14|42|53|38
Hamburger SV|34|9|11|14|40|54|38
1. FC Köln|34|7|11|16|49|63|32
Werder Bremen|34|8|8|18|37|60|32
VfL Wolfsburg|34|7|8|19|45|69|29
1. FC Heidenheim|34|6|8|20|41|72|26
FC St. Pauli|34|6|8|20|29|60|26''')
t('FRA1','''Paris Saint-Germain|34|24|4|6|74|29|76
RC Lens|34|22|4|8|66|35|70
LOSC Lille|34|18|7|9|52|37|61
Olympique Lyonnais|34|18|6|10|53|40|60
Olympique de Marseille|34|18|5|11|63|45|59
Stade Rennais|34|17|8|9|59|50|59
AS Monaco|34|16|6|12|60|54|54
RC Strasbourg|34|15|8|11|58|47|53
Toulouse FC|34|12|9|13|47|46|45
FC Lorient|34|11|12|11|48|51|45
Paris FC|34|11|11|12|47|50|44
Stade Brestois|34|10|9|15|43|55|39
Angers SCO|34|9|9|16|29|48|36
Le Havre AC|34|7|14|13|32|44|35
AJ Auxerre|34|8|10|16|34|44|34
OGC Nice|34|7|11|16|37|60|32
FC Nantes|34|5|9|20|29|52|24
FC Metz|34|3|8|23|32|76|17''')
t('POR1','''FC Porto|34|28|4|2|66|18|88
Sporting CP|34|25|7|2|89|24|82
SL Benfica|34|23|11|0|74|25|80
SC Braga|34|16|11|7|64|36|59
FC Famalicão|34|15|11|8|42|29|56
Gil Vicente|34|13|11|10|47|38|50
Moreirense|34|12|7|15|37|49|43
FC Arouca|34|12|6|16|47|64|42
Vitória SC|34|12|6|16|39|51|42
Estoril Praia|34|10|9|15|54|57|39
FC Alverca|34|10|9|15|35|52|39
Rio Ave|34|8|12|14|35|57|36
Santa Clara|34|9|9|16|32|41|36
CD Nacional|34|9|7|18|37|45|34
Estrela Amadora|34|6|12|16|38|56|30
Casa Pia|34|6|12|16|31|57|30
CD Tondela|34|6|10|18|27|55|28
AVS|34|3|12|19|27|67|21''')
t('NED1','''PSV|34|27|3|4|101|45|84
Feyenoord|34|19|8|7|70|44|65
NEC Nijmegen|34|16|11|7|77|53|59
FC Twente|34|15|13|6|59|40|58
Ajax|34|14|14|6|62|41|56
FC Utrecht|34|15|8|11|55|42|53
AZ|34|14|10|10|58|51|52
SC Heerenveen|34|14|9|11|57|53|51
FC Groningen|34|14|6|14|49|45|48
Sparta Rotterdam|34|12|7|15|40|62|43
Fortuna Sittard|34|11|6|17|49|63|39
Go Ahead Eagles|34|8|14|12|54|53|38
Excelsior|34|10|8|16|43|56|38
Telstar|34|9|10|15|49|55|37
PEC Zwolle|34|9|10|15|44|71|37
FC Volendam|34|8|8|18|35|55|32
NAC Breda|34|6|11|17|35|58|29
Heracles Almelo|34|5|4|25|35|85|19''')
t('BEL1','''Club Brugge|40|28|4|8|91|45|57
Union Saint-Gilloise|40|25|11|4|66|27|53
Sint-Truiden|40|22|5|13|61|46|43
Anderlecht|40|15|10|15|59|62|33
KAA Gent|40|13|12|15|53|57|29
KV Mechelen|40|13|12|15|48|61|29
KRC Genk|40|15|14|11|57|53|38
Standard Liège|40|16|9|15|44|46|37
Charleroi|40|14|9|17|50|50|34
KVC Westerlo|40|14|10|16|50|57|33
Royal Antwerp|40|13|9|18|43|48|31
OH Leuven|40|10|10|20|41|60|23
Zulte Waregem|36|13|9|14|53|53|48
Cercle Brugge|36|10|11|15|53|58|41
La Louvière|36|7|13|16|35|50|34
Dender|36|5|10|21|31|62|25''')
t('SCO1','''Celtic|38|26|4|8|73|41|82
Heart of Midlothian|38|24|8|6|67|34|80
Rangers|38|20|12|6|76|43|72
Motherwell|38|16|13|9|59|36|61
Hibernian|38|15|12|11|58|44|57
Falkirk|38|14|7|17|50|62|49
Dundee United|38|10|15|13|49|60|45
Dundee|38|11|9|18|42|61|42
Aberdeen|38|11|7|20|40|55|40
Kilmarnock|38|10|10|18|50|68|40
St. Mirren|38|8|10|20|30|55|34
Livingston|38|2|15|21|40|75|21''')
t('TUR1','''Galatasaray|34|24|5|5|77|30|77
Fenerbahçe|34|21|11|2|77|37|74
Trabzonspor|34|20|9|5|61|39|69
Beşiktaş|34|17|9|8|59|40|60
Başakşehir|34|16|9|9|58|35|57
Göztepe|34|14|13|7|42|32|55
Samsunspor|34|13|12|9|46|45|51
Çaykur Rizespor|34|10|11|13|46|52|41
Konyaspor|34|10|10|14|43|50|40
Kocaelispor|34|9|10|15|26|38|37
Alanyaspor|34|7|16|11|41|41|37
Gaziantep|34|9|10|15|43|58|37
Kasımpaşa|34|8|11|15|33|49|35
Gençlerbirliği|34|9|7|18|36|47|34
Eyüpspor|34|8|9|17|33|48|33
Antalyaspor|34|8|8|18|33|55|32
Kayserispor|34|6|12|16|27|62|30
Fatih Karagümrük|34|8|6|20|31|54|30''')
t('AUT1','''LASK|32|17|7|8|56|42|39
Sturm Graz|32|16|8|8|51|35|37
RB Salzburg|32|13|9|10|56|41|29
Austria Wien|32|14|5|13|45|50|29
Rapid Wien|32|12|8|12|36|41|27
TSV Hartberg|32|10|12|10|40|40|25
SV Ried|32|12|6|14|38|42|28
Wolfsberger AC|32|11|8|13|41|42|28
SCR Altach|32|10|12|10|36|39|27
Grazer AK|32|9|10|13|42|45|27
WSG Tirol|32|10|10|12|40|52|24
Blau-Weiß Linz|32|8|5|19|37|49|21''')
t('SUI1','''FC Thun|38|24|3|11|80|52|75
FC St. Gallen|38|20|10|8|72|47|70
FC Lugano|38|19|10|9|59|42|67
FC Sion|38|16|15|7|63|40|63
FC Basel|38|16|8|14|55|58|56
BSC Young Boys|38|15|10|13|80|69|55
FC Luzern|38|14|11|13|76|66|53
Servette FC|38|13|14|11|71|63|53
Lausanne-Sport|38|11|9|18|53|67|42
FC Zürich|38|11|5|22|49|72|38
Grasshopper|38|8|9|21|48|74|33
FC Winterthur|38|5|8|25|44|100|23''')
t('DEN1','''AGF|32|19|10|3|62|32|67
FC Midtjylland|32|16|12|4|72|36|60
FC Nordsjælland|32|15|5|12|51|46|50
Brøndby IF|32|13|6|13|44|35|45
Viborg FF|32|13|5|14|49|51|44
Sønderjyske|32|12|8|12|44|49|44
FC København|32|15|6|11|67|44|51
Odense BK|32|11|8|13|51|60|41
Silkeborg IF|32|10|6|16|41|67|36
Randers FC|32|9|8|15|33|47|35
FC Fredericia|32|9|7|16|45|68|34
Vejle Boldklub|32|5|9|18|36|60|24''')
t('POL1','''Lech Poznań|34|16|12|6|62|45|60
Górnik Zabrze|34|16|8|10|50|38|56
Jagiellonia|34|15|11|8|56|41|56
Raków|34|16|7|11|51|40|55
GKS Katowice|34|14|8|12|51|45|50
Legia Warszawa|34|12|13|9|42|37|49
Zagłębie Lubin|34|13|9|12|45|38|48
Wisła Płock|34|12|10|12|34|38|46
Pogoń Szczecin|34|13|6|15|47|49|45
Radomiak Radom|34|11|11|12|52|53|44
Korona Kielce|34|11|10|13|40|40|43
Motor Lublin|34|10|13|11|46|53|43
Cracovia|34|9|15|10|39|42|42
Widzew Łódź|34|12|6|16|41|41|42
Piast Gliwice|34|11|8|15|42|46|41
Lechia Gdańsk|34|12|7|15|62|65|38
Arka Gdynia|34|9|9|16|34|61|36
Termalica|34|9|7|18|43|65|34''')
t('ROU1','''Univ. Craiova|0|0|0|0|0|0|50
Univ. Cluj|0|0|0|0|0|0|46
CFR Cluj|0|0|0|0|0|0|43
Dinamo|0|0|0|0|0|0|39
Rapid|0|0|0|0|0|0|34
Argeș|0|0|0|0|0|0|32
UTA Arad|0|0|0|0|0|0|39
FCSB|0|0|0|0|0|0|37
Oțelul Galați|0|0|0|0|0|0|35
Botoșani|0|0|0|0|0|0|33
Csíkszereda|0|0|0|0|0|0|33
Petrolul|0|0|0|0|0|0|25
Farul Constanța|0|0|0|0|0|0|25
Hermannstadt|0|0|0|0|0|0|25
Unirea Slobozia|0|0|0|0|0|0|22
Metaloglobus|0|0|0|0|0|0|16''')
t('NOR1','''Viking FK|30|22|5|3|77|36|71
Bodø/Glimt|30|22|4|4|85|28|70
Tromsø IL|30|18|3|9|50|36|57
SK Brann|30|17|5|8|55|46|56
Sandefjord|30|15|3|12|55|42|48
Vålerenga|30|13|4|13|49|50|43
Rosenborg BK|30|11|9|10|45|42|42
Fredrikstad FK|30|11|9|10|38|35|42
Sarpsborg 08|30|11|8|11|48|50|41
Molde FK|30|12|3|15|46|42|39
HamKam|30|10|7|13|42|47|37
KFUM Oslo|30|8|11|11|42|41|35
Kristiansund BK|30|9|7|14|34|59|34
Bryne FK|30|8|7|15|37|56|31
Strømsgodset|30|6|2|22|37|72|20
FK Haugesund|30|2|3|25|22|80|9''')
t('IRL1','''Shamrock Rovers|36|19|9|8|56|33|66
Derry City|36|18|9|9|52|39|63
Shelbourne|36|15|14|7|48|37|59
Bohemians|36|16|6|14|48|39|54
St. Patrick's Athletic|36|13|13|10|42|32|52
Drogheda United|36|12|15|9|38|38|51
Sligo Rovers|36|11|8|17|42|54|41
Galway United|36|9|12|15|37|44|39
Waterford|36|11|6|19|41|60|39
Cork City|36|4|12|20|33|61|24''')
t('SWE1','''Mjällby AIF|30|23|6|1|57|18|75
Hammarby IF|30|19|5|6|60|29|62
GAIS|30|14|10|6|45|30|52
IFK Göteborg|30|16|3|11|41|33|51
Djurgårdens IF|30|13|10|7|52|32|49
Malmö FF|30|13|10|7|46|33|49
AIK|30|13|9|8|40|33|48
IF Elfsborg|30|12|4|14|45|51|40
IK Sirius|30|11|6|13|53|51|39
BK Häcken|30|9|8|13|42|50|35
Halmstads BK|30|10|5|15|24|50|35
Brommapojkarna|30|9|4|17|40|47|31
Degerfors IF|30|8|6|16|33|52|30
IFK Norrköping|30|8|5|17|40|57|29
Östers IF|30|6|8|16|29|48|26
IFK Värnamo|30|3|7|20|36|69|16''')
t('SAU1','''Al Nassr|34|28|2|4|91|28|86
Al Hilal|34|25|9|0|85|27|84
Al Ahli|34|25|6|3|71|25|81
Al Qadsiah|34|23|8|3|83|34|77
Al Ittihad|34|16|7|11|55|48|55
Al Taawoun|34|15|8|11|59|46|53
Al Ettifaq|34|14|8|12|51|55|50
Al Najmah|34|12|9|13|43|48|45
Al Hazem|34|11|9|14|38|57|42
Al Fayha|34|10|8|16|41|54|38
Al Fateh|34|9|10|15|41|55|37
Al Khaleej|34|10|7|17|54|62|37
Al Shabab|34|8|11|15|44|57|35
Al Kholood|34|9|6|19|39|61|33
Al Riyadh|34|7|9|18|35|63|30
Damac|34|6|11|17|32|55|29
Al Okhdood|34|5|5|24|27|70|20
Al Najma|34|3|7|24|32|76|16''')
t('USA1','''Philadelphia Union|34|20|6|8|57|35|66
Inter Miami CF|34|19|8|7|81|55|65
FC Cincinnati|34|20|5|9|52|40|65
San Diego FC|34|19|6|9|64|41|63
Vancouver Whitecaps|34|18|9|7|66|38|63
LAFC|34|17|9|8|65|40|60
Charlotte FC|34|19|2|13|55|46|59
Minnesota United|34|16|10|8|56|39|58
New York City FC|34|17|5|12|50|44|56
Seattle Sounders|34|15|10|9|58|48|55
Nashville SC|34|16|6|12|58|45|54
Columbus Crew|34|14|12|8|55|51|54
Chicago Fire|34|15|8|11|68|60|53
Orlando City|34|14|11|9|63|51|53
Austin FC|34|13|8|13|37|45|47
FC Dallas|34|11|11|12|52|55|44
Portland Timbers|34|11|11|12|41|48|44
New York Red Bulls|34|12|7|15|48|47|43
Real Salt Lake|34|12|5|17|38|49|41
San Jose Earthquakes|34|11|8|15|60|63|41
Colorado Rapids|34|11|8|15|44|56|41
Houston Dynamo|34|9|10|15|43|56|37
New England Revolution|34|9|9|16|44|51|36
Toronto FC|34|6|14|14|37|44|32
St. Louis City SC|34|8|8|18|44|58|32
LA Galaxy|34|7|9|18|46|66|30
CF Montréal|34|6|10|18|34|60|28
Atlanta United|34|5|13|16|38|63|28
Sporting Kansas City|34|7|7|20|46|70|28
DC United|34|5|11|18|30|66|26''')
t('KOR1','''Jeonbuk Hyundai|38|23|10|5|64|32|79
Daejeon Hana|38|18|11|9|58|46|65
Gimcheon Sangmu|38|18|7|13|59|45|61
Pohang Steelers|38|16|8|14|41|46|56
Gangwon FC|38|13|13|12|37|41|52
FC Seoul|38|12|13|13|50|52|49
Gwangju FC|38|15|9|14|40|41|54
FC Anyang|38|14|7|17|49|47|49
Ulsan HD FC|38|11|11|16|42|50|44
Suwon FC|38|11|9|18|51|58|42
Jeju United|38|10|9|19|40|53|39
Daegu FC|38|7|13|18|47|67|34''')
t('CHN1','''Shanghai Port|30|20|6|4|72|44|66
Shanghai Shenhua|30|19|7|4|67|35|64
Chengdu Rongcheng|30|17|9|4|60|28|60
Beijing Guoan|30|17|6|7|69|46|57
Shandong Taishan|30|15|8|7|69|46|53
Tianjin Jinmen Tiger|30|12|8|10|40|41|44
Zhejiang FC|30|10|12|8|60|51|42
Yunnan Yukun|30|11|9|10|47|52|42
Qingdao West Coast|30|10|10|10|39|43|40
Henan FC|30|10|7|13|52|48|37
Dalian Yingbo|30|9|9|12|30|45|36
Shenzhen Peng City|30|8|3|19|35|59|27
Wuhan Three Towns|30|6|7|17|34|62|25
Qingdao Hainiu|30|5|10|15|35|48|25
Meizhou Hakka|30|5|6|19|36|71|21
Changchun Yatai|30|4|7|19|26|52|19''')
t('AUS1','''Newcastle Jets|26|15|3|8|55|39|48
Adelaide United|26|12|7|7|46|36|43
Auckland FC|26|11|9|6|42|29|42
Melbourne Victory|26|11|7|8|44|33|40
Sydney FC|26|11|6|9|33|25|39
Melbourne City|26|10|8|8|33|33|38
Macarthur FC|26|9|7|10|37|44|34
Wellington Phoenix|26|9|6|11|36|48|33
Central Coast Mariners|26|8|8|10|35|42|32
Perth Glory|26|8|7|11|32|39|31
Brisbane Roar|26|6|8|12|27|36|26
Western Sydney Wanderers|26|5|6|15|27|43|21''')
t('IND1','''East Bengal|13|7|5|1|30|11|26
Mohun Bagan SG|13|7|5|1|23|9|26
Mumbai City FC|13|7|4|2|17|9|25
Bengaluru FC|13|6|5|2|18|12|23
Jamshedpur FC|13|6|4|3|15|10|22
Punjab FC|13|6|4|3|18|12|22
FC Goa|13|5|5|3|15|11|20
Kerala Blasters|13|5|2|6|15|17|17
NorthEast United|13|4|4|5|16|21|16
Inter Kashi|13|3|4|6|11|17|13
Odisha FC|13|2|5|6|14|22|11
Sporting Club Delhi|13|2|5|6|13|17|11
Chennaiyin FC|13|2|3|8|9|21|9
Mohammedan SC|13|0|3|10|7|32|3''')
t('XBRA1','''Flamengo|0|0|0|0|0|0|79
Palmeiras|0|0|0|0|0|0|76
Cruzeiro|0|0|0|0|0|0|70
Mirassol|0|0|0|0|0|0|67
Fluminense|0|0|0|0|0|0|64
Botafogo|0|0|0|0|0|0|63
Bahia|0|0|0|0|0|0|60
Sao Paulo|0|0|0|0|0|0|51
Gremio|0|0|0|0|0|0|49
Red Bull Bragantino|0|0|0|0|0|0|48
Atletico Mineiro|0|0|0|0|0|0|48
Santos|0|0|0|0|0|0|47
Corinthians|0|0|0|0|0|0|47
Vasco Da Gama|0|0|0|0|0|0|45
Vitoria|0|0|0|0|0|0|45
Internacional|0|0|0|0|0|0|44
Ceara|0|0|0|0|0|0|43
Fortaleza|0|0|0|0|0|0|43
Juventude|0|0|0|0|0|0|35
Sport Recife|0|0|0|0|0|0|17''')
t('XJPN1','''Kashima Antlers|0|0|0|0|0|0|76
Kashiwa Reysol|0|0|0|0|0|0|75
Kyoto Sanga|0|0|0|0|0|0|68
Sanfrecce Hiroshima|0|0|0|0|0|0|68
Vissel Kobe|0|0|0|0|0|0|64
Machida Zelvia|0|0|0|0|0|0|60
Urawa Reds|0|0|0|0|0|0|59
Kawasaki Frontale|0|0|0|0|0|0|57
Gamba Osaka|0|0|0|0|0|0|57
Cerezo Osaka|0|0|0|0|0|0|52
FC Tokyo|0|0|0|0|0|0|50
Avispa Fukuoka|0|0|0|0|0|0|48
Fagiano Okayama|0|0|0|0|0|0|45
Shimizu S-Pulse|0|0|0|0|0|0|44
Yokohama F Marinos|0|0|0|0|0|0|43
Nagoya Grampus|0|0|0|0|0|0|43
Tokyo Verdy|0|0|0|0|0|0|43
Yokohama FC|0|0|0|0|0|0|35
Shonan Bellmare|0|0|0|0|0|0|32
Albirex Niigata|0|0|0|0|0|0|24''')
# 하부 리그·배경 리그: 우승팀(및 승격)
CH={'ENG2':('Coventry City',['Coventry City','Ipswich Town','Hull City']),'ENG3':('Lincoln City',['Lincoln City','Cardiff City','Bolton Wanderers']),'ENG4':('Bromley',['Bromley','MK Dons','Cambridge United','Notts County']),
'ESP2':('Racing Santander',['Racing Santander','Deportivo de La Coruña','Málaga CF']),'ITA2':('Venezia',['Venezia','Frosinone','Monza']),'GER2':('Schalke 04',['Schalke 04','SV Elversberg','SC Paderborn']),
'GER3':('VfL Osnabrück',['VfL Osnabrück','Energie Cottbus','Würzburger Kickers']),'FRA2':('Troyes',['Troyes','Le Mans']),
'ARG1':('Estudiantes',[]),'MEX1':('Cruz Azul',[]),'XRUS1':('Zenit',[]),'XUKR1':('Shakhtar Donetsk',[]),'XGRE1':('AEK Athens',[]),'XCZE1':('Slavia Praha',[]),'XFIN1':('KuPS',[]),'XWAL1':('The New Saints',[]),
'XLUX1':('Atert Bissen',[]),'XCHI1':('Coquimbo Unido',[]),'XURU1':('Nacional',[]),'XPER1':('Universitario',[]),'XIDN1':('Persib Bandung',[]),'XVIE1':('Cong An Ha Noi',[]),'XISL1':('Vikingur Reykjavik',[]),'XBLR1':('ML Vitebsk',[])}
# 리그 우승(테이블 1위와 다를 때)
LGW={'USA1':'Inter Miami CF','AUS1':'Auckland FC','MEX1':'Cruz Azul','ARG1':'Estudiantes'}
LGX={'MEX1':'아페르투라 톨루카 · 클라우수라 크루스 아술','ARG1':'아페르투라 플라텐세 · 클라우수라 에스투디안테스','USA1':'정규 시즌 1위 필라델피아 유니언 · MLS컵 인터 마이애미','AUS1':'정규 시즌 1위 뉴캐슬 제츠 · 그랜드 파이널 오클랜드 FC'}
CUP={'ENG':('Manchester City','Manchester City'),'ESP':('Real Sociedad',None),'ITA':('Inter',None),'GER':('Bayern München',None),'FRA':('RC Lens',None),'POR':('Torreense',None),'NED':('AZ',None),'BEL':('Union Saint-Gilloise',None),
'SCO':('Celtic','St. Mirren'),'TUR':('Trabzonspor',None),'AUT':('LASK',None),'SUI':('FC St. Gallen',None),'DEN':('FC Midtjylland',None),'POL':('Górnik Zabrze',None),'ROU':('Univ. Craiova',None),'NOR':('Lillestrøm',None),
'IRL':('Shamrock Rovers',None),'SWE':('Mjällby AIF',None),'KSA':('Al Hilal',None),'KOR':('Jeonbuk Hyundai',None),'CHN':('Beijing Guoan',None),'BRA':('Corinthians',None),'JPN':('Machida Zelvia','Sanfrecce Hiroshima'),'ARG':('Independiente Rivadavia',None),
'GRE':('OFI Crete',None),'CZE':('Karviná',None),'FIN':('HJK',None),'WAL':('Caernarfon Town',None),'LUX':('Differdange',None),'UKR':('Dynamo Kyiv',None),'CHI':('Huachipato',None)}
CONT={'UCL':('Paris Saint-Germain','Arsenal'),'UEL':('Aston Villa','SC Freiburg'),'UECL':('Crystal Palace','Rayo Vallecano'),'LIB':('Flamengo','Palmeiras'),'SUD':('Lanús','Atletico Mineiro'),'ACL':('Al Ahli','Machida Zelvia')}
NT={'WC':('ESP','ARG','ENG')}
SCORERS={'ENG1':('Erling Haaland','Manchester City',27),'ESP1':('Kylian Mbappé','Real Madrid',25),'ITA1':('Lautaro Martínez','Inter',17),'GER1':('Harry Kane','Bayern München',36),'FRA1':('Estéban Lepaul','Stade Rennais',20),'GER2':('Noel Futkeu',None,19),'AUT1':('Otar Kiteishvili','Sturm Graz',15)}
AWARDS=[('2025 발롱도르','Ousmane Dembélé','Paris Saint-Germain'),('2024 발롱도르','Rodri','Manchester City'),('2026 월드컵 골든볼','Rodri','Manchester City'),('2026 월드컵 결승 MVP','Ferran Torres','FC Barcelona')]
WINTER='''Antoine Semenyo|Brennan Johnson|Jørgen Strand Larsen|Marc Guéhi|Conor Gallagher|Taty Castellanos|Pablo Felipe|Luis Guilherme|Lucas Paquetá|Guido Rodríguez|Niclas Füllkrug|Matteo Guendouzi|Gerson|Kenneth Taylor|Rodrigo De Paul|Petar Ratkov|Ademola Lookman|Ethan Nwaneri|Oleksandr Zinchenko|Tammy Abraham|Douglas Luiz|Donyell Malen|Evann Guessand|Samuel Iling-Junior|Fraser Forster|Ade Solanke|Alex Toth|Christos Mandas|Rayan|Julian Araujo|Romain Faivre|Kaye Furo|Paris Maghoma|Frank Onyeka|Pascal Groß|Facundo Buonanotte|Jeremy Sarmiento|Diego Coppola|Brajan Gruda|James Ward-Prowse|Hannes Delcroix|Luca Koleosho|Michael Obafemi|Oliver Sonne|Manuel Benson|Raheem Sterling|Kendry Páez|Axel Disasi|Tyrique George|David Datro Fofana|Aaron Anselmino|Romain Esse|Harry Tyrer|Oscar Bobb|Adama Traoré|Jack Harrison|Calum Chambers|Lewis Koumas|Jahmai Simpson-Pusey|Claudio Echeverri|Jadel Katongo|Kalvin Phillips|Harry Amass|Toby Collyer|Joe Hugill|Ethan Wheatley|Antonio Cordero|Lorenzo Lucca|Stefan Ortega|Luca Netz|Arnaud Kalimuendo|Melker Ellborg|Nilson Angulo|Timothée Pembélé|Jay Matete|Dan Neil|Arthur Masuaku|Aji Alese|Anthony Patterson|Simon Adingra|Adil Aouchiche|Patrick Roberts|Leo Hjelde|Souza|Kota Takai|Manor Solomon|Jamie Donley|Yang Min-hyeok|Damola Ajayi|Dane Scarlett|Callum Marshall|George Earthy|Andy Irving|Adam Armstrong|Angel Gomes|Ki-Jana Hoever|Marshall Munetsi|Fer López|Tawanda Chirewa|Yoon Do-young|Brian Madjo|Alysson|Jocelin Ta Bi|Mor Talla Ndiaye|Yisa Alao|Leo Castledine|Ato Ampah|Mohamed Kader Meite|Gustavo Nunes|Benjamin Arthur|Eiran Cashin|Ibrahim Osman|Andrew Moran|Kalvin Phillips'''.split('|')
import json; json.dump({'T':T,'CH':CH,'LGW':LGW,'LGX':LGX,'CUP':CUP,'CONT':CONT,'NT':NT,'SCORERS':SCORERS,'AWARDS':AWARDS,'WINTER':WINTER},open('/home/claude/work/tm/out/s2526.json','w'),ensure_ascii=False)
print(len(T), len(WINTER))
