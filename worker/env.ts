export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  OWNER_EMAIL?: string;
  PREVIEW?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}
