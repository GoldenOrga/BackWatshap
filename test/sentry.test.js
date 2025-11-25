// test/sentry.test.js
import { expect } from 'chai';
import express from 'express';
import * as Sentry from '../src/config/sentry.js';

describe('Sentry config', () => {
  let app;

  beforeEach(() => {
    app = express();
    delete process.env.SENTRY_DSN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.NODE_ENV;
  });

  // it('should initialize Sentry and attach middlewares if SENTRY_DSN is set', () => {
  //   process.env.SENTRY_DSN = 'fake-dsn';
  //   process.env.NODE_ENV = 'test';

  //   // Call the initSentry function
  //   Sentry.initSentry(app);

  //   // If SENTRY_DSN is set, the app should have more middleware than before
  //   // Sentry middleware should be added to the app
  //   // Check if _router exists and has stack, otherwise the middleware count is 0
  //   const middlewareCount = app._router?.stack?.length || 0;
    
  //   // We expect Sentry to have added at least 2 middlewares (request and error handler)
  //   expect(middlewareCount).to.be.at.least(2);
  // });

  it('should not initialize Sentry if SENTRY_DSN is not set', () => {
    // No SENTRY_DSN set
    process.env.NODE_ENV = 'test';
    
    app = express();
    const initialCount = app._router?.stack?.length || 0;
    
    Sentry.initSentry(app);

    // Without SENTRY_DSN, no additional middlewares should be added
    const finalCount = app._router?.stack?.length || 0;
    expect(finalCount).to.equal(initialCount);
  });
});
