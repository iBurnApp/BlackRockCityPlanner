var forwardGeocoder = require('./forward.js');
var reverseGeocoder = require('./reverse.js')
var prepare = require('./prepare.js');

var Geocoder = function(layoutFile) {
  var dict = prepare(layoutFile);
  this.reverseCoder = new reverseGeocoder(dict.center,dict.centerCamp,dict.bearing,dict.reversePolygons,dict.reverseStreets);
  this.forwardCoder = new forwardGeocoder(dict.center,dict.centerCamp,dict.bearing,dict.forwardStreets,dict.forwardPolygons,dict.hardcodedLocations,dict.layoutFile);
};

// Legacy Android (pre 4.4) Javascript bridge only accepts primitives
Geocoder.prototype.forwardAsString = function(locationString) {
  var resultObj = this.forwardCoder.geocode(locationString);
  if (resultObj === undefined) {
  	return '';
  }
  var resultStr = resultObj.geometry.coordinates[0] + ', ' + resultObj.geometry.coordinates[1];
  return resultStr;
};

Geocoder.prototype.forward = function(string,string1) {
  return this.forwardCoder.geocode(string,string1);
};

Geocoder.prototype.forwardTimeDistance = function(time, distance, units)
{
  return this.forwardCoder.timeDistanceToLatLon(time, distance, units);
};

Geocoder.prototype.forwardStreetIntersection = function(timeString, featureName) {
  return this.forwardCoder.streetIntersectionToLatLon(timeString, featureName);
};

Geocoder.prototype.reverse = function(lat, lon) {
  return this.reverseCoder.geocode(lat,lon);
};

module.exports = Geocoder;
