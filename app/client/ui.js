import { isValidWord, playWord } from "../battle/combat.js";
import { createGameState, getPlayer } from "../battle/game.js";

let myPlayerId = null;
let currentWord = "";
let selectedTileIds = [];

let playerRack = document.getElementById("playerRack");

let opponentRack = document.getElementById("opponentRack");

let wordDisplay = document.getElementById("wordDisplay");

let playWordButton = document.getElementById("playWord");
let returnAllButton = document.getElementById("returnAll");
let shuffleButton = document.getElementById("shuffle");

playWordButton.disabled = true;

export function setPlayerId(playerId) {
    myPlayerId = playerId;
}

export function renderPlayerRack(gameState) {
    let player = getPlayer(gameState, myPlayerId);
    
    clearRack();

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

function updateCurrentWord(letter) {
    currentWord += letter;

    renderWordDisplay();

    validateWord();
}

function renderWordDisplay() {
    wordDisplay.textContent = currentWord;
}

function validateWord() {
    playWordButton.disabled = !isValidWord(currentWord);
}

function clearRack() {
    let tbody = playerRack.children[0]; 
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

    playWord(gameState, player, selectedTileIds);

    selectedTileIds = [];
    currentWord = "";

    renderPlayerRack(gameState);
    renderWordDisplay();
    playWordButton.disabled = true;
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

setPlayerId("0001");

renderPlayerRack(gameState);

console.log(gameState.players[0].rack);