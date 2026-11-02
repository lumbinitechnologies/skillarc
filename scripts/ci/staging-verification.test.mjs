import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStagingAlias } from './staging-verification.mjs';

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
