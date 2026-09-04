import { describe, expect, it } from "vitest";
import {
  buildReportHtml,
  createReportWorkbook,
} from "../src/features/reports/report-export";

const columns = [
  { key: "reference", label: "المرجع" },
  { key: "amount", label: "المبلغ" },
];
const rows = [{ reference: "CBI-DEMO2026INTL", amount: "12,500 USD" }];

describe("report exports", () => {
  it("creates a real RTL Excel workbook with business headers and data", async () => {
    const workbook = await createReportWorkbook({
      columns,
      locale: "ar",
      reportName: "الفواتير",
      rows,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const ExcelJS = await import("exceljs");
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);
    const sheet = reopened.worksheets[0];
    expect(sheet.views[0]?.rightToLeft).toBe(true);
    expect(sheet.getCell("A1").value).toBe("المرجع");
    expect(sheet.getCell("A2").value).toBe("CBI-DEMO2026INTL");
  }, 15000);

  it("builds branded Arabic RTL source shared by PDF and Print", () => {
    const report = buildReportHtml({
      columns,
      filters: ["الحالة: مدفوعة"],
      generated: "28 أغسطس 2026",
      generatedLabel: "تاريخ الإنشاء",
      filtersLabel: "عوامل التصفية",
      locale: "ar",
      reportName: "تقرير الفواتير",
      rows,
    });
    expect(report.direction).toBe("rtl");
    expect(report.body).toContain('dir="rtl"');
    expect(report.body).toContain("CareBridge");
    expect(report.body).toContain("CBI-DEMO2026INTL");
    expect(report.styles).toContain("@media print");
    expect(report.styles).toContain("@page");
  });
});
