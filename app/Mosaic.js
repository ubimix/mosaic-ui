(function(define) {
    define([ 'underscore', 'jquery', 'q', 'L' ], function module(_, $, Q, L) {
        var Mosaic = {};

        // Trigger an event and/or a corresponding method name. Examples:
        //
        // `this.triggerMethod("foo")` will trigger the "foo" event and
        // call the "onFoo" method.
        //
        // `this.triggerMethod("foo:bar") will trigger the "foo:bar" event and
        // call the "onFooBar" method.
        // MK: copy/paste from Marionette.triggerMethod
        Mosaic.triggerMethod = (function() {
            // split the event name on the :
            var splitter = /(^|:)(\w)/gi;
            // take the event section ("section1:section2:section3")
            // and turn it in to uppercase name
            function getEventName(match, prefix, eventName) {
                return eventName.toUpperCase();
            }
            // actual triggerMethod name
            var triggerMethod = function(event) {
                // get the method name from the event name
                var methodName = 'on' + event.replace(splitter, getEventName);
                var method = this[methodName];
                // trigger the event, if a trigger method exists
                if (_.isFunction(this.fire)) {
                    this.fire.apply(this, arguments);
                }
                // call the onMethodName if it exists
                if (_.isFunction(method)) {
                    // pass all arguments, except the event name
                    return method.apply(this, _.tail(arguments));
                }
            };
            return triggerMethod;
        })();

        Mosaic.Class = L.Class.extend({
            includes : L.Mixin.Events,
            triggerMethod : Mosaic.triggerMethod,
            setOptions : function(options) {
                L.setOptions(this, options);
            }
        });

        /**
         * Return a promise for the data loaded from the specified URL
         */
        Mosaic.loadJson = function(url) {
            var deferred = Q.defer();
            $.get(url, function(data) {
                deferred.resolve(data);
            }).fail(function(error) {
                deferred.reject(error);
            });
            return deferred.promise.then(function(data) {
                return data;
            });
        }

        Mosaic.getType = function() {
            var type = this.type = this.type || _.uniqueId('type-');
            return type;
        }
        Mosaic.getId = function() {
            var options = this.options = this.options || {};
            var id = options.id = options.id || _.uniqueId('id-');
            return id;
        }

        Mosaic.Adapter = Mosaic.Class.extend({
            initialize : function() {
                this._adapters = {};
            },
            _getType : function(obj) {
                var type;
                if (_.isString(obj)) {
                    type = obj;
                } else {
                    var o = obj;
                    if (_.isFunction(obj)) {
                        o = obj.prototype;
                    }
                    type = o.type = o.type || _.uniqueId('type-');
                }
                return type;
            },
            _getKey : function(from, to) {
                var fromType = this._getType(from);
                var toType = this._getType(to);
                return fromType + '-' + toType;
            },
            registerAdapter : function(from, to, adapter) {
                var key = this._getKey(from, to);
                this._adapters[key] = adapter;
            },
            getAdapter : function(from, to) {
                var key = this._getKey(from, to);
                return this._adapters[key];
            },
            removeAdapter : function(from, to) {
                var key = this._getKey(from, to);
                var result = this._adapters[key];
                delete this._adapters[key];
                return result;
            }
        });
        Mosaic.Adapter.getInstance = function() {
            if (!this._instance) {
                this._instance = new Mosaic.Adapter();
            }
            return this._instance;
        }

        Mosaic.DataSet = Mosaic.Class.extend({
            getId : Mosaic.getId,
            getType : Mosaic.getType,
            initialize : function(options) {
                this.setOptions(options);
                this._dataSets = {};
            }
        });
        Mosaic.GeoJsonDataSet = Mosaic.DataSet.extend({
            type : 'GeoJsonDataSet',
            getResources : function() {
                var data = this.options.data;
                var list = data && _.isArray(data.features) ? data.features
                        : data;
                list = _.toArray(list);
                return list;
            },
            getResourceId : function(resource) {
                var id = resource.id = resource.id || _.uniqueId('id-');
                return id;
            },
            _isSame : function(first, second) {
                if (!first || !second)
                    return false;
                if (first == second)
                    return true;
                if (this.getResourceId(first) == this.getResourceId(second))
                    return true;
                return false;
            },
            focus : function(resource, force) {
                if (this._isSame(this._focused, resource) && !force) {
                    return;
                }
                if (this._focused) {
                    this.unfocus(this._focused);
                }
                this._focused = resource;
                this.triggerMethod('focus', {
                    resource : resource
                });
            },
            unfocus : function(resource) {
                if (this._isSame(this._focused, resource)) {
                    var r = this._focused;
                    delete this._focused;
                    this.triggerMethod('unfocus', {
                        resource : r
                    });
                }
            },
            activate : function(resource, force) {
                if (this._isSame(this._active, resource) && !force) {
                    return;
                }
                if (this._active) {
                    this.deactivate(this._active);
                }
                this.focus(resource);
                this._active = resource;
                this.triggerMethod('activate', {
                    resource : resource
                });
            },
            deactivate : function(resource) {
                if (this._isSame(this._active, resource)) {
                    var r = this._active;
                    delete this._active;
                    this.triggerMethod('deactivate', {
                        resource : r
                    });
                }
            }
        });
        Mosaic.TilesDataSet = Mosaic.DataSet.extend({
            type : 'TilesDataSet',
            getTilesUrl : function() {
                return this.options.tilesUrl;
            },
            getAttribution : function() {
                return this.options.attribution;
            }
        })
        Mosaic.GeoUtfGridSet = Mosaic.TilesDataSet.extend({
            type : 'GeoUtfGridSet'
        });

        Mosaic.App = Mosaic.Class.extend({
            initialize : function(options) {
                this.setOptions(options);
                this._dataSets = {};
            },
            start : function() {
                this._started = true;
                this.triggerMethod('start', {
                    app : this
                });
                _.each(this._dataSets, function(dataSet) {
                    this.triggerMethod('dataSet:add', {
                        data : dataSet
                    });
                }, this);
            },
            stop : function() {
                _.each(this._dataSets, function(dataSet) {
                    this.triggerMethod('dataSet:remove', {
                        data : dataSet
                    });
                }, this);
                this._started = false;
                this.triggerMethod('stop', {
                    app : this
                });
            },
            getDataSet : function(id) {
                return this._dataSets[id];
            },
            addDataSet : function(dataSet) {
                var id = dataSet.getId();
                this._dataSets[id] = dataSet;
                if (this._started) {
                    this.triggerMethod('dataSet:add', {
                        data : dataSet
                    });
                }
            },
            removeDataSet : function(id) {
                var dataSet = this._dataSets[id];
                if (dataSet) {
                    delete this._dataSets[id];
                    this.triggerMethod('dataSet:remove', {
                        data : dataSet
                    });
                }
            }
        })

        Mosaic.View = Mosaic.Class.extend({
            getId : Mosaic.getId,
            getType : Mosaic.getType,
            getApp : function() {
                return this.options.app;
            },
            initialize : function(options) {
                this.setOptions(options);
                this.triggerMethod('initialize');
                var app = this.getApp();
                app.on('dataSet:add', this.onAddDataSet, this);
                app.on('dataSet:remove', this.onRemoveDataSet, this);
                app.on('start', this.onStart, this);
                app.on('stop', this.onStop, this);
                this._entities = {};
            },
            /** Returns an entity corresponding to the specified key */
            getEntity : function(key) {
                return this._entities[key];
            },
            /** Sets a new entity corresponding to the specified key */
            setEntity : function(key, entity) {
                this._entities[key] = entity;
            },
            /** Removes an entity corresponding to the specified key */
            removeEntity : function(key) {
                var result = this._entities[key];
                delete this._entities[key];
                return result;
            },
            onStart : function(e) {
            },
            onStop : function(e) {
            },
            onAddDataSet : function(e) {
                var dataSet = e.data;
                var adapters = Mosaic.Adapter.getInstance();
                var adapter = adapters.getAdapter(this, dataSet);
                if (adapter && adapter.render) {
                    adapter.render(this, dataSet);
                }
            },
            onRemoveDataSet : function(e) {
                var dataSet = e.data;
                var adapters = Mosaic.Adapter.getInstance();
                var adapter = adapters.getAdapter(this, dataSet);
                if (adapter && adapter.remove) {
                    adapter.remove(this, dataSet);
                }
            }
        });

        Mosaic.MapView = Mosaic.View.extend({
            type : 'MapView',
            getMap : function() {
                return this._map;
            },
            getMaxZoom : function() {
                return this.options.maxZoom || 18;
            },
            getMinZoom : function() {
                return this.options.minZoom || 1;
            },
            getInitialZoom : function() {
                return this.options.initialZoom || 8;
            },
            getInitialCenter : function() {
                return _.toArray(this.options.initialCenter || [ 0, 0 ]);
            },
            getElement : function() {
                var elm = $(this.options.el);
                return elm;
            },
            resetView : function() {
                var zoom = this.getInitialZoom();
                var center = this.getInitialCenter();
                var latlng = L.latLng(center[1], center[0]);
                this._map.setView(latlng, zoom);
                var that = this;
                setTimeout(function() {
                    that._map.invalidateSize();
                }, 100);
            },
            onStart : function(e) {
                var mapOptions = {
                    trackResize : true,
                    loadingControl : true,
                    attributionControl : false
                };
                var element = this.getElement();
                var map = this._map = L.map(element[0], mapOptions);
                var that = this;
                function _updateZoomClassNames() {
                    var zoom = map.getZoom();
                    var maxZoom = that.getMaxZoom();
                    for (var i = 0; i < maxZoom; i++) {
                        var className = 'zoom-' + i;
                        if (i < zoom) {
                            element.addClass(className);
                        } else {
                            element.removeClass(className);
                        }
                    }
                }
                map.on('zoomend', function() {
                    _updateZoomClassNames();
                });
                this.resetView();
            },
            onStop : function() {
                this._map.remove();
                delete this._map;
            }
        })
        Mosaic.ListView = Mosaic.View.extend({
            type : 'ListView',
            getElement : function() {
                return $(this.options.el);
            },
            onStart : function(e) {
                var elm = this.getElement();
                elm.html('<div>List</div>');
            },
            onStop : function() {
                var elm = this.getElement();
                elm.html('');
            }
        })

        return Mosaic;
    });
})(typeof define === 'function' ? define : require('amdefine')(module));
