// Deployment format conversion. Original generated assets remain untouched.
const sharp=require('C:/Users/Feela/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('node:path');
(async()=>{
 for(const name of ['overworld-v3','characters-v3','environments-v3','sir-smik','equipment-atlas-v1','equipment-atlas-v2','equipment-atlas-v3']){
  const input=path.join(__dirname,'assets',name+'.png'),output=path.join(__dirname,'assets',name+'.webp');
  await sharp(input).webp({quality:86,effort:5}).toFile(output);
  const meta=await sharp(output).metadata();console.log(name+': '+meta.width+'×'+meta.height+' WebP');
 }
})();
