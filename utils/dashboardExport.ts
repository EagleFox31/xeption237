import type { DashboardAnalytics } from './dashboardAnalytics';
import {
  formatFcfa,
  formatPeriodLabel,
  productDetailRevenue,
  REVENUE_DEFINITION,
  topProductsCoverageNote,
} from './dashboardAnalytics';

const escapeCell = (v: string | number) =>
  `"${String(v).replace(/"/g, '""')}"`;

const downloadBlob = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** Export Excel-compatible (CSV UTF-8 BOM, séparateur ;). */
export const exportDashboardCsv = (data: DashboardAnalytics, label: string) => {
  const rows: string[][] = [
    ['Xeption — Pilotage ventes'],
    ['Période', formatPeriodLabel(new Date(data.period.from), new Date(data.period.to))],
    ['Définition CA encaissé', REVENUE_DEFINITION],
    [],
    ['Indicateurs', 'Valeur'],
    ['CA encaissé', formatFcfa(data.kpis.revenue)],
    ['Transactions', String(data.kpis.transaction_count)],
    ['Articles vendus', String(data.kpis.items_sold)],
    ['Panier moyen', formatFcfa(data.kpis.average_basket)],
    ['Remises', formatFcfa(data.kpis.discount_total)],
    [],
    ['Classement vendeurs', 'Boutique', 'CA', 'Ventes', 'Articles'],
    ...data.by_staff.map((s) => [
      s.staff_name,
      s.store_name ?? '—',
      String(s.revenue),
      String(s.transaction_count),
      String(s.items_sold),
    ]),
    [],
    ['Performance boutiques', 'CA', 'Ventes'],
    ...data.by_store.map((s) => [s.store_name, String(s.revenue), String(s.transaction_count)]),
    [],
    ['Top produits', 'Quantité', 'CA'],
    ...data.top_products.map((p) => [p.product_name, String(p.quantity), String(p.revenue)]),
  ];

  if (data.coverage_gap.orders_without_line_items > 0) {
    rows.push(
      [],
      ['Ventilation produits', formatFcfa(productDetailRevenue(data))],
      ['Hors ventilation', formatFcfa(data.coverage_gap.revenue_without_detail)],
      ['Commandes sans détail', String(data.coverage_gap.orders_without_line_items)],
      ['Note', topProductsCoverageNote(data) ?? ''],
    );
  }

  const csv = rows.map((r) => r.map(escapeCell).join(';')).join('\n');
  downloadBlob(`xeption-pilotage-${label}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
};

/**
 * Rapport de fin de journée — TÉLÉCHARGÉ en fichier autonome.
 *
 * Le fichier `.html` embarque tout son style : il s'ouvre à l'identique sur
 * n'importe quel navigateur, téléphone comme ordinateur, même hors connexion,
 * et reste imprimable en PDF depuis là.
 *
 * ⚠️ Ce n'est pas un `.pdf`. En produire un vrai demanderait une bibliothèque
 * (jsPDF ou pdfmake) : les navigateurs n'exposent aucune API d'écriture PDF.
 * L'ancienne version ouvrait un onglet et déclenchait `window.print()` en
 * s'appuyant sur « Enregistrer au format PDF » — efficace mais déroutant, on
 * cliquait « rapport » et une boîte d'impression s'ouvrait.
 */
export const downloadEndOfDayReport = (data: DashboardAnalytics) => {
  const period = formatPeriodLabel(new Date(data.period.from), new Date(data.period.to));
  const printedAt = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Une section vide affiche une phrase, jamais un tableau à en-têtes seules :
  // un tableau vide se lit comme un bug, une phrase se lit comme une information.
  const section = (title: string, headers: string[], rows: string[], empty: string) => `
    <section>
      <h2>${title}</h2>
      ${rows.length
        ? `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
           <tbody>${rows.join('')}</tbody></table>`
        : `<p class="empty">${empty}</p>`}
    </section>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Rapport Xeption — ${period}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:28px 32px;color:#14140f;
       max-width:820px;margin:0 auto;background:#fff}

  .head{display:flex;align-items:center;justify-content:space-between;gap:16px;
        border-bottom:3px solid #FFD700;padding-bottom:14px;margin-bottom:22px}
  .brand{font-size:22px;font-weight:800;letter-spacing:-.5px}
  .brand span{color:#c9a200}
  .head .meta{text-align:right;font-size:11px;color:#666;line-height:1.5}
  h1{font-size:15px;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#444}

  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 10px}
  .kpi{border:1px solid #e6e6e6;border-radius:8px;padding:12px 14px;background:#fcfcfa}
  .kpi.hero{background:#FFF9DB;border-color:#FFD700}
  .kpi label{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#7a7a70;display:block;margin-bottom:6px}
  .kpi strong{font-size:19px;font-weight:800;display:block;line-height:1.15}
  .kpi.hero strong{color:#8a6d00}

  .def{font-size:10px;color:#7a7a70;margin:0 0 24px;font-style:italic}

  h2{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:#14140f;
     margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #FFD700}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#7a7a70;
     text-align:left;padding:6px 8px;background:#faf8f0}
  td{padding:7px 8px;border-bottom:1px solid #f0f0ec}
  tbody tr:nth-child(even) td{background:#fcfcfa}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .empty{font-size:12px;color:#8a8a80;padding:12px 8px;background:#fafaf7;
         border:1px dashed #ddd;border-radius:6px;margin:0}

  .note{background:#FFF9DB;border-left:3px solid #FFD700;padding:10px 12px;
        font-size:11px;color:#6b5500;margin-top:18px;border-radius:0 4px 4px 0}
  .foot{margin-top:26px;padding-top:10px;border-top:1px solid #eee;
        font-size:10px;color:#9a9a90;display:flex;justify-content:space-between}

  @media print{
    body{padding:0}
    section{break-inside:avoid}
    .kpi.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style></head><body>

<div class="head">
  <div>
    <div class="brand">XEPTION<span>.</span></div>
    <h1>Rapport de fin de journée</h1>
  </div>
  <div class="meta">
    <strong>${period}</strong><br/>
    Édité le ${printedAt}
  </div>
</div>

<div class="kpis">
  <div class="kpi hero"><label>CA encaissé</label><strong>${formatFcfa(data.kpis.revenue)}</strong></div>
  <div class="kpi"><label>Transactions</label><strong>${data.kpis.transaction_count}</strong></div>
  <div class="kpi"><label>Articles vendus</label><strong>${data.kpis.items_sold}</strong></div>
  <div class="kpi"><label>Panier moyen</label><strong>${formatFcfa(data.kpis.average_basket)}</strong></div>
</div>
<p class="def">CA encaissé : ${REVENUE_DEFINITION}</p>

${section('Vendeurs', ['Nom', 'Boutique', 'CA', 'Ventes'],
  data.by_staff.map((s) => `<tr><td>${s.staff_name}</td><td>${s.store_name ?? '—'}</td><td class="num">${formatFcfa(s.revenue)}</td><td class="num">${s.transaction_count}</td></tr>`),
  'Aucune vente attribuée à un vendeur sur cette période.')}

${section('Boutiques', ['Boutique', 'CA', 'Ventes'],
  data.by_store.map((s) => `<tr><td>${s.store_name}</td><td class="num">${formatFcfa(s.revenue)}</td><td class="num">${s.transaction_count}</td></tr>`),
  'Aucune vente rattachée à une boutique sur cette période.')}

${section('Top produits', ['Produit', 'Qté', 'CA'],
  data.top_products.map((p) => `<tr><td>${p.product_name}</td><td class="num">${p.quantity}</td><td class="num">${formatFcfa(p.revenue)}</td></tr>`),
  'Aucun article vendu sur cette période.')}

${topProductsCoverageNote(data) ? `<p class="note">${topProductsCoverageNote(data)}</p>` : ''}

<div class="foot">
  <span>Xeption Network 237 — document interne</span>
  <span>Généré automatiquement, sans ressaisie</span>
</div>

</body></html>`;

  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(`xeption-rapport-${stamp}.html`, html, 'text/html;charset=utf-8');
};
