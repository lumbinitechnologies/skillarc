import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { readConfig, readMigrationHistory, targetFor, validatePrelaunchDatabase } from './deployment-policy.mjs';

const siteId = '9de55e27-a988-42fc-83f4-15a69e210ce9';
const teamId = '6b03112dbb187de31292dc84';
const siteName = 'skillarc-prelaunch-review-8f9e793';
const cliVersion = '27.20.1';
const workflow = 'lumbinitechnologies/skillarc/.github/workflows/netlify-prelaunch.yml@refs/heads/main';
const isRehearsal = process.argv[2] === '--rehearsal';
const isMigrationCheck = ['--before-migrations', '--after-migrations'].includes(process.argv[2]);
const { FALLBACK_DEPLOY_ID: fallbackId, NETLIFY_CANDIDATE_ID: candidateId,
  NETLIFY_APPROVAL_DIGEST: expectedDigest } = process.env;
const deployIdPattern = /^[a-f0-9]{24}$/;
const { RELEASE_SHA: revision, STAGING_SHA: stagingSha, STAGING_EVIDENCE: stagingEvidence,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey, NETLIFY_AUTH_TOKEN: token } = process.env;
const config = readConfig(process.cwd());
const target = targetFor(config, 'production', process.env.SUPABASE_PROJECT_ID);
const database = `https://${target.projectRef}.supabase.co`;
const fullSha = /^[a-f0-9]{40}$/;
const stagingRun = /^https:\/\/github\.com\/lumbinitechnologies\/skillarc\/actions\/runs\/\d+$/;
const hash = data => createHash('sha256').update(data).digest('hex');
const digest = data => hash(JSON.stringify(data));

