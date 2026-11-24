// The pinned CLI emits JSON in machine mode. Text mode and process-level
// errors can still occur. Only report fixed labels and bounded status codes.
export function migrationFailure(result) {
  let diagnostic = `${result.stderr || ''}\n${result.stdout || ''}`;
  let cliCode;
  for (const line of (result.stdout || '').split('\n')) {
    if (!line.trimStart().startsWith('{')) continue;
    try {
      const record = JSON.parse(line);
      if (record._tag !== 'Error') continue;
      if (typeof record.error?.message === 'string') diagnostic += `\n${record.error.message}`;
      if (/^(?:LegacyDbConfig(?:LoginRole(?:Status|Network)|ConnectTempRole|PoolerLogin|Ipv6|Load)|LegacyDbConnect|LegacyDbPush(?:TargetFlags|MigrationHistory))Error$/.test(record.error?.code || '')) cliCode = record.error.code;
    } catch {
      // Malformed output stays private.
    }
  }
  const http = diagnostic.match(/\b(?:HTTP(?: status)?|status(?: code)?)[ :]+([45]\d{2})\b/i)?.[1];
  const sqlstate = diagnostic.match(/\bSQLSTATE[ :]+([0-9A-Z]{5})\b/i)?.[1];
  const system = result.error?.code || diagnostic.match(/\b(ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|EAI_AGAIN|EROFS)\b/)?.[1];
  const poolerUnavailable = cliCode === 'LegacyDbConfigIpv6Error' || /IPv6 is not supported on your current network/i.test(diagnostic);
  const details = [
    Number.isInteger(result.status) ? `exit ${result.status}` : 'process did not exit normally',
    cliCode,
    http && `HTTP ${http}`,
    sqlstate && `SQLSTATE ${sqlstate}`,
    /^(?:ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|EAI_AGAIN|ENOENT|EACCES|ENOBUFS|EROFS)$/.test(system || '') && system,
    poolerUnavailable && 'direct database connection and pooler fallback unavailable',
    /login role/i.test(diagnostic) && 'CLI login role mentioned',
    /(?:permission denied|unauthorized|forbidden|insufficient privileges)/i.test(diagnostic) && 'access error mentioned',
  ].filter(Boolean);
  return { details, poolerUnavailable };
}

export async function probePooler(projectRef, token, request = fetch) {
  // CLI v2.117.0 drops errors from this read-only lookup before reporting IPv6.
  // Read the status alone. The response body may contain connection details.
  try {
    const response = await request(`https://api.supabase.com/v1/projects/${projectRef}/config/database/pooler`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const status = response.status;
    await response.body?.cancel();
    return `pooler configuration lookup HTTP ${status}`;
  } catch {
    return 'pooler configuration lookup failed before an HTTP result';
  }
}

export function verifyDryRun(output, pending) {
  let plan;
  try {
    plan = JSON.parse(output);
  } catch {
    throw new Error('Supabase dry run did not return a readable migration plan');
  }
  if (plan?.dryRun !== true || plan.upToDate !== (pending.length === 0) ||
      !Array.isArray(plan.seeds) || plan.seeds.length ||
      !Array.isArray(plan.roles) || plan.roles.length ||
      !Array.isArray(plan.migrations) || plan.migrations.length !== pending.length ||
      plan.migrations.some((filename, index) => filename !== pending[index])) {
    throw new Error('Supabase dry-run plan does not match the reviewed pending migrations');
  }
}
