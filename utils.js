const isProd = require('@tycrek/isprod')();
const TLog = require('@tycrek/log');
const path = require('path');
const crypto = require('crypto');

const log = new TLog({
	timestamp: { format: 'yyyy-MM-dd hh:mm:ss.u a' },
	label: { align: 'right' }
})
	.enable.express().debug('Plugin enabled', 'Express')
	.enable.process().debug('Plugin enabled', 'Process');


/**
 * Gets a full path
 * @param {...string} args - Path parts
 * @returns {string}
 */
function getPath(...args) {
	return path.join(process.cwd(), ...args);
}

/**
 * Generate a random hex value
 * @param {number} length - Length of the value
 **/
function randomHexValue(length) {
	return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

module.exports = {
	log,
	isProd,
	path: getPath,
	randomHexValue
};