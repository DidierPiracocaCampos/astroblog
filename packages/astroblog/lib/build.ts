/** Post-build steps run from `astro:build:done`. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';
import { DEFAULT_HEADERS, mergeHeaders } from './files';

async function readIfExists(url: URL): Promise<string | null> {
  try {
    return await readFile(url, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

/** Writes `<dir>/_headers`: our defaults merged with `public/_headers` (user rules win). */
export async function writeHeaders(dir: URL, publicDir: URL): Promise<void> {
  const user = await readIfExists(new URL('_headers', publicDir));
  await writeFile(new URL('_headers', dir), mergeHeaders(DEFAULT_HEADERS, user));
}

/** Indexes the built site with Pagefind into `<dir>/pagefind`. */
export async function runPagefind(dir: URL): Promise<{ pages: number }> {
  const path = fileURLToPath(dir);
  try {
    const { index, errors } = await pagefind.createIndex();
    if (!index) throw new Error(`astroblog: pagefind could not create an index: ${errors.join('; ')}`);
    const added = await index.addDirectory({ path });
    if (added.errors.length) throw new Error(`astroblog: pagefind indexing failed: ${added.errors.join('; ')}`);
    const written = await index.writeFiles({ outputPath: fileURLToPath(new URL('pagefind/', dir)) });
    if (written.errors.length) throw new Error(`astroblog: pagefind could not write files: ${written.errors.join('; ')}`);
    return { pages: added.page_count };
  } finally {
    // A failing close must not mask the original indexing error.
    try {
      await pagefind.close();
    } catch {
      /* ignore */
    }
  }
}
