import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardList,
  FileClock,
  FileText,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Pill,
  Settings2,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { PortalKey } from '@/src/config/roles';
import type { Dictionary } from '@/src/i18n/messages/en';

export function getPortalConfig(portal: PortalKey, dictionary: Dictionary) {
  const navigation = dictionary.dashboard.navigation;
  const base = [{ icon: LayoutDashboard, label: navigation.overview, active: true, href: '' }];

  const portalNavigation = {
    admin: [
      { icon: Hospital, label: navigation.hospitals },
      { icon: Stethoscope, label: navigation.doctors },
      { icon: BadgeCheck, label: navigation.verification },
      { icon: UsersRound, label: navigation.users },
      { icon: FileClock, label: navigation.audit },
    ],
    patient: [
      { icon: ClipboardList, label: navigation.cases, href: '' },
      { icon: Building2, label: navigation.providers, href: '/providers' },
      { icon: FileText, label: navigation.offers, href: '/offers' },
      { icon: CalendarDays, label: navigation.bookings, href: '/bookings' },
      { icon: CalendarDays, label: navigation.appointments, href: '/appointments' },
    ],
    hospital: [
      { icon: ClipboardList, label: navigation.cases, href: '' },
      { icon: Stethoscope, label: navigation.doctors },
      { icon: UsersRound, label: navigation.team },
      { icon: ClipboardList, label: navigation.catalog },
    ],
    doctor: [
      { icon: UserRound, label: navigation.assignedCases, href: '' },
      { icon: CalendarDays, label: navigation.bookings, href: '/bookings' },
      { icon: CalendarDays, label: navigation.appointments, href: '/appointments' },
    ],
    pharmacy: [
      { icon: Pill, label: navigation.prescriptions },
      { icon: UserRound, label: navigation.patients },
      { icon: ClipboardList, label: navigation.pharmacy },
      { icon: Settings2, label: dictionary.common.profile },
    ],
    provider: [
      { icon: ClipboardList, label: navigation.cases, href: '' },
      { icon: FileText, label: navigation.offers, href: '/offers' },
      { icon: CalendarDays, label: navigation.bookings, href: '/bookings' },
      { icon: CalendarDays, label: navigation.appointments, href: '/appointments' },
    ],
  } as const;

  const portalCopy = {
    admin: { title: dictionary.dashboard.portals.adminTitle, description: dictionary.dashboard.portals.adminDescription, icon: ShieldCheck },
    patient: { title: dictionary.dashboard.portals.patientTitle, description: dictionary.dashboard.portals.patientDescription, icon: HeartPulse },
    hospital: { title: dictionary.dashboard.portals.hospitalTitle, description: dictionary.dashboard.portals.hospitalDescription, icon: Hospital },
    doctor: { title: dictionary.dashboard.portals.doctorTitle, description: dictionary.dashboard.portals.doctorDescription, icon: Stethoscope },
    pharmacy: { title: dictionary.dashboard.portals.pharmacyTitle, description: dictionary.dashboard.portals.pharmacyDescription, icon: Pill },
    provider: { title: dictionary.dashboard.portals.providerTitle, description: dictionary.dashboard.portals.providerDescription, icon: Building2 },
  } as const;

  return { ...portalCopy[portal], navigation: [...base, ...portalNavigation[portal]] };
}
