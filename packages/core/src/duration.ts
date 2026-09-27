const DAY_MS = 86_400_000;
const UNIT_MS: Record<string, number> = {
  d: DAY_MS,
  w: 7 * DAY_MS,
  m: 30 * DAY_MS,
};

/** Parse a duration string like `180d`, `12w`, `6m` into milliseconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)([dwm])$/.exec(value);
  if (!match) {
    throw new Error(`invalid duration ${JSON.stringify(value)}; expected e.g. 180d, 12w, 6m`);
  }
  const [, amount, unit] = match;
  return Number(amount) * (UNIT_MS[unit as string] as number);
}

/** Parse a percentage string like `50%` into a fraction (0.5). */
export function parsePercentage(value: string): number {
  const match = /^(\d+)%$/.exec(value);
  if (!match) {
    throw new Error(`invalid percentage ${JSON.stringify(value)}; expected e.g. 50%`);
  }
  return Number(match[1]) / 100;
}
