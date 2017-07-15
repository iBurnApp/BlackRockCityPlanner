var fs = require('fs')
  , Generate = require('../generate.js')
  , nopt = require("nopt")
  , path = require("path")
  , knownOpts = {
    "directory" : path
  }
  , shortHands = {
     "d" : ["--directory"]
   }
  , parsed = nopt(knownOpts, shortHands, process.argv, 2)

var directory = parsed.directory;
var layoutPath = directory + "/layouts/layout.json"
var toiletLayoutPath = directory + "/layouts/toilet.json"

var layout = require(layoutPath);
var toiletLayout = require(toiletLayoutPath);

var outputDict = {
  "streets" : "/geo/streets.geojson",
  "polygons" : "/geo/polygons.geojson",
  "outline" : "/geo/outline.geojson",
  "fence" : "/geo/fence.geojson",
  "dmz" : "/geo/dmz.geojson"
};

for (var key in outputDict) {
  var result = Generate.generate(key,layout);
  if (result) {
    fs.writeFile(directory + outputDict[key], JSON.stringify(result,null,4), function(err) {});
  }
}

var toiletResult = Generate.generateToilets(layout,toiletLayout);
if (toiletResult) {
  fs.writeFile(directory + "/geo/toilets.geojson", JSON.stringify(toiletResult,null,4), function(err) {});
}
