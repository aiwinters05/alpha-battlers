/*
 * database.js: every SQL query in the accounts system.
 */

import pg from "pg";
import crypto from "crypto";
import { readFileSync } from "fs";

const env = JSON.parse(readFileSync(new URL("./env.json", import.meta.url)));
const pool = new pg.Pool(env);

// An idle connection can break on its own (database restarted, laptop slept).
// Without this listener Node treats that as a crash and kills the server.
pool.on("error", (error) => {
    console.log("Idle database client error:", error.message);
});

pool.connect()
    .then((client) => {
        client.release();
        console.log(`Connected to database ${env.database}`);
    })
    .catch((error) => {
        console.log("Could not connect to database:", error.message);
        process.exit(1);
    });

// How long a login lasts before the player has to sign in again.
const SESSION_HOURS = 12;

// Postgres error code for "you broke a UNIQUE rule".
const UNIQUE_VIOLATION = "23505";

/* ------------------------------------------------------------------ users */

// Returns the new row, or null if the username is already taken.
async function createUser(username, passwordHash) {
    try {
        let result = await pool.query(
            `INSERT INTO users (username, password_hash)
             VALUES ($1, $2)
             RETURNING id, username, created_at`,
            [username, passwordHash]
        );
        return result.rows[0];
    } catch (error) {
        if (error.code === UNIQUE_VIOLATION) {
            return null;
        }
        throw error;
    }
}

// Includes password_hash, so only the login route may call this.
async function getUserByUsername(username) {
    let result = await pool.query(
        `SELECT id, username, password_hash
         FROM users
         WHERE LOWER(username) = LOWER($1)`,
        [username]
    );
    return result.rows[0] || null;
}

// Safe version: no password hash. Used when looking someone up by name to
// send them a friend request.
async function findUser(username) {
    let result = await pool.query(
        `SELECT id, username
         FROM users
         WHERE LOWER(username) = LOWER($1)`,
        [username]
    );
    return result.rows[0] || null;
}

/*  sessions */

// Makes a random token, saves it, and returns it. The token is what goes in
// the browser's cookie.
async function createSession(userId) {
    let token = crypto.randomBytes(32).toString("hex");
    await pool.query(
        `INSERT INTO sessions (token, user_id, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' hours')::INTERVAL)`,
        [token, userId, SESSION_HOURS]
    );
    return token;
}

// Trades a token for the player it belongs to. Returns null if the token is
// fake or expired -- the expiry is checked by the database, not by us.
async function getUserForToken(token) {
    let result = await pool.query(
        `SELECT users.id, users.username, users.created_at
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token = $1 AND sessions.expires_at > NOW()`,
        [token]
    );
    return result.rows[0] || null;
}

