import { describe, it, expect } from 'vitest';
import { stackColor, stackLabel } from '../components/projects/stack-utils';

describe('stackLabel', () => {
  it('returns readable label for known stacks', () => {
    expect(stackLabel('node')).toBe('Node.js');
    expect(stackLabel('rust')).toBe('Rust');
    expect(stackLabel('python')).toBe('Python');
    expect(stackLabel('go')).toBe('Go');
    expect(stackLabel('java')).toBe('Java/Kotlin');
    expect(stackLabel('swift')).toBe('Swift');
    expect(stackLabel('php')).toBe('PHP');
    expect(stackLabel('ruby')).toBe('Ruby');
    expect(stackLabel('dotnet')).toBe('.NET');
  });

  it('returns raw value for unknown stacks', () => {
    expect(stackLabel('elixir')).toBe('elixir');
    expect(stackLabel('')).toBe('');
  });
});

describe('stackColor', () => {
  it('returns a color string for known stacks', () => {
    const knownStacks = ['node', 'rust', 'python', 'go', 'java', 'swift', 'php', 'ruby', 'dotnet'];
    for (const stack of knownStacks) {
      expect(stackColor(stack)).not.toBe('');
    }
  });

  it('returns default for unknown stack', () => {
    expect(stackColor('unknown')).toBe('default');
  });
});
