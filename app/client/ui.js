import { getPlayer, getOpponent, MAX_HEALTH } from "../gameplay/game.js";

let ws = null;
let myPlayerId = null;
let currentWord = "";
let selectedTileIds = [];
let allUsedTileIds = [];
let gameState = null;
let myTurn = false;

let playerRack = document.getElementById("playerRack");
let wordDisplay = document.getElementById("wordDisplay");
let playerUsername = document.getElementById("playerUsername");
let playerHp = document.getElementById("playerHp");

let opponentRack = document.getElementById("opponentRack");
let opponentUsername = document.getElementById("opponentUsername");
let opponentHp = document.getElementById("opponentHp");

let playWordButton = document.getElementById("playWord");
let returnAllButton = document.getElementById("returnAll");
let shuffleButton = document.getElementById("shuffle");

playWordButton.disabled = true;
returnAllButton.disabled = true;

export function initBattle(existingWs, startMsg) {
  ws = existingWs;
  myPlayerId = startMsg.you.id;

  ws.addEventListener("message", (event) => {
    handleMessage(JSON.parse(event.data));
  });

  // process the game_start message that was already received on the homepage
  handleMessage(startMsg);
}

let leaveButton = document.createElement("button");
leaveButton.id = "leaveGame";
leaveButton.className = "player-button";
leaveButton.textContent = "Leave Game";
document.getElementById("playerButtons").appendChild(leaveButton);
 
leaveButton.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "disconnect_request" }));
  location.href = "/homepage/homepage.html";
});


// --- socket message handling ---

function handleMessage(msg) {
  switch (msg.type) {
    case "game_start":
      setupGameState(msg);
      break;

    case "playWord":
    case "gameFinish": {
      // this is the result of MY OWN move
      const me = getPlayer(gameState, myPlayerId);
      me.rack = msg.rack;
      me.health = msg.yourHealth;
      const opp = getOpponent(gameState, myPlayerId);
      opp.health = msg.opponentHealth;

      renderPlayerRack(gameState);
      renderPlayerHp(gameState);
      renderOpponentHp(gameState);
      resetSelectedTiles(gameState);

      myTurn = msg.type === "gameFinish" ? false : false; // it's opponent's turn now
      updateTurnUI();

      if (msg.type === "gameFinish") {
        alert(`You win! Played "${msg.word}" for ${msg.damage} damage.`);
      }
      break;
    }

    case "opponentPlayed": {
      // opponent just played against ME
      const me = getPlayer(gameState, myPlayerId);
      me.health = msg.yourHealth;
      const opp = getOpponent(gameState, myPlayerId);
      opp.health = msg.opponentHealth;

      renderPlayerHp(gameState);
      renderOpponentHp(gameState);

      myTurn = true; // it's my turn now
      updateTurnUI();
      break;
    }

    case "invalid_word":
      alert(`"${msg.word}" is not a valid word.`);
      break;

    case "shuffle": {
      const me = getPlayer(gameState, myPlayerId);
      me.rack = msg.rack;
      renderPlayerRack(gameState);
      resetSelectedTiles(gameState);
      myTurn = false;
      updateTurnUI();
      break;
    }

    case "opponentShuffled":
      myTurn = true;
      updateTurnUI();
      break;

    case "opponent_disconnected":
      alert("Your opponent disconnected.");
      break;

    case "error":
      console.error("server error:", msg.message);
      alert(msg.message);
      break;

    default:
      console.warn("unhandled message type:", msg.type);
  }
}

function setupGameState(msg) {
  const opponentTurnOrder = msg.you.turnOrder === 0 ? 1 : 0;

  gameState = {
    players: [
      {
        id: msg.you.id,
        username: "You",
        turnOrder: msg.you.turnOrder,
        health: msg.you.health,
        rack: msg.you.rack,
      },
      {
        id: msg.opponent.id,
        username: msg.opponent.username,
        turnOrder: opponentTurnOrder,
        health: msg.opponent.health,
        rack: new Array(msg.opponent.rackCount).fill(null).map(() => ({ id: null, letter: "?", points: 0 })),
      },
    ],
  };

  myTurn = msg.currentPlayer === msg.you.id;

  renderPlayerRack(gameState);
  renderOpponentRack(gameState);
  renderPlayerUsername(gameState);
  renderPlayerHp(gameState);
  renderOpponentUsername(gameState);
  renderOpponentHp(gameState);
  updateTurnUI();
}

