import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dir=new URL('./',import.meta.url);
const source=await readFile(new URL('cabinet-plus.source.html',dir),'utf8');
const css=await readFile(new URL('polices.css',dir),'utf8')+'\n'+await readFile(new URL('cabinet-plus.css',dir),'utf8');
const js=await readFile(new URL('cabinet-plus.js',dir),'utf8');
const html=source.replace('<!-- STYLES_EMBARQUES -->',()=>`<style>\n${css}\n</style>`).replace('<!-- SCRIPT_EMBARQUE -->',()=>`<script>\n${js}\n</script>`);
await writeFile(new URL('cabinet-plus.html',dir),html);
console.log('cabinet-plus.html : autonome, aucune dépendance réseau');
if (process.argv[2]) {
  const markup=source.match(/<body>\s*([\s\S]*?)\s*<!-- SCRIPT_EMBARQUE -->/)[1];
  const fragment=`<style>\n${css}\n</style>\n${markup}\n<script>\n${js}\n</script>\n`;
  if (Buffer.byteLength(fragment)>1_000_000) throw new Error('Fragment trop volumineux');
  await writeFile(resolve(process.argv[2]),fragment);
  console.log(`Prévisualisation intégrée : ${resolve(process.argv[2])}`);
}
