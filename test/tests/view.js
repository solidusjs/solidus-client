var assert = require('assert');
var Handlebars = require('handlebars');

var SolidusClient = require('../../index');
var host = require('../config').host;

module.exports = function() {

describe('View', function() {
  var solidus_client = new SolidusClient();
  var resources = {test: host + '/page?a={a}'};
  var preprocessor = function(context) {
    context.test = context.resources.test.url;
    return context;
  };
  var template = Handlebars.compile('{{test}} {{custom}}');
  var template_options = {helpers: {custom: function() {return 'helped';}}};
  var params = {a: 1}

  describe('with view object', function() {
    it('with all options', function(done) {
      var view = {
        resources: resources,
        params: params,
        preprocessor: preprocessor,
        template: template,
        template_options: template_options
      };

      var solidus_client = new SolidusClient();
      solidus_client
        .render(view)
        .end(function(html) {
          assert.equal(html, '/page?a=1 helped');
          assert.deepEqual(solidus_client.context, {resources:{test:{url:'/page?a=1'}},test:'/page?a=1'});
          done();
        });
    });

    it('with only template', function(done) {
      var solidus_client = new SolidusClient();
      solidus_client
        .render({template: Handlebars.compile('works! {{resources.test}}')})
        .end(function(html) {
          assert.equal(html, 'works! ');
          assert.deepEqual(solidus_client.context, {resources:{}});
          done();
        });
    });
  });

  describe('with methods chain', function() {
    it('with all options', function(done) {
      var solidus_client = new SolidusClient();
      solidus_client
        .render(template)
        .params(params)
        .templateOptions(template_options)
        .get(resources)
        .then(preprocessor)
        .end(function(html) {
          assert.equal(html, '/page?a=1 helped');
          assert.deepEqual(solidus_client.context, {resources:{test:{url:'/page?a=1'}},test:'/page?a=1'});
          done();
        });
    });

    it('with only template', function(done) {
      var solidus_client = new SolidusClient();
      solidus_client
        .render(Handlebars.compile('works! {{resources.test}}'))
        .end(function(html) {
          assert.equal(html, 'works! ');
          assert.deepEqual(solidus_client.context, {resources:{}});
          done();
        });
    });
  });

  it('with async preprocessor', function(done) {
    var solidus_client = new SolidusClient();
    solidus_client
      .render(Handlebars.compile('works! {{test}}'))
      .then(function(context, callback) {
        solidus_client.getResources(resources, params, function(err, resources) {
          assert.ifError(err);
          context.test = resources.test.url;
          callback(context);
        });
      })
      .end(function(html) {
        assert.equal(html, 'works! /page?a=1');
        assert.deepEqual(solidus_client.context, {resources:{},test:'/page?a=1'});
        done();
      });
  });
});

};
