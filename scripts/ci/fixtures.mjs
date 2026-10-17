import { accountDefinitions, fixtureVersion, fixtureSql } from '../fixtures/academic.mjs';
import { readConfig, targetFor, verifyDatabaseBranch, ownedPreview } from './deployment-policy.mjs';
import { fileURLToPath } from 'node:url';

const config = readConfig(fileURLToPath(new URL('../../', import.meta.url)));
const ref = process.env.SUPABASE_PROJECT_ID;
const mode = process.argv[2];
if (!['staging','preview'].includes(mode) || !ref || config.excludedProjectRefs.includes(ref) || ref === config.activeParentProjectRef) throw new Error('Fixture target denied: production and legacy must never be seeded');
if (!process.env.FIXTURE_PASSWORD || process.env.FIXTURE_PASSWORD.length < 20) throw new Error('Private fixture credential of at least 20 characters required');
async function request(url, token, method = 'GET', body, extra = {}) {
  const response = await fetch(url, { method, redirect:'error', signal:AbortSignal.timeout(60_000), headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json', ...extra }, body:body === undefined ? undefined:JSON.stringify(body) });
  if (!response.ok) throw new Error(`Fixture operation failed (${response.status}); response/credentials suppressed`);
  return response.json();
}
const management = (suffix, method, body) => request(`https://api.supabase.com/v1/${suffix}`, process.env.SUPABASE_ACCESS_TOKEN, method, body);
const branches = await management(`projects/${config.activeParentProjectRef}/branches`);
if (mode === 'staging') {
  targetFor(config, mode, ref);
  verifyDatabaseBranch(config, mode, ref, branches);
} else if (!branches.some(b => b.project_ref === ref && ownedPreview(b,config))) throw new Error('Preview is not owned');
// Retrieve only this verified branch's API credentials; never log or export them.
const keys = await management(`projects/${ref}/api-keys`);
const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
const publicKey = keys.find(k => k.name === 'anon')?.api_key;
if (!serviceKey || !publicKey) throw new Error('Branch-scoped Auth administration/public keys unavailable');
const origin = `https://${ref}.supabase.co`;
const users = [];
for (let page=1;page<=100;page++) {
  const result = await request(`${origin}/auth/v1/admin/users?page=${page}&per_page=100`,serviceKey,'GET',undefined,{apikey:serviceKey});
  if (!Array.isArray(result.users)) throw new Error('Malformed account inventory');
  users.push(...result.users);
  if (result.users.length < 100) break;
  if (page === 100) throw new Error('Incomplete account inventory');
}
const identities = {};
for (const a of accountDefinitions) {
  let user = users.find(u => u.email === a.email);
  if (user && user.app_metadata?.fixture_version !== fixtureVersion) throw new Error('Existing account is not fixture-owned');
  if (!user) user = await request(`${origin}/auth/v1/admin/users`,serviceKey,'POST',{email:a.email,password:process.env.FIXTURE_PASSWORD,email_confirm:true,app_metadata:{fixture_version:fixtureVersion}},{apikey:serviceKey});
  identities[a.name] = user.id;
}
await management(`projects/${ref}/database/query`,'POST',{ query:fixtureSql(identities),read_only:false });
for (const a of accountDefinitions) {
  const login = await request(`${origin}/auth/v1/token?grant_type=password`,publicKey,'POST',{email:a.email,password:process.env.FIXTURE_PASSWORD},{apikey:publicKey});
  if (login.user?.id !== identities[a.name] || !login.access_token) throw new Error('Synthetic account login failed');
  const profile = await request(`${origin}/rest/v1/users?id=eq.${identities[a.name]}&select=id,role`,login.access_token,'GET',undefined,{apikey:publicKey});
  if (profile.length !== 1 || profile[0].role !== a.role) throw new Error('Linked role/profile check failed');
  // Revoke only this synthetic test session.
  await fetch(`${origin}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:publicKey,Authorization:`Bearer ${login.access_token}`},redirect:'error'});
}
console.log(`${fixtureVersion}: branch ownership, linked accounts and password login verified. Browser/device journeys and cross-tenant authorization remain mandatory activation evidence.`);
