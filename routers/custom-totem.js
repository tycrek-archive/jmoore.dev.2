const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const Jimp = require('jimp');
const { log, isProd, path } = require('../utils');
const router = require('express').Router();

router.get('/', (_req, res) => res.render('custom-totem', { isProd }));
router.get('/totem/:username', (req, res, _next) => {
	const username = req.params.username;
	const mcmeta = {
		pack: {
			'pack_format': 3, // * Pack format 3 is for Minecraft 1.11 – 1.12.2
			'description': `\u00a76\u00a7l\u00a7n${username}\u00a76 \u00a76\u00a7l\u00a7nTotem\u00a7r\n\u00a77\u25b6\u00a78\u00a7o jmoore.dev\/custom-totem`
		}
	};

	const zip = new AdmZip();
	const base = `apps/totems/${username}-totem`;
	const paths = {
		base: path(base),
		archive: path(`${base}.zip`),
		mcmeta: path(`${base}/pack.mcmeta`),
		png: path(`${base}/pack.png`),
		totem: path(`${base}/assets/minecraft/textures/items/totem.png`)
	};

	fs.ensureDir(paths.base)
		.then(() => Promise.all([
			Jimp.read(`https://minotar.net/helm/${username}/128.png`),
			Jimp.read(`https://minotar.net/armor/body/${username}/64.png`)
		]))
		.then(([avatar, skin]) => Promise.all([
			avatar.writeAsync(paths.png),
			skin.contain(64, 64, Jimp.HORIZONTAL_ALIGN_CENTER, Jimp.RESIZE_NEAREST_NEIGHBOR).writeAsync(paths.totem)
		]))
		.then(() => fs.writeJson(paths.mcmeta, mcmeta))
		.then(() => zip.addLocalFolder(paths.base))
		.then(() => zip.writeZip(paths.archive))
		.then(() => res
			.header('Content-Disposition', `attachment; filename="${username}-totem.zip"`)
			.header('Accept-Ranges', 'bytes')
			.type('zip')
			.sendFile(paths.archive))
		.catch((err) => log.err(err).callback(res.sendStatus, 500))
		.finally(() => Promise.all([fs.remove(paths.base), fs.remove(paths.archive)]))
		.catch(log.err);
});

module.exports = router;
