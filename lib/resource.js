var DYNAMIC_SEGMENTS = /\{([^\}]*)\}/ig;
var DEFAULT_ENCODING = 'UTF8';
var DEFAULT_SOLIDUS_API_ROUTE = '/api/';
var DEFAULT_TIMEOUT = 20000;
var NOT_FOUND = /(404|not[ -_]?found|not[ -_]?find|no[ -_]?\w+?[ -_]?found|invalid[ -_]?\w+|unknown[ -_]?\w+|do(es)?[ -_]?not[ -_]?exist|empty)/i;

var _ = require('underscore');
var qs = require('qs');
var superagent = require('superagent');
var extend = require('extend');

var util = require('./util');

// SuperAgent uses btoa for auth encoding on the client, which is missing from <IE10
// https://github.com/visionmedia/superagent#supported-browsers
if (!util.isNode && !window.btoa) window.btoa = require('./base64').encode;

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
    if (this.options.jsonp || (this.options.with_credentials && !util.supportsCORS)) return 'jsonp';
  }
  return 'client';
};

Resource.prototype.requestUrl = function() {
  if (!this.url) return;

  switch (this.requestType()) {
  case 'proxy':
    return proxyRequestUrl.call(this);
  case 'jsonp':
    return jsonpRequestUrl.call(this);
  case 'client':
    return clientRequestUrl.call(this);
  }
};

Resource.prototype.get = function(callback) {
  request.call(this, 'get', null, callback);
};

Resource.prototype.post = function(data, callback) {
  request.call(this, 'post', data, callback);
};

// PRIVATE

var initializeUrl = function(url, params) {
  if (validUrl(url)) {
    var expanded = expandVariables(url, params);
    this.url             = expanded[0];
    this.dynamic         = expanded[1];
    this.expanded_params = expanded[2];
  } else {
    this.url             = null;
    this.dynamic         = false;
    this.expanded_params = [];
  }
};

var initializeOptions = function(options, resources_options, params) {
  var self = this;
  self.options = {timeout: DEFAULT_TIMEOUT};

  // Find all the matching global options
  _.each(resources_options, function(options, match) {
    var matcher = new RegExp(match, 'ig');
    if (matcher.test(self.url)) extend(true, self.options, options);
  });

  // Merge the resource options
  extend(true, self.options, options);

  // Expand the query options
  _.each(self.options.query, function(value, name) {
    if (!_.isString(value)) return;
    var expanded = expandVariables(value, params);
    self.options.query[name] = expanded[0];
    if (expanded[1]) self.dynamic = true;
    self.expanded_params = self.expanded_params.concat(expanded[2]);
  });
};

var validUrl = function(url) {
  return /^https?:\/\/.+/.test(url);
};

var expandVariables = function(string, params) {
  var dynamic = false;
  var expanded = [];
  var result = string.replace(DYNAMIC_SEGMENTS, function(match, variable) {
    dynamic = true;
    if (params[variable]) expanded.push(variable);
    return params[variable] || '';
  });
  return [result, dynamic, expanded];
};

var request = function(method, data, callback) {
  var self = this;

  if (!this.url) return callback(null, {});
  if (this.options.required_params) {
    var missing_params = this.options.required_params.filter(function (param) {return self.expanded_params.indexOf(param) === -1});
    if (missing_params.length) return callback(new Error('Missing required params: ' + missing_params.join(', ')), {});
  }

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

  var request = superagent.get(proxyRequestUrl.call(this));

  if (this.options.timeout) request.timeout(this.options.timeout);

  superAgentRequest(request, callback);
};

var proxyRequestUrl = function() {
  var route = (this.options.solidus_api_route || DEFAULT_SOLIDUS_API_ROUTE) + 'resource.json';
  var url   = buildUrl.call(this, this.url);
  return route + '?url=' + encodeURIComponent(url);
};

