'use strict';

var fs                 = require('fs'),
    url                = require('url'),
    merge              = require('utils-merge'),
    path               = require('path'),
    log                = require('winston'),
    npm                = require('npm'),
    async              = require('async'),
    paths              = [];

// Load paths into local cache to be used for resolving static files and stuff
function loadPaths(cb) {
	if (paths.length) {
		log.debug('larvitrouter: loadPaths() - Paths cache already loaded, calling callback');
		cb();
		return;
	}

	log.verbose('larvitrouter: loadPaths() - Loading paths cache');
	npm.load({}, function(err) {
		if (err) {
			log.error('larvitrouter: loadPaths() - npm.load() returned error: ' + err.message);
			cb(err);
			return;
		}

		npm.commands.ls(undefined, true, function(err, res) {
			var module;

			if (err) {
				log.error('larvitrouter: loadPaths() - npm.commands.ls() returned error: ' + err.message);

				cb(err);
				return;
			}

			// Always start with the application path
			log.verbose('larvitrouter: loadPaths() - Application path: ' + res.path);
			paths.push(res.path);

			// Then load the module paths
			for (module in res.dependencies) {
				if (res.dependencies[module].path !== undefined) {
					log.verbose('larvitrouter: loadPaths() - Module path: ' + res.dependencies[module].path);
					paths.push(res.dependencies[module].path);
				}
			}

			cb();
		});
	});
}

exports = module.exports = function(options) {
	var returnObj          = {},
	    fileExistsCache    = {},
	    fileExistsCacheNum = 0;

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

	options.customRoutes.push({
		'regex':          '^/$',
		'controllerName': 'default'
	});

	/**
	 * Check if a file exists, cached
	 *
	 * @param str pathToResolve - relative path to reesolve to absolute path
	 * @param func cb(err, res, fullPath) res is a boolean
	 */
	returnObj.fileExists = function fileExists(pathToResolve, cb) {
		var tasks = [];

		function pushTask(i) {
			tasks.push(function(cb) {
				var testPath = path.join(paths[i], pathToResolve);

				log.debug('larvitrouter: fileExists() - pushTask() - Checking for ' + testPath);

				// If this exists, callback directly
				if (fileExistsCache[pathToResolve] !== undefined) {
					log.debug('larvitrouter: fileExists() - pushTask() - Found ' + testPath + ' in cache');
					cb();
					return;
				}

				// Lookup if this file exists
				fs.stat(testPath, function(err, stat) {
					if ( ! err && stat.isFile()) {
						log.debug('larvitrouter: fileExists() - pushTask() - Found ' + testPath + ' - loading to cache');
						fileExistsCache[pathToResolve] = testPath;
					}

					cb();
				});
			});
		}

		if (fileExistsCache[pathToResolve] === false) {
			cb(null, false);
		} else if (fileExistsCache[pathToResolve] !== undefined) {
			cb(null, true, fileExistsCache[pathToResolve]);
		} else {
			log.verbose('larvitrouter: fileExists() - Populating cache');
			loadPaths(function(err) {
				var i;

				if (err) {
					log.error('larvitrouter: fileExists() - loadPaths() failed with: ' + err.message);
					throw err;
				}

				if (pathToResolve[0] === '/') {
					log.debug('larvitrouter: fileExists() - pathToResolve starts with "/", only check aboslute path');
					tasks.push(function(cb) {
						// If this
						if (fileExistsCache[pathToResolve] !== undefined) {
							cb();
							return;
						}

						fs.stat(pathToResolve, function(err, stat) {
							if ( ! err && stat.isFile()) {
								fileExistsCache[pathToResolve] = pathToResolve;
							} else {
								fileExistsCache[pathToResolve] = false;
							}

							cb();
						});
					});
				} else {
					log.debug('larvitrouter: fileExists() - pathToResolve is relative, look in all the paths');
					i = 0;
					while (paths[i] !== undefined) {
						pushTask(i);

						i ++;
					}
				}

				async.series(tasks, function() {
					fileExistsCacheNum ++;

					log.debug('larvitrouter: fileExists() - All async tasks is done');

					// If the file exists cache is to big, flush it!
					if (fileExistsCacheNum > 100000) {
						log.warn('larvitrouter: fileExists() - fileExistsCache above 100000 entries, flushing to stop memory leakage');

						fileExistsCacheNum = 0;
						fileExistsCache    = {};
					}

					// Set this path to false if it was not found
					if (fileExistsCache[pathToResolve] === undefined) {
						fileExistsCache[pathToResolve] = false;
					}

					// Re-run this function to return the cached result or cache it again
					fileExists(pathToResolve, cb);
				});
			});
		}
	};

	returnObj.resolve = function resolve(request, callback) {
		var i = 0,
		    thisPubFilePath,
		    controllerPath,
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
				log.warn(err.message);

				returnObj.fileExists(options.controllersPath + '/404.js', function(err, res, truePath) {
					if (err) {
						throw err;
					}

					request.controllerName     = '404';
					request.controllerFullPath = truePath;

					callback(err);
				});
			} else {
				callback(null);
			}
		}

		// Remove .json path ending
		if (pathname.substring(pathname.length - 5) === '.json') {
			log.debug('larvitrouter: returnObj.resolve() - .json URL detected, stripping ".json" for further handling');

			pathname = pathname.substring(0, pathname.length - 5);
		}

		// Go through all custom routes to see if we have a match
		while (options.customRoutes[i] !== undefined) {
			if (RegExp(options.customRoutes[i].regex).test(pathname)) {
				log.debug('larvitrouter: returnObj.resolve() - Matched custom route "' + options.customRoutes[i].regex + '" to controllerName: ' + options.customRoutes[i].controllerName);

				returnObj.fileExists(options.controllersPath + '/' + options.customRoutes[i].controllerName + '.js', function(err, res, truePath) {
					if (err) {
						throw err;
					}

					if ( ! res) {
						request.controllerName = undefined;
						callCallback();
						return;
					}

					request.controllerName     = options.customRoutes[i].controllerName;
					request.controllerFullPath = truePath;
					callCallback();
				});
				return; // Break execution, no need to go through the rest
			}

			i ++;
		}

		// If request.conrollerName is not set by now,
		// it should either be a static file or an
		// autoresolved controller

		// Try to match a static file and if that fails, try to match a controller from URL
		thisPubFilePath = path.join(options.pubFilePath, pathname);
		returnObj.fileExists(thisPubFilePath, function(err, res, truePath) {
			if (err) {
				throw err;
			}

			if (res) {
				// File found! Set the staticFilename and call the callback
				request.staticFilename = truePath;

				log.debug('larvitrouter: returnObj.resolve() - Resolved static file: ' + request.staticFilename);

				callCallback();
			} else {
				// No static file was found, see if we have a matching controller when resolved from URL
				controllerPath = path.join(options.controllersPath, pathname + '.js');

				returnObj.fileExists(controllerPath, function(err, res, truePath) {
					if (err) {
						throw err;
					}

					if (res) {
						log.debug('larvitrouter: Autoresolved controller: ' + truePath);
						request.controllerName     = pathname.substring(1);;
						request.controllerFullPath = truePath;
					}

					callCallback();
				});
			}
		});
	};

	return returnObj;
};