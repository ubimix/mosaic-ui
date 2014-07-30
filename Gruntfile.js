var UmxGruntConfig = require('umx-grunt-config');
module.exports = function(grunt) {
    var configurator = new UmxGruntConfig(require, grunt);
    configurator.initBump();
    configurator.initWebpack({
        externals : [ {
            'jquery' : 'jQuery',
            'underscore' : '_',
            'vertx' : 'vertx'
        } ]
    });
    configurator.initKarma();
    configurator.initJshint();
    configurator.initUglify();
    configurator.registerBumpTasks();
    grunt.initConfig(configurator.config);
    grunt.registerTask('test', [ 'jshint', 'karma:continuous' ]);
    grunt.registerTask('build', [ 'webpack', 'test' ]);
    grunt.registerTask('build-min', [ 'build', 'uglify' ]);
    grunt.registerTask('commit', [ 'build-min', 'bump-commit' ]);
    grunt.registerTask('default', [ 'build-min' ]);
}