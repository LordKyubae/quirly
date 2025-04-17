const express = require('express');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3002;

const db = new sqlite3.Database('./urls.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_id TEXT UNIQUE,
      original_url TEXT
    )
  `);
});

app.use(session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: false
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

function requireLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'pass123') {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/admin', requireLogin, (req, res) => {
    const search = req.query.search || '';

    db.all(
        `SELECT short_id, original_url FROM urls WHERE original_url LIKE ? ORDER BY id DESC`,
        [`%${search}%`],
        async (err, rows) => {
            if (err) return res.status(500).send('Database error');
            const urls = await Promise.all(rows.map(async row => ({
                shortId: row.short_id,
                originalUrl: row.original_url,
                fullShortUrl: `${req.protocol}://${req.get('host')}/${row.short_id}`,
                qrCodeDataUrl: await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/${row.short_id}`)
            })));
            res.render('admin', {urls, search});
        }
    );
});

app.post('/admin/delete', requireLogin, (req, res) => {
    const shortId = req.body.shortId;
    db.run(`DELETE FROM urls WHERE short_id = ?`, [shortId], (err) => {
        if (err) return res.status(500).send('Failed to delete');
        res.redirect('/admin');
    });
});

app.get('/', (req, res) => {
  res.render('index', { shortUrl: null, qrCodeDataUrl: null });
});

app.post('/', async (req, res) => {
  const originalUrl = req.body.url;
  const shortId = Math.random().toString(36).substring(2, 8);

  db.run(
    `INSERT INTO urls (short_id, original_url) VALUES (?, ?)`,
    [shortId, originalUrl],
    async function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Error saving URL.");
      }

      const shortUrl = `${req.protocol}://${req.get('host')}/${shortId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(shortUrl);
      res.render('index', { shortUrl, qrCodeDataUrl });
    }
  );
});

app.get('/:shortId', (req, res) => {
  const shortId = req.params.shortId;

  db.get(
    `SELECT original_url FROM urls WHERE short_id = ?`,
    [shortId],
    (err, row) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Server error');
      } else if (row) {
        res.redirect(row.original_url);
      } else {
        res.status(404).send('URL not found');
      }
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});