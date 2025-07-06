var turf = require('@turf/turf');
var utils = require('./utils.js');
var jsts = require("jsts");
var streets = require('./streets.js');
var points = require('./points.js');
var fence = require('./fence.js');
var Geo = require('./geo');

exports.innerPlaya = function(streetPlanner) {
  var rodPoly = exports.centerCampPolygon(streetPlanner);
  var distance = streetPlanner.streetLookup['esplanade']+utils.feetToMiles(5);

  var linestring = Geo.arc(streetPlanner.layoutFile.center,distance,'miles',0,360,streetPlanner.bearingFrequency);
  var innerPolygon = turf.polygon([linestring.geometry.coordinates]);

  var polygon;
  if (rodPoly)  {
    polygon = turf.difference(turf.featureCollection([innerPolygon,rodPoly]));
  } else {
    polygon = innerPolygon;
  }

  
  polygon.properties = {'ref':'innerPlaya','name':'Inner Playa'};

  return polygon;
}

exports.outerPlaya = function(streetPlanner) {
  var polygon = turf.polygon([fence.fence(streetPlanner.layoutFile).features[0].geometry.coordinates])
  polygon = turf.difference(turf.featureCollection([polygon,exports.streetsArea(streetPlanner)]));
  var centerCampPoly = exports.centerCampPolygon(streetPlanner)
  if (centerCampPoly) {
    polygon = turf.difference(turf.featureCollection([polygon,centerCampPoly]));
  }
 
  polygon = turf.difference(turf.featureCollection([polygon,exports.innerPlaya(streetPlanner)]));

  polygon.properties = {'ref':'outerPlaya','name':'Outer Playa'}

  return polygon;
}

exports.centerCampPolygon = function(streetPlanner) {
  var rodRoad = streetPlanner.centerCampStreetPlanner.getRodRoad()
  if(!rodRoad) {
    return null;
  }

  var rodPoly = turf.polygon([rodRoad.geometry.coordinates]);
  return rodPoly;
}

exports.streetsArea = function(streetPlanner) {

  var points = []

  var arcStreets = streetPlanner.getArcStreets();
  var esplanade = utils.filter(arcStreets.features,'ref','esplanade')[0];
  var lStreet = utils.filter(arcStreets.features,'ref','k')[0];

  turf.coordEach(lStreet,function(point){
    points.push(point);
  })

  points = points.reverse();

  turf.coordEach(esplanade,function(point){
    points.push(point);
  })

  points.push(points[0])

  var poly = turf.polygon([points]);
  var centerCamp = exports.centerCampPolygon(streetPlanner);
  if (centerCamp){
    poly = turf.union(turf.featureCollection([poly,centerCamp]));
  }
  
  poly.properties = {'ref':'streets'}
  return poly
}

exports.plazas = function(streetPlanner) {
  var features = []
  var cityBearing  = streetPlanner.layoutFile.bearing;
  var cityCenter = streetPlanner.layoutFile.center;

  streetPlanner.layoutFile.plazas.forEach(function(item){
    var point;
    if( item.distance === 0) {
      point = cityCenter;
    } else {
      var distance = utils.distanceFromCenter(streetPlanner.streetLookup,item.distance);
      var timeArray = utils.splitTimeString(item.time);
      var hour = timeArray[0];
      var minute = timeArray[1];
      var bearing = utils.timeToCompassDegrees(hour,minute,cityBearing);
      point = turf.destination(cityCenter,distance,bearing,{units: 'miles'});
    }

    var radius = utils.feetToMiles(item.diameter)/2.0;

    var linestring = Geo.arc(point,radius,'miles',0,360,5);
    var polygon = turf.polygon([linestring.geometry.coordinates]);
    polygon.properties = {
      "name":item.name
    }
    features.push(polygon);
  })
  return turf.featureCollection(features);
}

exports.portals = function(streetPlanner) {
  var cityCenter = streetPlanner.layoutFile.center;
  var cityBearing = streetPlanner.layoutFile.bearing;
  var portalsInfoList = streetPlanner.layoutFile.portals;

  var distanceLookup = streetPlanner.streetLookup;

  var cityStreets = streetPlanner.getAllCityStreets();
  var esplanade = utils.filter(cityStreets.features,"ref","esplanade")[0];

  // Use frontage arc or rods road
  var rodRoad = utils.filter(cityStreets.features,"ref","rod")[0];
  if(rodRoad == undefined) {
    rodRoad =  utils.filter(cityStreets.features,"ref","frontage_arc")[0];
    rodRoad = turf.lineToPolygon(rodRoad)
  } else {
    rodRoad = turf.polygon([rodRoad.geometry.coordinates]);
  }
  

  var features = [];
  portalsInfoList.forEach(function(item){
    var distance = utils.distanceFromCenter(distanceLookup,item.distance);
    var units = 'miles';
    var timeString = item.time;
    var timeArray = utils.splitTimeString(item.time);
    var hour = timeArray[0];
    var minute = timeArray[1];
    var timeBearing = utils.timeToCompassDegrees(hour,minute,cityBearing);
    var angle = item.angle;
    var properties = {
      "name":item.name,
      "ref":item.ref
    };

    var start = turf.destination(cityCenter,distance,timeBearing,{units: units});

    //flip bearing around
    portalBearing = 180 - Math.abs(timeBearing);
    if (timeBearing > 0) {
      portalBearing = portalBearing * -1;
    }

    firstBearing = portalBearing - angle/2;
    secondBearing = portalBearing + angle/2;

    var firstPoint = turf.destination(start,0.5,firstBearing,{units: 'miles'});
    var secondPoint = turf.destination(start,0.5,secondBearing,{units: 'miles'});

    var triangle = turf.polygon([[start.geometry.coordinates,firstPoint.geometry.coordinates,secondPoint.geometry.coordinates,start.geometry.coordinates]]);
    
    var result;
    if (timeString === "6:00") {
      result = turf.intersect(turf.featureCollection([triangle, rodRoad]));
    } else {
      //For all other take convex hull of esplanade (the open playa) and find difference with expanded triangle
      var fc = turf.featureCollection([triangle,turf.convex(esplanade)])
      result = turf.difference(fc)
    }
    result.properties = properties;
    features.push(result);

  });
  return turf.featureCollection(features);
};

