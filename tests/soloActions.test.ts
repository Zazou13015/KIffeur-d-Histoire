import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { finishGame, nextQuestion, startGame, submitAnswer } from "@/app/solo/actions";

const gameId = "00000000-0000-0000-0000-000000000013";
const mocks = vi.hoisted(() => ({ values: new Map<string, string>(), set: vi.fn(), rpc: vi.fn(), schema: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => mocks.values.has(name) ? { value: mocks.values.get(name) } : undefined,
  set: mocks.set,
}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ schema: mocks.schema }) }));

beforeEach(() => {
  mocks.values.clear();
  mocks.rpc.mockReset();
  mocks.schema.mockReset().mockReturnValue({ rpc: mocks.rpc });
  mocks.set.mockReset().mockImplementation((name: string, value: string) => mocks.values.set(name, value));
});
afterEach(() => vi.unstubAllEnvs());

it("génère un secret distinct pour chaque partie et le garde en cookie httpOnly de session", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const game = { game_id: gameId, anonymous: true, question_count: 10, difficulty: "YEAR", state: "playing" };
  mocks.rpc.mockResolvedValue({ data: game, error: null });
  expect(await startGame()).toEqual(game);
  const token = mocks.rpc.mock.calls[0][1].p_token;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(mocks.schema).toHaveBeenCalledWith("histoire");
  expect(mocks.set).toHaveBeenCalledWith(`histoire-solo-${gameId}`, token,
    { httpOnly: true, secure: true, sameSite: "strict", path: "/" });
  expect(JSON.stringify(game)).not.toContain(token);
  await startGame();
  expect(mocks.rpc.mock.calls[1][1].p_token).not.toBe(token);
});

it("transmet les filtres sans calcul métier et utilise les cookies pour les RPC suivantes", async () => {
  vi.stubEnv("NODE_ENV", "development");
  mocks.rpc.mockResolvedValue({ data: { game_id: gameId, anonymous: true }, error: null });
  await startGame({ packId: "PACK", tagId: "TAG", yearMin: -800, yearMax: 2000,
    levelId: "3e", chapterIds: ["CHAPTER"], difficulty: "DAY", questionCount: 20 });
  const token = mocks.values.get(`histoire-solo-${gameId}`);
  expect(mocks.rpc.mock.calls[0]).toEqual(["start_game", {
    p_token: token, p_pack_id: "PACK", p_tag_id: "TAG", p_year_min: -800, p_year_max: 2000,
    p_level_id: "3e", p_chapter_ids: ["CHAPTER"], p_difficulty: "DAY", p_question_count: 20,
  }]);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  expect(await nextQuestion(gameId)).toBeNull();
  expect(mocks.rpc).toHaveBeenLastCalledWith("next_question", { p_game_id: gameId, p_token: token });
  await submitAnswer(gameId, "question", { year: -44, month: 3, day: 15 });
  expect(mocks.rpc).toHaveBeenLastCalledWith("submit_answer", { p_game_id: gameId, p_question_id: "question", p_token: token, p_year: -44, p_month: 3, p_day: 15 });
  await submitAnswer(gameId, "question", null);
  expect(mocks.rpc).toHaveBeenLastCalledWith("submit_answer", { p_game_id: gameId, p_question_id: "question", p_token: token, p_year: null, p_month: null, p_day: null });
  await finishGame(gameId);
  expect(mocks.rpc).toHaveBeenLastCalledWith("finish_game", { p_game_id: gameId, p_token: token });
});

it("une partie connectée utilise la session Supabase sans cookie anonyme", async () => {
  mocks.rpc.mockResolvedValue({ data: { game_id: gameId, anonymous: false }, error: null });
  await startGame();
  expect(mocks.set).not.toHaveBeenCalled();
  await nextQuestion(gameId);
  expect(mocks.rpc).toHaveBeenLastCalledWith("next_question", { p_game_id: gameId, p_token: null });
});

it("les erreurs SQL privées ne sont pas propagées et aucun cookie n'est créé en cas d'échec", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "expected_year=1940 secret=private" } });
  await expect(startGame()).rejects.toThrow("Impossible d'effectuer cette action de partie");
  expect(mocks.set).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "token_hash=private" } });
  await expect(finishGame(gameId)).rejects.toThrow("Partie inaccessible");
});

it("un identifiant arbitraire ne peut pas servir à lire un autre cookie", async () => {
  await expect(nextQuestion("sb-auth-token")).rejects.toThrow("Identifiant de partie invalide");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
