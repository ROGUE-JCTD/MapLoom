/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  /**
   * The `build_dir` folder is where our projects are compiled during
   * development and the `compile_dir` folder is where our app resides once it's
   * completely built.
   */
  build_dir: 'build',
  compile_dir: 'bin',

  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, less tests. `ctpl` contains
   * our reusable components' (`src/common`) template HTML files, while
   * `atpl` contains the same, but for our app's code. `html` is just our
   * main HTML file, `less` is our main stylesheet, and `unit` contains our
   * app's unit tests.
   */
  app_files: {
    js: [ 'src/**/*.js', '!src/**/*Spec.js', '!src/**/*.spec.js', '!src/assets/**/*.js' ],
    jsunit: [ 'src/**/*.spec.js', 'src/**/*Spec.js' ],

    coffee: [ 'src/**/*.coffee', '!src/**/*.spec.coffee' ],
    coffeeunit: [ 'src/**/*.spec.coffee' ],

    atpl: [ 'src/app/**/*.tpl.html' ],
    ctpl: [ 'src/common/**/*.tpl.html' ],

    html: [ 'src/index.html' ],
    less: 'src/less/main.less'
  },

  /**
   * This is a collection of files used during testing only.
   */
  test_files: {
    js: [
      'vendor/angular-mocks/angular-mocks.js'
    ]
  },

  /**
   * This is the same as `app_files`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `app_files` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendor_files.js`.
   *
   * The `vendor_files.js` property holds files to be automatically
   * concatenated and minified with our project source files.
   *
   * The `vendor_files.css` property holds any CSS files to be automatically
   * included in our app.
   *
   * The `vendor_files.assets` property holds any assets to be copied along
   * with our app's assets. This structure is flattened, so it is not
   * recommended that you use wildcards.
   */
  vendor_files: {
    js: [
      'vendor/jquery/jquery.min.js',
      'vendor/jquery-sortable/source/js/jquery-sortable-min.js',
      'vendor/angular/angular.js',
      'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'vendor/placeholders/angular-placeholders-0.0.1-SNAPSHOT.min.js',
      'vendor/angular-ui-router/release/angular-ui-router.js',
      'vendor/angular-ui-utils/modules/route/route.js',
      'vendor/bootstrap/dist/js/bootstrap.js',
      'vendor/moment/min/moment.min.js',
      'vendor/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.min.js',
      'vendor/bootstrap3-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
      'vendor/bootstrap3-datetimepicker/src/js/locales/bootstrap-datetimepicker.es.js',
      'vendor/x2js/xml2json.min.js',
      'vendor/angular-translate/angular-translate.js',
      'vendor/angular-cookies/angular-cookies.js',
      'vendor/angular-sanitize/angular-sanitize.js',
      'vendor/closure-library/closure/goog/base.js',
      'vendor/closure-library/closure/goog/deps.js',
      'vendor/proj4js/proj4.js',
      'vendor/proj4js/epsg.js',
      'vendor/ol3/ol-debug.js',
      'vendor/d3/d3.min.js',
      'vendor/proj4/dist/proj4-src.js',
      'vendor/vis/dist/vis.min.js',
      'vendor/nouislider/distribute/jquery.nouislider.min.js',
      'vendor/story-tools/dist/story-tools-core.js',
      'vendor/story-tools/dist/story-tools-core-tpls.js',
      'vendor/story-tools/dist/story-tools-core-ng.js',
      'vendor/story-tools/dist/story-tools-edit.js',
      'vendor/story-tools/dist/story-tools-edit-ng.js',
      'vendor/story-tools/dist/story-tools-edit-tpls.js',
      'vendor/story-tools/dist/ows.js',
      'vendor/toastr/toastr.js',
      'vendor/hopscotch/dist/js/hopscotch.min.js',


      //-- files for image gallery
      'vendor/blueimp-gallery/js/blueimp-gallery.js',
      'vendor/blueimp-gallery/js/blueimp-gallery-fullscreen.js',
      'vendor/blueimp-gallery/js/blueimp-gallery-indicator.js',
      'vendor/blueimp-gallery/js/blueimp-helper.js',
      'vendor/blueimp-gallery/js/jquery-blueimp-gallery.js',
      'vendor/blueimp-bootstrap-image-gallery/js/bootstrap-image-gallery.js',
      'vendor/bootstrap-sortable/Scripts/bootstrap-sortable.js',
      'vendor/angular-xeditable/dist/js/xeditable.min.js'
    ],
    css: [
      'vendor/ol3/ol.css',

      //-- files for image gallery
      'vendor/blueimp-gallery/css/blueimp-gallery.css',
      'vendor/blueimp-gallery/css/blueimp-gallery-indicator.css',
      'vendor/blueimp-bootstrap-image-gallery/css/bootstrap-image-gallery.css',
      'vendor/angular-bootstrap-colorpicker/css/colorpicker.min.css',
      'vendor/bootstrap3-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
      'vendor/bootstrap-sortable/Contents/bootstrap-sortable.css',
      'vendor/angular-xeditable/dist/css/xeditable.css',
      'vendor/story-tools/dist/story-tools-edit.css',

      'vendor/vis/dist/vis.min.css',
      'vendor/nouislider/distribute/jquery.nouislider.min.css',

      'vendor/font-awesome/css/font-awesome.min.css',

      'vendor/toastr/toastr.css',

      'vendor/hopscotch/dist/css/hopscotch.min.css'
    ],
    assets: [
      'vendor/blueimp-gallery/img/*',
      'vendor/blueimp-bootstrap-image-gallery/img/*'
    ],
    fonts: [
      'vendor/bootstrap/fonts/*',
      'vendor/font-awesome/fonts/*',
      'vendor/open-sans-condensed/*'
    ]
  }
};
