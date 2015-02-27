var url = require('url');

var util = require('./util')

var AssetsProxy = function(proxied_assets) {
  if (!(this instanceof AssetsProxy)) return new AssetsProxy(proxied_assets);

  this.proxied_assets = proxied_assets.map(function(assets) {
    return {
      resource: util.addSlash(assets.resource),
      proxy:    util.addSlash(assets.proxy),
      redirect: util.addSlash(assets.redirect || url.parse(assets.proxy).pathname),
    };
  });
};

AssetsProxy.prototype.proxyAssets = function(string) {
  if (!string || !string.substring) return string;

  return this.proxied_assets.reduce(function(result, assets) {
    return result.replace(new RegExp('(^|[\'"\\s\\(])' + util.escapeRegExp(assets.resource), 'g'), function(match, starting_delimiter) {
      return starting_delimiter + assets.proxy;
    });
  }, string);
};

AssetsProxy.prototype.proxyContextAssets = function(context, paths) {
  for (var i in paths) {
    proxyObjectAssetsByPath.call(this, context, paths[i].split('.'));
  }
};

AssetsProxy.prototype.redirects = function() {
  return this.proxied_assets.map(function(assets) {
    if (assets.redirect === '/') throw(new Error('Cannot redirect root: ' + JSON.stringify(assets)));
    return {
      from: new RegExp('^' + assets.redirect + '(.*)'),
      to:   assets.resource + '{0}'
    }
  });
};

// PRIVATE

var proxyObjectAssetsByPath = function(object, path) {
  if (!object) return;
  if (object instanceof Array) {
    for (var i in object) proxyObjectAssetsByPath.call(this, object[i], path);
    return;
  }

  var key = path[0];

  if (path.length > 1) {
    proxyObjectAssetsByPath.call(this, object[key], path.slice(1));
  } else {
    object[key] = proxyObjectAssets.call(this, object[key]);
  }
};

var proxyObjectAssets = function(object) {
  if (object instanceof Array) {
    return object.map(proxyObjectAssets, this);
  } else {
    return this.proxyAssets(object);
  }
};

module.exports = AssetsProxy;
