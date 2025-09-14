-- Add new status values to treatment_plan_status enum
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'cancelled';