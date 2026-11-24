import csv, json, collections
P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'
S=json.load(open('out/stage1.json')); T2G=S['T2G']
CH=collections.defaultdict(dict); comps={}; mgrs={}
def ix(d,k):
  if k not in d: d[k]=len(d)
  return d[k]
for r in csv.DictReader(open(P+'team_competitions_seasons/team_competitions_seasons.csv',encoding='utf-8')):
  g=T2G.get(r['club_id'])
  if not g: continue
  y=int(r['season_id'] or 0)
  if not y or y>=2025: continue
  lv=int(r['season_league_level_level_number'] or 0) or None
  row=[y, ix(comps, r['season_league_league_name'] or r['competition_name']), lv or 0, int(r['season_rank'] or 0), int(r['season_total_matches'] or 0), int(r['season_wins'] or 0), int(r['season_draws'] or 0), int(r['season_losses'] or 0), int(r['season_goals_for'] or 0), int(r['season_goals_against'] or 0), int(r['season_points'] or 0), ix(mgrs, r['season_manager_manager_name']) if r['season_manager_manager_name'] else -1]
  old=CH[g].get(y)
  if not old or (row[2] and (not old[2] or row[2]<old[2])): CH[g][y]=row
out={g:sorted(v.values()) for g,v in CH.items()}
json.dump({'clubs':out,'comps':list(comps),'mgrs':list(mgrs)},open('out/clubs.json','w'),ensure_ascii=False)
print(len(out), sum(len(v) for v in out.values()), len(comps), len(mgrs))
print(out.get('ENG_MUN',[])[-3:], out.get('ENG_REA',[])[-2:])
