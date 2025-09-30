ALTER TABLE client_sites
ADD COLUMN progress_percent INTEGER DEFAULT 0,
ADD COLUMN progress_log TEXT;