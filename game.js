/* NE, ALE ZABÍJÍM — local, dependency-free playable prototype */
const $ = (id) => document.getElementById(id);
const stateKey = 'ne-ale-zabijim-v1';
const catalog = (category, entries) => entries.map(([id,label,icon,bonus]) => ({ id, category, label, icon, bonus }));
const itemKinds = [
  ...catalog('weapon', [
    ['dagger','Dýka pro účetní','🗡️',3], ['axe','Sekera na argumenty','🪓',4], ['broom','Koště zkázy','🧹',3], ['wand','Hůl od reklamace','🪄',4],
    ['sword','Meč druhé šance','⚔️',5], ['mace','Palcát na poradní schůze','🔨',5], ['bow','Luk s nekonečnou zárukou','🏹',4], ['spear','Kopí pro osobní prostor','🔱',5],
    ['staff','Hůl drobné apokalypsy','🦯',5], ['frying-pan','Pánev osudu','🍳',4], ['scythe','Kosa po pracovní době','🌙',6], ['crossbow','Kuše bez návodu','🎯',5],
    ['cleaver','Sekáček na drby','🔪',4], ['gavel','Kladívko posledního slova','⚒️',5], ['lute','Loutna bojového účetnictví','🎸',3], ['umbrella','Deštník proti drakům','☂️',4],
  ]),
  ...catalog('armor', [
    ['helm','Helma neomylnosti','⛑️',2], ['cloak','Plášť dramatického odchodu','🧥',2], ['boots','Boty rychlého ústupu','👢',2], ['pauldron','Nárameník s názorem','🛡️',3],
    ['breastplate','Kyrys z nedoručených zásilek','🥋',4], ['gauntlets','Rukavice na velmi pevná podání ruky','🥊',3], ['belt','Pás nekonečného oběda','🧷',2], ['greaves','Holenníky proti stolu','🦿',3],
    ['mask','Maska anonymního hrdiny','🎭',3], ['crown','Koruna pracovní směny','👑',4], ['mail','Kroužkovka ze spon','⛓️',4], ['hat','Klobouk osudové kapusty','🎩',2],
    ['cape','Pelerína drobného vítězství','🦸',3], ['vest','Vesta pro jednání s gobliny','🦺',2], ['shield','Štít před konstruktivní kritikou','🛡️',4], ['socks','Ponožky tichého hněvu','🧦',2],
  ]),
  ...catalog('relic', [
    ['egg','Vejce starší než vina','🥚',2], ['coin','Prokletý drobný','🪙',2], ['goblet','Pohár za účast','🏆',3], ['whistle','Píšťalka na draky','📯',3],
    ['orb','Koule zákaznické podpory','🔮',4], ['ring','Prsten s příliš mnoha klíči','💍',3], ['amulet','Amulet ztraceného signálu','📿',3], ['book','Kniha nesprávných odpovědí','📕',4],
    ['skull','Lebka bývalého poradce','💀',4], ['teapot','Čajník bezedné odvahy','🫖',3], ['hourglass','Přesýpací hodiny bez pátečního odpoledne','⏳',4], ['candle','Svíce proti manažerům','🕯️',3],
    ['key','Klíč od vedlejšího questu','🗝️',3], ['cheese','Sýr strategického významu','🧀',2], ['mirror','Zrcadlo hrdinského filtrování','🪞',4], ['sock','Svatá levá ponožka','🧦',3],
  ]),
];
const rarities = [
  { id:'common', label:'Common', short:'C', multiplier:1, color:'#cbd5d5' }, { id:'uncommon', label:'Uncommon', short:'U', multiplier:1.2, color:'#70e59a' },
  { id:'rare', label:'Rare', short:'R', multiplier:1.5, color:'#73a9ff' }, { id:'epic', label:'Epic', short:'E', multiplier:1.9, color:'#d986ff' },
  { id:'legendary', label:'Legendary', short:'L', multiplier:2.45, color:'#ffbd56' }, { id:'mythic', label:'Mythic', short:'M', multiplier:3.2, color:'#ff6878' },
];
const rarityById = Object.fromEntries(rarities.map(rarity => [rarity.id,rarity]));
const rarityIndex = (rarity) => rarities.findIndex(entry => entry.id===rarity);
const affixDefinitions = [
  { id:'damage', label:'Řezavý', stat:'damage', icon:'⚔', base:2, step:2 }, { id:'crit', label:'Přesný', stat:'crit', icon:'✹', base:1, step:1 },
  { id:'armor', label:'Neochvějný', stat:'armor', icon:'🛡', base:3, step:4 }, { id:'evasion', label:'Kluzký', stat:'evasion', icon:'〰', base:1, step:1 },
  { id:'vitality', label:'Zavalitý', stat:'vitality', icon:'♥', base:5, step:5 }, { id:'leech', label:'Vampirický', stat:'leech', icon:'🩸', base:1, step:1 },
  { id:'gold', label:'Pozlacený', stat:'gold', icon:'◈', base:3, step:4 }, { id:'thorns', label:'Ostnatý', stat:'thorns', icon:'🌵', base:4, step:4 },
  { id:'absorb', label:'Pohltivý', stat:'absorb', icon:'◒', base:1, step:2 }, { id:'haste', label:'Hbitý', stat:'haste', icon:'⚡', base:2, step:2 },
  { id:'luck', label:'Šťastný', stat:'luck', icon:'☘', base:2, step:2 },
];
const affixById = Object.fromEntries(affixDefinitions.map(affix => [affix.id,affix]));
function rollAffixes(rarity, rank=1) { const count=rarityIndex(rarity); const pool=[...affixDefinitions]; const affixes=[]; for(let i=0;i<count;i++) { const index=Math.floor(Math.random()*pool.length); const definition=pool.splice(index,1)[0]; affixes.push({ id:definition.id, value:definition.base+definition.step*Math.max(0,rarityIndex(rarity)-1)+Math.max(0,rank-1) }); } return affixes; }
const itemById = Object.fromEntries(itemKinds.map(item => [item.id,item]));
const makeItem = (kind='dagger', rank=1, rarity='common', affixes=null) => ({ kind, rank, rarity, affixes:affixes ?? rollAffixes(rarity,rank) });
const enemies = [
  ['🟢', 'Slizký účetní'], ['👹', 'Gremlin z pojišťovny'], ['🦇', 'Netopýr s hypotékou'],
  ['🧌', 'Trollí influencer'], ['👻', 'Duch poslední výplaty'], ['🐀', 'Krysí baron']
];
const events = [
  { title:'ZLÝ NÁPAD NA CESTĚ', text:'Místní sliz chce být tvým koučem. Nejdřív tě ale zkusí sežrat.', yes:'Urazit jeho rodinu · elitní kořist', no:'Dát mu vizitku · bezpečnější boj', risk:1.6, reward:1.9, noHeal:0 },
  { title:'VYCHOVANÝ MOST', text:'Most chce mýtné. Vydává za to diplom z hrdinství, který je očividně nakreslený pastelkou.', yes:'Zaplatit hrdostí · riziko a zlato', no:'Jít pod mostem · malá léčba', risk:1.35, reward:1.55, noHeal:12 },
  { title:'SUD, KTERÝ SE HÝBE', text:'Sud se hýbe. Buď je zakletý, nebo právě objevil kardio.', yes:'Kopnout do něj · bonusová kořist', no:'Zdvořile obejít · obyčejný boj', risk:1.5, reward:1.8, noHeal:0 },
  { title:'PŘÍLIŠ UPŘÍMNÁ VĚŠTKYNĚ', text:'Věštkyně vidí tvou budoucnost. Je krátká, drahá a má rohy.', yes:'Chtít úplnou pravdu · silný nepřítel', no:'Vzít zkrácenou verzi · čaj zdarma', risk:1.7, reward:2.15, noHeal:15 },
  { title:'VÝPRODEJ PROKLETÍ', text:'Obchodník tvrdí, že prokletí se po třetím použití stává sběratelským.', yes:'Koupit mystery truhlu · vysoký zisk', no:'Nekoupit prokletí · odpočinek', risk:1.45, reward:1.75, noHeal:10 },
];

