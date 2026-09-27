import { parseDuration, parsePercentage, type Stage, type State, type Will } from '@maintainers-will/core';

const DAY_MS = 86_400_000;

export interface StatusReport {
  stage: Stage;
  lastSignal: string;
  seenDaysAgo: number;
  nextStage: Stage | null;
  daysUntilNext: number | null;
  note: string;
}

const days = (ms: number): number => Math.round(ms / DAY_MS);

export function statusReport(will: Will, state: State, now: Date): StatusReport {
  const elapsed = now.getTime() - new Date(state.last_signal).getTime();
  const dwell = now.getTime() - new Date(state.stage_since).getTime();

  const inactivity = parseDuration(will.heartbeat.inactivity);
  const remind = inactivity * parsePercentage(will.heartbeat.remind_at);
  const grace = parseDuration(will.heartbeat.grace);
  const accept = parseDuration(will.heartbeat.accept_within);

  let nextStage: Stage | null = null;
  let untilMs: number | null = null;

  switch (state.stage) {
    case 'active':
      nextStage = 'reminder';
      untilMs = remind - elapsed;
      break;
    case 'reminder':
      nextStage = 'warning';
      untilMs = inactivity - elapsed;
      break;
    case 'warning':
      nextStage = 'handover';
      untilMs = grace - dwell;
      break;
    case 'handover':
      nextStage = 'fallback';
      untilMs = accept - dwell;
      break;
    case 'fallback':
    case 'handed_over':
      nextStage = null;
      untilMs = null;
      break;
  }

  const seenDaysAgo = days(elapsed);
  const daysUntilNext = untilMs === null ? null : days(untilMs);
  const note =
    nextStage === null
      ? `Terminal stage: ${state.stage}.`
      : `Stage ${state.stage}; ~${daysUntilNext}d until ${nextStage} unless the maintainer signals.`;

  return {
    stage: state.stage,
    lastSignal: state.last_signal,
    seenDaysAgo,
    nextStage,
    daysUntilNext,
    note,
  };
}