exports.centerCampPolygons = function(streetPlanner) {
  var cityBearing  = streetPlanner.layoutFile.bearing;
  var centerCampCenter = streetPlanner.centerCampStreetPlanner.center;

  //Cafe
  var cafeRadius = utils.feetToMiles(streetPlanner.layoutFile.center_camp.cafe_radius);
  var arc = Geo.arc(centerCampCenter, cafeRadius, 'miles', 0, 360, 5)
  var cafe = turf.polygon([arc.geometry.coordinates]);
  cafe.properties = {
    "name":"Café",
    "ref":"cafe"
  }

  //Plaza
  var plazaRadius = utils.feetToMiles(streetPlanner.layoutFile.center_camp.cafe_plaza_radius);
  arc = Geo.arc(centerCampCenter, plazaRadius, 'miles', 0, 360, 5)
  var plaza =  turf.polygon([arc.geometry.coordinates]);
  plaza.properties = {
    'ref':'centerPlaza',
    'name':'Center Camp Plaza'
  };
  //Create hole for cafe
  plaza.geometry.coordinates.push(cafe.geometry.coordinates[0]);

  return turf.featureCollection([cafe,plaza]);
}

exports.allPolygons = function(streetPlanner) {
  var plazas = exports.plazas(streetPlanner);
  var portals = exports.portals(streetPlanner);
  var camp = exports.centerCampPolygons(streetPlanner);
  var allAreas = turf.featureCollection(plazas.features.concat(camp.features));

  var newPortals  = [];
  portals.features.forEach(function(portal){
    var newPortal = portal
    allAreas.features.forEach(function(other){
      newPortal = turf.difference(turf.featureCollection([newPortal,other]));
    })
    newPortals.push(newPortal);
  });

  allAreas.features = allAreas.features.concat(newPortals);

  return allAreas;
}

exports.streetsOutline = function(streetPlanner) {
  var s = streetPlanner.getAllCityStreets();
  var defaultWidth = streetPlanner.layoutFile.road_width;

  var outline;
  var reader = new jsts.io.GeoJSONReader();
  var parser = new jsts.io.GeoJSONWriter();

  s.features.forEach(function(item){
    var geo = reader.read(item).geometry;
    var width = defaultWidth;
    if (item.properties.width) {
      width = item.properties.width;
    }
    radius = width/ 2 / 364568.0;
    var buffer = geo.buffer(radius);

    buffer = parser.write(buffer);
    var newBuffer = {
      "type": "Feature",
      "properties": {}
    }
    newBuffer.geometry = buffer;
    if (outline) {
        outline = turf.union(turf.featureCollection([outline,newBuffer]));
    } else {
      outline = newBuffer;
    }

  });

  //Remove 2 smallest areas. The two tiny triangles at Rod's Road
  //and 5:30/6:30
  var inner = outline.geometry.coordinates.slice(1);
  inner.sort(function(a, b){
    var areaA = turf.area(turf.polygon([a]));
    var areaB = turf.area(turf.polygon([b]));

    if (areaA < areaB) {
      return -1
    }

    if (areaB < areaA) {
      return 1;
    }

    return 0;
  })

  outline.geometry.coordinates = [outline.geometry.coordinates[0]].concat(inner.slice(2));
  return outline;
}

exports.cityOutline = function(streetPlanner) {

  var outline = exports.streetsOutline(streetPlanner);

  var plazas = exports.plazas(streetPlanner);
  var portals = exports.portals(streetPlanner);
  var camp = exports.centerCampPolygons(streetPlanner);
  var cafe = utils.filter(camp.features,'ref','cafe')[0];
  var centerCampPlaza = utils.filter(camp.features,'ref','centerPlaza')[0];
  var centerCampPortal = utils.filter(portals.features,'ref','6portal')[0];
  var newPortal = turf.difference(turf.featureCollection([centerCampPortal,cafe]));
  //remove old portal and add new one back on
  var index = portals.features.indexOf(centerCampPortal);
  if (index > -1) {
    portals.features.splice(index, 1);
  }
  portals.features.push(newPortal);
  var allFeatures = plazas.features.concat(portals.features)
  allFeatures.push(centerCampPlaza);
  var allFeatureCollection = turf.featureCollection(allFeatures);

  allFeatureCollection.features.forEach(function(item){
    outline = turf.union(turf.featureCollection([outline,item]));
  })


  return turf.featureCollection([outline]);
}
