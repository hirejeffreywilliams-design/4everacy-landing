// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — k6 Load Test (Standard)
// Simulates realistic user traffic patterns for pre-launch validation
// Tests up to 500 concurrent users hitting the platform
// Run: k6 run load-tests/load-test.js
// ═══════════════════════════════════════════════════════════════════════════════

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Custom Metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const apiErrors = new Counter("api_errors");
const successfulSignups = new Counter("successful_signups");
const pageViews = new Counter("page_views");

const homepageLatency = new Trend("homepage_latency", true);
const apiLatency = new Trend("api_latency", true);
const waitlistLatency = new Trend("waitlist_latency", true);

// ── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://relaxed-selkie-a77e89.netlify.app";

export const options = {
  stages: [
    // Phase 1: Warm-up — Gentle ramp to catch obvious issues
    { duration: "1m", target: 50 },

    // Phase 2: Normal load — Typical daily traffic
    { duration: "3m", target: 100 },

    // Phase 3: Peak load — Simulates viral moment / marketing push
    { duration: "3m", target: 300 },

    // Phase 4: Spike — Simulates sudden surge (e.g., HackerNews front page)
    { duration: "2m", target: 500 },

    // Phase 5: Sustained peak — Hold at max to check stability
    { duration: "3m", target: 500 },

    // Phase 6: Cool-down — Gradual ramp-down
    { duration: "2m", target: 50 },

    // Phase 7: Recovery — Back to baseline
    { duration: "1m", target: 0 },
  ],

  thresholds: {
    // Response time thresholds
    http_req_duration: ["p(90)<2000", "p(95)<3000", "p(99)<5000"],
    homepage_latency: ["p(95)<2000"],
    api_latency: ["p(95)<1500"],
    waitlist_latency: ["p(95)<2000"],

    // Error rate thresholds
    errors: ["rate<0.10"],           // Under 10% error rate
    http_req_failed: ["rate<0.10"],  // Under 10% failed requests

    // Throughput thresholds
    http_reqs: ["rate>10"],          // At least 10 requests/sec
  },
};

// ── Default Headers ─────────────────────────────────────────────────────────
const defaultHeaders = {
  "Content-Type": "application/json",
  "User-Agent": "4everacy-k6-load-test/1.0",
  Accept: "text/html,application/json",
};

// ── Scenarios: Weighted User Behaviors ──────────────────────────────────────
// Simulates realistic traffic patterns:
//   60% — New visitors browsing the landing page
//   25% — Users signing up for the waitlist
//   15% — Returning users checking ecosystem status

export default function () {
  const scenario = Math.random();

  if (scenario < 0.60) {
    browsingVisitor();
  } else if (scenario < 0.85) {
    waitlistSignup();
  } else {
    ecosystemExplorer();
  }
}

