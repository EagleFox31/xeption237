export interface CertifData {
  customerName: string;
  imei: string;
  deviceBrand?: string;
  deviceModel?: string;
  blacklistStatus: 'unknown' | 'clear' | 'blacklisted';
  imeiStatus: 'valid' | 'invalid' | 'check_failed';
  reference: string;
  issuedAt: string;
}

const esc = (v: string) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const generateCertifHTML = (data: CertifData): string => {
  const name   = esc(data.customerName);
  const imei   = esc(data.imei);
  const device = data.deviceBrand || data.deviceModel
    ? esc(`${data.deviceBrand ?? ''} ${data.deviceModel ?? ''}`.trim())
    : 'Non identifié';
  const ref    = esc(data.reference);
  const date   = fmtDate(data.issuedAt);

  const bl = data.blacklistStatus;
  const blLabel  = bl === 'clear' ? 'PROPRE' : bl === 'blacklisted' ? 'BLACKLISTÉ' : 'INCONNU';
  const blColor  = bl === 'clear' ? '#22c55e' : bl === 'blacklisted' ? '#ef4444' : '#9ca3af';
  const blBg     = bl === 'clear' ? '#052e16' : bl === 'blacklisted' ? '#2d0a0a' : '#111827';

  const imeiLabel = data.imeiStatus === 'valid' ? 'VALIDE' : data.imeiStatus === 'invalid' ? 'INVALIDE' : 'NON VÉRIFIÉ';
  const imeiColor = data.imeiStatus === 'valid' ? '#22c55e' : data.imeiStatus === 'invalid' ? '#ef4444' : '#9ca3af';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Certificat Xeption — ${imei}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #fff;
      font-family: 'Inter', sans-serif;
      padding: 40px;
      min-height: 100vh;
    }
    .cert {
      max-width: 680px;
      margin: 0 auto;
      border: 1px solid #2a2a2a;
      background: #111;
    }
    .cert-header {
      background: #0a0a0a;
      border-bottom: 2px solid #FFD700;
      padding: 28px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cert-brand {
      font-family: 'Space Mono', monospace;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #FFD700;
    }
    .cert-subtitle {
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #666;
      margin-top: 4px;
      font-family: 'Space Mono', monospace;
    }
    .cert-stamp {
      width: 64px;
      height: 64px;
      border: 2px solid ${blColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      color: ${blColor};
      text-align: center;
      text-transform: uppercase;
    }
    .cert-body { padding: 36px; }
    .cert-title {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 24px;
    }
    .cert-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 14px 0;
      border-bottom: 1px solid #1f1f1f;
    }
    .cert-row:last-child { border-bottom: none; }
    .cert-label {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
      font-family: 'Space Mono', monospace;
      flex-shrink: 0;
      width: 160px;
    }
    .cert-value {
      font-size: 14px;
      color: #e5e5e5;
      font-weight: 500;
      text-align: right;
      font-family: 'Inter', sans-serif;
    }
    .cert-value.mono {
      font-family: 'Space Mono', monospace;
      letter-spacing: 2px;
      font-size: 13px;
    }
    .cert-badge {
      display: inline-block;
      padding: 3px 10px;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      border: 1px solid;
    }
    .cert-footer {
      background: #0a0a0a;
      border-top: 1px solid #1f1f1f;
      padding: 16px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cert-footer-note {
      font-size: 10px;
      color: #444;
      font-family: 'Space Mono', monospace;
      letter-spacing: 1px;
    }
    .cert-ref {
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      color: #333;
      letter-spacing: 1px;
    }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .cert { border-color: #ccc; background: #fff; }
      .cert-header { background: #f9f9f9; border-bottom: 2px solid #000; }
      .cert-brand { color: #000; }
      .cert-subtitle { color: #666; }
      .cert-body { padding: 24px; }
      .cert-footer { background: #f9f9f9; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="cert-header">
      <div>
        <div class="cert-brand">XEPTION</div>
        <div class="cert-subtitle">Certificat de vérification IMEI</div>
      </div>
      <div class="cert-stamp" style="background:${blBg}">${blLabel}</div>
    </div>
    <div class="cert-body">
      <p class="cert-title">Rapport de vérification — ${date}</p>

      <div class="cert-row">
        <span class="cert-label">Client</span>
        <span class="cert-value">${name}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Appareil</span>
        <span class="cert-value">${device}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">IMEI vérifié</span>
        <span class="cert-value mono">${imei}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Statut IMEI</span>
        <span class="cert-value">
          <span class="cert-badge" style="color:${imeiColor};border-color:${imeiColor}40">${imeiLabel}</span>
        </span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Liste noire</span>
        <span class="cert-value">
          <span class="cert-badge" style="color:${blColor};border-color:${blColor}40">${blLabel}</span>
        </span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Référence</span>
        <span class="cert-value mono" style="font-size:11px;color:#888">${ref}</span>
      </div>
    </div>
    <div class="cert-footer">
      <span class="cert-footer-note">Xeption Network 237 · Yaoundé, Cameroun</span>
      <span class="cert-ref">Vérifiable en boutique</span>
    </div>
  </div>
</body>
</html>`;
};
