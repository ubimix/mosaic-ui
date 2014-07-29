// Karma configuration file
//
// For all available config options and default values, see:
// https://github.com/karma-runner/karma/blob/stable/lib/config.js#L54

module.exports = function(config) {
    'use strict';

    config.set({
        basePath : '',
        frameworks : [ 'mocha' ],
        // list of files / patterns to load in the browser
        files : [ //
        'libs/jquery/dist/jquery.js',//
        'libs/underscore/underscore.js',//
        'libs/expect/index.js',//
        'libs/mocha/mocha.js',//
        // this name is defined in the package.json as the "appname" field
        'dist/MosaicUI.js', // 
        'test/*_spec.js' //
        ],

        // list of files to exclude
        exclude : [],

        // use dots reporter, as travis terminal does not support escaping
        // sequences possible values: 'dots', 'progress'
        // CLI --reporters progress
        reporters : [ 'progress' ],

        // enable / disable watching file and executing tests whenever any file
        // changes
        // CLI --auto-watch --no-auto-watch
        autoWatch : true,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        // CLI --browsers Chrome, Firefox, Safari
        browsers : [ 'Chrome', 'Firefox', 'PhantomJS' ],

        // If browser does not capture in given timeout [ms], kill it
        // CLI --capture-timeout 5000
        captureTimeout : 20000,

        // Auto run tests on start (when browsers are captured) and exit
        // CLI --single-run --no-single-run
        singleRun : false

    });
};
