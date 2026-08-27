import type { Locale } from '@/src/i18n/config';

const en = {
  patient: {
    eyebrow: 'Private medical cases', title: 'Your care starts with the medical need',
    description: 'Describe your condition and choose a specialty. A doctor determines the appropriate treatment after review.',
    create: 'Create medical case', browse: 'Browse providers', empty: 'No medical cases yet', emptyDescription: 'Create a private case when you are ready to seek specialist guidance.',
    activeCases: 'Active cases', recommendations: 'Recommendations available', documents: 'Private documents', recent: 'Recent medical cases',
  },
  doctor: {
    eyebrow: 'Clinical review workspace', title: 'Cases shared for your review',
    description: 'Only cases explicitly assigned to your verified doctor profile appear here.', empty: 'No assigned cases',
    emptyDescription: 'Cases will appear after an authorized administrator grants access.', review: 'Review case', recommendation: 'Treatment recommendation',
  },
  case: {
    newTitle: 'Create a medical case', newDescription: 'Share the medical need, not a treatment choice. Required fields are marked.',
    detailEyebrow: 'Medical case', editTitle: 'Case details', title: 'Case title or reason for seeking care', specialty: 'Medical specialty',
    description: 'Describe the medical problem', symptoms: 'Symptoms and relevant notes', country: 'Preferred country', city: 'Preferred city',
    location: 'Other location preference', choose: 'Choose an option', saveDraft: 'Save draft', save: 'Save changes', submit: 'Submit for review',
    submitHint: 'After submission, core medical details are locked to preserve the review record.', cancel: 'Cancel case', close: 'Close case',
    created: 'Created', updated: 'Updated', status: 'Status', treatmentNotice: 'Treatment is selected only by an authorized doctor after reviewing this case.',
    saved: 'Changes saved.', invalid: 'Review the highlighted information and try again.', unavailable: 'This case is unavailable or you do not have access.', back: 'Back to cases',
  },
  documents: {
    title: 'Medical documents', description: 'Private evidence is encrypted in transit and protected by case-level access rules.',
    type: 'Document type', file: 'Choose a PDF, image, or DICOM file', notes: 'Document notes', upload: 'Upload securely', delete: 'Remove',
    empty: 'No documents uploaded', max: 'Maximum 25 MB. PDF, JPEG, PNG, WebP, or DICOM.', open: 'Open private file', uploaded: 'Document uploaded.',
    types: { MEDICAL_REPORT: 'Medical report', LAB_RESULT: 'Lab result', RADIOLOGY: 'Radiology', PRESCRIPTION: 'Prescription', OTHER: 'Other' },
  },
  recommendation: {
    title: 'Doctor recommendation', treatment: 'Recommended treatment', notes: 'Medical recommendation notes', nextSteps: 'Next-step instructions',
    submit: 'Submit recommendation', update: 'Update recommendation', pending: 'No submitted recommendation yet',
    pendingDescription: 'An authorized doctor can add a recommendation after reviewing the case.', doctor: 'Reviewing doctor', submitted: 'Submitted',
    specialtyRule: 'Only active treatments belonging to the case specialty can be selected.',
  },
  discovery: {
    eyebrow: 'Verified care network', title: 'Discover suitable providers', description: 'Search verified, active providers with server-side filters and location-aware results.',
    query: 'Search providers', providerType: 'Provider type', allTypes: 'All provider types', country: 'Country', city: 'City', specialty: 'Specialty',
    apply: 'Apply filters', list: 'List view', map: 'Map view', useLocation: 'Use my location', locationReady: 'Distance sorting is active.',
    locationDenied: 'Location was not shared. Choose a country or city instead.', results: 'providers found', noResults: 'No eligible providers match these filters.',
    distance: 'km away', verified: 'Verified', mapUnavailable: 'Add a country, city, or share location to focus the map.',
    types: { HOSPITAL: 'Hospital', DOCTOR: 'Doctor', PHARMACY: 'Pharmacy', RADIOLOGY_CENTER: 'Radiology center', MEDICAL_LABORATORY: 'Medical laboratory' },
  },
  statuses: {
    DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review', RECOMMENDATION_AVAILABLE: 'Recommendation available', CLOSED: 'Closed', CANCELLED: 'Cancelled',
  },
  common: { required: 'Required', optional: 'Optional', loading: 'Please wait…', error: 'We could not complete this action.', view: 'View details' },
};

type DeepString<T> = T extends string ? string : { [K in keyof T]: DeepString<T[K]> };
export type CaseDictionary = DeepString<typeof en>;

