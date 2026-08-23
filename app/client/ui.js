import { isValidWord } from "../battle/combat.js";
import { getPlayer } from "../battle/game.js";

let myPlayerId = null;
let currentWord = "";
let selectedTileIds = [];

let playerRack = document.getElementById("playerRack");

let opponentRack = document.getElementById("opponentRack");

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

        let letter = tile.children[0];
        let points = tile.children[1];

        letter.textContent = "";
        points.textContent = "";

        td.classList.remove("empty");

        td.addEventListener("click", () => {
            if (!selectedTileIds.has(tile.id)) {
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
    renderWordDisplay.textContent = currentWord;
}

function validateWord() {
    if (isValidWord(currentWord)) {
        playButton.disabled = true;
    }
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
    }
}