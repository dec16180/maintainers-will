#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseWill, WillParseError, type State } from '@maintainers-will/core';
import { renderWillMd, renderWorkflow } from './templates.js';
import { statusReport } from './status.js';
import { simulate } from './simulate.js';

const WILL_PATH = 'WILL.md';
const WORKFLOW_PATH = '.github/workflows/maintainers-will.yml';
const STATE_PATH = '.will/state.json';

function parseFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

const exists = (p: string): Promise<boolean> =>
  access(p).then(() => true, () => false);

async function readWill(file: string) {
  let source: string;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    console.error(`No ${file} found. Run \`maintainers-will init\` first.`);
    process.exit(1);
  }
  try {
    return parseWill(source);
  } catch (err) {
    if (err instanceof WillParseError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

async function cmdInit(flags: Record<string, string | boolean>): Promise<void> {
  const force = flags.force === true;
  if ((await exists(WILL_PATH)) && !force) {
    console.error(`${WILL_PATH} already exists. Use --force to overwrite.`);
    process.exit(1);
  }

  let maintainer = typeof flags.maintainer === 'string' ? flags.maintainer : '';
  let successorsRaw = typeof flags.successors === 'string' ? flags.successors : '';
  let inactivity = typeof flags.inactivity === 'string' ? flags.inactivity : '';

  if (!maintainer || !successorsRaw || !inactivity) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      maintainer ||= (await rl.question('Your GitHub login (the maintainer): ')).trim();
      successorsRaw ||= (
        await rl.question('Successor logins, comma-separated (first = primary): ')
      ).trim();
      inactivity ||= (
        (await rl.question('Inactivity window before a warning [180d]: ')).trim() || '180d'
      );
    } finally {
      rl.close();
    }
  }

  const successors = successorsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!maintainer || successors.length === 0) {
    console.error('A maintainer login and at least one successor are required.');
    process.exit(1);
  }

  const project = process.cwd().split('/').pop() || 'this project';
  const md = renderWillMd({ maintainer, successors, inactivity, project });

  // Validate our own output before writing it.
  parseWill(md);

  await writeFile(WILL_PATH, md, 'utf8');

  if (!(await exists(WORKFLOW_PATH)) || force) {
    await mkdir(dirname(WORKFLOW_PATH), { recursive: true });
    await writeFile(WORKFLOW_PATH, renderWorkflow({}), 'utf8');
  }

  console.log(`Wrote ${WILL_PATH} and ${WORKFLOW_PATH}.`);
  console.log('\nNext: open a pinned issue titled "Maintainer\'s Will", commit these');
  console.log('files, and let the weekly action run. Try `maintainers-will simulate`.');
}

async function cmdStatus(flags: Record<string, string | boolean>): Promise<void> {
  const file = typeof flags.file === 'string' ? flags.file : WILL_PATH;
  const { will } = await readWill(file);

  let state: State | null = null;
  try {
    state = JSON.parse(await readFile(STATE_PATH, 'utf8')) as State;
  } catch {
    state = null;
  }

  if (!state) {
    console.log('No .will/state.json yet — the heartbeat action has not run.');
    console.log(`Maintainer: ${will.maintainer.join(', ')}`);
    console.log(`Successors: ${will.successors.map((s) => s.login).join(', ')}`);
    return;
  }

  const r = statusReport(will, state, new Date());
  console.log(`Stage:        ${r.stage}`);
  console.log(`Last signal:  ${r.lastSignal} (${r.seenDaysAgo}d ago)`);
  if (r.nextStage) {
    console.log(`Next:         ${r.nextStage} in ~${r.daysUntilNext}d`);
  } else {
    console.log(`Next:         — (terminal)`);
  }
}

async function cmdSimulate(flags: Record<string, string | boolean>): Promise<void> {
  const file = typeof flags.file === 'string' ? flags.file : WILL_PATH;
  const { will } = await readWill(file);
  const events = simulate(will, {});

  console.log(`Dry run for ${will.maintainer.join(', ')} (no signals — worst case):\n`);
  for (const e of events) {
    console.log(`  day ${String(e.day).padStart(4)}  ${e.stage.padEnd(12)} ${e.note}`);
  }
  console.log('\nA single sign of life from the maintainer at any point resets to active.');
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  switch (command) {
    case 'init':
      return cmdInit(flags);
    case 'status':
      return cmdStatus(flags);
    case 'simulate':
      return cmdSimulate(flags);
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(`maintainers-will — a dead man's switch for open source projects

Usage:
  maintainers-will init       Create WILL.md and the heartbeat workflow
  maintainers-will status     Show the current stage and time to the next
  maintainers-will simulate   Dry-run the succession flow with no signals

Options:
  init:      --maintainer <login> --successors <a,b> --inactivity <180d> --force
  status:    --file <path>
  simulate:  --file <path>`);
      return;
    default:
      console.error(`Unknown command: ${command}. Try \`maintainers-will help\`.`);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
