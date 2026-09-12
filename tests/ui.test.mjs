import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(html.includes('<title>Quest Happens · Fantasy výpravy</title>'));
assert.ok(html.includes('id="topbar-title">Údolí posledního světla</h1>'));assert.ok(html.includes('lang="cs"'));
const scripts=await Promise.all(['data.js','encounters.js','story.js','engine.js','audio.js','scenes.js','saves.js','game.js'].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')));
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
const palette=await readFile(new URL('../palette.css',import.meta.url),'utf8');
for(const asset of ['overworld-v3.webp','characters-v3.webp','environments-v3.webp','hero-roman-select.jpg','hero-sorsha-select.jpg','hero-roman-battle-cutout.png','hero-sorsha-battle-cutout.png','equipment-atlas-v1.webp','equipment-atlas-v2.webp','equipment-atlas-v3.webp'])await access(new URL('../assets/'+asset,import.meta.url));
const handlers={},nodes=new Map(),storage=new Map(),timers=new Map();let seq=0;
const node=id=>({id,dataset:{},innerHTML:'',textContent:'',hidden:id==='overlay',style:{},disabled:false,inert:false,
 classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){document.activeElement=this},querySelector(){return null},querySelectorAll(){return[]},matches(){return false}});
const nav=['map','road','character','inventory'].map(value=>Object.assign(node('nav-'+value),{dataset:{value}}));
const document={hidden:false,activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},
 querySelectorAll(selector){return selector==='.bottom-tabs button'?nav:[];},addEventListener(name,cb){handlers[name]=cb;}};
