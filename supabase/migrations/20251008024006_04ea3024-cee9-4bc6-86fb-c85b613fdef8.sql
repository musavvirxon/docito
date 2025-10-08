-- ============================================
-- PERFORMANCE METRICS SYSTEM
-- ============================================

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  category VARCHAR(50),
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  badge_color VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  is_claimed BOOLEAN DEFAULT false,
  UNIQUE(doctor_id, achievement_id)
);

-- Create settings audit log
CREATE TABLE IF NOT EXISTS public.settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  setting_type VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active achievements"
ON achievements FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Doctors can view their achievements"
ON user_achievements FOR SELECT TO authenticated
USING (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own audit logs"
ON settings_audit_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Insert default achievements
INSERT INTO achievements (title, description, icon, category, requirement_type, requirement_value, badge_color) VALUES
('First Steps', 'Complete your first appointment', 'CheckCircle', 'appointments', 'count', 1, 'blue'),
('Getting Started', 'Complete 10 appointments', 'Trophy', 'appointments', 'count', 10, 'green'),
('Rising Star', 'Complete 50 appointments', 'Star', 'appointments', 'count', 50, 'yellow'),
('Expert Practitioner', 'Complete 100 appointments', 'Award', 'appointments', 'count', 100, 'purple'),
('People Person', 'Treat 5 unique patients', 'Users', 'patients', 'count', 5, 'blue'),
('Doctor Champion', 'Treat 25 unique patients', 'Heart', 'patients', 'count', 25, 'pink'),
('Community Hero', 'Treat 100 unique patients', 'Shield', 'patients', 'count', 100, 'red'),
('First Earnings', 'Earn your first $100', 'DollarSign', 'revenue', 'milestone', 100, 'green'),
('Revenue Builder', 'Earn $1,000 in total', 'TrendingUp', 'revenue', 'milestone', 1000, 'blue'),
('Top Rated', 'Achieve 5.0 average rating', 'Star', 'reviews', 'rating', 50, 'gold'),
('Patient Favorite', 'Receive 10 reviews', 'MessageCircle', 'reviews', 'count', 10, 'pink')
ON CONFLICT DO NOTHING;

-- Function to get doctor monthly trends
CREATE OR REPLACE FUNCTION get_doctor_monthly_trends(p_doctor_id UUID, p_months INTEGER DEFAULT 6)
RETURNS TABLE(
  month_name TEXT,
  month_date DATE,
  appointments_count BIGINT,
  revenue NUMERIC,
  new_patients BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_stats AS (
    SELECT 
      DATE_TRUNC('month', a.appointment_date)::DATE as month,
      COUNT(a.id) as apt_count,
      COUNT(DISTINCT a.patient_id) as patient_count,
      COALESCE(SUM(CASE WHEN p.price IS NOT NULL THEN p.price ELSE d.consultation_fee END), 0) as total_revenue
    FROM appointments a
    LEFT JOIN procedures p ON a.procedure_id = p.id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.doctor_id = p_doctor_id
      AND a.appointment_date >= CURRENT_DATE - INTERVAL '1 month' * p_months
      AND a.status IN ('completed', 'confirmed')
    GROUP BY DATE_TRUNC('month', a.appointment_date)
  )
  SELECT 
    TO_CHAR(month, 'Mon') as month_name,
    month as month_date,
    apt_count as appointments_count,
    total_revenue as revenue,
    patient_count as new_patients
  FROM monthly_stats
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate average response time
CREATE OR REPLACE FUNCTION calculate_avg_response_time(p_doctor_id UUID)
RETURNS INTEGER AS $$
DECLARE
  avg_hours INTEGER;
BEGIN
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 3600))::INTEGER
  INTO avg_hours
  FROM appointments a
  WHERE a.doctor_id = p_doctor_id
    AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND a.status != 'pending';
  
  RETURN COALESCE(avg_hours, 12);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_doctor_id UUID)
RETURNS TABLE(
  achievement_id UUID,
  title VARCHAR,
  newly_earned BOOLEAN
) AS $$
DECLARE
  v_total_appointments INTEGER;
  v_total_patients INTEGER;
  v_total_revenue NUMERIC;
  v_avg_rating NUMERIC;
  v_total_reviews INTEGER;
  v_achievement RECORD;
  v_existing RECORD;
BEGIN
  -- Get doctor stats
  SELECT 
    COUNT(DISTINCT CASE WHEN a.status IN ('completed', 'confirmed') THEN a.id END),
    COUNT(DISTINCT a.patient_id),
    COALESCE(SUM(CASE WHEN a.status IN ('completed', 'confirmed') 
      THEN COALESCE(p.price, d.consultation_fee, 0) ELSE 0 END), 0),
    d.average_rating,
    d.num_reviews
  INTO 
    v_total_appointments,
    v_total_patients,
    v_total_revenue,
    v_avg_rating,
    v_total_reviews
  FROM doctors d
  LEFT JOIN appointments a ON a.doctor_id = d.id
  LEFT JOIN procedures p ON a.procedure_id = p.id
  WHERE d.id = p_doctor_id
  GROUP BY d.id, d.average_rating, d.num_reviews;
  
  -- Check each achievement
  FOR v_achievement IN 
    SELECT * FROM achievements WHERE is_active = true
  LOOP
    -- Check if already earned
    SELECT * INTO v_existing 
    FROM user_achievements 
    WHERE doctor_id = p_doctor_id AND achievement_id = v_achievement.id;
    
    -- Check if qualifies
    IF v_existing.id IS NULL THEN
      IF (v_achievement.category = 'appointments' AND v_total_appointments >= v_achievement.requirement_value) OR
         (v_achievement.category = 'patients' AND v_total_patients >= v_achievement.requirement_value) OR
         (v_achievement.category = 'revenue' AND v_total_revenue >= v_achievement.requirement_value) OR
         (v_achievement.category = 'reviews' AND v_achievement.requirement_type = 'count' AND v_total_reviews >= v_achievement.requirement_value) OR
         (v_achievement.category = 'reviews' AND v_achievement.requirement_type = 'rating' AND v_avg_rating >= (v_achievement.requirement_value / 10.0))
      THEN
        -- Award achievement
        INSERT INTO user_achievements (doctor_id, achievement_id, progress, is_claimed)
        VALUES (p_doctor_id, v_achievement.id, 100, false);
        
        RETURN QUERY SELECT v_achievement.id, v_achievement.title, true;
      END IF;
    ELSE
      RETURN QUERY SELECT v_achievement.id, v_achievement.title, false;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log settings changes
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_audit_log (user_id, setting_type, old_value, new_value)
  VALUES (
    NEW.user_id,
    TG_TABLE_NAME,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profiles table changes
CREATE TRIGGER log_profile_changes
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION log_settings_change();