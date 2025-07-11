var turf  = require('@turf/turf');
var Utils = require('./utils.js');

function timeCompare(firstHour,firstMinute, secondBearing) {
  //convert to [0, 360]
  firstBearing = (firstBearing % 360 + 360) % 360;

  secondBearing = (secondBearing % 360 + 360) % 360;


  return secondBearing < firstBearing;
}

/**
  On the playa locations are often described by the time they apear on a 12 hour clock.
  Every Plaza has it's own internal clock as well as a global clock based on the man.
  For plazas 12 o'clock is facing towards the man so center camp's clock has the same orientation but different center.
*/
var Clock = function(center, bearing) {
  this.noonBearing = bearing;
  this.center = center;
};

Clock.prototype.bearing = function(hour,minute) {
  return parseFloat(Utils.bearingInDegrees(hour,minute, this.noonBearing).toFixed(6));
};

/** This takes a time and distance and returns a point relative to the center and orientation of the clock*/
Clock.prototype.point = function(hour,minute,distance,units) {
  //Convert to compass degrees
  var compassDegrees = this.bearing(hour,minute);

  //calculate destination
  return this.pointFromDegrees(compassDegrees,distance,units);
};
Clock.prototype.pointFromDegrees = function(compassDegrees,distance,units) {

  //calculate destination
  var destination = turf.destination(this.center, distance, compassDegrees, {units: units});
  return destination;
};

Clock.prototype.line = function(hour,minute,distance,units) {
  var point = this.point(hour, minute, distance, units);
  return turf.lineString([this.center.geometry.coordinates,point.geometry.coordinates]);
};

Clock.arcDegrees = function(startBearing,endBearing,bearingFrequency) {
  var fullCircle = endBearing % 360 === startBearing % 360;
  var endsAtZero = endBearing % 360 === 0
  if (endsAtZero || fullCircle) {
    endBearing += -1 *bearingFrequency;
  }

  var points = [start];

  var currentBearing = startBearing;
  while (Utils.bearingCompare(endBearing, currentBearing)) {
    var currentPoint = turf.destination(center,distance,currentBearing,{units: units});
    points.push(currentPoint.geometry.coordinates);

    currentBearing += bearingFrequency;
    if (currentBearing > 180) {
      currentBearing += -360
    }
    points.push(currentBearing);
  }
  points.push(endBearing); 
  return points;
};

Clock.arcTimes = function(startHour,startMinute,endHour,endMinute, minFrequency) {

  /** First we need to check that the end time is after the start
   * If Not then we need to create two arcs recursively
   */
  var startDouble = startHour + startMinute/60.0;
  var endDouble  = endHour + endMinute/60.0;
  var result = [];
  if(endDouble < startDouble) {
    //Fixed: Maintain frequency across 12:00 border
    //Calculate what the next time should be after crossing midnight
    var nextMinute = startMinute + minFrequency;
    var nextHour = startHour + parseInt(nextMinute / 60.0);
    nextMinute = nextMinute % 60;
    
    // Get first part up to 12:00
    result = this.arcTimes(startHour,startMinute,12,0,minFrequency);
    result.pop(); // Remove 12:00 duplicate
    
    // Calculate the offset for the second part to maintain frequency
    var offsetMinute = nextMinute % minFrequency;
    
    // Get second part from proper offset to end
    var secondPart = this.arcTimes(0,offsetMinute,endHour,endMinute,minFrequency);
    result = result.concat(secondPart);
  } else {
    var currentHour = startHour;
    var currentMinute = startMinute;
    var currentDouble = startDouble;
    while(currentDouble < endDouble) {
      result.push([currentHour,currentMinute]);
      currentMinute += minFrequency;
      currentHour += parseInt(currentMinute / 60.0);
      currentMinute = currentMinute % 60;
      currentDouble = currentHour + currentMinute/60.0;
    }
    result.push([endHour,endMinute]);
  }

  return result;
};

module.exports = Clock;
