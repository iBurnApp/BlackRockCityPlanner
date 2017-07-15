var StreetPlanner = require('./streetplanner.js');
var LayoutParser = require('./layoutParser.js');
var ToiletParser = require('./toiletParser.js');
var polygons = require('./polygons.js');
var fence = require('./fence.js');
var dmz = require('./dmz.js');


module.exports.generate = function(type,layout) {
  switch (type) {
  case 'streets':
      var planner = new StreetPlanner(layout);
      return planner.getAllCityStreets();
    break;
  case 'polygons':
      var planner = new StreetPlanner(layout);
      return polygons.allPolygons(planner);
    break;
  case 'outline':
      var planner = new StreetPlanner(layout);
      return polygons.cityOutline(planner);
    break;
  case 'fence':
    return fence.fence(layout);
    break;
  case 'dmz':
    return dmz.area(layout);
    break;
  }
}

module.exports.generateToilets = function(cityLayout, toiletLayout) {

	var layoutParser = new LayoutParser(cityLayout);
	var toiletParser = new ToiletParser(toiletLayout);

	var output = toiletParser.polygons(layoutParser);
	var points = toiletParser.points(layoutParser);

	output.features = output.features.concat(points.features);
	return output;
}