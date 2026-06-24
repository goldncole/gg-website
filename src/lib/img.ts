// Responsive image helper backed by the generated WebP manifest.
//
// The site references photography by string path (e.g. "/images/vaults.png")
// from data arrays and component props. `imgProps()` normalizes any such path to
// its optimized, responsive WebP set so a single `<img {...imgProps(src)} />`
// gets `src` (largest variant), `srcset`, and intrinsic `width`/`height`
// (for layout-shift prevention). Regenerate the manifest with
// `npm run optimize:images`.
import manifest from "./image-manifest.json";

export interface ImageEntry {
  width: number;
  height: number;
  src: string;
  srcset: string;
  variants: { w: number; h: number; src: string }[];
}

const MANIFEST = manifest as Record<string, ImageEntry>;

/** Resolve a "/images/foo.png" (or "foo", or "/images/foo.webp") to its base key. */
function baseKey(path: string): string {
  return path.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
}

/** The manifest entry for a referenced image path, or undefined if unmanaged. */
export function imageEntry(path: string): ImageEntry | undefined {
  return MANIFEST[baseKey(path)];
}

export interface ImgProps {
  src: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
}

/**
 * Props for a responsive `<img>`: largest WebP as `src`, full `srcset`, and
 * intrinsic width/height. Pass a `sizes` hint describing the rendered width so
 * browsers pick the smallest sufficient variant. Falls back to the raw path if
 * the image is not in the manifest (so nothing silently breaks).
 */
export function imgProps(path: string, sizes?: string): ImgProps {
  const entry = imageEntry(path);
  if (!entry) return { src: path };
  return {
    src: entry.src,
    srcset: entry.srcset,
    width: entry.width,
    height: entry.height,
    ...(sizes ? { sizes } : {}),
  };
}
