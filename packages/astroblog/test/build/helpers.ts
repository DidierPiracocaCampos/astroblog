import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build } from 'astro';

export interface BuiltFixture {
  dist: string;
  read(path: string): Promise<string>;
  exists(path: string): boolean;
}

// One build per fixture per worker: describe blocks / tests in the same file share it.
const cache = new Map<string, Promise<BuiltFixture>>();

export function buildFixture(name: string): Promise<BuiltFixture> {
  let pending = cache.get(name);
  if (!pending) {
    pending = runBuild(name);
    cache.set(name, pending);
    pending.catch(() => cache.delete(name));
  }
  return pending;
}

async function runBuild(name: string): Promise<BuiltFixture> {
  const root = fileURLToPath(new URL(`../fixtures/${name}/`, import.meta.url));
  await build({ root, logLevel: 'error' });
  const dist = join(root, 'dist');
  return {
    dist,
    read: (path) => readFile(join(dist, path), 'utf8'),
    exists: (path) => existsSync(join(dist, path)),
  };
}
