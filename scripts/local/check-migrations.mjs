import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export function checkMigrations(root) {
  const baseline = JSON.parse(readFileSync(path.join(root, 'supabase/migration-baseline.json'), 'utf8'));
  const directory = path.join(root, 'supabase/migrations');
  const files = readdirSync(directory).filter(name => name.endsWith('.sql'));
  for (const [name, hash] of Object.entries(baseline.files)) {
    const actual = createHash('sha256').update(readFileSync(path.join(directory, name))).digest('hex');
    if (actual !== hash) throw new Error(`Applied migration changed: ${name}. Add a new migration instead.`);
  }
  const versions = new Set();
  for (const name of files) {
    const match = /^(\d{14})_.+\.sql$/.exec(name);
    if (!match) throw new Error(`Invalid migration filename: ${name}`);
    if (versions.has(match[1])) throw new Error(`Duplicate migration version: ${match[1]}`);
    versions.add(match[1]);
    if (!baseline.files[name] && match[1] <= baseline.version) {
      throw new Error(`Stale or unknown historical migration: ${name}. Move old generated SQL outside supabase/migrations; see docs/MIGRATION_RECONCILIATION.md.`);
    }
  }
  return files.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    console.log(`Verified ${checkMigrations(root)} canonical migration files.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
