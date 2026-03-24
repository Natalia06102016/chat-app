const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);

  await pool.query(
    "INSERT INTO users (email, username, password) VALUES ($1,$2,$3)",
    [req.body.email, req.body.username, hash]
  );

  res.send("ok");
});

router.post("/login", async (req, res) => {
  const user = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [req.body.email]
  );

  const valid = await bcrypt.compare(
    req.body.password,
    user.rows[0].password
  );

  if (!valid) return res.status(400).send("error");

  const token = jwt.sign({ id: user.rows[0].id }, "supersecret");

  res.json({ token });
});

module.exports = router;