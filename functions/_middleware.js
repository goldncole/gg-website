// Cloudflare Pages Functions middleware — single shared-password gate.
//
// Runs in front of EVERY route on the deployment (static pages, assets, etc.).
// Visitors get the browser's native sign-in prompt; only the shared password
// matters (the username field is ignored, so you can hand out just one secret).
//
// SETUP (Cloudflare dashboard):
//   Workers & Pages → your project → Settings → Variables and Secrets
//   Add an *encrypted* variable named  SITE_PASSWORD  = <the password you give out>
//   (Optionally add it to the Preview environment too.)
//
// Then redeploy. To change/revoke access later, just edit SITE_PASSWORD and
// redeploy — every old session stops working.
//
// FAIL-CLOSED: if SITE_PASSWORD is not configured, the site stays locked for
// everyone, so it can never accidentally go fully public.

const REALM = "Global Gold — Private Preview";

/** Timing-safe-ish compare for two short strings. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function unauthorized() {
  return new Response("Restricted — Global Gold private preview.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      // Belt-and-suspenders: never let a gated preview be indexed.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const onRequest = async ({ request, env, next }) => {
  const expected = env.SITE_PASSWORD;

  // No password configured → stay locked (fail closed).
  if (!expected) return unauthorized();

  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      return unauthorized();
    }
    // decoded is "username:password" — ignore the username, check the password.
    const supplied = decoded.slice(decoded.indexOf(":") + 1);
    if (safeEqual(supplied, expected)) {
      return next();
    }
  }

  return unauthorized();
};
