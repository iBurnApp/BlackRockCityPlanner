var Geocoder = require('./geocoder/geocoder.js');

var nopt = require("nopt")
  , path = require("path")
  , knownOpts = {
    "file":path,
    "api": path,
    "burnermap" : path,
    "out": path
  }
  , shortHands = {
    "f" : ["--file"],
    "a" : ["--api"],
    "b" : ["--burnermap"],
    "o" : ["--out"]
   }
  , parsed = nopt(knownOpts, shortHands, process.argv, 2)

  var aJson = require(parsed.api);
  var layoutFile = require(parsed.file);
  var bJson = require(parsed.burnermap);

  var combineBurnerMap = function(layout,apiJSON,burnerJSON) {
    var geocoder = new Geocoder(layout);
    var burnermapDict = {};
    burnerJSON.camps.forEach(function(burnerCamp){
      if (burnerCamp.apiID.length > 0 && burnerCamp.adClock !== "?:??") {
        var geoLocation = geocoder.forward(burnerCamp.adClock,burnerCamp.adRing);
        location = {
          string: burnerCamp.adClock + " & " + burnerCamp.adRing
        }
        if (geoLocation) {
          location.gps_longitude = geoLocation.geometry.coordinates[0];
          location.gps_latitude = geoLocation.geometry.coordinates[1];
        } else {
          console.log(burnerCamp.name+": "+burnerCamp.adClock + " & " + burnerCamp.adRing);
        }
        burnermapDict[burnerCamp.apiID] = location;
      }
      
    });
    return apiJSON.map(function(camp){
      var location = burnermapDict[camp.uid];
      if (location) {
        camp.location = location
      }
      return camp;
    });
  }

var result = combineBurnerMap(layoutFile,aJson,bJson);
//console.log(JSON.stringify(result,null,4));