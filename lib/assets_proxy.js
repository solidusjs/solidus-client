var _ = require('underscore');

var util = require('./util')

var AssetsProxy = function(proxied_assets) {
  if (!(this instanceof AssetsProxy)) return new AssetsProxy(proxied_assets);

  this.proxied_assets = proxied_assets.map(function(assets) {
    return {
      resource: new RegExp('(^|[\'"\\s\\(])(' + util.escapeRegExp(assets.resource) + '.*?)($|[\'"\\s\\)])', 'g'),
      proxy:    util.addSlash(assets.proxy)
    };
  });
};

AssetsProxy.prototype.proxyAssets = function(string) {
  if (!string || !string.substring) return string;

  return this.proxied_assets.reduce(function(result, assets) {
    return result.replace(assets.resource, function(match, starting_delimiter, asset, ending_delimiter) {
      return starting_delimiter + assets.proxy + encodeURIComponent(asset) + ending_delimiter;
    });
  }, string);
};

AssetsProxy.prototype.proxyContextAssets = function(context, paths) {
  if (paths) {
    for (var i in paths) {
      proxyObjectAssetsByPath.call(this, context, paths[i].split('.'));
    }
  } else {
    proxyObjectAssets.call(this, context, true);
  }
};

// PRIVATE

var proxyObjectAssetsByPath = function(object, path) {
  if (!object) return;
  if (_.isArray(object)) {
    for (var i in object) proxyObjectAssetsByPath.call(this, object[i], path);
    return;
  }

  var key = path[0];

  if (path.length > 1) {
    proxyObjectAssetsByPath.call(this, object[key], path.slice(1));
  } else {
    object[key] = proxyObjectAssets.call(this, object[key], false);
  }
};

var proxyObjectAssets = function(object, recursive) {
  var self = this;
  if (_.isArray(object) || (recursive && _.isObject(object))) {
    _.each(object, function(value, key) {
      object[key] = proxyObjectAssets.call(self, value, recursive);
    });
    return object;
  } else {
    return self.proxyAssets(object);
  }
};

module.exports = AssetsProxy;
