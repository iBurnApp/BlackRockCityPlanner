var turf = require('@turf/turf')
var polygons = require('../polygons.js');
var points = require('../points.js');
var streets = require('../streets.js');
var StreetPlanner = require('../streetplanner');


module.exports = function(layoutFile) {
  var streetPlanner = new StreetPlanner(layoutFile);

  var streetsArea = polygons.streetsArea(streetPlanner);

  var innerPlaya = polygons.innerPlaya(streetPlanner);

  var outerPlaya = polygons.outerPlaya(streetPlanner);

  var centerPolygons = polygons.centerCampPolygons(streetPlanner).features;

  var features = [streetsArea,innerPlaya,outerPlaya]
  features = features.concat(centerPolygons);

  var fc = turf.featureCollection(features);

  //Streets without time, airport, entrance
  var allStreets = streetPlanner.getAllCityStreets();
  var st = allStreets.features.filter(function(item){
    return !(item.properties.type === 'time' || item.properties.ref === 'airport' || item.properties.ref === 'entrance');
  });

  var centerCampCenter = streetPlanner.centerCampGrid.layout.center;

  return {
    "center":layoutFile.center,
    "centerCamp":centerCampCenter,
    "bearing":layoutFile.bearing,
    "reversePolygons":fc,
    "reverseStreets":turf.featureCollection(st),
    "forwardPolygons":polygons.allPolygons(streetPlanner),
    "forwardStreets":allStreets
  }
}
