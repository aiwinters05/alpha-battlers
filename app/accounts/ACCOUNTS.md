# Login stuff

Two files, auth.js and routes-accounts.js. Both live in app/accounts/ with
database.js.

## auth.js

Helpers. Doesn't handle any URLs itself.

The main thing in here is requireLogin. Put it in the middle of a route and the
route only runs for logged in players:

```js
const auth = require("./accounts/auth.js");

app.post("/api/queue/join", auth.requireLogin, async (req, res) => {
    // req.user is {id, username, created_at}
});
```

If they're not logged in requireLogin sends a 401 back itself and your code
never runs.

Use req.user.id for the player, don't take an id out of the request body. The
body is just whatever the client typed. req.user comes from the session cookie.

Also in there: validateCredentials (checks a signup/login body, usernames are
3-20 letters/numbers/underscores and passwords 8+), cookieOptions, and
readTokenFromCookieHeader for the websocket side.

## routes-accounts.js

The actual URLs. All of them take and return JSON.

POST /api/signup   {username, password}  -> makes the account, logs you in
POST /api/login    {username, password}  -> logs you in
POST /api/logout                         -> logs you out
GET  /api/me                             -> {username, createdAt}, or 401

Signup and login set the cookie. After that the browser sends it automatically,
you don't have to do anything with it in the front end.

Errors come back as {"error": "some message"} with a status:
400 bad input, 401 wrong password or not logged in, 409 username taken,
500 something broke.

Passwords are hashed with argon2 before they go in the database. The plain
password is never stored.

## Setup

npm install argon2 cookie-parser

app/server.js needs these before the routes:

```js
app.use(express.json());
app.use(cookieParser());
```

## Front end

Call GET /api/me on page load to see if someone's already logged in. Don't try
to read the cookie in JS, it's httpOnly so you can't.
