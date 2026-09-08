import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const scripts=await Promise.all(['data.js','story.js','engine.js','game.js'].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')));
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
assert.ok(view().includes('Písař za mřížemi'));click('choice','left');click('continue');sane();
click('tab','map');assert.ok(view().includes('Výprava čeká'));
const savedIndex=state().run.index;click('start');assert.equal(state().run.index,savedIndex);
click('tab','road');
let steps=0;
while(state().run&&steps++<400){
 const s=state();
 if(s.pending.length){
  if(s.pending[0].type==='chest')click('chest');else click('loot','take');
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
assert.ok(steps<400);assert.ok(state().lastReport?.win);assert.equal(state().pending[0].type,'item');
assert.ok(overlay().includes('NOVÝ NÁLEZ'));click('loot','take');click('tab','inventory');sane();
dismissStories();
const item=state().inventory[0];click('item',item.id);assert.ok(overlay().includes('Detail předmětu'));click('close');
click('journal');assert.ok(overlay().includes('Kronika'));click('close');
assert.ok(css.includes('[hidden]{display:none!important}'));assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(html.includes('viewport-fit=cover'));assert.ok(html.includes('aria-modal="true"'));
console.log('UI integration passed: initial render, four tabs, modal focus/inert state, shop/potions, branching expedition, saved resume, timed combat, tactical boss, loot and inventory. No real-browser layout or physical-device claim.');
const seeded=new ctx.RPG.Game();seeded.state.growth.luck=2;const lucky=seeded.item('ring','rare',1,[['luck',3]]);seeded.state.inventory.push(lucky);
storage.set('ne-ale-zabijim-v3',JSON.stringify(seeded.state));vm.runInContext(scripts[3],ctx);dismissStories();const loadedLuckyId=state().inventory[0].id;
click('tab','inventory');click('item',loadedLuckyId);assert.ok(overlay().includes('Prsten štěstí'));assert.ok(overlay().includes('ZMĚNA PO NASAZENÍ'));
assert.ok(overlay().includes('2 → 5'));click('stat-help','luck');assert.ok(overlay().includes('nikoli přímá šance'));click('close');assert.ok(overlay().includes('Detail předmětu'));
click('equip',loadedLuckyId);assert.ok(nodes.get('toast').textContent.includes('Štěstí 2 → 5'));click('tab','character');assert.ok(view().includes('2 <em>+ 3</em> = <b>5'));
for(const key of ['damageMin','damageMax','maxHp','armor','crit','evasion','block','thorns','absorb','haste','luck','gold','xpBonus','leech','shieldCap']){
 click('stat-help',key);assert.ok(overlay().includes('ZÁKLAD + NASAZENÁ VÝBAVA'));sane();click('close');
}
click('stat-help','luck');assert.ok(overlay().includes('Prsten štěstí'));click('close');
click('equipped','ring');click('unequip','ring');assert.ok(view().includes('2 <em>+ 0</em> = <b>2'));click('tab','map');click('start');assert.ok(!view().includes('held-weapon'));
console.log('UI equipment regression passed: luck comparison, nested help/back, equip feedback, 15 stat explanations, unequip, portrait without weapon overlay.');
assert.ok(view().includes('action-dock'));assert.ok(!view().includes('held-weapon'));
click('tab','map');assert.ok(view().includes('map-screen'));click('location');assert.ok(overlay().includes('Mýtná věž'));click('close');
click('currency','gold');assert.ok(overlay().includes('Zlato'));click('close');click('currency','essence');assert.ok(overlay().includes('Esence'));click('close');
click('chapter');assert.ok(overlay().includes('Král, který zakázal soumrak'));click('close');
assert.ok(css.includes('height:100dvh'));assert.ok(css.includes('env(safe-area-inset-bottom)'));assert.ok(css.includes('orientation:landscape'));
console.log('Narrative UI and mobile layout structure passed. Real browser geometry and physical-device testing are not covered.');
