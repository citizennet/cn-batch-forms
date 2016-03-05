// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint        = require('gulp-jshint');
var sourcemaps    = require('gulp-sourcemaps');
var babel         = require('gulp-babel');
var concat        = require('gulp-concat');
var rename        = require('gulp-rename');
var uglify        = require('gulp-uglify');
var templateCache = require('gulp-angular-templatecache');

// Lint Task
gulp.task('lint', function() {
  return gulp.src('src/*.js')
      .pipe(jshint({
        multistr: true,
        validthis: true,
        evil: true,
        esnext: true
      }))
      .pipe(jshint.reporter('default'));
});

// Add templates to templateCache
gulp.task('templates', function() {
  return gulp.src('src/templates/*.html')
      .pipe(templateCache({
        root: 'cn-batch-forms',
        module: 'cn.batch-forms'
      }))
      .pipe(gulp.dest('src'));
});

// Concatenate & Transpile JS
gulp.task('scripts', function () {
  return gulp.src('src/*.js')
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(concat('all.js'))
      .pipe(gulp.dest('dist'))
      .pipe(rename('all.min.js'))
      .pipe(uglify())
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('dist'));
});

// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch(['src/templates/*.html', 'src/*.js'], ['lint', 'templates', 'scripts']);
});

// Build Task
gulp.task('build', ['lint', 'templates', 'scripts']);


// Default Task
gulp.task('default', ['build', 'watch']);