var turf  = require('@turf/turf');
var Utils = require('./utils.js');


var decimalPercision = 6;

//Bearing [0, 360]
//negatives will be fixed up
//Always works clockwise
var arc = function(center, distance, units, startBearing, endBearing, bearingFrequency) {
    var points = arcPoints(center,distance,units,startBearing,endBearing,bearingFrequency)
    var onlyCoordinates = points.map(function (item) {
        return item.geometry.coordinates;
    })
    return turf.lineString(onlyCoordinates)
}

var arcPoints = function(center, distance, units, startBearing, endBearing, bearingFrequency) {
    var fullCircle = endBearing % 360 === startBearing % 360;
    var endsAtZero = endBearing % 360 === 0
    if (endsAtZero || fullCircle) {
        endBearing += -1 *bearingFrequency;
    }

    var points = [];

    var currentBearing = startBearing;
    while (Utils.bearingCompare(endBearing, currentBearing)) {
        var currentPoint = turf.destination(center,distance,currentBearing,units);
        currentPoint.properties['distance'] = distance;
        currentPoint.properties['bearing'] = currentBearing;
        currentPoint.properties['units'] = units;
        points.push(currentPoint);

        currentBearing += bearingFrequency;
        if (currentBearing > 180) {
            currentBearing += -360
        }
    }

    //One more for the end
    var currentPoint = turf.destination(center,distance,endBearing,units);
    currentPoint.properties['distance'] = distance;
    currentPoint.properties['bearing'] = endBearing;
    currentPoint.properties['units'] = units;
    points.push(currentPoint);
    if(endsAtZero || fullCircle) {
        var nextBearing = endBearing+bearingFrequency
        var currentPoint = turf.destination(center,distance,nextBearing,units);
        currentPoint.properties['distance'] = distance;
        currentPoint.properties['bearing'] = nextBearing;
        currentPoint.properties['units'] = units;
        points.push(currentPoint);
    }
    return points;
}


module.exports = {
    arcPoints:arcPoints,
    arc:arc
};