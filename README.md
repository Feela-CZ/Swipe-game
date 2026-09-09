# NE, ALE ZABÍJÍM — Výpravy Sira Šmika

Přepracovaná mobilní fantasy hra. Jedním tahem rozhoduješ o cestě, pomoci postavám i odpovědi na bossův útok. Hraje se v prohlížeči, postup zůstává na zařízení.

## Dlouhé výpravy — 9. září

Věž / les / důl / hrad / hory mají 55 / 65 / 75 / 85 / 95 míst. Balík obsahuje 105 autorských setkání (65 společných, 8 specifických pro každou oblast) ve 13 mechanických rodinách, vedle hlavních příběhových uzlů. Písař přichází před zvonem, posel a dobrodinci před zásobováním, příprava před bossem. Pozice uzlů jsou losované v příběhově přípustných úsecích. První výprava neopakuje kartu; delší cesty mohou po vyčerpání balíku zopakovat setkání, nikoli v nejbližších 12 místech. Stejná náhodná mechanika nenásleduje bezprostředně po sobě.

Trasa i síla střetů se vylosují při odchodu a ukládají. Renderování ani načtení je nepřelosuje. Starší rozehrané sedmimístné výpravy zůstávají zachované. Boje mají větší dopad na zásoby a neléčí automaticky po vítězství; drobné odměny byly sníženy pro delší formát. Táborový obchod během výpravy nefunguje, potkaní obchodníci ano. Návrat domů dovolí bezplatný odpočinek, ale ukončí rozpracovanou cestu.

Ověřovací sada: odpočatá základní postava vyhrála 302/500 (60,4 %), s polovinou životů 192/500 (38,4 %). Jde o simulaci konkrétních rozumných voleb, průběžného výcviku síly a včasného užití lektvarů; nová kořist se nenasazuje. Není to zaručená šance hráče ani skrytý hod na výhru. Podrobnosti v TEST_BUILD.md.

## Příběh a mobilní ovládání

První mapa je kapitola „Král, který zakázal soumrak“. Král Přesčas drží večer pomocí Koruny posledního světla: mýtná věž zadržuje pocestné, zakletý jelen uzavírá les, důl zásobuje korunu, hrad vede ke královu útěku a horská svatyně k rozbití koruny. Úvod i dohry nabízejí odpověď králi. Repliky jsou charakterizační, bez skrytého bonusu ke statům. Postup dialogu se ukládá; první vítězství má vlastní dohru, opakování je ozvěnou kletby. Otmar v táboře reaguje na návrat a porážku. Není totožný s vězněným písařem.

Pevný rám používá dynamickou výšku viewportu a bezpečné okraje telefonu. Měny jsou trvale nahoře, hlavní volby a navigace dole. Inventář, přehled postavy a delší text mají vlastní posuvnou oblast. Na malé obrazovce a naležato se zmenšuje či skrývá dekorativní scéna, nikoli ovládání. Geometrii na fyzickém zařízení automatické testy nepotvrzují.

Výsledné staty zobrazují základ + součet nasazené výbavy = celkem; kliknutí vysvětluje účinek, limity a zdroje. Štěstí se zobrazuje v bodech a započítává se i do horního atributu. Detail předmětu ukazuje základní vlastnosti, afixy a změnu po nasazení. Všech 48 typů má ilustraci ve třech 4×4 atlasech. Překryv zbraně na portrétu je odstraněný.

## Zvuková sada

24 vlastních procedurálních efektů: zbraně, zásah, blok, úhyb, kritický zásah, lektvary, mince, truhly, kovárna a odměny. Bez převzatých nahrávek a bez hudby. Zapínání a uložená hlasitost jsou pod reproduktorem v horní liště. Na pozadí se zvuky zastaví; chyba zvuku neblokuje hru. Podrobnosti v assets/SOUND-DESIGN.md.

## Spuštění a ověření

- Náhled: node preview-server.mjs, pak http://localhost:4173.
- Herní regrese: node tests/game.test.mjs.
- Generování a vyvážení výprav: node tests/expedition.test.mjs.
- Integrace rozhraní bez skutečného prohlížeče: node tests/ui.test.mjs.
- Vydání statických souborů: node build-site.mjs.
- Zvukové signály a přehrávač: node tests/audio.test.mjs.
- Načítání: data.js → encounters.js → story.js → engine.js → audio.js → game.js. Bez bundleru a externích herních závislostí.

