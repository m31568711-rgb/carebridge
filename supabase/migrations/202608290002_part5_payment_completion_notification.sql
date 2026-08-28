begin;

create or replace function public.recalculate_invoice(target_invoice_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare item_total numeric(14,2); paid_total numeric(14,2); previous_status public.invoice_status; next_status public.invoice_status; target_patient uuid;
begin
  select coalesce(sum(line_amount),0) into item_total from public.invoice_items where invoice_id=target_invoice_id;
  select coalesce(sum(amount),0) into paid_total from public.payment_records where invoice_id=target_invoice_id;
  select status,patient_id into previous_status,target_patient from public.invoices where id=target_invoice_id;
  next_status:=case when previous_status in ('CANCELLED','REFUNDED','DRAFT') then previous_status when item_total>0 and paid_total>=item_total then 'PAID'::public.invoice_status when paid_total>0 then 'PARTIALLY_PAID'::public.invoice_status else previous_status end;
  update public.invoices set subtotal=item_total,total_amount=item_total,amount_paid=least(paid_total,item_total),status=next_status where id=target_invoice_id;
  if next_status='PAID' and previous_status is distinct from 'PAID' then
    insert into public.notifications(recipient_id,type,title_key,message_key,related_entity_type,related_entity_id)
    values(target_patient,'payment.completed','part5.notifications.paymentcompletedTitle','part5.notifications.paymentcompletedMessage','invoice',target_invoice_id);
  end if;
end; $$;

commit;
