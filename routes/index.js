const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');

router.get('/admin', urlController.adminPanel);
router.post('/admin/delete', urlController.deleteUrl);

router.get('/', (req, res) => res.render('index', { shortUrl: null, qrCodeDataUrl: null }));
router.post('/', urlController.shortenUrl);
router.get('/:id', urlController.redirectToOriginal);

module.exports = router;