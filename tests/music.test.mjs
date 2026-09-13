import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope=vm.createContext({console});
for(const file of ['data.js','encounters.js','story.js','engine.js','audio.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),scope);
const {Music,musicTracks}=scope.RPGSound;
for(const file of musicTracks)await access(new URL('../'+file,import.meta.url));
class Media{
 constructor(){this.paused=true;this.currentTime=0;this.events={};this.starts=0;}
 set src(value){this.path=value;this.currentTime=0;}get src(){return this.path;}
 addEventListener(name,callback){this.events[name]=callback;}
 play(){this.starts++;this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 end(){this.paused=true;this.events.ended();}
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
let errors=0;const music=new Music({Audio:Media},()=>errors++);
music.configure(true,.3);assert.equal(music.media,null,'No download or playback before interaction');
music.activate();await settle();assert.equal(music.media.src,musicTracks[0]);assert.equal(music.media.loop,false);
music.media.currentTime=37;for(let i=0;i<15;i++){music.configure(true,.3);music.activate();}
assert.equal(music.media.currentTime,37);assert.equal(music.media.starts,1,'Turns and tabs do not restart playback');
music.media.end();await settle();assert.equal(music.media.src,musicTracks[1]);
music.media.end();await settle();assert.equal(music.media.src,musicTracks[0],'Playlist repeats in order');
music.media.currentTime=18;music.visibility(true);assert.ok(music.media.paused);
music.visibility(false);await settle();assert.equal(music.media.currentTime,18);assert.equal(music.media.paused,false);
music.configure(false,.3);music.media.currentTime=19;assert.ok(music.media.paused);music.activate();assert.ok(music.media.paused);
music.configure(true,0);assert.ok(music.media.paused);music.configure(true,.5);await settle();assert.equal(music.media.currentTime,19);assert.equal(music.media.volume,.325);
const pending=new Music({Audio:Media});pending.activate();pending.visibility(true);await settle();assert.ok(pending.media.paused,'Pending play cannot escape background mute');
class Blocked extends Media{play(){this.starts++;return Promise.reject(Object.assign(new Error('gesture'),{name:'NotAllowedError'}));}}
const blocked=new Music({Audio:Blocked},()=>errors++);blocked.activate();await settle();assert.equal(errors,0,'Autoplay refusal is recoverable');
blocked.activate();await settle();assert.equal(blocked.media.starts,2);
const old=new scope.RPG.Game();delete old.state.settings.music;delete old.state.settings.musicVolume;
const migrated=new scope.RPG.Game(old.state);assert.equal(migrated.state.settings.music,true);assert.equal(migrated.state.settings.musicVolume,.3);
migrated.state.settings.music=false;migrated.state.settings.musicVolume=.15;
const reloaded=new scope.RPG.Game(migrated.state);assert.equal(reloaded.state.settings.music,false);assert.equal(reloaded.state.settings.musicVolume,.15);
console.log('Music: playlist order, no restarts, gesture gate, independent volume/mute, background pause, autoplay rejection and saved settings passed.');
