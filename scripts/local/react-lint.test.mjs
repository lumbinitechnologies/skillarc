import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const eslint = new ESLint({ cwd });
const component = body => `import { useEffect, useState } from "react";
export default function Example({ wait }: { wait: boolean }) {
 const [value, setValue] = useState(0);
 ${body}
 return <span>{value}</span>;
}`;
async function stateErrors(body) {
  const [result] = await eslint.lintText(component(body), { filePath: 'src/lint-regression-example.tsx' });
  assert.equal(result.fatalErrorCount, 0);
  return result.messages.filter(message => message.ruleId === 'react-hooks/set-state-in-effect');
}

test('async response updates after an unconditional await remain valid', async () => {
  assert.equal((await stateErrors(`async function load() { await Promise.resolve(); setValue(1); }
    useEffect(() => { void load(); }, []);`)).length, 0);
});

test('synchronous effect updates still fail', async () => {
  assert.ok((await stateErrors('useEffect(() => { setValue(1); }, []);')).length > 0);
});

test('a state update before awaiting still fails', async () => {
  assert.ok((await stateErrors(`async function load() { setValue(1); await Promise.resolve(); }
    useEffect(() => { void load(); }, []);`)).length > 0);
});

test('conditional await cannot hide an immediate update', async () => {
  assert.ok((await stateErrors(`async function load() { if (wait) await Promise.resolve(); setValue(1); }
    useEffect(() => { void load(); }, [wait]);`)).length > 0);
});
