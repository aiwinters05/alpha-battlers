const express = require("express");
const WebSocket = require("ws");
const {
  createRequest,
  acceptRequest,
  rejectRequest,
  getConnectionForUser,
  getOtherUser,
  endConnection,
  isConnected,
} = require("./connections");

const app = express();

app.use(express.static("public"));

app.listen(3000, () => {
  console.log("Website: http://localhost:3000");
});

const wss = new WebSocket.Server({ port: 3001 });

const clients = new Map(); // userId -> ws

let uniqueId = 1;

function getId() {
  return uniqueId++;
}

function send(ws, payload) {
  ws.send(JSON.stringify(payload));
}

function sendToUser(userId, payload) {
  const ws = clients.get(userId);
  if (ws) send(ws, payload);
}

wss.on("connection", (ws) => {
  const newId = getId(); // fixed: was missing let/const, causing a shared global

  clients.set(newId, ws);
  console.log(`${newId} connected`);

  send(ws, { type: "id", id: newId });

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (err) {
      send(ws, { type: "error", message: "Invalid message format" });
      return;
    }

    switch (msg.type) {
        // testing direct message
      case "dm": {
        const toId = Number(msg.to);
        const receiver = clients.get(toId);
        if (!receiver) {
          send(ws, { type: "error", message: "Player not found" });
          return;
        }
        send(receiver, { type: "dm", from: newId, message: msg.message });
        break;
      }

      // connection requests
      case "connect_request": {
        const toId = Number(msg.to);
        try {
          const conn = createRequest(newId, toId);
          const receiver = clients.get(toId);
          if (!receiver) {
            // target isn't online — roll back the request we just created
            endConnection(newId);
            send(ws, { type: "connect_request_failed", message: "Player not found" });
            return;
          }
          send(receiver, {
            type: "incoming_connect_request",
            from: newId,
            connectionId: conn.id,
          });
        } catch (err) {
          send(ws, { type: "connect_request_failed", message: err.message });
        }
        break;
      }

      case "connect_accept": {
        try {
          const conn = acceptRequest(msg.connectionId, newId);
          const otherUser = getOtherUser(newId);
          send(ws, { type: "connect_accepted", connectionId: conn.id, with: otherUser });
          sendToUser(otherUser, { type: "connect_accepted", connectionId: conn.id, with: newId });
        } catch (err) {
          send(ws, { type: "connect_request_failed", message: err.message });
        }
        break;
      }

      case "connect_reject": {
        try {
          const conn = rejectRequest(msg.connectionId, newId);
          const requester = conn.userA;
          sendToUser(requester, { type: "connect_rejected", connectionId: conn.id });
        } catch (err) {
          send(ws, { type: "connect_request_failed", message: err.message });
        }
        break;
      }

      case "disconnect_request": {
        const otherUser = getOtherUser(newId);
        const conn = endConnection(newId);
        if (conn && otherUser) {
          sendToUser(otherUser, { type: "opponent_disconnected", from: newId });
        }
        break;
      }

      // game move
      case "play_word": {
        if (!isConnected(newId)) {
          send(ws, { type: "error", message: "You are not connected to an opponent" });
          return;
        }
        const otherUser = getOtherUser(newId);
        sendToUser(otherUser, {
          type: "opponent_played",
          from: newId,
          word: msg.word,
          points: msg.points,
        });
        break;
      }

      default:
        send(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on("close", () => {
    const otherUser = getOtherUser(newId);
    const conn = endConnection(newId);
    if (conn && otherUser) {
      sendToUser(otherUser, { type: "opponent_disconnected", from: newId });
    }
    clients.delete(newId);
    console.log(`Client ${newId} disconnected`);
  });
});