import { describe, it, expect } from 'vitest';
import {
  stripCodeFences,
  extractJsonObject,
  parseModelJson,
  parseRetryAfterMs,
} from '../modelOutput.js';

describe('stripCodeFences', () => {
  it('unwraps a ```json block', () => {
    const text = '```json\n{"pathLabel":"Optimal"}\n```';
    expect(stripCodeFences(text).trim()).toBe('{"pathLabel":"Optimal"}');
  });

  it('unwraps a bare ``` block', () => {
    expect(stripCodeFences('```\n{"a":1}\n```').trim()).toBe('{"a":1}');
  });

  it('unwraps a fenced block that is preceded by prose', () => {
    const text = 'Here is the analysis:\n\n```json\n{"a":1}\n```\n\nHope that helps.';
    expect(stripCodeFences(text).trim()).toBe('{"a":1}');
  });

  it('leaves unfenced text alone', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });

  it('ignores a fenced block with no object in it', () => {
    const text = '```\nno json here\n```';
    expect(stripCodeFences(text)).toBe(text);
  });

  it('tolerates non-string input', () => {
    expect(stripCodeFences(null)).toBe('');
    expect(stripCodeFences(undefined)).toBe('');
  });
});

describe('extractJsonObject', () => {
  it('pulls an object out of surrounding prose', () => {
    expect(extractJsonObject('Sure thing! {"a":1} Let me know.')).toBe('{"a":1}');
  });

  it('keeps nested objects intact', () => {
    const json = '{"a":{"b":{"c":1}},"d":2}';
    expect(extractJsonObject(`noise ${json} noise`)).toBe(json);
  });

  it('stops at the object\'s real end, not a brace in trailing prose', () => {
    // The old greedy /\{[\s\S]*\}/ match ran to the last brace in the whole
    // string and produced invalid JSON here.
    const text = '{"summary":"ok"}\n\nNote: use {curly braces} carefully.';
    expect(extractJsonObject(text)).toBe('{"summary":"ok"}');
  });

  it('ignores braces inside string values', () => {
    const json = '{"note":"the leader said }{ and left","score":4}';
    expect(extractJsonObject(json)).toBe(json);
  });

  it('ignores braces inside escaped quotes', () => {
    const json = '{"note":"he said \\"}\\" out loud"}';
    expect(extractJsonObject(json)).toBe(json);
  });

  it('returns null when there is no object', () => {
    expect(extractJsonObject('no braces at all')).toBeNull();
    expect(extractJsonObject('')).toBeNull();
    expect(extractJsonObject(null)).toBeNull();
  });

  it('returns null when the object never closes', () => {
    expect(extractJsonObject('{"a":1')).toBeNull();
    expect(extractJsonObject('{"a":{"b":1}')).toBeNull();
  });
});

describe('parseModelJson', () => {
  it('parses a clean JSON response', () => {
    expect(parseModelJson('{"totalScore":18,"maxTotal":20}')).toEqual({
      totalScore: 18,
      maxTotal: 20,
    });
  });

  it('parses a response with surrounding whitespace', () => {
    expect(parseModelJson('\n\n  {"a":1}  \n')).toEqual({ a: 1 });
  });

  it('parses a fenced response', () => {
    expect(parseModelJson('```json\n{"severity":"Severe"}\n```')).toEqual({
      severity: 'Severe',
    });
  });

  it('parses a response wrapped in commentary', () => {
    const text = 'Certainly. Here is the JSON:\n{"pathLabel":"Path B"}\nLet me know if you need more.';
    expect(parseModelJson(text)).toEqual({ pathLabel: 'Path B' });
  });

  it('parses a fenced response followed by commentary containing braces', () => {
    const text = '```json\n{"pathLabel":"Optimal"}\n```\nI scored this via {rubric}.';
    expect(parseModelJson(text)).toEqual({ pathLabel: 'Optimal' });
  });

  it('preserves the full grade shape, including arrays and nested objects', () => {
    const grade = {
      summary: 'The student engaged all four subordinates.',
      criteria: [
        { name: 'Moral Courage', maxScore: 5, score: 4, rationale: 'Pushed back.' },
        { name: 'Career Stewardship', maxScore: 5, score: 3, rationale: 'Partial.' },
      ],
      totalScore: 7,
      maxTotal: 10,
      pathConfidence: 0.82,
    };
    expect(parseModelJson(JSON.stringify(grade))).toEqual(grade);
  });

  it('returns an empty object for the "{}" default used by callers', () => {
    expect(parseModelJson('{}')).toEqual({});
  });

  it('throws on empty or whitespace-only input', () => {
    expect(() => parseModelJson('')).toThrow(/unparseable/i);
    expect(() => parseModelJson('   \n ')).toThrow(/unparseable/i);
    expect(() => parseModelJson(null)).toThrow(/unparseable/i);
  });

  it('throws when the response contains no JSON at all', () => {
    expect(() => parseModelJson('I cannot help with that request.')).toThrow(
      /unparseable/i,
    );
  });

  it('throws on a malformed object rather than returning a partial one', () => {
    expect(() => parseModelJson('{"a":1,}}')).toThrow(/unparseable/i);
    expect(() => parseModelJson("{'a': 1}")).toThrow(/unparseable/i);
  });

  it('throws on a bare scalar, which is never a valid grade payload', () => {
    expect(() => parseModelJson('42')).toThrow(/unparseable/i);
    expect(() => parseModelJson('"just a string"')).toThrow(/unparseable/i);
    expect(() => parseModelJson('null')).toThrow(/unparseable/i);
  });
});

describe('parseRetryAfterMs', () => {
  it('reads a whole-second hint and pads it', () => {
    expect(parseRetryAfterMs('Quota exceeded, please retry in 12s')).toBe(12_500);
  });

  it('reads a fractional-second hint, rounding up', () => {
    expect(parseRetryAfterMs('retry in 12.5s')).toBe(13_000);
    expect(parseRetryAfterMs('retry in 0.2s')).toBe(700);
  });

  it('matches case-insensitively and with a space before the unit', () => {
    expect(parseRetryAfterMs('Please Retry In 3 s.')).toBe(3_500);
  });

  it('falls back to 60s when a message carries no hint', () => {
    expect(parseRetryAfterMs('HTTP 429')).toBe(60_000);
  });

  it('falls back to 30s when there is no message at all', () => {
    expect(parseRetryAfterMs('')).toBe(30_000);
    expect(parseRetryAfterMs(null)).toBe(30_000);
    expect(parseRetryAfterMs(undefined)).toBe(30_000);
  });

  it('accepts a non-string error payload without throwing', () => {
    expect(parseRetryAfterMs({ message: 'retry in 5s' })).toBe(60_000);
    expect(parseRetryAfterMs(429)).toBe(60_000);
  });
});
