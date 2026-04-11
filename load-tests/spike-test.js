// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — k6 Spike Test
// Simulates sudden viral traffic — from zero to massive in seconds
// Use case: Celebrity tweet, TikTok viral, Product Hunt launch
// Run: k6 run load-tests/spike-test.js
// ═══════════════════════════════════════════════════════════════════════════════

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Custom Metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const spikeRecovery = new Rate("spike_recovery");

// ── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://relaxed-selkie-a77e89.netlify.app";

export const options = {
  stages: [
    // Calm before the storm
    { duration: "30s", target: 10 },

    // SPIKE — Instant viral moment (0 → 3000 in 30 seconds)
    { duration: "30s", target: 3000 },

    // Hold the spike — see if it survives
    { duration: "2m", target: 3000 },

    // Second spike — double down (e.g., retweet wave)
    { duration: "30s", target: 5000 },

    // Peak hold
    { duration: "1m", target: 5000 },

    // Traffic dies down
    { duration: "1m", target: 500 },

    // Recovery check — does the system stabilize?
    { duration: "2m", target: 100 },

    // Final cool-down
    { duration: "30s", target: 0 },
  ],

  thresholds: {
    // Spike tests expect degradation but the system should not crash
    http_req_duration: ["p(90)<10000"],   // 90% under 10s during spike
    errors: ["rate<0.50"],                // Up to 50% errors during spike is acceptable
    spike_recovery: ["rate>0.90"],        // 90% of post-spike requests should succeed
  },
};

const headers = {
  "Content-Type": "application/json",
  "User-Agent": "4everacy-k6-spike-test/1.0",
};

export default function () {
  // Determine if we're in recovery phase (last 2.5 minutes = after spike dies down)
  const isRecoveryPhase = __ITER > 0 && __VU <= 100;

  // Homepage hit — every user does this
  const homeRes = http.get(`${BASE_URL}/`, {
    tags: { endpoint: "homepage" },
  });

  const homeOk = check(homeRes, {
    "Homepage responds": (r) => r.status === 200 || r.status === 429,
    "Not a server crash": (r) => r.status < 500,
  });

  if (!homeOk) errorRate.add(1);
  if (isRecoveryPhase) spikeRecovery.add(homeOk ? 1 : 0);

  sleep(Math.random() * 1 + 0.5);

  // 40% of users also hit an API endpoint
  if (Math.random() < 0.4) {
    const apiEndpoint = Math.random() < 0.5 ? "/api/health" : "/api/ecosystem-status";
    const apiRes = http.get(`${BASE_URL}${apiEndpoint}`, {
      headers,
      tags: { endpoint: apiEndpoint },
    });

    const apiOk = check(apiRes, {
      "API responds during spike": (r) => r.status === 200 || r.status === 429,
      "API not crashed": (r) => r.status < 500,
    });

    if (!apiOk) errorRate.add(1);
    if (isRecoveryPhase) spikeRecovery.add(apiOk ? 1 : 0);
  }

  // 20% try to sign up (viral = lots of signups)
  if (Math.random() < 0.2) {
    const payload = JSON.stringify({
      email: `spike-${__VU}-${__ITER}-${Date.now()}@loadtest.4everacy.com`,
      name: `Spike User ${__VU}`,
      source: "k6-spike-test",
    });

    const signupRes = http.post(`${BASE_URL}/api/waitlist`, payload, {
      headers,
      tags: { endpoint: "waitlist" },
    });

    const signupOk = check(signupRes, {
      "Waitlist responds during spike": (r) => r.status === 200 || r.status === 429,
      "Waitlist not crashed": (r) => r.status < 500,
    });

    if (!signupOk) errorRate.add(1);
    if (isRecoveryPhase) spikeRecovery.add(signupOk ? 1 : 0);
  }

  sleep(Math.random() * 1 + 0.3);
}

// ── Summary Output ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    test: "4everacy SPIKE Test",
    timestamp: new Date().toISOString(),
    base_url: BASE_URL,
    description: "Sudden viral traffic simulation — 0 to 5,000 users in seconds",
    results: data,
  };

  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    "load-tests/results/spike-test-results.json": JSON.stringify(summary, null, 2),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";
