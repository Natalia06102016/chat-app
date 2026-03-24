const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
cors: { origin: "*" }
});
// SOCKET CHAT
io.on("connection", (socket) => {
console.log("User connected");
socket.on("join", (room) => {
socket.join(room);
});
socket.on("message", ({ room, message }) => {
io.to(room).emit("message", message);
});
});
app.get("/", (req, res) => {
res.send("Chat server running");
});
server.listen(3000, () => console.log("Server running"));