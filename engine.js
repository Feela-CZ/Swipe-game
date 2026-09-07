/* Deterministic domain model. UI, clocks and persistence live outside this file. */
(function () {
'use strict';
const D=globalThis.RPGData;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const integer=(v,f=0)=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):f;
const copy=v=>JSON.parse(JSON.stringify(v));
const odds=[[.93,.069,.001],[.76,.215,.025],[.54,.36,.10],[.30,.41,.29],[.12,.39,.49],[.05,.40,.55]];
class Game {
 constructor(raw=null,random=Math.random) {this.random=random;this.serial=0;this.state=this.fresh();if(raw)this.migrate(raw);}
 uid(){return 'i'+(++this.serial)+'-'+Math.floor(this.random()*1e9).toString(36);}
 pick(list){return list[Math.min(list.length-1,Math.floor(this.random()*list.length))];}
 weighted(weights){let n=this.random()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return weights.length-1;}
 item(kind,rarity='common',ilvl=1,genes=null) {
  const tier=D.rarityIndex(rarity),n=this.weighted(odds[Math.max(0,tier)])+1,pool=[...D.affixDefinitions];
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
  return {version:3,level:1,xp:0,points:0,growth:{might:0,grit:0,agility:0,intelligence:0,luck:0},
   gold:35,essence:12,potions:3,hp:120,equipped,inventory:[],capacity:24,pending:[],notice:null,
   selectedArea:0,selectedChallenge:0,records:D.areas.map(()=>({clears:0,highest:-1,marks:0})),
   unlocked:1,run:null,journal:[],flags:{},settings:{sound:false,speed:1},lastReport:null,
   metrics:{choices:0,merges:0,runs:0,bosses:0}};
 }
 migrate(raw){
  const s=this.state,g=raw.growth||{};
  s.level=Math.max(1,integer(raw.level,1));s.xp=integer(raw.xp);s.points=integer(raw.points??raw.statPoints);
  s.growth={might:integer(g.might),grit:integer(g.grit),agility:integer(g.agility??g.guile),intelligence:integer(g.intelligence??g.learning),luck:integer(g.luck)};
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
  s.capacity=Math.max(24,s.inventory.length);
  s.journal=Array.isArray(raw.journal)?raw.journal.slice(-60):[];
  s.flags=raw.version===3?{...raw.flags}:{};
  if(raw.version===3){
   s.records=D.areas.map((_,i)=>({clears:integer(raw.records?.[i]?.clears),highest:Math.max(-1,Math.floor(Number(raw.records?.[i]?.highest??-1))),marks:integer(raw.records?.[i]?.marks)}));
   s.unlocked=clamp(integer(raw.unlocked,1),1,D.areas.length);
   s.selectedArea=clamp(integer(raw.selectedArea),0,s.unlocked-1);
   s.selectedChallenge=clamp(integer(raw.selectedChallenge),0,s.records[s.selectedArea].highest+1);
   s.settings={sound:raw.settings?.sound===true,speed:raw.settings?.speed===2?2:1};
   s.lastReport=raw.lastReport||null;s.metrics={...s.metrics,...raw.metrics};
   s.run=raw.run&&D.areas[raw.run.area]&&Array.isArray(raw.run.rooms)?copy(raw.run):null;
   s.pending=(raw.pending||[]).map(p=>p.type==='item'?{...p,item:sanitize(p.item)}:copy(p)).filter(p=>p.type!=='item'||p.item);
   s.notice=raw.notice||null;
  }else{
   const completed=raw.map?.completed||[];
   s.records.forEach((r,i)=>{if(completed.includes(D.areas[i].id)){r.clears=1;r.highest=0;}});
   s.unlocked=clamp(Math.max(1,(raw.map?.unlocked||[]).length),1,5);
   if(raw.pendingLoot?.item){const it=sanitize(raw.pendingLoot.item);if(it)s.pending.push({type:'item',item:it,note:'Nález z předchozí výpravy.'});}
   if(raw.pendingChest)s.pending.push({type:'chest',tier:clamp(integer(raw.pendingChest.tier),0,2),ilvl:1,note:'Truhla z předchozí výpravy.'});
   this.note('Nová kapitola','Výbava, měny a rozdělené body jsou zachované. Původní rozehraná cesta skončila; můžeš vyrazit do nové výpravy.');
  }
  s.hp=clamp(Number.isFinite(raw.hp)?raw.hp:120,1,this.stats().maxHp);
  this.serial+=s.inventory.length+100;
 }
 basePower(item){
  const d=D.itemById[item.kind];
  return Math.max(item.basePower||0,d.bonus*D.rarityById[item.rarity].multiplier*(1+(item.rank-1)*.25)*(1+(item.ilvl-1)*.16));
 }
 stats(equipped=this.state.equipped){
  const g=this.state.growth,a={damageMin:7+g.might*1.2,damageMax:11+g.might*1.8,maxHp:120+g.grit*7,armor:g.grit*.6,
   crit:5+g.agility*1.2,evasion:3+g.agility*.8,leech:0,thorns:0,absorb:0,haste:0,luck:g.luck,
   gold:0,block:0,traits:[],xpBonus:g.intelligence*5,shieldCap:20+g.intelligence*3};
  for(const it of Object.values(equipped).filter(Boolean)){
   const slot=D.itemById[it.kind].slot,p=this.basePower(it);
   if(slot==='weapon'){a.damageMin+=p*1.6;a.damageMax+=p*2;}
   else if(['head','body','feet','hands','offhand'].includes(slot)){a.armor+=p*1.6;a.maxHp+=p*3;if(slot==='offhand')a.block+=12;}
   else {a.damageMin+=p*.3;a.damageMax+=p*.5;}
   if(it.trait)a.traits.push(it.trait);
   for(const x of it.affixes){
    if(x.id==='damage'){a.damageMin+=x.value;a.damageMax+=x.value;}
    else if(x.id==='vitality')a.maxHp+=x.value;
    else if(x.id in a && typeof a[x.id]==='number')a[x.id]+=x.value;
   }
  }
  for(const [k,max] of Object.entries({crit:65,evasion:40,leech:25,thorns:100,absorb:40,haste:65,luck:60,block:45}))a[k]=clamp(a[k],0,max);
  a.gold+=a.luck*2;
  for(const k of ['damageMin','damageMax','maxHp','armor'])a[k]=Math.round(a[k]);
  return a;
 }
 attackDelay(){return Math.round(1050/(1+this.stats().haste/100));}
 threshold(){return 38+this.state.level*22;}
 xp(amount){const s=this.state;let added=0;s.xp+=Math.round(amount*(1+this.stats().xpBonus/100));while(s.xp>=this.threshold()){s.xp-=this.threshold();s.level++;s.points++;added++;}if(added)this.jot('Úroveň '+s.level+' · '+added+' bod výcviku čeká v Postavě.');}
 spend(stat){const s=this.state;if(!Object.hasOwn(s.growth,stat)||s.points<1||s.run?.battle)return false;const max=this.stats().maxHp;s.growth[stat]++;s.points--;s.hp+=this.stats().maxHp-max;return true;}
 jot(text){this.state.journal.push(text);this.state.journal=this.state.journal.slice(-60);}
 note(title,text){this.state.notice={title,text};this.jot(text);}
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
 dropChance(elite=false){return Math.min(.32,(elite?.16:.065)*(1+this.stats().luck/100));}
 price(item){return Math.round((8+this.basePower(item)*3+item.affixes.reduce((n,x)=>n+x.value*.5,0))*(1+D.rarityIndex(item.rarity)*.3));}
 room(){
  const r=this.state.run;if(!r)return null;
  return this.describe(r.rooms[r.index]||'boss');
 }
 start(area=this.state.selectedArea,challenge=this.state.selectedChallenge){
  const s=this.state;if(s.run||s.pending.length||area>=s.unlocked||area<0||!D.areas[area])return false;
  challenge=clamp(integer(challenge),0,s.records[area].highest+1);s.notice=null;s.lastReport=null;
  const rooms=area===0?['gate','scribe',this.pick(['well','wounded','merchant']),'bell','patrol','camp','boss']:
   ['trail','wounded',this.pick(['well','merchant','cache']),'fork','patrol','camp','boss'];
  s.run={area,challenge,rooms,index:0,flags:{},battle:null,gold:0,xp:0,choices:[],shield:0,riposte:false,revenge:false};
  s.metrics.runs++;this.jot('Výprava: '+D.areas[area].name+' · hrozba '+(challenge+1));return true;
 }
 describe(id){
  const r=this.state.run,f=r.flags,area=D.areas[r.area];
  const defs={
   gate:['gate','Za branou','Strážný chce vstupné. Na směnovém lístku má přeškrtnuté tři dny.',['Zaplatit 8 zlata','Trvat na průchodu'],['Mince nebo rozhovor?','Ruka mu sklouzla ke zbrani.']],
   scribe:['scribe','Písař za mřížemi',this.state.flags.scribeFriend?'„Zase vy? Tentokrát mě zavřeli za správné datum.“ Písař se už natahuje po klíči.':'„Zvon svolá všechny stráže,“ šeptá písař. Klíč od cely i trezoru visí na stejném kroužku.',['Osvobodit písaře','Vzít klíč a odejít'],['Zná chodby i jejich obyvatele.','Za mřížemi zůstane ticho.']],
   well:['well','Prsten u studny','Na obrubě leží prsten. Uvnitř je vyryto jméno, které už jsi zahlédl na vývěsce pohřešovaných.',['Nechat si prsten','Vrátit jej rodině'],['Vejde se do kapsy.','Dům stojí u cesty.']],
   wounded:['wounded','Posel bez zásilky',this.state.flags.courierFriend?'Posel tě poznává. „Ještě vám dlužím za minule.“ Tentokrát s sebou nese mapu.':'Raněný posel drží prázdnou brašnu. „Balík odnesli. Poštovné prý nestačilo.“',['Pomoci mu','Vzít jeho zásoby'],['Lektvar by ho postavil na nohy.','Brašna není úplně prázdná.']],
   merchant:['merchant','Kupec pod lucernou','Kupec rozloží zboží. „Dnes prodávám jen to, co se v noci nepohybuje. Většinou.“',['Koupit lektvar · 18 zlata','Zeptat se na cestu'],['Lahvičku můžeš prohlédnout.','Lidé mu vyprávějí leccos.']],
   bell:['bell',f.scribe?'Slíbená pomoc':'Zvon a pokladnice',f.scribe?'Písař čeká u lana. „Trezor, nebo ticho? Na obojí nemáme čas.“':'Za schody leží pokladnice. Nad hlavou se houpe poplašný zvon.',['Umlčet zvon','Otevřít pokladnici'],['Někdo si toho všimne až pozdě.','Klíč v kapse by mohl pasovat.']],
   patrol:['patrol','Kroky za rohem','Dva páry kroků. Pak jeden. Zbytek hlídky zřejmě vzdal docházku.',['Projít boční chodbou','Vyjít strážnému vstříc'],['Ve stínu chrastí cizí měšec.','Zbroj má poctivou, přilbu křivě.']],
   camp:['camp','Před posledními dveřmi',f.courier?'Posel ti na schodech nechal proviant. „Expresní doručení. Tentokrát zdarma.“':'Za dveřmi se ozývá škrábání pera. Ještě máš chvíli na přípravu.',['Odpočinout si','Připravit léčku'],['Srovnat dech a ošetřit rány.','První zásah může rozhodnout.']],
   boss:['boss',area.boss,r.area===0?(f.silent?'Zvon mlčí. Výběrčí je na své účty sám.':'Zvon se rozezní. Výběrčí připočítává příplatek za vyrušení.'):'Zdroj zdejší kletby stojí před tebou. '+area.hint,['Zkontrolovat výbavu','Vstoupit do boje'],['Můžeš se vrátit k přípravě.','Za vítězství čeká předmět i materiál.']],
   trail:['trail',area.name,'Stezka se dělí. Na jedné větvi leží čerstvé stopy. Z druhé se ozývá napínání tětivy.',['Sledovat stopy','Obejít cestu po svahu'],['Někdo něco ztratil.','Střelec už si vybírá místo.']],
   fork:['fork','Cesta pod povrchem','Zkratku poznáš podle značky na kameni. Vedle ní je otvor zavalený starými trámy.',['Uvolnit zkratku','Prohledat zavalenou skrýš'],['Může pomoct při střetu s bossem.','Pod trámy se něco leskne.']],
   cache:['cache','Zapečetěná bedna','Pečeť cechu je rozlomená. U bedny stojí malá cedule: „Převzal soused.“',['Otevřít bednu','Odnést ji cechu'],['Soused tu není.','Cech nezapomíná na zásilky.']]
  };
  const row=defs[id]||defs.boss;
  return {id:row[0],title:row[1],text:row[2],choices:row[3],hints:row[4]};
 }
 advance(title,text){this.state.run.index++;this.note(title,text);}
 choose(side){
  const s=this.state,r=s.run;if(!r||r.battle||s.notice||s.pending.length||!['left','right'].includes(side))return false;
  const id=this.room().id,left=side==='left',f=r.flags;
  s.metrics.choices++;r.choices.push(id+':'+side);
  switch(id){
   case 'gate':
    if(left&&s.gold>=8){s.gold-=8;this.advance('Vstupné zaplaceno','Strážný schoval mince. „Potvrzení vám vydá poslední patro.“');}
    else this.fight('guard',false,left?'Na vstupné ti chybí mince. Strážný navrhuje praktickou zkoušku.':'Strážný nesouhlasí. Bude to muset vysvětlit zbraní.');break;
   case 'scribe':
    if(left){f.scribe=true;s.flags.scribeFriend=true;this.advance('Písař je volný','„Najdete mě u zvonu.“ Písař si cestou narovnává ukradený klobouk.');}
    else{f.key=true;this.advance('Klíč od pokladnice','Písař se dívá za tebou. Klíč je tvůj, pomoc ne.');}break;
   case 'well':
    if(left){s.pending.push({type:'item',item:this.item('ring','uncommon',D.areas[r.area].level+r.challenge*2),note:'Prsten, který sis nechal u studny.'});this.advance('Nález u studny','Prsten máš u sebe. O jeho dalším osudu rozhodneš v kartě nálezu.');}
    else{this.gold(16);s.flags.familyFriend=true;f.blessed=true;this.advance('Prsten se vrátil domů','Rodina tě pohostila. Do konce výpravy získáváš ochranu proti první silné ráně.');}break;
   case 'wounded':
    if(left&&s.flags.courierFriend){f.courier=true;this.advance('Doručený dluh','Posel ti popsal bezpečné místo k odpočinku před bossem. Pamatuje si, kdo mu pomohl.');}
    else if(left&&s.potions>0){s.potions--;f.courier=true;s.flags.courierFriend=true;this.advance('Posel znovu na nohou','Jeden lektvar změnil majitele. Posel slibuje proviant u posledních dveří.');}
    else if(left){f.courier=true;this.hurt(8);this.advance('Pomoc vlastníma rukama','Bez lektvaru jsi ho odnesl k cestě. Ztratils 8 životů, získals vděčného spojence.');}
    else{this.gold(24);f.hunted=true;this.advance('Cizí zásoby','Vzal jsi 24 základního zlata. Posel si zapamatoval tvou tvář; zpráva může předběhnout tvůj příchod.');}break;
   case 'merchant':
    if(left&&s.gold>=18){s.gold-=18;s.potions++;this.advance('Lektvar v opasku','Kupec ti podává neporušenou lahvičku. „Zátku nejezte.“');}
    else{f.informed=true;this.advance('Rada na cestu','„Až boss zvedne zbraň, sledujte nohy.“ Při příštím úhybném manévru ti rada pomůže.');}break;
   case 'bell':
    if(left){f.silent=true;if(!f.scribe)this.hurt(12);this.advance('Zvon ztichl',f.scribe?'Písař dodržel slovo. Zvon je vyřazený a boss nedostane posilu.':'Lano ti popálilo ruce za 12 životů. Zvon ale už nezazní.');}
    else if(f.key||f.scribe){this.chest(1,'Pokladnice otevřená klíčem');this.advance('Dveře pokladnice','Za trezorem zůstal zvon. Kořist je na dosah, výběrčí o tobě uslyší.');}
    else{this.chest(0,'Malá schránka před trezorem');this.advance('Trezor nepovolil','Bez klíče jsi našel jen schránku pro drobné. Zvon zůstává funkční.');}break;
   case 'patrol':this.fight(left?'thief':'guard',true);break;
   case 'trail':this.fight(left?'thief':'hunter');break;
   case 'camp':{
    if(left){const heal=Math.round(this.stats().maxHp*(f.courier?.48:.30));this.heal(heal);this.advance('Dech před bouří','Odpočinek obnovil až '+heal+' životů.'+(f.courier?' Proviant od posla pomohl.':''));}
    else{f.ambush=true;this.advance('Připravená léčka','První zásah proti bossovi bude o 65 % silnější.');}break;
   }
   case 'fork':
    if(left){f.silent=true;this.advance('Zkratka je volná','Při ústupu od bosse budeš mít kam uhnout.');}
    else{f.hunted=true;this.chest(1,'Skrýš pod trámy');this.advance('Skrýš pod trámy','Hluk se rozléhá chodbou. Našel jsi truhlu, ale příchod už neutajíš.');}break;
   case 'cache':
    if(left)this.chest(1,'Opuštěná cechovní bedna');else{s.records[r.area].marks++;s.flags.guildFriend=true;}
    this.advance(left?'Rozlomená pečeť':'Cechovní odměna',left?'Obsah bedny teď patří tobě.':'Cech ti vydal jeden místní materiál. Zakázka na výrobu je o krok blíž.');break;
   case 'boss':if(left)return 'character';this.fight('boss',true);break;
   default:return false;
  }
  return true;
 }
 hurt(n){this.state.hp=Math.max(1,this.state.hp-n);}
 heal(n,overflow=false){const s=this.state,a=this.stats(),extra=Math.max(0,s.hp+n-a.maxHp);s.hp=Math.min(a.maxHp,s.hp+n);if(overflow&&s.run)s.run.shield=Math.min(a.shieldCap,s.run.shield+extra);}
 potion(){const s=this.state;if(!s.run||s.potions<1||s.hp>=this.stats().maxHp)return false;s.potions--;const n=Math.round(this.stats().maxHp*.40);this.heal(n);if(s.run.battle)this.log('Elixír obnovil '+n+' životů.','heal');return true;}
 fight(kind,elite=false,opening=''){
  const s=this.state,r=s.run,p=D.areas[r.area],level=p.level+r.challenge*2,boss=kind==='boss',def=boss?{name:p.boss,art:p.bossArt,style:'boss',hint:p.hint}:D.foeKinds[kind];
  const scale=1+level*.12;
  const hp=Math.round((boss?100:elite?48:36)*scale*(r.flags.hunted?1.10:1)*(boss&&!r.flags.silent?1.1:1));
  const damage=Math.round((boss?7:4)+level*1.35);
  r.battle={...def,kind,boss,elite,hp,maxHp:hp,damage,turn:'player',round:0,log:[],tactic:null,used:[],charged:false,escaped:false,opening,mechanic:boss?['bell','roots','shell','tribute','avalanche'][r.area]:null,shellBroken:false};
  if(boss){if(r.flags.silent)this.log(r.area===0?'Písařova pomoc / přestřižené lano: zvon mlčí.':'Připravená zkratka ti dává prostor.','story');else this.log('Boss je připravený. Silnou ránu bude nutné vyřešit.','story');}
  if(opening)this.log(opening,'story');
 }
 log(text,type='info'){const b=this.state.run?.battle;if(b){b.log.push({text,type});b.log=b.log.slice(-30);b.last=type;}}
 step(){
  const s=this.state,r=s.run,b=r?.battle;if(!b||b.tactic||s.notice||s.pending.length)return false;
  if(b.turn==='player'){
   const a=this.stats(),critical=this.random()<a.crit/100;
   let hit=Math.round(a.damageMin+this.random()*(a.damageMax-a.damageMin));
   if(critical)hit=Math.round(hit*1.75);
   if(r.riposte&&a.traits.includes('riposte')){hit*=2;r.riposte=false;this.log('Druhý dech: úhyb připravil dvojnásobný zásah.','proc');}
   if(r.revenge&&a.traits.includes('hedgehog')){hit+=Math.round(a.armor*.6);r.revenge=false;this.log('Ježčí odveta: zbroj posílila úder.','proc');}
   if(a.traits.includes('execute')&&b.hp/b.maxHp<.35){hit=Math.round(hit*1.55);this.log('Poslední slovo: zraněný protivník dostává silnější úder.','proc');}
   if(b.round===0&&r.flags.ambush&&b.boss){hit=Math.round(hit*1.65);this.log('Připravená léčka zasáhla.','proc');}
   if(b.style==='armored'&&b.round%3!==2)hit=Math.max(1,Math.round(hit*.65));
   if(b.mechanic==='shell'&&!b.shellBroken){hit=Math.max(1,Math.round(hit*.7));this.log('Předákův krunýř tlumí zásah. Silné přerušení jej rozbije.','enemy');}
   if(b.mechanic==='tribute'&&hit<b.damage*1.5){hit=Math.max(1,hit-3);this.log('Daň ze slabých úderů: králův erb pohltil 3 poškození.','enemy');}
   if(D.itemById[s.equipped.weapon?.kind]?.id==='bow'&&b.round===0)hit=Math.round(hit*1.3);
   b.hp=Math.max(0,b.hp-hit);b.round++;b.lastHit=hit;
   this.log('Šmik → '+hit+' poškození'+(critical?' · KRITICKÝ ZÁSAH':''),critical?'crit':'attack');
   if(a.leech){const heal=Math.max(1,Math.round(hit*a.leech/100));this.heal(heal,a.traits.includes('overflow'));this.log('Kradení života +'+heal+(r.shield?' · štít '+r.shield:''),'heal');}
   if(b.hp<=0){this.win();return true;}
   const phase=b.hp/b.maxHp<=.35?'last':'first';
   if(b.boss&&!b.used.includes(phase)){
    b.used.push(phase);b.tactic={phase,title:r.area===0?'Kladivo posledního upozornění':r.area===1?'Parohy proti obloze':r.area===2?'Praskající strop':'Úder, který otřese zemí',
     text:'Boss se zapřel a připravuje těžký úder. Máš čas zvolit odpověď.',choices:['Ustoupit a krýt se','Přerušit silným úderem']};
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
   if(full){r.riposte=true;this.log('Ústup vyšel. Příprava a obratnost tě dostaly z dosahu.','dodge');}
   else {this.receive(Math.round(b.damage*.65),true);this.log('Kryt zachytil většinu úderu. Pro úplný úhyb pomůže obratnost nebo znalost cesty.','block');}
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
  if(b.mechanic==='roots'&&b.round%2===0&&!r.flags.silent){const restored=Math.min(b.maxHp-b.hp,4+D.areas[r.area].level);b.hp+=restored;this.log('Kořeny vrátily jelenovi '+restored+' životů. Uvolněná zkratka by přerušila jejich spojení.','heal');}
  if(this.random()<a.evasion/100){r.riposte=true;this.log('ÚHYB · nepřítel zasáhl jen tvůj stín.','dodge');}
  else{
   let n=b.damage+(b.style==='spirit'?Math.floor(b.round/3):0);
   if(b.charged){n=Math.round(n*1.8);b.charged=false;}
   if(b.mechanic==='bell'&&!r.flags.silent){n+=2;this.log('Zvon přivolal posilu: útok je o 2 silnější.','enemy');}
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
  if(tactical&&r.flags.blessed){n=Math.round(n*.35);r.flags.blessed=false;this.log('Vděk rodiny: ochrana zeslabila těžkou ránu.','proc');}
  let hurt=Math.max(0,Math.round((n-a.absorb)*(1-Math.min(.65,a.armor/(a.armor+85)))));
  const absorbed=Math.min(r.shield,hurt);r.shield-=absorbed;hurt-=absorbed;s.hp=Math.max(0,s.hp-hurt);
  this.log(b.name+' → '+hurt+' poškození'+(absorbed?' · štít pohltil '+absorbed:''),'enemy');
  const reflected=Math.round(hurt*a.thorns/100);if(reflected){b.hp=Math.max(0,b.hp-reflected);this.log('TRNY → '+reflected+' zpět nepříteli.','proc');}
  if(s.hp<=0&&s.potions>0){s.potions--;s.hp=Math.round(a.maxHp*.35);this.log('Opasek tě zachránil. Automaticky spotřeboval jeden elixír.','heal');}
 }
 win(){
  const s=this.state,r=s.run,b=r.battle,p=D.areas[r.area],first=!s.records[r.area].clears;
  const gold=this.gold(b.escaped?4:(b.boss?42:12)+p.level*3+r.challenge*8);
  const xp=(b.boss?40:18)+p.level*3+r.challenge*6;this.xp(xp);r.xp+=Math.round(xp*(1+this.stats().xpBonus/100));
  s.essence+=b.boss?8:2;s.hp=Math.min(this.stats().maxHp,s.hp+4);
  const logs=copy(b.log),boss=b.boss,escaped=b.escaped;r.battle=null;
  if(boss){
   const record=s.records[r.area];record.clears++;record.highest=Math.max(record.highest,r.challenge);record.marks+=2;
   s.unlocked=Math.max(s.unlocked,Math.min(5,r.area+2));s.metrics.bosses++;
   const loot=this.drop('boss');s.pending.push({type:'item',item:loot,note:'Boss poražen: garantovaný předmět úrovně '+loot.ilvl+'.'});
   const report={win:true,area:r.area,challenge:r.challenge,gold:r.gold,xp:r.xp,marks:2,choices:r.choices.length,logs};
   s.lastReport=report;s.run=null;
   this.note('Zakázka splněna',p.boss+(r.area===0?' vystavil potvrzení o vlastní smrti. Podpis je nečitelný.':' padl. Cesta je volná.')+' Získáváš 2× '+p.material+'.'+(first?' Na mapě se otevřelo další místo.':' Můžeš zvýšit hrozbu pro silnější kořist.'));
  }else{
   r.index++;
   if(!escaped&&this.random()<this.dropChance(b.elite))s.pending.push({type:'item',item:this.drop(b.elite?'chest':'enemy'),note:'Vzácný nález přímo z protivníka.'});
   else if(!escaped&&this.random()<.12)this.chest(0,'Truhla po hlídce');
   this.note(escaped?'Kořist vzala nohy na ramena':'Souboj vyhraný','+'+gold+' zlata · +'+Math.round(xp*(1+this.stats().xpBonus/100))+' XP · +2 esence. '+(escaped?'Rychlejší zbraň by příště mohla pomoct.':'Můžeš prohlédnout výbavu a pokračovat.'));
   s.notice.logs=logs;
  }
 }
 lose(){
  const s=this.state,r=s.run;const lost=Math.min(s.gold,Math.round(r.gold*.15)),logs=copy(r.battle?.log||[]);
  s.gold-=lost;s.lastReport={win:false,area:r.area,challenge:r.challenge,gold:r.gold-lost,xp:r.xp,marks:0,choices:r.choices.length,logs};
  s.run=null;s.hp=Math.round(this.stats().maxHp*.65);
  this.note('Výprava skončila','Ztratil jsi '+lost+' zlata z této výpravy. Zkušenosti a získaná výbava zůstávají. V přehledu boje najdeš poslední zásahy.');
 }
 retreat(){const s=this.state;if(!s.run||s.run.battle||s.pending.length)return false;s.run=null;s.notice=null;this.note('Návrat do tábora','Získaná kořist zůstává. Příští výprava začne od vstupu.');return true;}
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
   if(old)s.inventory.push(old);s.equipped[slot]=p.item;s.hp=Math.min(s.hp,this.stats().maxHp);
  }else if(action==='sell')s.gold+=this.price(p.item);
  else if(action==='salvage')s.essence+=2+D.rarityIndex(p.item.rarity)*2;
  else if(action==='take')s.inventory.push(p.item);else return false;
  s.pending.shift();return true;
 }
 equip(id){
  const s=this.state;if(s.run?.battle)return false;const n=s.inventory.findIndex(x=>x.id===id);if(n<0)return false;
  const it=s.inventory[n],slot=D.itemById[it.kind].slot,old=s.equipped[slot];s.inventory.splice(n,1);if(old)s.inventory.push(old);
  s.equipped[slot]=it;s.hp=Math.min(s.hp,this.stats().maxHp);return true;
 }
 unequip(slot){const s=this.state;if(s.run?.battle||!s.equipped[slot]||s.inventory.length>=s.capacity)return false;s.inventory.push(s.equipped[slot]);s.equipped[slot]=null;s.hp=Math.min(s.hp,this.stats().maxHp);return true;}
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
 buy(index){const s=this.state,row=this.shopList()[index];if(!row||s.gold<row.price||s.pending.length||s.run?.battle)return false;s.gold-=row.price;s.pending.push({type:'item',item:this.item(row.kind,row.rarity,row.ilvl,[['damage',3+row.ilvl]]),note:'Koupený předmět. Zobrazená a zaplacená cena jsou stejné.'});return true;}
 buyPotion(){const s=this.state;if(s.gold<18)return false;s.gold-=18;s.potions++;return true;}
 rest(){const s=this.state;if(s.run||s.hp>=this.stats().maxHp)return false;s.hp=this.stats().maxHp;return true;}
}
globalThis.RPG={Game,clamp};
})();
