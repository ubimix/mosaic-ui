(function(define) {

    require([ '../app/require.config' ], function() {
        require.config({
            baseUrl : '../app',
        });
        require([ 'underscore', 'jquery', 'q', 'Mosaic', 'L' ], module);
    });

    function module(_, $, Q, Mosaic, L) {

        var adapters = Mosaic.Adapter.getInstance();
        adapters.registerAdapter(Mosaic.MapView, Mosaic.TilesDataSet, {
            render : function(view, data) {
                var map = view.getMap();
                var id = data.getId();
                var tilesUrl = data.getTilesUrl();
                var maxZoom = view.getMaxZoom();
                var layer = L.tileLayer(tilesUrl, {
                    attribution : data.getAttribution(),
                    maxZoom : maxZoom
                }).addTo(map);
                console.log(tilesUrl, map, maxZoom)
                view.setEntity(data.getId(), layer);
            },
            remove : function(view, data) {
                var layer = view.removeEntity(data.getId());
                if (layer) {
                    var map = view.getMap();
                    map.removeLayer(layer);
                }
            }
        });

        Mosaic.ViewAdapter = Mosaic.Class.extend({
            clearListeners : function() {
                _.each(this._listeners, function(listener) {
                    listener.obj.off(listener.event, listener.handler,
                            listener.context);
                })
                delete this._listeners;
            },
            listenTo : function(obj, event, handler, context) {
                var listeners = this._listeners = this._listeners || [];
                obj.on(event, handler, context);
                listeners.push({
                    obj : obj,
                    event : event,
                    handler : handler,
                    context : context
                });
            }
        });

        adapters.registerAdapter( //
        Mosaic.MapView, Mosaic.GeoJsonDataSet, new (Mosaic.ViewAdapter.extend({

            render : function(view, data) {
                var map = view.getMap();
                // FIXME : remove it
                map.on('click', function(e) {
                    console.log(map.getZoom(), '[' + e.latlng.lng + ','
                            + e.latlng.lat + ']');
                })
                var list = _.filter(data.getResources(), function(feature) {
                    var geom = feature.geometry;
                    if (!geom || !geom.coordinates || !geom.coordinates.length)
                        return false;
                    return feature;
                });

                var info = {
                    index : {}
                };
                info.layer = L.geoJson(list, {
                    style : function(resource) {
                        return {
                            // FIXME: define resource visualization
                            // based on the resource type
                            color : resource.properties.color
                        };
                    },
                    onEachFeature : function(resource, layer) {
                        var resourceId = data.getResourceId(resource);
                        info.index[resourceId] = layer;
                        layer.on('mouseover', function() {
                            data.focus(resource);
                        })
                        layer.on('mouseout', function() {
                            data.unfocus(resource);
                        })
                        layer.on('click', function() {
                            data.activate(resource);
                        })
                    }
                }).addTo(map);

                this.listenTo(data, 'activate', function(e) {
                    var resource = e.resource;
                    var id = data.getResourceId(resource);
                    var layer = info.index[id];
                    layer.bindPopup(resource.description).openPopup();
                    console.log('* Activate: ', e)
                });
                this.listenTo(data, 'deactivate', function(e) {
                    console.log('* Deactivate: ', e)
                })
                this.listenTo(data, 'focus', function(e) {
                    console.log('* Focus: ', e)
                })
                this.listenTo(data, 'unfocus', function(e) {
                    console.log('* Unfocus: ', e)
                })

                var id = data.getId();
                view.setEntity(id, info);

            },
            remove : function(view, data) {
                var info = view.removeEntity(data.getId());
                if (info) {
                    var map = view.getMap();
                    map.removeLayer(info.layer);
                    this.clearListeners();
                }
            }
        })));

        adapters.registerAdapter(Mosaic.ListView, Mosaic.GeoJsonDataSet, {
            render : function(view, data) {
                var container = $('<div></div>');
                view.setEntity(data.getId(), container);

                var element = view.getElement();
                element.append(container);

                var list = data.getResources();
                list = _.toArray(list);
                _.each(list, function(resource) {
                    var str = JSON.stringify(resource.properties.label);
                    str = '<p>' + str + '</p>';
                    container.append(str);
                })
            },
            remove : function(view, data) {
                var container = view.removeEntity(data.getId());
                if (container) {
                    container.remove();
                }
            }
        });

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
