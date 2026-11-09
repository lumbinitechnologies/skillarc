import { readFileSync } from 'node:fs';
const gates=JSON.parse(readFileSync(new URL('../../config/launch-readiness.json',import.meta.url),'utf8'));
for(const name of ['completeStudentFacultyV1','serverValidationAndSecurity','stagingBrowserAndAndroidJourneys','syntheticRestoreAndRollbackRehearsal','productionHasNoSyntheticData','commercialHostingApproved']) {
  if(gates[name]!==true || !/^https:\/\/github.com\/lumbinitechnologies\//.test(gates.evidence?.[name] || '')) throw new Error(`Launch blocked: ${name} needs reviewed evidence`);
}
