(function(define) {
    define('Leaflet.all', [ 'leaflet', 'leaflet.markercluster',
            'leaflet.utfgrid', 'leaflet.geometryutil' ], function(L) {
        return L;
    });
})

/* ------------------------------------------ */
(function(context) {
    if (typeof define === "function" && define.amd) {
        return define;
    } else {
        var isCommonJS = typeof exports === 'object';
        return function(name, deps, definition) {
            var args = [];
            for (var i = 0; i < deps.length; i++) {
                var dep = isCommonJS ? require(deps[i]) : context[deps[i]];
                args.push(dep);
            }
            var result = definition.apply(context, args);
            if (isCommonJS) {
                module.exports = result;
            } else {
                context[name] = result;
            }
        };
    }
}(this));
/* ------------------------------------------ */
