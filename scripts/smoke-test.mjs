import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3333').replace(/\/+$/, '');
const startServer = process.env.SMOKE_START_SERVER === 'true';
let server;
let serverError;

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (serverError) throw new Error(`Unable to start API: ${serverError.message}`);
    if (server && server.exitCode !== null) {
      throw new Error(`API exited during startup with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The local API may still be starting.
    }
    await delay(500);
  }
  throw new Error('API did not become healthy within 30 seconds.');
}

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }
  if (!response.ok) throw new Error(`${method} ${path} failed with HTTP ${response.status}.`);
  return payload;
}

async function main() {
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD are required.');

  if (startServer) {
    server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'apps/api/src/main.ts'], {
      env: { ...process.env, PORT: process.env.PORT ?? '3333' },
      stdio: 'inherit',
    });
    server.once('error', (error) => {
      serverError = error;
    });
  }

  await waitForHealth();
  console.log('PASS health');

  const session = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const token = session.sessionId;
  console.log('PASS login');

  const profile = await request('/auth/me', { token });
  const schoolId = process.env.SMOKE_SCHOOL_ID ?? profile.schools[0]?.schoolId;
  if (!schoolId || !profile.schools.some((school) => school.schoolId === schoolId)) {
    throw new Error('The smoke-test account must have an active membership in SMOKE_SCHOOL_ID.');
  }

  const topics = await request(`/topics?schoolId=${encodeURIComponent(schoolId)}`, { token });
  const requestedLevel = process.env.SMOKE_LEVEL ?? 'OBMEP_N1';
  let selectedTopic;
  for (const topic of topics.items) {
    if (process.env.SMOKE_TOPIC_ID && topic.topicId !== process.env.SMOKE_TOPIC_ID) continue;
    const questions = await request(
      `/questions?schoolId=${encodeURIComponent(schoolId)}&topicId=${encodeURIComponent(topic.topicId)}&level=${encodeURIComponent(requestedLevel)}&status=PUBLISHED&limit=1`,
      { token },
    );
    if (questions.items.length > 0) {
      selectedTopic = topic;
      break;
    }
  }
  if (!selectedTopic) {
    throw new Error(`No published ${requestedLevel} question is available in the selected school.`);
  }

  const exam = await request('/exams', {
    token,
    method: 'POST',
    body: {
      schoolId,
      title: `Smoke test ${new Date().toISOString()}`,
      level: requestedLevel,
      topicId: selectedTopic.topicId,
      quantity: 1,
      seed: `smoke-${Date.now()}`,
      durationMinutes: 10,
    },
  });
  console.log('PASS exam creation');

  await request(`/exams/${encodeURIComponent(exam.examId)}/publish`, {
    token,
    method: 'POST',
    body: { schoolId },
  });

  const attempt = await request(`/exams/${encodeURIComponent(exam.examId)}/attempts`, {
    token,
    method: 'POST',
    body: { schoolId },
  });
  for (const question of attempt.questions) {
    const option = question.options[0]?.label;
    if (!option) throw new Error('The attempt contains a question with no answer options.');
    await request(`/attempts/${encodeURIComponent(attempt.attemptId)}/answers`, {
      token,
      method: 'POST',
      body: { schoolId, questionId: question.questionId, selectedOption: option },
    });
  }
  await request(`/attempts/${encodeURIComponent(attempt.attemptId)}/finish`, {
    token,
    method: 'POST',
    body: { schoolId },
  });
  console.log('PASS attempt completion');

  let ranked = false;
  for (let attemptIndex = 0; attemptIndex < 30; attemptIndex += 1) {
    const ranking = await request(
      `/rankings/exams/${encodeURIComponent(exam.examId)}?schoolId=${encodeURIComponent(schoolId)}`,
      { token },
    );
    if (ranking.items.some((entry) => entry.studentId === profile.userId)) {
      ranked = true;
      break;
    }
    await delay(1000);
  }
  if (!ranked) throw new Error('Completed attempt was not included in the exam ranking.');
  console.log('PASS ranking projection');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Smoke test failed.');
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => server.once('exit', resolve)), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
