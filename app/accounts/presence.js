import * as db from "./database.js";
import * as auth from "./auth.js";

// how many live sockets each player has open right now
const socketCounts = new Map();

function addSocket(userId) {
    let count = (socketCounts.get(userId) || 0) + 1;
    socketCounts.set(userId, count);
    return count;
}

// returns how many sockets are left after this one goes away
function removeSocket(userId) {
    let count = (socketCounts.get(userId) || 1) - 1;

    if (count <= 0) {
        socketCounts.delete(userId);
        return 0;
    }

    socketCounts.set(userId, count);
    return count;
}

// figures out which player a connecting socket belongs to
export async function identify(request) {
    let token = auth.readTokenFromCookieHeader(request.headers.cookie);

    if (!token) {
        return null;
    }

    return db.getUserForToken(token);
}

// call when a socket connects and we know who it belongs to
export async function setOnline(userId) {
    addSocket(userId);
    await db.setOnline(userId);
}

// call when a socket closes; only really offline once the last tab is gone
export async function setOffline(userId) {
    if (removeSocket(userId) === 0) {
        await db.setOffline(userId);
    }
}

// nobody can be connected before the server starts, so clear leftovers
export async function clearAll() {
    socketCounts.clear();
    await db.clearOnlineUsers();
}



