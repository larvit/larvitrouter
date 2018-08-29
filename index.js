'use strict';

const topLogPrefix = 'larvitrouter: index.js: ';
const LUtils       = require('larvitutils');
const Lfs          = require('larvitfs');

/**
 * Module main constructor
 *
 * @param {obj} options - {
 * 	'paths':           {
 * 		'controller': {
 * 			'path': 'controllers',
 * 			'exts': 'js'
 * 		},
 * 		'static': {
 * 			'path': 'public',
 * 			'exts': false
 * 		},
 * 		'template': {
 * 			'path': 'public/templates',
 * 			'exts': ['tmpl', 'tmp', 'ejs', 'pug']
 * 		}
 * 	},
 * 	'routes':   [],
 * 	'basePath': process.cwd(),
 * 	'log':      log object,
 * 	'lfs':      larvitfs instance
 * }
 */
function Router(options) {
	const logPrefix = topLogPrefix + 'Router() - ';
	const that      = this;

	let defaultRouteFound = false;

	that.options = options || {};

	if (! that.options.paths) {
		that.options.paths = {
			'controller': {
				'path': 'controllers',
				'exts': 'js'
			},
			'static': {
				'path': 'public',
				'exts': false
			},
			'template': {
				'path': 'public/templates',
				'exts': ['tmpl', 'tmp', 'ejs', 'pug']
			}
		};
	}

	if (! that.options.routes)   that.options.routes   = [];
	if (! that.options.basePath) that.options.basePath = process.cwd();

	if (! that.options.log) {
		const lUtils = new LUtils();

		that.options.log = new lUtils.Log();
	}

	for (const key of Object.keys(that.options.paths)) {
		if (! Array.isArray(that.options.paths[key].exts) && that.options.paths[key].exts !== false) {
			that.options.paths[key].exts = [that.options.paths[key].exts];
		}
	}

	if (! that.options.lfs) {
		that.options.lfs = new Lfs({'basePath': that.options.basePath, 'log': that.options.log});
	}

	for (let i = 0; that.options.routes[i] !== undefined; i ++) {
		if (that.options.routes[i].regex === '^/$') {
			defaultRouteFound = true;
			break;
		}
	}

	// We should always have a default route, so if none exists, create one
	if (defaultRouteFound === false) {
		that.options.routes.push({
			'regex':          '^/$',
			'controllerPath': 'default.js',
			'templatePath':   'default.tmpl'
		});
	}

	for (const key of Object.keys(that.options)) {
		that[key] = that.options[key];
	}

	that.log.debug(logPrefix + 'Instantiated with options: ' + JSON.stringify(that.options));
}

Router.prototype.resolve = function (urlStr, cb) {
	const logPrefix = topLogPrefix + 'Router.prototype.resolve() - ';
	const result    = {};
	const that      = this;

	let relUrlStr;

	if (typeof cb !== 'function') {
		cb = function () {};
	}

	if (typeof urlStr !== 'string') {
		const err = new Error('First parameter must be a string');

		that.log.warn(logPrefix + err.message);
		that.log.verbose(logPrefix + 'err.stack:\n' + err.stack);

		return cb(err);
	}

	that.log.debug(logPrefix + 'parsing URL ' + urlStr);

	relUrlStr = urlStr[0] === '/' ? urlStr.substring(1) : urlStr;

	// Go through all custom routes to see if we have a match
	for (let i = 0; that.routes[i] !== undefined; i ++) {
		that.log.silly(logPrefix + 'Trying to match custom route "' + that.routes[i].regex + '" with urlStr "' + urlStr + '"');

		if (RegExp(that.routes[i].regex).test(urlStr)) {
			that.log.debug(logPrefix + 'Matched custom route "' + that.routes[i].regex + '" to route: ' + JSON.stringify(that.routes[i]));

			for (const key of Object.keys(that.routes[i])) {
				if (key !== 'regex') {
					result[key]	= that.routes[i][key];
				}
			}

			break; // Break execution, no need to go through the rest
		}
	}

	// If no route is matched, try to autoresolve stuff
	if (Object.keys(result).length === 0) {
		for (const type of Object.keys(that.paths)) {
			const routeOpts = that.paths[type];

			if (! Array.isArray(routeOpts.exts) && that.lfs.getPathSync(routeOpts.path + '/' + relUrlStr)) {
				result[type + 'Path'] = relUrlStr;
			} else {
				for (let i = 0; routeOpts.exts[i] !== undefined; i ++) {
					const ext = routeOpts.exts[i];

					if (that.lfs.getPathSync(routeOpts.path + '/' + relUrlStr + '.' + ext)) {
						result[type + 'Path'] = relUrlStr + '.' + ext;
					}
				}
			}
		}
	}

	// Set full paths where missing
	for (const type of Object.keys(that.paths)) {
		const routeOpts = that.paths[type];

		if (result[type + 'Path'] && ! result[type + 'FullPath']) {
			result[type + 'FullPath'] = that.lfs.getPathSync(routeOpts.path + '/' + result[type + 'Path']);
			if (! result[type + 'FullPath']) {
				that.log.warn(logPrefix + 'Could not find full path for ' + type + 'Path: ' + result[type + 'Path']);
			}
		}
	}

	cb(null, result);
};

exports = module.exports = Router;
