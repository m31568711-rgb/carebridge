"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Select } from "@/src/components/ui/select";
import type { Locale } from "@/src/i18n/config";
import {
  bulkImportColumns,
  bulkImportEntities,
  importHeader,
  type BulkImportEntity,
} from "./bulk-import";
import { confirmBulkImport, type BulkImportState } from "./bulk-import-actions";

const initial: BulkImportState = { status: "idle" };
const labels = {
  en: {
    title: "Bulk import",
    description:
      "Add provider and clinician records from a business-friendly spreadsheet. Files are validated before anything is saved.",
    entity: "Entity type",
    file: "CSV or Excel file",
    template: "Download CSV template",
    preview: "Validation preview",
    confirm: "Import valid rows",
    valid: "Valid rows",
    invalid: "Rows requiring attention",
    empty: "Choose a file to preview its contents.",
    limit:
      "Up to 500 rows per import. New records begin as drafts and follow the normal verification process.",
    success: "records imported successfully.",
    entities: {
      hospitals: "Hospitals",
      doctors: "Doctors",
      pharmacies: "Pharmacies",
      medical_laboratories: "Medical laboratories",
      radiology_centers: "Radiology centers",
    },
  },
  fr: {
    title: "Import en masse",
    description:
      "Ajoutez des prestataires et médecins depuis un fichier métier. Chaque ligne est validée avant enregistrement.",
    entity: "Type de données",
    file: "Fichier CSV ou Excel",
    template: "Télécharger le modèle CSV",
    preview: "Aperçu de validation",
    confirm: "Importer les lignes valides",
    valid: "Lignes valides",
    invalid: "Lignes à corriger",
    empty: "Choisissez un fichier pour afficher son contenu.",
    limit:
      "500 lignes maximum par import. Les nouveaux enregistrements restent en brouillon avant vérification.",
    success: "enregistrements importés.",
    entities: {
      hospitals: "Hôpitaux",
      doctors: "Médecins",
      pharmacies: "Pharmacies",
      medical_laboratories: "Laboratoires médicaux",
      radiology_centers: "Centres de radiologie",
    },
  },
  ar: {
    title: "الاستيراد الجماعي",
    description:
      "أضف بيانات المنشآت الطبية والأطباء من ملف واضح مخصص لفريق العمل. تُراجع جميع الصفوف قبل حفظ أي بيانات.",
    entity: "نوع البيانات",
    file: "ملف CSV أو Excel",
    template: "تنزيل نموذج CSV",
    preview: "معاينة نتائج التحقق",
    confirm: "استيراد الصفوف السليمة",
    valid: "صفوف سليمة",
    invalid: "صفوف تحتاج إلى تصحيح",
    empty: "اختر ملفًا لمعاينة محتواه والتحقق منه.",
    limit:
      "الحد الأقصى 500 صف في كل عملية. تُحفظ السجلات الجديدة كمسودات وتخضع لإجراءات الاعتماد المعتادة.",
    success: "سجل تم استيراده بنجاح.",
    entities: {
      hospitals: "المستشفيات",
      doctors: "الأطباء",
      pharmacies: "الصيدليات",
      medical_laboratories: "المختبرات الطبية",
      radiology_centers: "مراكز الأشعة",
    },
  },
} as const;

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkImportPage({ locale }: { locale: Locale }) {
  const copy = labels[locale];
  const [entity, setEntity] = useState<BulkImportEntity>("hospitals");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileError, setFileError] = useState("");
  const [state, action, pending] = useActionState(confirmBulkImport, initial);
  const columns = bulkImportColumns[entity];
  const issues = useMemo(() => {
    const seen = new Set<string>();
    return rows.map((row, index) => {
      const errors: string[] = [];
      for (const column of columns)
        if (column.required && !row[column.key]?.trim())
          errors.push(
            `${importHeader(column, locale)}: ${locale === "ar" ? "مطلوب" : locale === "fr" ? "obligatoire" : "required"}`,
          );
      if (row.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email))
        errors.push(
          importHeader(columns.find((c) => c.key === "email")!, locale),
        );
      const duplicateKey =
        entity === "doctors"
          ? row.license_number?.trim()
            ? `license:${row.license_number.trim().toLowerCase()}`
            : `name:${row.first_name?.trim().toLowerCase()}|${row.last_name?.trim().toLowerCase()}`
          : `name:${row.name?.trim().toLowerCase()}`;
      if (duplicateKey && !duplicateKey.endsWith(":") && seen.has(duplicateKey))
        errors.push(
          locale === "ar"
            ? "سجل مكرر في الملف"
            : locale === "fr"
              ? "Doublon dans le fichier"
              : "Duplicate row in file",
        );
      else seen.add(duplicateKey);
      return { index, errors };
    });
  }, [columns, entity, locale, rows]);
  const validRows = rows.filter((_, index) => !issues[index].errors.length);
  async function loadFile(file?: File) {
    setRows([]);
    setFileError("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return setFileError(
        locale === "ar" ? "حجم الملف يتجاوز 5 ميجابايت." : "File exceeds 5 MB.",
      );
    try {
      let values: string[][];
      if (file.name.toLowerCase().endsWith(".csv"))
        values = parseCsv(await file.text());
      else if (file.name.toLowerCase().endsWith(".xlsx")) {
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load((await file.arrayBuffer()) as never);
        const sheet = workbook.worksheets[0];
        values = [];
        sheet.eachRow((row) =>
          values.push(
            (row.values as unknown[])
              .slice(1)
              .map((value) => String(value ?? "")),
          ),
        );
      } else throw new Error("format");
      if (values.length < 2) throw new Error("empty");
      const headers = values[0].map((v) => v.trim().toLowerCase());
      const aliases = new Map<string, string>();
      for (const column of columns) {
        aliases.set(column.key.toLowerCase(), column.key);
        aliases.set(column.en.toLowerCase(), column.key);
        aliases.set(column.fr.toLowerCase(), column.key);
        aliases.set(column.ar.toLowerCase(), column.key);
      }
      const keys = headers.map((header) => aliases.get(header) ?? "");
      if (!columns.filter((c) => c.required).every((c) => keys.includes(c.key)))
        throw new Error("headers");
      const parsed = values
        .slice(1, 501)
        .filter((row) => row.some(Boolean))
        .map((row) =>
          Object.fromEntries(
            keys
              .map((key, index) => [key, String(row[index] ?? "").trim()])
              .filter(([key]) => key),
          ),
        );
      setRows(parsed);
    } catch {
      setFileError(
        locale === "ar"
          ? "تعذر قراءة الملف. استخدم النموذج المعتمد وتأكد من أسماء الأعمدة."
          : locale === "fr"
            ? "Impossible de lire le fichier. Utilisez le modèle et vérifiez les colonnes."
            : "The file could not be read. Use the template and check the column names.",
      );
    }
  }
  function template() {
    const header = columns.map((column) => importHeader(column, locale));
    const example =
      entity === "doctors"
        ? [
            "Amira",
            "Solis",
            "Consultant",
            "LIC-100",
            "US",
            "cardiology",
            "CareBridge Demonstration Hospital",
          ]
        : [
            "Example Care Center",
            "",
            "",
            "US",
            "Boston",
            "1 Care Avenue",
            "+1 555 0100",
            "contact@example.test",
            "https://example.test",
          ];
    downloadText(
      [header, example.slice(0, columns.length)]
        .map((row) =>
          row
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\r\n"),
      `carebridge-${entity}-template.csv`,
    );
  }
  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          CareBridge
        </p>
        <h1 className="mt-2 text-3xl font-bold">{copy.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{copy.description}</p>
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
        <Card variant="form">
          <CardContent>
            <label className="grid gap-2 text-sm font-semibold">
              {copy.entity}
              <Select
                value={entity}
                onChange={(event) => {
                  setEntity(event.target.value as BulkImportEntity);
                  setRows([]);
                  setFileError("");
                }}
              >
                {bulkImportEntities.map((item) => (
                  <option key={item} value={item}>
                    {copy.entities[item]}
                  </option>
                ))}
              </Select>
            </label>
            <button
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
              onClick={template}
              type="button"
            >
              <Download className="size-4" />
              {copy.template}
            </button>
            <label className="mt-6 grid cursor-pointer place-items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center hover:border-blue-300">
              <Upload className="size-7 text-blue-700" />
              <span className="text-sm font-semibold">{copy.file}</span>
              <span className="text-xs text-slate-500">
                .csv · .xlsx · 5 MB
              </span>
              <input
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => void loadFile(event.target.files?.[0])}
                type="file"
              />
            </label>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              {copy.limit}
            </p>
            {fileError ? (
              <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                {fileError}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{copy.preview}</h2>
              <FileSpreadsheet className="size-5 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            {rows.length ? (
              <>
                <div className="mb-4 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    {validRows.length} {copy.valid}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="size-4" />
                    {rows.length - validRows.length} {copy.invalid}
                  </span>
                </div>
                <div className="max-h-[30rem] overflow-auto rounded-xl border">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="p-3 text-start">#</th>
                        {columns.slice(0, 5).map((column) => (
                          <th className="p-3 text-start" key={column.key}>
                            {importHeader(column, locale)}
                          </th>
                        ))}
                        <th className="p-3 text-start">{copy.invalid}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((row, index) => (
                        <tr
                          className={
                            issues[index].errors.length ? "bg-rose-50/60" : ""
                          }
                          key={index}
                        >
                          <td className="p-3">{index + 2}</td>
                          {columns.slice(0, 5).map((column) => (
                            <td
                              className="max-w-48 truncate p-3"
                              key={column.key}
                            >
                              {row[column.key] || "—"}
                            </td>
                          ))}
                          <td className="p-3 text-xs text-rose-700">
                            {issues[index].errors.join(" · ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form action={action} className="mt-5">
                  <input name="locale" type="hidden" value={locale} />
                  <input name="entity" type="hidden" value={entity} />
                  <input
                    name="rows"
                    type="hidden"
                    value={JSON.stringify(validRows)}
                  />
                  <Button disabled={!validRows.length} loading={pending}>
                    {copy.confirm}
                  </Button>
                </form>
                {state.status === "success" ? (
                  <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                    {state.inserted} {copy.success}
                    {state.errors?.length
                      ? ` ${state.errors.length} ${copy.invalid}.`
                      : ""}
                  </p>
                ) : state.status === "error" ? (
                  <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                    {state.message}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">
                {copy.empty}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
