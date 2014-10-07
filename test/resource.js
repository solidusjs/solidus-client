var assert = require('assert');
var nock = require('nock');
var zlib = require('zlib');

var Resource = require('../lib/resource.js');

describe('Resource', function() {
  var isNode = Resource.isNode;
  var isIE   = Resource.isIE;

  beforeEach(function() {
    nock.disableNetConnect();
  });

  afterEach(function() {
    nock.enableNetConnect();
    Resource.isNode = isNode;
    Resource.isIE   = isIE;
  });

  describe('.constructor', function() {
    it('initializes url and options', function(done) {
      var resource = new Resource('http://solidus.com/page');
      assert.equal(resource.url, 'http://solidus.com/page');
      assert.deepEqual(resource.options, {});
      done();
    });

    it('with object', function(done) {
      var resource = new Resource({url: 'http://solidus.com/page', a: 1});
      assert.equal(resource.url, 'http://solidus.com/page');
      assert.deepEqual(resource.options, {a: 1});
      done();
    });

    it('with resources options', function(done) {
      var resources_options = {
        'http://solidus.ca/page': {a: 2, b: 2, c: 1},
        'http://solidus.com/p.*': {a: 3, b: 3, d: 1},
        'http://solidus.com/page': {a: 4, b: 4, e: 1},
        'http://solidus.com/status': {a: 5, b: 5, f: 1}
      };
      var resource = new Resource({url: 'http://solidus.com/page', a: 1}, resources_options);
      assert.equal(resource.url, 'http://solidus.com/page');
      assert.deepEqual(resource.options, {a: 1, b: 4, d: 1, e: 1});
      done();
    });

    it('with params', function(done) {
      var resources_options = {'.*': {query: {d: '{d}', e: '{c}'}}};
      var params = {a: 1, b: 2, d: 3, e: 4};
      var resource = new Resource('http://solidus.com/{a}?b={b}&c={c}', resources_options, params);
      assert.equal(resource.url, 'http://solidus.com/1?b=2&c=');
      assert.deepEqual(resource.options, {query: {d: '3', e: ''}});
      done();
    });

    it('with invalid url', function(done) {
      var resource = new Resource('not a url');
      assert.equal(resource.url, null);
      assert.deepEqual(resource.options, {});
      done();
    });
  });

  describe('.get', function() {
    it('fetches the resource and returns the body as an object', function(done) {
      var resource = new Resource('http://solidus.com');
      nock('http://solidus.com').get('/').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with bad fetched data', function(done) {
      var resource = new Resource('http://solidus.com');
      nock('http://solidus.com').get('/').reply(200, 'not JSON');
      resource.get(function(err, res) {
        assert.equal(err, "Invalid JSON: Unexpected token o");
        assert(!res.data);
        done();
      });
    });

    it('with connection error', function(done) {
      // Unfortunately nock doesn't simulate connection errors...
      // https://github.com/pgte/nock/issues/97
      var resource = new Resource('http://jiofdjgoifdjoigfd.com');
      resource.get(function(err, res) {
        assert(err);
        assert(!res.data);
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

    it('with query strings', function(done) {
      var resource = new Resource('http://solidus.com/page?a=1&b=2');
      resource.options = {query: {b: '3', c: '4'}};
      nock('http://solidus.com').get('/page?b=2&c=4&a=1').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('does not encode query strings', function(done) {
      var resource = new Resource('http://solidus.com/page?a=,&b=%2C');
      resource.options = {query: {c: ',', d: '%2C'}};
      nock('http://solidus.com').get('/page?c=,&d=%2C&a=,&b=%2C').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with headers', function(done) {
      var resource = new Resource('http://solidus.com');
      resource.options = {headers: {'Accept': 'application/json'}};
      nock('http://solidus.com').matchHeader('accept', 'application/json').get('/').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with basic authentication', function(done) {
      var resource = new Resource('http://solidus.com');
      resource.options = {auth: {user: 'KingRoland', pass: '12345'}};
      nock('http://solidus.com').matchHeader('authorization', 'Basic S2luZ1JvbGFuZDoxMjM0NQ==').get('/').reply(200, '{"test": "success!"}');
      resource.get(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, {test: 'success!'});
        done();
      });
    });

    it('with credentials and IE', function(done) {
      // Mocking a jsonp request here is hard, but we can at least test the code path :(
      Resource.isNode = false;
      Resource.isIE   = true;
      var resource = new Resource('http://solidus.com');
      resource.options = {with_credentials: true};
      try {
        resource.get();
        assert(false);
      } catch (err) {
        assert.equal(err.message, 'document is not defined');
        done();
      }
    });

    it('with a gziped response', function(done) {
      zlib.gzip('{"test": "success!"}', function(err, response) {
        var resource = new Resource('http://solidus.com');
        nock('http://solidus.com').matchHeader('accept-encoding', 'gzip, deflate').get('/').reply(200, [response], {'Content-Encoding': 'gzip'});
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });
    });

    it('with a deflated response', function(done) {
      zlib.deflate('{"test": "success!"}', function(err, response) {
        var resource = new Resource('http://solidus.com');
        nock('http://solidus.com').matchHeader('accept-encoding', 'gzip, deflate').get('/').reply(200, [response], {'Content-Encoding': 'deflate'});
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });
    });

    describe('with proxy', function() {
      it('with Node', function(done) {
        Resource.isNode = true;
        var resource = new Resource({url: 'http://solidus.com', proxy: true});
        nock('http://solidus.com').get('/').reply(200, '{"test": "success!"}');
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });

      it('with browser', function(done) {
        Resource.isNode = false;
        var resource = new Resource({url: 'http://solidus.com', proxy: true});
        nock('http://localhost').get('/api/resource.json?url=http%3A%2F%2Fsolidus.com').reply(200, '{"test": "success!"}');
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });

      it('with custom solidus api route', function(done) {
        Resource.isNode = false;
        var resource = new Resource({url: 'http://solidus.com', proxy: true, solidus_api_route: '/custom/route/'});
        nock('http://localhost').get('/custom/route/resource.json?url=http%3A%2F%2Fsolidus.com').reply(200, '{"test": "success!"}');
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });
    });

    describe('with jsonp', function() {
      var resource = new Resource({url: 'http://solidus.com', jsonp: true});

      it('with Node', function(done) {
        Resource.isNode = true;
        nock('http://solidus.com').get('/').reply(200, '{"test": "success!"}');
        resource.get(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.data, {test: 'success!'});
          done();
        });
      });

      it('with browser', function(done) {
        // Mocking a jsonp request here is hard, but we can at least test the code path :(
        Resource.isNode = false;
        Resource.isIE   = false;
        try {
          resource.get();
          assert(false);
        } catch (err) {
          assert.equal(err.message, 'document is not defined');
          done();
        }
      });
    });
  });

  describe('.post', function() {
    it('posts to the resource', function(done) {
      var body   = {id: 1, email: 'test@sparkart.com'};
      var result = {status: 'ok', customer: body};
      nock('http://solidus.com').post('/', body).reply(200, JSON.stringify(result));

      var resource = new Resource('http://solidus.com');
      resource.post(body, function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.data, result);
        done();
      });
    });

    it('is not supported with proxy', function(done) {
      Resource.isNode = false;
      var resource = new Resource({url: 'http://solidus.com', proxy: true});
      resource.post(null, function(err, res) {
        assert.equal(err, 'Invalid proxy method: post');
        assert(!res.data);
        done();
      });
    });

    it('with jsonp', function(done) {
      // Mocking a jsonp request here is hard, but we can at least test the code path :(
      Resource.isNode = false;
      Resource.isIE   = false;
      var resource = new Resource({url: 'http://solidus.com', jsonp: true});
      try {
        resource.post();
        assert(false);
      } catch (err) {
        assert.equal(err.message, 'document is not defined');
        done();
      }
    });
  });
});
