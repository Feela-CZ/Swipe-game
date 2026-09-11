/* Mobile UI. All economic and combat mutations pass through RPG.Game. */
(function(){
'use strict';
const D=RPGData,KEY='ne-ale-zabijim-v3',LEGACY=['ne-ale-zabijim-v2','ne-ale-zabijim-v1'];
let stored=null,storageError=false;
try{
 const current=localStorage.getItem(KEY);stored=current?JSON.parse(current):null;
 if(!current){for(const key of LEGACY){const old=localStorage.getItem(key);if(old){stored=JSON.parse(old);localStorage.setItem(KEY+'-legacy-backup',old);break;}}}
}catch{storageError=true;}
let game=new RPG.Game(stored);let tab='map',timer=null,paused=false,selected=null,donor=null,mergeBase=null,dialog=null,filter='all',pointer=null,previousFocus=null;
const saves=new RPGSaves.Saves((...args)=>fetch(...args));
let front='splash',busy=false,autoTimer=null,lastSaved='',saveMessage='',hasSession=false,sessionRevision=0,sessionStale=false;
function titleView(){
 const labels={auto:'Automatická pozice',legacy:'Původní rozehraná hra','1':'Pozice 1','2':'Pozice 2','3':'Pozice 3'};
 let content='';
 if(front==='splash')content=btn('Pokračovat','title-skip','','title-skip');
 else if(front==='load')content='<h2>Load Game</h2>'+saves.rows.sort((a,b)=>a.slot.localeCompare(b.slot)).map(row=>btn('<strong>'+labels[row.slot]+'</strong><span>'+esc(row.state.heroName||'Dobrodruh')+' · úroveň '+row.state.level+'</span><small>'+esc(new Date(row.updated_at).toLocaleString('cs-CZ'))+'</small>','title-load',row.slot,'save-row',busy)).join('')+(!saves.rows.length?'<p>Žádná uložená pozice.</p>':'')+(stored?'<details><summary>Záloha z tohoto zařízení</summary>'+btn('Obnovit místní zálohu','title-load','local','secondary wide',busy)+'<p>Může obsahovat i postup, který se před zavřením hry nestihl odeslat.</p></details>':'')+btn('Zpět','title-back','','secondary',busy);
 else if(front==='new')content='<h2>New Game</h2><p>Automatickou pozici nahradí nová hra. Ruční pozice i původní záloha zůstanou.</p>'+btn('Začít novou hru','title-new-confirm','','primary wide',busy)+btn('Zpět','title-back','','secondary wide',busy);
 else content=btn('New Game','title-new','','primary wide',busy||!saves.ready)+btn('Load Game','title-list','','secondary wide',busy||!saves.ready)+btn('Settings','title-settings','','secondary wide',busy)+(hasSession?btn('Zpět do hry','title-resume','','text-button wide',busy||sessionStale):'');
 $('title-screen').innerHTML='<div class="title-art" aria-hidden="true"></div><div class="title-content"><h1 class="sr-only">Quest Happens</h1><div class="title-menu '+(front==='splash'?'splash-menu':['load','new'].includes(front)?'title-menu-panel':'')+'">'+content+(busy?'<p class="title-status" role="status">Načítám pozice…</p>':'')+(saves.error?'<p class="title-status" role="alert">'+esc(saves.error)+'</p>'+btn('Zkusit znovu','title-retry','','secondary wide',busy):!saves.ready&&front!=='splash'?'<p class="title-status" role="status">Načítám pozice…</p>':'')+'</div></div>';
}
async function refreshSaves(){
 busy=true;titleView();
 try{await saves.refresh();if(hasSession&&(saves.rows.find(x=>x.slot==='auto')?.revision||0)!==sessionRevision){sessionStale=true;toast('Server má novější postup. Vyber pozici v Load Game.');}if(stored&&!saves.rows.some(x=>x.slot==='legacy'))await saves.write('legacy',new RPG.Game(stored).state);}
 catch(e){toast(e.message);}finally{busy=false;if(front)render();}
}
function enter(state){
 sessionStale=false;sessionRevision=saves.rows.find(x=>x.slot==='auto')?.revision||0;
 clearTimeout(autoTimer);autoTimer=null;const preferences={...game.state.settings};game=new RPG.Game(state);game.state.settings=preferences;nameDraft=game.state.heroName||'Vendel';front='';hasSession=true;dialog=null;tab=game.state.run?'road':'map';paused=false;mergeBase=null;selected=null;filter='all';lastSaved='';lastAudioLevel=game.state.level;lastLootSound=game.state.pending[0]?.item?.id;game.drainAudio();render();
}
async function cloudSave(slot='auto'){
 clearTimeout(autoTimer);autoTimer=null;const snapshot=JSON.stringify(game.state);
 try{if(slot==='auto'&&sessionStale)throw new Error('Server má novější postup. Vyber pozici v Load Game.');const row=await saves.write(slot,JSON.parse(snapshot));if(slot==='auto'){lastSaved=snapshot;sessionRevision=row.revision;}saveMessage='Uloženo';return true;}
 catch(e){saveMessage='Neuloženo';toast(e.message+' Rozehraná hra zůstává otevřená.');return false;}
}
async function titleAction(action,value){
 if(busy&&action!=='title-skip')return;
 if(action==='title-skip'){front='menu';render();return;}
 if(action==='title-back'){front='menu';dialog=null;render();return;}
 if(action==='title-settings'){dialog={type:'audio'};render();return;}
 if(action==='title-resume'){if(!sessionStale){front='';render();}return;}
 if(action==='title-retry'){await refreshSaves();return;}
 if(action==='title-list'){front='load';await refreshSaves();return;}
 if(action==='title-new'){front='new';render();return;}
 if(!saves.ready){toast('Nejdřív načti uložené pozice.');return;}
 busy=true;titleView();
 try{
  if(action==='title-new-confirm'){
   // Archive a running session before replacing its automatic slot.
   if(hasSession&&!sessionStale&&!await cloudSave())return;
   enter(null);
  }else if(action==='title-load'){
   await saves.refresh();const row=value==='local'&&stored?{state:stored}:saves.rows.find(x=>x.slot===value);if(!row)throw new Error('Pozice už není dostupná.');enter(row.state);
  }
 }catch(e){toast(e.message);}finally{busy=false;render();}
}
const audio=new RPGSound.Player(window,()=>toast('Zvuk se nepodařilo spustit. Hra funguje dál; zkus jej znovu zapnout.'));
let nameDraft=game.state.heroName||'Vendel';
let lastLootSound=game.state.pending[0]?.item?.id,lastAudioLevel=game.state.level,motion='',characterPage='attributes',statPage=0;
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,value='',classes='',disabled=false)=>'<button class="'+classes+'" data-action="'+action+'" data-value="'+esc(value)+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
const name=it=>it.name||(it.kind==='ring'&&it.affixes.some(x=>x.id==='luck')?'Prsten štěstí':D.itemById[it.kind].label);
const pct=new Set(['crit','evasion','leech','gold','thorns','haste','block','xpBonus']);
const fmt=n=>String(Math.round(n)),unit=k=>pct.has(k)?' %':'';
const statRows=[['damageMin','Min. poškození'],['damageMax','Max. poškození'],['maxHp','Životy'],['armor','Zbroj'],['crit','Kritická šance'],['evasion','Úhyb'],['block','Blok'],['thorns','Trny'],['absorb','Pohlcení'],['haste','Rychlost'],['luck','Štěstí'],['gold','Bonus zlata'],['xpBonus','Bonus zkušeností'],['leech','Kradení života'],['shieldCap','Kapacita štítu']];
function itemArt(kind){
 const cell=D.itemArt[kind],d=D.itemById[kind];
 return cell===undefined?'<span class="item-monogram" aria-hidden="true">'+esc(d.label.split(' ').map(x=>x[0]).slice(0,2).join(''))+'</span>':'<span class="item-art atlas-'+(1+Math.floor(cell/16))+'" aria-hidden="true" style="--item-x:'+(cell%4*100/3)+'%;--item-y:'+(Math.floor(cell%16/4)*100/3)+'%"></span>';
}
function statFormula(key,b=game.statBreakdown()){
 return '<span class="stat-formula">'+fmt(b.base[key])+' <em>+ '+(Math.round(b.total[key])-Math.round(b.base[key]))+'</em> = <b>'+fmt(b.total[key])+unit(key)+'</b></span>';
}
function statExplanation(key){
 const a=game.stats(),reduction=100*Math.min(.65,a.armor/(a.armor+85));
 const descriptions={
 damageMin:'Běžný útok náhodně vybere poškození mezi '+a.damageMin+' a '+a.damageMax+'. Síla zvyšuje dolní i horní hranici útoku; výsledné poškození se zaokrouhluje na celé body. Zbraň, relikvie a afixy se přičítají; zbroj protivníka a zvláštní účinky výsledek dále mění.',
 damageMax:'Horní hranice běžného útoku je '+a.damageMax+'. Přerušení bosse uspěje, pokud dosáhne alespoň 260 % jeho základního poškození. Krit se do tohoto testu nepočítá.',
 maxHp:'Maximum životů: '+a.maxHp+'. Každá úroveň přidá 5 životů. Odolnost přidá 7 za bod, další životy poskytují ochranné předměty a afixy. Při změně výbavy zůstává počet chybějících životů stejný. S plným zdravím tedy zůstaneš na maximu. Pokud by sundání snížilo životy na nulu, musíš se nejdřív ošetřit. Lektvar obnoví až 40 % maxima; opasek při smrtelném zásahu automaticky spotřebuje lektvar a vrátí 35 % maxima.',
 armor:'Zbroj nyní sníží poškození o '+fmt(reduction)+' %. Platí zbroj ÷ (zbroj + 85), nejvýše 65 %. Nejdřív se odečte pohlcení, pak působí zbroj a nakonec ochranný štít.',
 crit:'Každý běžný útok má '+fmt(a.crit)+'% šanci na kritický zásah za 175 % poškození. Základ je 5 %, každých 5 bodů obratnosti přidává 6 procentních bodů. Taktický útok kriticky nezasahuje.',
 evasion:'Proti běžnému útoku máš '+fmt(a.evasion)+'% šanci úplně uhnout. Základ je 3 %, každých 5 bodů obratnosti přidává 4 procentní body. Od 12 % také vždy uspěje obranný manévr proti těžkému útoku bosse.',
 block:'Po neúspěšném úhybu máš '+fmt(a.block)+'% šanci zablokovat běžný útok a snížit jej o 55 %. Každý předmět v levé ruce dává 12 procentních bodů bloku. Potom se uplatní pohlcení a zbroj.',
 thorns:'Vrátíš '+fmt(a.thorns)+' % skutečně ztracených životů jako poškození útočníkovi, zaokrouhlené na celé body. Úplný úhyb nebo plné pohlcení tedy trny nespustí.',
 absorb:'Z každého příchozího zásahu se odečte '+fmt(a.absorb)+' poškození před výpočtem zbroje. Může zásah zcela pohltit. Nejde o procenta ani o spotřebovatelný štít.',
 haste:'Čekání na tvůj běžný útok: '+game.attackDelay()+' ms při tempu 1×. Výpočet je 1050 ÷ (1 + rychlost / 100). Rychlost nemění počet tahů a sama nezabrání útěku krysy.',
 luck:'Štěstí je hodnota v bodech, nikoli přímá šance na nález. Každý bod zvyšuje základní šanci na předmět o 1 % relativně a přidá 2 % zlata z odměn. Nyní: běžný nepřítel '+fmt(game.dropChance()*100)+' %, silná hlídka '+fmt(game.dropChance(true)*100)+' %, ošoupaná truhla '+fmt(Math.min(100,65*(1+a.luck/100)))+' %, železná truhla '+fmt(Math.min(100,85*(1+a.luck/100)))+' %. Runová truhla a boss dávají předmět vždy. Štěstí také posouvá losování vzácnosti směrem k lepším kategoriím; nezaručuje konkrétní kvalitu.',
 gold:'Bonus k odměnám za boj, setkání a mince z truhel je '+fmt(a.gold)+' %. Odměny se zaokrouhlují. Základní odměna 100 zlata ti přinese '+Math.round(100*(1+a.gold/100))+'. Započítávají se afixy zlata i 2 % za každý výsledný bod štěstí. Prodejní ceny to nemění.',
 xpBonus:'Bonus ke zkušenostem z bojů je '+fmt(a.xpBonus)+' %. Inteligence přidává 5 % za bod. Například odměna 100 XP přinese '+Math.round(100*(1+a.xpBonus/100))+' XP. Každá úroveň přidá 5 životů a jeden bod výcviku.',
 leech:'Běžný zásah tě vyléčí o '+fmt(a.leech)+' % způsobeného poškození, při aktivním kradení nejméně o 1 život. Taktické přerušení a trny neléčí. Bez Amuletu nenasytnosti se přebytek nad maximum ztratí.',
 shieldCap:'Kapacita přebytečného léčení je '+a.shieldCap+'. Základ je 20 a inteligence přidává 3 za bod. Funguje pouze s nasazenou vlastností Amuletu nenasytnosti. Aktuální štít: '+(game.state.run?.shield||0)+'. Pohlcuje poškození po zbroji a končí s výpravou.'
 };
 return descriptions[key]||'';
}
const atlas=(art,cls='portrait')=>'<div class="'+cls+' art-'+art+'" role="img" aria-label="'+esc(['Strážný','Krysa','Lovec','Výběrčí','Písař','Lesní duch'][art])+'"></div>';
function sound(type='tap'){audio.configure(game.state.settings.sound,game.state.settings.volume);void audio.play(type);}
function flushSounds(fallback=null){
 const events=game.drainAudio(),item=game.state.pending[0]?.item;
 if(item&&item.id!==lastLootSound){events.push(D.rarityIndex(item.rarity)>=2?'rare':'loot');lastLootSound=item.id;}
 if(game.state.level>lastAudioLevel)events.push('level');lastAudioLevel=game.state.level;
 if(!events.length&&fallback)events.push(fallback);
 audio.configure(game.state.settings.sound,game.state.settings.volume);
 RPGSound.sequence(events,game.state.equipped.weapon?.kind).forEach(({name,delay})=>{void audio.play(name,delay);});
}
function save(){
 try{localStorage.setItem(KEY+'-settings',JSON.stringify(game.state.settings));}catch{}
 if(front||!hasSession)return;
 const snapshot=JSON.stringify(game.state);
 try{localStorage.setItem(KEY,snapshot);}catch{storageError=true;}
 if(snapshot!==lastSaved&&saves.ready&&!autoTimer)autoTimer=setTimeout(()=>{autoTimer=null;void cloudSave();},1500);
}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
function percent(n,max){return Math.max(0,Math.min(100,n/max*100));}
function health(n,max,kind=''){return '<div class="health '+kind+'"><i style="width:'+percent(n,max)+'%"></i></div>';}
function lootCard(it,compact=false){
 const d=D.itemById[it.kind],r=D.rarityById[it.rarity];
 return '<div class="item-card '+(compact?'compact':'')+'" style="--rarity:'+r.color+'">'+itemArt(it.kind)+'<div><small>'+r.label+' · úroveň '+it.ilvl+' · +'+it.rank+'</small><strong>'+esc(name(it))+'</strong><span>'+D.slots[d.slot]+'</span></div></div>';
}
function genes(it){
 const p=game.basePower(it),slot=D.itemById[it.kind].slot,core=slot==='weapon'?'Poškození +'+Math.round(p*1.6)+' až +'+Math.round(p*2):['head','body','feet','hands','offhand'].includes(slot)?'Zbroj +'+fmt(p*1.6)+' · životy +'+fmt(p*3)+(slot==='offhand'?' · blok +12 %':''):'Poškození +'+Math.round(p*.3)+' až +'+Math.round(p*.5);
 return '<p class="item-base"><small>ZÁKLAD PŘEDMĚTU</small>'+core+'</p>'+(it.kind==='bow'?'<p>První běžný zásah v každém boji má o 30 % vyšší poškození.</p>':'')+'<ul class="genes">'+it.affixes.map(x=>'<li>'+btn(D.statNames[x.id]+' ⓘ','stat-help',x.id==='vitality'?'maxHp':x.id==='damage'?'damageMin':x.id,'stat-link')+'<b>+'+x.value+unit(x.id)+'</b></li>').join('')+'</ul><p class="muted">Bonusy platí jen při nasazení. Předmět v inventáři staty nemění.</p>'+(it.trait?'<div class="signature"><small>JEDINEČNÁ VLASTNOST</small><p>'+esc(D.traits[it.trait].effect)+'</p></div>':'');
}
function compare(it){
 const slot=D.itemById[it.kind].slot,old=game.state.equipped[slot],before=game.stats(),after=game.stats({...game.state.equipped,[slot]:it});
 const rows=statRows.filter(([k])=>after[k]!==before[k]);
 return '<div class="comparison"><small>ZMĚNA PO NASAZENÍ · PROTI '+esc(old?name(old):'PRÁZDNÉMU SLOTU')+'</small>'+rows.map(([k,label])=>'<span>'+label+' <b class="'+(after[k]>before[k]?'up':'down')+'">'+fmt(before[k])+' → '+fmt(after[k])+unit(k)+'</b></span>').join('')+(!rows.length?'<span>Číselné staty se nezmění. Případnou jedinečnou vlastnost posuď zvlášť.</span>':'')+'</div>';
}
function render(){
 clearTimeout(timer);const s=game.state,a=game.stats();
 if(front){clearTimeout(autoTimer);autoTimer=null;}
 $('game').hidden=!!front;$('title-screen').hidden=!front;
 if(front){titleView();renderDialog();return;}
 if(!s.run)game.introduceChapter();
 $('statusbar').innerHTML='<div class="hero-status"><span class="level-medal">'+s.level+'</span><div class="mini-hp"><strong>'+esc(game.state.heroName||'Dobrodruh')+' <small>'+Math.ceil(s.hp)+' / '+a.maxHp+'</small></strong>'+health(s.hp,a.maxHp)+'</div></div>';
 $('sound-button').setAttribute('aria-label','Otevřít menu');$('sound-button').textContent='Menu';
 $('points-dot').hidden=!s.points&&!s.levelNotice;
 for(const b of document.querySelectorAll('.bottom-tabs button')){b.classList.toggle('active',b.dataset.value===tab);b.setAttribute('aria-current',b.dataset.value===tab?'page':'false');}
 $('view').setAttribute('data-view',tab);
 const content=({map:mapView,road:roadView,character:characterView,inventory:inventoryView}[tab]||mapView)();
 $('view').innerHTML=tab==='inventory'?'<div class="screen-scroll">'+content+'</div>':content;
 renderDialog();save();schedule();motion='';
}
function wallet(keys=['gold','essence']){return '<div class="context-wallet">'+keys.map(key=>'<button class="currency '+key+'" data-action="currency" data-value="'+key+'" aria-label="'+(key==='gold'?'Zlato':'Esence')+': '+game.state[key]+'">'+itemArt(key==='gold'?'coin':'orb')+'<b>'+game.state[key]+'</b></button>').join('')+'</div>';}
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
 (s.run?'<small class="resume-note">Výprava čeká: '+D.areas[s.run.area].name+' · '+(s.run.index+1)+' / '+s.run.rooms.length+'</small>':'')+
 '<div class="world-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+markers+'</div>'+
 '<footer class="action-dock"><div class="location-summary"><strong>'+p.name+'</strong><small>'+(rec.clears?'Ozvěna · ':'')+'Hrozba '+(s.selectedChallenge+1)+' · kořist úr. '+(p.level+s.selectedChallenge*2)+'</small></div><div class="dock-tools">'+btn('Tábor','camp-menu','','secondary')+btn('O místě','location','','secondary')+'</div>'+pending+
 (!s.run?'<small class="preparation-note">'+D.expeditionLengths[s.selectedArea]+' míst · '+s.hp+' / '+game.stats().maxHp+' životů · '+s.potions+' lektvarů'+(s.hp<game.stats().maxHp?' · V táboře můžeš zdarma odpočívat.':'')+'</small>':'')+
 btn(s.run?'Pokračovat ve výpravě →':rec.clears?'Vstoupit do ozvěny →':'Vyrazit na výpravu →',s.run?'tab':'start',s.run?'road':'','primary wide',!!s.pending.length)+'</footer></section>';
}
function recipeCard(area){
 const p=D.areas[area],r=game.state.records[area],sig=D.signatures[p.recipe];
 return '<section class="panel recipe">'+wallet(['essence'])+'<small class="eyebrow">CÍL DALŠÍ VÝPRAVY</small><h3>'+sig.name+'</h3><p>'+sig.effect+'</p><div class="progress-label"><span>'+p.material+'</span><b>'+r.marks+' / 4</b></div>'+health(r.marks,4,'xp')+'<small>'+ (r.marks<4?'Chybí '+(4-r.marks)+' · každý poražený boss přinese 2.':'Materiál je připravený.')+' Výroba stojí ještě 10 esence.</small>'+btn('Vyrobit jedinečný předmět','craft',area,'secondary wide',r.marks<4||game.state.essence<10||!!game.state.pending.length||!!game.state.run?.battle)+'</section>';
}
function reportCard(r){return '<section class="panel report"><small class="eyebrow">'+(r.win?'ZAKÁZKA SPLNĚNA':'POUČENÍ Z VÝPRAVY')+'</small><h3>'+D.areas[r.area].name+'</h3><div class="report-stats"><span>◈ '+r.gold+' zlata</span><span>✶ '+r.xp+' XP</span><span>◇ '+r.marks+' materiálu</span></div><p>'+r.choices+' rozhodnutí · hrozba '+(r.challenge+1)+'</p>'+(game.state.notice?'<p>'+esc(game.state.notice.text)+'</p>':'')+logs(r.logs)+'</section>';}
function logs(rows){if(!rows?.length)return '';return '<details class="log-details"><summary>Průběh posledního boje</summary><ol>'+rows.map(x=>'<li class="'+x.type+'">'+esc(x.text.replace(/(?:Sir )?Šmik/g,()=>game.state.heroName||'Dobrodruh'))+'</li>').join('')+'</ol></details>';}
function sceneSprite(art,classes){
 return '<div class="scene-sprite '+classes+' sheet-'+art.sheet+'" role="img" aria-label="'+esc(art.label)+'" data-scene-cell="'+art.cell+'" style="--sprite-x:'+(art.cell%art.columns*100/(art.columns-1))+'%;--sprite-y:'+(Math.floor(art.cell/art.columns)*100/(art.columns-1))+'%"></div>';
}
function roadView(){
 const s=game.state,r=s.run;
 if(!r)return '<section class="road-screen"><div class="screen-scroll">'+heading('VÝPRAVA','Cesta čeká')+(s.lastReport?reportCard(s.lastReport):'<section class="panel"><p>Vyber místo na mapě a vydej se po stopě královy kletby.</p></section>')+'</div><footer class="action-dock">'+btn('Otevřít mapu','tab','map','primary wide')+'</footer></section>';
 const p=D.areas[r.area],b=r.battle,n=s.notice,previous=r.lastScene||r.rooms[Math.max(0,r.index-1)],room=n?game.describe(previous):game.room(),t=b?.tactic;
 const phase=Math.min(4,Math.floor(r.index/r.rooms.length*5));
 const progress='<div class="expedition-progress"><div class="progress-label"><span>'+['Vstup do oblasti','Za hlídkami','Hlubší cesta','Na stopě cíle','Poslední úsek'][phase]+'</span><b>'+Math.round(r.index/r.rooms.length*100)+' %</b></div>'+health(r.index,r.rooms.length,'xp')+'</div>';
 const art=RPGScenes.encounter(room,r,b||(n?r.lastFoe:null)),effects=game.combatEffects();
 const stage='<section class="stage scene-'+p.scene+' '+(b?'fighting ':'')+(motion?'motion-'+motion:'')+'" aria-label="'+esc(p.name)+'"><div class="scene-art"></div><div class="stage-vignette"></div>'+
  sceneSprite(art,'encounter-token')+
 (b?'<div class="battle-bonuses"><div class="hero-bonuses">'+effects.hero.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div><div class="enemy-bonuses">'+effects.enemy.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div><div class="enemy-meter"><strong>'+esc(b.name)+'</strong>'+health(b.hp,b.maxHp,'enemy')+'<small>'+b.hp+' / '+b.maxHp+'</small></div>':'')+
  sceneSprite({...RPGScenes.hero,label:s.heroName||'Dobrodruh'},'hero-token')+(!b&&!n&&['trade','merchant'].includes(room.kind||room.id)?wallet(['gold']):'')+'</section>';
 let content='',actions='';
 if(n){content='<section class="panel outcome"><h2>'+esc(n.title)+'</h2><p>'+esc(n.text)+'</p>'+logs(n.logs)+'</section>';actions=btn('Pokračovat →','continue','','primary wide');}
 else if(b&&!t){
  content='<section class="panel battle-panel"><div class="heading"><strong>'+(paused?'Boj pozastaven':b.turn==='player'?game.state.heroName+' připravuje útok':'Tah protivníka')+'</strong></div><ol class="combat-log" aria-live="polite">'+b.log.slice(-4).map(x=>'<li class="'+x.type+'">'+esc(x.text.replace(/(?:Sir )?Šmik/g,()=>game.state.heroName||'Dobrodruh'))+'</li>').join('')+'</ol><details><summary>Chování protivníka</summary><p>'+esc(b.hint)+'</p></details></section>';
  actions='<div class="dock-tools">'+btn(paused?'Pokračovat':'Pozastavit','pause','','secondary')+btn('Lektvar · '+s.potions,'potion','','secondary',!s.potions||s.hp>=game.stats().maxHp)+btn(s.settings.speed+'× tempo','speed','','secondary')+'</div>';
 }else{
  const c=t||room;
  content='<section class="decision '+(t?'tactical':'')+'" id="swipe-card"><small class="eyebrow">'+(t?'TVŮJ TAH · BOJ ČEKÁ':'ROZHODNUTÍ')+'</small><h2>'+esc(c.title)+'</h2><p>'+esc(c.text)+'</p><div class="swipe-feedback" aria-hidden="true"><span>← '+esc(c.choices[0])+'</span><span>'+esc(c.choices[1])+' →</span></div><small class="swipe-hint">Táhni kartou nebo klepni dole na volbu.</small></section>';
  actions='<div class="choices">'+c.choices.map((label,i)=>btn('<span>'+(i?'→':'←')+'</span><strong>'+esc(label)+'</strong>','choice',i?'right':'left','choice')).join('')+'</div>'+(t?btn('Lektvar · '+s.potions,'potion','','secondary wide',!s.potions||s.hp>=game.stats().maxHp):'');
 }
 return '<section class="road-screen">'+heading('',p.name,'<span class="pill">'+Math.min(r.index+1,r.rooms.length)+' / '+r.rooms.length+'</span>')+progress+stage+'<div class="road-copy">'+content+'</div><footer class="action-dock">'+actions+
 '</footer></section>';
}
const growthDefs=[
 ['might','⚔','Síla','Posílí dolní i horní hranici útoku. Poškození se počítá v celých bodech.'],
 ['grit','♥','Odolnost','Za bod +7 životů. Každých 5 bodů přidá také 3 zbroje. Pomáhá přežít a podporuje obrannou výbavu.'],
 ['agility','〰','Obratnost','Každých 5 bodů přidá 6 procentních bodů kritu a 4 úhybu. Od 12 % úhybu zvládneš bossův úder obejít.'],
 ['intelligence','✶','Inteligence','Za bod +5 % získaných XP a +3 kapacity ochranného štítu z Amuletu nenasytnosti.'],
 ['luck','☘','Štěstí','Zvyšuje četnost i kvalitu nálezů. Každý bod výsledného štěstí přidá 2 % zlata z odměn.']
];
function characterView(){
 const s=game.state,a=game.stats(),breakdown=game.statBreakdown();
 let body='';
 if(characterPage==='attributes'){
  body='<div class="attribute-grid">'+growthDefs.map(([id,,label])=>btn('<strong>'+label+'</strong><span>'+fmt(id==='luck'?a.luck:s.growth[id])+'</span>','help',id,'attribute-tile')).join('')+
   btn('<strong>Výcvik</strong><span>'+s.points+'</span>','level-up','','attribute-tile training-tile')+'</div>';
 }else if(characterPage==='equipment'){
  body='<div class="equipment-grid">'+Object.entries(D.slots).map(([slot,label])=>{
   const it=s.equipped[slot];return '<button class="equipment" style="--rarity:'+(it?D.rarityById[it.rarity].color:'#32504d')+'" data-action="equipped" data-value="'+slot+'"><small>'+label+'</small>'+(it?itemArt(it.kind):'<span>＋</span>')+'<b>'+esc(it?name(it):'Prázdné místo')+'</b></button>';
  }).join('')+'</div>'+(a.traits.length?btn('Vlastnosti výbavy · '+a.traits.length,'traits','','secondary wide'):'');
 }else{
  body='<div class="attribute-grid effect-grid">'+statRows.slice(statPage*6,statPage*6+6).map(([key,label])=>btn('<strong>'+label+'</strong><span>'+fmt(a[key])+unit(key)+'</span>','stat-help',key,'attribute-tile')).join('')+'</div>'+
   '<div class="stat-pages">'+btn('←','stat-page',statPage-1,'secondary',statPage===0)+'<span>'+(statPage+1)+' / '+Math.ceil(statRows.length/6)+'</span>'+btn('→','stat-page',statPage+1,'secondary',statPage>=Math.ceil(statRows.length/6)-1)+'</div>';
 }
 return '<section class="character-screen">'+heading('',s.heroName||'Dobrodruh',wallet())+
  '<div class="character-summary"><img src="assets/sir-smik.webp" alt="Postava"><div><small>Úroveň '+s.level+'</small><h3>Dobrodruh na zkušební dobu</h3>'+health(s.xp,game.threshold(),'xp')+'<small>'+s.xp+' / '+game.threshold()+' XP</small></div>'+btn('Kronika','journal','','secondary')+'</div>'+
  '<nav class="character-sections" aria-label="Přehled postavy">'+[['attributes','Atributy'],['equipment','Nasazeno'],['effects','Účinky']].map(([id,label])=>'<button data-action="character-page" data-value="'+id+'" aria-pressed="'+(characterPage===id)+'">'+label+'</button>').join('')+'</nav>'+
  '<div class="character-content">'+body+'</div></section>';
}
function levelUpView(){
 const s=game.state,n=s.levelNotice,locked=!!s.run?.battle;
 return '<div class="level-up-content"><small class="eyebrow">'+(n?'NOVÁ ÚROVEŇ':'VÝCVIK')+'</small><h2 id="dialog-title">'+(n?'Úroveň '+n.from+' → '+n.to:'Rozděl body')+'</h2>'+
  (n?'<div class="level-rewards"><span><b>+'+n.hp+'</b> max. životů</span><span><b>+'+n.points+'</b> bodů výcviku</span></div>':'')+
  '<p class="training-balance">Zbývá rozdělit: <b>'+s.points+'</b></p>'+
  '<div class="training-list">'+growthDefs.map(([id,,label])=>'<div><strong>'+label+'</strong><b>'+s.growth[id]+'</b>'+btn('+','growth',id,'add-point',!s.points||locked)+'</div>').join('')+'</div>'+
  '<p class="training-help">'+(locked?'Body rozdělíš po souboji. Postup i odměny už máš uložené.':'Síla posílí útok, odolnost životy a zbroj. Obratnost pomáhá úhybu a kritu, inteligence zkušenostem, štěstí kořisti.')+'</p>'+
  btn(s.points?'Rozdělit později':'Hotovo','close','','primary wide')+'</div>';
}
function equippedGrid(compact=false){
 const s=game.state;
 return '<div class="equipment-grid'+(compact?' compact-equipment':'')+'">'+Object.entries(D.slots).map(([slot,label])=>{
  const it=s.equipped[slot];return '<button class="equipment" style="--rarity:'+(it?D.rarityById[it.rarity].color:'#32504d')+'" data-action="equipped" data-value="'+slot+'" aria-label="'+esc(label+': '+(it?name(it):'prázdné'))+'"><small>'+label+'</small>'+(it?itemArt(it.kind):'<span class="empty-slot-mark" aria-hidden="true">—</span>')+(compact?'':'<b>'+esc(it?name(it):'Prázdné místo')+'</b>')+'</button>';
 }).join('')+'</div>';
}
function inventoryView(){
 const s=game.state,base=s.inventory.find(x=>x.id===mergeBase),slots=Math.max(s.capacity,s.inventory.length);
 return '<section class="inventory-screen">'+heading('','Inventář',wallet())+
 '<h3 class="section-label">Nasazeno</h3>'+equippedGrid(true)+
 '<div class="bag-toolbar"><label for="slot-filter" class="sr-only">Filtrovat inventář</label><select id="slot-filter"><option value="all">Všechny sloty</option>'+Object.entries(D.slots).map(([id,n])=>'<option value="'+id+'"'+(id===filter?' selected':'')+'>'+n+'</option>').join('')+'</select><span class="pill">'+s.inventory.length+' / '+s.capacity+'</span></div>'+
 (base?'<div class="merge-banner"><strong>Vyber dárce</strong>'+btn('Zrušit','merge-cancel','','text-button')+'</div>':'')+
 '<div class="bag-grid">'+Array.from({length:slots},(_,i)=>{
  const it=s.inventory[i];if(!it)return '<div class="bag-slot empty-slot" aria-label="Prázdný slot '+(i+1)+'"><span aria-hidden="true">·</span></div>';
  const d=D.itemById[it.kind],r=D.rarityById[it.rarity];
  if(filter!=='all'&&d.slot!==filter)return '<div class="bag-slot filtered-slot" aria-label="Předmět skrytý filtrem"><span aria-hidden="true">—</span></div>';
  const compatible=base&&base.id!==it.id&&D.itemById[base.kind].slot===d.slot;
  return '<button class="bag-slot'+(compatible?' compatible':'')+(base?.id===it.id?' merge-parent':'')+'" data-action="item" data-value="'+esc(it.id)+'" aria-label="'+esc(name(it)+' · '+r.label+' · úroveň '+it.ilvl)+'" style="--rarity:'+r.color+'">'+itemArt(it.kind)+'</button>';
 }).join('')+'</div>'+
 (s.inventory.length>s.capacity?'<p class="overflow-note">Předměty nad limitem zůstaly zachované. Pro nový nález nejdřív uvolni místo.</p>':'')+
 '<div class="inventory-tools">'+btn('Krámek','shop','','secondary')+btn('Kovárna','forge','','secondary')+'</div></section>';
}
function renderDialog(){
 const s=game.state,p=s.pending[0];let body='';
 if(front&&!dialog){body='';
 }else if(!front&&!s.heroName){
  body='<div class="welcome-content"><h2 id="dialog-title">Quest Happens</h2><img src="assets/sir-smik.webp" alt="Tvůj dobrodruh"><label for="hero-name">Jak se jmenuješ?</label><input id="hero-name" autocomplete="off" maxlength="24" value="'+esc(nameDraft)+'" aria-describedby="name-hint"><small id="name-hint">2–24 znaků. Návrh můžeš přepsat.</small>'+btn(s.run||s.level>1?'Pokračovat v příběhu':'Vstoupit do příběhu','name-confirm','','primary wide')+'</div>';
 }else if(!front&&s.storyEvents.length&&!p&&!dialog){
  const e=s.storyEvents[0],answered=e.response!==undefined;
  body='<div class="story-copy"><small class="eyebrow">KAPITOLA I · '+esc(e.speaker)+'</small><h2 id="dialog-title">'+esc(e.title)+'</h2><blockquote>'+esc(answered?e.answers[e.response]:e.text)+'</blockquote><p>'+esc(answered?e.closing:e.narration)+'</p>'+(answered?'<small>'+esc(s.heroName)+': '+esc(e.replies[e.response])+'</small>':'')+'</div><footer class="dialog-footer">'+(answered?btn('Pokračovat','story-close','','primary wide'):e.replies.map((reply,i)=>btn(esc(reply),'story-reply',i,'secondary wide')).join(''))+'</footer>';
 }else if(!front&&p&&!dialog){
  if(p.type==='chest')body='<div class="chest-art scene-5"><div class="scene-art"></div>'+sceneSprite(RPGScenes.encounter({kind:'chest'},{area:0},null),'chest-token')+'</div><small class="eyebrow">NALEZENÁ TRUHLA</small><h2 id="dialog-title">'+['Ošoupaná truhla','Železná truhla','Runová truhla'][p.tier]+'</h2><p>'+esc(p.note)+'</p><p class="muted">Uvnitř může být výbava. I bez předmětu získáš zlato a esenci.</p>'+btn('Otevřít truhlu','chest','','primary wide');
  else body='<small class="eyebrow">'+(p.previewOnly?'SPOJENÍ DOKONČENO':'NOVÝ NÁLEZ')+'</small><h2 id="dialog-title">'+(p.previewOnly?'Sloučený předmět':'Nalezený předmět')+'</h2>'+lootCard(p.item)+genes(p.item)+compare(p.item)+'<p class="muted">'+esc(p.note)+'</p>'+
   (p.previewOnly?btn('Hotovo','preview-close','','primary wide'):'<div class="dialog-actions">'+btn('Nasadit','loot','equip','primary',s.inventory.length>=s.capacity&&!!s.equipped[D.itemById[p.item.kind].slot])+btn(s.inventory.length>=s.capacity?'Inventář plný':'Do inventáře','loot','take','secondary',s.inventory.length>=s.capacity)+btn('Prodat · '+game.price(p.item)+' ◈','loot','sell','secondary')+btn('Rozložit · '+(2+D.rarityIndex(p.item.rarity)*2)+' ✦','loot','salvage','secondary')+'</div>'+
   (s.inventory.length>=s.capacity?btn('Spravovat plný inventář','manage-loot','','text-button wide'):''));
 }else if(dialog?.type==='level-up'){
  body=levelUpView();
 }else if(dialog?.type==='traits'){
  body='<h2 id="dialog-title">Vlastnosti výbavy</h2>'+game.stats().traits.map(t=>'<p><strong>'+D.traits[t].name+'</strong><br>'+D.traits[t].effect+'</p>').join('')+btn('Zpět','close','','primary wide');
 }else if(dialog?.type==='item'){
  const it=dialog.slot?s.equipped[dialog.slot]:s.inventory.find(x=>x.id===selected);
  if(it)body='<h2 id="dialog-title">Detail předmětu</h2>'+lootCard(it)+genes(it)+(dialog.slot?'':compare(it))+'<div class="dialog-actions">'+
   (dialog.slot?btn('Sundat do inventáře','unequip',dialog.slot,'secondary',!!s.run?.battle||s.inventory.length>=s.capacity):
   btn('Nasadit','equip',it.id,'primary',!!s.run?.battle)+btn('Slučovat','merge-start',it.id,'secondary',!!s.run?.battle)+btn('Prodat · '+game.price(it)+' ◈','sell',it.id,'secondary')+btn('Rozložit na esenci','salvage',it.id,'secondary'))+'</div>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='merge'){
  const preview=game.mergePreview(mergeBase,donor);
  if(preview)body=wallet(['essence'])+'<small class="eyebrow">NÁHLED · ZATÍM NIC NESPOTŘEBOVÁNO</small><h2 id="dialog-title">'+(preview.promote?'Vzestup do vyšší kategorie':'Potomek tvé výbavy')+'</h2>'+lootCard(preview.item)+genes(preview.item)+'<p>Zaručená základní síla: '+Math.round(game.basePower(preview.item))+'. Geny uvedené výše zůstanou nebo zesílí.</p><p>'+preview.mutation+'</p><div class="dialog-actions">'+btn('Sloučit · '+preview.cost+' ✦','merge-confirm','','primary',s.essence<preview.cost||!!s.run?.battle)+btn('Zpět','close','','secondary')+'</div><small>Potvrzení spotřebuje oba rodiče.</small>';
 }else if(dialog?.type==='forge'){
  body='<h2 id="dialog-title">Kovárna</h2>'+recipeCard(s.selectedArea)+'<details><summary>Jak slučovat</summary><p>Otevři předmět v inventáři a zvol Slučovat. Vyber dárce do stejného slotu. Před potvrzením uvidíš cenu i výsledek.</p></details>'+btn('Zpět','close','','primary wide');
 }else if(dialog?.type==='shop'){
  const area=D.areas[s.selectedArea];
  body=wallet(['gold'])+'<small class="eyebrow">KUPEC · '+area.name+'</small><h2 id="dialog-title">Víš, co kupuješ.</h2><p>Uvedená vzácnost, úroveň a afix jsou zaručené. Táborový obchod je dostupný až po návratu z výpravy.</p>'+game.shopList().map((row,i)=>'<div class="shop-row">'+itemArt(row.kind)+'<div><strong>'+D.itemById[row.kind].label+'</strong><small>'+D.rarityById[row.rarity].label+' · úroveň '+row.ilvl+' · Poškození +'+(3+row.ilvl)+'</small></div>'+btn(row.price+' ◈','buy',i,'secondary',s.gold<row.price||!!s.pending.length||!!s.run)+'</div>').join('')+
   '<div class="shop-row"><div><strong>🧪 Léčivý elixír</strong><small>Obnoví 40 % životů. V boji je po ruce.</small></div>'+btn('18 ◈','buy-potion','','secondary',s.gold<18||!!s.run)+'</div>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='location'){
  const p=D.areas[s.selectedArea],rec=s.records[s.selectedArea];
  body='<h2 id="dialog-title">'+p.name+'</h2><p>'+(rec.clears?'Místo je osvobozené. Vstoupíš do ozvěny někdejší kletby a získáš skutečnou kořist; příběh se nevrací zpět.':p.quest)+'</p><p>'+p.hint+'</p><small>'+D.expeditionLengths[s.selectedArea]+' míst · '+p.boss+' · kořist úrovně '+(p.level+s.selectedChallenge*2)+'</small>'+(rec.clears?'<div class="difficulty">'+btn('−','difficulty','-1','small',s.selectedChallenge===0)+'<span>Hrozba '+(s.selectedChallenge+1)+'</span>'+btn('+','difficulty','1','small',s.selectedChallenge>=rec.highest+1)+'</div>':'')+btn('Zpět na mapu','close','','primary wide');
 }else if(dialog?.type==='camp-menu'){
  body='<h2 id="dialog-title">Tábor</h2><p>Odpočinek před výpravou je zdarma. V terénu doplníš lektvary jen u potkaných obchodníků.</p><div class="dialog-actions">'+btn('Odpočinout','rest','','secondary',!!s.run||s.hp>=game.stats().maxHp)+btn('Lektvar · 18 zlata','buy-potion','','secondary',s.gold<18||!!s.run)+btn('Poslední výprava','report','','secondary',!s.lastReport)+btn('Kronika','journal','','secondary')+'</div>'+btn('Zpět na mapu','close','','primary wide');
 }else if(dialog?.type==='report'){
  body='<h2 id="dialog-title">Poslední výprava</h2>'+(s.lastReport?reportCard(s.lastReport):'<p>Zatím nemáš dokončenou výpravu.</p>')+btn('Zavřít','close','','primary wide');
 }else if(dialog?.type==='chapter'){
  body='<h2 id="dialog-title">'+D.chapter.title+'</h2><p>Král drží Pomezí v nekončícím večeru. Osvoboď jeho poddané a zlom Korunu posledního světla.</p><ol class="chapter-list">'+D.areas.map((p,i)=>'<li><strong>'+(s.records[i].clears?'✓ ':i<s.unlocked?'→ ':'')+p.name+'</strong><p>'+(s.records[i].clears?'Osvobozeno. Dostupné ozvěny pro další kořist.':i<s.unlocked?p.quest:'Pokračování se odkryje po předchozí výpravě.')+'</p></li>').join('')+'</ol>'+btn('Zpět na mapu','close','','primary wide');
 }else if(dialog?.type==='menu'){
  body='<h2 id="dialog-title">Menu</h2>'+btn('Uložit hru','save-menu','','secondary wide')+btn('Settings','sound','','secondary wide')+btn('Uložit a hlavní menu','main-menu','','secondary wide')+(s.run?btn('Ukončit výpravu','retreat-confirm','','secondary wide',!!s.run.battle||!!s.pending.length):'')+btn('Zpět do hry','close','','primary wide');
 }else if(dialog?.type==='save-slots'){
  body='<h2 id="dialog-title">Uložit hru</h2>'+['1','2','3'].map(slot=>{const row=saves.rows.find(x=>x.slot===slot);return btn('Pozice '+slot+'<small>'+ (row?esc(row.state.heroName)+' · úroveň '+row.state.level:'Prázdná')+'</small>','save-slot',slot,'save-row');}).join('')+'<p>Automatická pozice se ukládá průběžně. Ruční slot zůstává, dokud jej sám nepřepíšeš.</p>'+btn('Zpět','menu','','secondary wide');
 }else if(dialog?.type==='save-overwrite'){
  body='<h2 id="dialog-title">Přepsat pozici '+dialog.slot+'?</h2><p>Původní ruční uložení v tomto slotu bude nahrazeno.</p>'+btn('Přepsat','save-confirm',dialog.slot,'primary wide')+btn('Zpět','save-menu','','secondary wide');
 }else if(dialog?.type==='saving'){
  body='<h2 id="dialog-title">Ukládám…</h2><p role="status">Počkej na potvrzení.</p>';
 }else if(dialog?.type==='audio'){
  body='<h2 id="dialog-title">Zvuk hry</h2><p>Údery, obrana, kořist a interakce. Hudba zatím není přidaná.</p>'+btn(s.settings.sound?'Vypnout zvuky':'Zapnout zvuky','sound-toggle','','primary wide')+'<label class="audio-volume" for="audio-volume">Hlasitost efektů <output id="audio-value">'+Math.round(s.settings.volume*100)+' %</output><input id="audio-volume" type="range" min="0" max="100" step="5" value="'+Math.round(s.settings.volume*100)+'"></label>'+'<div class="dialog-actions">'+[['block','Kovový blok'],['blade','Čepel'],['blunt','Palice'],['arrow','Šíp'],['shield','Magická bariéra'],['heal','Léčení']].map(([cue,label])=>btn(label,'sound-preview',cue,'secondary',!s.settings.sound||!s.settings.volume)).join('')+'</div>'+'<p class="muted">Nastavení se ukládá. Po přepnutí aplikace zvuky utichnou.</p>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='currency'){
  const gold=dialog.id==='gold';body='<h2 id="dialog-title">'+(gold?'Zlato':'Esence')+'</h2><p class="currency-total">'+(gold?s.gold:s.essence)+'</p><p>'+(gold?'Za zlato nakupuješ výbavu a lektvary. Získáváš ho bojem, některými rozhodnutími, z truhel a prodejem předmětů. Štěstí zvyšuje odměny, ne prodejní ceny.':'Esence slouží ke slučování a výrobě jedinečných předmětů. Získáváš ji za boj, rozkladem výbavy a z truhel bez předmětu. Zlato ji nenahrazuje.')+'</p>'+btn('Rozumím','close','','primary wide');
 }else if(dialog?.type==='journal'){
  body='<h2 id="dialog-title">Kronika</h2><ol class="journal">'+s.journal.slice().reverse().map(x=>'<li>'+esc(x.replace(/(?:Sir )?Šmik/g,()=>s.heroName))+'</li>').join('')+'</ol>'+btn('Zavřít','close','','text-button wide');
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
 $('overlay').hidden=!body;$('overlay').classList.toggle('title-dialog',!!front);$('game').inert=!!body;$('title-screen').inert=!!body;
 if(body){if(wasHidden)previousFocus=document.activeElement;$('overlay').innerHTML='<section class="dialog-card">'+body+'</section>';const restored=[...$('overlay').querySelectorAll('button:not(:disabled)')].find(b=>b.dataset.action===focusAction&&b.dataset.value===focusValue);(restored||$('overlay').querySelector('button:not(:disabled)')||$('overlay')).focus();}
 else{ $('overlay').innerHTML='';if(!wasHidden)previousFocus?.focus?.(); }
}
function schedule(){
 if(front)return;
 const b=game.state.run?.battle;if(!b||b.tactic||paused||tab!=='road'||dialog||game.state.storyEvents.length||game.state.pending.length||game.state.notice||document.hidden||!game.state.heroName)return;
 timer=setTimeout(()=>{
  const idle=b.turn==='enemy'&&((b.style==='hunter'&&!b.charged)||(b.style==='thief'&&b.round>=4));
  motion=idle?'':b.turn;game.step();flushSounds();render();
 },(b.turn==='player'?game.attackDelay():1000)/game.state.settings.speed);
}
function close(){dialog=null;selected=null;donor=null;}
function dispatch(action,value){
 if(action.startsWith('title-')){void titleAction(action,value);return;}
 if(busy&&!front)return;
 if(front&&!['sound-toggle','sound-preview','close'].includes(action))return;
 let result=true;const s=game.state,beforeStats=game.stats();
 audio.configure(s.settings.sound,s.settings.volume);void audio.unlock();
 if(!front&&!s.heroName&&action!=='name-confirm')return;
 if(action==='equip'||action==='unequip'||(action==='loot'&&value==='equip')){
  const it=action==='loot'?s.pending[0]?.item:action==='equip'?s.inventory.find(x=>x.id===value):null;
  const slot=action==='unequip'?value:it?D.itemById[it.kind].slot:null;
  if(slot&&game.equipmentHp({...s.equipped,[slot]:it})<1){toast('Nejdřív se ošetři. Bez těchto životů z výbavy bys nepřežil.');return;}
 }
 switch(action){
  case 'name-confirm':if(!game.setHeroName(nameDraft)){toast('Zadej 2–24 znaků: písmena, mezery, pomlčku nebo apostrof.');return;}close();break;
  case 'tab':audio.stop();tab=value;if(tab==='character'&&(s.levelNotice||s.points))dialog={type:'level-up'};break;
  case 'character-page':if(['attributes','equipment','effects'].includes(value))characterPage=value;break;
  case 'stat-page':statPage=Math.max(0,Math.min(Math.ceil(statRows.length/6)-1,Number(value)||0));break;
  case 'level-up':dialog={type:'level-up'};break;
  case 'traits':dialog={type:'traits'};break;
  case 'story-reply':result=game.storyReply(Number(value));break;
  case 'story-close':result=game.closeStory();break;
  case 'chapter':case 'location':case 'camp-menu':case 'report':dialog={type:action};break;
  case 'currency':dialog={type:'currency',id:value,back:dialog};break;
  case 'area':if(Number(value)<s.unlocked){s.selectedArea=Number(value);s.selectedChallenge=0;}break;
  case 'difficulty':s.selectedChallenge=RPG.clamp(s.selectedChallenge+Number(value),0,s.records[s.selectedArea].highest+1);break;
  case 'start':result=game.start();if(result){tab='road';paused=false;}break;
  case 'continue':s.notice=null;break;
  case 'choice':
   if(s.run?.battle?.tactic){motion=value==='right'?'player':'enemy';result=game.tactic(value);}else result=game.choose(value);
   if(result==='character')tab='character';break;
  case 'pause':paused=!paused;break;
  case 'potion':result=game.potion();break;
  case 'speed':s.settings.speed=s.settings.speed===1?2:1;break;
  case 'menu':dialog={type:'menu'};break;
  case 'save-menu':dialog={type:'save-slots'};break;
  case 'save-slot':if(!['1','2','3'].includes(value))return;if(saves.rows.some(x=>x.slot===value)){dialog={type:'save-overwrite',slot:value};break;}void saveAndReturn(value);return;
  case 'save-confirm':if(['1','2','3'].includes(value))void saveAndReturn(value);return;
  case 'main-menu':if(!saves.ready){front='menu';dialog=null;audio.stop();render();return;}void saveAndReturn('auto',true);return;
  case 'sound':dialog={type:'audio',back:dialog?.type==='menu'?dialog:null};break;
  case 'sound-toggle':s.settings.sound=!s.settings.sound;audio.configure(s.settings.sound,s.settings.volume);if(s.settings.sound)sound('equip');break;
  case 'sound-preview':sound(['block','blade','blunt','arrow','shield','heal'].includes(value)?value:'block');break;
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
  case 'merge-confirm':result=game.merge(mergeBase,donor);if(result){mergeBase=null;close();game.cue('forge');}break;
  case 'chest':result=game.openChest();if(result)game.cue('chest');break;
  case 'loot':result=game.loot(value);break;
  case 'preview-close':if(s.pending[0]?.previewOnly)s.pending.shift();break;
  case 'loot-show':dialog=null;break;
  case 'manage-loot':dialog={type:'manage'};tab='inventory';break;
  case 'craft':result=game.craft(Number(value));if(result)close();break;
  case 'shop':dialog={type:'shop'};break;
  case 'forge':dialog={type:'forge'};break;
  case 'buy':result=game.buy(Number(value));if(result)close();break;
  case 'buy-potion':result=game.buyPotion();if(result)toast('Lektvar přidán do opasku.');break;
  case 'rest':result=game.rest();if(result)toast('Odpočinek obnovil všechny životy.');break;
  case 'reset-confirm':front='new';dialog=null;break;
  case 'reset':try{localStorage.setItem(KEY+'-before-reset',JSON.stringify(s));game.state=game.fresh();close();mergeBase=null;tab='map';}catch{result=false;}break;
  case 'retreat-confirm':dialog={type:'retreat'};break;
  case 'retreat':result=game.retreat();if(result){close();tab='map';}break;
  case 'close':if(dialog?.back)dialog=dialog.back;else{if(dialog?.type==='level-up')s.levelNotice=null;close();}break;
  default:return;
 }
 if(result===false)toast('Teď to nejde: zkontroluj suroviny, místo v inventáři nebo probíhající boj.');
 else if(['equip','unequip'].includes(action)||(action==='loot'&&value==='equip')){
  const after=game.stats(),changes=[['luck','Štěstí'],['gold','Zlato'],...statRows.filter(x=>!['luck','gold','damageMin'].includes(x[0]))].filter(([k])=>after[k]!==beforeStats[k]);
  toast((action==='unequip'?'Sundáno. ':'Nasazeno. ')+(changes.length?changes.slice(0,3).map(([k,label])=>label+' '+fmt(beforeStats[k])+' → '+fmt(after[k])+unit(k)).join(' · '):'Číselné staty se nezměnily.')+' Podrobnosti v Postavě.');
 }else if(action==='loot'&&value==='take')toast('Uloženo do inventáře. Bonusy získáš až po nasazení.');
 const interaction={equip:'equip',unequip:'equip',sell:'coins',salvage:'salvage',buy:'coins','buy-potion':'potion',craft:'forge',growth:'level',rest:'potion',tab:'page',choice:'page','story-reply':'page','story-close':'page'};
 if(result!==false&&action==='loot')game.cue(({equip:'equip',sell:'coins',salvage:'salvage',take:'equip'})[value]||'tap');
 if(result!==false&&interaction[action]&&(action!=='choice'||!game.audioEvents.length))game.cue(interaction[action]);
 flushSounds(result===false||['sound-toggle','sound-preview','choice'].includes(action)?null:'tap');if(front)save();render();
}
async function saveAndReturn(slot,toTitle=false){
 busy=true;dialog={type:'saving'};render();
 const ok=await cloudSave(slot);busy=false;dialog={type:ok?'menu':'save-slots'};
 if(ok){toast('Hra uložena.');if(toTitle){front='menu';dialog=null;audio.stop();}}
 render();
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&!button.disabled)dispatch(button.dataset.action,button.dataset.value);});
document.addEventListener('change',e=>{if(e.target.id==='slot-filter'){filter=e.target.value;render();}else if(e.target.id==='audio-volume'){render();sound('tap');}});
document.addEventListener('input',e=>{if(e.target.id==='hero-name'){nameDraft=e.target.value;return;}if(e.target.id==='audio-volume'){const value=Number(e.target.value);if(!Number.isFinite(value))return;game.state.settings.volume=Math.max(0,Math.min(1,value/100));audio.configure(game.state.settings.sound,game.state.settings.volume);$('audio-value').textContent=Math.round(game.state.settings.volume*100)+' %';save();}});
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
 if(e.key==='Enter'&&e.target.id==='hero-name'){e.preventDefault();dispatch('name-confirm','');return;}
 if(!$('overlay').hidden){
  if(e.key==='Escape'&&dialog){dispatch('close','');return;}
  if(e.key==='Tab'){
   const list=[...$('overlay').querySelectorAll('button:not(:disabled),select,input:not(:disabled)')];if(!list.length){e.preventDefault();return;}
   if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}
   else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}
  }
  return;
 }
 if(tab==='road'&&!e.target.matches('input,select,textarea')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();dispatch('choice',e.key==='ArrowLeft'?'left':'right');}
});
document.addEventListener('visibilitychange',()=>{audio.visibility(document.hidden);if(document.hidden){clearTimeout(timer);save();if(!front&&hasSession&&saves.ready)void cloudSave();}else{render();}});
window.addEventListener('pagehide',()=>{audio.visibility(true);save();if(!front&&hasSession&&saves.ready)void cloudSave();});
window.addEventListener('pageshow',()=>{audio.visibility(document.hidden);});
try{const prefs=JSON.parse(localStorage.getItem(KEY+'-settings')||'null');if(prefs){game.state.settings.sound=prefs.sound===true;game.state.settings.volume=Number.isFinite(prefs.volume)?Math.max(0,Math.min(1,prefs.volume)):.55;}}catch{}
render();setTimeout(()=>{if(front==='splash'){front='menu';render();}},1600);void refreshSaves();
if(storageError)toast('Původní místní pozici nelze přečíst. Serverové pozice zůstávají dostupné přes Load Game.');
})();
