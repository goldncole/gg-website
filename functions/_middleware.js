// Cloudflare Pages Functions middleware — two independent password gates.
//
// Runs in front of EVERY route on the deployment (static pages, assets, etc.).
//
//   1) SITE GATE — the whole private preview is behind a single shared password
//      (SITE_PASSWORD) via the browser's native Basic-Auth prompt. The username
//      field is ignored, so you can hand out just one secret.
//
//   2) DEAL-MEMO GATE — the confidential /deal-memo/ page has its OWN separate
//      password (DEAL_MEMO_PASSWORD), shown through a branded unlock screen and
//      backed by a signed cookie. Because the cookie is sent to every path, a
//      person who only has the memo password can still load the page's assets
//      (CSS/fonts/images) without ever needing the site password — so the memo
//      link can be shared with investors independently of general site access.
//
// SETUP (Cloudflare dashboard → Workers & Pages → project → Settings →
// Variables and Secrets — add each as an *encrypted* variable, then redeploy):
//   SITE_PASSWORD       = <password for the whole private preview>
//   DEAL_MEMO_PASSWORD  = <separate password for the deal memo>
//
// FAIL-CLOSED: if a password is not configured, the corresponding area stays
// locked for everyone, so nothing can accidentally go public. Changing a
// password and redeploying immediately invalidates every existing session
// (site prompt re-appears; memo cookies stop validating).

const SITE_REALM = "Global Gold — Private Preview";
const MEMO_PATH = "/deal-memo";
const MEMO_COOKIE = "gg_dm";
const MEMO_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

