var turf = require('@turf/turf');
var utils = require('../utils.js');
var schema = require('./schema.js');
var leven = require('levenshtein');

/**
 * Forward geocoder over BMorg's official geometry.
 *
 * Handles the address grammar the BM API emits and burners type:
 *   "3:00 & Esplanade" / "Esplanade & 3:00"   street intersection
 *   "3:00 & 500'" / "10:30 1200'"             time + distance from the Man
 *   "4:30 & G Plaza @ 2:15"                   point on a plaza perimeter
 *   "Center Camp Plaza", "9:00 Portal"        named CPN / plaza landmark
 *
 * Street intersections sample the ring's real centerline radius at the
 * requested bearing rather than intersecting synthesized geometry, so a
 * result always lands on the official centerline.
 */
var OrgForwardGeocoder = function(dict) {
  this.dict = dict;

  // Rings answer to their themed name, their letter, and whatever the org
  // drop happened to call them ("Esplanade", "ESP", "E").
  this.ringByName = {};
  dict.rings.forEach(function(ring) {
    [ring.name, ring.letter, ring.orgName].forEach(function(alias) {
      if (alias) {
        this.ringByName[normalize(alias)] = ring;
      }
    }, this);
  }, this);

  this.landmarks = {};
  dict.plazas.forEach(function(plaza) {
    this.landmarks[normalize(schema.name(plaza.properties))] = plaza;
  }, this);
  Object.keys(dict.cpnByName).forEach(function(name) {
    var key = normalize(name);
    if (!(key in this.landmarks)) {
      this.landmarks[key] = dict.cpnByName[name];
    }
  }, this);
};

/** time string + distance -> point. units: 'miles' | 'feet' */
OrgForwardGeocoder.prototype.timeDistanceToLatLon = function(time, distance, units) {
  if (!time) {
    return undefined;
  }
  var miles = units === 'feet' ? utils.feetToMiles(distance) : distance;
  var compassDegrees = utils.timeStringToCompassDegress(time, this.dict.bearing);
  return turf.destination(this.dict.center, miles, compassDegrees, {units: 'miles'});
};

/** "3:00", "Esplanade" -> point on the Esplanade centerline at 3:00 */
OrgForwardGeocoder.prototype.streetIntersectionToLatLon = function(timeString, featureName) {
  if (!timeString || !featureName) {
    return undefined;
  }
  var ring = this.matchRing(featureName);
  if (!ring) {
    return undefined;
  }
  var compassDegrees = utils.timeStringToCompassDegress(timeString, this.dict.bearing);
  var radiusFt = ring.radiusFtAt((compassDegrees + 360) % 360);
  if (radiusFt === null) {
    // The ring doesn't reach this bearing (e.g. Esplanade at 6:00, where the
    // keyhole opens to Center Camp). Fall back to its mean radius so the
    // address still resolves to a sane place instead of failing outright.
    radiusFt = ring.meanRadiusFt;
  }
  return turf.destination(this.dict.center, utils.feetToMiles(radiusFt), compassDegrees, {units: 'miles'});
};

/** "4:30 & G Plaza", "2:15" -> point on that plaza's perimeter facing 2:15 */
OrgForwardGeocoder.prototype.plazaTimeToLatLon = function(plazaName, timeString) {
  var landmark = this.matchLandmark(plazaName);
  if (!landmark) {
    return undefined;
  }
  var center = landmark.geometry.type === 'Point' ? landmark : turf.centroid(landmark);
  var radiusMiles = landmark.geometry.type === 'Point'
    ? utils.feetToMiles(this.dict.config.default_plaza_radius_ft || 175)
    : polygonRadiusMiles(landmark);
  var compassDegrees = utils.timeStringToCompassDegress(timeString, this.dict.bearing);
  return turf.destination(center, radiusMiles, compassDegrees, {units: 'miles'});
};

