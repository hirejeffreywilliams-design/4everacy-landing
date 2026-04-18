/**
 * @copyright Copyright © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.
 * @product    4everacy Shield — Unified Security + Deception + Legal Forensics
 * @license    Proprietary — Internal Use Only
 *
 * Netlify Serverless Function: /api/_shield/canary/:token
 *
 * Receives canary token hits from decoy files embedded in the landing site.
 * This function fires when an attacker:
 *   1. Downloads a decoy file (.well-known/security.txt, /.env.sample-suspicious, etc.)
 *   2. Follows a canary URL embedded in that file
 *   3. OR triggers any other beacon in the landing site
 *
 * Captures: IP, UA, referrer, timestamp, token, headers.
 * Forwards to the 4everacy platform API for full forensic processing.
 *
 * LEGAL: We are capturing traffic TO OUR OWN SERVER only.
 * No code executes on the attacker's machine. 100% legal.
 */

const PLATFORM_API = process.env.PLATFORM_SHIELD_API_URL || "https://4everacy.app/api/internal/auth";
const ALERT_EMAIL = process.env.CANARY_ALERT_EMAIL || "";
const SIGNING_SECRET = process.env.SHIELD_FUNCTION_SECRET || "";

/**
 * Compute an HMAC-SHA256 over the event data using Node.js built-ins.
 * Used to verify the record hasn't been tampered with.
 */
async function hmacSign(data) {
  const { createHmac } = await import("node:crypto");
  const key = SIGNING_SECRET || "dev-fallback-not-for-production";
  return createHmac("sha256", key).update(JSON.stringify(data)).digest("hex");
}

/**
 * Extract the canary token from the URL path.
 * Supports: /api/_shield/canary/:token and /b/:token
 */
function extractToken(path) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

exports.handler = async function (event) {
  const token = extractToken(event.path);
  const ip =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "unknown";

  const forensicData = {
    source: "4everacy-landing",
    token: token || "unknown",
    ip,
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters || {},
    userAgent: event.headers["user-agent"] || "",
    referer: event.headers["referer"] || event.headers["referrer"] || "",
    acceptLanguage: event.headers["accept-language"] || "",
    timestamp: new Date().toISOString(),
    headers: {
      // Include security-relevant headers only
      "x-forwarded-for": event.headers["x-forwarded-for"],
      "x-real-ip": event.headers["x-real-ip"],
      "x-ja3-hash": event.headers["x-ja3-hash"],
      "x-ja4": event.headers["x-ja4"],
      "origin": event.headers["origin"],
    },
  };

  const signature = await hmacSign(forensicData);

  // Log to console (captured by Netlify function logs)
  console.error(
    JSON.stringify({
      level: "CRITICAL",
      event: "CANARY_TRIGGERED",
      source: "4everacy-landing",
      ...forensicData,
      signature,
    })
  );

  // Fire and forget — forward to platform API for full forensics pipeline
  if (PLATFORM_API) {
    fetch(PLATFORM_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shield-Source": "landing",
        "X-Shield-Signature": signature,
      },
      body: JSON.stringify(forensicData),
    }).catch(() => {
      // Non-fatal — log is already written above
    });
  }

  // Return a plausible response to keep the attacker engaged
  // (404 would tell them they've been caught; a 200 is more convincing)
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      status: "ok",
      token: token,
      verified: true,
      timestamp: new Date().toISOString(),
    }),
  };
};
