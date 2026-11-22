# Website-only prelaunch release

This workflow keeps `www.theskillarc.com` informational while testing continues on persistent staging. The Android launch stays on its existing release workflow.

## Before activation

- Merge and independently review the website guard, private file verification, and release workflow through staging. Confirm successful checks against the exact staging tree and record the installed Android staging sign-in and API verification in mobile #55.
- Confirm the Vercel team and plan are approved for public commercial hosting. Separately approve any account or spending change.
- Configure production for the clean Supabase parent only. Disable self-signup, anonymous sign-in, custom email, payment integrations and background jobs. Keep the candidate Vercel environment limited to the clean database settings. Provide scoped credentials in the protected GitHub environments, including Auth Configuration Read for the production Supabase token. Do not set the prelaunch flag in shared Vercel project settings.
- Preserve the exact existing bootstrap migration row in the private record. Obtain separate owner approval for the single history correction. After correction verify the schema and empty aggregate counts. The migration workflow must still verify the exact dry run and final ledger.
- Complete the staging and archive recovery evidence in #66. The rehearsal submits a unique fictional application to the actual write route and checks for absence of the associated database row both before and after the probe. Check worker, payment and delivery logs for outbound side effects separately.
- Use a reviewed configuration change to set `activation.prelaunch` to `true`. Only after all prerequisites are met set the repository Actions variable `PRELAUNCH_RELEASE_ENABLED` to `true`. Dispatch runs on protected `main` with its exact independently reviewed merge SHA and hosted staging evidence.

## Prepare and verify the fallback

Dispatch **Approved prelaunch website release** with **Stage an unaliased fallback only** selected. It tests a staging-backed prelaunch deployment, stages a separate production fallback without domains, and skips the approval, migration and promotion job. Keep the fallback deployment ID and its verification evidence. Verify the recovery procedure on a preview domain and record that marketing and public assets work while onboarding stays closed. The previous live site uses the legacy project and is unsuitable as a fallback after retirement.

## Approve the production candidate

Dispatch again with the rehearsed fallback deployment ID and the fallback-only option clear. The review summary binds the release SHA, hosted staging run, candidate and fallback deployment IDs, production ref, migration digest and prelaunch configuration. The owner reviews the exact `skillarc-production` deployment job. It verifies the binding before migration, applies only reviewed migrations after the exact dry run, checks the final ledger and clean aggregate counts, and rechecks the binding before promotion.

The workflow verifies `www`, the apex redirect, staging and the public prelaunch guard after promotion. It restores the bound prelaunch fallback if those checks fail. Verify live integration dependencies and continue on the separate retention and legacy retirement gate in #66.
