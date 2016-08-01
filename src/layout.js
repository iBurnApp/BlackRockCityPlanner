#! /usr/bin/env node
var StreetPlanner = require('./streetplanner.js');
var polygons = require('./polygons.js');
var fence = require('./fence.js');
var dmz = require('./dmz.js');
var fs = require('fs');

var nopt = require("nopt")
  , path = require("path")
  , knownOpts = {
    "file" : path,
    "out": path,
    "type" : [ "streets", "polygons", "outline", "fence", "dmz" ],
  }
  , shortHands = {
     "f" : ["--file"],
     "o" : ["--out"],
     "t" : ["--type"]
   }
  , parsed = nopt(knownOpts, shortHands, process.argv, 2)

var jsonFile = require(parsed.file);

var output;

switch (parsed.type) {
  case 'streets':
      var planner = new StreetPlanner(jsonFile);
      output = planner.getAllCityStreets();
    break;
  case 'polygons':
      var planner = new StreetPlanner(jsonFile);
      output = polygons.allPolygons(planner);
    break;
  case 'outline':
      var planner = new StreetPlanner(jsonFile);
      output = polygons.cityOutline(planner);
    break;
  case 'fence':
    output = fence.fence(jsonFile);
    break;
  case 'dmz':
    output = dmz.area(jsonFile);
    break;
}

if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(output,null,4), function(err) {});
} else {
    console.log(JSON.stringify(output,null,4));
}
