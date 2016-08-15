var turf  = require('turf');
var Time = require('./time.js');


var bearingInDegrees = function(hour,minute, noonBearing) {
  var clockDegrees = 0.5*(60*(parseInt(hour)%12)+parseInt(minute));
  var compassDegrees = (clockDegrees + noonBearing) % 360;
  //Need to convert to -180 to 180 where North is 0
  if (compassDegrees > 180) {
    compassDegrees = compassDegrees - 360;
  }
  return compassDegrees;
};

var filter = function(features,key,value) {
  return features.filter(function(item){
    return item.properties[key] === value;
  });
};

  // -180 to 180
var  timeToCompassDegrees = function(hour, minute, cityBearing) {
    var clockDegrees = .5*(60*(parseInt(hour)%12)+parseInt(minute))
    var compassDegrees = (clockDegrees + cityBearing) % 360;
    //Need to convert to -180 to 180 where North is 0
    if (compassDegrees > 180) {
      compassDegrees = compassDegrees - 360;
    }
    return compassDegrees
  }

var  timeStringToCompassDegress = function(string,cityBearing) {
    var array = splitTimeString(string);
    return timeToCompassDegrees(array[0],array[1],cityBearing);
  };

var splitTimeString = function(timeString) {
  return timeString.split(":");
}

var degreesToTime = function(degrees,cityBearing) {
  degrees = degrees - cityBearing;
  if (degrees < 0) {
    degrees = degrees + 360;
  }

  var hours = degrees*2/60;
  var minutes = Math.round(hours % 1 * 60)
  if (minutes === 60) {
    hours += 1
    minutes = 0
  };

  return Time.timeString(hours,minutes);
}

var feetToMiles = function(feet) {
    return feet * 0.000189394;
  }

var milesToFeet = function(miles) {
  return miles / 0.000189394
}

var streetDistanceLookup =  function(jsonFile){
    var distanceLookup = {};
    jsonFile.cStreets.map(function(item){
      distanceLookup[item.ref] = item.distance;
    });
    return distanceLookup;
  }
// Bearing [-180, 180] if first bearing is further along clockwise than second bearing
// returns true
function bearingCompare(firstBearing, secondBearing) {
  //convert to [0, 360]
  var firstBearing = (firstBearing % 360 + 360) % 360;

  var secondBearing = (secondBearing % 360 + 360) % 360;

  return secondBearing < firstBearing;
}

function cutStreets(street,polygon) {
  var reader = new jsts.io.GeoJSONReader();
  var a = reader.read(street);
  var b = reader.read(polygon);
  var diff = a.geometry.difference(b.geometry);
  var parser = new jsts.io.GeoJSONParser();
  diff = parser.write(diff);
  return diff;
}

function distanceFromCenter(lookup, value) {
  if (typeof value === 'string') {
    return lookup[value];
  } else if (typeof value === 'number') {
    return module.exports.feetToMiles(value);
  } else {
    return undefined;
  }
}

module.exports = {
  bearingInDegrees : bearingInDegrees,
  timeToCompassDegrees : timeToCompassDegrees,
  timeStringToCompassDegress : timeStringToCompassDegress,
  degreesToTime : degreesToTime,
  feetToMiles: feetToMiles,
  milesToFeet: milesToFeet,
  streetDistanceLookup: streetDistanceLookup,
  bearingCompare: bearingCompare,
  splitTimeString:splitTimeString,
  cutStreets: cutStreets,
  distanceFromCenter: distanceFromCenter,
  filter: filter
};
