export type NetErrorKind = 'network' | 'http' | 'parse' | 'unknown';

export interface NetError {
  kind: NetErrorKind;
  message: string;
  status?: number;
  retryable: boolean;
}

export function toNetError(err: unknown): NetError {
  if (isNetError(err)) return err;
  if (err instanceof TypeError) {
    return {
      kind: 'network',
      message: 'Network unreachable',
      retryable: true,
    };
  }
  if (err instanceof Error) {
    return { kind: 'unknown', message: err.message, retryable: true };
  }
  return { kind: 'unknown', message: String(err), retryable: true };
}

function isNetError(v: unknown): v is NetError {
  return (
    typeof v === 'object' &&
    v !== null &&
    'kind' in v &&
    'message' in v &&
    'retryable' in v
  );
}

export function httpError(status: number, message?: string): NetError {
  return {
    kind: 'http',
    status,
    message: message ?? `Request failed (${status})`,
    retryable: status >= 500 || status === 408 || status === 429,
  };
}

export function parseError(message = 'Malformed server response'): NetError {
  return { kind: 'parse', message, retryable: false };
}
