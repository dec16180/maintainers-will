import type { getOctokit } from '@actions/github';
import type { Will } from '@maintainers-will/core';
import { type Signal } from './signals.js';
type Octokit = ReturnType<typeof getOctokit>;
export interface Repo {
    owner: string;
    repo: string;
}
/**
 * Gather maintainer signals from the GitHub API. Read-only. v0.1 covers
 * commits (default branch), issue/PR comments and releases; reviews and
 * `scope: account` are best-effort and land in later versions.
 */
export declare function fetchSignals(octokit: Octokit, { owner, repo }: Repo, will: Will, since: Date): Promise<Signal[]>;
/** Resolve the Will issue number: explicit input wins, else find by title. */
export declare function findWillIssue(octokit: Octokit, { owner, repo }: Repo, explicit: number | null): Promise<number | null>;
export declare function postComment(octokit: Octokit, { owner, repo }: Repo, issueNumber: number, body: string): Promise<void>;
/** Commit the given paths with the bot identity and push. No-op if unchanged. */
export declare function commitFiles(paths: string[], message: string): Promise<boolean>;
export {};
