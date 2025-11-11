-- Create help categories enum
CREATE TYPE help_category AS ENUM (
  'getting_started',
  'appointments',
  'telemedicine',
  'medical_records',
  'billing_payments',
  'account_management'
);

-- Create help articles table with multilingual support
CREATE TABLE help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category help_category NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(100),
  views INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Multilingual fields
  title_en VARCHAR(500) NOT NULL,
  title_es VARCHAR(500),
  title_ar VARCHAR(500),
  title_de VARCHAR(500),
  title_pt VARCHAR(500),
  title_ru VARCHAR(500),
  title_tr VARCHAR(500),
  title_uz VARCHAR(500),
  title_ja VARCHAR(500),
  title_ko VARCHAR(500),
  title_zh VARCHAR(500),
  
  description_en TEXT NOT NULL,
  description_es TEXT,
  description_ar TEXT,
  description_de TEXT,
  description_pt TEXT,
  description_ru TEXT,
  description_tr TEXT,
  description_uz TEXT,
  description_ja TEXT,
  description_ko TEXT,
  description_zh TEXT,
  
  content_en TEXT NOT NULL,
  content_es TEXT,
  content_ar TEXT,
  content_de TEXT,
  content_pt TEXT,
  content_ru TEXT,
  content_tr TEXT,
  content_uz TEXT,
  content_ja TEXT,
  content_ko TEXT,
  content_zh TEXT
);

-- Create index for better query performance
CREATE INDEX idx_help_articles_category ON help_articles(category);
CREATE INDEX idx_help_articles_published ON help_articles(is_published);
CREATE INDEX idx_help_articles_popular ON help_articles(is_popular);
CREATE INDEX idx_help_articles_order ON help_articles(display_order);

-- Enable RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Public can view published articles
CREATE POLICY "Anyone can view published help articles"
ON help_articles
FOR SELECT
USING (is_published = true);

-- Super admins can do everything
CREATE POLICY "Super admins can manage help articles"
ON help_articles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default help articles
INSERT INTO help_articles (category, slug, icon, color, title_en, description_en, content_en, is_popular, display_order) VALUES
('getting_started', 'creating-account', 'Book', 'from-blue-500 to-indigo-600', 'Creating your account', 'Step-by-step guide to creating your Docito account', 'Learn how to create your Docito account in just a few simple steps...', false, 1),
('getting_started', 'setting-up-profile', 'Book', 'from-blue-500 to-indigo-600', 'Setting up your profile', 'Complete your profile with medical information', 'Your profile contains important medical information...', false, 2),
('appointments', 'how-to-book', 'Calendar', 'from-green-500 to-teal-600', 'How to book an appointment', 'Complete guide to booking your first appointment', 'Booking an appointment is easy. Follow these steps...', true, 1),
('appointments', 'rescheduling', 'Calendar', 'from-green-500 to-teal-600', 'Rescheduling appointments', 'Learn how to reschedule your appointments', 'If you need to change your appointment time...', false, 2),
('appointments', 'cancellation-policy', 'Calendar', 'from-green-500 to-teal-600', 'Cancellation policy', 'Understand our cancellation and refund policy', 'Our cancellation policy is designed to be fair...', false, 3),
('telemedicine', 'starting-video-call', 'Video', 'from-purple-500 to-pink-600', 'Starting a video call', 'How to join your video consultation', 'Video consultations are easy to join...', true, 1),
('telemedicine', 'technical-requirements', 'Video', 'from-purple-500 to-pink-600', 'Technical requirements', 'System requirements for video calls', 'To ensure a smooth video consultation...', false, 2),
('medical_records', 'uploading-documents', 'FileText', 'from-orange-500 to-red-600', 'Uploading medical documents', 'How to upload and manage your health records', 'You can securely upload your medical documents...', true, 1),
('medical_records', 'sharing-records', 'FileText', 'from-orange-500 to-red-600', 'Sharing records with doctors', 'Grant access to your medical records', 'You can share your medical records with your healthcare providers...', false, 2),
('billing_payments', 'payment-methods', 'CreditCard', 'from-cyan-500 to-blue-600', 'Adding payment methods', 'Set up your payment options', 'Docito accepts various payment methods...', true, 1),
('billing_payments', 'understanding-bill', 'CreditCard', 'from-cyan-500 to-blue-600', 'Understanding your bill', 'Breakdown of charges and fees', 'Your bill includes consultation fees...', false, 2),
('account_management', 'updating-profile', 'Users', 'from-pink-500 to-rose-600', 'Updating profile information', 'How to edit your personal information', 'You can update your profile information at any time...', false, 1),
('account_management', 'changing-password', 'Users', 'from-pink-500 to-rose-600', 'Changing password', 'Steps to update your account password', 'For security reasons, we recommend changing your password regularly...', false, 2);