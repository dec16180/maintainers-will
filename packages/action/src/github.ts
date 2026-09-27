import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { getOctokit } from '@actions/github';
import type { Will } from '@maintainers-will/core';
import {
  fromComments,
  fromCommits,
  fromReleases,
  type Signal,
} from './signals.js';

const exec = promisify(execFile);
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
export async function fetchSignals(
  octokit: Octokit,
  { owner, repo }: Repo,
  will: Will,
  since: Date,
): Promise<Signal[]> {
  const maintainers = will.maintainer;
  const enabled = will.heartbeat.signals;
  const sinceIso = since.toISOString();
  const signals: Signal[] = [];

  if (enabled.includes('commits')) {
    const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since: sinceIso,
      per_page: 100,
    });
    signals.push(...fromCommits(commits as never, maintainers, enabled));
  }

  if (enabled.includes('comments')) {
    const comments = await octokit.paginate(octokit.rest.issues.listCommentsForRepo, {
      owner,
      repo,
      since: sinceIso,
      per_page: 100,
    });
    signals.push(...fromComments(comments as never, maintainers, enabled));
  }

  if (enabled.includes('releases')) {
    const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
      owner,
      repo,
      per_page: 100,
    });
    const recent = (releases as { created_at: string }[]).filter(
      (r) => new Date(r.created_at).getTime() >= since.getTime(),
    );
    signals.push(...fromReleases(recent as never, maintainers, enabled));
  }

  return signals;
}

/** Resolve the Will issue number: explicit input wins, else find by title. */
export async function findWillIssue(
  octokit: Octokit,
  { owner, repo }: Repo,
  explicit: number | null,
): Promise<number | null> {
  if (explicit && explicit > 0) return explicit;
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });
  const match = (issues as { number: number; title: string; pull_request?: unknown }[]).find(
    (i) => !i.pull_request && /maintainer'?s will/i.test(i.title),
  );
  return match?.number ?? null;
}

export async function postComment(
  octokit: Octokit,
  { owner, repo }: Repo,
  issueNumber: number,
  body: string,
): Promise<void> {
  await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

/** Commit the given paths with the bot identity and push. No-op if unchanged. */
export async function commitFiles(paths: string[], message: string): Promise<boolean> {
  await exec('git', ['config', 'user.name', "maintainers-will[bot]"]);
  await exec('git', [
    'config',
    'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ]);
  await exec('git', ['add', ...paths]);

  try {
    await exec('git', ['diff', '--cached', '--quiet']);
    return false; // nothing staged
  } catch {
    // non-zero exit => there are staged changes, proceed to commit
  }

  await exec('git', ['commit', '-m', message]);
  await exec('git', ['push']);
  return true;
}
