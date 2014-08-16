var assert = require('assert');
var Handlebars = require('handlebars');
var nock = require('nock');

var SolidusClient = require('../index.js');

describe('SolidusClient', function() {
  describe('.getResource', function() {
    it('returns the data value of the fetched resource', function(done) {
      nock('http://solidus.com').get('/?a=1').reply(200, '{"test": "success!"}');

      var solidus_client = new SolidusClient({auth: {'.*': {query: {a: 1}}}});
      solidus_client.getResource('http://solidus.{a}', {a: 'com'}, function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res, {test: 'success!'});
        done();
      });
    });

    it('with a bad resource', function(done) {
      nock('http://solidus').get('/').reply(200, 'not JSON');

      var solidus_client = new SolidusClient();
      solidus_client.getResource('http://solidus', null, function(err, res) {
        assert.equal(err, 'Invalid JSON: Unexpected token o');
        assert(!res);
        done();
      });
    });

    it('with a bad url', function(done) {
      var solidus_client = new SolidusClient();
      solidus_client.getResource('not a url', null, function(err, res) {
        assert(!err);
        assert(!res);
        done();
      });
    });
  });

  describe('.getResources', function() {
    it('calls getResource for each resource', function(done) {
      nock('http://solidus').get('/1').reply(200, '{"test": "success!"}');
      nock('http://solidus').get('/2').reply(200, 'not JSON');
      nock('http://solidus').get('/3').reply(200, '{"test": "success!"}');

      var resources = {
        first: 'http://solidus/1',
        second: 'http://solidus/2',
        third: 'http://solidus/3',
        fourth: 'not a url',
      };

      var solidus_client = new SolidusClient();
      solidus_client.getResources(resources, null, function(err, res) {
        assert.deepEqual(err, {second: 'Invalid JSON: Unexpected token o'});
        assert.deepEqual(res, {first: {test: 'success!'}, third: {test: 'success!'}, fourth: undefined});
        done();
      });
    });

    it('with no resources', function(done) {
      var solidus_client = new SolidusClient();
      solidus_client.getResources({}, null, function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res, {});
        done();
      });
    });
  });

  describe('.renderTemplate', function() {
    it('returns the rendered template', function(done) {
      var template = Handlebars.compile('{{a}} {{> b}}');
      var partial = Handlebars.compile('{{b}} {{uppercase "c"}} {{lowercase "D"}} {{custom}}');
      var context = {a: 1, b: 2};
      var template_options = {
        helpers: {
          // Overrides handlebars-helper's helper
          lowercase: function() {
            return 'e';
          },
          custom: function() {
            return 'f'
          }
        },
        partials: {
          b: partial
        }
      };

      var solidus_client = new SolidusClient();
      var html = solidus_client.renderTemplate(template, context, template_options);
      assert.equal(html, '1 2 C e f');
      done();
    });
  });
});
