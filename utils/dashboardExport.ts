import type { DashboardAnalytics } from './dashboardAnalytics';
import { formatFcfa, formatPeriodLabel } from './dashboardAnalytics';

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
      ['Note historique', `${data.coverage_gap.orders_without_line_items} commande(s) sans détail produit`],
      ['CA sans détail', String(data.coverage_gap.revenue_without_detail)],
    );
  }

  const csv = rows.map((r) => r.map(escapeCell).join(';')).join('\n');
  downloadBlob(`xeption-pilotage-${label}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
};

export const printEndOfDayReport = (data: DashboardAnalytics) => {
  const period = formatPeriodLabel(new Date(data.period.from), new Date(data.period.to));
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Rapport Xeption — ${period}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:720px;margin:0 auto}
  h1{font-size:18px;margin:0 0 4px} .sub{color:#555;font-size:13px;margin-bottom:24px}
  .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:28px}
  .kpi{border:1px solid #ddd;border-radius:8px;padding:12px}
  .kpi label{font-size:10px;text-transform:uppercase;color:#666;display:block}
  .kpi strong{font-size:20px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px}
  th,td{border-bottom:1px solid #eee;padding:8px 4px;text-align:left}
  th{font-size:10px;text-transform:uppercase;color:#666}
  .note{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px;font-size:11px;color:#92400e}
  @media print{body{padding:16px}}
</style></head><body>
<h1>Rapport de fin de journée — Xeption</h1>
<p class="sub">${period}</p>
<div class="kpis">
  <div class="kpi"><label>CA encaissé</label><strong>${formatFcfa(data.kpis.revenue)}</strong></div>
  <div class="kpi"><label>Transactions</label><strong>${data.kpis.transaction_count}</strong></div>
  <div class="kpi"><label>Articles</label><strong>${data.kpis.items_sold}</strong></div>
  <div class="kpi"><label>Panier moyen</label><strong>${formatFcfa(data.kpis.average_basket)}</strong></div>
</div>
<h2>Vendeurs</h2>
<table><thead><tr><th>Nom</th><th>Boutique</th><th>CA</th><th>Ventes</th></tr></thead><tbody>
${data.by_staff.map((s) => `<tr><td>${s.staff_name}</td><td>${s.store_name ?? '—'}</td><td>${formatFcfa(s.revenue)}</td><td>${s.transaction_count}</td></tr>`).join('')}
</tbody></table>
<h2>Boutiques</h2>
<table><thead><tr><th>Boutique</th><th>CA</th><th>Ventes</th></tr></thead><tbody>
${data.by_store.map((s) => `<tr><td>${s.store_name}</td><td>${formatFcfa(s.revenue)}</td><td>${s.transaction_count}</td></tr>`).join('')}
</tbody></table>
<h2>Top produits</h2>
<table><thead><tr><th>Produit</th><th>Qté</th><th>CA</th></tr></thead><tbody>
${data.top_products.map((p) => `<tr><td>${p.product_name}</td><td>${p.quantity}</td><td>${formatFcfa(p.revenue)}</td></tr>`).join('')}
</tbody></table>
${data.coverage_gap.orders_without_line_items > 0 ? `<p class="note">${data.coverage_gap.orders_without_line_items} vente(s) historique(s) sans détail produit (${formatFcfa(data.coverage_gap.revenue_without_detail)}). Les totaux par produit peuvent être incomplets.</p>` : ''}
<script>window.onload=()=>{window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
};
