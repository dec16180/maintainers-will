import { computeStage, parseDuration, type Stage, type State, type Will } from '@maintainers-will/core';

const DAY_MS = 86_400_000;

export interface SimEvent {
  day: number;
  date: string;
  stage: Stage;
  changed: boolean;
  note: string;
}

export interface SimOptions {
  start?: Date;
}

const NOTES: Record<Stage, string> = {
  active: 'Baseline: the maintainer is active; the clock starts here.',
  reminder: 'Half the window passed — the maintainer is mentioned in the Will issue (private nudge).',
  warning: 'Public warning: a pinned issue names the deadline and mentions the successors.',
  handover: 'Grace elapsed — successors are asked to approve (v0.1: dry run, no rights granted).',
  handed_over: 'A successor approved and rights were granted.',
  fallback: 'No approval in time — the fallback path runs (adopt/archive).',
};

/**
 * Dry-run the succession flow with no maintainer signals — the worst case —
 * and return one entry per stage change, from active on day 0 to a terminal
 * stage.
 */
export function simulate(will: Will, opts: SimOptions = {}): SimEvent[] {
  const start = opts.start ?? new Date();
  const startIso = start.toISOString();

  let state: State = {
    stage: 'active',
    last_seen: startIso,
    last_signal: startIso,
    stage_since: startIso,
    notified: [],
  };

  const events: SimEvent[] = [
    { day: 0, date: startIso.slice(0, 10), stage: 'active', changed: true, note: NOTES.active },
  ];

  const horizon =
    parseDuration(will.heartbeat.inactivity) +
    parseDuration(will.heartbeat.grace) +
    parseDuration(will.heartbeat.accept_within);
  const maxDays = Math.ceil(horizon / DAY_MS) + 5;

  for (let d = 1; d <= maxDays; d++) {
    const now = new Date(start.getTime() + d * DAY_MS);
    const tx = computeStage(will, state, { lastSignalAt: null, approvals: 0 }, now);
    state = tx.state;
    if (tx.changed) {
      events.push({
        day: d,
        date: now.toISOString().slice(0, 10),
        stage: tx.state.stage,
        changed: true,
        note: NOTES[tx.state.stage],
      });
      if (tx.state.stage === 'fallback' || tx.state.stage === 'handed_over') break;
    }
  }

  return events;
}
