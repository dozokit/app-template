export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  OWNER_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  PREVIEW?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}
