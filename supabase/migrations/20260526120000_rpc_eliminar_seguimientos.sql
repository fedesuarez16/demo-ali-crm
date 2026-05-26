-- RPC: eliminar_seguimientos_por_telefono
-- Deletes all seguimientos from both tables for a given phone number.
-- Normalizes remote_jid and the input to digits-only before comparing,
-- which avoids the PostgREST URL-encoding issue where '+' becomes ' ' in .in() filters.
CREATE OR REPLACE FUNCTION public.eliminar_seguimientos_por_telefono(phone_digits TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_phone TEXT := REGEXP_REPLACE(phone_digits, '[^0-9]', '', 'g');
  total_deleted INTEGER := 0;
  batch_deleted INTEGER;
BEGIN
  DELETE FROM public.cola_seguimientos
  WHERE REGEXP_REPLACE(remote_jid, '[^0-9]', '', 'g') = clean_phone;
  GET DIAGNOSTICS batch_deleted = ROW_COUNT;
  total_deleted := total_deleted + batch_deleted;

  DELETE FROM public.cola_seguimientos_dos
  WHERE REGEXP_REPLACE(remote_jid, '[^0-9]', '', 'g') = clean_phone;
  GET DIAGNOSTICS batch_deleted = ROW_COUNT;
  total_deleted := total_deleted + batch_deleted;

  RETURN total_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_seguimientos_por_telefono(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.eliminar_seguimientos_por_telefono(TEXT) TO authenticated;
