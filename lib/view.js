var _ = require('underscore');

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
  getResources.call(self, function(resources) {
    self.solidus_client.addResourcesToContext(resources);

    runPreprocessor.call(self, function(context) {
      self.solidus_client.context = context;

      var html = renderTemplate.call(self, context);
      callback(html);
    });
  });
  return null;
};

// PRIVATE

var getResources = function(callback) {
  this.solidus_client.getResources(this.resources, this.resources_params, function(err, resources) {
    // TODO: what to do with errors?
    //if (err) throw err;
    callback(resources);
  });
};

var runPreprocessor = function(callback) {
  if (!this.preprocessor) {
    callback(this.solidus_client.context);
  } else if (this.preprocessor.length === 1) {
    callback(this.preprocessor(this.solidus_client.context));
  } else {
    this.preprocessor(this.solidus_client.context, callback);
  }
};

var renderTemplate = function(context) {
  return this.solidus_client.renderTemplate(this.template, context, this.template_options);
};

module.exports = View;
