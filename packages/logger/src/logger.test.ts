import { describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';

describe('logger', () => {
  it('creates structured entries with correlation context', () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const entry = createLogger({ correlationId: 'corr-1' }).info('foundation ready', {
      requestId: 'req-1',
    });

    expect(entry).toMatchObject({ level: 'info', correlationId: 'corr-1', requestId: 'req-1' });
    expect(output).toHaveBeenCalledOnce();
    output.mockRestore();
  });
});
