// =====================================================================
// Docs interactions — mobile sidebar drawer, TOC scroll-spy, Cmd/Ctrl-K
// search modal (Pagefind), code-block copy buttons, and active-link sync
// for the transition:persist'd sidebar. Global listeners are attached
// once via document-level delegation so they survive <ClientRouter />
// swaps; per-page wiring (re)runs on every astro:page-load. Mirrors the
// patterns in motion.ts and FaqAccordion.astro.
// =====================================================================
import { docsOrder } from "../config/docs-nav";

const w = window as typeof window & { __ggDocsInit?: boolean };

const $ = <T extends Element = HTMLElement>(sel: string) =>
  document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) =>
  Array.from(document.querySelectorAll<T>(sel));

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------
// Sidebar drawer (mobile)
// ---------------------------------------------------------------------
function getSidebar() {
  return $("[data-docs-sidebar]");
}
function getDrawerToggle() {
  return $<HTMLButtonElement>("[data-docs-sidebar-toggle]");
}

let drawerLastFocused: HTMLElement | null = null;

function setDrawer(open: boolean) {
  const sidebar = getSidebar();
  const toggle = getDrawerToggle();
  if (!sidebar) return;

  if (!open && sidebar.contains(document.activeElement)) {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  sidebar.classList.toggle("is-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
  toggle?.setAttribute("aria-label", open ? "Close documentation menu" : "Open documentation menu");
  document.documentElement.classList.toggle("docs-drawer-open", open);

  if (open) {
    drawerLastFocused = toggle ?? null;
    requestAnimationFrame(() => {
      sidebar.querySelector<HTMLElement>("a, button")?.focus();
    });
  } else {
    drawerLastFocused?.focus();
    drawerLastFocused = null;
  }
}

const isDrawerOpen = () => Boolean(getSidebar()?.classList.contains("is-open"));

// ---------------------------------------------------------------------
// Search modal (Pagefind)
// ---------------------------------------------------------------------
type PagefindResult = {
  data: () => Promise<{
    url: string;
    excerpt: string;
    meta?: { title?: string };
  }>;
};
type Pagefind = {
  search: (q: string) => Promise<{ results: PagefindResult[] }>;
  options?: (o: Record<string, unknown>) => Promise<void>;
};

let pagefind: Pagefind | null = null;
let pagefindState: "idle" | "loading" | "ready" | "unavailable" = "idle";
let searchLastFocused: HTMLElement | null = null;
let searchSeq = 0;

async function loadPagefind(): Promise<Pagefind | null> {
  if (pagefindState === "ready") return pagefind;
  if (pagefindState === "unavailable") return null;
  pagefindState = "loading";
  try {
    // Built by `pagefind --site dist` after `astro build`; absent in dev.
    // The runtime-built path keeps Vite from trying to resolve it at build.
    const path = `${import.meta.env.BASE_URL ?? "/"}pagefind/pagefind.js`.replace(
      /\/\//g,
      "/",
    );
    const mod = (await import(/* @vite-ignore */ path)) as Pagefind;
    await mod.options?.({ excerptLength: 18 });
    pagefind = mod;
    pagefindState = "ready";
    return mod;
  } catch {
    pagefindState = "unavailable";
    return null;
  }
}

function groupForUrl(url: string): string {
  const slug = url.replace(/^.*\/docs\//, "").replace(/\/?(index\.html)?\/?$/, "");
  const entry = docsOrder.find((e) => e.slug === slug);
  return entry?.group ?? "Documentation";
}

function setSearchStatus(message: string) {
  const results = $("[data-docs-search-results]");
  if (results) {
    results.innerHTML = `<p class="docs-search__status">${message}</p>`;
  }
}

async function runSearch(query: string) {
  const results = $("[data-docs-search-results]");
  if (!results) return;
  const seq = ++searchSeq;
  const q = query.trim();

  if (!q) {
    setSearchStatus("Type to search the documentation.");
    return;
  }

  const pf = await loadPagefind();
  if (seq !== searchSeq) return; // a newer query superseded this one

  if (!pf) {
    setSearchStatus(
      "Search builds with the site — run <code>npm run build</code> to index the docs. (Pagefind only indexes the production output.)",
    );
    return;
  }

  setSearchStatus("Searching…");
  const res = await pf.search(q);
  if (seq !== searchSeq) return;

  const top = res.results.slice(0, 6);
  if (top.length === 0) {
    setSearchStatus(`No results for “${q}”.`);
    return;
  }

  const data = await Promise.all(top.map((r) => r.data()));
  if (seq !== searchSeq) return;

  results.innerHTML = data
    .map((d, i) => {
      const title = d.meta?.title ?? "Untitled";
      return `<a class="docs-result${i === 0 ? " is-active" : ""}" href="${d.url}" role="option" data-docs-result>
        <span class="docs-result__group">${groupForUrl(d.url)}</span>
        <p class="docs-result__title">${title}</p>
        <p class="docs-result__excerpt">${d.excerpt}</p>
      </a>`;
    })
    .join("");
}

function searchResultEls() {
  return $$<HTMLAnchorElement>("[data-docs-result]");
}

function moveSearchActive(dir: 1 | -1) {
  const els = searchResultEls();
  if (els.length === 0) return;
  const current = els.findIndex((el) => el.classList.contains("is-active"));
  let next = current + dir;
  if (next < 0) next = els.length - 1;
  if (next >= els.length) next = 0;
  els.forEach((el) => el.classList.remove("is-active"));
  els[next].classList.add("is-active");
  els[next].scrollIntoView({ block: "nearest" });
}

function setSearchOpen(open: boolean) {
  const modal = $("[data-docs-search]");
  const input = $<HTMLInputElement>("[data-docs-search-input]");
  if (!modal) return;

  if (open) {
    searchLastFocused = document.activeElement as HTMLElement | null;
    modal.hidden = false;
    document.documentElement.classList.add("docs-drawer-open");
    requestAnimationFrame(() => {
      input?.focus();
      input?.select();
    });
  } else {
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    modal.hidden = true;
    if (!isDrawerOpen()) document.documentElement.classList.remove("docs-drawer-open");
    searchLastFocused?.focus();
    searchLastFocused = null;
  }
}

const isSearchOpen = () => {
  const modal = $("[data-docs-search]");
  return Boolean(modal && !modal.hidden);
};

// ---------------------------------------------------------------------
// TOC scroll-spy
// ---------------------------------------------------------------------
let spy: IntersectionObserver | null = null;

function setActiveToc(id: string | null) {
  $$("[data-toc-link]").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("data-target") === id);
  });
}

