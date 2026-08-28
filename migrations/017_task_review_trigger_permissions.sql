-- Trigger functions are invoked by PostgreSQL, not by client callers.
-- Do not leave a SECURITY DEFINER helper callable by PUBLIC.

REVOKE ALL ON FUNCTION public.sync_offer_letter_currency() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_offer_letter_currency() TO service_role;
