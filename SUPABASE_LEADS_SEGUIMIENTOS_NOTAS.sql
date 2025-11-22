-- Add seguimientos_count and notas fields to the leads table
-- seguimientos_count: INTEGER, default 0, tracks the number of follow-ups
-- notas: TEXT, stores notes for each lead

-- Add seguimientos_count column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS seguimientos_count INTEGER DEFAULT 0 NOT NULL;

-- Add notas column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Add index for seguimientos_count if needed for filtering/sorting
CREATE INDEX IF NOT EXISTS leads_seguimientos_count_idx ON public.leads(seguimientos_count);

-- Add comment to columns
COMMENT ON COLUMN public.leads.seguimientos_count IS 'Cantidad de seguimientos realizados al lead';
COMMENT ON COLUMN public.leads.notas IS 'Notas adicionales sobre el lead';

