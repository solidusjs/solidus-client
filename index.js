var _ = require('underscore');
var handlebars_helper = require('handlebars-helper');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Resource = require('./lib/resource.js');
var View = require('./lib/view.js');

var SolidusClient = function(options) {
  if (!(this instanceof SolidusClient)) return new SolidusClient(options);

  options || (options = {});
  this.resources_options = options.resources_options;
  this.context           = options.context || {};
};

// HACK: needed by universe.js...
util.inherits(SolidusClient, EventEmitter);

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
  var html, err;

  template_options = template_options || {};
  template_options.helpers = _.extend(handlebars_helper.helpers, template_options.helpers || {});

  try {
    html = template(context, template_options);
  } catch (error) {
    err = error;
  }

  callback(err, html);
};

SolidusClient.prototype.view = function(view) {
  var self = this;

  view.render = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    return self.render.apply(self, args);
  };

  return view;
};

SolidusClient.prototype.render = function(view, params, callback) {
  var renderer = new View(this, view);
  if (!callback && _.isFunction(params)) {
    callback = params;
    params   = null;
  }
  if (params) {
    renderer.params(params);
  }
  return callback ? renderer.end(callback) : renderer;
};

module.exports = SolidusClient;
