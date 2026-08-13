import { describe, it, expect } from 'vitest';
import { parseConversationDivider } from '../gradeReport.js';

describe('parseConversationDivider', () => {
  it('reads the persona name out of a divider line', () => {
    expect(parseConversationDivider('--- Conversation 1: SSG Lopez ---')).toBe('SSG Lopez');
  });

  it('handles the leading newline SubmissionsTab writes', () => {
    expect(parseConversationDivider('\n--- Conversation 2: COL Reyes ---')).toBe('COL Reyes');
  });

  it('handles double-digit conversation numbers', () => {
    expect(parseConversationDivider('--- Conversation 12: MAJ Okafor ---')).toBe('MAJ Okafor');
  });

  it('tolerates loose spacing around the separators', () => {
    expect(parseConversationDivider('---Conversation 3:SFC Bell---')).toBe('SFC Bell');
    expect(parseConversationDivider('  ---  Conversation 3 :  SFC Bell  ---  ')).toBe('SFC Bell');
  });

  it('keeps internal punctuation in the persona name', () => {
    expect(parseConversationDivider('--- Conversation 1: CPT Smith-Jones, Jr. ---')).toBe(
      'CPT Smith-Jones, Jr.',
    );
  });

  it('returns null for ordinary transcript messages', () => {
    expect(parseConversationDivider('Sir, I want to walk you through my recommendation.')).toBeNull();
    expect(parseConversationDivider('--- but that is not a divider ---')).toBeNull();
    expect(parseConversationDivider('Conversation 1: SSG Lopez')).toBeNull();
  });

  it('returns null when the persona name is missing', () => {
    expect(parseConversationDivider('--- Conversation 1: ---')).toBeNull();
  });

  it('does not match a divider buried mid-message', () => {
    expect(
      parseConversationDivider('I said --- Conversation 1: SSG Lopez --- in my paper'),
    ).toBeNull();
  });

  it('tolerates empty and non-string input', () => {
    expect(parseConversationDivider('')).toBeNull();
    expect(parseConversationDivider(null)).toBeNull();
    expect(parseConversationDivider(undefined)).toBeNull();
  });
});
