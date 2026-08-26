import { getOpponent, switchTurn } from "./game.js";
import { getPlayedTiles, removeTiles, replenishRack, shuffleRack } from "./rack.js";
import { isValidWord } from "./validator.js";

export function calculateDamage(playedTiles) {
    let damage = 0;

    for (let i = 0; i < playedTiles.length; i++) {
        damage += playedTiles[i].points;
    }

    return damage;
}

export function damagePlayer(player, damage) {
    player.health -= damage;

    if (player.health < 0) {
        player.health = 0;
    }
}

export function formWord(playedTiles) {
    let word = "";

    for (let i = 0; i < playedTiles.length; i++) {
        word += playedTiles[i].letter;
    }

    return word;
}

export function playWord(gameState, player, tileIds) {
    let playedTiles = getPlayedTiles(player, tileIds);

    let word = formWord(playedTiles);

    if (!isValidWord(word)) {
        return {
            event: "invalidWord",
            word: word
        }
    }

    let opponent = getOpponent(gameState, player.id);

    let damage = calculateDamage(playedTiles);

    removeTiles(player, playedTiles);

    replenishRack(player, playedTiles.length);

    damagePlayer(opponent, damage);

    if (opponent.health <= 0) {
        return {
            event: "gameFinish",
            word: word,
            damage: damage
        }
    }

    switchTurn(gameState);

    return {
        event: "playWord",
        word: word,
        damage: damage,
    }
}

export function selectShuffle(gameState, player) {
    shuffleRack(player);

    switchTurn(gameState);

    return {
        event: "shuffle",
    }
}