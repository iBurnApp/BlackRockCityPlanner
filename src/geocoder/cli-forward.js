var Geocoder = require('./geocoder.js');
var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "layout": path,
        "address": String,
    },
    shortHands = {
        "l": ["--layout"],
        "a": ["--address"],
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

var layoutFile = require(parsed.layout);

var geocoder = new Geocoder(layoutFile);

var address = parsed.address;
console.log(address);
var gps = geocoder.forwardCoder.geocode(address);

console.log(gps);
