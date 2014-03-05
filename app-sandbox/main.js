(function(define) {

    require([ '../app/require.config' ], function() {
        require.config({
            baseUrl : '../app',
        });
        require([ 'underscore', 'jquery', 'q', 'Mosaic', 'L' ], module);
    });

    function module(_, $, Q, Mosaic, L) {

        var adapterManager = Mosaic.AdapterManager.getInstance();

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
        Mosaic.MapFigureOptions.registerOptions({
            'Resource' : {
                color : 'green',
                opacity : 0.8
            },
            'rue' : {
                color : 'red',
                opacity : 0.5
            },
            'passage' : {
                color : 'red',
                opacity : 0.5,
                dashArray : '5, 3'
            }
        })

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
            return Mosaic.loadJson(dataUrl).then(function(data) {
                var dataSet = new Mosaic.GeoJsonDataSet({
                    data : data.features
                });
                app.addDataSet(dataSet);
            })
        }).done();

    }
})(typeof define === 'function' ? define : require('amdefine')(module));
