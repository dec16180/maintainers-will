import type { Stage, State } from '@maintainers-will/core';

/** shields.io endpoint badge payload (https://shields.io/endpoint). */
export interface Badge {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
}

const DAY_MS = 86_400_000;

const STYLE: Record<Stage, { message: (seen: string) => string; color: string }> = {
  active: { message: (seen) => `active · ${seen}`, color: 'green' },
  reminder: { message: (seen) => `active · ${seen}`, color: 'green' },
  warning: { message: () => 'warning', color: 'orange' },
  handover: { message: () => 'succession', color: 'red' },
  handed_over: { message: () => 'handed over', color: 'blue' },
  fallback: { message: () => 'seeking adopter', color: 'lightgrey' },
};

export function renderBadge(state: State, now: Date): Badge {
  const days = Math.floor((now.getTime() - new Date(state.last_signal).getTime()) / DAY_MS);
  const seen = `seen ${days}d ago`;
  const style = STYLE[state.stage];
  return {
    schemaVersion: 1,
    label: 'will',
    message: style.message(seen),
    color: style.color,
  };
}
