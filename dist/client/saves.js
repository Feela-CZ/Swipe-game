(function(root){
'use strict';
class Saves {
 constructor(request){this.request=request;this.rows=[];this.ready=false;this.chain=Promise.resolve();this.error='';}
 async api(options){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await this.request('/api/saves',{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal});const body=await response.json();if(!response.ok)throw new Error(body.error||'Ukládání není dostupné.');return body;}
  finally{clearTimeout(timer);}
 }
 async refresh(){await this.chain;try{const body=await this.api();if(!Array.isArray(body.saves))throw new Error('Neplatná odpověď úložiště.');this.rows=body.saves;this.ready=true;this.error='';return this.rows;}catch(e){this.ready=false;this.error=e.message;throw e;}}
 write(slot,state){
  const snapshot=JSON.parse(JSON.stringify(state));
  const task=this.chain.then(async()=>{
   if(!this.ready)throw new Error(this.error||'Nejdřív načti uložené pozice.');
   try{const row=await this.api({method:'PUT',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({slot,state:snapshot,revision:this.rows.find(x=>x.slot===slot)?.revision||0})});this.rows=this.rows.filter(x=>x.slot!==slot);this.rows.push({...row,state:snapshot});this.error='';return row;}
   catch(e){this.ready=false;this.error=e.message;throw e;}
  });
  this.chain=task.catch(()=>{});return task;
 }
}
root.RPGSaves={Saves};
})(globalThis);
