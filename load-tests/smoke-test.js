// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — k6 Smoke Test
// Quick validation that all endpoints are responding correctly
// Run: k6 run load-tests/smoke-test.js
// ═══════════════════════════════════════════════════════════════════════════════

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom Metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const healthLatency = new Trend("health_latency", true);
const waitlistLatency = new Trend("waitlist_latency", true);
const ecosystemLatency = new Trend("ecosystem_latency", true);
const homepageLatency = new Trend("homepage_latency", true);

// ── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://relaxed-selkie-a77e89.netlify.app";

export const options = {
  stages: [
    { duration: "30s", target: 5 },   // Ramp up to 5 users
    { duration: "1m", target: 5 },     // Stay at 5 users
    { duration: "30s", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],  // 95% of requests under 3s
    errors: ["rate<0.05"],              // Error rate under 5%
    health_latency: ["p(95)<1000"],     // Health endpoint under 1s
  },
};

// ── Default Headers ─────────────────────────────────────────────────────────
const headers = {
  "Content-Type": "application/json",
  "User-Agent": "4everacy-k6-load-test/1.0",
};

export default function () {
  // ── 1. Homepage ─────────────────────────────────────────────────────────
  const homeRes = http.get(`${BASE_URL}/`, { tags: { endpoint: "homepage" } });
  homepageLatency.add(homeRes.timings.duration);
  check(homeRes, {
    "Homepage returns 200": (r) => r.status === 200,
    "Homepage contains 4everacy": (r) => r.body.includes("4everacy"),
    "Homepage loads under 3s": (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);

  sleep(1);

  // ── 2. Health Check API ─────────────────────────────────────────────────
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    headers,
    tags: { endpoint: "health" },
  });
  healthLatency.add(healthRes.timings.duration);
  check(healthRes, {
    "Health returns 200": (r) => r.status === 200,
    "Health returns operational": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === "operational";
      } catch (e) {
        return false;
      }
    },
    "Health under 1s": (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // ── 3. Ecosystem Status API ─────────────────────────────────────────────
  const ecoRes = http.get(`${BASE_URL}/api/ecosystem-status`, {
    headers,
    tags: { endpoint: "ecosystem-status" },
  });
  ecosystemLatency.add(ecoRes.timings.duration);
  check(ecoRes, {
    "Ecosystem returns 200": (r) => r.status === 200,
    "Ecosystem has stats": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.stats && body.stats.total_repositories > 0;
      } catch (e) {
        return false;
      }
    },
    "Ecosystem under 2s": (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // ── 4. Waitlist API (POST) ──────────────────────────────────────────────
  const waitlistPayload = JSON.stringify({
    email: `loadtest-${__VU}-${__ITER}@test.4everacy.com`,
    name: `Load Test User ${__VU}`,
    source: "k6-smoke-test",
  });

  const waitlistRes = http.post(`${BASE_URL}/api/waitlist`, waitlistPayload, {
    headers,
    tags: { endpoint: "waitlist" },
  });
  waitlistLatency.add(waitlistRes.timings.duration);
  check(waitlistRes, {
    "Waitlist returns 200": (r) => r.status === 200,
    "Waitlist returns success": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    "Waitlist under 2s": (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // ── 5. Static Pages ─────────────────────────────────────────────────────
  const privacyRes = http.get(`${BASE_URL}/privacy.html`, {
    tags: { endpoint: "privacy" },
  });
  check(privacyRes, {
    "Privacy page returns 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  const termsRes = http.get(`${BASE_URL}/terms.html`, {
    tags: { endpoint: "terms" },
  });
  check(termsRes, {
    "Terms page returns 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

// ── Summary Output ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    test: "4everacy Smoke Test",
    timestamp: new Date().toISOString(),
    results: data,
  };

  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    "load-tests/results/smoke-test-results.json": JSON.stringify(summary, null, 2),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";
