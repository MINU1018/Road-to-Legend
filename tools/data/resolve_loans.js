const {C,GM}=require('../load.js');
const fs=require('fs');
const w=C.buildWorld();
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ø/g,'o').replace(/ı/g,'i').replace(/ł/g,'l').replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['fc','afc','cf','sc','ac','as','cd','sv','vfl','vfb','fk','sk','bk','club','de','the','and','calcio','1','hove','albion','town','athletic','wanderers','united','city','county','rovers','stanley','borough','sport','sporting','real','royal','r']);
const ALIAS={'manchester united':'ENG_MUN','manchester city':'ENG_MCI','tottenham hotspur':'ENG_TOT','nottingham forest':'ENG_NFO','wolverhampton wanderers':'ENG_WOL','brighton and hove albion':'ENG_BHA','west ham united':'ENG_WHU','newcastle united':'ENG_NEW','queens park rangers':'ENG_QPR','sheffield wednesday':'ENG_SHW','sheffield united':'ENG_SHU','west bromwich albion':'ENG_WBA','milton keynes dons':'ENG_MKD','afc wimbledon':'ENG_WIM','borussia dortmund':'GER_BVB','rb leipzig':'GER_RBL','eintracht frankfurt':'GER_SGE','ac milan':'ITA_MIL','real sociedad':'ESP_RSO','sporting cp':'POR_SCP','barcelona':'ESP_BAR','juventus':'ITA_JUV','atalanta':'ITA_ATA','roma':'ITA_ROM','napoli':'ITA_NAP','rennes':'FRA_REN','lens':'FRA_RCL','lille':'FRA_LIL','nice':'FRA_NIC','strasbourg':'FRA_RCS','auxerre':'FRA_AUX','fenerbahce':'TUR_FB','galatasaray':'TUR_GS','ajax':'NED_AJA','celtic':'SCO_CEL','rangers':'SCO_RAN','genk':'BEL_GNK','manchester':'','preston north end':'ENG_PNE','sint truiden':'BEL_STV','union saint gilloise':'BEL_USG','sparta prague':'CZE_SPA','slavia prague':'CZE_SLA','tsv hartberg':'AUT_HAR','rapid wien':'AUT_RAP','lausanne sport':'SUI_LAU','vitoria':'POR_VSC','vicenza':'ITA_VIC','mantova':'ITA_MAN','arezzo':'ITA_ARE','gubbio':'XITA_GUBBIO','trabzonspor':'TUR_TS','celta vigo':'ESP_CEL','cadiz':'ESP_CAD','espanyol':'ESP_ESP','getafe':'ESP_GET','valencia':'ESP_VAL','malaga':'ESP_MAG','panathinaikos':'GRE_PAO','gaziantep':'TUR_GAZ','goztepe':'TUR_GOZ','randers':'DEN_RAN','wisla plock':'POL_WPL','tolima':'COL_TOL','montreal':'USA_MTL','new england revolution':'USA_NE','dundee':'SCO_DUN','dundee united':'SCO_DUU','hibernian':'SCO_HIB','motherwell':'SCO_MOT','falkirk':'SCO_FAL','greenock morton':'XSCO_MORTON','waterford':'IRL_WAT','darmstadt 98':'GER_D98','schalke 04':'GER_S04','werder bremen':'GER_SVW','hamburger sv':'GER_HSV','como':'ITA_COM','torino':'ITA_TOR','cagliari':'ITA_CAG','fiorentina':'ITA_FIO','westerlo':'BEL_WES','kortrijk':'BEL_KOR','lommel':'BEL_LOM','royal charleroi':'BEL_CHA','utrecht':'NED_UTR','fortuna sittard':'NED_FOR','fc augsburg':'GER_FCA','cruzeiro':'XBRA_CRUZEIRO','udinese':'ITA_UDI','pisa':'ITA_PIS','verona':'ITA_VER','bologna':'ITA_BOL','midtjylland':'DEN_FCM','almere':'','alverca':'POR_ALV','st johnstone':'' };
const idx=[]; for(const id in w.clubs){const c=w.clubs[id]; idx.push([id, fold(c.en||''), fold(c.name||''), c]);}
// FC27 english name list too
const F=global.FC27; const fcEn={}; for(const c of F.clubs) fcEn[c[0]]=fold(c[6]);
const toks=s=>fold(s).split(' ').filter(t=>t&&!STOP.has(t));
function club(name){ const f=fold(name); if(ALIAS[f]!=null) return ALIAS[f]||null;
  let best=null,bs=0; const tq=toks(name);
  for(const [id,en,ko,c] of idx){ const cand=[en,fcEn[id]||'']; for(const cn of cand){ if(!cn) continue; if(cn===f){return id;} const tc=cn.split(' ').filter(t=>t&&!STOP.has(t)); const sh=tq.filter(t=>tc.includes(t)).length; const sc=sh/Math.max(1,Math.min(tq.length,tc.length)) + sh*.001 - Math.abs(tq.length-tc.length)*.0005 + (c.lite?0:.0002); if(sh&&sc>bs){bs=sc;best=id;} } }
  return bs>=.99?best:null; }
const lines=fs.readFileSync(__dirname+'/loans_raw.txt','utf8').trim().split('\n').map(l=>l.split('|').map(x=>x.trim()));
// players index
const where=new Map(); const put=(e,cid)=>{ const n=fold(C.pName(w,e)); if(!where.has(n)) where.set(n,[]); where.get(n).push([e,cid]); };
for(const id in w.clubs){ for(const e of w.clubs[id].sq||[]) put(e,id); } for(const e of w.fa||[]) put(e,'FA');
const out=[], bad=[];
for(const [p,f,t] of lines){ const fi=club(f), ti=club(t); const L=where.get(fold(p))||[];
  if(!fi||!ti){ bad.push(`CLUB ${p} | ${f}=>${fi} | ${t}=>${ti}`); continue; }
  if(!L.length){ bad.push(`NOPLAYER ${p} (${f}->${t})`); continue; }
  const at=L.find(x=>x[1]===ti)||L.find(x=>x[1]===fi)||L[0];
  out.push([p,fi,ti,at[1]]); }
console.log('ok',out.length,'bad',bad.length); console.log(bad.join('\n'));
fs.writeFileSync(__dirname+'/loans_resolved.json', JSON.stringify(out));
console.log(out.slice(0,10).map(x=>x.join(' ')).join('\n'));
console.log('at to:',out.filter(x=>x[3]===x[2]).length,'at from:',out.filter(x=>x[3]===x[1]).length,'elsewhere:',out.filter(x=>x[3]!==x[1]&&x[3]!==x[2]).map(x=>x.join(' ')).join('; '));
process.exit(0);
