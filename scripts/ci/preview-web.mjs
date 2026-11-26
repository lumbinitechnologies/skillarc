import { readConfig, ownedPreview } from './deployment-policy.mjs';
const config=readConfig(process.cwd());
async function vercel(suffix,method='GET',body) {
  if(!process.env.VERCEL_TOKEN) throw new Error('Preview Vercel credential missing');
  const response=await fetch(`https://api.vercel.com${suffix}${suffix.includes('?')?'&':'?'}teamId=${config.vercelTeamId}`,{method,headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(60_000)});
  if(!response.ok) throw new Error(`Preview application operation failed (${response.status}); credentials suppressed`);
  return response.status===204?null:response.json();
}
export function ownedPreviewEnvironment(variable, branch) {
  return variable.comment===`skillarc-ci:${branch.id}` && variable.target?.length===1 && variable.target[0]==='preview' && typeof variable.gitBranch==='string' && variable.gitBranch.startsWith('keane-');
}
export async function removePreviewWeb(branch) {
  if(!ownedPreview(branch,config)) throw new Error('Unowned preview application cleanup refused');
  const variables=await vercel(`/v10/projects/${config.production.vercelProjectId}/env`);
  if(!Array.isArray(variables.envs)) throw new Error('Cannot verify preview environment inventory');
  for(const v of variables.envs.filter(v=>ownedPreviewEnvironment(v,branch))) await vercel(`/v9/projects/${config.production.vercelProjectId}/env/${v.id}`,'DELETE');
  let until='';
  for(let page=0;page<100;page++) {
    const result=await vercel(`/v7/deployments?projectId=${config.production.vercelProjectId}&limit=100${until?`&until=${until}`:''}`);
    if(!Array.isArray(result.deployments)) throw new Error('Cannot verify preview deployment inventory');
    for(const d of result.deployments.filter(d=>d.meta?.skillarcPreviewBranchId===branch.id)) {
      const detail=await vercel(`/v13/deployments/${d.uid || d.id}`);
      if(detail.projectId!==config.production.vercelProjectId || detail.ownerId!==config.vercelTeamId || ![undefined,null,'preview'].includes(detail.target) || detail.meta?.skillarcPreviewBranchId!==branch.id) throw new Error('Preview deletion identity mismatch');
      await vercel(`/v13/deployments/${detail.id}`,'DELETE');
    }
    if(!result.pagination?.next) return;
    until=String(result.pagination.next);
  }
  throw new Error('Incomplete preview deployment inventory; manual cleanup needed');
}
export async function deployPreviewWeb(branch,pr,management) {
  if(!ownedPreview(branch,config) || !pr.head.ref.startsWith('keane-') || pr.base.ref!=='staging') throw new Error('Preview binding identity mismatch');
  const keys=await management(`projects/${branch.project_ref}/api-keys`);
  const anon=keys.find(k=>k.name==='anon')?.api_key;
  const service=keys.find(k=>k.name==='service_role')?.api_key;
  if(!anon || !service) throw new Error('Verified preview Auth keys unavailable');
  const values={NEXT_PUBLIC_SUPABASE_URL:`https://${branch.project_ref}.supabase.co`,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service};
  const inventory=await vercel(`/v10/projects/${config.production.vercelProjectId}/env`);
  if(!Array.isArray(inventory.envs) || inventory.envs.some(v=>v.target?.includes('preview') && (!v.gitBranch || v.gitBranch===pr.head.ref) && !Object.hasOwn(values,v.key))) throw new Error('Preview inherits unreviewed external-service credentials; isolate sandbox configuration first');
  await vercel(`/v10/projects/${config.production.vercelProjectId}/env?upsert=true`,'POST',Object.entries(values).map(([key,value])=>({key,value,type:'encrypted',target:['preview'],gitBranch:pr.head.ref,comment:`skillarc-ci:${branch.id}`})));
  let deployment=await vercel('/v13/deployments','POST',{name:'skillarc',project:config.production.vercelProjectId,gitSource:{type:'github',org:'lumbinitechnologies',repo:'skillarc',ref:pr.head.ref,sha:pr.head.sha},meta:{githubCommitSha:pr.head.sha,skillarcPreviewBranchId:branch.id,skillarcSupabaseRef:branch.project_ref}});
  for(let attempt=0;attempt<60;attempt++) {
    deployment=await vercel(`/v13/deployments/${deployment.id}`);
    if(deployment.projectId!==config.production.vercelProjectId || deployment.ownerId!==config.vercelTeamId || ![undefined,null,'preview'].includes(deployment.target) || deployment.meta?.githubCommitSha!==pr.head.sha || deployment.meta?.skillarcSupabaseRef!==branch.project_ref) throw new Error('Preview deployment scope mismatch');
    if(deployment.readyState==='READY') break;
    if(['ERROR','CANCELED'].includes(deployment.readyState)) throw new Error('Preview build failed');
    if(attempt===59) throw new Error('Preview build timeout');
    await new Promise(resolve=>setTimeout(resolve,10_000));
  }
  const origin=new URL(`https://${deployment.url}`);
  if(!origin.hostname.endsWith('.vercel.app')) throw new Error('Untrusted preview origin');
  const auth=await fetch(`https://${branch.project_ref}.supabase.co/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({email:'student@skillarc-fixtures.invalid',password:process.env.FIXTURE_PASSWORD}),redirect:'error',signal:AbortSignal.timeout(30_000)});
  if(!auth.ok) throw new Error('Preview synthetic login failed');
  const session=await auth.json();
  try {
    const headers={Authorization:`Bearer ${session.access_token}`};
    if(process.env.VERCEL_PREVIEW_BYPASS_SECRET) headers['x-vercel-protection-bypass']=process.env.VERCEL_PREVIEW_BYPASS_SECRET;
    const smoke=await fetch(new URL('/api/mobile/v1/me',origin),{headers,redirect:'error',signal:AbortSignal.timeout(30_000)});
    if(!smoke.ok || (await smoke.json()).data?.id!==session.user?.id) throw new Error('Preview application/Auth/database binding failed');
  } finally {
    await fetch(`https://${branch.project_ref}.supabase.co/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:anon,Authorization:`Bearer ${session.access_token}`},redirect:'error'});
  }
  console.log(`Isolated preview API/Auth identity verified: ${origin.origin}`);
  console.log(`Mobile test binding: API ${origin.origin}; Auth https://${branch.project_ref}.supabase.co. Protected previews need an approved app-access path; never embed a bypass secret in an APK.`);
}
