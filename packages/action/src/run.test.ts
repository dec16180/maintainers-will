import { describe, expect, it, vi } from 'vitest';
import { run, type RunDeps } from './run.js';
import type { Signal } from './signals.js';
import type { State } from '@maintainers-will/core';

const WILL = `---
will: 1
maintainer: octocat
heartbeat:
  inactivity: 180d
  remind_at: 50%
  grace: 30d
successors:
  - login: alice
---
body
`;

const NOW = new Date('2026-09-27T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function deps(over: Partial<RunDeps> = {}): RunDeps {
  return {
    now: NOW,
    ctx: { eventName: 'schedule', actor: 'nobody', now: NOW },
    readWill: vi.fn(async () => WILL),
    readState: vi.fn(async () => null),
    fetchSignals: vi.fn(async (): Promise<Signal[]> => []),
    writeState: vi.fn(async () => {}),
    writeBadge: vi.fn(async () => {}),
    postComment: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    log: vi.fn(),
    ...over,
  };
}

describe('run', () => {
  it('on the first run (no state) establishes an active baseline and commits, without commenting', async () => {
    const d = deps();
    const res = await run(d);
    expect(res.transition.state.stage).toBe('active');
    expect(res.commented).toBe(false);
    expect(d.writeState).toHaveBeenCalledOnce();
    expect(d.writeBadge).toHaveBeenCalledOnce();
    expect(d.commit).toHaveBeenCalledOnce();
    expect(d.postComment).not.toHaveBeenCalled();
  });

  it('advances a stale active state to reminder and comments', async () => {
    const prev: State = {
      stage: 'active',
      last_seen: daysAgo(1).toISOString(),
      last_signal: daysAgo(100).toISOString(),
      stage_since: daysAgo(100).toISOString(),
      notified: [],
    };
    const d = deps({ readState: vi.fn(async () => prev) });
    const res = await run(d);
    expect(res.transition.state.stage).toBe('reminder');
    expect(res.commented).toBe(true);
    expect(d.postComment).toHaveBeenCalledOnce();
  });

  it('feeds fetched signals into the clock so a fresh commit keeps it active', async () => {
    const prev: State = {
      stage: 'reminder',
      last_seen: daysAgo(1).toISOString(),
      last_signal: daysAgo(100).toISOString(),
      stage_since: daysAgo(95).toISOString(),
      notified: [],
    };
    const fresh: Signal[] = [{ at: daysAgo(2), kind: 'commits', via: 'commit abc' }];
    const d = deps({ readState: vi.fn(async () => prev), fetchSignals: vi.fn(async () => fresh) });
    const res = await run(d);
    expect(res.transition.state.stage).toBe('active');
    expect(res.transition.reset).toBe(true);
  });

  it('counts a workflow_dispatch by the maintainer as a check-in', async () => {
    const prev: State = {
      stage: 'warning',
      last_seen: daysAgo(1).toISOString(),
      last_signal: daysAgo(200).toISOString(),
      stage_since: daysAgo(20).toISOString(),
      notified: [],
    };
    const d = deps({
      readState: vi.fn(async () => prev),
      ctx: { eventName: 'workflow_dispatch', actor: 'octocat', now: NOW },
    });
    const res = await run(d);
    expect(res.transition.state.stage).toBe('active');
    expect(res.transition.reset).toBe(true);
  });
});
