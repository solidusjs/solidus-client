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
      var to   = 'http://proxy1.com/proxy/path/some/image1.jpg http://proxy2.com/proxy/path/some/image2.jpg';
      assert.equal(assets_proxy.proxyAssets(from), to);
    });

    it('with URL delimiters', function() {
      var assets_proxy = new AssetsProxy([{
        resource: 'https://r',
        proxy:    'http://p'
      }]);

      var from = '"https://r/a" \'https://r/b\' https://r/c (https://r/d)';
      var to   = '"http://p/a" \'http://p/b\' http://p/c (http://p/d)';
      assert.equal(assets_proxy.proxyAssets(from), to);
    });

    it('with invalid URLs', function() {
      var assets_proxy = new AssetsProxy([{
        resource: 'http://resource.com/resource/path',
        proxy:    'http://proxy.com/proxy/path'
      }]);

      var from = 'http://resource.com/resource/pathbad badhttp://resource.com/resource/path/some/image.jpg';
      assert.equal(assets_proxy.proxyAssets(from), from);
    });
  });

  describe('.proxyContextAssets', function() {
    it('replaces context paths assets URLs by proxies URLs', function() {
      var assets_proxy = new AssetsProxy([{
        resource: 'http://resource.com/resource/path',
        proxy:    'http://proxy.com/proxy/path'
      }]);

      var from = {
        v1: 'http://resource.com/resource/path/image.jpg',
        v2: 'http://resource.com/resource/path/image.jpg',
        v3: {
          v4: 'http://resource.com/resource/path/image.jpg',
          v5: 'http://resource.com/resource/path/image.jpg',
          v6: {
            v7: 'http://resource.com/resource/path/image.jpg',
            v8: 'http://resource.com/resource/path/image.jpg' },
          v9: [
            'http://resource.com/resource/path/image.jpg',
            'http://resource.com/resource/path/image.jpg' ]},
        v10: [
          'http://resource.com/resource/path/image.jpg',
          'http://resource.com/resource/path/image.jpg',
          [
            'http://resource.com/resource/path/image.jpg',
            'http://resource.com/resource/path/image.jpg' ],
          {
            v11: 'http://resource.com/resource/path/image.jpg',
            v12: 'http://resource.com/resource/path/image.jpg' }]};
      var to = {
        v1: 'http://proxy.com/proxy/path/image.jpg',
        v2: 'http://resource.com/resource/path/image.jpg',
        v3: {
          v4: 'http://proxy.com/proxy/path/image.jpg',
          v5: 'http://resource.com/resource/path/image.jpg',
          v6: {
            v7: 'http://proxy.com/proxy/path/image.jpg',
            v8: 'http://resource.com/resource/path/image.jpg' },
          v9: [
            'http://proxy.com/proxy/path/image.jpg',
            'http://proxy.com/proxy/path/image.jpg' ]},
        v10: [
          'http://proxy.com/proxy/path/image.jpg',
          'http://proxy.com/proxy/path/image.jpg',
          [
            'http://proxy.com/proxy/path/image.jpg',
            'http://proxy.com/proxy/path/image.jpg' ],
          {
            v11: 'http://proxy.com/proxy/path/image.jpg',
            v12: 'http://resource.com/resource/path/image.jpg' }]};
      assets_proxy.proxyContextAssets(from, ['v1', 'v3.v4', 'v3.v6.v7', 'v3.v9', 'v10', 'v10.v11']);
      assert.deepEqual(from, to);
    });
  });

  if (util.isNode) {
    describe('.redirects', function() {
      it('returns Solidus redirects', function() {
        var assets_proxy = new AssetsProxy([{
          resource: 'http://resource.com/resource/path',
          proxy:    'http://proxy.com/proxy/path'
        }]);

        assert.deepEqual(assets_proxy.redirects(), [{
          from: new RegExp('^/proxy/path/(.*)'),
          to:   'http://resource.com/resource/path/{0}'
        }]);
      });

      it('with custom redirect path', function() {
        var assets_proxy = new AssetsProxy([{
          resource: 'http://resource.com/resource/path',
          proxy:    'http://proxy.com/proxy/path',
          redirect: '/redirect/path'
        }]);

        assert.deepEqual(assets_proxy.redirects(), [{
          from: new RegExp('^/redirect/path/(.*)'),
          to:   'http://resource.com/resource/path/{0}'
        }]);
      });

      it('with root path', function() {
        var assets_proxy = new AssetsProxy([{
          resource: 'http://resource.com/resource/path',
          proxy:    'http://proxy.com'
        }]);

        assert.throws(assets_proxy.redirects);
      });
    });
  }
});

};
