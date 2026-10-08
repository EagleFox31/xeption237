/**
 * Tests E2E — Troc analytics (dataLayer)
 *
 * Vérifie que les events GTM sont bien émis avec les bons params.
 * Cadre la correction du commit e4f613f (events alignés sur triggers GTM).
 *
 * Lancer : npx playwright test troc-analytics --project=chromium
 */
import { test, expect, type Page } from '@playwright/test';

type DLEvent = { event?: string; [k: string]: unknown };

async function installDataLayerSentinel(page: Page) {
  // Pré-crée window.dataLayer AVANT que les scripts de la page ne tournent,
  // pour capturer les events poussés dès le mount (troc_start, 1er troc_step_view).
  await page.addInitScript(() => {
    (window as unknown as { dataLayer: DLEvent[] }).dataLayer = [];
  });
}

async function getTrocEvents(page: Page): Promise<DLEvent[]> {
  return page.evaluate(() => {
    const dl = (window as unknown as { dataLayer?: DLEvent[] }).dataLayer ?? [];
    return dl.filter((e) => typeof e?.event === 'string' && e.event.startsWith('troc_'));
  });
}

test.describe('Troc analytics — dataLayer events', () => {
  test('troc_start + troc_step_view(appareil) sont poussés au chargement de /troc', async ({ page }) => {
    await installDataLayerSentinel(page);
    await page.goto('/troc');

    // Attendre que les useEffect de mount aient tourné
    await expect
      .poll(async () => (await getTrocEvents(page)).map((e) => e.event), { timeout: 5000 })
      .toEqual(expect.arrayContaining(['troc_start', 'troc_step_view']));

    const events = await getTrocEvents(page);

    // troc_start sans param
    const start = events.find((e) => e.event === 'troc_start');
    expect(start).toBeDefined();

    // troc_step_view = UN event paramétré (pas 7 events séparés comme avant e4f613f)
    const stepViews = events.filter((e) => e.event === 'troc_step_view');
    expect(stepViews.length).toBeGreaterThanOrEqual(1);
    for (const sv of stepViews) {
      expect(sv).toMatchObject({
        event: 'troc_step_view',
        troc_step: 'appareil',
        device_type: 'phone',
      });
    }

    // Garde-fou anti-régression : les anciens events par étape ne doivent plus exister
    const legacyEventNames = [
      'troc_form_view', 'troc_photos_view', 'troc_imei_view',
      'troc_payment_view', 'troc_evaluating_view', 'troc_result_view', 'troc_voucher_view',
    ];
    for (const legacy of legacyEventNames) {
      expect(events.find((e) => e.event === legacy)).toBeUndefined();
    }
  });

  test('troc_choice(phone) poussé au clic sur la carte Téléphone', async ({ page }) => {
    await installDataLayerSentinel(page);
    await page.goto('/troc');

    // La carte Téléphone est un <button> (option.available = true)
    await page.getByRole('button', { name: /téléphone/i }).first().click();

    await expect
      .poll(async () => (await getTrocEvents(page)).some((e) => e.event === 'troc_choice'), { timeout: 3000 })
      .toBe(true);

    const events = await getTrocEvents(page);
    const choice = events.find((e) => e.event === 'troc_choice');
    expect(choice).toMatchObject({
      event: 'troc_choice',
      troc_choice: 'phone',
    });
  });

  test('troc_step_view(photos) poussé après soumission du formulaire', async ({ page }) => {
    await installDataLayerSentinel(page);
    await page.goto('/troc');

    // Entrer dans le flow phone
    await page.getByRole('button', { name: /téléphone/i }).first().click();

    // Remplir champs minimum (même logique que smart-troc.spec.ts)
    await page.getByLabel(/nom complet/i).fill('Analytics Test');
    await page.getByLabel(/téléphone/i).first().fill('677123456');
    await page.getByLabel(/marque/i).selectOption('Samsung');
    await page.getByLabel(/modèle/i).fill('Galaxy A54');
    await page.getByLabel(/date d'achat/i).fill('2023-06-01');
    await page.getByLabel(/état de l'écran/i).selectOption('parfait');
    await page.getByLabel(/état du boîtier/i).selectOption('parfait');

    await page.getByRole('button', { name: /continuer/i }).click();

    // On attend l'event photos (pas que l'UI ait fini de monter)
    await expect
      .poll(async () => {
        const evs = await getTrocEvents(page);
        return evs.filter((e) => e.event === 'troc_step_view').map((e) => e.troc_step);
      }, { timeout: 5000 })
      .toEqual(expect.arrayContaining(['appareil', 'photos']));
  });
});
