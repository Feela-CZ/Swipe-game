/* Presentation only: no random rolls, no changes to saved game balance. */
(function(){
'use strict';
const D=globalThis.RPGData;
const people=['Dobrodruh','Krysa s měšcem','Ozbrojený strážný','Lovec s kuší','Bludný strážce','Královský výběrčí','Zakletý jelen','Uvězněný písař','Raněný posel','Kupec s lektvary','Pocestný bez peněz','Zásobovač','Výběrčí mýta','Hlídka s truhlicí','Rodina u cesty','Studna'];
const props=['Poškozený přechod','Zavalená výstroj','Truhla s mincemi','Místo k odpočinku','Poutnická svatyně','Ochranný kruh','Poplašný zvon','Kořeny kolem truhly','Cechovní zásilka'];
const person=i=>({sheet:'characters',cell:i,columns:4,label:people[i]});
const prop=i=>({sheet:'props',cell:i,columns:3,label:props[i]});
function encounter(room,run,battle){
 if(battle){
  if(battle.boss)return {...person([5,6,2,4,5,5][run.area]),label:D.areas[run.area].boss};
  return person(({guard:battle.carriesChest?13:2,thief:1,hunter:3,spirit:4})[battle.kind]??2);
 }
 const kind=room.kind||room.id;
 const characters={clash:2,hunt:1,ambush:3,toll:12,aid:10,trade:9,tracks:13,gate:2,scribe:7,well:15,wounded:8,merchant:9,patrol:2,trail:3,supplies:11};
 const objects={hazard:0,salvage:1,chest:2,respite:3,shrine:4,omen:5,bell:6,camp:3,cache:8};
 if(kind==='boss')return {...person([5,6,2,4,5,5][run.area]),label:D.areas[run.area].boss};
 if(kind==='fork')return prop(run.area===1?7:1);
 if(characters[kind]!==undefined)return person(characters[kind]);
 return prop(objects[kind]??3);
}
globalThis.RPGScenes={encounter,hero:person(0)};
})();
