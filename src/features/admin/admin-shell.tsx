"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  Building2,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  FlaskConical,
  Globe2,
  Hospital,
  Languages,
  LayoutDashboard,
  MapPinned,
  Menu,
  Pill,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Brand } from "@/src/components/brand";
import { LanguageSelector } from "@/src/components/language-selector";
import { SignOutButton } from "@/src/features/auth/sign-out-button";
import { NotificationIndicator } from "@/src/features/notifications/notification-indicator";
import type { Locale } from "@/src/i18n/config";
import type { Dictionary } from "@/src/i18n/messages/en";
import type { AuthContext } from "@/src/types/domain";
import type { AdminDictionary } from "./messages";

interface Props {
  adminCopy: AdminDictionary;
  children: ReactNode;
  context: AuthContext;
  dictionary: Dictionary;
  locale: Locale;
}

type NavigationKey = keyof AdminDictionary["navigation"];
type NavigationItem = readonly [
  string,
  NavigationKey,
  ComponentType<{ className?: string }>,
];
const groups: readonly {
  title: NavigationKey;
  items: readonly NavigationItem[];
}[] = [
  {
    title: "geography",
    items: [
      ["countries", "countries", Globe2],
      ["cities", "cities", MapPinned],
    ],
  },
  {
    title: "clinical",
    items: [
      ["specialties", "specialties", BookOpenCheck],
      ["treatments", "treatments", BadgeCheck],
    ],
  },
  {
    title: "providers",
    items: [
      ["hospitals", "hospitals", Hospital],
      ["hospital_branches", "branches", Building2],
      ["hospital_specialties", "hospitalSpecialties", BookOpenCheck],
      ["hospital_treatments", "hospitalTreatments", BadgeCheck],
      ["doctors", "doctors", Stethoscope],
      ["doctor_specialties", "doctorSpecialties", BookOpenCheck],
      ["doctor_languages", "doctorLanguages", Languages],
      ["doctor_hospitals", "doctorHospitals", Hospital],
      ["pharmacies", "pharmacies", Pill],
      ["radiology_centers", "radiologyCenters", ScanLine],
      ["medical_laboratories", "medicalLaboratories", FlaskConical],
    ],
  },
  {
    title: "governance",
    items: [
      ["provider_documents", "documents", FileCheck2],
      ["provider_accreditations", "accreditations", ShieldCheck],
    ],
  },
];

const accountNavigation = {
  en: { title: 'Account management', patients: 'Patients', doctors: 'Doctor accounts', provider_staff: 'Provider / hospital staff', laboratory_staff: 'Laboratory staff', radiology_staff: 'Radiology staff' },
  fr: { title: 'Gestion des comptes', patients: 'Patients', doctors: 'Comptes médecins', provider_staff: 'Personnel hôpital / prestataire', laboratory_staff: 'Personnel de laboratoire', radiology_staff: 'Personnel de radiologie' },
  ar: { title: 'إدارة الحسابات', patients: 'المرضى', doctors: 'حسابات الأطباء', provider_staff: 'فريق المستشفى ومقدم الرعاية', laboratory_staff: 'فريق المختبر', radiology_staff: 'فريق مركز الأشعة' },
} as const;

