const express = require('express');
const app = express();
const routes = require('./routes');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');

app.use('/', routes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));