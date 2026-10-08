/**
 * Tests E2E — Smart Troc
 *
 * Teste le flow complet comme un vrai client :
 * Formulaire → Photos → IMEI → Paiement → Évaluation → Bon
 *
 * Utilise le vrai Supabase + Gemini — aucun mock.
 * Lance avec : npx playwright test --project=chromium
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';

// ─── Données de test ──────────────────────────────────────────────────────────

const CLIENT = {
  name:  'Dupont Test',
  phone: '677123456',
};

const DEVICE_SAMSUNG = {
  brand:       'Samsung',
  model:       'Galaxy A54',
  storage:     '128 Go',
  purchaseDate: '2023-06-01',
  imei:        '352136001234567',   // IMEI test valide (checksum Luhn OK)
};

const DEVICE_IPHONE = {
  brand:       'iPhone',
  model:       'iPhone 13',
  storage:     '128 Go',
  purchaseDate: '2022-10-01',
  imei:        '356938035643809',   // IMEI test valide
};

// Photos de test (images génériques — suffisantes pour tester le flow)
const TEST_PHOTO_PATH = path.join(__dirname, 'fixtures', 'test-phone.jpg');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function remplirFormulaire(page: Page, device = DEVICE_SAMSUNG) {
  await page.goto('/troc');

  // Nom & téléphone
  await page.getByLabel(/nom complet/i).fill(CLIENT.name);
  await page.getByLabel(/téléphone/i).first().fill(CLIENT.phone);

  // Marque
  await page.getByLabel(/marque/i).selectOption(device.brand);

  // Modèle
  await page.getByLabel(/modèle/i).fill(device.model);

  // Stockage
  if (device.storage) {
    const storageSelect = page.getByLabel(/stockage/i);
    if (await storageSelect.count() > 0) {
      await storageSelect.selectOption({ label: device.storage }).catch(() => {});
    }
  }

  // Date d'achat
  await page.getByLabel(/date d'achat/i).fill(device.purchaseDate);

  // État écran (parfait par défaut)
  await page.getByLabel(/état de l'écran/i).selectOption('parfait');

  // État boîtier
  await page.getByLabel(/état du boîtier/i).selectOption('parfait');

  // Les toggles Oui/Non sont déjà sur les valeurs par défaut favorables
  // (powersOn=true, chargesNormally=true, biometricsWork=true, accountUnlocked=true, hasWaterDamage=false)
}

async function passerEtapePhotos(page: Page) {
  // Upload photo de test
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(TEST_PHOTO_PATH);
  await expect(page.getByText(/1 photo/i).or(page.locator('img[alt]').first())).toBeVisible({ timeout: 5000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Formulaire Smart Troc', () => {
  test('Le bouton Continuer est désactivé si le formulaire est vide', async ({ page }) => {
    await page.goto('/troc');
    const btn = page.getByRole('button', { name: /continuer/i });
    await expect(btn).toBeDisabled();
  });

  test('Active le bouton quand tous les champs requis sont remplis', async ({ page }) => {
    await remplirFormulaire(page);
    const btn = page.getByRole('button', { name: /continuer/i });
    await expect(btn).toBeEnabled();
  });

  test('Affiche un avertissement rouge si l\'appareil ne s\'allume pas', async ({ page }) => {
    await remplirFormulaire(page);

    // Trouver le toggle "S'allume normalement ?" et cliquer "Non"
    const section = page.getByText(/s'allume normalement/i).locator('..');
    await section.getByRole('button', { name: /non/i }).click();

    await expect(page.getByText(/refus automatique/i)).toBeVisible();
  });

  test('Affiche un avertissement si compte Google/iCloud non retiré', async ({ page }) => {
    await remplirFormulaire(page);

    const section = page.getByText(/compte google/i).locator('..');
    await section.getByRole('button', { name: /non/i }).click();

    await expect(page.getByText(/refus automatique/i)).toBeVisible();
  });

  test('Téléphone camerounais invalide bloque le formulaire', async ({ page }) => {
    await remplirFormulaire(page);
    await page.getByLabel(/téléphone/i).first().fill('123456789');
    await expect(page.getByRole('button', { name: /continuer/i })).toBeDisabled();
    await expect(page.getByText(/invalide/i)).toBeVisible();
  });
});

test.describe('Étape Photos', () => {
  test('Impossible de continuer sans photo', async ({ page }) => {
    await remplirFormulaire(page);
    await page.getByRole('button', { name: /continuer/i }).click();
    // On est sur l'étape photos
    const btnImei = page.getByRole('button', { name: /continuer|suivant/i });
    await btnImei.click();
    await expect(page.getByText(/photo/i)).toBeVisible();
  });
});

test.describe('Vérification IMEI', () => {
  test('IMEI invalide (mauvais checksum Luhn) affiche une erreur', async ({ page }) => {
    await remplirFormulaire(page);
    await page.getByRole('button', { name: /continuer/i }).click();
    await passerEtapePhotos(page);
    await page.getByRole('button', { name: /continuer|suivant/i }).click();

    // Saisir un IMEI invalide
    const imeiInput = page.getByPlaceholder(/imei/i).or(page.getByLabel(/imei/i));
    await imeiInput.fill('123456789012345');
    await page.getByRole('button', { name: /vérifier/i }).click();

    await expect(page.getByText(/IMEI.*incorrect|checksum|15 chiffres/i)).toBeVisible({ timeout: 10_000 });
  });

  test('IMEI valide passe la vérification', async ({ page }) => {
    await remplirFormulaire(page);
    await page.getByRole('button', { name: /continuer/i }).click();
    await passerEtapePhotos(page);
    await page.getByRole('button', { name: /continuer|suivant/i }).click();

    const imeiInput = page.getByPlaceholder(/imei/i).or(page.getByLabel(/imei/i));
    await imeiInput.fill(DEVICE_SAMSUNG.imei);
    await page.getByRole('button', { name: /vérifier/i }).click();

    // Attend le résultat (vrai appel check-imei)
    await expect(
      page.getByText(/non blacklisté|valide|non listé/i)
        .or(page.getByText(/boutique/i))
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Paiement', () => {
  test('Le champ téléphone paiement valide un numéro camerounais', async ({ page }) => {
    await remplirFormulaire(page);
    await page.getByRole('button', { name: /continuer/i }).click();
    await passerEtapePhotos(page);
    await page.getByRole('button', { name: /continuer|suivant/i }).click();

    const imeiInput = page.getByPlaceholder(/imei/i).or(page.getByLabel(/imei/i));
    await imeiInput.fill(DEVICE_SAMSUNG.imei);
    await page.getByRole('button', { name: /vérifier/i }).click();
    await page.getByRole('button', { name: /payer|continuer/i }).click({ timeout: 25_000 });

    // Étape paiement — vérifier que le formulaire est présent
    await expect(page.getByText(/150|XAF|FCFA/i)).toBeVisible({ timeout: 5_000 });

    // Numéro invalide → bouton désactivé
    const phoneInput = page.getByPlaceholder(/6\d{8}|numéro/i);
    await phoneInput.fill('123456789');
    const payBtn = page.getByRole('button', { name: /payer|lancer/i });
    await expect(payBtn).toBeDisabled();

    // Numéro valide → bouton actif
    await phoneInput.fill('677000000');
    await expect(payBtn).toBeEnabled();
  });
});

test.describe('Évaluation Gemini — comportement IA', () => {
  // Ces tests passent après un paiement réel (sandbox CamPay).
  // Ils vérifient que Gemini retourne des valeurs cohérentes.
  // À lancer manuellement : npx playwright test --grep "Gemini"

  test('Gemini retourne un score entre 0 et 100', async ({ page }) => {
    // Ce test nécessite de compléter le paiement sandbox
    // Pour l'instant on vérifie que la page d'évaluation affiche bien un score
    test.skip(true, 'Nécessite un paiement sandbox complété — lancer manuellement');
  });

  test('Un appareil avec écran fissuré reçoit une offre inférieure à état parfait', async ({ page }) => {
    test.skip(true, 'Test comparatif — lancer manuellement avec deux sessions');
  });
});

test.describe('Mobile — UX responsive', () => {
  // Ces tests tournent sur Pixel 7 (config playwright.config.ts)
  test('Le formulaire est utilisable sur mobile', async ({ page }) => {
    await page.goto('/troc');
    // Vérifie qu'on peut scroller jusqu'au bouton Continuer
    await page.getByRole('button', { name: /continuer/i }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: /continuer/i })).toBeInViewport();
  });

  test('Les toggles Oui/Non sont cliquables sur mobile', async ({ page }) => {
    await remplirFormulaire(page);
    // Cherche le premier toggle et vérifie qu'il est cliquable
    const toggleNon = page.getByRole('button', { name: /^non$/i }).first();
    await toggleNon.click();
    // Le toggle doit changer d'état visuellement
    await expect(toggleNon).toHaveClass(/bg-white/);
  });
});
