import { describe, expect, it } from 'vitest';
import { renderWillMd, renderWorkflow } from './templates.js';
import { parseWill } from '@maintainers-will/core';

describe('renderWillMd', () => {
  it('produces a WILL.md that parses back to the given options', () => {
    const md = renderWillMd({
      maintainer: 'octocat',
      successors: ['alice', 'bob'],
      inactivity: '180d',
    });
    const { will, body } = parseWill(md);
    expect(will.maintainer).toEqual(['octocat']);
    expect(will.successors.map((s) => s.login)).toEqual(['alice', 'bob']);
    expect(will.heartbeat.inactivity).toBe('180d');
    expect(body).toMatch(/# Maintainer's Will/);
  });

  it('marks the first successor as primary and the rest as backup', () => {
    const md = renderWillMd({ maintainer: 'octocat', successors: ['alice', 'bob'], inactivity: '90d' });
    const { will } = parseWill(md);
    expect(will.successors[0]?.role).toBe('primary');
    expect(will.successors[1]?.role).toBe('backup');
  });
});

describe('renderWorkflow', () => {
  it('runs weekly on a schedule and supports manual dispatch', () => {
    const yml = renderWorkflow({});
    expect(yml).toMatch(/on:/);
    expect(yml).toMatch(/schedule:/);
    expect(yml).toMatch(/cron:/);
    expect(yml).toMatch(/workflow_dispatch:/);
  });

  it('grants the minimal permissions it needs (read + issues + commit)', () => {
    const yml = renderWorkflow({});
    expect(yml).toMatch(/contents:\s*write/);
    expect(yml).toMatch(/issues:\s*write/);
  });

  it('references the action at the given ref', () => {
    const yml = renderWorkflow({ actionRef: 'loopius/maintainers-will@v0.1.0' });
    expect(yml).toContain('loopius/maintainers-will@v0.1.0');
  });
});
