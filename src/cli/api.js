var Geocoder = require("../geocoder/geocoder.js");
var fs = require('fs');
var turf = require('@turf/turf');

var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "layout": path,
        "file": path,
        "key": String,
        "out": path
    },
    shortHands = {
        "l": ["--layout"],
        "f": ["--file"],
        "o": ["--out"],
        "k": ["--key"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

var layout = JSON.parse(fs.readFileSync(parsed.layout, 'utf8'));
var art = JSON.parse(fs.readFileSync(parsed.file, 'utf8'));
var key = parsed.key;

var coder = new Geocoder(layout);

var result = [];
art.map(function(item) {
    for (var i in item) {
        if (item[i] === null || item[i] === undefined) {
            // test[i] === undefined is probably not very useful here
            delete item[i];
         }
    }

    if (item[key]) {
        var item_val = item[key].replace(" None None","")
        var point = coder.forward(item_val);
        if (point && point.features[0]) {
            var lat = point.features[0].geometry.coordinates[1];
            var lon = point.features[0].geometry.coordinates[0];
            if (typeof lat == "number" &&
                typeof lon == "number") {
                item.location.gps_latitude = lat;
                item.location.gps_longitude = lon;
            } else {
                console.log('non-number result ' + item.name + ' @ ' + item[key] + ': ' + item.location.gps_latitude + ' /// ' + item.location.gps_longitude);
            }
        } else {
            console.log("failing point: " + JSON.stringify(point));
            console.log('could not geocode ' + item.name + ': ' + item[key]);
        }
    } else {
        delete item[key];
        delete item.location;
        console.log('missing key: ' + item.name);
    }
    result.push(item);
});

if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(result, null, 4), function(err) {});
} else {
    console.log(JSON.stringify(result));
}
