const express = require("express");
const WebSocket = require("ws");

const app = express();

app.use(express.static("public"));

app.listen(3000, () => {
    console.log("Website: http://localhost:3000");
});

const wss = new WebSocket.Server({ port: 3001 });

const clients = new Map();

let uniqueId = 1;

function getId(){
    return uniqueId++;
}

wss.on("connection", (ws) => {
    //console.log("ws client connceted");

    newId = getId();

    clients.set(newId,ws);

    console.log(`${newId} connected`);

    ws.send(JSON.stringify({
        type: "id",
        id: newId
    }))

    ws.on("message", (data) => {
        const msg = JSON.parse(data);

        if (msg.type === "dm"){
            const receiver = clients.get(Number(msg.to));
            
            if(!receiver){
                ws.send(JSON.stringify({
                    type: "error",
                    message: " Player not found"
                }));
                return;
            }

            receiver.send(JSON.stringify({
                type: "dm",
                from: newId,
                message: msg.message
            }));
        }
    });

    ws.on("close", () => {
        clients.delete(newId);
        console.log(`Client ${newId} disconnected`);
    });
});
