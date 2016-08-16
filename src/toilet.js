#! /usr/bin/env node

var ToiletParser = require('./toiletParser');
var LayoutParser = require('./layoutParser');
var fs = require('fs');

var nopt = require("nopt")
    , path = require("path")
    , knownOpts = {
    "file" : path,
    "toilet": path,
    "out": path,
}
    , shortHands = {
    "f" : ["--file"],
    "t" : ["--toilet"],
    "o" : ["--out"],
}
    , parsed = nopt(knownOpts, shortHands, process.argv, 2)

var layoutJSON = require(parsed.file);
var toiletJSON = require(parsed.toilet);

var layoutParser = new LayoutParser(layoutJSON);
var toiletParser = new ToiletParser(toiletJSON);

var output = toiletParser.polygons(layoutParser);
var points = toiletParser.points(layoutParser);

output.features = output.features.concat(points.features);


if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(output,null,4), function(err) {});
} else {
    console.log(JSON.stringify(output,null,4));
}