// One request budget shared by traffic, leads and campaign selectors.
// Retrying GETs is safe; invalid data, permissions and stale snapshots are not retried.
const MAX_CONCURRENT_REQUESTS = 3;
let active = 0;
const waiting: Array<() => void> = [];

async function acquire() {
  if (active < MAX_CONCURRENT_REQUESTS) { active++; return; }
  await new Promise<void>(resolve => waiting.push(resolve));
}
function release() {
  const next = waiting.shift();
  if (next) next(); else active--;
}

export class SupabaseRequestError extends Error {
  constructor(message: string, public readonly code: string, public readonly retryable: boolean) {
    super(message);
    this.name = 'SupabaseRequestError';
  }
}

export async function requestSupabaseJson(url: string, label: string, signal?: AbortSignal): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let failure: SupabaseRequestError;
    let retryDelayMs = 750 + Math.random() * 250;
    await acquire();
    try {
      signal?.throwIfAborted();
      const timeout = AbortSignal.timeout(35000);
      const response = await fetch(url, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const retryAfterSeconds = Number(response.headers.get('Retry-After'));
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
          retryDelayMs = Math.max(retryDelayMs, Math.min(10000, retryAfterSeconds * 1000));
        }
        const code = typeof data?.code === 'string' ? data.code : 'SOURCE_UNAVAILABLE';
        const retryable = data?.retryable !== false
          && !['SOURCE_ACCESS_DENIED', 'SOURCE_QUERY_FAILED', 'STALE_SNAPSHOT'].includes(code)
          && (response.status === 429 || response.status >= 500);
        const message = code === 'STALE_SNAPSHOT'
          ? 'A atualização dos leads está atrasada. Aguarde alguns minutos e tente novamente.'
          : code === 'SOURCE_ACCESS_DENIED'
            ? `O servidor não conseguiu acessar ${label}. É necessário revisar a conexão com o Supabase.`
            : retryable
              ? `O Supabase está temporariamente indisponível para carregar ${label}. Tente novamente em alguns minutos.`
              : `Não foi possível carregar ${label} no Supabase. Tente novamente.`;
        throw new SupabaseRequestError(message, code, retryable);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new SupabaseRequestError('O Supabase retornou dados inválidos.', 'INVALID_RESPONSE', false);
      }
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      failure = error instanceof SupabaseRequestError ? error
        : new SupabaseRequestError(`A conexão com o Supabase foi interrompida ao carregar ${label}. Tente novamente em alguns minutos.`, 'NETWORK_ERROR', true);
    } finally { release(); }
    if (!failure.retryable || attempt === 1) throw failure;
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  }
  throw new Error('Não foi possível atualizar os dados do Supabase.');
}
