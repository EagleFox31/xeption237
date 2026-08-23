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

const generateReference = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `XEP-IMEI-${suffix}`;
};

const generateQrToken = (): string => crypto.randomUUID().replace(/-/g, '');

const formatDateFr = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

const imeiStatusLabel = (s: string): string => {
  if (s === 'valid') return 'Valide';
  if (s === 'invalid') return 'Invalide';
  return 'Non confirmé';
};

const blacklistLabel = (s: string): string => {
  if (s === 'clear') return 'Propre — non signalé';
  if (s === 'blacklisted') return 'Signalé (volé / bloqué)';
  return 'Non vérifié';
};

const firstName = (full: string): string => {
  const t = (full || '').trim();
  if (!t) return '—';
  return t.split(/\s+/)[0];
};

// ─── PDF « Certifié Xeption » (distinct du rapport Smart Troc) ───────────────

const buildImeiPdf = async (data: {
  reference: string;
  qrUrl: string;
  customerName: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  imei: string;
  imeiStatus: string;
  blacklistStatus: string;
  issuedAt: string;
}): Promise<Uint8Array> => {
  const pdfDoc  = await PDFDocument.create();
  const page    = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const emerald = rgb(0.06, 0.72, 0.51);
  const emeraldLt = rgb(0.88, 0.98, 0.94);
  const dark    = rgb(0.08, 0.08, 0.08);
  const grey    = rgb(0.42, 0.42, 0.42);
  const greyLt  = rgb(0.88, 0.88, 0.88);
  const white   = rgb(1, 1, 1);

  // Header — vert émeraude (pas doré Smart Troc)
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: dark });
  page.drawRectangle({ x: 0, y: height - 120, width, height: 4, color: emerald });

  page.drawText('XEPTION', {
    x: 40, y: height - 52, size: 26, font: fontBold, color: white,
  });

  // Badge « Certifié Xeption »
  page.drawRectangle({
    x: 40, y: height - 88, width: 168, height: 22, color: emerald,
  });
  page.drawText('CERTIFIÉ XEPTION', {
    x: 48, y: height - 82, size: 10, font: fontBold, color: white,
  });

  page.drawText('Certificat de vérification IMEI', {
    x: 40, y: height - 108, size: 10, font: fontRegular, color: greyLt,
  });

  page.drawText(data.reference, {
    x: width - 200, y: height - 55, size: 13, font: fontBold, color: emerald,
  });
  page.drawText(`Émis le ${formatDateFr(data.issuedAt)}`, {
    x: width - 200, y: height - 72, size: 9, font: fontRegular, color: greyLt,
  });

  let y = height - 155;

  // Titulaire
  page.drawText('TITULAIRE', { x: 40, y, size: 9, font: fontBold, color: grey });
  y -= 18;
  page.drawText(firstName(data.customerName), {
    x: 40, y, size: 16, font: fontBold, color: dark,
  });
  y -= 28;

  // Appareil
  page.drawText('APPAREIL VÉRIFIÉ', { x: 40, y, size: 9, font: fontBold, color: grey });
  y -= 18;
  const deviceLine = `${data.deviceBrand || ''} ${data.deviceModel || ''}`.trim() || 'Non identifié';
  page.drawText(deviceLine, { x: 40, y, size: 17, font: fontBold, color: dark });
  y -= 22;

  const imeiMasked = data.imei.length >= 4
    ? '••••••••••' + data.imei.slice(-4)
    : '••••••••••';
  page.drawText(`IMEI : ${imeiMasked}`, {
    x: 40, y, size: 10, font: fontRegular, color: grey,
  });
  y -= 30;

  // Résultats vérification
  page.drawRectangle({
    x: 40, y: y - 90, width: width - 80, height: 96,
    color: emeraldLt,
    borderColor: emerald,
    borderWidth: 1,
  });

  page.drawText('RÉSULTAT DE LA VÉRIFICATION', {
    x: 50, y: y - 18, size: 9, font: fontBold, color: grey,
  });

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Format IMEI (Luhn)',     value: imeiStatusLabel(data.imeiStatus) },
    { label: 'Liste noire mondiale', value: blacklistLabel(data.blacklistStatus) },
  ];

  let rowY = y - 38;
  for (const r of rows) {
    page.drawText(r.label, { x: 50, y: rowY, size: 10, font: fontRegular, color: dark });
    page.drawText(r.value, { x: 280, y: rowY, size: 10, font: fontBold, color: dark });
    rowY -= 18;
  }

  y -= 110;

  // Tampon visuel
  page.drawRectangle({
    x: width / 2 - 70, y: y - 50, width: 140, height: 50,
    borderColor: emerald,
    borderWidth: 2,
  });
  page.drawText('CERTIFIÉ', {
    x: width / 2 - 42, y: y - 28, size: 14, font: fontBold, color: emerald,
  });
  page.drawText('XEPTION', {
    x: width / 2 - 38, y: y - 44, size: 11, font: fontBold, color: emerald,
  });

  y -= 70;

  // QR + footer
  const qrDataUrl = await QRCode.toDataURL(data.qrUrl, { margin: 1, width: 200 });
  const qrBase64  = qrDataUrl.split(',')[1] ?? '';
  const qrBytes   = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
  const qrImage   = await pdfDoc.embedPng(qrBytes);

  const qrSize = 100;
  page.drawImage(qrImage, {
    x: width - qrSize - 40, y: 45, width: qrSize, height: qrSize,
  });

  page.drawText('Vérifier ce certificat :', {
    x: 40, y: 120, size: 10, font: fontBold, color: dark,
  });
  page.drawText('Scannez le QR ou rendez-vous sur', {
    x: 40, y: 105, size: 9, font: fontRegular, color: grey,
  });
  page.drawText(data.qrUrl, {
    x: 40, y: 90, size: 8, font: fontBold, color: dark,
  });

  page.drawLine({
    start: { x: 40, y: 72 }, end: { x: width - 40, y: 72 },
    thickness: 0.5, color: greyLt,
  });

  page.drawText('Xeption Network 237 — Mfoundi Mall · Olembé, Yaoundé', {
    x: 40, y: 55, size: 8, font: fontRegular, color: grey,
  });
  page.drawText(
    'Ce certificat atteste une vérification IMEI effectuée via le service Certifier Xeption.',
    { x: 40, y: 42, size: 7, font: fontRegular, color: grey },
  );
  page.drawText(
    'Il ne constitue pas un rapport d\'expertise Smart Troc ni une offre de reprise.',
    { x: 40, y: 32, size: 7, font: fontRegular, color: grey },
  );

  return pdfDoc.save();
};

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      sessionKey,
      paymentReference,
      customerName,
      imei,
      deviceBrand,
      deviceModel,
      imeiStatus,
      blacklistStatus,
    } = body;

    if (!sessionKey || typeof sessionKey !== 'string') {
      return new Response(JSON.stringify({ error: 'sessionKey requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (!paymentReference || typeof paymentReference !== 'string') {
      return new Response(JSON.stringify({ error: 'paymentReference requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (!customerName || typeof customerName !== 'string') {
      return new Response(JSON.stringify({ error: 'customerName requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (!imei || typeof imei !== 'string' || !/^\d{15}$/.test(imei)) {
      return new Response(JSON.stringify({ error: 'IMEI invalide' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // ── Paiement certif payé ───────────────────────────────────────────────
    const payRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_payments?session_key=eq.${encodeURIComponent(sessionKey)}&reference=eq.${encodeURIComponent(paymentReference)}&status=eq.paid&tier=eq.certif&select=*&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!payRes.ok) {
      console.error('[generate-imei-certificate] payment_fetch_failed', await payRes.text());
      return new Response(JSON.stringify({ error: 'Paiement introuvable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402,
      });
    }
    const payRows = await payRes.json();
    const payment = Array.isArray(payRows) ? payRows[0] : null;
    if (!payment) {
      return new Response(JSON.stringify({ error: 'Paiement non confirmé', code: 'payment_required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402,
      });
    }

    // ── Idempotence ────────────────────────────────────────────────────────
    const existingRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/imei_certif_records?session_key=eq.${encodeURIComponent(sessionKey)}&select=*&limit=1`,
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

    const safeImeiStatus = ['valid', 'invalid', 'check_failed'].includes(imeiStatus)
      ? imeiStatus
      : 'check_failed';
    const safeBlacklist = ['unknown', 'clear', 'blacklisted'].includes(blacklistStatus)
      ? blacklistStatus
      : 'unknown';

    if (safeBlacklist === 'blacklisted') {
      return new Response(JSON.stringify({ error: 'IMEI blacklisté — certificat refusé', code: 'blacklisted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const reference = generateReference();
    const qrToken   = generateQrToken();
    const qrUrl     = `${PUBLIC_VERIFY_BASE.replace(/\/$/, '')}/${qrToken}`;
    const issuedAt  = new Date().toISOString();

    const pdfBytes = await buildImeiPdf({
      reference,
      qrUrl,
      customerName,
      deviceBrand: deviceBrand ?? null,
      deviceModel: deviceModel ?? null,
      imei,
      imeiStatus: safeImeiStatus,
      blacklistStatus: safeBlacklist,
      issuedAt,
    });

    const objectPath = `imei/${sessionKey}/${reference}.pdf`;
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
      console.error('[generate-imei-certificate] storage_upload_failed', await uploadRes.text());
      return new Response(JSON.stringify({ error: 'Upload certificat échoué' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const pdfUrl = `${supabaseUrl}/storage/v1/object/public/certificates/${objectPath}`;

    const insertRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/imei_certif_records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          session_key:       sessionKey,
          payment_reference: paymentReference,
          customer_name:     customerName,
          imei,
          device_brand:      deviceBrand ?? null,
          device_model:      deviceModel ?? null,
          imei_status:       safeImeiStatus,
          blacklist_status:  safeBlacklist,
          reference,
          qr_token:          qrToken,
          pdf_url:           pdfUrl,
        }),
      },
    );

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      if (errText.includes('duplicate') || errText.includes('23505')) {
        const retryRes = await fetchWithTimeout(
          `${supabaseUrl}/rest/v1/imei_certif_records?session_key=eq.${encodeURIComponent(sessionKey)}&select=*&limit=1`,
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
      console.error('[generate-imei-certificate] db_insert_failed', errText);
      return new Response(JSON.stringify({ error: 'Persistance certificat échouée' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    console.info('[generate-imei-certificate] generated', { reference, sessionKey });

    return new Response(JSON.stringify({
      reference,
      qrToken,
      pdfUrl,
      reused: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error: any) {
    console.error('[generate-imei-certificate] fatal', error?.message ?? error);
    return new Response(JSON.stringify({ error: error?.message ?? 'unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
