// IMPORTS
const { src, series, parallel, dest, watch } = require('gulp');
// Importing all the Gulp-related packages
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const replace = require('gulp-replace');
const imagemin = require('gulp-imagemin');
const gulpMode = require('gulp-mode')(); // perform certain tasks only for --production mode.
const browserSync = require('browser-sync').create();
const del = require('del');

// CONST & VARIABLES
const DEST_DIRECTORY = 'dist';

const FILE_PATHS = {
	html: {
		src: 'app/*.html',
		dest: DEST_DIRECTORY,
	},
	scss: {
		src: 'app/scss/**/*.scss',
		dest: `${DEST_DIRECTORY}/css`,
		destFileName: 'styles.css',
	},
	js: {
		src: ['app/js/vendor/**/*.js', 'app/js/*.js'],
		dest: `${DEST_DIRECTORY}/js`,
		destFileName: 'script.js',
	},
	images: {
		src: 'app/images/**/*',
		dest: `${DEST_DIRECTORY}/images`,
	},
};

/////////////////
// GULP TASKS //
////////////////

// SCSS TASK: creates a minified styles.css file in DESTINATION FOLDER
function scssBuilTask() {
	return src(FILE_PATHS.scss.src)
		.pipe(gulpMode.development(sourcemaps.init())) // initialize sourcemaps first
		.pipe(sass().on('error', sass.logError)) // compile SCSS to CSS
		.pipe(concat(FILE_PATHS.scss.destFileName))
		.pipe(gulpMode.production(postcss([autoprefixer(), cssnano()]))) // PostCSS plugins
		.pipe(sourcemaps.write('.')) // write sourcemaps file in current directory
		.pipe(dest(FILE_PATHS.scss.dest)) // put final CSS in dist folder
		.pipe(browserSync.stream());
}

// JS: concatenates and uglifies JS files to script.js
function jsTask() {
	return src(FILE_PATHS.js.src)
		.pipe(concat(FILE_PATHS.js.destFileName))
		.pipe(gulpMode.production(uglify()))
		.pipe(dest(FILE_PATHS.js.dest));
}

// Image: Compress image and move it to dist folder.
function imageTask() {
	return src(FILE_PATHS.images.src)
		.pipe(
			gulpMode.production(
				imagemin(
					[
						imagemin.gifsicle({ interlaced: true }),
						imagemin.mozjpeg({ quality: 65, progressive: true }),
						imagemin.optipng({ optimizationLevel: 6 }),
						imagemin.svgo({
							plugins: [
								{ removeViewBox: true },
								{ cleanupIDs: true },
							],
						}),
					],
					{
						verbose: false,
					}
				)
			)
		)
		.pipe(dest(FILE_PATHS.images.dest));
}

// CACHEBUST: replace '?cb={number}' string in html files to enable cache busting for css
// Uses gulp replace to find ?cb and replace it with timestamp
function cacheBustTask() {
	var cbString = new Date().getTime(); // get new cb based on current time
	return src(FILE_PATHS.html.src)
		.pipe(replace(/cb=\d+/g, 'cb=' + cbString))
		.pipe(dest(FILE_PATHS.html.dest));
}

function cleanBuilds() {
	return del(`${DEST_DIRECTORY}/**'`, { force: true });
}
// Watch task: watch SCSS, JS and HTML files for changes
function watchTask() {
	browserSync.init({
		server: {
			baseDir: `./${DEST_DIRECTORY}`,
		},
	});
	watch(
		[FILE_PATHS.scss.src],
		{ interval: 1000, usePolling: true },
		scssBuilTask
	);

	watch([...FILE_PATHS.js.src], jsTask);
	watch([FILE_PATHS.html.src], series(cacheBustTask, browserSync.reload));
}

exports.serve = series(
	cleanBuilds,
	parallel(scssBuilTask, jsTask, imageTask),
	cacheBustTask,
	watchTask
);

exports.build = series(
	cleanBuilds,
	parallel(scssBuilTask, jsTask, imageTask),
	cacheBustTask
);
