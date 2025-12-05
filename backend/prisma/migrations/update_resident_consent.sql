-- Migration: Update existing residents to have consent enabled by default
-- This ensures all residents can receive WhatsApp messages

UPDATE "Resident" 
SET 
  consent_whatsapp = true,
  consent_data_processing = true
WHERE 
  consent_whatsapp = false 
  OR consent_data_processing = false;

