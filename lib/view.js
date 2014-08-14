var _ = require('underscore');

var View = function(solidus_client, view) {
  this.params = function(params) {
    this.resources_params = params;
    return this;
  };

  this.templateOptions = function(template_options) {
    this.template_options = template_options;
    return this;
  };

  this.get = function(resources) {
    this.resources = resources;
    return this;
  };

  this.then = function(preprocessor) {
    this.preprocessor = preprocessor;
    return this;
  };

  this.end = function(callback) {
    var self = this;
    self.getContext(function(context) {
      self.preprocess(context, function(context) {
        self.render(context, callback);
      });
    });
    return null;
  };

  // PRIVATE

  this.initialize = function(solidus_client, view) {
    this.solidus_client = solidus_client;
    this.resources_params = {};

    if (_.isObject(view) && !_.isFunction(view)) {
      this.resources = view.resources;
      this.preprocessor = view.preprocessor;
      this.template = view.template;
      this.template_options = view.template_options;
    } else {
      this.resources = {};
      this.preprocessor = null;
      this.template = view;
      this.template_options = {};
    }
  };

  this.getContext = function(callback) {
    this.solidus_client.getResources(this.resources, this.resources_params, function(err, resources) {
      //if (err) throw err;
      callback({resources: resources});
    });
  };

  this.preprocess = function(context, callback) {
    if (!this.preprocessor) {
      callback(context);
    } else if (this.preprocessor.length === 1) {
      callback(this.preprocessor(context));
    } else {
      this.preprocessor(context, callback);
    }
  };

  this.render = function(context, callback) {
    this.solidus_client.renderTemplate(this.template, context, this.template_options, callback);
  };

  this.initialize(solidus_client, view);
}

module.exports = View;
