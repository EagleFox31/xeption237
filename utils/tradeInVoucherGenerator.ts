import type { TradeInRequest } from '../types';
import { resolveVoucherExpiryIso, resolveVoucherValidityDays } from './voucherValidity';
import { buildBonPortalUrl, resolveVoucherReference } from './trocVoucherRef';

const formatFCFA = (amount: number): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.')} FCFA`;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatPhone = (phone?: string | null): string => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 9) return escapeHtml(phone?.trim() || '—');
  const local = digits.startsWith('237') ? digits.slice(3) : digits;
  if (local.length === 9) {
    return `+237 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
  }
  return escapeHtml(phone?.trim() || '—');
};

const formatImei = (imei?: string | null): string => {
  const digits = (imei ?? '').replace(/\D/g, '');
  if (digits.length < 14) return '—';
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export type TradeInVoucherPdfExtras = {
  bonPortalUrl: string;
  qrDataUrl: string;
};

/**
 * `targetSummary` est resolu par l'appelant (resolveTrocTargetSummary) plutot
 * que lu ici : ce module est purement synchrone, et une lecture reseau au milieu
 * d'une generation de PDF est une source de bons a moitie remplis.
 */
export const generateTradeInVoucherHTML = (
  request: TradeInRequest,
  targetSummary?: { name: string; price: number; credit: number; reste: number } | null,
  extras?: TradeInVoucherPdfExtras,
): string => {
  const amount    = Number(request.trade_in_value || 0);
  const customer  = escapeHtml(request.customer_name || '');
  const device    = escapeHtml(`${request.device_brand || ''} ${request.device_model || ''}`.trim());
  const target    = request.target_product_name ? escapeHtml(request.target_product_name) : '';
  const voucher   = escapeHtml(resolveVoucherReference(request));
  const issuedOn  = formatDate(request.created_at);
  const expiryIso = resolveVoucherExpiryIso(request.voucher_expires_at, request.created_at);
  const validUntil = formatDate(expiryIso);
  const validityDays = resolveVoucherValidityDays(request.voucher_expires_at, request.created_at);
  const phone     = formatPhone(request.customer_phone);
  const imei      = formatImei(request.imei);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bon de troc ${voucher} — Xeption</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&display=swap');

    body {
      background: #0a0a0a;
      color: #ffffff;
      font-family: 'Space Grotesk', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .pdf-document {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      background: #0a0a0a;
    }

    .pdf-page-voucher {
      width: 520px;
    }

    .voucher {
      width: 100%;
      max-width: 520px;
      background: #111111;
      border: 1px solid #2a2a2a;
      position: relative;
      overflow: hidden;
    }

    /* Bande décorative dorée en haut */
    .voucher::before {
      content: '';
      display: block;
      height: 3px;
      background: linear-gradient(90deg, #f0d14a 0%, #c8a800 50%, #f0d14a 100%);
    }

    .header {
      padding: 28px 32px 24px;
      border-bottom: 1px solid #1e1e1e;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 8px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .brand {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #ffffff;
      line-height: 1;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      border: 1px solid #f0d14a33;
      background: #f0d14a0d;
      padding: 4px 10px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #f0d14a;
    }

    .meta {
      text-align: right;
      font-size: 11px;
      color: #a0a0a0;
      line-height: 2;
    }

    .meta strong {
      color: #d0d0d0;
      font-weight: 500;
    }

    .body {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field {
      background: #0f0f0f;
      border: 1px solid #1e1e1e;
      padding: 14px 18px;
    }

    .field-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #b0b0b0;
      margin-bottom: 6px;
    }

    .field-value {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }

    .amount-block {
      background: #0f0f0f;
      border: 1px solid #f0d14a22;
      padding: 28px 18px;
      text-align: center;
      position: relative;
    }

    .amount-block::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, #f0d14a08 0%, transparent 70%);
      pointer-events: none;
    }

    .amount-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #b8b8b8;
      margin-bottom: 10px;
    }

    .amount-value {
      font-size: 42px;
      font-weight: 800;
      color: #f0d14a;
      letter-spacing: -1px;
      line-height: 1;
    }

    .amount-sub {
      font-size: 11px;
      color: #a0a0a0;
      margin-top: 10px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .target-table { width: 100%; margin-top: 12px; border-collapse: collapse; font-size: 13px; }
    .target-table td { padding: 7px 0; color: #d8d8d8; vertical-align: middle; }
    .target-table td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; color: #ffffff; font-weight: 600; }
    .target-table tr.credit td.num { color: #f0d14a; }
    .target-table tr.total td {
      border-top: 1px solid #f0d14a44;
      padding-top: 10px;
      font-weight: 800;
      color: #ffffff;
      font-size: 15px;
    }
    .target-table tr.total td.num { color: #f0d14a; font-size: 18px; }
    .target-note { margin-top: 8px; font-size: 11px; font-style: italic; color: #a0a0a0; }
    .field-sub {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #c8c8c8;
      font-family: ui-monospace, monospace;
      letter-spacing: 0.04em;
    }
    .field-sub-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #888;
      margin-right: 8px;
    }
    .validity {
      background: #0f0f0f;
      border: 1px solid #1e1e1e;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .validity-label {
      font-size: 10px;
      color: #a8a8a8;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .validity-date {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }

    .ref-bar {
      padding: 16px 32px;
      border-top: 1px solid #1a1a1a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ref-code {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #c0c0c0;
      font-family: monospace;
    }

    .ref-label {
      font-size: 9px;
      color: #a0a0a0;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .footer {
      padding: 16px 32px 24px;
      border-top: 1px solid #141414;
    }

    .footer p {
      font-size: 10px;
      color: #909090;
      line-height: 1.7;
    }

    /* Coin décoratif */
    .corner {
      position: absolute;
      top: 0;
      right: 0;
      width: 60px;
      height: 60px;
      border-left: 1px solid #f0d14a1a;
      border-bottom: 1px solid #f0d14a1a;
      pointer-events: none;
    }

    .pdf-page-qr {
      width: 520px;
      min-height: 738px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 32px;
      background: #0a0a0a;
    }

    .qr-panel {
      width: 100%;
      max-width: 360px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .qr-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid #f0d14a33;
      background: #f0d14a0d;
      padding: 6px 12px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #f0d14a;
    }

    .qr-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #ffffff;
    }

    .qr-sub {
      font-size: 12px;
      color: #a8a8a8;
      line-height: 1.5;
      max-width: 280px;
    }

    .qr-image {
      width: 220px;
      height: 220px;
      border: 3px solid #f0d14a;
      border-radius: 12px;
      background: #ffffff;
      padding: 8px;
      object-fit: contain;
    }

    .qr-url {
      font-size: 11px;
      font-weight: 600;
      color: #f0d14a;
      word-break: break-all;
      line-height: 1.5;
      font-family: ui-monospace, monospace;
    }

    .qr-ref {
      font-size: 10px;
      color: #888;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    @media print {
      @page { margin: 0; size: A5 portrait; }
      body {
        background: #0a0a0a !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
      }
      .pdf-document { max-width: none; }
      .voucher {
        max-width: none;
        border: none;
      }
      .pdf-page-qr {
        min-height: 738px;
      }
    }
  </style>
</head>
<body>
  <div class="pdf-document">
  <section class="pdf-page-voucher">
  <div class="voucher">
    <div class="corner"></div>

    <div class="header">
      <div class="brand-block">
        <img class="brand-logo" src="/icons/icon-192x192.png" alt="Xeption Network" crossorigin="anonymous" />
        <div class="brand-text">
          <div class="brand">XEPTION</div>
          <div class="badge">&#8635; Smart Troc — Bon de reprise</div>
        </div>
      </div>
      <div class="meta">
        <div><strong>Émis le</strong> ${issuedOn}</div>
        <div><strong>Valide ${validityDays} j</strong> — ${validUntil}</div>
      </div>
    </div>

    <div class="body">
      <div class="field">
        <div class="field-label">Client</div>
        <div class="field-value">${customer}</div>
        <div class="field-sub">${phone}</div>
      </div>

      <div class="field">
        <div class="field-label">Appareil apporté en troc</div>
        <div class="field-value">${device}</div>
        <div class="field-sub"><span class="field-sub-label">IMEI</span>${imei}</div>
      </div>

      ${target ? `<div class="field">
        <div class="field-label">Pour l'achat de</div>
        <div class="field-value">${target}</div>
        ${targetSummary ? `<table class="target-table">
          <tr><td>Prix boutique</td><td class="num">${formatFCFA(targetSummary.price)}</td></tr>
          <tr class="credit"><td>Votre reprise</td><td class="num">&minus; ${formatFCFA(targetSummary.credit)}</td></tr>
          <tr class="total"><td>Reste à payer</td><td class="num">${
            targetSummary.reste > 0 ? formatFCFA(targetSummary.reste) : '0 FCFA'
          }</td></tr>
        </table>` : `<div class="target-note">Prix à confirmer en boutique.</div>`}
      </div>` : ''}

      <div class="amount-block">
        <div class="amount-label">Votre appareil peut être repris jusqu'à</div>
        <div class="amount-value">${formatFCFA(amount)}</div>
        <div class="amount-sub">Sous réserve de vérification en boutique</div>
      </div>

      <div class="validity">
        <span class="validity-label">Validité du bon (${validityDays} jours)</span>
        <span class="validity-date">jusqu'au ${validUntil}</span>
      </div>
    </div>

    <div class="ref-bar">
      <span class="ref-label">Référence</span>
      <span class="ref-code">${voucher}</span>
    </div>

    <div class="footer">
      <p>
        Valeur de reprise estimée sous réserve de vérification physique en boutique Xeption Network
        et du dédouanement de l'appareil (IMEI déclaré à la douane).<br />
        Ce bon n'est pas un paiement — il s'applique en déduction sur votre prochain achat. Non remboursable.
      </p>
    </div>
  </div>
  </section>
  ${extras ? `<section class="pdf-page-qr">
    <div class="qr-panel">
      <div class="qr-badge">&#8635; Smart Troc · Bon en ligne</div>
      <p class="qr-title">Consultez votre bon</p>
      <p class="qr-sub">Scannez le QR code ou ouvrez le lien ci-dessous pour accéder à votre bon Smart Troc.</p>
      <img class="qr-image" src="${extras.qrDataUrl}" alt="QR code bon Smart Troc" crossorigin="anonymous" />
      <p class="qr-url">${escapeHtml(extras.bonPortalUrl)}</p>
      <p class="qr-ref">Réf. ${voucher}</p>
    </div>
  </section>` : ''}
  </div>
</body>
</html>`;
};

