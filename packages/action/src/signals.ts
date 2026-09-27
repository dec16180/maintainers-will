import type { SignalKind } from '@maintainers-will/core';

export interface Signal {
  at: Date;
  kind: SignalKind;
  /** Short human-readable source, e.g. a commit sha or "workflow_dispatch". */
  via: string;
}

type Enabled = readonly SignalKind[];
const isMaintainer = (login: string | undefined | null, maintainers: string[]): boolean =>
  login != null && maintainers.includes(login);

export interface CommitLike {
  sha?: string;
  author: { login?: string } | null;
  committer: { login?: string } | null;
  commit: {
    author: { date?: string } | null;
    committer: { date?: string } | null;
  };
}

export function fromCommits(commits: CommitLike[], maintainers: string[], enabled: Enabled): Signal[] {
  if (!enabled.includes('commits')) return [];
  const out: Signal[] = [];
  for (const c of commits) {
    const byMaintainer =
      isMaintainer(c.author?.login, maintainers) || isMaintainer(c.committer?.login, maintainers);
    if (!byMaintainer) continue;
    const date = c.commit.committer?.date ?? c.commit.author?.date;
    if (!date) continue;
    out.push({ at: new Date(date), kind: 'commits', via: c.sha ? `commit ${c.sha.slice(0, 7)}` : 'commit' });
  }
  return out;
}

export interface CommentLike {
  user: { login?: string } | null;
  created_at: string;
  body?: string;
}

export function fromComments(comments: CommentLike[], maintainers: string[], enabled: Enabled): Signal[] {
  if (!enabled.includes('comments')) return [];
  const out: Signal[] = [];
  for (const c of comments) {
    if (!isMaintainer(c.user?.login, maintainers)) continue;
    const via = c.body?.trim().startsWith('/alive') ? '/alive check-in' : 'comment';
    out.push({ at: new Date(c.created_at), kind: 'comments', via });
  }
  return out;
}

export interface ReviewLike {
  user: { login?: string } | null;
  submitted_at?: string;
}

export function fromReviews(reviews: ReviewLike[], maintainers: string[], enabled: Enabled): Signal[] {
  if (!enabled.includes('reviews')) return [];
  const out: Signal[] = [];
  for (const r of reviews) {
    if (!isMaintainer(r.user?.login, maintainers) || !r.submitted_at) continue;
    out.push({ at: new Date(r.submitted_at), kind: 'reviews', via: 'review' });
  }
  return out;
}

export interface ReleaseLike {
  author: { login?: string } | null;
  created_at: string;
  tag_name?: string;
}

export function fromReleases(releases: ReleaseLike[], maintainers: string[], enabled: Enabled): Signal[] {
  if (!enabled.includes('releases')) return [];
  const out: Signal[] = [];
  for (const r of releases) {
    if (!isMaintainer(r.author?.login, maintainers)) continue;
    out.push({ at: new Date(r.created_at), kind: 'releases', via: r.tag_name ? `release ${r.tag_name}` : 'release' });
  }
  return out;
}

export interface CheckInContext {
  eventName: string;
  actor: string;
  now: Date;
}

/** A manual check-in: the maintainer ran the workflow via workflow_dispatch. */
export function checkInSignal(ctx: CheckInContext, maintainers: string[], enabled: Enabled): Signal | null {
  if (!enabled.includes('check-in')) return null;
  if (ctx.eventName !== 'workflow_dispatch') return null;
  if (!isMaintainer(ctx.actor, maintainers)) return null;
  return { at: ctx.now, kind: 'check-in', via: 'workflow_dispatch' };
}

/** The timestamp of the most recent signal, or null if there are none. */
export function latestSignal(signals: Signal[]): Date | null {
  let latest: Date | null = null;
  for (const s of signals) {
    if (latest === null || s.at.getTime() > latest.getTime()) latest = s.at;
  }
  return latest;
}
