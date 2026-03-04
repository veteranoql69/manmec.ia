-- Migration: Add metadata to manmec_work_orders
-- Description: Adds a JSONB column to store detailed AI-extracted data from emails.

ALTER TABLE IF EXISTS public.manmec_work_orders 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update Prisma Schema Comment if needed
COMMENT ON COLUMN public.manmec_work_orders.metadata IS 'Detailed AI-extracted information from emails (COPEC metadata)';
