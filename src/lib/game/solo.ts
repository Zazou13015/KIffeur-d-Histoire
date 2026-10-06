// Contrat des RPC solo. Le calcul et les transitions restent entièrement en SQL.
export type SoloDifficulty = "YEAR" | "MONTH" | "DAY";
export type SoloDirection = "date" | "inverse";
export type SoloFilters = {
  direction?: SoloDirection;
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
  direction: SoloDirection;
  state: "playing";
  anonymous: boolean;
};
type QuestionTiming = {
  question_id: string;
  position: number;
  difficulty: SoloDifficulty;
  asked_at: string;
  deadline: string;
  server_time: string;
};
export type SoloDateQuestion = QuestionTiming & { title: string; image_path: string | null };
export type SoloInverseQuestion = QuestionTiming & {
  date: SoloDate;
  date_label: string;
  date_precision: SoloDifficulty;
};
// La présence de `date` distingue la question inverse, sans titre ni illustration.
export type SoloQuestion = SoloDateQuestion | SoloInverseQuestion;
type CorrectionDetails = {
  question_id: string;
  correct_date: SoloDate;
  gap: number | null;
  unit: SoloDifficulty;
  accuracy: number;
  points: number;
  expired: boolean;
  description: string | null;
};
export type SoloDateCorrection = CorrectionDetails & { direction?: "date" };
export type SoloInverseCorrection = CorrectionDetails & { direction: "inverse"; title: string; correct: boolean };
export type SoloCorrection = SoloDateCorrection | SoloInverseCorrection;
type ResultDetails = {
  game_id: string;
  state: "finished";
  question_count: number;
  average_accuracy: number;
  total_points: number;
};
export type SoloResult = ResultDetails & (
  { direction: "date"; questions: (SoloDateCorrection & { position: number; title: string; answer: { year: number | null; month: number | null; day: number | null } })[] }
  | { direction: "inverse"; questions: (SoloInverseCorrection & { position: number; answer: string | null })[] }
);
