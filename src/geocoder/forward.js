
var turf  = require('@turf/turf');
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

  var destination = turf.destination(this.centerPoint, distance, compassDegrees, {units: units});
  return destination;
};

Geocoder.prototype.streetIntersectionToLatLon = function(timeString, featureName) {
  if (!timeString || !featureName) {
    return undefined;
  }
  featureName = featureName.toLowerCase();
  var features = this.fuzzyMatchFeatures(['name','ref'],featureName);
  var bestGuessFeature = features[0]
  if(bestGuessFeature === undefined) {
    return undefined;
  }

  var timeArray = utils.splitTimeString(timeString);
  var hour = parseInt(timeArray[0]);
  var minute = parseInt(timeArray[1]);
  var clock;
  if (featureName.indexOf("rod") > -1 ||featureName.indexOf("inner") > -1 || featureName.indexOf("66") > -1 || featureName.indexOf("center camp") > -1) {
    // We're inside center camp
    clock = new Clock(this.centerCamp,this.cityBearing);
  } else if (bestGuessFeature.geometry.type === "Polygon") {
    //Likely a plaza
    // We need to find intersection of time and outer polygon as line ans create new clock
    var featureCenter = turf.centroid(bestGuessFeature);
    var bearing = turf.bearing(featureCenter,this.centerPoint);
    clock = new Clock(featureCenter,bearing);
    bestGuessFeature = turf.lineString(bestGuessFeature.geometry.coordinates[0],bestGuessFeature.properties);
  }
  else {
    // Normal city center and radial time street

    //Check if we have a feature for this time
    var timeArray = this.features.filter(function(item){
      return item.properties.name === timeString
    });
    var timeRoad = timeArray[0];
    if (timeRoad && bestGuessFeature) {
      try {
        var intersection = turf.intersect(timeRoad,bestGuessFeature);
        if (intersection) {
          return intersection;
        }
      } catch (e) {
        // Fall through to the fake time street creation below
      }
    }

    //otherwise we need to create a 'fake' time street and

    clock = new Clock(this.centerPoint,this.cityBearing);
  }

  var imaginaryTimeStreet = clock.line(hour,minute,5,'miles');
  var radial = [imaginaryTimeStreet];

  var intersections = intersectingPoints(radial,[bestGuessFeature]);


  if (intersections.length === 0) {
    return undefined;
  } else {
    return intersections[0];
  }
};

Geocoder.prototype.fuzzyMatchFeatures = function(keys, value) {
  var results = [];
  //go through all features and pull out matching items for each name
  this.features.forEach(function(item){
    item.properties.match = Infinity
    keys.forEach(function(key){
      var geoName = item.properties[key];
      if (geoName) {
        geoName=geoName.toLowerCase();
        var largestNameLength = Math.max(geoName.length, value.length);
        var match = (new leven(geoName, value).distance) / largestNameLength;
        if (match < 0.4) {
          if (item.properties.hasOwnProperty(key) && item.properties.match < match) {
            return;
          }
          item.properties.match = match;
          results.push(item);
        }
      }
    });
  });

  results.sort(function(first, second) {
    return first.properties.match - second.properties.match;
  });

  return results;
}

function intersectingPoints(features1,features2) {
  features1Length = features1.length;
  features2Length = features2.length;

  var intersections = []

  //Compare all matching named features with eachother
  features1.map(function(item1){
    features2.map(function(item2){
      if (item1 && item2) {
        try {
          // Handle different geometry types for intersection
          var intersection = null;
          
          if (item1.geometry.type === 'LineString' && item2.geometry.type === 'LineString') {
            // Line to line intersection
            var lineIntersections = turf.lineIntersect(item1, item2);
            if (lineIntersections.features.length > 0) {
              intersection = lineIntersections.features[0]; // Take first intersection point
            }
          } else if (item1.geometry.type === 'LineString' && item2.geometry.type === 'MultiLineString') {
            // Line to MultiLineString intersection
            for (var i = 0; i < item2.geometry.coordinates.length; i++) {
              var line2 = turf.lineString(item2.geometry.coordinates[i]);
              var lineIntersections = turf.lineIntersect(item1, line2);
              if (lineIntersections.features.length > 0) {
                intersection = lineIntersections.features[0];
                break;
              }
            }
          } else if (item1.geometry.type === 'MultiLineString' && item2.geometry.type === 'LineString') {
            // MultiLineString to Line intersection
            for (var j = 0; j < item1.geometry.coordinates.length; j++) {
              var line1 = turf.lineString(item1.geometry.coordinates[j]);
              var lineIntersections = turf.lineIntersect(line1, item2);
              if (lineIntersections.features.length > 0) {
                intersection = lineIntersections.features[0];
                break;
              }
            }
          } else if (item1.geometry.type === 'MultiLineString' && item2.geometry.type === 'MultiLineString') {
            // MultiLineString to MultiLineString intersection
            for (var k = 0; k < item1.geometry.coordinates.length && !intersection; k++) {
              var line1 = turf.lineString(item1.geometry.coordinates[k]);
              for (var l = 0; l < item2.geometry.coordinates.length; l++) {
                var line2 = turf.lineString(item2.geometry.coordinates[l]);
                var lineIntersections = turf.lineIntersect(line1, line2);
                if (lineIntersections.features.length > 0) {
                  intersection = lineIntersections.features[0];
                  break;
                }
              }
            }
          } else {
            // Fallback to original polygon intersection for other geometry types
            intersection = turf.intersect(item1,item2);
          }
          
          if (intersection != null) {
            intersections.push(intersection);
          }
        } catch (e) {
          // Ignore invalid intersections
        }
      }
    });
  });
  return intersections;
}

Geocoder.prototype.geocode = function(locationString1,locationString2) {
  if (locationString1 in this.hardcodedLocations) {
    return this.hardcodedLocations[locationString1];
  } else {
    var coder = this;
    var result = Parser.parse(locationString1,locationString2);
    if(result && result.distance >= 0){

      return coder.timeDistanceToLatLon(result.time,utils.feetToMiles(result.distance),'miles');
    } else if (result) {
      return coder.streetIntersectionToLatLon(result.time,result.feature);
    }
  }
};

module.exports = Geocoder;
