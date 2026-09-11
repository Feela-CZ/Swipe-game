/* One map = one episode. First clears advance one connected story; repeat runs are echoes. */
(function(){
const D=globalThis.RPGData;
D.chapter={
 title:'Král, který zakázal soumrak',mapTitle:'Údolí posledního světla',villain:'Král Přesčas I.',
 summary:'Koruna posledního světla nepřidává čas. Krade lidem večery a mění je v sílu, dokud království nesplní seznam úkolů, který nemá poslední řádek.',
 intro:{id:'intro',title:'Vyhláška bez konce',speaker:'Král Přesčas I.',
 text:'Z královské pečeti na vývěsce zazní hlas: „Dokud nebude království dokonalé, nikdo neskončí směnu. Ani slunce.“ Na obzoru už třetí den visí tentýž večer.',
 narration:'Správce tábora Otmar zjistil, že Koruna posledního světla živí královu posedlost i celé kouzlo. Cestu z vesnice však zavřela Mýtná věž a její výběrčí účtuje i odchod.',
 replies:['Začnu u věže. Kolik má pater?','Kdo rozhodne, že je hotovo?'],
 answers:['„Úředně tři. Prakticky každé další, na které vystoupáte.“','„Já. Komise by mohla mít přestávku.“'],
 closing:'Vystoupej Mýtnou věží od brány přes strojovnu až ke zvonici a otevři cestu z vesnice.'},
 after:[
  {speaker:'Mostmistr Brumla',title:'Most, formulář a jeden velmi pevný troll',text:'Na mostě sedí troll v modré čapce. „Mostmistr Brumla, pověřený nepouštěním. Formulář P-ŘECHOD vám chybí a prázdný formulář byl přeložen do lesa.“ Z pečeti na jeho razítku se ozve králův spokojený kašel.',narration:'Ve věži jsi zrušil mýto a našel králův rozpis: přes most proudí černá ruda pro korunu. Brumla by tě pustil, ale král svázal jeho přísahu s živou lesní pečetí, kterou hlídá zakletý jelen.',replies:['Takže do lesa kvůli papíru. Výborně.','Razítko vám pak vrátím. Možná.'],answers:['„Listu. Je to živý list. Papír by nebyl podle lesní směrnice.“','„Razítko je majetek koruny. Já jsem jen majetek mostu.“'],closing:'V Šeptajícím lese osvoboď jelena a přines živou pečeť, která zruší králův zákaz přechodu.'},
  {speaker:'Král Přesčas I.',title:'Povolení k přechodu',text:'Brumla přitiskne osvobozený list na zábradlí. Kořeny pod mostem povolí. Z královy pečeti zapraská: „Neplatné. Chybí kopie.“ Troll pokrčí rameny: „Most už kopii nechce.“',narration:'Jelen se vrátil do hloubi lesa a stezky přestaly bloudit. Za mostem čeká horník. Černý důl stále těží rudu, která tvoří tělo koruny; směnu hlídá předák proměněný v kamenný krunýř.',replies:['Jedna pečeť stačila. Zkuste se s tím smířit.','Jdu ukončit poslední směnu.'],answers:['„Smíření není v rozpočtu.“','„Doly zavírají, až když je hotovo. Tedy nikdy.“'],closing:'V Černém dole zlom předákův krunýř a zjisti, kam putuje vytěžená ruda.'},
  {speaker:'Horník Doruk',title:'Ruda, která tiká',text:'Předákův krunýř praskne a horníci poprvé odloží krumpáče. Doruk rozlomí kus černé rudy: uvnitř pulzuje modré světlo. „Tohle se netěží hotové. Odvážejí to do jeskyně nad lomem.“',narration:'Nákladní knihy potvrzují, že ruda míří do Jeskyně zadržených hodin. Tam do ní cosi ukládá večery ukradené obyvatelům. Bez této náplně by byla koruna jen přehnaně drahý klobouk.',replies:['Najdu to cosi.','Klobouk pak můžeme králi nechat. Bez magie.'],answers:['„Pozor na ozvěny. Vracejí i slova, která člověk raději nedořekl.“','„Za obyčejný klobouk by se měl stydět sám.“'],closing:'Vstup do Jeskyně zadržených hodin a zastav tvora, který plní rudu ukradeným časem.'},
  {speaker:'Král Přesčas I.',title:'Čas se vrací majitelům',text:'Velký Časomol se rozpadne v hejno modrých jisker. Z královské pečeti se ozve: „Ty hodiny byly řádně zadrženy!“ Z údolí odpoví stovky hodinových zvonů, každý v jiný čas.',narration:'Krystaly vyhasly a lidem se vracejí ztracené večery. Poslední nabitá ruda však už leží v koruně. Na stěně jeskyně najdeš obraz jejího zhotovení: zlomit ji lze pouze po setmění, nebo u horského oltáře, kde král přísahal, že nikdy neodpočine.',replies:['Nejdřív si dojdu pro korunu.','Vaše evidence času má manko.'],answers:['„Na hradě mám stráže, dveře a velmi dlouhou chodbu.“','„Rozdíl převedu do příštího období.“'],closing:'Nákladní stezka z jeskyně vede pod Hrad Přesčas. Pronikni dovnitř a vezmi králi korunu.'},
  {speaker:'Král Přesčas I.',title:'Král, který neuměl skončit',text:'Král couvá od trůnu. „Chtěl jsem jen dokončit velké dílo. Pak přišel další seznam. A další.“ Koruna vyšlehne světlem a odtáhne ho k horské svatyni. „Dokud přísaha platí, večer neskončí!“',narration:'Král přiznal, že koruna mu nejprve pomáhala, potom začala každý splněný úkol nahrazovat dvěma novými. Na trůnu zůstal odlomený erb se znakem horského oltáře. Tam je ukotvena jeho přísaha i poslední zbytek kouzla.',replies:['Utíkáte ze své vlastní směny?','Na hoře ten seznam zavřeme.'],answers:['„Jde o služební přesun!“','„Bez podpisu vedoucího to nepůjde.“'],closing:'Pronásleduj krále do Hor očekávání a zlom korunu u oltáře, kde byla vyslovena jeho přísaha.'},
  {speaker:'Král Přesčas I.',title:'První skutečný soumrak',text:'Koruna praskne. Král klesne na kolena. „Chtěl jsem, aby bylo všechno hotové.“ Nad údolím se konečně pohne slunce a Mostmistr Brumla z dálky slavnostně zavře kancelář o tři minuty dřív.',narration:'Černá ruda se mění v obyčejný kámen a zbytek ukradených hodin se vrací lidem. Horníci odcházejí domů, les ztichne a v Mýtné věži poprvé nikdo nevybírá poplatek za schody.',replies:['Zítra je taky den.','Pro dnešek končíte.'],answers:['„A… smím si odpočinout?“','„Dobře. Jen mi to někdo potvrďte razítkem.“'],closing:'Údolí je svobodné. Ve zlomených pečetích zůstaly ozvěny kletby: můžeš se do míst vracet pro výbavu a zvyšovat hrozbu, aniž by se příběh vracel zpět.'}
 ]
};
const quests=[
 ['Výběrčí poslední mince','Projdi věží od brány přes strojovnu ke zvonici, poraž výběrčího a otevři jedinou cestu z vesnice.'],
 ['Jelen bludných cest','Mostmistr Brumla tě bez živé lesní pečeti nepustí. Osvoboď jelena, který ji střeží proti své vůli.'],
 ['Předák poslední směny','Černá ruda živí královu korunu. Zlom předákův krunýř, propusť horníky a najdi cestu zásilek.'],
 ['Velký Časomol','V jeskyni se do černé rudy ukládají ukradené večery. Rozbij krystaly a zastav Velkého Časomola.'],
 ['Král Přesčas I.','Jeskynní stezka vede pod hrad. Projdi strážemi a vezmi králi korunu, která zadržuje soumrak.'],
 ['Král Přesčas, pán přísahy','Král uprchl k horskému oltáři. Zlom tam korunu i přísahu, která nedovoluje údolí odpočívat.']
];
quests.forEach(([boss,quest],i)=>Object.assign(D.areas[i],{boss,quest}));
D.areas[5].bossArt=3;
D.areas[5].hint='Král uvolňuje kamení nad stezkou. Připravený ústup tě ochrání; nezdařené přerušení přivolá silný zával.';
})();
