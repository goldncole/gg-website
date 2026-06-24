// =====================================================================
// DOCS IA — the single curated source of truth for the documentation
// information architecture. Drives the sidebar tree, the breadcrumb
// trail, and the prev/next pager ordering. `slug` matches a docs
// collection entry id (path under src/content/docs, no extension).
// Keep terminology aligned with the site: "Title Register" (not Ledger),
// "the operating company" (not "the LLC").
// =====================================================================

export interface DocsNavItem {
  /** Collection entry id, e.g. "protocol/title-register". */
  slug: string;
  label: string;
}

export interface DocsNavGroup {
  label: string;
  items: DocsNavItem[];
}

export const docsNav: DocsNavGroup[] = [
  {
    label: "Getting Started",
    items: [
      { slug: "getting-started/introduction", label: "Introduction" },
      { slug: "getting-started/how-global-gold-works", label: "How Global Gold Works" },
      { slug: "getting-started/glossary", label: "Glossary" },
      { slug: "getting-started/page-elements", label: "Page Elements" },
    ],
  },
  {
    label: "Protocol",
    items: [
      { slug: "protocol/title-register", label: "Title Register" },
      { slug: "protocol/tokenization", label: "Tokenization" },
      { slug: "protocol/collateralization", label: "Collateralization" },
      { slug: "protocol/liquidity", label: "Liquidity" },
      { slug: "protocol/reserve", label: "Reserve" },
      { slug: "protocol/security", label: "Security" },
    ],
  },
  {
    label: "Tokens",
    items: [
      { slug: "tokens/cct", label: "Conditional Claim Tokens" },
      { slug: "tokens/smu", label: "Standard Metal Units" },
      { slug: "tokens/usg", label: "U.S. Gold (USG)" },
      { slug: "tokens/gbars", label: "gBars" },
      { slug: "tokens/ggold", label: "gGold" },
      { slug: "tokens/goldn", label: "GOLDN" },
    ],
  },
  {
    label: "Governance",
    items: [{ slug: "governance/overview", label: "Overview" }],
  },
];

/** Flat, in-IA-order list of every item, each tagged with its group. */
export const docsOrder: Array<DocsNavItem & { group: string }> = docsNav.flatMap(
  (group) => group.items.map((item) => ({ ...item, group: group.label })),
);

export interface DocsLocation {
  item: DocsNavItem;
  group: string;
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
}

/** Resolve a slug to its IA context (group + neighbours) for breadcrumbs
 *  and the prev/next pager. Returns null for slugs not in the nav. */
export function getDocsLocation(slug: string): DocsLocation | null {
  const index = docsOrder.findIndex((entry) => entry.slug === slug);
  if (index === -1) return null;
  const entry = docsOrder[index];
  return {
    item: { slug: entry.slug, label: entry.label },
    group: entry.group,
    prev: index > 0 ? docsOrder[index - 1] : null,
    next: index < docsOrder.length - 1 ? docsOrder[index + 1] : null,
  };
}

/** Build the public route for a docs slug. */
export const docsHref = (slug: string): string => `/docs/${slug}/`;
