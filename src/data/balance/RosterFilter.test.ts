import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadRosterExcludes } from './RosterFilter';

const VAR = 'FACTION_ROSTER_VOID_EXCLUDE';

describe('loadRosterExcludes', () => {
  beforeEach(() => { delete process.env[VAR]; });
  afterEach(() => { delete process.env[VAR]; });

  it('returns empty set when env var is unset', () => {
    expect(loadRosterExcludes('void').size).toBe(0);
  });

  it('parses comma-separated tower ids', () => {
    process.env[VAR] = 'void_gambler,void_spike';
    const s = loadRosterExcludes('void');
    expect(s.has('void_gambler')).toBe(true);
    expect(s.has('void_spike')).toBe(true);
    expect(s.size).toBe(2);
  });

  it('trims whitespace around ids', () => {
    process.env[VAR] = ' void_gambler , void_spike ';
    const s = loadRosterExcludes('void');
    expect(s.has('void_gambler')).toBe(true);
    expect(s.has('void_spike')).toBe(true);
  });

  it('drops empty entries from trailing commas', () => {
    process.env[VAR] = 'void_gambler,';
    const s = loadRosterExcludes('void');
    expect(s.size).toBe(1);
  });

  it('is faction-scoped — VOID env doesn\'t affect aliens', () => {
    process.env[VAR] = 'void_gambler';
    expect(loadRosterExcludes('aliens').size).toBe(0);
  });
});
