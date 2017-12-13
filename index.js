'use strict';

const	topLogPrefix	= 'larvitrouter: index.js: ',
	Lfs	= require('larvitfs'),
	log	= require('winston');

function Router(options) {
	const	logPrefix	= topLogPrefix + 'Router() - ';

	let	defaultRouteFound	= false;

	if ( ! options)	{ options	= {};	}
	if ( ! options.controllersPath)	{ options.controllersPath	= 'controllers';	}
	if ( ! options.staticsPath)	{ options.staticsPath	= 'public';	}
	if ( ! options.templatesPath)	{ options.templatesPath	= 'public/templates';	}
	if ( ! options.templateExts)	{ options.templateExts	= ['tmpl', 'tmp', 'ejs', 'pug'];	}
	if ( ! options.routes)	{ options.routes	= [];	}
	if ( ! options.basePath)	{ options.basePath	= process.cwd();	}

	if ( ! Array.isArray(options.templateExts)) {
		options.templateExts	= [options.templateExts];
	}

	this.options	= options;
	this.lfs	= new Lfs({'basePath': options.basePath});

	for (let i = 0; options.routes[i] !== undefined; i ++) {
		if (options.routes[i].regex === '^/$') {
			defaultRouteFound	= true;
			break;
		}
	}

	// We should always have a default route, so if none exists, create one
	if (defaultRouteFound === false) {
		options.routes.push({
			'regex':	'^/$',
			'controllerPath':	'default.js',
			'templatePath':	'default.tmpl'
		});
	}

	log.debug(logPrefix + 'Instantiated with options: ' + JSON.stringify(options));
}

Router.prototype.resolve = function(urlStr, cb) {
	const	logPrefix	= topLogPrefix + 'Router.prototype.resolve() - ',
		result	= {},
		that	= this;

	let	relUrlStr;

	if (typeof cb !== 'function') {
		cb = function () {};
	}

	if (typeof urlStr !== 'string') {
		const	err	= new Error('First parameter must be a string');
		log.warn(logPrefix + err.message);
		log.verbose(logPrefix + 'err.stack:\n' + err.stack);
		return cb(err);
	}

	log.debug(logPrefix + 'parsing URL ' + urlStr);

	relUrlStr	= urlStr[0] === '/' ? urlStr.substring(1) : urlStr;

	// Go through all custom routes to see if we have a match
	for (let i = 0; that.options.routes[i] !== undefined; i ++) {
		log.silly(logPrefix + 'Trying to match custom route "' + that.options.routes[i].regex + '" with urlStr "' + urlStr + '"');

		if (RegExp(that.options.routes[i].regex).test(urlStr)) {
			log.debug(logPrefix + 'Matched custom route "' + that.options.routes[i].regex + '" to route: ' + JSON.stringify(that.options.routes[i]));

			result.controllerPath	= that.options.routes[i].controllerPath;
			result.controllerFullPath	= that.options.routes[i].controllerFullPath;
			result.templatePath	= that.options.routes[i].templatePath;
			result.templateFullPath	= that.options.routes[i].templateFullPath;
			result.staticPath	= that.options.routes[i].staticPath;
			result.staticFullPath	= that.options.routes[i].staticFullPath;

			break; // Break execution, no need to go through the rest
		}
	}

	// If no route is matched, try to autoresolve stuff
	if (Object.keys(result).length === 0) {
		if ( ! result.controllerPath && that.lfs.getPathSync(that.options.controllersPath + '/' + relUrlStr + '.js')) {
			result.controllerPath	= relUrlStr + '.js';
		}

		for (let i = 0; that.options.templateExts[i] !== undefined; i ++) {
			const	tmplExt	= that.options.templateExts[i];

			if (that.lfs.getPathSync(that.options.templatesPath + '/' + relUrlStr + '.' + tmplExt)) {
				result.templatePath	= relUrlStr + '.' + tmplExt;
			}
		}

		if ( ! result.staticPath && that.lfs.getPathSync(that.options.staticsPath + '/' + relUrlStr)) {
			result.staticPath	= relUrlStr;
		}
	}

	// Set full paths where missing
	for (const type of ['controller', 'template', 'static']) {
		if (result[type + 'Path'] && ! result[type + 'FullPath']) {
			result[type + 'FullPath']	= that.lfs.getPathSync(that.options[type + 'sPath'] + '/' + result[type + 'Path']);
			if ( ! result[type + 'FullPath']) {
				log.warn(logPrefix + 'Could not find full path for ' + type + 'Path: ' + result[type + 'Path']);
			}
		}
	}

	cb(null, result);
};

exports = module.exports = Router;
