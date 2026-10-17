import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Discover only repository source/test directories, never nested vendor/worktrees.
const files = ['src', 'scripts'].flatMap(dir => readdirSync(dir, { recursive: true })
  .filter(name => /\.test\.(?:ts|tsx|mjs)$/.test(name)).map(name => `${dir}/${name}`)).sort();
if (!files.length) throw new Error('No server tests discovered');
let failed = false;
for (const file of files) {
  console.log(`\nTesting ${file}`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', file], { stdio: 'inherit', env: { ...process.env, RUN_KNOWLEDGE_MODEL_TESTS: '1' }, timeout: 5 * 60_000 });
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
else console.log(`All ${files.length} discovered server test files passed (model smoke enabled)`);
