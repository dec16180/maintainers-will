import { describe, expect, it } from 'vitest';
import {
  fromCommits,
  fromComments,
  fromReviews,
  fromReleases,
  checkInSignal,
  latestSignal,
} from './signals.js';

const maintainers = ['octocat'];
const all = ['commits', 'comments', 'reviews', 'releases', 'check-in'] as const;

describe('fromCommits', () => {
  it('counts a commit authored by the maintainer', () => {
    const out = fromCommits(
      [
        {
          author: { login: 'octocat' },
          committer: { login: 'web-flow' },
          commit: { author: { date: '2026-09-01T00:00:00Z' }, committer: null },
        },
      ],
      maintainers,
      all,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.at.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('counts a commit only committed by the maintainer', () => {
    const out = fromCommits(
      [
        {
          author: { login: 'someone' },
          committer: { login: 'octocat' },
          commit: { author: { date: '2026-08-01T00:00:00Z' }, committer: { date: '2026-08-02T00:00:00Z' } },
        },
      ],
      maintainers,
      all,
    );
    expect(out).toHaveLength(1);
  });

  it('ignores commits by others (e.g. bots, dependabot)', () => {
    const out = fromCommits(
      [
        {
          author: { login: 'dependabot[bot]' },
          committer: { login: 'web-flow' },
          commit: { author: { date: '2026-09-01T00:00:00Z' }, committer: null },
        },
      ],
      maintainers,
      all,
    );
    expect(out).toHaveLength(0);
  });

  it('is skipped when commits are not an enabled signal', () => {
    const out = fromCommits(
      [
        {
          author: { login: 'octocat' },
          committer: null,
          commit: { author: { date: '2026-09-01T00:00:00Z' }, committer: null },
        },
      ],
      maintainers,
      ['comments'],
    );
    expect(out).toHaveLength(0);
  });
});

describe('fromComments', () => {
  it('counts any comment by the maintainer', () => {
    const out = fromComments(
      [{ user: { login: 'octocat' }, created_at: '2026-09-10T00:00:00Z', body: 'thanks!' }],
      maintainers,
      all,
    );
    expect(out).toHaveLength(1);
  });

  it('ignores comments by non-maintainers', () => {
    const out = fromComments(
      [{ user: { login: 'stranger' }, created_at: '2026-09-10T00:00:00Z', body: 'hi' }],
      maintainers,
      all,
    );
    expect(out).toHaveLength(0);
  });
});

describe('checkInSignal', () => {
  it('returns a signal when the maintainer dispatched the workflow', () => {
    const s = checkInSignal({ eventName: 'workflow_dispatch', actor: 'octocat', now: new Date('2026-09-20T00:00:00Z') }, maintainers, all);
    expect(s?.at.toISOString()).toBe('2026-09-20T00:00:00.000Z');
    expect(s?.kind).toBe('check-in');
  });

  it('returns null for a scheduled run', () => {
    const s = checkInSignal({ eventName: 'schedule', actor: 'octocat', now: new Date() }, maintainers, all);
    expect(s).toBeNull();
  });

  it('returns null when a non-maintainer dispatched it', () => {
    const s = checkInSignal({ eventName: 'workflow_dispatch', actor: 'stranger', now: new Date() }, maintainers, all);
    expect(s).toBeNull();
  });

  it('is skipped when check-in is not enabled', () => {
    const s = checkInSignal({ eventName: 'workflow_dispatch', actor: 'octocat', now: new Date() }, maintainers, ['commits']);
    expect(s).toBeNull();
  });
});

describe('fromReviews / fromReleases', () => {
  it('counts a maintainer review', () => {
    const out = fromReviews(
      [{ user: { login: 'octocat' }, submitted_at: '2026-07-01T00:00:00Z' }],
      maintainers,
      all,
    );
    expect(out).toHaveLength(1);
  });

  it('counts a maintainer release', () => {
    const out = fromReleases(
      [{ author: { login: 'octocat' }, created_at: '2026-06-01T00:00:00Z' }],
      maintainers,
      all,
    );
    expect(out).toHaveLength(1);
  });
});

describe('latestSignal', () => {
  it('returns the most recent signal date', () => {
    const at = latestSignal([
      { at: new Date('2026-01-01T00:00:00Z'), kind: 'commits', via: 'a' },
      { at: new Date('2026-05-01T00:00:00Z'), kind: 'comments', via: 'b' },
    ]);
    expect(at?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns null for no signals', () => {
    expect(latestSignal([])).toBeNull();
  });
});
