import express from "express";
import { WebSocketServer } from "ws";
import {
  createRequest,
  acceptRequest,
  rejectRequest,
  getConnectionForUser,
  getOtherUser,
  endConnection,
  attachGameState,
  getGameConnection,
} from "./connections.js";
import { createGameState, getPlayer, getOpponent, isPlayerTurn } from "./gameplay/game.js";
import { playWord, selectShuffle } from "./gameplay/combat.js";
import { loadWords } from "./gameplay/validator.js";
import http from "http";
import cookieParser from "cookie-parser";
import accountRoutes from "./accounts/routes-accounts.js";
import * as presence from "./accounts/presence.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


await loadWords(); 

const app = express();


const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(accountRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.use("/client", express.static(path.join(__dirname, "client")));
app.use("/gameplay", express.static(path.join(__dirname, "gameplay")));
app.use("/data", express.static(path.join(__dirname, "data")));

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Website: http://0.0.0.0:${PORT}`);
});

const wss = new WebSocketServer({server});

await presence.clearAll();

const clients = new Map();   // userId -> ws
const usernames = new Map(); // userId -> username

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

// only send players own rack to them
function publicRack(player) {
  return player.rack.map((t) => ({ id: t.id, letter: t.letter, points: t.points }));
}

function sendGameStart(gameState) {
  for (const player of gameState.players) {
    const opponent = getOpponent(gameState, player.id);
    sendToUser(player.id, {
      type: "game_start",
      you: {
        id: player.id,
        health: player.health,
        rack: publicRack(player),
        turnOrder: player.turnOrder,
      },
      opponent: {
        id: opponent.id,
        username: opponent.username,
        health: opponent.health,
        rackCount: opponent.rack.length,
      },
      currentPlayer: gameState.players[gameState.currentPlayer].id,
    });
  }
}

wss.on("connection", async (ws, request) => {
  const newId = getId();

  clients.set(newId, ws);

  // work out who this is from their login cookie
  const user = await presence.identify(request);

  if (user) {
    ws.user = user;
    usernames.set(newId, user.username);
    await presence.setOnline(user.id);
  }

  console.log(`${newId} connected`, user ? `as ${user.username}` : "(not logged in)");

  send(ws, { type: "id", id: newId, username: user ? user.username : null });

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (err) {
      send(ws, { type: "error", message: "Invalid message format" });
      return;
    }

    switch (msg.type) {
      case "set_username": {
        usernames.set(newId, String(msg.username || `Player${newId}`));
        break;
      }

      case "connect_request": {
        const toId = Number(msg.to);
        try {
          const conn = createRequest(newId, toId);
          const receiver = clients.get(toId);
          if (!receiver) {
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

          // build the two user objects game.js is expecting
          const users = [
            { id: newId, username: usernames.get(newId) || `Player${newId}` },
            { id: otherUser, username: usernames.get(otherUser) || `Player${otherUser}` },
          ];
          const gameState = createGameState(users);
          attachGameState(conn.id, gameState);

          sendGameStart(gameState);
        } catch (err) {
          send(ws, { type: "connect_request_failed", message: err.message });
        }
        break;
      }

      case "connect_reject": {
        try {
          const conn = rejectRequest(msg.connectionId, newId);
          sendToUser(conn.userA, { type: "connect_rejected", connectionId: conn.id });
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

      case "play_word": {
        const conn = getGameConnection(newId);
        if (!conn || !conn.gameState) {
          send(ws, { type: "error", message: "You are not in an active game" });
          return;
        }
        const gameState = conn.gameState;

        if (!isPlayerTurn(gameState, newId)) {
          send(ws, { type: "error", message: "It's not your turn" });
          return;
        }

        const player = getPlayer(gameState, newId);
        const opponent = getOpponent(gameState, newId);
        const result = playWord(gameState, player, msg.tileIds || []);
        const currentPlayerId = gameState.players[gameState.currentPlayer].id;

        if (result.event === "invalidWord") {
          send(ws, { type: "invalid_word", word: result.word });
          return;
        }

        // give the player their own updated rack + result
        send(ws, {
          type: result.event,
          word: result.word,
          damage: result.damage,
          yourHealth: player.health,
          opponentHealth: opponent.health,
          rack: publicRack(player),
          currentPlayer: currentPlayerId, 
        });

        //update opponents info (dont send the rack)
        sendToUser(opponent.id, {
          type: result.event === "gameFinish" ? "gameFinish" : "opponentPlayed",
          word: result.word,
          damage: result.damage,
          yourHealth: opponent.health,
          opponentHealth: player.health,
          opponentRackCount: player.rack.length,
          currentPlayer: currentPlayerId,  
        });

        if (result.event === "gameFinish") {
          endConnection(newId);
        }
        break;
      }

      case "shuffle": {
        const conn = getGameConnection(newId);
        if (!conn || !conn.gameState) {
          send(ws, { type: "error", message: "You are not in an active game" });
          return;
        }
        const gameState = conn.gameState;

        if (!isPlayerTurn(gameState, newId)) {
          send(ws, { type: "error", message: "It's not your turn" });
          return;
        }

        const player = getPlayer(gameState, newId);
        const opponent = getOpponent(gameState, newId);
        selectShuffle(gameState, player);
        const currentPlayerId = gameState.players[gameState.currentPlayer].id;  // ← add

        send(ws, { type: "shuffle", rack: publicRack(player), currentPlayer: currentPlayerId });  // ← add field
        sendToUser(opponent.id, { type: "opponentShuffled", opponentRackCount: player.rack.length, currentPlayer: currentPlayerId });  // ← add field
        break;
      }

      default:
        send(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on("close", async () => {
    const otherUser = getOtherUser(newId);
    const conn = endConnection(newId);
    if (conn && otherUser) {
      sendToUser(otherUser, { type: "opponent_disconnected", from: newId });
    }
    clients.delete(newId);
    usernames.delete(newId);
    if (ws.user) {
      await presence.setOffline(ws.user.id);
    }
    console.log(`Client ${newId} disconnected`);
  });
});