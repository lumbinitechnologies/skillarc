import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureStagingAlias, validateStagingAlias } from './staging-verification.mjs';

const target = { hostname: 'staging.example.invalid', vercelProjectId: 'web' };
const deployment = { id: 'dpl_current' };
const alias = { alias: target.hostname, projectId: 'web', deploymentId: deployment.id };

test('staging evidence binds the stable hostname to the exact verified deployment', () => {
  assert.equal(validateStagingAlias(target, deployment, alias), true);
  for (const patch of [
    { deploymentId: 'dpl_previous' }, { deploymentId: undefined },
    { projectId: 'other' }, { alias: 'production.example.invalid' },
    { redirect: 'https://other.example.invalid' }, { deletedAt: 123 },
  ]) assert.throws(() => validateStagingAlias(target, deployment, { ...alias, ...patch }));
  assert.throws(() => validateStagingAlias(target, {}, alias));
});

test('accepts a correct automatically assigned Preview alias without calling the CLI', async () => {
  const target = { hostname: 'staging.example.invalid', vercelProjectId: 'project' };
  const deployment = { id: 'current' };
  const alias = { alias: target.hostname, projectId: target.vercelProjectId, deploymentId: deployment.id };
  let attempts = 0;
  await ensureStagingAlias(target, deployment, async () => alias, () => { attempts += 1; });
  assert.equal(attempts, 0);
});

test('assignment recovery requires the right binding and will not overwrite another project', async () => {
  const target = { hostname: 'staging.example.invalid', vercelProjectId: 'project' };
  const deployment = { id: 'current' };
  const previous = { alias: target.hostname, projectId: target.vercelProjectId, deploymentId: 'previous' };
  let state = previous;
  await ensureStagingAlias(target, deployment, async () => state, () => {
    state = { ...state, deploymentId: deployment.id };
    throw new Error('CLI error after assignment');
  });
  await assert.rejects(ensureStagingAlias(target, deployment, async () => previous, () => {
    throw new Error('Assignment failed');
  }), /does not serve the verified deployment/);
  let writes = 0;
  await assert.rejects(ensureStagingAlias(target, deployment, async () => ({
    ...previous, projectId: 'unrelated-project',
  }), () => { writes += 1; }), /unexpected staging alias/);
  assert.equal(writes, 0);
});
