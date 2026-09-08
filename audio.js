/* Original procedural foley. No recordings, remote audio or third-party samples. */
(function(){
'use strict';
const RATE=22050,TAU=Math.PI*2;
const names=['tap','page','blade','blunt','arrow','magic','hurt','block','dodge','critical','potion','coins','equip','chest','forge','salvage','loot','rare','victory','defeat','warning','level','shield','thorns'];
function synth(name){
 const duration=({rare:1.1,victory:1.2,defeat:1,level:1,forge:.85,magic:.65,chest:.6,potion:.65,coins:.65,warning:.65})[name]||.42;
 const data=new Float32Array(Math.ceil(duration*RATE));let seed=names.indexOf(name)+917;
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296*2-1;};
 function tone(f,to,start,length,amp,decay=length/3,rich=0){
  let phase=0;for(let i=0;i<length*RATE;i++){const at=Math.floor(start*RATE)+i;if(at>=data.length)break;const t=i/RATE;
   phase+=TAU*(f+(to-f)*t/length)/RATE;
   const env=Math.min(1,t/.004)*Math.exp(-t/decay)*Math.min(1,(length-t)/.015);
   data[at]+=amp*env*(Math.sin(phase)+rich*Math.sin(phase*2)+rich*.4*Math.sin(phase*3));
  }
 }
 function noise(start,length,amp,smooth=.12,swish=false){
  let low=0,previous=0;for(let i=0;i<length*RATE;i++){const at=Math.floor(start*RATE)+i;if(at>=data.length)break;const t=i/RATE,x=rand();low+=smooth*(x-low);const high=low-previous;previous=low;
   const env=swish?Math.sin(Math.PI*t/length)**2:Math.min(1,t/.003)*Math.exp(-t/(length*.18))*Math.min(1,(length-t)/.012);
   data[at]+=amp*env*(swish?high*3:low*2);
  }
 }
 const metal=(start,f=670,amp=.16)=>{[1,1.47,2.09,2.71].forEach((m,i)=>tone(f*m,f*m*.998,start,.34,amp/(i+1),.12-i*.02));noise(start,.045,.2,.7);};
 const thud=(start=0,amp=.5)=>{tone(180,48,start,.22,amp,.055,.22);noise(start,.14,.5,.07);};
 const chime=(notes,start=0,step=.09,amp=.15)=>notes.forEach((f,i)=>{tone(f,f,start+i*step,.44,amp,.15,.1);tone(f*2.003,f*2,start+i*step,.3,amp*.2,.08);});
 switch(name){
  case 'tap':tone(920,280,0,.07,.18,.012);noise(0,.045,.2,.12);break;
  case 'page':noise(0,.20,.48,.28,true);noise(.1,.19,.25,.12,true);break;
  case 'blade':noise(0,.13,.8,.4,true);metal(.085,810,.15);thud(.095,.3);break;
  case 'blunt':noise(0,.1,.55,.18,true);thud(.055,.7);tone(320,120,.06,.18,.18,.03);break;
  case 'arrow':tone(370,95,0,.13,.4,.025,.5);noise(.035,.19,.65,.45,true);thud(.19,.22);break;
  case 'magic':noise(0,.37,.6,.15,true);tone(190,1100,0,.38,.25,.19);chime([660,990,1320],.20,.045,.13);break;
  case 'hurt':thud(0,.65);noise(.01,.2,.6,.14);break;
  case 'block':metal(0,470,.29);metal(.025,910,.08);thud(0,.18);break;
  case 'dodge':noise(0,.19,.85,.4,true);noise(.09,.24,.55,.12,true);break;
  case 'critical':thud(0,.55);metal(.01,1250,.14);noise(.01,.15,.7,.5);break;
  case 'potion':tone(550,190,0,.065,.27,.02);[0,.07,.15,.24,.34].forEach((t,i)=>tone(180+i*53,510+i*110,t+.08,.14,.2,.055));chime([740,990],.39,.07,.09);break;
  case 'coins':[720,1030,1380,940,1650].forEach((f,i)=>metal(i*.065,f,.08));break;
  case 'equip':noise(0,.15,.4,.12,true);metal(.12,490,.12);break;
  case 'chest':noise(0,.4,.55,.04,true);tone(110,175,.03,.28,.24,.12,.35);thud(.3,.23);metal(.34,650,.1);break;
  case 'forge':metal(0,430,.24);thud(0,.25);metal(.24,570,.20);chime([880,1100,1320],.43,.07,.12);break;
  case 'salvage':noise(0,.34,.65,.5,true);chime([1700,1100,720],.06,.075,.1);break;
  case 'loot':chime([660,880],0,.09,.2);break;
  case 'rare':noise(0,.5,.4,.1,true);chime([440,660,880,1100,1320],.08,.1,.2);break;
  case 'victory':chime([392,494,587,784],0,.14,.2);[196,294,392].forEach(f=>tone(f,f,.48,.65,.08,.25,.35));break;
  case 'defeat':chime([330,277,220,165],0,.14,.15);tone(82,65,.3,.65,.24,.24);break;
  case 'warning':thud(0,.32);thud(.27,.35);tone(110,100,0,.58,.18,.3);break;
  case 'level':chime([523,659,784,1047],0,.13,.19);break;
  case 'shield':metal(0,1200,.09);tone(330,440,0,.34,.25,.14);break;
  case 'thorns':noise(0,.13,.65,.6);tone(620,130,0,.19,.25,.04);break;
 }
 // Gentle saturation, DC removal and short edge fades prevent clicks/clipping.
 const mean=data.reduce((sum,x)=>sum+x,0)/data.length;let peak=0;
 for(let i=0;i<data.length;i++){data[i]=Math.tanh((data[i]-mean)*1.15)*Math.min(1,i/90,(data.length-1-i)/220);peak=Math.max(peak,Math.abs(data[i]));}
 if(peak>.8)for(let i=0;i<data.length;i++)data[i]*=.8/peak;
 return data;
}
function weaponCue(kind){
 if(['bow','crossbow'].includes(kind))return 'arrow';
 if(['wand','staff','lute'].includes(kind))return 'magic';
 if(['mace','gavel','frying-pan','broom','umbrella'].includes(kind))return 'blunt';
 return 'blade';
}
class Player{
 constructor(host=globalThis,onError=()=>{}){this.host=host;this.onError=onError;this.enabled=false;this.volume=.55;this.context=null;this.buffers=new Map();this.voices=new Set();this.epoch=0;this.failed=false;this.hidden=false;}
 configure(enabled,volume=.55){this.enabled=!!enabled;this.volume=Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):.55;if(this.master)this.master.gain.value=this.enabled?this.volume*.55:0;if(!this.enabled||!this.volume)this.stop();}
 async unlock(){
  if(!this.enabled||this.hidden)return false;
  try{
   if(!this.context){const C=this.host.AudioContext||this.host.webkitAudioContext;if(!C)throw Error('Audio unavailable');this.context=new C();this.master=this.context.createGain();const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;this.master.connect(limiter);limiter.connect(this.context.destination);this.master.gain.value=this.volume*.55;}
   if(this.context.state==='suspended')await this.context.resume();return this.context.state==='running';
  }catch{if(!this.failed){this.failed=true;this.onError();}return false;}
 }
 async play(name,delay=0){
  if(!this.enabled||!this.volume||this.hidden||!names.includes(name))return false;const epoch=this.epoch;
  if(!await this.unlock()||epoch!==this.epoch||!this.enabled||this.hidden)return false;
  try{
   const ctx=this.context;if(!this.buffers.has(name)){const samples=synth(name),buffer=ctx.createBuffer(1,samples.length,RATE);buffer.getChannelData(0).set(samples);this.buffers.set(name,buffer);}
   if(this.voices.size>=6){const oldest=this.voices.values().next().value;oldest.stop();this.voices.delete(oldest);}
   const source=ctx.createBufferSource();source.buffer=this.buffers.get(name);source.playbackRate.value=['loot','rare','victory','level','defeat'].includes(name)?1:.96+Math.random()*.08;
   source.connect(this.master);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();};source.start(ctx.currentTime+Math.min(.6,Math.max(0,delay)));return true;
  }catch{if(!this.failed){this.failed=true;this.onError();}return false;}
 }
 stop(){this.epoch++;for(const source of this.voices){try{source.stop();source.disconnect();}catch{}}this.voices.clear();}
 visibility(hidden){this.hidden=hidden;if(hidden){this.stop();if(this.context?.state==='running')this.context.suspend().catch(()=>{});}}
}
globalThis.RPGSound={Player,synth,names,weaponCue,RATE};
})();
