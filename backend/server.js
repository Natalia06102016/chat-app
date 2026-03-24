const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const pool = require("./db");
const jwt = require("jsonwebtoken");
const authRouter = require("./routes/auth");
const roomsRouter = require("./routes/rooms");
const friendsRouter = require("./routes/friends");
const uploadRouter = require("./routes/upload");
const adminRouter = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/files", express.static("uploads"));

app.use("/auth", authRouter);
app.use("/rooms", roomsRouter);
app.use("/friends", friendsRouter);
app.use("/upload", uploadRouter);
app.use("/admin", adminRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, "supersecret");
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => socket.join("room_" + roomId));
  socket.on("roomMessage", async ({ roomId, content }) => {
    await pool.query(
      "INSERT INTO messages (sender_id, room_id, content) VALUES ($1,$2,$3)",
      [socket.user.id, roomId, content]
    );
    io.to("room_" + roomId).emit("roomMessage", { content });
  });
});

server.listen(3000, () => console.log("Backend running on 3000"));