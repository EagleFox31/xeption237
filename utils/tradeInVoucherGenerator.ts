import type { TradeInRequest } from '../types';
import { resolveVoucherExpiryIso } from './trocVoucher';

const formatFCFA = (amount: number): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.')} FCFA`;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * `targetSummary` est resolu par l'appelant (resolveTrocTargetSummary) plutot
 * que lu ici : ce module est purement synchrone, et une lecture reseau au milieu
 * d'une generation de PDF est une source de bons a moitie remplis.
 */
export const generateTradeInVoucherHTML = (
  request: TradeInRequest,
  targetSummary?: { name: string; price: number; credit: number; reste: number } | null,
): string => {
  const amount    = Number(request.trade_in_value || 0);
  const customer  = escapeHtml(request.customer_name || '');
  const device    = escapeHtml(`${request.device_brand || ''} ${request.device_model || ''}`.trim());
  const target    = request.target_product_name ? escapeHtml(request.target_product_name) : '';
  const voucher   = escapeHtml(request.voucher_reference || `TR-${request.id}`);
  const issuedOn  = formatDate(request.created_at);
  const validUntil = formatDate(resolveVoucherExpiryIso(request.voucher_expires_at, request.created_at));

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
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
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

    .target-table { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12px; }
    .target-table td { padding: 4px 0; color: #444; }
    .target-table td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .target-table tr.total td { border-top: 1px solid #d8d8d8; padding-top: 7px; font-weight: 700; color: #111; font-size: 14px; }
    .target-note { margin-top: 8px; font-size: 11px; font-style: italic; color: #777; }
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

    @media print {
      @page { margin: 0; size: A5 portrait; }
      body {
        background: #0a0a0a !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        padding: 0;
      }
      .voucher {
        max-width: none;
        border: none;
        min-height: 100vh;
      }
    }
  </style>
</head>
<body>
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
        <div><strong>Valide jusqu'au</strong> ${validUntil}</div>
      </div>
    </div>

    <div class="body">
      <div class="field">
        <div class="field-label">Client</div>
        <div class="field-value">${customer}</div>
      </div>

      <div class="field">
        <div class="field-label">Appareil apporté en troc</div>
        <div class="field-value">${device}</div>
      </div>

      ${target ? `<div class="field">
        <div class="field-label">Pour l'achat de</div>
        <div class="field-value">${target}</div>
        ${targetSummary ? `<table class="target-table">
          <tr><td>Prix boutique</td><td class="num">${formatFCFA(targetSummary.price)}</td></tr>
          <tr><td>Votre reprise</td><td class="num">&minus; ${formatFCFA(targetSummary.credit)}</td></tr>
          <tr class="total"><td>Reste à payer</td><td class="num">${
            targetSummary.reste > 0 ? formatFCFA(targetSummary.reste) : 'Rien à payer'
          }</td></tr>
        </table>` : `<div class="target-note">Prix à confirmer en boutique.</div>`}
      </div>` : ''}

      <div class="amount-block">
        <div class="amount-label">Votre appareil peut être repris jusqu'à</div>
        <div class="amount-value">${formatFCFA(amount)}</div>
        <div class="amount-sub">Sous réserve de vérification en boutique</div>
      </div>

      <div class="validity">
        <span class="validity-label">Validité du bon</span>
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
</body>
</html>`;
};

/**
 * Génère et télécharge un vrai PDF du bon de troc côté client.
 * Lib chargée dynamiquement → n'impacte pas le bundle initial.
 */
export const downloadTradeInVoucher = async (
  request: TradeInRequest,
  targetSummary?: { name: string; price: number; credit: number; reste: number } | null,
): Promise<void> => {
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default;

  const html = generateTradeInVoucherHTML(request, targetSummary);

  // Conteneur off-screen pour le rendu — html2canvas a besoin du DOM réel.
  // Largeur fixée = largeur de capture déterministe (sinon white-space aléatoire).
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '520px';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector('.voucher') as HTMLElement | null;
  if (!target) {
    document.body.removeChild(wrapper);
    return;
  }

  // Attendre que toutes les images (logo) soient chargées avant la capture canvas.
  const images = Array.from(wrapper.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // on n'échoue pas l'export pour une image manquante
        }),
    ),
  );

  const filename = `Xeption-BonTroc-${request.voucher_reference || request.id}.pdf`;

  // Page PDF = dimensions exactes du bon (px → mm à 96 DPI) → zéro marge blanche.
  const PX_TO_MM = 25.4 / 96;
  const pageWidthMm = target.offsetWidth * PX_TO_MM;
  const pageHeightMm = target.offsetHeight * PX_TO_MM;

  try {
    await html2pdf()
      .set({
        filename,
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          backgroundColor: '#0a0a0a',
          useCORS: true,
        },
        jsPDF: { unit: 'mm', format: [pageWidthMm, pageHeightMm], orientation: 'portrait' },
      })
      .from(target)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
};
