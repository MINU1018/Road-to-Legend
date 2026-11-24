import csv, collections, json, re
L='/tmp/fds_lfs/'; P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'
cl={}
def add(tid,name,comp=None,season=None,n=1):
  if not tid or tid in ('0',''): return
  c=cl.setdefault(tid,{'n':collections.Counter(),'comp':collections.Counter(),'last':''})
  if name: c['n'][re.sub(r'\s*\(\d+\)$','',name)]+=1
  if comp: c['comp'][comp]+=n
  if season and season>c['last']: c['last']=season
comps={}
for r in csv.DictReader(open(L+'player_performances.csv',encoding='utf-8')):
  add(r['team_id'],r['team_name'],r['competition_id'],r['season_name'])
  comps.setdefault(r['competition_id'],collections.Counter())[r['competition_name']]+=1
for r in csv.DictReader(open(P+'team_details/team_details.csv',encoding='utf-8')):
  add(r['club_id'],r['club_name']); cl[r['club_id']]['country']=r['country_name']; cl[r['club_id']]['div']=r['club_division']
for r in csv.DictReader(open(P+'team_competitions_seasons/team_competitions_seasons.csv',encoding='utf-8')):
  add(r['club_id'],r['team_name'],r['competition_id'],None,3)
for r in csv.DictReader(open(P+'team_children/team_children.csv',encoding='utf-8')):
  if r['child_team_id']!=r['parent_team_id']: cl.setdefault(r['child_team_id'],{'n':collections.Counter(),'comp':collections.Counter(),'last':''})['parent']=r['parent_team_id']
out={k:{'name':v['n'].most_common(1)[0][0] if v['n'] else '','names':[x for x,_ in v['n'].most_common(4)],'comp':dict(v['comp'].most_common(6)),'country':v.get('country'),'parent':v.get('parent')} for k,v in cl.items()}
json.dump(out,open('tm_clubs.json','w'),ensure_ascii=False)
json.dump({k:v.most_common(1)[0][0] for k,v in comps.items()},open('tm_comps.json','w'),ensure_ascii=False)
print(len(out), len(comps))
