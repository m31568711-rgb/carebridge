import type { Locale } from "@/src/i18n/config";
import type { ReportColumn, ReportRow } from "./report-toolbar";

export function escapeReportHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}

export function buildReportHtml({
  columns,
  filters,
  generated,
  generatedLabel,
  filtersLabel,
  locale,
  reportName,
  rows,
}: {
  columns: ReportColumn[];
  filters: string[];
  generated: string;
  generatedLabel: string;
  filtersLabel: string;
  locale: Locale;
  reportName: string;
  rows: ReportRow[];
}) {
  const direction = locale === "ar" ? "rtl" : "ltr";
  const body = `<section class="carebridge-export" dir="${direction}"><header><div class="brand">CareBridge</div><h1>${escapeReportHtml(reportName)}</h1><p>${escapeReportHtml(generatedLabel)}: ${escapeReportHtml(generated)}</p>${filters.length ? `<p>${escapeReportHtml(filtersLabel)}: ${filters.map(escapeReportHtml).join(" · ")}</p>` : ""}</header><table><thead><tr>${columns.map((column) => `<th>${escapeReportHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeReportHtml(row[column.key])}</td>`).join("")}</tr>`).join("")}</tbody></table><footer>CareBridge · ${escapeReportHtml(reportName)}</footer></section>`;
  const styles = `<style>*{box-sizing:border-box}body{margin:0;color:#102a43;font-family:Inter,"IBM Plex Sans Arabic",Arial,sans-serif}.carebridge-export{padding:28px;background:#fff}.carebridge-export[dir=rtl]{font-family:"IBM Plex Sans Arabic",Arial,sans-serif;text-align:right}.brand{color:#164b7a;font-size:15px;font-weight:800;letter-spacing:.04em}h1{margin:10px 0 6px;font-size:24px}header p{margin:3px 0;color:#5c7083;font-size:11px}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:10px}th{background:#eaf3f9;color:#102a43;text-align:start}th,td{border:1px solid #dce7ef;padding:8px;vertical-align:top}tbody tr:nth-child(even){background:#f8fafc}footer{margin-top:18px;border-top:1px solid #dce7ef;padding-top:8px;color:#708496;font-size:9px}@page{size:A4 landscape;margin:10mm}@media print{.carebridge-export{padding:0}thead{display:table-header-group}tr{break-inside:avoid}}</style>`;
  return { body, direction, styles };
}

export async function createReportWorkbook({
  columns,
  locale,
  reportName,
  rows,
}: {
  columns: ReportColumn[];
  locale: Locale;
  reportName: string;
  rows: ReportRow[];
}) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CareBridge";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(reportName.slice(0, 31), {
    views: [{ rightToLeft: locale === "ar", state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.min(42, Math.max(14, column.label.length + 4)),
  }));
  rows.forEach((row) => sheet.addRow(row));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF164B7A" },
  };
  header.alignment = { horizontal: locale === "ar" ? "right" : "left" };
  sheet.autoFilter = {
    from: "A1",
    to: `${sheet.getColumn(columns.length).letter}${rows.length + 1}`,
  };
  sheet.eachRow((row, index) => {
    row.alignment = {
      vertical: "middle",
      horizontal: locale === "ar" ? "right" : "left",
    };
    if (index > 1 && index % 2 === 1)
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F8FB" },
      };
  });
  return workbook;
}
