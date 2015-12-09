var assert = require('assert');

var AssetsProxy = require('../../lib/assets_proxy');
var util        = require('../../lib/util');

module.exports = function() {

describe('AssetsProxy', function() {
  describe('.proxyAssets', function() {
    it('replaces assets URLs by proxies URLs', function() {
      var assets_proxy = new AssetsProxy([{
        resource: 'http://resource1.com/resource/path',
        proxy:    'http://proxy1.com/proxy/path'
      },{
        resource: 'http://resource2.com/resource/path',
        proxy:    'http://proxy2.com/proxy/path'
      }]);

      var from = 'http://resource1.com/resource/path/some/image1.jpg http://resource2.com/resource/path/some/image2.jpg';
      var to   = 'http://proxy1.com/proxy/path/http%3A%2F%2Fresource1.com%2Fresource%2Fpath%2Fsome%2Fimage1.jpg http://proxy2.com/proxy/path/http%3A%2F%2Fresource2.com%2Fresource%2Fpath%2Fsome%2Fimage2.jpg';
      assert.equal(assets_proxy.proxyAssets(from), to);
    });

    it('with URL delimiters', function() {
      var assets_proxy = new AssetsProxy([{
        resource: 'https://r',
        proxy:    'http://p'
      }]);

      var from = '"https://r/a" \'https://r/b\' https://r/c (https://r/d) "https://r/a?a=b"';
      var to   = '"http://p/https%3A%2F%2Fr%2Fa" \'http://p/https%3A%2F%2Fr%2Fb\' http://p/https%3A%2F%2Fr%2Fc (http://p/https%3A%2F%2Fr%2Fd) "http://p/https%3A%2F%2Fr%2Fa?a=b"';
      assert.equal(assets_proxy.proxyAssets(from), to);
    });

    it('with invalid URLs', function() {
      var assets_proxy = new AssetsProxy([{
        resource: 'http://resource.com/resource/path',
        proxy:    'http://proxy.com/proxy/path'
      }]);

      var from = 'http://resource.com/resource2/path/bad badhttp://resource.com/resource/path/some/image.jpg';
      assert.equal(assets_proxy.proxyAssets(from), from);
    });
  });

  describe('.proxyContextAssets', function() {
    var assets_proxy = new AssetsProxy([{
      resource: 'http://resource.com/resource/path',
      proxy:    'http://proxy.com/proxy/path'
    }]);
    var asset = 'http://resource.com/resource/path/image.jpg';
    var proxied = 'http://proxy.com/proxy/path/http%3A%2F%2Fresource.com%2Fresource%2Fpath%2Fimage.jpg';
    var context;

    beforeEach(function() {
      context = {
        v1: asset,
        v2: asset,
        v3: {
          v4: asset,
          v5: asset,
          v6: {
            v7: asset,
            v8: asset },
          v9: [
            asset,
            asset ]},
        v10: [
          asset,
          asset,
          [
            asset,
            asset ],
          {
            v11: asset,
            v12: asset }]};
    });

    it('replaces context assets URLs by proxies URLs', function() {
      var expected = {
        v1: proxied,
        v2: proxied,
        v3: {
          v4: proxied,
          v5: proxied,
          v6: {
            v7: proxied,
            v8: proxied },
          v9: [
            proxied,
            proxied ]},
        v10: [
          proxied,
          proxied,
          [
            proxied,
            proxied ],
          {
            v11: proxied,
            v12: proxied }]};
      assets_proxy.proxyContextAssets(context);
      assert.deepEqual(context, expected);
    });

    it('replaces subcontext assets URLs by proxies URLs', function() {
      var expected = {
        v1: asset,
        v2: asset,
        v3: {
          v4: proxied,
          v5: proxied,
          v6: {
            v7: proxied,
            v8: proxied },
          v9: [
            proxied,
            proxied ]},
        v10: [
          asset,
          asset,
          [
            asset,
            asset ],
          {
            v11: asset,
            v12: asset }]};
      assets_proxy.proxyContextAssets(context.v3);
      assert.deepEqual(context, expected);
    });

    it('replaces specific context assets URLs by proxies URLs', function() {
      var expected = {
        v1: proxied,
        v2: asset,
        v3: {
          v4: proxied,
          v5: asset,
          v6: {
            v7: proxied,
            v8: asset },
          v9: [
            proxied,
            proxied ]},
        v10: [
          proxied,
          proxied,
          [
            proxied,
            proxied ],
          {
            v11: proxied,
            v12: asset }]};
      assets_proxy.proxyContextAssets(context, ['v1', 'v3.v4', 'v3.v6.v7', 'v3.v9', 'v10', 'v10.v11']);
      assert.deepEqual(context, expected);
    });

    it('replaces specific subcontext assets URLs by proxies URLs', function() {
      var expected = {
        v1: asset,
        v2: asset,
        v3: {
          v4: proxied,
          v5: asset,
          v6: {
            v7: proxied,
            v8: asset },
          v9: [
            proxied,
            proxied ]},
        v10: [
          asset,
          asset,
          [
            asset,
            asset ],
          {
            v11: asset,
            v12: asset }]};
      assets_proxy.proxyContextAssets(context.v3, ['v4', 'v6.v7', 'v9']);
      assert.deepEqual(context, expected);
    });
  });
});

};
