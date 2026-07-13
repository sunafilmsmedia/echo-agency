-- Email notifications for new journal entries
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS resend_api_key       text,
  ADD COLUMN IF NOT EXISTS notification_email   text,
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;
