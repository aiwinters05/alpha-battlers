import express from "express";
import argon2 from "argon2";
import * as db from "./database.js";
import * as auth from "./auth.js";

const router = express.Router();


router.post("/api/signup", async (req, res) => {
    let problem = auth.validateCredentials(req.body);

    if (problem) {
        return res.status(400).json({ error: problem });
    }

    try {
        let passwordHash = await argon2.hash(req.body.password);
        let user = await db.createUser(req.body.username, passwordHash);

        if (!user) {
            return res.status(409).json({ error: "That username is taken." });
        }

        let token = await db.createSession(user.id);
        res.cookie("token", token, auth.cookieOptions);
        res.status(201).json({ username: user.username });
    } catch (error) {
        console.log("signup:", error.message);
        res.status(500).json({ error: "Server error." });
    }
});

router.post("/api/login", async (req, res) => {
    let problem = auth.validateCredentials(req.body);

    if (problem) {
        return res.status(400).json({ error: problem });
    }

    try {
        let user = await db.getUserByUsername(req.body.username);

        if (!user || !(await argon2.verify(user.password_hash, req.body.password))) {
            return res.status(401).json({ error: "Wrong username or password." });
        }

        let token = await db.createSession(user.id);
        res.cookie("token", token, auth.cookieOptions);
        res.json({ username: user.username });
    } catch (error) {
        console.log("login:", error.message);
        res.status(500).json({ error: "Server error." });
    }
});

router.post("/api/logout", async (req, res) => {
    try {
        if (req.cookies.token) {
            await db.deleteSession(req.cookies.token);
        }
        res.clearCookie("token", auth.clearCookieOptions);
        res.json({ loggedOut: true });
    } catch (error) {
        console.log("logout:", error.message);
        res.status(500).json({ error: "Server error." });
    }
});

router.get("/api/me", auth.requireLogin, (req, res) => {
    res.json({ username: req.user.username, createdAt: req.user.created_at });
});

export default router;



