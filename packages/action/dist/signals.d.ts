import type { SignalKind } from '@maintainers-will/core';
export interface Signal {
    at: Date;
    kind: SignalKind;
    /** Short human-readable source, e.g. a commit sha or "workflow_dispatch". */
    via: string;
}
type Enabled = readonly SignalKind[];
export interface CommitLike {
    sha?: string;
    author: {
        login?: string;
    } | null;
    committer: {
        login?: string;
    } | null;
    commit: {
        author: {
            date?: string;
        } | null;
        committer: {
            date?: string;
        } | null;
    };
}
export declare function fromCommits(commits: CommitLike[], maintainers: string[], enabled: Enabled): Signal[];
export interface CommentLike {
    user: {
        login?: string;
    } | null;
    created_at: string;
    body?: string;
}
export declare function fromComments(comments: CommentLike[], maintainers: string[], enabled: Enabled): Signal[];
export interface ReviewLike {
    user: {
        login?: string;
    } | null;
    submitted_at?: string;
}
export declare function fromReviews(reviews: ReviewLike[], maintainers: string[], enabled: Enabled): Signal[];
export interface ReleaseLike {
    author: {
        login?: string;
    } | null;
    created_at: string;
    tag_name?: string;
}
export declare function fromReleases(releases: ReleaseLike[], maintainers: string[], enabled: Enabled): Signal[];
export interface CheckInContext {
    eventName: string;
    actor: string;
    now: Date;
}
/** A manual check-in: the maintainer ran the workflow via workflow_dispatch. */
export declare function checkInSignal(ctx: CheckInContext, maintainers: string[], enabled: Enabled): Signal | null;
/** The timestamp of the most recent signal, or null if there are none. */
export declare function latestSignal(signals: Signal[]): Date | null;
export {};
