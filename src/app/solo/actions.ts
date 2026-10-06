"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { SoloCorrection, SoloDate, SoloFilters, SoloGame, SoloQuestion, SoloResult } from "@/lib/game/solo";

function cookieName(gameId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)) {
    throw new Error("Identifiant de partie invalide");
  }
  return `histoire-solo-${gameId}`;
}

// Les erreurs Postgres peuvent contenir des détails de lignes privées : ne jamais
// les sérialiser dans une réponse de Server Action, ni les journaliser avec le jeton.
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("histoire").rpc(name, args);
  if (error) {
    throw new Error(error.code === "42501" ? "Partie inaccessible" : "Impossible d'effectuer cette action de partie");
  }
  return data as T;
}

export async function startGame(filters: SoloFilters = {}): Promise<SoloGame> {
  const token = randomBytes(32).toString("hex");
  const game = await rpc<SoloGame>("start_game", {
    p_token: token,
    p_pack_id: filters.packId ?? null,
    p_tag_id: filters.tagId ?? null,
    p_year_min: filters.yearMin ?? null,
    p_year_max: filters.yearMax ?? null,
    p_level_id: filters.levelId ?? null,
    p_chapter_ids: filters.chapterIds ?? null,
    p_difficulty: filters.difficulty ?? "YEAR",
    p_question_count: filters.questionCount ?? 10,
  });
  if (game.anonymous) {
    (await cookies()).set(cookieName(game.game_id), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      // Cookie de session, sans expiration persistante.
    });
  }
  return game;
}

export async function nextQuestion(gameId: string): Promise<SoloQuestion | null> {
  const token = (await cookies()).get(cookieName(gameId))?.value ?? null;
  return rpc("next_question", { p_game_id: gameId, p_token: token });
}

// null = passer la question (0 point) ou constater l'expiration et voir la correction.
export async function submitAnswer(gameId: string, questionId: string, answer: SoloDate | null): Promise<SoloCorrection> {
  const token = (await cookies()).get(cookieName(gameId))?.value ?? null;
  return rpc("submit_answer", {
    p_game_id: gameId, p_question_id: questionId, p_token: token,
    p_year: answer?.year ?? null, p_month: answer?.month ?? null, p_day: answer?.day ?? null,
  });
}

export async function finishGame(gameId: string): Promise<SoloResult> {
  const token = (await cookies()).get(cookieName(gameId))?.value ?? null;
  // Garder le cookie de session permet de relire le résultat après un rechargement.
  return rpc("finish_game", { p_game_id: gameId, p_token: token });
}
