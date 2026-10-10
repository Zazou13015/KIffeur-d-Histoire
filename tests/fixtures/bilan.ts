import type { SoloResult } from "../../src/lib/game/solo";

// Exclusivement pour les tests et captures : contrats complets de finish_game.
export const partieBilan: Extract<SoloResult, { direction: "date" }> = {
  game_id: "00000000-0000-4000-8000-000000000096", state: "finished", direction: "date",
  question_count: 10, average_accuracy: 82, total_points: 726,
  questions: [
    ["Prise de la Bastille", 1789, 1789, 100, 94],
    ["Premiers pas sur la Lune", 1969, 1969, 100, 90],
    ["Bataille d’Alésia", -52, -50, 96, 86],
    ["L’imprimerie de Gutenberg", 1450, 1455, 90, 78],
    ["Couronnement de Charlemagne", 800, 807, 86, 71],
    ["Chute du mur de Berlin", 1989, 1989, 100, 95],
    ["Arrivée de Colomb en Amérique", 1492, 1500, 84, 72],
    ["Chute de Constantinople", 1453, 1465, 76, 63],
    ["Proclamation de la République", 1792, 1798, 88, 77],
    ["Fin de la Seconde Guerre mondiale", 1945, null, 0, 0],
  ].map(([title, year, answer, accuracy, points], i) => ({
    question_id: `q${i + 1}`, position: i + 1, title: String(title), unit: "YEAR" as const,
    correct_date: { year: Number(year), month: null, day: null },
    answer: { year: answer === null ? null : Number(answer), month: null, day: null },
    gap: answer === null ? null : Math.abs(Number(year) - Number(answer)),
    accuracy: Number(accuracy), points: Number(points), expired: i === 9, description: null,
  })),
} satisfies SoloResult;

export function fixtureBilan(cas: string): SoloResult {
  const result = structuredClone(partieBilan);
  if (cas === "inverse") return {
    ...result, direction: "inverse", questions: result.questions.map((q, i) => ({
      ...q, direction: "inverse", correct: i % 2 === 0, gap: null,
      answer: q.expired ? null : i % 2 === 0 ? q.title : "Un autre événement",
    })),
  };
  if (cas === "zero" || cas === "maximum") {
    result.total_points = cas === "zero" ? 0 : 1000;
    result.average_accuracy = cas === "zero" ? 0 : 100;
    result.questions = result.questions.map((q) => ({ ...q, expired: false,
      answer: { ...q.answer, year: q.correct_date.year + (cas === "zero" ? 1000 : 0) },
      gap: cas === "zero" ? 1000 : 0, accuracy: result.average_accuracy, points: cas === "zero" ? 0 : 100 }));
  }
  if (cas === "absente") result.questions[2] = { ...result.questions[2], answer: { year: null, month: null, day: null }, gap: null, expired: false, points: 0, accuracy: 0 };
  if (cas === "eloignee") result.questions[2].answer.year = 4500;
  if (cas === "trois") { result.questions = result.questions.slice(0, 3); result.question_count = 3; result.total_points = 270; }
  if (cas === "jour" || cas === "mois") {
    return { ...result, questions: result.questions.map((q) => ({ ...q, unit: cas === "jour" ? "DAY" : "MONTH",
      correct_date: { year: q.correct_date.year, month: 7, day: cas === "jour" ? 14 : null },
      answer: { ...q.answer, month: q.answer.year ? 7 : null, day: q.answer.year && cas === "jour" ? 16 : null } })) };
  }
  return result;
}
