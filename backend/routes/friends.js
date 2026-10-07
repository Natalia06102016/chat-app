const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    req.user = jwt.verify(token, "supersecret");

    next();
  } catch (error) {
    res.status(401).json({
      error: "Invalid token"
    });
  }
}


// GET /friends
// Get current user's friends
router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email
       FROM friends f
       JOIN users u
         ON u.id = CASE
           WHEN f.user1 = $1 THEN f.user2
           ELSE f.user1
         END
       WHERE f.user1 = $1 OR f.user2 = $1
       ORDER BY u.username`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load friends"
    });
  }
});


// POST /friends/request
// Send friend request
router.post("/request", auth, async (req, res) => {
  try {
    const { friend_id } = req.body;

    if (!friend_id) {
      return res.status(400).json({
        error: "friend_id is required"
      });
    }

    if (Number(friend_id) === Number(req.user.id)) {
      return res.status(400).json({
        error: "You cannot add yourself"
      });
    }

    const user = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [friend_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const friendship = await pool.query(
      `SELECT 1
       FROM friends
       WHERE
         (user1 = $1 AND user2 = $2)
         OR
         (user1 = $2 AND user2 = $1)`,
      [req.user.id, friend_id]
    );

    if (friendship.rows.length > 0) {
      return res.status(400).json({
        error: "You are already friends"
      });
    }

    const existing = await pool.query(
      `SELECT *
       FROM friend_requests
       WHERE
         ((sender_id = $1 AND receiver_id = $2)
          OR
          (sender_id = $2 AND receiver_id = $1))
         AND status = 'pending'`,
      [req.user.id, friend_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Friend request already exists"
      });
    }

    await pool.query(
      `INSERT INTO friend_requests
       (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')`,
      [req.user.id, friend_id]
    );

    res.status(201).json({
      message: "Friend request sent"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to send friend request"
    });
  }
});


// GET /friends/requests
// Get received friend requests
router.get("/requests", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         fr.id,
         fr.sender_id,
         u.username,
         u.email,
         fr.status
       FROM friend_requests fr
       JOIN users u
         ON u.id = fr.sender_id
       WHERE fr.receiver_id = $1
         AND fr.status = 'pending'
       ORDER BY fr.id DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load friend requests"
    });
  }
});


// POST /friends/requests/:id/accept
// Accept friend request
router.post("/requests/:id/accept", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const request = await client.query(
      `SELECT *
       FROM friend_requests
       WHERE id = $1
         AND receiver_id = $2
         AND status = 'pending'
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (request.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Friend request not found"
      });
    }

    const senderId = request.rows[0].sender_id;

    await client.query(
      `UPDATE friend_requests
       SET status = 'accepted'
       WHERE id = $1`,
      [req.params.id]
    );

    const user1 = Math.min(
      Number(req.user.id),
      Number(senderId)
    );

    const user2 = Math.max(
      Number(req.user.id),
      Number(senderId)
    );

    await client.query(
      `INSERT INTO friends (user1, user2)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user1, user2]
    );

    await client.query("COMMIT");

    res.json({
      message: "Friend request accepted"
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: "Failed to accept friend request"
    });

  } finally {
    client.release();
  }
});


// POST /friends/requests/:id/reject
// Reject friend request
router.post("/requests/:id/reject", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE friend_requests
       SET status = 'rejected'
       WHERE id = $1
         AND receiver_id = $2
         AND status = 'pending'
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Friend request not found"
      });
    }

    res.json({
      message: "Friend request rejected"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to reject friend request"
    });
  }
});


module.exports = router;
