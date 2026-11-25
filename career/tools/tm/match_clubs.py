import json, re, unicodedata, collections
G=json.load(open('game_clubs.json')); TM=json.load(open('tm_clubs.json')); comps=json.load(open('tm_comps.json'))
vote=json.load(open('comp_country_vote.json'))
CN={'England':'ENG','Scotland':'SCO','Wales':'WAL','Spain':'ESP','Italy':'ITA','Germany':'GER','France':'FRA','Portugal':'POR','Netherlands':'NED','Belgium':'BEL','Türkiye':'TUR','Austria':'AUT','Switzerland':'SUI','Denmark':'DEN','Poland':'POL','Sweden':'SWE','Norway':'NOR','Russia':'RUS','Greece':'GRE','Czech Republic':'CZE','Hungary':'HUN','Ukraine':'UKR','Croatia':'CRO','Japan':'JPN','Korea, South':'KOR','China':'CHN','Australia':'AUS','United States':'USA','Canada':'USA','Mexico':'MEX','Argentina':'ARG','Brazil':'BRA','Monaco':'FRA','Liechtenstein':'SUI','Andorra':'AND','New Zealand':'AUS','Qatar':'QAT','Slovakia':'SVK'}
PRE=[('CLPD','CHI'),('CHLA','CHI'),('CHL1','CHI'),('CH1C','CHI'),('CLPF','CHI'),('CLPI','CHI'),('URU','URU'),('TDe','PER'),('PERC','PER'),('PR1','PAR'),('IN1L','IDN'),('IDN','IDN'),('VIE','VIE'),('BO1','BOL'),('EL1','ECU'),('ECP','ECU'),('ECSE','ECU'),('VZ1','VEN'),('COL','COL'),('CO2','COL'),('COPO','COL'),('IS1','ISL'),('IS2','ISL'),('ISP','ISL'),('ISL','ISL'),('LUX','LUX'),('FI1','FIN'),('FI2','FIN'),('FIS','FIN'),('FIL','FIN'),('F1CL','FIN'),('WER','BLR'),('WRPO','BLR'),('AZ1','AZE'),('ASPK','AZE'),('BU1','BUL'),('BU2','BUL'),('BULP','BUL'),('ZYP','CYP'),('CPO1','CYP'),('THA','THA'),('TH','THA'),('UAE','UAE'),('UALC','UAE'),('RO1','ROU'),('RO2','ROU'),('ROMP','ROU'),('SA1','KSA'),('SA2','KSA'),('SAKC','KSA'),('IR1','IRL'),('IR2','IRL'),('IRPO','IRL'),('ILIP','IRL'),('IND','IND'),('INDP','IND'),('RU1','RUS'),('RU2','RUS'),('GR1','GRE'),('TS1','CZE'),('TS2','CZE'),('UNG','HUN'),('UKR','UKR'),('JAP','JPN'),('RSK','KOR'),('K4L','KOR'),('CSL','CHN'),('AUS','AUS'),('A2','AUS'),('MLS','USA'),('USL','USA'),('USFD','USA'),('SC','SCO'),('WAL','WAL'),('KR1','CRO')]
def cty(v):
  c=collections.Counter()
  if v.get('country'): return CN.get(v['country'],v['country'])
  for k,n in v['comp'].items():
    if k in vote: c[CN.get(vote[k],vote[k])]+=n; continue
    for p,code in PRE:
      if k.startswith(p): c[code]+=n; break
  return c.most_common(1)[0][0] if c else None
STOP=set('fc cf afc sc ac sv fk cd club de del the cfc ca sd ud rc rcd ss as us ec se cr sk bk if ik ff tsv vfb vfl fsv 1 1. 04 05 07 09 1846 1848 1893 1899 1900 1904 1907 1909 calcio futbol football clube esporte sociedade sport sporting* ssc spa sad sa'.split())
ALIAS={'man utd':'manchester united','nottm forest':'nottingham forest','spurs':'tottenham hotspur','lombardia':'inter','milano':'milan','latium':'lazio','bergamo':'atalanta','wolves':'wolverhampton wanderers','sheff wed':'sheffield wednesday','sheff utd':'sheffield united','m gladbach':'borussia monchengladbach','psv':'psv eindhoven','om':'olympique marseille','ol':'olympique lyon','paris sg':'paris saint germain','qpr':'queens park rangers','west brom':'west bromwich albion','newcastle utd':'newcastle united','leeds united':'leeds united'}
def norm(s):
  s=''.join(ch for ch in unicodedata.normalize('NFD',(s or '').lower()) if unicodedata.category(ch)!='Mn')
  s=re.sub(r'[^a-z0-9 ]',' ',s.replace("'",'')); s=' '.join(s.split())
  return ALIAS.get(s,s)
def toks(s): return [t for t in norm(s).split() if t not in STOP and not t.isdigit()] or norm(s).split()
YOUTH=re.compile(r'\b(u\d\d|u-\d\d|ii|b|youth|reserves?|jugend|juvenil|primavera|sub ?\d\d|academy|res\.?|2)\b',re.I)
idx=collections.defaultdict(list)
for tid,v in TM.items():
  v['cty']=cty(v)
  for nm in set(v['names'] or [v['name']]):
    for t in toks(nm): idx[t].append(tid)
def score(a,b):
  A,B=set(toks(a)),set(toks(b))
  if not A or not B: return 0
  j=len(A&B)/len(A|B)
  if norm(a)==norm(b): j=1.2
  return j
res={}; rows=[]
for g in G:
  nat=g['nat']; gname=g['en']; isB=bool(g['parent']) or bool(re.search(r'\b(ii|b|u23|u21|castilla|atletic|fut)\b',norm(gname)))
  cand=set()
  for t in toks(gname): cand.update(idx.get(t,[]))
  best=None
  for tid in cand:
    v=TM[tid]
    if v['cty'] and v['cty']!=nat: continue
    nm=v['name']
    yth=bool(YOUTH.search(nm))
    if yth!=isB: continue
    s=max(score(gname,x) for x in (v['names'] or [nm]))
    if v['cty']==nat: s+=.05
    s+=min(.1,sum(v['comp'].values())/20000)
    if not best or s>best[0]: best=(s,tid,nm,v['cty'])
  st='ok' if best and best[0]>=.9 else 'weak' if best and best[0]>=.55 else 'none'
  res[g['id']]={'tm':best[1] if best and st!='none' else None,'s':round(best[0],2) if best else 0,'tmn':best[2] if best else '','st':st}
json.dump(res,open('club_map.json','w'),ensure_ascii=False)
c=collections.Counter(v['st'] for v in res.values()); print(c)
real=[g for g in G if not g['id'].startswith('X')]
print('real', collections.Counter(res[g['id']]['st'] for g in real))
for g in real[:400]:
  r=res[g['id']]
  if r['st']!='ok': print(g['id'],g['en'],'->',r['tmn'],r['s'])
