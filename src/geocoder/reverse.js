var turf = require('@turf/turf');
var utils = require('../utils.js');

var reverseGeocoder = function(cityCenter,centerCampCenter,cityBearing,polygons,streets) {
  this.cityCenter = cityCenter;
  this.centerCampCenter = centerCampCenter;
  this.cityBearing = cityBearing;
  this.streets = streets.features;
  this.arcStreets = this.streets.filter(function(item){
    return item.properties.type !== 'radial';
  });
  this.centerPlaza = utils.filter(polygons.features,'ref','centerPlaza')[0];
  this.cafe = utils.filter(polygons.features,'ref','cafe')[0];
  this.innerPlaya = utils.filter(polygons.features,'ref','innerPlaya')[0];
  this.outerPlaya = utils.filter(polygons.features,'ref','outerPlaya')[0];
  this.streetsArea = utils.filter(polygons.features,'ref','streets')[0];
};

reverseGeocoder.prototype.geocode = function(lat, lon) {
  var point = turf.point([lon, lat]);

  if (turf.booleanPointInPolygon(point,this.centerPlaza)) {
    return this.centerPlaza.properties.name;
  } else if (turf.booleanPointInPolygon(point,this.cafe)){
    return this.cafe.properties.name;
  } else if (turf.booleanPointInPolygon(point,this.innerPlaya)) {
    return this.playaResult(point,this.innerPlaya);

  } else if (turf.booleanPointInPolygon(point,this.outerPlaya)) {
    return this.playaResult(point,this.outerPlaya);
  } else if (turf.booleanPointInPolygon(point,this.streetsArea)) {
    var result = streetResult(point,this.arcStreets);
    var time = this.timeForStreet(result.point,result.street);
    return time + ' & ' + result.street.properties.name;
  } else {
    return 'Outside Black Rock City';
  }
};

reverseGeocoder.prototype.timeForStreet = function(point,street) {
  var center = this.cityCenter;
  if (street.properties.ref === '66' || street.properties.ref === 'rod' || street.properties.ref === 'centerCampPlazaRoad') {
    center = this.centerCampCenter
  }

  var bearing = turf.bearing(center,point);
  var time = utils.degreesToTime(bearing,this.cityBearing);
  return time;
}

var streetResult = function(point,features) {
  var bestDistance = Number.MAX_VALUE;
  var winner = {};
  features.map(function(item){
    var result = {};
    result.street = item;
    if(item.geometry.type === 'MultiLineString') {
      var linesList = [];
      item.geometry.coordinates.map(function(coords){
        var line = turf.lineString(coords,item.properties);
        linesList.push(line);
      });
      result = streetResult(point,linesList);
    }

    if (!result.point) {
      result.point = turf.nearestPointOnLine(result.street,point)
    }

    if (result.point.properties.dist < bestDistance) {
      winner = result;
      bestDistance = winner.point.properties.dist;
    }

  });
  return winner;
};

reverseGeocoder.prototype.playaResult = function(point, polygon) {
  var bearing = turf.bearing(this.cityCenter,point);
  var time = utils.degreesToTime(bearing,this.cityBearing);
  var distance = turf.distance(point,this.cityCenter, 'miles');
  var feet = utils.milesToFeet(distance);

  return time +" & "+ Math.round(feet) +'\' ' + polygon.properties.name;
};

module.exports = reverseGeocoder;
