var _ = require('underscore');
var handlebars_helper = require('handlebars-helper');

var Resource = require('./lib/resource.js');
var View = require('./lib/view.js');

var SolidusClient = function(options) {
  this.resources_options = (options || {}).resources_options;
};

SolidusClient.prototype.getResource = function(options, params, callback) {
  var resource = new Resource(options, this.resources_options, params);
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

  _.each(resources, function(options, name) {
    self.getResource(options, params, function(err, data) {
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
