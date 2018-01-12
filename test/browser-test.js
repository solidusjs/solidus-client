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
  {browserName: 'Chrome'},
  {browserName: 'Safari', browser_version: '11.0'},
  {browserName: 'Safari', browser_version: '10.1'},
  {browserName: 'Safari', browser_version: '9.1'},
  {browserName: 'IE', browser_version: '11.0'},
  {browserName: 'IE', browser_version: '10.0'},
  {browserName: 'IE', browser_version: '9.0'},
  {browserName: 'Edge', browser_version: '16.0'},
  {browserName: 'Edge', browser_version: '15.0'},
  {browserName: 'Edge', browser_version: '14.0'},
  {browserName: 'Firefox'},
  {browserName: 'Opera'},
  {device: 'iPhone X', realMobile: true},
  {device: 'iPhone 8', realMobile: true},
  {device: 'iPhone 7', realMobile: true},
  {device: 'iPad 5th', realMobile: true},
  {device: 'Samsung Galaxy Note 8', realMobile: true},
  {device: 'Samsung Galaxy S8', realMobile: true},
  {device: 'Samsung Galaxy S7', realMobile: true},
  {device: 'Samsung Galaxy S6', realMobile: true},
  {device: 'Samsung Galaxy Note 4', realMobile: true},
  {device: 'Motorola Moto X 2nd Gen', realMobile: true},
  {device: 'Motorola Moto X 2nd Gen', os_version: '5.0', realMobile: true},
  {device: 'Google Pixel', realMobile: true},
  {device: 'Google Pixel', os_version: '7.1', realMobile: true},
  {device: 'Google Nexus 6', realMobile: true},
  {device: 'Google Nexus 5', realMobile: true},
  {device: 'Google Nexus 9', realMobile: true}
];

setups.forEach(function (setup) {
  test.describe(_.compact([setup.device, setup.os_version, setup.browserName, setup.browser_version]).join(', '), function() {
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
