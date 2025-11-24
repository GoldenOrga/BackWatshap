import request from "supertest";
import { expect } from "chai";
import sinon from "sinon";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Message from "../src/models/Message.js";
import Conversation from "../src/models/Conversation.js";
import mongoose from "mongoose";
import socketManager from "../src/socket/index.js";
import "./test_helper.js";

describe("API Tests - Message & Conversation Routes", () => {
  let user1, user2, user3, authToken1, authToken2, authToken3;
  let conv1to2, messageInConv;

  
  before(() => {
    sinon.stub(socketManager, "getIo").returns({
      to: sinon.stub().returns({
        emit: sinon.stub(),
      }),
      sockets: { sockets: new Map() },
    });
    socketManager.userSockets.clear();
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(async () => {
    
    user1 = await User.create({ name: "UserOne", email: "user1@test.com", password: "password123" });
    user2 = await User.create({ name: "UserTwo", email: "user2@test.com", password: "password123" });
    user3 = await User.create({ name: "UserThree", email: "user3@test.com", password: "password123" });

    const res1 = await request(app).post("/api/auth/login").send({ email: "user1@test.com", password: "password123" });
    authToken1 = res1.body.accessToken;
    const res2 = await request(app).post("/api/auth/login").send({ email: "user2@test.com", password: "password123" });
    authToken2 = res2.body.accessToken;
    const res3 = await request(app).post("/api/auth/login").send({ email: "user3@test.com", password: "password123" });
    authToken3 = res3.body.accessToken;

    
    conv1to2 = await Conversation.create({
      participants: [user1._id, user2._id],
      creator: user1._id,
      unreadCounts: [{ user: user1._id, count: 0 }, { user: user2._id, count: 0 }]
    });
    messageInConv = await Message.create({ sender: user1._id, conversation: conv1to2._id, content: "Hello" });
    conv1to2.lastMessage = messageInConv._id;
    await conv1to2.save();
  });

  
  describe("POST /api/messages/conversations", () => {
    it("should create a new 1-on-1 conversation", async () => {
      const res = await request(app)
        .post("/api/messages/conversations")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({ participantIds: [user3._id] });

      expect(res.statusCode).to.equal(201);
      expect(res.body.participants).to.have.lengthOf(2);
    });

    it("should create a new group conversation", async () => {
      const res = await request(app)
        .post("/api/messages/conversations")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({ participantIds: [user2._id, user3._id], name: "Test Group" });

      expect(res.statusCode).to.equal(201);
      expect(res.body.name).to.equal("Test Group");
      expect(res.body.participants).to.have.lengthOf(3);
    });

    it("should return an existing 1-on-1 conversation if it already exists", async () => {
      const res = await request(app)
        .post("/api/messages/conversations")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({ participantIds: [user2._id] });

      expect(res.statusCode).to.equal(200);
      expect(res.body._id).to.equal(conv1to2._id.toString());
    });
    
    it("should return 400 if trying to create a conversation with less than 2 participants", async () => {
        const res = await request(app)
            .post("/api/messages/conversations")
            .set("Authorization", `Bearer ${authToken1}`)
            .send({ participantIds: [] });
        
        expect(res.statusCode).to.equal(400);
    });
  });

  
  describe("POST /api/messages", () => {
    it("should create a message in an existing conversation", async () => {
      const res = await request(app)
        .post("/api/messages")
        .set("Authorization", `Bearer ${authToken2}`)
        .send({ conversation_id: conv1to2._id, content: "Reply from user 2" });

      expect(res.statusCode).to.equal(201);
      expect(res.body.content).to.equal("Reply from user 2");
      const conv = await Conversation.findById(conv1to2._id);
      expect(conv.lastMessage.toString()).to.equal(res.body._id);
    });

    it("should return 403 if user is not in the conversation", async () => {
      const res = await request(app)
        .post("/api/messages")
        .set("Authorization", `Bearer ${authToken3}`)
        .send({ conversation_id: conv1to2._id, content: "Intrusion" });
      expect(res.statusCode).to.equal(403);
    });

    it("should return 404 for a non-existent conversation", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post("/api/messages")
            .set("Authorization", `Bearer ${authToken1}`)
            .send({ conversation_id: fakeId, content: "Hello?" });
        expect(res.statusCode).to.equal(404);
    });

    it("should return 400 if conversation_id or content is missing", async () => {
        const res = await request(app)
            .post("/api/messages")
            .set("Authorization", `Bearer ${authToken1}`)
            .send({ conversation_id: conv1to2._id }); 
        expect(res.statusCode).to.equal(400);
    });
  });

  
  describe("GET /api/messages/conversations", () => {
    it("should retrieve all conversations for the logged-in user", async () => {
        
        await request(app)
            .post("/api/messages")
            .set("Authorization", `Bearer ${authToken2}`)
            .send({ conversation_id: conv1to2._id, content: "Unread message" });

        const res = await request(app)
            .get("/api/messages/conversations")
            .set("Authorization", `Bearer ${authToken1}`);
        
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an("array").with.lengthOf(1);
        expect(res.body[0].unreadCount).to.equal(1);
        expect(res.body[0].conversationName).to.equal("UserTwo");
    });
  });

  
  describe("GET /api/messages/conversation/:conversation_id", () => {
    it("should get messages for a specific conversation", async () => {
      const res = await request(app)
        .get(`/api/messages/conversation/${conv1to2._id}`)
        .set("Authorization", `Bearer ${authToken2}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an("array").with.lengthOf(1);
      expect(res.body[0].content).to.equal("Hello");
    });

    it("should return 403 if user is not a participant", async () => {
        const res = await request(app)
            .get(`/api/messages/conversation/${conv1to2._id}`)
            .set("Authorization", `Bearer ${authToken3}`);
        expect(res.statusCode).to.equal(403);
    });
  });

  
  describe("PUT /api/messages/:id", () => {
    it("should edit a message successfully", async () => {
      const res = await request(app)
        .put(`/api/messages/${messageInConv._id}`)
        .set("Authorization", `Bearer ${authToken1}`)
        .send({ content: "Edited" });
      expect(res.statusCode).to.equal(200);
      expect(res.body.edited).to.be.true;
    });

    it("should return 403 when editing another user's message", async () => {
        const res = await request(app)
            .put(`/api/messages/${messageInConv._id}`)
            .set("Authorization", `Bearer ${authToken2}`)
            .send({ content: "Trying to edit" });
        expect(res.statusCode).to.equal(403);
    });

    it("should return 404 for a non-existent message", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .put(`/api/messages/${fakeId}`)
            .set("Authorization", `Bearer ${authToken1}`)
            .send({ content: "Editing nothing" });
        expect(res.statusCode).to.equal(404);
    });
  });

  
  describe("DELETE /api/messages/:id", () => {
    it("should soft delete a message successfully", async () => {
        const res = await request(app)
            .delete(`/api/messages/${messageInConv._id}`)
            .set("Authorization", `Bearer ${authToken1}`);
        
        expect(res.statusCode).to.equal(200);
        
        const deletedMsg = await Message.findById(messageInConv._id);
        expect(deletedMsg.deleted).to.be.true;
        expect(deletedMsg.content).to.equal("Ce message a été supprimé.");
    });
    
    it("should return 403 when deleting another user's message", async () => {
        const res = await request(app)
            .delete(`/api/messages/${messageInConv._id}`)
            .set("Authorization", `Bearer ${authToken2}`);
        expect(res.statusCode).to.equal(403);
    });
  });

  
  describe("DELETE /api/messages/conversations/:conversationId/leave", () => {
    let groupConv;

    beforeEach(async () => {
      groupConv = await Conversation.create({
        name: "Group To Leave",
        participants: [user1._id, user2._id, user3._id],
        creator: user1._id,
      });
    });

    it("should allow a participant to leave a conversation", async () => {
      const res = await request(app)
        .delete(`/api/messages/conversations/${groupConv._id}/leave`)
        .set("Authorization", `Bearer ${authToken1}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal("Vous avez quitté la conversation.");

      const updatedConv = await Conversation.findById(groupConv._id);
      expect(updatedConv.participants).to.have.lengthOf(2);
      expect(updatedConv.participants.map((p) => p.toString())).to.not.include(
        user1._id.toString()
      );
    });

    it("should return 403 if a non-participant tries to leave", async () => {
      const res = await request(app)
        .delete(`/api/messages/conversations/${conv1to2._id}/leave`)
        .set("Authorization", `Bearer ${authToken3}`); 
      expect(res.statusCode).to.equal(403);
    });

    it("should delete the conversation if the last participant leaves", async () => {
      const singlePersonConv = await Conversation.create({ participants: [user1._id], creator: user1._id });

      const res = await request(app)
        .delete(`/api/messages/conversations/${singlePersonConv._id}/leave`)
        .set("Authorization", `Bearer ${authToken1}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.contain("supprimée car elle est maintenant vide");

      const deletedConv = await Conversation.findById(singlePersonConv._id);
      expect(deletedConv).to.be.null;
    });

    it("should return 404 for a non-existent conversation", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/messages/conversations/${nonExistentId}/leave`)
        .set("Authorization", `Bearer ${authToken1}`);
      expect(res.statusCode).to.equal(404);
    });
  });

  
  describe("POST /api/messages/:id/read", () => {
    it("should fail because 'receiver' property does not exist on the Message model", async () => {
        
        
        const res = await request(app)
            .post(`/api/messages/${messageInConv._id}/read`)
            .set("Authorization", `Bearer ${authToken2}`); 

        expect(res.statusCode).to.equal(500); 
    });
  });
});