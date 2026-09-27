import {
  computeStage,
  parseWill,
  type State,
  type Transition,
  type Will,
} from '@maintainers-will/core';
import { renderBadge, type Badge } from './badge.js';
import { stageComment } from './comment.js';
import { checkInSignal, latestSignal, type CheckInContext, type Signal } from './signals.js';

export interface RunDeps {
  now: Date;
  ctx: CheckInContext;
  readWill(): Promise<string>;
  /** Previous persisted state, or null on the very first run. */
  readState(): Promise<State | null>;
  /** Maintainer signals gathered from the GitHub API this run. */
  fetchSignals(will: Will): Promise<Signal[]>;
  writeState(state: State): Promise<void>;
  writeBadge(badge: Badge): Promise<void>;
  postComment(body: string): Promise<void>;
  commit(paths: string[], message: string): Promise<void>;
  log(message: string): void;
}

export interface RunResult {
  transition: Transition;
  commented: boolean;
}

/** The baseline state written on the first run: the clock starts at install. */
function initialState(now: Date): State {
  const iso = now.toISOString();
  return { stage: 'active', last_seen: iso, last_signal: iso, stage_since: iso, notified: [] };
}

export async function run(deps: RunDeps): Promise<RunResult> {
  const { will } = parseWill(await deps.readWill());
  const prev = (await deps.readState()) ?? initialState(deps.now);

  const fetched = await deps.fetchSignals(will);
  const checkIn = checkInSignal(deps.ctx, will.maintainer, will.heartbeat.signals);
  const signals = checkIn ? [...fetched, checkIn] : fetched;
  const lastSignalAt = latestSignal(signals);

  const tx = computeStage(will, prev, { lastSignalAt, approvals: 0 }, deps.now);
  deps.log(`stage: ${tx.from} -> ${tx.state.stage}${tx.changed ? ' (changed)' : ''}`);

  await deps.writeState(tx.state);
  await deps.writeBadge(renderBadge(tx.state, deps.now));

  const body = stageComment(tx, will, deps.now);
  let commented = false;
  if (body) {
    await deps.postComment(body);
    commented = true;
  }

  await deps.commit(
    ['.will/state.json', '.will/badge.json'],
    `chore(will): heartbeat — ${tx.state.stage}`,
  );

  return { transition: tx, commented };
}
