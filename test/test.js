'use strict';

const	Router	= require(__dirname + '/../index.js'),
	path	= require('path'),
	test	= require('tape');

test('Resolve the default controller', function (t) {
	const	router	= new Router();

	router.resolve('/', function (err, result) {
		t.error(err);

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
	const	router	= new Router();

	router.resolve('/fasdf.txt', function (err, result) {
		t.error(err);

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
	const	router	= new Router();

	router.resolve('/fasdf.txt', function (err, result) {
		t.error(err);

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
	const	router	= new Router();

	router.resolve('/foo', function (err, result) {
		t.error(err);

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
	const	router	= new Router();

	router.resolve('/bleh/blah', function (err, result) {
		t.error(err);

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
	const	router	= new Router();

	router.resolve({}, function (err) {
		t.equal(err instanceof Error, true);
		t.end();
	});
});

test('Custom routes', function(t) {
	const	router	= new Router({
		'routes': [{
			'regex': '^/flump.css$',
			'controllerPath': 'default.js'
		}]
	});

	router.resolve('/flump.css', function (err, result) {
		t.equal(result.controllerPath,	'default.js');
		t.equal(result.controllerFullPath,	path.join(__dirname, '../node_modules/test_module/controllers/default.js'));
		t.equal(result.templatePath,	undefined);
		t.equal(result.templateFullPath,	undefined);
		t.equal(result.staticPath,	undefined);
		t.equal(result.staticFullPath,	undefined);
		t.end();
	});
});
