const { nanoid } = require('nanoid');

function generateShortId() {
    return nanoid(6);
}

module.exports = { generateShortId };