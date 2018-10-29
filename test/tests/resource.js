var assert = require('assert');

var Resource = require('../../lib/resource');
var util = require('../../lib/util');
var host = require('../config').host;

module.exports = function() {

describe('Resource', function() {
  describe('.constructor', function() {
    it('initializes url, dynamic and options', function(done) {
      var resource = new Resource('http://solidus.com/page');
      assert.equal(resource.url, 'http://solidus.com/page');
      assert(!resource.dynamic);
      assert.deepEqual(resource.expanded_params, []);
      assert.deepEqual(resource.options, {timeout: 20000});
      done();
    });

    it('with object', function(done) {
      var resource = new Resource({url: 'http://solidus.com/page', timeout: 10000, a: 1});
      assert.equal(resource.url, 'http://solidus.com/page');
      assert(!resource.dynamic);
      assert.deepEqual(resource.expanded_params, []);
      assert.deepEqual(resource.options, {timeout: 10000, a: 1});
      done();
    });

    it('with resources options', function(done) {
      var resources_options = {
        'http://solidus.ca/page': {a: 2, b: 2, c: 1},
        'http://solidus.com/p.*': {a: 3, b: 3, d: 1, g: {h: 1, i: 2}},
        'http://solidus.com/page': {timeout: 10000, a: 4, b: 4, e: 1, g: {h: 2}},
        'http://solidus.com/status': {a: 5, b: 5, f: 1}
      };
      var resource = new Resource({url: 'http://solidus.com/page', a: 1, g: {j: 3}}, resources_options);
      assert.equal(resource.url, 'http://solidus.com/page');
      assert(!resource.dynamic);
      assert.deepEqual(resource.expanded_params, []);
      assert.deepEqual(resource.options, {timeout: 10000, a: 1, b: 4, d: 1, e: 1, g: {h: 2, i: 2, j: 3}});
      done();
    });

    it('with params', function(done) {
      var resources_options = {'.*': {query: {d: '{d}', e: '{c}'}}};
      var params = {a: 1, b: 2, d: 3, e: 4};
      var resource = new Resource('http://solidus.com/{a}?b={b}&c={c}', resources_options, params);
      assert.equal(resource.url, 'http://solidus.com/1?b=2&c=');
      assert(resource.dynamic);
      assert.deepEqual(resource.expanded_params, ['a', 'b', 'd']);
      assert.deepEqual(resource.options, {timeout: 20000, query: {d: '3', e: ''}});
      done();
    });

    it('with static url and dynamic query', function(done) {
      var resources_options = {'.*': {query: {a: '{a}'}}};
      var params = {a: 'a'};
      var resource = new Resource('http://solidus.com/page', resources_options, params);
      assert.equal(resource.url, 'http://solidus.com/page');
      assert(resource.dynamic);
      assert.deepEqual(resource.expanded_params, ['a']);
      assert.deepEqual(resource.options, {timeout: 20000, query: {a: 'a'}});
      done();
    });

    it('with invalid url', function(done) {
      var resource = new Resource('not a url');
      assert.equal(resource.url, null);
      assert(!resource.dynamic);
      assert.deepEqual(resource.expanded_params, []);
      assert.deepEqual(resource.options, {timeout: 20000});
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
    } else if (util.supportsCORS) {
      resource = new Resource({url: 'http://solidus.com'});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', proxy: true});
      assert.equal(resource.requestType(), 'proxy');

      resource = new Resource({url: 'http://solidus.com', jsonp: true});
      assert.equal(resource.requestType(), 'jsonp');

      resource = new Resource({url: 'http://solidus.com', with_credentials: true});
      assert.equal(resource.requestType(), 'client');
    } else {
      resource = new Resource({url: 'http://solidus.com'});
      assert.equal(resource.requestType(), 'client');

      resource = new Resource({url: 'http://solidus.com', proxy: true});
      assert.equal(resource.requestType(), 'proxy');

      resource = new Resource({url: 'http://solidus.com', jsonp: true});
      assert.equal(resource.requestType(), 'jsonp');

      resource = new Resource({url: 'http://solidus.com', with_credentials: true});
      assert.equal(resource.requestType(), 'jsonp');
    }
    done();
  });

  describe('.get', function() {
    it('fetches the resource and returns the body as an object', function(done) {
      var resource = new Resource(host + '/page');
      resource.get(function(err, res) {
        assert.equal(err, null);
        assert.equal(res.response.status, 200);
        assert.deepEqual(res.data, {url: '/page'});
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

    it('with missing required params', function(done) {
      var resources_options = {'.*': {query: {g: '{g}', h: '{h}', i: '{i}'}, required_params: ['a', 'b', 'd', 'e', 'g', 'h']}};
      var params = {a: 1, d: 2, g: 3};
      var resource = new Resource('http://solidus.com/{a}/{b}/{c}?d={d}&e={e}&f={f}', resources_options, params);
      resource.get(function(err, res) {
        assert.equal(err.message, 'Missing required params: b, e, h');
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

    it('with invalid HTTP status', function(done) {
      var resource = new Resource(host + '/does-not-exist');
      resource.get(function(err, res) {
        assert.equal(err.message, 'Not Found');
        assert.equal(err.status, 404);
        assert(!res.data);
        done();
      });
    });

    it('with invalid JSON', function(done) {
      var resource = new Resource(host + '/not-json');
      resource.get(function(err, res) {
        assert.equal(err.message, 'Invalid JSON');
        assert(err.error);
        assert(!res.data);
        done();
      });
    });

    it('with 200 status and general error in response message', function(done) {
      var resource = new Resource(host + '/200-error');
      resource.get(function(err, res) {
        assert.equal(err.message, 'Invalid data status');
        assert.equal(err.status, 500);
        assert.equal(res.response.status, 200);
        assert.deepEqual(res.data, {status: 'error', error: 'Something went wrong'});
        done();
      });
    });

    it('with 200 status and "not found" error in response message', function(done) {
      var resource = new Resource(host + '/200-error-not-found');
      resource.get(function(err, res) {
        assert.equal(err.message, 'Invalid data status');
        assert.equal(err.status, 404);
        assert.equal(res.response.status, 200);
        assert.deepEqual(res.data, {status: 'error', error: 'Item Not Found'});
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

    describe('with nested query strings', function() {
      var resource;

      beforeEach(function() {
        resource = new Resource(host + '/page');
        resource.options = {query: {a: 1, b: '2', c: [3, '4'], d: {e: 5, f: [6, 7]}}};
      });

      it('with default options', function(done) {
        resource.get(function(err, res) {
          assert.equal(err, null);
          assert.deepEqual(res.data, {url: '/page?a=1&b=2&c%5B0%5D=3&c%5B1%5D=4&d%5Be%5D=5&d%5Bf%5D%5B0%5D=6&d%5Bf%5D%5B1%5D=7'});
          done();
        });
      });

      it('with json objectFormat', function(done) {
        resource.options.query_options = {objectFormat: 'json'};
        resource.get(function(err, res) {
          assert.equal(err, null);
          assert.deepEqual(res.data, {url: '/page?a=1&b=2&c%5B0%5D=3&c%5B1%5D=4&d=%7B%22e%22%3A5%2C%22f%22%3A%5B6%2C7%5D%7D'});
          done();
        });
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
        if (util.isNode || util.supportsCORS) {
          assert.deepEqual(res.data, {url: '/page?a=1&b=2'});
        } else {
          assert.deepEqual(res.data, {url: '/page?a=1&b=2&callback=solidus_client_jsonp_callback'});
        }
        done();
      });
    });

    it('with timeout', function(done) {
      var resource = new Resource({url: host + '/with-delay', timeout: 1});
      resource.get(function(err, res) {
        assert.equal(err.message, 'Timeout of 1ms exceeded');
        assert(!res.data)
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
          var resource = new Resource({url: 'http://solidus.com', query: {a: 1}, proxy: true});
          resource.get(function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/api/resource.json?url=http%3A%2F%2Fsolidus.com%3Fa%3D1'});
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

        it('with timeout', function(done) {
          var resource = new Resource({url: 'http://solidus.com/with-delay', proxy: true, timeout: 1});
          resource.get(function(err, res) {
            assert.equal(err.message, 'Timeout of 1ms exceeded');
            assert(!res.data)
            done();
          });
        });
      });

      describe('with jsonp', function() {
        it('with successful response', function(done) {
          var resource = new Resource({url: host + '/page?a=1', query: {b: 2}, jsonp: true});
          resource.get(function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/page?a=1&b=2&callback=solidus_client_jsonp_callback'});
            done();
          });
        });

        it('with timeout', function(done) {
          var called;
          var resource = new Resource({url: host + '/with-delay', jsonp: true, timeout: 1});
          resource.get(function(err, res) {
            assert.equal(err.message, 'Timeout of 1ms exceeded');
            assert(!res.data);
            assert(!called);
            called = true;

            // Highjack the jsonp callback, to end the test when the real request come back
            var oldCallback = window[err.callbackName];
            window[err.callbackName] = function(data) {
              assert.deepEqual(data, {url: '/with-delay?callback=solidus_client_jsonp_callback'});
              oldCallback(data);
              assert(!window[err.callbackName]);
              done();
            }
          });
        });

        it('with connection error', function(done) {
          // If this test fails, maybe you have something running on port 8888?
          var called;
          var resource = new Resource({url: 'http://localhost:8888', jsonp: true, timeout: 1});
          resource.get(function(err, res) {
            assert.equal(err.message, 'Timeout of 1ms exceeded');
            assert(!res.data);
            assert(!called);
            called = true;

            // The real request will never come back
            window[err.callbackName]({});
            done();
          });
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
            assert.deepEqual(res.data, {url: '/with-post-object?a=1&b=2&callback=solidus_client_jsonp_callback&id=1&type=object'});
            done();
          });
        });

        it('with string body', function(done) {
          var resource = new Resource({url: host + '/with-post-string?a=1', query: {b: 2}, jsonp: true});
          resource.post('id=1&type=string', function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/with-post-string?a=1&b=2&callback=solidus_client_jsonp_callback&id=1&type=string'});
            done();
          });
        });

        it('with empty body', function(done) {
          var resource = new Resource({url: host + '/with-post-empty?a=1', query: {b: 2}, jsonp: true});
          resource.post(null, function(err, res) {
            assert.equal(err, null);
            assert.deepEqual(res.data, {url: '/with-post-empty?a=1&b=2&callback=solidus_client_jsonp_callback'});
            done();
          });
        });
      });
    }
  });
});

};
