export async function smokePrelaunch(origin, headers = {}, rehearsing = false) {
  async function check(path, status, method = 'GET', marker) {
    const response = await fetch(new URL(path, origin), {
      headers, method, redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (response.status !== status) throw new Error(`Prelaunch ${method} ${path} expected HTTP ${status}, got ${response.status}`);
    if (marker && !(await response.text()).includes(marker)) throw new Error(`Prelaunch ${path} response did not match`);
  }
  for (const page of ['/', '/about', '/features', '/platform', '/resources', '/solutions']) {
    await check(page, 200, 'GET', 'SkillArc');
  }
  await check('/skillarc_logo.svg', 200);
  await check('/auth/login', 503, 'GET', 'Sign-in and onboarding are currently closed');
  for (const path of ['/api/mobile/v1/me', '/api/internal/knowledge/worker', '/api/admissions/public-status']) {
    await check(path, 503, 'GET', 'PRELAUNCH_CLOSED');
  }
  if (rehearsing) {
    await check('/api/auth/signup', 503, 'POST', 'PRELAUNCH_CLOSED');
    await check('/api/admissions/public-submit', 503, 'POST', 'PRELAUNCH_CLOSED');
    await check('/', 503, 'POST', 'Sign-in and onboarding are currently closed');
  }
}
