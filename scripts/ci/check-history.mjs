import { spawnSync } from 'node:child_process';
const base = process.env.MIGRATION_BASE;
if (base && !/^0+$/.test(base)) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid migration comparison revision');
  const result = spawnSync('git', ['diff', '--name-status', '--no-renames', `${base}...HEAD`, '--', 'supabase/migrations/'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot verify migration history against base');
  if (result.stdout.split('\n').filter(Boolean).some(line => !line.startsWith('A\t'))) throw new Error('Existing main migration was edited or deleted; add a new migration instead');
}