async function deleteSession(token) {
    await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

async function deleteExpiredSessions() {
    let result = await pool.query(`DELETE FROM sessions WHERE expires_at <= NOW()`);
    return result.rowCount;
}

/* ---------------------------------------------------------------- friends */

// Sends a friend request. Returns "sent", "duplicate", or "accepted"
// ("accepted" means they had already asked us, so this completes it).
async function sendFriendRequest(fromId, toId) {
    // Did they already ask us? Then saying yes back means we are friends.
    let existing = await pool.query(
        `SELECT status FROM friends
         WHERE requester_id = $1 AND addressee_id = $2`,
        [toId, fromId]
    );

    if (existing.rows[0]) {
        if (existing.rows[0].status === "accepted") {
            return "duplicate";
        }
        await acceptFriendRequest(fromId, toId);
        return "accepted";
    }

    try {
        await pool.query(
            `INSERT INTO friends (requester_id, addressee_id)
             VALUES ($1, $2)`,
            [fromId, toId]
        );
        return "sent";
    } catch (error) {
        if (error.code === UNIQUE_VIOLATION) {
            return "duplicate";
        }
        throw error;
    }
}

// meId accepts a request that otherId sent. Returns true if a request was
// actually waiting.
async function acceptFriendRequest(meId, otherId) {
    let result = await pool.query(
        `UPDATE friends
         SET status = 'accepted'
         WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
        [otherId, meId]
    );
    return result.rowCount > 0;
}

// Removes a friendship or a request, whichever direction it was stored in.
async function removeFriend(meId, otherId) {
    let result = await pool.query(
        `DELETE FROM friends
         WHERE (requester_id = $1 AND addressee_id = $2)
            OR (requester_id = $2 AND addressee_id = $1)`,
        [meId, otherId]
    );
    return result.rowCount > 0;
}

// The friends list, with an online flag for each one.
//
// The CASE picks "the other person": if I am the requester, the friend is the
// addressee, otherwise the friend is the requester. The LEFT JOIN looks for
// them in online_users -- a match means they are connected right now.
async function getFriends(meId) {
    let result = await pool.query(
        `SELECT users.id,
                users.username,
                (online_users.user_id IS NOT NULL) AS online
         FROM friends
         JOIN users ON users.id = CASE
                WHEN friends.requester_id = $1 THEN friends.addressee_id
                ELSE friends.requester_id
             END
         LEFT JOIN online_users ON online_users.user_id = users.id
         WHERE (friends.requester_id = $1 OR friends.addressee_id = $1)
           AND friends.status = 'accepted'
         ORDER BY online DESC, LOWER(users.username)`,
        [meId]
    );
    return result.rows;
}

// Requests other people sent me that I have not answered yet.
async function getIncomingRequests(meId) {
    let result = await pool.query(
        `SELECT users.id, users.username, friends.created_at
         FROM friends
         JOIN users ON users.id = friends.requester_id
         WHERE friends.addressee_id = $1 AND friends.status = 'pending'
         ORDER BY friends.created_at`,
        [meId]
    );
    return result.rows;
}

// Requests I sent that nobody has answered yet.
async function getOutgoingRequests(meId) {
    let result = await pool.query(
        `SELECT users.id, users.username, friends.created_at
         FROM friends
         JOIN users ON users.id = friends.addressee_id
         WHERE friends.requester_id = $1 AND friends.status = 'pending'
         ORDER BY friends.created_at`,
        [meId]
    );
    return result.rows;
}

/* --------------------------------------------------------------- presence */

// Mark a player online. ON CONFLICT means a second tab updates the existing
// row instead of failing on the primary key.
async function setOnline(userId) {
    await pool.query(
        `INSERT INTO online_users (user_id)
         VALUES ($1)
         ON CONFLICT (user_id)
         DO UPDATE SET last_seen = NOW()`,
        [userId]
    );
}

async function setOffline(userId) {
    await pool.query(`DELETE FROM online_users WHERE user_id = $1`, [userId]);
}

// Called periodically while a socket is alive, so a row that stops being
// refreshed can be recognised as stale.
async function touchOnline(userId) {
    await pool.query(
        `UPDATE online_users SET last_seen = NOW() WHERE user_id = $1`,
        [userId]
    );
}

async function getOnlineUsers() {
    let result = await pool.query(
        `SELECT users.id, users.username, online_users.connected_at
         FROM online_users
         JOIN users ON users.id = online_users.user_id
         ORDER BY LOWER(users.username)`
    );
    return result.rows;
}

// If the server crashed, old rows are left behind claiming people are online.
// Nobody is connected at startup, so the table starts empty.
async function clearOnlineUsers() {
    let result = await pool.query(`DELETE FROM online_users`);
    return result.rowCount;
}

// Safety net for sockets that die without firing a close event.
async function deleteStaleOnlineUsers(minutes) {
    let result = await pool.query(
        `DELETE FROM online_users
         WHERE last_seen < NOW() - ($1 || ' minutes')::INTERVAL`,
        [minutes]
    );
    return result.rowCount;
}

export {
    SESSION_HOURS,
    createUser,
    getUserByUsername,
    findUser,
    createSession,
    getUserForToken,
    deleteSession,
    deleteExpiredSessions,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    getFriends,
    getIncomingRequests,
    getOutgoingRequests,
    setOnline,
    setOffline,
    touchOnline,
    getOnlineUsers,
    clearOnlineUsers,
    deleteStaleOnlineUsers,
};
