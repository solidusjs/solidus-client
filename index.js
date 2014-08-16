var _ = require('underscore');
var handlebars_helper = require('handlebars-helper');

var Resource = require('./lib/resource.js');
var View = require('./lib/view.js');

var SolidusClient = function(options) {
  options = options || {};
  this.auth = options.auth;
};

SolidusClient.prototype.getResource = function(url_template, params, callback) {
  var resource = new Resource(url_template);
  resource.buildUrlAndOptions(params, this.auth);
  resource.get(function(err, response) {
    callback(err, response ? response.data : null);
  });
};

SolidusClient.prototype.getResources = function(resources, params, callback) {
  var self = this;
  var errors = null;
  var result = {};
  var remaining = _.size(resources);

  if (!remaining) return callback(errors, result);

  _.each(resources, function(url_template, name) {
    self.getResource(url_template, params, function(err, data) {
      if (err) {
        errors = errors || {};
        errors[name] = err;
      } else {
        result[name] = data;
      }
      if (!--remaining) callback(errors, result);
    });
  });
};

SolidusClient.prototype.renderTemplate = function(template, context, template_options, callback) {
  template_options = template_options || {};
  template_options.helpers = _.extend(handlebars_helper.helpers, template_options.helpers || {});
  return template(context, template_options);
};

SolidusClient.prototype.render = function(view) {
  return new View(this, view);
};

module.exports = SolidusClient;
