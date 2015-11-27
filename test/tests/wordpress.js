var assert = require('assert');
var _ = require('underscore');
var util = require('../../lib/util');
var wordpress = require('../../lib/wordpress');

var mockView = function() { return 'No op'; };

module.exports = function() {

  describe('WordPress utils', function() {
    var params = util.params;

    afterEach(function() {
      util.params = params;
    });

    describe('.getPostPreviewView', function() {
      it('returns false when not in preview mode', function(done) {
        util.params = {is_preview: false};
        var view = wordpress.getPostPreviewView(mockView);
        assert.equal(view, false);
        done();
      });

      it('throws an error if nonce is missing', function(done) {
        util.params = { is_preview: true };
        assert.throws( function() {
          var view = wordpress.getPostPreviewView(mockView);
          assert.equal(view, false);
        }, /nonce/ );
        done();
      });

      it('throws an error if view is missing', function(done) {
        util.params = {
          is_preview: true,
          _wp_json_nonce: 'sample nonce'
        };
        assert.throws( function() {
          var view = wordpress.getPostPreviewView();
          assert.equal(view, false);
          console.log(view);
        }, /view/ );
        done();
      });

      it('returns a view with wordpress preview resources', function(done) {
        util.params = {
          is_preview: true,
          _wp_json_nonce: 'sample nonce'
        };
        var view = wordpress.getPostPreviewView(mockView);

        var expectedWP = {
          url: 'http://{domain}/wp-json/posts/{post_id}',
          with_credentials: true,
          query: { '_wp_json_nonce': 'sample nonce' }
        };
        var expectedRevisions = {
          url: 'http://{domain}/wp-json/posts/{post_id}/revisions',
          with_credentials: true,
          query: { '_wp_json_nonce': 'sample nonce' }
        };
        assert.deepEqual(view.resources.wordpress, expectedWP);
        assert.deepEqual(view.resources.revisions, expectedRevisions);
        done();
      });

      it('combines passed in preprocessor with wordpress preview preprocessor', function(done) {
        util.params = {
          is_preview: true,
          _wp_json_nonce: 'sample nonce'
        };
        var view = wordpress.getPostPreviewView({
          template: mockView,
          preprocessor: function(context) {
            context.resources.wordpress.testKey = true;
            return context;
          }
        });
        var processedContext = view.preprocessor({resources: {wordpress: {}, revisions: ['test']}});
        assert(processedContext.testKey);
        done();
      });

      it('returns a template function', function(done) {
        util.params = {
          is_preview: true,
          _wp_json_nonce: 'sample nonce'
        };
        var view = wordpress.getPostPreviewView(mockView);
        assert(typeof view.template == 'function');
        done();
      });

      it('preserves keys from input', function(done) {
        util.params = {
          is_preview: true,
          _wp_json_nonce: 'sample nonce'
        };
        var inputObject = {
          template: mockView,
          preprocessor: function(context) {
            context.resources.wordpress.testKey = true;
            return context;
          },
          template_options: {},
          arbitraryKey: 'test'
        };
        var view = wordpress.getPostPreviewView(inputObject);
        Object.keys(inputObject).forEach(function(key){
          assert(view.hasOwnProperty(key));
        });
        done();
      });

    });

  });

};
