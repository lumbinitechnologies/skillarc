-- Migration 036: Add org_type to organizations
-- Allows Super Admin to designate an organization as 'school' or 'college'
-- All existing orgs default to 'college' — zero breaking change

-- Add column
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'college'
  CHECK (org_type IN ('school', 'college'));

-- Backfill existing rows (they all default to 'college' already, but being explicit)
UPDATE public.organizations
SET org_type = 'college'
WHERE org_type IS NULL;

-- Index for fast lookups (institutions/users join orgs to read type)
CREATE INDEX IF NOT EXISTS idx_organizations_org_type
  ON public.organizations (org_type);

-- Comment for schema clarity
COMMENT ON COLUMN public.organizations.org_type IS
  'Institution category: ''college'' (higher ed / university) or ''school'' (K-12 / secondary). Controls UI terminology and default feature set.';
