const { UPDATE_TOKEN } = require('./secrets.json');
const { PORT, HOST } = require('./config.json');
const { log, isProd, path } = require('./utils');

// Imports
const fs = require('fs-extra');
const express = require('express');
const postcss = require('postcss');
const fetch = require('node-fetch');
const npm = require('npm');
npm.load();

// Welcome!
log.info('jmoore.dev', 'starting...', isProd ? 'production' : 'development');

// Set up Express app
const app = express();

// Enable/disable Express features
app.enable('case sensitive routing');
app.disable('x-powered-by');

// Set Express variables
app.set('trust proxy', true);
app.set('view engine', 'pug');
app.set('views', path('views/pages'));

// Express logger middleware
app.use(log.express(true));

// Custom headers
app.use((_, res, next) => {
	res.set('Server', 'Gucci Toilet');
	next();
});

// CSS
const cssPath = path('css/kek.css');
const tailwindcss = require('tailwindcss')({
	mode: 'jit',
	separator: '_',
	darkMode: 'media',
	purge: {
		enabled: false,
		content: ['./views/**/*.pug']
	},
	theme: {
		fontFamily: {
			header: ['"Bebas Neue"', '"Helvetica Neue"', 'Helvetica', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			content: ['Ubuntu', 'ui-sans-serif', 'system-ui', 'sans-serif']
		}
	}
});
const plugins = [
	tailwindcss,
	require('autoprefixer')(),
	require('cssnano')(),
	require('postcss-font-magician')(),
];

// Compile CSS using PostCSS's JIT mode
app.get('/css', (_, res) =>
	fs.readFile(cssPath)
		.then((bytes) => postcss(plugins).process(bytes, { from: cssPath, to: cssPath }))
		.then((result) => {
			result.warnings().forEach((warn) => log.warn('PostCSS', warn.toString()));
			res.type('css').send(result.css)
		})
		.catch(log.err));

// Set up redirects
const makeRedir = (from, to) => app.get(`/${from}`, (_, res) => res.redirect(to));
fs.readJsonSync(path('redirects.json')).forEach(({ from, to }) =>
	Array.isArray(from) ? from.forEach((f) => makeRedir(f, to)) : makeRedir(from, to));

// Auto-update
app.get('/update', (req, res) => {
	log.info('Update', 'requested');

	// Don't attempt update if not in production
	if (!isProd)
		return res.sendStatus(200);

	// Don't attempt update if bearer token is invalid
	const isAllowed = req.headers.authorization.split(' ')[1] === UPDATE_TOKEN;

	// Respond to GitHub Actions *before* calling update script
	isAllowed
		? res.sendStatus(200)
		: res.sendStatus(401);

	// Run update script
	isAllowed && npm.commands['run-script'](['update'], (err) => (err) && log.err(err));
});

// All other routes
app.get('*', (_, res) => res.render('index'));

log.express().Host(app, PORT, HOST, () =>
	fetch(`http://127.0.0.1:${PORT}/css`)
		.then(() => log.info('PostCSS', 'JIT kickstarted'))
		.catch(log.err));
