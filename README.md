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

### Hierarchy file system; fileExists()

The idea here is to be able to share files between modules and application in a transparant way.

Lets say you'd wish to serve a HTML file, index.html. The default file resides in our little module "foobar" like this:

    ./node_modules/foobar/public/index.html

If we run fileExists('public/index.html'); we'll get the full path back:

    var fullPath = require('larvitrouter')().fileExists('public/index.html');
    // /app/absolute/path/node_modules/foobar/public/index.html

But if we add this file to our own application, in ./public/index.html, that file will be higher in priority and will be returned instead:

    var fullPath = require('larvitrouter')().fileExists('public/index.html');
    // /app/absolute/path/public/index.html

All modules in node_modules will be searched for the given file. The priority is decided by the list order in dependencies in package.json.


### Resolve a path

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