import json, re, unicodedata, collections, csv
from difflib import SequenceMatcher
G={g['id']:g for g in json.load(open('game_clubs.json'))}; TMC=json.load(open('tm_clubs.json'))
V=json.load(open('club_map2.json')); NM=json.load(open('club_map.json'))
STOP=set('fc cf afc sc ac sv fk cd club de del the cfc ca sd ud rc rcd ss as us ec se cr sk bk if ik ff tsv vfb vfl fsv calcio futbol football clube esporte sociedade ssc spa sad sa royal r k kv kvc kaa krc'.split())
def n(s):
  s=''.join(ch for ch in unicodedata.normalize('NFD',(s or '').lower()) if unicodedata.category(ch)!='Mn')
  return ' '.join(t for t in re.sub(r'[^a-z0-9 ]',' ',s).split() if t not in STOP)
ALIAS={'ITA_INT':'Inter Milan','ITA_MIL':'AC Milan','ITA_LAZ':'SS Lazio','ITA_ATA':'Atalanta BC','ENG_MUN':'Manchester United','ENG_NFO':'Nottingham Forest','ENG_TOT':'Tottenham Hotspur','GER_BMG':'Borussia Mönchengladbach','FRA_OM':'Olympique Marseille','FRA_OL':'Olympique Lyon','FRA_PSG':'Paris Saint-Germain','BEL_STV':'Sint-Truidense VV','BEL_USG':'Union Saint-Gilloise','DEN_BIF':'Brøndby IF','DEN_AGF':'Aarhus GF','DEN_FCN':'FC Nordsjaelland','TUR_KAS':'Kasimpasa','FRA_LAV':'Stade Lavallois','ENG_WRE':'Wrexham AFC','ENG_MKD':'Milton Keynes Dons','ESP_RAC':'Racing Santander','BEL_OHL':'Oud-Heverlee Leuven','AUT_AUS':'Austria Vienna','AUT_SCA':'SCR Altach','DEN_SON':'Sønderjyske','POR_MAR':'CS Marítimo','FRA_DIJ':'Dijon FCO','FRA_GUI':'EA Guingamp','ENG_SHU':'Sheffield United','ENG_CAR':'Cardiff City','ENG_SWA':'Swansea City','SCO_HEA':'Heart of Midlothian','GER_FCN':'1.FC Nuremberg','GER_FCB':'Bayern Munich','ESP_DEP':'Deportivo de La Coruña','GER_SGE':'Eintracht Frankfurt','SUI_GCZ':'Grasshopper Club Zurich','BEL_CHA':'Royal Charleroi SC'}
byname=collections.defaultdict(list)
for tid,v in TMC.items():
  for x in v['names'] or [v['name']]: byname[n(x)].append(tid)
out={}; rev=[]
for gid,g in G.items():
  ge=ALIAS.get(gid,g['en']); cands={}
  v=V.get(gid)
  if v and v['src']=='vote': cands[v['tm']]=v.get('share',0)
  if v and v.get('name_tm'): cands.setdefault(v['name_tm'],0)
  if v and v['src']!='vote': cands.setdefault(v['tm'],0)
  if gid in ALIAS:
    for t in byname.get(n(ALIAS[gid]),[]): cands.setdefault(t,0)
  best=None
  for tid,sh in cands.items():
    tn=TMC.get(tid,{}).get('name','')
    ns=max([SequenceMatcher(None,n(ge),n(x)).ratio() for x in (TMC.get(tid,{}).get('names') or [tn])]+[0])
    if n(ge) and (n(ge) in n(tn) or n(tn) in n(ge)): ns=max(ns,.85)
    sc=sh*1.0+ns*.8
    if not best or sc>best[0]: best=(sc,tid,tn,sh,ns)
  if not best: out[gid]=None; continue
  conf='높음' if best[0]>=1.0 or (best[3]>=.4 and best[4]>=.5) or best[4]>=.92 else '보통' if best[0]>=.75 else '낮음'
  out[gid]={'tm':best[1],'tmn':best[2],'share':best[3],'ns':round(best[4],2),'conf':conf}
json.dump(out,open('club_final.json','w'),ensure_ascii=False)
real=[g for g in G if not g.startswith('X')]
print('real', collections.Counter((out[g] or {}).get('conf','없음') for g in real))
print('X', collections.Counter((out[g] or {}).get('conf','없음') for g in G if g.startswith('X')))
for g in real:
  o=out[g]
  if not o or o['conf']=='낮음': print(g,G[g]['en'],'->',o and o['tmn'],o and (o['share'],o['ns']))
