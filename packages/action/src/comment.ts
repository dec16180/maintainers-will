import { parseDuration, type Transition, type Will } from '@maintainers-will/core';

const mention = (logins: string[]): string => logins.map((l) => `@${l}`).join(', ');
const asDate = (iso: string): string => iso.slice(0, 10);

/**
 * The comment to post on the Will issue for a transition, or null if this run
 * warrants no comment (no stage change and no reset).
 *
 * v0.1 is read-only: the handover comment is an explicit dry run and grants
 * nothing.
 */
export function stageComment(tx: Transition, will: Will, now: Date): string | null {
  if (!tx.changed && !tx.reset) return null;

  const maintainers = mention(will.maintainer);
  const successors = mention(will.successors.map((s) => s.login));

  if (tx.reset) {
    return [
      `### ✅ Maintainer is back`,
      ``,
      `${maintainers} produced a fresh sign of life on ${asDate(now.toISOString())}. `,
      `The succession clock is reset to **active**. This note stays for the record.`,
    ].join('\n');
  }

  switch (tx.state.stage) {
    case 'reminder':
      return [
        `### 🟢 Reminder`,
        ``,
        `${maintainers} — half of the inactivity window has passed without a signal from you. `,
        `Nothing public happens yet. A single commit, comment, review, release, or a \`/alive\` here resets the clock.`,
      ].join('\n');

    case 'warning': {
      const deadline = asDate(
        new Date(new Date(tx.state.stage_since).getTime() + parseDuration(will.heartbeat.grace)).toISOString(),
      );
      return [
        `### 🟠 Warning — succession pending`,
        ``,
        `${maintainers} has been inactive past the configured window. Successors: ${successors}.`,
        ``,
        `If there is no sign of life by **${deadline}** (grace period ${will.heartbeat.grace}), this project moves to **handover**.`,
        ``,
        `Maintainer: comment \`/alive\` to reset everything.`,
      ].join('\n');
    }

    case 'handover':
      return [
        `### 🔴 Handover (dry run)`,
        ``,
        `The grace period elapsed. In v0.1 this is a **dry run: it grants no rights and changes no permissions.**`,
        ``,
        `Successors ${successors} would be asked to approve the handover here. Rights escalation arrives in v0.2 behind an environment-gated approval.`,
      ].join('\n');

    case 'fallback':
      return [
        `### ⚪ Fallback`,
        ``,
        `No approval within \`${will.heartbeat.accept_within}\`. Per \`fallback: ${will.fallback}\`, this is where the fallback path would run. `,
        `v0.1 only records the state; it grants nothing.`,
      ].join('\n');

    case 'handed_over':
      return [
        `### 🔵 Handed over`,
        ``,
        `A successor approved. (v0.1 records the state only; rights escalation is v0.2.)`,
      ].join('\n');

    case 'active':
    default:
      return null;
  }
}
