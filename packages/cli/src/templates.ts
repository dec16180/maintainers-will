export interface InitOptions {
  maintainer: string;
  successors: string[];
  inactivity: string;
  /** Project name for the body heading. */
  project?: string;
}

/** Render a complete WILL.md (front-matter + human body) from init answers. */
export function renderWillMd(opts: InitOptions): string {
  const successors = opts.successors
    .map((login, i) => `  - login: ${login}\n    role: ${i === 0 ? 'primary' : 'backup'}`)
    .join('\n');
  const project = opts.project ?? 'this project';

  return `---
will: 1
maintainer: ${opts.maintainer}
heartbeat:
  inactivity: ${opts.inactivity}
  remind_at: 50%
  grace: 30d
  accept_within: 60d
  signals: [commits, comments, reviews, releases, check-in]
  scope: repo
successors:
${successors}
quorum: 1
grant: write
fallback: adopt
notify:
  channels: [issue, readme]
change_cooldown: 30d
---

# Maintainer's Will for ${project}

If I go silent for a while, this file says what should happen to ${project}
and who should take over. It is a public promise, not a legal will.

**What matters to me for this project**

- The license stays MIT.
- No telemetry.
- The release process is documented in RELEASING.md.

**For my successors (${opts.successors.join(', ') || 'to be named'})**

Thank you. Keep it small, keep it honest, and don't feel obliged to say yes.
You can decline any time with \`/decline\` in the Will issue.

**How this works**

A weekly GitHub Action checks whether I am still active. If I am not, it moves
through public stages — reminder, warning, handover — each with a deadline, and
a single sign of life from me resets everything. Nothing happens in secret and
no rights are granted without a human approval.
`;
}

export interface WorkflowOptions {
  /** e.g. "owner/maintainers-will@v0.1.0". */
  actionRef?: string;
  /** Cron schedule; defaults to weekly. */
  cron?: string;
}

/** Render the heartbeat workflow YAML. */
export function renderWorkflow(opts: WorkflowOptions): string {
  const actionRef = opts.actionRef ?? 'loopius/maintainers-will@v0.1.0';
  const cron = opts.cron ?? '17 3 * * 1';

  return `name: Maintainer's Will

on:
  schedule:
    - cron: '${cron}'
  workflow_dispatch:

# Minimal rights: read the repo, write the state/badge commit and the Will issue.
# This workflow grants no repository permissions to anyone.
permissions:
  contents: write
  issues: write

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${actionRef}
        with:
          token: \${{ github.token }}
`;
}
