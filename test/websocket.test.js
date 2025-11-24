import { expect } from 'chai';
import { io } from 'socket.io-client';
import http from 'http';
import app from '../src/app.js';
import { setupSocket } from '../src/socket/handlers.js';
import User from '../src/models/User.js';
import jwt from 'jsonwebtoken';
import './test_helper.js'; 

describe('WebSocket Tests', () => {
  let server;
  let clientSocketAlice, clientSocketBob;
  let alice, bob, aliceToken, bobToken;

  afterEach(() => {
    if (clientSocketAlice) clientSocketAlice.close();
    if (clientSocketBob) clientSocketBob.close();
  });
  

  before(async () => {

    await new Promise((resolve) => {
      server = http.createServer(app);
      setupSocket(server);
      server.listen(process.env.PORT, resolve); 
    });


    alice = await User.create({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
    bob = await User.create({ name: 'Bob', email: 'bob@example.com', password: 'password456' });
    aliceToken = jwt.sign({ id: alice._id }, process.env.JWT_SECRET);
    bobToken = jwt.sign({ id: bob._id }, process.env.JWT_SECRET);
  });

  after(() => {

    server.close();
  });

  it('should connect with a valid token', (done) => {
    clientSocketAlice = io(`http://localhost:${process.env.PORT}`, { 
      auth: { token: aliceToken },
      transports: ['websocket'] 
    });
    clientSocketAlice.on('connect', () => {
      expect(clientSocketAlice.connected).to.be.true;
      done();
    });
  });

  it('should reject connection without a token', (done) => {
    const client = io(`http://localhost:${process.env.PORT}`, { transports: ['websocket'] });
    client.on('connect_error', (err) => {
      expect(err.message).to.equal('Token manquant');
      client.close();
      done();
    });
  });

  it('Alice should receive a message from Bob', (done) => {
    clientSocketAlice = io(`http://localhost:${process.env.PORT}`, { auth: { token: aliceToken }, transports: ['websocket'] });
    clientSocketBob = io(`http://localhost:${process.env.PORT}`, { auth: { token: bobToken }, transports: ['websocket'] });

    clientSocketAlice.on('receive-message', (message) => {
      expect(message.content).to.equal('Hello Alice!');
      expect(message.sender.toString()).to.equal(bob._id.toString());
      done();
    });
    
    clientSocketBob.on('connect', () => {
      clientSocketBob.emit('send-message', {
        receiverId: alice._id.toString(),
        content: 'Hello Alice!'
      }, (ack) => {
          expect(ack.success).to.be.true;
      });
    });
  });
});