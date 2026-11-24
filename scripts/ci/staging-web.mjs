import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { verifyAcademicSmoke } from './academic-smoke.mjs';
import { verifyPrivateFileSmoke } from './private-file-smoke.mjs';
import { readConfig, targetFor } from './deployment-policy.mjs';
import { validateWebEnvironment } from './web-environment.mjs';
import { publishStagingCandidate, validateStagingAlias } from './staging-verification.mjs';

const config = readConfig(process.cwd());
const target = targetFor(config, 'staging', process.env.SUPABASE_PROJECT_ID);
const sha = process.env.RELEASE_SHA;
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/staging' || !/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Invalid staging context');
if (process.env.VERCEL_PROJECT_ID !== target.vercelProjectId || process.env.VERCEL_ORG_ID !== config.vercelTeamId) throw new Error('Wrong Vercel target');

function cli(args, env = process.env) {
  const result = spawnSync('vercel', args, { env, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Staging ${args[0]} failed`);
  return result.stdout.trim();
}
async function vercel(path, options = {}) {
  const url = new URL(path, 'https://api.vercel.com');
  url.searchParams.set('teamId', config.vercelTeamId);
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, ...options.headers },
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Staging Vercel metadata unavailable (HTTP ${response.status})`);
  return response.json();
}
async function getDeployment(idOrHost) {
  if (!/^(?:dpl_[A-Za-z0-9]+|[a-z0-9-]+\.vercel\.app)$/.test(idOrHost ?? '')) throw new Error('Invalid staging deployment identifier');
  const deployment = await vercel(`/v13/deployments/${idOrHost}`);
  if (deployment.projectId !== target.vercelProjectId || deployment.ownerId !== config.vercelTeamId ||
      deployment.readyState !== 'READY' || ![null, undefined, 'preview'].includes(deployment.target) ||
      !/^[a-z0-9-]+\.vercel\.app$/.test(deployment.url ?? '') ||
      (idOrHost.startsWith('dpl_') ? deployment.id !== idOrHost : deployment.url !== idOrHost)) {
    throw new Error('Staging deployment identity mismatch');
  }
  return deployment;
}
const getAlias = () => vercel(`/v4/aliases/${encodeURIComponent(target.hostname)}`);
const domain = await vercel(`/v9/projects/${target.vercelProjectId}/domains/${encodeURIComponent(target.hostname)}`);
if (domain.name !== target.hostname || domain.gitBranch !== target.gitBranch || domain.redirect) {
  throw new Error('Expected the stable staging domain to be scoped to the staging branch');
}
const previousAlias = await getAlias();
const previous = await getDeployment(previousAlias.deploymentId);
validateStagingAlias(target, previous, previousAlias);

cli(['pull', '--yes', '--environment=preview', `--git-branch=${target.gitBranch}`]);
const project = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
const dotenv = readFileSync('.vercel/.env.preview.local', 'utf8');
validateWebEnvironment(config, 'staging', project, dotenv);
cli(['build']);

// A Git-associated Preview can receive the stable branch domain during upload.
// Suppress Git auto-detection and supply the already-reviewed staging settings
// explicitly so the branchless deployment uses the same runtime environment.
const runtime = Object.fromEntries(Object.entries(parseEnv(dotenv)).filter(([name]) => !name.startsWith('VERCEL_')));
const origin = cli(['deploy', '--prebuilt', '--yes', '--force', ...Object.keys(runtime).flatMap(name => ['--env', name]),
  '--meta', `githubCommitSha=${sha}`, '--meta', `skillarcStagingBranch=${target.gitBranch}`],
{ ...process.env, ...runtime, GIT_DIR: resolve('.vercel/no-git-metadata') });
const url = new URL(origin);
if (url.origin !== origin || url.protocol !== 'https:') throw new Error('Invalid staging candidate origin');
const candidate = await getDeployment(url.hostname);

const stableOrigin = `https://${target.hostname}`;
const smokeSettings = {
  authOrigin: `https://${target.projectRef}.supabase.co`,
  publicKey: runtime.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  password: process.env.FIXTURE_PASSWORD,
};
async function smoke(origin, headers, previewOrigin) {
  const settings = { ...smokeSettings, origin, headers, previewOrigin };
  await verifyAcademicSmoke(settings);
  await verifyPrivateFileSmoke(settings);
}
const bypass = process.env.VERCEL_PREVIEW_BYPASS_SECRET;
await publishStagingCandidate(target, candidate, previous, {
  getAlias,
  setAlias: deployment => vercel(`/v2/deployments/${deployment.id}/aliases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias: target.hostname }),
  }),
  verifyCandidate: async () => {
    if (candidate.meta?.githubCommitSha !== sha || candidate.meta?.skillarcStagingBranch !== target.gitBranch ||
        candidate.meta?.githubCommitRef === target.gitBranch) throw new Error('Staging candidate revision or branch mismatch');
    await smoke(origin, bypass ? { 'x-vercel-protection-bypass': bypass } : {}, origin);
  },
  verifyStable: () => smoke(stableOrigin, {}),
});
console.log(`Staging Preview ${candidate.id} at ${sha} passed both candidate and stable hostname checks.`);
