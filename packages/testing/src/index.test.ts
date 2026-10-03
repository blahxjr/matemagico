import { describe, expect, it } from 'vitest';
import { foundationTestMarker } from './index';

describe('testing foundation', () => {
  it('is available to workspace packages', () => {
    expect(foundationTestMarker).toBe('foundation');
  });
});
