-- Fix foreign key relationships and constraints

-- Add foreign key constraints to doctors table
ALTER TABLE public.doctors 
ADD CONSTRAINT doctors_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.doctors 
ADD CONSTRAINT doctors_practice_id_fkey 
FOREIGN KEY (practice_id) REFERENCES public.practices(id) ON DELETE SET NULL;

-- Add foreign key constraints to appointments table  
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_practice_id_fkey 
FOREIGN KEY (practice_id) REFERENCES public.practices(id) ON DELETE SET NULL;

-- Add foreign key constraints to treatment_plans table
ALTER TABLE public.treatment_plans 
ADD CONSTRAINT treatment_plans_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plans 
ADD CONSTRAINT treatment_plans_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints to medications table
ALTER TABLE public.medications 
ADD CONSTRAINT medications_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.medications 
ADD CONSTRAINT medications_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;

ALTER TABLE public.medications 
ADD CONSTRAINT medications_treatment_plan_id_fkey 
FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;

-- Add foreign key constraints to medical_records table
ALTER TABLE public.medical_records 
ADD CONSTRAINT medical_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.medical_records 
ADD CONSTRAINT medical_records_added_by_fkey 
FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add foreign key constraints to procedures table
ALTER TABLE public.procedures 
ADD CONSTRAINT procedures_dentist_id_fkey 
FOREIGN KEY (dentist_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints to treatment_plan_procedures table
ALTER TABLE public.treatment_plan_procedures 
ADD CONSTRAINT treatment_plan_procedures_treatment_plan_id_fkey 
FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plan_procedures 
ADD CONSTRAINT treatment_plan_procedures_procedure_id_fkey 
FOREIGN KEY (procedure_id) REFERENCES public.procedures(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plan_procedures 
ADD CONSTRAINT treatment_plan_procedures_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

ALTER TABLE public.treatment_plan_procedures 
ADD CONSTRAINT treatment_plan_procedures_consent_form_id_fkey 
FOREIGN KEY (consent_form_id) REFERENCES public.consent_forms(id) ON DELETE SET NULL;

-- Add foreign key constraints to consent_forms table
ALTER TABLE public.consent_forms 
ADD CONSTRAINT consent_forms_treatment_plan_id_fkey 
FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;

-- Add foreign key constraints to referrals table
ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referring_doctor_id_fkey 
FOREIGN KEY (referring_doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referred_doctor_id_fkey 
FOREIGN KEY (referred_doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;

ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_treatment_plan_id_fkey 
FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE SET NULL;

-- Add foreign key constraints to procedure_materials table
ALTER TABLE public.procedure_materials 
ADD CONSTRAINT procedure_materials_procedure_id_fkey 
FOREIGN KEY (procedure_id) REFERENCES public.procedures(id) ON DELETE CASCADE;

-- Add foreign key constraints to procedure_files table
ALTER TABLE public.procedure_files 
ADD CONSTRAINT procedure_files_procedure_id_fkey 
FOREIGN KEY (procedure_id) REFERENCES public.procedures(id) ON DELETE CASCADE;

ALTER TABLE public.procedure_files 
ADD CONSTRAINT procedure_files_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add foreign key constraints to medication_reminders table
ALTER TABLE public.medication_reminders 
ADD CONSTRAINT medication_reminders_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.medication_reminders 
ADD CONSTRAINT medication_reminders_medication_id_fkey 
FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;

-- Add foreign key constraints to real_time_notifications table
ALTER TABLE public.real_time_notifications 
ADD CONSTRAINT real_time_notifications_sender_user_id_fkey 
FOREIGN KEY (sender_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.real_time_notifications 
ADD CONSTRAINT real_time_notifications_recipient_user_id_fkey 
FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraints to treatment_plan_templates table
ALTER TABLE public.treatment_plan_templates 
ADD CONSTRAINT treatment_plan_templates_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;