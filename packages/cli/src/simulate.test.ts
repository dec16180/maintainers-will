import { describe, expect, it } from 'vitest';
import { simulate } from './simulate.js';
import { parseWill } from '@maintainers-will/core';

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

const START = new Date('2026-01-01T00:00:00Z');

describe('simulate', () => {
  it('walks the worst-case timeline through every stage with no signals', () => {
    const events = simulate(will, { start: START });
    const byStage = Object.fromEntries(events.map((e) => [e.stage, e.day]));
    expect(byStage.reminder).toBe(90);
    expect(byStage.warning).toBe(180);
    expect(byStage.handover).toBe(210);
    expect(byStage.fallback).toBe(270);
  });

  it('only records stage changes, starting from active on day 0', () => {
    const events = simulate(will, { start: START });
    expect(events[0]?.stage).toBe('active');
    expect(events[0]?.day).toBe(0);
    const stages = events.map((e) => e.stage);
    expect(stages).toEqual(['active', 'reminder', 'warning', 'handover', 'fallback']);
  });

  it('annotates each event with a human-readable note and ISO date', () => {
    const events = simulate(will, { start: START });
    const warning = events.find((e) => e.stage === 'warning');
    expect(warning?.date).toBe('2026-06-30'); // START + 180d
    expect(warning?.note.length).toBeGreaterThan(0);
  });
});
