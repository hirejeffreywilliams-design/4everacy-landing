// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — Geo-Personalization Edge Function
// Runs at the edge (Deno) to personalize content based on visitor location
// ═══════════════════════════════════════════════════════════════════════════════

export default async (request, context) => {
  // Get geo data from Netlify edge
  const geo = context.geo;
  const country = geo?.country?.code || "US";
  const city = geo?.city || "Unknown";
  const region = geo?.subdivision?.code || "";
  const timezone = geo?.timezone || "America/New_York";

  // Get the response from origin
  const response = await context.next();

  // Only modify HTML responses
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  // Clone response and add geo headers for client-side use
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-Visitor-Country", country);
  newHeaders.set("X-Visitor-City", city);
  newHeaders.set("X-Visitor-Region", region);
  newHeaders.set("X-Visitor-Timezone", timezone);

  // Read and modify HTML to inject geo data
  let html = await response.text();

  // Inject geo data as a script tag before </head>
  const geoScript = `
    <script>
      window.__4EVERACY_GEO = {
        country: "${country}",
        city: "${city}",
        region: "${region}",
        timezone: "${timezone}"
      };
    </script>
  `;

  html = html.replace("</head>", `${geoScript}</head>`);

  return new Response(html, {
    status: response.status,
    headers: newHeaders
  });
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/.netlify/*", "/*.css", "/*.js", "/*.png", "/*.jpg", "/*.svg", "/*.ico", "/*.woff2"]
};