var jsonpRequest = function(method, data, callback) {
  if (method != 'get' & method != 'post') return callback('Invalid JSONP method: ' + method);

  var self = this;
  var callbackName = 'solidus_client_jsonp_callback_' + Math.round(100000 * Math.random());
  var url = buildUrl.call(self, jsonpRequestUrl.call(self), {callback: callbackName}, _.isObject(data) ? data : {});
  if (_.isString(data)) url += '&' + data;

  var script = document.createElement('script');
  script.src = url;

  var timer;
  var first = true;

  window[callbackName] = function(data) {
    var timedout = data instanceof Error;

    // Cancel timeout
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    // Do not cleanup if there was a timeout, in case the real request ever comes back
    if (!timedout) {
      document.getElementsByTagName('head')[0].removeChild(script);
      delete window[callbackName];
    }

    // Only run user callback once
    if (first) {
      first = false;
      timedout ? callback(data) : processResponse({status: 200}, data, callback);
    }
  };

  if (self.options.timeout) {
    timer = setTimeout(function() {
      timer = null;
      var err = new Error('Timeout of ' + self.options.timeout + 'ms exceeded');
      err.callbackName = callbackName; // For testing purposes
      window[callbackName](err);
    }, self.options.timeout);
  }

  document.getElementsByTagName('head')[0].appendChild(script);
};

var jsonpRequestUrl = function(data) {
  return buildUrl.call(this, this.url);
};

var clientRequest = function(method, data, callback) {
  if (method != 'get' & method != 'post') return callback('Invalid method: ' + method);

  var url     = clientRequestUrl.call(this);
  var request = method == 'get' ? superagent.get(url) : superagent.post(url).send(data);

  if (this.options.headers) request.set(this.options.headers);
  if (this.options.auth) request.auth(this.options.auth.user, this.options.auth.pass);
  if (this.options.with_credentials && !util.isNode) request.withCredentials();
  if (this.options.timeout) request.timeout(this.options.timeout);

  superAgentRequest(request, callback);
};

var clientRequestUrl = function() {
  return buildUrl.call(this, this.url);
};

var buildUrl = function(url) {
  var start = url.indexOf('?') + 1;
  var query = [];
  if (start > 0) query.push(qs.parse(url.substring(start)));
  if (this.options.query) query.push(this.options.query);
  query = query.concat(Array.prototype.slice.call(arguments, 1));
  query = _.extend.apply(_, query);

  if (this.options.query_options && this.options.query_options['objectFormat'] === 'json') {
    _.each(query, function(value, key) {
      if (_.isObject(value) && !_.isArray(value)) query[key] = JSON.stringify(value);
    });
  }

  query = qs.stringify(query, this.options.query_options);
  if (query) {
    return (start > 0 ? url.substring(0, start - 1) : url) + '?' + query;
  } else {
    return url;
  }
};

var superAgentRequest = function(request, callback) {
  // Force buffering of response bodies as res.text
  // http://visionmedia.github.io/superagent/#buffering-responses
  if (util.isNode) request.buffer();

  // Not all weird browser errors are catched by SuperAgent
  try {
    request.end(function(err, res) {
      // In case the request is not async, we don't want to catch the callback exceptions
      setTimeout(function() {
        // SuperAgent considers statuses <200 and >=300 as errors
        // http://visionmedia.github.io/superagent/#error-handling
        if (err) return callback(err, res);
        processResponse(res, null, callback);
      }, 0);
    });
  } catch (err) {
    callback(err);
  }
}

var processResponse = function(res, data, callback) {
  processData(res, data, function(err, data) {
    if (err) return callback(err, res);
    processDataStatus(data, function(err) {
      callback(err, res, data);
    });
  });
};

var processData = function(res, data, callback) {
  var err;
  if (!_.isObject(data)) {
    try {
      data = JSON.parse(res.text.toString(DEFAULT_ENCODING));
    } catch (error) {
      err = new Error('Invalid JSON');
      err.error = error.message;
    }
  }
  callback(err, data);
};

var processDataStatus = function(data, callback) {
  var err;
  if (String(data.status).toLowerCase() == 'error') {
    var message = (data.messages || []).concat([data.error, data.message, data.response, data.body]).join(' ');
    err = new Error('Invalid data status');
    err.status = message.match(NOT_FOUND) ? 404 : 500;
  }
  callback(err);
};

module.exports = Resource;
