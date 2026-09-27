/** Duration string like `180d`, `12w`, `6m`. */
export type Duration = string;
/** Percentage string like `50%`. */
export type Percentage = string;

export type SignalKind = 'commits' | 'comments' | 'reviews' | 'releases' | 'check-in';
export type Scope = 'repo' | 'account';
export type Grant = 'write' | 'admin' | 'org-owner';
export type Fallback = 'adopt' | 'archive' | 'none';
export type SuccessorRole = 'primary' | 'backup';
export type RegistryType = 'npm' | 'pypi' | 'rubygems' | 'crates' | 'cpan';

export interface Heartbeat {
  inactivity: Duration;
  remind_at: Percentage;
  grace: Duration;
  accept_within: Duration;
  signals: SignalKind[];
  scope: Scope;
}

export interface Successor {
  login: string;
  role?: SuccessorRole;
  /** ISO date, written by the bot after a public /accept-nomination. */
  acknowledged?: string;
}

export interface Registry {
  type: RegistryType;
  name: string;
}

export interface Notify {
  sponsors: boolean;
  channels?: ('issue' | 'readme' | 'discussions')[];
}

/**
 * A fully-normalized WILL.md configuration: `maintainer` is always an array
 * and every optional field carries its documented default.
 */
export interface Will {
  will: 1;
  maintainer: string[];
  heartbeat: Heartbeat;
  successors: Successor[];
  quorum: number;
  grant: Grant;
  fallback: Fallback;
  registries: Registry[];
  notify: Notify;
  change_cooldown: Duration;
}
