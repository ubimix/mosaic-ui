(function(define) {
    "use strict";
    define([ 'underscore', 'jquery', 'mosaic-commons' ],//
    function(_, $, Mosaic) {

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
                    var handle = eval;
                    var obj = handle(text);
                    if (_.isFunction(obj)) {
                        obj = obj();
                    }
                    results.push(obj);
                } catch (e) {
                    console.log('ERROR!', e.stack);
                }
            });
            return results;
        };

        /**
         * Template-based view. It uses HTML templates to represent information.
         */
        Mosaic.TemplateView = Mosaic.Class.extend({

            /** Name of this type */
            type : 'TemplateView',

            /**
             * Trigger events and calls onXxx methods on this object.
             */
            triggerMethod : Mosaic.Events.triggerMethod,

            /** Listens to events produced by external objects */
            listenTo : Mosaic.Events.listenTo,

            /**
             * Removes all event listeners produced by external objects.
             */
            stopListening : Mosaic.Events.stopListening,

            /** Initializes this object. */
            initialize : function(options) {
                Mosaic.Events.apply(this, arguments);
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
                var err = new Error('[' + methodName + //
                ']: Renderer method not found.');
                console.log(err.stack, el);
            },

            /**
             * This is a default method which is called after rendering if a
             * method referenced in the "data-rendered" attribute was not found.
             */
            renderedDefault : function(el, methodName) {
                var err = new Error('[' + methodName + ']: Method called ' + //
                'after the rendering process ' + 'is not defined.');
                console.log(err.stack, el);
            },

            /**
             * Default method used to handle events for which no specific
             * handlers were defined.
             */
            handleDefault : function(el, methodName) {
                var err = new Error('[' + methodName + //
                ']: A handler method with such a name ' + //
                'was not found.');
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
                }, this);
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
                if (!element) return;
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

            /**
             * Removes all registered listeners and removes this view from DOM.
             */
            remove : function() {
                this.triggerMethod('remove');
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
                    }, this);
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
                that._renderTemplate();
                if (that.className) {
                    element.attr('class', that.className);
                }
                that.renderElement(element);
                return that;
            },

            /**
             * Visualizes data using the internal template (if it is defined in
             * this view).
             */
            _renderTemplate : function() {
                var that = this;
                var template = that.template;
                if (!template) return;
                var options = _.extend({}, that.options, {
                    view : that
                });
                if (_.isString(template)) {
                    template = _.template(template);
                }
                var html = template(options);
                var element = that.getElement();
                element.html(html);
            }

        });
        // Static methods
        _.extend(Mosaic.TemplateView, Mosaic.Class);

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
            scripts = e.find('script');
            _.each(Mosaic.elementToObject(scripts), function(obj) {
                _.extend(View.prototype, obj);
            }, this);
            // Remove all scripts
            scripts.remove();

            // The rest of the code is used as a template
            var html = e.html();
            html = Mosaic.Utils.trim(html);
            if (html && html !== '') {
                View.prototype.template = html;
            }
            return View;
        };
        
        return Mosaic.TemplateView;
    });
})(typeof define === "function" && define.amd ? define : function(deps, f) {
    module.exports = f.call(this, deps.map(require));
}.bind(this));