function initScrollSpy() {
  spy?.disconnect();
  spy = null;

  const main = document.getElementById("docs-main");
  if (!main) return;
  const headings = Array.from(
    main.querySelectorAll<HTMLElement>("h2[id], h3[id]"),
  );
  const links = $$("[data-toc-link]");
  if (headings.length === 0 || links.length === 0) return;

  const visible = new Set<string>();

  spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });

      let activeId: string | null = null;
      for (const h of headings) {
        if (visible.has(h.id)) {
          activeId = h.id;
          break;
        }
      }
      // Nothing in the active band → use the last heading scrolled past.
      if (!activeId) {
        for (const h of headings) {
          if (h.getBoundingClientRect().top < 140) activeId = h.id;
        }
        if (!activeId) activeId = headings[0].id;
      }
      setActiveToc(activeId);
    },
    { rootMargin: "-110px 0px -68% 0px", threshold: 0 },
  );

  headings.forEach((h) => spy!.observe(h));
}

// ---------------------------------------------------------------------
// Code-block copy buttons
// ---------------------------------------------------------------------
function initCopyButtons() {
  const main = document.getElementById("docs-main");
  if (!main) return;
  main.querySelectorAll<HTMLPreElement>(".prose--docs pre").forEach((pre) => {
    if (pre.closest(".docs-code")) return;
    const wrap = document.createElement("div");
    wrap.className = "docs-code";
    pre.parentNode?.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "docs-code__copy";
    btn.textContent = "Copy";
    btn.setAttribute("data-docs-copy", "");
    btn.setAttribute("aria-label", "Copy code to clipboard");
    wrap.appendChild(btn);
  });
}

