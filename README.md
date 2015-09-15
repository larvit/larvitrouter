# larvitrouter

Router and client feeder for node.js

## Usage

### Load module

All options passed here are optional and the given ones are the default that will be used if they are omitted.

Paths are relative to application root as first priority. If nothing is found there, all modules will be tested as relative to this path to try to find a matching file. The modules are searched in the order given in package.json dependencies.

    var router = require('larvitrouter')({
    	'pubFilePath':     'public',
    	'viewPath':        'public/views',
    	'controllersPath': 'controllers',
    	'customRoutes': [{
    		'regex':          '^/$',
    		'controllerName': 'default'
    	}]
    });

### Resolve a path:

    router.resolve(request, function(err) {
    	if (err) {
    		throw err;
    	}

    	// Here request.urlParsed will be populated from url.parse(request.url, true)

    	// If a static file is found, it is populated in request.staticFilename

    	// else request.controllerName will be populated with the name set in the custom routes or found controller in the controller path

    });

### Sending data to the client

Why not use response.send() and response.end() directly you ask? Because we want to use views and templates and if they are missing we want to automaticly respond with the JSON data instead. That is why.

If you have a very simple controller that always do the same simple thing, go ahead and use response.send() and response.end() instead. :)

The view filename is by default the same as the controller name. To use a custom view file, set response.viewFile to a custom filename. It will be relative to the viewPath option.

    router.sendToClient(err, request, response, data);