/* Mobile UI. All economic and combat mutations pass through RPG.Game. */
(function(){
'use strict';
const D=RPGData,KEY='ne-ale-zabijim-v3',LEGACY=['ne-ale-zabijim-v2','ne-ale-zabijim-v1'];
let stored=null,storageError=false;
try{
 const current=localStorage.getItem(KEY);stored=current?JSON.parse(current):null;
 if(!current){for(const key of LEGACY){const old=localStorage.getItem(key);if(old){stored=JSON.parse(old);localStorage.setItem(KEY+'-legacy-backup',old);break;}}}
}catch{storageError=true;}
const game=new RPG.Game(stored);let tab='map',timer=null,paused=false,selected=null,donor=null,mergeBase=null,dialog=null,filter='all',audio=null,pointer=null,previousFocus=null;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,value='',classes='',disabled=false)=>'<button class="'+classes+'" data-action="'+action+'" data-value="'+esc(value)+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
const name=it=>it.name||(it.kind==='ring'&&it.affixes.some(x=>x.id==='luck')?'Prsten štěstí':D.itemById[it.kind].label);
const pct=new Set(['crit','evasion','leech','gold','thorns','haste','block','xpBonus']);
const fmt=n=>String(Math.round(n*100)/100).replace('.',','),unit=k=>pct.has(k)?' %':'';
const statRows=[['damageMin','Min. poškození'],['damageMax','Max. poškození'],['maxHp','Životy'],['armor','Zbroj'],['crit','Kritická šance'],['evasion','Úhyb'],['block','Blok'],['thorns','Trny'],['absorb','Pohlcení'],['haste','Rychlost'],['luck','Štěstí'],['gold','Bonus zlata'],['xpBonus','Bonus zkušeností'],['leech','Kradení života'],['shieldCap','Kapacita štítu']];
function itemArt(kind){
 const cell=D.itemArt[kind],d=D.itemById[kind];
 return cell===undefined?'<span class="item-monogram" aria-hidden="true">'+esc(d.label.split(' ').map(x=>x[0]).slice(0,2).join(''))+'</span>':'<span class="item-art atlas-'+(1+Math.floor(cell/16))+'" aria-hidden="true" style="--item-x:'+(cell%4*100/3)+'%;--item-y:'+(Math.floor(cell%16/4)*100/3)+'%"></span>';
}
function statFormula(key,b=game.statBreakdown()){
 return '<span class="stat-formula">'+fmt(b.base[key])+' <em>+ '+fmt(b.bonus[key])+'</em> = <b>'+fmt(b.total[key])+unit(key)+'</b></span>';
}
function statExplanation(key){
 const a=game.stats(),reduction=100*Math.min(.65,a.armor/(a.armor+85));
 const descriptions={
 damageMin:'Běžný útok náhodně vybere poškození mezi '+a.damageMin+' a '+a.damageMax+'. Síla přidává za bod 1,2 k minimu a 1,8 k maximu. Zbraň, relikvie a afixy se přičítají; zbroj protivníka a zvláštní účinky výsledek dále mění.',
 damageMax:'Horní hranice běžného útoku je '+a.damageMax+'. Přerušení bosse uspěje, pokud dosáhne alespoň 2,6násobku jeho základního poškození. Krit se do tohoto testu nepočítá.',
 maxHp:'Maximum životů: '+a.maxHp+'. Odolnost přidá 7 za bod, další životy poskytují ochranné předměty a afixy. Nasazení výbavy zvýší maximum, ale samo neléčí. Lektvar obnoví až 40 % maxima; opasek při smrtelném zásahu automaticky spotřebuje lektvar a vrátí 35 % maxima.',
 armor:'Zbroj nyní sníží poškození o '+fmt(reduction)+' %. Platí zbroj ÷ (zbroj + 85), nejvýše 65 %. Nejdřív se odečte pohlcení, pak působí zbroj a nakonec ochranný štít.',
 crit:'Každý běžný útok má '+fmt(a.crit)+'% šanci na kritický zásah za 175 % poškození. Základ je 5 %, obratnost přidává 1,2 procentního bodu za bod. Taktický útok kriticky nezasahuje.',
 evasion:'Proti běžnému útoku máš '+fmt(a.evasion)+'% šanci úplně uhnout. Základ je 3 %, obratnost přidává 0,8 procentního bodu za bod. Od 12 % také vždy uspěje obranný manévr proti těžkému útoku bosse.',
 block:'Po neúspěšném úhybu máš '+fmt(a.block)+'% šanci zablokovat běžný útok a snížit jej o 55 %. Každý předmět v levé ruce dává 12 procentních bodů bloku. Potom se uplatní pohlcení a zbroj.',
 thorns:'Vrátíš '+fmt(a.thorns)+' % skutečně ztracených životů jako poškození útočníkovi, zaokrouhlené na celé body. Úplný úhyb nebo plné pohlcení tedy trny nespustí.',
 absorb:'Z každého příchozího zásahu se odečte '+fmt(a.absorb)+' poškození před výpočtem zbroje. Může zásah zcela pohltit. Nejde o procenta ani o spotřebovatelný štít.',
 haste:'Čekání na tvůj běžný útok: '+game.attackDelay()+' ms při tempu 1×. Výpočet je 1050 ÷ (1 + rychlost / 100). Rychlost nemění počet tahů a sama nezabrání útěku krysy.',
 luck:'Štěstí je hodnota v bodech, nikoli přímá šance na nález. Každý bod zvyšuje základní šanci na předmět o 1 % relativně a přidá 2 % zlata z odměn. Nyní: běžný nepřítel '+fmt(game.dropChance()*100)+' %, silná hlídka '+fmt(game.dropChance(true)*100)+' %, ošoupaná truhla '+fmt(Math.min(100,65*(1+a.luck/100)))+' %, železná truhla '+fmt(Math.min(100,85*(1+a.luck/100)))+' %. Runová truhla a boss dávají předmět vždy. Štěstí také posouvá losování vzácnosti směrem k lepším kategoriím; nezaručuje konkrétní kvalitu.',
 gold:'Odměny za boj, setkání a mince z truhel se násobí '+fmt(1+a.gold/100)+'× a zaokrouhlují. Základní odměna 100 zlata ti přinese '+Math.round(100*(1+a.gold/100))+'. Započítávají se afixy zlata i 2 % za každý výsledný bod štěstí. Prodejní ceny to nemění.',
 xpBonus:'Zkušenosti z bojů se násobí '+fmt(1+a.xpBonus/100)+'×. Inteligence přidává 5 % za bod. Například odměna 100 XP přinese '+Math.round(100*(1+a.xpBonus/100))+' XP. Každá úroveň přidá jeden bod výcviku.',
 leech:'Běžný zásah tě vyléčí o '+fmt(a.leech)+' % způsobeného poškození, při aktivním kradení nejméně o 1 život. Taktické přerušení a trny neléčí. Bez Amuletu nenasytnosti se přebytek nad maximum ztratí.',
 shieldCap:'Kapacita přebytečného léčení je '+a.shieldCap+'. Základ je 20 a inteligence přidává 3 za bod. Funguje pouze s nasazenou vlastností Amuletu nenasytnosti. Aktuální štít: '+(game.state.run?.shield||0)+'. Pohlcuje poškození po zbroji a končí s výpravou.'
 };
 return descriptions[key]||'';
}
const atlas=(art,cls='portrait')=>'<div class="'+cls+' art-'+art+'" role="img" aria-label="'+esc(['Strážný','Krysa','Lovec','Výběrčí','Písař','Lesní duch'][art])+'"></div>';
function sound(type='tap'){
 if(!game.state.settings.sound)return;
 try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
 const notes=type==='reward'?[392,494,587]:type==='crit'?[220,660]:type==='enemy'?[100]:[260];
 notes.forEach((freq,i)=>{const o=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime+i*.09;o.type=type==='enemy'?'triangle':'sine';o.frequency.value=freq;gain.gain.setValueAtTime(.055,time);gain.gain.exponentialRampToValueAtTime(.001,time+.16);o.connect(gain).connect(audio.destination);o.start(time);o.stop(time+.17);});
 }catch{/* Sound is optional; gameplay stays available. */}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(game.state));}catch{if(!storageError){storageError=true;toast('Prohlížeč nemůže uložit postup. Nezavírej hru, dokud nepovolíš místní úložiště.');}}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
