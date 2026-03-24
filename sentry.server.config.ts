import * as Sentry from "@sentry/nextjs";

const SENSITIVE_KEYS = new Set([
  "api_key",
  "apiKey",
  "password",
  "secret",
  "token",
  "authorization",
  "email",
  "cpf",
  "phone",
]);

function scrubPii(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = scrubPii(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.extra) {
      event.extra = scrubPii(event.extra as Record<string, unknown>);
    }
    if (event.request?.data && typeof event.request.data === "object") {
      event.request.data = scrubPii(
        event.request.data as Record<string, unknown>,
      );
    }
    return event;
  },
});
