import csv, json, re, collections, datetime, random, statistics
P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'; L='/tmp/fds_lfs/'
F=json.load(open('player_match.json')); CF=json.load(open('club_final.json')); TMC=json.load(open('tm_clubs.json'))
G={g['id']:g for g in json.load(open('game_clubs.json'))}
clean=lambda n: re.sub(r'\s*\(\d+\)$','',n or '').replace('‎','').strip()
# ---- 구단 역매핑 (TM id → 게임 id) ----
FIX={'ARG_NOB':'1286','IND_KER':'45277','IND_CHE':'45299','VEN_LGU':'26468','PER_UCV':'6889','PER_ALA':'17479','BOL_BLO':'8056','ECU_CUE':'8781','COL_MIL':'2350','XBRA_VASCODAGAMA':'978','XDEN_B1908':'12622','XGER_SCKOLNBRUCK07':None,'XDEN_B93':None,'XDEN_B1913':None}
for g,t in FIX.items():
  CF[g]=({'tm':t,'tmn':TMC.get(t,{}).get('name',''),'share':1,'ns':1,'conf':'높음'} if t else None)
json.dump(CF,open('club_final.json','w'),ensure_ascii=False)
T2G={}
for gid,o in CF.items():
  if not o: continue
  if o['conf'] in ('높음','보통') or (not gid.startswith('X') and o['conf']=='낮음' and o['share']>=.3):
    if o['tm'] not in T2G or not gid.startswith('X'): T2G[o['tm']]=gid
YOUTHP={}
for r in csv.DictReader(open(P+'team_children/team_children.csv',encoding='utf-8')):
  if r['child_team_id']!=r['parent_team_id']: YOUTHP[r['child_team_id']]=r['parent_team_id']
NAMES={}
def tkey(tid,name=''):
  if tid in T2G: return T2G[tid]
  p=YOUTHP.get(tid)
  if p and p in T2G: 
    NAMES['y'+tid]=[clean(name) or TMC.get(tid,{}).get('name',''),T2G[p]]; return 'y'+tid
  if tid not in ('','0'): NAMES.setdefault('t'+tid,clean(name) or TMC.get(tid,{}).get('name','')); return 't'+tid
  return ''
# ---- 선수 ----
M={}   # tmid -> key
for f in F:
  if f.get('tm') and f.get('tier',9)<=4: M[f['tm']]=('y:'+f['nm']) if f['k']=='Y' else f['id']
base=datetime.date(2000,1,1)
prof={}
for r in csv.DictReader(open(P+'player_profiles/player_profiles.csv',encoding='utf-8')): prof[r['player_id']]=r
def season_start(s,dob):
  if re.match(r'^\d{4}$',s): return int(s),'c'
  m=re.match(r'^(\d\d)/(\d\d)$',s)
  if not m: return None,None
  y=int(m.group(1)); by=int(dob[:4]) if dob else 1990
  c1,c2=1900+y,2000+y
  ok=[c for c in (c1,c2) if by+12<=c<=by+48]
  return (ok[0] if ok else (c2 if c2<=2025 else c1)),'s'
CUT=2025  # 2025/26·2025 시즌부터는 버린다 (게임 이전 마지막 완료 시즌 = 2024/25)
car=collections.defaultdict(lambda: collections.defaultdict(lambda:[0,0,0,0]))
legcand=collections.defaultdict(lambda: collections.defaultdict(lambda:[0,0,0,0]))
for r in csv.DictReader(open(L+'player_performances.csv',encoding='utf-8')):
  pid=r['player_id']; pr=prof.get(pid); dob=pr['date_of_birth'] if pr else ''
  y,kind=season_start(r['season_name'],dob)
  if y is None or y>=CUT: continue
  k=tkey(r['team_id'],r['team_name'])
  if not k: continue
  ap=int(float(r['nb_on_pitch'] or 0)); g=int(float(r['goals'] or 0)); a=int(float(r['assists'] or 0)); mn=int(float(r['minutes_played'] or 0))
  if not ap: continue
  tgt=car if pid in M else legcand
  x=tgt[pid][(y,kind,k)]; x[0]+=ap; x[1]+=g; x[2]+=a; x[3]+=mn
print('career players', len(car), 'others', len(legcand))
# ---- 은퇴·게임 밖 선수 중 구단 레전드 후보 (실제 리그 구단에서 많이 뛴 선수) ----
LEG={}
for pid,rows in legcand.items():
  by=collections.defaultdict(lambda:[0,0,0,set()])
  for (y,kind,k),v in rows.items():
    if k[0] in 'ty' or k.startswith('X'): continue
    b=by[k]; b[0]+=v[0]; b[1]+=v[1]; b[2]+=v[2]; b[3].add(y)
  keep=[k for k,b in by.items() if b[0]>=100 or (len(b[3])>=5 and b[0]>=60)]
  if keep: LEG[pid]=keep
