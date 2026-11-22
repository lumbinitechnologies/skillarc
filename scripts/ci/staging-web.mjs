import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { verifyAcademicSmoke } from './academic-smoke.mjs';
import { verifyPrivateFileSmoke } from './private-file-smoke.mjs';
import { readConfig, targetFor } from './deployment-policy.mjs';
import { validateWebEnvironment } from './web-environment.mjs';
import { ensureStagingAlias, validateStagingAlias } from './staging-verification.mjs';
const config = readConfig(process.cwd());
const target = targetFor(config,'staging',process.env.SUPABASE_PROJECT_ID);
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/staging' || !/^[a-f0-9]{40}$/.test(process.env.RELEASE_SHA || '')) throw new Error('Invalid staging context');
if (process.env.VERCEL_PROJECT_ID !== target.vercelProjectId || process.env.VERCEL_ORG_ID !== config.vercelTeamId) throw new Error('Wrong Vercel target');
function cli(args) {
  const result=spawnSync('vercel',args,{encoding:'utf8',timeout:20*60_000,maxBuffer:10*1024*1024});
  if(result.status!==0) throw new Error(`Staging ${args[0]} failed`);
  return result.stdout.trim();
}
cli(['pull','--yes','--environment=preview',`--git-branch=${target.gitBranch}`]);
const project=JSON.parse(readFileSync('.vercel/project.json','utf8'));
const dotenv = readFileSync('.vercel/.env.preview.local','utf8');
validateWebEnvironment(config,'staging',project,dotenv);
cli(['build']);
const origin=cli(['deploy','--prebuilt','--yes','--meta',`githubCommitSha=${process.env.RELEASE_SHA}`,'--meta',`githubCommitRef=${target.gitBranch}`]);
const url=new URL(origin);
if(url.origin!==origin || url.protocol!=='https:' || !url.hostname.endsWith('.vercel.app')) throw new Error('Invalid staged origin');
const response=await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(url.hostname)}?teamId=${config.vercelTeamId}`,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(30_000)});
if(!response.ok) throw new Error('Cannot verify staging deployment');
const deployment=await response.json();
if(deployment.projectId!==target.vercelProjectId || deployment.ownerId!==config.vercelTeamId || deployment.meta?.githubCommitSha!==process.env.RELEASE_SHA || deployment.meta?.githubCommitRef!==target.gitBranch || deployment.readyState!=='READY' || deployment.target==='production') throw new Error('Staging deployment mismatch');
async function getStableAlias() {
  const response = await fetch(`https://api.vercel.com/v4/aliases/${encodeURIComponent(target.hostname)}?teamId=${config.vercelTeamId}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Cannot read staging hostname binding (HTTP ${response.status})`);
  return response.json();
}
async function verifyStableAlias() {
  validateStagingAlias(target, deployment, await getStableAlias() ?? {});
}
await ensureStagingAlias(target, deployment, getStableAlias,
  () => cli(['alias','set',origin,target.hostname,'--scope',config.vercelTeamId]));
await verifyStableAlias();
// Verify the exact deployment through the stable origin used by the app.
const smokeSettings = {
  origin: `https://${target.hostname}`,
  authOrigin: `https://${target.projectRef}.supabase.co`,
  publicKey: parseEnv(dotenv).NEXT_PUBLIC_SUPABASE_ANON_KEY,
  password: process.env.FIXTURE_PASSWORD,
};
await verifyAcademicSmoke(smokeSettings);
await verifyPrivateFileSmoke(smokeSettings);
await verifyStableAlias();
console.log(`Staging Preview ${deployment.id} at ${process.env.RELEASE_SHA} passed the mobile HTTP smoke suite.`);
