ALTER TABLE public.leads DROP CONSTRAINT leads_toque_register_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_toque_register_check CHECK (toque_register IS NULL OR toque_register IN ('Gen100','Gen300','Gen400'));
UPDATE public.leads SET toque_register = 'Gen300' WHERE toque_register = 'Gen200';
