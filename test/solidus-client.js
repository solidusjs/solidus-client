var assert = require('assert');
var Handlebars = require('handlebars');
var nock = require('nock');

var SolidusClient = require('../index');
var View = require('../lib/view');

describe('SolidusClient', function() {
  beforeEach(function() {
    nock.disableNetConnect();
  });

  afterEach(function() {
    nock.enableNetConnect();
  });

  describe('.getResource', function() {
    it('returns the data value of the fetched resource', function(done) {
      nock('http://solidus.com').get('/?a=1').reply(200, '{"test": "success!"}');

      var solidus_client = new SolidusClient({resources_options: {'.*': {query: {a: 1}}}});
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
    var solidus_client = new SolidusClient();

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

      solidus_client.getResources(resources, null, function(err, res) {
        assert.deepEqual(err, {second: 'Invalid JSON: Unexpected token o'});
        assert.deepEqual(res, {first: {test: 'success!'}, third: {test: 'success!'}, fourth: undefined});
        done();
      });
    });

    it('with no resources', function(done) {
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

  describe('.view', function() {
    it('adds a .render method to the view', function(done) {
      var view = {
        template: Handlebars.compile('test')
      };
      var solidus_client = new SolidusClient();
      view = solidus_client.view(view);
      view.render(function(html) {
        assert.equal(html, 'test');
        done();
      });
    });
  });

  describe('.render', function() {
    var view = {
      resources: {test: 'http://solidus.{a}'},
      template: Handlebars.compile('{{resources.test.test}}')
    };
    var solidus_client = new SolidusClient();

    describe('without a callback', function() {
      it('returns a View', function(done) {
        var object = solidus_client.render(view);
        assert(object instanceof View);
        assert.equal(object.template, view.template);
        assert.deepEqual(object.resources, view.resources);
        assert.deepEqual(object.resources_params, {});
        done();
      });

      it('with params', function(done) {
        var object = solidus_client.render(view, {a: 'com'});
        assert(object instanceof View);
        assert.equal(object.template, view.template);
        assert.deepEqual(object.resources, view.resources);
        assert.deepEqual(object.resources_params, {a: 'com'});
        done();
      });
    });

    describe('with a callback', function() {
      it('renders the view', function(done) {
        nock('http://solidus.').get('/').reply(200, '{"test": "success!"}');
        solidus_client.render(view, function(html) {
          assert.equal(html, 'success!');
          done();
        });
      });

      it('with params', function(done) {
        nock('http://solidus.com').get('/').reply(200, '{"test": "success!"}');
        solidus_client.render(view, {a: 'com'}, function(html) {
          assert.equal(html, 'success!');
          done();
        });
      });
    });
  });
});
