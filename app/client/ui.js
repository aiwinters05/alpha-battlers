import { calculateDamage, playWord, selectShuffle } from "../gameplay/combat.js";
import { createGameState, getPlayer, getOpponent, MAX_HEALTH, isPlayerTurn, switchTurn } from "../gameplay/game.js";
import { getPlayedTiles } from "../gameplay/rack.js";
import { isValidWord, loadWords } from "../gameplay/validator.js";

let myPlayerId = null;
let currentWord = "";
let selectedTileIds = [];
// stuff to communicate with server
let ws = null;
let gameState = null;

let playerRack = document.getElementById("playerRack");
let wordDisplay = document.getElementById("wordDisplay");
let damageDisplay = document.getElementById("damageDisplay");
let playerUsername = document.getElementById("playerUsername");
let playerHp = document.getElementById("playerHp");

let eventLog = document.getElementById("eventLog");

let opponentRack = document.getElementById("opponentRack");
let opponentUsername = document.getElementById("opponentUsername");
let opponentHp = document.getElementById("opponentHp");

let playWordButton = document.getElementById("playWord");
let returnAllButton = document.getElementById("returnAll");
let shuffleButton = document.getElementById("shuffle");

disableAllButtons();

// leave button for disconnecting
let leaveButton = document.createElement("button");
leaveButton.id = "leaveGame";
leaveButton.className = "player-button";
leaveButton.textContent = "Leave Game";
document.getElementById("playerButtons").appendChild(leaveButton);

leaveButton.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "disconnect_request" }));
  location.href = "/homepage/homepage.html";
});


// creating battle from opened websocket
export function initBattle(existingWs, startMsg){
  ws = existingWs;

  ws.addEventListener("message", (event) => {
    handleMessage(JSON.parse(event.data))
  })

  handleMessage(startMsg);
}

function logEvent(text){
  if (!eventLog)
    return;
  let line = document.createElement("div");
  line.textContent = text;
  eventLog.appendChild(line);
}

export function setPlayerId(playerId) {
    myPlayerId = playerId;
}

// new game state creation function
// we need to create this new function so the server has its own one real game state to change
// additionally, the client only stores the portions of it that its allowed to store so there isnt a privacy issue
function buildGameStateFromStart(msg) {
    let opponentTurnOrder = msg.you.turnOrder === 0 ? 1 : 0;
 
    let currentPlayerTurnOrder = (msg.currentPlayer === msg.you.id) ? msg.you.turnOrder : opponentTurnOrder;
 
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
        currentPlayer: currentPlayerTurnOrder,
        turn: 1,
    };
 
    myPlayerId = msg.you.id;
}

// socket message handling
function handleMessage(msg) {
    switch (msg.type) {
        case "game_start":
            buildGameStateFromStart(msg);
            renderGame(gameState);
            break;
 
        case "playWord":
        case "opponentPlayed":
        case "gameFinish": {
            if (msg.rack) {
                // show own move
                let me = getPlayer(gameState, myPlayerId);
                me.rack = msg.rack;
                me.health = msg.yourHealth;
                let opp = getOpponent(gameState, myPlayerId);
                opp.health = msg.opponentHealth;
 
                logEvent(`${me.username} played ${msg.word} for ${msg.damage} damage!`);
 
                resetSelectedTiles();
 
                if (msg.type === "gameFinish") {
                    renderGame(gameState);
                    alert(`You win! Played "${msg.word}" for ${msg.damage} damage.`);
                    location.href = "/homepage/homepage.html";
                    break;
                }
 
                applyCurrentPlayer(gameState, msg.currentPlayer);
                renderGame(gameState);
            } else {
                // other players move
                let me = getPlayer(gameState, myPlayerId);
                me.health = msg.yourHealth;
                let opp = getOpponent(gameState, myPlayerId);
                opp.health = msg.opponentHealth;
 
                logEvent(`${opp.username} played ${msg.word} for ${msg.damage} damage!`);
 
                if (msg.type === "gameFinish") {
                    renderGame(gameState);
                    alert(`You lost. ${opp.username} played "${msg.word}" for ${msg.damage} damage.`);
                    location.href = "/homepage/homepage.html";
                    break;
                }
 
                applyCurrentPlayer(gameState, msg.currentPlayer);
                renderGame(gameState);
            }
            break;
        }
 
        case "invalid_word":
            logEvent(`"${msg.word}" is not a valid word.`);
            break;
 
        case "shuffle": {
            let me = getPlayer(gameState, myPlayerId);
            me.rack = msg.rack;
            logEvent(`${me.username} shuffled!`);
            resetSelectedTiles();
            applyCurrentPlayer(gameState, msg.currentPlayer);
            renderGame(gameState);
            break;
        }
 
        case "opponentShuffled": {
            let opp = getOpponent(gameState, myPlayerId);
            logEvent(`${opp.username} shuffled!`);
            applyCurrentPlayer(gameState, msg.currentPlayer);
            renderGame(gameState);
            break;
        }
 
        case "opponent_disconnected":
            alert("Your opponent disconnected.");
            location.href = "/homepage/homepage.html";
            break;
 
        case "error":
            logEvent(`Error: ${msg.message}`);
            break;
 
        default:
            console.warn("unhandled message type:", msg.type);
    }
}


