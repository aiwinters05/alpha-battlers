/*
 * test-database.js -- tests the database layer on its own.
 *
 * 
 *
 * Run it with:   node test-database.js
 * 
 *
 * It makes accounts named dbtest_<random>, then deletes them at the end.
 */

const pg = require("pg");
const db = require("./database.js");
const env = require("./env.json");

// A second connection of our own, so the test can look at the tables directly
// and set up situations database.js has no function for (like an expired
// session).
const pool = new pg.Pool(env);

let failures = 0;
let names = [];

function check(name, condition, detail) {
    if (condition) {
        console.log(`PASS  ${name}`);
    } else {
        console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`);
        failures++;
    }
}

// Runs something we expect to be rejected by the database.
async function expectRejected(name, work) {
    try {
        await work();
        check(name, false, "it was allowed");
    } catch (error) {
        check(name, true);
    }
}

function newName(tag) {
    let name = `dbtest_${tag}_${Math.floor(Math.random() * 100000)}`;
    names.push(name);
    return name;
}

async function main() {
    console.log("--- createTables.sql: are the tables and rules really there?");

    let tables = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public'`
    );
    let tableNames = tables.rows.map((row) => row.table_name);

    for (let expected of ["users", "sessions", "friends", "online_users"]) {
        check(`table ${expected} exists`, tableNames.includes(expected),
            `found: ${tableNames.join(", ")}`);
    }

    console.log("");
    console.log("--- users");

    let nameA = newName("a");
    let nameB = newName("b");

    let userA = await db.createUser(nameA, "fake_hash_for_testing");
    check("createUser returns the new row", userA && userA.username === nameA,
        JSON.stringify(userA));
    check("the new row has an id number", typeof userA.id === "number");

    let duplicate = await db.createUser(nameA, "fake_hash_for_testing");
    check("duplicate username returns null", duplicate === null,
        JSON.stringify(duplicate));

    let capitalised = await db.createUser(nameA.toUpperCase(), "fake_hash_for_testing");
    check("duplicate ignoring capitals returns null", capitalised === null,
        JSON.stringify(capitalised));

    let userB = await db.createUser(nameB, "fake_hash_for_testing");
    check("a different username works", userB !== null);

    let found = await db.getUserByUsername(nameA.toUpperCase());
    check("getUserByUsername ignores capitals", found && found.id === userA.id);
    check("getUserByUsername includes the hash", found.password_hash !== undefined);

    let safe = await db.findUser(nameA);
    check("findUser does NOT include the hash", safe.password_hash === undefined,
        JSON.stringify(safe));

    let missing = await db.findUser("nobody_with_this_name_12345");
    check("unknown name returns null", missing === null);

    let injection = await db.findUser("x' OR '1'='1");
    check("injection-style name finds nobody", injection === null,
        JSON.stringify(injection));

    console.log("");
    console.log("--- sessions");

    let token = await db.createSession(userA.id);
    check("token is 64 characters", token.length === 64, `got ${token.length}`);
    check("token is only hex characters", /^[0-9a-f]+$/.test(token));

    let secondToken = await db.createSession(userA.id);
    check("two logins give two different tokens", token !== secondToken);

    let whoIsIt = await db.getUserForToken(token);
    check("a good token finds the player", whoIsIt && whoIsIt.id === userA.id);
    check("the player comes back without a hash", whoIsIt.password_hash === undefined);

    let fake = await db.getUserForToken("this_token_was_never_issued");
    check("a made-up token finds nobody", fake === null);

    // Backdate one session so it counts as expired.
    await pool.query(
        `UPDATE sessions SET expires_at = NOW() - INTERVAL '1 hour' WHERE token = $1`,
        [secondToken]
    );
    let expired = await db.getUserForToken(secondToken);
    check("an expired token finds nobody", expired === null);

    let sweptCount = await db.deleteExpiredSessions();
    check("deleteExpiredSessions removes it", sweptCount >= 1, `removed ${sweptCount}`);

    let stillGood = await db.getUserForToken(token);
    check("the good token still works after the sweep", stillGood !== null);

    await db.deleteSession(token);
    let afterLogout = await db.getUserForToken(token);
    check("deleteSession kills the token", afterLogout === null);

    console.log("");
    console.log("--- friends");

    let sent = await db.sendFriendRequest(userA.id, userB.id);
    check("A asks B -> sent", sent === "sent", sent);

    let again = await db.sendFriendRequest(userA.id, userB.id);
    check("asking twice -> duplicate", again === "duplicate", again);

    let notFriendsYet = await db.getFriends(userA.id);
    check("a pending request is not a friendship", notFriendsYet.length === 0,
        JSON.stringify(notFriendsYet));

    let incoming = await db.getIncomingRequests(userB.id);
    check("B sees one request waiting", incoming.length === 1);
    check("and it is from A", incoming[0] && incoming[0].username === nameA);

    let outgoing = await db.getOutgoingRequests(userA.id);
    check("A sees one request sent", outgoing.length === 1);

    let accepted = await db.acceptFriendRequest(userB.id, userA.id);
    check("B accepts", accepted === true);

    let acceptAgain = await db.acceptFriendRequest(userB.id, userA.id);
    check("accepting twice does nothing", acceptAgain === false);

    let aFriends = await db.getFriends(userA.id);
    check("A now has one friend", aFriends.length === 1, JSON.stringify(aFriends));
    check("and it is B", aFriends[0] && aFriends[0].username === nameB);
    check("B shows as offline", aFriends[0] && aFriends[0].online === false);

    let bFriends = await db.getFriends(userB.id);
    check("B sees A too (one row, both directions)",
        bFriends.length === 1 && bFriends[0].username === nameA,
        JSON.stringify(bFriends));

    let rows = await pool.query(
        `SELECT COUNT(*) FROM friends
         WHERE requester_id IN ($1, $2) AND addressee_id IN ($1, $2)`,
        [userA.id, userB.id]
    );
    check("the friendship is stored as ONE row", rows.rows[0].count === "1",
        `found ${rows.rows[0].count}`);

    // The "they already asked you" shortcut.
    let nameC = newName("c");
    let userC = await db.createUser(nameC, "fake_hash_for_testing");
    await db.sendFriendRequest(userC.id, userA.id);
    let shortcut = await db.sendFriendRequest(userA.id, userC.id);
    check("asking back accepts instead of making a second row",
        shortcut === "accepted", shortcut);

    let removed = await db.removeFriend(userA.id, userB.id);
    check("removeFriend works", removed === true);

    let removeAgain = await db.removeFriend(userA.id, userB.id);
    check("removing a non-friend returns false", removeAgain === false);

    console.log("");
    console.log("--- rules the database enforces by itself");

    await expectRejected("cannot friend yourself", () =>
        pool.query(`INSERT INTO friends (requester_id, addressee_id) VALUES ($1, $1)`,
            [userA.id])
    );

    await expectRejected("status must be pending or accepted", () =>
        pool.query(
            `INSERT INTO friends (requester_id, addressee_id, status)
             VALUES ($1, $2, 'accpeted')`,
            [userA.id, userB.id]
        )
    );

    await expectRejected("a session cannot point at a missing user", () =>
        pool.query(
            `INSERT INTO sessions (token, user_id, expires_at)
             VALUES ('x', 999999999, NOW() + INTERVAL '1 hour')`
        )
    );

    await expectRejected("username cannot be longer than 20 characters", () =>
        pool.query(`INSERT INTO users (username, password_hash) VALUES ($1, 'h')`,
            ["a".repeat(21)])
    );

    console.log("");
    console.log("--- online_users");

    await db.setOnline(userA.id);
    let online = await db.getOnlineUsers();
    check("setOnline puts them in the list",
        online.some((row) => row.username === nameA), JSON.stringify(online));

    await db.setOnline(userA.id);
    let stillOne = await db.getOnlineUsers();
    let times = stillOne.filter((row) => row.username === nameA).length;
    check("setOnline twice still means one row", times === 1, `found ${times}`);

    await db.sendFriendRequest(userA.id, userB.id);
    await db.acceptFriendRequest(userB.id, userA.id);
    let bSees = await db.getFriends(userB.id);
    check("a friend who is online shows online === true",
        bSees[0] && bSees[0].online === true, JSON.stringify(bSees));

    await db.touchOnline(userA.id);
    let touched = await pool.query(
        `SELECT last_seen > NOW() - INTERVAL '5 seconds' AS fresh
         FROM online_users WHERE user_id = $1`,
        [userA.id]
    );
    check("touchOnline refreshes last_seen", touched.rows[0].fresh === true);

    // Pretend this player's connection died 10 minutes ago.
    await pool.query(
        `UPDATE online_users SET last_seen = NOW() - INTERVAL '10 minutes'
         WHERE user_id = $1`,
        [userA.id]
    );
    let swept = await db.deleteStaleOnlineUsers(5);
    check("a stale row gets swept away", swept >= 1, `swept ${swept}`);

    await db.setOnline(userA.id);
    await db.setOffline(userA.id);
    let afterOffline = await db.getOnlineUsers();
    check("setOffline removes them",
        !afterOffline.some((row) => row.username === nameA));

    await db.setOnline(userA.id);
    await db.clearOnlineUsers();
    let afterClear = await db.getOnlineUsers();
    check("clearOnlineUsers empties the table", afterClear.length === 0,
        JSON.stringify(afterClear));

    console.log("");
    console.log("--- deleting a user cleans up after itself (ON DELETE CASCADE)");

    await db.createSession(userA.id);
    await db.setOnline(userA.id);
    await db.sendFriendRequest(userA.id, userC.id);

    await pool.query(`DELETE FROM users WHERE id = $1`, [userA.id]);

    let leftoverSessions = await pool.query(
        `SELECT COUNT(*) FROM sessions WHERE user_id = $1`, [userA.id]);
    let leftoverFriends = await pool.query(
        `SELECT COUNT(*) FROM friends
         WHERE requester_id = $1 OR addressee_id = $1`, [userA.id]);
    let leftoverOnline = await pool.query(
        `SELECT COUNT(*) FROM online_users WHERE user_id = $1`, [userA.id]);

    check("their sessions are gone", leftoverSessions.rows[0].count === "0");
    check("their friendships are gone", leftoverFriends.rows[0].count === "0");
    check("their online row is gone", leftoverOnline.rows[0].count === "0");

    console.log("");
    console.log("--- cleaning up test accounts");

    let deleted = await pool.query(
        `DELETE FROM users WHERE username LIKE 'dbtest\\_%'`);
    console.log(`Removed ${deleted.rowCount} test account(s).`);

    console.log("");
    if (failures === 0) {
        console.log("All checks passed.");
    } else {
        console.log(`${failures} check(s) failed.`);
    }

    await pool.end();
    // database.js keeps its own pool open, which would keep Node running.
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
    console.log("");
    console.log("The test itself crashed:", error.message);
    console.log("(Is Postgres running? Has createTables.sql been run?)");
    process.exit(1);
});