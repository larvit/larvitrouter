'use strict';

var fs                 = require('fs'),
    url                = require('url'),
    merge              = require('utils-merge'),
    path               = require('path'),
    appPath            = path.dirname(require.main.filename),
    routesConf         = require(appPath + '/config/routes.json'),
    log                = require('winston'),
    fileExistsCache    = {},
    fileExistsCacheNum = 0;

/**
 * Check if a file exists, cached
 *
 * @param str path
 * @param func callback(err, res) res is a boolean
 */
function fileExists(path, callback) {
	if (fileExistsCache[path] !== undefined) {
		callback(null, fileExistsCache[path]);
	} else {
		fs.stat(path, function(err, stat) {
			if ( ! err && stat.isFile()) {
				fileExistsCache[path] = true;
			} else {
				fileExistsCache[path] = false;
			}

			fileExistsCacheNum ++;

			// If the file exists cache is to big, flush it!
			if (fileExistsCacheNum > 100000) {
				log.warn('larvitrouter: fileExistsCache above 100000 entries, flushing to stop memory leakage');

				fileExistsCacheNum = 0;
				fileExistsCache = {};
			}

			fileExists(path, function(err, res) {
				callback(err, res);
			});
		});
	}
}

exports = module.exports = function(options) {
	var returnObj = {};

	// Copy options object
	options = merge({
		'pubFilePath':  appPath + '/public',
		'viewPath':     appPath + '/public/views',
		'customRoutes': []
	}, options);

	// Append the configuration files routes to the given custom ones
	options.customRoutes = options.customRoutes.concat(routesConf);

	if ( ! (options.customRoutes instanceof Array)) {
		options.customRoutes = [];
	}

	returnObj.resolve = function resolve(request, callback) {
		var pathname,
		    i = 0,
		    thisPubFilePath,
		    tmpControllerName,
		    controllerPath;

		request.urlParsed = url.parse(request.url, true);
		pathname          = request.urlParsed.pathname;

		log.debug('larvitrouter: parsing URL ' + request.urlParsed.pathname);

		// Call callback if callable
		function callCallback() {
			var err;

			if (request.controllerName === undefined && request.staticFilename === undefined) {
				err = new Error('larvitrouter - resolve(): Route "' + request.urlParsed.pathname + '" could not be resolved');
				log.warn(err.message);

				callback(err);
			} else {
				callback(null);
			}
		}

		// Remove .json path ending
		if (pathname.substring(pathname.length - 5) === '.json') {
			log.debug('.json URL detected, stripping ".json" for further handling');

			pathname = pathname.substring(0, pathname.length - 5);
		}

		while (options.customRoutes[i] !== undefined) {
			if (RegExp(options.customRoutes[i].regex).test(pathname)) {
				request.controllerName = options.customRoutes[i].controllerName;
				callCallback();
				break; // Break the while loop, no need to go through the rest
			}

			i ++;
		}

		// If request.conrollerName is not set by now,
		// it should either be a static file or an
		// autoresolved controller
		if (request.controllerName === undefined) {

			// Try to match a static file and if that fails, try to match a controller from URL
			thisPubFilePath = options.pubFilePath + pathname;
			fs.stat(thisPubFilePath, function(err, stat) {
				if ( ! err && stat.isFile()) {
					// File found! Set the staticFilename and call the callback
					request.staticFilename = thisPubFilePath;

					log.debug('larvitrouter: Resolved static file: ' + request.staticFilename);

					callCallback();
				} else {
					// No static file was found, see if we have a matching controller when resolved from URL
					tmpControllerName = pathname.substring(1);
					controllerPath    = './controllers/' + tmpControllerName + '.js';

					fs.stat(controllerPath, function(err, stat) {
						if ( ! err && stat.isFile()) {
							log.debug('larvitrouter: Autoresolved controller: ' + controllerPath);
							request.controllerName = tmpControllerName;
						}

						callCallback();
					});
				}
			});
		}
	};

	returnObj.sendToClient = function sendToClient(err, request, response, data) {
		var controllerPath = options.viewPath + '/' + request.controllerName,
		    view,
		    splittedPath;

		function sendErrorToClient() {
			response.writeHead(500, {'Content-Type': 'text/plain'});
			response.end('Internal server error');
		}

		function sendJsonToClient() {
			// The controller might have set a custom status code, do not override it
			if ( ! response.statusCode) {
				response.statusCode = 200;
			}

			response.writeHead(response.statusCode, {'Content-Type': 'application/json'});
			response.end(JSON.stringify(data));
		}

		function sendHtmlToClient(htmlStr) {
			// The controller might have set a custom status code, do not override it
			if ( ! response.statusCode) {
				response.statusCode = 200;
			}

			response.writeHead(response.statusCode, {'Content-Type': 'text/html'});
			response.end(htmlStr);
		}

		if ( ! request.urlParsed) {
			err = new Error('larvitrouter: request.urlParsed is not set');
			log.error(err.message);

			sendErrorToClient();
		} else if ( ! err) {
			splittedPath = request.urlParsed.pathname.split('.');

			// We need to set the request type. Can be either json or html
			if (splittedPath[splittedPath.length - 1] === 'json') {
				request.type = 'json';
				request.controllerName = request.controllerName.substring(0, request.controllerName.length - 5);
				if (request.controllerName === '') {
					request.controllerName = 'default';
				}
			} else {
				request.type = 'html';
			}

			if (request.type === 'html') {
				fileExists(controllerPath + '.js', function(err, exists) {
					if (err) {
						err.message = 'larvitrouter - fileExists() failed. Controller path: "' + controllerPath + '"';
						return;
					}

					if (exists) {
						view = require(controllerPath);

						view.run(data, function(err, htmlStr) {
							if (err) {
								err.message = 'larvitrouter - view.run() failed. Controller name: "' + request.controllerName + '"';
								log.error(err.message);
								sendErrorToClient();
								return;
							}

							sendHtmlToClient(htmlStr);
						});
					} else {
						err = new Error('Could not find controller with name: "' + request.controllerName + '"');
						log.error(err.message);
						sendErrorToClient();
					}
				});
			} else if (request.type === 'json') {
				sendJsonToClient();
			}
		} else {
			log.error('larvitrouter: sendToClient() - got error from caller: "' + err.message + '"');
			sendErrorToClient();
		}
	};

	return returnObj;
};