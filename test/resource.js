var assert = require('assert');
var nock = require('nock');
var zlib = require('zlib');

var Resource = require('../lib/resource.js');

describe('Resource', function() {
  describe('.constructor', function() {
    it('initializes url_template, url and options', function(done) {
      var resource = new Resource('http://solidus/{id}', {a: 1});
      assert.equal(resource.url_template, 'http://solidus/{id}');
      assert.equal(resource.url, 'http://solidus/{id}');
      assert.deepEqual(resource.options, {a: 1});
      done();
    });

    it('with invalid url', function(done) {
      var resource = new Resource('not a url');
      assert.equal(resource.url_template, 'not a url');
      assert.equal(resource.url, null);
      assert.deepEqual(resource.options, {});
      done();
    });
  });

  describe('.buildUrlAndOptions', function() {
    it('expands the url with the params', function(done) {
      var resource = new Resource('http://solidus.{a}/{b}?c={c}');
      resource.buildUrlAndOptions({a: 'com', b: 'page', d: 'not used'});
      assert.equal(resource.url, 'http://solidus.com/page?c=');
      done();
    });

    it('finds the options by matching auths', function(done) {
      var resource = new Resource('http://solidus.{a}/page');
      resource.buildUrlAndOptions({a: 'com'}, {
        'http://solidus.ca/page': {a: 1},
        'http://solidus.com/p.*': {b: 1},
        'http://solidus.com/page': {c: 1},
        'http://solidus.com/status': {d: 1}
      });
      assert.equal(resource.url, 'http://solidus.com/page');
      assert.deepEqual(resource.options, {b: 1, c: 1});
      done();
    });
  });

  describe('.get', function() {
    it('fetches the resource and returns the body as an object', function(done) {
      var resource = new Resource('http://solidus');
      nock('http://solidus').get('/').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with bad fetched data', function(done) {
      var resource = new Resource('http://solidus');
      nock('http://solidus').get('/').reply(200, 'not JSON');
      resource.get(function(err, res) {
        assert.equal(err, "Invalid JSON: Unexpected token o");
        assert(!res);
        done();
      });
    });

    it('with connection error', function(done) {
      // Unfortunately nock doesn't simulate connection errors...
      // https://github.com/pgte/nock/issues/97
      var resource = new Resource('http://jiofdjgoifdjoigfd.com');
      resource.get(function(err, res) {
        assert(err);
        assert(!res);
        done();
      });
    });

    it('with invalid url', function(done) {
      var resource = new Resource('not a url');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert(!res.data);
        done();
      });
    });

    it('with no url', function(done) {
      var resource = new Resource(null);
      resource.get(function(err, res) {
        assert.ifError(err);
        assert(!res.data);
        done();
      });
    });

    it('with query strings', function(done) {
      var resource = new Resource('http://solidus/page?a=1&b=2');
      resource.options = {query: {b: '3', c: '4'}};
      nock('http://solidus').get('/page?b=2&c=4&a=1').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with headers', function(done) {
      var resource = new Resource('http://solidus');
      resource.options = {headers: {'Accept': 'application/json'}};
      nock('http://solidus').matchHeader('accept', 'application/json').get('/').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with basic authentication', function(done) {
      var resource = new Resource('http://solidus');
      resource.options = {auth: {user: 'KingRoland', pass: '12345'}};
      nock('http://solidus').matchHeader('authorization', 'Basic S2luZ1JvbGFuZDoxMjM0NQ==').get('/').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with a gziped response', function(done) {
      zlib.gzip('{"test": "success!"}', function(err, response) {
        var resource = new Resource('http://solidus');
        nock('http://solidus').matchHeader('accept-encoding', 'gzip, deflate').get('/').reply(200, [response], {'Content-Encoding': 'gzip'});
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });
    });

    it('with a deflated response', function(done) {
      zlib.deflate('{"test": "success!"}', function(err, response) {
        var resource = new Resource('http://solidus');
        nock('http://solidus').matchHeader('accept-encoding', 'gzip, deflate').get('/').reply(200, [response], {'Content-Encoding': 'deflate'});
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });
    });
  });
});
