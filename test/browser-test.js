var assert = require('assert');
var fs = require('fs');
var webdriver = require('browserstack-webdriver');
var test = require('browserstack-webdriver/testing');
var _ = require('underscore');

var config = require('./config');

var browserStackConfig = {
  'browserstack.local': 'true',
  'browserstack.user':  'TODO',
  'browserstack.key':   'TODO',
  'project':            'SolidusClient'
}

var setups = [
  {browser: 'Chrome'},
  {browser: 'Chrome', browser_version: '35.0'},
  {browser: 'Safari'},
  {browser: 'Safari', browser_version: '6.1'},
  {browser: 'IE'},
  {browser: 'IE', browser_version: '10.0'},
  {browser: 'IE', browser_version: '9.0'},
  {browser: 'Firefox'},
  {browser: 'Firefox', browser_version: '30.0'},
  {device: 'iPhone 5S'},
  {device: 'iPhone 5'},
  {device: 'LG Nexus 4'},
  {device: 'Motorola Razr'}
];

setups.forEach(function (setup) {
  test.describe(_.compact([setup.browser, setup.browser_version, setup.device]).join(', '), function() {
    var driver;

    test.before(function() {
      driver = new webdriver.Builder()
        .usingServer('http://hub.browserstack.com/wd/hub')
        .withCapabilities(_.extend({}, browserStackConfig, setup))
        .build();
    });

    test.after(function() {
      driver.quit();
    });

    test.it('runs the mocha tests', function() {
      driver.get(config.host + '/test/browser/test.html');
      driver.wait(function() {
        return driver.executeScript('return mocha_finished;').then(function(finished) {
          if (!finished) return false;

          return driver.executeScript('return mocha_stats;').then(function(stats) {
            console.log('    Passes: ' + stats.passes + ', Failures: ' + stats.failures + ', Duration: ' + (stats.duration / 1000).toFixed(2) + 's');
            assert(stats.tests > 0, 'No mocha tests were run');
            if (!stats.failures) return true;

            return driver.executeScript('return mocha_failures;').then(function(failures) {
              for (var i = 0; i < failures.length; ++i) {
                var prefix = '    ' + (i + 1) + '. ';
                console.log(prefix + failures[i][0]);
                console.log(Array(prefix.length + 1).join(' ') + failures[i][1]);
              }
              return true;
            });
          });
        });
      });
    });
  });
});
