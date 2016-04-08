'use strict';

const assert = require('assert'),
      path   = require('path'),
      log    = require('winston');

log.remove(log.transports.Console);

describe('Default settings', function() {
	const router = require('../index.js')();

	it('Resolve the default controller', function(done) {
		const result = router.resolve('/');

		assert.deepEqual(result.controllerName, 'default');
		assert.deepEqual(result.controllerFullPath, path.join(__dirname, '../node_modules/test_module/controllers/default.js'));
		assert.deepEqual(result.staticFilename, undefined);
		assert.deepEqual(result.staticFullPath, undefined);
		done();
	});

	it('Resolve fail string to 404', function(done) {
		const result = router.resolve('/fasdf.txt');

		assert.deepEqual(result.controllerName, '404');
		assert.deepEqual(result.controllerFullPath, path.join(__dirname, '../node_modules/test_module/controllers/404.js'));
		assert.deepEqual(result.staticFilename, undefined);
		assert.deepEqual(result.staticFullPath, undefined);
		done();
	});

	it('Resolve static file', function(done) {
		const result = router.resolve('/test.css');

		assert.deepEqual(result.controllerName, undefined);
		assert.deepEqual(result.controllerFullPath, undefined);
		assert.deepEqual(result.staticFilename, '/test.css');
		assert.deepEqual(result.staticFullPath, path.join(__dirname, '../node_modules/test_module/public/test.css'));
		done();
	});

	it('Auto resolve custom controller foo', function(done) {
		const result = router.resolve('/foo');

		assert.deepEqual(result.controllerName, 'foo');
		assert.deepEqual(result.controllerFullPath, path.join(__dirname, '../node_modules/test_module/controllers/foo.js'));
		assert.deepEqual(result.staticFilename, undefined);
		assert.deepEqual(result.staticFullPath, undefined);
		done();
	});

	it('Auto resolve custom controller bleh/blah', function(done) {
		const result = router.resolve('/bleh/blah');

		assert.deepEqual(result.controllerName, 'bleh/blah');
		assert.deepEqual(result.controllerFullPath, path.join(__dirname, '../node_modules/test_module/controllers/bleh/blah.js'));
		assert.deepEqual(result.staticFilename, undefined);
		assert.deepEqual(result.staticFullPath, undefined);
		done();
	});

	it('Fail gracefully when not given a path to resolve', function(done) {
		const result = router.resolve({});

		assert.deepEqual(result.controllerName, '500');
		assert.deepEqual(result.controllerFullPath, path.join(__dirname, '../node_modules/test_module/controllers/500.js'));
		assert.deepEqual(result.staticFilename, undefined);
		assert.deepEqual(result.staticFullPath, undefined);

		done();
	});
});

describe('Custom routes', function() {
	const router = require('../index.js')({
		'customRoutes': [{
			'regex': '^/flump.css$',
			'controllerName': 'default'
		}]
	});

	it('Resolve custom route in favor of static files', function(done) {
		const result = router.resolve('/flump.css');

		assert.deepEqual(result.controllerName, 'default');
		assert.deepEqual(result.controllerFullPath, path.join(__dirname, '../node_modules/test_module/controllers/default.js'));
		assert.deepEqual(result.staticFilename, undefined);
		assert.deepEqual(result.staticFullPath, undefined);
		done();
	});
});
