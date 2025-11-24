import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import "dotenv/config";

export function initSentry(app) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    sendDefaultPii: true,

    tracesSampleRate: 1.0,

    profilesSampleRate: 1.0,

    integrations: [
      Sentry.expressIntegration({ app }),
      nodeProfilingIntegration(),
    ],
  });
}
