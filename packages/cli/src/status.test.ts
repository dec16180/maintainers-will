import { describe, expect, it } from 'vitest';
import { statusReport } from './status.js';
import { parseWill, type State } from '@maintainers-will/core';

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
---
`).will;

const NOW = new Date('2026-09-27T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const state = (stage: State['stage'], lastSignalDaysAgo: number, stageSinceDaysAgo = lastSignalDaysAgo): State => ({
  stage,
  last_seen: daysAgo(0),
  last_signal: daysAgo(lastSignalDaysAgo),
  stage_since: daysAgo(stageSinceDaysAgo),
  notified: [],
});

describe('statusReport', () => {
  it('reports the days seen and the days until the reminder when active', () => {
    const r = statusReport(will, state('active', 30), NOW);
    expect(r.stage).toBe('active');
    expect(r.seenDaysAgo).toBe(30);
    expect(r.nextStage).toBe('reminder');
    expect(r.daysUntilNext).toBe(60); // reminder at 90d, 30d elapsed
  });

  it('counts down to warning when in the reminder stage', () => {
    const r = statusReport(will, state('reminder', 100), NOW);
    expect(r.nextStage).toBe('warning');
    expect(r.daysUntilNext).toBe(80); // warning at 180d
  });

  it('counts down grace to handover when warning', () => {
    const r = statusReport(will, state('warning', 185, 5), NOW);
    expect(r.nextStage).toBe('handover');
    expect(r.daysUntilNext).toBe(25); // grace 30d, 5d dwelt
  });

  it('has no next stage once handed over', () => {
    const r = statusReport(will, state('handed_over', 300), NOW);
    expect(r.nextStage).toBeNull();
    expect(r.daysUntilNext).toBeNull();
  });
});
