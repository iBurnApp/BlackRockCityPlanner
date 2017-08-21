var Geocoder = require('./geocoder/geocoder.js');
var fs = require('fs');

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

  // require() does something different depeding on the file extension (maybe?)
  var aJson = JSON.parse(fs.readFileSync(parsed.api, 'utf8'));
  var layoutFile = require(parsed.file);
  var bJson = require(parsed.burnermap);

  var combineBurnerMap = function(layout,apiJSON,burnerJSON) {
    var geocoder = new Geocoder(layout);
    var burnermapDict = {};
    //Geocode every burner map dict if it has a camp api key
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
          console.log("BurnerMap Failed: " + burnerCamp.name+": " + burnerCamp.adClock + " & " + burnerCamp.adRing);
        }
        burnermapDict[burnerCamp.apiID] = location;
      }

    })
    // Add the location to the existing official API JSON
    return apiJSON.map(function(camp){
      var location = burnermapDict[camp.uid];
      if (location) {
        camp.burnermap_location = location
      }
      // Also geocode official camp address if it hasn't been done already
      if (camp.location.intersection && camp.location.frontage) {
        var campGPS = geocoder.forward(camp.location.intersection, camp.location.frontage);
        if (campGPS) {
          camp.location.gps_longitude = campGPS.geometry.coordinates[0];
          camp.location.gps_latitude = campGPS.geometry.coordinates[1];
        } else {
          console.log("Official Failed: " + camp.name +": " + camp.location.intersection + " & " +  camp.location.frontage);
        }
      }
      return camp;
    });
  }

var result = combineBurnerMap(layoutFile,aJson,bJson);
if (parsed.out) {
    fs.writeFile(parsed.out, JSON.stringify(result, null, 4), function(err) {});
} else {
    console.log(JSON.stringify(result));
}
