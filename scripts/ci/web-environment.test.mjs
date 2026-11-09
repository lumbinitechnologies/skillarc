import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWebEnvironment} from './web-environment.mjs';
const config={vercelTeamId:'team',staging:{projectRef:'stage',vercelProjectId:'web'}};
const project={projectId:'web',orgId:'team'};
const dotenv='NEXT_PUBLIC_SUPABASE_URL="https://stage.supabase.co"\nSUPABASE_SERVICE_ROLE_KEY="synthetic"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="synthetic"';
test('website build rejects swapped projects, organizations and database environment',()=>{
  assert.equal(validateWebEnvironment(config,'staging',project,dotenv),true);
  assert.throws(()=>validateWebEnvironment(config,'staging',{...project,projectId:'other'},dotenv));
  assert.throws(()=>validateWebEnvironment(config,'staging',{...project,orgId:'other'},dotenv));
  assert.throws(()=>validateWebEnvironment(config,'staging',project,dotenv.replace('stage.supabase.co','parent.supabase.co')));
  assert.throws(()=>validateWebEnvironment(config,'production',project,dotenv));
});
