var gulp = require('gulp');
var mocha = require('gulp-mocha');
var browserify = require('gulp-browserify');
var derequire = require('gulp-derequire');
var rename = require('gulp-rename');

gulp.task('default', ['test', 'build']);

gulp.task('test', function() {
  return gulp
    .src('./test/**/*.js', {read: false})
    .pipe(mocha());
});

gulp.task('build', function() {
  return gulp
    .src('./index.js')
    .pipe(browserify({standalone: 'SolidusClient'}))
    .pipe(derequire())
    .pipe(rename('solidus-client.js'))
    .pipe(gulp.dest('./build'));
});
