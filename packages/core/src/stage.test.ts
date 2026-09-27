import { describe, expect, it } from 'vitest';
import { computeStage, type Signals, type State } from './stage.js';
import { parseWill } from './parse.js';

const will = parseWill(`---
will: 1
maintainer: octocat
heartbeat:
  inactivity: 180d
  remind_at: 50%
  grace: 30d
  accept_within: 60d
successors:
  - login: alice
quorum: 1
---
body
`).will;

const NOW = new Date('2026-09-27T00:00:00.000Z');
const daysAgo = (n: number): string =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

const stateAt = (stage: State['stage'], lastSignalDaysAgo: number, stageSinceDaysAgo = lastSignalDaysAgo): State => ({
  stage,
  last_seen: daysAgo(1),
  last_signal: daysAgo(lastSignalDaysAgo),
  stage_since: daysAgo(stageSinceDaysAgo),
  notified: [],
});

const noNewSignal: Signals = { lastSignalAt: null };

describe('computeStage', () => {
  it('stays active while within the reminder threshold', () => {
    const out = computeStage(will, stateAt('active', 30), noNewSignal, NOW);
    expect(out.state.stage).toBe('active');
    expect(out.changed).toBe(false);
  });

  it('active -> reminder at 50% of the inactivity window', () => {
    const out = computeStage(will, stateAt('active', 100), noNewSignal, NOW);
    expect(out.state.stage).toBe('reminder');
    expect(out.changed).toBe(true);
  });

  it('reminder -> warning at the inactivity window', () => {
    const out = computeStage(will, stateAt('reminder', 200), noNewSignal, NOW);
    expect(out.state.stage).toBe('warning');
    expect(out.changed).toBe(true);
    expect(out.state.stage_since).toBe(NOW.toISOString());
  });

  it('warning -> handover once the grace period has passed', () => {
    const out = computeStage(will, stateAt('warning', 200, 31), noNewSignal, NOW);
    expect(out.state.stage).toBe('handover');
  });

  it('warning stays warning during the grace period', () => {
    const out = computeStage(will, stateAt('warning', 200, 10), noNewSignal, NOW);
    expect(out.state.stage).toBe('warning');
    expect(out.changed).toBe(false);
  });

  it('handover -> handed_over when approvals reach quorum', () => {
    const out = computeStage(will, stateAt('handover', 220, 10), { lastSignalAt: null, approvals: 1 }, NOW);
    expect(out.state.stage).toBe('handed_over');
  });

  it('handover -> fallback when accept_within passes without quorum', () => {
    const out = computeStage(will, stateAt('handover', 280, 61), { lastSignalAt: null, approvals: 0 }, NOW);
    expect(out.state.stage).toBe('fallback');
  });

  it('handover stays put before accept_within and without quorum', () => {
    const out = computeStage(will, stateAt('handover', 220, 10), { lastSignalAt: null, approvals: 0 }, NOW);
    expect(out.state.stage).toBe('handover');
  });

  it('resets any active stage to active on a fresh maintainer signal', () => {
    for (const stage of ['reminder', 'warning', 'handover', 'fallback'] as const) {
      const out = computeStage(will, stateAt(stage, 200, 40), { lastSignalAt: NOW }, NOW);
      expect(out.state.stage, `reset from ${stage}`).toBe('active');
      expect(out.reset, `reset flag from ${stage}`).toBe(true);
      expect(out.state.last_signal).toBe(NOW.toISOString());
    }
  });

  it('does not flag a reset when already active', () => {
    const out = computeStage(will, stateAt('active', 200), { lastSignalAt: NOW }, NOW);
    expect(out.state.stage).toBe('active');
    expect(out.reset).toBe(false);
  });

  it('treats handed_over as terminal even if the maintainer returns', () => {
    const out = computeStage(will, stateAt('handed_over', 300, 5), { lastSignalAt: NOW }, NOW);
    expect(out.state.stage).toBe('handed_over');
    expect(out.reset).toBe(false);
  });

  it('uses the freshest signal between stored state and new observation', () => {
    // stored last_signal is 200d ago (warning), but a new signal 100d ago only
    // reaches the reminder band, not active.
    const out = computeStage(will, stateAt('warning', 200, 40), { lastSignalAt: new Date(NOW.getTime() - 100 * 86_400_000) }, NOW);
    expect(out.state.stage).toBe('reminder');
  });

  it('clears the notified log when the stage changes', () => {
    const prev = { ...stateAt('active', 100), notified: ['active'] };
    const out = computeStage(will, prev, noNewSignal, NOW);
    expect(out.state.stage).toBe('reminder');
    expect(out.state.notified).toEqual([]);
  });
});
