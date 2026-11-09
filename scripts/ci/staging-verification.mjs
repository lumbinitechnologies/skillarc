// A healthy response from an older deployment is not evidence for this release.
export function validateStagingAlias(target, deployment, alias) {
  if (!deployment.id || alias.alias !== target.hostname || alias.projectId !== target.vercelProjectId ||
      alias.deploymentId !== deployment.id || alias.redirect || alias.deletedAt) {
    throw new Error('Stable staging hostname does not serve the verified deployment');
  }
  return true;
}
