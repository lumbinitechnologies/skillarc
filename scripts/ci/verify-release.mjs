import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { approvedMerge, productionEnvironmentReady } from './deployment-policy.mjs';

const environment = process.env.DEPLOYMENT_ENVIRONMENT;
const branch = environment === 'production' ? 'main' : 'staging';
if (!['production', 'staging'].includes(environment) || process.env.GITHUB_REPOSITORY !== 'lumbinitechnologies/skillarc' || process.env.GITHUB_REF !== `refs/heads/${branch}`) throw new Error('Wrong release repository/branch');
const sha = process.env.RELEASE_SHA || process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Full release SHA required');
async function api(suffix) {
  const token = suffix.includes('/protection') || suffix.startsWith('environments/') ? process.env.GH_POLICY_READ_TOKEN : process.env.GH_TOKEN;
  if (!token) throw new Error('Missing read-only policy credential');
  const response = await fetch(`https://api.github.com/repos/lumbinitechnologies/skillarc/${suffix}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Cannot verify release policy (${response.status})`);
  return response.json();
}
async function list(suffix) {
  const result = [];
  for (let page = 1; page <= 100; page++) {
    const rows = await api(`${suffix}${suffix.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(rows)) throw new Error('Malformed inventory');
    result.push(...rows);
    if (rows.length < 100) return result;
  }
  throw new Error('Incomplete inventory');
}
function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Cannot verify candidate ancestry/tree');
  return result.stdout.trim();
}
const current = await api(`git/ref/heads/${branch}`);
if (current.object?.sha !== sha) throw new Error('Stale candidate; restart from the current protected branch');
for (const protectedBranch of ['main', 'staging']) {
  const p = await api(`branches/${protectedBranch}/protection`);
  const review = p.required_pull_request_reviews;
  if (!review?.dismiss_stale_reviews || !review.require_last_push_approval || !review.require_code_owner_reviews || review.required_approving_review_count < 1 || !p.enforce_admins?.enabled || !p.required_conversation_resolution?.enabled || p.allow_force_pushes?.enabled || p.allow_deletions?.enabled) throw new Error('Incomplete branch protection');
  const contexts = [...(p.required_status_checks?.contexts || []), ...(p.required_status_checks?.checks || []).map(c => c.context)];
  for (const name of ['Database validation', 'Server tests', 'governance/review-policy']) if (!contexts.includes(name)) throw new Error(`Missing required check: ${name}`);
  if (!p.required_status_checks?.strict) throw new Error('Strict branch checks required');
}
let approved;
for (const pr of await list(`commits/${sha}/pulls`)) {
  if (approvedMerge(pr, await list(`pulls/${pr.number}/reviews`), sha, 'lumbinitechnologies', branch)) approved = pr;
}
if (!approved) throw new Error('No independent exact-head review for merged candidate');
if (environment === 'production') {
  if (approved.head?.ref !== 'staging') throw new Error('Production releases require staging-to-main promotion');
  const stagingSha = approved.head.sha;
  // Promotion merges preserve staging ancestry and the exact tested tree.
  if (git('rev-parse', `${sha}^2`) !== stagingSha || git('rev-parse', `${sha}^{tree}`) !== git('rev-parse', `${stagingSha}^{tree}`)) throw new Error('Production contains differences from the staging candidate');
  const env = await api('environments/skillarc-production');
  if (!productionEnvironmentReady(env)) throw new Error('Owner approval protection is missing');
  const policies = await api('environments/skillarc-production/deployment-branch-policies?per_page=100');
  if (policies.total_count !== 1 || policies.branch_policies?.[0]?.name !== 'main' || policies.branch_policies[0].type !== 'branch') throw new Error('Production must be main-only');
  const runs = await api(`actions/workflows/database-ci.yml/runs?head_sha=${stagingSha}&event=push&per_page=100`);
  const run = runs.workflow_runs?.sort((a, b) => b.run_number - a.run_number)[0];
  if (run?.status !== 'completed' || run.conclusion !== 'success' || run.head_branch !== 'staging') throw new Error('Staging validation has not passed');
  const jobs = await api(`actions/runs/${run.id}/jobs?per_page=100`);
  if (jobs.total_count !== jobs.jobs?.length || !jobs.jobs.some(j => j.name === 'Deploy and verify staging' && j.conclusion === 'success')) throw new Error('Actual staging migration, fixtures, deployment and smoke evidence required');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `staging_sha=${stagingSha}\nstaging_evidence=https://github.com/lumbinitechnologies/skillarc/actions/runs/${run.id}\n`);
}
console.log(`Verified independently reviewed ${environment} revision ${sha}`);
