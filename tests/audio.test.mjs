import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope=vm.createContext({console});
for(const file of ['data.js','story.js','engine.js','audio.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),scope);
const {synth,names,Player,weaponCue,RATE}=scope.RPGSound;
const fingerprints=new Set();let bytes=0;
for(const name of names){
 const pcm=synth(name);bytes+=pcm.byteLength;let square=0,peak=0;
 for(const n of pcm){assert.ok(Number.isFinite(n));peak=Math.max(peak,Math.abs(n));square+=n*n;}
 assert.ok(peak>.04&&peak<=.801,name+' peak');assert.ok(Math.sqrt(square/pcm.length)>.008,name+' audible energy');assert.ok(pcm[0]===0);assert.ok(pcm.at(-1)===0);assert.ok(pcm.length/RATE<=1.3);
 fingerprints.add(Array.from(pcm.slice(50,80)).join(','));assert.deepEqual(synth(name),pcm);
}
assert.equal(fingerprints.size,names.length);assert.ok(bytes<2_000_000);
assert.equal(weaponCue('sword'),'blade');assert.equal(weaponCue('mace'),'blunt');assert.equal(weaponCue('bow'),'arrow');assert.equal(weaponCue('wand'),'magic');
class Context{
 constructor(){this.state='suspended';this.currentTime=5;this.destination={};this.started=[];}
 createGain(){return{gain:{value:0},connect(){}};}
 createDynamicsCompressor(){return Object.fromEntries(['threshold','knee','ratio','attack','release'].map(x=>[x,{value:0}]).concat([['connect',()=>{}]]));}
 createBuffer(ch,n,rate){assert.equal(ch,1);assert.equal(rate,RATE);const data=new Float32Array(n);return{getChannelData:()=>data};}
 createBufferSource(){const ctx=this;return{playbackRate:{value:1},connect(){},disconnect(){},start(t){ctx.started.push({source:this,t})},stop(){this.stopped=true;}};}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}
}
const player=new Player({AudioContext:Context});assert.equal(await player.play('block'),false);assert.equal(player.context,null);
player.configure(true,.4);assert.equal(await player.play('block'),true);assert.equal(player.buffers.size,1);assert.ok(player.context.started[0].t>=5);await player.play('block');assert.equal(player.buffers.size,1);
for(let i=0;i<9;i++)await player.play('blade',.1);assert.ok(player.voices.size<=6);
player.configure(false);assert.equal(player.voices.size,0);assert.equal(await player.play('victory'),false);
player.configure(true);const pending=player.play('rare');player.visibility(true);assert.equal(await pending,false);assert.equal(player.voices.size,0);
player.visibility(false);assert.equal(await player.play('rare'),true);player.configure(true,0);assert.equal(player.voices.size,0);assert.equal(await player.play('tap'),false);
let errors=0;const unsupported=new Player({},()=>errors++);unsupported.configure(true);await unsupported.play('tap');await unsupported.play('tap');assert.equal(errors,1);
const g=new scope.RPG.Game(null,()=>.99);g.start();g.fight('guard');g.step();assert.ok(g.drainAudio().includes('strike'));assert.equal(g.drainAudio().length,0);
g.state.hp=20;g.potion();assert.ok(g.drainAudio().includes('potion'));g.state.potions=0;assert.equal(g.potion(),false);assert.equal(g.drainAudio().length,0);
g.state.run.battle.hp=100;g.state.run.battle.maxHp=100;g.state.run.battle.turn='enemy';g.state.equipped={};g.enemy();assert.ok(g.drainAudio().includes('hurt'));
g.state.settings.volume=.35;const restored=new scope.RPG.Game(g.state);assert.equal(restored.state.settings.volume,.35);assert.equal(restored.drainAudio().length,0);assert.ok(!JSON.stringify(g.state).includes('audioEvents'));
console.log('24 original PCM cues verified: distinct finite unclipped signals, bounded memory; playback cache, mute, volume, voice cap, hide/resume, unsupported audio, real combat cues and save migration passed. No physical-speaker listening claim.');
