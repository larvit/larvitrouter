'use strict';

const { Log } = require('larvitutils');
const Router = require(__dirname + '/../index.js');
const path = require('path');
const test = require('tape');
const log = new Log('error');

test('Resolve the default controller', t => {
	const router = new Router({ basePath: path.join(__dirname, '/test_www_root/'), log });

	router.resolve('/', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, 'default.js');
		t.equal(result.controllerFullPath, path.join(__dirname, 'test_www_root/controllers/default.js'));
		t.equal(result.templatePath, 'default.tmpl');
		t.equal(result.templateFullPath, path.join(__dirname, 'test_www_root/public/templates/default.tmpl'));
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Resolve nothing for URL with no matches', t => {
	const router = new Router({ basePath: __dirname + '/test_www_root/', log });

	router.resolve('/fasdf.txt', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, undefined);
		t.equal(result.controllerFullPath, undefined);
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Resolve static file', t => {
	const router = new Router({ basePath: __dirname + '/test_www_root/', log });

	router.resolve('/test.css', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, undefined);
		t.equal(result.controllerFullPath, undefined);
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, 'test.css');
		t.equal(result.staticFullPath, path.join(__dirname, 'test_www_root/public/test.css'));
		t.end();
	});
});

test('Auto resolve custom controller foo', t => {
	const router = new Router({ basePath: __dirname + '/test_www_root/', log });

	router.resolve('/foo', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, 'foo.js');
		t.equal(result.controllerFullPath, path.join(__dirname, 'test_www_root/controllers/foo.js'));
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Auto resolve custom controller bleh/blah', t => {
	const router = new Router({ basePath: __dirname + '/test_www_root/', log });

	router.resolve('/bleh/blah', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, 'bleh/blah.js');
		t.equal(result.controllerFullPath, path.join(__dirname, 'test_www_root/controllers/bleh/blah.js'));
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Fail gracefully when not given a path to resolve', t => {
	const router = new Router({ basePath: __dirname + '/test_www_root/', log });

	router.resolve({}, err => {
		t.equal(err instanceof Error, true);
		t.end();
	});
});

test('Custom routes', t => {
	const router = new Router({
		log,
		routes: [{
			regex: '^/flump.css$',
			controllerPath: 'some.js'
		}]
	});

	router.resolve('/flump.css', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, 'some.js');
		t.equal(result.controllerFullPath, false);
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Default options', t => {
	process.chdir(__dirname + '/test_www_root');
	(function () {
		const router = new Router();

		router.resolve('/test.css', (err, result) => {
			t.equal(result.staticPath, 'test.css');
			t.end();
		});
	})();
});

test('Custom controllersPath', t => {
	const router = new Router({
		basePath: __dirname + '/test_www_root',
		paths: {
			controller: {
				path: 'altControllers',
				exts: 'js'
			}
		},
		log
	});

	router.resolve('/bar', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, 'bar.js');
		t.equal(result.controllerFullPath, path.join(__dirname, 'test_www_root/altControllers/bar.js'));
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Custom staticsPath', t => {
	const router = new Router({
		basePath: __dirname + '/test_www_root',
		paths: {
			static: {
				path: 'public/templates',
				exts: false
			}
		},
		log
	});

	router.resolve('/default.tmpl', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, undefined);
		t.equal(result.controllerFullPath, undefined);
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, 'default.tmpl');
		t.equal(result.staticFullPath, path.join(__dirname, 'test_www_root/public/templates/default.tmpl'));
		t.end();
	});
});

test('Custom templatesPath', t => {
	const router = new Router({
		basePath: __dirname + '/test_www_root',
		paths: {
			template: {
				path: 'public/templates',
				exts: ['tmpl', 'tpl']
			},
			static: {
				path: 'public',
				exts: false
			}
		},
		log
	});

	router.resolve('/templates/default.tmpl', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, undefined);
		t.equal(result.controllerFullPath, undefined);
		t.equal(result.templatePath, undefined);
		t.equal(result.templateFullPath, undefined);
		t.equal(result.staticPath, 'templates/default.tmpl');
		t.equal(result.staticFullPath, path.join(__dirname, 'test_www_root/public/templates/default.tmpl'));
		t.end();
	});
});

test('Custom templateExts', t => {
	const router = new Router({
		basePath: __dirname + '/test_www_root',
		paths: {
			template: {
				path: 'public/templates',
				exts: 'rev'
			}
		},
		log
	});

	router.resolve('balseqvick', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, undefined);
		t.equal(result.controllerFullPath, undefined);
		t.equal(result.templatePath, 'balseqvick.rev');
		t.equal(result.templateFullPath, path.join(__dirname, 'test_www_root/public/templates/balseqvick.rev'));
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('Custom default route', t => {
	const router = new Router({
		basePath: __dirname + '/test_www_root',
		log,
		routes: [
			{
				regex: '^/$',
				controllerPath: 'foo.js',
				templatePath: 'balseqvick.tmpl'
			}
		]
	});

	router.resolve('/', (err, result) => {
		if (err) throw err;

		t.equal(result.controllerPath, 'foo.js');
		t.equal(result.controllerFullPath, path.join(__dirname, 'test_www_root/controllers/foo.js'));
		t.equal(result.templatePath, 'balseqvick.tmpl');
		t.equal(result.templateFullPath, path.join(__dirname, 'test_www_root/public/templates/balseqvick.tmpl'));
		t.equal(result.staticPath, undefined);
		t.equal(result.staticFullPath, undefined);
		t.end();
	});
});

test('SECURITY - Should not get files above the paths root', t => {
	const router = new Router({
		basePath: __dirname + '/test_www_root',
		log,
		paths: {
			grej: {
				path: 'public',
				exts: 'json'
			}
		}
	});

	router.resolve('/../../package', (err, result) => {
		if (err) throw err;

		t.equal(JSON.stringify(result), '{}');
		t.end();
	});
});

test('Without callback', t => {
	const router = new Router();

	router.resolve('/');
	t.end();
});
