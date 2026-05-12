/**
 * HTTP client for FastAPI AI service.
 * All questionnaire and report calls go through here.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY || '';

if (!AI_SERVICE_URL) {
  console.warn('[ai-service] AI_SERVICE_URL not set — defaulting to localhost:8000');
}

const BASE_URL = AI_SERVICE_URL || 'http://localhost:8000';

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function aiServiceFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'POST', body, headers: extraHeaders } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': AI_SERVICE_KEY,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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
