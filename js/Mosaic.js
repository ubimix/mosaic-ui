(function(context) {
    "use strict";

    if (context.define) {
        context.define([ 'underscore', 'jquery', 'L' ], module);
    } else {
        context.Mosaic = module(context._, context.jQuery, context.L);
    }

    function module(_, $, L) {

        /** Common namespace */
        var Mosaic = {};

        /* --------------------------------------------------- */
        /* Static utility methods */

        Mosaic.Utils = {
            /** An utility method trimming string whitespaces. */
            trim : function(str) {
                return str.replace(/^\s+|\s+$/gim, '');
            },
            /**
             * Checks the given options object, interprets it (if it is a
             * function) and returns non-null resulting value.
             */
            getOptions : function(options) {
                if (_.isFunction(options)) {
                    options = options();
                } else {
                    options = options || {};
                }
                return options;
            },

            /** Returns an option value corresponding to the specified key. */
            getOption : function(options, key) {
                options = this.getOptions(options);
                var value = options[key];
                if (_.isFunction(value)) {
                    value = value.call(options);
                }
                return value;
            }
        }

        /**
         * Converts the text content of the specified element into a JS object.
         * This utility method could be used to convert JS code defined in
         * <code>&lt;script>..&lt;script></code> elements into an object.
         */
        Mosaic.elementToObject = function(e) {
            var results = [];
            var that = this;
            e.each(function() {
                try {
                    var text = $(this).text();
                    text = Mosaic.Utils.trim(text);
                    text = '( ' + text + ')';
                    var obj = eval(text);
                    if (_.isFunction(obj)) {
                        obj = obj();
                    }
                    results.push(obj);
                } catch (e) {
                    console.log('ERROR!', e.stack);
                }
            })
            return results;
        }

        /* --------------------------------------------------- */

        /** Common mixins */
        Mosaic.Mixins = {

            /**
             * A basic mix-in method used to defined the type of the parent
             * class.
             */
            getType : function() {
                var type = this.type = this.type || _.uniqueId('type-');
                return type;
            },

            /**
             * This mix-in method returns a unique identifier for instances of
             * the parent class.
             */
            getId : function() {
                var options = this.options = this.options || {};
                var id = options.id = options.id || _.uniqueId('id-');
                return id;
            },

            /** Events mixins */
            Events : {
                /** Registers listeners for the specified event key. */
                on : function(eventKey, handler, context) {
                    var listeners = this.__listeners = this.__listeners || {};
                    context = context || this;
                    var list = listeners[eventKey] = listeners[eventKey] || [];
                    list.push({
                        handler : handler,
                        context : context
                    });
                },
                /** Removes a listener for events with the specified event key */
                off : function(eventKey, handler, context) {
                    var listeners = this.__listeners;
                    if (!listeners)
                        return;
                    var list = listeners[eventKey];
                    if (!list)
                        return;
                    list = _.filter(list, function(slot) {
                        var match = (slot.handler === handler);
                        match &= (!context || slot.context === context);
                        return !match;
                    })
                    listeners[eventKey] = list.length ? list : undefined;
                },
                /** Fires an event with the specified key. */
                fire : function(eventKey) {
                    var listeners = this.__listeners;
                    if (!listeners)
                        return;
                    var list = listeners[eventKey];
                    if (!list)
                        return;
                    var args = _.toArray(arguments);
                    args.splice(0, 1);
                    _.each(list, function(slot) {
                        slot.handler.apply(slot.context, args);
                    })
                }
            },

            /** Listens to events produced by external objects */
            listenTo : function(obj, event, handler, context) {
                var listeners = this._listeners = this._listeners || [];
                context = context || this;
                obj.on(event, handler, context);
                listeners.push({
                    obj : obj,
                    event : event,
                    handler : handler,
                    context : context
                });
            },

            /** Removes all event listeners produced by external objects. */
            stopListening : function(object, event) {
                if (object) {
                    this._listeners = _.filter(this._listeners, function(
                            listener) {
                        var keep = true;
                        var context = listener.context || this;
                        if (listener.obj == object) {
                            if (!event || event == listener.event) {
                                listener.obj.off(listener.event,
                                        listener.handler, context);
                                keep = false;
                            }
                        }
                        return keep;
                    }, this);
                } else {
                    _.each(this._listeners, function(listener) {
                        var context = listener.context || this;
                        listener.obj.off(listener.event, listener.handler,
                                context);
                    }, this);
                    delete this._listeners;
                }
            },

            /**
             * Trigger an event and/or a corresponding method name. Examples:
             * 
             * <ul>
             * <li> `this.triggerMethod(&quot;foo&quot;)` will trigger the
             * &quot;foo&quot; event and call the &quot;onFoo&quot; method.</li>
             * <li> `this.triggerMethod(&quot;foo:bar&quot;) will trigger the
             * &quot;foo:bar&quot; event and call the &quot;onFooBar&quot;
             * method.</li>
             * </ul>
             * 
             * This method was copied from Marionette.triggerMethod.
             */
            triggerMethod : (function() {
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
                    var methodName = 'on'
                            + event.replace(splitter, getEventName);
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
            })(),

        };

        /* --------------------------------------------------- */

        /** Common superclass for all other types. */
        Mosaic.Class = (function() {
            function copy(to, from) {
                for ( var name in from) {
                    if (_.has(from, name) && name !== 'prototype') {
                        to[name] = from[name];
                    }
                }
            }
            function extend() {
                return newClass.apply(this, arguments);
            }
            /**
             * Returns <code>true</code> if this type is the same as the
             * specified object.
             */
            function isSameType(obj) {
                if (!obj || !obj._typeId)
                    return false;
                return this._typeId == obj._typeId;
            }

            var typeCounter = 0;
            function newClass() {
                function Type() {
                    if (this.initialize) {
                        this.initialize.apply(this, arguments);
                    }
                }
                Type.extend = extend;
                Type.isSameType = isSameType;
                if (this) {
                    copy(Type, this);
                    copy(Type.prototype, this.prototype);
                }
                _.each(arguments, function(fields) {
                    copy(Type.prototype, fields);
                })
                Type._typeId = typeCounter++;
                return Type;
            }
            return newClass();
        })();

        /** Events triggering/listening */
        _.extend(Mosaic.Class.prototype, Mosaic.Mixins.Events);

        /** Default methods and fields. */
        _.extend(Mosaic.Class.prototype, {

            /** Trigger events and calls onXxx methods on this object. */
            triggerMethod : Mosaic.Mixins.triggerMethod,

            /** Sets options for this object. */
            setOptions : function(options) {
                this.options = _.extend(this.options || {}, options);
            },

            /** Returns options of this object. */
            getOptions : function() {
                return this.options || {};
            }

        })

        /* ------------------------------------------------- */

        /**
         * A simple Promise-like wrapper around jQuery promises.
         */
        Mosaic.Promise = function(param) {
            var deferred = $.Deferred();
            deferred.resolve(param);
            return deferred.promise();
        }
        /**
         * Returns a Deferred object containing the following methods and
         * fields: 1) resolve - a function used to resolve the deferred object
         * 2) reject - a rejection function 3) promise - a promise field
         */
        Mosaic.Promise.defer = function() {
            var deferred = $.Deferred();
            deferred.promise = deferred.promise();
            return deferred;
        }

        /* --------------------------------------------------- */

        /**
         * An adapter manager used to register/retrieve objects corresponding to
         * the types of adaptable object and the types of the target object.
         * This object is used by views to get view adapters.
         */
        Mosaic.AdapterManager = Mosaic.Class.extend({
            /** Initializes this object */
            initialize : function() {
                this._adapters = {};
            },
            /** Returns the type of the specified resource. */
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
            /**
             * Returns a key used to find adapters of one type to another.
             * 
             * @param from
             *            the type of the adaptable object
             * @param to
             *            type of the target object
             */
            _getKey : function(from, to) {
                var fromType = this._getType(from);
                var toType = this._getType(to);
                return fromType + '-' + toType;
            },
            /**
             * Registers a new adapter from one type to another.
             * 
             * @param from
             *            the type of the adaptable object
             * @param to
             *            type of the target object
             * @param adapter
             *            the adapter type
             */
            registerAdapter : function(from, to, adapter) {
                var key = this._getKey(from, to);
                this._adapters[key] = adapter;
            },

            /** Returns an adapter of one object type to another type. */
            getAdapter : function(from, to) {
                var key = this._getKey(from, to);
                return this._adapters[key];
            },
            /**
             * Creates and returns a new adapter from one type to another. If
             * the registered adapter is a function then it is used as
             * constructor to create a new object.
             */
            newAdapterInstance : function(from, to, options) {
                var AdapterType = this.getAdapter(from, to);
                var result = null;
                if (_.isFunction(AdapterType)) {
                    options = options || {};
                    if (this._checkValidity(AdapterType, options)) {
                        if (_.isFunction(AdapterType.initialize)) {
                            AdapterType.initialize(options);
                        }
                        result = new AdapterType(options);
                        if (!this._checkValidity(result, options)) {
                            result = null;
                        }
                    }
                } else {
                    result = AdapterType;
                }
                return result;
            },
            /** Removes an adapter from one type to another. */
            removeAdapter : function(from, to) {
                var key = this._getKey(from, to);
                var result = this._adapters[key];
                delete this._adapters[key];
                return result;
            },

            /**
             * Checks if option values are valid using validation methods on the
             * specified object
             */
            _checkValidity : function(obj, options) {
                if (!_.isFunction(obj.isValid))
                    return true;
                var result = obj.isValid(options);
                return result;
            }
        });
        /**
         * A static method returning the singlethon instance of the
         * AdapterManager.
         */
        Mosaic.AdapterManager.getInstance = function() {
            if (!this._instance) {
                this._instance = new Mosaic.AdapterManager();
            }
            return this._instance;
        }
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

        /* --------------------------------------------------- */

        /**
         * A common super-class for all "data sets" giving access to resources.
         * Each dataset could be seen as a collection of resources.
         */
        Mosaic.DataSet = Mosaic.Class.extend({

            /** Returns a unique identifier of this dataset */
            getId : Mosaic.Mixins.getId,

            /**
             * Returns the logical type of this dataset. This value should be
             * defined as a "type" field in subclasses.
             */
            getType : Mosaic.Mixins.getType,

            /**
             * Initializes internal fields for objects of this type.
             */
            initialize : function(options) {
                this.setOptions(options);
                var resourceStates = Mosaic.DataSet.getResourceStates();
                _.each(resourceStates, function(conf) {
                    function checkEvent(event) {
                        if (!event.priority)
                            event.priority = conf.priority || 0;
                        return event;
                    }
                    this[conf.on] = function(event) {
                        event = checkEvent(event);
                        var priorityKey = conf.field + '_priority';
                        var oldPriority = this[priorityKey] || 0;
                        var newPriority = event.priority;
                        if (oldPriority > newPriority) {
                            return;
                        }
                        var resource = this.getResourceFromEvent(event);
                        var oldResource = this[conf.field];
                        var fire = conf.force || event.force
                                || !this._isSame(oldResource, resource);
                        if (fire) {
                            if (oldResource) {
                                this[conf.off].call(this, this.newEvent({
                                    resource : oldResource
                                }));
                            }
                            this[priorityKey] = newPriority;
                            this[conf.field] = resource;
                            this.triggerMethod(conf.on, event);
                        }
                    }
                    this[conf.off] = function(event) {
                        var oldResource = this[conf.field];
                        var resource = this.getResourceFromEvent(event);
                        if (!resource || this._isSame(oldResource, resource)) {
                            delete this[conf.field];
                            var priorityKey = conf.field + '_priority';
                            delete this[priorityKey];
                            this.triggerMethod(conf.off, event);
                        }
                    }
                }, this);
            },

            /**
             * Returns a static adapter for the specified resource. If there is
             * no adapters were found for the resource type then this method
             * tries to get an adapter for parent types.
             */
            getResourceAdapter : function(resource, adapterType, options) {
                var adapters = Mosaic.AdapterManager.getInstance();
                var adapter = null;
                options = options || {};
                options.resource = resource;
                var resourceType = this.getResourceType(resource);
                while (resourceType != null) {
                    adapter = adapters.newAdapterInstance(resourceType,
                            adapterType, options);
                    if (adapter)
                        break;
                    var parentType = this.getParentResourceType(resourceType);
                    resourceType = parentType;
                }
                if (!adapter) {
                    adapter = adapters.newAdapterInstance('Default',
                            adapterType, options);
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
             * Returns a resource corresponding to the specified event. This
             * event should be fired by this data set.
             */
            getResourceFromEvent : function(event) {
                return event.resource;
            },

            /**
             * Returns a string representing a type of the specified resource.
             */
            getResourceType : function(resource) {
                if (!resource)
                    return null;
                if (resource.type)
                    return resource.type;
                var properties = resource.properties || {};
                var type = properties.type;
                return type || 'Resource';
            },

            /** Returns a parent for the specified type. */
            getParentResourceType : function(type) {
                if (_.isFunction(type) || _.isObject(type)) {
                    type = type.type;
                }
                if (!_.isString(type) || type == '')
                    return null;
                var idx = type.lastIndexOf('/');
                if (idx > 0)
                    type = type.substring(0, idx);
                else
                    type = null;
                return type;
            },

            /**
             * A private method checking if the specified resources are the same
             * or not. This method returns <code>true</code> if both
             * parameters are the same object or if they have the same
             * identifier.
             */
            _isSame : function(first, second) {
                if (!first || !second)
                    return false;
                if (first == second)
                    return true;
                if (this.getResourceId(first) == this.getResourceId(second))
                    return true;
                return false;
            },

            /** Create and returns an event for the specified object */
            newEvent : function(event) {
                return _.extend({
                    priority : 0,
                    dataSet : this
                }, event);
            },

            /**
             * This method should be overloaded in subclasses and it has to
             * launch a real search operation and return a promise for search
             * results.
             */
            _doSearch : function(params) {
                return Mosaic.Promise(true);
            },

            /** Returns the currently active search parameters */
            getSearchParams : function() {
                return this._searchParams || {};
            },

            /**
             * Sets a new search parameters. This method starts a search
             * operation by calling the "_doSearch" method and notifies about
             * the beginning and the end of the search operations.
             */
            search : function(params) {
                var that = this;
                that._searchParams = params;
                params = this.getSearchParams();
                return Mosaic.Promise().then(function() {
                    that.fire('search:begin', that.newEvent({
                        params : params
                    }));
                    return that._doSearch(params);
                }).then(function(result) {
                    that.fire('search:end', that.newEvent({
                        params : params
                    }));
                    if (result) {
                        that.fire('update', that.newEvent({}));
                    }
                    return result;
                });
            },
        });

        /* Static methods associated with the Mosaic.DataSet class. */
        _.extend(Mosaic.DataSet, {

            /**
             * Registers new resource states. Each resource state contain the
             * following fields:
             * 
             * @param state.field
             *            the field in the DataSet object keeping the resource
             *            state value
             * @param state.on
             *            name of the method activating the resource state
             * @param state.off
             *            name of the method deactivating the resource state
             */
            registerResourceStates : function(states) {
                states = _.toArray(states);
                this._resourceStates = this._resourceStates || [];
                this._resourceStates = this._resourceStates.concat(states);
            },

            /** This method returns all possible resource states. */
            getResourceStates : function() {
                return this._resourceStates || [];
            },

        });

        /** Registeres a list of resource events */
        Mosaic.DataSet.registerResourceStates([
        // Activates/deactivates the resources and fires the
        // "activate/deactivate" events.
        {
            field : '_activated',
            priority : 2,
            on : 'activateResource',
            off : 'deactivateResource'
        },
        // Focuses/blurs the resources and fires the "focus/blur" events
        // "activate/deactivate" events.
        {
            field : '_focused',
            priority : 1,
            on : 'focusResource',
            off : 'blurResource'
        },
        // Expand/reduce the resources (shows it in the full view).
        {
            field : '_expanded',
            priority : 3,
            on : 'expandResource',
            off : 'reduceResource'
        } ]);

        /* --------------------------------------------------- */
        /**
         * This is a cursor providing access to underlying resources.
         */
        Mosaic.ResourceCursor = Mosaic.Class.extend({
            /**
             * Initializes this object. Sets the total number of elements
             * covered by this cursor.
             */
            initialize : function(options) {
                this.options = options || {};
            },
            /** Returns the total number of elements covered by this cursor. */
            getFullLength : function() {
                return this.options.length || 0;
            },
            /** Returns the length of this block. */
            getLength : function() {
                var list = _.toArray(this.getList());
                return list ? list.length : 0;
            },
            /** Returns the start position of this cursor. */
            getBegin : function() {
                return this.options.begin || 0;
            },
            /** Returns the final position of this cursor. */
            getEnd : function() {
                return this.options.end || this.getLength() - 1;
            },
            /** Returns array of elements covered by this cursor */
            getList : function() {
                return _.toArray(this.options.list);
            }
        });

        /**
         * This dataset is used as a wrapper for a collection of GeoJSON
         * objects.
         */
        Mosaic.GeoJsonDataSet = Mosaic.DataSet.extend({
            type : 'GeoJsonDataSet',

            _loadData : function() {
                var that = this;
                if (!that._loadPromise) {
                    if (that.options.url) {
                        that._loadPromise = //
                        that._loadJson(that.options.url).then(function(data) {
                            var result = data && //
                            _.isArray(data.features) ? data.features : data;
                            return _.toArray(result);
                        });
                    } else {
                        that._loadPromise = Mosaic.Promise([]);
                    }
                }
                return that._loadPromise;
            },

            /** Returns underlying resources as a list */
            _getList : function() {
                var that = this;
                if (that._list) {
                    return Mosaic.Promise(that._list);
                } else {
                    return that._loadData().then(function(list) {
                        that._list = list;
                        return that._list;
                    });
                }
            },

            /** Returns the underlying list of resources. */
            loadResources : function() {
                var that = this;
                return that._getList().then(function(list) {
                    return that._loadNewCursor(list);
                })
            },

            /** Creates and returns a new cursor wrapping the specified list */
            _loadNewCursor : function(list) {
                var cursor = new Mosaic.ResourceCursor({
                    list : list
                });
                return Mosaic.Promise(cursor);
            },

            /**
             * Return a promise for the data loaded from the specified URL
             */
            _loadJson : function(url) {
                var deferred = Mosaic.Promise.defer();
                $.get(url, function(data) {
                    deferred.resolve(data);
                }).fail(function(error) {
                    deferred.reject(error);
                });
                return deferred.promise;
            },

            /** Debug feature */
            deleteResource : function(resource) {
                var that = this;
                var id = that.getResourceId(resource);
                return that._getList().then(function(list) {
                    that._list = _.filter(list, function(r) {
                        var currentId = that.getResourceId(r);
                        var remove = currentId == id;
                        return !remove;
                    });
                    that.fire('update', that.newEvent({}));
                    return that._loadNewCursor(that._list);
                })
            }

        });

        /* --------------------------------------------------- */

        /**
         * This dataset corresponds to static map tiles. It don't have any
         * data/resources.
         */
        Mosaic.TilesDataSet = Mosaic.DataSet.extend({
            type : 'TilesDataSet',

            /** Updates tiles URLs */
            _doSearch : function(params) {
                var that = this;
                return Mosaic.Promise().then(function() {
                    delete that._tilesUrl;
                    delete that._datagridUrl;
                    return true;
                });
            },

            /** Formats the specified URL by adding search parameters. */
            _formatUrl : function(url) {
                if (!url) {
                    return url;
                }
                function formatKey(s) {
                    s = String(s);
                    return encodeURIComponent(s);
                }
                function formatValue(s) {
                    if (_.isArray(s)) {
                        return _.map(s, formatValue).join(',');
                    }
                    s = String(s);
                    s = encodeURIComponent(s);
                    return s;
                }
                var str = '';
                var params = this.getSearchParams();
                _.each(params, function(value, key) {
                    if (str.length > 0) {
                        str += '&';
                    }
                    str += formatKey(key) + '=' + formatValue(value);
                }, this);
                if (str.length > 0) {
                    var idx = url.indexOf('?');
                    if (idx < 0) {
                        url += '?';
                    } else {
                        url += '&';
                    }
                    url += str;
                }
                return url;
            },

            /** Returns tile URL containing search parameters. */
            getTilesUrl : function() {
                if (!this._tilesUrl) {
                    this._tilesUrl = this._formatUrl(this.options.tilesUrl);
                }
                return this._tilesUrl;
            },

            /** Returns UTFGrid URL containing search parameters. */
            getDataGridUrl : function() {
                if (!this._datagridUrl) {
                    this._datagridUrl = this
                            ._formatUrl(this.options.datagridUrl);
                }
                return this._datagridUrl;
            },

            /** Returns tile layer attribution to show on the map. */
            getAttribution : function() {
                return this.options.attribution;
            }
        })

        /* --------------------------------------------------- */

        /**
         * An application is the central class managing communications between
         * all views, layers and datasets. The appliation notifies about new and
         * removed datasets. So all views intercept these events and visualize
         * the data according to their types.
         */
        Mosaic.App = Mosaic.Class.extend({

            /** Listens to events produced by external objects */
            listenTo : Mosaic.Mixins.listenTo,

            /** Removes all event listeners produced by external objects. */
            stopListening : Mosaic.Mixins.stopListening,

            /** Initializes this application and creates internal fields. */
            initialize : function(options) {
                this.setOptions(options);
                this._dataSets = {};
            },

            /**
             * Starts this application and notifies listeners using the "start"
             * event.
             */
            start : function() {
                if (this._started)
                    return;
                this._started = true;
                this.triggerMethod('start', {
                    app : this
                });
                _.each(this._dataSets, function(dataSet) {
                    this._triggerDataSetEvent('dataSet:add', dataSet);
                }, this);
            },

            /**
             * Stops the application and notifies registered listeners with the
             * "stop" event.
             */
            stop : function() {
                if (!this._started)
                    return;
                _.each(this._dataSets, function(dataSet) {
                    this._triggerDataSetEvent('dataSet:remove', dataSet);
                }, this);
                this._started = false;
                this.triggerMethod('stop', {
                    app : this
                });
            },

            /**
             * Returns a registered data set corresponding to the specified
             * identifier
             */
            getDataSet : function(id) {
                return this._dataSets[id];
            },

            /**
             * Returns a list of all datasets
             */
            getDataSets : function() {
                return _.values(this._dataSets);
            },

            /** Adds a new data set to this application */
            addDataSet : function(dataSet) {
                var id = dataSet.getId();
                var that = this;
                that._dataSets[id] = dataSet;
                that.listenTo(dataSet, 'update', function() {
                    that._triggerDataSetEvent('dataSet:update', dataSet);
                });
                if (that._started) {
                    that._triggerDataSetEvent('dataSet:add', dataSet);
                }
            },

            /** Removes the specified dataset. */
            removeDataSet : function(dataSet) {
                if (!dataSet)
                    return;
                var id = dataSet.getId();
                if (_.has(this._dataSets, id)) {
                    this._triggerDataSetEvent('dataSet:remove', dataSet);
                    this.stopListening(dataSet, 'update');
                    delete this._dataSets[id];
                }
            },

            /**
             * Notifies all application and dataset listeners about the
             * specified dataset event.
             */
            _triggerDataSetEvent : function(eventKey, dataSet) {
                var event = {
                    dataSet : dataSet,
                    app : this
                };
                this.triggerMethod(eventKey, event);
                dataSet.triggerMethod(eventKey, event);
            }
        });

        /* --------------------------------------------------- */

        /**
         * Template-based view. It uses HTML templates to represent information.
         */
        Mosaic.TemplateView = Mosaic.Class.extend({

            /** Returns a unique identifier of this view. */
            getId : Mosaic.Mixins.getId,

            /**
             * Returns a logical type of this view. This identifier is used to
             * retrieve data adapters repsonsible for data rendering on this
             * view.
             */
            getType : Mosaic.Mixins.getType,

            /** Listens to events produced by external objects */
            listenTo : Mosaic.Mixins.listenTo,

            /** Removes all event listeners produced by external objects. */
            stopListening : Mosaic.Mixins.stopListening,

            /** Initializes this object. */
            initialize : function(options) {
                this.setOptions(options);
                this.triggerMethod('initialize');
            },

            /**
             * Returns the topmost DOM element of this view.
             */
            getElement : function() {
                if (!this.$el) {
                    var el = this.options.el || '<div></div>';
                    this.$el = $(el);
                }
                return this.$el;
            },

            /**
             * This is a default rendering method which is called if a method
             * referenced in the "data-render" attribute was not found.
             */
            renderDefault : function(el, methodName) {
                var err = new Error('[' + methodName
                        + ']: Renderer method not found.');
                console.log(err.stack, el);
            },

            /**
             * This is a default method which is called after rendering if a
             * method referenced in the "data-rendered" attribute was not found.
             */
            renderedDefault : function(el, methodName) {
                var err = new Error('[' + methodName + ']: Method called '
                        + 'after the rendering process ' + 'is not defined.');
                console.log(err.stack, el);
            },

            /**
             * Default method used to handle events for which no specific
             * handlers were defined.
             */
            handleDefault : function(el, methodName) {
                var err = new Error('[' + methodName
                        + ']: A handler method with such a name '
                        + 'was not found.');
                console.log(err.stack, el);
            },

            /**
             * Public method rendering the specified element. This method seeks
             * all elements containing "data-render" attributes and calls
             * functions referenced by this attribute. When the rendering
             * process is finished then this method calls all functions
             * referenced by the "data-rendered" attribute. Referenced functions
             * should be defined in this view and they has to accept one
             * parameter - a reference to the rendered element.
             */
            renderElement : function(elm, render) {
                var list = [];
                this._renderElement(elm, render, list);
                // Notify about the end of the rendering process
                _.each(list, function(e) {
                    this._callReferencedMethod(e, 'data-rendered',
                            'renderedDefault');
                }, this)
            },

            /**
             * Binds event listeners to elements marked by "data-action-xxx"
             * attributes (where "xxx" is the name of the action). The value of
             * this action attributes should reference event listeners defined
             * in this view. Example:
             * <code>&lt;div data-action-click="sayHello">Hello&lt;/div></code>
             */
            bindListeners : function(elm, event, attrName) {
                var element = elm[0];
                if (!element)
                    return;
                if (attrName === undefined) {
                    attrName = 'data-action-' + event;
                }
                var that = this;
                var selector = '[' + attrName + ']';
                elm.on(event, selector, function(ev) {
                    var e = $(ev.currentTarget);
                    var actionName = e.attr(attrName);
                    var action = that[actionName];
                    if (_.isFunction(action)) {
                        action.call(that, ev, e);
                    } else {
                        that.handleDefault(e, actionName);
                    }
                });
            },

            /**
             * This method renders this view. It performs the following actions:
             * 1) it takes the topmost element of this class (using the
             * "getElement" method) 2) If there is a "template" field defined in
             * this object then it is used as a source for the
             * underscore#template method to render the content; the result of
             * template rendering is appended to the view's element. 3) This
             * method calls all functions referenced in the "data-render" fields
             * 4) After rendering it calls functions referenced in the
             * "data-rendered" element attributes (to finalize the rendering
             * process). 5) It attaches event listeners referenced by the
             * "data-action-xxx" attributes.
             */
            render : function() {
                var that = this;
                that.triggerMethod('render:begin');
                that._render();
                that._bindEventListeners();
                that.triggerMethod('render:end');
                return this;
            },

            /** Removes all registered listeners and removes this view from DOM. */
            remove : function() {
                this.stopListening();
                var element = this.getElement();
                element.remove();
                return this;
            },

            /* ----------------------------- */

            /**
             * This method calls a method of this view referenced by the
             * specified element attribute.
             */
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

            /**
             * This internal method renders the specified element. It is called
             * by the public "renderElement" method. This method seeks all
             * elements containing "data-render" attributes and calls functions
             * referenced by this attribute. When the rendering process is
             * finished then this method calls all functions referenced by the
             * "data-rendered" attribute. Referenced functions should be defined
             * in this view and they has to accept one parameter - a reference
             * to the rendered element.
             */
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

            /**
             * Binds event listeners referenced in "data-action-xxx" element
             * attributes (where "xxx" is "click", "mouseover", "mouseout",
             * "focus", "blur", "keypress", "keydown", "keyup"...).
             */
            _bindEventListeners : function() {
                var actions = [ 'click', 'mouseover', 'mouseout', 'focus',
                        'blur', 'keypress', 'keydown', 'keyup' ];
                var element = this.getElement();
                _.each(actions, function(action) {
                    this.bindListeners(element, action);
                }, this);
            },

            /**
             * Renders the topmost element. This method is called from the
             * public "render" method (see the description in this method). This
             * method does not fires any events.
             */
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
                if (that.className) {
                    element.attr('class', that.className);
                }
                that.renderElement(element);
                return that;
            },

        });

        /**
         * Extends the specified TemplateView object with the HTML content
         * defined in the given element and with methods defined in "script"
         * elements marked by attributes "data-type" equal to "methods" (for
         * instance methods) and "const" for static methods.
         */
        Mosaic.TemplateView.extendViewType = function(e, View) {
            e = $(e).clone();
            View = View || this.extend({});

            // Define static constants
            var scripts = e.find('script[data-type="static"]');
            _.each(Mosaic.elementToObject(scripts), function(obj) {
                _.extend(View, obj);
            }, this);
            scripts.remove();

            // Define template methods
            var scripts = e.find('script');
            _.each(Mosaic.elementToObject(scripts), function(obj) {
                _.extend(View.prototype, obj);
            }, this);
            // Remove all scripts
            scripts.remove();

            // The rest of the code is used as a template
            var html = e.html();
            html = Mosaic.Utils.trim(html);
            if (html && html != '') {
                View.prototype.template = html;
            }
            return View;
        }

        /* ------------------------------------------------- */

        /** A common superclass for all dataset views (Map, List, etc). */
        Mosaic.DataSetView = Mosaic.TemplateView.extend({

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
                this.listenTo(app, 'dataSet:add', this.onDataSetAdd);
                this.listenTo(app, 'dataSet:remove', this.onDataSetRemove);
                this.listenTo(app, 'dataSet:update', this.onDataSetUpdate);
                this.listenTo(app, 'start', function(ev) {
                    this.onStart(ev);
                });
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
            onDataSetAdd : function(e) {
                var dataSet = e.dataSet;
                var adapters = Mosaic.AdapterManager.getInstance();
                var adapter = adapters.newAdapterInstance(this, dataSet, {
                    view : this,
                    dataSet : dataSet
                });
                if (adapter && adapter.renderView) {
                    adapter.renderView();
                    this.setEntity(dataSet.getId(), adapter);
                }
            },

            /**
             * This method is invoked when a dataset is removed from the
             * application.
             */
            onDataSetRemove : function(e) {
                var dataSet = e.dataSet;
                var adapter = this.removeEntity(dataSet.getId());
                if (adapter && adapter.resetView) {
                    adapter.resetView();
                }
            },

            /**
             * This method is invoked when a dataset is changed.
             */
            onDataSetUpdate : function(e) {
                // this.onDataSetRemove(e);
                // this.onDataSetAdd(e);
                // var dataSet = e.dataSet;
                // var adapter = this.getEntity(dataSet.getId());
                // if (adapter && adapter.render) {
                // adapter.renderView();
                // }
            }

        });

        /* ------------------------------------------------- */

        /** It is a common superclass used to visualize resources. */
        Mosaic.ResourceView = Mosaic.TemplateView.extend({
            /** Fires an event using the specified method. */
            _fireResourceEvent : function(event, method) {
                var dataSet = this.getDataSet();
                var resource = this.getResource();
                var event = dataSet.newEvent({
                    priority : event.priority,
                    resource : resource
                });
                dataSet[method](event);
            },
            /** Initializes this instance */
            initialize : function() {
                var initialize = Mosaic.TemplateView.prototype.initialize;
                initialize.apply(this, arguments);
                var that = this;
                var resourceStates = Mosaic.DataSet.getResourceStates();
                _.each(resourceStates, function(conf) {
                    that[conf.on] = function(e) {
                        this._fireResourceEvent(e, conf.on);
                    }
                    that[conf.off] = function(e) {
                        this._fireResourceEvent(e, conf.off);
                    }
                });
            },
            /** Returns the resource associated with this view */
            getResource : function() {
                return this.options.resource;
            },
            /** Returns the data set managing the underlying resource */
            getDataSet : function() {
                return this.options.dataSet;
            },
        });

        /* ------------------------------------------------- */

        /**
         * This is an utility class which is used to control the state of popup
         * windows on the map.
         */
        Mosaic.MapPopupControl = Mosaic.Class.extend({

            /** Initializes this object */
            initialize : function(options) {
                this.options = options;
            },

            /**
             * Opens a new popup window and returns a promise allowing to wait
             * when the operation is finished.
             */
            open : function(options) {
                var that = this;
                var result = false;
                if (!_.isFunction(options.action)
                        || !that._checkPriority(options)) {
                    return Mosaic.Promise();
                } else {
                    return that.close(options).then(function(result) {
                        that._priority = options.priority || 0;
                        return options.action();
                    }).then(
                            function(deferred) {
                                that._deferred = deferred
                                        || new Mosaic.Promise.defer();
                                var promise = that._deferred.promise;
                                promise.then(function() {
                                    that._priority = 0;
                                    // delete that._deferred;
                                });
                                return promise;
                            });
                }
            },

            /**
             * Closes the popup window (if it is opened) and returns a promise
             * allowing to continue operations when the operation is finished.
             */
            close : function(options) {
                var that = this;
                var result = false;
                var promise = Mosaic.Promise();
                if (that._checkPriority(options)) {
                    result = true;
                    if (that._deferred) {
                        that._deferred.resolve();
                        promise = that._deferred.promise;
                    }
                }
                return promise.then(function() {
                    return result;
                });
            },

            /**
             * Checks if the specified options contains the minimal required
             * level of priority to open the popup
             */
            _checkPriority : function(options) {
                var priority = options.priority || 0;
                var thisPriority = this._priority || 0;
                return priority >= thisPriority;
            },

        });

        /** A view responsible for the map visualization. */
        Mosaic.MapView = Mosaic.DataSetView.extend({
            type : 'MapView',

            /**
             * Returns the underlying Leaflet map object. This method is used by
             * MapAdapters to visualize data on the map.
             */
            getMap : function() {
                return this._map;
            },

            /**
             * Returns an object controlling the state of popup windows on the
             * map
             */
            getPopupControl : function() {
                if (!this._popupControl) {
                    this._popupControl = new Mosaic.MapPopupControl({
                        map : this._map
                    });
                }
                return this._popupControl;
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
                this._newMap();
                this.resetView();
            },

            /**
             * This method is called when the application stops. It removes the
             * underlying map from the DOM.
             */
            onStop : function() {
                this._map.remove();
                delete this._map;
            },

            /**
             * Creates and returns a new Leaflet map object.
             */
            _newMap : function() {
                var that = this;
                var mapOptions = _.extend({}, this.options.mapOptions);
                var controls = [];
                _.each(mapOptions, function(value, key) {
                    if (key.match(/Control$/) && _.isObject(value)) {
                        controls.push(value);
                        mapOptions[key] = false;
                    }
                })
                var element = this.getElement();
                var map = this._map = L.map(element[0], mapOptions);
                _.each(controls, function(control) {
                    if (control && _.isObject(control)) {
                        map.addControl(control);
                    }
                })
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
            }
        })

        /**
         * A static method used to extract MapView options from an HTML element.
         * This method is automatically called by the Mosaic.AppConfigurator
         * class to configure this type of views.
         */
        Mosaic.MapView.newOptions = function(app, mapElement) {
            var options = app.getOptions();
            var center = mapElement.data('center') || [ 0, 0 ];
            var zoom = mapElement.data('zoom');
            var minZoom = mapElement.data('min-zoom') || 2;
            var maxZoom = mapElement.data('max-zoom') || 18;
            var zoomControl = mapElement.data('zoom-control');
            var mapOptions = {};
            if (zoomControl !== undefined) {
                if (zoomControl !== false) {
                    var position = _.isString(zoomControl) ? zoomControl
                            : 'topleft';
                    mapOptions.zoomControl = L.control.zoom({
                        position : position
                    });
                } else {
                    mapOptions.zoomControl = null;
                }
            }
            return _.extend({
                app : app,
                el : mapElement,
                minZoom : minZoom,
                maxZoom : maxZoom,
                initialZoom : zoom,
                initialCenter : center,
                mapOptions : mapOptions
            }, options.mapOptions);
        }

        /* ------------------------------------------------- */

        /** List view. Used to visualize all resources in a side bar. */
        Mosaic.ListView = Mosaic.DataSetView.extend({
            type : 'ListView'
        })
        /**
         * A static method initializing options from the specified element.
         */
        Mosaic.ListView.newOptions = function(app, elm) {
            var options = app.getOptions();
            return _.extend({
                app : app,
                el : elm
            }, options.listOptions);
        };

        /* ------------------------------------------------- */
        /**
         * An abstract ViewAdapter used as a superclass for all DataSet - View
         * adapters.
         */
        Mosaic.ViewAdapter = Mosaic.Class.extend({

            stopListening : Mosaic.Mixins.stopListening,

            listenTo : Mosaic.Mixins.listenTo,

            initialize : function(options) {
                this.options = options || {};
                this._view = this.options.view;
                this._dataSet = this.options.dataSet;
                this._resetViewIndex();
                this._delegateEventsToViews();
            },

            /**
             * This method is used to create and return a view corresponding to
             * the specified resource and a ViewType.
             */
            newResourceView : function(Type, resource) {
                var result = this._dataSet.getResourceAdapter(resource, Type, {
                    resource : resource,
                    dataSet : this._dataSet,
                    parentView : this._view
                });
                return result;
            },

            /**
             * Attaches event listeners to the underlying data set to notify all
             * managed view about changes with resource states
             */
            _delegateEventsToViews : function() {
                var that = this;
                function handler(method, e) {
                    var resource = that._dataSet.getResourceFromEvent(e);
                    var view = that._getResourceView(resource);
                    if (!view) {
                        return;
                    }
                    view.triggerMethod(method, e);
                }
                var resourceStates = Mosaic.DataSet.getResourceStates();
                _.each(resourceStates, function(conf) {
                    that.listenTo(that._dataSet, conf.on, function(e) {
                        handler(conf.on, e);
                    });
                    that.listenTo(that._dataSet, conf.off, function(e) {
                        handler(conf.off, e);
                    });
                });
            },
            /**
             * Resets the internal index of views.
             */
            _addResourceViewToIndex : function(view) {
                if (!view || !view.getResource)
                    return;
                var resource = view.getResource();
                var resourceId = this._dataSet.getResourceId(resource);
                this._viewIndex[resourceId] = view;
            },

            /** Removes the specified view from the internal index */
            _removeResourceViewFromIndex : function(view) {
                if (!view || !view.getResource)
                    return;
                var resource = view.getResource();
                var resourceId = this._dataSet.getResourceId(resource);
                delete this._viewIndex[resourceId];
            },

            /**
             * Resets the internal index of views.
             */
            _resetViewIndex : function() {
                this._viewIndex = {};
            },

            /** Returns a view corresponding to the specified resource */
            _getResourceView : function(resource) {
                var resourceId = this._dataSet.getResourceId(resource);
                return this._viewIndex[resourceId];
            },

        })

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

        /* ------------------------------------------------- */

        /** This view is used to create customized markers */
        Mosaic.MapMarkerView = Mosaic.ResourceView.extend({
            type : 'MapMarkerView',
        });

        /**
         * This method returns <code>true</code> if the marker object contains
         * a visual HTML representation for a map marker or it is used just as a
         * source of marker options.
         */
        Mosaic.MapMarkerView.hasHtmlMarker = function(view) {
            return view.template ? true : false;
        }

        /* ------------------------------------------------- */

        /** Visualization of the content in the popup view. */
        Mosaic.MapPopupView = Mosaic.TemplateView.extend({});

        /**
         * An utility method used to register popup views for multiple resource
         * types. The specified configuration object should contain resource
         * types with the corresponding popup view classes.
         */
        Mosaic.MapPopupView.registerViews = Mosaic._registerTypeAdapters;

        /* ------------------------------------------------- */

        Mosaic.MapActivePopupView = Mosaic.MapPopupView.extend({
            type : 'MapActivePopupView'
        });

        /* ------------------------------------------------- */

        Mosaic.MapFocusedPopupView = Mosaic.MapPopupView.extend({
            type : 'MapFocusedPopupView'
        });

        /**
         * DataSetMapAdapter - an abstract superclass for MapView adapters
         */
        Mosaic.DataSetMapAdapter = Mosaic.ViewAdapter.extend({

            /**
             * An internal method showing a popup with the rendered resource.
             * Resource view depends on the mode of visualization (which is
             * defined by the specified adapter type).
             */
            _showPopup : function(e, AdapterType, viewPriority) {
                var that = this;
                var resource = that._dataSet.getResourceFromEvent(e);
                var resourceId = that._dataSet.getResourceId(resource);
                if (!resource || !resourceId)
                    return;

                // Exit if there is no layers corresponding to the
                // specified resource
                var layer = that._getResourceLayer(resource);

                /* Creates a view for this resource */
                var view = that.newResourceView(AdapterType, resource);
                // Exit if there is no visualization defined for the
                // current resource type
                if (!view) {
                    return;
                }

                // Render the view
                view.render();

                var geometry = resource.geometry || {};
                var coords;
                var isPoint = (geometry.type == 'Point');
                if (isPoint) {
                    coords = geometry.coordinates;
                }
                if (!coords) {
                    coords = e.coords;
                }

                // Get the popup options from the view
                var options = Mosaic.Utils.getOptions(view.popupOptions);

                var openPopup = function() {
                    var map = that._view.getMap();

                    // Create a new popup
                    var popup = L.popup(options);

                    // Set the popup content
                    var element = view.getElement();
                    popup.setContent(element[0]);

                    // Set the coordinates of the popup
                    var popupInitialized = false;
                    if (coords) {
                        var lat = coords[1];
                        var lng = coords[0];
                        var latlng = L.latLng(lat, lng);
                        popup.setLatLng(latlng);
                        popupInitialized = true;
                    }

                    // Prepare the resulting deferred object
                    // It is used to close the popup
                    var deferred = Mosaic.Promise.defer();
                    popup.on('close', function() {
                        deferred.resolve();
                    })
                    deferred.then(function() {
                        if (popup) {
                            map.closePopup();
                        }
                    })
                    // Open the popup
                    setTimeout(function() {
                        if (isPoint && layer && layer.bindPopup) {
                            layer.bindPopup(popup);
                            layer.openPopup();
                        } else if (popupInitialized) {
                            popup.openOn(map);
                        } else {
                            deferred.resolve();
                        }
                    }, 1);
                    return deferred;
                }

                var control = that._view.getPopupControl();
                control.open({
                    priority : viewPriority,
                    coordinates : coords,
                    layer : layer,
                    action : openPopup
                }).done();
            },

            /**
             * clos Closes popup if it shows the specified resource with the
             * same priority level
             */
            _closePopup : function(e, AdapterType, viewPriority) {
                var control = this._view.getPopupControl();
                return control.close({
                    priority : viewPriority
                });
            },

            /**
             * This internal method binds data set event listeners visualizing
             * resources in popups.
             */
            _bindDataEventListeners : function() {
                this.listenTo(this._dataSet, 'update', function(e) {
                    this._doRender();
                });
                this.listenTo(this._dataSet, 'activateResource', function(e) {
                    var that = this;
                    var resource = that._dataSet.getResourceFromEvent(e);
                    var viewPriority = e.priority;
                    var doShow = function() {
                        that._showPopup(e, Mosaic.MapActivePopupView,
                                viewPriority);
                    };
                    var layer = that._getResourceLayer(resource);
                    var clusterLayer = that._groupLayer.clusterLayer;
                    if (layer && clusterLayer && clusterLayer.hasLayer(layer)) {
                        clusterLayer.zoomToShowLayer(layer, doShow);
                    } else {
                        doShow();
                    }
                });
                this.listenTo(this._dataSet, 'deactivateResource', function(e) {
                })
                this.listenTo(this._dataSet, 'focusResource', function(e) {
                    var viewPriority = e.priority;
                    this
                            ._showPopup(e, Mosaic.MapFocusedPopupView,
                                    viewPriority);
                });
                this.listenTo(this._dataSet, 'blurResource', function(e) {
                    var viewPriority = e.priority;
                    this._closePopup(e, Mosaic.MapFocusedPopupView,
                            viewPriority);
                })
            },
            /**
             * This internal method unbinds/removes event listeners from the
             * underlying data set.
             */
            _unbindDataEventListeners : function() {
                this.stopListening(this._dataSet, 'update');
                this.stopListening(this._dataSet, 'activateResource');
                this.stopListening(this._dataSet, 'deactivateResource');
                this.stopListening(this._dataSet, 'blurResource');
            },

            /**
             * This internal method binds event listeners to map layers. These
             * listeners activates / deactivate / focus or blur the
             * corresponding resource.
             */
            _bindLayerEventListeners : function(layer, resourceProvider) {
                var that = this;
                /**
                 * Fires an resource event (activateResource /
                 * deactivateResource / focusResource / blurResource ...).
                 */
                function fireResourceEvent(method, e) {
                    var resource = resourceProvider(e);
                    if (!resource)
                        return;
                    var resourceId = that._dataSet.getResourceId(resource);
                    var coords = [ e.latlng.lng, e.latlng.lat ];
                    var event = that._dataSet.newEvent({
                        resource : resource,
                        coords : coords
                    });
                    that._dataSet[method](event);
                }
                layer.on('mouseover', function(e) {
                    fireResourceEvent('focusResource', e);
                })
                layer.on('mouseout', function(e) {
                    fireResourceEvent('blurResource', e);
                })
                layer.on('click', function(e) {
                    fireResourceEvent('activateResource', e);
                })
            },

            /**
             * This internal method unbinds/removes event listeners from the
             * specified map layer.
             */
            _unbindLayerEventListeners : function(layer, resourceProvider) {
                layer.off('mouseover');
                layer.off('mouseout');
                layer.off('click');
            },

            /**
             * Returns options value corresponding to the specified key of the
             * internal dataset
             */
            _getDatasetOptions : function(optionsKey, defaultValue) {
                var value = Mosaic.Utils.getOption(this._dataSet, optionsKey);
                if (value === undefined) {
                    value = Mosaic.Utils.getOption(this._dataSet.options,
                            optionsKey);
                }
                if (value === undefined) {
                    value = defaultValue;
                }
                return value;
            },

            /** This method renders data on the view. */
            renderView : function() {
                var that = this;
                that._unbindDataEventListeners();
                that.resetView();
                this._groupLayer = new L.FeatureGroup();
                this._doRender();
                var map = this._view.getMap();
                map.addLayer(this._groupLayer);
                that._bindDataEventListeners();
            },

            /** Removes data visualization from the parent view. */
            resetView : function() {
                var map = this._view.getMap();
                map.closePopup();
                if (this._groupLayer) {
                    map.removeLayer(this._groupLayer);
                    delete this._groupLayer;
                }
                this.stopListening();
            },

            /* Methods to overload in subclasses */

            /**
             * Should return a layer corresponding to the specified resource (to
             * show it in the dynamic client-side cluster). This method returns
             * null.
             */
            _getResourceLayer : function(resource) {
                return undefined;
            }
        });

        /* ------------------------------------------------- */

        /** GeoJsonDataSet - MapView adapter */
        Mosaic.GeoJsonMapViewAdapter = Mosaic.DataSetMapAdapter
                .extend({

                    /**
                     * Initializes this data set adapter. It creates an internal
                     * index of Leaflet layers used to easy retrieve layeres by
                     * resource identifiers.
                     */
                    initialize : function() {
                        var parent = Mosaic.DataSetMapAdapter.prototype;
                        parent.initialize.apply(this, arguments);
                        this._index = {};
                    },

                    /**
                     * Returns <code>true</code> if the specified geometry is
                     * empty.
                     */
                    _isEmptyGeometry : function(geom) {
                        return (!geom || !geom.coordinates
                                || !geom.coordinates.length
                                || !geom.coordinates[0] || !geom.coordinates[1]);
                    },

                    /** Cleans up already existing widgets */
                    _clearView : function() {
                        var that = this;
                        var groupLayer = that._groupLayer;
                        _.each(this._index, function(layer, resourceId) {
                            groupLayer.removeLayer(layer);
                        })
                        if (groupLayer.clusterLayer) {
                            groupLayer.removeLayer(groupLayer.clusterLayer);
                            delete groupLayer.clusterLayer;
                        }
                        delete that._index;
                    },

                    /** Visualizes all data associated with this data set */
                    _doRender : function() {
                        var that = this;
                        this._clearView();

                        this._index = {};
                        var clusterLayer = null;
                        var makeCluster = that._getDatasetOptions(
                                'clusterPoints', false);
                        if (makeCluster) {
                            var clusterOptions = that._getDatasetOptions(
                                    'clusterOptions', {});
                            clusterOptions = _.extend({
                                spiderfyOnMaxZoom : true,
                                removeOutsideVisibleBounds : true
                            }, clusterOptions)
                            clusterLayer = new L.MarkerClusterGroup(
                                    clusterOptions);
                        }
                        if (clusterLayer) {
                            that._groupLayer.addLayer(clusterLayer);
                            that._groupLayer.clusterLayer = clusterLayer;
                        }
                        var that = this;
                        this._dataSet.loadResources({}).then(
                                function(cursor) {
                                    var resources = cursor.getList();
                                    _.each(resources, function(resource) {
                                        that._renderResourceFigure(resource,
                                                that._groupLayer);
                                    }, that);
                                })
                    },

                    /**
                     * Returns an options object defining visualization of
                     * figures on the map.
                     */
                    _getFigureOptions : function(resource) {
                        /* Creates a view for this resource */
                        var options = _.extend({}, resource.geometry.options);
                        var view = this.newResourceView(Mosaic.MapMarkerView,
                                resource);
                        if (view) {
                            view.render();
                            options = _.extend(options, Mosaic.Utils
                                    .getOptions(view.options));
                            var iconOptions = Mosaic.Utils
                                    .getOptions(view.icon);
                            if (Mosaic.MapMarkerView.hasHtmlMarker(view)) {
                                iconOptions.html = view.getElement().html();
                                iconOptions = _.extend({
                                    className : '',
                                    iconSize : [ undefined, undefined ]
                                }, iconOptions);
                                options.icon = L.divIcon(iconOptions);
                            } else if (iconOptions.iconUrl) {
                                options.icon = L.icon(iconOptions);
                            }
                        }
                        options.view = view;
                        return options;
                    },
                    /**
                     * Renders an individual resource and adds the corresonding
                     * Leaflet layer to the specified group layer
                     */
                    _renderResourceFigure : function(resource, groupLayer) {
                        var geom = resource.geometry;
                        if (this._isEmptyGeometry(geom)) {
                            return false;
                        }
                        var options = this._getFigureOptions(resource);
                        var layer = L.GeoJSON.geometryToLayer(resource,
                                function(resource, latlng) {
                                    var layer = new L.Marker(latlng, options);
                                    layer._ismarker = true;
                                    return layer;
                                }, L.GeoJSON.coordsToLatLng, options);
                        this._bindLayerEventListeners(layer, function(e) {
                            return resource;
                        });

                        var resourceId = this._dataSet.getResourceId(resource);
                        this._index[resourceId] = layer;
                        if (groupLayer.clusterLayer && layer._ismarker) {
                            groupLayer.clusterLayer.addLayer(layer);
                        } else {
                            groupLayer.addLayer(layer);
                        }
                    },

                    /**
                     * Returns a Leaflet layer corresponding to the specified
                     * resource.
                     */
                    _getResourceLayer : function(resource) {
                        var that = this;
                        var id = that._dataSet.getResourceId(resource);
                        var layer = that._index[id];
                        return layer;
                    }

                });

        /* ------------------------------------------------- */
        /** Resource visualization in the list. */
        Mosaic.ListItemView = Mosaic.TemplateView.extend({
            type : 'ListItemView'
        });

        /**
         * An utility method used to register resource list views for multiple
         * resource types. The specified configuration object should contain
         * resource types with the corresponding list view classes.
         */
        Mosaic.ListItemView.registerViews = Mosaic._registerTypeAdapters;

        /* ------------------------------------------------- */
        /** GeoJsonDataSet - ListView adapter */
        Mosaic.GeoJsonListViewAdapter = Mosaic.ViewAdapter.extend({

            /** Renders the specified dataset on the view (on the list). */
            renderView : function() {
                this._container = $('<div></div>');
                var element = this._view.getElement();
                element.append(this._container);

                var that = this;
                that._unbindDataEventListeners();
                that._resetViewIndex();
                that._dataSet.loadResources({}).then(
                        function(cursor) {
                            var list = cursor.getList();
                            _.each(list, function(resource) {
                                var view = that.newResourceView(
                                        Mosaic.ListItemView, resource);
                                if (view) {
                                    that._addResourceViewToIndex(view);
                                    that._container.append(view.getElement());
                                    view.render();
                                }
                            }, that);
                        })
                that._delegateEventsToViews();
                that._bindDataEventListeners();
            },

            /**
             * Binds list data event listeners scrolling active items into the
             * view.
             */
            _bindDataEventListeners : function() {
                var that = this;
                that.listenTo(that._dataSet, 'activateResource', function(e) {
                    var resource = that._dataSet.getResourceFromEvent(e);
                    var view = that._getResourceView(resource);
                    if (!view) {
                        return;
                    }
                    var top = view.$el.position().top
                            + that._container.scrollTop()
                            - that._container.position().top;
                    that._view.$el.animate({
                        scrollTop : top
                    }, 300);
                });
            },

            /**
             * This internal method unbinds/removes event listeners from the
             * underlying data set.
             */
            _unbindDataEventListeners : function() {
                var that = this;
                that.stopListening(that._dataSet, 'activateResource');
            },

            /** Removes all rendered resources from the list. */
            resetView : function() {
                this.stopListening();
                this._container.remove();
            }
        })

        /* ------------------------------------------------- */

        /** Full view. Used to visualize individual resources in expanded mode. */
        Mosaic.ExpandedView = Mosaic.DataSetView.extend({
            type : 'ExpandedView',
            setResourceView : function(view) {
                console.log(view);
            }
        })

        /** GeoJsonDataSet - ExpandedView adapter */
        Mosaic.GeoJsonExpandedViewAdapter = Mosaic.ViewAdapter.extend({

            /** Renders the specified dataset on the view (on the list). */
            renderView : function() {
                var that = this;
                that._resetViewIndex();
                that.listenTo(that._dataSet, 'expandResource', function(event) {
                    var resource = that._dataSet.getResourceFromEvent(event);
                    var id = that._dataSet.getResourceId(resource);
                    var view = that.newResourceView(Mosaic.ExpandedView,
                            resource);
                    that._view.setResourceView(view);
                })
                that._delegateEventsToViews();
            },
            /** Removes all rendered resources from the list. */
            resetView : function() {
                this.stopListening();
            }
        })

        /* ------------------------------------------------- */

        /** Adapters of tilesets to the MapView */
        Mosaic.TileSetMapViewAdapter = Mosaic.DataSetMapAdapter.extend({

            /** Initializes this object. */
            initialize : function(options) {
                var proto = Mosaic.DataSetMapAdapter.prototype;
                proto.initialize.apply(this, arguments);
                this._setTilesLayerVisibility(true);
                this._setGridLayerVisibility(true);
            },

            /**
             * Binds listeners to the underlying data set to reflect data
             * changes on the map.
             */
            _bindDataEventListeners : function() {
                var proto = Mosaic.DataSetMapAdapter.prototype;
                proto._bindDataEventListeners.apply(this, arguments);
                this.listenTo(this._dataSet, 'hide', function(e) {
                    if (e.hideTiles) {
                        this._setTilesLayerVisibility(false);
                    }
                    if (e.hideGrid) {
                        this._setGridLayerVisibility(false);
                    }
                });
                this.listenTo(this._dataSet, 'show', function(e) {
                    if (e.showTiles) {
                        this._setTilesLayerVisibility(true);
                    }
                    if (e.showGrid) {
                        this._setGridLayerVisibility(true);
                    }
                });
                this.listenTo(this._dataSet, 'update', this._onUpdate);
            },

            /**
             * This internal method unbinds/removes event listeners from the
             * underlying data set.
             */
            _unbindDataEventListeners : function() {
                var proto = Mosaic.DataSetMapAdapter.prototype;
                proto._unbindDataEventListeners.apply(this, arguments);
                this.stopListening(this._dataSet, 'hide');
                this.stopListening(this._dataSet, 'show');
                this.stopListening(this._dataSet, 'update');
            },

            /** Returns the visibility status of the tiles layer. */
            isTilesLayerVisible : function() {
                return !!this._tilesLayerVisible;
            },

            /** Returns the visibility status of the tiles layer. */
            isGridLayerVisible : function() {
                return !!this._gridLayerVisible;
            },

            /** Show/hides tiles layer. */
            _setTilesLayerVisibility : function(visible) {
                this._tilesLayerVisible = !!visible;
                if (this._tilesLayer && this._groupLayer) {
                    if (this._tilesLayerVisible) {
                        this._groupLayer.addLayer(this._tilesLayer);
                    } else {
                        this._groupLayer.removeLayer(this._tilesLayer);
                    }
                }
            },

            /** Show/hides tiles layer. */
            _setGridLayerVisibility : function(visible) {
                this._gridLayerVisible = !!visible;
                if (this._gridLayer && this._groupLayer) {
                    if (this._gridLayerVisible) {
                        this._groupLayer.addLayer(this._gridLayer);
                    } else {
                        this._groupLayer.removeLayer(this._gridLayer);
                    }
                }
            },

            /**
             * This method is used to re-draw map tiles when the underlying data
             * set changes.
             */
            _onUpdate : function(e) {
                this._refreshView();
            },

            /** Returns z-index for these layers */
            _getZIndex : function() {
                var options = this._dataSet.getOptions();
                var zIndex = options.zIndex || 1;
                return zIndex;
            },

            /** Removes already existing tiles layer. */
            _removeTilesLayer : function() {
                if (this._tilesLayer) {
                    this._groupLayer.removeLayer(this._tilesLayer);
                    delete this._tilesLayer;
                }
            },

            /**
             * An internal method creating a new tiles layer.
             */
            _addTilesLayer : function() {
                var tilesUrl = this._dataSet.getTilesUrl();
                if (!tilesUrl)
                    return;
                var attribution = this._dataSet.getAttribution();
                var zIndex = this._getZIndex();
                var maxZoom = this._view.getMaxZoom();
                var layer = L.tileLayer(tilesUrl, {
                    attribution : attribution,
                    maxZoom : maxZoom,
                    zIndex : zIndex
                });
                this._tilesLayer = layer;
                this._setTilesLayerVisibility(this.isTilesLayerVisible());
            },

            /** Removes an already existing UTFGrid layer. */
            _removeGridLayer : function() {
                if (this._gridLayer) {
                    this._unbindLayerEventListeners(this._gridLayer);
                    this._groupLayer.removeLayer(this._gridLayer);
                    delete this._gridLayer;
                }
            },

            /** Creates and adds a new grid layer. */
            _addGridLayer : function() {
                var utfgridUrl = this._dataSet.getDataGridUrl();
                if (!utfgridUrl)
                    return;
                var layer = new L.UtfGrid(utfgridUrl);
                this._bindLayerEventListeners(layer, function(e) {
                    var data = e.data;
                    if (!data)
                        return null;
                    if (_.isString(data.properties)) {
                        // FIXME: refactor it!
                        data.properties = JSON.parse(data.properties);
                        if (!data.properties.type) {
                            data.properties.type = data.type;
                        }
                    }
                    if (_.isString(data.geometry)) {
                        data.geometry = JSON.parse(data.geometry);
                    }
                    return data;
                });
                this._gridLayer = layer;
                this._setGridLayerVisibility(this.isGridLayerVisible());
            },

            /** Reloads the tiles and tiles layers. */
            _refreshView : function() {
                this._setGridLayerVisibility(this.isGridLayerVisible());
                this._setTilesLayerVisibility(this.isTilesLayerVisible());
            },

            /** Visualizes all data associated with this data set */
            _doRender : function() {
                this._removeTilesLayer();
                this._removeGridLayer();
                this._addTilesLayer();
                this._addGridLayer();
                this._refreshView();
                this._rendered = true;
            },

        })

        /* ------------------------------------------------- */
        /* Static utility methods */

        /**
         * This method iterates over all elements tagged with the
         * "data-map-options" attribute and returns visualization options for
         * figures visualized on maps.
         */
        Mosaic.registerMapOptions = function(html) {
            html = $(html);
            // This method recursively iterates over all parent elements and add
            // all parameters defined in these elements.
            function extendOptions(options, el, set) {
                var id = el.attr('id') || _.uniqueId('template-');
                el.attr('id', id);
                // Check that the element id was not visited yet (to avoid
                // infinite reference loops)
                set = set || {};
                if (id in set)
                    return options;
                set[id] = true;
                var extendedType = el.attr('data-extends');
                if (extendedType) {
                    var parentEl = html.find(extendedType);
                    options = extendOptions(options, parentEl, set);
                }
                var newOptions = Mosaic.elementToObject(el);
                _.each(newOptions, function(opt) {
                    _.extend(options, opt);
                })
                return options;
            }
            var adapterManager = Mosaic.AdapterManager.getInstance();
            html.find('[data-map-options]').each(function() {
                var el = $(this);
                var from = el.attr('data-map-options');
                var to = 'MapFigureOptions';
                var options = extendOptions({}, el);
                adapterManager.registerAdapter(from, to, options);
            })
        }

        /**
         * This method iterates over all elements tagged with the "data-view"
         * attribute and transforms these elements into interactive views used
         * to visualize resources in various modes (on the map, in popups in the
         * list in the full view etc).
         */
        Mosaic.registerViewAdapters = function(html) {
            html = $(html);
            // This method recursively iterates over all parent elements and add
            // all methods defined in these elements.
            function extendViewType(ViewType, el, set) {
                var id = el.attr('id') || _.uniqueId('template-');
                el.attr('id', id);
                // Check that the element id was not visited yet (to avoid
                // infinite reference loops).
                set = set || {};
                if (id in set)
                    return ViewType;
                set[id] = true;
                var extendedType = el.attr('data-extends');
                if (extendedType) {
                    var parentViewEl = html.find(extendedType);
                    ViewType = extendViewType(ViewType, parentViewEl, set);
                }
                return ViewType.extendViewType(el, ViewType);
            }
            var adapterManager = Mosaic.AdapterManager.getInstance();
            html.find('[data-view]').each(
                    function() {
                        var el = $(this);
                        var from = el.attr('data-resource-type');
                        var to = el.attr('data-view');
                        var ViewType = extendViewType(Mosaic.ResourceView
                                .extend({}), el);
                        adapterManager.registerAdapter(from, to, ViewType);
                    })
        }

        /* ------------------------------------------------- */

        /**
         * This class is used to configure an application using HTML elements as
         * a source of references to DataSets, templates etc.
         */
        Mosaic.AppConfigurator = Mosaic.Class.extend({
            /**
             * This method initializes this object. It loads templates, loads
             * datasets, activates all view panels, etc
             */
            initialize : function(options) {
                this.options = options || {};
                this.app = new Mosaic.App();
                this._initTemplates();
                this._initDataSets();
                this._initDebug();
                this._initViews();
            },
            /** Returns the application parameters (options). */
            getOptions : function() {
                return this.options || {};
            },
            /** Starts the application */
            start : function() {
                this.app.start();
            },
            /** Starts the application */
            stop : function() {
                this.app.stop();
            },
            /** Adds a set of GeoJSON objects to this application */
            addGeoJsonDataSet : function(geoJson, options) {
                var data = _.isArray(geoJson.features) ? geoJson.features : _
                        .toArray(geoJson);
                var options = _.extend({}, options, {
                    data : data
                });
                var dataSet = new Mosaic.GeoJsonDataSet(options);
                this.app.addDataSet(dataSet);
            },
            /**
             * This method loads and registers all templates for application
             * types. The main element containing templates is referenced by the
             * "templatesSelector" application parameter.
             */
            _initTemplates : function() {
                var options = this.getOptions();
                var templateElm = $(options.templatesSelector).remove();
                var templateHtml = '<div>' + templateElm.html() + '</div>';
                Mosaic.registerViewAdapters(templateHtml);
            },

            /**
             * Loads and initializes all datasets defined in the HTML element
             * referenced by the "datalayersSelector" application parameter.
             */
            _initDataSets : function() {
                var options = this.getOptions();
                var that = this;
                $(options.datalayersSelector).each(function() {
                    var elm = $(this);
                    elm.remove();
                    var dataSet;
                    var dsOptions = that._extractDataSetOptions(elm);
                    if (that._extractGeoJsonDataSetParams(elm, dsOptions)) {
                        dataSet = new Mosaic.GeoJsonDataSet(dsOptions);
                    } else if (that._extractDatasetParams(elm, dsOptions)) {
                        dataSet = new Mosaic.TilesDataSet(dsOptions);
                    }
                    if (dataSet) {
                        that.app.addDataSet(dataSet);
                    }
                })
            },

            /**
             * Adds a debug layers to the map. It allows to intercept clicks and
             * show the current mouse position on the map.
             */
            _initDebug : function() {
                Mosaic.DebugDataSet = Mosaic.DataSet.extend({});
                var adapterManager = Mosaic.AdapterManager.getInstance();
                adapterManager.registerAdapter(Mosaic.MapView,
                        Mosaic.DebugDataSet, Mosaic.ViewAdapter.extend({
                            renderView : function() {
                                var map = this._view.getMap();
                                map.on('click', function(e) {
                                    console.log(map.getZoom(), '['
                                            + e.latlng.lng + ',' + e.latlng.lat
                                            + ']');
                                })
                            }
                        }));
                this.app.addDataSet(new Mosaic.DebugDataSet());
            },
            /** Initializes all views of this application */
            _initViews : function() {
                var that = this;
                that._views = [];
                function addView(el, type) {
                    var id = that._getOrCreateId(el);
                    if (_.has(that._views, id))
                        return;
                    var TypeName = _.isFunction(type) ? type(el) : type;
                    var ViewType = Mosaic[TypeName];
                    if (!ViewType) {
                        ViewType = Mosaic[TypeName] = Mosaic.DataSetView
                                .extend({
                                    type : TypeName
                                });
                    }
                    var options;
                    if (_.isFunction(ViewType.newOptions)) {
                        options = ViewType.newOptions(that.app, el);
                    }
                    options = options || {};
                    options = _.extend(options, {
                        app : that.app,
                        el : el
                    })
                    var view = new ViewType(options)
                    that._views[id] = view;
                }
                var options = that.getOptions();
                _.each([ {
                    selector : options.mapSelector,
                    type : function() {
                        return 'MapView';
                    }
                }, {
                    selector : options.listSelector,
                    type : function(elm) {
                        return 'ListView';
                    }
                }, {
                    selector : options.viewsSelector || '[data-panel]',
                    type : function(elm) {
                        return elm.attr('data-panel');
                    }
                } ], function(o) {
                    $(o.selector).each(function() {
                        addView($(this), o.type);
                    });
                });
            },

            /**
             * Returns an identifier of the specified element. If there is no
             * identifier was defined then this method creates and ands a new
             * one.
             */
            _getOrCreateId : function(el) {
                var id = el.attr('id');
                if (!id) {
                    id = _.uniqueId('el-id-');
                    el.attr('id', id);
                }
                return id;
            },

            /** Extracts common dataset options from the specified element */
            _extractDataSetOptions : function(elm) {
                var that = this;
                var id = elm.data('map-layer');
                if (!id) {
                    id = that._getOrCreateId(elm);
                }
                var visible = elm.data('visible');
                var forceReload = !!elm.data('force-reload');
                if (!that.zIndex)
                    that.zIndex = 1;
                var attributionElm = elm.find('.attribution');
                var options = {
                    id : id,
                    forceReload : forceReload,
                    attribution : attributionElm.html(),
                    minZoom : elm.data('min-zoom'),
                    // || that.mapOptions.minZoom,
                    maxZoom : elm.data('max-zoom'),
                    // || that.mapOptions.maxZoom,
                    zIndex : that.zIndex++,
                    visible : !!visible
                }
                return options;
            },

            /**
             * Extracts GeoJson parameters from the specified element.
             */
            _extractGeoJsonDataSetParams : function(elm, options) {
                var result = false;
                var dataElm;
                var ref = elm.data('source-ref');
                if (ref) {
                    dataElm = elm.find(ref);
                }
                if (!dataElm) {
                    dataElm = elm.find('script');
                }
                if (dataElm && dataElm[0]) {
                    var data = [];
                    var objects = Mosaic.elementToObject(dataElm);
                    _.each(objects, function(obj) {
                        var array = _.toArray(obj);
                        data = data.concat(array);
                    })
                    options.data = data;
                    result = true;
                }
                if (!result) {
                    var url = elm.data('source-url');
                    if (url) {
                        if (options.forceReload) {
                            url = this._appendRandomParam(url);
                        }
                        options.url = url;
                        result = true;
                    }
                }
                if (result) {
                    options.clusterPoints = !!elm.data('cluster-points');
                }
                return result;
            },

            /**
             * Extracts Tiles/UTFGrid dataset parameters from the specified
             * element.
             */
            _extractDatasetParams : function(elm, options) {
                var that = this;
                var tilesUrl = elm.data('tiles-url');
                var datagridUrl = elm.data('utfgrid-url');
                if (!tilesUrl && !datagridUrl)
                    return false;
                if (options.forceReload) {
                    tilesUrl = that._appendRandomParam(tilesUrl);
                    datagridUrl = that._appendRandomParam(datagridUrl);
                }
                _.extend(options, {
                    tilesUrl : tilesUrl,
                    datagridUrl : datagridUrl,
                })
                return true;
            },
            /**
             * Appends a random parameter to the given URL. This method is used
             * to force resource re-loading.
             */
            _appendRandomParam : function(url) {
                if (!url)
                    return url;
                var ch = (url.indexOf('?') < 0) ? '?' : '&';
                url += ch;
                url += 'x=' + Math.random() * 1000;
                url += '-' + new Date().getTime();
                return url;
            },

        })

        /**
         * Creates and registers a new adapter of the a new view for a resource.
         * 
         * @param options.dataSetType
         *            type of dataset (ex: Mosaic.TilesDataSet)
         * @param options.viewType
         *            type of the view (ex: 'MobileDetailsView')
         * @param options.event
         *            type of the event activating this view (ex:
         *            'focusResource')
         */
        Mosaic.AppConfigurator.registerDataSetAdapter = function(options) {
            var AdapterType = Mosaic.ViewAdapter.extend({
                _handleEvent : function(e) {
                    var that = this;
                    if (that._resourceView) {
                        that._resourceView.remove();
                        that._removeResourceViewFromIndex(e.resource,
                                that._resourceView);
                        delete that._resourceView;
                    }
                    that._resourceView = that.newResourceView(options.viewType,
                            e.resource);
                    if (that._resourceView) {
                        that._addResourceViewToIndex(e.resource,
                                that._resourceView);
                        var parentView = that._view;
                        parentView.getElement().html(
                                that._resourceView.getElement());
                        that._resourceView.render();
                    }
                },
                renderView : function() {
                    this.listenTo(this._dataSet, options.event,
                            this._handleEvent);
                }
            });
            var adapters = Mosaic.AdapterManager.getInstance();
            adapters.registerAdapter(options.viewType, options.dataSetType,
                    AdapterType);
            return AdapterType;
        }

        /**
         * Adds a new view for a resource.
         * 
         * @param options.dataSetType
         *            type of the configured dataset (ex: Mosaic.TilesDataSet)
         * @param options.viewType
         *            type of the configured dataset (ex: 'MobileDetailsView')
         * @param options.event
         *            type of the event activating this view (ex:
         *            'focusResource')
         * @param options.dataSets
         *            key of the data set associated with this visualization
         *            (ex: 'myResources')
         */
        Mosaic.AppConfigurator.addResourceView = function(options) {
            var AdapterType = Mosaic.AppConfigurator
                    .registerDataSetAdapter(options);
            function toArray(o) {
                if (!o)
                    return [];
                if (_.isString(o))
                    return [ o ];
                return _.toArray(o);
            }
            AdapterType.isValid = function(opt) {
                var dataSets = toArray(options.dataSets);
                var result = dataSets.length == 0
                        || _.contains(dataSets, opt.dataSet.getId());
                return result;
            };
        }

        /* ------------------------------------------------- */

        /** Default adapters registration */

        var adapters = Mosaic.AdapterManager.getInstance();
        adapters.registerAdapter(Mosaic.MapView, Mosaic.TilesDataSet,
                Mosaic.TileSetMapViewAdapter);
        adapters.registerAdapter(Mosaic.MapView, Mosaic.GeoJsonDataSet,
                Mosaic.GeoJsonMapViewAdapter);
        adapters.registerAdapter(Mosaic.ListView, Mosaic.GeoJsonDataSet,
                Mosaic.GeoJsonListViewAdapter);
        adapters.registerAdapter(Mosaic.ExpandedView, Mosaic.GeoJsonDataSet,
                Mosaic.GeoJsonExpandedViewAdapter);

        return Mosaic;
    }
})(this);
