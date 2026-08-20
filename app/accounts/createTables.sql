-- Alpha-battlers: accounts, friends, and presence.
--
-- Run
--   psql -U alpha -d alphabattlers -f accounts/createTables.sql
--
-- Dropping happens in reverse order of creation, because a table cannot be
-- dropped while another table still points at it.

DROP TABLE IF EXISTS online_users;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- 
-- 1. users -- one row per account.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stops "Aidan" and "aidan" from both existing.
CREATE UNIQUE INDEX users_username_lower_idx ON users (LOWER(username));

-- 
-- 2. sessions -- one row per browser that is currently logged in.
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    token      TEXT        PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- 
-- 3. friends -- one row per friendship or friend request.
--
-- requester_id asked, addressee_id was asked. The pair is the primary key, so
-- the same request cannot be stored twice.
-- 
CREATE TABLE friends (
    requester_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       VARCHAR(10) NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id),
    CHECK (status IN ('pending', 'accepted'))
);

CREATE INDEX friends_addressee_idx ON friends (addressee_id);

-- 
-- 4. online_users -- who is connected right now.
--
-- A row appears when a player's websocket connects and disappears when it
-- closes. One row per player, not per tab, so opening a second tab does not
-- make someone show up twice.
-- ---------------------------------------------------------------------------
CREATE TABLE online_users (
    user_id      INTEGER     PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
