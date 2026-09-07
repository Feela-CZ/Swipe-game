import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx=vm.createContext({console});
for(const file of ['data.js','engine.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),ctx);
const {Game}=ctx.RPG,D=ctx.RPGData;
const seedRng=start=>{let n=start>>>0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296}};
const fresh=(seed=123)=>new Game(null,seedRng(seed));
const plain=v=>JSON.parse(JSON.stringify(v));
let passed=0;
function test(label,body){body();passed++;console.log('PASS '+label);}
function resolvePending(g,equip=false){
 while(g.state.pending.length){
  const p=g.state.pending[0];
  if(p.previewOnly){g.state.pending.shift();continue;}
  if(p.type==='chest'){g.openChest();continue;}
  const d=D.itemById[p.item.kind],old=g.state.equipped[d.slot];
  if(equip&&(!old||g.basePower(p.item)>g.basePower(old)))g.loot('equip');
  else g.loot(g.state.inventory.length<g.state.capacity?'take':'sell');
 }
 g.state.notice=null;
}
function complete(g,{choices={},tactic='left',equip=false,spend=false}={}){
 let actions=0,tactics=0;
 while(g.state.run&&actions++<700){
  resolvePending(g,equip);
  if(spend&&!g.state.run.battle)while(g.state.points)g.spend('might');
  const b=g.state.run.battle;
  if(b){if(b.tactic){g.tactic(tactic);tactics++;}else g.step();}
  else g.choose(choices[g.room().id]||(g.room().id==='boss'?'right':'left'));
  assert.ok(Number.isFinite(g.state.hp));
  assert.ok(g.state.gold>=0&&g.state.essence>=0);
 }
 assert.ok(actions<700,'Expedition must terminate');
 resolvePending(g,equip);
 return {win:g.state.lastReport?.win,actions,tactics};
}
test('48 legacy item kinds populate eight equipment slots',()=>{
 assert.equal(D.itemKinds.length,48);
 for(const d of D.itemKinds)assert.ok(D.slots[d.slot]);
 assert.equal(Object.keys(fresh().state.equipped).length,8);
});
test('damage genes affect actual attacks and haste affects player timing',()=>{
 const g=fresh();g.state.equipped={weapon:g.item('sword','common',1,[['damage',1]])};
 const min=g.stats().damageMin;g.state.equipped.weapon.affixes[0].value=11;assert.equal(g.stats().damageMin,min+10);
 const delay=g.attackDelay();g.state.equipped.weapon.affixes=[{id:'haste',value:60}];assert.ok(g.attackDelay()<delay);
});
test('legacy save migration preserves points, items, currencies, outstanding loot',()=>{
 const raw={level:8,gold:543,essence:72,potions:4,statPoints:2,growth:{might:2,grit:3,guile:4,learning:5},
  inventory:[{kind:'boots',rank:2,rarity:'epic',affixes:[{id:'evasion',value:4}]},null],
  equipped:{armor:{kind:'helm',rank:1,rarity:'common',affixes:[{id:'armor',value:3}]}},
  pendingLoot:{item:{kind:'orb',rank:1,rarity:'rare',affixes:[{id:'crit',value:4}]}},
  map:{completed:['toll-tower'],unlocked:['toll-tower','whisperwood']}};
 const g=new Game(raw,seedRng(4));assert.equal(g.state.growth.agility,4);assert.equal(g.state.growth.intelligence,5);
 assert.equal(g.state.growth.luck,0);assert.equal(g.state.gold,543);assert.equal(g.state.points,2);
 assert.equal(g.state.inventory.length,1);assert.equal(g.state.equipped.head.kind,'helm');assert.equal(g.state.pending[0].item.kind,'orb');
 assert.equal(g.state.unlocked,2);assert.ok(Number.isFinite(g.stats().damageMax));
});
test('ring choice grants a real ring; returning it grants protection',()=>{
 for(const side of ['left','right']){
  const g=fresh();g.start();g.state.run.rooms=['well','boss'];g.choose(side);
  if(side==='left')assert.equal(g.state.pending[0].item.kind,'ring');
  else assert.equal(g.state.run.flags.blessed,true);
 }
});
test('scribe, key and bell create different persistent consequences',()=>{
 const helper=fresh();helper.start();helper.state.run.rooms=['scribe','bell','boss'];helper.choose('left');helper.state.notice=null;const hp=helper.state.hp;helper.choose('left');
 assert.equal(helper.state.run.flags.silent,true);assert.equal(helper.state.hp,hp);assert.equal(helper.state.flags.scribeFriend,true);
 const thief=fresh();thief.start();thief.state.run.rooms=['scribe','bell','boss'];thief.choose('right');thief.state.notice=null;thief.choose('right');
 assert.equal(thief.state.pending[0].tier,1);assert.ok(!thief.state.run.flags.silent);
});
test('save/load retains exact expedition, tactics and suspended room',()=>{
 const g=fresh();g.start();g.state.run.index=6;g.fight('boss',true);g.step();assert.ok(g.state.run.battle.tactic);
 const loaded=new Game(plain(g.state),seedRng(9));assert.deepEqual(plain(loaded.state.run),plain(g.state.run));
 assert.equal(loaded.start(0),false);assert.equal(loaded.step(),false);assert.ok(loaded.tactic('left'));
});
test('no battle can start through choices without an expedition',()=>{
 const g=fresh();assert.equal(g.choose('right'),false);assert.equal(g.step(),false);assert.equal(g.tactic('left'),false);
 assert.equal(g.start(4),false);
});
test('battle locks equipment, training, forge and duplicate start',()=>{
 const g=fresh();const it=g.item('sword');g.state.inventory.push(it);g.state.points=2;g.start();g.fight('guard');
 assert.equal(g.equip(it.id),false);assert.equal(g.spend('might'),false);assert.equal(g.start(0),false);assert.equal(g.unequip('body'),false);
});
test('merge preview is pure; promotion increases real damage and keeps base genes',()=>{
 const g=fresh();g.state.essence=100;
 const a=g.item('sword','epic',5,[['damage',16],['crit',8],['leech',4]]),b=g.item('sword','epic',5,[['damage',20],['crit',9],['leech',7]]);
 a.rank=b.rank=3;g.state.inventory=[a,b];const snapshot=JSON.stringify(g.state);
 const p=g.mergePreview(a.id,b.id);assert.equal(JSON.stringify(g.state),snapshot);assert.equal(p.item.rarity,'legendary');
 const before=g.stats({weapon:a}).damageMax,after=g.stats({weapon:p.item}).damageMax;assert.ok(after>before);
 const out=g.merge(a.id,b.id);assert.ok(out);assert.equal(g.state.inventory.length,1);assert.ok(out.affixes.every((x,i)=>x.value>=p.item.affixes[i].value));
 assert.equal(g.merge(out.id,out.id),false);
});
test('mismatched slot cannot merge; low donor cannot degrade inherited genes',()=>{
 const g=fresh();const a=g.signature('dagger',8),b=g.item('broom','common',1,[['damage',1]]),c=g.item('helm');g.state.inventory=[a,b,c];
 assert.equal(g.mergePreview(a.id,c.id),null);const p=g.mergePreview(a.id,b.id);assert.ok(g.basePower(p.item)>g.basePower(a));
 assert.equal(p.item.trait,'riposte');for(const x of a.affixes)assert.ok(p.item.affixes.find(y=>y.id===x.id).value>=x.value);
});
test('rarity distribution improves with luck, without common becoming mythic by offset',()=>{
 function sample(luck){const g=fresh(44);g.state.equipped={};g.state.growth.luck=luck;let total=0,rare=0;
  for(let i=0;i<20000;i++){const tier=D.rarityIndex(g.rarity('enemy',0,0));total+=tier;if(tier>=2)rare++;}
  return {total,rare,drop:g.dropChance(),gold:g.gold(100)};
 }
 const low=sample(0),high=sample(50);assert.ok(high.total>low.total&&high.rare>low.rare);assert.ok(high.drop>low.drop);assert.ok(high.gold>low.gold);
});
test('chest item chance respects luck and boss rewards scale by area/challenge',()=>{
 const g=fresh();g.state.selectedArea=3;g.state.selectedChallenge=2;g.start(0);g.state.run.area=3;g.state.run.challenge=2;
 assert.equal(g.drop('boss').ilvl,D.areas[3].level+4);
 g.chest(2,'test');g.openChest();assert.equal(g.state.pending[0].type,'item');
});
test('shop price is exact and visible goods are guaranteed',()=>{
 const g=fresh();g.state.gold=1000;g.state.unlocked=5;g.state.selectedArea=2;const row=g.shopList()[2],before=g.state.gold;
 assert.ok(g.buy(2));assert.equal(before-g.state.gold,row.price);assert.equal(g.state.pending[0].item.kind,row.kind);
 assert.equal(g.state.pending[0].item.rarity,row.rarity);
});
test('full inventory never loses pending loot; sale frees space',()=>{
 const g=fresh();for(let i=0;i<24;i++)g.state.inventory.push(g.item('sword'));g.state.pending=[{type:'item',item:g.item('ring')}];
 assert.equal(g.loot('take'),false);assert.equal(g.state.pending.length,1);g.sell(g.state.inventory[0].id);assert.ok(g.loot('take'));assert.equal(g.state.inventory.length,24);
});
test('targeted recipe deducts exact materials and has a defined signature',()=>{
 const g=fresh();g.state.records[0].marks=4;g.state.essence=10;assert.ok(g.craft(0));
 assert.equal(g.state.records[0].marks,0);assert.equal(g.state.essence,0);assert.equal(g.state.pending[0].item.trait,'overflow');assert.equal(g.craft(0),false);
});
test('all four signatures activate their advertised combat effect',()=>{
 const g=fresh();g.start();g.state.equipped={weapon:g.signature('dagger')};g.fight('guard');g.state.run.battle.hp=10000;g.state.run.battle.maxHp=10000;g.state.run.riposte=true;g.step();
 assert.ok(g.state.run.battle.log.some(x=>x.text.includes('Druhý dech')));
 g.state.equipped={offhand:g.signature('shield')};g.state.run.battle.turn='player';g.state.run.revenge=true;g.step();assert.ok(g.state.run.battle.log.some(x=>x.text.includes('Ježčí odveta')));
 g.state.equipped={weapon:g.signature('axe')};g.state.run.battle.turn='player';g.state.run.battle.hp=100;g.step();assert.ok(g.state.run.battle.log.some(x=>x.text.includes('Poslední slovo')));
 g.state.equipped={relic:g.signature('amulet')};g.state.hp=g.stats().maxHp;g.heal(15,true);assert.equal(g.state.run.shield,15);
});
test('boss scripts remain binary, pause clocks, then resolve in every area',()=>{
 for(let area=0;area<5;area++){
  const g=fresh(5+area);g.state.unlocked=5;g.start(area,0);g.state.hp=10000;g.state.run.index=6;g.fight('boss',true);g.step();
  assert.equal(g.state.run.battle.tactic.choices.length,2);const hp=g.state.run.battle.hp;g.step();assert.equal(g.state.run.battle.hp,hp);g.tactic('left');
  assert.equal(g.state.run.battle.tactic,null);
 }
});
test('region bosses use distinct mechanics affected by preparation',()=>{
 const bell=fresh();bell.start();bell.fight('boss',true);bell.state.run.battle.turn='enemy';bell.random=()=>.99;bell.enemy();assert.ok(bell.state.run.battle.log.some(x=>x.text.includes('Zvon přivolal')));
 const roots=fresh();roots.state.unlocked=2;roots.start(1);roots.fight('boss',true);roots.state.run.battle.hp-=20;roots.state.run.battle.round=2;roots.random=()=>.99;roots.enemy();assert.ok(roots.state.run.battle.log.some(x=>x.text.includes('Kořeny vrátily')));
 const shell=fresh();shell.state.unlocked=3;shell.state.growth.might=30;shell.start(2);shell.fight('boss',true);shell.step();shell.tactic('right');assert.ok(shell.state.run.battle.shellBroken);
});
test('preview-only loot cannot duplicate a merged item',()=>{
 const g=fresh();g.state.pending=[{type:'item',item:g.item('sword'),previewOnly:true}];assert.equal(g.loot('take'),false);assert.equal(g.state.inventory.length,0);
});
test('death preserves banked possessions and resets the run safely',()=>{
 const g=fresh();g.start();g.state.gold=100;g.state.potions=0;g.state.run.gold=20;g.fight('boss',true);g.state.hp=1;g.receive(999);g.lose();
 assert.equal(g.state.gold,97);assert.equal(g.state.run,null);assert.ok(g.state.hp>0);assert.equal(g.state.lastReport.win,false);
});
test('five regions plus repeatable challenge progression are completable with appropriate equipment',()=>{
 const g=fresh(88);
 for(let area=0;area<5;area++){
  g.state.unlocked=Math.max(g.state.unlocked,area+1);g.state.growth={might:area*5,grit:area*4,agility:area*3,intelligence:2,luck:2};
  for(const kind of ['sword','helm','mail','boots','gauntlets','shield','ring','amulet'])g.state.equipped[D.itemById[kind].slot]=g.item(kind,'rare',1+area*2,[['damage',2],['armor',4],['vitality',5]]);
  g.state.potions=4;g.rest();assert.ok(g.start(area));const result=complete(g,{equip:true,spend:true});assert.ok(result.win,'region '+area);assert.equal(g.state.records[area].marks,2);
 }
 assert.ok(g.start(4,1));assert.equal(g.state.run.challenge,1);
});
let victories=0,totalActions=0,totalTactics=0;
for(let n=1;n<=300;n++){
 const g=fresh(n*7919);g.start(0);const result=complete(g,{equip:true,spend:true});
 victories+=result.win?1:0;totalActions+=result.actions;totalTactics+=result.tactics;
}
console.log('Actual engine first-tower simulation: '+victories+'/300 victories; average '+(totalActions/300).toFixed(1)+' actions, '+(totalTactics/300).toFixed(1)+' tactical decisions. Policy: help/prepare, auto-equip stronger loot, train strength; no purchased gear.');
assert.ok(victories>=225,'First adventure should welcome new players using sensible choices');
console.log(passed+' domain regression tests passed.');
