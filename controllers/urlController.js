const QRCode = require('qrcode');
const { generateShortId } = require('../utils/shortener');
const db = require('../utils/db');
const middleware = require('../utils/middleware');

exports.shortenUrl = async (req, res) => {
    const { url } = req.body;
    const shortId = generateShortId();
    const shortUrl = `${req.protocol}://${req.get('host')}/${shortId}`;

    db.prepare('INSERT INTO urls (short_id, original_url) VALUES (?, ?)').run(shortId, url);

    const qrCodeDataUrl = await QRCode.toDataURL(shortUrl);
    res.render('index', { shortUrl, qrCodeDataUrl });
};

exports.redirectToOriginal = (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT original_url FROM urls WHERE short_id = ?').get(id);

    if (row) {
        res.redirect(row.original_url);
    } else {
        res.status(404).send('URL not found');
    }
};

exports.adminPanel = [middleware, async (req, res) => {
    const timezoneOffset = new Date().getTimezoneOffset();

    const rows = db.prepare('SELECT * FROM urls').all();

    const urls = await Promise.all(rows.map(async row => {
        const localCreatedAt = new Date(new Date(row.created_at).getTime() - timezoneOffset * 60000);

        const qrCode = await QRCode.toDataURL(`${req.protocol}://${req.get('host')}/${row.short_id}`);

        return {
            shortId: row.short_id,
            originalUrl: row.original_url,
            createdAt: localCreatedAt.toISOString(),
            fullShortUrl: `${req.protocol}://${req.get('host')}/${row.short_id}`,
            qrCodeDataUrl: qrCode
        };
    }));

    res.render('admin', {urls: urls});
}];

exports.deleteUrl = [middleware, (req, res) => {
    const shortId = req.body.shortId;
    db.prepare('DELETE FROM urls WHERE short_id = ?').run(shortId);
    res.redirect('/admin');
}];