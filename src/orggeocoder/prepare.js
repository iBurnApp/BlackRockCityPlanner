var turf = require('@turf/turf');
var utils = require('../utils.js');
var schema = require('./schema.js');
var leven = require('levenshtein');

// A ring is considered to have no coverage at a bearing if the nearest
// centerline vertex is angularly further away than this. Org centerline
// vertices are ~1-1.5 degrees apart, and real gaps (e.g. the Esplanade
// keyhole at 6:00) are 15+ degrees wide.
var SAMPLE_GAP_DEGREES = 5;

var DEFAULT_STREET_WIDTH_FT = 30;

/**
 * Build the geocoder's lookup structures from BMorg's official GeoJSON.
 *
 * orgData:
 *   streetLines - innovate-GIS-data street_lines.geojson (FeatureCollection)
 *   plazas      - plazas.geojson (FeatureCollection of named Polygons)
 *   cpns        - cpns.geojson (FeatureCollection of named Points)
 *   fence       - trash_fence.geojson (FeatureCollection with one Polygon)
 *   config      - the year's small handcrafted supplement:
 *       year                    e.g. 2026
 *       bearing                 city clock noon bearing, degrees true (45)
 *       street_names            letter -> themed name ({"ESP": "Esplanade", "A": "Ararat", ...}).
 *                               Needed when the org drop names rings by letter
 *                               (2026); when it already ships themed names
 *                               (2024/2025) this still registers the letters as
 *                               aliases, since the BM API emits addresses like
 *                               "D & 3:15".
 *       retired_streets         org street names to ignore (streets the org
 *                               dropped but left in the data, e.g. "Rods Road")
 *       center_cpn              CPN naming the city center (default "The Man")
 *       center                  optional [lon, lat] override for that center
 *       gap_landmark_cpn        CPN naming the interior grid gap (Center Camp)
 *       gap_landmark_radius_ft  how far that name reaches (default 1200)
 *       default_plaza_radius_ft perimeter radius for point landmarks (175)
 */
module.exports = function(orgData) {
  var config = orgData.config;
  if (!config) {
    throw new Error('org geocoder: config is required');
  }

  var center = resolveCenter(orgData, config);
  var streetNames = config.street_names || {};

  var letterForName = {};
  Object.keys(streetNames).forEach(function(letter) {
    letterForName[String(streetNames[letter]).toLowerCase()] = letter;
  });

  var retired = {};
  (config.retired_streets || []).forEach(function(streetName) {
    retired[String(streetName).toLowerCase()] = true;
  });

  var ringsByKey = {};
  var radialsByName = {};

  orgData.streetLines.features.forEach(function(feature) {
    var props = feature.properties || {};
    var orgName = schema.name(props);
    if (!orgName || retired[orgName.toLowerCase()]) {
      return;
    }

    var streetClass = schema.streetClass(props);
    if (streetClass === 'radial') {
      (radialsByName[orgName] = radialsByName[orgName] || []).push(feature);
      return;
    }
    if (streetClass !== 'annular') {
      return;
    }

    // The org names rings either by letter (2026) or by themed name
    // (2024/2025); accept both and keep each ring's letter and display name.
    var upper = orgName.toUpperCase();
    var letter = null;
    var displayName = orgName;
    if (upper in streetNames) {
      letter = upper;
      displayName = streetNames[upper];
    } else if (orgName.toLowerCase() in letterForName) {
      letter = letterForName[orgName.toLowerCase()];
      displayName = streetNames[letter];
    } else {
      // The org drop and the official announcement sometimes disagree on
      // spelling (2025 shipped "Jemison" for Jemisin). Bind to the config
      // entry if it's a near match, and prefer the config's spelling — it
      // comes from BMorg's own street-name announcement.
      var near = nearestStreetName(letterForName, orgName);
      if (near) {
        letter = near;
        displayName = streetNames[near];
      }
      // Otherwise it's a ring the config doesn't know about; keep it under
      // its own name rather than dropping it, so new org streets still work.
    }

    var key = letter || displayName.toLowerCase();
    var ring = ringsByKey[key];
    if (!ring) {
      ring = ringsByKey[key] = {
        letter: letter,
        name: displayName,
        orgName: orgName,
        widthFt: schema.streetWidthFt(props, DEFAULT_STREET_WIDTH_FT),
        samples: []
      };
    }
    feature.geometry.coordinates.forEach(function(coord) {
      var point = turf.point(coord);
      ring.samples.push({
        bearing: (turf.bearing(center, point) + 360) % 360,
        radiusFt: utils.milesToFeet(turf.distance(center, point, {units: 'miles'}))
      });
    });
  });

  var rings = Object.keys(ringsByKey).map(function(key) {
    var ring = ringsByKey[key];
    ring.samples.sort(function(a, b) { return a.bearing - b.bearing; });
    var sum = 0;
    ring.samples.forEach(function(sample) { sum += sample.radiusFt; });
    ring.meanRadiusFt = sum / ring.samples.length;
    ring.radiusFtAt = makeRadiusFtAt(ring.samples);
    return ring;
  });
  rings.sort(function(a, b) { return a.meanRadiusFt - b.meanRadiusFt; });

  if (!rings.length) {
    throw new Error('org geocoder: no annular streets found — check the GIS schema');
  }

  var plazas = orgData.plazas.features.filter(function(feature) {
    return !!schema.name(feature.properties);
  });

  var cpnByName = {};
  orgData.cpns.features.forEach(function(feature) {
    var cpnName = schema.name(feature.properties);
    if (cpnName) {
      cpnByName[cpnName.toLowerCase()] = turf.point(feature.geometry.coordinates, {name: cpnName});
    }
  });

  // Names the interior gap in the ring grid (the Center Camp keyhole, where
  // Esplanade opens up). Which CPN names that region is a city-design fact
  // rather than something the geometry states, so it comes from config; the
  // name itself is still an official CPN.
  var gapLandmark = null;
  if (config.gap_landmark_cpn) {
    gapLandmark = cpnByName[String(config.gap_landmark_cpn).toLowerCase()] || null;
    if (!gapLandmark) {
      throw new Error('org geocoder: gap_landmark_cpn "' + config.gap_landmark_cpn + '" not found in CPNs');
    }
  }

  return {
    center: center,
    bearing: config.bearing,
    rings: rings,
    radialsByName: radialsByName,
    plazas: plazas,
    cpnByName: cpnByName,
    gapLandmark: gapLandmark,
    fence: orgData.fence.features[0],
    config: config
  };
};

