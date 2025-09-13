-- Rename active column to is_active to match the code expectations
ALTER TABLE public.procedures 
RENAME COLUMN active TO is_active;