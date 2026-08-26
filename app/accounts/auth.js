const db = require("./database.js");

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;


// Options used when handing out the cookie.
const cookieOptions = {
    httpOnly: true,       // page scripts cannot read it
    sameSite: "lax",      // not sent from other websites
    maxAge: db.SESSION_HOURS * 60 * 60 * 1000,
};

// Clearing a cookie must use the same options, minus maxAge.
const clearCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
};

// Returns an error message, or null if the body is acceptable.
function validateCredentials(body) {
    let username = body.username;
    let password = body.password;

    if (typeof username !== "string" || typeof password !== "string") {
        return "Username and password are required.";
    }
    if (!USERNAME_PATTERN.test(username)) {
        return "Username must be 3-20 characters: letters, numbers, or underscores.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
}


async function requireLogin(req, res, next) {
    let token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: "Not logged in." });
    }

    try {
        let user = await db.getUserForToken(token);

        if (!user) {
            res.clearCookie("token", clearCookieOptions);
            return res.status(401).json({ error: "Session expired. Log in again." });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log("requireLogin:", error.message);
        res.status(500).json({ error: "Server error." });
    }
}

function readTokenFromCookieHeader(cookieHeader) {
    if (!cookieHeader) {
        return null;
    }

    let parts = cookieHeader.split(";");

    for (let part of parts) {
        let trimmed = part.trim();

        if (trimmed.startsWith("token=")) {
            return trimmed.slice("token=".length);
        }
    }

    return null;
}

module.exports = {
    cookieOptions,
    clearCookieOptions,
    validateCredentials,
    requireLogin,
    readTokenFromCookieHeader,
};