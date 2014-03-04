define([], function module() {
    var mosaic = {};
    mosaic.Log = {
        logError : function(err) {
            var args = _.toArray(arguments);
            if (err.stack) {
                args[0] = err.stack;
            }
            if (args.length == 1) {
                console.log(args[0]);
            } else if (args.length == 2) {
                console.log(args[0], args[1]);
            } else if (args.length == 3) {
                console.log(args[0], args[1], args[2]);
            } else if (args.length == 4) {
                console.log(args[0], args[1], args[2], args[3]);
            } else {
                args.splice(0, 1);
                console.log(args[0], args);
            }
        },
        log : function(obj, str, e) {
            var depth = obj._wrapDepth || 0;
            var s = '';
            for ( var i = 0; i < depth; i++) {
                s += '..';
            }
            if (e) {
                console.log(s + str, e);
            } else {
                console.log(s + str);
            }
        },
        wrap : function(name, f) {
            return function() {
                App.Log.log(this, '<' + name + '>');
                if (!this._wrapDepth)
                    this._wrapDepth = 1;
                this._wrapDepth++;
                try {
                    return f.apply(this, arguments);
                } catch (e) {
                    App.Log.log(this, e);
                } finally {
                    this._wrapDepth--;
                    App.Log.log(this, '</' + name + '>');
                }
            }
        },
        traceMethods : function(obj, pattern) {
            _.each(_.functions(obj), function(name) {
                if (!name.match(pattern)) {
                    return;
                }
                obj[name] = App.Log.wrap(name, obj[name]);
            }, obj)
        }
    }
    return mosaic;
});
