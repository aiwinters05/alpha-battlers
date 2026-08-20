import { TILES as tiles } from "../../data/tiles.js";

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

function randomTile() {
	let random = Math.random() * 100;
	let current = 0;

	for (let tile of tiles) {
		current +=  tile.rate;

		if (random < current) {
			return tile;	
		}
	}	
}

function drawTile(player) {
	let tile = randomTile();
	player.rack.push(tile);
}

function getTileCount(player) {
	return INIT_TILE_COUNT + player.turnOrder;
}

function fillRack(player) {
	let tileCount = getTileCount(player);

	while (player.rack.length < tileCount) {
		drawTile(player);
	}
}

/*
function createRack(player) {
	let rack = document.createElement("div");
	rack.classList.add("rack");

	for (let tileData of player.rack) {
		let tile = document.createElement("div");
		tile.classList.add("tile");

		tile.dataset.letter = tileData.letter;
		tile.textContent = tileData.letter;
		
		tile.addEventListener('click', () => {
			if (!isPlayerTurn(player, gameState)) {
				return;
			}

			tile.classList.toggle("selected");
		});

		let score = document.createElement("div");
		score.classList.add("score");
		score.textContent = tileData.points;
		
		tile.appendChild(score);
		rack.appendChild(tile);
	}
	
	return rack;
}

function getSelectedLetters() {
	let selectedTiles = document.querySelectorAll(".tile.selected");

	let selectedLetters = [];

	for (let tile of selectedTiles) {
		selectedLetters.push(tile.dataset.letter);
	}

	return selectedLetters;
}

function getSelectedWord() {
	let letters = getSelectedLetters();

	return letters.join("").toLowerCase();
}
*/

function calculateDamage() {
	let damage = 0;

	for (let tile of selectedTiles) {
		damage += tile.points;
	}

	return damage;
}

function createGameState(users) {
	let orderedUsers = [];

	if (Math.random() < 0.5) {
		orderedUsers = [users[0], users[1]];
	} else {
		orderedUsers = [users[1], users[0]];
	}	
	
	let players = [];	

	for (let i = 0; i < 2; i++) {
		let user = orderedUsers[i];	
		
		let player = {
			id: user.id,
			username: user.username,
			turnOrder: i,
			rack: [],
			health: 100
		};
		
		fillRack(player);
		
		players.push(player);
	}
	
	let gameState = {
		players: players,
		current: 0,
		turn: 1
	};
	
	return gameState;
}

let gameState = createGameState(users);

console.log(gameState);
