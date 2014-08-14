var _ = require('underscore');
var handlebars_helper = require('handlebars-helper');

var Resource = require('./lib/resource.js');
var View = require('./lib/view.js');

var SolidusClient = function(options) {
  this.getResources = function(resources, params, callback) {
    var self = this;
    var errors = {};
    var result = {};
    var remaining = _.size(resources);

    if (!remaining) return callback(result);

    _.each(resources, function(url_template, name) {
      self.getResource(url_template, params, function(err, data) {
        if (err) {
          errors[name] = err;
        } else {
          result[name] = data;
        }
        if (!--remaining) callback(errors, result);
      });
    });
  };

  this.getResource = function(url_template, params, callback) {
    resource = new Resource(url_template, params, {auth: this.auth});
    resource.get(function(err, response) {
      callback(err, response.data);
    });
  };

  this.renderTemplate = function(template, context, template_options, callback) {
    template_options = template_options || {};
    template_options.helpers = _.extend(handlebars_helper.helpers, template_options.helpers || {});
    callback(template(context, template_options));
  };

  this.render = function(view) {
    return new View(this, view);
  };

  // PRIVATE

  this.initialize = function(options) {
    options = options || {};
    this.auth = options.auth;
  };

  this.initialize(options);
};

module.exports = SolidusClient;
