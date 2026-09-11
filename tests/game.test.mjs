import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx=vm.createContext({console});
for(const file of ['data.js','encounters.js','story.js','engine.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),ctx);
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
  if(equip&&(!old||g.basePower(p.item)>g.basePower(old))&&(!old||g.state.inventory.length<g.state.capacity))g.loot('equip');
  else g.loot(g.state.inventory.length<g.state.capacity?'take':'sell');
 }
 g.state.notice=null;
}
function complete(g,{choices={},tactic='left',equip=false,spend=false}={}){
 let actions=0,tactics=0;
 while(g.state.run&&actions++<4000){
  resolvePending(g,equip);
  if(spend&&!g.state.run.battle)while(g.state.points)g.spend('might');
  const b=g.state.run.battle;
  if(b){if(b.tactic){g.tactic(tactic);tactics++;}else g.step();}
  else g.choose(choices[g.room().id]||(g.room().id==='boss'?'right':'left'));
  assert.ok(Number.isFinite(g.state.hp));
  assert.ok(g.state.gold>=0&&g.state.essence>=0);
 }
 assert.ok(actions<4000,'Expedition must terminate');
 resolvePending(g,equip);
 return {win:g.state.lastReport?.win,actions,tactics};
}
test('48 legacy item kinds populate eight equipment slots',()=>{
 assert.equal(D.itemKinds.length,48);
 for(const d of D.itemKinds)assert.ok(D.slots[d.slot]);
 assert.equal(Object.keys(fresh().state.equipped).length,8);
});
test('new heroes receive thirty points and assigned attributes stop at one hundred',()=>{
 const g=fresh();assert.equal(g.state.points,30);assert.equal(Object.keys(g.state.growth).length,6);assert.ok(g.state.levelNotice.initial);
 g.state.points=130;for(let i=0;i<130;i++)g.spend('perception');assert.equal(g.state.growth.perception,100);assert.equal(g.state.points,30);assert.equal(g.spend('perception'),false);
 assert.deepEqual([1,2,5,10,20].map(level=>g.threshold(level)),[70,115,334,979,3319]);
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
test('version 3 saves keep castle and mountain progress after cave insertion',()=>{
 const raw=plain(fresh().state);raw.version=3;raw.records=raw.records.slice(0,5);raw.records[3]={clears:2,highest:1,marks:3};raw.records[4]={clears:1,highest:0,marks:2};raw.unlocked=5;raw.selectedArea=4;
 const g=new Game(raw,seedRng(7));assert.equal(g.state.version,4);assert.equal(g.state.records.length,6);assert.equal(g.state.records[3].clears,1);
 assert.equal(g.state.records[4].clears,2);assert.equal(g.state.records[5].clears,1);assert.equal(g.state.selectedArea,5);assert.equal(g.state.unlocked,6);
});
test('episode chain includes the bridge detour, cave and final mountain oath',()=>{
 assert.equal(D.areas.length,6);assert.equal(D.areas[3].id,'stolen-hours-cave');assert.equal(D.chapter.after.length,6);
 assert.match(D.chapter.after[0].text,/Mostmistr Brumla/);assert.match(D.chapter.after[0].closing,/lese/);assert.match(D.chapter.after[2].closing,/Jeskyně/);assert.match(D.chapter.after[5].title,/soumrak/);
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
test('tower encounters form a causal network from cargo to boss',()=>{
 const g=fresh();g.start();g.state.run.rooms=['manifest','lift','checkpoint','bell','boss'];
 g.choose('left');g.state.notice=null;assert.ok(g.room().text.includes('přepsaný list'));g.choose('left');g.state.notice=null;
 assert.ok(g.state.run.flags.liftRoute);assert.ok(g.room().text.includes('falešného listu'));g.choose('left');g.state.notice=null;
 assert.ok(g.state.run.flags.authorized);assert.equal(g.state.run.battle.kind,'guard');g.state.run.battle.hp=1;g.step();g.state.notice=null;
 assert.ok(g.room().text.includes('účetní kontrole'));g.choose('left');g.state.notice=null;
 assert.ok(g.state.run.flags.silent);g.fight('boss',true);assert.ok(g.combatEffects().enemy.includes('Kontrola účtů · útok −2'));
 const aided=fresh();aided.start();aided.state.run.rooms=['manifest','lift','supplies','boss'];aided.state.hp=50;aided.choose('right');aided.state.notice=null;
 assert.ok(aided.state.run.flags.porterFriend);aided.choose('left');aided.state.notice=null;const gold=aided.state.gold;aided.choose('left');assert.equal(aided.state.gold,gold);assert.ok(aided.state.hp>50);
 const blocked=fresh();blocked.start();blocked.state.run.rooms=['lift','boss'];blocked.choose('left');assert.equal(blocked.state.run.battle.kind,'guard');
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
 const g=fresh();for(let i=0;i<20;i++)g.state.inventory.push(g.item('sword'));g.state.pending=[{type:'item',item:g.item('ring')}];
 assert.equal(g.loot('take'),false);assert.equal(g.state.pending.length,1);g.sell(g.state.inventory[0].id);assert.ok(g.loot('take'));assert.equal(g.state.inventory.length,20);
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
 for(let area=0;area<D.areas.length;area++){
  const g=fresh(5+area);g.state.unlocked=D.areas.length;g.start(area,0);g.state.hp=10000;g.state.run.index=6;g.fight('boss',true);g.step();
  assert.equal(g.state.run.battle.tactic.choices.length,2);const hp=g.state.run.battle.hp;g.step();assert.equal(g.state.run.battle.hp,hp);g.tactic('left');
  assert.equal(g.state.run.battle.tactic,null);
 }
});
test('region bosses use distinct mechanics affected by preparation',()=>{
 const bell=fresh();bell.start();bell.fight('boss',true);bell.state.run.battle.turn='enemy';bell.random=()=>.99;bell.enemy();assert.ok(bell.state.run.battle.log.some(x=>x.text.includes('Posílený útok')));
 const roots=fresh();roots.state.unlocked=2;roots.start(1);roots.fight('boss',true);roots.state.run.battle.hp-=20;roots.state.run.battle.round=2;roots.random=()=>.99;roots.enemy();assert.ok(roots.state.run.battle.log.some(x=>x.text.includes('Kořeny vrátily')));
 const shell=fresh();shell.state.unlocked=3;shell.state.growth.might=100;shell.start(2);shell.fight('boss',true);shell.step();shell.tactic('right');assert.ok(shell.state.run.battle.shellBroken);
 const echo=fresh();echo.state.unlocked=4;echo.start(3);echo.fight('boss',true);echo.state.run.battle.lastHit=40;echo.state.run.battle.round=2;echo.state.run.battle.turn='enemy';echo.random=()=>.99;echo.enemy();assert.ok(echo.state.run.battle.log.some(x=>x.text.includes('Ozvěna posledního úderu')));
});
test('preview-only loot cannot duplicate a merged item',()=>{
 const g=fresh();g.state.pending=[{type:'item',item:g.item('sword'),previewOnly:true}];assert.equal(g.loot('take'),false);assert.equal(g.state.inventory.length,0);
});
test('death preserves banked possessions and resets the run safely',()=>{
 const g=fresh();g.start();g.state.gold=100;g.state.potions=0;g.state.run.gold=20;g.fight('boss',true);g.state.hp=1;g.receive(999);g.lose();
 assert.equal(g.state.gold,97);assert.equal(g.state.run,null);assert.ok(g.state.hp>0);assert.equal(g.state.lastReport.win,false);
});
test('six regions plus repeatable challenge progression are completable with appropriate equipment',()=>{
 const g=fresh(88);
 for(let area=0;area<D.areas.length;area++){
  g.state.unlocked=Math.max(g.state.unlocked,area+1);g.state.growth={might:area*5,grit:area*4,agility:area*3,intelligence:2,luck:2};
  for(const kind of ['sword','helm','mail','boots','gauntlets','shield','ring','amulet'])g.state.equipped[D.itemById[kind].slot]=g.item(kind,'rare',1+area*2,[['damage',2],['armor',4],['vitality',5]]);
  g.state.potions=4;g.rest();assert.ok(g.start(area));const result=complete(g,{equip:true,spend:true});assert.ok(result.win,'region '+area);assert.equal(g.state.records[area].marks,2);
 }
 assert.ok(g.start(D.areas.length-1,1));assert.equal(g.state.run.challenge,1);
});
test('luck equipment is inactive in inventory and contributes to total, drops and gold when equipped',()=>{
 const g=fresh();g.state.growth.luck=2;
 const ring=g.item('ring','uncommon',1,[['luck',3]]);g.state.inventory.push(ring);
 assert.equal(g.stats().luck,2);const prior=g.dropChance();g.equip(ring.id);
 const b=g.statBreakdown();assert.equal(b.base.luck,2);assert.equal(b.bonus.luck,3);assert.equal(b.total.luck,5);assert.equal(b.total.gold,3.75);assert.ok(g.dropChance()>prior);
 const saved=new Game(plain(g.state));assert.equal(saved.stats().luck,5);assert.equal(saved.stats().gold,3.75);
 assert.equal(g.gold(100),104);g.unequip('ring');assert.equal(g.stats().luck,2);
});
test('all displayed breakdowns reconcile, including stacking, rounding and caps',()=>{
 const g=fresh();g.state.growth.luck=58;
 g.state.equipped.ring=g.item('ring','rare',4,[['luck',7],['crit',99],['absorb',50]]);
 g.state.equipped.relic=g.item('amulet','rare',4,[['luck',9],['gold',8],['haste',99]]);
 const b=g.statBreakdown();assert.equal(b.raw.luck,74);assert.equal(b.total.luck,74);assert.equal(b.bonus.luck,16);assert.equal(b.total.gold,63.5);
 for(const key of Object.keys(b.bonus))assert.ok(Math.abs(b.base[key]+b.bonus[key]-b.total[key])<.00001,key);
 assert.equal(b.total.crit,65);assert.equal(b.total.absorb,40);assert.equal(b.total.haste,65);
});
test('equipment can grant individual or all six primary attributes',()=>{
 const g=fresh();g.state.growth={might:1,grit:2,agility:3,intelligence:4,luck:5,perception:6};
 g.state.equipped.ring=g.item('ring','legendary',5,[['allStats',4],['perception',3]]);const a=g.attributes();
 assert.deepEqual(plain(a.total),{might:5,grit:6,agility:7,intelligence:8,luck:9,perception:13});assert.equal(g.stats().perception,13);
});
test('attributes influence probabilistic expedition checks without guaranteeing all outcomes',()=>{
 const g=fresh();g.state.growth.perception=100;g.state.growth.grit=70;g.start();g.state.run.rooms=['event-hazard-0','boss'];g.random=()=>0;
 const hp=g.state.hp;g.choose('left');assert.equal(g.state.hp,hp);assert.match(g.state.notice.text,/Všímavost/);
 const h=fresh();h.state.growth.might=100;h.start();h.state.run.rooms=['event-salvage-0','boss'];h.random=()=>0;h.choose('left');assert.match(h.state.notice.text,/3 esence/);
});
test('skill checks combine authored odds, half a point per attribute and visible 2d6 inside hard caps',()=>{
 const g=fresh();g.state.growth.might=30;let rolls=[0,.999,.59];g.random=()=>rolls.shift();
 const check=g.skillCheck('might',40);assert.deepEqual(plain(check),{stat:'might',base:40,value:30,attributeBonus:15,dice:[1,6],chance:62,roll:60,success:true,attempt:1});
 rolls=[0,0,.99];g.random=()=>rolls.shift();assert.equal(g.skillCheck('luck',0).chance,5);
 g.state.growth.might=100;rolls=[.999,.999,0];g.random=()=>rolls.shift();assert.equal(g.skillCheck('might',90).chance,95);
});
test('a resolved skill check cannot leak into an unrelated later encounter',()=>{
 const g=fresh();g.start();g.state.run.rooms=['event-hazard-0','event-hunt-0','boss'];g.random=()=>0;g.choose('left');assert.ok(g.state.notice.check);g.state.notice=null;g.choose('right');assert.equal(g.state.run.lastCheck,null);
});
test('forest choice really disables roots and regional scenes do not reuse tower interiors',()=>{
 const g=fresh();g.state.unlocked=D.areas.length;g.start(1);g.state.run.rooms=['fork','boss'];
 assert.ok(g.room().text.includes('kořeny'));g.choose('left');assert.ok(g.state.run.flags.silent);g.state.notice=null;
 g.fight('boss');const b=g.state.run.battle;b.hp-=30;b.round=2;g.random=()=>.99;const hp=b.hp;g.enemy();assert.equal(b.hp,hp);
 assert.ok(!g.describe('camp').text.includes('pera'));assert.ok(g.describe('camp').text.includes('jelena'));
});
test('carrying injured courier earns persistent friendship and reports actual life cost',()=>{
 const g=fresh();g.start();g.state.run.rooms=['wounded','boss'];g.state.hp=4;g.state.potions=0;g.choose('left');
 assert.equal(g.state.hp,1);assert.ok(g.state.flags.courierFriend);assert.ok(g.state.notice.text.includes('3 životů'));
});
test('chapter introduction is idempotent, interactive and survives save/load',()=>{
 const g=fresh();g.introduceChapter();g.introduceChapter();assert.equal(g.state.storyEvents.length,1);
 assert.equal(g.closeStory(),false);assert.equal(g.storyReply(2),false);assert.ok(g.storyReply(1));assert.equal(g.storyReply(0),false);
 const saved=new Game(plain(g.state));assert.equal(saved.state.storyEvents[0].response,1);assert.ok(saved.closeStory());saved.introduceChapter();assert.equal(saved.state.storyEvents.length,0);assert.ok(saved.state.flags.chapterIntroSeen);
});
test('each first victory advances its chapter beat, replays do not resurrect the villain',()=>{
 for(let area=0;area<D.areas.length;area++){
  const g=fresh();g.state.unlocked=D.areas.length;g.start(area);g.fight('boss');g.win();
  const event=g.state.storyEvents[0];assert.equal(event.id,'clear-'+area);assert.equal(event.speaker,D.chapter.after[area].speaker);assert.equal(event.replies.length,2);
  if(area===4)assert.ok(g.state.notice.text.includes('uprchl'));if(area===5)assert.ok(g.state.notice.text.includes('vzdal'));
  resolvePending(g);g.state.storyEvents=[];g.start(area);assert.ok(g.state.run.replay);g.fight('boss');g.win();assert.equal(g.state.storyEvents[0].id,'echo-'+area);
 }
});
test('retreat and defeat provide feedback without awarding story progress',()=>{
 for(const result of ['retreat','loss']){const g=fresh();g.start();if(result==='retreat')g.retreat();else{g.fight('boss');g.lose();}assert.equal(g.state.records[0].clears,0);assert.equal(g.state.unlocked,1);assert.equal(g.state.storyEvents[0].id,result+'-0');}
});
test('all 48 item kinds have unique atlas cells',()=>{
 assert.equal(new Set(Object.values(D.itemArt)).size,48);for(const d of D.itemKinds)assert.ok(Number.isInteger(D.itemArt[d.id]));
});
test('level rewards aggregate, survive reload, and never duplicate',()=>{
 const g=fresh(),hp=g.stats().maxHp,current=g.state.hp;g.xp(185);
 assert.equal(g.state.level,3);assert.equal(g.state.points,36);assert.equal(g.stats().maxHp,hp+10);assert.equal(g.state.hp,current+10);
 assert.deepEqual(plain(g.state.levelNotice),{from:1,to:3,hp:10,points:6});
 const loaded=new Game(plain(g.state));assert.equal(loaded.stats().maxHp,g.stats().maxHp);assert.equal(loaded.state.hp,g.state.hp);assert.deepEqual(plain(loaded.state.levelNotice),plain(g.state.levelNotice));
 loaded.spend('grit');assert.equal(loaded.stats().maxHp,hp+13);assert.equal(loaded.state.points,35);
 loaded.state.levelNotice=null;assert.equal(new Game(plain(loaded.state)).state.levelNotice,null);
});
test('consequence prose hides future rules, combat badges reflect active arithmetic',()=>{
 const g=fresh();g.start();g.state.run.rooms=['event-omen-0','boss'];g.choose('right');assert.ok(!/10 %|nepřátelé mají/.test(g.state.notice.text));
 g.state.notice=null;g.fight('boss');assert.ok(g.combatEffects().enemy.includes('Životy +21 %'));
 g.state.run.flags.blessed=true;g.state.run.flags.ambush=true;g.state.run.shield=12;
 assert.ok(g.combatEffects().hero.includes('Ochrana −65 %'));assert.ok(g.combatEffects().hero.includes('Štít 12'));assert.ok(g.combatEffects().hero.includes('První úder +65 %'));
 g.state.run.battle.round=1;assert.ok(!g.combatEffects().hero.includes('První úder +65 %'));g.receive(10,true);assert.ok(!g.combatEffects().hero.includes('Ochrana −65 %'));
 const h=fresh();h.start();h.state.run.rooms=['event-ambush-0'];h.choose('right');assert.ok(h.combatEffects().enemy.includes('Životy +15 %'));assert.ok(h.combatEffects().enemy.includes('Útok −2'));
});
test('item damage contribution uses integer values consistently',()=>{
 const g=fresh();g.state.equipped={};const base=g.stats();
 for(const kind of ['dagger','ring','amulet']){const it=g.item(kind,'rare',4,[['damage',2]]),slot=D.itemById[kind].slot,p=g.basePower(it),a=g.stats({[slot]:it});
 assert.equal(a.damageMin-base.damageMin,Math.round(p*(slot==='weapon'?1.6:.3))+2);assert.equal(a.damageMax-base.damageMax,Math.round(p*(slot==='weapon'?2:.5))+2);}
});
test('equipment preserves missing HP through full, wounded and direct loot cycles',()=>{
 const g=fresh();g.state.hp=g.stats().maxHp;
 const hp=g.state.hp;assert.ok(g.unequip('feet'));assert.equal(g.state.hp,g.stats().maxHp);
 assert.ok(g.equip(g.state.inventory[0].id));assert.equal(g.state.hp,hp);
 g.state.hp-=23;for(let i=0;i<5;i++){assert.ok(g.unequip('feet'));assert.equal(g.stats().maxHp-g.state.hp,23);assert.ok(g.equip(g.state.inventory[0].id));assert.equal(g.state.hp,hp-23);}
 const better=g.item('boots','rare',3,[['vitality',35]]);g.state.pending=[{type:'item',item:better}];assert.ok(g.loot('equip'));assert.equal(g.stats().maxHp-g.state.hp,23);
 const loaded=new Game(plain(g.state));assert.equal(loaded.state.hp,g.state.hp);assert.equal(loaded.stats().maxHp-loaded.state.hp,23);
 g.state.hp=1;const before=plain(g.state);assert.equal(g.unequip('feet'),false);assert.deepEqual(plain(g.state),before);
});
test('legacy overflow remains recoverable without increasing new capacity',()=>{
 const g=fresh();for(let i=0;i<24;i++)g.state.inventory.push(g.item('sword'));
 const loaded=new Game(plain(g.state));assert.equal(loaded.state.capacity,20);assert.equal(loaded.state.inventory.length,24);
 loaded.state.pending=[{type:'item',item:loaded.item('ring')}];assert.equal(loaded.loot('take'),false);
 for(let i=0;i<5;i++)loaded.sell(loaded.state.inventory[0].id);
 assert.ok(loaded.loot('take'));assert.equal(loaded.state.inventory.length,20);
});
test('custom names validate and migrate without touching progression',()=>{
 const g=fresh();g.start();const before=plain(g.state);assert.equal(g.setHeroName('<script>'),false);assert.equal(g.setHeroName(' '),false);assert.equal(g.setHeroName('A'),false);assert.equal(g.setHeroName('A'.repeat(25)),false);
 assert.ok(g.setHeroName("  Žan O'Neil  "));assert.equal(g.state.heroName,"Žan O'Neil");const loaded=new Game(plain(g.state));assert.equal(loaded.state.heroName,g.state.heroName);assert.equal(loaded.state.gold,before.gold);assert.deepEqual(plain(loaded.state.run),before.run);
});
// Difficulty calibration lives in expedition.test.mjs with explicit player policies.
console.log(passed+' domain regression tests passed.');
