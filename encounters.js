/* Authored encounter decks. Route construction never rolls during rendering. */
(function(){
'use strict';
const D=globalThis.RPGData;
const groups={
 clash:{choices:['Postavit se mu','Zkusit ho obejít'],rows:[
 ['Hlídka s rozkazem','Strážný rozevře králův zatykač. Podoba nesedí, ale na zatčení mu to prý stačí.'],
 ['Obsazený průchod','Ozbrojenec zatarasil cestu. Za jeho zády vede úzká mezera mezi kamením.'],
 ['Kontrola povolení','Hlídač chce povolení k pohybu. Formulář údajně vydává až jeho nadřízený na konci cesty.'],
 ['Spící stráž','Strážný dřímá opřený o kopí. Vedle něj chrastí volné kameny.'],
 ['Nová směna','Přichází vystřídání hlídky. Jeden voják zůstal pozadu a právě si tě všiml.']]},
 hunt:{choices:['Dohnat zloděje','Nechat ho utéct'],rows:[
 ['Měšec na útěku','Krysa vleče ukradený měšec. Zmizet může jedinou skulinou přímo před tebou.'],
 ['Zloděj zásob','Velká krysa odtahuje balíček sucharů. Na rozloučenou ti ukázala zuby.'],
 ['Cinkání za rohem','Za kamenem mizí chlupatý ocas. Cinkání mincí prozrazuje, že je jeho majitel právě při práci.'],
 ['Ztracená brašna','Brašna s přetrženým popruhem se pohybuje proti větru. Pod ní zahlédneš krysí tlapy.'],
 ['Zubatý výběrčí','Krysa sedí na cizí peněžence. Razítko nemá, ale pokus o výběr daně je zřejmý.']]},
 ambush:{choices:['Vyrazit proti střelci','Krýt se a přiblížit'],rows:[
 ['Lesk hrotu','V úkrytu před tebou se zaleskne šipka. Střelec právě natahuje tětivu.'],
 ['První varování','Šipka se zabodne vedle tvé boty. Druhá už míří výš.'],
 ['Číhající lovec','Lovec tě sleduje z vyvýšeného místa. Mezi vámi leží několik velkých kamenů.'],
 ['Připravená kuše','Zaslechneš cvaknutí spouště naprázdno. Lovec zaklel a sahá po nové šipce.'],
 ['Špatná skrýš','Střelcovu skrýš prozrazuje přečnívající klobouk. Zbytek lovce už o tobě ví.']]},
 toll:{choices:['Zaplatit 9 zlata','Odmítnout a bojovat'],rows:[
 ['Poplatek za průchod','Hlídka vybírá devět zlatých za průchod. Tabulka s poplatkem je ještě mokrá.'],
 ['Daň z bot','Voják ukazuje na tvé boty. „Dvě nohy, jedna zvýhodněná sazba. Devět zlatých.“'],
 ['Clo pro hrdiny','Strážný má zvláštní sazebník pro ozbrojené návštěvy: devět zlatých nebo zadržení.'],
 ['Kontrola zavazadel','Prohlídka prý trvá do zítřka. Devět zlatých by strážnému vrátilo důvěru v lidstvo.'],
 ['Právo na odchod','Voják žádá devět zlatých za to, že tě nebude zdržovat. Už vytahuje meč.']]},
 hazard:{choices:['Přejít opatrně','Zkusit rychlou zkratku'],rows:[
 ['Uvolněné kameny','Kameny pod nohama se hýbou. Bezpečnější okraj je úzký a musíš se protáhnout trním.'],
 ['Prasklá lávka','Lávka má zlomenou příčku. Lze se přidržet lana, nebo přeskočit mezeru.'],
 ['Rezavá past','Drát u země vede k napnutému rameni pasti. Obejít ji znamená prodírat se ostrými větvemi.'],
 ['Kluzký práh','Voda smáčí hladký kámen. Podél stěny jsou ostré výstupky, středem vede krátká cesta.'],
 ['Ztrouchnivělý žebřík','Žebřík má ještě několik pevných příček. Vedle něj by šlo vyšplhat přímo po kameni.']]},
 salvage:{choices:['Vyprostit materiál','Šetřit síly'],rows:[
 ['Zlomený talisman','V kameni vězí úlomek talismanu. Vysekat ho půjde, ale bez odřených rukou ne.'],
 ['Přimrzlý váček','Váček s esencí přichytila ke skále magická jinovatka. Na dotek nepříjemně pálí.'],
 ['Zavalená výstroj','Pod kamením leží rozbitá očarovaná zbroj. Zůstala v ní trocha použitelné esence.'],
 ['Vyschlá pečeť','Pečeť se odlupuje z desky v ostrých kusech. Její esence by šla znovu použít.'],
 ['Drátěný svazek','Pouzdro s esencí drží ostnatý drát. Holou rukou to bude bolet.']]},
 chest:{choices:['Páčit schránku','Vzít volné mince'],rows:[
 ['Opuštěná schránka','Zamčená schránka má ostrý prasklý okraj. Vedle ní leží několik vysypaných mincí.'],
 ['Bedna bez majitele','Na bedně není jméno. Víko drží rezavé hřeby, drobné vedle ní jsou volně k sebrání.'],
 ['Ztracený náklad','Z nákladu zbyla zavřená truhlice a mince v prachu. Zámek někdo poškodil.'],
 ['Plechová pokladnička','Pokladnička chrastí, ale klíčová dírka je zalitá kovem. Venku zůstaly drobné.'],
 ['Skrytá přihrádka','Přihrádku kryje ostrý kovový plech. V otevřené části leží pár zlatých.']]},
 respite:{choices:['Ošetřit rány','Prohledat okolí'],rows:[
 ['Závětří','Suchý kout je chráněný před hlídkami. Pár minut klidu by stačilo na obvazy.'],
 ['Zapomenutá lavice','Lavice je pevná a nikdo ji nehlídá. Na zdejším území nezvyklá kombinace.'],
 ['Teplé uhlíky','Někdo tu nedávno odpočíval. Ohniště ještě hřeje a kolem jsou rozházené drobnosti.'],
 ['Klid za balvanem','Za balvanem utichl vítr i kroky hlídek. Můžeš si konečně srovnat dech.'],
 ['Suchý přístřešek','Přístřešek má děravou střechu, ale dnes neprší. Pro krátký oddech je to luxus.']]},
 aid:{choices:['Dát 8 zlata na cestu','Popřát šťastnou cestu'],rows:[
 ['Cestář bez mzdy','Cestář nedostal zaplaceno. Za osm zlatých se dostane domů; slibuje, že tě cestou doporučí zásobovačům.'],
 ['Ztracená peněženka','Pocestná přišla o peníze. Chybí jí osm zlatých na návrat a zná lidi, kteří nosí proviant.'],
 ['Učeň za branou','Učeň utekl ze směny. Osm zlatých mu zajistí cestu domů. Jeho příbuzní zásobují zdejší tábořiště.'],
 ['Prázdný vozík','Vozka stojí bez nákladu i peněz. Za osm zlatých opraví kolo a předá zprávu svým zásobovačům.'],
 ['Osm zlatých','Dělnice má přesně spočítáno, kolik stojí odchod z královy služby. Nabízí ti na oplátku dobrou zmínku u zásobovačů.']]},
 shrine:{choices:['Omytí ran','Prostudovat zápis'],rows:[
 ['Cestovní svatyně','U malé svatyně stojí čistá voda. Do podstavce někdo vyryl radu pro další poutníky.'],
 ['Kamenný svědek','Na kameni je starý nápis a u paty miska s čistou vodou. Z dálky už slyšíš kroky.'],
 ['Zápis poutníka','Poutník tu zanechal zápisník a vodu na omytí ran. Na obojí před návratem hlídky není čas.'],
 ['Zastavení u cesty','Ve výklenku najdeš čistou vodu a podrobný popis zdejšího opevnění.'],
 ['Tiché místo','U staré sošky visí rady předchozích výprav. Někdo pod ni postavil nádobu s vodou.']]},
 trade:{choices:['Koupit lektvar · 18 zlata','Zeptat se na cestu'],rows:[
 ['Cestující lékárnice','Lékárnice prodává poslední lahvičku za osmnáct zlatých. Cestu má pečlivě zakreslenou.'],
 ['Obchod z brašny','Kupec vytáhne neporušený elixír. „Osmnáct. Za radu si nic neúčtuji, zatím.“'],
 ['Polní prodej','Zásobovač má jednu lahvičku navíc. Nabízí ji za osmnáct zlatých a zná okolní průchody.'],
 ['Poslední zásoba','Obchodnice se chystá odejít. Poslední elixír stojí osmnáct, orientační rada je zdarma.'],
 ['Kupec na odchodu','Kupec balí stánek. Než odejde, prodá ti lektvar za osmnáct zlatých nebo ukáže bezpečný průchod.']]},
 tracks:{choices:['Sledovat ozbrojence','Držet se své cesty'],rows:[
 ['Těžké stopy','Čerstvé otisky obrněných bot vedou stranou. Jejich majitel něco těžkého vleče.'],
 ['Cinkající náklad','Ozbrojenec táhne uzavřenou bednu. Odbočil z hlavní cesty a rozhlíží se po pronásledovateli.'],
 ['Opuštěné stanoviště','Velitel hlídky odešel s truhlicí. Po zemi se táhne čerstvá rýha.'],
 ['Kořist pod pláštěm','Obrněný strážný nese pod pláštěm hranatý balík. Míří na opuštěné místo.'],
 ['Soukromá zásilka','Voják si odnáší bednu mimo služební trasu. Nejvyšší čas na přepad, pokud o něj stojíš.']]},
 omen:{choices:['Upevnit ochranu · 6 zlata','Vzít minci z podstavce'],rows:[
 ['Uvolněná runa','Ochranná runa se rozpadá. Šest zlatých v drážce obnoví kruh. Jedna starší mince už v něm leží.'],
 ['Kruh pod prachem','Pod prachem objevíš ochranný kruh s mincí uprostřed. K obnovení chybí šest zlatých na jeho obvodu.'],
 ['Prasklý znak','Na znaku ochrany chybí šest kovových vložek. Zlaté mince by je nahradily; jedna původní tu zůstala.'],
 ['Poutnická ochrana','Návod na kameni říká: šest mincí do kruhu posílí štít. Mince uprostřed je předchozí obětina.'],
 ['Zhasínající pečeť','Pečeť pohasíná u osamělé mince. Šest dalších by na chvíli vrátilo její ochrannou sílu.']]}
};
const regional=[
 [
 ['clash','Schodišťová hlídka','Na otočce schodů stojí strážný. Za zábradlím je úzký ochoz.'],
 ['ambush','Střílna','Ze střílny trčí kuše. Ke zdi vede krytý okraj schodiště.'],
 ['toll','Daň z patra','Voják vybírá devět zlatých za vstup do další části věže. Razítko má stejné jako dole.'],
 ['hunt','Krysa účetní','Krysa odnáší měšec ze zabaveného majetku. V papírech se už zřejmě vyzná.'],
 ['hazard','Zborcené schody','Schod propadl do sklepa. Po okraji vede úzký průchod přes ostré třísky.'],
 ['respite','Prázdná strážnice','Ve strážnici je lavice a suché obvazy. Hlídka si odskočila k výplatnímu okénku.'],
 ['chest','Zabavený majetek','Poškozená schránka stojí v regálu zabavených věcí. Vedle zůstaly drobné.'],
 ['aid','Propuštěný nosič','Nosič si konečně odpracoval pokutu. Osm zlatých mu chybí na cestu domů; zná zásobovače věže.']
 ],[
 ['clash','Hlídač paseky','Králův strážný přehradil pěšinu. Za jeho zády vede houštím úzký průchod.'],
 ['ambush','Lovec v koruně','Z větví míří lovec. Kmeny ti poskytují kryt, pokud se k němu přiblížíš pomalu.'],
 ['toll','Mýto na pěšině','Lesní hlídka požaduje devět zlatých. Daň ze stínu prý platí i v podmračený den.'],
 ['hunt','Kořist v kapradí','Krysa se prodírá kapradím s ukradenou brašnou. Zip vydává pravidelné cinkání.'],
 ['hazard','Mokré kořeny','Kořeny kloužou nad strží. Při kraji se dá projít ostružiním, nebo zkusit přeskok.'],
 ['respite','Dutý dub','Dutina dubu chrání před větrem. Je tu místo na obvazy i krátký oddech.'],
 ['chest','Schránka v pařezu','V pařezu uvízla uzamčená schránka. Hřebíky trčí ven, několik mincí leží v mechu.'],
 ['aid','Ztracená bylinkářka','Bylinkářka našla cestu z bludného kruhu, ale nemá na návrat. Za osm zlatých ti slíbí zprávu lesním zásobovačům.']
 ],[
 ['clash','Dozorce štoly','Dozorce stojí u výztuže. Vedle něj se dá protáhnout mezerou mezi trámy.'],
 ['ambush','Kuše nad kolejemi','Lovec míří z plošiny nad kolejemi. Vozíky by mohly zakrýt tvůj příchod.'],
 ['toll','Poplatek za vzduch','Dozorce chce devět zlatých za větrání. Upozornění na vlastní dýchání odmítá uznat.'],
 ['hunt','Důlní zloděj','Krysa tlačí měšec po kolejnici. Do vedlejší štoly to má jen pár kroků.'],
 ['hazard','Prasklá výztuž','Trám praská nad cestou. Bezpečnější okraj lemuje ostrá břidlice.'],
 ['respite','Bývalá svačinárna','Na lavici zbyly obvazy. Nápis „přestávka zrušena“ už někdo přeškrtl.'],
 ['chest','Důlní skříňka','Skříňka zůstala zamčená, ale panty jsou nalomené. Na dně vozíku leží mince.'],
 ['aid','Horník na odchodu','Horník chce odvést rodinu z dolu. Chybí mu osm zlatých a jeho bratr vozí proviant.']
 ],[
 ['clash','Strážce krystalů','Strážný hlídá komoru, kde modré krystaly polykají světlo. Za jeho zády pokračuje nákladní stezka.'],
 ['ambush','Kuše mezi ozvěnami','Cvaknutí tětivy se vrací ze tří směrů. Skutečný střelec se krčí za nejtmavším krystalem.'],
 ['toll','Poplatek za promarněný čas','Písař žádá devět zlatých za hodiny, které jsi v jeskyni ještě nestihl promarnit.'],
 ['hunt','Krysa s přesýpacími hodinami','Krysa táhne malé přesýpací hodiny. Písek v nich padá vzhůru a měšec vedle nich úplně obyčejně cinká.'],
 ['hazard','Prasklý časový krystal','Krystal před tebou praská v pravidelném rytmu. Okraj komory je bezpečnější, ale plný ostrých střepů.'],
 ['respite','Tichá kapsa','V malé dutině se ozvěna nevrací. Leží tu obvazy horníků a několik minut skutečného klidu.'],
 ['chest','Schránka v modrém kameni','Do krystalu zarostla zamčená schránka. Uvolněný okraj řeže a kolem leží několik mincí.'],
 ['aid','Horník bez včerejška','Horník si nepamatuje včerejší večer, ale cestu ven ano. Za osm zlatých se dostane domů a pošle ti zásoby.']
 ],[
 ['clash','Palácová stráž','Strážný stojí v chodbě pod královým portrétem. Za závěsem vede služební průchod.'],
 ['ambush','Balkonový střelec','Střelec na galerii právě nabíjí. Sloupy dole poskytují trochu krytu.'],
 ['toll','Vstup do předsálí','Komorní stráž vyžaduje devět zlatých. Prý nejde o úplatek, ale o rychlejší vyřízení.'],
 ['hunt','Královská krysa','Krysa odnáší měšec z kuchyně. Na stuze má královský erb, na zuby to nemá vliv.'],
 ['hazard','Propadlá galerie','Část podlahy se zřítila. Podél stěny zůstala cesta přes ostré střepy.'],
 ['respite','Pokoj pro služebnictvo','Pokoj je prázdný. Na stole leží obvazy a studená snídaně ze včerejší směny.'],
 ['chest','Pokladna komorníka','Pokladna má zaseknutý zámek a ostrý okraj. Drobné vedle ní nikdo nehlídá.'],
 ['aid','Kuchař bez výplaty','Kuchař potřebuje osm zlatých na odchod. Pokud pomůžeš, požádá své dodavatele o proviant pro tebe.']
 ],[
 ['clash','Hlídka průsmyku','Voják zatarasil průsmyk. Úzká stezka za jeho zády vede kolem skály.'],
 ['ambush','Střelec na římse','Na římse se objeví lovec s kuší. Níže leží kameny dost velké na ukrytí.'],
 ['toll','Výšková přirážka','Voják chce devět zlatých za průchod sedlem. „Čím výš jdete, tím dražší služba.“'],
 ['hunt','Kořist na sněhu','Krysa táhne brašnu přes sníh. Stopa vede k malé škvíře ve skále.'],
 ['hazard','Ledový žlab','Žlab pokrývá led. Při kraji se dá projít přes ostré kameny, střed lze přeskočit.'],
 ['respite','Horská útulna','Útulna má suchou podlahu a pár obvazů. Vítr zůstal za dveřmi.'],
 ['chest','Zavátá schránka','Zpod sněhu trčí zamčená schránka s roztrženým plechem. U ní leží zlaté mince.'],
 ['aid','Promrzlý nosič','Nosič potřebuje osm zlatých na sestup s karavanou. Slíbí, že její zásobovače pošle tvým směrem.']
 ]
];
const encounters=[];
for(const [kind,group] of Object.entries(groups))group.rows.forEach(([title,text],i)=>encounters.push({id:'event-'+kind+'-'+i,kind,title,text,choices:group.choices,hints:['','']}));
regional.forEach((rows,area)=>rows.forEach(([kind,title,text],i)=>encounters.push({id:'local-'+area+'-'+i,area,kind,title,text,choices:groups[kind].choices,hints:['','']})));
D.encounters=encounters;D.encounterById=Object.fromEntries(encounters.map(x=>[x.id,x]));
D.expeditionLengths=[55,65,75,82,90,100];
})();
