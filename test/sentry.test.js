// test/sentry.test.js
import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import * as Sentry from '../src/config/sentry.js';

describe('Sentry config', () => {
  let app;
  let initStub;
  let requestHandlerStub;
  let errorHandlerStub;

  beforeEach(() => {
    app = express();
    initStub = sinon.stub(Sentry, 'init');
    requestHandlerStub = sinon.stub(Sentry.Handlers, 'requestHandler').returns('requestHandlerMiddleware');
    errorHandlerStub = sinon.stub(Sentry.Handlers, 'errorHandler').returns('errorHandlerMiddleware');
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.SENTRY_DSN;
    delete process.env.NODE_ENV;
  });

  it('should initialize Sentry and attach middlewares if SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'fake-dsn';
    process.env.NODE_ENV = 'test';

    Sentry.initSentry(app);

    expect(initStub.calledOnce).to.be.true;
    expect(initStub.firstCall.args[0]).to.include({ dsn: 'fake-dsn', environment: 'test', tracesSampleRate: 1.0 });

    // Vérifier que les middlewares ont été ajoutés à app
    const stack = app._router.stack.map(mw => mw.handle);
    expect(stack).to.include('requestHandlerMiddleware');
    expect(stack).to.include('errorHandlerMiddleware');
  });

  it('should not initialize Sentry if SENTRY_DSN is not set', () => {
    Sentry.initSentry(app);

    expect(initStub.called).to.be.false;
  });
});
