import ExcelJS from 'exceljs';
import type { DashboardAnalytics } from './dashboardAnalytics';
import {
  formatFcfa,
  formatPeriodLabel,
  productDetailRevenue,
  REVENUE_DEFINITION,
  topProductsCoverageNote,
} from './dashboardAnalytics';

/** Même logo que les factures — URL Cloudinary stable pour html2canvas (useCORS). */
const REPORT_LOGO_URL =
  'https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png';

const escapeCell = (v: string | number) =>
  `"${String(v).replace(/"/g, '""')}"`;

const downloadBlob = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  downloadBlobFile(filename, blob);
};

const downloadBlobFile = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const XLSX_COLORS = {
  gold: 'FFFFD700',
  goldLight: 'FFFFF9DB',
  head: 'FFFAF8F0',
  text: 'FF14140F',
  muted: 'FF7A7A70',
  border: 'FFE6E6E6',
  white: 'FFFFFFFF',
} as const;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: XLSX_COLORS.border } },
  left: { style: 'thin', color: { argb: XLSX_COLORS.border } },
  bottom: { style: 'thin', color: { argb: XLSX_COLORS.border } },
  right: { style: 'thin', color: { argb: XLSX_COLORS.border } },
};

/** Export Excel (.xlsx) avec mise en forme — titres, colonnes, montants FCFA. */
export const exportDashboardExcel = async (data: DashboardAnalytics, label: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Xeption ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Pilotage', {
    views: [{ showGridLines: false }],
  });

  sheet.columns = [
    { key: 'a', width: 30 },
    { key: 'b', width: 24 },
    { key: 'c', width: 18 },
    { key: 'd', width: 14 },
    { key: 'e', width: 14 },
  ];

  const period = formatPeriodLabel(new Date(data.period.from), new Date(data.period.to));
  let r = 1;

  sheet.mergeCells(`A${r}:E${r}`);
  const title = sheet.getCell(`A${r}`);
  title.value = 'Xeption — Pilotage ventes';
  title.font = { bold: true, size: 14, color: { argb: XLSX_COLORS.text } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.gold } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(r).height = 30;
  r += 1;

  sheet.getCell(`A${r}`).value = 'Période';
  sheet.getCell(`A${r}`).font = { bold: true, size: 10 };
  sheet.mergeCells(`B${r}:E${r}`);
  sheet.getCell(`B${r}`).value = period;
  sheet.getCell(`B${r}`).font = { size: 10 };
  r += 1;

  sheet.mergeCells(`A${r}:E${r}`);
  const def = sheet.getCell(`A${r}`);
  def.value = `CA encaissé : ${REVENUE_DEFINITION}`;
  def.font = { italic: true, size: 9, color: { argb: XLSX_COLORS.muted } };
  def.alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(r).height = 36;
  r += 2;

  const writeTableHeader = (rowNum: number, headers: string[]) => {
    headers.forEach((label, i) => {
      const cell = sheet.getCell(rowNum, i + 1);
      cell.value = label;
      cell.font = { bold: true, size: 9, color: { argb: XLSX_COLORS.muted } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.head } };
      cell.alignment = { horizontal: i >= 2 ? 'right' : 'left', vertical: 'middle' };
      cell.border = thinBorder;
    });
    sheet.getRow(rowNum).height = 22;
  };

  const writeMoney = (cell: ExcelJS.Cell, amount: number) => {
    cell.value = amount;
    cell.numFmt = '#,##0 "FCFA"';
    cell.alignment = { horizontal: 'right' };
  };

  const writeSection = (sectionTitle: string, headerRow: string[], bodyRows: (string | number)[][], emptyMsg: string) => {
    sheet.mergeCells(`A${r}:E${r}`);
    const section = sheet.getCell(`A${r}`);
    section.value = sectionTitle;
    section.font = { bold: true, size: 11 };
    section.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.goldLight } };
    section.border = { bottom: { style: 'medium', color: { argb: XLSX_COLORS.gold } } };
    r += 1;

    if (bodyRows.length === 0) {
      sheet.mergeCells(`A${r}:E${r}`);
      const empty = sheet.getCell(`A${r}`);
      empty.value = emptyMsg;
      empty.font = { italic: true, size: 10, color: { argb: XLSX_COLORS.muted } };
      empty.alignment = { horizontal: 'center', vertical: 'middle' };
      empty.border = thinBorder;
      sheet.getRow(r).height = 28;
      r += 2;
      return;
    }

    writeTableHeader(r, headerRow);
    r += 1;

    bodyRows.forEach((values, idx) => {
      values.forEach((val, colIdx) => {
        const cell = sheet.getCell(r, colIdx + 1);
        if (typeof val === 'number' && colIdx >= 2) {
          writeMoney(cell, val);
        } else {
          cell.value = val;
          cell.alignment = { horizontal: colIdx >= 2 ? 'right' : 'left' };
        }
        cell.font = { size: 10 };
        cell.border = thinBorder;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFCFA' } };
        }
      });
      r += 1;
    });
    r += 1;
  };

  sheet.mergeCells(`A${r}:B${r}`);
  sheet.getCell(`A${r}`).value = 'Indicateurs';
  sheet.getCell(`A${r}`).font = { bold: true, size: 11 };
  sheet.mergeCells(`C${r}:E${r}`);
  sheet.getCell(`C${r}`).value = 'Valeur';
  sheet.getCell(`C${r}`).font = { bold: true, size: 11 };
  sheet.getCell(`C${r}`).alignment = { horizontal: 'right' };
  r += 1;

  const kpis: [string, string | number, boolean][] = [
    ['CA encaissé', data.kpis.revenue, true],
    ['Transactions', data.kpis.transaction_count, false],
    ['Articles vendus', data.kpis.items_sold, false],
    ['Panier moyen', data.kpis.average_basket, true],
    ['Remises', data.kpis.discount_total, true],
  ];

  kpis.forEach(([label, value, isMoney], idx) => {
    sheet.mergeCells(`A${r}:B${r}`);
    sheet.getCell(`A${r}`).value = label;
    sheet.getCell(`A${r}`).font = { size: 10, bold: label === 'CA encaissé' };
    sheet.mergeCells(`C${r}:E${r}`);
    const valCell = sheet.getCell(`C${r}`);
    if (isMoney) writeMoney(valCell, Number(value));
    else {
      valCell.value = value;
      valCell.alignment = { horizontal: 'right' };
    }
    valCell.font = { size: 10, bold: label === 'CA encaissé' };
    const rowFill =
      label === 'CA encaissé'
        ? XLSX_COLORS.goldLight
        : idx % 2 === 1
          ? 'FFFCFCFA'
          : null;
    if (rowFill) {
      sheet.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
    }
    sheet.getCell(`A${r}`).border = thinBorder;
    valCell.border = thinBorder;
    r += 1;
  });
  r += 1;

  writeSection(
    'Classement vendeurs',
    ['Nom', 'Boutique', 'CA', 'Ventes', 'Articles'],
    data.by_staff.map((s) => [
      s.staff_name,
      s.store_name ?? '—',
      s.revenue,
      s.transaction_count,
      s.items_sold,
    ]),
    'Aucune vente attribuée à un vendeur sur cette période.',
  );

  writeSection(
    'Performance boutiques',
    ['Boutique', 'CA', 'Ventes'],
    data.by_store.map((s) => [s.store_name, s.revenue, s.transaction_count]),
    'Aucune vente rattachée à une boutique sur cette période.',
  );

  writeSection(
    'Top produits',
    ['Produit', 'Quantité', 'CA'],
    data.top_products.map((p) => [p.product_name, p.quantity, p.revenue]),
    'Aucun article vendu sur cette période.',
  );

  if (data.coverage_gap.orders_without_line_items > 0) {
    sheet.mergeCells(`A${r}:E${r}`);
    sheet.getCell(`A${r}`).value = topProductsCoverageNote(data) ?? '';
    sheet.getCell(`A${r}`).font = { italic: true, size: 9, color: { argb: 'FF6B5500' } };
    sheet.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.goldLight } };
    sheet.getCell(`A${r}`).alignment = { wrapText: true };
    r += 1;
  }

  sheet.mergeCells(`A${r}:E${r}`);
  sheet.getCell(`A${r}`).value = 'Xeption Network 237 — export interne ERP';
  sheet.getCell(`A${r}`).font = { size: 9, color: { argb: XLSX_COLORS.muted } };
  sheet.getCell(`A${r}`).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlobFile(
    `xeption-pilotage-${label}.xlsx`,
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
};

