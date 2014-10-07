var DYNAMIC_SEGMENTS = /\{([^\}]*)\}/ig;
var DEFAULT_ENCODING = 'UTF8';
var DEFAULT_SOLIDUS_API_ROUTE = '/api/';

var _ = require('underscore');
var querystring = require('querystring');
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

Resource.prototype.requestType = function() {
  if (!Resource.isNode) {
    if (this.options.proxy) return 'proxy';
    if (this.options.jsonp || (this.options.with_credentials && Resource.isIE)) return 'jsonp';
  }
  return 'client';
};

Resource.prototype.get = function(callback) {
  request.call(this, 'get', null, callback);
};

Resource.prototype.post = function(data, callback) {
  request.call(this, 'post', data, callback);
};

// Made public for easy testing
Resource.isNode = !(typeof window !== 'undefined' && window !== null);
Resource.isIE   = typeof XDomainRequest !== 'undefined';

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

var request = function(method, data, callback) {
  if (!this.url) return callback(null, {});

  var request_type;
  switch (this.requestType()) {
  case 'proxy':
    request_type = proxyRequest;
    break;
  case 'jsonp':
    request_type = jsonpRequest;
    break;
  case 'client':
    request_type = clientRequest;
    break;
  }

  var result = {request_time: new Date().getTime()};
  request_type.call(this, method, data, function(err, res, data) {
    result.response_time = new Date().getTime();
    result.response = res;
    result.data = data;
    callback(err, result);
  });
};

var proxyRequest = function(method, data, callback) {
  if (method != 'get') return callback('Invalid proxy method: ' + method);

  var solidus_api_route = this.options.solidus_api_route || DEFAULT_SOLIDUS_API_ROUTE;
  var request = superagent.get(solidus_api_route + 'resource.json');
  request.query({url: this.url});
  superAgentRequest(request, callback);
};

var jsonpRequest = function(method, data, callback) {
  if (method != 'get' & method != 'post') return callback('Invalid JSONP method: ' + method);

  var callbackName = 'solidus_client_jsonp_callback_' + Math.round(100000 * Math.random());
  var query = querystring.stringify(_.extend({callback: callbackName}, this.options.query || {}, _.isObject(data) ? data : {}));
  if (_.isString(data)) query += '&' + data;

  var script = document.createElement('script');
  script.src = this.url + (this.url.indexOf('?') >= 0 ? '&' : '?') + query;

  window[callbackName] = function(data) {
    delete window[callbackName];
    document.body.removeChild(script);
    callback(null, {}, data);
  };

  document.body.appendChild(script);
};

var clientRequest = function(method, data, callback) {
  var request;
  if (method == 'get') request = superagent.get(this.url);
  else if (method == 'post') request = superagent.post(this.url).send(data);
  else return callback('Invalid method: ' + method);

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