function freshState() { return { floor:1, hp:100, maxHp:100, gold:0, essence:0, potions:1, gear:[makeItem(),makeItem(),null,null,null,null,null,null], discovered:['dagger'], selected:null, doubleLoot:false, wins:0, current:null, eventIndex:0 }; }
let s = load(); let combatTimer = null; let pointerStart = null;
function load() { try { const stored={...freshState(), ...JSON.parse(localStorage.getItem(stateKey))}; stored.gear=(stored.gear || []).map(item => typeof item==='number' ? (item?makeItem('dagger',item):null) : (item ? {...item,rarity:item.rarity || 'common',affixes:item.affixes || []} : null)).slice(0,8); while(stored.gear.length<8) stored.gear.push(null); stored.discovered=Array.from(new Set([...(stored.discovered || []),...stored.gear.filter(Boolean).map(item=>item.kind)])); return stored; } catch { return freshState(); } }
function save() { localStorage.setItem(stateKey, JSON.stringify(s)); }
function combatStats() { const stats={ damageMin:5, damageMax:8, crit:5, critMultiplier:1.75, armor:0, evasion:3, vitality:0, leech:0, goldBonus:0, thorns:0, absorb:0, haste:0, luck:0 }; s.gear.filter(Boolean).forEach(item => { const definition=itemById[item.kind]; const score=Math.round(item.rank*item.rank*definition.bonus*rarityById[item.rarity].multiplier); if(definition.category==='weapon') { stats.damageMin+=score; stats.damageMax+=score+2; } else if(definition.category==='armor') { stats.armor+=Math.round(score*1.6); stats.vitality+=score*4; } else { stats.damageMin+=Math.round(score*.45); stats.damageMax+=Math.round(score*.7); stats.crit+=Math.round(score*.25); stats.evasion+=Math.round(score*.12); stats.luck+=Math.round(score*.1); } item.affixes.forEach(affix => { const value=affix.value; if(affix.id==='damage') { stats.damageMin+=value; stats.damageMax+=value; } if(affix.id==='crit') stats.crit+=value; if(affix.id==='armor') stats.armor+=value; if(affix.id==='evasion') stats.evasion+=value; if(affix.id==='vitality') stats.vitality+=value; if(affix.id==='leech') stats.leech+=value; if(affix.id==='gold') stats.goldBonus+=value; if(affix.id==='thorns') stats.thorns+=value; if(affix.id==='absorb') stats.absorb+=value; if(affix.id==='haste') stats.haste+=value; if(affix.id==='luck') stats.luck+=value; }); }); stats.maxHp=100+stats.vitality; stats.crit=Math.min(70,stats.crit); stats.evasion=Math.min(45,stats.evasion); stats.leech=Math.min(25,stats.leech); stats.thorns=Math.min(100,stats.thorns); stats.haste=Math.min(120,stats.haste); stats.luck=Math.min(50,stats.luck); return stats; }
function power() { return combatStats().damageMax; }
function maxGearRank() { return Math.max(1, ...s.gear.filter(Boolean).map(item=>item.rank)); }
function rollRarity(elite=false, luck=0) { const roll=Math.max(0,Math.random()-Math.min(.16,luck/1000)); let rarity=roll<.53?'common':roll<.79?'uncommon':roll<.92?'rare':roll<.975?'epic':roll<.996?'legendary':'mythic'; if(elite && Math.random()<.32) rarity=rarities[Math.min(rarities.length-1,rarityIndex(rarity)+1)].id; return rarity; }
function randomItem(rank=1, rarity=null) { const item=itemKinds[Math.floor(Math.random()*itemKinds.length)]; return makeItem(item.id,rank,rarity || rollRarity(false,combatStats().luck)); }
function registerItem(item) { if(!s.discovered.includes(item.kind)) s.discovered.push(item.kind); }
function shopCost() { return 25+s.floor*3; }
function enemyFor(choice) { const [icon,name] = enemies[(s.floor + s.wins) % enemies.length]; const scale = choice === 'yes' ? 1.23 + Math.min(s.floor*.01,.22) : .88 + Math.min(s.floor*.008,.15); const hp = Math.ceil((22 + s.floor * 6) * scale); return { icon, name, hp, maxHp:hp, damage:Math.ceil((2 + s.floor*.55) * (choice === 'yes' ? 1.15 : .72)), reward:Math.ceil((5 + s.floor*2.5) * (choice === 'yes' ? 1.5 : 1)), elite:choice === 'yes' }; }
function currentEvent() { return events[s.eventIndex % events.length]; }
function render() {
  const attributes=combatStats(); s.maxHp=attributes.maxHp; s.hp=Math.min(s.hp,s.maxHp);
  $('gold').textContent = s.gold; $('essence').textContent = s.essence; $('potion-count').textContent=s.potions; $('floor').textContent = s.floor; $('shop-cost').textContent=shopCost();
  $('hp').textContent = Math.max(0,s.hp); $('max-hp').textContent=s.maxHp; $('power').textContent=power();
  $('damage').textContent=`${attributes.damageMin}–${attributes.damageMax}`; $('crit').textContent=`${attributes.crit} %`; $('armor').textContent=attributes.armor; $('evasion').textContent=`${attributes.evasion} %`; $('leech').textContent=`${attributes.leech} %`; $('vitality').textContent=attributes.vitality; $('thorns').textContent=`${attributes.thorns} %`; $('absorb').textContent=attributes.absorb; $('haste').textContent=`${attributes.haste} %`; $('luck').textContent=`${attributes.luck} %`;
  $('hp-bar').style.width = `${Math.max(0,s.hp/s.maxHp*100)}%`;
  const inCombat = Boolean(s.current);
  const event = currentEvent();
  $('decision-title').textContent = inCombat ? 'AUTOBOJ PROBÍHÁ' : event.title;
  $('decision-text').textContent = inCombat ? 'Sir Šmik pracuje sám. Ty můžeš mezitím plánovat, slučovat kořist nebo předstírat, že to bylo taktické.' : event.text;
  $('yes-copy').textContent = event.yes; $('no-copy').textContent = event.no;
  document.querySelectorAll('.choice').forEach(btn => btn.disabled = inCombat);
  $('swipe-hint').textContent = inCombat ? 'Další rozhodnutí přijde po boji.' : 'Vlevo = NE, vpravo = ANO. Jedno gesto, pak se dívej, jak to dopadne.';
  if (s.current) { const e=s.current; $('enemy-icon').textContent=e.icon; $('enemy-name').textContent=(e.elite?'★ ':'')+e.name; $('enemy-hp').textContent=`${e.hp} / ${e.maxHp}`; $('enemy-hp-bar').style.width=`${e.hp/e.maxHp*100}%`; $('battle-status').textContent=e.elite ? 'Elitní problém: dal jsi mu důvod.' : 'Běžný problém: dostal pracovní úkol.'; }
  else { $('enemy-icon').textContent='❔'; $('enemy-name').textContent='Další špatné rozhodnutí'; $('enemy-hp').textContent='vyber cestu'; $('enemy-hp-bar').style.width='0%'; $('battle-status').textContent='Cesta se sama nevybere. Naštěstí jen vlevo nebo vpravo.'; }
  renderGear(); save();
}
function renderGear() { const grid=$('gear-grid'); grid.innerHTML=''; const selected=s.selected === null ? null : s.gear[s.selected]; s.gear.forEach((item,i) => { const button=document.createElement('button'); const definition=item && itemById[item.kind]; const rarity=item && rarityById[item.rarity]; button.className=`gear ${item?`${definition.category} rarity-${item.rarity} rank-${Math.min(item.rank,4)}`:'empty'} ${s.selected===i?'selected':''}`; button.dataset.slot=i; button.setAttribute('aria-label', item?`${rarity.label} ${definition.label}, ${definition.category}, úroveň ${item.rank}`:'Prázdný slot'); button.innerHTML=item?`${definition.icon}<b>${rarity.short}+${item.rank}</b>`:'+'; if (item && selected && selected.kind===item.kind && selected.rank===item.rank && selected.rarity===item.rarity && s.selected!==i) button.style.filter='brightness(1.25)'; grid.append(button); }); const active=s.gear.filter(Boolean).slice(0,3).map(item=>`${itemById[item.kind].icon} ${itemById[item.kind].label} +${item.rank}`); $('loadout').innerHTML=active.length?`Výbava: <b>${active.join(' · ')}</b>`:'Výbava: <b>jen dobré úmysly</b>'; const detail=selected && itemById[selected.kind]; const percentAffixes=['crit','evasion','leech','gold','thorns','haste','luck']; const affixes=selected ? selected.affixes.map(affix=>`${affixById[affix.id].icon} ${affixById[affix.id].label} +${affix.value}${percentAffixes.includes(affix.id)?'%':''}`).join(' · ') : ''; $('item-detail').innerHTML=detail ? `<strong style="color:${rarityById[selected.rarity].color}">${rarityById[selected.rarity].label} ${detail.label} +${selected.rank}</strong> · ${detail.category==='weapon'?'Zbraň':detail.category==='armor'?'Zbroj':'Relikvie'}<br>${affixes || 'Čistý kus bez afixů. Vážně podezřelé.'}` : `Sbírka: <strong>${s.discovered.length}/${itemKinds.length}</strong> předmětů · Common → Uncommon → Rare → Epic → Legendary → Mythic`; }
function toast(text) { const t=$('toast'); t.textContent=text; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),1750); }
function float(text, hurt=false) { const f=$('combat-float'); f.textContent=text; f.style.color=hurt?'#ff93a0':'#fff0a5'; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }
function choose(choice) { if (s.current || s.hp<=0) return; const e=currentEvent(); if (choice==='no' && e.noHeal) { s.hp=Math.min(s.maxHp,s.hp+e.noHeal); toast(`Odmítl jsi. +${e.noHeal} výdrže a žádná důstojnost.`); }
  if (choice==='yes') toast('ANO. To se určitě neobrátí proti tobě.'); else if (!e.noHeal) toast('NE. Podezřele rozumné.');
  s.current=enemyFor(choice); render(); startCombat();
}
function startCombat() { clearInterval(combatTimer); const delay=Math.max(250,Math.round(620/(1+combatStats().haste/100))); combatTimer=setInterval(()=> { if (!s.current) return clearInterval(combatTimer); const e=s.current; const attributes=combatStats(); const critical=Math.random()*100<attributes.crit; let hit=attributes.damageMin+Math.floor(Math.random()*(attributes.damageMax-attributes.damageMin+1)); if(critical) hit=Math.round(hit*attributes.critMultiplier); e.hp-=hit; if(attributes.leech) s.hp=Math.min(s.maxHp,s.hp+Math.max(1,Math.floor(hit*attributes.leech/100))); float(`${critical?'KRIT ':''}-${hit}`); $('enemy-wrap').classList.add('hit'); setTimeout(()=>$('enemy-wrap').classList.remove('hit'),140);
  if (e.hp<=0) return winFight();
  setTimeout(()=> { if (!s.current) return; const defense=combatStats(); if(Math.random()*100<defense.evasion) { float('ÚHYB'); render(); return; } const reduced=Math.min(.65,defense.armor/(defense.armor+120)); const incoming=e.damage+Math.floor(Math.random()*3); const pain=Math.max(0,Math.round(Math.max(0,incoming-defense.absorb)*(1-reduced))); s.hp-=pain; const reflected=Math.floor(pain*defense.thorns/100); if(reflected) e.hp-=reflected; float(`${pain?`-${pain}`:'ABSORB'}${reflected?` ↩${reflected}`:''}`,true); if(e.hp<=0) return winFight(); if (s.hp<=0 && s.potions>0) { s.potions--; s.hp=Math.ceil(s.maxHp*.35); toast('Elixír se sám obětoval. Má hrdinský konec.'); } else if (s.hp<=0) loseFight(); render(); },210); render(); },delay); }
