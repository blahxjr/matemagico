import { describe, expect, it, vi } from 'vitest';
import { addLogContext, createLogger, withLogContext } from './logger';

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

  it('propagates and enriches context through asynchronous work', async () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const log = createLogger();
    let entry: ReturnType<typeof log.info> | undefined;

    await withLogContext(
      { requestId: 'req-1', correlationId: 'corr-1', module: 'membership', schoolId: null },
      async () => {
        await Promise.resolve();
        addLogContext({ schoolId: 'school-1' });
        entry = log.info('membership operation completed');
      },
    );

    expect(entry).toMatchObject({
      requestId: 'req-1',
      correlationId: 'corr-1',
      module: 'membership',
      schoolId: 'school-1',
    });
    output.mockRestore();
  });

  it('does not leak context between concurrent asynchronous operations', async () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const log = createLogger();
    const entries = await Promise.all(
      ['req-a', 'req-b'].map((requestId) =>
        withLogContext({ requestId }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return log.info('request completed');
        }),
      ),
    );

    expect(entries.map((entry) => entry.requestId)).toEqual(['req-a', 'req-b']);
    output.mockRestore();
  });
});