/** Response for a failed SITE gate (native browser Basic-Auth prompt). */
function siteUnauthorized() {
  return new Response("Restricted — Global Gold private preview.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${SITE_REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
      // Belt-and-suspenders: never let a gated preview be indexed.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/** True if the request carries valid Basic-Auth for the site password. */
function hasValidSiteAuth(request, expected) {
  if (!expected) return false;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  // decoded is "username:password" — ignore the username, check the password.
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  return safeEqual(supplied, expected);
}

/** Static assets that any authenticated visitor (site OR memo) may load. */
function isAssetPath(pathname) {
  if (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/pagefind/")
  ) {
    return true;
  }
  if (
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt"
  ) {
    return true;
  }
  return /\.(css|js|mjs|map|woff2?|ttf|otf|eot|png|jpe?g|webp|avif|gif|svg|ico|json|xml|txt|pdf)$/i.test(
    pathname
  );
}

// Link-preview / social scrapers allowed to read Open Graph tags on the public
// marketing pages so shared links render a rich card even while the site is
// gated. The confidential /deal-memo/ keeps its own separate gate (checked
// first) and is NOT affected by this allow-list. Search-indexing crawlers
// (Googlebot/bingbot) are deliberately excluded so the preview site stays out
// of search results until it's public.
const PREVIEW_BOTS = [
  "facebookexternalhit", // Facebook + Apple iMessage rich links
  "Facebot",
  "Twitterbot",
  "Slackbot", // covers "Slackbot-LinkExpanding"
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
  "Discordbot",
  "Applebot", // Apple Messages / Spotlight preview
  "redditbot",
  "Pinterest",
  "vkShare",
  "SkypeUriPreview",
  "iframely",
];

function isPreviewBot(request) {
  const ua = request.headers.get("User-Agent") || "";
  return PREVIEW_BOTS.some((bot) => ua.includes(bot));
}

// A tiny set of assets that must be publicly fetchable (no password) so that
// link-preview cards render before the site is public: the OG image + brand
// icon and the usual crawler files.
function isPublicPreviewAsset(pathname) {
  return (
    pathname === "/images/og-image.jpg" ||
    pathname === "/images/gold-icon.png" ||
    pathname === "/images/gold-icon.webp" ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt"
  );
}

/** Derive the opaque cookie token from the memo password (SHA-256 hex). */
async function memoToken(password) {
  const data = new TextEncoder().encode(`${password}::gg-deal-memo::v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readCookie(request, name) {
  const jar = request.headers.get("Cookie") || "";
  const match = jar.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/** True if the request carries a valid, current memo cookie. */
async function hasValidMemoCookie(request, memoPassword) {
  if (!memoPassword) return false;
  const token = readCookie(request, MEMO_COOKIE);
  if (!token) return false;
  const expected = await memoToken(memoPassword);
  return safeEqual(token, expected);
}

function isMemoPath(pathname) {
  return pathname === MEMO_PATH || pathname.startsWith(MEMO_PATH + "/");
}

/** Branded unlock screen for the deal memo (self-contained; no gated assets). */
function memoUnlockResponse({ error = false, configured = true } = {}) {
  const message = !configured
    ? `<p class="note">Access is not yet configured. Please contact Global&nbsp;Gold.</p>`
    : error
      ? `<p class="err" role="alert">That password is not correct. Please try again.</p>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Global Gold — Confidential</title>
<style>
  :root{
    --gold:#C6A15B; --gold-deep:#8A6A3D; --gold-soft:#EFE8D6;
    --char:#2A2724; --graphite:#4A4A47; --stone:#D8D2C8;
    --paper:#F6F5F2; --rule:rgba(42,39,36,0.14);
    --serif-display:"Canela","Canela Deck",Georgia,serif;
    --serif-body:"EB Garamond",Georgia,"Times New Roman",serif;
    --sans:"Neue Haas Grotesk Text","Inter",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;height:100%;}
  body{
    background:var(--paper); color:var(--graphite);
    font-family:var(--serif-body);
    display:flex; align-items:center; justify-content:center;
    padding:24px;
    -webkit-font-smoothing:antialiased;
  }
  .card{ width:100%; max-width:420px; text-align:center; }
  .wordmark{
    font-family:var(--sans); font-weight:500;
    letter-spacing:.24em; text-transform:uppercase;
    font-size:.82rem; color:var(--gold-deep);
    margin:0 0 28px;
  }
  h1{
    font-family:var(--serif-display); font-weight:300;
    color:var(--char); font-size:clamp(1.9rem,6vw,2.5rem);
    line-height:1.1; margin:0 0 10px;
  }
  .lede{ font-size:1.02rem; line-height:1.5; color:var(--graphite); margin:0 auto 30px; max-width:34ch; }
  form{ display:flex; flex-direction:column; gap:14px; }
  label{ font-family:var(--sans); font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--graphite); text-align:left; }
  input[type=password]{
    width:100%; padding:14px 16px; font-size:1.05rem;
    font-family:var(--serif-body); color:var(--char);
    background:#fff; border:1px solid var(--rule); border-radius:2px;
    outline:none; transition:border-color .18s ease, box-shadow .18s ease;
  }
  input[type=password]:focus{ border-color:var(--gold); box-shadow:0 0 0 3px var(--gold-soft); }
  button{
    margin-top:4px; padding:14px 18px; cursor:pointer;
    font-family:var(--sans); font-weight:500; font-size:.8rem;
    letter-spacing:.14em; text-transform:uppercase;
    color:var(--paper); background:var(--char);
    border:1px solid var(--char); border-radius:2px;
    transition:background .18s ease, color .18s ease;
  }
  button:hover{ background:var(--gold-deep); border-color:var(--gold-deep); }
  .err{ color:#9a3412; font-size:.95rem; margin:0 0 4px; }
  .note{ color:var(--graphite); font-size:.95rem; margin:0 0 4px; }
  .confidential{ margin-top:30px; font-family:var(--sans); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone-warm,#9c8c72); }
</style>
</head>
<body>
  <main class="card">
    <p class="wordmark">Global Gold</p>
    <h1>Confidential</h1>
    <p class="lede">This document is access-restricted. Enter the password provided by Global&nbsp;Gold to continue.</p>
    ${message}
    <form method="POST" action="/deal-memo/" autocomplete="off">
      <label for="pw">Password</label>
      <input id="pw" name="password" type="password" autofocus required aria-label="Password" />
      <button type="submit">Unlock</button>
    </form>
    <p class="confidential">Seed Round Deal Memorandum</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: error || !configured ? 401 : 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const onRequest = async ({ request, env, next }) => {
  const sitePassword = env.SITE_PASSWORD;
  const memoPassword = env.DEAL_MEMO_PASSWORD;
  const { pathname } = new URL(request.url);

  // ── Deal-memo gate (separate password via branded unlock + cookie) ──
  if (isMemoPath(pathname)) {
    // Login attempt.
    if (request.method === "POST") {
      const form = await request.formData().catch(() => null);
      const supplied = form ? String(form.get("password") || "") : "";
      if (memoPassword && safeEqual(supplied, memoPassword)) {
        const token = await memoToken(memoPassword);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/deal-memo/",
            "Set-Cookie": `${MEMO_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MEMO_MAX_AGE}`,
            "Cache-Control": "no-store",
          },
        });
      }
      return memoUnlockResponse({ error: true, configured: Boolean(memoPassword) });
    }
    // Already unlocked → serve the page.
    if (await hasValidMemoCookie(request, memoPassword)) return next();
    // Otherwise show the unlock screen.
    return memoUnlockResponse({ configured: Boolean(memoPassword) });
  }

  // ── Public preview assets: OG image + brand icon are fetchable without any
  // password so shared-link previews render even while the site is gated. ──
  if (isPublicPreviewAsset(pathname)) return next();

  // ── Shared static assets: allow site-auth OR a valid memo cookie ──
  // (Lets a memo-only visitor load the page's CSS/fonts/images.) Preview
  // scrapers may also load assets so cards render fully.
  if (isAssetPath(pathname)) {
    if (
      hasValidSiteAuth(request, sitePassword) ||
      (await hasValidMemoCookie(request, memoPassword)) ||
      isPreviewBot(request)
    ) {
      return next();
    }
    return siteUnauthorized();
  }

  // ── Everything else: the shared site password (or a preview scraper, so it
  // can read the page's Open Graph tags — the deal-memo gate above is
  // unaffected). ──
  if (hasValidSiteAuth(request, sitePassword) || isPreviewBot(request)) {
    return next();
  }
  return siteUnauthorized();
};
