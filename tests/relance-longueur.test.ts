import { beforeEach, expect, it, vi } from "vitest";
import { lancer } from "@/app/partie/actions";
const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("@/app/solo/actions", () => ({ startGame: mocks.start }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
beforeEach(() => mocks.start.mockReset());
it.each([["20",20,20], ["tout",0,100]] as const)("Rejouer %s relit le choix et utilise la longueur réelle du moteur", async (longueur, demande, reel) => {
  mocks.start.mockResolvedValue({ game_id: "partie-93", question_count: reel });
  const form = new FormData();
  form.set("c", `mode=general&difficulte=YEAR&niveau=2&longueur=${longueur}`);
  const destination = await lancer(form).catch((e: Error) => e.message);
  const url = new URL(String(destination), "http://localhost");
  expect(url.pathname).toBe("/partie/partie-93");
  expect(url.searchParams.get("n")).toBe(String(reel));
  expect(new URLSearchParams(url.searchParams.get("c")!).get("longueur")).toBe(longueur);
  expect(mocks.start).toHaveBeenCalledWith({ difficulty: "YEAR", niveau: 2, questionCount: demande });
});
