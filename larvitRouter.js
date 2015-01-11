'use strict';

var fs            = require('fs'),
    url           = require('url'),
    merge         = require('utils-merge'),
    _             = require('underscore'),
    path          = require('path'),
    appPath       = path.dirname(require.main.filename),
    routesConf    = require(appPath + '/config/routes.json'),
    log           = require('winston'),
    compiledTmpls = {};

/**
 * Compile templates and cache the compiled ones
 *
 * @param str staticFilename
 * @param func callback(err, compiledObj)
 */
function compileTmpl(staticFilename, callback) {
	if (compiledTmpls[staticFilename] === undefined) {
		fs.readFile(staticFilename, 'utf8', function(err, tmplFileContent){
			if ( ! err) {
				compiledTmpls[staticFilename] = _.template(tmplFileContent);

				callback(null, compiledTmpls[staticFilename]);
			} else {
				callback(err);
			}
		});
	} else {
		callback(null, compiledTmpls[staticFilename]);
	}
}

exports = module.exports = function(options) {
	var returnObj = {};

	// Copy options object
	options = merge({
		'pubFilePath':  appPath + '/public',
		'tmplDir':      'tmpl',
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

		log.debug('larvitRouter: parsing URL ' + request.urlParsed.pathname);

		// Call callback if callable
		function callCallback() {
			var err;

			if (request.controllerName === undefined && request.staticFilename === undefined) {
				err = new Error('larvitRouter - resolve(): Route "' + request.urlParsed.pathname + '" could not be resolved');
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

					log.debug('larvitRouter: Resolved static file: ' + request.staticFilename);

					callCallback();
				} else {
					// No static file was found, see if we have a matching controller when resolved from URL
					tmpControllerName = pathname.substring(1);
					controllerPath    = './controllers/' + tmpControllerName + '.js';

					fs.stat(controllerPath, function(err, stat) {
						if ( ! err && stat.isFile()) {
							log.debug('larvitRouter: Autoresolved controller: ' + controllerPath);
							request.controllerName = tmpControllerName;
						}

						callCallback();
					});
				}
			});
		}
	};

	returnObj.sendToClient = function sendToClient(err, request, response, data) {
		var splittedPath,
		    tmplName,
		    tmplRequest;

		function sendErrorToClient(err) {
			log.error('larvitRouter - sendToClient(): exited due to error', err);

			response.writeHead(500, {'Content-Type': 'text/plain'});
			response.end('Internal server error');
		}

		if ( ! request.urlParsed) {
			sendErrorToClient(new Error('larvitRouter: request.urlParsed is not set'));
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
				tmplName    = '/' + options.tmplDir + '/' + request.controllerName + '.tmpl';
				tmplRequest = {'url': tmplName};

				// Make an internal resolve for the template
				// We do this to imitade what it would be to fetch the
				// template from the clients perspective
				returnObj.resolve(tmplRequest, function(err) {
					if ( ! err && tmplRequest.staticFilename !== undefined) {

						compileTmpl(tmplRequest.staticFilename, function(err, compiledTmpl) {
							if ( ! err) {

								// The controller might have set a custom status code, do not override it
								if ( ! response.statusCode) {
									response.statusCode = 200;
								}

								response.writeHead(response.statusCode, {'Content-Type': 'text/html'});
								response.end(compiledTmpl(data));
							} else {
								sendErrorToClient(err);
							}
						});

					} else {
						sendErrorToClient(new Error('larvitRouter: template "' + tmplName + '" not found'));
					}
				});
			} else if (request.type === 'json') {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify(data));
			}
		} else {
			sendErrorToClient(err);
		}
	};

	return returnObj;
};