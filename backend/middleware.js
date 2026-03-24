const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("No token");

  try {
    req.user = jwt.verify(token, "supersecret");
    next();
  } catch (err) {
    res.status(401).send("Invalid token");
  }
};