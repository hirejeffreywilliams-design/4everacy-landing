// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — k6 Stress Test (Extreme)
// Pushes the platform to its breaking point to find the ceiling
// Simulates launch day: thousands of users hitting the site simultaneously
// Run: k6 run load-tests/stress-test.js
// ═══════════════════════════════════════════════════════════════════════════════

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";

// ── Custom Metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const apiErrors = new Counter("api_errors");
const totalRequests = new Counter("total_requests");
const concurrentUsers = new Gauge("concurrent_users");

const homepageLatency = new Trend("homepage_p95", true);
const apiLatency = new Trend("api_p95", true);
const waitlistLatency = new Trend("waitlist_p95", true);

// ── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://relaxed-selkie-a77e89.netlify.app";

export const options = {
  stages: [
    // ── Phase 1: Baseline (warm-up) ────────────────────────────────────────
    { duration: "1m", target: 100 },

    // ── Phase 2: Normal load ───────────────────────────────────────────────
    { duration: "2m", target: 500 },

    // ── Phase 3: Heavy load ────────────────────────────────────────────────
    { duration: "2m", target: 1000 },

    // ── Phase 4: Extreme load (launch day simulation) ──────────────────────
    { duration: "3m", target: 2000 },

    // ── Phase 5: Breaking point probe ──────────────────────────────────────
    { duration: "2m", target: 3000 },

    // ── Phase 6: Peak hold — Find the ceiling ──────────────────────────────
    { duration: "3m", target: 5000 },

    // ── Phase 7: Recovery test — Can it bounce back? ───────────────────────
    { duration: "2m", target: 500 },

    // ── Phase 8: Cool-down ─────────────────────────────────────────────────
    { duration: "1m", target: 0 },
  ],

  thresholds: {
    // Stress test thresholds are more lenient — we expect degradation
    http_req_duration: ["p(90)<5000", "p(95)<8000"],  // Allow up to 8s at p95
    errors: ["rate<0.30"],                             // Up to 30% errors acceptable
    http_req_failed: ["rate<0.30"],                    // Up to 30% failures

    // API-specific — these should hold up better
    api_p95: ["p(95)<5000"],
    waitlist_p95: ["p(95)<5000"],
  },

  // Abort if things go truly sideways
  abortOnFail: false,
};

// ── Default Headers ─────────────────────────────────────────────────────────
const headers = {
  "Content-Type": "application/json",
  "User-Agent": "4everacy-k6-stress-test/1.0",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TEST SCENARIO
// Simulates realistic launch-day traffic distribution:
//   50% — Homepage visitors (organic + social media links)
//   30% — Waitlist signups (high conversion on launch day)
//   10% — API calls (ecosystem status, health)
//   10% — Rapid-fire page navigation (power users)
// ═══════════════════════════════════════════════════════════════════════════════

export default function () {
  concurrentUsers.add(__VU);
  const scenario = Math.random();

  if (scenario < 0.50) {
    launchDayVisitor();
  } else if (scenario < 0.80) {
    launchDaySignup();
  } else if (scenario < 0.90) {
    apiHammer();
  } else {
    rapidNavigation();
  }
}

// ── Scenario 1: Launch Day Visitor (50%) ────────────────────────────────────
function launchDayVisitor() {
  group("Launch Day Visitor", function () {
    const res = http.get(`${BASE_URL}/`, {
      tags: { scenario: "visitor" },
    });
    homepageLatency.add(res.timings.duration);
    totalRequests.add(1);

    check(res, {
      "Homepage responds": (r) => r.status === 200 || r.status === 429,
      "Not a server error": (r) => r.status < 500,
    }) || errorRate.add(1);

    // Quick scan of the page (launch day visitors are excited)
    sleep(Math.random() * 3 + 1);
  });
}

// ── Scenario 2: Launch Day Signup (30%) ─────────────────────────────────────
function launchDaySignup() {
  group("Launch Day Signup", function () {
    // Load homepage first
    const homeRes = http.get(`${BASE_URL}/`, {
      tags: { scenario: "signup" },
    });
    homepageLatency.add(homeRes.timings.duration);
    totalRequests.add(1);

    check(homeRes, {
      "Homepage loads for signup": (r) => r.status === 200 || r.status === 429,
    }) || errorRate.add(1);

    // Quick read, then sign up
    sleep(Math.random() * 3 + 2);

    // Submit waitlist
    const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
    const payload = JSON.stringify({
      email: `stress-${uniqueId}@loadtest.4everacy.com`,
      name: `Stress User ${__VU}`,
      source: "k6-stress-test",
    });

    const signupRes = http.post(`${BASE_URL}/api/waitlist`, payload, {
      headers,
      tags: { scenario: "signup", endpoint: "waitlist" },
    });
    waitlistLatency.add(signupRes.timings.duration);
    totalRequests.add(1);

    check(signupRes, {
      "Waitlist responds": (r) => r.status === 200 || r.status === 429,
      "Waitlist not 500": (r) => r.status < 500,
    }) || errorRate.add(1);

    sleep(Math.random() * 2 + 1);
  });
}

// ── Scenario 3: API Hammer (10%) ────────────────────────────────────────────
// Simulates automated clients / monitoring / bots hitting APIs
function apiHammer() {
  group("API Hammer", function () {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`, {
      headers,
      tags: { scenario: "api", endpoint: "health" },
    });
    apiLatency.add(healthRes.timings.duration);
    totalRequests.add(1);

    check(healthRes, {
      "Health API responds": (r) => r.status === 200 || r.status === 429,
      "Health not 500": (r) => r.status < 500,
    }) || apiErrors.add(1);

    sleep(0.5);

    // Ecosystem status
    const ecoRes = http.get(`${BASE_URL}/api/ecosystem-status`, {
      headers,
      tags: { scenario: "api", endpoint: "ecosystem-status" },
    });
    apiLatency.add(ecoRes.timings.duration);
    totalRequests.add(1);

    check(ecoRes, {
      "Ecosystem API responds": (r) => r.status === 200 || r.status === 429,
      "Ecosystem not 500": (r) => r.status < 500,
    }) || apiErrors.add(1);

    sleep(0.5);
  });
}

// ── Scenario 4: Rapid Navigation (10%) ──────────────────────────────────────
// Power users clicking through all pages quickly
function rapidNavigation() {
  group("Rapid Navigation", function () {
    const pages = [
      "/",
      "/privacy.html",
      "/terms.html",
      "/api/health",
      "/api/ecosystem-status",
    ];

    for (const page of pages) {
      const res = http.get(`${BASE_URL}${page}`, {
        tags: { scenario: "rapid", endpoint: page },
      });
      totalRequests.add(1);

      if (page.startsWith("/api/")) {
        apiLatency.add(res.timings.duration);
      } else {
        homepageLatency.add(res.timings.duration);
      }

      check(res, {
        [`${page} responds`]: (r) => r.status === 200 || r.status === 429,
        [`${page} not 500`]: (r) => r.status < 500,
      }) || errorRate.add(1);

      sleep(Math.random() * 0.5 + 0.2);
    }
  });
}

// ── Summary Output ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    test: "4everacy STRESS Test",
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    description: "Extreme load test simulating launch-day traffic up to 5,000 concurrent users",
    results: data,
  };

  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    "load-tests/results/stress-test-results.json": JSON.stringify(summary, null, 2),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";
