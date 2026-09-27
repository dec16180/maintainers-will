import { describe, expect, it } from 'vitest';
import { renderBadge } from './badge.js';
import type { State } from '@maintainers-will/core';

const NOW = new Date('2026-09-27T00:00:00Z');
const state = (stage: State['stage'], lastSignalDaysAgo: number): State => ({
  stage,
  last_seen: NOW.toISOString(),
  last_signal: new Date(NOW.getTime() - lastSignalDaysAgo * 86_400_000).toISOString(),
  stage_since: NOW.toISOString(),
  notified: [],
});

describe('renderBadge', () => {
  it('is a shields.io endpoint payload labelled "will"', () => {
    const b = renderBadge(state('active', 3), NOW);
    expect(b.schemaVersion).toBe(1);
    expect(b.label).toBe('will');
  });

  it('shows "active · seen Nd ago" in green when active', () => {
    const b = renderBadge(state('active', 3), NOW);
    expect(b.message).toBe('active · seen 3d ago');
    expect(b.color).toBe('green');
  });

  it('shows reminder as green/active too', () => {
    expect(renderBadge(state('reminder', 100), NOW).color).toBe('green');
  });

  it('maps warning to orange', () => {
    const b = renderBadge(state('warning', 180), NOW);
    expect(b.color).toBe('orange');
    expect(b.message).toBe('warning');
  });

  it('maps handover to red/succession', () => {
    const b = renderBadge(state('handover', 210), NOW);
    expect(b.color).toBe('red');
    expect(b.message).toBe('succession');
  });

  it('maps handed_over to blue', () => {
    expect(renderBadge(state('handed_over', 300), NOW)).toMatchObject({ color: 'blue', message: 'handed over' });
  });

  it('maps fallback to lightgrey/seeking adopter', () => {
    expect(renderBadge(state('fallback', 260), NOW)).toMatchObject({ color: 'lightgrey', message: 'seeking adopter' });
  });
});
