const express = require("express");
const WebSocket = require("ws");

const app = express();

app.use(express.static("public"));

app.listen(3000, () => {
    console.log("Website: http://localhost:3000");
});

const wss = new WebSocket.Server({ port: 3001 });

let uniqueId = 1;

function getId(){
    return uniqueId++;
}

wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.id = getId();

    ws.on("message", (message) => {
        console.log("Received:",ws.id, message.toString());

        ws.send("Hello from server!");
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});