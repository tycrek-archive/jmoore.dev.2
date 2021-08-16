const fs = require('fs-extra');
const marked = require('marked');
const { log, isProd, path } = require('../utils');
const router = require('express').Router();

router.get('/', (_req, res) => res.render('tutorials', { isProd }));
router.get('/:year/:month/:tutorial', (req, res, next) => {
	const tutorial = `tutorials/${req.params.year}/${req.params.month}/${req.params.tutorial}/`;
	console.log(path(tutorial));
	fs.pathExists(path('views/pages', tutorial))
		.then((exists) => !exists
			? next()
			: fs.readFile(path('views/pages', tutorial, 'tutorial.md'))
				.then((bytes) => bytes.toString())
				.then(marked)
				.then((html) => res.render(tutorial, { isProd, html })))
		.catch(next);
});

module.exports = router;
