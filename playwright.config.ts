import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,       // Smart Troc a des side-effects Supabase — séquentiel
  forbidOnly: !!process.env.CI,
  retries: 0,                 // On veut voir les vrais échecs Gemini, pas les masquer
  workers: 1,
  timeout: 60_000,            // Gemini peut prendre jusqu'à 30s
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Montre le navigateur pendant les tests — utile pour débug UX
    headless: false,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },   // la majorité des clients sont sur mobile
    },
  ],

  // Lance le dev server automatiquement avant les tests
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,   // si tu as déjà lancé npm run dev, il le réutilise
    timeout: 120_000,
  },
});
