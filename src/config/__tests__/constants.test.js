import { describe, it, expect } from 'vitest';
import { parseEnvList, buildRotation, modelRotation } from '../constants.js';

describe('parseEnvList', () => {
  it('splits a comma-separated list', () => {
    expect(parseEnvList('key1,key2,key3')).toEqual(['key1', 'key2', 'key3']);
  });

  it('trims whitespace around entries', () => {
    expect(parseEnvList(' key1 , key2 ,key3 ')).toEqual(['key1', 'key2', 'key3']);
  });

  it('drops blank entries from trailing or doubled commas', () => {
    expect(parseEnvList('key1,,key2,')).toEqual(['key1', 'key2']);
    expect(parseEnvList('key1, ,key2')).toEqual(['key1', 'key2']);
  });

  it('returns a single-element list for one value', () => {
    expect(parseEnvList('only-key')).toEqual(['only-key']);
  });

  it('returns an empty list for unset or blank env vars', () => {
    expect(parseEnvList('')).toEqual([]);
    expect(parseEnvList('   ')).toEqual([]);
    expect(parseEnvList(',,')).toEqual([]);
    expect(parseEnvList(undefined)).toEqual([]);
    expect(parseEnvList(null)).toEqual([]);
  });
});

describe('buildRotation', () => {
  it('puts the primary model first', () => {
    expect(buildRotation('gemini-2.5-flash', ['gemini-2.5-pro'])).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ]);
  });

  it('preserves fallback order', () => {
    expect(buildRotation('a', ['b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops a fallback that duplicates the primary', () => {
    expect(buildRotation('a', ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('drops duplicates within the fallback list, keeping the first position', () => {
    expect(buildRotation('a', ['b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('trims model names and drops blanks', () => {
    expect(buildRotation('  a  ', ['', '  ', ' b '])).toEqual(['a', 'b']);
  });

  it('works with no fallbacks configured', () => {
    expect(buildRotation('a')).toEqual(['a']);
    expect(buildRotation('a', [])).toEqual(['a']);
  });

  it('returns an empty rotation when nothing is configured', () => {
    expect(buildRotation('', [])).toEqual([]);
    expect(buildRotation(undefined, [undefined, null])).toEqual([]);
  });
});

describe('modelRotation', () => {
  it('yields a non-empty, duplicate-free rotation from the defaults', () => {
    const rotation = modelRotation();
    expect(rotation.length).toBeGreaterThan(0);
    expect(new Set(rotation).size).toBe(rotation.length);
    expect(rotation.every((m) => typeof m === 'string' && m.length > 0)).toBe(true);
  });
});
