import type { VaultIndex } from "./indexer";
import { headingText, slugifyHeading } from "./toc";
import { vaultImageUrl } from "./config";

/**
 * Rewrites an Obsidian-flavoured markdown document into source that MDX can
 * compile: relative images become API URLs, wikilinks become plain markdown
 * links, and characters MDX would read as JSX are escaped.
 *
 * Fenced code blocks are passed through untouched.
 */
export function sanitizeMdxSource(
  source: string,
  index?: Pick<VaultIndex, "fileMap"> | { fileMap?: Record<string, string> },
  docDirRel?: string
): string {
  // Pre-normalize currency ranges like $30k–$65k or $150k–$750k to HTML entities so remark-math does not treat them as math
  const preprocessed = source.replace(
    /\$([0-9]+(?:\.[0-9]+)?[kKmM]?)\s*([–—\-])\s*\$([0-9]+(?:\.[0-9]+)?[kKmM]?)/g,
    "&#36;$1$2&#36;$3"
  );

  // Protect multi-line fenced code blocks (```...```), inline code (`...`),
  // block math ($$...$$), and inline math ($...$)
  const protectedBlocksRegex =
    /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$(?!\s)[^$\n]+?(?<!\s)\$)/g;
  const chunks = preprocessed.split(protectedBlocksRegex);

  // Hoisted: built once per sanitizeMdxSource call, not once per chunk.
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|bmp|avif)(\?.*)?$/i;
  const isExternalSrc = (src: string): boolean =>
    /^(https?:\/\/|data:|blob:|mailto:|tel:|#|\/api\/)/i.test(src.trim());

  const resolveVaultFile = (raw: string): string | null => {
    const cleaned = raw.trim().replace(/^<|>$/g, "").trim();
    if (!cleaned || isExternalSrc(cleaned)) return null;
    // Split off query/hash that markdown titles may carry; keep path only.
    const pathOnly = cleaned.split(/[?#]/)[0] || cleaned;
    if (!pathOnly || isExternalSrc(pathOnly)) return null;
    const base = (docDirRel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    let resolved: string;
    if (pathOnly.startsWith("./") || pathOnly.startsWith("../")) {
      // `baseParts` named distinctly to avoid shadowing the outer `chunks` array.
      const baseParts = base ? base.split("/") : [];
      const segs: string[] = [...baseParts];
      for (const seg of pathOnly.split("/")) {
        if (seg === "." || seg === "") continue;
        if (seg === "..") {
          if (segs.length > 0) segs.pop();
          // else: would escape the vault root — drop it (image route also strips ../)
        } else {
          segs.push(seg);
        }
      }
      resolved = segs.join("/");
    } else if (pathOnly.startsWith("/")) {
      resolved = pathOnly.replace(/^\/+/, "");
    } else if (pathOnly.includes("/")) {
      // Vault-root-relative (Obsidian style): assets/maps/foo.png
      resolved = pathOnly.replace(/^\.\/+/, "");
    } else {
      resolved = base ? `${base}/${pathOnly}` : pathOnly;
    }
    resolved = resolved.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");
    // Defensive: never let ../ escape the vault.
    resolved = resolved.replace(/^(?:\.\.\/)+/, "");
    if (!resolved) return null;
    return resolved;
  };


  return chunks
    .map((chunk, idx) => {
      if (idx % 2 === 1) return chunk;

      // 1. Resolve images to /api/vault/image URLs.
      // Handles Obsidian embeds (![[path|alt]]), markdown images with
      // ./ / ../ / bare-filename / vault-root-relative paths, and <img src>.
      let s = chunk;

      // 1a. Obsidian image embeds: ![[assets/maps/foo.png|Alt]] or ![[./foo.jpg]]
      s = s.replace(
        /!\[\[([^\]\|#\r\n\\]+?)(?:#[^\]\|\r\n\\]+)?(?:\\?\|([^\]\r\n]*))?]]/g,
        (full, target, alias) => {
          const t = (target || "").trim();
          if (!t || !IMAGE_EXT.test(t)) return full;
          const resolved = resolveVaultFile(t);
          if (!resolved) return full;
          const alt = ((alias || t.split("/").pop() || t) as string).trim();
          return `![${alt}](${vaultImageUrl(resolved)})`;
        }
      );

      // 1b. Markdown images: ![alt](relative/path.jpg) — keep optional title.
      s = s.replace(
        /!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g,
        (full, alt, src, rest) => {
          const resolved = resolveVaultFile(src);
          if (!resolved) return full;
          return `![${alt}](${vaultImageUrl(resolved)}${rest || ""})`;
        }
      );

      // 1c. HTML <img src="relative/path.jpg"> — any relative form.
      s = s.replace(
        /<img([^>]*?)src=["']([^"']+)["']([^>]*?)\/?>/gi,
        (full, pre, src, post) => {
          const resolved = resolveVaultFile(src);
          if (!resolved) return full;
          return `<img${pre}src="${vaultImageUrl(resolved)}"${post}/>`;
        }
      );

      // 2. Pre-translate Obsidian wikilinks [[target#heading|alias]]
      // This is crucial for markdown tables, where unescaped `|` splits cells
      // and for aliases with backticks e.g. [[target|`alias`]]
      //
      // Inside a table Obsidian escapes the alias separator (`[[target\|alias]]`)
      // so it is not read as a cell boundary. Both spellings must resolve, so
      // the separator is matched as an optional backslash plus a pipe, and the
      // backslash is excluded from the target and anchor character classes —
      // otherwise they swallow it and it leaks into the generated URL, where a
      // trailing `\)` leaves the whole link unparsed.
      const wikilinkRegex =
        /\[\[([^\]\|#\r\n\\]+)?(?:#([^\]\|\r\n\\]+))?(?:\\?\|([^\]\r\n]+))?]]/g;
      s = s.replace(wikilinkRegex, (_, target, anchor, alias) => {
        const targetClean = (target || "").trim();
        const anchorClean = (anchor || "").trim();
        const aliasClean = (alias || targetClean || anchorClean).trim();

        // Defensive: a file wikilink that points at an image should load the
        // image, not a docs page (covers [[foo.png|alt]] without the !).
        if (targetClean && IMAGE_EXT.test(targetClean)) {
          const resolved = resolveVaultFile(targetClean);
          if (resolved) return `![${aliasClean}](${vaultImageUrl(resolved)})`;
        }

        // Unresolved target wikilink -> render ghost-link span (§2.2).
        //
        // The className carries NO Tailwind utilities on purpose. Utilities
        // compile into `@layer utilities`, which is ordered after
        // `@layer components` (see tailwindcss/index.css), and layer order is
        // evaluated before specificity — so any utility here would outrank the
        // `.ghost-link` rule in globals.css and shadow it, making `:hover`
        // unreachable. All presentation therefore lives in the stylesheet.
        const isIndexed = Boolean(index && index.fileMap);
        if (targetClean && isIndexed && !index?.fileMap?.[targetClean]) {
          return `<span className="ghost-link" title="Страница еще не создана">${aliasClean}</span>`;
        }

        let resolvedUrl = targetClean
          ? (index?.fileMap?.[targetClean] || `/docs/${targetClean}`)
          : "";
        if (anchorClean) {
          // Same slug algorithm as rehype-slug, so the anchor hits the rendered heading id.
          resolvedUrl += `#${slugifyHeading(headingText(anchorClean))}`;
        }
        if (!resolvedUrl) {
          resolvedUrl = "/docs";
        }
        return `[${aliasClean}](${resolvedUrl})`;
      });

      // 3. Escape lone < that are not part of HTML tags
      s = s.replace(/<(?![a-zA-Z/!?])/g, "&lt;");
      s = s.replace(/<br>/gi, "<br/>").replace(/<hr>/gi, "<hr/>");

      // 4. Escape curly braces outside of HTML tags
      const tagRegex = /(<\/?[a-zA-Z][^>]*>)/g;
      const subParts = s.split(tagRegex);
      return subParts
        .map((sub, sIdx) => {
          if (sIdx % 2 === 1) return sub;
          return sub.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
        })
        .join("");
    })
    .join("");
}
