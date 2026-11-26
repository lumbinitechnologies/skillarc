export function validateWebEnvironment(config, environment, project, dotenv) {
  const target = config[environment];
  if (!target?.projectRef || project.projectId !== target.vercelProjectId || project.orgId !== config.vercelTeamId) throw new Error('Unexpected Vercel build project');
  // Compare raw exported assignments, without evaluating dotenv as shell code.
  const assignments = Object.fromEntries(dotenv.split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => {
    const index=line.indexOf('=');
    let value=line.slice(index+1);
    if (value.startsWith('"') && value.endsWith('"')) value=JSON.parse(value);
    else if(value.startsWith("'") && value.endsWith("'")) value=value.slice(1,-1);
    return [line.slice(0,index),value];
  }));
  if (assignments.NEXT_PUBLIC_SUPABASE_URL !== `https://${target.projectRef}.supabase.co`) throw new Error('API/Auth/database environment mismatch');
  if (!assignments.SUPABASE_SERVICE_ROLE_KEY || !assignments.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Missing environment-scoped server/public credentials');
  return true;
}
