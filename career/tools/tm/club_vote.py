import json, csv, collections
P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'
F=json.load(open('player_match.json')); FCC=json.load(open('fc_club.json')); G={g['id']:g for g in json.load(open('game_clubs.json'))}
TMC=json.load(open('tm_clubs.json')); nm=json.load(open('club_map.json'))
cur={r['player_id']:(r['current_club_id'],r['current_club_name']) for r in csv.DictReader(open(P+'player_profiles/player_profiles.csv',encoding='utf-8'))}
# also include past clubs via player_performances? use current only + 2024/25 season team from performances
perf=collections.defaultdict(collections.Counter)
want={f['tm'] for f in F if f.get('tm')}
for r in csv.DictReader(open('/tmp/fds_lfs/player_performances.csv',encoding='utf-8')):
  if r['player_id'] in want and r['season_name'] in ('24/25','25/26','2025','2024'):
    perf[r['player_id']][r['team_id']]+=int(float(r['nb_on_pitch'] or 0))+1
votes=collections.defaultdict(collections.Counter)
for f in F:
  if not f.get('tm') or f.get('tier',9)>4: continue
  gid=f['club'] if f['k']=='Y' else FCC.get(f['id'])
  if not gid: continue
  c=cur.get(f['tm'])
  if c and c[0] and c[0] not in ('515','75','123'): votes[gid][c[0]]+=2
  for t,n in perf[f['tm']].most_common(2): votes[gid][t]+=1
out={}
for gid,v in votes.items():
  (tid,n),=v.most_common(1); tot=sum(v.values())
  out[gid]={'tm':tid,'n':n,'share':round(n/tot,2),'tmn':TMC.get(tid,{}).get('name',''),'src':'vote'}
# merge with name map for remaining
for gid,r in nm.items():
  if gid in out: 
    out[gid]['name_tm']=r['tm']; continue
  if r['tm'] and r['st']=='ok': out[gid]={'tm':r['tm'],'tmn':r['tmn'],'src':'name','s':r['s']}
  elif r['tm']: out[gid]={'tm':r['tm'],'tmn':r['tmn'],'src':'name-weak','s':r['s']}
json.dump(out,open('club_map2.json','w'),ensure_ascii=False)
print(len(votes), collections.Counter(v['src'] for v in out.values()))
low=[(g,G[g]['en'],v['tmn'],v['share']) for g,v in out.items() if v['src']=='vote' and v['share']<.35]
print('low share', len(low)); print(low[:30])
dis=[(g,G[g]['en'],v['tmn'],TMC.get(v.get('name_tm') or '',{}).get('name')) for g,v in out.items() if v['src']=='vote' and v.get('name_tm') and v['name_tm']!=v['tm']]
print('disagree', len(dis)); print(dis[:30])
