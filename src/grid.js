var Clock = require('./clock.js');
var Time = require('./time.js');
var Utils = require('./utils.js');
var turf = require('turf');

/**
 * This is a grid for calculating points at Black Rock City using hour, minute, and distance.
 * First you need to calculate all the arc streets this will fill
 * 
 * THis should be stored as distance and degrees
 *
 * @param jsonFile
 * @param units
 * @constructor
 */
var Grid = function(center,bearing,arcStreets,units) {
  this.units = units;
  if (!this.units){
    this.units = 'miles';
  }

  if (!arcStreets) {
    arcStreets = [];
  }

  this.layout = {};
  this.layout.center = center;
  this.layout.bearing = bearing;
  this.layout.arcStreets = arcStreets;
  this.streetLookup = {}
  this.layout.arcStreets.forEach(function(item){
    this.streetLookup[item.ref] = parseFloat(Utils.feetToMiles(item.distance).toFixed(6));
  },this);

  this.clock = new Clock(this.layout.center,this.layout.bearing);
  this.gridDictionary = {};
};

/** time is string
 * distance is double*/
Grid.prototype.point = function(hour,minute, distance) {

  var location = this.fetch(hour,minute,distance);

  if (!location) {
    location = this.clock.point(hour,minute,distance,this.units);
    //Round to nearest 6 decimal place because accuracy beyond this is worthless
    location.geometry.coordinates = location.geometry.coordinates.map(function(x) {
      return parseFloat(x.toFixed(6));
    });
    this.save(hour,minute,distance,location.geometry.coordinates);
  }

  return location;
};

Grid.prototype.pointWithBearing = function(bearing,distance) {
  var location = this.fetchWithBearing(bearing,distance)
  if (!location) {

    location = turf.destination(this.layout.center, distance, bearing, 'miles');
    location.geometry.coordinates = location.geometry.coordinates.map(function(x) {
      return parseFloat(x.toFixed(6));
    });
    this.saveWithBearing(bearing,distance,value)
  }
  
  return location;
};


Grid.prototype.distances = function(bearing,start,end){
  //Convert to distance in miles
  if( typeof start === 'string' ) {
    start = this.streetLookup[start];
  }
  if( typeof end === 'string' ) {
    end = this.streetLookup[end];
  }

  start = parseFloat(start.toFixed(6))
  end = parseFloat(end.toFixed(6))

  var result = [];

  if(start === 0) {
    result.push(0);
  }


  for( var distance in this.gridDictionary[bearing]) {

    var floatDistance = parseFloat(distance);
    if (floatDistance <= end && floatDistance >= start) {
      result.push(floatDistance);
    }
  }

  return result.sort();
}

Grid.prototype.allPointsAlongBearing = function(bearing,startDistance,endDistance) {
  var distances = this.distances(bearing,startDistance,endDistance);
  distances.sort();
  var points = [];
  distances.forEach(function(dist) {
    if (dist === 0 ) {
      points.push(this.layout.center.geometry.coordinates);
    } else {
      points.push(this.gridDictionary[bearing][dist])
    }
  },this);

  return points;
}

Grid.prototype.allPointsAlongTime = function(hour,minute,startDistance,endDistance) {
  var bearing =  this.clock.bearing(hour,minute);
  return this.allPointsAlongBearing(bearing,startDistance,endDistance);
}

Grid.prototype.allPointsAlongDistance = function(distance,segment) {
  if (!segment) {
    segment = [0,359];
  }
  distance = parseFloat(distance.toFixed(6));
  segment = segment.map(function(angle) {
    if (typeof angle === 'number') {
      return angle;
    } else {
      var timeArray = Utils.splitTimeString(angle);
      return this.clock.bearing(timeArray[0], timeArray[1]);
    }
  },this);

  var startBearing = segment[0];
  var endBearing = segment[1];

  var bearingArray = Object.keys(this.gridDictionary);
  bearingArray = bearingArray.filter(function(item){
    var testAngle = parseFloat(item)
    if ((Utils.bearingCompare(testAngle,startBearing) || testAngle === startBearing ) && (Utils.bearingCompare(endBearing,testAngle) || testAngle === endBearing)) {
      return true;
    }
    return false
  });
  bearingArray.sort(function(a,b){
    if (a === b) {
      return 0
    }
    else if ( Utils.bearingCompare(a,b)) {
      return 1
    }
    return -1
  });
  var result = [];
  bearingArray.forEach(function(bearing){
    var distanceDict = this.gridDictionary[bearing];
    var point = distanceDict[distance];
    if(point) {
      result.push(point);
    }
  },this);
  return result;
};

Grid.prototype.fetchWithBearing = function(bearing,distance) {
  bearing = bearing.toString();
  distance = distance.toString();
  if (distance === 0) {
    return this.layout.center;
  }

  var distanceDict = this.gridDictionary[bearing];
  if(distanceDict) {
    var value = distanceDict[distance];
    return value;
  }
  return null;
};


Grid.prototype.fetch = function(hour,minute,distance) {
  if (distance === 0) {
    return this.layout.center;
  }

  hour = hour % 12;
  var bearing = this.clock.bearing(hour,minute);
  return this.fetchWithBearing(bearing,distance);
};

Grid.prototype.saveWithBearing = function(bearing,distance,value) {
  if (distance === 0){
    return;
  }

  distance = parseFloat(parseFloat(distance).toFixed(6))

  bearing = bearing.toString();
  distance = distance.toString();
  var distanceDict = this.gridDictionary[bearing];
  if (!distanceDict) {
    distanceDict = {};
  }

  if(value == null) {
    delete distanceDict[distance];
  } else {
    distanceDict[distance] = value;
  }

  this.gridDictionary[bearing] = distanceDict;
};

Grid.prototype.save = function(hour,minute,distance,value) {
  hour = hour % 12;
  var bearing = this.clock.bearing(hour,minute);
  this.saveWithBearing(bearing,distance,value);
};

Grid.prototype.forEach = function(cb) {
  for (var bearing in this.gridDictionary) {
    for (distance in this.gridDictionary[bearing]) {
      cb(bearing,distance,this.gridDictionary[bearing][distance]);
    }
  }
}

Grid.prototype.removePoints = function(polygon) {
  var remove = [];
  this.forEach(function(bearing,distance,point){
    if (!point.geometry) {
      var inside = turf.inside(turf.point(point), polygon)
      if (inside) {
        remove.push([bearing,distance]);
      }
    } else {
      console.log("uh oh")
    }

  });

  remove.forEach(function(item){
    this.saveWithBearing(item[0],item[1],null);
  },this);

}


module.exports = Grid;
