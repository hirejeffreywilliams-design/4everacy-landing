// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — Founders 5000™ Waitlist Function
// Handles waitlist signups from the landing page
// ═══════════════════════════════════════════════════════════════════════════════

export const handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://4everacy.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      },
      body: ""
    };
  }

  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const { email, name, source } = data;

    // Validate email
    if (!email || !email.includes("@")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Valid email is required" })
      };
    }

    // Rate limiting check (basic — use edge function for production)
    const clientIP = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";

    // TODO: Connect to your database (Drizzle ORM / PostgreSQL)
    // For now, log the signup — replace with actual DB write
    console.log(`[WAITLIST] New signup: ${email} | Name: ${name || "N/A"} | Source: ${source || "direct"} | IP: ${clientIP} | Time: ${new Date().toISOString()}`);

    // TODO: Send confirmation email via your email service
    // TODO: Add to Stripe as a lead
    // TODO: Trigger welcome sequence

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://4everacy.com",
        "X-Powered-By": "4everacy™ OmniDLOS"
      },
      body: JSON.stringify({
        success: true,
        message: "Welcome to the Founders 5000™! You're on the list.",
        position: Math.floor(Math.random() * 500) + 1, // Replace with actual position from DB
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error("[WAITLIST ERROR]", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
