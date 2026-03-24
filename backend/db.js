const { Pool } = require("pg");
const pool = new Pool({
host: process.env.DB_HOST,
user: "chat",
password: "chat",
database: "chatdb"
});