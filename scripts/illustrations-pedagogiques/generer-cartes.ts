// Préparation hors ligne des seules côtes (aucune frontière politique/front militaire).
// Source publique : nvkelso/natural-earth-vector, geojson/ne_110m_land.geojson.
// Usage : npx tsx scripts/illustrations-pedagogiques/generer-cartes.ts <geojson téléchargé>
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
type Point = [number, number];
type Feature = { geometry: { type: string; coordinates: Point[][] | Point[][][] } };
const texte = readFileSync(process.argv[2], "utf8");
const terre = JSON.parse(texte) as { features: Feature[] };
const zones: Record<string, [number, number, number, number]> = {
  europe: [-12, 34, 35, 61], dardanelles: [22, 34, 43, 48], indochine: [92, 4, 114, 28],
};
// Clippage polygonal : limiter le dessin à sa fenêtre réduit les fichiers et les faux raccords.
function couper(points: Point[], axis: 0 | 1, limite: number, sens: number): Point[] {
  const resultat: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dedansA = sens * (a[axis] - limite) >= 0, dedansB = sens * (b[axis] - limite) >= 0;
    if (dedansA) resultat.push(a);
    if (dedansA !== dedansB) {
      const t = (limite - a[axis]) / (b[axis] - a[axis]);
      resultat.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return resultat;
}
const cartes = Object.fromEntries(Object.entries(zones).map(([nom, [ouest, sud, est, nord]]) => {
  const chemins: string[] = [];
  for (const feature of terre.features) {
    const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates as Point[][]] : feature.geometry.coordinates as Point[][][];
    for (const poly of polys) {
      let contour = poly[0];
      for (const [axis, limite, sens] of [[0, ouest, 1], [0, est, -1], [1, sud, 1], [1, nord, -1]]) contour = couper(contour, axis as 0 | 1, limite, sens);
      const pixels = contour.map(([lon, lat]) => [Math.round((lon - ouest) / (est - ouest) * 46), Math.round((nord - lat) / (nord - sud) * 38)] as Point)
        .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
      if (pixels.length < 3) continue;
      const propres = pixels.filter((p, i, a) => {
        const avant = a[(i + a.length - 1) % a.length], apres = a[(i + 1) % a.length];
        return (p[0] - avant[0]) * (apres[1] - p[1]) !== (p[1] - avant[1]) * (apres[0] - p[0]);
      });
      if (propres.length >= 3) chemins.push(propres.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + "z");
    }
  }
  return [nom, { fenetre: [ouest, sud, est, nord], chemin: chemins.join("") }];
}));
writeFileSync("scripts/illustrations-pedagogiques/cartes-theatres.json", JSON.stringify({
  source: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  licence: "Domaine public — https://www.naturalearthdata.com/about/terms-of-use/",
  sha256: createHash("sha256").update(texte).digest("hex"), cartes,
}, null, 2) + "\n");
