import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureStagingAlias, publishStagingCandidate, validateStagingAlias } from './staging-verification.mjs';

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

test('candidate checks run before switching and stable checks run after', async () => {
  const previous = { id: 'dpl_previous' };
  let state = { ...alias, deploymentId: previous.id };
  const calls = [];
  await publishStagingCandidate(target, deployment, previous, {
    getAlias: async () => state,
    setAlias: async selected => {
      calls.push(selected.id);
      state = { ...alias, deploymentId: selected.id };
    },
    verifyCandidate: async () => {
      assert.equal(state.deploymentId, previous.id);
      calls.push('candidate smoke');
    },
    verifyStable: async () => {
      assert.equal(state.deploymentId, deployment.id);
      calls.push('stable smoke');
    },
  });
  assert.deepEqual(calls, ['candidate smoke', deployment.id, 'stable smoke']);
});

test('failed candidate, premature assignment, and failed stable checks retain the prior deployment', async () => {
  const previous = { id: 'dpl_previous' };
  for (const failure of ['candidate', 'automatic assignment', 'stable']) {
    let state = { ...alias, deploymentId: failure === 'automatic assignment' ? deployment.id : previous.id };
    const writes = [];
    await assert.rejects(publishStagingCandidate(target, deployment, previous, {
      getAlias: async () => state,
      setAlias: async selected => {
        state = { ...alias, deploymentId: selected.id };
        writes.push(selected.id);
      },
      verifyCandidate: async () => {
        assert.notEqual(failure, 'automatic assignment');
        if (failure === 'candidate') throw new Error('Candidate checks failed');
      },
      verifyStable: async () => { throw new Error('Stable checks failed'); },
    }));
    assert.equal(state.deploymentId, previous.id);
    assert.deepEqual(writes,
      failure === 'stable' ? [deployment.id, previous.id] :
        failure === 'automatic assignment' ? [previous.id] : []);
  }
});
