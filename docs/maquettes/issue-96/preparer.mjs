import { readFile, writeFile } from 'node:fs/promises';

// Embarquer les sources dans les deux livrables, pour pouvoir partager un seul HTML.
const dir = new URL('./', import.meta.url);
for (const nom of ['cabinet', 'immersif']) {
  const chemin = new URL(`${nom}.html`, dir);
  let html = await readFile(chemin, 'utf8');
  for (const fichier of ['polices.css', 'bilan.css']) {
    const css = await readFile(new URL(fichier, dir), 'utf8');
    const ancien = new RegExp(`<link rel="stylesheet" href="${fichier.replace('.', '\\.')}">|<style data-source="${fichier.replace('.', '\\.')}">[\\s\\S]*?</style>`);
    html = html.replace(ancien, () => `<style data-source="${fichier}">\n${css}\n</style>`);
  }
  const js = await readFile(new URL('bilan.js', dir), 'utf8');
  html = html.replace(/<script src="bilan\.js"><\/script>|<script data-source="bilan\.js">[\s\S]*?<\/script>/,
    () => `<script data-source="bilan.js">\n${js}\n</script>`);
  await writeFile(chemin, html);
  console.log(`${nom}.html : autonome, sans dépendance réseau ou fichier voisin`);
}
