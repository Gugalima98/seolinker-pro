ALTER TABLE public.backlinks DROP COLUMN IF EXISTS progress_log;
ALTER TABLE public.backlinks ADD COLUMN progress_percent INTEGER DEFAULT 0;
