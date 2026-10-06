// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConnexionPage from "@/app/connexion/page";
import GoogleSignInButton from "@/app/connexion/GoogleSignInButton";
import { signIn } from "@/app/connexion/actions";

const mocks = vi.hoisted(() => ({ oauth: vi.fn(), password: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: true }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOAuth: mocks.oauth } }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithPassword: mocks.password } }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.oauth.mockResolvedValue({ error: null });
  mocks.password.mockResolvedValue({ error: null });
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});
afterEach(cleanup);

describe("connexion Google et formulaire existant", () => {
  it("affiche le bouton, le séparateur et conserve le formulaire email/mot de passe", async () => {
    render(await ConnexionPage({ searchParams: Promise.resolve({ next: "/apercu" }), params: Promise.resolve({}) }));
    const button = screen.getByRole("button", { name: "Continuer avec Google" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.closest("form")).toBeNull();
    expect(screen.getByRole("separator", { name: "ou" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Email").getAttribute("required")).not.toBeNull();
    expect(screen.getByPlaceholderText("Mot de passe").getAttribute("autocomplete")).toBe("current-password");
    fireEvent.click(button);
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledExactlyOnceWith({
      provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Fapercu` },
    }));
    expect(mocks.password).not.toHaveBeenCalled();
  });
  it("bloque le double clic pendant la redirection", async () => {
    mocks.oauth.mockReturnValue(new Promise(() => {}));
    render(<GoogleSignInButton next="/" />);
    const button = screen.getByRole("button", { name: "Continuer avec Google" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.oauth).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Redirection…" }).getAttribute("disabled")).not.toBeNull();
  });
  it("affiche un échec Google et permet de réessayer", async () => {
    mocks.oauth.mockRejectedValueOnce(new Error("network"));
    render(<GoogleSignInButton next="//evil.example" />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Connexion Google impossible. Réessaie.");
    const button = screen.getByRole("button", { name: "Continuer avec Google" });
    expect(button.getAttribute("disabled")).toBeNull();
    fireEvent.click(button);
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledTimes(2));
    expect(mocks.oauth.mock.calls[0][0].options.redirectTo).toBe(`${window.location.origin}/auth/callback`);
  });
  it.each([
    ["oauth", "Connexion Google impossible. Réessaie."],
    ["1", "Email ou mot de passe incorrect."],
  ])("distingue l'erreur %s", async (erreur, message) => {
    render(await ConnexionPage({ searchParams: Promise.resolve({ erreur }), params: Promise.resolve({}) }));
    expect(screen.getByRole("alert").textContent).toBe(message);
  });
  it("conserve l'appel email/mot de passe et le retour à l'accueil", async () => {
    const form = new FormData();
    form.set("email", "player@example.test");
    form.set("password", "test-only-password");
    await expect(signIn(form)).rejects.toThrow("redirect:/");
    expect(mocks.password).toHaveBeenCalledExactlyOnceWith({ email: "player@example.test", password: "test-only-password" });
    expect(mocks.oauth).not.toHaveBeenCalled();
  });
  it("conserve le retour d'erreur email/mot de passe", async () => {
    mocks.password.mockResolvedValue({ error: new Error("invalid credentials") });
    await expect(signIn(new FormData())).rejects.toThrow("redirect:/connexion?erreur=1");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/connexion?erreur=1");
  });
});
