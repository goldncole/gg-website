import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Live instances for the current page. With <ClientRouter /> the page swaps in
// place, so we must explicitly tear these down before each navigation and
// recreate them after — otherwise Lenis instances and RAF loops stack up
// (the classic "smooth scroll gets faster every navigation" leak).
let lenis: Lenis | null = null;
let lenisRaf: ((time: number) => void) | null = null;

// Footer-reveal plumbing — torn down on every navigation so observers and
// listeners never stack across <ClientRouter /> swaps.
let footerObserver: ResizeObserver | null = null;
let onFooterViewportResize: (() => void) | null = null;

function initReveals() {
  const items = gsap.utils.toArray<HTMLElement>(".reveal");
  items.forEach((el) => {
    const delay = parseFloat(el.dataset.revealDelay ?? "0");
    gsap.fromTo(
      el,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay,
        ease: "power3.out",
        // Clear the leftover inline transform once the reveal lands. A lingering
        // transform (even translate(0,0)) keeps the element on its own snapped
        // compositor layer, which can paint over a neighbour's 1px hairline
        // border — dropping grid dividers (notably the last one in a row).
        clearProps: "transform",
        scrollTrigger: {
          trigger: el,
          start: "top 86%",
          toggleActions: "play none none none",
        },
      },
    );
  });
}

// The hero is pinned (position: fixed) and the page scrolls up over it. The
// image + emblem stay positionally static, but progressively blur as the page
// rises over them — matching the Auwa reveal. Homepage only: [data-hero]
// doesn't exist on /standard/, so this no-ops gracefully there.
//
// It also drops the hero from paint (visibility:hidden) once the content has
// fully risen over it. The hero is a full-viewport fixed layer, so left
// painting it would otherwise show through the content layer's *bottom* gap
// at the very end of the scroll — exactly where the pinned footer needs to be
// revealed. Hiding it at end:"top top" (the moment the content fully covers
// it, invisible to the user) lets the footer show through instead. Runs in
// both motion + reduced-motion modes because the footer reveal is pure layout.
function initHeroReveal() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const pageOver = document.querySelector<HTMLElement>(".page-over");
  if (!hero || !pageOver) return;

  const MAX_BLUR = 14; // px at full cover

  const apply = (progress: number) => {
    if (!prefersReducedMotion) {
      hero.style.setProperty("--hero-blur", `${(progress * MAX_BLUR).toFixed(2)}px`);
    }
    hero.style.visibility = progress >= 1 ? "hidden" : "visible";
  };

  ScrollTrigger.create({
    trigger: pageOver,
    start: "top bottom", // content base enters from the bottom (scroll ≈ 0)
    end: "top top", // content fully covers the hero (scrolled ~100svh)
    scrub: true,
    onUpdate: (self) => apply(self.progress),
    // Recompute after every refresh (resize / view-transition swap / font +
    // image load) so the hero can't get stuck hidden or visible.
    onRefresh: (self) => apply(self.progress),
  });
}

// Footer scroll-reveal — the mirror of the pinned hero. The footer is fixed
// behind the content (CSS, gated on html.footer-reveal); here we (1) measure
// its rendered height into --footer-h so the content layer reserves an exact
// bottom gap that uncovers it at the end of the scroll, and (2) decide whether
// to engage the reveal at all: a pinned footer taller than the viewport could
// never be shown in full and would sit under the header, so in that case we
// drop the class and let the footer be a normal in-flow block (graceful
// fallback, typical on mobile portrait). Re-measured on resize, font/image
// load, and view-transition swaps.
function initFooterReveal() {
  const footer = document.querySelector<HTMLElement>("[data-site-footer]");
  const root = document.documentElement;
  if (!footer) {
    root.classList.remove("footer-reveal");
    return;
  }

  const inner = footer.querySelector<HTMLElement>(".footer__inner");
  let footerH = 0;

  const measure = () => {
    const h = Math.ceil(footer.getBoundingClientRect().height);
    // Leave headroom below the wordmark line (56px) so a pinned footer never
    // reaches the header band.
    const fits = h > 0 && h <= window.innerHeight - 64;
    let changed = false;

    if (h > 0 && h !== footerH) {
      footerH = h;
      root.style.setProperty("--footer-h", `${h}px`);
      changed = true;
    }
    if (fits !== root.classList.contains("footer-reveal")) {
      root.classList.toggle("footer-reveal", fits);
      changed = true;
    }
    // When degraded to a normal in-flow footer, clear any leftover reveal
    // polish so the static footer isn't offset/faded.
    if (!fits && inner) {
      inner.style.transform = "";
      inner.style.opacity = "";
    }
    // Document height (margin) / footer positioning changed → keep
    // ScrollTrigger's cached measurements in sync.
    if (changed) ScrollTrigger.refresh();
  };

  measure();

  // ResizeObserver catches footer reflow (responsive columns, late fonts);
  // the resize listener catches viewport-height changes that flip `fits`.
  // Both defer to the next frame to avoid "ResizeObserver loop" warnings.
  footerObserver = new ResizeObserver(() => requestAnimationFrame(measure));
  footerObserver.observe(footer);
  onFooterViewportResize = () => requestAnimationFrame(measure);
  window.addEventListener("resize", onFooterViewportResize);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(measure));
  }

  // Optional polish: a gentle lift + fade on the footer content as the
  // curtain lifts. Pure enhancement — disabled under reduced motion; the
  // layout reveal works without it.
  if (!prefersReducedMotion && inner) {
    ScrollTrigger.create({
      start: () => Math.max(0, ScrollTrigger.maxScroll(window) - footerH),
      end: () => ScrollTrigger.maxScroll(window),
      scrub: true,
      onUpdate: (self) => {
        if (!root.classList.contains("footer-reveal")) {
          inner.style.transform = "";
          inner.style.opacity = "";
          return;
        }
        const p = self.progress;
        inner.style.transform = `translateY(${((1 - p) * 28).toFixed(1)}px)`;
        inner.style.opacity = (0.55 + 0.45 * p).toFixed(3);
      },
    });
  }
}

