// @ts-ignore
const Deno = globalThis.Deno;

import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import QRCode from 'https://esm.sh/qrcode@1.5.4';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_TIMEOUT_MS = 15_000;
const PUBLIC_VERIFY_BASE = Deno.env.get('PUBLIC_VERIFY_BASE_URL') || 'https://xeptionetwork.shop/verify';

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// Référence courte type "XEP-CERT-A8K9L2" (lisible humain).
const generateReference = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 (ambigus)
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `XEP-CERT-${suffix}`;
};

const generateQrToken = (): string => crypto.randomUUID().replace(/-/g, '');

// Formate XAF avec espaces fines.
const formatXaf = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF';
};

const formatDateFr = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

const tierLabel = (tier: string | null | undefined): string => {
  if (tier === 'premium') return 'Premium';
  if (tier === 'safety')  return 'Sûreté';
  return 'Express';
};

const gradeLabel = (grade: string | null | undefined): string => {
  if (grade === 'excellent') return 'Excellent état';
  if (grade === 'bon')       return 'Bon état';
  if (grade === 'pieces')    return 'Pour pièces';
  if (grade === 'refuse')    return 'Refusé';
  return '—';
};

// ─── Génération PDF ──────────────────────────────────────────────────────────

const buildPdf = async (data: {
  reference: string;
  qrUrl: string;
  tradeIn: any;
}): Promise<Uint8Array> => {
  const pdfDoc  = await PDFDocument.create();
  const page    = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const gold   = rgb(0.93, 0.78, 0.27);
  const dark   = rgb(0.10, 0.10, 0.10);
  const grey   = rgb(0.40, 0.40, 0.40);
  const greyLt = rgb(0.85, 0.85, 0.85);
  const white  = rgb(1, 1, 1);

  // ── Header noir doré ────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: height - 110, width, height: 110, color: dark,
  });
  page.drawText('XEPTION', {
    x: 40, y: height - 55, size: 28, font: fontBold, color: gold,
  });
  page.drawText('Rapport d\'expertise Smart Troc', {
    x: 40, y: height - 80, size: 11, font: fontRegular, color: white,
  });
  page.drawText(data.reference, {
    x: width - 180, y: height - 55, size: 14, font: fontBold, color: gold,
  });
  page.drawText(`Émis le ${formatDateFr(data.tradeIn.created_at)}`, {
    x: width - 180, y: height - 75, size: 9, font: fontRegular, color: white,
  });

  // ── Bloc appareil ───────────────────────────────────────────────────────
  let y = height - 150;
  page.drawText('APPAREIL ÉVALUÉ', {
    x: 40, y, size: 10, font: fontBold, color: grey,
  });
  y -= 20;
  page.drawText(`${data.tradeIn.device_brand || '—'} ${data.tradeIn.device_model || ''}`.trim(), {
    x: 40, y, size: 18, font: fontBold, color: dark,
  });
  y -= 18;
  const specsLine = [
    data.tradeIn.device_storage,
    data.tradeIn.device_ram,
  ].filter(Boolean).join(' · ');
  if (specsLine) {
    page.drawText(specsLine, { x: 40, y, size: 11, font: fontRegular, color: grey });
    y -= 16;
  }
  if (data.tradeIn.imei) {
    const imeiMasked = '••••••••••' + String(data.tradeIn.imei).slice(-4);
    page.drawText(`IMEI : ${imeiMasked}`, { x: 40, y, size: 10, font: fontRegular, color: grey });
    y -= 16;
  }

  // ── Bandeau palier ──────────────────────────────────────────────────────
  y -= 10;
  page.drawRectangle({
    x: 40, y: y - 30, width: width - 80, height: 36,
    color: rgb(0.98, 0.96, 0.88),
    borderColor: gold,
    borderWidth: 1,
  });
  page.drawText(`Formule : ${tierLabel(data.tradeIn.tier)}`, {
    x: 50, y: y - 18, size: 11, font: fontBold, color: dark,
  });
  page.drawText(`Vérification IMEI : ${data.tradeIn.imei_assurance_level === 'premium' ? 'Blacklist mondiale ✓' : 'Standard'}`, {
    x: 250, y: y - 18, size: 10, font: fontRegular, color: dark,
  });
  y -= 50;

  // ── Bloc diagnostic ─────────────────────────────────────────────────────
  page.drawText('DIAGNOSTIC TECHNIQUE', {
    x: 40, y, size: 10, font: fontBold, color: grey,
  });
  y -= 20;

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Score d\'état global',     value: `${data.tradeIn.ai_score ?? '—'} / 100` },
    { label: 'Grade',                     value: gradeLabel(data.tradeIn.trade_in_grade) },
    { label: 'État écran',                value: data.tradeIn.screen_condition || '—' },
    { label: 'État boîtier',              value: data.tradeIn.body_condition || '—' },
    { label: 'Caméra',                    value: data.tradeIn.camera_condition || '—' },
    { label: 'Santé batterie',            value: data.tradeIn.battery_health != null ? `${data.tradeIn.battery_health} %` : '—' },
    { label: 'Allumage normal',           value: data.tradeIn.powers_on === false ? 'Non' : 'Oui' },
    { label: 'Charge normale',            value: data.tradeIn.charges_normally === false ? 'Non' : 'Oui' },
    { label: 'Biométrie fonctionnelle',   value: data.tradeIn.biometrics_work === false ? 'Non' : 'Oui' },
    { label: 'Compte Google/iCloud retiré', value: data.tradeIn.account_unlocked === false ? 'Non' : 'Oui' },
    { label: 'Dégât des eaux',            value: data.tradeIn.has_water_damage === true ? 'Oui' : 'Non' },
    { label: 'Réparations antérieures',   value: data.tradeIn.previous_repairs || 'Aucune' },
    { label: 'Boîte d\'origine',          value: data.tradeIn.has_original_box ? 'Oui' : 'Non' },
    { label: 'Facture d\'achat',          value: data.tradeIn.has_invoice ? 'Oui' : 'Non' },
  ];

  for (const r of rows) {
    page.drawText(r.label, { x: 50, y, size: 10, font: fontRegular, color: dark });
    page.drawText(r.value, { x: 320, y, size: 10, font: fontBold, color: dark });
    y -= 16;
  }

  // ── Bloc offre ──────────────────────────────────────────────────────────
  y -= 10;
  page.drawRectangle({
    x: 40, y: y - 70, width: width - 80, height: 76, color: dark,
  });
  page.drawText('OFFRE DE REPRISE', {
    x: 50, y: y - 16, size: 10, font: fontBold, color: gold,
  });
  page.drawText('Crédit boutique Xeption', {
    x: 50, y: y - 38, size: 11, font: fontRegular, color: white,
  });
  page.drawText(formatXaf(data.tradeIn.trade_in_value), {
    x: 50, y: y - 56, size: 18, font: fontBold, color: gold,
  });

  page.drawText('Cash immédiat', {
    x: 320, y: y - 38, size: 11, font: fontRegular, color: white,
  });
  page.drawText(formatXaf(data.tradeIn.trade_in_value_cash), {
    x: 320, y: y - 56, size: 18, font: fontBold, color: white,
  });
  y -= 90;

  // ── QR code + footer ────────────────────────────────────────────────────
  // Génère le QR en data URL puis convertit en bytes pour pdf-lib.
  const qrDataUrl = await QRCode.toDataURL(data.qrUrl, { margin: 1, width: 200 });
  const qrBase64  = qrDataUrl.split(',')[1] ?? '';
  const qrBytes   = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
  const qrImage   = await pdfDoc.embedPng(qrBytes);

  const qrSize = 110;
  page.drawImage(qrImage, {
    x: width - qrSize - 40, y: 40, width: qrSize, height: qrSize,
  });

  page.drawText('Vérifier ce certificat :', {
    x: 40, y: 130, size: 10, font: fontBold, color: dark,
  });
  page.drawText('Scannez le QR ou rendez-vous sur', {
    x: 40, y: 115, size: 9, font: fontRegular, color: grey,
  });
  page.drawText(data.qrUrl, {
    x: 40, y: 100, size: 9, font: fontBold, color: dark,
  });

  // Ligne séparatrice
  page.drawLine({
    start: { x: 40, y: 75 }, end: { x: width - 40, y: 75 },
    thickness: 0.5, color: greyLt,
  });

  page.drawText('Xeption Network 237 — Mfoundi Mall · Olembé, Yaoundé', {
    x: 40, y: 55, size: 8, font: fontRegular, color: grey,
  });
  page.drawText(`Ce certificat est généré automatiquement à partir des données client et photos validées par l'IA Xeption.`, {
    x: 40, y: 42, size: 7, font: fontRegular, color: grey,
  });
  page.drawText('La validation définitive est faite en boutique sur présentation de l\'appareil.', {
    x: 40, y: 32, size: 7, font: fontRegular, color: grey,
  });

  return pdfDoc.save();
};

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tradeInId } = await req.json();
    if (!tradeInId || typeof tradeInId !== 'string') {
      return new Response(JSON.stringify({ error: 'tradeInId requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // ── Fetch trade-in ───────────────────────────────────────────────────
    const tradeRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/trade_in_requests?id=eq.${encodeURIComponent(tradeInId)}&select=*&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!tradeRes.ok) {
      console.error('[generate-certificate] trade_fetch_failed', await tradeRes.text());
      return new Response(JSON.stringify({ error: 'Demande introuvable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }
    const tradeRows = await tradeRes.json();
    const tradeIn   = Array.isArray(tradeRows) ? tradeRows[0] : null;
    if (!tradeIn) {
      return new Response(JSON.stringify({ error: 'Demande introuvable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    // ── Vérification éligibilité (Premium ou Safety uniquement) ──────────
    if (tradeIn.tier !== 'premium' && tradeIn.tier !== 'safety') {
      return new Response(JSON.stringify({
        error: 'Certificat non inclus dans votre formule',
        code: 'tier_not_eligible',
        currentTier: tradeIn.tier ?? 'express',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // ── Idempotence : si certificat existe déjà, on retourne le PDF actuel ──
    const existingRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_certificates?trade_in_id=eq.${encodeURIComponent(tradeInId)}&select=*&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (existingRes.ok) {
      const existing = await existingRes.json();
      if (Array.isArray(existing) && existing[0]?.pdf_url) {
        const cert = existing[0];
        return new Response(JSON.stringify({
          reference: cert.reference,
          qrToken:   cert.qr_token,
          pdfUrl:    cert.pdf_url,
          reused:    true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }
    }

    // ── Nouvelle génération ──────────────────────────────────────────────
    const reference = generateReference();
    const qrToken   = generateQrToken();
    const qrUrl     = `${PUBLIC_VERIFY_BASE.replace(/\/$/, '')}/${qrToken}`;

    const pdfBytes = await buildPdf({ reference, qrUrl, tradeIn });

    // ── Upload Storage ───────────────────────────────────────────────────
    const objectPath = `${tradeInId}/${reference}.pdf`;
    const uploadRes  = await fetchWithTimeout(
      `${supabaseUrl}/storage/v1/object/certificates/${encodeURIComponent(objectPath)}`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/pdf',
          'x-upsert': 'true',
        },
        body: pdfBytes,
      },
    );
    if (!uploadRes.ok) {
      console.error('[generate-certificate] storage_upload_failed', await uploadRes.text());
      return new Response(JSON.stringify({ error: 'Upload certificat échoué' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const pdfUrl = `${supabaseUrl}/storage/v1/object/public/certificates/${objectPath}`;

    // ── Insert DB ────────────────────────────────────────────────────────
    const insertRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_certificates`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          trade_in_id: tradeInId,
          reference,
          qr_token: qrToken,
          pdf_url:  pdfUrl,
        }),
      },
    );

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      // Cas course : un autre appel a déjà inséré entre temps → retourne l'existant.
      if (errText.includes('duplicate') || errText.includes('23505')) {
        const retryRes = await fetchWithTimeout(
          `${supabaseUrl}/rest/v1/troc_certificates?trade_in_id=eq.${encodeURIComponent(tradeInId)}&select=*&limit=1`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        if (retryRes.ok) {
          const rows = await retryRes.json();
          const cert = Array.isArray(rows) ? rows[0] : null;
          if (cert) {
            return new Response(JSON.stringify({
              reference: cert.reference,
              qrToken:   cert.qr_token,
              pdfUrl:    cert.pdf_url,
              reused:    true,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
            });
          }
        }
      }
      console.error('[generate-certificate] db_insert_failed', errText);
      return new Response(JSON.stringify({ error: 'Persistance certificat échouée' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    console.info('[generate-certificate] generated', { reference, tradeInId, tier: tradeIn.tier });

    return new Response(JSON.stringify({
      reference,
      qrToken,
      pdfUrl,
      reused: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error: any) {
    console.error('[generate-certificate] fatal', error?.message ?? error);
    return new Response(JSON.stringify({ error: error?.message ?? 'unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
