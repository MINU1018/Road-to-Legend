import json, re, unicodedata, difflib
G=json.load(open('/home/claude/work/tm/game_clubs.json')); S=json.load(open('/home/claude/work/tm/out/s2526.json'))
def norm(s):
  s=unicodedata.normalize('NFD',s); s=''.join(c for c in s if unicodedata.category(c)!='Mn').lower()
  s=s.replace('ß','ss').replace('ø','o').replace('æ','ae').replace('ı','i').replace('ł','l')
  s=re.sub(r'[^a-z0-9 ]',' ',s)
  return ' '.join(t for t in s.split() if t not in ('fc','cf','sc','ac','afc','cd','ud','sv','fk','if','bk','sk','rc','as','ss','us','club','de','sl','cp','ca','sad','1','04','05','aik','ik','kv','krc','kaa','vfb','vfl','tsg','bsc','ogc','sco','sporting')) or s.strip()
ALIAS={'Inter':'Inter Milan','Milan':'AC Milan','Roma':'AS Roma','Lazio':'SS Lazio','Atalanta':'Atalanta BC','Bayern München':'Bayern Munich','Celta':'Celta Vigo','Athletic Club':'Athletic Bilbao','Atlético de Madrid':'Atletico Madrid','Union Saint-Gilloise':'Union SG','Sint-Truiden':'Sint-Truidense','KAA Gent':'Gent','Heart of Midlothian':'Hearts','Manchester City':'Manchester City','Univ. Craiova':'Universitatea Craiova','Univ. Cluj':'Universitatea Cluj','Al Ahli':'Al Ahli Saudi','LAFC':'Los Angeles FC','Ulsan HD FC':'Ulsan HD','Mohun Bagan SG':'Mohun Bagan','Paris Saint-Germain':'Paris Saint-Germain','PSV':'PSV Eindhoven','AZ':'AZ Alkmaar','NEC Nijmegen':'NEC','Red Bull Bragantino':'Bragantino','Sao Paulo':'São Paulo','Gremio':'Grêmio','Atletico Mineiro':'Atlético Mineiro','Vasco Da Gama':'Vasco da Gama','Ceara':'Ceará','Vitoria':'Vitória','Yokohama F Marinos':'Yokohama F. Marinos','Machida Zelvia':'FC Machida Zelvia','Urawa Reds':'Urawa Red Diamonds'}
CF=json.load(open('/home/claude/work/tm/club_final.json'))
for g in G: g['names']=[g['en']]+([CF[g['id']]['tmn']] if CF.get(g['id']) and CF[g['id']].get('tmn') else [])
GID={'Manchester United':'ENG_MUN','Tottenham Hotspur':'ENG_TOT','Wolverhampton Wanderers':'ENG_WOL','Inter':'ITA_INT','Milan':'ITA_MIL','Lazio':'ITA_LAZ','Atalanta':'ITA_ATA','Napoli':'ITA_NAP','Olympique de Marseille':'FRA_OM','Olympique Lyonnais':'FRA_OL','Paris Saint-Germain':'FRA_PSG','Deportivo Alavés':'ESP_ALA','Real Oviedo':'ESP_OVI','Racing Santander':'ESP_RAC','Western Sydney Wanderers':'AUS_WSW','Al Ahli':'KSA_AHL','LAFC':'USA_LAFC','Sporting Kansas City':'USA_SKC','Borussia Mönchengladbach':'GER_BMG','NEC Nijmegen':'NED_NEC','Sint-Truiden':'BEL_STV','Univ. Cluj':'ROU_UCL','KFUM Oslo':'NOR_KFUM',"St. Patrick's Athletic":'IRL_STP','Mohun Bagan SG':'IND_MOH','Urawa Reds':'XJPN_URAWAREDS'}
def cand(nat=None,lg=None):
  return [g for g in G if (lg and g['lg']==lg) or (nat and g['nat']==nat)]
def best(name,pool):
  n=norm(ALIAS.get(name,name)); bs=(0,None)
  for g in pool:
    for nm in g['names']:
      m=norm(nm)
      sc=difflib.SequenceMatcher(None,n,m).ratio()
      if n and (n==m): sc=1.5
      elif n and (n in m.split() or m in n.split() or (len(n)>3 and (n in m or m in n))): sc=max(sc,.9)
      if sc>bs[0]: bs=(sc,g)
  return bs
