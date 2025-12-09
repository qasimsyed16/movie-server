const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function openDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.join(__dirname, '..', 'database.sqlite'),
    driver: sqlite3.Database
  });

  return dbInstance;
}

async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tmdb_id INTEGER,
      title TEXT NOT NULL,
      type TEXT,
      poster_path TEXT,
      file_path TEXT, -- For movies, this is the video file
      overview TEXT,
      release_date TEXT
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER,
      season_number INTEGER,
      episode_number INTEGER,
      title TEXT,
      file_path TEXT,
      subtitle_path TEXT,
      FOREIGN KEY(media_id) REFERENCES media(id)
    );

    CREATE TABLE IF NOT EXISTS subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER,
      episode_id INTEGER,
      language TEXT,
      label TEXT,
      file_path TEXT,
      is_default BOOLEAN DEFAULT 0,
      FOREIGN KEY(media_id) REFERENCES media(id),
      FOREIGN KEY(episode_id) REFERENCES episodes(id)
    );
  `);
  console.log('Database initialized');
  return db;
}

module.exports = { openDb, initDb };