## Herní cyklus

Mapa → příprava → výprava o 55–95 místech → rozhodnutí / průzkum / střetnutí → příprava na finále → pevný boss → garantovaná výbava a materiál → výcvik, nákup nebo slučování → nová výprava.

Pět lokalit má vlastní prostředí, zaměření kořisti, materiál, zakázku a bossovu mechaniku. Po vítězství se odemyká další lokalita a vyšší opakovatelná hrozba. Vyšší hrozba zvyšuje sílu nepřátel i úroveň kořisti; její číslo není omezené koncem kampaně.

Mýtná věž má propojený příběh písaře, klíče, pokladnice a zvonu. Události s poslem a rodinou se pamatují mezi výpravami. Přesný následek se objeví při řešení situace; volby nesdělují univerzální „bezpečné/rizikové“ skóre.

## Výbava a odměny

48 typů předmětů v osmi skutečných slotech: zbraň, levá ruka, hlava, tělo, boty, ruce, prsten a relikvie. Šest vzácností, 1–3 náhodné afixy s četností podle vzácnosti.

Čtyři jedinečné efekty: dýka po úhybu, štít s odvetou, amulet měnící přebytečné léčení na štít a sekera proti zraněným protivníkům. Cílená výroba stojí čtyři místní materiály a deset esence. Každý boss zaručuje předmět a dva materiály; existuje i šance na přímý jedinečný nález.

Běžní protivníci mají nízkou pravděpodobnost výbavy. Truhly mají vyšší šanci. Luck zvyšuje četnost i kvalitu nálezů a zlato z odměn. V obchodě jsou předem uvedené přesné ceny a parametry; prodej a rozklad jsou oddělené.

Merging: vybrat základ, vybrat dárce stejného slotu, prohlédnout náhled a potvrdit. Afixy základu se zachovají; společné geny převezmou vyšší hodnotu. Počet afixů se nezmenší. Základní síla je nejméně o 10 % vyšší než u silnějšího rodiče. Dva kusy +3 stejné rarity zvýší kategorii. Mutace pouze přidává bonus nad garantovaný výsledek.

## Boj a atributy

Síla podporuje poškození a přerušení útoku, odolnost životy a zbroj, obratnost krit a úhyb, inteligence XP a kapacitu speciálního štítu, štěstí nálezy a zlato.

Běžné útoky běží automaticky. Boss se před těžkým úderem zastaví a čeká na ústup/kryt nebo pokus o přerušení. Žádné časové omezení rozhodnutí. Rychlost skutečně zkracuje interval hráčových útoků. Dvě rychlosti prezentace, ruční pauza a automatická pauza při jiné kartě či skrytí prohlížeče. Opasek je dostupný i při taktickém rozhodnutí a může automaticky zachránit život.

Výběrčí používá zvon, jelen léčení kořeny, předák rozbitelný krunýř, král daň ze slabých zásahů a horský strážce sílící lavinu. Běžná hlídka tlumí zásahy, krysa utíká, lovec nabíjí a lesní duch postupně sílí.

## Uložení a hranice ověření

Nový klíč ne-ale-zabijim-v3. Staré pozice v1/v2 se zálohují a převedou: měny, předměty, úrovně, rozdělené body a odemčená místa. Starý rozpracovaný boj se nepřenáší mezi nekompatibilními jádry. Nový průchod v3 ukládá i aktuální místnost a taktické rozhodnutí.

Reset je potvrzovaný a ukládá původní pozici jako zálohu. Hra nemá účet, serverovou synchronizaci, reklamy, platby ani analytiku. Zvuk vzniká místně a spouští se pouze po zapnutí hráčem.

Automatické testy nejsou potvrzením retence ani ergonomie na fyzickém telefonu. Kvalitu dlouhodobého grindu je nutné dále ladit z reálného hraní.

Původní generované ilustrace a přesná zadání jsou v assets/ART-PROMPTS.md. Pro mobil se načítají úsporné WebP kopie, originály zůstávají zachované.
