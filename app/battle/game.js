export function createGameState(users) {
    let orderedUsers;

    if (Math.random() < 0.5) { 
        orderedUsers = [users[0], users[1]];
    } else {
        orderedUsers = [users[1], users[0]];
    }

    let players = [];

    for (let i = 0; i < 2; i++) {
        let user = orderedUsers[i];

        let player = {
            id = user.id,
            username = user.username,
            turnOrder: i,
            rack: [],
            health: 100
        }
        
        players.push(player);
    }

    let gameState = {
        players: players,
        currentPlayer: 0,
        turn: 1
    }

    return gameState;
}

export function getPlayer(gameState, turnOrder) {
    return gameState.players[turnOrder];
}

export function getOpponent(gameState, turnOrder) {
    if (turnOrder == 0) {
        return gameState.players[1];
    }
    
    return gameState.players[0];
}

export function getCurrentPlayer(gameState) {
    return gameState.players[gameState.currentPlayer];
}

export function isPlayerTurn(gameState, turnOrder) {
    return gameState.currentPlayer == turnOrder;
}

export function switchTurn(gameState) {
    if (gameState.currentPlayer == 0) {
        gameState.currentPlayer = 1;
    } else {
        gameState.currentPlayer = 0;
    }

    gameState.turn++;
}