function updateTurnUI() {
  if (!myTurn) {
    playWordButton.disabled = true;
    returnAllButton.disabled = true;
    shuffleButton.disabled = true;
  } else {
    shuffleButton.disabled = false;
    updateButtons(); // playWord/returnAll depend on currentWord too
  }
}

// --- rendering (unchanged from before, just reading the local mirror) ---

function renderPlayerRack(gameState) {
  let player = getPlayer(gameState, myPlayerId);

  clearRack(playerRack);

  let tbody = playerRack.children[0];
  let row = tbody.children[0];

  for (let i = 0; i < player.rack.length; i++) {
    let tile = player.rack[i];
    let td = row.children[i];

    td.classList.add("tile");
    td.classList.remove("empty");

    let letter = td.children[0];
    let points = td.children[1];

    letter.textContent = tile.letter;
    points.textContent = tile.points;

    td.addEventListener("click", () => {
      if (!myTurn) return;
      if (!selectedTileIds.includes(tile.id) || !allUsedTileIds.includes(tile.id)) {
        selectedTileIds.push(tile.id);
        allUsedTileIds.push(tile.id);
        td.classList.add("selected");
        updateCurrentWord(tile.letter);
      }
    });
  }
}

function renderOpponentRack(gameState) {
  let opponent = getOpponent(gameState, myPlayerId);

  clearRack(opponentRack);

  let tbody = opponentRack.children[0];
  let row = tbody.children[0];

  for (let i = 0; i < opponent.rack.length; i++) {
    let td = row.children[i];
    td.classList.add("tile");
    td.classList.remove("empty");
    let letter = td.children[0];
    letter.textContent = "?";
  }
}

function updateCurrentWord(letter) {
  currentWord += letter;
  renderWordDisplay();
  updateButtons();
}

function renderWordDisplay() {
  wordDisplay.textContent = currentWord;
}

function updateButtons() {
  // NOTE: client-side word check here is just for UI (greying out the button).
  // The server is still the one that actually validates and resolves the play.
  playWordButton.disabled = !myTurn || currentWord.length === 0;
  returnAllButton.disabled = !myTurn || currentWord.length === 0;
}

function renderPlayerUsername(gameState) {
  playerUsername.textContent = "You";
}

function renderOpponentUsername(gameState) {
  let opponent = getOpponent(gameState, myPlayerId);
  opponentUsername.textContent = opponent.username;
}

function renderPlayerHp(gameState) {
  let player = getPlayer(gameState, myPlayerId);
  playerHp.textContent = `HP: (${player.health}/${MAX_HEALTH})`;
}

function renderOpponentHp(gameState) {
  let opponent = getOpponent(gameState, myPlayerId);
  opponentHp.textContent = `HP: (${opponent.health}/${MAX_HEALTH})`;
}

function clearRack(rack) {
  let tbody = rack.children[0];
  let row = tbody.children[0];

  for (let i = 0; i < row.children.length; i++) {
    let tile = row.children[i];
    let letter = tile.children[0];
    let points = tile.children[1];
    letter.textContent = "";
    points.textContent = "";
    tile.classList.add("empty");
    tile.classList.remove("selected");
  }
}

function resetSelectedTiles(gameState) {
  selectedTileIds = [];
  currentWord = "";
  renderPlayerRack(gameState);
  renderWordDisplay();
  updateTurnUI();
}

// --- button handlers now send socket messages instead of running logic locally ---

playWordButton.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "play_word", tileIds: selectedTileIds }));
  playWordButton.disabled = true; // avoid double-sends while waiting for server
  returnAllButton.disabled = true;
});

returnAllButton.addEventListener("click", () => {
  resetSelectedTiles(gameState);
});

shuffleButton.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "shuffle" }));
  shuffleButton.disabled = true;
});