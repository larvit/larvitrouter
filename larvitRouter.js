var fs    = require('fs'),
    url   = require('url'),
    merge = require('utils-merge');

exports = module.exports = function(options) {

	// Copy options object
	options = merge({
		'pubFilePath':  './public',
		'tmplDir':      'html',
		'tmplEngine':   require('larvittmpl'),
		'customRoutes': [],
		'debug':        false
	}, options);

	if (options.debug === true)
		options.tmplEngine.debug = true;

	var returnObj = {};

	returnObj.resolve = function resolve(request, callback) {
		request.urlParsed = url.parse(request.url, true);
		var pathname      = request.urlParsed.pathname;

		// Remove .json path ending
		if (pathname.substring(pathname.length - 5) == '.json')
			pathname = pathname.substring(0, pathname.length - 5);

		var i = 0;
		while (options.customRoutes[i] !== undefined) {
			if (RegExp(options.customRoutes[i].regex).test(pathname)) {
				request.controllerName = options.customRoutes[i].controllerName;
				callCallback();
			}
			i++;
		}

		if (request.controllerName === undefined) {

			// Try to match a static file and if that fails, try to match a controller from URL
			var thisPubFilePath = options.pubFilePath + pathname;
			fs.stat(thisPubFilePath, function(err, stat) {
				if ( ! err && stat.isFile()) {
					// File found! Set the staticFilename and call the callback
					request.staticFilename = thisPubFilePath;
					callCallback();
				} else {
					// No static file was found, see if we have a matching controller when resolved from URL
					var controllerName = pathname.substring(1);

					fs.stat('./controllers/' + controllerName + '.js', function(err, stat) {
						if ( ! err && stat.isFile())
							request.controllerName = controllerName;
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
	};

	returnObj.sendToClient = function sendToClient(err, request, response, data) {
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
				var tmplName = '/' + options.tmplDir + '/' + request.controllerName + '.html',
				    tmplRequest = {'url': tmplName};

				// Make an internal resolve for the template
				// We do this to imitade what it would be to fetch the
				// template from the clients perspective
				returnObj.resolve(tmplRequest, function(err){
					if ( ! err && tmplRequest.staticFilename !== undefined) {

						fs.readFile(tmplRequest.staticFilename, function(err, tmplFileContent){
							if ( ! err) {
								options.tmplEngine.render(tmplFileContent.toString(), data, function(err, htmlStr){
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
	};

	return returnObj;
}