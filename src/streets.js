var utils = require('./utils.js');
var turf = require('turf');
turf.multilinestring = require('turf-multilinestring');
turf.difference = require('turf-difference');
var jsts = require("jsts");
var fence = require('./fence.js');
var Geo = require('./geo.js')


var generateArcStreetsPoints = function(layoutFile,frequency,filter) {
  var arcStreets = layoutFile.cStreets;
  var features = [];
  if (filter) {
    arcStreets = arcStreets.filter(filter)
  }
  if (!frequency){
    frequency = 5;
  }
  var bearing = layoutFile.bearing;
  arcStreets.forEach(function(item){
    var milesDistance = utils.feetToMiles(item.distance);
    var segments = item.segments;
    segments = segments.map(function(time){
      var startTime = time[0];
      var endTime = time[1];
      var startBearing = utils.timeStringToCompassDegress(startTime,bearing);
      var endBearing = utils.timeStringToCompassDegress(endTime,bearing);
      return [startBearing,endBearing];
    })
    var points = generateArcStreetPoints(layoutFile.center,milesDistance,segments,frequency);
    features.push(points);
  });
  return features;
};

/** Maybe use 1 or lower for ultra smooth lines for frequency */
var generateArcStreets = function(layoutFile,frequency,filter) {
  var arcStreets = layoutFile.cStreets;
  var features = [];
  if (filter) {
    arcStreets = arcStreets.filter(filter)
  }
  if (!frequency){
    frequency = 5;
  }
  var bearing = layoutFile.bearing;
  arcStreets.forEach(function(item){
    var milesDistance = utils.feetToMiles(item.distance);
    var segments = item.segments;
    segments = segments.map(function(time){
      var startTime = time[0];
      var endTime = time[1];
      var startBearing = utils.timeStringToCompassDegress(startTime,bearing);
      var endBearing = utils.timeStringToCompassDegress(endTime,bearing);
      return [startBearing,endBearing];
    })
    var multiLineString = generateArcStreet(layoutFile.center,milesDistance,segments,frequency);
    multiLineString.properties =  {
      "ref":item.ref,
      "name":item.name,
      "type":"arc"
    };
    features.push(multiLineString);
  });
  return turf.featureCollection(features);
};

// Segments need to be in degrees
// frequency in clock minutes
var generateArcStreet = function(center, distance, segments,frequency) {

  var frequency = 360.0/(60.0/frequency*12.0);
  var points = [];
  segments.forEach(function(item){
    var startBearing = item[0];
    var endBearing = item[1];
    var lineString = Geo.arc(center,distance,'miles',startBearing,endBearing,frequency);
    points.push(lineString.geometry.coordinates);
  });
  return turf.multilinestring(points);
};

var generateArcStreetPoints = function(center, distance, segments, frequency) {
  var frequency = 360.0/(60.0/frequency*12.0);
  var points = [];
  segments.forEach(function(item) {
    var startBearing = item[0];
    var endBearing = item[1];
    var newPoints = Geo.arcPoints(center,distance,'miles',startBearing,endBearing,frequency);
    points.push(newPoints);
  });
  return points;
};

var generateRadialStreetsPoints = function(layoutFile){
  var center = layoutFile.center;
  var streetLookup = {};
  layoutFile.cStreets.forEach(function(street){
    streetLookup[street.ref] = utils.feetToMiles(street.distance)
  });
  var points = [];
  layoutFile.tStreets.forEach(function(street){
    var segments = street.segments.map(function(segment){
      return segment.map(function(dist){
        if (typeof dist === 'number') {
          return utils.feetToMiles(dist);
        } else {
          return streetLookup[dist];
        }
      });
    });
    street.refs.forEach(function(timeString){
      var bearing = utils.timeStringToCompassDegress(timeString,layoutFile.bearing);
      var newPoints = generateRadialStreetPoints(center,bearing,segments);
      points.push(newPoints);
    });


  });
  return points;
};

//segments in distance of miles
var generateRadialStreetPoints = function(center,bearing,segments){
  var finalPoints = [];
  segments.forEach(function(distanceList){
    var points = [];
    distanceList.forEach(function(distance){
      var point = turf.destination(center, distance, bearing, 'miles');
      point.properties.distance = distance;
      point.properties.bearing = bearing;
      point.properties.units = 'miles';
      points.push(point);
    });
    finalPoints.push(points);
  });
  return finalPoints;
};

var centerCamp = {};
centerCamp.rodRoad = function(center,distance,frequency) {
  var frequency = 360.0/(60.0/frequency*12.0)
  return Geo.arc(center,distance,'miles',0,360,frequency)
};

centerCamp.rodRoadPoints = function(center,distance,frequency) {
  var frequency = 360.0/(60.0/frequency*12.0)
  return Geo.arc(center,distance,'miles',0,360,frequency)
};

centerCamp.frontageRoad = function(center, distance, start, end, frequency) {
  var frequency = 360.0/(60.0/frequency*12.0)
  return Geo.arc(center,distance,'miles',start,end,frequency)
}

module.exports = {
  generateArcStreets:generateArcStreets,
  generateArcStreet:generateArcStreet,
  generateArcStreetsPoints:generateArcStreetsPoints,
  generateRadialStreetsPoints:generateRadialStreetsPoints,
  generateRadialStreetPoints:generateRadialStreetPoints,
  centerCamp:centerCamp
};