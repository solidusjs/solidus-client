var _ = require('underscore');

var View = function(solidus_client, view) {
  this.solidus_client = solidus_client;
  this.resources_params = {};

  if (_.isFunction(view)) {
    this.resources = {};
    this.preprocessor = null;
    this.template = view;
    this.template_options = {};
  } else {
    this.resources = view.resources;
    this.preprocessor = view.preprocessor;
    this.template = view.template;
    this.template_options = view.template_options;
  }
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
    var context = {resources: resources};
    runPreprocessor.call(self, context, function(context) {
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

var runPreprocessor = function(context, callback) {
  if (!this.preprocessor) {
    callback(context);
  } else if (this.preprocessor.length === 1) {
    callback(this.preprocessor(context));
  } else {
    this.preprocessor(context, callback);
  }
};

var renderTemplate = function(context) {
  return this.solidus_client.renderTemplate(this.template, context, this.template_options);
};

module.exports = View;
