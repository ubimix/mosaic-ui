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
        });

        Mosaic.ResourceView = Mosaic.TemplateView
                .extend({
                    template : '' + '<div>' + '<h3 data-render="renderTitle" '
                            + ' data-action-click="activateResource"></h3>'
                            + '<div data-render="renderDescription"></div>'
                            + +'</div>',
                    renderTitle : function(el) {
                        var resource = this.options.resource;
                        el.text(resource.properties.label);
                    },
                    renderDescription : function(el) {
                        var resource = this.options.resource;
                        el.html(resource.properties.description);
                    },
                    activateResource : function(ev) {
                        this.options.data.activate(this.options.resource);
                    }
                });

        Mosaic.MapFocusedPopupView.registerViews({
            'Resource' : Mosaic.ResourceView.extend({
                template : 'Cou-cou!'
            }),
            'photo' : Mosaic.ResourceView.extend({
                template : 'This is a photo!'
            }),
        });

        Mosaic.MapActivePopupView.registerViews({
            'Resource' : Mosaic.ResourceView.extend({
                template : 'COU-COU!'
            }),
            'photo' : Mosaic.ResourceView.extend({
                template : 'PHOTO!'
            }),
            'rue' : Mosaic.ResourceView.extend({
                template : '' + '<div>' + '<strong data-render="renderTitle" '
                        + ' data-action-click="sayHello"></strong>'
                        + '<div data-render="renderDescription"></div>'
                        + +'</div>',
                sayHello : function(ev) {
                    alert('Hello, there')
                }
            }),
        })

        Mosaic.ListItemView.registerViews({
            'Resource' : Mosaic.ResourceView,
            'rue' : Mosaic.ResourceView,
            'photo' : Mosaic.ResourceView,
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
