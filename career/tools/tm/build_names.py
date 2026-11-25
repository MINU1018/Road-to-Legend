# Transfermarkt 선수 이름 → 국적별 가상 선수 이름 풀 (data_names.js)
import csv, json, re, collections, unicodedata
P='/tmp/fds_x/football-datasets-main/datalake/transfermarkt/'
exec(open('/home/claude/work/tm/build_data.py').read().split('# ---- 생년월일 보정 ----')[0].split("prof={}")[0])
prof={}
for r in csv.DictReader(open(P+'player_profiles/player_profiles.csv',encoding='utf-8')): prof[r['player_id']]=r
cvote=collections.defaultdict(collections.Counter)
for tm,f in KEY.items():
  pr=prof.get(tm)
  if not pr or f not in IDX: continue
  c0=re.split(r'\s{2,}',pr['citizenship'].strip())[0] if pr['citizenship'] else ''
  if c0: cvote[c0][IDX[f][5]]+=1
CITY={c:v.most_common(1)[0][0] for c,v in cvote.items() if v.most_common(1)[0][1]>=2}
CITY.update({'Korea, North':'PRK','Korea, South':'KOR'})
for k,v in {'Qatar':'QAT','Vietnam':'VIE','Thailand':'THA','Indonesia':'IDN','Malaysia':'MAS','India':'IND','Iraq':'IRQ','Syria':'SYR','Jordan':'JOR','United Arab Emirates':'UAE','Oman':'OMA','Bahrain':'BHR','Kuwait':'KUW','Lebanon':'LBN','Kyrgyzstan':'KGZ','Tajikistan':'TJK','Turkmenistan':'TKM','Philippines':'PHI','Singapore':'SIN','Hongkong':'HKG','Chinese Taipei':'TPE','Iran':'IRN','Palestine':'PLE','Afghanistan':'AFG','Myanmar':'MYA','Nepal':'NEP','Bangladesh':'BAN','Sri Lanka':'SRI','Mongolia':'MNG','Cambodia':'CAM','Laos':'LAO'}.items(): CITY.setdefault(k,v)

FAM={'KOR','PRK','CHN','TPE','HKG','VIE','CAM'}
ok=re.compile(r"^[^\W\d_][\w'’\-]*$",re.U)
F=collections.defaultdict(collections.Counter); L=collections.defaultdict(collections.Counter); MO=collections.defaultdict(collections.Counter)
for r in prof.values():
  c0=re.split(r'\s{2,}',r['citizenship'].strip())[0] if r['citizenship'] else ''
  nat=CITY.get(c0)
  if not nat: continue
  dob=r['date_of_birth'] or ''
  if dob and dob<'1975': continue
  nm=re.sub(r'\s*\(\d+\)$','',r['player_name']).strip()
  t=nm.split()
  if not t or len(t)>4 or any(not ok.match(x) or len(x.strip("'’-"))<2 for x in t): continue
  if any(x.isupper() and len(x)>3 for x in t): continue
  if len(t)==1:
    MO[nat][t[0]]+=1; continue
  if nat in FAM:
    fam=t[-1]; giv=' '.join(t[:-1])
    giv=' '.join(p[:1].upper()+p[1:].lower() for p in re.split(r'[-\s]',giv) if p)
    F[nat][fam]+=1; L[nat][giv]+=1
  else:
    F[nat][t[0]]+=1; L[nat][' '.join(t[1:])]+=1
print('PRK raw', len(F['PRK']), len(L['PRK']))
for x in ('Ahn','Tese'): F['PRK'].pop(x,None)
for x in 'Kim Ri Pak Choe Jong Kang Jo Yun Jang Han O Sin Ryang An Ro Hong Kye Mun Paek Rim Hwang So Cha Ju Ryu Sim Kwak'.split(): F['PRK'][x]+=1
for x in ['Kwang Song','Il Gwan','Chol Hyok','Kum Song','Jong Hyok','Myong Song','Kuk Jin','Hyok Chol','Song Hyok','Yong Jik','Kwang Ryong','Nam Chol','Un Chol','Jin Hyok','Chol Ung','Il Chol','Kyong Il','Song Chol','Ju Song','Yong Chol','Kwang Hyok','Chung Song','Hyon Jin','Myong Il','Song Il','Kuk Chol','Jong Song','Tong Il','Chol Jin','Hak Chol','Ui Song','Hyok Jin','Kang Il','Ryong Chol','Yong Il','Sun Il','Kum Il','Nam Il','Kwang Chon','Hyon Chol']: L['PRK'][x]+=1
OUT={}
for nat in F:
  fs=[n for n,_ in F[nat].most_common(140)]; ls=[n for n,_ in L[nat].most_common(200)]
  if (len(F[nat])<12 or len(L[nat])<12) and nat!='PRK': continue
  mo=[n for n,_ in MO[nat].most_common(60)] if nat in ('BRA','POR','ANG','CPV','MOZ','GNB','ESP') else []
  OUT[nat]=['|'.join(fs),'|'.join(ls)]+(['|'.join(mo)] if mo else [])
s=json.dumps(OUT,ensure_ascii=False,separators=(',',':'))
open('/home/claude/work/career/data_names.js','w').write("// Road to Legend — 국적별 가상 선수 이름 풀 (Transfermarkt 선수 이름 빈도 상위, 1975년 이후 출생). 성이 앞인 나라(한국·북한·중국 등)는 [성, 이름] 순서. tools/tm/build_names.py로 생성\n(function (G) { const W = G.FMWORLD = G.FMWORLD || {}; const D = "+s+"; W.NAMES_TM = {}; for (const k in D) W.NAMES_TM[k] = D[k].map(x => x.split('|')); })(typeof window !== 'undefined' ? window : globalThis);\n")
print(len(OUT), len(s)//1024,'KB'); print({k:(len(v[0].split('|')),len(v[1].split('|'))) for k,v in list(OUT.items())[:10]})
for n in ('PRK','VIE','THA','KOR','CHN','JPN','IRN','KSA','GHA','BRA'): 
  if n in OUT: print(n, OUT[n][0][:120], '//', OUT[n][1][:120])
