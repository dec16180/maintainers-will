import { type State, type Transition, type Will } from '@maintainers-will/core';
import { type Badge } from './badge.js';
import { type CheckInContext, type Signal } from './signals.js';
export interface RunDeps {
    now: Date;
    ctx: CheckInContext;
    readWill(): Promise<string>;
    /** Previous persisted state, or null on the very first run. */
    readState(): Promise<State | null>;
    /** Maintainer signals gathered from the GitHub API this run. */
    fetchSignals(will: Will): Promise<Signal[]>;
    writeState(state: State): Promise<void>;
    writeBadge(badge: Badge): Promise<void>;
    postComment(body: string): Promise<void>;
    commit(paths: string[], message: string): Promise<void>;
    log(message: string): void;
}
export interface RunResult {
    transition: Transition;
    commented: boolean;
}
export declare function run(deps: RunDeps): Promise<RunResult>;
