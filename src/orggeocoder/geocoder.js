var prepare = require('./prepare.js');
var OrgForwardGeocoder = require('./forward.js');
var OrgReverseGeocoder = require('./reverse.js');

/**
 * Geocoder backed by BMorg's official GeoJSON.
 *
 * Public interface is identical to src/geocoder/geocoder.js so it can be
 * swapped in wherever the legacy geocoder is used (CLI tools, the API data
 * pipeline, and the browserified bundle both apps run).
 *
 * @param orgData {streetLines, plazas, cpns, fence, config} — see prepare.js
 */
var OrgGeocoder = function(orgData) {
  var dict = prepare(orgData);
  this.dict = dict;
  this.forwardCoder = new OrgForwardGeocoder(dict);
  this.reverseCoder = new OrgReverseGeocoder(dict);
};

OrgGeocoder.prototype.forward = function(string, string1) {
  return this.forwardCoder.geocode(string, string1);
};

OrgGeocoder.prototype.forwardTimeDistance = function(time, distance, units) {
  return this.forwardCoder.timeDistanceToLatLon(time, distance, units);
};

OrgGeocoder.prototype.forwardStreetIntersection = function(timeString, featureName) {
  return this.forwardCoder.streetIntersectionToLatLon(timeString, featureName);
};

OrgGeocoder.prototype.reverse = function(lat, lon) {
  return this.reverseCoder.geocode(lat, lon);
};

// Legacy Android (pre 4.4) Javascript bridge only accepts primitives
OrgGeocoder.prototype.forwardAsString = function(locationString) {
  var result = this.forwardCoder.geocode(locationString);
  if (result === undefined) {
    return '';
  }
  return result.geometry.coordinates[0] + ', ' + result.geometry.coordinates[1];
};

module.exports = OrgGeocoder;
