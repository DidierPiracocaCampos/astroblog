import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { build } from 'astro';

export async function buildFixture(name: string): Promise<{
  dist: string;
  read(path: string): Promise<string>;
  exists(path: string): boolean;
}> {
  const root = fileURLToPath(new URL(`../fixtures/${name}/`, import.meta.url));
  await build({ root, logLevel: 'error' });
  const dist = join(root, 'dist');
  return {
    dist,
    read: (path) => readFile(join(dist, path), 'utf8'),
    exists: (path) => existsSync(join(dist, path)),
  };
}
