import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runPagefind, writeHeaders } from '../../lib/build';
import { DEFAULT_HEADERS } from '../../lib/files';

const dirUrl = (p: string) => new URL(pathToFileURL(p).href + '/');

function tmpProject() {
  const root = mkdtempSync(join(tmpdir(), 'ab-build-'));
  const dist = join(root, 'dist');
  const pub = join(root, 'public');
  mkdirSync(dist);
  mkdirSync(pub);
  return { dist, pub };
}

describe('writeHeaders', () => {
  it('writeHeaders merges user _headers', async () => {
    const { dist, pub } = tmpProject();
    writeFileSync(join(pub, '_headers'), '/admin/*\n  X-Robots-Tag: noindex\n/*\n  Referrer-Policy: no-referrer\n');
    await writeHeaders(dirUrl(dist), dirUrl(pub));
    const out = readFileSync(join(dist, '_headers'), 'utf8');
    expect(out).toContain('/admin/*\n  X-Robots-Tag: noindex\n');
    expect(out).toContain('X-Content-Type-Options: nosniff');
    expect(out).toContain('Referrer-Policy: no-referrer');
    expect(out).not.toContain('strict-origin-when-cross-origin');
  });

  it('writes our defaults when there is no public/_headers', async () => {
    const { dist, pub } = tmpProject();
    await writeHeaders(dirUrl(dist), dirUrl(pub));
    expect(readFileSync(join(dist, '_headers'), 'utf8')).toBe(DEFAULT_HEADERS);
  });
});

describe('runPagefind', () => {
  it('indexes the output directory into dist/pagefind', async () => {
    const { dist } = tmpProject();
    writeFileSync(join(dist, 'index.html'),
      '<!doctype html><html lang="es"><head><title>x</title></head><body><main data-pagefind-body><h1>Hola</h1><p>Contenido de prueba</p></main></body></html>');
    const res = await runPagefind(dirUrl(dist));
    expect(res.pages).toBe(1);
    expect(existsSync(join(dist, 'pagefind', 'pagefind.js'))).toBe(true);
  }, 60000);
});
