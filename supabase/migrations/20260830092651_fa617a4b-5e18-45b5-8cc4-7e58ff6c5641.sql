REVOKE ALL ON FUNCTION public.accrue_doctor_commission(text, uuid, bigint, timestamptz, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_accrue_commission_payments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_accrue_commission_billing_tx() FROM PUBLIC, anon, authenticated;