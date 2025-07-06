var turf = require('@turf/turf');
var utils = require('./utils.js');


exports.fence = function(jsonFile) {
  var cityBearing  = jsonFile.bearing;
  var cityCenter = jsonFile.center;
  var fenceVertexDistance = utils.feetToMiles(jsonFile.fence_distance);

  var bearing = 0;
  var points = [];
  while(bearing < 365) {
    var vertex = turf.destination(cityCenter, fenceVertexDistance, bearing + cityBearing, {units: 'miles'})
    points.push(vertex);
    bearing += 360/5;
  }

  var collection = turf.featureCollection(points);
  var polygon = turf.convex(collection);
  var ls = turf.lineString(polygon.geometry.coordinates[0],{
    'ref':'fence',
    'name':"Fence"
  })
  return turf.featureCollection([ls]);
}
