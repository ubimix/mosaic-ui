(function() {
    var express = require("express");
    var app = express();
    var port = 3711;

    app.configure(function() {
        app.use(function(req, res, next) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            return next();
        });
        app.use(express.static(__dirname + '/'));
    });

    app.listen(port);
    console.log("http://127.0.0.1:" + port + '/');
})(this);