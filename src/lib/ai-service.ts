/**
 * HTTP client for FastAPI AI service.
 * All questionnaire and report calls go through here.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY ?? '';

if (!AI_SERVICE_URL) {
  console.warn('[ai-service] AI_SERVICE_URL not set — defaulting to localhost:8000');
}
if (!AI_SERVICE_KEY) {
  console.error(
    '[ai-service] AI_SERVICE_KEY not set — all FastAPI requests will be rejected (401). ' +
      'Set AI_SERVICE_KEY in .env.local.',
  );
}

const BASE_URL = AI_SERVICE_URL || 'http://localhost:8000';

const AI_SERVICE_TIMEOUT_MS = 30_000;

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  userId?: string;
  timeoutMs?: number;
}

export async function aiServiceFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'POST', body, headers: extraHeaders, userId, timeoutMs = AI_SERVICE_TIMEOUT_MS } =
    options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Service-Key': AI_SERVICE_KEY,
    ...extraHeaders,
  };
  if (userId) {
    reqHeaders['X-User-Id'] = userId;
  }

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timerId);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AIServiceError(
      error.detail || `AI service error: ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
