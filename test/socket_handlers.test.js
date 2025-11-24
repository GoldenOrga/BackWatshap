import { expect } from "chai";
import { io } from "socket.io-client";
import http from "http";
import app from "../src/app.js";
import { setupSocket } from "../src/socket/handlers.js";
import User from "../src/models/User.js";
import Message from "../src/models/Message.js";
import Conversation from "../src/models/Conversation.js";
import jwt from "jsonwebtoken";
import "./test_helper.js";

describe("Socket.IO Handler Tests", () => {
  let server, port;
  let clientSocketAlice, clientSocketBob;
  let alice, bob, aliceToken, bobToken, conversation;

  before(async () => {
    port = process.env.PORT || 3001; 
    server = http.createServer(app);
    setupSocket(server);
    await new Promise((resolve) => server.listen(port, resolve));

    alice = await User.create({ name: "Alice", email: "alice@ws.com", password: "password123" });
    bob = await User.create({ name: "Bob", email: "bob@ws.com", password: "password123" });

    aliceToken = jwt.sign({ id: alice._id }, process.env.JWT_SECRET);
    bobToken = jwt.sign({ id: bob._id }, process.env.JWT_SECRET);

    conversation = await Conversation.create({ participants: [alice._id, bob._id], creator: alice._id });
  });

  after(() => {
    server.close();
  });

  afterEach(() => {
    
    if (clientSocketAlice && clientSocketAlice.connected) clientSocketAlice.disconnect();
    if (clientSocketBob && clientSocketBob.connected) clientSocketBob.disconnect();
  });

  const connectClient = (token) => {
    return io(`http://localhost:${port}`, {
      auth: { token },
      forceNew: true, 
    });
  };

  describe("Authentication and Connection", () => {
    it("should allow connection with a valid token", (done) => {
      clientSocketAlice = connectClient(aliceToken);
      clientSocketAlice.on("connect", () => {
        expect(clientSocketAlice.connected).to.be.true;
        done();
      });
    });

    it("should reject connection without a token", (done) => {
      const client = io(``, { forceNew: true });
      client.on("connect_error", (err) => {
        expect(err.message).to.equal("Token manquant");
        client.disconnect();
        done();
      });
    });
  });

  describe("User Status Events", () => {
    it("should broadcast 'user-status' when a user connects", (done) => {
      clientSocketAlice = connectClient(aliceToken);
      
      clientSocketAlice.on("user-status", (data) => {
        if (data.userId === bob._id.toString()) {
          expect(data.isOnline).to.be.true;
          done();
        }
      });
      
      clientSocketAlice.on("connect", () => {
        clientSocketBob = connectClient(bobToken);
      });
    });
    
    
    it("should broadcast 'user-status' when a user disconnects", (done) => {
      clientSocketAlice = connectClient(aliceToken);
      
      clientSocketAlice.on("user-status", async (data) => {
        
        if (data.userId === bob._id.toString() && !data.isOnline) {
          expect(data.isOnline).to.be.false;
          const userInDb = await User.findById(bob._id);
          expect(userInDb.isOnline).to.be.false;
          done(); 
        }
      });

      
      clientSocketAlice.on("connect", () => {
        
        clientSocketBob = connectClient(bobToken);
        clientSocketBob.on("connect", () => {
          
          clientSocketBob.disconnect();
        });
      });
    });
  });

  describe("Messaging Events", () => {
    
    it("should handle typing event and notify others in the room", (done) => {
      clientSocketAlice = connectClient(aliceToken);

      
      clientSocketAlice.on("user-typing", (data) => {
        expect(data.conversationId).to.equal(conversation._id.toString());
        expect(data.userName).to.equal("Bob");
        expect(data.isTyping).to.be.true;
        done();
      });

      
      clientSocketAlice.on("connect", () => {
        
        clientSocketBob = connectClient(bobToken);
        
        clientSocketBob.on("connect", () => {
          
          clientSocketBob.emit("typing", {
            conversationId: conversation._id.toString(),
            userName: "Bob",
            isTyping: true,
          });
        });
      });
    });

    
    it("should handle 'mark-conversation-as-read' and notify others", (done) => {
      new Message({
        sender: alice._id,
        conversation: conversation._id,
        content: "unread",
      }).save().then(() => {
        clientSocketAlice = connectClient(aliceToken);

        
        clientSocketAlice.on("messages-read", (data) => {
          expect(data.conversationId).to.equal(conversation._id.toString());
          expect(data.readerId).to.equal(bob._id.toString());
          done();
        });

        
        clientSocketAlice.on("connect", () => {
          
          clientSocketBob = connectClient(bobToken);
          
          clientSocketBob.on("connect", () => {
            
            clientSocketBob.emit("mark-conversation-as-read", {
              conversationId: conversation._id.toString(),
            });
          });
        });
      });
    });
  });
});