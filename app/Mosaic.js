(function(define) {
    define([ 'underscore', 'jquery', 'q', 'L' ], function module(_, $, Q, L) {
        var Mosaic = {};

        // Trigger an event and/or a corresponding method name.
        // Examples:
        //
        // `this.triggerMethod("foo")` will trigger the "foo" event and
        // call the "onFoo" method.
        //
        // `this.triggerMethod("foo:bar") will trigger the "foo:bar"
        // event and
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

        /* --------------------------------------------------- */
        /* Mix-in methods */

        /**
         * A basic mix-in method used to defined the type of the parent class.
         */
        Mosaic.getType = function() {
            var type = this.type = this.type || _.uniqueId('type-');
            return type;
        }
        /**
         * This mix-in method returns a unique identifier for instances of the
         * parent class.
         */
        Mosaic.getId = function() {
            var options = this.options = this.options || {};
            var id = options.id = options.id || _.uniqueId('id-');
            return id;
        }

        /**
         * An adapter manager used to register/retrieve objects corresponding to
         * the types of adaptable object and the types of the target object.
         * This object is used by views to get view adapters.
         */
        Mosaic.AdapterManager = Mosaic.Class.extend({
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
            newAdapterInstance : function(from, to) {
                var AdapterType = this.getAdapter(from, to);
                var result = null;
                if (_.isFunction(AdapterType)) {
                    var args = _.toArray(arguments);
                    args.splice(0, 2);
                    result = new AdapterType();
                }
                return result;
            },
            removeAdapter : function(from, to) {
                var key = this._getKey(from, to);
                var result = this._adapters[key];
                delete this._adapters[key];
                return result;
            }
        });
        Mosaic.AdapterManager.getInstance = function() {
            if (!this._instance) {
                this._instance = new Mosaic.AdapterManager();
            }
            return this._instance;
        }

        /**
         * A common super-class for all "data sets" giving access to resources.
         * Each dataset could be seen as a collection of resources.
         */
        Mosaic.DataSet = Mosaic.Class.extend({
            /** Returns a unique identifier of this dataset */
            getId : Mosaic.getId,
            /**
             * Returns the logical type of this dataset. This value should be
             * defined as a "type" field in subclasses.
             */
            getType : Mosaic.getType,

            /**
             * Initializes internal fields for objects of this type.
             */
            initialize : function(options) {
                this.setOptions(options);
                this._dataSets = {};
            },
            /**
             * Returns a static adapter for the specified resource. If there is
             * no adapters were found for the resource type then this method
             * tries to get an adapter for parent types.
             */
            getResourceAdapter : function(resource, adapterType) {
                var adapters = Mosaic.AdapterManager.getInstance();
                var adapter = null;
                var resourceType = this.getResourceType(resource);
                while (adapter == null & resourceType != null) {
                    adapter = adapters.getAdapter(resourceType, adapterType);
                    var parentType = this.getParentResourceType(resourceType);
                    resourceType = parentType;
                }
                return adapter;
            },
            /**
             * Returns an identifier of the specified resource. If the given
             * resource does not have one then this method creates and adds a
             * temporary ID.
             */
            getResourceId : function(resource) {
                var id = resource.id = resource.id || _.uniqueId('id-');
                return id;
            },
            /**
             * Returns a string representing a type of the specified resource.
             */
            getResourceType : function(resource) {
                if (!resource)
                    return null;
                var properties = resource.properties || {};
                var type = properties.type;
                return type || 'Resource';
            },
            /** Returns a parent for the specified type. */
            getParentResourceType : function(type) {
                if (!type || type == '')
                    return null;
                var idx = type.lastIndexOf('/');
                if (idx > 0)
                    type = type.substring(0, idx);
                else
                    type = null;
                return type;
            }
        });

        /**
         * This dataset is used as a wrapper for a collection of GeoJSON
         * objects.
         */
        Mosaic.GeoJsonDataSet = Mosaic.DataSet.extend({
            type : 'GeoJsonDataSet',
            getResources : function() {
                var data = this.options.data;
                var list = data && _.isArray(data.features) ? data.features
                        : data;
                list = _.toArray(list);
                return list;
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
                    this.blur(this._focused);
                }
                this._focused = resource;
                this.triggerMethod('focus', {
                    resource : resource
                });
            },
            blur : function(resource) {
                if (this._isSame(this._focused, resource)) {
                    var r = this._focused;
                    delete this._focused;
                    this.triggerMethod('blur', {
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

        /**
         * This dataset corresponds to static map tiles. It don't have any
         * data/resources.
         */
        Mosaic.TilesDataSet = Mosaic.DataSet.extend({
            type : 'TilesDataSet',
            getTilesUrl : function() {
                return this.options.tilesUrl;
            },
            getAttribution : function() {
                return this.options.attribution;
            }
        })

        /**
         * This dataset corresponds to interactive tiles (UTFGrid). It returns
         * all information loaded by the map represented in UTFGrid tiles.
         */
        Mosaic.GeoUtfGridSet = Mosaic.TilesDataSet.extend({
            type : 'GeoUtfGridSet'
        });

        /**
         * An application is the central class managing communications between
         * all views, layers and datasets. The appliation notifies about new and
         * removed datasets. So all views intercept these events and visualize
         * the data according to their types.
         */
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

        /** Listens to events produced by external objects */
        Mosaic.listenTo = function(obj, event, handler, context) {
            var listeners = this._listeners = this._listeners || [];
            context = context || this;
            obj.on(event, handler, context);
            listeners.push({
                obj : obj,
                event : event,
                handler : handler,
                context : context
            });
        };

        /** Removes all event listeners produced by external objects. */
        Mosaic.stopListening = function() {
            _.each(this._listeners, function(listener) {
                var context = listener.context || this;
                listener.obj.off(listener.event, listener.handler, context);
            }, this);
            delete this._listeners;
        };

        /**
         * This mixin method should be added to individual types to enable
         * registering type-specific resource extensions. This method iterates
         * over the specified resource types and registers the corresponding
         * adapters. The type of the adapter is the same as the class where this
         * mixin is added.
         */
        Mosaic._registerTypeAdapters = function(config) {
            var adapterManager = Mosaic.AdapterManager.getInstance();
            _.each(config, function(value, type) {
                adapterManager.registerAdapter(type, this, value);
            }, this);
        }

        /**
         * Template-based view. It uses HTML templates to represent information.
         */
        Mosaic.TemplateView = Mosaic.Class.extend({

            /** Returns a unique identifier of this view. */
            getId : Mosaic.getId,

            /**
             * Returns a logical type of this view. This identifier is used to
             * retrieve data adapters repsonsible for data rendering on this
             * view.
             */
            getType : Mosaic.getType,

            /** Listens to events produced by external objects */
            listenTo : Mosaic.listenTo,

            /** Removes all event listeners produced by external objects. */
            stopListening : Mosaic.stopListening,

            /** Initializes this object. */
            initialize : function(options) {
                this.setOptions(options);
                this.triggerMethod('initialize');
            },

            /**
             * Returns the DOM element used as a container for the map.
             */
            getElement : function() {
                if (!this.$el) {
                    var el = this.options.el || '<div></div>';
                    this.$el = $(el);
                }
                return this.$el;
            },

            renderDefault : function(el, methodName) {
                var err = new Error('[' + methodName
                        + ']: Renderer method not found.');
                console.log(err, el);
            },

            renderedDefault : function(el, methodName) {
                var err = new Error('[' + methodName + ']: Method called '
                        + 'after the rendering process ' + 'is not defined.');
                console.log(err, el);
            },

            _callReferencedMethod : function(elm, field, def) {
                var result = null;
                var methodName = elm.attr(field);
                if (methodName) {
                    var method = this[methodName] || this[def];
                    elm.removeAttr(field);
                    if (method) {
                        result = method.call(this, elm, methodName);
                    }
                }
                return result;
            },

            _renderElement : function(elm, render, list) {
                var visit = true;
                if (render !== false) {
                    if (elm.attr('data-rendered')) {
                        list.push(elm);
                    }
                    var result = this._callReferencedMethod(elm, 'data-render',
                            'renderDefault');
                    visit = result !== false;
                }
                if (visit) {
                    var children = _.toArray(elm.children());
                    _.each(children, function(elm) {
                        this._renderElement($(elm), true, list);
                    }, this)
                }
                this.triggerMethod('render');
            },

            renderElement : function(elm, render) {
                var list = [];
                this._renderElement(elm, render, list);
                // Notify about the end of the rendering process
                _.each(list, function(e) {
                    this._callReferencedMethod(e, 'data-rendered',
                            'renderedDefault');
                }, this)
            },

            bindListeners : function(elm, event, attrName) {
                if (attrName === undefined) {
                    attrName = 'data-action-' + event;
                }
                var that = this;
                var selector = '[' + attrName + ']';
                elm.on(event, selector, function(ev) {
                    var e = $(ev.target);
                    var actionName = e.attr(attrName);
                    var action = that[actionName];
                    if (action) {
                        action.call(that, ev, e);
                    }
                });
            },
            render : function() {
                var that = this;
                that.triggerMethod('render:begin');
                that._render();
                that._bindEventListeners();
                that.triggerMethod('render:end');
                return this;
            },
            _bindEventListeners : function() {
                var that = this;
                var element = this.getElement();
                that.bindListeners(element, 'click');
                that.bindListeners(element, 'mouseover');
                that.bindListeners(element, 'mouseout');
            },
            _render : function() {
                var that = this;
                var element = that.getElement();
                var template = that.template;
                if (template) {
                    var options = _.extend({}, that.options, {
                        view : that
                    });
                    if (_.isString(template)) {
                        template = _.template(template);
                    }
                    var html = template(options);
                    element.html(html);
                }
                that.renderElement(element);
                return that;
            },

            remove : function() {
                var element = view.getElement();
                element.remove();
                this.stopListening();
                return this;
            }
        });

        /* Static methods */
        Mosaic.TemplateView._trim = function(str) {
            return str.replace(/^\s+|\s+$/gim, '');
        }
        Mosaic.TemplateView._toObjects = function(e) {
            var results = [];
            var that = this;
            e.each(function() {
                try {
                    var text = $(this).text();
                    text = that._trim(text);
                    text = '( ' + text + ')';
                    var obj = eval(text);
                    if (_.isFunction(obj)) {
                        obj = obj();
                    }
                    results.push(obj);
                } catch (e) {
                    console.log('ERROR!', e);
                }
            })
            return results;
        }
        Mosaic.TemplateView.extendViewType = function(e, View) {
            e = $(e);
            View = View || this.extend();
            // Define template methods
            var objects = e.find('[data-type="methods"]');
            _.each(this._toObjects(objects), function(obj) {
                _.extend(View.prototype, obj);
            }, this);
            objects.remove();

            // Define static constants
            var objects = e.find('[data-type="const"]');
            _.each(this._toObjects(objects), function(obj) {
                _.extend(View, obj);
            }, this);
            objects.remove();

            // The rest of the code is used as a
            // template
            var html = e.html() || e.text();
            html = this._trim(html);
            if (html != '') {
                var tmpl = _.template(html);
                View.prototype.template = tmpl;
            }
            return View;
        }

        /** A common superclass for all views (Map, List, etc). */
        Mosaic.View = Mosaic.TemplateView.extend({

            /** Returns an application managing this view */
            getApp : function() {
                return this.options.app;
            },

            /**
             * Initializes this object. This method registers listeners on the
             * application to visualize data sets when they are added to the
             * application.
             */
            initialize : function(options) {
                this.setOptions(options);
                this.triggerMethod('initialize');
                var app = this.getApp();
                this.listenTo(app, 'dataSet:add', this.onAddDataSet);
                this.listenTo(app, 'dataSet:remove', this.onRemoveDataSet);
                this.listenTo(app, 'start', this.onStart);
                this.listenTo(app, 'stop', function(ev) {
                    this.stopListening();
                    this.onStop(ev);
                });
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

            /** This method is called when the application starts. */
            onStart : function(e) {
            },

            /** This method is called when the application is stopped. */
            onStop : function(e) {
            },

            /**
             * This method is called to notify about new data sets added to the
             * application.
             */
            onAddDataSet : function(e) {
                var dataSet = e.data;
                var adapters = Mosaic.AdapterManager.getInstance();
                var adapter = adapters.newAdapterInstance(this, dataSet);
                if (adapter && adapter.render) {
                    adapter.render(this, dataSet);
                    this.setEntity(dataSet.getId(), adapter);
                }
            },

            /**
             * This method is invoked when a dataset is removed from the
             * application.
             */
            onRemoveDataSet : function(e) {
                var dataSet = e.data;
                var adapter = this.getEntity(dataSet.getId());
                if (adapter && adapter.remove) {
                    adapter.remove();
                }
            }
        });

        /** A view responsible for the map visualization. */
        Mosaic.MapView = Mosaic.View.extend({
            type : 'MapView',

            /**
             * Returns the underlying Leaflet map object. This method is used by
             * MapAdapters to visualize data on the map.
             */
            getMap : function() {
                return this._map;
            },
            /** Returns the maximal zoom level for the map. */
            getMaxZoom : function() {
                return this.options.maxZoom || 18;
            },
            /** Returns the minimal map zoom level. */
            getMinZoom : function() {
                return this.options.minZoom || 1;
            },
            /** Returns the initial zoom level for the map. */
            getInitialZoom : function() {
                return this.options.initialZoom || 8;
            },
            /** Returns the initial center of the map. */
            getInitialCenter : function() {
                return _.toArray(this.options.initialCenter || [ 0, 0 ]);
            },
            /**
             * Resets the map view to its initial values (initial zoom level and
             * the initial center coordinates).
             */
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
            /**
             * This method is called when the application is started. This
             * method really creates maps.
             */
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
            /**
             * This method is called when the application stops. It removes the
             * underlying map from the DOM.
             */
            onStop : function() {
                this._map.remove();
                delete this._map;
            }
        })

        /** List view. Used to visualize all resources in a side bar. */
        Mosaic.ListView = Mosaic.View.extend({
            type : 'ListView',
            /** Returns the container element for all list items. */
            getElement : function() {
                return $(this.options.el);
            },
            /** This method is called when the application starts. */
            onStart : function(e) {
                var elm = this.getElement();
                // FIXME:
                elm.html('<div>List</div>');
            },
            /** This method is called when the application stops. */
            onStop : function() {
                var elm = this.getElement();
                elm.html('');
            }
        })

        /* ------------------------------------------------- */
        /**
         * An abstract ViewAdapter used as a superclass for all DataSet - View
         * adapters.
         */
        Mosaic.ViewAdapter = Mosaic.Class.extend({
            stopListening : Mosaic.stopListening,
            listenTo : Mosaic.listenTo
        });

        /* ------------------------------------------------- */
        /**
         * Options object defining visualization styles for individual figures
         * drawn on the map. Used by the Mosaic.GeoJsonMapViewAdapter class to
         * visualize resources.
         */
        Mosaic.MapFigureOptions = Mosaic.Class.extend({
            type : 'MapFigureOptions'
        });

        /**
         * An utility method used to register map figures styles for multiple
         * resource types. The specified configuration object should contain
         * resource types with the corresponding visualization options.
         */
        Mosaic.MapFigureOptions.registerOptions = Mosaic._registerTypeAdapters;

        /** Visualization of the content in the popup view. */
        Mosaic.MapPopupView = Mosaic.TemplateView.extend({});
        /**
         * An utility method used to register popup views for multiple resource
         * types. The specified configuration object should contain resource
         * types with the corresponding popup view classes.
         */
        Mosaic.MapPopupView.registerViews = Mosaic._registerTypeAdapters;

        Mosaic.MapActivePopupView = Mosaic.MapPopupView.extend({
            type : 'MapActivePopupView'
        });
        Mosaic.MapFocusedPopupView = Mosaic.MapPopupView.extend({
            type : 'MapFocusedPopupView'
        });

        /** GeoJsonDataSet - MapView adapter */
        Mosaic.GeoJsonMapViewAdapter = Mosaic.ViewAdapter.extend({
            initialize : function() {
                this._index = {};
            },
            _showPopup : function(e, AdapterType) {
                var resource = e.resource;
                var id = this._data.getResourceId(resource);
                var layer = this._index[id];
                if (layer) {
                    var ViewType = this._data.getResourceAdapter(resource,
                            AdapterType);
                    if (ViewType) {
                        var view = new ViewType({
                            resource : resource,
                            data : this._data,
                            parentView : this._view
                        });
                        var element = view.getElement();
                        layer.bindPopup(element[0]).openPopup();
                        view.render();
                        layer.bindPopup(element[0]).openPopup();
                    }
                }
            },

            _bindDataEventListeners : function() {
                this.listenTo(this._data, 'activate', function(e) {
                    this._showPopup(e, Mosaic.MapActivePopupView);
                });
                this.listenTo(this._data, 'deactivate', function(e) {
                    // console.log('* Deactivate: ', e)
                })
                this.listenTo(this._data, 'focus', _.debounce(function(e) {
                    this._showPopup(e, Mosaic.MapFocusedPopupView);
                }, 100));
                this.listenTo(this._data, 'blur', function(e) {
                    // console.log('* Blur: ', e)
                })
            },

            render : function(view, data) {
                this._view = view;
                this._data = data;
                var map = view.getMap();
                var that = this;

                var geoJsonOptions = {
                    pointToLayer : function(resource, latlng) {
                        // TODO: Add to the point layer
                        return new L.Marker(latlng);
                    },
                    style : function(resource) {
                        var options = that._data.getResourceAdapter(resource,
                                Mosaic.MapFigureOptions)
                                || {};
                        if (_.isFunction(options)) {
                            options = options.call(options, that._data,
                                    resource);
                        }
                        return options;
                    },
                    onEachFeature : function(resource, layer) {
                        var resourceId = data.getResourceId(resource);
                        that._index[resourceId] = layer;
                        layer.on('mouseover', function() {
                            that._data.focus(resource);
                        })
                        layer.on('mouseout', function() {
                            that._data.blur(resource);
                        })
                        layer.on('click', function() {
                            that._data.activate(resource);
                        })
                    }
                };

                this._groupLayer = new L.FeatureGroup();
                _.each(data.getResources(), function(feature) {
                    var geom = feature.geometry;
                    if (!geom || !geom.coordinates || !geom.coordinates.length)
                        return false;
                    var layer = L.geoJson(feature, geoJsonOptions);
                    if (layer.isPoint) {
                        this._groupLayer.addLayer(layer);
                    }
                });

                var list = _.filter(data.getResources(), function(resource) {
                    var geom = resource.geometry;
                    if (!geom || !geom.coordinates || !geom.coordinates.length)
                        return false;
                    return true;
                })
                this._groupLayer = L.geoJson(list, geoJsonOptions).addTo(map);

                map.addLayer(this._groupLayer);
                that._bindDataEventListeners();
            },
            remove : function() {
                var map = this._view.getMap();
                map.removeLayer(this._groupLayer);
                this.stopListening();
            }
        });

        /* ------------------------------------------------- */
        /** Resource visualization in the list. */
        Mosaic.ListItemView = Mosaic.TemplateView.extend({});
        /**
         * An utility method used to register resource list views for multiple
         * resource types. The specified configuration object should contain
         * resource types with the corresponding list view classes.
         */
        Mosaic.ListItemView.registerViews = Mosaic._registerTypeAdapters;

        /* ------------------------------------------------- */
        /** GeoJsonDataSet - ListView adapter */
        Mosaic.GeoJsonListViewAdapter = Mosaic.ViewAdapter.extend({
            render : function(view, data) {
                this._view = view;
                this._data = data;
                this._container = $('<div></div>');
                var element = this._view.getElement();
                element.append(this._container);
                var list = data.getResources();
                list = _.toArray(list);
                var that = this;
                _.each(list, function(resource) {
                    var str = JSON.stringify(resource.properties.label);
                    var ViewType = this._data.getResourceAdapter(resource,
                            Mosaic.ListItemView);
                    if (ViewType) {
                        var view = new ViewType({
                            resource : resource,
                            data : this._data,
                            parentView : this._view
                        });
                        this._container.append(view.getElement());
                        view.render();
                    }
                }, this);
            },
            remove : function() {
                this.stopListening();
                this._container.remove();
            }
        })

        /** Adapters of tilesets to the MapView */
        Mosaic.TileSetMapViewAdapter = Mosaic.ViewAdapter.extend({
            render : function(view, data) {
                this._view = view;
                this._data = data;
                var map = this._view.getMap();
                var maxZoom = this._view.getMaxZoom();
                var attribution = this._data.getAttribution();
                var tilesUrl = this._data.getTilesUrl();
                this._layer = L.tileLayer(tilesUrl, {
                    attribution : attribution,
                    maxZoom : maxZoom
                }).addTo(map);
            },
            remove : function() {
                var map = this._view.getMap();
                map.removeLayer(this._layer);
                delete this._layer;
                this.stopListening();
            }
        })

        /** Adapters registration */
        var adapters = Mosaic.AdapterManager.getInstance();
        adapters.registerAdapter(Mosaic.MapView, Mosaic.TilesDataSet,
                Mosaic.TileSetMapViewAdapter);
        adapters.registerAdapter(Mosaic.MapView, Mosaic.GeoJsonDataSet,
                Mosaic.GeoJsonMapViewAdapter);
        adapters.registerAdapter(Mosaic.ListView, Mosaic.GeoJsonDataSet,
                Mosaic.GeoJsonListViewAdapter);

        return Mosaic;
    });
})(typeof define === 'function' ? define : require('amdefine')(module));