const fr: CaseDictionary = {
  patient: { eyebrow:'Dossiers médicaux privés',title:'Votre parcours commence par le besoin médical',description:'Décrivez votre état et choisissez une spécialité. Un médecin détermine le traitement approprié après examen.',create:'Créer un dossier médical',browse:'Découvrir les prestataires',empty:'Aucun dossier médical',emptyDescription:'Créez un dossier privé lorsque vous êtes prêt à demander un avis spécialisé.',activeCases:'Dossiers actifs',recommendations:'Recommandations disponibles',documents:'Documents privés',recent:'Dossiers récents' },
  doctor: { eyebrow:'Espace d’évaluation clinique',title:'Dossiers partagés pour votre évaluation',description:'Seuls les dossiers explicitement attribués à votre profil de médecin vérifié apparaissent ici.',empty:'Aucun dossier attribué',emptyDescription:'Les dossiers apparaîtront après autorisation par un administrateur.',review:'Examiner le dossier',recommendation:'Recommandation de traitement' },
  case: { newTitle:'Créer un dossier médical',newDescription:'Décrivez le besoin médical, sans choisir de traitement. Les champs obligatoires sont indiqués.',detailEyebrow:'Dossier médical',editTitle:'Détails du dossier',title:'Titre ou raison de la demande de soins',specialty:'Spécialité médicale',description:'Décrivez le problème médical',symptoms:'Symptômes et notes utiles',country:'Pays préféré',city:'Ville préférée',location:'Autre préférence de lieu',choose:'Choisir une option',saveDraft:'Enregistrer le brouillon',save:'Enregistrer',submit:'Soumettre pour examen',submitHint:'Après soumission, les informations médicales principales sont verrouillées.',cancel:'Annuler le dossier',close:'Clore le dossier',created:'Créé',updated:'Mis à jour',status:'Statut',treatmentNotice:'Le traitement est choisi uniquement par un médecin autorisé après examen.',saved:'Modifications enregistrées.',invalid:'Vérifiez les informations et réessayez.',unavailable:'Ce dossier est indisponible ou vous n’y avez pas accès.',back:'Retour aux dossiers' },
  documents: { title:'Documents médicaux',description:'Les pièces privées sont protégées par les règles d’accès du dossier.',type:'Type de document',file:'Choisissez un PDF, une image ou un fichier DICOM',notes:'Notes du document',upload:'Téléverser en sécurité',delete:'Supprimer',empty:'Aucun document téléversé',max:'25 Mo maximum. PDF, JPEG, PNG, WebP ou DICOM.',open:'Ouvrir le fichier privé',uploaded:'Document téléversé.',types:{ MEDICAL_REPORT:'Rapport médical',LAB_RESULT:'Résultat de laboratoire',RADIOLOGY:'Radiologie',PRESCRIPTION:'Ordonnance',OTHER:'Autre' } },
  recommendation: { title:'Recommandation du médecin',treatment:'Traitement recommandé',notes:'Notes de recommandation médicale',nextSteps:'Prochaines étapes',submit:'Soumettre la recommandation',update:'Mettre à jour la recommandation',pending:'Aucune recommandation soumise',pendingDescription:'Un médecin autorisé peut ajouter une recommandation après examen.',doctor:'Médecin évaluateur',submitted:'Soumise',specialtyRule:'Seuls les traitements actifs liés à la spécialité du dossier peuvent être choisis.' },
  discovery: { eyebrow:'Réseau de soins vérifié',title:'Découvrir les prestataires adaptés',description:'Recherchez les prestataires actifs et vérifiés avec des filtres serveur et la proximité.',query:'Rechercher des prestataires',providerType:'Type de prestataire',allTypes:'Tous les types',country:'Pays',city:'Ville',specialty:'Spécialité',apply:'Appliquer les filtres',list:'Liste',map:'Carte',useLocation:'Utiliser ma position',locationReady:'Le tri par distance est actif.',locationDenied:'Position non partagée. Choisissez un pays ou une ville.',results:'prestataires trouvés',noResults:'Aucun prestataire admissible ne correspond.',distance:'km',verified:'Vérifié',mapUnavailable:'Choisissez un pays, une ville ou partagez votre position.',types:{ HOSPITAL:'Hôpital',DOCTOR:'Médecin',PHARMACY:'Pharmacie',RADIOLOGY_CENTER:'Centre de radiologie',MEDICAL_LABORATORY:'Laboratoire médical' } },
  statuses: { DRAFT:'Brouillon',SUBMITTED:'Soumis',UNDER_REVIEW:'En cours d’examen',RECOMMENDATION_AVAILABLE:'Recommandation disponible',CLOSED:'Clos',CANCELLED:'Annulé' },
  common: { required:'Obligatoire',optional:'Facultatif',loading:'Veuillez patienter…',error:'Impossible de terminer cette action.',view:'Voir les détails' },
};

