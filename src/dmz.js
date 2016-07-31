var streets = require('./streets.js');
var utils = require('./utils.js');
var turf = require('turf');
var Clock = require('./clock.js');

module.exports.frontArc = function(layout) {
  var dmzInfo = layout.dmz;
  var distance = utils.feetToMiles(dmzInfo.distance);
  var clock = Clock(layout.center,layout.bearing);
  var segments = dmzInfo.segments.map(function(array) {
    return array.map(function(string){
      return utils.timeStringToCompassDegress(string,layout.bearing);
    });
  });
  var line = streets.generateArcStreet(layout.center,distance,segments,5);

  line.properties.type = "other";
  return turf.linestring(line.geometry.coordinates[0],line.properties);
}

module.exports.area = function(layout) {
  var arc = module.exports.frontArc(layout);
  var properties = arc.properties;
  arc = arc.geometry.coordinates;
  var backArcDistance = utils.feetToMiles(layout.dmz.distance+layout.dmz.depth);
  var segments = layout.dmz.segments.map(function(array) {
    return array.map(function(string){
      return utils.timeStringToCompassDegress(string,layout.bearing);
    });
  });
  var backArc = streets.generateArcStreet(layout.center,backArcDistance,segments,5).geometry.coordinates[0];
  var coordinates = arc.concat(backArc.reverse());
  coordinates.push(coordinates[0]);
  return turf.polygon([coordinates],properties);
}

module.exports.toilets = function(layout) {
  var arcDistanceFromMan = utils.feetToMiles(layout.dmz.distance+layout.dmz.depth/2);
  var segments = layout.dmz.segments.map(function(array) {
    return array.map(function(string){
      return utils.timeStringToCompassDegress(string,layout.bearing);
    });
  });
  var backArc = streets.generateArcStreet(layout.center,arcDistanceFromMan,segments,5).geometry.coordinates[0];
  var properties = {"ref":"toilet"}
  var toilet1 = turf.point(backArc[0],properties);
  var toilet2 = turf.point(backArc[backArc.length-1],properties);

  return turf.featurecollection([toilet1,toilet2]);

}
