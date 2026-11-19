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
