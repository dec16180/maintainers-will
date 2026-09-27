import { describe, expect, it } from 'vitest';
import { stageComment } from './comment.js';
import { parseWill, type Transition, type State } from '@maintainers-will/core';

const will = parseWill(`---
will: 1
maintainer: octocat
heartbeat:
  inactivity: 180d
  grace: 30d
successors:
  - login: alice
  - login: bob
---
`).will;

const NOW = new Date('2026-09-27T00:00:00Z');
const baseState: State = {
  stage: 'active',
  last_seen: NOW.toISOString(),
  last_signal: NOW.toISOString(),
  stage_since: NOW.toISOString(),
  notified: [],
};

const tx = (over: Partial<Transition> & { state?: Partial<State> }): Transition => ({
  state: { ...baseState, ...(over.state ?? {}) },
  changed: over.changed ?? true,
  reset: over.reset ?? false,
  from: over.from ?? 'active',
});

describe('stageComment', () => {
  it('returns null when nothing changed and there is no reset', () => {
    expect(stageComment(tx({ changed: false, state: { stage: 'active' } }), will, NOW)).toBeNull();
  });

  it('mentions the maintainer on the reminder', () => {
    const c = stageComment(tx({ from: 'active', state: { stage: 'reminder' } }), will, NOW);
    expect(c).toContain('@octocat');
    expect(c).toMatch(/reminder/i);
  });

  it('mentions successors and maintainer on the warning, with a deadline', () => {
    const c = stageComment(
      tx({ from: 'reminder', state: { stage: 'warning', stage_since: NOW.toISOString() } }),
      will,
      NOW,
    );
    expect(c).toContain('@octocat');
    expect(c).toContain('@alice');
    expect(c).toContain('@bob');
    // grace 30d after warning -> 2026-10-27
    expect(c).toContain('2026-10-27');
  });

  it('marks handover as a dry run that grants no rights (v0.1)', () => {
    const c = stageComment(tx({ from: 'warning', state: { stage: 'handover' } }), will, NOW);
    expect(c).toMatch(/dry run/i);
    expect(c).toMatch(/no rights|grants no/i);
  });

  it('notes the maintainer is back on a reset', () => {
    const c = stageComment(
      tx({ from: 'warning', reset: true, state: { stage: 'active' } }),
      will,
      NOW,
    );
    expect(c).toContain('@octocat');
    expect(c).toMatch(/back|zurück/i);
  });
});
