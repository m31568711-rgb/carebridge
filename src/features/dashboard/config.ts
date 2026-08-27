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
  const base = [{ icon: LayoutDashboard, label: navigation.overview, active: true }];

  const portalNavigation = {
    admin: [
      { icon: Hospital, label: navigation.hospitals },
      { icon: Stethoscope, label: navigation.doctors },
      { icon: BadgeCheck, label: navigation.verification },
      { icon: UsersRound, label: navigation.users },
      { icon: FileClock, label: navigation.audit },
    ],
    patient: [
      { icon: ClipboardList, label: navigation.cases },
      { icon: Building2, label: navigation.providers },
      { icon: CalendarDays, label: navigation.appointments },
      { icon: FileText, label: navigation.documents },
    ],
    hospital: [
      { icon: UserRound, label: navigation.patients },
      { icon: Stethoscope, label: navigation.doctors },
      { icon: UsersRound, label: navigation.team },
      { icon: ClipboardList, label: navigation.catalog },
    ],
    doctor: [
      { icon: UserRound, label: navigation.patients },
      { icon: CalendarDays, label: navigation.appointments },
      { icon: FileText, label: navigation.documents },
      { icon: Settings2, label: dictionary.common.profile },
    ],
    pharmacy: [
      { icon: Pill, label: navigation.prescriptions },
      { icon: UserRound, label: navigation.patients },
      { icon: ClipboardList, label: navigation.pharmacy },
      { icon: Settings2, label: dictionary.common.profile },
    ],
  } as const;

  const portalCopy = {
    admin: { title: dictionary.dashboard.portals.adminTitle, description: dictionary.dashboard.portals.adminDescription, icon: ShieldCheck },
    patient: { title: dictionary.dashboard.portals.patientTitle, description: dictionary.dashboard.portals.patientDescription, icon: HeartPulse },
    hospital: { title: dictionary.dashboard.portals.hospitalTitle, description: dictionary.dashboard.portals.hospitalDescription, icon: Hospital },
    doctor: { title: dictionary.dashboard.portals.doctorTitle, description: dictionary.dashboard.portals.doctorDescription, icon: Stethoscope },
    pharmacy: { title: dictionary.dashboard.portals.pharmacyTitle, description: dictionary.dashboard.portals.pharmacyDescription, icon: Pill },
  } as const;

  return { ...portalCopy[portal], navigation: [...base, ...portalNavigation[portal]] };
}
