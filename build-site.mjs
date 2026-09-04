import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = new URL('./dist/', import.meta.url);

await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });
for (const entry of ['index.html', 'styles.css', 'game.js', 'assets']) {
  await cp(new URL(`./${entry}`, import.meta.url), new URL(`./${entry}`, output), { recursive:true });
}
console.log(`Static game build ready: ${root}dist`);
