var _ = require('underscore');
var util = require('./util');

module.exports = {
  getPostPreviewView: function (view) {
    // Return false if we're not in preview mode
    if (!util.params.is_preview) {
      return false;
    }
    // Throw an error if we don't have a required value
    if ( !util.params._wp_json_nonce || !view ) {
      throw new Error('getPostPreviewView(): ' + (view?'_wp_json_nonce':'view') + ' is required.');
      return false;
    }

    // Create preview object
    if (_.isFunction(view)) {
      view = {template: view};
    }
    if (_.isFunction(view.preprocessor)) {
      var originalPreprocessor = view.preprocessor;
    }
    var preview = {
      resources: {
        wordpress: {
          url: 'http://{domain}/wp-json/posts/{post_id}',
          with_credentials: true,
          query: { '_wp_json_nonce': util.params._wp_json_nonce }
        },
        revisions: {
          url: 'http://{domain}/wp-json/posts/{post_id}/revisions',
          with_credentials: true,
          query: { '_wp_json_nonce': util.params._wp_json_nonce }
        }
      },
      preprocessor: function(context) {
        var lastRevision = context.resources.revisions[0];
        if (originalPreprocessor) { context = originalPreprocessor(context); }
        var previewContext = _.extend({}, context.resources.wordpress, lastRevision);
        previewContext.terms = context.resources.wordpress.terms; // WordPress preview response has blank terms key
        return previewContext;
      }
    };

    // Return a new object extending view with preview object
    return _.extend({}, view, preview);
  },
  getProtectedPostView: function (view) {
    var protectedView = {};
    return _.extend(view, protectedView);
  }
};
