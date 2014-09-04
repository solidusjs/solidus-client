const DYNAMIC_SEGMENTS = /\{([^\}]*)\}/ig;
const DEFAULT_ENCODING = 'UTF8';
const DEFAULT_SOLIDUS_API_ROUTE = '/api/';

var _ = require('underscore');
var superagent = require('superagent');

var Resource = function(options, resources_options, params) {
  if (_.isString(options)) {
    initializeUrl.call(this, options, params || {});
    initializeOptions.call(this, {}, resources_options || {}, params || {});
  } else {
    initializeUrl.call(this, options.url, params || {});
    initializeOptions.call(this, _.omit(options, 'url'), resources_options || {}, params || {});
  }
};

Resource.prototype.get = function(callback) {
  if (!this.url) return callback(null, {});
  var error = null;
  var result = {request_time: new Date().getTime()};

  request.call(this, function(err, res) {
    if (err) return callback(err, null);
    result.response_time = new Date().getTime();
    result.response = res;
    try {
      result.data = JSON.parse(res.text.toString(DEFAULT_ENCODING));
    } catch (err) {
      error = 'Invalid JSON: ' + err.message;
    }
    callback(error, result);
  });
};

// Made public for easy testing
Resource.isNode = !(typeof window !== "undefined" && window !== null);

// PRIVATE

var initializeUrl = function(url, params) {
  this.url = validUrl(url) ? expandVariables(url, params) : null;
};

var initializeOptions = function(options, resources_options, params) {
  var self = this;
  self.options = {};

  // Find all the matching global options
  _.each(resources_options, function(options, match) {
    var matcher = new RegExp(match, 'ig');
    if (matcher.test(self.url)) {
      self.options = _.extend(self.options, options);
    }
  });

  // Merge the resource options
  self.options = _.extend(self.options, options);

  // Expand the query options
  _.each(self.options.query, function(value, name) {
    self.options.query[name] = _.isString(value) ? expandVariables(value, params) : value;
  });
};

var validUrl = function(url) {
  return /^https?:\/\/.+/.test(url);
};

var expandVariables = function(string, params) {
  return string.replace(DYNAMIC_SEGMENTS, function(match, capture) {
    return params[capture] || '';
  });
};

var request = function(callback) {
  var request;

  if (this.options.proxy && !Resource.isNode) {
    var solidus_api_route = this.options.solidus_api_route || DEFAULT_SOLIDUS_API_ROUTE;
    request = superagent.get(solidus_api_route + 'resource.json?url=' + encodeURIComponent(this.url));
  } else {
    request = superagent.get(this.url);
    if (this.options.query) request.query(this.options.query);
    if (this.options.headers) request.set(this.options.headers);
    if (this.options.auth) request.auth(this.options.auth.user, this.options.auth.pass);
    if (this.options.with_credentials && !Resource.isNode) request.withCredentials();
  }
  if (request.buffer) request.buffer(); // See http://visionmedia.github.io/superagent/#buffering-responses

  request.end(callback);
};

module.exports = Resource;