const A5_WIDTH_MM = 148;
const A5_HEIGHT_MM = 210;

const waitForImages = (root: ParentNode): Promise<void> =>
  Promise.all(
    Array.from(root.querySelectorAll('img')).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);

/** Une page A5 — le canvas est redimensionné pour tenir entièrement sur la page. */
const addCanvasToA5Page = (
  pdf: import('jspdf').jsPDF,
  canvas: HTMLCanvasElement,
  pageIndex: number,
): void => {
  if (pageIndex > 0) pdf.addPage([A5_WIDTH_MM, A5_HEIGHT_MM], 'portrait');

  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, A5_WIDTH_MM, A5_HEIGHT_MM, 'F');

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pageAspect = A5_WIDTH_MM / A5_HEIGHT_MM;
  const imgAspect = canvas.width / canvas.height;

  let renderW: number;
  let renderH: number;
  if (imgAspect > pageAspect) {
    renderW = A5_WIDTH_MM;
    renderH = A5_WIDTH_MM / imgAspect;
  } else {
    renderH = A5_HEIGHT_MM;
    renderW = A5_HEIGHT_MM * imgAspect;
  }

  pdf.addImage(
    imgData,
    'JPEG',
    (A5_WIDTH_MM - renderW) / 2,
    (A5_HEIGHT_MM - renderH) / 2,
    renderW,
    renderH,
    undefined,
    'FAST',
  );
};

