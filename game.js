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
const name=it=>it.name||D.itemById[it.kind].label;
const pct=new Set(['crit','evasion','leech','gold','thorns','haste','luck']);
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
 return '<div class="item-card '+(compact?'compact':'')+'" style="--rarity:'+r.color+'"><div class="item-symbol">'+d.icon+'</div><div><small>'+r.label+' · úroveň '+it.ilvl+' · +'+it.rank+'</small><strong>'+esc(name(it))+'</strong><span>'+D.slots[d.slot]+'</span></div></div>';
}
function genes(it){return '<ul class="genes">'+it.affixes.map(x=>'<li><span>'+D.statNames[x.id]+'</span><b>+'+x.value+(pct.has(x.id)?' %':'')+'</b></li>').join('')+'</ul>'+(it.trait?'<div class="signature"><small>JEDINEČNÁ VLASTNOST</small><p>'+esc(D.traits[it.trait].effect)+'</p></div>':'');}
function compare(it){
 const slot=D.itemById[it.kind].slot,old=game.state.equipped[slot],before=game.stats(),after=game.stats({...game.state.equipped,[slot]:it});
 const rows=[['damageMax','Max. poškození'],['maxHp','Životy'],['armor','Zbroj'],['crit','Krit'],['evasion','Úhyb'],['leech','Kradení života'],['haste','Rychlost'],['luck','Štěstí']];
 return '<div class="comparison"><small>PROTI '+esc(old?name(old):'PRÁZDNÉMU SLOTU')+'</small>'+rows.filter(([k])=>after[k]!==before[k]).map(([k,label])=>'<span>'+label+' <b class="'+(after[k]>before[k]?'up':'down')+'">'+(after[k]>before[k]?'+':'')+Math.round((after[k]-before[k])*10)/10+'</b></span>').join('')+'</div>';
}
function render(){
 clearTimeout(timer);const s=game.state,a=game.stats();
 $('statusbar').innerHTML='<span class="level-medal">'+s.level+'</span><div class="mini-hp"><strong>Sir Šmik <small>'+Math.ceil(s.hp)+' / '+a.maxHp+'</small></strong>'+health(s.hp,a.maxHp)+'</div><div class="currencies"><span>◈ '+s.gold+'</span><span>✦ '+s.essence+'</span></div>';
 $('sound-button').setAttribute('aria-label',s.settings.sound?'Vypnout zvuk':'Zapnout zvuk');$('sound-button').classList.toggle('on',s.settings.sound);$('sound-button').textContent=s.settings.sound?'♫':'♪';
 $('points-dot').hidden=!s.points;
 for(const b of document.querySelectorAll('.bottom-tabs button')){b.classList.toggle('active',b.dataset.value===tab);b.setAttribute('aria-current',b.dataset.value===tab?'page':'false');}
 $('view').innerHTML=({map:mapView,road:roadView,character:characterView,inventory:inventoryView}[tab]||mapView)();
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
 return heading('PRVNÍ KAPITOLA','Pomezí Nedorozumění')+
 (s.run?'<div class="resume-banner"><div><strong>'+D.areas[s.run.area].name+'</strong><small>Výprava čeká · místo '+(s.run.index+1)+' / '+s.run.rooms.length+'</small></div>'+btn('Pokračovat →','tab','road','primary')+'</div>':'')+pending+
 '<div class="world-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+markers+'<span class="map-caption">NE KAŽDÁ CESTA VEDE K POKLADU.<br>NĚKTERÉ VEDOU K ÚČETNÍMU.</span></div>'+
 '<section class="panel location"><div class="heading"><h3>'+p.name+'</h3><span class="pill">Hrozba '+(s.selectedChallenge+1)+'</span></div><p>'+p.quest+'</p><p class="muted">'+p.hint+'</p>'+
 '<div class="location-facts"><span>7 míst · boss na konci</span><span>Kořist úrovně '+(p.level+s.selectedChallenge*2)+'</span></div>'+
 (rec.clears?'<div class="difficulty">'+btn('−','difficulty','-1','small',s.selectedChallenge===0)+'<span>Hrozba '+(s.selectedChallenge+1)+' · '+rec.clears+' vítězství</span>'+btn('+','difficulty','1','small',s.selectedChallenge>=rec.highest+1)+'</div>':'')+
 btn(s.run?'Nejprve dokonči rozehranou výpravu':'Vyrazit na výpravu →','start','','primary wide',!!s.run||!!s.pending.length)+
 '</section>'+recipeCard(s.selectedArea)+
 (!s.run?'<div class="camp-actions">'+btn('Odpočinout zdarma','rest','','secondary',s.hp>=game.stats().maxHp)+btn('Lektvar · 18 ◈','buy-potion','','secondary',s.gold<18)+'</div>':'')+
 (s.lastReport?reportCard(s.lastReport):'')+
 '<p class="footnote">Postup se ukládá v tomto prohlížeči. Zvuk zapneš tlačítkem ♪.</p>'+btn('Nový lokální průchod','reset-confirm','','text-button');
}
function recipeCard(area){
 const p=D.areas[area],r=game.state.records[area],sig=D.signatures[p.recipe];
 return '<section class="panel recipe"><small class="eyebrow">CÍL DALŠÍ VÝPRAVY</small><h3>'+sig.name+'</h3><p>'+sig.effect+'</p><div class="progress-label"><span>'+p.material+'</span><b>'+r.marks+' / 4</b></div>'+health(r.marks,4,'xp')+'<small>'+ (r.marks<4?'Chybí '+(4-r.marks)+' · každý poražený boss přinese 2.':'Materiál je připravený.')+' Výroba stojí ještě 10 esence.</small>'+btn('Vyrobit jedinečný předmět','craft',area,'secondary wide',r.marks<4||game.state.essence<10||!!game.state.pending.length||!!game.state.run?.battle)+'</section>';
}
function reportCard(r){return '<section class="panel report"><small class="eyebrow">'+(r.win?'ZAKÁZKA SPLNĚNA':'POUČENÍ Z VÝPRAVY')+'</small><h3>'+D.areas[r.area].name+'</h3><div class="report-stats"><span>◈ '+r.gold+' zlata</span><span>✶ '+r.xp+' XP</span><span>◇ '+r.marks+' materiálu</span></div><p>'+r.choices+' rozhodnutí · hrozba '+(r.challenge+1)+'</p>'+(game.state.notice?'<p>'+esc(game.state.notice.text)+'</p>':'')+logs(r.logs)+'</section>';}
function logs(rows){if(!rows?.length)return '';return '<details class="log-details"><summary>Průběh posledního boje</summary><ol>'+rows.map(x=>'<li class="'+x.type+'">'+esc(x.text)+'</li>').join('')+'</ol></details>';}
function roadView(){
 const s=game.state,r=s.run;
 if(!r)return heading('VÝPRAVA','Cesta čeká')+(s.lastReport?reportCard(s.lastReport):'<section class="panel"><p>Vyber místo na mapě a vydej se po stopě jeho kletby.</p></section>')+btn('Otevřít mapu','tab','map','primary wide');
 const p=D.areas[r.area],b=r.battle,room=game.room(),t=b?.tactic,n=s.notice;
 const progress='<div class="route-progress" aria-label="Postup výpravou">'+r.rooms.map((id,i)=>'<i class="'+(i<r.index?'done':i===r.index?'current':'')+'">'+(i<r.index?'✓':id==='boss'?'♛':i+1)+'</i>').join('')+'</div>';
 const art=b?b.art:room.id==='scribe'?4:room.id==='boss'?p.bossArt:room.id==='gate'?0:null;
 const stage='<section class="stage scene-'+p.scene+' '+(b?'fighting':'')+'"><div class="scene-art"></div><div class="stage-vignette"></div>'+
 '<div class="stage-label">'+(b?(b.boss?'CÍL ZAKÁZKY':'STŘETNUTÍ'):'MÍSTO '+Math.min(r.index+1,r.rooms.length)+' / '+r.rooms.length)+'</div>'+
 (art!==null?atlas(art,'portrait enemy-portrait '+(b?.last==='attack'||b?.last==='crit'?'hit':'')):'<div class="location-emblem">'+({well:'💍',camp:'✦',bell:'♧',merchant:'◈',wounded:'✉',cache:'◇'}[room.id]||'⌘')+'</div>')+
 (b?'<div class="enemy-meter"><strong>'+esc(b.name)+'</strong>'+health(b.hp,b.maxHp,'enemy')+'<small>'+b.hp+' / '+b.maxHp+'</small></div>':'')+
 '<div class="hero-token"><img src="assets/sir-smik.webp" alt="Sir Šmik"><span class="held-weapon" aria-label="Nasazená zbraň">'+(s.equipped.weapon?D.itemById[s.equipped.weapon.kind].icon:'✊')+'</span></div></section>';
 let content='';
 if(n){content='<section class="panel outcome"><small class="eyebrow">NÁSLEDEK TVÉ CESTY</small><h2>'+esc(n.title)+'</h2><p>'+esc(n.text)+'</p>'+logs(n.logs)+btn('Pokračovat →','continue','','primary wide')+'</section>';}
 else if(b&&!t){
  content='<section class="panel battle-panel"><div class="heading"><strong>'+(paused?'Boj pozastaven':b.turn==='player'?'Šmik připravuje útok':'Tah protivníka')+'</strong>'+btn(paused?'▶':'Ⅱ','pause','','icon-button')+'</div><ol class="combat-log" aria-live="polite">'+b.log.slice(-4).map(x=>'<li class="'+x.type+'">'+esc(x.text)+'</li>').join('')+'</ol><p class="muted">'+esc(b.hint)+'</p><div class="battle-controls">'+btn('Lektvar '+s.potions,'potion','','secondary',!s.potions||s.hp>=game.stats().maxHp)+btn(s.settings.speed+'× tempo','speed','','secondary')+'</div></section>';
 }else{
  const c=t||room;
  content='<section class="decision '+(t?'tactical':'')+'" id="swipe-card"><small class="eyebrow">'+(t?'TVŮJ TAH · BOJ ČEKÁ':'ROZHODNUTÍ')+'</small><h2>'+esc(c.title)+'</h2><p>'+esc(c.text)+'</p><div class="swipe-feedback" aria-hidden="true"><span>← '+esc(c.choices[0])+'</span><span>'+esc(c.choices[1])+' →</span></div><div class="choices">'+btn('<span>←</span><strong>'+esc(c.choices[0])+'</strong><small>'+esc(c.hints?.[0]||'Prostor, obratnost a připravená cesta.')+'</small>','choice','left','choice')+btn('<span>→</span><strong>'+esc(c.choices[1])+'</strong><small>'+esc(c.hints?.[1]||'Rozhoduje síla zbraně.')+'</small>','choice','right','choice')+'</div><small class="swipe-hint">Táhni kartou nebo klepni na volbu.</small></section>';
 }
 return heading('VÝPRAVA',p.name,'<span class="pill">'+(r.index+1)+' / '+r.rooms.length+'</span>')+progress+stage+content+(t?btn('🧪 Lektvar · '+s.potions,'potion','','secondary wide',!s.potions||s.hp>=game.stats().maxHp):'')+
 '<div class="expedition-footer">'+btn('Výbava','tab','character','text-button')+
 (!b?btn('Vrátit se do tábora','retreat-confirm','','text-button'):'<small>Otevření jiné karty boj pozastaví.</small>')+'</div>';
}
const growthDefs=[
 ['might','⚔','Síla','Za bod +1,2 až 1,8 poškození. Silný útok snáze přeruší bosse.'],
 ['grit','♥','Odolnost','Za bod +7 životů a +0,6 zbroje. Pomáhá přežít a podporuje obrannou výbavu.'],
 ['agility','〰','Obratnost','Za bod +1,2 procentního bodu kritu a +0,8 úhybu. Od 12 % úhybu zvládneš bossův úder obejít.'],
 ['intelligence','✶','Inteligence','Za bod +5 % získaných XP a +3 kapacity ochranného štítu z Amuletu nenasytnosti.'],
 ['luck','☘','Štěstí','Zvyšuje četnost i kvalitu nálezů. Každý bod výsledného štěstí přidá 2 % zlata z odměn.']
];
function characterView(){
 const s=game.state,a=game.stats(),locked=!!s.run?.battle;
 const stats=[['⚔','Poškození',a.damageMin+'–'+a.damageMax],['✹','Krit',a.crit+' %'],['🛡','Zbroj',a.armor],['〰','Úhyb',a.evasion+' %'],['♥','Životy',a.maxHp],['♢','Blok',a.block+' %'],['♧','Trny',a.thorns+' %'],['◒','Pohlcení',a.absorb],['↟','Rychlost',a.haste+' %'],['☘','Štěstí',a.luck+' %'],['◈','Bonus zlata',a.gold+' %'],['✶','Bonus XP',a.xpBonus+' %'],['♨','Kradení života',a.leech+' %']];
 return heading('POSTAVA','Sir Šmik',btn('Kronika','journal','','secondary'))+
 '<section class="hero-sheet panel"><img src="assets/sir-smik.webp" alt="Sir Šmik"><div><small class="eyebrow">ÚROVEŇ '+s.level+'</small><h3>Lovec prokletých míst</h3><span>'+s.xp+' / '+game.threshold()+' XP</span>'+health(s.xp,game.threshold(),'xp')+'<small>'+s.points+' bodů k rozdělení</small></div></section>'+
 '<div class="growth-grid">'+growthDefs.map(([id,icon,label,help])=>'<div class="growth"><button data-action="help" data-value="'+id+'" aria-label="Vysvětlit '+label+'"><span>'+icon+' '+label+'</span><strong>'+s.growth[id]+'</strong></button>'+btn('+','growth',id,'add-point',!s.points||locked)+'</div>').join('')+'</div>'+
 (locked?'<p class="muted">Během souboje je výcvik a převlékání uzamčené. Návratem do Výpravy boj pokračuje.</p>':'')+
 heading('NASAZENO','Výbava')+'<div class="equipment-grid">'+Object.entries(D.slots).map(([slot,label])=>{
 const it=s.equipped[slot];return '<button class="equipment" style="--rarity:'+(it?D.rarityById[it.rarity].color:'#32504d')+'" data-action="equipped" data-value="'+slot+'"><small>'+label+'</small><span>'+(it?D.itemById[it.kind].icon:'＋')+'</span><b>'+esc(it?name(it):'Prázdné místo')+'</b></button>';
 }).join('')+'</div>'+
 (a.traits.length?'<section class="panel"><small class="eyebrow">AKTIVNÍ KOMBINACE</small>'+a.traits.map(t=>'<p><strong>'+D.traits[t].name+'</strong><br>'+D.traits[t].effect+'</p>').join('')+'</section>':'')+
 heading('VÝSLEDNÉ HODNOTY','Bojové parametry')+'<div class="stats-grid">'+stats.map(([icon,label,v])=>'<div><small>'+icon+' '+label+'</small><strong>'+v+'</strong></div>').join('')+'</div><p class="footnote">Zbroj tlumí až 65 % poškození. Pohlcení odečítá pevnou hodnotu. Kradení života léčí při zásahu. Rychlost zkracuje čekání na tvůj útok.</p>';
}
function inventoryView(){
 const s=game.state,items=s.inventory.filter(it=>filter==='all'||D.itemById[it.kind].slot===filter);
 return heading('INVENTÁŘ A KOVÁRNA','Každý kus má příběh','<span class="pill">'+s.inventory.length+' / '+s.capacity+'</span>')+
 '<div class="filters"><label for="slot-filter">Zobrazit</label><select id="slot-filter"><option value="all">Všechny předměty</option>'+Object.entries(D.slots).map(([id,n])=>'<option value="'+id+'"'+(id===filter?' selected':'')+'>'+n+'</option>').join('')+'</select>'+btn('Krámek','shop','','secondary')+'</div>'+
 (mergeBase?'<div class="merge-banner"><strong>Vyber dárce pro '+esc(name(s.inventory.find(x=>x.id===mergeBase)))+'</strong><p>Stejný slot. Nejdřív uvidíš výsledek; nic se nespotřebuje prohlížením.</p>'+btn('Zrušit výběr','merge-cancel','','text-button')+'</div>':'')+
 '<div class="inventory-grid">'+items.map(it=>'<button class="inventory-item '+(mergeBase&&D.itemById[s.inventory.find(x=>x.id===mergeBase)?.kind]?.slot===D.itemById[it.kind].slot&&mergeBase!==it.id?'compatible':'')+'" data-action="item" data-value="'+it.id+'" style="--rarity:'+D.rarityById[it.rarity].color+'"><span>'+D.itemById[it.kind].icon+'</span><small>'+D.rarityById[it.rarity].label+' · +'+it.rank+'</small><strong>'+esc(name(it))+'</strong>'+(it.trait?'<i>✦ Jedinečný</i>':'')+'</button>').join('')+'</div>'+
 (!items.length?'<section class="empty panel"><h3>Kapsy mají místo.</h3><p>Boss vždy zanechá předmět. Ostatní nálezy tě čekají ve skrýších a truhlách.</p>'+btn('Vyrazit pro kořist','tab','map','secondary')+'</section>':'')+
 '<section class="panel"><small class="eyebrow">ŠLECHTĚNÍ VÝBAVY</small><h3>Základ + dárce → silnější kus</h3><p>Otevři předmět a zvol „Slučovat“. Základ si ponechá všechny své afixy. Shodné geny převezmou lepší hodnotu, volné místo může zdědit nový gen.</p><p>Dva kusy +3 stejné vzácnosti zvýší kategorii. Síla předmětu vždy vzroste nejméně o 10 %. Náhled vše ukáže předem.</p></section>'+
 recipeCard(s.selectedArea)+'<p class="footnote">Prodejem získáš zlato. Rozložením esenci pro slučování a cílenou výrobu.</p>';
}
function renderDialog(){
 const s=game.state,p=s.pending[0];let body='';
 if(p&&!dialog){
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
  body='<small class="eyebrow">KUPEC · '+area.name+'</small><h2 id="dialog-title">Víš, co kupuješ.</h2><p>Uvedená vzácnost, úroveň a afix jsou zaručené.</p>'+game.shopList().map((row,i)=>'<div class="shop-row"><div><strong>'+D.itemById[row.kind].icon+' '+D.itemById[row.kind].label+'</strong><small>'+row.rarity+' · úroveň '+row.ilvl+' · Poškození +'+(3+row.ilvl)+'</small></div>'+btn(row.price+' ◈','buy',i,'secondary',s.gold<row.price||!!s.pending.length||!!s.run?.battle)+'</div>').join('')+
   '<div class="shop-row"><div><strong>🧪 Léčivý elixír</strong><small>Obnoví 40 % životů. V boji je po ruce.</small></div>'+btn('18 ◈','buy-potion','','secondary',s.gold<18)+'</div>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='journal'){
  body='<h2 id="dialog-title">Kronika Sira Šmika</h2><p>Výpravy se mění. Někteří lidé si tě pamatují.</p><ol class="journal">'+s.journal.slice().reverse().map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+btn('Zavřít','close','','text-button wide');
 }else if(dialog?.type==='help'){
  const def=growthDefs.find(x=>x[0]===dialog.id);body='<h2 id="dialog-title">'+def[2]+'</h2><p>'+def[3]+'</p>'+btn('Rozumím','close','','primary wide');
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
 const b=game.state.run?.battle;if(!b||b.tactic||paused||tab!=='road'||dialog||game.state.pending.length||game.state.notice||document.hidden)return;
 timer=setTimeout(()=>{const before=game.state.metrics.bosses;game.step();sound(game.state.metrics.bosses>before?'reward':game.state.run?.battle?.last||'tap');render();},(b.turn==='player'?game.attackDelay():1000)/game.state.settings.speed);
}
function close(){dialog=null;selected=null;donor=null;}
function dispatch(action,value){
 let result=true;const s=game.state;
 switch(action){
  case 'tab':tab=value;break;
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
  case 'close':close();break;
  default:return;
 }
 if(result===false)toast('Teď to nejde: zkontroluj suroviny, místo v inventáři nebo probíhající boj.');
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
 if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>20){pointer.card.style.transform='';pointer=null;return;}
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
