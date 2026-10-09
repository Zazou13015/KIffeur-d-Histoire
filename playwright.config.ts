import { defineConfig, devices } from "@playwright/test";
import { statutLocal } from "./e2e/local";

// Tests de bout en bout (#27) : l'application compilée, branchée sur la pile Supabase LOCALE.
// Lancement : `npm run test:e2e` (après `npx supabase start`).
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const statut = statutLocal();

export default defineConfig({
  testDir: "e2e",
  // Les parcours partagent la base locale et le compte de test : un seul à la fois.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL: BASE,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Chromium déjà installé ailleurs (machine sans téléchargement) : PLAYWRIGHT_CHROMIUM=<chemin>.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true } },
  ],
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: BASE,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: statut.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: statut.ANON_KEY,
      NEXT_PUBLIC_SITE_URL: BASE,
    },
  },
});
