import type { Historique, Statistiques } from "@/lib/profil/types";
export const statistiques: Statistiques = {
  games: 3,
  average_accuracy: 80,
  average_score: 720,
  best_score: 900,
  games_without_context: 1,
  modes: [
    {
      mode: "solo_libre",
      games: 2,
      average_accuracy: 90,
      average_score: 850,
      best_score: 900,
    },
    {
      mode: "inverse",
      games: 1,
      average_accuracy: 60,
      average_score: 460,
      best_score: 460,
    },
  ],
  contexts: [
    {
      kind: "pack",
      label: "Grands repères",
      level: null,
      games: 2,
      average_accuracy: 90,
      best_score: 900,
    },
    {
      kind: "theme",
      label: "Révolutions",
      level: null,
      games: 1,
      average_accuracy: 100,
      best_score: 900,
    },
    {
      kind: "chapter",
      label: "La Révolution française",
      level: "4e",
      games: 1,
      average_accuracy: 80,
      best_score: 800,
    },
  ],
  accuracy_over_time: [
    { month: "2026-09-01", games: 1, average_accuracy: 60 },
    { month: "2026-10-01", games: 2, average_accuracy: 90 },
  ],
};
export const statistiquesVides: Statistiques = {
  games: 0,
  average_accuracy: null,
  average_score: null,
  best_score: null,
  modes: [],
  contexts: [],
  accuracy_over_time: [],
  games_without_context: 0,
};
export const historique: Historique = {
  games: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      finished_at: "2026-10-08T12:00:00Z",
      difficulty: "YEAR",
      mode: "solo_libre",
      question_count: 10,
      total_points: 900,
      average_accuracy: 100,
      pack: "Grands repères",
      theme: "Révolutions",
      level: null,
      chapters: [],
    },
  ],
  next_cursor: "00000000-0000-4000-8000-000000000002",
};
