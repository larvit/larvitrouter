'use strict';

const topLogPrefix = 'larvitrouter: index.js: ';
const LUtils = require('larvitutils');
const path = require('path');
const Lfs = require('larvitfs');

/**
 * Module main constructor
 *
 * @param {obj} options - {
 *  paths: {
 *    controller: {
 *      path': 'controllers',
 *      exts: 'js'
 *    },
 *    static: {
 *      path: 'public',
 *      exts: false
 *    },
 *    template: {
 *      path: 'public/templates',
 *      exts: ['tmpl', 'tmp', 'ejs', 'pug']
 *    }
 *  },
 *  routes: [],
 *  basePath: process.cwd(),
 *  log: log object,
 *  lfs: larvitfs instance
 * }
 */
function Router(options) {
	const logPrefix = topLogPrefix + 'Router() - ';

	let defaultRouteFound = false;

	if (!options) options = {};

	this.options = options;

	if (!options.paths) {
		options.paths = {
			controller: {
				path: 'controllers',
				exts: 'js'
			},
			static: {
				path: 'public',
				exts: false
			},
			template: {
				path: 'public/templates',
				exts: ['tmpl', 'tmp', 'ejs', 'pug']
			}
		};
	}

	if (!options.routes) options.routes = [];
	if (!options.basePath) options.basePath = process.cwd();

	if (!options.log) {
		const lUtils = new LUtils();

		options.log = new lUtils.Log();
	}

	const log = options.log;

	for (const key of Object.keys(options.paths)) {
		if (!Array.isArray(options.paths[key].exts) && options.paths[key].exts !== false) {
			options.paths[key].exts = [options.paths[key].exts];
		}
	}

	if (!options.lfs) {
		options.lfs = new Lfs({ basePath: options.basePath, log });
	}

	for (let i = 0; options.routes[i] !== undefined; i++) {
		if (options.routes[i].regex === '^/$') {
			defaultRouteFound = true;
			break;
		}
	}

	// We should always have a default route, so if none exists, create one
	if (defaultRouteFound === false) {
		options.routes.push({
			regex: '^/$',
			controllerPath: 'default.js',
			templatePath: 'default.tmpl'
		});
	}

	for (const key of Object.keys(options)) {
		this[key] = options[key];
	}

	log.debug(logPrefix + 'Instantiated with options: ' + JSON.stringify(options));
}

Router.prototype.resolve = function (urlStr, cb) {
	const logPrefix = topLogPrefix + 'Router.prototype.resolve() - ';
	const result = {};
	const { log, routes, lfs } = this.options;

	if (typeof cb !== 'function') {
		cb = () => {};
	}

	if (typeof urlStr !== 'string') {
		const err = new Error('First parameter must be a string');

		log.warn(logPrefix + err.message);
		log.verbose(logPrefix + 'err.stack:\n' + err.stack);

		return cb(err);
	}

	log.debug(logPrefix + 'parsing URL ' + urlStr);

	const relUrlStr = path.normalize(urlStr[0] === '/' ? urlStr.substring(1) : urlStr);

	// SECURITY! Someone is trying to find paths above the given route root
	if (relUrlStr.startsWith('..')) {
		log.info(logPrefix + 'Security! Stopped try to route a route above the route root: "' + relUrlStr);

		return cb(null, result);
	}

	// Go through all custom routes to see if we have a match
	for (let i = 0; this.routes[i] !== undefined; i++) {
		log.silly(logPrefix + 'Trying to match custom route "' + routes[i].regex + '" with urlStr "' + urlStr + '"');

		if (RegExp(routes[i].regex).test(urlStr)) {
			log.debug(logPrefix + 'Matched custom route "' + routes[i].regex + '" to route: ' + JSON.stringify(routes[i]));

			for (const key of Object.keys(routes[i])) {
				if (key !== 'regex') {
					result[key] = routes[i][key];
				}
			}

			break; // Break execution, no need to go through the rest
		}
	}

	// If no route is matched, try to autoresolve stuff
	if (Object.keys(result).length === 0) {
		for (const type of Object.keys(this.paths)) {
			const routeOpts = this.paths[type];

			if (!Array.isArray(routeOpts.exts) && lfs.getPathSync(routeOpts.path + '/' + relUrlStr)) {
				result[type + 'Path'] = relUrlStr;
			} else {
				for (let i = 0; routeOpts.exts[i] !== undefined; i++) {
					const ext = routeOpts.exts[i];

					if (lfs.getPathSync(routeOpts.path + '/' + relUrlStr + '.' + ext)) {
						result[type + 'Path'] = relUrlStr + '.' + ext;
					}
				}
			}
		}
	}

	// Set full paths where missing
	for (const type of Object.keys(this.paths)) {
		const routeOpts = this.paths[type];

		if (result[type + 'Path'] && !result[type + 'FullPath']) {
			result[type + 'FullPath'] = lfs.getPathSync(routeOpts.path + '/' + result[type + 'Path']);
			if (!result[type + 'FullPath']) {
				log.warn(logPrefix + 'Could not find full path for ' + type + 'Path: ' + result[type + 'Path']);
			}
		}
	}

	cb(null, result);
};

exports = module.exports = Router;