const ar: CaseDictionary = {
  patient: { eyebrow:'حالات طبية خاصة',title:'تبدأ رحلة الرعاية من الاحتياج الطبي',description:'صِف حالتك واختر التخصص. يحدد الطبيب العلاج المناسب بعد المراجعة.',create:'إنشاء حالة طبية',browse:'استكشاف مقدمي الرعاية',empty:'لا توجد حالات طبية بعد',emptyDescription:'أنشئ حالة خاصة عندما تكون مستعدًا لطلب رأي متخصص.',activeCases:'الحالات النشطة',recommendations:'التوصيات المتاحة',documents:'الوثائق الخاصة',recent:'أحدث الحالات الطبية' },
  doctor: { eyebrow:'مساحة المراجعة السريرية',title:'الحالات المشتركة لمراجعتك',description:'تظهر فقط الحالات المسندة صراحة إلى ملف طبيبك الموثق.',empty:'لا توجد حالات مسندة',emptyDescription:'ستظهر الحالات بعد منح الوصول من مسؤول مخول.',review:'مراجعة الحالة',recommendation:'توصية العلاج' },
  case: { newTitle:'إنشاء حالة طبية',newDescription:'شارك الاحتياج الطبي ولا تختر علاجًا. الحقول المطلوبة موضحة.',detailEyebrow:'حالة طبية',editTitle:'تفاصيل الحالة',title:'عنوان الحالة أو سبب طلب الرعاية',specialty:'التخصص الطبي',description:'صف المشكلة الطبية',symptoms:'الأعراض والملاحظات المهمة',country:'الدولة المفضلة',city:'المدينة المفضلة',location:'تفضيل آخر للموقع',choose:'اختر خيارًا',saveDraft:'حفظ المسودة',save:'حفظ التغييرات',submit:'إرسال للمراجعة',submitHint:'بعد الإرسال تُقفل التفاصيل الطبية الأساسية لحماية سجل المراجعة.',cancel:'إلغاء الحالة',close:'إغلاق الحالة',created:'تاريخ الإنشاء',updated:'آخر تحديث',status:'الحالة',treatmentNotice:'يختار العلاج طبيب مخول فقط بعد مراجعة الحالة.',saved:'تم حفظ التغييرات.',invalid:'راجع المعلومات وحاول مرة أخرى.',unavailable:'هذه الحالة غير متاحة أو لا تملك صلاحية الوصول إليها.',back:'العودة إلى الحالات' },
  documents: { title:'الوثائق الطبية',description:'تتم حماية الأدلة الخاصة بسياسات وصول على مستوى الحالة.',type:'نوع الوثيقة',file:'اختر ملف PDF أو صورة أو DICOM',notes:'ملاحظات الوثيقة',upload:'رفع آمن',delete:'إزالة',empty:'لم تُرفع وثائق',max:'الحد الأقصى 25 ميجابايت. PDF أو JPEG أو PNG أو WebP أو DICOM.',open:'فتح الملف الخاص',uploaded:'تم رفع الوثيقة.',types:{ MEDICAL_REPORT:'تقرير طبي',LAB_RESULT:'نتيجة مختبر',RADIOLOGY:'أشعة',PRESCRIPTION:'وصفة طبية',OTHER:'أخرى' } },
  recommendation: { title:'توصية الطبيب',treatment:'العلاج الموصى به',notes:'ملاحظات التوصية الطبية',nextSteps:'تعليمات الخطوات التالية',submit:'إرسال التوصية',update:'تحديث التوصية',pending:'لا توجد توصية مرسلة بعد',pendingDescription:'يمكن لطبيب مخول إضافة توصية بعد مراجعة الحالة.',doctor:'الطبيب المراجع',submitted:'تم الإرسال',specialtyRule:'يمكن اختيار العلاجات النشطة التابعة لتخصص الحالة فقط.' },
  discovery: { eyebrow:'شبكة رعاية موثقة',title:'استكشف مقدمي الرعاية المناسبين',description:'ابحث عن مقدمي الرعاية النشطين والموثقين باستخدام فلاتر الخادم والموقع.',query:'البحث عن مقدم رعاية',providerType:'نوع مقدم الرعاية',allTypes:'كل الأنواع',country:'الدولة',city:'المدينة',specialty:'التخصص',apply:'تطبيق الفلاتر',list:'عرض القائمة',map:'عرض الخريطة',useLocation:'استخدام موقعي',locationReady:'تم تفعيل الترتيب حسب المسافة.',locationDenied:'لم تتم مشاركة الموقع. اختر دولة أو مدينة.',results:'مقدم رعاية',noResults:'لا يوجد مقدم رعاية مؤهل يطابق هذه الفلاتر.',distance:'كم',verified:'موثق',mapUnavailable:'اختر دولة أو مدينة أو شارك موقعك لتركيز الخريطة.',types:{ HOSPITAL:'مستشفى',DOCTOR:'طبيب',PHARMACY:'صيدلية',RADIOLOGY_CENTER:'مركز أشعة',MEDICAL_LABORATORY:'مختبر طبي' } },
  statuses: { DRAFT:'مسودة',SUBMITTED:'مرسلة',UNDER_REVIEW:'قيد المراجعة',RECOMMENDATION_AVAILABLE:'التوصية متاحة',CLOSED:'مغلقة',CANCELLED:'ملغاة' },
  common: { required:'مطلوب',optional:'اختياري',loading:'يرجى الانتظار…',error:'تعذر إكمال الإجراء.',view:'عرض التفاصيل' },
};

const messages: Record<Locale, CaseDictionary> = { en, fr, ar };
export function getCaseDictionary(locale: Locale) { return messages[locale]; }
