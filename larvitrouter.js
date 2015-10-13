'use strict';

var fs     = require('fs'),
    url    = require('url'),
    events = require('events'),
    merge  = require('utils-merge'),
    path   = require('path'),
    log    = require('winston'),
    npm    = require('npm'),
    paths  = [];

exports = module.exports = function(options) {
	var returnObj          = new events.EventEmitter(),
	    fileExistsCache    = {},
	    fileExistsCacheNum = 0,
	    defaultRouteFound  = false,
	    pathsLoading       = false,
	    i;

	// Link to the module global paths object so this will be loaded once and then just returned
	returnObj.paths = paths;

	if (options === undefined) {
		options = {};
	}

	if (options.appPath === undefined) {
		options.appPath = path.dirname(require.main.filename);
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

	i = 0;
	while (options.customRoutes[i] !== undefined) {
		if (options.customRoutes[i].regex === '^/$') {
			defaultRouteFound = true;
			break;
		}

		i ++;
	}

	if (defaultRouteFound === false) {
		options.customRoutes.push({
			'regex':          '^/$',
			'controllerName': 'default'
		});
	}

	// Load paths into local cache to be used for resolving static files and stuff
	if ( ! paths.length && ! pathsLoading) {
		log.verbose('larvitrouter: loadPaths() - Loading paths cache');
		pathsLoading = true;

		npm.load({}, function(err) {
			if (err) {
				log.error('larvitrouter: loadPaths() - npm.load() returned error: ' + err.message);
				throw err;
				return;
			}

			npm.commands.ls(undefined, true, function(err, res) {
				var module;

				if (err) {
					log.error('larvitrouter: loadPaths() - npm.commands.ls() returned error: ' + err.message);
					throw err;
					return;
				}

				// Always start with the application path
				log.debug('larvitrouter: loadPaths() - Application path: ' + res.path);
				paths.push(res.path);

				// Then load the module paths
				for (module in res.dependencies) {
					if (res.dependencies[module].path !== undefined) {
						log.debug('larvitrouter: loadPaths() - Module path: ' + res.dependencies[module].path);
						paths.push(res.dependencies[module].path);
					}
				}

				pathsLoading = false;
				// Emit an event to flag for external programs that fileExists() is safe to run
				returnObj.emit('pathsLoaded');
			});
		});
	}

	/**
	 * Check if a file exists, cached
	 *
	 * @param str pathToResolve - relative path to reesolve to absolute path
	 * @return str fullPath - or false if not found
	 */
	returnObj.fileExists = function(pathToResolve) {
		var testPath,
		    stat,
		    i;

		if ( ! paths.length) {
			log.warn('larvitrouter: fileExists() - Called before paths are loaded. Never run this method before event "pathsLoaded" is emitted!');
			return false;
		}

		if (fileExistsCache[pathToResolve] !== undefined) {
			return fileExistsCache[pathToResolve];
		} else {
			// If the file exists cache is to big, flush it!
			if (fileExistsCacheNum > 100000) {
				log.warn('larvitrouter: fileExists() - fileExistsCache above 100000 entries, flushing to stop memory leakage');

				fileExistsCacheNum = 0;
				fileExistsCache    = {};
			} else {
				fileExistsCacheNum ++;
			}

			if (pathToResolve[0] === '/') {
				log.silly('larvitrouter: fileExists() - pathToResolve, "' + pathToResolve + '", starts with "/", only check aboslute path');
				if (fileExistsCache[pathToResolve] !== undefined) {
					return fileExistsCache[pathToResolve];
				}

				stat = fs.statSync(pathToResolve);

				if (stat.isFile()) {
					fileExistsCache[pathToResolve] = pathToResolve;
				} else {
					fileExistsCache[pathToResolve] = false;
				}

				return fileExistsCache[pathToResolve];
			} else {
				log.silly('larvitrouter: fileExists() - pathToResolve, "' + pathToResolve + '", is relative, look in all the paths');
				i = 0;
				while (paths[i] !== undefined) {
					log.silly('larvitrouter: fileExists() - Checking for ' + testPath);

					// If this exists, return directly
					if (fileExistsCache[pathToResolve] !== undefined) {
						log.silly('larvitrouter: fileExists() - Found ' + testPath + ' in cache');
						return fileExistsCache[pathToResolve];
					}

					testPath = path.join(paths[i], pathToResolve);

					// Lookup if this file exists
					try {
						stat = fs.statSync(testPath);

						if (stat.isFile()) {
							log.debug('larvitrouter: fileExists() - Found ' + testPath + ' - loading to cache');
							fileExistsCache[pathToResolve] = testPath;
							return fileExistsCache[pathToResolve];
						}
					} catch(e) {
						log.silly('larvitrouter: fileExists() - ' + testPath + ' does not exist');
					}

					i ++;
				}

				// If we arrive here, no file have been found.
				fileExistsCache[pathToResolve] = false;

				return fileExistsCache[pathToResolve];
			}
		}
	};

	returnObj.resolve = function resolve(request, callback) {
		var i = 0,
		    thisPubFilePath,
		    controllerPath,
		    truePath,
		    pathname,
		    protocol,
		    host;

		if (request.connection && request.connection.encrypted) {
			protocol = 'https';
		} else {
			protocol = 'http';
		}

		if (request.headers && request.headers.host) {
			host = request.headers.host;
		} else {
			host = 'localhost';
		}

		request.urlParsed = url.parse(protocol + '://' + host + request.url, true);
		pathname          = request.urlParsed.pathname;

		log.debug('larvitrouter: returnObj.resolve() - parsing URL ' + request.urlParsed.pathname);

		// Call callback if callable
		function callCallback() {
			var err;

			if (request.controllerName === undefined && request.staticFilename === undefined) {
				err = new Error('larvitrouter: resolve() - Route "' + request.urlParsed.pathname + '" could not be resolved');
				log.info(err.message);

				request.controllerName = '404';
				if (returnObj.paths.length) {
					request.controllerFullPath = returnObj.fileExists(options.controllersPath + '/404.js');
				} else {
					returnObj.on('pathsLoaded', function() {
						request.controllerFullPath = returnObj.fileExists(options.controllersPath + '/404.js');
					});
				}

				callback(err);
			} else {
				callback(null);
			}
		}

		// Remove .json path ending
		if (pathname.substring(pathname.length - 5) === '.json') {
			log.debug('larvitrouter: returnObj.resolve() - .json URL detected, stripping ".json" for further handling');

			pathname = pathname.substring(0, pathname.length - 5);
		}

		// We do this because of possible async calls to fileExists()
		function setControllerName() {
			request.controllerFullPath = returnObj.fileExists(options.controllersPath + '/' + options.customRoutes[i].controllerName + '.js');

			if (request.controllerFullPath === false) {
				request.controllerName = undefined;
			} else {
				request.controllerName = options.customRoutes[i].controllerName;
			}

			callCallback();
		}

		// Go through all custom routes to see if we have a match
		while (options.customRoutes[i] !== undefined) {
			log.silly('larvitrouter: returnObj.resolve() - Trying to match custom route "' + options.customRoutes[i].regex + '" with pathname "' + pathname + '"');
			if (RegExp(options.customRoutes[i].regex).test(pathname)) {
				log.debug('larvitrouter: returnObj.resolve() - Matched custom route "' + options.customRoutes[i].regex + '" to controllerName: ' + options.customRoutes[i].controllerName);

				if (returnObj.paths.length) {
					setControllerName();
				} else {
					returnObj.on('pathsLoaded', function() {
						setControllerName();
					});
				}

				return; // Break execution, no need to go through the rest
			}

			i ++;
		}

		// If request.conrollerName is not set by now,
		// it should either be a static file or an
		// autoresolved controller

		// Try to match a static file and if that fails, try to match a controller from URL
		thisPubFilePath = path.join(options.pubFilePath, pathname);
		truePath        = returnObj.fileExists(thisPubFilePath);

		if (truePath !== false) {
			// File found! Set the staticFilename and call the callback
			request.staticFilename = truePath;

			log.debug('larvitrouter: returnObj.resolve() - Resolved static file: ' + request.staticFilename);

			callCallback();
		} else {
			// No static file was found, see if we have a matching controller when resolved from URL
			controllerPath = path.join(options.controllersPath, pathname + '.js');
			truePath       = returnObj.fileExists(controllerPath);

			if (truePath !== false) {
				log.debug('larvitrouter: Autoresolved controller: ' + truePath);
				request.controllerName     = pathname.substring(1);;
				request.controllerFullPath = truePath;
			}

			callCallback();
		}
	};

	return returnObj;
};