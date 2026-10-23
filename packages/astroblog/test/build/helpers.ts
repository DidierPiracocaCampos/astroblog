import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export interface BuiltFixture {
  dist: string;
  read(path: string): Promise<string>;
  exists(path: string): boolean;
}

/**
 * Read-only accessors over a fixture's dist. The build itself happens once per run in
 * test/build/global-setup.ts (every directory under test/fixtures), never from test files.
 */
export async function buildFixture(name: string): Promise<BuiltFixture> {
  const root = fileURLToPath(new URL(`../fixtures/${name}/`, import.meta.url));
  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    throw new Error(`fixture "${name}" has no dist at ${dist}; it is built by test/build/global-setup.ts (run the "build" vitest project).`);
  }
  return {
    dist,
    read: (path) => readFile(join(dist, path), 'utf8'),
    exists: (path) => existsSync(join(dist, path)),
  };
}
