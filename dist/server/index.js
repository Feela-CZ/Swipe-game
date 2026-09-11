// Sites dispatch supplies authenticated identity. No client-supplied owner IDs.
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const slots=new Set(['auto','1','2','3','legacy']);
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const owner=request.headers.get('oai-authenticated-user-id');
  if(!owner)return json({error:'Pro načtení pozic se přihlas.'},401);
  if(url.pathname!=='/api/saves')return json({error:'Nenalezeno.'},404);
  try{
   if(request.method==='GET'){
    const {results}=await env.DB.prepare('SELECT slot, payload, revision, updated_at FROM game_saves WHERE owner = ?').bind(owner).all();
    return json({saves:results.map(row=>({...row,state:JSON.parse(row.payload),payload:undefined}))});
   }
   if(request.method!=='PUT')return json({error:'Nepodporovaná operace.'},405);
   if(request.headers.get('sec-fetch-site')==='cross-site'||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Neplatný požadavek.'},403);
   const raw=await request.text();if(raw.length>500000)return json({error:'Pozice je příliš velká.'},413);
   const body=JSON.parse(raw),s=body.state;
   if(!slots.has(body.slot)||!Number.isSafeInteger(body.revision)||body.revision<0||!s||s.version!==3||!Number.isSafeInteger(s.level)||s.level<1||!Array.isArray(s.inventory)||!Array.isArray(s.pending)||!s.equipped||!s.growth||!s.settings||typeof s.heroName!=='string')return json({error:'Pozice nemá podporovaný formát.'},400);
   const now=new Date().toISOString(),payload=JSON.stringify(s);
   const result=body.revision===0
    ?await env.DB.prepare('INSERT INTO game_saves (owner, slot, payload, revision, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(owner, slot) DO NOTHING').bind(owner,body.slot,payload,now).run()
    :await env.DB.prepare('UPDATE game_saves SET payload = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND slot = ? AND revision = ?').bind(payload,now,owner,body.slot,body.revision).run();
   if(!result.meta.changes)return json({error:'Na jiném zařízení je novější pozice. Otevři Load Game.'},409);
   return json({slot:body.slot,revision:body.revision+1,updated_at:now});
  }catch(error){console.error('Save service failure',error instanceof Error?error.message:'unknown');return json({error:'Pozice se nepodařilo uložit nebo načíst. Zkus to znovu.'},503);}
 }
};