const window={addEventListener(){}};
let cloud=[];
const ctx=vm.createContext({console,document,window,AbortController,fetch:async(url,options={})=>{
 if(options.method==='PUT'){const b=JSON.parse(options.body),row={slot:b.slot,revision:b.revision+1,state:b.state,updated_at:new Date().toISOString()};cloud=cloud.filter(x=>x.slot!==b.slot);cloud.push(row);return {ok:true,json:async()=>row};}
 return {ok:true,json:async()=>({saves:structuredClone(cloud)})};
},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)}});
for(const source of scripts.slice(0,-1))vm.runInContext(source,ctx);
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function boot(){cloud=[];timers.clear();vm.runInContext(scripts.at(-1),ctx);await settle();handlers.click({target:{closest:()=>({dataset:{action:'title-skip'},disabled:false})}});handlers.click({target:{closest:()=>({dataset:{action:'title-load',value:'legacy'},disabled:false})}});await settle();}
assert.equal(ctx.RPGData.rarities.map(r=>r.label).join(','),'Common,Uncommon,Rare,Epic,Legendary,Mythic');
// UI journey uses a durable character; starter difficulty is measured separately.
const uiHero=new ctx.RPG.Game();uiHero.setHeroName('Vendel');uiHero.state.growth.might=30;uiHero.state.growth.grit=30;uiHero.state.points=0;uiHero.state.levelNotice=null;uiHero.rest();
storage.set('ne-ale-zabijim-v3',JSON.stringify(uiHero.state));await boot();
const view=()=>nodes.get('view').innerHTML,overlay=()=>nodes.get('overlay').innerHTML;
const state=()=>JSON.parse(storage.get('ne-ale-zabijim-v3'));
const click=(action,value='')=>handlers.click({target:{closest(){return {dataset:{action,value:String(value)},disabled:false}}}});
function sane(){assert.ok(!/undefined|NaN/.test(view()+overlay()),'No invalid numbers or missing copy should render');}
function dismissStories(){let n=0;while(state().storyEvents.length&&n++<25){click('story-reply',0);click('story-close');}assert.ok(n<25);}
assert.ok(overlay().includes('Král Přesčas'));dismissStories();
assert.ok(view().includes('Mýtná věž'));assert.ok(view().includes('world-map'));sane();
for(const tab of ['character','inventory','road','map']){click('tab',tab);sane();}
click('help','luck');assert.ok(overlay().includes('Štěstí'));assert.equal(nodes.get('game').inert,true);
click('close');assert.equal(nodes.get('game').inert,false);
click('tab','inventory');click('shop');assert.ok(overlay().includes('Víš, co kupuješ'));
click('buy-potion');assert.equal(state().potions,4);assert.equal(state().gold,17);click('close');
click('tab','map');click('start');assert.ok(state().run);assert.ok(view().includes('Za branou'));sane();
click('choice','left');assert.ok(view().includes('Vstupné zaplaceno'));click('continue');
assert.ok(state().run.rooms.indexOf('scribe')>1);assert.ok(view().includes('/ 55'));sane();
click('tab','map');assert.ok(view().includes('map-loot'));
const savedIndex=state().run.index;click('start');assert.equal(state().run.index,savedIndex);
click('tab','road');
let steps=0;
while(state().run&&steps++<4000){
 const s=state();
 if(view().includes('data-action="rng-skip"'))click('rng-skip');
 else if(s.pending.length){
  if(s.pending[0].type==='chest')click('chest');else click('loot',s.inventory.length<s.capacity?'take':'sell');
 }else if(s.notice)click('continue');
 else if(s.run.battle){
  if(s.run.battle.tactic)click('choice','left');
  else{
   const task=[...timers.entries()].filter(([,t])=>t.ms<=1050&&t.ms>0).at(-1);
   assert.ok(task,'Auto-combat has a scheduled next action');timers.delete(task[0]);task[1].fn();
  }
 }else click('choice',s.run.rooms[s.run.index]==='boss'?'right':'left');
 sane();
}
assert.ok(steps<4000);assert.ok(state().lastReport?.win);assert.equal(state().pending[0].type,'item');
assert.ok(overlay().includes('NOVÝ NÁLEZ'));click('loot','take');click('tab','inventory');sane();
dismissStories();
const item=state().inventory[0];click('item',item.id);assert.ok(overlay().includes('Detail předmětu'));click('close');
click('journal');assert.ok(overlay().includes('Kronika'));click('close');
assert.ok(css.includes('[hidden]{display:none!important}'));assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(scripts[4].includes("'dice','roll-success','roll-fail'"));assert.ok(scripts[7].includes("Přeskočit hod"));
assert.ok(html.includes('viewport-fit=cover'));assert.ok(html.includes('aria-modal="true"'));assert.ok(html.includes('manifest.webmanifest'));
assert.ok(html.includes('palette.css'));assert.match(palette,/\.health i\{background:linear-gradient\(90deg,#8e1f24/);assert.match(palette,/\.bottom-tabs button\.active\{[^}]*#ffe087/);assert.ok(palette.includes("navigation-atlas-v1.png"));assert.equal((html.match(/class="nav-art"/g)||[]).length,4);
console.log('UI integration passed: initial render, four tabs, modal focus/inert state, shop/potions, branching expedition, saved resume, timed combat, tactical boss, loot and inventory. No real-browser layout or physical-device claim.');
const seeded=new ctx.RPG.Game();seeded.setHeroName('Vendel');seeded.state.growth.luck=2;seeded.state.points=0;seeded.state.levelNotice=null;const lucky=seeded.item('ring','rare',1,[['luck',3]]);seeded.state.inventory.push(lucky);
storage.set('ne-ale-zabijim-v3',JSON.stringify(seeded.state));await boot();dismissStories();const loadedLuckyId=state().inventory[0].id;
click('tab','inventory');click('item',loadedLuckyId);assert.ok(overlay().includes('Prsten štěstí'));assert.ok(overlay().includes('ZMĚNA PO NASAZENÍ'));
assert.ok(overlay().includes('2 → 5'));click('stat-help','luck');assert.ok(overlay().includes('obsah truhel'));click('close');assert.ok(overlay().includes('Detail předmětu'));
click('equip',loadedLuckyId);assert.ok(nodes.get('toast').textContent.includes('Štěstí 2 → 5'));click('tab','character');assert.ok(view().includes('<strong>Štěstí</strong><span>5</span>'));assert.ok(!view().includes('data-action="growth"'));
for(const key of ['damageMin','damageMax','maxHp','armor','crit','evasion','block','thorns','absorb','haste','luck','gold','xpBonus','leech','shieldCap']){
 click('stat-help',key);assert.ok(overlay().includes('ZÁKLAD + NASAZENÁ VÝBAVA'));sane();click('close');
}
click('stat-help','luck');assert.ok(overlay().includes('Prsten štěstí'));click('close');
click('equipped','ring');click('unequip','ring');assert.ok(view().includes('<strong>Štěstí</strong><span>2</span>'));click('tab','map');click('start');assert.ok(!view().includes('held-weapon'));
console.log('UI equipment regression passed: luck comparison, nested help/back, equip feedback, 15 stat explanations, unequip, portrait without weapon overlay.');
assert.ok(view().includes('action-dock'));assert.ok(!view().includes('held-weapon'));
click('tab','map');assert.ok(view().includes('map-screen'));assert.equal(nodes.get('topbar-title').textContent,'Údolí posledního světla');assert.equal(nodes.get('statusbar').hidden,true);assert.ok(!view().includes('<svg'));assert.ok(!view().includes('⚑'));click('area',0);assert.ok(overlay().includes('Mýtná věž'));click('close');
click('currency','gold');assert.ok(overlay().includes('Zlato'));click('close');click('currency','essence');assert.ok(overlay().includes('Esence'));click('close');
click('chapter');assert.ok(overlay().includes('Král, který zakázal soumrak'));click('close');
assert.ok(css.includes('height:100dvh'));assert.ok(css.includes('env(safe-area-inset-bottom)'));assert.ok(css.includes('orientation:landscape'));
console.log('Narrative UI and mobile layout structure passed. Real browser geometry and physical-device testing are not covered.');
click('sound');assert.ok(overlay().includes('Nastavení'));assert.ok(overlay().includes('Hlasitost efektů'));assert.ok(overlay().includes('názvy míst na mapě'));for(const cue of ['block','blade','blunt','arrow','shield','heal'])assert.ok(overlay().includes('data-value="'+cue+'"'));handlers.input({target:{id:'audio-volume',value:'25'}});assert.equal(state().settings.volume,.25);click('map-labels-toggle');assert.equal(state().settings.mapLabels,false);click('map-labels-toggle');assert.equal(state().settings.mapLabels,true);click('sound-toggle');assert.ok(state().settings.sound);click('sound-preview','block');click('sound-preview','heal');click('sound-toggle');assert.equal(state().settings.sound,false);click('close');sane();

// Scene-first presentation, deterministic art mapping and contextual currency.
const sceneCss=await readFile(new URL('../mobile-scene.css',import.meta.url),'utf8');
for(const asset of ['encounter-characters.png','encounter-props.png'])await access(new URL('../assets/'+asset,import.meta.url));
assert.ok(html.includes('src="scenes.js"'));assert.ok(html.includes('data-action="menu"'));
assert.ok(!nodes.get('statusbar').innerHTML.includes('currency'));
click('tab','inventory');assert.ok(view().includes('currency gold'));assert.ok(view().includes('currency essence'));
click('shop');assert.ok(overlay().includes('currency gold'));assert.ok(!overlay().includes('currency essence'));
click('currency','gold');click('close');assert.ok(overlay().includes('Víš, co kupuješ'));click('close');
const kinds=['clash','hunt','ambush','toll','hazard','salvage','chest','respite','aid','shrine','trade','tracks','omen'];
const mapped=kinds.map(kind=>ctx.RPGScenes.encounter({kind},{area:0},null));
assert.equal(new Set(mapped.map(a=>a.sheet+':'+a.cell)).size,kinds.length,'Every generic encounter type has distinct art');
for(const entry of ctx.RPGData.encounters){const a=ctx.RPGScenes.encounter(entry,{area:entry.area||0},null);assert.ok(a.label);assert.ok(a.cell>=0&&a.cell<a.columns*a.columns);}
assert.equal(ctx.RPGScenes.encounter({},{area:0},{kind:'spirit'}).cell,4,'A ghost is not a stag');
assert.equal(ctx.RPGScenes.encounter({},{area:5},{boss:true}).cell,5,'Mountain finale depicts the king, not a stag');
assert.ok(sceneCss.includes('tower-floors-v1.png'));assert.ok(sceneCss.includes('tower-floor-2'));

const sceneGame=new ctx.RPG.Game();sceneGame.setHeroName('Vendel');sceneGame.state.storyEvents=[];sceneGame.start();sceneGame.state.storyEvents=[];
sceneGame.state.run.rooms=['patrol','scribe','boss'];sceneGame.state.run.index=0;sceneGame.state.notice=null;
storage.set('ne-ale-zabijim-v3',JSON.stringify(sceneGame.state));await boot();click('tab','road');
assert.ok(!view().includes('location-emblem'));assert.ok(!view().includes('data-action="retreat-confirm"'));
click('choice','left');assert.equal(state().run.battle.kind,'thief');assert.ok(view().includes('aria-label="Krysa s měšcem"'));
click('menu');assert.ok(overlay().includes('Ukončit výpravu'));assert.ok(overlay().includes('disabled'));
assert.equal([...timers.values()].filter(t=>t.ms>0&&t.ms<=1050).length,0,'Menu stops combat timer');
click('sound');assert.ok(overlay().includes('Nastavení'));click('close');assert.ok(overlay().includes('Menu'));click('close');
function tickCombat(){const task=[...timers.entries()].filter(([,t])=>t.ms>0&&t.ms<=1050).at(-1);assert.ok(task);timers.delete(task[0]);task[1].fn();}
tickCombat();assert.ok(view().includes('motion-player'));
if(state().run.battle){tickCombat();assert.ok(view().includes('motion-enemy'));}
let sceneTurns=0;while(state().run?.battle&&sceneTurns++<30)tickCombat();
assert.ok(state().notice);assert.ok(view().includes('aria-label="Krysa s měšcem"'),'Outcome keeps defeated foe rather than next scribe');
assert.ok(!view().includes('NÁSLEDEK TVÉ CESTY'));
assert.ok(sceneCss.includes('aspect-ratio:1'));assert.ok(sceneCss.includes('prefers-reduced-motion'));
console.log('Scene regression passed: 13 distinct archetypes, all encounter mappings, correct ghost/king, contextual wallet/back, menu pause/resume, actor-specific lunges and outcome continuity.');

const levelHero=new ctx.RPG.Game();levelHero.setHeroName('Vendel');levelHero.state.flags.chapterIntroSeen=true;levelHero.state.storyEvents=[];levelHero.xp(185);
storage.set('ne-ale-zabijim-v3',JSON.stringify(levelHero.state));await boot();
click('tab','character');assert.ok(overlay().includes('Úroveň 1 → 3'));assert.ok(overlay().includes('<b>+10</b> max. životů'));assert.ok(overlay().includes('<b>+6</b> body k rozdělení'));assert.equal((overlay().match(/data-action="growth"/g)||[]).length,6);
assert.ok(!view().includes('data-action="growth"'));assert.equal((view().match(/class="attribute-tile/g)||[]).length,6);assert.ok(view().includes('Všímavost'));assert.ok(view().includes('Dobrodruh na zkušební dobu'));assert.ok(!view().includes('screen-scroll'));
click('growth','grit');assert.equal(state().points,35);assert.equal(state().growth.grit,1);click('close');assert.equal(state().levelNotice,null);assert.equal(nodes.get('points-dot').hidden,false);
click('tab','character');assert.ok(overlay().includes('Rozděl body'));for(let i=0;i<35;i++)click('growth','might');click('close');assert.equal(nodes.get('points-dot').hidden,true);
click('character-page','equipment');assert.equal((view().match(/data-action="equipped"/g)||[]).length,8);
click('equipped','weapon');assert.match(overlay(),/Poškození \+\d+ až \+\d+</);click('close');
click('character-page','effects');assert.equal((view().match(/data-action="stat-help"/g)||[]).length,6);click('stat-page',3);assert.equal((view().match(/data-action="stat-help"/g)||[]).length,2);
const characterCss=await readFile(new URL('../character.css',import.meta.url),'utf8');assert.ok(characterCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert.equal((html.match(/class="nav-art"/g)||[]).length,4);assert.ok(!html.includes('class="nav-icon"'));assert.ok(!html.includes('<span>⌘</span>'));sane();
console.log('Level-up and character UI passed: six attributes, three points per level, modal-only allocation, dismissal without losing points, compact pages and four illustrated navigation tiles.');

click('tab','inventory');assert.equal((view().match(/class="bag-slot/g)||[]).length,20);assert.equal((view().match(/data-action="equipped"/g)||[]).length,8);
assert.ok(!/Každý kus má příběh|Kapsy mají místo|ŠLECHTĚNÍ VÝBAVY/.test(view()));
click('forge');assert.ok(overlay().includes('Kovárna'));assert.ok(!overlay().includes('currency gold'));click('close');
click('character-page','effects');click('tab','character');assert.ok(!view().includes('<em>'));click('stat-help','armor');assert.ok(overlay().includes('ZÁKLAD + NASAZENÁ VÝBAVA'));click('close');
click('equipped','body');assert.ok(!/Zbroj \+\d+[,.]\d/.test(overlay()));click('close');

const unnamed=new ctx.RPG.Game();unnamed.state.flags.chapterIntroSeen=true;unnamed.start();unnamed.state.storyEvents=[];unnamed.state.notice=null;unnamed.fight('guard');
storage.set('ne-ale-zabijim-v3',JSON.stringify(unnamed.state));await boot();
assert.ok(overlay().includes('Jak se jmenuješ?'));assert.ok(overlay().includes('value="Roman"'));const savedRun=JSON.stringify(state().run),savedGold=state().gold;
click('start');assert.equal(JSON.stringify(state().run),savedRun);
handlers.input({target:{id:'hero-name',value:'<img onerror=alert(1)>'}});click('name-confirm');assert.equal(state().heroName,'');assert.ok(overlay().includes('Jak se jmenuješ?'));
handlers.input({target:{id:'hero-name',value:"Žan O'Neil"}});handlers.visibilitychange();assert.ok(overlay().includes('Žan O&#39;Neil'));
handlers.keydown({key:'Enter',target:{id:'hero-name'},preventDefault(){}});assert.equal(state().heroName,"Žan O'Neil");assert.equal(JSON.stringify(state().run),savedRun);assert.equal(state().gold,savedGold);
click('tab','road');assert.ok(nodes.get('statusbar').innerHTML.includes('Žan O&#39;Neil'));assert.ok(!view().includes('Šmik'));assert.ok([...timers.values()].some(t=>t.ms>0&&t.ms<=1050));
await boot();assert.ok(!overlay().includes('Jak se jmenuješ?'));assert.equal(state().heroName,"Žan O'Neil");
console.log('Intro/inventory regressions passed: 20 slots, equipped row, concise copy, total-only stats, integer armor, name validation/escaping, preserved save and resumed combat.');

// Real front-door flow: no gameplay or save mutation until a position is selected.
timers.clear();vm.runInContext(scripts.at(-1),ctx);await settle();
const title=()=>nodes.get('title-screen').innerHTML;
assert.equal(nodes.get('game').hidden,true);assert.ok(title().includes('title-skip'));
assert.ok(![...timers.values()].some(t=>t.ms>0&&t.ms<=1050),'No combat on splash');
const splash=[...timers.values()].find(t=>t.ms===1600);assert.ok(splash);splash.fn();
assert.ok(title().includes('New Game'));assert.ok(title().includes('Load Game'));assert.ok(title().includes('Settings'));
click('title-settings');assert.ok(overlay().includes('Hlasitost'));click('sound-toggle');click('close');assert.ok(nodes.get('overlay').hidden);
click('title-list');await settle();assert.ok(title().includes('Původní rozehraná hra'));
click('title-load','legacy');await settle();assert.equal(nodes.get('game').hidden,false);
click('menu');click('save-menu');click('save-slot','1');await settle();assert.ok(cloud.some(r=>r.slot==='1'));
const checkpoint=structuredClone(cloud.find(r=>r.slot==='1').state);
click('save-menu');click('save-slot','1');assert.ok(overlay().includes('Přepsat pozici 1'));click('save-menu');assert.equal(cloud.find(r=>r.slot==='1').revision,1);
click('menu');click('main-menu');await settle();assert.equal(nodes.get('game').hidden,true);assert.ok(cloud.some(r=>r.slot==='auto'));
click('title-new');assert.ok(title().includes('Vyber hrdinu'));assert.ok(title().includes('Sorsha'));click('title-back');assert.equal(cloud.find(r=>r.slot==='1').state.heroName,checkpoint.heroName);
click('title-new');click('title-hero','female');await settle();assert.ok(overlay().includes('Jak se jmenuješ?'));assert.ok(overlay().includes('value="Sorsha"'));
handlers.input({target:{id:'hero-name',value:'Radovan'}});click('name-confirm');dismissStories();
click('menu');click('main-menu');await settle();click('title-list');await settle();click('title-load','1');await settle();
assert.equal(state().heroName,checkpoint.heroName);assert.equal(state().gold,checkpoint.gold);assert.deepEqual(state().run,checkpoint.run);
console.log('Title/save journey passed: timed splash, paused menu, settings, manual overwrite confirmation, new game and exact saved expedition restore.');
