import {
  HealthResponseSchema,
  PairsMetaResponseSchema,
  type HealthResponse,
  type PairsMetaResponse,
} from '@pulsecrypto/contracts';
import { SERVER } from './config';
import { httpError, parseError, toNetError } from './errors';

export async function fetchPairsMeta(): Promise<PairsMetaResponse> {
  let res: Response;
  try {
    res = await fetch(SERVER.meta);
  } catch (err) {
    throw toNetError(err);
  }
  if (!res.ok) throw httpError(res.status);
  const json = await res.json().catch(() => {
    throw parseError('Response body was not valid JSON');
  });
  const parsed = PairsMetaResponseSchema.safeParse(json);
  if (!parsed.success) throw parseError();
  return parsed.data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  let res: Response;
  try {
    res = await fetch(SERVER.health);
  } catch (err) {
    throw toNetError(err);
  }
  if (!res.ok) throw httpError(res.status);
  const json = await res.json().catch(() => {
    throw parseError('Response body was not valid JSON');
  });
  const parsed = HealthResponseSchema.safeParse(json);
  if (!parsed.success) throw parseError();
  return parsed.data;
}
