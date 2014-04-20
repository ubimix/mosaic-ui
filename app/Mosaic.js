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
            stopListening : function() {
                _.each(this._listeners,
                        function(listener) {
                            var context = listener.context || this;
                            listener.obj.off(listener.event, listener.handler,
                                    context);
                        }, this);
                delete this._listeners;
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
            newAdapterInstance : function(from, to) {
                var AdapterType = this.getAdapter(from, to);
                var result = null;
                if (_.isFunction(AdapterType)) {
                    result = new AdapterType();
                }
                return result;
            },
            /** Removes an adapter from one type to another. */
            removeAdapter : function(from, to) {
                var key = this._getKey(from, to);
                var result = this._adapters[key];
                delete this._adapters[key];
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

        /** List of resource events */
        Mosaic.ResourceStates = [
        // Activates/deactivates the resources and fires the
        // "activate/deactivate" events.
        {
            field : '_activated',
            on : 'activateResource',
            off : 'deactivateResource'
        },
        // Focuses/blurs the resources and fires the "focus/blur" events
        // "activate/deactivate" events.
        {
            field : '_focused',
            on : 'focusResource',
            off : 'blurResource'
        },
        // Expand/reduce the resources (shows it in the full view).
        {
            field : '_expanded',
            on : 'expandResource',
            off : 'reduceResource'
        } ];

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
                this._dataSets = {};
                _.each(Mosaic.ResourceStates, function(conf) {
                    this[conf.on] = function(event) {
                        var resource = this.getResourceFromEvent(event);
                        if (this[conf.field]) {
                            this[conf.off](this.newEvent({
                                resource : this[conf.field]
                            }));
                        }
                        this[conf.field] = resource;
                        this.triggerMethod(conf.on, event);
                    }
                    this[conf.off] = function(event) {
                        var resource = this.getResourceFromEvent(event);
                        if (this._isSame(this[conf.field], resource)) {
                            delete this[conf.field];
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
            getResourceAdapter : function(resource, adapterType) {
                var adapters = Mosaic.AdapterManager.getInstance();
                var adapter = null;
                var resourceType = this.getResourceType(resource);
                while (adapter == null & resourceType != null) {
                    adapter = adapters.getAdapter(resourceType, adapterType);
                    var parentType = this.getParentResourceType(resourceType);
                    resourceType = parentType;
                }
                if (!adapter) {
                    adapter = adapters.getAdapter('Default', adapterType);
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

            /** Create and returns an event for the specified resource */
            newEvent : function(event) {
                event.dataSet = this;
                return event;
            }
        });

        /* --------------------------------------------------- */
        /**
         * This dataset is used as a wrapper for a collection of GeoJSON
         * objects.
         */
        Mosaic.GeoJsonDataSet = Mosaic.DataSet.extend({
            type : 'GeoJsonDataSet',

            /** Returns the underlying list of resources. */
            getResources : function() {
                var data = this.options.data;
                var list = data && _.isArray(data.features) ? data.features
                        : data;
                list = _.toArray(list);
                return list;
            },

        });

        /* --------------------------------------------------- */

        /**
         * This dataset corresponds to static map tiles. It don't have any
         * data/resources.
         */
        Mosaic.TilesDataSet = Mosaic.DataSet.extend({
            type : 'TilesDataSet',
            getTilesUrl : function() {
                return this.options.tilesUrl;
            },
            getDataGridUrl : function() {
                return this.options.datagridUrl;
            },
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

            /** Adds a new data set to this application */
            addDataSet : function(dataSet) {
                var id = dataSet.getId();
                this._dataSets[id] = dataSet;
                if (this._started) {
                    this._triggerDataSetEvent('dataSet:add', dataSet);
                }
            },

            /** Removes the specified dataset. */
            removeDataSet : function(dataSet) {
                this._triggerDataSetEvent('dataSet:remove', dataSet);
                var id = dataSet.getId();
                delete this._dataSets[id];
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
                var element = view.getElement();
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
            onDataSetRemove : function(e) {
                var dataSet = e.dataSet;
                var adapter = this.removeEntity(dataSet.getId());
                if (adapter && adapter.remove) {
                    adapter.remove();
                }
            },

            /**
             * This method is invoked when a dataset is changed.
             */
            onDataSetUpdate : function(e) {
                var dataSet = e.dataSet;
                var adapter = this.getEntity(dataSet.getId());
                if (adapter && adapter.render) {
                    adapter.render(this, dataSet);
                }
            }

        });

        /* ------------------------------------------------- */

        /** It is a common superclass used to visualize resources. */
        Mosaic.ResourceView = Mosaic.TemplateView.extend({
            initialize : function() {
                var initialize = Mosaic.TemplateView.prototype.initialize;
                initialize.apply(this, arguments);
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
        /** Add methods firing events on the underlying dataset */
        (function() {
            function fireResourceEvent(method) {
                var dataSet = this.getDataSet();
                var resource = this.getResource();
                var event = dataSet.newEvent({
                    resource : resource
                });
                dataSet[method](event);
            }
            var proto = Mosaic.ResourceView.prototype;
            _.each(Mosaic.ResourceStates, function(conf) {
                proto[conf.on] = function() {
                    fireResourceEvent.call(this, conf.on);
                }
                proto[conf.off] = function() {
                    fireResourceEvent.call(this, conf.off);
                }
            });
        })();

        /* ------------------------------------------------- */

        /**
         * This mixin method is used to create and return a view corresponding
         * to the specified resource and a ViewType. This method should be used
         * as a class method.
         */
        Mosaic.newResourceView = function(Type, resource, parentView) {
            var result = null;
            var View = this._dataSet.getResourceAdapter(resource, Type);
            if (View) {
                if (!_.isFunction(View.isValid) || View.isValid(resource)) {
                    result = new View({
                        resource : resource,
                        dataSet : this._dataSet,
                        parentView : parentView
                    });
                    if (_.isFunction(result.isValid) && !result.isValid(result)) {
                        result = null;
                    }
                }
            }
            return result;
        };

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
                    map.addControl(control);
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

        /* ------------------------------------------------- */

        /** List view. Used to visualize all resources in a side bar. */
        Mosaic.ListView = Mosaic.DataSetView.extend({
            type : 'ListView'
        })

        /* ------------------------------------------------- */
        /**
         * An abstract ViewAdapter used as a superclass for all DataSet - View
         * adapters.
         */
        Mosaic.ViewAdapter = Mosaic.Class.extend({
            stopListening : Mosaic.Mixins.stopListening,
            listenTo : Mosaic.Mixins.listenTo
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

            /** Initializes this object */
            initialize : function(options) {
                this.options = options || {};
                var timeout = 100;
                _.each([ /* '_showPopup' , '_closePopup' */], function(name) {
                    this[name] = _.debounce(_.bind(this[name], this), timeout);
                }, this);
            },

            /** Creates and returns a new rsource view */
            newResourceView : Mosaic.newResourceView,

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
                if (!layer) {
                    return;
                }

                /* Creates a view for this resource */
                var view = that.newResourceView(AdapterType, resource,
                        that._view);
                // Exit if there is no visualization defined for the
                // current resource type
                if (!view) {
                    return;
                }

                // Render the view
                view.render();

                var geometry = resource.geometry || {};
                var coords;
                if (geometry.type == 'Point') {
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
                    var lat = coords[1];
                    var lng = coords[0];
                    var latlng = L.latLng(lat, lng);
                    popup.setLatLng(latlng);

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
                        if (layer.bindPopup) {
                            layer.bindPopup(popup);
                            layer.openPopup();
                        } else {
                            popup.openOn(map);
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
                this.listenTo(this._dataSet, 'activateResource', function(e) {
                    var that = this;
                    var resource = that._dataSet.getResourceFromEvent(e);
                    var layer = that._getResourceLayer(resource);
                    if (!layer) {
                        return;
                    }
                    var doShow = function() {
                        var viewPriority = 2;
                        that._showPopup(e, Mosaic.MapActivePopupView,
                                viewPriority);
                    };
                    if (that._groupLayer.clusterLayer) {
                        that._groupLayer.clusterLayer.zoomToShowLayer(layer,
                                doShow);
                    } else {
                        doShow();
                    }
                });
                this.listenTo(this._dataSet, 'deactivateResource', function(e) {
                })
                this.listenTo(this._dataSet, 'focusResource', function(e) {
                    var viewPriority = 1;
                    this
                            ._showPopup(e, Mosaic.MapFocusedPopupView,
                                    viewPriority);
                });
                this.listenTo(this._dataSet, 'blurResource', function(e) {
                    var viewPriority = 1;
                    this._closePopup(e, Mosaic.MapFocusedPopupView,
                            viewPriority);
                })
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
            render : function(view, dataSet) {
                this._view = view;
                this._dataSet = dataSet;
                var that = this;
                this._groupLayer = new L.FeatureGroup();
                this._doRender(this._groupLayer);
                var map = this._view.getMap();
                map.addLayer(this._groupLayer);
                that._bindDataEventListeners();
            },

            /** Removes data visualization from the parent view. */
            remove : function() {
                if (this._groupLayer) {
                    var map = this._view.getMap();
                    map.removeLayer(this._groupLayer);
                    delete this._groupLayer;
                }
                this.stopListening();
            },

            /* Methods to overload in subclasses */

            /** Returns a layer corresponding to the specified resource */
            _getResourceLayer : function(e) {
                throw new Error('Not implemented');
            }
        });

        /* ------------------------------------------------- */

        /** GeoJsonDataSet - MapView adapter */
        Mosaic.GeoJsonMapViewAdapter = Mosaic.DataSetMapAdapter.extend({

            /**
             * Initializes this data set adapter. It creates an internal index
             * of Leaflet layers used to easy retrieve layeres by resource
             * identifiers.
             */
            initialize : function() {
                var parent = Mosaic.DataSetMapAdapter.prototype;
                parent.initialize.apply(this, arguments);
                this._index = {};
            },

            /**
             * Returns <code>true</code> if the specified geometry is empty.
             */
            _isEmptyGeometry : function(geom) {
                return (!geom || !geom.coordinates || !geom.coordinates.length
                        || !geom.coordinates[0] || !geom.coordinates[1]);
            },

            /**
             * Returns an options object defining visualization of figures on
             * the map.
             */
            _getFigureOptions : function(resource) {
                /* Creates a view for this resource */
                var options = _.extend({}, resource.geometry.options);
                var view = this.newResourceView(Mosaic.MapMarkerView, resource,
                        this._view);
                if (view) {
                    view.render();
                    options = _.extend(options, Mosaic.Utils
                            .getOptions(view.options));
                    var iconOptions = Mosaic.Utils.getOptions(view.icon);
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

            _doRender : function(groupLayer) {
                var that = this;
                this._index = {};
                var clusterLayer = null;
                var makeCluster = that._getDatasetOptions('clusterPoints',
                        false);
                if (makeCluster) {
                    var clusterOptions = that._getDatasetOptions(
                            'clusterOptions', {});
                    clusterOptions = _.extend({
                        spiderfyOnMaxZoom : true,
                        removeOutsideVisibleBounds : true
                    }, clusterOptions)
                    clusterLayer = new L.MarkerClusterGroup(clusterOptions);
                }
                _.each(this._dataSet.getResources(), function(resource) {
                    var geom = resource.geometry;
                    if (this._isEmptyGeometry(geom)) {
                        return false;
                    }
                    var options = this._getFigureOptions(resource);
                    var layer = L.GeoJSON.geometryToLayer(resource, function(
                            resource, latlng) {
                        var layer = new L.Marker(latlng, options);
                        layer._ismarker = true;
                        return layer;
                    }, L.GeoJSON.coordsToLatLng, options);
                    this._bindLayerEventListeners(layer, function(e) {
                        return resource;
                    });

                    var resourceId = this._dataSet.getResourceId(resource);
                    this._index[resourceId] = layer;
                    if (clusterLayer && layer._ismarker) {
                        clusterLayer.addLayer(layer);
                    } else {
                        groupLayer.addLayer(layer);
                    }
                }, this);
                if (clusterLayer) {
                    groupLayer.addLayer(clusterLayer);
                    groupLayer.clusterLayer = clusterLayer;
                }
            },

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

            /** Creates and returns a new rsource view */
            newResourceView : Mosaic.newResourceView,

            /** Renders the specified dataset on the view (on the list). */
            render : function(view, dataSet) {
                this._view = view;
                this._dataSet = dataSet;
                this._container = $('<div></div>');
                var element = this._view.getElement();
                element.append(this._container);
                var list = this._dataSet.getResources();
                list = _.toArray(list);
                var that = this;
                _.each(list, function(resource) {
                    var view = this.newResourceView(Mosaic.ListItemView,
                            resource, this._view);
                    if (view) {
                        this._container.append(view.getElement());
                        view.render();
                    }
                }, this);
            },
            /** Removes all rendered resources from the list. */
            remove : function() {
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

            /** Creates and returns a new rsource view */
            newResourceView : Mosaic.newResourceView,

            /** Renders the specified dataset on the view (on the list). */
            render : function(view, dataSet) {
                var that = this;
                that._view = view;
                that._dataSet = dataSet;
                that.listenTo(that._dataSet, 'expandResource', function(event) {
                    var resource = that._dataSet.getResourceFromEvent(event);
                    var id = that._dataSet.getResourceId(resource);
                    var view = that.newResourceView(Mosaic.ExpandedView,
                            resource, that._view);
                    that._view.setResourceView(view);
                })
            },
            /** Removes all rendered resources from the list. */
            remove : function() {
                this.stopListening();
            }
        })

        /* ------------------------------------------------- */

        /** Adapters of tilesets to the MapView */
        Mosaic.TileSetMapViewAdapter = Mosaic.DataSetMapAdapter.extend({

            initialize : function() {
                var parent = Mosaic.DataSetMapAdapter.prototype;
                parent.initialize.apply(this, arguments);
            },

            _doRender : function(groupLayer) {
                this._tilesLayer = undefined;
                this._gridLayer = undefined;
                var maxZoom = this._view.getMaxZoom();
                var attribution = this._dataSet.getAttribution();
                var tilesUrl = this._dataSet.getTilesUrl();
                if (tilesUrl) {
                    var layer = this._tilesLayer = L.tileLayer(tilesUrl, {
                        attribution : attribution,
                        maxZoom : maxZoom
                    });
                    groupLayer.addLayer(layer);
                }

                var utfgridUrl = this._dataSet.getDataGridUrl();
                if (utfgridUrl) {
                    var layer = this._gridLayer = new L.UtfGrid(utfgridUrl);
                    this._bindLayerEventListeners(layer, function(e) {
                        var data = e.data;
                        if (!data)
                            return null;
                        if (_.isString(data.properties)) {
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
                    groupLayer.addLayer(layer);
                }
            },

            _getResourceLayer : function(resource) {
                return this._gridLayer;
            }
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
                this._initMapOptions();
                this._initListOptions();
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
             * Initializes all map options from the element referenced by the
             * "mapSelector" application parameter.
             */
            _initMapOptions : function() {
                var options = this.getOptions();
                var mapElement = $(options.mapSelector);
                var center = mapElement.data('center') || [ 0, 0 ];
                var zoom = mapElement.data('zoom');
                var minZoom = mapElement.data('min-zoom') || 2;
                var maxZoom = mapElement.data('max-zoom') || 18;
                var zoomControl = mapElement.data('zoom-control');
                this.mapOptions = _.extend({
                    app : this.app,
                    el : mapElement,
                    minZoom : minZoom,
                    maxZoom : maxZoom,
                    initialZoom : zoom,
                    initialCenter : center,
                }, options.mapOptions);
            },
            /**
             * Initializes list options from the element referenced by the
             * "listSelector" application parameter.
             */
            _initListOptions : function() {
                var options = this.getOptions();
                var listElement = $(options.listSelector);
                this.listOptions = _.extend({
                    app : this.app,
                    el : listElement
                }, options.listOptions);
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
                    var dataSetOptions = that._extractDatasetParams(elm);
                    var dataSet = new Mosaic.TilesDataSet(dataSetOptions);
                    that.app.addDataSet(dataSet);
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
                            render : function(view, data) {
                                var map = view.getMap();
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
                this.mapPanel = new Mosaic.MapView(this.mapOptions);
                this.listPanel = new Mosaic.ListView(this.listOptions);
            },
            /** Extracts dataset parameters from the specified element. */
            _extractDatasetParams : function(elm) {
                var that = this;
                var visible = elm.data('visible');
                var tilesUrl = elm.data('tiles-url');
                var datagridUrl = elm.data('utfgrid-url');
                if (!tilesUrl && !datagridUrl)
                    return null;
                var forceReload = !!elm.data('force-reload');
                if (forceReload) {
                    tilesUrl = that._appendRandomParam(tilesUrl);
                    datagridUrl = that._appendRandomParam(datagridUrl);
                }
                if (!that.zIndex)
                    that.zIndex = 1;
                var attributionElm = elm.find('.attribution');
                var dataSetOptions = {
                    attribution : attributionElm.html(),
                    tilesUrl : tilesUrl,
                    datagridUrl : datagridUrl,
                    minZoom : elm.data('min-zoom') || that.mapOptions.minZoom,
                    maxZoom : elm.data('max-zoom') || that.mapOptions.maxZoom,
                    zIndex : that.zIndex++,
                    visible : !!visible
                };
                return dataSetOptions;
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
            }
        })

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
