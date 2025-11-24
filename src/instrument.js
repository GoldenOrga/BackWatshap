import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://1f6696c9931598d365534f33aacdc8f7@o4510419135561728.ingest.de.sentry.io/4510419166363728",
  sendDefaultPii: true,
});
