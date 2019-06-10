/**
 * Clean build folder
 */
'use strict';

const gulp = require('gulp'),
      del  = require('del');

module.exports = function(options) {

  return () => {
    return del([
      `themes/${options.theme}/${options.src}/`
    ], { dot: true });
  };
};