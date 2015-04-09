var _ = require('underscore');

var util = require('./util');

var View = function(solidus_client, view) {
  this.solidus_client = solidus_client;

  if (_.isFunction(view)) {
    this.template = view;
  } else {
    this.resources = view.resources;
    this.resources_params = view.params;
    this.preprocessor = view.preprocessor;
    this.template = view.template;
    this.template_options = view.template_options;
  }

  this.resources = this.resources || {};
  this.resources_params = this.resources_params || {};
  this.template_options = this.template_options || {};
};

View.prototype.params = function(params) {
  this.resources_params = params;
  return this;
};

View.prototype.templateOptions = function(template_options) {
  this.template_options = template_options;
  return this;
};

View.prototype.get = function(resources) {
  this.resources = resources;
  return this;
};

View.prototype.then = function(preprocessor) {
  this.preprocessor = preprocessor;
  return this;
};

View.prototype.end = function(callback) {
  var self = this;

  getResources.call(self, function(err, resources) {
    if (err) return callback(err);

    addResourcesToContext.call(self, resources);

    preprocessContext.call(self, function(err) {
      if (err) return callback(err);

      self.solidus_client.renderTemplate(self.template, self.solidus_client.context, self.template_options, callback);
    });
  });
};

// Hacks for easier testing
View.redirect = function(url) {
  window.location.href = url;
};
View.preprocessor_timeout = 10000;

// PRIVATE

var getResources = function(callback) {
  var self = this;
  self.solidus_client.getResources(self.resources, self.resources_params, function(err, resources) {
    if (err) {
      err = _.find(err, function(err, resource) {
        return !self.resources[resource].optional
      });
    }
    callback(err, resources);
  });
};

var addResourcesToContext = function(resources) {
  this.solidus_client.context.resources || (this.solidus_client.context.resources = {});
  for (var name in resources) {
    this.solidus_client.context.resources[name] = resources[name];
  }
};

var preprocessContext = function(callback) {
  var self = this;
  if (!self.preprocessor) return callback();

  var preprocessor_type = self.preprocessor.length === 1 ? preprocessContextSync : preprocessContextAsync;

  preprocessor_type.call(self, function(err, context) {
    if (err) {
      callback(err);
    } else if (_.isString(context)) {
      if (util.isNode) return callback(new Error('Cannot redirect'));
      View.redirect(context);
    } else if (_.isArray(context) && context.length === 2 && _.isNumber(context[0]) && _.isString(context[1])) {
      if (util.isNode) return callback(new Error('Cannot redirect'));
      View.redirect(context[1]);
    } else if (!_.isObject(context)) {
      callback(new Error('Preprocessor returned invalid context'));
    } else {
      self.solidus_client.context = context;
      callback();
    }
  });
};

var preprocessContextSync = function(callback) {
  var context, err;

  try {
    context = this.preprocessor(this.solidus_client.context);
  } catch (error) {
    err = error;
  }

  callback(err, context);
};

var preprocessContextAsync = function(callback) {
  var done = _.once(callback);

  setTimeout(function() {
    done(new Error('Preprocessor timeout'));
  }, View.preprocessor_timeout);

  try {
    this.preprocessor(this.solidus_client.context, function(context) {
      // In case the preprocessor is not async, we don't want to catch the callback exceptions
      setTimeout(function() {
        done(null, context);
      }, 0);
    });
  } catch (err) {
    done(err);
  }
};

module.exports = View;
