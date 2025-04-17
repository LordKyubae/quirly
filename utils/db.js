const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(process.cwd(), 'urls.db'));

db.prepare(`
    CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        short_id TEXT UNIQUE,
        original_url TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
`).run();

module.exports = db;