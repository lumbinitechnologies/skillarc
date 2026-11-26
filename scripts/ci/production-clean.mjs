import { readConfig, targetFor } from './deployment-policy.mjs';
const config=readConfig(process.cwd());
const target=targetFor(config,'production',process.env.SUPABASE_PROJECT_ID);
if(process.env.GITHUB_ACTIONS!=='true' || process.env.GITHUB_REF!=='refs/heads/main') throw new Error('Production clean check is main-only');
const query=`SELECT
 (SELECT count(*) FROM auth.users WHERE email LIKE '%@skillarc-fixtures.invalid' OR raw_app_meta_data->>'fixture_version'='skillarc-synthetic-v1') AS fixture_auth,
 (SELECT count(*) FROM public.organizations WHERE id::text LIKE '91000000-%' OR name LIKE '[Synthetic v1]%') AS fixture_orgs,
 (SELECT count(*) FROM storage.objects WHERE bucket_id LIKE 'skillarc-synthetic%' OR name LIKE 'skillarc-synthetic%') AS fixture_objects`;
const response=await fetch(`https://api.supabase.com/v1/projects/${target.projectRef}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:true}),redirect:'error',signal:AbortSignal.timeout(30_000)});
if(!response.ok) throw new Error('Cannot verify absence of production fixtures');
const rows=await response.json();
if(rows.length!==1 || ['fixture_auth','fixture_orgs','fixture_objects'].some(key=>Number(rows[0][key])!==0)) throw new Error('Production contains synthetic fixtures; release blocked, no cleanup performed');
console.log('Production fixture Auth/org/object checks passed without writes.');