OrgForwardGeocoder.prototype.geocode = function(locationString1, locationString2) {
  if (locationString1 === undefined || locationString1 === null) {
    return undefined;
  }
  var input = String(locationString1).trim();
  if (locationString2) {
    input = input + ' & ' + String(locationString2).trim();
  }
  if (!input) {
    return undefined;
  }

  // "<plaza> @ <time>" / "<plaza> & <time>" — plaza perimeter
  var plazaMatch = input.match(/^(.*plaza.*?)\s*[@&]\s*(\d{1,2}:\d{2})\s*$/i);
  if (plazaMatch) {
    var onPerimeter = this.plazaTimeToLatLon(plazaMatch[1], plazaMatch[2]);
    if (onPerimeter) {
      return onPerimeter;
    }
  }

  var parts = splitAddress(input);

  if (parts.time && parts.distanceFt !== null) {
    return this.timeDistanceToLatLon(parts.time, parts.distanceFt, 'feet');
  }

  if (parts.time && parts.feature) {
    // A named ring always wins: "3:00 Portal & A" is where the 3:00 radial
    // meets A, not the portal itself. Only an address with no ring in it
    // ("9:00 Portal") means the portal landmark.
    var ring = this.matchRing(stripStreetDecorations(parts.feature));
    if (ring) {
      return this.streetIntersectionToLatLon(parts.time, ring.name);
    }
    if (/portal/i.test(parts.feature)) {
      var portal = this.matchLandmark(parts.time + ' Portal');
      if (portal) {
        return portal.geometry.type === 'Point' ? portal : turf.centroid(portal);
      }
    }
  }

  // A bare landmark name ("Center Camp Plaza", "Playa Info", "1200 Promenade")
  var landmark = this.matchLandmark(input);
  if (landmark) {
    return landmark.geometry.type === 'Point' ? landmark : turf.centroid(landmark);
  }

  if (parts.time && parts.feature) {
    return this.streetIntersectionToLatLon(parts.time, parts.feature);
  }
  return undefined;
};

/** Drop words that decorate a street name without identifying it. */
function stripStreetDecorations(feature) {
  return String(feature)
    .replace(/\b(portal|street|st|road|rd|ave|avenue)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

OrgForwardGeocoder.prototype.matchRing = function(name) {
  var key = normalize(name);
  if (key in this.ringByName) {
    return this.ringByName[key];
  }
  // Tolerate typos and decorations ("esplande", "Ararat St")
  return bestFuzzyMatch(this.ringByName, key, 0.34);
};

OrgForwardGeocoder.prototype.matchLandmark = function(name) {
  var key = normalize(name);
  if (key in this.landmarks) {
    return this.landmarks[key];
  }
  return bestFuzzyMatch(this.landmarks, key, 0.25);
};

/**
 * Normalize a name for lookup: lowercase, drop "&"/punctuation, collapse
 * whitespace, and normalize clock tokens so BMorg's several spellings of the
 * same plaza all collide ("3:00 & G Plaza", "3 & G Plaza", "3:00 G Plaza").
 */
function normalize(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[.,']/g, '')
    // One pass over every number so clock positions collide regardless of how
    // they were written: "3:00", "300", "3" -> "3:00"; "430" -> "4:30".
    // Numbers that aren't clock positions ("1200 Promenade") are left alone.
    .replace(/\b(\d{1,4})(?::(\d{2}))?\b/g, function(match, digits, minutes) {
      if (minutes !== undefined) {
        return clockToken(parseInt(digits, 10), minutes, match);
      }
      if (digits.length >= 3) {
        return clockToken(parseInt(digits.slice(0, digits.length - 2), 10), digits.slice(-2), match);
      }
      return clockToken(parseInt(digits, 10), '00', match);
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function clockToken(hour, minutes, original) {
  if (hour >= 1 && hour <= 12 && parseInt(minutes, 10) < 60) {
    return hour + ':' + minutes;
  }
  return original;
}

function bestFuzzyMatch(table, key, threshold) {
  var bestScore = threshold;
  var best = null;
  Object.keys(table).forEach(function(candidate) {
    var longest = Math.max(candidate.length, key.length);
    if (!longest) {
      return;
    }
    var score = new leven(candidate, key).distance / longest;
    if (score < bestScore) {
      bestScore = score;
      best = table[candidate];
    }
  });
  return best;
}

/** Pull the time, distance and street/feature name out of an address string. */
function splitAddress(input) {
  var result = {time: null, distanceFt: null, feature: null};

  var timeMatch = input.match(/\b(\d{1,2}):([0-5]\d)\b/);
  if (timeMatch) {
    result.time = timeMatch[1] + ':' + timeMatch[2];
  }

  var distanceMatch = input.match(/(\d+)\s*'/);
  if (distanceMatch) {
    result.distanceFt = parseInt(distanceMatch[1], 10);
  }

  // Whatever remains after removing the time and distance tokens is the
  // street name.
  var remainder = input
    .replace(/\b\d{1,2}:[0-5]\d\b/g, ' ')
    .replace(/\d+\s*'/g, ' ')
    .replace(/[&@,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (remainder) {
    result.feature = remainder;
  }
  return result;
}

function polygonRadiusMiles(polygon) {
  var bbox = turf.bbox(polygon);
  var width = turf.distance([bbox[0], bbox[1]], [bbox[2], bbox[1]], {units: 'miles'});
  var height = turf.distance([bbox[0], bbox[1]], [bbox[0], bbox[3]], {units: 'miles'});
  return Math.max(width, height) / 2;
}

module.exports = OrgForwardGeocoder;
