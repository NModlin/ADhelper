import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger before importing rateLimiter
vi.mock('./logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    init: vi.fn(),
  },
}));

import { rateLimited, _getInFlightOps } from './rateLimiter';

beforeEach(() => {
  // Clear any in-flight ops between tests
  _getInFlightOps().clear();
});

describe('rateLimited', () => {
  it('executes the handler and returns its result', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true, data: 'hello' });
    const wrapped = rateLimited('test-channel', handler);

    const result = await wrapped('arg1', 'arg2');

    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result).toEqual({ success: true, data: 'hello' });
  });

  it('cleans up in-flight tracking after successful execution', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true });
    const wrapped = rateLimited('test-channel', handler);

    await wrapped();

    expect(_getInFlightOps().has('test-channel')).toBe(false);
  });

  it('cleans up in-flight tracking after handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const wrapped = rateLimited('test-channel', handler);

    await expect(wrapped()).rejects.toThrow('boom');
    expect(_getInFlightOps().has('test-channel')).toBe(false);
  });

  it('rejects duplicate concurrent requests on the same channel', async () => {
    // Create a handler that doesn't resolve immediately
    let resolveHandler!: (value: unknown) => void;
    const handler = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveHandler = resolve; })
    );
    const wrapped = rateLimited('slow-channel', handler);

    // Start first call (will be pending)
    const firstCall = wrapped();

    // Second call should be rate-limited
    const secondResult = await wrapped();
    expect(secondResult).toEqual({
      success: false,
      error: 'Operation already in progress. Please wait for it to complete.',
    });

    // First call should still complete normally
    resolveHandler({ success: true, data: 'done' });
    const firstResult = await firstCall;
    expect(firstResult).toEqual({ success: true, data: 'done' });
  });

  it('allows requests on different channels concurrently', async () => {
    let resolveA!: (value: unknown) => void;
    let resolveB!: (value: unknown) => void;

    const handlerA = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveA = resolve; })
    );
    const handlerB = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveB = resolve; })
    );

    const wrappedA = rateLimited('channel-a', handlerA);
    const wrappedB = rateLimited('channel-b', handlerB);

    const callA = wrappedA();
    const callB = wrappedB();

    // Both handlers should have been called
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);

    resolveA({ channel: 'a' });
    resolveB({ channel: 'b' });

    expect(await callA).toEqual({ channel: 'a' });
    expect(await callB).toEqual({ channel: 'b' });
  });

  it('allows a second request after the first completes', async () => {
    const handler = vi.fn()
      .mockResolvedValueOnce({ call: 1 })
      .mockResolvedValueOnce({ call: 2 });

    const wrapped = rateLimited('reuse-channel', handler);

    const first = await wrapped();
    expect(first).toEqual({ call: 1 });

    const second = await wrapped();
    expect(second).toEqual({ call: 2 });

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