async function copyCode(btn: HTMLElement) {
  const code = btn.closest(".docs-code")?.querySelector("code");
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.textContent ?? "");
    btn.textContent = "Copied";
    btn.classList.add("is-copied");
    window.setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("is-copied");
    }, 1600);
  } catch {
    /* clipboard unavailable — no-op */
  }
}

// ---------------------------------------------------------------------
// Active sidebar link sync (the sidebar is transition:persist'd, so its
// server-rendered active state is stale after navigation).
// ---------------------------------------------------------------------
function syncActiveNav() {
  const path = location.pathname.replace(/\/+$/, "/");
  let active: HTMLElement | null = null;
  $$("[data-docs-nav-link]").forEach((link) => {
    const href = (link.getAttribute("href") ?? "").replace(/\/+$/, "/");
    const isActive = href === path;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
      active = link;
    } else {
      link.removeAttribute("aria-current");
    }
  });
  // Keep the active item in view within the (persisted) sidebar scroll box.
  (active as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
}

// ---------------------------------------------------------------------
// Global delegation (attach once)
// ---------------------------------------------------------------------
if (!w.__ggDocsInit) {
  w.__ggDocsInit = true;

  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    if (!target) return;

    if (target.closest("[data-docs-sidebar-toggle]")) {
      setDrawer(!isDrawerOpen());
      return;
    }
    if (target.closest("[data-docs-sidebar-backdrop]")) {
      setDrawer(false);
      return;
    }
    if (target.closest("[data-docs-search-open]")) {
      setSearchOpen(true);
      void runSearch(($<HTMLInputElement>("[data-docs-search-input]")?.value) ?? "");
      return;
    }
    if (target.closest("[data-docs-search-close]")) {
      setSearchOpen(false);
      return;
    }

    const copyBtn = target.closest<HTMLElement>("[data-docs-copy]");
    if (copyBtn) {
      void copyCode(copyBtn);
      return;
    }

    // A search result link navigates; close the modal so the router swap
    // isn't hidden behind the overlay.
    if (target.closest("[data-docs-result]")) {
      setSearchOpen(false);
      return;
    }

    // A drawer nav link was chosen → close the drawer (router handles nav).
    if (isDrawerOpen() && target.closest("[data-docs-sidebar] a")) {
      setDrawer(false);
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    // Open search with Cmd/Ctrl-K from anywhere on a docs page.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      if (!document.querySelector("[data-docs-search]")) return;
      e.preventDefault();
      setSearchOpen(!isSearchOpen());
      return;
    }

    if (isSearchOpen()) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSearchOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSearchActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSearchActive(-1);
      } else if (e.key === "Enter") {
        const active = $<HTMLAnchorElement>("[data-docs-result].is-active");
        if (active) {
          e.preventDefault();
          active.click();
        }
      }
      return;
    }

    if (e.key === "Escape" && isDrawerOpen()) {
      e.preventDefault();
      setDrawer(false);
    }
  });

  document.addEventListener("input", (e) => {
    const input = (e.target as Element | null)?.closest<HTMLInputElement>(
      "[data-docs-search-input]",
    );
    if (!input) return;
    void runSearch(input.value);
  });

  // Reset transient state before each navigation swap.
  document.addEventListener("astro:before-swap", () => {
    setDrawer(false);
    const modal = $("[data-docs-search]");
    if (modal) modal.hidden = true;
    document.documentElement.classList.remove("docs-drawer-open");
    spy?.disconnect();
    spy = null;
  });
}

// Per-page (re)wiring on first load and after every view-transition swap.
function setupPage() {
  if (!document.getElementById("docs-main") && !$("[data-docs-sidebar]")) return;
  syncActiveNav();
  initCopyButtons();
  initScrollSpy();
  setDrawer(false);
}

document.addEventListener("astro:page-load", setupPage);
