import { TILES } from "../data/tiles.js";

let INIT_TILE_COUNT = 10;
let MIN_TILE_COUNT = 6;
let MAX_TILE_COUNT = 16;

export function randomTile() {
    let random = Math.random() * 100;
    let current = 0;

    for (let tile of TILES) {
        current +=  tile.rate;

        if (random < current) {
            return tile;	
        }
    }	
}

export function createTile() {
    let tileData = randomTile();

    return {
        id: crypto.randomUUID(),
        letter: tileData.letter,
        points: tileData.value
    };
}

export function drawTile(player) {
    let tile = createTile();

    player.rack.push(tile);
}

export function getTileCount(player) {
    return INIT_TILE_COUNT + player.turnOrder;
}

export function fillRack(player) {
    let tileCount = getTileCount(player);

    while (player.rack.length < tileCount) {
        drawTile(player);
    }
}

export function getPlayedTiles(player, tileIds) {
    let playedTiles = []

    for (let i = 0; i < tileIds.length; i++) {
        let tileId = tileIds[i];

        for (let j = 0; j < player.rack.length; j++) {
            let tile = player.rack[j];

            if (tile.id === tileId) {
                playedTiles.push(tile)

                break;
            }
        }
    }

    return playedTiles;
}

export function removeTiles(player, playedTiles) {
    for (let i = 0; i < playedTiles.length; i++) {
        let playedTile = playedTiles[i];

        for (let j = 0; j < player.rack.length; j++) {
            let tile = player.rack[j];

            if (tile.id === playedTile.id) {
                player.rack.splice(j, 1);

                break;
            }
        }
    }
}

export function clearRack(player) {
    player.rack.length = 0;
}

export function replenishRack(player, tilesPlayed) {
    let min = tilesPlayed - 1;
    let max = tilesPlayed + 2;

    let tilesToDraw = Math.floor(Math.random() * (max - min + 1)) + min;

    while (tilesToDraw > 0 && player.rack.length < MAX_TILE_COUNT) {
        drawTile(player);
        tilesToDraw--;
    }

    while (player.rack.length < MIN_TILE_COUNT) {
        drawTile(player);
    }
}

export function shuffleRack(player) {
    let numTiles = player.rack.length;

    clearRack(player);

    numTiles--;

    if (numTiles < MIN_TILE_COUNT) {
        numTiles = MIN_TILE_COUNT;
    }

    while (player.rack.length < numTiles) {
        drawTile(player);
    }
}