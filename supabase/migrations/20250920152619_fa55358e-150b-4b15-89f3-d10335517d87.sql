-- Add rating and appointment tracking fields to doctors table
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS num_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weighted_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS appointment_count INTEGER DEFAULT 0;

-- Add rating and appointment tracking fields to practices table  
ALTER TABLE practices
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS num_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weighted_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS appointment_count INTEGER DEFAULT 0;

-- Function to calculate Bayesian weighted ratings for doctors
CREATE OR REPLACE FUNCTION update_doctor_weighted_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  global_avg_rating DECIMAL(3,2);
  minimum_threshold INTEGER := 10;
BEGIN
  -- Calculate global average rating for doctors with reviews
  SELECT COALESCE(AVG(average_rating), 4.0) INTO global_avg_rating
  FROM doctors 
  WHERE num_reviews > 0;
  
  -- Update weighted ratings using Bayesian formula
  UPDATE doctors SET
    weighted_rating = (
      (num_reviews::decimal / (num_reviews + minimum_threshold)) * average_rating +
      (minimum_threshold::decimal / (num_reviews + minimum_threshold)) * global_avg_rating
    )
  WHERE average_rating > 0 OR num_reviews > 0;
  
  -- Set default weighted rating for doctors with no ratings
  UPDATE doctors SET
    weighted_rating = global_avg_rating * 0.7  -- Slightly lower than global average
  WHERE num_reviews = 0 AND average_rating = 0;
END;
$$;

-- Function to calculate Bayesian weighted ratings for practices
CREATE OR REPLACE FUNCTION update_practice_weighted_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  global_avg_rating DECIMAL(3,2);
  minimum_threshold INTEGER := 10;
BEGIN
  -- Calculate global average rating for practices with reviews
  SELECT COALESCE(AVG(average_rating), 4.0) INTO global_avg_rating
  FROM practices 
  WHERE num_reviews > 0;
  
  -- Update weighted ratings using Bayesian formula
  UPDATE practices SET
    weighted_rating = (
      (num_reviews::decimal / (num_reviews + minimum_threshold)) * average_rating +
      (minimum_threshold::decimal / (num_reviews + minimum_threshold)) * global_avg_rating
    )
  WHERE average_rating > 0 OR num_reviews > 0;
  
  -- Set default weighted rating for practices with no ratings
  UPDATE practices SET
    weighted_rating = global_avg_rating * 0.7  -- Slightly lower than global average
  WHERE num_reviews = 0 AND average_rating = 0;
END;
$$;

-- Function to update appointment counts
CREATE OR REPLACE FUNCTION update_appointment_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update doctor appointment counts
  UPDATE doctors SET
    appointment_count = (
      SELECT COUNT(*)
      FROM appointments a
      WHERE a.doctor_id = doctors.id
      AND a.status IN ('confirmed', 'completed')
    );
  
  -- Update practice appointment counts
  UPDATE practices SET
    appointment_count = (
      SELECT COUNT(*)
      FROM appointments a
      WHERE a.practice_id = practices.id
      AND a.status IN ('confirmed', 'completed')
    );
END;
$$;

-- Function to refresh all ratings and counts
CREATE OR REPLACE FUNCTION refresh_all_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_appointment_counts();
  PERFORM update_doctor_weighted_ratings();
  PERFORM update_practice_weighted_ratings();
END;
$$;

-- Add some sample data for testing
UPDATE doctors SET 
  average_rating = 4.2 + (random() * 0.8),
  num_reviews = floor(random() * 50 + 5)::INTEGER
WHERE verified = true;

UPDATE practices SET 
  average_rating = 4.0 + (random() * 1.0),
  num_reviews = floor(random() * 30 + 3)::INTEGER
WHERE verified = true;

-- Initialize the weighted ratings
SELECT refresh_all_ratings();