[![Build Status](https://travis-ci.org/larvit/larvitrouter.svg?branch=master)](https://travis-ci.org/larvit/larvitrouter) [![Dependencies](https://david-dm.org/larvit/larvitrouter.svg)](https://david-dm.org/larvit/larvitrouter.svg)

# larvitrouter

Route an URL to a controller or a static file, where controller is a filename in the "controllers" path and a static file is a filename in the "public" path.

Auto resolves files like so:

* /foo translates to controllers/foo.js
* /css/style.css translates to public/css/style.css
* / translates to controllers/default.js

This behaviour can be changed with customized options.

## Load module

All options passed here are optional and the given ones are the default that will be used if they are omitted.

Paths are relative to application root as first priority. If nothing is found there, all modules will be tested as relative to this path to try to find a matching file. The modules are searched in the order given in package.json dependencies.

Simple, use default options:

```javascript
const router = require('larvitrouter')();
```

Use custom options (the defaults are used in this example):

```javascript
const router = require('larvitrouter')({
	'controllersPath': 'controllers',
	'publicPath': 'public',
	'routes': [{
		'regex':          '^/$',
		'controllerName': 'default'
	}]
});
```

## Resolve a path

```javascript
const router = require('larvitrouter')(),
      http   = require('http');

http.createServer(function(req, res) {
	router.resolve(req, function(err, result) {
		if (err)
			throw err;

		// If a static file is found, it is populated in result.staticFilename
		if (result.staticFilename !== undefined) {
			console.log('staticFilename: ' + result.staticFilename);
			console.log('static file path: ' + result.staticFullPath);

		// else result.controllerName will be populated with the name set in the routes or found controller in the controller path
		} else {
			console.log('controllerName: ' + result.conrollerName);
			console.log('controller path: ' + result.controllerFullPath);
		}

		res.end('Resolved stuff, se console output for details');
	})
}).listen(8001);
```