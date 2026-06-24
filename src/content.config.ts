import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// ---------------------------------------------------------------------
// JOURNAL — long-form editorial content collection (MDX).
// Add an article by dropping `src/content/journal/<slug>.mdx` with the
// frontmatter below; it is rendered through ArticlePage.astro and listed
// on /journal/ automatically (drafts excluded from the production build).
// ---------------------------------------------------------------------
const journal = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/journal" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Standfirst / dek shown under the headline and in listing cards. */
      dek: z.string(),
      category: z.string().default("Perspective"),
      tags: z.array(z.string()).default([]),
      author: z.string().default("Global Gold"),
      authorBio: z.string().optional(),
      publishDate: z.coerce.date(),
      heroImage: image().optional(),
      /** Optional explicit alt text for the hero image. */
      heroImageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

// ---------------------------------------------------------------------
// DOCS — protocol documentation collection (MDX). Authoring order and
// grouping is curated explicitly in src/config/docs-nav.ts (the single
// source of truth for the sidebar, breadcrumbs, and prev/next pager).
// `order` is an optional tiebreaker; `hidden` keeps a page off the nav.
// ---------------------------------------------------------------------
const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
    hidden: z.boolean().default(false),
  }),
});

export const collections = { journal, docs };
