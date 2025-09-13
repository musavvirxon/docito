-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin', 'staff');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'canceled', 'no_show');
CREATE TYPE treatment_plan_status AS ENUM ('draft', 'published', 'in_progress', 'completed');
CREATE TYPE procedure_category AS ENUM ('general', 'preventive', 'restorative', 'cosmetic', 'orthodontic', 'oral_surgery', 'endodontic', 'periodontic');
CREATE TYPE procedure_type AS ENUM ('single_visit', 'multi_visit', 'tooth_based', 'full_mouth');
CREATE TYPE record_type AS ENUM ('note', 'diagnosis', 'condition', 'examination', 'treatment');
CREATE TYPE consent_status AS ENUM ('pending', 'signed', 'declined');

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'patient',
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    date_of_birth DATE,
    gender gender_type,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practices table
CREATE TABLE public.practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'United States',
    logo_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors table
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    specialty VARCHAR(255) NOT NULL,
    practice_id UUID REFERENCES public.practices(id),
    consultation_fee DECIMAL(10,2),
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    accepts_new_patients BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Procedures table
CREATE TABLE public.procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dentist_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category procedure_category DEFAULT 'general',
    type procedure_type DEFAULT 'single_visit',
    default_cost DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 30,
    notes TEXT,
    tooth_range INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatment plans table
CREATE TABLE public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id),
    patient_id UUID REFERENCES auth.users(id),
    title VARCHAR(255) NOT NULL,
    status treatment_plan_status DEFAULT 'draft',
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Treatment plan procedures junction table
CREATE TABLE public.treatment_plan_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
    procedure_id UUID REFERENCES public.procedures(id),
    cost DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    tooth_numbers INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical records table
CREATE TABLE public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    record_type record_type DEFAULT 'note',
    description TEXT,
    record_date DATE DEFAULT CURRENT_DATE,
    doctor_name VARCHAR(255),
    doctor_phone VARCHAR(20),
    doctor_email VARCHAR(255),
    practice_name VARCHAR(255),
    added_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent forms table
CREATE TABLE public.consent_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_plan_id UUID REFERENCES public.treatment_plans(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    patient_full_name VARCHAR(255),
    patient_signature TEXT, -- Base64 encoded signature
    ip_address INET,
    signed_at TIMESTAMP WITH TIME ZONE,
    status consent_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES auth.users(id),
    doctor_id UUID REFERENCES public.doctors(id),
    practice_id UUID REFERENCES public.practices(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for doctors
CREATE POLICY "Anyone can view doctors" ON public.doctors
    FOR SELECT USING (true);

CREATE POLICY "Doctors can update own profile" ON public.doctors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert doctor profile" ON public.doctors
    FOR INSERT WITH CHECK (true);

-- RLS Policies for procedures
CREATE POLICY "Anyone can view procedures" ON public.procedures
    FOR SELECT USING (true);

CREATE POLICY "Doctors can manage own procedures" ON public.procedures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.doctors 
            WHERE doctors.id = procedures.dentist_id 
            AND doctors.user_id = auth.uid()
        )
    );

-- RLS Policies for treatment plans
CREATE POLICY "Users can view own treatment plans" ON public.treatment_plans
    FOR SELECT USING (
        auth.uid() = patient_id OR 
        EXISTS (
            SELECT 1 FROM public.doctors 
            WHERE doctors.id = treatment_plans.doctor_id 
            AND doctors.user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can manage treatment plans" ON public.treatment_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.doctors 
            WHERE doctors.id = treatment_plans.doctor_id 
            AND doctors.user_id = auth.uid()
        )
    );

-- RLS Policies for treatment plan procedures
CREATE POLICY "Users can view treatment plan procedures" ON public.treatment_plan_procedures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.treatment_plans tp
            WHERE tp.id = treatment_plan_procedures.treatment_plan_id
            AND (
                tp.patient_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.doctors d
                    WHERE d.id = tp.doctor_id AND d.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Doctors can manage treatment plan procedures" ON public.treatment_plan_procedures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.treatment_plans tp
            JOIN public.doctors d ON d.id = tp.doctor_id
            WHERE tp.id = treatment_plan_procedures.treatment_plan_id
            AND d.user_id = auth.uid()
        )
    );

-- RLS Policies for medical records
CREATE POLICY "Patients can view own medical records" ON public.medical_records
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can manage own medical records" ON public.medical_records
    FOR ALL USING (auth.uid() = patient_id OR auth.uid() = added_by);

-- RLS Policies for consent forms
CREATE POLICY "Users can view related consent forms" ON public.consent_forms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.treatment_plans tp
            WHERE tp.id = consent_forms.treatment_plan_id
            AND (
                tp.patient_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.doctors d
                    WHERE d.id = tp.doctor_id AND d.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Anyone can insert consent forms" ON public.consent_forms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update consent forms" ON public.consent_forms
    FOR UPDATE USING (true);

-- RLS Policies for appointments
CREATE POLICY "Users can view own appointments" ON public.appointments
    FOR SELECT USING (
        auth.uid() = patient_id OR 
        EXISTS (
            SELECT 1 FROM public.doctors 
            WHERE doctors.id = appointments.doctor_id 
            AND doctors.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for practices
CREATE POLICY "Anyone can view practices" ON public.practices
    FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX idx_procedures_dentist_id ON public.procedures(dentist_id);
CREATE INDEX idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_doctor_id ON public.treatment_plans(doctor_id);
CREATE INDEX idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON public.appointments(doctor_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procedures_updated_at
    BEFORE UPDATE ON public.procedures
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at
    BEFORE UPDATE ON public.treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();