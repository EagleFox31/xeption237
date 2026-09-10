
import QRCode from 'qrcode';
import { Order } from '../types';
import { SHOP_PHONE_DISPLAY } from '../constants/contact';
import { getPaymentMethodLabel } from './paymentMethods';
import { buildPublicSiteUrl } from './publicSiteUrl';

export type InvoiceDocumentType = 'facture';

export interface GenerateInvoiceOptions {
  documentType?: InvoiceDocumentType;
  qrDataUrl?: string;
  trackingUrl?: string;
}

export const buildOrderTrackingUrl = (orderId: string): string => {
  return buildPublicSiteUrl(`/tracking/commande?id=${encodeURIComponent(orderId)}`);
};

export const getSyncQRCodeDataUrl = (text: string): string => {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    let dataUrl = '';
    // QRCode.toDataURL avec 4 arguments (canvas, text, opts, cb) s'exécute de manière synchrone dans le navigateur
    QRCode.toDataURL(
      canvas,
      text,
      {
        margin: 1,
        width: 140,
        color: { dark: '#000000', light: '#ffffff' },
      },
      (err, url) => {
        if (!err && url) dataUrl = url;
      }
    );
    if (!dataUrl && canvas.width > 0) {
      dataUrl = canvas.toDataURL('image/png');
    }
    return dataUrl;
  } catch (e) {
    console.warn('Sync QR Code generation fallback:', e);
    return '';
  }
};

export const generateTrackingQRCode = async (url: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 160,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch (err) {
    console.warn('Erreur génération QR Code suivi:', err);
    return getSyncQRCodeDataUrl(url);
  }
};

