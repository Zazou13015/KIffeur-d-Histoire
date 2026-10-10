// Contrat des RPC solo. Le calcul et les transitions restent entièrement en SQL.
export type SoloDifficulty = "YEAR" | "MONTH" | "DAY";
export type SoloDirection = "date" | "inverse";
/** Niveau de la partie : 1 Débutant, 2 Intermédiaire (niveaux 1 et 2), 3 Expert (tous les événements). */
export type SoloNiveau = 1 | 2 | 3;
export type SoloFilters = {
  direction?: SoloDirection;
  packId?: string;
  tagId?: string;
  yearMin?: number;
  yearMax?: number;
  levelId?: string;
  chapterIds?: string[];
  difficulty?: SoloDifficulty;
  /** Absent : aucun filtre de niveau (mode scolaire). */
  niveau?: SoloNiveau;
  questionCount?: number;
  // questionCount = 0 : « Tout », résolu atomiquement en 1 à 100 par start_game (#93).
  /** Test d'un chapitre : le serveur ne tire que parmi les événements de ses cartes pédagogiques. */
  chapterTest?: boolean;
};
/** Façon dont une réponse datée a été donnée (indicateurs #26). Pas de calendrier en V1. */
export type MethodeSaisie = "frise" | "clavier" | "calendrier";
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
  /** Longueur réelle en base ; optionnelle pour les anciennes réponses RPC. */
  question_count?: number;
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
  /** Instantané privé de lancement, disponible seulement au bilan (#93). Anciens jeux : null. */
  replay_filters?: SoloFilters | null;
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
