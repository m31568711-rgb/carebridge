import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Eye,
  FileKey2,
  HeartPulse,
  Hospital,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  MoveRight,
  Pill,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent } from '@/src/components/ui/card';
import { SiteFooter } from '@/src/components/site-footer';
import { SiteHeader } from '@/src/components/site-header';
import { InstallApp } from '@/src/features/pwa/install-app';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale = localeParam;
  const dictionary = getDictionary(locale);
  const landing = dictionary.landing;

  const assurances = [landing.hero.privacy, landing.hero.providerClarity, landing.hero.journeySupport];
  const whyCards = [
    { icon: Eye, title: landing.why.cards.clarityTitle, description: landing.why.cards.clarityDescription },
    { icon: Compass, title: landing.why.cards.coordinationTitle, description: landing.why.cards.coordinationDescription },
    { icon: ShieldCheck, title: landing.why.cards.securityTitle, description: landing.why.cards.securityDescription },
  ];
  const journeySteps = [
    { icon: Search, title: landing.journey.steps.discoverTitle, description: landing.journey.steps.discoverDescription },
    { icon: UserRoundCheck, title: landing.journey.steps.connectTitle, description: landing.journey.steps.connectDescription },
    { icon: CalendarCheck2, title: landing.journey.steps.coordinateTitle, description: landing.journey.steps.coordinateDescription },
    { icon: HeartPulse, title: landing.journey.steps.continueTitle, description: landing.journey.steps.continueDescription },
  ];
  const specialties = [
    { icon: HeartPulse, title: landing.specialties.items.cardiology },
    { icon: ClipboardCheck, title: landing.specialties.items.orthopedics },
    { icon: ShieldCheck, title: landing.specialties.items.oncology },
    { icon: Sparkles, title: landing.specialties.items.dentistry },
    { icon: UserRoundCheck, title: landing.specialties.items.fertility },
    { icon: Eye, title: landing.specialties.items.ophthalmology },
  ];
  const howSteps = [
    { icon: LockKeyhole, title: landing.howItWorks.steps.accountTitle, description: landing.howItWorks.steps.accountDescription },
    { icon: Search, title: landing.howItWorks.steps.exploreTitle, description: landing.howItWorks.steps.exploreDescription },
    { icon: Plane, title: landing.howItWorks.steps.prepareTitle, description: landing.howItWorks.steps.prepareDescription },
  ];
  const providers = [
    { icon: Hospital, label: landing.providers.hospitalLabel },
    { icon: Stethoscope, label: landing.providers.doctorLabel },
    { icon: Pill, label: landing.providers.pharmacyLabel },
  ];
  const trustItems = [
    { icon: FileKey2, title: landing.trust.accessTitle, description: landing.trust.accessDescription },
    { icon: LockKeyhole, title: landing.trust.privacyTitle, description: landing.trust.privacyDescription },
    { icon: MessageSquareText, title: landing.trust.auditTitle, description: landing.trust.auditDescription },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader dictionary={dictionary} locale={locale} />
      <main id="main-content">
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#fff_100%)]">
          <div aria-hidden="true" className="absolute start-1/2 top-20 size-[38rem] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12 lg:pb-28 lg:pt-24">
            <div className="relative z-10 max-w-3xl">
              <Badge className="px-4 py-2 uppercase tracking-[0.13em]" variant="blue">{landing.hero.eyebrow}</Badge>
              <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.06] tracking-[-0.05em] sm:text-6xl lg:text-7xl">{landing.hero.title}</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">{landing.hero.description}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700" href="#find-care">
                  {landing.hero.primaryAction}<ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
                </a>
                <a className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200" href="#how-it-works">{landing.hero.secondaryAction}</a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                {assurances.map((item) => <span className="flex items-center gap-2" key={item}><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-500" />{item}</span>)}
              </div>
            </div>

            <div className="relative" id="find-care">
              <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-blue-200/35 blur-3xl" />
              <Card className="relative overflow-hidden rounded-[2rem] border-white/80 shadow-[0_35px_100px_-45px_rgba(30,64,175,.45)]">
                <CardContent className="p-5 sm:p-8">
                  <div className="mb-7 flex items-center justify-between gap-4">
                    <div><p className="text-sm font-semibold text-blue-700">{landing.search.eyebrow}</p><p className="mt-1 text-sm text-slate-500">{landing.search.helper}</p></div>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Sparkles aria-hidden="true" className="size-5" /></span>
                  </div>
                  <div className="space-y-4">
                    <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{landing.search.treatmentLabel}</span><span className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400"><Stethoscope aria-hidden="true" className="size-5 text-blue-600" />{landing.search.treatmentPlaceholder}</span></label>
                    <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{landing.search.destinationLabel}</span><span className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400"><MapPin aria-hidden="true" className="size-5 text-blue-600" />{landing.search.destinationPlaceholder}</span></label>
                    <button className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700" type="button"><Search aria-hidden="true" className="size-4" />{landing.search.action}</button>
                  </div>
                  <div className="mt-7 rounded-2xl bg-blue-50 p-5"><p className="font-semibold text-slate-900">{landing.search.assuranceTitle}</p><p className="mt-2 text-sm leading-6 text-slate-600">{landing.search.assuranceDescription}</p></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-3xl"><p className="section-eyebrow">{landing.why.eyebrow}</p><h2 className="section-title">{landing.why.title}</h2><p className="section-description">{landing.why.description}</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {whyCards.map(({ icon: Icon, title, description }) => <Card className="group p-2 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl" key={title}><CardContent><span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white"><Icon aria-hidden="true" className="size-6" /></span><h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></CardContent></Card>)}
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white lg:py-28" id="journey">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="max-w-3xl"><p className="section-eyebrow text-blue-300">{landing.journey.eyebrow}</p><h2 className="section-title text-white">{landing.journey.title}</h2></div>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
              {journeySteps.map(({ icon: Icon, title, description }, index) => <li className="bg-slate-950 p-7" key={title}><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><Icon aria-hidden="true" className="size-5" /></span><span className="text-sm font-semibold text-slate-500">0{index + 1}</span></div><h3 className="mt-7 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28" id="specialties">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between"><div className="max-w-3xl"><p className="section-eyebrow">{landing.specialties.eyebrow}</p><h2 className="section-title">{landing.specialties.title}</h2><p className="section-description">{landing.specialties.description}</p></div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700" href={`/${locale}/signup`}>{dictionary.common.learnMore}<MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" /></Link></div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {specialties.map(({ icon: Icon, title }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40" key={title}><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon aria-hidden="true" className="size-5" /></span><p className="mt-4 text-sm font-semibold">{title}</p></div>)}
          </div>
        </section>

        <section className="bg-blue-50/70 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
              <div><p className="section-eyebrow">{landing.providers.eyebrow}</p><h2 className="section-title">{landing.providers.title}</h2><p className="section-description">{landing.providers.description}</p><Badge className="mt-7" variant="green"><BadgeCheck aria-hidden="true" className="me-1.5 size-4" />{landing.providers.profileStatus}</Badge></div>
              <div className="grid gap-4 sm:grid-cols-3">
                {providers.map(({ icon: Icon, label }) => <Card className="min-h-52" key={label}><CardContent><span className="grid size-12 place-items-center rounded-2xl bg-blue-600 text-white"><Icon aria-hidden="true" className="size-6" /></span><p className="mt-8 font-semibold leading-6">{label}</p><div className="mt-5 space-y-2"><span className="block h-2 w-full rounded-full bg-slate-100" /><span className="block h-2 w-3/4 rounded-full bg-slate-100" /></div></CardContent></Card>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28" id="how-it-works">
          <div className="max-w-3xl"><p className="section-eyebrow">{landing.howItWorks.eyebrow}</p><h2 className="section-title">{landing.howItWorks.title}</h2></div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">{howSteps.map(({ icon: Icon, title, description }, index) => <div className="relative rounded-3xl border border-slate-200 p-7" key={title}><span className="absolute end-6 top-6 text-5xl font-semibold tracking-tighter text-slate-100">{index + 1}</span><span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon aria-hidden="true" className="size-6" /></span><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></div>)}</div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28" id="trust">
          <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_55%,#ecfeff_100%)] p-6 sm:p-10 lg:p-14">
            <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="section-eyebrow">{landing.trust.eyebrow}</p><h2 className="section-title">{landing.trust.title}</h2><p className="section-description">{landing.trust.description}</p></div><div className="grid gap-4">{trustItems.map(({ icon: Icon, title, description }) => <div className="flex gap-4 rounded-2xl bg-white/80 p-5 shadow-sm" key={title}><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><Icon aria-hidden="true" className="size-5" /></span><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div></div>)}</div></div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-blue-600 px-6 py-12 text-center text-white shadow-2xl shadow-blue-600/20 sm:px-10 lg:py-16"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">{landing.cta.eyebrow}</p><h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{landing.cta.title}</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-blue-100">{landing.cta.description}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-blue-700" href={`/${locale}/signup`}>{landing.cta.primaryAction}</Link><Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-semibold text-white" href={`/${locale}/login`}>{landing.cta.secondaryAction}</Link></div><div className="mt-7 flex justify-center"><InstallApp closeLabel={dictionary.common.close} copy={dictionary.install} /></div></div>
        </section>
      </main>
      <SiteFooter dictionary={dictionary} locale={locale} />
    </div>
  );
}
