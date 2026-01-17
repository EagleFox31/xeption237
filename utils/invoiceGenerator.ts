
import { Order, CartItem } from '../types';

export const generateInvoiceHTML = (order: Order): string => {
  const { id, customerName, customerEmail, customerPhone, customerCity, items, total, date, deliveryMode, paymentMethod } = order;

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
        ${item.price.toLocaleString('fr-FR')} FCFA
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Facture #${id}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; }
    .container { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; }
    
    @media print {
      @page { margin: 0.5cm; size: A4 portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12px; }
      .container { width: 100%; max-width: none; padding: 0; }
      .no-print { display: none; }
      .page-break { page-break-inside: avoid; }
      h1 { font-size: 24px !important; }
      td, th { padding-top: 5px !important; padding-bottom: 5px !important; }
      .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- HEADER -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-bottom: 2px solid ${colors.gold}; padding-bottom: 20px;">
      <tr>
        <td valign="top">
          <img src="https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png" width="60" style="display: block; margin-bottom: 10px;">
          <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">XEPTION</div>
        </td>
        <td align="right" valign="top">
          <div style="font-size: 18px; font-weight: 900; text-transform: uppercase; color: ${colors.goldDark}; margin-bottom: 5px;">Facture</div>
          <div style="font-size: 14px; font-weight: bold;">#${id}</div>
          <div style="font-size: 12px; color: ${colors.textMuted}; margin-top: 5px;">${date}</div>
        </td>
      </tr>
    </table>

    <!-- INFO CLIENT & VENDEUR -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
      <tr>
        <td width="50%" valign="top" style="padding-right: 20px;">
          <div style="font-size: 10px; color: ${colors.textMuted}; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 2px;">Vendeur</div>
          <div style="font-weight: bold;">Xeption</div>
          <div style="font-size: 12px; color: ${colors.textMuted};">Mfoundi Mall, Boutique 2063</div>
          <div style="font-size: 12px; color: ${colors.textMuted};">Yaoundé, Cameroun</div>
          <div style="font-size: 12px; color: ${colors.textMuted};">+237 699 00 00 00</div>
        </td>
        <td width="50%" valign="top" style="padding-left: 20px;">
          <div style="font-size: 10px; color: ${colors.textMuted}; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 2px;">Client</div>
          <div style="font-weight: bold;">${customerName}</div>
          <div style="font-size: 12px; color: ${colors.textMuted};">${customerPhone}</div>
          <div style="font-size: 12px; color: ${colors.textMuted};">${customerEmail || ''}</div>
          <div style="font-size: 12px; color: ${colors.textMuted};">${customerCity}</div>
        </td>
      </tr>
    </table>

    <!-- ITEMS -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #000; color: #fff;">
          <th align="left" style="padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Désignation</th>
          <th align="center" style="padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Qté</th>
          <th align="right" style="padding: 8px 10px; font-size: 10px; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- TOTALS -->
    <table width="100%" cellpadding="0" cellspacing="0" class="page-break">
      <tr>
        <td width="60%"></td>
        <td width="40%">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 5px 0; color: ${colors.textMuted}; font-size: 12px;" align="right">Mode Livraison :</td>
              <td style="padding: 5px 0 5px 15px; font-weight: bold; font-size: 12px; text-transform: uppercase;" align="right">${deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: ${colors.textMuted}; font-size: 12px;" align="right">Paiement :</td>
              <td style="padding: 5px 0 5px 15px; font-weight: bold; font-size: 12px;" align="right">${paymentMethod}</td>
            </tr>
            <tr>
              <td colspan="2" style="border-top: 2px solid ${colors.gold}; padding-top: 10px; margin-top: 10px;"></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-weight: 900; font-size: 14px; text-transform: uppercase;" align="right">Net à Payer</td>
              <td style="padding: 5px 0 5px 15px; font-weight: 900; font-size: 20px; color: #000;" align="right">${total.toLocaleString('fr-FR')} <span style="font-size: 10px;">FCFA</span></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- FOOTER -->
    <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;" class="footer">
      <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">Merci pour votre confiance !</div>
      <div style="font-size: 10px; color: ${colors.textMuted}; margin-bottom: 10px;">Les marchandises vendues ne sont ni reprises ni échangées après 3 jours. Garantie valide sur présentation de cette facture.</div>
      <div style="font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">TRIGENYS GROUP &bull; XEPTION</div>
    </div>

  </div>
</body>
</html>
  `;
};
