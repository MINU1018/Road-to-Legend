# TM 자료 → 게임 데이터 파일 (data_tm.js: 새 게임에 필요한 핵심 / data_tmh.js: 경력·구단 역사 상세)
import json, csv, re, collections, datetime, random, unicodedata
P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'
S=json.load(open('out/stage1.json')); CL=json.load(open('out/clubs.json')); S26=json.load(open('out/s26g.json'))
PM=json.load(open('player_match.json')); FD=json.load(open('/tmp/fcdump.json'))
G={g['id']:g for g in json.load(open('game_clubs.json'))}
D0=datetime.date(2000,1,1)
def days(s): 
  y,m,d=(s.split('-')+['15','15'])[:3]; return (datetime.date(int(y),int(m),int(d))-D0).days
def b36(n): 
  n=int(n); s=''; neg=n<0; n=abs(n)
  while True:
    n,r=divmod(n,36); s='0123456789abcdefghijklmnopqrstuvwxyz'[r]+s
    if not n: break
  return ('-' if neg else '')+s
rnd=random.Random(2627)
# ---- 키: TM id → 게임 fcid ----
KEY={}
for tm,k in S['M'].items():
  if k.startswith('y:'):
    f=FD['yth'].get(k[2:]); 
    if f is not None: KEY[tm]=str(f)
  else: KEY[tm]=k
IDX=FD['idx']  # fcid -> [i, club, dob, ovr, val, nat, name, pos]
prof={}
for r in csv.DictReader(open(P+'player_profiles/player_profiles.csv',encoding='utf-8')): prof[r['player_id']]=r
# ---- 국적: TM 시민권 → 게임 코드 (실선수 쌍에서 학습) ----
cvote=collections.defaultdict(collections.Counter)
for tm,f in KEY.items():
  pr=prof.get(tm); 
  if not pr or f not in IDX: continue
  c0=re.split(r'\s{2,}',pr['citizenship'].strip())[0] if pr['citizenship'] else ''
  if c0: cvote[c0][IDX[f][5]]+=1
CITY={c:v.most_common(1)[0][0] for c,v in cvote.items() if v.most_common(1)[0][1]>=2}
CITY.update({'Korea, North':'PRK','Korea, South':'KOR'})
def natc(pr):
  if not pr or not pr['citizenship']: return ''
  return CITY.get(re.split(r'\s{2,}',pr['citizenship'].strip())[0],'')
# ---- 생년월일 보정 ----
DOB={}
for f in PM:
  if f.get('tier',9)>4 or not f.get('tmdob') or not f.get('tm'): continue
  k=KEY.get(f['tm']); 
  if not k or k not in IDX: continue
  td=days(f['tmdob'])
  if td!=IDX[k][2]: DOB[k]=td
print('dob fixes', len(DOB))
# ---- 팀 색인 ----
TI={}; TL=[]
FREQ=collections.Counter()
for tm in S['M']:
  for r in S['car'].get(tm,[]): FREQ[r[2]]+=1
  for r in S['TX'].get(tm,[]): FREQ[r[1]]+=1; FREQ[r[2]]+=1
for tm in S['legrows']:
  for r in S['legrows'][tm]: FREQ[r[2]]+=1
  for r in S['TX'].get(tm,[]): FREQ[r[1]]+=1; FREQ[r[2]]+=1
for k,_ in FREQ.most_common():
  if k: TI[k]=len(TL); TL.append(k)
def ti(k):
  if k not in TI: TI[k]=len(TL); TL.append(k)
  return b36(TI[k])
