// A healthy response from an older deployment is not evidence for this release.
export function validateStagingAlias(target, deployment, alias) {
  if (!deployment.id || alias.alias !== target.hostname || alias.projectId !== target.vercelProjectId ||
      alias.deploymentId !== deployment.id || alias.redirect || alias.deletedAt) {
    throw new Error('Stable staging hostname does not serve the verified deployment');
  }
  return true;
}

// A branch-scoped domain can be assigned automatically during deployment.
// Only request assignment when necessary and trust the authoritative binding
// once it has been verified, even if the CLI reported an error after writing.
export async function ensureStagingAlias(target, deployment, getAlias, setAlias) {
  const existing = await getAlias();
  if (existing?.deploymentId === deployment.id) {
    validateStagingAlias(target, deployment, existing);
    return;
  }
  if (existing && (existing.projectId !== target.vercelProjectId ||
      existing.alias !== target.hostname || existing.redirect || existing.deletedAt)) {
    throw new Error('Refusing to replace an unexpected staging alias');
  }
  try {
    await setAlias();
  } catch {
    // Assignment can outlive a failed CLI invocation. Verify before proceeding.
  }
  validateStagingAlias(target, deployment, await getAlias() ?? {});
}

export async function publishStagingCandidate(target, candidate, previous, {
  getAlias, setAlias, verifyCandidate, verifyStable,
}) {
  const verifyAlias = async deployment => validateStagingAlias(target, deployment, await getAlias() ?? {});
  try {
    // An unexpected automatic assignment must be rolled back before any smoke test.
    await verifyAlias(previous);
    await verifyCandidate();
    await verifyAlias(previous);
    await ensureStagingAlias(target, candidate, getAlias, () => setAlias(candidate));
    await verifyStable();
    await verifyAlias(candidate);
  } catch (error) {
    const current = await getAlias();
    if (current?.deploymentId === candidate.id) {
      validateStagingAlias(target, candidate, current);
      try {
        await ensureStagingAlias(target, previous, getAlias, () => setAlias(previous));
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Staging verification failed and the prior binding could not be restored');
      }
    }
    throw error;
  }
}
