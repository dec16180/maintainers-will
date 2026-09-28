import type { State } from '@maintainers-will/core';
/** shields.io endpoint badge payload (https://shields.io/endpoint). */
export interface Badge {
    schemaVersion: 1;
    label: string;
    message: string;
    color: string;
}
export declare function renderBadge(state: State, now: Date): Badge;
