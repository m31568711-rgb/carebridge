import type { PortalKey } from '@/src/config/roles';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import type { NotificationRecord } from '@/src/types/domain';
import { getJourneyDictionary } from '@/src/features/journey/messages';

export function notificationText(record: NotificationRecord, locale: Locale, copy: Dictionary['notifications']) {
  const journey = getJourneyDictionary(locale).notifications;
  const key = record.title_key?.replace('part4.notifications.', '') as keyof typeof journey | undefined;
  const messageKey = record.message_key?.replace('part4.notifications.', '') as keyof typeof journey | undefined;
  return { title: key && journey[key] ? journey[key] : copy.foundationTitle, message: messageKey && journey[messageKey] ? journey[messageKey] : copy.foundationMessage };
}
export function notificationHref(record: NotificationRecord, locale: Locale, portal: PortalKey) {
  if (!record.related_entity_id) return `/${locale}/notifications`;
  if (record.related_entity_type === 'offer' && ['patient','provider','doctor'].includes(portal)) return `/${locale}/${portal}/offers/${record.related_entity_id}`;
  if (record.related_entity_type === 'booking' && ['patient','provider','doctor'].includes(portal)) return `/${locale}/${portal}/bookings/${record.related_entity_id}`;
  return `/${locale}/notifications`;
}
