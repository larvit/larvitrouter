'use strict';

const	Router	= require(__dirname + '/../index.js'),
	path	= require('path'),
	test	= require('tape'),
	log	= require('winston');

// Set up winston
log.remove(log.transports.Console);

test('Resolve the default controller', function (t) {
	const	router	= new Router({'basePath': __dirname + '/../'});

	router.resolve('/', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	'default.js');
		t.equal(result.controllerFullPath,	path.join(__dirname, '../node_modules/test_module/controllers/default.js'));
		t.equal(result.templatePath,	'default.tmpl');
		t.equal(result.templateFullPath,	path.join(__dirname, '../node_modules/test_module/public/templates/default.tmpl'));
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Resolve nothing for URL with no matches', function (t) {
	const	router	= new Router({'basePath': __dirname + '/../'});

	router.resolve('/fasdf.txt', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	undefined);
		t.equal(result.controllerFullPath,	undefined);
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Resolve static file', function (t) {
	const	router	= new Router({'basePath': __dirname + '/../'});

	router.resolve('/test.css', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	undefined);
		t.equal(result.controllerFullPath,	undefined);
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	'test.css');
		t.equal(result.staticFullPath,	path.join(__dirname, '../node_modules/test_module/public/test.css'));
		t.end();
	});
});

test('Auto resolve custom controller foo', function(t) {
	const	router	= new Router({'basePath': __dirname + '/../'});

	router.resolve('/foo', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	'foo.js');
		t.equal(result.controllerFullPath,	path.join(__dirname, '../node_modules/test_module/controllers/foo.js'));
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Auto resolve custom controller bleh/blah', function(t) {
	const	router	= new Router({'basePath': __dirname + '/../'});

	router.resolve('/bleh/blah', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	'bleh/blah.js');
		t.equal(result.controllerFullPath,	path.join(__dirname, '../node_modules/test_module/controllers/bleh/blah.js'));
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Fail gracefully when not given a path to resolve', function(t) {
	const	router	= new Router({'basePath': __dirname + '/../'});

	router.resolve({}, function (err) {
		t.equal(err instanceof Error, true);
		t.end();
	});
});

test('Custom routes', function(t) {
	const	router	= new Router({
		'routes': [{
			'regex': '^/flump.css$',
			'controllerPath': 'some.js'
		}]
	});

	router.resolve('/flump.css', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	'some.js');
		t.equal(result.controllerFullPath,	undefined);
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Default options', function (t) {
	process.chdir(__dirname + '/../test_module');
	(function () {
		const	router	= new Router();

		router.resolve('/test.css', function (err, result) {
			t.equal(result.staticPath, 'test.css');
			t.end();
		});
	})();
});

test('Custom controllersPath', function (t) {
	const	router	= new Router({
		'basePath':	__dirname + '/../test_module',
		'controllersPath':	'altControllers'
	});

	router.resolve('/bar', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	'bar.js');
		t.equal(result.controllerFullPath,	path.join(__dirname, '../test_module/altControllers/bar.js'));
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Custom staticsPath', function (t) {
	const	router	= new Router({
		'basePath':	__dirname + '/../test_module',
		'staticsPath':	'public/templates'
	});

	router.resolve('/default.tmpl', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	undefined);
		t.equal(result.controllerFullPath,	undefined);
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	'default.tmpl');
		t.equal(result.staticFullPath,	path.join(__dirname, '../test_module/public/templates/default.tmpl'));
		t.end();
	});
});

test('Custom templatesPath', function (t) {
	const	router	= new Router({
		'basePath':	__dirname + '/../test_module',
		'templatesPath':	'public'
	});

	router.resolve('/templates/default.tmpl', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	undefined);
		t.equal(result.controllerFullPath,	undefined);
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	'templates/default.tmpl');
		t.equal(result.staticFullPath,	path.join(__dirname, '../test_module/public/templates/default.tmpl'));
		t.end();
	});
});

test('Custom templateExts', function (t) {
	const	router	= new Router({
		'basePath':	__dirname + '/../test_module',
		'templateExts':	'rev'
	});

	router.resolve('balseqvick', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	undefined);
		t.equal(result.controllerFullPath,	undefined);
		t.equal(result.templatePath,	'balseqvick.rev');
		t.equal(result.templateFullPath,	path.join(__dirname, '../test_module/public/templates/balseqvick.rev'));
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Custom default route', function (t) {
	const	router	= new Router({
		'basePath':	__dirname + '/../test_module',
		'routes':	[
			{
				'regex':	'^/$',
				'controllerPath':	'foo.js',
				'templatePath':	'balseqvick.tmpl'
			}
		]
	});

	router.resolve('/', function (err, result) {
		if (err) throw err;

		t.equal(result.controllerPath,	'foo.js');
		t.equal(result.controllerFullPath,	path.join(__dirname, '../test_module/controllers/foo.js'));
		t.equal(result.templatePath,	'balseqvick.tmpl');
		t.equal(result.templateFullPath,	path.join(__dirname, '../test_module/public/templates/balseqvick.tmpl'));
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});

test('Without callback', function (t) {
	const	router	= new Router();

	router.resolve('/');
	t.end();
});
