import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const load = (lang: string) =>
  flatten(JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf-8')) as Tree);

// Russian plurals use _one/_few/_many, English _one/_other; compare base keys.
const base = (k: string) => k.replace(/_(one|few|many|other)$/, '');

describe('i18n resources (SC-007, Principle IV)', () => {
  const en = load('en');
  const ru = load('ru');

  it('have identical key sets', () => {
    const enKeys = [...new Set(Object.keys(en).map(base))].sort();
    const ruKeys = [...new Set(Object.keys(ru).map(base))].sort();
    expect(ruKeys).toEqual(enKeys);
  });

  it('have no empty values', () => {
    for (const [k, v] of Object.entries({ ...en, ...ru })) expect(v.trim(), k).not.toBe('');
  });
});
