var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var browserify = require('gulp-browserify');
var derequire = require('gulp-derequire');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var http = require('http');
var config = require('./test/config');
var server;

gulp.task('default', ['build']);

gulp.task('build', function() {
  return gulp
    .src('./index.js')
    .pipe(browserify({standalone: 'SolidusClient'}))
    .pipe(derequire())
    .pipe(rename('solidus-client.js'))
    .pipe(gulp.dest('./build'));
});

gulp.task('build-test', function() {
  return gulp
    .src('./test/tests.js')
    .pipe(browserify())
    .pipe(gulp.dest('./test/browser'));
});

gulp.task('test', function(callback) {
  runSequence('startServer', 'mocha', function() {
    runSequence('stopServer', callback);
  });
});

gulp.task('test-browser', function(callback) {
  runSequence('build-test', 'startServer', callback);
});

gulp.task('startServer', function(callback) {
  server = http
    .createServer(config.routes)
    .listen(config.port, function() {
      gutil.log('Test server listening on', gutil.colors.green(config.host));
      callback();
    });
});

gulp.task('stopServer', function(callback) {
  server.close(callback);
});

gulp.task('mocha', function(callback) {
  gulp
    .src('./test/tests.js', {read: false})
    .pipe(mocha())
    .on('end', callback)
    .on('error', function() {});
});
