/* Game content. Original catalogue retained; no runtime or DOM dependency. */
(function(){
const catalog=(category,entries)=>entries.map(x=>({id:x[0],category,label:x[1],icon:x[2],bonus:x[3]}));
const itemKinds=[
...catalog('weapon',[['dagger','Dýka pro účetní','🗡️',3],['axe','Sekera na argumenty','🪓',4],['broom','Koště zkázy','🧹',3],['wand','Hůl od reklamace','🪄',4],['sword','Meč druhé šance','⚔️',5],['mace','Palcát na poradní schůze','🔨',5],['bow','Luk s nekonečnou zárukou','🏹',4],['spear','Kopí pro osobní prostor','🔱',5],['staff','Hůl drobné apokalypsy','🦯',5],['frying-pan','Pánev osudu','🍳',4],['scythe','Kosa po pracovní době','🌙',6],['crossbow','Kuše bez návodu','🎯',5],['cleaver','Sekáček na drby','🔪',4],['gavel','Kladívko posledního slova','⚒️',5],['lute','Loutna bojového účetnictví','🎸',3],['umbrella','Deštník proti drakům','☂️',4]]),
...catalog('armor',[['helm','Helma neomylnosti','⛑️',2],['cloak','Plášť dramatického odchodu','🧥',2],['boots','Boty rychlého ústupu','👢',2],['pauldron','Nárameník s názorem','🛡️',3],['breastplate','Kyrys z nedoručených zásilek','🥋',4],['gauntlets','Rukavice na pevná podání ruky','🥊',3],['belt','Pás nekonečného oběda','🧷',2],['greaves','Holenníky proti stolu','🦿',3],['mask','Maska anonymního hrdiny','🎭',3],['crown','Koruna pracovní směny','👑',4],['mail','Kroužkovka ze spon','⛓️',4],['hat','Klobouk osudové kapusty','🎩',2],['cape','Pelerína drobného vítězství','🦸',3],['vest','Vesta pro jednání s gobliny','🦺',2],['shield','Štít před konstruktivní kritikou','🛡️',4],['socks','Ponožky tichého hněvu','🧦',2]]),
...catalog('relic',[['egg','Vejce starší než vina','🥚',2],['coin','Prokletý drobný','🪙',2],['goblet','Pohár za účast','🏆',3],['whistle','Píšťalka na draky','📯',3],['orb','Koule zákaznické podpory','🔮',4],['ring','Prsten s příliš mnoha klíči','💍',3],['amulet','Amulet ztraceného signálu','📿',3],['book','Kniha nesprávných odpovědí','📕',4],['skull','Lebka bývalého poradce','💀',4],['teapot','Čajník bezedné odvahy','🫖',3],['hourglass','Přesýpací hodiny bez pátečního odpoledne','⏳',4],['candle','Svíce proti manažerům','🕯️',3],['key','Klíč od vedlejšího questu','🗝️',3],['cheese','Sýr strategického významu','🧀',2],['mirror','Zrcadlo hrdinského filtrování','🪞',4],['sock','Svatá levá ponožka','🧦',3]])
];
const rarities=[{id:'common',label:'Common',short:'C',multiplier:1,color:'#cbd5d5'},{id:'uncommon',label:'Uncommon',short:'U',multiplier:1.2,color:'#70e59a'},{id:'rare',label:'Rare',short:'R',multiplier:1.5,color:'#73a9ff'},{id:'epic',label:'Epic',short:'E',multiplier:1.9,color:'#d986ff'},{id:'legendary',label:'Legendary',short:'L',multiplier:2.45,color:'#ffbd56'},{id:'mythic',label:'Mythic',short:'M',multiplier:3.2,color:'#ff6878'}],rarityById=Object.fromEntries(rarities.map(x=>[x.id,x])),rarityIndex=id=>rarities.findIndex(x=>x.id===id),itemById=Object.fromEntries(itemKinds.map(x=>[x.id,x]));
const affixDefinitions=[['damage','Řezavý','⚔',2,2],['crit','Přesný','✹',1,1],['armor','Neochvějný','🛡',3,4],['evasion','Kluzký','〰',1,1],['vitality','Zavalitý','♥',5,5],['leech','Vampirický','🩸',1,1],['gold','Pozlacený','◈',3,4],['thorns','Ostnatý','🌵',4,4],['absorb','Pohltivý','◒',1,2],['haste','Hbitý','⚡',2,2],['might','Silný','⚔',1,1],['grit','Odolný','♥',1,1],['agility','Obratný','〰',1,1],['intelligence','Učený','✶',1,1],['luck','Šťastný','☘',1,1],['perception','Všímavý','◉',1,1],['allStats','Všestranný','✦',1,1]].map(x=>({id:x[0],label:x[1],icon:x[2],base:x[3],step:x[4]})),affixById=Object.fromEntries(affixDefinitions.map(x=>[x.id,x]));

const slots={weapon:'Zbraň',offhand:'Levá ruka',head:'Hlava',body:'Tělo',feet:'Boty',hands:'Ruce',ring:'Prsten',relic:'Relikvie'};
const slotIds={
 weapon:['dagger','axe','broom','wand','sword','mace','bow','spear','staff','frying-pan','scythe','crossbow','cleaver','gavel','lute','umbrella'],
 head:['helm','mask','crown','hat'],body:['cloak','pauldron','breastplate','cape','vest','mail','belt'],
 feet:['boots','greaves','socks'],hands:['gauntlets'],offhand:['shield','goblet','mirror'],ring:['ring']
};
itemKinds.forEach(d=>{d.slot=Object.keys(slotIds).find(k=>slotIds[k].includes(d.id))||'relic'});
// Clear type names; humour belongs in context, not in misleading stat promises.
const itemLabels=['Cechovní dýka','Dřevorubecká sekera','Čarodějnické koště','Jasanová hůlka','Strážní meč','Železný palcát','Lovecký luk','Hlídací kopí','Runová hůl','Táborová pánev','Železná kosa','Lehká kuše','Řeznický sekáček','Soudcovské kladívko','Bardova loutna','Cestovní deštník','Strážní přilba','Cestovní plášť','Kožené boty','Ocelový nárameník','Ocelový kyrys','Plátové rukavice','Kožený opasek','Železné holenníky','Havraní maska','Stříbrná koruna','Kroužková zbroj','Klobouk poutníka','Sametová pelerína','Prošívaná vesta','Kulatý štít','Vlněné ponožky','Zkamenělé vejce','Stará mýtná mince','Stříbrný pohár','Lovecká píšťala','Věštecká koule','Měděný prsten','Runový amulet','Kniha zaříkadel','Vyřezávaná lebka','Cestovní čajník','Přesýpací hodiny','Rituální svíce','Starý cechovní klíč','Vyzrálý cestovní sýr','Stříbrné zrcadlo','Poutníkova relikvie'];
itemKinds.forEach((d,i)=>{d.label=itemLabels[i];});
const itemArt={dagger:0,axe:1,sword:2,staff:3,bow:4,crossbow:5,mace:6,spear:7,helm:8,breastplate:9,boots:10,gauntlets:11,shield:12,ring:13,amulet:14,book:15};
['broom','wand','frying-pan','scythe','cleaver','gavel','lute','umbrella','cloak','pauldron','belt','greaves','mask','crown','mail','hat','cape','vest','socks','egg','coin','goblet','whistle','orb','skull','teapot','hourglass','candle','key','cheese','mirror','sock'].forEach((id,i)=>{itemArt[id]=16+i;});
const statCaps={crit:65,evasion:40,leech:25,thorns:100,absorb:40,haste:65,block:45};
const signatures={
 dagger:{name:'Dýka druhého dechu',effect:'Po úhybu příští zásah způsobí dvojnásobné poškození.',trait:'riposte',genes:[['evasion',5],['crit',7],['haste',5]],poi:1},
 shield:{name:'Štít uraženého ježka',effect:'Blok nebo obranný manévr připraví odvetu. Příští běžný zásah přidá poškození ve výši 60 % tvé zbroje.',trait:'hedgehog',genes:[['armor',8],['thorns',25],['vitality',12]],poi:2},
 amulet:{name:'Amulet nenasytnosti',effect:'Přebytečné léčení z kradení života se mění na ochranný štít.',trait:'overflow',genes:[['leech',8],['vitality',14],['absorb',2]],poi:0},
 axe:{name:'Sekera posledního slova',effect:'Proti nepříteli pod 35 % života způsobíš o 55 % více poškození.',trait:'execute',genes:[['damage',4],['crit',6],['vitality',10]],poi:3}
};
const traits=Object.fromEntries(Object.values(signatures).map(x=>[x.trait,x]));
const areas=[
 {id:'toll-tower',name:'Mýtná věž',short:'Věž',scene:0,x:19,y:49,level:1,material:'Mýtné pečeti',boss:'Výběrčí poslední mince',bossArt:3,focus:['relic','ring','offhand'],hint:'Zvon svolává stráže. Někdo uvnitř ví, jak ho umlčet.',quest:'Zruš mýto pro živé i zesnulé.',recipe:'amulet'},
 {id:'whisperwood',name:'Šeptající les',short:'Les',scene:1,x:52,y:64,level:3,material:'Lesní runy',boss:'Jelen bludných cest',bossArt:5,focus:['weapon','feet','ring'],hint:'Jelena léčí kořeny propojené s hájem. Cestou můžeš toto spojení přetnout.',quest:'Poraž zakletého strážce háje a otevři pocestným cestu z lesa.',recipe:'dagger'},
 {id:'black-mine',name:'Černý důl',short:'Důl',scene:2,x:78,y:51,level:5,material:'Černá ruda',boss:'Předák poslední směny',bossArt:0,focus:['body','offhand','head','hands'],hint:'Předákovu zbroj pokrývá černá ruda. Úspěšné přerušení jeho těžkého útoku tento krunýř rozbije.',quest:'Ukonči směnu, která trvá už třicet let.',recipe:'shield'},
 {id:'stolen-hours-cave',name:'Jeskyně zadržených hodin',short:'Jeskyně',scene:5,x:84,y:34,level:7,material:'Časové krystaly',boss:'Velký Časomol',bossArt:4,focus:['relic','ring','weapon'],hint:'Časomol vrací část síly tvých úderů jako ozvěnu. Rozladěné krystaly ji umlčí.',quest:'Vrať ukradené večery jejich majitelům.',recipe:'amulet'},
 {id:'overtime-castle',name:'Hrad Přesčas',short:'Hrad',scene:3,x:66,y:14,level:9,material:'Královské erby',boss:'Král Přesčas I.',bossArt:3,focus:['weapon','relic','body'],hint:'Král vybírá daň z každého slabého úderu. Šetři sílu na finále.',quest:'Vrať poddaným jejich vlastní večery.',recipe:'axe'},
 {id:'expectation-peaks',name:'Hory očekávání',short:'Hory',scene:4,x:22,y:18,level:12,material:'Hvězdné úlomky',boss:'Strážce nesplnitelných slibů',bossArt:5,focus:['relic','ring','weapon'],hint:'Lavina nezajímá, kolik máš zkušeností. Rozhoduje příprava.',quest:'Přines důkaz, že i nemožný úkol má konec.',recipe:'amulet'}
];
const foeKinds={
 guard:{name:'Strážný na dvojí směně',art:0,style:'armored',hint:'Zbroj snižuje tvé zásahy o 35 %. Při každém třetím tvém běžném útoku se strážný odkryje a zbroj ho nechrání.'},
 thief:{name:'Krysa s cizím měšcem',art:1,style:'thief',hint:'Chystá útěk. Po čtyřech útocích může zmizet s částí odměny.'},
 hunter:{name:'Lovec nedoplatků',art:2,style:'hunter',hint:'Střídá výstřel a nabíjení silné rány.'},
 spirit:{name:'Bludný strážce',art:5,style:'spirit',hint:'Každé tři tvoje útoky jeho poškození vzroste o 1. Čím delší boj, tím nebezpečnější je.'}
};
const statNames={damage:'Poškození',crit:'Kritická šance',armor:'Zbroj',evasion:'Úhyb',vitality:'Životy',leech:'Kradení života',gold:'Zlato',thorns:'Trny',absorb:'Pohlcení',haste:'Rychlost',might:'Síla',grit:'Odolnost',agility:'Obratnost',intelligence:'Inteligence',luck:'Štěstí',perception:'Všímavost',allStats:'Všechny atributy'};
globalThis.RPGData={itemKinds,itemById,itemArt,statCaps,rarities,rarityById,rarityIndex,affixDefinitions,affixById,slots,signatures,traits,areas,foeKinds,statNames};
})();