NAMES=S['NAMES']
# ---- 시장가치·대표팀 ----
VAL={KEY[t]:v[1]//10000 for t,v in S['LAST'].items() if t in KEY and v[1]}
CAPS={KEY[t]:v for t,v in S['CAPS'].items() if t in KEY}
# ---- 2025/26 이동 추정 ----
fold=lambda s: re.sub(r'[^a-z ]','',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip()
WIN=set(fold(n) for n in S26['WINTER'])
LOAN={fold(n):(a,b) for n,a,b in FD['loans']}
T2G=S['T2G']; YP={}
for r in csv.DictReader(open(P+'team_children/team_children.csv',encoding='utf-8')):
  if r['child_team_id']!=r['parent_team_id']: YP[r['child_team_id']]=r['parent_team_id']
def tkey(tid):
  if not tid or tid in ('515','123','0'): return ''
  if tid in T2G: return T2G[tid]
  p=YP.get(tid)
  if p and p in T2G: return 'y'+tid
  return 't'+tid
def own(k):  # 유스팀 → 부모 게임 구단
  if k and k[0]=='y':
    p=YP.get(k[1:]); return T2G.get(p,k)
  return k
def parentOf(gid):
  g=G.get(gid); return (g or {}).get('parent')
MV={}; jan=lambda: days('2026-01-%02d'%rnd.randint(2,31)); summer=lambda: days('2026-06-20')+rnd.randint(0,41)
nmv=collections.Counter()
for tm,k in KEY.items():
  if k not in IDX: continue
  pr=prof.get(tm); 
  if not pr: continue
  fc=IDX[k][1]; nm=fold(IDX[k][6])
  if int(k) in [int(x) for x in FD['fa'][:0]]: pass
  ln=LOAN.get(nm); owner=ln[0] if ln and ln[1]==fc else fc
  cur=tkey(pr['current_club_id']); lf=tkey(pr['on_loan_from_club_id']) if pr['on_loan_from_club_id'] else ''
  out=[]
  if lf and cur:
    if ln and own(cur)==fc and own(lf)==owner: cur=None  # 같은 임대가 이어짐
    else: out.append([days('2026-06-30'),'lret',cur,lf]); cur=lf
  if cur is not None:
    same=lambda a,b: a==b or own(a)==own(b) or parentOf(own(a))==own(b) or parentOf(own(b))==own(a)
    if not owner: pass
    elif not cur: out.append([summer(),'free','',owner])
    elif not same(cur,owner):
      w=nm in WIN
      out.append([jan() if w else summer(),'buy',cur,owner]); nmv['win' if w else 'sum']+=1
  if ln and ln[1]==fc and owner!=fc and not (lf and own(tkey(pr['current_club_id']))==fc): out.append([days('2026-07-01')+rnd.randint(0,30),'loan',owner,fc])
  if out: MV[k]=out
print('moves', nmv, len(MV))
# ---- 선수별 기록 문자열 ----
def loanspans(tx):
  sp=[]; tx=sorted(tx)
  for i,r in enumerate(tx):
    if r[3]=='l':
      end=next((x[0] for x in tx[i+1:]),'2026-07-01'); sp.append((r[2],r[0],end))
  return sp
def isloan(sp,k,y):
  d='%d-10-01'%y
  return any(a==k and s<=d<e for a,s,e in sp)
HP={}
D2=lambda d: b36(days(d))
M2=lambda d: b36((int(d[:4])-2000)*12+int(d[5:7])-1)
TF=collections.Counter()
NOTEAM={'t515','t123','t2113','t75','t2077'}  # 무소속·은퇴·휴식·미상·징계
def pstr(key, car, tx, inj, val):
  tx=[[r[0],'' if r[1] in NOTEAM else r[1],'' if r[2] in NOTEAM else r[2]]+list(r[3:]) for r in tx]
  c=' '.join('%s.%s.%s.%d.%d.%d'%(b36(r[0]-2000),r[1],ti(r[2]),r[3],r[4],r[5]) for r in sorted(car,key=lambda r:(r[0],-r[3])))
  t=' '.join(('%s.%s.%s.%s.%s'%(D2(r[0]),ti(r[1]) if r[1] else '',ti(r[2]) if r[2] else '',r[3],b36(r[4]) if r[4] else '')).rstrip('.') for r in sorted(tx))
  j=' '.join('%s.%s.%s'%(D2(r[0]),b36(r[1]),b36(r[2])) for r in sorted(inj))
  vv=sorted(val); vv2=[]
  for d,v in vv:
    if vv2 and vv2[-1][0][:7]==d[:7]: vv2[-1]=(d,v)
    else: vv2.append((d,v))
  v=' '.join('%s.%s'%(M2(d),b36(x//10000)) for d,x in vv2)
  HP[key]='|'.join([c,t,j,v]).rstrip('|')
for tm,k in KEY.items():
  car=S['car'].get(tm,[]); tx=S['TX'].get(tm,[]); inj=S['INJ'].get(tm,[]); val=S['VAL'].get(tm,[])
  if car or tx or inj or val: pstr(k,car,tx,inj,val)
# ---- 구단 레전드 ----
CS=CL['clubs']
title={}
for g,rows in CS.items():
  for r in rows:
    if r[3]==1: title[(g,r[0])]=2.5 if r[2]==1 else 1.2
def legagg(car, tx):
  sp=loanspans(tx); by={}
  for y,kind,k,ap,gl,a,mn in car:
    if not k or k[0] in 'ty' or k not in G: continue
    if isloan(sp,k,y): continue
    b=by.setdefault(k,{'ys':collections.Counter(),'ap':0,'g':0,'a':0,'tp':0.})
    b['ys'][y]+=ap; b['ap']+=ap; b['g']+=gl; b['a']+=a
  for k,b in by.items():
    for y,ap in b['ys'].items():
      t=title.get((k,y))
      if t and ap>=10: b['tp']+=t*(1 if ap>=25 else .35)
  return by
LEG=collections.defaultdict(dict); LEGP={}
def posc(s):
  s=(s or '').lower()
  for a,b in [('goalkeeper','GK'),('centre-back','CB'),('left-back','LB'),('right-back','RB'),('defensive midfield','CDM'),('central midfield','CM'),('attacking midfield','CAM'),('left midfield','LM'),('right midfield','RM'),('left winger','LW'),('right winger','RW'),('centre-forward','ST'),('second striker','ST'),('defender','CB'),('midfield','CM'),('attack','ST')]:
    if a in s: return b
  return 'CM'
CRK=set(json.load(open('/tmp/crank_keys.json')))
def addleg(key, car, tx, retired):
  by=legagg(car,tx); clubs=[k for k in by]
  allk=set(own(r[2]) for r in car if r[2])
  for k,b in by.items():
    if (k[0]=='X' or (G[k]['lg'] or 'X')[0]=='X') and k not in CRK: continue
    seaW=sum(1 if ap>=15 else .4 if ap>=5 else 0 for ap in b['ys'].values()); nS=sum(1 for ap in b['ys'].values() if ap>=5)
    if nS<2 or b['ap']<40: continue
    sc=seaW+b['ap']/100+b['g']/40+b['tp']*.6
    if retired and (sc<5.5 or nS<4): continue
    one=1 if len(allk)==1 and nS>=6 else 0
    LEG[k][key]=[min(b['ys']),b['ap'],b['g'],b['a'],round(b['tp'],1),round(seaW,1),nS,max(b['ys']),one]
for tm,k in KEY.items(): addleg(k,S['car'].get(tm,[]),S['TX'].get(tm,[]),False)
nret=0
for tm,rows in S['legrows'].items():
  allrows=rows  # 레전드 구단 행만 들어 있음
  before=sum(len(v) for v in LEG.values())
  addleg('tm'+tm,rows,S['TX'].get(tm,[]),True)
  if sum(len(v) for v in LEG.values())>before:
    pr=prof.get(tm,{}); nm=re.sub(r'\s*\(\d+\)$','',pr.get('player_name','') or '')
    if not nm:
      for v in LEG.values(): v.pop('tm'+tm,None)
      continue
    if natc(pr) in ('KOR','PRK','CHN') and ' ' in nm:  # 게임 표기(성 먼저)에 맞춘다
      t=nm.split(); nm=' '.join([t[-1]]+[p[:1].upper()+p[1:].lower() for g in t[:-1] for p in g.split('-') if p])
    dob=pr.get('date_of_birth') or ''
    LEGP['tm'+tm]=[nm,natc(pr),posc(pr.get('position')),days(dob) if dob else None,max(r[0] for r in rows)]
    pstr('tm'+tm,rows,S['TX'].get(tm,[]),[],[]); nret+=1
print('legend clubs',len(LEG),'entries',sum(len(v) for v in LEG.values()),'retired legends',nret)
# ---- 구단 시즌 (게임 이전) ----
comps=CL['comps']; mgrs=CL['mgrs']
cvote=collections.defaultdict(collections.Counter)
for g,rows in CS.items():
  gg=G.get(g)
  if not gg or not gg['lg']: continue
  for r in rows:
    if r[0]>=2012 and r[2]==gg['tier']: cvote[r[1]][gg['lg']]+=1
CMAP={}
for c,v in cvote.items():
  lid,n=v.most_common(1)[0]
  if n>=3 and n/sum(v.values())>=.5: CMAP[c]=lid
HON=collections.defaultdict(dict)
for g,rows in CS.items():
  for r in rows:
    if r[3]==1 and r[1] in CMAP and r[2]==G.get(g,{}).get('tier',r[2]) or (r[3]==1 and r[1] in CMAP and r[2]==1):
      HON[CMAP[r[1]]][r[0]]=g
for lid,rows in S26['T'].items():
  if rows and isinstance(rows[0][0],str): HON[lid][2025]=S26['LGW'].get(lid,rows[0][0])
for lid,(c,pr) in S26['CH'].items(): HON[lid][2025]=S26['LGW'].get(lid,c)
HON={l:sorted([y,c] for y,c in v.items()) for l,v in HON.items()}
CSS={}
for g,rows in CS.items():
  CSS[g]=' '.join('.'.join(b36(x) for x in [r[0]-2000,r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11] if r[11]>=0 else -1]) for r in rows)
# ---- 파일 쓰기 ----
TN={}
for k in TL:
  if k and k[0] in 'ty':
    v=NAMES.get(k); 
    if v is None:
      v=NAMES.get(k)
    TN[k]=v if v is not None else ''
core={'v':1,'dob':DOB,'val':VAL,'caps':CAPS,'mv':MV,'leg':LEG,'legp':LEGP,'hon':HON,'cmap':{comps[c]:l for c,l in CMAP.items()},'s26':{k:S26[k] for k in ('T','CH','LGW','LGX','CUP','CONT','NT','SCORERS','AWARDS')}}
hist={'T':TL,'N':TN,'cs':CSS,'cm':comps,'mg':mgrs,'p':{}}
NSH=8
def shard(k): return int(re.sub(r'\D','',k) or 0)%NSH
def w(fn,var,obj,head):
  s=json.dumps(obj,ensure_ascii=False,separators=(',',':'))
  open('/home/claude/work/career/'+fn,'w').write('// Road to Legend — '+head+'\n(function (G) { G.'+var+' = '+s+'; if (G.TC && G.TC.tmLoaded) G.TC.tmLoaded(\''+var+'\'); })(typeof window !== \'undefined\' ? window : globalThis);\n')
  print(fn, len(s)//1024,'KB')
w('data_tm.js','TMD',core,'FC27+TFMKT 데이터셋 핵심 (생년월일 보정·시장가치·대표팀·2025/26 이동 추정·구단 레전드·게임 이전 우승·2025/26 시즌 결과). tools/tm/build_data.py로 생성')
w('data_tmh.js','TMH',hist,'FC27+TFMKT 데이터셋 상세: 팀 색인·구단 시즌 기록 (선수 기록은 data_tmp0~7.js). 필요할 때 늦게 불러온다. tools/tm/build_data.py로 생성')
import os
for i in range(NSH):
  part={k:v for k,v in HP.items() if shard(k)==i}
  t=json.dumps(part,ensure_ascii=False,separators=(',',':'))
  open('/home/claude/work/career/data_tmp%d.js'%i,'w').write('// Road to Legend — FC27+TFMKT 선수 기록 조각 %d/%d (선수 번호 %% %d = %d). tools/tm/build_data.py로 생성\n(function (G) { const H = G.TMH = G.TMH || { p: {} }; H.p = H.p || {}; Object.assign(H.p, %s); (H.got = H.got || {})[%d] = 1; if (G.TC && G.TC.tmLoaded) G.TC.tmLoaded(\'p%d\'); })(typeof window !== \'undefined\' ? window : globalThis);\n'%(i,NSH,NSH,i,t,i,i))
  print('shard',i,len(t)//1024,'KB')
print({k:len(json.dumps(v,ensure_ascii=False))//1024 for k,v in core.items()}, {k:len(json.dumps(v,ensure_ascii=False))//1024 for k,v in hist.items()})
os.system('cd /home/claude/work/career && for f in data_tm.js data_tmh.js data_tmp0.js; do printf "%s gz " $f; gzip -c $f | wc -c; done')
