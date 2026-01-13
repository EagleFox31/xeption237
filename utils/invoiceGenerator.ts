
import { Order, CartItem } from '../types';

export const generateInvoiceHTML = (order: Order): string => {
  const { id, customerName, customerEmail, customerPhone, customerCity, items, total, date, deliveryMode, paymentMethod } = order;

  // Base Styles for White & Electric Gold Theme
  const colors = {
    bg: '#FFFFFF',        // Pure white background
    card: '#FFFFFF',      // White card
    surface: '#FBFBFB',   // Subtle off-white for contrast
    gold: '#FFD700',      // Electric Gold (Vibrant)
    goldDark: '#B8860B',  // Deep Gold
    text: '#000000',      // Solid black for clarity
    textMuted: '#555555', // Dark grey for secondary text
    border: '#EEEEEE'     // Ultra light border
  };

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid ${colors.border};">
      <td style="padding: 24px 16px; color: ${colors.text}; font-family: 'Helvetica', sans-serif;">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px; text-transform: uppercase;">${item.name}</div>
        <div style="font-size: 11px; color: ${colors.goldDark}; text-transform: uppercase; letter-spacing: 2px;">Réf: ${item.category}</div>
      </td>
      <td style="padding: 24px 16px; color: ${colors.text}; font-family: 'Helvetica', sans-serif; text-align: center; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 24px 16px; color: ${colors.text}; font-family: 'Helvetica', sans-serif; text-align: right; font-weight: bold; font-size: 18px;">
        ${item.price.toLocaleString('fr-FR')} <span style="font-size: 10px; color: ${colors.goldDark};">FCFA</span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture Officielle Xeption Network</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.bg}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${colors.bg}; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Electric Gold Border Container -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: ${colors.card}; border: 4px solid ${colors.gold}; box-shadow: 0 30px 60px rgba(0,0,0,0.08); border-radius: 0px; max-width: 600px; width: 100%;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 50px 40px; text-align: center; border-bottom: 1px solid ${colors.border};">
              <img src="https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png" alt="XEPTION" width="80" style="display: block; margin: 0 auto 15px auto;">
              <h1 style="margin: 0; color: ${colors.text}; letter-spacing: 10px; font-size: 36px; text-transform: uppercase; font-weight: 900;">XEPTION</h1>
              <div style="color: ${colors.goldDark}; font-size: 12px; text-transform: uppercase; letter-spacing: 8px; margin-top: 8px; font-weight: 700;">NETWORK</div>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px 40px 10px 40px; text-align: center;">
              <h2 style="color: ${colors.text}; margin: 0 0 10px 0; font-size: 28px; text-transform: uppercase; letter-spacing: -0.5px; font-weight: 800;">Merci pour votre achat</h2>
              <p style="color: ${colors.textMuted}; font-size: 16px; line-height: 1.6; margin: 0;">
                M. <strong>${customerName}</strong>, votre commande est validée par nos experts.
              </p>
            </td>
          </tr>

          <!-- Order Summary Grid -->
          <tr>
            <td style="padding: 30px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${colors.surface}; border: 1px solid ${colors.border};">
                <tr>
                  <td width="50%" style="padding: 25px; border-right: 1px solid ${colors.border}; vertical-align: top;">
                    <div style="font-size: 11px; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: bold;">ID Commande</div>
                    <div style="color: ${colors.text}; font-weight: 900; font-size: 20px; font-family: 'Courier New', Courier, monospace;">#${id}</div>
                    
                    <div style="font-size: 11px; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; margin-top: 25px; font-weight: bold;">Date</div>
                    <div style="color: ${colors.text}; font-weight: bold; font-size: 15px;">${date}</div>
                  </td>
                  <td width="50%" style="padding: 25px; vertical-align: top;">
                    <div style="font-size: 11px; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: bold;">Informations de Livraison</div>
                    <div style="color: ${colors.text}; font-weight: 900; font-size: 16px;">${customerName}</div>
                    <div style="color: ${colors.textMuted}; font-size: 13px; margin-top: 6px;">Tél: ${customerPhone}</div>
                    <div style="color: ${colors.textMuted}; font-size: 13px; font-style: italic;">${customerCity}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="background-color: ${colors.text};">
                    <th align="left" style="color: ${colors.gold}; font-size: 11px; text-transform: uppercase; padding: 15px 20px; letter-spacing: 2px; font-weight: 900;">Article</th>
                    <th align="center" style="color: ${colors.gold}; font-size: 11px; text-transform: uppercase; padding: 15px 20px; letter-spacing: 2px; font-weight: 900;">Quantité</th>
                    <th align="right" style="color: ${colors.gold}; font-size: 11px; text-transform: uppercase; padding: 15px 20px; letter-spacing: 2px; font-weight: 900;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Payment Details & Total -->
          <tr>
            <td style="padding: 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="right">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: ${colors.textMuted}; font-size: 15px; text-align: right;">Mode :</td>
                        <td style="padding: 8px 0 8px 25px; color: ${colors.text}; font-weight: bold; text-align: right; text-transform: uppercase;">${deliveryMode}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: ${colors.textMuted}; font-size: 15px; text-align: right;">Paiement :</td>
                        <td style="padding: 8px 0 8px 25px; color: ${colors.text}; font-weight: bold; text-align: right;">${paymentMethod}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 35px;">
                          <div style="border-top: 5px solid ${colors.gold}; padding: 20px 0;">
                            <span style="color: ${colors.textMuted}; font-size: 14px; text-transform: uppercase; letter-spacing: 3px; font-weight: 900; vertical-align: middle;">Net à Payer</span>
                            <span style="color: ${colors.text}; font-size: 38px; font-weight: 900; margin-left: 20px; vertical-align: middle;">
                              ${total.toLocaleString('fr-FR')} <span style="font-size: 14px;">FCFA</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Action & Info -->
          <tr>
            <td style="padding: 50px 40px; text-align: center; background-color: ${colors.text};">
              <div style="margin-bottom: 30px;">
                <p style="color: ${colors.gold}; font-size: 16px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 3px;">XEPTION CARE</p>
                <p style="color: #FFFFFF; font-size: 14px; opacity: 0.8; margin: 0; line-height: 1.5;">Notre équipe logistique vous contactera sous peu pour finaliser la remise en main propre.</p>
              </div>
              
              <table align="center" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: ${colors.gold}; padding: 18px 45px;">
                    <a href="mailto:support@xeptionetwork.shop" style="color: ${colors.text}; text-decoration: none; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Contacter Support</a>
                  </td>
                </tr>
              </table>

              <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 45px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">
                TRIGENYS GROUP &bull; XEPTION NETWORK &bull; CAMEROUN 237
              </p>
            </td>
          </tr>

        </table>

        <!-- Security Badge -->
        <table width="600" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 30px 0; text-align: center;">
              <p style="color: #BBBBBB; font-size: 12px; margin: 0; font-weight: 500;">
                Transaction 100% sécurisée par l'infrastructure Xeption.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
