/* One map = one chapter. First clears advance the story; repeat runs are echoes. */
(function(){
const D=globalThis.RPGData;
D.chapter={
 title:'Král, který zakázal soumrak',villain:'Král Přesčas I.',
 intro:{id:'intro',title:'Vyhláška na návsi',speaker:'Král Přesčas I.',
 text:'Z královské pečeti na vývěsce zazní hlas: „Dokud nebude království dokonalé, nikdo neskončí směnu. Ani slunce.“ Na obzoru už třetí den visí tentýž večer.',
 narration:'Správce tábora Otmar ti ukazuje poznámku pod vyhláškou: kouzlo drží Koruna posledního světla. Cesta k ní vede přes mýtnou věž, les a královské doly.',
 replies:['Tak začnu u vaší věže.','A kdo rozhodne, co je dokonalé?'],
 answers:['„Vstupné platí i hrdinové. Výjimku jsem zamítl předem.“','„Já. Komise by to zbytečně zdržovala.“'],
 closing:'Zlom moc výběrčího v Mýtné věži. Pocestní pak budou moci opustit vesnici.'},
 after:[
  {title:'První zrušená daň',text:'„Bez mýta nebude na údržbu cest,“ ozve se král z pečeti na výběrčího stole. Za oknem právě projíždí první svobodný vůz.',narration:'V účtech nacházíš příkaz uzavřít les. Král svázal strážného jelena kouzlem, aby nikdo neprošel k dolům.',replies:['Vaše cesty nikam nevedou.','Jdu osvobodit les.'],answers:['„Vedou tam, kam jsem povolil.“','„Ten jelen má jasné pokyny. Na rozdíl od vás.“'],closing:'V Šeptajícím lese přeruš královo kouzlo nad jelenem.'},
  {title:'Les znovu ukazuje cestu',text:'„Zvířata bez dozoru jsou nebezpečná,“ zapraská pečeť ve starém dubu. Osvobozený jelen se tiše ztratí mezi stromy.',narration:'Bludné pěšiny se narovnaly. Z jedné vychází horník: jeho druhové stále pracují pod předákem, kterého král proměnil v kámen.',replies:['Nebezpečné byly vaše rozkazy.','Kde je klíč k dolům?'],answers:['„Rozkazy jsou v pořádku. Provedení prověřím.“','„Doly nemají zavírací dobu. Klíč není potřeba.“'],closing:'V Černém dole zlom předákův krunýř a propusť horníky ze směny.'},
  {title:'Poslední úder krumpáče',text:'„Těžba se nemůže zastavit,“ zasyčí pečeť na důlním výkazu. „Koruna potřebuje další rudu.“ Tentokrát v králově hlase slyšíš strach.',narration:'Předákův kamenný krunýř se rozpadl. Horníci ti ukazují nákladní cestu přímo pod hrad. Bez nové rudy koruna slábne.',replies:['Vaše směna právě skončila.','Přijdu si pro tu korunu.'],answers:['„Tohle není ve vaší pravomoci.“','„Tak přijďte osobně. Vyřídím vás bez objednání.“'],closing:'Vstup do Hradu Přesčas a postav se králi v trůnním sále.'},
  {title:'Prázdný trůn',text:'Král se pod tvým posledním úderem zapotácí. Koruna vyšlehne světlem a otevře mu cestu ven. „Dokud ji mám, večer neskončí!“',narration:'Na trůnu zůstal odlomený kus erbu se znakem horské svatyně. Stejný znak má i králova přísaha na zdi: tam lze kouzlo zrušit.',replies:['Utíkáte ze své směny?','Ve svatyni to ukončíme.'],answers:['„Jde o služební cestu!“','„Ve svatyni přísaha platí i pro vás.“'],closing:'V Horách očekávání král čerpá poslední sílu koruny. Pronásleduj ho ke svatyni.'},
  {title:'První skutečný soumrak',text:'Koruna praskne. Král klesne na kolena; kamení nad stezkou se přestane chvět. „Chtěl jsem jen, aby bylo všechno hotové.“',narration:'Slunce konečně zapadá. Z údolí doléhají zvony, tentokrát ne poplašné. Horníci odkládají nářadí a první kupec zavírá krám.',replies:['Zítra je taky den.','Pro dnešek končíte.'],answers:['„A… smím si odpočinout?“','„Dobře. Jen mi to někdo potvrďte.“'],closing:'Pomezí je svobodné. Ve zlomených pečetích zůstaly ozvěny kletby: můžeš se k místům vracet pro výbavu a zkoušet vyšší hrozbu. Králova porážka tím nezmizí.'}
 ]
};
const quests=[
 ['Výběrčí poslední mince','Král vybírá mýto i od těch, kteří nemají kam odejít. Poraž výběrčího a otevři cestu z vesnice.'],
 ['Jelen bludných cest','Královo kouzlo nutí jelena svádět pocestné z cesty. Zlom jeho moc a najdi průchod k dolům.'],
 ['Předák poslední směny','Zdejší ruda živí královu korunu. Zlom předákův krunýř, aby horníci mohli odejít.'],
 ['Král Přesčas I.','Nákladní cesta tě přivedla pod hrad. Projdi strážemi a vezmi králi korunu, která zadržuje soumrak.'],
 ['Král Přesčas, pán přísahy','Král uprchl ke svatyni v horách. Znič korunu u pramene její moci a vrať Pomezí noc.']
];
quests.forEach(([boss,quest],i)=>Object.assign(D.areas[i],{boss,quest}));
D.areas[4].bossArt=3;
D.areas[4].hint='Král uvolňuje kamení nad stezkou. Připravený ústup tě ochrání; nezdařené přerušení přivolá silný zával.';
})();
