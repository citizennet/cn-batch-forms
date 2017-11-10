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
var tape          = require('gulp-tape');
var tapColorize   = require('tap-colorize');
var spawn         = require('child_process').spawn;

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

// Run Test
gulp.task('test', (done) => {
  return gulp
  .src('tests/output/test.bundle.js')
  .pipe(tape({
    reporter: tapColorize()
  }));
});

const setupWatch = watch => {
  watch.stdout.on('data',
    data => console.log(`webpack stdout: ${data}`));
  watch.stderr.on('data',
    data => console.log(`webpack stderr: ${data}`));
  watch.on('close',
    code => console.log(`webpack process exited with code ${code}`));
  return watch;
}

const runWebpack = (params=[]) =>
  setupWatch(spawn(`${bin}/webpack`, params))

const testConfig = 'tests/webpack.test.config.js';

gulp.task('webpack:dev', () =>
  runWebpack(['--color'])
);

gulp.task('webpack:test', () =>
  runWebpack([
    '--color',
    '--config',
    testConfig
  ])
);

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
  gulp.watch(['src/*.spec.js'], ['webpack:test']);
  gulp.watch(['tests/output/test.bundle.js'], ['test']);
});

// Build Task
gulp.task('build', ['lint', 'templates', 'scripts']);


// Default Task
gulp.task('default', ['build', 'watch']);
