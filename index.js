'use strict';

const merge = require('utils-merge'),
      path  = require('path'),
      lfs   = require('larvitfs'),
      log   = require('winston');

exports = module.exports = function(options) {
	const returnObj = {};

	let defaultRouteFound = false,
	    pubFileFullPath;

	if (options === undefined) {
		options = {};
	}

	if (options.appPath === undefined) {
		options.appPath = path.dirname(process.cwd());
	}

	// Copy options object
	options = merge({
		'pubFilePath':     'public',
		'controllersPath': 'controllers',
		'customRoutes':    []
	}, options);

	if (options.pubFilePath[0] === '/') {
		options.pubFilePath = path.resolve(options.pubFilePath);
	}

	if (options.controllersPath[0] === '/') {
		options.controllersPath = path.resolve(options.controllersPath);
	}

	if ( ! (options.customRoutes instanceof Array)) {
		options.customRoutes = [];
	}

	for (let i = 0; options.customRoutes[i] !== undefined; i ++) {
		if (options.customRoutes[i].regex === '^/$') {
			defaultRouteFound = true;
			break;
		}
	}

	// We should always have a default route, so if noone exists, create one
	if (defaultRouteFound === false) {
		options.customRoutes.push({
			'regex':          '^/$',
			'controllerName': 'default'
		});
	}

	returnObj.resolve = function resolve(urlStr) {
		const result = {};

		let controllerPath,
		    pubFilePath;

		if (typeof urlStr !== 'string') {
			log.warn('larvitrouter: returnObj.resolve() - Invalid option given, is not a string');
			urlStr = '/500';
		}

		log.debug('larvitrouter: returnObj.resolve() - parsing URL ' + urlStr);

		// Remove .json path ending
		if (urlStr.substring(urlStr.length - 5) === '.json') {
			log.debug('larvitrouter: returnObj.resolve() - .json URL detected, stripping ".json" for further handling');

			urlStr = urlStr.substring(0, urlStr.length - 5);
		}

		// Go through all custom routes to see if we have a match
		for (let i = 0; options.customRoutes[i] !== undefined; i ++) {
			log.silly('larvitrouter: returnObj.resolve() - Trying to match custom route "' + options.customRoutes[i].regex + '" with urlStr "' + urlStr + '"');

			if (RegExp(options.customRoutes[i].regex).test(urlStr)) {
				log.debug('larvitrouter: returnObj.resolve() - Matched custom route "' + options.customRoutes[i].regex + '" to controllerName: ' + options.customRoutes[i].controllerName);

				result.controllerFullPath = lfs.getPathSync(options.controllersPath + '/' + options.customRoutes[i].controllerName + '.js');

				if (result.controllerFullPath !== false) {
					result.controllerName = options.customRoutes[i].controllerName;

					break; // Break execution, no need to go through the rest
				} else {
					log.warn('larvitrouter: returnObj.resolve() - Matched custom route "' + options.customRoutes[i].regex + '" to controllerName: ' + options.customRoutes[i].controllerName + ' but controller file does not exist');
				}
			}
		}

		if (result.controllerName === undefined) {
			// If result.conrollerName is not set by now,
			// it should either be a static file or an
			// autoresolved controller

			// Try to match a static file and if that fails, try to match a controller from URL
			pubFilePath     = path.join(options.pubFilePath, urlStr);
			pubFileFullPath = lfs.getPathSync(pubFilePath);

			if (pubFileFullPath !== false) {
				// File found! Set the staticFilename and call the cb
				result.staticFilename = urlStr;
				result.staticFullPath = pubFileFullPath;

				log.debug('larvitrouter: returnObj.resolve() - Resolved static file: ' + result.staticFilename);
			} else {

				// No static file was found, see if we have a matching controller when resolved from URL
				controllerPath            = path.join(options.controllersPath, urlStr + '.js');
				result.controllerFullPath = lfs.getPathSync(controllerPath);

				if (result.controllerFullPath !== false) {
					log.debug('larvitrouter: Autoresolved controller: ' + result.controllerFullPath);
					result.controllerName = urlStr.substring(1);;
				} else {
					delete result.controllerFullPath;
				}
			}
		}

		if (result.controllerName === undefined && result.staticFilename === undefined) {
			log.verbose('larvitrouter: resolve() - Route "' + urlStr + '" could not be resolved');

			result.controllerName     = '404';
			result.controllerFullPath = lfs.getPathSync(options.controllersPath + '/404.js');

			if (result.controllerFullPath === false) {
				delete result.controllerName;
				delete result.controllerFullPath;
				log.warn('larvitrouter: resolve() - Controller 404.js not found for route "' + urlStr + '" that could not be resolved');
			}
		}

		return result;
	};

	return returnObj;
};