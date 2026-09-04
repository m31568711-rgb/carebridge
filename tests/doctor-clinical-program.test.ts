import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const clinicalMigration = readFileSync('supabase/migrations/202609060001_doctor_clinical_program.sql', 'utf8');
const bookingAccessMigration = readFileSync('supabase/migrations/202609060002_doctor_journey_access_fix.sql', 'utf8');
const procedureScopeMigration = readFileSync('supabase/migrations/202609060003_procedure_service_scope_fix.sql', 'utf8');
const clinicalWorkflowMigration = readFileSync('supabase/migrations/202608300001_operational_clinical_workflow.sql', 'utf8');
const clinicalActions = readFileSync('src/features/clinical/actions.ts', 'utf8');
const doctorActions = readFileSync('src/features/doctor-program/actions.ts', 'utf8');
const doctorUi = readFileSync('src/features/doctor-program/doctor-program-ui.tsx', 'utf8');
const patientUi = readFileSync('src/features/patient-journey/patient-journey-ui.tsx', 'utf8');

describe('Doctor Clinical Program Phase 3', () => {
  it('scopes clinical management to the assigned verified Doctor', () => {
    expect(clinicalMigration).toContain('select public.is_booking_doctor(target_booking)');
    expect(clinicalMigration).not.toContain("has_permission('clinical.support')");
    expect(bookingAccessMigration).toContain('public.is_booking_doctor(target_booking.id)');
    expect(clinicalActions).toContain("requireRoles(locale,['DOCTOR'])");
  });

  it('supports journey-service Doctor assignments and case-less Admin journeys', () => {
    expect(clinicalMigration).toContain("s.service_type='DOCTOR_CONSULTATION'");
    expect(clinicalMigration).toContain('alter column case_id drop not null');
    expect(clinicalMigration).toContain('b.case_id is null');
  });

  it('reuses recommendations, appointments, and journey services', () => {
    expect(clinicalMigration).toContain('doctor_recommend_journey_treatment');
    expect(clinicalMigration).toContain('doctor_save_journey_procedure');
    expect(clinicalMigration).toContain('insert into public.appointments');
    expect(clinicalMigration).toContain('insert into public.journey_services');
    expect(clinicalMigration).not.toContain('create table public.procedures');
    expect(procedureScopeMigration).toContain("service_type='HOSPITAL_PROCEDURE'");
  });

  it('preserves history while permitting safe draft deletion', () => {
    expect(clinicalMigration).toContain('protect_draft_clinical_delete');
    expect(clinicalMigration).toContain("old.status='DRAFT'");
    expect(clinicalMigration).toContain("old.status='ORDERED'");
    expect(clinicalMigration).toContain("old.status='PLANNED'");
    expect(clinicalMigration).toContain('final encounter history is immutable');
    expect(clinicalActions).toContain('deleteDraftClinicalAction');
    expect(clinicalActions).toContain('updateEncounterAction');
  });

  it('collects clinical planning in one Doctor workspace', () => {
    expect(doctorUi).toContain('recommendTreatmentAction');
    expect(doctorUi).toContain('saveProcedureAction');
    expect(doctorUi).toContain('current_medications');
    expect(doctorUi).toContain('allergies');
    expect(doctorActions).toContain('doctor_recommend_journey_treatment');
    expect(doctorActions).toContain('doctor_save_journey_procedure');
  });

  it('shows only released clinical information to the Patient', () => {
    expect(clinicalWorkflowMigration).toContain("status in('ISSUED','COMPLETED')");
    expect(patientUi).toContain('result?.released_at');
    expect(patientUi).toContain('service.treatment');
    expect(patientUi).not.toContain('clinical_notes');
  });

  it('creates linked notifications for clinical milestones', () => {
    const sources = `${clinicalMigration}\n${doctorActions}\n${clinicalWorkflowMigration}`;
    for (const type of ['treatment.recommended', 'procedure.scheduled', 'prescription.issued', 'lab.ordered', 'radiology.ordered', 'follow_up.scheduled']) {
      expect(sources).toContain(type);
    }
  });
});
