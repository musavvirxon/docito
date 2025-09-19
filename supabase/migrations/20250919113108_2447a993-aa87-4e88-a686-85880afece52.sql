-- Fix foreign key relationships that are missing

-- Add foreign key constraint for doctors.user_id -> profiles.user_id
ALTER TABLE doctors 
ADD CONSTRAINT doctors_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint for appointments.patient_id -> profiles.user_id  
ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint for appointments.doctor_id -> doctors.id
ALTER TABLE appointments
ADD CONSTRAINT appointments_doctor_id_fkey  
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraint for appointments.practice_id -> practices.id
ALTER TABLE appointments
ADD CONSTRAINT appointments_practice_id_fkey
FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE SET NULL;

-- Add foreign key constraint for doctors.practice_id -> practices.id
ALTER TABLE doctors
ADD CONSTRAINT doctors_practice_id_fkey
FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE SET NULL;

-- Add foreign key constraints for treatment_plans
ALTER TABLE treatment_plans
ADD CONSTRAINT treatment_plans_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE treatment_plans  
ADD CONSTRAINT treatment_plans_doctor_id_fkey
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints for procedures
ALTER TABLE procedures
ADD CONSTRAINT procedures_dentist_id_fkey
FOREIGN KEY (dentist_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints for medical_records
ALTER TABLE medical_records
ADD CONSTRAINT medical_records_patient_id_fkey  
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE medical_records
ADD CONSTRAINT medical_records_added_by_fkey
FOREIGN KEY (added_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Add foreign key constraints for medications
ALTER TABLE medications
ADD CONSTRAINT medications_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE medications
ADD CONSTRAINT medications_doctor_id_fkey  
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

ALTER TABLE medications
ADD CONSTRAINT medications_treatment_plan_id_fkey
FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE;

-- Add foreign key constraints for medication_reminders
ALTER TABLE medication_reminders
ADD CONSTRAINT medication_reminders_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE medication_reminders  
ADD CONSTRAINT medication_reminders_medication_id_fkey
FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE;

-- Add foreign key constraints for treatment_plan_procedures
ALTER TABLE treatment_plan_procedures
ADD CONSTRAINT treatment_plan_procedures_treatment_plan_id_fkey
FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE;

ALTER TABLE treatment_plan_procedures
ADD CONSTRAINT treatment_plan_procedures_procedure_id_fkey  
FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE;

ALTER TABLE treatment_plan_procedures
ADD CONSTRAINT treatment_plan_procedures_appointment_id_fkey
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

ALTER TABLE treatment_plan_procedures
ADD CONSTRAINT treatment_plan_procedures_consent_form_id_fkey
FOREIGN KEY (consent_form_id) REFERENCES consent_forms(id) ON DELETE SET NULL;

-- Add foreign key constraints for procedure_materials
ALTER TABLE procedure_materials
ADD CONSTRAINT procedure_materials_procedure_id_fkey
FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE;

-- Add foreign key constraints for procedure_files  
ALTER TABLE procedure_files
ADD CONSTRAINT procedure_files_procedure_id_fkey
FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE;

ALTER TABLE procedure_files
ADD CONSTRAINT procedure_files_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Add foreign key constraints for consent_forms
ALTER TABLE consent_forms
ADD CONSTRAINT consent_forms_treatment_plan_id_fkey
FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE;

-- Add foreign key constraints for appointment_procedures
ALTER TABLE appointment_procedures
ADD CONSTRAINT appointment_procedures_appointment_id_fkey
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE appointment_procedures  
ADD CONSTRAINT appointment_procedures_procedure_id_fkey
FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE;

ALTER TABLE appointment_procedures
ADD CONSTRAINT appointment_procedures_prescribed_by_fkey
FOREIGN KEY (prescribed_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Add foreign key constraints for referrals
ALTER TABLE referrals
ADD CONSTRAINT referrals_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE referrals
ADD CONSTRAINT referrals_referring_doctor_id_fkey  
FOREIGN KEY (referring_doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

ALTER TABLE referrals
ADD CONSTRAINT referrals_referred_doctor_id_fkey
FOREIGN KEY (referred_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

ALTER TABLE referrals
ADD CONSTRAINT referrals_treatment_plan_id_fkey
FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE SET NULL;

-- Add foreign key constraints for treatment_plan_templates
ALTER TABLE treatment_plan_templates
ADD CONSTRAINT treatment_plan_templates_doctor_id_fkey
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints for real_time_notifications  
ALTER TABLE real_time_notifications
ADD CONSTRAINT real_time_notifications_recipient_user_id_fkey
FOREIGN KEY (recipient_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE real_time_notifications
ADD CONSTRAINT real_time_notifications_sender_user_id_fkey
FOREIGN KEY (sender_user_id) REFERENCES profiles(user_id) ON DELETE SET NULL;