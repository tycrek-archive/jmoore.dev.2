const { UPDATE_TOKEN, PASSWORD, TOTP_SECRET } = require('./secrets.json');
const { PORT, HOST } = require('./config.json');
const { log, isProd, path, randomHexValue } = require('./utils');

// Imports
const fs = require('fs-extra');
const express = require('express');
const postcss = require('postcss');
const fetch = require('node-fetch');
const uaRedirect = require('express-ua-redirect');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const MemoryStore = require('memorystore')(session)
const { authenticator } = require('otplib');

// Load NPM for the autoupdater
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

// Fuck Internet Explorer!
app.use(uaRedirect({
	browsers: { unauthorized: { IE: '11-' } },
	redirectTo: 'http://www.browsingbetter.com/'
}));

// Sessions
const TIME_24H = 86400000;
app.use(session({
	secure: isProd,
	resave: true,
	saveUninitialized: false,
	secret: randomHexValue(64),
	cookie: { maxAge: TIME_24H },
	store: new MemoryStore({ checkPeriod: TIME_24H }),
}));

// Set up session
app.use((req, _res, next) => (((!req.session.isAuthed) && (req.session.isAuthed = false)), next()));

// File upload
app.use(fileUpload());

// Custom headers
app.use((_, res, next) => {
	res.set('Server', 'Gucci Toilet');
	next();
});

// Static assets
app.use(express.static(path('static')));
app.use('/files', express.static(path('uploads')));

// Custom totem
app.use('/custom-totem', require('./routers/custom-totem'));

// CSS
const cssPath = path('css/kek.css');
const tailwindcss = require('tailwindcss')({
	mode: 'jit',
	separator: '_',
	darkMode: 'media',
	plugins: [
		require('tailwindcss-textshadow')
	],
	purge: {
		enabled: false,
		content: ['./views/**/*.pug']
	},
	theme: {
		fontFamily: {
			title: ['"Bebas Neue"', '"Helvetica Neue"', 'Helvetica', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			header: ['"Patua One"', '"Helvetica Neue"', 'Helvetica', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			content: ['"Poppins"', 'ui-sans-serif', 'system-ui', 'sans-serif']
		},
		extend: {
			height: {
				nav: '66vh'
			},
			colors: {
				'background': '#212121',
				'article-card': '#757575',
				'tycrek-red': {
					light: '#F50000',
					DEFAULT: '#D50000',
					dark: '#B80000'
				},
				'tycrek-cyan': {
					DEFAULT: '#26C6DA',
					dark: '#0D8F8F'
				},
				'zahtec': {
					teal: '#096173',
					magenta: '#860995',
					brown: '#8C0E3B'
				}
			},
			backgroundImage: {
				zahtec: 'linear-gradient(39deg, var(--tw-gradient-stops));'
			},
			fontSize: {
				'title-char': '4rem',
				'title-char-lg': '6rem',
				'title-char-hover': '6.1rem'
			},
			textShadow: {
				'sm-hard': '2px 2px #000'
			},
			transitionTimingFunction: {
				'seb-t': 'cubic-bezier(0.68, -0.45, 0.365, 1.55)'
			}
		}
	}
});
const plugins = [
	tailwindcss,
	require('autoprefixer')(),
	require('cssnano')(),
	require('postcss-font-magician')(),
];

// Index
app.get('/', (_, res) => res.render('index', { isProd }));

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

// Login
app.get('/login', (_, res) => res.render('login', { isProd }));
app.get('/login/:password/:key', (req, res) => {
	try {
		req.session.isAuthed = (PASSWORD === req.params.password) && (authenticator.generate(TOTP_SECRET) === req.params.key);
	} catch (err) {
		// Possible errors
		// - options validation
		// - "Invalid input - it is not base32 encoded string" (if thiry-two is used)
		log.err(err);
	} finally {
		req.session.isAuthed ? res.type('json').send({ url: '/dashboard' }) : res.sendStatus(401);
	}
});

// Logout
app.get('/logout', (req, res) => ((req.session.isAuthed = false), res.redirect('/login')));

// Verify login
app.get('/verify', (req, res) => res.render('verify', { isProd, isAuthed: req.session.isAuthed ? 'Yep, visit the dashboard!' : 'Nope, please sign in.' }));

function verifySession(req, res, next) {
	(req.session.isAuthed) ? next() : res.redirect('/login');
}

// Dashboard
app.get('/dashboard', verifySession, (_req, res) => res.render('dashboard', { isProd }));

// Upload
app.post('/upload', verifySession, (req, res, next) => {
	if (!req.files || Object.keys(req.files).length === 0)
		return res.status(400).render('woops', { message: 'No files were uploaded' });

	const { file } = req.files;
	const saveTo = path('uploads', file.name);

	fs.pathExists(saveTo)
		.then((exists) => exists
			? res.status(409).render('woops', { message: `File already exists: <a class='t-link' href='/files/${file.name}' target='_blank'>${file.name}</a>` })
			: fs.ensureDir(path('uploads'))
				.then(() => file.mv(saveTo))
				.then(() => log.info('File uploaded', file.name).callback(() => res.render('upload', { isProd, fileName: file.name }))))
		.catch(next);
});

log.express().Host(app, PORT, HOST, () =>
	fetch(`http://127.0.0.1:${PORT}/css`)
		.then(() => log.info('PostCSS', 'JIT kickstarted'))
		.catch(log.err));
