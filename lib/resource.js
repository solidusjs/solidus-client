var DYNAMIC_SEGMENTS = /\{([^\}]*)\}/ig;
var DEFAULT_ENCODING = 'UTF8';
var DEFAULT_SOLIDUS_API_ROUTE = '/api/';

var _ = require('underscore');
var querystring = require('querystring');
var superagent = require('superagent');

var util = require('./util');

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
  if (!util.isNode) {
    if (this.options.proxy) return 'proxy';
    if (this.options.jsonp || (this.options.with_credentials && util.isIE)) return 'jsonp';
  }
  return 'client';
};

Resource.prototype.get = function(callback) {
  request.call(this, 'get', null, callback);
};

Resource.prototype.post = function(data, callback) {
  request.call(this, 'post', data, callback);
};

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

  var route   = (this.options.solidus_api_route || DEFAULT_SOLIDUS_API_ROUTE) + 'resource.json';
  var url     = buildUrl.call(this, route, {url: this.url});
  var request = superagent.get(url);
  superAgentRequest(request, callback);
};

var jsonpRequest = function(method, data, callback) {
  if (method != 'get' & method != 'post') return callback('Invalid JSONP method: ' + method);

  var callbackName = 'solidus_client_jsonp_callback_' + Math.round(100000 * Math.random());
  var url = buildUrl.call(this, this.url, {callback: callbackName}, _.isObject(data) ? data : {});
  if (_.isString(data)) url += '&' + data;

  var script = document.createElement('script');
  script.src = url;

  window[callbackName] = function(data) {
    delete window[callbackName];
    document.body.removeChild(script);
    callback(null, {}, data);
  };

  document.body.appendChild(script);
};

var clientRequest = function(method, data, callback) {
  if (method != 'get' & method != 'post') return callback('Invalid method: ' + method);

  var url     = buildUrl.call(this, this.url);
  var request = method == 'get' ? superagent.get(url) : superagent.post(url).send(data);

  if (this.options.headers) request.set(this.options.headers);
  if (this.options.auth) request.auth(this.options.auth.user, this.options.auth.pass);
  if (this.options.with_credentials && !util.isNode) request.withCredentials();

  superAgentRequest(request, callback);
};

var buildUrl = function(url) {
  var start = url.indexOf('?') + 1;
  var query = [];
  if (start > 0) query.push(querystring.parse(url.substring(start)));
  if (this.options.query) query.push(this.options.query);
  query = query.concat(Array.prototype.slice.call(arguments, 1));

  query = querystring.stringify(_.extend.apply(_, query));
  if (query) {
    return (start > 0 ? url.substring(0, start - 1) : url) + '?' + query;
  } else {
    return url;
  }
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
