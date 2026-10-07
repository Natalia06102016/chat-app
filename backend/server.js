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
  socket.on("joinRoom", async (roomId) => {
  try {
    const result = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE user_id = $1 AND room_id = $2`,
      [socket.user.id, roomId]
    );

    if (result.rows.length === 0) {
      socket.emit("errorMessage", {
        message: "You are not a member of this room"
      });
      return;
    }

    socket.join("room_" + roomId);
  } catch (error) {
    socket.emit("errorMessage", {
      message: "Failed to join room"
    });
  }
});
  socket.on("roomMessage", async ({ roomId, content }) => {
  try {
    if (!content || !content.trim()) {
      return;
    }

    const member = await pool.query(
      `SELECT 1
       FROM room_members
       WHERE user_id = $1 AND room_id = $2`,
      [socket.user.id, roomId]
    );

    if (member.rows.length === 0) {
      socket.emit("errorMessage", {
        message: "You are not a member of this room"
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO messages
       (sender_id, room_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, room_id, content, created_at`,
      [socket.user.id, roomId, content.trim()]
    );

    io.to("room_" + roomId).emit(
      "roomMessage",
      result.rows[0]
    );
  } catch (error) {
    console.error(error);

    socket.emit("errorMessage", {
      message: "Failed to send message"
    });
  }
});

server.listen(3000, () => console.log("Backend running on 3000"));
