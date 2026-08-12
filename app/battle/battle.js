import { TILES as tiles } from "../data/tiles.js";

let INIT_TILE_COUNT = 10;

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

function createRack(turnOrder) {
	let rack = document.createElement("div");
	rack.classList.add("rack");

	let tileCount = INIT_TILE_COUNT + turnOrder;
	
	for (let i = 0; i < tileCount; i++) {
		let tileData = randomTile();
		
		let tile = document.createElement("div");
		tile.classList.add("tile");
		tile.textContent = tileData.letter;
	
		let score = document.createElement("div");
		score.classList.add("score");
		score.textContent = tileData.points;
		
		tile.appendChild(score);
		rack.appendChild(tile);
	}
	
	return rack;
}
