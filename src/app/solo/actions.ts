"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { SoloCorrection, SoloDate, SoloFilters, SoloGame, SoloQuestion, SoloResult } from "@/lib/game/solo";
import { getAccount } from "@/lib/account";

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
  // Transaction distincte : la purge reste acquise même si l'action suivante
  // refuse une partie expirée ou une création dépassant le budget.
  const { error: purgeError } = await supabase.schema("histoire").rpc("purge_expired_anonymous_games");
  if (purgeError) throw new Error("Impossible d'effectuer cette action de partie");
  const { data, error } = await supabase.schema("histoire").rpc(name, args);
  if (error) {
    // Seul message SQL repris tel quel : il ne contient ni date ni décompte.
    if (error.message === "Pas assez de questions pour ces filtres") throw new Error(error.message);
    throw new Error(error.code === "42501" ? "Partie inaccessible" : error.code === "53400"
      ? "Les parties sans compte sont temporairement indisponibles. Réessayez plus tard."
      : "Impossible d'effectuer cette action de partie");
  }
  return data as T;
}

export async function startGame(filters: SoloFilters = {}): Promise<SoloGame> {
  const account = await getAccount();
  if (account && !account.username) throw new Error("Choisis ton pseudo KFFR dans le profil avant de lancer une partie connectée.");
  const token = randomBytes(32).toString("hex");
  // Test de chapitre : fonction dédiée, qui ne tire que parmi les événements des cartes du chapitre.
  const game = filters.chapterTest && filters.chapterIds?.length === 1
    ? await rpc<SoloGame>("start_chapter_test", {
      p_token: token,
      p_chapter_id: filters.chapterIds[0],
      p_difficulty: filters.difficulty ?? "YEAR",
      p_question_count: filters.questionCount ?? 10,
    })
    : await rpc<SoloGame>("start_game", {
      p_token: token,
      p_pack_id: filters.packId ?? null,
      p_tag_id: filters.tagId ?? null,
      p_year_min: filters.yearMin ?? null,
      p_year_max: filters.yearMax ?? null,
      p_level_id: filters.levelId ?? null,
      p_chapter_ids: filters.chapterIds ?? null,
      p_difficulty: filters.difficulty ?? "YEAR",
      p_question_count: filters.questionCount ?? 10,
      p_direction: filters.direction ?? "date",
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

// null = constater l'expiration (0 point) et voir la correction.
export async function submitAnswer(gameId: string, questionId: string, answer: SoloDate | string | null): Promise<SoloCorrection> {
  const token = (await cookies()).get(cookieName(gameId))?.value ?? null;
  const date = typeof answer === "string" ? null : answer;
  return rpc("submit_answer", {
    p_game_id: gameId, p_question_id: questionId, p_token: token,
    p_year: date?.year ?? null, p_month: date?.month ?? null, p_day: date?.day ?? null,
    p_answer_text: typeof answer === "string" ? answer : null,
  });
}

export async function finishGame(gameId: string): Promise<SoloResult> {
  const token = (await cookies()).get(cookieName(gameId))?.value ?? null;
  // Garder le cookie de session permet de relire le résultat après un rechargement.
  return rpc("finish_game", { p_game_id: gameId, p_token: token });
}

export async function claimGame(gameId: string): Promise<{ saved: boolean; error?: string }> {
  const name = cookieName(gameId);
  const account = await getAccount();
  if (!account?.username) return { saved: false, error: "Connecte-toi et choisis ton pseudo KFFR pour sauvegarder." };
  const store = await cookies();
  const token = store.get(name)?.value;
  if (!token) return { saved: false, error: "Cette partie ne peut pas être sauvegardée depuis ce navigateur." };
  try {
    await rpc("claim_anonymous_game", { p_game_id: gameId, p_token: token });
  } catch { return { saved: false, error: "Partie inaccessible, déjà sauvegardée, en cours ou expirée." }; }
  store.delete(name);
  return { saved: true };
}
