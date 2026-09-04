import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prescriptionSchema } from '@/src/features/clinical/validation';

const migration = readFileSync('supabase/migrations/202609070001_smart_journey_reminders.sql','utf8');
const fix = readFileSync('supabase/migrations/202609070002_reminder_idempotency_fix.sql','utf8');
const notifications = readFileSync('src/features/notifications/notification-copy.ts','utf8');
const patientData = readFileSync('src/features/patient-journey/data.ts','utf8');

describe('Treatment Journey smart reminders',()=>{
  it('uses the required appointment lead times and rejects late reminders',()=>{
    expect(migration).toContain("lead_time:=interval '48 hours'");
    expect(migration.match(/lead_time:=interval '5 hours'/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("reminder_time<=timezone('utc',now())");
  });
  it('reschedules idempotently and cancels stale schedules',()=>{
    expect(fix).toContain("perform public.cancel_pending_reminders('appointment',new.id)");
    expect(fix).toContain('on conflict(idempotency_key) do update');
    expect(fix).toContain("where public.journey_reminders.status='CANCELLED'");
    expect(fix).toContain("status='PENDING' and occurrence_at<=target_now");
  });
  it('creates medication doses from Doctor-authored structured schedules',()=>{
    expect(migration).toContain("due:=occurrence-interval '15 minutes'");
    expect(migration).toContain("rx.status<>'ISSUED'");
    expect(migration).toContain("at time zone item.schedule_timezone");
    const valid={booking_id:'11111111-1111-4111-8111-111111111111',medication_name:'Example',dosage:'One tablet',frequency:'Twice daily',start_date:'2026-09-08',end_date:'2026-09-12',dose_times:'08:00, 20:00'};
    expect(prescriptionSchema.safeParse(valid).success).toBe(true);
    expect(prescriptionSchema.safeParse({...valid,dose_times:'25:00'}).success).toBe(false);
    expect(prescriptionSchema.safeParse({...valid,end_date:'2026-09-01'}).success).toBe(false);
  });
  it('keeps future delivery channels separate while enabling only in-app delivery',()=>{
    for(const channel of ['IN_APP','EMAIL','WHATSAPP','SMS','PUSH'])expect(migration).toContain(`'${channel}'`);
    expect(migration).toContain("values(r.id,'IN_APP','DELIVERED',target_now)");
    expect(migration).toContain("cron.schedule('carebridge-smart-reminders'");
  });
  it('protects reminder rows with Patient-only RLS',()=>{
    expect(migration).toContain('alter table public.journey_reminders enable row level security');
    expect(migration).toContain('using(patient_id=auth.uid())');
    expect(migration).not.toContain('grant insert on public.journey_reminders to authenticated');
  });
  it('links in-app reminders to authorized Patient records',()=>{
    expect(notifications).toContain("record.type==='reminder.medication_dose'");
    expect(notifications).toContain("record.related_entity_type==='appointment'");
    expect(patientData).toContain(".from('journey_reminders')");
    expect(patientData).toContain(".eq('status','PENDING')");
  });
});
