/* Deterministic domain model. UI, clocks and persistence live outside this file. */
(function () {
'use strict';
const D=globalThis.RPGData;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const integer=(v,f=0)=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):f;
const copy=v=>JSON.parse(JSON.stringify(v));
// Remove obsolete rule spoilers from notices/journal already stored by older builds.
const narrative=text=>String(text??'')
 .replace(/: další nepřátelé mají o 10 % více životů\./g,'.')
 .replace(/další protivníci jsou ve střehu a mají o 10 % více životů\./g,'v dálce se ozývají kroky.')
 .replace(/ochranné požehnání: první těžký zásah bosse bude o 65 % slabší\./g,'požehnání na cestu.')
 .replace(/Obranným manévrem se během této výpravy zcela vyhneš těžkým útokům bosse\./g,'Kresbu si zapamatuješ.')
 .replace(/obranná volba proti těžkým útokům bosse bude zcela bezpečná\./g,'kupec ti označil boční průchody.')
 .replace(/První zásah proti bossovi bude o 65 % silnější\./g,'Vybral sis úkryt. Teď zbývá počkat na správnou chvíli.');
const odds=[[.93,.069,.001],[.76,.215,.025],[.54,.36,.10],[.30,.41,.29],[.12,.39,.49],[.05,.40,.55]];
class Game {
 constructor(raw=null,random=Math.random) {this.random=random;this.serial=0;this.audioEvents=[];this.state=this.fresh();if(raw)this.migrate(raw);}
 cue(name){this.audioEvents.push(name);if(this.audioEvents.length>16)this.audioEvents.shift();}
 drainAudio(){return this.audioEvents.splice(0);}
 uid(){return 'i'+(++this.serial)+'-'+Math.floor(this.random()*1e9).toString(36);}
 pick(list){return list[Math.min(list.length-1,Math.floor(this.random()*list.length))];}
 weighted(weights){let n=this.random()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return weights.length-1;}
 item(kind,rarity='common',ilvl=1,genes=null) {
  const tier=D.rarityIndex(rarity),n=this.weighted(odds[Math.max(0,tier)])+1,pool=D.affixDefinitions.filter(x=>x.id!=='allStats'||tier>=4);
  const affixes=genes?genes.map(([id,value])=>({id,value})):Array.from({length:n},()=>{
   const def=pool.splice(Math.floor(this.random()*pool.length),1)[0];
   return {id:def.id,value:Math.max(1,Math.round((def.base+Math.max(0,tier-1)*def.step+ilvl*.25)*(.8+this.random()*.45)))};
  });
  return {id:this.uid(),kind,rarity,ilvl:Math.max(1,ilvl),rank:1,affixes};
 }
 signature(kind,ilvl=1){const sig=D.signatures[kind],item=this.item(kind,'rare',ilvl,sig.genes);item.trait=sig.trait;item.name=sig.name;return item;}
 fresh(){
  const equipped=Object.fromEntries(Object.keys(D.slots).map(k=>[k,null]));
  equipped.weapon=this.item('dagger','common',1,[['damage',2]]);
  equipped.body=this.item('cloak','common',1,[['vitality',8]]);
  equipped.feet=this.item('boots','common',1,[['evasion',3]]);
  return {version:4,heroName:'',level:1,xp:0,points:30,levelNotice:{from:1,to:1,hp:0,points:30,initial:true},growth:{might:0,grit:0,agility:0,intelligence:0,luck:0,perception:0},
   gold:35,essence:12,potions:3,hp:119,equipped,inventory:[],capacity:20,pending:[],notice:null,
   selectedArea:0,selectedChallenge:0,records:D.areas.map(()=>({clears:0,highest:-1,marks:0})),
   unlocked:1,run:null,journal:[],flags:{},settings:{sound:false,volume:.55,speed:1,mapLabels:true},lastReport:null,
   storyEvents:[],metrics:{choices:0,merges:0,runs:0,bosses:0}};
 }
 migrate(raw){
  this.setHeroName(raw.heroName);
  const s=this.state,g=raw.growth||{};
  s.level=Math.max(1,integer(raw.level,1));s.xp=integer(raw.xp);s.points=integer(raw.points??raw.statPoints);
  s.levelNotice=null;if(raw.levelNotice&&integer(raw.levelNotice.to)===s.level){s.levelNotice={from:Math.max(1,integer(raw.levelNotice.from,1)),to:s.level,hp:integer(raw.levelNotice.hp),points:integer(raw.levelNotice.points)};if(raw.levelNotice.initial===true)s.levelNotice.initial=true;}
  s.growth={might:clamp(integer(g.might),0,100),grit:clamp(integer(g.grit),0,100),agility:clamp(integer(g.agility??g.guile),0,100),intelligence:clamp(integer(g.intelligence??g.learning),0,100),luck:clamp(integer(g.luck),0,100),perception:clamp(integer(g.perception),0,100)};
  s.gold=integer(raw.gold);s.essence=integer(raw.essence);s.potions=integer(raw.potions);
  const sanitize=item=>{
   if(!item||!D.itemById[item.kind])return null;
   const next={id:this.uid(),kind:item.kind,rarity:D.rarityById[item.rarity]?item.rarity:'common',
    rank:clamp(integer(item.rank,1),1,3),ilvl:Math.max(1,integer(item.ilvl,1)),
    affixes:(item.affixes||[]).filter(x=>D.affixById[x.id]).slice(0,3).map(x=>({id:x.id,value:clamp(integer(x.value),1,500)}))};
   if(D.traits[item.trait]){next.trait=item.trait;next.name=D.traits[item.trait].name;}
   if(Number.isFinite(item.basePower))next.basePower=clamp(item.basePower,1,100000);
   if(!next.affixes.length)next.affixes=[{id:'vitality',value:5}];return next;
  };
  s.equipped=Object.fromEntries(Object.keys(D.slots).map(k=>[k,null]));s.inventory=[];
  for(const item of Object.values(raw.equipped||{})){
   const it=sanitize(item);if(!it)continue;const slot=D.itemById[it.kind].slot;
   if(!s.equipped[slot])s.equipped[slot]=it;else s.inventory.push(it);
  }
  for(const item of raw.inventory||[]){const it=sanitize(item);if(it)s.inventory.push(it);}
  s.capacity=20; // Legacy overflow is kept, but no new items fit until below the limit.
  s.journal=Array.isArray(raw.journal)?raw.journal.slice(-60).map(narrative):[];
  s.flags=raw.version===3||raw.version===4?{...raw.flags}:{};
  s.storyEvents=Array.isArray(raw.storyEvents)?copy(raw.storyEvents).filter(x=>x&&typeof x.text==='string'&&Array.isArray(x.replies)&&Array.isArray(x.answers)).slice(0,20):[];
  if(raw.version===3||raw.version===4){
   const oldEpisode=raw.version===3&&Array.isArray(raw.records)&&raw.records.length===5;
   const sourceIndex=i=>oldEpisode?(i===3?-1:i>3?i-1:i):i;
   s.records=D.areas.map((_,i)=>{const source=raw.records?.[sourceIndex(i)];return {clears:integer(source?.clears),highest:Math.max(-1,Math.floor(Number(source?.highest??-1))),marks:integer(source?.marks)};});
   const oldUnlocked=integer(raw.unlocked,1);
   s.unlocked=clamp(oldEpisode?(oldUnlocked<=3?oldUnlocked:oldUnlocked+1):oldUnlocked,1,D.areas.length);
   if(oldEpisode&&oldUnlocked>=4)s.records[3]={clears:1,highest:0,marks:0};
   const mappedArea=oldEpisode&&integer(raw.selectedArea)>=3?integer(raw.selectedArea)+1:integer(raw.selectedArea);
   s.selectedArea=clamp(mappedArea,0,s.unlocked-1);
   s.selectedChallenge=clamp(integer(raw.selectedChallenge),0,s.records[s.selectedArea].highest+1);
   s.settings={sound:raw.settings?.sound===true,volume:Number.isFinite(raw.settings?.volume)?clamp(raw.settings.volume,0,1):.55,speed:raw.settings?.speed===2?2:1,mapLabels:raw.settings?.mapLabels!==false};
   s.lastReport=raw.lastReport?copy(raw.lastReport):null;s.metrics={...s.metrics,...raw.metrics};
   s.run=raw.run&&D.areas[raw.run.area]&&Array.isArray(raw.run.rooms)?copy(raw.run):null;
   s.pending=(raw.pending||[]).map(p=>p.type==='item'?{...p,item:sanitize(p.item)}:copy(p)).filter(p=>p.type!=='item'||p.item);
   if(oldEpisode){
    if(s.lastReport?.area>=3)s.lastReport.area++;
    if(s.run?.area>=3)s.run.area++;
    for(const pending of s.pending)if(Number.isInteger(pending.area)&&pending.area>=3)pending.area++;
   }
   s.notice=raw.notice?{...raw.notice,text:narrative(raw.notice.text)}:null;
  }else{
   const completed=raw.map?.completed||[];
   s.records.forEach((r,i)=>{if(completed.includes(D.areas[i].id)){r.clears=1;r.highest=0;}});
   s.unlocked=clamp(Math.max(1,(raw.map?.unlocked||[]).length),1,D.areas.length);
   if(raw.pendingLoot?.item){const it=sanitize(raw.pendingLoot.item);if(it)s.pending.push({type:'item',item:it,note:'Nález z předchozí výpravy.'});}
   if(raw.pendingChest)s.pending.push({type:'chest',tier:clamp(integer(raw.pendingChest.tier),0,2),ilvl:1,note:'Truhla z předchozí výpravy.'});
   this.note('Nová kapitola','Výbava, měny a rozdělené body jsou zachované. Původní rozehraná cesta skončila; můžeš vyrazit do nové výpravy.');
  }
  s.hp=clamp(Number.isFinite(raw.hp)?raw.hp:120,1,this.stats().maxHp);
  this.serial+=s.inventory.length+100;
 }
 setHeroName(value){
  const name=typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
  if(!/^[\p{L}\p{M}][\p{L}\p{M} '\-]{1,23}$/u.test(name))return false;
  this.state.heroName=name;return true;
 }
 basePower(item){
  const d=D.itemById[item.kind];
  return Math.max(item.basePower||0,d.bonus*D.rarityById[item.rarity].multiplier*(1+(item.rank-1)*.25)*(1+(item.ilvl-1)*.16));
 }
 attributes(equipped=this.state.equipped){
  const ids=['might','grit','agility','intelligence','luck','perception'],base=Object.fromEntries(ids.map(id=>[id,this.state.growth[id]||0])),bonus=Object.fromEntries(ids.map(id=>[id,0]));
  for(const it of Object.values(equipped||{}).filter(Boolean))for(const affix of it.affixes||[]){
   if(ids.includes(affix.id))bonus[affix.id]+=affix.value;
   else if(affix.id==='allStats')for(const id of ids)bonus[id]+=affix.value;
  }
  return {base,bonus,total:Object.fromEntries(ids.map(id=>[id,base[id]+bonus[id]]))};
 }
 stats(equipped=this.state.equipped,uncapped=false){
  const g=this.attributes(equipped).total,a={might:g.might,grit:g.grit,agility:g.agility,intelligence:g.intelligence,luck:g.luck,perception:g.perception,
   damageMin:5+g.might*.45,damageMax:7+g.might*.7,maxHp:105+(this.state.level-1)*5+g.grit*3,armor:g.grit*.25,
   crit:3.25+g.agility*.35,evasion:1.9+g.agility*.22,leech:0,thorns:0,absorb:0,haste:0,
   gold:g.luck*.75,block:0,traits:[],xpBonus:g.intelligence*1.25,shieldCap:20+g.intelligence*.4};
  for(const it of Object.values(equipped).filter(Boolean)){
   const slot=D.itemById[it.kind].slot,p=this.basePower(it);
   if(slot==='weapon'){a.damageMin+=Math.round(p*1.6);a.damageMax+=Math.round(p*2);}
   else if(['head','body','feet','hands','offhand'].includes(slot)){a.armor+=p*1.6;a.maxHp+=p*3;if(slot==='offhand')a.block+=12;}
   else {a.damageMin+=Math.round(p*.3);a.damageMax+=Math.round(p*.5);}
   if(it.trait)a.traits.push(it.trait);
   for(const x of it.affixes){
    if(x.id==='damage'){a.damageMin+=x.value;a.damageMax+=x.value;}
    else if(x.id==='vitality')a.maxHp+=x.value;
    else if(!['might','grit','agility','intelligence','luck','perception','allStats'].includes(x.id)&&x.id in a&&typeof a[x.id]==='number')a[x.id]+=x.value;
   }
  }
  if(!uncapped)for(const [k,max] of Object.entries(D.statCaps))a[k]=clamp(a[k],0,max);
  for(const k of ['might','grit','agility','intelligence','luck','perception','damageMin','damageMax','maxHp','armor'])a[k]=Math.round(a[k]);
  return a;
 }
 statBreakdown(){
  const base=this.stats({}),total=this.stats(),raw=this.stats(this.state.equipped,true),bonus={};
  for(const key of Object.keys(total))if(typeof total[key]==='number')bonus[key]=Math.round((total[key]-base[key])*100)/100;
  return {base,total,bonus,raw};
 }
 attackDelay(){return Math.round(1050/(1+this.stats().haste/100));}
 threshold(level=this.state.level){const n=Math.max(0,level-1);return Math.round(70+38*n+7*n*n);}
 xp(amount){
  const s=this.state,from=s.level;let added=0;
  s.xp+=Math.round(amount*(1+this.stats().xpBonus/100));
  while(s.xp>=this.threshold()){s.xp-=this.threshold();s.level++;s.points+=3;added++;}
  if(added){
   s.hp=Math.min(this.stats().maxHp,s.hp+added*5);
   s.levelNotice={from:s.levelNotice?.initial?from:s.levelNotice?.from??from,to:s.level,hp:(s.levelNotice?.initial?0:s.levelNotice?.hp||0)+added*5,points:(s.levelNotice?.initial?0:s.levelNotice?.points||0)+added*3};
   this.jot('Úroveň '+s.level+' · +'+added*5+' životů · body výcviku: '+added*3+'.');
  }
 }
 spend(stat){const s=this.state;if(!Object.hasOwn(s.growth,stat)||s.points<1||s.growth[stat]>=100||s.run?.battle)return false;const max=this.stats().maxHp;s.growth[stat]++;s.points--;s.hp+=this.stats().maxHp-max;return true;}
 jot(text){this.state.journal.push(text);this.state.journal=this.state.journal.slice(-60);}
 introduceChapter(){
  const s=this.state;if(!D.chapter||s.flags.chapterIntroSeen||s.storyEvents.some(x=>x.id==='intro'))return;
  const intro=copy(D.chapter.intro);
  if(s.records.some(r=>r.clears)){
   const next=s.records.findIndex(r=>!r.clears);intro.title='Jak to začalo';intro.narration='Připomenutí začátku příběhu. Tvoje výbava i vyčištěná místa zůstávají zachované.';
   intro.closing=next<0?'Údolí už jsi osvobodil. V ozvěnách kletby můžeš dál hledat výbavu a zvyšovat hrozbu.':D.areas[next].quest;
  }
  s.storyEvents.unshift(intro);
 }
 storyReply(index){
  const event=this.state.storyEvents[0];if(!event||event.response!==undefined||!Number.isInteger(index)||!event.replies[index])return false;
  event.response=index;this.jot(event.speaker+': '+event.text+' '+this.state.heroName+': '+event.replies[index]+' '+event.answers[index]);return true;
 }
 closeStory(){
  const s=this.state,event=s.storyEvents[0];if(!event||event.response===undefined)return false;
  if(event.id==='intro')s.flags.chapterIntroSeen=true;s.storyEvents.shift();return true;
 }
 chapterReport(area,result,first=false){
  if(!D.chapter)return;
  const s=this.state;let event;
  if(result==='win'&&first){const beat=copy(D.chapter.after[area]);event={...beat,id:'clear-'+area,speaker:beat.speaker||D.chapter.villain};}
  else if(result==='win')event={id:'echo-'+area,title:'Ozvěna je utišená',speaker:'Správce tábora Otmar',text:'„Pečeť ještě držela otisk staré kletby. Skutečné místo zůstává osvobozené; porazil jsi jen jeho ozvěnu.“',narration:'Výbava a suroviny, které kletba spoutala, ti zůstávají.',replies:['Příště zkusím vyšší hrozbu.','Teď si prohlédnu výbavu.'],answers:['„Silnější ozvěna, silnější kořist. Pořád stejný královský nepořádek.“','„Tentokrát se při převlékání nikdo nepočítá do pracovní doby.“'],closing:s.records.every(x=>x.clears)?'Příběh údolí je dokončený. Další výpravy jsou dobrovolné výzvy pro lepší kořist.':'Další krok hlavního příběhu najdeš na mapě. Již vyčištěná místa můžeš opakovat.'};
  else event={id:result+'-'+area,title:result==='retreat'?'Návrat není konec':'Zpátky u ohně',speaker:'Správce tábora Otmar',text:result==='retreat'?'„Dobře, že ses vrátil po svých. Cesta počká.“':s.run?.replay?'„Vytáhli jsme tě z ozvěny. Skutečné údolí se tím nevrátilo pod kletbu.“':'„Našli jsme tě u cesty. Král vyhrál tenhle střet, ne celou válku.“',narration:'Získané předměty a zkušenosti ti zůstaly. Odpočiň si, zkontroluj výbavu a doplň lektvary.',replies:['Vrátím se připravenější.','Nejdřív potřebuji lepší výbavu.'],answers:['„A já zatím připravím místo u ohně.“','„Výbavu prodává kupec. Ve vyčištěných místech můžeš hledat další kořist v ozvěnách kletby.“'],closing:'Nedokončenou výpravu začneš příště od vstupu. Hlavní příběh se neposunul.'};
  if(first&&area===0){
   const f=s.run?.flags||{};
   event.narration+=f.porterFriend?' Osvobození nosiči dostali součástky k mostu ven dřív, než je věž znovu zabavila.':' Přepsaný nákladní list odhalil, že věž zadržuje i součástky určené k opravě mostu.';
   event.narration+=f.scribe?' Osvobozený písař ti pomohl umlčet zvon a schoval si kopii králova příkazu.':f.authorized?' Vlastní razítko věže proměnilo falešný náklad v účetní kontrolu a výběrčího zaměstnalo během boje.':' Klíč od pokladnice otevřel i zásuvku s královým příkazem.';
  }
  s.storyEvents.push(event);
 }
 note(title,text,check=null){this.state.notice={title,text};if(check)this.state.notice.check=copy(check);this.jot(text);}
 gold(amount){const n=Math.round(amount*(1+this.stats().gold/100));this.state.gold+=n;if(this.state.run)this.state.run.gold+=n;return n;}
 rarity(source='enemy',area=this.state.run?.area??this.state.selectedArea,challenge=this.state.run?.challenge??0){
  const tier=Math.min(4,area+challenge),w=source==='boss'?[0,0,76,21,3+tier,Math.max(0,tier-1)]:
   source==='chest'?[40,35,20,4+tier,Math.max(0,tier-1),Math.max(0,tier-3)*.2]:[78,18,3,1+tier*.3,Math.max(0,tier-2)*.12,0];
  const luck=this.stats().luck/100;w.forEach((n,i)=>w[i]=n*(i===0?1-luck:i>=2?1+luck*(i-1):1));
  return D.rarities[this.weighted(w)].id;
 }
 drop(source='enemy',area=this.state.run?.area??this.state.selectedArea,challenge=this.state.run?.challenge??0){
  const p=D.areas[area],target=this.random()<.72,catalog=target?D.itemKinds.filter(d=>p.focus.includes(d.slot)):D.itemKinds;
  const ilvl=p.level+challenge*2;
  if(source==='boss'&&this.random()<.10)return this.signature(p.recipe,ilvl);
  return this.item(this.pick(catalog).id,this.rarity(source,area,challenge),ilvl);
 }
 dropChance(elite=false){return Math.min(.32,(elite?.16:.065)*(1+this.stats().luck/150));}
 skillCheck(stat,base){
  const value=this.stats()[stat]||0,dice=[1+Math.floor(this.random()*6),1+Math.floor(this.random()*6)],attributeBonus=value*.5;
  const chance=clamp(base+attributeBonus+dice[0]+dice[1],5,95),roll=1+Math.floor(this.random()*100);
  return {stat,base,value,attributeBonus,dice,chance,roll,success:roll<=chance,attempt:1};
 }
 price(item){return Math.round((8+this.basePower(item)*3+item.affixes.reduce((n,x)=>n+x.value*.5,0))*(1+D.rarityIndex(item.rarity)*.3));}
 room(){
  const r=this.state.run;if(!r)return null;
  return this.describe(r.rooms[r.index]||'boss');
 }
 start(area=this.state.selectedArea,challenge=this.state.selectedChallenge){
  const s=this.state;if(s.run||s.pending.length||area>=s.unlocked||area<0||!D.areas[area])return false;
  challenge=clamp(integer(challenge),0,s.records[area].highest+1);s.notice=null;s.lastReport=null;
  const rooms=this.makeRoute(area),pressure=rooms.map(()=>.85+this.random()*.4);
  s.run={routeVersion:1,area,challenge,rooms,pressure,index:0,replay:s.records[area].clears>0,flags:{},battle:null,gold:0,xp:0,choices:[],shield:0,riposte:false,revenge:false};
  s.metrics.runs++;this.jot('Výprava: '+D.areas[area].name+' · hrozba '+(challenge+1));return true;
 }
 makeRoute(area){
  const n=D.expeditionLengths[area],rooms=Array(n).fill(null);
  const place=(id,lo,hi)=>{let at=lo+Math.floor(this.random()*(hi-lo+1));while(rooms[at])at=at===hi?lo:at+1;rooms[at]=id;return at;};
  rooms[0]=area===0?'gate':'trail';rooms[n-2]='camp';rooms[n-1]='boss';
  if(area===0){
   place('manifest',Math.floor(n*.10),Math.floor(n*.18));
   place('scribe',Math.floor(n*.22),Math.floor(n*.31));
   place('lift',Math.floor(n*.38),Math.floor(n*.47));
   place('checkpoint',Math.floor(n*.55),Math.floor(n*.64));
  }
  place(area===0?'bell':'fork',Math.floor(n*.69),Math.floor(n*.78));
  place('wounded',Math.floor(n*.3),Math.floor(n*.46));
  place('well',Math.floor(n*.47),Math.floor(n*.61));
  const supply=place('supplies',n-7,n-4);
  const pool=D.encounters.filter(x=>x.area===undefined||x.area===area);let deck=[];
  for(let i=1;i<n-2;i++)if(!rooms[i]){
   let options=deck.filter(x=>(i<supply||x.kind!=='aid')&&!rooms.slice(Math.max(0,i-12),i).includes(x.id)&&x.kind!==D.encounterById[rooms[i-1]]?.kind);
   if(!options.length){deck=[...pool];options=deck.filter(x=>(i<supply||x.kind!=='aid')&&!rooms.slice(Math.max(0,i-12),i).includes(x.id)&&x.kind!==D.encounterById[rooms[i-1]]?.kind);}
   const entry=this.pick(options);rooms[i]=entry.id;deck=deck.filter(x=>x!==entry);
  }
  return rooms;
 }
 describe(id){
  if(D.encounterById[id])return D.encounterById[id];
  const r=this.state.run,f=r.flags,area=D.areas[r.area];
  const places=[['boční chodbě','ve zvonici','Nad posledním schodištěm slyšíš šustění účtů. Výběrčí je ve zvonici.'],['houští mezi stromy','na kraji mýtiny','Za houštím zahlédneš jelena. Kolem jeho nohou pulzují kořeny.'],['opuštěné štole','u důlní výztuže','Z poslední štoly se ozývají údery krumpáče. Předák ještě neskončil.'],['krystalové chodbě','v tiché dutině','Modré krystaly pulsují kolem obrovského kokonu. Časomol se probouzí.'],['služební chodbě','před trůnním sálem','Král diktuje další pracovní vyhlášku. Za dveřmi se dá ještě nabrat dech.'],['skalní rozsedlině','pod skalním převisem','U svatyně čeká král. Záblesky jeho koruny otřásají skalní stěnou.']][r.area];
  const defs={
   supplies:['supplies','Zásobovací stanoviště',f.favors?'Zásobovač tě poznává podle vzkazu od lidí, kterým jsi cestou pomohl. Odkládá pro tebe balík obvazů.':'U zásobovacího stanoviště zbývá několik obvazů. Zásobovač nabízí ošetření za deset zlatých.',['Přijmout ošetření','Pokračovat bez zastávky'],['','']],
   gate:['gate','Za branou','Strážný chce vstupné. Na směnovém lístku má přeškrtnuté tři dny.',['Zaplatit 8 zlata','Trvat na průchodu'],['Mince nebo rozhovor?','Ruka mu sklouzla ke zbrani.']],
   manifest:['manifest','Zabavený náklad','Dva nosiči čekají u beden označených „součástky k mostu“. Na stolku leží rozpis hlídek i prázdný nákladní list. Dozorce právě odešel pro další razítko.',['Přepsat nákladní list','Osvobodit nosiče'],['S falešným listem může nákladní výtah projet kontrolou.','Nosiči znají služební chodby a zdejší zásobovače.']],
   scribe:['scribe','Písař za mřížemi',this.state.flags.scribeFriend?'„Zase vy? Tentokrát mě zavřeli za správné datum.“ Písař se už natahuje po klíči.':'„Zvon svolá všechny stráže,“ šeptá písař. Klíč od cely i trezoru visí na stejném kroužku.',['Osvobodit písaře','Vzít klíč a odejít'],['Zná chodby i jejich obyvatele.','Za mřížemi zůstane ticho.']],
   lift:['lift','Nákladní výtah',f.cargoPass?'Obsluha přečte tvůj přepsaný list. „Součástky k mostu, horní strojovna.“ Výtah je připravený; vedle něj začíná úzké schodiště.':f.porterFriend?'Jeden z osvobozených nosičů ti nechal výtah odjištěný. Na závaží visí vzkaz: „Brzda kope.“ Vedle vede úzké schodiště.':'Výtah hlídá obsluha s knihou nákladu. Bez správného listu tě do klece nepustí. Vedle vede dlouhé úzké schodiště.',['Použít nákladní výtah','Jít po schodech'],[f.cargoPass?'List projde, dokud se nikdo nezačne ptát.':f.porterFriend?'Nosič označil správnou brzdu.':'Obsluha čeká na doklad.','Schodiště obchází výtah i hlavní chodbu.']],
   checkpoint:['checkpoint','Kontrola horního patra',f.cargoPass?'Strážný má v ruce kopii tvého falešného listu. Čísla sedí, podpis vypadá jako velmi sebevědomaná slepice.':f.porterFriend?'Za skladem čeká jeden z osvobozených nosičů. Ukazuje na dveře, které hlídka nechává při střídání prázdné.':'Před vstupem do horního patra kontroluje strážný každého příchozího. Boční ochoz je na dohled kušiníka.',['Projít hlavní kontrolou','Vzít boční ochoz'],[f.cargoPass?'Strážný porovnává hlavně čísla.':f.porterFriend?'Nosič zná čas střídání hlídky.':'Nemáš doklad ani místního průvodce.',f.stairRoute?'Ze schodiště už znáš dveře na ochoz.':'Ochoz sleduje střelec.']],
   well:['well','Prsten u studny','Na obrubě leží prsten s vyrytým jménem. Stejné jméno a adresu sis přečetl na oznámení o ztrátě. Rodina táboří nedaleko.',['Nechat si prsten','Vrátit jej rodině'],['Vejde se do kapsy.','Majitele už dokážeš najít.']],
   wounded:['wounded','Posel u cesty',this.state.flags.courierFriend?'Posel tě poznává. „Ještě vám dlužím za minule.“ Nabízí ti mapu tábořiště a zásoby.':'Raněný posel sedí u cesty. Balík mu ukradli; zůstal mu jen měšec a trochu proviantu.',[this.state.flags.courierFriend?'Přijmout jeho pomoc':'Ošetřit posla','Vzít mu měšec'],[this.state.flags.courierFriend?'Ukazuje ti místo k odpočinku.':this.state.potions?'Jeden lektvar mu pomůže.':'Bez lektvaru ho musíš odnést k cestě.','Posel tě dobře vidí.']],
   merchant:['merchant','Kupec pod lucernou','Kupec rozloží několik lektvarů. „Léčí rány. Dluhy bohužel ne.“ Vedle lahviček leží mapa okolí.',['Koupit lektvar · 18 zlata','Zeptat se na cestu'],['Zátka je neporušená.','Kupec zdejší cestu dobře zná.']],
   bell:['bell',f.scribe?'Slíbená pomoc':f.authorized?'Zvon podle předpisu':'Zvon a pokladnice',f.scribe?'Písař čeká u lana. „Trezor, nebo ticho? Na obojí nemáme čas.“':f.authorized?'U zvonu visí pravidlo: při účetní kontrole musí zůstat němý. Tvůj falešný nákladní list právě získal nečekanou autoritu.':'Za schody leží pokladnice. Nad hlavou se houpe poplašný zvon.',['Umlčet zvon','Otevřít pokladnici'],[f.scribe||f.authorized||f.stairRoute?'Máš bezpečnou cestu k lanu.':'K lanu vede odkrytý ochoz.','Klíč v kapse by mohl pasovat.']],
   patrol:['patrol','Hlídka na cestě','Cestu hlídá ozbrojený strážný. V '+places[0]+' zahlédneš velkou krysu s ukradeným měšcem.',['Dát se za krysou','Postavit se strážnému'],['Krysa hledá cestu k útěku.','Strážný si zapíná přilbu.']],
   camp:['camp','Chvíle na přípravu',f.courier?'Posel ti '+places[1]+' nechal proviant. „Expresní doručení. Tentokrát zdarma.“':places[2],['Odpočinout si','Připravit léčku'],['Ošetřit rány a srovnat dech.','Připravit první úder ze zálohy.']],
   boss:['boss',area.boss,(r.replay?'Před tebou ožívá otisk někdejšího střetu. ':'')+(r.area===0?(f.silent?'Zvon mlčí. Výběrčí sevře kladivo. „Král se o tom dozví.“':'Zvon se rozezní. Výběrčí přivolává stráže: „Z králova rozkazu nikdo neprojde!“'):[null,'Jelen stojí před výstupem z háje. Z pečeti na jeho krku zazní král: „Cesta je uzavřena.“ Zvíře sklopí paroží.','Předák zvedne krumpáč. Pod kamenným krunýřem ještě poznáváš člověka. Na zdi svítí králův příkaz: „Těžba bez přestávky.“','Velký Časomol roztáhne křídla nad krystaly. Z pečeti na kokonu zazní: „Zadržený čas je majetkem koruny.“','Král vstane z trůnu. „Věž, les, důl i jeskyně. To jste mi tu udělal pěkný nepořádek.“ Koruna mu na čele rozžehne zlaté světlo.','Král stojí u oltáře pod skalní stěnou. „Ještě není hotovo!“ Koruna rozvibruje kameny nad stezkou.'][r.area]),['Zkontrolovat výbavu','Vstoupit do boje'],['Můžeš se vrátit k přípravě.','Za vítězství čeká předmět i materiál.']],
   trail:['trail',area.name,'Stezka se dělí. Na jedné větvi leží čerstvé stopy. Z druhé se ozývá napínání tětivy.',['Sledovat stopy','Obejít cestu po svahu'],['Někdo něco ztratil.','Střelec už si vybírá místo.']],
   fork:r.area===1?['fork','Kořeny přes pěšinu','Silné kořeny vedou od starého dubu k jelenově mýtině. Pod nimi uvízla truhla. Můžeš prosekat pěšinu, nebo vyprostit truhlu.',['Přesekat kořeny','Vytáhnout truhlu'],['Kořeny pulzují stejným světlem jako jelen.','Víko vězí pod těžkou větví.']]:r.area===3?['fork','Komora ozvěny','Dva krystaly vracejí každý zvuk i úder zpět do chodby. Jeden lze rozladit; v dutině druhého je schránka.',['Rozbít rezonující krystal','Otevřít schránku v dutině'],['Tón krystalu drží ozvěnu pohromadě.','Víko je zarostlé hluboko v kameni.']]:['fork','Zavalená zkratka','Úzký průchod vede za hlídku. Vedle něj leží truhla zavalená kamením. Uvolnění průchodu zabere čas; vyproštění truhly nadělá hluk.',['Uvolnit průchod','Vyprostit truhlu'],['Průchod vede k místu posledního střetu.','Kamení se bude sypat do cesty.']],
   cache:['cache','Cechovní zásilka','U cesty leží bedna s neporušenou cechovní pečetí. Podle štítku patří do nedalekého skladu.',['Rozlomit pečeť','Doručit zásilku'],['Nikdo u ní nehlídá.','Na štítku je vypsaná odměna.']]
  };
  const row=defs[id]||defs.boss;
  return {id:row[0],title:row[1],text:row[2],choices:row[3],hints:row[4]};
 }
 advance(title,text,check=null){this.state.run.index++;this.note(title,text,check);}
 choose(side){
  const s=this.state,r=s.run;if(!r||r.battle||s.notice||s.pending.length||!['left','right'].includes(side))return false;
  const id=this.room().id,left=side==='left',f=r.flags;
  r.lastScene=id;r.lastFoe=null;r.lastCheck=null;
  s.metrics.choices++;r.choices.push(id+':'+side);
  if(D.encounterById[id])return this.encounter(D.encounterById[id],left);
  switch(id){
   case 'supplies':{
    if(left&&(f.favors||s.gold>=10)){if(!f.favors)s.gold-=10;const before=s.hp;this.heal(16+Math.min(4,f.favors||0)*7);this.advance('Obvazy a dobré slovo','Obnoveno '+(s.hp-before)+' životů. '+(f.favors?'Lidé, kterým jsi pomohl, za tebe zaplatili.':'Ošetření stálo 10 zlata.'));}
    else this.advance('Cesta pokračuje',left?'Na ošetření nemáš dost zlata. Zásobovač ti alespoň ukázal další průchod.':'Obvazy zůstaly pro další poutníky.');break;
   }
   case 'gate':
    if(left&&s.gold>=8){s.gold-=8;this.advance('Vstupné zaplaceno','Strážný schoval mince. „Potvrzení vám vydá poslední patro.“');}
    else this.fight('guard',false,left?'Na vstupné ti chybí mince. Strážný navrhuje praktickou zkoušku.':'Strážný nesouhlasí. Bude to muset vysvětlit zbraní.');break;
   case 'manifest':
    if(left){f.cargoPass=true;this.advance('Náklad pro horní patro','Do listu jsi připsal součástky k mostu a velmi přibližný podpis. Obsluha výtahu teď očekává tvůj náklad.');}
    else{f.porterFriend=true;f.favors=(f.favors||0)+1;s.flags.porterFriend=true;this.advance('Nosiči jsou volní','Zmizeli služební chodbou. Jeden slíbil odjistit výtah, druhý poslat zprávu zásobovačům.');}break;
   case 'scribe':
    if(left){f.scribe=true;s.flags.scribeFriend=true;this.advance('Písař je volný','„Najdete mě u zvonu.“ Písař si bere klíč od cely i pokladnice. Zná bezpečnou cestu k lanu.');}
    else{f.key=true;this.advance('Klíč od pokladnice','Písař se dívá za tebou. Klíč je tvůj, pomoc ne.');}break;
   case 'lift':
    if(left&&(f.cargoPass||f.porterFriend)){f.liftRoute=true;this.advance('Výtah stoupá',f.cargoPass?'Nákladní list prošel. Klec tě vyvezla do strojovny dřív, než obsluha domyslela chybějící bedny.':'Odjištěný výtah tě vyvezl do strojovny. Nosičův vzkaz o brzdě byl překvapivě přesný.');}
    else if(left){this.fight('guard',false,'Obsluha nenašla tvé jméno ani náklad. Místo výtahu přivolala stráž.');}
    else{f.stairRoute=true;const before=s.hp;this.hurt(5);this.advance('Po vlastních','Schodiště obešlo hlavní chodbu, ale dlouhý výstup tě stál '+(before-s.hp)+' životů. Teď znáš boční vstup do horního patra.');}break;
   case 'checkpoint':
    if(left&&f.cargoPass){f.authorized=true;this.fight('guard',false,'Čísla souhlasí, ale podpis připomíná slepici. Strážný tasí meč; při tom orazítkuje list jako účetní kontrolu.');if(f.liftRoute){r.battle.damage=Math.max(1,r.battle.damage-3);r.battle.covered=true;this.log('Bedny z výtahu ti poskytují kryt. Útok strážného je slabší.','story');}}
    else if(left&&f.porterFriend){f.authorized=true;this.advance('Mezera ve směně','Nosič tě provedl kontrolou právě ve chvíli, kdy se obě hlídky považovaly za vystřídané.');}
    else if(left)this.fight('guard',true,'Strážný nenašel důvod tě pustit. Ty zase nenašel důvod odejít.');
    else if(f.stairRoute||f.porterFriend){f.silentApproach=true;this.advance('Boční ochoz','Dveře byly přesně tam, kde měly být. Kontrolu jsi obešel a ke zvonici vede prázdný ochoz.');}
    else this.fight('hunter',false,'Na bočním ochozu čekal kušiník. Bez místního průvodce ses objevil přímo v jeho výhledu.');break;
   case 'well':
    if(left){s.pending.push({type:'item',item:this.item('ring','uncommon',D.areas[r.area].level+r.challenge*2),note:'Prsten, který sis nechal u studny.'});this.advance('Nález u studny','Prsten máš u sebe. O jeho dalším osudu rozhodneš v kartě nálezu.');}
    else{const reward=this.gold(16);s.flags.familyFriend=true;f.blessed=true;this.advance('Prsten se vrátil domů','Rodina ti dala '+reward+' zlata. Při loučení ti stařenka nakreslila na čelo drobný znak.');}break;
   case 'wounded':
    if(left&&s.flags.courierFriend){f.courier=true;this.advance('Doručený dluh','Posel ti popsal bezpečné místo k odpočinku před bossem. Pamatuje si, kdo mu pomohl.');}
    else if(left&&s.potions>0){s.potions--;f.courier=true;s.flags.courierFriend=true;this.advance('Posel znovu na nohou','Jeden lektvar změnil majitele. Posel slibuje proviant u posledních dveří.');}
    else if(left){f.courier=true;s.flags.courierFriend=true;const before=s.hp;this.hurt(8);this.advance('Pomoc vlastníma rukama','Odnesl jsi posla k cestě. Námaha tě stála '+(before-s.hp)+' životů. Za pomoc ti slíbil proviant před posledním střetem.');}
    else{const reward=this.gold(24);f.hunted=true;this.advance('Ukradený měšec','Získal jsi '+reward+' zlata. Za tebou se ozve poslovo volání. Neohlížíš se.');}break;
   case 'merchant':
    if(left&&s.gold>=18){s.gold-=18;s.potions++;this.advance('Lektvar v opasku','Kupec ti podává neporušenou lahvičku. „Zátku nejezte.“');}
    else{f.informed=true;this.advance('Rada na cestu',(left?'Na lektvar nemáš dost zlata. Kupec ti alespoň poradí. ':'')+'Kupec načrtl do prachu několik průchodů. Než odejdeš, kresbu zase zahladí.');}break;
   case 'bell':
    if(left){f.silent=true;const safe=f.scribe||f.authorized||f.stairRoute||f.silentApproach;if(!safe)this.hurt(12);this.advance('Zvon ztichl',f.scribe?'Písař dodržel slovo. Lano je přeříznuté a ve věži je nezvyklé ticho.':f.authorized?'Stráž uvolnila cestu k lanu podle vlastního razítka. Zvon mlčí a výběrčí stále řeší nesrovnalost v nákladním listu.':safe?'Z bočního ochozu ses dostal přímo k lanu. Zvon už nikoho nesvolá.':'Lano ti popálilo ruce za 12 životů. Zvon ale už nezazní.');}
    else if(f.key||f.scribe){this.chest(1,'Pokladnice otevřená klíčem');this.advance('Dveře pokladnice','Za trezorem zůstal zvon. Kořist je na dosah, výběrčí o tobě uslyší.');}
    else{this.chest(0,'Malá schránka před trezorem');this.advance('Trezor nepovolil','Bez klíče jsi našel jen schránku pro drobné. Zvon zůstává funkční.');}break;
   case 'patrol':this.fight(left?'thief':'guard',true);break;
   case 'trail':this.fight(left?'thief':'hunter');break;
   case 'camp':{
    if(left){const heal=Math.round(this.stats().maxHp*(f.courier?.48:.30)),before=s.hp;this.heal(heal);this.advance('Odpočinek dokončen','Obnovil jsi '+(s.hp-before)+' životů.'+(f.courier?' Díky proviantu od posla byl odpočinek vydatnější.':''));}
    else{f.ambush=true;this.advance('Připravená léčka','Vybral sis úkryt s dobrým výhledem. Teď už zbývá počkat na správnou chvíli.');}break;
   }
   case 'fork':
    if(left){f.silent=true;this.advance(r.area===1?'Kořeny jsou přetnuté':r.area===3?'Ozvěna je rozladěná':'Průchod je volný',r.area===1?'Pěšina k mýtině je volná. Přetnuté kořeny sebou naposledy škubnou a pohasnou.':r.area===3?'Krystal praskl a jeskyně konečně přestala vracet každý zvuk. Časomol přišel o svou ozvěnu.':'Odvalil jsi poslední kámen. Za závalem je úzký průchod, kterým se dá protáhnout.');}
    else{f.hunted=true;this.chest(1,r.area===1?'Truhla pod kořeny':r.area===3?'Schránka z časového krystalu':'Truhla ze závalu');this.advance('Truhla je venku',r.area===3?'Schránka je tvoje. Křídla v hloubi jeskyně odpověděla na poslední úder.':'Truhla je tvoje. Rachot padajícího kamení se ještě chvíli rozléhá okolím.');}break;
   case 'cache':
    if(left)this.chest(1,'Opuštěná cechovní bedna');else{s.records[r.area].marks++;s.flags.guildFriend=true;}
    this.advance(left?'Rozlomená pečeť':'Cechovní odměna',left?'Obsah bedny teď patří tobě.':'Cech ti vydal jeden místní materiál. Zakázka na výrobu je o krok blíž.');break;
   case 'boss':if(left)return 'character';this.fight('boss',true);break;
   default:return false;
  }
  return true;
 }
 encounter(event,left){
  const s=this.state,r=s.run,f=r.flags,a=this.stats(),roll=()=>this.random(),before=s.hp,side=left?'left':'right';
  const checkDef=event.checks?.[side],check=checkDef?this.skillCheck(checkDef.stat,checkDef.base):null;if(check)r.lastCheck=copy(check);
  const finish=(text)=>{this.advance(event.title,text,check);return true;};
  const wound=n=>{this.hurt(n);return before-s.hp;};
  switch(event.kind){
   case 'clash':
    if(!left&&check.success){return finish('Proklouzl jsi kolem hlídky. Strážný si tvého průchodu nevšiml.');}
    this.fight('guard',false,left?'Postavil ses hlídce do cesty.':'Strážný si tě všiml při obcházení. Musíš se bránit.');return true;
   case 'hunt':
    if(left){this.fight('thief');return true;}return finish('Zloděj zmizel i s kořistí. Uchoval sis síly pro další cestu.');
   case 'ambush':
    this.fight('hunter');if(!left){r.battle.damage=Math.max(1,r.battle.damage-2);r.battle.hp=Math.round(r.battle.hp*1.15);r.battle.maxHp=r.battle.hp;r.battle.covered=true;r.battle.hpBonus=Math.round(((1+r.battle.hpBonus/100)*1.15-1)*100);this.log('Lovec tě sleduje přes hranu krytu a pevně sevře kuši.','story');}
    else if(check.success){const seen=Math.max(2,Math.round(r.battle.maxHp*.15));r.battle.hp-=seen;this.log('Všímavost odhalila střelce dřív. První zásah mu vzal '+seen+' životů.','proc');}return true;
   case 'toll':
    if(left&&s.gold>=9){s.gold-=9;return finish('Zaplatil jsi 9 zlata. Hlídka tě pustila bez boje.');}this.fight('guard',false,left?'Na poplatek nemáš. Hlídka tasí zbraně.':'Odmítl jsi zaplatit. Strážný tasí zbraň.');return true;
   case 'hazard':{
    const mitigation=Math.min(6,Math.round(a.grit*.08));
    const cost=check.success?0:left?Math.max(1,3-mitigation):Math.max(3,10+Math.floor(roll()*9)-mitigation);
    return finish(cost?'Překážka je za tebou. Ztratil jsi '+wound(cost)+' životů.':left?'Všímavost odhalila nebezpečný bod. Prošel jsi bez zranění.':'Zkratka vyšla bez zranění.');
   }
   case 'salvage':if(left){const bonus=check.success?1:0,cost=wound(Math.max(1,(check.success?2:6)-Math.min(4,Math.round(a.grit*.06))));s.essence+=2+bonus;return finish('Vyprostil jsi '+(2+bonus)+' esence. Ostré hrany tě stály '+cost+' životů.'+(bonus?' Síla uvolnila i hlubší úlomek.':''));}return finish('Materiál zůstal na místě. Pokračuješ bez zranění.');
   case 'chest':
    if(left){const cost=wound(Math.max(0,4-Math.min(3,Math.round(a.grit*.05))));if(check.success){this.chest(0,'Nález: '+event.title);return finish('Za cenu '+cost+' životů jsi uvolnil schránku. Teď ji můžeš otevřít.');}const gold=this.gold(5);return finish('Schránka byla vybraná. Zbylo '+gold+' zlata; ostrý okraj tě stál '+cost+' životů.');}
    return finish('Sebral jsi '+this.gold(4)+' zlata. Schránka zůstala zavřená.');
   case 'respite':if(left){this.heal(10+Math.floor(roll()*9));this.cue('potion');return finish('Klid a obvazy obnovily '+(s.hp-before)+' životů.');}s.essence++;return finish('Při hledání jsi našel 1 esenci. Čas na ošetření už nezbyl.');
   case 'aid':
    if(left&&s.gold>=8){s.gold-=8;f.favors=(f.favors||0)+1;return finish('Předal jsi 8 zlata. Zpráva o tvé pomoci putuje k zásobovacímu stanovišti dál na cestě.');}return finish(left?'Na pomoc ti chybí mince. Rozloučili jste se bez výměny.':'Rozloučil ses a pokračuješ. Zásobovači o tobě žádnou zprávu nedostanou.');
   case 'shrine':if(left){this.heal(8);return finish('Čistá voda a obvaz obnovily '+(s.hp-before)+' životů.');}{const learned=4+(check.success?3:0);this.xp(learned);r.xp+=Math.round(learned*(1+a.xpBonus/100));return finish('Zápis tě naučil něco o zdejších nástrahách. Získal jsi '+Math.round(learned*(1+a.xpBonus/100))+' XP.');}
   case 'trade':if(left&&s.gold>=18){s.gold-=18;s.potions++;return finish('Za 18 zlata přibyl jeden lektvar do opasku.');}f.informed=true;return finish((left?'Na lektvar nemáš, ale rada je zdarma. ':'')+'Kupec ti načrtl cestu a označil několik bočních průchodů. Kresbu si zapamatuješ.');
   case 'tracks':if(left){this.fight('guard',true);r.battle.carriesChest=true;return true;}return finish('Ozbrojenec odnesl náklad. Ty pokračuješ za cílem výpravy.');
   case 'omen':if(left&&s.gold>=6){s.gold-=6;r.shield=Math.min(a.shieldCap,r.shield+12);return finish('Mince zapadly do drážek. Kruh se rozsvítil a na okamžik tě obklopilo chladné světlo.');}if(left)return finish('Nemáš šest zlatých. Ochrana zůstala neaktivní.');f.hunted=true;return finish('Vzal jsi '+this.gold(7)+' zlata. Pečeť zhasla. Tenký tón se nese chodbou a pomalu utichá.');
  }
  return false;
 }
 hurt(n){this.state.hp=Math.max(1,this.state.hp-n);}
 heal(n,overflow=false){const s=this.state,a=this.stats(),extra=Math.max(0,s.hp+n-a.maxHp);s.hp=Math.min(a.maxHp,s.hp+n);if(overflow&&s.run)s.run.shield=Math.min(a.shieldCap,s.run.shield+extra);}
 potion(){const s=this.state;if(!s.run||s.potions<1||s.hp>=this.stats().maxHp)return false;s.potions--;const n=Math.round(this.stats().maxHp*.40);this.heal(n);this.cue('potion');if(s.run.battle)this.log('Elixír obnovil '+n+' životů.','heal',false);return true;}
 fight(kind,elite=false,opening=''){
  const s=this.state,r=s.run,p=D.areas[r.area],level=p.level+r.challenge*2,boss=kind==='boss',def=boss?{name:p.boss,art:p.bossArt,style:'boss',hint:p.hint}:D.foeKinds[kind];
  const scale=1+level*.12;
  const pressure=r.routeVersion===1?(r.pressure?.[r.index]??1):1,depth=r.routeVersion===1?1+.15*r.index/r.rooms.length:1;
  const hp=Math.round((boss?(r.routeVersion===1?120:100):elite?48:36)*scale*pressure*depth*(r.flags.hunted?1.10:1)*(boss&&!r.flags.silent?1.1:1)*(boss&&r.flags.authorized?0.9:1));
  const damage=Math.max(1,Math.round(((r.routeVersion===1?(boss?16:15):(boss?7:4))+level*1.35)*pressure*depth)-(boss&&r.flags.authorized?2:0));
  r.battle={...def,kind,boss,elite,hp,maxHp:hp,damage,turn:'player',round:0,log:[],tactic:null,used:[],charged:false,escaped:false,opening,mechanic:boss?['bell','roots','shell','echo','tribute','avalanche'][r.area]:null,shellBroken:false};
  r.lastFoe={kind,boss};
  r.battle.hpBonus=Math.round(((r.flags.hunted?1.1:1)*(boss&&!r.flags.silent?1.1:1)-1)*100);
  if(opening)this.log(opening,'story');
 }
 combatEffects(){
  const r=this.state.run,b=r?.battle;if(!b)return {enemy:[],hero:[]};
  const f=r.flags,a=this.stats(),enemy=[],hero=[];
  const hp=b.hpBonus??Math.round(((f.hunted?1.1:1)*(b.boss&&!f.silent?1.1:1)-1)*100);
  if(hp)enemy.push('Životy +'+hp+' %');
  if(b.covered)enemy.push('Útok −2');
  if(b.boss&&f.authorized)enemy.push('Kontrola účtů · útok −2');
  if(b.mechanic==='bell'&&!f.silent)enemy.push('Útok +2');
  if(b.mechanic==='roots'&&!f.silent)enemy.push('Regenerace');
  if(b.mechanic==='echo'&&!f.silent)enemy.push('Odraz úderů');
  if(r.shield)hero.push('Štít '+Math.round(r.shield));
  if(b.boss&&f.blessed)hero.push('Ochrana −65 %');
  if(b.boss&&f.ambush&&b.round===0)hero.push('První úder +65 %');
  if(b.boss&&(f.informed||f.silent||a.evasion>=12))hero.push('Jistý ústup');
  return {enemy,hero};
 }
 log(text,type='info',audio=true){const b=this.state.run?.battle;if(b){b.log.push({text,type});b.log=b.log.slice(-30);b.last=type;if(audio){const cue={attack:'strike',crit:'critical',dodge:'dodge',block:'block',heal:'heal',proc:'magic'}[type];if(cue)this.cue(cue);}}}
 step(){
  const s=this.state,r=s.run,b=r?.battle;if(!b||b.tactic||s.notice||s.pending.length)return false;
  if(b.turn==='player'){
   const a=this.stats(),critical=this.random()<a.crit/100;
   let hit=Math.round(a.damageMin+this.random()*(a.damageMax-a.damageMin));
   if(critical)hit=Math.round(hit*1.75);
   if(r.riposte&&a.traits.includes('riposte')){hit*=2;r.riposte=false;this.log('Druhý dech: úhyb připravil dvojnásobný zásah.','proc');}
   if(r.revenge&&a.traits.includes('hedgehog')){hit+=Math.round(a.armor*.6);r.revenge=false;this.log('Ježčí odveta: zbroj posílila úder.','proc');}
   if(a.traits.includes('execute')&&b.hp/b.maxHp<.35){hit=Math.round(hit*1.55);this.log('Poslední slovo: zraněný protivník dostává silnější úder.','proc');}
   if(b.round===0&&r.flags.ambush&&b.boss){hit=Math.round(hit*1.65);this.log('Silný úvodní zásah · poškození +65 %.','proc');}
   if(b.style==='armored'&&b.round%3!==2)hit=Math.max(1,Math.round(hit*.65));
   if(b.mechanic==='shell'&&!b.shellBroken){hit=Math.max(1,Math.round(hit*.7));this.log('Předákův krunýř tlumí zásah. Silné přerušení jej rozbije.','enemy');}
   if(b.mechanic==='tribute'&&hit<b.damage*1.5){hit=Math.max(1,hit-3);this.log('Daň ze slabých úderů: králův erb pohltil 3 poškození.','enemy');}
   if(D.itemById[s.equipped.weapon?.kind]?.id==='bow'&&b.round===0)hit=Math.round(hit*1.3);
   b.hp=Math.max(0,b.hp-hit);b.round++;b.lastHit=hit;
   this.log((s.heroName||'Dobrodruh')+' → '+hit+' poškození'+(critical?' · KRITICKÝ ZÁSAH':''),critical?'crit':'attack');
   if(a.leech){const heal=Math.max(1,Math.round(hit*a.leech/100));this.heal(heal,a.traits.includes('overflow'));this.log('Kradení života +'+heal+(r.shield?' · štít '+r.shield:''),'heal');}
   if(b.hp<=0){this.win();return true;}
   const phase=b.hp/b.maxHp<=.35?'last':'first';
   if(b.boss&&!b.used.includes(phase)){
    const tells=[['Zvednuté kladivo','Výběrčí zvedá kladivo oběma rukama. Než udeří, můžeš ustoupit nebo ho zasáhnout.'],['Jelen sklání paroží','Jelen hrabe kopytem a sklání paroží přímo proti tobě. Chystá se vyrazit.'],['Předák se napřahuje','Předák zvedá krumpáč nad hlavu. Při nápřahu se odkrývá spoj v jeho kamenném krunýři.'],['Křídla nad krystaly','Časomol zvedá křídla a krystaly pod ním rozeznívají tvůj poslední úder. Teď lze tvora zasáhnout, nebo se skrýt před ozvěnou.'],['Král zvedá palcát','Král se zapřel a napřahuje palcát. „Tohle půjde na váš účet.“'],['Kamení nad stezkou','Král zvedá korunu k balvanu nad stezkou. Můžeš se stáhnout do bezpečí, nebo ho zasáhnout, než kouzlo balvan uvolní.']][r.area];
    b.used.push(phase);b.tactic={phase,title:tells[0],text:tells[1],choices:['Ustoupit a krýt se','Přerušit silným úderem'],hints:[r.flags.silent?'Připravená cesta je volná.':r.flags.informed?'Vzpomínáš si na kupcovu radu.':'Místo k ústupu si musíš najít.','Během nápřahu je odkrytý.']};
    this.cue('warning');
    return true;
   }
   b.turn='enemy';
  }else this.enemy();
  return true;
 }
 tactic(side){
  const s=this.state,r=s.run,b=r?.battle;if(!b?.tactic||!['left','right'].includes(side))return false;
  const a=this.stats();b.tactic=null;
  if(side==='left'){
   const full=a.evasion>=12||r.flags.informed||r.flags.silent;
   if(full){r.riposte=true;this.log('Ústup vyšel. Útok tě minul.','dodge');}
   else {this.receive(Math.round(b.damage*.65),true);this.log('Kryt zachytil většinu úderu. Zbytek síly úderu tě odhodil zpět.','block');}
   r.revenge=true;
  }else{
   const interrupted=a.damageMax>=b.damage*2.6;
   const hit=Math.round(a.damageMax*(interrupted?1.3:.85));b.hp=Math.max(0,b.hp-hit);
   this.log('Pokus o přerušení → '+hit+' poškození. '+(interrupted?'Boss ztratil rovnováhu.':'Boss úder dokončil.'),'attack');
   if(interrupted&&b.mechanic==='shell'){b.shellBroken=true;this.log('Krunýř praskl. Další zásahy už nebude tlumit.','proc');}
   if(!interrupted&&b.hp>0)this.receive(Math.round(b.damage*(b.mechanic==='avalanche'?1.9:1.55)),true);
  }
  b.turn='player';if(s.hp<=0)this.lose();else if(b.hp<=0)this.win();return true;
 }
 enemy(){
  const s=this.state,r=s.run,b=r.battle,a=this.stats();
  if(b.style==='hunter'&&!b.charged){b.charged=true;this.log('Lovec nabíjí. Příští výstřel bude silnější.','enemy');b.turn='player';return;}
  if(b.style==='thief'&&b.round>=4){b.escaped=true;this.log('Krysa utekla. Zůstaly jen drobné.','enemy');this.win();return;}
  if(b.mechanic==='roots'&&b.round%2===0&&!r.flags.silent){const restored=Math.min(b.maxHp-b.hp,4+D.areas[r.area].level);b.hp+=restored;this.log('Kořeny vrátily jelenovi '+restored+' životů. Jeho rány se zacelují.','heal');}
  if(this.random()<a.evasion/100){r.riposte=true;this.log('ÚHYB · nepřítel zasáhl jen tvůj stín.','dodge');}
  else{
   let n=b.damage+(b.style==='spirit'?Math.floor(b.round/3):0);
   if(b.mechanic==='echo'&&!r.flags.silent&&b.round%2===0){const echo=Math.max(2,Math.round((b.lastHit||b.damage)*.25));n+=echo;this.log('Ozvěna posledního úderu přidala '+echo+' poškození.','enemy');}
   if(b.charged){n=Math.round(n*1.8);b.charged=false;}
   if(b.mechanic==='bell'&&!r.flags.silent){n+=2;this.log('Posílený útok · +2 poškození.','enemy');}
   if(b.mechanic==='avalanche')n+=Math.floor(b.round/3);
   const block=this.random()<a.block/100;
   if(block){n=Math.round(n*.45);r.revenge=true;this.log('BLOK · štít zachytil útok.','block');}
   this.receive(n);
  }
  b.turn='player';
  if(s.hp<=0)this.lose();else if(b.hp<=0)this.win();
 }
 receive(n,tactical=false){
  const s=this.state,r=s.run,b=r.battle,a=this.stats();
  if(tactical&&r.flags.blessed){n=Math.round(n*.35);r.flags.blessed=false;this.log('Ochrana zeslabila těžkou ránu o 65 %.','proc');}
  let hurt=Math.max(0,Math.round((n-a.absorb)*(1-Math.min(.65,a.armor/(a.armor+85)))));
  const absorbed=Math.min(r.shield,hurt);r.shield-=absorbed;hurt-=absorbed;s.hp=Math.max(0,s.hp-hurt);
  this.log(b.name+' → '+hurt+' poškození'+(absorbed?' · štít pohltil '+absorbed:''),'enemy');this.cue(hurt?'hurt':'shield');
  const reflected=Math.round(hurt*a.thorns/100);if(reflected){b.hp=Math.max(0,b.hp-reflected);this.log('TRNY → '+reflected+' zpět nepříteli.','proc',false);this.cue('thorns');}
  if(s.hp<=0&&s.potions>0){s.potions--;s.hp=Math.round(a.maxHp*.35);this.log('Opasek tě zachránil. Automaticky spotřeboval jeden elixír.','heal',false);this.cue('potion');}
 }
 win(){
  const s=this.state,r=s.run,b=r.battle,p=D.areas[r.area],first=!s.records[r.area].clears;
  this.cue(b.escaped?'dodge':b.boss?'victory':'coins');
  const long=r.routeVersion===1;
  const gold=this.gold(b.escaped?(long?2:4):(b.boss?42:long?4:12)+(long&&!b.boss?Math.ceil(p.level/2):p.level*3)+r.challenge*(long?3:8));
  const xp=(b.boss?40:long?5:18)+(long&&!b.boss?Math.ceil(p.level/2):p.level*3)+r.challenge*(long?3:6);this.xp(xp);r.xp+=Math.round(xp*(1+this.stats().xpBonus/100));
  const essence=b.boss?8:long?1:2;s.essence+=essence;s.hp=Math.min(this.stats().maxHp,s.hp+(long?0:4));
  const logs=copy(b.log),boss=b.boss,escaped=b.escaped;r.lastFoe={kind:b.kind,boss,carriesChest:!!b.carriesChest};r.battle=null;
  if(boss){
   const record=s.records[r.area];record.clears++;record.highest=Math.max(record.highest,r.challenge);record.marks+=2;
   s.unlocked=Math.max(s.unlocked,Math.min(D.areas.length,r.area+2));s.metrics.bosses++;
   const loot=this.drop('boss');s.pending.push({type:'item',item:loot,note:'Boss poražen: garantovaný předmět úrovně '+loot.ilvl+'.'});
   this.chapterReport(r.area,'win',first);
   const report={win:true,area:r.area,challenge:r.challenge,gold:r.gold,xp:r.xp,marks:2,choices:r.choices.length,logs};
   s.lastReport=report;s.run=null;
   this.note('Zakázka splněna',(first?['Výběrčí je poražen. Cesta k mostu je otevřená.','Jelen je volný a živá pečeť přesvědčila i Mostmistra Brumlu.','Předákův krunýř se rozpadl. Nákladní knihy ukazují cestu k jeskyni.','Časomol padl. Ukradené hodiny se vracejí údolím a jeskynní stezka vede k hradu.','Král prohrál střet a uprchl ke svatyni v horách.','Koruna je zlomená. Král se vzdal a údolí znovu pozná noc.'][r.area]:'Ozvěna kletby je poražena. Skutečné místo zůstává svobodné.')+' Získáváš 2× '+p.material+'.'+(first&&r.area<D.areas.length-1?' Na mapě se otevřelo další místo.':' Můžeš zvýšit hrozbu pro silnější kořist.'));
  }else{
   r.index++;
   if(!escaped&&this.random()<this.dropChance(b.elite))s.pending.push({type:'item',item:this.drop(b.elite?'chest':'enemy'),note:'Vzácný nález přímo z protivníka.'});
   else if(!escaped&&(b.carriesChest||this.random()<(long?.035:.12)))this.chest(0,'Truhla po hlídce');
   this.note(escaped?'Krysa unikla':'Souboj vyhraný','+'+gold+' zlata · +'+Math.round(xp*(1+this.stats().xpBonus/100))+' XP · +'+essence+' esence. '+(escaped?'Musíš ji porazit nejpozději čtvrtým útokem; pomůže vyšší poškození.':'Můžeš prohlédnout výbavu a pokračovat.'));
   s.notice.logs=logs;
  }
 }
 lose(){
  const s=this.state,r=s.run;const lost=Math.min(s.gold,Math.round(r.gold*.15)),logs=copy(r.battle?.log||[]);
  this.cue('defeat');
  this.chapterReport(r.area,'loss');
  s.gold-=lost;s.lastReport={win:false,area:r.area,challenge:r.challenge,gold:r.gold-lost,xp:r.xp,marks:0,choices:r.choices.length,logs};
  s.run=null;s.hp=Math.round(this.stats().maxHp*.65);
  this.note('Výprava skončila','Ztratil jsi '+lost+' zlata z této výpravy. Zkušenosti a získaná výbava zůstávají. V přehledu boje najdeš poslední zásahy.');
 }
 retreat(){const s=this.state;if(!s.run||s.run.battle||s.pending.length)return false;this.chapterReport(s.run.area,'retreat');s.run=null;s.notice=null;this.note('Návrat do tábora','Získaná kořist zůstává. Příští výprava začne od vstupu.');return true;}
 chest(tier,note){const r=this.state.run;this.state.pending.push({type:'chest',tier,area:r?.area??this.state.selectedArea,challenge:r?.challenge??0,ilvl:D.areas[r?.area??this.state.selectedArea].level+(r?.challenge??0)*2,note});}
 openChest(){
  const s=this.state,p=s.pending[0];if(p?.type!=='chest')return false;
  s.pending.shift();const chance=Math.min(1,[.65,.85,1][p.tier]*(1+this.stats().luck/100));
  if(this.random()<chance)s.pending.unshift({type:'item',item:this.drop('chest',p.area??0,p.challenge??0),note:p.note});
  else{const gold=this.gold(14+p.tier*9);s.essence+=3;this.note('Mince pod dvojitým dnem','Truhla obsahovala '+gold+' zlata a 3 esence.');}
  return true;
 }
 loot(action){
  const s=this.state,p=s.pending[0];if(p?.type!=='item'||p.previewOnly)return false;
  if(action==='take'&&s.inventory.length>=s.capacity)return false;
  if(action==='equip'){
   if(s.run?.battle)return false;
   const slot=D.itemById[p.item.kind].slot,old=s.equipped[slot];if(old&&s.inventory.length>=s.capacity)return false;
   const hp=this.equipmentHp({...s.equipped,[slot]:p.item});if(hp<1)return false;
   if(old)s.inventory.push(old);s.equipped[slot]=p.item;s.hp=hp;
  }else if(action==='sell')s.gold+=this.price(p.item);
  else if(action==='salvage')s.essence+=2+D.rarityIndex(p.item.rarity)*2;
  else if(action==='take')s.inventory.push(p.item);else return false;
  s.pending.shift();return true;
 }
 equip(id){
  const s=this.state;if(s.run?.battle)return false;const n=s.inventory.findIndex(x=>x.id===id);if(n<0)return false;
  const it=s.inventory[n],slot=D.itemById[it.kind].slot,old=s.equipped[slot],hp=this.equipmentHp({...s.equipped,[slot]:it});if(hp<1)return false;
  s.inventory.splice(n,1);if(old)s.inventory.push(old);
  s.equipped[slot]=it;s.hp=hp;return true;
 }
 equipmentHp(equipped){return this.stats(equipped).maxHp-(this.stats().maxHp-this.state.hp);}
 unequip(slot){const s=this.state;if(s.run?.battle||!s.equipped[slot]||s.inventory.length>=s.capacity)return false;const hp=this.equipmentHp({...s.equipped,[slot]:null});if(hp<1)return false;s.inventory.push(s.equipped[slot]);s.equipped[slot]=null;s.hp=hp;return true;}
 sell(id,salvage=false){const s=this.state,n=s.inventory.findIndex(x=>x.id===id);if(n<0)return false;const it=s.inventory[n];if(salvage)s.essence+=2+D.rarityIndex(it.rarity)*2;else s.gold+=this.price(it);s.inventory.splice(n,1);return true;}
 mergePreview(baseId,donorId){
  const s=this.state,a=s.inventory.find(x=>x.id===baseId),b=s.inventory.find(x=>x.id===donorId);
  if(!a||!b||a.id===b.id||D.itemById[a.kind].slot!==D.itemById[b.kind].slot)return null;
  const out=copy(a),tier=D.rarityIndex(a.rarity),promote=a.rank===3&&b.rank===3&&a.rarity===b.rarity&&tier<5;
  out.rank=promote?1:Math.min(3,a.rank+1);out.rarity=D.rarities[tier+(promote?1:0)].id;
  out.ilvl=Math.max(a.ilvl,b.ilvl);out.basePower=Math.max(this.basePower(a),this.basePower(b))*1.10;
  const target=Math.max(a.affixes.length,b.affixes.length);
  out.affixes=a.affixes.map(x=>({id:x.id,value:Math.max(x.value,b.affixes.find(y=>y.id===x.id)?.value||0)}));
  for(const gene of [...b.affixes].sort((x,y)=>y.value/D.affixById[y.id].base-x.value/D.affixById[x.id].base)){
   if(out.affixes.length>=target)break;if(!out.affixes.some(x=>x.id===gene.id))out.affixes.push(copy(gene));
  }
  if(!out.trait&&b.trait){out.trait=b.trait;out.name=b.name;}
  const cost=6+tier*4;
  return {item:out,cost,promote,mutation:'Každý zděděný afix má 20% šanci zesílit o 1–2 body. Nic z náhledu se nezhorší.'};
 }
 merge(a,b){
  const s=this.state,p=this.mergePreview(a,b);if(!p||s.run?.battle||s.essence<p.cost)return false;
  const out=p.item;out.id=this.uid();for(const gene of out.affixes)if(this.random()<.2)gene.value+=1+Math.floor(this.random()*2);
  s.inventory=s.inventory.filter(x=>x.id!==a&&x.id!==b);s.inventory.push(out);s.essence-=p.cost;s.metrics.merges++;
  s.pending.push({type:'item',item:copy(out),note:'Spojení dokončeno. Předmět je už bezpečně v inventáři.',previewOnly:true});
  return out;
 }
 craft(area=this.state.selectedArea){
  const s=this.state,p=D.areas[area],record=s.records[area];if(!p||area>=s.unlocked||record.marks<4||s.essence<10||s.run?.battle||s.pending.length)return false;
  record.marks-=4;s.essence-=10;
  const ilvl=p.level+Math.max(0,record.highest)*2;s.pending.push({type:'item',item:this.signature(p.recipe,ilvl),note:'Cílená výroba: 4× '+p.material+' a 10 esence.'});return true;
 }
 shopList(){
  const area=this.state.selectedArea,p=D.areas[area],ilvl=p.level+Math.max(0,this.state.records[area].highest)*2;
  return D.itemKinds.filter(d=>p.focus.includes(d.slot)).slice(0,4).map((d,i)=>({kind:d.id,rarity:i===3?'rare':'uncommon',ilvl,price:45+ilvl*15+i*15}));
 }
 buy(index){const s=this.state,row=this.shopList()[index];if(!row||s.gold<row.price||s.pending.length||s.run)return false;s.gold-=row.price;s.pending.push({type:'item',item:this.item(row.kind,row.rarity,row.ilvl,[['damage',3+row.ilvl]]),note:'Koupený předmět. Zobrazená a zaplacená cena jsou stejné.'});return true;}
 buyPotion(){const s=this.state;if(s.run||s.gold<18)return false;s.gold-=18;s.potions++;return true;}
 rest(){const s=this.state;if(s.run||s.hp>=this.stats().maxHp)return false;s.hp=this.stats().maxHp;return true;}
}
globalThis.RPG={Game,clamp};
})();
