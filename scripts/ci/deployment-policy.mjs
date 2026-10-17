import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { checkMigrations } from '../local/check-migrations.mjs';

export function migrationVersions(root) {
  checkMigrations(root);
  return readdirSync(path.join(root, 'supabase/migrations')).filter(n => n.endsWith('.sql')).map(n => n.slice(0, 14)).sort();
}

export function validateLedger(local, rows, baseline, requireBaseline) {
  if (!Array.isArray(rows) || rows.some(r => !r || !/^\d{14}$/.test(r.version))) throw new Error('Malformed remote migration history');
  const remote = rows.map(r => r.version).sort();
  if (new Set(remote).size !== remote.length) throw new Error('Duplicate remote migration history');
  if (remote.some((v, i) => local[i] !== v)) throw new Error('Remote history is not a prefix of reviewed migrations; manual investigation required');
  if (requireBaseline && !remote.includes(baseline)) throw new Error('Existing staging baseline is missing; refusing to replay it');
  return local.slice(remote.length);
}

export function targetFor(config, environment, suppliedRef) {
  if (!['staging', 'production'].includes(environment)) throw new Error('Unknown deployment environment');
  const target = config[environment];
  if (!target?.projectRef || target.projectRef !== suppliedRef) throw new Error('Deployment project does not match the reviewed target');
  if (config.excludedProjectRefs?.includes(suppliedRef)) throw new Error('Legacy project is excluded');
  if (config.production.projectRef !== config.activeParentProjectRef || config.preview.parentProjectRef !== config.activeParentProjectRef) throw new Error('Inconsistent active parent');
  if (config.staging.projectRef === config.production.projectRef) throw new Error('Staging must be an isolated branch');
  if (config.staging.vercelProjectId !== config.production.vercelProjectId) throw new Error('Only one Vercel project is allowed');
  return target;
}

export function verifyDatabaseBranch(config, environment, suppliedRef, branches) {
  targetFor(config, environment, suppliedRef);
  if (!Array.isArray(branches)) throw new Error('Incomplete branch inventory');
  const matches = branches.filter(b => b.project_ref === suppliedRef);
  if (environment === 'production') {
    // A clean parent may not yet have a default-branch metadata record.
    if (matches.length && (matches.length !== 1 || !matches[0].is_default)) throw new Error('Production is not the default database');
  } else {
    const b = matches[0];
    if (matches.length !== 1 || b.is_default || !b.persistent || b.name !== config.staging.branchName || b.parent_project_ref !== config.activeParentProjectRef) throw new Error('Staging branch ownership/persistence mismatch');
  }
}

export function ownedPreview(branch, config) {
  return new RegExp(`^${config.preview.namePrefix}\\d+-[a-f0-9]{12}$`).test(branch?.name || '') &&
    branch.parent_project_ref === config.activeParentProjectRef && !branch.is_default && !branch.persistent &&
    !!branch.project_ref && branch.project_ref !== config.activeParentProjectRef &&
    branch.project_ref !== config.staging.projectRef && !config.excludedProjectRefs.includes(branch.project_ref);
}

export function approvedMerge(pr, reviews, sha, owner = 'lumbinitechnologies', baseBranch = 'main') {
  if (!pr?.merged_at || pr.base?.ref !== baseBranch || pr.merge_commit_sha !== sha || pr.user?.login !== 'keanesc') return false;
  const latest = new Map();
  for (const review of [...reviews].sort((a, b) => Date.parse(a.submitted_at) - Date.parse(b.submitted_at))) {
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user?.login, review);
  }
  const review = latest.get(owner);
  return review?.state === 'APPROVED' && review.commit_id === pr.head?.sha && owner !== pr.user.login;
}

export function productionEnvironmentReady(environment) {
  return environment?.can_admins_bypass === false && environment?.deployment_branch_policy?.custom_branch_policies === true &&
    environment.protection_rules?.some(rule => rule.type === 'required_reviewers' && rule.prevent_self_review === true &&
      rule.reviewers?.length === 1 && rule.reviewers[0].type === 'User' && rule.reviewers[0].reviewer?.login === 'lumbinitechnologies');
}

export function previewExpired(branch, now, config) {
  if (!ownedPreview(branch, config)) return false;
  const created = Date.parse(branch.created_at);
  return Number.isFinite(created) && now - created >= config.preview.ttlHours * 3_600_000;
}

export function readConfig(root) {
  return JSON.parse(readFileSync(path.join(root, 'config/deployment-targets.json'), 'utf8'));
}