export function renderGame(gameState) {
    renderPlayerArea(gameState);

    renderOpponentArea(gameState);

    renderWordDisplay();
    renderDamageDisplay(gameState);
    updateButtons(gameState);
}

// because client keeping track of turn led to bug where it stops switching and its no ones turn
function applyCurrentPlayer(gameState, currentPlayerId) {
    if (currentPlayerId == null) return;
    let player = getPlayer(gameState, currentPlayerId);
    if (player) gameState.currentPlayer = player.turnOrder;
}


function renderPlayerArea(gameState) {
    if (!isPlayerTurn(gameState, myPlayerId)) {
        playerRack.classList.add("rack-disabled");
    } else {
        playerRack.classList.remove("rack-disabled");
    }
    renderPlayerRack(gameState);
    renderPlayerUsername(gameState);
    renderPlayerHp(gameState);
}

function renderOpponentArea(gameState) {
    renderOpponentRack(gameState);
    renderOpponentUsername(gameState);
    renderOpponentHp(gameState);
} 


function renderPlayerRack(gameState) {
    // returns the player object
    let player = getPlayer(gameState, myPlayerId);
    
    //iterates through, removes any text content + selected tile CSS
    clearRack(playerRack);

    let tbody = playerRack.children[0];
    let row = tbody.children[0];

    for (let i = 0; i < player.rack.length; i++) {
        let tile = player.rack[i];

        let temp = row.children[i];
        let td = temp.cloneNode(true);

        row.replaceChild(td, temp);

        td.classList.add("tile");
        td.classList.add("player-tile");

        //removes CSS that makes it appear empty
        td.classList.remove("empty");

        let letter = td.children[0];
        let points = td.children[1];

        letter.textContent = tile.letter;
        points.textContent = tile.points;

        td.addEventListener("click", () => {
            //checks if tile ID has already been selected or used previously
            if (!selectedTileIds.includes(tile.id)) {
                //adds tile ID to list of tile IDs that is used to identify the current word
                //and to a list of all previously used tile IDs
                selectedTileIds.push(tile.id);
                
                //adds CSS that makes it appear selected
                td.classList.add("selected");
                
                //adds letter to word display and string of current word
                updateCurrentWord(gameState, tile.letter);
            }
        })
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
        td.classList.add("opponent-tile");
        td.classList.remove("empty");

        let letter = td.children[0];

        letter.textContent = "?"
    }
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

function renderPlayerUsername(gameState) {
    let player = getPlayer(gameState, myPlayerId);

    playerUsername.textContent = player.username;
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

function renderWordDisplay() {
    wordDisplay.textContent = currentWord;
}

function renderDamageDisplay(gameState) {
    let player = getPlayer(gameState, myPlayerId);

    let playedTiles = getPlayedTiles(player, selectedTileIds);

    let damage = calculateDamage(playedTiles);

    if (damage === 0 || !isValidWord(currentWord)) {
        damageDisplay.textContent = "";
    } else {
        damageDisplay.textContent = `${damage} damage`;
    }
    
}

function updateButtons(gameState) {
    if (!isPlayerTurn(gameState, myPlayerId)) {
        disableAllButtons();

        return;
    }

    playWordButton.disabled = !(isValidWord(currentWord) && currentWord.length >= 3);
    returnAllButton.disabled = (currentWord.length === 0);
    shuffleButton.disabled = false;
}

function disableAllButtons() {
    playWordButton.disabled = true;
    returnAllButton.disabled = true;
    shuffleButton.disabled = true;
}

// have bnutton presses send messages to server

playWordButton.addEventListener("click", () => {
    let player = getPlayer(gameState, myPlayerId);

    let result = playWord(gameState, player, selectedTileIds);
    console.log(`${player.username} played ${result.word} for ${result.damage} damage!`)

    ws.send(JSON.stringify({ type: "play_word", tileIds: selectedTileIds }));

    resetSelectedTiles();
    
    renderGame(gameState);
})

returnAllButton.addEventListener("click", () => {
    resetSelectedTiles();  

    renderGame(gameState);
})

shuffleButton.addEventListener("click", () => {
    let player = getPlayer(gameState, myPlayerId);

    let result = selectShuffle(gameState, player);
    console.log(`${player.username} shuffled!`)

    ws.send(JSON.stringify({ type: "shuffle" }));

    resetSelectedTiles(); 
    
    renderGame(gameState);
})

function updateCurrentWord(gameState, letter) {
    currentWord += letter;

    renderWordDisplay();
    renderDamageDisplay(gameState);

    updateButtons(gameState);
}

function resetSelectedTiles() {
    selectedTileIds = [];
    currentWord = "";
}

await loadWords();

// let users = [
// 	{
// 		id: "0001",
// 		username: "Genevieve"
// 	},
// 	{
// 		id: "0002",
// 		username: "Aubry"
// 	}
// ];

// let gameState = createGameState(users);

// setPlayerId("0001");

// renderGame(gameState);