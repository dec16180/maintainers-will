import { parseDuration, parsePercentage } from './duration.js';
import type { Will } from './types.js';

export type Stage =
  | 'active'
  | 'reminder'
  | 'warning'
  | 'handover'
  | 'handed_over'
  | 'fallback';

/** Persisted succession state, written to `.will/state.json` by the bot. */
export interface State {
  stage: Stage;
  /** ISO timestamp of the last heartbeat run. */
  last_seen: string;
  /** ISO timestamp of the most recent maintainer sign-of-life. */
  last_signal: string;
  /** ISO timestamp when the current stage was entered. */
  stage_since: string;
  /** Which stage notifications have already been sent. */
  notified: string[];
}

/** What the heartbeat observed this run. */
export interface Signals {
  /** Most recent maintainer sign-of-life, or null if none was found. */
  lastSignalAt: Date | null;
  /** Successor approvals recorded so far (handover gating). Defaults to 0. */
  approvals?: number;
}

export interface Transition {
  /** The new state to persist. */
  state: State;
  /** Did the stage change from the previous state? */
  changed: boolean;
  /** Did a fresh maintainer signal reset a non-active stage back to active? */
  reset: boolean;
  /** The stage before this evaluation. */
  from: Stage;
}

/**
 * Pure succession state machine. Given the will config, the previous state,
 * the signals observed this run and the current time, returns the next state.
 *
 * Idempotent: calling it repeatedly with the same inputs yields the same result.
 * All transitions from the spec are covered, including the reset-on-signal rule.
 */
export function computeStage(will: Will, prev: State, signals: Signals, now: Date): Transition {
  const from = prev.stage;
  const nowIso = now.toISOString();
  const approvals = signals.approvals ?? 0;

  // handed_over is terminal: rights have been granted, nothing reverts it here.
  if (from === 'handed_over') {
    return {
      state: { ...prev, last_seen: nowIso },
      changed: false,
      reset: false,
      from,
    };
  }

  // The clock runs off the freshest maintainer signal we know about.
  const storedSignal = new Date(prev.last_signal).getTime();
  const observed = signals.lastSignalAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const lastSignalMs = Math.max(storedSignal, observed);
  const lastSignalIso = new Date(lastSignalMs).toISOString();
  const elapsed = now.getTime() - lastSignalMs;

  const inactivity = parseDuration(will.heartbeat.inactivity);
  const remindThreshold = inactivity * parsePercentage(will.heartbeat.remind_at);

  let next: Stage;
  if (elapsed < remindThreshold) {
    next = 'active';
  } else if (elapsed < inactivity) {
    next = 'reminder';
  } else {
    // Past the inactivity window: at least warning. Later stages depend on how
    // long we have already dwelt in the current stage.
    next = advanceBeyondWarning(will, from, prev, approvals, now);
  }

  const changed = next !== from;
  const reset = changed && next === 'active' && from !== 'active';
  const stage_since = changed ? nowIso : prev.stage_since;
  const notified = changed ? [] : prev.notified;

  return {
    state: {
      stage: next,
      last_seen: nowIso,
      last_signal: lastSignalIso,
      stage_since,
      notified,
    },
    changed,
    reset,
    from,
  };
}

function advanceBeyondWarning(
  will: Will,
  from: Stage,
  prev: State,
  approvals: number,
  now: Date,
): Stage {
  const dwell = now.getTime() - new Date(prev.stage_since).getTime();

  switch (from) {
    case 'active':
    case 'reminder':
      return 'warning';
    case 'warning':
      return dwell >= parseDuration(will.heartbeat.grace) ? 'handover' : 'warning';
    case 'handover':
      if (approvals >= will.quorum) return 'handed_over';
      if (dwell >= parseDuration(will.heartbeat.accept_within)) return 'fallback';
      return 'handover';
    case 'fallback':
      return 'fallback';
    default:
      return from;
  }
}
