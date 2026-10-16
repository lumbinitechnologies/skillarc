import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { readConfig } from './deployment-policy.mjs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = readConfig(root);
const mode = process.argv[2];
const sha = process.env.RELEASE_SHA;
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Invalid production release context');
if (process.env.VERCEL_PROJECT_ID !== config.production.vercelProjectId || process.env.VERCEL_ORG_ID !== config.vercelTeamId || !process.env.VERCEL_TOKEN) throw new Error('Unverified Vercel production target');
function cli(args) {
  const result = spawnSync('vercel', args, { cwd: root, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Vercel ${args[0]} failed; no production promotion`);
  return result.stdout.trim();
}
if (mode === 'stage') {
  if (cli(['--version']).replace(/^Vercel CLI /, '') !== '63.1.2') throw new Error('Unexpected Vercel CLI');
  const url = cli(['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--meta', `githubCommitSha=${sha}`]);
  const parsed = new URL(url);
  if (parsed.origin !== url || parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.vercel.app')) throw new Error('Unexpected staged deployment URL');
  if (!process.env.GITHUB_OUTPUT) throw new Error('Missing workflow output destination');
  appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
  console.log('Production build staged without assigning domains');
} else if (mode === 'promote') {
  const url = new URL(process.env.DEPLOYMENT_URL || '');
  if (url.protocol !== 'https:' || url.origin !== process.env.DEPLOYMENT_URL || !url.hostname.endsWith('.vercel.app')) throw new Error('Invalid deployment origin');
  const response = await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(url.hostname)}?teamId=${config.vercelTeamId}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error('Cannot verify staged production deployment');
  const deployment = await response.json();
  if (deployment.projectId !== config.production.vercelProjectId || deployment.ownerId !== config.vercelTeamId ||
    deployment.target !== 'production' || deployment.readyState !== 'READY' || deployment.meta?.githubCommitSha !== sha ||
    deployment.url !== url.hostname) throw new Error('Staged deployment identity/revision mismatch');
  const headers = {};
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  // No credentials are sent until the origin/team/project/revision are verified.
  const smoke = await fetch(new URL('/api/mobile/v1/me', url), { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (smoke.status !== 401 || (await smoke.json()).error?.code !== 'UNAUTHORIZED' || smoke.headers.get('Cache-Control') !== 'private, no-store') throw new Error('Staged application smoke failed; domains remain on the previous version');
  cli(['promote', url.origin, '--yes']);
  console.log(`Promoted approved production revision ${sha}`);
} else throw new Error('Unknown release action');