export function AdminShell({
  adminCopy,
  children,
  context,
  dictionary,
  locale,
}: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName =
    context.profile?.displayName ||
    [context.profile?.firstName, context.profile?.lastName]
      .filter(Boolean)
      .join(" ") ||
    context.email ||
    adminCopy.common.profile;
  const sidebar = (
    <>
      <div className="flex h-20 items-center justify-between border-b border-[var(--border)] px-5">
        <Brand href={`/${locale}`} name={dictionary.common.brand} />
        <button
          aria-label={adminCopy.common.closeMenu}
          className="grid size-9 place-items-center rounded-lg hover:bg-[#edf3f7] lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav
        aria-label={adminCopy.title}
        className="flex-1 overflow-y-auto px-3 py-5"
      >
        <Link
          className={`flex min-h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-medium transition ${pathname === `/${locale}/admin` ? "bg-[#eaf3f9] text-[var(--primary)]" : "text-[#53697b] hover:bg-[#f0f5f8] hover:text-[var(--foreground)]"}`}
          href={`/${locale}/admin`}
          onClick={() => setMobileOpen(false)}
        >
          <LayoutDashboard className="size-[1.1rem]" />
          {adminCopy.navigation.overview}
        </Link>
        <div className="mt-6">
          <p className="px-3 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[#8a9ba8]">{accountNavigation[locale].title}</p>
          <div className="mt-2 space-y-0.5">
            {(Object.entries(accountNavigation[locale]).filter(([key]) => key !== 'title') as Array<[string, string]>).map(([type, label]) => {
              const href = `/${locale}/admin/accounts/${type}`;
              return <Link className={`flex min-h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-medium transition ${pathname === href ? 'bg-[#eaf3f9] text-[var(--primary)]' : 'text-[#53697b] hover:bg-[#f0f5f8] hover:text-[var(--foreground)]'}`} href={href} key={type} onClick={() => setMobileOpen(false)}><UsersRound className="size-[1.05rem] shrink-0" />{label}</Link>;
            })}
          </div>
        </div>
        <Link
          className={`mt-1 flex min-h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-medium transition ${pathname === `/${locale}/admin/import` ? "bg-[#eaf3f9] text-[var(--primary)]" : "text-[#53697b] hover:bg-[#f0f5f8] hover:text-[var(--foreground)]"}`}
          href={`/${locale}/admin/import`}
          onClick={() => setMobileOpen(false)}
        >
          <FileSpreadsheet className="size-[1.1rem]" />
          {adminCopy.navigation.bulkImport}
        </Link>
        {groups.map((group) => (
          <div className="mt-6" key={group.title}>
            <p className="px-3 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[#8a9ba8]">
              {adminCopy.navigation[group.title]}
            </p>
            <div className="mt-2 space-y-0.5">
              {group.items.map(([module, label, Icon]) => {
                const href = `/${locale}/admin/${module}`;
                const active = pathname === href;
                return (
                  <Link
                    className={`flex min-h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-medium transition ${active ? "bg-[#eaf3f9] text-[var(--primary)]" : "text-[#53697b] hover:bg-[#f0f5f8] hover:text-[var(--foreground)]"}`}
                    href={href}
                    key={module}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="size-[1.05rem] shrink-0" />
                    {adminCopy.navigation[label]}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[#f2f7fb] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--primary)] shadow-sm">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--foreground)]">
              {displayName}
            </p>
            <p className="truncate text-[0.68rem] text-[#708496]">
              {context.email}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const currentSegment = pathname.split("/").filter(Boolean).at(-1) ?? "admin";
  const accountLabel = pathname.includes('/admin/accounts/') ? accountNavigation[locale][currentSegment as keyof typeof accountNavigation.en] : undefined;
  const activeItem = groups
    .flatMap((group) => group.items)
    .find(([module]) => module === currentSegment);
  const breadcrumb =
    accountLabel ?? (currentSegment === "import"
      ? adminCopy.navigation.bulkImport
      : activeItem
        ? adminCopy.navigation[activeItem[1]]
        : adminCopy.navigation.overview);

  return (
    <div className="min-h-screen bg-[#f5f8fb] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[17rem] flex-col border-e border-[var(--border)] bg-white lg:flex">
        {sidebar}
      </aside>
      {mobileOpen ? (
        <>
          <button
            aria-label={adminCopy.common.closeMenu}
            className="fixed inset-0 z-40 bg-[#102a43]/35 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside className="fixed inset-y-0 start-0 z-50 flex w-[min(19rem,88vw)] flex-col bg-white shadow-2xl lg:hidden">
            {sidebar}
          </aside>
        </>
      ) : null}
      <div className="lg:ps-[17rem]">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/92 backdrop-blur-xl">
          <div className="flex min-h-18 items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label={adminCopy.common.openMenu}
                className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-white lg:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[0.7rem] font-medium text-[#7a8e9e]">
                  <span>{adminCopy.title}</span>
                  <ChevronRight className="size-3 rtl:rotate-180" />
                  <span className="truncate text-[var(--primary)]">
                    {breadcrumb}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">
                  {breadcrumb}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector
                compact
                labels={dictionary.language}
                locale={locale}
              />
              <NotificationIndicator
                copy={dictionary.notifications}
                locale={locale}
                portal="admin"
              />
              <div className="hidden sm:block">
                <SignOutButton
                  label={dictionary.common.signOut}
                  locale={locale}
                />
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-7 sm:px-7 lg:px-9 lg:py-9" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
