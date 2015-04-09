var assert = require('assert');
var Handlebars = require('handlebars');

var SolidusClient = require('../../index');
var util = require('../../lib/util');
var host = require('../config').host;

var View = require('../../lib/view');
View.preprocessor_timeout = 100;

module.exports = function() {

describe('View', function() {
  var solidus_client;
  var view;

  beforeEach(function() {
    solidus_client = new SolidusClient();
    view = {
      resources: {test: host + '/page?a={a}'},
      params: {a: 1},
      preprocessor: function(context) {
        context.test = context.resources.test.url;
        return context;
      },
      template: Handlebars.compile('{{test}} {{custom}}'),
      template_options: {helpers: {custom: function() {return 'helped';}}}
    };
  });

  describe('with view object', function() {
    it('with all options', function(done) {
      solidus_client
        .render(view)
        .end(function(err, html) {
          assert.ifError(err);
          assert.equal(html, '/page?a=1 helped');
          assert.deepEqual(solidus_client.context, {resources:{test:{url:'/page?a=1'}},test:'/page?a=1'});
          done();
        });
    });

    it('with only template', function(done) {
      solidus_client
        .render({template: Handlebars.compile('works! {{resources.test}}')})
        .end(function(err, html) {
          assert.ifError(err);
          assert.equal(html, 'works! ');
          assert.deepEqual(solidus_client.context, {resources:{}});
          done();
        });
    });
  });

  describe('with methods chain', function() {
    it('with all options', function(done) {
      solidus_client
        .render(view.template)
        .params(view.params)
        .templateOptions(view.template_options)
        .get(view.resources)
        .then(view.preprocessor)
        .end(function(err, html) {
          assert.ifError(err);
          assert.equal(html, '/page?a=1 helped');
          assert.deepEqual(solidus_client.context, {resources:{test:{url:'/page?a=1'}},test:'/page?a=1'});
          done();
        });
    });

    it('with only template', function(done) {
      solidus_client
        .render(Handlebars.compile('works! {{resources.test}}'))
        .end(function(err, html) {
          assert.ifError(err);
          assert.equal(html, 'works! ');
          assert.deepEqual(solidus_client.context, {resources:{}});
          done();
        });
    });
  });

  it('with async preprocessor', function(done) {
    solidus_client
      .render(Handlebars.compile('works! {{test}}'))
      .then(function(context, callback) {
        setTimeout(function() {
          context.test = 'works!!';
          callback(context);
        }, 0);
      })
      .end(function(err, html) {
        assert.ifError(err);
        assert.equal(html, 'works! works!!');
        assert.deepEqual(solidus_client.context, {resources:{},test:'works!!'});
        done();
      });
  });

  it('with resource error', function(done) {
    view.resources.bad = host + '/does-not-exist';
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.equal(err.message, 'Not Found');
        done();
      });
  });

  it('with optional resource error', function(done) {
    view.resources.bad = {url: host + '/does-not-exist', optional: true};
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.ifError(err);
        assert.equal(html, '/page?a=1 helped');
        done();
      });
  });

  it('with preprocessor error', function(done) {
    view.preprocessor = function(context) {
      throw new Error('Oh no!');
    };
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.equal(err.message, 'Oh no!');
        done();
      });
  });

  it('with async preprocessor error', function(done) {
    view.preprocessor = function(context, callback) {
      throw new Error('Oh no!');
    };
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.equal(err.message, 'Oh no!');
        done();
      });
  });

  it('with async preprocessor timeout', function(done) {
    view.preprocessor = function(context, callback) {};
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.equal(err.message, 'Preprocessor timeout');
        done();
      });
  });

  it('with template error', function(done) {
    view.template = Handlebars.compile('{{ badhelper badparam }}');
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.equal(err.message, "Missing helper: 'badhelper'");
        done();
      });
  });

  it('preprocessor returns a status code', function(done) {
    view.preprocessor = function(context) {
      return 404;
    };
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.equal(err.message, 'Preprocessor returned invalid context');
        done();
      });
  });

  it('preprocessor returns an invalid redirect array', function(done) {
    view.preprocessor = function(context) {
      return ['http://www.test.com'];
    };
    solidus_client
      .render(view)
      .end(function(err, html) {
        assert.ifError(err);
        assert.equal(html, ' helped');
        done();
      });
  });

  if (util.isNode) {
    describe('with server', function() {
      it('preprocessor returns a redirect url', function(done) {
        view.preprocessor = function(context) {
          return 'http://www.test.com';
        };
        solidus_client
          .render(view)
          .end(function(err, html) {
            assert.equal(err.message, 'Cannot redirect');
            done();
          });
      });

      it('preprocessor returns a redirect code and url', function(done) {
        view.preprocessor = function(context) {
          return [301, 'http://www.test.com'];
        };
        solidus_client
          .render(view)
          .end(function(err, html) {
            assert.equal(err.message, 'Cannot redirect');
            done();
          });
      });
    });
  } else {
    describe('with browser', function() {
      var redirect = View.redirect;

      afterEach(function() {
        View.redirect = redirect;
      });

      it('preprocessor returns a redirect url', function(done) {
        view.preprocessor = function(context) {
          return 'http://www.test.com';
        };
        View.redirect = function(url) {
          assert.equal(url, 'http://www.test.com');
          done();
        };
        solidus_client
          .render(view)
          .end(function(err, html) {
            assert(false);
          });
      });

      it('preprocessor returns a redirect code and url', function(done) {
        view.preprocessor = function(context) {
          return [301, 'http://www.test.com'];
        };
        View.redirect = function(url) {
          assert.equal(url, 'http://www.test.com');
          done();
        };
        solidus_client
          .render(view)
          .end(function(err, html) {
            assert(false);
          });
      });
    });
  }
});

};
