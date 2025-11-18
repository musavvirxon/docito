-- Update doctor_verification table to support new statuses
-- First, update existing 'rejected' to 'declined'
UPDATE doctor_verification 
SET status = 'declined' 
WHERE status = 'rejected';

-- Add check constraint for allowed statuses
ALTER TABLE doctor_verification 
DROP CONSTRAINT IF EXISTS doctor_verification_status_check;

ALTER TABLE doctor_verification 
ADD CONSTRAINT doctor_verification_status_check 
CHECK (status IN ('pending', 'under_review', 'verified', 'declined', 'resubmitted'));

-- Update the notify trigger to handle new statuses
CREATE OR REPLACE FUNCTION public.notify_doctor_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  doctor_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get doctor's user_id
  SELECT user_id INTO doctor_user_id
  FROM doctors
  WHERE id = NEW.doctor_id;

  -- Set notification message based on status
  IF NEW.status = 'verified' THEN
    notification_title := 'Profile Verified!';
    notification_message := 'Congratulations! Your doctor profile has been verified and is now public.';
    
    -- Update doctor verified status
    UPDATE doctors SET verified = true WHERE id = NEW.doctor_id;
    
  ELSIF NEW.status = 'declined' THEN
    notification_title := 'Profile Verification Declined';
    notification_message := 'Your doctor profile verification was declined. ' || 
                           COALESCE('Reason: ' || NEW.rejection_reason, 'Please review the feedback and resubmit.');
    
    -- Ensure doctor remains unverified
    UPDATE doctors SET verified = false WHERE id = NEW.doctor_id;
    
  ELSIF NEW.status = 'resubmitted' THEN
    notification_title := 'Verification Resubmitted';
    notification_message := 'Your updated verification documents have been submitted for review.';
    
  ELSIF NEW.status = 'under_review' THEN
    notification_title := 'Verification Under Review';
    notification_message := 'Your verification submission is currently being reviewed by our team.';
    
  ELSE
    -- Pending or other status - no notification needed
    RETURN NEW;
  END IF;

  -- Send notification to doctor
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (doctor_user_id, notification_title, notification_message, 'verification');

  RETURN NEW;
END;
$function$;