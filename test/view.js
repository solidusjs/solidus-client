var assert = require('assert');
var Handlebars = require('handlebars');
var nock = require('nock');

var SolidusClient = require('../index.js');

describe('View', function() {
  var solidus_client = new SolidusClient();
  var resources = {test: 'http://solidus.{a}'};
  var preprocessor = function(context) {
    context.test = context.resources.test.test;
    return context;
  };
  var template = Handlebars.compile('{{test}} {{custom}}');
  var template_options = {helpers: {custom: function() {return 'helped';}}};
  var params = {a: 'com'}

  beforeEach(function() {
    nock.disableNetConnect();
    nock('http://solidus.com').get('/').reply(200, '{"test": "success!"}');
  });

  afterEach(function() {
    nock.enableNetConnect();
  });

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
          assert.equal(html, 'success! helped');
          assert.deepEqual(solidus_client.context, {resources:{test:{test:'success!'}},test:'success!'});
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
          assert.equal(html, 'success! helped');
          assert.deepEqual(solidus_client.context, {resources:{test:{test:'success!'}},test:'success!'});
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
          context.test = resources.test.test;
          callback(context);
        });
      })
      .end(function(html) {
        assert.equal(html, 'works! success!');
        assert.deepEqual(solidus_client.context, {resources:{},test:'success!'});
        done();
      });
  });
});
