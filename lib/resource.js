const DEFAULT_ENCODING = 'UTF8';

var _ = require('underscore');
var hyperquest = require('hyperquest');
var url = require('url');
var zlib = require('zlib');

function Resource(url_template, params, options) {
  this.expandUrl = function(params) {
    if (!/^https?:\/\/.+/.test(this.url_template)) {
      this.expanded_url = null;
      return this.expanded_url;
    }

    // Replace variable strings like {this} in the resource url with url or query parameters
    var expandVariables = function(string) {
      return string.replace(/\{([^\}]*)\}/ig, function(match, capture, index, str) {
        return params[capture] || '';
      });
    };

    this.expanded_url = expandVariables(this.url_template);

    // Loop through auth query looking for dynamic bits
    var query = {};
    for (var key in this.options.query) {
      query[key] = typeof this.options.query[key] === 'string'
        ? expandVariables(this.options.query[key])
        : this.options.query[key];
    }

    var url_bits = url.parse(this.expanded_url, true);
    url_bits.query = _.defaults(url_bits.query, query);
    delete url_bits.search; // This will confuse url.format if we leave it in
    this.expanded_url = url.format(url_bits);

    return this.expanded_url;
  };

  this.get = function(callback) {
    if (!this.expanded_url) return callback(null, {});
    var self = this;
    var resource = {request_time: new Date().getTime()};

    hyperquest(self.expanded_url, self.options, function(err, res) {
      if (err) return callback(err, null);
      resource.response = res;
      resource.response_time = new Date().getTime();

      self.parseResponse(res, function(err, data) {
        if (err) return callback(err, null);
        resource.data = data;
        callback(null, resource);
      });
    });
  };

  // PRIVATE

  this.initialize = function(url_template, params, options) {
    var self = this;

    params = params || {};
    options = options || {};

    self.url_template = url_template;
    self.options = {
      headers: {'Accept-Encoding': 'gzip,deflate'},
      withCredentials: false // TODO: Make this an option
    };

    // Add auth options
    // TODO: Match auth options after url is expanded
    _.each(options.auth, function(auth, match) {
      var matcher = new RegExp(match, 'ig');
      if (matcher.test(self.url_template)) {
        self.options = _.extend(self.options, auth);
      }
    });

    self.expandUrl(params);
  };

  this.parseResponse = function(res, callback) {
    var data = '';

    if (res.headers['content-encoding'] == 'gzip' || res.headers['content-encoding'] == 'deflate') {
      // Response is compressed
      res = res.pipe(new zlib.Unzip());
    }

    res.on('data', function onData(chunk) {
      data += chunk;
    });

    res.on('end', function onEnd() {
      try {
        data = JSON.parse(data.toString(DEFAULT_ENCODING));
      } catch (err) {
        return callback('Invalid JSON: ' + err.message, null);
      }

      callback(null, data);
    });
  };

  this.initialize(url_template, params, options);
};

module.exports = Resource;
