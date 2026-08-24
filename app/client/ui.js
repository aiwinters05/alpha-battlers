import { isValidWord, playWord, selectShuffle } from "../battle/combat.js";
import { createGameState, getPlayer, getOpponent, MAX_HEALTH } from "../battle/game.js";
import { shuffleRack } from "../battle/rack.js";

let myPlayerId = null;
let currentWord = "";
let selectedTileIds = [];

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

export function setPlayerId(playerId) {
    myPlayerId = playerId;
}

export function renderPlayerRack(gameState) {
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
            if (!selectedTileIds.includes(tile.id)) {
                selectedTileIds.push(tile.id);
                td.classList.add("selected");

                updateCurrentWord(tile.letter);
            }
        })
    }
}

export function renderOpponentRack(gameState) {
    let opponent = getOpponent(gameState, myPlayerId);
    
    clearRack(opponentRack);

    let tbody = opponentRack.children[0];
    let row = tbody.children[0];

    for (let i = 0; i < opponent.rack.length; i++) {
        let td = row.children[i];
        
        td.classList.add("tile");
        td.classList.remove("empty");

        let letter = td.children[0];

        letter.textContent = "?"
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
    playWordButton.disabled = !isValidWord(currentWord);
    returnAllButton.disabled = (currentWord.length === 0);
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

playWordButton.addEventListener("click", () => {
    let player = getPlayer(gameState, myPlayerId);

    let result = playWord(gameState, player, selectedTileIds);
    console.log(`${player.username} played ${result.word} for ${result.damage} damage!`)
    renderOpponentHp(gameState);

    selectedTileIds = [];
    currentWord = "";

    renderPlayerRack(gameState);
    renderWordDisplay();
    playWordButton.disabled = true;
    returnAllButton.disabled = true;
})

returnAllButton.addEventListener("click", () => {
    selectedTileIds = [];
    currentWord = "";

    renderPlayerRack(gameState);
    renderWordDisplay();
    playWordButton.disabled = true;
    returnAllButton.disabled = true;
})

shuffleButton.addEventListener("click", () => {
    let player = getPlayer(gameState, myPlayerId);

    let result = selectShuffle(gameState, player);
    console.log(`${player.username} shuffled!`)

    selectedTileIds = [];
    currentWord = "";

    renderPlayerRack(gameState);
    renderWordDisplay();
    playWordButton.disabled = true;
    returnAllButton.disabled = true;
})

let users = [
	{
		id: "0001",
		username: "Alice1"
	},
	{
		id: "0002",
		username: "Bob2"
	}
];

let gameState = createGameState(users);

setPlayerId("0002");

renderPlayerRack(gameState);
renderOpponentRack(gameState);
renderPlayerUsername(gameState);
renderPlayerHp(gameState);
renderOpponentUsername(gameState);
renderOpponentHp(gameState);

console.log(gameState.players[0].rack);