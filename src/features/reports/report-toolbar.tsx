"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import type { Locale } from "@/src/i18n/config";
import {
  buildReportHtml,
  createReportWorkbook,
  escapeReportHtml,
} from "./report-export";

export interface ReportColumn {
  key: string;
  label: string;
}

export type ReportRow = Record<string, string | number | null | undefined>;

const copy = {
  en: {
    excel: "Export Excel",
    pdf: "Export PDF",
    print: "Print",
    empty: "There is no data to export.",
    failed: "The report could not be prepared.",
    limit: "Exports are limited to 1,000 authorized rows.",
    generated: "Generated",
    filters: "Active filters",
  },
  fr: {
    excel: "Exporter Excel",
    pdf: "Exporter PDF",
    print: "Imprimer",
    empty: "Aucune donnée à exporter.",
    failed: "Impossible de préparer le rapport.",
    limit: "Les exports sont limités à 1 000 lignes autorisées.",
    generated: "Généré le",
    filters: "Filtres actifs",
  },
  ar: {
    excel: "تصدير إلى Excel",
    pdf: "تصدير إلى PDF",
    print: "طباعة",
    empty: "لا توجد بيانات متاحة للتصدير.",
    failed: "تعذر إعداد التقرير.",
    limit: "يقتصر التصدير على 1,000 سجل مصرح بعرضه.",
    generated: "تاريخ الإنشاء",
    filters: "عوامل التصفية",
  },
} as const;

function safeName(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "report"
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ReportToolbar({
  columns,
  filters = [],
  locale,
  reportName,
  rows,
}: {
  columns: ReportColumn[];
  filters?: string[];
  locale: Locale;
  reportName: string;
  rows: ReportRow[];
}) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<"excel" | "pdf" | undefined>();
  const labels = copy[locale];
  const limitedRows = useMemo(() => rows.slice(0, 1000), [rows]);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `carebridge-${safeName(reportName)}-${date}`;
  const generated = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const {
    body: tableHtml,
    direction,
    styles,
  } = buildReportHtml({
    columns,
    filters,
    generated,
    generatedLabel: labels.generated,
    filtersLabel: labels.filters,
    locale,
    reportName,
    rows: limitedRows,
  });

  async function exportExcel() {
    if (!limitedRows.length) return setError(labels.empty);
    setError(undefined);
    setBusy("excel");
    try {
      const workbook = await createReportWorkbook({
        columns,
        locale,
        reportName,
        rows: limitedRows,
      });
      const buffer = await workbook.xlsx.writeBuffer();
      download(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${filename}.xlsx`,
      );
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(undefined);
    }
  }

  async function exportPdf() {
    if (!limitedRows.length) return setError(labels.empty);
    setError(undefined);
    setBusy("pdf");
    try {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `${styles}${tableHtml}`;
      document.body.appendChild(wrapper);
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          filename: `${filename}.pdf`,
          margin: 8,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
        })
        .from(wrapper.querySelector(".carebridge-export")!)
        .save();
      wrapper.remove();
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(undefined);
    }
  }

  function printReport() {
    if (!limitedRows.length) return setError(labels.empty);
    const popup = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1100,height=800",
    );
    if (!popup) return setError(labels.failed);
    popup.document.write(
      `<!doctype html><html lang="${locale}" dir="${direction}"><head><meta charset="utf-8"><title>${escapeReportHtml(reportName)}</title>${styles}</head><body>${tableHtml}</body></html>`,
    );
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
  }

  return (
    <div className="print:hidden">
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label={reportName}
      >
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={Boolean(busy)}
          onClick={exportExcel}
          type="button"
        >
          <Download className="size-4" />
          {busy === "excel" ? "…" : labels.excel}
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={Boolean(busy)}
          onClick={exportPdf}
          type="button"
        >
          <FileText className="size-4" />
          {busy === "pdf" ? "…" : labels.pdf}
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={printReport}
          type="button"
        >
          <Printer className="size-4" />
          {labels.print}
        </button>
      </div>
      {rows.length > 1000 ? (
        <p className="mt-2 text-xs text-amber-700">{labels.limit}</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
