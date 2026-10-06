// Contrat des RPC solo. Le calcul et les transitions restent entièrement en SQL.
export type SoloDifficulty = "YEAR" | "MONTH" | "DAY";
export type SoloFilters = {
  packId?: string;
  tagId?: string;
  yearMin?: number;
  yearMax?: number;
  levelId?: string;
  chapterIds?: string[];
  difficulty?: SoloDifficulty;
  questionCount?: number;
};
export type SoloDate = { year: number; month?: number | null; day?: number | null };
export type SoloGame = {
  game_id: string;
  question_count: number;
  difficulty: SoloDifficulty;
  state: "playing";
  anonymous: boolean;
};
export type SoloQuestion = {
  question_id: string;
  position: number;
  title: string;
  image_path: string | null;
  difficulty: SoloDifficulty;
  asked_at: string;
  deadline: string;
  server_time: string;
};
export type SoloCorrection = {
  question_id: string;
  correct_date: SoloDate;
  gap: number | null;
  unit: SoloDifficulty;
  accuracy: number;
  points: number;
  expired: boolean;
  description: string | null;
};
export type SoloResult = {
  game_id: string;
  state: "finished";
  question_count: number;
  average_accuracy: number;
  total_points: number;
  questions: (SoloCorrection & { position: number; title: string; answer: { year: number | null; month: number | null; day: number | null } })[];
};
