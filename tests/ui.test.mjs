import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(html.includes('<title>Quest Happens · Výpravy Sira Šmika</title>'));
assert.ok(html.includes('<h1>Quest Happens</h1>'));assert.ok(html.includes('lang="cs"'));
const scripts=await Promise.all(['data.js','encounters.js','story.js','engine.js','audio.js','scenes.js','game.js'].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')));
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
for(const asset of ['overworld-v3.webp','characters-v3.webp','environments-v3.webp','sir-smik.webp','equipment-atlas-v1.webp','equipment-atlas-v2.webp','equipment-atlas-v3.webp'])await access(new URL('../assets/'+asset,import.meta.url));
const handlers={},nodes=new Map(),storage=new Map(),timers=new Map();let seq=0;
const node=id=>({id,dataset:{},innerHTML:'',textContent:'',hidden:id==='overlay',style:{},disabled:false,inert:false,
 classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){document.activeElement=this},querySelector(){return null},querySelectorAll(){return[]},matches(){return false}});
const nav=['map','road','character','inventory'].map(value=>Object.assign(node('nav-'+value),{dataset:{value}}));
const document={hidden:false,activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);},
 querySelectorAll(selector){return selector==='.bottom-tabs button'?nav:[];},addEventListener(name,cb){handlers[name]=cb;}};
