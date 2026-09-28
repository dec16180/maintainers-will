# Maintainer's Will – Spec

Sep 27, 2026 · @Loopius

## Summary

Maintainer's Will is a GitHub Action plus a `WILL.md` file that hands an open source project over to pre-named successors when the maintainer stays inactive for a defined period – publicly, in stages, and cancellable by the maintainer at any time. It is aimed at solo maintainers and small teams whose project depends on a personal GitHub account.

- **Trigger:** maintainer inactivity (default 180 days), followed by a 30-day grace period with a public warning.
- **Successors:** named in advance, must confirm their nomination; no open adoption.
- **Handover:** permission escalation in the repo only after a successor approves, plus a README banner, sponsor and user notice, and prepared registry requests.
- **No hosting required:** everything runs as an Action in the repo; a hosted mode comes later.
- **Name:** provisional. Candidates: `maintainers-will`, `bequest`, `heir`. MIT license.

## Problem & Current State

Projects usually don't die because the maintainer dies, but because they quietly disappear – and for that case there is no tool today. What exists either only applies on death, only kicks in after the disappearance, or isn't read by any tool.

| Mechanism | What it does | Gap |
| --- | --- | --- |
| [GitHub successor setting](https://nesbitt.io/2026/06/16/how-open-source-projects-change-hands.html) (since 2020) | Named person may archive or take over repos after a death certificate + 7 days (or an obituary + 21 days) | Death only; covers repos, not registry accounts |
| Registry processes (CPAN ADOPTME/HANDOFF, RubyGems ownership calls, PyPI [PEP 541](https://peps.python.org/pep-0541/)) | Takeover of orphaned package names on request | Manual, only after the disappearance; PEP 541 requires contact attempts and a working fork as evidence |
| Distro orphan processes (Debian RFA, Fedora orphan user, AUR, CRAN) | Formal state machines for abandoned packages | Distributions only, not language registries or repos |
| [repostatus](https://www.repostatus.org/) badge, "looking for maintainers" in the README | Signal to humans | No tool evaluates it |
| [Stale Repos Action](https://github.blog/open-source/maintainers/announcing-the-stale-repos-action/) (GitHub OSPO, 2023) | Report of inactive repos in an organization | A report, not a handover |
| Generic dead man's switches | Passwords, wallets, messages | No connection to repos or registries |

The need is documented: a [GitHub discussion from 2020](https://github.com/orgs/community/discussions/23164) asks for maintainers to have to confirm regularly that they still look after their repo, and a [docs issue from October 2025](https://github.com/github/docs/issues/40673) asks whether the successor mechanism also applies to a living but unreachable maintainer – without a clear answer. Andrew Nesbitt's inventory from June 2026 notes that the chosen-successor model has practically no supporting infrastructure.

The other side is just as well documented: in June 2026 an attacker took over more than 400 orphaned AUR packages and added a malware download to each one; event-stream (2018) and xz (2024) were handovers to strangers without vetting. Open adoption without gatekeeping is therefore not an option but an attack vector.

## Design Principles

Six rules decide every detailed question; where they conflict, the higher one wins.

1. **Inactivity, not death.** Burnout, a job change, a child, illness are the common case. Death stays with GitHub's successor setting; the two complement each other.
2. **Named in advance, confirmed in advance.** Only successors listed in `WILL.md` who have publicly accepted their nomination are eligible. Open adoption is not the default but a separate, slower opt-in mode without automatic permission grants.
3. **Public and reversible.** Every stage is visible in the repo (issue, badge, README), every deadline is known, and a single sign of life from the maintainer resets everything. Nothing happens in secret, nothing happens instantly.
4. **Machine-readable.** `WILL.md` has a fixed front-matter schema so badges, dashboards, registries and other tools can read it. A badge no tool reads has helped no one.
5. **Minimal permissions, gated.** In normal operation the Action holds only read permissions. The one step that grants permissions runs in a protected environment and only after a successor approves.
6. **No hosting, no account.** v1 is an Action in the repo plus a CLI. All knowledge lives in the repo, none with us – partly so that the tool itself doesn't have a bus factor of 1.

## Stages

&#91;embedded content: Flow · 4 stages, 2 exits, 1 way back\]

The stages run left to right with fixed deadlines; the maintainer's return leads from any stage back to Active, and the log is kept.

| Stage | Trigger | What the Action does | Badge |
| --- | --- | --- | --- |
| Active | weekly run | record the last maintainer activity in `.will/state.json` | active · seen 3d ago |
| Reminder | 90 days without a signal (50 % of the window) | mention the maintainer in the will issue (triggers a GitHub email); optionally email a configured address | active |
| Warning | 180 days without a signal | public, pinned issue with the deadline, successors mentioned, notice at the top of the README | warning |
| Handover | 30-day grace period elapsed | handover job starts and waits for a successor's approval; notify sponsors from `FUNDING.yml` | succession |
| Handed over | a successor has approved | role depending on repo type: write, admin or org owner; README banner, registry requests generated, log in the issue | handed over |
| Fallback | 60 days without approval | depending on `fallback`: publicly advertise for adoption (without permissions) or archive the repo | seeking adopter |

## WILL.md – the Format

`WILL.md` lives in the repo root and consists of YAML front matter that tools read and a Markdown part that humans read. A single document for both, so it can be found (GitHub code search `path:WILL.md`) and so changes are traceable as normal commits.

```markdown
---
will: 1
maintainer: octocat
heartbeat:
  inactivity: 180d        # no signal → warning
  remind_at: 50%          # reminder at the halfway point
  grace: 30d              # warning → handover
  accept_within: 60d      # handover → fallback
  signals: [commits, comments, reviews, releases, check-in]
  scope: repo             # or: account (all public events)
successors:
  - login: alice
    role: primary
    acknowledged: 2026-09-27   # set by the bot when alice accepts
  - login: bob
    role: backup
quorum: 1                 # how many successors must approve
grant: write              # write | admin | org-owner
fallback: adopt           # adopt | archive | none
registries:
  - type: npm
    name: my-package
  - type: pypi
    name: my_package
notify:
  sponsors: true          # from FUNDING.yml
  channels: [issue, readme, discussions]
change_cooldown: 30d      # changes to successors/grant only take effect after this
---

# Maintainer's Will for my-package

Why I'm writing this, what matters to me about the project, what the
successors should know (license stays MIT, no telemetry,
release process is in RELEASING.md).
```

| Field | Required | Meaning |
| --- | --- | --- |
| `will` | yes | Schema version; tools reject unknown versions |
| `maintainer` | yes | GitHub login whose activity is measured; multiple logins allowed, in which case the most recently active one counts |
| `heartbeat.inactivity` | yes | Window without a signal until the warning; suffixes `d`, `w`, `m` |
| `heartbeat.signals` | no | Which events count as a sign of life; default all five |
| `successors[].login` | yes | At least one; `acknowledged` is only written by the bot after public acceptance |
| `quorum` | no | 1 for small projects; 2 for packages with many dependents |
| `grant` | no | Role to be granted; `admin` and org-owner only exist in organizations; on personal repos write is the only option |
| `fallback` | no | What happens if no successor approves; `adopt` never grants permissions automatically |
| `registries[]` | no | Packages for which requests are prepared; the CLI suggests them from the manifests |
| `change_cooldown` | no | Protection against hijacked accounts: changed successors only apply after the cooldown and a public announcement |

The Markdown part is free-form. Recommended sections: wishes for the project, notes on release and infrastructure, ways to contact the successors. None of it is legally binding; it is a public promise, not a will in the legal sense.

## Trigger Logic & State Machine

What is measured is not "activity in the repo" but "activity of the maintainer": bot commits, Dependabot PRs or other people's issues don't keep the counter alive. A single genuine signal resets it to zero.

**Signals (default, all queryable via the GitHub API):**

- Commits whose author or committer is the maintainer login, on any branch
- Comments, reviews and reactions by the maintainer in issues and PRs
- Releases and tags created by the maintainer
- Explicit check-in: `/alive` comment in the will issue, `workflow_dispatch` of the heartbeat workflow, or `will check-in` from the CLI
- Optional `scope: account`: every public event of the account (Events API), so a maintainer who is only working on other repos isn't considered gone

**State** lives in `.will/state.json`, which the bot updates via commit: `stage`, `last_seen`, `last_signal`, `stage_since`, `notified[]`. Every stage change is additionally logged as a comment in the will issue so it is readable without the Git log.

**Transitions:**

1. `active → reminder`: `now − last_seen ≥ inactivity × remind_at`
2. `reminder → warning`: `now − last_seen ≥ inactivity`
3. `warning → handover`: `now − stage_since ≥ grace`
4. `handover → handed_over`: approvals ≥ `quorum`
5. `handover → fallback`: `now − stage_since ≥ accept_within` without quorum
6. `* → active`: any signal from the maintainer; the warning issue is closed, the README notice removed, a note "Maintainer back on …" remains

**The 60-day trap.** GitHub disables `schedule` workflows in repos without commit activity after 60 days – exactly when a dead man's switch would need to work. Solution: the weekly heartbeat run commits `.will/state.json` with a bot identity; GitHub counts that as activity and keeps the schedule alive, but the bot itself does not count it as a maintainer signal. As a second safeguard, `will doctor` can register an external pinger (e.g. a cron on another repo belonging to the successor that triggers via `repository_dispatch`). The hosted mode (v1.0) solves the problem fundamentally.

## The Handover, Technically

&#91;embedded content: Architecture · 2 permission zones, 1 approval\]

Everything at the top runs with the normal `GITHUB_TOKEN`; only the handover job at the bottom has access to the app secret, and it only gets that when a successor approves the environment review.

**Environment gating instead of a custom auth system.** GitHub Environments can carry required reviewers and their own secrets; in public repos this is free. `will init` creates the `maintainer-will` environment, adds the confirmed successors as reviewers and stores the App ID and private key there. Approving the waiting job is thus also the successor's consent, with timestamp and name in the Actions log. With `quorum: 2` the job waits for two approvals (environment rule "prevent self-review" + minimum count).

**Why a GitHub App and not a PAT.** A personal access token is tied to the maintainer's account, expires, or becomes invalid along with the account – exactly when it would be needed. An app installation is decoupled from that. Without hosting, the maintainer has to create the app themselves (five minutes, `will init` walks through it): permissions `Administration: write`, `Contents: write`, `Issues: write`, installed only on this repo. The handover job mints a token from it via `actions/create-github-app-token` that expires after one hour.

**Permission escalation.** Personal repos only know owner and collaborator (write); the API ignores any finer role there. On personal repos the handover job therefore only invites the successor as a collaborator at handover time – the successor is present at that moment anyway, having just approved, and accepts the invitation. This gives them push, merge and releases (via Trusted Publishing from the repo workflow), but no settings, no secrets and no transfer: that is the ceiling for personal repos. Anyone who wants full succession moves the repo into their own organization; `will init` offers this (transfer with a permanent redirect, five minutes). There the successor gets `triage` at nomination, and the handover job sets the role `admin` via `PUT /repos/{owner}/{repo}/collaborators/{login}` or org owner via `PUT /orgs/{org}/memberships/{login}` (`grant: org-owner`), so the successor can take over everything.

**Making it visible.** The job commits a block at the top of the README (status, successor, link to the will issue), updates `.will/badge.json` for the shields.io endpoint badge, switches an existing repostatus badge, and writes the conclusion to the will issue. Sponsors from `FUNDING.yml` are notified via issue mention; registry requests land as files under `.will/registry/`.

## Registry Bridge

No registry allows package ownership to be transferred via API – so the real bridge is built *before* the emergency: successors are added as co-owners today, and publishing is bound to the repo rather than the account. In the emergency only paperwork remains, and the tool prepares it.

| Registry | Beforehand (prevention, checked by `will doctor`) | In the emergency (generated by the handover job) |
| --- | --- | --- |
| npm | Successors via `npm owner add`; Trusted Publishing from the repo workflow | No transfer by npm ("we do not transfer package ownership"). Template for `npm deprecate` pointing to the successor package, if an owner is still reachable |
| PyPI | Successor as collaborator with the Owner role; Trusted Publisher on repo + workflow + environment | [PEP 541](https://peps.python.org/pep-0541/) request as issue text: contact attempts, dates, link to the public will issue – exactly the evidence PEP 541 requires |
| RubyGems | `gem owner --add`; Trusted Publishing | Template for an ownership call or request |
| crates.io | Successor as owner (`cargo owner --add`); Trusted Publishing | No mediation process anymore; note: fork under a new name plus `[badges]`/deprecation in the old crate, if access exists |
| CPAN | Successor as co-maintainer via PAUSE | Instructions for the HANDOFF/ADOPTME flag and a PAUSE admin request |

**Trusted Publishing is the lever.** When PyPI, npm, RubyGems or crates.io trust the repo workflow instead of an account token, the publishing right moves with the repo: whoever has `admin` on the repo can release without anyone knowing a registry password. `will doctor` therefore checks per manifest (`package.json`, `pyproject.toml`, `*.gemspec`, `Cargo.toml`) whether Trusted Publishing is set up, whether the release workflow uses the environment, and whether every confirmed successor is registered as an owner – and reports gaps as a bus-factor finding.

**Limits, stated openly:** With Trusted Publishing the configuration is bound to the owner/repo name; if the successor transfers the repo to themselves, they must update the publisher entry (the tool reminds them). npm names without a reachable owner are lost; that is registry policy, not a tool problem, and the template says so honestly.

## Security & Threat Model

The tool grants admin rights on software others depend on – it is itself a supply-chain component and is designed as one. Principle: it makes handovers that today happen in secret and unvetted public, slow and logged; it does not create a new way to get at a project faster.

| Attack | Precedent | Countermeasure |
| --- | --- | --- |
| Sock puppets pressure the maintainer into adding a stranger | xz (2024) | Nomination is a deliberate commit by the maintainer with a 30-day `change_cooldown` and a public announcement in the will issue; the tool never nominates on its own and recommends not nominating anyone who doesn't already have contributions in the repo |
| Someone "asks nicely" and gets the package | event-stream (2018) | Open adoption is not a default path; `fallback: adopt` only advertises and grants no permissions, granting remains a manual step with a waiting period |
| Mass takeover of orphaned packages | AUR, June 2026 | Only pre-named, confirmed logins are eligible; no process a stranger can trigger |
| Maintainer account hijacked, attacker adds themselves as successor | – | Changes to `successors`, `grant`, `quorum` only take effect after `change_cooldown`, all previous successors are mentioned; optionally only signed commits (`require_signed: true`) can change the list |
| Successor account hijacked | – | Confirmation requires 2FA (API field checkable); approval in the environment is a second, logged step; `quorum: 2` for packages with many dependents |
| Attacker with write access modifies the workflow to get the app secret | – | The secret lives in the environment, which is only reachable after reviewer approval; anyone with write access is already trusted anyway – the boundary doesn't move |
| False alarm: maintainer on sabbatical | – | Reminder at 50 %, public warning with a 30-day grace period, reset with a single comment; `scope: account` counts activity in other repos |
| The tool itself is hijacked (Action from the Marketplace) | – | Pin the Action by commit SHA, signed releases; the tool has its own `WILL.md` |

What the tool deliberately **cannot** do: transfer registry ownership, pass on private keys or passwords, grant permissions without human approval. Anyone who needs that needs a different tool – and should be suspicious if one promises it.

## Usage: CLI, Commands, Badge

A maintainer should be done in under ten minutes: `npx maintainers-will init`, three questions, one PR. Everything else happens in the will issue via comments, so successors can take part without the CLI.

**CLI** (Node, so `npx` works without installation; shares its core with the Action):

| Command | What it does |
| --- | --- |
| `will init` | asks for maintainer login, successors, window; creates `WILL.md`, the workflow, the environment, the pinned will issue and a PR; walks through creating the GitHub App |
| `will nominate <login>` | adds a successor, adds them as collaborator (`triage`) in org repos, mentions them in the will issue for confirmation |
| `will check-in` | sets `last_seen` via `workflow_dispatch`; for maintainers who aren't committing right now |
| `will doctor` | bus-factor check: unconfirmed successors, missing registry owners, no Trusted Publishing, app installation missing, schedule disabled, PAT instead of app |
| `will status` | current stage, days until the next, recent signals |
| `will simulate` | dry-runs the flow and shows who would see what and when |

**Comment commands in the will issue** (the bot checks who is writing):

- `/alive` – maintainer resets to Active
- `/accept-nomination` – successor confirms; the bot writes `acknowledged` into `WILL.md`
- `/decline` – successor steps down; the maintainer is mentioned
- `/pause 90d` – maintainer pauses the counter with an announcement (sabbatical, parental leave); publicly visible
- `/handover` – maintainer starts the handover voluntarily and immediately, without deadlines

**Badge** via `.will/badge.json` (shields.io endpoint): `will: active · seen 3d ago` green, `warning` orange, `succession` red, `handed over` blue, `seeking adopter` grey. The badge is also advertising: whoever sees it in a README finds the tool.

**Directory:** Because `WILL.md` has a fixed name, GitHub code search is the directory of all projects with a succession plan – and a small static site can build a list of "projects looking for successors" from it. That is the community surface for v0.3.

## MVP Roadmap

v0.1 is doable tonight in three to four hours because it only reads and comments; everything that grants permissions only comes in v0.2 with environment gating.

| Version | Scope | Gate to continue |
| --- | --- | --- |
| v0.1 – tonight | `WILL.md` parser with schema; heartbeat Action (schedule + `workflow_dispatch`): maintainer activity via API, stages Active/Reminder/Warning, `.will/state.json`, badge, will issue with log; handover only as a dry-run comment; `will init` creates `WILL.md` + workflow; `will simulate`; README with story | Runs on your own repo; with `inactivity: 1d` the whole flow can be provoked in two days |
| v0.2 – week 1 | Nomination with `/accept-nomination`, `/alive`, `/pause`, `/handover`; environment-gated handover job with app token; `will nominate`; README banner; org mode (`triage` → `admin` / org owner) | Real handover on a test repo to a second account, with no intervention other than the approval |
| v0.3 – weeks 2–3 | `will doctor` with registry and Trusted Publishing checks; request templates (PEP 541, RubyGems, npm deprecate); sponsor notice; static directory page from code search | 20 third-party repos with `WILL.md`; first external PRs for registry adapters |
| v1.0 – months 2–3 | Hosted GitHub App (no more self-built app, external scheduler instead of the 60-day workaround); `quorum: 2`; signed commits for `WILL.md`; banner translations | Third-party security review; first package with over 1M weekly downloads on board |

Stack: TypeScript, Node 20, one repo for Action and CLI (`packages/core`, `packages/action`, `packages/cli`), Octokit, `zod` for the schema, Vitest; the Action is bundled with `ncc`. The core is a pure function with injected time, so `will simulate` and the tests run the same code.

## Launch Plan

Publish tonight, but don't post to Hacker News yet: Sunday evening is the worst time there. The "Show HN" comes on Tuesday between 14:00 and 16:00 UTC, once v0.1 has run on real repos for two days.

1. **README as a story** (today): bus factor 1, GitHub's successor only applies on death, Nesbitt's inventory, event-stream, xz, the 400 AUR packages – then the line "Your project needs a will." After that, in three lines: `npx maintainers-will init`, what happens, what never happens (no permissions without human approval).
2. **Dogfooding** (today): `WILL.md` in the tool repo itself and in two of my own projects, badge in the README.
3. **Demo** (Monday): GIF of `will simulate` showing the whole flow in 30 seconds.
4. **Soft launch** (Monday): Mastodon/fosstodon, Bluesky, Lobsters, r/opensource. Message to Andrew Nesbitt asking for feedback – his ecosyste.ms could index `WILL.md`; that would be the biggest lever for visibility.
5. **Show HN** (Tuesday): title "Show HN: Maintainer's Will – a dead man's switch for open source projects" or "Show HN: WILL.md – succession plans for open source, enforced by a GitHub Action". First hour: answer every comment, take security questions seriously, link the threat model.
6. **First 20 maintainers** (week 1): solo maintainers of popular packages, people with "looking for maintainers" in their README, Sponsors recipients. Offer each one a ready-made PR with `WILL.md`, not just a link.
7. **Open contribution areas**: registry adapters (one file per registry), banner translations, `doctor` checks, good first issues; GitHub Discussions instead of Discord for the first few weeks.

## Open Questions & Risks

- [ ] Name: is `maintainers-will` free on npm? Alternatives `bequest`, `heir`, `succession-action`.
- [ ] Confirm that required reviewers for environments are available on the Free plan for public repos and that read access is enough for reviewers.
- [ ] Activity measurement without the Search API (rate limit 30/min): Events API for the last 90 days, then commits with `author=login` and `since`, then comments – is that enough for repos with 10,000 commits?
- [ ] Publicity of the warning: an optional mode in which only the successors are notified for the first 7 days (protection against "your project is dead" pressure)?
- [ ] Personal repos: is the write ceiling enough for most, or should `will init` recommend moving to an organization more strongly?
- [ ] Multiple maintainers: inactivity only once all are silent (`maintainer` as a list)?
- [ ] 2FA checks on successors are only possible via API for org members; on personal repos it remains self-declared in `/accept-nomination`.
- [ ] Legal notice in the README: not a will, not legal advice; check whether GitHub's terms of service for apps restrict permission changes.
- [ ] Abuse as leverage against maintainers: warnings can only be configured by the maintainer and can never be triggered by third parties – that remains a principle.

## Sources

- [How Open Source Projects Change Hands – Andrew Nesbitt, 2026-06-16](https://nesbitt.io/2026/06/16/how-open-source-projects-change-hands.html)
- [Dumb Ways for an Open Source Project to Die – Andrew Nesbitt, 2026-05-19](https://nesbitt.io/2026/05/19/dumb-ways-for-an-open-source-project-to-die.html)
- [PEP 541 – Package Index Name Retention](https://peps.python.org/pep-0541/)
- [GitHub Docs Issue #40673 – Maintaining ownership continuity](https://github.com/github/docs/issues/40673)
- [GitHub Community Discussion #23164 – abandoned repositories](https://github.com/orgs/community/discussions/23164)
- [Announcing the Stale Repos Action – GitHub Blog, 2023](https://github.blog/open-source/maintainers/announcing-the-stale-repos-action/)
- [repostatus.org](https://www.repostatus.org/)
