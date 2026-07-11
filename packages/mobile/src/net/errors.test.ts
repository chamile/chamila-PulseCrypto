import { describe, it, expect } from 'vitest';
import { toNetError, httpError, parseError } from './errors';

describe('toNetError', () => {
  it('maps TypeError (fetch failure) to a retryable network error', () => {
    const err = toNetError(new TypeError('Network request failed'));
    expect(err.kind).toBe('network');
    expect(err.retryable).toBe(true);
    expect(err.message).toContain('Network');
  });

  it('preserves an already-typed NetError', () => {
    const original = httpError(500);
    expect(toNetError(original)).toBe(original);
  });

  it('wraps a plain Error as unknown/retryable', () => {
    const err = toNetError(new Error('boom'));
    expect(err.kind).toBe('unknown');
    expect(err.message).toBe('boom');
    expect(err.retryable).toBe(true);
  });

  it('stringifies non-Error values', () => {
    const err = toNetError('weird');
    expect(err.message).toBe('weird');
    expect(err.retryable).toBe(true);
  });
});

describe('httpError', () => {
  it('marks 5xx as retryable', () => {
    expect(httpError(500).retryable).toBe(true);
    expect(httpError(503).retryable).toBe(true);
  });

  it('marks 4xx (except 408/429) as non-retryable', () => {
    expect(httpError(400).retryable).toBe(false);
    expect(httpError(404).retryable).toBe(false);
    expect(httpError(408).retryable).toBe(true);
    expect(httpError(429).retryable).toBe(true);
  });

  it('carries the status code', () => {
    const err = httpError(503);
    expect(err.status).toBe(503);
    expect(err.kind).toBe('http');
  });
});

describe('parseError', () => {
  it('is never retryable', () => {
    expect(parseError().retryable).toBe(false);
    expect(parseError().kind).toBe('parse');
  });
});
