[![Build Status](https://github.com/larvit/larvitrouter/actions/workflows/ci.yml/badge.svg)](https://github.com/larvit/larvitrouter/actions)

# URL router

Route an URL to a controller, template and/or a static file.

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
const LUtils = require('larvitutils');
const lUtils = new lUtils();
const Router = require('larvitrouter');
const router = new Router({
	'basePath':        process.cwd(),
	'cacheMax':        1000
	'paths':           {
		'controller': {
			'path': 'controllers',
			'exts': 'js'
		},
		'static': {
			'path': 'public',
			'exts': false // Match all
		},
		'template': {
			'path': 'public/templates',
			'exts': ['tmpl', 'tmp', 'ejs', 'pug']
		}
	},
	'log':    new lUtils.Log(),
	'routes': [{
		'regex':          '^/$',
		'controllerPath': 'default.js',
		'templatePath':   'default.tmpl'
	}]
});
```

## Resolve a path

```javascript
const Router = require('larvitrouter');
const router = new Router();
const http   = require('http');

http.createServer(function(req, res) {
	router.resolve(req.url, function(err, result) {
		if (err) throw err;

		// A static file was found
		if (result.staticFilename !== undefined) {
			console.log('static path: ' + result.staticPath);
			console.log('static full path: ' + result.staticFullPath);
		}

		// A controller was found
		if (result.controllerPath) {
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

# Changelog
## 5.1.0
- Added cache layer
## 5.0.0
- Removed larvitfs support