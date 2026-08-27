import type { AppRole } from '@/src/config/roles';
import type { Locale } from '@/src/i18n/config';

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  preferredLanguage: Locale;
  avatarPath: string | null;
  accountStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
}

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: UserProfile | null;
  roles: AppRole[];
}

export interface NotificationRecord {
  id: string;
  recipient_id: string;
  type: string;
  title_key: string | null;
  message_key: string | null;
  data: Record<string, unknown>;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
}
