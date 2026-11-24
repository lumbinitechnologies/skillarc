import assert from 'node:assert/strict';
import { fixtureId } from '../fixtures/academic.mjs';

const routes = {
  courses: '/api/mobile/v1/student/courses',
  timetable: '/api/mobile/v1/student/timetable',
  tasks: '/api/mobile/v1/student/tasks',
};
const options = { redirect: 'error' };
const jsonOptions = () => ({ ...options, signal: AbortSignal.timeout(30_000) });

async function safeJson(response, label) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

async function api(origin, path, expectedStatus, token, headers) {
  const response = await fetch(new URL(path, origin), {
    ...jsonOptions(),
    headers: { ...headers, ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (response.status !== expectedStatus) {
    throw new Error(`${path.split('?')[0]} smoke expected ${expectedStatus}, received ${response.status}`);
  }
  const body = await safeJson(response, 'Academic smoke');
  assert.ok(response.headers.get('cache-control') === 'private, no-store', 'Smoke cache policy mismatch');
  assert.ok(typeof body.request_id === 'string' &&
    body.request_id === response.headers.get('x-request-id'), 'Smoke request IDs do not match');
  return body;
}

export async function verifyAcademicSmoke({ origin, authOrigin, publicKey, password, headers }) {
  const read = (path, status, token) => api(origin, path, status, token, headers);
  if (!publicKey || !password) throw new Error('Synthetic academic smoke credentials unavailable');
  const withAccount = async (name, operation) => {
    const email = `${name}@skillarc-fixtures.invalid`;
    const login = await fetch(new URL('/auth/v1/token?grant_type=password', authOrigin), {
      ...jsonOptions(),
      method: 'POST',
      headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!login.ok) throw new Error(`Synthetic ${name} login failed (HTTP ${login.status})`);
    const session = await safeJson(login, 'Synthetic login');
    assert.ok(session.user?.id && session.user?.email === email && session.access_token, 'Synthetic session mismatch');
    try {
      await operation(session.access_token, session.user.id);
    } finally {
      const logout = await fetch(new URL('/auth/v1/logout?scope=local', authOrigin), {
        ...jsonOptions(), method: 'POST',
        headers: { apikey: publicKey, Authorization: `Bearer ${session.access_token}` },
      });
      if (!logout.ok) throw new Error('Synthetic session logout failed');
    }
  };

  for (const path of ['/api/mobile/v1/me', ...Object.values(routes)]) {
    const body = await read(path, 401);
    assert.ok(body.error?.code === 'UNAUTHORIZED', 'Unauthenticated request error mismatch');
  }
  await withAccount('student', async (token, studentId) => {
    const me = (await read('/api/mobile/v1/me', 200, token)).data;
    assert.ok(me.id === studentId && me.role === 'STUDENT', 'Synthetic student profile mismatch');
    const courses = (await read(routes.courses, 200, token)).data;
    assert.ok(courses.courses.length === 1 && courses.courses[0].id === fixtureId(104) &&
      courses.courses[0].faculty.length === 1, 'India student course scope mismatch');
    const timetable = (await read(routes.timetable, 200, token)).data;
    assert.ok(timetable.time_zone === 'Asia/Kolkata' && timetable.today && timetable.date === timetable.today &&
      !timetable.multiweek_enabled && timetable.weeks.length === 0, 'India timetable clock or static scope mismatch');
    await read(`${routes.timetable}?date=2026-02-30`, 400, token);
    const { tasks } = (await read(routes.tasks, 200, token)).data;
    const rows = new Map(tasks.map(task => [task.id, task]));
    assert.ok(rows.size === 5 && !rows.has(fixtureId(140)), 'Submitted or unrelated tasks leaked');
    assert.ok(rows.get(fixtureId(141))?.type === 'quiz' && rows.get(fixtureId(142))?.type === 'coding', 'Summary types missing');
    assert.ok(rows.get(fixtureId(143))?.deadline_state === 'absent' &&
      rows.get(fixtureId(144))?.deadline_message === 'Deadline unavailable' &&
      rows.get(fixtureId(144))?.status === 'pending' &&
      rows.get(fixtureId(149))?.status === 'overdue', 'Synthetic deadline states mismatch');
    assert.ok(tasks.every(task => task.mobile_action === 'unavailable' &&
      !['questions', 'test_cases', 'files', 'answer', 'submission', 'language'].some(key => key in task)), 'Unexpected task data');
  });
  await withAccount('student-au', async token => {
    const day = (await read(routes.timetable, 200, token)).data;
    assert.ok(day.time_zone === 'Australia/Sydney' && day.multiweek_enabled && day.weeks.length === 2 &&
      day.weeks.every(week => week.section_id === fixtureId(203)), 'Sydney timetable weeks mismatch');
    await read(`${routes.timetable}?week_id=${fixtureId(110)}`, 403, token);
    const week = day.weeks.find(week => week.id === fixtureId(211));
    assert.ok(week, 'Synthetic second week missing');
    const selected = (await read(`${routes.timetable}?week_id=${week.id}`, 200, token)).data;
    assert.ok(selected.selected_week_id === week.id, 'Second week selection mismatch');
  });
  await withAccount('student-unconfigured', async token => {
    const { data } = await read(routes.timetable, 200, token);
    assert.ok(data.time_zone === null && data.today === null && data.empty_reason === 'time_zone_unavailable',
      'Unconfigured timetable produced a date or timezone');
  });
  await withAccount('faculty', async token => {
    for (const path of Object.values(routes)) await read(path, 403, token);
  });
  await withAccount('withdrawn', async token => {
    const { data } = await read(routes.courses, 200, token);
    assert.ok(data.context.status === 'no_enrollment' && data.courses.length === 0, 'Revoked enrollment gained section fallback');
  });
  console.log('Synthetic profile and academic HTTP checks passed for India, Sydney and unconfigured campus accounts.');
}
