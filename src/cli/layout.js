#! /usr/bin/env node
var Generate = require('../generate.js')
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

var output = Generate.generate(parsed.type,jsonFile);

if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(output,null,4), function(err) {});
} else {
    console.log(JSON.stringify(output,null,4));
}
