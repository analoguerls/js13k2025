/// <binding BeforeBuild='copyToRoot' Clean='copyToRoot' />
import checkFileSize from 'gulp-check-filesize';
import concat from 'gulp-concat';
import deleteFiles from 'gulp-rimraf';
import gulp from 'gulp';
import imagemin from 'gulp-imagemin';
import minifyCSS from 'gulp-clean-css';
import minifyHTML from 'gulp-minify-html';
import minifyJS from 'gulp-terser';
import replace from 'gulp-replace';
import replaceHTML from 'gulp-html-replace';
import zip from 'gulp-zip';

const paths = {
    dist: {
        css: 'style.min.css',
        dir: 'dist',
        images: 'dist/images',
        js: 'script.min.js'
    },
    src: {
        css: 'src/css/**.css',
        html: 'src/**.html',
        images: 'src/images/**',
        js: 'src/js/**.js'
    }
};

gulp.task('cleanDist', () => gulp.
    src('dist/**/*', {
        read: false
    }).pipe(deleteFiles()));

gulp.task('copyToRoot', () => gulp.
    src('src/**/*').
    pipe(replace(/'\.\.\/\.\.\/node_modules\/kontra\/kontra'/gu, '\'https://unpkg.com/kontra@10.0.2/kontra.mjs\'')).
    pipe(gulp.dest('wwwroot')));

gulp.task('buildHTML', () => gulp.
    src(paths.src.html).
    pipe(replaceHTML({
        css: paths.dist.css,
        js: paths.dist.js
    })).
    pipe(minifyHTML()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('buildCSS', () => gulp.
    src(paths.src.css).
    pipe(concat(paths.dist.css)).
    pipe(minifyCSS()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('buildJS', () => gulp.
    src(paths.src.js).
    pipe(concat(paths.dist.js)).
    pipe(minifyJS()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('optimizeImages', () => gulp.
    src(paths.src.images).
    pipe(imagemin()).
    pipe(gulp.dest(paths.dist.images)));

gulp.task('zip', () => {
    const thirteenKb = 13 * 1024;

    gulp.src('zip/*').
        pipe(deleteFiles());

    return gulp.src(`${paths.dist.dir}/**`).
        pipe(zip('game.zip')).
        pipe(gulp.dest('zip')).
        pipe(checkFileSize({
            fileSizeLimit: thirteenKb
        }));
});

gulp.task('build', gulp.series(
    'cleanDist',
    gulp.parallel('buildHTML', 'buildCSS', 'buildJS', 'optimizeImages'),
    'zip'
));

gulp.task('watch', () => {
    gulp.watch(paths.src.html, gulp.series('buildHTML', 'zip'));
    gulp.watch(paths.src.css, gulp.series('buildCSS', 'zip'));
    gulp.watch(paths.src.js, gulp.series('buildJS', 'zip'));
    gulp.watch(paths.src.images, gulp.series('optimizeImages', 'zip'));
});

gulp.task('default', gulp.series(
    'build',
    'watch'
));
