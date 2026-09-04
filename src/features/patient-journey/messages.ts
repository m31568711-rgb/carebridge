import type { Locale } from '@/src/i18n/config';

const en = {
  title: 'My Care Journey', eyebrow: 'Your treatment, clearly coordinated',
  description: 'Follow every confirmed step of your care, travel and recovery in one place.',
  allJourneys: 'My care journeys', openJourney: 'Open journey', empty: 'No care journey has been created yet.',
  status: 'Journey status', dates: 'Journey dates', provider: 'Current care provider', nextAppointment: 'Next appointment',
  clinicalServices: 'Clinical services', schedule: 'Schedule', accommodation: 'Accommodation', travel: 'Travel',
  payments: 'Payments', documents: 'Documents', medicalHistory: 'Medical history', notifications: 'Notifications',
  chooseHospital: 'Choose a hospital', chooseStay: 'Choose accommodation', choose: 'Select this option',
  patientChoice: 'Your choice is needed', locked: 'Confirmed by your care team', awaiting: 'Awaiting selection',
  startingFrom: 'Starting from', perNight: 'per night', paid: 'Paid', remaining: 'Remaining', total: 'Total',
  paymentHistory: 'Payment history', invoice: 'Invoice', noRecords: 'Nothing has been added here yet.',
  notRequired: 'Not required for this journey', held: 'Request held for review', confirmed: 'Confirmed',
  viewAll: 'View all notifications', arrival: 'Arrival', departure: 'Departure', airline: 'Airline / flight',
  localCare: 'Local care', internationalTravel: 'International medical travel', followUp: 'Follow-up',
  prescriptions: 'Prescriptions', laboratory: 'Laboratory results', radiology: 'Radiology results',
  encounters: 'Consultation history', medication: 'Medication instructions',
  selectSaved: 'Your selection was saved and sent to the care team.',
  selectFailed: 'This option is no longer available or another selection has already been confirmed.',
  invalid: 'Please review your selection.', checkIn: 'Check-in', checkOut: 'Check-out', rooms: 'Rooms',
  guests: 'Guests', notes: 'Notes', requestStay: 'Request accommodation',
  serviceTypes: { DOCTOR_CONSULTATION: 'Doctor consultation', HOSPITAL_PROCEDURE: 'Hospital / procedure', LABORATORY: 'Laboratory', RADIOLOGY: 'Radiology' },
} as const;

const fr = {
  ...en, title: 'Mon parcours de soins', eyebrow: 'Votre traitement, coordonné clairement',
  description: 'Suivez chaque étape confirmée de vos soins, de votre voyage et de votre rétablissement.',
  allJourneys: 'Mes parcours de soins', openJourney: 'Ouvrir le parcours', empty: 'Aucun parcours de soins n’a encore été créé.',
  status: 'Statut du parcours', dates: 'Dates du parcours', provider: 'Prestataire actuel', nextAppointment: 'Prochain rendez-vous',
  clinicalServices: 'Services cliniques', schedule: 'Planning', accommodation: 'Hébergement', travel: 'Voyage',
  payments: 'Paiements', documents: 'Documents', medicalHistory: 'Historique médical', notifications: 'Notifications',
  chooseHospital: 'Choisir un hôpital', chooseStay: 'Choisir un hébergement', choose: 'Choisir cette option',
  patientChoice: 'Votre choix est requis', locked: 'Confirmé par votre équipe de soins', awaiting: 'En attente de sélection',
  startingFrom: 'À partir de', perNight: 'par nuit', paid: 'Payé', remaining: 'Reste', total: 'Total',
  paymentHistory: 'Historique des paiements', invoice: 'Facture', noRecords: 'Aucun élément n’a encore été ajouté.',
  notRequired: 'Non requis pour ce parcours', held: 'Demande en attente de validation', confirmed: 'Confirmé',
  viewAll: 'Voir toutes les notifications', arrival: 'Arrivée', departure: 'Départ', airline: 'Compagnie / vol',
  localCare: 'Soins locaux', internationalTravel: 'Voyage médical international', followUp: 'Suivi',
  prescriptions: 'Ordonnances', laboratory: 'Résultats de laboratoire', radiology: 'Résultats de radiologie',
  encounters: 'Historique des consultations', medication: 'Instructions de traitement',
  selectSaved: 'Votre choix a été enregistré et transmis à l’équipe.',
  selectFailed: 'Cette option n’est plus disponible ou un autre choix a déjà été confirmé.',
  invalid: 'Vérifiez votre sélection.', checkIn: 'Arrivée', checkOut: 'Départ', rooms: 'Chambres',
  guests: 'Voyageurs', notes: 'Notes', requestStay: 'Demander cet hébergement',
  serviceTypes: { DOCTOR_CONSULTATION: 'Consultation médicale', HOSPITAL_PROCEDURE: 'Hôpital / intervention', LABORATORY: 'Laboratoire', RADIOLOGY: 'Radiologie' },
} as const;

