# Testovací vydání — 8. září 2026

Aktuální sada zahrnuje 29 doménových regresí, 300 seedovaných průchodů první věží a integrační test rozhraní. Nově ověřuje bonus štěstí po nasazení/sundání, součty a limity atributů, vnořené vysvětlivky, všechny ilustrace, úvod kapitoly a obnovu rozčteného dialogu, všech pět doher, ozvěny místo opětovného oživení krále a reakce na porážku/ústup. Kontrola mobilního rozložení je strukturální, nikoli měřením vykreslené geometrie. Browser ani fyzický telefon v této iteraci nebyl testován.

## Co ověřují aktuální testy

tests/game.test.mjs používá skutečný engine.js, nikoli oddělený aproximovaný model.
Zahrnuje poškození a haste, růst postavy, migraci starých pozic, příběhové následky,
zachování rozehrané výpravy a taktické pauzy, sloučení bez zhoršení, pravděpodobnosti
štěstí, truhly, ceny, plný inventář, cílené recepty, aktivace jedinečných efektů,
rozdílné bosse, porážku a postup všemi pěti lokalitami.

Simulace prvního průchodu věží: 300 deterministických seedů; postava volí pomoc
a přípravu, nasazuje silnější kořist a investuje do síly. Simulace neklade časové
prodlevy a nepředstavuje pozorované lidské chování.

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
