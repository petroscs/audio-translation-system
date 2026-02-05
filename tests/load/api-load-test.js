import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp-up to 10 users
    { duration: '5m', target: 10 },     // Stay at 10 users
    { duration: '30s', target: 0 },     // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests should be below 200ms
    errors: ['rate<0.01'],              // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

let authToken = '';

export function setup() {
  // Login once and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    usernameOrEmail: 'testuser',
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.accessToken };
  }

  return { token: null };
}

export default function (data) {
  if (!data.token) {
    return;
  }

  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // Test getting events
  const eventsRes = http.get(`${BASE_URL}/api/events`, params);
  const eventsCheck = check(eventsRes, {
    'events status is 200': (r) => r.status === 200,
  });
  errorRate.add(!eventsCheck);

  sleep(1);

  // Test getting sessions
  const sessionsRes = http.get(`${BASE_URL}/api/sessions`, params);
  const sessionsCheck = check(sessionsRes, {
    'sessions status is 200': (r) => r.status === 200,
  });
  errorRate.add(!sessionsCheck);

  sleep(1);
}

export function teardown(data) {
  // Cleanup if needed
}
