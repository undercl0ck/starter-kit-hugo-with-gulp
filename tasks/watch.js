/**
 * Watch for file changes
 */
'use strict';

const gulp = require('gulp');

module.exports = function (options) {
  const { files } = options.sassFilesInfo;

  return () => {
    gulp.watch(`./themes/${options.theme}/${options.src}/js/**/*`, gulp.series(options.tasks.buildCustomJs, options.tasks.esLint));

    gulp.watch(`./themes/${options.theme}/${options.src}/scss/**/*`, gulp.series(options.tasks.buildSass));
    
    if (files.length > 0) {
      gulp.watch(files, gulp.series(options.tasks.buildSassFiles));
    }
  };

};