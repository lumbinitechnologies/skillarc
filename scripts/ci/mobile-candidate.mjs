import { mkdtempSync, writeFileSync, rmSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { validateMobileRecord, releaseDigest } from './release-record.mjs';
const runId=process.env.MOBILE_RUN_ID;
const sha=process.env.MOBILE_SHA;
if(!/^\d+$/.test(runId || '') || !/^[a-f0-9]{40}$/.test(sha || '') || !process.env.GH_MOBILE_READ_TOKEN) throw new Error('Pinned private mobile candidate/read-only credential required');
const base='https://api.github.com/repos/lumbinitechnologies/skillarc-mobile/';
async function api(suffix, binary=false) {
  const r=await fetch(base+suffix,{headers:{Authorization:`Bearer ${process.env.GH_MOBILE_READ_TOKEN}`,Accept:'application/vnd.github+json'},redirect:binary?'manual':'error',signal:AbortSignal.timeout(60_000)});
  if(binary && r.status===302) {
    const destination=new URL(r.headers.get('location'));
    // Signed archive download, never forward the private repository token.
    if(destination.protocol!=='https:' || !destination.hostname.endsWith('.blob.core.windows.net')) throw new Error('Unexpected artifact storage origin');
    const archive=await fetch(destination,{redirect:'error',signal:AbortSignal.timeout(60_000)});
    if(!archive.ok) throw new Error('Cannot read private candidate artifact');
    return Buffer.from(await archive.arrayBuffer());
  }
  if(!r.ok) throw new Error(`Cannot verify private mobile evidence (${r.status})`);
  return binary?Buffer.from(await r.arrayBuffer()):r.json();
}
const run=await api(`actions/runs/${runId}`);
const jobs=await api(`actions/runs/${runId}/jobs?per_page=100`);
const artifacts=await api(`actions/runs/${runId}/artifacts?per_page=100`);
if(jobs.total_count!==jobs.jobs?.length || artifacts.total_count!==artifacts.artifacts?.length) throw new Error('Incomplete private evidence inventory');
const candidates=artifacts.artifacts.filter(a=>a.name==='android-candidate-record' && !a.expired);
if(candidates.length!==1) throw new Error('Exact mobile candidate record required');
const tmp=mkdtempSync(path.join(os.tmpdir(),'skillarc-candidate-'));
try {
  const archive=path.join(tmp,'record.zip');
  writeFileSync(archive,await api(`actions/artifacts/${candidates[0].id}/zip`,true),{mode:0o600});
  const read=spawnSync('unzip',['-p',archive,'candidate.json'],{encoding:'utf8',maxBuffer:64*1024});
  if(read.status!==0) throw new Error('Cannot read bounded mobile candidate record');
  const record=validateMobileRecord(JSON.parse(read.stdout),run,jobs.jobs,sha);
  const current=await api('git/ref/heads/main');
  if(current.object?.sha!==sha) throw new Error('Mobile main changed; rebuild/reapprove candidate');
  const digest=releaseDigest(record);
  if(process.env.EXPECTED_MOBILE_DIGEST && digest!==process.env.EXPECTED_MOBILE_DIGEST) throw new Error('Mobile candidate changed after approval');
  writeFileSync('mobile-candidate.json',JSON.stringify(record,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,`digest=${digest}\n`);
  console.log('Pinned private mobile CI/build/evidence record verified; APK remains private.');
} finally {rmSync(tmp,{recursive:true,force:true});}
