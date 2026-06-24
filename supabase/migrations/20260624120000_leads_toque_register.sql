ALTER TABLE public.leads ADD COLUMN toque_register text;
ALTER TABLE public.leads ADD CONSTRAINT leads_toque_register_check CHECK (toque_register IS NULL OR toque_register IN ('Gen100','Gen200','Gen400'));
