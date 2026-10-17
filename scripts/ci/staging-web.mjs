import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readConfig, targetFor } from './deployment-policy.mjs';
import { validateWebEnvironment } from './web-environment.mjs';
const config = readConfig(process.cwd());
const target = targetFor(config,'staging',process.env.SUPABASE_PROJECT_ID);
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/staging' || !/^[a-f0-9]{40}$/.test(process.env.RELEASE_SHA || '')) throw new Error('Invalid staging context');
if (process.env.VERCEL_PROJECT_ID !== target.vercelProjectId || process.env.VERCEL_ORG_ID !== config.vercelTeamId) throw new Error('Wrong Vercel target');
function cli(args) {
  const result=spawnSync('vercel',args,{encoding:'utf8',timeout:20*60_000,maxBuffer:10*1024*1024});
  if(result.status!==0) throw new Error(`Staging ${args[0]} failed; hostname unchanged`);
  return result.stdout.trim();
}
cli(['pull','--yes','--environment=staging']);
const project=JSON.parse(readFileSync('.vercel/project.json','utf8'));
validateWebEnvironment(config,'staging',project,readFileSync('.vercel/.env.staging.local','utf8'));
cli(['build','--target=staging']);
const origin=cli(['deploy','--prebuilt','--target=staging','--yes','--meta',`githubCommitSha=${process.env.RELEASE_SHA}`]);
const url=new URL(origin);
if(url.origin!==origin || url.protocol!=='https:' || !url.hostname.endsWith('.vercel.app')) throw new Error('Invalid staged origin');
const response=await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(url.hostname)}?teamId=${config.vercelTeamId}`,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(30_000)});
if(!response.ok) throw new Error('Cannot verify staging deployment');
const deployment=await response.json();
if(deployment.projectId!==target.vercelProjectId || deployment.ownerId!==config.vercelTeamId || deployment.meta?.githubCommitSha!==process.env.RELEASE_SHA || deployment.readyState!=='READY' || deployment.target==='production') throw new Error('Staging deployment mismatch');
// No bypass token: the stable staging API must work for Android using app authentication.
const smoke=await fetch(`https://${target.hostname}/api/mobile/v1/me`,{redirect:'error',signal:AbortSignal.timeout(30_000)});
if(smoke.status!==401 || (await smoke.json()).error?.code!=='UNAUTHORIZED' || smoke.headers.get('cache-control')!=='private, no-store') throw new Error('Staging app-auth endpoint/protection smoke failed');
console.log('Staging deployment and public app-auth boundary verified. Authenticated browser and Android journey evidence is additionally required before activation.');