print('legend candidates', len(LEG))
# ---- 이적 ----
TX=collections.defaultdict(list)
for r in csv.DictReader(open(L+'transfer_history.csv',encoding='utf-8')):
  pid=r['player_id']
  if pid not in M and pid not in LEG: continue
  d=r['transfer_date']
  if not d or d>='2025-11-01': continue
  t={'Transfer':'t','Loan':'l','Return from loan':'r','Draft':'d'}.get(r['transfer_type'],'t')
  fee=int(float(r['transfer_fee'] or 0)); val=int(float(r['value_at_transfer'] or 0))
  TX[pid].append([d,tkey(r['from_team_id'],r['from_team_name']),tkey(r['to_team_id'],r['to_team_name']),t,fee//10000,val//10000])
# ---- 부상 ----
def injt(reason,days):
  s=reason.lower()
  for kw,i in [('cruciate',14),('acl',14),('achilles tendon rupture',15),('achilles',15 if days>100 else 6),('meniscus',13),('metatarsal',12),('fracture',12 if 'foot' in s or 'toe' in s else 16),('broken',16),('hamstring',5),('calf',6),('adductor',7),('groin',7),('pubalgia',7),('thigh',4),('muscle',4 if days>=7 else 0),('fiber',4),('fibre',4),('bundle',4),('ankle',2 if days<18 else 8),('ligament',8),('knee',9),('back',10),('lumbago',10),('shoulder',11),('foot',12 if days>40 else 2),('ill',3),('flu',3),('fever',3),('cold',3),('virus',3),('corona',3),('covid',3),('infection',3),('knock',1),('bruise',1),('contusion',1),('dead leg',1),('fatigue',0),('strain',4),('head',1),('concussion',1),('hip',7)]:
    if kw in s: return i
  return None
SKIP=('rest','fitness','quarantine','suspen','personal','paternity','unknown')
INJ=collections.defaultdict(list)
for r in csv.DictReader(open(P+'player_injuries/player_injuries_updated_20260929.csv',encoding='utf-8')):
  pid=r['player_id']
  if pid not in M: continue
  d=r['from_date']
  if not d or d>='2026-07-01': continue
  days=int(float(r['days_missed'] or 0))
  if days<=0: continue
  s=r['injury_reason'].lower()
  if any(x in s for x in ('rest','fitness','quarantine','suspen','personal','paternity')): continue
  i=injt(s,days)
  if i is None:
    i=0 if days<10 else 4 if days<35 else 9 if days<80 else 13 if days<150 else 14
  INJ[pid].append([d,days,i])
# ---- 시장가치 ----
VAL=collections.defaultdict(list)
for r in csv.DictReader(open(P+'player_market_value/player_market_value.csv',encoding='utf-8')):
  pid=r['player_id']
  if pid in M and r['date_unix']<='2025-10-31': VAL[pid].append((r['date_unix'],int(float(r['value'] or 0))))
LAST={}
for r in csv.DictReader(open(P+'player_latest_market_value/player_latest_market_value.csv',encoding='utf-8')):
  if r['player_id'] in M: LAST[r['player_id']]=(r['date_unix'],int(float(r['value'] or 0)))
# ---- 대표팀 (성인 대표팀만: 데뷔 나이 중앙값이 21.5세 이상인 팀) ----
NP=list(csv.DictReader(open(P+'player_national_performances/player_national_performances.csv',encoding='utf-8')))
ages=collections.defaultdict(list)
for r in NP:
  pr=prof.get(r['player_id'])
  if not pr or not pr['date_of_birth']: continue
  ages[r['team_id']].append(int(pr['date_of_birth'][:4]))
# 데뷔 날짜가 없으므로: 그 팀 선수들의 출생 연도 폭이 넓으면(성인) / 좁으면(연령별)
mx=collections.Counter()
for r in NP: mx[r['team_id']]=max(mx[r['team_id']],int(float(r['matches'] or 0)))
senior={t for t,v in mx.items() if v>=40}
CAPS={}
for r in NP:
  pid=r['player_id']
  if pid in M and r['team_id'] in senior:
    m=int(float(r['matches'] or 0)); g=int(float(r['goals'] or 0))
    if m and (pid not in CAPS or m>CAPS[pid][0]): CAPS[pid]=[m,g]
print('senior teams', len(senior), 'caps', len(CAPS))
json.dump({'T2G':T2G,'M':M,'car':{k:[[y,kind,t]+v for (y,kind,t),v in rows.items()] for k,rows in car.items()},'TX':TX,'INJ':INJ,'VAL':VAL,'LAST':LAST,'CAPS':CAPS,'LEG':LEG,'legrows':{k:[[y,kind,t]+v for (y,kind,t),v in legcand[k].items() if t in LEG[k]] for k in LEG},'NAMES':NAMES},open('out/stage1.json','w'),ensure_ascii=False)
print('done', len(TX), len(INJ), len(VAL), len(LAST))
