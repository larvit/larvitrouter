[![Build Status](https://travis-ci.org/larvit/larvitrouter.svg?branch=master)](https://travis-ci.org/larvit/larvitrouter) [![Dependencies](https://david-dm.org/larvit/larvitrouter.svg)](https://david-dm.org/larvit/larvitrouter.svg)
[![Coverage Status](https://coveralls.io/repos/larvit/larvitrouter/badge.svg)](https://coveralls.io/github/larvit/larvitrouter)

# URL router

Route an URL to a controller, template and/or a static file. Makes use of [larvitfs](https://www.npmjs.com/package/larvitfs) cascading viritual filesystem.

Auto resolves files like so:

* /foo might resolve to controllerPath: foo.js and templatePath: foo.ejs
* /css/style.css might resolve to staticPath: css/style.css
* / resolves to controllerPath: default.js and templatePath: default.tmpl

This behaviour can be changed with customized options.

## Installation

```bash
npm i larvitrouter
```

## Usage

All options passed here are optional and the given ones are the default that will be used if they are omitted.

Paths are relative to application root as first priority. If nothing is found there, all modules will be tested as relative to this path to try to find a matching file. The modules are searched in the order given in package.json dependencies.

Simple, use default options:

```javascript
const Router = require('larvitrouter'),
      router = new Router();
```

Use custom options (the defaults are used in this example):

```javascript
const Router = require('larvitrouter'),
      router = new Router({
	'basePath':        process.cwd(),
	'controllersPath': 'controllers',
	'staticsPath':     'public',
	'templatesPath':   'public/templates',
	'templateExts':    ['tmpl', 'tmp', 'ejs', 'pug']
	'routes': [{
		'regex':          '^/$',
		'controllerPath': 'default.js',
		'templatePath':   'default.tmpl'
	}]
});
```

## Resolve a path

```javascript
const Router = require('larvitrouter'),
      router = new Router(),
      http   = require('http');

http.createServer(function(req, res) {
	router.resolve(req.url, function(err, result) {
		if (err) throw err;

		// A static file was found
		if (result.staticFilename !== undefined) {
			console.log('static path: ' + result.staticPath);
			console.log('static full path: ' + result.staticFullPath);
		}

		// A controller was found
		if (result.controllerPath)
			console.log('controller path: ' + result.controllerPath);
			console.log('controller full path: ' + result.controllerFullPath);
		}

		// A template was found
		if (result.templatePath) {
			console.log('template path: ' + result.templatePath);
			console.log('template full path: ' + result.templateFullPath);
		}

		res.end('Resolved stuff, see console output for details');
	})
}).listen(8001);
```
