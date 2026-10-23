import { describe, it, expect } from 'vitest';
import { getUI, t } from '../../i18n/index';

describe('i18n', () => {
  it('merges ui overrides and interpolates', () => {
    expect(getUI('es', { readMore: 'Seguir' }).readMore).toBe('Seguir');
    expect(getUI('es').readMore).toBe('Leer más');
    expect(t(getUI('es').readingTime, { n: 4 })).toBe('4 min de lectura');
    expect(t(getUI('en').readingTime, { n: 4 })).toBe('4 min read');
  });
  it('keeps unknown placeholders and ignores unknown override keys', () => {
    expect(t('{a} {b}', { a: 1 })).toBe('1 {b}');
    expect(Object.keys(getUI('es', { bogus: 'x' } as any))).not.toContain('bogus');
  });
  it('en and es define the same keys', () => {
    expect(Object.keys(getUI('en')).sort()).toEqual(Object.keys(getUI('es')).sort());
  });
});
