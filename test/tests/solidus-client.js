var assert = require('assert');
var Handlebars = require('handlebars');

var SolidusClient = require('../../index');
var View = require('../../lib/view');
var host = require('../config').host;

module.exports = function() {

describe('SolidusClient', function() {
  describe('.getResource', function() {
    it('returns the data value of the fetched resource', function(done) {
      var solidus_client = new SolidusClient({resources_options: {'.*': {query: {a: 1}}}});
      solidus_client.getResource(host + '/{a}', {a: 'page'}, function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res, {url: '/page?a=1'});
        done();
      });
    });

    it('with a bad resource', function(done) {
      var solidus_client = new SolidusClient();
      solidus_client.getResource(host + '/not-json', null, function(err, res) {
        assert.equal(err.message, 'Invalid JSON');
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
      var resources = {
        first:  host + '/page',
        second: host + '/not-json',
        third:  host + '/page?a=1',
        fourth: 'not a url',
      };

      solidus_client.getResources(resources, null, function(err, res) {
        assert.equal(err.second.message, 'Invalid JSON');
        assert.deepEqual(res, {
          first:  {url: '/page'},
          third:  {url: '/page?a=1'},
          fourth: undefined
        });
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
      var html = solidus_client.renderTemplate(template, context, template_options, function(err, html) {
        assert.ifError(err);
        assert.equal(html, '1 2 C e f');
        done();
      });
    });

    it('with error', function(done) {
      var template = Handlebars.compile('{{ badhelper badparam }}');
      var solidus_client = new SolidusClient();
      var html = solidus_client.renderTemplate(template, {}, null, function(err, html) {
        assert.equal(err.message, "Missing helper: 'badhelper'");
        done();
      });
    });
  });

  describe('.view', function() {
    it('adds a .render method to the view', function(done) {
      var view = {
        template: Handlebars.compile('test')
      };
      var solidus_client = new SolidusClient();
      view = solidus_client.view(view);
      view.render(function(err, html) {
        assert.ifError(err);
        assert.equal(html, 'test');
        done();
      });
    });
  });

  describe('.render', function() {
    var view = {
      resources: {test: host + '/page?a={a}'},
      template: Handlebars.compile('{{resources.test.url}}')
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
        solidus_client.render(view, function(err, html) {
          assert.ifError(err);
          assert.equal(html, '/page?a=');
          done();
        });
      });

      it('with params', function(done) {
        solidus_client.render(view, {a: 1}, function(err, html) {
          assert.ifError(err);
          assert.equal(html, '/page?a=1');
          done();
        });
      });
    });
  });
});

};
