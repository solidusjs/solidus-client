const DYNAMIC_SEGMENTS = /\{([^\}]*)\}/ig;
const DEFAULT_ENCODING = 'UTF8';

var _ = require('underscore');
var superagent = require('superagent');

var Resource = function(url_template) {
  if (_.isObject(url_template)) {
    this.url_template = url_template.url;
    this.options = url_template;
    delete this.options.url;
  } else {
    this.url_template = url_template;
    this.options = {};
  }
  this.url = validUrlTemplate.call(this) ? this.url_template : null;
};

Resource.prototype.buildUrlAndOptions = function(params, auths) {
  this.url = expandUrl.call(this, params);
  this.options = _.extend(findOptionsFromAuths.call(this, auths), this.options);
};

Resource.prototype.get = function(callback) {
  if (!this.url) return callback(null, {});
  var resource = {request_time: new Date().getTime()};

  request.call(this, function(err, res) {
    if (err) return callback(err, null);
    resource.response_time = new Date().getTime();
    resource.response = res;

    try {
      resource.data = JSON.parse(res.text.toString(DEFAULT_ENCODING));
    } catch (err) {
      return callback('Invalid JSON: ' + err.message, null);
    }
    callback(null, resource);
  });
};

// PRIVATE

var validUrlTemplate = function() {
  return /^https?:\/\/.+/.test(this.url_template);
};

var expandUrl = function(params) {
  if (!validUrlTemplate.call(this)) return null;
  return this.url_template.replace(DYNAMIC_SEGMENTS, function(match, capture) {
    return params[capture] || '';
  });
};

var findOptionsFromAuths = function(auths) {
  var self = this;
  var options = {};
  _.each(auths, function(auth, match) {
    var matcher = new RegExp(match, 'ig');
    if (matcher.test(self.url)) {
      options = _.extend(options, auth);
    }
  });
  return options;
};

var request = function(callback) {
  // TODO: expand the query?
  var request = superagent.get(this.url);
  if (this.options.query) request.query(this.options.query);
  if (this.options.headers) request.set(this.options.headers);
  if (this.options.auth) request.auth(this.options.auth.user, this.options.auth.pass);
  if (this.options.with_credentials) request.withCredentials();
  if (request.buffer) request.buffer(); // See http://visionmedia.github.io/superagent/#buffering-responses
  request.end(callback);
};

module.exports = Resource;
