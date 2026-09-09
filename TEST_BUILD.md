# Testovací vydání — 9. září 2026

Aktuální sada zahrnuje 29 doménových regresí, generátor dlouhých výprav, kalibraci obtížnosti a integrační test rozhraní. Zachovává kontroly výbavy, atributů, ilustrací, příběhových doher a uložených pozic. Kontrola mobilního rozložení je strukturální, nikoli měřením vykreslené geometrie. Prohlížeč ani fyzický telefon v této iteraci nebyl testován.

Zvuková iterace přidává tests/audio.test.mjs: 24 různých deterministických signálů bez clippingu, omezenou paměť a počet hlasů, cache, vypnutí, hlasitost, přechod na pozadí, chybějící zvukové API a skutečné bojové události. UI test ověřuje panel hlasitosti a uložení nastavení. Testy nenahrazují poslech na telefonu; ten zbývá prakticky ověřit.

## Co ověřují aktuální testy

tests/game.test.mjs používá skutečný engine.js, nikoli oddělený aproximovaný model.
Zahrnuje poškození a haste, růst postavy, migraci starých pozic, příběhové následky,
zachování rozehrané výpravy a taktické pauzy, sloučení bez zhoršení, pravděpodobnosti
štěstí, truhly, ceny, plný inventář, cílené recepty, aktivace jedinečných efektů,
rozdílné bosse, porážku a postup všemi pěti lokalitami.

tests/expedition.test.mjs ověřuje 105 setkání, obě volby každého z nich, 300 tras napříč pěti oblastmi, pořadí příběhových uzlů, zákaz nedávných duplicit, lokální tematické balíky, uložení přesné trasy a síly střetů, doběhnutí starých sedmimístných výprav, omezení táborového obchodu a odloženou odměnu za pomoc.

Finální ověření: EXPEDITION_SAMPLES=500, EXPEDITION_OFFSET=20000, tedy seedy (20001…20500) × 7919. Tato sada nebyla použita k předchozímu ladění. Základní postava má původní dýku, plášť a boty, tři lektvary, odpočívá před startem, přiděluje získané body do síly a nenasazuje nalezenou výbavu. Platí vstup, pomáhá písaři a poslovi, umlčí zvon, vrací prsten, vynechává dobrovolné honičky a elitní hlídky, léčí se v příležitostech k oddechu, využívá kryt střelců a obranu u bosse. Lektvar používá pod 38 % životů a podle peněz doplňuje u potkaných obchodníků. Běžné hlídky bojuje, mýto platí při rezervě alespoň 27 zlata. Trasu ani RNG nečte dopředu.

Výsledky: odpočatý 302/500 (60,4 %); stejná výbava s 50 % životů 192/500 (38,4 %); bezohledná politika (dobrovolné souboje, žádný oddech, riskantní taktika) 0/500; odpočatý s neobvyklým mečem a základním štítem 500/500. Průměr referenční politiky včetně neúspěchů: 9,3 bojů a 0,7 náhodných předmětů před závěrečnou bossovou odměnou. Boss zaručuje další předmět při výhře. Sada není měření chování lidí; 60 % není serverem přidělená šance na výhru. Přibližná výběrová nejistota u 60 % z 500 je ±4 procentní body. Vyšší oblasti jsou regresně průchozí s odpovídající výbavou, nemají samostatně kalibrovaný cíl 60 %.

Výchozí rychlá regrese používá 300 seedů pro každou ze čtyř politik; kontroluje rozmezí 50–70 % pro referenční postavu a horší výsledek bez přípravy. Simulace neklade časové prodlevy. UI průchod má záměrně silnější postavu, aby nevisel na náhodné smrti; obtížnost měří samostatná sada.

tests/ui.test.mjs provádí skutečné UI handlery nad jednoduchým modelem DOM:
čtyři karty, dialogy, obchod, výprava, návrat na mapu, postup bojem přes naplánované
akce, taktika, bossův loot a inventář. Neověřuje vykreslené rozložení v prohlížeči.

## Praktický průchod pro hráče

1. Vyrazit do věže; pomoci písaři a umlčet zvon.
2. U bosse nejprve ustoupit. Pozorovat souvislost přípravy a výsledku.
3. Zkontrolovat garantovaný předmět, materiály a otevření lesa.
4. Při druhé výpravě vzít klíč a zvolit pokladnici. Porovnat bossovu posilu.
5. Ze čtyř pečetí vyrobit Amulet nenasytnosti.
6. U dvou odpovídajících kusů porovnat náhled sloučení a potvrzený výsledek.
7. Uprostřed výpravy otevřít mapu nebo obnovit stránku. Pokračovat na stejném místě.

## Co se tím netvrdí

Bezchybnost na všech zařízeních, dlouhodobá vyváženost, retence, monetizace
ani fyzický telefonní playtest. Tyto věci z automatických testů nevyplývají.
