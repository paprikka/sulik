// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var jshint    = require('gulp-jshint');
var html2js   = require('gulp-html2js');
var less      = require('gulp-less');
var concat    = require('gulp-concat');
var uglify    = require('gulp-uglify');
var rename    = require('gulp-rename');

var config = require('./config');
// Lint Task
gulp.task('lint', function() {
  gulp.src( config.app.base + 'src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Compile Our less
gulp.task('less', function() {
  gulp.src( config.app.base + 'styles/**/*.less')
    .pipe(less())
    .pipe(gulp.dest( config.dist.base + '/css'));
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
  gulp.src( config.app.base + 'src/**/*.js')
    .pipe(concat('app.js'))
    .pipe(gulp.dest(config.dist.base + '/js'))
    .pipe(rename('app.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(config.dist.base + '/js'));
});


gulp.task('assets', function(){
  gulp.src( config.app.base + 'assets/**/*.*')
    .pipe(gulp.dest( config.dist.base ))
});

// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch(config.app.base + '**/*.js', ['lint', 'scripts']);
  gulp.watch(config.app.base + 'styles/**/*.less', ['less']);
  gulp.watch(config.app.base + 'assets/**/*.*', ['assets']);
});

// Default Task
gulp.task('default', ['lint', 'less', 'scripts', 'watch']);