import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseDuration, type State, type Will } from '@maintainers-will/core';
import { commitFiles, fetchSignals, findWillIssue, postComment, type Repo } from './github.js';
import { run, type RunDeps } from './run.js';
import type { Badge } from './badge.js';

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
  const willPath = core.getInput('will-file') || 'WILL.md';
  const explicitIssue = Number(core.getInput('will-issue-number')) || null;

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const target: Repo = { owner, repo };
  const now = new Date();

  const deps: RunDeps = {
    now,
    ctx: {
      eventName: github.context.eventName,
      actor: github.context.actor,
      now,
    },
    readWill: () => readFile(willPath, 'utf8'),
    readState: () => readJson<State>('.will/state.json'),
    async fetchSignals(will: Will) {
      const prev = await readJson<State>('.will/state.json');
      const window = parseDuration(will.heartbeat.inactivity);
      const floor = new Date(now.getTime() - window);
      const since =
        prev && new Date(prev.last_signal) < floor ? new Date(prev.last_signal) : floor;
      return fetchSignals(octokit, target, will, since);
    },
    writeState: (state) => writeJson('.will/state.json', state),
    writeBadge: (badge: Badge) => writeJson('.will/badge.json', badge),
    async postComment(body: string) {
      const issue = await findWillIssue(octokit, target, explicitIssue);
      if (issue == null) {
        core.warning('No Will issue found; skipping comment. Set will-issue-number to enable.');
        return;
      }
      await postComment(octokit, target, issue, body);
    },
    commit: (paths, message) => commitFiles(paths, message).then(() => undefined),
    log: (msg) => core.info(msg),
  };

  const result = await run(deps);
  core.setOutput('stage', result.transition.state.stage);
  core.setOutput('changed', String(result.transition.changed));
  core.info(
    `Heartbeat done: ${result.transition.state.stage}` +
      (result.commented ? ' (commented on Will issue)' : ''),
  );
}

main().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
