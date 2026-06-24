# Global Gold — Website Image Specification

A complete catalog of every image the website references, with exact filenames, the code location that loads each one, current status, and precise creation guidance. Built so a non‑engineer can produce or replace each asset and have it drop straight into the site with no code changes (except where a code change is explicitly called out).

---

## How to read this spec

**CSS px vs. export px (the 2× rule).** Each entry lists two sizes:

- **Rendered size** = the largest the image is actually displayed at in the layout (read directly from the CSS, not guessed).
- **Export size** = what you should actually produce. We recommend **~2×** the rendered size so the image stays crisp on Retina / high‑DPI screens. For full‑bleed backgrounds we recommend a generous fixed width instead, because they stretch to the full viewport.

Always export at the **exact aspect ratio** the CSS enforces. Most images on this site sit inside a box with `object-fit: cover`, which means **anything that isn't the right ratio gets center‑cropped** — so a landscape photo dropped into a 4:5 slot will lose its sides. Several existing files are the wrong ratio and are being silently cropped today (flagged below).

**Layout widths used throughout the site** (from `src/styles/global.css`):

| Token | Value | Meaning |
|---|---|---|
| `--container` | 1320px | max content width (most pages) |
| `--container-narrow` | 820px | narrow reading column |
| `--gutter` | clamp(24px, 5vw, 96px) | left/right page padding |
| `--radius-img` | 12px | rounded corners on imagery (baked by CSS, don't add your own) |

So at desktop the real content band is roughly **1128px** wide (1320 − 2×96). A two‑up split column is therefore ~520–560px; a 4‑up card is ~255px.

**File‑format guidance.**

- **Photography / rendered marble scenes →** JPG or WebP. Use **WebP** where you can (smaller at the same quality); JPG is a safe universal fallback. Quality ~80. *Note: the codebase currently expects `.png` filenames for these — see "A note on file extensions" below.*
- **Diagrams, flows, schematics →** **SVG** (infinitely sharp, tiny). Only fall back to PNG if the diagram is rasterized.
- **Logo / emblem / icons with transparency →** **SVG** ideally, **PNG‑24 with alpha** otherwise.
- **Never** ship a 2 MB+ PNG of a photograph (many current files are exactly that — see the optimization note in the checklist).

**A note on file extensions (important).** The code references most photos as `.png`. The simplest drop‑in replacement is to **keep the same filename and extension** the code expects (e.g. save your new JPG/WebP content but name it `vaults.png`) — the browser reads the actual file, not the extension. If you'd rather use a proper `.webp`/`.jpg` extension, you must also edit the one line of code that references it (each is cited per entry). Either is fine; keeping the filename is zero‑code.

**Art direction (house style).** Keep it grounded in what already exists on the site:

- **Palette:** warm ivory / paper (`#F6F5F2`), aged marble in cool greys and bone whites, restrained **gold** accents (`#C6A15B` warm, `#8A6A3D` deep). No bright/saturated yellows, no neon.
- **Mood:** institutional, monumental, quiet, expensive. Think central‑bank reception hall, private vault, a single allocated bar on stone — not crypto/trading‑desk imagery, not stock‑photo handshakes.
- **Light:** soft, directional, warm‑neutral. Consistent across a set (especially the 8 audience cards and the 4 module renders) so grids feel like one family.
- **Typeface pairing it must sit beside:** Canela / EB Garamond serif display + Neue Haas Grotesk labels. The imagery should feel as composed as that type.

---

## Global / site‑wide assets

| Logical name | File path the code expects | Used where | Status | Export size | Ratio | Format |
|---|---|---|---|---|---|---|
| Emblem / logo mark | `public/images/gold-icon.png` | Favicon + every page (watermarks, emblems) | **Exists** (2272×2273) | ≥1024×1024 | 1:1 | PNG‑24 alpha (SVG ideal) |
| Favicon (SVG) | `public/favicon.svg` | *Not referenced* (orphan) | Orphan | 32–512 | 1:1 | SVG |
| Favicon (ICO) | `public/favicon.ico` | Browser auto‑request only | Exists (32×32) | 32/48 | 1:1 | ICO |
| OG / social share image | `public/images/og-default.png` *(suggested)* | **Recommended, not yet referenced** | **Missing (recommendation)** | 1200×630 | 1.91:1 | PNG/JPG |

**Emblem (`gold-icon.png`).** This single file does a lot of work and must look good everywhere from a 32px favicon up to a ~720px ghosted watermark. It is loaded in `src/layouts/Base.astro` (line 23, as the favicon), and rendered as a faint emblem/watermark in `HeroBlock.astro`, `TheStandard.astro`, `StandardHero.astro`, `Definition.astro`, and `blocks/PageHero.astro` (the no‑image inner‑page hero). It must be **square, centered, transparent background**, and read cleanly when desaturated and dimmed (the watermark CSS applies `grayscale` + low opacity). Keep generous internal padding so it isn't clipped when tiny. The current 2272² PNG is fine; an SVG version (same `gold-icon.png` swap not possible — would need a code path change) would be sharper at all sizes.

**Favicon cleanup.** The site actually uses `gold-icon.png` as its favicon, so the default Astro `favicon.svg` is unused, and `favicon.ico` is only hit by browsers' implicit `/favicon.ico` request. Optional: generate a proper favicon set (ICO + 180px Apple touch + 512 PNG) from the emblem; not required for the site to work.

**OG / social share image (recommendation).** There is currently **no** `og:image` / `twitter:image` anywhere (`Base.astro` sets only title + description). When the site is shared on Slack/X/LinkedIn it will have no preview image. Recommend creating a **1200×630** share card: ivory/marble ground, the gold emblem, the wordmark "Global Gold", and the line "The market standard for allocated gold." Keep key elements within a center safe area (~1080×566) since platforms crop edges. *This requires a small code edit to `Base.astro` to add the meta tags — flagged as a recommendation, not an existing requirement.*

---

## Home (`src/pages/index.astro`)

| Logical name | File path | Section / component | Status | Rendered | Export | Ratio | Format |
|---|---|---|---|---|---|---|---|
| Hero hall (full‑bleed) | `public/images/Hero-hall3.png` | `HeroMark.astro` | **Exists** (1672×941) | full viewport | **3200×1800** | 16:9 | JPG/WebP |
| Opening hall | `public/images/marble-hall-pillars.png` | `Opening.astro` | **Exists** (1122×1402) ✓ratio | ~525px | **1200×1500** | 4:5 | JPG/WebP |
| Market‑failure band (full‑bleed, dark) | `public/images/marble-gold-vein-hero.png` | `MarketFailure.astro` | **Exists but low‑res** (1024×682) | full viewport | **2560×1440** | 16:9 | JPG/WebP |
| Vault‑door proof | `public/images/vault-hall.png` | `Proof.astro` | **Exists** (1122×1402) ✓ratio | ~510px | **1200×1500** | 4:5 | JPG/WebP |
| Allocated bar (the resolve) | `public/images/gold-bar.png` | `FalseChoice.astro` | **Exists** (1304×1206) ≈ wrong ratio | ~445px | **1400×1120** | 5:4 | JPG/WebP |
| Module render 01 — The Bar | `public/images/module-01.png` | `Modules.astro` | **Exists** (1122×1402) ✓ratio | ~460px | **1120×1400** | 4:5 | JPG/WebP |
| Module render 02 — The Claim | `public/images/module-02.png` | `Modules.astro` | **Exists** (1122×1402) ✓ratio | ~460px | **1120×1400** | 4:5 | JPG/WebP |
| Module render 03 — The Unit | `public/images/module-03.png` | `Modules.astro` | **Exists** (1122×1402) ✓ratio | ~460px | **1120×1400** | 4:5 | JPG/WebP |
| Module render 04 — Round Trip | `public/images/module-04.png` | `Modules.astro` | **Exists** (1122×1402) ✓ratio | ~460px | **1120×1400** | 4:5 | JPG/WebP |

The eight audience images on the homepage are shared with the Solutions pages and are specified once in the **Ecosystem cards** table below.

**Hero hall — `HeroMark.astro` (`src/components/HeroMark.astro`, line 10).** The single most important image. It is pinned full‑screen behind the page and **progressively blurs** as the visitor scrolls (the content slides up over it). CSS: `object-fit: cover`, `object-position: center 42%`, `transform: scale(1.06)`. Implications: (1) export **large** (3200×1800) so the 1.06× overscale never reveals soft edges; (2) the **visual interest should sit slightly above center** (the 42% focal point) — a glowing marble wall panel / shaft of light works well; (3) the fixed **site header sits on top** and a white "Scroll" cue sits bottom‑center, so keep the very top and the bottom‑center calm and not busy; (4) it must look good even when blurred. Warm marble hall, soft golden light, no people, no text.

**Market‑failure band — `MarketFailure.astro` (line 17).** Full‑bleed (`100vw`) with a **dark gradient overlay baked in CSS** (≈78%→62% black) and ivory text + a row of gold‑hub city names on top. So: choose a **dark, atmospheric, low‑contrast** marble/gold‑vein image; avoid bright highlights on the left third where the headline sits. The current file is only 1024px wide — too small for a full‑bleed band; re‑export at ≥2560px. 16:9 is a safe shape; it will crop to whatever height the copy needs.

**Allocated bar — `FalseChoice.astro` (line 51).** CSS forces **5:4 landscape** (`aspect-ratio: 5/4`). The current `gold-bar.png` is ~1.08:1 (nearly square) so it is being cropped top/bottom. Re‑export a hero shot of a single **Global Gold 1000g allocated bar on marble**, composed for 5:4. This is the "payoff" image — make it the most beautiful single‑bar shot in the set.

**Module renders 01–04 — `Modules.astro` (lines 13, 23, 33, 43; rendered at `width="1122" height="1402"`).** A 4‑step auto‑rotating carousel (Bar → Claim → Unit → Round trip). These four **must be a tight visual set**: same bar, same lighting, same marble surface, same camera, telling a sequence. Already correctly 4:5 at 1122×1402 — keep that exact ratio. A small white "01 / 04" counter overlays the **top‑left** of each, so keep the top‑left uncluttered.

---

## The Standard (`src/pages/standard/index.astro`)

| Logical name | File path | Section / component | Status | Rendered | Export | Ratio | Format |
|---|---|---|---|---|---|---|---|
| Emblem watermark | `public/images/gold-icon.png` | `standard/StandardHero.astro`, `standard/Definition.astro` | **Exists** | ≤720px | (see Global) | 1:1 | PNG alpha |
| "What it solves" hall | `public/images/monumental-marble-hall.png` | `standard/StandardSolves.astro` | **Exists but wrong ratio** (1024×682, 3:2) | ~510px | **1200×1500** | 4:5 | JPG/WebP |
| Closing band (full‑bleed, dark) | `public/images/sacred-marble-threshold.png` | `standard/ClosingCta.astro` | **Exists but low‑res** (1024×682) | full viewport | **2560×1440** | 16:9 | JPG/WebP |

The Standard page also uses `Layers.astro`, `RoundTrip.astro`, and `StandardModules.astro` — these are **type/diagram‑in‑CSS only and reference no image files**, so nothing to produce there.

**"What it solves" hall — `StandardSolves.astro` (line 43).** Forced **4:5 portrait**; the current `monumental-marble-hall.png` is 3:2 landscape and is being cropped to a portrait slice. Re‑export a tall, monumental marble‑hall composition at 4:5. Quiet, columned, warm light — sibling to `Opening.astro`'s hall.

**Closing band — `ClosingCta.astro` (line 8).** Full‑bleed dark band (same dark‑overlay treatment as the market‑failure band) carrying centered ivory headline + CTAs. Pick a **dark marble threshold / doorway** image, low contrast, nothing bright dead‑center. Re‑export ≥2560px wide.

---

## Modules (shared `ModulePage` template + per‑page diagrams)

Template: `src/layouts/templates/ModulePage.astro`. Each module page has an **optional full‑width diagram band** (`diagram.src`, rendered ~1128px wide inside `.container`, full content width, rounded corners). **Every module diagram below is currently a PLACEHOLDER** pointing at a marble photo, not a real diagram.

| Logical name | File path currently referenced | Page (cite) | Status | Export | Ratio | Format |
|---|---|---|---|---|---|---|
| Title Register architecture | `public/images/vault-hall.png` *(placeholder)* | `pages/modules/title-register.astro:84` | **Placeholder** | 2000×1125 | 16:9 | **SVG** |
| Tokenization flow | `public/images/vault-hall.png` *(placeholder)* | `pages/modules/tokenization.astro:84` | **Placeholder** | 2000×1125 | 16:9 | **SVG** |
| Collateralization flow | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/modules/collateralization.astro:86` | **Placeholder** | 2000×1125 | 16:9 | **SVG** |
| Liquidity (gold/gold) | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/modules/liquidity.astro:87` | **Placeholder** | 2000×1125 | 16:9 | **SVG** |
| Reserve / routing loop | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/modules/reserve.astro:89` | **Placeholder** | 2000×1125 | 16:9 | **SVG** |
| Guardian approval flow (Security) | `public/images/vault-hall.png` *(placeholder)* | `pages/modules/security.astro:87` | **Placeholder** | 2000×1125 | 16:9 | **SVG** |

**How to make these drop‑in.** Because several pages currently point at the *same* placeholder file, you can't just overwrite one file — you need a **distinct diagram per page**. Recommended approach: create a real diagram for each (e.g. `public/images/diagram-title-register.svg`, `diagram-tokenization.svg`, `diagram-collateralization.svg`, `diagram-liquidity.svg`, `diagram-reserve.svg`, `diagram-security-guardian.svg`) and update the one `src:` line cited above on each page. Each page's inline comment and the `caption` field already describe what the diagram should show (e.g. Security: "proposed actions meet published approval thresholds before execution"). 

**Art direction for all diagrams.** Line‑based, restrained, on the ivory ground. Thin rules, small Neue‑Haas‑style labels, gold used only for emphasis/flow arrows. They should look like figures from an institutional white paper, not colorful infographics. Match the type/line vocabulary already used in `Layers.astro` / `RoundTrip.astro` on the Standard page.

---

## Tokens (shared `TokenPage` template + per‑page stack diagrams)

Template: `src/layouts/templates/TokenPage.astro`. Tokens use an **optional `overview.diagram`** rendered inside the narrow column (max ~820px wide). **All token diagrams below are PLACEHOLDERS.** `GOLDN` intentionally has **no** diagram.

| Logical name | File path currently referenced | Page (cite) | Status | Export | Ratio | Format |
|---|---|---|---|---|---|---|
| CCT — Bar→Claim→Unit stack | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/tokens/conditional-claim-tokens.astro:46` | **Placeholder** | 1600×1000 | 16:10 | **SVG** |
| SMU — where it sits in the stack | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/tokens/standard-metal-units.astro:47` | **Placeholder** | 1600×1000 | 16:10 | **SVG** |
| USG — jurisdiction‑SMU | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/tokens/standard-metal-units/usg.astro:46` | **Placeholder** | 1600×1000 | 16:10 | **SVG** |
| gGold — routing‑hub model | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/tokens/ggold.astro:48` | **Placeholder** | 1600×1000 | 16:10 | **SVG** |
| gBars — gGold‑loop / gBar | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/tokens/gbars.astro:51` | **Placeholder** | 1600×1000 | 16:10 | **SVG** |
| GOLDN | — | `pages/tokens/goldn.astro` | **No image needed** | — | — | — |

Same drop‑in caveat and art direction as the module diagrams (distinct files per page + update the cited `src:` line). The diagrams sit in the **narrow reading column**, so design them landscape but not super‑wide. Captions in each file describe the intended content (e.g. gGold: "gold units settle through gGold at the center of the on‑chain market").

---

## Solutions — 8 audience pages

Two image roles here:

**(A) The 8 audience cards** on the homepage Ecosystem grid (`src/components/Ecosystem.astro`) — these are real, final‑ish photos (exist), forced to **4:5 portrait**. ⚠️ All eight current files are **1536×1024 landscape** and are being center‑cropped to portrait — recommend re‑shooting/re‑exporting as true 4:5.

| Logical name | File path | Card (cite) | Status | Rendered | Export | Ratio | Format |
|---|---|---|---|---|---|---|---|
| Vaults | `public/images/vaults.png` | `Ecosystem.astro:8` | **Exists, wrong ratio** (1536×1024) | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| Refiners | `public/images/refinery.png` | `Ecosystem.astro:15` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| Blockchains & Protocols | `public/images/blockchain-protocol.png` | `Ecosystem.astro:22` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| DeFi Applications | `public/images/defi-user.png` | `Ecosystem.astro:29` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| Traders & Market Makers | `public/images/traders.png` | `Ecosystem.astro:36` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| Bullion Dealers | `public/images/bullion-dealer.png` | `Ecosystem.astro:43` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| Institutional Allocators | `public/images/allocators.png` | `Ecosystem.astro:50` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |
| Private Holders | `public/images/private-holders.png` | `Ecosystem.astro:57` | **Exists, wrong ratio** | ~440px | **1000×1250** | 4:5 | JPG/WebP |

> **Ecosystem cards — special art direction.** These 8 sit together in one grid, so they must read as a **cohesive set**: identical lighting, identical treatment, identical "weight." Each should evoke its audience without literal stock clichés — e.g. Vaults = vault door / allocated bars on shelving; Refiners = freshly cast bar; Bullion Dealers = counter / inventory; Institutional Allocators = restrained institutional interior; Traders = abstract market/marble; Blockchains & DeFi = the most abstract (marble + gold geometry, not literal "crypto"). Hover applies a subtle zoom, so leave a little breathing room around the subject. True 4:5 portrait.

**(B) The per‑page hero image** on each Solutions landing page (`SolutionPage` → `PageHero` split layout, forced **4:5** on desktop / **16:10** on mobile, rendered ~525px). **All 8 solution heroes are PLACEHOLDERS.** Several reuse the same `gold-bar-marble.png`, so they need **distinct** final files (keep the filename to stay zero‑code, or change the cited `src:` line).

| Logical name | File path currently referenced | Page (cite) | Status | Export | Ratio | Format |
|---|---|---|---|---|---|---|
| Vaults hero | `public/images/vault-door-hero.png` *(placeholder)* | `pages/solutions/vaults.astro:26` | **Placeholder** (1024×576) | 1200×1500 | 4:5 | JPG/WebP |
| Blockchain‑Protocols hero | `public/images/vault-hall.png` *(placeholder)* | `pages/solutions/blockchain-protocols.astro:33` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |
| DeFi‑Protocols hero | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/solutions/defi-protocols.astro:35` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |
| Bullion‑Dealers hero | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/solutions/bullion-dealers.astro:35` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |
| Refiners hero | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/solutions/refiners.astro:36` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |
| Traders hero | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/solutions/traders.astro:23` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |
| Private‑Holders hero | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/solutions/private-holders.astro:23` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |
| Institutional‑Allocators hero | `public/images/gold-bar-marble.png` *(placeholder)* | `pages/solutions/institutional-allocators.astro:24` | **Placeholder** | 1200×1500 | 4:5 | JPG/WebP |

> **Suggested distinct filenames** (then update the cited `src:` line on each page): `solution-vaults-hero.png`, `solution-blockchain-hero.png`, `solution-defi-hero.png`, `solution-bullion-hero.png`, `solution-refiners-hero.png`, `solution-traders-hero.png`, `solution-private-holders-hero.png`, `solution-allocators-hero.png`. Each inline `// PLACEHOLDER IMAGE` comment already states the intended subject (e.g. refiners → "freshly‑cast‑bar photography"; vaults → "final vault photography"). The hero can reuse the same subject as that audience's Ecosystem card, shot at higher fidelity.

---

## Governance (`GovernancePage` template)

`src/layouts/templates/GovernancePage.astro` supports an **optional** structure diagram (`structure.diagram`, rendered full content width ~1128px). The three governance pages (`council.astro`, `foundation.astro`, `how-its-governed.astro`) currently use the built‑in **branch cards instead of an image**, so **no governance image is referenced today**.

| Logical name | File path | Page | Status | Export | Ratio | Format |
|---|---|---|---|---|---|---|
| Separation‑of‑powers tri‑branch diagram | `public/images/diagram-governance.svg` *(suggested)* | `pages/governance/how-its-governed.astro` | **Optional / recommendation** | 2000×1125 | 16:9 | **SVG** |

If desired, a tri‑branch "Council / Foundation / Operating Company / Vaults" diagram could be added to How It's Governed by setting `structure.diagram` in that page. Same line‑based, institutional white‑paper style as the other diagrams. Not required.

---

## About (`src/pages/about.astro`)

**No images.** The About page uses only the text‑led `PageHero` (gold‑icon watermark, already covered globally) plus text blocks. Nothing to produce.

---

## Journal (`src/content/journal/*` + `ArticlePage` / journal index)

Article hero images come from the **content collection** (`src/content.config.ts`, `heroImage: image()`), live under `src/assets/`, and are processed by Astro's `<Image>` (it auto‑generates responsive sizes — so just supply one **high‑quality source**). The hero renders **full container width (up to 1320px)** on the article page and as **3:2 cards** on the journal index.

| Logical name | File path | Used where | Status | Export (source) | Ratio | Format |
|---|---|---|---|---|---|---|
| Journal sample/placeholder hero | `src/assets/journal/sample-hero.png` | `journal/custody-without-compromise.mdx:8`, `journal/the-case-for-a-gold-standard.mdx:9` | **Placeholder** (1024×682) shared by both sample posts | ≥2000×1333 | 3:2 | JPG/WebP |
| Real article hero (per future article) | `src/assets/journal/<slug>-hero.*` | set via `heroImage:` frontmatter | **Created per article** | ≥2000×1333 | 3:2 | JPG/WebP |

**Journal images.** Both current articles are explicitly marked "[Placeholder article]" and share one low‑res sample hero. For real articles, drop a **≥2000px‑wide, 3:2** image into `src/assets/journal/` and point the post's `heroImage:` frontmatter at it (and set `heroImageAlt:`). Astro handles resizing, so a single good source is enough — no need to export multiple sizes. Same warm‑marble/gold editorial mood; can be slightly more conceptual than the institutional pages.

---

## Docs (`src/content/docs/*`)

**No images.** The docs collection (`src/content.config.ts` `docs` schema) carries no image field, and none of the `.mdx` docs files embed images. The docs layout/components (`DocsLayout`, `DocsSidebar`, etc.) reference no image assets. Nothing to produce. (If docs diagrams are wanted later, add them as inline MDX `<img>`/SVG and spec them then.)

---

## Consolidated checklist — assets to CREATE or REPLACE

**Replace (exists, but placeholder or wrong ratio / too low‑res):**

- [ ] `public/images/Hero-hall3.png` — re‑export larger (3200×1800) for the full‑bleed, blurred homepage hero.
- [ ] `public/images/marble-gold-vein-hero.png` — replace low‑res (1024px) with ≥2560px dark full‑bleed band.
- [ ] `public/images/sacred-marble-threshold.png` — replace low‑res (1024px) with ≥2560px dark full‑bleed band.
- [ ] `public/images/monumental-marble-hall.png` — re‑export as true **4:5** (currently 3:2, being cropped).
- [ ] `public/images/gold-bar.png` — re‑export as true **5:4** hero of the allocated bar (currently ~square).
- [ ] `public/images/vaults.png`, `refinery.png`, `blockchain-protocol.png`, `defi-user.png`, `traders.png`, `bullion-dealer.png`, `allocators.png`, `private-holders.png` — re‑export the **8 audience cards** as true **4:5** (currently 1536×1024 landscape, being cropped), as one cohesive set.
- [ ] **8 Solutions hero images** (currently placeholders) — create distinct 4:5 photos and point each cited `src:` line at the new file (suggested names listed in the Solutions section). Files affected: `solutions/vaults.astro:26`, `blockchain-protocols.astro:33`, `defi-protocols.astro:35`, `bullion-dealers.astro:35`, `refiners.astro:36`, `traders.astro:23`, `private-holders.astro:23`, `institutional-allocators.astro:24`.
- [ ] `src/assets/journal/sample-hero.png` — replace with real article hero(es) when the placeholder articles are finalized.

**Create (new — real diagrams replacing photo placeholders):**

- [ ] **6 Module diagrams** (SVG) → `modules/title-register.astro:84`, `tokenization.astro:84`, `collateralization.astro:86`, `liquidity.astro:87`, `reserve.astro:89`, `security.astro:87`. Create distinct files and update each `src:`.
- [ ] **5 Token diagrams** (SVG) → `tokens/conditional-claim-tokens.astro:46`, `standard-metal-units.astro:47`, `standard-metal-units/usg.astro:46`, `ggold.astro:48`, `gbars.astro:51`. Create distinct files and update each `src:`.

**Create (recommendations — not currently required by code):**

- [ ] `public/images/og-default.png` — **1200×630** social/OG share card (requires adding `og:image`/`twitter:image` meta to `src/layouts/Base.astro`).
- [ ] Optional proper favicon set (ICO + 180px Apple touch + 512 PNG) from the emblem.
- [ ] Optional `diagram-governance.svg` for How It's Governed.

**Optimize (existing, working, but heavy):** Several in‑use PNGs are 2–2.6 MB photographs (`Hero-hall3`, `marble-hall-pillars`, `vault-hall`, the 8 audience cards, the 4 module renders, `gold-bar`). When replacing, export as **WebP/JPG ~80 quality** to cut page weight dramatically.

---

## Orphaned files (safe to delete — not referenced anywhere in `src/`)

| File | Notes |
|---|---|
| `public/images/Gold Bar.png` | Duplicate of `gold-bar.png` (same 1304×1206); the code uses the lowercase, no‑space name. |
| `public/images/hero-hall.png` | Superseded by `Hero-hall3.png`. |
| `public/images/hero-hall2.png` | Superseded by `Hero-hall3.png`. |
| `public/images/sovereign-reception.png` | Not referenced. |
| `public/images/vault-door-detail.png` | Not referenced. |
| `public/favicon.svg` | Default Astro favicon; site favicon is `gold-icon.png`. Delete only if you don't add a real favicon set. |

> Keep `public/favicon.ico` even though it isn't referenced in code — browsers request `/favicon.ico` implicitly.

---

*Generated from a read‑only audit of `src/` and `public/`. Every entry cites the exact code path so replacements are drop‑in. No site code was modified.*
