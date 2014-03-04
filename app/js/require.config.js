require
        .config({
            config : {
                // For cross-domain calls the server should return results
                // with the "Access-Control-Allow-Origin=*" HTTP header field.
                // See also:
                // * http://rockycode.com/blog/cross-domain-requirejs-text/
                text : {
                    useXhr : function(url, protocol, hostname, port) {
                        // allow cross-domain requests
                        // remote server allows CORS
                        return true;
                    }
                }
            },
            paths : {
                'backbone' : '../libs/backbone/backbone',
                'jquery' : '../libs/jquery/jquery',
                'leaflet' : '../libs/leaflet/leaflet-src',
                'leaflet.markercluster' : '../libs/leaflet.markercluster/leaflet.markercluster-src',
                'leaflet.loading' : '../libs/leaflet.loading/src/Control.Loading',
                'leaflet.rrose' : '../libs/leaflet.rrose/rrose-src',
                'leaflet.utfgrid' : '../libs/leaflet.utfgrid/leaflet.utfgrid-src',
                'text' : '../libs/requirejs-text/text',
                'underscore' : '../libs/underscore/underscore-min',
                'bootstrap' : '../libs/bootstrap/dist/js/bootstrap',
                'when' : '../libs/when/when',

                'P' : '../commons/P',
                'PathMapper' : '../commons/PathMapper',

                'leaflet.all' : '../app/Leaflet.all',
                'Batik' : '../app/Batik',
                'Batik.UI' : '../app/Batik.UI',
                'Batik.UI.IdentityMap' : '../app/Batik.UI.IdentityMap',
                'Batik.UI.DataProvider' : '../app/Batik.UI.DataProvider',
                'Batik.UI.Adapter' : '../app/Batik.UI.Adapter',
                'Batik.UI.Components' : '../app/Batik.UI.Components',
                'Batik.UI.TemplateView' : '../app/Batik.UI.TemplateView',
                'Batik.UI.MapView' : '../app/Batik.UI.MapView',
                'Batik.UI.InteractiveUtils' : '../app/Batik.UI.InteractiveUtils'
            },
            shim : {
                'backbone' : {
                    deps : [ 'underscore', 'jquery' ],
                    exports : 'Backbone'
                },
                'bootstrap' : {
                    deps : [ 'jquery' ]
                },
                'jquery' : {
                    exports : 'jquery'
                },
                'underscore' : {
                    exports : '_'
                },
                'leaflet' : {
                    exports : 'L'
                },
                'leaflet.markercluster' : {
                    deps : [ 'leaflet' ]
                },
                'leaflet.rrose' : {
                    deps : [ 'leaflet' ]
                },
                'leaflet.utfgrid' : {
                    deps : [ 'leaflet' ]
                },
                'leaflet.loading' : {
                    deps : [ 'leaflet' ]
                },
                'P' : {
                    deps : [ 'when' ]
                }
            }
        });