-- Create legal pages system tables

-- Legal pages table for dynamic content
CREATE TABLE IF NOT EXISTS public.legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'legal',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- About content table
CREATE TABLE IF NOT EXISTS public.about_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cookie preferences table
CREATE TABLE IF NOT EXISTS public.cookie_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  essential BOOLEAN DEFAULT true,
  analytics BOOLEAN DEFAULT false,
  marketing BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User policy acceptances table
CREATE TABLE IF NOT EXISTS public.user_policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_slug VARCHAR(100) NOT NULL,
  policy_version VARCHAR(50),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_policy_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_pages
CREATE POLICY "Anyone can view published legal pages"
ON public.legal_pages FOR SELECT
USING (is_published = true);

CREATE POLICY "Super admins can manage legal pages"
ON public.legal_pages FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for about_content
CREATE POLICY "Anyone can view published about content"
ON public.about_content FOR SELECT
USING (is_published = true);

CREATE POLICY "Super admins can manage about content"
ON public.about_content FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for cookie_preferences
CREATE POLICY "Users can view own cookie preferences"
ON public.cookie_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cookie preferences"
ON public.cookie_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cookie preferences"
ON public.cookie_preferences FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for user_policy_acceptances
CREATE POLICY "Users can view own policy acceptances"
ON public.user_policy_acceptances FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own policy acceptances"
ON public.user_policy_acceptances FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all acceptances"
ON public.user_policy_acceptances FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create indexes for performance
CREATE INDEX idx_legal_pages_slug ON public.legal_pages(slug);
CREATE INDEX idx_legal_pages_category ON public.legal_pages(category);
CREATE INDEX idx_about_content_order ON public.about_content(order_index);
CREATE INDEX idx_cookie_prefs_user ON public.cookie_preferences(user_id);
CREATE INDEX idx_policy_accept_user ON public.user_policy_acceptances(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_legal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_legal_pages_updated_at
BEFORE UPDATE ON public.legal_pages
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_about_content_updated_at
BEFORE UPDATE ON public.about_content
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

CREATE TRIGGER update_cookie_prefs_updated_at
BEFORE UPDATE ON public.cookie_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_legal_updated_at();

-- Enable realtime for legal pages
ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.about_content;

-- Insert default legal pages
INSERT INTO public.legal_pages (slug, title, description, content, category) VALUES
('privacy-policy', 'Privacy Policy', 'Learn how we collect, use, and protect your personal and medical information.', 
'# Privacy Policy

## Introduction
At Docito, we are committed to protecting your privacy and ensuring the security of your personal and medical information.

## Data We Collect
- Personal information (name, email, phone)
- Medical data (appointment records, clinical notes)
- Payment and billing data
- Technical data (device info, cookies)

## How We Use Your Data
- To facilitate appointment bookings and management
- To connect patients with qualified healthcare providers
- To improve our platform performance
- To send transactional notifications

## Data Protection
- All data is encrypted at rest and in transit
- Access is restricted by user roles
- Secure authentication with auto-logout
- Regular security audits

## Your Rights
- Access and update your information
- Request data deletion
- Withdraw consent
- Export your medical records

For privacy concerns, contact privacy@docito.com', 'legal'),

('terms-of-service', 'Terms of Service', 'Understand the rules and guidelines for using our platform.', 
'# Terms of Service

## Introduction
These terms govern your use of the Docito platform and services.

## Account Eligibility
- Must be 18+ years old
- Healthcare providers must have valid certifications
- Clinics must provide licensing documentation

## Service Usage
- Accurate information required
- Secure login credentials
- No misuse or impersonation
- Follow booking and cancellation policies

## Prohibited Conduct
- Spam or harassment
- Data scraping
- Bypassing payment systems
- Fraudulent activity

## Limitation of Liability
The platform connects users with healthcare professionals but does not provide medical advice.

For legal inquiries, contact legal@docito.com', 'legal'),

('cookie-policy', 'Cookie Policy', 'Information about how we use cookies and tracking technologies.', 
'# Cookie Policy

## What Are Cookies
Cookies are small text files stored on your device to improve functionality and user experience.

## Types of Cookies We Use

### Essential Cookies
Required for login, dashboard access, and core platform functionality.

### Performance Cookies
Help us improve app responsiveness and user experience.

### Analytics Cookies
Anonymized usage metrics to understand platform usage.

### Preference Cookies
Save your theme settings (light/dark/auto) and language preferences.

## Managing Your Preferences
You can customize your cookie preferences in your account settings or through our cookie consent banner.

## Third-Party Cookies
Payment processors and communication services may use their own cookies.

Last updated: ' || to_char(now(), 'YYYY-MM-DD'), 'legal');

-- Insert default about content
INSERT INTO public.about_content (section_key, title, content, order_index) VALUES
('mission', 'Our Mission', 'To empower smarter healthcare connections by simplifying how patients find trusted doctors and clinics while ensuring transparency, accessibility, and data privacy.', 1),
('vision', 'Our Vision', 'To become a globally trusted digital healthcare ecosystem that prioritizes innovation, user safety, and professional excellence.', 2),
('values', 'Core Values', '- **Integrity**: We uphold the highest standards of honesty and transparency
- **Confidentiality**: Your data security is our top priority
- **Accessibility**: Healthcare connections should be available to everyone
- **Professional Excellence**: We partner only with verified, qualified healthcare providers', 3),
('story', 'Our Story', 'Docito was founded with a simple goal: reduce patient wait times and empower clinics with modern digital tools. What started as a solution for appointment scheduling has evolved into a comprehensive healthcare platform trusted by thousands of providers and patients.', 4);

COMMENT ON TABLE public.legal_pages IS 'Stores all legal and policy documents with versioning support';
COMMENT ON TABLE public.about_content IS 'Manages About Us page content sections';
COMMENT ON TABLE public.cookie_preferences IS 'User cookie consent preferences';
COMMENT ON TABLE public.user_policy_acceptances IS 'Tracks when users accept policies';