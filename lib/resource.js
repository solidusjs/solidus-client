var DYNAMIC_SEGMENTS = /\{([^\}]*)\}/ig;
var DEFAULT_ENCODING = 'UTF8';
var DEFAULT_SOLIDUS_API_ROUTE = '/api/';

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
  var result = {request_time: new Date().getTime()};

  request.call(this, function(err, res, data) {
    result.response_time = new Date().getTime();
    result.response = res;
    result.data = data;
    callback(err, result);
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
  var request_type;
  if (this.options.proxy && !Resource.isNode) {
    request_type = proxyRequest;
  } else if (this.options.jsonp && !Resource.isNode) {
    request_type = jsonpRequest;
  } else {
    request_type = clientRequest;
  }
  request_type.call(this, callback);
};

var proxyRequest = function(callback) {
  var solidus_api_route = this.options.solidus_api_route || DEFAULT_SOLIDUS_API_ROUTE;
  var request = superagent.get(solidus_api_route + 'resource.json?');
  request.query({url: this.url});
  superAgentRequest(request, callback);
};

var jsonpRequest = function(callback) {
  var callbackName = 'solidus_client_jsonp_callback_' + Math.round(100000 * Math.random());
  var script = document.createElement('script');
  script.src = this.url + (this.url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;

  window[callbackName] = function(data) {
    delete window[callbackName];
    document.body.removeChild(script);
    callback(null, {}, data);
  };

  document.body.appendChild(script);
};

var clientRequest = function(callback) {
  var request = superagent.get(this.url);
  if (this.options.query) request.query(this.options.query);
  if (this.options.headers) request.set(this.options.headers);
  if (this.options.auth) request.auth(this.options.auth.user, this.options.auth.pass);
  if (this.options.with_credentials && !Resource.isNode) request.withCredentials();
  superAgentRequest(request, callback);
};

var superAgentRequest = function(request, callback) {
  // See http://visionmedia.github.io/superagent/#buffering-responses
  if (request.buffer) request.buffer();

  request.end(function(err, res) {
    if (err) return callback(err);

    var data;
    try {
      data = JSON.parse(res.text.toString(DEFAULT_ENCODING));
    } catch (error) {
      err = 'Invalid JSON: ' + error.message;
    }
    callback(err, res, data);
  });
}

module.exports = Resource;
