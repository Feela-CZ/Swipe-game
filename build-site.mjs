import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = new URL('./dist/', import.meta.url);

await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });
for (const entry of ['index.html', 'styles.css', 'data.js', 'engine.js', 'game.js']) {
  await cp(new URL(`./${entry}`, import.meta.url), new URL(`./${entry}`, output), { recursive:true });
}
await mkdir(new URL('./assets/', output), {recursive:true});
for (const asset of ['overworld-v3.webp', 'characters-v3.webp', 'environments-v3.webp', 'sir-smik.webp']) {
  await cp(new URL(`./assets/${asset}`, import.meta.url), new URL(`./assets/${asset}`, output));
}
console.log(`Static game build ready: ${root}dist`);
