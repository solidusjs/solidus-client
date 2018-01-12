var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var browserify = require('gulp-browserify');
var derequire = require('gulp-derequire');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var http = require('http');
var BrowserStackTunnel = require('browserstacktunnel-wrapper');

var config = require('./test/config');

gulp.task('default', ['build']);

gulp.task('build', function() {
  return gulp
    .src('./index.js')
    .pipe(browserify({standalone: 'SolidusClient'}))
    .pipe(derequire())
    .pipe(rename('solidus-client.js'))
    .pipe(gulp.dest('./build'));
});

gulp.task('test', function(callback) {
  runSequence(
    ['build-browser-test', 'start-test-server', 'start-browserstack-tunnel'],
    'run-node-test',
    'run-browser-test',
    function() {
      runSequence(
        ['stop-test-server', 'stop-browserstack-tunnel'],
        callback);
    }
  );
});

gulp.task('node-test', function(callback) {
  runSequence(
    'start-test-server',
    'run-node-test',
    function() {
      runSequence(
        'stop-test-server',
        callback);
    }
  );
});

gulp.task('browser-test', function(callback) {
  runSequence(
    ['build-browser-test', 'start-test-server', 'start-browserstack-tunnel'],
    'run-browser-test',
    function() {
      runSequence(
        ['stop-test-server', 'stop-browserstack-tunnel'],
        callback);
    }
  );
});

gulp.task('test-server', function(callback) {
  runSequence(
    ['build-browser-test', 'start-test-server'],
    callback);
});

// TASKS

gulp.task('build-browser-test', function() {
  return gulp
    .src('./test/test.js')
    .pipe(browserify())
    .pipe(gulp.dest('./test/browser'));
});

var test_server;
gulp.task('start-test-server', function(callback) {
  test_server = http
    .createServer(config.routes)
    .listen(config.port, function() {
      gutil.log('Test server started on', gutil.colors.green(config.host));
      gutil.log('Run manual tests on', gutil.colors.green(config.host + '/test/browser/test.html'));
      callback();
    });
});

gulp.task('stop-test-server', function(callback) {
  test_server.close(callback);
});

var browserstack_tunnel;
gulp.task('start-browserstack-tunnel', function(callback) {
  browserstack_tunnel = new BrowserStackTunnel({
    key: 'TODO',
    v: true
  });

  browserstack_tunnel.start(function(err) {
    if (!err) gutil.log('BrowserStack tunnel started');
    callback(err);
  });
});

gulp.task('stop-browserstack-tunnel', function(callback) {
  browserstack_tunnel.stop(callback);
});

gulp.task('run-node-test', function(callback) {
  gulp
    .src('./test/test.js', {read: false})
    .pipe(mocha())
    .on('end', callback)
    .on('error', function() {});
});

gulp.task('run-browser-test', function(callback) {
  gulp
    .src('./test/browser-test.js', {read: false})
    .pipe(mocha({timeout: 60000}))
    .on('end', callback)
    .on('error', function() {});
});
