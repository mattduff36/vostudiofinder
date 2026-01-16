// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Disable Sentry in development to prevent dev server slowdowns
const isDevelopment = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn: isDevelopment ? '' : "https://4df7b352b19b4aff1cd2001285747ecc@o4510694833061888.ingest.de.sentry.io/4510694867206224",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: isDevelopment ? 0 : 1,

  // Enable logs to be sent to Sentry - disabled in development
  enableLogs: isDevelopment ? false : true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: isDevelopment ? false : true,
});