if (!fullSha.test(revision ?? '') || !fullSha.test(stagingSha ?? '') || !stagingRun.test(stagingEvidence ?? '') ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey ?? '')) {
  throw new Error('Expected a full revision, staging evidence and a publishable Supabase key');
}
if (isRehearsal ? process.env.GITHUB_ACTIONS === 'true' :
    (!isMigrationCheck && process.argv.length !== 2) || process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_WORKFLOW_REF !== workflow ||
    process.env.GITHUB_REF !== 'refs/heads/main' || process.env.NETLIFY_PRELAUNCH_PREPARE_ENABLED !== 'true' || !token) {
  throw new Error('Netlify candidate preparation requires the protected main workflow or an explicit local rehearsal');
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tree = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (head !== revision || tree) throw new Error('Netlify release requires a clean checkout of the named revision');
if ((fallbackId && !deployIdPattern.test(fallbackId)) || (isMigrationCheck && (!fallbackId ||
    !deployIdPattern.test(candidateId ?? '') || !/^[a-f0-9]{64}$/.test(expectedDigest ?? '') ||
    process.env.NETLIFY_PRELAUNCH_MIGRATIONS_ENABLED !== 'true'))) {
  throw new Error('Expected enabled migrations with exact candidate, fallback and approval digest');
}
const allowedEnvironment = ['PATH', 'HOME', 'TMPDIR', 'CI', 'NETLIFY_AUTH_TOKEN', 'NETLIFY_TELEMETRY_DISABLED', 'NO_COLOR'];
const env = Object.fromEntries(allowedEnvironment.filter(name => process.env[name]).map(name => [name, process.env[name]]));
Object.assign(env, { SKILLARC_PRELAUNCH: 'true', NEXT_PUBLIC_SUPABASE_URL: database, NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey });

function cli(args, includeOutput = false) {
  try {
    return execFileSync('netlify', args, { env, encoding: 'utf8', timeout: 25 * 60_000, maxBuffer: 24 * 1024 * 1024,
      stdio: ['ignore', 'pipe', includeOutput ? 'inherit' : 'pipe'] }).trim();
  } catch (error) {
    if (includeOutput && typeof error.stdout === 'string') {
      process.stderr.write(error.stdout.replaceAll(publicKey, '[publishable key]').slice(-12000));
    }
    throw new Error(`Netlify ${args[0]} failed (exit ${error.status ?? 'unknown'})`);
  }
}

if (cli(['--version']).split(/\s+/)[0] !== `netlify-cli/${cliVersion}`) throw new Error('Unexpected Netlify CLI version');

function getSite() {
  return JSON.parse(cli(['api', 'getSite', '--data', JSON.stringify({ site_id: siteId })]));
}
function verifyPrivateSite(site) {
  if (site.id !== siteId || site.account_id !== teamId || site.name !== siteName ||
      site.sso_login !== true || site.sso_login_context !== 'all' || site.published_deploy ||
      site.custom_domain || !Array.isArray(site.domain_aliases) || site.domain_aliases.length || site.build_settings?.repo_url) {
    throw new Error('Expected the private, unpublished Netlify project on the approved team');
  }
}

verifyPrivateSite(getSite());
const migrationFiles = readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort();
if (!migrationFiles.length) throw new Error('Missing reviewed migrations');
const migrations = digest(migrationFiles.map(name => ({ name, sha256: hash(readFileSync(`supabase/migrations/${name}`)) })));
const configuration = digest({ prelaunch: true, database, keyDigest: hash(publicKey), serviceRole: false,
  schedules: [], cliVersion, netlifyConfig: hash(readFileSync('netlify.toml')) });
const title = `SkillArc ${isRehearsal ? 'rehearsal' : 'candidate'} ${revision} ${configuration}`;

async function verifyDraft(id, fallback = false) {
  if (!deployIdPattern.test(id ?? '')) throw new Error('Invalid Netlify draft identifier');
  const draft = JSON.parse(cli(['api', 'getSiteDeploy', '--data', JSON.stringify({ site_id: siteId, deploy_id: id })]));
  const origin = `https://${id}--${siteName}.netlify.app`;
  if (draft.id !== id || draft.site_id !== siteId || draft.state !== 'ready' ||
      (fallback ? !draft.title?.startsWith('SkillArc private database-independent fallback ') : draft.title !== title) ||
      !(fallback ? ['deploy-preview', 'branch-deploy'] : ['deploy-preview']).includes(draft.context) ||
      draft.published_at || (fallback ? draft.links?.permalink : draft.deploy_ssl_url) !== origin ||
      !Array.isArray(draft.function_schedules) ||
      draft.function_schedules.length || draft.edge_functions_present !== true) {
    throw new Error('Draft identity, readiness, privacy context or schedule verification failed');
  }
  const visitor = await fetch(new URL('/', origin), { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  if (visitor.status !== 401) throw new Error('Draft did not require Netlify visitor authentication');
  return { id, origin };
}

async function checkDatabase(before) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Missing scoped production Supabase access');
  const management = `https://api.supabase.com/v1/projects/${target.projectRef}`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const options = { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) };
  const authResponse = await fetch(`${management}/config/auth`, options);
  if (!authResponse.ok) throw new Error('Cannot verify production Auth settings');
  const auth = await authResponse.json();
  if (auth.disable_signup !== true || auth.external_anonymous_users_enabled !== false || auth.smtp_host) {
    throw new Error('Production Auth signup, anonymous sign-in or custom SMTP is active');
  }
  const query = `SELECT
    (SELECT count(*) FROM auth.users)::int AS accounts,
    (SELECT count(*) FROM storage.objects)::int AS files,
    (SELECT count(*) FROM pg_tables WHERE schemaname='public')::int AS tables,
    (SELECT count(*) FROM storage.buckets WHERE id IN ('assignments','resumes') AND public=false)::int AS private_buckets`;
  const result = await fetch(`${management}/database/query`, {
    ...options, method: 'POST', body: JSON.stringify({ query, read_only: true }),
  });
  if (!result.ok) throw new Error('Cannot verify clean production data counts');
  const [counts] = await result.json();
  const history = await readMigrationHistory(target.projectRef, accessToken);
  const baseline = JSON.parse(readFileSync('supabase/migration-baseline.json', 'utf8')).version;
  validatePrelaunchDatabase(migrationFiles.map(name => name.slice(0, 14)), history, counts, baseline, before);
}

if (isMigrationCheck && candidateId === fallbackId) throw new Error('Fallback must be a separate draft');
const fallback = fallbackId ? await verifyDraft(fallbackId, true) : undefined;
let selectedId = candidateId;
if (!isMigrationCheck) {
  const result = JSON.parse(cli(['deploy', '--site', siteId, '--context', 'deploy-preview', '--json', '--message', title], true));
  if (result.site_id !== siteId) throw new Error('Unexpected deploy response');
  selectedId = result.deploy_id;
}
if (selectedId === fallbackId) throw new Error('Fallback must be a separate draft');
const deployment = await verifyDraft(selectedId);
verifyPrivateSite(getSite());
const record = { kind: isRehearsal ? 'rehearsal' : 'candidate', revision, stagingSha, stagingEvidence,
  database: target.projectRef, siteId, deployId: deployment.id, origin: deployment.origin, migrations, configuration,
  ...(fallback && { fallback }) };
const approvalDigest = digest(record);
if (isMigrationCheck) {
  if (approvalDigest !== expectedDigest) throw new Error('Netlify approval binding changed');
  await checkDatabase(process.argv[2] === '--before-migrations');
  console.log(`Verified Netlify approval and clean production: ${process.argv[2]}`);
} else {
  writeFileSync('netlify-prelaunch-record.json', `${JSON.stringify({ ...record, approvalDigest }, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `candidate_id=${deployment.id}\napproval_digest=${approvalDigest}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `Private Netlify draft: ${deployment.id}\n\nPrivate fallback: ${fallback?.id ?? 'not selected'}\n\nApproval record digest: ${approvalDigest}\n`);
  }
  console.log(`Verified private Netlify draft ${deployment.id}; authenticated application checks are recorded separately.`);
}
