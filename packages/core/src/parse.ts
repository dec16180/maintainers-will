import { Ajv, type ErrorObject } from 'ajv';
import { parse as parseYaml } from 'yaml';
import schema from './will.v1.json' with { type: 'json' };
import type { Will } from './types.js';

export class WillParseError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`Invalid WILL.md:\n  - ${errors.join('\n  - ')}`);
    this.name = 'WillParseError';
    this.errors = errors;
  }
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

/** Matches a leading YAML front-matter block delimited by `---` fences. */
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ParsedWill {
  will: Will;
  /** The markdown body after the front-matter. */
  body: string;
}

export function parseWill(source: string): ParsedWill {
  const match = FRONT_MATTER.exec(source.replace(/^﻿/, ''));
  if (!match) {
    throw new WillParseError([
      'no YAML front-matter found; WILL.md must start with a `---` fenced block',
    ]);
  }
  const [, yaml, body = ''] = match;

  let raw: unknown;
  try {
    raw = parseYaml(yaml ?? '');
  } catch (err) {
    throw new WillParseError([`front-matter is not valid YAML: ${(err as Error).message}`]);
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new WillParseError(['front-matter must be a YAML mapping']);
  }

  if ('will' in raw && (raw as { will: unknown }).will !== 1) {
    throw new WillParseError([
      `unsupported schema version ${JSON.stringify((raw as { will: unknown }).will)}; this tool understands \`will: 1\``,
    ]);
  }

  if (!validate(raw)) {
    throw new WillParseError(formatErrors(validate.errors ?? []));
  }

  return { will: normalize(raw as unknown as RawWill), body };
}

interface RawWill {
  will: 1;
  maintainer: string | string[];
  heartbeat: {
    inactivity: string;
    remind_at?: string;
    grace?: string;
    accept_within?: string;
    signals?: Will['heartbeat']['signals'];
    scope?: Will['heartbeat']['scope'];
  };
  successors: Will['successors'];
  quorum?: number;
  grant?: Will['grant'];
  fallback?: Will['fallback'];
  registries?: Will['registries'];
  notify?: { sponsors?: boolean; channels?: Will['notify']['channels'] };
  change_cooldown?: string;
}

function normalize(raw: RawWill): Will {
  return {
    will: 1,
    maintainer: Array.isArray(raw.maintainer) ? raw.maintainer : [raw.maintainer],
    heartbeat: {
      inactivity: raw.heartbeat.inactivity,
      remind_at: raw.heartbeat.remind_at ?? '50%',
      grace: raw.heartbeat.grace ?? '30d',
      accept_within: raw.heartbeat.accept_within ?? '60d',
      signals: raw.heartbeat.signals ?? ['commits', 'comments', 'reviews', 'releases', 'check-in'],
      scope: raw.heartbeat.scope ?? 'repo',
    },
    successors: raw.successors,
    quorum: raw.quorum ?? 1,
    grant: raw.grant ?? 'write',
    fallback: raw.fallback ?? 'adopt',
    registries: raw.registries ?? [],
    notify: { sponsors: raw.notify?.sponsors ?? false, channels: raw.notify?.channels },
    change_cooldown: raw.change_cooldown ?? '30d',
  };
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((e) => {
    const where = e.instancePath || '(root)';
    if (e.keyword === 'additionalProperties') {
      return `${where}: unknown key \`${e.params.additionalProperty}\``;
    }
    if (e.keyword === 'enum') {
      return `${where} ${e.message} (${(e.params.allowedValues as unknown[]).join(', ')})`;
    }
    return `${where} ${e.message}`;
  });
}
