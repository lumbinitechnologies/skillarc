import { spawnSync } from 'node:child_process';
import { approvedMerge, productionEnvironmentReady } from './deployment-policy.mjs';

if (process.env.GITHUB_REPOSITORY !== 'lumbinitechnologies/skillarc' || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Release workflow must run on the intended main branch');
const sha = process.env.RELEASE_SHA || process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('A full release commit SHA is required');
async function api(suffix) {
  const policyMetadata = suffix === 'branches/main/protection' || suffix.startsWith('environments/');
  const token = policyMetadata ? process.env.GH_POLICY_READ_TOKEN : process.env.GH_TOKEN;
  if (!token) throw new Error('Required read-only GitHub verification credential is missing');
  const response = await fetch(`https://api.github.com/repos/lumbinitechnologies/skillarc/${suffix}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Cannot verify release protection (${response.status})`);
  return response.json();
}
async function list(suffix) {
  const rows = [];
  for (let page = 1; page <= 100; page++) {
    const batch = await api(`${suffix}${suffix.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('Malformed GitHub review inventory');
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
  throw new Error('GitHub review pagination limit exceeded');
}
const protection = await api('branches/main/protection');
if (!protection.required_pull_request_reviews?.dismiss_stale_reviews || protection.required_pull_request_reviews.required_approving_review_count < 1) throw new Error('Owner must configure main review protection before activation');
const contexts = [...(protection.required_status_checks?.contexts || []), ...(protection.required_status_checks?.checks || []).map(c => c.context)];
for (const name of ['Database validation', 'Server tests']) if (!contexts.includes(name)) throw new Error(`Missing required branch check: ${name}`);
if (!protection.required_status_checks?.strict) throw new Error('Require branch checks against the current main revision');
const prs = await list(`commits/${sha}/pulls`);
let reviewed = false;
for (const pr of prs) if (approvedMerge(pr, await list(`pulls/${pr.number}/reviews`), sha)) reviewed = true;
if (!reviewed) throw new Error('No independently approved exact-head merged PR for this release');
if (process.env.DEPLOYMENT_ENVIRONMENT === 'production') {
  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main']);
  if (ancestry.status !== 0) throw new Error('Production revision is not on main');
  const env = await api('environments/skillarc-production');
  if (!productionEnvironmentReady(env)) throw new Error('Production owner approval protection is missing');
  const policies = await api('environments/skillarc-production/deployment-branch-policies?per_page=100');
  if (policies.total_count !== policies.branch_policies?.length) throw new Error('Incomplete production branch policy inventory');
  if (!policies.branch_policies?.some(p => p.name === 'main' && p.type === 'branch') || policies.branch_policies.some(p => p.name !== 'main' || p.type !== 'branch')) throw new Error('Production environment must allow only main');
  const runs = await api(`actions/workflows/database-ci.yml/runs?head_sha=${sha}&event=push&per_page=100`);
  const latest = runs.workflow_runs?.sort((a, b) => b.run_number - a.run_number)[0];
  if (latest?.status !== 'completed' || latest.conclusion !== 'success') throw new Error('The selected revision has not passed staging validation and migration');
} else {
  const main = await api('git/ref/heads/main');
  if (main.object?.sha !== sha) throw new Error('Stale staging run; a newer main revision exists');
}
console.log(`Verified reviewed ${process.env.DEPLOYMENT_ENVIRONMENT || 'staging'} revision ${sha}`);
