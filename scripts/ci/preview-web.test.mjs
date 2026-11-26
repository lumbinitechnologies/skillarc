import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedPreviewEnvironment} from './preview-web.mjs';
test('preview environment cleanup never selects production/shared/unowned variables',()=>{
 const b={id:'owned'};const v={comment:'skillarc-ci:owned',target:['preview'],gitBranch:'keane-66-delivery'};
 assert.equal(ownedPreviewEnvironment(v,b),true);
 for(const p of [{target:['production']},{target:['preview','production']},{comment:'other'},{gitBranch:'main'},{gitBranch:null}]) assert.equal(ownedPreviewEnvironment({...v,...p},b),false);
});
