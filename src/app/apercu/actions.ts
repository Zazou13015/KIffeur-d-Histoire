"use server";

import { gapText, score, type HistoricDate, type Precision } from "@/lib/game/dates";
import type { Correction } from "@/components/partie/EcranPartie";

// Question de démonstration. La date attendue reste côté serveur, comme le feront
// les vraies questions (correction en SQL `security definer`).
const ATTENDUE: HistoricDate = { year: 1789, month: 7, day: 14 };

export async function corrigerDemo(questionId: string, reponse: HistoricDate | null): Promise<Correction> {
  const precision = questionId.replace("demo-bastille-", "") as Precision;
  if (!["annee", "mois", "jour"].includes(precision)) throw new Error("Question inconnue");
  const bonne: HistoricDate =
    precision === "annee" ? { year: ATTENDUE.year } : precision === "mois" ? { year: ATTENDUE.year, month: ATTENDUE.month } : ATTENDUE;
  if (!reponse) return { bonne, points: 0, ecart: null, expiree: true };
  return { bonne, points: score(reponse, bonne, precision), ecart: gapText(reponse, bonne, precision) };
}
