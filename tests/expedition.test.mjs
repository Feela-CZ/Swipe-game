import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx=vm.createContext({console});
for(const file of ['data.js','encounters.js','story.js','engine.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),ctx);
const {Game}=ctx.RPG,D=ctx.RPGData;
const rng=seed=>{let n=seed>>>0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;}};
const make=seed=>new Game(null,rng(seed));
const plain=x=>JSON.parse(JSON.stringify(x));
assert.equal(D.encounters.length,113);assert.equal(new Set(D.encounters.map(x=>x.id)).size,113);
for(const e of D.encounters){assert.equal(e.choices.length,2);assert.ok(e.title&&e.text&&e.kind);}
const routes=new Set(),scribes=new Set();
for(let area=0;area<D.areas.length;area++)for(let seed=1;seed<=60;seed++){
 const g=make(seed*7919);g.state.unlocked=D.areas.length;g.start(area);const r=g.state.run,ids=r.rooms;
 assert.equal(ids.length,D.expeditionLengths[area]);assert.ok(ids.length>=50&&ids.length<=100);
 assert.equal(ids.at(-1),'boss');assert.equal(ids.at(-2),'camp');assert.equal(ids.filter(x=>x==='boss').length,1);
 assert.ok(ids.indexOf('wounded')<ids.indexOf('supplies'));assert.ok(ids.indexOf('supplies')<ids.indexOf('camp'));
 if(area===0){
  assert.ok(ids.indexOf('manifest')<ids.indexOf('scribe'));assert.ok(ids.indexOf('scribe')<ids.indexOf('lift'));assert.ok(ids.indexOf('lift')<ids.indexOf('checkpoint'));assert.ok(ids.indexOf('checkpoint')<ids.indexOf('bell'));
  scribes.add(ids.indexOf('scribe'));assert.equal(new Set(ids).size,ids.length);
 }
 for(let i=0;i<ids.length;i++){const e=D.encounterById[ids[i]];if(e){assert.ok(e.area===undefined||e.area===area);if(e.kind==='aid')assert.ok(i<ids.indexOf('supplies'));assert.ok(!ids.slice(Math.max(0,i-12),i).includes(ids[i]));}}
 const state=JSON.stringify(g.state);g.room();g.room();assert.equal(JSON.stringify(g.state),state,'rendering cannot reroll');
 const saved=new Game(plain(g.state),rng(99));assert.deepEqual(plain(saved.state.run),plain(r));routes.add(ids.join(','));
}
assert.equal(routes.size,360);assert.ok(scribes.size>5);
// Older seven-room saves finish as originally drawn, without injecting new rooms.
const legacy=make(99);legacy.start();delete legacy.state.run.routeVersion;delete legacy.state.run.pressure;legacy.state.run.rooms=['gate','scribe','well','bell','patrol','camp','boss'];legacy.state.run.index=3;
const restored=new Game(plain(legacy.state));assert.equal(restored.state.run.rooms.length,7);assert.equal(restored.room().id,'bell');
// Every authored event resolves both choices, including full pockets and empty purses.
for(const e of D.encounters)for(const left of [true,false]){
 const g=make(512);g.state.unlocked=D.areas.length;g.start(e.area??0);g.state.run.rooms=[e.id,'boss'];g.state.gold=left?100:0;g.state.hp=100;
 assert.ok(g.choose(left?'left':'right'),e.id);assert.ok(g.state.run.battle||g.state.run.index===1,e.id+' resolves');assert.ok(g.state.hp>0);
}
const store=make(77);store.start();store.state.gold=100;assert.equal(store.buyPotion(),false);assert.equal(store.buy(0),false);assert.equal(store.rest(),false);
const supply=make(12);supply.start();supply.state.run.rooms=['event-aid-0','supplies','boss'];supply.state.gold=8;supply.state.hp=40;supply.choose('left');supply.state.notice=null;supply.choose('left');assert.ok(supply.state.hp>40);assert.equal(supply.state.gold,0);
export function decision(g,reckless=false){
 const id=g.room().id,e=D.encounterById[id],s=g.state;
 if(id==='boss')return 'right';
 if(reckless)return e?.kind==='toll'?'right':e?.kind==='omen'?'right':e?.kind==='respite'?'right':id==='bell'?'right':'left';
 if(e)return ({clash:'left',hunt:'right',ambush:'right',toll:s.gold>=27?'left':'right',hazard:'left',salvage:'right',chest:'right',respite:'left',aid:'right',shrine:'left',trade:s.potions<2?'left':'right',tracks:'right',omen:'left'})[e.kind];
 return id==='well'?'right':'left';
}
export function simulate(seed,{tired=false,reckless=false,gear=false}={}){
 const g=make(seed);if(gear){g.state.equipped.weapon=g.item('sword','uncommon',1,[['damage',3]]);g.state.equipped.offhand=g.item('shield','common',1,[['armor',2]]);}
 g.rest();if(tired)g.state.hp=Math.round(g.stats().maxHp*.5);g.start();let steps=0,combats=0,loot=0,last=0;
 while(g.state.run&&steps++<4000){
  while(g.state.pending.length){if(g.state.pending[0].type==='chest')g.openChest();else{loot++;g.loot('take');}}
  g.state.notice=null;if(!g.state.run)break;last=g.state.run.index;
  if(!g.state.run.battle)while(g.state.points)g.spend('might');
  const b=g.state.run.battle;
  if(b){if(!reckless&&g.state.hp<g.stats().maxHp*.38)g.potion();if(b.tactic)g.tactic(reckless?'right':'left');else g.step();}
  else {g.choose(decision(g,reckless));if(g.state.run?.battle)combats++;}
 }
 assert.ok(steps<4000,'run terminated');return{win:!!g.state.lastReport?.win,steps,combats,loot,last};
}
const count=Number(process.env.EXPEDITION_SAMPLES||300),results={};
for(const [name,options]of Object.entries({rested:{},tired:{tired:true},reckless:{reckless:true},equipped:{gear:true}})){
 let wins=0,steps=0,battles=0,loot=0;
 for(let n=1;n<=count;n++){const r=simulate((n+Number(process.env.EXPEDITION_OFFSET||0))*7919,options);wins+=r.win;steps+=r.steps;battles+=r.combats;loot+=r.loot;}
 results[name]=wins/count;console.log(name+': '+wins+'/'+count+' wins; '+(steps/count).toFixed(1)+' steps; '+(battles/count).toFixed(1)+' combats; '+(loot/count).toFixed(1)+' non-boss items');
}
// Calibration assertions are set against a held, explicit policy, not human win rates.
if(!process.env.CALIBRATE){assert.ok(results.rested>=.5&&results.rested<=.7,'starter target ~60%');assert.ok(results.tired<results.rested-.08);assert.ok(results.reckless<results.rested-.08);assert.ok(results.equipped>results.rested+.1);}
console.log('113 authored encounters, 360 route structures, contextual pools, ordering, stable saves, both choices, shop restrictions and delayed help verified.');
