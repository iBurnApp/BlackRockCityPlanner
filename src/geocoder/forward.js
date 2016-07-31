
var turf  = require('turf');
var utils = require('../utils.js');
var Parser = require('./geocodeParser.js');
var leven = require('levenshtein');
var Clock = require('../clock.js');

var Geocoder = function(centerPoint, centerCamp, cityBearing, streets, polygons, hardcodedLocations) {
  this.centerPoint = centerPoint;
  this.centerCamp = centerCamp;
  this.cityBearing = cityBearing;
  this.streets = streets;
  this.polygons = polygons;
  this.hardcodedLocations = {};
  if (hardcodedLocations){
    this.hardcodedLocations = hardcodedLocations;
  }
  this.features = [];
  this.addFeatures(this.streets);
  this.addFeatures(this.polygons);
};

Geocoder.prototype.addFeatures = function(features) {
  this.features = this.features.concat(features.features);
};

//units must be 'miles', 'kilometers', 'degrees', 'radians'
Geocoder.prototype.timeDistanceToLatLon = function(time, distance, units) {
  
  var compassDegrees = utils.timeStringToCompassDegress(time, this.cityBearing);

  var destination = turf.destination(this.centerPoint, distance, compassDegrees, units);
  return destination;
};

Geocoder.prototype.streetIntersectionToLatLon = function(timeString, featureName) {
  if (!timeString || !featureName) {
    return undefined;
  }
  featureName = featureName.toLowerCase();
  var features = this.fuzzyMatchFeatures('name',featureName);
  var bestGuessFeature = features[0]
  var timeArray = utils.splitTimeString(timeString);
  var hour = parseInt(timeArray[0]);
  var minute = parseInt(timeArray[1]);
  var clock;
  if (featureName.indexOf("rod") > -1 ||featureName.indexOf("inner") > -1 || featureName.indexOf("66") > -1) {
    // We're inside center camp
    clock = new Clock(this.centerCamp,this.cityBearing);
  } else if (bestGuessFeature.geometry.type === "Polygon") {
    //Likely a plaza
    // We need to find intersection of time and outer polygon as line ans create new clock
    var featureCenter = turf.centroid(bestGuessFeature);
    var bearing = turf.bearing(featureCenter,this.centerPoint);
    clock = new Clock(featureCenter,bearing);
    bestGuessFeature = turf.linestring(bestGuessFeature.geometry.coordinates[0],bestGuessFeature.properties);
  }
  else {
    // Normal city center and radial time street

    //Check if we have a feature for this time
    var timeArray = this.features.filter(function(item){
      return item.properties.name === timeString
    });
    var timeRoad = timeArray[0];
    if (timeRoad) {
      var intersection = turf.intersect(timeRoad,bestGuessFeature);
      return intersection;
    }

    //otherwise we need to create a 'fake' time street and

    clock = new Clock(this.centerPoint,this.cityBearing);
  }


//Bad hack because when cirucular roads end at the 'intersecting' time street they don't really intersect so we got to fake it by
//trying raidal roads ever so slightly off 1/20 of a degree. 6:30 & B
  //Should probably use buffer and then find intersection and center of common polygon

  var imaginaryTimeStreet = clock.line(hour,minute,5,'miles');
  var radial = [imaginaryTimeStreet];

  var intersections = intersectingPoints(radial,[bestGuessFeature]);


  if (intersections.length === 0) {
    return undefined;
  } else {
    return intersections[0];
  }
};

Geocoder.prototype.fuzzyMatchFeatures = function(key, value) {
  var features = [];
  //go through all features and pull out matching items for each name
  this.features.map(function(item){
    var geoName = item.properties[key];
    if (geoName) {
      geoName=geoName.toLowerCase();
      var largestNameLength = Math.max(geoName.length, value.length);
      var match = (largestNameLength - new leven(geoName, value).distance) / largestNameLength;
      if (match > 0.6) {
        features.push(item);
      }
    }
  });
  return features;
}

function intersectingPoints(features1,features2) {
  features1Length = features1.length;
  features2Length = features2.length;

  var intersections = []

  //Compare all matching named features with eachother
  features1.map(function(item1){
    features2.map(function(item2){
      var intersection = turf.intersect(item1,item2);
      if (intersection != null) {
        intersections.push(intersection);
      }
    });
  });
  return intersections;
}

Geocoder.prototype.geocode = function(locationString) {
  if (locationString in this.hardcodedLocations) {
    return this.hardcodedLocations[locationStirng];
  } else {
    var coder = this;
    var result = Parser.parse(locationString);
    if(result.distance >= 0){

      return coder.timeDistanceToLatLon(result.time,utils.feetToMiles(result.distance),'miles');
    } else {
      return coder.streetIntersectionToLatLon(result.time,result.feature);
    }
  }
};

module.exports = Geocoder;
