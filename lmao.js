const { PORT, HOST } = require('./config.json');
const { log, isProd, path } = require('./utils');
const fs = require('fs-extra');

// Welcome!
log.info('jmoore.dev', 'starting...', isProd ? 'production' : 'development');

// Set up Express app
const express = require('express');
const app = express();

// Enable/disable Express features
app.enable('case sensitive routing');
app.disable('x-powered-by');

// Set Express variables
app.set('trust proxy', true);
app.set('view engine', 'pug');
app.set('views', path('views'));

// Express logger middleware
app.use(log.express(true));

// Custom headers
app.use((_, res, next) => {
	res.set('Server', 'Gucci Toilet');
	next();
});

// Set up redirects
const makeRedir = (from, to) => app.get(`/${from}`, (_, res) => res.redirect(to));
fs.readJsonSync(path('redirects.json')).forEach(({ from, to }) =>
	Array.isArray(from) ? from.forEach((f) => makeRedir(f, to)) : makeRedir(from, to));

app.get('*', (_, res) => res.render('index'));

log.express().Host(app, PORT, HOST);
