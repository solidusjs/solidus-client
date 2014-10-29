var assert = require('assert');

var Resource = require('../../lib/resource');
var util = require('../../lib/util');
var host = require('../config').host;

module.exports = function() {

describe('Resource', function() {
  var random = Math.random;

  before(function() {
    Math.random = function() {return 1};
  })

  after(function() {
    Math.random = random;
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

  it('.requestType', function(done) {
    var resource;
    if (util.isNode) {
      resource = new Resource({url: 'http://solidus.com'});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', proxy: true});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', jsonp: true});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', with_credentials: true});
      assert.equal(resource.requestType(), 'client');
    } else if (util.isIE) {
      resource = new Resource({url: 'http://solidus.com'});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', proxy: true});
      assert.equal(resource.requestType(), 'proxy');

      resource = new Resource({url: 'http://solidus.com', jsonp: true});
      assert.equal(resource.requestType(), 'jsonp');

      resource = new Resource({url: 'http://solidus.com', with_credentials: true});
      assert.equal(resource.requestType(), 'jsonp');
    } else {
      resource = new Resource({url: 'http://solidus.com'});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', proxy: true});
      assert.equal(resource.requestType(), 'proxy');

      resource = new Resource({url: 'http://solidus.com', jsonp: true});
      assert.equal(resource.requestType(), 'jsonp');

      resource = new Resource({url: 'http://solidus.com', with_credentials: true});
      assert.equal(resource.requestType(), 'client');
    }
    done();
  });

  describe('.get', function() {
    it('fetches the resource and returns the body as an object', function(done) {
      var resource = new Resource(host + '/page');
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/page'});
        done();
      });
    });

    it('with bad fetched data', function(done) {
      var resource = new Resource(host + '/not-json');
      resource.get(function(err, res) {
        assert.equal(err.indexOf('Invalid JSON'), 0);
        assert(!res.data);
        done();
      });
    });

    it('with connection error', function(done) {
      // If this test fails, maybe you have something running on port 8888?
      var resource = new Resource('http://localhost:8888');
      resource.get(function(err, res) {
        assert(err);
        assert(!res.data);
        done();
      });
    });

    it('with invalid url', function(done) {
      var resource = new Resource('not a url');
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert(!res.data);
        done();
      });
    });

    it('with query strings', function(done) {
      var resource = new Resource(host + '/page?a=1&b=2');
      resource.options = {query: {b: '3', c: '4'}};
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/page?a=1&b=3&c=4'});
        done();
      });
    });

    it('escapes query strings', function(done) {
      // Only unescaped url query strings are escaped
      var resource = new Resource(host + '/page?a=,&b=%2C');
      // All query strings options are escaped
      resource.options = {query: {c: ',', d: '%2C'}};
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/page?a=%2C&b=%2C&c=%2C&d=%252C'});
        done();
      });
    });

    it('with headers', function(done) {
      var resource = new Resource(host + '/with-headers');
      resource.options = {headers: {'accept': 'application/json'}};
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/with-headers'});
        done();
      });
    });

    it('with basic authentication', function(done) {
      var resource = new Resource(host + '/with-basic-auth');
      resource.options = {auth: {user: 'KingRoland', pass: '12345'}};
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/with-basic-auth'});
        done();
      });
    });

    it('with credentials', function(done) {
      var resource = new Resource({url: host + '/page?a=1', query: {b: 2}, with_credentials: true});
      resource.get(function(err, res) {
        assert.equal(err, null);
        if (util.isIE) {
          assert.deepEqual(res.data, {url: '/page?a=1&b=2&callback=solidus_client_jsonp_callback_100000'});
        } else {
          assert.deepEqual(res.data, {url: '/page?a=1&b=2'});
        }
        done();
      });
    });

    it('with a gziped response', function(done) {
      var resource = new Resource(host + '/with-gzip');
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/with-gzip'});
        done();
      });
    });

    if (!util.isNode) {
      describe('with proxy', function() {
        it('with default solidus api route', function(done) {
          var resource = new Resource({url: 'http://solidus.com', proxy: true});
          resource.get(function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/api/resource.json?url=http%3A%2F%2Fsolidus.com'});
            done();
          });
        });

        it('with custom solidus api route', function(done) {
          var resource = new Resource({url: 'http://solidus.com', proxy: true, solidus_api_route: '/custom/route/'});
          resource.get(function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/custom/route/resource.json?url=http%3A%2F%2Fsolidus.com'});
            done();
          });
        });
      });

      it('with jsonp', function(done) {
        var resource = new Resource({url: 'http://localhost:8081/page?a=1', query: {b: 2}, jsonp: true});
        resource.get(function(err, res) {
          assert.equal(err, null);
          assert.deepEqual(res.data, {url: '/page?a=1&b=2&callback=solidus_client_jsonp_callback_100000'});
          done();
        });
      });
    }
  });

  describe('.post', function() {
    it('posts object body to the resource', function(done) {
      var resource = new Resource({url: host + '/with-post-object?a=1', query: {b: 2}});
      resource.post({id: 1, type: 'object'}, function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/with-post-object?a=1&b=2'});
        done();
      });
    });

    it('with string body', function(done) {
      var resource = new Resource({url: host + '/with-post-string?a=1', query: {b: 2}});
      resource.post('id=1&type=string', function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/with-post-string?a=1&b=2'});
        done();
      });
    });

    it('with empty body', function(done) {
      var resource = new Resource({url: host + '/with-post-empty?a=1', query: {b: 2}});
      resource.post(null, function(err, res) {
        assert.equal(err, null);
        assert.deepEqual(res.data, {url: '/with-post-empty?a=1&b=2'});
        done();
      });
    });

    if (!util.isNode) {
      describe('with proxy', function() {
        it('is not supported', function(done) {
          var resource = new Resource({url: host + '/with-post-object?a=1', query: {b: 2}, proxy: true});
          resource.post({id: 1, type: 'object'}, function(err, res) {
            assert.equal(err, 'Invalid proxy method: post');
            assert(!res.data);
            done();
          });
        });
      });

      describe('with jsonp', function() {
        it('with object body', function(done) {
          var resource = new Resource({url: host + '/with-post-object?a=1', query: {b: 2}, jsonp: true});
          resource.post({id: 1, type: 'object'}, function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/with-post-object?a=1&b=2&callback=solidus_client_jsonp_callback_100000&id=1&type=object'});
            done();
          });
        });

        it('with string body', function(done) {
          var resource = new Resource({url: host + '/with-post-string?a=1', query: {b: 2}, jsonp: true});
          resource.post('id=1&type=string', function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/with-post-string?a=1&b=2&callback=solidus_client_jsonp_callback_100000&id=1&type=string'});
            done();
          });
        });

        it('with empty body', function(done) {
          var resource = new Resource({url: host + '/with-post-empty?a=1', query: {b: 2}, jsonp: true});
          resource.post(null, function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/with-post-empty?a=1&b=2&callback=solidus_client_jsonp_callback_100000'});
            done();
          });
        });
      });
    }
  });
});

};
