export interface Env {
  DB: D1Database;
  BACKUPS?: R2Bucket;
  BETTER_AUTH_SECRET: string;
  OWNER_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  PREVIEW?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  AUTH_LIMIT?: RateLimit;
  PUBLIC_LIMIT?: RateLimit;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}
