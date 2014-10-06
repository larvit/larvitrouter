var fs  = require('fs'),
    url = require('url');

exports.pubFilePath = './public';
exports.tmplDir     = 'html';

// Todo: Go over this and make it more loosley coupled
exports.tmplEngine  = require('larvitTmpl');

/**
 * Resolve what to do based on request
 *
 * Will populate or modify if it exists:
 * request.urlParsed
 * request.staticFilename - if there is a matching static file
 * request.controllerName - if there is a matching controller
 *
 * @param obj request
 * @param func callback(err, info)
 */
exports.resolve = function(request, callback) {
	request.urlParsed = url.parse(request.url, true);
	var pathname      = request.urlParsed.pathname;

	// Remove .json path ending
	if (pathname.substring(pathname.length - 5) == '.json') {
		pathname = pathname.substring(0, pathname.length - 5);
		callCallback();
	}

	// Default route always is default
	if (pathname == '/') {
		request.controllerName = 'default';
		callCallback();
	}

	/* Do custom routes like this:
	else if (RegExp('^/mupp$').test(pathname)) {
		request.controllerName = 'muppet';
		callCallback();
	}
	*/

	else {

		// Try to match a static file and if that fails, try to match a controller from URL
		var thisPubFilePath = exports.pubFilePath + pathname;
		fs.stat(thisPubFilePath, function(err, stat) {
			if ( ! err && stat.isFile()) {
				// File found! Set the staticFilename and call the callback
				request.staticFilename = thisPubFilePath;
				callCallback();
			} else {
				// No static file was found, see if we have a matching controller when resolved from URL
				var controllerName = pathname.substring(1);

				console.info('larvitRouter.js - resolve() auto-resolved non-confirmed controllerName: ' + controllerName);

				fs.stat('./controllers/' + controllerName + '.js', function(err, stat) {
					if ( ! err && stat.isFile()) {
						request.controllerName = controllerName;

						console.info('larvitRouter.js - resolve() confirmed auto-resolved controllerName: ' + controllerName);
					}
					callCallback();
				});
			}
		});
	}

	// Call callback if callable
	function callCallback() {
		if (typeof callback === 'function') {
			if (request.controllerName === undefined && request.staticFilename === undefined) {
				var errorMsg = 'larvitRouter.js - resolve() - Route "' + request.urlParsed.pathname + '" could not be resolved';
				console.error(errorMsg);
				callback(new Error(errorMsg));
			} else {
				callback(null);
			}
		}
	}
}

/**
 * Send response to client
 *
 * @param obj err - Error object
 * @param obj request
 * @param obj response
 * @param obj data - Data to send
 */
exports.sendToClient = function(err, request, response, data) {
	if ( ! err) {
		var splittedPath = request.urlParsed.pathname.split('.');

		// We need to set the request type. Can be either json or html
		if (splittedPath[splittedPath.length - 1] == 'json') {
			request.type = 'json';
			request.controllerName = request.controllerName.substring(0, request.controllerName.length - 5);
			if (request.controllerName == '')
				request.controllerName = 'default';
		} else {
			request.type = 'html';
		}

		if (request.type == 'html') {
			var tmplName = '/' + exports.tmplDir + '/' + request.controllerName + '.html',
			    tmplRequest = {'url': tmplName};

			// Make an internal resolve for the template
			// We do this to imitade what it would be to fetch the
			// template from the clients perspective
			exports.resolve(tmplRequest, function(err){
				if ( ! err && tmplRequest.staticFilename !== undefined) {

					fs.readFile(tmplRequest.staticFilename, function(err, tmplFileContent){
						if ( ! err) {
							exports.tmplEngine.render(tmplFileContent.toString(), data, function(err, htmlStr){
								if ( ! err) {
									if ( ! response.statusCode)
										response.statusCode = 200;

									response.writeHead(response.statusCode, {'Content-Type': 'text/html'});
									response.end(htmlStr);
								} else {
									internalError(err);
								}
							});
						} else {
							internalError(err);
						}
					})

				} else {
					internalError(new Error('template "' + tmplName + '" not found'));
				}
			});
		} else if (request.type == 'json') {
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.end(JSON.stringify(data));
		}
	} else {
		internalError(err);
	}

	function internalError(err) {
		console.error('larvitRouter.js - sendToClient() exited due to error:');
		console.error(err);

		response.writeHead(500, {'Content-Type': 'text/plain'});
		response.end('Internal server error');
	}
}