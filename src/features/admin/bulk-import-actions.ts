import { revalidatePath } from "@/src/react-app/compat/cache";
import { z } from "zod";
import {
  bulkImportColumns,
  bulkImportEntities,
  type BulkImportEntity,
  slugifyImport,
} from "./bulk-import";
import { isLocale } from "@/src/i18n/config";
import { requireRoles } from "@/src/lib/auth/context";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export interface BulkImportState {
  status: "idle" | "success" | "error";
  inserted?: number;
  errors?: Array<{ row: number; message: string }>;
  message?: string;
}
const request = z.object({
  locale: z.string(),
  entity: z.enum(bulkImportEntities),
  rows: z.string().max(750000),
});
const text = (value: unknown) => String(value ?? "").trim();
const email = z.string().email();
const url = z.string().url();

export async function confirmBulkImport(
  _previous: BulkImportState,
  formData: FormData,
): Promise<BulkImportState> {
  const parsed = request.safeParse({
    locale: formData.get("locale"),
    entity: formData.get("entity"),
    rows: formData.get("rows"),
  });
  if (!parsed.success || !isLocale(parsed.data.locale))
    return { status: "error", message: "invalid" };
  const locale = parsed.data.locale,
    entity = parsed.data.entity as BulkImportEntity;
  const context = await requireRoles(locale, ["ADMIN", "SUPER_ADMIN"]);
  const s = await getSupabaseBrowserClient();
  if (!s) return { status: "error", message: "unavailable" };
  let rows: Record<string, unknown>[];
  try {
    rows = JSON.parse(parsed.data.rows) as Record<string, unknown>[];
  } catch {
    return { status: "error", message: "invalid" };
  }
  if (!Array.isArray(rows) || !rows.length || rows.length > 500)
    return { status: "error", message: "limit" };
  const [
    { data: countries },
    { data: cities },
    { data: specialties },
    { data: hospitals },
  ] = await Promise.all([
    s.from("countries").select("id,iso2,iso3"),
    s.from("cities").select("id,country_id,name_i18n"),
    s.from("specialties").select("id,code,name_i18n"),
    s.from("hospitals").select("id,legal_name,slug,display_name_i18n"),
  ]);
  const existing =
    entity === "doctors"
      ? []
      : ((await s.from(entity).select("slug")).data ?? []);
  const existingDoctors =
    entity === "doctors"
      ? ((await s.from("doctors").select("first_name,last_name,license_number"))
          .data ?? [])
      : [];
  const used = new Set(existing.map((record) => String(record.slug)));
  const usedDoctors = new Set(
    existingDoctors.map((record) =>
      text(record.license_number)
        ? `license:${text(record.license_number).toLowerCase()}`
        : `name:${text(record.first_name).toLowerCase()}|${text(record.last_name).toLowerCase()}`,
    ),
  );
  const errors: Array<{ row: number; message: string }> = [];
  const valid: Array<{
    index: number;
    payload: Record<string, unknown>;
    specialtyId?: string;
    hospitalId?: string;
  }> = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index],
      required = bulkImportColumns[entity].filter((c) => c.required);
    const missing = required.find((c) => !text(row[c.key]));
    if (missing) {
      errors.push({ row: index + 2, message: `required:${missing.key}` });
      continue;
    }
    const mail = text(row.email),
      site = text(row.website);
    if (mail && !email.safeParse(mail).success) {
      errors.push({ row: index + 2, message: "invalid:email" });
      continue;
    }
    if (site && !url.safeParse(site).success) {
      errors.push({ row: index + 2, message: "invalid:website" });
      continue;
    }
    const countryCode = text(row.country_code).toUpperCase();
    const country = countries?.find(
      (c) => c.iso2 === countryCode || c.iso3 === countryCode,
    );
    if (countryCode && !country) {
      errors.push({ row: index + 2, message: "reference:country" });
      continue;
    }
    if (entity === "doctors") {
      const doctorKey = text(row.license_number)
        ? `license:${text(row.license_number).toLowerCase()}`
        : `name:${text(row.first_name).toLowerCase()}|${text(row.last_name).toLowerCase()}`;
      if (usedDoctors.has(doctorKey)) {
        errors.push({ row: index + 2, message: "duplicate:doctor" });
        continue;
      }
      usedDoctors.add(doctorKey);
      const specialtyValue = text(row.specialty).toLowerCase();
      const specialty = specialtyValue
        ? specialties?.find(
            (item) =>
              item.code.toLowerCase() === specialtyValue ||
              Object.values(item.name_i18n as Record<string, string>).some(
                (v) => v.toLowerCase() === specialtyValue,
              ),
          )
        : undefined;
      const hospitalValue = text(row.hospital).toLowerCase();
      const hospital = hospitalValue
        ? hospitals?.find(
            (item) =>
              item.legal_name.toLowerCase() === hospitalValue ||
              Object.values(
                item.display_name_i18n as Record<string, string>,
              ).some((v) => v.toLowerCase() === hospitalValue),
          )
        : undefined;
      if (specialtyValue && !specialty) {
        errors.push({ row: index + 2, message: "reference:specialty" });
        continue;
      }
      if (hospitalValue && !hospital) {
        errors.push({ row: index + 2, message: "reference:hospital" });
        continue;
      }
      valid.push({
        index,
        payload: {
          first_name: text(row.first_name),
          last_name: text(row.last_name),
          display_name: `${text(row.first_name)} ${text(row.last_name)}`.trim(),
          professional_title: text(row.professional_title) || null,
          license_number: text(row.license_number) || null,
          license_country_id: country?.id ?? null,
          status: "DRAFT",
          verification_state: "DRAFT",
        },
        specialtyId: specialty?.id,
        hospitalId: hospital?.id,
      });
      continue;
    }
    const name = text(row.name),
      slug = slugifyImport(name);
    if (!slug || used.has(slug)) {
      errors.push({ row: index + 2, message: "duplicate:name" });
      continue;
    }
    used.add(slug);
    const cityValue = text(row.city).toLowerCase();
    const city = cityValue
      ? cities?.find(
          (item) =>
            item.country_id === country?.id &&
            Object.values(item.name_i18n as Record<string, string>).some(
              (v) => v.toLowerCase() === cityValue,
            ),
        )
      : undefined;
    if (cityValue && !city) {
      errors.push({ row: index + 2, message: "reference:city" });
      continue;
    }
    const names = {
      en: name,
      ...(text(row.name_fr) ? { fr: text(row.name_fr) } : {}),
      ...(text(row.name_ar) ? { ar: text(row.name_ar) } : {}),
    };
    const address = text(row.address);
    valid.push({
      index,
      payload: {
        legal_name: name,
        display_name_i18n: names,
        slug,
        country_id: country?.id,
        city_id: city?.id ?? null,
        address_i18n: address ? { [locale]: address } : {},
        public_phone: text(row.phone) || null,
        public_email: mail || null,
        website_url: site || null,
        status: "DRAFT",
        verification_state: "DRAFT",
        ...(entity === "hospitals" ? { created_by: context.userId } : {}),
      },
    });
  }
  let inserted = 0;
  for (const item of valid) {
    const result = await s
      .from(entity)
      .insert(item.payload)
      .select("id")
      .single();
    if (result.error) {
      errors.push({
        row: item.index + 2,
        message: result.error.code === "23505" ? "duplicate:record" : "save",
      });
      continue;
    }
    if (entity === "doctors") {
      const links = [];
      if (item.specialtyId)
        links.push(
          s
            .from("doctor_specialties")
            .insert({
              doctor_id: result.data.id,
              specialty_id: item.specialtyId,
              is_primary: true,
            }),
        );
      if (item.hospitalId)
        links.push(
          s
            .from("doctor_hospitals")
            .insert({
              doctor_id: result.data.id,
              hospital_id: item.hospitalId,
              is_primary: true,
              consultation_available: true,
              status: "ACTIVE",
            }),
        );
      const linkResults = await Promise.all(links);
      if (linkResults.some((link) => link.error)) {
        await s.from("doctors").delete().eq("id", result.data.id);
        errors.push({ row: item.index + 2, message: "save:relationships" });
        continue;
      }
    }
    inserted++;
  }
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/${entity}`);
  return {
    status: inserted ? "success" : "error",
    inserted,
    errors,
    message: errors.length ? "partial" : "complete",
  };
}
