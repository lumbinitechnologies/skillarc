-- Keep the original wall-clock values intact. Only explicitly supplied
-- instants use this column. Existing assignments remain unclassified.
ALTER TABLE public.assignments ADD COLUMN due_at timestamptz;

COMMENT ON COLUMN public.assignments.due_at IS
  'Explicit absolute deadline. NULL does not assert a timezone for the legacy due_date.';
