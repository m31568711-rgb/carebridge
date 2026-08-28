import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]])
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
}
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_ACCESS_TOKEN",
  "CAREBRIDGE_DEMO_PATIENT_PASSWORD",
  "CAREBRIDGE_DEMO_DOCTOR_PASSWORD",
  "CAREBRIDGE_DEMO_PROVIDER_PASSWORD",
])
  if (!process.env[key]) throw new Error(`Missing ${key}`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ref = process.env.SUPABASE_PROJECT_REF,
  token = process.env.SUPABASE_ACCESS_TOKEN;
const client = () =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
const assert = (value, message) => {
  if (!value) throw new Error(`Demo polish validation failed: ${message}`);
};
const sql = async (query) => {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!response.ok)
    throw new Error(`SQL ${response.status}: ${await response.text()}`);
  return response.json();
};
async function login(email, password) {
  const api = client();
  const { data, error } = await api.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user)
    throw error ?? new Error(`Could not sign in ${email}`);
  return { api, id: data.user.id };
}
const [patient, doctor, provider] = await Promise.all([
  login(
    "demo.patient@carebridge.test",
    process.env.CAREBRIDGE_DEMO_PATIENT_PASSWORD,
  ),
  login(
    "demo.doctor@carebridge.test",
    process.env.CAREBRIDGE_DEMO_DOCTOR_PASSWORD,
  ),
  login(
    "demo.provider@carebridge.test",
    process.env.CAREBRIDGE_DEMO_PROVIDER_PASSWORD,
  ),
]);
const baseline = (
  await sql(
    "select (select count(*) from auth.users where email in ('demo.patient@carebridge.test','demo.doctor@carebridge.test','demo.provider@carebridge.test','demo.lab@carebridge.test','demo.radiology@carebridge.test')) demo_accounts,(select count(*) from public.invoices where invoice_number='CBI-DEMO2026INTL' and currency='USD' and total_amount=12500 and amount_paid=12500 and status='PAID') invoice_ready,(select count(*) from public.payment_records p join public.invoices i on i.id=p.invoice_id where i.invoice_number='CBI-DEMO2026INTL') payments,(select count(*) from public.notifications n join auth.users u on u.id=n.recipient_id where u.email like 'demo.%@carebridge.test') notifications",
  )
)[0];
assert(
  Number(baseline.demo_accounts) === 5,
  "all five persistent role demo accounts remain available",
);
assert(
  Number(baseline.invoice_ready) === 1 && Number(baseline.payments) >= 1,
  "persistent USD paid invoice scenario remains coherent",
);
let path, attachmentId;
try {
  const { data: booking, error: bookingError } = await doctor.api
    .from("bookings")
    .select("id,case_id,patient_id,doctor_id")
    .eq("booking_reference", "CB-DEMO2026INTL")
    .single();
  if (bookingError) throw bookingError;
  assert(
    booking.patient_id === patient.id,
    "persistent demo booking remains linked to demo patient",
  );
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );
  path = `${booking.patient_id}/${booking.id}/${crypto.randomUUID()}-demo-polish-validation.pdf`;
  let result = await doctor.api.storage
    .from("clinical-attachments")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (result.error) throw result.error;
  result = await doctor.api
    .from("clinical_attachments")
    .insert({
      booking_id: booking.id,
      case_id: booking.case_id,
      patient_id: booking.patient_id,
      doctor_id: booking.doctor_id,
      title: "Temporary demo polish validation",
      patient_visible: true,
      object_path: path,
      original_filename: "demo-polish-validation.pdf",
      mime_type: "application/pdf",
      file_size_bytes: pdf.length,
      uploaded_by: doctor.id,
    })
    .select("id")
    .single();
  if (result.error) throw result.error;
  attachmentId = result.data.id;
  assert(
    (
      await patient.api
        .from("clinical_attachments")
        .select("id")
        .eq("id", attachmentId)
    ).data?.length === 1,
    "patient sees explicitly shared consultation attachment",
  );
  assert(
    (
      await provider.api
        .from("clinical_attachments")
        .select("id")
        .eq("id", attachmentId)
    ).data?.length === 0,
    "provider coordinator has no unrestricted clinical attachment access",
  );
  assert(
    !(await patient.api.storage.from("clinical-attachments").download(path))
      .error,
    "patient downloads shared private consultation attachment",
  );
  const anon = client();
  assert(
    Boolean(
      (
        await anon
          .from("clinical_attachments")
          .select("id")
          .eq("id", attachmentId)
      ).error,
    ),
    "anonymous attachment access denied",
  );
  const checks = (
    await sql(
      "select (select count(*) from storage.buckets where id='clinical-attachments' and not public) bucket,(select count(*) from pg_policies where schemaname='public' and tablename='clinical_attachments') policies,(select count(*) from pg_trigger where not tgisinternal and tgrelid='public.clinical_attachments'::regclass) triggers",
    )
  )[0];
  assert(
    Number(checks.bucket) === 1 &&
      Number(checks.policies) >= 3 &&
      Number(checks.triggers) >= 2,
    "private bucket, RLS policies, and triggers are active",
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        booking: "CB-DEMO2026INTL",
        checks: {
          persistentDemoAccounts: Number(baseline.demo_accounts),
          paidDemoInvoice: true,
          paymentRecords: Number(baseline.payments),
          demoNotifications: Number(baseline.notifications),
          patientSharedRead: true,
          patientPrivateDownload: true,
          providerCoordinatorDenied: true,
          anonymousDenied: true,
          policies: Number(checks.policies),
          triggers: Number(checks.triggers),
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (attachmentId)
    await doctor.api
      .from("clinical_attachments")
      .delete()
      .eq("id", attachmentId);
  if (path)
    await doctor.api.storage.from("clinical-attachments").remove([path]);
  if (attachmentId)
    await sql(
      `delete from public.audit_logs where entity_type='clinical_attachments' and entity_id='${attachmentId}'`,
    );
}