const ar = {
  ...en, title: 'رحلة علاجي', eyebrow: 'كل خطوات علاجك في مكان واحد',
  description: 'تابع خدماتك الطبية ومواعيدك وإقامتك وسفرك ومدفوعاتك بوضوح من بداية الرحلة حتى المتابعة.',
  allJourneys: 'رحلات علاجي', openJourney: 'عرض رحلة العلاج', empty: 'لم تُنشأ لك رحلة علاج حتى الآن.',
  status: 'حالة الرحلة', dates: 'مدة رحلة العلاج', provider: 'مقدم الرعاية الحالي', nextAppointment: 'الموعد القادم',
  clinicalServices: 'الخدمات الطبية', schedule: 'الجدول الزمني', accommodation: 'الإقامة', travel: 'السفر',
  payments: 'المدفوعات', documents: 'المستندات', medicalHistory: 'السجل الطبي', notifications: 'الإشعارات',
  chooseHospital: 'اختيار المستشفى', chooseStay: 'اختيار الإقامة', choose: 'اختيار هذا العرض',
  patientChoice: 'بانتظار اختيارك', locked: 'تم تأكيد الاختيار بواسطة فريق الرعاية', awaiting: 'بانتظار الاختيار',
  startingFrom: 'يبدأ من', perNight: 'لليلة الواحدة', paid: 'المبلغ المسدد', remaining: 'المبلغ المتبقي', total: 'الإجمالي',
  paymentHistory: 'سجل الدفعات', invoice: 'الفاتورة', noRecords: 'لم تُضف بيانات إلى هذا القسم بعد.',
  notRequired: 'غير مطلوب ضمن هذه الرحلة', held: 'تم إرسال الطلب للمراجعة', confirmed: 'مؤكد',
  viewAll: 'عرض جميع الإشعارات', arrival: 'الوصول', departure: 'المغادرة', airline: 'شركة الطيران / الرحلة',
  localCare: 'رعاية طبية محلية', internationalTravel: 'سفر علاجي دولي', followUp: 'المتابعة',
  prescriptions: 'الوصفات الطبية', laboratory: 'نتائج التحاليل', radiology: 'نتائج الأشعة',
  encounters: 'ملخص الزيارات الطبية', medication: 'تعليمات الدواء',
  selectSaved: 'تم حفظ اختيارك وإرساله إلى فريق الرعاية.',
  selectFailed: 'لم يعد هذا الخيار متاحًا أو تم تأكيد اختيار آخر بالفعل.',
  invalid: 'يرجى مراجعة الاختيار.', checkIn: 'تاريخ الوصول', checkOut: 'تاريخ المغادرة', rooms: 'عدد الغرف',
  guests: 'عدد النزلاء', notes: 'ملاحظات', requestStay: 'طلب هذه الإقامة',
  serviceTypes: { DOCTOR_CONSULTATION: 'استشارة طبيب', HOSPITAL_PROCEDURE: 'مستشفى / إجراء طبي', LABORATORY: 'تحليل طبي', RADIOLOGY: 'أشعة' },
} as const;

export type PatientJourneyDictionary = typeof en;
export function getPatientJourneyDictionary(locale: Locale): PatientJourneyDictionary {
  return ({ en, fr, ar } as const)[locale] as unknown as PatientJourneyDictionary;
}
