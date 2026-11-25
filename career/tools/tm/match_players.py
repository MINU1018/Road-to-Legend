import csv, unicodedata, datetime, collections, re, json
P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'
def nrm(s): s=(s or '').replace('þ','th').replace('Þ','Th').replace('ð','d').replace('Ð','D'); s=''.join(c for c in unicodedata.normalize('NFD',(s or '').lower()) if unicodedata.category(c)!='Mn'); s=s.replace('ø','o').replace('ł','l').replace('ß','ss').replace('æ','ae').replace('đ','d').replace('ı','i'); return ['junior' if t=='jr' else t for t in re.sub(r'[^a-z ]',' ',s).split()]
base=datetime.date(2000,1,1)
TM={}; BYN=collections.defaultdict(list); BYD=collections.defaultdict(list); BYY=collections.defaultdict(list); BYTOK=collections.defaultdict(list)
for r in csv.DictReader(open(P+'player_profiles/player_profiles.csv',encoding='utf-8')):
  if not r['date_of_birth']: continue
  nm=re.sub(r'\s*\(\d+\)$','',r['player_name']); t=nrm(nm); r['_t']=t; r['_n']=' '.join(t); r['_home']=nrm(r['name_in_home_country']); r['_cz']=[x.strip() for x in r['citizenship'].split('  ') if x.strip()]
  TM[r['player_id']]=r; BYN[r['_n']].append(r); BYD[r['date_of_birth']].append(r); BYY[r['date_of_birth'][:4]].append(r)
  for x in set(t+r['_home']):
    if len(x)>2: BYTOK[(x,r['date_of_birth'][:4])].append(r)
FC=[]
for l in open('/tmp/fc_all.txt',encoding='utf-8'):
  k,i,nm,d,nat,club=l.rstrip('\n').split('\t')
  dob=(base+datetime.timedelta(days=int(d))).isoformat() if k=='F' else d
  FC.append(dict(k=k,id=i,nm=nm,dob=dob,nat=nat,club=club,t=nrm(nm)))
# 1st pass exact name+dob → nat map
natmap=collections.defaultdict(collections.Counter)
def take(f,r,tier,why=''):
  f['tm']=r['player_id']; f['tier']=tier; f['why']=why; f['tmdob']=r['date_of_birth']; f['tmname']=re.sub(r'\s*\(\d+\)$','',r['player_name']); f['tmclub']=r['current_club_name']
used=set()
for f in FC:
  n=' '.join(f['t'])
  c=[r for r in BYN.get(n,[]) if (r['date_of_birth']==f['dob'] if f['k']=='F' else r['date_of_birth'][:7]==f['dob'])]
  if len(c)==1: take(f,c[0],1); used.add(c[0]['player_id']); natmap[f['nat']][c[0]['_cz'][0] if c[0]['_cz'] else '']+=1
NM={k:v.most_common(1)[0][0] for k,v in natmap.items() if v}
INV=collections.defaultdict(set)
for k,v in natmap.items():
  for cz,n in v.items():
    if n>=max(2,v.most_common(1)[0][1]*.05): INV[k].add(cz)
def natok(f,r): return bool(set(r['_cz'])&INV.get(f['nat'],{NM.get(f['nat'])}))
from difflib import SequenceMatcher
def sim(a,b): return SequenceMatcher(None,' '.join(sorted(a)),' '.join(sorted(b))).ratio()
def good(f,r):
  a=f['t']
  for b in (r['_t'],r['_home']):
    if not b: continue
    if ov(a,b)>=1 or sim(a,b)>=.8: return True
    if a and b and a[-1]==b[-1] and a[0][0]==b[0][0]: return True
    # 애칭·줄임말 (Vini Jr ↔ Vinicius Junior): 모든 토큰이 상대 토큰의 앞부분
    if a and b and all(any(y.startswith(x) or x.startswith(y) for y in b) for x in a if len(x)>=2) and len(a)>=1: return True
  return False
def strict(f,r):
  a=f['t']
  for b in (r['_t'],r['_home']):
    if len(a)<2 or len(b)<2: continue
    A,B=set(a),set(b)
    if (A<=B or B<=A): return True
    # 성이 같고(순서 무관) 나머지 이름이 거의 같음 (Jun / Joon)
    common=A&B
    if common and any(len(x)>3 for x in common):
      ra=' '.join(sorted(A-common)); rb=' '.join(sorted(B-common))
      if ra and rb and SequenceMatcher(None,ra,rb).ratio()>=.75: return True
  return False
def ov(a,b): A,B=set(x for x in a if len(x)>1),set(x for x in b if len(x)>1); return len(A&B)/max(1,min(len(A),len(B)))
for f in FC:
  if 'tm' in f: continue
  yr=f['dob'][:4]
  # 2: exact dob + surname / token overlap
  if f['k']=='F':
    c=[r for r in BYD.get(f['dob'],[]) if r['player_id'] not in used and good(f,r)]
    if len(c)==1: take(f,c[0],2,'생일 같음+이름 일부'); used.add(c[0]['player_id']); continue
  # 3: same name, same year → adopt TM dob
  n=' '.join(f['t']); c=[r for r in BYN.get(n,[]) if r['player_id'] not in used and r['date_of_birth'][:4]==yr]
  if len(c)==1: take(f,c[0],3,'이름 같음+같은 해'); used.add(c[0]['player_id']); continue
  # 4: same year + token overlap + nationality
  cand={}
  for x in f['t']:
    if len(x)>2:
      for r in BYTOK.get((x,yr),[]): cand[r['player_id']]=r
  c=[r for r in cand.values() if r['player_id'] not in used and natok(f,r) and strict(f,r)]
  if len(c)==1:
    r=c[0]; full=ov(f['t'],r['_t'])>=1 or ov(f['t'],r['_home'])>=1
    cs=SequenceMatcher(None,' '.join(nrm(f['club'])),' '.join(nrm(r['current_club_name']))).ratio()
    take(f,r,4 if cs>=.6 else 6,'같은 해+국적+이름 비슷'+(' · 구단 같음' if cs>=.6 else ' · 구단 다름(검토)')); used.add(r['player_id']); continue
  if len(c)>1: f['tier']=8; f['why']=f'후보 {len(c)}명'; f['cands']=[(re.sub(r"\s*\(\d+\)$","",r['player_name']),r['date_of_birth'],r['current_club_name']) for r in c[:4]]; continue
  f['tier']=9
cnt=collections.Counter((f['k'],f.get('tier')) for f in FC); print(sorted(cnt.items()))
# dob diffs
def dd(f):
  if f['k']!='F' or 'tmdob' not in f: return 0
  return abs((datetime.date.fromisoformat(f['tmdob'])-datetime.date.fromisoformat(f['dob'])).days)
big=[f for f in FC if 'tm' in f and dd(f)>0]; print('dob changes', len(big), 'over 60d', sum(1 for f in big if dd(f)>60))
json.dump([{k:v for k,v in f.items() if k!='t'} for f in FC],open('player_match.json','w'),ensure_ascii=False)
for t in (3,4,5,8):
  print('== tier',t); [print(' ',f['nm'],f['dob'],f['club'],'|',f.get('tmname'),f.get('tmdob'),f.get('tmclub'),f.get('cands','')) for f in [x for x in FC if x.get('tier')==t][:8]]
