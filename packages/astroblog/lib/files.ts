/** Static file generators: ads.txt, robots.txt and Cloudflare Pages `_headers`. */

export function adsTxt(client: string): string {
  return `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`;
}

/** Without `sitemapUrl` (no `site`: only an absolute URL is valid there) the Sitemap line is omitted. */
export function robotsTxt(sitemapUrl?: string): string {
  const rules = 'User-agent: *\nAllow: /\n';
  return sitemapUrl ? `${rules}\nSitemap: ${sitemapUrl}\n` : rules;
}

export const DEFAULT_HEADERS = `/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/pagefind/*
  Cache-Control: public, max-age=3600
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;

/** Ordered map: path -> header lines (trimmed, verbatim). */
type Blocks = Map<string, string[]>;

/**
 * Parses `_headers` text. Unindented line = path; indented line = header.
 * Handles CRLF; drops blank lines, `#` comments and indented lines before any path.
 * Repeated paths are merged into the first occurrence.
 */
function parseHeaders(text: string): Blocks {
  const blocks: Blocks = new Map();
  let current: string[] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (/^\s/.test(line)) {
      current?.push(trimmed);
    } else {
      current = blocks.get(trimmed) ?? [];
      blocks.set(trimmed, current);
    }
  }
  return blocks;
}

/** Case-insensitive header name; lines without a colon are keyed by the whole line. */
function headerName(line: string): string {
  const i = line.indexOf(':');
  return (i === -1 ? line : line.slice(0, i)).trim().toLowerCase();
}

/**
 * Merges the user's `_headers` into ours. Per path, user headers replace ours with the same
 * name (case-insensitive); user-only paths are kept, after ours. Output is canonical:
 * paths unindented, headers with two-space indent, trailing newline.
 */
export function mergeHeaders(ours: string, user: string | null): string {
  const blocks = parseHeaders(ours);
  if (user) {
    for (const [path, userLines] of parseHeaders(user)) {
      const overridden = new Set(userLines.map(headerName));
      const kept = (blocks.get(path) ?? []).filter((l) => !overridden.has(headerName(l)));
      blocks.set(path, [...kept, ...userLines]);
    }
  }
  let out = '';
  for (const [path, lines] of blocks) {
    out += `${path}\n`;
    for (const l of lines) out += `  ${l}\n`;
  }
  return out;
}
