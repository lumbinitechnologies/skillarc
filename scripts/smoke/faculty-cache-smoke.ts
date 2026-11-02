import { clearFacultyProfile, getFacultyProfile, getFacultySubjects, getFacultyTimetable } from '../../src/app/dashboard/faculty/components/faculty-cache-v2'

async function runConcurrent(fn: () => Promise<unknown>, count: number) {
  const tasks = Array.from({ length: count }).map(() => fn())
  return Promise.all(tasks)
}

async function smoke() {
  const userId = 'smoke-user-1'
  const institutionId = 'inst-smoke'

  console.log('clearing cache for user')
  clearFacultyProfile(userId)

  console.log('Firing 10 concurrent profile requests...')
  const profileResults = await runConcurrent(() => getFacultyProfile(userId), 10)
  console.log('Profile results count:', profileResults.length)

  console.log('Single follow-up profile request (should be a cache hit)')
  const single = await getFacultyProfile(userId)
  console.log('Follow-up profile result:', single)

  console.log('Clearing profile cache and testing subjects/timetable concurrency')
  clearFacultyProfile(userId)

  console.log('Firing 6 concurrent subjects requests...')
  await runConcurrent(() => getFacultySubjects(userId), 6)

  console.log('Firing 6 concurrent timetable requests...')
  await runConcurrent(() => getFacultyTimetable(userId, institutionId), 6)

  console.log('Smoke test done')
}

smoke().catch((err) => {
  console.error('Smoke test error', err)
  process.exit(1)
})
