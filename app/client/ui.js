import { calculateDamage, playWord, selectShuffle } from "../battle/combat.js";
import { createGameState, getPlayer, getOpponent, MAX_HEALTH, isPlayerTurn } from "../battle/game.js";
import { getPlayedTiles } from "../battle/rack.js";
import { isValidWord, loadWords } from "../battle/validator.js";

let myPlayerId = null;
let currentWord = "";
let selectedTileIds = [];

let playerRack = document.getElementById("playerRack");
let wordDisplay = document.getElementById("wordDisplay");
let damageDisplay = document.getElementById("damageDisplay");
let playerUsername = document.getElementById("playerUsername");
let playerHp = document.getElementById("playerHp");

let eventLog = document.getElementsById("eventLog");

let opponentRack = document.getElementById("opponentRack");
let opponentUsername = document.getElementById("opponentUsername");
let opponentHp = document.getElementById("opponentHp");

let playWordButton = document.getElementById("playWord");
let returnAllButton = document.getElementById("returnAll");
let shuffleButton = document.getElementById("shuffle");

disableAllButtons();

export function setPlayerId(playerId) {
    myPlayerId = playerId;
}

export function renderGame(gameState) {
    renderPlayerArea(gameState);

    renderOpponentArea(gameState);

    renderWordDisplay();
    renderDamageDisplay(gameState);
    updateButtons(gameState);
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

playWordButton.addEventListener("click", () => {
    let player = getPlayer(gameState, myPlayerId);

    let result = playWord(gameState, player, selectedTileIds);
    console.log(`${player.username} played ${result.word} for ${result.damage} damage!`)

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

let users = [
	{
		id: "0001",
		username: "Genevieve"
	},
	{
		id: "0002",
		username: "Aubry"
	}
];

let gameState = createGameState(users);

setPlayerId("0001");

renderGame(gameState);