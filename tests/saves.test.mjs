import assert from 'node:assert/strict';
import worker from '../server.js';
import '../saves.js';
import '../data.js';import '../encounters.js';import '../story.js';import '../engine.js';
const rows=new Map();
const DB={prepare(sql){return {bind(...args){return {
 async all(){assert.match(sql,/WHERE owner = \?/);return {results:[...rows.values()].filter(r=>r.owner===args[0])};},
 async run(){
  if(sql.startsWith('INSERT')){const [owner,slot,payload,updated_at]=args,key=owner+slot;if(rows.has(key))return {meta:{changes:0}};rows.set(key,{owner,slot,payload,updated_at,revision:1});}
  else{const [payload,updated_at,owner,slot,revision]=args,row=rows.get(owner+slot);if(!row||row.revision!==revision)return {meta:{changes:0}};Object.assign(row,{payload,updated_at,revision:revision+1});}
  return {meta:{changes:1}};
 }
};}};}};
const request=(owner='a',options={})=>worker.fetch(new Request('https://test.invalid/api/saves',{...options,headers:{'oai-authenticated-user-id':owner,...options.headers}}),{DB});
const client=()=>new RPGSaves.Saves((url,options)=>request('a',options));
const a=client(),b=client(),game=new RPG.Game();game.setHeroName('Vendel');
await a.refresh();await b.refresh();assert.equal(a.rows.length,0);
await a.write('auto',game.state);assert.equal(a.rows[0].revision,1);
await assert.rejects(()=>b.write('auto',game.state),/novější/);assert.equal(b.ready,false);
await a.write('1',game.state);game.state.gold=999;await a.write('auto',game.state);
await b.refresh();assert.equal(b.rows.find(r=>r.slot==='1').state.gold,35);assert.equal(b.rows.find(r=>r.slot==='auto').state.gold,999);
assert.equal((await (await request('other')).json()).saves.length,0);
assert.equal((await request('')).status,401);
assert.equal((await request('a',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({slot:'evil',revision:0,state:game.state})})).status,400);
assert.equal((await request('a',{method:'PUT',headers:{'Content-Type':'application/json','sec-fetch-site':'cross-site'},body:'{}'})).status,403);
const broken=new RPGSaves.Saves(async()=>{throw new Error('offline')});await assert.rejects(()=>broken.refresh(),/offline/);assert.equal(broken.ready,false);
console.log('Save service tests passed: ownership, revision conflicts, manual/auto isolation, invalid requests and unavailable storage.');