NATOF={'ENG':'ENG','ESP':'ESP','ITA':'ITA','GER':'GER','FRA':'FRA','POR':'POR','NED':'NED','BEL':'BEL','SCO':'SCO','TUR':'TUR','AUT':'AUT','SUI':'SUI','DEN':'DEN','POL':'POL','ROU':'ROU','NOR':'NOR','IRL':'IRL','SWE':'SWE','SAU':'KSA','USA':'USA','KOR':'KOR','CHN':'CHN','AUS':'AUS','IND':'IND','BRA':'BRA','JPN':'JPN','ARG':'ARG','MEX':'MEX','RUS':'RUS','UKR':'UKR','GRE':'GRE','CZE':'CZE','FIN':'FIN','WAL':'WAL','LUX':'LUX','CHI':'CHI','URU':'URU','PER':'PER','IDN':'IDN','VIE':'VIE','ISL':'ISL','BLR':'BLR','KSA':'KSA'}
def natOfKey(k): k=k.lstrip('X'); return NATOF.get(k[:3],k[:3])
lgnat={}
for g in G:
  if g['lg']: lgnat[g['lg']]=lgnat.get(g['lg']) or g['nat']
def resolve(name, lg=None, nat=None):
  if name in GID and any(g['id']==GID[name] for g in G): return GID[name],2
  if lg and lg not in lgnat and 'X'+lg in lgnat: lg='X'+lg
  nat=nat or (lgnat.get(lg) if lg else None)
  pool=cand(nat,lg)
  sc,g=best(name,pool)
  return (g['id'] if g and sc>=.72 else None), sc
miss=[]
OUT={'T':{}}
for k,rows in S['T'].items():
  lg=k if k in lgnat else ('X'+k if 'X'+k in lgnat else k)
  out=[]
  for r in rows:
    gid,sc=resolve(r[0],lg)
    if not gid: miss.append((k,r[0],round(sc,2)))
    out.append([gid or r[0]]+[int(x) for x in r[1:]])
  OUT['T'][lg]=out
def rs(name,key):
  lg=key if key in lgnat else ('X'+key if 'X'+key in lgnat else None)
  nat=natOfKey(key) if not lg else None
  gid,sc=resolve(name,lg,nat)
  if not gid:
    gid,sc=resolve(name,None,nat or lgnat.get(lg))
  if not gid: miss.append((key,name,round(sc,2)))
  return gid or name
OUT['CH']={}
for k,(c,pr) in S['CH'].items():
  lg=k if k in lgnat else ('X'+k if 'X'+k in lgnat else k)
  OUT['CH'][lg]=[rs(c,k),[rs(x,k) for x in pr]]
OUT['LGW']={k:rs(v,k) for k,v in S['LGW'].items()}; OUT['LGX']=S['LGX']
OUT['CUP']={}
for n,(a,b) in S['CUP'].items(): OUT['CUP'][n]=[rs(a,n), rs(b,n) if b else None]
# 대륙: 이름으로 전체에서
def anyres(name):
  if name in GID: return GID[name]
  bs=(0,None)
  for g in G:
    n=norm(ALIAS.get(name,name)); sc=max(1.5 if norm(x)==n else difflib.SequenceMatcher(None,n,norm(x)).ratio() for x in g['names'])
    if g['lg'] and not g['lg'].startswith('X'): sc+=.01
    if sc>bs[0]: bs=(sc,g)
  if bs[0]<.8: miss.append(('ANY',name,round(bs[0],2))); return name
  return bs[1]['id']
OUT['CONT']={k:[anyres(a),anyres(b)] for k,(a,b) in S['CONT'].items()}
OUT['NT']=S['NT']; OUT['SCORERS']={k:[n,anyres(c) if c else None,g] for k,(n,c,g) in S['SCORERS'].items()}; OUT['AWARDS']=S['AWARDS']; OUT['WINTER']=S['WINTER']
json.dump(OUT,open('/home/claude/work/tm/out/s26g.json','w'),ensure_ascii=False)
for m in miss: print(m)
print(len(miss))
