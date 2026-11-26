import test from 'node:test';
import assert from 'node:assert/strict';
import {accountDefinitions,fixtureSql,fixtureId} from './academic.mjs';
const users=Object.fromEntries(accountDefinitions.map((a,i)=>[a.name,`92000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
test('synthetic fixture graph is deterministic, scoped and repeatable without deletes',()=>{
  const sql=fixtureSql(users,new Date('2026-10-17T00:00:00Z'));
  assert.equal(sql,fixtureSql(users,new Date('2026-10-17T00:00:00Z')));
  for(const table of ['users','students','staff','enrolments','enrolment_units','subjects','timetable_slots','timetable_weeks','assignments','submissions','attendance_records','leave_applications','grade_entries']) assert.match(sql,new RegExp(`INSERT INTO public\\.${table}`));
  assert.match(sql,/WITHDRAWN/);assert.match(sql,/Australia\/Sydney/);assert.match(sql,/Asia\/Kolkata/);
  assert.match(sql,/ON CONFLICT/);assert.match(sql,/Fixture ownership collision/);
  assert.doesNotMatch(sql,/\bDELETE\b|\bTRUNCATE\b|@gmail\.com|sjyotfnhdfmjkulyssps|fvkvfcsqetdxtoosmizq/);
  assert.equal(fixtureId(100),'91000000-0000-4000-8000-000000000100');
  assert.throws(()=>fixtureSql({...users,student:"'); DELETE FROM users; --"}));
});

test('Android fixture adds a student and enrolled unit only when supplied', () => {
  const androidId = '92000000-0000-4000-8000-000000000099';
  const date = new Date('2026-10-17T00:00:00Z');
  assert.doesNotMatch(fixtureSql(users, date), /android-smoke/);
  const sql = fixtureSql({ ...users, 'android-smoke': androidId }, date);
  assert.match(sql, /INSERT INTO public\.users .*android-smoke@skillarc-fixtures\.invalid/);
  assert.match(sql, /INSERT INTO public\.students .*SYN-android-smoke/);
  assert.ok(sql.split('\n').some(line =>
    line.startsWith('INSERT INTO public.enrolments ') &&
    line.includes(fixtureId(155)) && line.includes(androidId)
  ));
  assert.ok(sql.split('\n').some(line =>
    line.startsWith('INSERT INTO public.enrolment_units ') &&
    line.includes(fixtureId(156)) && line.includes(fixtureId(155))
  ));
});
