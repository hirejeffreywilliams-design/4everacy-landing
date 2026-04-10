// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — API Rate Limiter Edge Function
// Protects API endpoints from abuse at the edge before hitting functions
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory rate limit store (resets on deploy — use Netlify Blobs for persistence)
const rateLimitStore = new Map();

const RATE_LIMITS = {
  "/api/waitlist": { maxRequests: 5, windowMs: 60 * 1000 },       // 5 per minute
  "/api/health": { maxRequests: 60, windowMs: 60 * 1000 },        // 60 per minute
  "/webhook/stripe": { maxRequests: 100, windowMs: 60 * 1000 },   // 100 per minute (Stripe webhooks)
  default: { maxRequests: 30, windowMs: 60 * 1000 }               // 30 per minute default
};

function getRateLimit(path) {
  for (const [route, limit] of Object.entries(RATE_LIMITS)) {
    if (route !== "default" && path.startsWith(route)) {
      return limit;
    }
  }
  return RATE_LIMITS.default;
}

function isRateLimited(clientIP, path) {
  const key = `${clientIP}:${path}`;
  const now = Date.now();
  const limit = getRateLimit(path);

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { limited: false, remaining: limit.maxRequests - 1, resetAt: now + limit.windowMs };
  }

  const entry = rateLimitStore.get(key);

  // Reset window if expired
  if (now - entry.windowStart > limit.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { limited: false, remaining: limit.maxRequests - 1, resetAt: now + limit.windowMs };
  }

  entry.count++;

  if (entry.count > limit.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.windowStart + limit.windowMs,
      retryAfter: Math.ceil((entry.windowStart + limit.windowMs - now) / 1000)
    };
  }

  return { limited: false, remaining: limit.maxRequests - entry.count, resetAt: entry.windowStart + limit.windowMs };
}

// Cleanup old entries periodically
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 300000) { // 5 minutes
      rateLimitStore.delete(key);
    }
  }
}

export default async (request, context) => {
  const url = new URL(request.url);
  const clientIP = context.ip || request.headers.get("x-forwarded-for") || "unknown";
  const path = url.pathname;

  // Run cleanup occasionally
  if (Math.random() < 0.01) cleanup();

  const result = isRateLimited(clientIP, path);

  if (result.limited) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
        system: "4everacy™ OmniDLOS Protection"
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          "X-Powered-By": "4everacy™ OmniDLOS"
        }
      }
    );
  }

  // Not rate limited — continue to the function
  const response = await context.next();

  // Add rate limit headers to response
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-RateLimit-Remaining", String(result.remaining));
  newHeaders.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  });
};

export const config = {
  path: "/api/*"
};
