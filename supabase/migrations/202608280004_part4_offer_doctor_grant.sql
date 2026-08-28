begin;

-- The offer protection trigger executes in the caller's role and needs this narrow boolean predicate.
grant execute on function public.is_doctor_assigned_to_case(uuid, uuid) to authenticated;

commit;