/** @deprecated Préférer exportDashboardExcel — conservé pour scripts éventuels. */
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

/** Contenu HTML du rapport (styles embarqués pour rendu html2pdf). */
export const buildEndOfDayReportHtml = (data: DashboardAnalytics): string => {
  const period = formatPeriodLabel(new Date(data.period.from), new Date(data.period.to));
  const printedAt = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const section = (title: string, headers: string[], rows: string[], empty: string) => `
    <section>
      <h2>${title}</h2>
      ${rows.length
        ? `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
           <tbody>${rows.join('')}</tbody></table>`
        : `<p class="empty">${empty}</p>`}
    </section>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Rapport Xeption — ${period}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#14140f;background:#fff}

  .report-page{
    width:100%;max-width:820px;margin:0 auto;padding:28px 32px;
    min-height:277mm;display:flex;flex-direction:column;background:#fff
  }
  .report-main{flex:1 1 auto}

  .head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
        border-bottom:3px solid #FFD700;padding-bottom:14px;margin-bottom:22px}
  .head-left{display:flex;align-items:center;gap:14px}
  .logo{display:block;width:52px;height:52px;object-fit:contain;flex-shrink:0}
  .brand{font-size:20px;font-weight:800;letter-spacing:-.5px;line-height:1.1}
  .brand span{color:#c9a200}
  .head .meta{text-align:right;font-size:11px;color:#666;line-height:1.5;flex-shrink:0}
  h1{font-size:13px;margin:4px 0 0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#444}

  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 10px}
  .kpi{border:1px solid #e6e6e6;border-radius:8px;padding:12px 14px;background:#fcfcfa;
       text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .kpi.hero{background:#FFF9DB;border-color:#FFD700}
  .kpi label{font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#7a7a70;display:block;margin-bottom:6px;width:100%}
  .kpi strong{font-size:19px;font-weight:800;display:block;line-height:1.15;width:100%}
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
  .empty{font-size:12px;color:#8a8a80;padding:14px 16px;background:#fafaf7;
         border:1px dashed #ddd;border-radius:6px;margin:0;
         text-align:center;min-height:52px;display:flex;align-items:center;justify-content:center}

  .note{background:#FFF9DB;border-left:3px solid #FFD700;padding:10px 12px;
        font-size:11px;color:#6b5500;margin-top:18px;border-radius:0 4px 4px 0}
  .foot{margin-top:auto;padding-top:18px;border-top:1px solid #eee;
        font-size:10px;color:#9a9a90;display:flex;justify-content:space-between;flex-shrink:0}
</style></head><body>

<div class="report-page">

<div class="head">
  <div class="head-left">
    <img class="logo" src="${REPORT_LOGO_URL}" alt="Xeption" width="52" height="52" />
    <div>
      <div class="brand">XEPTION<span>.</span></div>
      <h1>Rapport de fin de journée</h1>
    </div>
  </div>
  <div class="meta">
    <strong>${period}</strong><br/>
    Édité le ${printedAt}
  </div>
</div>

<div class="report-main">
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

</div>

<div class="foot">
  <span>Xeption Network 237 — document interne</span>
  <span>Généré automatiquement, sans ressaisie</span>
</div>

</div>

</body></html>`;
};

/** Rapport de fin de journée — téléchargé en PDF (même moteur que les factures). */
export const downloadEndOfDayReport = async (data: DashboardAnalytics) => {
  const html = buildEndOfDayReportHtml(data);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const wrapper = document.createElement('div');
  wrapper.style.width = '820px';
  wrapper.style.minHeight = '277mm';
  wrapper.style.background = 'white';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';

  const style = parsed.querySelector('style');
  if (style?.textContent) {
    const styleEl = document.createElement('style');
    styleEl.textContent = style.textContent;
    wrapper.appendChild(styleEl);
  }

  const content = document.createElement('div');
  content.innerHTML = parsed.body.innerHTML;
  wrapper.appendChild(content);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.appendChild(wrapper);
  document.body.appendChild(container);

  const logoImg = wrapper.querySelector('img.logo');
  if (logoImg instanceof HTMLImageElement && !logoImg.complete) {
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: `xeption-rapport-${stamp}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(wrapper)
      .save();
  } catch {
    throw new Error('Impossible de générer le PDF du rapport pour le moment.');
  } finally {
    document.body.removeChild(container);
  }
};
