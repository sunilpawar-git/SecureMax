/**
 * Structured logger — thin wrapper over console.
 * In production: outputs JSON. In dev: human-readable.
 * Strips PII patterns from messages before logging.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

// Emails + phone-like digit runs (10-15 digits covers full E.164 range)
const PII_PATTERNS = [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, /\b\d{10,15}\b/g];

function sanitize(msg: string): string {
  let clean = msg;
  for (const pattern of PII_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED]');
  }
  return clean;
}

interface LogEntry {
  level: string;
  message: string;
  context?: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry) {
  const safe = { ...entry, message: sanitize(entry.message) };
  if (IS_PROD) {
    const fn = entry.level === 'error' ? console.error : console.info;
    fn(JSON.stringify({ ...safe, timestamp: new Date().toISOString() }));
  } else {
    const prefix = `[${entry.context ?? 'app'}]`;
    if (entry.level === 'error') {
      console.error(prefix, safe.message, entry.data ?? '');
    } else if (entry.level === 'warn') {
      console.warn(prefix, safe.message, entry.data ?? '');
    } else {
      console.info(prefix, safe.message, entry.data ?? '');
    }
  }
}

export const logger = {
  info(message: string, context?: string, data?: unknown) {
    emit({ level: 'info', message, context, data });
  },
  warn(message: string, context?: string, data?: unknown) {
    emit({ level: 'warn', message, context, data });
  },
  error(message: string, context?: string, data?: unknown) {
    emit({ level: 'error', message, context, data });
  },
};
