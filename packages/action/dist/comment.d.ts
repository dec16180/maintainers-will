import { type Transition, type Will } from '@maintainers-will/core';
/**
 * The comment to post on the Will issue for a transition, or null if this run
 * warrants no comment (no stage change and no reset).
 *
 * v0.1 is read-only: the handover comment is an explicit dry run and grants
 * nothing.
 */
export declare function stageComment(tx: Transition, will: Will, now: Date): string | null;
