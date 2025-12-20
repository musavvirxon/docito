-- Create entity audit logs table for tracking changes across all entity types
CREATE TABLE IF NOT EXISTS public.entity_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR NOT NULL, -- 'clinic', 'pharmacy', 'laboratory', 'imaging_center'
    entity_id UUID NOT NULL,
    action VARCHAR NOT NULL, -- 'create', 'update', 'delete', 'verify', 'suspend', 'status_change'
    actor_id UUID,
    actor_email VARCHAR,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_entity_audit_logs_entity ON public.entity_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_audit_logs_created_at ON public.entity_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_audit_logs_actor ON public.entity_audit_logs(actor_id);

-- Enable RLS
ALTER TABLE public.entity_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view audit logs
CREATE POLICY "Super admins can view all audit logs" ON public.entity_audit_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super_admin can insert audit logs (via functions)
CREATE POLICY "Super admins can insert audit logs" ON public.entity_audit_logs
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create helper function to log entity actions
CREATE OR REPLACE FUNCTION public.log_entity_action(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_action VARCHAR,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_actor_email VARCHAR;
BEGIN
    -- Get actor email
    SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
    
    INSERT INTO entity_audit_logs (
        entity_type, entity_id, action, actor_id, actor_email,
        old_values, new_values, metadata
    ) VALUES (
        p_entity_type, p_entity_id, p_action, auth.uid(), v_actor_email,
        p_old_values, p_new_values, p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Create imaging_centers table if not exists
CREATE TABLE IF NOT EXISTS public.imaging_centers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    admin_id UUID,
    license_number VARCHAR,
    address VARCHAR,
    city VARCHAR,
    country VARCHAR DEFAULT 'Uzbekistan',
    phone VARCHAR,
    email VARCHAR,
    website VARCHAR,
    operating_hours JSONB,
    modalities TEXT[], -- 'X-Ray', 'CT', 'MRI', 'Ultrasound', 'PET', 'Mammography'
    accreditations TEXT[],
    is_verified BOOLEAN DEFAULT false,
    status VARCHAR DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'inactive'
    accepts_insurance BOOLEAN DEFAULT true,
    average_rating NUMERIC(3,2) DEFAULT 0,
    num_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for imaging centers
CREATE INDEX IF NOT EXISTS idx_imaging_centers_status ON public.imaging_centers(status);
CREATE INDEX IF NOT EXISTS idx_imaging_centers_city ON public.imaging_centers(city);
CREATE INDEX IF NOT EXISTS idx_imaging_centers_admin ON public.imaging_centers(admin_id);

-- Enable RLS for imaging_centers
ALTER TABLE public.imaging_centers ENABLE ROW LEVEL SECURITY;

-- RLS policies for imaging_centers
CREATE POLICY "Public can view verified imaging centers" ON public.imaging_centers
    FOR SELECT USING (is_verified = true AND status = 'active');

CREATE POLICY "Admins can view their own imaging centers" ON public.imaging_centers
    FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Super admins can view all imaging centers" ON public.imaging_centers
    FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update imaging centers" ON public.imaging_centers
    FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update their own imaging centers" ON public.imaging_centers
    FOR UPDATE USING (admin_id = auth.uid());

CREATE POLICY "Authenticated users can create imaging centers" ON public.imaging_centers
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create imaging_staff table
CREATE TABLE IF NOT EXISTS public.imaging_staff (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    imaging_center_id UUID NOT NULL REFERENCES public.imaging_centers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    staff_role VARCHAR NOT NULL DEFAULT 'technician', -- 'owner', 'admin', 'manager', 'radiologist', 'technician', 'assistant', 'readonly'
    license_number VARCHAR,
    specializations TEXT[],
    can_view_orders BOOLEAN DEFAULT true,
    can_process_scans BOOLEAN DEFAULT false,
    can_upload_results BOOLEAN DEFAULT false,
    can_verify_results BOOLEAN DEFAULT false,
    can_manage_equipment BOOLEAN DEFAULT false,
    status VARCHAR DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    hired_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(imaging_center_id, user_id)
);

-- Enable RLS for imaging_staff
ALTER TABLE public.imaging_staff ENABLE ROW LEVEL SECURITY;

-- RLS policies for imaging_staff
CREATE POLICY "Staff can view their own record" ON public.imaging_staff
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Center admins can view staff" ON public.imaging_staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM imaging_centers ic 
            WHERE ic.id = imaging_center_id AND ic.admin_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all staff" ON public.imaging_staff
    FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all staff" ON public.imaging_staff
    FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Create updated_at trigger for imaging_centers
CREATE OR REPLACE FUNCTION public.update_imaging_center_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_imaging_centers_updated_at
    BEFORE UPDATE ON public.imaging_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_imaging_center_updated_at();

CREATE TRIGGER update_imaging_staff_updated_at
    BEFORE UPDATE ON public.imaging_staff
    FOR EACH ROW
    EXECUTE FUNCTION public.update_imaging_center_updated_at();