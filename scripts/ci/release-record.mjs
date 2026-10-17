import { createHash } from 'node:crypto';
export function releaseDigest(record) {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}
export function validateMobileRecord(record, run, jobs, expectedSha) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha || '') || record.mobileSha !== expectedSha || run.head_sha !== expectedSha || run.head_branch !== 'main' || run.event !== 'workflow_dispatch' || run.conclusion !== 'success' || run.status !== 'completed' || run.path !== '.github/workflows/android-candidate.yml') throw new Error('Unverified mobile candidate');
  if (!jobs.some(j => j.name === 'Validate Android candidate' && j.conclusion === 'success')) throw new Error('Mobile build/checks incomplete');
  if (record.schemaVersion !== 1 || record.profile !== 'production' || !/^[a-f0-9-]{36}$/.test(record.androidBuildId || '') || !/^[a-f0-9]{64}$/.test(record.apkSha256 || '') || !/^https:\/\/github.com\/lumbinitechnologies\/skillarc-mobile\/issues\/\d+#issuecomment-\d+$/.test(record.androidEvidence || '')) throw new Error('Missing signed APK identity or Android evidence');
  return record;
}
export function validateReleaseRecord(record) {
  if (record.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(record.serverSha || '') || !/^[a-f0-9]{40}$/.test(record.mobileSha || '') || !/^[a-f0-9]{64}$/.test(record.migrationDigest || '') || !/^[a-f0-9]{64}$/.test(record.apkSha256 || '')) throw new Error('Incomplete release binding');
  if (!record.stagingEvidence || !record.androidEvidence || !record.androidBuildId || !record.mobileRunId || !record.websiteUrl) throw new Error('Missing candidate evidence');
  return releaseDigest(record);
}