const window={addEventListener(){}};
const ctx=vm.createContext({console,document,window,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)}});
for(const source of scripts)vm.runInContext(source,ctx);
assert.equal(ctx.RPGData.rarities.map(r=>r.label).join(','),'Common,Uncommon,Rare,Epic,Legendary,Mythic');
// UI journey uses a durable character; starter difficulty is measured separately.
const uiHero=new ctx.RPG.Game();uiHero.state.growth.might=12;uiHero.state.growth.grit=12;uiHero.rest();
storage.set('ne-ale-zabijim-v3',JSON.stringify(uiHero.state));vm.runInContext(scripts.at(-1),ctx);
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
click('tab','map');assert.ok(view().includes('Výprava čeká'));
const savedIndex=state().run.index;click('start');assert.equal(state().run.index,savedIndex);
click('tab','road');
let steps=0;
while(state().run&&steps++<4000){
 const s=state();
 if(s.pending.length){
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
assert.ok(html.includes('viewport-fit=cover'));assert.ok(html.includes('aria-modal="true"'));
console.log('UI integration passed: initial render, four tabs, modal focus/inert state, shop/potions, branching expedition, saved resume, timed combat, tactical boss, loot and inventory. No real-browser layout or physical-device claim.');
const seeded=new ctx.RPG.Game();seeded.state.growth.luck=2;const lucky=seeded.item('ring','rare',1,[['luck',3]]);seeded.state.inventory.push(lucky);
storage.set('ne-ale-zabijim-v3',JSON.stringify(seeded.state));vm.runInContext(scripts.at(-1),ctx);dismissStories();const loadedLuckyId=state().inventory[0].id;
click('tab','inventory');click('item',loadedLuckyId);assert.ok(overlay().includes('Prsten štěstí'));assert.ok(overlay().includes('ZMĚNA PO NASAZENÍ'));
assert.ok(overlay().includes('2 → 5'));click('stat-help','luck');assert.ok(overlay().includes('nikoli přímá šance'));click('close');assert.ok(overlay().includes('Detail předmětu'));
click('equip',loadedLuckyId);assert.ok(nodes.get('toast').textContent.includes('Štěstí 2 → 5'));click('tab','character');assert.ok(view().includes('2 <em>+3</em>'));assert.ok(!view().includes('data-action="growth"'));
for(const key of ['damageMin','damageMax','maxHp','armor','crit','evasion','block','thorns','absorb','haste','luck','gold','xpBonus','leech','shieldCap']){
 click('stat-help',key);assert.ok(overlay().includes('ZÁKLAD + NASAZENÁ VÝBAVA'));sane();click('close');
}
click('stat-help','luck');assert.ok(overlay().includes('Prsten štěstí'));click('close');
click('equipped','ring');click('unequip','ring');assert.ok(view().includes('<strong>Štěstí</strong><span>2</span>'));click('tab','map');click('start');assert.ok(!view().includes('held-weapon'));
console.log('UI equipment regression passed: luck comparison, nested help/back, equip feedback, 15 stat explanations, unequip, portrait without weapon overlay.');
assert.ok(view().includes('action-dock'));assert.ok(!view().includes('held-weapon'));
click('tab','map');assert.ok(view().includes('map-screen'));click('location');assert.ok(overlay().includes('Mýtná věž'));click('close');
click('currency','gold');assert.ok(overlay().includes('Zlato'));click('close');click('currency','essence');assert.ok(overlay().includes('Esence'));click('close');
click('chapter');assert.ok(overlay().includes('Král, který zakázal soumrak'));click('close');
assert.ok(css.includes('height:100dvh'));assert.ok(css.includes('env(safe-area-inset-bottom)'));assert.ok(css.includes('orientation:landscape'));
console.log('Narrative UI and mobile layout structure passed. Real browser geometry and physical-device testing are not covered.');
click('sound');assert.ok(overlay().includes('Zvuk hry'));assert.ok(overlay().includes('Hlasitost efektů'));for(const cue of ['block','blade','blunt','arrow','shield','heal'])assert.ok(overlay().includes('data-value="'+cue+'"'));handlers.input({target:{id:'audio-volume',value:'25'}});assert.equal(state().settings.volume,.25);click('sound-toggle');assert.ok(state().settings.sound);click('sound-preview','block');click('sound-preview','heal');click('sound-toggle');assert.equal(state().settings.sound,false);click('close');sane();

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
assert.equal(ctx.RPGScenes.encounter({},{area:4},{boss:true}).cell,5,'Mountain finale depicts the king, not a stag');

const sceneGame=new ctx.RPG.Game();sceneGame.state.storyEvents=[];sceneGame.start();sceneGame.state.storyEvents=[];
sceneGame.state.run.rooms=['patrol','scribe','boss'];sceneGame.state.run.index=0;sceneGame.state.notice=null;
storage.set('ne-ale-zabijim-v3',JSON.stringify(sceneGame.state));vm.runInContext(scripts.at(-1),ctx);click('tab','road');
assert.ok(!view().includes('location-emblem'));assert.ok(!view().includes('data-action="retreat-confirm"'));
click('choice','left');assert.equal(state().run.battle.kind,'thief');assert.ok(view().includes('aria-label="Krysa s měšcem"'));
click('menu');assert.ok(overlay().includes('Ukončit výpravu'));assert.ok(overlay().includes('disabled'));
assert.equal([...timers.values()].filter(t=>t.ms>0&&t.ms<=1050).length,0,'Menu stops combat timer');
click('sound');assert.ok(overlay().includes('Zvuk hry'));click('close');assert.ok(overlay().includes('Menu'));click('close');
function tickCombat(){const task=[...timers.entries()].filter(([,t])=>t.ms>0&&t.ms<=1050).at(-1);assert.ok(task);timers.delete(task[0]);task[1].fn();}
tickCombat();assert.ok(view().includes('motion-player'));
if(state().run.battle){tickCombat();assert.ok(view().includes('motion-enemy'));}
let sceneTurns=0;while(state().run?.battle&&sceneTurns++<30)tickCombat();
assert.ok(state().notice);assert.ok(view().includes('aria-label="Krysa s měšcem"'),'Outcome keeps defeated foe rather than next scribe');
assert.ok(!view().includes('NÁSLEDEK TVÉ CESTY'));
assert.ok(sceneCss.includes('aspect-ratio:1'));assert.ok(sceneCss.includes('prefers-reduced-motion'));
console.log('Scene regression passed: 13 distinct archetypes, all encounter mappings, correct ghost/king, contextual wallet/back, menu pause/resume, actor-specific lunges and outcome continuity.');

const levelHero=new ctx.RPG.Game();levelHero.state.flags.chapterIntroSeen=true;levelHero.state.storyEvents=[];levelHero.xp(142);
storage.set('ne-ale-zabijim-v3',JSON.stringify(levelHero.state));vm.runInContext(scripts.at(-1),ctx);
click('tab','character');assert.ok(overlay().includes('Úroveň 1 → 3'));assert.ok(overlay().includes('<b>+10</b> max. životů'));assert.equal((overlay().match(/data-action="growth"/g)||[]).length,5);
assert.ok(!view().includes('data-action="growth"'));assert.ok(view().includes('Dobrodruh na zkušební dobu'));assert.ok(!view().includes('screen-scroll'));
click('growth','grit');assert.equal(state().points,1);assert.equal(state().growth.grit,1);click('close');assert.equal(state().levelNotice,null);assert.equal(nodes.get('points-dot').hidden,false);
click('tab','character');assert.ok(overlay().includes('Rozděl body'));click('growth','might');click('close');assert.equal(nodes.get('points-dot').hidden,true);
click('character-page','equipment');assert.equal((view().match(/data-action="equipped"/g)||[]).length,8);
click('equipped','weapon');assert.match(overlay(),/Poškození \+\d+ až \+\d+</);click('close');
click('character-page','effects');assert.equal((view().match(/data-action="stat-help"/g)||[]).length,6);click('stat-page',2);assert.equal((view().match(/data-action="stat-help"/g)||[]).length,3);
const characterCss=await readFile(new URL('../character.css',import.meta.url),'utf8');assert.ok(characterCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert.equal((html.match(/class="nav-icon"/g)||[]).length,4);assert.ok(!html.includes('<span>⌘</span>'));sane();
console.log('Level-up and character UI passed: persisted multi-level rewards, training-only allocation, dismissal without losing points, compact pages, integer item damage and four SVG navigation icons.');
