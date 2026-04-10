// ═══════════════════════════════════════════════════════════════════════════════
// 4EVERACY™ — A/B Testing Edge Function
// Assigns visitors to test groups and tracks experiments at the edge
// ═══════════════════════════════════════════════════════════════════════════════

const EXPERIMENTS = {
  "hero-cta": {
    variants: ["founders-5000", "join-revolution", "lock-legacy"],
    weights: [0.34, 0.33, 0.33]
  },
  "pricing-layout": {
    variants: ["tiered", "comparison"],
    weights: [0.5, 0.5]
  }
};

function getOrAssignVariant(cookies, experimentId) {
  const cookieName = `4ev_ab_${experimentId}`;
  const existing = cookies.get(cookieName);
  if (existing) return { variant: existing, isNew: false };

  const experiment = EXPERIMENTS[experimentId];
  if (!experiment) return { variant: "control", isNew: false };

  // Weighted random assignment
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < experiment.variants.length; i++) {
    cumulative += experiment.weights[i];
    if (rand < cumulative) {
      return { variant: experiment.variants[i], isNew: true };
    }
  }
  return { variant: experiment.variants[0], isNew: true };
}

export default async (request, context) => {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  const cookies = context.cookies;
  const assignments = {};
  const newCookies = [];

  // Assign variants for each experiment
  for (const [expId] of Object.entries(EXPERIMENTS)) {
    const { variant, isNew } = getOrAssignVariant(cookies, expId);
    assignments[expId] = variant;
    if (isNew) {
      newCookies.push({
        name: `4ev_ab_${expId}`,
        value: variant,
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: "Lax",
        secure: true
      });
    }
  }

  let html = await response.text();

  // Inject experiment data before </head>
  const abScript = `
    <script>
      window.__4EVERACY_AB = ${JSON.stringify(assignments)};
    </script>
  `;
  html = html.replace("</head>", `${abScript}</head>`);

  const newResponse = new Response(html, {
    status: response.status,
    headers: response.headers
  });

  // Set new cookies
  for (const cookie of newCookies) {
    context.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure
    });
  }

  return newResponse;
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/.netlify/*", "/*.css", "/*.js", "/*.png", "/*.jpg", "/*.svg", "/*.ico"]
};
