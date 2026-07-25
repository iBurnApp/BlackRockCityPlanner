var turf = require('@turf/turf');
var utils = require('../utils.js');
var schema = require('./schema.js');

/**
 * Reverse geocoder over BMorg's official geometry.
 *
 * Cascade: outside the trash fence -> "Outside Black Rock City";
 * inside a named plaza polygon -> the plaza's name;
 * within the street band (between the innermost and outermost ring
 * centerlines covering this bearing, padded by half a road width)
 * -> "<time> & <ring name>" for the nearest ring;
 * otherwise open playa -> "<time> & <feet>' Inner|Outer Playa",
 * split at the innermost covered ring (Esplanade where it exists,
 * so the 6:00 keyhole promenade reads as Inner Playa).
 */
var OrgReverseGeocoder = function(dict) {
  this.dict = dict;
};

OrgReverseGeocoder.prototype.geocode = function(lat, lon) {
  var dict = this.dict;
  var point = turf.point([lon, lat]);

  if (!turf.booleanPointInPolygon(point, dict.fence)) {
    return 'Outside Black Rock City';
  }

  for (var i = 0; i < dict.plazas.length; i++) {
    if (turf.booleanPointInPolygon(point, dict.plazas[i])) {
      return schema.name(dict.plazas[i].properties);
    }
  }

  var bearing = (turf.bearing(dict.center, point) + 360) % 360;
  var time = utils.degreesToTime(bearing, dict.bearing);
  var distFt = utils.milesToFeet(turf.distance(dict.center, point, {units: 'miles'}));

  var covered = [];
  dict.rings.forEach(function(ring) {
    var radiusFt = ring.radiusFtAt(bearing);
    if (radiusFt !== null) {
      covered.push({ring: ring, radiusFt: radiusFt, delta: Math.abs(distFt - radiusFt)});
    }
  });

  if (covered.length) {
    var inner = covered[0];
    var outer = covered[covered.length - 1];
    if (distFt >= inner.radiusFt - inner.ring.widthFt / 2 &&
        distFt <= outer.radiusFt + outer.ring.widthFt / 2) {
      var best = covered[0];
      covered.forEach(function(c) {
        if (c.delta < best.delta) { best = c; }
      });
      return time + ' & ' + best.ring.name;
    }
    if (distFt < inner.radiusFt) {
      // Inside the city's arc but short of its innermost covered ring. If the
      // innermost ring of the whole city is itself missing at this bearing,
      // we're in an interior gap in the grid — the Center Camp keyhole, where
      // Esplanade opens up — so name it after the nearest landmark rather
      // than calling it open playa.
      var gapName = this.gapLandmark(point, bearing, distFt);
      if (gapName) {
        return gapName;
      }
      return playaResult(time, distFt, 'Inner Playa');
    }
    return playaResult(time, distFt, 'Outer Playa');
  }

  // Open playa side of the city: no rings at this bearing.
  var innermost = this.dict.rings[0];
  var region = distFt < innermost.meanRadiusFt ? 'Inner Playa' : 'Outer Playa';
  return playaResult(time, distFt, region);
};

/**
 * Name an interior gap in the ring grid after the nearest CPN landmark.
 * Only applies where the city's innermost ring is absent at this bearing and
 * the point lies beyond that ring's normal radius — i.e. inside the keyhole,
 * not out on the open playa (which has no rings at all at its bearings).
 */
OrgReverseGeocoder.prototype.gapLandmark = function(point, bearing, distFt) {
  var dict = this.dict;
  if (!dict.gapLandmark) {
    return null;
  }
  var innermost = dict.rings[0];
  if (innermost.radiusFtAt(bearing) !== null || distFt <= innermost.meanRadiusFt) {
    return null;
  }
  var limitFt = dict.config.gap_landmark_radius_ft || 1200;
  var ft = utils.milesToFeet(turf.distance(dict.gapLandmark, point, {units: 'miles'}));
  return ft <= limitFt ? dict.gapLandmark.properties.name : null;
};

function playaResult(time, distFt, region) {
  return time + ' & ' + Math.round(distFt) + "' " + region;
}

module.exports = OrgReverseGeocoder;
