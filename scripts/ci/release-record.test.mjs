import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseDigest,validateMobileRecord,validateReleaseRecord } from './release-record.mjs';
const sha='a'.repeat(40);
const record={schemaVersion:1,mobileSha:sha,profile:'production',androidBuildId:'12345678-1234-1234-1234-123456789012',apkSha256:'b'.repeat(64),androidEvidence:'https://github.com/lumbinitechnologies/skillarc-mobile/issues/55#issuecomment-123'};
const run={head_sha:sha,head_branch:'main',event:'workflow_dispatch',status:'completed',conclusion:'success',path:'.github/workflows/android-candidate.yml'};
const jobs=[{name:'Validate Android candidate',conclusion:'success'}];
test('private mobile record binds successful exact production build and device evidence',()=>{
  assert.equal(validateMobileRecord(record,run,jobs,sha),record);
  for(const patch of [{head_sha:'c'.repeat(40)},{head_branch:'staging'},{conclusion:'failure'},{status:'in_progress'},{path:'.github/workflows/untrusted.yml'}]) assert.throws(()=>validateMobileRecord(record,{...run,...patch},jobs,sha));
  for(const patch of [{profile:'staging'},{apkSha256:''},{androidEvidence:''},{mobileSha:'d'.repeat(40)}]) assert.throws(()=>validateMobileRecord({...record,...patch},run,jobs,sha));
  assert.throws(()=>validateMobileRecord(record,run,[],sha));
});
test('approval digest changes with every artifact/revision/migration/evidence change',()=>{
  const bound={...record,serverSha:sha,migrationDigest:'e'.repeat(64),mobileRunId:123,websiteUrl:'https://candidate.vercel.app',stagingEvidence:'https://github.com/lumbinitechnologies/skillarc/actions/runs/1'};
  assert.equal(validateReleaseRecord(bound),releaseDigest(bound));
  for(const [key,value] of Object.entries({serverSha:'c'.repeat(40),mobileSha:'c'.repeat(40),migrationDigest:'f'.repeat(64),apkSha256:'f'.repeat(64),androidBuildId:'changed',websiteUrl:'https://changed.vercel.app',mobileRunId:124})) assert.notEqual(releaseDigest({...bound,[key]:value}),releaseDigest(bound));
  assert.throws(()=>validateReleaseRecord({...bound,stagingEvidence:''}));
});