export const generateInvoiceHTML = (
  order: Order,
  options?: GenerateInvoiceOptions
): string => {
  const { id, customerName, customerEmail, customerPhone, customerCity, items, total, date, deliveryMode, paymentMethod, status, discountAmount, trocVoucher } = order;
  const documentTitle = 'Facture';
  const statusLabels: Record<string, string> = {
    pending: 'En cours de traitement',
    confirmed: 'Commande confirmée',
    shipped: 'En cours de livraison',
    ready: 'Prête en boutique',
    delivered: 'Commande livrée',
    cancelled: 'Commande annulée',
    refused: 'Livraison refusée',
    returned: 'Colis retourné',
  };
  const statusNote = statusLabels[status] ? `Statut commande : ${statusLabels[status]}` : '';

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  
  // Détection / calcul automatique de la remise (rétroactive pour toute commande) :
  // Si discountAmount est explicite et > 0, on le prend.
  // Sinon, si subtotal > total, l'écart représente précisément la remise accordée (bon de troc) !
  const calculatedDiscount = Math.max(0, subtotal - total);
  const effectiveDiscount = Number(discountAmount ?? 0) > 0 ? Number(discountAmount) : calculatedDiscount;

  const deliveryFee = deliveryMode === 'pickup' ? 0 : Math.max(0, total + effectiveDiscount - subtotal);
  const deliveryFeeLabel =
    deliveryMode === 'pickup'
      ? 'Gratuit'
      : deliveryFee === 0
        ? 'Gratuit'
        : `${deliveryFee.toLocaleString('fr-FR')} FCFA`;

  const troc = trocVoucher ? {
    ref: trocVoucher.ref || (trocVoucher as any).voucher_reference || (trocVoucher as any).reference || '',
    brand: trocVoucher.device_brand || (trocVoucher as any).brand || '',
    model: trocVoucher.device_model || (trocVoucher as any).model || '',
    storage: trocVoucher.device_storage || (trocVoucher as any).storage || '',
    imei: trocVoucher.imei || (trocVoucher as any).device_imei || '',
    credit: trocVoucher.trade_in_value || (trocVoucher as any).credit || effectiveDiscount || 0,
  } : null;

  const discountReasonLabel = troc?.ref
    ? `Bon Smart Troc ${troc.ref}`
    : (order.discountReason || 'Bon Smart Troc');

  const formattedDate = (() => {
    try {
      // Préférer createdAt si disponible pour récupérer l'heure réelle de création
      const dateSource = order.createdAt || date;
      if (!dateSource) return date || '';

      const d = new Date(dateSource);
      if (isNaN(d.getTime())) return date;

      const dateStr = d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Si la date d'origine ne contient pas d'indication d'heure explicite (ex: "10/09/2026" ou "2026-09-10")
      // ou si l'heure et les minutes valent 00:00, ne pas afficher d'heure !
      const hasExplicitTime = typeof dateSource === 'string' && (dateSource.includes('T') || dateSource.includes(':'));
      const isMidnight = d.getHours() === 0 && d.getMinutes() === 0;

      if (!hasExplicitTime || isMidnight) {
        return dateStr;
      }

      const timeStr = d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateStr} à ${timeStr.replace(':', 'h')}`;
    } catch {}
    return date;
  })();

  const trackingUrl = options?.trackingUrl || buildOrderTrackingUrl(id);
  const qrDataUrl = options?.qrDataUrl || getSyncQRCodeDataUrl(trackingUrl);

  // Styles de base
  const colors = {
    bg: '#FFFFFF',
    text: '#000000',
    textMuted: '#555555',
    gold: '#FFD700',
    goldDark: '#B8860B',
    border: '#EEEEEE'
  };

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid ${colors.border};">
      <td style="padding: 10px 0; color: ${colors.text}; font-family: 'Helvetica', sans-serif;">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px; text-transform: uppercase;">${item.name}</div>
        <div style="font-size: 10px; color: ${colors.goldDark}; text-transform: uppercase;">Ref: ${item.category}</div>
      </td>
      <td style="padding: 10px 0; color: ${colors.text}; font-family: 'Helvetica', sans-serif; text-align: center; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 10px 0; color: ${colors.text}; font-family: 'Helvetica', sans-serif; text-align: right; font-weight: bold;">
        ${(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html style="color-scheme: light; background-color: #ffffff;">
<head>
  <meta charset="utf-8">
  <title>Facture #${id}</title>
  <style>
    * {
      color: #000000;
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff !important;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000000 !important;
      color-scheme: light !important;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 20px 45px 20px;
      background-color: #ffffff !important;
      color: #000000 !important;
    }
    table, tr, td, th, div, span, p {
      color: #000000;
    }
    
    @media print {
      @page { margin: 0.5cm; size: A4 portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; }
      .container { width: 100%; max-width: none; padding: 0 0 30px 0; }
      .no-print { display: none; }
      .page-break { page-break-inside: avoid; }
      h1 { font-size: 24px !important; }
      td, th { padding-top: 5px !important; padding-bottom: 5px !important; }
      .footer { margin-top: 25px !important; padding-top: 15px !important; width: 100%; text-align: center; font-size: 10px; }
    }
  </style>
</head>
<body style="background-color: #ffffff; color: #000000;">
  <div class="container" style="background-color: #ffffff; color: #000000;">
    
    <!-- HEADER -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-bottom: 2px solid ${colors.gold}; padding-bottom: 20px;">
      <tr>
        <td valign="top">
          <img src="https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png" width="60" style="display: block; margin-bottom: 10px;">
          <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000000;">XEPTION</div>
        </td>
        <td align="right" valign="top">
          <div style="font-size: 18px; font-weight: 900; text-transform: uppercase; color: ${colors.goldDark}; margin-bottom: 5px;">${documentTitle}</div>
          <div style="font-size: 14px; font-weight: bold; color: #000000;">#${id}</div>
          <div style="font-size: 12px; color: ${colors.textMuted}; margin-top: 5px;">${formattedDate}</div>
          ${statusNote ? `<div style="font-size: 10px; color: ${colors.textMuted}; margin-top: 4px; text-transform: uppercase;">${statusNote}</div>` : ''}
        </td>
      </tr>
    </table>

    <!-- INFO CLIENT & VENDEUR & REPRISE SMART TROC -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 26px;">
      <tr>
        <td width="${troc ? '32%' : '50%'}" valign="top" style="padding-right: 15px;">
          <div style="font-size: 10px; color: ${colors.textMuted}; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 2px; letter-spacing: 0.5px;">Vendeur</div>
          <div style="font-weight: bold; color: #000000; font-size: 14px;">Xeption</div>
          <div style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">Mfoundi Mall, Boutique 2063</div>
          <div style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">Yaoundé, Cameroun</div>
          <div style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">${SHOP_PHONE_DISPLAY}</div>
        </td>
        <td width="${troc ? '33%' : '50%'}" valign="top" style="padding-left: 10px; padding-right: 15px;">
          <div style="font-size: 10px; color: ${colors.textMuted}; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 2px; letter-spacing: 0.5px;">Client</div>
          <div style="font-weight: bold; color: #000000; font-size: 14px;">${customerName}</div>
          <div style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">${customerPhone}</div>
          ${customerEmail ? `<div style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">${customerEmail}</div>` : ''}
          <div style="font-size: 12px; color: ${colors.textMuted}; line-height: 1.4;">${customerCity}</div>
        </td>
        ${troc ? `
        <td width="35%" valign="top" style="padding-left: 15px; border-left: 2px solid ${colors.gold}; background-color: #fafafa; border-radius: 4px; padding: 10px 12px;">
          <div style="font-size: 10px; color: ${colors.goldDark}; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px; letter-spacing: 0.5px;">
            Reprise Smart Troc
          </div>
          <div style="font-size: 11px; color: ${colors.textMuted}; margin-bottom: 3px;">
            Réf. Bon : <strong style="color: #000000; font-family: monospace; font-size: 12px;">${troc.ref}</strong>
          </div>
          <div style="font-size: 12px; color: #000000; font-weight: bold; line-height: 1.3;">
            Appareil : ${troc.brand ? `${troc.brand} ` : ''}${troc.model}${troc.storage ? ` (${troc.storage})` : ''}
          </div>
          ${troc.imei ? `
            <div style="font-size: 11px; color: #333333; font-family: monospace; margin-top: 3px;">
              IMEI : <strong style="color: #000000; letter-spacing: 0.5px;">${troc.imei}</strong>
            </div>
          ` : ''}
          <div style="font-size: 11px; color: ${colors.goldDark}; font-weight: bold; margin-top: 5px;">
            Déduction reprise : −${troc.credit.toLocaleString('fr-FR')} FCFA
          </div>
        </td>
        ` : ''}
      </tr>
    </table>

    <!-- ITEMS -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #000000; color: #ffffff;">
          <th align="left" style="padding: 8px 10px; font-size: 10px; text-transform: uppercase; color: #ffffff;">Désignation</th>
          <th align="center" style="padding: 8px 10px; font-size: 10px; text-transform: uppercase; color: #ffffff;">Qté</th>
          <th align="right" style="padding: 8px 10px; font-size: 10px; text-transform: uppercase; color: #ffffff;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- TOTALS & SUIVI QR CODE -->
    <table width="100%" cellpadding="0" cellspacing="0" class="page-break" style="margin-top: 10px;">
      <tr>
        <td width="55%" valign="bottom" style="padding-right: 20px; padding-bottom: 5px;">
          <!-- Bloc QR Code Suivi -->
          <table cellpadding="0" cellspacing="0" style="border: 1px solid #E5E7EB; border-radius: 8px; background-color: #FAFAFA; width: 100%; padding: 12px;">
            <tr>
              ${qrDataUrl ? `
              <td width="95" valign="middle" align="center" style="padding-right: 12px;">
                <img src="${qrDataUrl}" width="90" height="90" style="display: block; border-radius: 4px; border: 1px solid #E5E7EB; background: #FFFFFF;" alt="QR Code Suivi Commande" />
              </td>
              ` : ''}
              <td valign="middle">
                <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.5px; margin-bottom: 4px;">
                  Suivre votre commande
                </div>
                <div style="font-size: 10px; color: ${colors.textMuted}; line-height: 1.35; margin-bottom: 6px;">
                  Scannez ce QR Code avec votre smartphone pour suivre l'acheminement de votre colis en temps réel.
                </div>
                <div style="font-size: 9px; color: #666666; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">
                  Lien direct de suivi :
                </div>
                <div style="font-size: 9px; font-weight: bold; word-break: break-all;">
                  <a href="${trackingUrl}" target="_blank" style="color: ${colors.goldDark}; text-decoration: underline; font-family: 'Helvetica', Arial, sans-serif;">
                    ${trackingUrl}
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
        <td width="45%" valign="top">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 5px 0; color: ${colors.textMuted}; font-size: 12px;" align="right">Mode Livraison :</td>
              <td style="padding: 5px 0 5px 15px; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #000000;" align="right">${deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: ${colors.textMuted}; font-size: 12px;" align="right">Paiement :</td>
              <td style="padding: 5px 0 5px 15px; font-weight: bold; font-size: 12px; color: #000000;" align="right">${getPaymentMethodLabel(paymentMethod)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0 5px; color: ${colors.textMuted}; font-size: 12px;" align="right">Sous-total :</td>
              <td style="padding: 8px 0 5px 15px; font-weight: bold; font-size: 12px; color: #000000;" align="right">${subtotal.toLocaleString('fr-FR')} FCFA</td>
            </tr>
            ${effectiveDiscount > 0 ? `<tr>
              <td style="padding: 5px 0; color: #B45309; font-size: 12px; font-weight: bold;" align="right">Remise (${discountReasonLabel}) :</td>
              <td style="padding: 5px 0 5px 15px; font-weight: bold; font-size: 12px; color: #B45309;" align="right">−${Number(effectiveDiscount).toLocaleString('fr-FR')} FCFA</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 5px 0; color: ${colors.textMuted}; font-size: 12px;" align="right">${deliveryMode === 'pickup' ? 'Retrait :' : 'Livraison :'}</td>
              <td style="padding: 5px 0 5px 15px; font-weight: bold; font-size: 12px; color: #000000;" align="right">${deliveryFeeLabel}</td>
            </tr>
            <tr>
              <td colspan="2" style="border-top: 2px solid ${colors.gold}; padding-top: 10px; margin-top: 10px;"></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 900; font-size: 14px; text-transform: uppercase; color: #000000;" align="right">Net à Payer</td>
              <td style="padding: 5px 0 5px 15px; font-weight: 900; font-size: 20px; color: #000000;" align="right">${total.toLocaleString('fr-FR')} <span style="font-size: 10px; color: #000000;">FCFA</span></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- FOOTER -->
    <div style="margin-top: 35px; text-align: center; border-top: 1px solid #eee; padding-top: 16px; padding-bottom: 25px;" class="footer">
      <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #000000;">Merci pour votre confiance !</div>
      <div style="font-size: 10px; color: ${colors.textMuted}; margin-bottom: 10px;">Les marchandises vendues ne sont ni reprises ni échangées après 3 jours. Garantie valide sur présentation de cette facture.</div>
      <div style="font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000000;">XEPTION &bull; TRIGENYS GROUP</div>
    </div>

  </div>
</body>
</html>
  `;
};

/**
 * Génère le code HTML de la facture de manière asynchrone avec QR Code garanti.
 */
export const generateInvoiceHTMLAsync = async (
  order: Order,
  options?: GenerateInvoiceOptions
): Promise<string> => {
  let effectiveOrder = order;

  // Résolution automatique et rétroactive du bon Smart Troc via RPC sécurisée
  if (!effectiveOrder.trocVoucher) {
    try {
      const { supabase } = await import('../services/supabaseClient');
      const { data: troc } = await supabase.rpc('get_order_troc_voucher', {
        p_order_id: order.id,
      });

      if (troc && (troc.ref || troc.device_brand || troc.imei)) {
        effectiveOrder = {
          ...order,
          trocVoucher: {
            ref: troc.ref,
            device_brand: troc.device_brand,
            device_model: troc.device_model,
            device_storage: troc.device_storage,
            imei: troc.imei,
            trade_in_value: troc.trade_in_value,
          },
          discountReason: order.discountReason || (troc.ref ? `Bon Smart Troc ${troc.ref}` : 'Bon Smart Troc'),
        };
      }
    } catch (e) {
      console.warn('Erreur résolution rétroactive bon de troc pour facture:', e);
    }
  }

  const trackingUrl = options?.trackingUrl || buildOrderTrackingUrl(effectiveOrder.id);
  const qrDataUrl = options?.qrDataUrl || (await generateTrackingQRCode(trackingUrl)) || getSyncQRCodeDataUrl(trackingUrl);
  return generateInvoiceHTML(effectiveOrder, { ...options, qrDataUrl, trackingUrl });
};

/**
 * Construit le bloc visuel HTML du QR Code de suivi.
 */
export const buildTrackingCardHtml = (qrDataUrl: string, trackingUrl: string): string => {
  return `
    <!-- Bloc QR Code Suivi -->
    <table cellpadding="0" cellspacing="0" style="border: 1px solid #E5E7EB; border-radius: 8px; background-color: #FAFAFA; width: 100%; padding: 12px;">
      <tr>
        ${qrDataUrl ? `
        <td width="95" valign="middle" align="center" style="padding-right: 12px;">
          <img src="${qrDataUrl}" width="90" height="90" style="display: block; border-radius: 4px; border: 1px solid #E5E7EB; background: #FFFFFF;" alt="QR Code Suivi Commande" />
        </td>
        ` : ''}
        <td valign="middle">
          <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.5px; margin-bottom: 4px;">
            Suivre votre commande
          </div>
          <div style="font-size: 10px; color: #555555; line-height: 1.35; margin-bottom: 6px;">
            Scannez ce QR Code avec votre smartphone pour suivre l'acheminement de votre colis en temps réel.
          </div>
          <div style="font-size: 9px; color: #666666; margin-bottom: 2px; font-weight: bold; text-transform: uppercase;">
            Lien direct de suivi :
          </div>
          <div style="font-size: 9px; font-weight: bold; word-break: break-all;">
            <a href="${trackingUrl}" target="_blank" style="color: #B8860B; text-decoration: underline; font-family: 'Helvetica', Arial, sans-serif;">
              ${trackingUrl}
            </a>
          </div>
        </td>
      </tr>
    </table>
  `.trim();
};

/**
 * Extrait la référence de commande depuis un HTML de facture.
 */
export const extractOrderIdFromInvoiceHTML = (html: string): string => {
  if (!html) return '';
  const match = html.match(/<title>Facture\s*#?([A-Za-z0-9_-]+)<\/title>/i)
    || html.match(/#([A-Za-z0-9_-]{4,})/i)
    || html.match(/Facture\s*#?([A-Za-z0-9_-]{4,})/i);
  return match ? match[1].trim() : '';
};

/**
 * Met à niveau de façon synchrone un HTML de facture pour injecter rétroactivement le QR Code.
 */
export const upgradeInvoiceHTMLSync = (html: string): string => {
  if (!html) return html;
  if (html.includes('alt="QR Code Suivi Commande"') && html.includes('data:image/png;base64')) {
    return html;
  }
  const orderId = extractOrderIdFromInvoiceHTML(html);
  if (!orderId) return html;

  const trackingUrl = buildOrderTrackingUrl(orderId);
  const qrDataUrl = getSyncQRCodeDataUrl(trackingUrl);
  if (!qrDataUrl) return html;

  const trackingBlock = buildTrackingCardHtml(qrDataUrl, trackingUrl);

  if (html.includes('Suivre votre commande')) {
    return html.replace(/<!-- Bloc QR Code Suivi -->[\s\S]*?<\/table>/i, trackingBlock);
  }

  if (html.includes('<!-- TOTALS -->')) {
    return html.replace(
      '<!-- TOTALS -->',
      `<!-- TOTALS & SUIVI QR CODE -->\n    <table width="100%" cellpadding="0" cellspacing="0" class="page-break" style="margin-top: 10px;">\n      <tr>\n        <td width="55%" valign="bottom" style="padding-right: 20px; padding-bottom: 5px;">\n          ${trackingBlock}\n        </td>\n        <td width="45%" valign="top">`
    );
  }

  return html;
};

/**
 * Vérifie et injecte rétroactivement le QR Code de suivi et le lien dans un HTML de facture.
 */
export const ensureInvoiceHasTrackingQR = async (html: string): Promise<string> => {
  if (!html) return html;
  if (html.includes('alt="QR Code Suivi Commande"') && html.includes('data:image/png;base64')) {
    return html;
  }
  const orderId = extractOrderIdFromInvoiceHTML(html);
  if (!orderId) return html;

  const trackingUrl = buildOrderTrackingUrl(orderId);
  const qrDataUrl = (await generateTrackingQRCode(trackingUrl)) || getSyncQRCodeDataUrl(trackingUrl);
  if (!qrDataUrl) return html;

  const trackingBlock = buildTrackingCardHtml(qrDataUrl, trackingUrl);

  if (html.includes('Suivre votre commande')) {
    return html.replace(/<!-- Bloc QR Code Suivi -->[\s\S]*?<\/table>/i, trackingBlock);
  }

  if (html.includes('<!-- TOTALS -->')) {
    return html.replace(
      '<!-- TOTALS -->',
      `<!-- TOTALS & SUIVI QR CODE -->\n    <table width="100%" cellpadding="0" cellspacing="0" class="page-break" style="margin-top: 10px;">\n      <tr>\n        <td width="55%" valign="bottom" style="padding-right: 20px; padding-bottom: 5px;">\n          ${trackingBlock}\n        </td>\n        <td width="45%" valign="top">`
    );
  }

  return html;
};

/**
 * Ouvre la fenêtre d'impression native pour visualiser ou enregistrer la facture en PDF (qualité vectorielle).
 * Rétroactivité garantie : injection synchrone du QR code de suivi si manquant.
 */
export const printInvoiceHTML = (html: string): void => {
  const effectiveHtml = upgradeInvoiceHTMLSync(html);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(effectiveHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }
};

/**
 * Télécharge la facture au format PDF de manière instantanée via un iframe isolé.
 * Rétroactivité garantie : injection dynamique du QR code si la facture a été passée antérieurement.
 */
export const downloadInvoicePDF = async (html: string, filename: string): Promise<void> => {
  let iframe: HTMLIFrameElement | null = null;
  try {
    const effectiveHtml = await ensureInvoiceHasTrackingQR(html);
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '800px';
    iframe.style.height = '1130px';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.colorScheme = 'light';
    iframe.style.backgroundColor = '#ffffff';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Impossible d'accéder au contexte de document de l'iframe");
    }

    iframeDoc.open();
    iframeDoc.write(effectiveHtml);
    iframeDoc.close();

    if (iframeDoc.documentElement) {
      iframeDoc.documentElement.style.colorScheme = 'light';
      iframeDoc.documentElement.style.backgroundColor = '#ffffff';
    }
    if (iframeDoc.body) {
      iframeDoc.body.style.backgroundColor = '#ffffff';
      iframeDoc.body.style.color = '#000000';
    }

    // Attente du rendu des images et styles internes à l'iframe
    await new Promise((resolve) => setTimeout(resolve, 200));

    const targetElement = iframeDoc.body;
    const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

    await html2pdf()
      .set({
        margin: [8, 8, 12, 8],
        filename: safeFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 800,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(targetElement)
      .save();
  } catch (error) {
    console.warn("Échec du téléchargement direct PDF, basculement vers l'aperçu/impression:", error);
    printInvoiceHTML(html);
    throw error;
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
};

