CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password TEXT
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER,
  room_id INTEGER,
  content TEXT
);