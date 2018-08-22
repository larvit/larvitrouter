'use strict';

const topLogPrefix = 'larvitrouter: index.js: ';
const LUtils       = require('larvitutils');
const Lfs          = require('larvitfs');

/**
 * Module main constructor
 *
 * @param {obj} options - {
 * 	'controllersPath': 'controllers',
 * 	'staticsPath':     'public',
 * 	'templatesPath':   'public/templates',
 * 	'templateExts':    ['tmpl', 'tmp', 'ejs', 'pug', 'vue'],
 * 	'routes':          [],
 * 	'basePath':        process.cwd(),
 * 	'log':             log object,
 * 	'lfs':             larvitfs instance
 * }
 */
function Router(options) {
	const logPrefix = topLogPrefix + 'Router() - ';
	const that      = this;

	let defaultRouteFound = false;

	that.options = options || {};

	if (! that.options.controllersPath) that.options.controllersPath = 'controllers';
	if (! that.options.staticsPath)     that.options.staticsPath     = 'public';
	if (! that.options.templatesPath)   that.options.templatesPath   = 'public/templates';
	if (! that.options.templateExts)    that.options.templateExts    = ['tmpl', 'tmp', 'ejs', 'pug', 'vue'];
	if (! that.options.routes)          that.options.routes          = [];
	if (! that.options.basePath)        that.options.basePath        = process.cwd();

	if (! that.options.log) {
		const lUtils = new LUtils();

		that.options.log = new lUtils.Log();
	}

	if (! Array.isArray(that.options.templateExts)) {
		that.options.templateExts = [that.options.templateExts];
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

			result.controllerPath     = that.routes[i].controllerPath;
			result.controllerFullPath = that.routes[i].controllerFullPath;
			result.templatePath       = that.routes[i].templatePath;
			result.templateFullPath   = that.routes[i].templateFullPath;
			result.staticPath         = that.routes[i].staticPath;
			result.staticFullPath     = that.routes[i].staticFullPath;

			break; // Break execution, no need to go through the rest
		}
	}

	// If no route is matched, try to autoresolve stuff
	if (Object.keys(result).length === 0) {
		if (! result.controllerPath && that.lfs.getPathSync(that.controllersPath + '/' + relUrlStr + '.js')) {
			result.controllerPath = relUrlStr + '.js';
		}

		for (let i = 0; that.templateExts[i] !== undefined; i ++) {
			const tmplExt = that.templateExts[i];

			if (that.lfs.getPathSync(that.templatesPath + '/' + relUrlStr + '.' + tmplExt)) {
				result.templatePath = relUrlStr + '.' + tmplExt;
			}
		}

		if (! result.staticPath && that.lfs.getPathSync(that.staticsPath + '/' + relUrlStr)) {
			result.staticPath = relUrlStr;
		}
	}

	// Set full paths where missing
	for (const type of ['controller', 'template', 'static']) {
		if (result[type + 'Path'] && ! result[type + 'FullPath']) {
			result[type + 'FullPath'] = that.lfs.getPathSync(that[type + 'sPath'] + '/' + result[type + 'Path']);
			if (! result[type + 'FullPath']) {
				that.log.warn(logPrefix + 'Could not find full path for ' + type + 'Path: ' + result[type + 'Path']);
			}
		}
	}

	cb(null, result);
};

exports = module.exports = Router;
