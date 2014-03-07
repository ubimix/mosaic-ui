(function(define) {

    require([ '../app/require.config' ], function() {
        require.config({
            baseUrl : '../app',
        });
        require([ 'underscore', 'jquery', 'q', 'Mosaic', 'L',
                "text!../app-sandbox/main.template.html" ], module);
    });

    function module(_, $, Q, Mosaic, L, templateHtml) {

        var adapterManager = Mosaic.AdapterManager.getInstance();

        Mosaic.registerViewAdapters(templateHtml);
        Mosaic.registerMapOptions(templateHtml);

        /* ------------------------------------------------- */
        Mosaic.DebugDataSet = Mosaic.DataSet.extend({});
        adapterManager.registerAdapter(Mosaic.MapView, Mosaic.DebugDataSet,
                Mosaic.ViewAdapter.extend({
                    render : function(view, data) {
                        var map = view.getMap();
                        map.on('click', function(e) {
                            console.log(map.getZoom(), '[' + e.latlng.lng + ','
                                    + e.latlng.lat + ']');
                        })
                    }
                }));

        var app = new Mosaic.App();
        var map = new Mosaic.MapView({
            app : app,
            el : $('#map'),
            maxZoom : 22,
            initialZoom : 16,
            initialCenter : [ 2.3493146896362305, 48.86837765133066 ]
        })
        var list = new Mosaic.ListView({
            app : app,
            el : $('#list')
        })
        app.start();

        function updateSize() {
            var win = $(window);
            var width = win.width();
            var height = win.height();
            $('.full-height').each(function() {
                var e = $(this);
                var top = e.offset().top;
                e.height(height - top);
            })
        }
        $(window).resize(updateSize);
        $(updateSize);

        var tilesUrl = "http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png";
        var tilesUrl = 'http://127.0.0.1:8888/tiles/app-econovista/osm-bright/{z}/{x}/{y}.png';
        app.addDataSet(new Mosaic.TilesDataSet({
            tilesUrl : tilesUrl,
        }));
        app.addDataSet(new Mosaic.DebugDataSet());
        Q().then(function() {
            var dataUrl = './data/data.json';
            return loadJson(dataUrl).then(function(data) {
                var dataSet = new Mosaic.GeoJsonDataSet({
                    data : data.features
                });
                app.addDataSet(dataSet);
            })
        }).done();

        /**
         * Return a promise for the data loaded from the specified URL
         */
        function loadJson(url) {
            var deferred = Q.defer();
            $.get(url, function(data) {
                deferred.resolve(data);
            }).fail(function(error) {
                deferred.reject(error);
            });
            return deferred.promise;
        }

    }
})(typeof define === 'function' ? define : require('amdefine')(module));
