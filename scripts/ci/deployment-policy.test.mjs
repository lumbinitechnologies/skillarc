import assert from 'node:assert/strict';
import test from 'node:test';
import { validateLedger, targetFor, approvedMerge, productionEnvironmentReady, previewExpired } from './deployment-policy.mjs';

const versions = ['20261010094633', '20261016153434'];
test('existing staging must contain the reconciled baseline; clean production may bootstrap', () => {
  assert.throws(() => validateLedger(versions, [], versions[0], true), /baseline/);
  assert.deepEqual(validateLedger(versions, [], versions[0], false), versions);
  assert.deepEqual(validateLedger(versions, [{ version: versions[0] }], versions[0], true), [versions[1]]);
  assert.deepEqual(validateLedger(versions, versions.map(version => ({ version })), versions[0], true), []);
});
test('unknown, missing, duplicate and malformed remote histories cannot deploy', () => {
  for (const rows of [[{ version: versions[1] }], [{ version: '20260101000000' }],
    [{ version: versions[0] }, { version: versions[0] }], [{ version: 'bad' }], {}]) {
    assert.throws(() => validateLedger(versions, rows, versions[0], false));
  }
});
test('environment typo, swapped targets and shared staging/production fail closed', () => {
  const config = { staging: { projectRef: 'test' }, production: { projectRef: 'live' } };
  assert.equal(targetFor(config, 'staging', 'test').projectRef, 'test');
  for (const [env, ref] of [['production', 'test'], ['preview', 'test'], ['staging', 'unknown']]) assert.throws(() => targetFor(config, env, ref));
  assert.throws(() => targetFor({ staging: { projectRef: 'test' }, production: { projectRef: 'test' } }, 'production', 'test'));
});
const pr = { merged_at: '2026-10-16', base: { ref: 'main' }, merge_commit_sha: 'merge', user: { login: 'keanesc' }, head: { sha: 'reviewed' } };
const approval = { user: { login: 'lumbinitechnologies' }, state: 'APPROVED', commit_id: 'reviewed', submitted_at: '2026-10-16T01:00:00Z' };
test('only the independently approved, merged exact revision qualifies', () => {
  assert.equal(approvedMerge(pr, [approval], 'merge'), true);
  for (const candidate of [{ ...pr, merged_at: null }, { ...pr, head: { sha: 'changed' } }, { ...pr, user: { login: 'other' } }]) assert.equal(approvedMerge(candidate, [approval], 'merge'), false);
  assert.equal(approvedMerge(pr, [], 'merge'), false);
  assert.equal(approvedMerge(pr, [{ ...approval, user: { login: 'keanesc' } }], 'merge'), false);
  assert.equal(approvedMerge(pr, [approval, { ...approval, state: 'CHANGES_REQUESTED', submitted_at: '2026-10-16T02:00:00Z' }], 'merge'), false);
  assert.equal(approvedMerge(pr, [approval, { ...approval, state: 'DISMISSED', submitted_at: '2026-10-16T02:00:00Z' }], 'merge'), false);
});
test('production needs the owner reviewer, self-review prevention and branch restrictions', () => {
  const env = { can_admins_bypass: false, deployment_branch_policy: { custom_branch_policies: true }, protection_rules: [{ type: 'required_reviewers', prevent_self_review: true, reviewers: [{ type: 'User', reviewer: { login: 'lumbinitechnologies' } }] }] };
  assert.equal(productionEnvironmentReady(env), true);
  assert.equal(productionEnvironmentReady({}), false);
  assert.equal(productionEnvironmentReady({ ...env, protection_rules: [] }), false);
  assert.equal(productionEnvironmentReady({ ...env, deployment_branch_policy: null }), false);
  assert.equal(productionEnvironmentReady({ ...env, can_admins_bypass: true }), false);
  assert.equal(productionEnvironmentReady({ ...env, protection_rules: [{ ...env.protection_rules[0], prevent_self_review: false }] }), false);
  assert.equal(productionEnvironmentReady({ ...env, protection_rules: [{ ...env.protection_rules[0], reviewers: [...env.protection_rules[0].reviewers, { type: 'User', reviewer: { login: 'someone-else' } }] }] }), false);
});
test('TTL cleanup cannot select production, default, persistent or unrelated branches', () => {
  const config = { staging: { projectRef: 'test' }, preview: { ttlHours: 2, namePrefix: 'skillarc-ci-pr-' } };
  const b = { name: 'skillarc-ci-pr-66-abc', parent_project_ref: 'test', created_at: '2026-10-16T00:00:00Z', persistent: false, is_default: false };
  assert.equal(previewExpired(b, Date.parse('2026-10-16T02:00:00Z'), config), true);
  assert.equal(previewExpired(b, Date.parse('2026-10-16T01:59:59Z'), config), false);
  for (const patch of [{ parent_project_ref: 'live' }, { is_default: true }, { persistent: true }, { name: 'other' }, { created_at: 'bad' }]) assert.equal(previewExpired({ ...b, ...patch }, Date.parse('2026-10-17'), config), false);
});
