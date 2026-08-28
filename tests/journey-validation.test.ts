import { describe, expect, it } from 'vitest';
import { bookingUpdateSchema, offerDecisionSchema, offerSchema } from '@/src/features/journey/validation';

const offer = { case_id:'3b241101-e2bb-4255-8caf-4136c566a962',treatment_id:'3b241101-e2bb-4255-8caf-4136c566a963',recommendation_id:'',doctor_id:'',provider_type:'HOSPITAL',hospital_id:'3b241101-e2bb-4255-8caf-4136c566a964',pharmacy_id:'',radiology_center_id:'',medical_laboratory_id:'',title:'Coordinated knee care',description:'A structured fictional care proposal.',estimated_cost:'12000',currency:'usd',estimated_stay_days:'10',proposed_start_date:'2026-10-01',proposed_end_date:'2026-10-12',included_services:'Consultation',excluded_services:'Flights',provider_notes:'',valid_until:'2026-09-30T12:00'};

describe('Part 4 journey validation',()=>{
  it('normalizes valid draft offer input',()=>{const result=offerSchema.safeParse(offer);expect(result.success).toBe(true);if(result.success)expect(result.data.currency).toBe('USD');});
  it('rejects invalid currency and negative costs',()=>{expect(offerSchema.safeParse({...offer,currency:'US',estimated_cost:'-1'}).success).toBe(false);});
  it('limits patient decisions to accept or reject',()=>{expect(offerDecisionSchema.safeParse({offer_id:offer.case_id,decision:'ACCEPTED',decision_note:''}).success).toBe(true);expect(offerDecisionSchema.safeParse({offer_id:offer.case_id,decision:'WITHDRAWN',decision_note:''}).success).toBe(false);});
  it('accepts only defined booking lifecycle states',()=>{expect(bookingUpdateSchema.safeParse({booking_id:offer.case_id,status:'CONFIRMED',planned_arrival:'',planned_care_date:'',estimated_completion:'',provider_notes:''}).success).toBe(true);expect(bookingUpdateSchema.safeParse({booking_id:offer.case_id,status:'PAID',provider_notes:''}).success).toBe(false);});
});
