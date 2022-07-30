var Geocoder = require('./geocoder.js');
var turf = require("turf");
var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "layout": path,
        "lon": Number,
        "lat": Number
    },
    shortHands = {
        "l": ["--layout"],
        "la": ["--lat"],
        "lo": ["--lon"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

var layoutFile = require(parsed.layout);

var geocoder = new Geocoder(layoutFile);

console.log(parsed.lat);
console.log(parsed.lon);
var point = turf.point([parsed.lon,parsed.lat]);
var address = geocoder.reverseCoder.playaResult(point,{"properties":{"name":""}});

console.log(address);
