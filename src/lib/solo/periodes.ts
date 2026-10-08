// Périodes prêtes à jouer du solo libre. Les bornes portent sur l'année de début de l'événement
// (années astronomiques négatives avant J.-C., jamais 0 : la RPC le refuse).
export type Periode = { id: string; nom: string; detail: string; de: number | null; a: number | null };

export const PERIODES: Periode[] = [
  { id: "antiquite", nom: "Antiquité", detail: "jusqu'en 476", de: null, a: 476 },
  { id: "moyen-age", nom: "Moyen Âge", detail: "476 – 1492", de: 476, a: 1492 },
  { id: "epoque-moderne", nom: "Époque moderne", detail: "1492 – 1789", de: 1492, a: 1789 },
  { id: "xixe", nom: "XIXe siècle", detail: "1789 – 1914", de: 1789, a: 1914 },
  { id: "guerres-mondiales", nom: "Guerres mondiales", detail: "1914 – 1945", de: 1914, a: 1945 },
  { id: "depuis-1945", nom: "Depuis 1945", detail: "1945 à nos jours", de: 1945, a: null },
];
