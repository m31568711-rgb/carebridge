"use client";
import { AdminFormDialog } from "@/src/features/admin/form-dialog";
import { useActionState } from "react";
import Link from "@/src/react-app/compat/link";
import {
  CalendarDays,
  Clock3,
  CreditCard,
  MapPin,
  Plane,
  Route,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import type { Locale } from "@/src/i18n/config";
import { providerName, type BookingRecord } from "@/src/features/journey/data";
import {
  createInvoiceAction,
  createTransportAction,
  issueInvoiceAction,
  recordPaymentAction,
  saveAppointmentAction,
  saveJourneyTypeAction,
  saveTravelAction,
  setAppointmentStatusAction,
  uploadPaymentProofAction,
  type OperationsActionState,
} from "./actions";
import type { AppointmentRecord, BookingOperations } from "./data";
import type { OperationsDictionary } from "./messages";
const initial: OperationsActionState = {};
const types = [
  "CONSULTATION",
  "PRE_TREATMENT_ASSESSMENT",
  "TREATMENT_PROCEDURE",
  "FOLLOW_UP",
  "LAB_RADIOLOGY",
  "DISCHARGE_FINAL_REVIEW",
];
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}
function Feedback({
  s,
  c,
}: {
  s: OperationsActionState;
  c: OperationsDictionary;
}) {
  return s.error ? (
    <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
      {s.error === "invalid" ? c.invalid : c.failed}
    </p>
  ) : s.success ? (
    <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
      {c.saved}
    </p>
  ) : null;
}
const dt = (v: string | null | undefined) => (v ? v.slice(0, 16) : "");
export function AppointmentList({
  records,
  locale,
  copy,
  portal,
}: {
  records: AppointmentRecord[];
  locale: Locale;
  copy: OperationsDictionary;
  portal: "patient" | "provider" | "doctor";
}) {
  return (
    <div className="grid gap-4">
      {records.length ? (
        records.map((a) => (
          <Link href={`/${locale}/${portal}/appointments/${a.id}`} key={a.id}>
            <Card variant="interactive">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {a.appointment_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <CalendarDays className="size-4" />
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: a.timezone,
                      }).format(new Date(a.scheduled_at))}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="size-4" />
                      {a.location_name}
                    </p>
                  </div>
                  <Badge variant="blue">{a.status.replaceAll("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          {copy.empty}
        </p>
      )}
    </div>
  );
}
export function AppointmentDetail({
  record,
  locale,
  copy,
  portal,
}: {
  record: AppointmentRecord;
  locale: Locale;
  copy: OperationsDictionary;
  portal: "patient" | "provider" | "doctor";
}) {
  const allowed =
    portal === "patient"
      ? ["CANCELLED"]
      : ["CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="text-sm font-semibold text-blue-700"
        href={`/${locale}/${portal}/appointments`}
      >
        ← {copy.appointments}
      </Link>
      <Card className="mt-5">
        <CardHeader>
          <div className="flex justify-between gap-3">
            <h1 className="text-2xl font-bold">
              {record.appointment_type.replaceAll("_", " ")}
            </h1>
            <Badge variant="blue">{record.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Info l={copy.dateTime}>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: record.timezone,
              }).format(new Date(record.scheduled_at))}
            </Info>
            <Info l={copy.timezone}>{record.timezone}</Info>
            <Info l={copy.duration}>{record.duration_minutes}</Info>
            <Info l={copy.location}>{record.location_name}</Info>
            <Info l={copy.instructions}>{record.instructions}</Info>
            <Info l={copy.providerNotes}>{record.provider_notes}</Info>
          </dl>
          {allowed.length &&
          !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(record.status) ? (
            <form
              action={setAppointmentStatusAction}
              className="mt-6 flex flex-wrap gap-2"
            >
              <input name="locale" type="hidden" value={locale} />
              <input
                name="booking_id"
                type="hidden"
                value={record.booking_id}
              />
              <input name="appointment_id" type="hidden" value={record.id} />
              {allowed.map((x) => (
                <Button
                  key={x}
                  name="status"
                  type="submit"
                  value={x}
                  variant={x === "CANCELLED" ? "danger" : "outline"}
                >
                  {x.replaceAll("_", " ")}
                </Button>
              ))}
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
function Info({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {l}
      </dt>
      <dd className="mt-1 text-sm">{children || "—"}</dd>
    </div>
  );
}
export function OperationsPanel({
  booking,
  data,
  locale,
  copy,
  mode,
}: {
  booking: BookingRecord;
  data: BookingOperations;
  locale: Locale;
  copy: OperationsDictionary;
  mode: "patient" | "manager" | "doctor" | "provider";
}) {
  const manager = mode === "manager";
  const [journeyState, journeyAction, jp] = useActionState(
    saveJourneyTypeAction,
    initial,
  );
  const [appointmentState, appointmentAction, ap] = useActionState(
    saveAppointmentAction,
    initial,
  );
  const [invoiceState, invoiceAction, ip] = useActionState(
    createInvoiceAction,
    initial,
  );
  const [paymentState, paymentAction, pp] = useActionState(
    recordPaymentAction,
    initial,
  );
  const [travelState, travelAction, tp] = useActionState(
    saveTravelAction,
    initial,
  );
  const [transportState, transportAction, trp] = useActionState(
    createTransportAction,
    initial,
  );
  const [proofState, proofAction, pfp] = useActionState(
    uploadPaymentProofAction,
    initial,
  );
  const international = booking.journey_type === "INTERNATIONAL_MEDICAL_TRAVEL";
  return (
    <section className="mt-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            {copy.mode}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {international ? copy.international : copy.local}
          </h2>
        </div>
        <Badge variant="blue">{booking.journey_type}</Badge>
      </div>
      {manager ? (
        <Card variant="form">
          <CardContent>
            <AdminFormDialog enabled={manager} title={copy.mode} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"}><form
              action={journeyAction}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input name="locale" type="hidden" value={locale} />
              <input name="booking_id" type="hidden" value={booking.id} />
              <Field label={copy.mode}>
                <Select defaultValue={booking.journey_type} name="journey_type">
                  <option value="LOCAL_CARE">{copy.local}</option>
                  <option value="INTERNATIONAL_MEDICAL_TRAVEL">
                    {copy.international}
                  </option>
                </Select>
              </Field>
              <Field label={copy.timezone}>
                <Input
                  defaultValue={booking.journey_timezone}
                  name="journey_timezone"
                  required
                />
              </Field>
              <Button className="self-end" loading={jp}>
                {copy.save}
              </Button>
              <Feedback c={copy} s={journeyState} />
            </form></AdminFormDialog>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5 text-blue-700" />
            {copy.appointments}
          </h3>
        </CardHeader>
        <CardContent>
          <AppointmentList
            copy={copy}
            locale={locale}
            portal={
              mode === "doctor"
                ? "doctor"
                : mode === "patient"
                  ? "patient"
                  : "provider"
            }
            records={data.appointments}
          />
          {mode !== "patient" ? (
            <AdminFormDialog enabled={manager} title={copy.appointments} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"}><form
              action={appointmentAction}
              className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4"
            >
              <input name="locale" type="hidden" value={locale} />
              <input name="booking_id" type="hidden" value={booking.id} />
              <h4 className="font-semibold">{copy.newAppointment}</h4>
              <Feedback c={copy} s={appointmentState} />
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={copy.type}>
                  <Select name="appointment_type">
                    {types.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={copy.dateTime}>
                  <Input name="scheduled_at" required type="datetime-local" />
                </Field>
                <Field label={copy.timezone}>
                  <Input
                    defaultValue={booking.journey_timezone}
                    name="timezone"
                    required
                  />
                </Field>
                <Field label={copy.duration}>
                  <Input
                    defaultValue="45"
                    min="5"
                    name="duration_minutes"
                    type="number"
                  />
                </Field>
                <Field label={copy.location}>
                  <Input name="location_name" required />
                </Field>
              </div>
              <Field label={copy.instructions}>
                <Textarea name="instructions" />
              </Field>
              <Field label={copy.providerNotes}>
                <Textarea name="provider_notes" />
              </Field>
              <Button loading={ap}>{copy.save}</Button>
            </form></AdminFormDialog>
          ) : null}
        </CardContent>
      </Card>
      {mode === "patient" || mode === "manager" ? (
        <Finance
          booking={booking}
          copy={copy}
          data={data}
          invoiceAction={invoiceAction}
          invoiceState={invoiceState}
          ip={ip}
          locale={locale}
          manager={manager}
          paymentAction={paymentAction}
          paymentState={paymentState}
          pp={pp}
          proofAction={proofAction}
          proofState={proofState}
          pfp={pfp}
        />
      ) : null}
      {international && (mode === "patient" || mode === "manager") ? (
        <Travel
          booking={booking}
          copy={copy}
          data={data}
          locale={locale}
          manager={manager}
          travelAction={travelAction}
          travelState={travelState}
          tp={tp}
          transportAction={transportAction}
          transportState={transportState}
          trp={trp}
        />
      ) : null}
      <Card>
        <CardHeader>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Clock3 className="size-5 text-blue-700" />
            {copy.timeline}
          </h3>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {data.events.map((e) => (
              <li className="border-s-2 border-blue-100 ps-4" key={e.id}>
                <p className="text-sm font-semibold">
                  {e.event_type.replaceAll(".", " · ").replaceAll("_", " ")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(e.occurred_at))}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

function Finance({
  booking,
  data,
  locale,
  copy,
  manager,
  invoiceAction,
  invoiceState,
  ip,
  paymentAction,
  paymentState,
  pp,
  proofAction,
  proofState,
  pfp,
}: {
  booking: BookingRecord;
  data: BookingOperations;
  locale: Locale;
  copy: OperationsDictionary;
  manager: boolean;
  invoiceAction: (f: FormData) => void;
  invoiceState: OperationsActionState;
  ip: boolean;
  paymentAction: (f: FormData) => void;
  paymentState: OperationsActionState;
  pp: boolean;
  proofAction: (f: FormData) => void;
  proofState: OperationsActionState;
  pfp: boolean;
}) {
  const money = (value: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
      value,
    );
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
          new Date(value),
        )
      : "—";
  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="size-5 text-blue-700" />
          {copy.invoices}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="mb-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          {copy.paymentNotice}
        </p>
        <div className="space-y-6">
          {data.invoices.map((i) => (
            <article
              className="overflow-hidden rounded-2xl border border-slate-200"
              key={i.id}
            >
              <div className="flex flex-col justify-between gap-4 bg-slate-50 px-5 py-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {copy.invoiceReference}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                    {i.invoice_number}
                  </p>
                </div>
                <Badge variant={i.status === "PAID" ? "green" : "blue"}>
                  {i.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <div className="p-5">
                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Info l={copy.patient}>{booking.medical_case?.title}</Info>
                  <Info l={copy.provider}>{providerName(booking, locale)}</Info>
                  <Info l={copy.booking}>{booking.booking_reference}</Info>
                  <Info l={copy.acceptedOffer}>{booking.offer?.title}</Info>
                  <Info l={copy.invoiceDate}>
                    {date(i.issued_at ?? i.created_at)}
                  </Info>
                  <Info l={copy.dueDate}>{date(i.due_date)}</Info>
                  <Info l={copy.currency}>{i.currency}</Info>
                  <Info l={copy.status}>{i.status.replaceAll("_", " ")}</Info>
                </dl>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-start">
                          {copy.description}
                        </th>
                        <th className="px-3 py-2 text-end">{copy.quantity}</th>
                        <th className="px-3 py-2 text-end">
                          {copy.unitAmount}
                        </th>
                        <th className="px-3 py-2 text-end">{copy.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {i.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-3">{item.description}</td>
                          <td className="px-3 py-3 text-end">
                            {new Intl.NumberFormat(locale).format(
                              item.quantity,
                            )}
                          </td>
                          <td className="px-3 py-3 text-end">
                            {money(item.unit_amount, i.currency)}
                          </td>
                          <td className="px-3 py-3 text-end font-semibold">
                            {money(item.line_amount, i.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="ms-auto mt-5 grid max-w-sm gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt>{copy.total}</dt>
                    <dd className="font-semibold">
                      {money(i.total_amount, i.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <dt>{copy.paid}</dt>
                    <dd className="font-semibold">
                      {money(i.amount_paid, i.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base">
                    <dt className="font-semibold">{copy.remaining}</dt>
                    <dd className="font-bold">
                      {money(
                        Math.max(0, i.total_amount - i.amount_paid),
                        i.currency,
                      )}
                    </dd>
                  </div>
                </dl>
                {i.notes ? (
                  <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <b>{copy.notes}:</b> {i.notes}
                  </p>
                ) : null}
                <div className="mt-6">
                  <h4 className="font-semibold">{copy.paymentHistory}</h4>
                  {i.payments?.length ? (
                    <div className="mt-3 divide-y rounded-xl border">
                      {i.payments.map((p) => (
                        <div
                          className="flex flex-col justify-between gap-2 p-3 text-sm sm:flex-row sm:items-center"
                          key={p.id}
                        >
                          <div>
                            <b>{money(p.amount, i.currency)}</b>
                            <p className="text-xs text-slate-500">
                              {p.method.replaceAll("_", " ")}
                              {p.reference_number
                                ? ` · ${p.reference_number}`
                                : ""}
                            </p>
                          </div>
                          <time className="text-slate-500">
                            {new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(p.paid_at))}
                          </time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      {copy.noPayments}
                    </p>
                  )}
                </div>
                {manager && i.status === "DRAFT" ? (
                  <form action={issueInvoiceAction} className="mt-4">
                    <input name="locale" type="hidden" value={locale} />
                    <input name="booking_id" type="hidden" value={booking.id} />
                    <input name="invoice_id" type="hidden" value={i.id} />
                    <Button variant="outline">{copy.issue}</Button>
                  </form>
                ) : null}
                {manager &&
                ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status) ? (
                  <>
                    <AdminFormDialog enabled={manager} title={copy.recordPayment} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"}><form
                      action={paymentAction}
                      className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
                    >
                      <input name="locale" type="hidden" value={locale} />
                      <input name="invoice_id" type="hidden" value={i.id} />
                      <Feedback c={copy} s={paymentState} />
                      <Field label={copy.amount}>
                        <Input
                          max={i.total_amount - i.amount_paid}
                          min="0.01"
                          name="amount"
                          required
                          step="0.01"
                          type="number"
                        />
                      </Field>
                      <Field label={copy.dateTime}>
                        <Input name="paid_at" required type="datetime-local" />
                      </Field>
                      <Field label={copy.method}>
                        <Select name="method">
                          <option value="BANK_TRANSFER">
                            {locale === "ar"
                              ? "تحويل بنكي"
                              : locale === "fr"
                                ? "Virement bancaire"
                                : "Bank transfer"}
                          </option>
                          <option value="CASH">
                            {locale === "ar"
                              ? "نقدًا"
                              : locale === "fr"
                                ? "Espèces"
                                : "Cash"}
                          </option>
                          <option value="CARD_AT_PROVIDER">
                            {locale === "ar"
                              ? "بطاقة لدى المنشأة"
                              : locale === "fr"
                                ? "Carte chez le prestataire"
                                : "Card at provider"}
                          </option>
                          <option value="OTHER">
                            {locale === "ar"
                              ? "أخرى"
                              : locale === "fr"
                                ? "Autre"
                                : "Other"}
                          </option>
                        </Select>
                      </Field>
                      <Field label={copy.reference}>
                        <Input name="reference_number" />
                      </Field>
                      <Button loading={pp}>{copy.recordPayment}</Button>
                    </form></AdminFormDialog>
                    {i.payments?.map((p) => (
                      <AdminFormDialog enabled={manager} title={copy.proof} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"} key={p.id}><form
                        action={proofAction}
                        className="mt-3 flex flex-wrap items-end gap-3"
                        key={p.id}
                      >
                        <input name="locale" type="hidden" value={locale} />
                        <input name="payment_id" type="hidden" value={p.id} />
                        <Field label={copy.proof}>
                          <Input
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            name="proof"
                            required
                            type="file"
                          />
                        </Field>
                        <Button loading={pfp} variant="outline">
                          {copy.upload}
                        </Button>
                        <Feedback c={copy} s={proofState} />
                      </form></AdminFormDialog>
                    ))}
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {manager ? (
          <AdminFormDialog enabled={manager} title={copy.newInvoice} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"}><form
            action={invoiceAction}
            className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4"
          >
            <input name="locale" type="hidden" value={locale} />
            <input name="booking_id" type="hidden" value={booking.id} />
            <h4 className="font-semibold">{copy.newInvoice}</h4>
            <Feedback c={copy} s={invoiceState} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={copy.description}>
                <Input name="description" required />
              </Field>
              <Field label={copy.quantity}>
                <Input
                  defaultValue="1"
                  min="0.01"
                  name="quantity"
                  step="0.01"
                  type="number"
                />
              </Field>
              <Field label={copy.unitAmount}>
                <Input
                  min="0"
                  name="unit_amount"
                  required
                  step="0.01"
                  type="number"
                />
              </Field>
              <Field label={copy.currency}>
                <Input
                  autoCapitalize="characters"
                  maxLength={3}
                  name="currency"
                  pattern="[A-Za-z]{3}"
                  placeholder="USD / EUR / EGP"
                  required
                />
              </Field>
              <Field label={copy.dueDate}>
                <Input name="due_date" type="date" />
              </Field>
            </div>
            <Field label={copy.providerNotes}>
              <Textarea name="notes" />
            </Field>
            <Button loading={ip}>{copy.save}</Button>
          </form></AdminFormDialog>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Travel({
  booking,
  data,
  locale,
  copy,
  manager,
  travelAction,
  travelState,
  tp,
  transportAction,
  transportState,
  trp,
}: {
  booking: BookingRecord;
  data: BookingOperations;
  locale: Locale;
  copy: OperationsDictionary;
  manager: boolean;
  travelAction: (f: FormData) => void;
  travelState: OperationsActionState;
  tp: boolean;
  transportAction: (f: FormData) => void;
  transportState: OperationsActionState;
  trp: boolean;
}) {
  const t = data.travel;
  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Plane className="size-5 text-blue-700" />
          {copy.travel}
        </h3>
      </CardHeader>
      <CardContent>
        {!manager ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            <Info l={copy.arrival}>
              {t?.arrival_at &&
                new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(t.arrival_at))}
            </Info>
            <Info l={copy.flight}>
              {[t?.airline, t?.arrival_flight_number].filter(Boolean).join(" ")}
            </Info>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{copy.accommodation}</dt><dd className="mt-1"><Link className="text-sm font-semibold text-blue-700" href={`/${locale}/patient/accommodation`}>{copy.accommodation}</Link></dd></div>
            <Info l={copy.companion}>{t?.companion_name}</Info>
          </dl>
        ) : (
          <AdminFormDialog enabled={manager} title={copy.travel} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"}><form action={travelAction} className="grid gap-4">
            <input name="locale" type="hidden" value={locale} />
            <input name="booking_id" type="hidden" value={booking.id} />
            <Feedback c={copy} s={travelState} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={copy.arrival}>
                <Input
                  defaultValue={dt(t?.arrival_at)}
                  name="arrival_at"
                  type="datetime-local"
                />
              </Field>
              <Field label={copy.departure}>
                <Input
                  defaultValue={dt(t?.departure_at)}
                  name="departure_at"
                  type="datetime-local"
                />
              </Field>
              <Field label={copy.airline}>
                <Input defaultValue={t?.airline ?? ""} name="airline" />
              </Field>
              <Field label={copy.arrivalFlight}>
                <Input
                  defaultValue={t?.arrival_flight_number ?? ""}
                  name="arrival_flight_number"
                />
              </Field>
              <Field label={copy.departureFlight}>
                <Input
                  defaultValue={t?.departure_flight_number ?? ""}
                  name="departure_flight_number"
                />
              </Field>
              <Field label={copy.origin}>
                <Input
                  defaultValue={t?.origin_airport ?? ""}
                  name="origin_airport"
                />
              </Field>
              <Field label={copy.destination}>
                <Input
                  defaultValue={t?.destination_airport ?? ""}
                  name="destination_airport"
                />
              </Field>
              <Field label={copy.terminal}>
                <Input
                  defaultValue={t?.arrival_terminal ?? ""}
                  name="arrival_terminal"
                />
              </Field>
              <Field label={copy.name}>
                <Input
                  defaultValue={t?.companion_name ?? ""}
                  name="companion_name"
                />
              </Field>
              <Field label={copy.relationship}>
                <Input
                  defaultValue={t?.companion_relationship ?? ""}
                  name="companion_relationship"
                />
              </Field>
              <Field label={copy.contact}>
                <Input
                  defaultValue={t?.companion_contact ?? ""}
                  name="companion_contact"
                />
              </Field>
            </div>
            <Textarea
              defaultValue={t?.travel_notes ?? ""}
              name="travel_notes"
            />
            <input
              name="accommodation_mode"
              type="hidden"
              value={t?.accommodation_mode ?? "NOT_REQUIRED"}
            />
            <input name="accommodation_name" type="hidden" value={t?.accommodation_name ?? ""}/>
            <input name="accommodation_address" type="hidden" value={t?.accommodation_address ?? ""}/>
            <input name="check_in_date" type="hidden" value={t?.check_in_date ?? ""}/>
            <input name="check_out_date" type="hidden" value={t?.check_out_date ?? ""}/>
            <input name="accommodation_reference" type="hidden" value={t?.accommodation_reference ?? ""}/>
            <input
              name="accommodation_notes"
              type="hidden"
              value={t?.accommodation_notes ?? ""}
            />
            <input
              name="companion_notes"
              type="hidden"
              value={t?.companion_notes ?? ""}
            />
            <Button loading={tp}>{copy.save}</Button>
          </form></AdminFormDialog>
        )}
        <div className="mt-6">
          <h4 className="flex items-center gap-2 font-semibold">
            <Route className="size-4" />
            {copy.transport}
          </h4>
          {data.transport.map((x) => (
            <div className="mt-3 rounded-xl border p-3 text-sm" key={x.id}>
              <b>{x.transport_type.replaceAll("_", " ")}</b>
              <p>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(x.pickup_at))}{" "}
                · {x.pickup_location} → {x.destination}
              </p>
            </div>
          ))}
          {manager ? (
            <AdminFormDialog enabled={manager} title={copy.transport} closeLabel={locale === "ar" ? "\u0625\u063a\u0644\u0627\u0642" : locale === "fr" ? "Fermer" : "Close"}><form
              action={transportAction}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <input name="locale" type="hidden" value={locale} />
              <input name="booking_id" type="hidden" value={booking.id} />
              <Feedback c={copy} s={transportState} />
              <Field label={copy.transportType}>
                <Select name="transport_type">
                  <option value="AIRPORT_PICKUP">AIRPORT PICKUP</option>
                  <option value="HOTEL_TO_HOSPITAL">HOTEL TO HOSPITAL</option>
                  <option value="HOSPITAL_TO_HOTEL">HOSPITAL TO HOTEL</option>
                  <option value="LOCAL_TRANSPORT">LOCAL TRANSPORT</option>
                  <option value="DISCHARGE_TRANSPORT">
                    DISCHARGE TRANSPORT
                  </option>
                </Select>
              </Field>
              <Field label={copy.pickup}>
                <Input name="pickup_at" required type="datetime-local" />
              </Field>
              <Field label={copy.pickupLocation}>
                <Input name="pickup_location" required />
              </Field>
              <Field label={copy.transportDestination}>
                <Input name="destination" required />
              </Field>
              <Field label={copy.providerLabel}>
                <Input name="provider_label" />
              </Field>
              <Field label={copy.contact}>
                <Input name="contact" />
              </Field>
              <input name="notes" type="hidden" />
              <Button loading={trp}>{copy.save}</Button>
            </form></AdminFormDialog>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
