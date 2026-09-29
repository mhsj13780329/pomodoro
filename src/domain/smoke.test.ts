import { describe, expect, it } from 'vitest';
import { add } from '@/domain/smoke';

describe('domain smoke test', () => {
  it('runs in the node environment with the @ alias', () => {
    expect(add(2, 3)).toBe(5);
  });
});
