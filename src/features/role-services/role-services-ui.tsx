import Link from '@/src/react-app/compat/link';
import {CalendarDays,Coins,WalletCards} from 'lucide-react';
import {Badge} from '@/src/components/ui/badge';
import {Card,CardContent} from '@/src/components/ui/card';
import {EmptyState} from '@/src/components/ui/empty-state';
import {PageHeader} from '@/src/components/ui/page-header';
import {StatCard} from '@/src/components/ui/stat-card';
import type {Locale} from '@/src/i18n/config';
import type {AssignedJourneyService} from './data';
import {getRoleServicesDictionary,type RoleServicesDictionary} from './messages';

const date=(locale:Locale,value:string|null,timezone?:string|null)=>value?new Intl.DateTimeFormat(locale,{dateStyle:'medium',...(value.includes('T')?{timeStyle:'short' as const,timeZone:timezone??undefined}:{})}).format(new Date(value.includes('T')?value:`${value}T00:00:00`)):'—';
const money=(locale:Locale,value:number,currency:string)=>new Intl.NumberFormat(locale,{style:'currency',currency}).format(value);
const typeLabel=(value:string)=>value.replaceAll('_',' ');

function ServiceCards({rows,locale,portal,copy,financial}:{rows:AssignedJourneyService[];locale:Locale;portal:'doctor'|'provider';copy:RoleServicesDictionary;financial:boolean}){
  if(!rows.length)return <EmptyState description={copy.servicesDescription} title={copy.empty}/>;
  return <div className="grid gap-4">{rows.map(row=>{const agreed=Number(row.agreed_amount??0),settled=Number(row.settled_amount??0);return <Card key={row.service_id}><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="blue">{typeLabel(row.service_type)}</Badge><Badge variant={row.service_status==='COMPLETED'?'green':row.service_status==='CANCELLED'?'slate':'blue'}>{typeLabel(row.service_status)}</Badge></div><h2 className="mt-3 text-lg font-semibold">{row.service_title}</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-slate-500">{copy.patient}</dt><dd className="font-medium">{row.patient_name}</dd></div><div><dt className="text-slate-500">{copy.journey}</dt><dd className="font-mono font-semibold">{row.booking_reference}</dd></div><div><dt className="text-slate-500">{copy.appointment}</dt><dd>{date(locale,row.appointment_at??row.planned_date,row.appointment_timezone)}</dd></div><div><dt className="text-slate-500">{copy.status}</dt><dd>{typeLabel(row.appointment_status??row.journey_status)}</dd></div></dl></div>{row.currency&&row.agreed_amount!=null?<div className="shrink-0 rounded-2xl bg-slate-50 p-4 lg:min-w-56"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.amount}</p><p className="mt-1 text-2xl font-bold text-slate-950">{money(locale,agreed,row.currency)}</p>{financial?<><p className="mt-3 text-sm text-emerald-700">{copy.settled}: {money(locale,settled,row.currency)}</p><p className="mt-1 text-sm text-amber-700">{copy.outstanding}: {money(locale,Math.max(0,agreed-settled),row.currency)}</p><Badge className="mt-3" variant={row.settlement_status==='SETTLED'?'green':'blue'}>{typeLabel(row.settlement_status??'PENDING')}</Badge></>:null}</div>:null}</div><div className="mt-5 flex flex-wrap gap-3"><Link className="inline-flex min-h-10 items-center rounded-xl border px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={`/${locale}/${portal}/bookings/${row.booking_id}`}>{copy.openJourney}</Link>{row.appointment_id?<Link className="inline-flex min-h-10 items-center rounded-xl border px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={`/${locale}/${portal}/appointments/${row.appointment_id}`}>{copy.openAppointment}</Link>:null}</div></CardContent></Card>})}</div>;
}

export function RoleServicesPage({rows,locale,portal,account=false}:{rows:AssignedJourneyService[];locale:Locale;portal:'doctor'|'provider';account?:boolean}){
 const copy=getRoleServicesDictionary(locale);
 const title=account?(portal==='doctor'?copy.account:copy.providerAccount):copy.services;
 const currencies=[...new Set(rows.flatMap(r=>r.currency?[r.currency]:[]))];
 const totals=currencies.map(currency=>{const scoped=rows.filter(r=>r.currency===currency);return{currency,agreed:scoped.reduce((n,r)=>n+Number(r.agreed_amount??0),0),settled:scoped.reduce((n,r)=>n+Number(r.settled_amount??0),0)}});
 return <div className="mx-auto max-w-7xl"><PageHeader description={account?copy.accountDescription:copy.servicesDescription} eyebrow={portal==='doctor'?copy.account:copy.providerAccount} title={title}/>{account?<div className="my-8 grid gap-4 md:grid-cols-3">{totals.flatMap(t=>[<StatCard key={`${t.currency}-a`} hint={t.currency} icon={Coins} title={copy.total} value={money(locale,t.agreed,t.currency)}/>,<StatCard key={`${t.currency}-p`} hint={t.currency} icon={WalletCards} title={copy.paid} tone="emerald" value={money(locale,t.settled,t.currency)}/>,<StatCard key={`${t.currency}-o`} hint={t.currency} icon={CalendarDays} title={copy.pending} tone="amber" value={money(locale,Math.max(0,t.agreed-t.settled),t.currency)}/>])}</div>:<div className="h-8"/>}<ServiceCards copy={copy} financial={account} locale={locale} portal={portal} rows={rows}/></div>;
}
