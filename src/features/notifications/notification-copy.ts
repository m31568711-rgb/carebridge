import type { PortalKey } from '@/src/config/roles';
import type { Locale } from '@/src/i18n/config';
import type { Dictionary } from '@/src/i18n/messages/en';
import type { NotificationRecord } from '@/src/types/domain';
import { getJourneyDictionary } from '@/src/features/journey/messages';
import { getOperationsDictionary } from '@/src/features/operations/messages';

export function notificationText(record: NotificationRecord, locale: Locale, copy: Dictionary['notifications']) {
  const journey = getJourneyDictionary(locale).notifications;
  const key = record.title_key?.replace('part4.notifications.', '') as keyof typeof journey | undefined;
  const messageKey = record.message_key?.replace('part4.notifications.', '') as keyof typeof journey | undefined;
  if(record.title_key?.startsWith('part5.notifications.')){const operations=getOperationsDictionary(locale);const event=record.title_key.replace('part5.notifications.','').replace(/Title$/,'');const phrases:Record<Locale,Record<string,string>>={en:{appointmentconfirmed:'Appointment confirmed',appointmentrescheduled:'Appointment rescheduled',appointmentcancelled:'Appointment cancelled',invoiceissued:'Invoice issued',paymentrecorded:'Manual payment recorded',paymentcompleted:'Payment tracking completed',travelupdated:'Travel information updated',transportplanned:'Pickup or transport planned',transportconfirmed:'Transport confirmed'},fr:{appointmentconfirmed:'Rendez-vous confirmé',appointmentrescheduled:'Rendez-vous replanifié',appointmentcancelled:'Rendez-vous annulé',invoiceissued:'Facture émise',paymentrecorded:'Paiement manuel enregistré',paymentcompleted:'Suivi du paiement terminé',travelupdated:'Informations de voyage mises à jour',transportplanned:'Transport planifié',transportconfirmed:'Transport confirmé'},ar:{appointmentconfirmed:'تم تأكيد الموعد',appointmentrescheduled:'تمت إعادة جدولة الموعد',appointmentcancelled:'تم إلغاء الموعد',invoiceissued:'تم إصدار الفاتورة',paymentrecorded:'تم تسجيل الدفعة اليدوية',paymentcompleted:'اكتمل تتبع الدفع',travelupdated:'تم تحديث معلومات السفر',transportplanned:'تم تخطيط النقل',transportconfirmed:'تم تأكيد النقل'}};const message=phrases[locale][event]??operations.title;return{title:message,message}}
  return { title: key && journey[key] ? journey[key] : copy.foundationTitle, message: messageKey && journey[messageKey] ? journey[messageKey] : copy.foundationMessage };
}
export function notificationHref(record: NotificationRecord, locale: Locale, portal: PortalKey) {
  if (!record.related_entity_id) return `/${locale}/notifications`;
  if (record.related_entity_type === 'offer' && ['patient','provider','doctor'].includes(portal)) return `/${locale}/${portal}/offers/${record.related_entity_id}`;
  if (record.related_entity_type === 'booking' && ['patient','provider','doctor'].includes(portal)) return `/${locale}/${portal}/bookings/${record.related_entity_id}`;
  if (record.related_entity_type === 'appointment' && ['patient','provider','doctor'].includes(portal)) return `/${locale}/${portal}/appointments/${record.related_entity_id}`;
  return `/${locale}/notifications`;
}
