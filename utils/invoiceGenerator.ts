
import { Order, CartItem } from '../types';

export const generateInvoiceHTML = (order: Order): string => {
  const { id, customerName, customerEmail, customerPhone, customerCity, items, total, date, deliveryMode, paymentMethod } = order;

  const colors = {
    bg: '#FFFFFF',
    gold: '#FFD700',
    goldDark: '#B8860B',
    text: '#000000',
    textMuted: '#666666',
    border: '#E5E5E5'
  };

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid ${colors.border};">
      <td style="padding: 12px 8px; vertical-align: top;">
        <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">${item.name}</div>
        <div style="font-size: 10px; color: ${colors.textMuted};">${item.category}</div>
      </td>
      <td style="padding: 12px 8px; text-align: center; font-size: 13px;">${item.quantity}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 14px;">
        ${item.price.toLocaleString('fr-FR')} <span style="font-size: 9px;">FCFA</span>
      </td>
      <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 14px;">
        ${(item.price * item.quantity).toLocaleString('fr-FR')} <span style="font-size: 9px;">FCFA</span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @media print {
      @page { size: A4; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
    body { margin: 0; padding: 20px; font-family: 'Helvetica', Arial, sans-serif; color: ${colors.text}; line-height: 1.4; }
    .header { border-bottom: 3px solid ${colors.gold}; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .logo-box { text-align: left; }
    .invoice-title { text-align: right; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
    .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: ${colors.goldDark}; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid ${colors.border}; padding-bottom: 4px; }
    .info-text { font-size: 12px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #F9F9F9; text-transform: uppercase; font-size: 10px; padding: 10px 8px; border-bottom: 2px solid ${colors.text}; text-align: left; }
    .totals { margin-left: auto; width: 250px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
    .total-final { border-top: 2px solid ${colors.gold}; padding-top: 10px; margin-top: 10px; font-size: 20px; font-weight: 900; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid ${colors.border}; text-align: center; font-size: 10px; color: ${colors.textMuted}; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      <div style="font-weight: 900; font-size: 24px; letter-spacing: 4px;">XEPTION</div>
      <div style="font-size: 10px; font-weight: bold; letter-spacing: 3px; color: ${colors.goldDark};">NETWORK - BOUTIQUE 2063</div>
    </div>
    <div class="invoice-title">
      <div style="font-size: 20px; font-weight: 900;">FACTURE</div>
      <div style="font-family: monospace; font-size: 14px;">#${id}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="section-title">Émetteur</div>
      <div class="info-text"><strong>Xeption Network CM</strong></div>
      <div class="info-text">Mfoundi Mall, Yaoundé</div>
      <div class="info-text">Tél: (+237) 699 00 00 00</div>
      <div class="info-text">support@xeptionnetwork.shop</div>
    </div>
    <div>
      <div class="section-title">Client / Facturé à</div>
      <div class="info-text"><strong>${customerName}</strong></div>
      <div class="info-text">${customerPhone}</div>
      <div class="info-text">${customerEmail || 'N/A'}</div>
      <div class="info-text">${customerCity || 'Yaoundé'}</div>
    </div>
  </div>

  <div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
    <div>
      <div class="section-title">Date d'émission</div>
      <div class="info-text">${date}</div>
    </div>
    <div>
      <div class="section-title">Mode de Retrait</div>
      <div class="info-text" style="text-transform: uppercase;">${deliveryMode === 'pickup' ? 'Boutique' : 'Livraison'}</div>
    </div>
    <div>
      <div class="section-title">Mode de Paiement</div>
      <div class="info-text">${paymentMethod}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation Article</th>
        <th style="text-align: center;">Qté</th>
        <th style="text-align: right;">Prix Unitaire</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Sous-total HT</span>
      <span>${total.toLocaleString('fr-FR')} FCFA</span>
    </div>
    <div class="total-row">
      <span>TVA (0%)</span>
      <span>0 FCFA</span>
    </div>
    <div class="total-row total-final">
      <span>NET À PAYER</span>
      <span>${total.toLocaleString('fr-FR')} FCFA</span>
    </div>
  </div>

  <div class="footer">
    <p>Merci pour votre confiance. Les articles sous garantie bénéficient d'une assistance prioritaire au SAV.<br>
    <strong>TRIGENYS GROUP &bull; XEPTION NETWORK &bull; BOUTIQUE 2063 MFOUNDI MALL</strong></p>
  </div>
</body>
</html>
  `;
};