function winFight() { const e=s.current; clearInterval(combatTimer); const doubled=s.doubleLoot; const bonus=combatStats().goldBonus; const earned=Math.round(e.reward*(1+bonus/100)*(doubled?2:1)); s.gold+=earned; s.essence+=(e.elite?3:1)*(doubled?2:1); s.wins++; s.floor++; s.eventIndex++; s.current=null; s.hp=Math.min(s.maxHp,s.hp+5); const found=dropGear(e.elite); if(e.elite && Math.random()<.35) s.potions++; if(doubled) { dropGear(true); s.doubleLoot=false; } toast(`Rozsekáno. +${earned} zlata${found?` a ${found.icon} ${found.label}`:''}${doubled?' · kořist ×2':''}.`); render(); }
function loseFight() { clearInterval(combatTimer); const lost=Math.min(s.gold,Math.ceil(s.gold*.15)); s.gold-=lost; s.hp=Math.ceil(s.maxHp*.65); s.current=null; s.floor=Math.max(1,s.floor-1); toast(`Padl jsi hrdinsky. Daň z hrdinství: ${lost} zlata.`); render(); }
function dropGear(elite) { const empty=s.gear.indexOf(null); const rank=Math.random()<(.22+(elite?.2:0)) ? Math.max(1,maxGearRank()-1) : 1; const rarity=rollRarity(elite,combatStats().luck); const candidates=s.gear.filter(item=>item && item.rank===rank && item.rarity===rarity); const item=candidates.length && Math.random()<.55 ? makeItem(candidates[Math.floor(Math.random()*candidates.length)].kind,rank,rarity) : randomItem(rank,rarity); if(empty>=0) { s.gear[empty]=item; registerItem(item); return itemById[item.kind]; } s.essence+=rank*(1+rarityIndex(rarity)); return null; }
function selectGear(i) { const item=s.gear[i]; if (!item) return; if (s.selected===null) { s.selected=i; $('merge-note').textContent='Vyber stejný kus'; render(); return; } if (s.selected===i) { s.selected=null; $('merge-note').textContent='Najdi pár'; render(); return; } const first=s.gear[s.selected]; if (first.kind===item.kind && first.rank===item.rank && first.rarity===item.rarity) { const atCap=item.rank>=3; const upgradedRarity=rarities[Math.min(rarities.length-1,rarityIndex(item.rarity)+1)].id; const merged=atCap && upgradedRarity!==item.rarity ? makeItem(item.kind,1,upgradedRarity) : makeItem(item.kind,item.rank+1,item.rarity); s.gear[s.selected]=merged; s.gear[i]=null; s.selected=null; $('merge-note').textContent=atCap && upgradedRarity!==item.rarity ? `Vzácnost ${rarityById[upgradedRarity].label}!` : `Vznikla úroveň +${merged.rank}!`; toast(atCap && upgradedRarity!==item.rarity ? `VZÁCNOST STOUPÁ: ${rarityById[upgradedRarity].label}!` : `KŘUP. ${itemById[item.kind].label} je nyní silnější.`); render(); } else { s.selected=i; $('merge-note').textContent='Musí souhlasit název, úroveň i vzácnost'; render(); } }
function forge() { if(s.essence<12) return toast('Kovář kašle do kovadliny: chce 12 ✦.'); s.essence-=12; const empty=s.gear.indexOf(null); if(empty>=0) { const item=randomItem(Math.max(1,maxGearRank()-1),rollRarity(true,combatStats().luck)); s.gear[empty]=item; registerItem(item); toast(`Kovář vyrobil: ${rarityById[item.rarity].label} ${itemById[item.kind].label}.`); } else { s.essence+=6; toast('Kapsy jsou plné. Polovina esence vrácena.'); } render(); }
function shop() { const price=shopCost(); const empty=s.gear.indexOf(null); if(empty<0) return toast('Obchodník odmítá prodávat do plných kapes.'); if(s.gold<price) return toast(`Obchodník chce ${price} ◈. Zatím máš jen pohled.`); s.gold-=price; const item=randomItem(); s.gear[empty]=item; registerItem(item); toast(`Koupeno: ${rarityById[item.rarity].label} ${itemById[item.kind].label}. Účet nevydává.`); render(); }
function heal() { if(s.potions<1) return toast('Elixíry došly. Elitní potvory je mívají v kapsách.'); if(s.hp>=s.maxHp) return toast('Jsi až nepříjemně zdravý.'); s.potions--; const amount=Math.ceil(s.maxHp*.35); s.hp=Math.min(s.maxHp,s.hp+amount); toast(`Elixír: +${amount} výdrže. Chuť: administrativní.`); render(); }
function adReward() { s.doubleLoot=true; save(); toast('Prototyp: vrána odrecitovala reklamu. Další kořist je dvojnásobná.'); }
function resetPlaytest() { if(window.confirm('Resetovat tento lokální průchod? Všechen uložený postup v tomto prohlížeči zmizí.')) { localStorage.removeItem(stateKey); window.location.reload(); } }
document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.choice)));
$('gear-grid').addEventListener('click',(event)=> { const target=event.target.closest('.gear'); if(target) selectGear(Number(target.dataset.slot)); });
$('forge-button').addEventListener('click',forge); $('shop-button').addEventListener('click',shop); $('heal-button').addEventListener('click',heal); $('ad-button').addEventListener('click',adReward);
$('reset-button').addEventListener('click',resetPlaytest);
$('swipe-zone').addEventListener('pointerdown',(event)=> { pointerStart={x:event.clientX,y:event.clientY}; });
$('swipe-zone').addEventListener('pointerup',(event)=> { if(!pointerStart) return; const dx=event.clientX-pointerStart.x, dy=event.clientY-pointerStart.y; pointerStart=null; if(Math.abs(dx)>42 && Math.abs(dx)>Math.abs(dy)) choose(dx>0?'yes':'no'); });
render();
if (s.current) startCombat();
