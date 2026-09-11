import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = new URL('./dist/client/', import.meta.url);

await rm(new URL('./dist/',import.meta.url), { recursive:true, force:true });
await mkdir(output, { recursive:true });
for (const entry of ['index.html', 'styles.css', 'mobile-scene.css', 'character.css', 'palette.css', 'title.css', 'data.js', 'encounters.js', 'story.js', 'engine.js', 'audio.js', 'scenes.js', 'saves.js', 'game.js']) {
  await cp(new URL(`./${entry}`, import.meta.url), new URL(`./${entry}`, output), { recursive:true });
}
await mkdir(new URL('./assets/', output), {recursive:true});
for (const asset of ['title-adventure-v1.webp','episode-1-map-v1.png','navigation-atlas-v1.png','tower-floors-v1.png','overworld-v3.webp', 'characters-v3.webp', 'environments-v3.webp', 'sir-smik.webp','equipment-atlas-v1.webp','equipment-atlas-v2.webp','equipment-atlas-v3.webp','encounter-characters.png','encounter-props.png']) {
  await cp(new URL(`./assets/${asset}`, import.meta.url), new URL(`./assets/${asset}`, output));
}
await mkdir(new URL('./dist/server/',import.meta.url),{recursive:true});
await cp(new URL('./server.js',import.meta.url),new URL('./dist/server/index.js',import.meta.url));
await mkdir(new URL('./dist/.openai/',import.meta.url),{recursive:true});
await cp(new URL('./.openai/hosting.json',import.meta.url),new URL('./dist/.openai/hosting.json',import.meta.url));
await cp(new URL('./drizzle/',import.meta.url),new URL('./dist/.openai/drizzle/',import.meta.url),{recursive:true});
console.log(`Game and save service ready: ${root}dist`);
