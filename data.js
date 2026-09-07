/* Game content. Original catalogue retained; no runtime or DOM dependency. */
(function(){
const catalog=(category,entries)=>entries.map(x=>({id:x[0],category,label:x[1],icon:x[2],bonus:x[3]}));
const itemKinds=[
...catalog('weapon',[['dagger','Dýka pro účetní','🗡️',3],['axe','Sekera na argumenty','🪓',4],['broom','Koště zkázy','🧹',3],['wand','Hůl od reklamace','🪄',4],['sword','Meč druhé šance','⚔️',5],['mace','Palcát na poradní schůze','🔨',5],['bow','Luk s nekonečnou zárukou','🏹',4],['spear','Kopí pro osobní prostor','🔱',5],['staff','Hůl drobné apokalypsy','🦯',5],['frying-pan','Pánev osudu','🍳',4],['scythe','Kosa po pracovní době','🌙',6],['crossbow','Kuše bez návodu','🎯',5],['cleaver','Sekáček na drby','🔪',4],['gavel','Kladívko posledního slova','⚒️',5],['lute','Loutna bojového účetnictví','🎸',3],['umbrella','Deštník proti drakům','☂️',4]]),
...catalog('armor',[['helm','Helma neomylnosti','⛑️',2],['cloak','Plášť dramatického odchodu','🧥',2],['boots','Boty rychlého ústupu','👢',2],['pauldron','Nárameník s názorem','🛡️',3],['breastplate','Kyrys z nedoručených zásilek','🥋',4],['gauntlets','Rukavice na pevná podání ruky','🥊',3],['belt','Pás nekonečného oběda','🧷',2],['greaves','Holenníky proti stolu','🦿',3],['mask','Maska anonymního hrdiny','🎭',3],['crown','Koruna pracovní směny','👑',4],['mail','Kroužkovka ze spon','⛓️',4],['hat','Klobouk osudové kapusty','🎩',2],['cape','Pelerína drobného vítězství','🦸',3],['vest','Vesta pro jednání s gobliny','🦺',2],['shield','Štít před konstruktivní kritikou','🛡️',4],['socks','Ponožky tichého hněvu','🧦',2]]),
...catalog('relic',[['egg','Vejce starší než vina','🥚',2],['coin','Prokletý drobný','🪙',2],['goblet','Pohár za účast','🏆',3],['whistle','Píšťalka na draky','📯',3],['orb','Koule zákaznické podpory','🔮',4],['ring','Prsten s příliš mnoha klíči','💍',3],['amulet','Amulet ztraceného signálu','📿',3],['book','Kniha nesprávných odpovědí','📕',4],['skull','Lebka bývalého poradce','💀',4],['teapot','Čajník bezedné odvahy','🫖',3],['hourglass','Přesýpací hodiny bez pátečního odpoledne','⏳',4],['candle','Svíce proti manažerům','🕯️',3],['key','Klíč od vedlejšího questu','🗝️',3],['cheese','Sýr strategického významu','🧀',2],['mirror','Zrcadlo hrdinského filtrování','🪞',4],['sock','Svatá levá ponožka','🧦',3]])
];
const rarities=[{id:'common',label:'Common',short:'C',multiplier:1,color:'#cbd5d5'},{id:'uncommon',label:'Uncommon',short:'U',multiplier:1.2,color:'#70e59a'},{id:'rare',label:'Rare',short:'R',multiplier:1.5,color:'#73a9ff'},{id:'epic',label:'Epic',short:'E',multiplier:1.9,color:'#d986ff'},{id:'legendary',label:'Legendary',short:'L',multiplier:2.45,color:'#ffbd56'},{id:'mythic',label:'Mythic',short:'M',multiplier:3.2,color:'#ff6878'}],rarityById=Object.fromEntries(rarities.map(x=>[x.id,x])),rarityIndex=id=>rarities.findIndex(x=>x.id===id),itemById=Object.fromEntries(itemKinds.map(x=>[x.id,x]));
const affixDefinitions=[['damage','Řezavý','⚔',2,2],['crit','Přesný','✹',1,1],['armor','Neochvějný','🛡',3,4],['evasion','Kluzký','〰',1,1],['vitality','Zavalitý','♥',5,5],['leech','Vampirický','🩸',1,1],['gold','Pozlacený','◈',3,4],['thorns','Ostnatý','🌵',4,4],['absorb','Pohltivý','◒',1,2],['haste','Hbitý','⚡',2,2],['luck','Šťastný','☘',2,2]].map(x=>({id:x[0],label:x[1],icon:x[2],base:x[3],step:x[4]})),affixById=Object.fromEntries(affixDefinitions.map(x=>[x.id,x]));

const slots={weapon:'Zbraň',offhand:'Levá ruka',head:'Hlava',body:'Tělo',feet:'Boty',hands:'Ruce',ring:'Prsten',relic:'Relikvie'};
const slotIds={
 weapon:['dagger','axe','broom','wand','sword','mace','bow','spear','staff','frying-pan','scythe','crossbow','cleaver','gavel','lute','umbrella'],
 head:['helm','mask','crown','hat'],body:['cloak','pauldron','breastplate','cape','vest','mail','belt'],
 feet:['boots','greaves','socks'],hands:['gauntlets'],offhand:['shield','goblet','mirror'],ring:['ring']
};
itemKinds.forEach(d=>{d.slot=Object.keys(slotIds).find(k=>slotIds[k].includes(d.id))||'relic'});
const signatures={
 dagger:{name:'Dýka druhého dechu',effect:'Po úhybu příští zásah způsobí dvojnásobné poškození.',trait:'riposte',genes:[['evasion',5],['crit',7],['haste',5]],poi:1},
 shield:{name:'Štít uraženého ježka',effect:'Blok připraví odvetu. Příští zásah vrátí navíc 60 % tvého ARMOR.',trait:'hedgehog',genes:[['armor',8],['thorns',25],['vitality',12]],poi:2},
 amulet:{name:'Amulet nenasytnosti',effect:'Přebytečné léčení z kradení života se mění na ochranný štít.',trait:'overflow',genes:[['leech',8],['vitality',14],['absorb',2]],poi:0},
 axe:{name:'Sekera posledního slova',effect:'Proti nepříteli pod 35 % života způsobíš o 55 % více poškození.',trait:'execute',genes:[['damage',4],['crit',6],['vitality',10]],poi:3}
};
const traits=Object.fromEntries(Object.values(signatures).map(x=>[x.trait,x]));
const areas=[
 {id:'toll-tower',name:'Mýtná věž',short:'Věž',scene:0,x:22,y:77,level:1,material:'Mýtné pečeti',boss:'Výběrčí poslední mince',bossArt:3,focus:['relic','ring','offhand'],hint:'Zvon svolává stráže. Někdo uvnitř ví, jak ho umlčet.',quest:'Zruš mýto pro živé i zesnulé.',recipe:'amulet'},
 {id:'whisperwood',name:'Šeptající les',short:'Les',scene:1,x:27,y:55,level:3,material:'Lesní runy',boss:'Jelen tisíce výmluv',bossArt:5,focus:['weapon','feet','ring'],hint:'Kořeny prozrazují, kam jelen vyrazí. Sleduj jeho přípravu.',quest:'Najdi zdroj hlasů, které vodí pocestné do kruhu.',recipe:'dagger'},
 {id:'black-mine',name:'Černý důl',short:'Důl',scene:2,x:70,y:49,level:5,material:'Černá ruda',boss:'Předák poslední směny',bossArt:0,focus:['body','offhand','head','hands'],hint:'Závalu se dá vyhnout. Jeho krunýř ale vyžaduje silný úder.',quest:'Ukonči směnu, která trvá už třicet let.',recipe:'shield'},
 {id:'overtime-castle',name:'Hrad Přesčas',short:'Hrad',scene:3,x:74,y:27,level:8,material:'Královské erby',boss:'Král Přesčas I.',bossArt:3,focus:['weapon','relic','body'],hint:'Král vybírá daň z každého slabého úderu. Šetři sílu na finále.',quest:'Vrať poddaným jejich vlastní večery.',recipe:'axe'},
 {id:'expectation-peaks',name:'Hory očekávání',short:'Hory',scene:4,x:29,y:16,level:11,material:'Hvězdné úlomky',boss:'Strážce nesplnitelných slibů',bossArt:5,focus:['relic','ring','weapon'],hint:'Lavina nezajímá, kolik máš zkušeností. Rozhoduje příprava.',quest:'Přines důkaz, že i nemožný úkol má konec.',recipe:'amulet'}
];
const foeKinds={
 guard:{name:'Strážný na dvojí směně',art:0,style:'armored',hint:'Zbroj tlumí zásahy. Každým třetím úderem se rozkryje.'},
 thief:{name:'Krysa s cizím měšcem',art:1,style:'thief',hint:'Chystá útěk. Po čtyřech útocích může zmizet s částí odměny.'},
 hunter:{name:'Lovec nedoplatků',art:2,style:'hunter',hint:'Střídá výstřel a nabíjení silné rány.'},
 spirit:{name:'Bludný strážce',art:5,style:'spirit',hint:'Kořeny ho léčí. Útoky zesilují, pokud souboj protahuješ.'}
};
const statNames={damage:'Poškození',crit:'Kritická šance',armor:'Zbroj',evasion:'Úhyb',vitality:'Životy',leech:'Kradení života',gold:'Zlato',thorns:'Trny',absorb:'Pohlcení',haste:'Rychlost',luck:'Štěstí'};
globalThis.RPGData={itemKinds,itemById,rarities,rarityById,rarityIndex,affixDefinitions,affixById,slots,signatures,traits,areas,foeKinds,statNames};
})();

