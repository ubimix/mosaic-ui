require([ '../app/require.config' ], function() {
    require.config({
        baseUrl : '../app',
    });
    require([ 'underscore', 'jquery', 'Mosaic' ], module);
    function module(_, $, Mosaic) {
        $('body').html('Hello, there!');
    }
})
