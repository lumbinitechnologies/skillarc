import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'netlify-binding-'));
const cwd = join(root, 'repo');
const bin = join(root, 'bin');
const digest = input => createHash('sha256').update(input).digest('hex');
const key = 'sb_publishable_synthetic';
try {
  mkdirSync(join(cwd, 'supabase', 'migrations'), { recursive: true });
  mkdirSync(join(cwd, 'config'));
  mkdirSync(bin);
  const config = JSON.parse(readFileSync(join(source, 'config/deployment-targets.json')));
  const database = config.production.projectRef;
  writeFileSync(join(cwd, 'config/deployment-targets.json'), JSON.stringify(config));
  const netlifyConfig = readFileSync(join(source, 'netlify.toml'));
  writeFileSync(join(cwd, 'netlify.toml'), netlifyConfig);
  writeFileSync(join(cwd, '.gitignore'), 'netlify-prelaunch-record.json\n');
  const name = '20260101000000_sample.sql';
  const sql = 'SELECT 1;';
  writeFileSync(join(cwd, 'supabase/migrations', name), sql);
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Fixture');
  const revision = git('rev-parse', 'HEAD');
  const siteId = '9de55e27-a988-42fc-83f4-15a69e210ce9';
  const siteName = 'skillarc-prelaunch-review-8f9e793';
  const stagingSha = 'a'.repeat(40);
  const stagingEvidence = 'https://github.com/lumbinitechnologies/skillarc/actions/runs/123';
  const id = '1'.repeat(24);
  const fallbackId = '2'.repeat(24);
  const origin = `https://${id}--${siteName}.netlify.app`;
  const fallbackOrigin = `https://${fallbackId}--${siteName}.netlify.app`;
  const migrations = digest(JSON.stringify([{ name, sha256: digest(sql) }]));
  const configuration = digest(JSON.stringify({
    prelaunch: true, database: `https://${database}.supabase.co`, keyDigest: digest(key),
    serviceRole: false, schedules: [], cliVersion: '27.20.1', netlifyConfig: digest(netlifyConfig),
  }));
  const record = {
    kind: 'candidate', revision, stagingSha, stagingEvidence, database, siteId, deployId: id, origin,
    migrations, configuration, fallback: { id: fallbackId, origin: fallbackOrigin },
  };
  const approve = digest(JSON.stringify(record));
  const draft = (deployId, context, title, url) => ({
    id: deployId, site_id: siteId, state: 'ready', title, context, published_at: null,
    deploy_ssl_url: url, function_schedules: [], edge_functions_present: true,
  });
  const site = {
    id: siteId, name: siteName, account_id: '6b03112dbb187de31292dc84',
    sso_login: true, sso_login_context: 'all', domain_aliases: [],
  };
  const first = draft(id, 'deploy-preview', `SkillArc candidate ${revision} ${configuration}`, origin);
  const fallback = {
    ...draft(fallbackId, 'branch-deploy', 'SkillArc private database-independent fallback synthetic', 'https://mutable-alias.netlify.app'),
    links: { permalink: fallbackOrigin },
  };
  writeFileSync(join(bin,'netlify'),`#!${process.execPath}
const [cmd, method, , data] = process.argv.slice(2);
if (cmd === '--version') console.log('netlify-cli/27.20.1');
else if (cmd === 'deploy') console.log(JSON.stringify({ deploy_id: '${id}', site_id: '${siteId}' }));
else if (cmd === 'api' && method === 'getSite') console.log(JSON.stringify(${JSON.stringify(site)}));
else if (cmd === 'api' && method === 'getSiteDeploy') console.log(JSON.stringify(JSON.parse(data).deploy_id === '${id}' ? ${JSON.stringify(first)} : ${JSON.stringify(fallback)}));
else process.exit(37);`,{mode:0o700});
  const preload=join(root,'mock.mjs');
  writeFileSync(preload,`globalThis.fetch=async (url, options={})=>{
    if(String(url).includes('.netlify.app/')) return new Response(null,{status:401});
    if(String(url).endsWith('/config/auth')) return Response.json({ disable_signup:process.env.ALLOW_SIGNUP!=='yes', external_anonymous_users_enabled:false, smtp_host:null });
    if(String(url).endsWith('/database/query') && JSON.parse(options.body).read_only===true) return Response.json([{accounts:0,files:0,tables:process.env.AFTER==='yes'?20:0,private_buckets:process.env.AFTER==='yes'?2:0}]);
    throw Error('Unexpected network request');
  };`);
  const env = {
    PATH: `${bin}:${process.env.PATH}`, HOME: root, GITHUB_ACTIONS: 'true',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_WORKFLOW_REF: 'lumbinitechnologies/skillarc/.github/workflows/netlify-prelaunch.yml@refs/heads/main',
    NETLIFY_PRELAUNCH_PREPARE_ENABLED: 'true', NETLIFY_PRELAUNCH_MIGRATIONS_ENABLED: 'true',
    NETLIFY_AUTH_TOKEN: 'synthetic', SUPABASE_ACCESS_TOKEN: 'synthetic', SUPABASE_PROJECT_ID: database,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key, RELEASE_SHA: revision, STAGING_SHA: stagingSha, STAGING_EVIDENCE: stagingEvidence,
    FALLBACK_DEPLOY_ID: fallbackId, NETLIFY_CANDIDATE_ID: id, NETLIFY_APPROVAL_DIGEST: approve,
  };
  function run(mode, extra = {}) {
    const args = ['--import', preload, join(source, 'scripts/ci/netlify-prelaunch.mjs')];
    if (mode) args.push(mode);
    return spawnSync(process.execPath, args, { cwd, env: { ...env, ...extra }, encoding: 'utf8' });
  }
  const candidate = run();
  assert.equal(candidate.status, 0, candidate.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(cwd, 'netlify-prelaunch-record.json'))), { ...record, approvalDigest: approve });
  for (const [mode, options] of [['--before-migrations', {}], ['--after-migrations', { AFTER: 'yes' }]]) {
    const result = run(mode, options);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Verified Netlify approval/);
  }
  for (const [options, error] of [
    [{ NETLIFY_APPROVAL_DIGEST: 'c'.repeat(64) }, /approval binding changed/],
    [{ ALLOW_SIGNUP: 'yes' }, /Auth signup/],
    [{ FALLBACK_DEPLOY_ID: id }, /separate draft/],
    [{ NETLIFY_PRELAUNCH_MIGRATIONS_ENABLED: 'false' }, /Expected enabled migrations/],
    [{ GITHUB_REF: 'refs/heads/staging' }, /requires the protected main workflow/],
  ]) {
    const result = run('--before-migrations', options);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, error);
  }
} finally {
  rmSync(root,{recursive:true,force:true});
}
