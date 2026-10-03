import { describe, expect, it } from 'vitest';
import type { SchoolScopedContext } from './index';

describe('shared types foundation', () => {
  it('exposes school-scoped contracts without infrastructure', () => {
    const context: SchoolScopedContext = { schoolId: 'school-1' };
    expect(context.schoolId).toBe('school-1');
  });
});