function resolveCenter(orgData, config) {
  if (config.center) {
    return turf.point(config.center);
  }
  var centerName = String(config.center_cpn || 'The Man').toLowerCase();
  var center = null;
  orgData.cpns.features.forEach(function(feature) {
    var cpnName = schema.name(feature.properties);
    if (cpnName && cpnName.toLowerCase() === centerName) {
      center = turf.point(feature.geometry.coordinates);
    }
  });
  if (!center) {
    throw new Error('org geocoder: center CPN "' + (config.center_cpn || 'The Man') + '" not found');
  }
  return center;
}

// Returns radiusFt of the ring centerline at the given bearing, or null if
// the ring has no coverage there (a real gap, or past the city's arc).
function makeRadiusFtAt(samples) {
  return function(bearingDeg) {
    var lo = 0;
    var hi = samples.length - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (samples[mid].bearing < bearingDeg) { lo = mid; } else { hi = mid; }
    }
    var best = samples[lo];
    if (angularDelta(samples[hi].bearing, bearingDeg) < angularDelta(best.bearing, bearingDeg)) {
      best = samples[hi];
    }
    // The samples wrap at 0/360, so also consider the ends of the list.
    [samples[0], samples[samples.length - 1]].forEach(function(candidate) {
      if (angularDelta(candidate.bearing, bearingDeg) < angularDelta(best.bearing, bearingDeg)) {
        best = candidate;
      }
    });
    if (angularDelta(best.bearing, bearingDeg) > SAMPLE_GAP_DEGREES) {
      return null;
    }
    return best.radiusFt;
  };
}

/** Letter whose configured street name is a near-spelling of orgName. */
function nearestStreetName(letterForName, orgName) {
  var target = orgName.toLowerCase();
  var bestScore = 0.34;
  var best = null;
  Object.keys(letterForName).forEach(function(configName) {
    var longest = Math.max(configName.length, target.length);
    var score = new leven(configName, target).distance / longest;
    if (score < bestScore) {
      bestScore = score;
      best = letterForName[configName];
    }
  });
  return best;
}

function angularDelta(a, b) {
  var delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}
