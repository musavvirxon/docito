-- Create missing RPC functions for admin dashboard

-- 1. get_practice_services: Returns services linked to a practice
CREATE OR REPLACE FUNCTION public.get_practice_services(p_practice_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  doctor_name text,
  price numeric,
  duration_minutes integer,
  category text
) AS $$
BEGIN
  -- Return services from procedures table linked to doctors in this practice
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COALESCE(pr.full_name, 'Practice Service') as doctor_name,
    p.cost as price,
    p.duration_minutes,
    p.category
  FROM procedures p
  LEFT JOIN doctors d ON d.id = p.doctor_id
  LEFT JOIN profiles pr ON pr.user_id = d.user_id
  WHERE d.practice_id = p_practice_id
     OR p.practice_id = p_practice_id
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 2. get_practice_staff: Returns staff members of a practice
CREATE OR REPLACE FUNCTION public.get_practice_staff(p_practice_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  department text,
  status text,
  hire_date date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.user_id,
    COALESCE(pr.full_name, 'Staff Member') as full_name,
    pr.email,
    cs.staff_role as role,
    cs.department,
    cs.status,
    cs.hire_date
  FROM clinic_staff cs
  LEFT JOIN profiles pr ON pr.user_id = cs.user_id
  WHERE cs.practice_id = p_practice_id
  ORDER BY cs.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 3. get_practice_appointments: Returns recent appointments for a practice
CREATE OR REPLACE FUNCTION public.get_practice_appointments(p_practice_id uuid, p_limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  patient_name text,
  doctor_name text,
  appointment_date date,
  start_time time,
  end_time time,
  status text,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    COALESCE(pat.full_name, 'Patient') as patient_name,
    COALESCE(doc.full_name, 'Doctor') as doctor_name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status::text,
    a.notes
  FROM appointments a
  LEFT JOIN profiles pat ON pat.user_id = a.patient_id
  LEFT JOIN doctors d ON d.id = a.doctor_id
  LEFT JOIN profiles doc ON doc.user_id = d.user_id
  WHERE a.practice_id = p_practice_id
  ORDER BY a.appointment_date DESC, a.start_time DESC
  LIMIT p_limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 4. get_practice_payments: Returns recent payments for a practice
CREATE OR REPLACE FUNCTION public.get_practice_payments(p_practice_id uuid, p_limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  patient_name text,
  amount numeric,
  status text,
  created_at timestamptz,
  description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bt.id,
    COALESCE(pr.full_name, 'Patient') as patient_name,
    bt.amount,
    bt.status,
    bt.created_at,
    bt.description
  FROM billing_transactions bt
  LEFT JOIN profiles pr ON pr.user_id = bt.user_id
  WHERE bt.practice_id = p_practice_id
  ORDER BY bt.created_at DESC
  LIMIT p_limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 5. get_practice_patients: Returns patients who have appointments at this practice
CREATE OR REPLACE FUNCTION public.get_practice_patients(p_practice_id uuid, p_limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  last_visit date,
  doctor_name text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (pat.user_id)
    pat.user_id as id,
    pat.full_name,
    pat.email,
    pat.phone,
    a.appointment_date as last_visit,
    COALESCE(doc.full_name, 'Doctor') as doctor_name,
    'active'::text as status
  FROM appointments a
  JOIN profiles pat ON pat.user_id = a.patient_id
  LEFT JOIN doctors d ON d.id = a.doctor_id
  LEFT JOIN profiles doc ON doc.user_id = d.user_id
  WHERE a.practice_id = p_practice_id
    AND a.status = 'completed'
  ORDER BY pat.user_id, a.appointment_date DESC
  LIMIT p_limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 6. get_practice_messages: Returns recent messages/conversations for a practice
CREATE OR REPLACE FUNCTION public.get_practice_messages(p_practice_id uuid, p_limit_count integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  sender_name text,
  message text,
  created_at timestamptz
) AS $$
BEGIN
  -- Return recent messages from conversations involving practice doctors
  RETURN QUERY
  SELECT 
    m.id,
    COALESCE(pr.full_name, 'User') as sender_name,
    LEFT(m.content, 100) as message,
    m.created_at
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  JOIN doctors d ON d.user_id = cp.user_id AND d.practice_id = p_practice_id
  LEFT JOIN profiles pr ON pr.user_id = m.sender_id
  ORDER BY m.created_at DESC
  LIMIT p_limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;