// ── Scenario 1: Browsing Visitor (60%) ──────────────────────────────────────
function browsingVisitor() {
  group("Browsing Visitor", function () {
    // Land on homepage
    const homeRes = http.get(`${BASE_URL}/`, {
      headers: { "User-Agent": "Mozilla/5.0 (k6 Load Test)" },
      tags: { scenario: "browsing", endpoint: "homepage" },
    });
    homepageLatency.add(homeRes.timings.duration);
    pageViews.add(1);

    const homeOk = check(homeRes, {
      "Homepage 200": (r) => r.status === 200,
      "Homepage has content": (r) => r.body && r.body.length > 1000,
      "Homepage under 2s": (r) => r.timings.duration < 2000,
    });
    if (!homeOk) errorRate.add(1);

    // Simulate reading time (3-8 seconds)
    sleep(Math.random() * 5 + 3);

    // Some visitors check the privacy page
    if (Math.random() < 0.3) {
      const privacyRes = http.get(`${BASE_URL}/privacy.html`, {
        tags: { scenario: "browsing", endpoint: "privacy" },
      });
      pageViews.add(1);
      check(privacyRes, {
        "Privacy page 200": (r) => r.status === 200,
      }) || errorRate.add(1);
      sleep(Math.random() * 2 + 1);
    }

    // Some visitors check terms
    if (Math.random() < 0.2) {
      const termsRes = http.get(`${BASE_URL}/terms.html`, {
        tags: { scenario: "browsing", endpoint: "terms" },
      });
      pageViews.add(1);
      check(termsRes, {
        "Terms page 200": (r) => r.status === 200,
      }) || errorRate.add(1);
      sleep(Math.random() * 2 + 1);
    }

    // Health check (happens in background via JS on page)
    const healthRes = http.get(`${BASE_URL}/api/health`, {
      headers: defaultHeaders,
      tags: { scenario: "browsing", endpoint: "health" },
    });
    apiLatency.add(healthRes.timings.duration);
    check(healthRes, {
      "Health API 200": (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

// ── Scenario 2: Waitlist Signup (25%) ───────────────────────────────────────
function waitlistSignup() {
  group("Waitlist Signup", function () {
    // Land on homepage first
    const homeRes = http.get(`${BASE_URL}/`, {
      tags: { scenario: "signup", endpoint: "homepage" },
    });
    homepageLatency.add(homeRes.timings.duration);
    pageViews.add(1);

    check(homeRes, {
      "Homepage loads for signup": (r) => r.status === 200,
    }) || errorRate.add(1);

    // Read the page (5-15 seconds — more engaged user)
    sleep(Math.random() * 10 + 5);

    // Submit waitlist form
    const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
    const payload = JSON.stringify({
      email: `user-${uniqueId}@loadtest.4everacy.com`,
      name: `Test User ${__VU}`,
      source: "k6-load-test",
    });

    const signupRes = http.post(`${BASE_URL}/api/waitlist`, payload, {
      headers: defaultHeaders,
      tags: { scenario: "signup", endpoint: "waitlist" },
    });
    waitlistLatency.add(signupRes.timings.duration);

    const signupOk = check(signupRes, {
      "Waitlist returns 200": (r) => r.status === 200,
      "Waitlist success response": (r) => {
        try {
          return JSON.parse(r.body).success === true;
        } catch (e) {
          return false;
        }
      },
      "Waitlist under 2s": (r) => r.timings.duration < 2000,
    });

    if (signupOk) {
      successfulSignups.add(1);
    } else {
      errorRate.add(1);
      apiErrors.add(1);
    }

    // Post-signup pause
    sleep(Math.random() * 3 + 2);
  });
}

// ── Scenario 3: Ecosystem Explorer (15%) ────────────────────────────────────
function ecosystemExplorer() {
  group("Ecosystem Explorer", function () {
    // Homepage
    const homeRes = http.get(`${BASE_URL}/`, {
      tags: { scenario: "explorer", endpoint: "homepage" },
    });
    homepageLatency.add(homeRes.timings.duration);
    pageViews.add(1);

    check(homeRes, {
      "Homepage for explorer": (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(Math.random() * 3 + 2);

    // Check ecosystem status
    const ecoRes = http.get(`${BASE_URL}/api/ecosystem-status`, {
      headers: defaultHeaders,
      tags: { scenario: "explorer", endpoint: "ecosystem-status" },
    });
    apiLatency.add(ecoRes.timings.duration);

    check(ecoRes, {
      "Ecosystem returns 200": (r) => r.status === 200,
      "Ecosystem has valid data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.stats && body.core_apps && body.core_apps.length > 0;
        } catch (e) {
          return false;
        }
      },
      "Ecosystem under 1.5s": (r) => r.timings.duration < 1500,
    }) || apiErrors.add(1);

    sleep(Math.random() * 5 + 3);

    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`, {
      headers: defaultHeaders,
      tags: { scenario: "explorer", endpoint: "health" },
    });
    apiLatency.add(healthRes.timings.duration);

    check(healthRes, {
      "Health check 200": (r) => r.status === 200,
    }) || apiErrors.add(1);

    sleep(Math.random() * 2 + 1);
  });
}

// ── Summary Output ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    test: "4everacy Load Test",
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    results: data,
  };

  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    "load-tests/results/load-test-results.json": JSON.stringify(summary, null, 2),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";
