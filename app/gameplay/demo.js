import { createGameState, getCurrentPlayer, getOpponent } from "./game.js";
import { playWord, selectShuffle } from "./combat.js";
import { fillRack } from "./rack.js";

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
console.log(gameState)

for (let player of gameState.players) {
    fillRack(player);
}

console.log("\n****battle starts here****")

for (let player of gameState.players) {
    console.log("\nplayer:", player.username);
    console.log("hp:", player.health);
    console.log("rack:");
    for (let tile of player.rack) {
        console.log(tile.letter, "|", tile.points)
    }
}

let currentPlayer = getCurrentPlayer(gameState);
let opponent = getOpponent(gameState, currentPlayer.turnOrder);

console.log("\nturn:", gameState.turn);
console.log("current player:", currentPlayer.username);

let tileIds = [];
for (let i = 0; i < 5; i++) {
    let tile = currentPlayer.rack[i];
    tileIds.push(tile.id);
}

let result = playWord(gameState, currentPlayer, tileIds);

console.log("\n****turn result****")
console.log(currentPlayer.username, "played", result.word);
console.log(opponent.username, "took", result.damage, "damage");
console.log("event:", result.event);

console.log("\n****game state after turn", gameState.turn - 1, "****");

for (let player of gameState.players) {
    console.log("player: ", player.username);
    console.log("hp: ", player.health);
    console.log("rack:");
    for (let tile of player.rack) {
        console.log(tile.letter, "|", tile.points)
    }
}

currentPlayer = getCurrentPlayer(gameState);

console.log("\nturn:", gameState.turn);
console.log("next player:", currentPlayer.username);
opponent = getOpponent(gameState, currentPlayer.turnOrder);

tileIds = [];
for (let i = 0; i < 7; i++) {
    let tile = currentPlayer.rack[i];
    tileIds.push(tile.id);
}

result = playWord(gameState, currentPlayer, tileIds);

console.log("\n****turn result****")
console.log(currentPlayer.username, "played", result.word);
console.log(opponent.username, "took", result.damage, "damage");
console.log("event:", result.event);

console.log("\n****game state after turn", gameState.turn - 1, "****");

for (let player of gameState.players) {
    console.log("player: ", player.username);
    console.log("hp: ", player.health);
    console.log("rack:");
    for (let tile of player.rack) {
        console.log(tile.letter, "|", tile.points)
    }
}

currentPlayer = getCurrentPlayer(gameState);

console.log("\nturn:", gameState.turn);
console.log("next player:", currentPlayer.username);
opponent = getOpponent(gameState, currentPlayer.turnOrder);

result = selectShuffle(gameState, currentPlayer);

console.log("\n****turn result****")
console.log(currentPlayer.username, "shuffled!");
console.log("event:", result.event);

console.log("\n****game state after turn", gameState.turn - 1, "****");

for (let player of gameState.players) {
    console.log("player: ", player.username);
    console.log("hp: ", player.health);
    console.log("rack:");
    for (let tile of player.rack) {
        console.log(tile.letter, "|", tile.points)
    }
}

currentPlayer = getCurrentPlayer(gameState);

console.log("\nnext player:", currentPlayer.username);