// The header chrome is dark ink by default; `is-over-dark` flips the wordmark +
// hamburger to white. White chrome must appear ONLY while something dark sits
// under the wordmark line: the homepage's pinned dark hero ([data-hero]), or any
// in-flow [data-header-dark] section (dark CtaBand / MarketFailure / footer …).
//
// This is derived from live geometry and recomputed on every scroll tick and
// every refresh, so the class is a pure function of "what is behind the header
// right now". An earlier design used edge-triggered onEnter/onLeaveBack +
// per-section onToggle handlers (two writers of the same class). If a refresh or
// view-transition swap initialised the hero trigger in its already-entered state
// the onEnter never re-fired on the way down, leaving the chrome stuck white over
// the light content. A continuously-recomputed state machine cannot get stuck.
function initHeaderTheme() {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  if (!header) return;

  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const pageOver = document.querySelector<HTMLElement>(".page-over");
  const darkSections = gsap.utils.toArray<HTMLElement>("[data-header-dark]");

  const LINE = 56; // approx. wordmark vertical center
  const HERO_THRESHOLD = 80; // hero covers the header until content rises this close to the top

  const sync = () => {
    let overDark = false;

    // Homepage: the fixed dark hero covers the header band until the light
    // .page-over content has scrolled up to within THRESHOLD of the top.
    if (hero && pageOver) {
      overDark = pageOver.getBoundingClientRect().top > HERO_THRESHOLD;
    }

    // Any in-flow dark section currently straddling the wordmark line.
    if (!overDark) {
      overDark = darkSections.some((sec) => {
        const r = sec.getBoundingClientRect();
        return r.top <= LINE && r.bottom > LINE;
      });
    }

    header.classList.toggle("is-over-dark", overDark);
  };

  // Route the sync through ScrollTrigger so it stays in lockstep with Lenis
  // (lenis.on("scroll", ScrollTrigger.update)) and re-runs on every refresh
  // (resize, view-transition swap, font/image load). Spanning the full scroll
  // range (start:0 → end:"max") keeps onUpdate firing the whole way down.
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: sync, onRefresh: sync });
  sync();
}

function teardown() {
  // Kill every ScrollTrigger (reveals, hero, header theme, footer polish) so
  // nothing references the outgoing DOM after the swap.
  ScrollTrigger.getAll().forEach((t) => t.kill());

  if (footerObserver) {
    footerObserver.disconnect();
    footerObserver = null;
  }
  if (onFooterViewportResize) {
    window.removeEventListener("resize", onFooterViewportResize);
    onFooterViewportResize = null;
  }

  if (lenisRaf) {
    gsap.ticker.remove(lenisRaf);
    lenisRaf = null;
  }
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}

function setup() {
  // Defensive: never stack a second Lenis/RAF if setup runs without a prior
  // teardown for any reason.
  if (lenis || lenisRaf) teardown();

  document.documentElement.classList.add("is-ready");

  if (prefersReducedMotion) {
    document.documentElement.classList.add("no-motion");
    // No smooth scroll/animation, but the header still needs to theme-swap,
    // and the footer reveal + hero un-paint are pure layout (no parallax).
    initHeaderTheme();
    initHeroReveal();
    initFooterReveal();
    ScrollTrigger.refresh();
    return;
  }

  // Smooth scroll
  lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);
  lenisRaf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);

  initReveals();
  initHeroReveal();
  initHeaderTheme();
  initFooterReveal();
  ScrollTrigger.refresh();
}

// astro:page-load fires on the initial load AND after every view-transition
// swap — (re)build motion each time. astro:before-swap fires before each
// navigation swap (never on first load) — tear motion down first.
document.addEventListener("astro:page-load", setup);
document.addEventListener("astro:before-swap", teardown);
