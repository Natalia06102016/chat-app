-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Rooms
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  owner_id INTEGER REFERENCES users(id)
);

CREATE TABLE room_members (
  user_id INTEGER REFERENCES users(id),
  room_id INTEGER REFERENCES rooms(id),
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE room_bans (
  user_id INTEGER,
  room_id INTEGER,
  banned_by INTEGER,
  PRIMARY KEY (user_id, room_id)
);

-- Messages
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER,
  room_id INTEGER,
  receiver_id INTEGER,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Friends
CREATE TABLE friends (
  user1 INTEGER,
  user2 INTEGER,
  PRIMARY KEY (user1, user2)
);

CREATE TABLE friend_requests (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER,
  receiver_id INTEGER,
  status TEXT DEFAULT 'pending'
);