/**
 * Génère et télécharge un vrai PDF du bon de troc côté client.
 * Lib chargée dynamiquement → n'impacte pas le bundle initial.
 */
export const downloadTradeInVoucher = async (
  request: TradeInRequest,
  targetSummary?: { name: string; price: number; credit: number; reste: number } | null,
): Promise<void> => {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const QRCode = (await import('qrcode')).default;

  const voucherRef = resolveVoucherReference(request);
  const bonPortalUrl = buildBonPortalUrl(voucherRef);
  const qrDataUrl = await QRCode.toDataURL(bonPortalUrl, {
    margin: 1,
    width: 280,
    color: { dark: '#111111', light: '#ffffff' },
  });

  const html = generateTradeInVoucherHTML(request, targetSummary, { bonPortalUrl, qrDataUrl });

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '520px';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const voucherEl = wrapper.querySelector('.pdf-page-voucher') as HTMLElement | null;
  const qrEl = wrapper.querySelector('.pdf-page-qr') as HTMLElement | null;
  if (!voucherEl || !qrEl) {
    document.body.removeChild(wrapper);
    return;
  }

  await waitForImages(wrapper);

  const canvasOpts = {
    scale: 2,
    backgroundColor: '#0a0a0a',
    useCORS: true,
    logging: false,
  } as const;

  const filename = `Xeption-BonTroc-${voucherRef}.pdf`;

  try {
    const [voucherCanvas, qrCanvas] = await Promise.all([
      html2canvas(voucherEl, canvasOpts),
      html2canvas(qrEl, canvasOpts),
    ]);

    const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
    addCanvasToA5Page(pdf, voucherCanvas, 0);
    addCanvasToA5Page(pdf, qrCanvas, 1);
    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
};
