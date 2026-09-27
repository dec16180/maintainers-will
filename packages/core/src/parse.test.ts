import { describe, expect, it } from 'vitest';
import { parseWill, WillParseError } from './parse.js';

const minimal = `---
will: 1
maintainer: octocat
heartbeat:
  inactivity: 180d
successors:
  - login: alice
---

# Maintainer's Will

Body text.
`;

describe('parseWill', () => {
  it('parses front-matter and returns the markdown body', () => {
    const { will, body } = parseWill(minimal);
    expect(will.maintainer).toEqual(['octocat']);
    expect(will.heartbeat.inactivity).toBe('180d');
    expect(will.successors[0]?.login).toBe('alice');
    expect(body.trim()).toBe("# Maintainer's Will\n\nBody text.");
  });

  it('applies documented defaults', () => {
    const { will } = parseWill(minimal);
    expect(will.heartbeat.remind_at).toBe('50%');
    expect(will.heartbeat.grace).toBe('30d');
    expect(will.heartbeat.accept_within).toBe('60d');
    expect(will.heartbeat.scope).toBe('repo');
    expect(will.heartbeat.signals).toEqual([
      'commits',
      'comments',
      'reviews',
      'releases',
      'check-in',
    ]);
    expect(will.quorum).toBe(1);
    expect(will.grant).toBe('write');
    expect(will.fallback).toBe('adopt');
    expect(will.change_cooldown).toBe('30d');
  });

  it('normalizes a list of maintainers', () => {
    const src = minimal.replace('maintainer: octocat', 'maintainer:\n  - a\n  - b');
    expect(parseWill(src).will.maintainer).toEqual(['a', 'b']);
  });

  it('throws when the front-matter block is missing', () => {
    expect(() => parseWill('# no front matter\n')).toThrow(WillParseError);
  });

  it('throws on an unknown schema version', () => {
    const src = minimal.replace('will: 1', 'will: 2');
    expect(() => parseWill(src)).toThrow(/version/i);
  });

  it('throws when a required field is missing', () => {
    const src = minimal.replace('maintainer: octocat\n', '');
    expect(() => parseWill(src)).toThrow(WillParseError);
  });

  it('rejects unknown top-level keys', () => {
    const src = minimal.replace('will: 1', 'will: 1\nbogus: nope');
    expect(() => parseWill(src)).toThrow(WillParseError);
  });

  it('rejects an invalid duration suffix', () => {
    const src = minimal.replace('inactivity: 180d', 'inactivity: 180y');
    expect(() => parseWill(src)).toThrow(WillParseError);
  });

  it('collects validation errors as human-readable messages', () => {
    const src = minimal.replace('login: alice', 'login: alice\n    role: boss');
    try {
      parseWill(src);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WillParseError);
      expect((err as WillParseError).errors.join('\n')).toMatch(/role/);
    }
  });
});