function percent(n,max){return Math.max(0,Math.min(100,n/max*100));}
function health(n,max,kind=''){return '<div class="health '+kind+'"><i style="width:'+percent(n,max)+'%"></i></div>';}
function lootCard(it,compact=false){
 const d=D.itemById[it.kind],r=D.rarityById[it.rarity];
 return '<div class="item-card '+(compact?'compact':'')+'" style="--rarity:'+r.color+'">'+itemArt(it.kind)+'<div><small>'+r.label+' · úroveň '+it.ilvl+' · +'+it.rank+'</small><strong>'+esc(name(it))+'</strong><span>'+D.slots[d.slot]+'</span></div></div>';
}
function genes(it){
 const p=game.basePower(it),slot=D.itemById[it.kind].slot,core=slot==='weapon'?'Poškození +'+fmt(p*1.6)+' až +'+fmt(p*2):['head','body','feet','hands','offhand'].includes(slot)?'Zbroj +'+fmt(p*1.6)+' · životy +'+fmt(p*3)+(slot==='offhand'?' · blok +12 %':''):'Poškození +'+fmt(p*.3)+' až +'+fmt(p*.5);
 return '<p class="item-base"><small>ZÁKLAD PŘEDMĚTU</small>'+core+'</p>'+(it.kind==='bow'?'<p>První běžný zásah v každém boji má o 30 % vyšší poškození.</p>':'')+'<ul class="genes">'+it.affixes.map(x=>'<li>'+btn(D.statNames[x.id]+' ⓘ','stat-help',x.id==='vitality'?'maxHp':x.id==='damage'?'damageMin':x.id,'stat-link')+'<b>+'+x.value+unit(x.id)+'</b></li>').join('')+'</ul><p class="muted">Bonusy platí jen při nasazení. Předmět v inventáři staty nemění.</p>'+(it.trait?'<div class="signature"><small>JEDINEČNÁ VLASTNOST</small><p>'+esc(D.traits[it.trait].effect)+'</p></div>':'');
}
function compare(it){
 const slot=D.itemById[it.kind].slot,old=game.state.equipped[slot],before=game.stats(),after=game.stats({...game.state.equipped,[slot]:it});
 const rows=statRows.filter(([k])=>after[k]!==before[k]);
 return '<div class="comparison"><small>ZMĚNA PO NASAZENÍ · PROTI '+esc(old?name(old):'PRÁZDNÉMU SLOTU')+'</small>'+rows.map(([k,label])=>'<span>'+label+' <b class="'+(after[k]>before[k]?'up':'down')+'">'+fmt(before[k])+' → '+fmt(after[k])+unit(k)+'</b></span>').join('')+(!rows.length?'<span>Číselné staty se nezmění. Případnou jedinečnou vlastnost posuď zvlášť.</span>':'')+'</div>';
}
function render(){
 clearTimeout(timer);const s=game.state,a=game.stats();
 if(!s.run)game.introduceChapter();
 const currency=(key,label,kind,value)=>'<button class="currency '+key+'" data-action="currency" data-value="'+key+'" aria-label="'+label+': '+value+'">'+itemArt(kind)+'<span><small>'+label+'</small><b>'+ (value>=10000?fmt(Math.round(value/100)/10)+'k':value)+'</b></span></button>';
 $('statusbar').innerHTML='<div class="hero-status"><span class="level-medal">'+s.level+'</span><div class="mini-hp"><strong>Sir Šmik <small>'+Math.ceil(s.hp)+' / '+a.maxHp+'</small></strong>'+health(s.hp,a.maxHp)+'</div></div><div class="currencies">'+currency('gold','Zlato','coin',s.gold)+currency('essence','Esence','orb',s.essence)+'</div>';
 $('sound-button').setAttribute('aria-label',s.settings.sound?'Vypnout zvuk':'Zapnout zvuk');$('sound-button').classList.toggle('on',s.settings.sound);$('sound-button').textContent=s.settings.sound?'♫':'♪';
 $('points-dot').hidden=!s.points;
 for(const b of document.querySelectorAll('.bottom-tabs button')){b.classList.toggle('active',b.dataset.value===tab);b.setAttribute('aria-current',b.dataset.value===tab?'page':'false');}
 $('view').setAttribute('data-view',tab);
 const content=({map:mapView,road:roadView,character:characterView,inventory:inventoryView}[tab]||mapView)();
 $('view').innerHTML=['character','inventory'].includes(tab)?'<div class="screen-scroll">'+content+'</div>':content;
 renderDialog();save();schedule();
}
function heading(kicker,title,right=''){return '<div class="heading"><div><small class="eyebrow">'+kicker+'</small><h2>'+title+'</h2></div>'+right+'</div>';}
function mapView(){
 const s=game.state,p=D.areas[s.selectedArea],rec=s.records[s.selectedArea];
 const firstReveal=s.unlocked>(s.flags.mapSeen||0);s.flags.mapSeen=s.unlocked;
 let paths='';
 for(let i=0;i<D.areas.length-1;i++){
  const a=D.areas[i],b=D.areas[i+1];if(i>=s.unlocked-1)continue;
  const route='M '+a.x+' '+a.y+' Q '+((a.x+b.x)/2+8)+' '+((a.y+b.y)/2)+' '+b.x+' '+b.y,newPath=firstReveal&&i===s.unlocked-2;
  if(newPath)paths+='<defs><mask id="route-reveal-'+i+'"><path class="route-reveal" d="'+route+'" pathLength="100" stroke="white" stroke-width="3" fill="none"/></mask></defs>';
  paths+='<path class="map-path" d="'+route+'" pathLength="100"'+(newPath?' mask="url(#route-reveal-'+i+')"':'')+'/>';
 }
 const markers=D.areas.map((p,i)=>'<button class="map-pin '+(i>=s.unlocked?'locked':'')+' '+(i===s.selectedArea?'selected':'')+' '+(s.records[i].clears?'cleared':'')+'" data-action="area" data-value="'+i+'" style="left:'+p.x+'%;top:'+p.y+'%"'+(i>=s.unlocked?' disabled':'')+' aria-label="'+esc(p.name)+(i>=s.unlocked?' · zamčeno':'')+'"><b>'+(s.records[i].clears?'⚑':i<s.unlocked?'✕':'•')+'</b><span>'+p.short+'</span></button>').join('');
 const pending=s.pending.length?'<div class="resume-banner">'+btn('Prohlédnout nález','loot-show','','primary')+'</div>':'';
 return '<section class="map-screen">'+heading('KAPITOLA I · '+s.records.filter(x=>x.clears).length+'/5','Pomezí Nedorozumění',btn('Příběh','chapter','','secondary'))+
 (s.run?'<small class="resume-note">Výprava čeká: '+D.areas[s.run.area].name+' · '+(s.run.index+1)+'/7</small>':'')+
 '<div class="world-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+markers+'</div>'+
 '<footer class="action-dock"><div class="location-summary"><strong>'+p.name+'</strong><small>'+(rec.clears?'Ozvěna · ':'')+'Hrozba '+(s.selectedChallenge+1)+' · kořist úr. '+(p.level+s.selectedChallenge*2)+'</small></div><div class="dock-tools">'+btn('Tábor','camp-menu','','secondary')+btn('O místě','location','','secondary')+'</div>'+pending+
 btn(s.run?'Pokračovat ve výpravě →':rec.clears?'Vstoupit do ozvěny →':'Vyrazit na výpravu →',s.run?'tab':'start',s.run?'road':'','primary wide',!!s.pending.length)+'</footer></section>';
}
function recipeCard(area){
 const p=D.areas[area],r=game.state.records[area],sig=D.signatures[p.recipe];
 return '<section class="panel recipe"><small class="eyebrow">CÍL DALŠÍ VÝPRAVY</small><h3>'+sig.name+'</h3><p>'+sig.effect+'</p><div class="progress-label"><span>'+p.material+'</span><b>'+r.marks+' / 4</b></div>'+health(r.marks,4,'xp')+'<small>'+ (r.marks<4?'Chybí '+(4-r.marks)+' · každý poražený boss přinese 2.':'Materiál je připravený.')+' Výroba stojí ještě 10 esence.</small>'+btn('Vyrobit jedinečný předmět','craft',area,'secondary wide',r.marks<4||game.state.essence<10||!!game.state.pending.length||!!game.state.run?.battle)+'</section>';
}
function reportCard(r){return '<section class="panel report"><small class="eyebrow">'+(r.win?'ZAKÁZKA SPLNĚNA':'POUČENÍ Z VÝPRAVY')+'</small><h3>'+D.areas[r.area].name+'</h3><div class="report-stats"><span>◈ '+r.gold+' zlata</span><span>✶ '+r.xp+' XP</span><span>◇ '+r.marks+' materiálu</span></div><p>'+r.choices+' rozhodnutí · hrozba '+(r.challenge+1)+'</p>'+(game.state.notice?'<p>'+esc(game.state.notice.text)+'</p>':'')+logs(r.logs)+'</section>';}
function logs(rows){if(!rows?.length)return '';return '<details class="log-details"><summary>Průběh posledního boje</summary><ol>'+rows.map(x=>'<li class="'+x.type+'">'+esc(x.text)+'</li>').join('')+'</ol></details>';}
function roadView(){
 const s=game.state,r=s.run;
 if(!r)return '<section class="road-screen"><div class="screen-scroll">'+heading('VÝPRAVA','Cesta čeká')+(s.lastReport?reportCard(s.lastReport):'<section class="panel"><p>Vyber místo na mapě a vydej se po stopě královy kletby.</p></section>')+'</div><footer class="action-dock">'+btn('Otevřít mapu','tab','map','primary wide')+'</footer></section>';
 const p=D.areas[r.area],b=r.battle,room=game.room(),t=b?.tactic,n=s.notice;
 const progress='<div class="route-progress" aria-label="Postup výpravou">'+r.rooms.map((id,i)=>'<i class="'+(i<r.index?'done':i===r.index?'current':'')+'">'+(i<r.index?'✓':id==='boss'?'♛':i+1)+'</i>').join('')+'</div>';
 const art=n?null:b?b.art:room.id==='scribe'?4:room.id==='boss'?p.bossArt:room.id==='gate'?0:null;
 const stage='<section class="stage scene-'+p.scene+' '+(b?'fighting':'')+'"><div class="scene-art"></div><div class="stage-vignette"></div>'+
 '<div class="stage-label">'+(b?(b.boss?'CÍL ZAKÁZKY':'STŘETNUTÍ'):'MÍSTO '+Math.min(r.index+1,r.rooms.length)+' / '+r.rooms.length)+'</div>'+
 (art!==null?atlas(art,'portrait enemy-portrait '+(b?.last==='attack'||b?.last==='crit'?'hit':'')):'<div class="location-emblem">'+(n?'✓':({well:'💍',camp:'✦',bell:'♧',merchant:'◈',wounded:'✉',cache:'◇'}[room.id]||'⌘'))+'</div>')+
 (b?'<div class="enemy-meter"><strong>'+esc(b.name)+'</strong>'+health(b.hp,b.maxHp,'enemy')+'<small>'+b.hp+' / '+b.maxHp+'</small></div>':'')+
 '<div class="hero-token"><img src="assets/sir-smik.webp" alt="Sir Šmik"></div></section>';
 let content='',actions='';
 if(n){content='<section class="panel outcome"><small class="eyebrow">NÁSLEDEK TVÉ CESTY</small><h2>'+esc(n.title)+'</h2><p>'+esc(n.text)+'</p>'+logs(n.logs)+'</section>';actions=btn('Pokračovat →','continue','','primary wide');}
 else if(b&&!t){
  content='<section class="panel battle-panel"><div class="heading"><strong>'+(paused?'Boj pozastaven':b.turn==='player'?'Šmik připravuje útok':'Tah protivníka')+'</strong></div><ol class="combat-log" aria-live="polite">'+b.log.slice(-4).map(x=>'<li class="'+x.type+'">'+esc(x.text)+'</li>').join('')+'</ol><details><summary>Chování protivníka</summary><p>'+esc(b.hint)+'</p></details></section>';
  actions='<div class="dock-tools">'+btn(paused?'Pokračovat':'Pozastavit','pause','','secondary')+btn('Lektvar · '+s.potions,'potion','','secondary',!s.potions||s.hp>=game.stats().maxHp)+btn(s.settings.speed+'× tempo','speed','','secondary')+'</div>';
 }else{
  const c=t||room;
  content='<section class="decision '+(t?'tactical':'')+'" id="swipe-card"><small class="eyebrow">'+(t?'TVŮJ TAH · BOJ ČEKÁ':'ROZHODNUTÍ')+'</small><h2>'+esc(c.title)+'</h2><p>'+esc(c.text)+'</p><div class="swipe-feedback" aria-hidden="true"><span>← '+esc(c.choices[0])+'</span><span>'+esc(c.choices[1])+' →</span></div><small class="swipe-hint">Táhni kartou nebo klepni dole na volbu.</small></section>';
  actions='<div class="choices">'+c.choices.map((label,i)=>btn('<span>'+(i?'→':'←')+'</span><strong>'+esc(label)+'</strong>','choice',i?'right':'left','choice')).join('')+'</div>'+(t?btn('Lektvar · '+s.potions,'potion','','secondary wide',!s.potions||s.hp>=game.stats().maxHp):'');
 }
 return '<section class="road-screen">'+heading(r.replay?'OZVĚNA KLETBY':'VÝPRAVA',p.name,'<span class="pill">'+Math.min(r.index+1,r.rooms.length)+' / '+r.rooms.length+'</span>')+progress+stage+'<div class="road-copy">'+content+'</div><footer class="action-dock">'+actions+
 (!b?btn('Ukončit výpravu','retreat-confirm','','text-button'):'<small class="pause-note">Jiná karta boj pozastaví.</small>')+'</footer></section>';
}
const growthDefs=[
 ['might','⚔','Síla','Za bod +1,2 až 1,8 poškození. Silný útok snáze přeruší bosse.'],
 ['grit','♥','Odolnost','Za bod +7 životů a +0,6 zbroje. Pomáhá přežít a podporuje obrannou výbavu.'],
 ['agility','〰','Obratnost','Za bod +1,2 procentního bodu kritu a +0,8 úhybu. Od 12 % úhybu zvládneš bossův úder obejít.'],
 ['intelligence','✶','Inteligence','Za bod +5 % získaných XP a +3 kapacity ochranného štítu z Amuletu nenasytnosti.'],
 ['luck','☘','Štěstí','Zvyšuje četnost i kvalitu nálezů. Každý bod výsledného štěstí přidá 2 % zlata z odměn.']
];
function characterView(){
 const s=game.state,a=game.stats(),locked=!!s.run?.battle,breakdown=game.statBreakdown();
 return heading('POSTAVA','Sir Šmik',btn('Kronika','journal','','secondary'))+
 '<section class="hero-sheet panel"><img src="assets/sir-smik.webp" alt="Sir Šmik"><div><small class="eyebrow">ÚROVEŇ '+s.level+'</small><h3>Lovec prokletých míst</h3><span>'+s.xp+' / '+game.threshold()+' XP</span>'+health(s.xp,game.threshold(),'xp')+'<small>'+s.points+' bodů k rozdělení</small></div></section>'+
 '<p class="muted">Klepnutím na atribut zjistíš jeho účinky. Zelené číslo je bonus ze všech nasazených předmětů.</p><div class="growth-grid">'+growthDefs.map(([id,icon,label])=>'<div class="growth"><button data-action="help" data-value="'+id+'" aria-label="Vysvětlit '+label+'"><span>'+icon+' '+label+' ⓘ</span><strong>'+(id==='luck'?statFormula('luck',breakdown):s.growth[id]+' <em class="gear-bonus">+ 0</em>')+'</strong><small>'+(id==='luck'?'základ + výbava = celkem':'rozdělené body + výbava')+'</small></button>'+btn('+','growth',id,'add-point',!s.points||locked)+'</div>').join('')+'</div>'+
 (locked?'<p class="muted">Během souboje je výcvik a převlékání uzamčené. Návratem do Výpravy boj pokračuje.</p>':'')+
 heading('NASAZENO','Výbava')+'<div class="equipment-grid">'+Object.entries(D.slots).map(([slot,label])=>{
 const it=s.equipped[slot];return '<button class="equipment" style="--rarity:'+(it?D.rarityById[it.rarity].color:'#32504d')+'" data-action="equipped" data-value="'+slot+'"><small>'+label+'</small>'+(it?itemArt(it.kind):'<span>＋</span>')+'<b>'+esc(it?name(it):'Prázdné místo')+'</b></button>';
 }).join('')+'</div>'+
 (a.traits.length?'<section class="panel"><small class="eyebrow">AKTIVNÍ KOMBINACE</small>'+a.traits.map(t=>'<p><strong>'+D.traits[t].name+'</strong><br>'+D.traits[t].effect+'</p>').join('')+'</section>':'')+
 heading('ZÁKLAD + VÝBAVA = CELKEM','Účinky postavy')+'<div class="stats-grid">'+statRows.map(([key,label])=>btn('<small>'+label+' ⓘ</small>'+statFormula(key,breakdown),'stat-help',key,'stat-tile')).join('')+'</div><p class="footnote">Základ zahrnuje výcvik. Výbava zahrnuje všechny nasazené kusy i jejich afixy. Zobrazený součet odpovídá hře po zaokrouhlení a uplatnění limitů. Klikni na hodnotu pro podrobnosti.</p>';
}
function inventoryView(){
 const s=game.state,items=s.inventory.filter(it=>filter==='all'||D.itemById[it.kind].slot===filter);
 return heading('INVENTÁŘ A KOVÁRNA','Každý kus má příběh','<span class="pill">'+s.inventory.length+' / '+s.capacity+'</span>')+
 '<div class="filters"><label for="slot-filter">Zobrazit</label><select id="slot-filter"><option value="all">Všechny předměty</option>'+Object.entries(D.slots).map(([id,n])=>'<option value="'+id+'"'+(id===filter?' selected':'')+'>'+n+'</option>').join('')+'</select>'+btn('Krámek','shop','','secondary')+'</div>'+
 (mergeBase?'<div class="merge-banner"><strong>Vyber dárce pro '+esc(name(s.inventory.find(x=>x.id===mergeBase)))+'</strong><p>Stejný slot. Nejdřív uvidíš výsledek; nic se nespotřebuje prohlížením.</p>'+btn('Zrušit výběr','merge-cancel','','text-button')+'</div>':'')+
 '<div class="inventory-grid">'+items.map(it=>'<button class="inventory-item '+(mergeBase&&D.itemById[s.inventory.find(x=>x.id===mergeBase)?.kind]?.slot===D.itemById[it.kind].slot&&mergeBase!==it.id?'compatible':'')+'" data-action="item" data-value="'+it.id+'" style="--rarity:'+D.rarityById[it.rarity].color+'">'+itemArt(it.kind)+'<small>'+D.rarityById[it.rarity].label+' · +'+it.rank+'</small><strong>'+esc(name(it))+'</strong><small>'+it.affixes.map(x=>D.statNames[x.id]+' +'+x.value+unit(x.id)).join(' · ')+'</small>'+(it.trait?'<i>✦ Jedinečný</i>':'')+'</button>').join('')+'</div>'+
 (!items.length?'<section class="empty panel"><h3>Kapsy mají místo.</h3><p>Boss vždy zanechá předmět. Ostatní nálezy tě čekají ve skrýších a truhlách.</p>'+btn('Vyrazit pro kořist','tab','map','secondary')+'</section>':'')+
 '<section class="panel"><small class="eyebrow">ŠLECHTĚNÍ VÝBAVY</small><h3>Základ + dárce → silnější kus</h3><p>Otevři předmět a zvol „Slučovat“. Základ si ponechá všechny své afixy. Shodné geny převezmou lepší hodnotu, volné místo může zdědit nový gen.</p><p>Dva kusy +3 stejné vzácnosti zvýší kategorii. Síla předmětu vždy vzroste nejméně o 10 %. Náhled vše ukáže předem.</p></section>'+
 recipeCard(s.selectedArea)+'<p class="footnote">Prodejem získáš zlato. Rozložením esenci pro slučování a cílenou výrobu.</p>';
}
function renderDialog(){
 const s=game.state,p=s.pending[0];let body='';
 if(s.storyEvents.length&&!p&&!dialog){
  const e=s.storyEvents[0],answered=e.response!==undefined;
  body='<div class="story-copy"><small class="eyebrow">KAPITOLA I · '+esc(e.speaker)+'</small><h2 id="dialog-title">'+esc(e.title)+'</h2><blockquote>'+esc(answered?e.answers[e.response]:e.text)+'</blockquote><p>'+esc(answered?e.closing:e.narration)+'</p>'+(answered?'<small>Šmik: '+esc(e.replies[e.response])+'</small>':'')+'</div><footer class="dialog-footer">'+(answered?btn('Pokračovat','story-close','','primary wide'):e.replies.map((reply,i)=>btn(esc(reply),'story-reply',i,'secondary wide')).join(''))+'</footer>';
 }else if(p&&!dialog){
  if(p.type==='chest')body='<div class="chest-art scene-5"><div class="scene-art"></div><span>◇</span></div><small class="eyebrow">NALEZENÁ TRUHLA</small><h2 id="dialog-title">'+['Ošoupaná truhla','Železná truhla','Runová truhla'][p.tier]+'</h2><p>'+esc(p.note)+'</p><p class="muted">Uvnitř může být výbava. I bez předmětu získáš zlato a esenci.</p>'+btn('Otevřít truhlu','chest','','primary wide');
  else body='<small class="eyebrow">'+(p.previewOnly?'SPOJENÍ DOKONČENO':'NOVÝ NÁLEZ')+'</small><h2 id="dialog-title">'+(p.previewOnly?'Geny se ujaly.':'Tohle by se mohlo hodit.')+'</h2>'+lootCard(p.item)+genes(p.item)+compare(p.item)+'<p class="muted">'+esc(p.note)+'</p>'+
   (p.previewOnly?btn('Hotovo','preview-close','','primary wide'):'<div class="dialog-actions">'+btn('Nasadit','loot','equip','primary',s.inventory.length>=s.capacity&&!!s.equipped[D.itemById[p.item.kind].slot])+btn(s.inventory.length>=s.capacity?'Inventář plný':'Do inventáře','loot','take','secondary',s.inventory.length>=s.capacity)+btn('Prodat · '+game.price(p.item)+' ◈','loot','sell','secondary')+btn('Rozložit · '+(2+D.rarityIndex(p.item.rarity)*2)+' ✦','loot','salvage','secondary')+'</div>'+
   (s.inventory.length>=s.capacity?btn('Spravovat plný inventář','manage-loot','','text-button wide'):''));
 }else if(dialog?.type==='item'){
  const it=dialog.slot?s.equipped[dialog.slot]:s.inventory.find(x=>x.id===selected);
  if(it)body='<h2 id="dialog-title">Detail předmětu</h2>'+lootCard(it)+genes(it)+(dialog.slot?'':compare(it))+'<div class="dialog-actions">'+
   (dialog.slot?btn('Sundat do inventáře','unequip',dialog.slot,'secondary',!!s.run?.battle||s.inventory.length>=s.capacity):
   btn('Nasadit','equip',it.id,'primary',!!s.run?.battle)+btn('Slučovat','merge-start',it.id,'secondary',!!s.run?.battle)+btn('Prodat · '+game.price(it)+' ◈','sell',it.id,'secondary')+btn('Rozložit na esenci','salvage',it.id,'secondary'))+'</div>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='merge'){
  const preview=game.mergePreview(mergeBase,donor);
  if(preview)body='<small class="eyebrow">NÁHLED · ZATÍM NIC NESPOTŘEBOVÁNO</small><h2 id="dialog-title">'+(preview.promote?'Vzestup do vyšší kategorie':'Potomek tvé výbavy')+'</h2>'+lootCard(preview.item)+genes(preview.item)+'<p>Zaručená základní síla: '+Math.round(game.basePower(preview.item)*10)/10+'. Geny uvedené výše zůstanou nebo zesílí.</p><p>'+preview.mutation+'</p><div class="dialog-actions">'+btn('Sloučit · '+preview.cost+' ✦','merge-confirm','','primary',s.essence<preview.cost||!!s.run?.battle)+btn('Zpět','close','','secondary')+'</div><small>Potvrzení spotřebuje oba rodiče.</small>';
 }else if(dialog?.type==='shop'){
  const area=D.areas[s.selectedArea];
  body='<small class="eyebrow">KUPEC · '+area.name+'</small><h2 id="dialog-title">Víš, co kupuješ.</h2><p>Uvedená vzácnost, úroveň a afix jsou zaručené.</p>'+game.shopList().map((row,i)=>'<div class="shop-row">'+itemArt(row.kind)+'<div><strong>'+D.itemById[row.kind].label+'</strong><small>'+D.rarityById[row.rarity].label+' · úroveň '+row.ilvl+' · Poškození +'+(3+row.ilvl)+'</small></div>'+btn(row.price+' ◈','buy',i,'secondary',s.gold<row.price||!!s.pending.length||!!s.run?.battle)+'</div>').join('')+
   '<div class="shop-row"><div><strong>🧪 Léčivý elixír</strong><small>Obnoví 40 % životů. V boji je po ruce.</small></div>'+btn('18 ◈','buy-potion','','secondary',s.gold<18)+'</div>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='location'){
  const p=D.areas[s.selectedArea],rec=s.records[s.selectedArea];
  body='<h2 id="dialog-title">'+p.name+'</h2><p>'+(rec.clears?'Místo je osvobozené. Vstoupíš do ozvěny někdejší kletby a získáš skutečnou kořist; příběh se nevrací zpět.':p.quest)+'</p><p>'+p.hint+'</p><small>7 míst · '+p.boss+' · kořist úrovně '+(p.level+s.selectedChallenge*2)+'</small>'+(rec.clears?'<div class="difficulty">'+btn('−','difficulty','-1','small',s.selectedChallenge===0)+'<span>Hrozba '+(s.selectedChallenge+1)+'</span>'+btn('+','difficulty','1','small',s.selectedChallenge>=rec.highest+1)+'</div>':'')+btn('Zpět na mapu','close','','primary wide');
 }else if(dialog?.type==='camp-menu'){
  body='<h2 id="dialog-title">Tábor</h2><p>Odpočinek mimo výpravu je zdarma. Lektvary nosíš v opasku.</p><div class="dialog-actions">'+btn('Odpočinout','rest','','secondary',!!s.run||s.hp>=game.stats().maxHp)+btn('Lektvar · 18 zlata','buy-potion','','secondary',s.gold<18)+btn('Poslední výprava','report','','secondary',!s.lastReport)+btn('Kronika','journal','','secondary')+'</div><p>Postup se ukládá v tomto prohlížeči. Na jiném zařízení nebude automaticky dostupný.</p>'+btn('Nový lokální průchod','reset-confirm','','text-button wide')+btn('Zpět na mapu','close','','primary wide');
 }else if(dialog?.type==='report'){
  body='<h2 id="dialog-title">Poslední výprava</h2>'+(s.lastReport?reportCard(s.lastReport):'<p>Zatím nemáš dokončenou výpravu.</p>')+btn('Zavřít','close','','primary wide');
 }else if(dialog?.type==='chapter'){
  body='<h2 id="dialog-title">'+D.chapter.title+'</h2><p>Král drží Pomezí v nekončícím večeru. Osvoboď jeho poddané a zlom Korunu posledního světla.</p><ol class="chapter-list">'+D.areas.map((p,i)=>'<li><strong>'+(s.records[i].clears?'✓ ':i<s.unlocked?'→ ':'')+p.name+'</strong><p>'+(s.records[i].clears?'Osvobozeno. Dostupné ozvěny pro další kořist.':i<s.unlocked?p.quest:'Pokračování se odkryje po předchozí výpravě.')+'</p></li>').join('')+'</ol>'+btn('Zpět na mapu','close','','primary wide');
 }else if(dialog?.type==='currency'){
  const gold=dialog.id==='gold';body='<h2 id="dialog-title">'+(gold?'Zlato':'Esence')+'</h2><p class="currency-total">'+(gold?s.gold:s.essence)+'</p><p>'+(gold?'Za zlato nakupuješ výbavu a lektvary. Získáváš ho bojem, některými rozhodnutími, z truhel a prodejem předmětů. Štěstí zvyšuje odměny, ne prodejní ceny.':'Esence slouží ke slučování a výrobě jedinečných předmětů. Získáváš ji za boj, rozkladem výbavy a z truhel bez předmětu. Zlato ji nenahrazuje.')+'</p>'+btn('Rozumím','close','','primary wide');
 }else if(dialog?.type==='journal'){
  body='<h2 id="dialog-title">Kronika Sira Šmika</h2><p>Výpravy se mění. Někteří lidé si tě pamatují.</p><ol class="journal">'+s.journal.slice().reverse().map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='help'){
  const def=growthDefs.find(x=>x[0]===dialog.id),links={might:['damageMin','damageMax'],grit:['maxHp','armor'],agility:['crit','evasion'],intelligence:['xpBonus','shieldCap'],luck:['luck','gold']}[dialog.id];body='<h2 id="dialog-title">'+def[2]+'</h2><p>'+def[3]+'</p><p>Rozdělené body: '+s.growth[dialog.id]+'. '+(dialog.id==='luck'?'Výbava se přičítá k výslednému štěstí.':'Výbava teď posiluje výsledné parametry přímo, nikoli tento základní atribut.')+'</p>'+links.map(k=>btn(statRows.find(x=>x[0]===k)[1]+' ⓘ '+statFormula(k),'stat-help',k,'secondary wide')).join('')+btn('Rozumím','close','','primary wide');
 }else if(dialog?.type==='stat'){
  const key=dialog.id,b=game.statBreakdown(),cap=D.statCaps[key];
  const sources=Object.values(s.equipped).filter(Boolean).map(it=>({it,amount:game.stats({[D.itemById[it.kind].slot]:it})[key]-b.base[key]})).filter(x=>Math.abs(x.amount)>.001);
  body='<h2 id="dialog-title">'+statRows.find(x=>x[0]===key)[1]+'</h2><small>ZÁKLAD + NASAZENÁ VÝBAVA = CELKEM</small>'+statFormula(key,b)+'<p>'+statExplanation(key)+'</p>'+(cap?'<p class="muted">Limit: '+cap+unit(key)+'. Součet před limitem: '+fmt(b.raw[key])+unit(key)+'. Nadlimitní body nemají další účinek.</p>':'')+'<section class="stat-sources"><small>NASAZENÉ PŘEDMĚTY OVLIVŇUJÍCÍ TUTO HODNOTU</small>'+(sources.length?sources.map(x=>'<p>'+esc(name(x.it))+'</p>').join(''):'<p>Žádný. Hodnotu nyní určuje základ a výcvik.</p>')+'</section>'+btn(dialog.back?'Zpět':'Rozumím','close','','primary wide');
 }else if(dialog?.type==='reset'){
  body='<h2 id="dialog-title">Začít nový lokální průchod?</h2><p>Aktuální postup uložíme do zálohy v tomto prohlížeči. Nová hra začne s prázdnou mapou a základní výbavou.</p><div class="dialog-actions">'+btn('Pokračovat ve stávající hře','close','','primary')+btn('Začít znovu','reset','','secondary')+'</div>';
 }else if(dialog?.type==='retreat'){
  body='<h2 id="dialog-title">Ukončit tuto výpravu?</h2><p>Zlato, zkušenosti i předměty zůstanou. Příští vstup začne od prvního místa. Pokud chceš jen přestávku, otevři mapu — postup se uloží.</p><div class="dialog-actions">'+btn('Zůstat','close','','primary')+btn('Vrátit se do tábora','retreat','','secondary')+'</div>';
 }
 const wasHidden=$('overlay').hidden,focusAction=document.activeElement?.dataset?.action,focusValue=document.activeElement?.dataset?.value;
 $('overlay').hidden=!body;$('game').inert=!!body;
 if(body){if(wasHidden)previousFocus=document.activeElement;$('overlay').innerHTML='<section class="dialog-card">'+body+'</section>';const restored=[...$('overlay').querySelectorAll('button:not(:disabled)')].find(b=>b.dataset.action===focusAction&&b.dataset.value===focusValue);(restored||$('overlay').querySelector('button:not(:disabled)')||$('overlay')).focus();}
 else{ $('overlay').innerHTML='';if(!wasHidden)previousFocus?.focus?.(); }
}
function schedule(){
 const b=game.state.run?.battle;if(!b||b.tactic||paused||tab!=='road'||dialog||game.state.storyEvents.length||game.state.pending.length||game.state.notice||document.hidden)return;
 timer=setTimeout(()=>{const before=game.state.metrics.bosses;game.step();sound(game.state.metrics.bosses>before?'reward':game.state.run?.battle?.last||'tap');render();},(b.turn==='player'?game.attackDelay():1000)/game.state.settings.speed);
}
function close(){dialog=null;selected=null;donor=null;}
function dispatch(action,value){
 let result=true;const s=game.state,beforeStats=game.stats();
 switch(action){
  case 'tab':tab=value;break;
  case 'story-reply':result=game.storyReply(Number(value));break;
  case 'story-close':result=game.closeStory();break;
  case 'chapter':case 'location':case 'camp-menu':case 'report':dialog={type:action};break;
  case 'currency':dialog={type:'currency',id:value};break;
  case 'area':if(Number(value)<s.unlocked){s.selectedArea=Number(value);s.selectedChallenge=0;}break;
  case 'difficulty':s.selectedChallenge=RPG.clamp(s.selectedChallenge+Number(value),0,s.records[s.selectedArea].highest+1);break;
  case 'start':result=game.start();if(result){tab='road';paused=false;}break;
  case 'continue':s.notice=null;break;
  case 'choice':
   if(s.run?.battle?.tactic)result=game.tactic(value);else result=game.choose(value);
   if(result==='character')tab='character';break;
  case 'pause':paused=!paused;break;
  case 'potion':result=game.potion();break;
  case 'speed':s.settings.speed=s.settings.speed===1?2:1;break;
  case 'sound':s.settings.sound=!s.settings.sound;break;
  case 'growth':result=game.spend(value);break;
  case 'help':dialog={type:'help',id:value};break;
  case 'stat-help':if(statRows.some(x=>x[0]===value))dialog={type:'stat',id:value,back:dialog};break;
  case 'journal':dialog={type:'journal'};break;
  case 'equipped':if(s.equipped[value])dialog={type:'item',slot:value};else toast('Tento slot čeká na nález.');break;
  case 'item':
   if(mergeBase&&value!==mergeBase){donor=value;if(game.mergePreview(mergeBase,donor))dialog={type:'merge'};else toast('Vyber dárce ze stejného slotu.');}
   else{selected=value;dialog={type:'item'};}break;
  case 'equip':result=game.equip(value);close();break;
  case 'unequip':result=game.unequip(value);close();break;
  case 'sell':result=game.sell(value);if(mergeBase===value)mergeBase=null;close();break;
  case 'salvage':result=game.sell(value,true);if(mergeBase===value)mergeBase=null;close();break;
  case 'merge-start':mergeBase=value;close();tab='inventory';filter='all';break;
  case 'merge-cancel':mergeBase=null;donor=null;break;
  case 'merge-confirm':result=game.merge(mergeBase,donor);if(result){mergeBase=null;close();sound('reward');}break;
  case 'chest':result=game.openChest();sound('reward');break;
  case 'loot':result=game.loot(value);break;
  case 'preview-close':if(s.pending[0]?.previewOnly)s.pending.shift();break;
  case 'loot-show':dialog=null;break;
  case 'manage-loot':dialog={type:'manage'};tab='inventory';break;
  case 'craft':result=game.craft(Number(value));if(result)close();break;
  case 'shop':dialog={type:'shop'};break;
  case 'buy':result=game.buy(Number(value));if(result)close();break;
  case 'buy-potion':result=game.buyPotion();if(result)toast('Lektvar přidán do opasku.');break;
  case 'rest':result=game.rest();if(result)toast('Odpočinek obnovil všechny životy.');break;
  case 'reset-confirm':dialog={type:'reset'};break;
  case 'reset':try{localStorage.setItem(KEY+'-before-reset',JSON.stringify(s));game.state=game.fresh();close();mergeBase=null;tab='map';}catch{result=false;}break;
  case 'retreat-confirm':dialog={type:'retreat'};break;
  case 'retreat':result=game.retreat();if(result){close();tab='map';}break;
  case 'close':if(dialog?.back)dialog=dialog.back;else close();break;
  default:return;
 }
 if(result===false)toast('Teď to nejde: zkontroluj suroviny, místo v inventáři nebo probíhající boj.');
 else if(['equip','unequip'].includes(action)||(action==='loot'&&value==='equip')){
  const after=game.stats(),changes=[['luck','Štěstí'],['gold','Zlato'],...statRows.filter(x=>!['luck','gold','damageMin'].includes(x[0]))].filter(([k])=>after[k]!==beforeStats[k]);
  toast((action==='unequip'?'Sundáno. ':'Nasazeno. ')+(changes.length?changes.slice(0,3).map(([k,label])=>label+' '+fmt(beforeStats[k])+' → '+fmt(after[k])+unit(k)).join(' · '):'Číselné staty se nezměnily.')+' Podrobnosti v Postavě.');
 }else if(action==='loot'&&value==='take')toast('Uloženo do inventáře. Bonusy získáš až po nasazení.');
 sound();render();
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&!button.disabled)dispatch(button.dataset.action,button.dataset.value);});
document.addEventListener('change',e=>{if(e.target.id==='slot-filter'){filter=e.target.value;render();}});
document.addEventListener('pointerdown',e=>{
 const card=e.target.closest('#swipe-card');if(!card||e.target.closest('button')||!$('overlay').hidden)return;
 pointer={id:e.pointerId,x:e.clientX,y:e.clientY,card};card.setPointerCapture?.(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
 if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>20){pointer.card.style.transform='';pointer.card.classList.remove('drag-left','drag-right');if(pointer.card.hasPointerCapture?.(e.pointerId))pointer.card.releasePointerCapture(e.pointerId);pointer=null;return;}
 const delta=Math.max(-110,Math.min(110,dx));pointer.card.style.transform='translateX('+delta+'px) rotate('+(delta/18)+'deg)';
 pointer.card.classList.toggle('drag-left',dx<-20);pointer.card.classList.toggle('drag-right',dx>20);
});
document.addEventListener('pointerup',e=>{
 if(!pointer||pointer.id!==e.pointerId)return;const {card,x,y}=pointer,dx=e.clientX-x,dy=e.clientY-y;pointer=null;card.style.transform='';card.classList.remove('drag-left','drag-right');
 if(card.hasPointerCapture?.(e.pointerId))card.releasePointerCapture(e.pointerId);
 if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy))dispatch('choice',dx>0?'right':'left');
});
document.addEventListener('pointercancel',()=>{if(pointer){pointer.card.style.transform='';pointer.card.classList.remove('drag-left','drag-right');}pointer=null;});
document.addEventListener('keydown',e=>{
 if(!$('overlay').hidden){
  if(e.key==='Escape'&&dialog){dispatch('close','');return;}
  if(e.key==='Tab'){
   const list=[...$('overlay').querySelectorAll('button:not(:disabled),select')];if(!list.length){e.preventDefault();return;}
   if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}
   else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}
  }
  return;
 }
 if(tab==='road'&&!e.target.matches('input,select,textarea')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();dispatch('choice',e.key==='ArrowLeft'?'left':'right');}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);save();}else{render();}});
window.addEventListener('pagehide',save);
render();if(storageError)toast('Ukládání není dostupné nebo původní pozici nelze přečíst. Zkontroluj nastavení prohlížeče.');
})();
