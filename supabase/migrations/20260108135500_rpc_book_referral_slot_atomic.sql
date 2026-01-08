begin;

create or replace function public.book_referral_slot_atomic(
  p_referral_id uuid,
  p_slot_id uuid,
  p_patient_id uuid,
  p_doctor_id uuid,
  p_appointment_date date,
  p_start_time text,
  p_end_time text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_locked boolean;
  v_appointment_id uuid;
begin
  -- Lock slot row and ensure it is not booked
  update public.referral_slots
  set is_booked = true
  where id = p_slot_id
    and referral_id = p_referral_id
    and coalesce(is_booked, false) = false
  returning true into v_locked;

  if not coalesce(v_locked, false) then
    raise exception 'Slot is already booked';
  end if;

  -- Create appointment
  v_appointment_id := gen_random_uuid();

  insert into public.appointments (
    id,
    patient_id,
    doctor_id,
    appointment_date,
    start_time,
    end_time,
    notes,
    status,
    created_at
  ) values (
    v_appointment_id,
    p_patient_id,
    p_doctor_id,
    p_appointment_date,
    p_start_time,
    p_end_time,
    p_notes,
    'scheduled',
    now()
  );

  return v_appointment_id;
end;
$$;

-- Allow authenticated users to call (RLS still applies to underlying tables)
grant execute on function public.book_referral_slot_atomic(uuid,uuid,uuid,uuid,date,text,text,text) to authenticated;

commit;
