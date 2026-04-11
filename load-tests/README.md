# 4EVERACY™ Load Testing Suite

> Powered by [k6](https://k6.io) — Open-source load testing tool by Grafana Labs

## Test Types

| Test | Users | Duration | Purpose |
|------|-------|----------|---------|
| **Smoke** | 5 | 2 min | Quick validation — all endpoints working? |
| **Load** | 500 | 15 min | Normal-to-peak traffic simulation |
| **Stress** | 5,000 | 16 min | Find the breaking point |
| **Spike** | 5,000 | 8 min | Sudden viral traffic simulation |

## Running Locally

```bash
# Install k6
brew install k6          # macOS
choco install k6         # Windows
sudo apt install k6      # Ubuntu/Debian

# Run smoke test (quick check)
k6 run load-tests/smoke-test.js

# Run load test (standard)
k6 run load-tests/load-test.js

# Run stress test (extreme)
k6 run load-tests/stress-test.js

# Run spike test (viral simulation)
k6 run load-tests/spike-test.js

# Override target URL
k6 run -e BASE_URL=https://4everacy.com load-tests/smoke-test.js
```

## GitLab CI/CD Integration

Load tests run automatically in the pipeline:

- **Smoke test** → Runs on every push (fast, catches regressions)
- **Load test** → Runs on `main`/`master` branch only (pre-deploy validation)
- **Stress test** → Manual trigger only (expensive, run before big launches)
- **Spike test** → Manual trigger only (simulates viral moments)

## Test Results

Results are saved as JSON artifacts in `load-tests/results/` and viewable in GitLab's CI/CD pipeline artifacts.

## Key Metrics

- **http_req_duration** — Response time (p90, p95, p99)
- **errors** — Percentage of failed checks
- **http_reqs** — Requests per second throughput
- **homepage_latency** — Landing page response time
- **api_latency** — API endpoint response time
- **waitlist_latency** — Waitlist signup response time

## Thresholds

| Metric | Smoke | Load | Stress |
|--------|-------|------|--------|
| p95 Response Time | <3s | <3s | <8s |
| Error Rate | <5% | <10% | <30% |
| API p95 | <1s | <1.5s | <5s |

## Architecture

```
4everacy-landing/
├── load-tests/
│   ├── smoke-test.js     → Quick validation (5 users)
│   ├── load-test.js      → Standard load (500 users)
│   ├── stress-test.js    → Breaking point (5,000 users)
│   ├── spike-test.js     → Viral simulation (5,000 users)
│   ├── README.md         → This file
│   └── results/          → Test output (gitignored)
└── .gitlab-ci.yml        → Pipeline with load-test stage
```

## Scaling Beyond 5,000 Users

For hundreds of thousands or millions of concurrent users:

1. **k6 Cloud** — Distributed testing from multiple regions ($$$)
2. **Self-hosted on AWS** — Spin up multiple EC2 instances running k6
3. **Azure Load Testing** — Managed service, integrates with GitLab

> **Note:** Netlify's CDN handles static content at massive scale automatically.
> The bottleneck will be your serverless functions and database connections.
