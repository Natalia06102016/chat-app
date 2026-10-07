const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    req.user = jwt.verify(token, "supersecret");
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Get all rooms
router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, is_private, owner_id FROM rooms ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load rooms" });
  }
});

// Create room
router.post("/", auth, async (req, res) => {
  try {
    const { name, description = "", is_private = false } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Room name is required" });
    }

    const result = await pool.query(
      `INSERT INTO rooms (name, description, is_private, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), description, is_private, req.user.id]
    );

    await pool.query(
      `INSERT INTO room_members (user_id, room_id)
       VALUES ($1, $2)`,
      [req.user.id, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Room already exists" });
    }

    res.status(500).json({ error: "Failed to create room" });
  }
});

// Join room
router.post("/:id/join", auth, async (req, res) => {
  try {
    const room = await pool.query(
      "SELECT id FROM rooms WHERE id = $1",
      [req.params.id]
    );

    if (room.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await pool.query(
      `INSERT INTO room_members (user_id, room_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );

    res.json({ message: "Joined room" });
  } catch (error) {
    res.status(500).json({ error: "Failed to join room" });
  }
});

module.exports = router;
